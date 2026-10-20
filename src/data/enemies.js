// Enemy and boss definitions. Attacks are data: a clip, a windup (a), an active window (a..b), an end, damage and a range band the AI uses to choose.
// Times are in clip-seconds; real time = t / spd. Every attack telegraphs: glow ramps during the windup (orange = can parry/block, red = unblockable: roll it).
import {clipinfo} from '../assets.js';

const A=(id,clip,o={})=>{ const i=clipinfo[clip]||{dur:1,hitA:0.4,hitB:0.5}; const spd=o.spd||1; const a=o.a??i.hitA??0.4,b=o.b??i.hitB??a+0.1,end=o.end??Math.min(i.dur,b+0.55);
 return {id,clip,spd,dmg:30,poise:25,reach:2.3,arc:100,lunge:0,range:[0,3],w:1,track:0.75,kind:'melee',cp:0,...o,a,b,end} };
const P=(o)=>({speed:16,dmg:30,r:0.3,life:2,n:1,spread:0,col:[1,.6,.2],...o});

export const ENEMY_TYPES={
 husk:{name:'Hollow Husk',model:'chars/Skeleton_Minion',wpn:'skel/Skeleton_Blade',off:null,hp:72,speed:3.1,run:'Skeletons_Walking',idle:'Skeletons_Idle',r:0.5,h:1.7,scale:1,poise:30,flinch:true,cinders:22,aggro:14,leash:34,sleeper:true,dm:1,
  atk:[A('slash','Melee_1H_Attack_Slice_Diagonal',{spd:0.8,dmg:30,reach:2.4,arc:110,lunge:1.0,range:[0,2.8],w:3,a:0.367,b:0.483}),
       A('stab','Melee_1H_Attack_Stab',{spd:0.8,dmg:36,reach:2.7,arc:50,lunge:1.8,range:[1.5,3.8],w:2}),
       A('chop','Melee_1H_Attack_Chop',{spd:0.75,dmg:42,reach:2.4,arc:80,lunge:0.7,range:[0,2.6],w:1.5,heavy:true})],cd:[0.7,1.6]},
 reaver:{name:'Rust Reaver',model:'chars/Skeleton_Warrior',wpn:'skel/Skeleton_Axe',off:null,hp:150,speed:2.9,run:'Skeletons_Walking',idle:'Skeletons_Idle',r:0.6,h:1.9,scale:1.12,poise:90,flinch:false,cinders:55,aggro:15,leash:34,sleeper:true,dm:1.1,
  atk:[A('cleave','Melee_2H_Attack_Chop',{spd:0.85,dmg:62,reach:2.9,arc:90,lunge:1.4,range:[0,3.4],w:3,heavy:true,poise:60}),
       A('sweep','Melee_2H_Attack_Slice',{spd:0.9,dmg:46,reach:3.0,arc:150,lunge:0.8,range:[0,3.4],w:2.5,chain:'cleave',cp:0.35,poise:40}),
       A('whirl','Melee_2H_Attack_Spin',{spd:1.0,dmg:38,reach:3.0,arc:360,range:[0,3.2],w:1,kind:'spin',hitEvery:0.45,poise:50,a:0.7,b:1.35,end:1.9})],cd:[0.9,1.9]},
 shade:{name:'Gloam Shade',model:'chars/Skeleton_Rogue',wpn:'skel/Skeleton_Blade',off:'skel/Skeleton_Blade',dual:true,hp:78,speed:3.9,run:'Running_A',idle:'Skeletons_Idle',r:0.45,h:1.7,scale:1,poise:35,flinch:true,cinders:34,aggro:16,leash:36,sleeper:false,dm:1,strafe:true,
  atk:[A('flurryA','Melee_Dualwield_Attack_Slice',{spd:1.0,dmg:22,reach:2.2,arc:110,lunge:1.0,range:[0,2.8],w:3,chain:'flurryB',cp:0.6}),
       A('flurryB','Melee_Dualwield_Attack_Slice',{spd:1.1,dmg:22,reach:2.2,arc:110,lunge:0.8,range:[0,2.8],w:0,chain:'finisher',cp:0.5}),
       A('finisher','Melee_Dualwield_Attack_Chop',{spd:0.95,dmg:38,reach:2.4,arc:90,lunge:1.4,range:[0,2.8],w:0,heavy:true}),
       A('lunge','Melee_Dualwield_Attack_Stab',{spd:1.0,dmg:34,reach:2.6,arc:50,lunge:5.0,range:[3.5,8],w:2.5})],cd:[0.5,1.3]},
 caller:{name:'Grave Caller',model:'chars/Skeleton_Mage',wpn:'skel/Skeleton_Staff',off:null,hp:58,speed:2.8,run:'Skeletons_Walking',idle:'Skeletons_Idle',r:0.45,h:1.7,scale:1,poise:25,flinch:true,cinders:40,aggro:20,leash:36,sleeper:false,dm:1,keep:[8,14],
  atk:[A('orb','Ranged_Magic_Raise',{spd:1.0,a:0.8,b:0.9,end:1.5,range:[4,22],w:3,kind:'shoot',track:0.9,proj:P({speed:11,dmg:34,r:0.4,life:3,col:[.6,.4,1],magic:true,homing:0.8,kind:'orb'})}),
       A('triple','Ranged_Magic_Spellcasting',{spd:0.8,a:0.55,b:0.7,end:1.2,range:[3,18],w:1.5,kind:'shoot',proj:P({speed:13,dmg:24,r:0.3,life:2.5,col:[.7,.4,1],magic:true,n:3,spread:0.35,kind:'orb'})})],cd:[1.2,2.2]},
 crossbowman:{name:'Hollow Marksman',model:'chars/Skeleton_Rogue',wpn:'skel/Skeleton_Crossbow',off:null,hp:60,speed:3.0,run:'Skeletons_Walking',idle:'Skeletons_Idle',r:0.45,h:1.7,scale:1,poise:25,flinch:true,cinders:36,aggro:24,leash:40,sleeper:false,dm:1,keep:[9,16],
  atk:[A('bolt','Ranged_2H_Aiming',{spd:1.0,a:1.0,b:1.05,end:1.6,range:[5,26],w:1,kind:'shoot',track:0.95,aim:true,proj:P({speed:30,dmg:44,r:0.2,life:1.4,col:[.9,.85,.7],kind:'arrow'})})],cd:[1.6,2.8]},
 bulwark:{name:'Gravewarden Bulwark',model:'chars/Skeleton_Warrior',wpn:'skel/Skeleton_Blade',off:'skel/Skeleton_Shield_Large_A',shield:true,hp:190,speed:2.5,run:'Skeletons_Walking',idle:'Skeletons_Idle',r:0.62,h:1.9,scale:1.14,poise:110,flinch:false,cinders:70,aggro:14,leash:30,sleeper:true,dm:1.15,
  atk:[A('jab','Melee_1H_Attack_Stab',{spd:0.9,dmg:40,reach:2.8,arc:50,lunge:1.4,range:[0,3.4],w:3}),
       A('bash','Melee_Block_Attack',{spd:0.9,dmg:30,reach:2.4,arc:90,lunge:1.0,range:[0,2.8],w:2,poise:85,a:0.3,b:0.55,end:1.0,breakGuard:true}),
       A('overhead','Melee_1H_Attack_Jump_Chop',{spd:0.8,dmg:78,reach:3.0,arc:90,lunge:2.6,range:[1,4.5],w:1.6,heavy:true,poise:80})],cd:[1.0,2.0]},
 knight:{name:'Hollow Knight',model:'chars/Knight',wpn:'adv/sword_2handed',off:null,hp:300,speed:3.3,run:'Running_A',idle:'Melee_2H_Idle',r:0.62,h:2.0,scale:1.18,poise:140,flinch:false,cinders:150,aggro:18,leash:36,sleeper:false,dm:1.35,tint:[0.55,0.55,0.62],elite:true,
  atk:[A('slice','Melee_2H_Attack_Slice',{spd:0.95,dmg:62,reach:3.3,arc:130,lunge:1.5,range:[0,4],w:3,chain:'chop',cp:0.3}),
       A('chop','Melee_2H_Attack_Chop',{spd:0.85,dmg:88,reach:3.3,arc:80,lunge:1.8,range:[0,4],w:2.5,heavy:true,poise:80}),
       A('thrust','Melee_2H_Attack_Stab',{spd:0.9,dmg:70,reach:3.8,arc:40,lunge:5.2,range:[4,9],w:2.5}),
       A('crimson','Melee_2H_Attack_Spin',{spd:0.85,dmg:96,reach:3.6,arc:360,range:[0,4],w:1,unb:true,kind:'spin',hitEvery:9,poise:90,a:0.75,b:1.3,end:2.0})],cd:[0.7,1.5]},
 brute:{name:'Pallid Brute',model:'chars/Barbarian',wpn:'adv/axe_2handed',off:null,hp:420,speed:3.0,run:'Running_A',idle:'Melee_2H_Idle',r:0.8,h:2.3,scale:1.4,poise:200,flinch:false,cinders:220,aggro:16,leash:34,sleeper:false,dm:1.5,tint:[0.78,0.72,0.7],elite:true,
  atk:[A('smash','Melee_2H_Attack_Chop',{spd:0.78,dmg:98,reach:3.8,arc:90,lunge:1.5,range:[0,4.4],w:3,heavy:true,poise:100}),
       A('swing','Melee_2H_Attack_Slice',{spd:0.85,dmg:66,reach:3.9,arc:150,lunge:1.0,range:[0,4.4],w:3}),
       A('leap','Melee_1H_Attack_Jump_Chop',{spd:0.75,dmg:84,range:[5,14],w:2.2,kind:'leap',slam:{r:4.2,ox:0},heavy:true,a:0.65,b:0.767,end:1.5,poise:100})],cd:[0.9,1.8]},
 cultist:{name:'Ash Cultist',model:'chars/Mage',wpn:'adv/staff',off:null,hp:110,speed:3.0,run:'Running_A',idle:'Idle_A',r:0.45,h:1.8,scale:1.05,poise:40,flinch:true,cinders:90,aggro:22,leash:38,sleeper:false,dm:1,tint:[0.95,0.55,0.5],keep:[7,13],
  atk:[A('flame','Ranged_Magic_Spellcasting_Long',{spd:1.0,a:1.0,b:1.1,end:1.9,range:[3,20],w:2.5,kind:'pillars',track:0.5,pillars:{n:3,r:2.0,delay:1.0,dmg:55,spread:2.2}}),
       A('ember','Ranged_Magic_Raise',{spd:1.0,a:0.7,b:0.8,end:1.4,range:[3,20],w:2,kind:'shoot',proj:P({speed:12,dmg:38,r:0.4,life:3,col:[1,.5,.15],magic:true,homing:0.5,n:2,spread:0.25,kind:'orb'})})],cd:[1.1,2.0]},
 assassin:{name:'Veil Assassin',model:'chars/Rogue_Hooded',wpn:'adv/dagger',off:'adv/dagger',dual:true,hp:105,speed:4.6,run:'Running_B',idle:'Idle_A',r:0.45,h:1.75,scale:1.05,poise:55,flinch:false,cinders:85,aggro:20,leash:40,sleeper:false,dm:1.2,strafe:true,tint:[0.5,0.5,0.7],
  atk:[A('rake','Melee_Dualwield_Attack_Slice',{spd:1.15,dmg:30,reach:2.2,arc:120,lunge:1.2,range:[0,2.8],w:2,chain:'rake2',cp:0.7}),
       A('rake2','Melee_Dualwield_Attack_Slice',{spd:1.2,dmg:30,reach:2.2,arc:120,lunge:1.0,range:[0,2.8],w:0,chain:'dive',cp:0.5}),
       A('dive','Melee_Dualwield_Attack_Chop',{spd:1.0,dmg:52,reach:2.5,arc:80,lunge:2.2,range:[0,3],w:0,heavy:true}),
       A('vault','Melee_Dualwield_Attack_Stab',{spd:1.1,dmg:48,reach:2.7,arc:50,lunge:7.5,range:[4,11],w:3,poise:50})],cd:[0.45,1.1]},
 ranger:{name:'Briar Ranger',model:'chars/Ranger',wpn:'adv/bow',off:null,hp:92,speed:3.8,run:'Running_A',idle:'Idle_A',r:0.45,h:1.8,scale:1.05,poise:40,flinch:true,cinders:75,aggro:30,leash:44,sleeper:false,dm:1,tint:[0.7,0.85,0.6],keep:[10,18],strafe:true,
  atk:[A('arrow','Ranged_Bow_Draw',{spd:0.9,a:0.9,b:0.95,end:1.5,range:[5,30],w:3,kind:'shoot',aim:true,track:0.95,proj:P({speed:34,dmg:48,r:0.2,life:1.5,col:[.8,1,.6],kind:'arrow'})}),
       A('volley','Ranged_Bow_Draw',{spd:0.8,a:1.0,b:1.05,end:1.7,range:[6,30],w:1.4,kind:'shoot',aim:true,proj:P({speed:30,dmg:30,r:0.2,life:1.5,col:[.8,1,.6],kind:'arrow',n:3,spread:0.18})})],cd:[1.2,2.3]},
 bonehound:{name:'Starved Wretch',model:'chars/Skeleton_Minion',wpn:null,off:null,hp:48,speed:5.6,run:'Running_A',idle:'Crouching',r:0.45,h:1.2,scale:0.9,poise:15,flinch:true,cinders:20,aggro:18,leash:40,sleeper:false,dm:0.9,strafe:true,tint:[0.7,0.6,0.5],
  atk:[A('maul','Melee_Unarmed_Attack_Punch_A',{spd:1.1,dmg:20,reach:1.9,arc:90,lunge:1.4,range:[0,2.4],w:3,chain:'maul2',cp:0.5}),
       A('maul2','Melee_Unarmed_Attack_Punch_A',{spd:1.2,dmg:20,reach:1.9,arc:90,lunge:1.0,range:[0,2.4],w:0}),
       A('pounce','Melee_Unarmed_Attack_Kick',{spd:1.0,dmg:30,reach:2.2,arc:60,lunge:6,range:[3,8],w:2.5})],cd:[0.4,1.0]},
};

// ---------- BOSSES: multi-phase. phases[i].at = hp fraction at which phase i begins.
const WAVE=P({kind:'wave',speed:13,dmg:72,r:1.3,life:1.25,col:[1,.45,.1],y:0.5});
export const BOSS_TYPES={
 ashen_knight:{name:'Sir Corvane, the Ashen Knight',title:'Warden of the Sunken Chapel',model:'chars/Knight',wpn:'adv/sword_2handed_color',off:null,hp:1250,speed:3.7,run:'Running_A',idle:'Melee_2H_Idle',r:0.95,h:3.2,scale:1.75,wscale:1.0,poise:260,cinders:2400,tint:[0.42,0.4,0.46],
  arena:{x:96,z:-4,r:17},glow:[1,.45,.1],big:true,dm:1.6,drops:['kings_burden'],flag:'ashen_knight',
  phases:[
   {at:1,cd:[0.55,1.2],atk:[
     A('cleave','Melee_2H_Attack_Slice',{spd:0.95,dmg:62,reach:4.3,arc:150,lunge:2.2,range:[0,5.2],w:3,chain:'overhead',cp:0.3,turn:3.2}),
     A('overhead','Melee_2H_Attack_Chop',{spd:0.8,dmg:90,reach:4.3,arc:80,lunge:2.4,range:[0,5.2],w:2.2,heavy:true,poise:100,turn:2.6,slam:{r:2.4,ox:3.4,fx:true}}),
     A('thrust','Melee_2H_Attack_Stab',{spd:0.88,dmg:74,reach:4.8,arc:40,lunge:7.5,range:[5,13],w:3,turn:3.4}),
     A('spin','Melee_2H_Attack_Spin',{spd:0.95,dmg:46,reach:4.5,arc:360,range:[0,5],w:1.6,kind:'spin',hitEvery:0.4,a:0.7,b:1.32,end:1.9,poise:90}),
     A('leap','Melee_1H_Attack_Jump_Chop',{spd:0.72,dmg:92,range:[6,16],w:2,kind:'leap',slam:{r:4.8,ox:0,fx:true},heavy:true,a:0.65,b:0.767,end:1.55,poise:100})]},
   {at:0.5,enter:'Skeletons_Taunt_Longer',cd:[0.35,0.85],speedMul:1.14,atk:[
     A('cleave','Melee_2H_Attack_Slice',{spd:1.08,dmg:70,reach:4.4,arc:150,lunge:2.4,range:[0,5.2],w:2.4,chain:'cleave2',cp:0.6,turn:3.6}),
     A('cleave2','Melee_2H_Attack_Slice',{spd:1.12,dmg:60,reach:4.4,arc:150,lunge:2.2,range:[0,5.2],w:0,chain:'overhead',cp:0.55,turn:3.6}),
     A('overhead','Melee_2H_Attack_Chop',{spd:0.9,dmg:100,reach:4.4,arc:80,lunge:2.6,range:[0,5.2],w:2,heavy:true,poise:100,slam:{r:3,ox:3.6,fx:true},wave:WAVE}),
     A('thrust','Melee_2H_Attack_Stab',{spd:1.0,dmg:80,reach:4.8,arc:40,lunge:8.5,range:[5,13],w:2.4,chain:'cleave',cp:0.35}),
     A('crimson','Melee_2H_Attack_Spin',{spd:0.8,dmg:110,reach:5.0,arc:360,range:[0,6],w:2,unb:true,kind:'spin',hitEvery:9,a:0.9,b:1.3,end:2.0,poise:120}),
     A('pillars','Ranged_Magic_Spellcasting_Long',{spd:0.95,a:1.0,b:1.1,end:2.2,range:[5,22],w:2.4,kind:'pillars',pillars:{n:5,r:2.4,delay:1.05,dmg:70,spread:3.4,onPlayer:true},track:0.4}),
     A('leap','Melee_1H_Attack_Jump_Chop',{spd:0.8,dmg:100,range:[6,16],w:1.8,kind:'leap',slam:{r:5.5,ox:0,fx:true,ring:true},heavy:true,a:0.65,b:0.767,end:1.5,poise:100})]}]},
 hollow_king:{name:'Gorrad, the Hollow King',title:'He Who Wore the Crown of Ash',model:'chars/Barbarian',wpn:'adv/axe_2handed',off:null,hp:1900,speed:3.5,run:'Running_A',idle:'Melee_2H_Idle',r:1.2,h:4.0,scale:2.3,poise:420,cinders:5200,tint:[0.7,0.62,0.6],arena:{x:-196,z:-60,r:20},glow:[.5,.8,1],big:true,dm:2.0,flag:'hollow_king',
  phases:[{at:1,cd:[0.7,1.4],atk:[
    A('smash','Melee_2H_Attack_Chop',{spd:0.75,dmg:110,reach:5.0,arc:90,lunge:2.2,range:[0,6],w:3,heavy:true,poise:140,slam:{r:3.4,ox:4.4,fx:true}}),
    A('swing','Melee_2H_Attack_Slice',{spd:0.85,dmg:78,reach:5.2,arc:170,lunge:1.8,range:[0,6],w:3,chain:'swing',cp:0.3}),
    A('leap','Melee_1H_Attack_Jump_Chop',{spd:0.7,dmg:100,range:[6,18],w:2,kind:'leap',slam:{r:5.8,ox:0,fx:true,ring:true},heavy:true,a:0.65,b:0.767,end:1.6,poise:100}),
    A('spin','Melee_2H_Attack_Spin',{spd:0.85,dmg:56,reach:5.2,arc:360,range:[0,6],w:1.6,kind:'spin',hitEvery:0.45,a:0.7,b:1.32,end:1.9})]},
   {at:0.55,enter:'Skeletons_Taunt_Longer',cd:[0.4,0.9],speedMul:1.12,atk:[
    A('smash','Melee_2H_Attack_Chop',{spd:0.85,dmg:120,reach:5.0,arc:90,lunge:2.2,range:[0,6],w:2.5,heavy:true,poise:140,slam:{r:3.4,ox:4.4,fx:true},wave:P({kind:'wave',speed:12,dmg:80,r:1.5,life:1.4,col:[.5,.8,1],y:0.5})}),
    A('swing','Melee_2H_Attack_Slice',{spd:0.95,dmg:84,reach:5.2,arc:170,lunge:1.8,range:[0,6],w:2.5,chain:'smash',cp:0.45}),
    A('quake','Melee_1H_Attack_Jump_Chop',{spd:0.75,dmg:105,range:[6,18],w:2.2,kind:'leap',slam:{r:6.5,ox:0,fx:true,ring:true},heavy:true,a:0.65,b:0.767,end:1.6,chain:'spin',cp:0.5}),
    A('spin','Melee_2H_Attack_Spin',{spd:0.8,dmg:100,reach:5.5,arc:360,range:[0,6],w:2,unb:true,kind:'spin',hitEvery:9,a:0.9,b:1.3,end:2.0}),
    A('frostfall','Ranged_Magic_Spellcasting_Long',{spd:0.95,a:1.0,b:1.1,end:2.2,range:[5,24],w:2.2,kind:'pillars',pillars:{n:6,r:2.4,delay:1.05,dmg:76,spread:4,onPlayer:true},track:0.4})]}]},
 stilled_heart:{name:'Vael, Mother of the Stilled Heart',title:'The Queen Who Stopped the World',model:'chars/Mage',wpn:'adv/staff',off:null,hp:2600,speed:3.2,run:'Running_A',idle:'Idle_A',r:0.95,h:3.2,scale:1.9,poise:300,cinders:9000,tint:[0.85,0.75,1.0],arena:{x:0,z:-232,r:22},glow:[.8,.4,1],big:true,dm:2.3,flag:'stilled_heart',
  phases:[{at:1,cd:[0.7,1.4],atk:[
    A('orbs','Ranged_Magic_Raise',{spd:0.9,a:0.8,b:0.9,end:1.6,range:[3,24],w:3,kind:'shoot',proj:P({speed:12,dmg:60,r:0.55,life:3.5,col:[.7,.4,1],magic:true,homing:1.0,n:3,spread:0.4,kind:'orb'})}),
    A('rain','Ranged_Magic_Spellcasting_Long',{spd:0.9,a:1.0,b:1.1,end:2.2,range:[3,24],w:3,kind:'pillars',pillars:{n:6,r:2.2,delay:1.0,dmg:70,spread:4.5,onPlayer:true}}),
    A('rend','Melee_2H_Attack_Slice',{spd:0.95,dmg:80,reach:4.0,arc:150,lunge:2,range:[0,4.6],w:3,chain:'rend2',cp:0.5}),
    A('rend2','Melee_2H_Attack_Chop',{spd:0.9,dmg:96,reach:4.0,arc:90,lunge:2,range:[0,4.6],w:0,heavy:true,poise:100})]},
   {at:0.5,enter:'Ranged_Magic_Summon',cd:[0.4,1.0],speedMul:1.12,atk:[
    A('orbs','Ranged_Magic_Raise',{spd:1.0,a:0.8,b:0.9,end:1.5,range:[3,24],w:2.5,kind:'shoot',proj:P({speed:13,dmg:62,r:0.55,life:3.5,col:[.7,.4,1],magic:true,homing:1.2,n:5,spread:0.7,kind:'orb'})}),
    A('rain','Ranged_Magic_Spellcasting_Long',{spd:1.0,a:1.0,b:1.1,end:2.0,range:[3,24],w:3,kind:'pillars',pillars:{n:9,r:2.2,delay:0.95,dmg:72,spread:5.5,onPlayer:true}}),
    A('rend','Melee_2H_Attack_Slice',{spd:1.05,dmg:84,reach:4.2,arc:150,lunge:2.2,range:[0,4.8],w:3,chain:'rend2',cp:0.6}),
    A('rend2','Melee_2H_Attack_Chop',{spd:1.0,dmg:100,reach:4.2,arc:90,lunge:2.2,range:[0,4.8],w:0,heavy:true,poise:100,wave:P({kind:'wave',speed:13,dmg:76,r:1.3,life:1.3,col:[.8,.4,1],y:0.5})}),
    A('stilling','Ranged_Magic_Summon',{spd:0.8,a:2.8,b:3.0,end:4.0,range:[0,30],w:1.4,kind:'slam',unb:true,dmg:130,slam:{r:9,ox:0,fx:true,ring:true},poise:200,track:0.2})]}]},
};
