(() => {
  'use strict';

  const MAX_CHAPTER = 7;
  const LAUNCH_MODE_KEY = 'hinata-senki-launch-mode-v1';
  const AUDIO_KEY = 'hinata-senki-audio-v1';
  const CAMPAIGN_KEY = 'hinata-senki-campaign-v2';
  const LEGACY_ROSTER_KEY = 'hinata-senki-campaign-roster-v1';
  const CHAPTER_SAVE_KEYS = [
    'hinata-senki-save-v1',
    ...Array.from({ length:MAX_CHAPTER - 1 }, (_,index) => `hinata-senki-chapter${index + 2}-save-v1`)
  ];

  const style = document.createElement('style');
  style.id = 'startMenuStyles';
  style.textContent = `
    body.awaiting-start{overflow:hidden;background:#071126}
    body.awaiting-start #app{visibility:hidden;pointer-events:none}
    .start-menu-overlay{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:radial-gradient(circle at 50% 25%,rgba(42,78,142,.72),transparent 38%),linear-gradient(180deg,#111b39,#050a18 75%);color:#fff;font-family:ui-monospace,"Hiragino Kaku Gothic ProN","Yu Gothic",monospace}
    .start-menu-panel{width:min(620px,94vw);padding:clamp(22px,5vw,42px);border:4px solid #d7bd68;border-radius:10px;background:linear-gradient(180deg,rgba(15,44,101,.97),rgba(5,18,55,.98));box-shadow:0 0 0 4px #251b0d,0 24px 80px rgba(0,0,0,.72),inset 0 0 0 3px #2f5aa3;text-align:center}
    .start-menu-kicker{font-size:13px;letter-spacing:.35em;color:#b9caef}
    .start-menu-title{margin:12px 0 6px;font-size:clamp(30px,8vw,54px);line-height:1.16;color:#fff5bd;text-shadow:3px 3px 0 #291709}
    .start-menu-subtitle{margin:0 0 30px;color:#c9d7f3;font-size:clamp(14px,3.4vw,18px)}
    .start-menu-actions{display:grid;gap:13px;margin:0 auto;width:min(390px,100%)}
    .start-menu-button{min-height:58px;border:3px solid #d6bd6d;border-radius:5px;background:#173d82;color:#fff;font:inherit;font-size:19px;font-weight:900;letter-spacing:.08em;box-shadow:inset 0 0 0 2px #315fae,0 4px 0 #1b1308;cursor:pointer}
    .start-menu-button:hover,.start-menu-button:focus-visible{background:#2455a3;outline:3px solid #fff2a4;outline-offset:3px}
    .start-menu-button.secondary{background:#273451;box-shadow:inset 0 0 0 2px #4c608c,0 4px 0 #1b1308}
    .start-menu-button:disabled{opacity:.38;cursor:not-allowed;filter:grayscale(.7)}
    .start-menu-save{min-height:44px;margin:17px auto 0;padding:10px 12px;border:1px solid rgba(211,226,255,.35);border-radius:6px;background:rgba(0,0,0,.22);color:#cdd9ef;font-size:13px;line-height:1.65}
    .start-menu-note{margin:18px 0 0;color:#9fb0d2;font-size:12px;line-height:1.65}
    .start-menu-error{margin-top:14px;color:#ffd0c7;font-weight:800}
  `;
  document.head.appendChild(style);

  function read(storage,key) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isUsableSave(value) {
    return Boolean(value && typeof value === 'object' && Array.isArray(value.units));
  }

  function getContinueInfo() {
    const campaign = read(localStorage,CAMPAIGN_KEY);
    if (isUsableSave(campaign) && (campaign.units.length > 0 || Number(campaign.completedChapter) > 0)) {
      const completed = Math.max(0,Number(campaign.completedChapter) || 0);
      const current = Math.max(1,Number(campaign.currentChapter) || completed + 1);
      return {
        chapter:Math.min(MAX_CHAPTER,current),
        completed,
        source:'campaign'
      };
    }

    for (let chapter = MAX_CHAPTER; chapter >= 2; chapter -= 1) {
      const saved = read(localStorage,`hinata-senki-chapter${chapter}-save-v1`);
      if (!isUsableSave(saved)) continue;
      return {
        chapter:saved.cleared ? Math.min(MAX_CHAPTER,chapter + 1) : chapter,
        completed:saved.cleared ? chapter : chapter - 1,
        source:'chapter'
      };
    }

    const chapterOne = read(localStorage,'hinata-senki-save-v1');
    if (isUsableSave(chapterOne)) {
      return {
        chapter:chapterOne.cleared ? 2 : 1,
        completed:chapterOne.cleared ? 1 : 0,
        source:'chapter1'
      };
    }

    const legacy = read(localStorage,LEGACY_ROSTER_KEY);
    if (isUsableSave(legacy)) {
      const completed = Math.max(1,Number(legacy.chapter) || 1);
      return {
        chapter:Math.min(MAX_CHAPTER,completed + 1),
        completed,
        source:'legacy'
      };
    }

    return null;
  }

  function clearGameplayData() {
    const localKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('hinata-senki-') && key !== AUDIO_KEY) localKeys.push(key);
    }
    localKeys.forEach(key => localStorage.removeItem(key));

    const sessionKeys = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith('hinata-senki-')) sessionKeys.push(key);
    }
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    CHAPTER_SAVE_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(CAMPAIGN_KEY);
    localStorage.removeItem(LEGACY_ROSTER_KEY);
  }

  function loadScript(src) {
    return new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`読み込み失敗: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function startChapterOne(mode,overlay) {
    sessionStorage.setItem(LAUNCH_MODE_KEY,mode);
    overlay.remove();
    document.body.classList.remove('awaiting-start');
    try {
      await loadScript('./chapter1-intro-v4.js?v=1');
      await loadScript('./chapter1-character-scenes.js?v=1');
      await loadScript('./campaign-root-loader.js?v=4');
      await loadScript('./audio-prototype.js?v=1');
    } catch (error) {
      console.error(error);
      document.body.classList.add('awaiting-start');
      document.body.appendChild(overlay);
      const errorBox = overlay.querySelector('#startMenuError');
      if (errorBox) errorBox.textContent = 'ゲームの読み込みに失敗しました。ページを再読み込みしてください。';
    }
  }

  function continueCampaign(info,overlay) {
    sessionStorage.setItem(LAUNCH_MODE_KEY,'continue');
    if (info.chapter <= 1) {
      startChapterOne('continue',overlay);
      return;
    }
    location.href = `./chapter${info.chapter}/?mode=continue`;
  }

  function render() {
    const continueInfo = getContinueInfo();
    const overlay = document.createElement('section');
    overlay.className = 'start-menu-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','startMenuTitle');
    overlay.innerHTML = `
      <div class="start-menu-panel">
        <div class="start-menu-kicker">16-BIT TACTICAL RPG</div>
        <h1 class="start-menu-title" id="startMenuTitle">日向戦記</h1>
        <p class="start-menu-subtitle">―陽だまりの旗―</p>
        <div class="start-menu-actions">
          <button class="start-menu-button" id="newGameButton">ニューゲーム</button>
          <button class="start-menu-button secondary" id="continueButton" ${continueInfo ? '' : 'disabled'}>コンティニュー</button>
        </div>
        <div class="start-menu-save">${continueInfo ? `保存データあり<br>第${continueInfo.chapter}章から再開します` : '保存データはありません'}</div>
        <p class="start-menu-note">ニューゲームは、音量設定を残して現在の進行データを消去し、第1章から開始します。</p>
        <div class="start-menu-error" id="startMenuError" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#newGameButton').addEventListener('click',() => {
      if (continueInfo && !confirm('現在の進行データを消去して、第1章から始めますか？')) return;
      clearGameplayData();
      startChapterOne('new',overlay);
    });

    overlay.querySelector('#continueButton').addEventListener('click',() => {
      if (!continueInfo) return;
      continueCampaign(continueInfo,overlay);
    });
  }

  render();
})();
