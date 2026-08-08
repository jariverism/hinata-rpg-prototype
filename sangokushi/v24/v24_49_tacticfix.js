// v24.53 — route battle tactics directly and scale use count by intelligence
(()=>{
if(window.V2449_TACTIC_FIX)return;window.V2449_TACTIC_FIX=true;
const V=window.V2432||{};
const previousBattleAction=window.battleAction;
function selectedPlayer(){
 const b=state?.battle;if(!b)return null;
 return (b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0)
   ||(b.units||[]).find(u=>u.side==='player'&&!u.done&&Number(u.troops)>0)
   ||null;
}
function ensureTacticState(){
 const b=state?.battle;if(!b)return;
 b.v2432TacticUsed=b.v2432TacticUsed||{};
 b.v2432DuelUsed=b.v2432DuelUsed||{};
}
function tacticLimit(p){
 const i=Number(p?.int)||0;
 if(i>=100)return 4;
 if(i>=90)return 3;
 if(i>=80)return 2;
 return 1;
}
function tacticUsed(b,name){
 const v=b?.v2432TacticUsed?.[name];
 if(v===true)return 1;
 return Math.max(0,Number(v)||0);
}
function reconcilePending(){
 const b=state?.battle,pending=b?.v2453PendingTactic;if(!b||!pending)return;
 if(b.v2432TacticUsed?.[pending.name]===true){
  b.v2432TacticUsed[pending.name]=pending.before+1;
  delete b.v2453PendingTactic;
 }
}
function useTactic(){
 const b=state?.battle;if(!b)return;
 ensureTacticState();reconcilePending();
 const p=selectedPlayer();if(!p)return;
 if(p.done)return alert(`${p.name}隊はすでに行動済みです。`);
 const used=tacticUsed(b,p.name),limit=tacticLimit(p);
 if(used>=limit)return alert(`${p.name}はこの戦闘で戦場計略を${limit}回使用済みです。`);
 if(typeof V.playerTactic!=='function')return alert('戦場計略の処理を読み込めませんでした。');
 // v24.32 originally uses a boolean flag. Clear it only while opening the tactic UI,
 // then convert the boolean written on actual execution back into a numeric counter.
 b.v2432TacticUsed[p.name]=0;
 b.v2453PendingTactic={name:p.name,before:used,limit};
 b.selected=p.name;
 return V.playerTactic();
}
window.battleAction=function(action){
 if(action==='tactic'&&state?.battle)return useTactic();
 return previousBattleAction.apply(this,arguments);
};
function reinforce(){
 if(!state?.battle)return;
 ensureTacticState();reconcilePending();
 document.querySelectorAll('[data-ba="tactic"]').forEach(btn=>{
  const p=selectedPlayer();
  btn.style.pointerEvents='auto';btn.style.touchAction='manipulation';
  if(!p){btn.disabled=true;return}
  const used=tacticUsed(state.battle,p.name),limit=tacticLimit(p);
  btn.disabled=!!p.done||used>=limit;
  btn.title=`戦場計略：${used}/${limit}回使用（知力${p.int}）`;
 });
}
document.addEventListener('click',e=>{
 const target=e.target.closest?.('[data-v2432-tactic-target]');
 if(target)setTimeout(()=>{reconcilePending();reinforce()},0);
},true);
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-ba="tactic"]');if(!btn||btn.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();useTactic();
},true);
const previousRender=window.render;
window.render=function(){reconcilePending();const r=previousRender.apply(this,arguments);reinforce();setTimeout(reinforce,30);return r};
reinforce();
window.V2449={useTactic,tacticLimit,tacticUsed};
})();
