(() => {
  'use strict';

  const SAVE_KEY = 'hinata-senki-save-v1';
  const prefix = 'hinata-senki-ch1-scene:';
  const queue = [];
  let playing = false;
  let overlay = null;
  let scene = null;
  let sceneIndex = 0;
  let introClosed = false;

  const turnTwoScene = [
    {speaker:'加藤史帆', text:'北門の左側、兵が薄い。私が先に抜けて、治療院への道を開ける。'},
    {speaker:'齊藤京子', text:'単独で抜けたら、久美との間を切られる。先に中央の槍兵を止める。'},
    {speaker:'佐々木久美', text:'史帆は左の救援路を確認。ただし二歩先で止まって、京子の合図を待って。京子は中央を押さえて、史帆が戻れる道を残して。'},
    {speaker:'潮紗理菜', text:'私は負傷者を見ながら後ろを支えます。誰かの案を消すんじゃなくて、つながる順番を作りましょう。'}
  ];

  const reunionScene = [
    {speaker:'佐々木久美', text:'紗理菜、治療院の人たちは？'},
    {speaker:'潮紗理菜', text:'裏道へ誘導しました。敵兵の中にも、武器を捨てて手伝ってくれた人がいます。'},
    {speaker:'齊藤京子', text:'なら、その人たちは追わない。攻撃を続ける部隊だけ止める。'},
    {speaker:'加藤史帆', text:'紗理菜も、もう一人で戻らないで。一緒に北門まで行こう。'},
    {speaker:'潮紗理菜', text:'はい。でも久美も、全員を逃がして最後に一人で残るのは禁止です。'}
  ];

  const villageScene = [
    {speaker:'村人', text:'門が閉じる前に、子どもと年寄りを裏道へ逃がします。負傷者の薬だけ、持っていってください。'},
    {speaker:'佐々木久美', text:'ありがとうございます。ここへ戻れる道を必ず作ります。王女だからではなく、助けてもらった一人として約束します。'},
    {speaker:'村人', text:'その言葉を信じます。北街道の砦から、昨日から救援の火が上がっています。'}
  ];

  const bossScene = [
    {speaker:'北門守備隊長', text:'偽王女を通すな。王都の混乱は、異界人を王家へ置いたことから始まった！'},
    {speaker:'佐々木久美', text:'私をどう呼ぶかは、ここを出た後に民の前で答える。でも、武器を下ろした人まで斬る命令には従わせない。'},
    {speaker:'齊藤京子', text:'話は後。門を閉じるなら、指揮だけ止める。'},
    {speaker:'加藤史帆', text:'久美、前は任せて。今度は一人で全部背負わせない。'}
  ];

  function seen(id) {
    return sessionStorage.getItem(prefix + id) === '1';
  }

  function markSeen(id) {
    sessionStorage.setItem(prefix + id, '1');
  }

  function injectStyles() {
    if (document.querySelector('#chapter1CharacterSceneStyles')) return;
    const style = document.createElement('style');
    style.id = 'chapter1CharacterSceneStyles';
    style.textContent = `
      #chapter1CharacterScene{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:16px;background:rgba(1,7,20,.78)}
      #chapter1CharacterScene[hidden]{display:none}
      #chapter1CharacterScene .scene-panel{width:min(720px,96vw);border:4px solid #d3ba69;border-radius:12px;background:#071b4b;color:#fff;box-shadow:0 0 0 3px #221a0c,0 20px 55px rgba(0,0,0,.65);overflow:hidden}
      #chapter1CharacterScene .scene-title{padding:9px 14px;background:#172d67;color:#ffe48b;font-weight:900}
      #chapter1CharacterScene .scene-body{min-height:180px;padding:20px 22px}
      #chapter1CharacterScene .scene-speaker{margin-bottom:12px;color:#ffe48b;font-weight:900;font-size:clamp(17px,4vw,23px)}
      #chapter1CharacterScene .scene-text{margin:0;font-size:clamp(15px,3.5vw,20px);line-height:1.8}
      #chapter1CharacterScene .scene-controls{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#061537}
      #chapter1CharacterScene button{min-width:110px}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    injectStyles();
    overlay = document.createElement('section');
    overlay.id = 'chapter1CharacterScene';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="scene-panel" role="dialog" aria-modal="true" aria-labelledby="chapter1CharacterSceneTitle">
        <div id="chapter1CharacterSceneTitle" class="scene-title">戦場会話</div>
        <div class="scene-body">
          <div id="chapter1CharacterSpeaker" class="scene-speaker"></div>
          <p id="chapter1CharacterText" class="scene-text"></p>
        </div>
        <div class="scene-controls">
          <button type="button" id="chapter1CharacterBack">前へ</button>
          <button type="button" id="chapter1CharacterNext">次へ</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#chapter1CharacterBack').addEventListener('click', () => step(-1));
    overlay.querySelector('#chapter1CharacterNext').addEventListener('click', () => step(1));
    return overlay;
  }

  function enqueue(id, title, lines) {
    if (seen(id) || queue.some(item => item.id === id) || (scene && scene.id === id)) return;
    queue.push({id, title, lines});
    tryStart();
  }

  function tryStart() {
    if (playing || !introClosed || !queue.length) return;
    if (!document.querySelector('#chapter1LoreOverlay')?.hidden) return;
    const modal = document.querySelector('#modal');
    if (modal?.open) {
      setTimeout(tryStart, 300);
      return;
    }
    scene = queue.shift();
    sceneIndex = 0;
    playing = true;
    const root = ensureOverlay();
    root.hidden = false;
    render();
  }

  function render() {
    const root = ensureOverlay();
    const line = scene.lines[sceneIndex];
    root.querySelector('#chapter1CharacterSceneTitle').textContent = scene.title;
    root.querySelector('#chapter1CharacterSpeaker').textContent = line.speaker;
    root.querySelector('#chapter1CharacterText').textContent = line.text;
    root.querySelector('#chapter1CharacterBack').disabled = sceneIndex === 0;
    root.querySelector('#chapter1CharacterNext').textContent = sceneIndex === scene.lines.length - 1 ? '戦場へ戻る' : '次へ';
  }

  function step(delta) {
    const next = sceneIndex + delta;
    if (next < 0) return;
    if (next >= scene.lines.length) {
      markSeen(scene.id);
      overlay.hidden = true;
      playing = false;
      scene = null;
      setTimeout(tryStart, 80);
      return;
    }
    sceneIndex = next;
    render();
  }

  function updateLabels() {
    const chapter = document.querySelector('#chapterLabel');
    const objective = document.querySelector('#objectiveLabel');
    if (chapter) chapter.textContent = '第1章「崩れた王都の北門」';
    if (objective) objective.textContent = '北門の指揮官を退け、久美で門を確保';
  }

  function saveStoryFlag(name, value=true) {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!saved) return;
      saved.storyFlags = saved.storyFlags || {};
      saved.storyFlags[name] = value;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {
      // Story flags are supplementary; a malformed legacy save must not stop play.
    }
  }

  function inspectLog() {
    const text = document.querySelector('#battleLog')?.textContent || '';
    if (/潮紗理菜が(?:仲間になった|部隊へ合流した)/.test(text)) {
      enqueue('reunion', '治療院からの再合流', reunionScene);
    }
    if (/村人から|村の人々|避難/.test(text) && !seen('village')) {
      saveStoryFlag('villageEvacuated');
      enqueue('village', '北街道の住民', villageScene);
    }
    if (/バルガ|城門守備隊長/.test(text)) {
      enqueue('boss', '北門の指揮官', bossScene);
    }
    if (/城門を制圧|北門を突破/.test(text)) {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        const evacuated = Boolean(saved?.storyFlags?.villageEvacuated);
        window.HinataCampaign?.update({
          flags:{chapter1VillageEvacuated:evacuated},
          extra:{chapter1ReworkSeen:true}
        });
      } catch {
        // The campaign save has already been written by the chapter runtime.
      }
    }
  }

  function inspectTurn() {
    const turn = Number(document.querySelector('#turnLabel')?.textContent || 1);
    if (turn >= 2) enqueue('turn2', 'それぞれの判断', turnTwoScene);
  }

  function startObservers() {
    updateLabels();
    const log = document.querySelector('#battleLog');
    const turn = document.querySelector('#turnLabel');
    if (log) new MutationObserver(inspectLog).observe(log, {childList:true, subtree:true, characterData:true});
    if (turn) new MutationObserver(inspectTurn).observe(turn, {childList:true, subtree:true, characterData:true});
    inspectLog();
    inspectTurn();
  }

  window.addEventListener('hinata-chapter1-intro-closed', () => {
    introClosed = true;
    tryStart();
  });

  window.addEventListener('hinata-game-ready', () => {
    startObservers();
    const intro = document.querySelector('#chapter1LoreOverlay');
    if (!intro || intro.hidden) {
      introClosed = true;
      tryStart();
    }
  }, {once:true});
})();
