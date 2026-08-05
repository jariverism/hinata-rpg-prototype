// v24.40 — mutual combat losses, coordinated assaults, and cavalry charges
(()=>{
const V=window.V2432||{},V39=window.V2439||{};
const previousRender=window.render;
const previousBattleAction=window.battleAction;
const previousEnemyPhase=window.enemyPhase;
let largeEnemyTimer=null,legacyMonitor=null;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function isLarge(b){return !!b?.v2439LargeSiege}
function width(b){return isLarge(b)?15:9}
function height(b){return isLarge(b)?13:7}
function typeOf(u){
 if(isLarge(state?.battle)&&typeof V39.typeOf==='function')return V39.typeOf(u);
 if(typeof V.typeOf==='function')return V.typeOf(u);
 const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t;
}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function isStructure(u){return !!u?.v2436Structure}
function living(b,side){
 if(isLarge(b)&&typeof V39.living==='function')return V39.living(b,side);
 return (b?.units||[]).filter(u=>u.side===side&&!isStructure(u)&&Number(u.troops)>0);
}
function occupiedAt(b,x,y){
 if(isLarge(b)&&typeof V39.occupiedAt==='function')return V39.occupiedAt(b,x,y);
 if(typeof V.occupiedAt==='function')return V.occupiedAt(b,x,y);
 return (b?.units||[]).find(u=>!isStructure(u)&&Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y)||null;
}
function terrainCost(b,u,x,y){
 if(isLarge(b)&&typeof V39.terrainCost==='function')return V39.terrainCost(u,x,y,b);
 if(typeof V.terrainCost==='function')return V.terrainCost(u,x,y);
 return 1;
}
function currentPlayer(b){
 if(isLarge(b)&&typeof V39.currentPlayer==='function')return V39.currentPlayer(b);
 if(typeof V.currentUnit==='function')return V.currentUnit();
 return living(b,'player').find(u=>u.name===b.selected&&!u.done)||living(b,'player').find(u=>!u.done)||null;
}
function attackRange(u){return typeOf(u)==='弩兵'?3:1}
function normalTargets(b,u){return living(b,u.side==='player'?'enemy':'player').filter(t=>dist(u,t)<=attackRange(u))}
function normalCalc(b,attacker,target){
 if(isLarge(b)&&typeof V39.normalDamage==='function')return V39.normalDamage(attacker,target,b);
 if(typeof V.normalDamage==='function')return V.normalDamage(attacker,target);
 return {damage:Math.max(1,Math.floor(100+(Number(attacker.war)||50)*2+(Number(attacker.troops)||0)*.03)),notes:[]};
}
function applyDamage(b,target,amount){
 if(isLarge(b)&&typeof V39.applyDamage==='function')return V39.applyDamage(target,amount);
 if(typeof V.applyDamage==='function')return V.applyDamage(target,amount);
 const before=Number(target.troops)||0;target.troops=Math.max(0,before-Math.max(1,Math.floor(amount)));return before-target.troops;
}
function syncExp(actor,target,before){if(typeof V.syncExperience==='function')V.syncExperience(actor,target,before)}
function clearModes(b){b.mode=null;b.v2432Mode=null;delete b.v2440Mode}
function finishPlayerAction(b,units){
 for(const u of units){u.done=true;u.movedDistance=0}
 clearModes(b);
 if(window.checkBattleEnd())return;
 window.afterPlayerAction();
}
function retaliationFactor(attacker,defender,kind){
 if(kind==='charge')return .78;
 if(kind==='volley')return .16;
 return dist(attacker,defender)<=1?.43:.18;
}
function applyRetaliation(b,attacker,defender,base,kind,defenderDefeated=false){
 if(!attacker||Number(attacker.troops)<=0||!defender)return 0;
 let factor=retaliationFactor(attacker,defender,kind);
 if(defenderDefeated)factor*=.58;
 const damage=applyDamage(b,attacker,Math.max(1,base*factor));
 return damage;
}
function changeMorale(u,delta){if(Number.isFinite(Number(u?.morale)))u.morale=clamp(Number(u.morale)+delta,0,100)}

function executeNormalAttack(b,attacker,target){
 if(!attacker||attacker.done||!target||!normalTargets(b,attacker).includes(target))return;
 const targetBefore=Number(target.troops)||0,attackerBefore=Number(attacker.troops)||0;
 const counterBase=normalCalc(b,target,attacker).damage;
 const calc=normalCalc(b,attacker,target),damage=applyDamage(b,target,calc.damage);
 const counter=applyRetaliation(b,attacker,target,counterBase,'normal',Number(target.troops)<=0);
 syncExp(attacker.name,target,targetBefore);
 b.logs.unshift(`${attacker.name}隊が${target.name}隊へ${damage.toLocaleString()}損害。${target.name}隊の迎撃で${attacker.name}隊も${counter.toLocaleString()}損害（${attackerBefore.toLocaleString()}→${Math.max(0,Number(attacker.troops)||0).toLocaleString()}）。${calc.notes?.length?`【${calc.notes.join('・')}】`:''}`);
 finishPlayerAction(b,[attacker]);
}
function adjacentReadyAllies(b,side,target){
 return living(b,side).filter(u=>!u.done&&dist(u,target)===1);
}
function volleyTargets(b,initiator){
 return living(b,'enemy').filter(target=>{
  const allies=adjacentReadyAllies(b,'player',target);
  return allies.length>=2&&allies.includes(initiator);
 });
}
function executeVolley(b,initiator,target){
 const participants=adjacentReadyAllies(b,'player',target);
 if(!initiator||initiator.done||!target||participants.length<2||!participants.includes(initiator))return;
 const before=Number(target.troops)||0;
 const counterBases=new Map(participants.map(u=>[u,normalCalc(b,target,u).damage]));
 let combined=participants.reduce((sum,u)=>sum+normalCalc(b,u,target).damage*.68,0);
 combined*=1+Math.min(.24,(participants.length-2)*.08);
 const damage=applyDamage(b,target,combined);
 const defeated=Number(target.troops)<=0;
 const losses=[];
 for(const u of participants){
  const loss=applyRetaliation(b,u,target,counterBases.get(u)||1,'volley',defeated);
  losses.push(`${u.name}-${loss.toLocaleString()}`);changeMorale(u,2);
 }
 changeMorale(target,-8);syncExp(initiator.name,target,before);
 b.logs.unshift(`一斉攻撃！ ${participants.map(u=>u.name).join('・')}隊が${target.name}隊を包囲し、${damage.toLocaleString()}損害。連携防御により迎撃損害を抑えた（${losses.join('、')}）。`);
 finishPlayerAction(b,participants);
}
function chargeTargets(b,u){
 if(typeOf(u)!=='騎兵')return [];
 return living(b,'enemy').filter(t=>dist(u,t)===1&&(Number(u.x)===Number(t.x)||Number(u.y)===Number(t.y)));
}
function chargeDestination(b,attacker,target){
 const dx=Number(target.x)-Number(attacker.x),dy=Number(target.y)-Number(attacker.y);
 const x=Number(target.x)+dx,y=Number(target.y)+dy;
 if(x<0||x>=width(b)||y<0||y>=height(b))return null;
 if(occupiedAt(b,x,y)||!Number.isFinite(terrainCost(b,attacker,x,y)))return null;
 return {x,y};
}
function executeCharge(b,attacker,target){
 if(!attacker||attacker.done||typeOf(attacker)!=='騎兵'||!chargeTargets(b,attacker).includes(target))return;
 const origin={x:Number(attacker.x),y:Number(attacker.y)},destination=chargeDestination(b,attacker,target);
 const targetBefore=Number(target.troops)||0,attackerBefore=Number(attacker.troops)||0;
 const counterBase=normalCalc(b,target,attacker).damage;
 let power=normalCalc(b,attacker,target).damage*1.62;
 if((Number(attacker.movedDistance)||0)>=2)power*=1.12;
 const damage=applyDamage(b,target,power);
 const counter=applyRetaliation(b,attacker,target,counterBase,'charge',Number(target.troops)<=0);
 if(Number(attacker.troops)>0&&destination){attacker.x=destination.x;attacker.y=destination.y}
 else{attacker.x=origin.x;attacker.y=origin.y}
 changeMorale(attacker,-2);changeMorale(target,-5);syncExp(attacker.name,target,targetBefore);
 b.logs.unshift(`突撃！ ${attacker.name}隊が${target.name}隊へ${damage.toLocaleString()}損害。防御を捨てたため迎撃で${counter.toLocaleString()}損害（${attackerBefore.toLocaleString()}→${Math.max(0,Number(attacker.troops)||0).toLocaleString()}）。${destination&&Number(attacker.troops)>0?`敵陣を駆け抜けて(${destination.x+1},${destination.y+1})へ前進。`:'敵後方が塞がれていたため元の位置に留まった。'}`);
 finishPlayerAction(b,[attacker]);
}

function setCombatMode(b,mode){
 const p=currentPlayer(b);if(!p||p.done)return;
 let targets=[];
 if(mode==='attack')targets=normalTargets(b,p);
 if(mode==='volley')targets=volleyTargets(b,p);
 if(mode==='charge')targets=chargeTargets(b,p);
 if(!targets.length){b.logs.unshift(mode==='volley'?'一斉攻撃には、対象へ隣接する未行動の味方2部隊以上が必要です。':mode==='charge'?'突撃できる直線上の隣接敵がいません。':'射程内に攻撃対象がいません。');return window.render()}
 b.v2440Mode=mode;b.mode=mode;b.v2432Mode=mode;window.render();
}
window.battleAction=function(action){
 const b=state?.battle;if(!b)return previousBattleAction.apply(this,arguments);
 if(action==='attack'||action==='volley'||action==='charge')return setCombatMode(b,action);
 if(!['duel','tactic','fire'].includes(action))delete b.v2440Mode;
 return previousBattleAction.apply(this,arguments);
};

function decorateCommandsAndTargets(){
 const b=state?.battle;if(!b||b.v2434DeploymentActive||b.v2439DeploymentActive)return;
 const actions=document.querySelector('.battle-actions');if(!actions)return;
 let volley=actions.querySelector('[data-ba="volley"]'),charge=actions.querySelector('[data-ba="charge"]');
 if(!volley){volley=document.createElement('button');volley.dataset.ba='volley';volley.textContent='一斉';actions.querySelector('[data-ba="attack"]')?.after(volley)}
 if(!charge){charge=document.createElement('button');charge.dataset.ba='charge';charge.textContent='突撃';volley.after(charge)}
 const p=currentPlayer(b),vTargets=p?volleyTargets(b,p):[],cTargets=p?chargeTargets(b,p):[];
 volley.disabled=!p||p.done||vTargets.length===0;charge.disabled=!p||p.done||typeOf(p)!=='騎兵'||cTargets.length===0;
 volley.title='敵に隣接する未行動の味方2部隊以上で包囲攻撃。高威力・低損害だが参加部隊全員が行動済みになる。';
 charge.title='騎兵専用。高威力・高損害。攻撃後、敵の背後マスが空いていれば駆け抜ける。';
 volley.onclick=()=>window.battleAction('volley');charge.onclick=()=>window.battleAction('charge');
 const mode=b.v2440Mode||b.v2432Mode||b.mode;if(!p||!['attack','volley','charge'].includes(mode))return;
 const targets=mode==='volley'?vTargets:mode==='charge'?cTargets:normalTargets(b,p),names=new Set(targets.map(t=>t.name));
 const execute=target=>mode==='volley'?executeVolley(b,p,target):mode==='charge'?executeCharge(b,p,target):executeNormalAttack(b,p,target);
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  const [x,y]=cell.dataset.cell.split(',').map(Number),target=occupiedAt(b,x,y);
  cell.classList.remove('v2440-volleyable','v2440-chargeable','v2440-attackable');
  if(!target||target.side!=='enemy'||!names.has(target.name))return;
  cell.classList.add(mode==='volley'?'v2440-volleyable':mode==='charge'?'v2440-chargeable':'v2440-attackable');
  cell.onclick=()=>execute(target);
  const unit=cell.querySelector('[data-unit],[data-v2439-unit]');if(unit)unit.onclick=e=>{e.stopPropagation();execute(target)};
 });
}
window.render=function(){
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(()=>{try{decorateCommandsAndTargets()}catch(e){console.error('v24.40 UI:',e)}},150);
 return result;
};

function applyEnemyCounterFromSnapshot(b,attacker,beforePlayers){
 if(!attacker||Number(attacker.troops)<=0)return;
 let target=null,loss=0,record=null;
 for(const u of (b?.units||[]).filter(x=>x.side==='player'&&!isStructure(x))){
  const before=beforePlayers.get(u.name);if(!before)continue;
  const delta=Math.max(0,Number(before.troops)-Number(u.troops));if(delta>loss){loss=delta;target=u;record=before}
 }
 if(!target||loss<=0||!record)return;
 const defender={...record},base=normalCalc(b,defender,attacker).damage;
 const counter=applyRetaliation(b,attacker,defender,base,'normal',Number(target.troops)<=0);
 b.logs.unshift(`${target.name}隊が反撃し、攻撃した${attacker.name}隊へ${counter.toLocaleString()}損害。`);
}
function runLargeEnemyPhaseWithCounter(b){
 if(largeEnemyTimer){clearTimeout(largeEnemyTimer);largeEnemyTimer=null}
 b.phase='enemy';clearModes(b);window.render();
 const queue=living(b,'enemy').map(u=>u.name);let i=0;
 const next=()=>{
  if(state?.battle!==b||window.checkBattleEnd())return;
  const name=queue[i++];if(!name)return typeof V39.finishEnemyPhase==='function'?V39.finishEnemyPhase(b):previousEnemyPhase();
  const u=living(b,'enemy').find(x=>x.name===name);
  if(u&&typeof V39.enemyAct==='function'){
   const before=new Map((b.units||[]).filter(p=>p.side==='player'&&!isStructure(p)&&Number(p.troops)>0).map(p=>[p.name,{...p,troops:Number(p.troops)||0}]));
   V39.enemyAct(b,u);applyEnemyCounterFromSnapshot(b,u,before);
  }
  if(state?.battle!==b||window.checkBattleEnd())return;
  largeEnemyTimer=setTimeout(next,140);
 };
 largeEnemyTimer=setTimeout(next,250);
}
function monitorLegacyEnemyPhase(b,baseLength){
 if(legacyMonitor)clearInterval(legacyMonitor);
 let processed=0;
 legacyMonitor=setInterval(()=>{
  if(state?.battle!==b){clearInterval(legacyMonitor);legacyMonitor=null;return}
  const added=Math.max(0,(b.logs?.length||0)-baseLength),delta=added-processed;
  if(delta>0){
   const lines=b.logs.slice(0,delta).reverse();
   for(const line of lines){
    const m=String(line).match(/^(.+?)隊が(.+?)隊へ([\d,]+)損害/);if(!m)continue;
    const attacker=(b.units||[]).find(u=>u.side==='enemy'&&!isStructure(u)&&u.name===m[1]&&Number(u.troops)>0),target=(b.units||[]).find(u=>u.side==='player'&&!isStructure(u)&&u.name===m[2]);
    if(!attacker||!target)continue;
    const base=normalCalc(b,{...target,troops:Math.max(Number(target.troops)||0,Math.floor(Number(target.max)||0)*.25)},attacker).damage;
    const counter=applyRetaliation(b,attacker,target,base,'normal',Number(target.troops)<=0);
    b.logs.unshift(`${target.name}隊が反撃し、攻撃した${attacker.name}隊へ${counter.toLocaleString()}損害。`);
    if(window.checkBattleEnd())break;
   }
   processed=Math.max(0,(b.logs?.length||0)-baseLength);
  }
  if(b.phase==='player'){clearInterval(legacyMonitor);legacyMonitor=null;window.render()}
 },45);
}
window.enemyPhase=function(){
 const b=state?.battle;if(!b)return previousEnemyPhase.apply(this,arguments);
 if(isLarge(b))return runLargeEnemyPhaseWithCounter(b);
 const baseLength=b.logs?.length||0,result=previousEnemyPhase.apply(this,arguments);monitorLegacyEnemyPhase(b,baseLength);return result;
};

const style=document.createElement('style');style.textContent=`
.battle-actions [data-ba="volley"]{background:linear-gradient(#5f5b24,#38340f)}.battle-actions [data-ba="charge"]{background:linear-gradient(#8a4930,#572716)}
.cell.v2440-attackable{box-shadow:inset 0 0 0 3px #ff6d62,inset 0 0 18px rgba(255,76,65,.5)!important}.cell.v2440-volleyable{box-shadow:inset 0 0 0 3px #ffe35f,inset 0 0 22px rgba(255,224,65,.58)!important}.cell.v2440-chargeable{box-shadow:inset 0 0 0 3px #ff9b43,inset 0 0 24px rgba(255,110,35,.65)!important}
`;document.head.appendChild(style);
})();
