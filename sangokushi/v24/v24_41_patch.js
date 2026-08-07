// v24.41 — restore officer unique skills across all battle UIs
(()=>{
const SKILLS=window.V246_SKILLS||{};
const previousRender=window.render;
const previousBattleAction=window.battleAction;

function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function living(b,side){return (b?.units||[]).filter(u=>u.side===side&&!u.v2436Structure&&Number(u.troops)>0)}
function currentPlayer(b){
 if(!b)return null;
 const selected=(b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0);
 return selected||living(b,'player').find(u=>!u.done)||living(b,'player')[0]||null;
}
function skillOf(u){return u?SKILLS[u.name]||null:null}
function canUse(u){return !!(u&&u.side==='player'&&!u.done&&!u.specialUsed&&skillOf(u))}
function deal(b,target,amount){
 let dmg=Math.max(1,Math.floor(amount));
 if(target.side==='player'&&(Number(b.playerGuardTurns)||0)>0)dmg=Math.max(1,Math.floor(dmg*.7));
 const before=Number(target.troops)||0;target.troops=Math.max(0,before-dmg);return before-target.troops;
}
function rawDamage(p,base,warScale=0,intScale=0,troopScale=0){
 let dmg=base+(Number(p.war)||50)*warScale+(Number(p.int)||50)*intScale+(Number(p.troops)||0)*troopScale+rand(0,140);
 if(Number(p.weakenTurns)>0)dmg*=.65;
 if(p.criticalReady){dmg*=1.75;p.criticalReady=false;p.moveRangeBonus=0;state.battle.logs.unshift(`${p.name}隊の星詠みが成就した！`)}
 return Math.max(1,Math.floor(dmg));
}
function syncExp(actor,target,before){
 if(window.V2432&&typeof window.V2432.syncExperience==='function')window.V2432.syncExperience(actor,target,before);
}
function finishSkill(p,consume){
 const b=state?.battle;if(!b)return;
 if(consume){p.done=true;p.movedDistance=0;b.mode=null;b.v2432Mode=null;delete b.v2440Mode}
 if(typeof window.checkBattleEnd==='function'&&window.checkBattleEnd())return;
 if(consume&&typeof window.afterPlayerAction==='function')window.afterPlayerAction();else window.render();
}
function executeSkill(p,skill,target=null){
 const b=state?.battle;if(!b||!canUse(p))return;
 let consume=true,text='';p.specialUsed=true;
 switch(p.name){
  case '佐々木久美':{
   let total=0;
   for(const u of living(b,'player')){const max=Math.max(Number(u.max)||Number(u.troops)||1,Number(u.troops)||0),heal=Math.max(100,Math.floor(max*.12)),before=Number(u.troops)||0;u.troops=Math.min(max,before+heal);total+=u.troops-before}
   b.playerGuardTurns=Math.max(Number(b.playerGuardTurns)||0,1);text=`仁徳号令！ 味方全隊が計${total.toLocaleString()}回復し、防御態勢を整えた。`;break;
  }
  case '加藤史帆':{
   if(!target)return;
   const before=Number(target.troops)||0,dmg=deal(b,target,rawDamage(p,260,4.2,0,.065));syncExp(p.name,target,before);text=`猛虎突撃！ ${target.name}隊へ${dmg.toLocaleString()}損害。`;break;
  }
  case '齊藤京子':{
   if(!target)return;
   const before=Number(target.troops)||0,dmg=deal(b,target,rawDamage(p,150,0,2.6,.025));syncExp(p.name,target,before);target.skipTurns=Math.max(Number(target.skipTurns)||0,1);text=`幻惑の計！ ${target.name}隊へ${dmg.toLocaleString()}損害、次の行動を封じた。`;break;
  }
  case '影山優佳':living(b,'enemy').forEach(e=>e.weakenTurns=Math.max(Number(e.weakenTurns)||0,1));text='天機神算！ 敵全隊の攻め筋を見抜き、攻撃力を低下させた。';break;
  case '小坂菜緒':{
   if(!target)return;
   const before=Number(target.troops)||0,dmg=deal(b,target,rawDamage(p,360,4.8,0,.055));syncExp(p.name,target,before);text=`蒼天一閃！ ${target.name}隊へ${dmg.toLocaleString()}損害。`;break;
  }
  case '東村芽依':{
   const ts=living(b,'enemy').filter(e=>dist(p,e)<=3).sort((a,c)=>dist(p,a)-dist(p,c)||(Number(a.troops)||0)-(Number(c.troops)||0)).slice(0,2),parts=[];
   for(const t of ts){const before=Number(t.troops)||0,dmg=deal(b,t,rawDamage(p,130,2.7,0,.03));syncExp(p.name,t,before);parts.push(`${t.name}隊${dmg.toLocaleString()}`)}
   consume=false;text=`神速乱舞！ ${parts.join('、')}損害。さらに再行動可能。`;break;
  }
  case '松田好花':living(b,'enemy').forEach(e=>e.immobileTurns=Math.max(Number(e.immobileTurns)||0,1));text='連環策！ 敵全隊を鎖でつなぎ、次の移動を封じた。';break;
  case '上村ひなの':p.criticalReady=true;p.moveRangeBonus=(Number(p.moveRangeBonus)||0)+1;consume=false;text='星詠み！ 次の通常攻撃は会心となり、移動力も上昇した。';break;
  case '呂布':{
   if(!target)return;
   const before=Number(target.troops)||0,main=deal(b,target,rawDamage(p,420,5.2,0,.07));syncExp(p.name,target,before);let splash=0;
   for(const e of living(b,'enemy').filter(e=>e!==target&&dist(e,target)<=1)){const eb=Number(e.troops)||0,hit=deal(b,e,rawDamage(p,120,1.8,0,.02));syncExp(p.name,e,eb);splash+=hit}
   text=`天下無双！ ${target.name}隊へ${main.toLocaleString()}損害${splash?`、周囲へ計${splash.toLocaleString()}損害`:''}。`;break;
  }
  case '関羽':{
   if(!target)return;
   const before=Number(target.troops)||0,dmg=deal(b,target,rawDamage(p,330,4.5,0,.05));syncExp(p.name,target,before);target.weakenTurns=Math.max(Number(target.weakenTurns)||0,1);text=`青龍偃月！ ${target.name}隊へ${dmg.toLocaleString()}損害、攻撃力を低下させた。`;break;
  }
  case '趙雲':{
   if(!target)return;
   const before=Number(target.troops)||0,dmg=deal(b,target,rawDamage(p,280,4.1,0,.045));syncExp(p.name,target,before);consume=false;text=`単騎駆！ ${target.name}隊へ${dmg.toLocaleString()}損害。さらに再行動可能。`;break;
  }
  case '周瑜':{
   let total=0;for(const e of living(b,'enemy')){if(Math.random()*100<72+(Number(p.int)||50)*.2){const before=Number(e.troops)||0,dmg=deal(b,e,rawDamage(p,100,0,2.2,.018));syncExp(p.name,e,before);total+=dmg}}
   text=`神火計！ 敵全隊を炎で包み、計${total.toLocaleString()}損害。`;break;
  }
  default:text=`${skill.name}を発動した。`;
 }
 b.logs=b.logs||[];b.logs.unshift(`${p.name}隊・${text}`);finishSkill(p,consume);
}
function chooseTarget(p,skill){
 const b=state?.battle;if(!b)return;
 const targets=living(b,'enemy').filter(t=>dist(p,t)<=Number(skill.range||1)).sort((a,c)=>dist(p,a)-dist(p,c)||(Number(a.troops)||0)-(Number(c.troops)||0));
 if(!targets.length){b.logs.unshift(`${skill.name}の射程内に敵がいない。`);return window.render()}
 showModal(`<h2>固有技・${skill.name}</h2><p>${skill.desc}</p><div class="choice-list v2441-skill-target">${targets.map(t=>`<button data-v2441-target="${t.name}"><span><b>${t.name}隊</b><br><small>距離${dist(p,t)}　兵${Number(t.troops).toLocaleString()}</small></span><span>選択</span></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2441-target]').forEach(btn=>btn.onclick=()=>{
  const target=living(state.battle,'enemy').find(t=>t.name===btn.dataset.v2441Target);if(!target)return;closeModal();executeSkill(p,skill,target);
 });
}
function useSkill(){
 const b=state?.battle,p=currentPlayer(b),skill=skillOf(p);if(!b||!canUse(p)||!skill)return;
 if(skill.kind==='target')return chooseTarget(p,skill);executeSkill(p,skill,null);
}
window.battleAction=function(action){
 if(action==='special'&&state?.battle)return useSkill();
 return previousBattleAction.apply(this,arguments);
};

function decorateSkill(){
 const b=state?.battle;if(!b||b.phase!=='player'||b.v2434DeploymentActive||b.v2439DeploymentActive)return;
 const actions=document.querySelector('.battle-actions');if(!actions)return;
 const p=currentPlayer(b),skill=skillOf(p);
 document.querySelectorAll('.v2441-skill-note').forEach(n=>n.remove());
 let button=actions.querySelector('[data-ba="special"]');
 if(!skill){if(button)button.remove();return}
 const note=document.createElement('div');note.className='skill-note v2441-skill-note';note.innerHTML=`<b>固有技：${skill.name}</b><br>${skill.desc}<br><small>一戦につき1回${p?.specialUsed?'（使用済み）':''}</small>`;actions.before(note);
 if(!button){button=document.createElement('button');button.dataset.ba='special';button.className='special-btn v2441-special-btn';actions.appendChild(button)}
 button.textContent=`固有技・${skill.name}`;button.disabled=!canUse(p);button.onclick=()=>window.battleAction('special');
}
window.render=function(){
 const result=previousRender.apply(this,arguments);
 if(state?.battle)setTimeout(()=>{try{decorateSkill()}catch(e){console.error('v24.41 skill restore:',e)}},240);
 return result;
};

const style=document.createElement('style');style.textContent=`
.battle-actions .v2441-special-btn{grid-column:1/-1;border-color:#d7a63c;background:linear-gradient(#583a0c,#2b1b08);color:#ffe6a1;font-weight:900}.battle-actions .v2441-special-btn:disabled{filter:grayscale(1);opacity:.45}.v2441-skill-note{border-color:#a77f34!important;background:#21170a!important}.v2441-skill-target button{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;text-align:left}
`;
document.head.appendChild(style);
})();