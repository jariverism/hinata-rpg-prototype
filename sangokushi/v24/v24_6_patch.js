// v24.6 — safer retreat placement and selected officer finishing moves
(()=>{
const V246_SKILLS={
 '佐々木久美':{name:'仁徳号令',desc:'味方全隊を回復し、次の敵軍フェイズの被害を30%軽減する。',kind:'all'},
 '加藤史帆':{name:'猛虎突撃',desc:'2マス以内の敵一隊へ強烈な突撃を行う。',kind:'target',range:2},
 '齊藤京子':{name:'幻惑の計',desc:'3マス以内の敵一隊へ損害を与え、次の行動を封じる。',kind:'target',range:3},
 '影山優佳':{name:'天機神算',desc:'敵全隊の攻撃力を次の敵軍フェイズだけ大幅に低下させる。',kind:'all'},
 '小坂菜緒':{name:'蒼天一閃',desc:'4マス以内の敵一隊へ、防御を貫く一撃を放つ。',kind:'target',range:4},
 '東村芽依':{name:'神速乱舞',desc:'3マス以内の近い敵二隊を攻撃し、そのまま再行動できる。',kind:'all'},
 '松田好花':{name:'連環策',desc:'敵全隊を連環で縛り、次の敵軍フェイズの移動を封じる。',kind:'all'},
 '上村ひなの':{name:'星詠み',desc:'次の通常攻撃を必ず会心にし、移動力も1上げる。使用後も行動できる。',kind:'self'},
 '呂布':{name:'天下無双',desc:'2マス以内の敵一隊とその周囲へ圧倒的な損害を与える。',kind:'target',range:2},
 '関羽':{name:'青龍偃月',desc:'2マス以内の敵一隊を斬り伏せ、攻撃力も低下させる。',kind:'target',range:2},
 '趙雲':{name:'単騎駆',desc:'4マス以内の敵一隊を急襲し、そのまま再行動できる。',kind:'target',range:4},
 '周瑜':{name:'神火計',desc:'敵全隊へ大規模な火計を仕掛ける。',kind:'all'}
};
window.V246_SKILLS=V246_SKILLS;

const style=document.createElement('style');
style.textContent=`
.battle-actions .special-btn{grid-column:1/-1;border-color:#d7a63c;background:linear-gradient(#583a0c,#2b1b08);color:#ffe6a1;font-weight:800}
.battle-actions .special-btn:disabled{filter:grayscale(1);opacity:.45}
.skill-note{padding:9px;margin:8px 0;border:1px solid #8d6d31;background:#1d160c;color:#e7d4a8;font-size:12px;line-height:1.45}
.retreat-zone{margin-top:22px;padding-top:14px;border-top:1px solid #5d4630;text-align:right}
.retreat-zone button{min-width:130px;background:#291717;border-color:#7f4545;color:#e2b5b5;font-size:12px}
.retreat-zone small{display:block;margin-top:6px;color:#9e8d7c}
.retreat-confirm{padding:12px;border:1px solid #8b4a4a;background:#241313;line-height:1.6}
.battle-status{font-size:11px;color:#ffd883;letter-spacing:1px}
.skill-target button{display:grid;grid-template-columns:1fr auto;align-items:center;text-align:left}
@media(max-width:700px){.retreat-zone{text-align:center;margin-top:28px}.retreat-zone button{width:auto;min-width:160px}}
`;
document.head.appendChild(style);

function v246Dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function v246Alive(side){return state.battle.units.filter(u=>u.side===side&&u.troops>0)}
function v246Opponents(u){return v246Alive(u.side==='player'?'enemy':'player')}
function v246Status(u){let s='';if(u.skipTurns>0)s+='🌀';if(u.immobileTurns>0)s+='⛓';if(u.weakenTurns>0)s+='▽';if(u.criticalReady)s+='★';return s}
function v246RawDamage(attacker,base,warScale=0,intScale=0,troopScale=0){
 let dmg=base+(attacker.war||50)*warScale+(attacker.int||50)*intScale+attacker.troops*troopScale+rnd(0,140);
 if(attacker.weakenTurns>0)dmg*=.65;
 if(attacker.criticalReady){dmg*=1.75;attacker.criticalReady=false;attacker.moveRangeBonus=0;state.battle.logs.unshift(`${attacker.name}隊の星詠みが成就した！`)}
 return Math.max(1,Math.floor(dmg));
}
function v246Deal(attacker,target,dmg){
 const b=state.battle;
 if(target.side==='player'&&(b.playerGuardTurns||0)>0)dmg=Math.floor(dmg*.7);
 target.troops=Math.max(0,target.troops-dmg);
 return dmg;
}
function v246SkillOf(unit){return V246_SKILLS[unit?.name]||null}
function v246CanSkill(unit){return !!(unit&&unit.side==='player'&&!unit.done&&!unit.specialUsed&&v246SkillOf(unit))}

function v246SelectSkillTarget(p,skill){
 const targets=v246Opponents(p).filter(t=>v246Dist(p,t)<=skill.range).sort((a,b)=>v246Dist(p,a)-v246Dist(p,b)||a.troops-b.troops);
 if(!targets.length){state.battle.logs.unshift(`${skill.name}の射程内に敵がいない。`);return render()}
 showModal(`<h2>必殺技・${skill.name}</h2><p>${skill.desc}</p><div class="choice-list skill-target">${targets.map(t=>`<button data-v246-target="${t.name}"><span><b>${t.name}隊</b><br>距離${v246Dist(p,t)}　兵${t.troops}</span><span>選択</span></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v246-target]').forEach(btn=>btn.onclick=()=>{const t=state.battle.units.find(u=>u.side==='enemy'&&u.name===btn.dataset.v246Target&&u.troops>0);if(!t)return;closeModal();v246ExecuteSkill(p,skill,t)});
}
function v246ExecuteSkill(p,skill,target=null){
 const b=state.battle;let consume=true,logText='';p.specialUsed=true;
 switch(p.name){
  case '佐々木久美':{
   let total=0;v246Alive('player').forEach(u=>{const heal=Math.max(100,Math.floor(u.max*.12));const before=u.troops;u.troops=Math.min(u.max,u.troops+heal);total+=u.troops-before});b.playerGuardTurns=1;logText=`仁徳号令！ 味方全隊が計${total}回復し、防御態勢を整えた。`;break;
  }
  case '加藤史帆':{const dmg=v246Deal(p,target,v246RawDamage(p,260,4.2,0,.065));logText=`猛虎突撃！ ${target.name}隊へ${dmg}損害。`;break;}
  case '齊藤京子':{const dmg=v246Deal(p,target,v246RawDamage(p,150,0,2.6,.025));target.skipTurns=Math.max(target.skipTurns||0,1);logText=`幻惑の計！ ${target.name}隊へ${dmg}損害、次の行動を封じた。`;break;}
  case '影山優佳':{v246Alive('enemy').forEach(e=>e.weakenTurns=Math.max(e.weakenTurns||0,1));logText='天機神算！ 敵全隊の攻め筋を見抜き、攻撃力を低下させた。';break;}
  case '小坂菜緒':{const dmg=v246Deal(p,target,v246RawDamage(p,360,4.8,0,.055));logText=`蒼天一閃！ ${target.name}隊へ${dmg}損害。`;break;}
  case '東村芽依':{
   const ts=v246Alive('enemy').filter(e=>v246Dist(p,e)<=3).sort((a,c)=>v246Dist(p,a)-v246Dist(p,c)).slice(0,2);let text=[];ts.forEach(t=>{const dmg=v246Deal(p,t,v246RawDamage(p,130,2.7,0,.03));text.push(`${t.name}隊${dmg}`)});consume=false;logText=`神速乱舞！ ${text.join('、')}損害。さらに再行動可能。`;break;
  }
  case '松田好花':{v246Alive('enemy').forEach(e=>e.immobileTurns=Math.max(e.immobileTurns||0,1));logText='連環策！ 敵全隊を鎖でつなぎ、次の移動を封じた。';break;}
  case '上村ひなの':{p.criticalReady=true;p.moveRangeBonus=1;consume=false;logText='星詠み！ 次の通常攻撃は会心となり、移動力も上昇した。';break;}
  case '呂布':{
   const main=v246Deal(p,target,v246RawDamage(p,420,5.2,0,.07));let splash=0;v246Alive('enemy').filter(e=>e!==target&&v246Dist(e,target)<=1).forEach(e=>{splash+=v246Deal(p,e,v246RawDamage(p,120,1.8,0,.02))});logText=`天下無双！ ${target.name}隊へ${main}損害${splash?`、周囲へ計${splash}損害`:''}。`;break;
  }
  case '関羽':{const dmg=v246Deal(p,target,v246RawDamage(p,330,4.5,0,.05));target.weakenTurns=Math.max(target.weakenTurns||0,1);logText=`青龍偃月！ ${target.name}隊へ${dmg}損害、攻撃力を低下させた。`;break;}
  case '趙雲':{const dmg=v246Deal(p,target,v246RawDamage(p,280,4.1,0,.045));consume=false;logText=`単騎駆！ ${target.name}隊へ${dmg}損害。さらに再行動可能。`;break;}
  case '周瑜':{
   let total=0;v246Alive('enemy').forEach(e=>{const hit=Math.random()*100<72+p.int*.2;if(hit)total+=v246Deal(p,e,v246RawDamage(p,100,0,2.2,.018))});logText=`神火計！ 敵全隊を炎で包み、計${total}損害。`;break;
  }
  default: logText=`${skill.name}を発動した。`;
 }
 b.logs.unshift(`${p.name}隊・${logText}`);
 if(consume)p.done=true;
 if(checkBattleEnd())return;
 if(consume)afterPlayerAction();else render();
}

window.renderBattle=function(){
 const b=state.battle,p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0),skill=v246SkillOf(p);
 app.innerHTML=`<div class="battle"><section class="panel"><div class="title">${b.target}攻略戦</div><div class="phase">${b.phase==='player'?'自軍フェイズ':'敵軍フェイズ'}・第${b.day}日</div><div class="battle-grid">${Array.from({length:63},(_,i)=>{const x=i%9,y=Math.floor(i/9),u=b.units.find(z=>z.troops>0&&z.x===x&&z.y===y);return `<button class="cell ${b.terrain[i]}" data-cell="${x},${y}">${u?`<span class="unit ${u.side} ${u.name===b.selected?'selected':''}" data-unit="${u.name}">${u.name} ${v246Status(u)}<br>${u.troops}</span>`:''}</button>`}).join('')}</div></section><section class="panel"><div class="title">部隊命令</div>${p?`<p><b>${p.name}</b><br>${p.type} 兵${p.troops} 武${p.war} 知${p.int}<br><span class="battle-status">${v246Status(p)}</span></p>`:'<p>部隊を選択</p>'}${skill?`<div class="skill-note"><b>固有必殺技：${skill.name}</b><br>${skill.desc}<br>一戦につき1回${p?.specialUsed?'（使用済み）':''}</div>`:''}<div class="battle-actions"><button data-ba="move" ${!p||p.done?'disabled':''}>移動</button><button data-ba="attack" ${!p||p.done?'disabled':''}>${p?.type==='弩兵'?'射撃':'攻撃'}</button><button data-ba="fire" ${!p||p.done?'disabled':''}>火計</button><button data-ba="wait" ${!p||p.done?'disabled':''}>待機</button>${skill?`<button class="special-btn" data-ba="special" ${!v246CanSkill(p)?'disabled':''}>必殺技・${skill.name}</button>`:''}<button data-ba="end">自軍ターン終了</button></div><div class="title">戦況</div><div class="log">${b.logs.join('\n')}</div><div class="retreat-zone"><button data-ba="retreat">撤退手続…</button><small>誤操作防止のため、確認画面を経て撤退します。</small></div></section></div>`;
 document.querySelectorAll('[data-unit]').forEach(x=>x.onclick=e=>{e.stopPropagation();const u=b.units.find(z=>z.name===x.dataset.unit);if(u.side==='player'){b.selected=u.name;render()}});
 document.querySelectorAll('[data-ba]').forEach(x=>x.onclick=()=>battleAction(x.dataset.ba));
 document.querySelectorAll('[data-cell]').forEach(x=>x.onclick=()=>{if(b.mode==='move'&&p&&!p.done){const [nx,ny]=x.dataset.cell.split(',').map(Number),d=Math.abs(nx-p.x)+Math.abs(ny-p.y),range=2+(p.moveRangeBonus||0),occ=b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny);if(d<=range&&!occ){p.x=nx;p.y=ny;p.done=true;p.moveRangeBonus=0;b.mode=null;b.logs.unshift(`${p.name}隊が移動。`);afterPlayerAction()}}});
};

window.battleAction=function(a){
 const b=state.battle,p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);
 if(a==='retreat'){
  const remain=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+u.troops,0);
  showModal(`<h2>撤退の確認</h2><div class="retreat-confirm"><b>${b.target}攻略戦から撤退します。</b><br>残存兵${remain}は出撃元の${b.src}へ帰還します。<br>この操作を実行すると戦闘は終了します。</div><p><button id="v246-retreat-go" class="danger">撤退を確定する</button> <button data-close>戦闘へ戻る</button></p>`);
  modalCard.querySelector('#v246-retreat-go').onclick=()=>{closeModal();endBattle(false,true)};return;
 }
 if(a==='end')return enemyPhase();
 if(!p||p.done)return;
 if(a==='special'){
  const skill=v246SkillOf(p);if(!skill||p.specialUsed)return;
  if(skill.kind==='target')return v246SelectSkillTarget(p,skill);
  return v246ExecuteSkill(p,skill,null);
 }
 if(a==='move'){b.mode='move';b.logs.unshift(`移動先を選択（最大${2+(p.moveRangeBonus||0)}マス）。`);return render()}
 if(a==='wait'){p.done=true;b.logs.unshift(`${p.name}隊は待機。`);return afterPlayerAction()}
 const range=p.type==='弩兵'?3:1,targets=b.units.filter(e=>e.side==='enemy'&&e.troops>0&&v246Dist(p,e)<=range);
 if(!targets.length){b.logs.unshift('射程内に敵なし。');return render()}
 const t=targets.sort((x,y)=>x.troops-y.troops)[0];
 if(a==='attack'){
  const dmg=v246Deal(p,t,v246RawDamage(p,120,2.4,0,.035));b.logs.unshift(`${p.name}隊が${t.name}隊へ${dmg}損害。`);
 }else{
  const ok=Math.random()*100<35+p.int*.55;if(ok){const dmg=v246Deal(p,t,v246RawDamage(p,180,0,2,.02));b.logs.unshift(`${p.name}隊の火計成功！ ${dmg}損害。`)}else b.logs.unshift(`${p.name}隊の火計失敗。`);
 }
 p.done=true;afterPlayerAction();
};

window.enemyPhase=function(){
 const b=state.battle;b.phase='enemy';render();setTimeout(()=>{
  const es=b.units.filter(u=>u.side==='enemy'&&u.troops>0);
  for(const e of es){
   if(e.skipTurns>0){e.skipTurns--;b.logs.unshift(`${e.name}隊は幻惑され、行動できない。`);continue}
   const ps=b.units.filter(u=>u.side==='player'&&u.troops>0);if(!ps.length)break;
   const t=ps.sort((a,c)=>v246Dist(e,a)-v246Dist(e,c))[0],d=v246Dist(e,t);
   if(d<=1){const dmg=v246Deal(e,t,v246RawDamage(e,100,2.1,0,.03));b.logs.unshift(`${e.name}隊が${t.name}隊へ${dmg}損害。`)}
   else if(e.immobileTurns>0){e.immobileTurns--;b.logs.unshift(`${e.name}隊は連環に阻まれ、移動できない。`)}
   else{const nx=e.x+Math.sign(t.x-e.x),ny=e.y+Math.sign(t.y-e.y),occ=b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny);if(!occ){e.x=nx;e.y=ny}}
   if(e.weakenTurns>0)e.weakenTurns--;
  }
  if(b.playerGuardTurns>0)b.playerGuardTurns--;
  if(checkBattleEnd())return;
  b.units.filter(u=>u.side==='player').forEach(u=>u.done=false);b.phase='player';b.day++;render();
 },550)
};
})();