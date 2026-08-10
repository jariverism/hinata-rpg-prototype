// ROGUE Prototype 0.2 — persistent stat guard / visible run bonuses
(()=>{
if(window.HINATA_ROGUE_STAT_GUARD)return;window.HINATA_ROGUE_STAT_GUARD=true;
const prevRender=window.render,prevBeginBattle=window.beginBattle;
const STAT_KEYS=['lead','war','int','pol','cha'];
const LABEL={lead:'統',war:'武',int:'知',pol:'政',cha:'魅'};
let last={};
function isRogue(){return !!state?.rogue}
function ownHinata(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.status!=='死亡'&&o.status!=='捕虜')}
function snap(){const out={};for(const o of ownHinata())out[o.name]=Object.fromEntries(STAT_KEYS.map(k=>[k,Number(o[k])||0]));return out}
function ledger(){if(!state.rogue.statLedger)state.rogue.statLedger={};return state.rogue.statLedger}
function entry(name){const l=ledger();if(!l[name])l[name]={lead:0,war:0,int:0,pol:0,cha:0};return l[name]}
function upgradeExpected(){
 const ids=state?.rogue?.upgradeIds||{},out={};
 const add=(name,k,n)=>{out[name]=out[name]||{lead:0,war:0,int:0,pol:0,cha:0};out[name][k]+=n};
 const all=(k,n)=>ownHinata().forEach(o=>add(o.name,k,n));
 all('lead',(ids.lead2||0)*2);all('war',(ids.war2||0)*2);all('int',(ids.int2||0)*2);all('pol',(ids.pol2||0)*2);all('cha',(ids.cha2||0)*2);
 add('髙橋未来虹','lead',(ids.mikuni4||0)*4);add('上村ひなの','int',(ids.hinano4||0)*4);add('森本茉莉','lead',(ids.mari4||0)*4);add('山口陽世','war',(ids.haruyo4||0)*4);
 return out;
}
function seedLedgerFromStructuredState(){
 if(!isRogue())return;const l=ledger(),expected=upgradeExpected();
 for(const [name,vals] of Object.entries(expected)){const e=entry(name);for(const k of STAT_KEYS)e[k]=Math.max(Number(e[k])||0,Number(vals[k])||0)}
 // Historical-officer material conversions are recorded in the campaign log. Parse them once for old saves too.
 state.rogue.statGuardParsedLogs=state.rogue.statGuardParsedLogs||{};
 for(const line of state.logs||[]){const s=String(line),m=s.match(/(.+?)を(統率|武力|知力|政治|魅力)の強化素材として消費。(.+?)の(?:統率|武力|知力|政治|魅力)＋(\d+)/);if(!m)continue;
  const key=s,done=state.rogue.statGuardParsedLogs[key]||0;if(done)continue;const map={統率:'lead',武力:'war',知力:'int',政治:'pol',魅力:'cha'},k=map[m[2]],name=m[3],n=Number(m[4])||0;entry(name)[k]+=n;state.rogue.statGuardParsedLogs[key]=1;
 }
}
function learnObservedBonuses(before,after){
 if(!isRogue())return;const l=ledger();
 for(const o of ownHinata()){
  const b=before?.[o.name],a=after?.[o.name];if(!b||!a)continue;const e=entry(o.name);
  for(const k of STAT_KEYS){const d=(Number(a[k])||0)-(Number(b[k])||0);if(d>0)e[k]=(Number(e[k])||0)+d}
 }
}
function reconcileFromLast(){
 if(!isRogue())return;seedLedgerFromStructuredState();
 // If a common patch silently rolls a stat back after it had already been observed, restore only the missing amount.
 for(const o of ownHinata()){
  const prev=last[o.name];if(!prev)continue;const e=entry(o.name);
  for(const k of STAT_KEYS){const now=Number(o[k])||0,old=Number(prev[k])||0;if(now<old&&Number(e[k])>0){const rollback=old-now;o[k]=now+Math.min(rollback,Number(e[k])||0)}}
 }
}
function decorate(){
 if(!isRogue()||state.battle)return;seedLedgerFromStructuredState();
 document.querySelectorAll('.officer').forEach(el=>{
  const o=ownHinata().find(x=>el.textContent.includes(x.name));if(!o)return;el.querySelector('.rogue-stat-bonus')?.remove();const e=entry(o.name),parts=STAT_KEYS.filter(k=>(Number(e[k])||0)>0).map(k=>`${LABEL[k]}+${e[k]}`);if(!parts.length)return;
  const host=el.querySelector('div');if(!host)return;const x=document.createElement('div');x.className='rogue-stat-bonus';x.textContent=`ROGUE補正：${parts.join(' ')}`;host.appendChild(x);
 });
}
window.render=function(){
 if(!isRogue())return prevRender.apply(this,arguments);
 const before=snap();reconcileFromLast();const result=prevRender.apply(this,arguments);const after=snap();learnObservedBonuses(before,after);last=snap();setTimeout(()=>{try{reconcileFromLast();last=snap();decorate()}catch(e){console.error('ROGUE stat guard:',e)}},40);return result;
};
window.beginBattle=function(){if(isRogue()){reconcileFromLast();last=snap()}const r=prevBeginBattle.apply(this,arguments);if(isRogue()&&state?.battle){for(const u of state.battle.units||[]){if(u.side!=='player')continue;const o=(state.officers||[]).find(x=>x.name===u.name&&x.force==='日向軍');if(!o)continue;for(const k of ['lead','war','int'])if(Number.isFinite(Number(o[k])))u[k]=Number(o[k])}}return r};
const style=document.createElement('style');style.textContent='.rogue-stat-bonus{margin-top:4px;color:#ffd978;font-size:10px;font-weight:700;letter-spacing:.02em}';document.head.appendChild(style);
setTimeout(()=>{if(isRogue()){seedLedgerFromStructuredState();last=snap();decorate()}},0);
window.HINATA_ROGUE_STAT_API={ledger,seedLedgerFromStructuredState,reconcileFromLast};
})();