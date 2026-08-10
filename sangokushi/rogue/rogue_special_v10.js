// 日向三國志 ROGUE Prototype 0.10 — captured-officer secret arts / special abilities
(()=>{
if(window.HINATA_ROGUE_SPECIAL_V10)return;window.HINATA_ROGUE_SPECIAL_V10=true;
const TRAITS={
 double_attack:{id:'double_attack',name:'連撃',desc:'通常攻撃後、各自軍フェイズ1回だけもう一度通常攻撃できる。'},
 double_move:{id:'double_move',name:'神速',desc:'各自軍フェイズ1回、移動後に「再移動」できる。'},
 double_domestic:{id:'double_domestic',name:'能吏',desc:'農業・商業・治水・巡察・徴兵・訓練・捜索・褒賞を1か月に2回行動できる。'},
 clone:{id:'clone',name:'分身',desc:'各戦闘で本人の兵力45%の分身部隊が1隊出現する。'},
 recruit100:{id:'recruit100',name:'百発登用',desc:'この武将が行う登用・調略の成功率が100%になる。'},
 inspire:{id:'inspire',name:'鼓舞',desc:'この武将が出陣すると、戦闘開始時の味方全軍士気が8上がる。'},
 reinforcement:{id:'reinforcement',name:'援軍',desc:'この武将が出陣すると、その部隊の兵力が戦闘開始時に30%増える。'},
 guard:{id:'guard',name:'守護',desc:'この武将が出陣すると、最初の敵軍フェイズまで味方全軍の被害を30%軽減する。'}
};
const POOL=['double_attack','double_move','double_domestic','clone','recruit100','inspire','reinforcement','guard'];
const FAMOUS={
 '曹操':'double_domestic','関羽':'double_attack','呂布':'double_attack','諸葛亮':'recruit100','周瑜':'clone','趙雲':'double_move',
 '司馬懿':'recruit100','張遼':'double_move','孫策':'inspire','馬超':'double_move','許褚':'guard','典韋':'reinforcement'
};
const DOMESTIC=new Set(['farm','commerce','flood','patrol','recruit','train','search','reward']);
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function traitForSource(name){const id=FAMOUS[name]||POOL[hash(name)%POOL.length];return TRAITS[id]}
function traitId(x){return typeof x==='string'?x:x?.id}
function hasTrait(o,id){return (o?.rogueTraits||[]).some(x=>traitId(x)===id)}
function own(){const base=window.HINATA_CANONICAL_STATS||{};return (state?.officers||[]).filter(o=>o.force==='日向軍'&&base[o.name]&&!['死亡','捕虜'].includes(o.status))}
function officer(name){return own().find(o=>o.name===name)||null}
function addTrait(o,t,source){if(!o||!t||hasTrait(o,t.id))return false;o.rogueTraits=Array.isArray(o.rogueTraits)?o.rogueTraits:[];o.rogueTraits.push({id:t.id,name:t.name,desc:t.desc,source});return true}
function finishTraitReward(){if(state?.rogue)state.rogue.rewardOpen=false;closeModal();render();setTimeout(()=>{try{window.pumpRewards?.()}catch(e){}},90)}
function chooseTraitTarget(source,t){
 const xs=own();showModal(`<h2>秘伝「${t.name}」を誰に継承する？</h2><p><small>${t.desc}</small></p><div class="choice-list v10-trait-targets">${xs.map(o=>`<button data-v10-trait-target="${o.name}" ${hasTrait(o,t.id)?'disabled':''}><b>${o.name}</b>${hasTrait(o,t.id)?'　【取得済み】':''}<br><small>${(o.rogueTraits||[]).map(x=>x.name||TRAITS[traitId(x)]?.name).filter(Boolean).join('・')||'秘伝なし'}</small></button>`).join('')}</div><button data-close>戻る</button>`);
 modalCard.querySelectorAll('[data-v10-trait-target]').forEach(btn=>btn.onclick=()=>{const o=officer(btn.dataset.v10TraitTarget);if(!o||!addTrait(o,t,source))return;log(`${source}の秘伝「${t.name}」を${o.name}が継承した。`);finishTraitReward()});
}
function injectSecretChoice(html){
 const m=String(html||'').match(/<h2>(?:捕縛|登用成功)：([^<]+)<\/h2>/);if(!m)return;
 const source=m[1].trim(),grid=modalCard?.querySelector?.('.rogue-choice-grid');if(!grid||grid.querySelector('.v10-secret-choice'))return;
 const t=traitForSource(source),allHave=own().length>0&&own().every(o=>hasTrait(o,t.id)),btn=document.createElement('button');btn.className='v10-secret-choice';btn.disabled=allHave;btn.innerHTML=`<b>秘伝化：${t.name}</b><small>${t.desc}${allHave?'（全員取得済み）':''}</small>`;btn.onclick=()=>chooseTraitTarget(source,t);grid.appendChild(btn);
}
const prevShowModal=window.showModal;
if(typeof prevShowModal==='function')window.showModal=function(html){const r=prevShowModal.apply(this,arguments);try{injectSecretChoice(html)}catch(e){console.error('ROGUE v10 secret choice:',e)}return r};

// Strategic double-action tracking.
document.addEventListener('click',e=>{
 if(!state?.rogue||state.battle)return;
 const cmd=e.target.closest?.('[data-cmd]');if(cmd){state.rogue.v10PendingCommand=cmd.dataset.cmd;return}
 const actor=e.target.closest?.('[data-actor]');if(actor&&state.rogue.v10PendingCommand){state.rogue.v10PendingDomestic={cmd:state.rogue.v10PendingCommand,name:actor.dataset.actor,turn:state.turn};return}
 if(e.target.closest?.('[data-close]')&&state.rogue.v10PendingDomestic){delete state.rogue.v10PendingDomestic;delete state.rogue.v10PendingCommand}
},true);
function applyDomesticRefresh(){
 const r=state?.rogue,p=r?.v10PendingDomestic;if(!p||state.battle)return;
 const o=(state.officers||[]).find(x=>x.name===p.name&&x.force==='日向軍');
 if(!o||Number(p.turn)!==Number(state.turn)||!DOMESTIC.has(p.cmd)){delete r.v10PendingDomestic;delete r.v10PendingCommand;return}
 if(o.acted!==state.turn)return;
 r.v10DomesticUsed=r.v10DomesticUsed||{};const k=`${state.turn}|${o.name}`;
 if(hasTrait(o,'double_domestic')&&!r.v10DomesticUsed[k]){r.v10DomesticUsed[k]=1;o.acted=0;state.logs?.unshift?.(`【${state.year}年${state.month}月】秘伝「能吏」発動。${o.name}はもう一度内政行動できる。`)}
 delete r.v10PendingDomestic;delete r.v10PendingCommand;
}

function battleOfficerForUnit(u){if(!u)return null;const name=u.rogueCloneOf||u.name;return (state?.officers||[]).find(o=>o.name===name&&o.force==='日向軍')||null}
function phaseKey(b,u){return `${Number(b?.day)||1}|${u?.rogueCloneOf||u?.name}`}
function currentPlayerUnit(b){return (b?.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0)||null}
function terrainOkay(b,x,y){
 if(x<0||y<0)return false;const W=b?.v2439LargeSiege?15:9,H=b?.v2439LargeSiege?13:7;if(x>=W||y>=H)return false;
 if((b.units||[]).some(u=>Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y))return false;
 try{const t=b?.v2439LargeSiege?window.V2439?.terrainAt?.(b,x,y):window.V2432?.terrainAt?.(b,x,y);if(['water','mountain'].includes(t))return false}catch(e){}
 return true;
}
function freeNear(b,u){for(let d=1;d<=4;d++)for(const [dx,dy] of [[d,0],[-d,0],[0,d],[0,-d],[d,1],[d,-1],[-d,1],[-d,-1]]){const x=Number(u.x)+dx,y=Number(u.y)+dy;if(terrainOkay(b,x,y))return{x,y}}return null}
function applyBattleStartTraits(b){
 if(!b||b.rogueV10TraitsApplied)return;b.rogueV10TraitsApplied=true;b.rogueV10MoveUsed=b.rogueV10MoveUsed||{};b.rogueV10AttackUsed=b.rogueV10AttackUsed||{};
 const baseUnits=(b.units||[]).filter(u=>u.side==='player'&&!u.v2436Structure&&!u.v10Clone&&Number(u.troops)>0);
 for(const u of baseUnits){const o=battleOfficerForUnit(u);if(!o)continue;
  if(hasTrait(o,'reinforcement')){const add=Math.max(1,Math.floor((Number(u.troops)||0)*.30));u.troops+=add;u.max=(Number(u.max)||Number(u.troops)-add)+add;b.logs?.unshift?.(`秘伝「援軍」発動。${o.name}隊に${add.toLocaleString()}の増援。`)}
 }
 let inspireCount=0,guard=false;
 for(const u of baseUnits){const o=battleOfficerForUnit(u);if(!o)continue;if(hasTrait(o,'inspire'))inspireCount++;if(hasTrait(o,'guard'))guard=true}
 if(inspireCount){const plus=Math.min(24,inspireCount*8);for(const u of (b.units||[]).filter(x=>x.side==='player'&&Number(x.troops)>0))u.morale=Math.min(100,(Number(u.morale)||60)+plus);b.logs?.unshift?.(`秘伝「鼓舞」発動。味方全軍の士気＋${plus}。`)}
 if(guard){b.playerGuardTurns=Math.max(Number(b.playerGuardTurns)||0,1);b.logs?.unshift?.('秘伝「守護」発動。最初の敵軍フェイズまで味方全軍の被害を30%軽減。')}
 for(const u of [...baseUnits]){const o=battleOfficerForUnit(u);if(!o||!hasTrait(o,'clone'))continue;const pos=freeNear(b,u);if(!pos)continue;const troops=Math.max(100,Math.floor((Number(u.troops)||0)*.45)),name=`${o.name}・分身`;if((b.units||[]).some(x=>x.name===name))continue;b.units.push({...u,name,troops,max:troops,x:pos.x,y:pos.y,done:false,movedThisTurn:false,movedDistance:0,rogueCloneOf:o.name,v10Clone:true});b.logs?.unshift?.(`秘伝「分身」発動。${o.name}の分身隊（兵${troops.toLocaleString()}）が出現。`)}
}
const prevBeginBattle=window.beginBattle;
if(typeof prevBeginBattle==='function')window.beginBattle=function(){const r=prevBeginBattle.apply(this,arguments);if(state?.rogue&&state?.battle){applyBattleStartTraits(state.battle);setTimeout(()=>{try{window.render()}catch(e){}},0)}return r};

// Capture battle action intent before the existing battle UI handlers consume the click.
document.addEventListener('click',e=>{
 const b=state?.battle;if(!state?.rogue||!b||b.phase!=='player')return;
 const ba=e.target.closest?.('[data-ba]');if(ba){const u=currentPlayerUnit(b);if(u?.rogueV10AttackBonus&&ba.dataset.ba==='wait')u.rogueV10AttackBonus=false;if(ba.dataset.ba!=='attack')b.rogueV10Intent={kind:'other',name:u?.name};return}
 const cell=e.target.closest?.('[data-cell]');if(!cell)return;const u=currentPlayerUnit(b);if(!u)return;const mode=b.v2440Mode||b.v2432Mode||b.mode;if(mode==='move')b.rogueV10Intent={kind:'move',name:u.name};else if(mode==='attack')b.rogueV10Intent={kind:'attack',name:u.name};
},true);
const prevAfter=window.afterPlayerAction;
if(typeof prevAfter==='function')window.afterPlayerAction=function(){
 const b=state?.battle,intent=b?.rogueV10Intent;delete b?.rogueV10Intent;
 if(state?.rogue&&b&&b.phase==='player'&&intent?.name){const u=(b.units||[]).find(x=>x.name===intent.name&&x.side==='player'&&Number(x.troops)>0),o=battleOfficerForUnit(u);if(u&&o){const k=phaseKey(b,u);
   if(intent.kind==='attack'&&hasTrait(o,'double_attack')){b.rogueV10AttackUsed=b.rogueV10AttackUsed||{};if(!b.rogueV10AttackUsed[k]){b.rogueV10AttackUsed[k]=1;u.done=false;u.rogueV10AttackBonus=true;b.selected=u.name;b.mode='attack';b.v2432Mode='attack';b.logs?.unshift?.(`秘伝「連撃」発動。${o.name}はもう一度通常攻撃できる。`);return window.render()}u.rogueV10AttackBonus=false}
   if(intent.kind==='move'&&hasTrait(o,'double_move')){b.rogueV10MoveUsed=b.rogueV10MoveUsed||{};if(!b.rogueV10MoveUsed[k]){u.done=false;b.selected=u.name;b.logs?.unshift?.(`秘伝「神速」発動可能。${o.name}は「再移動」を選べる。`);return window.render()}}
 }}
 return prevAfter.apply(this,arguments);
};
function decorateBattle(){
 const b=state?.battle;if(!b||b.phase!=='player')return;const u=currentPlayerUnit(b),o=battleOfficerForUnit(u),actions=document.querySelector('.battle-actions');if(!u||!o||!actions)return;
 const k=phaseKey(b,u);if(hasTrait(o,'double_move')&&u.movedThisTurn&&!b.rogueV10MoveUsed?.[k]&&!actions.querySelector('[data-v10-remmove]')){const btn=document.createElement('button');btn.dataset.v10Remmove='1';btn.textContent='再移動';btn.title='秘伝「神速」：この自軍フェイズでもう一度移動する';btn.onclick=()=>{b.rogueV10MoveUsed=b.rogueV10MoveUsed||{};b.rogueV10MoveUsed[k]=1;u.done=false;u.movedThisTurn=false;u.movedDistance=0;b.selected=u.name;b.mode='move';b.v2432Mode='move';b.logs?.unshift?.(`${o.name}が秘伝「神速」で再移動。`);window.render()};actions.querySelector('[data-ba="move"]')?.after(btn)}
 if(u.rogueV10AttackBonus){for(const btn of actions.querySelectorAll('[data-ba]'))if(!['attack','wait','end','retreat'].includes(btn.dataset.ba))btn.disabled=true;let tag=actions.querySelector('.v10-attack-bonus');if(!tag){tag=document.createElement('span');tag.className='v10-attack-bonus';tag.textContent='連撃：追加攻撃';actions.appendChild(tag)}}
}
function decorateCards(){
 if(!state?.rogue||state.battle)return;for(const el of document.querySelectorAll('.officer')){const name=el.querySelector('b')?.textContent?.trim(),o=officer(name);if(!o)continue;el.querySelectorAll('.v10-traits').forEach(x=>x.remove());const ts=(o.rogueTraits||[]).map(x=>typeof x==='string'?TRAITS[x]:x).filter(Boolean);if(!ts.length)continue;const d=document.createElement('div');d.className='v10-traits';d.innerHTML=`秘伝：${ts.map(t=>`<span title="${t.desc||TRAITS[t.id]?.desc||''}">${t.name||TRAITS[t.id]?.name||t.id}</span>`).join(' ')}`;el.querySelector('div')?.appendChild(d)}
}
function mark(){const s=document.querySelector('header h1 small');if(s)s.textContent='Prototype 0.10';const b=document.getElementById('rogueStatEngineBadge');if(b)b.textContent='能力Engine v8 / 登用・秘伝 v10'}
const prevRender=window.render;
window.render=function(){if(state?.rogue&&!state.battle)applyDomesticRefresh();const r=prevRender.apply(this,arguments);try{if(state?.battle)decorateBattle();else decorateCards();mark();setTimeout(()=>{if(state?.battle)decorateBattle();else decorateCards();mark()},80)}catch(e){console.error('ROGUE v10 render:',e)}return r};
setTimeout(()=>{try{if(state?.battle)decorateBattle();else decorateCards();mark()}catch(e){}},0);
window.HINATA_ROGUE_SPECIAL_V10_API={TRAITS,FAMOUS,traitForSource,hasTrait,addTrait,applyBattleStartTraits};
const style=document.createElement('style');style.textContent='.v10-secret-choice small{display:block;margin-top:3px}.v10-traits{margin-top:3px;color:#f1cf7a;font-size:9px;line-height:1.4}.v10-traits span{display:inline-block;margin:1px 3px 1px 0;padding:1px 4px;border:1px solid #836b35;border-radius:5px}.v10-attack-bonus{display:inline-block;padding:3px 6px;color:#ffd978;font-size:10px;font-weight:700}';document.head.appendChild(style);
})();
