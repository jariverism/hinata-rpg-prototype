(() => {
  'use strict';

  const SAVE_KEY = 'hinata-senki-chapter4-save-v1';
  const W = 16;
  const H = 13;
  const MAX_ITEMS = 5;
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
    plain:{name:'平地',move:1,def:0,avo:0}, road:{name:'街道',move:1,def:0,avo:0},
    forest:{name:'森',move:2,def:1,avo:20}, river:{name:'河川',move:99,def:0,avo:0},
    bridge:{name:'橋',move:1,def:0,avo:0}, wall:{name:'城壁',move:99,def:0,avo:0},
    village:{name:'村',move:1,def:0,avo:10}, fort:{name:'砦',move:2,def:2,avo:20,heal:5},
    gate:{name:'城門',move:1,def:3,avo:20}, armory:{name:'武器屋',move:1,def:0,avo:5},
    vendor:{name:'道具屋',move:1,def:0,avo:5}
  };

  const items = {
    ironSword:{name:'鉄の剣',kind:'weapon',type:'sword',might:5,hit:90,crit:0,weight:4,range:[1],uses:40,price:500},
    slimSword:{name:'細身の剣',kind:'weapon',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30,price:480},
    steelSword:{name:'鋼の剣',kind:'weapon',type:'sword',might:8,hit:80,crit:0,weight:9,range:[1],uses:30,price:900},
    ironLance:{name:'鉄の槍',kind:'weapon',type:'lance',might:7,hit:80,crit:0,weight:8,range:[1],uses:40,price:560},
    javelin:{name:'手槍',kind:'weapon',type:'lance',might:6,hit:65,crit:0,weight:10,range:[1,2],uses:20,price:850},
    ironAxe:{name:'鉄の斧',kind:'weapon',type:'axe',might:8,hit:70,crit:0,weight:10,range:[1],uses:40,price:480},
    handAxe:{name:'手斧',kind:'weapon',type:'axe',might:7,hit:60,crit:0,weight:11,range:[1,2],uses:20,price:780},
    ironBow:{name:'鉄の弓',kind:'weapon',type:'bow',might:6,hit:85,crit:0,weight:6,range:[2],uses:40,price:520},
    live:{name:'ライブ',kind:'staff',type:'staff',heal:10,range:[1],uses:20,exp:11,price:600},
    relive:{name:'リライブ',kind:'staff',type:'staff',heal:20,range:[1],uses:10,exp:17,price:1000},
    vulnerary:{name:'傷薬',kind:'item',uses:3,heal:10,price:300},
    doorKey:{name:'扉の鍵',kind:'item',uses:1,price:250}
  };
  const armoryStock = ['ironSword','slimSword','ironLance','javelin','ironAxe','handAxe','ironBow'];
  const vendorStock = ['vulnerary','live','relive','doorKey'];

  const rows = [
    '################','#..V..r....W..G#','#..f..r..f.....#','#.....r..f..e..#',
    '#rrrrrBrrrrrrrr#','#..ff.~..ff....#','#..ff.~..ff.V..#','#rrrrrBrrrrrrrr#',
    '#.....r..f.....#','#..V..r..f..D..#','#.....r........#','#..F..r........#','################'
  ];
  const codeTerrain = {'#':'wall','.':'plain','r':'road','f':'forest','~':'river','B':'bridge','V':'village','F':'fort','G':'gate','W':'armory','D':'vendor','e':'plain'};
  const mapData = rows.map(row => [...row].map(code => codeTerrain[code] || 'plain'));

  const growths = {
    kumi:{maxHp:.80,str:.50,mag:.10,skl:.60,spd:.55,lck:.60,def:.35,res:.20},
    toshi:{maxHp:.90,str:.65,mag:.05,skl:.45,spd:.65,lck:.45,def:.35,res:.15},
    kyoko:{maxHp:.80,str:.55,mag:.05,skl:.70,spd:.45,lck:.40,def:.60,res:.20},
    sarina:{maxHp:.60,str:.10,mag:.65,skl:.55,spd:.50,lck:.75,def:.20,res:.60},
    hina:{maxHp:.70,str:.40,mag:.10,skl:.70,spd:.80,lck:.90,def:.25,res:.35},
    mao:{maxHp:.75,str:.45,mag:.35,skl:.50,spd:.55,lck:.65,def:.30,res:.45}
  };
  const classMarks = {'ロード':'旗','ソシアルナイト':'騎','シスター':'杖','盗賊':'鍵','軍師':'策','剣士':'剣','戦士':'斧','兵士':'槍','弓兵':'弓','重装兵':'盾'};

  const introScene = [
    {speaker:'ナレーション',text:'一行は国境を越え、旧王国街道の宿場町へ入った。だが、町はすでに敵軍に封鎖され、住民たちは家々に取り残されている。'},
    {speaker:'佐々木久美',side:'left',text:'ここを見捨てて先へ進んでも、私たちが掲げる旗に意味はない。町の人を守りながら道を開こう。'},
    {speaker:'加藤史帆',side:'right',text:'街道は広いけど、橋と店の前は詰まりそう。京子、左右に分かれよう。'},
    {speaker:'齊藤京子',side:'left',text:'了解。久美の周りは空けておく。制圧までの道を切らさないように進むよ。'},
    {speaker:'潮紗理菜',side:'right',text:'負傷者は私のところへ。杖と傷薬の残りも、出発前に確認しましょう。'},
    {speaker:'作戦',text:'町の住民を救援し、敵将を退けた後、佐々木久美で城門を制圧せよ。武器屋・道具屋では軍資金を使って補給できる。'}
  ];
  const chapterStartTalk = [
    {speaker:'井口眞緒',side:'left',text:'ここまで来たら、部隊というより、もう小さな国みたいだね。人も、お金も、持ち物も、ちゃんと考えないと。'},
    {speaker:'佐々木久美',side:'right',text:'うん。誰か一人だけ強くても進めない。必要な物は渡し合って、みんなで生き残ろう。'},
    {speaker:'河田陽菜',side:'left',text:'では、鍵と軽い武器は私に任せてください。持ちすぎていたら、ちゃんと交換しましょう。'}
  ];
  const recentJoinTalk = [
    {speaker:'河田陽菜',side:'right',text:'前の戦いでは、まだ皆さんの隣にいるのが少し不思議でした。'},
    {speaker:'加藤史帆',side:'left',text:'もう不思議じゃないよ。危ない時は呼んで。ちゃんと助けに行くから。'},
    {speaker:'河田陽菜',side:'right',text:'……はい。じゃあ遠慮なく呼びますね。'}
  ];
  const allyTalks = {
    'kyoko:toshi':[
      {speaker:'加藤史帆',side:'left',text:'京子、槍の残り大丈夫？　私の剣と交換する？'},
      {speaker:'齊藤京子',side:'right',text:'武器種まで変えたら扱えないでしょ。でも、気にしてくれてありがと。'},
      {speaker:'加藤史帆',side:'left',text:'じゃあ、隣で戦う。いつも通り。'}
    ],
    'hina:kumi':[
      {speaker:'佐々木久美',side:'left',text:'陽菜、町の中で一人で先へ行きすぎないでね。'},
      {speaker:'河田陽菜',side:'right',text:'大丈夫です。戻る場所があるのは分かっていますから。'},
      {speaker:'佐々木久美',side:'left',text:'その言葉、忘れないよ。'}
    ],
    'mao:sarina':[
      {speaker:'潮紗理菜',side:'left',text:'眞緒ちゃん、考え込むと周りが見えなくなるから気をつけて。'},
      {speaker:'井口眞緒',side:'right',text:'紗理菜が見ててくれるなら大丈夫！'},
      {speaker:'潮紗理菜',side:'left',text:'もう……でも、ちゃんと見ています。'}
    ]
  };
  const villageEvents = {
    '3,1':{scene:[{speaker:'村人',text:'王女様……本当に戻ってきてくださったのですね。これを再起のためにお使いください。'},{speaker:'佐々木久美',side:'left',text:'ありがとう。必ず町を取り戻します。皆さんは安全な場所へ。'}],reward:{gold:800,label:'軍資金 800G'}},
    '13,6':{scene:[{speaker:'武具職人',text:'教団兵に渡すくらいなら、あんたたちに託す。まだ刃こぼれはしていない。'},{speaker:'訪問者',text:'大切に使います。町を守るために。'}],reward:{item:'steelSword',label:'鋼の剣'}},
    '3,9':{scene:[{speaker:'老婦人',text:'戦えるものはないけれど、薬ならあります。無理をしないでくださいね。'},{speaker:'訪問者',text:'ありがとうございます。必ず皆で帰ります。'}],reward:{item:'vulnerary',label:'傷薬'}}
  };

  const $ = selector => document.querySelector(selector);
  const mapEl = $('#map');
  const logEl = $('#battleLog');
  let state, selectedId=null, reachable=new Map(), attackTiles=new Set(), pendingMove=null, dangerVisible=false, busy=false, storyState=null, sourceStamp=0;

  function parse(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function itemEntry(id,uses=null){const def=items[id];return{id,uses:Number.isFinite(uses)?uses:(def?.uses??null)};}

  function ensureInventory(unit){
    if(!Array.isArray(unit.inventory)){
      const inventory=[];
      if(unit.staves){Object.entries(unit.staves).forEach(([id,uses])=>{if(items[id]&&Number(uses)>0)inventory.push(itemEntry(id,Number(uses)));});}
      else if(unit.weapon&&items[unit.weapon])inventory.push(itemEntry(unit.weapon,Number.isFinite(unit.weaponUses)?unit.weaponUses:null));
      unit.inventory=inventory;
    }
    unit.inventory=unit.inventory.filter(entry=>entry&&items[entry.id]&&(entry.uses==null||entry.uses>0)).map(entry=>itemEntry(entry.id,entry.uses)).slice(0,MAX_ITEMS);
    if(!Number.isInteger(unit.equippedIndex)||unit.equippedIndex<0||unit.equippedIndex>=unit.inventory.length)unit.equippedIndex=unit.inventory.findIndex(entry=>['weapon','staff'].includes(items[entry.id]?.kind));
    if(unit.equippedIndex<0)unit.equippedIndex=0;
    syncEquipped(unit);return unit;
  }
  function syncEquipped(unit){
    let equipped=unit.inventory?.[unit.equippedIndex];
    if(!equipped||!['weapon','staff'].includes(items[equipped.id]?.kind)){const index=unit.inventory?.findIndex(entry=>['weapon','staff'].includes(items[entry.id]?.kind))??-1;unit.equippedIndex=index>=0?index:0;}
    equipped=unit.inventory?.[unit.equippedIndex];
    if(equipped&&['weapon','staff'].includes(items[equipped.id]?.kind)){unit.weapon=equipped.id;unit.weaponUses=equipped.uses;if(items[equipped.id].kind==='staff'){unit.staves=unit.staves||{};unit.staves[equipped.id]=equipped.uses;}}
    else{unit.weapon=null;unit.weaponUses=0;}
  }
  function currentEntry(unit){ensureInventory(unit);return unit.inventory[unit.equippedIndex]||null;}
  function currentItem(unit){return items[currentEntry(unit)?.id]||null;}

  function defaultAllies(){return[
    {id:'kumi',name:'佐々木久美',short:'久',faction:'ally',className:'ロード',lv:4,exp:0,hp:26,maxHp:26,str:8,mag:0,skl:10,spd:10,lck:9,def:8,res:3,move:5,lord:true,inventory:[itemEntry('ironSword',36),itemEntry('vulnerary',3)],equippedIndex:0},
    {id:'toshi',name:'加藤史帆',short:'史',faction:'ally',className:'ソシアルナイト',lv:4,exp:0,hp:28,maxHp:28,str:11,mag:0,skl:7,spd:11,lck:7,def:8,res:2,move:7,inventory:[itemEntry('slimSword',26),itemEntry('javelin',18)],equippedIndex:0},
    {id:'kyoko',name:'齊藤京子',short:'京',faction:'ally',className:'ソシアルナイト',lv:4,exp:0,hp:28,maxHp:28,str:10,mag:0,skl:12,spd:8,lck:6,def:12,res:3,move:7,inventory:[itemEntry('ironLance',34),itemEntry('vulnerary',3)],equippedIndex:0},
    {id:'sarina',name:'潮紗理菜',short:'潮',faction:'ally',className:'シスター',lv:4,exp:0,hp:21,maxHp:21,str:1,mag:9,skl:9,spd:9,lck:13,def:3,res:11,move:5,inventory:[itemEntry('live',16),itemEntry('relive',8)],equippedIndex:0},
    {id:'hina',name:'河田陽菜',short:'陽',faction:'ally',className:'盗賊',lv:4,exp:0,hp:23,maxHp:23,str:7,mag:0,skl:11,spd:13,lck:14,def:4,res:5,move:6,inventory:[itemEntry('slimSword',24),itemEntry('doorKey',1)],equippedIndex:0},
    {id:'mao',name:'井口眞緒',short:'眞',faction:'ally',className:'軍師',lv:5,exp:0,hp:24,maxHp:24,str:7,mag:6,skl:10,spd:9,lck:9,def:6,res:8,move:5,inventory:[itemEntry('ironSword',30),itemEntry('vulnerary',3)],equippedIndex:0}
  ];}

  function buildAllies(progress){
    const defaults=defaultAllies(),carried=Array.isArray(progress?.units)?progress.units:[],prior=Object.fromEntries(carried.map(unit=>[unit.id,unit])),merged=[];
    defaults.forEach(template=>{const source=prior[template.id];if(!source&&['hina','mao'].includes(template.id)&&carried.length)return;const unit=source?{...clone(template),...clone(source),faction:'ally',acted:false,hp:source.maxHp||template.maxHp}:clone(template);ensureInventory(unit);merged.push(unit);});
    carried.forEach(source=>{if(merged.some(unit=>unit.id===source.id))return;const unit={...clone(source),faction:'ally',acted:false,hp:source.maxHp};ensureInventory(unit);merged.push(unit);});
    const starts=[[2,11],[3,11],[2,10],[3,10],[4,11],[4,10],[1,10],[5,11]];
    return merged.map((unit,index)=>({...unit,x:starts[index]?.[0]??2,y:starts[index]?.[1]??11,acted:false}));
  }

  function enemyUnits(){
    const make=(id,name,short,className,x,y,lv,hp,str,skl,spd,def,res,move,weapon,ai='advance',extra={})=>({id,name,short,faction:'enemy',className,x,y,lv,exp:0,hp,maxHp:hp,str,mag:0,skl,spd,lck:2,def,res,move,inventory:[itemEntry(weapon)],equippedIndex:0,ai,...extra});
    return[
      make('e1','封鎖兵','槍','兵士',6,10,4,21,8,7,6,6,1,4,'ironLance'),make('e2','封鎖兵','斧','戦士',8,10,4,23,9,6,6,5,0,4,'ironAxe'),
      make('e3','封鎖兵','弓','弓兵',10,9,4,20,8,8,7,4,1,4,'ironBow','guard'),make('e4','封鎖兵','剣','剣士',6,8,5,21,8,10,10,5,2,5,'steelSword','guard'),
      make('e5','封鎖兵','槍','兵士',9,8,5,22,9,8,7,7,2,4,'javelin','guard'),make('e6','教団兵','斧','戦士',4,7,5,24,10,6,6,5,1,4,'handAxe'),
      make('e7','教団兵','弓','弓兵',11,7,5,21,9,9,7,4,2,4,'ironBow','guard'),make('e8','教団兵','槍','兵士',5,4,5,23,9,8,7,7,2,4,'ironLance','guard'),
      make('e9','教団兵','斧','戦士',9,4,5,24,10,7,6,6,1,4,'ironAxe','guard'),make('e10','教団兵','弓','弓兵',12,3,6,22,9,10,8,5,2,4,'ironBow','guard'),
      make('e11','親衛兵','剣','剣士',13,2,6,23,10,11,11,6,3,5,'steelSword','guard'),make('boss','城門指揮官','将','重装兵',14,1,8,31,12,9,5,13,5,1,'javelin','hold',{boss:true,lck:5})
    ].map(ensureInventory);
  }

  function freshState(progress,campaignStamp){return{sourceCampaignUpdatedAt:campaignStamp,turn:1,phase:'ally',cleared:false,bossDefeated:false,gold:Number.isFinite(progress?.gold)?progress.gold:3000,convoy:clone(progress?.convoy||[]),villages:[],eventFlags:clone(progress?.flags||{}),reinforcements:[],units:[...buildAllies(progress),...enemyUnits()],log:['宿場町を救援し、城門への道を開け。']};}
  function migrate(saved,progress,campaignStamp){if(!saved||!Array.isArray(saved.units)||saved.sourceCampaignUpdatedAt!==campaignStamp)return null;saved.gold=Number.isFinite(saved.gold)?saved.gold:(progress?.gold??3000);saved.convoy=Array.isArray(saved.convoy)?saved.convoy:clone(progress?.convoy||[]);saved.villages=Array.isArray(saved.villages)?saved.villages:[];saved.eventFlags={...(progress?.flags||{}),...(saved.eventFlags||{})};saved.units.forEach(ensureInventory);return saved;}

  async function init(){
    const campaign=window.HinataCampaign?.load();sourceStamp=campaign?.updatedAt||0;
    const progress=window.HinataCampaign?.loadProgressForChapter(4)||{units:[],gold:3000,convoy:[],flags:{},extra:{}};
    state=migrate(parse(SAVE_KEY),progress,sourceStamp)||freshState(progress,sourceStamp);
    mapEl.style.gridTemplateColumns=`repeat(${W},var(--tile))`;mapEl.style.gridTemplateRows=`repeat(${H},var(--tile))`;
    buildMap();bindUI();render();save(true);
    if(!state.eventFlags.chapter4IntroSeen){state.eventFlags.chapter4IntroSeen=true;await sleep(80);await playScene(introScene,'第4章');await playScene(chapterStartTalk,'出陣前');if(byId('hina')&&!state.eventFlags.hinaJoinFollowupSeen){state.eventFlags.hinaJoinFollowupSeen=true;await playScene(recentJoinTalk,'仲間になった後で');}save(true);}
  }

  function buildMap(){mapEl.innerHTML='';for(let y=0;y<H;y++)for(let x=0;x<W;x++){const tile=document.createElement('div');tile.className=`tile ${mapData[y][x]}`;tile.dataset.x=x;tile.dataset.y=y;tile.title=terrain[mapData[y][x]].name;tile.addEventListener('click',()=>onTile(x,y));mapEl.appendChild(tile);}}
  function bindUI(){$('#dangerButton').onclick=()=>{dangerVisible=!dangerVisible;render();};$('#endTurnButton').onclick=()=>{if(state.phase==='ally'&&!busy&&!state.cleared&&confirm('自軍ターンを終了しますか？'))endAllyTurn();};$('#menuButton').onclick=showMenu;$('#storyBack').onclick=()=>stepStory(-1);$('#storyNext').onclick=()=>stepStory(1);}
  function key(x,y){return`${x},${y}`;}function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}function byId(id){return state.units.find(unit=>unit.id===id);}function unitAt(x,y){return state.units.find(unit=>unit.hp>0&&unit.x===x&&unit.y===y);}function tileEl(x,y){return mapEl.children[y*W+x];}

  function onTile(x,y){
    if(busy||state.cleared||state.phase!=='ally'||!$('#storyOverlay').hidden||!$('#levelOverlay').hidden)return;
    const clicked=unitAt(x,y),selected=byId(selectedId);
    if(selected&&selected.faction==='ally'&&!selected.acted&&clicked?.faction==='enemy'&&canAttack(selected,clicked)){showForecast(selected,clicked);return;}
    if(pendingMove){if(x===pendingMove.x&&y===pendingMove.y){showActions(selected);return;}cancelMove();}
    if(clicked&&selected&&clicked.id===selected.id&&selected.faction==='ally'&&!selected.acted){showActions(selected);return;}
    if(clicked){if(clicked.faction==='ally'&&!clicked.acted)selectUnit(clicked);else{selectedId=clicked.id;reachable.clear();attackTiles.clear();render();}return;}
    if(selected&&selected.faction==='ally'&&!selected.acted&&reachable.has(key(x,y))){pendingMove={fromX:selected.x,fromY:selected.y,x,y};selected.x=x;selected.y=y;reachable.clear();attackTiles=getAttackTiles(selected);render();showActions(selected);return;}
    clearSelection();
  }
  function selectUnit(unit){selectedId=unit.id;pendingMove=null;reachable=movementRange(unit);attackTiles=getAttackTiles(unit,reachable);render();}
  function clearSelection(){selectedId=null;pendingMove=null;reachable.clear();attackTiles.clear();render();}
  function cancelMove(){const unit=byId(selectedId);if(unit&&pendingMove){unit.x=pendingMove.fromX;unit.y=pendingMove.fromY;}pendingMove=null;if(unit)selectUnit(unit);else clearSelection();}

  function movementRange(unit){const result=new Map([[key(unit.x,unit.y),0]]),queue=[[unit.x,unit.y,0]];while(queue.length){const[x,y,cost]=queue.shift();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const tile=terrain[mapData[ny][nx]],nextCost=cost+tile.move,occupant=unitAt(nx,ny);if(tile.move>=99||nextCost>unit.move||(occupant&&occupant.id!==unit.id&&occupant.faction!==unit.faction))continue;const tileKey=key(nx,ny);if(!result.has(tileKey)||nextCost<result.get(tileKey)){result.set(tileKey,nextCost);queue.push([nx,ny,nextCost]);}}}return result;}
  function getAttackTiles(unit,rangeMap=null){const weapon=currentItem(unit),result=new Set();if(!weapon||weapon.kind!=='weapon'||usesLeft(unit)<=0)return result;const origins=rangeMap?[...rangeMap.keys()].map(value=>value.split(',').map(Number)):[[unit.x,unit.y]];for(const[x,y]of origins)for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++)if(weapon.range.includes(Math.abs(xx-x)+Math.abs(yy-y)))result.add(key(xx,yy));return result;}
  function usesLeft(unit){return currentEntry(unit)?.uses||0;}
  function canAttack(attacker,defender){const weapon=currentItem(attacker);return Boolean(weapon&&weapon.kind==='weapon'&&usesLeft(attacker)>0&&weapon.range.includes(dist(attacker,defender)));}
  function getHealTargets(unit){const staff=currentItem(unit);if(!staff||staff.kind!=='staff'||usesLeft(unit)<=0)return[];return state.units.filter(target=>target.faction==='ally'&&target.id!==unit.id&&target.hp>0&&target.hp<target.maxHp&&staff.range.includes(dist(unit,target)));}
  function adjacentAllies(unit){return state.units.filter(other=>other.faction==='ally'&&other.id!==unit.id&&other.hp>0&&dist(unit,other)===1);}
  function talkKey(a,b){return[a.id,b.id].sort().join(':');}
  function availableAllyTalk(unit){return adjacentAllies(unit).find(other=>allyTalks[talkKey(unit,other)]&&!state.eventFlags[`allyTalk:${talkKey(unit,other)}`]);}
  function bossTalkAvailable(unit){const boss=byId('boss');return unit.id==='mao'&&boss?.hp>0&&dist(unit,boss)===1&&!state.eventFlags.chapter4BossTalk;}

  function showActions(unit){
    const box=$('#actionButtons');box.innerHTML='';
    const enemies=state.units.filter(other=>other.faction==='enemy'&&other.hp>0&&canAttack(unit,other)),healTargets=getHealTargets(unit),partner=adjacentAllies(unit)[0],allyTalk=availableAllyTalk(unit),itemIndex=unit.inventory.findIndex(entry=>items[entry.id]?.kind==='item'&&items[entry.id]?.heal&&entry.uses>0),terrainName=mapData[unit.y][unit.x];
    if(enemies.length)addAction('攻撃',()=>chooseTarget(unit,enemies));if(healTargets.length)addAction('杖',()=>chooseHealTarget(unit,healTargets));if(allyTalk)addAction('会話',()=>playAllyTalk(unit,allyTalk));if(bossTalkAvailable(unit))addAction('会話',()=>talkToBoss(unit,byId('boss')));if(partner)addAction('交換',()=>chooseTradePartner(unit));if(itemIndex>=0&&unit.hp<unit.maxHp)addAction('道具',()=>useHealingItem(unit,itemIndex));if(terrainName==='village'&&!state.villages.includes(key(unit.x,unit.y)))addAction('訪問',()=>visitVillage(unit));if(terrainName==='armory')addAction('武器屋',()=>openShop(unit,'armory'));if(terrainName==='vendor')addAction('道具屋',()=>openShop(unit,'vendor'));if(terrainName==='gate'&&unit.lord&&state.bossDefeated)addAction('制圧',clearChapter);addAction('待機',()=>finishAction(unit));if(pendingMove)addAction('取消',cancelMove);
  }
  function addAction(label,fn){const button=document.createElement('button');button.textContent=label;button.onclick=fn;$('#actionButtons').appendChild(button);}
  function chooseTarget(attacker,enemies){attackTiles=getAttackTiles(attacker);document.querySelectorAll('.tile').forEach(tile=>tile.classList.remove('target'));enemies.forEach(enemy=>tileEl(enemy.x,enemy.y).classList.add('target'));toast('攻撃する敵をタップ');}

  function chooseHealTarget(healer,targets){$('#modalContent').innerHTML=`<h2>${currentItem(healer).name}</h2><div id="healList" class="modal-actions"></div><div class="modal-actions"><button id="healCancel">戻る</button></div>`;targets.forEach(target=>{const amount=Math.min(target.maxHp-target.hp,currentItem(healer).heal+healer.mag),button=document.createElement('button');button.textContent=`${target.name}　HP ${target.hp}/${target.maxHp}　＋${amount}`;button.onclick=()=>{$('#modal').close();useStaff(healer,target);};$('#healList').appendChild(button);});$('#healCancel').onclick=()=>$('#modal').close();$('#modal').showModal();}
  async function useStaff(healer,target){if(busy)return;busy=true;const staff=currentItem(healer),entry=currentEntry(healer),before=target.hp;target.hp=Math.min(target.maxHp,target.hp+staff.heal+healer.mag);entry.uses-=1;syncEquipped(healer);addLog(`${healer.name}は${staff.name}を使った。${target.name}のHP ${before}→${target.hp}`);render();await animateHeal(target);await gainExp(healer,staff.exp);busy=false;finishAction(healer);}
  async function playAllyTalk(unit,other){const pair=talkKey(unit,other);state.eventFlags[`allyTalk:${pair}`]=true;await playScene(allyTalks[pair],'仲間会話');addLog(`${unit.name}と${other.name}が言葉を交わした。`);finishAction(unit);}
  async function talkToBoss(unit,boss){state.eventFlags.chapter4BossTalk=true;await playScene([{speaker:unit.name,side:'left',text:'あなたが守ろうとしているものと、教団が望んでいるものは同じではないはず。'},{speaker:boss.name,text:'……今さら引けば、私の部下も町の者も報復を受ける。'},{speaker:unit.name,side:'left',text:'なら、戦い方を選んで。少なくとも、町を焼く命令には従わないで。'}],'戦場会話');boss.str=Math.max(1,boss.str-1);boss.def=Math.max(0,boss.def-1);addLog('城門指揮官の迷いが生じた。力・守備が低下した。');finishAction(unit);}

  function chooseTradePartner(unit){const partners=adjacentAllies(unit);if(!partners.length)return toast('交換できる相手がいません');if(partners.length===1)return showTradeMenu(unit,partners[0]);$('#modalContent').innerHTML='<h2>交換相手</h2><div id="partnerList" class="modal-actions"></div>';partners.forEach(partner=>{const button=document.createElement('button');button.textContent=partner.name;button.onclick=()=>showTradeMenu(unit,partner);$('#partnerList').appendChild(button);});$('#modal').showModal();}
  function inventoryOptionMarkup(unit){return unit.inventory.map((entry,index)=>`<option value="${index}">${itemLabel(entry)}${index===unit.equippedIndex?'［装備］':''}</option>`).join('');}
  function showTradeMenu(actor,partner){
    ensureInventory(actor);ensureInventory(partner);
    $('#modalContent').innerHTML=`<h2>持ち物交換</h2><div class="trade-grid"><section class="trade-card"><h3>${actor.name}</h3><div>${inventorySummary(actor)}</div></section><section class="trade-card"><h3>${partner.name}</h3><div>${inventorySummary(partner)}</div></section></div><div class="trade-controls"><label>${actor.name}<select id="tradeA">${inventoryOptionMarkup(actor)}</select></label><label>${partner.name}<select id="tradeB">${inventoryOptionMarkup(partner)}</select></label><button id="swapItems">選択した二つを交換</button><button id="giveA">${actor.name}から渡す</button><button id="giveB">${partner.name}から渡す</button><button id="tradeCancel">戻る</button></div>`;
    const finishTrade=message=>{syncEquipped(actor);syncEquipped(partner);addLog(message);$('#modal').close();finishAction(actor);};
    $('#swapItems').onclick=()=>{if(!actor.inventory.length||!partner.inventory.length)return toast('交換する品がありません');const a=+$('#tradeA').value,b=+$('#tradeB').value;[actor.inventory[a],partner.inventory[b]]=[partner.inventory[b],actor.inventory[a]];finishTrade(`${actor.name}と${partner.name}が持ち物を交換した。`);};
    $('#giveA').onclick=()=>{if(partner.inventory.length>=MAX_ITEMS)return toast(`${partner.name}はこれ以上持てません`);const index=+$('#tradeA').value,[entry]=actor.inventory.splice(index,1);if(!entry)return;partner.inventory.push(entry);finishTrade(`${actor.name}は${partner.name}に${items[entry.id].name}を渡した。`);};
    $('#giveB').onclick=()=>{if(actor.inventory.length>=MAX_ITEMS)return toast(`${actor.name}はこれ以上持てません`);const index=+$('#tradeB').value,[entry]=partner.inventory.splice(index,1);if(!entry)return;actor.inventory.push(entry);finishTrade(`${partner.name}は${actor.name}に${items[entry.id].name}を渡した。`);};
    $('#tradeCancel').onclick=()=>$('#modal').close();if(!$('#modal').open)$('#modal').showModal();
  }
  function inventorySummary(unit){if(!unit.inventory.length)return'<p>持ち物なし</p>';return unit.inventory.map((entry,index)=>`<div class="inventory-row ${index===unit.equippedIndex?'equipped':''}"><span>${itemLabel(entry)}<small>${index===unit.equippedIndex?'装備中':''}</small></span></div>`).join('');}
  function itemLabel(entry){const def=items[entry.id];return`${def?.name||entry.id}${entry.uses!=null?` ${entry.uses}/${def?.uses??entry.uses}`:''}`;}
  async function useHealingItem(unit,index){const entry=unit.inventory[index],def=items[entry?.id];if(!def?.heal||unit.hp>=unit.maxHp)return;const before=unit.hp;unit.hp=Math.min(unit.maxHp,unit.hp+def.heal);entry.uses-=1;if(entry.uses<=0)unit.inventory.splice(index,1);ensureInventory(unit);addLog(`${unit.name}は${def.name}を使った。HP ${before}→${unit.hp}`);render();await animateHeal(unit);finishAction(unit);}

  async function visitVillage(unit){const tileKey=key(unit.x,unit.y),event=villageEvents[tileKey];if(!event||state.villages.includes(tileKey))return;state.villages.push(tileKey);const scene=event.scene.map(line=>line.speaker==='訪問者'?{...line,speaker:unit.name,side:'left'}:line);await playScene(scene,'村');if(event.reward.gold)state.gold+=event.reward.gold;else if(event.reward.item)giveItem(unit,itemEntry(event.reward.item));addLog(`${unit.name}は村で${event.reward.label}を受け取った。`);toast(`${event.reward.label}を入手`);finishAction(unit);}
  function giveItem(unit,entry){ensureInventory(unit);if(unit.inventory.length<MAX_ITEMS){unit.inventory.push(entry);syncEquipped(unit);return'unit';}state.convoy.push(entry);return'convoy';}

  function openShop(unit,type){
    const stock=type==='armory'?armoryStock:vendorStock,shopName=type==='armory'?'武器屋':'道具屋';
    const renderShop=()=>{
      $('#modalContent').innerHTML=`<h2>${shopName}</h2><div class="gold-display">軍資金 ${state.gold} G</div><div class="shop-grid"><section class="shop-card"><h3>購入</h3><div id="buyList" class="inventory-list"></div></section><section class="shop-card"><h3>売却</h3><div id="sellList" class="inventory-list"></div></section></div><div class="modal-actions"><button id="leaveShop">店を出る</button></div>`;
      stock.forEach(id=>{const def=items[id],row=document.createElement('div');row.className='inventory-row';row.innerHTML=`<span>${def.name}<small>${def.price} G</small></span>`;const button=document.createElement('button');button.textContent='買う';button.disabled=state.gold<def.price;button.onclick=()=>{if(state.gold<def.price)return toast('軍資金が足りません');state.gold-=def.price;const destination=giveItem(unit,itemEntry(id));addLog(`${unit.name}が${def.name}を購入した。${destination==='convoy'?'輸送隊へ送った。':''}`);render();renderShop();};row.appendChild(button);$('#buyList').appendChild(row);});
      if(!unit.inventory.length)$('#sellList').innerHTML='<p>売れる品がありません。</p>';
      unit.inventory.forEach((entry,index)=>{const def=items[entry.id],value=Math.max(1,Math.floor(def.price*(entry.uses??def.uses)/(def.uses||1)/2)),row=document.createElement('div');row.className=`inventory-row ${index===unit.equippedIndex?'equipped':''}`;row.innerHTML=`<span>${itemLabel(entry)}<small>${value} G</small></span>`;const button=document.createElement('button');button.textContent='売る';button.onclick=()=>{const[sold]=unit.inventory.splice(index,1);state.gold+=value;ensureInventory(unit);addLog(`${unit.name}が${items[sold.id].name}を売却した。`);render();renderShop();};row.appendChild(button);$('#sellList').appendChild(row);});
      $('#leaveShop').onclick=()=>{$('#modal').close();finishAction(unit);};
    };renderShop();if(!$('#modal').open)$('#modal').showModal();
  }

  function showForecast(attacker,defender){const a=forecast(attacker,defender),d=canAttack(defender,attacker)?forecast(defender,attacker):null;$('#modalContent').innerHTML=`<h2>戦闘予測</h2><div class="forecast">${forecastSide(attacker,a)}<div class="vs">VS</div>${forecastSide(defender,d)}</div><p>${triangleText(attacker,defender)}</p><div class="modal-actions"><button id="attackConfirm">攻撃</button><button id="attackCancel">戻る</button></div>`;$('#modal').showModal();$('#attackConfirm').onclick=()=>{$('#modal').close();battle(attacker,defender);};$('#attackCancel').onclick=()=>$('#modal').close();}
  function forecastSide(unit,result){if(!result)return`<div><strong>${unit.name}</strong><p>反撃不可</p></div>`;return`<div><strong>${unit.name}</strong><table><tr><td>HP</td><td>${unit.hp}</td></tr><tr><td>威力</td><td>${result.damage}×${result.hits}</td></tr><tr><td>命中</td><td>${result.hit}%</td></tr><tr><td>必殺</td><td>${result.crit}%</td></tr></table></div>`;}
  function triangle(attacker,defender){const A=currentItem(attacker)?.type,D=currentItem(defender)?.type,win=(A==='sword'&&D==='axe')||(A==='axe'&&D==='lance')||(A==='lance'&&D==='sword'),lose=(D==='sword'&&A==='axe')||(D==='axe'&&A==='lance')||(D==='lance'&&A==='sword');if(win)return{hit:15,might:1,state:'有利'};if(lose)return{hit:-15,might:-1,state:'不利'};return{hit:0,might:0,state:'なし'};}
  function triangleText(a,d){const result=triangle(a,d);return result.state==='なし'?'武器相性補正なし':`武器相性：${a.name}が${result.state}`;}
  function supportBonus(unit){if(!['toshi','kyoko'].includes(unit.id))return{hit:0,crit:0};const other=byId(unit.id==='toshi'?'kyoko':'toshi');return other&&other.hp>0&&dist(unit,other)<=2?{hit:10,crit:5}:{hit:0,crit:0};}
  function forecast(attacker,defender){const aw=currentItem(attacker),dw=currentItem(defender),tri=triangle(attacker,defender),tile=terrain[mapData[defender.y][defender.x]],attack=attacker.str+aw.might+tri.might,defense=defender.def+tile.def,damage=Math.max(0,attack-defense),attackSpeed=Math.max(0,attacker.spd-Math.max(0,aw.weight-attacker.str)),defenderSpeed=Math.max(0,defender.spd-Math.max(0,(dw?.weight||0)-defender.str)),hit=Math.max(0,Math.min(100,aw.hit+attacker.skl*2+attacker.lck+tri.hit-(defender.spd*2+defender.lck+tile.avo)+supportBonus(attacker).hit)),crit=Math.max(0,Math.min(100,aw.crit+Math.floor(attacker.skl/2)-defender.lck+supportBonus(attacker).crit));return{damage,hit,crit,hits:attackSpeed-defenderSpeed>=4?2:1};}

  async function battle(attacker,defender){
    if(busy)return;busy=true;
    if(attacker.faction==='ally'&&defender.boss&&!state.eventFlags.chapter4BossFirstCombat){state.eventFlags.chapter4BossFirstCombat=true;await playScene([{speaker:defender.name,text:'ここから先へは通さん。王女を捕らえれば、この町への処分は軽くなる。'},{speaker:attacker.name,side:'left',text:'人々を盾にして従わせるやり方を、ここで止める。'}],'初戦闘');}
    const aStart=attacker.hp,dStart=defender.hp;await strike(attacker,defender,false);if(defender.hp>0&&attacker.hp>0&&canAttack(defender,attacker))await strike(defender,attacker,false);if(attacker.hp>0&&defender.hp>0&&forecast(attacker,defender).hits===2)await strike(attacker,defender,true);if(defender.hp<=0)defeat(defender);if(attacker.hp<=0)defeat(attacker);if(attacker.faction==='ally'&&attacker.hp>0)await gainCombatExp(attacker,defender);addLog(`${attacker.name} HP ${aStart}→${Math.max(0,attacker.hp)} / ${defender.name} HP ${dStart}→${Math.max(0,defender.hp)}`);busy=false;if(attacker.faction==='ally'&&attacker.hp>0)finishAction(attacker);else{clearSelection();checkDefeat();}
  }
  async function strike(attacker,defender,followUp){if(attacker.hp<=0||defender.hp<=0||!canAttack(attacker,defender))return;const result=forecast(attacker,defender);decrementUse(attacker);await animateHit(defender);if(Math.random()*100>=result.hit){addLog(`${attacker.name}の攻撃は外れた。`);return;}const critical=Math.random()*100<result.crit,damage=result.damage*(critical?3:1);defender.hp=Math.max(0,defender.hp-damage);addLog(`${attacker.name}${followUp?'の追撃':''}！ ${critical?'必殺の一撃！ ':''}${defender.name}に${damage}ダメージ。`);render();await sleep(210);}
  function decrementUse(unit){const entry=currentEntry(unit);if(!entry)return;entry.uses=Math.max(0,(entry.uses||0)-1);if(entry.uses<=0){const broken=items[entry.id]?.name||entry.id;unit.inventory.splice(unit.equippedIndex,1);ensureInventory(unit);addLog(`${unit.name}の${broken}が壊れた。`);}else syncEquipped(unit);}
  function defeat(unit){addLog(`${unit.name}は戦闘不能になった。`);if(unit.boss){state.bossDefeated=true;addLog('城門を守る敵将を退けた。');}}
  function combatExp(unit,enemy){const diff=(enemy.lv||1)-(unit.lv||1);if(enemy.hp<=0)return enemy.boss?100:Math.max(15,Math.min(80,40+diff*8));return Math.max(5,Math.min(18,10+diff*2));}
  async function gainCombatExp(unit,enemy){const amount=combatExp(unit,enemy);addLog(`${unit.name}は経験値を${amount}獲得した。`);await gainExp(unit,amount);}
  async function gainExp(unit,amount){unit.exp=(unit.exp||0)+amount;while(unit.exp>=100){unit.exp-=100;const oldLevel=unit.lv,before={maxHp:unit.maxHp,str:unit.str,mag:unit.mag,skl:unit.skl,spd:unit.spd,lck:unit.lck,def:unit.def,res:unit.res};unit.lv+=1;const gains={},rates=growths[unit.id]||{maxHp:.60,str:.40,mag:.10,skl:.45,spd:.45,lck:.40,def:.35,res:.20};Object.entries(rates).forEach(([stat,rate])=>{if(Math.random()<rate){unit[stat]+=1;if(stat==='maxHp')unit.hp+=1;gains[stat]=1;}});addLog(`${unit.name}はレベル${unit.lv}になった！`);render();await showLevelUp(unit,oldLevel,before,gains);}}
  async function showLevelUp(unit,oldLevel,before,gains){const labels={maxHp:'HP',str:'力',mag:'魔力',skl:'技',spd:'速さ',lck:'幸運',def:'守備',res:'魔防'},order=['maxHp','str','mag','skl','spd','lck','def','res'];$('#levelPortrait').src=PORTRAITS[unit.name]||'';$('#levelName').textContent=unit.name;$('#levelClass').textContent=unit.className;$('#oldLevel').textContent=oldLevel;$('#newLevel').textContent=unit.lv;$('#levelStats').innerHTML=order.map(stat=>`<div class="level-stat ${gains[stat]?'pending':'no-gain'}" data-stat="${stat}"><span>${labels[stat]}</span><span class="before">${before[stat]}</span><span class="after">${unit[stat]}</span><span class="gain">+1</span></div>`).join('');const raised=order.filter(stat=>gains[stat]);$('#levelMessage').textContent='能力値を確認してください';$('#levelConfirm').disabled=true;$('#levelOverlay').hidden=false;for(const stat of raised){await sleep(280);$('#levelStats').querySelector(`[data-stat="${stat}"]`)?.classList.add('raised');}$('#levelMessage').textContent=raised.length?`${raised.length}項目の能力が上昇した！`:'能力上昇なし';await sleep(160);$('#levelConfirm').disabled=false;await new Promise(resolve=>{const close=()=>{$('#levelConfirm').removeEventListener('click',close);$('#levelOverlay').hidden=true;resolve();};$('#levelConfirm').addEventListener('click',close);});}

  function finishAction(unit){unit.acted=true;selectedId=null;pendingMove=null;reachable.clear();attackTiles.clear();save(true);render();const allies=state.units.filter(other=>other.faction==='ally'&&other.hp>0);if(allies.length&&allies.every(other=>other.acted))setTimeout(endAllyTurn,250);}
  async function endAllyTurn(){if(busy||state.cleared)return;state.phase='enemy';clearSelection();render();toast('敵軍フェイズ');await sleep(350);await enemyPhase();if(state.cleared)return;state.turn+=1;spawnReinforcements();state.phase='ally';state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).forEach(unit=>{unit.acted=false;});healForts();save(true);render();toast(`ターン ${state.turn}`);}
  async function enemyPhase(){busy=true;for(const enemy of state.units.filter(unit=>unit.faction==='enemy'&&unit.hp>0)){const targets=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0);if(!targets.length)break;const nearest=Math.min(...targets.map(target=>dist(enemy,target)));if(enemy.ai==='guard'&&nearest>5&&state.turn<4)continue;if(enemy.ai==='hold'&&nearest>2)continue;let target=targets.slice().sort((a,b)=>dist(enemy,a)-dist(enemy,b))[0];if(!canAttack(enemy,target)&&enemy.move>0){const step=bestMove(enemy,targets);if(step){enemy.x=step.x;enemy.y=step.y;render();await sleep(140);}}target=targets.filter(candidate=>canAttack(enemy,candidate)).sort((a,b)=>a.hp-b.hp)[0];if(target)await battleEnemy(enemy,target);}busy=false;checkDefeat();}
  function bestMove(unit,targets){const range=movementRange(unit);let best=null,score=Infinity;for(const tileKey of range.keys()){const[x,y]=tileKey.split(',').map(Number);if(unitAt(x,y)&&!(x===unit.x&&y===unit.y))continue;const value=Math.min(...targets.map(target=>Math.abs(x-target.x)+Math.abs(y-target.y)))-terrain[mapData[y][x]].def*.2;if(value<score){score=value;best={x,y};}}return best;}
  async function battleEnemy(enemy,target){let countered=false;await strike(enemy,target,false);if(target.hp>0&&enemy.hp>0&&canAttack(target,enemy)){countered=true;await strike(target,enemy,false);}if(enemy.hp>0&&target.hp>0&&forecast(enemy,target).hits===2)await strike(enemy,target,true);if(target.hp<=0)defeat(target);if(enemy.hp<=0)defeat(enemy);if(countered&&target.faction==='ally'&&target.hp>0)await gainCombatExp(target,enemy);render();await sleep(210);}
  function spawnReinforcements(){if(state.turn!==5||state.reinforcements.includes(5))return;state.reinforcements.push(5);state.units.push(...[
    {id:'r1',name:'増援兵',short:'槍',faction:'enemy',className:'兵士',x:1,y:4,lv:6,hp:23,maxHp:23,str:9,mag:0,skl:8,spd:7,lck:2,def:7,res:2,move:4,inventory:[itemEntry('ironLance')],equippedIndex:0,ai:'advance'},
    {id:'r2',name:'増援兵',short:'斧',faction:'enemy',className:'戦士',x:14,y:7,lv:6,hp:25,maxHp:25,str:10,mag:0,skl:7,spd:7,lck:2,def:6,res:1,move:4,inventory:[itemEntry('ironAxe')],equippedIndex:0,ai:'advance'}
  ].map(ensureInventory));addLog('街道の両端から増援が現れた。');}
  function healForts(){state.units.filter(unit=>unit.hp>0&&terrain[mapData[unit.y][unit.x]].heal).forEach(unit=>{unit.hp=Math.min(unit.maxHp,unit.hp+terrain[mapData[unit.y][unit.x]].heal);});}

  function clearChapter(){
    state.cleared=true;const roster=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).map(unit=>{const carried={...clone(unit),acted:false,hp:unit.maxHp};delete carried.x;delete carried.y;return carried;});const flags={...state.eventFlags,chapter4Cleared:true};
    window.HinataCampaign?.saveRoster(4,roster,{gold:state.gold,convoy:state.convoy,flags,turn4:state.turn});save(true);
    $('#modalContent').innerHTML=`<h2>第4章クリア</h2><p>現在のレベル、経験値、能力値、装備、耐久、所持品、軍資金を保存しました。</p><p>戦績　ターン ${state.turn} ／ 軍資金 ${state.gold}G</p><div class="campaign-next"><button id="replayChapter">この章をやり直す</button></div><p class="campaign-note">次章は、この章をクリアした時点のデータから続きます。</p>`;$('#modal').showModal();$('#replayChapter').onclick=()=>{localStorage.removeItem(SAVE_KEY);window.HinataCampaign?.resetFrom(4);location.reload();};
  }
  function checkDefeat(){const kumi=byId('kumi');if(!kumi||kumi.hp<=0||!state.units.some(unit=>unit.faction==='ally'&&unit.hp>0)){$('#modalContent').innerHTML='<h2>敗北</h2><p>部隊は町を突破できなかった。</p><div class="modal-actions"><button id="retry">やり直す</button><button id="loadBtn">読込</button></div>';$('#modal').showModal();$('#retry').onclick=()=>{localStorage.removeItem(SAVE_KEY);location.reload();};$('#loadBtn').onclick=()=>{const campaign=window.HinataCampaign?.load(),progress=window.HinataCampaign?.loadProgressForChapter(4);state=migrate(parse(SAVE_KEY),progress,campaign?.updatedAt||0)||freshState(progress,campaign?.updatedAt||0);$('#modal').close();render();};}}

  function showMenu(){$('#modalContent').innerHTML=`<h2>メニュー</h2><div class="gold-display">軍資金 ${state.gold} G</div><div class="modal-actions"><button id="saveBtn">セーブ</button><button id="loadBtn">読込</button></div><div class="modal-actions"><button id="introBtn">章導入を読む</button><button id="convoyBtn">輸送隊</button></div><div class="modal-actions"><button id="restartBtn">第4章を最初から</button></div><p>訪問した村 ${state.villages.length}/3</p>`;$('#modal').showModal();$('#saveBtn').onclick=()=>{save(false);$('#modal').close();};$('#loadBtn').onclick=()=>{const campaign=window.HinataCampaign?.load(),progress=window.HinataCampaign?.loadProgressForChapter(4),saved=migrate(parse(SAVE_KEY),progress,campaign?.updatedAt||0);if(saved){state=saved;clearSelection();$('#modal').close();render();toast('読み込みました');}};$('#introBtn').onclick=()=>{$('#modal').close();playScene(introScene,'第4章');};$('#convoyBtn').onclick=showConvoy;$('#restartBtn').onclick=()=>{if(confirm('現在の第4章の進行を消して、直前章クリア時のデータからやり直しますか？')){localStorage.removeItem(SAVE_KEY);location.reload();}};}
  function showConvoy(){$('#modalContent').innerHTML=`<h2>輸送隊</h2><div class="inventory-list">${state.convoy.length?state.convoy.map(entry=>`<div class="inventory-row"><span>${itemLabel(entry)}</span></div>`).join(''):'<p>預けている物はありません。</p>'}</div><div class="modal-actions"><button id="convoyBack">戻る</button></div>`;$('#convoyBack').onclick=showMenu;}
  function save(silent){localStorage.setItem(SAVE_KEY,JSON.stringify(state));if(!silent)toast('セーブしました');}

  function render(){$('#turnLabel').textContent=state.turn;$('#phaseLabel').textContent=state.phase==='ally'?'自軍':'敵軍';$('#goldLabel').textContent=`${state.gold} G`;$('#objectiveLabel').textContent=state.bossDefeated?'久美で城門を制圧':'町を救援し、敵将を退ける';document.querySelectorAll('.tile').forEach(tile=>{const x=+tile.dataset.x,y=+tile.dataset.y;tile.className=`tile ${mapData[y][x]}`;if(state.villages.includes(key(x,y)))tile.classList.add('saved');if(reachable.has(key(x,y)))tile.classList.add('move');if(attackTiles.has(key(x,y)))tile.classList.add('attack');if(dangerVisible&&dangerAt(x,y))tile.classList.add('danger-zone');if(selectedId&&byId(selectedId)?.x===x&&byId(selectedId)?.y===y)tile.classList.add('selected');});renderUnits();renderCard();renderLog();if(!pendingMove)$('#actionButtons').innerHTML='';$('#endTurnButton').disabled=state.phase!=='ally'||busy||state.cleared;}
  function renderUnits(){mapEl.querySelectorAll('.unit').forEach(node=>node.remove());for(const unit of state.units.filter(unit=>unit.hp>0)){const node=document.createElement('div');node.className=`unit ${unit.faction}${unit.acted?' acted':''}${unit.boss?' boss':''}`;node.style.left=`calc(${unit.x} * var(--tile))`;node.style.top=`calc(${unit.y} * var(--tile))`;node.dataset.hp=`${unit.hp}`;node.title=`${unit.name}／${unit.className}`;node.textContent=classMarks[unit.className]||unit.short;mapEl.appendChild(node);}}
  function renderCard(){const unit=byId(selectedId);if(!unit){$('#unitCard').className='panel-card empty';$('#unitCard').innerHTML='<h2>ユニット情報</h2><p>ユニットをタップしてください。</p>';return;}ensureInventory(unit);const item=currentItem(unit);$('#unitCard').className='panel-card';$('#unitCard').innerHTML=`<div class="unit-name"><strong>${unit.name}</strong><span>LV ${unit.lv||1} EXP ${unit.exp||0}</span></div><p>${unit.className}／${item?.name||'装備なし'} ${currentEntry(unit)?.uses??''}</p><div class="hpbar"><i style="width:${Math.max(0,unit.hp/unit.maxHp*100)}%"></i></div><div class="stats">${stat('HP',`${unit.hp}/${unit.maxHp}`)}${stat('力',unit.str)}${stat('魔',unit.mag)}${stat('技',unit.skl)}${stat('速',unit.spd)}${stat('幸',unit.lck)}${stat('守',unit.def)}${stat('魔防',unit.res)}</div><div class="unit-inventory-preview">${unit.inventory.map((entry,index)=>`${index===unit.equippedIndex?'▶ ':''}${itemLabel(entry)}`).join('<br>')||'持ち物なし'}</div>`;}
  function stat(label,value){return`<div class="stat"><span>${label}</span>${value}</div>`;}
  function renderLog(){logEl.innerHTML=state.log.slice(-35).reverse().map(text=>`<div class="log-entry">${escapeHtml(text)}</div>`).join('');}
  function dangerAt(x,y){return state.units.some(unit=>unit.faction==='enemy'&&unit.hp>0&&getAttackTiles(unit,movementRange(unit)).has(key(x,y)));}
  function addLog(text){state.log.push(text);}function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1500);}function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  async function animateHit(unit){const node=[...mapEl.querySelectorAll('.unit')].find(item=>item.title.startsWith(unit.name));if(!node)return;node.classList.add('hit');await sleep(120);node.classList.remove('hit');}
  async function animateHeal(unit){const node=[...mapEl.querySelectorAll('.unit')].find(item=>item.title.startsWith(unit.name));if(!node)return;node.classList.add('healed');await sleep(380);node.classList.remove('healed');}

  function playScene(lines,title='会話'){return new Promise(resolve=>{storyState={lines,index:0,title,resolve};$('#storyOverlay').hidden=false;renderStory();});}
  function stepStory(delta){if(!storyState)return;if(delta<0&&storyState.index>0){storyState.index-=1;renderStory();return;}if(delta>0&&storyState.index<storyState.lines.length-1){storyState.index+=1;renderStory();return;}if(delta>0&&storyState.index===storyState.lines.length-1){const resolve=storyState.resolve;storyState=null;$('#storyOverlay').hidden=true;resolve();}}
  function renderStory(){const line=storyState.lines[storyState.index];$('#storyChapter').textContent=storyState.title;$('#storyBack').disabled=storyState.index===0;$('#storyNext').textContent=storyState.index===storyState.lines.length-1?'閉じる':'次へ';if(!PORTRAITS[line.speaker]){$('#storyWindows').innerHTML=`<div class="speech narration active"><div class="speech-box"><span class="speaker">${escapeHtml(line.speaker)}</span><div>${escapeHtml(line.text)}</div></div></div>`;return;}const previous=[...storyState.lines.slice(0,storyState.index)].reverse().find(item=>PORTRAITS[item.speaker]&&item.speaker!==line.speaker),currentSide=line.side==='right'?'bottom':'top',old=previous?speechMarkup(previous,currentSide==='top'?'bottom':'top',false):'';$('#storyWindows').innerHTML=old+speechMarkup(line,currentSide,true);}
  function speechMarkup(line,position,active){return`<div class="speech ${position} ${active?'active':''}"><div class="portrait"><img src="${PORTRAITS[line.speaker]||''}" alt=""></div><div class="speech-box"><span class="speaker">${escapeHtml(line.speaker)}</span><div>${escapeHtml(line.text)}</div></div></div>`;}
  function escapeHtml(text){return String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}

  init();
})();
