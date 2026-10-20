// CINDER entry: boot, main loop, shrines, death/stain, menus.
import {THREE,Engine} from './engine.js';
import {Assets} from './assets.js';
import {Terrain} from './terrain.js';
import {Level} from './level.js';
import {Props} from './props.js';
import {FX,Floaters} from './fx.js';
import {Projectiles} from './projectiles.js';
import {Input} from './input.js';
import {Audio} from './audio.js';
import {G} from './state.js';
import {Save} from './save.js';
import './player_move.js'; import './player_combat.js'; import './enemy_ai.js';
import {createPlayer} from './player.js';
import {Cam} from './camera.js';
import {World} from './world.js';
import {UI} from './ui.js';

const $=id=>document.getElementById(id);
const canvas=$('c');
let P=null, started=false, saveT=0, deadT=0, lastShrine=null;
const prog=(t,n,m)=>{ $('lt').textContent=t; $('lbar').style.width=(100*n/m)+'%' };

async function boot(){
  Engine.init(canvas); Input.init(canvas); Input.wantLock=false; G.cam=Cam; UI.init(); Floaters.init($('ui'));
  Save.load();
  prog('Raising the land…',1,8); await tick();
  Terrain.build(Engine.scene);
  Level.generate(); prog('Placing ruins…',2,8); await tick();
  await Props.build(Engine.scene,(n,m)=>prog('Placing ruins…',2+n/m,8));
  FX.init(Engine.scene); Projectiles.init(Engine.scene);
  prog('Teaching the dead to move…',4,8); await Assets.loadAnims();
  P=createPlayer(); G.player=P; await P.init(Engine.scene);
  prog('Waking the ashen…',5,8);
  World.setupGates(Engine.scene); World.setupLights(Engine.scene);
  await World.spawnAll(Engine.scene,(n,m)=>prog('Waking the ashen…',5+3*n/m,8));
  Level.shrines.forEach(s=>s.name=s.name||s.id);
  $('load').style.display='none';
  G.mode='menu'; Engine.grade.fade.value=0;
  showTitle();
  requestAnimationFrame(loop);
  window.__cinder={G,P,Save,Cam,Engine,UI,Level,World};
}
const tick=()=>new Promise(r=>setTimeout(r,0));

function showTitle(){
  UI.hudShow(false); G.mode='menu';
  UI.title(()=>{ Save.wipe(); begin(false) },()=>begin(true),Save.has());
  // idle orbit camera around the Ember shrine
  const s=Level.shrines.find(s=>s.id==='ember')||Level.shrines[0]; G.titleShrine=s;
}
function applySave(){
  const S=Save.d; P.stats={...S.stats}; P.cinders=S.cinders||0; P.owned={...S.owned}; P.refine=S.refine; P.weaponId=S.weaponId||'oathblade'; P.deaths=S.deaths||0;
}
async function begin(cont){
  Audio.init(); Audio.resume(); Audio.startMusic&&Audio.startMusic();
  if(!cont) Save.wipe(); else Save.load();
  applySave(); await P.equip(P.weaponId);
  const S=Save.d; lastShrine=Level.shrines.find(s=>s.id===S.shrine)||Level.shrines[0];
  for(const [k,v] of Object.entries(S.flags||{}))G.flags[k]=v;
  for(const e of World.enemies){ if(e.boss&&G.flags[e.def.flag]){ e.hidden=true; e.alive=false; e.root.visible=false } }
  const sx=lastShrine.x, sz=lastShrine.z+(cont?4:0);
  if(cont) P.respawn(sx,sz,0); else { P.respawn(0,232,Math.PI); }
  P.hp=P.maxHp; Cam.init(P); UI.close(); UI.hudShow(true); G.mode='play'; Input.wantLock=true;
  if(S.stain){ placeStain(S.stain) } 
  UI.fade(0,900);
  if(!cont) setTimeout(()=>UI.bannerShow('CINDER','The land remembers the oath. Follow the light.'),600);
  canvas.focus(); canvas.requestPointerLock?.();
}
function placeStain(s){ G.stain=s; World.stain.visible=true; World.stain.position.set(s.x,Terrain.h(s.x,s.z),s.z) }
function saveGame(){ const S=Save.d; S.stats={...P.stats}; S.cinders=Math.floor(P.cinders); S.weaponId=P.weaponId; S.deaths=P.deaths; S.flags={...G.flags}; S.shrine=lastShrine?lastShrine.id:'ember'; S.stain=G.stain||null; Save.write() }

function nearestShrine(){ let b=null,bd=1e9; for(const s of Level.shrines){ const d=Math.hypot(s.x-P.x,s.z-P.z); if(d<bd){bd=d;b=s} } return {s:b,d:bd} }
function restAt(s){
  Audio.play('shrine'); UI.fade(0.0,300);
  lastShrine=s; Save.d.found[s.id]=1; P.hp=P.maxHp; P.st=P.maxSt; P.fp=P.maxFp; P.flasks=P.maxFlasks;
  for(const e of World.enemies){ if(!e.hidden) e.reset() } Projectiles.clear(); P.lock=null; G.boss=null;
  saveGame(); openHub(s);
}
function openHub(shrine,tab){
  G.mode='rest'; Input.wantLock=false;
  UI.hub({P,shrine,shrines:Level.shrines,tab,onClose:()=>{ UI.close(); saveGame(); G.mode='play'; Input.wantLock=true; canvas.requestPointerLock?.() },
    onWarp:s=>{ UI.close(); lastShrine=s; P.respawn(s.x,s.z+4,0); Cam.snap(P); for(const e of World.enemies){ if(!e.hidden)e.reset() } saveGame(); G.mode='play'; Input.wantLock=true; canvas.requestPointerLock?.() }});
}

G.on('playerDied',()=>{
  const S=Save.d; deadT=0; G.mode='dead';
  const amt=Math.floor(P.cinders); if(amt>0||G.stain){ G.stain={x:P.x,z:P.z,amt:amt+(0)}; if(amt===0&&S.stain)G.stain=S.stain; placeStain(G.stain) }
  P.cinders=0; saveGame(); UI.diedScreen(true);
});
G.on('bossDown',e=>{ UI.bannerShow('ENEMY FELLED',e.name,'felled'); Audio.play('boss_down'); P.cinders+=e.def.cinders||2000; Save.d.embers+=e.def.embers||12; saveGame(); });
G.on('kill',e=>{ Save.d.kills=(Save.d.kills||0)+1 });

function interactCheck(){
  const {s,d}=nearestShrine(); G.nearInteract=null;
  if(P.state==='free'&&!P.dead&&d<3.8){ G.nearInteract={label:'Rest at '+s.name,use:()=>{ P.startInteract('Interact',1.0); setTimeout(()=>restAt(s),700) }} }
  UI.prompt(G.nearInteract?`<b>E</b> ${G.nearInteract.label}`:'');
  const st=G.stain; if(st&&!P.dead&&Math.hypot(st.x-P.x,st.z-P.z)<2.4){ P.cinders+=st.amt; UI.toast('Cinders recovered: '+st.amt,'#ffd27a'); Audio.play('pickup'); G.stain=null; World.stain.visible=false; Save.d.stain=null; saveGame() }
}

let last=performance.now(), tAcc=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=Math.min(0.05,(now-last)/1000); last=now;
  Input.poll();
  if(G.mode==='menu'){
    const s=G.titleShrine; tAcc+=dt; const a=tAcc*0.12; Engine.camera.position.set(s.x+Math.sin(a)*16,s.y+5.5,s.z+Math.cos(a)*16); Engine.camera.lookAt(s.x,s.y+2.5,s.z);
    World.update(dt,tAcc,{x:s.x,y:s.y,z:s.z}); Terrain.update(Engine.camera.position); Props.update(Engine.camera.position,tAcc); Engine.followSun({x:s.x,y:s.y,z:s.z});
    Engine.render(dt); Input.endFrame(); return;
  }
  if(G.mode==='play'||G.mode==='dead'){
    if(Input.pressed.menu&&G.mode==='play'){ openHub(null) }
    else if(Input.pressed.summon&&G.mode==='play'){ openHub(null,'summon') }
  }
  if(G.mode==='play'||G.mode==='dead'||G.mode==='rest'){
    const ts=FX.timeScale(dt); const sdt=G.mode==='rest'?0:dt*ts; G.time+=sdt;
    if(G.mode!=='rest'){
      Cam.update(sdt||0.0001,P);
      P.update(sdt,Cam.yaw);
      for(const e of G.enemies) e.update(sdt,P);
      Projectiles.update(sdt);
      if(G.mode==='play') interactCheck();
      if(G.mode==='dead'){ deadT+=dt; if(deadT>3.2&&!G.respawning){ G.respawning=true; UI.fade(1,500); setTimeout(()=>{ UI.diedScreen(false); const s=lastShrine; for(const e of World.enemies){ if(!e.hidden)e.reset() } Projectiles.clear(); G.boss=null; P.respawn(s.x,s.z+4,0); Cam.snap(P); UI.fade(0,900); G.mode='play'; G.respawning=false },900) } }
    }
    FX.update(sdt); Floaters.update(dt,Engine.camera); World.update(sdt,G.time,P); Terrain.update(P); Props.update(P,G.time);
    UI.update(dt,P,Engine.camera); Engine.followSun(P);
    Engine.grade.hurt.value=Math.min(0.8,P.hurtFlash*2);
    Engine.grade.desat.value+= ((P.dead?0.6:0)-Engine.grade.desat.value)*Math.min(1,dt*3);
    saveT+=dt; if(saveT>20&&G.mode==='play'){ saveT=0; saveGame() }
  }
  Engine.render(dt); Input.endFrame();
}
addEventListener('error',e=>{ const b=$('err'); if(b){ b.style.display='block'; b.textContent='Error: '+(e.message||e)+' — please report at /bug/' } });
boot();
