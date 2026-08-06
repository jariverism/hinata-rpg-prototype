(() => {
  'use strict';

  const NativeBlob = window.Blob;

  function replaceSection(source,startMarker,endMarker,replacement,label) {
    const start=source.indexOf(startMarker);
    const end=source.indexOf(endMarker,start);
    if(start<0||end<0) throw new Error(`${label}を特定できませんでした`);
    return source.slice(0,start)+replacement+source.slice(end);
  }

  function patchChapterFive(source) {
    if (!source.includes("const SAVE_KEY = 'hinata-senki-chapter5-save-v1';")) return source;
    if (!source.includes('  function enemyUnits(){') || !source.includes('  function render()') || source.includes('function patchChapterFive')) return source;
    if (source.includes('chapter5PacingVersion')) return source;

    const mapBlock=`  const rows = [
    '##################',
    '#....m...S....E..#',
    '#.ffm.m..rrr..x..#',
    '#.V.m.m..r.xff...#',
    '#rrrrrBrrr..ff...#',
    '#..mm.~.S.x.m....#',
    '#..mm.~..x..m....#',
    '#rrrrrBrrrrrrrrrr#',
    '#..f..~.xff..m...#',
    '#..f..B..ff..m...#',
    '#.....r.....m....#',
    '#.....r..S..m....#',
    '#C....r..........#',
    '##################'
  ];
  const codeTerrain = {'#':'wall','.':'plain','r':'road','f':'forest','m':'mountain','x':'mist','~':'river','B':'bridge','V':'village','F':'fort','S':'beacon','E':'exit','C':'camp','W':'armory','D':'vendor'};
  const mapData = rows.map(row => [...row].map(code => codeTerrain[code] || 'plain'));

`;
    source=replaceSection(source,'  const rows = [','  const growths = {',mapBlock,'第5章追撃マップ');

    const storyBlock=`  const introScene = [
    {speaker:'ナレーション',text:'市場町で得た命令書を追い、一行は北の山道へ入った。山中では二つの避難隊が別々の道を進み、その間を敵の伝令が走っている。'},
    {speaker:'高本彩花',side:'right',text:'王都から来た命令は二種類ある。どちらかが偽物。でも、確かめる前に伝令を逃がしたら、また別の村が動かされる。'},
    {speaker:'東村芽依',side:'left',text:'避難する人を置いて追えない。だから、めいはこっちの道を守る。伝令はお願い。'},
    {speaker:'佐々木久美',side:'right',text:'二人の判断をどちらか一つに決めつけない。避難路を守りながら伝令を止め、見張り台で経路を確かめる。'},
    {speaker:'井口眞緒',side:'left',text:'追う相手と、守る相手と、近づかない方がいい部隊が同じ山にいる。全部倒そうとすると間に合わないよ。'},
    {speaker:'作戦',text:'逃走する伝令を止め、少なくとも一つの見張り台を調査せよ。分断された二人を守り、条件を満たしたら久美を山頂出口へ到達させよ。'}
  ];
  const chapterStartTalk = [
    {speaker:'加藤史帆',side:'left',text:'伝令は私が追う。でも後ろから来る敵まで全部相手にはしない。必要なら抜ける。'},
    {speaker:'齊藤京子',side:'right',text:'私は中央で二つの道をつなぐ。どちらかが押されたら、近い方へ回る。'},
    {speaker:'潮紗理菜',side:'left',text:'離れた二人にも回復が届くよう、合流する道を早めに作りましょう。'}
  ];
  const allyTalks = {
    'ayaka:mei':[
      {speaker:'高本彩花',side:'left',text:'私が伝令を追ったせいで、そっちの道を一人で守らせた。ごめん。'},
      {speaker:'東村芽依',side:'right',text:'めいが残るって決めた。あやが追ったから、命令のこと分かる。どっちも必要。'},
      {speaker:'高本彩花',side:'left',text:'……うん。今度は別々に動いても、同じ場所へ戻ろう。'}
    ],
    'ayaka:kumi':[
      {speaker:'佐々木久美',side:'left',text:'彩花が疑わなかったら、偽の命令はそのまま通っていた。'},
      {speaker:'高本彩花',side:'right',text:'でも疑って止まるだけじゃ、人は守れない。だから本物を捕まえる。'}
    ],
    'mei:toshi':[
      {speaker:'加藤史帆',side:'left',text:'芽依、一人で全部引き受けないで。私が戻れる道を空けておく。'},
      {speaker:'東村芽依',side:'right',text:'うん。しほが来るまで、ここ守る。来たら一緒に走る。'}
    ]
  };
  const villageEvents = {
    '2,3':{scene:[{speaker:'山村の長',text:'古い見張り台には、昔の伝令記録が残っています。新しい命令だけでなく、過去の日付も比べてください。'},{speaker:'訪問者',text:'ありがとうございます。逃げた伝令に追いつけなくても、記録から経路をたどります。'}],reward:{gold:700,label:'山道整備費 700G'}}
  };

  const courierExit={x:14,y:1};
  const towerInfo={
    '9,1':{kind:'route',label:'北見張り台'},
    '8,5':{kind:'signal',label:'中央見張り台'},
    '9,11':{kind:'record',label:'旧記録塔'}
  };
  function chapterFiveGuests(){return[
    ensureInventory({id:'ayaka',name:'高本彩花',short:'彩',faction:'ally',className:'弓兵',lv:7,exp:0,hp:26,maxHp:26,str:10,mag:0,skl:13,spd:12,lck:10,def:7,res:5,move:6,x:3,y:3,guest:true,inventory:[itemEntry('longBow',18),itemEntry('vulnerary',3)],equippedIndex:0}),
    ensureInventory({id:'mei',name:'東村芽依',short:'芽',faction:'ally',className:'剣士',lv:7,exp:0,hp:25,maxHp:25,str:11,mag:0,skl:14,spd:15,lck:12,def:7,res:4,move:6,x:13,y:8,guest:true,inventory:[itemEntry('steelSword',25),itemEntry('vulnerary',3)],equippedIndex:0})
  ];}
  function requiredGuestsAlive(){return['ayaka','mei'].every(id=>byId(id)?.hp>0);}
  function canClearChapter(){return state.dispatchSecured&&state.towers.length>=1&&requiredGuestsAlive();}
  async function revealDispatch(){
    if(state.eventFlags.chapter5DispatchScene)return;
    state.eventFlags.chapter5DispatchScene=true;
    await playScene([
      {speaker:'高本彩花',side:'left',text:'日付を見て。政変が起きるより前から、同じ偽印の命令が山へ送られてる。'},
      {speaker:'東村芽依',side:'right',text:'じゃあ、王都が変わってから始まったんじゃない。もっと前から、道を使ってた。'},
      {speaker:'佐々木久美',side:'left',text:'見張り台の記録と照合しよう。命令が来た方向と、その先へ向かった部隊を確かめる。'}
    ],'奪った命令書');
  }
  async function markCourierEscaped(){
    if(state.dispatchLost)return;
    state.dispatchLost=true;const courier=byId('courier');if(courier)courier.hp=0;
    addLog('敵の伝令が山頂の連絡路へ逃げ込んだ。');
    await playScene([
      {speaker:'高本彩花',side:'left',text:'逃げられた。でも終わりじゃない。古い見張り台なら、同じ経路の控えが残っているかもしれない。'},
      {speaker:'佐々木久美',side:'right',text:'追跡だけに全員を使わない。避難路を守りながら、旧記録塔を調べる。'}
    ],'伝令逃走');
  }
  async function inspectTower(unit){
    const tileKey=key(unit.x,unit.y),info=towerInfo[tileKey];if(!info||state.towers.includes(tileKey))return;
    state.towers.push(tileKey);
    if(info.kind==='record'&&state.dispatchLost&&!state.dispatchSecured){
      state.dispatchSecured=true;
      await playScene([
        {speaker:unit.name,side:'left',text:'記録が残っている。日付と印章が、奪った命令書の写しと一致する。'},
        {speaker:'井口眞緒',side:'right',text:'伝令を逃がしても、道そのものは嘘をつけなかったね。'}
      ],info.label);
      addLog('旧記録から命令経路を確認した。');
    }else if(info.kind==='route'){
      state.eventFlags.chapter5NorthernRouteKnown=true;
      await playScene([{speaker:unit.name,side:'left',text:'山頂までの細い道が見える。正面の重装部隊を全部倒さなくても抜けられる。'}],info.label);
      addLog('北側の離脱路を確認した。');
    }else{
      const guards=state.units.filter(enemy=>enemy.faction==='enemy'&&enemy.ai==='sleep');guards.forEach(enemy=>enemy.ai='guard');
      await playScene([{speaker:unit.name,side:'left',text:'敵の合図が見える。次に動く部隊を先に把握できた。'}],info.label);
      addLog('敵の待機部隊を把握した。');
    }
    if(info.kind==='record'&&!state.dispatchLost){
      state.eventFlags.chapter5RecordCorroborated=true;
      await playScene([
        {speaker:'高本彩花',side:'left',text:'古い記録にも同じ経路がある。奪った命令書だけが偽造されたわけじゃない。'},
        {speaker:'佐々木久美',side:'right',text:'政変より前から準備されていた証拠になる。'}
      ],info.label);
    }
    finishAction(unit);
  }

`;
    source=replaceSection(source,'  const introScene = [','  const $ = selector',storyBlock,'第5章物語設定');

    const enemiesBlock=`  function enemyUnits(){
    const make=(id,name,short,className,x,y,lv,hp,str,skl,spd,def,res,move,weapon,ai='advance',extra={})=>({id,name,short,faction:'enemy',className,x,y,lv,exp:0,hp,maxHp:hp,str,mag:0,skl,spd,lck:2,def,res,move,inventory:[itemEntry(weapon)],equippedIndex:0,ai,...extra});
    return[
      make('courier','敵伝令','令','剣士',13,4,7,20,8,12,14,5,4,7,'slimSword','escape',{important:true,lck:8}),
      make('e1','追跡兵','槍','兵士',5,11,7,25,10,9,8,8,3,4,'ironLance'),
      make('e2','追跡兵','斧','戦士',7,11,7,28,12,8,8,7,2,4,'steelAxe'),
      make('e3','山弓兵','弓','弓兵',11,10,7,23,10,11,9,6,3,4,'longBow','guard'),
      make('e4','東道剣士','剣','剣士',14,9,8,25,11,13,13,7,4,5,'steelSword','advance'),
      make('e5','橋守備兵','槍','兵士',9,8,8,27,11,10,9,9,3,4,'javelin','guard'),
      make('e6','伏兵','斧','戦士',12,6,8,29,13,8,8,7,2,4,'handAxe','sleep'),
      make('e7','伏兵','弓','弓兵',4,6,8,24,10,12,10,6,4,4,'longBow','sleep'),
      make('e8','峠兵','槍','兵士',9,4,8,27,11,10,8,9,3,4,'steelLance','guard'),
      make('boss','追撃隊長','将','重装兵',15,2,11,37,15,11,7,16,7,1,'javelin','hold',{boss:true,lck:6,optional:true})
    ].map(ensureInventory);
  }

`;
    source=replaceSection(source,'  function enemyUnits(){','  function freshState(',enemiesBlock,'第5章敵配置');

    const stateBlock=`  function freshState(progress,campaignStamp){return{chapter5PacingVersion:2,sourceCampaignUpdatedAt:campaignStamp,turn:1,phase:'ally',cleared:false,bossDefeated:false,gold:Number.isFinite(progress?.gold)?progress.gold:3000,convoy:clone(progress?.convoy||[]),villages:[],towers:[],dispatchSecured:false,dispatchLost:false,eventFlags:clone(progress?.flags||{}),reinforcements:[],units:[...buildAllies(progress),...chapterFiveGuests(),...enemyUnits()],log:['分断された二人を守り、逃走する伝令を止めろ。']};}
  function migrate(saved,progress,campaignStamp){if(!saved||saved.chapter5PacingVersion!==2||!Array.isArray(saved.units)||saved.sourceCampaignUpdatedAt!==campaignStamp)return null;saved.gold=Number.isFinite(saved.gold)?saved.gold:(progress?.gold??3000);saved.convoy=Array.isArray(saved.convoy)?saved.convoy:clone(progress?.convoy||[]);saved.villages=Array.isArray(saved.villages)?saved.villages:[];saved.towers=Array.isArray(saved.towers)?saved.towers:[];saved.dispatchSecured=Boolean(saved.dispatchSecured);saved.dispatchLost=Boolean(saved.dispatchLost);saved.eventFlags={...(progress?.flags||{}),...(saved.eventFlags||{})};saved.units.forEach(ensureInventory);return saved;}

`;
    source=replaceSection(source,'  function freshState(','  async function init(){',stateBlock,'第5章進行状態');

    const initBlock=`  async function init(){
    const campaign=window.HinataCampaign?.load();sourceStamp=campaign?.updatedAt||0;
    const progress=window.HinataCampaign?.loadProgressForChapter(5)||{units:[],gold:3000,convoy:[],flags:{},extra:{}};
    state=migrate(parse(SAVE_KEY),progress,sourceStamp)||freshState(progress,sourceStamp);
    $('#chapterLabel').textContent='第5章「山岳追撃戦」';
    mapEl.style.gridTemplateColumns=\`repeat(\${W},var(--tile))\`;mapEl.style.gridTemplateRows=\`repeat(\${H},var(--tile))\`;
    buildMap();bindUI();render();save(true);
    if(!state.eventFlags.chapter5PacingIntroSeen){state.eventFlags.chapter5PacingIntroSeen=true;await sleep(80);await playScene(introScene,'第5章');await playScene(chapterStartTalk,'追跡開始');save(true);}
  }

`;
    source=replaceSection(source,'  async function init(){','  function buildMap()',initBlock,'第5章初期化');

    const actionBlock=`  function showActions(unit){
    const box=$('#actionButtons');box.innerHTML='';
    const enemies=state.units.filter(other=>other.faction==='enemy'&&other.hp>0&&canAttack(unit,other)),healTargets=getHealTargets(unit),partner=adjacentAllies(unit)[0],allyTalk=availableAllyTalk(unit),itemIndex=unit.inventory.findIndex(entry=>items[entry.id]?.kind==='item'&&items[entry.id]?.heal&&entry.uses>0),terrainName=mapData[unit.y][unit.x],tileKey=key(unit.x,unit.y);
    if(enemies.length)addAction('攻撃',()=>chooseTarget(unit,enemies));
    if(healTargets.length)addAction('杖',()=>showStaffMenu(unit));
    if(allyTalk)addAction('会話',()=>playAllyTalk(unit,allyTalk));
    if(bossTalkAvailable(unit))addAction('会話',()=>talkToBoss(unit,byId('boss')));
    if(unit.inventory.some((entry,index)=>canEquip(unit,entry)&&index!==unit.equippedIndex))addAction('装備',()=>showEquipMenu(unit));
    if(partner)addAction('交換',()=>chooseTradePartner(unit));
    if(itemIndex>=0&&unit.hp<unit.maxHp)addAction('道具',()=>useHealingItem(unit,itemIndex));
    if(terrainName==='village'&&!state.villages.includes(tileKey))addAction('訪問',()=>visitVillage(unit));
    if(terrainName==='beacon'&&!state.towers.includes(tileKey))addAction('偵察',()=>inspectTower(unit));
    if(terrainName==='exit'&&unit.lord&&canClearChapter())addAction('離脱',clearChapter);
    addAction('待機',()=>finishAction(unit));if(pendingMove)addAction('取消',cancelMove);
  }
`;
    source=replaceSection(source,'  function showActions(unit){','  function addAction(',actionBlock,'第5章行動メニュー');

    const defeatStart=source.indexOf('function defeat(unit){');
    const defeatEnd=source.indexOf('\n  function combatExp',defeatStart);
    if(defeatStart<0||defeatEnd<0)throw new Error('第5章撃破処理を特定できませんでした');
    const defeatBlock=`function defeat(unit){
    if(unit.id==='courier'){
      state.dispatchSecured=true;unit.hp=0;addLog('敵伝令を止め、命令書を確保した。');return;
    }
    addLog(\`\${unit.name}は戦闘不能になった。\`);
    if(unit.boss){state.bossDefeated=true;addLog('追撃隊長を退けた。山頂への圧力が弱まった。');}
  }`;
    source=source.slice(0,defeatStart)+defeatBlock+source.slice(defeatEnd);

    const battleNeedle="if(defender.hp<=0)defeat(defender);if(attacker.hp<=0)defeat(attacker);";
    const battleReplacement="if(defender.hp<=0){defeat(defender);if(defender.id==='courier')await revealDispatch();}if(attacker.hp<=0)defeat(attacker);";
    if(!source.includes(battleNeedle))throw new Error('第5章伝令撃破イベントを特定できませんでした');
    source=source.replace(battleNeedle,battleReplacement);

    const turnBlock=`  async function endAllyTurn(){if(busy||state.cleared)return;state.phase='enemy';clearSelection();render();toast('敵軍フェイズ');await sleep(300);await enemyPhase();if(state.cleared)return;state.turn+=1;await spawnReinforcements();state.phase='ally';state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).forEach(unit=>{unit.acted=false;});healForts();save(true);render();toast(\`ターン \${state.turn}\`);}

`;
    source=replaceSection(source,'  async function endAllyTurn(){','  async function enemyPhase(){',turnBlock,'第5章ターン進行');

    const enemyBlock=`  function bestMoveToPoint(unit,point){
    const range=movementRange(unit);let best=null,score=Infinity;
    for(const tileKey of range.keys()){const[x,y]=tileKey.split(',').map(Number);if(unitAt(x,y)&&!(x===unit.x&&y===unit.y))continue;const value=Math.abs(x-point.x)+Math.abs(y-point.y)-terrain[mapData[y][x]].def*.15;if(value<score){score=value;best={x,y};}}
    return best;
  }
  async function moveCourier(courier){
    if(courier.x===courierExit.x&&courier.y===courierExit.y){await markCourierEscaped();return;}
    const step=bestMoveToPoint(courier,courierExit);if(step){courier.x=step.x;courier.y=step.y;render();await sleep(170);}
    if(courier.x===courierExit.x&&courier.y===courierExit.y)await markCourierEscaped();
  }
  async function enemyPhase(){
    busy=true;
    for(const enemy of state.units.filter(unit=>unit.faction==='enemy'&&unit.hp>0)){
      if(enemy.id==='courier'){await moveCourier(enemy);continue;}
      if(enemy.ai==='sleep')continue;
      const targets=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0);if(!targets.length)break;
      const nearest=Math.min(...targets.map(target=>dist(enemy,target)));
      if(enemy.ai==='guard'&&nearest>5&&state.turn<5)continue;
      if(enemy.ai==='hold'&&nearest>2&&state.turn<7)continue;
      let target=targets.slice().sort((a,b)=>dist(enemy,a)-dist(enemy,b))[0];
      if(!canAttack(enemy,target)&&enemy.move>0){const step=bestMove(enemy,targets);if(step){enemy.x=step.x;enemy.y=step.y;render();await sleep(130);}}
      target=targets.filter(candidate=>canAttack(enemy,candidate)).sort((a,b)=>a.hp-b.hp)[0];if(target)await battleEnemy(enemy,target);
    }
    busy=false;checkDefeat();
  }

`;
    source=replaceSection(source,'  async function enemyPhase(){','  function bestMove(',enemyBlock,'第5章敵行動');

    const reinforcementBlock=`  async function spawnReinforcements(){
    if(state.turn===3&&!state.reinforcements.includes(3)){
      state.reinforcements.push(3);state.units.filter(enemy=>enemy.faction==='enemy'&&enemy.ai==='sleep').forEach(enemy=>enemy.ai='advance');
      await playScene([
        {speaker:'井口眞緒',side:'left',text:'合図が変わった。さっきまで動かなかった部隊が、二つの避難路へ向かう！'},
        {speaker:'佐々木久美',side:'right',text:'伝令だけを追っている場合じゃない。中央をつないで、二人の退路を守る。'}
      ],'敵の合図');
      addLog('待機していた伏兵が動き始めた。');
    }
    if(state.turn===5&&!state.reinforcements.includes(5)){
      state.reinforcements.push(5);state.units.push(...[
        {id:'r5a',name:'後続追撃兵',short:'槍',faction:'enemy',className:'兵士',x:1,y:12,lv:9,hp:28,maxHp:28,str:12,mag:0,skl:10,spd:9,lck:3,def:9,res:3,move:4,inventory:[itemEntry('javelin')],equippedIndex:0,ai:'advance'},
        {id:'r5b',name:'後続追撃兵',short:'剣',faction:'enemy',className:'剣士',x:5,y:12,lv:9,hp:26,maxHp:26,str:12,mag:0,skl:14,spd:14,lck:4,def:7,res:4,move:5,inventory:[itemEntry('steelSword')],equippedIndex:0,ai:'advance'}
      ].map(ensureInventory));addLog('後方から追撃部隊が山道へ入った。');
    }
    if(state.turn===7&&!state.reinforcements.includes(7)){
      state.reinforcements.push(7);state.units.filter(enemy=>enemy.faction==='enemy'&&enemy.hp>0&&enemy.id!=='boss').forEach(enemy=>{if(enemy.ai==='guard'||enemy.ai==='sleep')enemy.ai='advance';});
      await playScene([{speaker:'高本彩花',side:'left',text:'山全体が動き始めた。ここから先は、倒し切るより出口へ抜けることを優先して！'}],'総追撃');
      addLog('敵の全追撃部隊が進軍を開始した。');
    }
  }
`;
    source=replaceSection(source,'  function spawnReinforcements(){','  function healForts()',reinforcementBlock,'第5章増援');

    const endingBlock=`  async function clearChapter(){
    if(state.cleared)return;busy=true;
    await playScene([
      {speaker:'高本彩花',side:'left',text:'見張り台の記録と命令書が一致した。偽の命令は、政変より前からこの道を通ってる。'},
      {speaker:'東村芽依',side:'right',text:'山の向こう、船の印がある。たくさんの荷物、海の方へ行った。'},
      {speaker:'井口眞緒',side:'left',text:'ただの逃走路じゃない。何かを運ぶ船団が、私たちより先に西へ向かってる。'},
      {speaker:'佐々木久美',side:'right',text:'休む時間は短い。港へ急ぐ。次は敵を追うだけじゃなく、船と避難する人たちの両方を守ることになる。'},
      {speaker:'高本彩花',side:'left',text:'山の連絡網は仲間に任せられる。私も行く。今度は偽の命令より先に、本当の情報を届ける。'},
      {speaker:'東村芽依',side:'right',text:'めいも行く。別の道でも、最後はみんなのところに戻る。'}
    ],'山頂で見えたもの');
    state.cleared=true;['ayaka','mei'].forEach(id=>{const unit=byId(id);if(unit)unit.guest=false;});
    const roster=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).map(unit=>{const carried={...clone(unit),acted:false,hp:unit.maxHp};delete carried.x;delete carried.y;return carried;});
    const flags={...state.eventFlags,chapter5Cleared:true,chapter5DispatchEvidence:true,chapter5AyakaJoined:true,chapter5MeiJoined:true};
    window.HinataCampaign?.saveRoster(5,roster,{gold:state.gold,convoy:state.convoy,flags,turn5:state.turn,towersChecked:state.towers.length});save(true);
    $('#modalContent').innerHTML=\`<h2>第5章クリア</h2><p>命令経路を確認し、山頂への離脱に成功しました。</p><p>戦績　ターン \${state.turn} ／ 見張り台 \${state.towers.length}/3</p><div class="campaign-next"><button id="replayChapter">この章をやり直す</button></div><p class="campaign-note">新たな動きを追い、直ちに次の地域へ向かいます。</p>\`;$('#modal').showModal();$('#replayChapter').onclick=()=>{localStorage.removeItem(SAVE_KEY);window.HinataCampaign?.resetFrom(5);location.reload();};busy=false;
  }
  function checkDefeat(){const kumi=byId('kumi');if(!kumi||kumi.hp<=0||!requiredGuestsAlive()||!state.units.some(unit=>unit.faction==='ally'&&unit.hp>0)){const reason=!requiredGuestsAlive()?'分断された仲間を守り切れなかった。':'追撃を振り切れなかった。';$('#modalContent').innerHTML=\`<h2>敗北</h2><p>\${reason}</p><div class="modal-actions"><button id="retry">やり直す</button><button id="loadBtn">読込</button></div>\`;$('#modal').showModal();$('#retry').onclick=()=>{localStorage.removeItem(SAVE_KEY);location.reload();};$('#loadBtn').onclick=()=>{const campaign=window.HinataCampaign?.load(),progress=window.HinataCampaign?.loadProgressForChapter(5);state=migrate(parse(SAVE_KEY),progress,campaign?.updatedAt||0)||freshState(progress,campaign?.updatedAt||0);$('#modal').close();render();};}}

`;
    source=replaceSection(source,'  function clearChapter(){','  function showMenu()',endingBlock,'第5章終了');

    const menuBlock=`  function showMenu(){$('#modalContent').innerHTML=\`<h2>メニュー</h2><div class="gold-display">軍資金 \${state.gold} G</div><div class="modal-actions"><button id="saveBtn">セーブ</button><button id="loadBtn">読込</button></div><div class="modal-actions"><button id="introBtn">章導入を読む</button><button id="convoyBtn">輸送隊</button></div><div class="modal-actions"><button id="restartBtn">第5章を最初から</button></div><p>命令書 \${state.dispatchSecured?'確保':'未確保'} ／ 見張り台 \${state.towers.length}/3</p><p>伝令 \${state.dispatchLost?'逃走済み（旧記録塔を調査）':byId('courier')?.hp>0?'逃走中':'停止'}</p>\`;$('#modal').showModal();$('#saveBtn').onclick=()=>{save(false);$('#modal').close();};$('#loadBtn').onclick=()=>{const campaign=window.HinataCampaign?.load(),progress=window.HinataCampaign?.loadProgressForChapter(5),saved=migrate(parse(SAVE_KEY),progress,campaign?.updatedAt||0);if(saved){state=saved;clearSelection();$('#modal').close();render();toast('読み込みました');}};$('#introBtn').onclick=()=>{$('#modal').close();playScene(introScene,'第5章');};$('#convoyBtn').onclick=showConvoy;$('#restartBtn').onclick=()=>{if(confirm('現在の第5章の進行を消して、直前章クリア時のデータからやり直しますか？')){localStorage.removeItem(SAVE_KEY);location.reload();}};}
`;
    source=replaceSection(source,'  function showMenu()','  function showConvoy()',menuBlock,'第5章メニュー');

    const renderBlock=`  function render(){
    $('#turnLabel').textContent=state.turn;$('#phaseLabel').textContent=state.phase==='ally'?'自軍':'敵軍';$('#goldLabel').textContent=\`\${state.gold} G\`;
    $('#objectiveLabel').textContent=!state.dispatchSecured?(state.dispatchLost?'旧記録塔で命令経路を確認':'逃走する伝令を止める'):state.towers.length<1?'見張り台を一つ調査':canClearChapter()?'久美で山頂出口から離脱':'分断された二人を守る';
    document.querySelectorAll('.tile').forEach(tile=>{const x=+tile.dataset.x,y=+tile.dataset.y,tileKey=key(x,y);tile.className=\`tile \${mapData[y][x]}\`;if(state.villages.includes(tileKey))tile.classList.add('saved');if(state.towers.includes(tileKey))tile.classList.add('lit');if(towerInfo[tileKey])tile.classList.add('watchtower');if(reachable.has(tileKey))tile.classList.add('move');if(attackTiles.has(tileKey))tile.classList.add('attack');if(dangerVisible&&dangerAt(x,y))tile.classList.add('danger-zone');if(selectedId&&byId(selectedId)?.x===x&&byId(selectedId)?.y===y)tile.classList.add('selected');});
    renderUnits();renderCard();renderLog();if(!pendingMove)$('#actionButtons').innerHTML='';$('#endTurnButton').disabled=state.phase!=='ally'||busy||state.cleared;
  }
`;
    source=replaceSection(source,'  function render()','  function renderUnits()',renderBlock,'第5章表示');

    return source;
  }

  function PacingPatchedBlob(parts=[],options={}) {
    if(options?.type==='text/javascript'){
      const text=parts.map(part=>typeof part==='string'?part:'').join('');
      if(text.includes("const SAVE_KEY = 'hinata-senki-chapter5-save-v1';")&&text.includes('  function enemyUnits(){')&&!text.includes('function patchChapterFive')){
        return new NativeBlob([patchChapterFive(text)],options);
      }
    }
    return new NativeBlob(parts,options);
  }

  PacingPatchedBlob.prototype=NativeBlob.prototype;
  Object.setPrototypeOf(PacingPatchedBlob,NativeBlob);
  window.Blob=PacingPatchedBlob;

  const style=document.createElement('style');
  style.textContent=`
    .tile.watchtower{box-shadow:inset 0 0 0 3px #c8b0ff,0 0 8px rgba(129,93,214,.58)}
    .tile.watchtower.lit{box-shadow:inset 0 0 0 3px #fff0a1,0 0 12px rgba(255,220,74,.75)}
  `;
  document.head.appendChild(style);
})();