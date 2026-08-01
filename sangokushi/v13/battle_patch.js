let battleMoveMode=false;

function movementRange(unit){return unit.type==='騎'?3:2}
function cellKey(x,y){return x+','+y}
function occupiedBattleCells(exceptName){
 const set=new Set();
 state.battle.units.filter(u=>u.troops>0&&u.name!==exceptName).forEach(u=>set.add(cellKey(u.x,u.y)));
 return set;
}
function terrainMoveCost(x,y,unit){
 const t=state.battle.terrain[y*7+x];
 if(t==='river')return unit.type==='騎'?3:2;
 if(t==='forest')return unit.type==='騎'?2:1;
 if(t==='hill')return 2;
 return 1;
}
function reachableTiles(unit){
 const max=movementRange(unit),blocked=occupiedBattleCells(unit.name),best=new Map([[cellKey(unit.x,unit.y),0]]),queue=[[unit.x,unit.y,0]],out=[];
 while(queue.length){
  const [x,y,cost]=queue.shift();
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
   const nx=x+dx,ny=y+dy;if(nx<0||nx>6||ny<0||ny>6)return;
   const key=cellKey(nx,ny);if(blocked.has(key))return;
   const nc=cost+terrainMoveCost(nx,ny,unit);if(nc>max)return;
   if(best.has(key)&&best.get(key)<=nc)return;
   best.set(key,nc);queue.push([nx,ny,nc]);
  });
 }
 best.forEach((cost,key)=>{if(key!==cellKey(unit.x,unit.y)){const [x,y]=key.split(',').map(Number);out.push({x,y,cost})}});
 return out;
}

renderBattle=function(){
 const b=state.battle,u=b.units.find(x=>x.name===b.selected&&x.troops>0)||b.units.find(x=>x.side==='player'&&x.troops>0),players=b.units.filter(x=>x.side==='player'&&x.troops>0),enemies=b.units.filter(x=>x.side==='enemy'&&x.troops>0);
 if(u&&u.side==='player')b.selected=u.name;
 const reachable=battleMoveMode&&u?new Set(reachableTiles(u).map(t=>cellKey(t.x,t.y))):new Set();
 app.innerHTML=`<section class="screen"><div class="panel"><div class="title">${b.defense?b.target+'防衛戦':b.src+'軍 VS '+b.target+'軍'}　第${b.turn}日</div><div class="battle"><div class="battlefield">${Array.from({length:49},(_,i)=>{const x=i%7,y=Math.floor(i/7),unit=b.units.find(z=>z.troops>0&&z.x===x&&z.y===y),move=reachable.has(cellKey(x,y));return`<div class="tile ${b.terrain[i]} ${move?'moveable':''}" data-tile="${x},${y}">${unit?`<div class="unit ${unit.side} ${unit.name===b.selected?'selected-unit':''}" data-unit="${unit.name}">${unit.side==='player'?'日':'敵'}<br>${unit.name}<br>${unit.type}${Math.max(0,unit.troops)}</div>`:''}</div>`}).join('')}</div><div class="battle-controls"><b>選択：${u?.name||'なし'}</b><div>兵${u?.troops||0} 士気${u?.morale||0} 兵科${u?.type||'-'}　移動力${u?movementRange(u):0}</div><div class="choice-list">${players.map(x=>`<button data-select="${x.name}" class="${x.name===b.selected?'green':''}">${x.name} ${x.type}${x.troops}</button>`).join('')}</div><div class="battle-help">${battleMoveMode?'緑色のマスをタップして移動先を決定してください。もう一度「移動」を押すと解除します。':'部隊を選び、「移動」を押してから移動先のマスをタップします。歩兵・弩兵は2、騎兵は3の移動力です。'}</div><button data-b="move" class="${battleMoveMode?'green':''}">移動先を指定</button><button data-b="attack">攻撃</button><button data-b="fire">火計</button><button data-b="rest">待機・鼓舞</button><button data-b="retreat" class="secondary">全軍退却</button><div class="report">味方${players.reduce((a,x)=>a+x.troops,0).toLocaleString()}／敵${enemies.reduce((a,x)=>a+x.troops,0).toLocaleString()}</div><div class="battle-log">${b.logs.join('\n')}</div></div></div></div></section>`;
 document.querySelectorAll('[data-select]').forEach(e=>e.onclick=()=>{b.selected=e.dataset.select;battleMoveMode=false;render()});
 document.querySelectorAll('[data-unit]').forEach(e=>e.onclick=ev=>{ev.stopPropagation();const target=b.units.find(x=>x.name===e.dataset.unit);if(target?.side==='player'){b.selected=target.name;battleMoveMode=false;render()}});
 document.querySelectorAll('[data-b]').forEach(e=>e.onclick=()=>battleAction(e.dataset.b));
 document.querySelectorAll('.tile.moveable').forEach(e=>e.onclick=()=>{const [x,y]=e.dataset.tile.split(',').map(Number);manualBattleMove(x,y)});
}

function manualBattleMove(x,y){
 const b=state.battle,p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);if(!p)return alert('部隊を選択してください');
 const possible=reachableTiles(p).some(t=>t.x===x&&t.y===y);if(!possible)return;
 const from=`(${p.x+1},${p.y+1})`;p.x=x;p.y=y;b.logs.unshift(`${p.name}隊が${from}から(${x+1},${y+1})へ移動。`);battleMoveMode=false;
 finishPlayerBattleAction();
}

function finishPlayerBattleAction(){
 const b=state.battle;
 if(b.units.filter(x=>x.side==='enemy'&&x.troops>0).length===0)return endBattleGroup(true,false);
 enemyBattleTurn();b.turn++;
 if(b.units.filter(x=>x.side==='player'&&x.troops>0).length===0)return endBattleGroup(false,false);
 if(b.turn>30){const pt=b.units.filter(x=>x.side==='player').reduce((a,x)=>a+Math.max(0,x.troops),0),et=b.units.filter(x=>x.side==='enemy').reduce((a,x)=>a+Math.max(0,x.troops),0);return endBattleGroup(pt>et,false)}
 render();
}

battleAction=function(a){
 const b=state.battle,p=b.units.find(x=>x.name===b.selected&&x.side==='player'&&x.troops>0);if(!p)return alert('部隊を選択してください');
 if(a==='move'){battleMoveMode=!battleMoveMode;return render()}
 battleMoveMode=false;
 const enemies=b.units.filter(x=>x.side==='enemy'&&x.troops>0),e=nearest(p,enemies);
 if(a==='attack'){
  if(!e||Math.abs(p.x-e.x)+Math.abs(p.y-e.y)>1){b.logs.unshift('隣接する敵がいない。移動して接近してください。');return render()}
  const mult=p.type==='騎'&&e.type==='歩'?1.3:p.type==='弩'&&e.type==='騎'?1.3:p.type==='歩'&&e.type==='弩'?1.2:1;
  const dmg=Math.floor((120+p.troops*.035+p.war*3)*(0.75+Math.random()*.5)*mult);e.troops-=dmg;b.logs.unshift(`${p.name}隊の攻撃、${e.name}隊に${dmg}損害。`);
 }else if(a==='fire'){
  if(!e||Math.abs(p.x-e.x)+Math.abs(p.y-e.y)>3){b.logs.unshift('火計の対象が遠すぎる。');return render()}
  const ok=Math.random()*100<15+p.int*.65;if(ok){const dmg=250+Math.floor(Math.random()*650)+p.int*2;e.troops-=dmg;e.morale-=8;b.logs.unshift(`${p.name}の火計成功、${e.name}隊に${dmg}損害。`)}else b.logs.unshift(`${p.name}の火計失敗。`);
 }else if(a==='rest'){p.morale=Math.min(100,p.morale+8);b.logs.unshift(`${p.name}隊が士気を整えた。`)}
 else if(a==='retreat')return endBattleGroup(false,true);
 finishPlayerBattleAction();
}
