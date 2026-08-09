// v24.70 — battle spirit gauge and Mikuni's restored finisher
(()=>{
if(window.V2470_SPIRIT)return;window.V2470_SPIRIT=true;
const V39=window.V2439||{},V68=window.V2468||{};
const SKILLS=window.V246_SKILLS=window.V246_SKILLS||{};
SKILLS['髙橋未来虹']={name:'大将の器',desc:'味方全軍の士気を10上げ、この自軍ターン中の攻撃力を15%上昇。',kind:'all'};
const COST=70,MAX=100;
const previousBattleAction=window.battleAction;
const previousAfterPlayerAction=window.afterPlayerAction;
const previousRender=window.render;
const previousNormalDamage=typeof V39.normalDamage==='function'?V39.normalDamage:null;
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function isLarge(b){return !!b?.v2439LargeSiege&&!!b?.v2439DeploymentDone}
function living(b,side){return (b?.units||[]).filter(u=>!u.v2436Structure&&!u.v2468Routed&&u.side===side&&Number(u.troops)>0)}
function current(b=state?.battle){return (b?.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0&&!u.v2468Routed)||living(b,'player').find(u=>!u.done)||null}
function skillOf(u){return u?SKILLS[u.name]||null:null}
function ensureUnit(b,u){
 if(!u||u.v2436Structure)return;
 if(!Number.isFinite(Number(u.v2470Spirit)))u.v2470Spirit=clamp(45+(b.v2436Commanders?.[u.side]===u.name?5:0),0,MAX);
}
function ensure(b){
 if(!isLarge(b))return false;
 b.v2470Troops=b.v2470Troops||{};b.v2470Objectives=b.v2470Objectives||{};b.v2470Routed=b.v2470Routed||{};
 for(const u of b.units||[]){ensureUnit(b,u);if(!Number.isFinite(Number(b.v2470Troops[u.name])))b.v2470Troops[u.name]=Number(u.troops)||0;if(b.v2470Routed[u.name]==null)b.v2470Routed[u.name]=!!u.v2468Routed}
 for(const o of b.v2468Objectives||[])if(b.v2470Objectives[o.id]==null)b.v2470Objectives[o.id]=o.owner;
 return true;
}
function gain(u,n,reason=''){
 if(!u||u.side!=='player'||u.v2468Routed||Number(u.troops)<=0)return 0;
 const before=Number(u.v2470Spirit)||0;u.v2470Spirit=clamp(before+Math.max(0,Math.round(n)),0,MAX);
 return u.v2470Spirit-before;
}
function syncEvents(b,actorName=null){
 if(!ensure(b))return;
 const actor=actorName?(b.units||[]).find(u=>u.side==='player'&&u.name===actorName&&Number(u.troops)>0):null;
 for(const u of b.units||[]){
  if(u.v2436Structure)continue;ensureUnit(b,u);
  const prev=Number(b.v2470Troops[u.name]);const cur=Number(u.troops)||0;
  if(Number.isFinite(prev)&&cur<prev){
   const loss=prev-cur;
   if(u.side==='enemy'&&actor){gain(actor,8+Math.min(12,loss/120),'敵へ損害')}
   if(u.side==='player'&&cur>0){gain(u,4+Math.min(8,loss/180),'被弾')}
  }
  const routed=!!u.v2468Routed;if(routed&&!b.v2470Routed[u.name]&&u.side==='enemy'){
   if(actor)gain(actor,15,'敵潰走');for(const a of living(b,'player'))if(a!==actor)gain(a,3,'敵潰走');
  }
  b.v2470Troops[u.name]=cur;b.v2470Routed[u.name]=routed;
 }
 for(const o of b.v2468Objectives||[]){
  const old=b.v2470Objectives[o.id];if(old!==o.owner&&o.owner==='player'){
   const captor=living(b,'player').find(u=>Number(u.x)===Number(o.x)&&Number(u.y)===Number(o.y));if(captor)gain(captor,18,`${o.name}制圧`);for(const a of living(b,'player'))if(a!==captor)gain(a,4,`${o.name}制圧`);
  }
  b.v2470Objectives[o.id]=o.owner;
 }
}
function syncSpecialSpend(b){
 const name=b?.v2470PendingSpecial;if(!name)return;
 const p=(b.units||[]).find(u=>u.side==='player'&&u.name===name);
 if(p?.specialUsed){p.v2470Spirit=clamp((Number(p.v2470Spirit)||0)-COST,0,MAX);p.v2470SpiritSpent=true;delete b.v2470PendingSpecial}
}
function mikuniSkill(p){
 const b=state?.battle;if(!b||!p||p.name!=='髙橋未来虹'||p.done||p.specialUsed)return false;
 if((Number(p.v2470Spirit)||0)<COST)return alert(`戦意が不足しています（${Math.round(Number(p.v2470Spirit)||0)}/${COST}）。`);
 p.v2470Spirit=clamp((Number(p.v2470Spirit)||0)-COST,0,MAX);p.v2470SpiritSpent=true;p.specialUsed=true;p.done=true;
 for(const u of living(b,'player')){u.morale=clamp((Number(u.morale)||60)+10,0,100);gain(u,3,'大将の器')}
 b.v2470MikuniAuraDay=Number(b.day)||1;b.logs=b.logs||[];b.logs.unshift('髙橋未来虹隊・大将の器！ 全軍士気＋10、この自軍ターン中は攻撃力＋15%。');
 if(typeof window.checkBattleEnd==='function'&&window.checkBattleEnd())return true;
 if(typeof window.afterPlayerAction==='function')window.afterPlayerAction();else window.render();return true;
}
if(previousNormalDamage){
 V39.normalDamage=function(attacker,target,b){const r=previousNormalDamage.apply(this,arguments)||{damage:1,notes:[]};if(attacker?.side==='player'&&Number(b?.v2470MikuniAuraDay)===Number(b?.day)){r.damage=Math.max(1,Math.floor(Number(r.damage||1)*1.15));r.notes=[...(r.notes||[]),'大将の器']}return r};
}
window.battleAction=function(action){
 const b=state?.battle;if(!b||!isLarge(b))return previousBattleAction.apply(this,arguments);
 ensure(b);syncSpecialSpend(b);
 if(action!=='special'){delete b.v2470PendingSpecial;return previousBattleAction.apply(this,arguments)}
 const p=current(b),skill=skillOf(p);if(!p||!skill)return previousBattleAction.apply(this,arguments);
 if(p.done||p.specialUsed)return alert(`${p.name}は必殺技を使用できません。`);
 if((Number(p.v2470Spirit)||0)<COST)return alert(`戦意が不足しています（${Math.round(Number(p.v2470Spirit)||0)}/${COST}）。敵への大損害・拠点制圧・敵潰走などで戦意が上がります。`);
 if(p.name==='髙橋未来虹')return mikuniSkill(p);
 b.v2470PendingSpecial=p.name;return previousBattleAction.apply(this,arguments);
};
window.afterPlayerAction=function(){const b=state?.battle;if(b&&isLarge(b)){syncSpecialSpend(b);syncEvents(b,b.selected)}return previousAfterPlayerAction.apply(this,arguments)};
function decorate(){
 const b=state?.battle;if(!b||!isLarge(b))return;ensure(b);syncSpecialSpend(b);syncEvents(b,null);
 const p=current(b);if(!p)return;const actions=document.querySelector('.battle-actions');if(!actions)return;
 let box=actions.parentElement?.querySelector('.v2470-spirit');if(!box&&actions.parentElement){box=document.createElement('div');box.className='v2470-spirit';actions.parentElement.insertBefore(box,actions)}
 const s=Math.round(Number(p.v2470Spirit)||0),ready=s>=COST;box.innerHTML=`<b>戦意 ${s}/${MAX}</b><span>${ready?'必殺技発動可能':`必殺技まであと${COST-s}`}</span><div><i style="width:${s}%"></i></div>`;
 const skill=skillOf(p),btn=actions.querySelector('[data-ba="special"]');if(skill&&btn){btn.disabled=!!p.done||!!p.specialUsed||!ready;btn.textContent=`必殺技・${skill.name}${!ready?`（戦意${s}/${COST}）`:''}`;btn.title=`戦意${COST}以上で使用可能。一戦1回。現在${s}`}
}
window.render=function(){const b=state?.battle;if(b&&isLarge(b)){ensure(b);syncSpecialSpend(b);syncEvents(b,null)}const r=previousRender.apply(this,arguments);setTimeout(decorate,320);setTimeout(decorate,520);return r};
const style=document.createElement('style');style.textContent=`.v2470-spirit{margin:8px 0;padding:8px 10px;border:1px solid #8e6c2f;background:#1d160b;color:#e8d29c;font-size:11px}.v2470-spirit{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}.v2470-spirit b{color:#ffe19a}.v2470-spirit span{font-size:10px;color:#c8b68d}.v2470-spirit div{grid-column:1/-1;height:6px;border:1px solid #594726;background:#0d0a06}.v2470-spirit i{display:block;height:100%;background:linear-gradient(90deg,#7e5420,#e6b64a)}`;document.head.appendChild(style);
window.V2470={COST,MAX,ensure,gain,syncEvents,mikuniSkill,skillOf};
})();
