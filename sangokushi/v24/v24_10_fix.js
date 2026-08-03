// v24.10 compatibility fix — guarantee succession after any ruler disposition
(()=>{
const baseEnd=window.endBattle;
window.endBattle=function(win,retreat){
 if(win&&state?.battle){
  const force=state.cities[state.battle.target]?.force;
  state.officers.filter(o=>o.force===force&&o.city===state.battle.target&&o.status!=='死亡').forEach(o=>{
   o.defeatedForce=force;
   if(o.status==='君主')o.wasRuler=true;
  });
 }
 return baseEnd(win,retreat);
};
function ensureSuccession(){
 if(!state?.officers||!state?.cities)return;
 const affected=[...new Set(state.officers.filter(o=>o.wasRuler&&o.defeatedForce&&o.force!==o.defeatedForce).map(o=>o.defeatedForce))];
 affected.forEach(force=>{
  const hasCity=Object.values(state.cities).some(c=>c.force===force);
  if(!hasCity)return;
  const ruler=state.officers.find(o=>o.force===force&&o.status==='君主');
  if(ruler)return;
  const candidates=state.officers.filter(o=>o.force===force&&!['死亡','捕虜','敗将'].includes(o.status));
  if(candidates.length){
   const next=candidates.sort((a,b)=>(b.lead+b.cha*.5+b.int*.25)-(a.lead+a.cha*.5+a.int*.25))[0];
   next.status='君主';
   log(`${force}軍は${next.name}を新君主に擁立した。`);
  }else{
   Object.values(state.cities).forEach(c=>{if(c.force===force){c.force=null;c.troops=0}});
   log(`${force}軍は後継者を失い、滅亡した。`);
  }
 });
}
const baseRender=window.render;
window.render=function(){ensureSuccession();return baseRender()};
})();
