// v24.56 — restore canonical city control and preserve home-city nonparticipants
(()=>{
if(window.V2456_CITY_CORE_FIX)return;window.V2456_CITY_CORE_FIX=true;

function activeOwn(o){return o&&o.force==='日向軍'&&!['死亡','捕虜','敗将'].includes(o.status)}
function ownCityNames(){return Object.values(state?.cities||{}).filter(c=>c.force==='日向軍').map(c=>c.name)}

// Repair only truly broken legacy state. Never redirect a valid selected city.
function repairLegacyState(){
 if(!state||state.battle)return false;
 const own=ownCityNames();if(!own.length)return false;
 let changed=false;
 if(state.over===true){state.over=false;changed=true}
 if(state.aiDefeated===true){state.aiDefeated=false;changed=true}
 if(!state.cities?.[state.selected]){state.selected=own[0];changed=true}
 return changed;
}

// Snapshot officers who remain behind before an offensive battle begins.
const previousBeginBattle=window.beginBattle;
if(typeof previousBeginBattle==='function'){
 window.beginBattle=function(src,target,units){
  const participantNames=new Set((units||[]).filter(u=>u.side==='player'||!u.side).map(u=>u.name));
  const stayers=(state?.officers||[]).filter(o=>activeOwn(o)&&o.city===src&&!participantNames.has(o.name)).map(o=>({
   name:o.name,city:o.city,acted:o.acted,status:o.status,force:o.force,loy:o.loy
  }));
  const result=previousBeginBattle.apply(this,arguments);
  if(state?.battle){state.battle.v2456HomeSnapshot={src,target,stayers,participants:[...participantNames]}}
  return result;
 };
}

// Whatever later battle patches do, officers who did not march must remain at the source city.
const previousEndBattle=window.endBattle;
window.endBattle=function(win,retreat){
 const b=state?.battle;
 const snap=b?.v2456HomeSnapshot?JSON.parse(JSON.stringify(b.v2456HomeSnapshot)):null;
 const result=previousEndBattle.apply(this,arguments);
 if(snap&&state?.officers){
  for(const s of snap.stayers||[]){
   const o=state.officers.find(x=>x.name===s.name&&x.force==='日向軍');if(!o)continue;
   o.city=s.src||s.city;o.acted=s.acted;o.status=s.status||o.status;o.loy=s.loy??o.loy;
  }
 }
 repairLegacyState();
 return result;
};

// Use exactly the original game's city-selection rule: choose the clicked city and redraw.
// This intentionally does NOT require a ruler, an officer, or an unspent action in that city.
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.map-city[data-city]');if(!btn||!state||state.battle)return;
 const name=btn.dataset.city;if(!name||!state.cities?.[name])return;
 e.preventDefault();e.stopImmediatePropagation();
 state.selected=name;
 window.render();
},true);

function reinforceCityControls(){
 document.querySelectorAll('.map-city[data-city]').forEach(btn=>{
  btn.disabled=false;btn.style.pointerEvents='auto';btn.style.touchAction='manipulation';
 });
}
const previousRender=window.render;
window.render=function(){
 repairLegacyState();
 const result=previousRender.apply(this,arguments);
 reinforceCityControls();setTimeout(reinforceCityControls,0);
 return result;
};

setTimeout(()=>{try{if(state&&repairLegacyState())window.render();else reinforceCityControls()}catch(e){console.error('v24.56 city repair:',e)}},0);
window.V2456_CITY={repairLegacyState};
})();
