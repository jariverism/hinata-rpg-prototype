// v24.50 — robust delegated click handling for iPhone Safari, including domestic stratagems
(()=>{
if(window.V2446_CLICKFIX)return;window.V2446_CLICKFIX=true;
let routing=false;
function closest(el,sel){return el&&el.closest?el.closest(sel):null}
function invokeDirect(el){
 if(!el||typeof el.onclick!=='function')return false;
 try{routing=true;el.onclick.call(el,new MouseEvent('click',{bubbles:false,cancelable:true}));return true}catch(e){console.error('v24.50 direct click:',e);return false}finally{routing=false}
}
function route(e){
 if(routing)return;
 const t=e.target;
 const scenario=closest(t,'[data-v2443-scenario]');
 if(scenario){
  e.preventDefault();e.stopImmediatePropagation();
  if(invokeDirect(scenario))return;
  window.V2443_SELECTED_SCENARIO=scenario.dataset.v2443Scenario;
  try{if(typeof window.startScreen==='function')window.startScreen()}catch(err){console.error('v24.50 scenario:',err)}
  return;
 }
 const begin=closest(t,'#begin');
 if(begin){
  e.preventDefault();e.stopImmediatePropagation();
  if(invokeDirect(begin))return;
  try{if(typeof window.beginGame==='function')window.beginGame()}catch(err){console.error('v24.50 begin:',err)}
  return;
 }
 const start=closest(t,'[data-start]');
 if(start&&!start.disabled){
  e.preventDefault();e.stopImmediatePropagation();
  if(invokeDirect(start))return;
 }
 const cmd=closest(t,'[data-cmd]');
 if(cmd&&!cmd.disabled){
  e.preventDefault();e.stopImmediatePropagation();
  if(invokeDirect(cmd))return;
  try{
   // Domestic stratagem was attached with addEventListener rather than onclick,
   // so the delegated iOS handler must route it to its real entry point.
   if(cmd.dataset.cmd==='stratagem'&&typeof window.v243Stratagem==='function'){
    window.v243Stratagem();return;
   }
   if(typeof window.command==='function')window.command(cmd.dataset.cmd);
  }catch(err){console.error('v24.50 command:',err)}
  return;
 }
 const city=closest(t,'[data-city]');
 if(city&&!city.disabled){
  if(typeof city.onclick==='function')return;
  e.preventDefault();e.stopImmediatePropagation();
  try{if(window.state){state.selected=city.dataset.city;if(typeof window.render==='function')window.render()}}catch(err){console.error('v24.50 city:',err)}
 }
}
document.addEventListener('click',route,true);
document.addEventListener('touchend',e=>{
 const el=closest(e.target,'[data-v2443-scenario],#begin,[data-start],[data-cmd]');
 if(!el)return;
 el.style.touchAction='manipulation';
},{passive:true,capture:true});
function reinforce(){
 document.querySelectorAll('[data-v2443-scenario],#begin,[data-start],[data-cmd]').forEach(el=>{
  el.style.pointerEvents='auto';el.style.touchAction='manipulation';
 });
}
const prevRender=window.render;
window.render=function(){const r=prevRender.apply(this,arguments);reinforce();setTimeout(reinforce,0);return r};
const prevStart=window.startScreen;
window.startScreen=function(){const r=prevStart.apply(this,arguments);reinforce();setTimeout(reinforce,0);return r};
reinforce();
})();
