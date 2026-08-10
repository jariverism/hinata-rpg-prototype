const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('sangokushi/rogue/rogue_special_v10.js','utf8');
for(const id of ['double_attack','double_move','double_domestic','clone','recruit100','inspire','reinforcement','guard'])assert(src.includes(`${id}:`)||src.includes(`'${id}'`),`missing trait ${id}`);
for(const [name,id] of [['曹操','double_domestic'],['関羽','double_attack'],['呂布','double_attack'],['諸葛亮','recruit100'],['趙雲','double_move'],['司馬懿','recruit100']])assert(src.includes(`'${name}':'${id}'`),`famous trait mapping missing: ${name}`);
assert(src.includes('秘伝化：${t.name}'),'capture/recruit conversion must offer secret-art inheritance');
assert(src.includes("intent.kind==='attack'&&hasTrait(o,'double_attack')"),'double attack activation missing');
assert(src.includes("hasTrait(o,'double_move')"),'double move activation missing');
assert(src.includes("hasTrait(o,'double_domestic')"),'double domestic action missing');
assert(src.includes("new Set(['farm','commerce','flood','patrol','recruit','train','search','reward'])"),'domestic command scope changed unexpectedly');

global.document={
 addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},
 createElement(){return{dataset:{},style:{},appendChild(){},set textContent(v){this._t=v},get textContent(){return this._t}}},
 head:{appendChild(){}}
};
global.window={
 HINATA_CANONICAL_STATS:{'テスト日向':{}},
 showModal(){},beginBattle(){},afterPlayerAction(){},render(){},
 V2439:{terrainAt:()=> 'plain'},V2432:{terrainAt:()=> 'plain'}
};
global.state={rogue:{},year:190,month:1,turn:1,officers:[{
 name:'テスト日向',force:'日向軍',status:'一般',rogueTraits:[
  {id:'clone',name:'分身'},{id:'inspire',name:'鼓舞'},{id:'reinforcement',name:'援軍'},{id:'guard',name:'守護'}
 ]
}],battle:null,logs:[]};
global.closeModal=()=>{};global.log=()=>{};global.render=()=>{};
vm.runInThisContext(src,{filename:'rogue_special_v10.js'});
const api=window.HINATA_ROGUE_SPECIAL_V10_API;assert(api,'v10 special API missing');
assert.strictEqual(api.traitForSource('曹操').id,'double_domestic');
assert.strictEqual(api.traitForSource('関羽').id,'double_attack');
assert.strictEqual(api.traitForSource('趙雲').id,'double_move');
const b={day:1,phase:'player',logs:[],units:[{name:'テスト日向',side:'player',troops:1000,max:1000,x:0,y:0,morale:60,done:false,movedThisTurn:false}]};
state.battle=b;api.applyBattleStartTraits(b);
const main=b.units.find(u=>u.name==='テスト日向'),clone=b.units.find(u=>u.rogueCloneOf==='テスト日向');
assert.strictEqual(main.troops,1300,'reinforcement must add 30% troops');
assert(clone,'clone unit must spawn');
assert.strictEqual(clone.troops,585,'clone must use 45% of post-reinforcement troops');
assert.strictEqual(main.morale,68,'inspire must add 8 morale');
assert.strictEqual(clone.morale,68,'clone should share inspired morale');
assert.strictEqual(b.playerGuardTurns,1,'guard must enable first enemy-phase damage reduction');
assert(b.logs.some(x=>x.includes('援軍'))&&b.logs.some(x=>x.includes('分身'))&&b.logs.some(x=>x.includes('鼓舞'))&&b.logs.some(x=>x.includes('守護')),'battle trait logs missing');
console.log('ROGUE v0.10 inherited special ability regression: PASS');
