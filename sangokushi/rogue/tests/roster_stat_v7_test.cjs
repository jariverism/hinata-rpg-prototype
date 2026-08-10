const assert=require('assert');
global.window=global;
global.document={
 querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null,
 createElement:()=>({textContent:'',className:'',id:'',appendChild(){},querySelectorAll:()=>[]}),head:{appendChild(){}}
};
global.setTimeout=(fn)=>{fn();return 1};
global.HINATA_START=[];
global.HINATA_WORLD=[['河田陽菜','在野']];
global.HINATA_ROGUE_STAT_V6={FIXED_BASE:{
 '髙橋未来虹':{lead:95,war:95,int:88,pol:75,cha:89},
 '上村ひなの':{lead:78,war:91,int:65,pol:84,cha:91},
 '森本茉莉':{lead:84,war:84,int:72,pol:80,cha:88},
 '山口陽世':{lead:90,war:76,int:55,pol:70,cha:86}
}};
global.V2458={FIFTH:[{name:'大田美月',lead:83,war:93,int:76,pol:75,cha:90}]};
global.HINATA_ROGUE_RULES={UPGRADE_POOL:[
 {id:'int2',name:'智謀鍛錬'},{id:'war2',name:'武勇鍛錬'}
]};
global.render=function(){return true};
global.beginBattle=function(){global.state.battle={units:global.state.officers.filter(o=>o.force==='日向軍').map(o=>({name:o.name,side:'player',lead:1,war:1,int:1}))};return true};
const third=[
 {name:'髙橋未来虹',force:'日向軍',status:'君主',lead:95,war:95,int:88,pol:75,cha:89},
 {name:'上村ひなの',force:'日向軍',status:'一般',lead:78,war:91,int:65,pol:84,cha:91},
 {name:'森本茉莉',force:'日向軍',status:'一般',lead:84,war:84,int:72,pol:80,cha:88},
 {name:'山口陽世',force:'日向軍',status:'一般',lead:90,war:76,int:55,pol:70,cha:86}
];
global.state={turn:2,rogue:{
 upgradeIds:{int2:1},mods:{statLead:0,statWar:0,statInt:2,statPol:0,statCha:0}
},logs:[
 '【190年2月】髙橋未来虹が河田陽菜の登用に成功。',
 '【190年1月】ラン強化「智謀鍛錬」を獲得。'
],officers:[...third,
 {name:'河田陽菜',force:'日向軍',status:'一般',lead:80,war:88,int:49,pol:70,cha:93,vRogueStatApplied:{int:2}},
 // Deliberately clobbered by older common patches: v7 must remember official v58 fifth-gen base instead.
 {name:'大田美月',force:'袁紹',status:'一般',lead:83,war:85,int:64,pol:75,cha:83}
],battle:null};
require('../rogue_roster_stats_v7.js');
const api=global.HINATA_ROGUE_ROSTER_V7;assert(api,'v7 roster API missing');
const by=n=>state.officers.find(o=>o.name===n);
api.captureAllBases();api.normalizeOwn();
// Old INT+2 happened before Kawada joined: only the four initial members receive it.
assert.equal(by('上村ひなの').int,67,'initial member must retain historical INT +2');
assert.equal(by('河田陽菜').int,49,'late recruit must NOT receive an upgrade acquired before joining');
assert.deepEqual(api.upgradeBonus('河田陽菜'),{lead:0,war:0,int:0,pol:0,cha:0});
// Native values must be baseline, not fake ROGUE bonuses.
assert.equal(api.expected(by('河田陽菜')).base.war,88);
assert.equal(api.expected(by('河田陽菜')).total.war,0);
// Fifth generation must use v58 fixed stats even if old common patches changed the live enemy copy.
const ota=by('大田美月'),ob=api.baseForOfficer(ota);
assert.deepEqual(ob,{lead:83,war:93,int:76,pol:75,cha:90},'fifth-gen canonical base must come from v58');
// A new WAR+2 chosen now includes Kawada because she is currently an ally.
state.rogue.upgradeIds.war2=1;api.syncNewUpgradeEvents();api.normalizeOwn();
assert.equal(by('河田陽菜').war,90,'current ally must receive newly selected WAR +2');
assert.equal(by('上村ひなの').war,93,'initial ally must receive newly selected WAR +2');
// Recruit Ota after both earlier upgrades: neither old upgrade may leak backwards into her.
ota.force='日向軍';ota.status='一般';api.normalizeOwn();
assert.equal(ota.war,93,'late fifth-gen recruit must not inherit earlier WAR +2');
assert.equal(ota.int,76,'late fifth-gen recruit must not inherit earlier INT +2');
assert.deepEqual(api.upgradeBonus('大田美月'),{lead:0,war:0,int:0,pol:0,cha:0});
// Pick INT+2 again after Ota joins. Only this second copy applies to Kawada and Ota; third gets both copies.
state.rogue.upgradeIds.int2=2;api.syncNewUpgradeEvents();api.normalizeOwn();
assert.equal(by('上村ひなの').int,69,'initial member gets both INT upgrades');
assert.equal(by('河田陽菜').int,51,'Kawada gets only post-join INT upgrade');
assert.equal(ota.int,78,'Ota gets only post-join INT upgrade');
// Material and equipment are explicit in-run sources and apply exactly once.
state.logs.unshift('曹操を知力の強化素材として消費。大田美月の知力＋4');ota.rogueEquip={name:'青龍偃月刀',stat:'war',amount:10};api.normalizeOwn();
assert.equal(ota.int,82,'material INT +4 must apply on top of post-join INT +2');
assert.equal(ota.war,103,'equipment WAR +10 must apply without old WAR +2');
for(let i=0;i<20;i++)api.normalizeOwn();
assert.equal(ota.int,82,'repeated renders must not stack material/upgrade bonuses');
assert.equal(ota.war,103,'repeated renders must not stack equipment');
// Common patches may clobber live stats; v7 must restore base + true run sources.
ota.int=64;ota.war=85;by('河田陽菜').int=96;api.normalizeOwn();
assert.equal(ota.int,82);assert.equal(ota.war,103);assert.equal(by('河田陽菜').int,51);
// Legacy direct-stat mod totals are cleared so future recruits do not inherit them through rogue.js applyStoredStats.
assert.equal(state.rogue.mods.statInt,0);assert.equal(state.rogue.mods.statWar,0);
// Save/load-shaped clone must preserve bases, recipient events and exact final values.
global.state=JSON.parse(JSON.stringify(global.state));api.normalizeOwn();
assert.equal(by('河田陽菜').int,51);assert.equal(by('大田美月').int,82);assert.equal(by('大田美月').war,103);
// Battle units get the same final lead/war/int.
state.battle=null;window.beginBattle();const u=state.battle.units.find(x=>x.name==='大田美月');
assert.equal(u.int,82);assert.equal(u.war,103);assert.equal(u.lead,83);
console.log('ROGUE v7 full-roster stat lifecycle tests: PASS');
