// v24.59 — fifth-generation battle skills only; no campaign/city ownership overrides
(()=>{
if(window.V2459_FIFTH_SKILLS)return;window.V2459_FIFTH_SKILLS=true;
const SKILLS=window.V246_SKILLS||{};
Object.assign(SKILLS,{
 '大田美月':{name:'月影疾駆',desc:'2マス以上進軍後、隣接敵へ高威力攻撃。攻撃後は行動終了。',kind:'target',range:1},
 '大野愛実':{name:'五期の旗印',desc:'味方全軍の士気を12上げ、2自軍ターン攻撃力を強化。',kind:'all'},
 '片山紗希':{name:'最速一番槍',desc:'2マス以内の敵へ強烈な突撃。撃破時は再行動可能。',kind:'target',range:2},
 '蔵盛妃那乃':{name:'静謐の策',desc:'3マス以内の敵へ損害を与え、攻撃力25%低下・移動力1低下。',kind:'target',range:3},
 '坂井新奈':{name:'親愛の輪',desc:'周囲2マスの味方を10%回復し、士気を15上げ、混乱・移動不能を解除。',kind:'all'},
 '佐藤優羽':{name:'文武双全',desc:'隣接敵へ武力と知力の双方を参照する一撃。敵の攻撃力を低下。',kind:'target',range:1},
 '下田衣珠季':{name:'猪突猛進',desc:'隣接敵へ約2倍の猛攻。自軍も反動損害を受け、士気が10下がる。',kind:'target',range:1},
 '高井俐香':{name:'慧眼の陣',desc:'味方全軍が次の敵軍フェイズに受ける損害を軽減。',kind:'all'},
 '鶴崎仁香':{name:'神算速射',desc:'4マス以内の敵へ知力依存の遠距離攻撃。隣接する別の敵にも半分の損害。',kind:'target',range:4},
 '松尾桜':{name:'桜花指揮',desc:'行動済みの味方1隊を再行動可能にし、士気を10上げる。',kind:'ally'}
});
window.V246_SKILLS=SKILLS;
const NAMES=new Set(Object.keys(SKILLS).filter(n=>window.V2458?.NAMES?.has?.(n)));
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function alive(side){return (state?.battle?.units||[]).filter(u=>u.side===side&&Number(u.troops)>0)}
function current(){const b=state?.battle;return b?.units?.find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0)||null}
function damage(p,base,ws=0,is=0,ts=0){return Math.max(1,Math.floor(base+(Number(p.war)||50)*ws+(Number(p.int)||50)*is+(Number(p.troops)||0)*ts+50))}
function deal(t,d){const before=Number(t.troops)||0;t.troops=Math.max(0,before-Math.max(1,Math.floor(d)));return before-t.troops}
function beginAttackBuff(b){
 for(const u of alive('player')){
  if(!u.v2459WarBonus){u.v2459WarBonus=12;u.war=(Number(u.war)||50)+u.v2459WarBonus}
  u.v2459AttackBuff=2;
 }
 b.v2459BuffDay=Number(b.day)||1;
}
function processTimedBuffs(){
 const b=state?.battle;if(!b)return;const day=Number(b.day)||1;
 if(!Number.isFinite(Number(b.v2459LastDay)))b.v2459LastDay=day;
 if(day===Number(b.v2459LastDay))return;
 b.v2459LastDay=day;
 for(const u of b.units||[]){
  if(Number(u.v2459AttackBuff)>0){u.v2459AttackBuff--;if(u.v2459AttackBuff<=0&&u.v2459WarBonus){u.war=(Number(u.war)||0)-Number(u.v2459WarBonus);delete u.v2459WarBonus;delete u.v2459AttackBuff}}
 }
 if(Number(b.v2459GuardUntilDay)>0&&day>=Number(b.v2459GuardUntilDay)){b.playerGuardTurns=0;delete b.v2459GuardUntilDay}
}
function finish(p,consume=true){p.specialUsed=true;if(consume)p.done=true;if(typeof checkBattleEnd==='function'&&checkBattleEnd())return;if(consume&&typeof afterPlayerAction==='function')afterPlayerAction();else if(typeof render==='function')render()}
function execute(p,target=null,ally=null){
 const b=state?.battle;if(!b||!p||!NAMES.has(p.name))return false;let text='';let consume=true;
 switch(p.name){
  case '大田美月':{const d=deal(target,damage(p,230,4.0,0,.05));text=`月影疾駆！ ${target.name}隊へ${d}損害。`;break;}
  case '大野愛実':{alive('player').forEach(u=>u.morale=Math.min(100,(Number(u.morale)||60)+12));beginAttackBuff(b);text='五期の旗印！ 全軍の士気が上がり、攻勢が強化された。';break;}
  case '片山紗希':{const d=deal(target,damage(p,300,4.7,0,.06));if(target.troops<=0){consume=false;p.done=false}text=`最速一番槍！ ${target.name}隊へ${d}損害${target.troops<=0?'、撃破して再行動！':''}`;break;}
  case '蔵盛妃那乃':{const d=deal(target,damage(p,120,0,2.2,.02));target.weakenTurns=Math.max(Number(target.weakenTurns)||0,2);target.immobileTurns=Math.max(Number(target.immobileTurns)||0,1);text=`静謐の策！ ${target.name}隊へ${d}損害、攻勢を封じた。`;break;}
  case '坂井新奈':{let heal=0;alive('player').filter(u=>dist(p,u)<=2).forEach(u=>{const max=Number(u.max)||Number(u.troops)||1,add=Math.max(1,Math.floor(max*.10)),before=u.troops;u.troops=Math.min(max,u.troops+add);heal+=u.troops-before;u.morale=Math.min(100,(Number(u.morale)||60)+15);u.skipTurns=0;u.immobileTurns=0});text=`親愛の輪！ 周囲の味方を計${heal}回復。`;break;}
  case '佐藤優羽':{const d=deal(target,damage(p,180,2.0,2.0,.03));target.weakenTurns=Math.max(Number(target.weakenTurns)||0,1);text=`文武双全！ ${target.name}隊へ${d}損害。`;break;}
  case '下田衣珠季':{const d=deal(target,damage(p,360,5.0,0,.07));const self=Math.max(1,Math.floor(d*.25));p.troops=Math.max(1,p.troops-self);p.morale=Math.max(0,(Number(p.morale)||60)-10);text=`猪突猛進！ ${target.name}隊へ${d}損害、自軍も${self}損害。`;break;}
  case '高井俐香':{b.playerGuardTurns=Math.max(Number(b.playerGuardTurns)||0,1);b.v2459GuardUntilDay=(Number(b.day)||1)+1;text='慧眼の陣！ 全軍が次の敵軍フェイズに備えて防御態勢を整えた。';break;}
  case '鶴崎仁香':{const main=deal(target,damage(p,180,0,3.1,.025));let splash=0;alive('enemy').filter(e=>e!==target&&dist(e,target)<=1).forEach(e=>splash+=deal(e,Math.floor(main*.5)));text=`神算速射！ ${target.name}隊へ${main}損害${splash?`、周囲へ計${splash}損害`:''}。`;break;}
  case '松尾桜':{if(!ally)return false;ally.done=false;ally.morale=Math.min(100,(Number(ally.morale)||60)+10);text=`桜花指揮！ ${ally.name}隊を再行動可能にした。`;break;}
  default:return false;
 }
 b.logs=b.logs||[];b.logs.unshift(`${p.name}隊・${text}`);finish(p,consume);return true;
}
function chooseTarget(p,skill){
 const enemies=alive('enemy').filter(t=>dist(p,t)<=Number(skill.range||1));
 if(!enemies.length){alert(`${skill.name}の射程内に敵がいません。`);return true}
 if(typeof showModal!=='function')return execute(p,enemies[0]);
 showModal(`<h2>必殺技・${skill.name}</h2><div class="choice-list">${enemies.map(t=>`<button data-v2459-target="${t.name}"><b>${t.name}</b> 兵${t.troops}</button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2459-target]').forEach(btn=>btn.onclick=()=>{const t=alive('enemy').find(x=>x.name===btn.dataset.v2459Target);if(t){closeModal();execute(p,t)}});return true;
}
function chooseAlly(p,skill){
 const allies=alive('player').filter(u=>u!==p&&u.done);
 if(!allies.length){alert('再行動させられる味方がいません。');return true}
 if(typeof showModal!=='function')return execute(p,null,allies[0]);
 showModal(`<h2>必殺技・${skill.name}</h2><div class="choice-list">${allies.map(t=>`<button data-v2459-ally="${t.name}"><b>${t.name}</b> 兵${t.troops}</button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v2459-ally]').forEach(btn=>btn.onclick=()=>{const t=alive('player').find(x=>x.name===btn.dataset.v2459Ally);if(t){closeModal();execute(p,null,t)}});return true;
}
const previousBattleAction=window.battleAction;
window.battleAction=function(action){
 if(action!=='special'||!state?.battle)return previousBattleAction.apply(this,arguments);
 const p=current();if(!p||!NAMES.has(p.name))return previousBattleAction.apply(this,arguments);
 if(p.done||p.specialUsed)return alert(`${p.name}は必殺技を使用できません。`);
 const skill=SKILLS[p.name];
 if(skill.kind==='target')return chooseTarget(p,skill);
 if(skill.kind==='ally')return chooseAlly(p,skill);
 return execute(p);
};
function decorateButton(){
 if(!state?.battle)return;processTimedBuffs();const p=current();if(!p||!NAMES.has(p.name))return;
 const actions=document.querySelector('.battle-actions');if(!actions)return;
 let btn=actions.querySelector('[data-ba="special"]');
 if(!btn){btn=document.createElement('button');btn.dataset.ba='special';btn.className='special-btn';actions.insertBefore(btn,actions.querySelector('[data-ba="end"]')||null)}
 const skill=SKILLS[p.name];btn.textContent=`必殺技・${skill.name}`;btn.disabled=!!p.done||!!p.specialUsed;btn.onclick=()=>window.battleAction('special');
 let note=actions.parentElement?.querySelector('.v2459-skill-note');if(!note&&actions.parentElement){note=document.createElement('div');note.className='skill-note v2459-skill-note';actions.parentElement.insertBefore(note,actions)}
 if(note)note.innerHTML=`<b>固有必殺技：${skill.name}</b><br>${skill.desc}<br>一戦につき1回${p.specialUsed?'（使用済み）':''}`;
}
const previousRender=window.render;
window.render=function(){processTimedBuffs();const r=previousRender.apply(this,arguments);setTimeout(decorateButton,0);return r};
setTimeout(decorateButton,0);
window.V2459={SKILLS,NAMES,execute,dist,decorateButton,processTimedBuffs};
})();
