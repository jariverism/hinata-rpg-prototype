// v24.39 battle — large-map movement, combat, keep capture and active AI
(()=>{
const V=window.V2432||{},V39=window.V2439;if(!V39)return;
const {W,H,CX,CY,clamp,rand,key,dist,typeOf,living,occupiedAt,terrainAt,currentPlayer,attackerSide,defenderSide,isCastleTile,isWallTile,keepCell}=V39;
let enemyTimer=null;
function movePoints(u){return Math.max(2,(typeof V.movePoints==='function'?V.movePoints(u):2)+1+(Number(u?.moveRangeBonus)||0))}
function terrainCost(u,x,y,b=state?.battle){
 const t=terrainAt(b,x,y);
 if(t==='water')return Infinity;
 if(t==='mountain')return typeOf(u)==='騎兵'?Infinity:2;
 if(t==='wall')return typeOf(u)==='騎兵'?3:2;
 if(t==='gate')return 1;
 return 1;
}
function reachableCells(b,u){
 const out=new Map();if(!u||u.done||u.movedThisTurn||u.immobileTurns>0)return out;
 const max=movePoints(u),start=key(u.x,u.y),best=new Map([[start,0]]),queue=[[Number(u.x),Number(u.y),0]];
 while(queue.length){
  queue.sort((a,c)=>a[2]-c[2]);const [x,y,cost]=queue.shift();
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;
   const step=terrainCost(u,nx,ny,b),next=cost+step,k=key(nx,ny);if(!Number.isFinite(step)||next>max||next>=(best.get(k)??Infinity))continue;
   const occ=occupiedAt(b,nx,ny),friendly=occ&&occ.side===u.side;if(occ&&!friendly)continue;
   best.set(k,next);queue.push([nx,ny,next]);if(!occ)out.set(k,next);
  }
 }
 return out;
}
function attackRange(u,action='attack'){return action==='fire'?3:(typeOf(u)==='弩兵'?3:1)}
function legalTargets(b,u,action='attack'){const range=attackRange(u,action);return living(b,u.side==='player'?'enemy':'player').filter(t=>dist(u,t)<=range)}
function terrainDefense(t){return t==='wall'?.72:t==='mountain'?.72:t==='hill'?.85:t==='forest'?.90:t==='gate'?.88:t==='keep'?.88:t==='courtyard'?.94:t==='bridge'?.95:1}
function roleFactor(a,d,distance){return typeof V.roleFactor==='function'?V.roleFactor(a,d,distance):{mult:1,notes:[]}}
function applyDamage(target,amount){
 const before=Number(target.troops)||0;let dmg=Math.max(1,Math.floor(amount));
 if(target.side==='player'&&(state?.battle?.playerGuardTurns||0)>0)dmg=Math.floor(dmg*.7);
 target.troops=Math.max(0,before-dmg);return before-target.troops;
}
function normalDamage(attacker,target,b){
 let value=100+(Number(attacker.war)||50)*2.1+(Number(attacker.lead)||50)*.75+(Number(attacker.troops)||0)*.03+rand(0,110);
 if(attacker.weakenTurns>0)value*=.65;
 const role=roleFactor(attacker,target,dist(attacker,target));value*=Number(role.mult)||1;
 value*=1-clamp(((Number(target.lead)||50)-50)*.003,-.09,.15);
 value*=terrainDefense(terrainAt(b,target.x,target.y));
 value*=clamp(.72+(Number(attacker.morale)||60)/250,.72,1.12);
 return {damage:Math.max(1,Math.floor(value)),notes:role.notes||[]};
}
function syncExp(actor,target,before){if(typeof V.syncExperience==='function')V.syncExperience(actor,target,before)}
function firstWallEntry(b,u){
 if(u.side!==attackerSide(b)||b.v2439WallBreach||!isWallTile(terrainAt(b,u.x,u.y)))return;
 b.v2439WallBreach=true;
 for(const ally of living(b,u.side))ally.morale=clamp((Number(ally.morale)||60)+6,0,100);
 for(const foe of living(b,u.side==='player'?'enemy':'player'))foe.morale=clamp((Number(foe.morale)||60)-6,0,100);
 b.logs.unshift(`${u.name}隊が城壁へ登った！ 攻城軍士気＋6、守備軍士気－6。`);
}
function movePlayer(b,u,x,y,cost){
 if(!u||occupiedAt(b,x,y))return;
 u.x=x;u.y=y;u.movedDistance=cost;u.movedThisTurn=true;u.moveRangeBonus=0;b.mode=null;b.v2432Mode=null;firstWallEntry(b,u);
 if(checkKeepVictory(b))return;
 if(typeOf(u)==='騎兵'){
  b.logs.unshift(`${u.name}隊が${cost}移動力分進軍。続けて攻撃できます。`);b.mode='attack';b.v2432Mode='attack';window.render();
 }else{
  u.done=true;b.logs.unshift(`${u.name}隊が${isWallTile(terrainAt(b,x,y))?'城壁へ登攀':'進軍'}。`);window.afterPlayerAction();
 }
}
function playerAttack(b,u,target,action){
 if(!u||u.done||!target||!legalTargets(b,u,action).includes(target))return;
 const before=Number(target.troops)||0;
 if(action==='fire'){
  const chance=clamp(Math.round(25+(Number(u.int)||50)*.65-(Number(target.int)||50)*.25),10,90),ok=Math.random()*100<chance;
  if(ok){let raw=150+(Number(u.int)||50)*2.2+(Number(u.troops)||0)*.018+rand(0,110);raw*=terrainDefense(terrainAt(b,target.x,target.y));const damage=applyDamage(target,raw);b.logs.unshift(`${u.name}隊の火計成功（${chance}%）！ ${target.name}隊へ${damage}損害。`)}
  else b.logs.unshift(`${u.name}隊の火計失敗（成功率${chance}%）。`);
 }else{
  const calc=normalDamage(u,target,b),damage=applyDamage(target,calc.damage);b.logs.unshift(`${u.name}隊が${target.name}隊へ${damage}損害。${isWallTile(terrainAt(b,target.x,target.y))?'【城壁防御】':''}${calc.notes.length?`【${calc.notes.join('・')}】`:''}`);
 }
 syncExp(u.name,target,before);u.done=true;u.movedDistance=0;b.mode=null;b.v2432Mode=null;
 if(window.checkBattleEnd())return;window.afterPlayerAction();
}
function selectOwn(b,u){b.selected=u.name;b.mode=u.done?null:(u.movedThisTurn?'attack':'move');b.v2432Mode=b.mode;window.render()}
function pathToGoals(b,u,goals){
 const goalSet=new Set(goals.map(g=>key(g.x,g.y))),start=key(u.x,u.y),queue=[[Number(u.x),Number(u.y),0]],costs=new Map([[start,0]]),prev=new Map();let found=null;
 while(queue.length){
  queue.sort((a,c)=>a[2]-c[2]);const [x,y,cost]=queue.shift(),k=key(x,y);if(goalSet.has(k)){found=k;break}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;
   const step=terrainCost(u,nx,ny,b),next=cost+step,nk=key(nx,ny);if(!Number.isFinite(step)||next>=(costs.get(nk)??Infinity))continue;
   const occ=occupiedAt(b,nx,ny),friendly=occ&&occ.side===u.side;if(occ&&!friendly)continue;
   costs.set(nk,next);prev.set(nk,k);queue.push([nx,ny,next]);
  }
 }
 if(!found)return [];
 const path=[];let k=found;while(k!==start){const [x,y]=k.split(',').map(Number);path.unshift({x,y});k=prev.get(k);if(!k)break}return path;
}
function goalsNearTarget(b,u,target,range){
 const goals=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(dist({x,y},target)<=range&&!occupiedAt(b,x,y)&&Number.isFinite(terrainCost(u,x,y,b)))goals.push({x,y});return goals;
}
function moveEnemyAlong(b,u,path){
 let budget=movePoints(u),spent=0,final=null;
 for(const step of path){const c=terrainCost(u,step.x,step.y,b);if(spent+c>budget)break;spent+=c;if(!occupiedAt(b,step.x,step.y))final=step}
 if(!final)return false;
 u.x=final.x;u.y=final.y;u.movedDistance=spent;u.movedThisTurn=true;firstWallEntry(b,u);b.logs.unshift(`${u.name}隊が${spent}移動力分進軍。`);return true;
}
function enemyAttack(b,u,target){
 const before=Number(target.troops)||0,calc=normalDamage(u,target,b),damage=applyDamage(target,calc.damage);b.logs.unshift(`${u.name}隊が${target.name}隊へ${damage}損害。${isWallTile(terrainAt(b,target.x,target.y))?'【城壁防御】':''}`);syncExp(u.name,target,before);
}
function nearestTarget(u,targets,b){
 const commander=b.v2436Commanders?.[u.side==='player'?'enemy':'player'];
 return targets.slice().sort((a,c)=>dist(u,a)-dist(u,c)+(a.name===commander?-1:0)-(c.name===commander?-1:0)||(Number(a.troops)||0)-(Number(c.troops)||0))[0]||null;
}
function defenderShouldHold(b,u,targets){
 if(u.side!==defenderSide(b)||!isCastleTile(terrainAt(b,u.x,u.y)))return false;
 // The defending commander starts at the keep, but must remain free to sortie or intercept.
 if(b.v2436Commanders?.[u.side]===u.name)return false;
 return Math.min(...targets.map(t=>dist(u,t)))>5;
}
function enemyAct(b,u){
 if(u.v2432SkipEnemyAction>0){u.v2432SkipEnemyAction--;b.logs.unshift(`${u.name}隊は一騎打ちの疲労で行動できない。`);return}
 if(u.skipTurns>0){u.skipTurns--;b.logs.unshift(`${u.name}隊は混乱し、行動できない。`);return}
 const targets=living(b,'player');if(!targets.length)return;
 let target=nearestTarget(u,targets,b),range=attackRange(u,'attack');
 if(target&&dist(u,target)<=range){enemyAttack(b,u,target);return}
 if(defenderShouldHold(b,u,targets)){b.logs.unshift(`${u.name}隊は城壁上で攻城軍を待ち構えている。`);return}
 const objective=target||keepCell(),goals=goalsNearTarget(b,u,objective,range),path=pathToGoals(b,u,goals);
 moveEnemyAlong(b,u,path);
 if(checkKeepVictory(b))return;
 target=nearestTarget(u,living(b,'player'),b);if(target&&dist(u,target)<=range)enemyAttack(b,u,target);
}
function finishEnemyPhase(b){
 if(state?.battle!==b||window.checkBattleEnd())return;
 for(const u of living(b,'player')){
  u.movedDistance=0;u.movedThisTurn=false;
  if(u.skipTurns>0){u.skipTurns--;u.done=true;b.logs.unshift(`${u.name}隊は混乱のため次の行動を失った。`)}else u.done=false;
 }
 b.phase='player';b.day=(Number(b.day)||1)+1;b.mode=null;b.v2432Mode=null;window.render();
}
function runLargeEnemyPhase(b){
 if(enemyTimer){clearTimeout(enemyTimer);enemyTimer=null}
 b.phase='enemy';b.mode=null;b.v2432Mode=null;window.render();
 const queue=living(b,'enemy').map(u=>u.name);let i=0;
 const next=()=>{
  if(state?.battle!==b||window.checkBattleEnd())return;
  const name=queue[i++];if(!name)return finishEnemyPhase(b);
  const u=living(b,'enemy').find(x=>x.name===name);if(u)enemyAct(b,u);
  if(state?.battle!==b||window.checkBattleEnd())return;
  enemyTimer=setTimeout(next,130);
 };
 enemyTimer=setTimeout(next,260);
}
function checkKeepVictory(b){
 if(!b?.v2439DeploymentDone)return false;
 const occ=occupiedAt(b,CX,CY);if(!occ||occ.side!==attackerSide(b))return false;
 if(b.v2439KeepResolved)return true;
 b.v2439KeepResolved=true;b._v2439EndReason='keep';
 b.logs.unshift(`${occ.name}隊が本丸を制圧！ 城郭の指揮系統が崩壊し、戦闘は終結した。`);
 if(typeof log==='function')log(`${b.target}の本丸が${occ.side==='player'?'日向軍':'敵軍'}に制圧された。`);
 window.endBattle(occ.side==='player',false);return true;
}

Object.assign(V39,{movePoints,terrainCost,reachableCells,attackRange,legalTargets,terrainDefense,applyDamage,normalDamage,firstWallEntry,movePlayer,playerAttack,selectOwn,pathToGoals,goalsNearTarget,moveEnemyAlong,enemyAttack,nearestTarget,defenderShouldHold,enemyAct,finishEnemyPhase,runLargeEnemyPhase,checkKeepVictory});
})();
