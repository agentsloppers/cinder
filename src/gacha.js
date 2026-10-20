// Gacha engine: pity, 50/50, duplicates upgrade what you own. Embers only (earned in-game).
import {G} from './state.js';
import {POOL,RATES,COST,BANNER_BY_ID,SPIRIT_BY_ID} from './data/gacha.js';
import {WEAPON_BY_ID} from './data/weapons.js';
import {Save} from './save.js';
export const MAX_REFINE=5;
const pick=a=>a[Math.floor(Math.random()*a.length)];
function pityOf(S,id){ return S.pity[id]||(S.pity[id]={n5:0,n4:0,lost:false,total:0}) }
export const Gacha={
 cost(n){ return COST*n },
 info(bid){ const S=Save.d,p=pityOf(S,bid); const toHard=RATES.hard-p.n5; return {...p,toHard,rate5:this.rate5(p.n5),soft:RATES.soft} },
 rate5(n){ return Math.min(1,RATES.five+(n+1>=RATES.soft?(n+1-RATES.soft+1)*RATES.softBoost:0)) },
 roll(bid){
  const S=Save.d,p=pityOf(S,bid),B=BANNER_BY_ID[bid]; p.n5++; p.n4++; p.total++; S.pulls=(S.pulls||0)+1;
  let r=3; const x=Math.random();
  if(p.n5>=RATES.hard||x<this.rate5(p.n5-1))r=5; else if(p.n4>=RATES.guar4||x<this.rate5(p.n5-1)+RATES.four)r=4;
  let item;
  if(r===5){ p.n5=0; p.n4=0; const feat=B.featured.map(id=>POOL[5].find(i=>i.id===id)).filter(Boolean);
   if(feat.length&&(p.lost||Math.random()<0.5)){ item=pick(feat); p.lost=false; item={...item,featured:true} }
   else{ const off=POOL[5].filter(i=>!B.featured.includes(i.id)); item=pick(off.length?off:POOL[5]); if(feat.length)p.lost=true } }
  else if(r===4){ p.n4=0; item=pick(POOL[4]) } else item=pick(POOL[3]);
  return {...item,r,bid};
 },
 grant(it){ const S=Save.d; const res={...it,dup:false,rank:0,refund:0};
  if(it.type==='weapon'){ const w=WEAPON_BY_ID[it.id]; res.def=w; if(!S.owned[it.id]){ S.owned[it.id]=1; S.refine[it.id]=0; res.isNew=true }
   else{ res.dup=true; if((S.refine[it.id]||0)<MAX_REFINE){ S.refine[it.id]=(S.refine[it.id]||0)+1 } else res.refund=it.r===5?4:it.r===4?2:1; res.rank=S.refine[it.id] } }
  else{ const sp=SPIRIT_BY_ID[it.id]; res.def=sp; if(S.spirits[it.id]==null){ S.spirits[it.id]=0; res.isNew=true; if(!S.spiritEq)S.spiritEq=it.id }
   else{ res.dup=true; if(S.spirits[it.id]<MAX_REFINE)S.spirits[it.id]++; else res.refund=it.r===5?4:it.r===4?2:1; res.rank=S.spirits[it.id] } }
  if(res.refund)S.embers+=res.refund; return res },
 pull(bid,n){ const S=Save.d; if(S.embers<COST*n)return null; S.embers-=COST*n; const out=[]; for(let i=0;i<n;i++)out.push(this.grant(this.roll(bid))); Save.write(); G.emit('pulled',out); return out },
};
