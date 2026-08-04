// v24.24 — 伏毒の計: secret battlefield defection agreements
(()=>{
const previousChooseType=window.v243ChooseType;
const previousRender=window.render;
const previousEndBattle=window.endBattle;
const COST=320;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function ensureState(){
 if(!state)return;
 state.v2424Moles=state.v2424Moles&&typeof state.v2424Moles==='object'?state.v2424Moles:{};
 state.v2424MoleVersion=124;
}
function validEnemyForces(){
 const set=new Set();
 for(const c of Object.values(state?.cities||{})){
  if(c.force&&c.force!=='日向軍'&&!(Number(state.alliances?.[c.force])>=Number(state.turn)))set.add(c.force);
 }
 return set;
}
function moleCandidates(){
 ensureState();const forces=validEnemyForces();
 return (state.officers||[]).filter(o=>
  forces.has(o.force)&&activeOfficer(o)&&o.status!=='君主'&&!o.v2424MoleId
 ).sort((a,b)=>(Number(a.loy??70)-Number(b.loy??70))||(Number(b.int)||0)-(Number(a.int)||0)||a.name.localeCompare(b.name,'ja'));
}
function moleChance(actor,target){
 const loyalty=clamp(Number(target?.loy??70),1,100);
 const actorInt=Number(actor?.int)||50,actorCha=Number(actor?.cha)||50,targetInt=Number(target?.int)||50;
 return clamp(Math.round(3+(100-loyalty)*.75+(actorInt-50)*.22+(actorCha-50)*.10-(targetInt-50)*.16),3,82);
}
function activePledges(){
 ensureState();
 return Object.values(state.v2424Moles).filter(x=>{
  const o=(state.officers||[]).find(t=>t.v2424MoleId===x.id);
  return o&&activeOfficer(o)&&o.force&&o.force!=='日向軍'&&o.force!=='在野'&&o.status!=='君主';
 });
}
function cleanupPledges(){
 if(!state)return;ensureState();
 for(const [id,p] of Object.entries({...state.v2424Moles})){
  const o=(state.officers||[]).find(t=>t.v2424MoleId===id);
  if(!o||!activeOfficer(o)||o.force==='日向軍'||o.force==='在野'||o.force==='死亡'||o.status==='君主'){
   if(o)delete o.v2424MoleId;
   delete state.v2424Moles[id];
  }
 }
}
function pledgeSummaryHtml(){
 const list=activePledges();if(!list.length)return '';
 return `<div class="v2424-active"><b>成立中の内応約定</b>${list.map(p=>`<span>${p.target}（${p.force}軍・成立${p.year}年${p.month}月）</span>`).join('')}</div>`;
}

function chooseMoleTarget(actor){
 const targets=moleCandidates();
 if(!targets.length)return alert('伏毒を仕掛けられる敵将がいません。君主、捕虜、同盟勢力、既に内応を約した武将は対象外です。');
 showModal(`<h2>伏毒の計：対象武将</h2><p>実行武将：<b>${actor.name}</b>　知力${actor.int}・魅力${actor.cha}</p><p><small>敵将と密かに内応を約束します。忠誠が低いほど成功しやすく、成立した武将は次に日向軍との戦闘へ出陣した際、戦場で寝返ります。</small></p><div class="choice-list">${targets.slice(0,80).map(o=>`<button data-v2424-target="${o.v2424Key||''}" data-v2424-name="${o.name}" data-v2424-force="${o.force}" data-v2424-city="${o.city}"><b>${o.name}</b>　${o.force}軍<br><small>所在${o.city}　忠誠${o.loy??70}　知力${o.int}　魅力${o.cha}</small></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2424-name]').forEach(button=>button.onclick=()=>{
  const target=(state.officers||[]).find(o=>o.name===button.dataset.v2424Name&&o.force===button.dataset.v2424Force&&o.city===button.dataset.v2424City&&activeOfficer(o)&&o.status!=='君主'&&!o.v2424MoleId);
  if(!target)return alert('対象武将の所属状況が変化しました。');
  confirmMole(actor,target);
 });
}
function confirmMole(actor,target){
 const chance=moleChance(actor,target),success=Math.random()*100<chance;
 const subject=`${target.name}への伏毒の計`;
 const advice=typeof v241Advice==='function'?v241Advice(success,subject):{a:null,text:'軍師から助言を得られません。'};
 showModal(`<h2>伏毒の計を実行</h2>${typeof v241AdviceHtml==='function'?v241AdviceHtml(advice):`<p>${advice.text}</p>`}<div class="v2424-target-card"><b>${target.name}</b>　${target.force}軍<br><small>所在${target.city}　忠誠${target.loy??70}　知力${target.int}<br>実行武将 ${actor.name}　必要金${COST}</small></div><p><small>成功率は対象の忠誠度を最も重く見て、実行者の知力・魅力と対象の知力から判定します。成立の事実は戦場で発動するまで敵国へ知られません。</small></p><button id="v2424-go" class="primary">密使を送る</button><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v241-face]').forEach(el=>typeof v241ApplyFace==='function'&&v241ApplyFace(el,el.dataset.v241Face));
 modalCard.querySelector('#v2424-go').onclick=()=>{
  const home=cityObj();if(home.gold<COST)return alert('金が不足しています。');
  if(target.v2424MoleId||target.force==='日向軍'||target.status==='君主')return alert('対象武将の状況が変化しました。');
  home.gold-=COST;let msg;
  if(success){
   ensureState();
   const id=`${state.turn}-${target.name}-${target.force}-${Math.random().toString(36).slice(2,8)}`;
   const record={id,target:target.name,force:target.force,city:target.city,actor:actor.name,turn:state.turn,year:state.year,month:state.month,loyalty:Number(target.loy??70)};
   state.v2424Moles[id]=record;target.v2424MoleId=id;
   msg=`${target.name}との内応の約定が成立しました。次に日向軍と戦場で相まみえた時、敵陣を裏切ります。`;
  }else{
   target.loy=Math.min(100,Number(target.loy??70)+4);
   state.relations[target.force]=Math.max(-100,Number(state.relations?.[target.force]||0)-3);
   msg=`${target.name}への伏毒の計は拒絶されました。警戒により忠誠が4上昇しました。`;
  }
  closeModal();finish(actor,msg);
 };
}

window.v243ChooseType=function(actor){
 previousChooseType(actor);
 const grid=modalCard.querySelector('.stratagem-grid');if(!grid)return;
 const button=document.createElement('button');button.dataset.v2424Type='mole';
 button.innerHTML='<b>伏毒の計</b><small>敵将に内応を約束させ、次に日向軍との戦闘へ出陣した時に寝返らせる。低忠誠ほど成功しやすい。金320。</small>';
 button.onclick=()=>chooseMoleTarget(actor);grid.appendChild(button);
 const summary=pledgeSummaryHtml();if(summary)grid.insertAdjacentHTML('beforebegin',summary);
};

function enemyContext(b){
 if(!b)return {force:null,city:null};
 if(b.defense)return {force:b.invadingForce||null,city:b.enemySource||null};
 return {force:state.cities?.[b.target]?.force||null,city:b.target||null};
}
function matchingMole(unit,b){
 const ctx=enemyContext(b);if(!ctx.force)return null;
 const candidates=(state.officers||[]).filter(o=>
  o.name===unit.name&&o.force===ctx.force&&activeOfficer(o)&&o.v2424MoleId&&state.v2424Moles?.[o.v2424MoleId]
 );
 return candidates.sort((a,z)=>(z.city===ctx.city?1:0)-(a.city===ctx.city?1:0))[0]||null;
}
function resetExperienceTracking(b){
 if(!b?.units)return;
 const enemyTotal=b.units.filter(u=>u.side==='enemy'&&u.troops>0).reduce((s,u)=>s+(Number(u.troops)||0),0);
 b._v2420EnemyTotal=enemyTotal;b._v2420Damage={};
 b._v2421Snapshot=b.units.map(u=>u.side==='enemy'?Math.max(0,Number(u.troops)||0):null);
 b._v2421Damage={};b._v2421Kills={};
}
function activateMoles(b){
 if(!b?.units||b._v2424MolesChecked)return false;
 ensureState();cleanupPledges();let changed=false;
 b._v2424Turncoats=Array.isArray(b._v2424Turncoats)?b._v2424Turncoats:[];
 for(const unit of b.units.filter(u=>u.side==='enemy'&&u.troops>0)){
  const o=matchingMole(unit,b);if(!o)continue;
  const pledge=state.v2424Moles[o.v2424MoleId],oldForce=o.force;
  unit.side='player';unit.done=false;unit.movedThisTurn=false;unit.v2424Turncoat=true;unit.originalForce=oldForce;
  o.force='日向軍';o.status='一般';o.loy=Math.max(68,Math.min(82,58+Math.floor(Number(pledge?.loyalty||60)/5)));o.city=b.target;o.acted=state.turn;
  b._v2424Turncoats.push(o.name);
  delete state.v2424Moles[o.v2424MoleId];delete o.v2424MoleId;
  b.logs=b.logs||[];b.logs.unshift(`伏毒発動！ ${o.name}隊が${oldForce}軍を裏切り、日向軍へ寝返った！`);
  if(typeof log==='function')log(`伏毒の計が発動。${oldForce}軍の${o.name}が戦場で寝返り、日向軍へ加入した。`);
  changed=true;
 }
 b._v2424MolesChecked=true;
 return changed;
}

window.render=function(){
 cleanupPledges();
 const b=state?.battle,changed=b?activateMoles(b):false;
 const result=previousRender.apply(this,arguments);
 if(changed&&state?.battle===b){
  resetExperienceTracking(b);
  if(!b.units.some(u=>u.side==='enemy'&&u.troops>0))setTimeout(()=>{if(state?.battle===b&&typeof checkBattleEnd==='function')checkBattleEnd()},0);
 }
 return result;
};
window.endBattle=function(win,retreat){
 const b=state?.battle,turncoats=b&&Array.isArray(b._v2424Turncoats)?[...b._v2424Turncoats]:[];
 const src=b?.src,defense=!!b?.defense;
 const result=previousEndBattle.apply(this,arguments);
 if(turncoats.length&&!defense&&!win&&src&&state?.cities?.[src]?.force==='日向軍'){
  turncoats.forEach(name=>{
   const o=(state.officers||[]).find(x=>x.name===name&&x.force==='日向軍'&&activeOfficer(x));
   if(o)o.city=src;
  });
 }
 return result;
};

const style=document.createElement('style');
style.textContent=`
.v2424-active{margin:8px 0 11px;padding:8px 10px;border:1px solid #725c86;background:#191321;color:#d9c9ee;font-size:10px;line-height:1.45}.v2424-active b{display:block;margin-bottom:4px;color:#f0dbff}.v2424-active span{display:block}
.v2424-target-card{margin:10px 0;padding:10px;border:1px solid #725c86;background:#18121f;line-height:1.5}
`;
document.head.appendChild(style);
})();
