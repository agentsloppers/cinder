// Procedural + hand-placed content for the world: forests, rocks, grass, ruins, shrines.
import {Terrain,FLATS,pathD,HALF,SIZE} from './terrain.js';
import {Props} from './props.js';
import {mulberry,fbm,smooth,clamp} from './noise.js';

const F='forest/', D='dun/';
const TREES=['Tree_1_A','Tree_1_B','Tree_1_C','Tree_2_A','Tree_2_B','Tree_2_C','Tree_2_D','Tree_3_A','Tree_3_B','Tree_4_A','Tree_4_B','Tree_4_C'].map(n=>F+n+'_Color1');
const BARE=['Tree_Bare_1_A','Tree_Bare_1_B','Tree_Bare_1_C','Tree_Bare_2_A','Tree_Bare_2_B','Tree_Bare_2_C'].map(n=>F+n+'_Color1');
const ROCKS=['Rock_1_A','Rock_1_C','Rock_1_E','Rock_1_G','Rock_1_J','Rock_2_A','Rock_2_C','Rock_2_E','Rock_3_A','Rock_3_C','Rock_3_E','Rock_3_H','Rock_3_K','Rock_3_N'].map(n=>F+n+'_Color1');
const BUSH=['Bush_1_A','Bush_1_C','Bush_2_A','Bush_2_C','Bush_3_A','Bush_4_A','Bush_4_C'].map(n=>F+n+'_Color1');
const GRASS=['Grass_1_A','Grass_1_B','Grass_1_C','Grass_2_A','Grass_2_B','Grass_2_C'].map(n=>F+n+'_Color1');

import {CHESTS} from './chests.js';
export const Level={ shrines:[], gates:[], torches:[], chests:[], spawns:[], decor:[],
 nearFlat(x,z,pad=0){ for(const f of FLATS){ if(Math.hypot(x-f.x,z-f.z)<f.r+pad) return f } return null },
 generate(){
  const R=mulberry(77); const pick=a=>a[Math.floor(R()*a.length)];
  // forests, rocks, bushes, grass
  for(let gz=-HALF+4;gz<HALF-4;gz+=6.5)for(let gx=-HALF+4;gx<HALF-4;gx+=6.5){
   const x=gx+(R()-0.5)*5.5,z=gz+(R()-0.5)*5.5; const h=Terrain.h(x,z),sl=Terrain.slope(x,z); const pd=pathD(x,z);
   if(this.nearFlat(x,z,10)||pd<4.5||h>58)continue; const f=fbm(x/60+11,z/60-4,3);
   const dist232=Math.hypot(x,z-232);
   let dens=smooth(-0.12,0.25,f); if(dist232<70)dens*=0.35; if(z<-140)dens*=0.3;
   if(R()<dens && sl<0.75){ const bare=Math.hypot(x-96,z-16)<85||h>45||R()<0.12; const m=bare?pick(BARE):pick(TREES); const s=(bare?2.4:2.1)+R()*1.3; Props.place(m,x,h-0.15,z,R()*6.28,s,{sway:bare?0.5:1,col:{r:0.42,h:12}}) }
   else if(R()<0.16||sl>0.7&&R()<0.5){ const s=3.2+R()*5; const m=pick(ROCKS); Props.place(m,x,h-0.3,z,R()*6.28,s,{col:{r:0.4,h:4},tx:(R()-0.5)*0.3,tz:(R()-0.5)*0.3}) }
  }
  for(let gz=-HALF+3;gz<HALF-3;gz+=2.1)for(let gx=-HALF+3;gx<HALF-3;gx+=2.1){ const x=gx+(R()-0.5)*2,z=gz+(R()-0.5)*2; const h=Terrain.h(x,z); if(h>50||pathD(x,z)<2.2||Terrain.slope(x,z)>0.6)continue; const f=fbm(x/22,z/22,2); const near=this.nearFlat(x,z,4);
   if(near&&near.id==='chapel'&&R()<0.7)continue; if(R()<0.34+f*0.3) Props.place(pick(GRASS),x,h,z,R()*6.28,1.6+R()*1.4,{grass:true,sway:0.8,cast:false}) }
  for(let i=0;i<260;i++){ const x=(R()-0.5)*(SIZE-20),z=(R()-0.5)*(SIZE-20); const h=Terrain.h(x,z); if(this.nearFlat(x,z,6)||pathD(x,z)<3)continue; Props.place(pick(BUSH),x,h,z,R()*6.28,3+R()*2,{sway:0.6,cast:false}) }
  this.ember(R); this.chapel(R); this.waypoints(R); this.arenas(R);
 },
 arenas(R){ // Barrow Deeps and Summit approaches: bonfires at the road ends, ruined boss rings around Gorrad and Vael
  this.shrine('barrow','Barrow Mouth',-196,-28,R);
  this.shrine('summit','Foot of the Stilled Heart',0,-176,R);
  const ring=(cx,cz,rad,n,gap,pil,tc)=>{ for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad; const gp=Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap))); if(gp<0.38)continue; if(Terrain.slope(x,z)>0.8)continue; const h=Terrain.h(x,z);
    const r=R(); const m=r<0.45?pil:r<0.7?'wall_broken':r<0.85?'column':'rubble_large'; this.P(m,x,h-0.2,z,-a+Math.PI/2,1.5,{col:{r:1.1,h:6}});
    if(i%3===0){ this.P('torch_lit',x*0.96+cx*0.04,h+1.6,z*0.96+cz*0.04,0,2.4,{cast:false}); this.torches.push({x:x,y:h+3,z:z,c:tc}) } } };
  ring(-196,-60,24,22,Math.PI/2,'pillar_decorated',0xff6a2a);
  ring(0,-232,28,26,Math.PI/2,'pillar',0xa070ff);
  this.treasure(R);
 },
 treasure(R){ // hidden chests, each in a little ruin on the flattest ground nearby
  for(const c of CHESTS){ let b={x:c.x,z:c.z,s:9}; for(let r=0;r<=14;r+=2)for(let a=0;a<6.28;a+=0.5){ const x=Math.round(c.x+Math.cos(a)*r),z=Math.round(c.z+Math.sin(a)*r); const s=Terrain.slope(x,z); if(s<b.s-0.02&&Terrain.h(x,z)>-0.5)b={x,z,s} }
   const y=Terrain.h(b.x,b.z), ry=R()*6.28; this.P('floor_tile_large',b.x,y-0.05,b.z,ry,1.4); this.P('chest_gold',b.x,y,b.z,ry,1.6,{col:{r:0.9,h:1.2}});
   for(let i=0;i<3;i++){ const a=ry+i*2.1+0.6, x=b.x+Math.cos(a)*3.2, z=b.z+Math.sin(a)*3.2; this.P(i===0?'column':i===1?'rubble_large':'wall_broken',x,Terrain.h(x,z)-0.15,z,R()*6,1.5,i===0?{col:{r:1,h:5}}:{}) }
   this.P('torch_lit',b.x+Math.cos(ry+3)*2,y+1.2,b.z+Math.sin(ry+3)*2,0,2.2,{cast:false}); this.torches.push({x:b.x,y:y+3,z:b.z,c:0xffc27a});
   this.chests.push({...c,x:b.x,z:b.z,y}) } },
 P(m,x,y,z,ry=0,s=1,o={}){ Props.place(D+m,x,y,z,ry,s,o) },
 // checkpoint: ring of pillars around a flame
 shrine(id,name,x,z,R,opt={}){ const y=Terrain.h(x,z); const n=6,rad=5.2; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+0.3; const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad; if(R()<0.8){ this.P(R()<0.5?'pillar':'pillar_decorated',px,Terrain.h(px,pz),pz,-a+Math.PI/2,1,{col:{r:0.9,h:5}}) } else this.P('rubble_half',px,Terrain.h(px,pz),pz,R()*6,1.6) }
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; const px=x+Math.cos(a)*2.2,pz=z+Math.sin(a)*2.2; this.P('floor_tile_small',px,y,pz,-a,0.6) }
  this.P('floor_tile_large',x,y-0.05,z,0.2,1.3); this.shrines.push({id,name,x,z,y,...opt}); },
 ember(R){ // starting hollow
  const x=0,z=232; this.shrine('ember','First Ember',x,z,R,{start:true});
  for(let i=0;i<5;i++){ const a=R()*6.28,d=9+R()*10; const px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d; this.P(pick2(R,['barrel_small','barrel_large','crates_stacked','box_small','rubble_large','trunk_small_A']),px,Terrain.h(px,pz),pz,R()*6.28,1.4,{col:{r:0.7,h:2}}) }
  // broken gate arch on the road north
  for(const sx of [-1,1]) this.P('pillar_decorated',sx*5.5,Terrain.h(sx*5.5,196),196,0,1.5,{col:{r:1.2,h:7}});
  this.P('wall_arched',0,Terrain.h(0,196)+4.8,196,0,1.5,{cast:true});
  for(const s of [[-12,150],[10,138],[-24,128],[16,98]]){ this.P('banner_shield_red',s[0],Terrain.h(s[0],s[1])-0.2,s[1],R()*6,1.5); }
 },
 waypoints(R){ this.shrine('rootgate','Rootgate Bonfire',-34,118,R); },
 // Sunken Chapel of Vael — boss arena
 chapel(R){ const cx=96,cz=16,y=9.0; const W=(m,x,z,ry,o={})=>this.P(m,cx+x,y,cz+z,ry,1,{col:'box',...o});
  // floor
  for(let i=-3;i<=2;i++)for(let j=-5;j<=3;j++){ const m=R()<0.2?'floor_tile_large_rocks':'floor_tile_large'; this.P(m,cx+i*4+2,y+0.02,cz+j*4+2,0,1) }
  // side walls (x=±12), rear wall (z=-20); front wall z=20 with doorway
  for(let k=0;k<10;k++){ const z=-18+k*4; const bro=R()<0.18; const m=bro?'wall_broken':(R()<0.25?'wall_arched':'wall'); W(m,-12,z+0.0,Math.PI/2,{col:{h:4}}); W(R()<0.15?'wall_broken':R()<0.25?'wall_archedwindow_open':'wall',12,z,-Math.PI/2,{col:{h:4}}) }
  for(let k=-2;k<=2;k++){ W(R()<0.3?'wall_broken':'wall',k*4,-20,Math.PI,{col:{h:4}}) }
  W('wall',-10,20,0,{col:{h:4}}); W('wall',-6,20,0,{col:{h:4}}); W('wall_doorway',-2,20,0,{col:false}); W('wall_doorway_sides',2,20,0,{col:false}); W('wall',6,20,0,{col:{h:4}}); W('wall_broken',10,20,0,{col:{h:4}});
  // door collider handled by the fog gate; add pillars flanking
  this.P('pillar_decorated',cx-3.8,y,cz+20,0,1.3,{col:{r:1.1,h:6}}); this.P('pillar_decorated',cx+3.8,y,cz+20,0,1.3,{col:{r:1.1,h:6}});
  // interior columns
  for(const sx of [-6,6])for(let k=0;k<4;k++){ const z=-14+k*8; this.P('pillar',cx+sx,y,cz+z,0,1.1,{col:{r:1.0,h:5}}) }
  // dais and altar at rear
  this.P('stairs_wide',cx,y,cz-12,Math.PI,1.1,{col:false}); this.P('table_long_decorated_A',cx,y+0.2,cz-17,0,1.2,{col:{r:0.5,h:1}});
  for(let i=0;i<6;i++){ const x=cx-9+R()*18,z=cz-18+R()*34; this.P(pick2(R,['rubble_half','rubble_large','floor_tile_small_broken_A','bottle_A_brown','candle_triple','barrel_small_stack']),x,y,z,R()*6,1,{col:false}) }
  for(const [x,z,r] of [[-11.2,-6,Math.PI/2],[11.2,-6,-Math.PI/2],[-11.2,10,Math.PI/2],[11.2,10,-Math.PI/2]]){ this.P('torch_mounted',cx+x,y+2.4,cz+z,r,1.5,{cast:false}); this.torches.push({x:cx+x*0.9,y:y+3,z:cz+z,c:0xff8a3a}) }
  for(const [x,z] of [[-3.5,22],[3.5,22]]){ this.P('torch_lit',cx+x*1.0,y+1.6,cz+z,0,2.4,{cast:false}); this.torches.push({x:cx+x,y:y+2.5,z:cz+z,c:0xff8a3a}) }
  for(const x of [-8,-4,0,4,8]) this.P('banner_patternA_red',cx+x,y+0.4,cz-19.4,0,1.5,{cast:false});
  // courtyard south of door: broken walls and stairs up the plateau
  this.P('stairs_wide',cx,y-2.5,cz+27,0,1.3,{col:false});
  for(let i=0;i<9;i++){ const a=R()*6.28,d=14+R()*20; const x=cx+Math.cos(a)*d*1.2,z=cz+Math.sin(a)*d; if(Math.abs(x-cx)<13&&Math.abs(z-cz)<22)continue; const h=Terrain.h(x,z); this.P(pick2(R,['rubble_large','rubble_half','pillar','column','wall_broken','barrier']),x,h,z,R()*6,1.2,{col:{r:1,h:3}}) }
  this.gates.push({id:'chapelGate',x:cx,z:cz+20,y,w:7,boss:'ashen_knight',ry:0});
  this.shrine('chapelShrine','Chapel Steps',cx-4,cz+36,R);
 },
};
function pick2(R,a){return a[Math.floor(R()*a.length)]}
