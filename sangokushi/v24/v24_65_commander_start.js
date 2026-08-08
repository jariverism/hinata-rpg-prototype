// v24.65 — defending commander starts at the keep, then may move normally
(()=>{
if(window.V2465_COMMANDER_START)return;window.V2465_COMMANDER_START=true;
const V39=window.V2439||{};
function initialState(b){
 if(!b?.v2439LargeSiege||!b.v2439DeploymentDone||b.v2465CommanderStartApplied)return false;
 if(Number(b.day||1)!==1||b.phase!=='player')return false;
 const active=(b.units||[]).filter(u=>!u.v2436Structure&&Number(u.troops)>0);
 return !active.some(u=>u.done||u.movedThisTurn||Number(u.movedDistance)>0);
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
  // At true battle start an attacker should never occupy the keep; do not teleport through an enemy.
  return false;
 }
 commander.x=cx;commander.y=cy;commander.done=false;commander.movedThisTurn=false;commander.movedDistance=0;
 b.v2465CommanderStartApplied=true;
 b.logs=Array.isArray(b.logs)?b.logs:[];
 b.logs.unshift(`守備側総大将${commander.name}隊は本丸中央から指揮を開始する。以後は戦況に応じて移動可能。`);
 return true;
}
const previousRender=window.render;
window.render=function(){const b=state?.battle;if(b)putCommanderAtKeep(b);return previousRender.apply(this,arguments)};
setTimeout(()=>{try{if(state?.battle){putCommanderAtKeep(state.battle);window.render()}}catch(e){console.error('v24.65 commander start:',e)}},0);
window.V2465={putCommanderAtKeep,initialState};
})();
