// v24.9 — recruitment pacing: local contact, cooldown, counterintelligence and consequences
(()=>{
const HN=new Set((window.HINATA_WORLD||[]).map(x=>x[0]));

function v249Ensure(){
 if(!state)return;
 state.recruitAttempts=state.recruitAttempts||{};
 state.recruitBalanceVersion=19;
}
function v249CooldownLeft(name){
 v249Ensure();
 return Math.max(0,(state.recruitAttempts[name]||0)-state.turn);
}
function v249EnemyIntel(cityName,force){
 const vals=state.officers
  .filter(o=>o.force===force&&o.city===cityName&&o.status!=='捕虜')
  .map(o=>Number(o.int)||50);
 return vals.length?Math.max(...vals):50;
}
function v249EnemyChance(actor,target){
 const loyalty=Number(target.loy)||0;
 const base=100-loyalty;
 const charm=Math.round(((Number(actor.cha)||70)-70)/2);
 const guard=Math.max(0,Math.round((v249EnemyIntel(target.city,target.force)-70)/4));
 const raw=base+charm-guard;
 const cap=loyalty<=25?85:72;
 return {
  chance:Math.max(1,Math.min(cap,Math.round(raw))),
  base,charm,guard,cap
 };
}
function v249WildChance(actor){
 return Math.max(12,Math.min(92,Math.round(28+(Number(actor.cha)||70)*.58)));
}
function v249CandidateList(){
 const adjacent=new Set(neighbors(state.selected));
 return state.officers.filter(t=>{
  if(t.force==='日向軍'||t.status==='君主'||t.status==='捕虜')return false;
  if(HN.has(t.name)&&t.discovered===false)return false;
  if(t.force==='在野')return t.city===state.selected;
  return adjacent.has(t.city)&&state.cities[t.city]?.force===t.force;
 }).sort((a,b)=>{
  const aw=a.force==='在野'?0:1,bw=b.force==='在野'?0:1;
  return aw-bw||(a.city||'').localeCompare(b.city||'','ja')||(a.loy||0)-(b.loy||0);
 });
}

window.hire=function(actor){
 v249Ensure();
 if(cityObj().force!=='日向軍')return alert('自国都市でのみ登用できます。');
 const targets=v249CandidateList();
 if(!targets.length)return alert('この都市または隣接する敵都市に、登用可能な武将はいません。');
 showModal(`<h2>登用</h2>
 <div class="hire-balance-note"><b>登用範囲</b><br>在野武将は現在地、敵将は隣接する敵都市のみ。敵将への再接触には3か月必要です。離間の計で忠誠を下げてから接触すると有利です。</div>
 <p>実行武将：<b>${actor.name}</b>　魅力${actor.cha}</p>
 <div class="choice-list">${targets.map(t=>{
   const enemy=t.force!=='在野';
   const calc=enemy?v249EnemyChance(actor,t):{chance:v249WildChance(actor)};
   const cd=v249CooldownLeft(t.name);
   const disabled=enemy&&cd>0;
   return `<button data-v249-target="${t.name}" ${disabled?'disabled':''}>${typeof v241FaceHtml==='function'?v241FaceHtml(t.name):''}<span><b>${t.name}</b><br>${t.force}・${t.city}${enemy?`　忠誠${t.loy}`:''}<br><strong>成功率 ${calc.chance}%</strong>${disabled?`　再接触まで${cd}か月`:''}</span></button>`;
 }).join('')}</div><button data-close>閉じる</button>`);
 if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
 modalCard.querySelectorAll('[data-v249-target]:not([disabled])').forEach(btn=>btn.onclick=()=>{
   const target=state.officers.find(x=>x.name===btn.dataset.v249Target);
   if(!target)return;
   const enemy=target.force!=='在野';
   const calc=enemy?v249EnemyChance(actor,target):{chance:v249WildChance(actor),base:null,charm:null,guard:null};
   const success=Math.random()*100<calc.chance;
   const advice=typeof v241Advice==='function'?v241Advice(success,`${target.name}の登用`):null;
   const cost=enemy?300:120;
   showModal(`<h2>${target.name}を登用</h2>
    ${advice&&typeof v241AdviceHtml==='function'?v241AdviceHtml(advice):''}
    <p>所属：<b>${target.force}</b>　所在：<b>${target.city}</b>${enemy?`　忠誠：<b>${target.loy}</b>`:''}</p>
    <p>実行武将：<b>${actor.name}</b>　魅力${actor.cha}</p>
    <p>成功率：<b>${calc.chance}%</b></p>
    ${enemy?`<p><small>忠誠基礎 ${calc.base}% ／ 魅力補正 ${calc.charm>=0?'+':''}${calc.charm}% ／ 敵都市警戒 −${calc.guard}% ／ 上限${calc.cap}%</small></p>`:'<p><small>在野武将は実行武将の魅力を中心に判定します。</small></p>'}
    <p>必要金：${cost}</p>
    <button id="v249-go" class="primary">登用を実行</button><button data-close>中止</button>`);
   if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
   modalCard.querySelector('#v249-go').onclick=()=>{
     const home=cityObj();
     if(home.gold<cost)return alert('金が不足しています。');
     home.gold-=cost;
     const oldForce=target.force;
     if(enemy)state.recruitAttempts[target.name]=state.turn+3;
     if(success){
       target.force='日向軍';
       target.city=state.selected;
       target.status='一般';
       target.loy=enemy?Math.min(72,55+Math.floor((Number(actor.cha)||70)/8)):70;
       target.discovered=true;
       if(enemy)state.relations[oldForce]=Math.max(-100,(state.relations[oldForce]||0)-10);
       closeModal();
       finish(actor,enemy?`${oldForce}軍の${target.name}を登用しました。忠誠${target.loy}で加入しました。`:`在野の${target.name}を登用しました。`);
     }else{
       if(enemy){
         target.loy=Math.min(100,(Number(target.loy)||70)+4);
         state.relations[oldForce]=Math.max(-100,(state.relations[oldForce]||0)-6);
         const ec=state.cities[target.city];if(ec)ec.morale=Math.min(100,ec.morale+2);
       }
       closeModal();
       finish(actor,enemy?`${target.name}への接触は失敗。警戒され、忠誠が4上がりました。`:`${target.name}の登用に失敗しました。`);
     }
   };
 });
};

const style=document.createElement('style');
style.textContent=`
.hire-balance-note{margin:10px 0;padding:10px 12px;border:1px solid #80612e;background:#1d160d;color:#dcc59b;line-height:1.55;font-size:12px}
.choice-list button[disabled]{opacity:.45;filter:grayscale(.8);cursor:not-allowed}
.choice-list strong{color:#e1ba65}
`;
document.head.appendChild(style);

const oldRender=window.render;
window.render=function(){v249Ensure();return oldRender()};
setTimeout(()=>{if(typeof state!=='undefined'&&state)v249Ensure()},0);
})();
