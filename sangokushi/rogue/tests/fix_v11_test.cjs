const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('sangokushi/rogue/rogue_fix_v11.js','utf8');
const css=fs.readFileSync('sangokushi/rogue/rogue.css','utf8');
global.window={
 HINATA_CANONICAL_STATS:{'上村ひなの':{}},
 HINATA_ROGUE_HIRE_V9_API:{
  isHinata:n=>n==='上村ひなの',
  candidatePool:()=>[],
  successChance:()=>77,
  rollRecruit:(chance,rng=Math.random)=>{const roll=Math.floor(rng()*100)+1;return{chance,roll,ok:roll<=chance}}
 },
 HINATA_ROGUE_SPECIAL_V10_API:{hasTrait:(o,id)=>(o?.rogueTraits||[]).some(t=>(typeof t==='string'?t:t.id)===id)},
 v241Advice:(actual,subject)=>({a:{name:'軍師',int:88},text:`shared:${actual}:${subject}`}),
 V2432:{terrainAt:()=> 'plain'}
};
global.state={rogue:{},officers:[{name:'上村ひなの',force:'日向軍',status:'一般',rogueTraits:[{id:'clone',name:'分身'}]}]};
vm.runInThisContext(src,{filename:'rogue_fix_v11.js'});
const api=window.HINATA_ROGUE_FIX_V11_API;assert(api,'v11 API missing');
const ad=api.sharedAdvice({ok:true},{name:'上村ひなの'});assert(ad.text.includes('shared:true:上村ひなのの登用'),'recruitment must use shared v241 adviser forecast');
const b={phase:'player',day:1,units:[{name:'上村ひなの',side:'player',troops:1000,max:1000,x:1,y:1,war:91,int:65,lead:78},{name:'敵',side:'enemy',troops:1000,max:1000,x:7,y:5}],logs:['秘伝「分身」発動。旧自動分身'],v2439LargeSiege:false};
b.units.push({name:'上村ひなの・分身',side:'player',troops:450,max:450,x:2,y:1,v10Clone:true,rogueCloneOf:'上村ひなの'});
assert.strictEqual(api.stripAutomaticClones(b),1,'old automatic clone must be removed');
assert(!b.units.some(u=>u.v10Clone),'automatic clone survived migration');
const original=b.units.find(u=>u.name==='上村ひなの');const clone=api.spawnClone(b,original);
assert(clone,'clone command must create a selectable unit');assert.strictEqual(clone.troops,450,'clone must have 45% current troops');assert.strictEqual(clone.rogueCloneOf,'上村ひなの');assert.strictEqual(clone.v11Clone,true);assert.strictEqual(api.spawnClone(b,original),null,'clone must be once per battle');
assert(src.includes("btn.textContent='分身'"),'visible clone battle button missing');
assert(src.includes("window.v241Advice(!!result.ok,subject)"),'shared adviser system hook missing');
assert(!src.includes('成功見込 ${p}%'),'v11 must not use the old direct-probability adviser UI');
assert(css.includes('padding-bottom:calc(160px + env(safe-area-inset-bottom))'),'page bottom safe room missing');
assert(css.includes('padding-bottom:calc(150px + env(safe-area-inset-bottom))'),'modal bottom scroll room missing');
console.log('ROGUE v0.11 clone/adviser/mobile regression: PASS');
require('./capture_v13_test.cjs');
