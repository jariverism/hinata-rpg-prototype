// v24.22 — enemy officer progression and veteran armies in later scenarios
(()=>{
const previousRender=window.render;
const previousEndMonth=window.endMonth;
const previousEndBattle=window.endBattle;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function scenarioId(){return String(state?.scenarioId||state?.scenario?.id||'190')}
function eraRule(){
 return ({
  '190':{baseLevel:2,unit:5000,reserve:1200,label:'群雄割拠'},
  '200':{baseLevel:5,unit:8000,reserve:1800,label:'官渡前夜'},
  '208':{baseLevel:6,unit:9000,reserve:2200,label:'赤壁前夜'},
  '219':{baseLevel:7,unit:10000,reserve:2600,label:'荊州争奪'}
 })[scenarioId()]||{baseLevel:2,unit:5000,reserve:1200,label:'群雄割拠'};
}
function active(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function isEnemy(o){return active(o)&&o.force&&o.force!=='日向軍'&&o.force!=='在野'&&o.force!=='死亡'}
function nextExp(o){return 100+Math.max(1,Number(o?.level)||1)*50}
function leadershipCeiling(o){return Math.round(5000+clamp(Number(o?.lead)||0,0,100)*150)}
function levelCapacity(o){return 3000+Math.max(1,Number(o?.level)||1)*1000}
function commandCapacity(o){return Math.min(leadershipCeiling(o),levelCapacity(o))}
function officer(name,force=null){
 return state?.officers?.find(o=>o.name===name&&(!force||o.force===force)&&active(o))||null;
}
function cityOfficers(city){
 const c=state?.cities?.[city];if(!c?.force)return [];
 return (state.officers||[]).filter(o=>o.city===city&&o.force===c.force&&active(o));
}
function isFrontier(city){
 const c=state?.cities?.[city];if(!c)return false;
 return (c.n||[]).some(n=>state.cities?.[n]?.force&&state.cities[n].force!==c.force);
}
function knownEnemyCity(city){
 const c=state?.cities?.[city];if(!c)return false;
 const intel=state?.spyIntel?.[city];
 return (c.n||[]).some(n=>state.cities?.[n]?.force==='日向軍')||
  (intel&&Number(intel.expires)>=Number(state.turn)&&Number(intel.level)>=1);
}

function minimumEnemyLevel(o){
 const rule=eraRule(),elapsed=Math.min(10,Math.floor(Math.max(0,(Number(state.turn)||1)-1)/18));
 let veteran=0;
 if(scenarioId()!=='219'&&(o.status==='君主'||Number(o.lead)>=90||Number(o.war)>=95||Number(o.int)>=97))veteran=1;
 return clamp(rule.baseLevel+veteran+elapsed,1,30);
}
function initializeEnemyProgression(){
 if(!state?.officers)return;
 for(const o of state.officers){
  if(!Number.isFinite(Number(o.level)))o.level=1;
  if(!Number.isFinite(Number(o.exp)))o.exp=0;
  if(!isEnemy(o))continue;
  o.level=Math.max(Math.floor(Number(o.level)||1),minimumEnemyLevel(o));
  o.exp=Math.max(0,Math.floor(Number(o.exp)||0));
 }
 state.v2422EnemyProgressionVersion=122;
}
function reinforceEnemyCitiesOnce(){
 if(!state?.cities||state.v2422ArmySetup===`${scenarioId()}:122`)return;
 const rule=eraRule();
 for(const c of Object.values(state.cities)){
  if(!c.force||c.force==='日向軍')continue;
  const count=cityOfficers(c.name).length;
  const formations=Math.max(2,Math.min(4,count||1));
  const frontierBonus=isFrontier(c.name)?rule.unit:0;
  const floor=formations*rule.unit+rule.reserve+frontierBonus;
  c.troops=Math.max(Number(c.troops)||0,floor);
  c.food=Math.max(Number(c.food)||0,Math.floor(floor*1.8));
  c.gold=Math.max(Number(c.gold)||0,Math.floor(floor*.13));
 }
 state.v2422ArmySetup=`${scenarioId()}:122`;
}
function addEnemyExp(o,amount,source='戦歴'){
 if(!isEnemy(o))return 0;
 let gained=Math.max(0,Math.floor(amount)),levels=0;o.exp=(Number(o.exp)||0)+gained;
 while(o.level<30&&o.exp>=nextExp(o)){
  o.exp-=nextExp(o);o.level++;levels++;
  const c=state.cities?.[o.city];
  if(c&&c.force===o.force)c.troops+=700;
 }
 if(levels&&knownEnemyCity(o.city)){
  const text=`敵情：${o.force}軍の${o.name}が${source}によりLv${o.level}へ成長し、指揮上限は${commandCapacity(o).toLocaleString()}となった。`;
  state.aiNews=Array.isArray(state.aiNews)?state.aiNews:[];
  state.aiNews.unshift({turn:state.turn,text,important:false,type:'enemy-level'});state.aiNews=state.aiNews.slice(0,12);
  if(typeof log==='function')log(text);
 }
 return levels;
}
function strategicEnemyExperience(){
 if(!state?.officers)return;
 for(const o of state.officers){
  if(!isEnemy(o)||state.cities?.[o.city]?.force!==o.force)continue;
  const frontline=isFrontier(o.city),gain=frontline?(12+Math.floor(Math.random()*13)):(4+Math.floor(Math.random()*7));
  addEnemyExp(o,gain,frontline?'国境勤務':'軍務');
 }
}

function enemyUnitOfficer(u,b){
 const force=b?.invadingForce||state?.cities?.[b?.target]?.force||null;
 return officer(u.name,force)||officer(u.name)||null;
}
function prepareEnemyBattle(b){
 if(!b?.units||b._v2422Prepared)return;
 initializeEnemyProgression();
 const rule=eraRule(),enemies=b.units.filter(u=>u.side==='enemy'&&u.troops>0);
 if(!enemies.length){b._v2422Prepared=true;return}
 let total=enemies.reduce((s,u)=>s+(Number(u.troops)||0),0);
 const ranked=enemies.slice().sort((a,z)=>{
  const ao=enemyUnitOfficer(a,b),zo=enemyUnitOfficer(z,b);
  return commandCapacity(zo||z)-commandCapacity(ao||a)||(Number(z.lead)||0)-(Number(a.lead)||0);
 });
 let selected=[],capacity=0;
 for(const u of ranked){
  selected.push(u);capacity+=commandCapacity(enemyUnitOfficer(u,b)||u);
  if(capacity>=total&&selected.length>=Math.max(1,Math.floor(total/rule.unit)))break;
 }
 if(!selected.length)selected=[ranked[0]];
 const selectedSet=new Set(selected);
 b.units=b.units.filter(u=>u.side!=='enemy'||selectedSet.has(u));
 let remaining=Math.min(total,selected.reduce((s,u)=>s+commandCapacity(enemyUnitOfficer(u,b)||u),0));
 selected.forEach((u,i)=>{
  const o=enemyUnitOfficer(u,b),left=selected.length-i,cap=commandCapacity(o||u);
  const laterCap=selected.slice(i+1).reduce((s,x)=>s+commandCapacity(enemyUnitOfficer(x,b)||x),0);
  let amount=Math.min(cap,Math.max(100,Math.floor(remaining/left)));
  if(remaining-amount>laterCap)amount=Math.min(cap,remaining-laterCap);
  amount=Math.max(100,Math.floor(amount/100)*100);remaining=Math.max(0,remaining-amount);
  u.troops=amount;u.max=amount;u.level=Number(o?.level)||rule.baseLevel;
 });
 if(remaining>0){
  for(const u of selected){
   if(remaining<100)break;
   const cap=commandCapacity(enemyUnitOfficer(u,b)||u),room=Math.max(0,cap-u.troops),add=Math.min(room,remaining);
   u.troops+=add;u.max=u.troops;remaining-=add;
  }
 }
 b._v2422EnemyCommitted=selected.reduce((s,u)=>s+u.troops,0);
 b._v2422PlayerStart=b.units.filter(u=>u.side==='player').reduce((s,u)=>s+(Number(u.troops)||0),0);
 b._v2422Prepared=true;
}
function decorateEnemyLevels(){
 if(!state?.battle)return;
 const b=state.battle;
 document.querySelectorAll('[data-unit]').forEach(el=>{
  const u=b.units.find(x=>x.name===el.dataset.unit&&x.side==='enemy'&&x.troops>0);if(!u)return;
  const o=enemyUnitOfficer(u,b);if(!o)return;
  el.title=`${el.title?el.title+'\n':''}${o.force}軍　Lv${o.level}　EXP ${o.exp}/${nextExp(o)}　指揮上限${commandCapacity(o).toLocaleString()}`;
  if(!el.querySelector('.v2422-enemy-level')){
   const lv=document.createElement('small');lv.className='v2422-enemy-level';lv.textContent=`Lv${o.level}`;el.appendChild(lv);
  }
 });
}
function awardEnemyBattleExperience(b,enemyWin){
 if(!b||b._v2422EnemyExpAwarded)return;b._v2422EnemyExpAwarded=true;
 const current=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+(Number(u.troops)||0),0);
 const inflicted=Math.max(0,(Number(b._v2422PlayerStart)||current)-current);
 const names=[...new Set(b.units.filter(u=>u.side==='enemy').map(u=>u.name))];
 const perDamage=names.length?Math.min(80,Math.floor(inflicted/100/names.length)):0;
 names.forEach(name=>{
  const o=enemyUnitOfficer({name},b);if(o)addEnemyExp(o,25+(enemyWin?50:10)+perDamage,enemyWin?'戦勝':'実戦経験');
 });
}

window.endBattle=function(win,retreat){
 const b=state?.battle;if(b)awardEnemyBattleExperience(b,!win);
 return previousEndBattle.apply(this,arguments);
};
window.endMonth=function(){
 const result=previousEndMonth.apply(this,arguments);
 try{initializeEnemyProgression();strategicEnemyExperience()}catch(e){console.error('v24.22 enemy progression:',e)}
 return result;
};
window.render=function(){
 try{
  if(state){initializeEnemyProgression();reinforceEnemyCitiesOnce();if(state.battle)prepareEnemyBattle(state.battle)}
 }catch(e){console.error('v24.22 preparation:',e)}
 const result=previousRender.apply(this,arguments);
 setTimeout(()=>{try{decorateEnemyLevels()}catch(e){}},0);
 return result;
};

const style=document.createElement('style');style.textContent=`
.v2422-enemy-level{display:inline-block;margin-left:4px;padding:0 3px;border:1px solid #8d4f42;border-radius:3px;background:#2c120e;color:#f0b4a5;font-size:8px;line-height:1.35}
`;
document.head.appendChild(style);
})();
