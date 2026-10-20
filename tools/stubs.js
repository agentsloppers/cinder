// Catch-all stand-ins for rendering/audio modules so real game logic runs in Node.
const deep=()=>{ const f=function(){}; return new Proxy(f,{get:(t,k)=>{ if(k===Symbol.toPrimitive)return ()=>0; if(k==='then')return undefined; if(k==='length')return 0; if(!(k in t))t[k]=deep(); return t[k] },set:(t,k,v)=>{t[k]=v;return true},apply:()=>deep(),construct:()=>deep()}) };
export const THREE=deep(); export const Engine=deep();
export const Assets={clips:{},load:async()=>deep(),cloneChar:()=>deep()}; export const stylize=()=>{}; export const clipinfo={};
export const FX=deep(); export const Floaters=deep(); export const Audio=deep();
export const buildKnight=()=>deep(); export const retargetClip=()=>deep();
export const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
