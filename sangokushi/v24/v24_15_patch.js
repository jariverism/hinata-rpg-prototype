// v24.15 — selectable historical scenarios with different force layouts and rosters
(()=>{
if(typeof FORCES!=='undefined'){
 FORCES['孫策']=FORCES['孫策']||{color:'#9b6331'};
 FORCES['孫権']=FORCES['孫権']||{color:'#a26a31'};
 FORCES['劉璋']=FORCES['劉璋']||{color:'#856248'};
}

const SCENARIOS={
 '190':{
  id:'190',year:190,month:1,title:'群雄割拠',subtitle:'ハッピーオーラの旗揚げ',rank:'標準',start:'建寧',
  desc:'董卓が洛陽を押さえ、各地の群雄が並び立つ。小勢力と空白都市が多く、自由に伸びやすい。',
  owners:{...START_OWNERS},remap:{},rulers:{董卓:'董卓',曹操:'曹操',劉備:'劉備',孫堅:'孫堅',袁紹:'袁紹',袁術:'袁術',公孫瓚:'公孫瓚',陶謙:'陶謙',孔融:'孔融',劉表:'劉表',劉焉:'劉焉',馬騰:'馬騰',韓遂:'韓遂',張魯:'張魯'},
  capitals:{董卓:'洛陽',曹操:'陳留',劉備:'小沛',孫堅:'建業',袁紹:'南皮',袁術:'寿春',公孫瓚:'北平',陶謙:'徐州',孔融:'北海',劉表:'襄陽',劉焉:'成都',馬騰:'武威',韓遂:'西平',張魯:'漢中'},
  inactive:[],player:{gold:1600,food:22000,troops:5000,morale:75},enemyScale:1
 },
 '200':{
  id:'200',year:200,month:1,title:'官渡前夜',subtitle:'二強の狭間',rank:'やや難',start:'桂陽',
  desc:'河北の袁紹と中原の曹操が激突寸前。江東では孫策が急伸し、劉備は汝南に再起を図る。',
  owners:{北平:'袁紹',薊:'袁紹',南皮:'袁紹',平原:'袁紹',鄴:'袁紹',晋陽:'袁紹',上党:'袁紹',北海:'曹操',濮陽:'曹操',陳留:'曹操',許昌:'曹操',洛陽:'曹操',弘農:'曹操',宛:'曹操',徐州:'曹操',下邳:'曹操',小沛:'曹操',汝南:'劉備',寿春:'孫策',廬江:'孫策',建業:'孫策',呉:'孫策',会稽:'孫策',柴桑:'孫策',江夏:'劉表',襄陽:'劉表',新野:'劉表',江陵:'劉表',武陵:'劉表',長沙:'劉表',長安:'馬騰',安定:'馬騰',天水:'馬騰',武威:'馬騰',西平:'韓遂',漢中:'張魯',梓潼:'劉璋',成都:'劉璋',江州:'劉璋',永安:'劉璋',建寧:'劉璋'},
  remap:{董卓:'曹操',袁術:'孫策',孫堅:'孫策',公孫瓚:'袁紹',陶謙:'曹操',孔融:'曹操',劉焉:'劉璋'},
  rulers:{曹操:'曹操',袁紹:'袁紹',劉備:'劉備',孫策:'孫策',劉表:'劉表',劉璋:'劉璋',馬騰:'馬騰',韓遂:'韓遂',張魯:'張魯'},
  capitals:{曹操:'許昌',袁紹:'鄴',劉備:'汝南',孫策:'建業',劉表:'襄陽',劉璋:'成都',馬騰:'武威',韓遂:'西平',張魯:'漢中'},
  inactive:['董卓','孫堅','陶謙','公孫瓚','劉焉','袁術'],player:{gold:1800,food:24000,troops:5500,morale:76},enemyScale:1.12
 },
 '208':{
  id:'208',year:208,month:7,title:'赤壁前夜',subtitle:'天下を覆う曹操',rank:'難',start:'武陵',
  desc:'曹操は河北と荊州北部を制圧。江東の孫権と、江夏に逃れた劉備が決戦を迎える。',
  owners:{北平:'曹操',薊:'曹操',南皮:'曹操',平原:'曹操',北海:'曹操',鄴:'曹操',晋陽:'曹操',上党:'曹操',濮陽:'曹操',陳留:'曹操',許昌:'曹操',洛陽:'曹操',弘農:'曹操',宛:'曹操',汝南:'曹操',徐州:'曹操',下邳:'曹操',小沛:'曹操',寿春:'曹操',長安:'曹操',襄陽:'曹操',新野:'曹操',江陵:'曹操',江夏:'劉備',廬江:'孫権',建業:'孫権',呉:'孫権',会稽:'孫権',柴桑:'孫権',安定:'馬騰',天水:'馬騰',武威:'馬騰',西平:'韓遂',漢中:'張魯',梓潼:'劉璋',成都:'劉璋',江州:'劉璋',永安:'劉璋',建寧:'劉璋'},
  remap:{董卓:'曹操',袁術:'曹操',袁紹:'曹操',公孫瓚:'曹操',陶謙:'曹操',孔融:'曹操',劉表:'曹操',孫堅:'孫権',劉焉:'劉璋'},
  rulers:{曹操:'曹操',劉備:'劉備',孫権:'孫権',劉璋:'劉璋',馬騰:'馬騰',韓遂:'韓遂',張魯:'張魯'},
  capitals:{曹操:'許昌',劉備:'江夏',孫権:'建業',劉璋:'成都',馬騰:'武威',韓遂:'西平',張魯:'漢中'},
  inactive:['董卓','孫堅','陶謙','公孫瓚','劉焉','袁術','袁紹','孫策','劉表','呂布','郭嘉'],player:{gold:2100,food:27000,troops:6200,morale:78},enemyScale:1.28
 },
 '219':{
  id:'219',year:219,month:1,title:'荊州争奪',subtitle:'三雄鼎立',rank:'最難',start:'雲南',
  desc:'曹操・劉備・孫権の三勢力が大陸を分ける。小勢力は消え、巨大国家の圧力に耐える必要がある。',
  owners:{北平:'曹操',薊:'曹操',南皮:'曹操',平原:'曹操',北海:'曹操',鄴:'曹操',晋陽:'曹操',上党:'曹操',濮陽:'曹操',陳留:'曹操',許昌:'曹操',洛陽:'曹操',弘農:'曹操',宛:'曹操',汝南:'曹操',徐州:'曹操',下邳:'曹操',小沛:'曹操',寿春:'曹操',長安:'曹操',安定:'曹操',天水:'曹操',武威:'曹操',襄陽:'曹操',新野:'曹操',漢中:'劉備',梓潼:'劉備',成都:'劉備',江州:'劉備',永安:'劉備',建寧:'劉備',江陵:'劉備',廬江:'孫権',建業:'孫権',呉:'孫権',会稽:'孫権',柴桑:'孫権',江夏:'孫権',武陵:'孫権',長沙:'孫権',桂陽:'孫権',零陵:'孫権'},
  remap:{董卓:'曹操',袁術:'曹操',袁紹:'曹操',公孫瓚:'曹操',陶謙:'曹操',孔融:'曹操',劉表:'曹操',馬騰:'曹操',韓遂:'曹操',張魯:'曹操',孫堅:'孫権',劉焉:'劉備'},
  rulers:{曹操:'曹操',劉備:'劉備',孫権:'孫権'},capitals:{曹操:'許昌',劉備:'成都',孫権:'建業'},
  inactive:['董卓','孫堅','陶謙','公孫瓚','劉焉','袁術','袁紹','孫策','劉表','呂布','郭嘉','周瑜','魯粛','龐統','馬騰','韓遂'],player:{gold:2500,food:32000,troops:7200,morale:80},enemyScale:1.42
 }
};
window.HINATA_SCENARIOS=SCENARIOS;
let chosenScenario='190';
const scenarioStarts=Object.fromEntries(Object.values(SCENARIOS).map(s=>[s.id,s.start]));
const oldBegin=window.beginGame;
const oldRender=window.render;

function hashText(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function previewCities(sc){
 const cs=buildCities();Object.values(cs).forEach(c=>c.force=null);
 Object.entries(sc.owners).forEach(([name,force])=>{if(cs[name])cs[name].force=force});
 return cs;
}
function diffFor(city,sc,cs){
 const c=cs[city],pressure=c.n.filter(n=>cs[n].force).length;
 const era={190:0,200:1,208:2,219:3}[sc.id]||0;
 return Math.max(1,Math.min(6,1+pressure+era));
}
function startFace(name){return typeof v241FaceHtml==='function'?v241FaceHtml(name):`<span class="face">${name[0]}</span>`}
function applyStartFaces(){if(typeof v241ApplyFace==='function')document.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face))}

window.startScreen=function(){
 const sc=SCENARIOS[chosenScenario]||SCENARIOS['190'];
 if(!scenarioStarts[sc.id])scenarioStarts[sc.id]=sc.start;
 startCity=scenarioStarts[sc.id];
 const cs=previewCities(sc),empties=Object.values(cs).filter(c=>!c.force);
 if(!cs[startCity]||cs[startCity].force)startCity=(empties[0]||Object.values(cs)[0]).name;
 scenarioStarts[sc.id]=startCity;
 app.innerHTML=`<div class="scenario-shell"><section class="panel scenario-picker"><div class="title">シナリオ選択</div><div class="scenario-grid">${Object.values(SCENARIOS).map(s=>`<button class="scenario-card ${s.id===sc.id?'selected':''}" data-scenario="${s.id}"><b>${s.year}年　${s.title}</b><span>${s.subtitle}</span><small>${s.desc}</small><em>${s.rank}</em></button>`).join('')}</div></section><div class="start"><section class="panel intro"><div class="title">${sc.year}年・${sc.title}</div><h2>${sc.subtitle}</h2><p>${sc.desc}</p><p>空白都市を一つ選び、日向軍を旗揚げしてください。後期シナリオほど敵国が巨大になります。</p><div class="title">初期武将</div>${HINATA_START.map(o=>`<div class="officer">${startFace(o.name)}<div><b>${o.name}</b><small> 統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}</small></div></div>`).join('')}<p>選択都市：<b id="startName">${startCity}</b><span class="difficulty">${'★'.repeat(diffFor(startCity,sc,cs))}</span></p><button id="begin" class="primary">このシナリオで旗揚げ</button></section><section class="panel"><div class="title">${sc.year}年・開始都市選択</div><div class="city-select-map">${roadHtml(cs)}${Object.values(cs).map(c=>`<button class="start-city ${c.force?'occupied':'empty'} ${c.name===startCity?'sel':''}" data-start="${c.name}" ${c.force?'disabled':''} style="left:${c.x}%;top:${c.y}%">${c.name}${c.force?`<small>${c.force}</small>`:''}</button>`).join('')}</div><p><small>色付きの都市は既存勢力の領土です。空白都市だけを開始地点に選べます。</small></p></section></div></div>`;
 document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{chosenScenario=b.dataset.scenario;startCity=scenarioStarts[chosenScenario]||SCENARIOS[chosenScenario].start;window.startScreen()});
 document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{startCity=b.dataset.start;scenarioStarts[sc.id]=startCity;window.startScreen()});
 document.getElementById('begin').onclick=window.beginGame;
 applyStartFaces();
};

function activeForces(sc){return [...new Set(Object.values(sc.owners))]}
function distributeOfficer(o,sc){
 const cities=Object.values(state.cities).filter(c=>c.force===o.force);
 if(!cities.length){o.force='在野';o.status='在野';const pool=Object.values(state.cities).filter(c=>c.force!=='日向軍');o.city=pool.length?pool[hashText(`${sc.id}:${o.name}`)%pool.length].name:startCity;return}
 const capital=sc.capitals[o.force];
 if(sc.rulers[o.force]===o.name&&capital&&state.cities[capital]?.force===o.force)o.city=capital;
 else o.city=cities[hashText(`${sc.id}:${o.name}`)%cities.length].name;
}
function applyScenario(sc){
 state.scenarioId=sc.id;state.scenarioName=`${sc.year}年・${sc.title}`;state.year=sc.year;state.month=sc.month;state.turn=1;state.over=false;state.battle=null;
 Object.values(state.cities).forEach(c=>{c.force=null;c.troops=Math.max(500,Math.round(c.troops*(.72+sc.enemyScale*.22)));c.morale=Math.max(45,Math.min(88,c.morale))});
 Object.entries(sc.owners).forEach(([name,force])=>{const c=state.cities[name];if(c){c.force=force;c.troops=Math.max(2800,Math.round(c.troops*sc.enemyScale))}});
 const home=state.cities[startCity];home.force='日向軍';home.gold=sc.player.gold;home.food=sc.player.food;home.troops=sc.player.troops;home.morale=sc.player.morale;
 const inactive=new Set(sc.inactive||[]),forces=new Set(activeForces(sc));
 state.officers.forEach(o=>{
  if(o.force==='日向軍'){o.city=startCity;o.status=o.name==='佐々木久美'?'君主':'一般';o.acted=0;return}
  if(inactive.has(o.name)){o.force='死亡';o.status='死亡';o.city=null;o.troops=0;return}
  if(o.force==='死亡')return;
  if(o.force==='在野'){o.status='在野';o.acted=0;distributeOfficer(o,sc);return}
  o.force=sc.remap[o.force]||o.force;
  if(!forces.has(o.force)){o.force='在野';o.status='在野'}else o.status='一般';
  o.acted=0;distributeOfficer(o,sc);
 });
 Object.entries(sc.rulers).forEach(([force,name])=>{
  const ruler=state.officers.find(o=>o.name===name&&o.force===force&&o.status!=='死亡');
  if(ruler){state.officers.filter(o=>o.force===force&&o.status==='君主').forEach(o=>o.status='一般');ruler.status='君主';ruler.city=sc.capitals[force]||ruler.city}
 });
 Object.values(state.cities).forEach(c=>{
  if(!c.force||c.force==='日向軍')return;
  const count=state.officers.filter(o=>o.force===c.force&&o.city===c.name&&o.status!=='死亡').length;
  c.troops=Math.max(c.troops,2600+count*650);
 });
 const fs=activeForces(sc);state.relations=Object.fromEntries(fs.map(f=>[f,rnd(-25,10)]));state.alliances={};state.prisoners=[];state.spyIntel={};state.recruitAttempts={};state.logs=[];state.selected=startCity;
 log(`${sc.title}シナリオ開始。${startCity}に日向軍が旗揚げした。`);
}

window.beginGame=function(){
 const sc=SCENARIOS[chosenScenario]||SCENARIOS['190'];
 startCity=scenarioStarts[sc.id]||sc.start;
 oldBegin();
 applyScenario(sc);
 window.render();
};

window.render=function(){
 const result=oldRender();
 setTimeout(()=>{
  if(!state||state.battle||!state.scenarioName)return;
  const p=[...document.querySelectorAll('.panel')].find(x=>x.querySelector('.title')?.textContent.trim()==='日向軍');
  if(p&&!p.querySelector('.scenario-badge'))p.insertAdjacentHTML('beforeend',`<div class="scenario-badge">${state.scenarioName}</div>`);
 },0);
 return result;
};

const style=document.createElement('style');style.textContent=`
.scenario-shell{display:grid;gap:14px}.scenario-picker{padding-bottom:14px}.scenario-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.scenario-card{position:relative;display:flex;min-height:145px;flex-direction:column;align-items:flex-start;text-align:left;padding:12px;border:1px solid #5f4930;background:linear-gradient(#21180e,#15100a);color:#dfcda8}.scenario-card b{font-size:15px;color:#f0d78e}.scenario-card span{margin:4px 0 8px;color:#d59e53;font-weight:700}.scenario-card small{line-height:1.5;color:#bfae91}.scenario-card em{position:absolute;right:8px;bottom:7px;font-style:normal;font-size:11px;color:#dfb764}.scenario-card.selected{border-color:#e2b858;box-shadow:0 0 0 2px #6f5220 inset;background:linear-gradient(#37250d,#1a1208)}.intro h2{margin:8px 0;color:#e6bd68}.scenario-badge{margin-top:7px;padding:5px 8px;border:1px solid #735a31;background:#1d160d;color:#d8bd84;font-size:11px;text-align:center}
@media(max-width:900px){.scenario-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:540px){.scenario-grid{grid-template-columns:1fr}.scenario-card{min-height:112px}}
`;document.head.appendChild(style);

setTimeout(()=>{if(typeof state==='undefined'||!state)window.startScreen()},0);
})();
