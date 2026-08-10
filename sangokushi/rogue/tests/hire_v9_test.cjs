const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window={HINATA_CANONICAL_STATS:{'上村ひなの':{},'河田陽菜':{},'小坂菜緒':{}},V2447:{currentStrategist:()=>({name:'上村ひなの',int:95})}};
global.state={selected:'上党',officers:[
 {name:'上村ひなの',force:'日向軍',city:'上党',status:'軍師',cha:91,loy:100},
 {name:'河田陽菜',force:'曹操',city:'許昌',status:'一般',cha:93,loy:72},
 {name:'夏侯惇',force:'曹操',city:'陳留',status:'一般',cha:80,loy:84},
 {name:'曹操',force:'曹操',city:'許昌',status:'君主',cha:95,loy:100},
 {name:'在野A',force:'在野',city:'上党',status:'在野',cha:50,loy:40},
 {name:'在野B',force:'在野',city:'洛陽',status:'在野',cha:50,loy:40},
 {name:'戦利品A',force:'退場',city:'',status:'戦利品',cha:50,loy:0}
]};
const src=fs.readFileSync('sangokushi/rogue/rogue_hire_v9.js','utf8');vm.runInThisContext(src,{filename:'rogue_hire_v9.js'});
const api=window.HINATA_ROGUE_HIRE_V9_API;assert(api,'v10 hire API missing');
const names=api.candidatePool(state).map(x=>x.name);
assert(names.includes('河田陽菜'),'remote enemy Hinata member must be recruitable');
assert(names.includes('夏侯惇'),'remote enemy historical officer must be recruitable/convertible');
assert(names.includes('在野A'),'local ronin must be recruitable');
assert(!names.includes('在野B'),'remote ronin must not be recruitable');
assert(!names.includes('曹操'),'enemy ruler must not be recruitable');
assert(!names.includes('上村ひなの'),'own officer must not be recruitable');
assert(!names.includes('戦利品A'),'converted historical officer must not return');
const actor={cha:91},target={force:'曹操',loy:72};const chance=api.successChance(actor,target);
assert(Number.isInteger(chance)&&chance>=5&&chance<=99,'displayed chance must be exact integer probability');
const advice=api.adviceFor(actor,target);assert.strictEqual(advice.name,'上村ひなの');assert.strictEqual(advice.chance,chance);assert(advice.text.includes(`成功見込 ${chance}%`),'advice must show the exact roll probability');
const high={cha:999},easy={force:'在野',loy:1};assert.strictEqual(api.successChance(high,easy),99,'normal recruitment must cap at 99%');
assert.deepStrictEqual(api.rollRecruit(99,()=>0.989),{chance:99,roll:99,ok:true});
assert.deepStrictEqual(api.rollRecruit(99,()=>0.999999),{chance:99,roll:100,ok:false},'99% must fail only on roll 100');
const master={cha:1,rogueTraits:[{id:'recruit100'}]};assert.strictEqual(api.successChance(master,{force:'曹操',loy:100}),100,'recruit100 trait must force 100%');
assert.deepStrictEqual(api.rollRecruit(100,()=>0.999999),{chance:100,roll:100,ok:true},'100% must never fail');
console.log('ROGUE v0.10 exact recruitment regression: PASS');
