// v24.19 — uncertain invasion intelligence and post-event poaching reports
(()=>{
const previousEndMonth=window.endMonth;
const previousRender=window.render;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function currentAdviser(){
 try{if(typeof v241Adviser==='function'){const a=v241Adviser('日向軍');if(a)return a}}catch(e){}
 try{
  const name=state?.advisers?.['日向軍'];
  const named=state?.officers?.find(o=>o.name===name&&o.force==='日向軍'&&o.status!=='捕虜'&&o.status!=='死亡');
  if(named)return named;
  return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.status!=='捕虜'&&o.status!=='死亡')
   .sort((a,b)=>(Number(b.int)||0)-(Number(a.int)||0))[0]||null;
 }catch(e){return null}
}
function spyLevel(cityName){
 const rec=state?.spyIntel?.[cityName];
 return rec&&Number(rec.expires)>=Number(state.turn)?Number(rec.level)||0:0;
}
function detectionChance(threat){
 const adviser=currentAdviser(),intelligence=Number(adviser?.int)||35;
 // Even INT 100 does not guarantee discovery. Existing spy networks add a modest bonus.
 return clamp(Math.round(8+intelligence*.65+spyLevel(threat.from)*10),12,85);
}
function rollThreatDetection(){
 if(!Array.isArray(state?.aiThreats))return;
 state.aiThreats.forEach(t=>{
  if(typeof t.detected==='boolean')return;
  const chance=detectionChance(t),adviser=currentAdviser();
  t.detected=Math.random()*100<chance;
  t.detectionChance=chance;
  t.detectedBy=adviser?.name||null;
 });
}
function stripAdvanceNotices(){
 if(Array.isArray(state?.aiNews)){
  state.aiNews=state.aiNews.filter(n=>{
   const text=String(n?.text||'');
   return !text.startsWith('敵襲予報：')&&!text.startsWith('密報：');
  });
 }
 if(Array.isArray(state?.logs)){
  state.logs=state.logs.filter(x=>{
   const text=String(x||'');
   return !text.includes('敵襲予報：')&&!text.includes('密報：');
  });
 }
}
function addDetectedNotices(){
 if(!Array.isArray(state?.aiThreats))return;
 state.aiNews=Array.isArray(state.aiNews)?state.aiNews:[];
 state.aiThreats.filter(t=>t.detected&&Number(t.due)>Number(state.turn)&&t.noticeTurn==null).forEach(t=>{
  const adviser=currentAdviser();
  const lead=adviser?`軍師${adviser.name}の報告`:'斥候からの報告';
  const known=spyLevel(t.from)>=1&&state.cities?.[t.from]?`、推定兵力${Math.round(state.cities[t.from].troops/100)*100}`:'';
  const text=`${lead}：${t.force}軍が${t.from}で${t.to}侵攻を準備している兆候を察知${known}。`;
  state.aiNews.unshift({turn:state.turn,text,important:true,type:'detected-invasion'});
  state.aiNews=state.aiNews.slice(0,12);
  if(typeof log==='function')log(text);
  t.noticeTurn=state.turn;
 });
}
function rewritePoachingReports(){
 const rewrite=text=>{
  let m=String(text||'').match(/^離反！ (.+?)が(.+?)軍の登用に応じ、(.+?)へ去った。$/);
  if(m)return `事後報告：${m[2]}軍が${m[1]}へ接触し、引き抜きに成功。${m[1]}は${m[3]}へ離反した。`;
  m=String(text||'').match(/^(.+?)は(.+?)軍の登用工作を拒絶した。$/);
  if(m)return `事後報告：${m[2]}軍が${m[1]}へ登用の接触を行ったが、${m[1]}は拒絶した。`;
  m=String(text||'').match(/^(.+?)への(.+?)軍の誘いは、厚い待遇により退けられた。$/);
  if(m)return `事後報告：${m[2]}軍が${m[1]}へ接触したが、厚い待遇により引き抜きを防いだ。`;
  return text;
 };
 if(Array.isArray(state?.aiNews))state.aiNews.forEach(n=>{n.text=rewrite(n.text)});
 if(Array.isArray(state?.logs))state.logs=state.logs.map(line=>{
  const match=String(line).match(/^(【[^】]+】)(.*)$/);
  return match?match[1]+rewrite(match[2]):rewrite(line);
 });
}
function processIntelligence(){
 if(!state||state.battle)return;
 rollThreatDetection();
 stripAdvanceNotices();
 rewritePoachingReports();
 addDetectedNotices();
 state.v2419IntelVersion=119;
}
function decorateIntelligencePanel(){
 if(!state||state.battle)return;
 const panel=document.querySelector('.v2418-panel');if(!panel)return;
 panel.querySelectorAll('.ai-warning,.v2419-detected,.v2419-none').forEach(el=>el.remove());
 const title=panel.querySelector('.title');if(!title)return;
 const detected=(state.aiThreats||[]).filter(t=>t.detected&&Number(t.due)>Number(state.turn));
 let after=title;
 detected.forEach(t=>{
  const box=document.createElement('div');box.className='ai-warning v2419-detected';
  box.innerHTML=`<b>⚔ 侵攻の兆候を察知</b><br>${t.force}軍　${t.from} → ${t.to}<br><small>予想される侵攻まで${Math.max(0,Number(t.due)-Number(state.turn))}か月／軍師の察知判定${t.detectionChance??'―'}%</small>`;
  after.insertAdjacentElement('afterend',box);after=box;
 });
 if(!detected.length){
  const note=document.createElement('small');note.className='v2419-none';
  note.textContent='現在、軍師・斥候が察知できている侵攻準備はありません。';
  title.insertAdjacentElement('afterend',note);
 }
}

window.endMonth=function(){
 const result=previousEndMonth.apply(this,arguments);
 try{processIntelligence()}catch(e){console.error('v24.19 intelligence:',e)}
 if(typeof window.render==='function')window.render();
 return result;
};
window.render=function(){
 const result=previousRender.apply(this,arguments);
 setTimeout(()=>{try{decorateIntelligencePanel()}catch(e){}},0);
 return result;
};

setTimeout(()=>{
 try{
  if(typeof state!=='undefined'&&state){processIntelligence();window.render()}
 }catch(e){console.warn('v24.19 migration:',e)}
},0);
})();
