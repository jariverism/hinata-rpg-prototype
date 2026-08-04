// v24.32 UI — direct terrain controls and new battle commands
(()=>{
const V=window.V2432;if(!V)return;
const {typeOf,key,alive,occupiedAt,currentUnit,ensureBattle,terrainAt,reachableCells,legalTargets,playerAttack,playerDuel,playerTactic}=V;
const previousRender=window.render;
const previousBattleAction=window.battleAction;
const previousEndBattle=window.endBattle;
function enterMode(action){
 const b=state.battle,p=currentUnit();if(!p||p.done)return;
 if(action==='move'){
  if(p.immobileTurns>0){b.logs.unshift(`${p.name}隊は落とし穴のため移動できません。攻撃や待機は可能です。`);return render()}
  if(p.movedThisTurn){b.logs.unshift(`${p.name}隊はすでに移動済みです。`);return render()}
  b.mode='move';b.v2432Mode='move';return render();
 }
 const targets=legalTargets(p,action);if(!targets.length){b.logs.unshift('射程内に対象がいません。');return render()}
 b.mode=action;b.v2432Mode=action;render();
}
window.battleAction=function(action){
 if(!state?.battle)return previousBattleAction.apply(this,arguments);
 if(action==='move'||action==='attack'||action==='fire')return enterMode(action);
 if(action==='duel')return playerDuel();
 if(action==='tactic')return playerTactic();
 return previousBattleAction.apply(this,arguments);
};

function selectOwn(u){const b=state.battle;b.selected=u.name;b.mode=u.done?null:(u.movedThisTurn?'attack':'move');b.v2432Mode=b.mode;render()}
function movePlayer(x,y){
 const b=state.battle,p=currentUnit(),map=reachableCells(p),k=key(x,y);if(!p||!map.has(k))return;
 const cost=map.get(k);p.x=x;p.y=y;p.movedDistance=cost;p.movedThisTurn=true;p.moveRangeBonus=0;b.mode=null;b.v2432Mode=null;
 if(typeOf(p)==='騎兵'){b.logs.unshift(`${p.name}隊が${cost}移動力分進軍。続けて攻撃できます。`);b.mode='attack';b.v2432Mode='attack';render()}
 else{p.done=true;b.logs.unshift(`${p.name}隊が${cost}移動力分進軍。`);window.afterPlayerAction()}
}
function decorateBattle(){
 const b=state?.battle;if(!b)return;ensureBattle(b);
 const p=currentUnit(),mode=b.v2432Mode||b.mode||(p&&!p.done?(p.movedThisTurn?'attack':'move'):null),reach=mode==='move'?reachableCells(p):new Map();
 const targets=new Set((mode==='fire'?legalTargets(p,'fire'):legalTargets(p,'attack')).map(u=>u.name));
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  cell.classList.remove('v2423-reachable','v2423-attackable','v2423-fireable','v2432-mountain-blocked');
  const [x,y]=cell.dataset.cell.split(',').map(Number),u=occupiedAt(b,x,y),k=key(x,y),terr=terrainAt(b,x,y);
  cell.dataset.terrain=terr;cell.title=terr==='mountain'?'山岳：騎兵侵入不可／歩兵・槍兵・弩兵は移動力2消費／防御28%上昇':terr==='water'?'水域：全兵科侵入不可':terr==='hill'?'丘陵：防御15%上昇':terr==='forest'?'森林：防御10%上昇':'';
  if(!u&&reach.has(k))cell.classList.add('v2423-reachable');
  if(!u&&terr==='mountain'&&p&&typeOf(p)==='騎兵')cell.classList.add('v2432-mountain-blocked');
  if(u?.side==='enemy'&&targets.has(u.name))cell.classList.add(mode==='fire'?'v2423-fireable':'v2423-attackable');
  cell.onclick=()=>{
   const occ=occupiedAt(b,x,y);if(occ?.side==='player')return selectOwn(occ);
   if(occ?.side==='enemy'){
    const action=mode==='fire'?'fire':'attack';if(legalTargets(p,action).includes(occ))return playerAttack(action,occ);
    b.logs.unshift('その敵は射程外です。');return render();
   }
   if(mode==='move')return movePlayer(x,y);
  };
 });
 document.querySelectorAll('[data-unit]').forEach(el=>{
  const u=b.units.find(x=>x.name===el.dataset.unit&&x.troops>0);if(!u)return;
  el.onclick=e=>{e.stopPropagation();if(u.side==='player')selectOwn(u);else{const action=mode==='fire'?'fire':'attack';if(p&&legalTargets(p,action).includes(u))playerAttack(action,u)}};
 });
 const actions=document.querySelector('.battle-actions');
 if(actions&&!actions.querySelector('[data-ba="duel"]')){
  const duel=document.createElement('button');duel.dataset.ba='duel';duel.textContent='一騎打ち';
  const tactic=document.createElement('button');tactic.dataset.ba='tactic';tactic.textContent='戦場計略';
  const fire=actions.querySelector('[data-ba="fire"]');fire?.after(duel,tactic);
 }
 document.querySelectorAll('[data-ba]').forEach(btn=>{btn.onclick=()=>window.battleAction(btn.dataset.ba)});
 const duelBtn=document.querySelector('[data-ba="duel"]'),tacticBtn=document.querySelector('[data-ba="tactic"]');
 if(duelBtn)duelBtn.disabled=!p||p.done||!!b.v2432DuelUsed[p.name];
 if(tacticBtn){tacticBtn.disabled=!p||p.done||!!b.v2432TacticUsed[p.name];tacticBtn.textContent=p?`戦場計略（知${p.int}）`:'戦場計略'}
 const phase=document.querySelector('.phase');if(phase&&!phase.querySelector('.v2432-field'))phase.insertAdjacentHTML('beforeend',`<br><small class="v2432-field">戦場：${b.v2432TerrainProfile}　山岳・水域は進軍経路を制限</small>`);
 const side=document.querySelector('.battle > .panel:last-child');
 if(side){let g=side.querySelector('.v2432-terrain-guide');if(!g){g=document.createElement('div');g.className='v2432-terrain-guide';side.querySelector('.battle-actions')?.before(g)}
  if(g)g.innerHTML='<b>地形</b>　<span>▲山岳</span> 騎兵不可・他兵科移動力2・防御+28%　<span>≈水域</span> 全兵科不可<br><small>高知力武将は「戦場計略」から裏切り・流言・落とし穴を使用できます。</small>';
 }
 const title=document.querySelector('.battle .title');if(title&&b.defense)title.textContent=`${b.target}防衛戦`;
}
window.render=function(){
 if(state?.battle)ensureBattle(state.battle);
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(()=>{try{decorateBattle()}catch(e){console.error('v24.32 battle:',e)}},30);
 return result;
};

window.endBattle=function(){const b=state?.battle;if(b){delete b.v2432Mode}return previousEndBattle.apply(this,arguments)};

const style=document.createElement('style');
style.textContent=`
.battle-grid .cell.mountain{background:linear-gradient(145deg,#675e4b,#342f28);position:relative}.battle-grid .cell.mountain:before{content:'▲';position:absolute;left:4px;top:1px;color:#c7b68b;font-size:13px;opacity:.9}.battle-grid .cell.water{background:repeating-linear-gradient(165deg,#1f5068 0 6px,#26657e 6px 11px);position:relative}.battle-grid .cell.water:before{content:'≈';position:absolute;left:4px;top:0;color:#a5e1f0;font-size:15px}.battle-grid .cell.coast{background:linear-gradient(135deg,#b99c62 0 48%,#2a6278 52%)}.battle-grid .cell.bridge{background:linear-gradient(90deg,#305e70 0 28%,#8b7146 30% 70%,#305e70 72%)}
.battle-grid .cell.v2432-mountain-blocked{filter:saturate(.55);box-shadow:inset 0 0 0 2px rgba(175,95,75,.45)}
.v2432-terrain-guide{margin:8px 0;padding:9px 10px;border:1px solid #6f674b;background:#17160f;color:#ded4b0;font-size:11px;line-height:1.55}.v2432-terrain-guide span{color:#ffe09a;font-weight:700}.v2432-field{color:#d5c58e}.v2432-duel-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.v2432-duel-actions button{min-height:50px}@media(max-width:560px){.v2432-duel-actions{grid-template-columns:1fr}}
`;
document.head.appendChild(style);
})();
