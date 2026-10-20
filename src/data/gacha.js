// Gacha data: spirits, banners, rates. Runs ONLY on Embers earned in-game. No real money, no crypto, ever.
import {WEAPONS} from './weapons.js';
export const SPIRITS=[
 {id:'ember_wisp',name:'Ember Wisp',r:3,fp:14,cd:6,icon:'✦',kind:'burst',power:70,rad:7,desc:'A candle-flame that remembers being a pyre. Bursts outward, scorching all near.',lore:'Every pilgrim who died holding a lantern left one behind. It does not know it is dead.'},
 {id:'ash_hound',name:'Ashen Hound',r:3,fp:16,cd:8,icon:'🐺',kind:'dash',power:95,rad:9,desc:'Lunges from the dark at your lock-on target, or the nearest foe, and rends it.',lore:'Never fed, never named. It followed the funeral procession of a king and has not stopped.'},
 {id:'lantern_moth',name:'Lantern Moth',r:3,fp:22,cd:14,icon:'🦋',kind:'heal',power:0.28,desc:'Its dust knits flesh. Restores a quarter of your health over a few breaths.',lore:'It circles flames the way you circle memory.'},
 {id:'hollow_choir',name:'Hollow Choir',r:3,fp:18,cd:18,icon:'♪',kind:'stam',power:60,desc:'A hymn of the unburied. Your stamina floods back and regenerates faster for a time.',lore:'Nine voices, none of them with throats.'},
 {id:'gravewarden',name:'Gravewarden Shade',r:4,fp:26,cd:20,icon:'🛡',kind:'ward',power:0.5,dur:10,desc:'A tower-shield of grey vapour. You take half damage for ten seconds.',lore:'It guarded the Vigil\'s gate for four hundred years and cannot be convinced the gate is gone.'},
 {id:'thorn_stag',name:'Thorn Stag',r:4,fp:28,cd:16,icon:'🦌',kind:'burst',power:150,rad:10,poise:120,desc:'The antlered god of the Gloamwood charges through. Heavy damage and shatters poise.',lore:'The wood was not haunted. It was the stag, and the stag was grieving.'},
 {id:'mourning_crow',name:'Mourning Crow',r:4,fp:24,cd:22,icon:'🐦',kind:'buff',power:0.3,dur:18,desc:'It carries the last words of the fallen to you. Your blows hit 30% harder for 18 seconds.',lore:'Whatever it says is the thing you did not want to hear.'},
 {id:'vael_echo',name:'Echo of Vael',r:5,fp:40,cd:30,icon:'⚡',kind:'storm',power:210,rad:16,strikes:4,desc:'The Queen\'s grief, thrown as lightning. Four strikes fall upon every enemy near you.',lore:'When she stopped the Heart, the sky did not stop. It is still screaming.'},
 {id:'hollow_king_wraith',name:'Gorrad\'s Wraith',r:5,fp:44,cd:34,icon:'👑',kind:'burst',power:360,rad:12,poise:400,desc:'The Hollow King\'s last swing, repeated forever. A colossal slam that staggers anything standing.',lore:'He still believes the crown is on his head. It is, in a sense.'},
 {id:'stilled_heart',name:'The Stilled Heart',r:5,fp:50,cd:45,icon:'♥',kind:'time',power:0.2,dur:5,desc:'For five seconds the world slows to a dying pulse. You are untouched; you are not.',lore:'It beats once every ten thousand years. This is the beat.'},

 {id:'cinder_fawn',name:'Cinder Fawn',r:3,fp:20,cd:12,icon:'🦌',kind:'heal',power:0.2,desc:'A small ember-lit fawn. Mends a fifth of your health.',lore:'It was born in a fire, and so nothing has ever been able to frighten it.'},
 {id:'rust_knell',name:'Rust Knell',r:3,fp:16,cd:7,icon:'🔔',kind:'burst',power:85,rad:8,desc:'A rusted bell tolls and the air shatters around you.',lore:'Rung once for every death in the Gloamwood. It has not yet run out of ringing.'},
 {id:'tallow_saint',name:'Tallow Saint',r:3,fp:22,cd:20,icon:'🕯',kind:'stam',power:80,desc:'Wax-faced and patient. Your stamina floods back.',lore:'She prays with her mouth sewn shut. It is more eloquent than you would think.'},
 {id:'barrow_wolf',name:'Barrow Wolf',r:4,fp:26,cd:10,icon:'🐺',kind:'dash',power:150,rad:11,desc:'A grave-cold wolf tears across the field into your target.',lore:'It was buried alive with a king, and has been very patient.'},
 {id:'veiled_widow',name:'Veiled Widow',r:4,fp:30,cd:24,icon:'🕸',kind:'buff',power:0.4,dur:16,desc:'Her veil lifts. Your blows strike 40% harder for sixteen seconds.',lore:'She is not weeping. That is the veil, wrung out.'},
 {id:'ashen_bulwark',name:'Ashen Bulwark',r:4,fp:30,cd:24,icon:'🛡',kind:'ward',power:0.6,dur:9,desc:'Ashen plate rises around you. Damage taken is cut by sixty percent.',lore:'Armour with nobody in it, still keeping its oath.'},
 {id:'court_of_hollows',name:'Court of Hollows',r:5,fp:46,cd:36,icon:'♛',kind:'storm',power:260,rad:18,strikes:5,desc:'The Hollow Court convenes. Five judgements fall on everything near you.',lore:'There is no throne. There is only the sentence.'},
 {id:'first_flame',name:'The First Flame',r:5,fp:42,cd:32,icon:'🔥',kind:'burst',power:420,rad:14,poise:500,desc:'The fire from before the Heart. A colossal blast that staggers everything.',lore:'Cinder remembers being it. Cinder would rather not.'},
];
export const SPIRIT_BY_ID=Object.fromEntries(SPIRITS.map(s=>[s.id,s]));
const wpn=r=>WEAPONS.filter(w=>w.r===r).map(w=>({type:'weapon',id:w.id,r}));
const spr=r=>SPIRITS.filter(s=>s.r===r).map(s=>({type:'spirit',id:s.id,r}));
export const POOL={3:[...wpn(3),...spr(3)],4:[...wpn(4),...spr(4)],5:[...wpn(5),...spr(5)]};
export const RATES={five:0.016,four:0.13,soft:50,hard:80,softBoost:0.06,guar4:10};
export const COST=8; // embers per pull
export const BANNERS=[
 {id:'std',name:'Pilgrim\'s Vigil',sub:'Standard Rite',blurb:'The long road. Every relic of Cinderfall waits in the ash.',featured:[],colA:'#3a2a1c',colB:'#a8642a',limited:false},
 {id:'vael',name:'The Stilled Heart',sub:'Limited Rite · Vael\'s Lament',blurb:'Rate-up: Echo of Vael and Heartstopper. Lose the 50/50 once and the next Heartforged is guaranteed to be featured.',featured:['vael_echo','heartstopper'],colA:'#20203a',colB:'#7a5cff',limited:true},
 {id:'court',name:'The Hollow Court',sub:'Limited Rite · Sentence of Ash',blurb:'Rate-up: Court of Hollows and Heart-eater. Lose the 50/50 once and the next Heartforged is guaranteed to be featured.',featured:['court_of_hollows','heart_eater'],colA:'#2a1020',colB:'#d04a5a',limited:true},
];
export const BANNER_BY_ID=Object.fromEntries(BANNERS.map(b=>[b.id,b]));
