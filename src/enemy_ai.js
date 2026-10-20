// Enemy brain: noticing, chasing, circling, choosing attacks, executing telegraphed attacks, bosses and phases. Mixed into Enemy.prototype.
import {Enemy} from './enemy.js';
import {Terrain} from './terrain.js';
import {Colliders} from './colliders.js';
import {FX} from './fx.js';
import {Audio} from './audio.js';
import {G} from './state.js';
import {angDiff} from './player.js';
import {Projectiles} from './projectiles.js';
import './enemy_attacks.js';

const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

Object.assign(Enemy.prototype,{
 turnTo(target,dt,rate){ const d=angDiff(this.facing,target); this.facing+=clamp(d,-rate*dt,rate*dt) },
 update(dt,P){
  if(this.hidden)return;
  const dx=P.x-this.x,dz=P.z-this.z,dist=Math.hypot(dx,dz); this.dist=dist; this.toP=Math.atan2(dx,dz);
  if(!this.alive){ this.mixer.update(dt); this.deadT+=dt; if(!this.boss){ if(this.deadT>5){ this.y-=dt*0.5; if(this.deadT>8)this.root.visible=false } } this.sync(); return }
  if(dist>130&&!this.aggroed){ this.root.visible=false; return } this.root.visible=true;
  if(dist>75&&!this.aggroed&&this.state!=='dormant'){ this.mixer.update(dt*0.4) } else this.mixer.update(dt);
  this.invuln-=dt; this.flash-=dt; this.t=(this.t||0)+dt; this.tt+=dt;
  if(this.state!=='stagger'&&this.state!=='attack'&&this.poise<this.maxPoise)this.poise=Math.min(this.maxPoise,this.poise+dt*(this.boss?14:9));
  if(P.dead&&this.aggroed&&this.alive&&this.state!=='return'&&this.state!=='idle'){ this.standDown() }
  this.moveX=0;this.moveZ=0;
  switch(this.state){
   case 'dormant': if(dist<6.5&&!P.dead)this.wake(); break;
   case 'rising': if(this.tt>2.2){ this.state='chase'; this.aggroed=true; this.cd=0.5; this.tt=0 } break;
   case 'idle': this.aiIdle(dt,P,dist); break;
   case 'return': this.aiReturn(dt,P,dist); break;
   case 'chase': this.aiCombat(dt,P,dist); break;
   case 'attack': this.runAttack(dt,P,dist); break;
   case 'stagger': this.aiStagger(dt,P,dist); break;
   case 'intro': this.aiIntro(dt,P,dist); break;
   case 'transition': this.aiTransition(dt,P,dist); break;
  }
  // locomotion velocity (attacks set velocity themselves)
  if(this.state!=='attack'){ const k=Math.min(1,dt*9); this.vx=lerp(this.vx,this.moveX,k); this.vz=lerp(this.vz,this.moveZ,k) }
  else { const k=Math.min(1,dt*5); if(!this.att||!this.att.lunge){ this.vx=lerp(this.vx,0,k); this.vz=lerp(this.vz,0,k) } }
  this.integrate(dt,P);
  if(this.flash>0||this.glow>0)this.setGlow(this.glow); else if(this._lastGlow)this.setGlow(0); this._lastGlow=this.glow>0.001||this.flash>0;
  if(this.boss&&this.engaged&&this.alive&&Math.random()<dt*14)FX.emit(1,{x:this.x,y:this.y+this.h*0.4,z:this.z,rad:this.r*1.6,radY:this.h*0.8,speed:0.3,up:1.2,col:this.def.glow||[1,.5,.2],size:0.16,life:1.2,alpha:.8});
  this.sync();
 },
 setGlow(k,col){ this.glow=k; const c=col||this.glowCol; const f=this.flash>0?0.55:0; for(const m of this.mats){ m.emissive.setRGB(c[0]*k*0.8+f,c[1]*k*0.8+f,c[2]*k*0.8+f) } },
 integrate(dt,P){
  let nx=this.x+this.vx*dt,nz=this.z+this.vz*dt;
  if(Terrain.slope(nx,nz)>1.25){ nx=this.x;nz=this.z; this.vx*=0.3;this.vz*=0.3; this.stuckT+=dt }else this.stuckT=Math.max(0,this.stuckT-dt);
  const p={x:nx,z:nz}; Colliders.resolve(p,this.r,this.y);
  for(const e of G.enemies){ if(e===this||!e.alive||e.hidden)continue; const ex=p.x-e.x,ez=p.z-e.z,md=this.r+e.r; if(Math.abs(ex)>md||Math.abs(ez)>md)continue; const d=Math.hypot(ex,ez); if(d<md&&d>1e-4){ const push=(md-d)*0.5; p.x+=ex/d*push;p.z+=ez/d*push } }
  if(P&&!P.dead){ const ex=p.x-P.x,ez=p.z-P.z,md=this.r+P.r*0.9,d=Math.hypot(ex,ez); if(d<md&&d>1e-4&&this.hover<0.5){ p.x=P.x+ex/d*md;p.z=P.z+ez/d*md } }
  const a=this.def.arena; if(a&&this.boss){ const ax=p.x-a.x,az=p.z-a.z,ad=Math.hypot(ax,az),lim=a.r-1.5; if(ad>lim){ p.x=a.x+ax/ad*lim;p.z=a.z+az/ad*lim } }
  this.x=p.x;this.z=p.z; this.y=Terrain.h(this.x,this.z);
 },
 // ---- helpers for locomotion
 moveToward(ang,speed){ this.moveX=Math.sin(ang)*speed; this.moveZ=Math.cos(ang)*speed },
 locoAnim(sp,mode){ const d=this.def,sk=/Skeleton/.test(d.model);
  if(sp<0.4){ this.play(d.shield&&this.guardUp?'Melee_Blocking':d.idle,{speed:1}); return }
  if(mode==='back'){ this.play('Walking_Backwards',{speed:clamp(sp/2,0.7,1.4)}); return }
  if(mode==='strafe'&&!sk){ this.play(this.strafeDir>0?'Running_Strafe_Right':'Running_Strafe_Left',{speed:clamp(sp/3.4,0.7,1.3)}); return }
  this.play(d.run,{speed:clamp(sp/(sk?3.0:4.2),0.7,1.5)}); },
 standDown(){ if(this.boss){ this.state='idle'; this.att=null; this.setGlow(0); this.play(this.def.idle); this.hover=0; return } this.state='return'; this.att=null; this.aggroed=false; this.setGlow(0); this.hover=0 },
 aiIdle(dt,P,dist){
  const d=this.def; this.play(d.idle);
  if(this.boss){ const a=d.arena; if(!G.flags[d.flag]&&!P.dead&&Math.hypot(P.x-a.x,P.z-a.z)<a.r-4&&!this.engaged){ this.engage() } return }
  if(P.dead)return; const fov=Math.abs(angDiff(this.facing,this.toP))<1.75; const near=dist<d.aggro*0.4||(dist<d.aggro&&fov);
  if(near&&(dist<7||!Colliders.blocked(this.x,this.z,P.x,P.z,this.y+1.2))){ this.noticeT+=dt; this.turnTo(this.toP,dt,5); if(this.noticeT>0.35){ this.aggro() ; this.cd=0.4 } } else this.noticeT=Math.max(0,this.noticeT-dt*2);
 },
 engage(){ this.engaged=true; this.aggroed=true; this.state='intro'; this.tt=0; G.boss=this; this.play(this.def.phases[0].intro||'Skeletons_Taunt_Longer',{once:true,restart:true}); Audio.play('roar'); G.emit('bossEngage',this); },
 aiIntro(dt,P){ this.turnTo(this.toP,dt,2.5); if(this.tt>3.1){ this.state='chase'; this.tt=0; this.cd=0.6; G.emit('bossFightStart',this) } },
 beginTransition(){ this.state='transition'; this.tt=0; this.att=null; this.stunned=false; this.riposteable=false; this.hover=0; this.poise=this.maxPoise; this.play(this.def.phases[this.phase+1].enter||'Skeletons_Taunt_Longer',{once:true,restart:true,fade:0.1}); Audio.play('roar'); this.burstedT=false; G.emit('bossPhase',this); },
 aiTransition(dt,P){ this.turnTo(this.toP,dt,2); this.setGlow(Math.min(1,this.tt*0.8),this.def.glow||[1,.5,.2]);
  if(this.tt>1.1&&!this.burstedT){ this.burstedT=true; FX.ring(this.x,this.y,this.z,9,0xffa050,0.8,0.5); FX.emit(60,{x:this.x,y:this.y+1,z:this.z,rad:2,speed:9,up:3,col:this.def.glow||[1,.5,.2],size:0.4,life:1.2,grav:-1}); G.cam&&G.cam.shake(0.6); Audio.play('boom'); for(const h of G.hazards){}
   const P0=G.player; if(P0&&!P0.dead&&Math.hypot(P0.x-this.x,P0.z-this.z)<7)P0.hurt({dmg:30*this.dmgMul,poise:90,x:this.x,z:this.z,kind:'aoe',unblockable:true,heavy:true}) }
  if(this.tt>3.0){ this.phase++; this.state='chase'; this.cd=0.4; this.tt=0; this.glowCol=this.def.glow||[1,.5,.2]; this.setGlow(0); } },
 aiStagger(dt,P){ this.setGlow(0); if(this.tt>=this.staggerDur){ this.stunned=false; this.riposteable=false; this.state='chase'; this.cd=this.stunnedRecover?0.2:rnd(0.2,0.6); this.tt=0 } else if(this.stunned&&this.tt>this.staggerDur-0.3&&this.tt>0.3){ /* pop out of stun */ } },
 aiReturn(dt,P,dist){ const hd=Math.hypot(this.homeX-this.x,this.homeZ-this.z); if(hd<1.2){ this.state=this.def.sleeper?'idle':'idle'; this.hp=this.maxHp; this.poise=this.maxPoise; this.play(this.def.idle); return }
  this.hp=Math.min(this.maxHp,this.hp+this.maxHp*dt*0.15); this.moveToward(Math.atan2(this.homeX-this.x,this.homeZ-this.z),this.def.speed); this.facing=Math.atan2(this.moveX,this.moveZ); this.locoAnim(this.def.speed);
  if(!P.dead&&dist<this.def.aggro*0.5){ this.aggro() } },
 // ---- combat movement
 meleeReach(){ let m=0; for(const a of this.atkList){ if(a.w>0&&a.kind!=='shoot'&&a.kind!=='pillars'&&a.kind!=='slam')m=Math.max(m,Math.min(a.range[1],a.kind==='leap'?a.range[0]:a.range[1])) } return m||3 },
 pickAttack(dist){ const list=this.atkList; let tot=0; const c=[]; for(const a of list){ if(!a.w)continue; if(dist<a.range[0]||dist>a.range[1])continue; const w=a.w*(a.id===this.lastAtk?0.3:1); c.push([a,w]); tot+=w }
  if(!c.length)return null; let r=Math.random()*tot; for(const [a,w] of c){ r-=w; if(r<=0)return a } return c[0][0] },
 tokenOk(a){ if(this.boss||a.kind==='shoot'||a.kind==='pillars')return true; let n=0; for(const e of G.enemies){ if(e!==this&&e.alive&&e.state==='attack'&&!e.boss&&e.att&&e.att.kind!=='shoot'&&e.att.kind!=='pillars')n++ } return n<2 },
 aiCombat(dt,P,dist){
  const d=this.def; if(P.dead){ this.standDown(); return }
  this.cd-=dt; this.guardUp=!!d.shield;
  const hd=Math.hypot(this.x-this.homeX,this.z-this.homeZ); if(!this.boss&&hd>d.leash){ this.standDown(); return }
  const sp=d.speed*(this.boss?(this.def.phases[this.phase].speedMul||1):1); const ahead=this.toP;
  this.strafeT-=dt; if(this.strafeT<=0){ this.strafeT=rnd(1.2,3); if(Math.random()<0.35)this.strafeDir*=-1 }
  const att=this.cd<=0?this.pickAttack(dist):null;
  if(att&&this.tokenOk(att)){ this.startAttack(att); return }
  let mode='approach',want;
  if(d.keep){ if(dist<d.keep[0])mode='back'; else if(dist>d.keep[1])mode='approach'; else mode='strafe' }
  else { const reach=this.meleeReach(); want=this.cd>0?Math.max(reach*0.8,this.boss?4.4:3.0):reach*0.85; if(!this.tokenOk({kind:'melee'})&&!this.boss)want=Math.max(want,5.5);
   if(dist>want+0.6)mode='approach'; else if(this.boss||d.strafe||this.cd>0.4)mode='strafe'; else mode='hold' }
  if(mode!=='approach'&&mode!=='back'||dist<2.2&&mode==='back'){ this.turnTo(ahead,dt,this.boss?5:8) } else if(mode==='back'){ this.turnTo(ahead,dt,8) } else { this.turnTo(ahead,dt,7) }
  if(mode==='approach'){ let ang=ahead; if(this.stuckT>0.4){ ang+=this.strafeDir*1.1 } const run=dist>9?1.25:1; this.moveToward(ang,sp*run); this.locoAnim(sp*run,'run') }
  else if(mode==='back'){ this.moveToward(ahead+Math.PI,sp*0.75); this.locoAnim(sp*0.75,'back') }
  else if(mode==='strafe'){ const k=this.boss?0.55:0.6; const tang=ahead+this.strafeDir*Math.PI/2; const rad=dist<(want||d.keep?.[0]||3)-0.5?-0.4:dist>(want||d.keep?.[1]||4)?0.4:0; const ax=Math.sin(tang)+Math.sin(ahead)*rad,az=Math.cos(tang)+Math.cos(ahead)*rad; const m=Math.hypot(ax,az)||1; this.moveX=ax/m*sp*k;this.moveZ=az/m*sp*k; this.locoAnim(sp*k,'strafe') }
  else { this.locoAnim(0) }
 },
});
