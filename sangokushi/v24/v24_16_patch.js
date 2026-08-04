// v24.16 — visible loyalty/troop classes and meaningful troop-type matchups
(()=>{
const oldRender=window.render;
const oldBattleAction=window.battleAction;

const TYPE_INFO={
 '歩兵':{icon:'歩',move:2,desc:'槍兵に強い。安定した近接兵科。'},
 '槍兵':{icon:'槍',move:2,desc:'騎兵に強い。騎馬突撃を受け止める。'},
 '騎兵':{icon:'騎',move:3,desc:'歩兵に強い。移動力が高い。'},
 '弩兵':{icon:'弩',move:2,desc:'3マス射撃。遠距離で強いが、接近戦に弱い。'}
};
window.TROOP_TYPE_INFO=TYPE_INFO;

function typeOf(u){return u?.type||u?.apt||'歩兵'}
function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function moveRange(u){return (TYPE_INFO[typeOf(u)]?.move||2)+(u.moveRangeBonus||0)}
function alive(side){return state.battle.units.filter(u=>u.side===side&&u.troops>0)}

function matchup(attacker,target,distance){
 const a=typeOf(attacker),d=typeOf(target);
 if(a==='弩兵'){
  if(distance>=2)return {mult:1.20,label:'遠射有利'};
  return {mult:.65,label:'接近戦不利'};
 }
 if(d==='弩兵'&&distance<=1)return {mult:1.15,label:'弩兵へ接近'};
 const strong={歩兵:'槍兵',槍兵:'騎兵',騎兵:'歩兵'};
 if(strong[a]===d)return {mult:a==='槍兵'?1.35:a==='騎兵'?1.30:1.25,label:'兵科有利'};
 if(strong[d]===a)return {mult:.78,label:'兵科不利'};
 return {mult:1,label:''};
}
function rawDamage(attacker,target,base,warScale=0,intScale=0,troopScale=0,distance=1){
 let dmg=base+(attacker.war||50)*warScale+(attacker.int||50)*intScale+attacker.troops*troopScale+rnd(0,140);
 if(attacker.weakenTurns>0)dmg*=.65;
 if(attacker.criticalReady){
  dmg*=1.75;attacker.criticalReady=false;attacker.moveRangeBonus=0;
  state.battle.logs.unshift(`${attacker.name}隊の星詠みが成就した！`);
 }
 const relation=matchup(attacker,target,distance);dmg*=relation.mult;
 return {dmg:Math.max(1,Math.floor(dmg)),relation};
}
function deal(target,dmg){
 const b=state.battle;
 if(target.side==='player'&&(b.playerGuardTurns||0)>0)dmg=Math.floor(dmg*.7);
 target.troops=Math.max(0,target.troops-dmg);
 return dmg;
}
function relationText(r){return r.label?`【${r.label} ×${r.mult.toFixed(2)}】`:''}

function decorateRoster(){
 if(!state||state.battle)return;
 document.querySelectorAll('.officers .officer').forEach(card=>{
  const name=card.querySelector('b')?.textContent?.trim();
  const o=state.officers.find(x=>x.name===name&&x.force==='日向軍');
  if(!o||card.querySelector('.v2416-roster-meta'))return;
  const meta=document.createElement('div');meta.className='v2416-roster-meta';
  meta.innerHTML=`<span class="troop-badge type-${typeOf(o)}">${TYPE_INFO[typeOf(o)]?.icon||'歩'} ${typeOf(o)}</span><span class="loyalty-badge">忠誠 ${Number.isFinite(Number(o.loy))?o.loy:'―'}</span>${o.status&&o.status!=='一般'?`<span class="status-badge">${o.status}</span>`:''}`;
  const body=card.querySelector('div');if(body)body.appendChild(meta);
  card.title=`${name}　兵科：${typeOf(o)}　忠誠：${o.loy??'―'}\n${TYPE_INFO[typeOf(o)]?.desc||''}`;
 });
}
function decorateBattle(){
 if(!state?.battle)return;
 const b=state.battle;
 document.querySelectorAll('[data-unit]').forEach(el=>{
  const u=b.units.find(x=>x.name===el.dataset.unit&&x.troops>0);if(!u)return;
  if(!el.querySelector('.v2416-unit-type')){
   const badge=document.createElement('span');badge.className=`v2416-unit-type type-${typeOf(u)}`;badge.textContent=TYPE_INFO[typeOf(u)]?.icon||typeOf(u)[0];el.prepend(badge);
  }
  el.title=`${u.name}隊　${typeOf(u)}\n${TYPE_INFO[typeOf(u)]?.desc||''}`;
 });
 const side=document.querySelector('.battle > .panel:last-child');
 if(side&&!side.querySelector('.v2416-type-guide')){
  const guide=document.createElement('div');guide.className='v2416-type-guide';
  guide.innerHTML=`<b>兵科相性</b><br><span>歩兵 → 槍兵 → 騎兵 → 歩兵</span><br><small>有利側は約1.25～1.35倍、不利側は0.78倍。弩兵は遠距離1.20倍・接近戦0.65倍。騎兵は移動3、他兵科は移動2。</small>`;
  const actions=side.querySelector('.battle-actions');if(actions)actions.before(guide);
 }
 const p=b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);
 document.querySelectorAll('[data-cell]').forEach(cell=>{
  cell.onclick=()=>{
   if(b.mode!=='move'||!p||p.done)return;
   const [nx,ny]=cell.dataset.cell.split(',').map(Number),d=dist(p,{x:nx,y:ny}),range=moveRange(p);
   const occ=b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny);
   if(d<=range&&!occ){
    p.x=nx;p.y=ny;p.done=true;p.moveRangeBonus=0;b.mode=null;
    b.logs.unshift(`${p.name}隊（${typeOf(p)}）が${d}マス移動。`);afterPlayerAction();
   }
  };
 });
}

window.battleAction=function(a){
 const b=state.battle,p=b?.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);
 if(!b)return;
 if(a==='move'&&p&&!p.done){
  b.mode='move';b.logs.unshift(`${typeOf(p)}の移動先を選択（最大${moveRange(p)}マス）。`);return render();
 }
 if(a!=='attack')return oldBattleAction(a);
 if(!p||p.done)return;
 const range=typeOf(p)==='弩兵'?3:1;
 const targets=b.units.filter(e=>e.side==='enemy'&&e.troops>0&&dist(p,e)<=range);
 if(!targets.length){b.logs.unshift('射程内に敵なし。');return render()}
 const t=targets.sort((x,y)=>x.troops-y.troops)[0],distance=dist(p,t);
 const calc=rawDamage(p,t,120,2.4,0,.035,distance),dmg=deal(t,calc.dmg);
 b.logs.unshift(`${p.name}隊（${typeOf(p)}）が${t.name}隊（${typeOf(t)}）へ${dmg}損害。${relationText(calc.relation)}`);
 p.done=true;afterPlayerAction();
};

window.enemyPhase=function(){
 const b=state.battle;b.phase='enemy';render();setTimeout(()=>{
  const es=alive('enemy');
  for(const e of es){
   if(e.skipTurns>0){e.skipTurns--;b.logs.unshift(`${e.name}隊は幻惑され、行動できない。`);continue}
   let ps=alive('player');if(!ps.length)break;
   let t=ps.sort((a,c)=>dist(e,a)-dist(e,c)||a.troops-c.troops)[0];
   const range=typeOf(e)==='弩兵'?3:1,d=dist(e,t);
   if(d<=range){
    const calc=rawDamage(e,t,100,2.1,0,.03,d),dmg=deal(t,calc.dmg);
    b.logs.unshift(`${e.name}隊（${typeOf(e)}）が${t.name}隊（${typeOf(t)}）へ${dmg}損害。${relationText(calc.relation)}`);
   }else if(e.immobileTurns>0){
    e.immobileTurns--;b.logs.unshift(`${e.name}隊は連環に阻まれ、移動できない。`);
   }else{
    let steps=TYPE_INFO[typeOf(e)]?.move||2;
    while(steps-->0){
     ps=alive('player');if(!ps.length)break;
     t=ps.sort((a,c)=>dist(e,a)-dist(e,c))[0];
     if(dist(e,t)<=range)break;
     const dx=Math.sign(t.x-e.x),dy=Math.sign(t.y-e.y);
     const options=Math.abs(t.x-e.x)>=Math.abs(t.y-e.y)?[[e.x+dx,e.y],[e.x,e.y+dy]]:[[e.x,e.y+dy],[e.x+dx,e.y]];
     const next=options.find(([nx,ny])=>nx>=0&&nx<9&&ny>=0&&ny<7&&!b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny));
     if(!next)break;e.x=next[0];e.y=next[1];
    }
   }
   if(e.weakenTurns>0)e.weakenTurns--;
  }
  if(b.playerGuardTurns>0)b.playerGuardTurns--;
  if(checkBattleEnd())return;
  b.units.filter(u=>u.side==='player').forEach(u=>u.done=false);b.phase='player';b.day++;render();
 },550)
};

window.render=function(){
 const result=oldRender();
 setTimeout(()=>{if(state?.battle)decorateBattle();else decorateRoster()},0);
 return result;
};

const style=document.createElement('style');style.textContent=`
.v2416-roster-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;font-size:10px}
.troop-badge,.loyalty-badge,.status-badge{display:inline-flex;align-items:center;padding:2px 6px;border:1px solid #705a38;border-radius:999px;background:#21190f;color:#e4d3ad;white-space:nowrap}
.loyalty-badge{border-color:#6d5e8e;color:#d8cbff}.status-badge{border-color:#55745a;color:#c9e5ca}
.type-歩兵{border-color:#777!important;color:#ddd!important}.type-槍兵{border-color:#4d7d9a!important;color:#bde6ff!important}.type-騎兵{border-color:#9b673b!important;color:#ffd0a4!important}.type-弩兵{border-color:#89713c!important;color:#ffe08b!important}
.v2416-unit-type{display:inline-flex;justify-content:center;align-items:center;width:18px;height:18px;margin-right:3px;border:1px solid;border-radius:50%;background:#17110c;font-size:10px;font-weight:900;vertical-align:middle}
.v2416-type-guide{margin:9px 0;padding:9px 10px;border:1px solid #755c30;background:#1b150d;color:#e5d3aa;line-height:1.45;font-size:12px}
.v2416-type-guide span{color:#ffd779;font-weight:800}.v2416-type-guide small{color:#c8b994}
`;
document.head.appendChild(style);
})();
