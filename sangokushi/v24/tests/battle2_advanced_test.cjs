const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),noop=()=>{};
const doc={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:noop,createElement:()=>({className:'',style:{},appendChild:noop,remove:noop}),head:{appendChild:noop}};
const ctx={console,Math,JSON,Date,Set,Map,Number,String,Object,Array,Boolean,Error,parseInt,parseFloat,isNaN,document:doc,alert:noop,log:noop,setTimeout:noop,clearTimeout:noop,
 render:noop,afterPlayerAction:noop,battleAction:noop,endMonth:noop,checkBattleEnd:()=>false,
 V246_SKILLS:{},V2468:{},state:null};ctx.window=ctx;
ctx.V2439={
 normalDamage:()=>({damage:100,notes:[]}),typeOf:u=>u.type||u.apt||'剣盾兵',attackerSide:b=>b.defense?'enemy':'player',defenderSide:b=>b.defense?'player':'enemy',keepCell:()=>({x:7,y:6}),attackRange:u=>u.type==='弩兵'?3:1,
 living:(b,s)=>(b.units||[]).filter(u=>u.side===s&&!u.v2436Structure&&!u.v2468Routed&&u.troops>0),occupiedAt:(b,x,y)=>(b.units||[]).find(u=>u.troops>0&&u.x===x&&u.y===y)||null,
 pathToGoals:(b,u,goals)=>goals?.length?[{x:goals[0].x,y:goals[0].y}]:[],goalsNearTarget:(b,u,t)=>[{x:Math.max(0,t.x-1),y:t.y}],moveEnemyAlong:(b,u,path)=>{const p=path[path.length-1];u.x=p.x;u.y=p.y;u.movedThisTurn=true;return true},enemyAttack:(b,u,t)=>{t.troops=Math.max(0,t.troops-100)},checkKeepVictory:()=>false,
 enemyAct:(b,u)=>{u._baseActed=true}
};
ctx.V2468={ensure:()=>true,objective:(b,id)=>(b.v2468Objectives||[]).find(o=>o.id===id)||null,supplyBroken:(b,s)=>{const camp=(b.v2468Objectives||[]).find(o=>o.id==='camp');return s===(b.defense?'enemy':'player')&&camp&&camp.owner!==s},syncMoves:noop,captureAt:(b,u)=>{for(const o of b.v2468Objectives||[])if(o.x===u.x&&o.y===u.y)o.owner=u.side},changeMorale:(b,u,d)=>u.morale=Math.max(0,Math.min(100,(u.morale||60)+d))};
vm.createContext(ctx);function load(n){vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),ctx,{filename:n})}
load('v24_70_spirit.js');
let p={name:'髙橋未来虹',side:'player',troops:3000,max:3000,morale:60,x:7,y:6,done:false,war:90,int:84,type:'槍兵'},ally={name:'上村ひなの',side:'player',troops:2500,max:2500,morale:55,x:7,y:7,done:false,war:52,int:95,type:'弩兵'},enemy={name:'敵将',side:'enemy',troops:3000,max:3000,morale:60,x:10,y:6,done:false,type:'槍兵'};
ctx.state={turn:1,cities:{上党:{force:'日向軍'},洛陽:{force:'董卓'}},relations:{董卓:0},officers:[],battle:{v2439LargeSiege:true,v2439DeploymentDone:true,defense:false,day:1,phase:'player',selected:p.name,v2436Commanders:{player:p.name,enemy:enemy.name},units:[p,ally,enemy],v2468Objectives:[{id:'camp',name:'攻城軍本陣',x:1,y:6,owner:'player'},{id:'granary',name:'兵糧庫',x:6,y:7,owner:'enemy'},{id:'tower',name:'櫓',x:5,y:4,owner:'enemy'}],logs:[]}};
assert(ctx.V246_SKILLS['髙橋未来虹'],'髙橋未来虹の大将の器が登録されていない');ctx.V2470.ensure(ctx.state.battle);assert.equal(p.v2470Spirit,50,'総大将の初期戦意が想定外');
p.v2470Spirit=80;const m0=ally.morale;assert(ctx.V2470.mikuniSkill(p),'大将の器が発動しない');assert(p.specialUsed,'大将の器が使用済みにならない');assert.equal(p.v2470Spirit,10,'大将の器で戦意70を消費しない');assert.equal(ally.morale,m0+10,'大将の器で全軍士気が上がらない');assert.equal(ctx.state.battle.v2470MikuniAuraDay,1,'大将の器の攻撃強化ターンが付かない');assert.equal(ctx.V2439.normalDamage(p,enemy,ctx.state.battle).damage,115,'大将の器の攻撃15%強化が実ダメージ式に乗らない');
// Spirit grows from battlefield achievements.
p.specialUsed=false;p.done=false;p.v2470Spirit=45;ctx.state.battle.v2470Troops={髙橋未来虹:3000,上村ひなの:2500,敵将:3000};enemy.troops=2400;ctx.V2470.syncEvents(ctx.state.battle,p.name);assert(p.v2470Spirit>45,'敵への損害で戦意が上がらない');
load('v24_71_links.js');p.x=5;p.y=5;ally.x=6;ally.y=5;ctx.state.battle.v2470MikuniAuraDay=0;assert.equal(ctx.V2471.linkedAllies(ctx.state.battle,p).length,1,'三期生連携の距離判定が機能しない');assert.equal(ctx.V2439.normalDamage(p,enemy,ctx.state.battle).damage,110,'連携の通常攻撃10%強化が乗らない');ally.x=10;assert.equal(ctx.V2471.linkedAllies(ctx.state.battle,p).length,0,'遠距離でも連携している');ally.x=6;ally.y=5;p.morale=20;ctx.V2471.steadyLowMorale(ctx.state.battle);assert.equal(p.morale,26,'連携で低士気を支えられない');
load('v24_72_objective_ai.js');
// Enemy attacking: lost camp must be highest priority.
let ai={name:'敵総大将',side:'enemy',troops:3000,morale:70,x:13,y:6,type:'騎兵'},def={name:'守備',side:'player',troops:2500,morale:70,x:7,y:6,type:'槍兵'};
let b={v2439LargeSiege:true,v2439DeploymentDone:true,defense:true,day:1,v2436Commanders:{enemy:ai.name,player:def.name},units:[ai,def],v2468Objectives:[{id:'camp',x:12,y:6,owner:'player',name:'攻城軍本陣'},{id:'granary',x:6,y:7,owner:'player',name:'兵糧庫'},{id:'tower',x:5,y:4,owner:'player',name:'櫓'}],logs:[]};ctx.state.battle=b;assert.equal(ctx.V2472.chooseObjective(b,ai).o.id,'camp','攻城AIが失った補給本陣を最優先しない');
// Enemy defending: lost granary must be highest priority.
ai={name:'守将',side:'enemy',troops:3000,morale:70,x:9,y:6,type:'槍兵'};def={name:'攻城兵',side:'player',troops:2500,morale:70,x:1,y:6,type:'槍兵'};b={v2439LargeSiege:true,v2439DeploymentDone:true,defense:false,day:1,v2436Commanders:{enemy:ai.name,player:def.name},units:[ai,def],v2468Objectives:[{id:'camp',x:1,y:6,owner:'player',name:'攻城軍本陣'},{id:'granary',x:6,y:7,owner:'player',name:'兵糧庫'},{id:'tower',x:5,y:4,owner:'enemy',name:'櫓'}],logs:[]};ctx.state.battle=b;assert.equal(ctx.V2472.chooseObjective(b,ai).o.id,'granary','守備AIが失った兵糧庫を最優先しない');
// Strategic pressure tiers and ownership safety.
ctx.state.battle=null;ctx.state.turn=20;ctx.state.logs=[];ctx.state.relations={曹操:0};ctx.state.aiCoalitionUntil=0;ctx.state.v2473NextCoalition=0;
ctx.endMonth=()=>{ctx.state.turn++;};load('v24_73_pressure.js');assert.equal(ctx.V2473.tierFor(3),0);assert.equal(ctx.V2473.tierFor(4),1);assert.equal(ctx.V2473.tierFor(7),2);assert.equal(ctx.V2473.tierFor(11),3);
function makeCities(n){const cs={};for(let i=0;i<n;i++)cs['日'+i]={name:'日'+i,force:'日向軍',troops:4000,morale:70,n:[]};cs['敵前']={name:'敵前',force:'曹操',troops:5000,morale:70,n:['日0','敵後']};cs['敵後']={name:'敵後',force:'曹操',troops:10000,morale:70,n:['敵前']};cs['日0'].n=['敵前'];return cs}
ctx.state.cities=makeCities(4);let ownership=JSON.stringify(Object.fromEntries(Object.entries(ctx.state.cities).map(([n,c])=>[n,c.force])));assert.equal(ctx.V2473.preparePressure(),1);ctx.V2473.consolidateFronts(1);assert.equal(JSON.stringify(Object.fromEntries(Object.entries(ctx.state.cities).map(([n,c])=>[n,c.force]))),ownership,'警戒態勢が都市所有権を変更した');assert(ctx.state.cities['敵前'].troops>5000,'敵が後方兵を国境へ集中しない');
ctx.state.cities=makeCities(7);ctx.state.aiCoalitionUntil=0;ctx.state.v2473NextCoalition=0;assert.equal(ctx.V2473.preparePressure(),2);assert(ctx.state.aiCoalitionUntil>ctx.state.turn,'7城で包囲網が発動しない');
ctx.state.cities=makeCities(11);ctx.state.aiCoalitionUntil=0;ctx.state.v2473NextCoalition=0;assert.equal(ctx.V2473.preparePressure(),3);assert(ctx.state.aiCoalitionUntil>=ctx.state.turn+12,'11城で決戦包囲網が12か月続かない');
console.log('battle2_advanced_test: PASS');
