// v24.20 — playable defensive battles and officer level / command-cap progression
(()=>{
const previousEndMonth=window.endMonth;
const previousEndBattle=window.endBattle;
const previousBattleAction=window.battleAction;
const previousRender=window.render;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function officerByName(name){return state?.officers?.find(o=>o.name===name)}
function ownOfficer(name){const o=officerByName(name);return o&&o.force==='日向軍'?o:null}
function leadershipCeiling(o){return Math.round(5000+clamp(Number(o?.lead)||0,0,100)*150)}
function levelCapacity(o){return 3000+(Math.max(1,Number(o?.level)||1)*1000)}
function commandCapacity(o){return Math.min(leadershipCeiling(o),levelCapacity(o))}
function nextExp(o){return 100+Math.max(1,Number(o?.level)||1)*50}
function officersInCity(city){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&o.city===city&&activeOfficer(o))}
function cityCommandCapacity(city){return 1500+officersInCity(city).reduce((s,o)=>s+commandCapacity(o),0)}
function initProgression(){
 if(!state?.officers)return;
 state.officers.forEach(o=>{
  if(!Number.isFinite(Number(o.level)))o.level=1;
  o.level=clamp(Math.floor(Number(o.level)||1),1,30);
  if(!Number.isFinite(Number(o.exp)))o.exp=0;
  o.exp=Math.max(0,Math.floor(Number(o.exp)||0));
 });
 state.v2420ProgressionVersion=120;
 state.v2420DefenseQueue=Array.isArray(state.v2420DefenseQueue)?state.v2420DefenseQueue:[];
}

function addExp(o,amount,reason){
 if(!o||o.force!=='日向軍'||o.status==='死亡')return;
 initProgression();
 o.exp+=Math.max(0,Math.floor(amount));
 if(typeof log==='function')log(`${o.name}が${reason}で経験値${Math.max(0,Math.floor(amount))}を獲得した。`);
 while(o.level<30&&o.exp>=nextExp(o)){
  const need=nextExp(o),before=commandCapacity(o);o.exp-=need;o.level++;
  const after=commandCapacity(o),increase=Math.max(0,after-before);
  const city=state.cities?.[o.city];
  if(city&&city.force==='日向軍'&&increase>0){
   const room=Math.max(0,cityCommandCapacity(o.city)-city.troops);
   const reinforce=Math.min(increase,room);city.troops+=reinforce;
   if(typeof log==='function')log(`${o.name}がLv${o.level}へ上昇。指揮上限${before.toLocaleString()}→${after.toLocaleString()}、歴戦兵${reinforce.toLocaleString()}が加わった。`);
  }else if(typeof log==='function')log(`${o.name}がLv${o.level}へ上昇。指揮上限${before.toLocaleString()}→${after.toLocaleString()}。`);
 }
}
function trackBattleDamage(b=state?.battle){
 if(!b?.units)return;
 const enemyTotal=b.units.filter(u=>u.side==='enemy'&&u.troops>0).reduce((s,u)=>s+u.troops,0);
 if(!Number.isFinite(Number(b._v2420EnemyTotal))){b._v2420EnemyTotal=enemyTotal;return}
 const delta=Math.max(0,Number(b._v2420EnemyTotal)-enemyTotal);
 if(delta>0){
  const actor=b._v2420LastActor||b.selected;
  b._v2420Damage=b._v2420Damage||{};
  b._v2420Damage[actor]=(b._v2420Damage[actor]||0)+delta;
 }
 b._v2420EnemyTotal=enemyTotal;
}
function awardBattleExp(b,win){
 if(!b||b._v2420ExpAwarded)return;b._v2420ExpAwarded=true;trackBattleDamage(b);
 const names=[...new Set(b.units.filter(u=>u.side==='player'&&ownOfficer(u.name)).map(u=>u.name))];
 names.forEach(name=>{
  const damage=Number(b._v2420Damage?.[name])||0;
  const gain=25+(win?50:10)+Math.min(80,Math.floor(damage/100));
  addExp(ownOfficer(name),gain,win?'勝利と戦功':'戦闘参加');
 });
}

function troopType(o){return o?.apt||o?.type||'剣盾兵'}
function makePlayerUnit(o,troops,x,y){return {name:o.name,side:'player',troops,max:troops,x,y,war:o.war,int:o.int,lead:o.lead,type:troopType(o),done:false,level:o.level}}
function makeEnemyUnits(force,city,total){
 const defs=(state.officers||[]).filter(o=>o.force===force&&o.city===city&&activeOfficer(o))
  .sort((a,b)=>(b.lead||0)-(a.lead||0)).slice(0,7);
 const base=defs.length?defs:[{name:`${force}先鋒`,war:65,int:55,lead:65,apt:'剣盾兵'}];
 const count=Math.max(1,Math.min(base.length,7,Math.floor(total/300)||1)),list=base.slice(0,count);
 let remaining=total;
 return list.map((o,i)=>{
  const left=list.length-i,share=i===list.length-1?remaining:Math.floor(remaining/left);remaining-=share;
  return {name:o.name,side:'enemy',troops:share,max:share,x:0,y:i,war:o.war,int:o.int,lead:o.lead,type:troopType(o),done:false};
 });
}
function nearestOwnCity(from,exclude=null){
 const q=[from],seen=new Set([from]);
 while(q.length){const n=q.shift();if(n!==exclude&&state.cities[n]?.force==='日向軍')return state.cities[n];for(const nx of state.cities[n]?.n||[])if(!seen.has(nx)){seen.add(nx);q.push(nx)}}
 return null;
}
function moveInvadingOfficers(force,from,to){
 (state.officers||[]).filter(o=>o.force===force&&o.city===from&&activeOfficer(o)&&o.status!=='君主')
  .sort((a,b)=>(b.lead||0)-(a.lead||0)).slice(0,2).forEach(o=>o.city=to);
}

function showDefenseDeployment(threat){
 initProgression();
 const src=state.cities?.[threat.from],target=state.cities?.[threat.to];
 if(!src||!target||src.force!==threat.force||target.force!=='日向軍'){return launchNextDefense()}
 const commit=Math.max(0,Math.min(Math.floor(src.troops*.58),src.troops-1200));
 if(commit<1200){if(typeof log==='function')log(`${threat.force}軍は兵力不足により${target.name}侵攻を断念した。`);return launchNextDefense()}
 const defenders=officersInCity(target.name).slice().sort((a,b)=>(b.lead||0)-(a.lead||0));
 const rows=defenders.length?defenders.map((o,i)=>{
  const cap=commandCapacity(o),suggest=Math.max(100,Math.min(cap,Math.floor(target.troops/Math.max(1,Math.min(7,defenders.length)))));
  return `<label class="select-row v2420-deploy"><input name="v2420-def" type="checkbox" value="${o.name}" ${i<Math.min(3,defenders.length)?'checked':''}><span><b>${o.name}</b><small> Lv${o.level}　統${o.lead}　指揮上限${cap.toLocaleString()}</small></span><input data-v2420-defnum="${o.name}" type="number" min="100" step="100" max="${cap}" value="${suggest}"></label>`;
 }).join(''):`<p>${target.name}には配下武将がいません。城兵隊で防衛します。</p>`;
 showModal(`<h2>${target.name}防衛戦</h2><div class="v2420-defense-summary"><b>${threat.force}軍が${src.name}から侵攻</b><br>敵投入予定兵力 約${commit.toLocaleString()}／守備可能兵${target.troops.toLocaleString()}</div>${rows}<p><small>最大7部隊。各武将はレベルと統率で決まる指揮上限まで兵を率いられます。</small></p><button id="v2420-defense-go" class="danger">守備隊を編成して迎撃</button>`);
 modalCard.querySelector('#v2420-defense-go').onclick=()=>{
  let units=[],total=0;
  if(defenders.length){
   const names=[...modalCard.querySelectorAll('[name="v2420-def"]:checked')].map(x=>x.value).slice(0,7);
   if(!names.length)return alert('守備武将を選択してください。');
   for(let i=0;i<names.length;i++){
    const o=ownOfficer(names[i]),cap=commandCapacity(o),input=modalCard.querySelector(`[data-v2420-defnum="${names[i]}"]`);
    const num=Math.floor((Number(input?.value)||0)/100)*100;
    if(num<100||num>cap)return alert(`${o.name}の兵数は100～${cap.toLocaleString()}の範囲で指定してください。`);
    total+=num;units.push(makePlayerUnit(o,num,8,i));
   }
  }else{
   total=Math.min(target.troops,3000);if(total<100)return alert('守備兵が不足しています。');
   units=[{name:`${target.name}城兵隊`,side:'player',troops:total,max:total,x:8,y:3,war:55,int:45,lead:55,type:'剣盾兵',done:false}];
  }
  if(total>target.troops)return alert('都市の守備兵数を超えています。');
  src.troops-=commit;target.troops-=total;
  const enemies=makeEnemyUnits(threat.force,src.name,commit);
  closeModal();
  state.battle={src:target.name,target:target.name,defense:true,enemySource:src.name,invadingForce:threat.force,phase:'player',day:1,selected:units[0].name,units:[...units,...enemies],terrain:Array.from({length:63},(_,i)=>i%17===0?'forest':i%23===0?'hill':'plain'),logs:[`${target.name}防衛戦開始。${threat.force}軍${commit.toLocaleString()}が来襲。`]};
  state.battle._v2420EnemyTotal=commit;render();
 };
}
function launchNextDefense(){
 if(!state||state.battle)return;
 const queue=state.v2420DefenseQueue||[];
 while(queue.length){
  const t=queue.shift(),src=state.cities?.[t.from],target=state.cities?.[t.to];
  if(src&&target&&src.force===t.force&&target.force==='日向軍'){setTimeout(()=>showDefenseDeployment(t),0);return}
 }
 render();
}
function interceptDueThreats(){
 initProgression();
 const dueTurn=(Number(state.turn)||0)+1,all=Array.isArray(state.aiThreats)?state.aiThreats:[],due=[],keep=[];
 all.forEach(t=>{if(Number(t.due)<=dueTurn)due.push({...t});else keep.push(t)});state.aiThreats=keep;return due;
}

window.endMonth=function(){
 const due=interceptDueThreats();
 const result=previousEndMonth.apply(this,arguments);
 initProgression();
 state.v2420DefenseQueue.push(...due);
 if(due.length)setTimeout(launchNextDefense,0);
 return result;
};

function finishDefense(win,retreat){
 const b=state.battle;if(!b)return;
 awardBattleExp(b,win);
 const city=state.cities[b.target],enemySource=state.cities[b.enemySource];
 const playerRemain=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+u.troops,0);
 const enemyRemain=b.units.filter(u=>u.side==='enemy'&&u.troops>0).reduce((s,u)=>s+u.troops,0);
 if(win){
  city.force='日向軍';city.troops+=playerRemain;city.morale=Math.min(100,(city.morale||60)+6);
  if(enemySource&&enemySource.force===b.invadingForce)enemySource.troops+=Math.floor(enemyRemain*.35);
  if(typeof log==='function')log(`${city.name}防衛戦に勝利。残存守備兵${playerRemain.toLocaleString()}。`);
  state.battle=null;state.selected=city.name;render();setTimeout(launchNextDefense,0);return;
 }
 const refuge=nearestOwnCity(city.name,city.name);
 const allDefenders=(state.officers||[]).filter(o=>o.force==='日向軍'&&o.city===city.name&&activeOfficer(o));
 city.force=b.invadingForce;city.troops=Math.max(800,enemyRemain);city.morale=Math.max(38,(city.morale||60)-12);
 moveInvadingOfficers(b.invadingForce,b.enemySource,city.name);
 if(refuge){
  refuge.troops+=playerRemain;allDefenders.forEach(o=>o.city=refuge.name);state.selected=refuge.name;
  if(typeof log==='function')log(`${city.name}防衛戦に敗北。${b.invadingForce}軍が占領し、残存兵${playerRemain.toLocaleString()}は${refuge.name}へ退却した。`);
 }else{
  allDefenders.forEach(o=>{o.status='捕虜';o.captor=b.invadingForce});state.over=true;state.aiDefeated=true;state.selected=city.name;
  if(typeof log==='function')log(`${city.name}が陥落し、日向軍はすべての拠点を失った。`);
 }
 state.battle=null;render();setTimeout(launchNextDefense,0);
}
window.endBattle=function(win,retreat){
 const b=state?.battle;if(b?.defense)return finishDefense(win,retreat);
 if(b)awardBattleExp(b,win);
 return previousEndBattle.apply(this,arguments);
};

window.battleAction=function(action){
 const b=state?.battle;if(b){trackBattleDamage(b);if(['attack','fire','special'].includes(action))b._v2420LastActor=b.selected}
 if(b?.defense&&action==='retreat'){
  const remain=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+u.troops,0);
  showModal(`<h2>防衛放棄の確認</h2><div class="retreat-confirm"><b>${b.target}を放棄して撤退します。</b><br>残存兵${remain.toLocaleString()}は、退却可能な自国都市へ移動します。</div><button id="v2420-defense-retreat" class="danger">撤退を確定</button><button data-close>戦闘へ戻る</button>`);
  modalCard.querySelector('#v2420-defense-retreat').onclick=()=>{closeModal();finishDefense(false,true)};return;
 }
 const result=previousBattleAction.apply(this,arguments);trackBattleDamage(b);return result;
};

window.attack=function(actor){
 initProgression();
 const destinations=neighbors(state.selected).filter(n=>state.cities[n].force!=='日向軍');
 if(!destinations.length)return alert('攻撃可能都市なし');
 const list=ready(state.selected);
 showModal(`<h2>出兵</h2><div class="form-row"><label>攻撃先</label><select id="v2420-atk-dest">${destinations.map(x=>`<option>${x}</option>`).join('')}</select></div>${list.map((o,i)=>{const cap=commandCapacity(o);return `<label class="select-row v2420-deploy"><input name="v2420-atk" type="checkbox" value="${o.name}" ${i===0?'checked':''}><span><b>${o.name}</b><small> Lv${o.level}　EXP${o.exp}/${nextExp(o)}　統${o.lead}　上限${cap.toLocaleString()}</small></span><input data-v2420-atknum="${o.name}" type="number" min="100" step="100" max="${cap}" value="${Math.min(1000,cap)}"></label>`}).join('')}<p><small>都市兵${cityObj().troops.toLocaleString()}から各武将へ割り当てます。</small></p><button id="v2420-atk-go" class="danger">出兵</button><button data-close>閉じる</button>`);
 modalCard.querySelector('#v2420-atk-go').onclick=()=>{
  const names=[...modalCard.querySelectorAll('[name="v2420-atk"]:checked')].map(x=>x.value).slice(0,7);if(!names.length)return alert('武将を選択してください。');
  let total=0,units=[];
  for(let i=0;i<names.length;i++){
   const o=ownOfficer(names[i]),cap=commandCapacity(o),input=modalCard.querySelector(`[data-v2420-atknum="${names[i]}"]`),num=Math.floor((Number(input?.value)||0)/100)*100;
   if(num<100||num>cap)return alert(`${o.name}の兵数は100～${cap.toLocaleString()}の範囲で指定してください。`);
   total+=num;units.push(makePlayerUnit(o,num,0,i));
  }
  if(total>cityObj().troops-300)return alert('都市の兵力が不足しています。最低300人は守備兵として残してください。');
  cityObj().troops-=total;names.forEach(n=>{const o=ownOfficer(n);if(o)o.acted=state.turn});
  const target=modalCard.querySelector('#v2420-atk-dest').value;closeModal();beginBattle(state.selected,target,units);if(state.battle)state.battle._v2420EnemyTotal=state.battle.units.filter(u=>u.side==='enemy').reduce((s,u)=>s+u.troops,0);
 };
};

window.recruit=function(actor){
 initProgression();const c=cityObj(),capacity=cityCommandCapacity(c.name),room=Math.max(0,capacity-c.troops);
 if(room<100)return alert('この都市は、所属武将が指揮できる兵数の上限に達しています。戦闘経験によるレベル上昇か、武将の配置増加が必要です。');
 const available=Math.floor((350+(Number(actor.cha)||50)*4+(Number(c.pop)||5)*25)/100)*100;
 const gain=Math.min(room,Math.max(300,available)),gold=Math.ceil(gain*.12),food=Math.ceil(gain*.18);
 showModal(`<h2>募兵・補充</h2><p><b>${actor.name}</b>が城下から兵を募ります。</p><div class="resources"><div class="metric">補充予定<b>${gain.toLocaleString()}</b></div><div class="metric">都市指揮容量<b>${c.troops.toLocaleString()} / ${capacity.toLocaleString()}</b></div><div class="metric">必要金<b>${gold}</b></div><div class="metric">必要兵糧<b>${food}</b></div></div><p><small>任意の大量徴兵はできません。武将のレベルと統率が都市全体の運用可能兵数を制限します。</small></p><button id="v2420-recruit-go" class="primary">募兵を実行</button><button data-close>閉じる</button>`);
 modalCard.querySelector('#v2420-recruit-go').onclick=()=>{
  if(c.gold<gold||c.food<food)return alert('金または兵糧が不足しています。');c.gold-=gold;c.food-=food;c.troops+=gain;closeModal();finish(actor,`${gain.toLocaleString()}人を募兵しました。`);
 };
};

function decorateProgression(){
 if(!state)return;initProgression();
 if(state.battle){
  const b=state.battle;if(b.defense){const title=document.querySelector('.battle .panel .title');if(title)title.textContent=`${b.target}防衛戦`;}
  const side=document.querySelector('.battle > .panel:last-child'),p=b.units.find(u=>u.side==='player'&&u.name===b.selected);
  if(side&&p&&ownOfficer(p.name)){
   let box=side.querySelector('.v2420-battle-level');if(!box){box=document.createElement('div');box.className='v2420-battle-level';side.querySelector('.battle-actions')?.before(box)}
   const o=ownOfficer(p.name);box.innerHTML=`Lv${o.level}　EXP ${o.exp}/${nextExp(o)}　指揮上限 ${commandCapacity(o).toLocaleString()}`;
  }
  return;
 }
 document.querySelectorAll('.officers .officer').forEach(card=>{
  const name=card.querySelector('b')?.textContent?.trim(),o=ownOfficer(name);if(!o)return;
  let meta=card.querySelector('.v2420-level');if(!meta){meta=document.createElement('div');meta.className='v2420-level';card.querySelector('div')?.appendChild(meta)}
  meta.innerHTML=`<span>Lv${o.level}</span><span>EXP ${o.exp}/${nextExp(o)}</span><span>指揮上限 ${commandCapacity(o).toLocaleString()}</span><span>統率限界 ${leadershipCeiling(o).toLocaleString()}</span>`;
 });
 const recruitButton=document.querySelector('[data-cmd="recruit"]');if(recruitButton)recruitButton.textContent='募兵・補充';
}
window.render=function(){trackBattleDamage(state?.battle);const result=previousRender.apply(this,arguments);setTimeout(decorateProgression,0);return result};

const style=document.createElement('style');style.textContent=`
.v2420-deploy{display:grid!important;grid-template-columns:auto minmax(0,1fr) 96px;gap:8px;align-items:center}.v2420-deploy span small{display:block;color:#bca98a;line-height:1.35}.v2420-deploy input[type=number]{width:96px}
.v2420-defense-summary{margin:9px 0 12px;padding:10px;border:1px solid #9a493d;background:#251310;color:#efc1ae;line-height:1.5}.v2420-level{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;font-size:10px}.v2420-level span{padding:2px 6px;border:1px solid #526b49;border-radius:999px;background:#151d12;color:#cce6bd}.v2420-battle-level{margin:6px 0 9px;padding:7px 9px;border:1px solid #526b49;background:#151d12;color:#cce6bd;font-size:11px}
@media(max-width:560px){.v2420-deploy{grid-template-columns:auto 1fr}.v2420-deploy input[type=number]{grid-column:2;width:100%}}
`;
document.head.appendChild(style);

setTimeout(()=>{try{if(typeof state!=='undefined'&&state){initProgression();window.render()}}catch(e){console.warn('v24.20 migration:',e)}},0);
})();