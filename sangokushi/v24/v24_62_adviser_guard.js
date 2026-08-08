// v24.62 — adviser synchronization guard; never changes city ownership/selection
(()=>{
if(window.V2462_ADVISER_GUARD)return;window.V2462_ADVISER_GUARD=true;
function own(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.status!=='捕虜')}
function ruler(){return state?.rulerName||own().find(o=>o.status==='君主')?.name||'佐々木久美'}
function sync(){
 if(!state)return null;state.advisers=state.advisers||{};
 let name=state.advisers['日向軍']||state.strategistName||state.adviserName||state.advisorName||own().find(o=>o.status==='軍師')?.name||null;
 let o=own().find(x=>x.name===name&&x.name!==ruler());
 if(!o){o=own().filter(x=>x.name!==ruler()&&x.status!=='君主').sort((a,b)=>(Number(b.int)||0)-(Number(a.int)||0))[0]||null;name=o?.name||null}
 if(name){state.advisers['日向軍']=name;state.strategistName=name;state.adviserName=name;state.advisorName=name;own().forEach(x=>{if(x.name===name)x.status='軍師';else if(x.status==='軍師')x.status='一般'})}
 return o;
}
const prevRender=window.render;window.render=function(){sync();return prevRender.apply(this,arguments)};
const prevBegin=window.beginGame;window.beginGame=function(){const r=prevBegin.apply(this,arguments);sync();return r};
function selfTest(){const a={officers:[{name:'君主',force:'日向軍',status:'君主',int:80},{name:'軍師候補',force:'日向軍',status:'一般',int:95}],advisers:{},rulerName:'君主'};return a.officers.length===2}
window.V2462={sync,selfTest};
})();
