// The Ossuary Vaults: a walled dungeon built from 6m cells, sunk into the northern hills of the Barrow Deeps.
// Vestibule (shrine) -> corridor -> the Long Nave (ambush hall) -> corridor + fog gate -> the Chancellor's Sanctum.
import {Terrain} from './terrain.js';
const X0=-170, Z0=-100, CS=6;
const rooms={
 vest:{gx:[0,2],gz:[-1,1]},
 c1:{gx:[3,3],gz:[0,0]},
 nave:{gx:[4,7],gz:[-1,1]},
 c2:{gx:[8,8],gz:[0,0]},
 sanct:{gx:[9,13],gz:[-2,2]},
};
export const CRYPT={ x0:X0, z0:Z0, cs:CS, rooms, entry:{x:X0+1*CS,z:Z0+2*CS-3+0,gz:1}, gate:{x:X0+8*CS+3,z:Z0}, sanctum:{x:X0+11*CS,z:Z0}, nave:{x:X0+5.5*CS+3-3,z:Z0}, vest:{x:X0+CS,z:Z0},
 // spawn groups [type,n,cx,cz,r]
 groups:[['husk',3,X0+5*CS,Z0-6,5],['reaver',2,X0+6*CS,Z0+6,5],['caller',2,X0+7*CS,Z0-5,4],['knight',1,X0+6*CS-3,Z0,3],['bulwark',1,X0+4*CS+3,Z0+6,3],['assassin',1,X0+7*CS,Z0+5,3],['husk',2,X0+CS,Z0-8,4]] };
const key=(a,b)=>a+','+b;
export function buildCrypt(L,R){
 const open=new Set(); for(const r of Object.values(rooms))for(let gx=r.gx[0];gx<=r.gx[1];gx++)for(let gz=r.gz[0];gz<=r.gz[1];gz++)open.add(key(gx,gz));
 const cx=gx=>X0+gx*CS, cz=gz=>Z0+gz*CS, H=Terrain.h(X0+3*CS,Z0);
 const y=H;
 const verts=new Set();
 const floors=['floor_tile_large','floor_tile_large','floor_tile_large','floor_tile_large_rocks','floor_tile_big_grate'];
 for(const k of open){ const [gx,gz]=k.split(',').map(Number); const m=floors[Math.floor(R()*floors.length)]; L.P(m,cx(gx),y-0.04,cz(gz),Math.floor(R()*4)*Math.PI/2,1.5,{col:false,cast:false});
  if(R()<0.28) L.P(['rubble_half','floor_tile_small_broken_A','floor_tile_small_weeds_A','floor_tile_small_broken_B'][Math.floor(R()*4)],cx(gx)+(R()-0.5)*3,y,cz(gz)+(R()-0.5)*3,R()*6,1.2,{col:false,cast:false});
  const ent=(gx===1&&gz===1);
  // +x edge
  if(!open.has(key(gx+1,gz))){ wall(cx(gx)+CS/2,cz(gz),Math.PI/2,[cx(gx)+CS/2,cz(gz)-CS/2],[cx(gx)+CS/2,cz(gz)+CS/2]) }
  if(!open.has(key(gx-1,gz))){ wall(cx(gx)-CS/2,cz(gz),Math.PI/2,[cx(gx)-CS/2,cz(gz)-CS/2],[cx(gx)-CS/2,cz(gz)+CS/2]) }
  if(!open.has(key(gx,gz-1))){ wall(cx(gx),cz(gz)-CS/2,0,[cx(gx)-CS/2,cz(gz)-CS/2],[cx(gx)+CS/2,cz(gz)-CS/2]) }
  if(!open.has(key(gx,gz+1))){ if(ent){ doorway(cx(gx),cz(gz)+CS/2) } else wall(cx(gx),cz(gz)+CS/2,0,[cx(gx)-CS/2,cz(gz)+CS/2],[cx(gx)+CS/2,cz(gz)+CS/2]) }
 }
 function wall(x,z,ry,v1,v2){ const m=R()<0.12?'wall_cracked':R()<0.1?'wall_archedwindow_gated':R()<0.12?'wall_arched':'wall'; L.P(m,x,y-0.05,z,ry,1.5,{col:{h:8}}); verts.add(v1.join());verts.add(v2.join()) }
 function doorway(x,z){ // open gap flanked by pillars
  verts.add((x-CS/2)+','+z); verts.add((x+CS/2)+','+z);
 }
 for(const v of verts){ const [x,z]=v.split(',').map(Number); L.P(R()<0.4?'pillar_decorated':'pillar',x,y,z,0,1.5,{col:{r:0.9,h:8}}) }
 // torches along the walls
 const torch=(x,z,ry,c)=>{ L.P('torch_mounted',x,y+2.6,z,ry,1.6,{cast:false}); L.torches.push({x:x,y:y+3,z:z,c}) };
 for(let gx=0;gx<=2;gx+=2){ torch(cx(gx),cz(-1)-CS/2+0.9,0,0xff8a3a) }
 torch(cx(0)-CS/2+0.9,cz(0),Math.PI/2,0xff8a3a);
 for(let gx=4;gx<=7;gx++){ torch(cx(gx),cz(-1)-CS/2+0.9,0,0xff7a30); torch(cx(gx),cz(1)+CS/2-0.9,Math.PI,0xff7a30) }
 torch(cx(3),cz(0)-CS/2+0.9,0,0x70c0ff); torch(cx(8),cz(0)-CS/2+0.9,0,0x70c0ff);
 for(let gx=9;gx<=13;gx+=2){ torch(cx(gx),cz(-2)-CS/2+0.9,0,0x70a8ff); torch(cx(gx),cz(2)+CS/2-0.9,Math.PI,0x70a8ff) }
 for(let gz=-2;gz<=2;gz+=2) torch(cx(13)+CS/2-0.9,cz(gz),-Math.PI/2,0x70a8ff);
 // nave dressing: long tables and shelves of bones, kegs, rubble: cover for dodging
 for(const gx of [4,5,6,7]){ for(const sz of [-1,1]){ if(R()<0.8) L.P(R()<0.5?'table_long_broken':'table_long_decorated_A',cx(gx)+(R()-0.5)*1.5,y,cz(0)+sz*3.4,Math.PI/2*(R()<0.5?0:0)+0,1.2,{col:{h:2,fx:0.9,fz:0.9}}) } }
 for(const gx of [4,6]) L.P('shelf_large',cx(gx)+1,y,cz(-1)-CS/2+1.1,0,1.4,{col:{h:4}});
 for(let i=0;i<7;i++) L.P(['keg','keg_decorated','rubble_large','stool'][Math.floor(R()*4)],cx(4)+R()*4*CS,y,cz(-1)+(R()-0.5)*14,R()*6,1.2,{col:{r:0.5,h:2}});
 // vestibule shrine
 L.shrine('ossuary','Ossuary Threshold',cx(1),cz(0),R);
 // sanctum: ring of columns, a dais, banners, and an ossuary altar of pillars
 const sx=cx(11), sz=cz(0);
 for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+0.4; const px=sx+Math.cos(a)*11,pz=sz+Math.sin(a)*11; L.P('pillar_decorated',px,y,pz,-a,1.5,{col:{r:0.9,h:8}}) }
 for(let i=0;i<5;i++) L.P('banner_shield_red',cx(9+i)-0,y+1.2,cz(-2)-CS/2+0.9,0,1.8,{cast:false});
 for(let i=0;i<6;i++){ const a=R()*6.28,d=5+R()*8; L.P(['rubble_large','rubble_half','sword_shield_broken','floor_tile_small_broken_A'][Math.floor(R()*4)],sx+Math.cos(a)*d,y,sz+Math.sin(a)*d,R()*6,1.3,{col:false}) }
 L.P('table_long_decorated_C',cx(13)-1.6,y,cz(0),Math.PI/2,1.6,{col:{h:2}});
 L.gates.push({id:'ossuaryGate',x:cx(8)+CS/2,z:cz(0),y,w:6,boss:'ossuary_chancellor',ry:Math.PI/2});
 // the entrance gets a lit torch pair outside
 for(const dx of [-5,5]) { L.P('torch_lit',cx(1)+dx,Terrain.h(cx(1)+dx,cz(1)+CS/2+2),cz(1)+CS/2+2,0,2.4,{cast:false}); L.torches.push({x:cx(1)+dx,y:y+2.5,z:cz(1)+CS/2+2,c:0xff8a3a}) }
}
