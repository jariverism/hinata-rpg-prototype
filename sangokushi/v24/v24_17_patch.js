// v24.17 — sword-and-shield infantry, historical troop roles, and clearer battle stat formulas
(()=>{
const previousRender=window.render;
const previousBattleAction=window.battleAction;

const TYPE_INFO={
 '剣盾兵':{icon:'剣',move:2,desc:'安定した前衛。通常の物理被害を10%軽減し、森林・城地形ではさらに10%軽減。'},
 '槍兵':{icon:'槍',move:2,desc:'対騎兵の迎撃兵科。騎兵への攻撃1.35倍、騎兵から受ける攻撃0.75倍。'},
 '騎兵':{icon:'騎',move:3,desc:'機動兵科。弩兵への攻撃1.30倍。2マス以上移動後の突撃はさらに1.20倍。'},
 '弩兵':{icon:'弩',move:2,desc:'射程3。遠距離射撃に強く、槍兵へ1.25倍。隣接戦では攻撃0.65倍。'}
};
window.TROOP_TYPE_INFO=TYPE_INFO;

function normalizeTypeName(t){return !t||t==='歩兵'?'剣盾兵':t}
function typeOf(u){return normalizeTypeName(u?.type||u?.apt)}
function normalizeOfficerTypes(){
 const groups=[];
 try{if(typeof HINATA_START!=='undefined')groups.push(HINATA_START)}catch(e){}
 try{if(typeof HIST!=='undefined')groups.push(HIST)}catch(e){}
 if(Array.isArray(window.EXTRA_HISTORICAL_OFFICERS))groups.push(window.EXTRA_HISTORICAL_OFFICERS);
 try{if(typeof state!=='undefined'&&state?.officers)groups.push(state.officers)}catch(e){}
 groups.forEach(list=>list.forEach(o=>{
  if(o.apt==='歩兵'||!o.apt)o.apt='剣盾兵';
  if(o.type==='歩兵')o.type='剣盾兵';
 }));
}
function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function alive(side){return state.battle.units.filter(u=>u.side===side&&u.troops>0)}
function moveRange(u){return (TYPE_INFO[typeOf(u)]?.move||2)+(u.moveRangeBonus||0)}
function terrainAt(u){
 const b=state?.battle;if(!b||!Array.isArray(b.terrain))return '';
 return String(b.terrain[u.y*9+u.x]||'');
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

function leadershipDefense(target,fire=false){
 const lead=Number(target?.lead)||50;
 const scale=fire?.0015:.003;
 const cap=fire?.075:.15;
 const floor=fire?-.045:-.09;
 return 1-clamp((lead-50)*scale,floor,cap);
}
function physicalRoleModifier(attacker,target,distance){
 const a=typeOf(attacker),d=typeOf(target);let mult=1,labels=[];
 if(a==='槍兵'&&d==='騎兵'){mult*=1.35;labels.push('槍兵の迎撃')}
 if(a==='騎兵'&&d==='槍兵'){mult*=.75;labels.push('槍列に阻まれる')}
 if(a==='騎兵'&&d==='弩兵'){mult*=1.30;labels.push('弩兵へ騎馬攻撃')}
 if(a==='騎兵'&&(attacker.movedDistance||0)>=2){mult*=1.20;labels.push('騎馬突撃')}
 if(a==='弩兵'){
  if(distance<=1){mult*=.65;labels.push('弩兵の接近戦')}
  else if(d==='槍兵'){mult*=1.25;labels.push('槍兵へ遠射')}
  else{mult*=1.10;labels.push('遠距離射撃')}
 }
 if(a==='剣盾兵'&&d==='弩兵'&&distance<=1){mult*=1.25;labels.push('弩兵の懐へ侵入')}
 if(d==='剣盾兵'){
  mult*=.90;labels.push('盾防御');
  if(/forest|wood|fort|castle|森|林|城/i.test(terrainAt(target))){mult*=.90;labels.push('地形防御')}
 }
 return {mult,labels};
}
function normalDamage(attacker,target,distance){
 const war=Number(attacker.war)||50,lead=Number(attacker.lead)||50,troops=Number(attacker.troops)||0;
 let value=90+war*2+lead*.8+troops*.03+rnd(0,100);
 if(attacker.weakenTurns>0)value*=.65;
 if(attacker.criticalReady){
  value*=1.75;attacker.criticalReady=false;attacker.moveRangeBonus=0;
  state.battle.logs.unshift(`${attacker.name}隊の星詠みが成就した！`);
 }
 const role=physicalRoleModifier(attacker,target,distance);value*=role.mult;
 const leadMult=leadershipDefense(target,false);value*=leadMult;
 return {damage:Math.max(1,Math.floor(value)),role,leadMult};
}
function fireChance(attacker,target){
 return clamp(Math.round(25+(Number(attacker.int)||50)*.65-(Number(target.int)||50)*.25),10,90);
}
function fireDamage(attacker,target){
 const value=(140+(Number(attacker.int)||50)*2.2+(Number(attacker.troops)||0)*.018+rnd(0,100))*leadershipDefense(target,true);
 return Math.max(1,Math.floor(value));
}
function applyDamage(target,damage){
 if(target.side==='player'&&(state.battle.playerGuardTurns||0)>0)damage=Math.floor(damage*.7);
 target.troops=Math.max(0,target.troops-damage);return damage;
}
function modText(calc){
 const parts=[...calc.role.labels];
 const targetReduction=Math.round((1-calc.leadMult)*100);
 if(targetReduction>0)parts.push(`敵統率で${targetReduction}%軽減`);
 else if(targetReduction<0)parts.push(`敵統率不足で${-targetReduction}%増加`);
 return parts.length?`【${parts.join('・')}】`:'';
}

function updateRosterDisplay(){
 if(!state||state.battle)return;
 document.querySelectorAll('.officers .officer').forEach(card=>{
  const name=card.querySelector('b')?.textContent?.trim();
  const o=state.officers.find(x=>x.name===name&&x.force==='日向軍');if(!o)return;
  const meta=card.querySelector('.v2416-roster-meta');if(!meta)return;
  const type=typeOf(o);
  meta.innerHTML=`<span class="troop-badge type-${type}">${TYPE_INFO[type]?.icon||'剣'} ${type}</span><span class="loyalty-badge">忠誠 ${Number.isFinite(Number(o.loy))?o.loy:'―'}</span>${o.status&&o.status!=='一般'?`<span class="status-badge">${o.status}</span>`:''}`;
  card.title=`${name}　兵科：${type}　忠誠：${o.loy??'―'}\n${TYPE_INFO[type]?.desc||''}`;
 });
}
function decorateBattle(){
 if(!state?.battle)return;
 const b=state.battle,p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);
 document.querySelectorAll('[data-unit]').forEach(el=>{
  const u=b.units.find(x=>x.name===el.dataset.unit&&x.troops>0);if(!u)return;
  let badge=el.querySelector('.v2416-unit-type');
  if(!badge){badge=document.createElement('span');badge.className='v2416-unit-type';el.prepend(badge)}
  badge.className=`v2416-unit-type type-${typeOf(u)}`;badge.textContent=TYPE_INFO[typeOf(u)]?.icon||'剣';
  el.title=`${u.name}隊　${typeOf(u)}\n${TYPE_INFO[typeOf(u)]?.desc||''}`;
 });
 const side=document.querySelector('.battle > .panel:last-child');
 if(side){
  let guide=side.querySelector('.v2416-type-guide');
  if(!guide){guide=document.createElement('div');guide.className='v2416-type-guide';side.querySelector('.battle-actions')?.before(guide)}
  if(guide)guide.innerHTML=`<b>兵科の役割</b><br><span>槍兵は騎兵を迎撃／騎兵は弩兵を急襲／弩兵は遠射／剣盾兵は防御</span><br><small>槍→騎1.35倍、騎→弩1.30倍、遠距離の弩→槍1.25倍。剣盾兵は物理被害10%軽減。騎兵は移動3で、2マス以上の移動後に突撃可能。</small>`;
  let stats=side.querySelector('.v2417-formula');
  if(!stats){stats=document.createElement('div');stats.className='v2417-formula';guide?.after(stats)}
  if(stats)stats.innerHTML=p?`<b>${p.name}隊</b>　${typeOf(p)}<br><small>通常攻撃：武力${p.war}・統率${p.lead??50}・兵数を使用／火計：知力${p.int}と敵知力で成功判定</small>`:'<small>部隊を選ぶと、戦闘能力の参照値を表示します。</small>';
 }
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  cell.onclick=()=>{
   const unit=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);
   if(b.mode!=='move'||!unit||unit.done)return;
   if(unit.movedThisTurn){b.logs.unshift(`${unit.name}隊はすでに移動済み。`);b.mode=null;return render()}
   const [nx,ny]=cell.dataset.cell.split(',').map(Number),d=dist(unit,{x:nx,y:ny}),range=moveRange(unit);
   const occupied=b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny);
   if(d>range||occupied)return;
   unit.x=nx;unit.y=ny;unit.movedDistance=d;unit.movedThisTurn=true;unit.moveRangeBonus=0;b.mode=null;
   if(typeOf(unit)==='騎兵'){
    b.logs.unshift(`${unit.name}隊（騎兵）が${d}マス移動。続けて攻撃できます。`);render();
   }else{
    unit.done=true;b.logs.unshift(`${unit.name}隊（${typeOf(unit)}）が${d}マス移動。`);afterPlayerAction();
   }
  };
 });
}

window.battleAction=function(action){
 const b=state.battle,p=b?.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);if(!b)return;
 if(action==='move'){
  if(!p||p.done)return;if(p.movedThisTurn){b.logs.unshift(`${p.name}隊はすでに移動済み。`);return render()}
  b.mode='move';b.logs.unshift(`${typeOf(p)}の移動先を選択（最大${moveRange(p)}マス）。`);return render();
 }
 if(action!=='attack'&&action!=='fire')return previousBattleAction(action);
 if(!p||p.done)return;
 const range=action==='fire'?3:(typeOf(p)==='弩兵'?3:1);
 const targets=b.units.filter(e=>e.side==='enemy'&&e.troops>0&&dist(p,e)<=range);
 if(!targets.length){b.logs.unshift(action==='fire'?'火計の射程内に敵なし。':'射程内に敵なし。');return render()}
 const target=targets.sort((x,y)=>x.troops-y.troops)[0],distance=dist(p,target);
 if(action==='attack'){
  const calc=normalDamage(p,target,distance),damage=applyDamage(target,calc.damage);
  b.logs.unshift(`${p.name}隊（${typeOf(p)}）が${target.name}隊（${typeOf(target)}）へ${damage}損害。${modText(calc)}`);
 }else{
  const chance=fireChance(p,target),success=Math.random()*100<chance;
  if(success){const damage=applyDamage(target,fireDamage(p,target));b.logs.unshift(`${p.name}隊の火計成功（${chance}%）！ ${target.name}隊へ${damage}損害。`)}
  else b.logs.unshift(`${p.name}隊の火計失敗（成功率${chance}%、敵知力${target.int??50}）。`);
 }
 p.done=true;p.movedDistance=0;afterPlayerAction();
};

window.enemyPhase=function(){
 const b=state.battle;b.phase='enemy';render();setTimeout(()=>{
  for(const e of alive('enemy')){
   e.movedDistance=0;e.movedThisTurn=false;
   if(e.skipTurns>0){e.skipTurns--;b.logs.unshift(`${e.name}隊は幻惑され、行動できない。`);continue}
   let players=alive('player');if(!players.length)break;
   let target=players.sort((a,c)=>dist(e,a)-dist(e,c)||a.troops-c.troops)[0];
   const range=typeOf(e)==='弩兵'?3:1;
   if(dist(e,target)<=range){
    const calc=normalDamage(e,target,dist(e,target)),damage=applyDamage(target,calc.damage);
    b.logs.unshift(`${e.name}隊（${typeOf(e)}）が${target.name}隊（${typeOf(target)}）へ${damage}損害。${modText(calc)}`);
   }else if(e.immobileTurns>0){
    e.immobileTurns--;b.logs.unshift(`${e.name}隊は連環に阻まれ、移動できない。`);
   }else{
    let steps=moveRange(e),moved=0;
    while(steps-->0){
     players=alive('player');if(!players.length)break;
     target=players.sort((a,c)=>dist(e,a)-dist(e,c))[0];if(dist(e,target)<=range)break;
     const dx=Math.sign(target.x-e.x),dy=Math.sign(target.y-e.y);
     const options=Math.abs(target.x-e.x)>=Math.abs(target.y-e.y)?[[e.x+dx,e.y],[e.x,e.y+dy]]:[[e.x,e.y+dy],[e.x+dx,e.y]];
     const next=options.find(([nx,ny])=>nx>=0&&nx<9&&ny>=0&&ny<7&&!b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny));
     if(!next)break;e.x=next[0];e.y=next[1];moved++;
    }
    e.movedDistance=moved;e.movedThisTurn=moved>0;
    players=alive('player');if(players.length&&typeOf(e)==='騎兵'){
     target=players.sort((a,c)=>dist(e,a)-dist(e,c))[0];
     if(dist(e,target)<=1){const calc=normalDamage(e,target,1),damage=applyDamage(target,calc.damage);b.logs.unshift(`${e.name}隊の騎馬突撃！ ${target.name}隊へ${damage}損害。${modText(calc)}`)}
    }
   }
   if(e.weakenTurns>0)e.weakenTurns--;
  }
  if(b.playerGuardTurns>0)b.playerGuardTurns--;
  if(checkBattleEnd())return;
  b.units.filter(u=>u.side==='player').forEach(u=>{u.done=false;u.movedDistance=0;u.movedThisTurn=false});
  b.phase='player';b.day++;render();
 },550);
};

window.render=function(){
 normalizeOfficerTypes();const result=previousRender();
 setTimeout(()=>{normalizeOfficerTypes();if(state?.battle)decorateBattle();else updateRosterDisplay()},0);return result;
};
normalizeOfficerTypes();

const style=document.createElement('style');style.textContent=`
.type-剣盾兵{border-color:#888!important;color:#e6e6e6!important}
.v2417-formula{margin:7px 0 10px;padding:8px 10px;border:1px solid #5e674d;background:#151a12;color:#d7e2c5;line-height:1.45;font-size:11px}
`;
document.head.appendChild(style);
})();
