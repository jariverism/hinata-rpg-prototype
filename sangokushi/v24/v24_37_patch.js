// v24.37 — allocation modes, delayed mole deployment, and friendly pass-through
(()=>{
const previousRender=window.render;
const V=window.V2432||{};
let modalTimer=null;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function floor100(v){return Math.max(0,Math.floor((Number(v)||0)/100)*100)}
function typeOf(u){const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t}
function modalTitle(){return modalCard?.querySelector('h2')?.textContent?.trim()||''}
function availableTroops(kind){
 if(kind==='attack')return floor100(Math.max(0,(Number(state?.cities?.[state.selected]?.troops)||0)-500));
 const cityName=modalTitle().replace(/防衛戦.*$/,'').trim();
 return floor100(Math.max(0,Number(state?.cities?.[cityName]?.troops)||0));
}

function enhanceAllocation(){
 if(!modalCard||!modal?.classList?.contains('on'))return;
 const block=modalCard.querySelector('.v2436-prebattle');
 if(!block||block.dataset.v2437Enhanced==='1')return;
 const attackInputs=[...modalCard.querySelectorAll('[data-v2420-atknum]')];
 const defenseInputs=[...modalCard.querySelectorAll('[data-v2420-defnum]')];
 const kind=attackInputs.length?'attack':defenseInputs.length?'defense':null;
 if(!kind)return;
 const inputs=kind==='attack'?attackInputs:defenseInputs;
 const checkName=kind==='attack'?'v2420-atk':'v2420-def';
 const checkboxes=[...modalCard.querySelectorAll(`input[name="${checkName}"]`)];
 const summary=block.querySelector('#v2436-allocation-summary');
 const sequentialButton=block.querySelector('#v2436-max-allocation');
 const go=modalCard.querySelector(kind==='attack'?'#v2420-atk-go':'#v2420-defense-go');
 if(!summary||!sequentialButton||!go)return;
 block.dataset.v2437Enhanced='1';block.classList.add('v2437-prebattle');

 const inputName=input=>input.dataset.v2420Atknum||input.dataset.v2420Defnum||'';
 const inputByName=name=>inputs.find(input=>inputName(input)===name);
 const selectedNames=()=>checkboxes.filter(c=>c.checked).map(c=>c.value).slice(0,7);
 const selectedInputs=()=>selectedNames().map(inputByName).filter(Boolean);
 const capOf=input=>floor100(Math.max(100,Number(input.max)||100));
 let mode='sequential';

 const modes=document.createElement('div');modes.className='v2437-allocation-modes';
 sequentialButton.textContent='順番に最大';sequentialButton.type='button';sequentialButton.classList.add('active');
 const equalButton=document.createElement('button');equalButton.type='button';equalButton.textContent='均等配分';
 sequentialButton.before(modes);modes.append(sequentialButton,equalButton);
 const note=document.createElement('small');note.className='v2437-manual-note';
 note.textContent='自動配分後も、兵数欄または－／＋ボタンで各隊を自由に調整できます。';summary.after(note);

 function updateSummary(){
  const selected=selectedInputs(),available=availableTroops(kind);
  const total=selected.reduce((s,i)=>s+(Number(i.value)||0),0),remaining=available-total;
  summary.textContent=`配分合計 ${total.toLocaleString()}／使用可能 ${available.toLocaleString()}${kind==='attack'?'（都市に500残す）':''}　${remaining>=0?`残り ${remaining.toLocaleString()}`:`超過 ${Math.abs(remaining).toLocaleString()}`}`;
  summary.classList.toggle('over',remaining<0);go.disabled=!selected.length||remaining<0;
 }
 function normalize(){
  for(const input of inputs){
   const checked=checkboxes.find(c=>c.value===inputName(input))?.checked;
   input.disabled=!checked;input.min='100';input.step='100';input.max=String(capOf(input));
   input.value=checked?String(clamp(floor100(input.value)||100,100,capOf(input))):'100';
  }
 }
 function minimums(selected,available){
  const values=new Map();let remaining=available;
  for(const input of selected){const base=remaining>=100?100:0;values.set(input,base);remaining-=base}
  return {values,remaining};
 }
 function allocateSequential(){
  normalize();const selected=selectedInputs(),seed=minimums(selected,availableTroops(kind));let remaining=seed.remaining;
  for(const input of selected){if(remaining<100)break;const current=seed.values.get(input)||0,add=floor100(Math.min(capOf(input)-current,remaining));seed.values.set(input,current+add);remaining-=add}
  for(const input of selected)input.value=String(Math.max(100,seed.values.get(input)||100));updateSummary();
 }
 function allocateEqual(){
  normalize();const selected=selectedInputs(),seed=minimums(selected,availableTroops(kind));let remaining=seed.remaining;
  while(remaining>=100){
   const eligible=selected.filter(i=>(seed.values.get(i)||0)+100<=capOf(i));if(!eligible.length)break;
   for(const input of eligible){if(remaining<100)break;seed.values.set(input,(seed.values.get(input)||0)+100);remaining-=100}
  }
  for(const input of selected)input.value=String(Math.max(100,seed.values.get(input)||100));updateSummary();
 }
 function applyMode(){mode==='equal'?allocateEqual():allocateSequential()}
 function setMode(next){mode=next;sequentialButton.classList.toggle('active',mode==='sequential');equalButton.classList.toggle('active',mode==='equal');applyMode()}
 sequentialButton.onclick=()=>setMode('sequential');equalButton.onclick=()=>setMode('equal');

 for(const input of inputs){
  const stepper=document.createElement('span');stepper.className='v2437-stepper';
  const minus=document.createElement('button');minus.type='button';minus.textContent='－100';
  const plus=document.createElement('button');plus.type='button';plus.textContent='＋100';
  input.before(stepper);stepper.append(minus,input,plus);
  const change=delta=>{if(input.disabled)return;input.value=String(clamp(floor100(input.value)+delta,100,capOf(input)));updateSummary()};
  minus.onclick=e=>{e.preventDefault();e.stopPropagation();change(-100)};
  plus.onclick=e=>{e.preventDefault();e.stopPropagation();change(100)};
  input.addEventListener('input',updateSummary);
  input.addEventListener('change',()=>{input.value=String(clamp(floor100(input.value)||100,100,capOf(input)));updateSummary()});
 }
 checkboxes.forEach(cb=>cb.addEventListener('change',applyMode));
 go.addEventListener('click',event=>{
  const selected=selectedInputs(),total=selected.reduce((s,i)=>s+(Number(i.value)||0),0),available=availableTroops(kind);
  if(!selected.length||total>available){event.preventDefault();event.stopImmediatePropagation();alert(total>available?'使用可能兵力を超えています。':'出陣武将を選択してください。')}
 },true);
 normalize();allocateSequential();
}

function preDeployment(b){
 if(!b||b.v2434DeploymentDone)return false;
 if(b.v2434DeploymentActive)return true;
 return Number(b.day||1)===1&&b.phase==='player'&&!b.mode&&!b.v2432Mode&&!b.v2423Target&&!(b.units||[]).some(u=>u.done||u.movedThisTurn||u.v2433DuelCaptured);
}
function enemyContext(b){return b?.defense?{force:b.invadingForce||null,city:b.enemySource||null}:{force:state?.cities?.[b?.target]?.force||null,city:b?.target||null}}
function deferAlreadyActivatedMoles(b){
 if(!preDeployment(b)||b.v2437DeferredChecked)return;b.v2437DeferredChecked=true;
 const records=[];
 for(const unit of (b.units||[])){
  if(unit.side!=='player'||!unit.v2424Turncoat||!unit.originalForce)continue;
  const officer=(state.officers||[]).find(o=>o.name===unit.name&&o.force==='日向軍');
  records.push({name:unit.name,force:unit.originalForce,loy:officer?.loy});
  unit.side='enemy';unit.done=false;unit.movedThisTurn=false;unit.v2437DeferredMole=true;
  if(officer){officer.force=unit.originalForce;officer.city=enemyContext(b).city;officer.status='一般'}
 }
 if(records.length){
  b.v2437DeferredTurncoats=records;
  b.logs=(b.logs||[]).filter(line=>!records.some(r=>String(line).includes(`伏毒発動！ ${r.name}`)));
 }
}
function activateDeferredMoles(b){
 const records=b?.v2437DeferredTurncoats;if(!b?.v2434DeploymentDone||!Array.isArray(records)||b.v2437DeferredActivated)return;
 b.v2437DeferredActivated=true;b._v2424Turncoats=Array.isArray(b._v2424Turncoats)?b._v2424Turncoats:[];
 for(const rec of records){
  const unit=(b.units||[]).find(u=>u.name===rec.name&&u.v2437DeferredMole),officer=(state.officers||[]).find(o=>o.name===rec.name&&o.force===rec.force);
  if(!unit)continue;
  unit.side='player';unit.done=false;unit.movedThisTurn=false;unit.v2424Turncoat=true;delete unit.v2437DeferredMole;
  if(officer){officer.force='日向軍';officer.city=b.target;officer.status='一般';officer.acted=state.turn;if(Number.isFinite(Number(rec.loy)))officer.loy=rec.loy}
  if(!b._v2424Turncoats.includes(rec.name))b._v2424Turncoats.push(rec.name);
  b.logs.unshift(`伏毒発動！ ${rec.name}隊が敵陣で旗を翻し、日向軍へ寝返った！`);
 }
}
function guardMolesDuringDeployment(b){
 if(!b)return;
 if(preDeployment(b)){
  deferAlreadyActivatedMoles(b);
  if(!b.v2437MoleGuard){b.v2437MoleGuard=true;if(!b._v2424MolesChecked){b._v2424MolesChecked=true;b.v2437OwnedMoleCheck=true}}
 }else if(b.v2434DeploymentDone&&b.v2437MoleGuard){
  if(b.v2437OwnedMoleCheck)delete b._v2424MolesChecked;
  b.v2437MoleGuard=false;delete b.v2437OwnedMoleCheck;activateDeferredMoles(b);
 }
}

function terrainCost(u,x,y){return typeof V.terrainCost==='function'?V.terrainCost(u,x,y):1}
function occupiedAt(b,x,y){return (b?.units||[]).find(u=>Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y)||null}
function movePoints(u){return typeof V.movePoints==='function'?V.movePoints(u):2+(Number(u?.moveRangeBonus)||0)}
function friendlyReachable(b,u){
 const out=new Map();if(!u||u.done||u.movedThisTurn||u.immobileTurns>0)return out;
 const max=movePoints(u),start=`${u.x},${u.y}`,best=new Map([[start,0]]),queue=[[Number(u.x),Number(u.y),0]];
 while(queue.length){queue.sort((a,c)=>a[2]-c[2]);const [x,y,cost]=queue.shift();
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=9||ny<0||ny>=7)continue;
   const step=terrainCost(u,nx,ny),next=cost+step,key=`${nx},${ny}`;if(!Number.isFinite(step)||next>max||next>=(best.get(key)??Infinity))continue;
   const occ=occupiedAt(b,nx,ny),friendly=occ&&occ.side===u.side&&!occ.v2436Structure;
   if(occ&&!friendly)continue;
   best.set(key,next);queue.push([nx,ny,next]);if(!occ)out.set(key,next);
  }
 }
 return out;
}
function decorateFriendlyPassThrough(){
 const b=state?.battle;if(!b||b.v2434DeploymentActive||!b.v2434DeploymentDone)return;
 const p=(b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&u.troops>0),mode=b.v2432Mode||b.mode;
 if(!p||p.done||mode!=='move')return;
 const reachable=friendlyReachable(b,p);
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  const [x,y]=cell.dataset.cell.split(',').map(Number),key=`${x},${y}`,occ=occupiedAt(b,x,y);
  if(occ||!reachable.has(key))return;
  cell.classList.add('v2423-reachable','v2437-friendly-route');
  cell.onclick=()=>{
   if(state?.battle!==b||occupiedAt(b,x,y))return;
   const cost=reachable.get(key);p.x=x;p.y=y;p.movedDistance=cost;p.movedThisTurn=true;p.moveRangeBonus=0;b.mode=null;b.v2432Mode=null;
   if(typeOf(p)==='騎兵'){b.logs.unshift(`${p.name}隊が味方部隊の間を抜けて進軍。続けて攻撃できます。`);b.mode='attack';b.v2432Mode='attack';render()}
   else{p.done=true;b.logs.unshift(`${p.name}隊が味方部隊の間を抜けて進軍。`);window.afterPlayerAction()}
  };
 });
}

window.render=function(){
 const b=state?.battle;if(b)guardMolesDuringDeployment(b);
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(()=>{try{decorateFriendlyPassThrough()}catch(e){console.error('v24.37 movement:',e)}},70);
 return result;
};

const observer=new MutationObserver(()=>{clearTimeout(modalTimer);modalTimer=setTimeout(enhanceAllocation,0)});
if(modalCard)observer.observe(modalCard,{childList:true,subtree:true});setTimeout(enhanceAllocation,0);

const style=document.createElement('style');style.textContent=`
.v2437-allocation-modes{display:grid;grid-template-columns:1fr 1fr;gap:7px;grid-column:1/-1}.v2437-allocation-modes button.active{outline:2px solid #e5bd5e;background:#493514;color:#ffe6a3}.v2437-stepper{display:grid;grid-template-columns:auto minmax(82px,1fr) auto;gap:4px;align-items:center}.v2437-stepper button{padding:6px;font-size:10px;min-height:34px}.v2437-stepper input{width:100%!important;min-width:82px}.v2437-manual-note{grid-column:1/-1;color:#bfe0ed!important}.v2436-prebattle small.over{color:#ff9e92!important;font-weight:800}.v2437-friendly-route{box-shadow:inset 0 0 0 2px #72c6f0,inset 0 0 14px rgba(92,188,232,.36)!important}@media(max-width:560px){.v2437-allocation-modes{grid-template-columns:1fr 1fr}.v2437-stepper{grid-template-columns:auto minmax(72px,1fr) auto}}
`;document.head.appendChild(style);
})();
