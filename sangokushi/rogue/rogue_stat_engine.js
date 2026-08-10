// ROGUE Prototype 0.5 — deterministic stat engine
(()=>{
if(window.HINATA_ROGUE_STAT_ENGINE)return;window.HINATA_ROGUE_STAT_ENGINE=true;
const prevRender=window.render,prevBeginBattle=window.beginBattle;
const KEYS=['lead','war','int','pol','cha'];
const LABEL={lead:'統',war:'武',int:'知',pol:'政',cha:'魅'};
// Shared-game baseline confirmed for the four initial ROGUE members.
const FIXED_BASE={
 '髙橋未来虹':{lead:95,war:95,int:88,pol:75,cha:89},
 '上村ひなの':{lead:78,war:91,int:65,pol:84,cha:91},
 '森本茉莉':{lead:84,war:84,int:72,pol:80,cha:88},
 '山口陽世':{lead:90,war:76,int:55,pol:70,cha:86}
};
const UPGRADE_DEF={
 lead2:{kind:'all',stat:'lead',amount:2},war2:{kind:'all',stat:'war',amount:2},int2:{kind:'all',stat:'int',amount:2},pol2:{kind:'all',stat:'pol',amount:2},cha2:{kind:'all',stat:'cha',amount:2},
 mikuni4:{kind:'one',name:'髙橋未来虹',stat:'lead',amount:4},hinano4:{kind:'one',name:'上村ひなの',stat:'int',amount:4},mari4:{kind:'one',name:'森本茉莉',stat:'lead',amount:4},haruyo4:{kind:'one',name:'山口陽世',stat:'war',amount:4}
};
function isRogue(){return !!state?.rogue}
function own(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.status!=='死亡'&&o.status!=='捕虜')}
function z(){return{lead:0,war:0,int:0,pol:0,cha:0}}
function copyStats(o){return Object.fromEntries(KEYS.map(k=>[k,Number(o?.[k])||0]))}
function countUpgrade(id){const x=state?.rogue?.upgradeIds;if(!x)return 0;if(Array.isArray(x))return x.filter(v=>v===id).length;if(x instanceof Set)return x.has(id)?1:0;const v=x[id];return Number.isFinite(Number(v))?Math.max(0,Number(v)):v?1:0}
function ensureStores(){
 const r=state.rogue;r.statBaseV3=r.statBaseV3||{};r.statEventsV3=Array.isArray(r.statEventsV3)?r.statEventsV3:[];r.statObservedCountsV3=r.statObservedCountsV3||{};r.statParsedLogsV3=r.statParsedLogsV3||{};
 // Discard all legacy inferred ledgers. They are intentionally not a source of truth anymore.
 if(r.statEngineVersion!==5){delete r.statLedger;delete r.statGuardParsedLogs;r.statEngineVersion=5}
}
function ensureBase(o){
 ensureStores();const r=state.rogue;
 if(FIXED_BASE[o.name]){r.statBaseV3[o.name]={...FIXED_BASE[o.name]};return r.statBaseV3[o.name]}
 if(!r.statBaseV3[o.name])r.statBaseV3[o.name]=copyStats(o);
 return r.statBaseV3[o.name];
}
function currentNames(){return own().map(o=>o.name)}
function addEvent(ev){state.rogue.statEventsV3.push({...ev,seq:state.rogue.statEventsV3.length+1})}
function syncUpgradeEvents(){
 ensureStores();const r=state.rogue;
 for(const [id,d] of Object.entries(UPGRADE_DEF)){
  const now=countUpgrade(id),seen=Number(r.statObservedCountsV3[id])||0;
  if(now>seen){for(let i=seen;i<now;i++){
   if(d.kind==='all')addEvent({source:'upgrade',id,stat:d.stat,amount:d.amount,recipients:currentNames()});
   else addEvent({source:'upgrade',id,stat:d.stat,amount:d.amount,recipients:[d.name]});
  }}
  r.statObservedCountsV3[id]=now;
 }
}
function syncMaterialEvents(){
 ensureStores();const r=state.rogue,map={統率:'lead',武力:'war',知力:'int',政治:'pol',魅力:'cha'};
 for(const line of state.logs||[]){
  const s=String(line),m=s.match(/(.+?)を(統率|武力|知力|政治|魅力)の強化素材として消費。(.+?)の(?:統率|武力|知力|政治|魅力)＋(\d+)/);if(!m||r.statParsedLogsV3[s])continue;
  addEvent({source:'material',id:m[1],stat:map[m[2]],amount:Number(m[4])||0,recipients:[m[3]]});r.statParsedLogsV3[s]=1;
 }
}
function bonusFor(name){
 const b=z();for(const e of state?.rogue?.statEventsV3||[]){if((e.recipients||[]).includes(name)&&KEYS.includes(e.stat))b[e.stat]+=Number(e.amount)||0}return b
}
function expected(o){const base=ensureBase(o),bonus=bonusFor(o.name),out={};for(const k of KEYS)out[k]=(Number(base[k])||0)+(Number(bonus[k])||0);return{base,bonus,out}}
function normalize(){
 if(!isRogue())return false;ensureStores();syncUpgradeEvents();syncMaterialEvents();let changed=false;
 for(const o of own()){
  const e=expected(o);for(const k of KEYS){if((Number(o[k])||0)!==e.out[k]){o[k]=e.out[k];changed=true}}
  o.rogueBaseV3={...e.base};o.rogueBonusV3={...e.bonus};
 }
 return changed;
}
function rewriteCard(el,o){
 const e=expected(o),parts=KEYS.filter(k=>e.bonus[k]).map(k=>`${LABEL[k]}+${e.bonus[k]}`);
 const small=[...el.querySelectorAll('small')].find(x=>/統\d+.*武\d+.*知\d+.*政\d+.*魅\d+/.test(x.textContent));
 if(small)small.textContent=small.textContent.replace(/統\d+\s*武\d+\s*知\d+\s*政\d+\s*魅\d+/,`統${e.out.lead} 武${e.out.war} 知${e.out.int} 政${e.out.pol} 魅${e.out.cha}`);
 el.querySelector('.rogue-stat-bonus')?.remove();const host=el.querySelector('div');if(!host)return;
 const x=document.createElement('div');x.className='rogue-stat-bonus';x.textContent=parts.length?`ROGUE補正：${parts.join(' ')}`:'ROGUE補正：なし';host.appendChild(x);
 const y=document.createElement('div');y.className='rogue-stat-detail';y.textContent=`基礎→現在：統${e.base.lead}→${e.out.lead} 武${e.base.war}→${e.out.war} 知${e.base.int}→${e.out.int} 政${e.base.pol}→${e.out.pol} 魅${e.base.cha}→${e.out.cha}`;host.appendChild(y);
}
function decorate(){if(!isRogue()||state.battle)return;document.querySelectorAll('.rogue-stat-detail').forEach(x=>x.remove());for(const el of document.querySelectorAll('.officer')){const o=own().find(x=>el.textContent.includes(x.name));if(o)rewriteCard(el,o)}}
let inSecond=false;
window.render=function(){
 if(!isRogue())return prevRender.apply(this,arguments);
 normalize();const r=prevRender.apply(this,arguments);const changed=normalize();
 if(changed&&!inSecond){inSecond=true;try{prevRender.apply(this,arguments)}finally{inSecond=false}normalize()}
 setTimeout(()=>{try{const c=normalize();if(c&&!inSecond){inSecond=true;try{prevRender()}finally{inSecond=false}normalize()}decorate()}catch(e){console.error('ROGUE stat engine:',e)}},0);
 return r;
};
window.beginBattle=function(){
 if(isRogue())normalize();const r=prevBeginBattle.apply(this,arguments);
 if(isRogue()&&state?.battle){normalize();for(const u of state.battle.units||[]){if(u.side!=='player')continue;const o=(state.officers||[]).find(x=>x.name===u.name&&x.force==='日向軍');if(!o)continue;for(const k of ['lead','war','int'])u[k]=Number(o[k])||0}}
 return r;
};
const style=document.createElement('style');style.textContent='.rogue-stat-detail{margin-top:2px;color:#b7d9ae;font-size:9px;line-height:1.35}.rogue-stat-bonus{margin-top:4px;color:#ffd978;font-size:10px;font-weight:700}';document.head.appendChild(style);
setTimeout(()=>{try{if(isRogue()){normalize();decorate()}}catch(e){console.error(e)}},0);
window.HINATA_ROGUE_STAT_ENGINE_API={normalize,bonusFor,expected,countUpgrade,syncUpgradeEvents,syncMaterialEvents};
})();
