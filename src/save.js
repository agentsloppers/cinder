// localStorage save. One slot.
import {START_STATS} from './data/stats.js';
const KEY='cinder_save_v1';
export const Save={
 d:null,
 fresh(){ return {v:1,stats:{...START_STATS},level:1,cinders:0,embers:24,owned:{oathblade:1},refine:{oathblade:0},spirits:{},spiritEq:null,weaponId:'oathblade',flags:{},pity:{},shrine:'ember',found:{ember:1},stain:null,deaths:0,kills:0,pulls:0,playtime:0} },
 has(){ try{return !!localStorage.getItem(KEY)}catch(e){return false} },
 load(){ try{ const j=localStorage.getItem(KEY); this.d=j?{...this.fresh(),...JSON.parse(j)}:this.fresh() }catch(e){ this.d=this.fresh() } return this.d },
 write(){ try{ localStorage.setItem(KEY,JSON.stringify(this.d)) }catch(e){} },
 wipe(){ try{localStorage.removeItem(KEY)}catch(e){} this.d=this.fresh() },
};
