// v24.55 — make every Hinata-controlled city selectable after conquest/defense
(()=>{
if(window.V2455_CITY_SELECT_FIX)return;window.V2455_CITY_SELECT_FIX=true;
let selecting=false;
function selectCity(name){
 if(selecting||!state?.cities?.[name])return;
 selecting=true;
 try{
  state.selected=name;
  // A city selection is valid regardless of where the ruler/main army currently is.
  // Do not let recovery helpers redirect a valid Hinata city back to the newest conquest.
  if(typeof window.render==='function')window.render();
 }finally{selecting=false}
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-city]');if(!btn)return;
 const name=btn.dataset.city;if(!name||!state?.cities?.[name])return;
 e.preventDefault();e.stopImmediatePropagation();selectCity(name);
},true);
document.addEventListener('touchend',e=>{
 const btn=e.target.closest?.('[data-city]');if(!btn)return;
 btn.style.pointerEvents='auto';btn.style.touchAction='manipulation';
},{passive:true,capture:true});
function reinforce(){
 document.querySelectorAll('[data-city]').forEach(btn=>{btn.disabled=false;btn.style.pointerEvents='auto';btn.style.touchAction='manipulation'});
}
const prevRender=window.render;
window.render=function(){const r=prevRender.apply(this,arguments);reinforce();setTimeout(reinforce,0);return r};
setTimeout(reinforce,0);
window.V2455={selectCity};
})();
