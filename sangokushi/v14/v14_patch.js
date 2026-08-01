const HINATA_SEARCH_REGIONS={
 '加藤史帆':['北平','鄴'],'齊藤京子':['洛陽','許昌'],'東村芽依':['成都','江陵'],'高瀬愛奈':['建業','寿春'],
 '濱岸ひより':['北平','襄陽'],'上村ひなの':['洛陽','長安'],'富田鈴花':['許昌','寿春'],'丹生明里':['建業','南海'],
 '河田陽菜':['成都','漢中'],'平尾帆夏':['襄陽','江陵'],'藤嶌果歩':['北平','鄴'],'山下葉留花':['洛陽','襄陽'],
 '宮地すみれ':['長安','漢中'],'石塚瑶季':['寿春','建業'],'山口陽世':['成都','江陵'],'森本茉莉':['南海','建業'],
 '清水理央':['許昌','洛陽'],'小西夏菜実':['襄陽','漢中']
};

search=function(o){
 const c=state.cities[state.selected];if(c.gold<60)return alert('金不足');c.gold-=60;
 const pool=HINATA_OFFICERS.filter(h=>!state.officers.some(x=>x.name===h.name)&&(HINATA_SEARCH_REGIONS[h.name]||[]).includes(state.selected));
 const chance=Math.min(88,22+o.int*.55);
 if(pool.length&&Math.random()*100<chance){
  const h=pool[Math.floor(Math.random()*pool.length)];
  state.officers.push({...h,force:'在野',city:state.selected,loy:40+Math.floor(Math.random()*16),status:'在野'});
  finish(o,`${state.selected}で${h.name}を発見。`);
 }else{
  const g=50+Math.floor(Math.random()*120);c.gold+=g;
  finish(o,pool.length?`人材は見つからず、金${g}を発見。`:`この地域に新たな人材の手掛かりはなく、金${g}を発見。`);
 }
};

formArmy=function(target,first){
 const city=state.cities[state.selected],list=ready(state.selected);if(first&&!list.includes(first))list.unshift(first);
 showModal(`<h2>${target}攻略軍の編成</h2><div class="report">出兵可能なのは最大7部隊です。選択した部隊はすべて戦場へ配置されます。</div><div class="army-form">${list.map(o=>`<div class="army-row"><label><input type="checkbox" name="army" value="${o.name}" ${o===first?'checked':''}> <b>${o.name}</b> 統${o.lead} 武${o.war} 知${o.int}</label><select data-type="${o.name}"><option>歩</option><option ${o.apt==='騎'?'selected':''}>騎</option><option ${o.apt==='弩'?'selected':''}>弩</option></select><input data-troops="${o.name}" type="number" min="500" step="100" value="${o===first?Math.min(2000,Math.max(500,city.troops-500)):1000}"></div>`).join('')}</div><div id="army-total" class="report"></div><button id="army-go" class="green">この編成で出兵</button><button data-close class="secondary">閉じる</button>`);
 const refresh=()=>{const chosen=[...card.querySelectorAll('input[name="army"]:checked')];let total=0;chosen.forEach(x=>total+=Math.floor((+card.querySelector(`[data-troops="${x.value}"]`).value||0)/100)*100);card.querySelector('#army-total').textContent=`選択 ${chosen.length}/7部隊　出兵兵力 ${total.toLocaleString()}／城内 ${city.troops.toLocaleString()}（最低500残留）`};
 card.querySelectorAll('input,select').forEach(x=>x.oninput=refresh);refresh();
 card.querySelector('#army-go').onclick=()=>{
  const chosen=[...card.querySelectorAll('input[name="army"]:checked')];if(!chosen.length)return alert('武将を選択してください');if(chosen.length>7)return alert('出兵できるのは最大7部隊です');
  const units=[];let total=0;
  for(const x of chosen){const n=x.value,t=Math.floor((+card.querySelector(`[data-troops="${n}"]`).value||0)/100)*100;if(t<500)return alert('各部隊500人以上必要です');total+=t;const officer=state.officers.find(z=>z.name===n);units.push({side:'player',name:n,type:card.querySelector(`[data-type="${n}"]`).value,troops:t,morale:city.morale,x:0,y:units.length,lead:officer.lead,war:officer.war,int:officer.int,actionDone:false})}
  if(total>city.troops-500)return alert('兵力が多すぎます');city.troops-=total;chosen.forEach(x=>state.officers.find(z=>z.name===x.value).acted=state.turn);closeModal();startBattleGroup(state.selected,target,units,false);
 };
};

makeEnemyUnits=function(cityName,force,total,side){
 let list=ofs(force,cityName);if(!list.length)list=[{name:force,lead:75,war:70,int:70,apt:'歩'}];
 const count=Math.min(7,list.length),base=Math.floor(total/count),units=[];
 for(let i=0;i<count;i++){const o=list[i],troops=i===count-1?total-base*(count-1):base;units.push({side,name:o.name,type:o.apt||['歩','騎','弩'][i%3],troops,morale:state.cities[cityName].morale,x:side==='enemy'?6:0,y:i,lead:o.lead||75,war:o.war||70,int:o.int||70,actionDone:false})}
 return units;
};

startBattleGroup=function(src,target,playerUnits,defense){
 const enemyForce=defense?state.cities[src].force:state.cities[target].force,enemyCity=defense?src:target,enemyTotal=state.cities[enemyCity].troops,enemyUnits=makeEnemyUnits(enemyCity,enemyForce,enemyTotal,'enemy');
 playerUnits.slice(0,7).forEach((u,i)=>{u.x=0;u.y=i;u.actionDone=false});
 state.battle={src,target,defense,turn:1,phase:'player',selected:playerUnits[0]?.name||'',logs:[defense?`${enemyForce}が${target}へ侵攻。防衛戦開始。`:`日向軍が${target}へ進軍。`],units:[...playerUnits.slice(0,7),...enemyUnits],terrain:Array.from({length:49},(_,i)=>i%11===0?'forest':i%13===0?'hill':i%17===0?'river':'plain')};battleMoveMode=false;render();
};

beginDefense=function(p){
 const city=state.cities[p.target],list=ofs(state.playerForce,p.target);if(!list.length){city.force=p.force;city.troops=900;log(`${p.force}が無人の${p.target}を占領。`);return render()}
 const chosen=list.slice(0,7),total=city.troops,base=Math.floor(total/chosen.length),units=chosen.map((o,i)=>({side:'player',name:o.name,type:o.apt||['歩','騎','弩'][i%3],troops:i===chosen.length-1?total-base*(chosen.length-1):base,morale:city.morale,x:0,y:i,lead:o.lead,war:o.war,int:o.int,actionDone:false}));startBattleGroup(p.src,p.target,units,true);
};

renderBattle=function(){
 const b=state.battle;if(!b.phase)b.phase='player';
 const players=b.units.filter(x=>x.side==='player'&&x.troops>0),enemies=b.units.filter(x=>x.side==='enemy'&&x.troops>0);
 let u=b.units.find(x=>x.name===b.selected&&x.troops>0);if(!u||u.side!=='player'){u=players.find(x=>!x.actionDone)||players[0];if(u)b.selected=u.name}
 const reachable=b.phase==='player'&&battleMoveMode&&u&&!u.actionDone?new Set(reachableTiles(u).map(t=>cellKey(t.x,t.y))):new Set();
 app.innerHTML=`<section class="screen"><div class="panel"><div class="title">${b.defense?b.target+'防衛戦':b.src+'軍 VS '+b.target+'軍'}　第${b.turn}日</div><div class="phase-banner">${b.phase==='player'?'自軍フェイズ':'敵軍フェイズ'}</div><div class="battle"><div class="battlefield">${Array.from({length:49},(_,i)=>{const x=i%7,y=Math.floor(i/7),unit=b.units.find(z=>z.troops>0&&z.x===x&&z.y===y),move=reachable.has(cellKey(x,y));return`<div class="tile ${b.terrain[i]} ${move?'moveable':''}" data-tile="${x},${y}">${unit?`<div class="unit ${unit.side} ${unit.actionDone?'done':''} ${unit.name===b.selected?'selected-unit':''}" data-unit="${unit.name}">${unit.side==='player'?'日':'敵'}<br>${unit.name}<br>${unit.type}${Math.max(0,unit.troops)}${unit.side==='player'&&unit.actionDone?'<br>済':''}</div>`:''}</div>`}).join('')}</div><div class="battle-controls"><b>選択：${u?.name||'なし'}</b><div>兵${u?.troops||0} 士気${u?.morale||0} 兵科${u?.type||'-'} ${u?.actionDone?'［行動済］':''}</div><div class="choice-list">${players.map(x=>`<button data-select="${x.name}" class="${x.name===b.selected?'green':''}" ${b.phase!=='player'?'disabled':''}>${x.name} ${x.type}${x.troops} ${x.actionDone?'済':'未'}</button>`).join('')}</div><div class="battle-help">${b.phase==='enemy'?'敵軍が行動中です。':battleMoveMode?'緑色のマスをタップして移動してください。':'各部隊は自軍フェイズに1回行動できます。全軍の操作後、「自軍ターン終了」を押してください。'}</div><button data-b="move" ${b.phase!=='player'||u?.actionDone?'disabled':''}>移動</button><button data-b="attack" ${b.phase!=='player'||u?.actionDone?'disabled':''}>攻撃</button><button data-b="fire" ${b.phase!=='player'||u?.actionDone?'disabled':''}>火計</button><button data-b="rest" ${b.phase!=='player'||u?.actionDone?'disabled':''}>待機・鼓舞</button><button data-b="endphase" class="green" ${b.phase!=='player'?'disabled':''}>自軍ターン終了</button><button data-b="retreat" class="secondary" ${b.phase!=='player'?'disabled':''}>全軍退却</button><div class="report">味方${players.reduce((a,x)=>a+x.troops,0).toLocaleString()}／敵${enemies.reduce((a,x)=>a+x.troops,0).toLocaleString()}</div><div class="battle-log">${b.logs.join('\n')}</div></div></div></div></section>`;
 document.querySelectorAll('[data-select]').forEach(e=>e.onclick=()=>{b.selected=e.dataset.select;battleMoveMode=false;render()});
 document.querySelectorAll('[data-unit]').forEach(e=>e.onclick=ev=>{ev.stopPropagation();const target=b.units.find(x=>x.name===e.dataset.unit);if(target?.side==='player'&&b.phase==='player'){b.selected=target.name;battleMoveMode=false;render()}});
 document.querySelectorAll('[data-b]').forEach(e=>e.onclick=()=>battleAction(e.dataset.b));
 document.querySelectorAll('.tile.moveable').forEach(e=>e.onclick=()=>{const [x,y]=e.dataset.tile.split(',').map(Number);manualBattleMove(x,y)});
};

function completeUnitAction(p,msg){p.actionDone=true;if(msg)state.battle.logs.unshift(msg);battleMoveMode=false;const next=state.battle.units.find(x=>x.side==='player'&&x.troops>0&&!x.actionDone);if(next)state.battle.selected=next.name;render()}

manualBattleMove=function(x,y){
 const b=state.battle,p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);if(!p||b.phase!=='player'||p.actionDone)return;
 if(!reachableTiles(p).some(t=>t.x===x&&t.y===y))return;const from=`(${p.x+1},${p.y+1})`;p.x=x;p.y=y;completeUnitAction(p,`${p.name}隊が${from}から(${x+1},${y+1})へ移動。`);
};

function endPlayerPhase(){
 const b=state.battle;b.phase='enemy';battleMoveMode=false;b.logs.unshift('自軍フェイズ終了。敵軍フェイズへ。');render();
 setTimeout(()=>{if(!state.battle)return;enemyBattleTurn();if(b.units.filter(x=>x.side==='player'&&x.troops>0).length===0)return endBattleGroup(false,false);if(b.units.filter(x=>x.side==='enemy'&&x.troops>0).length===0)return endBattleGroup(true,false);b.turn++;if(b.turn>30){const pt=b.units.filter(x=>x.side==='player').reduce((a,x)=>a+Math.max(0,x.troops),0),et=b.units.filter(x=>x.side==='enemy').reduce((a,x)=>a+Math.max(0,x.troops),0);return endBattleGroup(pt>et,false)}b.units.filter(x=>x.side==='player'&&x.troops>0).forEach(x=>x.actionDone=false);b.phase='player';b.selected=b.units.find(x=>x.side==='player'&&x.troops>0)?.name||'';b.logs.unshift('敵軍フェイズ終了。自軍フェイズへ。');render()},650);
}

battleAction=function(a){
 const b=state.battle;if(a==='endphase')return endPlayerPhase();if(a==='retreat')return endBattleGroup(false,true);if(b.phase!=='player')return;
 const p=b.units.find(x=>x.name===b.selected&&x.side==='player'&&x.troops>0);if(!p)return alert('部隊を選択してください');if(p.actionDone)return alert('この部隊は行動済みです');
 if(a==='move'){battleMoveMode=!battleMoveMode;return render()}
 battleMoveMode=false;const enemies=b.units.filter(x=>x.side==='enemy'&&x.troops>0),e=nearest(p,enemies);
 if(a==='attack'){if(!e||Math.abs(p.x-e.x)+Math.abs(p.y-e.y)>1){b.logs.unshift('隣接する敵がいない。');return render()}const mult=p.type==='騎'&&e.type==='歩'?1.3:p.type==='弩'&&e.type==='騎'?1.3:p.type==='歩'&&e.type==='弩'?1.2:1;const dmg=Math.floor((120+p.troops*.035+p.war*3)*(0.75+Math.random()*.5)*mult);e.troops-=dmg;completeUnitAction(p,`${p.name}隊の攻撃、${e.name}隊に${dmg}損害。`)}
 else if(a==='fire'){if(!e||Math.abs(p.x-e.x)+Math.abs(p.y-e.y)>3){b.logs.unshift('火計の対象が遠すぎる。');return render()}const ok=Math.random()*100<15+p.int*.65;if(ok){const dmg=250+Math.floor(Math.random()*650)+p.int*2;e.troops-=dmg;e.morale-=8;completeUnitAction(p,`${p.name}の火計成功、${e.name}隊に${dmg}損害。`)}else completeUnitAction(p,`${p.name}の火計失敗。`)}
 else if(a==='rest'){p.morale=Math.min(100,p.morale+8);completeUnitAction(p,`${p.name}隊が士気を整えた。`)}
};
