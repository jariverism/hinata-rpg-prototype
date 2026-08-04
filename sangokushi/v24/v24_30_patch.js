// v24.30 — adviser reports enemy poaching outcomes at the start of the next month
(()=>{
const previousEndMonth=window.endMonth;
const previousRender=window.render;
let reportOpen=false;
let reportTimer=null;

function ensureState(){
 if(!state)return;
 state.v2430PoachingReports=Array.isArray(state.v2430PoachingReports)?state.v2430PoachingReports:[];
 state.v2430PoachingHistory=Array.isArray(state.v2430PoachingHistory)?state.v2430PoachingHistory:[];
 state.v2430PoachingReportVersion=130;
}
function currentAdviser(){
 try{if(typeof v241Adviser==='function'){const a=v241Adviser('日向軍');if(a)return a}}catch(e){}
 const name=state?.advisers?.['日向軍'];
 const named=(state?.officers||[]).find(o=>o.name===name&&o.force==='日向軍'&&!['死亡','捕虜','敗将'].includes(o.status));
 if(named)return named;
 return (state?.officers||[]).filter(o=>o.force==='日向軍'&&!['死亡','捕虜','敗将'].includes(o.status))
  .sort((a,b)=>(Number(b.int)||0)-(Number(a.int)||0))[0]||null;
}
function cleanText(text){return String(text||'').replace(/^【[^】]+】\s*/,'').trim()}
function parsePoaching(text){
 const s=cleanText(text);let m;
 m=s.match(/^事後報告：(.+?)軍が(.+?)へ接触し、引き抜きに成功。\2は(.+?)へ離反した。$/);
 if(m)return {force:m[1],target:m[2],result:'success',destination:m[3]};
 m=s.match(/^事後報告：(.+?)軍が(.+?)へ登用の接触を行ったが、\2は拒絶した。$/);
 if(m)return {force:m[1],target:m[2],result:'rejected',destination:null};
 m=s.match(/^事後報告：(.+?)軍が(.+?)へ接触したが、厚い待遇により引き抜きを防いだ。$/);
 if(m)return {force:m[1],target:m[2],result:'prevented',destination:null};
 m=s.match(/^離反！ (.+?)が(.+?)軍の登用に応じ、(.+?)へ去った。$/);
 if(m)return {force:m[2],target:m[1],result:'success',destination:m[3]};
 m=s.match(/^(.+?)は(.+?)軍の登用工作を拒絶した。$/);
 if(m)return {force:m[2],target:m[1],result:'rejected',destination:null};
 m=s.match(/^(.+?)への(.+?)軍の誘いは、厚い待遇により退けられた。$/);
 if(m)return {force:m[2],target:m[1],result:'prevented',destination:null};
 return null;
}
function reportKey(r,turn=Number(state?.turn)||0){return `${Number(turn)||0}|${r.force}|${r.target}|${r.result}|${r.destination||''}`}
function reportSignature(r){return `${r.force}|${r.target}|${r.result}|${r.destination||''}`}
function collectReports(beforeNews){
 ensureState();
 const added=[];
 const newNews=(state.aiNews||[]).filter(n=>!beforeNews.has(n));
 const known=new Set([
  ...state.v2430PoachingReports.map(r=>r.id),
  ...state.v2430PoachingHistory.map(r=>r.id)
 ]);
 for(const n of newNews){
  const parsed=parsePoaching(n?.text);if(!parsed)continue;
  const id=reportKey(parsed,Number(n?.turn)||Number(state.turn)||0);if(known.has(id))continue;
  known.add(id);
  added.push({
   id,...parsed,
   turn:Number(state.turn)||0,year:Number(state.year)||0,month:Number(state.month)||0,
   createdAt:Date.now()
  });
 }
 if(!added.length)return [];
 const ids=new Set(added.map(r=>r.id));
 state.v2430PoachingReports.push(...added);
 state.aiNews=(state.aiNews||[]).filter(n=>{
  const parsed=parsePoaching(n?.text);return !parsed||!ids.has(reportKey(parsed,Number(n?.turn)||Number(state.turn)||0));
 });
 const removeCounts=new Map();
 added.forEach(r=>removeCounts.set(reportSignature(r),(removeCounts.get(reportSignature(r))||0)+1));
 state.logs=(state.logs||[]).filter(line=>{
  const parsed=parsePoaching(line);if(!parsed)return true;
  const sig=reportSignature(parsed),left=removeCounts.get(sig)||0;
  if(left>0){removeCounts.set(sig,left-1);return false}
  return true;
 });
 return added;
}
function faceHtml(name){return typeof v241FaceHtml==='function'?v241FaceHtml(name):`<span class="face">${(name||'軍')[0]}</span>`}
function applyFaces(){
 if(typeof v241ApplyFace!=='function')return;
 modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
}
function resultHtml(r){
 if(r.result==='success')return `<div class="v2430-report success"><b>引き抜き成功</b><p>${r.force}軍が<b>${r.target}</b>へ接触し、登用に成功しました。${r.target}は日向軍を離れ、<b>${r.destination||r.force+'軍領'}</b>へ去っています。</p></div>`;
 if(r.result==='rejected')return `<div class="v2430-report rejected"><b>登用を拒絶</b><p>${r.force}軍が<b>${r.target}</b>へ接触しましたが、本人は誘いを拒絶しました。拒絶を経て忠誠は1上昇しています。</p></div>`;
 return `<div class="v2430-report prevented"><b>引き抜きを阻止</b><p>${r.force}軍が<b>${r.target}</b>へ接触しましたが、厚い待遇と高い忠誠により離反を防ぎました。</p></div>`;
}
function reportSummary(r){
 if(r.result==='success')return `${r.force}軍による${r.target}の引き抜きが成功し、${r.destination||'敵領'}へ離反した。`;
 if(r.result==='rejected')return `${r.force}軍が${r.target}へ接触したが、登用を拒絶した。`;
 return `${r.force}軍が${r.target}へ接触したが、厚い待遇により引き抜きを防いだ。`;
}
function blockedByOtherEvent(){
 if(!state||state.battle||state.v2427PendingDisposition)return true;
 if(Array.isArray(state.v2420DefenseQueue)&&state.v2420DefenseQueue.length)return true;
 if(modal?.classList?.contains('on'))return true;
 return false;
}
function showReports(){
 ensureState();
 if(reportOpen||!state.v2430PoachingReports.length||blockedByOtherEvent())return false;
 const adviser=currentAdviser(),batch=state.v2430PoachingReports.slice();
 reportOpen=true;
 showModal(`<h2>月初軍師報告</h2><div class="v2430-adviser">${faceHtml(adviser?.name||'軍師')}<div><b>軍師 ${adviser?.name||'不在'}</b><p>「先月、我が軍の武将に対して敵国から登用の接触がありました。結果をご報告します。」</p></div></div><div class="v2430-report-list">${batch.map(resultHtml).join('')}</div><button id="v2430-report-ok" class="primary">報告を確認</button>`);
 applyFaces();
 modalCard.querySelector('#v2430-report-ok').onclick=()=>{
  const ids=new Set(batch.map(r=>r.id));
  state.v2430PoachingReports=state.v2430PoachingReports.filter(r=>!ids.has(r.id));
  state.v2430PoachingHistory.unshift(...batch.map(r=>({...r,reportedTurn:state.turn,reportedYear:state.year,reportedMonth:state.month,adviser:adviser?.name||null})));
  state.v2430PoachingHistory=state.v2430PoachingHistory.slice(0,40);
  if(typeof log==='function'){
   const lead=adviser?`軍師${adviser.name}の報告`:'月初報告';
   batch.forEach(r=>log(`${lead}：${reportSummary(r)}`));
  }
  closeModal();reportOpen=false;render();scheduleReports();
 };
 return true;
}
function scheduleReports(delay=80){
 clearTimeout(reportTimer);
 reportTimer=setTimeout(()=>{
  if(!showReports()&&state?.v2430PoachingReports?.length&&!state?.battle)reportTimer=setTimeout(()=>showReports(),240);
 },delay);
}

window.endMonth=function(){
 ensureState();
 const beforeNews=new Set(state.aiNews||[]);
 const result=previousEndMonth.apply(this,arguments);
 try{
  const added=collectReports(beforeNews);
  if(added.length&&typeof window.render==='function')window.render();
  scheduleReports(100);
 }catch(e){console.error('v24.30 poaching report:',e)}
 return result;
};
window.render=function(){
 ensureState();
 const result=previousRender.apply(this,arguments);
 if(state?.v2430PoachingReports?.length)scheduleReports(100);
 return result;
};

const style=document.createElement('style');
style.textContent=`
.v2430-adviser{display:grid;grid-template-columns:58px 1fr;gap:10px;align-items:center;margin:10px 0 13px;padding:11px;border:1px solid #aa8240;background:#21180f}.v2430-adviser .face{width:54px;height:64px}.v2430-adviser p{margin:4px 0 0;line-height:1.55}
.v2430-report-list{display:grid;gap:9px;margin:12px 0}.v2430-report{padding:11px 12px;border:1px solid;line-height:1.55}.v2430-report p{margin:5px 0 0}.v2430-report.success{border-color:#a64b45;background:#2b1211;color:#ffd0ca}.v2430-report.rejected{border-color:#607d59;background:#142015;color:#d7efd2}.v2430-report.prevented{border-color:#806a36;background:#211b0f;color:#f3dfaa}
#v2430-report-ok{width:100%;min-height:48px}
`;
document.head.appendChild(style);
})();
