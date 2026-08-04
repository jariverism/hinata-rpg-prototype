// v24.27 fix — stop the enemy phase immediately when a ruler unit is defeated
(()=>{
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function typeOf(u){const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function alive(b,side){return b.units.filter(u=>u.side===side&&u.troops>0)}
function moveRange(u){return Math.max(1,(Number(window.TROOP_TYPE_INFO?.[typeOf(u)]?.move)||2)+(Number(u?.moveRangeBonus)||0))}
function terrainAt(b,u){return String(b?.terrain?.[Number(u.y)*9+Number(u.x)]||'')}
function leadershipDefense(target){return 1-clamp(((Number(target?.lead)||50)-50)*.003,-.09,.15)}
function physicalModifier(b,attacker,target,distance){
 const a=typeOf(attacker),d=typeOf(target);let mult=1,labels=[];
 if(a==='槍兵'&&d==='騎兵'){mult*=1.35;labels.push('槍兵の迎撃')}
 if(a==='騎兵'&&d==='槍兵'){mult*=.75;labels.push('槍列に阻まれる')}
 if(a==='騎兵'&&d==='弩兵'){mult*=1.30;labels.push('弩兵へ騎馬攻撃')}
 if(a==='騎兵'&&(attacker.movedDistance||0)>=2){mult*=1.20;labels.push('騎馬突撃')}
 if(a==='弩兵'){
  if(distance<=1){mult*=.65;labels.push('弩兵の接近戦')}
  else if(d==='槍兵'){mult*=1.25;labels.push('槍兵へ遠射')}
  else{mult*=1.10;labels.push('遠距離射撃')}
 }
 if(a==='剣盾兵'&&d==='弩兵'&&distance<=1){mult*=1.25;labels.push('弩兵の懐へ侵入')}
 if(d==='剣盾兵'){
  mult*=.90;labels.push('盾防御');
  if(/forest|wood|fort|castle|森|林|城/i.test(terrainAt(b,target))){mult*=.90;labels.push('地形防御')}
 }
 return {mult,labels};
}
function normalDamage(b,attacker,target,distance){
 let value=90+(Number(attacker.war)||50)*2+(Number(attacker.lead)||50)*.8+(Number(attacker.troops)||0)*.03+rnd(0,100);
 if(attacker.weakenTurns>0)value*=.65;
 const role=physicalModifier(b,attacker,target,distance);value*=role.mult;
 const leadMult=leadershipDefense(target);value*=leadMult;
 return {damage:Math.max(1,Math.floor(value)),role,leadMult};
}
function applyDamage(b,target,damage){
 if(target.side==='player'&&(b.playerGuardTurns||0)>0)damage=Math.floor(damage*.7);
 target.troops=Math.max(0,target.troops-damage);return damage;
}
function modText(calc){
 const parts=[...calc.role.labels],reduction=Math.round((1-calc.leadMult)*100);
 if(reduction>0)parts.push(`敵統率で${reduction}%軽減`);
 else if(reduction<0)parts.push(`敵統率不足で${-reduction}%増加`);
 return parts.length?`【${parts.join('・')}】`:'';
}

window.enemyPhase=function(){
 const b=state?.battle;if(!b)return;
 b.phase='enemy';render();
 setTimeout(()=>{
  if(state?.battle!==b)return;
  for(const e of alive(b,'enemy')){
   e.movedDistance=0;e.movedThisTurn=false;
   if(e.skipTurns>0){
    e.skipTurns--;b.logs.unshift(`${e.name}隊は幻惑され、行動できない。`);
    if(window.checkBattleEnd())return;
    continue;
   }
   let players=alive(b,'player');if(!players.length)break;
   let target=players.sort((a,c)=>dist(e,a)-dist(e,c)||a.troops-c.troops)[0];
   const range=typeOf(e)==='弩兵'?3:1;
   if(dist(e,target)<=range){
    const calc=normalDamage(b,e,target,dist(e,target)),damage=applyDamage(b,target,calc.damage);
    b.logs.unshift(`${e.name}隊（${typeOf(e)}）が${target.name}隊（${typeOf(target)}）へ${damage}損害。${modText(calc)}`);
    if(window.checkBattleEnd())return;
   }else if(e.immobileTurns>0){
    e.immobileTurns--;b.logs.unshift(`${e.name}隊は連環に阻まれ、移動できない。`);
   }else{
    let steps=moveRange(e),moved=0;
    while(steps-->0){
     players=alive(b,'player');if(!players.length)break;
     target=players.sort((a,c)=>dist(e,a)-dist(e,c))[0];
     if(dist(e,target)<=range)break;
     const dx=Math.sign(target.x-e.x),dy=Math.sign(target.y-e.y);
     const options=Math.abs(target.x-e.x)>=Math.abs(target.y-e.y)?[[e.x+dx,e.y],[e.x,e.y+dy]]:[[e.x,e.y+dy],[e.x+dx,e.y]];
     const next=options.find(([nx,ny])=>nx>=0&&nx<9&&ny>=0&&ny<7&&!b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny));
     if(!next)break;
     e.x=next[0];e.y=next[1];moved++;
    }
    e.movedDistance=moved;e.movedThisTurn=moved>0;
    players=alive(b,'player');
    if(players.length&&typeOf(e)==='騎兵'){
     target=players.sort((a,c)=>dist(e,a)-dist(e,c))[0];
     if(dist(e,target)<=1){
      const calc=normalDamage(b,e,target,1),damage=applyDamage(b,target,calc.damage);
      b.logs.unshift(`${e.name}隊の騎馬突撃！ ${target.name}隊へ${damage}損害。${modText(calc)}`);
      if(window.checkBattleEnd())return;
     }
    }
   }
   if(e.weakenTurns>0)e.weakenTurns--;
   if(window.checkBattleEnd())return;
  }
  if(state?.battle!==b)return;
  if(b.playerGuardTurns>0)b.playerGuardTurns--;
  if(window.checkBattleEnd())return;
  b.units.filter(u=>u.side==='player').forEach(u=>{u.done=false;u.movedDistance=0;u.movedThisTurn=false});
  b.phase='player';b.day++;render();
 },550);
};
})();
