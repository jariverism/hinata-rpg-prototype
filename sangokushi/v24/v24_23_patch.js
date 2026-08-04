// v24.23 — direct tactical selection for movement and attack targets
(()=>{
const previousRender=window.render;
const previousBattleAction=window.battleAction;

function typeOf(u){
 const t=u?.type||u?.apt||'剣盾兵';
 return t==='歩兵'?'剣盾兵':t;
}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function moveRange(u){
 const info=window.TROOP_TYPE_INFO?.[typeOf(u)];
 return Math.max(1,(Number(info?.move)||2)+(Number(u?.moveRangeBonus)||0));
}
function attackRange(u,action='attack'){
 if(action==='fire')return 3;
 return typeOf(u)==='弩兵'?3:1;
}
function currentUnit(){
 const b=state?.battle;
 return b?.units?.find(u=>u.side==='player'&&u.name===b.selected&&u.troops>0)||null;
}
function occupiedAt(x,y){
 return state?.battle?.units?.find(u=>u.troops>0&&Number(u.x)===x&&Number(u.y)===y)||null;
}
function key(x,y){return `${x},${y}`}
function reachableCells(unit){
 const result=new Set();
 if(!unit||unit.done||unit.movedThisTurn)return result;
 const limit=moveRange(unit),queue=[[Number(unit.x),Number(unit.y),0]],seen=new Set([key(unit.x,unit.y)]);
 while(queue.length){
  const [x,y,d]=queue.shift();
  if(d>=limit)continue;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,k=key(nx,ny);
   if(nx<0||nx>=9||ny<0||ny>=7||seen.has(k))continue;
   seen.add(k);
   if(occupiedAt(nx,ny))continue;
   result.add(k);queue.push([nx,ny,d+1]);
  }
 }
 return result;
}
function legalTargets(unit,action='attack'){
 if(!unit||unit.done)return [];
 const range=attackRange(unit,action);
 return state.battle.units.filter(u=>u.side==='enemy'&&u.troops>0&&dist(unit,u)<=range);
}
function forceChosenTargetFirst(target,fn){
 const originalSort=Array.prototype.sort;
 Array.prototype.sort=function(compareFn){
  const result=originalSort.call(this,compareFn);
  if(this.includes(target)&&this.every(x=>x&&typeof x==='object'&&'troops' in x&&'side' in x)){
   const index=this.indexOf(target);
   if(index>0){this.splice(index,1);this.unshift(target)}
  }
  return result;
 };
 try{return fn()}finally{Array.prototype.sort=originalSort}
}
function executeTargeted(action,target){
 const b=state?.battle,p=currentUnit();
 if(!b||!p||p.done||!target)return;
 if(!legalTargets(p,action).includes(target)){
  b.logs.unshift(action==='fire'?'火計の射程外です。':'攻撃範囲外です。');
  return render();
 }
 b.mode=null;b.v2423Target=target.name;
 return forceChosenTargetFirst(target,()=>previousBattleAction(action));
}
function moveSelectedTo(x,y){
 const b=state?.battle,p=currentUnit();if(!b||!p||p.done)return;
 const reachable=reachableCells(p),destination=key(x,y);
 if(!reachable.has(destination))return;
 const moved=dist(p,{x,y});
 p.x=x;p.y=y;p.movedDistance=moved;p.movedThisTurn=true;p.moveRangeBonus=0;b.mode=null;b.v2423Target=null;
 if(typeOf(p)==='騎兵'){
  b.logs.unshift(`${p.name}隊（騎兵）が${moved}マス移動。続けて攻撃対象を選べます。`);
  b.mode='attack';render();
 }else{
  p.done=true;b.logs.unshift(`${p.name}隊（${typeOf(p)}）が${moved}マス移動。`);afterPlayerAction();
 }
}
function selectOwnUnit(unit){
 const b=state?.battle;if(!b||!unit||unit.side!=='player'||unit.troops<=0)return;
 b.selected=unit.name;b.v2423Target=null;
 b.mode=unit.done?null:(unit.movedThisTurn?'attack':'move');
 render();
}
function selectOrAttackEnemy(enemy){
 const b=state?.battle,p=currentUnit();if(!b||!p||p.done||!enemy)return;
 const action=b.mode==='fire'?'fire':'attack';
 if(legalTargets(p,action).includes(enemy))return executeTargeted(action,enemy);
 const normal=legalTargets(p,'attack').includes(enemy),fire=legalTargets(p,'fire').includes(enemy);
 if(normal)return executeTargeted('attack',enemy);
 b.logs.unshift(fire?'通常攻撃の範囲外です。「火計」を選ぶと対象にできます。':'その敵は攻撃範囲外です。');render();
}
function enterMode(action){
 const b=state?.battle,p=currentUnit();if(!b||!p||p.done)return;
 if(action==='move'){
  if(p.movedThisTurn){b.logs.unshift(`${p.name}隊はすでに移動済みです。`);return render()}
  b.mode='move';b.v2423Target=null;b.logs.unshift('青く表示されたマスを選択してください。');return render();
 }
 const targets=legalTargets(p,action);
 if(!targets.length){b.logs.unshift(action==='fire'?'火計の対象となる敵が射程内にいません。':'攻撃可能な敵が射程内にいません。');return render()}
 b.mode=action;b.v2423Target=null;
 b.logs.unshift(action==='fire'?'橙色の敵部隊を選択してください。':'赤色の敵部隊を選択してください。');render();
}

window.battleAction=function(action){
 if(action==='move'||action==='attack'||action==='fire')return enterMode(action);
 return previousBattleAction.apply(this,arguments);
};

function decorateDirectControls(){
 const b=state?.battle;if(!b)return;
 const p=currentUnit(),effectiveMode=b.mode||(p&&!p.done?(p.movedThisTurn?'attack':'move'):null);
 const reachable=effectiveMode==='move'?reachableCells(p):new Set();
 const targetAction=effectiveMode==='fire'?'fire':'attack';
 const targets=new Set(legalTargets(p,targetAction).map(u=>u.name));

 document.querySelectorAll('[data-cell]').forEach(cell=>{
  cell.classList.remove('v2423-reachable','v2423-attackable','v2423-fireable');
  const [x,y]=cell.dataset.cell.split(',').map(Number),occupant=occupiedAt(x,y),k=key(x,y);
  if(!occupant&&reachable.has(k))cell.classList.add('v2423-reachable');
  if(occupant?.side==='enemy'&&targets.has(occupant.name))cell.classList.add(effectiveMode==='fire'?'v2423-fireable':'v2423-attackable');
  cell.onclick=()=>{
   const u=occupiedAt(x,y);
   if(u?.side==='player')return selectOwnUnit(u);
   if(u?.side==='enemy')return selectOrAttackEnemy(u);
   if(effectiveMode==='move')return moveSelectedTo(x,y);
  };
 });
 document.querySelectorAll('[data-unit]').forEach(el=>{
  const unit=b.units.find(u=>u.name===el.dataset.unit&&u.troops>0);if(!unit)return;
  el.onclick=e=>{e.stopPropagation();unit.side==='player'?selectOwnUnit(unit):selectOrAttackEnemy(unit)};
 });
 document.querySelectorAll('[data-ba]').forEach(button=>{
  const action=button.dataset.ba;
  button.classList.toggle('v2423-active',action===effectiveMode);
  button.onclick=()=>window.battleAction(action);
  if(action==='attack'&&p&&!p.done)button.textContent=typeOf(p)==='弩兵'?'射撃対象を選ぶ':'攻撃対象を選ぶ';
  if(action==='move'&&p&&!p.done)button.textContent='移動範囲を表示';
  if(action==='fire'&&p&&!p.done)button.textContent='火計対象を選ぶ';
 });
 const side=document.querySelector('.battle > .panel:last-child');
 if(side){
  let guide=side.querySelector('.v2423-guide');
  if(!guide){guide=document.createElement('div');guide.className='v2423-guide';side.querySelector('.battle-actions')?.before(guide)}
  if(guide){
   const instruction=!p?'自軍部隊を選択してください。':p.done?'この部隊は行動済みです。':effectiveMode==='fire'?'橙色の敵を選ぶと火計を実行します。':effectiveMode==='attack'?'赤色の敵を選ぶと攻撃します。':'青色のマスを選ぶと移動します。赤色の敵を直接選ぶと攻撃します。';
   guide.innerHTML=`<b>盤面直接操作</b><br>${instruction}<div><span class="v2423-key move">移動可能</span><span class="v2423-key attack">攻撃可能</span><span class="v2423-key fire">火計可能</span></div>`;
  }
 }
}

window.render=function(){
 const result=previousRender.apply(this,arguments);
 setTimeout(()=>{try{decorateDirectControls()}catch(e){console.error('v24.23 controls:',e)}},0);
 return result;
};

const style=document.createElement('style');
style.textContent=`
.battle-grid .cell.v2423-reachable{box-shadow:inset 0 0 0 3px rgba(74,168,224,.95),inset 0 0 18px rgba(56,149,211,.35);cursor:pointer}
.battle-grid .cell.v2423-reachable:hover{box-shadow:inset 0 0 0 4px #8ed8ff,inset 0 0 22px rgba(77,181,241,.55)}
.battle-grid .cell.v2423-attackable{box-shadow:inset 0 0 0 3px rgba(224,75,66,.98),inset 0 0 20px rgba(194,43,35,.42);cursor:crosshair}
.battle-grid .cell.v2423-fireable{box-shadow:inset 0 0 0 3px rgba(238,151,46,.98),inset 0 0 20px rgba(222,116,28,.45);cursor:crosshair}
.battle-actions button.v2423-active{outline:2px solid #f1cf78;outline-offset:1px;background:#49361b;color:#ffe7a9}
.v2423-guide{margin:8px 0;padding:9px 10px;border:1px solid #586f7f;background:#111a20;color:#d7eaf4;line-height:1.5;font-size:11px}
.v2423-guide>div{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.v2423-key{display:inline-block;padding:2px 6px;border:1px solid;border-radius:999px;font-size:9px}.v2423-key.move{border-color:#56a9dd;color:#a7dcff}.v2423-key.attack{border-color:#cf554c;color:#ffb4ae}.v2423-key.fire{border-color:#d98e35;color:#ffd19a}
`;
document.head.appendChild(style);
})();
