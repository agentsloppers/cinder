// DOM UI: HUD, title, rest menu (level / equip / summon / spirits / warp), pause, credits, banners.
import {G} from './state.js';
import {Save} from './save.js';
import {Gacha,MAX_REFINE} from './gacha.js';
import {BANNERS,SPIRITS,SPIRIT_BY_ID,COST,RATES} from './data/gacha.js';
import {WEAPONS,WEAPON_BY_ID,RARITY} from './data/weapons.js';
import {STATS,STAT_NAMES,STAT_DESC,levelOf,cinderCost} from './data/stats.js';
import {Audio} from './audio.js';
import {Engine} from './engine.js';
import {Minimap} from './minimap.js';
const $=id=>document.getElementById(id);
const h=(t,c,html)=>{const e=document.createElement(t); if(c)e.className=c; if(html!=null)e.innerHTML=html; return e};
const STAR=r=>'★'.repeat(r||1);
const RC={0:'#9a9a9a',3:'#7fb4ff',4:'#c58bff',5:'#ffb347'};
const CLS_GLYPH={sword:'⚔',greatsword:'🗡',dagger:'🔪',axe:'🪓',hammer:'🔨',spear:'🔱',staff:'🪄',fist:'👊'};
const fmt=n=>Math.floor(n).toLocaleString();
export const UI={
 init(){
  this.root=$('ui'); this.hud=$('hud'); this.menu=$('menu'); this.msgT=0;
  this.el={hp:$('hpf'),hpg:$('hpg'),st:$('stf'),fp:$('fpf'),fl:$('flasks'),cin:$('cinders'),emb:$('embers'),prompt:$('prompt'),banner:$('banner'),boss:$('boss'),bossn:$('bossn'),bosst:$('bosst'),bossf:$('bossf'),lock:$('lock'),spirit:$('spirit'),toast:$('toast'),hurt:$('hurtfx'),eb:$('ebar'),ebf:$('ebf'),ebn:$('ebn'),wpn:$('wpn')};
  this.hpShown=1; Minimap.init(this.hud);
 },
 hudShow(v){ this.hud.style.display=v?'block':'none' },
 toast(t,col){ const e=this.el.toast; e.textContent=t; e.style.color=col||'#e8d9b8'; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on') },
 bannerShow(text,sub,cls=''){ const b=this.el.banner; b.className='banner '+cls; b.innerHTML=`<div class="bt">${text}</div>${sub?`<div class="bs">${sub}</div>`:''}`; void b.offsetWidth; b.classList.add('on') },
 prompt(t){ this.el.prompt.style.opacity=t?1:0; if(t)this.el.prompt.innerHTML=t },
 update(dt,P,cam){ Minimap.update(dt,P,cam);
  const e=this.el; const hp=P.hp/P.maxHp; this.hpShown+=(hp-this.hpShown)*Math.min(1,dt*3);
  e.hp.style.width=Math.max(0,hp*100)+'%'; e.hpg.style.width=Math.max(0,this.hpShown*100)+'%'; $('hpbar').style.width=Math.min(520,P.maxHp*0.9)+'px';
  e.st.style.width=Math.max(0,P.st/P.maxSt*100)+'%'; $('stbar').style.width=Math.min(460,P.maxSt*2.6)+'px';
  e.fp.style.width=Math.max(0,P.fp/P.maxFp*100)+'%'; $('fpbar').style.width=Math.min(300,P.maxFp*2.2)+'px';
  e.fl.textContent='⚗ '+P.flasks+'/'+P.maxFlasks; e.cin.textContent=fmt(P.cinders); e.emb.textContent=Save.d.embers;
  e.hurt.style.opacity=Math.min(0.9,P.hurtFlash*2.2+(hp<0.25?0.25*(1-hp*4):0));
  const sp=SPIRIT_BY_ID[Save.d.spiritEq]; e.spirit.style.display=sp?'flex':'none';
  if(sp){ e.spirit.innerHTML=`<span class="si" style="color:${RC[sp.r]}">${sp.icon}</span><span class="sn">${sp.name}<br><small>[1] ${sp.fp} FP</small></span><i style="width:${P.spiritCd>0?100*P.spiritCd/sp.cd:0}%"></i>` }
  e.wpn.textContent=P.weapon.name+(Save.d.refine[P.weapon.id]?' +'+Save.d.refine[P.weapon.id]:'');
  // boss bar
  const b=G.boss; const showB=b&&b.engaged&&b.alive; e.boss.style.opacity=showB?1:0; if(showB){ e.bossn.textContent=b.name; e.bosst.textContent=b.def.title||''; e.bossf.style.width=Math.max(0,b.hp/b.maxHp*100)+'%' }
  // lock-on marker + target bar
  const t=P.lock; if(t&&t.alive){ const v=new Engine.camera.position.constructor(t.x,t.y+t.h*0.62,t.z).project(Engine.camera); const vis=v.z<1; e.lock.style.opacity=vis?1:0; e.lock.style.transform=`translate(${(v.x*0.5+0.5)*innerWidth}px,${(-v.y*0.5+0.5)*innerHeight}px)`;
   if(!t.boss){ e.eb.style.opacity=1; e.ebn.textContent=t.name; e.ebf.style.width=Math.max(0,t.hp/t.maxHp*100)+'%' } else e.eb.style.opacity=0 }
  else{ e.lock.style.opacity=0; e.eb.style.opacity=0 }
 },
 // ---------- menus ----------
 open(node){ this.menu.innerHTML=''; this.menu.appendChild(node); this.menu.style.display='flex'; document.exitPointerLock?.() },
 close(){ this.menu.style.display='none'; this.menu.innerHTML='' },
 title(onStart,onContinue,hasSave){
  const n=h('div','panel title',`<div class="logo">CINDER</div><div class="tag">An action RPG of ash, oaths and a stopped heart</div>
   <div class="btns">${hasSave?'<button id="b_cont">Continue</button>':''}<button id="b_new">${hasSave?'New Game':'Begin'}</button><button id="b_ctrl">Controls</button><button id="b_cred">Credits</button></div>
   <div class="fine">Demo build · by Cinder, an AI studio of one · <a href="/devlog/" target="_blank">devlog</a> · <a href="/bug/" target="_blank">report a bug</a> · <a href="/lub-dub/" target="_blank">LUB-DUB</a></div>`);
  this.open(n);
  const c=n.querySelector('#b_cont'); if(c)c.onclick=onContinue; n.querySelector('#b_new').onclick=()=>{ if(hasSave&&!confirm('Erase your save and start over?'))return; onStart() };
  n.querySelector('#b_ctrl').onclick=()=>this.controls(()=>this.title(onStart,onContinue,hasSave)); n.querySelector('#b_cred').onclick=()=>this.credits(()=>this.title(onStart,onContinue,hasSave));
 },
 controls(back){
  const n=h('div','panel',`<h2>Controls</h2><table class="ctl"><tr><td>Move</td><td>WASD / Left stick</td></tr><tr><td>Camera</td><td>Mouse / Right stick</td></tr><tr><td>Light attack</td><td>Left click / RB</td></tr><tr><td>Heavy attack</td><td>Right click / RT</td></tr><tr><td>Roll (i-frames) · Sprint (hold)</td><td>Space / B</td></tr><tr><td>Block · Parry (tap just before a hit)</td><td>Shift / LB</td></tr><tr><td>Lock on · switch</td><td>Q or Middle click · Tab</td></tr><tr><td>Flask of Ashwine</td><td>R / Y</td></tr><tr><td>Spirit</td><td>1 or C / LT</td></tr><tr><td>Interact / rest</td><td>E or F / A</td></tr><tr><td>Summon · Menu</td><td>G · Esc</td></tr></table>
   <p class="dim">Enemies telegraph: a glow and a wind-up before each strike. Roll through it, or block and parry the moment it lands. A staggered enemy can be riposted. Don't button-mash: stamina is life.</p><div class="btns"><button id="bk">Back</button></div>`);
  this.open(n); n.querySelector('#bk').onclick=back; },
 async credits(back){
  let txt='Loading…'; try{ txt=await (await fetch('/a/CREDITS.md')).text() }catch(e){ txt='Credits unavailable.' }
  const n=h('div','panel',`<h2>Credits</h2><p class="dim">CINDER is designed, written and built by Cinder, an autonomous AI. Art, animation and sound by the following artists, used under their licences:</p><pre class="cred"></pre><div class="btns"><button id="bk">Back</button></div>`);
  n.querySelector('.cred').textContent=txt; this.open(n); n.querySelector('#bk').onclick=back; },
 // ----- rest / pause menu with tabs -----
 hub(ctx){ // ctx={P,shrine,onClose,onWarp,tab}
  this.ctx=ctx; const tabs=[['level','Attributes'],['equip','Arsenal'],['summon','Summon'],['spirit','Spirits']]; if(ctx.shrine)tabs.push(['warp','Travel']); tabs.push(['sys','System']);
  const n=h('div','hub',`<div class="hubhead"><div class="hubt">${ctx.shrine?ctx.shrine.name:'Paused'}</div><div class="cur"><span class="cc">◆ <b id="hc">${fmt(ctx.P.cinders)}</b> cinders</span><span class="ce">✹ <b id="he">${Save.d.embers}</b> embers</span></div></div><div class="tabs">${tabs.map(t=>`<button data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div class="tabbody" id="tb"></div><div class="hubfoot"><button id="hclose">${ctx.shrine?'Leave the Grace':'Resume'}</button></div>`);
  this.open(n); this.hubEl=n;
  n.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>this.tab(b.dataset.t));
  n.querySelector('#hclose').onclick=()=>{ this.close(); ctx.onClose&&ctx.onClose() };
  this.tab(ctx.tab||'level'); },
 refreshCur(){ const a=$('hc'),b=$('he'); if(a)a.textContent=fmt(this.ctx.P.cinders); if(b)b.textContent=Save.d.embers },
 tab(t){ this.curTab=t; this.hubEl.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t)); const tb=$('tb'); tb.innerHTML=''; this['t_'+t](tb); this.refreshCur(); Audio.play('ui') },
 t_level(tb){ const P=this.ctx.P; const lvl=levelOf(P.stats),cost=cinderCost(lvl);
  tb.innerHTML=`<div class="lv"><div class="lvbig">Level <b>${lvl}</b></div><div class="dim">Next level costs <b>${fmt(cost)}</b> cinders</div></div><div class="stats">${STATS.map(k=>`<div class="stat"><div><b>${STAT_NAMES[k]}</b> <span class="sv">${P.stats[k]}</span><div class="dim">${STAT_DESC[k]}</div></div><button data-k="${k}" ${P.cinders<cost?'disabled':''}>+</button></div>`).join('')}</div>
   <div class="derived">HP <b>${P.maxHp}</b> · Stamina <b>${P.maxSt}</b> · Focus <b>${P.maxFp}</b> · Weapon attack <b>${Math.round(P.weapon.atk*(1+0.09*(Save.d.refine[P.weapon.id]||0)))}</b></div>
   <div class="trade"><button id="tr" ${P.cinders<500?'disabled':''}>Offer 500 cinders to the flame → 1 ember</button><div class="dim">Embers fuel the Summoning. Bosses and fallen elites also leave embers.</div></div>`;
  tb.querySelectorAll('.stat button').forEach(b=>b.onclick=()=>{ const l=levelOf(P.stats),c=cinderCost(l); if(P.cinders<c)return; P.cinders-=c; P.stats[b.dataset.k]++; const f=P.maxHp; P.hp=Math.min(P.maxHp,P.hp+34); Save.d.stats={...P.stats}; Save.write(); this.tab('level'); Audio.play('flask') });
  tb.querySelector('#tr').onclick=()=>{ if(P.cinders<500)return; P.cinders-=500; Save.d.embers++; Save.write(); this.tab('level') } },
 t_equip(tb){ const P=this.ctx.P; const owned=WEAPONS.filter(w=>Save.d.owned[w.id]);
  const grid=h('div','wgrid'); owned.sort((a,b)=>b.r-a.r).forEach(w=>{ const rf=Save.d.refine[w.id]||0; const c=h('div','wcard'+(P.weaponId===w.id?' eq':''),`<div class="wg" style="color:${RC[w.r]}">${CLS_GLYPH[w.cls]||'⚔'}</div><div><b style="color:${RC[w.r]}">${w.name}</b>${rf?` <span class="ref">+${rf}</span>`:''}<div class="dim">${w.cls} · ATK ${Math.round(w.atk*(1+0.09*rf))} · ${RARITY[w.r].n}</div></div>`); c.onclick=async()=>{ await P.equip(w.id); P.weaponId=w.id; Save.d.weaponId=w.id; Save.write(); this.tab('equip') }; c.onmouseenter=()=>{ $('wdesc').innerHTML=`<b style="color:${RC[w.r]}">${w.name}</b> <span class="dim">${STAR(w.r)}</span><p>${w.desc}</p><div class="dim">Scales: ${Object.entries(w.sc||{}).map(([k,v])=>k.toUpperCase()+' '+(v>=.8?'A':v>=.5?'B':'C')).join(' · ')}</div>` }; grid.appendChild(c) });
  tb.appendChild(grid); tb.appendChild(h('div','wdesc dim','Hover a weapon to read its legend. Click to wield. Pull duplicates to refine (+9% attack each, max +5).')).id='wdesc'; },
 t_spirit(tb){ const S=Save.d; const own=SPIRITS.filter(s=>S.spirits[s.id]!=null); if(!own.length){ tb.innerHTML='<p class="dim">You have bound no spirits. Open the Summoning.</p>'; return }
  const g=h('div','wgrid'); own.sort((a,b)=>b.r-a.r).forEach(s=>{ const rk=S.spirits[s.id]; const c=h('div','wcard'+(S.spiritEq===s.id?' eq':''),`<div class="wg" style="color:${RC[s.r]}">${s.icon}</div><div><b style="color:${RC[s.r]}">${s.name}</b> <span class="ref">R${rk}</span><div class="dim">${s.desc}</div><div class="dim">${s.fp} FP · ${s.cd}s cooldown</div><div class="lore">${s.lore}</div></div>`); c.onclick=()=>{ S.spiritEq=s.id; Save.write(); this.tab('spirit') }; g.appendChild(c) }); tb.appendChild(g); },
 t_warp(tb){ const S=Save.d; const g=h('div','wgrid'); (this.ctx.shrines||[]).filter(s=>S.found[s.id]).forEach(s=>{ const c=h('div','wcard'+(this.ctx.shrine&&this.ctx.shrine.id===s.id?' eq':''),`<div class="wg">🔥</div><div><b>${s.name}</b><div class="dim">${s.id==='ember'?'Cinderfall Hollow':s.id==='rootgate'?'The Gloamwood':'Sunken Chapel'}</div></div>`); c.onclick=()=>{ this.close(); this.ctx.onWarp&&this.ctx.onWarp(s) }; g.appendChild(c) }); tb.appendChild(g) },
 journeyPrompt(n,go){ const w=h('div','jp',`<div style="max-width:520px;text-align:center;padding:34px;border:1px solid #6a5a3a;background:rgba(12,8,6,.94);box-shadow:0 0 60px #000"><div style="letter-spacing:4px;color:#d9b25f;font-size:12px">THE HEART IS STILLED</div><h2 style="font:600 30px Cinzel,Georgia,serif;margin:10px 0;color:#efe2c4">Begin Journey ${n+1}?</h2><p class="dim" style="line-height:1.6">The ash settles, and the land forgets that you were here. Every boss and every chest returns. Enemies gain ${Math.round(60*n)}% vigour and ${Math.round(35*n)}% cruelty, and pay ${Math.round(50*n)}% more cinders. You keep your level, weapons, spirits and embers.</p><div class="btns" style="justify-content:center;gap:12px;margin-top:18px"><button id="jy">Begin Journey ${n+1}</button><button id="jn">Remain in this world</button></div><div class="dim" style="margin-top:10px;font-size:12px">You can begin it later from any bonfire (System tab).</div></div>`);
  w.style.cssText='position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)'; (document.getElementById('ui')||document.body).appendChild(w);
  if(document.exitPointerLock)document.exitPointerLock(); const G0=window.__cinder&&window.__cinder.G; const pm=G0&&G0.mode; if(G0)G0.mode='menu';
  const done=()=>{ w.remove(); if(G0)G0.mode=pm==='menu'?'play':pm||'play' };
  w.querySelector('#jy').onclick=()=>{ done(); go() }; w.querySelector('#jn').onclick=done },
 t_sys(tb){ tb.innerHTML=`<div class="btns col"><button id="sc">Credits</button><button id="sk">Controls</button><button id="su">Unstuck (return to last bonfire)</button>${Save.d.flags&&Save.d.flags['stilled_heart']?'<button id="sn">Begin Journey '+((Save.d.ng||0)+2)+'</button>':''}<button id="sg">Save & return to title</button><label class="dim"><input type="range" id="vol" min="0" max="100" value="${Math.round((Audio.vol?.master??0.8)*100)}"> Master volume</label><div class="dim">Playtime ${Math.floor((Save.d.playtime||0)/60)} min · deaths ${Save.d.deaths} · kills ${Save.d.kills} · summons ${Save.d.pulls}</div><div class="dim"><a href="/bug/" target="_blank">Report a bug</a></div></div>`;
  tb.querySelector('#sc').onclick=()=>this.credits(()=>this.hub(this.ctx)); tb.querySelector('#sk').onclick=()=>this.controls(()=>this.hub(this.ctx)); const sn=tb.querySelector('#sn'); if(sn)sn.onclick=()=>{ this.close(); this.ctx.onJourney&&this.ctx.onJourney() }; tb.querySelector('#su').onclick=()=>{ this.close(); this.ctx.onUnstuck&&this.ctx.onUnstuck() }; tb.querySelector('#sg').onclick=()=>{ Save.write(); location.reload() }; tb.querySelector('#vol').oninput=e=>{ try{Audio.setVol('master',e.target.value/100)}catch(x){} } },
 // ----- gacha -----
 sel:'std',
 t_summon(tb){ const S=Save.d; const B=BANNERS.find(b=>b.id===this.sel)||BANNERS[0]; const inf=Gacha.info(B.id);
  tb.innerHTML=`<div class="banners">${BANNERS.map(b=>`<button class="bn ${b.id===B.id?'on':''}" data-b="${b.id}" style="--a:${b.colA};--b:${b.colB}"><b>${b.name}</b><small>${b.sub}</small></button>`).join('')}</div>
   <div class="bhero" style="background:linear-gradient(135deg,${B.colA},${B.colB})"><div class="bart">${B.limited?'<span>❖</span>':'<span>🔥</span>'}</div><div class="binfo"><h3>${B.name}</h3><p>${B.blurb}</p>
    ${B.featured.length?`<div class="feat">Rate-up: ${B.featured.map(id=>{const it=SPIRIT_BY_ID[id]||WEAPON_BY_ID[id]; return `<b style="color:${RC[5]}">★5 ${it.name}</b>`}).join(' · ')}</div>`:''}
    <div class="pity"><div>Heartforged pity <b>${inf.n5}</b> / ${RATES.hard} <small>(rate ${(inf.rate5*100).toFixed(1)}% · soft pity from ${RATES.soft})</small></div><div class="pbar"><i style="width:${inf.n5/RATES.hard*100}%"></i></div><div class="dim">Ashen (★4) guaranteed within ${RATES.guar4} pulls: ${inf.n4}/${RATES.guar4}${B.limited?(inf.lost?' · <b style="color:#ffb347">next ★5 is guaranteed featured</b>':' · 50/50 for the featured ★5'):''}</div></div></div></div>
   <div class="pullrow"><button class="pull" id="p1" ${S.embers<COST?'disabled':''}>Summon ×1<br><small>✹ ${COST}</small></button><button class="pull big" id="p10" ${S.embers<COST*10?'disabled':''}>Summon ×10<br><small>✹ ${COST*10}</small></button></div>
   <div class="dim">Summoning uses embers earned by playing. There is no purchase of any kind. Duplicates refine your weapons (+9% atk, to +5) and rank up spirits. Maxed duplicates return embers.</div>`;
  tb.querySelectorAll('.bn').forEach(b=>b.onclick=()=>{ this.sel=b.dataset.b; this.tab('summon') });
  tb.querySelector('#p1').onclick=()=>this.doPull(B.id,1); tb.querySelector('#p10').onclick=()=>this.doPull(B.id,10); },
 doPull(bid,n){ const out=Gacha.pull(bid,n); if(!out)return; Audio.play('reveal'); this.reveal(out,()=>{ this.tab('summon') }); },
 reveal(items,done){
  let i=0; const best=Math.max(...items.map(x=>x.r)); const ov=h('div','reveal r'+best); document.body.appendChild(ov);
  const next=()=>{ if(i>=items.length){ ov.remove(); done&&done(); if(items.length>1)this.summary(items); return }
   const it=items[i++]; const d=it.def; const isW=it.type==='weapon'; Audio.play(it.r>=5?'bossdie':it.r>=4?'roar':'ui');
   ov.className='reveal r'+it.r; ov.innerHTML=`<div class="rays"></div><div class="rcard r${it.r}"><div class="rglyph">${isW?(CLS_GLYPH[d.cls]||'⚔'):d.icon}</div><div class="rstar">${STAR(it.r)}</div><div class="rname">${d.name}</div><div class="rtype">${isW?d.cls+' · weapon':'spirit'}${it.featured?' · FEATURED':''}</div><div class="rdesc">${isW?d.desc:d.desc}</div><div class="rflag">${it.isNew?'NEW':it.refund?'MAX · +'+it.refund+' embers':'Duplicate · '+(isW?'refine +':'rank ')+it.rank}</div></div><div class="rhint">click to continue (${i}/${items.length}) · space to skip all</div>`; };
  ov.onclick=next; const k=e=>{ if(e.code==='Space'){ i=items.length; next(); removeEventListener('keydown',k) } if(!document.body.contains(ov))removeEventListener('keydown',k) }; addEventListener('keydown',k); next(); },
 summary(items){ const ov=h('div','reveal sum'); ov.innerHTML=`<div class="sumgrid">${items.map(it=>`<div class="sc r${it.r}"><div>${it.type==='weapon'?(CLS_GLYPH[it.def.cls]||'⚔'):it.def.icon}</div><small>${STAR(it.r)}</small><b>${it.def.name}</b>${it.isNew?'<em>NEW</em>':''}</div>`).join('')}</div><div class="rhint">click to close</div>`; ov.onclick=()=>ov.remove(); document.body.appendChild(ov) },
 diedScreen(show){ const d=$('died'); d.classList.toggle('on',!!show) },
 fade(v,ms=600){ const f=$('fade'); f.style.transition=`opacity ${ms}ms`; f.style.opacity=v },
};
