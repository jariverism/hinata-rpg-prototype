// v24.35 — cinematic multi-round duels with forecasts and visible spirit gauges
(()=>{
const V=window.V2432;if(!V)return;
const {
 clamp,rand,typeOf,dist,key,alive,occupiedAt,officerOfUnit,currentUnit,battleEnemyForce,
 ensureBattle,terrainAt,movePoints,terrainCost,applyDamage,normalDamage,syncExperience
}=V;
const previousBattleAction=window.battleAction;
let duelSpeed=620;

function faceHtml(name){
 return typeof v241FaceHtml==='function'?v241FaceHtml(name):`<span class="face">${(name||'?')[0]}</span>`;
}
function applyFaces(){
 if(typeof v241ApplyFace!=='function')return;
 modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
}
function lockGlobalButtons(locked){
 ['saveBtn','loadBtn','newBtn'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!!locked});
}
function duelBase(u){return (Number(u?.war)||50)*1.18+(Number(u?.lead)||50)*.08}
function duelScore(u){return duelBase(u)+rand(0,34)}
function duelWinChance(a,b){return clamp(Math.round(50+(duelBase(a)-duelBase(b))*2.15),8,92)}
function duelAcceptance(challenger,target){
 const targetOfficer=officerOfUnit(target),ruler=targetOfficer?.status==='君主'?5:0;
 return clamp(Math.round(44+(Number(target.war)-Number(challenger.war))*1.15+ruler),8,88);
}
function forecastLabel(a,b){
 const p=duelWinChance(a,b);
 if(p>=82)return {p,label:`${a.name}が圧倒的に優勢`,tone:'dominant'};
 if(p>=66)return {p,label:`${a.name}が優勢`,tone:'favored'};
 if(p>=56)return {p,label:`${a.name}がやや優勢`,tone:'slight'};
 if(p>=45)return {p,label:'ほぼ互角',tone:'even'};
 if(p>=30)return {p,label:`${a.name}にはやや分が悪い`,tone:'danger'};
 return {p,label:`${a.name}にはかなり厳しい相手`,tone:'severe'};
}
function duelQuote(unit,opponent,p){
 if(p>=78)return `「${opponent.name}、我が武の前にひれ伏せ！」`;
 if(p>=60)return `「勝機はこちらにある。正面から参れ！」`;
 if(p>=45)return `「互角か……ならば最後は気迫の勝負だ！」`;
 if(p>=28)return `「難敵だ。だが、一瞬の隙があれば十分！」`;
 return `「分が悪いことは承知の上。ここで退くわけにはいかぬ！」`;
}
function splitDamage(total,count,min=6){
 if(count<=0)return [];
 total=Math.max(count*min,total);
 const out=Array(count).fill(min);let left=total-count*min;
 while(left>0){const i=rand(0,count-1),add=Math.min(left,rand(1,Math.max(2,Math.ceil(left/2))));out[i]+=add;left-=add}
 return out;
}
function shuffle(list){
 for(let i=list.length-1;i>0;i--){const j=rand(0,i);[list[i],list[j]]=[list[j],list[i]]}
 return list;
}
function actionText(attacker,target,damage,index,final=false){
 if(final)return `${attacker.name}が渾身の一撃！ ${target.name}の武器を弾き飛ばした！`;
 const open=[
  `${attacker.name}が馬を躍らせ、${target.name}へ斬り込む！`,
  `${attacker.name}の鋭い突きが${target.name}を襲う！`,
  `${attacker.name}が気迫とともに踏み込み、一閃！`,
  `${attacker.name}が間合いを詰め、連撃を放つ！`
 ][index%4];
 if(damage>=20)return `${open} 会心の一撃！`;
 if(damage<=9)return `${open} だが浅い！`;
 return open;
}
function buildDuelCourse(a,b,winner,loser,gap){
 const finalWinnerHp=clamp(Math.round(24+gap*.9+rand(-8,10)),14,72);
 const winnerHits=rand(4,5),loserHits=rand(2,4),clashes=rand(1,2);
 const loserPreDamage=rand(58,82),winnerDamage=100-finalWinnerHp;
 const winnerDamages=splitDamage(loserPreDamage,winnerHits-1,9);
 const loserDamages=splitDamage(winnerDamage,loserHits,7);
 const tokens=[...winnerDamages.map(d=>({kind:'winner',d})),...loserDamages.map(d=>({kind:'loser',d})),...Array(clashes).fill(0).map(()=>({kind:'clash'}))];
 shuffle(tokens);tokens.push({kind:'final',d:100-loserPreDamage});
 let hpA=100,hpB=100;
 return tokens.map((token,i)=>{
  if(token.kind==='clash')return {hpA,hpB,hit:null,text:`第${i+1}合――両者の刃が激突し、火花が散る！`};
  const attacker=token.kind==='loser'?loser:winner,target=attacker===a?b:a;
  let damage=token.d;
  if(token.kind==='final')damage=target===a?hpA:hpB;
  if(target===a)hpA=Math.max(0,hpA-damage);else hpB=Math.max(0,hpB-damage);
  return {hpA,hpB,hit:target===a?'a':'b',text:`第${i+1}合――${actionText(attacker,target,damage,i,token.kind==='final')}`};
 });
}
function markEnemyCapture(b,loser){
 b._v2427Captured=Array.isArray(b._v2427Captured)?b._v2427Captured:[];
 if(!b._v2427Captured.includes(loser.name))b._v2427Captured.push(loser.name);
 loser._v2427Recorded=true;
}
function recordPlayerCapture(b,loser,winner){
 b.v2433PlayerDuelCaptures=Array.isArray(b.v2433PlayerDuelCaptures)?b.v2433PlayerDuelCaptures:[];
 if(b.v2433PlayerDuelCaptures.some(x=>x.name===loser.name))return;
 const officer=officerOfUnit(loser);
 b.v2433PlayerDuelCaptures.push({
  name:loser.name,originalStatus:officer?.status||'一般',originalCity:officer?.city||b.src,
  captor:battleEnemyForce(b),capturedBy:winner.name
 });
}
function captureDuelLoser(winner,loser,b=state?.battle){
 if(!b||!winner||!loser)return true;
 const before=Math.max(0,Number(loser.troops)||0);
 loser.troops=0;loser.captured=true;loser.v2433DuelCaptured=true;loser.v2433CapturedBy=winner.name;
 if(loser.side==='enemy'){
  markEnemyCapture(b,loser);
  if(winner.side==='player'&&before>0)syncExperience(winner.name,loser,before);
 }else recordPlayerCapture(b,loser,winner);
 b.logs=Array.isArray(b.logs)?b.logs:[];
 b.logs.unshift(`一騎打ち決着！ ${winner.name}が${loser.name}を破り、${loser.name}は捕縛された。`);
 window.checkBattleEnd();
 return state?.battle!==b;
}
function setGauge(side,value){
 const bar=modalCard.querySelector(`[data-v2435-bar="${side}"]`),num=modalCard.querySelector(`[data-v2435-hp="${side}"]`);
 if(bar)bar.style.width=`${clamp(value,0,100)}%`;
 if(num)num.textContent=String(clamp(value,0,100));
}
function flashHit(side){
 const card=modalCard.querySelector(`[data-v2435-fighter="${side}"]`);if(!card)return;
 card.classList.remove('hit');void card.offsetWidth;card.classList.add('hit');setTimeout(()=>card.classList.remove('hit'),300);
}
function runDuelCinematic(a,b,done){
 const battle=state?.battle;if(!battle)return;
 const scoreA=duelScore(a),scoreB=duelScore(b),winner=scoreA>=scoreB?a:b,loser=winner===a?b:a,gap=Math.abs(scoreA-scoreB);
 const forecast=forecastLabel(a,b),reverse=forecastLabel(b,a),course=buildDuelCourse(a,b,winner,loser,gap);
 lockGlobalButtons(true);duelSpeed=620;
 showModal(`<h2 class="v2435-title">一騎打ち</h2><div class="v2435-stage">
  <div class="v2435-fighter player" data-v2435-fighter="a">${faceHtml(a.name)}<div><b>${a.name}</b><small>武力${a.war}　統率${a.lead}</small><div class="v2435-gauge"><span data-v2435-bar="a"></span></div><em>闘気 <span data-v2435-hp="a">100</span></em></div></div>
  <div class="v2435-versus">VS</div>
  <div class="v2435-fighter enemy" data-v2435-fighter="b">${faceHtml(b.name)}<div><b>${b.name}</b><small>武力${b.war}　統率${b.lead}</small><div class="v2435-gauge"><span data-v2435-bar="b"></span></div><em>闘気 <span data-v2435-hp="b">100</span></em></div></div>
 </div><div class="v2435-intro"><p><b>${a.name}</b> ${duelQuote(a,b,forecast.p)}</p><p><b>${b.name}</b> ${duelQuote(b,a,reverse.p)}</p></div>
 <div class="v2435-forecast ${forecast.tone}"><small>武力・統率から見た勝機</small><b>${forecast.label}</b><span>${a.name}の勝機 約${forecast.p}%</span></div>
 <div id="v2435-duel-line" class="v2435-duel-line">両将、静かに間合いを測っている……</div>
 <div class="v2435-controls"><button id="v2435-start" class="danger">勝負を見届ける</button><button id="v2435-fast" disabled>早送り</button></div>`);
 applyFaces();
 const start=modalCard.querySelector('#v2435-start'),fast=modalCard.querySelector('#v2435-fast'),line=modalCard.querySelector('#v2435-duel-line');
 start.onclick=()=>{
  start.disabled=true;start.textContent='勝負中…';fast.disabled=false;
  let i=0;
  const next=()=>{
   if(!modalCard.querySelector('#v2435-duel-line')){lockGlobalButtons(false);return}
   const ev=course[i++];
   if(!ev)return finish();
   setGauge('a',ev.hpA);setGauge('b',ev.hpB);line.textContent=ev.text;if(ev.hit)flashHit(ev.hit);
   setTimeout(next,duelSpeed);
  };
  const finish=()=>{
   setGauge(winner===a?'a':'b',winner===a?course.at(-1).hpA:course.at(-1).hpB);
   setGauge(loser===a?'a':'b',0);
   line.innerHTML=`<b>${winner.name}、勝利！</b><br>${loser.name}は馬上から引きずり下ろされ、捕縛された。`;
   start.disabled=false;start.textContent='決着を確認';start.classList.remove('danger');start.classList.add('primary');fast.remove();
   start.onclick=()=>{
    lockGlobalButtons(false);closeModal();
    const ended=captureDuelLoser(winner,loser,battle);
    done({winner,loser,ended});
   };
  };
  next();
 };
 fast.onclick=()=>{duelSpeed=120;fast.disabled=true;fast.textContent='早送り中'};
}
function playerDuel(){
 const b=state?.battle,p=currentUnit();if(!b||!p||p.done)return;
 if(b.v2432DuelUsed?.[p.name])return alert(`${p.name}はこの戦闘ですでに一騎打ちを申し込んでいます。`);
 const targets=alive('enemy',b).filter(e=>dist(p,e)<=2);
 if(!targets.length)return alert('2マス以内に一騎打ちを申し込める敵将がいません。');
 showModal(`<h2>一騎打ちを申し込む</h2><p>敵将が応じれば、名乗り・勝機予測・闘気ゲージを伴う一騎打ちが始まります。敗者は捕縛されます。</p><div class="choice-list">${targets.map(t=>{
  const f=forecastLabel(p,t);return `<button data-v2435-duel="${t.name}"><b>${t.name}</b>　武力${t.war}<br><small>応諾見込 ${duelAcceptance(p,t)}%／${f.label}</small></button>`
 }).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2435-duel]').forEach(btn=>btn.onclick=()=>{
  const target=alive('enemy',b).find(e=>e.name===btn.dataset.v2435Duel);if(!target)return;
  b.v2432DuelUsed=b.v2432DuelUsed||{};b.v2432DuelUsed[p.name]=true;
  const chance=duelAcceptance(p,target);closeModal();
  if(Math.random()*100>=chance){b.logs.unshift(`${p.name}が${target.name}へ一騎打ちを申し込んだが、${target.name}は応じなかった。`);return render()}
  runDuelCinematic(p,target,result=>{
   p.done=true;
   if(result.ended||state?.battle!==b)return;
   window.afterPlayerAction();
  });
 });
}
window.battleAction=function(action){
 if(action==='duel'&&state?.battle)return playerDuel();
 return previousBattleAction.apply(this,arguments);
};
V.playerDuel=playerDuel;

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
 if(kind==='betray'){
  if(success)applyBetrayal(actor,target);else b.logs.unshift(`${actor.name}が${target.name}へ裏切りを持ちかけたが、拒絶された（成功率${chance}%）。`);
 }else if(kind==='rumor'){
  if(success){target.skipTurns=Math.max(target.skipTurns||0,1);target.weakenTurns=Math.max(target.weakenTurns||0,1);b.logs.unshift(`${actor.name}の流言が成功！ ${target.name}隊は混乱し、次の行動を失う（成功率${chance}%）。`)}
  else b.logs.unshift(`${actor.name}の流言は見破られた（成功率${chance}%）。`);
 }else{
  if(success){const damage=applyDamage(target,180+(Number(actor.int)||50)*2.7+(Number(target.troops)||0)*.045+rand(0,130));target.immobileTurns=Math.max(target.immobileTurns||0,1);b.logs.unshift(`${actor.name}の落とし穴が成功！ ${target.name}隊へ${damage}損害、移動を封じた（成功率${chance}%）。`)}
  else b.logs.unshift(`${actor.name}の落とし穴は見破られた（成功率${chance}%）。`);
 }
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
   const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||nx>=9||ny<0||ny>=7)continue;
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
 const calc=normalDamage(e,target),damage=applyDamage(target,calc.damage),terrain=terrainAt(state.battle,target.x,target.y);
 state.battle.logs.unshift(`${e.name}隊が${target.name}隊へ${damage}損害。${terrain==='mountain'?'【山岳防御】':''}`);
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
function enemyDuelOffer(enemy,target,continuation){
 const b=state.battle;b.v2432EnemyChallengeThisPhase=true;enemy.v2432DuelOffered=true;
 const f=forecastLabel(target,enemy);
 showModal(`<h2>一騎打ちの申し出</h2><p><b>${enemy.name}</b>（武力${enemy.war}）が、<b>${target.name}</b>（武力${target.war}）へ勝負を挑んできました。</p><div class="v2435-challenge-forecast"><small>${target.name}から見た勝機</small><b>${f.label}</b><span>約${f.p}%</span></div><p>受けた場合、敗者はその場で捕縛されます。</p><div class="v2432-duel-actions"><button id="v2435-enemy-accept" class="danger">受ける</button><button id="v2435-enemy-decline">断る</button></div>`);
 modalCard.querySelector('#v2435-enemy-decline').onclick=()=>{closeModal();b.logs.unshift(`${target.name}は${enemy.name}の一騎打ちを断った。`);continuation(false)};
 modalCard.querySelector('#v2435-enemy-accept').onclick=()=>{
  closeModal();runDuelCinematic(enemy,target,result=>{
   if(result.ended||state?.battle!==b)return;
   continuation(true);
  });
 };
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

const style=document.createElement('style');
style.textContent=`
.v2435-title{text-align:center;letter-spacing:.18em}.v2435-stage{display:grid;grid-template-columns:1fr auto 1fr;gap:9px;align-items:center;margin:10px 0}.v2435-versus{font-size:20px;font-weight:900;color:#e8c36a;text-shadow:0 0 12px #a63}.v2435-fighter{display:grid;grid-template-columns:54px 1fr;gap:8px;align-items:center;padding:9px;border:1px solid #746044;background:#17130e;transition:transform .15s,filter .15s}.v2435-fighter.enemy{direction:rtl}.v2435-fighter.enemy>div{direction:ltr}.v2435-fighter .face{width:50px;height:60px}.v2435-fighter b,.v2435-fighter small,.v2435-fighter em{display:block}.v2435-fighter small{color:#cbb995}.v2435-fighter em{font-size:10px;color:#e3d4b5;font-style:normal}.v2435-fighter.hit{transform:translateX(-7px);filter:brightness(1.55)}.v2435-fighter.enemy.hit{transform:translateX(7px)}
.v2435-gauge{height:13px;margin:5px 0 3px;border:1px solid #4f3b31;background:#190b09;overflow:hidden}.v2435-gauge span{display:block;width:100%;height:100%;background:linear-gradient(90deg,#8d2525,#e6b146);transition:width .48s ease}.v2435-intro{padding:9px 11px;border:1px solid #5f4c37;background:#14110d;line-height:1.55}.v2435-intro p{margin:4px 0}.v2435-forecast,.v2435-challenge-forecast{display:grid;grid-template-columns:1fr auto;gap:3px 10px;margin:10px 0;padding:10px;border:1px solid #7c6435;background:#211a0e}.v2435-forecast small,.v2435-challenge-forecast small{grid-column:1/-1;color:#bfae8c}.v2435-forecast b,.v2435-challenge-forecast b{color:#ffe09a}.v2435-forecast span,.v2435-challenge-forecast span{font-weight:800}.v2435-duel-line{min-height:74px;display:flex;align-items:center;justify-content:center;padding:13px;border:1px solid #8d4b3e;background:radial-gradient(circle at center,#351713,#160d0b);color:#ffd8be;text-align:center;font-size:14px;line-height:1.6}.v2435-controls{display:grid;grid-template-columns:2fr 1fr;gap:9px;margin-top:11px}.v2435-controls button{min-height:48px}.v2435-challenge-forecast{grid-template-columns:1fr auto}.v2435-forecast.dominant,.v2435-forecast.favored{border-color:#9c7839}.v2435-forecast.danger,.v2435-forecast.severe{border-color:#93483f;background:#281210}@media(max-width:600px){.v2435-stage{grid-template-columns:1fr}.v2435-versus{text-align:center}.v2435-fighter.enemy{direction:ltr}.v2435-controls{grid-template-columns:1fr}.v2435-fighter.hit,.v2435-fighter.enemy.hit{transform:translateX(-4px)}}
`;
document.head.appendChild(style);
})();
