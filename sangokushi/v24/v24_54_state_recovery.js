// v24.54 — recover playable state after erroneous defense/retreat flags
(()=>{
if(window.V2454_STATE_RECOVERY)return;window.V2454_STATE_RECOVERY=true;
function activeOfficer(o){return o&&o.force==='日向軍'&&!['死亡','捕虜','敗将'].includes(o.status)}
function ownCities(){return Object.values(state?.cities||{}).filter(c=>c.force==='日向軍')}
function preferredCity(){
 const own=ownCities();if(!own.length)return null;
 const ruler=(state?.officers||[]).find(o=>activeOfficer(o)&&o.status==='君主'&&state.cities?.[o.city]?.force==='日向軍');
 if(ruler)return state.cities[ruler.city];
 const staffed=own.find(c=>(state.officers||[]).some(o=>activeOfficer(o)&&o.city===c.name));
 return staffed||own[0];
}
function repairPlayableState(){
 if(typeof state==='undefined'||!state||state.battle)return false;
 const own=ownCities();if(!own.length)return false;
 let changed=false;
 // Old defense code could set defeat flags even while another Hinata city still survived.
 if(state.aiDefeated===true){state.aiDefeated=false;changed=true}
 if(state.over===true){state.over=false;changed=true}
 const selected=state.cities?.[state.selected];
 if(!selected||selected.force!=='日向軍'){
  const next=preferredCity();if(next){state.selected=next.name;changed=true}
 }
 if(changed&&typeof log==='function'){
  const key=`${state.turn}:${state.selected}`;
  if(state.v2454RecoveryLog!==key){state.v2454RecoveryLog=key;log(`支配都市が残っているため、敗北状態を解除して${state.selected}から指揮を再開した。`)}
 }
 return changed;
}
const previousRender=window.render;
window.render=function(){repairPlayableState();return previousRender.apply(this,arguments)};
const previousEndBattle=window.endBattle;
window.endBattle=function(){
 const result=previousEndBattle.apply(this,arguments);
 setTimeout(()=>{try{if(repairPlayableState()&&typeof window.render==='function')window.render()}catch(e){console.error('v24.54 recovery:',e)}},0);
 return result;
};
// Old saves are repaired as soon as they are loaded/rendered.
setTimeout(()=>{try{if(typeof state!=='undefined'&&state&&repairPlayableState()&&typeof window.render==='function')window.render()}catch(e){}},0);
window.V2454={repairPlayableState,preferredCity};
})();
