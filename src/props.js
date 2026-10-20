// Instanced static props with per-cell culling, wind sway, and collider generation.
import * as THREE from 'three';
import {Assets} from './assets.js';
import {Colliders} from './colliders.js';
const CELL=48;
export const Props={group:new THREE.Group(),list:[],timeU:{value:0},cells:[],tmpl:{},bbox:{},mats:{},
 place(m,x,y,z,ry=0,s=1,o={}){ this.list.push({m,x,y,z,ry,s,o}) },
 swayMat(src,k,rock){ const key=src.uuid+k+(rock?'r':''); if(this.mats[key])return this.mats[key]; const m=src.clone(); if(m.map)m.map.colorSpace=THREE.SRGBColorSpace; m.roughness=0.95; m.metalness=0;
  m.onBeforeCompile=sh=>{ sh.uniforms.uTime=this.timeU;
   sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n float lumA=dot(diffuseColor.rgb,vec3(.3,.59,.11)); diffuseColor.rgb=mix(vec3(lumA),diffuseColor.rgb,.42)*vec3(.66,.63,.6);');
   if(k>0) sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=vec3(position);
   #ifdef USE_INSTANCING
   float sw=max(position.y,0.)*${(0.05*k).toFixed(3)}; transformed.x+=sin(uTime*1.3+instanceMatrix[3].x*.3+instanceMatrix[3].z*.2+position.y)*sw; transformed.z+=cos(uTime*1.1+instanceMatrix[3].z*.3+position.y)*sw*.7;
   #endif`)}; m.customProgramCacheKey=()=>'sway'+k+'d'+(rock?'r':'');
  if(rock){ const ob=m.onBeforeCompile; const T=Props.rockTex||(Props.rockTex=(()=>{const t=new THREE.TextureLoader().load('/a/ph/rock/rock_face_03_diff_1k.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t})());
   m.onBeforeCompile=sh=>{ ob&&ob(sh); sh.uniforms.rockD={value:T};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRP; varying vec3 vRN;').replace('#include <project_vertex>','#include <project_vertex>\n vec4 rp=vec4(transformed,1.);\n #ifdef USE_INSTANCING\n rp=instanceMatrix*rp;\n #endif\n vRP=(modelMatrix*rp).xyz; vRN=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRP; varying vec3 vRN; uniform sampler2D rockD;').replace('#include <map_fragment>','#include <map_fragment>\n { vec3 bw=pow(abs(normalize(vRN)),vec3(4.)); bw/=dot(bw,vec3(1.)); vec3 rc=texture2D(rockD,vRP.zy/4.).rgb*bw.x+texture2D(rockD,vRP.xz/4.).rgb*bw.y+texture2D(rockD,vRP.xy/4.).rgb*bw.z; diffuseColor.rgb=rc*1.15; }');
   }; }
  return this.mats[key]=m },
 async build(scene,onProg){
  const names=[...new Set(this.list.map(p=>p.m))]; let n=0;
  await Promise.all(names.map(async nm=>{ let g; try{ g=await Assets.load(nm+'.gltf') }catch(e){ console.warn('prop failed',nm); onProg&&onProg(++n,names.length); return } const sc=g.scene; sc.updateMatrixWorld(true); this.tmpl[nm]=sc; this.bbox[nm]=new THREE.Box3().setFromObject(sc); onProg&&onProg(++n,names.length) }));
  const cells=new Map(); const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S=new THREE.Vector3();
  for(const p of this.list){ if(!this.tmpl[p.m])continue; const k=p.m+'|'+Math.floor(p.x/CELL)+'|'+Math.floor(p.z/CELL)+'|'+(p.o.grass?'g':'')+(p.o.sway||0)+(p.o.cast===false?'n':''); let c=cells.get(k); if(!c){c={m:p.m,o:p.o,items:[],cx:Math.floor(p.x/CELL),cz:Math.floor(p.z/CELL)};cells.set(k,c)} c.items.push(p);
   if(p.o.col){ const bb=this.bbox[p.m]; const c0=p.o.col; if(c0.r!==undefined)Colliders.circle(p.x,p.z,c0.r*p.s,p.y-1,p.y+(c0.h||8)); else { // box from bbox
     const cx=(bb.min.x+bb.max.x)/2*p.s,cz=(bb.min.z+bb.max.z)/2*p.s,hx=(bb.max.x-bb.min.x)/2*p.s*(c0.fx||1),hz=(bb.max.z-bb.min.z)/2*p.s*(c0.fz||1); const co=Math.cos(p.ry),si=Math.sin(p.ry); // rotate offset by ry (three: +ry about Y)
     const wx=cx*co+cz*si,wz=-cx*si+cz*co; Colliders.box(p.x+wx,p.z+wz,hx,hz,-p.ry,p.y-0.5,p.y+(c0.h||6)); } } }
  this.cellMeshes=[];
  for(const c of cells.values()){ const sc=this.tmpl[c.m]; const meshes=[]; sc.traverse(o=>{if(o.isMesh)meshes.push(o)});
   for(const mesh of meshes){ const im=new THREE.InstancedMesh(mesh.geometry,this.swayMat(mesh.material,c.o.sway||0,/Rock/.test(c.m)),c.items.length);
    c.items.forEach((p,i)=>{ E.set(p.o.tx||0,p.ry,p.o.tz||0,'YXZ'); Q.setFromEuler(E); V.set(p.x,p.y,p.z); S.setScalar(p.s); M.compose(V,Q,S); M.multiply(mesh.matrixWorld); im.setMatrixAt(i,M); });
    im.instanceMatrix.needsUpdate=true; im.castShadow=c.o.cast!==false&&!c.o.grass; im.receiveShadow=true; im.computeBoundingSphere(); this.group.add(im); if(c.o.grass){im.userData.grass=true; im.userData.cx=(c.cx+0.5)*CELL; im.userData.cz=(c.cz+0.5)*CELL; this.cellMeshes.push(im)} } }
  scene.add(this.group); this.list=[]; },
 update(p,t){ this.timeU.value=t; for(const im of this.cellMeshes){ im.visible=Math.hypot(im.userData.cx-p.x,im.userData.cz-p.z)<85 } },
};
