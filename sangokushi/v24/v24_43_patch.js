// v24.43 — 194 scenario: Mikuni Takahashi's third-generation banner + fifth generation
(()=>{
const originalStartScreen=window.startScreen;
const originalBeginGame=window.beginGame;
const previousRender=window.render;
const previousBattleAction=window.battleAction;
const V39=window.V2439||{};
const SKILLS=window.V246_SKILLS||{};
let selectedScenario=window.V2443_SELECTED_SCENARIO||'190';

const THIRD_START=[
 {name:'髙橋未来虹',lead:96,war:90,int:84,pol:75,cha:90,status:'君主',apt:'槍兵',skill:'大将の器'},
 {name:'上村ひなの',lead:78,war:52,int:95,pol:84,cha:92,status:'一般',apt:'弩兵',skill:'星詠み'},
 {name:'森本茉莉',lead:84,war:78,int:82,pol:80,cha:90,status:'一般',apt:'剣盾兵',skill:null},
 {name:'山口陽世',lead:90,war:93,int:66,pol:70,cha:90,status:'一般',apt:'騎兵',skill:null}
];
const FIFTH=[
 {name:'大田美月',lead:83,war:93,int:76,pol:75,cha:90,apt:'騎兵',force:'袁紹',city:'鄴',loy:76,skill:'月影疾駆'},
 {name:'大野愛実',lead:97,war:90,int:84,pol:84,cha:99,apt:'剣盾兵',force:'在野',city:'洛陽',loy:48,skill:'五期の旗印'},
 {name:'片山紗希',lead:92,war:96,int:74,pol:73,cha:96,apt:'騎兵',force:'孫堅',city:'建業',loy:79,skill:'最速一番槍'},
 {name:'蔵盛妃那乃',lead:82,war:73,int:87,pol:85,cha:88,apt:'弩兵',force:'劉備',city:'小沛',loy:74,skill:'静謐の策'},
 {name:'坂井新奈',lead:75,war:63,int:59,pol:62,cha:86,apt:'剣盾兵',force:'在野',city:'桂陽',loy:42,skill:'親愛の輪'},
 {name:'佐藤優羽',lead:86,war:91,int:91,pol:88,cha:95,apt:'槍兵',force:'馬騰',city:'天水',loy:78,skill:'文武双全'},
 {name:'下田衣珠季',lead:76,war:88,int:58,pol:60,cha:86,apt:'騎兵',force:'在野',city:'武陵',loy:40,skill:'猪突猛進'},
 {name:'高井俐香',lead:86,war:65,int:86,pol:86,cha:94,apt:'弩兵',force:'劉表',city:'襄陽',loy:78,skill:'慧眼の陣'},
 {name:'鶴崎仁香',lead:82,war:91,int:95,pol:92,cha:91,apt:'弩兵',force:'劉焉',city:'成都',loy:80,skill:'神算速射'},
 {name:'松尾桜',lead:92,war:85,int:90,pol:88,cha:97,apt:'槍兵',force:'曹操',city:'許昌',loy:81,skill:'桜花指揮'}
];
const FIFTH_NAMES=new Set(FIFTH.map(o=>o.name));
const CUSTOM_SKILL_NAMES=new Set([...FIFTH_NAMES,'髙橋未来虹']);

Object.assign(SKILLS,{
 '髙橋未来虹':{name:'大将の器',desc:'味方全軍の士気を上げ、このターンから攻撃力を強化する。',kind:'all'},
 '大田美月':{name:'月影疾駆',desc:'2マス以上進軍した後、隣接敵へ高威力攻撃。攻撃後は敵から1マス離脱する。',kind:'target',range:1},
 '大野愛実':{name:'五期の旗印',desc:'味方全軍の士気を12上げ、2ターン攻撃力を15%強化。自身は被害を20%軽減。',kind:'all'},
 '片山紗希':{name:'最速一番槍',desc:'2マス以内の敵へ強烈な突撃。撃破した場合は再行動できる。',kind:'target',range:2},
 '蔵盛妃那乃':{name:'静謐の策',desc:'3マス以内の敵へ損害を与え、2回の行動まで攻撃力25%低下・移動力1低下。',kind:'target',range:3},
 '坂井新奈':{name:'親愛の輪',desc:'周囲2マスの味方を10%回復し、士気を15上げ、混乱・移動不能を解除する。',kind:'all'},
 '佐藤優羽':{name:'文武双全',desc:'隣接敵へ武力と知力の双方を使った一撃。敵の次の攻撃力を20%低下。',kind:'target',range:1},
 '下田衣珠季':{name:'猪突猛進',desc:'隣接敵へ約2倍の猛攻。自軍も反動損害を受け、士気が10下がる。',kind:'target',range:1},
 '高井俐香':{name:'慧眼の陣',desc:'味方全軍が次の敵軍フェイズに受ける損害を25%軽減する。',kind:'all'},
 '鶴崎仁香':{name:'神算速射',desc:'4マス以内の敵へ知力依存の遠距離攻撃。隣接する別の敵にも半分の損害。',kind:'target',range:4},
 '松尾桜':{name:'桜花指揮',desc:'行動済みの味方1隊を再行動可能にし、士気を10上げる。',kind:'ally'}
});
window.V246_SKILLS=SKILLS;

function scenarioIs194(){return selectedScenario==='194'||state?.scenarioId==='194-mikuni'}
function officerCard(o){return `<div class="officer"><span class="face">${o.name[0]}</span><div><b>${o.name}</b><small> 統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}</small></div></div>`}
function addScenarioPicker(){
 const intro=document.querySelector('.start .intro');if(!intro)return;
 const picker=document.createElement('div');picker.className='v2443-scenario-picker';
 picker.innerHTML=`<b>シナリオ選択</b><div><button data-v2443-scenario="190" class="${selectedScenario==='190'?'selected':''}">190年 ハッピーオーラの旗揚げ</button><button data-v2443-scenario="194" class="${selectedScenario==='194'?'selected':''}">194年 虹の旗、次代を率いる</button></div>`;
 intro.prepend(picker);
 picker.querySelectorAll('[data-v2443-scenario]').forEach(btn=>btn.onclick=()=>{
  selectedScenario=btn.dataset.v2443Scenario;window.V2443_SELECTED_SCENARIO=selectedScenario;
  startCity=selectedScenario==='194'?'上党':'建寧';window.startScreen();
 });
 if(selectedScenario!=='194')return;
 startCity='上党';
 const titles=[...intro.querySelectorAll(':scope > .title')];
 if(titles[0])titles[0].textContent='シナリオ：虹の旗、次代を率いる';
 const paragraphs=[...intro.querySelectorAll(':scope > p')];
 if(paragraphs[0])paragraphs[0].textContent='西暦194年。髙橋未来虹は上村ひなの・森本茉莉・山口陽世とともに上党で独立。四人だけの新しい日向軍が、群雄割拠の中原へ旗を掲げる。';
 if(paragraphs[1])paragraphs[1].textContent='開始都市は上党固定。各地に散った五期生10人を集め、三期生4人＋五期生10人の新世代軍を完成させて天下統一を目指してください。';
 const initTitle=titles.find(t=>t.textContent.includes('初期武将'));
 if(initTitle){
  let n=initTitle.nextElementSibling;while(n&&n.classList?.contains('officer')){const next=n.nextElementSibling;n.remove();n=next}
  initTitle.insertAdjacentHTML('afterend',THIRD_START.map(officerCard).join(''));
 }
 const name=document.getElementById('startName'),diff=document.getElementById('startDiff'),begin=document.getElementById('begin');
 if(name)name.textContent='上党';if(diff)diff.textContent='★★★★★';
 if(begin){begin.textContent='上党で三期生軍を旗揚げ';begin.onclick=()=>window.beginGame()}
 document.querySelectorAll('[data-start]').forEach(btn=>{
  const isStart=btn.dataset.start==='上党';btn.disabled=!isStart;btn.classList.toggle('sel',isStart);
 });
}
window.startScreen=function(){
 if(selectedScenario==='194')startCity='上党';
 const result=originalStartScreen.apply(this,arguments);addScenarioPicker();return result;
};

function setOfficer(o,data){Object.assign(o,data,{type:data.apt||o.type,acted:0,statSource:'五期生・学力/50m/ミーグリ/フォーメーション参照'})}
function build194State(){
 if(!state)return;
 state.scenarioId='194-mikuni';state.scenarioTitle='虹の旗、次代を率いる';state.year=194;state.month=1;state.turn=1;state.selected='上党';state.rulerName='髙橋未来虹';
 const home=state.cities['上党'];if(home){Object.assign(home,{force:'日向軍',gold:1300,food:19000,troops:4800,morale:78,wall:55})}
 const oldStarts={
  '佐々木久美':{force:'袁紹',city:'南皮',loy:88,status:'一般',apt:'剣盾兵'},
  '加藤史帆':{force:'曹操',city:'許昌',loy:84,status:'一般',apt:'騎兵'},
  '齊藤京子':{force:'劉備',city:'小沛',loy:84,status:'一般',apt:'弩兵'},
  '井口眞緒':{force:'在野',city:'平原',loy:45,status:'在野',apt:'剣盾兵'}
 };
 Object.entries(oldStarts).forEach(([name,d])=>{const o=state.officers.find(x=>x.name===name);if(o)Object.assign(o,d,{type:d.apt,acted:0})});
 THIRD_START.forEach((d,i)=>{
  let o=state.officers.find(x=>x.name===d.name);
  if(!o){o={name:d.name};state.officers.push(o)}
  Object.assign(o,d,{force:'日向軍',city:'上党',loy:i===0?100:98-i,status:i===0?'君主':'一般',type:d.apt,acted:0,statSource:'三期生シナリオ固定値'});
 });
 FIFTH.forEach(d=>{
  let o=state.officers.find(x=>x.name===d.name);
  if(!o){o={name:d.name};state.officers.push(o)}
  setOfficer(o,{...d,status:d.force==='在野'?'在野':'一般'});
 });
 state.logs=[];log('上党に髙橋未来虹を君主とする三期生4人の日向軍が旗揚げした。');
 log('五期生10人は各地に散っている。彼女たちを集め、新世代の日向軍を完成させよ。');
}
window.beginGame=function(){
 if(selectedScenario!=='194')return originalBeginGame.apply(this,arguments);
 startCity='上党';const result=originalBeginGame.apply(this,arguments);build194State();window.render();return result;
};

function living(b,side){return (b?.units||[]).filter(u=>u.side===side&&!u.v2436Structure&&Number(u.troops)>0)}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function currentPlayer(b){const s=(b?.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0);return s||living(b,'player').find(u=>!u.done)||living(b,'player')[0]||null}
function deal(target,amount){const before=Number(target.troops)||0;target.troops=Math.max(0,before-Math.max(1,Math.floor(amount)));return before-target.troops}
function raw(p,base,warScale=0,intScale=0,troopScale=0){return Math.max(1,Math.floor(base+(Number(p.war)||50)*warScale+(Number(p.int)||50)*intScale+(Number(p.troops)||0)*troopScale+Math.floor(Math.random()*121)))}
function finishCustom(p,consume=true){
 const b=state?.battle;if(!b)return;if(consume){p.done=true;p.movedDistance=0;b.mode=null;b.v2432Mode=null;delete b.v2440Mode}
 if(typeof window.checkBattleEnd==='function'&&window.checkBattleEnd())return;
 if(consume&&typeof window.afterPlayerAction==='function')window.afterPlayerAction();else window.render();
}
function chooseEnemy(p,skill){
 const b=state.battle,targets=living(b,'enemy').filter(t=>dist(p,t)<=Number(skill.range||1)).sort((a,c)=>dist(p,a)-dist(p,c)||(Number(a.troops)||0)-(Number(c.troops)||0));
 if(!targets.length){b.logs.unshift(`${skill.name}の射程内に敵がいない。`);return window.render()}
 showModal(`<h2>固有技・${skill.name}</h2><p>${skill.desc}</p><div class="choice-list">${targets.map(t=>`<button data-v2443-enemy="${t.name}"><span><b>${t.name}隊</b><br><small>距離${dist(p,t)}　兵${Number(t.troops).toLocaleString()}</small></span><span>選択</span></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2443-enemy]').forEach(btn=>btn.onclick=()=>{const t=living(state.battle,'enemy').find(x=>x.name===btn.dataset.v2443Enemy);if(!t)return;closeModal();executeCustom(p,skill,t)});
}
function chooseAlly(p,skill){
 const b=state.battle,targets=living(b,'player').filter(t=>t!==p&&t.done);
 if(!targets.length){b.logs.unshift('再行動させられる行動済みの味方がいない。');return window.render()}
 showModal(`<h2>固有技・${skill.name}</h2><p>${skill.desc}</p><div class="choice-list">${targets.map(t=>`<button data-v2443-ally="${t.name}"><span><b>${t.name}隊</b><br><small>兵${Number(t.troops).toLocaleString()}　士気${Number(t.morale)||0}</small></span><span>再行動</span></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2443-ally]').forEach(btn=>btn.onclick=()=>{const t=living(state.battle,'player').find(x=>x.name===btn.dataset.v2443Ally);if(!t)return;closeModal();executeCustom(p,skill,t)});
}
function retreatOneCell(b,p,target){
 const dx=Math.sign(Number(p.x)-Number(target.x)),dy=Math.sign(Number(p.y)-Number(target.y));
 const options=dx||dy?[{x:Number(p.x)+dx,y:Number(p.y)+dy}]:[];
 for(const q of options){
  if(q.x<0||q.y<0||q.x>=(b.v2439GridW||15)||q.y>=(b.v2439GridH||13))continue;
  const occ=(b.units||[]).some(u=>u!==p&&!u.v2436Structure&&Number(u.troops)>0&&Number(u.x)===q.x&&Number(u.y)===q.y);if(occ)continue;
  if(typeof V39.terrainCost==='function'&&!Number.isFinite(V39.terrainCost(p,q.x,q.y,b)))continue;
  p.x=q.x;p.y=q.y;return true;
 }
 return false;
}
function executeCustom(p,skill,target=null){
 const b=state?.battle;if(!b||!p||p.done||p.specialUsed)return;
 let consume=true,text='';p.specialUsed=true;
 switch(p.name){
  case '髙橋未来虹':
   living(b,'player').forEach(u=>{u.morale=Math.min(100,(Number(u.morale)||60)+10);u.v2443AttackBuffTurns=Math.max(Number(u.v2443AttackBuffTurns)||0,1)});text='大将の器！ 全軍の士気が上がり、攻勢を強めた。';break;
  case '大田美月':{
   if((Number(p.movedDistance)||0)<2){p.specialUsed=false;b.logs.unshift('月影疾駆は2マス以上進軍した後に使用できる。');return window.render()}
   const dmg=deal(target,raw(p,240,3.8,0,.05)*1.4),escaped=retreatOneCell(b,p,target);text=`月影疾駆！ ${target.name}隊へ${dmg.toLocaleString()}損害。${escaped?'一撃後に1マス離脱した。':'退路が塞がれ、その場に留まった。'}`;break;
  }
  case '大野愛実':
   living(b,'player').forEach(u=>{u.morale=Math.min(100,(Number(u.morale)||60)+12);u.v2443AttackBuffTurns=Math.max(Number(u.v2443AttackBuffTurns)||0,2)});p.v2443DefenseBuffTurns=Math.max(Number(p.v2443DefenseBuffTurns)||0,2);text='五期の旗印！ 全軍の士気＋12、攻撃力上昇。大野隊は守りも固めた。';break;
  case '片山紗希':{
   const dmg=deal(target,raw(p,300,4.7,0,.06)*1.25),defeated=Number(target.troops)<=0;consume=!defeated;text=`最速一番槍！ ${target.name}隊へ${dmg.toLocaleString()}損害。${defeated?'敵を撃破し、そのまま再行動！':''}`;break;
  }
  case '蔵盛妃那乃':{
   const dmg=deal(target,raw(p,130,0,2.5,.02));target.v2443AttackPenaltyTurns=Math.max(Number(target.v2443AttackPenaltyTurns)||0,2);target.v2443AttackPenaltyPct=.25;target.v2443MovePenaltyActions=Math.max(Number(target.v2443MovePenaltyActions)||0,2);text=`静謐の策！ ${target.name}隊へ${dmg.toLocaleString()}損害。攻撃力と移動力を低下させた。`;break;
  }
  case '坂井新奈':{
   let total=0,count=0;for(const u of living(b,'player').filter(u=>dist(p,u)<=2)){const max=Math.max(Number(u.max)||Number(u.troops)||1,Number(u.troops)||0),before=Number(u.troops)||0;u.troops=Math.min(max,before+Math.max(1,Math.floor(max*.10)));total+=u.troops-before;u.morale=Math.min(100,(Number(u.morale)||60)+15);u.skipTurns=0;u.immobileTurns=0;count++}text=`親愛の輪！ 周囲${count}隊を計${total.toLocaleString()}回復し、士気と状態を立て直した。`;break;
  }
  case '佐藤優羽':{
   const dmg=deal(target,raw(p,170,2.35,2.35,.035));target.v2443AttackPenaltyTurns=Math.max(Number(target.v2443AttackPenaltyTurns)||0,1);target.v2443AttackPenaltyPct=Math.max(Number(target.v2443AttackPenaltyPct)||0,.20);text=`文武双全！ ${target.name}隊へ${dmg.toLocaleString()}損害。次の攻撃力を低下させた。`;break;
  }
  case '下田衣珠季':{
   const dmg=deal(target,raw(p,190,4.4,0,.05)*1.55),recoil=Math.min(Number(p.troops)||0,Math.max(1,Math.floor(dmg*.25)));p.troops=Math.max(0,(Number(p.troops)||0)-recoil);p.morale=Math.max(0,(Number(p.morale)||60)-10);text=`猪突猛進！ ${target.name}隊へ${dmg.toLocaleString()}損害。反動で${recoil.toLocaleString()}損害、士気－10。`;break;
  }
  case '高井俐香':
   living(b,'player').forEach(u=>u.v2443GuardTurns=Math.max(Number(u.v2443GuardTurns)||0,1));text='慧眼の陣！ 次の敵軍フェイズ、味方全軍の被害を25％軽減する。';break;
  case '鶴崎仁香':{
   const main=deal(target,raw(p,180,0,3.8,.025)),others=living(b,'enemy').filter(e=>e!==target&&dist(e,target)<=1);let splash=0;for(const e of others)splash+=deal(e,Math.floor(main*.5));text=`神算速射！ ${target.name}隊へ${main.toLocaleString()}損害${splash?`、周囲へ計${splash.toLocaleString()}損害`:''}。`;break;
  }
  case '松尾桜':
   if(!target){p.specialUsed=false;return}target.done=false;target.movedThisTurn=false;target.movedDistance=0;target.morale=Math.min(100,(Number(target.morale)||60)+10);text=`桜花指揮！ ${target.name}隊が再行動可能になり、士気＋10。`;break;
  default:p.specialUsed=false;return previousBattleAction('special');
 }
 b.logs.unshift(`${p.name}隊・${text}`);finishCustom(p,consume);
}
function useCustom(){
 const b=state?.battle,p=currentPlayer(b),skill=SKILLS[p?.name];if(!b||!p||p.done||p.specialUsed||!skill||!CUSTOM_SKILL_NAMES.has(p.name))return;
 if(skill.kind==='target')return chooseEnemy(p,skill);if(skill.kind==='ally')return chooseAlly(p,skill);return executeCustom(p,skill,null);
}
window.battleAction=function(action){
 if(action==='special'&&state?.battle){const p=currentPlayer(state.battle);if(p&&CUSTOM_SKILL_NAMES.has(p.name))return useCustom()}
 return previousBattleAction.apply(this,arguments);
};

if(typeof V39.enemyAttack==='function'){
 const prevEnemyAttack=V39.enemyAttack;
 V39.enemyAttack=function(b,u,target){
  const before=Number(target?.troops)||0,result=prevEnemyAttack.apply(this,arguments),after=Number(target?.troops)||0,lost=Math.max(0,before-after);if(!lost)return result;
  let factor=1;
  if(Number(u?.v2443AttackPenaltyTurns)>0)factor*=1-Math.max(0,Math.min(.5,Number(u.v2443AttackPenaltyPct)||0));
  if(Number(target?.v2443GuardTurns)>0)factor*=.75;
  if(Number(target?.v2443DefenseBuffTurns)>0)factor*=.80;
  const wanted=Math.max(0,Math.floor(lost*factor)),refund=Math.max(0,lost-wanted);if(refund){target.troops+=refund;b.logs.unshift(`陣形・計略効果で${target.name}隊の被害を${refund.toLocaleString()}軽減。`)}
  return result;
 };
}
if(typeof V39.enemyAct==='function'){
 const prevEnemyAct=V39.enemyAct;
 V39.enemyAct=function(b,u){
  const penalized=Number(u?.v2443MovePenaltyActions)>0;if(penalized){u.moveRangeBonus=(Number(u.moveRangeBonus)||0)-1}
  const result=prevEnemyAct.apply(this,arguments);
  if(penalized){u.moveRangeBonus=(Number(u.moveRangeBonus)||0)+1;u.v2443MovePenaltyActions=Math.max(0,Number(u.v2443MovePenaltyActions)-1)}
  if(Number(u?.v2443AttackPenaltyTurns)>0)u.v2443AttackPenaltyTurns=Math.max(0,Number(u.v2443AttackPenaltyTurns)-1);
  return result;
 };
}
if(typeof V39.normalDamage==='function'){
 const prevNormalDamage=V39.normalDamage;
 V39.normalDamage=function(attacker,target,b){const r=prevNormalDamage.apply(this,arguments);if(Number(attacker?.v2443AttackBuffTurns)>0)r.damage=Math.max(1,Math.floor(Number(r.damage)*1.15));return r};
}
if(typeof V39.finishEnemyPhase==='function'){
 const prevFinish=V39.finishEnemyPhase;
 V39.finishEnemyPhase=function(b){
  living(b,'player').forEach(u=>{if(Number(u.v2443AttackBuffTurns)>0)u.v2443AttackBuffTurns--;if(Number(u.v2443GuardTurns)>0)u.v2443GuardTurns--;if(Number(u.v2443DefenseBuffTurns)>0)u.v2443DefenseBuffTurns--});
  return prevFinish.apply(this,arguments);
 };
}

function checkFifthGathering(){
 if(!state||state.scenarioId!=='194-mikuni'||state.v2443FifthGathered)return;
 const all=FIFTH.every(d=>state.officers.some(o=>o.name===d.name&&o.force==='日向軍'));if(!all)return;
 state.v2443FifthGathered=true;FIFTH.forEach(d=>{const o=state.officers.find(x=>x.name===d.name);if(o)o.loy=Math.min(100,(Number(o.loy)||80)+10)});Object.values(state.cities).filter(c=>c.force==='日向軍').forEach(c=>c.morale=Math.min(100,(Number(c.morale)||60)+8));log('五期生10人が全員集結した！ 新世代の日向軍が完成し、全支配都市の士気が上昇した。');
}
function decorateScenarioState(){
 if(!state||state.scenarioId!=='194-mikuni')return;checkFifthGathering();
 const dash=document.querySelector('.dashboard');if(dash)dash.innerHTML=dash.innerHTML.replaceAll('君主 佐々木久美','君主 髙橋未来虹');
}
window.render=function(){const result=previousRender.apply(this,arguments);if(!state)addScenarioPicker();else setTimeout(decorateScenarioState,0);return result};

const style=document.createElement('style');style.textContent=`
.v2443-scenario-picker{margin-bottom:14px;padding:10px;border:1px solid #80622f;background:#1d160e}.v2443-scenario-picker>b{display:block;margin-bottom:8px;color:#f0d18a}.v2443-scenario-picker>div{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v2443-scenario-picker button{margin:0;background:#3b2b1b;border:1px solid #70522e}.v2443-scenario-picker button.selected{outline:2px solid #d7a63c;background:#5a3518}@media(max-width:700px){.v2443-scenario-picker>div{grid-template-columns:1fr}}
`;document.head.appendChild(style);

window.V2443={THIRD_START,FIFTH,selectScenario:id=>{selectedScenario=id;window.V2443_SELECTED_SCENARIO=id;startCity=id==='194'?'上党':'建寧';window.startScreen()}};
if(!state)window.startScreen();
})();
