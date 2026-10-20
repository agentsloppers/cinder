// Enemy core: model, animation, health/poise, damage intake, death and respawn. AI lives in enemy_ai.js (mixed into the prototype).
import {THREE} from './engine.js';
import {Assets,stylize} from './assets.js';
import {Terrain} from './terrain.js';
import {FX,Floaters} from './fx.js';
import {Audio} from './audio.js';
import {G} from './state.js';
import {ENEMY_TYPES,BOSS_TYPES} from './data/enemies.js';
import {angDiff} from './player.js';

const lerp=(a,b,t)=>a+(b-a)*t;

export class Enemy{
 constructor(type,x,z,o={}){
  this.type=type; this.boss=!!BOSS_TYPES[type]; this.def=BOSS_TYPES[type]||ENEMY_TYPES[type]; if(!this.def)throw new Error('unknown enemy '+type);
  const d=this.def; this.name=d.name; this.homeX=x;this.homeZ=z; this.x=x;this.z=z;this.y=Terrain.h(x,z); this.vx=0;this.vz=0; this.facing=o.facing??Math.random()*6.28;
  this.r=d.r;this.h=d.h;this.big=!!d.big||d.scale>1.3; this.maxHp=Math.round(d.hp*(o.hpMul||1)); this.hp=this.maxHp; this.maxPoise=d.poise; this.poise=d.poise;
  this.dmgMul=(d.dm||1)*(o.dmgMul||1); this.alive=true; this.hidden=false; this.state=d.sleeper?'dormant':'idle'; this.tt=0; this.cd=0.5+Math.random(); this.att=null;
  this.stunned=false;this.riposteable=false; this.stunT=0; this.glow=0; this.glowCol=[1,.5,.2]; this.hover=0; this.deadT=0; this.invuln=0; this.engaged=false;
  this.strafeDir=Math.random()<0.5?1:-1; this.strafeT=0; this.phase=0; this.lastAtk=''; this.flash=0; this.animSpd=1; this.stuckT=0; this.guardUp=false; this.aggroed=false;
  this.root=new THREE.Group(); this.mats=[]; this.id=o.id||(type+'_'+Math.round(x)+'_'+Math.round(z)); this.areaId=o.area||''; this.hitFlag=false; this.hitT=0; this.noticeT=0;
 }
 get atkList(){ return this.boss?this.def.phases[this.phase].atk:this.def.atk }
 get cdRange(){ return this.boss?this.def.phases[this.phase].cd:this.def.cd }
 async init(scene){
  const d=this.def; const g=await Assets.load(d.model+'.glb'); this.model=Assets.cloneChar(g); this.model.scale.setScalar(d.scale||1); stylize(this.model,{rough:0.85});
  this.model.traverse(o=>{ if(o.isMesh){ const ms=Array.isArray(o.material)?o.material:[o.material]; const nm=ms.map(m=>{ const c=m.clone(); if(d.tint){ c.color=new THREE.Color(d.tint[0],d.tint[1],d.tint[2]) } c.emissive=new THREE.Color(0,0,0); this.mats.push(c); return c }); o.material=Array.isArray(o.material)?nm:nm[0]; o.frustumCulled=false }
   if((o.name==='handslot.r'||o.name==='handslotr'))this.handR=o; if((o.name==='handslot.l'||o.name==='handslotl'))this.handL=o; });
  this.root.add(this.model);
  const mk=async path=>{ const gg=await Assets.load(path+'.gltf'); const m=gg.scene.clone(true); stylize(m,{rough:0.6}); m.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.emissive=new THREE.Color(0,0,0); this.mats.push(o.material) } }); const h=new THREE.Group(); h.add(m); return h };
  if(d.wpn&&this.handR){ this.wR=await mk(d.wpn); if(d.wscale)this.wR.scale.setScalar(d.wscale); this.handR.add(this.wR) }
  if(d.off&&this.handL){ this.wL=await mk(d.off); this.handL.add(this.wL) }
  this.mixer=new THREE.AnimationMixer(this.model); this.actions={};
  this.root.userData.enemy=this; scene.add(this.root);
  // shadow-blob / elite aura
  if(this.boss||d.elite){ this.aura=new THREE.PointLight(new THREE.Color(...(d.glow||[1,.5,.2])),this.boss?3:1.2,this.boss?18:9,2); this.aura.position.set(0,this.h*0.6,0); this.root.add(this.aura) }
  this.setPose(); this.sync(); G.enemies.push(this); return this;
 }
 clip(name){ let a=this.actions[name]; if(!a){ const c=Assets.clips[name]; if(!c){ return null } a=this.actions[name]=this.mixer.clipAction(c) } return a }
 play(name,o={}){ const a=this.clip(name); if(!a)return null; const fade=o.fade??0.15;
  if(this.cur===a&&!o.restart){ a.timeScale=o.speed||1; return a }
  a.reset(); a.enabled=true; a.setEffectiveWeight(1); a.timeScale=o.speed||1; a.paused=false; if(o.once){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}else{a.setLoop(THREE.LoopRepeat,Infinity);a.clampWhenFinished=false}
  if(o.from)a.time=o.from; a.play(); if(this.cur&&this.cur!==a){ this.cur.fadeOut(fade); a.fadeIn(fade) } else a.fadeIn(fade); this.cur=a; this.curName=name; return a }
 setPose(){ if(this.def.sleeper){ const a=this.play('Skeletons_Inactive_Floor_Pose',{fade:0,once:true}); if(a)a.time=0 } else this.play(this.def.idle,{fade:0}) }
 sync(){ this.root.position.set(this.x,this.y+this.hover,this.z); this.root.rotation.y=this.facing }
 setGlow(k,col){ const c=col||this.glowCol; const f=this.flash>0?0.9:0; for(const m of this.mats){ m.emissive.setRGB(c[0]*k*0.85+f,c[1]*k*0.85+f,c[2]*k*0.85+f) } }
 // ---- damage intake. info: {dmg,poise,x,z,heavy,kind,src,crit}
 hurt(info){
  if(!this.alive||this.invuln>0||this.hidden)return {hit:false};
  const d=this.def; const ang=Math.atan2(info.x-this.x,info.z-this.z); const front=Math.abs(angDiff(this.facing,ang))<1.25;
  if(this.state==='dormant'){ this.wake() }
  if(d.shield&&this.guardUp&&front&&!info.crit&&(info.poise||0)<75){ // blocked by shield
   this.poise-=(info.poise||10)*0.5; this.hp-=info.dmg*0.06; this.aggro(); Audio.play('clang'); this.flash=0.05;
   if(this.poise<=0){ this.poise=this.maxPoise; this.stagger(1.5,true) } if(this.hp<=0){this.die();return {hit:true,blocked:true,dealt:0,killed:true}} return {hit:true,blocked:true,dealt:0} }
  if(d.shield&&this.guardUp&&front&&(info.poise||0)>=75){ Audio.play('clang'); this.stagger(1.3,true) }
  let dmg=info.dmg; if(this.boss&&this.state==='transition')dmg*=0.2;
  this.hp-=dmg; this.flash=0.09; this.aggro(info.src);
  const wasStunned=this.stunned&&this.riposteable;
  if(wasStunned&&info.crit){ this.stunned=false; this.riposteable=false; this.stunT=0; this.react('Hit_A',this.boss?1.2:1.0); }
  else if(!wasStunned){
   this.poise-=(info.poise||10);
   if(this.poise<=0&&this.state!=='transition'&&this.state!=='intro'){ this.poise=this.maxPoise; this.stagger(this.boss?2.6:1.7,true) }
   else if(d.flinch&&this.state!=='attack'&&this.state!=='stagger'&&this.state!=='transition'){ this.react(Math.random()<0.5?'Hit_A':'Hit_B',0.42) }
   else if(this.state==='attack'&&!this.att.armor&&d.flinch&&this.tt<this.att.ra*0.5&&(info.poise||0)>=35){ this.react('Hit_B',0.5) }
  }
  const kb=(info.heavy?3.2:1.2)/(d.scale>1.3?2.4:1)*(this.boss?0.3:1); const dx=this.x-info.x,dz=this.z-info.z,dd=Math.hypot(dx,dz)||1; this.vx+=dx/dd*kb;this.vz+=dz/dd*kb;
  if(this.hp<=0){ this.hp=0; this.die(); return {hit:true,dealt:dmg,killed:true} }
  if(this.boss){ const f=this.hp/this.maxHp,np=this.def.phases.length; if(this.phase<np-1&&f<=this.def.phases[this.phase+1].at&&this.state!=='transition'){ this.beginTransition() } }
  return {hit:true,dealt:dmg,killed:false};
 }
 react(clip,dur){ this.state='stagger'; this.tt=0; this.staggerDur=dur; this.att=null; this.setGlow(0); this.play(clip,{once:true,restart:true,fade:0.06}); }
 stagger(dur,riposte){ this.state='stagger'; this.tt=0; this.staggerDur=dur; this.att=null; this.stunned=true; this.riposteable=!!riposte; this.stunT=dur; this.setGlow(0);
  this.play(this.boss?'Hit_B':'Hit_B',{once:true,restart:true,fade:0.05}); this.hover=0; Audio.play('clang'); if(riposte){ FX.ring(this.x,this.y+1,this.z,1.6,0xffe9a0,0.35); Floaters.add(this.x,this.y+this.h+0.4,this.z,'STAGGERED','crit') } }
 onParried(P){ if(this.att&&this.att.unb)return; this.stagger(this.boss?1.9:2.5,true); this.poise=Math.max(this.poise,this.maxPoise*0.4); }
 aggro(src){ if(!this.aggroed){ this.aggroed=true; this.noticeT=0; if(this.state==='idle'||this.state==='dormant'||this.state==='return'){ this.state='chase'; this.tt=0 }
  for(const e of G.enemies){ if(e!==this&&e.alive&&!e.aggroed&&!e.boss&&Math.hypot(e.x-this.x,e.z-this.z)<9&&e.state!=='dormant'){ e.aggroed=true; e.state='chase' } } } }
 wake(){ if(this.state!=='dormant')return; this.state='rising'; this.tt=0; this.invuln=0.2; this.play('Skeletons_Awaken_Floor',{once:true,restart:true,fade:0.05}); Audio.play('reveal'); FX.emit(14,{x:this.x,y:this.y+0.2,z:this.z,rad:1,speed:1.5,up:1,col:[.5,.45,.4],size:0.4,life:0.8,alpha:.5}); }
 die(){ if(!this.alive)return; this.alive=false; this.state='dead'; this.deadT=0; this.att=null; this.stunned=false; this.setGlow(0); this.hover=0; this.engaged=false;
  const sk=/Skeleton/.test(this.def.model); this.play(this.boss?'Death_B':sk?'Skeletons_Death':'Death_A',{once:true,restart:true,fade:0.08}); Audio.play(this.boss?'bossdie':'death');
  FX.emit(this.boss?60:18,{x:this.x,y:this.y+this.h*0.5,z:this.z,rad:this.r,speed:this.boss?6:3,up:2,col:this.def.glow||[1,.7,.4],size:0.3,life:1.1,grav:-0.5});
  if(this.aura)this.aura.intensity=0; G.emit('enemyDied',this);
  if(this.boss){ G.flags[this.def.flag]=true; G.emit('bossDown',this); FX.slowmo(0.25,2.4) } }
 reset(){ // rest at a shrine: everything but defeated bosses returns
  if(this.boss&&G.flags[this.def.flag]){ this.hidden=true; this.alive=false; this.root.visible=false; return }
  this.alive=true; this.hidden=false; this.root.visible=true; this.hp=this.maxHp; this.poise=this.maxPoise; this.x=this.homeX; this.z=this.homeZ; this.y=Terrain.h(this.x,this.z); this.vx=this.vz=0; this.hover=0;
  this.state=this.def.sleeper?'dormant':'idle'; this.aggroed=false; this.att=null; this.stunned=false; this.riposteable=false; this.phase=0; this.engaged=false; this.invuln=0; this.cd=0.5; this.tt=0; this.guardUp=false;
  this.setGlow(0); this.setPose(); this.sync(); if(this.aura)this.aura.intensity=this.boss?3:1.2; if(this.boss&&G.boss===this)G.boss=this; }
}
