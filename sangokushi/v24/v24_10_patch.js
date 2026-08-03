// v24.10 — post-battle officer disposition, succession and peaceful occupation of empty cities
(()=>{
const oldHire=window.hire;
function face(name){return typeof v241FaceHtml==='function'?v241FaceHtml(name):`<span class="face">${(name||'?')[0]}</span>`}
function applyFaces(){if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face))}
function chooseSuccessor(force){
 const candidates=state.officers.filter(o=>o.force===force&&!['死亡','捕虜','敗将','君主'].includes(o.status));
 if(!candidates.length)return null;
 const next=candidates.sort((a,b)=>(b.lead+b.cha*.5+b.int*.25)-(a.lead+a.cha*.5+a.int*.25))[0];
 next.status='君主';log(`${force}軍は${next.name}を新君主に擁立した。`);return next;
}
function collapseForce(force){Object.values(state.cities).forEach(c=>{if(c.force===force){c.force=null;c.troops=0}});log(`${force}軍は後継者を失い、滅亡した。`)}
function rulerRemoved(force,isRuler){if(!isRuler)return;const s=chooseSuccessor(force);if(!s)collapseForce(force)}
function clearOfficerlessCities(){
 Object.values(state.cities).forEach(c=>{
  if(!c.force||c.force==='日向軍')return;
  const has=state.officers.some(o=>o.force===c.force&&o.city===c.name&&!['死亡','捕虜','敗将'].includes(o.status));
  if(!has){const old=c.force;c.force=null;c.troops=0;c.morale=Math.max(35,Math.min(c.morale,55));log(`${c.name}は${old}軍の武将が不在となり、空白都市になった。`)}
 });
}
function executeOfficer(o){const force=o.force,isRuler=o.status==='君主';o.status='死亡';o.force='死亡';o.city=null;o.troops=0;log(`${o.name}を斬首した。`);rulerRemoved(force,isRuler);clearOfficerlessCities()}
function makePrisoner(o,city){const force=o.force,isRuler=o.status==='君主';o.force='在野';o.city=city;o.status='捕虜';o.captured=true;o.loy=Math.max(20,Math.min(70,Number(o.loy)||50));o.discovered=true;log(`${o.name}を捕虜とした。`);rulerRemoved(force,isRuler);clearOfficerlessCities()}
function recruitChance(o,captor){const loyalty=Number(o.loy)||70,rulerPenalty=o.status==='君主'?25:0;return Math.max(8,Math.min(82,Math.round(42+(Number(captor?.cha)||80)*.35-loyalty*.38-rulerPenalty)))}
function postBattleQueue(ctx,index=0){
 if(index>=ctx.captured.length){closeModal();clearOfficerlessCities();state.battle=null;state.selected=ctx.target;render();toast(ctx.captor,`${ctx.target}を攻略しました。戦後処理を完了しました。`);return}
 const o=ctx.captured[index];if(!o||o.status==='死亡')return postBattleQueue(ctx,index+1);
 showModal(`<h2>戦後処理 ${index+1}/${ctx.captured.length}</h2><div class="officer disposition-card">${face(o.name)}<div><b>${o.name}</b><br><small>${ctx.enemyForce}軍　${o.wasRuler?'君主':'一般'}　忠誠${o.loy??'―'}<br>統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}</small></div></div><p>${o.name}の処遇を決めてください。</p><div class="disposition-actions"><button data-v2410="recruit" class="primary">登用を試みる</button><button data-v2410="prisoner">捕虜にする</button><button data-v2410="execute" class="danger">斬首する</button></div>`);
 applyFaces();
 modalCard.querySelector('[data-v2410="prisoner"]').onclick=()=>{makePrisoner(o,ctx.target);postBattleQueue(ctx,index+1)};
 modalCard.querySelector('[data-v2410="execute"]').onclick=()=>{showModal(`<h2>斬首の確認</h2><div class="retreat-confirm"><b>${o.name}</b>を斬首します。${o.wasRuler?'<br>君主を失った勢力は後継者を擁立します。後継者がいなければ滅亡します。':''}</div><button id="v2410-exec" class="danger">斬首を確定</button><button data-close>戻る</button>`);modalCard.querySelector('#v2410-exec').onclick=()=>{executeOfficer(o);postBattleQueue(ctx,index+1)}};
 modalCard.querySelector('[data-v2410="recruit"]').onclick=()=>{
  const chance=recruitChance(o,ctx.captor),success=Math.random()*100<chance;
  showModal(`<h2>${o.name}を登用</h2><p>説得役：<b>${ctx.captor.name}</b>　魅力${ctx.captor.cha}</p><p>登用成功率：<b>${chance}%</b></p><button id="v2410-recruit-go" class="primary">登用を実行</button><button data-close>戻る</button>`);
  modalCard.querySelector('#v2410-recruit-go').onclick=()=>{
   if(success){const old=o.force,isRuler=o.wasRuler;o.force='日向軍';o.city=ctx.target;o.status='一般';o.loy=Math.max(48,Math.min(70,52+Math.floor(ctx.captor.cha/7)));o.discovered=true;log(`${old}軍の${o.name}が登用に応じ、日向軍へ加入した。`);rulerRemoved(old,isRuler);clearOfficerlessCities();postBattleQueue(ctx,index+1)}
   else{showModal(`<h2>登用拒否</h2><p><b>${o.name}</b>は登用を拒みました。</p><div class="disposition-actions"><button id="v2410-refuse-prisoner">捕虜にする</button><button id="v2410-refuse-execute" class="danger">斬首する</button></div>`);modalCard.querySelector('#v2410-refuse-prisoner').onclick=()=>{makePrisoner(o,ctx.target);postBattleQueue(ctx,index+1)};modalCard.querySelector('#v2410-refuse-execute').onclick=()=>{executeOfficer(o);postBattleQueue(ctx,index+1)}}
  };
 };
}
window.endBattle=function(win,retreat){
 const b=state.battle;if(!b)return;const remain=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+u.troops,0);
 if(!win){state.cities[b.src].troops+=remain;log(`${b.target}攻略に失敗。残存兵${remain}が帰還。`);state.battle=null;state.selected=b.src;render();return}
 const targetCity=state.cities[b.target],enemyForce=targetCity.force,playerNames=b.units.filter(u=>u.side==='player').map(u=>u.name);
 const captor=state.officers.filter(o=>playerNames.includes(o.name)&&o.force==='日向軍').sort((a,c)=>c.cha-a.cha)[0]||state.officers.find(o=>o.name==='佐々木久美');
 const captured=state.officers.filter(o=>o.force===enemyForce&&o.city===b.target&&o.status!=='死亡');captured.forEach(o=>{o.wasRuler=o.status==='君主';o.status='敗将'});
 targetCity.force='日向軍';targetCity.troops=remain;state.officers.filter(o=>playerNames.includes(o.name)&&o.force==='日向軍').forEach(o=>o.city=b.target);
 log(`${b.target}を攻略した。残存兵${remain}。${captured.length}名を捕らえた。`);
 if(!captured.length){state.battle=null;state.selected=b.target;clearOfficerlessCities();render();return}postBattleQueue({target:b.target,enemyForce,captured,captor},0);
};
window.hire=function(actor){const ps=state?.officers?.filter(o=>o.captured&&o.force==='在野'&&o.status==='捕虜')||[];ps.forEach(o=>o.status='在野');try{return oldHire(actor)}finally{ps.forEach(o=>{if(o.force==='在野'&&o.status==='在野')o.status='捕虜'})}};
window.moveGroup=function(){
 const list=ready(state.selected),ds=neighbors(state.selected).filter(n=>state.cities[n].force==='日向軍'||!state.cities[n].force);if(!ds.length)return alert('隣接する自国都市・空白都市がありません。');
 showModal(`<h2>武将移動</h2>${list.map(o=>`<label class="select-row"><input name="mv" type="checkbox" value="${o.name}"> ${o.name}</label>`).join('')}<div class="form-row"><label>移動先</label><select id="dest">${ds.map(x=>`<option value="${x}">${x}${state.cities[x].force?'':'（空白・移動で占領）'}</option>`).join('')}</select></div><button id="go" class="primary">移動</button><button data-close>閉じる</button>`);
 modalCard.querySelector('#go').onclick=()=>{const names=[...modalCard.querySelectorAll('[name=mv]:checked')].map(x=>x.value);if(!names.length)return alert('武将を選択');const d=modalCard.querySelector('#dest').value,dc=state.cities[d],wasEmpty=!dc.force;names.forEach(n=>{const o=state.officers.find(x=>x.name===n);o.city=d;o.acted=state.turn});if(wasEmpty){dc.force='日向軍';dc.troops=Math.max(0,dc.troops);dc.morale=Math.max(45,dc.morale);log(`${names.join('、')}が${d}へ入城し、空白都市を日向軍の支配下に置いた。`)}else log(`${names.join('、')}が${d}へ移動。`);closeModal();render()};
};
const style=document.createElement('style');style.textContent=`.disposition-card{margin:12px 0;padding:12px;border:1px solid #8b6b35;background:#1c150d}.disposition-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:14px}.disposition-actions button{min-height:48px}@media(max-width:560px){.disposition-actions{grid-template-columns:1fr}.disposition-actions button{min-height:50px}}`;document.head.appendChild(style);
})();
