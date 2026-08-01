let v16BattleEnding=false;

function v16NormalizeBattleUnits(){
 if(!state||!state.battle)return;
 state.battle.units.forEach(u=>{if(!Number.isFinite(u.troops)||u.troops<0)u.troops=0});
}

function v16CheckBattleEnd(){
 if(!state||!state.battle||v16BattleEnding)return false;
 v16NormalizeBattleUnits();
 const playersAlive=state.battle.units.some(u=>u.side==='player'&&u.troops>0);
 const enemiesAlive=state.battle.units.some(u=>u.side==='enemy'&&u.troops>0);
 if(playersAlive&&enemiesAlive)return false;
 v16BattleEnding=true;
 const playerWon=playersAlive&&!enemiesAlive;
 if(state.battle.logs){
  state.battle.logs.unshift(playerWon?'敵軍を殲滅した。戦闘に勝利！':'自軍が全滅した。');
 }
 setTimeout(()=>{
  try{endBattleGroup(playerWon,false)}finally{v16BattleEnding=false}
 },120);
 return true;
}

const v16BaseCompleteUnitAction=completeUnitAction;
completeUnitAction=function(p,msg){
 if(!state||!state.battle)return;
 p.actionDone=true;
 if(msg)state.battle.logs.unshift(msg);
 battleMoveMode=false;
 if(v16CheckBattleEnd())return;
 const next=state.battle.units.find(x=>x.side==='player'&&x.troops>0&&!x.actionDone);
 if(next)state.battle.selected=next.name;
 render();
};

const v16BaseEnemyBattleTurn=enemyBattleTurn;
enemyBattleTurn=function(){
 if(!state||!state.battle)return;
 v16BaseEnemyBattleTurn();
 v16NormalizeBattleUnits();
};

const v16BaseEndPlayerPhase=endPlayerPhase;
endPlayerPhase=function(){
 if(v16CheckBattleEnd())return;
 return v16BaseEndPlayerPhase();
};

const v16BaseRenderBattle=renderBattle;
renderBattle=function(){
 if(v16CheckBattleEnd())return;
 return v16BaseRenderBattle();
};

const v16BaseEndBattleGroup=endBattleGroup;
endBattleGroup=function(win,retreat){
 if(!state||!state.battle){v16BattleEnding=false;return}
 v16NormalizeBattleUnits();
 return v16BaseEndBattleGroup(win,retreat);
};
