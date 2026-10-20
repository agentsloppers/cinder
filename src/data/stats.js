// Player attributes and levelling. The currency is CINDERS (dropped on death, recoverable).
export const STATS=['vig','end','str','dex','res'];
export const STAT_NAMES={vig:'Vigor',end:'Endurance',str:'Strength',dex:'Dexterity',res:'Resolve'};
export const STAT_DESC={vig:'Raises maximum health.',end:'Raises maximum stamina and equip burden.',str:'Heavy weapons hit harder.',dex:'Light weapons hit harder; faster casting.',res:'Raises focus and the strength of spells and spirits.'};
export const START_STATS={vig:10,end:10,str:10,dex:10,res:8};
export function levelOf(s){ return STATS.reduce((a,k)=>a+s[k],0)-48 }
export function cinderCost(level){ return Math.round(40+ Math.pow(level,1.55)*9 ) }
export const maxHp=s=>Math.round(260+(s.vig-10)*34+Math.max(0,s.vig-30)*20);
export const maxSt=s=>Math.round(90+(s.end-10)*3.6);
export const maxFp=s=>Math.round(40+(s.res-8)*6);
export const stBonus=(w,s)=>{ // scaling bonus to weapon attack
 const sc=w.sc||{}; return (sc.str||0)*(s.str-10)*1.6+(sc.dex||0)*(s.dex-10)*1.6+(sc.res||0)*(s.res-8)*2.1 };
