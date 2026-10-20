// Combat sim: real enemy AI (enemy.js/enemy_ai.js/enemy_attacks.js) vs a scripted duelist, headless.
// Per enemy type & boss: must engage, land hits, be killable, stay finite (no NaN), never freeze, bosses reach every phase.
import {Terrain} from '../src/terrain.js';
import {G} from '../src/state.js';
import {Enemy} from '../src/enemy.js';
import '../src/enemy_ai.js';
import {ENEMY_TYPES,BOSS_TYPES} from '../src/data/enemies.js';
import {THREE} from './stubs.js';
import {Projectiles} from '../src/projectiles.js';
Projectiles.scene=THREE.Scene();
Terrain.bake();
const DT=1/30; let fails=0; const rows=[];
const isNum=v=>typeof v==='number'&&isFinite(v);
function duel(type,boss,style){
 G.enemies.length=0; G.flags=G.flags||{}; G.scene=G.scene||THREE.Scene();
 const d=boss?BOSS_TYPES[type]:ENEMY_TYPES[type]; const ax=d.arena?d.arena.x:0, az=d.arena?d.arena.z:200;
 let e; try{ e=new Enemy(type,ax,az,{boss}) }catch(err){ return {err:'ctor '+err.message} }
 e.mixer=THREE.AnimationMixer(); e.actions={}; e.root=THREE.Group(); e.model=THREE.Group(); G.enemies.push(e);
 if(e.state==='dormant'&&!d.sleeper)e.state='idle';
 const P={x:ax,z:az+8,y:Terrain.h(ax,az+8),r:0.45,vx:0,vz:0,dead:false,hp:900000,hitsTaken:0,dmgTaken:0,blocked:0,dodged:0,iframes:0,blocking:false,
  hurt(info){ if(this.iframes>0){this.dodged++;return {dodged:true}} if(this.blocking&&!info.unblockable){this.blocked++;return {blocked:true}} this.hitsTaken++; this.dmgTaken+=info.dmg||0; return {hit:true} }};
 G.player=P; let atkCd=0,t=0,lastState='',stateT=0,maxStateT=0,phases=new Set([0]),nan=false,errs='',firstHit=-1,attacks=0;
 const LIMIT=boss?400:200;
 while(t<LIMIT&&e.alive){
  t+=DT; P.iframes-=DT; atkCd-=DT;
  // duelist: approach to ~2.2m, attack on cooldown; style 'dodge' rolls when enemy is winding up, 'block' raises guard
  const dx=e.x-P.x,dz=e.z-P.z,dist=Math.hypot(dx,dz); const want=e.r+1.6;
  if(dist>want){ P.x+=dx/dist*5*DT; P.z+=dz/dist*5*DT }
  P.y=Terrain.h(P.x,P.z);
  const winding=e.state==='attack';
  P.blocking=style==='block'&&winding;
  if(style==='dodge'&&winding&&P.iframes<-0.6&&Math.random()<0.15)P.iframes=0.4;
  if(dist<want+0.8&&atkCd<=0&&!(style!=='tank'&&winding)){ atkCd=1.1; attacks++; try{ e.hurt({dmg:45,poise:28,x:P.x,z:P.z,crit:false,src:P}) }catch(err){ errs=errs||'hurt '+err.message } }
  try{ e.update(DT,P) }catch(err){ errs=errs||'update '+err.message+' @'+(err.stack||'').split('\n')[1]; break }
  if(e.boss)phases.add(e.phase);
  if(!isNum(e.x)||!isNum(e.z)||!isNum(e.hp)){ nan=true; break }
  if(P.hitsTaken>0&&firstHit<0)firstHit=t;
  if(e.state===lastState){ stateT+=DT; maxStateT=Math.max(maxStateT,stateT) } else { lastState=e.state; stateT=0 }
 }
 const np=boss?d.phases.length:1;
 const issues=[];
 if(errs)issues.push(errs); if(nan)issues.push('NaN position/hp');
 if(e.alive)issues.push(`not killed in ${LIMIT}s (hp ${Math.round(e.hp)}/${e.maxHp})`);
 if(style==='tank'&&P.hitsTaken===0&&t>10)issues.push('never hit the player');
 if(boss&&phases.size<np)issues.push(`phases ${phases.size}/${np}`);
 if(maxStateT>25&&lastState!=='dead')issues.push(`frozen in state ${lastState} ${maxStateT.toFixed(0)}s`);
 return {t:t.toFixed(0),hits:P.hitsTaken,dmg:Math.round(P.dmgTaken),blk:P.blocked,ddg:P.dodged,firstHit:firstHit.toFixed(1),attacks,issues};
}
const types=[...Object.keys(ENEMY_TYPES).map(k=>[k,false]),...Object.keys(BOSS_TYPES).map(k=>[k,true])];
for(const [k,b] of types)for(const style of ['tank','dodge','block']){
 const r=duel(k,b,style); if(r.err){ fails++; console.log('FAIL',k,style,r.err); continue }
 const bad=r.issues.length>0; if(bad)fails++;
 console.log(`${bad?'FAIL':'ok  '} ${(b?'BOSS ':'')+k} [${style}] ${r.t}s hitsTaken=${r.hits} dmg=${r.dmg} blocked=${r.blk} dodged=${r.ddg} firstHit=${r.firstHit}s ${r.issues.join('; ')}`);
}
console.log(fails?`combat sim: ${fails} FAIL`:'combat sim: all duels pass'); process.exit(fails?1:0);
