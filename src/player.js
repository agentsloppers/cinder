// The player: character controller, animation state machine, stamina, rolling, guard, lock-on.
// Combat actions (attacks, damage in/out, flasks, spirits) live in player_combat.js and are mixed in.
import {THREE} from './engine.js';
import {Assets,stylize} from './assets.js';
import {buildKnight,retargetClip} from './knight_rig.js';
import {Terrain} from './terrain.js';
import {Colliders} from './colliders.js';
import {Input} from './input.js';
import {Audio} from './audio.js';
import {FX} from './fx.js';
import {G} from './state.js';
import {MOVESETS} from './data/movesets.js';
import {WEAPON_BY_ID} from './data/weapons.js';
import {START_STATS,maxHp,maxSt,maxFp} from './data/stats.js';

const lerp=(a,b,t)=>a+(b-a)*t;
export const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
const lerpAng=(a,b,t)=>a+angDiff(a,b)*Math.min(1,t);

const PlayerProto={
 reset0(){
  this.x=0;this.y=0;this.z=232;this.vx=0;this.vz=0;this.vy=0;this.yaw=Math.PI;this.r=0.45;this.grounded=true;
  this.stats={...START_STATS}; this.hp=maxHp(this.stats);this.st=maxSt(this.stats);this.fp=maxFp(this.stats);
  this.cinders=0; this.flasks=4; this.maxFlasks=4; this.state='free'; this.stT=0; this.guarding=false; this.guardT=0; this.sprinting=false;
  this.lock=null; this.stRegenDelay=0; this.invuln=0; this.rollHeld=0; this.weaponId='oathblade'; this.refine={}; this.owned={oathblade:1};
  this.spirit=null; this.spiritCd=0; this.combo=0; this.stepT=0; this.hurtFlash=0; this.dead=false; this.estus=0; this.poise=0;
  this.activeAction=null; this.curClip=''; this.root=new THREE.Group(); this.lastGround=0; this.fall=0;
  this.killedBy=null; this.deaths=0; this.healQ=0; this.buff={atk:0,t:0}; this.noClip=false;
 },
 get maxHp(){return maxHp(this.stats)}, get maxSt(){return maxSt(this.stats)}, get maxFp(){return maxFp(this.stats)},
 get weapon(){return WEAPON_BY_ID[this.weaponId]}, get moves(){return MOVESETS[this.weapon.cls]},
 async init(scene){
  const kr=await buildKnight(); this.model=kr.model; this.ratio=kr.ratio; this.model.scale.set(1.24,1.12,1.24); this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false}});
  this.root.add(this.model); scene.add(this.root); this.mixer=new THREE.AnimationMixer(this.model); this.actions={};
  this.model.traverse(o=>{ if((o.name==='handslot.r'||o.name==='handslotr'))this.handR=o; if((o.name==='handslot.l'||o.name==='handslotl'))this.handL=o; });
  await this.equip(this.weaponId); this.play('Idle_A',{fade:0}); this.syncPos();
 },
 clip(name){ let a=this.actions[name]; if(!a){ const c0=Assets.clips[name]; if(!c0){console.warn('missing clip',name);return null} const c=retargetClip(c0,this.ratio); a=this.actions[name]=this.mixer.clipAction(c); } return a },
 // play a clip with crossfade; opts: fade, speed, once, from (start time)
 play(name,o={}){ const a=this.clip(name); if(!a)return null; const fade=o.fade??0.14;
  if(this.activeAction===a&&!o.restart){ a.timeScale=o.speed||1; return a }
  a.reset(); a.enabled=true; a.setEffectiveWeight(1); a.timeScale=o.speed||1; if(o.once){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}else{a.setLoop(THREE.LoopRepeat,Infinity);a.clampWhenFinished=false}
  if(o.from)a.time=o.from; a.play(); if(this.activeAction&&this.activeAction!==a){ this.activeAction.fadeOut(fade); a.fadeIn(fade) } else a.fadeIn(fade); this.activeAction=a; this.curClip=name; return a },
 async equip(id){
  const w=WEAPON_BY_ID[id]; if(!w)return; this.weaponId=id;
  for(const o of [this.wR,this.wL]){ if(o&&o.parent)o.parent.remove(o) } this.wR=this.wL=null;
  const mk=async path=>{ const g=await Assets.load(path+'.gltf'); const m=g.scene.clone(true); stylize(m,{rough:0.5}); return m };
  const wm=await mk(w.model); const holder=new THREE.Group(); holder.add(wm); holder.scale.setScalar((w.scale||1)*0.8); this.handR.add(holder); this.wR=holder;
  if(w.cls==='fist'){ holder.visible=true }
  if(w.off==='dual'&&w.cls!=='fist'){ const m2=await mk(w.model); const h2=new THREE.Group();h2.add(m2);this.handL.add(h2);this.wL=h2 }
  else if(w.off==='dual'){ const m2=await mk(w.model); const h2=new THREE.Group();h2.add(m2);this.handL.add(h2);this.wL=h2 }
  else if(w.off){ const m2=await mk(w.off); const h2=new THREE.Group();h2.add(m2);this.handL.add(h2);this.wL=h2; this.hasShield=true }
  this.hasShield=!!w.off&&w.off!=='dual';
  this.wR.userData.len=w.len;
  if(this.trail){ FX.trails.splice(FX.trails.indexOf(this.trail),1);FX.scene.remove(this.trail.mesh);this.trail=null }
  this.trail=FX.makeTrail(this.wR,new THREE.Vector3(0,w.len*0.45,0),new THREE.Vector3(0,w.len,0),w.fx==='ember'?0xffa860:w.fx==='void'?0xb890ff:0xd8e4ff);
  G.emit('equip',w);
 },
 // ---- helpers
 get dir(){ return {x:Math.sin(this.yaw),z:Math.cos(this.yaw)} },
 moveInput(camYaw){ const ra=Input.axisX,fa=-Input.axisY; const m=Math.hypot(ra,fa);
  return {x:Math.sin(camYaw)*fa-Math.cos(camYaw)*ra,z:Math.cos(camYaw)*fa+Math.sin(camYaw)*ra,m:Math.min(1,m)} },
 useSt(n){ this.st=Math.max(0,this.st-n); this.stRegenDelay=0.75 },
 syncPos(){ this.root.position.set(this.x,this.y,this.z); this.root.rotation.y=this.yaw },
 // physics: move by velocity, collide, snap to terrain
 physics(dt){
  if(this.noClip){ this.x+=this.vx*dt;this.z+=this.vz*dt }
  else{
   let nx=this.x+this.vx*dt,nz=this.z+this.vz*dt;
   const slope=Terrain.slope(nx,nz); const h1=Terrain.h(nx,nz);
   if(slope>1.05&&h1>this.y+0.05&&this.grounded){ // too steep: slide along
    const sx=Terrain.h(this.x+0.5,this.z)-Terrain.h(this.x-0.5,this.z),sz=Terrain.h(this.x,this.z+0.5)-Terrain.h(this.x,this.z-0.5); const n=Math.hypot(sx,sz)||1; const dot=(this.vx*sx+this.vz*sz)/n; nx=this.x+(this.vx-sx/n*Math.max(0,dot))*dt; nz=this.z+(this.vz-sz/n*Math.max(0,dot))*dt }
   const p={x:nx,z:nz}; Colliders.resolve(p,this.r,this.y); this.x=p.x;this.z=p.z;
  }
  const gh=Terrain.h(this.x,this.z); this.lastGround=gh;
  if(this.y>gh+0.08||this.vy>0){ this.vy-=26*dt; this.y+=this.vy*dt; this.grounded=false; if(this.y<=gh){ this.y=gh; if(this.vy<-14)this.landed(-this.vy); this.vy=0;this.grounded=true } }
  else { this.y=lerp(this.y,gh,Math.min(1,dt*18)); if(Math.abs(this.y-gh)<0.02)this.y=gh; this.grounded=true; this.vy=0 }
 },
 landed(v){ if(v>20){ this.hurt({dmg:Math.round((v-20)*14),poise:99,fall:true,x:this.x,z:this.z,unblockable:true}) } FX.emit(8,{x:this.x,y:this.y+0.1,z:this.z,speed:2,col:[.6,.55,.45],size:0.4,life:0.6,alpha:.5}) },
 // ---- lock-on
 findTarget(camYaw,exclude=null){
  let best=null,bs=1e9; const fx=Math.sin(camYaw),fz=Math.cos(camYaw);
  for(const e of G.enemies){ if(!e.alive||e===exclude||e.hidden)continue; const dx=e.x-this.x,dz=e.z-this.z,d=Math.hypot(dx,dz); if(d>30)continue; const dot=(dx*fx+dz*fz)/d; if(dot<0.25)continue;
   if(Colliders.blocked(this.x,this.z,e.x,e.z,this.y+1))continue; const s=(1-dot)*25+d; if(s<bs){bs=s;best=e} }
  return best },
 cycleTarget(camYaw,dirSign){ if(!this.lock)return; let best=null,bs=1e9; const cur=Math.atan2(this.lock.x-this.x,this.lock.z-this.z);
  for(const e of G.enemies){ if(!e.alive||e===this.lock||e.hidden)continue; const d=Math.hypot(e.x-this.x,e.z-this.z); if(d>28)continue; const a=angDiff(cur,Math.atan2(e.x-this.x,e.z-this.z))*dirSign; if(a<=0.05)continue; if(a<bs){bs=a;best=e} }
  if(best){this.lock=best;Audio.play('ui')} },
 updateLock(camYaw){
  if(Input.pressed.lock){ if(this.lock){this.lock=null}else{ this.lock=G.boss&&G.boss.engaged&&G.boss.alive?G.boss:this.findTarget(camYaw); if(this.lock)Audio.play('ui') } }
  if(Input.pressed.lockR)this.cycleTarget(camYaw,1); if(Input.pressed.switchR)this.cycleTarget(camYaw,1); if(Input.pressed.switchL)this.cycleTarget(camYaw,-1);
  if(this.lock&&(!this.lock.alive||Math.hypot(this.lock.x-this.x,this.lock.z-this.z)>38||this.dead)){ const old=this.lock; this.lock=null; if(!this.dead){ const n=this.findTarget(camYaw,old); if(n&&Math.hypot(n.x-this.x,n.z-this.z)<14)this.lock=n } }
 },
};
export function createPlayer(){ const p=Object.create(PlayerProto); p.reset0(); return p }
export {PlayerProto};
