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
  assert.equal(game.state.happy, 50, "通常戦闘後のゲージ持越しには上限がある");

  game.state.inventory.brightBell = 1;
  game.startBattle(["anxietyShade"], { canEscape: true });
  game.executeBattleItem(game.state.party.hero, {
    type: "item",
    id: "brightBell",
    targetType: "allAllies",
  });
  assert.equal(game.state.inventory.brightBell, 0, "光鳴りの鈴は一度使うとなくなる");
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
  oldSave.gold = 345;
  oldSave.inventory.herb = 7;
  delete oldSave.inventory.happyBread;
  oldSave.flags.chapter1Clear = true;
  delete oldSave.flags.chapter2Started;
  delete oldSave.flags.mireiJoined;
  delete oldSave.quests.chapter2;
  delete oldSave.rumors.mirelia;

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
