const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const noop=()=>{};
const ctx={console,Math,JSON,Date,Set,Map,Number,String,Object,Array,Boolean,Error,parseInt,parseFloat,isNaN,
 alert:noop,confirm:()=>true,setTimeout:()=>0,clearTimeout:noop,
 document:{addEventListener:noop,querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null,createElement:()=>({style:{},classList:{add:noop},appendChild:noop}),head:{appendChild:noop}},
 modalCard:{querySelectorAll:()=>[],querySelector:()=>null},showModal:noop,closeModal:noop,log:noop,
 beginGame:noop,render:noop,endMonth:noop,battleAction:noop,checkBattleEnd:()=>false,afterPlayerAction:noop,
 V246_SKILLS:{},state:null
};ctx.window=ctx;vm.createContext(ctx);
function load(name){vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name})}
load('v24_58_fifth_data.js');load('v24_59_fifth_skills.js');load('v24_60_fifth_event.js');load('v24_61_tactic_limit_guard.js');load('v24_62_adviser_guard.js');
function citySnapshot(){return JSON.stringify(Object.fromEntries(Object.entries(ctx.state.cities).map(([n,c])=>[n,{force:c.force,troops:c.troops,morale:c.morale}])))}
ctx.state={modeId:'mikuni',selected:'上党',cities:{上党:{name:'上党',force:'日向軍',troops:5000,morale:70},洛陽:{name:'洛陽',force:'董卓',troops:6000,morale:65}},officers:[{name:'髙橋未来虹',force:'日向軍',city:'上党',status:'君主',int:84}],battle:null};
let before=citySnapshot(),sel=ctx.state.selected;ctx.V2458.apply();
assert.equal(ctx.V2458.FIFTH.length,10);assert.equal(new Set(ctx.V2458.FIFTH.map(x=>x.name)).size,10);assert.equal(citySnapshot(),before,'五期生データ追加で都市状態が変化');assert.equal(ctx.state.selected,sel,'五期生データ追加で選択都市が変化');
assert.equal(ctx.V2459.NAMES.size,10,'五期生固有技が10人に紐付いていない');
function battleFor(name){const f=ctx.state.officers.find(o=>o.name===name);const p={name,side:'player',troops:3000,max:3000,war:f.war,int:f.int,lead:f.lead,morale:70,x:0,y:0,done:false,specialUsed:false};const e={name:'敵将',side:'enemy',troops:3000,max:3000,war:70,int:70,lead:70,morale:70,x:1,y:0,done:false};ctx.state.battle={selected:name,day:1,units:[p,e],logs:[]};return {p,e,b:ctx.state.battle}}
let t=battleFor('片山紗希');ctx.V2459.execute(t.p,t.e);assert(t.e.troops<3000,'片山固有技が敵兵を減らさない');assert(t.p.specialUsed,'固有技使用済みが付かない');
t=battleFor('大野愛実');const war0=t.p.war;ctx.V2459.execute(t.p);assert(t.p.war>war0,'五期の旗印の攻勢強化が付かない');assert(t.p.morale>70,'五期の旗印の士気上昇が付かない');
t=battleFor('高井俐香');ctx.V2459.execute(t.p);assert.equal(t.b.playerGuardTurns,1,'慧眼の陣が既存防御フラグへ接続されていない');
t=battleFor('松尾桜');const ally={name:'味方',side:'player',troops:2000,max:2000,war:60,int:60,lead:60,morale:60,x:0,y:1,done:true};t.b.units.push(ally);ctx.V2459.execute(t.p,null,ally);assert.equal(ally.done,false,'桜花指揮で再行動にならない');
ctx.state.battle=null;ctx.state.officers.filter(o=>ctx.V2458.NAMES.has(o.name)).forEach(o=>o.force='日向軍');before=JSON.stringify(Object.fromEntries(Object.entries(ctx.state.cities).map(([n,c])=>[n,c.force])));sel=ctx.state.selected;assert(ctx.V2460.check(),'五期生集結イベントが発火しない');assert.equal(JSON.stringify(Object.fromEntries(Object.entries(ctx.state.cities).map(([n,c])=>[n,c.force]))),before,'集結イベントが都市所有権を変更');assert.equal(ctx.state.selected,sel,'集結イベントが選択都市を変更');
assert(ctx.V2461.selfTest(),'戦場計略4/3/2/1回テスト失敗');assert.equal(ctx.V2461.limit(100),4);assert.equal(ctx.V2461.limit(95),3);assert.equal(ctx.V2461.limit(85),2);assert.equal(ctx.V2461.limit(75),1);
ctx.state.rulerName='髙橋未来虹';ctx.state.officers.push({name:'森本茉莉',force:'日向軍',city:'上党',status:'軍師',int:82},{name:'上村ひなの',force:'日向軍',city:'上党',status:'一般',int:95});ctx.state.advisers={日向軍:'森本茉莉'};before=citySnapshot();sel=ctx.state.selected;const adv=ctx.V2462.sync();assert.equal(adv.name,'森本茉莉');assert.equal(ctx.state.advisers['日向軍'],'森本茉莉');assert.equal(citySnapshot(),before,'軍師同期が都市状態を変更');assert.equal(ctx.state.selected,sel,'軍師同期が選択都市を変更');

// Defending commander: starts on the keep exactly once, then remains free to move.
ctx.V2439={defenderSide:b=>b.defense?'player':'enemy',CX:7,CY:6};load('v24_65_commander_start.js');
const commander={name:'守将',side:'enemy',troops:3000,x:9,y:6,done:false,movedThisTurn:false,movedDistance:0};
const centerGuard={name:'副将',side:'enemy',troops:2500,x:7,y:6,done:false,movedThisTurn:false,movedDistance:0};
ctx.state.battle={v2439LargeSiege:true,v2439DeploymentDone:true,v2436Commanders:{enemy:'守将'},defense:false,day:1,phase:'player',units:[commander,centerGuard],logs:[]};
assert(ctx.V2465.putCommanderAtKeep(ctx.state.battle),'総大将の初期本丸配置が実行されない');assert.equal(commander.x,7);assert.equal(commander.y,6);assert.equal(centerGuard.x,9);assert.equal(centerGuard.y,6);
commander.x=8;commander.y=6;assert.equal(ctx.V2465.putCommanderAtKeep(ctx.state.battle),false,'初期配置後に総大将を本丸へ再固定している');assert.equal(commander.x,8,'総大将が移動後に本丸へ戻された');
const battleSrc=fs.readFileSync(path.join(root,'v24_39_battle.js'),'utf8');assert(battleSrc.includes("if(b.v2436Commanders?.[u.side]===u.name)return false;"),'守備総大将がAI待機固定の対象外になっていない');

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const bad of ['v24_43_patch.js','v24_51_retreatfix.js','v24_53_defense_guard.js','v24_54_state_recovery.js','v24_55_city_select_fix.js'])assert(!index.includes(bad),`危険な旧パッチが再読込: ${bad}`);
for(const good of ['v24_57_mikuni_mode.js','v24_58_fifth_data.js','v24_59_fifth_skills.js','v24_60_fifth_event.js','v24_61_tactic_limit_guard.js','v24_62_adviser_guard.js','v24_65_commander_start.js'])assert(index.includes(good),`必要パッチ未読込: ${good}`);
console.log('regression_test: PASS');
