(() => {
  'use strict';

  const TILE = 56;
  const SAVE_KEY = 'hinata-senki-save-v1';
  const SAVE_VERSION = 2;
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
    live: { name:'ライブ', type:'staff', heal:10, range:[1], uses:20, exp:11 },
    relive: { name:'リライブ', type:'staff', heal:20, range:[1], uses:10, exp:17 },
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
  const mapData = mapRows.map(row => [...row].map(code => codeToTerrain[code] || 'plain'));
  mapData[4][3] = 'fort';
  mapData[6][10] = 'fort';

  const baseUnits = [
    { id:'kumi', name:'佐々木久美', short:'久', faction:'ally', className:'ロード', x:6,y:9, lv:1, exp:0, hp:23,maxHp:23,str:6,mag:0,skl:7,spd:7,lck:6,def:7,res:2,move:5, weapon:'ironSword', acted:false, lord:true },
    { id:'toshi', name:'加藤史帆', short:'史', faction:'ally', className:'ソシアルナイト', x:5,y:9, lv:1, exp:0, hp:24,maxHp:24,str:8,mag:0,skl:5,spd:8,lck:5,def:7,res:1,move:7, weapon:'slimSword', acted:false },
    { id:'kyoko', name:'齊藤京子', short:'京', faction:'ally', className:'ソシアルナイト', x:7,y:9, lv:1, exp:0, hp:24,maxHp:24,str:7,mag:0,skl:8,spd:6,lck:4,def:9,res:2,move:7, weapon:'ironLance', acted:false },
    {
      id:'sarina', name:'潮紗理菜', short:'潮', faction:'neutral', className:'シスター',
      x:3,y:7, lv:1, exp:0, hp:18,maxHp:18,str:1,mag:6,skl:6,spd:6,lck:9,def:2,res:7,move:5,
      weapon:'live', staves:{ live:20, relive:10 }, acted:true, recruitable:true
    },
    { id:'e1', name:'辺境兵', short:'斧', faction:'enemy', className:'戦士', x:6,y:6, lv:1, hp:17,maxHp:17,str:5,mag:0,skl:3,spd:3,lck:1,def:3,res:0,move:4,weapon:'ironAxe',ai:'advance' },
    { id:'e2', name:'辺境兵', short:'槍', faction:'enemy', className:'兵士', x:8,y:7, lv:1, hp:17,maxHp:17,str:5,mag:0,skl:4,spd:3,lck:1,def:4,res:0,move:4,weapon:'ironLance',ai:'advance' },
    { id:'e3', name:'辺境兵', short:'斧', faction:'enemy', className:'戦士', x:4,y:5, lv:1, hp:18,maxHp:18,str:6,mag:0,skl:3,spd:4,lck:1,def:3,res:0,move:4,weapon:'ironAxe',ai:'advance' },
    { id:'e4', name:'辺境兵', short:'弓', faction:'enemy', className:'弓兵', x:9,y:5, lv:1, hp:16,maxHp:16,str:5,mag:0,skl:5,spd:4,lck:2,def:3,res:1,move:4,weapon:'ironBow',ai:'advance' },
    { id:'e5', name:'辺境兵', short:'槍', faction:'enemy', className:'兵士', x:6,y:3, lv:2, hp:18,maxHp:18,str:6,mag:0,skl:5,spd:4,lck:2,def:4,res:1,move:4,weapon:'ironLance',ai:'guard' },
    { id:'e6', name:'辺境兵', short:'斧', faction:'enemy', className:'戦士', x:10,y:3, lv:2, hp:18,maxHp:18,str:6,mag:0,skl:4,spd:4,lck:1,def:4,res:0,move:4,weapon:'handAxe',ai:'guard' },
    { id:'e7', name:'辺境兵', short:'槍', faction:'enemy', className:'兵士', x:3,y:2, lv:2, hp:18,maxHp:18,str:6,mag:0,skl:5,spd:4,lck:2,def:4,res:1,move:4,weapon:'ironLance',ai:'guard' },
    { id:'boss', name:'城門守備隊長バルガ', short:'将', faction:'enemy', className:'重装兵', x:6,y:0, lv:4, hp:21,maxHp:21,str:7,mag:0,skl:5,spd:3,lck:2,def:6,res:2,move:0,weapon:'javelin',boss:true,ai:'hold' },
  ];

  let state;
  let selectedId = null;
  let reachable = new Map();
  let attackTiles = new Set();
  let dangerVisible = false;
  let pendingMove = null;
  let busy = false;

  const $ = selector => document.querySelector(selector);
  const mapEl = $('#map');
  const logEl = $('#battleLog');

  function cloneBaseUnits() {
    return JSON.parse(JSON.stringify(baseUnits));
  }

  function freshState() {
    return {
      version:SAVE_VERSION,
      turn:1,
      phase:'ally',
      bossDefeated:false,
      villageVisited:false,
      cleared:false,
      units:cloneBaseUnits(),
      log:[
        '城門の向こうへ脱出せよ。',
        '久美「まずはみんな、生きてここを出るよ！」'
      ]
    };
  }

  function migrateState(saved) {
    if (!saved || !Array.isArray(saved.units)) return null;
    const currentById = Object.fromEntries(baseUnits.map(unit => [unit.id, unit]));

    saved.units.forEach(unit => {
      const template = currentById[unit.id];
      if (!template) return;

      if ((saved.version || 1) < SAVE_VERSION) {
        if (unit.faction === 'enemy') {
          const wasDefeated = unit.hp <= 0;
          const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 1;
          ['maxHp','str','mag','skl','spd','lck','def','res','move','ai'].forEach(keyName => {
            if (template[keyName] !== undefined) unit[keyName] = template[keyName];
          });
          unit.hp = wasDefeated
            ? 0
            : Math.max(1, Math.min(unit.maxHp, Math.round(unit.maxHp * hpRatio)));
        }

        if (unit.id === 'sarina') {
          unit.weapon = 'live';
          unit.staves = unit.staves || { live:20, relive:10 };
          unit.staves.live = Number.isFinite(unit.staves.live) ? unit.staves.live : 20;
          unit.staves.relive = Number.isFinite(unit.staves.relive) ? unit.staves.relive : 10;
        }

        if (['kumi','toshi','kyoko'].includes(unit.id)) {
          const oldMax = unit.maxHp;
          unit.maxHp = template.maxHp;
          unit.def = Math.max(unit.def, template.def);
          unit.hp = Math.min(unit.maxHp, unit.hp + Math.max(0, template.maxHp - oldMax));
        }
      }

      if (unit.id === 'sarina') {
        unit.weapon = 'live';
        unit.staves = unit.staves || { live:20, relive:10 };
      }
    });

    saved.version = SAVE_VERSION;
    return saved;
  }

  function init() {
    state = migrateState(load(false)) || freshState();
    mapEl.style.gridTemplateColumns = `repeat(${W}, var(--tile))`;
    mapEl.style.gridTemplateRows = `repeat(${H}, var(--tile))`;
    buildMap();
    bindUI();
    render();
    save(true);
  }

  function buildMap() {
    mapEl.innerHTML = '';
    for (let y=0; y<H; y++) {
      for (let x=0; x<W; x++) {
        const tile = document.createElement('div');
        tile.className = `tile ${mapData[y][x]}`;
        tile.dataset.x = x;
        tile.dataset.y = y;
        tile.title = terrain[mapData[y][x]].name;
        tile.addEventListener('click', () => onTile(x,y));
        mapEl.appendChild(tile);
      }
    }
  }

  function bindUI() {
    $('#endTurnButton').addEventListener('click', () => {
      if (state.phase !== 'ally' || busy) return;
      if (confirm('自軍ターンを終了しますか？')) endAllyTurn();
    });
    $('#dangerButton').addEventListener('click', () => {
      dangerVisible = !dangerVisible;
      render();
    });
    $('#menuButton').addEventListener('click', showMenu);
    window.addEventListener('resize', syncTileSize);
    syncTileSize();
  }

  function syncTileSize() {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || TILE;
    mapEl.dataset.tileSize = value;
    renderUnits();
  }

  function unitAt(x,y) {
    return state.units.find(unit => unit.hp > 0 && unit.x === x && unit.y === y);
  }

  function byId(id) {
    return state.units.find(unit => unit.id === id);
  }

  function dist(a,b) {
    return Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
  }

  function key(x,y) {
    return `${x},${y}`;
  }

  function isStaffUser(unit) {
    return weapons[unit.weapon]?.type === 'staff';
  }

  function onTile(x,y) {
    if (busy || state.cleared || state.phase !== 'ally') return;

    const unit = unitAt(x,y);
    const selected = byId(selectedId);

    if (
      selected &&
      selected.faction === 'ally' &&
      !selected.acted &&
      unit &&
      unit.faction === 'enemy' &&
      canAttack(selected,unit)
    ) {
      showForecast(selected,unit);
      return;
    }

    if (pendingMove) {
      if (unit && unit.faction === 'neutral' && canTalk(selected,unit)) {
        showActions(selected);
        return;
      }
      if (x === pendingMove.x && y === pendingMove.y) {
        showActions(selected);
        return;
      }
      cancelMove();
    }

    if (unit) {
      if (unit.faction === 'ally' && !unit.acted) {
        selectUnit(unit);
      } else {
        selectedId = unit.id;
        reachable.clear();
        attackTiles.clear();
        render();
      }
      return;
    }

    if (selected && selected.faction === 'ally' && !selected.acted && reachable.has(key(x,y))) {
      pendingMove = { fromX:selected.x, fromY:selected.y, x, y };
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
    attackTiles = getAttackTiles(unit, reachable);
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
        const nx = x+dx;
        const ny = y+dy;
        if (nx<0 || ny<0 || nx>=W || ny>=H) continue;

        const tile = terrain[mapData[ny][nx]];
        const nextCost = cost + tile.move;
        const occupant = unitAt(nx,ny);

        if (
          nextCost > unit.move ||
          tile.move >= 99 ||
          (occupant && occupant.id !== unit.id && occupant.faction !== unit.faction)
        ) continue;

        const tileKey = key(nx,ny);
        if (!result.has(tileKey) || nextCost < result.get(tileKey)) {
          result.set(tileKey,nextCost);
          queue.push([nx,ny,nextCost]);
        }
      }
    }
    return result;
  }

  function getAttackTiles(unit, rangeMap=null) {
    const weapon = weapons[unit.weapon];
    if (!weapon || weapon.type === 'staff') return new Set();

    const result = new Set();
    const origins = rangeMap
      ? [...rangeMap.keys()].map(value => value.split(',').map(Number))
      : [[unit.x,unit.y]];

    for (const [x,y] of origins) {
      for (let yy=0; yy<H; yy++) {
        for (let xx=0; xx<W; xx++) {
          if (weapon.range.includes(Math.abs(xx-x)+Math.abs(yy-y))) result.add(key(xx,yy));
        }
      }
    }
    return result;
  }

  function showActions(unit) {
    const box = $('#actionButtons');
    box.innerHTML = '';

    const enemies = state.units.filter(other =>
      other.faction === 'enemy' && other.hp > 0 && canAttack(unit,other)
    );
    const talkers = state.units.filter(other =>
      other.faction === 'neutral' && other.hp > 0 && canTalk(unit,other)
    );
    const healTargets = getHealTargets(unit);

    if (enemies.length) addAction('攻撃', () => chooseTarget(unit,enemies));
    if (healTargets.length) addAction('杖', () => showStaffMenu(unit,healTargets));
    if (talkers.length) addAction('会話', () => recruit(unit,talkers[0]));
    if (mapData[unit.y][unit.x] === 'village' && !state.villageVisited) {
      addAction('訪問', () => visitVillage(unit));
    }
    if (mapData[unit.y][unit.x] === 'gate' && unit.lord && state.bossDefeated) {
      addAction('制圧', seize);
    }
    addAction('待機', () => finishAction(unit));
    if (pendingMove) addAction('取消', cancelMove);
  }

  function addAction(label, fn) {
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

  function canAttack(attacker,defender) {
    const weapon = weapons[attacker.weapon];
    return Boolean(
      weapon &&
      weapon.type !== 'staff' &&
      weapon.range.includes(dist(attacker,defender))
    );
  }

  function canTalk(a,b) {
    return a.id === 'kumi' && b.id === 'sarina' && dist(a,b) === 1;
  }

  function getHealTargets(healer) {
    if (!isStaffUser(healer)) return [];
    return state.units.filter(target =>
      target.faction === 'ally' &&
      target.hp > 0 &&
      target.id !== healer.id &&
      target.hp < target.maxHp &&
      dist(healer,target) === 1
    );
  }

  function availableStaves(healer) {
    const inventory = healer.staves || {};
    return ['live','relive'].filter(id => (inventory[id] || 0) > 0);
  }

  function showStaffMenu(healer,targets) {
    const staffIds = availableStaves(healer);
    if (!staffIds.length) {
      toast('使える杖がありません');
      return;
    }

    const modal = $('#modal');
    $('#modalContent').innerHTML = `
      <h2>杖を選ぶ</h2>
      <p>隣接する味方を回復します。</p>
      <div class="modal-actions" id="staffChoices"></div>
      <div class="modal-actions"><button id="staffCancel">戻る</button></div>
    `;

    const choices = $('#staffChoices');
    staffIds.forEach(staffId => {
      const staff = weapons[staffId];
      const uses = healer.staves[staffId];
      const button = document.createElement('button');
      button.textContent = `${staff.name} ${uses}/${staff.uses}（回復 ${staff.heal + healer.mag}）`;
      button.onclick = () => showHealTargetMenu(healer,staffId,targets);
      choices.appendChild(button);
    });

    $('#staffCancel').onclick = () => modal.close();
    if (!modal.open) modal.showModal();
  }

  function showHealTargetMenu(healer,staffId,targets) {
    const staff = weapons[staffId];
    const modal = $('#modal');

    $('#modalContent').innerHTML = `
      <h2>${staff.name}</h2>
      <p>回復する味方を選んでください。</p>
      <div class="modal-actions" id="healTargetChoices"></div>
      <div class="modal-actions"><button id="healBack">杖選択へ戻る</button></div>
    `;

    const choices = $('#healTargetChoices');
    targets.forEach(target => {
      const amount = Math.min(target.maxHp-target.hp,staff.heal+healer.mag);
      const button = document.createElement('button');
      button.textContent = `${target.name}　HP ${target.hp}/${target.maxHp}　＋${amount}`;
      button.onclick = () => {
        modal.close();
        useStaff(healer,target,staffId);
      };
      choices.appendChild(button);
    });

    $('#healBack').onclick = () => showStaffMenu(healer,targets);
  }

  async function useStaff(healer,target,staffId) {
    if (busy) return;
    const staff = weapons[staffId];
    if (!staff || (healer.staves?.[staffId] || 0) <= 0) {
      toast('その杖はもう使えません');
      return;
    }

    busy = true;
    const before = target.hp;
    const healAmount = Math.min(target.maxHp-target.hp,staff.heal+healer.mag);
    target.hp += healAmount;
    healer.staves[staffId] -= 1;

    addLog(`${healer.name}は${staff.name}を使った。${target.name}のHPが${before}→${target.hp}に回復した。`);
    gainExp(healer,staff.exp);
    render();
    await animateHeal(target);
    busy = false;
    finishAction(healer);
  }

  function recruit(a,b) {
    b.faction = 'ally';
    b.acted = false;
    b.weapon = 'live';
    b.staves = b.staves || { live:20, relive:10 };
    addLog('久美「紗理菜、一緒に来て。ここに残るより、助けられる人を増やそう」');
    addLog('紗理菜「……うん。みんなを置いてはいけないから」');
    addLog('潮紗理菜が仲間になった！');
    finishAction(a);
  }

  function visitVillage(unit) {
    state.villageVisited = true;
    unit.hp = Math.min(unit.maxHp,unit.hp+10);
    addLog(`${unit.name}は村人から傷薬を受け取り、HPを回復した。`);
    toast('傷薬を入手（試作版では即時回復）');
    finishAction(unit);
  }

  function showForecast(attacker,defender) {
    const attackerForecast = forecast(attacker,defender);
    const defenderForecast = canAttack(defender,attacker) ? forecast(defender,attacker) : null;
    const modal = $('#modal');

    $('#modalContent').innerHTML = `
      <h2>戦闘予測</h2>
      <div class="forecast">
        ${forecastSide(attacker,attackerForecast)}
        <div class="vs">VS</div>
        ${forecastSide(defender,defenderForecast)}
      </div>
      <p>${triangleText(attacker,defender)}</p>
      <div class="modal-actions">
        <button id="attackConfirm">攻撃</button>
        <button id="attackCancel">戻る</button>
      </div>
    `;

    modal.showModal();
    $('#attackConfirm').onclick = () => {
      modal.close();
      battle(attacker,defender);
    };
    $('#attackCancel').onclick = () => modal.close();
  }

  function forecastSide(unit,result) {
    if (!result) return `<div><strong>${unit.name}</strong><p>反撃不可</p></div>`;
    return `<div><strong>${unit.name}</strong><table>
      <tr><td>HP</td><td>${unit.hp}</td></tr>
      <tr><td>ダメージ</td><td>${result.damage}×${result.hits}</td></tr>
      <tr><td>命中</td><td>${result.hit}%</td></tr>
      <tr><td>必殺</td><td>${result.crit}%</td></tr>
    </table></div>`;
  }

  function forecast(attacker,defender) {
    const attackerWeapon = weapons[attacker.weapon];
    const defenderWeapon = weapons[defender.weapon];
    const triangleResult = triangle(attacker,defender);
    const tile = terrain[mapData[defender.y][defender.x]];

    const attack = (attackerWeapon.type === 'magic' ? attacker.mag : attacker.str)
      + attackerWeapon.might
      + triangleResult.might;
    const defense = attackerWeapon.type === 'magic'
      ? defender.res
      : defender.def + tile.def;
    const damage = Math.max(0,attack-defense);

    const attackSpeed = Math.max(0,attacker.spd-Math.max(0,attackerWeapon.weight-attacker.str));
    const defenderWeight = defenderWeapon?.weight || 0;
    const defenderSpeed = Math.max(0,defender.spd-Math.max(0,defenderWeight-defender.str));

    const hit = Math.max(0,Math.min(
      100,
      attackerWeapon.hit + attacker.skl*2 + attacker.lck + triangleResult.hit
      - (defender.spd*2 + defender.lck + tile.avo)
      + supportBonus(attacker).hit
    ));
    const crit = Math.max(0,Math.min(
      100,
      attackerWeapon.crit + Math.floor(attacker.skl/2) - defender.lck + supportBonus(attacker).crit
    ));

    return { damage, hit, crit, hits:attackSpeed-defenderSpeed>=4 ? 2 : 1 };
  }

  function triangle(attacker,defender) {
    const attackerType = weapons[attacker.weapon]?.type;
    const defenderType = weapons[defender.weapon]?.type;
    const win =
      (attackerType==='sword' && defenderType==='axe') ||
      (attackerType==='axe' && defenderType==='lance') ||
      (attackerType==='lance' && defenderType==='sword');
    const lose =
      (defenderType==='sword' && attackerType==='axe') ||
      (defenderType==='axe' && attackerType==='lance') ||
      (defenderType==='lance' && attackerType==='sword');

    if (win) return { hit:15, might:1, state:'有利' };
    if (lose) return { hit:-15, might:-1, state:'不利' };
    return { hit:0, might:0, state:'なし' };
  }

  function triangleText(attacker,defender) {
    const result = triangle(attacker,defender);
    return result.state === 'なし'
      ? '武器相性補正なし'
      : `武器相性：${attacker.name}が${result.state}`;
  }

  function supportBonus(unit) {
    if (!['toshi','kyoko'].includes(unit.id)) return { hit:0, crit:0 };
    const other = byId(unit.id === 'toshi' ? 'kyoko' : 'toshi');
    return other && other.hp > 0 && dist(unit,other) <= 2
      ? { hit:10, crit:5 }
      : { hit:0, crit:0 };
  }

  async function battle(attacker,defender) {
    if (busy) return;
    busy = true;

    const attackerStartHp = attacker.hp;
    const defenderStartHp = defender.hp;

    await strike(attacker,defender,false);
    if (defender.hp > 0 && attacker.hp > 0 && canAttack(defender,attacker)) {
      await strike(defender,attacker,false);
    }
    if (attacker.hp > 0 && defender.hp > 0 && forecast(attacker,defender).hits === 2) {
      await strike(attacker,defender,true);
    }

    if (defender.hp <= 0) defeat(defender,attacker);
    if (attacker.hp <= 0) defeat(attacker,defender);

    if (attacker.faction === 'ally' && attacker.hp > 0) {
      gainExp(attacker,defender.hp <= 0 ? 35 : Math.max(1,Math.floor((defenderStartHp-defender.hp)/2)));
    }

    addLog(
      `${attacker.name} HP ${attackerStartHp}→${Math.max(0,attacker.hp)} / ` +
      `${defender.name} HP ${defenderStartHp}→${Math.max(0,defender.hp)}`
    );

    busy = false;
    if (attacker.faction === 'ally' && attacker.hp > 0) finishAction(attacker);
    else {
      clearSelection();
      checkDefeat();
    }
  }

  async function strike(attacker,defender,followUp) {
    if (attacker.hp <= 0 || defender.hp <= 0) return;

    const result = forecast(attacker,defender);
    const roll = Math.random()*100;
    await animateHit(attacker,defender);

    if (roll >= result.hit) {
      addLog(`${attacker.name}の攻撃は外れた。`);
      return;
    }

    const critical = Math.random()*100 < result.crit;
    const damage = result.damage * (critical ? 3 : 1);
    defender.hp = Math.max(0,defender.hp-damage);

    addLog(
      `${attacker.name}${followUp?'の追撃':''}！ ` +
      `${critical?'必殺の一撃！ ':''}${defender.name}に${damage}ダメージ。`
    );

    render();
    await sleep(260);
  }

  function defeat(unit) {
    addLog(`${unit.name}は戦闘不能になった。`);
    if (unit.boss) {
      state.bossDefeated = true;
      addLog('城門の守備隊長を撃破。久美で城門を制圧できる！');
    }
    if (unit.faction === 'ally' && unit.id === 'kumi') checkDefeat();
  }

  function gainExp(unit,amount) {
    unit.exp = (unit.exp || 0) + amount;
    while (unit.exp >= 100) {
      unit.exp -= 100;
      unit.lv += 1;
      const gains = [];
      const growth = { maxHp:.8, str:.55, skl:.6, spd:.55, lck:.55, def:.4, res:.25 };

      Object.entries(growth).forEach(([statName,rate]) => {
        if (Math.random() < rate) {
          unit[statName] += 1;
          if (statName === 'maxHp') unit.hp += 1;
          gains.push(statName);
        }
      });

      addLog(
        `${unit.name}はレベル${unit.lv}になった！ ` +
        `${gains.length ? `${gains.join('・')}上昇` : '能力上昇なし'}`
      );
    }
  }

  function finishAction(unit) {
    unit.acted = true;
    pendingMove = null;
    selectedId = null;
    reachable.clear();
    attackTiles.clear();
    save(true);
    render();

    const activeAllies = state.units.filter(other => other.faction === 'ally' && other.hp > 0);
    if (activeAllies.length && activeAllies.every(other => other.acted)) {
      setTimeout(endAllyTurn,300);
    }
  }

  async function endAllyTurn() {
    if (busy || state.cleared) return;

    state.phase = 'enemy';
    selectedId = null;
    pendingMove = null;
    reachable.clear();
    attackTiles.clear();
    render();

    toast('敵軍フェイズ');
    await sleep(450);
    await enemyPhase();
    if (state.cleared) return;

    state.turn += 1;
    state.phase = 'ally';
    state.units
      .filter(unit => unit.faction === 'ally' && unit.hp > 0)
      .forEach(unit => { unit.acted = false; });

    healForts();
    save(true);
    render();
    toast(`ターン ${state.turn}`);
  }

  async function enemyPhase() {
    busy = true;

    for (const enemy of state.units.filter(unit => unit.faction === 'enemy' && unit.hp > 0)) {
      const targets = state.units.filter(unit => unit.faction === 'ally' && unit.hp > 0);
      if (!targets.length) break;

      const nearestDistance = Math.min(...targets.map(target => dist(enemy,target)));
      if (enemy.ai === 'guard' && nearestDistance > 4 && state.turn < 4) continue;
      if (enemy.ai === 'hold' && nearestDistance > 2) continue;

      let target = targets.slice().sort((a,b) => dist(enemy,a)-dist(enemy,b))[0];
      if (canAttack(enemy,target)) {
        await battleEnemy(enemy,target);
        continue;
      }

      if (enemy.move > 0) {
        const step = bestEnemyMove(enemy,targets);
        if (step) {
          enemy.x = step.x;
          enemy.y = step.y;
          render();
          await sleep(180);
        }
      }

      target = targets
        .filter(candidate => canAttack(enemy,candidate))
        .sort((a,b) => a.hp-b.hp)[0];
      if (target) await battleEnemy(enemy,target);
    }

    busy = false;
    checkDefeat();
  }

  function bestEnemyMove(enemy,targets) {
    const range = movementRange(enemy);
    let best = null;
    let score = Infinity;

    for (const tileKey of range.keys()) {
      const [x,y] = tileKey.split(',').map(Number);
      if (unitAt(x,y) && !(x === enemy.x && y === enemy.y)) continue;

      const candidateScore =
        Math.min(...targets.map(target => Math.abs(x-target.x)+Math.abs(y-target.y))) -
        terrain[mapData[y][x]].def * .15;

      if (candidateScore < score) {
        score = candidateScore;
        best = { x,y };
      }
    }
    return best;
  }

  async function battleEnemy(enemy,target) {
    await strike(enemy,target,false);
    if (target.hp > 0 && enemy.hp > 0 && canAttack(target,enemy)) {
      await strike(target,enemy,false);
    }
    if (enemy.hp > 0 && target.hp > 0 && forecast(enemy,target).hits === 2) {
      await strike(enemy,target,true);
    }

    if (target.hp <= 0) defeat(target);
    if (enemy.hp <= 0) defeat(enemy);

    render();
    await sleep(260);
  }

  function healForts() {
    state.units
      .filter(unit => unit.hp > 0 && terrain[mapData[unit.y][unit.x]].heal)
      .forEach(unit => {
        unit.hp = Math.min(unit.maxHp,unit.hp+terrain[mapData[unit.y][unit.x]].heal);
      });
  }

  function seize() {
    state.cleared = true;
    addLog('久美が城門を制圧した！');
    render();
    save(true);
    $('#modalContent').innerHTML = `
      <h2>序章クリア</h2>
      <p>三人は城門を突破し、陽光の射す街道へ脱出した。</p>
      <p>次の戦いへ続く。</p>
    `;
    $('#modal').showModal();
  }

  function checkDefeat() {
    const kumi = byId('kumi');
    if (kumi.hp <= 0 || !state.units.some(unit => unit.faction === 'ally' && unit.hp > 0)) {
      $('#modalContent').innerHTML = `
        <h2>敗北</h2>
        <p>久美たちは城門を突破できなかった。</p>
        <div class="modal-actions">
          <button id="retry">序章をやり直す</button>
          <button id="loadBtn">読込</button>
        </div>
      `;
      $('#modal').showModal();
      $('#retry').onclick = () => {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      };
      $('#loadBtn').onclick = () => {
        state = migrateState(load(false)) || freshState();
        $('#modal').close();
        render();
      };
    }
  }

  function showMenu() {
    $('#modalContent').innerHTML = `
      <h2>メニュー</h2>
      <div class="modal-actions">
        <button id="saveBtn">セーブ</button>
        <button id="loadBtn">読込</button>
      </div>
      <div class="modal-actions">
        <button id="restartBtn">序章を最初から</button>
      </div>
      <p>セーブキー：<code>${SAVE_KEY}</code></p>
    `;
    $('#modal').showModal();

    $('#saveBtn').onclick = () => {
      save(false);
      $('#modal').close();
    };
    $('#loadBtn').onclick = () => {
      const saved = migrateState(load(false));
      if (saved) {
        state = saved;
        clearSelection();
        $('#modal').close();
        toast('読み込みました');
      }
    };
    $('#restartBtn').onclick = () => {
      if (confirm('現在の進行を消して最初から始めますか？')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }
    };
  }

  function save(silent) {
    state.version = SAVE_VERSION;
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    if (!silent) toast('セーブしました');
  }

  function load(showError=true) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      if (showError) toast('セーブデータを読めません');
      return null;
    }
  }

  function render() {
    $('#turnLabel').textContent = state.turn;
    $('#phaseLabel').textContent = state.phase === 'ally' ? '自軍' : '敵軍';
    $('#objectiveLabel').textContent = state.bossDefeated
      ? '久美で城門を制圧'
      : '敵将撃破後、久美で城門を制圧';

    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('selected','move','attack','danger-zone','target','heal-target');
      const tileKey = key(+tile.dataset.x,+tile.dataset.y);
      if (reachable.has(tileKey)) tile.classList.add('move');
      if (attackTiles.has(tileKey) && !reachable.has(tileKey)) tile.classList.add('attack');
    });

    const selected = byId(selectedId);
    if (selected) tileEl(selected.x,selected.y).classList.add('selected');
    if (dangerVisible) renderDanger();

    renderUnits();
    renderCard(selected);
    renderLog();

    if (!pendingMove) $('#actionButtons').innerHTML = '';
    $('#endTurnButton').disabled = state.phase !== 'ally' || busy || state.cleared;
  }

  function renderUnits() {
    mapEl.querySelectorAll('.unit').forEach(node => node.remove());
    const tileSize = parseFloat(mapEl.dataset.tileSize) || TILE;

    state.units.filter(unit => unit.hp > 0).forEach(unit => {
      const element = document.createElement('div');
      element.className =
        `unit ${unit.faction}${unit.acted?' acted':''}${unit.boss?' boss':''}`;
      element.textContent = unit.short;
      element.dataset.hp = `${unit.hp}`;
      element.style.left = `${unit.x*tileSize}px`;
      element.style.top = `${unit.y*tileSize}px`;
      element.title = `${unit.name} HP ${unit.hp}/${unit.maxHp}`;
      mapEl.appendChild(element);
    });
  }

  function renderDanger() {
    state.units
      .filter(unit => unit.faction === 'enemy' && unit.hp > 0)
      .forEach(enemy => {
        const movement = movementRange(enemy);
        const attacks = getAttackTiles(enemy,movement);
        attacks.forEach(tileKey => {
          const [x,y] = tileKey.split(',').map(Number);
          tileEl(x,y).classList.add('danger-zone');
        });
      });
  }

  function renderCard(unit) {
    const card = $('#unitCard');
    if (!unit) {
      card.className = 'panel-card empty';
      card.innerHTML = '<h2>ユニット情報</h2><p>ユニットをタップしてください。</p>';
      return;
    }

    const weapon = weapons[unit.weapon];
    const equipmentText = weapon?.type === 'staff'
      ? staffInventoryText(unit)
      : weapon?.name || '装備なし';

    card.className = 'panel-card';
    card.innerHTML = `
      <div class="unit-name"><h2>${unit.name}</h2><strong>Lv.${unit.lv}</strong></div>
      <p>${unit.className}／${equipmentText}</p>
      <div>HP ${unit.hp}/${unit.maxHp}</div>
      <div class="hpbar"><i style="width:${unit.hp/unit.maxHp*100}%"></i></div>
      <div class="stats">
        ${stat('力',unit.str)}
        ${stat('魔',unit.mag)}
        ${stat('技',unit.skl)}
        ${stat('速',unit.spd)}
        ${stat('幸',unit.lck)}
        ${stat('守',unit.def)}
        ${stat('魔防',unit.res)}
        ${stat('移動',unit.move)}
      </div>
      <p>地形：${terrain[mapData[unit.y][unit.x]].name}　EXP ${unit.exp||0}/100</p>
    `;
  }

  function staffInventoryText(unit) {
    const inventory = unit.staves || {};
    return ['live','relive']
      .map(id => `${weapons[id].name} ${inventory[id] || 0}/${weapons[id].uses}`)
      .join('・');
  }

  function stat(name,value) {
    return `<div class="stat"><span>${name}</span><b>${value}</b></div>`;
  }

  function renderLog() {
    logEl.innerHTML = state.log
      .slice(-20)
      .map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`)
      .join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function addLog(message) {
    state.log.push(message);
    renderLog();
  }

  function tileEl(x,y) {
    return mapEl.children[y*W+x];
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'),1400);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,ms));
  }

  async function animateHit(attacker,defender) {
    const element = [...mapEl.querySelectorAll('.unit')]
      .find(node => node.title.startsWith(defender.name));
    if (!element) return;

    element.classList.add('hit');
    await sleep(130);
    element.classList.remove('hit');
  }

  async function animateHeal(target) {
    const element = [...mapEl.querySelectorAll('.unit')]
      .find(node => node.title.startsWith(target.name));
    if (!element) return;

    element.animate(
      [
        { filter:'brightness(1)', transform:'scale(1)' },
        { filter:'brightness(1.8)', transform:'scale(1.12)' },
        { filter:'brightness(1)', transform:'scale(1)' }
      ],
      { duration:420, easing:'ease-out' }
    );
    await sleep(420);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g,char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[char]));
  }

  init();
})();
