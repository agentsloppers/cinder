// Builds the player's realistic full-plate knight: the CC0 "Fullplate Armor Knight" mesh (Luana Coppio / Petr Kratochvil)
// skinned onto the KayKit Rig_Medium skeleton so every existing animation clip drives it.
import {THREE} from './engine.js';
import {Assets} from './assets.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// target rest layout (T-pose local offsets, metres)
const LAYOUT={
 hips:[0,1.08,0], spine:[0,0.12,0], chest:[0,0.17,0], head:[0,0.28,0],
 upperarm:[0.18,0.14,0], lowerarm:[0.294,0,0], wrist:[0.196,0,0], hand:[0.03,0,0],
 upperleg:[0.11,-0.02,0], lowerleg:[0,-0.512,0], foot:[0,-0.47,0], toes:[0,-0.05,0.14],
};
// weights bone mapping from the PSX rig names to kay bone names, Body handled separately
const MAP={Head:'head',UpperArml:'upperarml',LowerArml:'lowerarml',Handl:'handl',UpperArmr:'upperarmr',LowerArmr:'lowerarmr',Handr:'handr',
 UpperLegl:'upperlegl',LowerLegl:'lowerlegl',Footl:'footl',UpperLegr:'upperlegr',LowerLegr:'lowerlegr',Footr:'footr'};

export async function buildKnight(){
 const kay=await Assets.load('chars/Knight.glb'); const plate=await Assets.load('chars/KnightPlate.glb');
 const model=Assets.cloneChar(kay);
 // strip chibi meshes, keep bones
 const kill=[]; let skel=null; model.traverse(o=>{ if(o.isSkinnedMesh){ if(!skel)skel=o.skeleton; kill.push(o) } else if(o.isMesh&&!o.isSkinnedMesh){ kill.push(o) } });
 for(const o of kill) o.parent.remove(o);
 const bones={}; for(const b of skel.bones) bones[b.name]=b;
 const origLocal={}; for(const n in bones) origLocal[n]=bones[n].position.length()||1;
 // set rest transforms
 const set=(n,arr)=>{ if(bones[n]) { bones[n].position.set(...arr); bones[n].quaternion.identity() } };
 set('hips',LAYOUT.hips); set('spine',LAYOUT.spine); set('chest',LAYOUT.chest); set('head',LAYOUT.head);
 for(const s of ['l','r']){ const k=s==='l'?1:-1; const m=a=>[a[0]*k,a[1],a[2]];
  set('upperarm'+s,m(LAYOUT.upperarm)); set('lowerarm'+s,m(LAYOUT.lowerarm)); set('wrist'+s,m(LAYOUT.wrist)); set('hand'+s,m(LAYOUT.hand));
  set('upperleg'+s,m(LAYOUT.upperleg)); set('lowerleg'+s,LAYOUT.lowerleg); set('foot'+s,LAYOUT.foot); set('toes'+s,LAYOUT.toes);
  // hand slot stays where kay put it (weapons are authored for it) but pushed slightly out
  if(bones['handslot'+s]){ const p=bones['handslot'+s].position; bones['handslot'+s].position.set(p.x*0.8,p.y*0.8,p.z*0.8) }
 }
 // animation position-track scale per bone
 const ratio={}; for(const n in bones){ ratio[n]=bones[n].position.length()/origLocal[n]; if(!isFinite(ratio[n])||ratio[n]<=0)ratio[n]=1 }
 ratio.hips=Math.min(ratio.hips,2.2);
 model.updateMatrixWorld(true);
 // bind pose world matrices: T-pose skeleton but arms rotated into A-pose to match the mesh
 const armDir=V(0.17,-0.985,0).normalize();
 const bindWorld={}; // by bone name
 const order=skel.bones;
 // compute bind world via parent chain with arm offset rotations
 const armQ={l:new THREE.Quaternion().setFromUnitVectors(V(1,0,0),armDir), r:new THREE.Quaternion().setFromUnitVectors(V(-1,0,0),V(-armDir.x,armDir.y,0))};
 const armBones={}; for(const s of ['l','r']) for(const p of ['upperarm','lowerarm','wrist','hand','handslot']) armBones[p+s]=s;
 const calc=b=>{ if(bindWorld[b.name])return bindWorld[b.name];
  const local=new THREE.Matrix4(); const q=armBones[b.name]?armQ[armBones[b.name]]:new THREE.Quaternion();
  local.compose(b.position,q,V(1,1,1));
  const parent=b.parent&&bones[b.parent.name]?calc(b.parent):null;
  const w=parent?parent.clone().multiply(local):new THREE.Matrix4().multiplyMatrices(b.parent?b.parent.matrixWorld:new THREE.Matrix4(),local);
  bindWorld[b.name]=w; return w };
 // a local translation under a rotated parent: position vector must be in parent's (rotated) frame; since children of arm
 // bones have their offsets along the T-pose x axis, rotating the chain by armQ at every level would compound the rotation.
 // So apply armQ only to the first arm bone and let children inherit it.
 for(const n in armBones) if(n!=='upperarml'&&n!=='upperarmr') armBones[n]=null;
 for(const b of order) calc(b);
 const inverses=order.map(b=>bindWorld[b.name].clone().invert());
 // mesh geometry from the plate knight with remapped skin weights
 let src=null; plate.scene.traverse(o=>{ if(o.isSkinnedMesh&&!src)src=o });
 const geo=src.geometry.clone(); const psxBones=src.skeleton.bones.map(b=>b.name);
 const idxOf={}; order.forEach((b,i)=>idxOf[b.name]=i);
 const pos=geo.attributes.position, si=geo.attributes.skinIndex, sw=geo.attributes.skinWeight;
 const nsi=new Uint16Array(pos.count*4), nsw=new Float32Array(pos.count*4);
 const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
 for(let v=0;v<pos.count;v++){ const acc={}; const y=pos.getY(v);
  for(let k=0;k<4;k++){ const w=sw.getComponent(v,k); if(w<=0)continue; const pn=psxBones[si.getComponent(v,k)];
   if(pn==='Body'){ const a=1-ss(1.1,1.2,y), c=ss(1.28,1.38,y), s=1-a-c; acc.hips=(acc.hips||0)+w*a; acc.spine=(acc.spine||0)+w*s; acc.chest=(acc.chest||0)+w*c }
   else if(MAP[pn]) acc[MAP[pn]]=(acc[MAP[pn]]||0)+w; }
  let ent=Object.entries(acc).filter(e=>e[1]>0.001&&idxOf[e[0]]!==undefined).sort((a,b)=>b[1]-a[1]).slice(0,4); if(!ent.length)ent=[['hips',1]];
  const tot=ent.reduce((s,e)=>s+e[1],0); ent.forEach((e,k)=>{ nsi[v*4+k]=idxOf[e[0]]; nsw[v*4+k]=e[1]/tot });
 }
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(nsi,4)); geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(nsw,4));
 geo.computeVertexNormals();
 const mat=(Array.isArray(src.material)?src.material[0]:src.material).clone();
 if(mat.map){ mat.map.colorSpace=THREE.SRGBColorSpace; mat.map.anisotropy=4 }
 mat.color=new THREE.Color(0.24,0.23,0.25); mat.roughness=0.5; mat.metalness=0.55; mat.emissive=new THREE.Color(0.02,0.018,0.02); mat.side=THREE.DoubleSide;
 const mesh=new THREE.SkinnedMesh(geo,mat); mesh.castShadow=true; mesh.receiveShadow=true; mesh.frustumCulled=false; mesh.name='KnightPlate';
 const root=skel.bones[0].parent&&!skel.bones[0].parent.isBone?skel.bones[0].parent:model;
 root.add(mesh); mesh.updateMatrixWorld(true);
 mesh.bind(new THREE.Skeleton(order,inverses),new THREE.Matrix4());
 return {model,ratio,mesh};
}

// clone a clip with position tracks rescaled for the new skeleton proportions
export function retargetClip(clip,ratio){
 const c=clip.clone();
 for(const t of c.tracks){ if(!t.name.endsWith('.position'))continue; const bn=t.name.slice(0,-9); const r=ratio[bn]; if(!r||Math.abs(r-1)<1e-3)continue;
  const v=t.values; for(let i=0;i<v.length;i++) v[i]*=r }
 return c;
}
