// v24.21 — uncapped damage EXP and final-blow defeat EXP
(()=>{
const previousBattleAction=window.battleAction;
const previousEndBattle=window.endBattle;
const previousRender=window.render;
const KILL_EXP=40;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function ownOfficer(name){
 const o=state?.officers?.find(x=>x.name===name);
 return o&&o.force==='日向軍'&&o.status!=='死亡'?o:null;
}
function leadershipCeiling(o){return Math.round(5000+clamp(Number(o?.lead)||0,0,100)*150)}
function levelCapacity(o){return 3000+Math.max(1,Number(o?.level)||1)*1000}
function commandCapacity(o){return Math.min(leadershipCeiling(o),levelCapacity(o))}
function nextExp(o){return 100+Math.max(1,Number(o?.level)||1)*50}
function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function officersInCity(city){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.city===city&&activeOfficer(o))}
function cityCommandCapacity(city){return 1500+officersInCity(city).reduce((sum,o)=>sum+commandCapacity(o),0)}

function addSupplementExp(o,amount,reason){
 amount=Math.max(0,Math.floor(Number(amount)||0));
 if(!o||!amount)return;
 o.level=clamp(Math.floor(Number(o.level)||1),1,30);
 o.exp=Math.max(0,Math.floor(Number(o.exp)||0))+amount;
 if(typeof log==='function')log(`${o.name}が${reason}で追加経験値${amount}を獲得した。`);
 while(o.level<30&&o.exp>=nextExp(o)){
  const need=nextExp(o),before=commandCapacity(o);
  o.exp-=need;o.level++;
  const after=commandCapacity(o),increase=Math.max(0,after-before),city=state.cities?.[o.city];
  if(city&&city.force==='日向軍'&&increase>0){
   const room=Math.max(0,cityCommandCapacity(o.city)-city.troops),reinforce=Math.min(increase,room);
   city.troops+=reinforce;
   if(typeof log==='function')log(`${o.name}がLv${o.level}へ上昇。指揮上限${before.toLocaleString()}→${after.toLocaleString()}、歴戦兵${reinforce.toLocaleString()}が加わった。`);
  }else if(typeof log==='function'){
   log(`${o.name}がLv${o.level}へ上昇。指揮上限${before.toLocaleString()}→${after.toLocaleString()}。`);
  }
 }
}

function initialiseSnapshot(b){
 if(!b?.units)return;
 b._v2421Snapshot=b.units.map(u=>u.side==='enemy'?Math.max(0,Number(u.troops)||0):null);
 b._v2421Damage=b._v2421Damage||{};
 b._v2421Kills=b._v2421Kills||{};
}
function trackEnemyLosses(b){
 if(!b?.units)return;
 if(!Array.isArray(b._v2421Snapshot)||b._v2421Snapshot.length!==b.units.length){initialiseSnapshot(b);return}
 const actor=b._v2421LastActor||b.selected;
 b.units.forEach((u,i)=>{
  if(u.side!=='enemy')return;
  const before=Math.max(0,Number(b._v2421Snapshot[i])||0),after=Math.max(0,Number(u.troops)||0);
  if(before>after&&actor&&ownOfficer(actor)){
   b._v2421Damage[actor]=(b._v2421Damage[actor]||0)+(before-after);
   if(before>0&&after===0){
    b._v2421Kills[actor]=(b._v2421Kills[actor]||0)+1;
    if(Array.isArray(b.logs))b.logs.unshift(`${actor}隊が${u.name}隊を撃破！ 撃破経験値${KILL_EXP}を獲得予定。`);
   }
  }
  b._v2421Snapshot[i]=after;
 });
}
function awardSupplement(b){
 if(!b||b._v2421SupplementAwarded)return;
 trackEnemyLosses(b);b._v2421SupplementAwarded=true;
 const names=[...new Set(b.units.filter(u=>u.side==='player'&&ownOfficer(u.name)).map(u=>u.name))];
 names.forEach(name=>{
  const damage=Math.max(0,Number(b._v2421Damage?.[name])||0);
  const kills=Math.max(0,Number(b._v2421Kills?.[name])||0);
  const fullDamageExp=Math.floor(damage/100);
  const uncappedExcess=Math.max(0,fullDamageExp-80);
  const killBonus=kills*KILL_EXP;
  const extra=uncappedExcess+killBonus;
  if(extra)addSupplementExp(ownOfficer(name),extra,`${damage.toLocaleString()}与ダメージ・${kills}隊撃破`);
 });
}

window.battleAction=function(action){
 const b=state?.battle;
 if(b){
  trackEnemyLosses(b);
  if(['attack','fire','special'].includes(action))b._v2421LastActor=b.selected;
 }
 const result=previousBattleAction.apply(this,arguments);
 if(b)trackEnemyLosses(b);
 return result;
};
window.endBattle=function(){
 const b=state?.battle;if(b)awardSupplement(b);
 return previousEndBattle.apply(this,arguments);
};
window.render=function(){
 if(state?.battle)trackEnemyLosses(state.battle);
 return previousRender.apply(this,arguments);
};

setTimeout(()=>{try{if(state?.battle)initialiseSnapshot(state.battle)}catch(e){}},0);
})();