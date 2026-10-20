// Third-person orbit camera with soft lock-on framing, terrain/collider avoidance, shake and FOV punch.
import {THREE,Engine} from './engine.js';
import {Terrain} from './terrain.js';
import {Colliders} from './colliders.js';
import {Input} from './input.js';
import {G} from './state.js';
import {angDiff} from './player.js';

const lerp=(a,b,t)=>a+(b-a)*t;
export const Cam={
 yaw:Math.PI,pitch:0.28,dist:5.4,tdist:5.4,fov:62,shakeAmt:0,shakeT:0,pos:new THREE.Vector3(),look:new THREE.Vector3(),tgt:new THREE.Vector3(),sens:1,invertY:false,cine:null,
 init(p){ this.yaw=p.yaw; this.snap(p) },
 shake(a){ this.shakeAmt=Math.min(1,Math.max(this.shakeAmt,a)) },
 snap(p){ this.tgt.set(p.x,p.y+1.55,p.z); this.update(0.016,p,true) },
 update(dt,p,snap){
  const cam=Engine.camera;
  if(this.cine){ // scripted camera: {pos:Vector3,look:Vector3,fov}
   const c=this.cine; this.pos.lerp(c.pos,Math.min(1,dt*(c.rate||3))); this.look.lerp(c.look,Math.min(1,dt*(c.rate||3))); cam.position.copy(this.pos); cam.lookAt(this.look); cam.fov=lerp(cam.fov,c.fov||50,Math.min(1,dt*3)); cam.updateProjectionMatrix(); return }
  const lock=p.lock;
  if(lock&&!p.dead){
   // swing yaw so player and target both stay in frame; player sits lower-left of the target
   const dx=lock.x-p.x,dz=lock.z-p.z,d=Math.hypot(dx,dz); const want=Math.atan2(dx,dz); this.yaw+=angDiff(this.yaw,want)*Math.min(1,dt*7);
   const th=lock.h?lock.h*0.55:1.2; const dy=(lock.y||0)+th-(p.y+1.4); const wp=Math.atan2(-dy,Math.max(d,3))*0.6+0.2+Math.min(0.28,d*0.012); this.pitch+=(wp-this.pitch)*Math.min(1,dt*4);
   this.tdist=Math.min(9,5.2+d*0.14+(lock.big?3.5:0));
   this.yaw-=(Input.lookX||0)*0.0006*0; // look is ignored while locked
  } else {
   const k=0.0024*this.sens; this.yaw-=(Input.lookX||0)*k; this.pitch+=(Input.lookY||0)*k*(this.invertY?-1:1); this.tdist=5.4+(p.sprinting?0.5:0)+(p.state==='attack'?0.2:0);
  }
  this.pitch=Math.max(-0.5,Math.min(1.15,this.pitch));
  this.dist=lerp(this.dist,this.tdist,Math.min(1,dt*3));
  // follow target (smoothed vertical)
  const ty=p.y+1.55; this.tgt.x=snap?p.x:lerp(this.tgt.x,p.x,Math.min(1,dt*18)); this.tgt.z=snap?p.z:lerp(this.tgt.z,p.z,Math.min(1,dt*18)); this.tgt.y=snap?ty:lerp(this.tgt.y,ty,Math.min(1,dt*6));
  let off=this.dist; const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
  const sx=Math.sin(this.yaw),sz=Math.cos(this.yaw);
  // shoulder offset (right) for framing
  const rx=Math.cos(this.yaw)*0.55,rz=-Math.sin(this.yaw)*0.55;
  const hx=this.tgt.x+rx,hz=this.tgt.z+rz,hy=this.tgt.y+0.1;
  // collision: march from head to camera
  let dd=off; const steps=8; for(let i=1;i<=steps;i++){ const t=i/steps*off; const x=hx-sx*cp*t,z=hz-sz*cp*t,y=hy+sp*t; const gh=Terrain.h(x,z)+0.35; let hit=y<gh; if(!hit){ const q={x,z}; if(Colliders.resolve(q,0.25,y-0.3)&&(Math.abs(q.x-x)+Math.abs(q.z-z))>0.04)hit=true } if(hit){ dd=Math.max(1.2,t-0.45); break } }
  this.cdist=snap||this.cdist===undefined?dd:(dd<this.cdist?dd:lerp(this.cdist,dd,Math.min(1,dt*3)));
  let px=hx-sx*cp*this.cdist,pz=hz-sz*cp*this.cdist,py=hy+sp*this.cdist; const g=Terrain.h(px,pz)+0.4; if(py<g)py=g;
  // shake
  if(this.shakeAmt>0.001){ const s=this.shakeAmt; px+=(Math.random()-.5)*s*0.5; py+=(Math.random()-.5)*s*0.5; pz+=(Math.random()-.5)*s*0.5; this.shakeAmt*=Math.pow(0.0008,dt) }
  cam.position.set(px,py,pz); this.pos.copy(cam.position);
  this.look.set(this.tgt.x+rx*0.5,this.tgt.y+0.1,this.tgt.z+rz*0.5); cam.lookAt(this.look);
  const wantFov=this.fov+(p.sprinting?5:0)+(p.state==='roll'?4:0); cam.fov=lerp(cam.fov,wantFov,Math.min(1,dt*5)); cam.updateProjectionMatrix();
 },
 // yaw used for move input (forward direction)
 get fwdYaw(){ return this.yaw },
};
