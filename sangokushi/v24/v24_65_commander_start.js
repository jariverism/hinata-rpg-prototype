// v24.66 — defending commander starts at the keep, then may move normally
(()=>{
if(window.V2465_COMMANDER_START)return;window.V2465_COMMANDER_START=true;
const V39=window.V2439||{};
function initialState(b){
 if(!b?.v2439LargeSiege||!b.v2439DeploymentDone||b.v2465CommanderStartApplied)return false;
 if(Number(b.day||1)!==1||b.phase!=='player')return false;
 const active=(b.units||[]).filter(u=>!u.v2436Structure&&Number(u.troops)>0);
 return !active.some(u=>u.done||u.movedThisTurn||Number(u.movedDistance)>0);
}
function clearLegacyCommanderLock(commander){
 if(!commander)return;
 // Old siege/defense code could leave the commander with an immobilization state.
 // The commander is only required to START on the keep; it is not a fixed structure.
 commander.done=false;
 commander.movedThisTurn=false;
 commander.movedDistance=0;
 commander.immobileTurns=0;
 commander.skipTurns=0;
 commander.moveRangeBonus=Number.isFinite(Number(commander.moveRangeBonus))?Number(commander.moveRangeBonus):0;
 delete commander.v2432SkipEnemyAction;
 delete commander.v2436Fixed;
 delete commander.v2436Hold;
 delete commander.fixed;
 delete commander.holdPosition;
}
function putCommanderAtKeep(b){
 if(!initialState(b))return false;
 const defender=typeof V39.defenderSide==='function'?V39.defenderSide(b):(b.defense?'player':'enemy');
 const name=b.v2436Commanders?.[defender];
 const commander=(b.units||[]).find(u=>u.side===defender&&u.name===name&&!u.v2436Structure&&Number(u.troops)>0);
 if(!commander)return false;
 const cx=Number(V39.CX??7),cy=Number(V39.CY??6);
 const occupant=(b.units||[]).find(u=>u!==commander&&!u.v2436Structure&&Number(u.troops)>0&&Number(u.x)===cx&&Number(u.y)===cy);
 if(occupant&&occupant.side===defender){
  const ox=Number(commander.x),oy=Number(commander.y);occupant.x=ox;occupant.y=oy;
 }else if(occupant){
  return false;
 }
 commander.x=cx;commander.y=cy;clearLegacyCommanderLock(commander);
 b.v2465CommanderStartApplied=true;
 b.logs=Array.isArray(b.logs)?b.logs:[];
 b.logs.unshift(`守備側総大将${commander.name}隊は本丸中央から指揮を開始する。以後は通常部隊と同じく移動可能。`);
 return true;
}
const previousRender=window.render;
window.render=function(){const b=state?.battle;if(b)putCommanderAtKeep(b);return previousRender.apply(this,arguments)};
setTimeout(()=>{try{if(state?.battle){putCommanderAtKeep(state.battle);window.render()}}catch(e){console.error('v24.66 commander start:',e)}},0);
window.V2465={putCommanderAtKeep,initialState,clearLegacyCommanderLock};
})();
