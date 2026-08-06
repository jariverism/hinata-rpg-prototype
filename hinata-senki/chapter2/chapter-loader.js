(() => {
  'use strict';

  function patchStoryAndRecruitment(source) {
    const introStart = source.indexOf('  const introScene = [');
    const earlyStart = source.indexOf('  const earlyTalkScene = [',introStart);
    if (introStart < 0 || earlyStart < 0) throw new Error('第2章導入会話を特定できませんでした');

    const intro = `  const introScene = [
    { speaker:'ナレーション', text:'城門を抜けた一行は、追手を避けて旧街道を進んだ。夜明け前、谷を塞ぐ古い砦から助けを求める声が聞こえる。砦は今、黒竜教団に従う占領軍の牢獄として使われていた。' },
    { speaker:'佐々木久美', side:'left', text:'ここを通らなければ北へは進めない。でも、捕らわれた人たちを置いたまま突破するつもりもない。牢を開けて、一緒に逃げ道を作ろう。' },
    { speaker:'加藤史帆', side:'right', text:'看守を倒せば鍵が手に入るかもしれない。馬は外に残す。狭い通路では、先に出た人を一人にしないで。' },
    { speaker:'齊藤京子', side:'left', text:'敵は砦兵だけじゃない。中に、敵のふりをして動いている誰かがいる。攻撃する前に様子を見よう。' },
    { speaker:'潮紗理菜', side:'right', text:'この土地で生きてきた人には、この土地で守りたいものがあります。知っている顔に見えても、まず事情を聞きましょう。' },
    { speaker:'作戦', text:'牢の扉を開いて囚われた人々を救出し、敵将を退けよ。その後、佐々木久美を脱出地点へ到達させること。緑色のユニットは敵ではない。' }
  ];

`;
    source = source.slice(0,introStart) + intro + source.slice(earlyStart);

    const relationStart = source.indexOf('  const earlyTalkScene = [');
    const classMarksStart = source.indexOf('  const classMarks = {',relationStart);
    if (relationStart < 0 || classMarksStart < 0) throw new Error('第2章加入会話を特定できませんでした');

    const relationScenes = `  const earlyTalkScenes = {
    kumi:[
      { speaker:'佐々木久美', side:'left', text:'待って。あなた、私たちを知っているでしょう。どうして看守たちと一緒にいるの？' },
      { speaker:'河田陽菜', side:'right', text:'知っています。でも今ここで味方だと言ったら、牢にいる人たちが先に殺されます。私を信じるなら、先に二つの牢を開けてください。' },
      { speaker:'佐々木久美', side:'left', text:'分かった。言葉じゃなく、私たちの行動を見ていて。必ず全員を連れ出す。' }
    ],
    toshi:[
      { speaker:'加藤史帆', side:'left', text:'陽菜、その短剣の持ち方、敵の兵士じゃないよね。ここで何をしてるの？' },
      { speaker:'河田陽菜', side:'right', text:'転生した私を拾って、鍵の開け方を教えてくれた家族が捕まっています。協力するふりをしないと、牢へ近づけなかったんです。' },
      { speaker:'加藤史帆', side:'left', text:'じゃあ一人で抱えないで。私たちが前を塞ぐ。陽菜は助けたい人のところへ行って。' }
    ],
    kyoko:[
      { speaker:'齊藤京子', side:'left', text:'その顔で敵のふりをしても分かる。攻撃する気がないなら、目的だけ教えて。' },
      { speaker:'河田陽菜', side:'right', text:'牢の人たちを逃がしたいです。でも鍵を持つ看守が多くて、一人では全部開けられません。' },
      { speaker:'齊藤京子', side:'left', text:'必要なのは謝ることじゃない。牢までの道を示して。残りは私たちが切り開く。' }
    ],
    sarina:[
      { speaker:'潮紗理菜', side:'left', text:'陽菜ちゃん。怖かったね。でも、敵の前で怖い顔を見せないように、ずっと笑っていたんでしょう。' },
      { speaker:'河田陽菜', side:'right', text:'私を助けてくれた人たちが牢にいます。日向坂の記憶が戻っても、この世界の家族を置いてはいけません。' },
      { speaker:'潮紗理菜', side:'left', text:'置いていかなくていいよ。その人たちも一緒に助けて、それから私たちのこれからを話そう。' }
    ]
  };

  const joinTalkScenes = {
    kumi:[
      { speaker:'佐々木久美', side:'left', text:'二つの牢は開いた。避難路も確保したよ。もう敵のふりを続けなくていい。' },
      { speaker:'河田陽菜', side:'right', text:'ありがとうございます。今度は、私が皆さんの進む道を開けます。この砦の鍵も抜け道も分かります。' },
      { speaker:'佐々木久美', side:'left', text:'助けられる側じゃなく、互いに助ける仲間として来て。陽菜の新しい家族も守れる国を取り戻そう。' }
    ],
    toshi:[
      { speaker:'加藤史帆', side:'left', text:'全員逃げたよ。陽菜がここに残る理由は、もうないよね。' },
      { speaker:'河田陽菜', side:'right', text:'はい。でも、助けてもらって終わりにはしたくないです。史帆さんたちが追われる道を、今度は私が安全にします。' },
      { speaker:'加藤史帆', side:'left', text:'それなら決まり。無茶をするときは一人で先に行かないこと。私も守るから。' }
    ],
    kyoko:[
      { speaker:'齊藤京子', side:'left', text:'約束どおり牢は空にした。次はどうする？' },
      { speaker:'河田陽菜', side:'right', text:'この砦を出ます。京子さんたちと一緒なら、同じように閉じ込められた人をもっと助けられると思うから。' },
      { speaker:'齊藤京子', side:'left', text:'いい答え。鍵が必要な場所は任せる。戦うときは私たちの後ろを使って。' }
    ],
    sarina:[
      { speaker:'潮紗理菜', side:'left', text:'みんな無事に逃げられたよ。陽菜ちゃんが守った家族から、あなたをお願いされました。' },
      { speaker:'河田陽菜', side:'right', text:'この世界の家族も、昔の仲間も、どちらかを選ばなくていいんですね。' },
      { speaker:'潮紗理菜', side:'left', text:'うん。守りたいものを増やすために、一緒に行こう。' }
    ]
  };

`;
    source = source.slice(0,relationStart) + relationScenes + source.slice(classMarksStart);

    const talkTargetOld = "    const talkTarget = state.units.find(other => other.id==='hina'&&other.faction==='neutral'&&dist(unit,other)===1&&['kumi','toshi','kyoko'].includes(unit.id));";
    const talkTargetNew = "    const talkTarget = state.units.find(other => other.id==='hina'&&other.faction==='neutral'&&dist(unit,other)===1&&['kumi','toshi','kyoko','sarina'].includes(unit.id)&&(!state.hinaFirstTalker||state.rescued.length>=2));";
    if (!source.includes(talkTargetOld)) throw new Error('第2章会話対象判定を特定できませんでした');
    source = source.replace(talkTargetOld,talkTargetNew);

    const freshFlag = "      chestOpened:false,";
    if (!source.includes(freshFlag)) throw new Error('第2章イベント状態を特定できませんでした');
    source = source.replace(freshFlag,"      chestOpened:false,\n      hinaFirstTalker:null,\n      hinaJoinedBy:null,");

    const talkStart = source.indexOf('  async function talkToHina(talker,hina) {');
    const talkEnd = source.indexOf('  function openDoor(unit,door) {',talkStart);
    if (talkStart < 0 || talkEnd < 0) throw new Error('第2章加入処理を特定できませんでした');
    const talkFunction = `  async function talkToHina(talker,hina) {
    if (state.rescued.length < 2) {
      const scene=earlyTalkScenes[talker.id]||earlyTalkScenes.kumi;
      await playScene(scene,'戦場会話');
      state.hinaFirstTalker=talker.id;
      addLog(\`${'${talker.name}'}が中立ユニットの事情を聞いた。まず捕虜を救出する。\`);
      save(true);
      showActions(talker);
      return;
    }
    const scene=joinTalkScenes[talker.id]||joinTalkScenes.kumi;
    await playScene(scene,'戦場会話');
    hina.faction = 'ally';
    hina.acted = false;
    state.hinaJoinedBy=talker.id;
    addLog(\`${'${hina.name}'}が自分の意思で部隊に加わった。\`);
    finishAction(talker);
  }

`;
    return source.slice(0,talkStart) + talkFunction + source.slice(talkEnd);
  }

  function patchSource(source) {
    const oldCarry = "    const defaults = defaultAllies();\n    const saved = safeParse(PROLOGUE_SAVE_KEY);";
    const newCarry = "    const defaults = defaultAllies();\n    const campaignUnits = window.HinataCampaign?.loadRoster(1);\n    const saved = campaignUnits ? { units:campaignUnits } : safeParse(PROLOGUE_SAVE_KEY);";
    if (!source.includes(oldCarry)) throw new Error('部隊引継ぎ処理を特定できませんでした');
    source = source.replace(oldCarry,newCarry);

    const oldFreshHeader = "      version:SAVE_VERSION,\n      chapter:2,";
    const newFreshHeader = "      version:SAVE_VERSION,\n      sourceCampaignUpdatedAt:window.HinataCampaign?.load()?.updatedAt || 0,\n      chapter:2,";
    if (!source.includes(oldFreshHeader)) throw new Error('第2章の初期状態を特定できませんでした');
    source = source.replace(oldFreshHeader,newFreshHeader);

    const oldMigrate = "  function migrate(saved) {\n    if (!saved || !Array.isArray(saved.units)) return null;";
    const newMigrate = "  function migrate(saved) {\n    if (!saved || !Array.isArray(saved.units)) return null;\n    const sourceStamp=window.HinataCampaign?.load()?.updatedAt || 0;\n    if (!saved.cleared && saved.sourceCampaignUpdatedAt!==sourceStamp) return null;";
    if (!source.includes(oldMigrate)) throw new Error('第2章のセーブ移行処理を特定できませんでした');
    source = source.replace(oldMigrate,newMigrate);

    const oldWait = "      if (x === pendingMove.x && y === pendingMove.y) {\n        showActions(selected);\n        return;\n      }";
    const newWait = "      if (x === pendingMove.x && y === pendingMove.y) {\n        finishAction(selected);\n        return;\n      }";
    if (!source.includes(oldWait)) throw new Error('待機操作を特定できませんでした');
    source = source.replace(oldWait,newWait);

    const selectionBlock = "    if (clicked) {\n      if (clicked.faction === 'ally' && !clicked.acted) selectUnit(clicked);";
    const stationaryActionBlock = "    if (clicked && selected && clicked.id === selected.id && selected.faction === 'ally' && !selected.acted) {\n      showActions(selected);\n      return;\n    }\n\n    if (clicked) {\n      if (clicked.faction === 'ally' && !clicked.acted) selectUnit(clicked);";
    if (!source.includes(selectionBlock)) throw new Error('その場行動の選択処理を特定できませんでした');
    source = source.replace(selectionBlock,stationaryActionBlock);

    source = patchStoryAndRecruitment(source);

    const clearStart = source.indexOf('  function clearChapter() {');
    const clearEnd = source.indexOf('  function checkDefeat() {',clearStart);
    if (clearStart < 0 || clearEnd < 0) throw new Error('章クリア処理を特定できませんでした');

    const replacement = [
      "  function clearChapter() {",
      "    state.cleared=true;",
      "    const hina=byId('hina');",
      "    if(hina&&hina.hp>0&&hina.faction!=='ally'){",
      "      hina.faction='ally';",
      "      hina.acted=false;",
      "      state.hinaJoinedBy=state.hinaJoinedBy||'chapter-clear';",
      "    }",
      "    const roster=state.units",
      "      .filter(unit => unit.faction==='ally'&&unit.hp>0)",
      "      .map(unit => ({...unit,acted:false,hp:unit.maxHp}));",
      "    localStorage.setItem(ROSTER_KEY,JSON.stringify({chapter:2,units:roster}));",
      "    window.HinataCampaign?.saveRoster(2,roster,{ turn2:state.turn, flags:{ chapter2RelationTalk:Boolean(state.hinaFirstTalker), chapter2EarlyJoin:state.hinaJoinedBy!=='chapter-clear' } });",
      "    save(true);",
      "    $('#modalContent').innerHTML=`",
      "      <h2>第2章クリア</h2>",
      "      <p>部隊の状態、経験値、装備、所持品を保存しました。</p>",
      "      <p>戦績　ターン ${state.turn}</p>",
      "      <div class=\"campaign-next\">",
      "        <button id=\"continueCampaign\">次章へ進む</button>",
      "        <button id=\"replayChapter\">この章をやり直す</button>",
      "      </div>`;",
      "    $('#modal').showModal();",
      "    $('#continueCampaign').onclick=() => { location.href='../chapter3/'; };",
      "    $('#replayChapter').onclick=() => {",
      "      localStorage.removeItem(SAVE_KEY);",
      "      window.HinataCampaign?.resetFrom(2);",
      "      location.reload();",
      "    };",
      "  }",
      "",
      ""
    ].join('\n');

    return source.slice(0,clearStart) + replacement + source.slice(clearEnd);
  }

  function readSave(key) {
    try {
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):null;
    } catch {
      return null;
    }
  }

  function offerCompletedSaveResume() {
    const saved=readSave('hinata-senki-chapter2-save-v1');
    if (!saved?.cleared||!Array.isArray(saved.units)) return;
    const existing=window.HinataCampaign?.load();
    if (!existing||existing.completedChapter<2) {
      window.HinataCampaign?.saveRoster(2,saved.units,{migratedFromLegacy:true});
    }
    const modal=document.querySelector('#modal');
    const content=document.querySelector('#modalContent');
    if (!modal||!content) return;
    content.innerHTML=`
      <h2>第2章クリア済み</h2>
      <p>以前のセーブデータをキャンペーン形式へ引き継ぎました。</p>
      <div class="campaign-next">
        <button id="continueLegacyCampaign">次章へ進む</button>
        <button id="restartLegacyChapter">この章を最初から</button>
      </div>`;
    if (!modal.open) modal.showModal();
    document.querySelector('#continueLegacyCampaign').onclick=()=>{location.href='../chapter3/';};
    document.querySelector('#restartLegacyChapter').onclick=()=>{
      localStorage.removeItem('hinata-senki-chapter2-save-v1');
      window.HinataCampaign?.resetFrom(2);
      location.reload();
    };
  }

  async function start() {
    try {
      const response = await fetch('./game.js?v=3');
      if (!response.ok) throw new Error(`game.js ${response.status}`);
      const patched = patchSource(await response.text());
      const url = URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        URL.revokeObjectURL(url);
        setTimeout(offerCompletedSaveResume,0);
      };
      script.onerror = () => console.error('第2章の更新読み込みに失敗しました');
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
