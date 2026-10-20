// Spirit summons: the gacha's spirits made real. Listens to G 'spirit' (pressed by player),
// spends FP, respects cooldown and rank (duplicates add +12% power per rank), and runs effects.
import {G} from './state.js';
import {Save} from './save.js';
import {SPIRIT_BY_ID} from './data/gacha.js';
import {FX,Floaters} from './fx.js';
import {Audio} from './audio.js';
import {Enemy} from './enemy.js';
import {Engine} from './engine.js';
import {Terrain} from './terrain.js';
import {Colliders} from './colliders.js';

const RANK=0.12;
export const Spirits={
 active:[], // timed effects {t, kind, ...}
 init(){ G.on('spirit',p=>this.cast(p)) },
 rankMul(id){ return 1+RANK*((Save.d.spirits||{})[id]||0) },
 targets(p,rad){ return (G.enemies||[]).filter(e=>e.alive&&!e.hidden&&Math.hypot(e.x-p.x,e.z-p.z)<rad) },
 strike(p,e,dmg,poise){
  const nx=(e.x-p.x)||0.001,nz=(e.z-p.z)||0.001,l=Math.hypot(nx,nz);
  const r=e.hurt({dmg,poise:poise||40,x:p.x,z:p.z,heavy:(poise||0)>=100,src:p,kind:'spirit',dx:nx/l,dz:nz/l,crit:false});
  if(r&&r.hit!==false){ FX.hitSpark(e.x,(e.y||0)+1.2,e.z,{x:nx/l,z:nz/l},(poise||0)>=100); try{Floaters.add(e.x,(e.y||0)+2.2,e.z,String(Math.round(dmg)),'spirit')}catch(_){} }
  return r;
 },
 cast(p){
  const id=Save.d.spiritEq; const sp=SPIRIT_BY_ID[id];
  if(!sp||p.dead){ return false }
  if(p.spiritCd>0||p.fp<sp.fp||(p.state&&p.state!=='free')){ Audio.play('warn'); return false }
  p.fp-=sp.fp; p.spiritCd=sp.cd||8; const m=this.rankMul(id); const y=(p.y||0);
  Audio.play('spirit'); FX.ring(p.x,y+0.2,p.z,1,0xbfd4ff,0.6,0.35);
  switch(sp.kind){
   case 'burst':{ FX.ring(p.x,y+0.5,p.z,sp.rad,0xffb070,0.7,0.6); FX.emit(40,{x:p.x,y:y+1,z:p.z,speed:sp.rad,up:2,col:[1,.55,.2],size:0.2,life:0.8,grav:-1});
    for(const e of this.targets(p,sp.rad))this.strike(p,e,sp.power*m,sp.poise||60); G.cam&&G.cam.shake(0.25); break }
   case 'dash':{ const t=(p.lock&&p.lock.alive&&Math.hypot(p.lock.x-p.x,p.lock.z-p.z)<sp.rad*1.6)?p.lock:p.nearestEnemy(sp.rad*1.6);
    if(t){ const n=10; for(let k=0;k<n;k++){ const f=k/n; FX.emit(3,{x:p.x+(t.x-p.x)*f,y:y+1,z:p.z+(t.z-p.z)*f,speed:1,up:1,col:[.7,.8,1],size:0.18,life:0.6,grav:0}) }
     this.strike(p,t,sp.power*m,90) } else Floaters.add(p.x,y+2.2,p.z,'no prey','spirit'); break }
   case 'heal':{ this.active.push({kind:'heal',t:3,left:p.maxHp*sp.power*m,dur:3}); break }
   case 'stam':{ p.st=p.maxSt; this.active.push({kind:'stam',t:8,rate:sp.power*m*0.25}); break }
   case 'ward':{ p.ward={t:sp.dur||10,cut:Math.min(0.85,sp.power*(1+(m-1)*0.5))}; FX.ring(p.x,y+1,p.z,1.4,0x9fb0c8,sp.dur||10,0.1); break }
   case 'buff':{ p.buff={t:sp.dur||16,mul:1+sp.power*m}; break }
   case 'storm':{ const n=sp.strikes||4; for(let k=0;k<n;k++)this.active.push({kind:'bolt',t:0.35+k*0.45,power:sp.power*m,rad:sp.rad}); break }
   case 'ally':{ this.summonAlly(p,sp,m); break }
   case 'time':{ FX.slowmo(sp.power,sp.dur||5); p.invuln=Math.max(p.invuln||0,(sp.dur||5)*sp.power+0.4); break }
  }
  G.emit('spiritCast',sp); return true;
 },
 update(dt,p){
  this.updateAllies(dt,p);
  if(p.ward&&p.ward.t>0)p.ward.t-=dt;
  for(let i=this.active.length-1;i>=0;i--){ const a=this.active[i];
   if(a.kind==='heal'){ const h=a.left*Math.min(dt,a.t)/a.dur; p.hp=Math.min(p.maxHp,p.hp+h); a.t-=dt; if(Math.random()<0.3)FX.emit(1,{x:p.x,y:(p.y||0)+1,z:p.z,speed:0.6,up:1.5,col:[1,.85,.5],size:0.12,life:0.9,grav:-1}) }
   else if(a.kind==='stam'){ p.st=Math.min(p.maxSt,p.st+a.rate*dt); a.t-=dt }
   else if(a.kind==='bolt'){ a.t-=dt; if(a.t<=0){ const ts=this.targets(p,a.rad); const e=ts.length?ts[(Math.random()*ts.length)|0]:null;
     if(e){ FX.ring(e.x,(e.y||0)+0.1,e.z,2.2,0xdfe6ff,0.5,0.4); FX.emit(18,{x:e.x,y:(e.y||0)+0.5,z:e.z,speed:3,up:6,col:[.85,.9,1],size:0.16,life:0.5,grav:2}); this.strike(p,e,a.power,80); Audio.play('hit',{heavy:true}) } } }
   if(a.t<=0)this.active.splice(i,1);
  }
 },
 allies:[],
 async summonAlly(p,sp,m){
  for(const a of this.allies)this.dismiss(a);
  const a=new Enemy(sp.model||'reaver',p.x-Math.sin(p.yaw)*1.5,p.z-Math.cos(p.yaw)*1.5,{id:'ally_'+Date.now()});
  try{ await a.init(Engine.scene) }catch(e){ console.warn('ally load',e); return }
  const i=(G.enemies||[]).indexOf(a); if(i>=0)G.enemies.splice(i,1);
  a.ally=true; a.life=sp.dur||40; a.dmg=sp.power*m; a.state='follow'; a.cd=0.6; a.hp=a.maxHp=9e9;
  for(const mt of a.mats){ if(mt.emissive){ mt.emissive.setRGB(0.25,0.35,0.55); mt.transparent=true; mt.opacity=0.82 } }
  if(a.aura){ a.aura.color&&a.aura.color.setRGB(0.6,0.75,1) }
  FX.emit(30,{x:a.x,y:a.y+1,z:a.z,speed:2,up:3,col:[.6,.75,1],size:0.2,life:1,grav:-1});
  this.allies.push(a);
 },
 dismiss(a){ FX.emit(20,{x:a.x,y:a.y+1,z:a.z,speed:2,up:3,col:[.6,.75,1],size:0.18,life:0.9,grav:-1}); a.root.parent&&a.root.parent.remove(a.root); a.gone=true },
 updateAllies(dt,p){
  for(let i=this.allies.length-1;i>=0;i--){ const a=this.allies[i];
   a.life-=dt; if(a.life<=0||p.dead){ this.dismiss(a); this.allies.splice(i,1); continue }
   a.mixer&&a.mixer.update(dt); a.cd-=dt;
   let tgt=null,bd=22; for(const e of G.enemies||[]){ if(!e.alive||e.hidden||e.state==='dormant')continue; const d=Math.hypot(e.x-a.x,e.z-a.z); if(d<bd){bd=d;tgt=e} }
   let gx,gz,stop; if(tgt){ gx=tgt.x;gz=tgt.z;stop=1.3+(tgt.r||0.5) } else { gx=p.x-Math.sin(p.yaw)*2;gz=p.z-Math.cos(p.yaw)*2;stop=1.2 }
   const dx=gx-a.x,dz=gz-a.z,d=Math.hypot(dx,dz);
   if(a.swing>0){ a.swing-=dt; if(!a.struck&&a.swing<0.55&&tgt&&bd<stop+1){ a.struck=true; this.strike(a,tgt,a.dmg,50); Audio.play('hit',{}) } }
   else if(tgt&&d<stop+0.3&&a.cd<=0){ a.swing=1.0; a.struck=false; a.cd=1.5; a.facing=Math.atan2(dx,dz); a.play('1H_Melee_Attack_Chop',{once:true,restart:true,fade:0.1})||a.play('2H_Melee_Attack_Chop',{once:true,restart:true,fade:0.1}) }
   else if(d>stop){ const sp=Math.min(d>8?6:3.4,d*3); a.x+=dx/d*sp*dt; a.z+=dz/d*sp*dt; a.facing=Math.atan2(dx,dz); a.play(d>8?'Running_A':a.def.run,{fade:0.2}); }
   else a.play(a.def.idle,{fade:0.25});
   if(d>40){ a.x=p.x;a.z=p.z }
   const q={x:a.x,z:a.z}; try{Colliders.resolve(q,a.r,a.y)}catch(_){} a.x=q.x;a.z=q.z; a.y=Terrain.h(a.x,a.z); a.sync();
  }
 },
 reset(){ this.active.length=0; for(const a of this.allies)this.dismiss(a); this.allies.length=0 },
};
