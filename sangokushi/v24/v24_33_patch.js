// v24.33 — the loser of a duel is immediately captured
(()=>{
const V=window.V2432;if(!V)return;
const {clamp,rand,dist,alive,officerOfUnit,currentUnit,battleEnemyForce,syncExperience}=V;
const previousBattleAction=window.battleAction;
const previousEndBattle=window.endBattle;
let patchTimer=null;

function duelAcceptance(challenger,target){
 const targetOfficer=officerOfUnit(target),ruler=targetOfficer?.status==='君主'?5:0;
 return clamp(Math.round(44+(Number(target.war)-Number(challenger.war))*1.15+ruler),8,88);
}
function duelScore(unit){
 return (Number(unit.war)||50)*1.15+(Number(unit.lead)||50)*.10+rand(0,34);
}
function recordPlayerCapture(b,loser,winner){
 b.v2433PlayerDuelCaptures=Array.isArray(b.v2433PlayerDuelCaptures)?b.v2433PlayerDuelCaptures:[];
 if(b.v2433PlayerDuelCaptures.some(x=>x.name===loser.name))return;
 const officer=officerOfUnit(loser,b);
 b.v2433PlayerDuelCaptures.push({
  name:loser.name,
  originalStatus:officer?.status||'一般',
  originalCity:officer?.city||b.src,
  captor:battleEnemyForce(b),
  capturedBy:winner.name
 });
}
function markEnemyCapture(b,loser){
 b._v2427Captured=Array.isArray(b._v2427Captured)?b._v2427Captured:[];
 if(!b._v2427Captured.includes(loser.name))b._v2427Captured.push(loser.name);
 loser._v2427Recorded=true;
}
function removeOldDuelLog(b,winner,loser){
 const index=(b.logs||[]).findIndex(line=>String(line).startsWith('一騎打ち！')&&String(line).includes(winner.name)&&String(line).includes(loser.name));
 if(index>=0)b.logs.splice(index,1);
}
function captureDuelLoser(winner,loser,b=state?.battle){
 if(!b||!winner||!loser)return false;
 const before=Math.max(0,Number(loser.troops)||0);
 loser.troops=0;loser.captured=true;loser.v2433DuelCaptured=true;loser.v2433CapturedBy=winner.name;
 removeOldDuelLog(b,winner,loser);
 if(loser.side==='enemy'){
  markEnemyCapture(b,loser);
  if(winner.side==='player'&&before>0)syncExperience(winner.name,loser,before);
 }else recordPlayerCapture(b,loser,winner);
 b.logs.unshift(`一騎打ち決着！ ${winner.name}が${loser.name}を破り、${loser.name}隊は壊滅。${loser.name}は捕縛された。`);
 const ended=window.checkBattleEnd();
 if(state?.battle!==b&&loser.side==='player')resolvePlayerCaptures(b,false);
 return !!ended;
}
function resolveCaptureDuel(a,b){
 const scoreA=duelScore(a),scoreB=duelScore(b),winner=scoreA>=scoreB?a:b,loser=winner===a?b:a;
 const ended=captureDuelLoser(winner,loser,state?.battle);
 return {winner,loser,ended};
}
function playerDuel(){
 const b=state?.battle,p=currentUnit();if(!b||!p||p.done)return;
 if(b.v2432DuelUsed?.[p.name])return alert(`${p.name}はこの戦闘ですでに一騎打ちを申し込んでいます。`);
 const targets=alive('enemy',b).filter(e=>dist(p,e)<=2);
 if(!targets.length)return alert('2マス以内に一騎打ちを申し込める敵将がいません。');
 showModal(`<h2>一騎打ちを申し込む</h2><p>敵将が応じるかは双方の武力差などで決まります。<b>敗者はその場で捕縛されます。</b></p><div class="choice-list">${targets.map(t=>`<button data-v2433-duel="${t.name}"><b>${t.name}</b>　武力${t.war}<br><small>応諾見込 ${duelAcceptance(p,t)}%</small></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2433-duel]').forEach(btn=>btn.onclick=()=>{
  const target=alive('enemy',b).find(e=>e.name===btn.dataset.v2433Duel);if(!target)return;
  b.v2432DuelUsed=b.v2432DuelUsed||{};b.v2432DuelUsed[p.name]=true;
  const chance=duelAcceptance(p,target);closeModal();
  if(Math.random()*100>=chance){b.logs.unshift(`${p.name}が${target.name}へ一騎打ちを申し込んだが、${target.name}は応じなかった。`);return render()}
  const result=resolveCaptureDuel(p,target);p.done=true;
  if(result.ended||state?.battle!==b)return;
  window.afterPlayerAction();
 });
}
function nearestCaptorCity(b,force){
 const preferred=b.defense?b.enemySource:b.target;
 if(state?.cities?.[preferred]?.force===force)return preferred;
 return Object.values(state?.cities||{}).find(c=>c.force===force)?.name||preferred;
}
function resolvePlayerCaptures(b,playerWon){
 if(!b||b.v2433PlayerCapturesResolved)return;
 const captures=Array.isArray(b.v2433PlayerDuelCaptures)?b.v2433PlayerDuelCaptures:[];
 if(!captures.length){b.v2433PlayerCapturesResolved=true;return}
 b.v2433PlayerCapturesResolved=true;
 for(const rec of captures){
  const officer=(state.officers||[]).find(o=>o.name===rec.name&&o.force==='日向軍');if(!officer)continue;
  if(playerWon){
   officer.status=rec.originalStatus||'一般';officer.captured=false;delete officer.captor;
   officer.city=b.target;
   if(typeof log==='function')log(`${officer.name}は味方の勝利により救出された。`);
  }else{
   officer.status='捕虜';officer.captured=true;officer.captor=rec.captor||battleEnemyForce(b);
   officer.city=nearestCaptorCity(b,officer.captor);
   if(typeof log==='function')log(`${officer.name}は一騎打ちに敗れ、${officer.captor}軍の捕虜となった。`);
  }
 }
}
window.endBattle=function(win,retreat){
 const b=state?.battle;if(b)resolvePlayerCaptures(b,!!win);
 return previousEndBattle.apply(this,arguments);
};
window.battleAction=function(action){
 if(action==='duel'&&state?.battle)return playerDuel();
 return previousBattleAction.apply(this,arguments);
};
V.playerDuel=playerDuel;

function patchEnemyDuelModal(){
 const title=modalCard?.querySelector('h2');
 if(!title||title.textContent.trim()!=='敵将から一騎打ち')return;
 const accept=modalCard.querySelector('#v2432-duel-accept');
 if(!accept||accept.dataset.v2433Patched==='1'||typeof accept.onclick!=='function')return;
 const bold=[...modalCard.querySelectorAll('p b')].map(x=>x.textContent.trim());
 const enemyName=bold[0],targetName=bold[1],b=state?.battle;
 if(!b||!enemyName||!targetName)return;
 const original=accept.onclick;accept.dataset.v2433Patched='1';
 const note=document.createElement('p');note.className='v2433-duel-warning';note.innerHTML='<b>敗者はその場で捕縛されます。</b>';
 modalCard.querySelector('.v2432-duel-actions')?.before(note);
 accept.onclick=function(event){
  const enemy=b.units.find(u=>u.side==='enemy'&&u.name===enemyName&&u.troops>0);
  const target=b.units.find(u=>u.side==='player'&&u.name===targetName&&u.troops>0);
  const logCount=b.logs?.length||0;
  original.call(this,event);
  if(!enemy||!target)return;
  const duelLine=(b.logs||[]).slice(0,Math.max(1,(b.logs.length||0)-logCount+1)).find(line=>String(line).startsWith('一騎打ち！'))||
   (b.logs||[]).find(line=>String(line).startsWith('一騎打ち！')&&String(line).includes(enemyName)&&String(line).includes(targetName));
  const match=String(duelLine||'').match(/^一騎打ち！ (.+?)が(.+?)を破り/);
  if(!match)return;
  const winner=match[1]===enemyName?enemy:target;
  const loser=winner===enemy?target:enemy;
  captureDuelLoser(winner,loser,b);
 };
}
const observer=new MutationObserver(()=>{
 clearTimeout(patchTimer);patchTimer=setTimeout(patchEnemyDuelModal,0);
});
if(modalCard)observer.observe(modalCard,{childList:true,subtree:true});
setTimeout(patchEnemyDuelModal,0);

const style=document.createElement('style');
style.textContent='.v2433-duel-warning{padding:9px 10px;border:1px solid #9c4f46;background:#2a1210;color:#ffd1ca;text-align:center}';
document.head.appendChild(style);
})();
