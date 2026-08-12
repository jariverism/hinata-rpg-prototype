// 日向三國志 ROGUE Prototype 0.13 — capture only actual battle participants
(()=>{
if(window.HINATA_ROGUE_CAPTURE_V13)return;window.HINATA_ROGUE_CAPTURE_V13=true;
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'');
function activeEnemyUnits(b){return (b?.units||[]).filter(u=>u.side==='enemy'&&!u.v2436Structure&&Number(u.troops)>0)}
function recordBaseline(b){
 if(!b||b.rogueV13CaptureBaseline)return b?.rogueV13CaptureBaseline||[];
 const names=[...new Set(activeEnemyUnits(b).map(u=>norm(u.rogueCloneOf||u.name)).filter(Boolean))];
 b.rogueV13CaptureBaseline=names;
 return names;
}
function officerForUnit(u){
 const n=norm(u?.rogueCloneOf||u?.name);return (state?.officers||[]).find(o=>norm(o.name)===n)||null;
}
function suppressionReason(b,u){
 const baseline=new Set(b?.rogueV13CaptureBaseline||[]),name=norm(u?.rogueCloneOf||u?.name),o=officerForUnit(u);
 if(o?.status==='死亡')return '死亡済み';
 if(baseline.size&&!baseline.has(name))return '戦闘開始後に追加';
 return null;
}
function suppressIneligible(b){
 if(!b)return[];const changed=[];
 for(const u of b.units||[]){
  if(u.side!=='enemy'||u.v2436Structure)continue;
  const reason=suppressionReason(b,u);if(!reason)continue;
  changed.push({u,old:u.v2436Structure,reason});u.v2436Structure=true;u.rogueV13CaptureSuppressed=reason;
 }
 if(changed.length){
  b.logs=b.logs||[];
  for(const x of changed)b.logs.unshift(`ROGUE捕縛判定：${x.u.name}は${x.reason}のため、この戦闘の捕縛候補外。`);
 }
 return changed;
}
function restoreSuppressed(changed){for(const x of changed||[]){x.u.v2436Structure=x.old;delete x.u.rogueV13CaptureSuppressed}}
const prevBegin=window.beginBattle;
if(typeof prevBegin==='function')window.beginBattle=function(){const r=prevBegin.apply(this,arguments);if(state?.rogue&&state?.battle)recordBaseline(state.battle);return r};
const prevRender=window.render;
if(typeof prevRender==='function')window.render=function(){if(state?.rogue&&state?.battle&&!state.battle.rogueV13CaptureBaseline)recordBaseline(state.battle);const r=prevRender.apply(this,arguments);mark();return r};
const prevEnd=window.endBattle;
if(typeof prevEnd==='function')window.endBattle=function(win,retreat){
 const b=state?.battle;if(state?.rogue&&b&&!b.rogueV13CaptureBaseline)recordBaseline(b);
 const changed=win&&state?.rogue&&b?suppressIneligible(b):[];
 try{return prevEnd.apply(this,arguments)}finally{restoreSuppressed(changed)}
};
function mark(){const s=document.querySelector?.('header h1 small');if(s)s.textContent='Prototype 0.13';const b=document.getElementById?.('rogueStatEngineBadge');if(b)b.textContent='能力Engine v8 / 捕縛整合 v13'}
setTimeout(mark,0);
window.HINATA_ROGUE_CAPTURE_V13_API={recordBaseline,suppressionReason,suppressIneligible,restoreSuppressed,norm};
})();
