let V20_SELECTED_OFFICER='';

function v20Portrait(name,large=false){
  return `<img class="v20-face ${large?'large':''}" src="${portraitData(name)}" alt="${name}の肖像">`;
}

function v20AddTopNavigation(){
  if(state?.battle||document.querySelector('.v20-nav'))return;
  const header=document.querySelector('header');
  if(!header)return;
  const nav=document.createElement('nav');
  nav.className='v20-nav';
  nav.innerHTML=`<button class="active">城内</button><button>人事</button><button>軍事</button><button>計略</button><button>外交</button><button>情報</button>`;
  header.insertAdjacentElement('afterend',nav);
}

function v20OfficerCard(o){
  const active=o.name===V20_SELECTED_OFFICER?'selected':'';
  const role=o.status==='君主'?'君主':o.status==='軍師'?'軍師':o.status==='太守'?'太守':o.war>=90?'猛将':o.int>=90?'才女':'武将';
  return `<button class="v20-officer-card ${active}" data-v20-officer="${o.name}">
    <span class="v20-role">${role}</span>${v20Portrait(o.name)}
    <strong>${o.name}</strong><small>統${o.lead}　武${o.war}　知${o.int}<br>政${o.pol}　魅${o.cha}　忠${o.loy}</small>
  </button>`;
}

function v20DetailPanel(o){
  if(!o)return '';
  const special=(typeof V17_SPECIALS!=='undefined'&&V17_SPECIALS[o.name])||(typeof V18_MARTIAL!=='undefined'&&V18_MARTIAL[o.name]);
  return `<aside class="v20-detail">
    <div class="v20-detail-head">${v20Portrait(o.name,true)}<div><h2>${o.name}</h2><b>${o.status}</b><p>${o.force}／${o.city}</p></div></div>
    <div class="v20-bars">${[['統率',o.lead],['武力',o.war],['知力',o.int],['魅力',o.cha],['政治',o.pol]].map(([n,v])=>`<div><span>${n}</span><b>${v}</b><i><em style="width:${v}%"></em></i></div>`).join('')}</div>
    <section><h3>特技・戦法</h3><p><b>${special?.name||'固有戦法なし'}</b></p><small>${special?.desc||'通常の命令と兵科特性を活用する武将です。'}</small></section>
  </aside>`;
}

function v20TransformRoster(){
  if(!state||state.battle)return;
  const panels=[...document.querySelectorAll('.side-stack.left .panel')];
  const roster=panels.find(p=>p.querySelector('.officer-row'));
  if(!roster)return;
  const officers=state.officers.filter(o=>o.force===state.playerForce&&o.status!=='捕虜');
  if(!V20_SELECTED_OFFICER||!officers.some(o=>o.name===V20_SELECTED_OFFICER))V20_SELECTED_OFFICER=(ruler(state.playerForce)||officers[0])?.name||'';
  roster.classList.add('v20-roster');
  roster.innerHTML=`<div class="v20-roster-title"><div class="title">武将一覧</div><span>${officers.length}名</span></div><div class="v20-filter"><button class="active">すべて</button><button>日向坂46</button><button>三国武将</button><button>在野</button></div><div class="v20-card-grid">${officers.map(v20OfficerCard).join('')}</div>`;
  roster.querySelectorAll('[data-v20-officer]').forEach(btn=>btn.addEventListener('click',()=>{V20_SELECTED_OFFICER=btn.dataset.v20Officer;v20ApplyUI()}));
  let detail=document.querySelector('.v20-detail');
  const selected=officers.find(o=>o.name===V20_SELECTED_OFFICER);
  if(detail)detail.outerHTML=v20DetailPanel(selected);
  else document.querySelector('.game-grid')?.insertAdjacentHTML('beforeend',v20DetailPanel(selected));
}

function v20ApplyUI(){
  if(!state)return;
  document.body.classList.toggle('v20-battle',!!state.battle);
  if(state.battle){
    document.querySelector('.phase-banner')?.insertAdjacentHTML('afterend','<div class="v20-battle-caption">全軍の行動が終了すると自動的に敵軍フェイズへ移行します。</div>');
    return;
  }
  v20AddTopNavigation();
  v20TransformRoster();
}

const v20BaseRender=render;
render=function(){
  v20BaseRender();
  setTimeout(v20ApplyUI,0);
};

// 戦闘画面で確認できた残存兵数を、そのまま都市へ引き継ぐ。
const v20BaseEndBattleGroup=endBattleGroup;
endBattleGroup=function(win,retreat){
  if(!state?.battle)return;
  const b=state.battle;
  const playerSurvivors=b.units.filter(u=>u.side==='player').reduce((s,u)=>s+Math.max(0,Math.floor(u.troops||0)),0);
  const enemySurvivors=b.units.filter(u=>u.side==='enemy').reduce((s,u)=>s+Math.max(0,Math.floor(u.troops||0)),0);
  const sourceBefore=state.cities[b.src]?.troops||0;
  const targetBefore=state.cities[b.target]?.troops||0;
  const defense=!!b.defense;
  const src=b.src,target=b.target;
  v20BaseEndBattleGroup(win,retreat);
  if(defense){
    if(win&&state.cities[target])state.cities[target].troops=playerSurvivors;
    if(!win&&state.cities[target])state.cities[target].troops=enemySurvivors;
    if(state.cities[src])state.cities[src].troops=Math.max(0,sourceBefore-enemySurvivors);
  }else{
    if(win&&state.cities[target])state.cities[target].troops=playerSurvivors;
    if(!win&&state.cities[src])state.cities[src].troops=sourceBefore+playerSurvivors;
    if(!win&&state.cities[target])state.cities[target].troops=Math.max(targetBefore,enemySurvivors);
  }
  render();
};
