// 30 weapons. model = path under /a/. off = offhand (shield model) or 'dual' for a second copy in the left hand.
// r: rarity 0=starting/world loot, 3=Ember, 4=Ashen, 5=Heartforged. sc: stat scaling (0..1). len = blade length for trails.
const W=(id,name,cls,model,r,atk,sc,desc,o={})=>({id,name,cls,model,r,atk,sc,desc,len:1.4,off:null,spd:1,...o});
export const WEAPONS=[
 W('oathblade','Vigil Oathblade','sword','adv/sword_1handed',0,22,{str:.5,dex:.5},'Issued to every sworn watcher of the Vigil. The edge is dull; the oath it carries is not.',{off:'adv/shield_round'}),
 W('rustbrand','Rustbrand','sword','wb/sword_A',3,26,{str:.6,dex:.3},'Pulled red from a drowned barrow. It still remembers a hand.',{off:'adv/shield_square',len:1.5}),
 W('thornedge','Thornedge Longsword','sword','wb/sword_B',3,28,{str:.4,dex:.6},'Briar-wrapped. The forest forgives only those who bleed for it.',{off:'adv/shield_badge'}),
 W('mourners_edge','Mourner\'s Edge','sword','wb/sword_C',4,38,{str:.5,dex:.6},'Forged for funerals of kings. Each swing is a eulogy.',{off:'adv/shield_spikes'}),
 W('vaels_lament','Vael\'s Lament','sword','wb/sword_D',5,52,{str:.6,dex:.8},'The last queen\'s blade. It sings low when the Heart is near.',{off:'adv/shield_round_color',len:1.6,fx:'ember'}),
 W('gravewarden','Gravewarden Greatsword','greatsword','adv/sword_2handed',3,40,{str:.8,dex:.2},'A slab of iron meant to keep the dead down.',{len:2.2,spd:0.95}),
 W('kings_burden','King\'s Burden','greatsword','adv/sword_2handed_color',4,58,{str:.9,dex:.3},'Too heavy for any crown. Hollow kings carried it anyway.',{len:2.3,spd:0.92}),
 W('dawnrender','Dawnrender','greatsword','wb/sword_E',5,76,{str:.9,dex:.4},'Said to have cut the last sunrise in half. Nothing has been bright since.',{len:2.4,spd:0.95,fx:'ember'}),
 W('pale_fang','Pale Fang','dagger','adv/dagger',3,16,{str:.2,dex:.9},'Bone-handled and quick. Favoured by those who would rather not be remembered.',{len:0.8,off:'dual'}),
 W('widow_kiss','Widow\'s Kiss','dagger','wb/dagger_A',4,22,{str:.2,dex:1.0},'A kiss, a sigh, and the world goes quiet.',{len:0.9,off:'dual'}),
 W('ashen_twin','Ashen Twinblades','dagger','wb/dagger_B',5,30,{str:.3,dex:1.0},'Two blades cut from one dying star. They never fully cool.',{len:1.0,off:'dual',fx:'ember'}),
 W('hewing_axe','Hewing Axe','axe','adv/axe_1handed',3,30,{str:.7,dex:.2},'A woodsman\'s tool, a woodsman\'s mercy: brief.',{len:0.9,off:'adv/shield_round_barbarian'}),
 W('bone_cleaver','Bone Cleaver','axe','wb/axe_A',3,32,{str:.8,dex:.2},'Notched by a thousand ribs.',{len:1.0}),
 W('hollow_reaver','Hollow Reaver','axe','wb/axe_B',4,44,{str:.8,dex:.3},'The hollow do not tire, and neither does this axe.',{len:1.1}),
 W('executioner','The Last Executioner','axe','adv/axe_2handed',5,66,{str:1.0,dex:.2},'Its owner was the only man in Vael who wept at every sentence.',{len:1.6,spd:0.92,fx:'ember'}),
 W('stonebreaker','Stonebreaker','hammer','wb/hammer_A',3,42,{str:.9,dex:.1},'Built to crack ward-stones. Works on knees too.',{len:1.0,spd:0.9}),
 W('bellringer','Bellringer Maul','hammer','wb/hammer_B',4,56,{str:.9,dex:.1},'When it lands, the old bell-towers of Vael ring, faintly, far away.',{len:1.1,spd:0.9}),
 W('heartstopper','Heartstopper','hammer','wb/hammer_C',5,82,{str:1.0,dex:.1},'The weapon of the Stilling. One blow, and a god\'s pulse ceased.',{len:1.2,spd:0.88,fx:'ember'}),
 W('pilgrim_spear','Pilgrim\'s Spear','spear','wb/spear_A',3,32,{str:.4,dex:.6},'A long walk and a longer reach.',{len:2.4}),
 W('vigil_halberd','Vigil Halberd','spear','wb/halberd',4,46,{str:.7,dex:.5},'The Vigil\'s gate-guards held every threshold with this.',{len:2.4}),
 W('cinder_lance','Cinderlance','spear','wb/spear_A',5,64,{str:.6,dex:.8},'A lance of black glass. It remembers every wall it has pierced.',{len:2.5,fx:'ember'}),
 W('hedge_staff','Hedge-witch Staff','staff','adv/staff',3,24,{res:1.0},'Gnarled ash-wood. The berries on it are not safe to eat.',{len:1.6,spell:'bolt'}),
 W('ember_wand','Emberwick Wand','staff','adv/wand',3,20,{res:1.0},'A wick that burns without oil.',{len:0.8,spell:'bolt'}),
 W('lantern_staff','Lanternbearer\'s Staff','staff','wb/staff_A',4,34,{res:1.0},'Lights the way for those who no longer have a way.',{len:1.7,spell:'orb'}),
 W('voidtongue','Voidtongue','staff','wb/staff_B',5,48,{res:1.0},'It speaks in a language that predates the Heart.',{len:1.7,spell:'orb',fx:'void'}),
 W('wand_of_ash','Wand of Falling Ash','staff','wb/wand_A',4,30,{res:1.0},'Everything it touches is already, softly, dust.',{len:0.9,spell:'bolt'}),
 W('knuckle_wraps','Pilgrim Wraps','fist','wb/fistweapon_A',3,18,{str:.5,dex:.5},'Cloth, rope, and stubbornness.',{len:0.5,off:'dual'}),
 W('iron_fists','Ironbound Fists','fist','wb/fistweapon_B',4,30,{str:.7,dex:.4},'The gauntlets of a king who refused a sword.',{len:0.5,off:'dual'}),
 W('moonlit_hatchet','Moonlit Hatchet','axe','wb/axe_C',4,36,{str:.5,dex:.6},'Thrown once at the moon. It came back lighter.',{len:0.9}),
 W('wolfsbane','Wolfsbane Spear','spear','wb/halberd',4,40,{str:.5,dex:.7},'Hunted the wolves of the Gloamwood until there were none. Then it hunted something else.',{len:2.5}),
];
export const WEAPON_BY_ID=Object.fromEntries(WEAPONS.map(w=>[w.id,w]));
export const RARITY={0:{n:'Common',c:'#9a9a9a'},3:{n:'Ember',c:'#7fb4ff'},4:{n:'Ashen',c:'#c58bff'},5:{n:'Heartforged',c:'#ffb347'}};
