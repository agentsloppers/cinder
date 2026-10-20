// World population: enemy spawn tables per region, fog gates, soul stains, shrine glow, lights.
import {THREE,Engine} from './engine.js';
import {Terrain,pathD,areaAt} from './terrain.js';
import {Level} from './level.js';
import {Enemy} from './enemy.js';
import {G} from './state.js';
import {FX} from './fx.js';

function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// [type, count, cx, cz, radius]  groups placed at random with spacing
const GROUPS=[
 // Cinderfall Hollow (start): gentle
 ['husk',3,-18,205,16],['husk',3,22,188,18],['bonehound',2,-4,176,14],['husk',2,-24,160,14],['cultist',1,12,160,10],
 // road to Rootgate
 ['bonehound',3,-30,138,16],['reaver',1,-12,152,8],['husk',3,-60,120,16],
 // Gloamwood
 ['shade',2,-50,100,14],['reaver',2,-20,92,14],['ranger',2,-90,76,18],['assassin',1,-110,62,10],['caller',1,-60,70,10],['bonehound',4,-130,40,20],['crossbowman',2,-8,76,14],['cultist',2,28,78,14],['brute',1,-150,24,10],['shade',3,-160,6,16],['ranger',2,-170,-6,12],
 // approach to chapel
 ['reaver',2,50,74,14],['crossbowman',2,66,60,12],['knight',1,78,50,8],['bulwark',1,88,46,6],['husk',4,56,40,16],
 // chapel courtyard (beyond the boss gate -> only reachable after)
 // Barrow
 ['knight',2,-190,-12,12],['bulwark',1,-180,-34,8],['caller',2,-200,-44,12],['brute',1,-170,-40,8],['assassin',2,-205,-20,12],
 // road to summit
 ['knight',1,58,-38,10],['shade',3,40,-70,16],['brute',2,26,-104,14],['cultist',3,12,-140,16],['bulwark',1,4,-160,8],['assassin',2,-6,-166,10],
];
const ELITE=new Set(['knight','brute','bulwark','assassin','caller']);
export const World={
 enemies:[], gates:[], fogs:[], stainMesh:null, lights:[], flames:[], shrineMesh:[],
 async spawnAll(scene,onProg){
  const R=mulberry(2024); const jobs=[];
  for(const [type,n,cx,cz,rad] of GROUPS){ for(let i=0;i<n;i++){ let x,z,tries=0; do{ const a=R()*6.28,d=Math.sqrt(R())*rad; x=cx+Math.cos(a)*d; z=cz+Math.sin(a)*d; tries++ }while(tries<20&&(Terrain.slope(x,z)>0.55||Level.nearFlat(x,z,4)&&type!=='bulwark'&&false)); if(Level.shrines.some(s=>Math.hypot(s.x-x,s.z-z)<12))continue; jobs.push(new Enemy(type,x,z,{area:(areaAt(x,z)||{}).id||''})) } }
  jobs.push(new Enemy('ashen_knight',96,-4,{})); jobs.push(new Enemy('hollow_king',-196,-60,{})); jobs.push(new Enemy('stilled_heart',0,-232,{}));
  let n=0; for(let i=0;i<jobs.length;i+=6){ await Promise.all(jobs.slice(i,i+6).map(async e=>{ await e.init(scene); if(e.boss)G.bosses=(G.bosses||[]).concat(e); n++ })); onProg&&onProg(n,jobs.length) }
  this.enemies=jobs; return jobs; },
 setupGates(scene){
  for(const g of Level.gates){ const geo=new THREE.PlaneGeometry(g.w,6,1,1); const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{t:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float t;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}void main(){float n=h(floor(vec2(vUv.x*24.,vUv.y*12.-t*3.)))*0.5+0.5*sin(vUv.y*9.-t*2.+vUv.x*6.);float e=smoothstep(0.,.25,vUv.x)*smoothstep(1.,.75,vUv.x)*smoothstep(1.,.6,vUv.y);gl_FragColor=vec4(vec3(.95,.55,.25)*(.35+n*.5),(.28+n*.2)*e);}'});
   const m=new THREE.Mesh(geo,mat); m.position.set(g.x,g.y+3,g.z); m.rotation.y=g.ry; scene.add(m); this.fogs.push({m,mat,g}) }
 },
 setupLights(scene){
  this.sources=[...Level.shrines.map(s=>({x:s.x,y:s.y+2.2,z:s.z,c:0xff9a4a,i:26,shrine:true})),...Level.torches.map(t=>({x:t.x,y:t.y,z:t.z,c:t.c,i:14}))];
  for(let i=0;i<5;i++){ const l=new THREE.PointLight(0xff9a4a,0,22,2); l.castShadow=false; scene.add(l); this.lights.push(l) }
  // shrine flame pillar
  for(const s of Level.shrines){ const g=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.9,5,12,1,true),new THREE.MeshBasicMaterial({color:0xffa04a,transparent:true,opacity:0.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); g.position.set(s.x,s.y+2.6,s.z); scene.add(g); this.shrineMesh.push(g); }
  // soul stain
  this.stain=new THREE.Group(); const c=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,14,10,1,true),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); c.position.y=7; this.stain.add(c); const l=new THREE.PointLight(0xffc060,10,16,2); l.position.y=1; this.stain.add(l); this.stain.visible=false; scene.add(this.stain);
 },
 update(dt,t,P){
  for(const f of this.fogs)f.mat.uniforms.t.value=t;
  // nearest 5 light sources
  const ls=this.sources.map(s=>({s,d:(s.x-P.x)**2+(s.z-P.z)**2})).filter(o=>o.d<60*60).sort((a,b)=>a.d-b.d);
  this.lights.forEach((l,i)=>{ const o=ls[i]; if(!o){l.intensity=0;return} l.position.set(o.s.x,o.s.y,o.s.z); l.color.setHex(o.s.c); l.distance=o.s.shrine?30:20; l.intensity=(o.s.i||12)*(0.9+0.1*Math.sin(t*9+i*3)+0.05*Math.sin(t*23+i)) });
  this.shrineMesh.forEach((m,i)=>{ const s=Level.shrines[i]; const d=Math.hypot(s.x-P.x,s.z-P.z); m.visible=d<90; m.scale.set(1+0.08*Math.sin(t*3+i),1,1+0.08*Math.sin(t*3+i)); if(m.visible&&Math.random()<dt*14)FX.emit(1,{x:s.x,y:s.y+0.6,z:s.z,rad:0.8,speed:0.3,up:1.6,col:[1,.55,.2],size:0.28,life:1.4,grav:-0.5,alpha:.9}) });
  if(this.stain.visible){ this.stain.children[0].material.opacity=0.28+0.12*Math.sin(t*4) }
 },
};
