const assert=require('assert');
global.window=global;
global.document={
 querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null,
 createElement:()=>({textContent:'',className:'',id:'',appendChild(){},querySelectorAll:()=>[]}),head:{appendChild(){}}
};
global.setTimeout=(fn)=>{fn();return 1};
global.HINATA_START=[];
global.HINATA_WORLD=[];
global.V2458={FIFTH:[]};
global.HINATA_ROGUE_STAT_V6={FIXED_BASE:{
 '上村ひなの':{lead:78,war:91,int:65,pol:84,cha:91}
}};
global.HINATA_ROGUE_RULES={UPGRADE_POOL:[]};
global.HINATA_CANONICAL_STATS={
 '上村ひなの':{lead:78,war:91,int:65,pol:84,cha:91}
};
global.render=()=>true;
global.beginBattle=function(){state.battle={units:[{name:'上村ひなの',side:'player',lead:1,war:1,int:1}]};return true};
global.state={modeId:'rogue',turn:3,rogue:{upgradeIds:{},mods:{}},logs:[
 '【190年3月】関羽を武力の強化素材として消費。上村ひなのの武力＋4。',
 '【190年2月】張飛を武力の強化素材として消費。上村ひなのの武力＋4。'
],officers:[{name:'上村ひなの',force:'日向軍',status:'一般',lead:78,war:91,int:65,pol:84,cha:91}],battle:null};
require('../rogue_roster_stats_v7.js');
require('../rogue_fixed_roster_v8.js');
const v7=global.HINATA_ROGUE_ROSTER_V7,v8=global.HINATA_ROGUE_FIXED_V8;
assert(v7&&v8,'ROGUE stat engines missing');
v8.normalize();
const h=state.officers[0];
assert.equal(v7.materialBonus('上村ひなの').war,8,'two explicit WAR +4 materials must total +8');
assert.equal(h.war,99,'Hinano base WAR 91 + two WAR +4 materials must equal 99');
assert.equal(h.rogueRunBonusV8.war,8,'display/run ledger must show WAR +8 only');
for(let i=0;i<20;i++)v8.normalize();
assert.equal(h.war,99,'repeated normalization must not stack or erase +8');
global.state=JSON.parse(JSON.stringify(global.state));v8.normalize();
assert.equal(state.officers[0].war,99,'save/load-shaped state must preserve exact 99');
state.battle=null;window.beginBattle();v8.normalize();
assert.equal(state.battle.units[0].war,99,'battle unit WAR must also be 99');
console.log('ROGUE double material +4 +4 test: PASS');
