// v24.42 — defending commander anchors the keep; defenders prioritize the keep
(()=>{
const V39=window.V2439||{};
if(!V39||typeof V39.enemyAct!=='function')return;

const previousRender=window.render;
const previousEnemyAct=V39.enemyAct;

function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function isLarge(b){return !!b?.v2439LargeSiege}
function defenderSide(b){return typeof V39.defenderSide==='function'?V39.defenderSide(b):(b?.defense?'player':'enemy')}
function keepCell(){return typeof V39.keepCell==='function'?V39.keepCell():{x:Number(V39.CX)||7,y:Number(V39.CY)||6}}
function living(b,side){return typeof V39.living==='function'?V39.living(b,side):(b?.units||[]).filter(u=>u.side===side&&!u.v2436Structure&&Number(u.troops)>0)}
function occupiedAt(b,x,y){return typeof V39.occupiedAt==='function'?V39.occupiedAt(b,x,y):(b?.units||[]).find(u=>!u.v2436Structure&&Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y)||null}
function commanderName(b,side){return b?.v2436Commanders?.[side]||null}
function defendingCommander(b){
 const side=defenderSide(b),name=commanderName(b,side);
 return name?living(b,side).find(u=>u.name===name)||null:null;
}

function enforceDefendingCommanderAtKeep(b){
 if(!isLarge(b))return null;
 const side=defenderSide(b),commander=defendingCommander(b);if(!commander)return null;
 const keep=keepCell();
 if(Number(commander.x)===keep.x&&Number(commander.y)===keep.y){commander.v2442KeepGuard=true;return commander}
 const occupant=occupiedAt(b,keep.x,keep.y);
 if(occupant&&occupant.side!==side)return commander;
 const old={x:Number(commander.x),y:Number(commander.y)};
 if(occupant&&occupant!==commander){occupant.x=old.x;occupant.y=old.y}
 commander.x=keep.x;commander.y=keep.y;commander.v2442KeepGuard=true;
 if(!b.v2442CommanderPlaced){
  b.v2442CommanderPlaced=true;
  b.logs=b.logs||[];b.logs.unshift(`守城総大将・${commander.name}隊は本丸中央に布陣。ここを動かず城を守る。`);
 }
 return commander;
}

function handleDisabledAction(b,u){
 if(Number(u.v2432SkipEnemyAction)>0){u.v2432SkipEnemyAction--;b.logs.unshift(`${u.name}隊は一騎打ちの疲労で行動できない。`);return true}
 if(Number(u.skipTurns)>0){u.skipTurns--;b.logs.unshift(`${u.name}隊は混乱し、行動できない。`);return true}
 return false;
}
function rangeOf(u){return typeof V39.attackRange==='function'?V39.attackRange(u,'attack'):1}
function threatOrder(a,c,keep){return dist(a,keep)-dist(c,keep)||(Number(a.troops)||0)-(Number(c.troops)||0)}
function attackIfPossible(b,u,targets){
 const keep=keepCell(),range=rangeOf(u),inRange=targets.filter(t=>dist(u,t)<=range).sort((a,c)=>threatOrder(a,c,keep));
 if(!inRange.length)return false;
 if(typeof V39.enemyAttack==='function')V39.enemyAttack(b,u,inRange[0]);
 return true;
}

V39.enemyAct=function(b,u){
 if(!isLarge(b)||u?.side!==defenderSide(b)||u?.side!=='enemy')return previousEnemyAct(b,u);
 const commander=enforceDefendingCommanderAtKeep(b);
 if(!u||Number(u.troops)<=0)return;
 if(handleDisabledAction(b,u))return;
 const targets=living(b,'player');if(!targets.length)return;
 const keep=keepCell();

 // The defending commander never leaves the keep. It may only attack from that tile.
 if(commander&&u.name===commander.name){
  enforceDefendingCommanderAtKeep(b);
  if(attackIfPossible(b,u,targets))return;
  b.logs.unshift(`総大将・${u.name}隊は本丸中央を死守し、持ち場を動かない。`);
  return;
 }

 // Other defenders focus on the attacker closest to the keep, not the nearest target to themselves.
 if(attackIfPossible(b,u,targets))return;
 const threat=targets.slice().sort((a,c)=>threatOrder(a,c,keep))[0];if(!threat)return;
 const threatDistance=dist(threat,keep);
 const terrain=typeof V39.terrainAt==='function'?V39.terrainAt(b,u.x,u.y):'plain';
 const inCastle=typeof V39.isCastleTile==='function'?V39.isCastleTile(terrain):['wall','gate','courtyard','keep'].includes(terrain);

 // Do not abandon the castle while the attackers are still far from the keep.
 if(inCastle&&threatDistance>5){
  b.logs.unshift(`${u.name}隊は本丸防衛を優先し、城内の持ち場を維持している。`);
  return;
 }

 const range=rangeOf(u);
 let goals=typeof V39.goalsNearTarget==='function'?V39.goalsNearTarget(b,u,threat,range):[];
 // Defensive pursuit is limited to the keep's defensive zone; no reckless chase outside the castle approaches.
 goals=goals.filter(g=>dist(g,keep)<=4);
 if(!goals.length){b.logs.unshift(`${u.name}隊は本丸周辺を固め、侵入路を警戒している。`);return}
 const path=typeof V39.pathToGoals==='function'?V39.pathToGoals(b,u,goals):[];
 if(path.length&&typeof V39.moveEnemyAlong==='function')V39.moveEnemyAlong(b,u,path);
 if(typeof V39.checkKeepVictory==='function'&&V39.checkKeepVictory(b))return;
 attackIfPossible(b,u,living(b,'player'));
};

window.render=function(){
 const b=state?.battle;
 if(isLarge(b))enforceDefendingCommanderAtKeep(b);
 return previousRender.apply(this,arguments);
};

window.V2442={enforceDefendingCommanderAtKeep};
})();
