// Minimap: circular, rotates with the camera. Roads, bonfires, bosses, nearby hostile enemies, area name.
import {PATHS,AREAS,areaAt,FLATS} from './terrain.js';
import {Level} from './level.js';
import {World} from './world.js';
const S=150, RANGE=70; // px, world units radius shown
export const Minimap={
 init(parent){
  const w=document.createElement('div'); w.id='minimap';
  w.style.cssText='position:absolute;top:14px;right:14px;width:'+S+'px;pointer-events:none;font:600 11px Cinzel,Georgia,serif;color:#e8d9b8;text-align:center;text-shadow:0 1px 2px #000;z-index:5';
  this.c=document.createElement('canvas'); this.c.width=this.c.height=S*2; this.c.style.cssText='width:'+S+'px;height:'+S+'px;border-radius:50%;border:2px solid #6a5a3a;box-shadow:0 0 14px #000a,inset 0 0 20px #000;background:#120d0a';
  this.n=document.createElement('div'); this.n.style.cssText='margin-top:5px;letter-spacing:2px;text-transform:uppercase;opacity:.85';
  w.appendChild(this.c); w.appendChild(this.n); parent.appendChild(w); this.g=this.c.getContext('2d'); this.t=0; this.area='';
 },
 update(dt,P,cam){
  this.t+=dt; if(this.t<0.06)return; this.t=0;
  const g=this.g, K=S/RANGE; // canvas is 2x so scale = S (2*S/2/RANGE)
  const a=areaAt(P.x,P.z); const nm=a?a.name:'The Wilds'; if(nm!==this.area){ this.area=nm; this.n.textContent=nm }
  const d=cam.getWorldDirection(new cam.position.constructor()); const yaw=Math.atan2(d.x,d.z);
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,S*2,S*2);
  g.save(); g.translate(S,S); g.beginPath(); g.arc(0,0,S-2,0,6.283); g.clip(); g.fillStyle='#17110d'; g.fillRect(-S,-S,S*2,S*2);
  g.rotate(yaw+Math.PI); // camera forward points up
  const sc=S/RANGE, px=(x)=>(x-P.x)*sc, pz=(z)=>(z-P.z)*sc;
  // area tint
  for(const ar of AREAS){ g.fillStyle='rgba(120,90,60,.10)'; g.beginPath(); g.arc(px(ar.x),pz(ar.z),ar.r*sc,0,6.283); g.fill() }
  g.strokeStyle='rgba(190,150,90,.55)'; g.lineWidth=5; g.lineJoin='round';
  for(const pa of PATHS){ g.beginPath(); pa.forEach(([x,z],i)=>{ i?g.lineTo(px(x),pz(z)):g.moveTo(px(x),pz(z)) }); g.stroke() }
  for(const f of FLATS){ g.fillStyle='rgba(190,150,90,.25)'; g.beginPath(); g.arc(px(f.x),pz(f.z),f.r*sc,0,6.283); g.fill() }
  for(const s of Level.shrines){ const x=px(s.x),z=pz(s.z); g.fillStyle='#ffb347'; g.shadowColor='#ff8a2a'; g.shadowBlur=10; g.beginPath(); g.moveTo(x,z-9); g.lineTo(x+6,z); g.lineTo(x,z+9); g.lineTo(x-6,z); g.closePath(); g.fill(); g.shadowBlur=0 }
  for(const e of World.enemies){ if(!e.alive||e.hidden)continue; const dx=e.x-P.x,dz=e.z-P.z; if(dx*dx+dz*dz>RANGE*RANGE*0.9)continue;
   if(e.boss){ g.fillStyle='#ff3030'; g.beginPath(); g.arc(px(e.x),pz(e.z),9,0,6.283); g.fill(); g.strokeStyle='#fff'; g.lineWidth=2; g.stroke() }
   else if(e.aggroed||dx*dx+dz*dz<30*30){ g.fillStyle=e.def&&e.def.elite?'#ff7a3a':'#d84a4a'; g.beginPath(); g.arc(px(e.x),pz(e.z),e.def&&e.def.elite?6:4,0,6.283); g.fill() } }
  if(World.stain&&World.stain.visible){ g.fillStyle='#ffd27a'; g.beginPath(); g.arc(px(World.stain.position.x),pz(World.stain.position.z),6,0,6.283); g.fill() }
  g.restore();
  // player arrow (always up)
  g.save(); g.translate(S,S); g.fillStyle='#fff'; g.beginPath(); g.moveTo(0,-10); g.lineTo(7,8); g.lineTo(0,4); g.lineTo(-7,8); g.closePath(); g.fill(); g.restore();
  g.strokeStyle='rgba(0,0,0,.6)'; g.lineWidth=3; g.beginPath(); g.arc(S,S,S-3,0,6.283); g.stroke();
 },
};
