import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Window } from "happy-dom";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function key(window, value) {
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: value }));
  window.dispatchEvent(new window.KeyboardEvent("keyup", { key: value }));
}

function pressDirection(document, direction) {
  document
    .querySelector(`[data-dir="${direction}"]`)
    .onpointerdown({ preventDefault() {} });
}

function pressA(document) {
  document.querySelector("#touch-a").onpointerdown({ preventDefault() {} });
}

function visible(element) {
  return !element.classList.contains("hidden");
}

function command(document, label) {
  const buttons = [...document.querySelectorAll("#commands button")];
  const button = buttons.find((candidate) => candidate.textContent === label);
  assert.ok(button, `戦闘コマンド「${label}」が存在する`);
  assert.equal(button.disabled, false, `戦闘コマンド「${label}」が使用できる`);
  button.click();
}

test("タイトルから第一章終了、セーブ・ロードまでの進行", async () => {
  const window = new Window({ url: "http://localhost/" });
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  window.document.write(html);
  window.document.close();

  const noop = () => {};
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop: noop }),
      measureText: (text) => ({ width: String(text).length * 8 }),
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
  window.HTMLCanvasElement.prototype.getContext = () => context;

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  globalThis.requestAnimationFrame = noop;
  globalThis.addEventListener = window.addEventListener.bind(window);
  globalThis.clearTimeout = noop;
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };

  await import(`${pathToFileURL(path.join(root, "data.js")).href}?test=1`);
  await import(`${pathToFileURL(path.join(root, "game.js")).href}?test=1`);

  const { document } = window;
  assert.equal(visible(document.querySelector("#title")), true);
  document.querySelector('[data-title="new"]').click();
  assert.equal(visible(document.querySelector("#name-modal")), true);
  document.querySelector("#name-input").value = "テスト";
  document.querySelector("#name-ok").click();
  assert.equal(visible(document.querySelector("#dialogue")), true);
  for (let i = 0; i < 5; i += 1) document.querySelector("#dialogue").click();
  window.__HQ0_TEST__.settle();

  let state = window.__HQ0_TEST__.state();
  assert.equal(state.name, "テスト");
  assert.equal(state.map, "grass");

  for (let i = 0; i < 8 && !visible(document.querySelector("#battle")); i += 1)
    pressDirection(document, "right");
  assert.equal(
    visible(document.querySelector("#battle")),
    true,
    JSON.stringify(window.__HQ0_TEST__.state()),
  );
  for (let i = 0; i < 12 && visible(document.querySelector("#battle")); i += 1)
    command(document, "たたかう");
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.tutorial, true);

  window.__HQ0_TEST__.step("city");
  pressDirection(document, "up");
  pressA(document);
  assert.equal(document.querySelector("#speaker").textContent, "空色の騎士団長");
  for (let i = 0; i < 6; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.raid, true);
  assert.equal(state.map, "grass");
  window.__HQ0_TEST__.settle();

  pressDirection(document, "right");
  assert.equal(visible(document.querySelector("#battle")), true);
  let captainUsed = false;
  for (let i = 0; i < 30 && visible(document.querySelector("#battle")); i += 1) {
    const log = document.querySelector("#battle-log").textContent;
    if (log.includes("久美の行動") && !captainUsed) {
      command(document, "スキル");
      command(document, "キャプテンコール MP4");
      captainUsed = true;
    } else {
      command(document, "たたかう");
    }
  }
  for (let i = 0; i < 4; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.cave, true);
  assert.equal(state.flags.raidWon, true);

  window.__HQ0_TEST__.step("boss");
  pressA(document);
  for (let i = 0; i < 4; i += 1) document.querySelector("#dialogue").click();
  assert.equal(visible(document.querySelector("#battle")), true);

  captainUsed = false;
  for (let i = 0; i < 80 && visible(document.querySelector("#battle")); i += 1) {
    const log = document.querySelector("#battle-log").textContent;
    if (log.includes("久美の行動") && !captainUsed) {
      command(document, "スキル");
      command(document, "キャプテンコール MP4");
      captainUsed = true;
    } else if (log.includes("テストの行動")) {
      const skill = [...document.querySelectorAll("#commands button")].find(
        (button) => button.textContent === "スキル",
      );
      skill?.click();
      const aura = [...document.querySelectorAll("#commands button")].find(
        (button) => button.textContent === "オーラブレード MP4" && !button.disabled,
      );
      if (aura) aura.click();
      else {
        const back = [...document.querySelectorAll("#commands button")].find(
          (button) => button.textContent === "もどる",
        );
        back?.click();
        command(document, "たたかう");
      }
    } else if (log.includes("久美の行動")) {
      command(document, "スキル");
      const thrust = [...document.querySelectorAll("#commands button")].find(
        (button) => button.textContent === "蒼天突き MP5" && !button.disabled,
      );
      if (thrust) thrust.click();
      else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else {
      command(document, "たたかう");
    }
  }
  for (let i = 0; i < 5; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.boss, true);
  assert.equal(state.flags.clear, true);
  assert.equal(visible(document.querySelector("#clear")), true);

  document.querySelector("#clear-save").click();
  assert.ok(window.localStorage.getItem("hq0-save-1"));
  document.querySelector("#clear-title").click();
  document.querySelector('[data-title="load"]').click();
  const loadButton = document.querySelector('[data-load="1"]');
  assert.ok(loadButton);
  loadButton.click();
  assert.equal(visible(document.querySelector("#clear")), true);
});

test("全マップの必須地点に進行可能な経路がある", async () => {
  const window = globalThis.window;
  const { maps, TILE } = window.HQ0;
  const blocked = new Set([TILE.TREE, TILE.WATER, TILE.WALL]);

  function reachable(map, start, goal) {
    const queue = [start];
    const seen = new Set([start.join(",")]);
    while (queue.length) {
      const [x, y] = queue.shift();
      if (Math.abs(x - goal[0]) + Math.abs(y - goal[1]) <= 1) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const id = `${nx},${ny}`;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < 20 &&
          ny < 11 &&
          !blocked.has(map.tiles[ny][nx]) &&
          !seen.has(id)
        ) {
          seen.add(id);
          queue.push([nx, ny]);
        }
      }
    }
    return false;
  }

  assert.equal(reachable(maps.grass, maps.grass.start, [7, 5]), true);
  assert.equal(reachable(maps.grass, maps.grass.start, [19, 5]), true);
  assert.equal(reachable(maps.city, maps.city.start, [10, 2]), true);
  assert.equal(reachable(maps.cave, maps.cave.start, [3, 5]), true);
  assert.equal(reachable(maps.cave, maps.cave.start, [16, 5]), true);
  assert.equal(reachable(maps.cave, maps.cave.start, [10, 1]), true);
});
