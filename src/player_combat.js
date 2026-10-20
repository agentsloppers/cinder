// Player combat: attacks, hit detection, taking damage (block / parry / roll i-frames), flasks, death.
import {THREE} from './engine.js';
import {PlayerProto,angDiff} from './player.js';
import {Input} from './input.js';
import {Audio} from './audio.js';
import {FX,Floaters} from './fx.js';
import {G} from './state.js';
import {Colliders} from './colliders.js';
import {stBonus} from './data/stats.js';
import {clipinfo} from './assets.js';

const lerpAng=(a,b,t)=>a+angDiff(a,b)*Math.min(1,t);
const BASH={clip:'Melee_Block_Attack',spd:1.3,a:0.25,b:0.4,dmg:0.7,st:14,poise:80,reach:2.1,arc:100,lunge:0.5,chain:0.6,end:0.85,bash:true};

Object.assign(PlayerProto,{
 bashMove(){ const i=clipinfo.Melee_Block_Attack||{dur:1,hitA:0.3,hitB:0.5}; return {...BASH,a:i.hitA||0.25,b:i.hitB||0.42,end:Math.min(i.dur,(i.hitB||0.42)+0.35),chain:(i.hitB||0.42)+0.1} },
 startAttack(m,kind){
  if(this.st<=0&&kind!=='bash'){ return }
  if(m.fp){ if(this.fp<m.fp){ Audio.play('warn'); return } this.fp-=m.fp }
  this.state='attack'; this.stT=0; this.guarding=false; this.sprinting=false; this.atk={m,kind,hit:new Set(),swung:false,fired:false}; this.useSt(m.st*(this.weapon.stMul||1));
  if(kind==='light')this.combo++; this.comboT=1.1; if(kind!=='light')this.combo=0;
  const sp=m.spd*(this.weapon.spd||1); this.play(m.clip,{speed:sp,once:true,restart:true,fade:0.07});
  const mi=this.moveInput(this.camYaw||0);
  if(this.lock&&Math.hypot(this.lock.x-this.x,this.lock.z-this.z)<12)this.yaw=Math.atan2(this.lock.x-this.x,this.lock.z-this.z);
  else if(mi.m>0.2)this.yaw=Math.atan2(mi.x,mi.z);
  else { const t=this.nearestEnemy(3.2); if(t)this.yaw=Math.atan2(t.x-this.x,t.z-this.z) }
  this.atkSpeed=sp;
 },
 nearestEnemy(r){ let b=null,bd=r; for(const e of G.enemies){ if(!e.alive||e.hidden)continue; const d=Math.hypot(e.x-this.x,e.z-this.z); if(d<bd){bd=d;b=e} } return b },
 sAttack(dt,mi){
  const A=this.atk,m=A.m,a=this.activeAction; if(!a){this.state='free';return} const t=a.time/this.atkSpeed*this.atkSpeed; // clip-time
  // windup tracking
  if(t<m.a*0.8){ if(this.lock)this.yaw=lerpAng(this.yaw,Math.atan2(this.lock.x-this.x,this.lock.z-this.z),dt*9); else if(mi.m>0.3)this.yaw=lerpAng(this.yaw,Math.atan2(mi.x,mi.z),dt*5) }
  // lunge
  const lt=m.b; if(t<lt&&m.lunge){ const v=m.lunge/(lt/this.atkSpeed)*(1.4*(1-t/lt)+0.2); const dx=Math.sin(this.yaw),dz=Math.cos(this.yaw); this.vx=dx*v;this.vz=dz*v } else { this.vx*=Math.max(0,1-12*dt);this.vz*=Math.max(0,1-12*dt) }
  if(!A.swung&&t>=m.a-0.06){ A.swung=true; Audio.play('swing',{heavy:A.kind==='heavy'||m.dmg>1.6}); if(this.trail&&!m.cast)this.trail.on=true }
  if(t>m.b+0.12&&this.trail)this.trail.on=false;
  if(m.cast){ if(!A.fired&&t>=m.a){ A.fired=true; this.castBolt(m) } }
  else if(t>=m.a&&t<=m.b)this.strike(m);
  if(t>=m.chain){
   if(this.wantRoll>0&&this.st>0){this.wantRoll=0;return this.startRoll(mi)}
   if(Input.buffered('light',140)&&this.st>0){ Input.consume('light'); return this.startAttack(this.guardBash(m)||this.moves.light[this.combo%this.moves.light.length],'light') }
   if(Input.buffered('heavy',140)&&this.st>0){ Input.consume('heavy'); return this.startAttack(this.moves.heavy,'heavy') }
  }
  if(t>=m.end||a.time>=a.getClip().duration-0.02){ this.state='free'; this.atk=null; if(this.trail)this.trail.on=false }
 },
 guardBash(m){ return null },
 damageOf(m){ const w=this.weapon; const rf=this.refine[w.id]||0; let d=(w.atk*(1+0.09*rf)+stBonus(w,this.stats))*m.dmg; if(this.buff.t>0)d*=(this.buff.mul||1.3); return d*(0.94+Math.random()*0.12) },
 strike(m){
  const A=this.atk; const reachBonus=this.weapon.len>1.8?0.3:0; const px=this.x,pz=this.z;
  for(const e of G.enemies){ if(!e.alive||e.hidden||A.hit.has(e))continue; const dx=e.x-px,dz=e.z-pz,d=Math.hypot(dx,dz); const R=m.reach+reachBonus+e.r; if(d>R)continue;
   if(Math.abs((e.y||0)-this.y)>2.8+(e.h||0)*0.2)continue;
   const ang=Math.abs(angDiff(this.yaw,Math.atan2(dx,dz))); const half=(m.arc*Math.PI/360)+Math.atan2(e.r,Math.max(d,0.5)); if(ang>half&&d>e.r+0.3)continue;
   if(Colliders.blocked(px,pz,e.x,e.z,this.y+1))continue;
   A.hit.add(e); this.landHit(e,m,dx/d||0,dz/d||0);
  }
 },
 landHit(e,m,nx,nz){
  let dmg=this.damageOf(m),tag='';
  // positional bonuses
  if(e.stunned&&e.riposteable){ dmg*=3.2; tag='RIPOSTE' }
  else if(e.facing!==undefined&&Math.abs(angDiff(e.facing,Math.atan2(this.x-e.x,this.z-e.z)))>2.3&&this.atk.kind!=='heavy'){ dmg*=1.5; tag='BACKSTAB' }
  const res=e.hurt({dmg,poise:m.poise,x:this.x,z:this.z,heavy:this.atk.kind==='heavy'||m.dmg>1.7,src:this,kind:'melee',dx:nx,dz:nz,crit:!!tag});
  if(!res||!res.hit)return;
  const hy=(e.y||0)+(e.h||1.6)*0.6; const heavy=this.atk.kind==='heavy'||m.dmg>1.7;
  if(res.blocked){ Audio.play('clang'); FX.hitSpark(e.x-nx*e.r,hy,e.z-nz*e.r,{x:-nx,z:-nz},false); FX.hitstop(40); G.cam&&G.cam.shake(0.12); }
  else { Audio.play(e.flesh===false?'hit':'flesh',{heavy}); Audio.play('hit',{heavy}); FX.hitSpark(e.x-nx*e.r,hy,e.z-nz*e.r,{x:nx,z:nz},heavy); FX.hitstop(heavy||tag?95:55); G.cam&&G.cam.shake(heavy||tag?0.32:0.15);
   Floaters.add(e.x,hy+0.8,e.z,Math.round(res.dealt)+(tag?' '+tag:''),tag?'crit':heavy?'big':'');
   if(this.weapon.fx==='ember')FX.emit(6,{x:e.x,y:hy,z:e.z,speed:3,up:2,col:[1,.5,.15],size:0.14,life:0.7,grav:-2}); }
  if(this.weapon.lifesteal)this.hp=Math.min(this.maxHp,this.hp+res.dealt*this.weapon.lifesteal);
  if(res.killed){ G.emit('kill',e) }
 },
 castBolt(m){
  const dx=Math.sin(this.yaw),dz=Math.cos(this.yaw); let ty=this.y+1.2; let tx=dx,tz=dz;
  if(this.lock){ const l=Math.hypot(this.lock.x-this.x,this.lock.z-this.z)||1; tx=(this.lock.x-this.x)/l;tz=(this.lock.z-this.z)/l }
  G.spawnProjectile&&G.spawnProjectile({x:this.x+dx*0.8,y:ty,z:this.z+dz*0.8,vx:tx*26,vy:0,vz:tz*26,dmg:this.damageOf(m)*1.5,poise:m.poise||15,owner:'player',r:0.35,life:1.6,col:[.6,.5,1],magic:true,homing:this.lock});
  Audio.play('cast');
 },
 // ----- taking damage. info:{dmg,poise,x,z,heavy,src,kind,unblockable,fall}
 hurt(info){
  if(this.dead||G.mode==='cutscene')return {hit:false};
  if(this.invuln>0&&!info.fall&&!info.unavoidable){ return {hit:false,dodged:true} }
  let dmg=info.dmg*(G.difficulty||1); if(this.ward&&this.ward.t>0)dmg*=1-this.ward.cut; const dir=Math.atan2(info.x-this.x,info.z-this.z);
  const inFront=Math.abs(angDiff(this.yaw,dir))<1.05;
  if(this.guarding&&inFront&&!info.unblockable&&this.state==='free'){
   if(this.guardT<0.22&&info.kind==='melee'&&info.src&&info.src.onParried){ // PARRY
    Audio.play('parry'); FX.hitSpark(this.x+Math.sin(this.yaw)*0.9,this.y+1.3,this.z+Math.cos(this.yaw)*0.9,{x:0,z:0},true); FX.ring(this.x,this.y+1.2,this.z,2.2,0xbfe6ff,0.4); FX.hitstop(110); G.cam&&G.cam.shake(0.25);
    this.st=Math.min(this.maxSt,this.st+20); info.src.onParried(this); Floaters.add(this.x,this.y+2.4,this.z,'PARRY','crit'); return {hit:false,parried:true} }
   const absorb=this.hasShield?0.92:0.62; const cost=info.dmg*(this.hasShield?0.28:0.55)*(info.heavy?1.4:1); this.hp-=dmg*(1-absorb); this.st-=cost; this.stRegenDelay=1.0;
   Audio.play('block'); FX.hitSpark(this.x+Math.sin(this.yaw)*0.8,this.y+1.2,this.z+Math.cos(this.yaw)*0.8,{x:0,z:0},false); G.cam&&G.cam.shake(0.15); FX.hitstop(35);
   const kx=Math.sin(dir+Math.PI)*3.5,kz=Math.cos(dir+Math.PI)*3.5; this.vx+=kx;this.vz+=kz;
   if(this.st<=0){ this.st=0; this.guarding=false; this.guardBroken=true; this.enterHit(1.0,'Hit_B'); Audio.play('clang'); Floaters.add(this.x,this.y+2.4,this.z,'GUARD BROKEN','big') }
   else if(this.hp<=0)this.die();
   return {hit:true,blocked:true,dealt:dmg*(1-absorb)} }
  this.hp-=dmg; this.hurtFlash=0.25; this.regenPause=2; G.emit('playerHurt',{dmg,info});
  Audio.play('hurt'); FX.bloodDust(this.x,this.y+1.2,this.z); G.cam&&G.cam.shake(Math.min(0.6,0.15+dmg/200)); FX.hitstop(50);
  const thresh=(this.state==='attack'&&this.atk&&(this.atk.kind==='heavy'||this.weapon.cls==='greatsword'||this.weapon.cls==='hammer'))?42:(this.state==='attack'?24:16);
  if(info.poise>=thresh||this.state==='flask'||this.state==='free'&&info.poise>=14&&info.heavy){ this.enterHit(info.heavy?0.75:0.5,Math.random()<0.5?'Hit_A':'Hit_B'); const kx=Math.sin(dir+Math.PI),kz=Math.cos(dir+Math.PI); const f=info.heavy?7:4; this.vx=kx*f;this.vz=kz*f }
  info.src&&(this.killedBy=info.src);
  if(this.hp<=0){this.die()}
  return {hit:true,dealt:dmg};
 },
 enterHit(dur,clip){ this.state='hit'; this.stT=0; this.hitDur=dur; this.atk=null; this.guarding=false; this.sprinting=false; if(this.trail)this.trail.on=false;
  const c=(clipinfo[clip]||{dur:0.6}).dur; this.play(clip,{once:true,restart:true,speed:c/dur,fade:0.05}); },
 // ----- flask
 startFlask(){ this.state='flask'; this.stT=0; this.guarding=false; this.sprinting=false; this.drank=false; this.play('Use_Item',{once:true,restart:true,fade:0.1,speed:1.0}); Audio.play('flask'); },
 sFlask(dt,mi){
  const sp=1.3*Math.min(1,mi.m); this.vx+=(mi.x*sp-this.vx)*Math.min(1,10*dt); this.vz+=(mi.z*sp-this.vz)*Math.min(1,10*dt);
  if(mi.m>0.2)this.yaw=lerpAng(this.yaw,Math.atan2(mi.x,mi.z),dt*5);
  if(!this.drank&&this.stT>0.55){ this.drank=true; this.flasks--; this.healQ+=this.maxHp*0.5; FX.emit(18,{x:this.x,y:this.y+1,z:this.z,speed:1.5,up:2,col:[1,.75,.3],size:0.15,life:1,grav:-1}); G.emit('flask') }
  if(this.stT>1.05){ this.state='free' }
 },
 // ----- death / respawn
 die(){ if(this.dead)return; this.dead=true; this.hp=0; this.state='dead'; this.deaths++; this.lock=null; this.guarding=false; if(this.trail)this.trail.on=false;
  this.play('Death_A',{once:true,restart:true,fade:0.1}); Audio.play('death'); FX.slowmo(0.35,1.6); G.emit('playerDied',this) },
 respawn(x,z,yaw=0){
  this.dead=false; this.state='free'; this.hp=this.maxHp; this.st=this.maxSt; this.fp=this.maxFp; this.flasks=this.maxFlasks; this.x=x;this.z=z;this.vx=this.vz=0; this.y=0; this.invuln=1.5;
  this.yaw=yaw; this.healQ=0; this.atk=null; this.lock=null; this.play('Idle_A',{fade:0,restart:true}); this.syncPos();
 },
});
