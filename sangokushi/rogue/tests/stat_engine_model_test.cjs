const assert=require('assert');
global.window=global;
global.document={
 querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null,
 createElement:()=>({textContent:'',className:'',id:'',appendChild(){},querySelectorAll:()=>[]}),head:{appendChild(){}}
};
global.setTimeout=(fn)=>{fn();return 1};
global.render=function(){return true};
global.beginBattle=function(){global.state.battle={units:global.state.officers.filter(o=>o.force==='日向軍').map(o=>({name:o.name,side:'player',lead:1,war:1,int:1}))};return true};
global.state={rogue:{
 upgradeIds:{int2:1},
 // Deliberately poison every legacy field. v6 must ignore/delete these inferred bonuses.
 statLedger:{'上村ひなの':{war:39,int:999}},
 statEventsV3:[{source:'upgrade',id:'bogus',stat:'war',amount:39,recipients:['上村ひなの']}],
 mods:{statWar:39,statInt:2}
},logs:[],officers:[
 {name:'髙橋未来虹',force:'日向軍',status:'君主',lead:95,war:95,int:88,pol:75,cha:89,vRogueStatApplied:{war:5}},
 {name:'上村ひなの',force:'日向軍',status:'一般',lead:78,war:91,int:65,pol:84,cha:91,vRogueStatApplied:{war:39}},
 {name:'森本茉莉',force:'日向軍',status:'一般',lead:84,war:84,int:72,pol:80,cha:88,vRogueStatApplied:{war:6}},
 {name:'山口陽世',force:'日向軍',status:'一般',lead:90,war:76,int:55,pol:70,cha:86}
],battle:null};
require('../rogue_stat_engine_v6.js');
const api=global.HINATA_ROGUE_STAT_V6;
assert(api,'v6 stat engine API missing');
const by=n=>state.officers.find(o=>o.name===n);
api.normalize();
// Native ROGUE start values are baseline, never a bonus.
assert.equal(by('上村ひなの').war,91,'Hinano native WAR 91 must stay baseline');
assert.equal(by('森本茉莉').war,84,'Mari native WAR 84 must stay baseline');
assert.equal(by('髙橋未来虹').war,95,'Mikuni native WAR 95 must stay baseline');
assert.deepEqual(api.upgradeBonus('上村ひなの'),{lead:0,war:0,int:2,pol:0,cha:0},'only INT +2 is the selected run upgrade');
// The selected INT +2 must change the actual numbers, not just a label.
assert.equal(by('髙橋未来虹').int,90,'Mikuni INT 88 -> 90');
assert.equal(by('上村ひなの').int,67,'Hinano INT 65 -> 67');
assert.equal(by('森本茉莉').int,74,'Mari INT 72 -> 74');
assert.equal(by('山口陽世').int,57,'Haruyo INT 55 -> 57');
// Repeated renders/normalization must be idempotent.
for(let i=0;i<20;i++)api.normalize();
assert.equal(by('上村ひなの').int,67,'INT +2 must not stack repeatedly');
assert.equal(by('上村ひなの').war,91,'legacy +39 must never reappear');
// Common patch clobber must be repaired back to baseline + true run bonus.
by('上村ひなの').war=52;by('上村ひなの').int=65;api.normalize();
assert.equal(by('上村ひなの').war,91,'shared-game clobber must restore native WAR');
assert.equal(by('上村ひなの').int,67,'shared-game clobber must restore INT +2');
// Another true upgrade must apply exactly once.
state.rogue.upgradeIds.war2=1;api.normalize();
assert.equal(by('上村ひなの').war,93,'true WAR +2 must apply');
api.normalize();assert.equal(by('上村ひなの').war,93,'true WAR +2 must remain exactly once');
// Material bonus is explicit game history and must persist exactly once.
state.logs.unshift('曹操を知力の強化素材として消費。上村ひなのの知力＋4');api.normalize();
assert.equal(by('上村ひなの').int,71,'material INT +4 must apply on top of run INT +2');
api.normalize();assert.equal(by('上村ひなの').int,71,'material log must not double count');
// Equipment is also a genuine in-run stat modifier.
by('上村ひなの').rogueEquip={name:'青龍偃月刀',stat:'war',amount:10};api.normalize();
assert.equal(by('上村ひなの').war,103,'equipment WAR +10 must be reflected');
// Save/load-shaped clone must preserve the exact formula result.
global.state=JSON.parse(JSON.stringify(global.state));api.normalize();
assert.equal(by('上村ひなの').int,71,'save/load must retain INT 71');
assert.equal(by('上村ひなの').war,103,'save/load must retain WAR 103');
// Battle unit must receive the same final values.
state.battle=null;window.beginBattle();
const u=state.battle.units.find(x=>x.name==='上村ひなの');
assert.equal(u.int,71,'battle unit INT must match campaign value');
assert.equal(u.war,103,'battle unit WAR must match campaign value');
console.log('ROGUE v6 canonical stat engine tests: PASS');
