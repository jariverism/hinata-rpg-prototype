// v24.27 — battlefield capture, defensive dispositions, retreat, 30-round limit and ruler defeat
(()=>{
const previousRender=window.render;
const previousBattleAction=window.battleAction;
const previousEndBattle=window.endBattle;
const previousCheckBattleEnd=window.checkBattleEnd;
let dispositionOpen=false;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function battleEnemyForce(b){
 if(!b)return null;
 if(b.defense)return b.invadingForce||state.cities?.[b.enemySource]?.force||null;
 return state.cities?.[b.target]?.force||null;
}
function officerForUnit(unit,b){
 if(!unit)return null;
 const force=unit.side==='enemy'?battleEnemyForce(b):'日向軍';
 return (state.officers||[]).find(o=>o.name===unit.name&&(!force||o.force===force))||
  (state.officers||[]).find(o=>o.name===unit.name)||null;
}
function face(name){return typeof v241FaceHtml==='function'?v241FaceHtml(name):`<span class="face">${(name||'?')[0]}</span>`}
function applyFaces(){if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face))}

function markDefeatedUnits(b){
 if(!b?.units)return;
 b._v2427Captured=Array.isArray(b._v2427Captured)?b._v2427Captured:[];
 for(const u of b.units){
  if(u.side!=='enemy'||Number(u.troops)>0||u._v2427Recorded)continue;
  u._v2427Recorded=true;
  const o=officerForUnit(u,b);
  if(!o||!activeOfficer(o))continue;
  u.captured=true;
  if(!b._v2427Captured.includes(o.name))b._v2427Captured.push(o.name);
  b.logs=b.logs||[];
  b.logs.unshift(`${o.name}隊は兵力0となり、日向軍に捕縛された。`);
 }
}
function rulerOutcome(b){
 if(!b?.units)return null;
 const enemyRuler=b.units.find(u=>u.side==='enemy'&&Number(u.troops)<=0&&officerForUnit(u,b)?.status==='君主');
 if(enemyRuler)return {win:true,name:enemyRuler.name,side:'enemy'};
 const playerRuler=b.units.find(u=>u.side==='player'&&Number(u.troops)<=0&&officerForUnit(u,b)?.status==='君主');
 if(playerRuler)return {win:false,name:playerRuler.name,side:'player'};
 return null;
}
function resolveSpecialBattleEnd(){
 const b=state?.battle;if(!b||b._v2427Resolving)return false;
 markDefeatedUnits(b);
 const ruler=rulerOutcome(b);
 if(ruler){
  b._v2427Resolving=true;b._v2427EndReason='ruler';
  const msg=ruler.side==='enemy'?`${ruler.name}隊を撃破！ 敵君主を捕縛したため戦闘は終結した。`:`${ruler.name}隊が壊滅。日向軍君主が倒れたため戦闘は終結した。`;
  b.logs.unshift(msg);if(typeof log==='function')log(msg);
  window.endBattle(ruler.win,false);return true;
 }
 if(Number(b.day)>30){
  b._v2427Resolving=true;b._v2427EndReason='time';
  const defender=b.defense?'日向軍':'敵軍';
  const msg=`攻防が30往復を超えた。${defender}が城を守り切り、守備側の勝利となった。`;
  b.logs.unshift(msg);if(typeof log==='function')log(msg);
  window.endBattle(!!b.defense,false);return true;
 }
 return false;
}

function nearestForceCity(from,force,exclude){
 const q=[from],seen=new Set([from]);
 while(q.length){
  const name=q.shift();
  if(name!==exclude&&state.cities?.[name]?.force===force)return state.cities[name];
  for(const nx of state.cities?.[name]?.n||[])if(!seen.has(nx)){seen.add(nx);q.push(nx)}
 }
 return null;
}
function prepareAttackVictory(b){
 if(!b||b.defense)return;
 const enemyForce=state.cities?.[b.target]?.force;if(!enemyForce)return;
 const captured=new Set(b._v2427Captured||[]),retreat=nearestForceCity(b.target,enemyForce,b.target);
 const fleeing=(state.officers||[]).filter(o=>o.force===enemyForce&&o.city===b.target&&activeOfficer(o)&&!captured.has(o.name));
 for(const o of fleeing){
  if(retreat)o.city=retreat.name;
  else{o.force='在野';o.status='在野';o.city=b.target;o.discovered=true;o.loy=Math.max(30,Math.min(65,Number(o.loy)||50))}
 }
 if(fleeing.length&&typeof log==='function'){
  log(retreat?`${fleeing.map(o=>o.name).join('、')}は${retreat.name}へ敗走した。`:`${fleeing.map(o=>o.name).join('、')}は勢力を失い、在野となった。`);
 }
}
function prepareDefenseCaptures(b){
 if(!b?.defense)return null;
 const force=battleEnemyForce(b),names=[...new Set(b._v2427Captured||[])];
 const captured=(state.officers||[]).filter(o=>names.includes(o.name)&&o.force===force&&activeOfficer(o));
 for(const o of captured){o.wasRuler=o.status==='君主';o.defeatedForce=force;o.status='敗将'}
 if(!captured.length)return null;
 const playerNames=b.units.filter(u=>u.side==='player').map(u=>u.name);
 const captor=(state.officers||[]).filter(o=>playerNames.includes(o.name)&&o.force==='日向軍').sort((a,z)=>(z.cha||0)-(a.cha||0))[0]||
  (state.officers||[]).find(o=>o.name==='佐々木久美')||{name:'日向軍',cha:80};
 return {city:b.target,enemyForce:force,capturedNames:captured.map(o=>o.name),captorName:captor.name,index:0};
}

function clearOfficerlessEnemyCities(){
 for(const c of Object.values(state?.cities||{})){
  if(!c.force||c.force==='日向軍')continue;
  const has=(state.officers||[]).some(o=>o.force===c.force&&o.city===c.name&&activeOfficer(o));
  if(!has){const old=c.force;c.force=null;c.troops=0;c.morale=Math.max(35,Math.min(Number(c.morale)||50,55));if(typeof log==='function')log(`${c.name}は${old}軍の武将が不在となり、空白都市になった。`)}
 }
}
function recruitChance(o,captor){
 const loyalty=Number(o?.loy)||70,rulerPenalty=o?.wasRuler?25:0;
 return clamp(Math.round(42+(Number(captor?.cha)||80)*.35-loyalty*.38-rulerPenalty),8,82);
}
function finishDispositionQueue(){
 closeModal();dispositionOpen=false;delete state.v2427PendingDisposition;clearOfficerlessEnemyCities();render();
}
function setPrisoner(o,ctx){
 o.force='在野';o.city=ctx.city;o.status='捕虜';o.captured=true;o.loy=clamp(Number(o.loy)||50,20,70);
 if(typeof log==='function')log(`${o.name}を捕虜とした。`);
}
function executeCaptured(o){
 o.status='死亡';o.force='死亡';o.city=null;o.troops=0;
 if(typeof log==='function')log(`${o.name}を斬首した。`);
}
function resumeDispositionQueue(){
 const ctx=state?.v2427PendingDisposition;if(!ctx||state.battle)return;
 if(ctx.index>=ctx.capturedNames.length)return finishDispositionQueue();
 const name=ctx.capturedNames[ctx.index],o=(state.officers||[]).find(x=>x.name===name);
 if(!o||o.status==='死亡'||o.force==='日向軍'||o.status==='捕虜'){ctx.index++;return resumeDispositionQueue()}
 dispositionOpen=true;
 const captor=(state.officers||[]).find(x=>x.name===ctx.captorName&&x.force==='日向軍')||{name:ctx.captorName||'日向軍',cha:80};
 showModal(`<h2>防衛戦後の処理 ${ctx.index+1}/${ctx.capturedNames.length}</h2><div class="officer disposition-card">${face(o.name)}<div><b>${o.name}</b><br><small>${ctx.enemyForce}軍　${o.wasRuler?'君主':'一般'}　忠誠${o.loy??'―'}<br>統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}</small></div></div><p>${o.name}隊は兵力0となり捕縛されています。処遇を決めてください。</p><div class="disposition-actions"><button id="v2427-recruit" class="primary">登用を試みる</button><button id="v2427-prisoner">捕虜にする</button><button id="v2427-execute" class="danger">斬首する</button></div>`);
 applyFaces();
 modalCard.querySelector('#v2427-prisoner').onclick=()=>{setPrisoner(o,ctx);ctx.index++;resumeDispositionQueue()};
 modalCard.querySelector('#v2427-execute').onclick=()=>{showModal(`<h2>斬首の確認</h2><p><b>${o.name}</b>を斬首します。</p><button id="v2427-execute-go" class="danger">斬首を確定</button><button id="v2427-execute-back">戻る</button>`);modalCard.querySelector('#v2427-execute-go').onclick=()=>{executeCaptured(o);ctx.index++;resumeDispositionQueue()};modalCard.querySelector('#v2427-execute-back').onclick=resumeDispositionQueue};
 modalCard.querySelector('#v2427-recruit').onclick=()=>{
  const chance=recruitChance(o,captor),success=Math.random()*100<chance;
  showModal(`<h2>${o.name}を登用</h2><p>説得役：<b>${captor.name}</b>　魅力${captor.cha}</p><p>登用成功率：<b>${chance}%</b></p><button id="v2427-recruit-go" class="primary">登用を実行</button><button id="v2427-recruit-back">戻る</button>`);
  modalCard.querySelector('#v2427-recruit-back').onclick=resumeDispositionQueue;
  modalCard.querySelector('#v2427-recruit-go').onclick=()=>{
   if(success){const old=o.defeatedForce||ctx.enemyForce;o.force='日向軍';o.city=ctx.city;o.status='一般';o.loy=clamp(52+Math.floor((Number(captor.cha)||80)/7),48,72);o.discovered=true;if(typeof log==='function')log(`${old}軍の${o.name}が登用に応じ、日向軍へ加入した。`);ctx.index++;resumeDispositionQueue()}
   else{showModal(`<h2>登用拒否</h2><p><b>${o.name}</b>は登用を拒みました。</p><div class="disposition-actions"><button id="v2427-refuse-prisoner">捕虜にする</button><button id="v2427-refuse-execute" class="danger">斬首する</button></div>`);modalCard.querySelector('#v2427-refuse-prisoner').onclick=()=>{setPrisoner(o,ctx);ctx.index++;resumeDispositionQueue()};modalCard.querySelector('#v2427-refuse-execute').onclick=()=>{executeCaptured(o);ctx.index++;resumeDispositionQueue()}}
  };
 };
}

window.endBattle=function(win,retreat){
 const b=state?.battle;if(!b)return previousEndBattle.apply(this,arguments);
 markDefeatedUnits(b);
 if(win&&!b.defense)prepareAttackVictory(b);
 const defenseCtx=win&&b.defense&&!retreat?prepareDefenseCaptures(b):null;
 if(defenseCtx)state.v2427PendingDisposition=defenseCtx;
 const result=previousEndBattle.apply(this,arguments);
 if(defenseCtx&&!dispositionOpen)setTimeout(resumeDispositionQueue,0);
 return result;
};

window.checkBattleEnd=function(){
 const b=state?.battle;if(!b)return true;
 markDefeatedUnits(b);
 if(resolveSpecialBattleEnd())return true;
 return previousCheckBattleEnd.apply(this,arguments);
};

window.battleAction=function(action){
 if(action==='retreat'&&state?.battle){
  const b=state.battle,remain=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+(Number(u.troops)||0),0);
  const text=b.defense?`${b.target}を放棄して全軍退却します。`:`${b.target}攻略を断念し、${b.src}へ全軍退却します。`;
  showModal(`<h2>退却の確認</h2><p><b>${text}</b><br>残存兵${remain.toLocaleString()}。</p><button id="v2427-retreat-go" class="danger">退却を確定</button><button data-close>戦闘へ戻る</button>`);
  modalCard.querySelector('#v2427-retreat-go').onclick=()=>{closeModal();window.endBattle(false,true)};return;
 }
 return previousBattleAction.apply(this,arguments);
};

function decorateBattleRules(){
 const b=state?.battle;if(!b)return;
 const phase=document.querySelector('.phase');if(phase)phase.innerHTML+=`<br><small>攻防 ${Math.min(30,Math.max(1,Number(b.day)||1))}/30往復　30往復完了で守備側勝利</small>`;
 const retreat=document.querySelector('[data-ba="retreat"]');
 if(retreat){retreat.disabled=false;retreat.textContent=b.defense?'城を放棄して退却':'全軍退却'}
}
window.render=function(){
 const b=state?.battle;
 if(b){markDefeatedUnits(b);if(resolveSpecialBattleEnd())return}
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(decorateBattleRules,0);
 else if(state?.v2427PendingDisposition&&!dispositionOpen)setTimeout(resumeDispositionQueue,0);
 return result;
};

const style=document.createElement('style');style.textContent=`
.disposition-card{margin:12px 0;padding:12px;border:1px solid #8b6b35;background:#1c150d}.disposition-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:14px}.disposition-actions button{min-height:48px}@media(max-width:560px){.disposition-actions{grid-template-columns:1fr}}
`;
document.head.appendChild(style);
})();
