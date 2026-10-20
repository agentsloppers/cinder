// Heightfield world: analytic height function baked to a grid; chunked meshes with 2 LODs.
import * as THREE from 'three';
import {fbm,perlin,clamp,lerp,smooth,mulberry} from './noise.js';

export const SIZE=640, HALF=SIZE/2, LIMIT=HALF-10, CELL=1, N=SIZE/CELL+1, CH=64;

// Designed locations. h:null keeps natural height at the centre. r=flat core, b=blend distance
export const FLATS=[
 {id:'ember',x:0,z:232,r:13,b:26,h:null},
 {id:'rootgate',x:-34,z:118,r:9,b:16,h:null},
 {id:'chapel',x:96,z:16,r:34,b:30,h:9.0},
 {id:'chapelEntry',x:70,z:70,r:10,b:14,h:null},
 {id:'barrowMouth',x:-196,z:-28,r:16,b:20,h:null},
 {id:'summitFoot',x:0,z:-176,r:20,b:24,h:null},
 {id:'ossVest',x:-164,z:-100,r:15,b:14,h:48},
 {id:'ossC1',x:-152,z:-100,r:7,b:6,h:48},
 {id:'ossNave',x:-137,z:-100,r:17,b:10,h:48},
 {id:'ossC2',x:-122,z:-100,r:7,b:6,h:48},
 {id:'ossSanct',x:-104,z:-100,r:23,b:16,h:48},
];
// walking roads (polylines): carved slightly and painted
export const PATHS=[
 [[0,232],[2,200],[-12,170],[-30,140],[-34,118],[-20,90],[10,76],[44,74],[70,70],[84,52],[96,34]],
 [[-34,118],[-70,95],[-120,50],[-165,10],[-196,-28]],
 [[-196,-28],[-178,-52],[-166,-72],[-164,-88]],
 [[96,34],[60,-40],[30,-100],[10,-150],[0,-176]],
];
export const AREAS=[
 {id:'hollow',name:'Cinderfall Hollow',x:0,z:200,r:120},
 {id:'gloam',name:'The Gloamwood',x:-10,z:70,r:110},
 {id:'chapel',name:'Sunken Chapel of Vael',x:96,z:16,r:60},
 {id:'barrow',name:'Barrow Deeps',x:-190,z:-20,r:80},
 {id:'summit',name:'The Stilled Heart',x:0,z:-230,r:130},
 {id:'ossuary',name:'The Ossuary Vaults',x:-135,z:-100,r:46},
];
export function areaAt(x,z){ let best=null,bd=1e9; for(const a of AREAS){const d=Math.hypot(x-a.x,z-a.z)/a.r; if(d<1&&d<bd){bd=d;best=a}} return best }

function pathDist(x,z){ let best=1e9; for(const P of PATHS){ for(let i=0;i<P.length-1;i++){ const [ax,az]=P[i],[bx,bz]=P[i+1]; const dx=bx-ax,dz=bz-az; const l2=dx*dx+dz*dz; let t=clamp(((x-ax)*dx+(z-az)*dz)/l2,0,1); const d=Math.hypot(x-(ax+dx*t),z-(az+dz*t)); if(d<best)best=d } } return best }
// wobble the path a little so it isn't straight
export function pathD(x,z){ return pathDist(x+perlin(z*0.05,x*0.05)*5,z+perlin(x*0.05+9,z*0.05)*5) }

function baseHeight(x,z){
 let h=fbm(x/110,z/110,4)*20+fbm(x/34+7,z/34,3)*3.2+fbm(x/9,z/9,2)*0.35+5;
 // northern mountain
 const mx=x-0,mz=z+250; h+=62*Math.exp(-(mx*mx/(2*95*95)+mz*mz/(2*110*110)));
 // western cliff plateau with a gentle ramp near the barrow road
 const edge=-150+fbm(z/40,3.3,3)*18; const ramp=Math.exp(-Math.pow((z+5)/38,2));
 const cl=smooth(edge-4-ramp*60,edge+6+ramp*50,-x); h+=cl*(28-ramp*6);
 // eastern ridge wall
 h+=smooth(260,300,x)*30*(0.6+fbm(z/50,9,2));
 // bowl at start so the hollow feels enclosed
 return h;
}
export function rawHeight(x,z){
 let h=baseHeight(x,z);
 for(const f of FLATS){ const d=Math.hypot(x-f.x,z-f.z); if(d<f.r+f.b){ const fh=f.h===null?(f._h===undefined?(f._h=baseHeight(f.x,f.z)):f._h):f.h; h=lerp(fh,h,smooth(f.r,f.r+f.b,d)) } }
 const pd=pathD(x,z); if(pd<3.5)h-=0.25*(1-pd/3.5)*(1-smooth(0,1,0));
 return h;
}

export const Terrain={
 H:new Float32Array(N*N), group:new THREE.Group(), chunks:[],
 bake(){ for(let j=0;j<N;j++)for(let i=0;i<N;i++){ this.H[j*N+i]=rawHeight(i*CELL-HALF,j*CELL-HALF) } },
 // bilinear height
 h(x,z){ let fx=(x+HALF)/CELL,fz=(z+HALF)/CELL; fx=clamp(fx,0,N-1.001);fz=clamp(fz,0,N-1.001); const i=Math.floor(fx),j=Math.floor(fz),tx=fx-i,tz=fz-j; const H=this.H,k=j*N+i;
  return (H[k]*(1-tx)+H[k+1]*tx)*(1-tz)+(H[k+N]*(1-tx)+H[k+N+1]*tx)*tz },
 slope(x,z){ const e=1; const dx=(this.h(x+e,z)-this.h(x-e,z))/(2*e),dz=(this.h(x,z+e)-this.h(x,z-e))/(2*e); return Math.hypot(dx,dz) },
 normal(x,z,out=new THREE.Vector3()){ const e=0.8; return out.set(this.h(x-e,z)-this.h(x+e,z),2*e,this.h(x,z-e)-this.h(x,z+e)).normalize() },
 color(x,z,h,slope,out){ const n=fbm(x/14+3,z/14,3),n2=fbm(x/4,z/4+5,2); const pd=pathD(x,z);
  let r,g,b;
  // lush-dark grass <-> dry ash grass by large noise
  const dry=smooth(-0.1,0.35,fbm(x/70+20,z/70,2)); r=lerp(0.075,0.16,dry);g=lerp(0.12,0.13,dry);b=lerp(0.04,0.06,dry);
  r+=n*0.03+n2*0.015;g+=n*0.05+n2*0.02;b+=n*0.01;
  // rock on slopes, snow-ash at altitude
  const rk=smooth(0.55,1.1,slope+n*0.15); r=lerp(r,0.14+n2*0.02,rk);g=lerp(g,0.135+n2*0.02,rk);b=lerp(b,0.14+n2*0.02,rk);
  const hi=smooth(48,70,h); r=lerp(r,0.34,hi);g=lerp(g,0.33,hi);b=lerp(b,0.37,hi);
  // ember-scorched earth around chapel and summit
  const sc=smooth(70,25,Math.hypot(x-96,z-16)); r=lerp(r,0.09+n2*0.02,sc*0.8);g=lerp(g,0.07,sc*0.8);b=lerp(b,0.065,sc*0.8);
  // path
  const p=smooth(3.2,1.2,pd); r=lerp(r,0.24+n2*0.03,p);g=lerp(g,0.17+n2*0.02,p);b=lerp(b,0.1,p);
  out.setRGB(r,g,b) },
 buildGeo(cx,cz,step){ const n=CH/step+1; const pos=new Float32Array(n*n*3),col=new Float32Array(n*n*3),nor=new Float32Array(n*n*3),uv=new Float32Array(n*n*2); const c=new THREE.Color(),nv=new THREE.Vector3();
  const ox=cx*CH-HALF,oz=cz*CH-HALF;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){ const x=ox+i*step,z=oz+j*step,h=this.h(x,z),k=j*n+i; pos[k*3]=x;pos[k*3+1]=h;pos[k*3+2]=z; this.normal(x,z,nv); nor[k*3]=nv.x;nor[k*3+1]=nv.y;nor[k*3+2]=nv.z; this.color(x,z,h,this.slope(x,z),c); col[k*3]=c.r;col[k*3+1]=c.g;col[k*3+2]=c.b; uv[k*2]=x/6;uv[k*2+1]=z/6; }
  const idx=new Uint32Array((n-1)*(n-1)*6); let q=0; for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,d=a+n,e=d+1; idx[q++]=a;idx[q++]=d;idx[q++]=b;idx[q++]=b;idx[q++]=d;idx[q++]=e}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeBoundingSphere(); return g },
 pbrMat(){ const L=new THREE.TextureLoader(), B='/a/ph/';
  const tx=(u,srgb)=>{const t=L.load(B+u); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; if(srgb)t.colorSpace=THREE.SRGBColorSpace; return t};
  const gD=tx('ground/forest_leaves_04_diff_1k.jpg',1),gN=tx('ground/forest_leaves_04_nor_gl_1k.jpg'),rD=tx('rock/rock_face_03_diff_1k.jpg',1),rN=tx('rock/rock_face_03_nor_gl_1k.jpg'),mD=tx('mudrock/brown_mud_rocks_01_diff_1k.jpg',1);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:gD,normalMap:gN,normalScale:new THREE.Vector2(0.9,0.9),roughness:0.95,metalness:0});
  if(!(typeof localStorage!=='undefined'&&localStorage.getItem('cinder_safe_shaders'))) mat.onBeforeCompile=sh=>{ sh.uniforms.rockD={value:rD}; sh.uniforms.mudD={value:mD}; sh.uniforms.rockN={value:rN};
   sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);');
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform sampler2D rockD,mudD,rockN;')
   .replace('#include <map_fragment>',`
    vec3 wn=normalize(vWN); vec3 bw=pow(abs(wn),vec3(4.)); bw/=dot(bw,vec3(1.));
    vec3 gcol=texture2D(map,vWP.xz/5.).rgb; vec3 gcol2=texture2D(map,vWP.xz/23.+.37).rgb; gcol=mix(gcol,gcol2,.35);
    vec3 mcol=texture2D(mudD,vWP.xz/6.).rgb;
    vec3 rx=texture2D(rockD,vWP.zy/9.).rgb, rz=texture2D(rockD,vWP.xy/9.).rgb, ry=texture2D(rockD,vWP.xz/9.).rgb;
    vec3 rcol=rx*bw.x+rz*bw.z+ry*bw.y;
    float slope=1.-wn.y; float rk=smoothstep(.28,.5,slope);
    float lum=dot(vColor,vec3(.299,.587,.114));
    float pathy=smoothstep(.0,.12,vColor.r-vColor.g); // reddish-brown vertex tint marks paths/dirt
    vec3 base=mix(gcol,mcol,clamp(pathy*1.5,0.,1.));
    base=mix(base,rcol,rk);
    vec3 tint=mix(vec3(1.),vColor/max(lum,.05),.35); // keep regional hue, gently
    diffuseColor.rgb*=base*tint*(.55+lum*1.4);
   `).replace('#include <color_fragment>','');
  }; return mat },
 detailTex(){ const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const id=x.createImageData(256,256);const r=mulberry(9);
  for(let j=0;j<256;j++)for(let i=0;i<256;i++){const v=0.62+0.38*(fbm(i/16,j/16,3)*0.8+(r()-0.5)*0.5); const k=(j*256+i)*4; const b=clamp(v,0,1)*255; id.data[k]=b;id.data[k+1]=b;id.data[k+2]=b;id.data[k+3]=255}
  x.putImageData(id,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t },
 build(scene){ this.bake(); const mat=this.pbrMat(); this.mat=mat;
  const nC=SIZE/CH; for(let cz=0;cz<nC;cz++)for(let cx=0;cx<nC;cx++){ const hi=new THREE.Mesh(this.buildGeo(cx,cz,1),mat),lo=new THREE.Mesh(this.buildGeo(cx,cz,4),mat); hi.receiveShadow=true;lo.receiveShadow=true; hi.visible=false;
   const ctr=new THREE.Vector3(cx*CH-HALF+CH/2,this.h(cx*CH-HALF+CH/2,cz*CH-HALF+CH/2),cz*CH-HALF+CH/2); this.group.add(hi,lo); this.chunks.push({hi,lo,ctr}) }
  scene.add(this.group) },
 update(p){ for(const c of this.chunks){ const d=Math.hypot(c.ctr.x-p.x,c.ctr.z-p.z); const near=d<150; if(c.hi.visible!==near){c.hi.visible=near;c.lo.visible=!near} } },
};
