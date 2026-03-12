(function () {
  const STORAGE_KEY = 'hinata-rpg-proto-save';
  const app = document.getElementById('app');

  const initial = {
    location: 'title',
    objective: '日向城で仲間と話し、宴の準備を進める',
    party: ['マエダ', 'ユウカ', 'サリナ', 'ミク'],
    facilities: ['宿', '井戸', '食堂兼軍議室'],
    importantFlags: { banquetStarted: false },
    topics: [],
    dialogLog: []
  };

  const banquetChoices = [
    ['戦利品を調べる', 'サリナ: 譜面束と欠けた月の指揮札、青い欠片を軍議で順に開こう。'],
    ['レイと話す', 'レイ: 石の音はまだ濁ってる。でも拍を重ねれば道は見える。'],
    ['コノカと話す', 'コノカ: 装備のほつれは今夜で縫い直す。明日の動きは軽くなるで。'],
    ['スズカと話す', 'スズカ: 次は受けるだけじゃない。こっちからリズムを取りに行く。'],
    ['宴をもう少し見る', 'ジャンボ: まずは食って笑って整える。明日も戦える城にしよう。']
  ];

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return raw ? Object.assign({}, initial, raw) : Object.assign({}, initial);
    } catch (_) {
      return Object.assign({}, initial);
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function reset() {
    save(Object.assign({}, initial));
    return load();
  }

  function btn(text, onClick) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  function showTitle() {
    const state = load();
    app.innerHTML = '';
    const p = document.createElement('div');
    p.className = 'panel';
    p.innerHTML = '<h1 class="title">日向坂RPG プロトタイプ</h1><div class="sub">音・灯り・約束で支える古城</div>';

    p.append(
      btn('はじめる', () => {
        const s = reset();
        s.location = 'hub';
        save(s);
        showHub();
      }),
      btn('つづきから', () => {
        if (state.location === 'banquet') showBanquet();
        else showHub();
      }),
      btn('セーブ初期化', () => {
        reset();
        showTitle();
      })
    );
    app.appendChild(p);
  }

  function showHub() {
    const state = load();
    state.location = 'hub';
    save(state);
    app.innerHTML = '';

    const info = document.createElement('div');
    info.className = 'panel small';
    const dialog = document.createElement('div');
    dialog.className = 'panel log';
    dialog.textContent = 'サリナ: 日向城の導線は確保済み。宴で次の動きを決めよう。';

    const wrap = document.createElement('div');
    wrap.className = 'grid';
    const map = document.createElement('div');
    map.className = 'map';
    const side = document.createElement('div');
    side.className = 'panel';

    const player = document.createElement('div');
    player.className = 'player';
    map.appendChild(player);

    const spots = [
      { x: 90, y: 90, name: 'ユウカ', line: '青い石はまだ不安定。焦って断定しないで進もう。' },
      { x: 260, y: 80, name: '施設掲示板', line: '解放施設: ' + state.facilities.join(' / ') },
      { x: 420, y: 100, name: '会話ログ', line: state.dialogLog.slice(-3).join('\n') || 'まだログはありません。' },
      { x: 560, y: 80, name: '宴の間', line: '仲間が集まってる。次の行動を選ぼう。' }
    ];

    spots.forEach((s) => {
      const el = document.createElement('div');
      el.className = 'spot';
      el.style.left = s.x + 'px';
      el.style.top = s.y + 'px';
      el.textContent = s.name;
      map.appendChild(el);
    });

    let x = 30;
    let y = 220;
    const keys = new Set();
    let running = true;

    function drawInfo() {
      info.textContent = [
        '現在地: 日向城ハブ',
        '目的: ' + state.objective,
        '加入人数: ' + state.party.length,
        '操作: 矢印キー移動 / Spaceで調べる'
      ].join('\n');
      player.style.left = x + 'px';
      player.style.top = y + 'px';
    }

    function nearSpot() {
      return spots.find((s) => Math.hypot(x - s.x, y - s.y) < 40);
    }

    function keydown(e) {
      keys.add(e.code);
      if (e.code === 'Space') {
        const n = nearSpot();
        if (!n) return;
        const line = n.name + ': ' + n.line;
        dialog.textContent = line;
        state.dialogLog.push(line);
        state.dialogLog = state.dialogLog.slice(-80);
        if (n.name === '宴の間') {
          state.location = 'banquet';
          state.importantFlags.banquetStarted = true;
          save(state);
          cleanup();
          showBanquet();
          return;
        }
        save(state);
      }
    }

    function keyup(e) {
      keys.delete(e.code);
    }

    function loop() {
      if (!running) return;
      if (keys.has('ArrowLeft')) x -= 2;
      if (keys.has('ArrowRight')) x += 2;
      if (keys.has('ArrowUp')) y -= 2;
      if (keys.has('ArrowDown')) y += 2;
      x = Math.max(0, Math.min(680, x));
      y = Math.max(0, Math.min(280, y));
      drawInfo();
      requestAnimationFrame(loop);
    }

    function cleanup() {
      running = false;
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    }

    side.append(
      btn('宴へ移動', () => {
        state.location = 'banquet';
        save(state);
        cleanup();
        showBanquet();
      }),
      btn('タイトルへ戻る', () => {
        cleanup();
        showTitle();
      })
    );

    wrap.append(map, side);
    app.append(info, wrap, dialog);
    drawInfo();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    requestAnimationFrame(loop);
  }

  function showBanquet() {
    const state = load();
    state.location = 'banquet';
    state.importantFlags.banquetStarted = true;
    save(state);

    app.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'panel';
    head.innerHTML = '<h2 style="margin:0 0 6px">日向城・宴</h2><div class="sub">次の行動を選ぶ（5択）</div>';

    const output = document.createElement('div');
    output.className = 'panel log';
    output.textContent = '仲間に声をかけて次の流れを決めよう。';

    const choices = document.createElement('div');
    choices.className = 'panel';
    banquetChoices.forEach(([label, line]) => {
      choices.appendChild(btn(label, () => {
        output.textContent = line + '\n\n→ 続きは次回拡張（翌朝の再襲来と軍議へ）';
        state.topics = ['翌朝に大鳥居が再襲来する兆し', '食費増大と資金不足への対処', '交易線と自給の立ち上げ'];
        state.dialogLog.push(line);
        state.dialogLog = state.dialogLog.slice(-80);
        save(state);
      }));
    });

    const back = document.createElement('div');
    back.className = 'panel';
    back.appendChild(btn('日向城ハブに戻る', showHub));

    app.append(head, choices, output, back);
  }

  showTitle();
})();
