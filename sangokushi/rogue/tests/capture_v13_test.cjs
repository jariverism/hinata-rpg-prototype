const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window=global;
global.document={querySelector:()=>null,getElementById:()=>null};
global.beginBattle=()=>{};global.render=()=>{};global.endBattle=()=>{};
global.state={rogue:{},officers:[
 {name:'袁紹',force:'袁紹',status:'一般'},
 {name:'顔良',force:'袁紹',status:'一般'},
 {name:'齊藤京子',force:'袁紹',status:'一般'}
]};
const src=fs.readFileSync('sangokushi/rogue/rogue_capture_guard_v13.js','utf8');
vm.runInThisContext(src,{filename:'rogue_capture_guard_v13.js'});
const api=global.HINATA_ROGUE_CAPTURE_V13_API;assert(api,'v13 API missing');
const b={units:[
 {name:'袁紹',side:'enemy',troops:1000},
 {name:'顔良',side:'enemy',troops:800}
],logs:[]};
api.recordBaseline(b);
assert.deepStrictEqual(new Set(b.rogueV13CaptureBaseline),new Set(['袁紹','顔良']),'battle-start enemy roster must be frozen');
// 袁紹斬首後、戦に出ていなかった齊藤京子が後継君主として battle.units に入ったケース。
global.state.officers.find(o=>o.name==='袁紹').status='死亡';
global.state.officers.find(o=>o.name==='齊藤京子').status='君主';
b.units.push({name:'齊藤京子',side:'enemy',troops:1200});
const changed=api.suppressIneligible(b);
assert.strictEqual(b.units.find(u=>u.name==='袁紹').v2436Structure,true,'executed ruler must not be ROGUE-captured again');
assert.strictEqual(b.units.find(u=>u.name==='齊藤京子').v2436Structure,true,'successor who did not start the battle must not be capture eligible');
assert.notStrictEqual(b.units.find(u=>u.name==='顔良').v2436Structure,true,'actual surviving battle participant must remain capture eligible');
assert.strictEqual(api.suppressionReason(b,b.units.find(u=>u.name==='齊藤京子')),'戦闘開始後に追加');
api.restoreSuppressed(changed);
assert(!b.units.find(u=>u.name==='齊藤京子').v2436Structure,'temporary suppression must be restored after battle processing');
console.log('ROGUE v0.13 ruler-succession capture regression: PASS');
