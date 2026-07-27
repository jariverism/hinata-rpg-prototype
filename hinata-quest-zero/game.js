(() => {
  "use strict";
  const D = window.HQ0,
    cv = document.getElementById("game"),
    c = cv.getContext("2d", { alpha: false });
  c.imageSmoothingEnabled = false;
  const $ = (id) => document.getElementById(id),
    ui = {
      title: $("title"),
      name: $("name-modal"),
      nameInput: $("name-input"),
      dialog: $("dialogue"),
      portrait: $("portrait"),
      speaker: $("speaker"),
      text: $("text"),
      battle: $("battle"),
      battleLog: $("battle-log"),
      party: $("party"),
      commands: $("commands"),
      menu: $("menu"),
      menuBody: $("menu-body"),
      load: $("load-modal"),
      loadSlots: $("load-slots"),
      clear: $("clear"),
      clearChapter: $("clear-chapter"),
      clearTitle: $("clear-title-text"),
      clearMessage: $("clear-message"),
      clearInfo: $("clear-info"),
      clearNext: $("clear-next"),
      hud: $("hud"),
      location: $("location"),
      objective: $("objective"),
      toast: $("toast"),
      touch: $("touch"),
    };
  const W = 640,
    H = 360,
    T = 32,
    SAVE = "hq0-save-",
    AUTO = "hq0-auto",
    blocked = new Set([
      D.TILE.TREE,
      D.TILE.WATER,
      D.TILE.WALL,
      D.TILE.ROOF,
      D.TILE.LAVA,
    ]);
  const fresh = (name = "トシ") => ({
    version: 2,
    name,
    chapter: 1,
    map: "grass",
    x: 2,
    y: 5,
    dir: "right",
    lv: 1,
    exp: 0,
    hp: 66,
    mp: 18,
    maxHp: 66,
    maxMp: 18,
    atk: 13,
    def: 7,
    gold: 25,
    items: {
      herb: 2,
      antidote: 0,
      happyBread: 0,
      sunwheat: 0,
      sword: 0,
      charm: 0,
      apron: 0,
    },
    equip: { weapon: null, charm: null },
    opened: {},
    defeated: {},
    visited: {},
    flags: {
      tutorial: false,
      metKumi: false,
      raid: false,
      raidWon: false,
      kumi: false,
      cave: false,
      bossIntro: false,
      boss: false,
      joined: false,
      chapter1Clear: false,
      chapter2: false,
      metMirei: false,
      mireiGuest: false,
      mireiJoined: false,
      ovenOpen: false,
      ovenBossIntro: false,
      chapter2Boss: false,
      chapter2Clear: false,
      clear: false,
      fragment: 0,
    },
    kumi: { hp: 92, mp: 24, maxHp: 92, maxMp: 24, atk: 19, def: 13 },
    mirei: { hp: 78, mp: 38, maxHp: 78, maxMp: 38, atk: 14, def: 10 },
    active: { kumi: true, mirei: true },
    quests: { sunwheat: "locked", straw: "available", oven: "locked" },
    kills: { strawling: 0, ember: 0, scarecrow: 0 },
    battles: 0,
    steps: 0,
    playTime: 0,
    started: Date.now(),
  });
  let s = fresh(),
    mode = "title",
    titleChoice = 0,
    scene = "title",
    q = [],
    qi = 0,
    qDone = null,
    enemies = [],
    fight = null,
    tab = "status",
    last = performance.now(),
    lastMove = 0,
    walk = 0,
    toastTimer,
    fade = 0,
    fadeDir = 0,
    fadeCb = null,
    shake = 0,
    flash = 0,
    numbers = [],
    audio = null;
  const keys = new Set();

  function show(el, on = true) {
    el.classList.toggle("hidden", !on);
  }
  function setMode(m) {
    mode = m;
    show(ui.title, m === "title");
    show(ui.name, m === "name");
    show(ui.dialog, m === "dialog");
    show(ui.battle, m === "battle");
    show(ui.menu, m === "menu");
    show(ui.load, m === "load");
    show(ui.clear, m === "clear");
    show(ui.hud, m === "map");
    show(ui.touch, m === "map");
  }
  function beep(type = "ok") {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const o = audio.createOscillator(),
        g = audio.createGain(),
        z = {
          ok: [620, 0.05, "square"],
          no: [220, 0.08, "square"],
          hit: [110, 0.09, "sawtooth"],
          heal: [760, 0.15, "sine"],
          win: [880, 0.22, "triangle"],
          save: [520, 0.18, "triangle"],
        }[type] || [620, 0.05, "square"];
      o.type = z[2];
      o.frequency.value = z[0];
      if (type === "win")
        o.frequency.exponentialRampToValueAtTime(
          1350,
          audio.currentTime + z[1],
        );
      g.gain.setValueAtTime(0.045, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + z[1]);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + z[1]);
    } catch {}
  }
  function toast(text, ms = 1800) {
    ui.toast.textContent = text;
    show(ui.toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => show(ui.toast, false), ms);
  }
  function time(v) {
    const m = Math.floor(v / 60),
      n = Math.floor(v % 60);
    return `${String(m).padStart(2, "0")}:${String(n).padStart(2, "0")}`;
  }
  function objective() {
    if (!s.flags.tutorial) return "草原の魔物を倒そう";
    if (!s.flags.metKumi) return "王都北の騎士団長に会おう";
    if (s.flags.raid && !s.flags.raidWon) return "東門外の魔物を迎え撃とう";
    if (!s.flags.boss) return "北の洞窟で異変の原因を探ろう";
    if (!s.flags.chapter2) return "西のパンの国ミレリアへ";
    if (!s.flags.metMirei) return "ミレリアのパン工房を訪ねよう";
    if (!s.flags.ovenOpen)
      return `陽だまり麦を集めよう ${Math.min(3, s.items.sunwheat || 0)}/3`;
    if (!s.flags.chapter2Boss) return "忘れられた大窯を浄化しよう";
    return "二つ目の光を見届けよう";
  }
  function hud() {
    ui.location.textContent = D.maps[s.map].name;
    ui.objective.textContent = objective();
  }
  function heroMaxHp() {
    return s.maxHp + (s.equip.charm === "charm" ? 10 : 0);
  }
  function heroAtk() {
    return s.atk + (s.equip.weapon === "sword" ? 5 : 0);
  }
  function heroDef() {
    return s.def + (s.equip.charm === "charm" ? 4 : 0);
  }
  function serial() {
    return {
      ...s,
      playTime: s.playTime + (Date.now() - s.started) / 1000,
      started: Date.now(),
    };
  }
  function save(slot, silent = false) {
    const data = serial();
    localStorage.setItem(
      slot === "auto" ? AUTO : SAVE + slot,
      JSON.stringify(data),
    );
    s.playTime = data.playTime;
    s.started = Date.now();
    if (!silent) {
      beep("save");
      toast(`冒険の書${slot}に記録しました`);
    }
  }
  function read(slot) {
    try {
      const v = JSON.parse(
        localStorage.getItem(slot === "auto" ? AUTO : SAVE + slot),
      );
      return v?.version >= 1 && v?.version <= 2 ? v : null;
    } catch {
      return null;
    }
  }
  function load(slot) {
    const v = read(slot);
    if (!v) return;
    const base = fresh(v.name);
    s = {
      ...base,
      ...v,
      version: 2,
      items: { ...base.items, ...v.items },
      equip: { ...base.equip, ...v.equip },
      flags: { ...base.flags, ...v.flags },
      kumi: { ...base.kumi, ...v.kumi },
      mirei: { ...base.mirei, ...v.mirei },
      active: { ...base.active, ...v.active },
      quests: { ...base.quests, ...v.quests },
      kills: { ...base.kills, ...v.kills },
      started: Date.now(),
    };
    if (s.flags.boss) {
      s.flags.chapter1Clear = true;
      s.flags.joined = true;
      s.flags.fragment = Math.max(1, s.flags.fragment || 0);
    }
    if (s.flags.chapter2Boss) {
      s.flags.chapter2Clear = true;
      s.flags.mireiJoined = true;
      s.flags.fragment = Math.max(2, s.flags.fragment || 0);
    }
    if (!D.maps[s.map]) {
      s.map = s.flags.chapter2 ? "milerea" : "grass";
      [s.x, s.y] = D.maps[s.map].start;
    }
    s.hp = Math.min(s.hp, heroMaxHp());
    buildEnemies();
    scene = "map";
    if (s.flags.clear) showClear();
    else {
      setMode("map");
      hud();
      fadeIn();
    }
    beep("save");
  }
  function autosave() {
    save("auto", true);
  }
  function fadeTo(cb) {
    if (fadeDir) return;
    fadeDir = 1;
    fadeCb = cb;
  }
  function fadeIn() {
    fade = 1;
    fadeDir = -1;
  }
  function changeMap(id, x, y, dir = "down") {
    fadeTo(() => {
      s.map = id;
      s.x = x;
      s.y = y;
      s.dir = dir;
      scene = "map";
      buildEnemies();
      setMode("map");
      hud();
      autosave();
    });
  }
  function buildEnemies() {
    enemies = (D.maps[s.map].enemies || [])
      .filter((e) => {
        if (s.defeated[e.id]) return false;
        if (e.id === "raid") return s.flags.raid && !s.flags.raidWon;
        return !e.hidden;
      })
      .map((e) => ({ ...e, face: "down" }));
  }

  function replace(lines) {
    return lines.map(([speaker, portrait, text, sc]) => ({
      speaker: speaker === "主人公" ? s.name : speaker,
      portrait,
      text: text.replaceAll("主人公", s.name),
      scene: sc,
    }));
  }
  function dialogue(lines, done = null) {
    q = Array.isArray(lines[0]) ? replace(lines) : lines;
    qi = 0;
    qDone = done;
    setMode("dialog");
    dialogLine();
  }
  function dialogLine() {
    const z = q[qi];
    if (!z) return endDialog();
    if (z.scene) scene = z.scene;
    ui.speaker.textContent = z.speaker;
    ui.text.textContent = z.text;
    portrait(z.portrait);
    beep();
  }
  function advance() {
    if (mode !== "dialog") return;
    if (++qi >= q.length) endDialog();
    else dialogLine();
  }
  function endDialog() {
    const done = qDone;
    q = [];
    qDone = null;
    if (done) done();
    else setMode("map");
  }
  function newGame() {
    s = fresh((ui.nameInput.value.trim() || "トシ").slice(0, 8));
    scene = "room";
    dialogue(D.intro, () => {
      scene = "map";
      buildEnemies();
      setMode("map");
      hud();
      fadeIn();
      autosave();
      toast("第一章　空色の騎士団長", 2600);
    });
  }

  function delta(dir) {
    return { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  }
  function mapActor(x, y) {
    const e = enemies.find((v) => v.x === x && v.y === y);
    if (e) return ["enemy", e];
    const n = D.maps[s.map].npcs.find((v) => v.x === x && v.y === y);
    if (n) return ["npc", n];
    const h = D.maps[s.map].chests.find(
      (v) => v.x === x && v.y === y && !s.opened[v.id],
    );
    if (h) return ["chest", h];
    return null;
  }
  function canWalk(x, y) {
    const m = D.maps[s.map];
    if (x < 0 || y < 0 || x >= 20 || y >= 11 || blocked.has(m.tiles[y][x]))
      return false;
    return !mapActor(x, y);
  }
  function move(dir) {
    if (mode !== "map" || fadeDir) return;
    s.dir = dir;
    const [dx, dy] = delta(dir),
      x = s.x + dx,
      y = s.y + dy,
      a = mapActor(x, y);
    if (a?.[0] === "enemy") {
      meetEnemy(a[1], false);
      return;
    }
    if (s.map === "cave" && s.x === 10 && s.y === 9 && dir === "down") {
      changeMap("grass", 10, 1, "down");
      return;
    }
    if (s.map === "oven" && s.x === 10 && s.y === 9 && dir === "down") {
      changeMap("milerea", 10, 1, "down");
      return;
    }
    if (s.map === "grass" && x === 10 && y === 0 && !s.flags.cave) {
      toast("洞窟の入口は固く閉ざされている");
      beep("no");
      return;
    }
    if (!canWalk(x, y)) {
      beep("no");
      return;
    }
    s.x = x;
    s.y = y;
    s.steps++;
    walk++;
    checkWarp();
    if (mode === "map") chase();
  }
  function checkWarp() {
    if (s.map === "grass" && s.x === 19 && s.y === 5) {
      if (!s.flags.tutorial) {
        s.x = 18;
        toast("魔物を放置して王都へは行けない");
      } else changeMap("city", 10, 9, "up");
    } else if (s.map === "city" && s.x === 10 && s.y === 10) {
      if (s.flags.chapter1Clear) changeMap("world", 3, 5, "right");
      else changeMap("grass", 18, 5, "left");
    } else if (s.map === "grass" && s.x === 10 && s.y === 0 && s.flags.cave)
      changeMap("cave", 10, 9, "up");
    else if (s.map === "milerea" && s.x === 10 && s.y === 10)
      changeMap("world", 16, 5, "left");
    else if (s.map === "milerea" && s.x === 19 && s.y === 5)
      changeMap("wheatfield", 1, 5, "right");
    else if (s.map === "wheatfield" && s.x === 0 && s.y === 5)
      changeMap("milerea", 18, 5, "left");
    else if (s.map === "milerea" && s.x === 10 && s.y === 0) {
      if (s.flags.ovenOpen) changeMap("oven", 10, 9, "up");
      else {
        s.y = 1;
        toast("大窯の扉は冷たく閉ざされている");
        beep("no");
      }
    }
  }
  function chase() {
    const occupied = new Set(enemies.map((e) => `${e.x},${e.y}`));
    for (const e of enemies) {
      if (e.boss) continue;
      const dist = Math.abs(e.x - s.x) + Math.abs(e.y - s.y);
      if (dist < 1 || dist > 4) continue;
      let dx = 0,
        dy = 0;
      if (Math.abs(e.x - s.x) >= Math.abs(e.y - s.y)) dx = Math.sign(s.x - e.x);
      else dy = Math.sign(s.y - e.y);
      const x = e.x + dx,
        y = e.y + dy;
      e.face = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
      if (x === s.x && y === s.y) {
        meetEnemy(e, true);
        return;
      }
      if (canWalk(x, y) && !occupied.has(`${x},${y}`)) {
        occupied.delete(`${e.x},${e.y}`);
        e.x = x;
        e.y = y;
        occupied.add(`${x},${y}`);
      }
    }
  }
  function interact() {
    if (mode === "dialog") return advance();
    if (mode !== "map") return;
    const [dx, dy] = delta(s.dir),
      a = mapActor(s.x + dx, s.y + dy);
    if (!a) {
      beep("no");
      return;
    }
    if (a[0] === "npc") talk(a[1]);
    else if (a[0] === "chest") chest(a[1]);
    else meetEnemy(a[1], false);
  }
  function talk(n) {
    if (n.special === "travelSora") {
      dialogue([["SYSTEM", "light", "王国ソラシドへ移動します。"]], () =>
        changeMap("city", 10, 9, "up"),
      );
      return;
    }
    if (n.special === "travelMilerea") {
      dialogue([["SYSTEM", "light", "パンの国ミレリアへ移動します。"]], () =>
        changeMap("milerea", 10, 9, "up"),
      );
      return;
    }
    if (n.special === "mirei") {
      mireiTalk();
      return;
    }
    if (n.special === "questBoard") {
      questBoard();
      return;
    }
    if (n.special === "kumi") {
      if (s.flags.metKumi)
        return dialogue([
          [
            "佐々木久美",
            "kumi",
            s.flags.cave
              ? "北の洞窟へ行こう。嫌な気配が強くなってる。"
              : "東門の外へ急ぐよ！",
          ],
        ]);
      s.flags.metKumi = true;
      dialogue(D.meet, () => {
        s.flags.raid = true;
        s.flags.kumi = true;
        s.map = "grass";
        s.x = 15;
        s.y = 5;
        s.dir = "right";
        scene = "map";
        buildEnemies();
        setMode("map");
        hud();
        fadeIn();
        autosave();
        toast("久美と共闘して住民を守れ！");
      });
      return;
    }
    dialogue(
      n.lines.map((t) => ({ speaker: n.name, portrait: n.type, text: t })),
      n.shop ? () => shop(n.shop === true ? "sora" : n.shop) : null,
    );
  }
  function mireiTalk() {
    if (!s.flags.metMirei) {
      s.flags.metMirei = true;
      s.quests.sunwheat = "active";
      dialogue(D.mireiMeet, () => {
        setMode("map");
        hud();
        autosave();
        toast("東の陽だまり麦畑へ向かおう！");
      });
      return;
    }
    if (!s.flags.ovenOpen && (s.items.sunwheat || 0) < 3) {
      dialogue([
        [
          "パン職人の少女",
          "mirei",
          `陽だまり麦はあと${3 - (s.items.sunwheat || 0)}つ。東の畑を探してみて。`,
        ],
      ]);
      return;
    }
    if (!s.flags.ovenOpen) {
      s.items.sunwheat -= 3;
      s.items.happyBread += 2;
      s.flags.mireiGuest = true;
      s.flags.ovenOpen = true;
      s.quests.sunwheat = "complete";
      s.quests.oven = "active";
      s.hp = heroMaxHp();
      s.mp = s.maxMp;
      s.kumi.hp = s.kumi.maxHp;
      s.kumi.mp = s.kumi.maxMp;
      s.mirei.hp = s.mirei.maxHp;
      s.mirei.mp = s.mirei.maxMp;
      dialogue(D.mireiBake, () => {
        setMode("map");
        hud();
        autosave();
        toast("北の「忘れられた大窯」へ！");
      });
      return;
    }
    dialogue([
      [
        s.flags.mireiJoined ? "佐々木美玲" : "パン職人の少女",
        "mirei",
        s.flags.chapter2Boss
          ? "次の旅にも、焼きたてのパンをたくさん持っていこう！"
          : "魔窯が大技をためたら守って。私がすぐにみんなを回復するね！",
      ],
    ]);
  }
  function questBoard() {
    const state = s.quests.straw;
    if (state === "available") {
      dialogue(
        [
          [
            "お願い掲示板",
            "farmer",
            "依頼：東の麦畑を荒らす「くよくよ麦わら」を2体退治してください。",
          ],
          ["SYSTEM", "light", "サブクエスト「麦畑の困りもの」を受注した！"],
        ],
        () => {
          s.quests.straw = "active";
          setMode("map");
          autosave();
        },
      );
      return;
    }
    if (state === "active" && (s.kills.strawling || 0) >= 2) {
      dialogue(
        [
          [
            "麦農家",
            "farmer",
            "畑が静かになった！　これでまた麦を育てられるよ。",
          ],
          ["SYSTEM", "light", "報酬として80Gと毒消し草2個を受け取った！"],
        ],
        () => {
          s.quests.straw = "complete";
          s.gold += 80;
          s.items.antidote += 2;
          setMode("map");
          autosave();
        },
      );
      return;
    }
    if (state === "active") {
      dialogue([
        [
          "お願い掲示板",
          "farmer",
          `くよくよ麦わらの退治数：${Math.min(2, s.kills.strawling || 0)}/2`,
        ],
      ]);
      return;
    }
    dialogue([["お願い掲示板", "farmer", "「麦畑の困りもの」――達成済み。"]]);
  }
  function chest(h) {
    s.opened[h.id] = true;
    s.items[h.item] = (s.items[h.item] || 0) + h.amount;
    beep("win");
    dialogue(
      [
        {
          speaker: "SYSTEM",
          portrait: ["charm", "apron", "sunwheat"].includes(h.item)
            ? "light"
            : "chest",
          text: h.text,
        },
      ],
      () => {
        setMode("map");
        hud();
        if (
          h.item === "sunwheat" &&
          (s.items.sunwheat || 0) >= 3 &&
          s.quests.sunwheat === "active"
        )
          toast("陽だまり麦がそろった！　美玲の工房へ戻ろう");
        autosave();
      },
    );
  }
  function shop(kind = "sora") {
    const catalog =
      kind === "milerea"
        ? [
            ["herb", "薬草", "HP35回復", 15],
            ["antidote", "毒消し草", "毒・眠りを治す", 18],
            ["happyBread", "ハッピーブレッド", "味方全体HP25回復", 38],
          ]
        : [
            ["herb", "薬草", "HP35回復", 15],
            ["sword", "青銅の剣", "攻撃+5", 45],
          ];
    setMode("menu");
    ui.menu.querySelector("nav").classList.add("hidden");
    ui.menuBody.innerHTML = `<div class="list">${catalog
      .map(
        ([id, name, detail, price]) =>
          `<div class="item"><div><strong>${name}</strong><span>${detail} / ${price}G</span></div><button data-buy="${id}" data-price="${price}"${id === "sword" && s.items.sword ? " disabled" : ""}>買う</button></div>`,
      )
      .join(
        "",
      )}<div class="card"><strong>所持金 ${s.gold}G</strong><span>×で買い物を終えます。</span></div></div>`;
    ui.menuBody.querySelectorAll("[data-buy]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.buy,
            price = Number(b.dataset.price);
          if (s.gold < price) return toast("ゴールドが足りない");
          s.gold -= price;
          s.items[id] = (s.items[id] || 0) + 1;
          beep("save");
          const item = catalog.find(([itemId]) => itemId === id);
          toast(`${item?.[1] || "道具"}を買った`);
          shop(kind);
        }),
    );
  }

  function meetEnemy(e, ambush) {
    if (e.id === "ovenBoss" && !s.flags.ovenBossIntro) {
      s.flags.ovenBossIntro = true;
      dialogue(D.ovenBossIntro, () => startBattle(e, false));
      return;
    }
    if (e.id === "boss" && !s.flags.bossIntro) {
      s.flags.bossIntro = true;
      dialogue(D.bossIntro, () => startBattle(e, false));
      return;
    }
    startBattle(e, ambush);
  }
  function party() {
    const a = [
      {
        id: "hero",
        name: s.name,
        hp: s.hp,
        mp: s.mp,
        maxHp: heroMaxHp(),
        maxMp: s.maxMp,
        atk: heroAtk(),
        def: heroDef(),
        guard: false,
        buff: 0,
        status: { poison: 0, sleep: 0, auraDown: 0 },
      },
    ];
    if ((s.flags.kumi || s.flags.joined) && s.active.kumi !== false)
      a.push({
        id: "kumi",
        name: "久美",
        hp: s.kumi.hp,
        mp: s.kumi.mp,
        maxHp: s.kumi.maxHp,
        maxMp: s.kumi.maxMp,
        atk: s.kumi.atk,
        def: s.kumi.def,
        guard: false,
        buff: 0,
        status: { poison: 0, sleep: 0, auraDown: 0 },
      });
    if ((s.flags.mireiGuest || s.flags.mireiJoined) && s.active.mirei !== false)
      a.push({
        id: "mirei",
        name: "美玲",
        hp: s.mirei.hp,
        mp: s.mirei.mp,
        maxHp: s.mirei.maxHp,
        maxMp: s.mirei.maxMp,
        atk: s.mirei.atk,
        def: s.mirei.def + (s.items.apron ? 4 : 0),
        guard: false,
        buff: 0,
        status: { poison: 0, sleep: 0, auraDown: 0 },
      });
    return a;
  }
  function sync() {
    if (!fight) return;
    const h = fight.party[0];
    s.hp = h.hp;
    s.mp = h.mp;
    const k = fight.party.find((v) => v.id === "kumi");
    if (k) {
      s.kumi.hp = k.hp;
      s.kumi.mp = k.mp;
    }
    const m = fight.party.find((v) => v.id === "mirei");
    if (m) {
      s.mirei.hp = m.hp;
      s.mirei.mp = m.mp;
    }
  }
  function startBattle(src, ambush = false) {
    const base = D.enemies[src.kind];
    fight = {
      src,
      foe: { ...base, kind: src.kind, maxHp: base.hp },
      party: party(),
      actor: 0,
      turn: 1,
      captain: 0,
      warning: false,
      busy: true,
    };
    s.battles++;
    scene = "battle";
    setMode("battle");
    ui.battleLog.textContent = ambush
      ? `${base.name}に背後を取られた！`
      : `${base.name}が立ちはだかった！`;
    battleUi();
    flash = 0.6;
    setTimeout(() => (ambush ? enemyTurn() : actorTurn()), 650);
  }
  function battleUi() {
    if (!fight) return;
    ui.party.innerHTML = fight.party
      .map((p) => {
        const states = [
          p.status.poison > 0 ? "毒" : "",
          p.status.sleep > 0 ? "眠" : "",
          p.status.auraDown > 0 ? "オーラ↓" : "",
        ]
          .filter(Boolean)
          .map((z) => `<em>${z}</em>`)
          .join("");
        return `<div class="member"><div><span>${p.name} ${states}</span><span>HP ${p.hp}/${p.maxHp}</span></div><div class="bar"><i style="width:${(100 * p.hp) / p.maxHp}%"></i></div><div><span>MP</span><span>${p.mp}/${p.maxMp}</span></div><div class="bar mp"><i style="width:${(100 * p.mp) / p.maxMp}%"></i></div></div>`;
      })
      .join("");
  }
  function actorTurn() {
    if (!fight) return;
    fight.busy = false;
    while (fight.actor < fight.party.length && fight.party[fight.actor].hp <= 0)
      fight.actor++;
    if (fight.actor >= fight.party.length) return enemyTurn();
    const p = fight.party[fight.actor];
    if (p.status.sleep > 0) {
      fight.busy = true;
      p.status.sleep--;
      ui.battleLog.textContent = `${p.name}は眠っている……。`;
      battleUi();
      afterAction(550);
      return;
    }
    ui.battleLog.textContent = `${p.name}の行動を選んでください。`;
    battleUi();
    commands("root");
  }
  function commands(level) {
    const p = fight?.party[fight.actor];
    if (!p || fight.busy) return;
    fight.commandLevel = level;
    fight.commandChoice = 0;
    let list = [];
    if (level === "root") {
      list = [
        ["たたかう", attack],
        ["スキル", () => commands("skill")],
        ["アイテム", () => commands("item")],
        ["ぼうぎょ", guard],
      ];
      if (!fight.foe.boss) list.push(["にげる", escapeBattle]);
    } else if (level === "skill") {
      if (p.id === "hero")
        list = [
          ["推しの声援 MP3", cheer, p.mp < 3 || fight.party.length < 2],
          ["オーラブレード MP4", aura, p.mp < 4],
          ["もどる", () => commands("root")],
        ];
      else if (p.id === "kumi")
        list = [
          ["キャプテンコール MP4", captain, p.mp < 4],
          ["蒼天突き MP5", thrust, p.mp < 5],
          ["もどる", () => commands("root")],
        ];
      else
        list = [
          ["焼きたてヒール MP4", warmHeal, p.mp < 4],
          ["ハッピーブレッド MP7", happyFeast, p.mp < 7],
          ["みーぱんスマイル MP5", smileCure, p.mp < 5],
          ["聖火フライパン MP5", panFire, p.mp < 5],
          ["もどる", () => commands("root")],
        ];
    } else {
      for (const z of fight.party)
        list.push([
          `薬草→${z.name} ×${s.items.herb}`,
          () => herb(z),
          !s.items.herb || z.hp <= 0 || z.hp >= z.maxHp,
        ]);
      for (const z of fight.party)
        list.push([
          `毒消し→${z.name} ×${s.items.antidote}`,
          () => antidote(z),
          !s.items.antidote ||
            z.hp <= 0 ||
            (!z.status.poison && !z.status.sleep && !z.status.auraDown),
        ]);
      list.push([
        `ハッピーブレッド ×${s.items.happyBread}`,
        breadItem,
        !s.items.happyBread ||
          !fight.party.some((z) => z.hp > 0 && z.hp < z.maxHp),
      ]);
      list.push(["もどる", () => commands("root")]);
    }
    ui.commands.innerHTML = "";
    for (const [label, fn, disabled] of list) {
      const b = document.createElement("button");
      b.textContent = label;
      b.disabled = !!disabled;
      b.onclick = () => {
        if (fight?.busy || b.disabled) return;
        beep();
        fn();
      };
      ui.commands.appendChild(b);
    }
    focusBattle(0);
  }
  function focusBattle(delta) {
    if (!fight) return;
    const list = [...ui.commands.querySelectorAll("button:not(:disabled)")];
    if (!list.length) return;
    fight.commandChoice =
      (fight.commandChoice + delta + list.length) % list.length;
    list.forEach((b, i) =>
      b.classList.toggle("selected", i === fight.commandChoice),
    );
    list[fight.commandChoice].focus();
  }
  function damage(atk, def, m = 1) {
    return Math.max(
      1,
      Math.floor((atk * m - def * 0.55) * (0.9 + Math.random() * 0.2)),
    );
  }
  function attackPower(p, bonus = 0) {
    return p.atk + p.buff + bonus - (p.status.auraDown > 0 ? 5 : 0);
  }
  function elementDamage(p, power, element) {
    let multiplier = 1;
    let note = "";
    if (fight.foe.weak?.includes(element)) {
      multiplier = 1.5;
      note = "　弱点！";
    } else if (fight.foe.resist?.includes(element)) {
      multiplier = 0.62;
      note = "　耐性";
    }
    return {
      value: damage(attackPower(p), fight.foe.def, power * multiplier),
      note,
    };
  }
  function hit(target, n, color = "#fff0a0") {
    beep("hit");
    shake = 5;
    const p =
      target === "foe"
        ? [480, 105]
        : target === "hero"
          ? [125, 175]
          : target === "kumi"
            ? [220, 175]
            : [315, 175];
    numbers.push({ text: String(n), x: p[0], y: p[1], life: 1, color });
  }
  function attack() {
    const p = fight.party[fight.actor],
      n = damage(attackPower(p), fight.foe.def);
    fight.busy = true;
    fight.foe.hp = Math.max(0, fight.foe.hp - n);
    ui.battleLog.textContent = `${p.name}の攻撃！\n${fight.foe.name}に ${n} ダメージ！`;
    hit("foe", n);
    afterAction();
  }
  function cheer() {
    const p = fight.party[fight.actor],
      target = fight.party
        .filter((v) => v.id !== p.id && v.hp > 0)
        .sort((a, b) => b.atk - a.atk)[0];
    fight.busy = true;
    p.mp -= 3;
    target.buff = Math.max(target.buff, 7);
    ui.battleLog.textContent = `${p.name}の「推しの声援」！\n${target.name}の攻撃力が上がった！`;
    beep("heal");
    afterAction(700);
  }
  function aura() {
    const p = fight.party[fight.actor],
      result = elementDamage(p, 1.48, "light"),
      n = result.value;
    fight.busy = true;
    p.mp -= 4;
    fight.foe.hp = Math.max(0, fight.foe.hp - n);
    ui.battleLog.textContent = `${p.name}の「オーラブレード」！\n空色の光が ${n} ダメージ！${result.note}`;
    flash = 0.5;
    hit("foe", n, "#9cf3ff");
    afterAction(750);
  }
  function captain() {
    const p = fight.party[fight.actor];
    fight.busy = true;
    p.mp -= 4;
    fight.captain = 3;
    fight.party.forEach((v) => (v.buff = Math.max(v.buff, 4)));
    ui.battleLog.textContent =
      "久美の「キャプテンコール」！\n味方全員の攻撃と守りが上がった！";
    beep("win");
    flash = 0.35;
    afterAction(850);
  }
  function thrust() {
    const p = fight.party[fight.actor],
      result = elementDamage(p, 1.62, "wind"),
      n = result.value;
    fight.busy = true;
    p.mp -= 5;
    fight.foe.hp = Math.max(0, fight.foe.hp - n);
    ui.battleLog.textContent = `久美の「蒼天突き」！\n${fight.foe.name}に ${n} ダメージ！${result.note}`;
    hit("foe", n, "#ffe074");
    afterAction(750);
  }
  function herb(target) {
    const p = fight.party[fight.actor],
      n = Math.min(35, target.maxHp - target.hp);
    fight.busy = true;
    s.items.herb--;
    target.hp += n;
    ui.battleLog.textContent = `${p.name}は薬草を使った。\n${target.name}のHPが ${n} 回復！`;
    beep("heal");
    numbers.push({
      text: `+${n}`,
      x: target.id === "hero" ? 145 : 240,
      y: 175,
      life: 1,
      color: "#8ff0a4",
    });
    afterAction(650);
  }
  function antidote(target) {
    const p = fight.party[fight.actor];
    fight.busy = true;
    s.items.antidote--;
    target.status = { poison: 0, sleep: 0, auraDown: 0 };
    ui.battleLog.textContent = `${p.name}は毒消し草を使った。\n${target.name}の状態異常が治った！`;
    beep("heal");
    afterAction(650);
  }
  function breadItem() {
    const p = fight.party[fight.actor];
    fight.busy = true;
    s.items.happyBread--;
    let total = 0;
    fight.party.forEach((target) => {
      if (target.hp <= 0) return;
      const n = Math.min(25, target.maxHp - target.hp);
      target.hp += n;
      total += n;
    });
    ui.battleLog.textContent = `${p.name}はハッピーブレッドを分け合った。\n味方全体のHPが回復！`;
    beep("heal");
    numbers.push({
      text: `+${total}`,
      x: 225,
      y: 160,
      life: 1,
      color: "#8ff0a4",
    });
    afterAction(700);
  }
  function warmHeal() {
    const p = fight.party[fight.actor],
      target = fight.party
        .filter((v) => v.hp > 0)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0],
      n = Math.min(48, target.maxHp - target.hp);
    fight.busy = true;
    p.mp -= 4;
    target.hp += n;
    ui.battleLog.textContent = `美玲の「焼きたてヒール」！\n${target.name}のHPが ${n} 回復！`;
    beep("heal");
    numbers.push({
      text: `+${n}`,
      x: target.id === "hero" ? 125 : target.id === "kumi" ? 220 : 315,
      y: 175,
      life: 1,
      color: "#a8f4aa",
    });
    afterAction(750);
  }
  function happyFeast() {
    const p = fight.party[fight.actor];
    fight.busy = true;
    p.mp -= 7;
    fight.party.forEach((target) => {
      if (target.hp <= 0) return;
      target.hp = Math.min(target.maxHp, target.hp + 30);
      target.status.poison = 0;
    });
    ui.battleLog.textContent =
      "美玲の「ハッピーブレッド」！\n味方全体のHPが回復し、毒が消えた！";
    beep("win");
    flash = 0.35;
    afterAction(850);
  }
  function smileCure() {
    const p = fight.party[fight.actor];
    fight.busy = true;
    p.mp -= 5;
    fight.party.forEach((target) => {
      target.status = { poison: 0, sleep: 0, auraDown: 0 };
      target.buff = Math.max(target.buff, 3);
    });
    ui.battleLog.textContent =
      "美玲の「みーぱんスマイル」！\n状態異常が消え、みんなに元気が戻った！";
    beep("win");
    afterAction(800);
  }
  function panFire() {
    const p = fight.party[fight.actor],
      result = elementDamage(p, 1.72, "fire"),
      n = result.value;
    fight.busy = true;
    p.mp -= 5;
    fight.foe.hp = Math.max(0, fight.foe.hp - n);
    ui.battleLog.textContent = `美玲の「聖火フライパン」！\n${fight.foe.name}に ${n} ダメージ！${result.note}`;
    hit("foe", n, "#ffae69");
    flash = 0.45;
    afterAction(780);
  }
  function guard() {
    const p = fight.party[fight.actor];
    fight.busy = true;
    p.guard = true;
    ui.battleLog.textContent = `${p.name}は身を守っている。`;
    afterAction(500);
  }
  function afterAction(ms = 600) {
    sync();
    battleUi();
    setTimeout(() => {
      if (!fight) return;
      if (fight.foe.hp <= 0) return victory();
      fight.actor++;
      actorTurn();
    }, ms);
  }
  function escapeBattle() {
    fight.busy = true;
    if (Math.random() < 0.75) {
      ui.battleLog.textContent = "うまく逃げ切った！";
      setTimeout(() => exitBattle(), 650);
    } else {
      ui.battleLog.textContent = "逃げられなかった！";
      setTimeout(enemyTurn, 650);
    }
  }
  function enemyMove() {
    const f = fight.foe;
    if (f.kind === "boss") {
      const z = fight.turn % 4;
      if (z === 2) return ["不安の霧", "debuff", 0];
      if (z === 3) return ["笑顔吸収", "drain", 1.05];
      if (z === 0) return ["暗黒のつぶやき", "all", 0.82];
      return ["ため息", "one", 1];
    }
    if (f.kind === "ovenBoss") {
      const z = fight.turn % 4;
      if (z === 2) return ["灰かぶり毒煙", "poison", 0.58];
      if (z === 3) return ["魔窯膨張", "prepare", 0];
      if (z === 0) return ["笑顔を焼く業火", "all", 1.28];
      return ["焦げつく炎", "one", 1.02];
    }
    if (f.kind === "bat" && fight.turn % 3 === 0)
      return ["眠たい羽音", "sleep", 0.65];
    if (f.kind === "strawling" && fight.turn % 3 === 0)
      return ["弱気なささやき", "auraDown", 0.72];
    if (f.kind === "ember" && fight.turn % 3 === 0)
      return ["すすの毒火", "poisonOne", 0.82];
    if (f.kind === "scarecrow" && fight.turn % 3 === 0)
      return ["まどろみの藁", "sleep", 0.72];
    return [
      f.kind === "slime"
        ? "しょんぼり泡"
        : f.kind === "hound"
          ? "不安の遠吠え"
          : f.kind === "strawling"
            ? "麦わらパンチ"
            : f.kind === "ember"
              ? "火の粉"
              : f.kind === "scarecrow"
                ? "からっぽの鎌"
                : "錆びた剣",
      "one",
      1,
    ];
  }
  function hurt(p, pow) {
    const n = Math.max(
      1,
      Math.floor(
        damage(fight.foe.atk, p.def, pow) *
          (fight.captain ? 0.58 : 1) *
          (p.guard ? 0.48 : 1) *
          (fight.foe.kind === "ovenBoss" && p.id === "mirei" && s.items.apron
            ? 0.72
            : 1),
      ),
    );
    p.hp = Math.max(0, p.hp - n);
    hit(p.id, n, "#ff9c9c");
    return n;
  }
  function inflict(target, type, turns) {
    if (!target || target.hp <= 0) return;
    target.status[type] = Math.max(target.status[type] || 0, turns);
  }
  function enemyTurn() {
    if (!fight) return;
    fight.busy = true;
    ui.commands.innerHTML = "";
    const alive = fight.party.filter((p) => p.hp > 0);
    if (!alive.length) return defeat();
    const [name, type, pow] = enemyMove(),
      targets =
        type === "all" || type === "poison"
          ? alive
          : [alive[Math.floor(Math.random() * alive.length)]];
    let log = `${fight.foe.name}の「${name}」！`;
    if (type === "prepare") {
      fight.warning = true;
      log += "\n魔窯が赤くふくらむ！　次のターンに強力な攻撃が来る！";
      flash = 0.5;
    } else if (type === "debuff") {
      fight.party.forEach((p) => inflict(p, "auraDown", 3));
      log += "\n不安の霧で味方のオーラが下がった！";
      flash = 0.3;
    } else if (type === "drain") {
      const n = hurt(targets[0], pow);
      fight.foe.hp = Math.min(fight.foe.maxHp, fight.foe.hp + Math.ceil(n / 2));
      log += `\n${targets[0].name}から笑顔を吸収！ ${n}ダメージ。`;
    } else if (type === "poison") {
      log +=
        "\n" +
        targets
          .map((p) => {
            const n = hurt(p, pow);
            inflict(p, "poison", 3);
            return `${p.name}に${n}ダメージ＋毒`;
          })
          .join("、") +
        "！";
    } else if (type === "poisonOne") {
      const n = hurt(targets[0], pow);
      inflict(targets[0], "poison", 3);
      log += `\n${targets[0].name}に ${n}ダメージ。毒に冒された！`;
    } else if (type === "sleep") {
      const n = hurt(targets[0], pow);
      inflict(targets[0], "sleep", 1);
      log += `\n${targets[0].name}に ${n}ダメージ。眠ってしまった！`;
    } else if (type === "auraDown") {
      const n = hurt(targets[0], pow);
      inflict(targets[0], "auraDown", 3);
      log += `\n${targets[0].name}に ${n}ダメージ。オーラが下がった！`;
    } else
      log +=
        "\n" +
        targets.map((p) => `${p.name}に ${hurt(p, pow)}ダメージ`).join("、") +
        "！";
    if (type === "all" && fight.warning) {
      fight.warning = false;
      log += "\n予告された大技だ！";
    }
    const poisonLog = [];
    fight.party.forEach((p) => {
      if (p.hp <= 0 || p.status.poison <= 0) return;
      const n = Math.min(p.hp, 6);
      p.hp -= n;
      p.status.poison--;
      poisonLog.push(`${p.name}は毒で${n}ダメージ`);
    });
    if (poisonLog.length) log += `\n${poisonLog.join("、")}。`;
    ui.battleLog.textContent = log;
    sync();
    battleUi();
    setTimeout(() => {
      if (!fight) return;
      if (!fight.party.some((p) => p.hp > 0)) return defeat();
      fight.turn++;
      fight.actor = 0;
      fight.captain = Math.max(0, fight.captain - 1);
      fight.party.forEach((p) => {
        p.guard = false;
        if (p.buff > 0) p.buff--;
        if (p.status.auraDown > 0) p.status.auraDown--;
      });
      actorTurn();
    }, 1000);
  }
  function victory() {
    const id = fight.src.id,
      f = fight.foe;
    s.defeated[id] = true;
    s.gold += f.gold;
    s.exp += f.exp;
    if (s.kills[f.kind] !== undefined) s.kills[f.kind]++;
    sync();
    let up = "";
    while (s.exp >= s.lv * 40) {
      s.exp -= s.lv * 40;
      s.lv++;
      s.maxHp += 9;
      s.maxMp += 3;
      s.atk += 3;
      s.def += 2;
      s.hp = heroMaxHp();
      s.mp = s.maxMp;
      up += `\n${s.name}はレベル${s.lv}になった！`;
    }
    ui.battleLog.textContent = `${f.name}を倒した！\n${f.exp}EXPと${f.gold}Gを獲得。${up}`;
    beep("win");
    flash = 0.5;
    battleUi();
    setTimeout(() => exitBattle(() => storyWin(id)), 1400);
  }
  function exitBattle(done) {
    fight = null;
    scene = "map";
    buildEnemies();
    setMode("map");
    hud();
    if (done) done();
  }
  function storyWin(id) {
    if (id === "tutorial") {
      s.flags.tutorial = true;
      toast("王都ソラシドへの道が開いた！");
      autosave();
    } else if (id === "raid") {
      s.flags.raidWon = true;
      s.flags.raid = false;
      s.flags.cave = true;
      dialogue(D.afterRaid, () => {
        s.x = 10;
        s.y = 1;
        s.dir = "up";
        scene = "map";
        setMode("map");
        hud();
        autosave();
        toast("久美がゲスト加入した！");
      });
    } else if (id === "boss") {
      s.flags.boss = true;
      s.flags.joined = true;
      s.flags.chapter1Clear = true;
      s.flags.kumi = false;
      s.flags.fragment = 1;
      s.flags.clear = true;
      dialogue(D.ending, () => {
        scene = "ending";
        showClear();
        autosave();
      });
    } else if (id === "ovenBoss") {
      s.flags.chapter2Boss = true;
      s.flags.chapter2Clear = true;
      s.flags.mireiGuest = false;
      s.flags.mireiJoined = true;
      s.flags.fragment = 2;
      s.flags.clear = true;
      s.quests.oven = "complete";
      dialogue(D.chapter2Ending, () => {
        scene = "ending";
        showClear();
        autosave();
      });
    } else {
      if (s.quests.straw === "active" && (s.kills.strawling || 0) >= 2)
        toast("依頼達成！　ミレリアのお願い掲示板へ戻ろう");
      autosave();
    }
  }
  function defeat() {
    ui.battleLog.textContent =
      "力尽きてしまった……。\n王都の騎士たちに助けられ、所持金が半分になった。";
    s.gold = Math.floor(s.gold / 2);
    s.hp = heroMaxHp();
    s.mp = s.maxMp;
    s.kumi.hp = s.kumi.maxHp;
    s.kumi.mp = s.kumi.maxMp;
    s.mirei.hp = s.mirei.maxHp;
    s.mirei.mp = s.mirei.maxMp;
    setTimeout(() => {
      fight = null;
      scene = "map";
      s.map = s.flags.chapter2 ? "milerea" : s.flags.metKumi ? "city" : "grass";
      s.x = s.map === "grass" ? 2 : 10;
      s.y = s.map === "grass" ? 5 : 9;
      buildEnemies();
      setMode("map");
      hud();
      autosave();
      fadeIn();
    }, 1700);
  }

  function openMenu(which = "status") {
    if (mode !== "map") return;
    tab = which;
    setMode("menu");
    ui.menu.querySelector("nav").classList.remove("hidden");
    menu();
  }
  function closeMenu() {
    if (mode !== "menu") return;
    ui.menu.querySelector("nav").classList.remove("hidden");
    setMode("map");
    hud();
    beep("no");
  }
  function menu() {
    ui.menu
      .querySelectorAll("[data-tab]")
      .forEach((b) => b.classList.toggle("selected", b.dataset.tab === tab));
    if (tab === "status") {
      const companions = [];
      if (s.flags.kumi || s.flags.joined)
        companions.push(
          `<div class="card"><strong>佐々木久美 Lv.3</strong><span>コマンダー / HP ${s.kumi.hp}/${s.kumi.maxHp}</span><small>風属性・全体強化</small></div>`,
        );
      if (s.flags.mireiGuest || s.flags.mireiJoined)
        companions.push(
          `<div class="card"><strong>${s.flags.mireiJoined ? "佐々木美玲" : "パン職人の少女"} Lv.4</strong><span>ヒーラー / HP ${s.mirei.hp}/${s.mirei.maxHp}</span><small>炎属性・回復・状態異常治療</small></div>`,
        );
      ui.menuBody.innerHTML = `<div class="cards"><div class="card"><strong>${s.name} Lv.${s.lv}</strong><span>オーラナイト</span></div><div class="card"><strong>HP ${s.hp}/${heroMaxHp()}</strong><span>MP ${s.mp}/${s.maxMp}</span></div><div class="card"><strong>攻撃 ${heroAtk()} / 守備 ${heroDef()}</strong><span>次のLvまで ${s.lv * 40 - s.exp}EXP</span></div><div class="card"><strong>${s.gold}G</strong><span>欠片 ${s.flags.fragment}/7</span></div>${companions.join("") || `<div class="card"><strong>仲間</strong><span>まだ誰もいない</span></div>`}</div>`;
    } else if (tab === "party") {
      const members = [
        {
          id: "kumi",
          name: "佐々木久美",
          role: "指揮・風属性",
          available: s.flags.kumi || s.flags.joined,
        },
        {
          id: "mirei",
          name: s.flags.mireiJoined ? "佐々木美玲" : "パン職人の少女",
          role: "回復・炎属性",
          available: s.flags.mireiGuest || s.flags.mireiJoined,
        },
      ].filter((m) => m.available);
      ui.menuBody.innerHTML = `<div class="party-head"><strong>前衛メンバー ${1 + members.filter((m) => s.active[m.id] !== false).length}/4</strong><span>主人公は固定。仲間はいつでも交代できます。</span></div><div class="list"><div class="item active-member"><div><strong>① ${s.name}</strong><span>オーラナイト / 固定</span></div><b>参加</b></div>${
        members
          .map(
            (m, i) =>
              `<div class="item ${s.active[m.id] !== false ? "active-member" : ""}"><div><strong>${i + 2} ${m.name}</strong><span>${m.role}</span></div><button data-party="${m.id}">${s.active[m.id] !== false ? "待機へ" : "参加"}</button></div>`,
          )
          .join("") ||
        `<div class="card"><strong>編成できる仲間はいません</strong><span>物語を進めると仲間が増えます。</span></div>`
      }</div>`;
      ui.menuBody.querySelectorAll("[data-party]").forEach(
        (b) =>
          (b.onclick = () => {
            s.active[b.dataset.party] = !(s.active[b.dataset.party] !== false);
            beep("save");
            autosave();
            menu();
          }),
      );
    } else if (tab === "quests") {
      const statusLabel = {
        available: "未受注",
        active: "進行中",
        complete: "達成済",
      };
      const rows = Object.entries(D.quests)
        .filter(([id]) => s.quests[id] !== "locked")
        .map(([id, quest]) => {
          let progress = quest.detail;
          if (id === "sunwheat" && s.quests[id] === "active")
            progress = `陽だまり麦 ${Math.min(3, s.items.sunwheat || 0)}/3`;
          if (id === "straw" && s.quests[id] === "active")
            progress = `くよくよ麦わら ${Math.min(2, s.kills.strawling || 0)}/2`;
          return `<div class="quest-card ${s.quests[id]}"><div><strong>${quest.title}</strong><em>${statusLabel[s.quests[id]]}</em></div><span>${progress}</span><small>報酬：${quest.reward}</small></div>`;
        });
      ui.menuBody.innerHTML = `<div class="list">${rows.join("") || `<div class="card"><strong>受注中のクエストはありません</strong><span>町の人や掲示板に話しかけてみましょう。</span></div>`}</div>`;
    } else if (tab === "items") {
      const canBread =
        s.hp < heroMaxHp() ||
        ((s.flags.kumi || s.flags.joined) && s.kumi.hp < s.kumi.maxHp) ||
        ((s.flags.mireiGuest || s.flags.mireiJoined) &&
          s.mirei.hp < s.mirei.maxHp);
      ui.menuBody.innerHTML = `<div class="list"><div class="item"><div><strong>薬草 ×${s.items.herb}</strong><span>主人公のHPを35回復</span></div><button id="use-herb"${!s.items.herb || s.hp >= heroMaxHp() ? " disabled" : ""}>使う</button></div><div class="item"><div><strong>毒消し草 ×${s.items.antidote}</strong><span>戦闘中の毒・眠り・オーラ低下を治す</span></div></div><div class="item"><div><strong>ハッピーブレッド ×${s.items.happyBread}</strong><span>仲間全員のHPを25回復</span></div><button id="use-bread"${!s.items.happyBread || !canBread ? " disabled" : ""}>分ける</button></div>${s.items.sunwheat ? `<div class="item"><div><strong>陽だまり麦 ×${s.items.sunwheat}</strong><span>太陽のぬくもりを宿す小麦</span></div></div>` : ""}<div class="item"><div><strong>ハッピーオーラの欠片 ×${s.flags.fragment}</strong><span>温かな虹色の光</span></div></div></div>`;
      $("use-herb")?.addEventListener("click", () => {
        s.items.herb--;
        s.hp = Math.min(heroMaxHp(), s.hp + 35);
        beep("heal");
        toast("薬草でHPが回復した");
        menu();
      });
      $("use-bread")?.addEventListener("click", () => {
        s.items.happyBread--;
        s.hp = Math.min(heroMaxHp(), s.hp + 25);
        s.kumi.hp = Math.min(s.kumi.maxHp, s.kumi.hp + 25);
        s.mirei.hp = Math.min(s.mirei.maxHp, s.mirei.hp + 25);
        beep("heal");
        toast("仲間みんなのHPが回復した");
        menu();
      });
    } else if (tab === "equip") {
      ui.menuBody.innerHTML = `<div class="list"><div class="item"><div><strong>主人公・武器：${s.equip.weapon === "sword" ? "青銅の剣" : "旅人の剣"}</strong><span>現在の攻撃力 ${heroAtk()}</span></div><button data-equip="sword"${!s.items.sword ? " disabled" : ""}>${s.equip.weapon === "sword" ? "外す" : "装備"}</button></div><div class="item"><div><strong>主人公・装飾：${s.equip.charm === "charm" ? "空色のお守り" : "なし"}</strong><span>現在の守備力 ${heroDef()}</span></div><button data-equip="charm"${!s.items.charm ? " disabled" : ""}>${s.equip.charm === "charm" ? "外す" : "装備"}</button></div>${s.items.apron ? `<div class="item active-member"><div><strong>美玲・防具：聖火のエプロン</strong><span>守備+4 / 魔窯の炎ダメージ軽減（自動装備）</span></div><b>装備中</b></div>` : ""}</div>`;
      ui.menuBody.querySelectorAll("[data-equip]").forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.equip,
              slot = id === "sword" ? "weapon" : "charm",
              before = heroMaxHp();
            s.equip[slot] = s.equip[slot] === id ? null : id;
            if (heroMaxHp() > before) s.hp += heroMaxHp() - before;
            s.hp = Math.min(s.hp, heroMaxHp());
            beep("save");
            menu();
          }),
      );
    } else if (tab === "save") {
      ui.menuBody.innerHTML = `<div class="list">${[1, 2, 3]
        .map((n) => {
          const v = read(n);
          return `<div class="slot ${v ? "" : "empty"}"><div><strong>冒険の書 ${n}</strong><span>${v ? `${v.name} Lv.${v.lv} / ${D.maps[v.map]?.name || "不明な場所"} / ${time(v.playTime || 0)}` : "記録はありません"}</span></div><button data-save="${n}">記録</button></div>`;
        })
        .join("")}</div>`;
      ui.menuBody.querySelectorAll("[data-save]").forEach(
        (b) =>
          (b.onclick = () => {
            save(+b.dataset.save);
            menu();
          }),
      );
    }
  }
  function loadSlots() {
    ui.loadSlots.innerHTML = ["auto", 1, 2, 3]
      .map((n) => {
        const v = read(n),
          label = n === "auto" ? "オートセーブ" : `冒険の書 ${n}`;
        return `<div class="slot ${v ? "" : "empty"}"><div><strong>${label}</strong><span>${v ? `${v.name} Lv.${v.lv} / ${D.maps[v.map]?.name || "不明な場所"} / ${time(v.playTime || 0)}` : "記録はありません"}</span></div><button data-load="${n}"${v ? "" : " disabled"}>ロード</button></div>`;
      })
      .join("");
    ui.loadSlots
      .querySelectorAll("[data-load]")
      .forEach((b) => (b.onclick = () => load(b.dataset.load)));
  }
  function showClear() {
    setMode("clear");
    const chapter2 = s.flags.chapter2Clear;
    ui.clearChapter.textContent = chapter2
      ? "CHAPTER 2 COMPLETE"
      : "CHAPTER 1 COMPLETE";
    ui.clearTitle.textContent = chapter2 ? "焼きたての聖女" : "空色の騎士団長";
    ui.clearMessage.textContent = chapter2
      ? "二つ目のハッピーオーラの欠片を手に入れた！"
      : "ハッピーオーラの欠片を手に入れた！";
    show(ui.clearNext, !chapter2);
    ui.clearInfo.textContent = `主人公 Lv.${s.lv}　戦闘 ${s.battles}回　${time(s.playTime + (Date.now() - s.started) / 1000)}`;
    beep("win");
  }
  function beginChapter2() {
    s.chapter = 2;
    s.flags.chapter1Clear = true;
    s.flags.chapter2 = true;
    s.flags.clear = false;
    s.hp = heroMaxHp();
    s.mp = s.maxMp;
    s.kumi.hp = s.kumi.maxHp;
    s.kumi.mp = s.kumi.maxMp;
    scene = "meadow";
    dialogue(D.chapter2Intro, () => {
      s.map = "world";
      s.x = 4;
      s.y = 5;
      s.dir = "right";
      scene = "map";
      buildEnemies();
      setMode("map");
      hud();
      autosave();
      fadeIn();
      toast("第二章　焼きたての聖女", 2600);
    });
  }
  function title() {
    fight = null;
    scene = "title";
    setMode("title");
    titleChoice = 0;
    titleButtons();
    fadeIn();
  }
  function titleButtons() {
    document
      .querySelectorAll("[data-title]")
      .forEach((b, i) => b.classList.toggle("selected", i === titleChoice));
  }

  function bind() {
    document.querySelectorAll("[data-title]").forEach((b, i) => {
      b.onmouseenter = () => {
        titleChoice = i;
        titleButtons();
      };
      b.onclick = () => {
        beep();
        if (b.dataset.title === "new") {
          setMode("name");
          setTimeout(() => ui.nameInput.focus(), 20);
        } else {
          loadSlots();
          setMode("load");
        }
      };
    });
    $("name-ok").onclick = newGame;
    $("name-back").onclick = () => setMode("title");
    $("menu-close").onclick = closeMenu;
    $("load-back").onclick = () => setMode("title");
    $("clear-save").onclick = () => save(1);
    $("clear-next").onclick = beginChapter2;
    $("clear-title").onclick = title;
    ui.dialog.onclick = advance;
    document.querySelectorAll("[data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.tab;
          beep();
          menu();
        }),
    );
    document.querySelectorAll("[data-dir]").forEach(
      (b) =>
        (b.onpointerdown = (e) => {
          e.preventDefault();
          move(b.dataset.dir);
        }),
    );
    $("touch-a").onpointerdown = (e) => {
      e.preventDefault();
      confirmKey();
    };
    $("touch-b").onpointerdown = (e) => {
      e.preventDefault();
      cancelKey();
    };
    $("touch-menu").onpointerdown = (e) => {
      e.preventDefault();
      openMenu();
    };
    addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "enter",
        ].includes(k)
      )
        e.preventDefault();
      keys.add(k);
      if (e.repeat) return;
      if (mode === "title") {
        if (["arrowup", "w", "arrowdown", "s"].includes(k)) {
          titleChoice = titleChoice ? 0 : 1;
          titleButtons();
          beep();
        } else if (["enter", "z", " "].includes(k))
          document
            .querySelector(`[data-title="${titleChoice ? "load" : "new"}"]`)
            .click();
        return;
      }
      if (mode === "battle") {
        if (["arrowup", "arrowleft", "w", "a"].includes(k)) focusBattle(-1);
        else if (["arrowdown", "arrowright", "s", "d"].includes(k))
          focusBattle(1);
        else if (["enter", "z", " "].includes(k)) {
          const list = [
            ...ui.commands.querySelectorAll("button:not(:disabled)"),
          ];
          list[fight?.commandChoice || 0]?.click();
        } else if (["escape", "x"].includes(k)) commands("root");
        return;
      }
      if (mode === "name" && k === "enter") newGame();
      else if (["enter", "z", " "].includes(k)) confirmKey();
      else if (["escape", "x", "m"].includes(k)) cancelKey();
      else if (mode === "map") {
        const d = keyDir(k);
        if (d) move(d);
      }
    });
    addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    addEventListener("blur", () => keys.clear());
  }
  function confirmKey() {
    if (mode === "dialog") advance();
    else if (mode === "map") interact();
  }
  function cancelKey() {
    if (mode === "map") openMenu();
    else if (mode === "menu") closeMenu();
    else if (mode === "load" || mode === "name") setMode("title");
  }
  function keyDir(k) {
    if (k === "arrowup" || k === "w") return "up";
    if (k === "arrowdown" || k === "s") return "down";
    if (k === "arrowleft" || k === "a") return "left";
    if (k === "arrowright" || k === "d") return "right";
  }

  function rect(x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function renderTitle(now) {
    rect(0, 0, W, 80, "#4fc4e5");
    rect(0, 80, W, 90, "#83dce8");
    rect(0, 170, W, 190, "#28654f");
    for (let i = 0; i < 25; i++)
      rect((i * 83) % W, 18 + ((i * 37) % 115), 3, 2, "#f5ffff");
    cloud(55, 52, 1);
    cloud(480, 38, 1.1);
    mountain(0, 130, 220, "#4b91a2");
    mountain(185, 120, 260, "#3c7f91");
    mountain(420, 135, 220, "#4a8998");
    rect(0, 280, W, 80, "#215345");
    castle(270, 130, 1);
    character("hero", 205, 248, "right", Math.floor(now / 600) % 2, 2);
    character("kumi", 372, 245, "left", Math.floor(now / 600) % 2, 2);
    for (let i = 0; i < 5; i++) {
      const a = now / 900 + i * 1.25;
      rect(
        320 + Math.cos(a) * (65 + i * 2),
        220 + Math.sin(a) * 18,
        4,
        4,
        ["#ff91a5", "#ffda6c", "#7ce3b4", "#73d8ef", "#c29ced"][i],
      );
    }
  }
  function cloud(x, y, s) {
    rect(x + 12 * s, y, 44 * s, 9 * s, "#efffff");
    rect(x, y + 8 * s, 75 * s, 11 * s, "#efffff");
    rect(x + 22 * s, y - 6 * s, 28 * s, 8 * s, "#efffff");
    rect(x + 6 * s, y + 19 * s, 58 * s, 4 * s, "#bce9ef");
  }
  function mountain(x, y, w, col) {
    for (let i = 0; i < 9; i++) {
      const q = w * (1 - i / 9);
      rect(x + (w - q) / 2, y + i * 13, q, 14, i % 2 ? col : "#65a5af");
    }
    rect(x + w * 0.45, y + 8, w * 0.1, 28, "#d8f3f1");
  }
  function castle(x, y, s) {
    rect(x + 14 * s, y + 20 * s, 76 * s, 100 * s, "#e5eeed");
    rect(x, y + 50 * s, 28 * s, 70 * s, "#c8dce0");
    rect(x + 76 * s, y + 50 * s, 28 * s, 70 * s, "#c8dce0");
    rect(x + 37 * s, y, 31 * s, 120 * s, "#f4f7f4");
    rect(x + 37 * s, y - 14 * s, 31 * s, 15 * s, "#2a87aa");
    rect(x + 47 * s, y + 78 * s, 13 * s, 42 * s, "#193c58");
    rect(x + 48 * s, y + 20 * s, 9 * s, 16 * s, "#4ca0b9");
    rect(x + 52 * s, y - 32 * s, 2 * s, 20 * s, "#f0cf6b");
    rect(x + 54 * s, y - 31 * s, 17 * s, 9 * s, "#57c8e5");
  }
  function cinematic(sc, now) {
    if (sc === "room" || sc === "glow") {
      rect(0, 0, W, H, "#11162a");
      rect(0, 230, W, 130, "#503a36");
      rect(42, 60, 150, 120, "#253052");
      rect(50, 68, 134, 103, "#3c80a4");
      castle(93, 94, 0.36);
      rect(230, 164, 262, 20, "#6a4a3c");
      rect(292, 108, 126, 72, "#07131f");
      rect(299, 115, 112, 58, sc === "glow" ? "#e5feff" : "#55b9d5");
      character("hero", 324, 193, "up", 0, 2.2);
      if (sc === "glow") {
        c.fillStyle = `rgba(195,248,255,${0.3 + (Math.sin(now / 180) + 1) * 0.18})`;
        c.fillRect(230, 58, 262, 220);
      }
    } else if (sc === "warp") {
      rect(0, 0, W, H, "#07142d");
      for (let i = 0; i < 55; i++) {
        const a = i * 0.71 + now / 850,
          r = ((i * 19 + now / 8) % 240) + 6;
        rect(
          W / 2 + Math.cos(a) * r,
          H / 2 + Math.sin(a) * r * 0.58,
          3 + (i % 3),
          3 + (i % 3),
          ["#70d8f2", "#f6d66f", "#b998ed"][i % 3],
        );
      }
      character("hero", 304, 150, "down", Math.floor(now / 200) % 2, 2);
    } else renderWorld(now);
  }
  function tile(type, x, y, wx, wy) {
    const z = D.TILE;
    if (type === z.GRASS || type === z.FLOWER) {
      rect(x, y, 32, 32, "#3b8f65");
      rect(x, y + 24, 32, 8, "#327a58");
      rect(x + 5 + ((wx * 7 + wy * 3) % 20), y + 8, 2, 5, "#75bb76");
      if (type === z.FLOWER) {
        rect(x + 8, y + 10, 3, 3, "#ffd86b");
        rect(x + 21, y + 19, 3, 3, "#f39aaa");
      }
    } else if (type === z.PATH) {
      rect(x, y, 32, 32, "#b9a471");
      rect(x, y + 25, 32, 7, "#aa9361");
      rect(x + ((wx * 7) % 22), y + ((wy * 9) % 21), 4, 2, "#d8c68e");
      rect(x + 21, y + 8, 3, 3, "#8d7954");
    } else if (type === z.TREE) {
      rect(x, y, 32, 32, "#214e46");
      rect(x + 13, y + 20, 7, 12, "#684f38");
      rect(x + 4, y + 3, 24, 20, "#286650");
      rect(x + 8, y, 14, 9, "#3b805a");
      rect(x + 2, y + 12, 9, 8, "#1c5647");
    } else if (type === z.WATER) {
      rect(x, y, 32, 32, "#2e89b2");
      rect(x, y + 8, 17, 3, "#68c5dc");
      rect(x + 12, y + 21, 20, 3, "#1e719d");
    } else if (type === z.BRIDGE) {
      rect(x, y, 32, 32, "#2d89b2");
      for (let i = 0; i < 4; i++)
        rect(x + i * 8, y + 1, 7, 30, i % 2 ? "#8f6744" : "#a8794e");
      rect(x, y + 5, 32, 2, "#4d382b");
      rect(x, y + 25, 32, 2, "#4d382b");
    } else if (type === z.FLOOR) {
      rect(x, y, 32, 32, "#d3c59d");
      rect(x, y + 30, 32, 2, "#9d8c68");
      rect(x + 15, y, 2, 32, "#b5a680");
    } else if (type === z.WALL) {
      rect(x, y, 32, 32, "#68757d");
      rect(x + 3, y + 4, 26, 25, "#879398");
      rect(x, y + 15, 32, 2, "#4c5963");
      rect(x + (wy % 2 ? 16 : 0), y, 2, 15, "#4c5963");
    } else if (type === z.STONE) {
      rect(x, y, 32, 32, "#263142");
      rect(x + 2, y + 3, 28, 26, "#354153");
      rect(x + 5, y + 6, 18, 4, "#48566a");
      rect(x, y + 28, 32, 4, "#171e2b");
    } else if (type === z.WHEAT) {
      rect(x, y, 32, 32, "#b88b37");
      rect(x, y + 27, 32, 5, "#8f6929");
      for (let i = 0; i < 4; i++) {
        const q = 4 + i * 8 + ((wy * 3) % 3);
        rect(x + q, y + 7, 2, 21, "#6f8a37");
        rect(x + q - 2, y + 7 + ((wx + i) % 4), 6, 8, "#edc85b");
      }
    } else if (type === z.SAND) {
      rect(x, y, 32, 32, "#d3b66c");
      rect(x, y + 27, 32, 5, "#b89a58");
      rect(x + ((wx * 11) % 24), y + ((wy * 7) % 24), 4, 2, "#ead08c");
    } else if (type === z.ROOF) {
      rect(x, y, 32, 32, "#b25843");
      rect(x, y + 8, 32, 4, "#803c36");
      rect(x, y + 22, 32, 4, "#803c36");
      rect(x + (wy % 2 ? 14 : 4), y, 3, 32, "#d87954");
    } else if (type === z.LAVA) {
      rect(x, y, 32, 32, "#7d2d24");
      rect(x, y + 6, 19, 5, "#f07835");
      rect(x + 11, y + 19, 21, 6, "#ffb341");
      rect(x + 4, y + 12, 7, 3, "#ffd66c");
    } else if (type === z.CAVE) {
      rect(x, y, 32, 32, "#53636b");
      rect(x + 2, y + 4, 28, 28, "#29333c");
      rect(x + 7, y + 9, 18, 23, "#070c13");
    } else if (type === z.CRYSTAL) {
      rect(x, y, 32, 32, "#273245");
      rect(x + 13, y + 3, 7, 20, "#79e6ec");
      rect(x + 9, y + 10, 5, 15, "#42a8c5");
      rect(x + 18, y + 12, 6, 13, "#bcf8f2");
      rect(x + 6, y + 25, 21, 5, "#17202e");
    } else {
      rect(x, y, 32, 32, "#1b2433");
    }
  }
  function renderWorld(now) {
    const m = D.maps[s.map];
    for (let y = 0; y < 11; y++)
      for (let x = 0; x < 20; x++) tile(m.tiles[y][x], x * T, y * T, x, y);
    m.chests
      .filter((h) => !s.opened[h.id])
      .forEach((h) => drawChest(h.x * T, h.y * T));
    m.npcs.forEach((n) => {
      if (n.type?.startsWith("world_"))
        worldLandmark(n.type, n.x * T, n.y * T, now);
      else
        character(n.type, n.x * T, n.y * T, "down", Math.floor(now / 650) % 2);
    });
    enemies.forEach((e) => monster(e.kind, e.x * T, e.y * T, now));
    character("hero", s.x * T, s.y * T, s.dir, walk % 2);
    const followers = [];
    if ((s.flags.kumi || s.flags.joined) && s.active.kumi !== false)
      followers.push("kumi");
    if ((s.flags.mireiGuest || s.flags.mireiJoined) && s.active.mirei !== false)
      followers.push("mirei");
    if (followers.length) {
      const [dx, dy] = delta(
          s.dir === "left"
            ? "right"
            : s.dir === "right"
              ? "left"
              : s.dir === "up"
                ? "down"
                : "up",
        ),
        x = s.x + dx,
        y = s.y + dy;
      if (canWalk(x, y)) character(followers[0], x * T, y * T, s.dir, walk % 2);
      if (followers[1]) {
        const sx = s.x + (dy || 1),
          sy = s.y + (dx || 0);
        if (sx >= 0 && sy >= 0 && sx < 20 && sy < 11)
          character(followers[1], sx * T, sy * T, s.dir, walk % 2);
      }
    }
  }
  function worldLandmark(type, x, y, now) {
    const bob = Math.floor(now / 500) % 2;
    if (type === "world_sora") {
      rect(x + 4, y + 10 - bob, 24, 20, "#e8f4f2");
      rect(x + 10, y + 2 - bob, 12, 28, "#f7fbf6");
      rect(x + 12, y + 17 - bob, 8, 13, "#24425d");
      rect(x + 9, y - bob, 14, 5, "#5bc9e6");
      rect(x + 14, y - 7 - bob, 2, 8, "#f0cf69");
    } else {
      rect(x + 2, y + 13 - bob, 28, 17, "#f3d081");
      rect(x + 5, y + 8 - bob, 22, 7, "#c87946");
      rect(x + 8, y + 3 - bob, 16, 7, "#f0a85b");
      rect(x + 12, y + 18 - bob, 8, 12, "#75482e");
      rect(x + 24, y + 4 - bob, 4, 15, "#e8ece2");
    }
  }
  function character(type, x, y, dir = "down", frame = 0, scale = 1) {
    const p = (a, b, w, h, col) =>
        rect(x + a * scale, y + b * scale, w * scale, h * scale, col),
      P = {
        hero: [
          "#2b2934",
          "#171722",
          "#f0c6a1",
          "#1e5f89",
          "#70d9ef",
          "#efd36d",
        ],
        kumi: [
          "#583b31",
          "#34241f",
          "#f1c7a5",
          "#e8f4f3",
          "#58bddf",
          "#e7c866",
        ],
        mirei: [
          "#704532",
          "#3f2922",
          "#f2c7a2",
          "#f4eee0",
          "#f0b85e",
          "#75d7df",
        ],
        guard: [
          "#4c4034",
          "#27231e",
          "#eabf9a",
          "#aab7c0",
          "#2f7397",
          "#e5c55d",
        ],
        elder: [
          "#d9dee1",
          "#a7b1b7",
          "#ddb28f",
          "#786b9a",
          "#a9d9d8",
          "#e5c55d",
        ],
        child: [
          "#49352e",
          "#2a211e",
          "#f0c5a2",
          "#f0d77f",
          "#61c8e3",
          "#f5f1cf",
        ],
        merchant: [
          "#996a3b",
          "#5d4028",
          "#eab98d",
          "#9b5b42",
          "#d8a85d",
          "#f2d67a",
        ],
        farmer: [
          "#8b693d",
          "#4d3928",
          "#eabd94",
          "#6e8f4b",
          "#e0bd53",
          "#f1e4a1",
        ],
        wisp: [
          "#c5f6f0",
          "#73dadd",
          "#e8ffff",
          "#5ba8ca",
          "#c7ffff",
          "#f5dc74",
        ],
      }[type] || [
        "#39323b",
        "#201d24",
        "#ecc39f",
        "#416e88",
        "#70d7e8",
        "#e4c85e",
      ],
      b = frame ? 1 : 0;
    if (type === "wisp") {
      p(11, 4 + b, 10, 6, P[4]);
      p(7, 9 + b, 18, 13, P[1]);
      p(10, 11 + b, 12, 9, P[2]);
      p(8, 22 + b, 16, 7, P[3]);
      p(12, 29 + b, 8, 3, P[4]);
      return;
    }
    p(9, 3 + b, 14, 8, P[0]);
    p(8, 8 + b, 16, 10, P[0]);
    p(10, 9 + b, 12, 10, P[2]);
    if (dir !== "up") {
      p(13, 12 + b, 2, 2, "#292332");
      p(18, 12 + b, 2, 2, "#292332");
      p(14, 16 + b, 5, 1, "#c77f75");
    } else p(10, 10 + b, 12, 9, P[1]);
    if (type === "kumi" || type === "mirei") {
      p(7, 8 + b, 4, 15, P[1]);
      p(21, 8 + b, 4, 15, P[1]);
    }
    p(8, 19 + b, 16, 8, P[3]);
    p(7, 21 + b, 4, 7, P[2]);
    p(21, 21 + b, 4, 7, P[2]);
    p(9, 20 + b, 14, 3, P[4]);
    p(10, 25 + b, 12, 2, P[5]);
    p(10 - (frame ? 1 : 0), 27 + b, 5, 5 - b, P[1]);
    p(17 + (frame ? 1 : 0), 27 + b, 5, 5 - b, P[1]);
    if (type === "hero") {
      p(23, 18 + b, 2, 11, "#d7e2e0");
      p(25, 17 + b, 2, 7, P[5]);
    }
    if (type === "kumi") {
      p(5, 12 + b, 2, 17, "#d9e7e7");
      p(4, 7 + b, 4, 6, P[5]);
    }
    if (type === "mirei") {
      p(24, 17 + b, 3, 12, "#6d4c34");
      p(25, 25 + b, 6, 3, "#a87042");
      p(5, 21 + b, 4, 7, "#f7d374");
    }
    if (type === "child") {
      p(8, 3 + b, 16, 4, P[4]);
      p(11, b, 10, 4, P[4]);
    }
  }
  function drawChest(x, y) {
    rect(x + 5, y + 10, 22, 17, "#6f4527");
    rect(x + 7, y + 6, 18, 8, "#b97831");
    rect(x + 5, y + 13, 22, 4, "#e1ae4e");
    rect(x + 14, y + 14, 5, 7, "#f5df78");
    rect(x + 7, y + 25, 18, 3, "#3b291f");
  }
  function monster(kind, x, y, now) {
    const b = Math.floor(now / 330) % 2;
    if (kind === "slime") {
      rect(x + 7, y + 13 - b, 18, 13, "#52bad4");
      rect(x + 10, y + 8 - b, 12, 8, "#6dd8e7");
      rect(x + 11, y + 16 - b, 3, 3, "#152638");
      rect(x + 19, y + 16 - b, 3, 3, "#152638");
      rect(x + 14, y + 22 - b, 5, 2, "#2a6073");
    } else if (kind === "bat") {
      rect(x + 12, y + 10 + b, 9, 13, "#735aa8");
      rect(x + 2, y + 8 + b, 11, 6, "#594584");
      rect(x + 20, y + 8 + b, 11, 6, "#594584");
      rect(x + 8, y + 5 + b, 5, 5, "#8e72bb");
      rect(x + 21, y + 5 + b, 5, 5, "#8e72bb");
      rect(x + 14, y + 13 + b, 2, 2, "#f08791");
      rect(x + 19, y + 13 + b, 2, 2, "#f08791");
    } else if (kind === "hound") {
      rect(x + 6, y + 13 + b, 20, 11, "#454c62");
      rect(x + 18, y + 8 + b, 10, 10, "#5a6178");
      rect(x + 19, y + 4 + b, 4, 6, "#3a4055");
      rect(x + 25, y + 5 + b, 4, 6, "#3a4055");
      rect(x + 24, y + 11 + b, 2, 2, "#f57a89");
      rect(x + 8, y + 23 + b, 4, 7, "#303747");
      rect(x + 21, y + 23 + b, 4, 7, "#303747");
    } else if (kind === "armor") {
      rect(x + 9, y + 5 + b, 15, 8, "#7c8b99");
      rect(x + 7, y + 12 + b, 19, 15, "#596977");
      rect(x + 11, y + 9 + b, 11, 2, "#1c2631");
      rect(x + 14, y + 9 + b, 3, 2, "#e76878");
      rect(x + 5, y + 16 + b, 4, 11, "#8998a1");
      rect(x + 24, y + 16 + b, 4, 11, "#8998a1");
    } else if (kind === "strawling") {
      rect(x + 7, y + 9 + b, 18, 18, "#c9973e");
      rect(x + 4, y + 6 + b, 24, 5, "#e8bf59");
      rect(x + 10, y + 3 + b, 12, 5, "#9a6f32");
      rect(x + 11, y + 14 + b, 3, 3, "#3d2d28");
      rect(x + 20, y + 14 + b, 3, 3, "#3d2d28");
      rect(x + 4, y + 25 + b, 8, 5, "#7c9a45");
      rect(x + 21, y + 25 + b, 8, 5, "#7c9a45");
    } else if (kind === "ember") {
      rect(x + 10, y + 12 - b, 14, 16, "#e55531");
      rect(x + 7, y + 7 - b, 8, 13, "#ff9b3d");
      rect(x + 18, y + 3 - b, 8, 17, "#ffd05c");
      rect(x + 12, y + 18 - b, 3, 3, "#3c2526");
      rect(x + 20, y + 18 - b, 3, 3, "#3c2526");
      rect(x + 13, y + 27, 10, 3, "#8b3029");
    } else if (kind === "scarecrow") {
      rect(x + 14, y + 3 + b, 4, 29, "#755033");
      rect(x + 5, y + 9 + b, 23, 4, "#755033");
      rect(x + 8, y + 5 + b, 18, 14, "#c69a4b");
      rect(x + 11, y + 10 + b, 3, 3, "#3f2c27");
      rect(x + 20, y + 10 + b, 3, 3, "#3f2c27");
      rect(x + 7, y + 20 + b, 20, 8, "#687d42");
    } else if (kind === "ovenBoss") {
      rect(x + 4, y + 8 + b, 25, 22, "#5d312c");
      rect(x + 8, y + 3 + b, 17, 7, "#8d4932");
      rect(x + 8, y + 18 + b, 17, 9, "#20171b");
      rect(x + 11, y + 20 + b, 11, 5, "#f16d32");
      rect(x + 8, y + 1 + b, 4, 6, "#d2a446");
      rect(x + 22, y + 1 + b, 4, 6, "#d2a446");
    } else {
      rect(x + 6, y + 7 + b, 20, 21, "#332648");
      rect(x + 10, y + 3 + b, 5, 7, "#553c6c");
      rect(x + 20, y + 3 + b, 5, 7, "#553c6c");
      rect(x + 11, y + 13 + b, 3, 3, "#f05b83");
      rect(x + 20, y + 13 + b, 3, 3, "#f05b83");
      rect(x + 14, y + 21 + b, 8, 3, "#110e1d");
    }
  }
  function portrait(type) {
    const p = ui.portrait.getContext("2d");
    p.imageSmoothingEnabled = false;
    const r = (x, y, w, h, col) => {
      p.fillStyle = col;
      p.fillRect(x, y, w, h);
    };
    r(
      0,
      0,
      84,
      84,
      type === "boss" ? "#271d3e" : type === "ovenBoss" ? "#582a24" : "#6fcbe1",
    );
    if (type === "boss") {
      r(12, 24, 60, 60, "#21192f");
      r(20, 8, 15, 23, "#624675");
      r(52, 8, 15, 23, "#624675");
      r(26, 38, 8, 7, "#fa6389");
      r(52, 38, 8, 7, "#fa6389");
      r(31, 59, 25, 7, "#090812");
      return;
    }
    if (type === "ovenBoss") {
      r(11, 19, 62, 65, "#5a302b");
      r(18, 7, 48, 18, "#8a4933");
      r(20, 49, 44, 25, "#1e1519");
      r(27, 55, 30, 13, "#f06b31");
      r(18, 2, 10, 13, "#e0ac49");
      r(56, 2, 10, 13, "#e0ac49");
      return;
    }
    if (type === "light" || type === "chest") {
      for (let i = 0; i < 7; i++)
        r(
          38 - i * 3,
          11 + i * 8,
          9 + i * 6,
          6,
          ["#ff9bac", "#ffdd74", "#86e7bd", "#7adcf2", "#c6a1f0"][i % 5],
        );
      r(35, 30, 14, 24, "#f8ffff");
      return;
    }
    const k = type === "kumi",
      m = type === "mirei",
      hair = k
        ? "#53382f"
        : m
          ? "#704532"
          : type === "guard"
            ? "#6d5a47"
            : type === "elder"
              ? "#d1d8dc"
              : type === "child"
                ? "#49352e"
                : type === "merchant"
                  ? "#9a693b"
                  : type === "farmer"
                    ? "#80603b"
                    : "#2c2933",
      dark = k
        ? "#34241f"
        : m
          ? "#3f2922"
          : type === "elder"
            ? "#9aa8ad"
            : "#1a1920",
      skin = type === "elder" ? "#ddb38e" : "#f0c7a5",
      cloth = k
        ? "#e7f4f3"
        : m
          ? "#f4eee0"
          : type === "guard"
            ? "#9fafba"
            : type === "child"
              ? "#f0d47b"
              : "#245f87",
      accent = k
        ? "#58bddf"
        : m
          ? "#f0b85e"
          : type === "child"
            ? "#60c9e3"
            : "#71d9ef";
    r(17, 9, 52, 29, hair);
    r(11, 26, 15, 43, dark);
    r(58, 25, 15, 45, dark);
    r(22, 24, 42, 39, skin);
    r(18, 15, 48, 14, hair);
    r(27, 38, 5, 5, "#2b2630");
    r(52, 38, 5, 5, "#2b2630");
    r(37, 53, 12, 3, "#c87872");
    r(17, 62, 51, 22, cloth);
    r(22, 64, 42, 7, accent);
    if (k || m) {
      r(14, 10, 10, 24, dark);
      r(61, 10, 10, 24, dark);
    }
    if (m) {
      r(61, 61, 17, 6, "#8b5d39");
      r(67, 51, 6, 18, "#62432e");
    }
  }
  function renderBattle(now) {
    const cave = s.map === "cave",
      oven = s.map === "oven",
      field = s.map === "wheatfield" || s.map === "milerea";
    rect(0, 0, W, H, cave || oven ? "#16182a" : "#72cada");
    if (cave || oven) {
      for (let y = 0; y < 230; y += 32)
        for (let x = 0; x < W; x += 48) {
          rect(
            x + ((y / 32) % 2) * 18,
            y,
            44,
            28,
            oven ? "#3d292c" : "#242d3d",
          );
          rect(
            x + 4 + ((y / 32) % 2) * 18,
            y + 4,
            36,
            4,
            oven ? "#6b3a30" : "#354153",
          );
        }
      rect(0, 228, W, 132, oven ? "#4a2a26" : "#262438");
      if (oven) {
        rect(0, 218, W, 8, "#e86632");
        for (let x = 0; x < W; x += 70)
          rect(x + ((now / 30) % 30), 209, 26, 8, "#ffb244");
      }
    } else {
      rect(0, 0, W, 120, "#70cce0");
      cloud(40, 45, 0.75);
      cloud(480, 28, 0.8);
      rect(0, 120, W, 110, field ? "#c49a45" : "#4b956d");
      rect(0, 220, W, 140, field ? "#9a7435" : "#3b795c");
      if (field)
        for (let x = 0; x < W; x += 24)
          rect(x, 145 + ((x / 24) % 2) * 8, 3, 76, "#efd064");
    }
    if (!fight) return;
    bigEnemy(fight.foe.kind, 470, 65, now);
    if (fight.party[0].hp > 0)
      character("hero", 95, 145, "right", Math.floor(now / 500) % 2, 2);
    const k = fight.party.find((v) => v.id === "kumi");
    if (k?.hp > 0)
      character("kumi", 195, 142, "right", Math.floor(now / 520) % 2, 2);
    const m = fight.party.find((v) => v.id === "mirei");
    if (m?.hp > 0)
      character("mirei", 295, 144, "right", Math.floor(now / 540) % 2, 2);
    if (fight.captain) {
      rect(75, 135, 310, 4, "#f5d86f");
      rect(84, 132, 292, 2, "#88e7f2");
    }
    if (fight.warning && Math.floor(now / 160) % 2) {
      rect(390, 47, 190, 4, "#ff7749");
      rect(410, 53, 150, 3, "#ffd167");
    }
    rect(375, 16, 225, 24, "#03152bd9");
    rect(382, 25, 212, 9, "#151827");
    rect(
      382,
      25,
      (212 * fight.foe.hp) / fight.foe.maxHp,
      9,
      fight.foe.boss ? "#b65a8b" : "#df6c73",
    );
    c.fillStyle = "#effcff";
    c.font = "bold 11px sans-serif";
    c.fillText(fight.foe.name, 384, 15);
    if (fight.foe.weak?.length) {
      c.fillStyle = "#ffe17d";
      c.font = "bold 9px sans-serif";
      const names = { light: "光", wind: "風", fire: "炎" };
      c.fillText(
        `弱点 ${fight.foe.weak.map((z) => names[z] || z).join("・")}`,
        486,
        15,
      );
    }
    for (const n of numbers) {
      c.globalAlpha = n.life;
      c.fillStyle = n.color;
      c.font = "bold 18px monospace";
      c.textAlign = "center";
      c.fillText(n.text, n.x, n.y);
      c.globalAlpha = 1;
    }
  }
  function bigEnemy(kind, x, y, now) {
    const b = Math.sin(now / 330) * 2;
    if (kind === "boss") {
      rect(x - 55, y - 18 + b, 110, 88, "#211a35");
      rect(x - 38, y - 46 + b, 76, 60, "#382651");
      rect(x - 31, y - 64 + b, 15, 25, "#68467a");
      rect(x + 23, y - 64 + b, 15, 25, "#68467a");
      rect(x - 24, y - 25 + b, 10, 9, "#fa6389");
      rect(x + 17, y - 25 + b, 10, 9, "#fa6389");
      rect(x - 15, y + b, 30, 8, "#0c0a16");
      rect(x - 78, y + 15 + b, 24, 64, "#171324");
      rect(x + 55, y + 15 + b, 24, 64, "#171324");
    } else if (kind === "ovenBoss") {
      rect(x - 68, y - 42 + b, 136, 116, "#4b2928");
      rect(x - 52, y - 68 + b, 104, 40, "#7d4132");
      rect(x - 55, y - 78 + b, 24, 24, "#d6a546");
      rect(x + 31, y - 78 + b, 24, 24, "#d6a546");
      rect(x - 44, y + 3 + b, 88, 51, "#1c1519");
      rect(x - 32, y + 13 + b, 64, 30, "#f06532");
      rect(x - 21, y + 18 + b, 42, 16, "#ffbd4c");
      rect(x - 78, y + 32 + b, 17, 52, "#6e372d");
      rect(x + 61, y + 32 + b, 17, 52, "#6e372d");
    } else if (kind === "strawling") {
      rect(x - 42, y - 19 + b, 84, 78, "#c8963d");
      rect(x - 57, y - 31 + b, 114, 18, "#e9bf56");
      rect(x - 31, y - 49 + b, 62, 19, "#92672e");
      rect(x - 25, y + b, 10, 10, "#382a25");
      rect(x + 17, y + b, 10, 10, "#382a25");
      rect(x - 53, y + 50 + b, 28, 24, "#728b42");
      rect(x + 25, y + 50 + b, 28, 24, "#728b42");
    } else if (kind === "ember") {
      rect(x - 42, y - 7 + b, 84, 82, "#d94c2e");
      rect(x - 58, y - 35 + b, 38, 67, "#ff9137");
      rect(x - 3, y - 62 + b, 42, 91, "#ffd05a");
      rect(x - 19, y + 14 + b, 10, 10, "#3b2425");
      rect(x + 17, y + 14 + b, 10, 10, "#3b2425");
    } else if (kind === "scarecrow") {
      rect(x - 9, y - 67 + b, 18, 145, "#715033");
      rect(x - 78, y - 39 + b, 156, 17, "#715033");
      rect(x - 48, y - 61 + b, 96, 72, "#c69a49");
      rect(x - 28, y - 39 + b, 10, 10, "#392a25");
      rect(x + 20, y - 39 + b, 10, 10, "#392a25");
      rect(x - 55, y + 10 + b, 110, 55, "#647941");
    } else if (kind === "hound") {
      rect(x - 62, y + 15 + b, 92, 40, "#454c62");
      rect(x + 12, y - 5 + b, 45, 42, "#5c647b");
      rect(x + 18, y - 24 + b, 15, 22, "#353b51");
      rect(x + 45, y - 22 + b, 15, 23, "#353b51");
      rect(x + 38, y + 7 + b, 7, 7, "#fb6d82");
      rect(x - 50, y + 50 + b, 15, 36, "#303747");
      rect(x + 5, y + 50 + b, 15, 36, "#303747");
    } else if (kind === "armor") {
      rect(x - 28, y - 35 + b, 58, 33, "#7b8d9b");
      rect(x - 40, y - 8 + b, 80, 67, "#586a79");
      rect(x - 18, y - 17 + b, 39, 8, "#17222d");
      rect(x - 6, y - 16 + b, 9, 7, "#ef6478");
      rect(x - 62, y + 6 + b, 22, 61, "#83939e");
      rect(x + 40, y + 6 + b, 22, 61, "#83939e");
    } else if (kind === "bat") {
      rect(x - 15, y + b, 40, 50, "#7258a9");
      rect(x - 75, y - 8 + b, 60, 28, "#554180");
      rect(x + 25, y - 8 + b, 60, 28, "#554180");
      rect(x - 48, y - 25 + b, 20, 21, "#8d72bb");
      rect(x + 45, y - 25 + b, 20, 21, "#8d72bb");
      rect(x - 2, y + 12 + b, 7, 7, "#f07b91");
      rect(x + 17, y + 12 + b, 7, 7, "#f07b91");
    } else {
      rect(x - 40, y + b, 78, 60, "#54bfd6");
      rect(x - 20, y - 25 + b, 44, 40, "#70dae8");
      rect(x - 9, y + 12 + b, 9, 9, "#152739");
      rect(x + 20, y + 12 + b, 9, 9, "#152739");
      rect(x + 2, y + 38 + b, 17, 6, "#2b6475");
      rect(x - 50, y + 55 + b, 96, 8, "#327b8f");
    }
  }
  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;
    if (mode === "map") {
      const held = [
        "arrowup",
        "w",
        "arrowdown",
        "s",
        "arrowleft",
        "a",
        "arrowright",
        "d",
      ].find((k) => keys.has(k));
      if (held && now - lastMove > 145) {
        const d = keyDir(held);
        if (d) move(d);
        lastMove = now;
      }
    }
    numbers = numbers
      .map((n) => ({ ...n, life: n.life - dt / 850, y: n.y - dt * 0.026 }))
      .filter((n) => n.life > 0);
    shake = Math.max(0, shake - dt * 0.04);
    flash = Math.max(0, flash - dt / 480);
    if (fadeDir) {
      fade += (fadeDir * dt) / 430;
      if (fadeDir > 0 && fade >= 1) {
        fade = 1;
        const cb = fadeCb;
        fadeCb = null;
        if (cb) cb();
        fadeDir = -1;
      } else if (fadeDir < 0 && fade <= 0) {
        fade = 0;
        fadeDir = 0;
      }
    }
    c.save();
    if (shake)
      c.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    if (mode === "title" || scene === "title") renderTitle(now);
    else if (["room", "glow", "warp", "meadow", "ending"].includes(scene))
      cinematic(scene, now);
    else if (mode === "battle" || scene === "battle") renderBattle(now);
    else renderWorld(now);
    c.restore();
    if (flash) {
      c.fillStyle = `rgba(235,253,255,${Math.min(0.75, flash)})`;
      c.fillRect(0, 0, W, H);
    }
    if (fade) {
      c.fillStyle = `rgba(2,7,17,${fade})`;
      c.fillRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }
  window.__HQ0_TEST__ = {
    state: () => JSON.parse(JSON.stringify(s)),
    settle() {
      const cb = fadeCb;
      fade = 0;
      fadeDir = 0;
      fadeCb = null;
      if (cb) cb();
      fade = 0;
      fadeDir = 0;
    },
    step(x) {
      if (x === "city") {
        s.flags.tutorial = true;
        s.map = "city";
        s.x = 10;
        s.y = 4;
      } else if (x === "raid") {
        s.flags.tutorial = true;
        s.flags.metKumi = true;
        s.flags.raid = true;
        s.flags.kumi = true;
        s.map = "grass";
        s.x = 15;
        s.y = 5;
      } else if (x === "cave") {
        s.flags.tutorial = true;
        s.flags.metKumi = true;
        s.flags.raidWon = true;
        s.flags.kumi = true;
        s.flags.cave = true;
        s.map = "cave";
        s.x = 10;
        s.y = 9;
      } else if (x === "boss") {
        s.flags.tutorial = true;
        s.flags.metKumi = true;
        s.flags.raidWon = true;
        s.flags.kumi = true;
        s.flags.cave = true;
        s.map = "cave";
        s.x = 10;
        s.y = 2;
        s.lv = 4;
        s.maxHp = 93;
        s.maxMp = 27;
        s.atk = 22;
        s.def = 13;
        s.hp = heroMaxHp();
        s.mp = s.maxMp;
      } else if (x === "chapter2") {
        s.flags.tutorial = true;
        s.flags.metKumi = true;
        s.flags.raidWon = true;
        s.flags.cave = true;
        s.flags.boss = true;
        s.flags.joined = true;
        s.flags.chapter1Clear = true;
        s.flags.chapter2 = true;
        s.flags.clear = false;
        s.flags.fragment = 1;
        s.chapter = 2;
        s.map = "world";
        s.x = 4;
        s.y = 5;
      } else if (x === "milerea") {
        s.flags.boss = true;
        s.flags.joined = true;
        s.flags.chapter1Clear = true;
        s.flags.chapter2 = true;
        s.flags.clear = false;
        s.flags.fragment = 1;
        s.chapter = 2;
        s.map = "milerea";
        s.x = 10;
        s.y = 4;
      } else if (x === "field") {
        s.flags.boss = true;
        s.flags.joined = true;
        s.flags.chapter1Clear = true;
        s.flags.chapter2 = true;
        s.flags.metMirei = true;
        s.quests.sunwheat = "active";
        s.map = "wheatfield";
        s.x = 6;
        s.y = 3;
      } else if (x === "bake") {
        s.flags.boss = true;
        s.flags.joined = true;
        s.flags.chapter1Clear = true;
        s.flags.chapter2 = true;
        s.flags.metMirei = true;
        s.items.sunwheat = 3;
        s.quests.sunwheat = "active";
        s.map = "milerea";
        s.x = 10;
        s.y = 4;
      } else if (x === "oven") {
        s.flags.boss = true;
        s.flags.joined = true;
        s.flags.chapter1Clear = true;
        s.flags.chapter2 = true;
        s.flags.metMirei = true;
        s.flags.mireiGuest = true;
        s.flags.ovenOpen = true;
        s.quests.sunwheat = "complete";
        s.quests.oven = "active";
        s.map = "oven";
        s.x = 10;
        s.y = 9;
      } else if (x === "ovenBoss") {
        s.flags.boss = true;
        s.flags.joined = true;
        s.flags.chapter1Clear = true;
        s.flags.chapter2 = true;
        s.flags.metMirei = true;
        s.flags.mireiGuest = true;
        s.flags.ovenOpen = true;
        s.quests.sunwheat = "complete";
        s.quests.oven = "active";
        s.map = "oven";
        s.x = 10;
        s.y = 2;
        s.lv = 7;
        s.maxHp = 126;
        s.maxMp = 36;
        s.atk = 31;
        s.def = 19;
        s.hp = heroMaxHp();
        s.mp = s.maxMp;
        s.kumi.hp = s.kumi.maxHp;
        s.kumi.mp = s.kumi.maxMp;
        s.mirei.hp = s.mirei.maxHp;
        s.mirei.mp = s.mirei.maxMp;
      }
      fade = 0;
      fadeDir = 0;
      scene = "map";
      buildEnemies();
      setMode("map");
      hud();
    },
  };
  buildEnemies();
  bind();
  setMode("title");
  titleButtons();
  requestAnimationFrame(frame);
})();
