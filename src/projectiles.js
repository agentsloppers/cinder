// Enemy/ally projectiles (orbs, arrows, ground waves) and ground hazards (telegraphed flame pillars, lingering fire).
import {THREE} from './engine.js';
import {Terrain} from './terrain.js';
import {Colliders} from './colliders.js';
import {FX} from './fx.js';
import {Audio} from './audio.js';
import {G} from './state.js';

const sphereGeo=new THREE.SphereGeometry(1,10,8);
const arrowGeo=new THREE.CylinderGeometry(0.025,0.025,1.1,5); arrowGeo.rotateX(Math.PI/2);
const waveGeo=new THREE.ConeGeometry(1,2.4,6,1,true); waveGeo.rotateX(Math.PI/2);
const discGeo=new THREE.CircleGeometry(1,40); discGeo.rotateX(-Math.PI/2);
const ringGeo=new THREE.RingGeometry(0.9,1,48); ringGeo.rotateX(-Math.PI/2);
const mats={};
const mat=(c,o={})=>{ const k=c.join(',')+JSON.stringify(o); return mats[k]||(mats[k]=new THREE.MeshBasicMaterial({color:new THREE.Color(c[0],c[1],c[2]),transparent:true,opacity:o.op??0.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})) };
const lerp=(a,b,t)=>a+(b-a)*t;

export const Projectiles={
 scene:null,
 init(scene){ this.scene=scene; },
 // spec: {x,y,z,dir (yaw) | tx,ty,tz, speed,dmg,r,life,col,kind:'orb'|'arrow'|'wave',homing,magic,poise,owner,from}
 fire(s){
  const dir=s.dir??Math.atan2(s.tx-s.x,s.tz-s.z); const sp=s.speed||14;
  const p={x:s.x,y:s.y,z:s.z,vx:Math.sin(dir)*sp,vz:Math.cos(dir)*sp,vy:0,dmg:s.dmg||30,r:s.r||0.3,life:s.life||2,col:s.col||[1,.6,.2],kind:s.kind||'orb',homing:s.homing||0,magic:!!s.magic,poise:s.poise??30,owner:s.owner||'enemy',from:s.from,speed:sp,age:0,hit:new Set(),yFix:s.y};
  if(s.ty!==undefined&&p.kind!=='wave'){ const t=Math.hypot(s.tx-s.x,s.tz-s.z)/sp; p.vy=(s.ty-s.y)/Math.max(0.05,t); }
  let m;
  if(p.kind==='arrow'){ m=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:0xe8dcc0})); m.rotation.order='YXZ'; }
  else if(p.kind==='wave'){ m=new THREE.Mesh(waveGeo,mat(p.col,{op:0.55})); m.scale.set(p.r,p.r*0.8,p.r*1.4); p.y=Terrain.h(p.x,p.z)+0.6; }
  else { m=new THREE.Group(); const core=new THREE.Mesh(sphereGeo,new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1).lerp(new THREE.Color(...p.col),0.35)})); core.scale.setScalar(p.r*0.55); const halo=new THREE.Mesh(sphereGeo,mat(p.col,{op:0.55})); halo.scale.setScalar(p.r*1.5); m.add(core,halo); }
  m.position.set(p.x,p.y,p.z); this.scene.add(m); p.mesh=m; G.projectiles.push(p); return p; },
 // telegraphed ground circle: warns for `delay`, then bursts for dmg; lingers `linger` seconds if given
 hazard(h){ const hz={x:h.x,z:h.z,r:h.r||2,delay:h.delay??1,dmg:h.dmg||50,col:h.col||[1,.45,.1],t:0,burst:false,linger:h.linger||0,tick:0,poise:h.poise||40,pillar:h.pillar!==false};
  const y=Terrain.h(hz.x,hz.z); hz.y=y;
  hz.disc=new THREE.Mesh(discGeo,mat(hz.col,{op:0.18})); hz.disc.position.set(hz.x,y+0.07,hz.z); hz.disc.scale.setScalar(hz.r);
  hz.ring=new THREE.Mesh(ringGeo,mat(hz.col,{op:0.85})); hz.ring.position.set(hz.x,y+0.09,hz.z); hz.ring.scale.setScalar(hz.r);
  hz.fill=new THREE.Mesh(ringGeo,mat(hz.col,{op:0.6})); hz.fill.position.set(hz.x,y+0.1,hz.z); hz.fill.scale.setScalar(0.05);
  this.scene.add(hz.disc,hz.ring,hz.fill); G.hazards.push(hz); Audio.play('warn',{soft:true}); return hz; },
 playerHit(info,x,y,z,r){ const P=G.player; if(!P||P.dead)return false; const dx=P.x-x,dz=P.z-z; if(Math.hypot(dx,dz)>r+P.r)return false; if(P.y>y+3||P.y+1.9<y-0.5)return false; return P.hurt(info); },
 update(dt){
  const P=G.player;
  for(let i=G.projectiles.length-1;i>=0;i--){ const p=G.projectiles[i]; p.age+=dt; p.life-=dt; let dead=p.life<=0;
   if(p.homing&&P&&p.owner==='enemy'&&p.age>0.25&&p.age<2.2){ const tx=P.x-p.x,tz=P.z-p.z,td=Math.hypot(tx,tz)||1; const ca=Math.atan2(p.vx,p.vz),ta=Math.atan2(tx,tz); let d=((ta-ca+Math.PI*3)%(Math.PI*2))-Math.PI; const turn=Math.max(-p.homing*dt,Math.min(p.homing*dt,d)); const na=ca+turn; p.vx=Math.sin(na)*p.speed;p.vz=Math.cos(na)*p.speed; p.vy=lerp(p.vy,(P.y+1.1-p.y)/Math.max(0.3,td/p.speed),dt*2); }
   const ox=p.x,oz=p.z; p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
   if(p.kind==='wave'){ p.y=Terrain.h(p.x,p.z)+0.6; }
   const gh=Terrain.h(p.x,p.z);
   if(p.kind!=='wave'&&p.y<gh+0.1){ dead=true; this.impact(p); }
   if(p.kind!=='wave'&&!dead&&Colliders.blocked(ox,oz,p.x,p.z,p.y)){ dead=true; this.impact(p,true); }
   if(!dead&&p.owner==='enemy'&&P&&!P.dead){ const dx=P.x-p.x,dz=P.z-p.z; const flat=Math.hypot(dx,dz); const py=P.y+0.9; if(flat<p.r+P.r+(p.kind==='wave'?0.6:0.1)&&Math.abs(py-p.y)<(p.kind==='wave'?1.4:1.1)&&!p.hit.has(P)){
     p.hit.add(P); const res=P.hurt({dmg:p.dmg,poise:p.poise,x:p.x-p.vx*0.1,z:p.z-p.vz*0.1,kind:'proj',src:p.from,unblockable:p.kind==='wave'&&false,heavy:p.dmg>60}); if(res&&(res.hit||res.blocked)){ if(p.kind!=='wave'){dead=true;this.impact(p)} } } }
   if(!dead&&p.owner==='player'){ for(const e of G.enemies){ if(!e.alive||e.hidden||p.hit.has(e))continue; const dx=e.x-p.x,dz=e.z-p.z; if(Math.hypot(dx,dz)<p.r+e.r&&p.y>e.y-0.2&&p.y<e.y+e.h+0.3){ p.hit.add(e); const res=e.hurt({dmg:p.dmg,poise:p.poise,x:p.x-p.vx,z:p.z-p.vz,kind:'spell',src:G.player,heavy:false}); if(res&&res.hit){ G.floater&&G.floater(e,res.dealt); if(res.killed)G.emit('kill',e); dead=true; this.impact(p); break } } } }
   // visuals
   if(p.mesh){ p.mesh.position.set(p.x,p.y,p.z); if(p.kind==='arrow'||p.kind==='wave'){ p.mesh.rotation.y=Math.atan2(p.vx,p.vz); if(p.kind==='arrow')p.mesh.rotation.x=-Math.atan2(p.vy,Math.hypot(p.vx,p.vz)); } else if(p.mesh.children[1]){ p.mesh.children[1].scale.setScalar(p.r*(1.4+Math.sin(p.age*30)*0.2)); } }
   if(p.kind==='wave'){ FX.emit(2,{x:p.x,y:p.y,z:p.z,rad:p.r*1.2,speed:1.2,up:1.6,col:p.col,size:0.5,life:0.45,alpha:.7}); }
   else if(p.kind==='orb'){ FX.emit(1,{x:p.x,y:p.y,z:p.z,speed:0.5,col:p.col,size:0.28,life:0.35,alpha:.8}); }
   else FX.emit(1,{x:p.x,y:p.y,z:p.z,speed:0.1,col:[.9,.9,.8],size:0.07,life:0.2,alpha:.5});
   if(dead){ this.scene.remove(p.mesh); G.projectiles.splice(i,1); }
  }
  for(let i=G.hazards.length-1;i>=0;i--){ const h=G.hazards[i]; h.t+=dt;
   if(!h.burst){ const k=Math.min(1,h.t/h.delay); h.fill.scale.setScalar(Math.max(0.05,h.r*k)); h.disc.material.opacity; h.ring.material.opacity=0.55+0.4*Math.sin(h.t*18);
    if(h.t>=h.delay){ h.burst=true; h.t=0; Audio.play('boom',{small:true}); FX.emit(h.pillar?36:20,{x:h.x,y:h.y+0.2,z:h.z,rad:h.r*0.8,speed:2,up:h.pillar?9:3,col:h.col,size:0.35,life:0.9,grav:-1,alpha:.9}); FX.ring(h.x,h.y,h.z,h.r*1.05,0xff8a30,0.4); G.cam&&G.cam.shake(0.12);
     if(P&&!P.dead){ const r=this.playerHit({dmg:h.dmg,poise:h.poise,x:h.x,z:h.z,kind:'aoe',unblockable:true,heavy:true,fire:true},h.x,h.y,h.z,h.r); } }
   } else { // after-burst: fading, optional linger damage
    const k=h.t/(0.5+h.linger); if(h.linger>0){ h.tick-=dt; if(h.tick<=0){ h.tick=0.5; if(P&&!P.dead&&Math.hypot(P.x-h.x,P.z-h.z)<h.r&&P.y<h.y+1)P.hurt({dmg:h.dmg*0.25,poise:5,x:h.x,z:h.z,kind:'aoe',unblockable:true,fire:true}); } FX.emit(1,{x:h.x,y:h.y,z:h.z,rad:h.r*1.6,speed:0.2,up:2.5,col:h.col,size:0.3,life:0.8,alpha:.8}); }
    h.fill.visible=false; h.ring.material.opacity=Math.max(0,0.8-k); h.disc.material.opacity=0.0;
    if(h.t>0.5+h.linger){ this.scene.remove(h.disc,h.ring,h.fill); G.hazards.splice(i,1); } }
  }
 },
 impact(p,wall){ const col=p.col; FX.emit(p.kind==='arrow'?5:14,{x:p.x,y:p.y,z:p.z,speed:p.kind==='arrow'?2:4,col,size:0.2,life:0.4,grav:p.kind==='arrow'?6:0}); if(p.kind==='orb')Audio.play('boom',{small:true}); },
 // area burst helper used by slams (instant, no telegraph; the enemy's windup was the telegraph)
 burst(x,z,r,info,fx=true,ring=false){ const y=Terrain.h(x,z); if(fx){ FX.emit(ring?60:28,{x,y:y+0.2,z,rad:r*0.5,speed:r*1.2,up:2.5,col:info.col||[.8,.6,.4],size:0.5,life:0.8,grav:-1,alpha:.6}); FX.ring(x,y,z,r,info.ringCol||0xffc080,0.45); if(ring)FX.ring(x,y,z,r*1.5,0xffe0b0,0.7,0.5); Audio.play('boom'); G.cam&&G.cam.shake(Math.min(0.7,0.2+r*0.06)); FX.hitstop(60); }
  const P=G.player; if(P&&!P.dead){ const flat=Math.hypot(P.x-x,P.z-z); if(flat<r+P.r&&P.y<y+1.4){ return P.hurt({...info,x,z,kind:'aoe',unblockable:true}) } } return null; },
 clear(){ for(const p of G.projectiles)this.scene.remove(p.mesh); G.projectiles.length=0; for(const h of G.hazards)this.scene.remove(h.disc,h.ring,h.fill); G.hazards.length=0; },
};
