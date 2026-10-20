// Particles (GPU points, additive), weapon trails, decals, rings, projectiles helpers, hit-stop.
import {THREE,Engine} from './engine.js';
const MAXP=3000;
const vs=`attribute float size;attribute vec4 col;attribute float life;varying vec4 vC;uniform float scale;
void main(){vC=col;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/-mv.z*step(0.001,col.a);gl_Position=projectionMatrix*mv;}`;
const fs=`varying vec4 vC;void main(){vec2 p=gl_PointCoord-.5;float d=length(p)*2.;float a=smoothstep(1.,.2,d);gl_FragColor=vec4(vC.rgb*a,vC.a*a);}`;
export const FX={
 init(scene){
  this.scene=scene; const g=new THREE.BufferGeometry();
  this.pos=new Float32Array(MAXP*3);this.siz=new Float32Array(MAXP);this.col=new Float32Array(MAXP*4);this.life=new Float32Array(MAXP);
  g.setAttribute('position',new THREE.BufferAttribute(this.pos,3));g.setAttribute('size',new THREE.BufferAttribute(this.siz,1));g.setAttribute('col',new THREE.BufferAttribute(this.col,4));g.setAttribute('life',new THREE.BufferAttribute(this.life,1));
  this.mat=new THREE.ShaderMaterial({vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{scale:{value:600}}});
  this.pts=new THREE.Points(g,this.mat);this.pts.frustumCulled=false;scene.add(this.pts);
  this.P=[];for(let i=0;i<MAXP;i++)this.P.push({a:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,t:0,l:1,s:1,s1:0,r:1,g:1,b:1,al:1,grav:0,drag:0});
  this.cur=0; this.trails=[]; this.rings=[]; this.stop=0; this.slow=0; this.slowT=0;
 },
 // spawn n particles. o: {x,y,z,spread,speed,up,col:[r,g,b],size,life,grav,drag,alpha,shrink}
 emit(n,o){ const c=o.col||[1,.6,.2]; for(let k=0;k<n;k++){ const p=this.P[this.cur]; this.cur=(this.cur+1)%MAXP; p.a=true; const sp=(o.speed||3)*(0.4+Math.random()*0.8);
   const th=Math.random()*6.283,ph=Math.acos(2*Math.random()-1); const dx=o.dir?o.dir.x:0,dz=o.dir?o.dir.z:0; const sx=Math.sin(ph)*Math.cos(th),sy=Math.cos(ph),sz=Math.sin(ph)*Math.sin(th); const sprd=o.spread??1;
   p.x=o.x+(Math.random()-.5)*(o.rad||0);p.y=o.y+(Math.random()-.5)*(o.radY||0);p.z=o.z+(Math.random()-.5)*(o.rad||0);
   p.vx=sx*sp*sprd+dx*(o.dirSpeed||0);p.vy=sy*sp*sprd+(o.up||0)*(0.6+Math.random()*0.8);p.vz=sz*sp*sprd+dz*(o.dirSpeed||0);
   p.t=0;p.l=(o.life||0.6)*(0.6+Math.random()*0.8);p.s=(o.size||0.25)*(0.6+Math.random()*0.8);p.s1=o.shrink===false?p.s:0;p.r=c[0];p.g=c[1];p.b=c[2];p.al=o.alpha??1;p.grav=o.grav||0;p.drag=o.drag||0; } },
 hitSpark(x,y,z,dir,heavy){ this.emit(heavy?26:14,{x,y,z,speed:heavy?7:5,col:[1,.75,.35],size:0.16,life:0.35,grav:12,dir,dirSpeed:-3}); this.emit(3,{x,y,z,speed:1,col:[1,.9,.7],size:0.7,life:0.12}); },
 bloodDust(x,y,z,col=[.5,.05,.05]){ this.emit(10,{x,y,z,speed:2.5,col,size:0.28,life:0.6,grav:4,drag:1,alpha:.7}); },
 embers(x,y,z,r=6,n=2,col=[1,.5,.15]){ this.emit(n,{x:x+(Math.random()-.5)*r,y:y+Math.random()*2,z:z+(Math.random()-.5)*r,speed:0.2,up:1.6,col,size:0.1,life:2.6,alpha:.9}) },
 ring(x,y,z,r1,col=0xffaa55,life=0.5,thick=0.3){ const geo=new THREE.RingGeometry(0.85,1,48);geo.rotateX(-Math.PI/2); const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); m.position.set(x,y+0.08,z); m.scale.setScalar(0.1); this.scene.add(m); this.rings.push({m,t:0,l:life,r1}); },
 // hitstop: freeze world for ms; slow-mo: scale time
 hitstop(ms){ this.stop=Math.max(this.stop,ms/1000) }, slowmo(scale,secs){ this.slow=scale; this.slowT=secs },
 timeScale(dt){ if(this.stop>0){this.stop-=dt;return 0.02} if(this.slowT>0){this.slowT-=dt;return this.slow} return 1 },
 // sword trail: attach to mesh: base & tip points in object space
 makeTrail(obj,a,b,color=0xdfe6ff){ const N=14; const geo=new THREE.BufferGeometry(); const pos=new Float32Array(N*2*3),al=new Float32Array(N*2); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('alpha',new THREE.BufferAttribute(al,1));
  const idx=[];for(let i=0;i<N-1;i++){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)} geo.setIndex(idx);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{c:{value:new THREE.Color(color)}},vertexShader:`attribute float alpha;varying float vA;void main(){vA=alpha;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}`,fragmentShader:`varying float vA;uniform vec3 c;void main(){gl_FragColor=vec4(c*vA,vA*.8);}`});
  const mesh=new THREE.Mesh(geo,m);mesh.frustumCulled=false;this.scene.add(mesh); const tr={obj,a:a.clone(),b:b.clone(),N,pos,al,geo,mesh,hist:[],on:false}; this.trails.push(tr); return tr },
 update(dt){ // dt real
  const g=this.pts.geometry; const sc=Engine.renderer.domElement.height/ (2*Math.tan(Engine.camera.fov*Math.PI/360)); this.mat.uniforms.scale.value=sc;
  for(let i=0;i<MAXP;i++){ const p=this.P[i]; if(!p.a){this.col[i*4+3]=0;continue}
   p.t+=dt; if(p.t>=p.l){p.a=false;this.col[i*4+3]=0;continue} const k=p.t/p.l; p.vy-=p.grav*dt; if(p.drag){const d=Math.max(0,1-p.drag*dt);p.vx*=d;p.vy*=d;p.vz*=d} p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
   this.pos[i*3]=p.x;this.pos[i*3+1]=p.y;this.pos[i*3+2]=p.z; this.siz[i]=p.s*(p.s1===0?(1-k*0.8):1); const a=p.al*(k<0.1?k*10:1-(k-0.1)/0.9); this.col[i*4]=p.r;this.col[i*4+1]=p.g;this.col[i*4+2]=p.b;this.col[i*4+3]=a; }
  g.attributes.position.needsUpdate=g.attributes.size.needsUpdate=g.attributes.col.needsUpdate=true;
  for(let i=this.rings.length-1;i>=0;i--){ const r=this.rings[i]; r.t+=dt; const k=r.t/r.l; r.m.scale.setScalar(0.1+r.r1*(1-(1-k)*(1-k))); r.m.material.opacity=0.9*(1-k); if(k>=1){this.scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();this.rings.splice(i,1)} }
  const A=new THREE.Vector3(),B=new THREE.Vector3();
  for(const tr of this.trails){ tr.obj.updateWorldMatrix(true,false); A.copy(tr.a).applyMatrix4(tr.obj.matrixWorld);B.copy(tr.b).applyMatrix4(tr.obj.matrixWorld);
   if(tr.on)tr.hist.unshift([A.x,A.y,A.z,B.x,B.y,B.z,1]); else if(tr.hist.length)tr.hist.pop(); if(tr.hist.length>tr.N)tr.hist.length=tr.N;
   if(tr.on&&tr.hist.length>1){}
   for(let i=0;i<tr.N;i++){ const h=tr.hist[Math.min(i,tr.hist.length-1)]; if(!h){tr.al[i*2]=tr.al[i*2+1]=0;continue} const f=i<tr.hist.length?1-i/tr.N:0; tr.pos.set([h[0],h[1],h[2],h[3],h[4],h[5]],i*6); tr.al[i*2]=f*f;tr.al[i*2+1]=f*f*0.15; }
   tr.geo.attributes.position.needsUpdate=tr.geo.attributes.alpha.needsUpdate=true; tr.mesh.visible=tr.hist.length>1; }
 },
};
// DOM floating damage numbers
export const Floaters={el:null,list:[],init(root){this.el=root},
 add(wx,wy,wz,text,cls=''){ const d=document.createElement('div'); d.className='floater '+cls; d.textContent=text; this.el.appendChild(d); this.list.push({d,x:wx,y:wy,z:wz,t:0}) },
 update(dt,cam){ const v=new THREE.Vector3(); for(let i=this.list.length-1;i>=0;i--){ const f=this.list[i]; f.t+=dt; f.y+=dt*0.8; v.set(f.x,f.y,f.z).project(cam); if(v.z>1||f.t>1.1){f.d.remove();this.list.splice(i,1);continue} f.d.style.transform=`translate(${(v.x*0.5+0.5)*innerWidth}px,${(-v.y*0.5+0.5)*innerHeight}px) translate(-50%,-50%) scale(${1+Math.max(0,0.3-f.t)})`; f.d.style.opacity=Math.min(1,(1.1-f.t)*3) } } };
