// ROGUE Prototype 0.4 — strict stat ledger / persistent visible run bonuses
(()=>{
if(window.HINATA_ROGUE_STAT_GUARD)return;window.HINATA_ROGUE_STAT_GUARD=true;
const prevRender=window.render,prevBeginBattle=window.beginBattle;
const STAT_KEYS=['lead','war','int','pol','cha'];
const LABEL={lead:'統',war:'武',int:'知',pol:'政',cha:'魅'};
const EMPTY=()=>({lead:0,war:0,int:0,pol:0,cha:0});
function isRogue(){return !!state?.rogue}
function ownHinata(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='戦利品')}
function add(out,name,k,n){if(!name||!STAT_KEYS.includes(k)||!n)return;out[name]=out[name]||EMPTY();out[name][k]+=(Number(n)||0)}
function strictLedger(){
 const out={},ids=state?.rogue?.upgradeIds||{};
 const all=(k,n)=>{if(!n)return;for(const o of ownHinata())add(out,o.name,k,n)};
 all('lead',(Number(ids.lead2)||0)*2);all('war',(Number(ids.war2)||0)*2);all('int',(Number(ids.int2)||0)*2);all('pol',(Number(ids.pol2)||0)*2);all('cha',(Number(ids.cha2)||0)*2);
 add(out,'髙橋未来虹','lead',(Number(ids.mikuni4)||0)*4);
 add(out,'上村ひなの','int',(Number(ids.hinano4)||0)*4);
 add(out,'森本茉莉','lead',(Number(ids.mari4)||0)*4);
 add(out,'山口陽世','war',(Number(ids.haruyo4)||0)*4);
 const map={統率:'lead',武力:'war',知力:'int',政治:'pol',魅力:'cha'};
 // Material boosts are trustworthy only when the actual conversion log exists.
 for(const line of state?.logs||[]){
  const m=String(line).match(/(.+?)を(統率|武力|知力|政治|魅力)の強化素材として消費。(.+?)の(?:統率|武力|知力|政治|魅力)＋(\d+)/);
  if(m)add(out,m[3],map[m[2]],Number(m[4])||0);
 }
 state.rogue.statLedger=out;state.rogue.statLedgerVersion=104;
 return out;
}
function gearBonus(o,k){const g=o?.rogueEquip;return g&&g.stat===k?Number(g.amount)||0:0}
function bases(){if(!state.rogue.statBaseStrict)state.rogue.statBaseStrict={};return state.rogue.statBaseStrict}
function migrateBaseIfNeeded(ledger){
 const b=bases(),needs=state.rogue.statBaseVersion!==104;
 for(const o of ownHinata()){
  if(!b[o.name]||needs){
   const e=ledger[o.name]||EMPTY();b[o.name]=EMPTY();
   for(const k of STAT_KEYS)b[o.name][k]=(Number(o[k])||0)-(Number(e[k])||0)-gearBonus(o,k);
  }
 }
 state.rogue.statBaseVersion=104;
}
function syncStats(){
 if(!isRogue())return;const l=strictLedger();migrateBaseIfNeeded(l);const b=bases();
 for(const o of ownHinata()){
  if(!b[o.name]){b[o.name]=EMPTY();const e=l[o.name]||EMPTY();for(const k of STAT_KEYS)b[o.name][k]=(Number(o[k])||0)-(Number(e[k])||0)-gearBonus(o,k)}
  const e=l[o.name]||EMPTY();for(const k of STAT_KEYS)o[k]=(Number(b[o.name][k])||0)+(Number(e[k])||0)+gearBonus(o,k);
 }
}
function decorate(){
 if(!isRogue()||state.battle)return;const l=strictLedger();
 document.querySelectorAll('.officer').forEach(el=>{
  const o=ownHinata().find(x=>el.textContent.includes(x.name));if(!o)return;el.querySelector('.rogue-stat-bonus')?.remove();const e=l[o.name]||EMPTY();
  const parts=STAT_KEYS.filter(k=>(Number(e[k])||0)!==0).map(k=>`${LABEL[k]}+${e[k]}`);if(!parts.length)return;
  const host=el.querySelector('div');if(!host)return;const x=document.createElement('div');x.className='rogue-stat-bonus';x.textContent=`ROGUE補正：${parts.join(' ')}`;host.appendChild(x);
 });
}
window.render=function(){
 if(!isRogue())return prevRender.apply(this,arguments);
 syncStats();const r=prevRender.apply(this,arguments);
 // Common campaign patches may rewrite Hinata stats while rendering. Restore only bonuses proven by run history.
 setTimeout(()=>{try{syncStats();decorate()}catch(e){console.error('ROGUE strict stat guard:',e)}},40);return r;
};
window.beginBattle=function(){
 if(isRogue())syncStats();const r=prevBeginBattle.apply(this,arguments);
 if(isRogue()&&state?.battle){for(const u of state.battle.units||[]){if(u.side!=='player')continue;const o=(state.officers||[]).find(x=>x.name===u.name&&x.force==='日向軍');if(!o)continue;for(const k of ['lead','war','int'])u[k]=Number(o[k])||0}}
 return r;
};
const style=document.createElement('style');style.textContent='.rogue-stat-bonus{margin-top:4px;color:#ffd978;font-size:10px;font-weight:700;letter-spacing:.02em}';document.head.appendChild(style);
setTimeout(()=>{if(isRogue()){syncStats();decorate()}},0);
window.HINATA_ROGUE_STAT_API={strictLedger,syncStats,bases};
})();