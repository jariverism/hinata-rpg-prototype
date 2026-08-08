// v24.53 — defensive victory must not trigger retreat/ownership side effects elsewhere
(()=>{
if(window.V2453_DEFENSE_GUARD)return;window.V2453_DEFENSE_GUARD=true;
const previousEndBattle=window.endBattle;
window.endBattle=function(win,retreat){
 const b=state?.battle;
 if(!b?.defense||!win)return previousEndBattle.apply(this,arguments);
 const target=b.target;
 const snapshot={};
 Object.values(state.cities||{}).forEach(c=>snapshot[c.name]={force:c.force,troops:Number(c.troops)||0,morale:Number(c.morale)||0});
 const result=previousEndBattle.apply(this,arguments);
 // A successful defense may change only the defended city and the attacker's source troop count.
 for(const c of Object.values(state.cities||{})){
  if(c.name===target||c.name===b.enemySource)continue;
  const before=snapshot[c.name];if(!before)continue;
  if(c.force!==before.force){
   c.force=before.force;c.troops=before.troops;c.morale=before.morale;
   if(typeof log==='function')log(`防衛勝利後の誤った都市所属変更を修正：${c.name}の支配を元に戻した。`);
  }
 }
 return result;
};
})();
