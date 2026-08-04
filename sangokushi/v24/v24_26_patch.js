// v24.26 — city-first officer targeting for discord and mole stratagems
(()=>{
const previousChooseCity=window.v243ChooseCity;
const previousChooseType=window.v243ChooseType;
const MOLE_COST=320;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function isAllied(force){return Number(state?.alliances?.[force]||0)>=Number(state?.turn||0)}
function forceColor(force){return (typeof FORCES!=='undefined'&&FORCES[force]?.color)||'#6f3c36'}
function ensureMoleState(){
 if(!state)return;
 state.v2424Moles=state.v2424Moles&&typeof state.v2424Moles==='object'?state.v2424Moles:{};
 state.v2424MoleVersion=124;
}
function validTarget(o,mode){
 if(!activeOfficer(o)||!o.force||o.force==='日向軍'||o.force==='在野'||o.force==='死亡')return false;
 if(o.status==='君主'||isAllied(o.force))return false;
 const city=state?.cities?.[o.city];
 if(!city||city.force!==o.force)return false;
 if(mode==='mole'&&o.v2424MoleId)return false;
 return true;
}
function targetsInCity(cityName,mode){
 return (state?.officers||[]).filter(o=>o.city===cityName&&validTarget(o,mode))
  .sort((a,b)=>(Number(a.loy??70)-Number(b.loy??70))||(Number(b.int)||0)-(Number(a.int)||0)||a.name.localeCompare(b.name,'ja'));
}
function selectableCities(mode){
 return Object.values(state?.cities||{}).filter(c=>c.force&&c.force!=='日向軍'&&!isAllied(c.force)&&targetsInCity(c.name,mode).length);
}
function mapCityButtons(selectable){
 const enabled=new Set(selectable.map(c=>c.name));
 return Object.values(state.cities).map(c=>{
  const can=enabled.has(c.name),force=c.force||'空白';
  const background=c.force?forceColor(c.force):'#4c4b42';
  return `<button class="v2425-map-city ${can?'selectable':'disabled'}" data-v2426-city="${c.name}" ${can?'':'disabled'} style="left:${c.x}%;top:${c.y}%;background:${background}" title="${c.name}・${force}">${c.name}<small>${force}</small></button>`;
 }).join('');
}
function legend(cities){
 const forces=[...new Set(cities.map(c=>c.force))].sort((a,b)=>a.localeCompare(b,'ja'));
 return forces.map(f=>`<span><i style="background:${forceColor(f)}"></i>${f}</span>`).join('');
}
function showCityMap(actor,mode){
 const cities=selectableCities(mode);
 if(!cities.length)return alert(mode==='discord'?'離間を仕掛けられる敵城がありません。':'伏毒を仕掛けられる敵城がありません。');
 const label=mode==='discord'?'離間の計':'伏毒の計';
 showModal(`<h2>${label}：対象城</h2><p>勢力図から敵城を選び、その城に現在いる武将を対象にします。</p><div class="v2426-rule"><b>忠誠度による対象除外はありません。</b><br>忠誠100の武将も選択できます。ただし、忠誠が高いほど成功率は低くなります。</div><div class="v2425-force-legend">${legend(cities)}</div><div class="v2425-target-map">${typeof roadHtml==='function'?roadHtml(state.cities):''}${mapCityButtons(cities)}</div><p class="v2425-map-help"><small>明るく縁取られた敵城を選択してください。</small></p><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2426-city]:not([disabled])').forEach(btn=>btn.onclick=()=>{
  const city=state.cities[btn.dataset.v2426City];
  if(city)showOfficerList(actor,city,mode);
 });
}
function showOfficerList(actor,city,mode){
 const targets=targetsInCity(city.name,mode);
 if(!targets.length)return showCityMap(actor,mode);
 const label=mode==='discord'?'離間の計':'伏毒の計';
 showModal(`<h2>${label}：${city.name}の武将</h2><button id="v2426-back" class="v2425-back">← 勢力図へ戻る</button><p><b>${city.force}軍・${city.name}</b>に現在配置されている武将だけを表示しています。</p><div class="choice-list">${targets.map(o=>`<button data-v2426-target="${o.name}">${typeof v241FaceHtml==='function'?v241FaceHtml(o.name):''}<span><b>${o.name}</b><br><small>忠誠${o.loy??70}　統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}</small></span></button>`).join('')}</div><button data-close>中止</button>`);
 if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
 modalCard.querySelector('#v2426-back').onclick=()=>showCityMap(actor,mode);
 modalCard.querySelectorAll('[data-v2426-target]').forEach(btn=>btn.onclick=()=>{
  const target=(state.officers||[]).find(o=>o.name===btn.dataset.v2426Target&&o.city===city.name&&o.force===city.force&&validTarget(o,mode));
  if(!target)return alert('対象武将の所属または所在が変化しました。');
  if(mode==='discord'){
   if(typeof window.v243Confirm!=='function')return alert('離間の実行処理を開けません。');
   return window.v243Confirm(actor,city,'discord',target);
  }
  confirmMole(actor,city,target);
 });
}
function moleChance(actor,target){
 const loyalty=clamp(Number(target?.loy??70),1,100);
 const actorInt=Number(actor?.int)||50,actorCha=Number(actor?.cha)||50,targetInt=Number(target?.int)||50;
 return clamp(Math.round(3+(100-loyalty)*.75+(actorInt-50)*.22+(actorCha-50)*.10-(targetInt-50)*.16),3,82);
}
function confirmMole(actor,city,target){
 ensureMoleState();
 const chance=moleChance(actor,target),success=Math.random()*100<chance;
 const subject=`${target.name}への伏毒の計`;
 const advice=typeof v241Advice==='function'?v241Advice(success,subject):{a:null,text:'軍師から助言を得られません。'};
 showModal(`<h2>伏毒の計を実行</h2>${typeof v241AdviceHtml==='function'?v241AdviceHtml(advice):`<p>${advice.text}</p>`}<div class="v2424-target-card"><b>${target.name}</b>　${target.force}軍・${city.name}<br><small>忠誠${target.loy??70}　知力${target.int}<br>実行武将 ${actor.name}　必要金${MOLE_COST}</small></div><p><small>対象の忠誠度を最も重く見て、実行者の知力・魅力と対象の知力から成功判定します。</small></p><button id="v2426-mole-go" class="primary">密使を送る</button><button id="v2426-mole-back">対象を選び直す</button><button data-close>中止</button>`);
 if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
 modalCard.querySelector('#v2426-mole-back').onclick=()=>showOfficerList(actor,city,'mole');
 modalCard.querySelector('#v2426-mole-go').onclick=()=>{
  const home=cityObj();if(home.gold<MOLE_COST)return alert('金が不足しています。');
  const current=(state.officers||[]).find(o=>o===target&&o.city===city.name&&o.force===city.force&&validTarget(o,'mole'));
  if(!current)return alert('対象武将の所属または所在が変化しました。');
  home.gold-=MOLE_COST;
  let msg;
  if(success){
   ensureMoleState();
   const id=`${state.turn}-${target.name}-${target.force}-${Math.random().toString(36).slice(2,8)}`;
   state.v2424Moles[id]={id,target:target.name,force:target.force,city:target.city,actor:actor.name,turn:state.turn,year:state.year,month:state.month,loyalty:Number(target.loy??70)};
   target.v2424MoleId=id;
   msg=`${city.name}の${target.name}との内応の約定が成立しました。次に日向軍との戦闘へ出陣した時、戦場で寝返ります。`;
  }else{
   target.loy=Math.min(100,Number(target.loy??70)+4);
   state.relations[target.force]=Math.max(-100,Number(state.relations?.[target.force]||0)-3);
   msg=`${city.name}の${target.name}への伏毒の計は拒絶されました。警戒により忠誠が4上昇しました。`;
  }
  closeModal();finish(actor,msg);
 };
}

window.v243ChooseOfficer=function(actor,city){return showOfficerList(actor,city,'discord')};
window.v243ChooseCity=function(actor,type){
 if(type==='discord')return showCityMap(actor,'discord');
 return previousChooseCity.apply(this,arguments);
};
window.v243ChooseType=function(actor){
 previousChooseType(actor);
 const moleButton=modalCard.querySelector('[data-v2424-type="mole"]');
 if(moleButton)moleButton.onclick=()=>showCityMap(actor,'mole');
};

const style=document.createElement('style');
style.textContent=`
.v2426-rule{margin:8px 0;padding:9px 10px;border:1px solid #80612e;background:#1d160d;color:#dcc59b;font-size:11px;line-height:1.5}.v2426-rule b{color:#ffe09a}
`;
document.head.appendChild(style);
})();
