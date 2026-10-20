// Anonymous play telemetry: position samples, deaths, stuck moments. No ids, no cookies.
import {Input} from './input.js';
const sid=Math.random().toString(36).slice(2,10); let buf=[], t=0, pushT=0, lx=0,lz=0,still=0, flushT=0;
export const Tele={
 send(type,data){ buf.push({t:Date.now(),type,d:data}); if(buf.length>40)this.flush() },
 sample(P,dt){ t+=dt; flushT+=dt; if(Math.hypot(Input.axisX||0,Input.axisY||0)>0.3)pushT+=dt;
  if(t>=4){ t=0; const mv=Math.hypot(P.x-lx,P.z-lz); this.send('pos',[Math.round(P.x),Math.round(P.z),Math.round(P.y)]);
   const pushing=pushT>2.5; pushT=0;
   if(mv<0.5&&pushing&&!P.dead&&!P.inCombat){ still+=1; if(still===2)this.send('stuck',[Math.round(P.x),Math.round(P.z)]) } else still=0; lx=P.x;lz=P.z }
  if(flushT>30){ flushT=0; this.flush() } },
 flush(){ if(!buf.length)return; const body=JSON.stringify({sid,ev:buf}); buf=[]; try{ navigator.sendBeacon?navigator.sendBeacon('/api/tele',body):fetch('/api/tele',{method:'POST',body,keepalive:true}) }catch(e){} }
};
addEventListener('pagehide',()=>{ Tele.send('quit'); Tele.flush() });
