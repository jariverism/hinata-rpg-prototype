// v24.12 — fog of war, center-experience minimum stats, and 200-officer roster migration
(()=>{
const CENTER_BOOSTS={
 '小坂菜緒':{war:91,reason:'走力順位を優先'},
 '佐々木美玲':{war:90,reason:'走力順位を優先'},
 '金村美玖':{war:90,reason:'走力順位を優先'},
 '正源司陽子':{int:90,reason:'学力順位を優先'},
 '藤嶌果歩':{war:90,reason:'走力順位を優先'},
 '佐々木久美':{int:90,reason:'学力順位を優先'},
 '齊藤京子':{war:90,reason:'学力順位より走力順位が上位'},
 '加藤史帆':{war:96,reason:'走力順位を優先'},
 '丹生明里':{war:90,reason:'走力順位を優先'},
 '上村ひなの':{war:90,reason:'学力順位より走力順位が上位'},
 '大野愛実':{int:90,reason:'学力順位を優先'}
};
window.HINATA_CENTER_BOOSTS=CENTER_BOOSTS;

function applyCenterBoosts(){
 Object.entries(CENTER_BOOSTS).forEach(([name,b])=>{
  if(b.war!=null&&window.HINATA_WAR)window.HINATA_WAR[name]=Math.max(Number(window.HINATA_WAR[name])||0,b.war);
  if(b.int!=null&&window.HINATA_INTELLIGENCE)window.HINATA_INTELLIGENCE[name]=Math.max(Number(window.HINATA_INTELLIGENCE[name])||0,b.int);
 });
 if(typeof HINATA_START!=='undefined')HINATA_START.forEach(o=>{
  const b=CENTER_BOOSTS[o.name];if(!b)return;
  if(b.war!=null)o.war=Math.max(Number(o.war)||0,b.war);
  if(b.int!=null)o.int=Math.max(Number(o.int)||0,b.int);
 });
 if(typeof state!=='undefined'&&state?.officers)state.officers.forEach(o=>{
  const b=CENTER_BOOSTS[o.name];if(!b)return;
  if(b.war!=null)o.war=Math.max(Number(o.war)||0,b.war);
  if(b.int!=null)o.int=Math.max(Number(o.int)||0,b.int);
  if(b.war>=90&&o.apt!=='弩兵')o.apt='騎兵';
 });
}

function leastLoadedCity(force){
 const cities=Object.values(state.cities).filter(c=>c.force===force);
 if(!cities.length)return null;
 return cities.sort((a,b)=>{
  const ac=state.officers.filter(o=>o.force===force&&o.city===a.name&&o.status!=='死亡').length;
  const bc=state.officers.filter(o=>o.force===force&&o.city===b.name&&o.status!=='死亡').length;
  return ac-bc||a.name.localeCompare(b.name,'ja');
 })[0].name;
}
function ensureExpandedRoster(){
 if(typeof state==='undefined'||!state?.officers)return;
 const extras=window.EXTRA_HISTORICAL_OFFICERS||[];
 const known=new Set(state.officers.map(o=>o.name));
 let added=0;
 extras.forEach(src=>{
  if(known.has(src.name))return;
  const city=leastLoadedCity(src.force);if(!city)return;
  state.officers.push({...src,city,loy:rnd(70,96),status:'一般',acted:0,apt:src.war>=90?'騎兵':src.int>=90?'弩兵':'歩兵'});
  known.add(src.name);added++;
 });
 if(state.historicalRosterVersion!==112){
  const extraNames=new Set(extras.map(o=>o.name));
  Object.keys(typeof FORCES!=='undefined'?FORCES:{}).forEach(force=>{
   const cities=Object.values(state.cities).filter(c=>c.force===force).sort((a,b)=>a.name.localeCompare(b.name,'ja'));
   if(!cities.length)return;
   const counts=Object.fromEntries(cities.map(c=>[c.name,state.officers.filter(o=>o.force===force&&o.city===c.name&&!extraNames.has(o.name)&&o.status!=='死亡').length]));
   state.officers.filter(o=>o.force===force&&extraNames.has(o.name)&&o.status!=='死亡').forEach(o=>{
    const city=cities.slice().sort((a,b)=>(counts[a.name]||0)-(counts[b.name]||0)||a.name.localeCompare(b.name,'ja'))[0];
    o.city=city.name;counts[city.name]=(counts[city.name]||0)+1;
   });
  });
  state.historicalRosterVersion=112;
  if(typeof log==='function')log(`三国志武将録を拡張し、日向坂以外の武将を約200名体制にしました。${added?`旧セーブへ${added}名を追加しました。`:''}`);
 }
}

function intelLevel(cityName){
 const r=state?.spyIntel?.[cityName];
 return r&&r.expires>=state.turn?(Number(r.level)||0):0;
}
function maskEnemyTroops(){
 if(typeof state==='undefined'||!state||state.battle)return;
 document.querySelectorAll('.map-city[data-city]').forEach(btn=>{
  const c=state.cities[btn.dataset.city];
  if(!c||!c.force||c.force==='日向軍'||intelLevel(c.name)>=1)return;
  const small=btn.querySelector('small');if(small)small.textContent=`${c.force} 兵力不明`;
 });
 const selected=state.cities[state.selected];
 if(!selected||!selected.force||selected.force==='日向軍'||intelLevel(selected.name)>=1)return;
 const panel=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('.title')?.textContent.trim()===`${state.selected} 都市情報`);
 if(!panel)return;
 panel.querySelectorAll('.metric').forEach(m=>{
  const b=m.querySelector('b');if(!b)return;
  const label=[...m.childNodes].filter(n=>n!==b).map(n=>n.textContent).join('').trim();
  if(label==='兵士')b.textContent='不明';
 });
}

applyCenterBoosts();
const oldRender=window.render;
window.render=function(){
 applyCenterBoosts();ensureExpandedRoster();
 const result=oldRender();
 setTimeout(()=>{applyCenterBoosts();maskEnemyTroops()},0);
 return result;
};
const oldBegin=window.beginGame;
window.beginGame=function(){
 applyCenterBoosts();oldBegin();applyCenterBoosts();ensureExpandedRoster();window.render();
};
setTimeout(()=>{
 try{
  applyCenterBoosts();
  if(typeof state!=='undefined'&&state){ensureExpandedRoster();window.render()}
  else if(typeof startScreen==='function')startScreen();
 }catch(e){console.warn('v24.12 patch:',e)}
},0);
})();
