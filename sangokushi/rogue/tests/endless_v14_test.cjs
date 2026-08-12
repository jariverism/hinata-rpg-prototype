const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('sangokushi/rogue/rogue_endless_v14.js','utf8');
let modals=[],renders=0;
global.window={};
global.state={turn:11,year:190,month:11,rogue:{mode:'endless',deadline:null,finalBossCity:null,finalCleared:false,rewardQueue:[]},logs:[]};
global.log=s=>state.logs.unshift(s);
global.render=()=>{renders++};window.render=global.render;
window.showModal=html=>{modals.push(String(html))};
window.endMonth=function(){
 if(state?.rogue?.ended)return;
 if(Number(state.turn)>=12&&state.rogue.finalBossCity&&!state.rogue.finalCleared){state.rogue.ended=true;return 'ended'}
 state.turn++;
 if(state.turn===12){state.rogue.finalBossCity='鄴';state.logs.unshift('最終決戦発生！ 鄴を攻略せよ。');window.showModal('<h2>最終決戦：鄴</h2>')}
 return state.turn;
};
vm.runInThisContext(src,{filename:'rogue_endless_v14.js'});
const api=window.HINATA_ROGUE_ENDLESS_V14_API;assert(api,'v14 API missing');
assert.strictEqual(api.nextEndlessGrowthTurn(13),true);assert.strictEqual(api.nextEndlessGrowthTurn(16),true);assert.strictEqual(api.nextEndlessGrowthTurn(14),false);
api.setRunMode(state,api.MODE_ENDLESS,{silent:true});
window.endMonth();
assert.strictEqual(state.turn,12,'endless must reach month 12');
assert.strictEqual(state.rogue.ended,undefined,'endless must not end at month 12');
assert.strictEqual(state.rogue.finalBossCity,null,'endless must clear forced final boss');
assert.strictEqual(modals.length,0,'endless must suppress final-boss modal');
assert(!state.logs.some(x=>String(x).includes('最終決戦発生！')),'endless must remove final-boss log');
window.endMonth();
assert.strictEqual(state.turn,13,'endless must continue to month 13');
assert(state.rogue.rewardQueue.some(x=>x.type==='upgrade'&&String(x.reason).includes('13か月目')),'month 13 must add recurring growth');
window.endMonth();assert.strictEqual(state.turn,14,'endless must continue beyond month 13');
// Existing/standard saves remain 12-month mode.
state={turn:12,year:190,month:12,rogue:{mode:'standard',deadline:12,finalBossCity:'鄴',finalCleared:false,rewardQueue:[]},logs:[]};
api.setRunMode(state,api.MODE_STANDARD,{silent:true});
const result=window.endMonth();
assert.strictEqual(result,'ended','standard mode must retain legacy final-boss deadline');
assert.strictEqual(state.rogue.ended,true,'standard mode should end when deadline is missed');
assert(src.includes('このランを無期限モードへ変更'),'existing run conversion button missing');
assert(src.includes('13か月目以降も3か月ごとに成長機会'),'endless start description missing');
console.log('ROGUE v0.14 endless mode regression: PASS');
