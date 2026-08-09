const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),noop=()=>{};
const fakeNode=()=>({className:'',textContent:'',title:'',style:{},appendChild:noop,insertBefore:noop,querySelector:()=>null,querySelectorAll:()=>[],parentElement:null});
const ctx={console,Math,JSON,Date,Set,Map,Number,String,Object,Array,Boolean,Error,parseInt,parseFloat,isNaN,
 alert:noop,confirm:()=>true,setTimeout:f=>{f();return 0},clearTimeout:noop,
 document:{querySelectorAll:()=>[],querySelector:()=>null,createElement:fakeNode,head:{appendChild:noop}},
 modalCard:{querySelector:()=>null,querySelectorAll:()=>[]},showModal:noop,closeModal:noop,log:noop,
 render:noop,afterPlayerAction:noop,checkBattleEnd:()=>false,endBattle:noop,battleAction:noop,v243ChooseType:noop,
 V2432:{alive(side){return ctx.state.battle.units.filter(u=>u.side===side&&u.troops>0)},officerOfUnit(u){return ctx.state.officers.find(o=>o.name===u.name)}},
 V2439:{attackerSide:b=>b.defense?'enemy':'player',defenderSide:b=>b.defense?'player':'enemy',typeOf:u=>u.type||'剣盾兵',terrainAt:()=> 'plain',keepCell:()=>({x:7,y:6}),normalDamage:()=>({damage:100,notes:[]}),enemyAct:noop,pathToGoals:()=>[],moveEnemyAlong:noop,occupiedAt:(b,x,y)=>b.units.find(u=>u.troops>0&&u.x===x&&u.y===y)||null},state:null
};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'v24_68_battle2.js'),'utf8'),ctx,{filename:'v24_68_battle2.js'});
ctx.state={turn:10,selected:'上党',cities:{上党:{force:'日向軍',troops:5000},洛陽:{force:'敵',troops:6000}},officers:[{name:'敵将',force:'敵',city:'洛陽',loy:45,status:'一般'}],v2424Moles:{},battle:{v2439LargeSiege:true,v2439DeploymentDone:true,v2439Direction:'west',defense:false,target:'洛陽',src:'上党',day:1,phase:'player',v2436Commanders:{player:'味方将',enemy:'敵将'},units:[{name:'味方将',side:'player',troops:3000,max:3000,morale:70,x:0,y:6,type:'槍兵'},{name:'敵将',side:'enemy',troops:3000,max:3000,morale:70,x:7,y:6,type:'剣盾兵'}],logs:[]}};
const b=ctx.state.battle,cityBefore=JSON.stringify(ctx.state.cities);assert(ctx.V2468.ensure(b));assert.equal(b.v2468Objectives.length,3,'戦場拠点が3種生成されない');
b.units[1].troops=2100;ctx.V2468.syncDamageMorale(b);assert(b.units[1].morale<70,'兵損で士気が下がらない');
ctx.V2468.changeMorale(b,b.units[1],-100,'test');assert(b.units[1].v2468Routed,'低士気で潰走しない');assert.equal(b.units[1].troops,0,'潰走部隊が戦場に残る');assert(b.units[1].v2468RoutedTroops>0,'潰走時の残存兵を保存していない');
const raider={name:'敵騎兵',side:'enemy',troops:2000,max:2000,morale:70,x:1,y:6,type:'騎兵'};b.units.push(raider);ctx.V2468.ensure(b);const camp=ctx.V2468.objective(b,'camp');raider.x=camp.x;raider.y=camp.y;ctx.V2468.captureAt(b,raider);assert.equal(camp.owner,'enemy','攻城軍本陣を守備側が奪取できない');assert(ctx.V2468.supplyBroken(b,'player'),'本陣喪失で攻城側の補給が切れない');
const mole={name:'伏毒将',side:'enemy',troops:2000,max:2000,morale:70,x:8,y:6,type:'剣盾兵'};b.units.push(mole);ctx.state.officers.push({name:'伏毒将',force:'敵',city:'洛陽',loy:50,status:'一般',v2424MoleId:'m1'});ctx.state.v2424Moles={m1:{id:'m1',target:'伏毒将',force:'敵'}};delete b._v2424MolesChecked;ctx.V2468.applyMoleSabotage(b);assert.equal(mole.side,'enemy','伏毒で部隊が丸ごと日向軍へ寝返っている');assert(mole.troops<2000,'伏毒で離脱兵が発生しない');assert(mole.morale<=35,'伏毒で士気が十分下がらない');assert(mole.v2468BetrayVulnerable,'伏毒後に裏切り説得が通りやすくならない');assert(!ctx.state.v2424Moles.m1,'発動済み伏毒約定が残る');
const actor={name:'策士',side:'player',int:100,x:7,y:5,troops:1000,morale:70};b.units.push(actor);b.selected='策士';const loyal={name:'高忠',side:'enemy',int:50,x:7,y:6,troops:1000,morale:70};ctx.state.officers.push({name:'高忠',force:'敵',city:'洛陽',loy:95,status:'一般'});assert.equal(ctx.V2468.betrayChance(actor,loyal),0,'忠誠90以上が裏切り対象になる');assert.equal(ctx.V2468.betrayChance(actor,b.units.find(u=>u.name==='敵将')),0,'総大将が裏切り対象になる');
assert.equal(JSON.stringify(ctx.state.cities),cityBefore,'戦闘2.0処理が都市所有権・都市兵力を書き換えた');
const commanderCompat=fs.readFileSync(path.join(root,'v24_42_patch.js'),'utf8');assert(!commanderCompat.includes('ここを動かず城を守る'),'旧総大将永久固定ロジックが残っている');assert(commanderCompat.includes('disabledPermanentKeepLock:true'),'総大将固定解除の互換フラグがない');
console.log('battle2_test: PASS');
