const assert=require('assert');
global.window=global;
global.document={querySelectorAll:()=>[],createElement:()=>({textContent:'',className:'',appendChild(){}}),head:{appendChild(){}}};
global.render=function(){return true};
global.beginBattle=function(){global.state.battle={units:global.state.officers.filter(o=>o.force==='日向軍').map(o=>({name:o.name,side:'player',lead:1,war:1,int:1}))};return true};
global.state={rogue:{upgradeIds:{int2:1}},logs:[],officers:[
 {name:'髙橋未来虹',force:'日向軍',status:'君主',lead:95,war:95,int:88,pol:75,cha:89},
 {name:'上村ひなの',force:'日向軍',status:'一般',lead:78,war:91,int:65,pol:84,cha:91},
 {name:'森本茉莉',force:'日向軍',status:'一般',lead:84,war:84,int:72,pol:80,cha:88},
 {name:'山口陽世',force:'日向軍',status:'一般',lead:90,war:76,int:55,pol:70,cha:86}
],battle:null};
require('../rogue_stat_engine.js');
const api=global.HINATA_ROGUE_STAT_ENGINE_API;
assert(api,'stat engine API missing');
api.normalize();
const by=n=>state.officers.find(o=>o.name===n);
assert.equal(by('上村ひなの').war,91,'shared stat must not be misread as ROGUE +39');
assert.equal(by('上村ひなの').int,67,'Hinano INT +2 must apply');
assert.equal(by('森本茉莉').int,74,'Mari INT +2 must apply');
assert.equal(by('山口陽世').int,57,'Haruyo INT +2 must apply');
assert.equal(by('髙橋未来虹').int,90,'Mikuni INT +2 must apply');
for(let i=0;i<10;i++)api.normalize();
assert.equal(by('上村ひなの').int,67,'reconcile must not stack repeatedly');
assert.deepEqual(api.bonusFor('上村ひなの'),{lead:0,war:0,int:2,pol:0,cha:0},'only acquired bonus should exist');
// Simulate a common patch clobbering the value; deterministic normalization must restore it.
by('上村ひなの').int=65;by('上村ひなの').war=50;api.normalize();
assert.equal(by('上村ひなの').int,67,'clobbered INT must be restored');
assert.equal(by('上村ひなの').war,91,'clobbered base WAR must be restored');
// Add a second actual upgrade. It must apply exactly once.
state.rogue.upgradeIds.war2=1;api.normalize();
assert.equal(by('上村ひなの').war,93,'WAR +2 must apply exactly once');
api.normalize();assert.equal(by('上村ひなの').war,93,'WAR +2 must not stack on render');
// Historical-officer material conversion must be additive and idempotent.
state.logs.unshift('曹操を知力の強化素材として消費。上村ひなのの知力＋4');api.normalize();
assert.equal(by('上村ひなの').int,71,'material INT +4 must apply');
api.normalize();assert.equal(by('上村ひなの').int,71,'material log must not double count');
// Save/load-shaped clone should retain event ledger and exact totals.
state=JSON.parse(JSON.stringify(state));api.normalize();
assert.equal(by('上村ひなの').int,71,'save/load must retain exact INT');
assert.equal(by('上村ひなの').war,93,'save/load must retain exact WAR');
// Battle wrapper must copy final stats to the unit.
state.battle=null;window.beginBattle();
const u=state.battle.units.find(x=>x.name==='上村ひなの');
assert.equal(u.int,71,'battle unit INT must match campaign stat');
assert.equal(u.war,93,'battle unit WAR must match campaign stat');
console.log('ROGUE deterministic stat engine tests: PASS');
