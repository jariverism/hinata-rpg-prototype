// 日向三國志 ROGUE Prototype 0.9 — restore strategist advice and cross-faction recruitment
(()=>{
if(window.HINATA_ROGUE_HIRE_V9)return;window.HINATA_ROGUE_HIRE_V9=true;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const BASE=window.HINATA_CANONICAL_STATS||{};
const isHinata=name=>!!BASE[name];
function candidatePool(s=state){
 const city=s?.selected;
 return (s?.officers||[]).filter(t=>{
  if(!t||t.force==='日向軍'||t.force==='退場')return false;
  if(['君主','死亡','捕虜','戦利品'].includes(t.status))return false;
  if(t.force==='在野')return t.city===city;
  return !!t.force;
 }).sort((a,b)=>{
  const ah=isHinata(a.name)?0:1,bh=isHinata(b.name)?0:1;if(ah!==bh)return ah-bh;
  const al=a.force==='在野'?0:1,bl=b.force==='在野'?0:1;if(al!==bl)return al-bl;
  return (Number(a.loy)||0)-(Number(b.loy)||0)||String(a.name).localeCompare(String(b.name),'ja');
 });
}
function successChance(actor,target){
 return clamp(15+(Number(actor?.cha)||0)*.45+(100-(Number(target?.loy)||0))*.45-(target?.force==='在野'?0:20),5,90);
}
function currentStrategist(){
 try{return window.V2447?.currentStrategist?.()||window.V2462?.sync?.()||null}catch(e){return null}
}
function adviceFor(actor,target){
 const a=currentStrategist(),p=Math.round(successChance(actor,target));
 if(!a)return {name:null,text:'軍師不在：助言なし',chance:p};
 const tone=p>=70?'かなり見込みがあります':p>=50?'五分以上の見込みです':p>=30?'難しいですが可能性はあります':'成功はかなり難しいでしょう';
 return {name:a.name,text:`軍師 ${a.name}「${tone}」 成功見込 ${p}%`,chance:p};
}
function playerHinata(){return (state?.officers||[]).filter(o=>o.force==='日向軍'&&isHinata(o.name)&&!['死亡','捕虜'].includes(o.status))}
function statLabel(k){return{lead:'統率',war:'武力',int:'知力',pol:'政治',cha:'魅力'}[k]||k}
function strongestStat(o){return window.HINATA_ROGUE_RULES?.strongestStat?.(o)||['lead','war','int','pol','cha'].sort((a,b)=>(Number(o?.[b])||0)-(Number(o?.[a])||0))[0]||'war'}
function gearFor(o){return window.HINATA_ROGUE_RULES?.gearFor?.(o)||{name:`${o.name}の佩`,stat:strongestStat(o),amount:6,desc:'能力＋6'}}
function finishReward(){state.rogue.rewardOpen=false;closeModal();render()}
function chooseMember(title,cb){
 const xs=playerHinata();showModal(`<h2>${title}</h2><div class="choice-list">${xs.map(o=>`<button data-v9-member="${o.name}"><b>${o.name}</b> 統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}${o.rogueEquip?`<br><small>装備：${o.rogueEquip.name}</small>`:''}</button>`).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v9-member]').forEach(b=>b.onclick=()=>{const o=xs.find(x=>x.name===b.dataset.v9Member);if(o)cb(o)});
}
function showConversion(snap){
 state.rogue.rewardOpen=true;const gear=gearFor(snap),k=strongestStat(snap);
 showModal(`<h2>登用成功：${snap.name}</h2><p>${snap.name}はROGUEでは恒久配下にせず、戦力へ変換します。</p><div class="rogue-choice-grid"><button id="v9Equip"><b>装備化：${gear.name}</b><small>${gear.desc}。日向坂メンバー1人が装備。</small></button><button id="v9Material"><b>強化素材化：${statLabel(k)}の結晶</b><small>日向坂メンバー1人の${statLabel(k)}＋4。このラン中は永続。</small></button></div>`);
 modalCard.querySelector('#v9Equip').onclick=()=>chooseMember(`${gear.name}を誰に装備する？`,target=>{
  if(target.rogueEquip){const old=target.rogueEquip;target[old.stat]=Math.max(1,(Number(target[old.stat])||0)-Number(old.amount||0))}
  target[gear.stat]=(Number(target[gear.stat])||0)+Number(gear.amount||0);target.rogueEquip={...gear,source:snap.name};state.rogue.items=state.rogue.items||[];state.rogue.items.push(`${target.name}：${gear.name}`);log(`${snap.name}を装備「${gear.name}」へ変換し、${target.name}が装備。`);finishReward();
 });
 modalCard.querySelector('#v9Material').onclick=()=>chooseMember(`${snap.name}の力を誰に継承する？`,target=>{
  target[k]=(Number(target[k])||0)+4;log(`${snap.name}を${statLabel(k)}の強化素材として消費。${target.name}の${statLabel(k)}＋4。`);finishReward();
 });
}
function retireHistorical(t){
 const snap={name:t.name,lead:t.lead,war:t.war,int:t.int,pol:t.pol,cha:t.cha};
 t.force='退場';t.status='戦利品';t.city='';t.loy=0;state.rogue.converted=(Number(state.rogue.converted)||0)+1;log(`${t.name}は登用成功後、日向軍の恒久配下にはならず戦利品となった。`);showConversion(snap);
}
function rogueHire(actor){
 const ts=candidatePool();if(!ts.length)return alert('登用・調略できる武将がいません。');
 const adviser=currentStrategist();
 showModal(`<h2>登用・調略</h2><p class="v9-adviser-head">${adviser?`軍師 <b>${adviser.name}</b> が成功見込みを助言します。`:'<b>軍師不在</b>のため助言はありません。'}</p><div class="choice-list v9-hire-list">${ts.slice(0,80).map(t=>{const ad=adviceFor(actor,t);return `<button data-v9-hire="${t.name}"><span><b>${t.name}</b>　${isHinata(t.name)?'日向坂→加入':'歴史武将→戦利品化'}<br><small>${t.force}・${t.city||'所在不明'}　忠${t.loy}</small><br><small class="v9-advice">${ad.text}</small></span><span>${Math.round(ad.chance)}%</span></button>`}).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v9-hire]').forEach(btn=>btn.onclick=()=>{
  const t=(state.officers||[]).find(x=>x.name===btn.dataset.v9Hire);if(!t)return;const chance=successChance(actor,t),cost=Math.min(180,Number(cityObj()?.gold)||0);cityObj().gold=Math.max(0,(Number(cityObj().gold)||0)-cost);actor.acted=state.turn;const ok=Math.random()*100<chance;closeModal();
  if(ok){
   if(isHinata(t.name)){t.force='日向軍';t.city=state.selected;t.status='一般';t.loy=72;log(`${actor.name}が${t.name}の登用に成功しました。`);render();}
   else{log(`${actor.name}が${t.name}の調略に成功しました。`);retireHistorical(t);}
  }else{log(`${actor.name}の${t.name}への${isHinata(t.name)?'登用':'調略'}は失敗しました。`);render();}
 });
}
window.HINATA_ROGUE_HIRE_V9_API={candidatePool,successChance,adviceFor,isHinata};
if(typeof document==='undefined')return;
window.hire=rogueHire;
const prevRender=window.render;
function mark(){const s=document.querySelector('header h1 small');if(s)s.textContent='Prototype 0.9';const b=document.getElementById('rogueStatEngineBadge');if(b)b.textContent='能力Engine v8 / 登用v9'}
window.render=function(){const r=prevRender.apply(this,arguments);mark();setTimeout(mark,80);return r};setTimeout(mark,0);
const style=document.createElement('style');style.textContent='.v9-hire-list button{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;text-align:left}.v9-advice{color:#f1cf7a}.v9-adviser-head{margin:6px 0 10px;color:#d7c39a}';document.head.appendChild(style);
})();
