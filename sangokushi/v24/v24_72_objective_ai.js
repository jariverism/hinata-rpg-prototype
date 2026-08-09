// v24.72 — objective-driven large-siege AI
(()=>{
if(window.V2472_OBJECTIVE_AI)return;window.V2472_OBJECTIVE_AI=true;
const V39=window.V2439||{},V68=window.V2468||{};
if(typeof V39.enemyAct!=='function')return;
const previousEnemyAct=V39.enemyAct;
function dist(a,b){return Math.abs(Number(a?.x)-Number(b?.x))+Math.abs(Number(a?.y)-Number(b?.y))}
function typeOf(u){return typeof V39.typeOf==='function'?V39.typeOf(u):(u?.type||u?.apt||'剣盾兵')}
function living(b,side){return typeof V39.living==='function'?V39.living(b,side):(b?.units||[]).filter(u=>u.side===side&&!u.v2436Structure&&!u.v2468Routed&&Number(u.troops)>0)}
function atkSide(b){return typeof V39.attackerSide==='function'?V39.attackerSide(b):(b?.defense?'enemy':'player')}
function defSide(b){return typeof V39.defenderSide==='function'?V39.defenderSide(b):(b?.defense?'player':'enemy')}
function keep(){return typeof V39.keepCell==='function'?V39.keepCell():{x:Number(V39.CX??7),y:Number(V39.CY??6),id:'keep',name:'本丸'}}
function obj(b,id){return typeof V68.objective==='function'?V68.objective(b,id):(b?.v2468Objectives||[]).find(o=>o.id===id)||null}
function range(u){return typeof V39.attackRange==='function'?V39.attackRange(u,'attack'):(typeOf(u)==='弩兵'?3:1)}
function nearestPlayerDist(b,p=keep()){const ps=living(b,'player');return ps.length?Math.min(...ps.map(u=>dist(u,p))):99}
function chooseObjective(b,u){
 if(!b?.v2439LargeSiege||!b.v2439DeploymentDone||!u||u.side!=='enemy')return null;
 const immediate=living(b,'player').some(p=>dist(u,p)<=range(u));if(immediate)return null;
 const attack=atkSide(b)===u.side,defend=defSide(b)===u.side,camp=obj(b,'camp'),granary=obj(b,'granary'),tower=obj(b,'tower'),k={...keep(),id:'keep',name:'本丸'},choices=[];
 if(attack){
  if(camp&&camp.owner!==u.side)choices.push({o:camp,score:145,reason:'補給本陣奪回'});
  const enemyMorale=typeof V68.ensure==='function'&&V68.ensure(b)?living(b,'player').reduce((s,x)=>s+(Number(x.morale)||0),0)/Math.max(1,living(b,'player').length):60;
  choices.push({o:k,score:100+(enemyMorale<40?18:0),reason:'本丸制圧'});
  if(granary&&granary.owner!==u.side)choices.push({o:granary,score:88,reason:'兵糧庫攻略'});
  if(tower&&tower.owner!==u.side)choices.push({o:tower,score:typeOf(u)==='弩兵'?72:54,reason:'櫓攻略'});
 }else if(defend){
  if(granary&&granary.owner!==u.side)choices.push({o:granary,score:135,reason:'兵糧庫奪回'});
  if(tower&&tower.owner!==u.side)choices.push({o:tower,score:typeOf(u)==='弩兵'?82:62,reason:'櫓奪回'});
  if(camp&&camp.owner===atkSide(b)&&typeOf(u)==='騎兵'&&nearestPlayerDist(b,keep())>4)choices.push({o:camp,score:96,reason:'敵本陣奇襲'});
 }
 return choices.sort((a,c)=>c.score-a.score)[0]||null;
}
function moveTowardObjective(b,u,pick){
 if(!pick?.o||typeof V39.pathToGoals!=='function'||typeof V39.moveEnemyAlong!=='function')return false;
 const o=pick.o,occ=typeof V39.occupiedAt==='function'?V39.occupiedAt(b,o.x,o.y):null,r=range(u);
 if(occ&&occ.side===u.side)return false;
 if(occ&&occ.side==='player'&&dist(u,occ)<=r){if(typeof V39.enemyAttack==='function')V39.enemyAttack(b,u,occ);return true}
 let goals;
 if(occ&&occ.side==='player'&&typeof V39.goalsNearTarget==='function')goals=V39.goalsNearTarget(b,u,occ,r);else goals=[{x:o.x,y:o.y}];
 const path=V39.pathToGoals(b,u,goals||[]);if(!path?.length)return false;
 const broken=typeof V68.supplyBroken==='function'&&V68.supplyBroken(b,u.side);if(broken)u.moveRangeBonus=(Number(u.moveRangeBonus)||0)-1;
 try{V39.moveEnemyAlong(b,u,path)}finally{if(broken)u.moveRangeBonus=(Number(u.moveRangeBonus)||0)+1}
 if(typeof V68.syncMoves==='function')V68.syncMoves(b);if(typeof V68.captureAt==='function')V68.captureAt(b,u);
 if(typeof V39.checkKeepVictory==='function'&&V39.checkKeepVictory(b))return true;
 const now=(o.id==='keep'?null:(typeof V39.occupiedAt==='function'?V39.occupiedAt(b,o.x,o.y):null))||living(b,'player').filter(p=>dist(u,p)<=r).sort((a,c)=>a.troops-c.troops)[0];
 if(now?.side==='player'&&dist(u,now)<=r&&typeof V39.enemyAttack==='function')V39.enemyAttack(b,u,now);
 b.logs=b.logs||[];b.logs.unshift(`${u.name}隊は${pick.reason}を狙って進軍。`);return true;
}
V39.enemyAct=function(b,u){
 if(!b?.v2439LargeSiege||!b.v2439DeploymentDone||u?.side!=='enemy')return previousEnemyAct.apply(this,arguments);
 if(typeof V68.ensure==='function')V68.ensure(b);
 // Enemy defending commander may guard the keep while attackers are distant, but is never position-locked.
 if(defSide(b)==='enemy'&&b.v2436Commanders?.enemy===u.name&&Number(u.x)===Number(keep().x)&&Number(u.y)===Number(keep().y)&&nearestPlayerDist(b,keep())>4){b.logs=b.logs||[];b.logs.unshift(`総大将・${u.name}隊は敵が遠いため本丸で機をうかがう。`);return}
 const pick=chooseObjective(b,u);if(pick&&moveTowardObjective(b,u,pick))return;
 return previousEnemyAct.apply(this,arguments);
};
window.V2472={chooseObjective,moveTowardObjective,nearestPlayerDist};
})();
