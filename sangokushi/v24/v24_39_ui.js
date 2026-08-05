// v24.39 UI — central fortress rendering, four-direction deployment and large siege controls
(()=>{
const V39=window.V2439;if(!V39)return;
const previousRender=window.render,previousBattleAction=window.battleAction,previousEnemyPhase=window.enemyPhase,previousCheckBattleEnd=window.checkBattleEnd;
const {W,H,CX,CY,DIRS,DIR_LABEL,key,terrainAt,occupiedAt,typeOf,isWallTile,allowedDeploymentCells,playerDeploymentUnits,selectedDeployUnit,directionAvailable,placeSelectedDeployment,changeAttackDirection,autoPlayerDeployment,confirmDeployment,currentPlayer,reachableCells,legalTargets,selectOwn,playerAttack,movePlayer,eligibleForLargeSiege,initLargeSiege,runLargeEnemyPhase,checkKeepVictory}=V39;
function terrainMark(t){return ({wall:'城',gate:'門',courtyard:'郭',keep:'本',mountain:'▲',water:'≈',bridge:'橋',forest:'森',hill:'丘',coast:'浜'})[t]||''}
function terrainTitle(t){return t==='wall'?'城壁：登攀可能。歩兵・槍兵・弩兵は移動力2、騎兵は3。防御28%上昇。':t==='gate'?'城門：通常の移動力で通過可能。四方向に存在。':t==='keep'?'本丸：攻城側が占領すると即時勝利。':t==='mountain'?'山岳：騎兵侵入不可。他兵科は移動力2。':t==='water'?'水域：侵入不可。':t==='bridge'?'橋：河川を渡れる。':''}
function bindMapScroll(b,deployment){
 const wrap=document.querySelector('.v2439-grid-wrap');if(!wrap)return;
 const center=()=>{wrap.scrollLeft=Math.max(0,CX*48-wrap.clientWidth/2+24);wrap.scrollTop=Math.max(0,CY*48-wrap.clientHeight/2+24);b.v2439ScrollLeft=wrap.scrollLeft;b.v2439ScrollTop=wrap.scrollTop};
 requestAnimationFrame(()=>{
  if(Number.isFinite(Number(b.v2439ScrollLeft))||Number.isFinite(Number(b.v2439ScrollTop))){wrap.scrollLeft=Number(b.v2439ScrollLeft)||0;wrap.scrollTop=Number(b.v2439ScrollTop)||0}
  else if(deployment&&!b.defense){
   if(b.v2439Direction==='east')wrap.scrollLeft=wrap.scrollWidth-wrap.clientWidth;
   else if(b.v2439Direction==='south')wrap.scrollTop=wrap.scrollHeight-wrap.clientHeight;
   else if(b.v2439Direction==='north')wrap.scrollLeft=Math.max(0,CX*48-wrap.clientWidth/2);
   else wrap.scrollTop=Math.max(0,CY*48-wrap.clientHeight/2);
  }else center();
  b.v2439ScrollLeft=wrap.scrollLeft;b.v2439ScrollTop=wrap.scrollTop;
 });
 wrap.addEventListener('scroll',()=>{b.v2439ScrollLeft=wrap.scrollLeft;b.v2439ScrollTop=wrap.scrollTop},{passive:true});
 const button=document.getElementById('v2439-center-map');if(button)button.onclick=center;
}
function unitHtml(b,u){
 const commander=b.v2436Commanders?.[u.side]===u.name,terrain=terrainAt(b,u.x,u.y);
 return `<span class="unit ${u.side} ${u.name===b.selected?'selected':''} ${commander?'v2439-commander':''}" data-v2439-unit="${u.name}"><b>${commander?'★':''}${u.name}</b><small>${Number(u.troops).toLocaleString()}／士${Math.round(Number(u.morale)||0)}</small>${isWallTile(terrain)?'<em>城上</em>':''}</span>`;
}
function renderGrid(b,deployment=false){
 const allowed=deployment?new Set(allowedDeploymentCells(b).map(s=>key(s.x,s.y))):new Set();
 return `<div class="v2439-grid-wrap"><div class="battle-grid v2439-grid" style="grid-template-columns:repeat(${W},48px);grid-template-rows:repeat(${H},48px)">${Array.from({length:W*H},(_,i)=>{
  const x=i%W,y=Math.floor(i/W),t=terrainAt(b,x,y),u=occupiedAt(b,x,y),a=allowed.has(key(x,y)),selected=deployment&&u?.side==='player'&&u.name===b.v2439Selected;
  return `<button class="cell ${t} ${a?'v2439-deployable':''} ${selected?'v2439-deploy-selected':''}" data-cell="${x},${y}" title="${terrainTitle(t)}"><span class="v2439-terrain">${terrainMark(t)}</span>${u?unitHtml(b,u):''}</button>`;
 }).join('')}</div></div>`;
}
function renderDeployment(b){
 const units=playerDeploymentUnits(b),selected=selectedDeployUnit(b),available=DIRS.map(d=>({d,ok:directionAvailable(b,d)}));
 app.innerHTML=`<div class="battle v2439-battle"><section class="panel"><div class="title">${b.target}${b.defense?'防衛戦':'攻略戦'}・布陣</div><div class="phase">15×13戦場／中央城郭／${b.defense?'城内配置':`${DIR_LABEL[b.v2439Direction]}方から攻撃`}</div>${!b.defense?`<div class="v2439-directions"><b>攻撃方向</b>${available.map(x=>`<button data-v2439-dir="${x.d}" class="${b.v2439Direction===x.d?'active':''}" ${x.ok?'':'disabled'}>${DIR_LABEL[x.d]}${x.ok?'':'（海）'}</button>`).join('')}</div>`:''}${renderGrid(b,true)}<div class="v2439-map-note">城壁は登攀可能です。正門、側門、裏門、城壁越えから攻められます。${b.v2439Profile}・${DIR_LABEL[b.v2439FeatureSide]}側に天然の障害があります。<button type="button" id="v2439-center-map">城郭を中央表示</button></div></section><section class="panel"><div class="title">初期配置</div>${selected?`<div class="v2439-selected"><b>${selected.name}</b><br>${typeOf(selected)}　兵${Number(selected.troops).toLocaleString()}　統${selected.lead} 武${selected.war} 知${selected.int}</div>`:''}<div class="v2439-unit-list">${units.map(u=>`<button data-v2439-select="${u.name}" class="${u.name===b.v2439Selected?'active':''}"><b>${u.name}</b><small>${typeOf(u)}　兵${Number(u.troops).toLocaleString()}　(${u.x+1},${u.y+1})</small></button>`).join('')}</div><div class="v2439-deploy-actions"><button id="v2439-auto">兵科別に自動配置</button><button id="v2439-start" class="primary">布陣を確定して開戦</button></div><div class="v2439-guide"><b>攻城の選択肢</b><br>門は移動が速く、城壁はどこからでも登れます。城壁上は守備側が有利ですが、一度登れば全軍の士気が上がります。本丸へ到達すれば敵を全滅させなくても勝利です。</div></section></div>`;
 document.querySelectorAll('[data-v2439-select]').forEach(btn=>btn.onclick=()=>{b.v2439Selected=btn.dataset.v2439Select;renderDeployment(b)});
 document.querySelectorAll('[data-v2439-unit]').forEach(el=>el.onclick=e=>{e.stopPropagation();const u=playerDeploymentUnits(b).find(x=>x.name===el.dataset.v2439Unit);if(u){b.v2439Selected=u.name;renderDeployment(b)}});
 document.querySelectorAll('[data-cell]').forEach(cell=>cell.onclick=()=>{const [x,y]=cell.dataset.cell.split(',').map(Number);placeSelectedDeployment(b,x,y)});
 document.querySelectorAll('[data-v2439-dir]').forEach(btn=>btn.onclick=()=>{delete b.v2439ScrollLeft;delete b.v2439ScrollTop;changeAttackDirection(b,btn.dataset.v2439Dir)});
 document.getElementById('v2439-auto').onclick=()=>autoPlayerDeployment(b);document.getElementById('v2439-start').onclick=()=>confirmDeployment(b);bindMapScroll(b,true);
}
function renderBattleField(b){
 let p=currentPlayer(b);if(p&&b.selected!==p.name)b.selected=p.name;
 const mode=b.v2432Mode||b.mode||(p&&!p.done?(p.movedThisTurn?'attack':'move'):null),reach=mode==='move'?reachableCells(b,p):new Map(),targets=new Set(p?legalTargets(b,p,mode==='fire'?'fire':'attack').map(u=>u.name):[]);
 app.innerHTML=`<div class="battle v2439-battle"><section class="panel"><div class="title">${b.target}${b.defense?'防衛戦':'攻略戦'}</div><div class="phase">${b.phase==='player'?'自軍フェイズ':'敵軍フェイズ'}・攻防${Math.min(30,Number(b.day)||1)}/30<br><small>15×13中央城郭　攻城方向：${DIR_LABEL[b.v2439Direction]}　地勢：${b.v2439Profile}</small></div>${renderGrid(b,false)}<div class="v2439-map-note">四門と登攀可能な城壁。本丸（中央の「本」）を攻城側が占領すると即時決着します。<button type="button" id="v2439-center-map">城郭を中央表示</button></div></section><section class="panel"><div class="title">部隊命令</div>${p?`<div class="v2439-selected"><b>${p.name}${b.v2436Commanders?.player===p.name?' ★総大将':''}</b><br>${typeOf(p)}　兵${Number(p.troops).toLocaleString()}　士気${Math.round(Number(p.morale)||0)}<br>武${p.war} 知${p.int} 統${p.lead}</div>`:'<p>行動可能な部隊がありません。</p>'}<div class="battle-actions"><button data-ba="move" ${!p||p.done?'disabled':''}>移動・登城</button><button data-ba="attack" ${!p||p.done?'disabled':''}>${p&&typeOf(p)==='弩兵'?'射撃':'攻撃'}</button><button data-ba="fire" ${!p||p.done?'disabled':''}>火計</button><button data-ba="duel" ${!p||p.done||b.v2432DuelUsed?.[p.name]?'disabled':''}>一騎打ち</button><button data-ba="tactic" ${!p||p.done||b.v2432TacticUsed?.[p.name]?'disabled':''}>戦場計略</button><button data-ba="wait" ${!p||p.done?'disabled':''}>待機</button><button data-ba="end">自軍ターン終了</button><button data-ba="retreat">退却</button></div><div class="v2439-war-guide"><b>城壁</b>：どこからでも登攀可能／守備力＋28％　<b>本丸</b>：攻城側が占領すると勝利<br><small>味方部隊は通過可能ですが、同じマスでは停止できません。</small></div><div class="title">戦況</div><div class="log">${(b.logs||[]).join('\n')}</div></section></div>`;
 document.querySelectorAll('[data-ba]').forEach(btn=>btn.onclick=()=>window.battleAction(btn.dataset.ba));
 document.querySelectorAll('[data-v2439-unit]').forEach(el=>el.onclick=e=>{
  e.stopPropagation();const u=(b.units||[]).find(x=>x.name===el.dataset.v2439Unit&&Number(x.troops)>0);if(!u)return;
  if(u.side==='player')return selectOwn(b,u);
  if(p&&targets.has(u.name))return playerAttack(b,p,u,mode==='fire'?'fire':'attack');
  b.logs.unshift('その敵は射程外です。');window.render();
 });
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  const [x,y]=cell.dataset.cell.split(',').map(Number),u=occupiedAt(b,x,y),k=key(x,y);
  if(!u&&reach.has(k))cell.classList.add('v2439-reachable');
  if(u?.side==='enemy'&&targets.has(u.name))cell.classList.add(mode==='fire'?'v2439-fireable':'v2439-attackable');
  cell.onclick=()=>{
   const occ=occupiedAt(b,x,y);
   if(occ?.side==='player')return selectOwn(b,occ);
   if(occ?.side==='enemy'&&p&&targets.has(occ.name))return playerAttack(b,p,occ,mode==='fire'?'fire':'attack');
   if(!occ&&mode==='move'&&reach.has(k))return movePlayer(b,p,x,y,reach.get(k));
  };
 });
 bindMapScroll(b,false);
}
function renderLargeSiege(b){if(b.v2439DeploymentActive&&!b.v2439DeploymentDone)return renderDeployment(b);return renderBattleField(b)}

window.render=function(){
 const b=state?.battle;
 if(!b)return previousRender.apply(this,arguments);
 if(!b.v2439LargeSiege){if(eligibleForLargeSiege(b))initLargeSiege(b);else{b.v2439Skipped=true;return previousRender.apply(this,arguments)}}
 return renderLargeSiege(b);
};
window.battleAction=function(action){
 const b=state?.battle;if(!b?.v2439LargeSiege)return previousBattleAction.apply(this,arguments);
 if(b.v2439DeploymentActive)return;
 const p=currentPlayer(b);
 if(action==='end')return runLargeEnemyPhase(b);
 if(action==='retreat'||action==='duel'||action==='tactic')return previousBattleAction.apply(this,arguments);
 if(!p||p.done)return;
 if(action==='move'){
  if(p.immobileTurns>0){b.logs.unshift(`${p.name}隊は落とし穴のため移動できません。`);return window.render()}
  if(p.movedThisTurn){b.logs.unshift(`${p.name}隊はすでに移動済みです。`);return window.render()}
  b.mode='move';b.v2432Mode='move';return window.render();
 }
 if(action==='attack'||action==='fire'){
  if(!legalTargets(b,p,action).length){b.logs.unshift('射程内に対象がいません。');return window.render()}
  b.mode=action;b.v2432Mode=action;return window.render();
 }
 if(action==='wait'){p.done=true;p.movedDistance=0;b.mode=null;b.v2432Mode=null;b.logs.unshift(`${p.name}隊は待機。`);return window.afterPlayerAction()}
};
window.enemyPhase=function(){const b=state?.battle;if(b?.v2439LargeSiege)return runLargeEnemyPhase(b);return previousEnemyPhase.apply(this,arguments)};
window.checkBattleEnd=function(){const b=state?.battle;if(!b?.v2439LargeSiege)return previousCheckBattleEnd.apply(this,arguments);if(checkKeepVictory(b))return true;return previousCheckBattleEnd.apply(this,arguments)};

const style=document.createElement('style');
style.textContent=`
.v2439-battle{grid-template-columns:minmax(780px,1fr) 310px}.v2439-grid-wrap{overflow:auto;max-width:100%;border:2px solid #9b7234;background:#0e0b08}.battle-grid.v2439-grid{width:max-content;aspect-ratio:auto}.v2439-grid .cell{width:48px;height:48px;padding:0;border-radius:0;overflow:hidden}.v2439-grid .cell.wall{background:linear-gradient(145deg,#766b5b,#3b352e);box-shadow:inset 0 0 0 3px #958675}.v2439-grid .cell.gate{background:linear-gradient(90deg,#3b2b20,#8b6335,#3b2b20);box-shadow:inset 0 0 0 3px #c0924d}.v2439-grid .cell.courtyard{background:repeating-linear-gradient(45deg,#6a604c 0 5px,#5c5342 5px 10px)}.v2439-grid .cell.keep{background:radial-gradient(circle,#b4863e,#55341d);box-shadow:inset 0 0 0 3px #f0c36d}.v2439-grid .cell.mountain{background:linear-gradient(145deg,#675e4b,#342f28)}.v2439-grid .cell.water{background:repeating-linear-gradient(165deg,#1f5068 0 6px,#26657e 6px 11px)}.v2439-grid .cell.bridge{background:linear-gradient(90deg,#305e70 0 28%,#8b7146 30% 70%,#305e70 72%)}.v2439-grid .cell.coast{background:linear-gradient(135deg,#b99c62 0 48%,#2a6278 52%)}.v2439-terrain{position:absolute;left:2px;top:0;font-size:9px;color:#f1dfb3;z-index:1;opacity:.9}.v2439-grid .unit{inset:3%;font-size:8px;line-height:1.05;padding:1px;z-index:3}.v2439-grid .unit b,.v2439-grid .unit small,.v2439-grid .unit em{display:block}.v2439-grid .unit small{font-size:7px}.v2439-grid .unit em{font-size:6px;color:#ffe7a3;font-style:normal}.v2439-commander{outline:2px solid #ffd45c;box-shadow:0 0 9px rgba(255,210,75,.7)}.v2439-deployable{box-shadow:inset 0 0 0 3px rgba(83,182,232,.72)!important}.v2439-deploy-selected{box-shadow:inset 0 0 0 3px #ffe082!important}.v2439-reachable{box-shadow:inset 0 0 0 3px #62bde9,inset 0 0 14px rgba(82,178,224,.4)!important}.v2439-attackable{box-shadow:inset 0 0 0 3px #ff776c,inset 0 0 15px rgba(238,72,64,.45)!important}.v2439-fireable{box-shadow:inset 0 0 0 3px #ffb45c,inset 0 0 15px rgba(238,145,60,.45)!important}.v2439-directions{display:grid;grid-template-columns:auto repeat(4,1fr);gap:6px;align-items:center;margin:8px 0}.v2439-directions button.active{outline:2px solid #ffe082;background:#523a17}.v2439-map-note,.v2439-war-guide,.v2439-guide{margin-top:9px;padding:9px 10px;border:1px solid #766341;background:#18140e;color:#d9cba9;font-size:11px;line-height:1.55}.v2439-map-note button{margin-left:8px;padding:5px 8px;font-size:10px}.v2439-selected{margin:8px 0;padding:10px;border:1px solid #8d713d;background:#1d160d;line-height:1.5}.v2439-unit-list{display:grid;gap:6px}.v2439-unit-list button{text-align:left}.v2439-unit-list button small{display:block;color:#c8b894}.v2439-unit-list button.active{outline:2px solid #e5bd5e;background:#3d2b13}.v2439-deploy-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.v2439-deploy-actions button{min-height:48px}@media(max-width:1120px){.v2439-battle{grid-template-columns:1fr}.v2439-grid-wrap{max-height:68vh}}@media(max-width:600px){.v2439-grid .cell{width:43px;height:43px}.battle-grid.v2439-grid{grid-template-columns:repeat(15,43px)!important;grid-template-rows:repeat(13,43px)!important}.v2439-directions{grid-template-columns:repeat(4,1fr)}.v2439-directions b{grid-column:1/-1}.v2439-deploy-actions{grid-template-columns:1fr}}
`;
document.head.appendChild(style);
})();
