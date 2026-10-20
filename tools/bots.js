// Bot playthroughs (headless, terrain sim). Critical-path bots A* to every objective and walk it with
// continuous movement + the player's slope rule; random bots wander and must always be able to get home.
// Flags: no progress for 20 s, out of world, unreachable target, trapped random bot.
import {Terrain,HALF,LIMIT} from '../src/terrain.js';
Terrain.bake();
const SPAWN=[0,232];
const PATH=[['rootgate',-34,118],['chapelShrine',92,52],['boss_ashen_knight',96,-4],['barrow',-196,-28],['boss_hollow_king',-196,-60],
 ['ossVest',-164,-100],['boss_orsolt',-104,-100],['summit',0,-176],['boss_stilled_heart',0,-232],['ember',0,232]];
const STEP=2,N=Math.floor(HALF*2/STEP),SLOPE=1.0,PLAYER_SLOPE=1.05,SPEED=5.2,DT=1/30;
const toW=i=>i*STEP-HALF+STEP/2, toG=x=>Math.max(0,Math.min(N-1,Math.floor((x+HALF)/STEP)));
const okCell=(i,j)=>Terrain.slope(toW(i),toW(j))<=SLOPE;
let seed=12345; const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
function astar(x0,z0,x1,z1){
 const si=toG(x0),sj=toG(z0); let ti=toG(x1),tj=toG(z1);
 // snap target to nearest walkable cell
 if(!okCell(ti,tj)){ let best=null,bd=1e9; for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){ const i=ti+a,j=tj+b; if(i>=0&&j>=0&&i<N&&j<N&&okCell(i,j)&&a*a+b*b<bd){bd=a*a+b*b;best=[i,j]} } if(!best)return null; [ti,tj]=best }
 const g=new Float32Array(N*N).fill(1e9),from=new Int32Array(N*N).fill(-1),closed=new Uint8Array(N*N);
 const heap=[]; const push=(f,k)=>{ heap.push([f,k]); let c=heap.length-1; while(c>0){ const p=(c-1)>>1; if(heap[p][0]<=heap[c][0])break; [heap[p],heap[c]]=[heap[c],heap[p]]; c=p } };
 const pop=()=>{ const top=heap[0],last=heap.pop(); if(heap.length){ heap[0]=last; let c=0; for(;;){ const l=2*c+1,r=l+1; let m=c; if(l<heap.length&&heap[l][0]<heap[m][0])m=l; if(r<heap.length&&heap[r][0]<heap[m][0])m=r; if(m===c)break; [heap[m],heap[c]]=[heap[c],heap[m]]; c=m } } return top };
 const s=sj*N+si,t=tj*N+ti; g[s]=0; push(0,s);
 while(heap.length){ const [,k]=pop(); if(closed[k])continue; closed[k]=1; if(k===t)break; const i=k%N,j=(k/N)|0;
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){ const a=i+di,b=j+dj; if(a<0||b<0||a>=N||b>=N)continue; const nk=b*N+a; if(closed[nk])continue; if(!okCell(a,b)){ const rise=(Terrain.h(toW(a),toW(b))-Terrain.h(toW(i),toW(j)))/(STEP*Math.hypot(di,dj)); if(rise>0.3)continue }
   const ng=g[k]+Math.hypot(di,dj); if(ng<g[nk]){ g[nk]=ng; from[nk]=k; push(ng+Math.hypot(a-ti,b-tj),nk) } } }
 if(from[t]<0&&t!==s)return null; const out=[]; for(let k=t;k!==s&&k>=0;k=from[k])out.push([toW(k%N),toW((k/N)|0)]); return out.reverse();
}
// continuous mover with the player's slope rule (blocked if moving uphill onto too-steep ground)
function move(b,dx,dz){ const l=Math.hypot(dx,dz)||1; const nx=b.x+dx/l*SPEED*DT,nz=b.z+dz/l*SPEED*DT;
 const h0=Terrain.h(b.x,b.z),h1=Terrain.h(nx,nz); const rise=(h1-h0)/(SPEED*DT);
 if(rise>PLAYER_SLOPE+0.6&&Terrain.slope(nx,nz)>PLAYER_SLOPE){ // try sliding along each axis
  if(Terrain.slope(nx,b.z)<=PLAYER_SLOPE)b.x=nx; else if(Terrain.slope(b.x,nz)<=PLAYER_SLOPE)b.z=nz; return }
 b.x=Math.max(-LIMIT,Math.min(LIMIT,nx));b.z=Math.max(-LIMIT,Math.min(LIMIT,nz)); }
const oob=b=>!isFinite(Terrain.h(b.x,b.z))||Math.abs(b.x)>HALF-1||Math.abs(b.z)>HALF-1;
let fails=0; const log=(ok,msg)=>{ if(!ok)fails++; console.log((ok?'OK   ':'FAIL ')+msg) };
// 1) critical-path bots: several with jittered spawn
const CP=Number(process.env.CP||6); let totalT=0;
for(let n=0;n<CP;n++){ const b={x:SPAWN[0]+(R()-0.5)*6,z:SPAWN[1]+(R()-0.5)*6}; let t=0,okAll=true;
 for(const [name,tx,tz] of PATH){ const p=astar(b.x,b.z,tx,tz); if(!p){ log(false,`cp${n} no path to ${name}`); okAll=false; break }
  let wi=0,best=1e9,lastProg=t; const limit=t+600;
  while(wi<p.length&&t<limit){ const [wx,wz]=p[wi]; const dx=wx-b.x,dz=wz-b.z; if(Math.hypot(dx,dz)<1.2){wi++;continue}
   move(b,dx,dz); t+=DT; if(oob(b)){ log(false,`cp${n} fell out of world near ${b.x.toFixed(0)},${b.z.toFixed(0)}`); okAll=false; break }
   const d=Math.hypot(tx-b.x,tz-b.z); if(d<best-0.5){best=d;lastProg=t} if(t-lastProg>20){ log(false,`cp${n} no progress 20s toward ${name} at ${b.x.toFixed(0)},${b.z.toFixed(0)}`); okAll=false; break } }
  if(!okAll)break; if(Math.hypot(tx-b.x,tz-b.z)>5){ log(false,`cp${n} ended ${Math.hypot(tx-b.x,tz-b.z).toFixed(0)}m short of ${name}`); okAll=false; break } }
 totalT+=t; if(okAll)log(true,`cp${n} full critical path walked in ${(t/60).toFixed(1)} min`) }
// 2) random-input bots: wander 3 min, then must find a path home (no one-way traps)
const RB=Number(process.env.RB||200); let trapped=0,fell=0;
for(let n=0;n<RB;n++){ const s=PATH[n%PATH.length]; const b={x:s[1]+(R()-0.5)*10,z:s[2]+(R()-0.5)*10}; let a=R()*6.28;
 for(let t=0;t<180;t+=DT){ if(R()<0.02)a+=(R()-0.5)*3; move(b,Math.sin(a),Math.cos(a)); if(oob(b)){fell++;break} }
 if(!oob(b)&&!astar(b.x,b.z,SPAWN[0],SPAWN[1])){ trapped++; if(trapped<=5)console.log(`FAIL random bot ${n} trapped at ${b.x.toFixed(0)},${b.z.toFixed(0)} h=${Terrain.h(b.x,b.z).toFixed(1)}`) } }
log(trapped===0,`${RB} random bots: ${trapped} trapped`); log(fell===0,`${RB} random bots: ${fell} fell out of world`);
console.log(`critical path avg ${(totalT/CP/60).toFixed(1)} min walking`);
process.exit(fails?1:0);
