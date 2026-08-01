const V17_SPECIALS={
 '佐々木久美':{name:'キャプテンの大号令',desc:'味方全軍の士気を大幅に上げ、行動済みの一部隊を再行動可能にする。'},
 '小坂菜緒':{name:'静謐封陣',desc:'敵全軍の動きを封じ、次の敵軍フェイズで高確率で行動不能にする。'},
 '上村ひなの':{name:'変化球妖術',desc:'妖術で敵全軍へ損害と士気低下を与える。成否は知力に依存する。'},
 '諸葛亮':{name:'八陣図',desc:'敵全軍を八陣へ誘い込み、損害・士気低下・行動阻害を与える。'},
 '周瑜':{name:'神火計',desc:'指定した敵部隊と周囲の敵へ大規模な火攻めを行う。'}
};

function v17SpecialOf(unit){return unit&&V17_SPECIALS[unit.name]}
function v17Alive(side){return state.battle.units.filter(u=>u.side===side&&u.troops>0)}
function v17ClampUnits(){state.battle.units.forEach(u=>{if(u.troops<0)u.troops=0;if(u.morale<0)u.morale=0;if(u.morale>100)u.morale=100})}
function v17Distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}

const v17BaseRenderBattle=renderBattle;
renderBattle=function(){
 if(v16CheckBattleEnd())return;
 v17BaseRenderBattle();
 if(!state||!state.battle||state.battle.phase!=='player')return;
 const b=state.battle,p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0),sp=v17SpecialOf(p);
 if(!p||!sp)return;
 const controls=document.querySelector('.battle-controls');if(!controls)return;
 const note=document.createElement('div');note.className='special-note';note.innerHTML=`<b>固有戦術：${sp.name}</b><br>${sp.desc}${p.specialUsed?'<br>［この戦では使用済み］':''}`;
 const btn=document.createElement('button');btn.className='special-command';btn.textContent=sp.name;btn.disabled=!!p.actionDone||!!p.specialUsed;btn.addEventListener('click',()=>v17UseSpecial(p));
 const endBtn=controls.querySelector('[data-b="endphase"]');controls.insertBefore(note,endBtn);controls.insertBefore(btn,endBtn);
};

function v17UseSpecial(p){
 const b=state.battle,sp=v17SpecialOf(p);if(!sp||p.specialUsed||p.actionDone||b.phase!=='player')return;
 p.specialUsed=true;
 if(p.name==='佐々木久美'){
  const allies=v17Alive('player');allies.forEach(u=>u.morale=Math.min(100,u.morale+18));
  const acted=allies.filter(u=>u.actionDone&&u.name!==p.name);if(acted.length){acted.sort((a,z)=>z.lead-a.lead)[0].actionDone=false;b.logs.unshift(`${acted[0].name}隊は大号令を受け、再び行動可能となった。`)}
  completeUnitAction(p,'佐々木久美の「キャプテンの大号令」！ 味方全軍の士気が上昇。');
  return;
 }
 if(p.name==='小坂菜緒'){
  const chance=Math.min(100,35+p.int*.62),ok=Math.random()*100<chance;
  if(ok){v17Alive('enemy').forEach(e=>{e.morale-=12;e.sealed=1});completeUnitAction(p,'小坂菜緒の「静謐封陣」成功。敵全軍の動きを封じた。')}
  else completeUnitAction(p,'小坂菜緒の「静謐封陣」は敵に見破られた。');
  return;
 }
 if(p.name==='上村ひなの'){
  const chance=Math.min(95,20+p.int*.68),ok=Math.random()*100<chance;
  if(ok){v17Alive('enemy').forEach(e=>{e.troops-=300+Math.floor(p.int*4+Math.random()*350);e.morale-=14});v17ClampUnits();if(v16CheckBattleEnd())return;completeUnitAction(p,'上村ひなのの「変化球妖術」！ 敵全軍に異変が襲いかかった。')}
  else completeUnitAction(p,'上村ひなのの「変化球妖術」は不発に終わった。');
  return;
 }
 if(p.name==='諸葛亮'){
  const chance=Math.min(100,30+p.int*.7),ok=Math.random()*100<chance;
  if(ok){v17Alive('enemy').forEach(e=>{e.troops-=220+Math.floor(Math.random()*280);e.morale-=18;e.sealed=Math.random()<.75?1:0});v17ClampUnits();if(v16CheckBattleEnd())return;completeUnitAction(p,'諸葛亮の「八陣図」！ 敵軍は陣中に迷い込んだ。')}
  else completeUnitAction(p,'諸葛亮の「八陣図」は敵将に突破された。');
  return;
 }
 if(p.name==='周瑜'){
  const targets=v17Alive('enemy');if(!targets.length)return;
  showModal(`<h2>神火計の対象</h2><div class="choice-list">${targets.map(e=>`<button data-v17-target="${e.name}"><b>${e.name}隊</b>　兵${e.troops}<br>周囲2マス以内も延焼</button>`).join('')}</div><button data-close>閉じる</button>`);
  card.querySelectorAll('[data-v17-target]').forEach(btn=>btn.onclick=()=>{const t=targets.find(e=>e.name===btn.dataset.v17Target);closeModal();const chance=Math.min(98,25+p.int*.68),ok=Math.random()*100<chance;if(ok){v17Alive('enemy').filter(e=>v17Distance(e,t)<=2).forEach(e=>{e.troops-=500+Math.floor(Math.random()*650)+p.int*2;e.morale-=20});v17ClampUnits();if(v16CheckBattleEnd())return;completeUnitAction(p,`周瑜の「神火計」成功！ ${t.name}隊周辺が火の海となった。`)}else completeUnitAction(p,'周瑜の「神火計」は風向きを読み違え失敗した。')});
 }
}

const v17BaseEnemyBattleTurn=enemyBattleTurn;
enemyBattleTurn=function(){
 const b=state&&state.battle;if(!b)return;
 const strategists=v17Alive('enemy').filter(u=>v17SpecialOf(u)&&!u.specialUsed);
 if(strategists.length&&Math.random()<.38){
  const e=strategists.sort((a,z)=>z.int-a.int)[0];e.specialUsed=true;
  const players=v17Alive('player');
  if(e.name==='諸葛亮'){
   players.forEach(p=>{p.troops-=180+Math.floor(Math.random()*250);p.morale-=12;if(Math.random()<.55)p.actionDone=true});b.logs.unshift('敵・諸葛亮が「八陣図」を発動！ 自軍は陣中に迷い込んだ。');
  }else if(e.name==='周瑜'){
   const t=players[Math.floor(Math.random()*players.length)];players.filter(p=>v17Distance(p,t)<=2).forEach(p=>{p.troops-=430+Math.floor(Math.random()*600);p.morale-=16});b.logs.unshift(`敵・周瑜の「神火計」！ ${t.name}隊周辺が炎上。`);
  }
  v17ClampUnits();if(v16CheckBattleEnd())return;
 }
 const sealed=b.units.filter(u=>u.side==='enemy'&&u.troops>0&&u.sealed>0);
 sealed.forEach(u=>u._v17Skip=true);
 const active=b.units.filter(u=>u.side==='enemy'&&u.troops>0&&!u._v17Skip);
 const originalTroops=new Map(sealed.map(u=>[u.name,u.troops]));
 sealed.forEach(u=>u.troops=0);
 v17BaseEnemyBattleTurn();
 sealed.forEach(u=>{u.troops=originalTroops.get(u.name);u.sealed=0;delete u._v17Skip;b.logs.unshift(`${u.name}隊は封陣に阻まれ行動できない。`)});
 v17ClampUnits();
};
