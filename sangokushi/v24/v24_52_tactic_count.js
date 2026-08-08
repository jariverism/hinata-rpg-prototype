// v24.52 — battle tactic use limit scales with intelligence
(()=>{
if(window.V2452_TACTIC_COUNT)return;window.V2452_TACTIC_COUNT=true;
const V=window.V2432||{};
function limitFor(unit){
 const i=Number(unit?.int)||0;
 if(i>=100)return 4;
 if(i>=90)return 3;
 if(i>=80)return 2;
 return 1;
}
function usedFor(b,name){
 const v=b?.v2432TacticUsed?.[name];
 if(v===true)return 1; // migrate old saves/battles
 return Math.max(0,Number(v)||0);
}
function selectedPlayer(){
 const b=state?.battle;if(!b)return null;
 return (b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0)
   ||(b.units||[]).find(u=>u.side==='player'&&!u.done&&Number(u.troops)>0)||null;
}
function useTactic(){
 const b=state?.battle,p=selectedPlayer();if(!b||!p)return;
 b.v2432TacticUsed=b.v2432TacticUsed||{};
 if(p.done)return alert(`${p.name}隊はすでに行動済みです。`);
 const used=usedFor(b,p.name),limit=limitFor(p);
 if(used>=limit)return alert(`${p.name}は戦場計略を上限${limit}回まで使用済みです。`);
 if(typeof V.playerTactic!=='function')return alert('戦場計略の処理を読み込めませんでした。');
 // v24.32 checks truthiness. Temporarily clear it, then convert its boolean mark into a count.
 const before=used;b.v2432TacticUsed[p.name]=0;b.selected=p.name;
 V.playerTactic();
 // Target selection is asynchronous; capture clicks and convert after execution below.
 b.v2452PendingTactic={name:p.name,before,limit};
}
function reconcile(){
 const b=state?.battle,pending=b?.v2452PendingTactic;if(!b||!pending)return;
 const raw=b.v2432TacticUsed?.[pending.name];
 if(raw===true){b.v2432TacticUsed[pending.name]=pending.before+1;delete b.v2452PendingTactic;}
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-v2432-tactic-target]');if(!btn)return;
 setTimeout(()=>{reconcile();reinforce()},0);
},true);
function reinforce(){
 const b=state?.battle;if(!b)return;
 reconcile();
 document.querySelectorAll('[data-ba="tactic"]').forEach(btn=>{
  const p=selectedPlayer();if(!p)return;
  const used=usedFor(b,p.name),limit=limitFor(p);
  btn.disabled=!!p.done||used>=limit;
  btn.title=`戦場計略 ${used}/${limit}回使用`;
 });
}
const previousBattleAction=window.battleAction;
window.battleAction=function(action){if(action==='tactic'&&state?.battle)return useTactic();return previousBattleAction.apply(this,arguments)};
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-ba="tactic"]');if(!btn||btn.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();useTactic();
},true);
const previousRender=window.render;
window.render=function(){reconcile();const r=previousRender.apply(this,arguments);setTimeout(reinforce,0);return r};
window.V2452={limitFor,usedFor,useTactic};
})();
