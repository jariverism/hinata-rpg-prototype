(() => {
  'use strict';

  function patchNarrativeAndRole(source) {
    const introStart=source.indexOf('  const introScene = [');
    const meetingStart=source.indexOf('  const meetingScene = [',introStart);
    if(introStart<0||meetingStart<0) throw new Error('第3章導入会話を特定できませんでした');
    const intro=`  const introScene = [
    {speaker:'ナレーション',text:'砦を抜けた一行は、陽向王国と北方領を結ぶ二本橋へ到着した。国境軍は政変側へ従ったが、橋の両側にある村を人質同然に扱い、通行税と食料を取り立てている。'},
    {speaker:'佐々木久美',side:'left',text:'関門を越えれば追手を振り切れる。でも村を見捨てて通れば、私たちも占領軍と同じになる。両方の村に避難路を作ろう。'},
    {speaker:'加藤史帆',side:'right',text:'二本の橋を同時に守るなら、部隊を分けるしかないね。離れても、お互いの位置を見失わないようにしよう。'},
    {speaker:'齊藤京子',side:'left',text:'関門の横に知っている顔がいる。でも武器を持つ兵じゃない。あの人が何を守ってここに残っているのか、先に確かめたい。'},
    {speaker:'潮紗理菜',side:'right',text:'私に話させてください。無理に笑って場をつないでいるなら、きっと誰かを逃がすためです。'},
    {speaker:'作戦',text:'二つの村を訪問して避難路を確保し、関門守備隊を退けよ。関門付近の紫色のユニットには、関係のある仲間で話しかけることができる。'}
  ];

`;
    source=source.slice(0,introStart)+intro+source.slice(meetingStart);

    const relationStart=source.indexOf('  const meetingScene = [');
    const growthStart=source.indexOf('  const growths = {',relationStart);
    if(relationStart<0||growthStart<0) throw new Error('第3章戦場会話を特定できませんでした');
    const scenes=`  const meetingScenes = {
    kumi:[
      {speaker:'佐々木久美',side:'left',text:'眞緒。国境軍を指揮しているように見えたけど、兵に命令を出していない。ここで何をしているの？'},
      {speaker:'井口眞緒',side:'right',text:'宿場に逃げてきた人たちを、宴の一座に紛れ込ませてきたの。私が騒いで兵の目を引けば、その間に村の人が逃げられるから。'},
      {speaker:'佐々木久美',side:'left',text:'事情は分かった。二つの村を守る。終わったら、もう一度これからを話そう。'},
      {speaker:'井口眞緒',side:'right',text:'久美ちゃんが本当に村を守るなら、関門の兵を止める方法を教えるよ。'}
    ],
    sarina:[
      {speaker:'潮紗理菜',side:'left',text:'眞緒ちゃん。みんなを笑わせる声なのに、今日はずっと苦しそう。もう一人で時間を稼がなくていいよ。'},
      {speaker:'井口眞緒',side:'right',text:'さりなちゃん……私、兵士にも軍師にもなれなかった。でも騒いで踊れば、怖がっている子が少しだけ笑って、兵の目もそらせたの。'},
      {speaker:'潮紗理菜',side:'left',text:'それは戦えないということじゃない。眞緒ちゃんにしかできない守り方だよ。村の人も一緒に、私たちのところへ来て。'},
      {speaker:'井口眞緒',side:'right',text:'うん。今度は逃がすためだけじゃなく、みんなを前へ進ませるために踊る。'}
    ]
  };

`;
    source=source.slice(0,relationStart)+scenes+source.slice(growthStart);

    const oldGrowth="    mao:{maxHp:.75,str:.45,mag:.35,skl:.50,spd:.55,lck:.65,def:.30,res:.45}";
    const newGrowth="    mao:{maxHp:.75,str:.25,mag:.10,skl:.35,spd:.30,lck:.80,def:.20,res:.50}";
    if(!source.includes(oldGrowth)) throw new Error('井口の成長率を特定できませんでした');
    source=source.replace(oldGrowth,newGrowth);

    const oldMarks="  const classMarks = {'ロード':'旗','ソシアルナイト':'騎','シスター':'杖','盗賊':'鍵','剣士':'剣','戦士':'斧','兵士':'槍','弓兵':'弓','重装兵':'盾','軍師':'策'};";
    const newMarks="  const classMarks = {'ロード':'旗','ソシアルナイト':'騎','シスター':'杖','盗賊':'鍵','剣士':'剣','戦士':'斧','兵士':'槍','弓兵':'弓','重装兵':'盾','軍師':'策','踊り子':'舞'};";
    if(!source.includes(oldMarks)) throw new Error('兵種表示を特定できませんでした');
    source=source.replace(oldMarks,newMarks);

    const oldMao="      {id:'mao',name:'井口眞緒',short:'眞',faction:'guest',className:'軍師',x:13,y:2,lv:5,hp:23,maxHp:23,str:6,mag:5,skl:9,spd:8,lck:8,def:5,res:7,move:0,weapon:'slimSword',weaponUses:30,commander:true}";
    const newMao="      {id:'mao',name:'井口眞緒',short:'眞',faction:'guest',className:'踊り子',x:13,y:2,lv:5,hp:24,maxHp:24,str:4,mag:1,skl:6,spd:6,lck:11,def:4,res:7,move:0,weapon:'slimSword',weaponUses:30,commander:true,dancer:true}";
    if(!source.includes(oldMao)) throw new Error('井口のユニット定義を特定できませんでした');
    source=source.replace(oldMao,newMao);

    source=source.replace("      metCommander:false,","      metCommander:false,\n      maoBriefed:false,");

    const oldActions=`  function showActions(unit) {
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
`;
    const newActions=`  function encouragementTargets(unit) {
    if(unit.className!=='踊り子'||unit.faction!=='ally') return [];
    return state.units.filter(target=>target.faction==='ally'&&target.id!==unit.id&&target.hp>0&&target.acted&&dist(unit,target)===1);
  }

  function chooseEncouragement(unit,targets) {
    $('#modalContent').innerHTML='<h2>応援する仲間</h2><div id="encourageList" class="modal-actions"></div><div class="modal-actions"><button id="encourageCancel">戻る</button></div>';
    targets.forEach(target=>{
      const button=document.createElement('button');
      button.textContent=target.name;
      button.onclick=()=>{ $('#modal').close(); encourage(unit,target); };
      $('#encourageList').appendChild(button);
    });
    $('#encourageCancel').onclick=()=>$('#modal').close();
    $('#modal').showModal();
  }

  function encourage(unit,target) {
    target.acted=false;
    addLog(\`${'${unit.name}'}の応援で${'${target.name}'}が再び行動できる。\`);
    toast(\`${'${target.name}'}が再行動\`);
    finishAction(unit);
  }

  function showActions(unit) {
    const box=$('#actionButtons');
    box.innerHTML='';
    const enemiesInRange=state.units.filter(other=>other.faction==='enemy'&&other.hp>0&&canAttack(unit,other));
    const healTargets=getHealTargets(unit);
    const encourageTargets=encouragementTargets(unit);
    const villageKey=key(unit.x,unit.y);
    if (enemiesInRange.length) addAction('攻撃',()=>chooseTarget(unit,enemiesInRange));
    if (healTargets.length) addAction('杖',()=>showStaffMenu(unit,healTargets));
    if (encourageTargets.length) addAction('応援',()=>chooseEncouragement(unit,encourageTargets));
    if (mapData[unit.y][unit.x]==='village'&&!state.villages.includes(villageKey)) addAction('訪問',()=>visitVillage(unit,villageKey));
    const mao=byId('mao');
    if (['kumi','sarina'].includes(unit.id)&&mao?.hp>0&&dist(unit,mao)===1&&((unit.id==='sarina'&&!state.metCommander)||(unit.id==='kumi'&&!state.maoBriefed&&!state.metCommander))) addAction('会話',()=>meetCommander(unit));
    if (mapData[unit.y][unit.x]==='gate'&&unit.lord&&canClear()) addAction('制圧',clearChapter);
    addAction('待機',()=>finishAction(unit));
    if (pendingMove) addAction('取消',cancelMove);
  }
`;
    if(!source.includes(oldActions)) throw new Error('第3章行動メニューを特定できませんでした');
    source=source.replace(oldActions,newActions);

    const oldMeet=`  async function meetCommander(unit) {
    await playScene(meetingScene,'戦場会話');
    state.metCommander=true;
    addLog('互いの立場を確認した。');
    finishAction(unit);
  }
`;
    const newMeet=`  async function meetCommander(unit) {
    await playScene(meetingScenes[unit.id]||meetingScenes.kumi,'戦場会話');
    const mao=byId('mao');
    if(unit.id==='sarina') {
      state.metCommander=true;
      state.maoBriefed=true;
      if(mao){ mao.faction='ally'; mao.className='踊り子'; mao.dancer=true; mao.move=5; mao.acted=false; delete mao.commander; }
      addLog('一人で民間人を守っていた仲間が、自分の役割を選んで部隊に加わった。');
    } else {
      state.maoBriefed=true;
      addLog('関門に残る理由と、村を守るための取り決めを確認した。');
    }
    finishAction(unit);
  }
`;
    if(!source.includes(oldMeet)) throw new Error('第3章説得処理を特定できませんでした');
    source=source.replace(oldMeet,newMeet);

    const oldCan="  function canClear() { return state.bossDefeated&&state.villages.length>=2&&state.metCommander; }";
    const newCan="  function canClear() { return state.bossDefeated&&state.villages.length>=2&&(state.metCommander||state.maoBriefed); }";
    if(!source.includes(oldCan)) throw new Error('第3章勝利条件を特定できませんでした');
    source=source.replace(oldCan,newCan);

    const oldPush="    if (mao&&mao.hp>0&&!roster.some(unit=>unit.id==='mao')) roster.push({...mao,faction:'ally',acted:false,hp:mao.maxHp,move:5});";
    const newPush="    if (mao&&mao.hp>0&&!roster.some(unit=>unit.id==='mao')) roster.push({...mao,faction:'ally',className:'踊り子',dancer:true,commander:false,acted:false,hp:mao.maxHp,move:5});";
    if(!source.includes(oldPush)) throw new Error('第3章加入保存処理を特定できませんでした');
    source=source.replace(oldPush,newPush);

    const oldSave="    window.HinataCampaign?.saveRoster(3,roster,{turn3:state.turn});";
    const newSave="    window.HinataCampaign?.saveRoster(3,roster,{turn3:state.turn,flags:{chapter3RelationshipRecruit:state.metCommander,chapter3VillagesSaved:state.villages.length}});";
    if(!source.includes(oldSave)) throw new Error('第3章保存処理を特定できませんでした');
    return source.replace(oldSave,newSave);
  }

  function patchSource(source) {
    const oldWeapon = "    slimSword:{name:'細身の剣',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30},\n    ironLance:";
    const newWeapon = "    slimSword:{name:'細身の剣',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30},\n    dagger:{name:'鋼の短剣',type:'sword',might:4,hit:95,crit:5,weight:2,range:[1],uses:35},\n    ironLance:";
    if (!source.includes(oldWeapon)) throw new Error('第3章の武器定義を特定できませんでした');
    source = source.replace(oldWeapon,newWeapon);

    const oldFreshHeader = "    return {\n      turn:1,";
    const newFreshHeader = "    return {\n      sourceCampaignUpdatedAt:window.HinataCampaign?.load()?.updatedAt || 0,\n      turn:1,";
    if (!source.includes(oldFreshHeader)) throw new Error('第3章の初期状態を特定できませんでした');
    source = source.replace(oldFreshHeader,newFreshHeader);

    const oldMigrate = "  function migrate(saved) {\n    if (!saved?.units) return null;";
    const newMigrate = "  function migrate(saved) {\n    if (!saved?.units) return null;\n    const sourceStamp=window.HinataCampaign?.load()?.updatedAt || 0;\n    if (!saved.cleared && saved.sourceCampaignUpdatedAt!==sourceStamp) return null;\n    const oldMao=saved.units.find(unit=>unit.id==='mao');\n    if(oldMao&&oldMao.className==='軍師'){oldMao.className='踊り子';oldMao.dancer=true;oldMao.move=Math.max(5,oldMao.move||0);}";
    if (!source.includes(oldMigrate)) throw new Error('第3章のセーブ移行処理を特定できませんでした');
    source = source.replace(oldMigrate,newMigrate);

    const oldIntro = "    if (!sessionStorage.getItem('hinata-senki-ch3-intro')) {\n      sessionStorage.setItem('hinata-senki-ch3-intro','1');";
    const newIntro = "    const introKey=`hinata-senki-ch3-intro-${state.sourceCampaignUpdatedAt || 0}`;\n    if (!sessionStorage.getItem(introKey)) {\n      sessionStorage.setItem(introKey,'1');";
    if (!source.includes(oldIntro)) throw new Error('第3章導入処理を特定できませんでした');
    source = source.replace(oldIntro,newIntro);

    const selectionBlock = "    if (clicked) {\n      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);";
    const stationaryActionBlock = "    if (clicked && selected && clicked.id===selected.id && selected.faction==='ally' && !selected.acted) {\n      showActions(selected);\n      return;\n    }\n\n    if (clicked) {\n      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);";
    if (!source.includes(selectionBlock)) throw new Error('その場行動の選択処理を特定できませんでした');
    source = source.replace(selectionBlock,stationaryActionBlock);

    source=patchNarrativeAndRole(source);

    const oldClearMarkup = "<div class=\"campaign-next\"><button id=\"replayChapter\">この章をやり直す</button></div><p class=\"campaign-note\">次の章が追加されたときは、この保存データからそのまま続行します。</p>";
    const newClearMarkup = "<div class=\"campaign-next\"><button id=\"continueCampaign\">第4章へ進む</button><button id=\"replayChapter\">この章をやり直す</button></div><p class=\"campaign-note\">今クリアした部隊、経験値、装備、耐久をそのまま第4章へ引き継ぎます。</p>";
    if (!source.includes(oldClearMarkup)) throw new Error('第3章クリア画面を特定できませんでした');
    source = source.replace(oldClearMarkup,newClearMarkup);

    const oldReplayHook = "    $('#replayChapter').onclick=()=>{ localStorage.removeItem(SAVE_KEY); window.HinataCampaign?.resetFrom(3); location.reload(); };";
    const newReplayHook = "    $('#continueCampaign').onclick=()=>{ location.href='../chapter4/'; };\n    $('#replayChapter').onclick=()=>{ localStorage.removeItem(SAVE_KEY); window.HinataCampaign?.resetFrom(3); location.reload(); };";
    if (!source.includes(oldReplayHook)) throw new Error('第3章クリア操作を特定できませんでした');
    return source.replace(oldReplayHook,newReplayHook);
  }

  async function start() {
    try {
      const response = await fetch('./game.js?v=3');
      if (!response.ok) throw new Error(`game.js ${response.status}`);
      const patched = patchSource(await response.text());
      const url = URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => console.error('第3章の更新読み込みに失敗しました');
      document.body.appendChild(script);
    } catch (error) {
      console.error(error);
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent='更新の読み込みに失敗しました。再読み込みしてください。';
        toast.classList.add('show');
      }
    }
  }

  start();
})();
