// Player per-frame update: state machine, locomotion, rolling, guard.
import {THREE} from './engine.js';
import {PlayerProto,angDiff} from './player.js';
import {Input} from './input.js';
import {Audio} from './audio.js';
import {FX} from './fx.js';
import {G} from './state.js';
import {clipinfo} from './assets.js';
const lerp=(a,b,t)=>a+(b-a)*t;
const lerpAng=(a,b,t)=>a+angDiff(a,b)*Math.min(1,t);
const ROLL_T=0.62,ROLL_D=4.3,BACK_T=0.5;

Object.assign(PlayerProto,{
 update(dt,camYaw){
  if(this.dead){ this.mixer.update(dt); this.physics(dt); this.syncPos(); return }
  this.updateLock(camYaw);
  this.invuln=Math.max(0,this.invuln-dt); this.hurtFlash=Math.max(0,this.hurtFlash-dt); this.spiritCd=Math.max(0,this.spiritCd-dt); this.stT+=dt;
  if(this.buff.t>0)this.buff.t-=dt; if(this.wantRoll>0)this.wantRoll-=dt;
  // roll/sprint button: tap = roll, hold = sprint
  if(Input.pressed.roll)this.rollHeld=0.0001; else if(this.rollHeld>0&&Input.held.roll)this.rollHeld+=dt;
  if(Input.released.roll&&this.rollHeld>0){ if(this.rollHeld<0.26)this.wantRoll=0.28; this.rollHeld=0 }
  if(!Input.held.roll){this.rollHeld=0}
  const mi=this.moveInput(camYaw);
  if(this.stRegenDelay>0)this.stRegenDelay-=dt; else if(this.state!=='roll'&&!this.sprinting){ this.st=Math.min(this.maxSt,this.st+(this.guarding?18:(this.state==='free'?38:26))*dt) }
  if(this.healQ>0){ const h=Math.min(this.healQ,dt*this.maxHp*0.7); this.healQ-=h; this.hp=Math.min(this.maxHp,this.hp+h) }
  this.camYaw=camYaw;
  switch(this.state){
   case 'free': this.sFree(dt,mi,camYaw); break;
   case 'attack': this.sAttack(dt,mi); break;
   case 'roll': this.sRoll(dt,mi); break;
   case 'hit': this.sHit(dt,mi); break;
   case 'flask': this.sFlask(dt,mi); break;
   case 'interact': this.sInteract(dt); break;
  }
  if(this.state!=='attack'&&this.trail)this.trail.on=false;
  this.physics(dt); this.mixer.update(dt); this.syncPos();
  if(this.hp<=0&&!this.dead)this.die();
 },
 faceToward(x,z,dt,rate=14){ this.yaw=lerpAng(this.yaw,Math.atan2(x,z),dt*rate) },
 sFree(dt,mi,camYaw){
  const w=this.weapon; const wantGuard=Input.held.guard&&this.st>0&&!(w.cls==='staff'&&false);
  if(wantGuard&&!this.guarding){this.guarding=true;this.guardT=0} if(!wantGuard)this.guarding=false; this.guardT+=dt;
  if(this.guarding&&Input.held.guard&&this.st<=0)this.guarding=false;
  this.sprinting=this.rollHeld>0.26&&mi.m>0.2&&this.st>0&&!this.guarding;
  if(this.wantRoll>0&&this.st>0){ this.wantRoll=0; return this.startRoll(mi) }
  if(this.comboT>0)this.comboT-=dt; else this.combo=0;
  // actions
  if(Input.buffered('flask',180)&&this.flasks>0&&this.hp<this.maxHp){ Input.consume('flask'); return this.startFlask() }
  if(Input.pressed.interact&&G.nearInteract){ Input.consume('interact'); return G.nearInteract.use(this) }
  if(Input.pressed.spirit){ G.emit('spirit',this) }
  if(this.st>0||true){
   if(Input.buffered('light',170)){ Input.consume('light'); if(this.sprinting&&this.st>8)return this.startAttack(this.moves.run,'run'); if(this.guarding&&this.hasShield)return this.startAttack(this.bashMove(),'bash'); return this.startAttack(this.moves.light[this.combo%this.moves.light.length],'light') }
   if(Input.buffered('heavy',170)){ Input.consume('heavy'); if(this.sprinting&&this.st>8)return this.startAttack(this.moves.run,'run'); return this.startAttack(this.moves.heavy,'heavy') }
  }
  // locomotion
  const locked=!!this.lock; let spd=0;
  if(mi.m>0.1){ spd=this.guarding?2.0:this.sprinting?7.3:(locked?4.0:4.7)*Math.min(1,0.4+mi.m*0.8); if(mi.m<0.5&&!this.guarding)spd=2.3 }
  if(this.sprinting){ this.st=Math.max(0,this.st-9*dt); this.stRegenDelay=0.4 }
  const tx=mi.x*spd,tz=mi.z*spd; const ac=mi.m>0.1?22:16; const k=Math.min(1,ac*dt); this.vx=lerp(this.vx,tx,k);this.vz=lerp(this.vz,tz,k);
  const hs=Math.hypot(this.vx,this.vz);
  if(locked){ this.faceToward(this.lock.x-this.x,this.lock.z-this.z,dt,this.sprinting?6:12); if(this.sprinting&&mi.m>0.1)this.faceToward(mi.x,mi.z,dt,8) }
  else if(mi.m>0.1)this.faceToward(this.vx,this.vz,dt,this.sprinting?10:13);
  this.locoAnim(hs,mi,locked,dt);
 },
 locoAnim(hs,mi,locked,dt){
  const st=this.moves.stance||'Idle_A';
  if(this.guarding){ this.play(hs>0.6?'Melee_Blocking':'Melee_Blocking',{fade:0.08}); return }
  if(hs<0.35){ this.play(st,{fade:0.2}); return }
  let clip,sp=1;
  if(locked&&!this.sprinting){ const fx=Math.sin(this.yaw),fz=Math.cos(this.yaw); const f=(this.vx*fx+this.vz*fz)/hs, s=(this.vx*-fz+this.vz*fx)/hs; // s>0 => moving to the player's left? computed below
   const rx=-Math.cos(this.yaw),rz=Math.sin(this.yaw); const r=(this.vx*rx+this.vz*rz)/hs;
   if(f>0.55)clip=hs>3.4?'Running_A':'Walking_A'; else if(f<-0.55)clip='Walking_Backwards'; else clip=r>0?'Running_Strafe_Right':'Running_Strafe_Left';
   sp=clip==='Walking_A'?hs/2.2:clip==='Walking_Backwards'?hs/2.0:hs/4.2; }
  else { if(hs>6)clip='Running_B',sp=hs/6.8; else if(hs>3.0)clip='Running_A',sp=hs/4.6; else clip='Walking_A',sp=hs/2.0 }
  this.play(clip,{fade:0.15,speed:Math.max(0.6,Math.min(1.6,sp))});
  this.stepT-=dt*hs; if(this.stepT<=0&&this.grounded){ this.stepT=hs>6?2.2:1.7; Audio.play('step',{f:400+Math.random()*250}); if(this.sprinting)FX.emit(2,{x:this.x,y:this.y+0.1,z:this.z,speed:0.8,col:[.5,.45,.35],size:0.3,life:0.5,alpha:.4}) }
 },
 startRoll(mi){
  const back=mi.m<0.15; this.state='roll'; this.stT=0; this.guarding=false; this.sprinting=false; this.rollBack=back;
  const useCost=back?10:16; this.useSt(useCost);
  let dx=mi.x,dz=mi.z; if(back){ dx=-Math.sin(this.yaw);dz=-Math.cos(this.yaw) } else this.yaw=Math.atan2(dx,dz);
  if(this.lock&&!back){} this.rollDir={x:dx,z:dz}; this.rollT=back?BACK_T:ROLL_T; this.atk=null;
  const clip=back?'Dodge_Backward':'Dodge_Forward'; const dur=(clipinfo[clip]||{dur:0.8}).dur; this.play(clip,{speed:dur/this.rollT,fade:0.05,once:true,restart:true});
  Audio.play('roll'); this.invuln=0; this.trail&&(this.trail.on=false); this.rollHit=false; this.rollAtkQueued=false;
 },
 sRoll(dt,mi){
  const T=this.rollT,t=this.stT,back=this.rollBack; const i0=0.03,i1=back?0.22:0.4;
  this.iframes=t>=i0&&t<=i1; if(this.iframes)this.invuln=Math.max(this.invuln,0.05);
  const D=back?2.8:ROLL_D; const k=Math.max(0,1-t/T); const v=2*D/T*k*(back?1:1);
  this.vx=this.rollDir.x*v;this.vz=this.rollDir.z*v;
  if(Math.random()<0.5&&!back)FX.emit(1,{x:this.x,y:this.y+0.1,z:this.z,speed:0.6,col:[.5,.45,.35],size:0.3,life:0.4,alpha:.35});
  if(t>=T*0.62){ // recovery: allow actions
   if(Input.buffered('light',150)&&this.st>0){Input.consume('light');this.iframes=false;return this.startAttack(this.moves.run,'run')}
   if(Input.buffered('heavy',150)&&this.st>0){Input.consume('heavy');this.iframes=false;return this.startAttack(this.moves.heavy,'heavy')}
   if(this.wantRoll>0&&this.st>0){this.wantRoll=0;return this.startRoll(mi)}
  }
  if(t>=T){ this.state='free';this.iframes=false;this.vx*=0.2;this.vz*=0.2 }
 },
 sHit(dt,mi){
  this.vx*=Math.max(0,1-9*dt);this.vz*=Math.max(0,1-9*dt);
  if(this.stT>this.hitDur*0.55&&this.wantRoll>0&&this.st>0&&!this.guardBroken){this.wantRoll=0;return this.startRoll(mi)}
  if(this.stT>=this.hitDur){ this.state='free';this.guardBroken=false }
 },
 sInteract(dt){ this.vx*=0.8;this.vz*=0.8; if(this.stT>=(this.interactDur||1.2)){this.state='free'} },
 startInteract(clip,dur){ this.state='interact';this.stT=0;this.interactDur=dur;this.play(clip,{once:true,restart:true,fade:0.15}) },
});
