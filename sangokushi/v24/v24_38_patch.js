// v24.38 — sortie-capable gates and active siege assault AI
(()=>{
const V=window.V2432||{};
const previousRender=window.render;
const previousEnemyPhase=window.enemyPhase;
const previousCheckBattleEnd=window.checkBattleEnd;
const W=9,H=7,WALL_X=6,GATE_Y=3,SIEGE_HOLD_LIMIT=20;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function typeOf(u){const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function isStructure(u){return !!u?.v2436Structure}
function occupiedAt(b,x,y){return (b?.units||[]).find(u=>Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y)||null}
function living(b,side){return (b?.units||[]).filter(u=>u.side===side&&!isStructure(u)&&Number(u.troops)>0)}
function gateUnit(b=state?.battle){return (b?.units||[]).find(u=>u.v2436Gate)||null}
function gateAlive(b=state?.battle){return Number(gateUnit(b)?.troops)>0}
function terrainCost(u,x,y){return typeof V.terrainCost==='function'?V.terrainCost(u,x,y):1}
function movePoints(u){return typeof V.movePoints==='function'?V.movePoints(u):Math.max(1,2+(Number(u?.moveRangeBonus)||0))}
function attackRange(u){return typeOf(u)==='弩兵'?3:1}
function terrainAt(b,x,y){return typeof V.terrainAt==='function'?V.terrainAt(b,x,y):String(b?.terrain?.[y*W+x]||'plain').split(' ')[0]}

function isDefenseSiege(b){return !!(b?.defense&&b?.v2436Siege)}
function normalizeGateCorridor(b){
 if(!isDefenseSiege(b))return;
 const gate=gateUnit(b);if(gate){gate.x=WALL_X;gate.y=GATE_Y;gate.ownerSide='player';gate.side='player'}
 if(Array.isArray(b.terrain)&&b.terrain.length===W*H){
  for(const x of [WALL_X-1,WALL_X,WALL_X+1]){
   const i=GATE_Y*W+x;
   if(['water','mountain'].includes(String(b.terrain[i]||'plain').split(' ')[0]))b.terrain[i]='plain';
  }
 }
 b.v2438GateCorridor=true;
}

function ownGatePassable(b,u,occ){
 return !!(occ?.v2436Gate&&occ.ownerSide===u.side&&Number(occ.troops)>0);
}
function friendlyPassable(b,u,occ){
 return !!(occ&&occ!==u&&occ.side===u.side&&!isStructure(occ));
}
function sortieReachable(b,u){
 const out=new Map();
 if(!u||u.done||u.movedThisTurn||u.immobileTurns>0)return out;
 const max=movePoints(u),start=`${u.x},${u.y}`,best=new Map([[start,0]]),queue=[[Number(u.x),Number(u.y),0]];
 while(queue.length){
  queue.sort((a,c)=>a[2]-c[2]);
  const [x,y,cost]=queue.shift();
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;
   const occ=occupiedAt(b,nx,ny),gatePass=ownGatePassable(b,u,occ);
   const step=gatePass?0:terrainCost(u,nx,ny),next=cost+step,key=`${nx},${ny}`;
   if(!Number.isFinite(step)||next>max||next>=(best.get(key)??Infinity))continue;
   if(occ&&!friendlyPassable(b,u,occ)&&!gatePass)continue;
   best.set(key,next);queue.push([nx,ny,next]);
   if(!occ)out.set(key,next);
  }
 }
 return out;
}
function movePlayerTo(b,p,x,y,cost){
 if(!p||occupiedAt(b,x,y))return;
 p.x=x;p.y=y;p.movedDistance=cost;p.movedThisTurn=true;p.moveRangeBonus=0;b.mode=null;b.v2432Mode=null;
 const crossed=x<WALL_X;
 if(typeOf(p)==='騎兵'){
  b.logs.unshift(`${p.name}隊が${crossed?'城門を駆け抜けて城外へ出撃':'味方の間を抜けて進軍'}。続けて攻撃できます。`);
  b.mode='attack';b.v2432Mode='attack';window.render();
 }else{
  p.done=true;b.logs.unshift(`${p.name}隊が${crossed?'城門を通って城外へ出撃':'味方の間を抜けて進軍'}。`);window.afterPlayerAction();
 }
}
function decorateSortieMovement(){
 const b=state?.battle;if(!isDefenseSiege(b)||!gateAlive(b)||b.v2434DeploymentActive||!b.v2434DeploymentDone)return;
 const gateCell=document.querySelector(`[data-cell="${WALL_X},${GATE_Y}"]`);
 if(gateCell){gateCell.classList.add('v2438-sortie-gate');gateCell.title='味方の城門：守備側部隊は通過して城外へ出撃できます。敵軍は城門破壊まで通過できません。'}
 const p=(b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&u.troops>0),mode=b.v2432Mode||b.mode;
 if(!p||p.done||mode!=='move')return;
 const reachable=sortieReachable(b,p);
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  const [x,y]=cell.dataset.cell.split(',').map(Number),key=`${x},${y}`;
  if(occupiedAt(b,x,y)||!reachable.has(key))return;
  cell.classList.add('v2423-reachable','v2438-sortie-route');
  cell.onclick=()=>{
   if(state?.battle!==b||occupiedAt(b,x,y))return;
   movePlayerTo(b,p,x,y,reachable.get(key));
  };
 });
}

function assaultStage(day){return day>=15?3:day>=10?2:day>=5?1:0}
function assaultLabel(stage){return ['通常攻城','破城槌投入','総攻撃','決死の猛攻'][stage]||'通常攻城'}
function announceAssaultStage(b,stage){
 if(Number(b.v2438AnnouncedStage)>=stage)return;
 b.v2438AnnouncedStage=stage;
 if(stage===0)return;
 const moraleGain=[0,4,7,10][stage];
 for(const u of living(b,'enemy'))u.morale=clamp((Number(u.morale)||60)+moraleGain,0,100);
 b.logs.unshift(`${assaultLabel(stage)}！ 攻城側は城門攻略を急ぎ、移動力と城門攻撃力が上昇した。`);
}
function damageGateByUnit(b,e,stage){
 const gate=gateUnit(b);if(!gate||gate.troops<=0||dist(e,gate)>attackRange(e))return 0;
 let damage=180+(Number(e.war)||50)*4+(Number(e.troops)||0)*.025+rand(0,140);
 if(typeOf(e)==='弩兵')damage*=.82;
 damage*=([1,1.18,1.42,1.70][stage]||1);
 damage=Math.max(100,Math.floor(damage));
 gate.troops=Math.max(0,Number(gate.troops)-damage);
 b.logs.unshift(`${e.name}隊が${stage>=2?'総攻撃で':''}城門を攻撃。耐久へ${damage.toLocaleString()}損害（残り${Math.max(0,gate.troops).toLocaleString()}）。`);
 b.v2438PhaseActivity=(Number(b.v2438PhaseActivity)||0)+1;
 window.checkBattleEnd();
 return damage;
}
function bombardGate(b,stage,forced=false){
 const gate=gateUnit(b);if(!gate||gate.troops<=0)return 0;
 const day=Number(b.day)||1;
 if(!forced&&b.v2438BombardDay===day)return 0;
 if(!forced)b.v2438BombardDay=day;
 const attackers=living(b,'enemy').length;
 const ratio=forced?.085:(.045+stage*.012);
 const damage=Math.max(180,Math.floor((Number(gate.max)||3000)*ratio+attackers*45+stage*70));
 gate.troops=Math.max(0,Number(gate.troops)-damage);
 b.logs.unshift(`${forced?'攻城隊が停滞を打破するため破城槌を集中投入':'攻城兵器の一斉攻撃'}！ 城門耐久へ${damage.toLocaleString()}損害（残り${Math.max(0,gate.troops).toLocaleString()}）。`);
 b.v2438PhaseActivity=(Number(b.v2438PhaseActivity)||0)+1;
 window.checkBattleEnd();
 return damage;
}

function traversableForEnemy(b,u,x,y){
 const step=terrainCost(u,x,y);if(!Number.isFinite(step))return false;
 const occ=occupiedAt(b,x,y);if(!occ)return true;
 return occ!==u&&occ.side===u.side&&!isStructure(occ);
}
function emptyGoal(b,u,x,y){return !occupiedAt(b,x,y)&&Number.isFinite(terrainCost(u,x,y))}
function goalsAroundTarget(b,u,target,range,outsideOnly=false){
 const goals=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(outsideOnly&&x>=WALL_X)continue;
  if(dist({x,y},target)>range||!emptyGoal(b,u,x,y))continue;
  goals.push({x,y});
 }
 return goals;
}
function bestPath(b,u,goals){
 const goalSet=new Set(goals.map(g=>`${g.x},${g.y}`));
 const start=`${u.x},${u.y}`,queue=[[Number(u.x),Number(u.y),0]],costs=new Map([[start,0]]),prev=new Map();
 let found=null;
 while(queue.length){
  queue.sort((a,c)=>a[2]-c[2]);
  const [x,y,cost]=queue.shift(),k=`${x},${y}`;
  if(goalSet.has(k)){found=k;break}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,nk=`${nx},${ny}`;if(nx<0||nx>=W||ny<0||ny>=H)continue;
   if(!traversableForEnemy(b,u,nx,ny))continue;
   const next=cost+terrainCost(u,nx,ny);if(next>=(costs.get(nk)??Infinity))continue;
   costs.set(nk,next);prev.set(nk,k);queue.push([nx,ny,next]);
  }
 }
 if(!found)return [];
 const path=[];let k=found;
 while(k!==start){const [x,y]=k.split(',').map(Number);path.unshift({x,y});k=prev.get(k);if(!k)break}
 return path;
}
function moveEnemyAlong(b,e,path,stage){
 let budget=movePoints(e)+([0,1,1,2][stage]||0),spent=0,final=null;
 for(const step of path){
  const c=terrainCost(e,step.x,step.y);if(spent+c>budget)break;spent+=c;
  if(!occupiedAt(b,step.x,step.y))final=step;
 }
 if(!final)return 0;
 e.x=final.x;e.y=final.y;e.movedDistance=spent;e.movedThisTurn=true;
 b.logs.unshift(`${e.name}隊が城門へ向けて${spent}移動力分前進した。`);
 b.v2438PhaseActivity=(Number(b.v2438PhaseActivity)||0)+1;
 return spent;
}
function enemyAttackUnit(b,e,target,stage){
 if(!target||dist(e,target)>attackRange(e))return 0;
 let raw;
 if(typeof V.normalDamage==='function')raw=Number(V.normalDamage(e,target)?.damage)||1;
 else raw=90+(Number(e.war)||50)*2+(Number(e.troops)||0)*.03+rand(0,100);
 raw*=1+stage*.05;
 const before=Number(target.troops)||0;
 const damage=typeof V.applyDamage==='function'?V.applyDamage(target,raw):Math.min(before,Math.max(1,Math.floor(raw)));
 if(typeof V.applyDamage!=='function')target.troops=Math.max(0,before-damage);
 b.logs.unshift(`${e.name}隊が城外の${target.name}隊へ${damage.toLocaleString()}損害。`);
 b.v2438PhaseActivity=(Number(b.v2438PhaseActivity)||0)+1;
 window.checkBattleEnd();
 return damage;
}
function exposedDefenders(b){return living(b,'player').filter(u=>Number(u.x)<WALL_X)}
function nearestByDistance(e,list){return list.slice().sort((a,c)=>dist(e,a)-dist(e,c)||(Number(a.troops)||0)-(Number(c.troops)||0))[0]||null}
function assaultAction(b,e,stage){
 if(e.v2432SkipEnemyAction>0){e.v2432SkipEnemyAction--;b.logs.unshift(`${e.name}隊は一騎打ちの疲労で行動できない。`);return}
 if(e.skipTurns>0){e.skipTurns--;b.logs.unshift(`${e.name}隊は混乱し、行動できない。`);return}
 const gate=gateUnit(b),range=attackRange(e);
 let target=nearestByDistance(e,gateAlive(b)?exposedDefenders(b):living(b,'player'));
 if(target&&dist(e,target)<=range){enemyAttackUnit(b,e,target,stage);if(e.weakenTurns>0)e.weakenTurns--;return}
 if(gateAlive(b)&&gate&&dist(e,gate)<=range){damageGateByUnit(b,e,stage);if(e.weakenTurns>0)e.weakenTurns--;return}
 if(e.immobileTurns>0){e.immobileTurns--;b.logs.unshift(`${e.name}隊は落とし穴に阻まれ、移動できない。`);return}
 const objective=target||(gateAlive(b)?gate:nearestByDistance(e,living(b,'player')));
 if(!objective)return;
 const goals=goalsAroundTarget(b,e,objective,objective===gate?range:range,objective===gate);
 const path=bestPath(b,e,goals);
 moveEnemyAlong(b,e,path,stage);
 target=nearestByDistance(e,gateAlive(b)?exposedDefenders(b):living(b,'player'));
 if(target&&dist(e,target)<=range)enemyAttackUnit(b,e,target,stage);
 else if(gateAlive(b)&&gate&&dist(e,gate)<=range)damageGateByUnit(b,e,stage);
 if(e.weakenTurns>0)e.weakenTurns--;
}
function finishAssaultPhase(b){
 if(state?.battle!==b)return;
 if(gateAlive(b)&&Number(b.v2438PhaseActivity||0)===0)bombardGate(b,assaultStage(Number(b.day)||1),true);
 if(b.playerGuardTurns>0)b.playerGuardTurns--;
 if(window.checkBattleEnd())return;
 for(const u of living(b,'player')){
  u.movedDistance=0;u.movedThisTurn=false;
  if(u.skipTurns>0){u.skipTurns--;u.done=true;b.logs.unshift(`${u.name}隊は混乱のため次の行動を失った。`)}else u.done=false;
 }
 b.phase='player';b.day=(Number(b.day)||1)+1;b.v2432EnemyChallengeThisPhase=false;b.v2438PhaseActivity=0;
 window.render();
}

window.enemyPhase=function(){
 const b=state?.battle;
 if(!isDefenseSiege(b)||!gateAlive(b))return previousEnemyPhase.apply(this,arguments);
 normalizeGateCorridor(b);
 const day=Number(b.day)||1,stage=assaultStage(day);announceAssaultStage(b,stage);
 b.phase='enemy';b.v2432EnemyChallengeThisPhase=false;b.v2438PhaseActivity=0;
 window.render();
 if(day>=4&&day%4===0&&gateAlive(b))bombardGate(b,stage,false);
 const queue=living(b,'enemy').map(u=>u.name);let index=0;
 const next=()=>{
  if(state?.battle!==b)return;
  if(window.checkBattleEnd())return;
  const name=queue[index++];if(!name)return finishAssaultPhase(b);
  const e=living(b,'enemy').find(u=>u.name===name);if(!e)return setTimeout(next,35);
  e.movedDistance=0;e.movedThisTurn=false;
  assaultAction(b,e,stage);
  if(state?.battle!==b||window.checkBattleEnd())return;
  setTimeout(next,120);
 };
 setTimeout(next,280);
};

function resolveSiegeDeadline(b){
 if(!isDefenseSiege(b)||!gateAlive(b)||Number(b.day)<=SIEGE_HOLD_LIMIT||b.v2438DeadlineResolved)return false;
 b.v2438DeadlineResolved=true;b._v2427Resolving=true;b._v2427EndReason='siege-hold';
 const msg=`${SIEGE_HOLD_LIMIT}往復にわたり城門を守り切った。攻城側は損害と兵糧消耗に耐えられず撤退した。`;
 b.logs.unshift(msg);if(typeof log==='function')log(msg);
 window.endBattle(true,false);return true;
}
window.checkBattleEnd=function(){
 const b=state?.battle;if(b&&resolveSiegeDeadline(b))return true;
 return previousCheckBattleEnd.apply(this,arguments);
};

function decorateSiegeInfo(){
 const b=state?.battle;if(!isDefenseSiege(b))return;
 normalizeGateCorridor(b);
 const gate=gateUnit(b),stage=assaultStage(Number(b.day)||1),phase=document.querySelector('.phase');
 if(phase){
  const old=[...phase.querySelectorAll('small')].find(x=>x.textContent.includes('30往復'));
  if(old&&gateAlive(b))old.textContent=`攻城期限 ${Math.min(SIEGE_HOLD_LIMIT,Number(b.day)||1)}/${SIEGE_HOLD_LIMIT}往復　城門健在で守り切れば敵軍撤退`;
  let info=phase.querySelector('.v2438-pressure');if(!info){info=document.createElement('small');info.className='v2438-pressure';phase.append(document.createElement('br'),info)}
  info.textContent=`敵攻勢：${assaultLabel(stage)}${gate?`／城門耐久 ${Math.max(0,Number(gate.troops)||0).toLocaleString()}`:''}`;
 }
 const panel=document.querySelector('.battle > .panel:last-child');
 if(panel&&!panel.querySelector('.v2438-sortie-help')){
  const help=document.createElement('div');help.className='v2438-sortie-help';
  help.innerHTML='<b>守備側の出撃</b>　味方部隊は健在な城門を通過して城外へ出られます。城門マスでは停止できません。敵軍は城門を破壊するまで通過できません。';
  panel.querySelector('.battle-actions')?.before(help);
 }
 decorateSortieMovement();
}
window.render=function(){
 const b=state?.battle;
 if(b){normalizeGateCorridor(b);if(resolveSiegeDeadline(b))return}
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(()=>{try{decorateSiegeInfo()}catch(e){console.error('v24.38 siege:',e)}},110);
 return result;
};

const style=document.createElement('style');
style.textContent=`
.battle-grid .cell.v2438-sortie-gate{box-shadow:inset 0 0 0 3px #7ed6ff,0 0 12px rgba(77,184,235,.55)!important}.battle-grid .cell.v2438-sortie-gate:after{content:'⇄';position:absolute;right:3px;top:0;color:#bdeeff;font-size:12px;font-weight:900}.battle-grid .cell.v2438-sortie-route{box-shadow:inset 0 0 0 2px #7bd4ff,inset 0 0 16px rgba(85,194,239,.38)!important}.v2438-pressure{color:#ffcf77!important;font-weight:800}.v2438-sortie-help{margin:8px 0;padding:9px 10px;border:1px solid #4f7f98;background:#101c23;color:#cdeaf6;font-size:11px;line-height:1.55}
`;
document.head.appendChild(style);
})();
