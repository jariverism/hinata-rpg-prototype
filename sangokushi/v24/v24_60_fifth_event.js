// v24.60 — fifth-generation gathering event; never changes city ownership or selection
(()=>{
if(window.V2460_FIFTH_EVENT)return;window.V2460_FIFTH_EVENT=true;
function fifthNames(){return window.V2458?.FIFTH?.map(x=>x.name)||[]}
function check(){
 if(!state||state.modeId!=='mikuni'||state.v2460FifthGathered)return false;
 const names=fifthNames();if(names.length!==10)return false;
 const members=names.map(n=>state.officers?.find(o=>o.name===n));
 if(members.some(o=>!o||o.force!=='日向軍'))return false;
 members.forEach(o=>o.loy=Math.min(100,(Number(o.loy)||0)+10));
 Object.values(state.cities||{}).filter(c=>c.force==='日向軍').forEach(c=>c.morale=Math.min(100,(Number(c.morale)||0)+8));
 state.v2460FifthGathered=true;
 if(typeof log==='function')log('五期生10人が日向軍に集結した！ 五期生の忠誠が上がり、全支配都市の士気が上昇した。');
 return true;
}
const prevEndMonth=window.endMonth;
if(typeof prevEndMonth==='function')window.endMonth=function(){const r=prevEndMonth.apply(this,arguments);check();return r};
const prevRender=window.render;
window.render=function(){const fired=check();const r=prevRender.apply(this,arguments);if(fired)setTimeout(()=>{try{if(typeof window.render==='function'&&!state?.battle){} }catch(e){}},0);return r};
setTimeout(()=>{try{check()}catch(e){console.error('v24.60 fifth event:',e)}},0);
window.V2460={check};
})();
