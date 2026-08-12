// 日向三國志 ROGUE Prototype 0.12 — canonical Hinata identity / legacy repair
(()=>{
if(window.HINATA_ROGUE_IDENTITY_V12)return;window.HINATA_ROGUE_IDENTITY_V12=true;
const BASE=window.HINATA_CANONICAL_STATS||{};
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'');
const NAME_MAP=new Map(Object.keys(BASE).map(n=>[norm(n),n]));
function canonicalName(name){return NAME_MAP.get(norm(name))||null}
function isHinata(name){return !!canonicalName(name)}
function homeForRepair(preferred){
 if(preferred&&state?.cities?.[preferred]?.force==='日向軍')return preferred;
 if(state?.selected&&state?.cities?.[state.selected]?.force==='日向軍')return state.selected;
 if(state?.rogue?.startCity&&state?.cities?.[state.rogue.startCity]?.force==='日向軍')return state.rogue.startCity;
 return Object.values(state?.cities||{}).find(c=>c.force==='日向軍')?.name||state?.rogue?.startCity||state?.selected||'';
}
function removeBadRewards(names){
 const r=state?.rogue;if(!r)return 0;const set=new Set(names.map(norm));let removed=0;
 if(Array.isArray(r.rewardQueue)){const before=r.rewardQueue.length;r.rewardQueue=r.rewardQueue.filter(x=>!(x?.type==='officer'&&set.has(norm(x?.officer?.name))));removed+=before-r.rewardQueue.length}
 return removed;
}
function repairMisclassified(preferredCity=''){
 if(!state?.rogue||!Array.isArray(state.officers))return [];
 const fixed=[];
 for(const o of state.officers){
  const canon=canonicalName(o?.name);if(!canon)continue;
  if(o.name!==canon)o.name=canon;
  if(o.force==='退場'&&o.status==='戦利品'){
   const wasCapture=(state.logs||[]).some(x=>String(x).includes(`${canon}は捕縛後`));
   o.force='在野';o.status='在野';o.city=homeForRepair(preferredCity);o.loy=Math.max(40,Number(o.loy)||0);o.acted=0;fixed.push(canon);
   state.rogue.converted=Math.max(0,(Number(state.rogue.converted)||0)-1);
   if(wasCapture)state.rogue.captures=Math.max(0,(Number(state.rogue.captures)||0)-1);
  }
 }
 if(fixed.length){removeBadRewards(fixed);state.rogue.rewardOpen=false;try{closeModal()}catch(e){};for(const n of fixed)try{log(`判定修正：${n}は日向坂46メンバーのため戦利品化を取り消し、${homeForRepair(preferredCity)}で在野に復帰した。`)}catch(e){}}
 return fixed;
}
function preserveOwnSnapshot(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&isHinata(o.name)).map(o=>({name:canonicalName(o.name),city:o.city,status:o.status,loy:o.loy,acted:o.acted}))}
function restoreOwn(snapshot){
 if(!snapshot?.length||!state?.rogue)return;
 const bad=[];
 for(const s of snapshot){const o=(state.officers||[]).find(x=>canonicalName(x.name)===s.name);if(!o)continue;if(o.force==='退場'&&o.status==='戦利品'){bad.push(s.name);state.rogue.converted=Math.max(0,(Number(state.rogue.converted)||0)-1)}o.name=s.name;o.force='日向軍';o.city=s.city;o.status=s.status==='君主'?'君主':'一般';o.loy=s.loy;o.acted=s.acted}
 if(bad.length){removeBadRewards(bad);state.rogue.rewardOpen=false}
}
const prevRender=window.render;
if(typeof prevRender==='function')window.render=function(){
 const snap=state?.rogue?preserveOwnSnapshot():[];if(state?.rogue)repairMisclassified();const r=prevRender.apply(this,arguments);if(state?.rogue){restoreOwn(snap);repairMisclassified();mark()}return r;
};
const prevEndBattle=window.endBattle;
if(typeof prevEndBattle==='function')window.endBattle=function(win,retreat){
 const b=state?.battle,target=b?.target,enemyHinata=win&&state?.rogue?(b?.units||[]).filter(u=>u.side==='enemy'&&!u.v2436Structure&&isHinata(u.name)).map(u=>canonicalName(u.name)):[];
 const r=prevEndBattle.apply(this,arguments);
 if(win&&state?.rogue&&enemyHinata.length){
  removeBadRewards(enemyHinata);
  for(const name of enemyHinata){const o=(state.officers||[]).find(x=>canonicalName(x.name)===name);if(!o||o.force==='日向軍')continue;if(o.force==='退場'&&o.status==='戦利品'){state.rogue.converted=Math.max(0,(Number(state.rogue.converted)||0)-1);state.rogue.captures=Math.max(0,(Number(state.rogue.captures)||0)-1)}o.name=name;o.force='在野';o.status='在野';o.city=target||homeForRepair();o.loy=40;o.acted=0}
  state.rogue.rewardOpen=false;
 }
 repairMisclassified(target);return r;
};
const prevShowModal=window.showModal;
if(typeof prevShowModal==='function')window.showModal=function(html){
 const m=String(html||'').match(/<h2>捕縛：([^<]+)<\/h2>/),name=m&&canonicalName(m[1]);
 if(name&&String(html).includes('配下にはなりません')){
  repairMisclassified();const city=homeForRepair();return prevShowModal.call(this,`<h2>${name}は日向坂46メンバー</h2><p>戦利品化は行いません。${city?`${city}で在野となり、登用すれば仲間にできます。`:'登用対象として残ります。'}</p><button data-close>閉じる</button>`)
 }
 return prevShowModal.apply(this,arguments);
};
function mark(){const s=document.querySelector?.('header h1 small');if(s)s.textContent='Prototype 0.12';const b=document.getElementById?.('rogueStatEngineBadge');if(b)b.textContent='能力Engine v8 / 共通名簿 v12'}
setTimeout(()=>{try{repairMisclassified();mark()}catch(e){console.error('ROGUE identity v12:',e)}},0);
window.HINATA_ROGUE_IDENTITY_V12_API={isHinata,canonicalName,repairMisclassified,count:Object.keys(BASE).length};
})();
