// v24.73 — graduated anti-snowball strategic pressure without changing city ownership
(()=>{
if(window.V2473_PRESSURE)return;window.V2473_PRESSURE=true;
const previousEndMonth=window.endMonth;
function tierFor(n){return n>=11?3:n>=7?2:n>=4?1:0}
function ownCount(){return Object.values(state?.cities||{}).filter(c=>c.force==='日向軍').length}
function adjacentEnemyForces(){
 const set=new Set();for(const c of Object.values(state?.cities||{}).filter(c=>c.force==='日向軍'))for(const n of c.n||[]){const f=state.cities?.[n]?.force;if(f&&f!=='日向軍')set.add(f)}return [...set];
}
function announce(text){if(typeof log==='function')log(text);else{state.logs=state.logs||[];state.logs.unshift(text)}}
function preparePressure(){
 if(!state||state.battle)return 0;const tier=tierFor(ownCount()),old=Number(state.v2473PressureTier)||0;state.v2473PressureTier=tier;
 if(tier!==old){
  const msg=tier===0?'日向軍への諸侯の特別警戒が解かれた。':tier===1?'日向軍が4城以上を支配。周辺諸侯が警戒態勢に入った。':tier===2?'日向軍が7城以上を支配。諸侯が包囲網を強め、共同侵攻の準備を始めた。':'日向軍が11城以上を支配。主要勢力が天下分け目の決戦態勢に入った。';announce(msg);
  const cap=tier===1?-25:tier===2?-50:tier===3?-70:100;for(const f of adjacentEnemyForces())if(tier>0)state.relations[f]=Math.min(Number(state.relations?.[f])||0,cap);
 }
 if(tier>=2){
  const active=(Number(state.aiCoalitionUntil)||0)>=Number(state.turn),next=Number(state.v2473NextCoalition)||0;
  if(!active&&next<=Number(state.turn)){
   const duration=tier===3?12:6;state.aiCoalitionUntil=Number(state.turn)+duration;state.v2473NextCoalition=Number(state.turn)+(tier===3?18:16);
   for(const f of adjacentEnemyForces())state.relations[f]=Math.min(Number(state.relations?.[f])||0,tier===3?-70:-50);
   announce(tier===3?'決戦包囲網が発動。敵勢力は12か月、増援と侵攻を最大化する。':'対日向包囲網が発動。敵勢力は6か月、増援と共同侵攻を強める。');
  }
 }
 return tier;
}
function consolidateFronts(tier){
 if(!state||state.battle||tier<=0)return 0;let moved=0;const rate=tier===1?.08:tier===2?.14:.20,cap=tier===1?1200:tier===2?2200:3200;
 const forces=[...new Set(Object.values(state.cities||{}).map(c=>c.force).filter(f=>f&&f!=='日向軍'))];
 for(const force of forces){
  const fronts=Object.values(state.cities).filter(c=>c.force===force&&(c.n||[]).some(n=>state.cities[n]?.force==='日向軍')).sort((a,b)=>a.troops-b.troops);if(!fronts.length)continue;
  const front=fronts[0],donors=Object.values(state.cities).filter(c=>c.force===force&&c.name!==front.name&&c.troops>Math.max(3000,front.troops+1800)).sort((a,b)=>b.troops-a.troops);if(!donors.length)continue;
  const donor=donors[0],send=Math.min(cap,Math.floor(donor.troops*rate),Math.max(0,Math.floor(donor.troops-1800)));if(send<400)continue;
  donor.troops-=send;front.troops+=send;front.morale=Math.min(100,Number(front.morale||65)+(tier>=3?3:1));moved+=send;
  if(tier>=2||send>=800)announce(`${force}軍が後方の${donor.name}から国境の${front.name}へ${send.toLocaleString()}の援軍を集中。`);
 }
 return moved;
}
window.endMonth=function(){
 if(!state)return previousEndMonth.apply(this,arguments);const tier=preparePressure();const r=previousEndMonth.apply(this,arguments);try{consolidateFronts(tier)}catch(e){console.error('v24.73 pressure:',e)}return r;
};
window.V2473={tierFor,ownCount,adjacentEnemyForces,preparePressure,consolidateFronts};
})();
