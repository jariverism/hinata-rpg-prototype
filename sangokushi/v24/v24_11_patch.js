// v24.11 — richer exploration and remote recruitment through spy intelligence
(()=>{
const HN=new Set((window.HINATA_WORLD||[]).map(x=>x[0]));
const priorHire=window.hire;

function ensureIntel(){
 if(!state)return;
 state.spyIntel=state.spyIntel||{};
 state.explorationFlags=state.explorationFlags||{};
 state.intelVersion=111;
}
function intelRec(city){ensureIntel();return state.spyIntel[city]||{level:0,expires:0}}
function intelLevel(city){const r=intelRec(city);return r.expires>=state.turn?r.level:0}
function setIntel(city,level,months=8){ensureIntel();const old=intelRec(city);state.spyIntel[city]={level:Math.max(old.level||0,level),expires:Math.max(old.expires||0,state.turn+months)}}
function face(name){return typeof v241FaceHtml==='function'?v241FaceHtml(name):`<span class="face">${(name||'?')[0]}</span>`}
function faces(){if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face))}

// Exploration is now a varied local adventure rather than a binary roll.
window.search=function(actor){
 ensureIntel();const c=cityObj();if(c.gold<60)return alert('金不足');c.gold-=60;
 const hiddenLocal=state.officers.filter(o=>o.city===state.selected&&o.force==='在野'&&o.status!=='死亡'&&(!HN.has(o.name)||o.discovered===false));
 const hiddenHinata=state.officers.filter(o=>HN.has(o.name)&&o.discovered===false);
 const roll=Math.random()*100;
 if(hiddenLocal.length&&roll<34+actor.int*.42){
  const t=hiddenLocal[Math.floor(Math.random()*hiddenLocal.length)];t.discovered=true;t.status='在野';
  return finish(actor,`${state.selected}の酒家で評判の人物を探し、${t.name}を発見しました。`);
 }
 if(hiddenHinata.length&&roll<48+actor.int*.32){
  const t=hiddenHinata[Math.floor(Math.random()*hiddenHinata.length)];t.discovered=true;
  return finish(actor,t.force==='在野'?`旅商人の話から、${t.name}が${t.city}にいると判明しました。`:`古い書簡を入手し、${t.name}が${t.force}軍の${t.city}に仕えていると判明しました。`);
 }
 const event=Math.floor(Math.random()*7);
 if(event===0){const g=rnd(90,260)+Math.floor(actor.int*.7);c.gold+=g;return finish(actor,`廃屋の床下から古銭を発見し、金${g}を得ました。`)}
 if(event===1){const f=rnd(400,1200)+actor.pol*4;c.food+=f;return finish(actor,`郊外の隠し倉を発見し、兵糧${f}を確保しました。`)}
 if(event===2){const gain=4+Math.floor(actor.cha/25);c.morale=Math.min(100,c.morale+gain);return finish(actor,`城下の困り事を解決し、民心と士気が${gain}上がりました。`)}
 if(event===3){const ns=neighbors(state.selected).filter(n=>state.cities[n].force&&state.cities[n].force!=='日向軍');if(ns.length){const n=ns[Math.floor(Math.random()*ns.length)];setIntel(n,1,5);return finish(actor,`猟師から抜け道を聞き、隣国${n}の兵力と物資情報を得ました。`)} }
 if(event===4&&!state.explorationFlags[`relic:${state.selected}`]){state.explorationFlags[`relic:${state.selected}`]=true;c.commerce=Math.min(100,c.commerce+5);c.farm=Math.min(100,c.farm+5);return finish(actor,`古代の灌漑図を発見しました。${state.selected}の農業・商業が5上昇しました。`)}
 if(event===5){const wild=state.officers.filter(o=>o.force==='在野'&&o.status!=='死亡'&&o.discovered!==false);if(wild.length){const t=wild[Math.floor(Math.random()*wild.length)];t.city=state.selected;return finish(actor,`名声を聞いた${t.name}が${state.selected}を訪れました。`)} }
 const refund=rnd(25,80);c.gold+=refund;finish(actor,`目ぼしい人物はいませんでしたが、土地の案内人から金${refund}相当の交易品を受け取りました。`);
};

function spyCommand(){
 ensureIntel();if(cityObj().force!=='日向軍')return alert('自国都市でのみ密偵を派遣できます。');
 if(!ready(state.selected).length)return alert('行動可能な武将がいません。');
 chooseActor('int',spyChooseCity);
}
function spyChooseCity(actor){
 const cities=Object.values(state.cities).filter(c=>c.force&&c.force!=='日向軍').sort((a,b)=>(intelLevel(a.name)-intelLevel(b.name))||a.name.localeCompare(b.name,'ja'));
 if(!cities.length)return alert('調査対象となる敵国がありません。');
 showModal(`<h2>密偵派遣</h2><p>担当：<b>${actor.name}</b>　知力${actor.int}</p><div class="spy-note">遠方の都市にも派遣できます。情報段階が上がると、都市情報、所属武将、忠誠度が順に判明し、段階3で遠隔登用工作が可能になります。</div><div class="choice-list">${cities.map(c=>{const lv=intelLevel(c.name),r=intelRec(c.name);return `<button data-spy-city="${c.name}"><span><b>${c.name}</b>　${c.force}<br><small>情報段階 ${lv}/3${lv?`　有効あと${Math.max(0,r.expires-state.turn)}か月`:''}</small></span></button>`}).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-spy-city]').forEach(b=>b.onclick=()=>spyConfirm(actor,state.cities[b.dataset.spyCity]));
}
function spyConfirm(actor,target){
 const current=intelLevel(target.name),cost=160+current*70;
 const distance=Math.hypot(target.x-cityObj().x,target.y-cityObj().y);
 const chance=Math.max(18,Math.min(94,Math.round(48+actor.int*.48-distance*.32-current*9)));
 const success=Math.random()*100<chance;
 const advice=typeof v241Advice==='function'?v241Advice(success,`${target.name}への密偵派遣`):null;
 showModal(`<h2>${target.name}へ密偵を派遣</h2>${advice&&typeof v241AdviceHtml==='function'?v241AdviceHtml(advice):''}<p>${target.force}軍／現在の情報段階 ${current}/3</p><p>必要金：${cost}</p><button id="spy-go" class="primary">密偵を派遣</button><button data-close>中止</button>`);faces();
 modalCard.querySelector('#spy-go').onclick=()=>{const home=cityObj();if(home.gold<cost)return alert('金不足');home.gold-=cost;closeModal();if(success){const next=Math.min(3,current+1);setIntel(target.name,next,8);if(next>=2)state.officers.filter(o=>o.city===target.name&&HN.has(o.name)).forEach(o=>o.discovered=true);finish(actor,`${target.name}への潜入に成功。情報段階が${next}になりました。${next===3?'遠隔登用工作が可能です。':''}`)}else{state.relations[target.force]=Math.max(-100,(state.relations[target.force]||0)-3);finish(actor,`${target.name}への潜入は失敗し、相手勢力の警戒が高まりました。`)}};
}

function remoteChance(actor,t){
 const base=100-(Number(t.loy)||70),charm=Math.round(((Number(actor.cha)||70)-70)/2);
 const cityIntel=state.officers.filter(o=>o.force===t.force&&o.city===t.city&&o.status!=='死亡').reduce((m,o)=>Math.max(m,Number(o.int)||50),50);
 const guard=Math.max(0,Math.round((cityIntel-65)/3));
 return Math.max(1,Math.min((t.loy||70)<=25?72:55,base+charm-guard-12));
}

// Extend the v24.9 recruitment screen with distant officers only where level-3 intelligence exists.
window.hire=function(actor){
 ensureIntel();
 const remote=state.officers.filter(t=>t.force&&t.force!=='在野'&&t.force!=='日向軍'&&t.status!=='君主'&&t.status!=='捕虜'&&t.status!=='死亡'&&intelLevel(t.city)>=3&&!(HN.has(t.name)&&t.discovered===false)&&!neighbors(state.selected).includes(t.city));
 if(!remote.length)return priorHire(actor);
 showModal(`<h2>登用方法</h2><div class="choice-list"><button id="hire-local"><b>通常の登用</b><br><small>現在地の在野武将、隣接敵都市の武将へ接触</small></button><button id="hire-remote"><b>密偵網による遠隔登用</b><br><small>情報段階3の遠方都市にいる武将へ秘密工作</small></button></div><button data-close>閉じる</button>`);
 modalCard.querySelector('#hire-local').onclick=()=>{closeModal();priorHire(actor)};
 modalCard.querySelector('#hire-remote').onclick=()=>remoteHire(actor,remote);
};
function remoteHire(actor,targets){
 showModal(`<h2>遠隔登用工作</h2><div class="spy-note">密偵を介するため、隣接登用より費用が高く、成功率も低くなります。失敗すると情報段階が1低下します。</div><div class="choice-list">${targets.sort((a,b)=>remoteChance(actor,b)-remoteChance(actor,a)).map(t=>`<button data-remote="${t.name}">${face(t.name)}<span><b>${t.name}</b><br>${t.force}・${t.city}　忠誠${t.loy}<br><strong>成功率 ${remoteChance(actor,t)}%</strong></span></button>`).join('')}</div><button data-close>中止</button>`);faces();
 modalCard.querySelectorAll('[data-remote]').forEach(b=>b.onclick=()=>{
  const t=state.officers.find(o=>o.name===b.dataset.remote),chance=remoteChance(actor,t),success=Math.random()*100<chance,cost=520;
  showModal(`<h2>${t.name}へ秘密接触</h2><p>${t.force}軍・${t.city}　忠誠${t.loy}</p><p>成功率 <b>${chance}%</b>／必要金 ${cost}</p><button id="remote-go" class="primary">工作を実行</button><button data-close>中止</button>`);
  modalCard.querySelector('#remote-go').onclick=()=>{const c=cityObj();if(c.gold<cost)return alert('金不足');c.gold-=cost;state.recruitAttempts=state.recruitAttempts||{};state.recruitAttempts[t.name]=state.turn+4;const old=t.force;if(success){t.force='日向軍';t.city=state.selected;t.status='一般';t.loy=55+Math.floor(actor.cha/10);t.discovered=true;state.relations[old]=Math.max(-100,(state.relations[old]||0)-12);closeModal();finish(actor,`密偵の手引きにより、${old}軍の${t.name}を遠隔登用しました。`)}else{const r=intelRec(t.city);state.spyIntel[t.city]={level:Math.max(0,r.level-1),expires:r.expires};t.loy=Math.min(100,(Number(t.loy)||70)+3);state.relations[old]=Math.max(-100,(state.relations[old]||0)-8);closeModal();finish(actor,`${t.name}への秘密接触は失敗。${t.city}の情報段階が低下しました。`)}};
 });
}

function intelPanel(){
 const known=Object.keys(state.spyIntel||{}).filter(n=>intelLevel(n)>0);
 if(!known.length)return '';
 return `<section class="panel"><div class="title">密偵網</div>${known.sort((a,b)=>intelLevel(b)-intelLevel(a)).map(n=>{const c=state.cities[n],lv=intelLevel(n),os=state.officers.filter(o=>o.city===n&&o.force===c.force&&o.status!=='死亡');return `<div class="intel-row"><b>${n}</b> ${c.force}　情報${lv}/3<br><small>${lv>=1?`兵${c.troops.toLocaleString()} 金${c.gold} 兵糧${c.food}`:'調査中'}${lv>=2?`<br>武将：${os.map(o=>o.name).join('、')||'不明'}`:''}${lv>=3?`<br>忠誠：${os.map(o=>`${o.name}${o.loy}`).join('／')}`:''}</small></div>`}).join('')}</section>`;
}

const oldRender=window.render;
window.render=function(){ensureIntel();const result=oldRender();setTimeout(()=>{
 if(!state||state.battle)return;
 const commands=document.querySelector('.commands');
 if(commands&&!commands.querySelector('[data-cmd="spy"]')){const b=document.createElement('button');b.dataset.cmd='spy';b.textContent='密偵';b.disabled=cityObj().force!=='日向軍'||!ready(state.selected).length;b.onclick=spyCommand;const end=commands.querySelector('[data-cmd="end"]');commands.insertBefore(b,end||null)}
 const stacks=document.querySelectorAll('.dashboard .stack');if(stacks.length&&knownPanelMissing()){stacks[stacks.length-1].insertAdjacentHTML('beforeend',intelPanel())}
 },0);return result};
function knownPanelMissing(){return !document.querySelector('.intel-row')&&Object.keys(state.spyIntel||{}).some(n=>intelLevel(n)>0)}

const style=document.createElement('style');style.textContent=`.spy-note{margin:10px 0;padding:10px;border:1px solid #77602f;background:#1c160d;color:#dbc89e;line-height:1.55;font-size:12px}.intel-row{padding:8px 0;border-bottom:1px solid #443522;line-height:1.4}.intel-row small{color:#cbb892}.choice-list strong{color:#e1ba65}`;document.head.appendChild(style);
setTimeout(()=>{if(typeof state!=='undefined'&&state)window.render()},0);
})();