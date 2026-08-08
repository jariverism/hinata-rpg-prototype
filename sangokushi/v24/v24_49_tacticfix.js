// v24.49 — route battle tactics directly to the v24.32 tactic engine
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
function useTactic(){
 const b=state?.battle;if(!b)return;
 ensureTacticState();
 const p=selectedPlayer();if(!p)return;
 if(p.done)return alert(`${p.name}隊はすでに行動済みです。`);
 if(b.v2432TacticUsed[p.name])return alert(`${p.name}はこの戦闘ですでに戦場計略を使用しています。`);
 if(typeof V.playerTactic!=='function')return alert('戦場計略の処理を読み込めませんでした。');
 b.selected=p.name;
 return V.playerTactic();
}
window.battleAction=function(action){
 if(action==='tactic'&&state?.battle)return useTactic();
 return previousBattleAction.apply(this,arguments);
};
function reinforce(){
 if(!state?.battle)return;
 ensureTacticState();
 document.querySelectorAll('[data-ba="tactic"]').forEach(btn=>{
  const p=selectedPlayer();
  btn.style.pointerEvents='auto';btn.style.touchAction='manipulation';
  btn.disabled=!p||p.done||!!state.battle.v2432TacticUsed[p.name];
  btn.onclick=e=>{e.preventDefault();e.stopPropagation();useTactic()};
 });
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-ba="tactic"]');if(!btn||btn.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();useTactic();
},true);
const previousRender=window.render;
window.render=function(){const r=previousRender.apply(this,arguments);reinforce();setTimeout(reinforce,30);return r};
reinforce();
window.V2449={useTactic};
})();
