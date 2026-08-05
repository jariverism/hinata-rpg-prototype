// v24.36 — commanders, morale/routing, siege gates/walls, and max troop allocation
(()=>{
const V=window.V2432||{};
const previousRender=window.render;
const previousBattleAction=window.battleAction;
const previousCheckBattleEnd=window.checkBattleEnd;
const previousEndBattle=window.endBattle;
const previousEnemyPhase=window.enemyPhase;
const W=9,H=7;
let modalPatchTimer=null;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function typeOf(u){const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function isStructure(u){return !!u?.v2436Structure}
function livingUnits(b,side){return (b?.units||[]).filter(u=>u.side===side&&!isStructure(u)&&Number(u.troops)>0)}
function allCombatUnits(b){return (b?.units||[]).filter(u=>!isStructure(u)&&['player','enemy'].includes(u.side))}
function enemyForce(b){return b?.defense?(b.invadingForce||state?.cities?.[b.enemySource]?.force):state?.cities?.[b?.target]?.force}
function officerFor(u,b=state?.battle){
 if(!u)return null;
 const force=u.side==='player'?'日向軍':enemyForce(b);
 return (state?.officers||[]).find(o=>o.name===u.name&&(!force||o.force===force))||
  (state?.officers||[]).find(o=>o.name===u.name)||null;
}
function commanderUnit(b,side){
 const name=b?.v2436Commanders?.[side];
 return (b?.units||[]).find(u=>u.side===side&&!isStructure(u)&&u.name===name)||null;
}
function actualSideMoraleCity(b,side){
 const name=side==='player'?(b.defense?b.target:b.src):(b.defense?b.enemySource:b.target);
 return state?.cities?.[name]||null;
}
function battleStarted(b){
 if(!b)return true;
 if(Number(b.day||1)>1||b.phase!=='player')return true;
 if(b.v2434DeploymentActive)return false;
 return allCombatUnits(b).some(u=>u.done||u.movedThisTurn||u.v2433DuelCaptured)||
  !!b.mode||!!b.v2432Mode||!!b.v2423Target;
}

function chooseCommander(b,side){
 const candidates=livingUnits(b,side);
 if(!candidates.length)return null;
 const pending=side==='player'?state?.v2436PendingCommander:null;
 if(pending&&candidates.some(u=>u.name===pending))return pending;
 const existing=b.v2436Commanders?.[side];
 if(existing)return existing;
 const ruler=candidates.find(u=>officerFor(u,b)?.status==='君主');
 if(side==='enemy'&&ruler)return ruler.name;
 return candidates.slice().sort((a,z)=>(Number(z.lead)||0)-(Number(a.lead)||0)||(Number(z.war)||0)-(Number(a.war)||0))[0].name;
}
function ensureCommandersAndMorale(b){
 if(!b)return;
 b.v2436Commanders=b.v2436Commanders||{};
 b.v2436Commanders.player=chooseCommander(b,'player')||b.v2436Commanders.player;
 b.v2436Commanders.enemy=chooseCommander(b,'enemy')||b.v2436Commanders.enemy;
 for(const side of ['player','enemy']){
  const commander=commanderUnit(b,side),city=actualSideMoraleCity(b,side);
  const base=clamp(Number(city?.morale)||65,30,95);
  const aura=commander?Math.round(((Number(commander.lead)||70)-70)/4):0;
  for(const u of (b.units||[])){
   if(u.side!==side||isStructure(u))continue;
   if(!Number.isFinite(Number(u.morale)))u.morale=clamp(base+aura+(u.name===commander?.name?8:0),20,100);
   u.maxMorale=100;
  }
 }
 if(!b.v2436CommanderAnnounced&&b.v2436Commanders.player&&b.v2436Commanders.enemy){
  b.v2436CommanderAnnounced=true;
  b.logs=Array.isArray(b.logs)?b.logs:[];
  b.logs.unshift(`総大将：日向軍 ${b.v2436Commanders.player}／敵軍 ${b.v2436Commanders.enemy}。総大将の統率が全軍士気に影響する。`);
 }
}

function ensureSiege(b){
 if(!b||b.v2436Siege||b.v2436SiegeSkipped)return;
 if(battleStarted(b)){
  b.v2436SiegeSkipped=true;
  return;
 }
 const city=state?.cities?.[b.target];
 if(!city)return;
 const defenderSide=b.defense?'player':'enemy';
 const wallValue=clamp(Number(city.wall)||50,10,100);
 const gateMax=Math.round((1200+wallValue*35)/100)*100;
 const gate={name:'城門',side:defenderSide,ownerSide:defenderSide,troops:gateMax,max:gateMax,x:6,y:3,war:0,int:90,lead:100,type:'剣盾兵',done:false,v2436Structure:true,v2436Gate:true};
 const walls=[];
 for(let y=0;y<H;y++){
  if(y===3)continue;
  walls.push({name:`城壁${y+1}`,side:'structure',ownerSide:defenderSide,troops:1,max:1,x:6,y,war:0,int:0,lead:100,type:'城壁',done:true,v2436Structure:true,v2436Wall:true});
 }
 b.units.push(...walls,gate);
 b.v2436Siege={defenderSide,attackerSide:defenderSide==='player'?'enemy':'player',gateName:'城門',gateMax,wallValue,breached:false};
 b.logs=Array.isArray(b.logs)?b.logs:[];
 b.logs.unshift(`${b.target}の城壁が戦場を分断する。城門耐久${gateMax.toLocaleString()}。城門を破らなければ城内へ侵入できない。`);
}
function gateUnit(b=state?.battle){return (b?.units||[]).find(u=>u.v2436Gate)}
function gateAlive(b=state?.battle){return Number(gateUnit(b)?.troops)>0}
function applyWallGuard(b){
 const siege=b?.v2436Siege;if(!siege)return;
 const alive=gateAlive(b);
 for(const u of (b.units||[])){
  if(isStructure(u)||u.side!==siege.defenderSide)continue;
  if(!Number.isFinite(Number(u.v2436BaseLead)))u.v2436BaseLead=Number(u.lead)||50;
  u.lead=alive?clamp(u.v2436BaseLead+10,1,110):u.v2436BaseLead;
 }
 if(!alive&&!siege.breached){
  siege.breached=true;
  const city=state?.cities?.[b.target];
  if(city&&!siege.wallDamageApplied){city.wall=Math.max(10,(Number(city.wall)||50)-12);siege.wallDamageApplied=true}
  b.logs.unshift(`城門が破壊された！ 守備側の城壁統率補正が失われ、城内への道が開いた。`);
  shiftMorale(siege.defenderSide,-12,'城門陥落',b);
  shiftMorale(siege.attackerSide,6,'城門突破',b);
 }
}
function damageGate(attacker,b=state?.battle){
 const gate=gateUnit(b);if(!b||!attacker||!gate||gate.troops<=0)return false;
 const range=typeOf(attacker)==='弩兵'?3:1;
 if(dist(attacker,gate)>range)return false;
 let damage=180+(Number(attacker.war)||50)*4+(Number(attacker.troops)||0)*.025+rand(0,140);
 if(typeOf(attacker)==='弩兵')damage*=.82;
 damage=Math.max(100,Math.floor(damage));
 gate.troops=Math.max(0,gate.troops-damage);
 b.logs.unshift(`${attacker.name}隊が城門を攻撃。耐久へ${damage.toLocaleString()}損害（残り${gate.troops.toLocaleString()}）。`);
 applyWallGuard(b);
 return true;
}

function shiftMorale(side,delta,reason,b=state?.battle){
 if(!b||!delta)return;
 const targets=livingUnits(b,side);
 if(!targets.length)return;
 for(const u of targets)u.morale=clamp((Number(u.morale)||60)+delta,0,100);
 b.logs.unshift(`${reason}：${side==='player'?'日向軍':'敵軍'}全隊の士気${delta>0?'+':''}${delta}。`);
}
function processStatusMorale(b){
 b.v2436StatusSnapshot=b.v2436StatusSnapshot||{};
 for(const u of allCombatUnits(b)){
  const prev=b.v2436StatusSnapshot[u.name]||{skip:0,weaken:0};
  const skip=Number(u.skipTurns)||0,weaken=Number(u.weakenTurns)||0;
  if(skip>prev.skip&&weaken>prev.weaken){
   u.morale=clamp((Number(u.morale)||60)-14,0,100);
   b.logs.unshift(`${u.name}隊は流言に惑わされ、士気が14低下した。`);
  }
  b.v2436StatusSnapshot[u.name]={skip,weaken};
 }
}
function processDefeatMorale(b){
 for(const u of allCombatUnits(b)){
  if(Number(u.troops)>0||u.v2436DefeatMoraleProcessed)continue;
  u.v2436DefeatMoraleProcessed=true;
  const other=u.side==='player'?'enemy':'player';
  if(u.v2433DuelCaptured){
   shiftMorale(u.side,-16,`${u.name}が一騎打ちで敗北`,b);
   shiftMorale(other,10,`${u.name}を一騎打ちで撃破`,b);
  }else{
   shiftMorale(u.side,-8,`${u.name}隊壊滅`,b);
   shiftMorale(other,3,`${u.name}隊撃破`,b);
  }
  if(b.v2436Commanders?.[u.side]===u.name&&!u.v2436CommanderLossProcessed){
   u.v2436CommanderLossProcessed=true;
   shiftMorale(u.side,-25,`総大将${u.name}敗北`,b);
   shiftMorale(other,5,`敵総大将${u.name}撃破`,b);
  }
 }
}
function recordRout(b,u){
 const force=u.side==='player'?'日向軍':enemyForce(b);
 b.v2436Routed=Array.isArray(b.v2436Routed)?b.v2436Routed:[];
 b.v2436Routed.push({name:u.name,side:u.side,force,survivors:Math.max(0,Math.floor((Number(u.troops)||0)*.55)),commander:b.v2436Commanders?.[u.side]===u.name});
 b.logs.unshift(`${u.name}隊は士気が尽きて潰走。兵の一部は戦場を離脱した。`);
}
function applyRouts(b){
 let changed=true,safety=0;
 while(changed&&safety++<12){
  changed=false;
  const candidates=livingUnits(b,'player').concat(livingUnits(b,'enemy')).filter(u=>(Number(u.morale)||0)<=0);
  if(!candidates.length)break;
  for(const u of candidates){
   if(u.v2436Routed)continue;
   u.v2436Routed=true;recordRout(b,u);
   if(b.v2436Commanders?.[u.side]===u.name){
    const other=u.side==='player'?'enemy':'player';
    shiftMorale(u.side,-18,`総大将${u.name}潰走`,b);shiftMorale(other,5,`敵総大将${u.name}潰走`,b);
   }
   const index=b.units.indexOf(u);if(index>=0)b.units.splice(index,1);
   changed=true;
  }
 }
 for(const u of livingUnits(b,'player').concat(livingUnits(b,'enemy'))){
  if((Number(u.morale)||0)<=25)u.weakenTurns=Math.max(Number(u.weakenTurns)||0,1);
 }
}
function dailyMoraleRecovery(b){
 const stamp=Number(b.day)||1;if(b.v2436RecoveryDay===stamp)return;
 b.v2436RecoveryDay=stamp;
 for(const u of livingUnits(b,'player').concat(livingUnits(b,'enemy'))){
  const commander=b.v2436Commanders?.[u.side]===u.name;
  u.morale=clamp((Number(u.morale)||60)+(commander?3:2),0,100);
 }
}
function processBattleSystems(b=state?.battle){
 if(!b)return;
 ensureSiege(b);ensureCommandersAndMorale(b);dailyMoraleRecovery(b);processStatusMorale(b);processDefeatMorale(b);applyWallGuard(b);applyRouts(b);
 const gate=gateUnit(b);
 if(gate&&gate.troops>0){
  const realDefenders=livingUnits(b,gate.side);
  if(!realDefenders.length){gate.troops=0;b.logs.unshift('守備部隊が全滅し、城門は放棄された。');applyWallGuard(b)}
 }
}

function nearestCity(from,force){
 const q=[from],seen=new Set([from]);
 while(q.length){const name=q.shift();if(state?.cities?.[name]?.force===force)return state.cities[name];for(const n of state?.cities?.[name]?.n||[])if(!seen.has(n)){seen.add(n);q.push(n)}}
 return null;
}
function returnRoutedSurvivors(b,win){
 if(!b||b.v2436RoutedReturned)return;b.v2436RoutedReturned=true;
 const records=Array.isArray(b.v2436Routed)?b.v2436Routed:[];
 for(const r of records){
  if(!r.survivors)continue;
  let city=null;
  if(r.side==='player'){
   if(b.defense&&state?.cities?.[b.target]?.force==='日向軍')city=state.cities[b.target];
   else if(state?.cities?.[b.src]?.force==='日向軍')city=state.cities[b.src];
   else city=nearestCity(b.target,'日向軍');
  }else{
   if(b.defense&&state?.cities?.[b.enemySource]?.force===r.force)city=state.cities[b.enemySource];
   else if(state?.cities?.[b.target]?.force===r.force)city=state.cities[b.target];
   else city=nearestCity(b.target,r.force);
  }
  if(city){city.troops=(Number(city.troops)||0)+r.survivors;if(typeof log==='function')log(`${r.name}隊の潰走兵${r.survivors.toLocaleString()}が${city.name}へ帰還した。`)}
 }
}

function setTemporaryStructureVisibility(b,visible){
 const changed=[];
 for(const u of (b?.units||[])){
  if(!isStructure(u)||u.troops<=0)continue;
  if(!visible){changed.push([u,u.troops]);u.troops=0}
 }
 return ()=>{for(const [u,t] of changed)if(u.troops===0)u.troops=t};
}

window.battleAction=function(action){
 const b=state?.battle;if(!b)return previousBattleAction.apply(this,arguments);
 processBattleSystems(b);
 if(action==='gate'){
  const p=livingUnits(b,'player').find(u=>u.name===b.selected);
  if(!p||p.done||b.v2436Siege?.attackerSide!=='player')return;
  if(!damageGate(p,b)){b.logs.unshift('城門攻撃の射程外です。');return render()}
  p.done=true;if(window.checkBattleEnd())return;return window.afterPlayerAction();
 }
 if(action==='duel'||action==='tactic'){
  const restore=setTemporaryStructureVisibility(b,false);
  try{return previousBattleAction.apply(this,arguments)}finally{restore()}
 }
 return previousBattleAction.apply(this,arguments);
};
window.checkBattleEnd=function(){
 const b=state?.battle;if(!b)return true;
 processBattleSystems(b);
 return previousCheckBattleEnd.apply(this,arguments);
};
window.endBattle=function(win,retreat){
 const b=state?.battle;if(b)processBattleSystems(b);
 const result=previousEndBattle.apply(this,arguments);
 if(b)returnRoutedSurvivors(b,!!win)
 return result;
};
window.enemyPhase=function(){
 const b=state?.battle;if(!b)return previousEnemyPhase.apply(this,arguments);
 processBattleSystems(b);
 const gate=gateUnit(b),disableEnemySchemes=b.defense&&gate&&gate.troops>0;
 const saved=[];
 if(disableEnemySchemes){
  for(const u of livingUnits(b,'enemy')){saved.push([u,u.int,u.v2432DuelOffered]);u.int=0;u.v2432DuelOffered=true}
 }
 const result=previousEnemyPhase.apply(this,arguments);
 if(disableEnemySchemes){
  const timer=setInterval(()=>{
   if(state?.battle!==b||b.phase==='player'||!gateAlive(b)){
    clearInterval(timer);for(const [u,intValue,duel] of saved){u.int=intValue;u.v2432DuelOffered=duel}
   }
  },60);
 }
 return result;
};

function decorateBattle(){
 const b=state?.battle;if(!b)return;processBattleSystems(b);
 document.querySelectorAll('[data-unit]').forEach(el=>{
  const u=(b.units||[]).find(x=>x.name===el.dataset.unit&&Number(x.troops)>0);if(!u)return;
  const cell=el.closest('[data-cell]');
  if(isStructure(u)){
   el.classList.add('v2436-structure');
   if(u.v2436Gate){el.innerHTML=`<b>城門</b><br>${Number(u.troops).toLocaleString()}`;cell?.classList.add('v2436-gate-cell')}
   else{el.innerHTML='<b>城壁</b>';cell?.classList.add('v2436-wall-cell')}
   el.onclick=e=>e.stopPropagation();if(cell)cell.onclick=()=>{};return;
  }
  if(!el.querySelector('.v2436-morale')){
   const m=document.createElement('small');m.className='v2436-morale';el.appendChild(m);
  }
  const m=el.querySelector('.v2436-morale');if(m)m.textContent=`士気${Math.round(Number(u.morale)||0)}`;
  el.classList.toggle('v2436-commander',b.v2436Commanders?.[u.side]===u.name);
 });
 const actions=document.querySelector('.battle-actions'),p=livingUnits(b,'player').find(u=>u.name===b.selected),gate=gateUnit(b);
 if(actions&&b.v2436Siege?.attackerSide==='player'&&gate?.troops>0&&!actions.querySelector('[data-ba="gate"]')){
  const btn=document.createElement('button');btn.dataset.ba='gate';btn.textContent='城門攻撃';
  const attack=actions.querySelector('[data-ba="attack"]');attack?.after(btn);
 }
 const gateBtn=actions?.querySelector('[data-ba="gate"]');
 if(gateBtn){const range=p&&typeOf(p)==='弩兵'?3:1;gateBtn.disabled=!p||p.done||!gate||gate.troops<=0||dist(p,gate)>range;gateBtn.onclick=()=>window.battleAction('gate')}
 const panel=document.querySelector('.battle > .panel:last-child');
 if(panel){
  let info=panel.querySelector('.v2436-war-info');if(!info){info=document.createElement('div');info.className='v2436-war-info';panel.querySelector('.battle-actions')?.before(info)}
  const pc=commanderUnit(b,'player'),ec=commanderUnit(b,'enemy');
  const selected=p?`<br>選択部隊：<b>${p.name}</b>　士気${Math.round(Number(p.morale)||0)}`:'';
  info.innerHTML=`<b>総大将</b>　日向軍 ${pc?.name||'―'}／敵軍 ${ec?.name||'―'}${selected}${gate?`<br><b>城門</b>　${Math.max(0,Number(gate.troops)).toLocaleString()}／${Number(gate.max).toLocaleString()}${gate.troops<=0?'（突破済み）':''}`:''}`;
 }
}
window.render=function(){
 const b=state?.battle;if(b)processBattleSystems(b);
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(()=>{try{decorateBattle()}catch(e){console.error('v24.36 decorate:',e)}},40);
 return result;
};

function modalTitle(){return modalCard?.querySelector('h2')?.textContent?.trim()||''}
function availableTroops(kind){
 if(kind==='attack')return Math.max(0,(Number(state?.cities?.[state.selected]?.troops)||0)-500);
 const title=modalTitle(),cityName=title.replace(/防衛戦.*$/,'').trim();
 return Math.max(0,Number(state?.cities?.[cityName]?.troops)||0);
}
function patchPreparationModal(){
 if(!modalCard||!modal?.classList?.contains('on'))return;
 const attackInputs=[...modalCard.querySelectorAll('[data-v2420-atknum]')];
 const defenseInputs=[...modalCard.querySelectorAll('[data-v2420-defnum]')];
 const kind=attackInputs.length?'attack':defenseInputs.length?'defense':null;
 if(!kind||modalCard.querySelector('.v2436-prebattle'))return;
 const inputs=kind==='attack'?attackInputs:defenseInputs;
 const checkName=kind==='attack'?'v2420-atk':'v2420-def';
 const checkboxes=[...modalCard.querySelectorAll(`input[name="${checkName}"]`)];
 const go=modalCard.querySelector(kind==='attack'?'#v2420-atk-go':'#v2420-defense-go');
 if(!go||typeof go.onclick!=='function')return;
 const block=document.createElement('div');block.className='v2436-prebattle';
 block.innerHTML=`<label><b>総大将</b><select id="v2436-commander-select"></select></label><button type="button" id="v2436-max-allocation">選択武将に最大配分</button><small id="v2436-allocation-summary"></small>`;
 go.before(block);
 const select=block.querySelector('#v2436-commander-select'),summary=block.querySelector('#v2436-allocation-summary');
 const inputByName=name=>inputs.find(i=>(i.dataset.v2420Atknum||i.dataset.v2420Defnum)===name);
 function selectedNames(){return checkboxes.filter(c=>c.checked).map(c=>c.value).slice(0,7)}
 function rebuildCommander(){
  const names=selectedNames();const old=select.value;select.innerHTML=names.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(names.includes(old))select.value=old;
 }
 function allocateMax(){
  const names=selectedNames(),available=availableTroops(kind);
  let remaining=available;
  const selectedInputs=names.map(inputByName).filter(Boolean);
  const values=new Map();
  for(const input of selectedInputs){const cap=Math.max(100,Number(input.max)||100);const base=remaining>=100?100:0;values.set(input,base);remaining-=base}
  for(const input of selectedInputs){if(remaining<=0)break;const cap=Math.max(100,Number(input.max)||100),current=values.get(input)||0,add=Math.min(cap-current,remaining);values.set(input,current+add);remaining-=add}
  for(const input of inputs){
   if(values.has(input))input.value=Math.max(100,Math.floor((values.get(input)||100)/100)*100);
   else input.value=Math.max(100,Math.floor((Number(input.max)||100)/100)*100);
  }
  const total=selectedInputs.reduce((s,i)=>s+(Number(i.value)||0),0);
  summary.textContent=`配分合計 ${total.toLocaleString()}／使用可能 ${available.toLocaleString()}${kind==='attack'?'（都市に500残す）':''}`;
 }
 checkboxes.forEach(c=>c.addEventListener('change',()=>{rebuildCommander();allocateMax()}));
 inputs.forEach(i=>i.addEventListener('input',()=>{const total=selectedNames().map(inputByName).filter(Boolean).reduce((s,x)=>s+(Number(x.value)||0),0);summary.textContent=`配分合計 ${total.toLocaleString()}／使用可能 ${availableTroops(kind).toLocaleString()}`}));
 block.querySelector('#v2436-max-allocation').onclick=allocateMax;
 select.onchange=()=>{const cb=checkboxes.find(c=>c.value===select.value);if(cb&&!cb.checked){cb.checked=true;rebuildCommander();allocateMax()}};
 rebuildCommander();allocateMax();
 const original=go.onclick;
 go.onclick=function(event){
  const names=selectedNames();if(!names.length)return original.call(this,event);
  const commander=names.includes(select.value)?select.value:names[0];
  state.v2436PendingCommander=commander;
  const result=original.call(this,event);
  if(state?.battle){state.battle.v2436Commanders=state.battle.v2436Commanders||{};state.battle.v2436Commanders.player=commander;ensureCommandersAndMorale(state.battle);setTimeout(()=>render(),0)}
  setTimeout(()=>{if(state?.v2436PendingCommander===commander)delete state.v2436PendingCommander},0);
  return result;
 };
}
const modalObserver=new MutationObserver(()=>{clearTimeout(modalPatchTimer);modalPatchTimer=setTimeout(patchPreparationModal,0)});
if(modalCard)modalObserver.observe(modalCard,{childList:true,subtree:true});
setTimeout(patchPreparationModal,0);

const style=document.createElement('style');
style.textContent=`
.v2436-morale{display:block;margin-top:2px;color:#ffe28a;font-size:8px}.unit.v2436-commander{outline:2px solid #ffd45c;box-shadow:0 0 10px rgba(255,210,75,.7)}.unit.v2436-commander:before{content:'★';color:#ffe27c;margin-right:2px}.unit.v2436-structure{font-size:9px;line-height:1.25;background:#4a4032!important;color:#f2dfb5!important;border-color:#9a8259!important}.v2436-wall-cell{background:linear-gradient(#62594b,#312d27)!important;box-shadow:inset 0 0 0 2px #8e816d}.v2436-gate-cell{background:linear-gradient(90deg,#4c4030,#80633d,#4c4030)!important;box-shadow:inset 0 0 0 2px #b3915b}.v2436-war-info{margin:8px 0;padding:9px 10px;border:1px solid #8b7144;background:#1b160e;color:#dfcfaa;font-size:11px;line-height:1.55}.v2436-prebattle{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;margin:12px 0;padding:10px;border:1px solid #826b3d;background:#1c160d}.v2436-prebattle label{display:grid;gap:4px}.v2436-prebattle select{min-height:38px}.v2436-prebattle small{grid-column:1/-1;color:#d8c69f}@media(max-width:560px){.v2436-prebattle{grid-template-columns:1fr}.v2436-prebattle small{grid-column:1}}
`;
document.head.appendChild(style);
})();
