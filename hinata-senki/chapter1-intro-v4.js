(() => {
  'use strict';

  const LEGACY_KEYS = [
    'hinata-senki-intro-v2-seen',
    'hinata-senki-intro-v3-seen'
  ];
  const INTRO_KEY = 'hinata-senki-intro-v4-seen';
  const SAVE_KEY = 'hinata-senki-save-v1';

  LEGACY_KEYS.forEach(key => sessionStorage.setItem(key, '1'));

  const lines = [
    {
      speaker:'ナレーション',
      text:'黎明湖と草原に囲まれた小国、陽向王国。三年前、この世界へ迷い込んだ佐々木久美は、王宮で第一王女として暮らしながら、民と国を守る役目を引き受けてきた。'
    },
    {
      speaker:'ナレーション',
      text:'久美には、日向坂46のキャプテンだった記憶がある。王女として過ごした三年間もまた、誰かに与えられた夢ではなく、彼女が選び取ってきた現在だった。'
    },
    {
      speaker:'ナレーション',
      text:'その夜、王都で政変が起きた。宰相派の兵が王宮を制圧し、久美を「異界から来た偽王女」として捕らえる命令が出される。国王の安否は分からない。'
    },
    {
      speaker:'戦況',
      text:'北門を塞ぐ軍には、政変へ加担した正規兵、命令に迷う王国兵、黒い竜の紋章を掲げる正体不明の戦闘員が混在している。同じ鎧でも、全員が同じ理由で剣を向けているわけではない。'
    },
    {
      speaker:'加藤史帆',
      text:'北門まで私が先に走る。閉じられる前に道を作れば、みんな助けられるから。'
    },
    {
      speaker:'齊藤京子',
      text:'史帆、先に行きすぎないで。久美を狙っているなら、隊列を崩した瞬間に囲まれる。まず敵の指揮を止める。'
    },
    {
      speaker:'潮紗理菜',
      text:'治療院にも、まだ動けない人がいます。敵兵の中にも負傷して武器を下ろした人がいる。置いていく前に、逃げ道を作らせてください。'
    },
    {
      speaker:'佐々木久美',
      text:'三人とも正しい。だから、一つに決めない。史帆は救援路を探して、京子は隊列を守る。紗理菜は治療院の人を逃がして、必ず合流して。私は北門への道をつなぐ。'
    },
    {
      speaker:'加藤史帆',
      text:'分かった。速く行くけど、一人では行かない。戻るところまでちゃんと考える。'
    },
    {
      speaker:'齊藤京子',
      text:'迷って武器を下ろした兵は追わない。攻撃を続ける部隊と指揮官だけを止める。'
    },
    {
      speaker:'潮紗理菜',
      text:'治療院の人を裏道へ誘導したら合流します。久美も、自分だけ最後に残ろうとしないでくださいね。'
    },
    {
      speaker:'佐々木久美',
      text:'約束する。誰か一人の正解で逃げるんじゃない。みんなの判断をつないで、ここを出る。'
    },
    {
      speaker:'作戦',
      text:'北門の指揮官を退け、久美で門を確保せよ。道中の村と治療院に残された人々を救う行動は、後の協力につながる。'
    }
  ];

  let index = 0;
  let overlay = null;

  function savedState() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function shouldShow() {
    if (sessionStorage.getItem(INTRO_KEY)) return false;
    const saved = savedState();
    return !saved || (!saved.cleared && Number(saved.turn || 1) === 1);
  }

  function injectStyles() {
    if (document.querySelector('#chapter1LoreStyles')) return;
    const style = document.createElement('style');
    style.id = 'chapter1LoreStyles';
    style.textContent = `
      #chapter1LoreOverlay .story-canvas{display:grid;place-items:center;min-height:min(55vh,430px);padding:18px}
      #chapter1LoreOverlay .narration-window{display:block;width:min(760px,94%);min-height:190px;padding:22px 24px;border:4px solid #d3ba69;border-radius:12px;background:linear-gradient(180deg,#092866,#071b4b);box-shadow:0 0 0 3px #251b0d,0 18px 45px rgba(0,0,0,.58),inset 0 0 0 2px #31559a;color:#fff}
      #chapter1LoreOverlay .speech-name{margin-bottom:12px;color:#ffe48b;font-size:clamp(16px,4vw,23px);font-weight:900}
      #chapter1LoreOverlay .speech-text{margin:0;font-size:clamp(15px,3.5vw,21px);line-height:1.8;letter-spacing:.02em}
      #chapter1LoreOverlay .story-footer{grid-template-columns:110px 1fr 130px}
      #chapter1LoreOverlay .story-progress{display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap}
      #chapter1LoreOverlay .story-progress i{width:8px;height:8px;border-radius:50%;background:#56658b}
      #chapter1LoreOverlay .story-progress i.done{background:#c7b05f}
      #chapter1LoreOverlay .story-progress i.current{background:#fff29a;box-shadow:0 0 8px #ffe35f}
      @media(max-width:560px){#chapter1LoreOverlay .story-footer{grid-template-columns:78px 1fr 96px}#chapter1LoreOverlay .narration-window{padding:17px 16px;min-height:230px}}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    injectStyles();
    overlay = document.createElement('section');
    overlay.id = 'chapter1LoreOverlay';
    overlay.className = 'story-overlay narration-mode';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="story-frame" role="dialog" aria-modal="true" aria-labelledby="chapter1LoreTitle">
        <div class="story-chapter" id="chapter1LoreTitle">第1章　崩れた王都の北門</div>
        <div class="story-canvas" id="chapter1LoreCanvas">
          <section class="narration-window active">
            <div class="speech-name" id="chapter1LoreSpeaker"></div>
            <p class="speech-text" id="chapter1LoreText"></p>
            <i class="advance-caret" aria-hidden="true"></i>
          </section>
        </div>
        <div class="story-footer">
          <button type="button" id="chapter1LoreBack">◀ 前へ</button>
          <div class="story-progress" id="chapter1LoreProgress"></div>
          <button type="button" id="chapter1LoreNext">次へ ▶</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#chapter1LoreBack').addEventListener('click', () => step(-1));
    overlay.querySelector('#chapter1LoreNext').addEventListener('click', () => step(1));
    overlay.querySelector('#chapter1LoreCanvas').addEventListener('click', () => step(1));
    return overlay;
  }

  function render() {
    const line = lines[index];
    const root = ensureOverlay();
    root.querySelector('#chapter1LoreSpeaker').textContent = line.speaker;
    root.querySelector('#chapter1LoreText').textContent = line.text;
    root.querySelector('#chapter1LoreBack').disabled = index === 0;
    root.querySelector('#chapter1LoreNext').textContent = index === lines.length - 1 ? '戦闘開始' : '次へ ▶';
    root.querySelector('#chapter1LoreProgress').innerHTML = lines.map((_, i) => `<i class="${i === index ? 'current' : i < index ? 'done' : ''}"></i>`).join('');
  }

  function showIntro() {
    index = 0;
    const root = ensureOverlay();
    root.hidden = false;
    document.body.classList.add('story-open');
    render();
  }

  function closeIntro() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('story-open');
    sessionStorage.setItem(INTRO_KEY, '1');
    window.dispatchEvent(new CustomEvent('hinata-chapter1-intro-closed'));
  }

  function step(delta) {
    const next = index + delta;
    if (next < 0) return;
    if (next >= lines.length) {
      closeIntro();
      return;
    }
    index = next;
    render();
  }

  function interceptMenuReplay(event) {
    const button = event.target.closest('#replayIntroButton');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    document.querySelector('#modal')?.close();
    showIntro();
  }

  function clearOnRestart(event) {
    if (event.target.closest('#restartBtn, #retry, #restartLegacyChapter')) {
      sessionStorage.removeItem(INTRO_KEY);
      LEGACY_KEYS.forEach(key => sessionStorage.removeItem(key));
    }
  }

  document.addEventListener('click', interceptMenuReplay, true);
  document.addEventListener('click', clearOnRestart, true);
  window.addEventListener('hinata-game-ready', () => {
    if (shouldShow()) {
      sessionStorage.setItem(INTRO_KEY, '1');
      requestAnimationFrame(() => setTimeout(showIntro, 100));
    } else {
      window.dispatchEvent(new CustomEvent('hinata-chapter1-intro-closed'));
    }
  }, { once:true });
})();
