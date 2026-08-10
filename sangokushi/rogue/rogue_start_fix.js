// ROGUE 0.3 — selected start city must be the only initial Hinata city
(()=>{
if(window.HINATA_ROGUE_START_FIX)return;window.HINATA_ROGUE_START_FIX=true;
let chosen=null,template=null;
const THIRD=new Set(['髙橋未来虹','上村ひなの','森本茉莉','山口陽世']);
function snapshotTemplate(){
 try{return typeof buildCities==='function'?buildCities():null}catch(e){return null}
}
function restoreCity(name){
 const dst=state?.cities?.[name],src=template?.[name];if(!dst)return;
 if(src){
  const keep={name:dst.name,x:dst.x,y:dst.y,n:dst.n};
  Object.assign(dst,src,keep);
 }else{
  dst.force=null;dst.gold=Math.min(Number(dst.gold)||900,1600);dst.food=Math.min(Number(dst.food)||9000,22000);
  dst.troops=Math.min(Number(dst.troops)||1200,2400);dst.morale=Math.min(Number(dst.morale)||60,82);
 }
}
function repair(city=chosen||state?.rogue?.startCity){
 if(!state?.rogue||!city||!state.cities?.[city])return false;
 chosen=city;
 // At the beginning of a ROGUE run there must be exactly one Hinata-controlled city.
 // If the base campaign booted in 建寧 first, restore that phantom city to its pre-run state.
 if(Number(state.turn||1)<=1){
  for(const [name,c] of Object.entries(state.cities)){
   if(name!==city&&c.force==='日向軍')restoreCity(name);
  }
 }
 const home=state.cities[city];
 home.force='日向軍';
 if(Number(state.turn||1)<=1){
  const bonus=(()=>{try{return window.HINATA_ROGUE_RULES?.metaBonuses?.(state.rogue?.meta?.total||0)||{gold:0,troops:0}}catch(e){return{gold:0,troops:0}}})();
  home.gold=Math.max(Number(home.gold)||0,1800+(bonus.gold||0));
  home.food=Math.max(Number(home.food)||0,22000);
  home.troops=Math.max(Number(home.troops)||0,5200+(bonus.troops||0));
  home.morale=Math.max(Number(home.morale)||0,78);
  for(const o of state.officers||[]){
   if(THIRD.has(o.name)&&o.force==='日向軍')o.city=city;
  }
 }
 state.selected=city;state.rogue.startCity=city;
 return true;
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-rogue-start]');if(!btn)return;
 chosen=btn.dataset.rogueStart;template=snapshotTemplate();
 setTimeout(()=>{try{if(repair(chosen)&&typeof render==='function')render()}catch(err){console.error('ROGUE start repair:',err)}},0);
},true);
// Rescue saves created by Prototype 0.1/0.2 where the chosen start was recorded but 建寧 remained the only owned city.
const prevRender=window.render;
window.render=function(){
 if(state?.rogue&&!state.battle&&Number(state.turn||1)<=1){
  const intended=state.rogue.startCity;
  if(intended&&state.cities?.[intended]?.force!=='日向軍'){
   template=template||snapshotTemplate();repair(intended);
  }
 }
 return prevRender.apply(this,arguments);
};
window.HINATA_ROGUE_START_FIX_API={repair,getChosen:()=>chosen};
})();
