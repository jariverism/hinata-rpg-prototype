(() => {
  'use strict';

  const INTRO_SESSION_KEY = 'hinata-senki-intro-v2-seen';
  const SAVE_KEY = 'hinata-senki-save-v1';

  const iconPaths = {
    lord: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 27V5m1 1h14l-4 5 4 5H9" />
        <path d="M5 27h8" />
      </svg>`,
    cavalry: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 25c1-8 3-14 10-18l5 2-2 4 4 4-3 7H10" />
        <path d="M15 10l-5-3 1 7m5 11v3m6-4 3 4" />
        <circle cx="21" cy="11" r="1" />
      </svg>`,
    sister: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 4v24M9 11h14" />
        <path d="M10 28h12M12 6h8" />
      </svg>`,
    fighter: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M9 27 22 6m-3 1c3-3 7-2 9 0-1 5-4 8-9 7" />
        <path d="m7 25 5 3" />
      </svg>`,
    soldier: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 27 23 5m-2 1 5-2-1 5" />
        <path d="m6 24 5 4" />
      </svg>`,
    archer: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M9 5c10 4 10 18 0 22M9 5c-5 6-5 16 0 22M9 16h17" />
        <path d="m22 12 5 4-5 4" />
      </svg>`,
    armor: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 4 27 8v8c0 7-5 11-11 13C10 27 5 23 5 16V8l11-4Z" />
        <path d="M16 8v16M9 13h14" />
      </svg>`,
    generic: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="11" />
        <path d="M16 9v14M9 16h14" />
      </svg>`
  };

  const classSpecs = {
    'ロード': { key:'lord', short:'主' },
    'ソシアルナイト': { key:'cavalry', short:'騎' },
    'シスター': { key:'sister', short:'聖' },
    '戦士': { key:'fighter', short:'斧' },
    '兵士': { key:'soldier', short:'槍' },
    '弓兵': { key:'archer', short:'弓' },
    '重装兵': { key:'armor', short:'重' }
  };

  const introScene = [
    {
      speaker:'ナレーション',
      text:'陽光の届かない夜、王都は反乱軍に包囲されていた。城内に残る人々を逃がすには、封鎖された北の城門を突破するしかない。'
    },
    {
      speaker:'佐々木久美',
      portrait:'久',
      side:'left',
      text:'ここが異世界でも、二人がいるなら立ち止まっていられない。まず城門を抜けるよ。'
    },
    {
      speaker:'加藤史帆',
      portrait:'史',
      side:'right',
      text:'うん。怖いけど、久美についていく。京子、遅れないでね。'
    },
    {
      speaker:'齊藤京子',
      portrait:'京',
      side:'left',
      text:'それはこっちの台詞。敵の槍は私が受ける。史帆は斧兵をお願い。'
    },
    {
      speaker:'ナレーション',
      text:'日向坂としての記憶と、この世界で背負った責任。その両方を胸に、三人は城門へ向かう。'
    },
    {
      speaker:'作戦',
      text:'敵将を退けた後、佐々木久美で城門を制圧せよ。剣・槍・斧の相性と、森や砦の地形効果を活用すること。'
    }
  ];

  const talkScene = [
    {
      speaker:'佐々木久美',
      portrait:'久',
      side:'left',
      text:'……やっぱり、あなたなんだね。'
    },
    {
      speaker:'？？？',
      portrait:'？',
      side:'right',
      text:'久美。覚えているんだね。あの頃のことを。'
    },
    {
      speaker:'佐々木久美',
      portrait:'久',
      side:'left',
      text:'もちろん。でも、この世界で過ごしてきた時間も、簡単には捨てられないよね。'
    },
    {
      speaker:'？？？',
      portrait:'？',
      side:'right',
      text:'ここには逃げ遅れた人たちがいる。私だけ安全な場所へ行くことはできない。'
    },
    {
      speaker:'佐々木久美',
      portrait:'久',
      side:'left',
      text:'なら、一緒に守ろう。誰も置いていかない。そのために、私たちはここまで来たんだから。'
    },
    {
      speaker:'？？？',
      portrait:'？',
      side:'right',
      text:'……うん。もう一度、みんなと歩いてみたい。'
    }
  ];

  let bypassTalk = false;
  let activeScene = null;

  function iconMarkup(spec) {
    const safe = spec || { key:'generic', short:'?' };
    return `<span class="class-icon class-${safe.key}">${iconPaths[safe.key] || iconPaths.generic}</span>`;
  }

  function specFromMapUnit(el) {
    const title = el.title || '';
    const original = el.textContent.trim();

    if (title.startsWith('佐々木久美')) return { name:'ロード', ...classSpecs['ロード'] };
    if (title.startsWith('加藤史帆') || title.startsWith('齊藤京子')) {
      return { name:'ソシアルナイト', ...classSpecs['ソシアルナイト'] };
    }
    if (title.startsWith('潮紗理菜')) return { name:'シスター', ...classSpecs['シスター'] };
    if (title.includes('守備隊長')) return { name:'重装兵', ...classSpecs['重装兵'] };
    if (original === '斧') return { name:'戦士', ...classSpecs['戦士'] };
    if (original === '槍') return { name:'兵士', ...classSpecs['兵士'] };
    if (original === '弓') return { name:'弓兵', ...classSpecs['弓兵'] };
    return { name:'兵種不明', key:'generic', short:original.slice(0,1) || '?' };
  }

  function enhanceUnits() {
    document.querySelectorAll('#map .unit:not([data-class-enhanced])').forEach(el => {
      const spec = specFromMapUnit(el);
      el.dataset.classEnhanced = 'true';
      el.dataset.className = spec.name;
      el.setAttribute('aria-label', `${el.title} ${spec.name}`);
      el.innerHTML = `${iconMarkup(spec)}<span class="class-tag">${spec.short}</span>`;
    });
  }

  function enhanceUnitCard() {
    const card = document.querySelector('#unitCard');
    if (!card || card.classList.contains('empty') || card.querySelector('.class-badge')) return;
    const summary = [...card.querySelectorAll('p')].find(p => p.textContent.includes('／'));
    if (!summary) return;

    const [className, weaponName] = summary.textContent.split('／');
    const spec = classSpecs[className] || { key:'generic', short:'?' };
    summary.classList.add('unit-class-line');
    summary.innerHTML = `
      <span class="class-badge">${iconMarkup(spec)}<b>${className}</b></span>
      <span class="weapon-label">${weaponName || ''}</span>`;
  }

  function createStoryOverlay() {
    const overlay = document.createElement('section');
    overlay.id = 'storyOverlay';
    overlay.className = 'story-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="story-frame" role="dialog" aria-modal="true" aria-labelledby="storyTitle">
        <div class="story-chapter" id="storyTitle"></div>
        <div class="story-canvas" id="storyCanvas">
          <section class="dialogue-row dialogue-left" id="storyLeftRow" hidden>
            <div class="portrait-panel" id="storyLeftPortrait" aria-hidden="true"></div>
            <div class="speech-window">
              <div class="speech-name" id="storyLeftSpeaker"></div>
              <p class="speech-text" id="storyLeftText"></p>
              <i class="advance-caret" aria-hidden="true"></i>
            </div>
          </section>

          <section class="dialogue-row dialogue-right" id="storyRightRow" hidden>
            <div class="speech-window">
              <div class="speech-name" id="storyRightSpeaker"></div>
              <p class="speech-text" id="storyRightText"></p>
              <i class="advance-caret" aria-hidden="true"></i>
            </div>
            <div class="portrait-panel" id="storyRightPortrait" aria-hidden="true"></div>
          </section>

          <section class="narration-window" id="storyNarration" hidden>
            <div class="speech-name" id="storyNarrationSpeaker"></div>
            <p class="speech-text" id="storyNarrationText"></p>
            <i class="advance-caret" aria-hidden="true"></i>
          </section>
        </div>

        <div class="story-footer">
          <button type="button" id="storyBack">◀ 前へ</button>
          <div class="story-progress" id="storyProgress" aria-label="会話の進行"></div>
          <button type="button" id="storyNext">次へ ▶</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#storyBack').addEventListener('click', () => stepScene(-1));
    overlay.querySelector('#storyNext').addEventListener('click', () => stepScene(1));
    overlay.querySelector('#storyCanvas').addEventListener('click', () => stepScene(1));
    return overlay;
  }

  function playScene(lines, options = {}) {
    if (!lines.length) return;
    const overlay = document.querySelector('#storyOverlay') || createStoryOverlay();
    activeScene = {
      lines,
      index:0,
      title:options.title || '会話',
      finalLabel:options.finalLabel || '閉じる',
      onComplete:options.onComplete || null
    };
    document.body.classList.add('story-open');
    overlay.hidden = false;
    renderScene();
  }

  function latestLineForSide(side) {
    if (!activeScene) return null;
    for (let i = activeScene.index; i >= 0; i--) {
      const line = activeScene.lines[i];
      if (line.side === side) return line;
    }
    return null;
  }

  function renderPortrait(element, line) {
    element.innerHTML = '';
    element.dataset.initial = line?.portrait || '？';
    element.dataset.speaker = line?.speaker || '';

    if (line?.portraitUrl) {
      const image = document.createElement('img');
      image.src = line.portraitUrl;
      image.alt = '';
      element.appendChild(image);
      element.classList.add('has-image');
      return;
    }

    element.classList.remove('has-image');
    const silhouette = document.createElement('span');
    silhouette.className = 'portrait-silhouette';
    silhouette.innerHTML = '<i></i><b></b>';
    const initial = document.createElement('strong');
    initial.className = 'portrait-initial';
    initial.textContent = line?.portrait || '？';
    element.append(silhouette, initial);
  }

  function fillDialogueSide(side, line, currentSide) {
    const cap = side === 'left' ? 'Left' : 'Right';
    const row = document.querySelector(`#story${cap}Row`);
    if (!line) {
      row.hidden = true;
      return;
    }

    row.hidden = false;
    row.classList.toggle('active', currentSide === side);
    row.classList.toggle('memory', currentSide !== side);
    document.querySelector(`#story${cap}Speaker`).textContent = line.speaker;
    document.querySelector(`#story${cap}Text`).textContent = line.text;
    renderPortrait(document.querySelector(`#story${cap}Portrait`), line);
  }

  function renderScene() {
    if (!activeScene) return;
    const overlay = document.querySelector('#storyOverlay');
    const line = activeScene.lines[activeScene.index];
    const narration = overlay.querySelector('#storyNarration');
    const leftRow = overlay.querySelector('#storyLeftRow');
    const rightRow = overlay.querySelector('#storyRightRow');

    overlay.querySelector('#storyTitle').textContent = activeScene.title;

    if (line.side === 'left' || line.side === 'right') {
      overlay.classList.add('dialogue-mode');
      overlay.classList.remove('narration-mode');
      narration.hidden = true;
      fillDialogueSide('left', latestLineForSide('left'), line.side);
      fillDialogueSide('right', latestLineForSide('right'), line.side);
    } else {
      overlay.classList.remove('dialogue-mode');
      overlay.classList.add('narration-mode');
      leftRow.hidden = true;
      rightRow.hidden = true;
      narration.hidden = false;
      narration.classList.add('active');
      overlay.querySelector('#storyNarrationSpeaker').textContent = line.speaker;
      overlay.querySelector('#storyNarrationText').textContent = line.text;
    }

    overlay.querySelector('#storyBack').disabled = activeScene.index === 0;
    const isLast = activeScene.index === activeScene.lines.length - 1;
    overlay.querySelector('#storyNext').textContent = isLast
      ? activeScene.finalLabel
      : '次へ ▶';

    overlay.querySelector('#storyProgress').innerHTML = activeScene.lines
      .map((_, i) => `<i class="${i === activeScene.index ? 'current' : i < activeScene.index ? 'done' : ''}"></i>`)
      .join('');
  }

  function stepScene(delta) {
    if (!activeScene) return;
    const nextIndex = activeScene.index + delta;
    if (nextIndex < 0) return;

    if (nextIndex >= activeScene.lines.length) {
      const done = activeScene.onComplete;
      activeScene = null;
      const overlay = document.querySelector('#storyOverlay');
      overlay.hidden = true;
      document.body.classList.remove('story-open');
      if (done) done();
      return;
    }

    activeScene.index = nextIndex;
    renderScene();
  }

  function showIntro() {
    playScene(introScene, {
      title:'序章　目覚めた陽光',
      finalLabel:'戦闘開始'
    });
  }

  function shouldShowIntro() {
    if (sessionStorage.getItem(INTRO_SESSION_KEY)) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return !saved || (!saved.cleared && saved.turn === 1);
    } catch {
      return true;
    }
  }

  function hookTalkButton(event) {
    const button = event.target.closest('#actionButtons button');
    if (!button || button.textContent.trim() !== '会話' || bypassTalk) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    playScene(talkScene, {
      title:'戦場会話',
      finalLabel:'会話を終える',
      onComplete:() => {
        bypassTalk = true;
        button.click();
        bypassTalk = false;
      }
    });
  }

  function enhanceMenu() {
    const content = document.querySelector('#modalContent');
    if (!content || content.querySelector('#replayIntroButton')) return;
    const heading = content.querySelector('h2');
    if (!heading || heading.textContent.trim() !== 'メニュー') return;

    const row = document.createElement('div');
    row.className = 'modal-actions';
    row.innerHTML = '<button id="replayIntroButton" type="button">序章導入を読む</button>';
    content.appendChild(row);
    row.querySelector('button').addEventListener('click', () => {
      document.querySelector('#modal')?.close();
      showIntro();
    });
  }

  function clearIntroOnRestart(event) {
    const button = event.target.closest('#restartBtn, #retry');
    if (button) sessionStorage.removeItem(INTRO_SESSION_KEY);
  }

  function handleStoryKeys(event) {
    if (!activeScene) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepScene(-1);
    }
    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepScene(1);
    }
  }

  function start() {
    createStoryOverlay();
    enhanceUnits();
    enhanceUnitCard();
    enhanceMenu();

    const observer = new MutationObserver(() => {
      enhanceUnits();
      enhanceUnitCard();
      enhanceMenu();
    });
    observer.observe(document.body, { childList:true, subtree:true });

    document.addEventListener('click', hookTalkButton, true);
    document.addEventListener('click', clearIntroOnRestart, true);
    document.addEventListener('keydown', handleStoryKeys);

    if (shouldShowIntro()) {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
      requestAnimationFrame(() => setTimeout(showIntro, 80));
    }
  }

  start();
})();
