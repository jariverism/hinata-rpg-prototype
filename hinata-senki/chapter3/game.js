(() => {
  'use strict';

  const SAVE_KEY = 'hinata-senki-chapter3-save-v1';
  const W = 16;
  const H = 12;
  const portraitData = window.HINATA_PORTRAIT_DATA || {};
  const PORTRAITS = {
    '佐々木久美':portraitData.kumi || '',
    '加藤史帆':portraitData.toshi || '',
    '齊藤京子':portraitData.kyoko || '',
    '井口眞緒':portraitData.mao || '',
    '潮紗理菜':portraitData.sarina || '',
    '河田陽菜':portraitData.hina || ''
  };

  const terrain = {
    plain:{name:'平地',move:1,def:0,avo:0},
    road:{name:'街道',move:1,def:0,avo:0},
    forest:{name:'森',move:2,def:1,avo:20},
    river:{name:'河川',move:99,def:0,avo:0},
    bridge:{name:'橋',move:1,def:0,avo:0},
    wall:{name:'崖',move:99,def:0,avo:0},
    village:{name:'村',move:1,def:0,avo:10},
    fort:{name:'砦',move:2,def:2,avo:20,heal:5},
    gate:{name:'関門',move:1,def:3,avo:20},
    beacon:{name:'標石',move:1,def:1,avo:10}
  };

  const weapons = {
    ironSword:{name:'鉄の剣',type:'sword',might:5,hit:90,crit:0,weight:4,range:[1],uses:40},
    slimSword:{name:'細身の剣',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30},
    ironLance:{name:'鉄の槍',type:'lance',might:7,hit:80,crit:0,weight:8,range:[1],uses:40},
    javelin:{name:'手槍',type:'lance',might:6,hit:65,crit:0,weight:10,range:[1,2],uses:20},
    ironAxe:{name:'鉄の斧',type:'axe',might:8,hit:70,crit:0,weight:10,range:[1],uses:40},
    handAxe:{name:'手斧',type:'axe',might:7,hit:60,crit:0,weight:11,range:[1,2],uses:20},
    ironBow:{name:'鉄の弓',type:'bow',might:6,hit:85,crit:0,weight:6,range:[2],uses:40},
    steelSword:{name:'鋼の剣',type:'sword',might:8,hit:80,crit:0,weight:9,range:[1],uses:30},
    live:{name:'ライブ',type:'staff',heal:10,range:[1],uses:20,exp:11},
    relive:{name:'リライブ',type:'staff',heal:20,range:[1],uses:10,exp:17}
  };

  const rows = [
    '################',
    '#....f..r...G..#',
    '#.V..f..r..f...#',
    '#....f..r..f...#',
    '#rrrrrrBBrrrrrr#',
    '#..ff..~~..ff..#',
    '#..ff..~~..ff..#',
    '#rrrrrrBBrrrrrr#',
    '#...f..r..f....#',
    '#...f..r..f..V.#',
    '#..F...r.......#',
    '################'
  ];
  const codeTerrain = {'#':'wall','.':'plain','r':'road','f':'forest','~':'river','B':'bridge','V':'village','F':'fort','G':'gate'};
  const mapData = rows.map(row => [...row].map(code => codeTerrain[code] || 'plain'));
  mapData[4][7] = 'beacon';
  mapData[7][8] = 'beacon';

  const introScene = [
    {speaker:'ナレーション',text:'砦を抜けた一行は、国境へ続く二本の橋にたどり着いた。街道の先では、互いに異なる旗を掲げた兵が向かい合っている。'},
    {speaker:'佐々木久美',side:'left',text:'状況を見極めよう。私たちが知っている顔があっても、今の立場まで同じとは限らない。'},
    {speaker:'加藤史帆',side:'right',text:'うん。でも、村の人たちが巻き込まれるのは止めたい。'},
    {speaker:'齊藤京子',side:'left',text:'まず橋を押さえる。無理に広がらず、地形を使って進もう。'},
    {speaker:'潮紗理菜',side:'right',text:'負傷した人は私のそばへ。杖の残りも確認しておきます。'},
    {speaker:'作戦',text:'街道沿いの二つの村を確保し、敵将を退けた後、佐々木久美で関門を制圧せよ。'}
  ];

  const meetingScene = [
    {speaker:'佐々木久美',side:'left',text:'ここで戦う理由を聞かせて。私たちの記憶だけで決めつけたくない。'},
    {speaker:'井口眞緒',side:'right',text:'私にも、この世界で守ると決めたものがあるの。だから、今すぐ全部を捨てることはできない。'},
    {speaker:'佐々木久美',side:'left',text:'分かった。なら、目の前の人たちを守ることから一緒に考えよう。'}
  ];

  const growths = {
    kumi:{maxHp:.80,str:.50,mag:.10,skl:.60,spd:.55,lck:.60,def:.35,res:.20},
    toshi:{maxHp:.90,str:.65,mag:.05,skl:.45,spd:.65,lck:.45,def:.35,res:.15},
    kyoko:{maxHp:.80,str:.55,mag:.05,skl:.70,spd:.45,lck:.40,def:.60,res:.20},
    sarina:{maxHp:.60,str:.10,mag:.65,skl:.55,spd:.50,lck:.75,def:.20,res:.60},
    hina:{maxHp:.70,str:.40,mag:.10,skl:.70,spd:.80,lck:.90,def:.25,res:.35},
    mao:{maxHp:.75,str:.45,mag:.35,skl:.50,spd:.55,lck:.65,def:.30,res:.45}
  };

  const classMarks = {'ロード':'旗','ソシアルナイト':'騎','シスター':'杖','盗賊':'鍵','剣士':'剣','戦士':'斧','兵士':'槍','弓兵':'弓','重装兵':'盾','軍師':'策'};
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

  function parse(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function defaultAllies() {
    return [
      {id:'kumi',name:'佐々木久美',short:'久',faction:'ally',className:'ロード',lv:2,exp:0,hp:24,maxHp:24,str:7,mag:0,skl:8,spd:8,lck:7,def:7,res:2,move:5,weapon:'ironSword',weaponUses:40,lord:true},
      {id:'toshi',name:'加藤史帆',short:'史',faction:'ally',className:'ソシアルナイト',lv:2,exp:0,hp:25,maxHp:25,str:9,mag:0,skl:5,spd:9,lck:5,def:7,res:1,move:7,weapon:'slimSword',weaponUses:30},
      {id:'kyoko',name:'齊藤京子',short:'京',faction:'ally',className:'ソシアルナイト',lv:2,exp:0,hp:25,maxHp:25,str:8,mag:0,skl:9,spd:6,lck:4,def:10,res:2,move:7,weapon:'ironLance',weaponUses:40},
      {id:'sarina',name:'潮紗理菜',short:'潮',faction:'ally',className:'シスター',lv:2,exp:0,hp:19,maxHp:19,str:1,mag:7,skl:7,spd:7,lck:10,def:2,res:8,move:5,weapon:'live',staves:{live:20,relive:10}},
      {id:'hina',name:'河田陽菜',short:'陽',faction:'ally',className:'盗賊',lv:2,exp:0,hp:20,maxHp:20,str:5,mag:0,skl:8,spd:10,lck:11,def:3,res:4,move:6,weapon:'slimSword',weaponUses:30}
    ];
  }

  function buildAllies() {
    const defaults = defaultAllies();
    const carried = window.HinataCampaign?.loadRoster(2);
    if (!carried?.length) return defaults;
    const prior = Object.fromEntries(carried.map(unit => [unit.id,unit]));
    return defaults.map(template => {
      const source = prior[template.id];
      if (!source) return {...template};
      const result = {...template,...source,faction:'ally',acted:false,hp:source.maxHp || template.maxHp};
      result.weaponUses = Number.isFinite(source.weaponUses) ? source.weaponUses : (weapons[result.weapon]?.uses || template.weaponUses || 30);
      if (result.className === 'シスター') result.staves = {...template.staves,...(source.staves || {})};
      return result;
    }).concat(carried.filter(unit => !defaults.some(template => template.id === unit.id)).map(unit => ({...unit,faction:'ally',acted:false,hp:unit.maxHp})));
  }

  function enemies() {
    return [
      {id:'e1',name:'国境兵',short:'槍',faction:'enemy',className:'兵士',x:6,y:8,lv:3,hp:20,maxHp:20,str:7,mag:0,skl:6,spd:5,lck:2,def:5,res:1,move:4,weapon:'ironLance',weaponUses:40,ai:'advance'},
      {id:'e2',name:'国境兵',short:'斧',faction:'enemy',className:'戦士',x:9,y:8,lv:3,hp:21,maxHp:21,str:8,mag:0,skl:5,spd:5,lck:1,def:4,res:0,move:4,weapon:'ironAxe',weaponUses:40,ai:'advance'},
      {id:'e3',name:'国境兵',short:'弓',faction:'enemy',className:'弓兵',x:5,y:6,lv:3,hp:18,maxHp:18,str:7,mag:0,skl:7,spd:6,lck:2,def:3,res:1,move:4,weapon:'ironBow',weaponUses:40,ai:'guard'},
      {id:'e4',name:'国境兵',short:'槍',faction:'enemy',className:'兵士',x:10,y:6,lv:3,hp:20,maxHp:20,str:7,mag:0,skl:6,spd:5,lck:2,def:5,res:1,move:4,weapon:'javelin',weaponUses:20,ai:'guard'},
      {id:'e5',name:'国境兵',short:'斧',faction:'enemy',className:'戦士',x:5,y:4,lv:4,hp:22,maxHp:22,str:9,mag:0,skl:5,spd:5,lck:2,def:5,res:0,move:4,weapon:'handAxe',weaponUses:20,ai:'guard'},
      {id:'e6',name:'国境兵',short:'剣',faction:'enemy',className:'剣士',x:10,y:4,lv:4,hp:20,maxHp:20,str:7,mag:0,skl:9,spd:9,lck:4,def:4,res:2,move:5,weapon:'steelSword',weaponUses:30,ai:'guard'},
      {id:'e7',name:'国境兵',short:'弓',faction:'enemy',className:'弓兵',x:12,y:3,lv:4,hp:19,maxHp:19,str:7,mag:0,skl:8,spd:6,lck:2,def:3,res:1,move:4,weapon:'ironBow',weaponUses:40,ai:'guard'},
      {id:'boss',name:'国境守備隊長',short:'将',faction:'enemy',className:'重装兵',x:12,y:1,lv:6,hp:27,maxHp:27,str:10,mag:0,skl:7,spd:4,lck:3,def:10,res:3,move:1,weapon:'javelin',weaponUses:20,boss:true,ai:'hold'},
      {id:'mao',name:'井口眞緒',short:'眞',faction:'guest',className:'軍師',x:13,y:2,lv:5,hp:23,maxHp:23,str:6,mag:5,skl:9,spd:8,lck:8,def:5,res:7,move:0,weapon:'slimSword',weaponUses:30,commander:true}
    ];
  }

  function freshState() {
    const starts = [[2,10],[3,10],[2,9],[3,9],[4,10],[4,9],[1,9]];
    const allies = buildAllies().map((unit,index) => ({...unit,x:starts[index]?.[0] ?? 2,y:starts[index]?.[1] ?? 10,acted:false}));
    return {
      turn:1,
      phase:'ally',
      cleared:false,
      bossDefeated:false,
      villages:[],
      metCommander:false,
      reinforcements:[],
      units:[...allies,...enemies()],
      log:['二本の橋を越え、関門を目指せ。']
    };
  }

  function migrate(saved) {
    if (!saved?.units) return null;
    saved.villages = Array.isArray(saved.villages) ? saved.villages : [];
    saved.reinforcements = Array.isArray(saved.reinforcements) ? saved.reinforcements : [];
    return saved;
  }

  async function init() {
    state = migrate(parse(SAVE_KEY)) || freshState();
    mapEl.style.gridTemplateColumns = `repeat(${W},var(--tile))`;
    mapEl.style.gridTemplateRows = `repeat(${H},var(--tile))`;
    buildMap();
    bindUI();
    render();
    save(true);
    if (!sessionStorage.getItem('hinata-senki-ch3-intro')) {
      sessionStorage.setItem('hinata-senki-ch3-intro','1');
      await sleep(80);
      await playScene(introScene,'第3章');
    }
  }

  function buildMap() {
    mapEl.innerHTML = '';
    for (let y=0;y<H;y++) {
      for (let x=0;x<W;x++) {
        const tile = document.createElement('div');
        tile.className = `tile ${mapData[y][x]}`;
        tile.dataset.x = x;
        tile.dataset.y = y;
        tile.title = terrain[mapData[y][x]].name;
        tile.addEventListener('click',() => onTile(x,y));
        mapEl.appendChild(tile);
      }
    }
  }

  function bindUI() {
    $('#dangerButton').onclick = () => { dangerVisible = !dangerVisible; render(); };
    $('#endTurnButton').onclick = () => {
      if (state.phase === 'ally' && !busy && !state.cleared && confirm('自軍ターンを終了しますか？')) endAllyTurn();
    };
    $('#menuButton').onclick = showMenu;
    $('#storyBack').onclick = () => stepStory(-1);
    $('#storyNext').onclick = () => stepStory(1);
  }

  function key(x,y) { return `${x},${y}`; }
  function dist(a,b) { return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }
  function byId(id) { return state.units.find(unit => unit.id === id); }
  function unitAt(x,y) { return state.units.find(unit => unit.hp>0&&unit.x===x&&unit.y===y); }
  function tileEl(x,y) { return mapEl.children[y*W+x]; }
  function weapon(unit) { return weapons[unit.weapon] || null; }
  function usesLeft(unit) { return weapon(unit)?.type === 'staff' ? (unit.staves?.[unit.weapon] || 0) : (Number.isFinite(unit.weaponUses) ? unit.weaponUses : weapon(unit)?.uses || 0); }

  function onTile(x,y) {
    if (busy || state.cleared || state.phase !== 'ally' || !$('#storyOverlay').hidden || !$('#levelOverlay').hidden) return;
    const clicked = unitAt(x,y);
    const selected = byId(selectedId);

    if (selected && selected.faction==='ally' && !selected.acted && clicked && clicked.faction==='enemy' && canAttack(selected,clicked)) {
      showForecast(selected,clicked);
      return;
    }

    if (pendingMove) {
      if (x===pendingMove.x && y===pendingMove.y) {
        finishAction(selected);
        return;
      }
      if (clicked && clicked.id==='mao' && selected?.id==='kumi' && dist(selected,clicked)===1) {
        showActions(selected);
        return;
      }
      cancelMove();
    }

    if (clicked) {
      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);
      else {
        selectedId = clicked.id;
        reachable.clear();
        attackTiles.clear();
        render();
      }
      return;
    }

    if (selected && selected.faction==='ally' && !selected.acted && reachable.has(key(x,y))) {
      pendingMove = {fromX:selected.x,fromY:selected.y,x,y};
      selected.x=x;
      selected.y=y;
      reachable.clear();
      attackTiles=getAttackTiles(selected);
      render();
      showActions(selected);
      return;
    }
    clearSelection();
  }

  function selectUnit(unit) {
    selectedId=unit.id;
    pendingMove=null;
    reachable=movementRange(unit);
    attackTiles=getAttackTiles(unit,reachable);
    render();
  }

  function clearSelection() {
    selectedId=null;
    pendingMove=null;
    reachable.clear();
    attackTiles.clear();
    render();
  }

  function cancelMove() {
    const unit=byId(selectedId);
    if (unit&&pendingMove) { unit.x=pendingMove.fromX; unit.y=pendingMove.fromY; }
    pendingMove=null;
    if (unit) selectUnit(unit); else clearSelection();
  }

  function movementRange(unit) {
    const result=new Map([[key(unit.x,unit.y),0]]);
    const queue=[[unit.x,unit.y,0]];
    while (queue.length) {
      const [x,y,cost]=queue.shift();
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx,ny=y+dy;
        if (nx<0||ny<0||nx>=W||ny>=H) continue;
        const t=terrain[mapData[ny][nx]];
        const next=cost+t.move;
        const occupant=unitAt(nx,ny);
        if (t.move>=99||next>unit.move||(occupant&&occupant.id!==unit.id&&occupant.faction!==unit.faction)) continue;
        const k=key(nx,ny);
        if (!result.has(k)||next<result.get(k)) { result.set(k,next); queue.push([nx,ny,next]); }
      }
    }
    return result;
  }

  function getAttackTiles(unit,rangeMap=null) {
    const w=weapon(unit);
    const result=new Set();
    if (!w||w.type==='staff'||usesLeft(unit)<=0) return result;
    const origins=rangeMap?[...rangeMap.keys()].map(value=>value.split(',').map(Number)):[[unit.x,unit.y]];
    for (const [x,y] of origins) {
      for (let yy=0;yy<H;yy++) for (let xx=0;xx<W;xx++) if (w.range.includes(Math.abs(xx-x)+Math.abs(yy-y))) result.add(key(xx,yy));
    }
    return result;
  }

  function canAttack(attacker,defender) {
    const w=weapon(attacker);
    return Boolean(w&&w.type!=='staff'&&usesLeft(attacker)>0&&w.range.includes(dist(attacker,defender)));
  }

  function getHealTargets(unit) {
    if (weapon(unit)?.type!=='staff') return [];
    return state.units.filter(target=>target.faction==='ally'&&target.id!==unit.id&&target.hp>0&&target.hp<target.maxHp&&dist(unit,target)===1);
  }

  function showActions(unit) {
    const box=$('#actionButtons');
    box.innerHTML='';
    const enemiesInRange=state.units.filter(other=>other.faction==='enemy'&&other.hp>0&&canAttack(unit,other));
    const healTargets=getHealTargets(unit);
    const villageKey=key(unit.x,unit.y);
    if (enemiesInRange.length) addAction('攻撃',()=>chooseTarget(unit,enemiesInRange));
    if (healTargets.length) addAction('杖',()=>showStaffMenu(unit,healTargets));
    if (mapData[unit.y][unit.x]==='village'&&!state.villages.includes(villageKey)) addAction('訪問',()=>visitVillage(unit,villageKey));
    const mao=byId('mao');
    if (unit.id==='kumi'&&mao?.hp>0&&dist(unit,mao)===1&&!state.metCommander) addAction('会話',()=>meetCommander(unit));
    if (mapData[unit.y][unit.x]==='gate'&&unit.lord&&canClear()) addAction('制圧',clearChapter);
    addAction('待機',()=>finishAction(unit));
    if (pendingMove) addAction('取消',cancelMove);
  }

  function addAction(label,fn) {
    const button=document.createElement('button');
    button.textContent=label;
    button.onclick=fn;
    $('#actionButtons').appendChild(button);
  }

  function chooseTarget(attacker,enemiesInRange) {
    attackTiles=getAttackTiles(attacker);
    document.querySelectorAll('.tile').forEach(tile=>tile.classList.remove('target'));
    enemiesInRange.forEach(enemy=>tileEl(enemy.x,enemy.y).classList.add('target'));
    toast('攻撃する敵をタップ');
  }

  function visitVillage(unit,villageKey) {
    state.villages.push(villageKey);
    unit.hp=Math.min(unit.maxHp,unit.hp+8);
    addLog(`${unit.name}が村の避難路を確保した。`);
    toast(`村の確保 ${state.villages.length}/2`);
    finishAction(unit);
  }

  async function meetCommander(unit) {
    await playScene(meetingScene,'戦場会話');
    state.metCommander=true;
    addLog('互いの立場を確認した。');
    finishAction(unit);
  }

  function showStaffMenu(healer,targets) {
    const ids=['live','relive'].filter(id=>(healer.staves?.[id]||0)>0);
    $('#modalContent').innerHTML=`<h2>杖を選ぶ</h2><div id="staffList" class="modal-actions"></div><div class="modal-actions"><button id="staffCancel">戻る</button></div>`;
    ids.forEach(id=>{
      const button=document.createElement('button');
      button.textContent=`${weapons[id].name} ${healer.staves[id]}/${weapons[id].uses}`;
      button.onclick=()=>showHealTargets(healer,id,targets);
      $('#staffList').appendChild(button);
    });
    $('#staffCancel').onclick=()=>$('#modal').close();
    $('#modal').showModal();
  }

  function showHealTargets(healer,staffId,targets) {
    const staff=weapons[staffId];
    $('#modalContent').innerHTML=`<h2>${staff.name}</h2><div id="healList" class="modal-actions"></div><div class="modal-actions"><button id="healBack">戻る</button></div>`;
    targets.forEach(target=>{
      const amount=Math.min(target.maxHp-target.hp,staff.heal+healer.mag);
      const button=document.createElement('button');
      button.textContent=`${target.name} HP ${target.hp}/${target.maxHp} ＋${amount}`;
      button.onclick=()=>{ $('#modal').close(); useStaff(healer,target,staffId); };
      $('#healList').appendChild(button);
    });
    $('#healBack').onclick=()=>showStaffMenu(healer,targets);
  }

  async function useStaff(healer,target,staffId) {
    if (busy) return;
    busy=true;
    const staff=weapons[staffId];
    const before=target.hp;
    target.hp=Math.min(target.maxHp,target.hp+staff.heal+healer.mag);
    healer.staves[staffId]-=1;
    addLog(`${healer.name}は${staff.name}を使った。${target.name} HP ${before}→${target.hp}`);
    render();
    await animateHeal(target);
    await gainExp(healer,staff.exp);
    busy=false;
    finishAction(healer);
  }

  function triangle(a,d) {
    const A=weapon(a)?.type,D=weapon(d)?.type;
    const win=(A==='sword'&&D==='axe')||(A==='axe'&&D==='lance')||(A==='lance'&&D==='sword');
    const lose=(D==='sword'&&A==='axe')||(D==='axe'&&A==='lance')||(D==='lance'&&A==='sword');
    if (win) return {hit:15,might:1,state:'有利'};
    if (lose) return {hit:-15,might:-1,state:'不利'};
    return {hit:0,might:0,state:'なし'};
  }

  function supportBonus(unit) {
    if (!['toshi','kyoko'].includes(unit.id)) return {hit:0,crit:0};
    const other=byId(unit.id==='toshi'?'kyoko':'toshi');
    return other&&other.hp>0&&dist(unit,other)<=2?{hit:10,crit:5}:{hit:0,crit:0};
  }

  function forecast(attacker,defender) {
    const aw=weapon(attacker),dw=weapon(defender),tri=triangle(attacker,defender),tile=terrain[mapData[defender.y][defender.x]];
    const attack=(aw.type==='magic'?attacker.mag:attacker.str)+aw.might+tri.might;
    const defense=aw.type==='magic'?defender.res:defender.def+tile.def;
    const damage=Math.max(0,attack-defense);
    const as=Math.max(0,attacker.spd-Math.max(0,aw.weight-attacker.str));
    const ds=Math.max(0,defender.spd-Math.max(0,(dw?.weight||0)-defender.str));
    const hit=Math.max(0,Math.min(100,aw.hit+attacker.skl*2+attacker.lck+tri.hit-(defender.spd*2+defender.lck+tile.avo)+supportBonus(attacker).hit));
    const crit=Math.max(0,Math.min(100,aw.crit+Math.floor(attacker.skl/2)-defender.lck+supportBonus(attacker).crit));
    return {damage,hit,crit,hits:as-ds>=4?2:1};
  }

  function showForecast(attacker,defender) {
    const a=forecast(attacker,defender);
    const d=canAttack(defender,attacker)?forecast(defender,attacker):null;
    $('#modalContent').innerHTML=`<h2>戦闘予測</h2><div class="forecast">${forecastSide(attacker,a)}<div class="vs">VS</div>${forecastSide(defender,d)}</div><p>${triangle(attacker,defender).state==='なし'?'武器相性補正なし':`武器相性：${attacker.name}が${triangle(attacker,defender).state}`}</p><div class="modal-actions"><button id="attackConfirm">攻撃</button><button id="attackCancel">戻る</button></div>`;
    $('#modal').showModal();
    $('#attackConfirm').onclick=()=>{ $('#modal').close(); battle(attacker,defender); };
    $('#attackCancel').onclick=()=>$('#modal').close();
  }

  function forecastSide(unit,result) {
    if (!result) return `<div><strong>${unit.name}</strong><p>反撃不可</p></div>`;
    return `<div><strong>${unit.name}</strong><table><tr><td>HP</td><td>${unit.hp}</td></tr><tr><td>威力</td><td>${result.damage}×${result.hits}</td></tr><tr><td>命中</td><td>${result.hit}%</td></tr><tr><td>必殺</td><td>${result.crit}%</td></tr></table></div>`;
  }

  async function battle(attacker,defender) {
    if (busy) return;
    busy=true;
    const aStart=attacker.hp,dStart=defender.hp;
    await strike(attacker,defender,false);
    if (defender.hp>0&&attacker.hp>0&&canAttack(defender,attacker)) await strike(defender,attacker,false);
    if (attacker.hp>0&&defender.hp>0&&forecast(attacker,defender).hits===2) await strike(attacker,defender,true);
    if (defender.hp<=0) defeat(defender);
    if (attacker.hp<=0) defeat(attacker);
    if (attacker.faction==='ally'&&attacker.hp>0) await gainCombatExp(attacker,defender);
    addLog(`${attacker.name} HP ${aStart}→${Math.max(0,attacker.hp)} / ${defender.name} HP ${dStart}→${Math.max(0,defender.hp)}`);
    busy=false;
    if (attacker.faction==='ally'&&attacker.hp>0) finishAction(attacker); else { clearSelection(); checkDefeat(); }
  }

  async function strike(attacker,defender,followUp) {
    if (attacker.hp<=0||defender.hp<=0||!canAttack(attacker,defender)) return;
    const result=forecast(attacker,defender);
    decrementWeapon(attacker);
    await animateHit(defender);
    if (Math.random()*100>=result.hit) { addLog(`${attacker.name}の攻撃は外れた。`); return; }
    const critical=Math.random()*100<result.crit;
    const damage=result.damage*(critical?3:1);
    defender.hp=Math.max(0,defender.hp-damage);
    addLog(`${attacker.name}${followUp?'の追撃':''}！ ${critical?'必殺の一撃！ ':''}${defender.name}に${damage}ダメージ。`);
    render();
    await sleep(220);
  }

  function decrementWeapon(unit) {
    if (weapon(unit)?.type==='staff') return;
    unit.weaponUses=Math.max(0,usesLeft(unit)-1);
  }

  function defeat(unit) {
    addLog(`${unit.name}は戦闘不能になった。`);
    if (unit.boss) { state.bossDefeated=true; addLog('関門を守る敵将を退けた。'); }
  }

  function combatExp(unit,enemy) {
    const diff=(enemy.lv||1)-(unit.lv||1);
    if (enemy.hp<=0) return enemy.boss?100:Math.max(15,Math.min(80,40+diff*8));
    return Math.max(5,Math.min(18,10+diff*2));
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
      Object.entries(rates).forEach(([stat,rate])=>{
        if (Math.random()<rate) { unit[stat]+=1; if (stat==='maxHp') unit.hp+=1; gains[stat]=1; }
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
    $('#levelStats').innerHTML=order.map(stat=>`<div class="level-stat ${gains[stat]?'pending':'no-gain'}" data-stat="${stat}"><span>${labels[stat]}</span><span class="before">${before[stat]}</span><span class="after">${unit[stat]}</span><span class="gain">+1</span></div>`).join('');
    const raised=order.filter(stat=>gains[stat]);
    $('#levelMessage').textContent='能力値を確認してください';
    $('#levelConfirm').disabled=true;
    $('#levelOverlay').hidden=false;
    for (const stat of raised) { await sleep(300); $('#levelStats').querySelector(`[data-stat="${stat}"]`)?.classList.add('raised'); }
    $('#levelMessage').textContent=raised.length?`${raised.length}項目の能力が上昇した！`:'能力上昇なし';
    await sleep(180);
    $('#levelConfirm').disabled=false;
    await new Promise(resolve=>{
      const close=()=>{ $('#levelConfirm').removeEventListener('click',close); $('#levelOverlay').hidden=true; resolve(); };
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
    const allies=state.units.filter(other=>other.faction==='ally'&&other.hp>0);
    if (allies.length&&allies.every(other=>other.acted)) setTimeout(endAllyTurn,250);
  }

  async function endAllyTurn() {
    if (busy||state.cleared) return;
    state.phase='enemy';
    clearSelection();
    render();
    toast('敵軍フェイズ');
    await sleep(350);
    await enemyPhase();
    if (state.cleared) return;
    state.turn+=1;
    spawnReinforcements();
    state.phase='ally';
    state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).forEach(unit=>{unit.acted=false;});
    healForts();
    save(true);
    render();
    toast(`ターン ${state.turn}`);
  }

  async function enemyPhase() {
    busy=true;
    for (const enemy of state.units.filter(unit=>unit.faction==='enemy'&&unit.hp>0)) {
      const targets=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0);
      if (!targets.length) break;
      const nearest=Math.min(...targets.map(target=>dist(enemy,target)));
      if (enemy.ai==='guard'&&nearest>5&&state.turn<4) continue;
      if (enemy.ai==='hold'&&nearest>2) continue;
      let target=targets.slice().sort((a,b)=>dist(enemy,a)-dist(enemy,b))[0];
      if (!canAttack(enemy,target)&&enemy.move>0) {
        const step=bestMove(enemy,targets);
        if (step) { enemy.x=step.x; enemy.y=step.y; render(); await sleep(150); }
      }
      target=targets.filter(candidate=>canAttack(enemy,candidate)).sort((a,b)=>a.hp-b.hp)[0];
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
      const value=Math.min(...targets.map(target=>Math.abs(x-target.x)+Math.abs(y-target.y)))-terrain[mapData[y][x]].def*.2;
      if (value<score) { score=value; best={x,y}; }
    }
    return best;
  }

  async function battleEnemy(enemy,target) {
    let countered=false;
    await strike(enemy,target,false);
    if (target.hp>0&&enemy.hp>0&&canAttack(target,enemy)) { countered=true; await strike(target,enemy,false); }
    if (enemy.hp>0&&target.hp>0&&forecast(enemy,target).hits===2) await strike(enemy,target,true);
    if (target.hp<=0) defeat(target);
    if (enemy.hp<=0) defeat(enemy);
    if (countered&&target.faction==='ally'&&target.hp>0) await gainCombatExp(target,enemy);
    render();
    await sleep(220);
  }

  function spawnReinforcements() {
    if (state.turn!==6||state.reinforcements.includes(6)) return;
    state.reinforcements.push(6);
    state.units.push(
      {id:'r1',name:'増援兵',short:'斧',faction:'enemy',className:'戦士',x:1,y:4,lv:4,hp:21,maxHp:21,str:8,mag:0,skl:5,spd:5,lck:1,def:4,res:0,move:4,weapon:'ironAxe',weaponUses:40,ai:'advance'},
      {id:'r2',name:'増援兵',short:'槍',faction:'enemy',className:'兵士',x:14,y:7,lv:4,hp:20,maxHp:20,str:7,mag:0,skl:6,spd:5,lck:1,def:5,res:1,move:4,weapon:'ironLance',weaponUses:40,ai:'advance'}
    );
    addLog('街道の両端から増援が現れた。');
  }

  function healForts() {
    state.units.filter(unit=>unit.hp>0&&terrain[mapData[unit.y][unit.x]].heal).forEach(unit=>{
      unit.hp=Math.min(unit.maxHp,unit.hp+terrain[mapData[unit.y][unit.x]].heal);
    });
  }

  function canClear() { return state.bossDefeated&&state.villages.length>=2&&state.metCommander; }

  function clearChapter() {
    state.cleared=true;
    const roster=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).map(unit=>({...unit,acted:false,hp:unit.maxHp}));
    const mao=byId('mao');
    if (mao&&mao.hp>0&&!roster.some(unit=>unit.id==='mao')) roster.push({...mao,faction:'ally',acted:false,hp:mao.maxHp,move:5});
    window.HinataCampaign?.saveRoster(3,roster,{turn3:state.turn});
    save(true);
    $('#modalContent').innerHTML=`<h2>第3章クリア</h2><p>第1章からの部隊データを引き継いだ状態で保存しました。</p><p>戦績　ターン ${state.turn}</p><div class="campaign-next"><button id="replayChapter">この章をやり直す</button></div><p class="campaign-note">次の章が追加されたときは、この保存データからそのまま続行します。</p>`;
    $('#modal').showModal();
    $('#replayChapter').onclick=()=>{ localStorage.removeItem(SAVE_KEY); window.HinataCampaign?.resetFrom(3); location.reload(); };
  }

  function checkDefeat() {
    const kumi=byId('kumi');
    if (!kumi||kumi.hp<=0||!state.units.some(unit=>unit.faction==='ally'&&unit.hp>0)) {
      $('#modalContent').innerHTML=`<h2>敗北</h2><p>部隊は関門へ到達できなかった。</p><div class="modal-actions"><button id="retry">やり直す</button><button id="loadBtn">読込</button></div>`;
      $('#modal').showModal();
      $('#retry').onclick=()=>{ localStorage.removeItem(SAVE_KEY); location.reload(); };
      $('#loadBtn').onclick=()=>{ state=migrate(parse(SAVE_KEY))||freshState(); $('#modal').close(); render(); };
    }
  }

  function showMenu() {
    $('#modalContent').innerHTML=`<h2>メニュー</h2><div class="modal-actions"><button id="saveBtn">セーブ</button><button id="loadBtn">読込</button></div><div class="modal-actions"><button id="introBtn">章導入を読む</button><button id="restartBtn">第3章を最初から</button></div><p>村の確保 ${state.villages.length}/2</p>`;
    $('#modal').showModal();
    $('#saveBtn').onclick=()=>{save(false);$('#modal').close();};
    $('#loadBtn').onclick=()=>{const saved=migrate(parse(SAVE_KEY));if(saved){state=saved;clearSelection();$('#modal').close();render();toast('読み込みました');}};
    $('#introBtn').onclick=()=>{$('#modal').close();playScene(introScene,'第3章');};
    $('#restartBtn').onclick=()=>{if(confirm('現在の第3章の進行を消して最初から始めますか？')){localStorage.removeItem(SAVE_KEY);location.reload();}};
  }

  function save(silent) {
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    if (!silent) toast('セーブしました');
  }

  function render() {
    $('#turnLabel').textContent=state.turn;
    $('#phaseLabel').textContent=state.phase==='ally'?'自軍':'敵軍';
    $('#objectiveLabel').textContent=canClear()?'久美で関門を制圧':'二つの村を確保し、関門への道を開く';
    document.querySelectorAll('.tile').forEach(tile=>{
      const x=+tile.dataset.x,y=+tile.dataset.y;
      tile.className=`tile ${mapData[y][x]}`;
      if (state.villages.includes(key(x,y))) tile.classList.add('saved');
      if (reachable.has(key(x,y))) tile.classList.add('move');
      if (attackTiles.has(key(x,y))) tile.classList.add('attack');
      if (dangerVisible&&dangerAt(x,y)) tile.classList.add('danger-zone');
      if (selectedId&&byId(selectedId)?.x===x&&byId(selectedId)?.y===y) tile.classList.add('selected');
    });
    renderUnits();
    renderCard();
    renderLog();
  }

  function renderUnits() {
    mapEl.querySelectorAll('.unit').forEach(node=>node.remove());
    for (const unit of state.units.filter(unit=>unit.hp>0)) {
      const node=document.createElement('div');
      node.className=`unit ${unit.faction}${unit.acted?' acted':''}${unit.boss?' boss':''}${unit.commander?' commander':''}`;
      node.style.left=`calc(${unit.x} * var(--tile))`;
      node.style.top=`calc(${unit.y} * var(--tile))`;
      node.dataset.hp=`${unit.hp}`;
      node.title=`${unit.name}／${unit.className}`;
      node.textContent=classMarks[unit.className]||unit.short;
      mapEl.appendChild(node);
    }
  }

  function renderCard() {
    const unit=byId(selectedId);
    if (!unit) { $('#unitCard').className='panel-card empty'; $('#unitCard').innerHTML='<h2>ユニット情報</h2><p>ユニットをタップしてください。</p>'; return; }
    $('#unitCard').className='panel-card';
    const w=weapon(unit);
    $('#unitCard').innerHTML=`<div class="unit-name"><strong>${unit.name}</strong><span>LV ${unit.lv||1} EXP ${unit.exp||0}</span></div><p>${unit.className}／${w?.name||'装備なし'} ${w?.type==='staff'?(unit.staves?.[unit.weapon]||0):usesLeft(unit)}</p><div class="hpbar"><i style="width:${Math.max(0,unit.hp/unit.maxHp*100)}%"></i></div><div class="stats">${stat('HP',`${unit.hp}/${unit.maxHp}`)}${stat('力',unit.str)}${stat('魔',unit.mag)}${stat('技',unit.skl)}${stat('速',unit.spd)}${stat('幸',unit.lck)}${stat('守',unit.def)}${stat('魔防',unit.res)}</div>`;
  }

  function stat(label,value) { return `<div class="stat"><span>${label}</span>${value}</div>`; }

  function renderLog() {
    logEl.innerHTML=state.log.slice(-30).reverse().map(text=>`<div class="log-entry">${escapeHtml(text)}</div>`).join('');
  }

  function dangerAt(x,y) {
    return state.units.some(unit=>unit.faction==='enemy'&&unit.hp>0&&getAttackTiles(unit,movementRange(unit)).has(key(x,y)));
  }

  function addLog(text) { state.log.push(text); }
  function toast(text) { const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),1500); }
  function sleep(ms) { return new Promise(resolve=>setTimeout(resolve,ms)); }

  async function animateHit(unit) {
    const node=[...mapEl.querySelectorAll('.unit')].find(item=>item.title.startsWith(unit.name));
    if (!node) return;
    node.classList.add('hit');
    await sleep(120);
    node.classList.remove('hit');
  }

  async function animateHeal(unit) {
    const node=[...mapEl.querySelectorAll('.unit')].find(item=>item.title.startsWith(unit.name));
    if (!node) return;
    node.classList.add('healed');
    await sleep(420);
    node.classList.remove('healed');
  }

  function playScene(lines,title='会話') {
    return new Promise(resolve=>{
      storyState={lines,index:0,title,resolve};
      $('#storyOverlay').hidden=false;
      renderStory();
    });
  }

  function stepStory(delta) {
    if (!storyState) return;
    if (delta<0&&storyState.index>0) { storyState.index-=1; renderStory(); return; }
    if (delta>0&&storyState.index<storyState.lines.length-1) { storyState.index+=1; renderStory(); return; }
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
      $('#storyWindows').innerHTML=`<div class="speech narration active"><div class="speech-box"><span class="speaker">${line.speaker}</span><div>${escapeHtml(line.text)}</div></div></div>`;
      return;
    }
    const previous=[...storyState.lines.slice(0,storyState.index)].reverse().find(item=>PORTRAITS[item.speaker]&&item.speaker!==line.speaker);
    const currentSide=line.side==='right'?'bottom':'top';
    const old=previous?speechMarkup(previous,currentSide==='top'?'bottom':'top',false):'';
    $('#storyWindows').innerHTML=old+speechMarkup(line,currentSide,true);
  }

  function speechMarkup(line,position,active) {
    return `<div class="speech ${position} ${active?'active':''}"><div class="portrait"><img src="${PORTRAITS[line.speaker]||''}" alt=""></div><div class="speech-box"><span class="speaker">${line.speaker}</span><div>${escapeHtml(line.text)}</div></div></div>`;
  }

  function escapeHtml(text) { return String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }

  init();
})();
