const assert=require('assert');
global.window=global;
global.document={querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null};
global.setTimeout=(fn)=>{fn();return 1};
global.render=()=>true;global.beginBattle=function(){state.battle={units:state.officers.filter(o=>o.force==='日向軍').map(o=>({name:o.name,side:'player',lead:1,war:1,int:1}))};return true};
global.HINATA_CANONICAL_STATS={
 '河田陽菜':{lead:82,war:88,int:49,pol:64,cha:93},
 '大野愛実':{lead:97,war:90,int:84,pol:84,cha:99}
};
global.HINATA_ROGUE_ROSTER_V7={
 normalizeOwn:()=>true,
 upgradeBonus:(name)=>name==='河田陽菜'?{lead:0,war:0,int:2,pol:0,cha:0}:{lead:0,war:0,int:0,pol:0,cha:0},
 materialBonus:()=>({lead:0,war:0,int:0,pol:0,cha:0}),
 equipBonus:(o)=>o.rogueEquip?{lead:0,war:o.rogueEquip.stat==='war'?o.rogueEquip.amount:0,int:0,pol:0,cha:0}:{lead:0,war:0,int:0,pol:0,cha:0}
};
global.state={modeId:'rogue',rogue:{rosterBaseV7:{'河田陽菜':{lead:68,war:55,int:96,pol:58,cha:78}}},officers:[
 {name:'河田陽菜',force:'日向軍',status:'一般',lead:68,war:55,int:96,pol:58,cha:78},
 {name:'大野愛実',force:'日向軍',status:'一般',lead:12,war:13,int:14,pol:15,cha:16,rogueEquip:{stat:'war',amount:10}}
],battle:null};
require('../rogue_fixed_roster_v8.js');
const api=global.HINATA_ROGUE_FIXED_V8;assert(api,'ROGUE v8 API missing');
api.normalize();
const by=n=>state.officers.find(o=>o.name===n);
assert.deepEqual([by('河田陽菜').lead,by('河田陽菜').war,by('河田陽菜').int,by('河田陽菜').pol,by('河田陽菜').cha],[82,88,51,64,93],'late-join Kawata must use canonical base + actual INT +2 only');
assert.deepEqual(state.rogue.rosterBaseV7['河田陽菜'],{lead:82,war:88,int:49,pol:64,cha:93},'legacy random base must be overwritten');
assert.deepEqual([by('大野愛実').lead,by('大野愛実').war,by('大野愛実').int,by('大野愛実').pol,by('大野愛実').cha],[97,100,84,84,99],'fifth-gen canonical base + equipment must apply exactly once');
for(let i=0;i<20;i++)api.normalize();
assert.equal(by('河田陽菜').int,51,'normalization must not stack run bonus');
assert.equal(by('大野愛実').war,100,'equipment must not stack');
state.battle=null;window.beginBattle();
const ku=state.battle.units.find(u=>u.name==='河田陽菜'),ou=state.battle.units.find(u=>u.name==='大野愛実');
assert.equal(ku.int,51,'battle unit must receive fixed base + run bonus');
assert.equal(ou.war,100,'battle unit must receive fixed base + equipment');
console.log('ROGUE fixed roster v8 tests: PASS');
