// v24.25 — map-first target selection for stratagems and enemy recruitment
(()=>{
const previousChooseCity=window.v243ChooseCity;
const previousChooseOfficer=window.v243ChooseOfficer;
const previousChooseType=window.v243ChooseType;
const previousHire=window.hire;

const HINATA_NAMES=new Set();
try{(HINATA_WORLD||[]).forEach(x=>HINATA_NAMES.add(x[0]))}catch(e){}

function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='敗将'}
function isAllied(force){return Number(state?.alliances?.[force]||0)>=Number(state?.turn||0)}
function forceColor(force){return (typeof FORCES!=='undefined'&&FORCES[force]?.color)||'#6f3c36'}
function cityButtons(selectable){
 const selected=new Set(selectable||[]);
 return Object.values(state.cities).map(c=>{
  const enabled=selected.has(c.name),force=c.force||'空白';
  const background=c.force?forceColor(c.force):(c.name===state.selected?'#315f42':'#4c4b42');
  return `<button class="v2425-map-city ${enabled?'selectable':'disabled'}" data-v2425-map-city="${c.name}" ${enabled?'':'disabled'} style="left:${c.x}%;top:${c.y}%;background:${background}" title="${c.name}・${force}">${c.name}<small>${force}</small></button>`;
 }).join('');
}
function forceLegend(forces){
 return [...forces].sort((a,b)=>a.localeCompare(b,'ja')).map(f=>`<span><i style="background:${forceColor(f)}"></i>${f}</span>`).join('');
}
function showTargetMap({title,description,selectableCities,forces,onSelect,extra=''}){
 const list=[...new Set(selectableCities||[])];
 showModal(`<h2>${title}</h2><p>${description}</p>${extra}<div class="v2425-force-legend">${forceLegend(forces||new Set())}</div><div class="v2425-target-map">${typeof roadHtml==='function'?roadHtml(state.cities):''}${cityButtons(list)}</div><p class="v2425-map-help"><small>明るく表示された都市を選択してください。同じ色の都市は同じ勢力です。</small></p><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2425-map-city]:not([disabled])').forEach(btn=>btn.onclick=()=>{
  const city=state.cities[btn.dataset.v2425MapCity];
  if(city)onSelect(city);
 });
}
function addBackButton(label,callback){
 const h=modalCard.querySelector('h2');
 if(!h||modalCard.querySelector('.v2425-back'))return;
 const b=document.createElement('button');b.className='v2425-back';b.textContent=label;b.onclick=callback;
 h.insertAdjacentElement('afterend',b);
}
function enemyForcesWithOfficers(filter){
 const forces=new Set();
 for(const o of state.officers||[]){
  if(!activeOfficer(o)||!o.force||o.force==='日向軍'||o.force==='在野'||o.force==='死亡'||o.status==='捕虜'||o.status==='君主'||isAllied(o.force))continue;
  if(!filter||filter(o))forces.add(o.force);
 }
 return forces;
}
function citiesOfForces(forces){
 return Object.values(state.cities).filter(c=>c.force&&forces.has(c.force)).map(c=>c.name);
}

function showStratagemForceMap(actor,type){
 const forces=enemyForcesWithOfficers();
 if(!forces.size)return alert('対象にできる敵国武将がいません。');
 showTargetMap({
  title:type==='discord'?'離間の計：対象国':'対象国を選択',
  description:'勢力図から工作を仕掛ける国を選び、その後に対象武将を選択します。',
  selectableCities:citiesOfForces(forces),forces,
  onSelect:city=>{
   if(typeof previousChooseOfficer!=='function')return alert('対象武将の選択画面を開けません。');
   previousChooseOfficer(actor,city);
   const title=modalCard.querySelector('h2');if(title)title.textContent=`離間の計：${city.force}軍の対象武将`;
   addBackButton('← 勢力図へ戻る',()=>showStratagemForceMap(actor,type));
  }
 });
}
function showStratagemCityMap(actor,type){
 const cities=Object.values(state.cities).filter(c=>c.force&&c.force!=='日向軍'&&!isAllied(c.force));
 if(!cities.length)return alert('計略を仕掛けられる敵都市がありません。');
 const labels={rumor:'流言',incite:'扇動',sabotage:'破壊工作'};
 const forces=new Set(cities.map(c=>c.force));
 showTargetMap({
  title:`${labels[type]||'計略'}：対象都市`,
  description:'勢力図上の敵都市を直接選択します。選んだ都市へ計略を仕掛けます。',
  selectableCities:cities.map(c=>c.name),forces,
  onSelect:city=>{
   if(typeof window.v243Confirm==='function')window.v243Confirm(actor,city,type,null);
   else if(typeof v243Confirm==='function')v243Confirm(actor,city,type,null);
  }
 });
}
window.v243ChooseCity=function(actor,type){
 if(type==='discord')return showStratagemForceMap(actor,type);
 return showStratagemCityMap(actor,type);
};

function moleForces(){
 return enemyForcesWithOfficers(o=>!o.v2424MoleId);
}
function showMoleForceMap(actor,openOriginalList){
 const forces=moleForces();
 if(!forces.size)return alert('伏毒を仕掛けられる敵国武将がいません。');
 showTargetMap({
  title:'伏毒の計：対象国',
  description:'勢力図から内応工作を仕掛ける国を選び、その国の武将から対象を選択します。',
  selectableCities:citiesOfForces(forces),forces,
  onSelect:city=>{
   openOriginalList();
   modalCard.querySelectorAll('[data-v2424-name]').forEach(btn=>{if(btn.dataset.v2424Force!==city.force)btn.remove()});
   const title=modalCard.querySelector('h2');if(title)title.textContent=`伏毒の計：${city.force}軍の対象武将`;
   addBackButton('← 勢力図へ戻る',()=>showMoleForceMap(actor,openOriginalList));
  }
 });
}
window.v243ChooseType=function(actor){
 previousChooseType(actor);
 const moleButton=modalCard.querySelector('[data-v2424-type="mole"]');
 if(moleButton){
  const openOriginalList=moleButton.onclick;
  moleButton.onclick=()=>showMoleForceMap(actor,openOriginalList);
 }
};

function hireCandidates(){
 const adjacent=new Set(typeof neighbors==='function'?neighbors(state.selected):state.cities[state.selected]?.n||[]);
 return (state.officers||[]).filter(t=>{
  if(!activeOfficer(t)||t.force==='日向軍'||t.status==='君主')return false;
  if(HINATA_NAMES.has(t.name)&&t.discovered===false)return false;
  if(t.force==='在野')return t.city===state.selected;
  if(t.status==='捕虜')return false;
  return adjacent.has(t.city)&&state.cities[t.city]?.force===t.force;
 });
}
function showFilteredHireList(actor,force){
 previousHire(actor);
 const selector='[data-v249-target],[data-v244-target]';
 modalCard.querySelectorAll(selector).forEach(btn=>{
  const name=btn.dataset.v249Target||btn.dataset.v244Target;
  const target=(state.officers||[]).find(o=>o.name===name);
  if(!target||(force==='在野'?target.force!=='在野':target.force!==force))btn.remove();
 });
 const h=modalCard.querySelector('h2');if(h)h.textContent=force==='在野'?'登用：現在地の在野武将':`登用：${force}軍の武将`;
 addBackButton('← 勢力図へ戻る',()=>showHireMap(actor));
}
function showHireMap(actor){
 const candidates=hireCandidates();
 if(!candidates.length)return alert('この都市または隣接する敵都市に、登用可能な武将はいません。');
 const enemy=candidates.filter(o=>o.force!=='在野');
 const forces=new Set(enemy.map(o=>o.force));
 const selectable=citiesOfForces(forces);
 const wild=candidates.filter(o=>o.force==='在野');
 const extra=wild.length?`<button id="v2425-wild" class="v2425-wild primary">現在地・${state.selected}の在野武将から選ぶ（${wild.length}名）</button>`:'';
 showTargetMap({
  title:'登用：対象国',
  description:'敵国武将は、現在の都市に隣接する敵都市の所属国だけが対象です。勢力図から国を選び、その後に武将を選択します。',
  selectableCities:selectable,forces,
  extra,
  onSelect:city=>showFilteredHireList(actor,city.force)
 });
 const wildButton=modalCard.querySelector('#v2425-wild');if(wildButton)wildButton.onclick=()=>showFilteredHireList(actor,'在野');
}
window.hire=function(actor){return showHireMap(actor)};

const style=document.createElement('style');
style.textContent=`
.v2425-target-map{position:relative;width:100%;aspect-ratio:1.45;background:radial-gradient(circle at 65% 35%,#445238,#1d2924 58%,#182019);border:1px solid #9b7234;border-radius:10px;overflow:hidden;margin:10px 0}
.v2425-map-city{position:absolute;transform:translate(-50%,-50%);z-index:2;min-width:50px;padding:5px 6px;border-radius:7px;font-size:9px;line-height:1.15;white-space:nowrap}
.v2425-map-city small{display:block;font-size:7px;margin-top:2px}.v2425-map-city.selectable{opacity:1;box-shadow:0 0 0 2px #ffe082,0 0 10px #ffe08288;cursor:pointer}.v2425-map-city.disabled{opacity:.24;filter:grayscale(.55)}
.v2425-force-legend{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.v2425-force-legend span{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border:1px solid #675338;border-radius:999px;background:#17110c;font-size:9px}.v2425-force-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}
.v2425-back{margin:0 0 10px;padding:7px 10px;background:#2b241b}.v2425-wild{width:100%;margin:5px 0 8px}.v2425-map-help{margin:5px 0 10px;color:#c9b894}
@media(max-width:560px){.v2425-target-map{aspect-ratio:.92}.v2425-map-city{min-width:42px;padding:4px;font-size:8px}.v2425-map-city small{font-size:6px}}
`;
document.head.appendChild(style);
})();
