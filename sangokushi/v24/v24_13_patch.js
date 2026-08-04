// v24.13 — stagger center bonuses and strengthen the two captains
(()=>{
const CENTER_VALUES={
 '加藤史帆':{war:96},
 '齊藤京子':{war:95},
 '佐々木美玲':{war:94},
 '小坂菜緒':{war:93},
 '金村美玖':{war:92},
 '上村ひなの':{war:91},
 '丹生明里':{war:90},
 '藤嶌果歩':{war:91},
 '正源司陽子':{int:92},
 '大野愛実':{int:90}
};
const LEAD_VALUES={'佐々木久美':98,'髙橋未来虹':95};
const KUMI_INT=85;
window.HINATA_CENTER_VALUES_V113=CENTER_VALUES;
window.HINATA_LEAD_VALUES_V113=LEAD_VALUES;

function configureSourceTables(){
 // v24.12 keeps a mutable reference to this object. Replacing its entries
 // prevents the former uniform minimum-90 rule from being applied again.
 const boosts=window.HINATA_CENTER_BOOSTS;
 if(boosts){
  Object.keys(boosts).forEach(name=>delete boosts[name]);
  Object.entries(CENTER_VALUES).forEach(([name,v])=>boosts[name]={...v,reason:v.war?'走力・センター実績による段階評価':'学力・センター実績による段階評価'});
 }
 if(window.HINATA_WAR){
  Object.entries(CENTER_VALUES).forEach(([name,v])=>{if(v.war!=null)window.HINATA_WAR[name]=v.war});
 }
 if(window.HINATA_INTELLIGENCE){
  window.HINATA_INTELLIGENCE['佐々木久美']=KUMI_INT;
  Object.entries(CENTER_VALUES).forEach(([name,v])=>{if(v.int!=null)window.HINATA_INTELLIGENCE[name]=v.int});
 }
 if(typeof HINATA_START!=='undefined')HINATA_START.forEach(o=>{
  const v=CENTER_VALUES[o.name];
  if(v?.war!=null)o.war=v.war;
  if(v?.int!=null)o.int=v.int;
  if(o.name==='佐々木久美')o.int=KUMI_INT;
  if(LEAD_VALUES[o.name]!=null)o.lead=LEAD_VALUES[o.name];
 });
}
function applyToState(){
 if(typeof state==='undefined'||!state?.officers)return;
 state.officers.forEach(o=>{
  const v=CENTER_VALUES[o.name];
  if(v?.war!=null)o.war=v.war;
  if(v?.int!=null)o.int=v.int;
  if(o.name==='佐々木久美')o.int=KUMI_INT;
  if(LEAD_VALUES[o.name]!=null)o.lead=LEAD_VALUES[o.name];
  if(v?.war>=90&&o.apt!=='弩兵')o.apt='騎兵';
 });
 if(state.centerBalanceVersion!==113){
  state.centerBalanceVersion=113;
  if(typeof log==='function')log('センター経験者の能力保証を90～96に段階化し、佐々木久美・髙橋未来虹の統率を強化した。');
 }
}
configureSourceTables();
const oldRender=window.render;
window.render=function(){configureSourceTables();applyToState();return oldRender()};
const oldBegin=window.beginGame;
window.beginGame=function(){configureSourceTables();oldBegin();configureSourceTables();applyToState();window.render()};
setTimeout(()=>{
 try{
  configureSourceTables();
  if(typeof state!=='undefined'&&state){applyToState();window.render()}
  else if(typeof startScreen==='function')startScreen();
 }catch(e){console.warn('v24.13 patch:',e)}
},0);
})();
