(() => {
  'use strict';

  const NativeBlob = window.Blob;
  const PACING_VERSION = 2;

  function replaceSection(source,startMarker,endMarker,replacement,label) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker,start);
    if (start < 0 || end < 0) throw new Error(`${label}を特定できませんでした`);
    return source.slice(0,start) + replacement + source.slice(end);
  }

  function patchChapterFour(source) {
    if (!source.includes("const SAVE_KEY = 'hinata-senki-chapter4-save-v1';")) return source;
    if (!source.includes('  function enemyUnits(){') || !source.includes('  function render()')) return source;
    if (source.includes('chapter4PacingVersion')) return source;

    const storyBlock = `  const introScene = [
    {speaker:'ナレーション',text:'街道の先にある市場町は、敵軍の包囲を受けていた。狙われているのは城門ではない。食糧倉庫と店、そして町の外へ続く避難路だった。'},
    {speaker:'佐々木美玲',side:'right',text:'戦える人は少ないけど、ここには置いていけない人がたくさんいる。町を守るだけでは駄目。逃がす時間が必要なの。'},
    {speaker:'佐々木久美',side:'left',text:'分かった。倉庫と避難路を守りながら、住民を順番に外へ出す。敵将を倒すことより、町の人を生きて帰すことを優先しよう。'},
    {speaker:'井口眞緒',side:'right',text:'敵は正面だけを見ていないよ。市場の端から火を入れて、守る場所を増やすつもりかもしれない。'},
    {speaker:'作戦',text:'六ターンのあいだ重要施設を守り、避難路で三組の住民を誘導せよ。敵将の撃破は必須ではない。'}
  ];
  const chapterStartTalk = [
    {speaker:'加藤史帆',side:'left',text:'私は街道を走って、崩れそうな場所へすぐ戻る。最初から一か所に固まらない方がいいね。'},
    {speaker:'齊藤京子',side:'right',text:'私は倉庫側を受け持つ。敵を追いすぎず、守る線を切らさない。'},
    {speaker:'潮紗理菜',side:'left',text:'避難する人のそばでは戦闘を長引かせないでください。傷ついたら、すぐ戻ってきて。'}
  ];
  const recentJoinTalk = [
    {speaker:'佐々木美玲',side:'right',text:'昔の仲間だから来てくれた、とは思わないよ。今ここにいる人たちまで守ろうとしてくれたから、信じたい。'},
    {speaker:'佐々木久美',side:'left',text:'その人たちも含めて、一緒に未来を選べる部隊にする。まずはこの町を守り切ろう。'}
  ];
  const allyTalks = {
    'kumi:mirei':[
      {speaker:'佐々木美玲',side:'right',text:'久美ちゃん、敵将を追わなくていいの？'},
      {speaker:'佐々木久美',side:'left',text:'倒すことが目的じゃない。美玲と町の人が明日も暮らせる形を残すことが目的だよ。'},
      {speaker:'佐々木美玲',side:'right',text:'うん。じゃあ私は、最後の人が出るまでここにいる。'}
    ],
    'kyoko:toshi':[
      {speaker:'加藤史帆',side:'left',text:'京子、右の店が危なくなったら合図して。すぐ戻る。'},
      {speaker:'齊藤京子',side:'right',text:'分かった。私も倉庫だけ見て動かない、にはならないようにする。'},
      {speaker:'加藤史帆',side:'left',text:'離れてても、同じ町を守ってるからね。'}
    ],
    'mao:sarina':[
      {speaker:'井口眞緒',side:'right',text:'守る場所が多いと、みんな自分の前だけ見ちゃう。声を出し続けるね。'},
      {speaker:'潮紗理菜',side:'left',text:'お願いします。私は声が届いた方へ、治療に向かいます。'}
    ]
  };
  const villageEvents = {
    '3,1':{scene:[{speaker:'倉庫番',text:'この食糧は町だけのものではありません。山側の村へ送る分もあります。燃やされたら、次の冬を越せない。'},{speaker:'訪問者',text:'必ず守ります。運び出せる分から避難路へ回してください。'}],reward:{gold:500,label:'輸送準備金 500G'}},
    '12,6':{scene:[{speaker:'武具職人',text:'店を守るためではない。避難する人を守るために使ってくれ。'},{speaker:'訪問者',text:'受け取ります。店も人も、置いていきません。'}],reward:{item:'steelSword',label:'鋼の剣'}},
    '3,9':{scene:[{speaker:'治療師',text:'負傷者は先に避難させました。残った薬を持っていってください。'},{speaker:'訪問者',text:'ありがとうございます。最後の人まで道をつなぎます。'}],reward:{item:'vulnerary',label:'傷薬'}}
  };

  const marketSiteTemplates = [
    {id:'warehouse',name:'食糧倉庫',x:3,y:1,maxHp:3,critical:true},
    {id:'armory',name:'武器屋',x:11,y:1,maxHp:2,critical:false},
    {id:'vendor',name:'道具屋',x:12,y:9,maxHp:2,critical:false},
    {id:'route',name:'避難路',x:1,y:7,maxHp:3,critical:true}
  ];
  function createMarketSites(){return marketSiteTemplates.map(site=>({...site,hp:site.maxHp}));}
  function marketSite(id){return state.marketSites.find(site=>site.id===id);}
  function siteAt(x,y){return state.marketSites.find(site=>site.hp>0&&site.x===x&&site.y===y);}
  function criticalSiteLost(){return state.marketSites.some(site=>site.critical&&site.hp<=0);}
  function defenseReady(){return state.turn>6&&state.evacuated>=3&&!criticalSiteLost();}
  function marketDefenderUnit(){return ensureInventory({id:'mirei',name:'佐々木美玲',short:'美',faction:'ally',className:'弓兵',lv:6,exp:0,hp:25,maxHp:25,str:9,mag:0,skl:11,spd:10,lck:11,def:7,res:5,move:5,x:12,y:7,guest:true,inventory:[itemEntry('ironBow',34),itemEntry('vulnerary',3)],equippedIndex:0});}

`;
    source = replaceSection(source,'  const introScene = [','  const $ = selector',storyBlock,'第4章物語設定');

    const enemiesBlock = `  function enemyUnits(){
    const make=(id,name,short,className,x,y,lv,hp,str,skl,spd,def,res,move,weapon,ai='advance',extra={})=>({id,name,short,faction:'enemy',className,x,y,lv,exp:0,hp,maxHp:hp,str,mag:0,skl,spd,lck:2,def,res,move,inventory:[itemEntry(weapon)],equippedIndex:0,ai,...extra});
    return[
      make('e1','略奪兵','槍','兵士',6,10,5,22,9,8,7,7,2,4,'ironLance','raid',{objective:'route'}),
      make('e2','略奪兵','斧','戦士',9,10,5,25,11,7,7,6,1,4,'ironAxe','raid',{objective:'vendor'}),
      make('e3','火矢兵','弓','弓兵',10,8,6,22,9,10,8,5,2,4,'ironBow','raid',{objective:'armory'}),
      make('e4','封鎖兵','剣','剣士',6,7,6,23,10,12,11,6,3,5,'steelSword','guard'),
      make('e5','封鎖兵','槍','兵士',9,6,6,25,10,9,8,8,3,4,'javelin','guard'),
      make('e6','放火兵','斧','戦士',4,4,6,27,12,8,7,7,2,4,'handAxe','raid',{objective:'warehouse'}),
      make('boss','包囲指揮官','将','重装兵',14,1,9,34,13,10,6,14,6,1,'javelin','hold',{boss:true,lck:5,optional:true})
    ].map(ensureInventory);
  }

`;
    source = replaceSection(source,'  function enemyUnits(){','  function freshState(',enemiesBlock,'第4章敵配置');

    const stateBlock = `  function freshState(progress,campaignStamp){return{chapter4PacingVersion:2,sourceCampaignUpdatedAt:campaignStamp,turn:1,phase:'ally',cleared:false,bossDefeated:false,gold:Number.isFinite(progress?.gold)?progress.gold:3000,convoy:clone(progress?.convoy||[]),villages:[],eventFlags:clone(progress?.flags||{}),reinforcements:[],evacuated:0,marketSites:createMarketSites(),units:[...buildAllies(progress),marketDefenderUnit(),...enemyUnits()],log:['市場町の施設と避難路を守り、住民を逃がせ。']};}
  function migrate(saved,progress,campaignStamp){if(!saved||saved.chapter4PacingVersion!==2||!Array.isArray(saved.units)||saved.sourceCampaignUpdatedAt!==campaignStamp)return null;saved.gold=Number.isFinite(saved.gold)?saved.gold:(progress?.gold??3000);saved.convoy=Array.isArray(saved.convoy)?saved.convoy:clone(progress?.convoy||[]);saved.villages=Array.isArray(saved.villages)?saved.villages:[];saved.marketSites=Array.isArray(saved.marketSites)?saved.marketSites:createMarketSites();saved.evacuated=Number(saved.evacuated)||0;saved.eventFlags={...(progress?.flags||{}),...(saved.eventFlags||{})};saved.units.forEach(ensureInventory);return saved;}

`;
    source = replaceSection(source,'  function freshState(','  async function init(){',stateBlock,'第4章進行状態');

    const initBlock = `  async function init(){
    const campaign=window.HinataCampaign?.load();sourceStamp=campaign?.updatedAt||0;
    const progress=window.HinataCampaign?.loadProgressForChapter(4)||{units:[],gold:3000,convoy:[],flags:{},extra:{}};
    state=migrate(parse(SAVE_KEY),progress,sourceStamp)||freshState(progress,sourceStamp);
    $('#chapterLabel').textContent='第4章「市場町の防衛」';
    mapEl.style.gridTemplateColumns=\`repeat(\${W},var(--tile))\`;mapEl.style.gridTemplateRows=\`repeat(\${H},var(--tile))\`;
    buildMap();bindUI();render();save(true);
    if(!state.eventFlags.chapter4PacingIntroSeen){state.eventFlags.chapter4PacingIntroSeen=true;await sleep(80);await playScene(introScene,'第4章');await playScene(chapterStartTalk,'防衛配置');await playScene(recentJoinTalk,'町を守る理由');save(true);}
  }

`;
    source = replaceSection(source,'  async function init(){','  function buildMap()',initBlock,'第4章初期化');

    const actionBlock = `  function canGuideEvacuation(unit){const route=marketSite('route');return route?.hp>0&&state.evacuated<3&&Math.abs(unit.x-route.x)+Math.abs(unit.y-route.y)<=1;}
  async function guideEvacuation(unit){
    state.evacuated+=1;
    const lines=state.evacuated===1?[
      {speaker:'佐々木美玲',side:'right',text:'最初の人たちが動いた。道の両側を空けて、立ち止まらせないで。'},
      {speaker:unit.name,side:'left',text:'分かった。次の組が来るまで、ここを守る。'}
    ]:state.evacuated===3?[
      {speaker:'ナレーション',text:'最後の負傷者と子どもたちが避難路を抜けた。町に残るのは、防衛を担う者だけとなった。'},
      {speaker:'佐々木久美',side:'left',text:'避難は完了した。あとは施設を守り、包囲が崩れるまで持ちこたえる。'}
    ]:[{speaker:'ナレーション',text:'二組目の住民が避難路を抜けた。'}];
    await playScene(lines,'避難誘導');
    addLog(\`住民の避難を誘導した。 \${state.evacuated}/3\`);
    finishAction(unit);
  }

  function showActions(unit){
    const box=$('#actionButtons');box.innerHTML='';
    const enemies=state.units.filter(other=>other.faction==='enemy'&&other.hp>0&&canAttack(unit,other)),healTargets=getHealTargets(unit),partner=adjacentAllies(unit)[0],allyTalk=availableAllyTalk(unit),itemIndex=unit.inventory.findIndex(entry=>items[entry.id]?.kind==='item'&&items[entry.id]?.heal&&entry.uses>0),terrainName=mapData[unit.y][unit.x];
    if(enemies.length)addAction('攻撃',()=>chooseTarget(unit,enemies));if(healTargets.length)addAction('杖',()=>showStaffMenu(unit));if(allyTalk)addAction('会話',()=>playAllyTalk(unit,allyTalk));if(bossTalkAvailable(unit))addAction('会話',()=>talkToBoss(unit,byId('boss')));if(unit.inventory.some((entry,index)=>canEquip(unit,entry)&&index!==unit.equippedIndex))addAction('装備',()=>showEquipMenu(unit));if(partner)addAction('交換',()=>chooseTradePartner(unit));if(itemIndex>=0&&unit.hp<unit.maxHp)addAction('道具',()=>useHealingItem(unit,itemIndex));if(canGuideEvacuation(unit))addAction('誘導',()=>guideEvacuation(unit));if(terrainName==='village'&&!state.villages.includes(key(unit.x,unit.y)))addAction('訪問',()=>visitVillage(unit));if(terrainName==='armory')addAction('武器屋',()=>openShop(unit,'armory'));if(terrainName==='vendor')addAction('道具屋',()=>openShop(unit,'vendor'));addAction('待機',()=>finishAction(unit));if(pendingMove)addAction('取消',cancelMove);
  }
`;
    source = replaceSection(source,'  function showActions(unit){','  function addAction(',actionBlock,'第4章行動メニュー');

    const defeatOld = "function defeat(unit){addLog(`${unit.name}は戦闘不能になった。`);if(unit.boss){state.bossDefeated=true;addLog('城門を守る敵将を退けた。');}}";
    const defeatNew = "function defeat(unit){addLog(`${unit.name}は戦闘不能になった。`);if(unit.boss){state.bossDefeated=true;addLog('包囲指揮官を退けた。敵の圧力が弱まった。');state.marketSites.filter(site=>site.hp>0).forEach(site=>site.hp=Math.min(site.maxHp,site.hp+1));}}";
    if (!source.includes(defeatOld)) throw new Error('第4章撃破処理を特定できませんでした');
    source = source.replace(defeatOld,defeatNew);

    const turnBlock = `  async function endAllyTurn(){if(busy||state.cleared)return;state.phase='enemy';clearSelection();render();toast('敵軍フェイズ');await sleep(300);await enemyPhase();if(state.cleared||criticalSiteLost())return;state.turn+=1;spawnReinforcements();state.phase='ally';state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).forEach(unit=>{unit.acted=false;});healForts();save(true);render();if(defenseReady()){await clearChapter();return;}toast(\`ターン \${state.turn}\`);}

`;
    source = replaceSection(source,'  async function endAllyTurn(){','  async function enemyPhase(){',turnBlock,'第4章ターン進行');

    const enemyPhaseBlock = `  function preferredMarketSite(enemy){
    const named=state.marketSites.find(site=>site.id===enemy.objective&&site.hp>0);
    if(named)return named;
    return state.marketSites.filter(site=>site.hp>0).sort((a,b)=>(Math.abs(enemy.x-a.x)+Math.abs(enemy.y-a.y))-(Math.abs(enemy.x-b.x)+Math.abs(enemy.y-b.y)))[0]||null;
  }
  function bestMoveToPoint(unit,point){
    const range=movementRange(unit);let best=null,score=Infinity;
    for(const tileKey of range.keys()){const[x,y]=tileKey.split(',').map(Number);if(unitAt(x,y)&&!(x===unit.x&&y===unit.y))continue;const value=Math.abs(x-point.x)+Math.abs(y-point.y)-terrain[mapData[y][x]].def*.15;if(value<score){score=value;best={x,y};}}
    return best;
  }
  async function damageMarketSite(enemy,site){
    site.hp=Math.max(0,site.hp-1);addLog(\`\${enemy.name}が\${site.name}を攻撃した。耐久 \${site.hp}/\${site.maxHp}\`);render();await sleep(240);
    if(site.hp<=0){await playScene([{speaker:'ナレーション',text:\`\${site.name}が破壊された。\`},{speaker:'佐々木美玲',side:'right',text:site.critical?'そこを失ったら、町の人たちを守れない……！':'まだ守るべき場所は残ってる。立て直そう。'}],'施設被害');}
  }
  async function enemyPhase(){
    busy=true;
    for(const enemy of state.units.filter(unit=>unit.faction==='enemy'&&unit.hp>0)){
      const allies=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0);if(!allies.length)break;
      if(enemy.ai==='hold'&&state.turn<5&&Math.min(...allies.map(target=>dist(enemy,target)))>2)continue;
      const site=enemy.ai==='raid'?preferredMarketSite(enemy):null;
      if(site&&Math.abs(enemy.x-site.x)+Math.abs(enemy.y-site.y)<=1){await damageMarketSite(enemy,site);continue;}
      let target=allies.slice().sort((a,b)=>dist(enemy,a)-dist(enemy,b))[0];
      if(!canAttack(enemy,target)&&enemy.move>0){const step=site?bestMoveToPoint(enemy,site):bestMove(enemy,allies);if(step){enemy.x=step.x;enemy.y=step.y;render();await sleep(130);}}
      if(site&&Math.abs(enemy.x-site.x)+Math.abs(enemy.y-site.y)<=1){await damageMarketSite(enemy,site);continue;}
      target=allies.filter(candidate=>canAttack(enemy,candidate)).sort((a,b)=>a.hp-b.hp)[0];if(target)await battleEnemy(enemy,target);
    }
    busy=false;checkDefeat();
  }

`;
    source = replaceSection(source,'  async function enemyPhase(){','  function bestMove(',enemyPhaseBlock,'第4章敵行動');

    const reinforcementBlock = `  function spawnReinforcements(){
    const waves={
      2:[
        {id:'r2a',name:'西口襲撃兵',short:'斧',faction:'enemy',className:'戦士',x:1,y:4,lv:6,hp:25,maxHp:25,str:11,mag:0,skl:8,spd:7,lck:2,def:6,res:1,move:4,inventory:[itemEntry('ironAxe')],equippedIndex:0,ai:'raid',objective:'warehouse'},
        {id:'r2b',name:'西口襲撃兵',short:'槍',faction:'enemy',className:'兵士',x:1,y:7,lv:6,hp:23,maxHp:23,str:10,mag:0,skl:9,spd:8,lck:2,def:7,res:2,move:4,inventory:[itemEntry('ironLance')],equippedIndex:0,ai:'raid',objective:'route'}
      ],
      4:[
        {id:'r4a',name:'火矢増援',short:'弓',faction:'enemy',className:'弓兵',x:14,y:4,lv:7,hp:23,maxHp:23,str:10,mag:0,skl:11,spd:9,lck:3,def:5,res:3,move:4,inventory:[itemEntry('ironBow')],equippedIndex:0,ai:'raid',objective:'armory'},
        {id:'r4b',name:'東口襲撃兵',short:'斧',faction:'enemy',className:'戦士',x:14,y:7,lv:7,hp:27,maxHp:27,str:12,mag:0,skl:8,spd:8,lck:2,def:7,res:2,move:4,inventory:[itemEntry('handAxe')],equippedIndex:0,ai:'raid',objective:'vendor'}
      ],
      6:[
        {id:'r6a',name:'包囲兵',short:'剣',faction:'enemy',className:'剣士',x:6,y:1,lv:8,hp:25,maxHp:25,str:11,mag:0,skl:13,spd:13,lck:4,def:7,res:4,move:5,inventory:[itemEntry('steelSword')],equippedIndex:0,ai:'advance'}
      ]
    };
    const wave=waves[state.turn];if(!wave||state.reinforcements.includes(state.turn))return;state.reinforcements.push(state.turn);state.units.push(...wave.map(ensureInventory));addLog(state.turn===4?'敵が市場の東西から同時に攻め込んできた。':'新たな襲撃部隊が町へ入った。');
  }
`;
    source = replaceSection(source,'  function spawnReinforcements(){','  function healForts()',reinforcementBlock,'第4章増援');

    const endingBlock = `  async function clearChapter(){
    if(state.cleared)return;busy=true;
    await playScene([
      {speaker:'佐々木美玲',side:'right',text:'避難は終わった。倉庫も道も残ってる……町の人たちだけで守り続けられる形も作れそう。'},
      {speaker:'井口眞緒',side:'left',text:'捕まえた伝令が、食糧を止める命令書を持ってた。戦うためじゃなく、地方を飢えさせて従わせるための命令だよ。'},
      {speaker:'佐々木久美',side:'right',text:'この町だけの問題じゃない。命令が届いた経路を追う。次の場所では、誰がいつ偽の命令を流したのか確かめよう。'},
      {speaker:'佐々木美玲',side:'left',text:'町の守り方は皆に任せられる。私も行くよ。ここで守った暮らしを、別の町で壊させないために。'}
    ],'防衛のあと');
    state.cleared=true;const mirei=byId('mirei');if(mirei)mirei.guest=false;
    const roster=state.units.filter(unit=>unit.faction==='ally'&&unit.hp>0).map(unit=>{const carried={...clone(unit),acted:false,hp:unit.maxHp};delete carried.x;delete carried.y;return carried;});
    const flags={...state.eventFlags,chapter4Cleared:true,chapter4MireiJoined:true,chapter4LogisticsEvidence:true};
    window.HinataCampaign?.saveRoster(4,roster,{gold:state.gold,convoy:state.convoy,flags,turn4:state.turn,marketAssetsSaved:state.marketSites.filter(site=>site.hp>0).length});save(true);
    $('#modalContent').innerHTML=\`<h2>第4章クリア</h2><p>住民の避難と市場町の防衛に成功しました。</p><p>戦績　ターン \${state.turn} ／ 避難 \${state.evacuated}/3 ／ 維持施設 \${state.marketSites.filter(site=>site.hp>0).length}/4</p><div class="campaign-next"><button id="replayChapter">この章をやり直す</button></div><p class="campaign-note">入手した情報を追い、次の地域へ向かいます。</p>\`;$('#modal').showModal();$('#replayChapter').onclick=()=>{localStorage.removeItem(SAVE_KEY);window.HinataCampaign?.resetFrom(4);location.reload();};busy=false;
  }
  function checkDefeat(){const kumi=byId('kumi'),mirei=byId('mirei');if(!kumi||kumi.hp<=0||!mirei||mirei.hp<=0||criticalSiteLost()||!state.units.some(unit=>unit.faction==='ally'&&unit.hp>0)){const reason=criticalSiteLost()?'重要施設か避難路を失った。':'町の防衛線を維持できなかった。';$('#modalContent').innerHTML=\`<h2>敗北</h2><p>\${reason}</p><div class="modal-actions"><button id="retry">やり直す</button><button id="loadBtn">読込</button></div>\`;$('#modal').showModal();$('#retry').onclick=()=>{localStorage.removeItem(SAVE_KEY);location.reload();};$('#loadBtn').onclick=()=>{const campaign=window.HinataCampaign?.load(),progress=window.HinataCampaign?.loadProgressForChapter(4);state=migrate(parse(SAVE_KEY),progress,campaign?.updatedAt||0)||freshState(progress,campaign?.updatedAt||0);$('#modal').close();render();};}}

`;
    source = replaceSection(source,'  function clearChapter(){','  function showMenu()',endingBlock,'第4章終了');

    const menuBlock = `  function showMenu(){$('#modalContent').innerHTML=\`<h2>メニュー</h2><div class="gold-display">軍資金 \${state.gold} G</div><div class="modal-actions"><button id="saveBtn">セーブ</button><button id="loadBtn">読込</button></div><div class="modal-actions"><button id="introBtn">章導入を読む</button><button id="convoyBtn">輸送隊</button></div><div class="modal-actions"><button id="restartBtn">第4章を最初から</button></div><p>避難 \${state.evacuated}/3 ／ 防衛 \${Math.min(6,state.turn-1)}/6ターン</p><p>\${state.marketSites.map(site=>\`\${site.name} \${site.hp}/\${site.maxHp}\`).join(' ／ ')}</p>\`;$('#modal').showModal();$('#saveBtn').onclick=()=>{save(false);$('#modal').close();};$('#loadBtn').onclick=()=>{const campaign=window.HinataCampaign?.load(),progress=window.HinataCampaign?.loadProgressForChapter(4),saved=migrate(parse(SAVE_KEY),progress,campaign?.updatedAt||0);if(saved){state=saved;clearSelection();$('#modal').close();render();toast('読み込みました');}};$('#introBtn').onclick=()=>{$('#modal').close();playScene(introScene,'第4章');};$('#convoyBtn').onclick=showConvoy;$('#restartBtn').onclick=()=>{if(confirm('現在の第4章の進行を消して、直前章クリア時のデータからやり直しますか？')){localStorage.removeItem(SAVE_KEY);location.reload();}};}
`;
    source = replaceSection(source,'  function showMenu()','  function showConvoy()',menuBlock,'第4章メニュー');

    const renderBlock = `  function render(){
    $('#turnLabel').textContent=state.turn;$('#phaseLabel').textContent=state.phase==='ally'?'自軍':'敵軍';$('#goldLabel').textContent=\`\${state.gold} G\`;
    const remaining=Math.max(0,7-state.turn);$('#objectiveLabel').textContent=state.evacuated<3?\`避難誘導 \${state.evacuated}/3 ／ 防衛残り \${remaining}ターン\`:remaining>0?\`重要施設を防衛　残り \${remaining}ターン\`:'防衛線を維持してターン終了';
    document.querySelectorAll('.tile').forEach(tile=>{const x=+tile.dataset.x,y=+tile.dataset.y,tileKey=key(x,y);tile.className=\`tile \${mapData[y][x]}\`;if(state.villages.includes(tileKey))tile.classList.add('saved');const site=state.marketSites.find(entry=>entry.x===x&&entry.y===y);if(site){tile.classList.add('market-objective');if(site.hp<=0)tile.classList.add('site-destroyed');else if(site.hp<site.maxHp)tile.classList.add('site-damaged');if(site.id==='route')tile.classList.add('evacuation-route');}if(reachable.has(tileKey))tile.classList.add('move');if(attackTiles.has(tileKey))tile.classList.add('attack');if(dangerVisible&&dangerAt(x,y))tile.classList.add('danger-zone');if(selectedId&&byId(selectedId)?.x===x&&byId(selectedId)?.y===y)tile.classList.add('selected');});
    renderUnits();renderCard();renderLog();if(!pendingMove)$('#actionButtons').innerHTML='';$('#endTurnButton').disabled=state.phase!=='ally'||busy||state.cleared;
  }
`;
    source = replaceSection(source,'  function render()','  function renderUnits()',renderBlock,'第4章表示');

    return source;
  }

  function PacingPatchedBlob(parts = [],options = {}) {
    if (options?.type === 'text/javascript') {
      const text = parts.map(part=>typeof part==='string'?part:'').join('');
      if (text.includes("const SAVE_KEY = 'hinata-senki-chapter4-save-v1';") && text.includes('  function enemyUnits(){')) {
        return new NativeBlob([patchChapterFour(text)],options);
      }
    }
    return new NativeBlob(parts,options);
  }

  PacingPatchedBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(PacingPatchedBlob,NativeBlob);
  window.Blob = PacingPatchedBlob;

  const style=document.createElement('style');
  style.textContent=`
    .tile.market-objective{box-shadow:inset 0 0 0 3px #f4d15d,0 0 8px rgba(255,210,72,.55)}
    .tile.market-objective.site-damaged{box-shadow:inset 0 0 0 3px #ff934d,0 0 10px rgba(255,93,38,.62)}
    .tile.market-objective.site-destroyed{filter:grayscale(.9) brightness(.55);box-shadow:inset 0 0 0 3px #3d3028}
    .tile.evacuation-route:not(.site-destroyed)::after{content:'避';position:absolute;inset:0;display:grid;place-items:center;color:#fff3a0;font-weight:900;text-shadow:0 2px 3px #000}
  `;
  document.head.appendChild(style);
})();