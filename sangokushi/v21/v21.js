const V21_POS={北平:[12,13],鄴:[30,20],洛陽:[44,36],長安:[22,43],許昌:[61,34],寿春:[76,45],建業:[89,54],襄陽:[52,57],江陵:[61,72],漢中:[31,64],成都:[24,86],南海:[82,88]};
const V21_NAMES=['佐々木久美','小坂菜緒','加藤史帆','河田陽菜','上村ひなの','山口陽世','東村芽依','富田鈴花','高瀬愛奈','松田好花','宮田愛萌','丹生明里'];
const V21_INDEX=Object.fromEntries(V21_NAMES.map((n,i)=>[n,i]));
let V21_SPRITE='',V21_SELECTED='',V21_TAB='城内';
const V21_TABS={城内:['開発','商業','治水','巡察','捜索','月送り'],人事:['登用','褒美','任命','移動','捕虜'],軍事:['徴兵','訓練','輸送','出兵'],計略:['計略'],外交:['外交'],情報:[]};

// Command dialogs should stay compact. Portraits remain in the roster and battle units only.
enhanceRoster=function(){};

async function v21LoadSprite(){
 try{
  const r=await fetch('../v20/assets/portrait_sprite.jpg?v=21',{cache:'no-store'});
  if(!r.ok)throw new Error('portrait asset '+r.status);
  const raw=(await r.text()).replace(/\s+/g,'');
  if(raw.startsWith('/9j/'))V21_SPRITE='data:image/jpeg;base64,'+raw;
 }catch(e){console.warn('Portrait sprite fallback active',e)}
 if(state&&!state.battle)v21Apply();
}
function v21Face(name,cls=''){
 const i=V21_INDEX[name];
 if(i!==undefined&&V21_SPRITE){const col=i%6,row=Math.floor(i/6);return `<span class="v21-face ${cls}" role="img" aria-label="${name}の肖像" style="background-image:url('${V21_SPRITE}');background-position:${col*20}% ${row*100}%"></span>`}
 const src=typeof portraitData==='function'?portraitData(name):'';
 return `<span class="v21-face fallback ${cls}" role="img" aria-label="${name}の肖像" style="background-image:url('${src}')"></span>`;
}
function v21Status(){
 const c=state.cities[state.selected];return `<div class="v21-status"><div>年月<b>${state.year}年 ${state.month}月</b></div><div>君主<b>${ruler(state.playerForce)?.name||'-'}</b></div><div>領土<b>${citiesOf(state.playerForce).length}都市</b></div><div>選択都市<b>${state.selected}</b></div><div>兵力<b>${c.troops.toLocaleString()}</b></div><div>未行動<b>${ready(state.selected).length}名</b></div></div>`;
}
function v21Tabs(){return `<nav class="v21-tabs">${Object.keys(V21_TABS).map(t=>`<button data-v21tab="${t}" class="${t===V21_TAB?'active':''}">${t}</button>`).join('')}</nav>`}
function v21OpenTab(tab){
 V21_TAB=tab;document.querySelectorAll('[data-v21tab]').forEach(b=>b.classList.toggle('active',b.dataset.v21tab===tab));
 if(tab==='情報'){document.querySelector('.side-stack.right')?.scrollIntoView({behavior:'smooth',block:'start'});return}
 const labels=V21_TABS[tab],buttons=[...document.querySelectorAll('.command-grid button')].filter(b=>labels.some(x=>b.textContent.includes(x)));
 showModal(`<h2>${tab}</h2><div class="v21-command-menu">${buttons.map((b,i)=>`<button data-v21cmd="${i}" ${b.disabled?'disabled':''}><b>${b.textContent.trim()}</b><br><small>${b.disabled?'現在は実行できません':'担当武将を選んで実行'}</small></button>`).join('')}</div><button data-close class="secondary">閉じる</button>`);
 card.querySelectorAll('[data-v21cmd]').forEach(x=>x.onclick=()=>{const b=buttons[+x.dataset.v21cmd];closeModal();setTimeout(()=>b.click(),0)});
}
function v21Map(){
 const roads=[],seen=new Set();Object.entries(state.cities).forEach(([a,c])=>c.n.forEach(b=>{const k=[a,b].sort().join('|');if(!seen.has(k)&&V21_POS[a]&&V21_POS[b]){seen.add(k);roads.push([a,b])}}));
 return `<div class="v21-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${roads.map(([a,b])=>`<line class="v21-road" x1="${V21_POS[a][0]}" y1="${V21_POS[a][1]}" x2="${V21_POS[b][0]}" y2="${V21_POS[b][1]}"/>`).join('')}</svg>${Object.entries(state.cities).map(([n,c])=>{const p=V21_POS[n];return `<button class="v21-city ${c.force===state.playerForce?'mine':'enemy'} ${n===state.selected?'selected':''}" data-v21city="${n}" style="left:${p[0]}%;top:${p[1]}%"><strong>${n}</strong>${c.force}<br>兵${c.troops.toLocaleString()}<br>太守 ${gov(n)?.name||'なし'}</button>`}).join('')}</div><div class="v21-legend"><span>緑：自軍</span><span>茶：他勢力</span><span>街道で直接つながる都市のみ移動・出兵可能</span></div>`;
}
function v21Roster(){
 const os=ofs(state.playerForce).filter(o=>o.status!=='捕虜');if(!os.length)return '';
 if(!V21_SELECTED||!os.some(o=>o.name===V21_SELECTED))V21_SELECTED=(ruler(state.playerForce)||os[0]).name;
 const s=os.find(o=>o.name===V21_SELECTED)||os[0],sp=(typeof V17_SPECIALS!=='undefined'&&V17_SPECIALS[s.name])||(typeof V18_MARTIALS!=='undefined'&&V18_MARTIALS[s.name]);
 return `<section class="panel v21-roster"><div class="v21-roster-head"><div class="title">配下武将</div><span>${os.length}名／画像${V21_SPRITE?'読込済み':'代替表示中'}</span></div><div class="v21-card-grid">${os.map(o=>`<button class="v21-card ${o.name===V21_SELECTED?'selected':''}" data-v21officer="${o.name}">${v21Face(o.name)}<strong>${o.name}</strong><small>${o.status}・${o.city}<br>統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}<br>${o.acted===state.turn?'行動済':'行動可能'}</small></button>`).join('')}</div><div class="v21-detail">${v21Face(s.name)}<div><h3>${s.name}　<small>${s.status}</small></h3><div class="v21-statline">所属 ${s.city}／忠誠 ${s.loy}<br>統率 ${s.lead}　武力 ${s.war}　知力 ${s.int}　政治 ${s.pol}　魅力 ${s.cha}<br><b>${sp?.name||'固有戦術なし'}</b>　${sp?.desc||'能力と兵科を生かして行動します。'}</div></div></div></section>`;
}
function v21Adviser(){
 if(typeof adviser!=='function')return '';
 const a=adviser();return `<div class="v21-adviser">${a?v21Face(a.name):''}<div><b>軍師 ${a?.name||'未任命'}</b><br>${a?`知力${a.int}／助言的中率${a.int}%`:'人事の軍師任命から任命してください'}</div></div>`;
}
function v21Apply(){
 if(!state||state.battle)return;
 document.querySelectorAll('.v21-status,.v21-tabs,.v21-roster').forEach(x=>x.remove());
 const screen=document.querySelector('.screen'),grid=document.querySelector('.game-grid');if(!screen||!grid)return;
 grid.insertAdjacentHTML('beforebegin',v21Status()+v21Tabs());
 const center=document.querySelector('.panel.center');if(center)center.innerHTML=`<div class="title">中原勢力図</div>${v21Map()}`;
 const officerPanel=[...document.querySelectorAll('.side-stack.left .panel')].find(p=>p.querySelector('.officer-row')||p.textContent.includes('配下武将'));if(officerPanel)officerPanel.remove();
 const right=document.querySelector('.side-stack.right .panel');if(right&&!right.querySelector('.v21-adviser'))right.insertAdjacentHTML('afterbegin',v21Adviser());
 grid.insertAdjacentHTML('afterend',v21Roster());
 document.querySelectorAll('[data-v21tab]').forEach(b=>b.onclick=()=>v21OpenTab(b.dataset.v21tab));
 document.querySelectorAll('[data-v21city]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.v21city;render()});
 document.querySelectorAll('[data-v21officer]').forEach(b=>b.onclick=()=>{V21_SELECTED=b.dataset.v21officer;v21Apply()});
}
const v21BaseRender=render;render=function(){v21BaseRender();if(state&&!state.battle)setTimeout(v21Apply,0)};

// Preserve exactly the troop totals visible at battle end.
if(typeof endBattleGroup==='function'){
 const v21BaseEnd=endBattleGroup;endBattleGroup=function(win,retreat){
  if(!state?.battle)return;const b=state.battle,ps=b.units.filter(u=>u.side==='player').reduce((n,u)=>n+Math.max(0,Math.floor(u.troops||0)),0),es=b.units.filter(u=>u.side==='enemy').reduce((n,u)=>n+Math.max(0,Math.floor(u.troops||0)),0),src=b.src,target=b.target,def=!!b.defense,srcBefore=state.cities[src]?.troops||0,targetBefore=state.cities[target]?.troops||0;
  v21BaseEnd(win,retreat);
  if(def){if(win&&state.cities[target])state.cities[target].troops=ps;if(!win&&state.cities[target])state.cities[target].troops=es}
  else{if(win&&state.cities[target])state.cities[target].troops=ps;if(!win&&state.cities[src])state.cities[src].troops=srcBefore+ps;if(!win&&state.cities[target])state.cities[target].troops=Math.max(targetBefore,es)}
  render();
 };
}
v21LoadSprite();setTimeout(()=>{if(state&&!state.battle)v21Apply()},100);