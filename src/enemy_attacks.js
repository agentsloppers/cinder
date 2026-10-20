// Attack execution for enemies: windup glow telegraph, lunge, hit windows, projectiles, slams, leaps, flame pillars, chains.
import {Enemy} from './enemy.js';
import {Terrain} from './terrain.js';
import {FX} from './fx.js';
import {Audio} from './audio.js';
import {G} from './state.js';
import {angDiff} from './player.js';
import {Projectiles} from './projectiles.js';
import {THREE} from './engine.js';

const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const _v=new THREE.Vector3();
const RED=[1,.08,.04],ORANGE=[1,.5,.15],SOFT=[.95,.6,.3];

Object.assign(Enemy.prototype,{
 startAttack(A){
  if(A.ra===undefined){ A.ra=A.a/A.spd; A.rb=A.b/A.spd; A.rend=A.end/A.spd }
  this.state='attack'; this.att=A; this.tt=0; this.hitFlag=false; this.hitT=0; this.fired=false; this.slamFired=false; this.waveFired=false; this.chainRolled=false; this.leapInit=false; this.swingSfx=false; this.lastAtk=A.id; this.guardUp=false;
  this.glowCol=A.unb?RED:A.heavy?ORANGE:SOFT; const sp=A.spd*(this.boss?(this.def.phases[this.phase].speedMul||1):1); this.play(A.clip,{once:true,restart:true,speed:sp,fade:0.1});
  if(A.unb||A.heavy){ if(this.dist<40)Audio.play('warn',{soft:!A.unb}); }
  if(A.unb&&this.dist<40){ FX.ring(this.x,this.y+0.1,this.z,A.reach*0.9,0xff2a1a,Math.max(0.3,A.ra),0.12) }
 },
 handPos(){ if(this.handR){ this.handR.getWorldPosition(_v); return _v } _v.set(this.x+Math.sin(this.facing)*0.8,this.y+this.h*0.6,this.z+Math.cos(this.facing)*0.8); return _v },
 // does the strike cone reach the player right now?
 coneHit(A,P,reach,arc){ const dx=P.x-this.x,dz=P.z-this.z,d=Math.hypot(dx,dz); if(d-P.r*0.6>reach)return false; if(arc>=350)return true; const a=Math.abs(angDiff(this.facing,Math.atan2(dx,dz))); if(a>arc*Math.PI/360)return false; if(P.y>this.y+this.h+0.6)return false; return true },
 strike(A,P,kind='melee'){
  if(!this.coneHit(A,P,A.reach*(this.def.scale>1.5?1:1),A.arc))return false;
  const res=P.hurt({dmg:A.dmg*this.dmgMul,poise:A.poise,x:this.x,z:this.z,kind:A.kind==='spin'?'spin':kind,src:this,heavy:!!A.heavy,unblockable:!!A.unb,breakGuard:!!A.breakGuard,att:A.id});
  if(res&&(res.hit||res.blocked||res.parried)){ return true } return false;
 },
 runAttack(dt,P,dist){
  const A=this.att; const t=this.tt; const bm=this.boss?(this.def.phases[this.phase].speedMul||1):1;
  // tracking during windup
  if(t<A.ra*A.track&&A.kind!=='slam')this.turnTo(this.toP,dt,A.turn||(this.boss?3.6:4.8)*(A.kind==='leap'?1.2:1));
  // glow telegraph
  let g; if(t<A.ra)g=Math.pow(Math.min(1,t/(A.ra*0.92)),1.4); else if(t<A.rb)g=1; else g=Math.max(0,1-(t-A.rb)*3.5);
  this.setGlow(g*(A.unb?1.1:A.heavy?0.95:0.6));
  if(A.unb&&t<A.ra&&Math.random()<0.5){ const h=this.handPos(); FX.emit(1,{x:h.x,y:h.y,z:h.z,speed:1.5,col:[1,.15,.05],size:0.25,life:0.3}) }
  if(!this.swingSfx&&t>=A.ra-0.06){ this.swingSfx=true; if(this.dist<35&&A.kind!=='shoot'&&A.kind!=='pillars')Audio.play('swing',{heavy:!!A.heavy}) }
  // lunge
  if(A.lunge&&A.kind!=='leap'){ const t0=A.ra*0.5,t1=A.rb; if(t>t0&&t<t1){ const s=A.lunge/(t1-t0)*(dist<A.lunge*0.7?0.35:1); this.vx=Math.sin(this.facing)*s;this.vz=Math.cos(this.facing)*s } else if(t>=t1){ this.vx*=0.85;this.vz*=0.85 } }
  switch(A.kind){
   case 'melee': case 'spin':
    if(t>=A.ra&&t<=A.rb+0.02){
     if(A.slam&&!this.slamFired){ this.slamFired=true; const sx=this.x+Math.sin(this.facing)*A.slam.ox,sz=this.z+Math.cos(this.facing)*A.slam.ox; const r=Projectiles.burst(sx,sz,A.slam.r,{dmg:A.dmg*0.9*this.dmgMul,poise:A.poise,src:this,heavy:true,unblockable:false,att:A.id},true,false); if(r&&r.hit)this.hitFlag=true; }
     if(A.kind==='spin'){ this.hitT-=dt; if(this.hitT<=0&&(!this.hitFlag||A.hitEvery<5)){ this.hitT=A.hitEvery; if(this.strike(A,P))this.hitFlag=A.hitEvery>5; } }
     else if(!this.hitFlag){ if(this.strike(A,P))this.hitFlag=true; }
    }
    break;
   case 'shoot': if(t<A.ra&&A.aim&&Math.random()<0.7){ const h=this.handPos(); const k=Math.random()*Math.min(18,dist); FX.emit(1,{x:h.x+Math.sin(this.facing)*k,y:h.y+(P.y+1.1-h.y)*(k/Math.max(1,dist)),z:h.z+Math.cos(this.facing)*k,speed:0,col:[1,.2,.1],size:0.1,life:0.15,alpha:.7}) }
    if(t>=A.ra&&!this.fired){ this.fired=true; this.fireProj(A,P); } break;
   case 'pillars': if(t<A.ra&&Math.random()<0.5){ const h=this.handPos(); FX.emit(1,{x:h.x,y:h.y+0.5,z:h.z,speed:1.2,up:2,col:this.def.glow||[1,.5,.15],size:0.2,life:0.5}) }
    if(t>=A.ra&&!this.fired){ this.fired=true; this.castPillars(A,P) } break;
   case 'slam': if(t>=A.ra&&!this.fired){ this.fired=true; Projectiles.burst(this.x,this.z,A.slam.r,{dmg:A.dmg*this.dmgMul,poise:A.poise,src:this,heavy:true,att:A.id},true,A.slam.ring); } break;
   case 'leap': this.doLeap(A,P,dt); break;
  }
  if(A.wave&&t>=A.ra&&!this.waveFired){ this.waveFired=true; const h=this.handPos(); Projectiles.fire({x:this.x+Math.sin(this.facing)*2,y:this.y+0.6,z:this.z+Math.cos(this.facing)*2,dir:this.facing,...A.wave,dmg:A.wave.dmg*this.dmgMul,owner:'enemy',from:this}); Audio.play('bolt') }
  // chain to the next attack in a combo
  if(A.chain&&!this.chainRolled&&t>=A.rb+(A.rend-A.rb)*0.3){ this.chainRolled=true; if(Math.random()<A.cp+(this.boss&&this.phase>0?0.1:0)&&dist<(A.reach||3)+2.2){ const nx=this.atkList.find(a=>a.id===A.chain); if(nx){ this.startAttack(nx); this.turnTo(this.toP,1,6); return } } }
  if(t>=A.rend)this.finishAttack();
 },
 finishAttack(){ const A=this.att; this.state='chase'; this.att=null; this.tt=0; this.setGlow(0); this.hover=0; const r=this.cdRange; this.cd=rnd(r[0],r[1]); this.guardUp=!!this.def.shield; if(this.hitFlag&&!this.boss)this.cd+=0.3; },
 fireProj(A,P){ const pr=A.proj; const h=this.handPos(); const n=pr.n||1; const lead=pr.kind==='arrow'?0.6:0.2; const dist=Math.hypot(P.x-h.x,P.z-h.z); const tt=dist/pr.speed*lead; const tx=P.x+(P.vx||0)*tt,tz=P.z+(P.vz||0)*tt,ty=P.y+1.1;
  const base=Math.atan2(tx-h.x,tz-h.z); for(let i=0;i<n;i++){ const dir=base+(i-(n-1)/2)*(pr.spread||0); Projectiles.fire({x:h.x,y:h.y,z:h.z,dir,tx:h.x+Math.sin(dir)*dist,tz:h.z+Math.cos(dir)*dist,ty,...pr,dmg:pr.dmg*this.dmgMul,owner:'enemy',from:this}) }
  Audio.play(pr.kind==='arrow'?'bolt':'cast'); FX.emit(8,{x:h.x,y:h.y,z:h.z,speed:2,col:pr.col,size:0.2,life:0.3}); },
 castPillars(A,P){ const pl=A.pillars; Audio.play('cast');
  for(let i=0;i<pl.n;i++){ let x,z; if(i===0&&pl.onPlayer){ x=P.x+(P.vx||0)*0.35;z=P.z+(P.vz||0)*0.35 } else { const ang=Math.random()*6.28,rr=Math.sqrt(Math.random())*pl.spread+(i===0?0:1.2); const cx=pl.onPlayer?P.x:this.x+Math.sin(this.facing)*5,cz=pl.onPlayer?P.z:this.z+Math.cos(this.facing)*5; x=cx+Math.cos(ang)*rr;z=cz+Math.sin(ang)*rr }
   const ar=this.def.arena; if(ar&&Math.hypot(x-ar.x,z-ar.z)>ar.r-1){ const dx=x-ar.x,dz=z-ar.z,dd=Math.hypot(dx,dz); x=ar.x+dx/dd*(ar.r-1);z=ar.z+dz/dd*(ar.r-1) }
   setTimeout(()=>{ if(this.alive)Projectiles.hazard({x,z,r:pl.r,delay:pl.delay,dmg:pl.dmg*this.dmgMul,col:this.def.glow||[1,.45,.1],linger:pl.linger||0}) },i*90); } },
 doLeap(A,P,dt){ const t=this.tt,t0=A.ra*0.45,t1=A.rb;
  if(t<t0){ this.lx=P.x;this.lz=P.z; this.turnTo(this.toP,dt,5); return }
  if(!this.leapInit){ this.leapInit=true; this.sx=this.x;this.sz=this.z; const d=Math.hypot(this.lx-this.x,this.lz-this.z); const back=Math.max(0,Math.min(1.5,d-2.0)); const dir=Math.atan2(this.lx-this.x,this.lz-this.z); this.tx=this.x+Math.sin(dir)*Math.max(0,d-(this.boss?1.2:1.0)); this.tz=this.z+Math.cos(dir)*Math.max(0,d-(this.boss?1.2:1.0)); this.facing=dir; this.H=Math.min(7,2+d*0.3); this.vx=this.vz=0; Audio.play('swing',{heavy:true}); }
  if(t<=t1){ const u=(t-t0)/(t1-t0); this.hover=Math.sin(u*Math.PI)*this.H; this.x=lerp(this.sx,this.tx,u); this.z=lerp(this.sz,this.tz,u); }
  else if(!this.fired){ this.fired=true; this.hover=0; const s=A.slam||{r:4,ox:0}; Projectiles.burst(this.x+Math.sin(this.facing)*(s.ox||0),this.z+Math.cos(this.facing)*(s.ox||0),s.r,{dmg:A.dmg*this.dmgMul,poise:A.poise,src:this,heavy:true,att:A.id},true,!!s.ring); } },
});
