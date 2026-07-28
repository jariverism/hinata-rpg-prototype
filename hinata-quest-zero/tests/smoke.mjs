import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { createState, normalizeState } from "../src/state.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function canvasContext() {
  const noop = () => {};
  return new Proxy(
    {
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (text) => ({ width: String(text).length * 8 }),
      beginPath: noop,
      ellipse: noop,
      arc: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      scale: noop,
      moveTo: noop,
      lineTo: noop,
      fillRect: noop,
      clearRect: noop,
      fillText: noop,
    },
    {
      get(target, property) {
        if (property in target) return target[property];
        return noop;
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    },
  );
}

async function createGame() {
  const window = new Window({ url: "http://localhost/hinata-quest-zero/" });
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  window.document.write(html);
  window.document.close();
  window.HTMLCanvasElement.prototype.getContext = () => canvasContext();
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  const module = await import(
    `${pathToFileURL(path.join(root, "src/game.js")).href}?test=${Date.now()}-${Math.random()}`
  );
  const game = new module.HinatiaGame();
  game.testFast = true;
  return { window, document: window.document, game };
}

function visible(element) {
  return !element.classList.contains("hidden");
}

function drainDialogue(game, document, limit = 30) {
  let count = 0;
  while (game.mode === "dialogue" && count < limit) {
    const choice = document.querySelector("#dialogue-choices button");
    if (choice) choice.click();
    else game.advanceDialogue();
    count += 1;
  }
  assert.ok(count < limit, "会話が有限回で終了する");
}

function clickCommand(document, label) {
  const button = [...document.querySelectorAll("#battle-commands button")].find(
    (candidate) => candidate.textContent.trim().startsWith(label),
  );
  assert.ok(button, `戦闘コマンド「${label}」が存在する`);
  assert.equal(button.disabled, false, `戦闘コマンド「${label}」が使える`);
  button.click();
}

test("刷新した専用画像アセットとタッチUIがリリース構成に揃っている", () => {
  const expectedImages = [
    ["assets/art/title-hinatia.png", 640, 360],
    ["assets/art/party-sprites.png", 512, 192],
    ["assets/art/npc-sprites.png", 512, 832],
    ["assets/art/enemy-atlas.png", 1536, 960],
    ["assets/art/portraits/hero.png", 192, 192],
    ["assets/art/portraits/kumi.png", 192, 192],
    ["assets/art/portraits/mirei.png", 192, 192],
    ["assets/art/portraits/sarina.png", 192, 192],
    ["assets/art/portraits/katoshi.png", 192, 192],
    ["assets/art/portraits/manaka.png", 192, 192],
    ["assets/art/cutins/hero.png", 1280, 144],
    ["assets/art/cutins/kumi.png", 1280, 144],
    ["assets/art/cutins/mirei.png", 1280, 144],
    ["assets/art/cutins/sarina.png", 1280, 144],
    ["assets/art/cutins/katoshi.png", 1280, 144],
    ["assets/art/cutins/manaka.png", 1280, 144],
  ];
  for (const [relative, width, height] of expectedImages) {
    const image = fs.readFileSync(path.join(root, relative));
    assert.equal(image.subarray(1, 4).toString(), "PNG", `${relative}はPNG`);
    assert.equal(image.readUInt32BE(16), width, `${relative}の幅`);
    assert.equal(image.readUInt32BE(20), height, `${relative}の高さ`);
  }
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(html, /id="touch-controls"/);
  assert.match(html, /STARCODE UPDATE/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /\.title-menu\s*\{[\s\S]*position: absolute/);
});

test("奥義は専用カットインを起動し、戦闘描画へ重ねられる", async () => {
  const { game } = await createGame();
  game.state.happy = 100;
  game.startBattle(["softSlime"], { canEscape: true });
  const hero = game.state.party.hero;
  game.executeSkill(hero, {
    type: "skill",
    id: "promiseAura",
    targetType: "allEnemies",
  });
  assert.equal(game.battle.cutIn.actorId, "hero");
  assert.equal(game.battle.cutIn.skillName, "約束のハッピーオーラ");
  game.triggerSkillCutIn(
    { id: "kumi", name: "久美" },
    { name: "鉄壁のフォーメーション" },
    "formation",
  );
  assert.equal(game.battle.cutIn.actorId, "kumi");
  assert.doesNotThrow(() => game.renderBattleCanvas(performance.now()));
});

test("全マップが一画面より広く、主要地点へ到達可能で、地形が使い回しではない", async () => {
  const { MAPS, PASSABLE } = await import(
    `${pathToFileURL(path.join(root, "src/data.js")).href}?maps=1`
  );
  const signatures = new Set();
  for (const map of Object.values(MAPS)) {
    assert.ok(map.width > 20 || map.height > 11, `${map.name}はスクロールマップ`);
    const [sx, sy] = map.start;
    const queue = [[sx, sy]];
    const seen = new Set([`${sx},${sy}`]);
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < map.width &&
          ny < map.height &&
          !seen.has(key) &&
          PASSABLE.has(map.tiles[ny][nx])
        ) {
          seen.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    const relevant = [...map.warps, ...map.npcs, ...map.chests, ...map.specials].filter(
      (entry) => !["hiddenWall", "bridgeGate"].includes(entry.type),
    );
    for (const point of relevant) {
      const adjacent = [
        [point.x, point.y],
        [point.x + 1, point.y],
        [point.x - 1, point.y],
        [point.x, point.y + 1],
        [point.x, point.y - 1],
      ].some(([x, y]) => seen.has(`${x},${y}`));
      assert.ok(adjacent, `${map.name}の${point.id || point.label}へ到達できる`);
    }
    signatures.add(
      map.tiles
        .map((row) => row.map((tile) => (PASSABLE.has(tile) ? "1" : "0")).join(""))
        .join(""),
    );
  }
  assert.equal(signatures.size, Object.keys(MAPS).length, "各マップの通行形状が固有");
});

test("通常戦闘は敵グループの対象を選べて、コマンドだけで終了する", async () => {
  const { game, document } = await createGame();
  game.state.flags.prologueSeen = true;
  game.setMode("map");
  game.startBattle(["softSlime", "softSlime"], { canEscape: true });
  assert.equal(game.battle.enemies.length, 2);
  clickCommand(document, "たたかう");
  assert.equal(
    document.querySelectorAll("[data-target-enemy]").length,
    2,
    "敵グループから対象を選べる",
  );
  document.querySelector("[data-target-enemy]").click();
  let rounds = 0;
  while (game.mode === "battle" && rounds < 20) {
    const attack = [...document.querySelectorAll("#battle-commands button")].find(
      (button) => button.textContent.trim().startsWith("たたかう"),
    );
    if (attack) {
      attack.click();
      document.querySelector("[data-target-enemy]")?.click();
    }
    rounds += 1;
  }
  assert.ok(rounds < 20, "通常戦闘が終了する");
  assert.equal(game.mode, "map");
  assert.equal(game.state.victories, 1);
  assert.ok(game.state.gold > 42);
});

test("想定到達レベルと市販装備で、第一章ボスを複数の対策から攻略できる", async () => {
  const { game } = await createGame();
  const hero = game.state.party.hero;
  const kumi = game.state.party.kumi;
  Object.assign(hero, {
    level: 4,
    hp: 84,
    maxHp: 84,
    mp: 28,
    maxMp: 28,
    atk: 21,
    def: 13,
    mag: 16,
    spd: 15,
  });
  hero.equipment = {
    weapon: "copperSword",
    shield: "blueBuckler",
    body: "travelCoat",
    accessory: "windRing",
  };
  Object.assign(kumi, {
    level: 3,
    hp: 95,
    maxHp: 95,
    mp: 31,
    maxMp: 31,
    atk: 22,
    def: 16,
    spd: 13,
  });
  game.state.party.order = ["hero", "kumi"];
  game.state.inventory.herb = 7;
  game.state.inventory.auraDrop = 2;
  game.state.inventory.brightBell = 1;
  game.state.flags.kumiJoined = true;
  game.state.flags.prologueSeen = true;
  game.setMode("map");
  game.startBattle(["smileEater", "anxietyShade", "anxietyShade"], {
    canEscape: false,
  });
  let decisions = 0;
  while (game.mode === "battle" && decisions < 80) {
    const actor = game.currentBattleActor();
    if (!actor) break;
    const target =
      game.battle.enemies.find((enemy) => enemy.kind === "anxietyShade" && enemy.hp > 0) ||
      game.battle.enemies.find((enemy) => enemy.hp > 0);
    if (actor.hp < 32 && game.state.inventory.herb > 0) {
      game.commitPlan({ type: "item", id: "herb", target: actor.id, targetType: "ally" });
    } else if (
      actor.id === "hero" &&
      game.battle.telegraph === "sigh" &&
      game.state.inventory.brightBell > 0
    ) {
      game.commitPlan({ type: "item", id: "brightBell", targetType: "allAllies" });
    } else if (actor.id === "hero" && game.state.happy >= 100) {
      game.commitPlan({ type: "skill", id: "promiseAura", targetType: "allEnemies" });
    } else if (actor.id === "hero" && actor.mp >= 4) {
      game.commitPlan({
        type: "skill",
        id: "auraBlade",
        target: target.id,
        targetType: "enemy",
      });
    } else if (
      actor.id === "kumi" &&
      (game.battle.round === 1 || game.battle.barrierBrokenRounds <= 0) &&
      actor.mp >= 5
    ) {
      game.commitPlan({ type: "skill", id: "captainCall", targetType: "allAllies" });
    } else if (actor.id === "kumi" && actor.mp >= 5) {
      game.commitPlan({
        type: "skill",
        id: "skyThrust",
        target: target.id,
        targetType: "enemy",
      });
    } else {
      game.commitPlan({ type: "attack", target: target.id, targetType: "enemy" });
    }
    decisions += 1;
  }
  assert.ok(decisions < 80, "ボス戦が有限ターンで終了する");
  assert.notEqual(game.mode, "gameover", "準備と対策をすれば全滅しない");
  assert.equal(game.state.victories, 1, "笑顔喰らいに勝利できる");
});

test("タイトルから第一章終了、加入、三層洞窟、セーブ・ロードまで通る", async () => {
  const { game, document, window } = await createGame();
  assert.equal(visible(document.querySelector("#title-screen")), true);
  document.querySelector('[data-title="new"]').click();
  assert.equal(game.mode, "setup");
  document.querySelector("#name-input").value = "テスト";
  document.querySelector("#setup-start").click();
  drainDialogue(game, document);
  assert.equal(game.mode, "map");
  assert.equal(game.state.name, "テスト");
  assert.equal(game.state.map, "highroad");
  assert.equal(document.querySelector("#field-hud").textContent.includes("NEXT"), false);

  game.teleport?.("solaido");
  window.__HQ0_TEST__.teleport("solaido", 19, 10);
  window.__HQ0_TEST__.talk("kumi");
  drainDialogue(game, document);
  assert.equal(game.state.flags.metKumi, true);
  assert.equal(game.state.rumors.cave, true);

  const exit = game.currentMap().warps.find((warp) => warp.to === "highroad");
  game.useWarp(exit);
  drainDialogue(game, document);
  assert.equal(game.state.map, "highroad");
  assert.equal(game.state.flags.raidReady, true);
  const raid = game.mapEnemies.find((enemy) => enemy.story === "raid");
  assert.ok(raid, "街道に襲撃ボスが出現する");
  game.startSymbolBattle(raid);
  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.kumiJoined, true);
  assert.equal(game.state.flags.skySigil, true);
  assert.deepEqual(game.state.party.order, ["hero", "kumi"]);

  window.__HQ0_TEST__.teleport("cave1", 31, 5);
  const sealedWarp = game.currentMap().warps.find((warp) => warp.to === "cave2");
  game.useWarp(sealedWarp);
  assert.equal(game.state.map, "cave2");
  window.__HQ0_TEST__.special("water-lever");
  drainDialogue(game, document);
  assert.equal(game.state.flags.waterLever, true);
  window.__HQ0_TEST__.special("rope-anchor");
  drainDialogue(game, document);
  assert.equal(game.state.flags.caveRope, true);

  window.__HQ0_TEST__.teleport("cave3", 24, 7);
  window.__HQ0_TEST__.special("chapter-boss");
  drainDialogue(game, document);
  assert.equal(game.mode, "battle");
  assert.equal(game.battle.enemies.length, 3);
  assert.equal(game.battle.barrier, true);
  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.bossWon, true);
  assert.equal(game.state.flags.chapter1Clear, true);
  assert.equal(game.mode, "clear");

  game.showSavePicker("clear");
  document.querySelector('[data-save-slot="1"]').click();
  assert.ok(window.localStorage.getItem("hq0-v5-save-1"));
  game.goTitle();
  game.openLoadScreen("title");
  document.querySelector('[data-load-slot="1"]').click();
  assert.equal(game.mode, "clear");
  assert.equal(game.state.name, "テスト");
  assert.equal(game.state.flags.chapter1Clear, true);
});

test("シンボルは発見時に一手止まり、足踏みでき、正面接触は不意打ちにならない", async () => {
  const { game } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.map = "highroad";
  game.state.x = 28;
  game.state.y = 30;
  game.state.dir = "up";
  game.buildMapEnemies();
  game.setMode("map");
  const symbol = game.mapEnemies.find((enemy) => enemy.id === "plain-01");
  assert.ok(symbol);
  const start = [symbol.x, symbol.y];

  game.waitTurn();
  assert.deepEqual([symbol.x, symbol.y], start, "初回発見は警戒表示だけで移動しない");
  assert.equal(symbol.alert, 2);
  game.waitTurn();
  assert.equal(symbol.y, start[1] + 1, "次の手番から追跡する");
  game.waitTurn();
  game.waitTurn();
  assert.equal(game.mode, "battle");
  assert.equal(game.battle.options.ambush, false, "正面からの接触は通常戦闘");
});

test("成長曲線、消耗品、ゲージ持越しを第一章向けに抑えている", async () => {
  const { expNext } = await import(
    `${pathToFileURL(path.join(root, "src/state.js")).href}?balance=1`
  );
  assert.equal(expNext(1), 45, "レベル2までに複数戦必要");
  assert.equal(expNext(3), 297, "レベル4は任意探索なしでは届きにくい");

  const { game } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.happy = 95;
  game.setMode("map");
  game.startBattle(["softSlime"], { canEscape: true });
  game.battle.enemies[0].hp = 0;
  game.finishVictory();
  assert.equal(game.state.happy, 80, "通常戦闘後のゲージ持越しには上限がある");

  game.state.inventory.brightBell = 1;
  game.startBattle(["anxietyShade"], { canEscape: true });
  game.executeBattleItem(game.state.party.hero, {
    type: "item",
    id: "brightBell",
    targetType: "allAllies",
  });
  assert.equal(game.state.inventory.brightBell, 0, "光鳴りの鈴は一度使うとなくなる");
});

test("ハッピーゲージは攻撃・防御・被ダメージ・弱点・ターン経過で蓄積し、必殺技を解禁する", async () => {
  const { game, document } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.party.order = ["hero", "kumi"];
  game.state.flags.kumiJoined = true;
  game.setMode("map");
  game.startBattle(["softSlime"], { canEscape: true });
  const hero = game.state.party.hero;
  const enemy = game.battle.enemies[0];

  game.setHappy(0);
  game.executePartyAction(hero, { type: "attack", target: enemy.id });
  assert.equal(game.state.happy, 5, "通常攻撃で5蓄積する");
  game.executePartyAction(hero, { type: "guard" });
  assert.equal(game.state.happy, 13, "防御でも蓄積する");
  game.hurtParty(hero, 10, "physical");
  assert.ok(game.state.happy >= 14, "攻撃を耐えた時にも蓄積する");
  const beforeRound = game.state.happy;
  game.finishRound();
  assert.ok(game.state.happy >= beforeRound + 2, "ターン経過で最低2蓄積する");

  game.setHappy(99);
  game.gainHappy(5, "test");
  assert.equal(game.state.happy, 100, "ゲージは100で止まる");
  game.renderBattleUi();
  game.renderBattleCommands();
  const finisher = [...document.querySelectorAll("#battle-commands button")].find(
    (button) => button.textContent.includes("必殺技"),
  );
  assert.ok(finisher);
  assert.equal(finisher.disabled, false, "100到達時に必殺技が選べる");
  assert.equal(document.querySelector("#happy-fill").classList.contains("ready"), true);

  const drained = game.drainHappy(12, "test");
  assert.equal(drained, 12);
  assert.equal(game.state.happy, 88, "吸収後も蓄積値が正しく残る");

  const invalid = createState("ゲージ試験");
  invalid.happy = Number.NaN;
  assert.equal(normalizeState(invalid).happy, 0, "壊れた旧セーブ値は0へ正規化する");
});

test("第一章のフィールドから地続きで第二章へ進み、能力と所持品を引き継ぐ", async () => {
  const { game, document, window } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.flags.chapter1Clear = true;
  game.state.flags.postClear = true;
  game.state.flags.kumiJoined = true;
  game.state.party.order = ["hero", "kumi"];
  game.state.party.hero.level = 4;
  game.state.party.hero.exp = 320;
  game.state.party.hero.atk = 24;
  game.state.gold = 237;
  game.state.inventory.herb = 5;
  game.state.map = "highroad";
  game.state.x = 2;
  game.state.y = 18;
  game.buildMapEnemies();
  game.setMode("map");

  const west = game.currentMap().warps.find(
    (warp) => warp.to === "mireRoad" && warp.y === 18,
  );
  game.useWarp(west);
  assert.equal(game.state.map, "mireRoad", "西端からロードを挟まず街道へ接続");
  assert.equal(game.state.party.hero.level, 4);
  assert.equal(game.state.party.hero.exp, 320);
  assert.equal(game.state.party.hero.atk, 24);
  assert.equal(game.state.gold, 237);
  assert.equal(game.state.inventory.herb, 5);
  assert.equal(game.state.quests.chapter2, "active");

  window.__HQ0_TEST__.teleport("mileria", 20, 10);
  window.__HQ0_TEST__.talk("mirei");
  drainDialogue(game, document);
  assert.equal(game.state.flags.metMirei, true);
  assert.equal(game.state.quests.miracleBread, "active");

  game.state.flags.scarecrowWon = true;
  window.__HQ0_TEST__.teleport("mireRoad", 12, 9);
  window.__HQ0_TEST__.special("golden-wheat");
  drainDialogue(game, document);
  window.__HQ0_TEST__.teleport("sunmill", 6, 19);
  window.__HQ0_TEST__.special("spring-water");
  drainDialogue(game, document);
  window.__HQ0_TEST__.special("sun-yeast");
  drainDialogue(game, document);
  assert.equal(game.state.inventory.goldenWheat, 1);
  assert.equal(game.state.inventory.springWater, 1);
  assert.equal(game.state.inventory.sunYeast, 1);

  window.__HQ0_TEST__.teleport("mileria", 21, 9);
  window.__HQ0_TEST__.special("bakery-oven");
  drainDialogue(game, document);
  assert.equal(game.state.flags.mireiJoined, true);
  assert.equal(game.state.flags.granaryOpen, true);
  assert.deepEqual(game.state.party.order, ["hero", "kumi", "mirei"]);
  assert.equal(game.state.party.hero.level, 4, "加入後も主人公のレベルを維持");
  assert.equal(game.state.quests.miracleBread, "complete");

  window.__HQ0_TEST__.teleport("granary2", 28, 8);
  window.__HQ0_TEST__.special("chapter2-boss");
  drainDialogue(game, document);
  assert.equal(game.mode, "battle");
  assert.deepEqual(
    game.battle.enemies.map((enemy) => enemy.kind),
    ["blightHeart", "dryRoot", "dryRoot"],
  );
  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.chapter2Clear, true);
  assert.equal(game.state.quests.chapter2, "complete");
  assert.equal(game.mode, "clear");
  assert.equal(document.querySelector("#clear-heading").textContent, "枯れた麦畑と奇跡のパン");
  const clearedLevel = game.state.party.hero.level;

  game.showSavePicker("clear");
  document.querySelector('[data-save-slot="2"]').click();
  game.goTitle();
  game.openLoadScreen("title");
  document.querySelector('[data-load-slot="2"]').click();
  assert.equal(game.mode, "clear");
  assert.equal(game.state.flags.chapter2Clear, true);
  assert.equal(game.state.party.hero.level, clearedLevel);
  assert.deepEqual(game.state.party.order, ["hero", "kumi", "mirei"]);
});

test("第一章公開版のv5セーブに第二章データを補い、育成値は変えない", () => {
  const oldSave = createState("空色ファン");
  oldSave.party.hero.level = 5;
  oldSave.party.hero.exp = 612;
  oldSave.party.hero.atk = 28;
  oldSave.party.kumi.level = 4;
  oldSave.party.order = ["hero", "kumi"];
  delete oldSave.party.mirei;
  delete oldSave.party.sarina;
  delete oldSave.party.katoshi;
  oldSave.gold = 345;
  oldSave.inventory.herb = 7;
  delete oldSave.inventory.happyBread;
  oldSave.flags.chapter1Clear = true;
  delete oldSave.flags.chapter2Started;
  delete oldSave.flags.mireiJoined;
  delete oldSave.flags.chapter4Started;
  delete oldSave.flags.katoshiJoined;
  delete oldSave.quests.chapter2;
  delete oldSave.quests.chapter4;
  delete oldSave.rumors.mirelia;
  delete oldSave.rumors.katoshia;

  const restored = normalizeState(JSON.parse(JSON.stringify(oldSave)));
  assert.equal(restored.name, "空色ファン");
  assert.equal(restored.party.hero.level, 5);
  assert.equal(restored.party.hero.exp, 612);
  assert.equal(restored.party.hero.atk, 28);
  assert.equal(restored.party.kumi.level, 4);
  assert.deepEqual(restored.party.order, ["hero", "kumi"]);
  assert.equal(restored.gold, 345);
  assert.equal(restored.inventory.herb, 7);
  assert.equal(restored.inventory.happyBread, 0);
  assert.equal(restored.flags.chapter1Clear, true);
  assert.equal(restored.flags.chapter2Started, false);
  assert.equal(restored.quests.chapter2, "locked");
  assert.equal(restored.rumors.mirelia, false);
  assert.equal(restored.party.mirei.name, "美玲");
  assert.equal(restored.party.sarina.name, "紗理菜");
  assert.equal(restored.party.katoshi.name, "史帆");
  assert.equal(restored.flags.chapter4Started, false);
  assert.equal(restored.flags.katoshiJoined, false);
  assert.equal(restored.quests.chapter4, "locked");
  assert.equal(restored.rumors.katoshia, false);
});

test("美玲の回復と炎スキルを使えば第二章ボスを攻略できる", async () => {
  const { game } = await createGame();
  const hero = game.state.party.hero;
  const kumi = game.state.party.kumi;
  const mirei = game.state.party.mirei;
  Object.assign(hero, { level: 5, hp: 94, maxHp: 94, mp: 31, maxMp: 31, atk: 25, def: 15, mag: 18, spd: 17 });
  Object.assign(kumi, { level: 4, hp: 104, maxHp: 104, mp: 34, maxMp: 34, atk: 25, def: 19, spd: 14 });
  Object.assign(mirei, { level: 4, hp: 78, maxHp: 78, mp: 42, maxMp: 42, atk: 14, def: 12, mag: 24, spd: 11 });
  game.state.party.order = ["hero", "kumi", "mirei"];
  game.state.flags.prologueSeen = true;
  game.state.flags.mireiJoined = true;
  game.state.flags.breadChoice = "crisp";
  game.state.inventory.happyBread = 3;
  game.setMode("map");
  game.startBattle(["blightHeart", "dryRoot", "dryRoot"], { canEscape: false });

  let decisions = 0;
  while (game.mode === "battle" && decisions < 120) {
    const actor = game.currentBattleActor();
    if (!actor) break;
    const wounded = game.state.party.order
      .map((id) => game.state.party[id])
      .filter((member) => member.hp > 0)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const target =
      game.battle.enemies.find((enemy) => enemy.kind === "dryRoot" && enemy.hp > 0) ||
      game.battle.enemies.find((enemy) => enemy.hp > 0);
    const telegraph = game.battle.telegraph === "rotBurst";
    if (actor.id === "mirei" && wounded.hp / wounded.maxHp < 0.48 && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "bakedHeal", target: wounded.id, targetType: "ally" });
    } else if (actor.id === "mirei" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "panSmash", target: target.id, targetType: "enemy" });
    } else if (telegraph) {
      game.commitPlan({ type: "guard" });
    } else if (actor.id === "hero" && actor.mp >= 3) {
      game.commitPlan({ type: "skill", id: "auraBlade", target: target.id, targetType: "enemy" });
    } else if (actor.id === "kumi" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "skyThrust", target: target.id, targetType: "enemy" });
    } else {
      game.commitPlan({ type: "attack", target: target.id, targetType: "enemy" });
    }
    decisions += 1;
  }
  assert.ok(decisions < 120, "第二章ボス戦が有限ターンで終了する");
  assert.notEqual(game.mode, "gameover", "役割を使い分ければ全滅しない");
  assert.equal(game.state.victories, 1);
});

test("第二章フィールドから第三章へ進み、三響・紗理菜加入・神域・章終了まで通る", async () => {
  const { game, document, window } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.flags.chapter1Clear = true;
  game.state.flags.chapter2Started = true;
  game.state.flags.chapter2Clear = true;
  game.state.flags.chapter2BossWon = true;
  game.state.flags.kumiJoined = true;
  game.state.flags.mireiJoined = true;
  game.state.flags.postClear = true;
  game.state.party.order = ["hero", "kumi", "mirei"];
  game.state.party.hero.level = 6;
  game.state.party.hero.exp = 890;
  game.state.party.hero.atk = 30;
  game.state.gold = 512;
  game.state.inventory.herb = 6;
  game.state.inventory.happyBread = 3;
  game.state.map = "mireRoad";
  game.state.x = 24;
  game.state.y = 31;
  game.buildMapEnemies();
  game.setMode("map");

  const south = game.currentMap().warps.find(
    (warp) => warp.to === "spiritPass" && warp.x === 24,
  );
  game.useWarp(south);
  assert.equal(game.state.map, "spiritPass");
  assert.equal(game.state.party.hero.level, 6);
  assert.equal(game.state.party.hero.exp, 890);
  assert.equal(game.state.party.hero.atk, 30);
  assert.equal(game.state.gold, 512);
  assert.equal(game.state.inventory.herb, 6);
  assert.equal(game.state.inventory.happyBread, 3);
  assert.equal(game.state.quests.chapter3, "active");

  window.__HQ0_TEST__.teleport("sarinaria", 22, 10);
  window.__HQ0_TEST__.talk("sarina");
  drainDialogue(game, document);
  assert.equal(game.state.flags.metSarina, true);
  assert.equal(game.state.quests.threeChimes, "active");

  for (const [story, enemy, special, item] of [
    ["windTrial", "gustGuardian", "wind-chime", "windChime"],
    ["waterTrial", "rippleGuardian", "water-chime", "waterChime"],
    ["lightTrial", "prismGuardian", "light-chime", "lightChime"],
  ]) {
    game.startBattle([enemy], { story, canEscape: false });
    window.__HQ0_TEST__.winBattle();
    drainDialogue(game, document);
    window.__HQ0_TEST__.special(special);
    drainDialogue(game, document);
    assert.equal(game.state.inventory[item], 1);
  }

  window.__HQ0_TEST__.teleport("sarinaria", 22, 10);
  window.__HQ0_TEST__.talk("sarina");
  drainDialogue(game, document);
  assert.equal(game.state.flags.sarinaJoined, true);
  assert.equal(game.state.flags.spiritTongue, true);
  assert.deepEqual(game.state.party.order, ["hero", "kumi", "mirei", "sarina"]);

  window.__HQ0_TEST__.teleport("spiritSanctum", 29, 8);
  window.__HQ0_TEST__.special("resonance-gate");
  const correct = [...document.querySelectorAll("#dialogue-choices button")].find(
    (button) => button.textContent.includes("水 → 風 → 光"),
  );
  assert.ok(correct, "精霊会話から導く共鳴順を選択できる");
  correct.click();
  drainDialogue(game, document);
  assert.equal(game.state.flags.spiritGateOpen, true);

  window.__HQ0_TEST__.teleport("spiritHeart", 27, 7);
  window.__HQ0_TEST__.special("chapter3-boss");
  drainDialogue(game, document);
  assert.equal(game.mode, "battle");
  assert.deepEqual(
    game.battle.enemies.map((enemy) => enemy.kind),
    ["hushAvatar", "muteTotem", "muteTotem"],
  );
  assert.equal(game.battle.resonance, "fire");
  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.chapter3Clear, true);
  assert.equal(game.state.quests.chapter3, "complete");
  assert.equal(game.mode, "clear");
  assert.equal(document.querySelector("#clear-heading").textContent, "虹鈴の精霊巫女");

  game.showSavePicker("clear");
  document.querySelector('[data-save-slot="3"]').click();
  game.goTitle();
  game.openLoadScreen("title");
  document.querySelector('[data-load-slot="3"]').click();
  assert.equal(game.mode, "clear");
  assert.equal(game.state.flags.chapter3Clear, true);
  assert.deepEqual(game.state.party.order, ["hero", "kumi", "mirei", "sarina"]);
});

test("四人の属性・回復・防御役割を使えば第三章ボスを攻略できる", async () => {
  const { game } = await createGame();
  const hero = game.state.party.hero;
  const kumi = game.state.party.kumi;
  const mirei = game.state.party.mirei;
  const sarina = game.state.party.sarina;
  Object.assign(hero, { level: 7, hp: 108, maxHp: 108, mp: 40, maxMp: 40, atk: 34, def: 19, mag: 23, spd: 20 });
  Object.assign(kumi, { level: 6, hp: 122, maxHp: 122, mp: 44, maxMp: 44, atk: 32, def: 24, mag: 12, spd: 17 });
  Object.assign(mirei, { level: 6, hp: 92, maxHp: 92, mp: 58, maxMp: 58, atk: 18, def: 16, mag: 32, spd: 14 });
  Object.assign(sarina, { level: 6, hp: 90, maxHp: 90, mp: 66, maxMp: 66, atk: 14, def: 17, mag: 36, spd: 19 });
  game.state.party.order = ["hero", "kumi", "mirei", "sarina"];
  game.state.flags.prologueSeen = true;
  game.state.flags.sarinaJoined = true;
  game.state.inventory.spiritNectar = 3;
  game.state.inventory.happyBread = 3;
  game.state.happy = 30;
  game.setMode("map");
  game.startBattle(["hushAvatar", "muteTotem", "muteTotem"], {
    story: "chapter3Boss",
    canEscape: false,
  });

  let decisions = 0;
  while (game.mode === "battle" && decisions < 180) {
    const actor = game.currentBattleActor();
    if (!actor) break;
    const alive = game.state.party.order
      .map((id) => game.state.party[id])
      .filter((member) => member.hp > 0);
    const wounded = alive.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const target =
      game.battle.enemies.find((enemy) => enemy.kind === "muteTotem" && enemy.hp > 0) ||
      game.battle.enemies.find((enemy) => enemy.hp > 0);
    const telegraph = game.battle.telegraph === "silenceNova";
    if (actor.id === "sarina" && wounded.hp / wounded.maxHp < 0.58 && actor.mp >= 5) {
      game.commitPlan({ type: "skill", id: "sacredBell", targetType: "allAllies" });
    } else if (actor.id === "sarina" && !alive.every((member) => member.status.spiritWard) && actor.mp >= 6) {
      game.commitPlan({ type: "skill", id: "spiritWard", targetType: "allAllies" });
    } else if (actor.id === "sarina" && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "rainbowPrayer", target: target.id, targetType: "enemy" });
    } else if (actor.id === "mirei" && wounded.hp / wounded.maxHp < 0.48 && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "bakedHeal", target: wounded.id, targetType: "ally" });
    } else if (actor.id === "mirei" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "panSmash", target: target.id, targetType: "enemy" });
    } else if (actor.id === "kumi" && telegraph && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "formation", targetType: "allAllies" });
    } else if (telegraph) {
      game.commitPlan({ type: "guard" });
    } else if (actor.id === "kumi" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "skyThrust", target: target.id, targetType: "enemy" });
    } else if (actor.id === "hero" && actor.mp >= 3) {
      game.commitPlan({ type: "skill", id: "auraBlade", target: target.id, targetType: "enemy" });
    } else {
      game.commitPlan({ type: "attack", target: target.id, targetType: "enemy" });
    }
    decisions += 1;
  }
  assert.ok(decisions < 180, "第三章ボス戦が有限ターンで終了する");
  assert.notEqual(game.mode, "gameover", "属性・防御・回復を使えば全滅しない");
  assert.equal(game.state.victories, 1);
});

test("第三章の峠から第四章へ地続きで進み、自由順の大会・控え編成・二経路の塔・章終了まで通る", async () => {
  const { game, document, window } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.flags.chapter1Clear = true;
  game.state.flags.chapter2Started = true;
  game.state.flags.chapter2Clear = true;
  game.state.flags.chapter3Started = true;
  game.state.flags.chapter3Clear = true;
  game.state.flags.chapter3BossWon = true;
  game.state.flags.kumiJoined = true;
  game.state.flags.mireiJoined = true;
  game.state.flags.sarinaJoined = true;
  game.state.flags.postClear = true;
  game.state.party.order = ["hero", "kumi", "mirei", "sarina"];
  game.state.party.hero.level = 8;
  game.state.party.hero.exp = 1536;
  game.state.party.hero.atk = 38;
  game.state.gold = 744;
  game.state.inventory.herb = 7;
  game.state.inventory.spiritNectar = 2;
  game.state.map = "spiritPass";
  game.state.x = 36;
  game.state.y = 30;
  game.buildMapEnemies();
  game.setMode("map");

  const southeast = game.currentMap().warps.find(
    (warp) => warp.to === "windRoad" && warp.x === 36,
  );
  game.useWarp(southeast);
  assert.equal(game.state.map, "windRoad", "第三章の峠から天翔け街道へ接続する");
  assert.equal(game.state.party.hero.level, 8);
  assert.equal(game.state.party.hero.exp, 1536);
  assert.equal(game.state.party.hero.atk, 38);
  assert.equal(game.state.gold, 744);
  assert.equal(game.state.inventory.herb, 7);
  assert.equal(game.state.quests.chapter4, "active");

  window.__HQ0_TEST__.teleport("katoshia", 23, 10);
  window.__HQ0_TEST__.talk("katoshi");
  drainDialogue(game, document);
  assert.equal(game.state.flags.metKatoshi, true);
  assert.equal(game.state.quests.skyTournament, "active");

  // 魔法→守り→速さの順で挑み、予選が固定順ではないことを確認する。
  for (const [story, enemy, flag, crest] of [
    ["arenaEcho", "arenaMage", "arenaEchoWon", "echoCrest"],
    ["arenaStone", "arenaBulwark", "arenaStoneWon", "stoneCrest"],
    ["arenaSwift", "arenaRaptor", "arenaSwiftWon", "swiftCrest"],
  ]) {
    game.startBattle([enemy], { story, canEscape: false });
    window.__HQ0_TEST__.winBattle();
    drainDialogue(game, document);
    assert.equal(game.state.flags[flag], true);
    assert.equal(game.state.inventory[crest], 1);
  }

  window.__HQ0_TEST__.teleport("skyArena", 22, 15);
  window.__HQ0_TEST__.special("arena-final");
  drainDialogue(game, document);
  assert.equal(game.mode, "battle");
  assert.equal(game.battle.enemies[0].kind, "katoshiDuel");
  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.katoshiJoined, true);
  assert.equal(game.state.flags.towerOpen, true);
  assert.deepEqual(game.state.party.order, ["hero", "kumi", "mirei", "katoshi"]);
  assert.equal(game.state.inventory.stormSigil, 1);

  game.openMenu("party");
  document.querySelector('[data-party-toggle="mirei"]').click();
  document.querySelector('[data-party-toggle="sarina"]').click();
  assert.deepEqual(
    game.state.party.order,
    ["hero", "kumi", "katoshi", "sarina"],
    "加入後は町やフィールドで控えメンバーと交代できる",
  );
  game.closeMenu();

  window.__HQ0_TEST__.teleport("windTower1", 10, 8);
  window.__HQ0_TEST__.special("north-vane");
  drainDialogue(game, document);
  const upper = game.currentMap().warps.find((warp) => warp.to === "windTower2");
  game.useWarp(upper);
  drainDialogue(game, document);
  assert.equal(game.state.map, "windTower1", "片方の風向計だけでは上層へ進めない");
  window.__HQ0_TEST__.special("south-vane");
  drainDialogue(game, document);
  game.useWarp(upper);
  assert.equal(game.state.map, "windTower2", "二経路の風向計を揃えると上層へ進める");

  window.__HQ0_TEST__.special("chapter4-boss");
  drainDialogue(game, document);
  assert.equal(game.mode, "battle");
  assert.deepEqual(
    game.battle.enemies.map((enemy) => enemy.kind),
    ["tempestMirror", "stormEye", "stormEye"],
  );
  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.chapter4Clear, true);
  assert.equal(game.state.quests.chapter4, "complete");
  assert.equal(game.mode, "clear");
  assert.equal(document.querySelector("#clear-heading").textContent, "疾風の剣士と蒼天の塔");

  game.showSavePicker("clear");
  document.querySelector('[data-save-slot="1"]').click();
  game.goTitle();
  game.openLoadScreen("title");
  document.querySelector('[data-load-slot="1"]').click();
  assert.equal(game.mode, "clear");
  assert.equal(game.state.flags.chapter4Clear, true);
  assert.equal(game.state.party.katoshi.name, "史帆");
  assert.deepEqual(game.state.party.order, ["hero", "kumi", "katoshi", "sarina"]);
});

test("史帆の構え崩しと予告阻止、回復・防御・弱点攻撃を使えば第四章ボスを攻略できる", async () => {
  const { game } = await createGame();
  const hero = game.state.party.hero;
  const kumi = game.state.party.kumi;
  const sarina = game.state.party.sarina;
  const katoshi = game.state.party.katoshi;
  Object.assign(hero, { level: 8, hp: 122, maxHp: 122, mp: 48, maxMp: 48, atk: 39, def: 22, mag: 27, spd: 23 });
  Object.assign(kumi, { level: 8, hp: 144, maxHp: 144, mp: 52, maxMp: 52, atk: 37, def: 29, mag: 15, spd: 19 });
  Object.assign(sarina, { level: 8, hp: 108, maxHp: 108, mp: 82, maxMp: 82, atk: 18, def: 21, mag: 43, spd: 23 });
  Object.assign(katoshi, { level: 8, hp: 108, maxHp: 108, mp: 70, maxMp: 70, atk: 36, def: 20, mag: 22, spd: 38 });
  game.state.party.order = ["hero", "kumi", "sarina", "katoshi"];
  game.state.flags.prologueSeen = true;
  game.state.flags.katoshiJoined = true;
  game.state.inventory.spiritNectar = 4;
  game.state.inventory.galeTonic = 5;
  game.state.inventory.happyBread = 4;
  game.state.happy = 30;
  game.setMode("map");
  game.startBattle(["tempestMirror", "stormEye", "stormEye"], {
    story: "chapter4Boss",
    canEscape: false,
  });

  const mirror = game.battle.enemies.find((enemy) => enemy.kind === "tempestMirror");
  mirror.status.counter = 2;
  game.battle.telegraph = "stormDive";
  game.executeSkill(katoshi, {
    type: "skill",
    id: "katoshiCombo",
    target: mirror.id,
    targetType: "enemy",
  });
  assert.equal(game.battle.telegraph, null, "コンビネーションが天落としの予告を中断する");
  assert.equal(mirror.status.counter, 0, "史帆の連携剣が反撃の構えを崩す");

  let decisions = 0;
  while (game.mode === "battle" && decisions < 240) {
    const actor = game.currentBattleActor();
    if (!actor) break;
    const alive = game.state.party.order
      .map((id) => game.state.party[id])
      .filter((member) => member.hp > 0);
    const wounded = [...alive].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const target =
      game.battle.enemies.find((enemy) => enemy.kind === "stormEye" && enemy.hp > 0) ||
      game.battle.enemies.find((enemy) => enemy.hp > 0);
    const telegraph = game.battle.telegraph === "stormDive";
    if (actor.id === "sarina" && wounded.hp / wounded.maxHp < 0.58 && actor.mp >= 5) {
      game.commitPlan({ type: "skill", id: "sacredBell", targetType: "allAllies" });
    } else if (actor.id === "sarina" && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "rainbowPrayer", target: target.id, targetType: "enemy" });
    } else if (actor.id === "katoshi" && telegraph && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "katoshiCombo", target: mirror.id, targetType: "enemy" });
    } else if (actor.id === "katoshi" && actor.mp >= 11 && game.battle.enemies.filter((enemy) => enemy.hp > 0).length > 1) {
      game.commitPlan({ type: "skill", id: "skyDance", targetType: "allEnemies" });
    } else if (actor.id === "katoshi" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "henyoSlash", target: target.id, targetType: "enemy" });
    } else if (actor.id === "kumi" && telegraph && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "formation", targetType: "allAllies" });
    } else if (telegraph) {
      game.commitPlan({ type: "guard" });
    } else if (actor.id === "kumi" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "skyThrust", target: target.id, targetType: "enemy" });
    } else if (actor.id === "hero" && actor.mp >= 3) {
      game.commitPlan({ type: "skill", id: "auraBlade", target: target.id, targetType: "enemy" });
    } else if (game.state.inventory.galeTonic > 0 && wounded.hp / wounded.maxHp < 0.48) {
      game.commitPlan({ type: "item", id: "galeTonic", target: wounded.id, targetType: "ally" });
    } else {
      game.commitPlan({ type: "attack", target: target.id, targetType: "enemy" });
    }
    decisions += 1;
  }
  assert.ok(decisions < 240, "第四章ボス戦が有限ターンで終了する");
  assert.notEqual(game.mode, "gameover", "構え・予告・回復・役割を使い分ければ全滅しない");
  assert.equal(game.state.victories, 1);
});

test("第四章の街道から第五章へ地続きで進み、三索引・愛奈加入・図書館・章終了まで通る", async () => {
  const { game, document, window } = await createGame();
  game.state.flags.prologueSeen = true;
  game.state.flags.chapter1Clear = true;
  game.state.flags.chapter2Clear = true;
  game.state.flags.chapter3Clear = true;
  game.state.flags.chapter4Clear = true;
  game.state.flags.chapter4BossWon = true;
  game.state.flags.kumiJoined = true;
  game.state.flags.mireiJoined = true;
  game.state.flags.sarinaJoined = true;
  game.state.flags.katoshiJoined = true;
  game.state.flags.rosterUnlocked = true;
  game.state.flags.postClear = true;
  game.state.party.order = ["hero", "kumi", "sarina", "katoshi"];
  game.state.party.hero.level = 9;
  game.state.party.hero.exp = 2240;
  game.state.party.hero.atk = 43;
  game.state.gold = 928;
  game.state.inventory.starElixir = 1;
  game.state.map = "windRoad";
  game.state.x = 49;
  game.state.y = 29;
  game.buildMapEnemies();
  game.setMode("map");

  const east = game.currentMap().warps.find(
    (warp) => warp.to === "manaRoad" && warp.y === 29,
  );
  assert.ok(east, "第四章街道の東端に第五章への接続がある");
  game.useWarp(east);
  assert.equal(game.state.map, "manaRoad");
  assert.equal(game.state.quests.chapter5, "active");
  assert.equal(game.state.party.hero.level, 9);
  assert.equal(game.state.party.hero.exp, 2240);
  assert.equal(game.state.party.hero.atk, 43);
  assert.equal(game.state.gold, 928);
  assert.equal(game.state.inventory.starElixir, 1);

  window.__HQ0_TEST__.teleport("manafia", 24, 15);
  window.__HQ0_TEST__.talk("manaka");
  drainDialogue(game, document);
  assert.equal(game.state.flags.metManaka, true);
  assert.equal(game.state.quests.threeIndexes, "active");

  for (const [special, flag, item] of [
    ["origin-index", "originIndexFound", "originIndex"],
    ["future-index", "futureIndexFound", "futureIndex"],
    ["question-index", "questionIndexFound", "questionIndex"],
  ]) {
    window.__HQ0_TEST__.special(special);
    drainDialogue(game, document);
    assert.equal(game.state.flags[flag], true);
    assert.equal(game.state.inventory[item], 1);
  }

  window.__HQ0_TEST__.teleport("manafia", 24, 15);
  window.__HQ0_TEST__.talk("manaka");
  drainDialogue(game, document);
  assert.equal(game.state.flags.manakaJoined, true);
  assert.equal(game.state.quests.threeIndexes, "complete");
  assert.equal(game.state.party.order.length, 4);
  assert.equal(game.state.party.order.includes("manaka"), true);

  window.__HQ0_TEST__.teleport("arcaneArchive1", 37, 9);
  window.__HQ0_TEST__.special("archive-gate");
  const correct = [...document.querySelectorAll("#dialogue-choices button")].find(
    (button) => button.textContent.includes("始原 → 問い → 未来"),
  );
  assert.ok(correct, "石板の情報から分類順を選べる");
  correct.click();
  drainDialogue(game, document);
  assert.equal(game.state.flags.archiveGateOpen, true);

  window.__HQ0_TEST__.teleport("arcaneArchive2", 33, 6);
  window.__HQ0_TEST__.special("chapter5-boss");
  drainDialogue(game, document);
  assert.equal(game.mode, "battle");
  assert.deepEqual(
    game.battle.enemies.map((enemy) => enemy.kind),
    ["amnesiaLibrarian", "falseIndex", "falseIndex"],
  );
  const boss = game.battle.enemies[0];
  const manaka = game.state.party.manaka;
  game.executeSkill(manaka, {
    type: "skill",
    id: "monsterAnalysis",
    target: boss.id,
    targetType: "enemy",
  });
  assert.equal(boss.status.analyzed, 3);
  assert.equal(game.battle.analysisLock, 3);
  game.battle.telegraph = "rewrite";
  game.executeSkill(manaka, {
    type: "skill",
    id: "magicalTsukkomi",
    target: boss.id,
    targetType: "enemy",
  });
  assert.equal(game.battle.telegraph, null, "愛奈の固有技が記憶改竄を中断する");

  window.__HQ0_TEST__.winBattle();
  drainDialogue(game, document);
  assert.equal(game.state.flags.chapter5Clear, true);
  assert.equal(game.state.quests.chapter5, "complete");
  assert.equal(game.mode, "clear");
  assert.equal(document.querySelector("#clear-heading").textContent, "英知の賢者と魔導都市");

  game.showSavePicker("clear");
  document.querySelector('[data-save-slot="2"]').click();
  game.goTitle();
  game.openLoadScreen("title");
  document.querySelector('[data-load-slot="2"]').click();
  assert.equal(game.mode, "clear");
  assert.equal(game.state.flags.chapter5Clear, true);
  assert.equal(game.state.party.manaka.name, "愛奈");
  assert.equal(game.state.party.order.includes("manaka"), true);
});

test("分析・予告中断・属性・回復を使い分ければ第五章ボスを攻略できる", async () => {
  const { game } = await createGame();
  const hero = game.state.party.hero;
  const kumi = game.state.party.kumi;
  const sarina = game.state.party.sarina;
  const manaka = game.state.party.manaka;
  Object.assign(hero, { level: 9, hp: 142, maxHp: 142, mp: 62, maxMp: 62, atk: 45, def: 26, mag: 31, spd: 26 });
  Object.assign(kumi, { level: 9, hp: 164, maxHp: 164, mp: 68, maxMp: 68, atk: 43, def: 34, mag: 18, spd: 22 });
  Object.assign(sarina, { level: 9, hp: 126, maxHp: 126, mp: 98, maxMp: 98, atk: 20, def: 25, mag: 50, spd: 27 });
  Object.assign(manaka, { level: 9, hp: 122, maxHp: 122, mp: 112, maxMp: 112, atk: 18, def: 24, mag: 55, spd: 29 });
  game.state.party.order = ["hero", "kumi", "sarina", "manaka"];
  game.state.flags.prologueSeen = true;
  game.state.flags.manakaJoined = true;
  game.state.inventory.starElixir = 7;
  game.state.inventory.spiritNectar = 5;
  game.state.happy = 20;
  game.setMode("map");
  game.startBattle(["amnesiaLibrarian", "falseIndex", "falseIndex"], {
    story: "chapter5Boss",
    canEscape: false,
  });

  let decisions = 0;
  while (game.mode === "battle" && decisions < 300) {
    const actor = game.currentBattleActor();
    if (!actor) break;
    const alive = game.state.party.order
      .map((id) => game.state.party[id])
      .filter((member) => member.hp > 0);
    const wounded = [...alive].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const target =
      game.battle.enemies.find((enemy) => enemy.kind === "falseIndex" && enemy.hp > 0) ||
      game.battle.enemies.find((enemy) => enemy.hp > 0);
    const boss = game.battle.enemies.find((enemy) => enemy.kind === "amnesiaLibrarian");
    const rewrite = game.battle.telegraph === "rewrite";

    if (actor.id === "manaka" && rewrite && actor.mp >= 8) {
      game.commitPlan({ type: "skill", id: "magicalTsukkomi", target: boss.id, targetType: "enemy" });
    } else if (
      actor.id === "manaka" &&
      actor.mp >= 4 &&
      (!target.status.analyzed || game.battle.analysisLock <= 1)
    ) {
      game.commitPlan({ type: "skill", id: "monsterAnalysis", target: target.id, targetType: "enemy" });
    } else if (actor.id === "manaka" && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "wisdomBook", target: target.id, targetType: "enemy" });
    } else if (actor.id === "sarina" && wounded.hp / wounded.maxHp < 0.62 && actor.mp >= 5) {
      game.commitPlan({ type: "skill", id: "sacredBell", targetType: "allAllies" });
    } else if (
      actor.id === "sarina" &&
      !alive.every((member) => member.status.spiritWard) &&
      actor.mp >= 6
    ) {
      game.commitPlan({ type: "skill", id: "spiritWard", targetType: "allAllies" });
    } else if (actor.id === "sarina" && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "rainbowPrayer", target: target.id, targetType: "enemy" });
    } else if (actor.id === "kumi" && rewrite && actor.mp >= 7) {
      game.commitPlan({ type: "skill", id: "formation", targetType: "allAllies" });
    } else if (actor.id === "kumi" && game.battle.round === 1 && actor.mp >= 5) {
      game.commitPlan({ type: "skill", id: "captainCall", targetType: "allAllies" });
    } else if (actor.id === "kumi" && actor.mp >= 4) {
      game.commitPlan({ type: "skill", id: "skyThrust", target: target.id, targetType: "enemy" });
    } else if (actor.id === "hero" && game.state.happy >= 100) {
      game.commitPlan({ type: "skill", id: "promiseAura", targetType: "allEnemies" });
    } else if (actor.id === "hero" && actor.mp >= 3) {
      game.commitPlan({ type: "skill", id: "auraBlade", target: target.id, targetType: "enemy" });
    } else if (wounded.hp / wounded.maxHp < 0.45 && game.state.inventory.starElixir > 0) {
      game.commitPlan({ type: "item", id: "starElixir", target: wounded.id, targetType: "ally" });
    } else if (rewrite) {
      game.commitPlan({ type: "guard" });
    } else {
      game.commitPlan({ type: "attack", target: target.id, targetType: "enemy" });
    }
    decisions += 1;
  }
  assert.ok(decisions < 300, "第五章ボス戦が有限ターンで終了する");
  assert.notEqual(game.mode, "gameover", "分析・中断・回復を使えば全滅しない");
  assert.equal(game.state.victories, 1);
});

test("旧版セーブを消さず、名前・進行実績・記念装備へ移行する", async () => {
  const { game, window } = await createGame();
  window.localStorage.setItem(
    "hq0-save-2",
    JSON.stringify({
      version: 4,
      name: "旧勇者",
      lv: 5,
      gold: 123,
      flags: { fragment: 4 },
    }),
  );
  const legacy = game.findLegacySave();
  assert.equal(legacy.id, 2);
  game.importLegacy("2");
  assert.equal(game.state.name, "旧勇者");
  assert.equal(game.state.version, 5);
  assert.equal(game.state.flags.legacyImported, true);
  assert.equal(game.state.inventory.legacyEmblem, 1);
  assert.equal(game.state.party.hero.equipment.accessory, "legacyEmblem");
  assert.ok(game.state.gold >= 123);
});
