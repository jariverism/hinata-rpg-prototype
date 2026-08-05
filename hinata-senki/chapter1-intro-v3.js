(() => {
  'use strict';

  const LEGACY_INTRO_KEY = 'hinata-senki-intro-v2-seen';
  const INTRO_KEY = 'hinata-senki-intro-v3-seen';
  const SAVE_KEY = 'hinata-senki-save-v1';

  // The earlier short introduction is suppressed in favour of this expanded version.
  sessionStorage.setItem(LEGACY_INTRO_KEY, '1');

  const lines = [
    {
      speaker:'ナレーション',
      text:'黎明湖と豊かな草原に囲まれた小国――陽向王国。王家は代々「陽光の紋章」を守り、武力よりも対話を重んじて、長い平穏を築いてきた。'
    },
    {
      speaker:'ナレーション',
      text:'佐々木久美は、この国の第一王女として生を受けた。日向坂46のキャプテンだった記憶を持ちながら、王女として国と民を守る責任も、自分の人生として背負っている。'
    },
    {
      speaker:'ナレーション',
      text:'しかし今夜、宰相ガルドが王都守備軍の一部を率いてクーデターを起こした。国王の行方は分からず、王宮と城下町は反乱軍に制圧されつつある。'
    },
    {
      speaker:'敵勢力',
      text:'反乱を裏で操るのは「黒竜教団」。滅びた暗黒竜を神と崇める集団であり、陽向王家を根絶やしにして陽光の紋章を砕き、暗黒竜を復活させることを目的としている。'
    },
    {
      speaker:'ナレーション',
      text:'城内に残った久美を守るのは、王女親衛隊の騎士となった加藤史帆と齊藤京子。二人もまた、日向坂だった頃の記憶を持っている。'
    },
    {
      speaker:'戦況',
      text:'敵は黒竜教団の狂信兵と、反乱側についた王国兵の混成部隊。目的は北門を封鎖し、久美を捕らえて陽向王家の希望を断つことにある。'
    },
    {
      speaker:'自軍の目的',
      text:'久美たちの当面の目的は、北の城門を突破して生き延びること。そして各地へ散った忠臣と仲間を集め、民を守りながら王国を取り戻す反撃の旗を掲げることである。'
    },
    {
      speaker:'佐々木久美',
      text:'王都を出る。逃げるためじゃないよ。生き残って、みんなを探して、この国を取り戻すために。'
    },
    {
      speaker:'加藤史帆',
      text:'親衛騎士としても、日向坂の仲間としても、久美は絶対に守る。北門まで私が道を開く。'
    },
    {
      speaker:'齊藤京子',
      text:'史帆が切り込むなら、私は隊列を崩さない。敵の目的が久美なら、そこを逆に利用して突破する。'
    },
    {
      speaker:'佐々木久美',
      text:'うん。まずは三人でここを抜けよう。落ちぶれたままでは終わらない。ここから、もう一度始めるよ。'
    },
    {
      speaker:'作戦',
      text:'敵将を撃破した後、佐々木久美で北の城門を制圧せよ。剣・槍・斧の相性、森や砦の地形効果、としきょんの支援を活用すること。'
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
        <div class="story-chapter" id="chapter1LoreTitle">第1章　目覚めた陽光</div>
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
    if (event.target.closest('#restartBtn, #retry')) {
      sessionStorage.removeItem(INTRO_KEY);
      sessionStorage.removeItem(LEGACY_INTRO_KEY);
    }
  }

  document.addEventListener('click', interceptMenuReplay, true);
  document.addEventListener('click', clearOnRestart, true);
  window.addEventListener('hinata-game-ready', () => {
    if (shouldShow()) {
      sessionStorage.setItem(INTRO_KEY, '1');
      requestAnimationFrame(() => setTimeout(showIntro, 100));
    }
  }, { once:true });
})();
