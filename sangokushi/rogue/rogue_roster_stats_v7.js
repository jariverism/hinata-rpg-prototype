// 日向三國志 ROGUE Prototype 0.7 — full Hinata roster stat lifecycle
(()=>{
if(window.HINATA_ROGUE_ROSTER_STAT_V7)return;window.HINATA_ROGUE_ROSTER_STAT_V7=true;
const prevRender=window.render,prevBeginBattle=window.beginBattle;
const KEYS=['lead','war','int','pol','cha'];
const LABEL={lead:'統',war:'武',int:'知',pol:'政',cha:'魅'};
const STAT_UPGRADES={
 lead2:{stat:'lead',amount:2},war2:{stat:'war',amount:2},int2:{stat:'int',amount:2},pol2:{stat:'pol',amount:2},cha2:{stat:'cha',amount:2},
 mikuni4:{stat:'lead',amount:4,only:'髙橋未来虹'},hinano4:{stat:'int',amount:4,only:'上村ひなの'},mari4:{stat:'lead',amount:4,only:'森本茉莉'},haruyo4:{stat:'war',amount:4,only:'山口陽世'}
};
const THIRD_BASE=window.HINATA_ROGUE_STAT_V6?.FIXED_BASE||{
 '髙橋未来虹':{lead:95,war:95,int:88,pol:75,cha:89},'上村ひなの':{lead:78,war:91,int:65,pol:84,cha:91},
 '森本茉莉':{lead:84,war:84,int:72,pol:80,cha:88},'山口陽世':{lead:90,war:76,int:55,pol:70,cha:86}
};
function z(){return{lead:0,war:0,int:0,pol:0,cha:0}}
function copy(o){return Object.fromEntries(KEYS.map(k=>[k,Number(o?.[k])||0]))}
function isRogue(){return !!state?.rogue}
function hinataNames(){
 const s=new Set(Object.keys(THIRD_BASE));
 try{(HINATA_START||[]).forEach(o=>s.add(o.name))}catch(e){}
 try{(window.HINATA_WORLD||[]).forEach(x=>s.add(x[0]))}catch(e){}
 try{(window.V2458?.FIFTH||[]).forEach(o=>s.add(o.name))}catch(e){}
 return s;
}
function isHinata(name){return hinataNames().has(name)}
function own(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&isHinata(o.name)&&!['死亡','捕虜'].includes(o.status))}
function countUpgrade(id){const x=state?.rogue?.upgradeIds;if(!x)return 0;const v=x[id];return Number.isFinite(Number(v))?Math.max(0,Number(v)):v?1:0}
function ensure(){
 if(!isRogue())return null;const r=state.rogue;
 r.rosterBaseV7=r.rosterBaseV7||{};r.statUpgradeEventsV7=Array.isArray(r.statUpgradeEventsV7)?r.statUpgradeEventsV7:[];
 r.statUpgradeSeenV7=r.statUpgradeSeenV7||{};r.statMaterialV7=Array.isArray(r.statMaterialV7)?r.statMaterialV7:[];r.statMaterialSeenV7=r.statMaterialSeenV7||{};
 if(r.rosterStatVersion!==7){r.rosterStatVersion=7;delete r.statLedger;delete r.statEventsV3;delete r.statBaseV3;delete r.statBaseV6;}
 return r;
}
function fifthData(name){return (window.V2458?.FIFTH||[]).find(x=>x.name===name)||null}
function baseForOfficer(o){
 const r=ensure();if(!r||!o)return z();
 if(r.rosterBaseV7[o.name])return r.rosterBaseV7[o.name];
 if(THIRD_BASE[o.name])return r.rosterBaseV7[o.name]={...THIRD_BASE[o.name]};
 const f=fifthData(o.name);if(f)return r.rosterBaseV7[o.name]={lead:f.lead,war:f.war,int:f.int,pol:f.pol,cha:f.cha};
 if(o.rogueBaseV6)return r.rosterBaseV7[o.name]={...o.rogueBaseV6};
 if(state.rogue?.statBaseV6?.[o.name])return r.rosterBaseV7[o.name]={...state.rogue.statBaseV6[o.name]};
 // Non-third/non-fifth members use the post-common-patch value generated at run start as this run's native base.
 return r.rosterBaseV7[o.name]=copy(o);
}
function captureAllBases(){
 if(!isRogue())return;ensure();
 for(const o of state.officers||[]){if(isHinata(o.name))baseForOfficer(o)}
}
function upgradeNameMap(){const m={};for(const u of window.HINATA_ROGUE_RULES?.UPGRADE_POOL||[])m[u.name]=u.id;return m}
function initialRoster(){return new Set(Object.keys(THIRD_BASE))}
function reconstructLegacyUpgradeEvents(){
 const r=ensure();if(!r||r.statV7LegacyReconstructed)return;
 const hasAny=Object.keys(STAT_UPGRADES).some(id=>countUpgrade(id)>0);if(!hasAny){r.statV7LegacyReconstructed=true;return}
 const nameToId=upgradeNameMap(),roster=initialRoster(),events=[],counts={};
 // logs are newest-first; replay oldest -> newest to recover who was present when an upgrade was chosen.
 for(const raw of [...(state.logs||[])].reverse()){
  const s=String(raw),join=s.match(/(?:が|の)([^、。]+?)の登用に成功|([^、。]+?)が登用に応じ/);
  const joined=(join?.[1]||join?.[2]||'').trim();if(joined&&isHinata(joined))roster.add(joined);
  const um=s.match(/ラン強化「([^」]+)」を獲得/);if(!um)continue;const id=nameToId[um[1]],d=STAT_UPGRADES[id];if(!d)continue;
  counts[id]=(counts[id]||0)+1;events.push({id,stat:d.stat,amount:d.amount,recipients:d.only?[d.only]:[...roster],legacy:true});
 }
 for(const [id,d] of Object.entries(STAT_UPGRADES)){
  const want=countUpgrade(id),have=counts[id]||0;
  for(let i=have;i<want;i++)events.push({id,stat:d.stat,amount:d.amount,recipients:d.only?[d.only]:own().map(o=>o.name),legacyFallback:true});
  r.statUpgradeSeenV7[id]=want;
 }
 r.statUpgradeEventsV7=events;r.statV7LegacyReconstructed=true;
}
function syncNewUpgradeEvents(){
 const r=ensure();if(!r)return;reconstructLegacyUpgradeEvents();
 for(const [id,d] of Object.entries(STAT_UPGRADES)){
  const now=countUpgrade(id),seen=Number(r.statUpgradeSeenV7[id])||0;
  if(now>seen){for(let i=seen;i<now;i++)r.statUpgradeEventsV7.push({id,stat:d.stat,amount:d.amount,recipients:d.only?[d.only]:own().map(o=>o.name),turn:state.turn});}
  r.statUpgradeSeenV7[id]=now;
 }
 // Legacy direct-mod totals must never leak old upgrades into members recruited later.
 if(r.mods){for(const k of ['statLead','statWar','statInt','statPol','statCha'])r.mods[k]=0}
}
function syncMaterials(){
 const r=ensure();if(!r)return;const map={統率:'lead',武力:'war',知力:'int',政治:'pol',魅力:'cha'};
 for(const line of state.logs||[]){const s=String(line),m=s.match(/(.+?)を(統率|武力|知力|政治|魅力)の強化素材として消費。(.+?)の(?:統率|武力|知力|政治|魅力)＋(\d+)/);if(!m)continue;const key=s;if(r.statMaterialSeenV7[key])continue;r.statMaterialSeenV7[key]=1;r.statMaterialV7.push({source:m[1],name:m[3],stat:map[m[2]],amount:Number(m[4])||0,key})}
}
function upgradeBonus(name){const b=z();for(const e of state?.rogue?.statUpgradeEventsV7||[])if((e.recipients||[]).includes(name)&&KEYS.includes(e.stat))b[e.stat]+=Number(e.amount)||0;return b}
function materialBonus(name){const b=z();for(const e of state?.rogue?.statMaterialV7||[])if(e.name===name&&KEYS.includes(e.stat))b[e.stat]+=Number(e.amount)||0;return b}
function equipBonus(o){const b=z(),g=o?.rogueEquip;if(g&&KEYS.includes(g.stat))b[g.stat]+=Number(g.amount)||0;return b}
function expected(o){const base=baseForOfficer(o),up=upgradeBonus(o.name),mat=materialBonus(o.name),eq=equipBonus(o),total=z(),out={};for(const k of KEYS){total[k]=up[k]+mat[k]+eq[k];out[k]=(Number(base[k])||0)+total[k]}return{base:{...base},up,mat,eq,total,out}}
function normalizeOwn(){
 if(!isRogue())return false;ensure();captureAllBases();syncNewUpgradeEvents();syncMaterials();let changed=false;
 for(const o of own()){const e=expected(o);for(const k of KEYS)if((Number(o[k])||0)!==e.out[k]){o[k]=e.out[k];changed=true}o.rogueBaseV7={...e.base};o.rogueRunBonusV7={...e.total}}
 return changed;
}
function p(v){return KEYS.filter(k=>Number(v[k])||0).map(k=>`${LABEL[k]}+${v[k]}`)}
function decorate(){
 if(!isRogue()||state.battle)return;
 for(const el of document.querySelectorAll('.officer')){
  const name=el.querySelector('b')?.textContent?.trim(),o=own().find(x=>x.name===name);if(!o)continue;const e=expected(o);
  el.querySelectorAll('.rogue-stat-bonus,.rogue-stat-detail,.rogue-v6-breakdown,.rogue-v7-breakdown').forEach(x=>x.remove());const host=el.querySelector('div');if(!host)continue;
  const a=document.createElement('div');a.className='rogue-stat-bonus';const all=p(e.total);a.textContent=all.length?`ラン補正：${all.join(' ')}`:'ラン補正：なし';host.appendChild(a);
  if(all.length){const b=document.createElement('div');b.className='rogue-v7-breakdown';const xs=[];if(p(e.up).length)xs.push(`強化 ${p(e.up).join(' ')}`);if(p(e.mat).length)xs.push(`素材 ${p(e.mat).join(' ')}`);if(p(e.eq).length)xs.push(`装備 ${p(e.eq).join(' ')}`);b.textContent=xs.join(' ／ ');host.appendChild(b)}
  const d=document.createElement('div');d.className='rogue-stat-detail';d.textContent=`基礎→現在：統${e.base.lead}→${e.out.lead} 武${e.base.war}→${e.out.war} 知${e.base.int}→${e.out.int} 政${e.base.pol}→${e.out.pol} 魅${e.base.cha}→${e.out.cha}`;host.appendChild(d);
 }
}
function mark(){const s=document.querySelector('header h1 small');if(s)s.textContent='Prototype 0.7';let b=document.getElementById('rogueStatEngineBadge');if(b)b.textContent='能力Engine v7'}
function settle(){if(!isRogue())return;normalizeOwn();decorate();mark()}
window.render=function(){const r=prevRender.apply(this,arguments);if(isRogue()){captureAllBases();normalizeOwn();decorate();mark();setTimeout(settle,0);setTimeout(settle,60)}return r};
window.beginBattle=function(){if(isRogue())normalizeOwn();const r=prevBeginBattle.apply(this,arguments);if(isRogue()&&state?.battle){normalizeOwn();for(const u of state.battle.units||[]){if(u.side!=='player'||!isHinata(u.name))continue;const o=(state.officers||[]).find(x=>x.name===u.name&&x.force==='日向軍');if(!o)continue;for(const k of ['lead','war','int'])u[k]=Number(o[k])||0}}return r};
const style=document.createElement('style');style.textContent='.rogue-v7-breakdown{margin-top:2px;color:#b7d9ae;font-size:9px;line-height:1.35}';document.head.appendChild(style);
setTimeout(()=>{try{if(isRogue()){captureAllBases();settle()}mark()}catch(e){console.error('ROGUE roster stat v7:',e)}},0);
window.HINATA_ROGUE_ROSTER_V7={normalizeOwn,expected,baseForOfficer,captureAllBases,upgradeBonus,materialBonus,equipBonus,reconstructLegacyUpgradeEvents,syncNewUpgradeEvents,hinataNames};
})();
