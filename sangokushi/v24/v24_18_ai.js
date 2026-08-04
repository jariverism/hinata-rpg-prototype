// v24.18 — strategic enemy AI: mobilisation, invasions, recruitment and anti-snowball pressure
(()=>{
const previousEndMonth=window.endMonth;
const previousRender=window.render;
const HINATA_NAMES=new Set();
try{(HINATA_START||[]).forEach(o=>HINATA_NAMES.add(o.name))}catch(e){}
try{(HINATA_WORLD||[]).forEach(x=>HINATA_NAMES.add(x[0]))}catch(e){}

function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function enemyForces(){
 return [...new Set(Object.values(state.cities||{}).map(c=>c.force).filter(f=>f&&f!=='日向軍'))];
}
function citiesOf(force){return Object.values(state.cities||{}).filter(c=>c.force===force)}
function officersOf(force,city=null){
 return (state.officers||[]).filter(o=>o.force===force&&o.status!=='死亡'&&o.status!=='捕虜'&&(!city||o.city===city));
}
function bestOfficer(force,city,stat){
 return officersOf(force,city).sort((a,b)=>(Number(b[stat])||0)-(Number(a[stat])||0))[0]||
        officersOf(force).sort((a,b)=>(Number(b[stat])||0)-(Number(a[stat])||0))[0]||
        {lead:50,war:50,int:50,pol:50,cha:50,name:'守備隊'};
}
function knownIntel(city){
 const r=state.spyIntel?.[city];
 return r&&r.expires>=state.turn?(Number(r.level)||0):0;
}
function isAllied(a,b){
 if(!a||!b||a===b)return true;
 if(a==='日向軍')return (state.alliances?.[b]||0)>=state.turn;
 if(b==='日向軍')return (state.alliances?.[a]||0)>=state.turn;
 return false;
}
function graphDistance(from,to){
 if(from===to)return 0;
 const q=[[from,0]],seen=new Set([from]);
 while(q.length){
  const [n,d]=q.shift();
  for(const nx of state.cities[n]?.n||[]){
   if(nx===to)return d+1;
   if(!seen.has(nx)){seen.add(nx);q.push([nx,d+1])}
  }
 }
 return 99;
}
function nearestCity(from,predicate){
 return Object.values(state.cities).filter(predicate)
   .sort((a,b)=>graphDistance(from,a.name)-graphDistance(from,b.name)||a.name.localeCompare(b.name,'ja'))[0]||null;
}
function frontier(city){
 return (city.n||[]).some(n=>state.cities[n]?.force&&state.cities[n].force!==city.force);
}
function visibleEvent(city){
 return !city||city.force==='日向軍'||knownIntel(city.name)>=1||
   (city.n||[]).some(n=>state.cities[n]?.force==='日向軍');
}
function addNews(text,important=false){
 state.aiNews=state.aiNews||[];
 state.aiNews.unshift({turn:state.turn,text,important});
 state.aiNews=state.aiNews.slice(0,12);
 if(typeof log==='function')log(text);
}
function eraMultiplier(){
 const id=String(state.scenarioId||state.scenario?.id||state.scenario||'190');
 return ({190:1,200:1.08,208:1.18,219:1.28})[id]||1;
}
function coalitionActive(){return (state.aiCoalitionUntil||0)>=state.turn}

function ensureAI(){
 state.aiThreats=Array.isArray(state.aiThreats)?state.aiThreats:[];
 state.aiTemptations=state.aiTemptations||{};
 state.aiNews=Array.isArray(state.aiNews)?state.aiNews:[];
 state.aiForceReports=state.aiForceReports||{};
 state.relations=state.relations||{};
 state.alliances=state.alliances||{};
 enemyForces().forEach(f=>{if(state.relations[f]==null)state.relations[f]=rand(-20,20)});
}

function relocateDefeatedOfficers(oldForce,cityName){
 const refuge=nearestCity(cityName,c=>c.force===oldForce);
 (state.officers||[]).filter(o=>o.force===oldForce&&o.city===cityName&&o.status!=='死亡').forEach(o=>{
  if(refuge){o.city=refuge.name}
  else{o.force='在野';o.status='在野';o.loy=45;o.city=cityName}
 });
}
function moveCapturingOfficers(force,from,to,count=2){
 const candidates=officersOf(force,from).filter(o=>o.status!=='君主')
   .sort((a,b)=>(Number(b.lead)||0)-(Number(a.lead)||0));
 candidates.slice(0,count).forEach(o=>o.city=to);
}
function playerCityLost(cityName,force){
 const refuge=nearestCity(cityName,c=>c.force==='日向軍');
 (state.officers||[]).filter(o=>o.force==='日向軍'&&o.city===cityName&&o.status!=='死亡').forEach(o=>{
  if(refuge)o.city=refuge.name;
  else{o.status='捕虜';o.captor=force}
 });
 if(refuge)state.selected=refuge.name;
 else{
  state.aiDefeated=true;state.over=true;state.selected=cityName;
 }
}

function battlePowers(force,src,target,commit){
 const atkLead=bestOfficer(force,src.name,'lead'),atkWar=bestOfficer(force,src.name,'war');
 const defForce=target.force,defLead=bestOfficer(defForce,target.name,'lead');
 const atk=commit*(.72+(Number(atkLead.lead)||50)/190+(Number(atkWar.war)||50)/280)*
   clamp((Number(src.morale)||65)/80,.65,1.25)*(rand(88,112)/100);
 const def=(Number(target.troops)||0)*(.82+(Number(defLead.lead)||50)/175+(Number(target.wall)||50)/260)*
   clamp((Number(target.morale)||65)/80,.65,1.25)*(rand(90,110)/100);
 return {atk,def,atkLead,atkWar,defLead};
}
function resolveInvasion(threat){
 const src=state.cities[threat.from],target=state.cities[threat.to];
 if(!src||!target||src.force!==threat.force||target.force!=='日向軍'){
  addNews(`${threat.force}軍の${threat.to}侵攻計画は情勢の変化により中止された。`);
  return;
 }
 const commit=Math.max(0,Math.min(Math.floor(src.troops*.58),src.troops-1200));
 if(commit<1200){
  addNews(`${threat.force}軍は兵力不足のため${target.name}侵攻を断念した。`);
  return;
 }
 src.troops-=commit;
 const p=battlePowers(threat.force,src,target,commit),share=p.atk/(p.atk+p.def);
 const atkLoss=Math.min(commit,Math.floor(commit*(.18+(1-share)*.58)*rand(88,112)/100));
 const defLoss=Math.min(target.troops,Math.floor(target.troops*(.20+share*.70)*rand(88,112)/100));
 const atkRemain=Math.max(0,commit-atkLoss),defRemain=Math.max(0,target.troops-defLoss);
 target.troops=defRemain;
 const captured=atkRemain>=800&&(defRemain<=350||(share>=.62&&defRemain<900));
 if(captured){
  target.force=threat.force;target.troops=atkRemain;target.morale=Math.max(40,src.morale-8);
  moveCapturingOfficers(threat.force,src.name,target.name,Math.min(3,officersOf(threat.force,src.name).length));
  playerCityLost(target.name,threat.force);
  addNews(`敵襲！ ${threat.force}軍が${target.name}を攻略した。守備兵は${defLoss}、敵軍は${atkLoss}の損害。`,true);
 }else{
  src.troops+=atkRemain;
  target.morale=Math.min(100,target.morale+4);
  addNews(`${target.name}防衛成功。${threat.force}軍に${atkLoss}、日向軍に${defLoss}の損害。`,true);
 }
}
function processThreats(){
 const later=[];
 for(const t of state.aiThreats){
  if((t.due||0)<=state.turn)resolveInvasion(t);else later.push(t);
 }
 state.aiThreats=later;
}

function resolveAiWar(attacker,src,target){
 const oldForce=target.force;
 const commit=Math.max(0,Math.min(Math.floor(src.troops*.52),src.troops-1400));
 if(commit<1500)return false;
 src.troops-=commit;
 const p=battlePowers(attacker,src,target,commit),share=p.atk/(p.atk+p.def);
 const atkLoss=Math.min(commit,Math.floor(commit*(.20+(1-share)*.55)*rand(90,110)/100));
 const defLoss=Math.min(target.troops,Math.floor(target.troops*(.18+share*.68)*rand(90,110)/100));
 const atkRemain=commit-atkLoss,defRemain=Math.max(0,target.troops-defLoss);
 target.troops=defRemain;
 const captured=atkRemain>=800&&(defRemain<=300||(share>.64&&defRemain<800));
 if(captured){
  target.force=attacker;target.troops=atkRemain;target.morale=Math.max(42,src.morale-7);
  relocateDefeatedOfficers(oldForce,target.name);
  moveCapturingOfficers(attacker,src.name,target.name,2);
  addNews(`${attacker}軍が${oldForce}軍の${target.name}を攻略。勢力図が動いた。`,true);
 }else{
  src.troops+=Math.max(0,atkRemain);
  if(visibleEvent(src)||visibleEvent(target))addNews(`${attacker}軍が${target.name}へ侵攻したが、${oldForce}軍が撃退した。`);
 }
 return true;
}
function aiVsAiWars(){
 if(Math.random()>.52)return;
 const options=[];
 for(const f of enemyForces()){
  for(const src of citiesOf(f)){
   for(const n of src.n||[]){
    const t=state.cities[n];
    if(!t?.force||t.force===f||t.force==='日向軍'||isAllied(f,t.force))continue;
    const ratio=src.troops/Math.max(800,t.troops);
    if(src.troops>4200&&ratio>1.22)options.push({f,src,t,score:ratio+citiesOf(f).length*.03});
   }
  }
 }
 if(!options.length)return;
 const x=options.sort((a,b)=>b.score-a.score)[0];
 if(Math.random()<clamp(.22+(x.score-1.2)*.18,.18,.58))resolveAiWar(x.f,x.src,x.t);
}

function enemyGrowth(){
 const reports={};
 const late=1+Math.min(.85,Math.max(0,state.turn-1)/72);
 const era=eraMultiplier(),coal=coalitionActive()?1.28:1;
 for(const f of enemyForces()){
  let recruited=0;
  for(const c of citiesOf(f)){
   const pol=bestOfficer(f,c.name,'pol'),cha=bestOfficer(f,c.name,'cha');
   c.gold+=Math.floor(c.commerce*1.15+c.pop*12);
   c.food+=Math.floor(c.farm*1.8+c.pop*45);
   const front=frontier(c);
   let amount=Math.floor((170+c.pop*30+(Number(pol.pol)||50)*2.2+(Number(cha.cha)||50)*1.5+(front?300:0))*late*era*coal);
   amount=clamp(amount,250,2400);
   const cap=15000+c.pop*1150+state.turn*170+(front?4500:0);
   amount=Math.min(amount,Math.max(0,cap-c.troops));
   const goldCost=Math.ceil(amount*.055),foodCost=Math.ceil(amount*.11);
   if(amount>=100&&c.gold>=goldCost&&c.food>=foodCost){
    c.gold-=goldCost;c.food-=foodCost;c.troops+=amount;c.morale=Math.min(100,c.morale+rand(1,3));recruited+=amount;
   }
  }
  reports[f]={turn:state.turn,recruited};
 }
 state.aiForceReports=reports;
}
function reinforceFrontiers(){
 for(const f of enemyForces()){
  const front=citiesOf(f).filter(frontier).sort((a,b)=>a.troops-b.troops)[0];
  if(!front)continue;
  const donor=(front.n||[]).map(n=>state.cities[n]).filter(c=>c?.force===f&&c.troops>front.troops+3500)
   .sort((a,b)=>b.troops-a.troops)[0];
  if(!donor)continue;
  const send=Math.min(Math.floor(donor.troops*.25),Math.floor((donor.troops-front.troops)/2));
  if(send<700)continue;
  donor.troops-=send;front.troops+=send;
  if(visibleEvent(front))addNews(`${f}軍が${front.name}へ援軍を送り、国境守備を増強している。`);
 }
}

function enemyRecruitWild(){
 for(const f of enemyForces()){
  if(Math.random()>.22)continue;
  const local=(state.officers||[]).filter(o=>o.force==='在野'&&o.status!=='死亡'&&state.cities[o.city]?.force===f);
  if(!local.length)continue;
  const ruler=bestOfficer(f,null,'cha');
  const target=local.sort((a,b)=>(b.cha||0)-(a.cha||0))[0];
  const chance=clamp(18+(Number(ruler.cha)||50)*.45,25,65);
  if(Math.random()*100<chance){
   target.force=f;target.status='一般';target.loy=rand(62,78);
   if(visibleEvent(state.cities[target.city])||target.discovered!==false)addNews(`${f}軍が在野の${target.name}を登用した。`);
  }
 }
}

function processTemptations(){
 for(const [name,x] of Object.entries({...state.aiTemptations})){
  if((x.due||0)>state.turn)continue;
  delete state.aiTemptations[name];
  const target=(state.officers||[]).find(o=>o.name===name);
  if(!target||target.force!=='日向軍'||target.status==='君主'||target.status==='死亡')continue;
  if((Number(target.loy)||0)>=85){
   addNews(`${target.name}への${x.force}軍の誘いは、厚い待遇により退けられた。`);
   continue;
  }
  const recruiter=bestOfficer(x.force,null,'cha');
  let chance=4+(80-(Number(target.loy)||70))*1.55+((Number(recruiter.cha)||70)-70)*.35;
  if(HINATA_NAMES.has(target.name))chance-=8;
  chance=clamp(Math.round(chance),3,48);
  if(Math.random()*100<chance){
   const dest=nearestCity(target.city,c=>c.force===x.force);
   if(!dest)continue;
   target.force=x.force;target.city=dest.name;target.status='一般';target.loy=rand(64,78);
   addNews(`離反！ ${target.name}が${x.force}軍の登用に応じ、${dest.name}へ去った。`,true);
  }else{
   target.loy=Math.min(100,(Number(target.loy)||70)+1);
   addNews(`${target.name}は${x.force}軍の登用工作を拒絶した。`);
  }
 }
}
function scheduleTemptation(){
 if(state.turn%2!==0||Object.keys(state.aiTemptations).length)return;
 const candidates=(state.officers||[]).filter(o=>o.force==='日向軍'&&o.status!=='君主'&&o.status!=='死亡'&&(Number(o.loy)||100)<=82);
 if(!candidates.length||Math.random()>.48)return;
 const forces=enemyForces().filter(f=>citiesOf(f).length);
 if(!forces.length)return;
 const force=forces.sort((a,b)=>(bestOfficer(b,null,'cha').cha||0)-(bestOfficer(a,null,'cha').cha||0))[0];
 const target=candidates.sort((a,b)=>(Number(a.loy)||0)-(Number(b.loy)||0))[0];
 state.aiTemptations[target.name]={force,due:state.turn+1};
 addNews(`密報：${force}軍の使者が${target.name}へ接触している。次月までに忠誠を高めなければ離反のおそれがある。`,true);
}

function manageCoalition(){
 const total=Object.keys(state.cities).length,owned=Object.values(state.cities).filter(c=>c.force==='日向軍').length;
 const share=owned/Math.max(1,total);
 if(share>=.30&&(state.aiCoalitionCooldown||0)<state.turn&&!coalitionActive()){
  state.aiCoalitionUntil=state.turn+12;state.aiCoalitionCooldown=state.turn+30;
  enemyForces().forEach(f=>state.relations[f]=Math.min(Number(state.relations[f])||0,-60));
  addNews('日向軍の急拡大を警戒し、諸侯が「日向包囲網」を結成した。今後12か月、敵の増兵と侵攻が激化する。',true);
 }
}
function annualMobilisation(){
 if(state.month!==1||state.aiLastMobilisationYear===state.year)return;
 state.aiLastMobilisationYear=state.year;
 const ranked=enemyForces().sort((a,b)=>citiesOf(b).length-citiesOf(a).length).slice(0,2);
 ranked.forEach((f,idx)=>{
  let total=0;
  citiesOf(f).filter(frontier).forEach(c=>{
   const add=rand(1000,2200)+(idx===0?500:0);c.troops+=add;c.morale=Math.min(100,c.morale+5);total+=add;
  });
  officersOf(f).forEach(o=>o.loy=Math.min(100,(Number(o.loy)||70)+3));
  if(total)addNews(`${f}軍が年初の大動員を発令し、国境へ${total.toLocaleString()}の兵を増派した。`,true);
 });
}

function schedulePlayerThreats(){
 if(state.aiThreats.length>=2)return;
 const options=[];
 for(const f of enemyForces()){
  if(isAllied(f,'日向軍'))continue;
  for(const src of citiesOf(f)){
   for(const n of src.n||[]){
    const target=state.cities[n];if(target?.force!=='日向軍')continue;
    if(state.aiThreats.some(t=>t.to===target.name))continue;
    const ratio=src.troops/Math.max(900,target.troops);
    const rel=Number(state.relations[f])||0;
    const score=ratio+citiesOf(f).length*.025+(-rel)/250+(coalitionActive()?.55:0)+Math.min(.25,state.turn/100);
    if(src.troops>3500&&ratio>.82)options.push({f,src,target,ratio,score});
   }
  }
 }
 options.sort((a,b)=>b.score-a.score);
 const max=coalitionActive()?2:1;
 for(const x of options.slice(0,4)){
  if(state.aiThreats.length>=max)break;
  const chance=clamp(.24+(x.ratio-.8)*.22+(coalitionActive()?.20:0)+Math.min(.12,state.turn/120),.18,.72);
  if(Math.random()>chance)continue;
  state.aiThreats.push({force:x.f,from:x.src.name,to:x.target.name,due:state.turn+1});
  const known=knownIntel(x.src.name)>=1?`（推定兵力${Math.round(x.src.troops/100)*100}）`:'';
  addNews(`敵襲予報：${x.f}軍が${x.src.name}で${x.target.name}侵攻の準備を開始${known}。次月までに守備を整える必要がある。`,true);
 }
}

function runStrategicAI(){
 if(!state||state.battle||state.v2418AiLastTurn===state.turn)return;
 ensureAI();state.v2418AiLastTurn=state.turn;
 processThreats();
 processTemptations();
 manageCoalition();
 enemyGrowth();
 reinforceFrontiers();
 enemyRecruitWild();
 aiVsAiWars();
 annualMobilisation();
 schedulePlayerThreats();
 scheduleTemptation();
}

// Disable the original very rare, opaque auto-attack. The expanded AI below replaces it.
try{window.aiTurn=function(){}}catch(e){}

window.endMonth=function(){
 const result=previousEndMonth.apply(this,arguments);
 try{runStrategicAI()}catch(e){console.error('v24.18 strategic AI:',e)}
 if(typeof window.render==='function')window.render();
 return result;
};

function threatPanel(){
 if(!state||state.battle)return;
 if(state.aiDefeated){
  app.innerHTML=`<section class="panel v2418-defeat"><div class="title">日向軍滅亡</div><h2>すべての拠点を失いました</h2><p>敵軍の侵攻により日向軍は領土を失いました。保存済みデータを読み込むか、新しいシナリオを開始してください。</p></section>`;
  return;
 }
 const threats=(state.aiThreats||[]).map(t=>`<div class="ai-warning"><b>⚔ ${t.force}軍</b>　${t.from} → ${t.to}<br><small>侵攻まで${Math.max(0,t.due-state.turn)}か月</small></div>`);
 const tempt=Object.entries(state.aiTemptations||{}).map(([n,x])=>`<div class="ai-warning poach"><b>密使：${n}</b><br><small>${x.force}軍／決着まで${Math.max(0,x.due-state.turn)}か月</small></div>`);
 const borders=Object.values(state.cities).filter(c=>c.force&&c.force!=='日向軍'&&
  ((c.n||[]).some(n=>state.cities[n]?.force==='日向軍')||knownIntel(c.name)>=1))
  .sort((a,b)=>b.troops-a.troops).slice(0,5).map(c=>{
   const exact=knownIntel(c.name)>=1;
   const scale=c.troops>=18000?'巨大な軍勢':c.troops>=11000?'大軍集結':c.troops>=6500?'増強中':'小規模';
   return `<div class="ai-border"><b>${c.name}</b> ${c.force}<span>${exact?`兵${c.troops.toLocaleString()}`:scale}</span></div>`;
  });
 const coalition=coalitionActive()?`<div class="ai-coalition">日向包囲網　残り${state.aiCoalitionUntil-state.turn+1}か月</div>`:'';
 const recent=(state.aiNews||[]).slice(0,3).map(n=>`<div class="ai-news ${n.important?'important':''}">${n.text}</div>`);
 const html=`<section class="panel v2418-panel"><div class="title">軍情・敵国動向</div>${coalition}${threats.join('')}${tempt.join('')}${borders.length?`<div class="ai-sub">国境・密偵情報</div>${borders.join('')}`:''}${recent.length?`<div class="ai-sub">最近の動き</div>${recent.join('')}`:''}${!coalition&&!threats.length&&!tempt.length&&!borders.length?'<small>現在、緊急の軍情はありません。</small>':''}</section>`;
 const stacks=document.querySelectorAll('.dashboard .stack');
 if(stacks.length&&!document.querySelector('.v2418-panel'))stacks[stacks.length-1].insertAdjacentHTML('afterbegin',html);
}
window.render=function(){
 const result=previousRender.apply(this,arguments);
 setTimeout(threatPanel,0);
 return result;
};

const style=document.createElement('style');
style.textContent=`
.v2418-panel{border-color:#77513e}.v2418-panel .ai-warning{margin:7px 0;padding:8px;border:1px solid #a34e3f;background:#281310;color:#f2c0ad;line-height:1.4}
.v2418-panel .ai-warning.poach{border-color:#7560a3;background:#191427;color:#d8ccff}.ai-coalition{padding:8px;margin-bottom:8px;border:1px solid #b58a32;background:#2b210d;color:#ffe09a;font-weight:800;text-align:center}
.ai-sub{margin-top:10px;padding-bottom:3px;border-bottom:1px solid #4b3b2d;color:#cfb98f;font-size:11px;font-weight:700}.ai-border{display:flex;gap:6px;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #4a3b2d;font-size:11px}.ai-border span{color:#e1c477}
.ai-news{padding:5px 0;font-size:10px;line-height:1.45;color:#bcae96}.ai-news.important{color:#f1c2a7;font-weight:700}.v2418-defeat{max-width:640px;margin:40px auto;text-align:center;border-color:#8b3d3d}
`;
document.head.appendChild(style);
})();
