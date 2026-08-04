// v24.17 compatibility — migrate active battle units from 歩兵 to 剣盾兵
(()=>{
function migrateBattleTypes(){
 try{
  if(typeof state==='undefined'||!state?.battle?.units)return;
  state.battle.units.forEach(u=>{
   if(u.type==='歩兵'||!u.type&&u.apt==='歩兵')u.type='剣盾兵';
   if(u.apt==='歩兵')u.apt='剣盾兵';
  });
 }catch(e){}
}
const oldRender=window.render;
window.render=function(){migrateBattleTypes();const result=oldRender();setTimeout(migrateBattleTypes,0);return result};
migrateBattleTypes();
})();
