// v24.14 — rebalance non-Hinata officers to the SFC Romance of the Three Kingdoms IV scale
(()=>{
const EXACT={
 '曹操':[99,88,92,97,98],'曹昂':[57,64,50,49,61],'曹丕':[78,75,84,80,77],'曹仁':[79,83,61,58,68],'曹豹':[17,67,15,16,13],'臧覇':[44,77,44,33,72],
 '夏侯惇':[94,96,62,56,78],'夏侯淵':[90,92,57,56,78],'夏侯覇':[83,89,68,72,73],'夏侯玄':[31,33,75,94,76],'夏侯尚':[69,65,67,54,64],
 '郭嘉':[42,27,99,92,89],'賈詡':[75,30,96,93,67],'郭図':[39,33,71,82,40],'郭淮':[79,72,67,65,54],'郝昭':[87,84,83,80,84],
 '于禁':[77,74,51,48,60],'楽進':[68,79,44,32,75],'典韋':[74,97,33,20,56],'荀攸':[78,53,87,88,80],'田豊':[84,44,92,82,74],
 '劉備':[60,72,76,85,99],'関羽':[100,98,82,65,96],'張飛':[79,99,39,22,39],'趙雲':[96,98,85,80,95],
 '諸葛亮':[97,55,100,96,96],'徐庶':[87,67,96,88,84],'姜維':[89,91,95,86,85],'関興':[85,86,70,50,72],
 '張苞':[80,90,40,37,55],'張翼':[79,73,61,55,69],'趙累':[51,56,70,64,74],'廖化':[61,63,60,47,65],'董允':[67,18,85,87,70],
 '孫堅':[95,92,83,68,91],'孫策':[95,93,85,69,92],'孫権':[85,82,87,73,97],'周瑜':[97,78,98,89,97],'陸遜':[96,79,97,87,95],
 '呂蒙':[92,85,90,62,87],'魯粛':[80,57,92,70,90],'程普':[58,44,80,66,71],'丁奉':[68,80,64,72,71],'凌統':[70,81,58,56,62],
 '朱桓':[81,83,77,67,81],'祖茂':[60,70,62,58,83],'呂範':[26,30,71,76,74],
 '呂布':[78,100,30,13,40],'華雄':[86,89,27,29,44],'張遼':[91,90,82,69,85],'陳宮':[83,59,84,85,67],
 '袁術':[78,63,67,61,55],'沮授':[78,53,87,88,80],'韓遂':[71,69,63,66,75],'梁興':[59,71,18,22,56],
 '劉表':[70,65,69,74,68],'蒯越':[29,31,79,85,63],'蒯良':[41,31,85,82,64],
 '馬騰':[88,93,54,46,87],'張魯':[77,69,81,67,91],'盧植':[86,66,82,70,83],
 '司馬懿':[98,61,99,91,81],'陳羣':[71,48,91,90,74],'鍾会':[84,73,95,87,78],'鄧艾':[93,85,93,81,75]
};

// The previous 200-officer expansion generated almost every officer inside elite ranges.
// For officers without a verified individual row above, retain their archetype but compress
// the values to the much wider distribution seen in the ROTK IV database.
function compress(v,key){
 const n=Math.max(1,Math.min(100,Number(v)||50));
 const cfg={lead:[7,.76],war:[5,.79],int:[7,.77],pol:[7,.77],cha:[5,.79]}[key];
 return Math.max(12,Math.min(94,Math.round(cfg[0]+n*cfg[1])));
}
function converted(o){
 const e=EXACT[o.name];
 if(e)return {lead:e[0],war:e[1],int:e[2],pol:e[3],cha:e[4],exact:true};
 return {
  lead:compress(o.lead,'lead'),war:compress(o.war,'war'),int:compress(o.int,'int'),
  pol:compress(o.pol,'pol'),cha:compress(o.cha,'cha'),exact:false
 };
}

const source=new Map();
if(typeof HIST!=='undefined')HIST.forEach(o=>{if(!source.has(o.name))source.set(o.name,{...o})});
(window.EXTRA_HISTORICAL_OFFICERS||[]).forEach(o=>{if(!source.has(o.name))source.set(o.name,{...o})});
const CALIBRATED={};source.forEach((o,n)=>CALIBRATED[n]=converted(o));
window.ROTK4_HISTORICAL_STATS=CALIBRATED;

function setStats(o){
 const s=CALIBRATED[o.name];if(!s)return;
 o.lead=s.lead;o.war=s.war;o.int=s.int;o.pol=s.pol;o.cha=s.cha;
 if(o.int>=90&&o.war<80)o.apt='弩兵';
 else if(o.war>=90)o.apt='騎兵';
 else if(o.war>=80)o.apt='槍兵';
 else o.apt='歩兵';
}
function applyTables(){
 if(typeof HIST!=='undefined')HIST.forEach(setStats);
 (window.EXTRA_HISTORICAL_OFFICERS||[]).forEach(setStats);
}
function applyState(){
 if(typeof state==='undefined'||!state?.officers)return;
 state.officers.forEach(setStats);
 if(state.historicalStatVersion!==114){
  state.historicalStatVersion=114;
  if(typeof log==='function')log('三國志IV武将一覧の能力尺度に合わせ、日向坂以外の武将能力を再調整した。');
 }
}

applyTables();
const oldRender=window.render;
window.render=function(){applyTables();applyState();return oldRender()};
const oldBegin=window.beginGame;
window.beginGame=function(){applyTables();oldBegin();applyTables();applyState();window.render()};
setTimeout(()=>{
 try{
  applyTables();
  if(typeof state!=='undefined'&&state){applyState();window.render()}
  else if(typeof startScreen==='function')startScreen();
 }catch(e){console.warn('v24.14 historical stat patch:',e)}
},0);
})();
