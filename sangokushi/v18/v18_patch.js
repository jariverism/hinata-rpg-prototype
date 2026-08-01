const V18_MARTIALS={
 '山口陽世':{name:'豪勇突撃',desc:'二マス以内の敵へ突撃し、大損害と士気低下を与えて後退させる。'},
 '東村芽依':{name:'神速乱舞',desc:'敵一隊を急襲した後、行動済みにならず続けてもう一度行動できる。'},
 '加藤史帆':{name:'雷撃槍',desc:'隣接する敵一隊へ武力依存の極大損害を与える。'},
 '関羽':{name:'青龍一閃',desc:'同じ縦列または横列の敵を最大三マス先までまとめて薙ぎ払う。'},
 '呂布':{name:'天下無双',desc:'周囲の敵全隊へ猛攻。撃破した場合は再行動可能になる。'}
};
function v18MartialOf(u){return u&&V18_MARTIALS[u.name]}
function v18Gauge(u){if(u.gauge==null)u.gauge=0;return u.gauge}
function v18AddGauge(u,n){if(!u)return;u.gauge=Math.max(0,Math.min(100,v18Gauge(u)+n))}
function v18EnemiesInRange(p,r){return state.battle.units.filter(e=>e.side==='enemy'&&e.troops>0&&Math.abs(p.x-e.x)+Math.abs(p.y-e.y)<=r)}
function v18Clamp(){if(state?.battle)state.battle.units.forEach(u=>{u.troops=Math.max(0,Math.floor(u.troops||0));u.morale=Math.max(0,Math.min(100,u.morale||0));v18Gauge(u)})}

// より密度の高い武将肖像へ刷新
portraitData=function(name){
 const h=hashName(name),female=V15_FEMALE.has(name),skin=['#f3c4a1','#e7b187','#f7cfad','#dba27c'][h%4],hair=['#171312','#2b1b17','#3b281e','#11151b','#543629'][h%5],robe=['#8d2531','#244e78','#3f6d50','#704589','#a06b25','#40516b'][h%6],robe2=['#d3ae62','#d9dce7','#b7cfaa','#d7b6df'][h%4],bg=['#c9b078','#8fa9a0','#9d8eac','#b78f86','#879bb2'][h%5],face=(h>>5)%4,orn=(h>>8)%5;
 const long=female||h%3===0;
 const backHair=long?`<path d="M18 35Q14 73 26 100L39 87H79L93 101Q101 65 89 34Q73 12 52 14Q29 14 18 35Z" fill="${hair}"/>`:`<path d="M19 36Q23 12 55 10Q89 13 94 39L83 31Q56 18 24 39Z" fill="${hair}"/>`;
 const crown=orn===0?'<path d="M34 17L44 7L53 16L63 5L76 18" fill="none" stroke="#d7b448" stroke-width="5"/>':orn===1?'<path d="M28 22Q55 4 82 22" fill="none" stroke="#c9a345" stroke-width="7"/><circle cx="55" cy="10" r="5" fill="#b62f3d"/>':orn===2?'<path d="M80 20l15-10-4 18" fill="#d9c37a"/>':orn===3?'<circle cx="87" cy="35" r="7" fill="#b53d62"/><path d="M87 28q8-8 12 0" fill="#d0a84e"/>':'';
 const brows=face===0?'<path d="M35 45q8-5 16-1M61 44q8-4 15 1" fill="none" stroke="#3b241d" stroke-width="3"/>':face===1?'<path d="M34 46l17-4M61 42l16 4" stroke="#3b241d" stroke-width="3"/>':face===2?'<path d="M35 43q8 3 16 0M62 43q7 3 14 0" fill="none" stroke="#3b241d" stroke-width="3"/>':'<path d="M35 45h16M62 45h15" stroke="#3b241d" stroke-width="3"/>';
 const eyes=female?'<path d="M37 50q7-5 14 0q-7 5-14 0M62 50q7-5 14 0q-7 5-14 0" fill="#fff" stroke="#33231e" stroke-width="1.5"/><circle cx="44" cy="50" r="2.3"/><circle cx="69" cy="50" r="2.3"/>':'<path d="M37 50q7-3 14 0M62 50q7-3 14 0" fill="none" stroke="#241a18" stroke-width="3"/>';
 const beard=!female&&h%3===1?'<path d="M43 70Q55 90 68 70Q64 94 55 101Q46 94 43 70Z" fill="#2a1b17" opacity=".9"/>':'';
 const mouth=face===1?'<path d="M47 68q8-3 16 0" fill="none" stroke="#8c3e42" stroke-width="2"/>':'<path d="M47 67q8 6 16 0" fill="none" stroke="#9b4650" stroke-width="2.5"/>';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 132"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#372f32"/></linearGradient><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${robe2}"/><stop offset=".28" stop-color="${robe}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".45"/></filter></defs><rect width="112" height="132" rx="12" fill="url(#b)"/><circle cx="94" cy="19" r="17" fill="#f3d36b" opacity=".22"/><path d="M5 116Q18 84 55 82Q96 84 108 116V132H5Z" fill="url(#r)" filter="url(#s)"/><path d="M19 121L40 88L55 105L72 87L96 121" fill="none" stroke="#e6cf8c" stroke-width="4" opacity=".8"/>${backHair}<ellipse cx="56" cy="51" rx="31" ry="37" fill="${skin}" filter="url(#s)"/><path d="M25 39Q31 12 57 13Q84 11 90 40Q68 26 28 45Z" fill="${hair}"/>${crown}${brows}${eyes}<path d="M53 55q3 5 6 0" fill="none" stroke="#a56c55" stroke-width="1.5"/>${mouth}${beard}<path d="M31 78Q55 91 81 77" fill="none" stroke="#d4a27d" stroke-width="2" opacity=".55"/><rect x="5" y="105" width="102" height="23" rx="7" fill="#17151bdc"/><text x="56" y="121" text-anchor="middle" font-size="12" font-weight="700" font-family="serif" fill="#fff4d1">${name}</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
};

const v18BaseRenderBattle=renderBattle;
renderBattle=function(){
 if(v16CheckBattleEnd())return;
 v18BaseRenderBattle();
 if(!state?.battle)return;
 state.battle.units.forEach(v18Gauge);
 const p=state.battle.units.find(u=>u.name===state.battle.selected&&u.side==='player'&&u.troops>0),controls=document.querySelector('.battle-controls');
 if(!p||!controls)return;
 const info=controls.querySelector('.gauge-wrap')||document.createElement('div');
 info.className='gauge-wrap';info.innerHTML=`<div><b>戦法ゲージ ${p.gauge}/100</b></div><div class="gauge-track"><div class="gauge-fill" style="width:${p.gauge}%"></div></div>${p.type==='弩'?'<div class="range-note">弩兵：3マス以内へ遠隔射撃可能</div>':''}`;
 if(!info.parentNode){const help=controls.querySelector('.battle-help');controls.insertBefore(info,help)}
 const attackBtn=controls.querySelector('[data-b="attack"]');if(attackBtn)attackBtn.textContent=p.type==='弩'?'弓射撃（射程3）':'攻撃';
 const art=v18MartialOf(p);if(art&&!controls.querySelector('[data-v18-martial]')){
  const note=document.createElement('div');note.className='special-note';note.innerHTML=`<b>武力固有戦術：${art.name}</b><br>${art.desc}<br>条件：ゲージ100・兵1000以上・士気80以上`;
  const btn=document.createElement('button');btn.className='martial-command';btn.dataset.v18Martial='1';btn.textContent=art.name;btn.disabled=p.actionDone||p.gauge<100||p.troops<1000||p.morale<80;btn.onclick=()=>v18UseMartial(p);
  const end=controls.querySelector('[data-b="endphase"]');controls.insertBefore(note,end);controls.insertBefore(btn,end);
 }
 enhanceRoster();
};

function v18ChooseTarget(title,targets,cb){showModal(`<h2>${title}</h2><div class="choice-list">${targets.map(t=>`<button data-v18-target="${t.name}">${portraitHTML(t.name,true)}<span><b>${t.name}隊</b>　兵${t.troops}　距離${Math.abs(t.x-state.battle.units.find(u=>u.name===state.battle.selected).x)+Math.abs(t.y-state.battle.units.find(u=>u.name===state.battle.selected).y)}</span></button>`).join('')}</div><button data-close>閉じる</button>`);card.querySelectorAll('[data-v18-target]').forEach(b=>b.onclick=()=>{const t=targets.find(x=>x.name===b.dataset.v18Target);closeModal();cb(t)})}

const v18BaseBattleAction=battleAction;
battleAction=function(a){
 const b=state?.battle,p=b&&b.units.find(u=>u.name===b.selected&&u.side==='player'&&u.troops>0);
 if(a!=='attack'||!p||p.type!=='弩')return v18BaseBattleAction(a);
 if(b.phase!=='player'||p.actionDone)return;
 const targets=v18EnemiesInRange(p,3);if(!targets.length){b.logs.unshift('射程3以内に敵がいない。');return render()}
 v18ChooseTarget('弓射撃の対象',targets,t=>{const dist=Math.abs(p.x-t.x)+Math.abs(p.y-t.y),terrain=state.battle.terrain[t.y*7+t.x],cover=terrain==='forest'?.78:terrain==='hill'?.88:1,dmg=Math.floor((95+p.troops*.028+p.war*2.15)*(0.82+Math.random()*.36)*cover*(dist===3?.88:1));t.troops-=dmg;t.morale-=3;v18AddGauge(p,35);v18AddGauge(t,15);v18Clamp();if(v16CheckBattleEnd())return;completeUnitAction(p,`${p.name}隊の遠隔射撃！ ${t.name}隊に${dmg}損害。`)})
};

function v18UseMartial(p){
 const art=v18MartialOf(p),b=state.battle;if(!art||p.gauge<100||p.troops<1000||p.morale<80||p.actionDone)return;p.gauge=0;
 if(p.name==='関羽'){
  const targets=v17Alive('enemy').filter(e=>(e.x===p.x||e.y===p.y)&&v17Distance(p,e)<=3);if(!targets.length){p.gauge=100;return alert('同じ縦列・横列の3マス以内に敵がいません')}
  targets.forEach(e=>{e.troops-=Math.floor(420+p.war*5+Math.random()*350);e.morale-=12});v18Clamp();if(v16CheckBattleEnd())return;return completeUnitAction(p,'関羽の「青龍一閃」！ 一線上の敵軍を薙ぎ払った。');
 }
 const range=p.name==='加藤史帆'||p.name==='呂布'?1:2,targets=v18EnemiesInRange(p,range);if(!targets.length){p.gauge=100;return alert(`射程${range}以内に敵がいません`)}
 v18ChooseTarget(art.name+'の対象',targets,t=>{
  if(p.name==='山口陽世'){const dmg=Math.floor(520+p.war*5+Math.random()*420);t.troops-=dmg;t.morale-=18;const dx=Math.sign(t.x-p.x),dy=Math.sign(t.y-p.y),nx=t.x+dx,ny=t.y+dy;if(nx>=0&&nx<7&&ny>=0&&ny<7&&!b.units.some(u=>u.troops>0&&u.x===nx&&u.y===ny)){t.x=nx;t.y=ny}v18Clamp();if(v16CheckBattleEnd())return;completeUnitAction(p,`山口陽世の「豪勇突撃」！ ${t.name}隊に${dmg}損害。`)}
  else if(p.name==='東村芽依'){const dmg=Math.floor(360+p.war*4.3+Math.random()*350);t.troops-=dmg;t.morale-=8;v18Clamp();if(v16CheckBattleEnd())return;p.actionDone=false;b.logs.unshift(`東村芽依の「神速乱舞」！ ${t.name}隊に${dmg}損害。さらに行動可能。`);render()}
  else if(p.name==='加藤史帆'){const dmg=Math.floor(700+p.war*6+Math.random()*480);t.troops-=dmg;t.morale-=20;v18Clamp();if(v16CheckBattleEnd())return;completeUnitAction(p,`加藤史帆の「雷撃槍」！ ${t.name}隊に${dmg}の極大損害。`)}
  else if(p.name==='呂布'){let kills=0;v18EnemiesInRange(p,1).forEach(e=>{const before=e.troops,dmg=Math.floor(560+p.war*5.8+Math.random()*500);e.troops-=dmg;e.morale-=18;if(before>0&&e.troops<=0)kills++});v18Clamp();if(v16CheckBattleEnd())return;if(kills){p.actionDone=false;b.logs.unshift(`呂布の「天下無双」！ 周囲を蹴散らし、${kills}隊撃破。再行動可能。`);render()}else completeUnitAction(p,'呂布の「天下無双」！ 周囲の敵軍へ壊滅的打撃。')}
 })
}

// 通常攻撃・被弾で戦法ゲージを蓄積
const v18BaseCompleteUnitAction=completeUnitAction;
let v18AutoEnding=false;
completeUnitAction=function(p,msg){
 if(msg&&(/攻撃|射撃|火計/.test(msg)))v18AddGauge(p,35);
 v18BaseCompleteUnitAction(p,msg);
 setTimeout(()=>{if(!state?.battle||state.battle.phase!=='player'||v18AutoEnding)return;const alive=state.battle.units.filter(u=>u.side==='player'&&u.troops>0);if(alive.length&&alive.every(u=>u.actionDone)){v18AutoEnding=true;state.battle.logs.unshift('全味方部隊の命令完了。自動的に敵軍フェイズへ移る。');render();setTimeout(()=>{v18AutoEnding=false;if(state?.battle?.phase==='player')endPlayerPhase()},220)}},40);
};

const v18BaseEnemyTurn=enemyBattleTurn;
enemyBattleTurn=function(){
 const before=new Map((state?.battle?.units||[]).filter(u=>u.side==='player').map(u=>[u.name,u.troops]));v18BaseEnemyTurn();if(!state?.battle)return;state.battle.units.filter(u=>u.side==='player').forEach(u=>{const old=before.get(u.name);if(old!=null&&u.troops<old)v18AddGauge(u,20)});v18Clamp();
};
