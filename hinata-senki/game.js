(() => {
  'use strict';

  const TILE = 56;
  const SAVE_KEY = 'hinata-senki-save-v1';
  const W = 14;
  const H = 11;

  const terrain = {
    plain: { name:'平地', move:1, def:0, avo:0 },
    road: { name:'街道', move:1, def:0, avo:0 },
    forest: { name:'森', move:2, def:1, avo:20 },
    mountain: { name:'山', move:3, def:1, avo:30 },
    fort: { name:'砦', move:2, def:2, avo:20, heal:5 },
    village: { name:'村', move:1, def:0, avo:10 },
    gate: { name:'城門', move:1, def:3, avo:20 },
    wall: { name:'城壁', move:99, def:0, avo:0 },
  };

  const weapons = {
    ironSword: { name:'鉄の剣', type:'sword', might:5, hit:90, crit:0, weight:4, range:[1], uses:40 },
    slimSword: { name:'細身の剣', type:'sword', might:3, hit:100, crit:5, weight:2, range:[1], uses:30 },
    ironLance: { name:'鉄の槍', type:'lance', might:7, hit:80, crit:0, weight:8, range:[1], uses:40 },
    javelin: { name:'手槍', type:'lance', might:6, hit:65, crit:0, weight:10, range:[1,2], uses:20 },
    ironAxe: { name:'鉄の斧', type:'axe', might:8, hit:70, crit:0, weight:10, range:[1], uses:40 },
    handAxe: { name:'手斧', type:'axe', might:7, hit:60, crit:0, weight:11, range:[1,2], uses:20 },
    ironBow: { name:'鉄の弓', type:'bow', might:6, hit:85, crit:0, weight:6, range:[2], uses:40 },
    light: { name:'ライト', type:'magic', might:4, hit:90, crit:0, weight:3, range:[1,2], uses:30 },
  };

  const mapRows = [
    'wwwwwwggwwwwww',
    'wfffffrrfffffw',
    'wfpffprrppfpfw',
    'wppppprrpppppw',
    'wffppprrppfffw',
    'wppppprrpppppw',
    'wppffprrffpppw',
    'wppvpp rrppppw'.replace(' ', 'p'),
    'wppppprrppfppw',
    'wffppprrppfffw',
    'wwwwwwrrwwwwww',
  ];
  const codeToTerrain = { w:'wall', f:'forest', p:'plain', r:'road', v:'village', g:'gate' };
  const mapData = mapRows.map(r => [...r].map(c => codeToTerrain[c] || 'plain'));
  mapData[4][3] = 'fort';
  mapData[6][10] = 'fort';

  const baseUnits = [
    { id:'kumi', name:'佐々木久美', short:'久', faction:'ally', className:'ロード', x:6,y:9, lv:1, exp:0, hp:22,maxHp:22,str:6,mag:0,skl:7,spd:7,lck:6,def:6,res:2,move:5, weapon:'ironSword', acted:false, lord:true },
    { id:'toshi', name:'加藤史帆', short:'史', faction:'ally', className:'ソシアルナイト', x:5,y:9, lv:1, exp:0, hp:23,maxHp:23,str:8,mag:0,skl:5,spd:8,lck:5,def:6,res:1,move:7, weapon:'slimSword', acted:false },
    { id:'kyoko', name:'齊藤京子', short:'京', faction:'ally', className:'ソシアルナイト', x:7,y:9, lv:1, exp:0, hp:22,maxHp:22,str:7,mag:0,skl:8,spd:6,lck:4,def:8,res:2,move:7, weapon:'ironLance', acted:false },
    { id:'sarina', name:'潮紗理菜', short:'潮', faction:'neutral', className:'シスター', x:3,y:7, lv:1, exp:0, hp:18,maxHp:18,str:1,mag:6,skl:6,spd:6,lck:9,def:2,res:7,move:5, weapon:'light', acted:true, recruitable:true },
    { id:'e1', name:'辺境兵', short:'斧', faction:'enemy', className:'戦士', x:6,y:6, lv:1, hp:20,maxHp:20,str:7,mag:0,skl:4,spd:4,lck:1,def:4,res:0,move:5,weapon:'ironAxe' },
    { id:'e2', name:'辺境兵', short:'槍', faction:'enemy', className:'兵士', x:8,y:7, lv:1, hp:19,maxHp:19,str:6,mag:0,skl:5,spd:4,lck:1,def:5,res:0,move:5,weapon:'ironLance' },
    { id:'e3', name:'辺境兵', short:'斧', faction:'enemy', className:'戦士', x:4,y:5, lv:1, hp:20,maxHp:20,str:7,mag:0,skl:4,spd:5,lck:1,def:4,res:0,move:5,weapon:'ironAxe' },
    { id:'e4', name:'辺境兵', short:'弓', faction:'enemy', className:'弓兵', x:9,y:5, lv:1, hp:18,maxHp:18,str:6,mag:0,skl:6,spd:5,lck:2,def:3,res:1,move:5,weapon:'ironBow' },
    { id:'e5', name:'辺境兵', short:'槍', faction:'enemy', className:'兵士', x:6,y:3, lv:2, hp:21,maxHp:21,str:7,mag:0,skl:6,spd:5,lck:2,def:6,res:1,move:5,weapon:'ironLance' },
    { id:'e6', name:'辺境兵', short:'斧', faction:'enemy', className:'戦士', x:10,y:3, lv:2, hp:22,maxHp:22,str:8,mag:0,skl:5,spd:5,lck:1,def:5,res:0,move:5,weapon:'handAxe' },
    { id:'e7', name:'辺境兵', short:'槍', faction:'enemy', className:'兵士', x:3,y:2, lv:2, hp:21,maxHp:21,str:7,mag:0,skl:6,spd:5,lck:2,def:6,res:1,move:5,weapon:'ironLance' },
    { id:'boss', name:'城門守備隊長バルガ', short:'将', faction:'enemy', className:'重装兵', x:6,y:0, lv:4, hp:29,maxHp:29,str:10,mag:0,skl:7,spd:3,lck:2,def:11,res:2,move:0,weapon:'javelin',boss:true },
  ];

  let state;
  let selectedId = null;
  let reachable = new Map();
  let attackTiles = new Set();
  let dangerVisible = false;
  let pendingMove = null;
  let busy = false;

  const $ = s => document.querySelector(s);
  const mapEl = $('#map');
  const logEl = $('#battleLog');

  function freshState() {
    return {
      version:1, turn:1, phase:'ally', bossDefeated:false, villageVisited:false,
      cleared:false, units:JSON.parse(JSON.stringify(baseUnits)), log:[
        '城門の向こうへ脱出せよ。',
        '久美「まずはみんな、生きてここを出るよ！」'
      ]
    };
  }

  function init() {
    state = load(false) || freshState();
    mapEl.style.gridTemplateColumns = `repeat(${W}, var(--tile))`;
    mapEl.style.gridTemplateRows = `repeat(${H}, var(--tile))`;
    buildMap();
    bindUI();
    render();
    if (!localStorage.getItem(SAVE_KEY)) save(true);
  }

  function buildMap() {
    mapEl.innerHTML = '';
    for (let y=0;y<H;y++) for(let x=0;x<W;x++) {
      const tile = document.createElement('div');
      tile.className = `tile ${mapData[y][x]}`;
      tile.dataset.x = x; tile.dataset.y = y;
      tile.title = terrain[mapData[y][x]].name;
      tile.addEventListener('click', () => onTile(x,y));
      mapEl.appendChild(tile);
    }
  }

  function bindUI() {
    $('#endTurnButton').addEventListener('click', () => {
      if (state.phase !== 'ally' || busy) return;
      if (confirm('自軍ターンを終了しますか？')) endAllyTurn();
    });
    $('#dangerButton').addEventListener('click', () => { dangerVisible=!dangerVisible; render(); });
    $('#menuButton').addEventListener('click', showMenu);
    window.addEventListener('resize', syncTileSize);
    syncTileSize();
  }

  function syncTileSize() {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || TILE;
    mapEl.dataset.tileSize = value;
    renderUnits();
  }

  function unitAt(x,y) { return state.units.find(u => u.hp>0 && u.x===x && u.y===y); }
  function byId(id) { return state.units.find(u => u.id===id); }
  function dist(a,b) { return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }
  function key(x,y) { return `${x},${y}`; }

  function onTile(x,y) {
    if (busy || state.cleared) return;
    const u = unitAt(x,y);
    const selected = byId(selectedId);

    if (state.phase !== 'ally') return;

    if (selected && selected.faction === 'ally' && !selected.acted && u && u.faction === 'enemy' && canAttack(selected,u)) {
      return showForecast(selected,u);
    }

    if (pendingMove) {
      if (u && u.faction === 'neutral' && canTalk(selected,u)) return showActions(selected);
      if (x===pendingMove.x && y===pendingMove.y) return showActions(selected);
      cancelMove();
    }

    if (u) {
      if (u.faction==='ally' && !u.acted) selectUnit(u);
      else { selectedId=u.id; reachable.clear(); attackTiles.clear(); render(); }
      return;
    }

    if (selected && selected.faction==='ally' && !selected.acted && reachable.has(key(x,y))) {
      pendingMove = { fromX:selected.x, fromY:selected.y, x, y };
      selected.x=x; selected.y=y;
      reachable.clear();
      attackTiles = getAttackTiles(selected);
      render();
      showActions(selected);
      return;
    }
    clearSelection();
  }

  function selectUnit(u) {
    selectedId=u.id; pendingMove=null;
    reachable = movementRange(u);
    attackTiles = getAttackTiles(u, reachable);
    render();
  }

  function clearSelection() { selectedId=null; pendingMove=null; reachable.clear(); attackTiles.clear(); render(); }
  function cancelMove() {
    const u=byId(selectedId);
    if (u && pendingMove) { u.x=pendingMove.fromX; u.y=pendingMove.fromY; }
    pendingMove=null;
    if (u) selectUnit(u); else clearSelection();
  }

  function movementRange(u) {
    const result=new Map([[key(u.x,u.y),0]]);
    const q=[[u.x,u.y,0]];
    while(q.length) {
      const [x,y,cost]=q.shift();
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx, ny=y+dy;
        if(nx<0||ny<0||nx>=W||ny>=H) continue;
        const t=terrain[mapData[ny][nx]];
        const nc=cost+t.move;
        const occ=unitAt(nx,ny);
        if(nc>u.move || t.move>=99 || (occ && occ.id!==u.id && occ.faction!==u.faction)) continue;
        const k=key(nx,ny);
        if(!result.has(k)||nc<result.get(k)) { result.set(k,nc); q.push([nx,ny,nc]); }
      }
    }
    return result;
  }

  function getAttackTiles(u, rangeMap=null) {
    const set=new Set();
    const origins=rangeMap ? [...rangeMap.keys()].map(s=>s.split(',').map(Number)) : [[u.x,u.y]];
    const ranges=weapons[u.weapon].range;
    for(const [x,y] of origins) for(let yy=0;yy<H;yy++) for(let xx=0;xx<W;xx++) {
      if(ranges.includes(Math.abs(xx-x)+Math.abs(yy-y))) set.add(key(xx,yy));
    }
    return set;
  }

  function showActions(u) {
    const box=$('#actionButtons'); box.innerHTML='';
    const enemies=state.units.filter(v=>v.faction==='enemy'&&v.hp>0&&canAttack(u,v));
    const talkers=state.units.filter(v=>v.faction==='neutral'&&v.hp>0&&canTalk(u,v));
    if(enemies.length) addAction('攻撃', () => chooseTarget(u,enemies));
    if(talkers.length) addAction('会話', () => recruit(u,talkers[0]));
    if(mapData[u.y][u.x]==='village'&&!state.villageVisited) addAction('訪問', () => visitVillage(u));
    if(mapData[u.y][u.x]==='gate'&&u.lord&&state.bossDefeated) addAction('制圧', seize);
    addAction('待機', () => finishAction(u));
    if(pendingMove) addAction('取消', cancelMove);
  }

  function addAction(label, fn) {
    const b=document.createElement('button'); b.textContent=label; b.onclick=fn; $('#actionButtons').appendChild(b);
  }

  function chooseTarget(attacker, enemies) {
    attackTiles=getAttackTiles(attacker);
    document.querySelectorAll('.tile').forEach(t=>t.classList.remove('target'));
    enemies.forEach(e=>tileEl(e.x,e.y).classList.add('target'));
    toast('攻撃する敵をタップ');
  }

  function canAttack(a,b) { return weapons[a.weapon].range.includes(dist(a,b)); }
  function canTalk(a,b) { return a.id==='kumi' && b.id==='sarina' && dist(a,b)===1; }

  function recruit(a,b) {
    b.faction='ally'; b.acted=true;
    addLog('久美「紗理菜、一緒に来て。ここに残るより、助けられる人を増やそう」');
    addLog('紗理菜「……うん。みんなを置いてはいけないから」');
    addLog('潮紗理菜が仲間になった！');
    finishAction(a);
  }

  function visitVillage(u) {
    state.villageVisited=true;
    u.hp=Math.min(u.maxHp,u.hp+10);
    addLog(`${u.name}は村人から傷薬を受け取り、HPを回復した。`);
    toast('傷薬を入手（試作版では即時回復）');
    finishAction(u);
  }

  function showForecast(a,d) {
    const af=forecast(a,d), df=canAttack(d,a)?forecast(d,a):null;
    const modal=$('#modal');
    $('#modalContent').innerHTML=`
      <h2>戦闘予測</h2>
      <div class="forecast">
        ${forecastSide(a,af)}<div class="vs">VS</div>${forecastSide(d,df)}
      </div>
      <p>${triangleText(a,d)}</p>
      <div class="modal-actions"><button id="attackConfirm">攻撃</button><button id="attackCancel">戻る</button></div>`;
    modal.showModal();
    $('#attackConfirm').onclick=()=>{modal.close(); battle(a,d);};
    $('#attackCancel').onclick=()=>modal.close();
  }

  function forecastSide(u,f) {
    if(!f) return `<div><strong>${u.name}</strong><p>反撃不可</p></div>`;
    return `<div><strong>${u.name}</strong><table>
      <tr><td>HP</td><td>${u.hp}</td></tr><tr><td>ダメージ</td><td>${f.damage}×${f.hits}</td></tr>
      <tr><td>命中</td><td>${f.hit}%</td></tr><tr><td>必殺</td><td>${f.crit}%</td></tr></table></div>`;
  }

  function forecast(a,d) {
    const aw=weapons[a.weapon], dw=weapons[d.weapon];
    const tri=triangle(a,d);
    const tile=terrain[mapData[d.y][d.x]];
    const atk=(aw.type==='magic'?a.mag:a.str)+aw.might+tri.might;
    const defense=aw.type==='magic'?d.res:d.def+tile.def;
    const damage=Math.max(0,atk-defense);
    const as=Math.max(0,a.spd-Math.max(0,aw.weight-a.str));
    const ds=Math.max(0,d.spd-Math.max(0,dw.weight-d.str));
    const hit=Math.max(0,Math.min(100,aw.hit+a.skl*2+a.lck+tri.hit-(d.spd*2+d.lck+tile.avo)+supportBonus(a).hit));
    const crit=Math.max(0,Math.min(100,aw.crit+Math.floor(a.skl/2)-d.lck+supportBonus(a).crit));
    return { damage, hit, crit, hits:as-ds>=4?2:1 };
  }

  function triangle(a,d) {
    const A=weapons[a.weapon].type, D=weapons[d.weapon].type;
    const win=(A==='sword'&&D==='axe')||(A==='axe'&&D==='lance')||(A==='lance'&&D==='sword');
    const lose=(D==='sword'&&A==='axe')||(D==='axe'&&A==='lance')||(D==='lance'&&A==='sword');
    return win?{hit:15,might:1,state:'有利'}:lose?{hit:-15,might:-1,state:'不利'}:{hit:0,might:0,state:'なし'};
  }
  function triangleText(a,d){ const t=triangle(a,d); return t.state==='なし'?'武器相性補正なし':`武器相性：${a.name}が${t.state}`; }
  function supportBonus(u) {
    if(!['toshi','kyoko'].includes(u.id)) return {hit:0,crit:0};
    const other=byId(u.id==='toshi'?'kyoko':'toshi');
    return other&&other.hp>0&&dist(u,other)<=2?{hit:10,crit:5}:{hit:0,crit:0};
  }

  async function battle(a,d) {
    if(busy) return; busy=true;
    const aStartHp=a.hp, dStartHp=d.hp;
    await strikeSequence(a,d);
    if(d.hp>0 && a.hp>0 && canAttack(d,a)) await strikeSequence(d,a,true);
    if(a.hp>0 && d.hp>0) {
      const f=forecast(a,d);
      if(f.hits===2) await strike(a,d,true);
    }
    if(d.hp<=0) defeat(d,a);
    if(a.hp<=0) defeat(a,d);
    if(a.faction==='ally'&&a.hp>0) gainExp(a, d.hp<=0?35:Math.max(1,Math.floor((dStartHp-d.hp)/2)));
    addLog(`${a.name} HP ${aStartHp}→${Math.max(0,a.hp)} / ${d.name} HP ${dStartHp}→${Math.max(0,d.hp)}`);
    busy=false;
    if(a.faction==='ally'&&a.hp>0) finishAction(a); else { clearSelection(); checkDefeat(); }
  }

  async function strikeSequence(a,d) { await strike(a,d,false); }
  async function strike(a,d,follow) {
    if(a.hp<=0||d.hp<=0) return;
    const f=forecast(a,d);
    const roll=Math.random()*100;
    await animateHit(a,d);
    if(roll>=f.hit) { addLog(`${a.name}の攻撃は外れた。`); return; }
    const critical=Math.random()*100<f.crit;
    const dmg=f.damage*(critical?3:1);
    d.hp=Math.max(0,d.hp-dmg);
    addLog(`${a.name}${follow?'の追撃':''}！ ${critical?'必殺の一撃！ ':''}${d.name}に${dmg}ダメージ。`);
    render();
    await sleep(260);
  }

  function defeat(u,killer) {
    addLog(`${u.name}は戦闘不能になった。`);
    if(u.boss) { state.bossDefeated=true; addLog('城門の守備隊長を撃破。久美で城門を制圧できる！'); }
    if(u.faction==='ally'&&u.id==='kumi') checkDefeat();
  }

  function gainExp(u,n) {
    u.exp=(u.exp||0)+n;
    while(u.exp>=100) {
      u.exp-=100; u.lv++;
      const gains=[];
      const growth={maxHp:.8,str:.55,skl:.6,spd:.55,lck:.55,def:.4,res:.25};
      Object.entries(growth).forEach(([s,r])=>{if(Math.random()<r){u[s]++; if(s==='maxHp')u.hp++; gains.push(s);}});
      addLog(`${u.name}はレベル${u.lv}になった！ ${gains.length?gains.join('・')+'上昇':'能力上昇なし'}`);
    }
  }

  function finishAction(u) {
    u.acted=true; pendingMove=null; selectedId=null; reachable.clear(); attackTiles.clear();
    save(true); render();
    if(state.units.filter(v=>v.faction==='ally'&&v.hp>0).every(v=>v.acted)) setTimeout(endAllyTurn,300);
  }

  async function endAllyTurn() {
    if(busy||state.cleared) return;
    state.phase='enemy'; selectedId=null; pendingMove=null; reachable.clear(); attackTiles.clear(); render();
    toast('敵軍フェイズ'); await sleep(450);
    await enemyPhase();
    if(state.cleared) return;
    state.turn++; state.phase='ally';
    state.units.filter(u=>u.faction==='ally'&&u.hp>0).forEach(u=>u.acted=false);
    healForts(); save(true); render(); toast(`ターン ${state.turn}`);
  }

  async function enemyPhase() {
    busy=true;
    for(const e of state.units.filter(u=>u.faction==='enemy'&&u.hp>0)) {
      const targets=state.units.filter(u=>u.faction==='ally'&&u.hp>0);
      if(!targets.length) break;
      let target=targets.slice().sort((a,b)=>dist(e,a)-dist(e,b))[0];
      if(canAttack(e,target)) { await battleEnemy(e,target); continue; }
      if(e.move>0) {
        const step=bestEnemyMove(e,targets);
        if(step) { e.x=step.x; e.y=step.y; render(); await sleep(180); }
      }
      target=targets.filter(t=>canAttack(e,t)).sort((a,b)=>a.hp-b.hp)[0];
      if(target) await battleEnemy(e,target);
    }
    busy=false; checkDefeat();
  }

  function bestEnemyMove(e,targets) {
    const range=movementRange(e); let best=null, score=Infinity;
    for(const k of range.keys()) {
      const [x,y]=k.split(',').map(Number); if(unitAt(x,y)&&!(x===e.x&&y===e.y)) continue;
      const s=Math.min(...targets.map(t=>Math.abs(x-t.x)+Math.abs(y-t.y))) - terrain[mapData[y][x]].def*.15;
      if(s<score){score=s;best={x,y};}
    }
    return best;
  }

  async function battleEnemy(e,t) {
    await strike(e,t,false);
    if(t.hp>0&&e.hp>0&&canAttack(t,e)) await strike(t,e,false);
    if(e.hp>0&&t.hp>0&&forecast(e,t).hits===2) await strike(e,t,true);
    if(t.hp<=0) defeat(t,e); if(e.hp<=0) defeat(e,t);
    render(); await sleep(260);
  }

  function healForts() {
    state.units.filter(u=>u.hp>0&&terrain[mapData[u.y][u.x]].heal).forEach(u=>{
      u.hp=Math.min(u.maxHp,u.hp+terrain[mapData[u.y][u.x]].heal);
    });
  }

  function seize() {
    state.cleared=true;
    addLog('久美が城門を制圧した！');
    render(); save(true);
    $('#modalContent').innerHTML=`<h2>序章クリア</h2><p>三人は城門を突破し、陽光の射す街道へ脱出した。</p><p>加入：${byId('sarina').faction==='ally'?'潮紗理菜':'なし（後の章で再加入可能）'}</p><p>次章「赤と緑の騎士」へ続く。</p>`;
    $('#modal').showModal();
  }

  function checkDefeat() {
    const k=byId('kumi');
    if(k.hp<=0 || !state.units.some(u=>u.faction==='ally'&&u.hp>0)) {
      $('#modalContent').innerHTML='<h2>敗北</h2><p>久美たちは城門を突破できなかった。</p><div class="modal-actions"><button id="retry">序章をやり直す</button><button id="loadBtn">読込</button></div>';
      $('#modal').showModal();
      $('#retry').onclick=()=>{localStorage.removeItem(SAVE_KEY);location.reload();};
      $('#loadBtn').onclick=()=>{state=load(false)||freshState();$('#modal').close();render();};
    }
  }

  function showMenu() {
    $('#modalContent').innerHTML=`<h2>メニュー</h2><div class="modal-actions"><button id="saveBtn">セーブ</button><button id="loadBtn">読込</button></div><div class="modal-actions"><button id="restartBtn">序章を最初から</button></div><p>セーブキー：<code>${SAVE_KEY}</code></p>`;
    $('#modal').showModal();
    $('#saveBtn').onclick=()=>{save(false);$('#modal').close();};
    $('#loadBtn').onclick=()=>{const s=load(false);if(s){state=s;clearSelection();$('#modal').close();toast('読み込みました');}};
    $('#restartBtn').onclick=()=>{if(confirm('現在の進行を消して最初から始めますか？')){localStorage.removeItem(SAVE_KEY);location.reload();}};
  }

  function save(silent) { localStorage.setItem(SAVE_KEY,JSON.stringify(state)); if(!silent)toast('セーブしました'); }
  function load(showError=true) {
    try { const raw=localStorage.getItem(SAVE_KEY); return raw?JSON.parse(raw):null; }
    catch(e){ if(showError)toast('セーブデータを読めません'); return null; }
  }

  function render() {
    $('#turnLabel').textContent=state.turn;
    $('#phaseLabel').textContent=state.phase==='ally'?'自軍':'敵軍';
    $('#objectiveLabel').textContent=state.bossDefeated?'久美で城門を制圧':'敵将撃破後、久美で城門を制圧';
    document.querySelectorAll('.tile').forEach(t=>{
      t.classList.remove('selected','move','attack','danger-zone','target');
      const k=key(+t.dataset.x,+t.dataset.y);
      if(reachable.has(k))t.classList.add('move');
      if(attackTiles.has(k)&&!reachable.has(k))t.classList.add('attack');
    });
    const s=byId(selectedId); if(s)tileEl(s.x,s.y).classList.add('selected');
    if(dangerVisible) renderDanger();
    renderUnits(); renderCard(s); renderLog();
    if(!pendingMove) $('#actionButtons').innerHTML='';
    $('#endTurnButton').disabled=state.phase!=='ally'||busy||state.cleared;
  }

  function renderUnits() {
    mapEl.querySelectorAll('.unit').forEach(n=>n.remove());
    const ts=parseFloat(mapEl.dataset.tileSize)||TILE;
    state.units.filter(u=>u.hp>0).forEach(u=>{
      const d=document.createElement('div');
      d.className=`unit ${u.faction}${u.acted?' acted':''}${u.boss?' boss':''}`;
      d.textContent=u.short; d.dataset.hp=`${u.hp}`;
      d.style.left=`${u.x*ts}px`; d.style.top=`${u.y*ts}px`;
      d.title=`${u.name} HP ${u.hp}/${u.maxHp}`;
      mapEl.appendChild(d);
    });
  }

  function renderDanger() {
    state.units.filter(u=>u.faction==='enemy'&&u.hp>0).forEach(e=>{
      const r=movementRange(e), a=getAttackTiles(e,r);
      a.forEach(k=>{const [x,y]=k.split(',').map(Number);tileEl(x,y).classList.add('danger-zone');});
    });
  }

  function renderCard(u) {
    const card=$('#unitCard');
    if(!u){card.className='panel-card empty';card.innerHTML='<h2>ユニット情報</h2><p>ユニットをタップしてください。</p>';return;}
    const w=weapons[u.weapon];
    card.className='panel-card';
    card.innerHTML=`<div class="unit-name"><h2>${u.name}</h2><strong>Lv.${u.lv}</strong></div><p>${u.className}／${w.name}</p><div>HP ${u.hp}/${u.maxHp}</div><div class="hpbar"><i style="width:${u.hp/u.maxHp*100}%"></i></div><div class="stats">
      ${stat('力',u.str)}${stat('魔',u.mag)}${stat('技',u.skl)}${stat('速',u.spd)}${stat('幸',u.lck)}${stat('守',u.def)}${stat('魔防',u.res)}${stat('移動',u.move)}
    </div><p>地形：${terrain[mapData[u.y][u.x]].name}　EXP ${u.exp||0}/100</p>`;
  }
  function stat(n,v){return `<div class="stat"><span>${n}</span><b>${v}</b></div>`;}
  function renderLog(){logEl.innerHTML=state.log.slice(-20).map(x=>`<div class="log-entry">${escapeHtml(x)}</div>`).join('');logEl.scrollTop=logEl.scrollHeight;}
  function addLog(s){state.log.push(s);renderLog();}
  function tileEl(x,y){return mapEl.children[y*W+x];}
  function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400);}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  async function animateHit(a,d){const el=[...mapEl.querySelectorAll('.unit')].find(n=>n.title.startsWith(d.name));if(el){el.classList.add('hit');await sleep(130);el.classList.remove('hit');}}
  function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  init();
})();
