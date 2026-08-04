// v24.32 systems — duels, intelligence stratagems and terrain-aware enemy AI
(()=>{
const V=window.V2432;if(!V)return;
const {W,H,clamp,rand,typeOf,dist,key,alive,occupiedAt,officerOfUnit,currentUnit,battleEnemyForce,ensureBattle,terrainAt,movePoints,terrainCost,applyDamage,normalDamage,syncExperience,finishPlayerAction}=V;
function duelAcceptance(challenger,target){
 const targetOfficer=officerOfUnit(target),ruler=targetOfficer?.status==='君主'?5:0;
 return clamp(Math.round(44+(Number(target.war)-Number(challenger.war))*1.15+ruler),8,88);
}
function duelScore(u){return (Number(u.war)||50)*1.15+(Number(u.lead)||50)*.10+rand(0,34)}
function resolveDuel(a,b,source){
 const ba=duelScore(a),bb=duelScore(b),winner=ba>=bb?a:b,loser=winner===a?b:a,gap=Math.abs(ba-bb);
 const before=loser.troops,factor=.18+Math.min(.32,gap/100)+(gap>=35?.12:0),damage=applyDamage(loser,Math.max(260,loser.troops*factor));
 loser.weakenTurns=Math.max(loser.weakenTurns||0,1);if(gap>=38)loser.skipTurns=Math.max(loser.skipTurns||0,1);
 state.battle.logs.unshift(`一騎打ち！ ${winner.name}が${loser.name}を破り、${loser.name}隊に${damage}損害${gap>=38?'、大きく動揺させた':''}。`);
 if(winner.side==='player')syncExperience(winner.name,loser,before);
 return {winner,loser,gap,damage};
}
function playerDuel(){
 const b=state.battle,p=currentUnit();if(!p||p.done)return;
 if(b.v2432DuelUsed[p.name])return alert(`${p.name}はこの戦闘ですでに一騎打ちを申し込んでいます。`);
 const targets=alive('enemy').filter(e=>dist(p,e)<=2);
 if(!targets.length)return alert('2マス以内に一騎打ちを申し込める敵将がいません。');
 showModal(`<h2>一騎打ちを申し込む</h2><p>敵将が応じるかは、双方の武力差などで決まります。一度断られても、この戦闘中の再挑戦はできません。</p><div class="choice-list">${targets.map(t=>`<button data-v2432-duel="${t.name}"><b>${t.name}</b>　武力${t.war}<br><small>応諾見込 ${duelAcceptance(p,t)}%</small></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2432-duel]').forEach(btn=>btn.onclick=()=>{
  const t=alive('enemy').find(e=>e.name===btn.dataset.v2432Duel);if(!t)return;
  b.v2432DuelUsed[p.name]=true;const chance=duelAcceptance(p,t);closeModal();
  if(Math.random()*100>=chance){b.logs.unshift(`${p.name}が${t.name}へ一騎打ちを申し込んだが、${t.name}は応じなかった。`);return render()}
  resolveDuel(p,t,'player');p.done=true;t.v2432SkipEnemyAction=(t.v2432SkipEnemyAction||0)+1;
  if(window.checkBattleEnd())return;window.afterPlayerAction();
 });
}
function enemyDuelOffer(enemy,target,continuation){
 const b=state.battle;b.v2432EnemyChallengeThisPhase=true;enemy.v2432DuelOffered=true;
 showModal(`<h2>敵将から一騎打ち</h2><p><b>${enemy.name}</b>（武力${enemy.war}）が、<b>${target.name}</b>（武力${target.war}）へ一騎打ちを申し込んできました。</p><div class="v2432-duel-actions"><button id="v2432-duel-accept" class="danger">受ける</button><button id="v2432-duel-decline">断る</button></div>`);
 modalCard.querySelector('#v2432-duel-decline').onclick=()=>{closeModal();b.logs.unshift(`${target.name}は${enemy.name}の一騎打ちを断った。`);continuation(false)};
 modalCard.querySelector('#v2432-duel-accept').onclick=()=>{closeModal();resolveDuel(enemy,target,'enemy');if(window.checkBattleEnd())return;continuation(true)};
}

function tacticChance(kind,actor,target){
 const ai=Number(actor.int)||50,ti=Number(target.int)||50;
 if(kind==='betray'){
  const o=officerOfUnit(target),loy=Number(o?.loy??75),ruler=o?.status==='君主'?35:0;
  return clamp(Math.round(5+ai*.58-ti*.28+(100-loy)*.45-ruler),3,72);
 }
 if(kind==='rumor')return clamp(Math.round(22+ai*.68-ti*.32),8,88);
 return clamp(Math.round(18+ai*.70-ti*.24),8,90);
}
function tacticTargets(actor,kind){
 const range=kind==='rumor'?4:3;
 return (actor.side==='player'?alive('enemy'):alive('player')).filter(t=>dist(actor,t)<=range&&(kind!=='betray'||officerOfUnit(t)?.status!=='君主'));
}
function applyBetrayal(actor,target){
 const b=state.battle,newSide=actor.side,oldSide=target.side,o=officerOfUnit(target);
 target.side=newSide;target.done=true;target.movedThisTurn=false;target.weakenTurns=0;target.skipTurns=0;
 if(o){
  const newForce=newSide==='player'?'日向軍':battleEnemyForce(b);
  o.force=newForce;o.status='一般';o.loy=clamp(55+Math.floor((Number(actor.int)||50)/8),55,70);
  o.city=newSide==='player'?(b.defense?b.target:b.src):(b.defense?b.enemySource:b.target);
 }
 b._v2420EnemyTotal=alive('enemy',b).reduce((s,u)=>s+Number(u.troops||0),0);
 if(oldSide==='player'&&Number.isFinite(Number(b._v2422PlayerStart)))b._v2422PlayerStart=Math.max(0,Number(b._v2422PlayerStart)-Number(target.troops||0));
 b.logs.unshift(`${actor.name}の説得が成功！ ${target.name}隊が${oldSide==='enemy'?'敵軍':'日向軍'}を裏切り、${newSide==='player'?'日向軍':'敵軍'}へ寝返った。`);
}
function executeTactic(actor,kind,target){
 const b=state.battle,chance=tacticChance(kind,actor,target),success=Math.random()*100<chance;
 if(actor.side==='player')b.v2432TacticUsed[actor.name]=true;
 if(kind==='betray'){
  if(success)applyBetrayal(actor,target);else b.logs.unshift(`${actor.name}が${target.name}へ裏切りを持ちかけたが、拒絶された（成功率${chance}%）。`);
 }else if(kind==='rumor'){
  if(success){target.skipTurns=Math.max(target.skipTurns||0,1);target.weakenTurns=Math.max(target.weakenTurns||0,1);b.logs.unshift(`${actor.name}の流言が成功！ ${target.name}隊は混乱し、次の行動を失う（成功率${chance}%）。`)}
  else b.logs.unshift(`${actor.name}の流言は見破られた（成功率${chance}%）。`);
 }else{
  if(success){const before=target.troops,damage=applyDamage(target,180+(Number(actor.int)||50)*2.7+(Number(target.troops)||0)*.045+rand(0,130));target.immobileTurns=Math.max(target.immobileTurns||0,1);b.logs.unshift(`${actor.name}の落とし穴が成功！ ${target.name}隊へ${damage}損害、移動を封じた（成功率${chance}%）。`);if(actor.side==='player')syncExperience(actor.name,target,before)}
  else b.logs.unshift(`${actor.name}の落とし穴は見破られた（成功率${chance}%）。`);
 }
}
function playerTactic(){
 const b=state.battle,p=currentUnit();if(!p||p.done)return;
 if(b.v2432TacticUsed[p.name])return alert(`${p.name}はこの戦闘ですでに戦場計略を使用しています。`);
 showModal(`<h2>戦場計略</h2><p>実行武将：<b>${p.name}</b>　知力${p.int}<br><small>各武将、一戦につき1回。成否は主に知力差と対象の忠誠度で決まります。</small></p><div class="stratagem-grid"><button data-v2432-kind="betray"><b>裏切りの持ちかけ</b><small>敵将にその場で寝返るよう説得。忠誠が低いほど成功しやすい。</small></button><button data-v2432-kind="rumor"><b>流言</b><small>敵部隊を混乱させ、次の行動を失わせて攻撃力も下げる。</small></button><button data-v2432-kind="pit"><b>落とし穴</b><small>敵部隊へ損害を与え、移動を封じる。</small></button></div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2432-kind]').forEach(btn=>btn.onclick=()=>{
  const kind=btn.dataset.v2432Kind,targets=tacticTargets(p,kind);if(!targets.length)return alert('射程内に対象がいません。');
  showModal(`<h2>${kind==='betray'?'裏切りの持ちかけ':kind==='rumor'?'流言':'落とし穴'}：対象</h2><div class="choice-list">${targets.map(t=>`<button data-v2432-tactic-target="${t.name}"><b>${t.name}</b>　知力${t.int}${kind==='betray'?`　忠誠${officerOfUnit(t)?.loy??'―'}`:''}<br><small>成功率 ${tacticChance(kind,p,t)}%</small></button>`).join('')}</div><button data-close>中止</button>`);
  modalCard.querySelectorAll('[data-v2432-tactic-target]').forEach(x=>x.onclick=()=>{
   const target=(p.side==='player'?alive('enemy'):alive('player')).find(t=>t.name===x.dataset.v2432TacticTarget);if(!target)return;
   closeModal();executeTactic(p,kind,target);finishPlayerAction(p);
  });
 });
}
function tryEnemyTactic(e){
 if((Number(e.int)||0)<74||Math.random()>.28)return false;
 const options=[];
 const betray=tacticTargets(e,'betray').filter(t=>{const o=officerOfUnit(t);return o&&o.status!=='君主'&&Number(o.loy??100)<=78});
 if(betray.length)options.push(['betray',betray.sort((a,b)=>(officerOfUnit(a)?.loy??100)-(officerOfUnit(b)?.loy??100))[0]]);
 const rumor=tacticTargets(e,'rumor');if(rumor.length)options.push(['rumor',rumor.sort((a,b)=>(Number(b.war)||0)-(Number(a.war)||0))[0]]);
 const pit=tacticTargets(e,'pit');if(pit.length)options.push(['pit',pit.sort((a,b)=>(Number(a.troops)||0)-(Number(b.troops)||0))[0]]);
 if(!options.length)return false;
 const [kind,target]=options[Math.floor(Math.random()*options.length)];executeTactic(e,kind,target);return true;
}

function bestPath(unit,target,range){
 const b=state.battle,start=key(unit.x,unit.y),q=[[unit.x,unit.y,0]],cost=new Map([[start,0]]),prev=new Map(),goals=[];
 while(q.length){q.sort((a,c)=>a[2]-c[2]);const [x,y,c]=q.shift();if(dist({x,y},target)<=range&&!(x===unit.x&&y===unit.y))goals.push([x,y,c]);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||nx>=W||ny<0||ny>=H)continue;
   const occ=occupiedAt(b,nx,ny);if(occ&&occ!==unit)continue;
   const step=terrainCost(unit,nx,ny),nc=c+step;if(!Number.isFinite(step)||nc>=(cost.get(k)??Infinity))continue;
   cost.set(k,nc);prev.set(k,key(x,y));q.push([nx,ny,nc]);
  }
 }
 if(!goals.length)return [];
 goals.sort((a,c)=>a[2]-c[2]);let k=key(goals[0][0],goals[0][1]),path=[];
 while(k!==start){const [x,y]=k.split(',').map(Number);path.unshift([x,y]);k=prev.get(k);if(!k)break}
 return path;
}
function moveEnemyToward(e,target){
 let budget=movePoints(e),path=bestPath(e,target,typeOf(e)==='弩兵'?3:1),moved=0;
 for(const [x,y] of path){const c=terrainCost(e,x,y);if(c>budget)break;e.x=x;e.y=y;budget-=c;moved+=c}
 e.movedDistance=moved;e.movedThisTurn=moved>0;return moved;
}
function enemyAttack(e,target){
 const before=target.troops,calc=normalDamage(e,target),damage=applyDamage(target,calc.damage),terrain=terrainAt(state.battle,target.x,target.y);
 state.battle.logs.unshift(`${e.name}隊が${target.name}隊へ${damage}損害。${terrain==='mountain'?'【山岳防御】':''}`);
 return before-target.troops;
}
function finishEnemyPhase(b){
 if(state?.battle!==b)return;
 if(b.playerGuardTurns>0)b.playerGuardTurns--;
 if(window.checkBattleEnd())return;
 alive('player',b).forEach(u=>{
  u.movedDistance=0;u.movedThisTurn=false;
  if(u.skipTurns>0){u.skipTurns--;u.done=true;b.logs.unshift(`${u.name}隊は混乱のため次の行動を失った。`)}else u.done=false;
 });
 b.phase='player';b.day++;b.v2432EnemyChallengeThisPhase=false;render();
}
window.enemyPhase=function(){
 const b=state?.battle;if(!b)return;ensureBattle(b);b.phase='enemy';b.v2432EnemyChallengeThisPhase=false;render();
 const queue=alive('enemy',b).map(u=>u.name);let pos=0;
 const next=()=>{
  if(state?.battle!==b)return;if(window.checkBattleEnd())return;
  const name=queue[pos++];if(!name)return finishEnemyPhase(b);
  const e=alive('enemy',b).find(u=>u.name===name);if(!e)return setTimeout(next,30);
  e.movedDistance=0;e.movedThisTurn=false;
  if(e.v2432SkipEnemyAction>0){e.v2432SkipEnemyAction--;b.logs.unshift(`${e.name}隊は一騎打ちの疲労で行動できない。`);return setTimeout(next,60)}
  if(e.skipTurns>0){e.skipTurns--;b.logs.unshift(`${e.name}隊は混乱し、行動できない。`);return setTimeout(next,60)}
  const players=alive('player',b);if(!players.length)return window.checkBattleEnd();
  const duelTarget=players.filter(p=>dist(e,p)<=2).sort((a,c)=>Math.abs((Number(e.war)||0)-(Number(a.war)||0))-Math.abs((Number(e.war)||0)-(Number(c.war)||0)))[0];
  const canChallenge=!b.v2432EnemyChallengeThisPhase&&!e.v2432DuelOffered&&(Number(e.war)||0)>=76&&duelTarget&&Math.random()<.20;
  const act=()=>{
   if(tryEnemyTactic(e)){if(e.weakenTurns>0)e.weakenTurns--;if(window.checkBattleEnd())return;return setTimeout(next,90)}
   let targets=alive('player',b),target=targets.sort((a,c)=>dist(e,a)-dist(e,c)||a.troops-c.troops)[0],range=typeOf(e)==='弩兵'?3:1;
   if(dist(e,target)<=range)enemyAttack(e,target);
   else if(e.immobileTurns>0){e.immobileTurns--;b.logs.unshift(`${e.name}隊は落とし穴に阻まれ、移動できない。`)}
   else{
    moveEnemyToward(e,target);targets=alive('player',b);if(typeOf(e)==='騎兵'&&targets.length){target=targets.sort((a,c)=>dist(e,a)-dist(e,c))[0];if(dist(e,target)<=1)enemyAttack(e,target)}
   }
   if(e.weakenTurns>0)e.weakenTurns--;if(window.checkBattleEnd())return;setTimeout(next,90);
  };
  if(canChallenge)return enemyDuelOffer(e,duelTarget,accepted=>accepted?setTimeout(next,80):act());
  act();
 };
 setTimeout(next,350);
};

Object.assign(V,{playerDuel,playerTactic});
})();
