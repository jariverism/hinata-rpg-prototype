// 日向三國志 ROGUE Prototype 0.11 — clone command, shared adviser forecast, mobile fixes
(()=>{
if(window.HINATA_ROGUE_FIX_V11)return;window.HINATA_ROGUE_FIX_V11=true;
const HIRE=window.HINATA_ROGUE_HIRE_V9_API||{};
const SPECIAL=window.HINATA_ROGUE_SPECIAL_V10_API||{};
const BASE=window.HINATA_CANONICAL_STATS||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function traitId(x){return typeof x==='string'?x:x?.id}
function hasTrait(o,id){return typeof SPECIAL.hasTrait==='function'?SPECIAL.hasTrait(o,id):(o?.rogueTraits||[]).some(x=>traitId(x)===id)}
function isHinata(name){return typeof HIRE.isHinata==='function'?HIRE.isHinata(name):!!BASE[name]}
function candidatePool(){return typeof HIRE.candidatePool==='function'?HIRE.candidatePool(state):[]}
function successChance(actor,target){
 if(typeof HIRE.successChance==='function')return HIRE.successChance(actor,target);
 if(hasTrait(actor,'recruit100'))return 100;
 return clamp(Math.round(15+(Number(actor?.cha)||0)*.45+(100-(Number(target?.loy)||0))*.45-(target?.force==='在野'?0:20)),5,99);
}
function rollRecruit(chance,rng=Math.random){return typeof HIRE.rollRecruit==='function'?HIRE.rollRecruit(chance,rng):(()=>{const p=clamp(Math.round(chance),0,100),roll=Math.floor(rng()*100)+1;return{chance:p,roll,ok:roll<=p}})()}
function sharedAdvice(result,target){
 const subject=`${target.name}の${isHinata(target.name)?'登用':'調略'}`;
 if(typeof window.v241Advice==='function')return window.v241Advice(!!result.ok,subject);
 return {a:null,text:'軍師から助言を得られません。'};
}
function adviceHtml(ad){return typeof window.v241AdviceHtml==='function'?window.v241AdviceHtml(ad):`<p>${ad?.text||'軍師から助言を得られません。'}</p>`}
function applyAdviceFaces(){document.querySelectorAll('[data-v241-face]').forEach(el=>typeof window.v241ApplyFace==='function'&&window.v241ApplyFace(el,el.dataset.v241Face))}
function playerHinata(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&isHinata(o.name)&&!['死亡','捕虜'].includes(o.status))}
function statLabel(k){return{lead:'統率',war:'武力',int:'知力',pol:'政治',cha:'魅力'}[k]||k}
function strongestStat(o){return window.HINATA_ROGUE_RULES?.strongestStat?.(o)||['lead','war','int','pol','cha'].sort((a,b)=>(Number(o?.[b])||0)-(Number(o?.[a])||0))[0]||'war'}
function gearFor(o){return window.HINATA_ROGUE_RULES?.gearFor?.(o)||{name:`${o.name}の佩`,stat:strongestStat(o),amount:6,desc:'能力＋6'}}
function finishReward(){if(state?.rogue)state.rogue.rewardOpen=false;closeModal();render();setTimeout(()=>{try{window.pumpRewards?.()}catch(e){}},80)}
function chooseMember(title,cb){
 const xs=playerHinata();showModal(`<h2>${title}</h2><div class="choice-list">${xs.map(o=>`<button data-v11-member="${o.name}"><b>${o.name}</b> 統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}${o.rogueEquip?`<br><small>装備：${o.rogueEquip.name}</small>`:''}</button>`).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v11-member]').forEach(b=>b.onclick=()=>{const o=xs.find(x=>x.name===b.dataset.v11Member);if(o)cb(o)});
}
function showConversion(snap){
 if(state?.rogue)state.rogue.rewardOpen=true;const gear=gearFor(snap),k=strongestStat(snap);
 showModal(`<h2>登用成功：${snap.name}</h2><p>${snap.name}はROGUEでは恒久配下にせず、戦力へ変換します。</p><div class="rogue-choice-grid"><button id="v11Equip"><b>装備化：${gear.name}</b><small>${gear.desc}。日向坂メンバー1人が装備。</small></button><button id="v11Material"><b>強化素材化：${statLabel(k)}の結晶</b><small>日向坂メンバー1人の${statLabel(k)}＋4。このラン中は永続。</small></button></div>`);
 modalCard.querySelector('#v11Equip').onclick=()=>chooseMember(`${gear.name}を誰に装備する？`,target=>{
  if(target.rogueEquip){const old=target.rogueEquip;target[old.stat]=Math.max(1,(Number(target[old.stat])||0)-Number(old.amount||0))}
  target[gear.stat]=(Number(target[gear.stat])||0)+Number(gear.amount||0);target.rogueEquip={...gear,source:snap.name};state.rogue.items=state.rogue.items||[];state.rogue.items.push(`${target.name}：${gear.name}`);log(`${snap.name}を装備「${gear.name}」へ変換し、${target.name}が装備。`);finishReward();
 });
 modalCard.querySelector('#v11Material').onclick=()=>chooseMember(`${snap.name}の力を誰に継承する？`,target=>{
  target[k]=(Number(target[k])||0)+4;log(`${snap.name}を${statLabel(k)}の強化素材として消費。${target.name}の${statLabel(k)}＋4。`);finishReward();
 });
}
function retireHistorical(t){
 const snap={name:t.name,lead:t.lead,war:t.war,int:t.int,pol:t.pol,cha:t.cha};
 t.force='退場';t.status='戦利品';t.city='';t.loy=0;if(state?.rogue)state.rogue.converted=(Number(state.rogue.converted)||0)+1;log(`${t.name}は調略成功後、日向軍の恒久配下にはならず戦利品となった。`);showConversion(snap);
}
function rogueHireV11(actor){
 const ts=candidatePool();if(!ts.length)return alert('登用・調略できる武将がいません。');
 showModal(`<h2>登用・調略</h2><p><small>候補を選ぶと、伏毒・外交と同じ軍師助言が表示されます。軍師の知力が助言の正確さです。</small></p><div class="choice-list v11-hire-list">${ts.slice(0,80).map(t=>`<button data-v11-hire="${t.name}"><b>${t.name}</b>　${isHinata(t.name)?'日向坂→加入':'歴史武将→戦利品化'}<br><small>${t.force}・${t.city||'所在不明'}　忠${t.loy}</small></button>`).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v11-hire]').forEach(btn=>btn.onclick=()=>{
  const t=(state.officers||[]).find(x=>x.name===btn.dataset.v11Hire);if(!t)return;
  const result=rollRecruit(successChance(actor,t)),ad=sharedAdvice(result,t),cost=180;
  showModal(`<h2>${t.name}を${isHinata(t.name)?'登用':'調略'}</h2>${adviceHtml(ad)}<div class="v11-target-card"><b>${t.name}</b>　${t.force}<br><small>所在${t.city||'不明'}　忠誠${t.loy}　実行武将 ${actor.name}　必要金${cost}</small></div><p><small>成否はすでに内部で判定済みです。軍師は知力％の確率で、その成否を正しく見抜きます。</small></p><button id="v11-hire-go" class="primary">${isHinata(t.name)?'登用':'調略'}を実行</button><button data-close>中止</button>`);
  applyAdviceFaces();
  modalCard.querySelector('#v11-hire-go').onclick=()=>{
   const c=cityObj();if(Number(c.gold)<cost)return alert('金不足');c.gold-=cost;actor.acted=state.turn;closeModal();
   if(result.ok){
    if(isHinata(t.name)){t.force='日向軍';t.city=state.selected;t.status='一般';t.loy=72;log(`${actor.name}が${t.name}の登用に成功しました。`);render()}
    else{log(`${actor.name}が${t.name}の調略に成功しました。`);retireHistorical(t)}
   }else{log(`${actor.name}の${t.name}への${isHinata(t.name)?'登用':'調略'}は失敗しました。`);render()}
  };
 });
}

// v10 created clones automatically after battle start. v11 makes clone an explicit once-per-battle command instead.
function stripAutomaticClones(b){
 if(!b)return 0;const before=(b.units||[]).length;b.units=(b.units||[]).filter(u=>!u.v10Clone&&!u.v11Clone);b.rogueV11CloneUsed={};
 if(Array.isArray(b.logs))b.logs=b.logs.filter(x=>!String(x).includes('秘伝「分身」発動。'));
 return before-b.units.length;
}
function battleOfficer(u){const name=u?.rogueCloneOf||u?.name;return (state?.officers||[]).find(o=>o.name===name&&o.force==='日向軍')||null}
function terrainAt(b,x,y){try{return b?.v2439LargeSiege?window.V2439?.terrainAt?.(b,x,y):window.V2432?.terrainAt?.(b,x,y)}catch(e){return'plain'}}
function freeCloneCell(b,u){
 const W=b?.v2439LargeSiege?15:9,H=b?.v2439LargeSiege?13:7;
 for(let d=1;d<=5;d++)for(const [dx,dy] of [[d,0],[-d,0],[0,d],[0,-d],[d,1],[d,-1],[-d,1],[-d,-1]]){
  const x=Number(u.x)+dx,y=Number(u.y)+dy;if(x<0||y<0||x>=W||y>=H)continue;
  if((b.units||[]).some(z=>Number(z.troops)>0&&Number(z.x)===x&&Number(z.y)===y))continue;
  const t=terrainAt(b,x,y);if(['water','mountain'].includes(t))continue;return{x,y};
 }
 return null;
}
function spawnClone(b,u){
 if(!b||!u||u.v10Clone||u.v11Clone)return null;const o=battleOfficer(u);if(!o||!hasTrait(o,'clone'))return null;
 b.rogueV11CloneUsed=b.rogueV11CloneUsed||{};if(b.rogueV11CloneUsed[o.name])return null;const pos=freeCloneCell(b,u);if(!pos)return null;
 const troops=Math.max(100,Math.floor((Number(u.troops)||0)*.45)),name=`${o.name}・分身`;
 const clone={...u,name,troops,max:troops,x:pos.x,y:pos.y,done:false,movedThisTurn:false,movedDistance:0,rogueCloneOf:o.name,v10Clone:true,v11Clone:true,rogueV10AttackBonus:false};
 b.units.push(clone);b.rogueV11CloneUsed[o.name]=1;b.logs?.unshift?.(`秘伝「分身」発動。${o.name}が分身隊（兵${troops.toLocaleString()}）を呼び出した。分身隊も個別に行動できる。`);return clone;
}
function selectedPlayer(b){return (b?.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0)||null}
function decorateCloneButton(){
 const b=state?.battle;if(!b||b.phase!=='player'||b.v2439DeploymentActive||b.v2434DeploymentActive)return;const u=selectedPlayer(b),o=battleOfficer(u),actions=document.querySelector('.battle-actions');if(!u||!o||!actions||u.v10Clone||u.v11Clone||!hasTrait(o,'clone'))return;
 b.rogueV11CloneUsed=b.rogueV11CloneUsed||{};if(b.rogueV11CloneUsed[o.name])return;if(actions.querySelector('[data-v11-clone]'))return;
 const btn=document.createElement('button');btn.dataset.v11Clone='1';btn.textContent='分身';btn.title='秘伝「分身」：1戦1回、現在兵力45%の分身隊を生成する';btn.onclick=()=>{const c=spawnClone(b,u);if(!c)return alert('分身を出現させる空きマスがありません。');b.selected=c.name;window.render()};actions.appendChild(btn);
}
const prevBeginBattle=window.beginBattle;
if(typeof prevBeginBattle==='function')window.beginBattle=function(){const r=prevBeginBattle.apply(this,arguments);if(state?.rogue&&state?.battle){stripAutomaticClones(state.battle);setTimeout(()=>{try{window.render()}catch(e){}},0)}return r};

function mark(){const s=document.querySelector('header h1 small');if(s)s.textContent='Prototype 0.11';const b=document.getElementById('rogueStatEngineBadge');if(b)b.textContent='能力Engine v8 / 共通助言・秘伝 v11'}
window.HINATA_ROGUE_FIX_V11_API={successChance,rollRecruit,sharedAdvice,stripAutomaticClones,spawnClone,freeCloneCell};
if(typeof document==='undefined')return;
window.hire=rogueHireV11;
const prevRender=window.render;
window.render=function(){const r=prevRender.apply(this,arguments);try{decorateCloneButton();mark();setTimeout(()=>{decorateCloneButton();mark()},160)}catch(e){console.error('ROGUE v11:',e)}return r};
setTimeout(()=>{try{decorateCloneButton();mark()}catch(e){}},180);
const style=document.createElement('style');style.textContent='.v11-target-card{margin:10px 0;padding:10px;border:1px solid #725c86;background:#18121f;line-height:1.5}.v11-hire-list small{color:#c9b894}[data-v11-clone]{border-color:#9b7bd1;background:linear-gradient(#5f487e,#332642);color:#f4e5ff}';document.head.appendChild(style);
})();
