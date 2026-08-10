// 日向三國志 ROGUE Prototype 0.6 — canonical stat engine
(()=>{
if(window.HINATA_ROGUE_STAT_ENGINE_V6)return;window.HINATA_ROGUE_STAT_ENGINE_V6=true;
const prevRender=window.render,prevBeginBattle=window.beginBattle;
const KEYS=['lead','war','int','pol','cha'];
const LABEL={lead:'統',war:'武',int:'知',pol:'政',cha:'魅'};
// These are the actual displayed ROGUE starting values after the shared game patches finish.
// They are native/base values, NOT ROGUE bonuses.
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
function zero(){return{lead:0,war:0,int:0,pol:0,cha:0}}
function add(a,b){for(const k of KEYS)a[k]=(Number(a[k])||0)+(Number(b?.[k])||0);return a}
function copy(o){return Object.fromEntries(KEYS.map(k=>[k,Number(o?.[k])||0]))}
function isRogue(){return !!state?.rogue}
function isAliveOwn(o){return o?.force==='日向軍'&&o.status!=='死亡'&&o.status!=='捕虜'}
function own(){return (state?.officers||[]).filter(isAliveOwn)}
function ensure(){
 if(!isRogue())return null;const r=state.rogue;
 r.statBaseV6=r.statBaseV6||{};r.statMaterialV6=Array.isArray(r.statMaterialV6)?r.statMaterialV6:[];r.statMaterialSeenV6=r.statMaterialSeenV6||{};
 if(r.statEngineVersionV6!==6){
  // Keep real game history (upgradeIds/equipment/logs), discard every inferred/legacy bonus ledger.
  delete r.statLedger;delete r.statGuardParsedLogs;delete r.statBaseV3;delete r.statObservedCountsV3;delete r.statParsedLogsV3;
  r.statEngineVersionV6=6;
 }
 return r;
}
function countUpgrade(id){
 const x=state?.rogue?.upgradeIds;if(!x)return 0;
 if(Array.isArray(x))return x.filter(v=>v===id).length;
 if(x instanceof Set)return x.has(id)?1:0;
 const v=x[id];return Number.isFinite(Number(v))?Math.max(0,Number(v)):v?1:0;
}
function upgradeBonus(name){
 const out=zero();for(const [id,d] of Object.entries(UPGRADE_DEF)){
  const n=countUpgrade(id);if(!n)continue;
  if(d.kind==='all'||d.name===name)out[d.stat]+=d.amount*n;
 }return out;
}
function migrateExplicitMaterials(){
 const r=ensure();if(!r||r.statV3MaterialsMigrated)return;
 for(const e of r.statEventsV3||[]){
  if(e?.source!=='material'||!KEYS.includes(e.stat))continue;
  for(const name of e.recipients||[]){const key=`v3|${e.id}|${name}|${e.stat}|${e.amount}`;if(r.statMaterialSeenV6[key])continue;r.statMaterialSeenV6[key]=1;r.statMaterialV6.push({source:String(e.id||'素材'),name,stat:e.stat,amount:Number(e.amount)||0,key})}
 }
 r.statV3MaterialsMigrated=true;
 // v3 events are no longer used for any calculation after explicit material migration.
 delete r.statEventsV3;
}
function syncMaterialLogs(){
 const r=ensure();if(!r)return;migrateExplicitMaterials();
 const map={統率:'lead',武力:'war',知力:'int',政治:'pol',魅力:'cha'};
 for(const line of state.logs||[]){
  const s=String(line),m=s.match(/(.+?)を(統率|武力|知力|政治|魅力)の強化素材として消費。(.+?)の(?:統率|武力|知力|政治|魅力)＋(\d+)/);if(!m)continue;
  const key=`log|${s}`;if(r.statMaterialSeenV6[key])continue;r.statMaterialSeenV6[key]=1;r.statMaterialV6.push({source:m[1],name:m[3],stat:map[m[2]],amount:Number(m[4])||0,key});
 }
}
function materialBonus(name){
 const out=zero();for(const e of state?.rogue?.statMaterialV6||[]){if(e.name===name&&KEYS.includes(e.stat))out[e.stat]+=Number(e.amount)||0}return out;
}
function equipBonus(o){const out=zero(),g=o?.rogueEquip;if(g&&KEYS.includes(g.stat))out[g.stat]+=Number(g.amount)||0;return out}
function deriveBase(o){
 const r=ensure();if(FIXED_BASE[o.name]){r.statBaseV6[o.name]={...FIXED_BASE[o.name]};return r.statBaseV6[o.name]}
 if(r.statBaseV6[o.name])return r.statBaseV6[o.name];
 // For members first seen after older builds, strip only bonuses that the old ROGUE code explicitly marked/applied.
 const cur=copy(o),eq=equipBonus(o),mat=materialBonus(o.name),ap=o.vRogueStatApplied||{},b=zero();
 for(const k of KEYS)b[k]=Math.max(1,(Number(cur[k])||0)-(Number(ap[k])||0)-(Number(eq[k])||0)-(Number(mat[k])||0));
 r.statBaseV6[o.name]=b;return b;
}
function breakdown(o){
 const up=upgradeBonus(o.name),mat=materialBonus(o.name),eq=equipBonus(o),total=add(add({...up},mat),eq);return{up,mat,eq,total};
}
function expected(o){
 const base=deriveBase(o),b=breakdown(o),out={};for(const k of KEYS)out[k]=(Number(base[k])||0)+(Number(b.total[k])||0);return{base:{...base},...b,out};
}
function normalize(){
 if(!isRogue())return false;ensure();syncMaterialLogs();let changed=false;
 for(const o of own()){
  const e=expected(o);for(const k of KEYS){if((Number(o[k])||0)!==e.out[k]){o[k]=e.out[k];changed=true}}
  o.rogueBaseV6={...e.base};o.rogueRunBonusV6={...e.total};
 }
 return changed;
}
function parts(v){return KEYS.filter(k=>(Number(v[k])||0)!==0).map(k=>`${LABEL[k]}+${v[k]}`)}
function rewriteCard(el,o){
 const e=expected(o),all=parts(e.total),up=parts(e.up),mat=parts(e.mat),eq=parts(e.eq);
 const small=[...el.querySelectorAll('small')].find(x=>/統\d+.*武\d+.*知\d+.*政\d+.*魅\d+/.test(x.textContent));
 if(small)small.textContent=small.textContent.replace(/統\d+\s*武\d+\s*知\d+\s*政\d+\s*魅\d+/,`統${e.out.lead} 武${e.out.war} 知${e.out.int} 政${e.out.pol} 魅${e.out.cha}`);
 el.querySelectorAll('.rogue-stat-bonus,.rogue-stat-detail,.rogue-v6-breakdown').forEach(x=>x.remove());const host=el.querySelector('div');if(!host)return;
 const x=document.createElement('div');x.className='rogue-stat-bonus';x.textContent=all.length?`ラン補正：${all.join(' ')}`:'ラン補正：なし';host.appendChild(x);
 if(all.length){const z=document.createElement('div');z.className='rogue-v6-breakdown';const ss=[];if(up.length)ss.push(`強化 ${up.join(' ')}`);if(mat.length)ss.push(`素材 ${mat.join(' ')}`);if(eq.length)ss.push(`装備 ${eq.join(' ')}`);z.textContent=ss.join(' ／ ');host.appendChild(z)}
 const y=document.createElement('div');y.className='rogue-stat-detail';y.textContent=`基礎→現在：統${e.base.lead}→${e.out.lead} 武${e.base.war}→${e.out.war} 知${e.base.int}→${e.out.int} 政${e.base.pol}→${e.out.pol} 魅${e.base.cha}→${e.out.cha}`;host.appendChild(y);
}
function decorate(){if(!isRogue()||state.battle)return;for(const el of document.querySelectorAll('.officer')){const o=own().find(x=>el.textContent.includes(x.name));if(o)rewriteCard(el,o)}}
function markVersion(){
 const small=document.querySelector('header h1 small');if(small)small.textContent='Prototype 0.6';
 let b=document.getElementById('rogueStatEngineBadge');if(!b){b=document.createElement('span');b.id='rogueStatEngineBadge';b.textContent='能力Engine v6';const h=document.querySelector('header>div');if(h)h.appendChild(b)}
}
function settle(){try{if(!isRogue())return;normalize();decorate();markVersion()}catch(e){console.error('ROGUE stat v6:',e)}}
window.render=function(){
 if(!isRogue()){const r=prevRender.apply(this,arguments);markVersion();return r}
 normalize();const r=prevRender.apply(this,arguments);normalize();decorate();markVersion();setTimeout(settle,0);setTimeout(settle,60);return r;
};
window.beginBattle=function(){
 if(isRogue())normalize();const r=prevBeginBattle.apply(this,arguments);
 if(isRogue()&&state?.battle){normalize();for(const u of state.battle.units||[]){if(u.side!=='player')continue;const o=(state.officers||[]).find(x=>x.name===u.name&&isAliveOwn(x));if(!o)continue;for(const k of ['lead','war','int'])u[k]=Number(o[k])||0}}
 return r;
};
const style=document.createElement('style');style.textContent='#rogueStatEngineBadge{display:inline-block;margin:4px 0 0 8px;padding:2px 6px;border:1px solid #8b6a32;border-radius:7px;color:#ffd978;font-size:9px}.rogue-stat-bonus{margin-top:4px;color:#ffd978;font-size:10px;font-weight:700}.rogue-stat-detail,.rogue-v6-breakdown{margin-top:2px;color:#b7d9ae;font-size:9px;line-height:1.35}';document.head.appendChild(style);
setTimeout(()=>{markVersion();settle()},0);
window.HINATA_ROGUE_STAT_V6={normalize,expected,upgradeBonus,materialBonus,equipBonus,countUpgrade,FIXED_BASE};
})();
