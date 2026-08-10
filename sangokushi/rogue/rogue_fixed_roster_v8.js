// 日向三國志 ROGUE Prototype 0.8 — canonical fixed bases for every Hinata officer
(()=>{
if(window.HINATA_ROGUE_FIXED_ROSTER_V8)return;window.HINATA_ROGUE_FIXED_ROSTER_V8=true;
const KEYS=['lead','war','int','pol','cha'];
const BASE=window.HINATA_CANONICAL_STATS||{};
const V7=window.HINATA_ROGUE_ROSTER_V7;
function isRogue(){return !!state?.rogue}
function ownCanonical(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&BASE[o.name]&&!['死亡','捕虜'].includes(o.status))}
function ensureBases(){
 if(!isRogue())return;const r=state.rogue;r.rosterBaseV7=r.rosterBaseV7||{};
 for(const o of state.officers||[]){const b=BASE[o.name];if(b)r.rosterBaseV7[o.name]={...b}}
 r.rosterStatVersion=8;r.fixedRosterVersion=8;
}
function bonus(name,kind){try{return V7?.[kind]?.(name)||{}}catch(e){return{}}}
function equipment(o){try{return V7?.equipBonus?.(o)||{}}catch(e){return{}}}
function normalize(){
 if(!isRogue())return false;ensureBases();try{V7?.normalizeOwn?.()}catch(e){}
 let changed=false;
 for(const o of ownCanonical()){
  const base=BASE[o.name],up=bonus(o.name,'upgradeBonus'),mat=bonus(o.name,'materialBonus'),eq=equipment(o);
  for(const k of KEYS){const want=(Number(base[k])||0)+(Number(up[k])||0)+(Number(mat[k])||0)+(Number(eq[k])||0);if(Number(o[k])!==want){o[k]=want;changed=true}}
  o.rogueBaseV8={...base};o.rogueRunBonusV8=Object.fromEntries(KEYS.map(k=>[k,(Number(up[k])||0)+(Number(mat[k])||0)+(Number(eq[k])||0)]));
 }
 return changed;
}
function rewriteCards(){
 if(!isRogue()||state.battle)return;
 for(const el of document.querySelectorAll('.officer')){
  const name=el.querySelector('b')?.textContent?.trim(),o=ownCanonical().find(x=>x.name===name);if(!o)continue;
  const small=el.querySelector('small');if(small)small.textContent=small.textContent.replace(/統\d+\s*武\d+\s*知\d+\s*政\d+\s*魅\d+/,`統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}`);
  const detail=el.querySelector('.rogue-stat-detail');if(detail){const b=BASE[name];detail.textContent=`基礎→現在：統${b.lead}→${o.lead} 武${b.war}→${o.war} 知${b.int}→${o.int} 政${b.pol}→${o.pol} 魅${b.cha}→${o.cha}`}
 }
}
function mark(){const s=document.querySelector('header h1 small');if(s)s.textContent='Prototype 0.8';let b=document.getElementById('rogueStatEngineBadge');if(b)b.textContent='能力Engine v8'}
const prevRender=window.render;
window.render=function(){if(isRogue())normalize();const r=prevRender.apply(this,arguments);if(isRogue()){normalize();rewriteCards();mark();setTimeout(()=>{normalize();rewriteCards();mark()},0)}return r};
const prevBeginBattle=window.beginBattle;
window.beginBattle=function(){if(isRogue())normalize();const r=prevBeginBattle.apply(this,arguments);if(isRogue()&&state?.battle){normalize();for(const u of state.battle.units||[]){if(u.side!=='player'||!BASE[u.name])continue;const o=(state.officers||[]).find(x=>x.name===u.name&&x.force==='日向軍');if(!o)continue;for(const k of ['lead','war','int'])u[k]=Number(o[k])||0}}return r};
setTimeout(()=>{try{if(isRogue()){normalize();rewriteCards()}mark()}catch(e){console.error('ROGUE fixed roster v8:',e)}},0);
window.HINATA_ROGUE_FIXED_V8={normalize,ensureBases,BASE,count:Object.keys(BASE).length};
})();
