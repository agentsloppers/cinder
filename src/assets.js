import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SU from 'three/examples/jsm/utils/SkeletonUtils.js';
import clipinfo from './data/clipinfo.json';
export {clipinfo};
const loader=new GLTFLoader(); const cache={};
const A='/a/';
export const Assets={clips:{},models:{},texLoader:new THREE.TextureLoader(),
 load(url){ return cache[url]||(cache[url]=new Promise((res,rej)=>loader.load(A+url,res,undefined,rej))) },
 async model(url){ const g=await this.load(url); return g },
 // clone a skinned character
 cloneChar(g){ const s=SU.clone(g.scene); return s },
 async loadAnims(onProg){ const names=['CombatMelee','CombatRanged','General','MovementBasic','MovementAdvanced','Special'];
  let n=0; await Promise.all(names.map(async nm=>{const g=await this.load('anim/Rig_Medium_'+nm+'.glb'); for(const c of g.animations){ if(c.name!=='T-Pose'){this.clips[c.name]=c} } onProg&&onProg(++n,names.length)})); },
 // static (non-skinned) model: returns Object3D template
 async prop(url){ const g=await this.load(url); return g.scene },
};
// Fix material look for all KayKit models: use their atlas texture, flat shading style retained, tweak for lit scene
export function stylize(root,{emissive=0,rough=0.9}={}){ root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; const ms=Array.isArray(o.material)?o.material:[o.material]; for(const m of ms){ if(m.map){m.map.anisotropy=4; m.map.colorSpace=THREE.SRGBColorSpace} m.roughness=rough; m.metalness=0.05; if(m.isMeshStandardMaterial&&emissive){m.emissive=new THREE.Color(emissive)} } } }) }
