// Shared mutable game state and tiny event bus. Everything imports G rather than each other to avoid cycles.
export const G={
 player:null, enemies:[], allies:[], projectiles:[], hazards:[], pickups:[], npcs:[],
 boss:null, mode:'boot', // boot|menu|play|dead|paused|summon|rest|cutscene
 time:0, paused:false, flags:{}, // flags: bossesDown etc.
 bus:{},
 on(e,f){(this.bus[e]||(this.bus[e]=[])).push(f)},
 emit(e,a){(this.bus[e]||[]).forEach(f=>f(a))},
};
export const rand=(a,b)=>a+Math.random()*(b-a);
export const dist2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
