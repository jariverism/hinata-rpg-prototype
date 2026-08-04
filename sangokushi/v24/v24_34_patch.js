// v24.34 — player deployment phase in a 2x7 home zone before battle
(()=>{
const previousRender=window.render;
const V=window.V2432||{};
const W=9,H=7;

function typeOf(u){
 const t=u?.type||u?.apt||'剣盾兵';
 return t==='歩兵'?'剣盾兵':t;
}
function playerUnits(b){return (b?.units||[]).filter(u=>u.side==='player'&&Number(u.troops)>0)}
function occupiedAt(b,x,y){return (b?.units||[]).find(u=>Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y)||null}
function terrainAt(b,x,y){
 if(typeof V.terrainAt==='function')return V.terrainAt(b,x,y);
 return String(b?.terrain?.[y*W+x]||'plain').split(' ')[0];
}
function homeColumns(b){return b?.defense?[8,7]:[0,1]}
function homeSlots(b){
 const slots=[];
 for(const x of homeColumns(b))for(let y=0;y<H;y++)slots.push({x,y});
 return slots;
}
function inHomeZone(b,x,y){return homeColumns(b).includes(Number(x))&&Number(y)>=0&&Number(y)<H}
function battleAlreadyUnderway(b){
 if(b.v2434DeploymentActive||b.v2434DeploymentDone)return false;
 if(Number(b.day||1)!==1||b.phase!=='player')return true;
 return playerUnits(b).some(u=>u.done||u.movedThisTurn||u.v2433DuelCaptured||Number(u.troops)<=0)||
   !!b.v2423Target||!!b.v2432Mode||!!b.mode||
   (Array.isArray(b._v2427Captured)&&b._v2427Captured.length>0);
}
function ensureDeployment(b){
 if(!b||b.v2434DeploymentDone)return false;
 if(battleAlreadyUnderway(b)){
  b.v2434DeploymentDone=true;
  b.v2434DeploymentSkippedMigration=true;
  return false;
 }
 if(typeof V.ensureBattle==='function')V.ensureBattle(b);
 b.v2434DeploymentActive=true;
 b.v2434DeploymentVersion=134;
 const units=playerUnits(b),slots=homeSlots(b),used=new Set();
 for(const u of units){
  const k=`${u.x},${u.y}`;
  if(inHomeZone(b,u.x,u.y)&&!used.has(k)&&!['water'].includes(terrainAt(b,u.x,u.y))){used.add(k);continue}
  const slot=slots.find(s=>!used.has(`${s.x},${s.y}`)&&!occupiedAt(b,s.x,s.y)&&terrainAt(b,s.x,s.y)!=='water')||
             slots.find(s=>!used.has(`${s.x},${s.y}`));
  if(slot){u.x=slot.x;u.y=slot.y;used.add(`${slot.x},${slot.y}`)}
 }
 const current=units.find(u=>u.name===b.v2434Selected)||units.find(u=>u.name===b.selected)||units[0];
 b.v2434Selected=current?.name||null;
 return true;
}
function terrainLabel(t){
 return ({mountain:'▲',water:'≈',hill:'丘',forest:'森',coast:'浜',bridge:'橋',plain:''})[t]||'';
}
function selectedUnit(b){return playerUnits(b).find(u=>u.name===b.v2434Selected)||playerUnits(b)[0]||null}
function selectUnit(b,name){
 if(!playerUnits(b).some(u=>u.name===name))return;
 b.v2434Selected=name;renderDeployment(b);
}
function placeSelected(b,x,y){
 const unit=selectedUnit(b);if(!unit||!inHomeZone(b,x,y))return;
 const terrain=terrainAt(b,x,y);
 if(terrain==='water')return;
 const occupant=occupiedAt(b,x,y);
 if(occupant?.side==='enemy')return;
 if(occupant?.side==='player'&&occupant!==unit){
  const ox=unit.x,oy=unit.y;unit.x=occupant.x;unit.y=occupant.y;occupant.x=ox;occupant.y=oy;
 }else{unit.x=x;unit.y=y}
 renderDeployment(b);
}
function autoDeploy(b){
 const units=playerUnits(b),cols=homeColumns(b),back=cols[0],front=cols[1];
 const order=units.slice().sort((a,c)=>{
  const rank=u=>typeOf(u)==='騎兵'?0:typeOf(u)==='槍兵'||typeOf(u)==='剣盾兵'?1:2;
  return rank(a)-rank(c)||(Number(c.lead)||0)-(Number(a.lead)||0);
 });
 const frontRows=[3,2,4,1,5,0,6],backRows=[3,2,4,1,5,0,6];
 const frontUnits=order.filter(u=>typeOf(u)!=='弩兵'),backUnits=order.filter(u=>typeOf(u)==='弩兵');
 const spill=[];
 frontUnits.forEach((u,i)=>{if(i<7){u.x=front;u.y=frontRows[i]}else spill.push(u)});
 backUnits.forEach((u,i)=>{if(i<7){u.x=back;u.y=backRows[i]}else spill.push(u)});
 const used=new Set(units.map(u=>`${u.x},${u.y}`));
 for(const u of spill){
  const slot=homeSlots(b).find(s=>!used.has(`${s.x},${s.y}`));
  if(slot){u.x=slot.x;u.y=slot.y;used.add(`${slot.x},${slot.y}`)}
 }
 renderDeployment(b);
}
function confirmDeployment(b){
 const units=playerUnits(b),seen=new Set();
 for(const u of units){
  const k=`${u.x},${u.y}`;
  if(!inHomeZone(b,u.x,u.y))return alert(`${u.name}を自陣2列以内に配置してください。`);
  if(seen.has(k))return alert('同じマスに複数部隊は配置できません。');
  if(terrainAt(b,u.x,u.y)==='water')return alert(`${u.name}は水域に配置できません。`);
  seen.add(k);
 }
 b.v2434DeploymentActive=false;b.v2434DeploymentDone=true;b.v2434DeploymentConfirmedTurn=state.turn;
 b.selected=units[0]?.name||b.selected;b.mode=null;b.v2432Mode=null;b.phase='player';
 units.forEach(u=>{u.done=false;u.movedThisTurn=false;u.movedDistance=0});
 b.logs=Array.isArray(b.logs)?b.logs:[];
 b.logs.unshift(`布陣完了。自陣${b.defense?'右':'左'}側2列から戦闘を開始する。`);
 window.render();
}
function renderDeployment(b){
 if(!state?.battle||state.battle!==b)return;
 const units=playerUnits(b),selected=selectedUnit(b);
 app.innerHTML=`<div class="battle v2434-deployment"><section class="panel"><div class="title">${b.target}${b.defense?'防衛戦':'攻略戦'}・初期配置</div><div class="phase">配置フェイズ　自陣側2列×7マス</div><div class="battle-grid v2434-grid">${Array.from({length:W*H},(_,i)=>{
   const x=i%W,y=Math.floor(i/W),u=occupiedAt(b,x,y),terr=terrainAt(b,x,y),home=inHomeZone(b,x,y),sel=u?.side==='player'&&u.name===b.v2434Selected;
   return `<button class="cell ${terr} ${home?'v2434-home':''} ${sel?'v2434-selected-cell':''}" data-v2434-cell="${x},${y}" ${home?'':'disabled'}><span class="v2434-terrain-mark">${terrainLabel(terr)}</span>${u?`<span class="unit ${u.side} ${sel?'selected':''}" data-v2434-unit="${u.name}">${u.name}<br>${Number(u.troops).toLocaleString()}</span>`:''}</button>`;
  }).join('')}</div><div class="v2434-zone-note">${b.defense?'右端2列':'左端2列'}が配置可能範囲です。部隊を選び、配置マスをタップしてください。</div></section><section class="panel"><div class="title">出陣部隊の配置</div>${selected?`<div class="v2434-selected"><b>選択中：${selected.name}</b><br>${typeOf(selected)}　兵${Number(selected.troops).toLocaleString()}　統${selected.lead} 武${selected.war} 知${selected.int}</div>`:''}<div class="v2434-unit-list">${units.map(u=>`<button data-v2434-select="${u.name}" class="${u.name===b.v2434Selected?'active':''}"><b>${u.name}</b><small>${typeOf(u)}　兵${Number(u.troops).toLocaleString()}　配置（${u.x+1}列・${u.y+1}段）</small></button>`).join('')}</div><div class="v2434-actions"><button id="v2434-auto">兵科別に自動配置</button><button id="v2434-start" class="primary">配置を確定して開戦</button></div><div class="v2434-help"><b>配置の目安</b><br>騎兵・槍兵・剣盾兵を前列、弩兵を後列へ置くと戦いやすくなります。配置済みの味方部隊がいるマスを選ぶと、2部隊の位置を入れ替えます。</div></section></div>`;
 document.querySelectorAll('[data-v2434-select]').forEach(btn=>btn.onclick=()=>selectUnit(b,btn.dataset.v2434Select));
 document.querySelectorAll('[data-v2434-unit]').forEach(el=>el.onclick=e=>{e.stopPropagation();selectUnit(b,el.dataset.v2434Unit)});
 document.querySelectorAll('[data-v2434-cell]').forEach(cell=>cell.onclick=()=>{const [x,y]=cell.dataset.v2434Cell.split(',').map(Number);placeSelected(b,x,y)});
 document.getElementById('v2434-auto').onclick=()=>autoDeploy(b);
 document.getElementById('v2434-start').onclick=()=>confirmDeployment(b);
}

window.render=function(){
 const b=state?.battle;
 if(!b)return previousRender.apply(this,arguments);
 const result=previousRender.apply(this,arguments);
 if(state?.battle===b&&!b.v2434DeploymentDone&&ensureDeployment(b))renderDeployment(b);
 return result;
};

const style=document.createElement('style');
style.textContent=`
.v2434-deployment .battle-grid .cell:disabled{opacity:.55;cursor:default}.v2434-deployment .battle-grid .cell.v2434-home{box-shadow:inset 0 0 0 2px rgba(83,170,221,.72);cursor:pointer}.v2434-deployment .battle-grid .cell.v2434-home:hover{box-shadow:inset 0 0 0 3px #9bddff,inset 0 0 18px rgba(69,159,218,.35)}.v2434-deployment .battle-grid .cell.v2434-selected-cell{box-shadow:inset 0 0 0 3px #ffe08a,inset 0 0 18px rgba(223,178,72,.42)}.v2434-terrain-mark{position:absolute;left:3px;top:1px;font-size:9px;color:#d9c99f;opacity:.8}.v2434-zone-note{margin-top:9px;padding:8px 10px;border:1px solid #4f758b;background:#101c23;color:#c9e8f5;font-size:11px;line-height:1.5}.v2434-selected{margin:8px 0 10px;padding:10px;border:1px solid #9b7b3c;background:#21190e;line-height:1.5}.v2434-unit-list{display:grid;gap:7px}.v2434-unit-list button{text-align:left;padding:9px 10px}.v2434-unit-list button small{display:block;margin-top:3px;color:#c7b792}.v2434-unit-list button.active{outline:2px solid #e5bd5e;background:#392a14}.v2434-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.v2434-actions button{min-height:50px}.v2434-help{margin-top:12px;padding:10px;border:1px solid #5b5141;background:#17140f;color:#cfc2a9;font-size:11px;line-height:1.55}@media(max-width:700px){.v2434-actions{grid-template-columns:1fr}.v2434-deployment .battle-grid{min-width:540px}.v2434-deployment .panel:first-child{overflow-x:auto}}
`;
document.head.appendChild(style);
})();
