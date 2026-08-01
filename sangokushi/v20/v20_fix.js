// v20 corrective layer: real portrait sprite, non-overlapping roster, working tabs.
const V20_SPRITE='./assets/portrait_sprite.jpg';
const V20_SPRITE_NAMES=['佐々木久美','小坂菜緒','加藤史帆','河田陽菜','上村ひなの','山口陽世','東村芽依','富田鈴花','高瀬愛奈','松田好花','宮田愛萌','丹生明里'];
const V20_SPRITE_INDEX=Object.fromEntries(V20_SPRITE_NAMES.map((n,i)=>[n,i]));

(function addV20FixStyles(){
 const s=document.createElement('style');
 s.textContent=`
 .v20-shell{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:10px;width:100%;margin:0 0 10px;position:relative;z-index:1}
 .v20-shell .v20-roster{grid-column:auto!important;min-width:0;max-height:590px;overflow:auto}
 .v20-shell .v20-detail{grid-column:auto!important;grid-row:auto!important;min-width:0;min-height:0;overflow:hidden}
 .v20-card-grid{grid-template-columns:repeat(auto-fill,minmax(112px,1fr))!important}
 .v20-sprite-face{display:block;width:100%;aspect-ratio:3/4;border:2px solid #795622;background-color:#2a1a10;background-image:url('${V20_SPRITE}');background-repeat:no-repeat;background-size:600% 200%;box-shadow:inset 0 0 0 2px #d0a84f;pointer-events:none}
 .v20-sprite-face.large{width:142px;min-width:142px;height:180px;aspect-ratio:auto}
 .v20-nav{z-index:1000!important;pointer-events:auto!important}
 .v20-nav button{pointer-events:auto!important;position:relative;z-index:1001}
 .v20-tab-menu button{width:100%;margin:4px 0;padding:12px;text-align:left}
 .game-grid{grid-template-columns:minmax(260px,320px) minmax(340px,1fr) minmax(260px,320px)!important;position:relative;z-index:0}
 .game-grid>.v20-detail,.game-grid>.v20-roster{display:none!important}
 .officer-row.v15{display:flex!important}
 @media(max-width:900px){.v20-shell{grid-template-columns:1fr}.v20-shell .v20-detail{order:2}.v20-shell .v20-roster{max-height:none}.game-grid{display:flex!important;flex-direction:column}}
 @media(max-width:520px){.v20-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.v20-sprite-face.large{width:105px;min-width:105px;height:134px}}
 `;
 document.head.appendChild(s);
})();

function v20SpritePosition(name){
 const i=V20_SPRITE_INDEX[name];
 if(i===undefined)return null;
 const col=i%6,row=Math.floor(i/6);
 return `${col*20}% ${row*100}%`;
}

v20Portrait=function(name,large=false){
 const pos=v20SpritePosition(name);
 if(pos){
  return `<span class="v20-sprite-face ${large?'large':''}" role="img" aria-label="${name}の肖像" style="background-position:${pos}"></span>`;
 }
 return `<img class="v20-face ${large?'large':''}" src="${portraitData(name)}" alt="${name}の肖像">`;
};

function v20BuildShell(){
 if(!state||state.battle)return;
 document.querySelectorAll('.v20-shell').forEach(x=>x.remove());
 const officers=state.officers.filter(o=>o.force===state.playerForce&&o.status!=='捕虜');
 if(!officers.length)return;
 if(!V20_SELECTED_OFFICER||!officers.some(o=>o.name===V20_SELECTED_OFFICER))V20_SELECTED_OFFICER=(ruler(state.playerForce)||officers[0]).name;
 const selected=officers.find(o=>o.name===V20_SELECTED_OFFICER)||officers[0];
 const shell=document.createElement('section');
 shell.className='v20-shell';
 shell.innerHTML=`<div class="panel v20-roster"><div class="v20-roster-title"><div class="title">武将一覧</div><span>${officers.length}名</span></div><div class="v20-card-grid">${officers.map(v20OfficerCard).join('')}</div></div>${v20DetailPanel(selected)}`;
 const screen=document.querySelector('.screen');
 const grid=document.querySelector('.game-grid');
 if(screen)screen.insertBefore(shell,grid||screen.firstChild);else document.querySelector('#app')?.prepend(shell);
 shell.querySelectorAll('[data-v20-officer]').forEach(btn=>btn.onclick=()=>{V20_SELECTED_OFFICER=btn.dataset.v20Officer;v20BuildShell()});
}

const V20_TAB_WORDS={
 '城内':['農業','商業','治水','巡察','施し','捜索'],
 '人事':['登用','褒美','移動','太守','軍師','解任','追放','捕虜'],
 '軍事':['徴兵','訓練','出兵','輸送','築城','修復'],
 '計略':['策略','流言','離間','焼討','内応'],
 '外交':['外交','同盟','停戦','贈物','共同','降伏'],
 '情報':['情報','武将','都市','勢力']
};

function v20OpenTab(label){
 const words=V20_TAB_WORDS[label]||[];
 const originals=[...document.querySelectorAll('.command-grid button')].filter(b=>words.some(w=>b.textContent.includes(w))&&!b.disabled);
 document.querySelectorAll('.v20-nav button').forEach(b=>b.classList.toggle('active',b.textContent===label));
 if(!originals.length){
  const target=label==='情報'?document.querySelector('.side-stack.right'):document.querySelector('.command-grid');
  target?.scrollIntoView({behavior:'smooth',block:'center'});
  return;
 }
 showModal(`<h2>${label}</h2><div class="v20-tab-menu">${originals.map((b,i)=>`<button data-v20-command="${i}">${b.textContent.trim()}</button>`).join('')}</div><button data-close class="secondary">閉じる</button>`);
 card.querySelectorAll('[data-v20-command]').forEach(btn=>btn.onclick=()=>{const original=originals[+btn.dataset.v20Command];closeModal();setTimeout(()=>original.click(),0)});
}

v20AddTopNavigation=function(){
 if(state?.battle)return;
 document.querySelectorAll('.v20-nav').forEach(x=>x.remove());
 const nav=document.createElement('nav');nav.className='v20-nav';
 nav.innerHTML=Object.keys(V20_TAB_WORDS).map((x,i)=>`<button class="${i===0?'active':''}" data-v20-tab="${x}">${x}</button>`).join('');
 document.querySelector('header')?.insertAdjacentElement('afterend',nav);
 nav.querySelectorAll('[data-v20-tab]').forEach(btn=>btn.onclick=e=>{e.preventDefault();e.stopPropagation();v20OpenTab(btn.dataset.v20Tab)});
};

v20TransformRoster=function(){v20BuildShell()};
v20ApplyUI=function(){
 if(!state)return;
 document.body.classList.toggle('v20-battle',!!state.battle);
 if(state.battle){
  if(!document.querySelector('.v20-battle-caption'))document.querySelector('.phase-banner')?.insertAdjacentHTML('afterend','<div class="v20-battle-caption">全軍の行動が終了すると自動的に敵軍フェイズへ移行します。</div>');
  return;
 }
 v20AddTopNavigation();
 v20BuildShell();
};

setTimeout(()=>{if(typeof state!=='undefined'&&state)v20ApplyUI()},50);
