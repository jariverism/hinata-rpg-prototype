// v24.68 — Battle 2.0 foundation: morale/rout, battlefield objectives, logistics and safer intrigue
(()=>{
if(window.V2468_BATTLE2)return;window.V2468_BATTLE2=true;
const V39=window.V2439||{},V32=window.V2432||{};
const previousRender=window.render;
const previousAfterPlayerAction=window.afterPlayerAction;
const previousCheckBattleEnd=window.checkBattleEnd;
const previousEndBattle=window.endBattle;
const previousBattleAction=window.battleAction;
const previousEnemyAct=typeof V39.enemyAct==='function'?V39.enemyAct:null;
const previousNormalDamage=typeof V39.normalDamage==='function'?V39.normalDamage:null;
const previousChooseType=window.v243ChooseType;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function dist(a,b){return Math.abs(Number(a?.x)-Number(b?.x))+Math.abs(Number(a?.y)-Number(b?.y))}
function typeOf(u){return typeof V39.typeOf==='function'?V39.typeOf(u):(u?.type||u?.apt||'剣盾兵')}
function isLarge(b){return !!b?.v2439LargeSiege}
function attackerSide(b){return typeof V39.attackerSide==='function'?V39.attackerSide(b):(b?.defense?'enemy':'player')}
function defenderSide(b){return typeof V39.defenderSide==='function'?V39.defenderSide(b):(b?.defense?'player':'enemy')}
function units(b,side=null){return (b?.units||[]).filter(u=>!u.v2436Structure&&Number(u.troops)>0&&!u.v2468Routed&&(!side||u.side===side))}
function officerByUnit(u){return (state?.officers||[]).find(o=>o.name===u?.name)||null}
function moraleAverage(b,side){const xs=units(b,side);return xs.length?Math.round(xs.reduce((s,u)=>s+(Number(u.morale)||0),0)/xs.length):0}
function terrainAt(b,x,y){return typeof V39.terrainAt==='function'?V39.terrainAt(b,x,y):'plain'}
function passableObjective(b,x,y){const t=terrainAt(b,x,y);return t!=='water'&&t!=='mountain'}
function pickCell(b,candidates){return candidates.find(p=>p.x>=0&&p.x<15&&p.y>=0&&p.y<13&&passableObjective(b,p.x,p.y))||candidates[0]}
function keepCell(){return typeof V39.keepCell==='function'?V39.keepCell():{x:Number(V39.CX??7),y:Number(V39.CY??6)}}

function buildObjectives(b){
 const atk=attackerSide(b),def=defenderSide(b),dir=b.v2439Direction||'west';
 const campCandidates=dir==='east'?[{x:13,y:6},{x:13,y:5},{x:13,y:7},{x:12,y:6}]:dir==='north'?[{x:7,y:1},{x:6,y:1},{x:8,y:1},{x:7,y:2}]:dir==='south'?[{x:7,y:11},{x:6,y:11},{x:8,y:11},{x:7,y:10}]:[{x:1,y:6},{x:1,y:5},{x:1,y:7},{x:2,y:6}];
 const camp=pickCell(b,campCandidates);
 const granary=pickCell(b,[{x:6,y:7},{x:8,y:7},{x:6,y:5},{x:8,y:5}]);
 const tower=pickCell(b,[{x:5,y:4},{x:9,y:4},{x:5,y:8},{x:9,y:8}]);
 return [
  {id:'camp',name:'攻城軍本陣',mark:'陣',x:camp.x,y:camp.y,owner:atk,initialOwner:atk},
  {id:'granary',name:'兵糧庫',mark:'糧',x:granary.x,y:granary.y,owner:def,initialOwner:def},
  {id:'tower',name:'櫓',mark:'櫓',x:tower.x,y:tower.y,owner:def,initialOwner:def}
 ];
}
function ensure(b){
 if(!isLarge(b)||!b.v2439DeploymentDone)return false;
 if(!Array.isArray(b.v2468Objectives))b.v2468Objectives=buildObjectives(b);
 b.v2468Version=168;
 b.v2468TroopSnapshot=b.v2468TroopSnapshot||{};
 b.v2468PosSnapshot=b.v2468PosSnapshot||{};
 for(const u of b.units||[]){
  if(u.v2436Structure)continue;
  if(!Number.isFinite(Number(u.v2468StartMax)))u.v2468StartMax=Math.max(1,Number(u.max)||Number(u.troops)||1);
  if(!Number.isFinite(Number(b.v2468TroopSnapshot[u.name])))b.v2468TroopSnapshot[u.name]=Number(u.troops)||0;
  if(!b.v2468PosSnapshot[u.name])b.v2468PosSnapshot[u.name]={x:Number(u.x),y:Number(u.y)};
 }
 if(!Number.isFinite(Number(b.v2468LastDay)))b.v2468LastDay=Number(b.day)||1;
 if(!b.v2468Started){b.v2468Started=true;b.logs=b.logs||[];b.logs.unshift('戦闘2.0：士気・潰走、兵糧庫・櫓・攻城軍本陣、補給線が有効。')}
 return true;
}
function objective(b,id){return (b?.v2468Objectives||[]).find(o=>o.id===id)||null}
function supplyBroken(b,side){
 if(!ensure(b))return false;
 const atk=attackerSide(b),def=defenderSide(b);
 if(side===atk){const camp=objective(b,'camp');return !!camp&&camp.owner!==atk}
 if(side===def){const granary=objective(b,'granary');return !!granary&&granary.owner!==def}
 return false;
}
function recordSnapshots(b,u=null){
 const list=u?[u]:(b?.units||[]);
 for(const x of list){if(x?.v2436Structure)continue;b.v2468TroopSnapshot[x.name]=Number(x.troops)||0;b.v2468PosSnapshot[x.name]={x:Number(x.x),y:Number(x.y)}}
}
function routeUnit(b,u,reason){
 if(!u||u.v2468Routed||Number(u.troops)<=0)return false;
 const survivors=Number(u.troops)||0;u.v2468Routed=true;u.v2468RoutedTroops=survivors;u.troops=0;u.done=true;u.movedThisTurn=true;
 b.logs=b.logs||[];b.logs.unshift(`${u.name}隊は士気が崩壊し潰走！ ${reason||'戦線を離脱した。'}`);
 const commander=b.v2436Commanders?.[u.side];
 if(commander===u.name){for(const ally of units(b,u.side)){if(ally!==u)ally.morale=clamp((Number(ally.morale)||50)-18,0,100)}b.logs.unshift(`総大将${u.name}隊の潰走で全軍が動揺！`) }
 recordSnapshots(b,u);return true;
}
function changeMorale(b,u,delta,reason='',allowRoute=true){
 if(!u||u.v2468Routed||Number(u.troops)<=0)return 0;
 const before=Number.isFinite(Number(u.morale))?Number(u.morale):60;u.morale=clamp(before+delta,0,100);
 if(allowRoute&&u.morale<=10)routeUnit(b,u,reason||'士気が10以下に低下。');
 return u.morale-before;
}
function moraleSide(b,side,delta,reason){for(const u of [...units(b,side)])changeMorale(b,u,delta,reason)}
function syncDamageMorale(b){
 if(!ensure(b))return;
 for(const u of b.units||[]){
  if(u.v2436Structure)continue;
  const cur=Number(u.troops)||0,prev=Number(b.v2468TroopSnapshot[u.name]);
  if(Number.isFinite(prev)&&cur<prev&&!u.v2468Routed){
   if(cur>0){const max=Math.max(1,Number(u.v2468StartMax)||Number(u.max)||prev),ratio=(prev-cur)/max,drop=clamp(Math.round(3+ratio*45),3,18);changeMorale(b,u,-drop,`大損害で士気が低下（-${drop}）。`)}
   else if(prev>0&&b.v2436Commanders?.[u.side]===u.name){moraleSide(b,u.side,-18,`総大将${u.name}隊が壊滅。`);b.logs.unshift(`総大将${u.name}隊壊滅！ 全軍士気が大幅低下。`)}
  }
  b.v2468TroopSnapshot[u.name]=cur;
 }
}
function captureAt(b,u){
 if(!ensure(b)||!u||u.v2468Routed||Number(u.troops)<=0)return false;
 let changed=false;
 for(const o of b.v2468Objectives){
  if(Number(o.x)!==Number(u.x)||Number(o.y)!==Number(u.y)||o.owner===u.side)continue;
  const old=o.owner;o.owner=u.side;changed=true;b.logs.unshift(`${u.name}隊が${o.name}を制圧！`);
  if(o.id==='camp'){
   const atk=attackerSide(b);if(u.side!==atk){moraleSide(b,atk,-15,'攻城軍本陣を奪われた。');b.logs.unshift('攻城軍の補給線が断絶。攻城側全軍士気－15。')}else{moraleSide(b,atk,8,'攻城軍本陣を奪回。')}
  }else if(o.id==='granary'){
   const def=defenderSide(b);if(u.side!==def){moraleSide(b,def,-12,'兵糧庫を奪われた。');b.logs.unshift('守備軍の兵糧庫が陥落。守備側全軍士気－12。')}else{moraleSide(b,def,6,'兵糧庫を奪回。')}
  }else if(o.id==='tower'){moraleSide(b,u.side,5,'櫓を確保。');if(old!==u.side)b.logs.unshift('櫓を確保した側の弩兵攻撃が強化される。')}
 }
 return changed;
}
function syncMoves(b){
 if(!ensure(b))return;
 for(const u of b.units||[]){
  if(u.v2436Structure||u.v2468Routed||Number(u.troops)<=0)continue;
  const p=b.v2468PosSnapshot[u.name],moved=!p||Number(p.x)!==Number(u.x)||Number(p.y)!==Number(u.y);if(moved)captureAt(b,u);
  b.v2468PosSnapshot[u.name]={x:Number(u.x),y:Number(u.y)};
 }
}
function dailyEffects(b){
 if(!ensure(b))return;
 const day=Number(b.day)||1,last=Number(b.v2468LastDay)||day;if(day<=last)return;b.v2468LastDay=day;
 for(const side of ['player','enemy'])if(supplyBroken(b,side)){moraleSide(b,side,-8,'補給断絶が続いている。');b.logs.unshift(`${side==='player'?'日向軍':'敵軍'}は補給断絶により全軍士気－8。`)}
 const tower=objective(b,'tower');if(tower?.owner)moraleSide(b,tower.owner,2,'櫓から戦況を掌握。');
}
function towerBuff(b,u){const t=objective(b,'tower');return !!(t&&t.owner===u?.side&&typeOf(u)==='弩兵')}

if(previousNormalDamage){
 V39.normalDamage=function(attacker,target,b){const r=previousNormalDamage.apply(this,arguments)||{damage:1,notes:[]};let mult=1;const m=Number(attacker?.morale)||60;if(m<30)mult*=.82;else if(m>=80)mult*=1.06;if(towerBuff(b,attacker))mult*=1.15;r.damage=Math.max(1,Math.floor(Number(r.damage||1)*mult));r.notes=[...(r.notes||[])];if(towerBuff(b,attacker))r.notes.push('櫓支援');if(m<30)r.notes.push('低士気');return r};
}

function objectiveForAI(b,u){
 const atk=attackerSide(b),def=defenderSide(b),players=units(b,'player');if(!players.length)return null;
 const range=typeOf(u)==='弩兵'?3:1;if(players.some(p=>dist(u,p)<=range))return null;
 if(u.side===atk){const g=objective(b,'granary');if(g&&g.owner===def)return g}
 if(u.side===def){
  const camp=objective(b,'camp'),tower=objective(b,'tower'),keep=keepCell(),nearestKeep=Math.min(...players.map(p=>dist(p,keep)));
  if(camp&&camp.owner===atk&&typeOf(u)==='騎兵'&&nearestKeep>3)return camp;
  if(tower&&tower.owner!==def&&nearestKeep>2)return tower;
 }
 return null;
}
function tryObjectiveAI(b,u){
 const o=objectiveForAI(b,u);if(!o||typeof V39.pathToGoals!=='function'||typeof V39.moveEnemyAlong!=='function')return false;
 const occ=typeof V39.occupiedAt==='function'?V39.occupiedAt(b,o.x,o.y):null;if(occ&&occ.side!==u.side)return false;
 const path=V39.pathToGoals(b,u,[{x:o.x,y:o.y}]);if(!path?.length)return false;
 V39.moveEnemyAlong(b,u,path);syncMoves(b);captureAt(b,u);
 const targets=units(b,'player'),range=typeOf(u)==='弩兵'?3:1,target=targets.filter(t=>dist(u,t)<=range).sort((a,c)=>a.troops-c.troops)[0];if(target&&typeof V39.enemyAttack==='function')V39.enemyAttack(b,u,target);
 return true;
}
if(previousEnemyAct){
 V39.enemyAct=function(b,u){
  ensure(b);syncDamageMorale(b);dailyEffects(b);
  const penalty=supplyBroken(b,u?.side)?1:0;if(penalty)u.moveRangeBonus=(Number(u.moveRangeBonus)||0)-1;
  let result;try{if(!tryObjectiveAI(b,u))result=previousEnemyAct.apply(this,arguments)}finally{if(penalty)u.moveRangeBonus=(Number(u.moveRangeBonus)||0)+1}
  syncMoves(b);syncDamageMorale(b);return result;
 };
}

function enemyForceForBattle(b){return b?.defense?(b.invadingForce||state?.cities?.[b.enemySource]?.force):state?.cities?.[b.target]?.force}
function applyMoleSabotage(b){
 if(!b||b._v2424MolesChecked||!state?.v2424Moles)return false;
 let changed=false;const force=enemyForceForBattle(b);if(!force){b._v2424MolesChecked=true;return false}
 for(const u of (b.units||[]).filter(x=>x.side==='enemy'&&Number(x.troops)>0)){
  const o=(state.officers||[]).find(x=>x.name===u.name&&x.force===force&&x.v2424MoleId&&state.v2424Moles?.[x.v2424MoleId]);if(!o)continue;
  const id=o.v2424MoleId,before=Number(u.troops)||0,loss=Math.max(1,Math.floor(before*.15));u.troops=Math.max(1,before-loss);u.morale=clamp((Number(u.morale)||60)-35,0,100);u.skipTurns=Math.max(Number(u.skipTurns)||0,1);u.weakenTurns=Math.max(Number(u.weakenTurns)||0,1);u.v2468BetrayVulnerable=true;
  delete state.v2424Moles[id];delete o.v2424MoleId;changed=true;b.logs=b.logs||[];b.logs.unshift(`伏毒発動！ ${o.name}隊で離反者が続出し${loss.toLocaleString()}兵が離脱、士気－35・混乱。武将本人はまだ敵軍に留まる。`);
  if(typeof log==='function')log(`伏毒の計が発動。${force}軍${o.name}隊の兵と士気を崩した。`);
 }
 b._v2424MolesChecked=true;if(changed){ensure(b);recordSnapshots(b)}return changed;
}

function alertMap(){state.v2468BetrayAlert=state.v2468BetrayAlert&&typeof state.v2468BetrayAlert==='object'?state.v2468BetrayAlert:{};return state.v2468BetrayAlert}
function battleOfficer(u){return typeof V32.officerOfUnit==='function'?V32.officerOfUnit(u):officerByUnit(u)}
function betrayChance(actor,target){
 const o=battleOfficer(target),loy=Number(o?.loy??75),ai=Number(actor?.int)||50,ti=Number(target?.int)||50,force=o?.force||'';let value=5+ai*.55-ti*.30+(100-loy)*.40;
 if(Number(alertMap()[force]||0)>=Number(state.turn||0))value-=25;if(target?.v2468BetrayVulnerable)value+=15;
 if(o?.status==='君主'||loy>=90||state?.battle?.v2436Commanders?.[target.side]===target.name)return 0;
 return clamp(Math.round(value),2,55);
}
function betrayalTargets(actor){
 const enemies=typeof V32.alive==='function'?V32.alive(actor.side==='player'?'enemy':'player'):(state?.battle?.units||[]).filter(u=>u.side!==actor.side&&Number(u.troops)>0);
 return enemies.filter(t=>dist(actor,t)<=3&&betrayChance(actor,t)>0);
}
function executeBetrayal(actor,target){
 const b=state.battle,o=battleOfficer(target),oldForce=o?.force||enemyForceForBattle(b)||'敵軍',chance=betrayChance(actor,target),success=Math.random()*100<chance;alertMap()[oldForce]=Math.max(Number(alertMap()[oldForce])||0,Number(state.turn||0)+(success?6:3));
 if(success){
  const before=Number(target.troops)||0,joined=Math.max(200,Math.floor(before*.45)),deserted=Math.max(0,before-joined),newSide=actor.side;target.side=newSide;target.troops=joined;target.morale=55;target.done=true;target.movedThisTurn=false;target.weakenTurns=0;target.skipTurns=0;target.v2468BetrayVulnerable=false;
  if(o){o.force=newSide==='player'?'日向軍':enemyForceForBattle(b);o.status='一般';o.loy=clamp(55+Math.floor((Number(actor.int)||50)/10),55,68);o.city=newSide==='player'?(b.defense?b.target:b.src):(b.defense?b.enemySource:b.target)}
  b.logs.unshift(`${actor.name}の説得成功！ ${target.name}隊は裏切ったが、混乱で${deserted.toLocaleString()}兵が離脱。${joined.toLocaleString()}兵だけが新陣営へ加わった。${oldForce}軍は警戒状態に入った。`);ensure(b);recordSnapshots(b,target);return true;
 }
 if(o)o.loy=Math.min(100,Number(o.loy??75)+3);changeMorale(b,target,5,'裏切り工作を拒絶し結束。',false);b.logs.unshift(`${actor.name}の裏切り工作は失敗（成功率${chance}%）。${oldForce}軍は警戒を強めた。`);return false;
}
function executeRumor(actor,target){const b=state.battle,chance=clamp(Math.round(22+(Number(actor.int)||50)*.68-(Number(target.int)||50)*.32),8,88),ok=Math.random()*100<chance;if(ok){changeMorale(b,target,-18,'流言で軍心が乱れた。');target.skipTurns=Math.max(Number(target.skipTurns)||0,1);target.weakenTurns=Math.max(Number(target.weakenTurns)||0,1);b.logs.unshift(`${actor.name}の流言成功！ ${target.name}隊は士気－18・混乱。`)}else b.logs.unshift(`${actor.name}の流言は見破られた（成功率${chance}%）。`);return ok}
function executePit(actor,target){const b=state.battle,chance=clamp(Math.round(18+(Number(actor.int)||50)*.70-(Number(target.int)||50)*.24),8,90),ok=Math.random()*100<chance;if(ok){const amount=180+(Number(actor.int)||50)*2.7+(Number(target.troops)||0)*.045+Math.floor(Math.random()*131),before=Number(target.troops)||0;target.troops=Math.max(0,before-Math.max(1,Math.floor(amount)));target.immobileTurns=Math.max(Number(target.immobileTurns)||0,1);b.logs.unshift(`${actor.name}の落とし穴成功！ ${target.name}隊へ${(before-target.troops).toLocaleString()}損害、移動を封じた。`);syncDamageMorale(b)}else b.logs.unshift(`${actor.name}の落とし穴は見破られた（成功率${chance}%）。`);return ok}
function finishTactic(actor){const b=state.battle;b.v2432TacticUsed=b.v2432TacticUsed||{};b.v2432TacticUsed[actor.name]=true;actor.done=true;actor.movedDistance=0;b.mode=null;b.v2432Mode=null;if(window.checkBattleEnd())return;if(typeof previousAfterPlayerAction==='function')previousAfterPlayerAction();else window.render()}
function playerTactic2(){
 const b=state?.battle,actor=(b?.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0&&!u.v2468Routed);if(!b||!actor||actor.done)return;
 showModal(`<h2>戦場計略</h2><p>実行武将：<b>${actor.name}</b>　知力${actor.int}</p><div class="stratagem-grid"><button data-v2468-kind="betray"><b>裏切り</b><small>君主・総大将・忠誠90以上は対象外。成功しても兵の45%だけが加入。同一勢力は成功後6か月警戒。</small></button><button data-v2468-kind="rumor"><b>流言</b><small>敵軍の士気を大きく下げ、混乱させる。潰走を狙える。</small></button><button data-v2468-kind="pit"><b>落とし穴</b><small>兵力損害と移動不能。損害によって士気も下がる。</small></button></div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2468-kind]').forEach(btn=>btn.onclick=()=>{
  const kind=btn.dataset.v2468Kind,all=kind==='betray'?betrayalTargets(actor):(state.battle.units||[]).filter(t=>t.side==='enemy'&&Number(t.troops)>0&&dist(actor,t)<=(kind==='rumor'?4:3));if(!all.length)return alert('射程内に対象がいません。');
  showModal(`<h2>${kind==='betray'?'裏切り':kind==='rumor'?'流言':'落とし穴'}：対象</h2><div class="choice-list">${all.map(t=>`<button data-v2468-target="${t.name}"><b>${t.name}</b>　士気${Math.round(Number(t.morale)||0)}${kind==='betray'?`　忠誠${battleOfficer(t)?.loy??'―'}　成功率${betrayChance(actor,t)}%`:''}</button>`).join('')}</div><button data-close>中止</button>`);
  modalCard.querySelectorAll('[data-v2468-target]').forEach(x=>x.onclick=()=>{const t=(state.battle.units||[]).find(u=>u.name===x.dataset.v2468Target&&u.side==='enemy'&&Number(u.troops)>0);if(!t)return;closeModal();if(kind==='betray')executeBetrayal(actor,t);else if(kind==='rumor')executeRumor(actor,t);else executePit(actor,t);finishTactic(actor)});
 });
}
if(V32&&typeof V32==='object')V32.playerTactic=playerTactic2;

window.v243ChooseType=function(actor){const r=typeof previousChooseType==='function'?previousChooseType.apply(this,arguments):undefined;const btn=modalCard?.querySelector?.('[data-v2424-type="mole"]');if(btn)btn.innerHTML='<b>伏毒の計</b><small>敵将の部隊へ内応工作を仕込み、次の対日向戦で兵15%離脱・士気－35・混乱を発生。武将は自動では寝返らず、戦場の「裏切り」で説得しやすくなる。</small>';return r};

window.afterPlayerAction=function(){const b=state?.battle;if(isLarge(b)){ensure(b);syncMoves(b);syncDamageMorale(b);dailyEffects(b)}return previousAfterPlayerAction.apply(this,arguments)};
window.checkBattleEnd=function(){const b=state?.battle;if(isLarge(b)){ensure(b);syncMoves(b);syncDamageMorale(b);dailyEffects(b);const p=units(b,'player'),e=units(b,'enemy');if(!e.length&&b.v2468Objectives)b.logs.unshift('敵軍の戦線が崩壊した。');if(!p.length&&b.v2468Objectives)b.logs.unshift('日向軍の戦線が崩壊した。')}return previousCheckBattleEnd.apply(this,arguments)};
window.endBattle=function(){const b=state?.battle;if(b)for(const u of b.units||[])if(u.side==='player'&&u.v2468Routed&&Number(u.v2468RoutedTroops)>0)u.troops=Number(u.v2468RoutedTroops);return previousEndBattle.apply(this,arguments)};
window.battleAction=function(action){const b=state?.battle;if(isLarge(b)&&action==='tactic'&&supplyBroken(b,'player')){b.logs.unshift('補給断絶中でも戦場計略は使えるが、士気低下で継戦が難しい。')}return previousBattleAction.apply(this,arguments)};

function sideLabel(side){return side==='player'?'日向軍':'敵軍'}
function decorate(){
 const b=state?.battle;if(!ensure(b))return;syncMoves(b);syncDamageMorale(b);dailyEffects(b);
 document.querySelectorAll('.v2468-objective-mark,.v2468-status').forEach(n=>n.remove());
 for(const o of b.v2468Objectives){const cell=document.querySelector(`[data-cell="${o.x},${o.y}"]`);if(!cell)continue;const mark=document.createElement('span');mark.className=`v2468-objective-mark v2468-${o.id}`;mark.textContent=o.mark;mark.title=`${o.name}：${sideLabel(o.owner)}支配`;cell.appendChild(mark)}
 const panel=document.querySelector('.v2439-war-guide')?.parentElement||document.querySelector('.battle-actions')?.parentElement;if(!panel)return;
 const box=document.createElement('div');box.className='v2468-status';const camp=objective(b,'camp'),granary=objective(b,'granary'),tower=objective(b,'tower');box.innerHTML=`<b>戦闘2.0</b><br>日向軍 士気平均${moraleAverage(b,'player')} ${supplyBroken(b,'player')?'⚠補給断絶':'補給○'} ／ 敵軍 士気平均${moraleAverage(b,'enemy')} ${supplyBroken(b,'enemy')?'⚠補給断絶':'補給○'}<br><small>陣:${sideLabel(camp.owner)}　糧:${sideLabel(granary.owner)}　櫓:${sideLabel(tower.owner)}　｜ 士気10以下で潰走</small>`;const anchor=panel.querySelector('.v2439-war-guide')||panel.querySelector('.battle-actions');panel.insertBefore(box,anchor||null);
}
window.render=function(){
 const b=state?.battle;if(isLarge(b)){ensure(b);applyMoleSabotage(b);syncMoves(b);syncDamageMorale(b);dailyEffects(b)}
 let penaltyUnit=null;if(isLarge(b)&&b.phase==='player'){const p=(b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0);if(p&&supplyBroken(b,'player')){p.moveRangeBonus=(Number(p.moveRangeBonus)||0)-1;penaltyUnit=p}}
 const r=previousRender.apply(this,arguments);if(penaltyUnit)penaltyUnit.moveRangeBonus=(Number(penaltyUnit.moveRangeBonus)||0)+1;
 if(state?.battle&&isLarge(state.battle))setTimeout(()=>{try{decorate()}catch(e){console.error('v24.68 battle2 UI:',e)}},0);return r;
};

const style=document.createElement('style');style.textContent=`
.v2468-objective-mark{position:absolute;right:1px;bottom:1px;z-index:8;min-width:18px;height:18px;padding:1px 3px;border:1px solid #f5d27a;border-radius:4px;background:#25180b;color:#ffe7a3;font-size:10px;font-weight:900;line-height:14px;pointer-events:none}.v2468-camp{background:#5b261c}.v2468-granary{background:#66500d}.v2468-tower{background:#243f5d}.v2468-status{margin:8px 0;padding:8px 10px;border:1px solid #9b7234;background:#18120c;color:#f7deb0;font-size:11px;line-height:1.55}.v2468-status b{color:#fff1bb}.v2439-grid .cell{position:relative}
`;document.head.appendChild(style);
window.V2468={ensure,objective,supplyBroken,changeMorale,routeUnit,syncDamageMorale,captureAt,syncMoves,dailyEffects,applyMoleSabotage,betrayChance,executeBetrayal,playerTactic2,decorate};
})();
