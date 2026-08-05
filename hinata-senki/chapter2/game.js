(() => {
  'use strict';

  const SAVE_KEY = 'hinata-senki-chapter2-save-v1';
  const PROLOGUE_SAVE_KEY = 'hinata-senki-save-v1';
  const ROSTER_KEY = 'hinata-senki-campaign-roster-v1';
  const SAVE_VERSION = 1;
  const W = 16;
  const H = 12;

  const portraitData = window.HINATA_PORTRAIT_DATA || {};
  const PORTRAITS = {
    '佐々木久美': portraitData.kumi || '',
    '加藤史帆': portraitData.toshi || '',
    '齊藤京子': portraitData.kyoko || '',
    '井口眞緒': portraitData.mao || '',
    '潮紗理菜': portraitData.sarina || '',
    '河田陽菜': portraitData.hina || ''
  };

  const terrain = {
    floor:{ name:'石床', move:1, def:0, avo:0 },
    stone:{ name:'中庭', move:1, def:0, avo:5 },
    wall:{ name:'壁', move:99, def:0, avo:0 },
    cell:{ name:'牢内', move:1, def:1, avo:5 },
    door:{ name:'扉', move:99, def:0, avo:0 },
    chest:{ name:'宝箱', move:1, def:0, avo:0 },
    exit:{ name:'脱出地点', move:1, def:0, avo:10 },
    fort:{ name:'詰所', move:1, def:2, avo:15, heal:5 }
  };

  const weapons = {
    ironSword:{ name:'鉄の剣', type:'sword', might:5, hit:90, crit:0, weight:4, range:[1], uses:40 },
    slimSword:{ name:'細身の剣', type:'sword', might:3, hit:100, crit:5, weight:2, range:[1], uses:30 },
    ironLance:{ name:'鉄の槍', type:'lance', might:7, hit:80, crit:0, weight:8, range:[1], uses:40 },
    javelin:{ name:'手槍', type:'lance', might:6, hit:65, crit:0, weight:10, range:[1,2], uses:20 },
    ironAxe:{ name:'鉄の斧', type:'axe', might:8, hit:70, crit:0, weight:10, range:[1], uses:40 },
    handAxe:{ name:'手斧', type:'axe', might:7, hit:60, crit:0, weight:11, range:[1,2], uses:20 },
    ironBow:{ name:'鉄の弓', type:'bow', might:6, hit:85, crit:0, weight:6, range:[2], uses:40 },
    dagger:{ name:'鋼の短剣', type:'sword', might:4, hit:95, crit:5, weight:2, range:[1], uses:35 },
    steelSword:{ name:'鋼の剣', type:'sword', might:8, hit:80, crit:0, weight:9, range:[1], uses:30 },
    live:{ name:'ライブ', type:'staff', heal:10, range:[1], uses:20, exp:11 },
    relive:{ name:'リライブ', type:'staff', heal:20, range:[1], uses:10, exp:17 }
  };

  const rows = [
    '################',
    '#...#......#..E#',
    '#.C.D#.....#D.C#',
    '#...#..........#',
    '#.##.###..###..#',
    '#..............#',
    '#..##......##..#',
    '#..............#',
    '#..D.#.....T...#',
    '#..C.#.........#',
    '#S.............#',
    '################'
  ];

  const codeTerrain = { '#':'wall', '.':'floor', 'C':'cell', 'D':'door', 'T':'chest', 'E':'exit', 'S':'stone' };
  const mapData = rows.map(row => [...row].map(code => codeTerrain[code] || 'floor'));
  mapData[5][7] = 'fort';

  const introScene = [
    { speaker:'ナレーション', text:'城門を抜けた一行は、追手を避けて旧街道を進んだ。だが、夜明け前に見つけた砦から、助けを求める声が聞こえる。' },
    { speaker:'佐々木久美', side:'left', text:'急いでいるのは分かってる。でも、聞こえた声を置いてはいけない。中を確かめよう。' },
    { speaker:'加藤史帆', side:'right', text:'狭い場所なら馬を降りることになるね。京子、前に出すぎないでよ。' },
    { speaker:'齊藤京子', side:'left', text:'史帆こそ。通路では一人で敵を抱えない。久美の合図に合わせるよ。' },
    { speaker:'潮紗理菜', side:'right', text:'負傷した人がいたら、私が治します。杖はまだ使えます。' },
    { speaker:'作戦', text:'閉ざされた区画を調べ、囚われた人々を救出せよ。敵将を退けた後、佐々木久美を脱出地点へ到達させること。' }
  ];

  const earlyTalkScene = [
    { speaker:'佐々木久美', side:'left', text:'待って。あなた、もしかして……。' },
    { speaker:'河田陽菜', side:'right', text:'今は話してる場合じゃないです。まだ中に残ってる人がいるから。' },
    { speaker:'佐々木久美', side:'left', text:'分かった。先に助ける。あとで必ず話そう。' }
  ];

  const joinTalkScene = [
    { speaker:'佐々木久美', side:'left', text:'もう大丈夫。助けた人たちは安全な通路へ逃がしたよ。' },
    { speaker:'河田陽菜', side:'right', text:'……本当に？　じゃあ、もう敵のふりを続けなくていいんですね。' },
    { speaker:'佐々木久美', side:'left', text:'うん。一緒に来て。今度は私たちが背中を守るから。' },
    { speaker:'河田陽菜', side:'right', text:'はい。久美さんたちなら、信じられます。' }
  ];

  const classMarks = {
    'ロード':'旗',
    'ソシアルナイト':'騎',
    'シスター':'杖',
    '盗賊':'鍵',
    '戦士':'斧',
    '兵士':'槍',
    '弓兵':'弓',
    '剣士':'剣',
    '重装兵':'盾',
    '市民':'民'
  };

  const growths = {
    kumi:{ maxHp:.80,str:.50,mag:.10,skl:.60,spd:.55,lck:.60,def:.35,res:.20 },
    toshi:{ maxHp:.90,str:.65,mag:.05,skl:.45,spd:.65,lck:.45,def:.35,res:.15 },
    kyoko:{ maxHp:.80,str:.55,mag:.05,skl:.70,spd:.45,lck:.40,def:.60,res:.20 },
    sarina:{ maxHp:.60,str:.10,mag:.65,skl:.55,spd:.50,lck:.75,def:.20,res:.60 },
    hina:{ maxHp:.70,str:.40,mag:.10,skl:.70,spd:.80,lck:.90,def:.25,res:.35 }
  };

  const $ = selector => document.querySelector(selector);
  const mapEl = $('#map');
  const logEl = $('#battleLog');

  let state;
  let selectedId = null;
  let reachable = new Map();
  let attackTiles = new Set();
  let pendingMove = null;
  let dangerVisible = false;
  let busy = false;
  let storyState = null;

  function safeParse(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function defaultAllies() {
    return [
      { id:'kumi',name:'佐々木久美',short:'久',faction:'ally',className:'ロード',x:1,y:10,lv:1,exp:0,hp:23,maxHp:23,str:6,mag:0,skl:7,spd:7,lck:6,def:7,res:2,move:5,weapon:'ironSword',weaponUses:40,lord:true,acted:false },
      { id:'toshi',name:'加藤史帆',short:'史',faction:'ally',className:'ソシアルナイト',x:2,y:10,lv:1,exp:0,hp:24,maxHp:24,str:8,mag:0,skl:5,spd:8,lck:5,def:7,res:1,move:6,weapon:'slimSword',weaponUses:30,acted:false },
      { id:'kyoko',name:'齊藤京子',short:'京',faction:'ally',className:'ソシアルナイト',x:1,y:9,lv:1,exp:0,hp:24,maxHp:24,str:7,mag:0,skl:8,spd:6,lck:4,def:9,res:2,move:6,weapon:'ironLance',weaponUses:40,acted:false },
      { id:'sarina',name:'潮紗理菜',short:'潮',faction:'ally',className:'シスター',x:2,y:9,lv:1,exp:0,hp:18,maxHp:18,str:1,mag:6,skl:6,spd:6,lck:9,def:2,res:7,move:5,weapon:'live',staves:{live:20,relive:10},acted:false }
    ];
  }

  function buildAlliesFromPrologue() {
    const defaults = defaultAllies();
    const saved = safeParse(PROLOGUE_SAVE_KEY);
    if (!saved?.units) return defaults;
    const prior = Object.fromEntries(saved.units.map(unit => [unit.id,unit]));
    const result = [];

    for (const template of defaults) {
      const source = prior[template.id];
      if (template.id === 'sarina' && source && source.faction !== 'ally') continue;
      if (!source) {
        if (template.id !== 'sarina' || !saved.units.some(unit => unit.id === 'sarina')) result.push(template);
        continue;
      }
      const carried = { ...template };
      ['lv','exp','maxHp','str','mag','skl','spd','lck','def','res','weapon'].forEach(key => {
        if (source[key] !== undefined) carried[key] = source[key];
      });
      carried.hp = carried.maxHp;
      carried.weaponUses = weapons[carried.weapon]?.uses || template.weaponUses || 30;
      if (template.id === 'sarina') {
        carried.weapon = 'live';
        carried.staves = {
          live:Number.isFinite(source.staves?.live) ? source.staves.live : 20,
          relive:Number.isFinite(source.staves?.relive) ? source.staves.relive : 10
        };
      }
      result.push(carried);
    }

    if (!result.some(unit => unit.id === 'sarina') && !prior.sarina) {
      result.push(defaults.find(unit => unit.id === 'sarina'));
    }
    return result;
  }

  function enemyUnits() {
    return [
      { id:'jailer1',name:'砦の看守',short:'看',faction:'enemy',className:'兵士',x:5,y:9,lv:2,hp:18,maxHp:18,str:6,mag:0,skl:5,spd:4,lck:1,def:5,res:1,move:4,weapon:'ironLance',weaponUses:40,hasKey:true,ai:'advance' },
      { id:'e2',name:'砦兵',short:'斧',faction:'enemy',className:'戦士',x:7,y:9,lv:2,hp:19,maxHp:19,str:7,mag:0,skl:4,spd:4,lck:1,def:4,res:0,move:4,weapon:'ironAxe',weaponUses:40,ai:'advance' },
      { id:'e3',name:'砦兵',short:'弓',faction:'enemy',className:'弓兵',x:8,y:7,lv:2,hp:17,maxHp:17,str:6,mag:0,skl:6,spd:5,lck:2,def:3,res:1,move:4,weapon:'ironBow',weaponUses:40,ai:'advance' },
      { id:'e4',name:'砦兵',short:'槍',faction:'enemy',className:'兵士',x:5,y:6,lv:2,hp:18,maxHp:18,str:6,mag:0,skl:5,spd:4,lck:1,def:5,res:1,move:4,weapon:'ironLance',weaponUses:40,ai:'guard' },
      { id:'e5',name:'砦兵',short:'斧',faction:'enemy',className:'戦士',x:10,y:6,lv:3,hp:20,maxHp:20,str:7,mag:0,skl:5,spd:5,lck:1,def:4,res:0,move:4,weapon:'handAxe',weaponUses:20,ai:'guard' },
      { id:'jailer2',name:'牢番長',short:'牢',faction:'enemy',className:'剣士',x:9,y:4,lv:3,hp:19,maxHp:19,str:7,mag:0,skl:8,spd:7,lck:3,def:4,res:1,move:5,weapon:'steelSword',weaponUses:30,hasKey:true,ai:'guard' },
      { id:'e7',name:'砦兵',short:'弓',faction:'enemy',className:'弓兵',x:13,y:5,lv:3,hp:18,maxHp:18,str:6,mag:0,skl:7,spd:5,lck:2,def:3,res:1,move:4,weapon:'ironBow',weaponUses:40,ai:'guard' },
      { id:'e8',name:'砦兵',short:'槍',faction:'enemy',className:'兵士',x:4,y:3,lv:3,hp:19,maxHp:19,str:7,mag:0,skl:6,spd:5,lck:2,def:5,res:1,move:4,weapon:'javelin',weaponUses:20,ai:'guard' },
      { id:'boss',name:'砦司令ヴァルド',short:'将',faction:'enemy',className:'重装兵',x:13,y:1,lv:5,hp:27,maxHp:27,str:9,mag:0,skl:7,spd:3,lck:3,def:10,res:3,move:0,weapon:'javelin',weaponUses:20,boss:true,ai:'hold' }
    ];
  }

  function specialUnits() {
    return [
      { id:'hina',name:'河田陽菜',short:'陽',faction:'neutral',className:'盗賊',x:10,y:8,lv:2,exp:0,hp:20,maxHp:20,str:5,mag:0,skl:8,spd:10,lck:10,def:3,res:3,move:6,weapon:'dagger',weaponUses:35,acted:false,recruitable:true },
      { id:'prisoner1',name:'囚われた村人',short:'民',faction:'civilian',className:'市民',x:3,y:9,lv:1,hp:12,maxHp:12,str:0,mag:0,skl:2,spd:3,lck:2,def:1,res:0,move:0,acted:true },
      { id:'prisoner2',name:'囚われた旅人',short:'民',faction:'civilian',className:'市民',x:14,y:2,lv:1,hp:13,maxHp:13,str:0,mag:0,skl:2,spd:3,lck:2,def:1,res:0,move:0,acted:true }
    ];
  }

  function freshState() {
    return {
      version:SAVE_VERSION,
      chapter:2,
      turn:1,
      phase:'ally',
      cleared:false,
      introSeen:false,
      bossDefeated:false,
      doorKeys:0,
      openDoors:[],
      rescued:[],
      chestOpened:false,
      reinforcements:[],
      units:[...buildAlliesFromPrologue(),...specialUnits(),...enemyUnits()],
      log:['砦内部へ侵入した。周囲を確認せよ。']
    };
  }

  function migrate(saved) {
    if (!saved || !Array.isArray(saved.units)) return null;
    saved.openDoors = Array.isArray(saved.openDoors) ? saved.openDoors : [];
    saved.rescued = Array.isArray(saved.rescued) ? saved.rescued : [];
    saved.reinforcements = Array.isArray(saved.reinforcements) ? saved.reinforcements : [];
    saved.doorKeys = Number.isFinite(saved.doorKeys) ? saved.doorKeys : 0;
    saved.version = SAVE_VERSION;
    return saved;
  }

  function init() {
    state = migrate(safeParse(SAVE_KEY)) || freshState();
    buildMap();
    bindUI();
    render();
    save(true);
    if (!state.introSeen) {
      state.introSeen = true;
      save(true);
      setTimeout(() => playScene(introScene,'第2章'),120);
    }
  }

  function buildMap() {
    mapEl.innerHTML = '';
    mapEl.style.gridTemplateColumns = `repeat(${W},var(--tile))`;
    mapEl.style.gridTemplateRows = `repeat(${H},var(--tile))`;
    for (let y=0;y<H;y++) {
      for (let x=0;x<W;x++) {
        const tile = document.createElement('div');
        tile.className = `tile ${mapData[y][x]}`;
        tile.dataset.x = x;
        tile.dataset.y = y;
        tile.addEventListener('click',() => onTile(x,y));
        mapEl.appendChild(tile);
      }
    }
  }

  function bindUI() {
    $('#dangerButton').addEventListener('click',() => {
      dangerVisible = !dangerVisible;
      render();
    });
    $('#endTurnButton').addEventListener('click',() => {
      if (state.phase !== 'ally' || busy || state.cleared) return;
      if (confirm('自軍ターンを終了しますか？')) endAllyTurn();
    });
    $('#menuButton').addEventListener('click',showMenu);
    $('#storyBack').addEventListener('click',() => stepStory(-1));
    $('#storyNext').addEventListener('click',() => stepStory(1));
  }

  function key(x,y) { return `${x},${y}`; }
  function dist(a,b) { return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }
  function byId(id) { return state.units.find(unit => unit.id === id); }
  function unitAt(x,y) { return state.units.find(unit => unit.hp > 0 && unit.x === x && unit.y === y && !unit.rescued); }
  function tileEl(x,y) { return mapEl.children[y*W+x]; }

  function isDoorOpen(x,y) {
    return state.openDoors.includes(key(x,y));
  }

  function terrainAt(x,y) {
    const type = mapData[y][x];
    if (type === 'door' && isDoorOpen(x,y)) return terrain.floor;
    return terrain[type];
  }

  function onTile(x,y) {
    if (busy || state.cleared || state.phase !== 'ally' || !$('#storyOverlay').hidden || !$('#levelOverlay').hidden) return;
    const clicked = unitAt(x,y);
    const selected = byId(selectedId);

    if (selected && selected.faction === 'ally' && !selected.acted && clicked && clicked.faction === 'enemy' && canAttack(selected,clicked)) {
      showForecast(selected,clicked);
      return;
    }

    if (pendingMove) {
      if (clicked && ['neutral','civilian'].includes(clicked.faction) && dist(selected,clicked) === 1) {
        showActions(selected);
        return;
      }
      if (x === pendingMove.x && y === pendingMove.y) {
        showActions(selected);
        return;
      }
      cancelMove();
    }

    if (clicked) {
      if (clicked.faction === 'ally' && !clicked.acted) selectUnit(clicked);
      else {
        selectedId = clicked.id;
        reachable.clear();
        attackTiles.clear();
        render();
      }
      return;
    }

    if (selected && selected.faction === 'ally' && !selected.acted && reachable.has(key(x,y))) {
      if (unitAt(x,y)) return;
      pendingMove = { fromX:selected.x,fromY:selected.y,x,y };
      selected.x = x;
      selected.y = y;
      reachable.clear();
      attackTiles = getAttackTiles(selected);
      render();
      showActions(selected);
      return;
    }
    clearSelection();
  }

  function selectUnit(unit) {
    selectedId = unit.id;
    pendingMove = null;
    reachable = movementRange(unit);
    attackTiles = getAttackTiles(unit,reachable);
    render();
  }

  function clearSelection() {
    selectedId = null;
    pendingMove = null;
    reachable.clear();
    attackTiles.clear();
    render();
  }

  function cancelMove() {
    const unit = byId(selectedId);
    if (unit && pendingMove) {
      unit.x = pendingMove.fromX;
      unit.y = pendingMove.fromY;
    }
    pendingMove = null;
    if (unit) selectUnit(unit);
    else clearSelection();
  }

  function movementRange(unit) {
    const result = new Map([[key(unit.x,unit.y),0]]);
    const queue = [[unit.x,unit.y,0]];
    while (queue.length) {
      const [x,y,cost] = queue.shift();
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx, ny=y+dy;
        if (nx<0||ny<0||nx>=W||ny>=H) continue;
        const tile = terrainAt(nx,ny);
        const nextCost = cost + tile.move;
        const occupant = unitAt(nx,ny);
        const blocks = occupant && occupant.id !== unit.id && occupant.faction !== unit.faction;
        if (tile.move >= 99 || nextCost > unit.move || blocks) continue;
        const tileKey = key(nx,ny);
        if (!result.has(tileKey) || nextCost < result.get(tileKey)) {
          result.set(tileKey,nextCost);
          queue.push([nx,ny,nextCost]);
        }
      }
    }
    return result;
  }

  function currentWeapon(unit) {
    return weapons[unit.weapon] || null;
  }

  function getAttackTiles(unit,rangeMap=null) {
    const weapon = currentWeapon(unit);
    const result = new Set();
    if (!weapon || weapon.type === 'staff' || weaponRangeLeft(unit) <= 0) return result;
    const origins = rangeMap ? [...rangeMap.keys()].map(v => v.split(',').map(Number)) : [[unit.x,unit.y]];
    for (const [x,y] of origins) {
      for (let yy=0;yy<H;yy++) {
        for (let xx=0;xx<W;xx++) {
          if (weapon.range.includes(Math.abs(xx-x)+Math.abs(yy-y))) result.add(key(xx,yy));
        }
      }
    }
    return result;
  }

  function weaponRangeLeft(unit) {
    if (currentWeapon(unit)?.type === 'staff') return unit.staves?.[unit.weapon] || 0;
    return Number.isFinite(unit.weaponUses) ? unit.weaponUses : currentWeapon(unit)?.uses || 0;
  }

  function canAttack(attacker,defender) {
    const weapon = currentWeapon(attacker);
    return Boolean(
      weapon &&
      weapon.type !== 'staff' &&
      weaponRangeLeft(attacker) > 0 &&
      weapon.range.includes(dist(attacker,defender))
    );
  }

  function adjacentDoors(unit) {
    const result = [];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=unit.x+dx,y=unit.y+dy;
      if (x>=0&&y>=0&&x<W&&y<H&&mapData[y][x]==='door'&&!isDoorOpen(x,y)) result.push({x,y});
    }
    return result;
  }

  function adjacentPrisoners(unit) {
    return state.units.filter(other => {
      const requiredDoor = other.id === 'prisoner1' ? key(3,8) : key(12,2);
      return (
        other.faction === 'civilian' &&
        other.hp > 0 &&
        !other.rescued &&
        state.openDoors.includes(requiredDoor) &&
        dist(unit,other) === 1
      );
    });
  }

  function getHealTargets(unit) {
    if (currentWeapon(unit)?.type !== 'staff') return [];
    return state.units.filter(target =>
      target.faction === 'ally' &&
      target.id !== unit.id &&
      target.hp > 0 &&
      target.hp < target.maxHp &&
      dist(unit,target) === 1
    );
  }

  function showActions(unit) {
    const box = $('#actionButtons');
    box.innerHTML = '';
    const enemies = state.units.filter(other => other.faction==='enemy'&&other.hp>0&&canAttack(unit,other));
    const healTargets = getHealTargets(unit);
    const talkTarget = state.units.find(other => other.id==='hina'&&other.faction==='neutral'&&dist(unit,other)===1&&['kumi','toshi','kyoko'].includes(unit.id));
    const doors = adjacentDoors(unit);
    const prisoners = adjacentPrisoners(unit);

    if (enemies.length) addAction('攻撃',() => chooseTarget(unit,enemies));
    if (healTargets.length) addAction('杖',() => showStaffMenu(unit,healTargets));
    if (talkTarget) addAction('会話',() => talkToHina(unit,talkTarget));
    if (doors.length && (unit.id==='hina' || state.doorKeys>0)) addAction('開錠',() => openDoor(unit,doors[0]));
    if (prisoners.length) addAction('救出',() => rescuePrisoner(unit,prisoners[0]));
    if (mapData[unit.y][unit.x]==='chest'&&!state.chestOpened&&unit.id==='hina') addAction('宝箱',() => openChest(unit));
    if (mapData[unit.y][unit.x]==='exit'&&unit.lord&&canClearChapter()) addAction('脱出',clearChapter);
    addAction('待機',() => finishAction(unit));
    if (pendingMove) addAction('取消',cancelMove);
  }

  function addAction(label,fn) {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = fn;
    $('#actionButtons').appendChild(button);
  }

  function chooseTarget(attacker,enemies) {
    attackTiles = getAttackTiles(attacker);
    document.querySelectorAll('.tile').forEach(tile => tile.classList.remove('target'));
    enemies.forEach(enemy => tileEl(enemy.x,enemy.y).classList.add('target'));
    toast('攻撃する敵をタップ');
  }

  function showStaffMenu(healer,targets) {
    const staffIds = ['live','relive'].filter(id => (healer.staves?.[id] || 0) > 0);
    $('#modalContent').innerHTML = `
      <h2>杖を選ぶ</h2>
      <div id="staffList" class="modal-actions"></div>
      <div class="modal-actions"><button id="staffCancel">戻る</button></div>`;
    const list = $('#staffList');
    staffIds.forEach(id => {
      const staff = weapons[id];
      const button = document.createElement('button');
      button.textContent = `${staff.name} ${healer.staves[id]}/${staff.uses}`;
      button.onclick = () => showHealTargets(healer,id,targets);
      list.appendChild(button);
    });
    $('#staffCancel').onclick = () => $('#modal').close();
    $('#modal').showModal();
  }

  function showHealTargets(healer,staffId,targets) {
    const staff = weapons[staffId];
    $('#modalContent').innerHTML = `
      <h2>${staff.name}</h2>
      <div id="healList" class="modal-actions"></div>
      <div class="modal-actions"><button id="healBack">戻る</button></div>`;
    const list = $('#healList');
    targets.forEach(target => {
      const amount = Math.min(target.maxHp-target.hp,staff.heal+healer.mag);
      const button = document.createElement('button');
      button.textContent = `${target.name}　HP ${target.hp}/${target.maxHp}　＋${amount}`;
      button.onclick = () => {
        $('#modal').close();
        useStaff(healer,target,staffId);
      };
      list.appendChild(button);
    });
    $('#healBack').onclick = () => showStaffMenu(healer,targets);
  }

  async function useStaff(healer,target,staffId) {
    if (busy) return;
    busy = true;
    const staff = weapons[staffId];
    const before = target.hp;
    target.hp = Math.min(target.maxHp,target.hp+staff.heal+healer.mag);
    healer.staves[staffId] -= 1;
    addLog(`${healer.name}は${staff.name}を使った。${target.name}のHP ${before}→${target.hp}`);
    render();
    await animateHeal(target);
    await gainExp(healer,staff.exp);
    busy = false;
    finishAction(healer);
  }

  async function talkToHina(talker,hina) {
    if (state.rescued.length < 2) {
      await playScene(earlyTalkScene,'戦場会話');
      showActions(talker);
      return;
    }
    await playScene(joinTalkScene,'戦場会話');
    hina.faction = 'ally';
    hina.acted = false;
    addLog(`${hina.name}が行動を共にすることになった。`);
    finishAction(talker);
  }

  function openDoor(unit,door) {
    state.openDoors.push(key(door.x,door.y));
    if (unit.id !== 'hina') state.doorKeys = Math.max(0,state.doorKeys-1);
    addLog(`${unit.name}が扉を開いた。`);
    render();
    finishAction(unit);
  }

  function rescuePrisoner(unit,prisoner) {
    prisoner.rescued = true;
    prisoner.hp = 0;
    if (!state.rescued.includes(prisoner.id)) state.rescued.push(prisoner.id);
    addLog(`${unit.name}が囚われていた人を安全な通路へ逃がした。`);
    toast(`救出 ${state.rescued.length}/2`);
    finishAction(unit);
  }

  function openChest(unit) {
    state.chestOpened = true;
    unit.spd += 1;
    unit.lck += 1;
    addLog(`${unit.name}が宝箱から軽業の護符を取り戻した。速さ・幸運＋1`);
    finishAction(unit);
  }

  function showForecast(attacker,defender) {
    const attackResult = forecast(attacker,defender);
    const counterResult = canAttack(defender,attacker) ? forecast(defender,attacker) : null;
    $('#modalContent').innerHTML = `
      <h2>戦闘予測</h2>
      <div class="forecast">
        ${forecastSide(attacker,attackResult)}
        <div class="vs">VS</div>
        ${forecastSide(defender,counterResult)}
      </div>
      <p>${triangleText(attacker,defender)}</p>
      <div class="modal-actions"><button id="attackConfirm">攻撃</button><button id="attackCancel">戻る</button></div>`;
    $('#modal').showModal();
    $('#attackConfirm').onclick = () => {
      $('#modal').close();
      battle(attacker,defender);
    };
    $('#attackCancel').onclick = () => $('#modal').close();
  }

  function forecastSide(unit,result) {
    if (!result) return `<div><strong>${unit.name}</strong><p>反撃不可</p></div>`;
    return `<div><strong>${unit.name}</strong><table>
      <tr><td>HP</td><td>${unit.hp}</td></tr>
      <tr><td>威力</td><td>${result.damage}×${result.hits}</td></tr>
      <tr><td>命中</td><td>${result.hit}%</td></tr>
      <tr><td>必殺</td><td>${result.crit}%</td></tr>
    </table></div>`;
  }

  function triangle(attacker,defender) {
    const A=currentWeapon(attacker)?.type,D=currentWeapon(defender)?.type;
    const win=(A==='sword'&&D==='axe')||(A==='axe'&&D==='lance')||(A==='lance'&&D==='sword');
    const lose=(D==='sword'&&A==='axe')||(D==='axe'&&A==='lance')||(D==='lance'&&A==='sword');
    if (win) return {hit:15,might:1,state:'有利'};
    if (lose) return {hit:-15,might:-1,state:'不利'};
    return {hit:0,might:0,state:'なし'};
  }

  function triangleText(a,d) {
    const result=triangle(a,d);
    return result.state==='なし'?'武器相性補正なし':`武器相性：${a.name}が${result.state}`;
  }

  function supportBonus(unit) {
    if (!['toshi','kyoko'].includes(unit.id)) return {hit:0,crit:0};
    const other=byId(unit.id==='toshi'?'kyoko':'toshi');
    return other&&other.hp>0&&dist(unit,other)<=2?{hit:10,crit:5}:{hit:0,crit:0};
  }

  function forecast(attacker,defender) {
    const aw=currentWeapon(attacker),dw=currentWeapon(defender);
    const tri=triangle(attacker,defender);
    const tile=terrainAt(defender.x,defender.y);
    const attack=(aw.type==='magic'?attacker.mag:attacker.str)+aw.might+tri.might;
    const defense=aw.type==='magic'?defender.res:defender.def+tile.def;
    const damage=Math.max(0,attack-defense);
    const attackSpeed=Math.max(0,attacker.spd-Math.max(0,aw.weight-attacker.str));
    const defenderWeight=dw?.weight||0;
    const defenderSpeed=Math.max(0,defender.spd-Math.max(0,defenderWeight-defender.str));
    const hit=Math.max(0,Math.min(100,aw.hit+attacker.skl*2+attacker.lck+tri.hit-(defender.spd*2+defender.lck+tile.avo)+supportBonus(attacker).hit));
    const crit=Math.max(0,Math.min(100,aw.crit+Math.floor(attacker.skl/2)-defender.lck+supportBonus(attacker).crit));
    return {damage,hit,crit,hits:attackSpeed-defenderSpeed>=4?2:1};
  }

  async function battle(attacker,defender) {
    if (busy) return;
    busy = true;
    const aStart=attacker.hp,dStart=defender.hp;
    await strike(attacker,defender,false);
    if (defender.hp>0&&attacker.hp>0&&canAttack(defender,attacker)) await strike(defender,attacker,false);
    if (attacker.hp>0&&defender.hp>0&&forecast(attacker,defender).hits===2) await strike(attacker,defender,true);
    if (defender.hp<=0) defeat(defender,attacker);
    if (attacker.hp<=0) defeat(attacker,defender);
    if (attacker.faction==='ally'&&attacker.hp>0&&dStart>defender.hp) await gainCombatExp(attacker,defender);
    addLog(`${attacker.name} HP ${aStart}→${Math.max(0,attacker.hp)} / ${defender.name} HP ${dStart}→${Math.max(0,defender.hp)}`);
    busy = false;
    if (attacker.faction==='ally'&&attacker.hp>0) finishAction(attacker);
    else {
      clearSelection();
      checkDefeat();
    }
  }

  async function strike(attacker,defender,followUp) {
    if (attacker.hp<=0||defender.hp<=0||!canAttack(attacker,defender)) return;
    const result=forecast(attacker,defender);
    decrementWeapon(attacker);
    await animateHit(defender);
    if (Math.random()*100>=result.hit) {
      addLog(`${attacker.name}の攻撃は外れた。`);
      return;
    }
    const critical=Math.random()*100<result.crit;
    const damage=result.damage*(critical?3:1);
    defender.hp=Math.max(0,defender.hp-damage);
    addLog(`${attacker.name}${followUp?'の追撃':''}！ ${critical?'必殺の一撃！ ':''}${defender.name}に${damage}ダメージ。`);
    render();
    await sleep(230);
  }

  function decrementWeapon(unit) {
    if (currentWeapon(unit)?.type==='staff') return;
    unit.weaponUses=Math.max(0,weaponRangeLeft(unit)-1);
    if (unit.weaponUses===0) addLog(`${unit.name}の${currentWeapon(unit).name}が壊れた。`);
  }

  function defeat(unit) {
    addLog(`${unit.name}は戦闘不能になった。`);
    if (unit.hasKey) {
      state.doorKeys += 1;
      addLog('扉の鍵を手に入れた。');
    }
    if (unit.boss) {
      state.bossDefeated = true;
      addLog('出口を守る敵将を退けた。');
    }
  }

  function combatExp(unit,enemy) {
    const difference=(enemy.lv||1)-(unit.lv||1);
    if (enemy.hp<=0) {
      if (enemy.boss) return 100;
      return Math.max(15,Math.min(80,40+difference*8));
    }
    return Math.max(5,Math.min(18,10+difference*2));
  }

  async function gainCombatExp(unit,enemy) {
    const amount=combatExp(unit,enemy);
    addLog(`${unit.name}は経験値を${amount}獲得した。`);
    await gainExp(unit,amount);
  }

  async function gainExp(unit,amount) {
    unit.exp=(unit.exp||0)+amount;
    while (unit.exp>=100) {
      unit.exp-=100;
      const oldLevel=unit.lv;
      const before={maxHp:unit.maxHp,str:unit.str,mag:unit.mag,skl:unit.skl,spd:unit.spd,lck:unit.lck,def:unit.def,res:unit.res};
      unit.lv+=1;
      const gains={};
      const rates=growths[unit.id]||{maxHp:.60,str:.40,mag:.10,skl:.45,spd:.45,lck:.40,def:.35,res:.20};
      Object.entries(rates).forEach(([stat,rate]) => {
        if (Math.random()<rate) {
          unit[stat]+=1;
          if (stat==='maxHp') unit.hp+=1;
          gains[stat]=1;
        }
      });
      addLog(`${unit.name}はレベル${unit.lv}になった！`);
      render();
      await showLevelUp(unit,oldLevel,before,gains);
    }
  }

  async function showLevelUp(unit,oldLevel,before,gains) {
    const labels={maxHp:'HP',str:'力',mag:'魔力',skl:'技',spd:'速さ',lck:'幸運',def:'守備',res:'魔防'};
    const order=['maxHp','str','mag','skl','spd','lck','def','res'];
    $('#levelPortrait').src=PORTRAITS[unit.name]||'';
    $('#levelName').textContent=unit.name;
    $('#levelClass').textContent=unit.className;
    $('#oldLevel').textContent=oldLevel;
    $('#newLevel').textContent=unit.lv;
    $('#levelStats').innerHTML=order.map(stat => `
      <div class="level-stat ${gains[stat]?'pending':'no-gain'}" data-stat="${stat}">
        <span>${labels[stat]}</span><span class="before">${before[stat]}</span><span class="after">${unit[stat]}</span><span class="gain">+1</span>
      </div>`).join('');
    const raised=order.filter(stat => gains[stat]);
    $('#levelMessage').textContent='能力値を確認してください';
    $('#levelConfirm').disabled=true;
    $('#levelOverlay').hidden=false;
    for (const stat of raised) {
      await sleep(300);
      $('#levelStats').querySelector(`[data-stat="${stat}"]`)?.classList.add('raised');
    }
    $('#levelMessage').textContent=raised.length?`${raised.length}項目の能力が上昇した！`:'能力上昇なし';
    await sleep(200);
    $('#levelConfirm').disabled=false;
    await new Promise(resolve => {
      const close=() => {
        $('#levelConfirm').removeEventListener('click',close);
        $('#levelOverlay').hidden=true;
        resolve();
      };
      $('#levelConfirm').addEventListener('click',close);
    });
  }

  function finishAction(unit) {
    unit.acted=true;
    selectedId=null;
    pendingMove=null;
    reachable.clear();
    attackTiles.clear();
    save(true);
    render();
    const allies=state.units.filter(other => other.faction==='ally'&&other.hp>0);
    if (allies.length&&allies.every(other => other.acted)) setTimeout(endAllyTurn,250);
  }

  async function endAllyTurn() {
    if (busy||state.cleared) return;
    state.phase='enemy';
    clearTransient();
    render();
    toast('敵軍フェイズ');
    await sleep(400);
    await enemyPhase();
    if (state.cleared) return;
    state.phase='neutral';
    render();
    await neutralPhase();
    if (state.cleared) return;
    state.turn+=1;
    spawnReinforcements();
    state.phase='ally';
    state.units.filter(unit => unit.faction==='ally'&&unit.hp>0).forEach(unit => {unit.acted=false;});
    healForts();
    save(true);
    render();
    toast(`ターン ${state.turn}`);
  }

  function clearTransient() {
    selectedId=null;
    pendingMove=null;
    reachable.clear();
    attackTiles.clear();
  }

  async function enemyPhase() {
    busy=true;
    for (const enemy of state.units.filter(unit => unit.faction==='enemy'&&unit.hp>0)) {
      const targets=state.units.filter(unit => unit.faction==='ally'&&unit.hp>0);
      if (!targets.length) break;
      const nearest=Math.min(...targets.map(target => dist(enemy,target)));
      if (enemy.ai==='guard'&&nearest>5&&state.turn<4) continue;
      if (enemy.ai==='hold'&&nearest>2) continue;
      let target=targets.slice().sort((a,b)=>dist(enemy,a)-dist(enemy,b))[0];
      if (!canAttack(enemy,target)&&enemy.move>0) {
        const step=bestMove(enemy,targets);
        if (step) {
          enemy.x=step.x;
          enemy.y=step.y;
          render();
          await sleep(150);
        }
      }
      target=targets.filter(candidate => canAttack(enemy,candidate)).sort((a,b)=>a.hp-b.hp)[0];
      if (target) await battleEnemy(enemy,target);
    }
    busy=false;
    checkDefeat();
  }

  function bestMove(unit,targets) {
    const range=movementRange(unit);
    let best=null,score=Infinity;
    for (const tileKey of range.keys()) {
      const [x,y]=tileKey.split(',').map(Number);
      if (unitAt(x,y)&&!(x===unit.x&&y===unit.y)) continue;
      const value=Math.min(...targets.map(target => Math.abs(x-target.x)+Math.abs(y-target.y)))-terrainAt(x,y).def*.2;
      if (value<score) {
        score=value;
        best={x,y};
      }
    }
    return best;
  }

  async function battleEnemy(enemy,target) {
    const enemyStart=enemy.hp;
    await strike(enemy,target,false);
    if (target.hp>0&&enemy.hp>0&&canAttack(target,enemy)) await strike(target,enemy,false);
    if (enemy.hp>0&&target.hp>0&&forecast(enemy,target).hits===2) await strike(enemy,target,true);
    if (target.hp<=0) defeat(target,enemy);
    if (enemy.hp<=0) defeat(enemy,target);
    if (target.faction==='ally'&&target.hp>0&&enemyStart>enemy.hp) await gainCombatExp(target,enemy);
    render();
    await sleep(220);
  }

  async function neutralPhase() {
    const hina=byId('hina');
    if (!hina||hina.hp<=0||hina.faction!=='neutral') return;
    busy=true;
    toast('中立フェイズ');
    await sleep(250);

    if (!state.chestOpened) {
      const chest={x:11,y:8};
      await neutralMoveToward(hina,chest);
      if (hina.x===chest.x&&hina.y===chest.y) {
        state.chestOpened=true;
        hina.spd+=1;
        hina.lck+=1;
        addLog(`${hina.name}が宝箱を開け、何かを取り戻した。`);
        render();
        await sleep(300);
      }
      busy=false;
      return;
    }

    if (!isDoorOpen(12,2)) {
      await neutralMoveToward(hina,{x:12,y:3});
      if (Math.abs(hina.x-12)+Math.abs(hina.y-2)===1) {
        state.openDoors.push(key(12,2));
        addLog(`${hina.name}が牢の扉を開いた。`);
        render();
        await sleep(280);
      }
      busy=false;
      return;
    }

    const prisoner=byId('prisoner2');
    if (prisoner&&!prisoner.rescued&&prisoner.hp>0) {
      await neutralMoveToward(hina,{x:13,y:2});
      if (dist(hina,prisoner)===1) {
        prisoner.rescued=true;
        prisoner.hp=0;
        if (!state.rescued.includes(prisoner.id)) state.rescued.push(prisoner.id);
        addLog(`${hina.name}が囚われていた人を逃がした。`);
        render();
        await sleep(300);
      }
      busy=false;
      return;
    }

    await neutralMoveToward(hina,{x:12,y:1});
    busy=false;
  }

  async function neutralMoveToward(unit,target) {
    const range=movementRange(unit);
    let best={x:unit.x,y:unit.y},score=Math.abs(unit.x-target.x)+Math.abs(unit.y-target.y);
    for (const tileKey of range.keys()) {
      const [x,y]=tileKey.split(',').map(Number);
      if (unitAt(x,y)&&!(x===unit.x&&y===unit.y)) continue;
      const next=Math.abs(x-target.x)+Math.abs(y-target.y);
      if (next<score) {
        score=next;
        best={x,y};
      }
    }
    if (best.x!==unit.x||best.y!==unit.y) {
      unit.x=best.x;
      unit.y=best.y;
      render();
      await sleep(220);
    }
  }

  function spawnReinforcements() {
    const batches={
      5:[
        {id:'r5a',name:'増援兵',short:'斧',faction:'enemy',className:'戦士',x:1,y:5,lv:3,hp:19,maxHp:19,str:7,mag:0,skl:4,spd:5,lck:1,def:4,res:0,move:4,weapon:'ironAxe',weaponUses:40,ai:'advance'},
        {id:'r5b',name:'増援兵',short:'槍',faction:'enemy',className:'兵士',x:14,y:7,lv:3,hp:18,maxHp:18,str:6,mag:0,skl:5,spd:5,lck:1,def:5,res:1,move:4,weapon:'ironLance',weaponUses:40,ai:'advance'}
      ],
      8:[
        {id:'r8a',name:'増援兵',short:'弓',faction:'enemy',className:'弓兵',x:7,y:1,lv:4,hp:18,maxHp:18,str:7,mag:0,skl:7,spd:5,lck:2,def:3,res:1,move:4,weapon:'ironBow',weaponUses:40,ai:'advance'}
      ]
    };
    const batch=batches[state.turn];
    if (!batch||state.reinforcements.includes(state.turn)) return;
    state.reinforcements.push(state.turn);
    state.units.push(...batch);
    addLog('砦内に新たな足音が響いた。');
  }

  function healForts() {
    state.units.filter(unit => unit.hp>0&&terrainAt(unit.x,unit.y).heal).forEach(unit => {
      unit.hp=Math.min(unit.maxHp,unit.hp+terrainAt(unit.x,unit.y).heal);
    });
  }

  function canClearChapter() {
    return state.bossDefeated&&state.rescued.length>=2;
  }

  function clearChapter() {
    state.cleared=true;
    const roster=state.units.filter(unit => unit.faction==='ally'&&unit.hp>0).map(unit => ({...unit,acted:false,hp:unit.maxHp}));
    localStorage.setItem(ROSTER_KEY,JSON.stringify({chapter:2,units:roster}));
    save(true);
    $('#modalContent').innerHTML=`
      <h2>第2章クリア</h2>
      <p>一行は砦を抜け、次の目的地へ向かった。</p>
      <p>戦績　ターン ${state.turn}／救出 ${state.rescued.length}</p>
      <div class="modal-actions"><button id="replayChapter">第2章をやり直す</button><a class="icon-button" href="../">序章へ</a></div>`;
    $('#modal').showModal();
    $('#replayChapter').onclick=() => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    };
  }

  function checkDefeat() {
    const kumi=byId('kumi');
    if (!kumi||kumi.hp<=0||!state.units.some(unit => unit.faction==='ally'&&unit.hp>0)) {
      $('#modalContent').innerHTML=`
        <h2>敗北</h2>
        <p>部隊は砦を突破できなかった。</p>
        <div class="modal-actions"><button id="retry">やり直す</button><button id="loadBtn">読込</button></div>`;
      $('#modal').showModal();
      $('#retry').onclick=() => {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      };
      $('#loadBtn').onclick=() => {
        state=migrate(safeParse(SAVE_KEY))||freshState();
        $('#modal').close();
        render();
      };
    }
  }

  function showMenu() {
    $('#modalContent').innerHTML=`
      <h2>メニュー</h2>
      <div class="modal-actions"><button id="saveBtn">セーブ</button><button id="loadBtn">読込</button></div>
      <div class="modal-actions"><button id="introBtn">章導入を読む</button><button id="restartBtn">第2章を最初から</button></div>
      <p>扉の鍵 ${state.doorKeys}個　救出 ${state.rescued.length}/2</p>`;
    $('#modal').showModal();
    $('#saveBtn').onclick=() => {save(false);$('#modal').close();};
    $('#loadBtn').onclick=() => {
      const saved=migrate(safeParse(SAVE_KEY));
      if (saved) {
        state=saved;
        clearTransient();
        $('#modal').close();
        render();
        toast('読み込みました');
      }
    };
    $('#introBtn').onclick=() => {
      $('#modal').close();
      playScene(introScene,'第2章');
    };
    $('#restartBtn').onclick=() => {
      if (confirm('現在の第2章の進行を消して最初から始めますか？')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }
    };
  }

  function save(silent) {
    state.version=SAVE_VERSION;
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    if (!silent) toast('セーブしました');
  }

  function render() {
    $('#turnLabel').textContent=state.turn;
    $('#phaseLabel').textContent=state.phase==='ally'?'自軍':state.phase==='enemy'?'敵軍':'中立';
    $('#objectiveLabel').textContent=canClearChapter()?'久美を脱出地点へ':'囚われた人々を救出し、出口を確保';
    document.querySelectorAll('.tile').forEach(tile => {
      const x=+tile.dataset.x,y=+tile.dataset.y;
      tile.className=`tile ${mapData[y][x]}`;
      if (mapData[y][x]==='door'&&isDoorOpen(x,y)) tile.classList.add('open');
      if (mapData[y][x]==='chest'&&state.chestOpened) tile.classList.add('open');
      const tileKey=key(x,y);
      if (reachable.has(tileKey)) tile.classList.add('move');
      if (attackTiles.has(tileKey)&&!reachable.has(tileKey)) tile.classList.add('attack');
    });
    const selected=byId(selectedId);
    if (selected&&selected.hp>0) tileEl(selected.x,selected.y).classList.add('selected');
    if (dangerVisible) renderDanger();
    renderUnits();
    renderCard(selected);
    renderLog();
    if (!pendingMove) $('#actionButtons').innerHTML='';
    $('#endTurnButton').disabled=state.phase!=='ally'||busy||state.cleared;
  }

  function renderDanger() {
    state.units.filter(unit => unit.faction==='enemy'&&unit.hp>0).forEach(enemy => {
      const range=movementRange(enemy);
      const attacks=getAttackTiles(enemy,range);
      attacks.forEach(tileKey => {
        const [x,y]=tileKey.split(',').map(Number);
        tileEl(x,y).classList.add('danger-zone');
      });
    });
  }

  function renderUnits() {
    mapEl.querySelectorAll('.unit').forEach(node => node.remove());
    const tileSize=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile'))||54;
    state.units.filter(unit => unit.hp>0&&!unit.rescued).forEach(unit => {
      const node=document.createElement('div');
      node.className=`unit ${unit.faction}${unit.acted?' acted':''}${unit.boss?' boss':''}`;
      node.style.left=`${unit.x*tileSize+5}px`;
      node.style.top=`${unit.y*tileSize+5}px`;
      node.title=`${unit.name} HP ${unit.hp}/${unit.maxHp}`;
      node.innerHTML=`<span class="class-mark">${classMarks[unit.className]||unit.short}</span><span class="hp-mini"><i style="width:${unit.hp/unit.maxHp*100}%"></i></span>`;
      mapEl.appendChild(node);
    });
  }

  function renderCard(unit) {
    const card=$('#unitCard');
    if (!unit) {
      card.className='panel-card empty';
      card.innerHTML='<h2>ユニット情報</h2><p>ユニットをタップしてください。</p>';
      return;
    }
    const weapon=currentWeapon(unit);
    const portrait=PORTRAITS[unit.name]||'';
    card.className='panel-card';
    card.innerHTML=`
      <div class="unit-head">
        ${portrait?`<img src="${portrait}" alt="">`:''}
        <div class="unit-title"><h2>${unit.name}</h2><p>${unit.className}　Lv.${unit.lv}</p><strong>HP ${unit.hp}/${unit.maxHp}</strong></div>
      </div>
      <div class="hpbar"><i style="width:${unit.hp/unit.maxHp*100}%"></i></div>
      <div class="stats">${stat('力',unit.str)}${stat('魔',unit.mag)}${stat('技',unit.skl)}${stat('速',unit.spd)}${stat('幸',unit.lck)}${stat('守',unit.def)}${stat('魔防',unit.res)}${stat('移動',unit.move)}</div>
      <div class="inventory">${weapon?`${weapon.name}　残り ${weaponRangeLeft(unit)}`:'装備なし'}　EXP ${unit.exp||0}/100</div>`;
  }

  function stat(name,value) {
    return `<div class="stat"><span>${name}</span><b>${value}</b></div>`;
  }

  function renderLog() {
    logEl.innerHTML=state.log.slice(-24).map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`).join('');
    logEl.scrollTop=logEl.scrollHeight;
  }

  function addLog(text) {
    state.log.push(text);
    renderLog();
  }

  function toast(text) {
    const node=$('#toast');
    node.textContent=text;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'),1400);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,ms));
  }

  async function animateHit(unit) {
    const node=[...mapEl.querySelectorAll('.unit')].find(item => item.title.startsWith(unit.name));
    if (!node) return;
    node.classList.add('hit');
    await sleep(130);
    node.classList.remove('hit');
  }

  async function animateHeal(unit) {
    const node=[...mapEl.querySelectorAll('.unit')].find(item => item.title.startsWith(unit.name));
    if (!node) return;
    node.classList.add('healed');
    await sleep(430);
    node.classList.remove('healed');
  }

  function playScene(lines,title='会話') {
    return new Promise(resolve => {
      storyState={lines,index:0,title,resolve,history:[]};
      $('#storyOverlay').hidden=false;
      renderStory();
    });
  }

  function stepStory(delta) {
    if (!storyState) return;
    if (delta<0&&storyState.index>0) {
      storyState.index-=1;
      renderStory();
      return;
    }
    if (delta>0&&storyState.index<storyState.lines.length-1) {
      storyState.index+=1;
      renderStory();
      return;
    }
    if (delta>0&&storyState.index===storyState.lines.length-1) {
      const resolve=storyState.resolve;
      storyState=null;
      $('#storyOverlay').hidden=true;
      resolve();
    }
  }

  function renderStory() {
    const line=storyState.lines[storyState.index];
    $('#storyChapter').textContent=storyState.title;
    $('#storyBack').disabled=storyState.index===0;
    $('#storyNext').textContent=storyState.index===storyState.lines.length-1?'閉じる':'次へ';

    if (!PORTRAITS[line.speaker]) {
      $('#storyWindows').innerHTML=`
        <div class="speech narration active">
          <div class="speech-box"><span class="speaker">${line.speaker}</span><div>${escapeHtml(line.text)}</div></div>
        </div>`;
      return;
    }

    const previous=[...storyState.lines.slice(0,storyState.index)].reverse().find(item => PORTRAITS[item.speaker]&&item.speaker!==line.speaker);
    const currentSide=line.side==='right'?'bottom':'top';
    const previousSide=currentSide==='top'?'bottom':'top';
    const current=speechMarkup(line,currentSide,true);
    const old=previous?speechMarkup(previous,previousSide,false):'';
    $('#storyWindows').innerHTML=old+current;
  }

  function speechMarkup(line,position,active) {
    const portrait=PORTRAITS[line.speaker]||'';
    return `<div class="speech ${position} ${active?'active':''}">
      <div class="portrait"><img src="${portrait}" alt=""></div>
      <div class="speech-box"><span class="speaker">${line.speaker}</span><div>${escapeHtml(line.text)}</div></div>
    </div>`;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }

  init();
})();
