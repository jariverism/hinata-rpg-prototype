import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Window } from "happy-dom";

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
