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

test("タイトルから第三章終了、セーブ・ロードまでの進行", async () => {
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
  assert.equal(
    document.querySelector("#speaker").textContent,
    "空色の騎士団長",
  );
  for (let i = 0; i < 6; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.raid, true);
  assert.equal(state.map, "grass");
  window.__HQ0_TEST__.settle();

  pressDirection(document, "right");
  assert.equal(visible(document.querySelector("#battle")), true);
  let captainUsed = false;
  for (
    let i = 0;
    i < 30 && visible(document.querySelector("#battle"));
    i += 1
  ) {
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
  for (
    let i = 0;
    i < 80 && visible(document.querySelector("#battle"));
    i += 1
  ) {
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
        (button) =>
          button.textContent === "オーラブレード MP4" && !button.disabled,
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

  document.querySelector("#clear-next").click();
  assert.equal(visible(document.querySelector("#dialogue")), true);
  for (let i = 0; i < 3; i += 1) document.querySelector("#dialogue").click();
  window.__HQ0_TEST__.settle();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.chapter2, true);
  assert.equal(state.map, "world");

  const pad = {
    buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    axes: [1, 0],
  };
  Object.defineProperty(window.navigator, "getGamepads", {
    configurable: true,
    value: () => [pad],
  });
  window.__HQ0_TEST__.gamepad(1000);
  assert.equal(window.__HQ0_TEST__.state().x, 5);
  pad.axes = [0, 0];
  window.__HQ0_TEST__.gamepad(1200);
  for (let i = 0; i < 11; i += 1) pressDirection(document, "right");
  pressDirection(document, "up");
  pressA(document);
  assert.equal(document.querySelector("#speaker").textContent, "SYSTEM");
  document.querySelector("#dialogue").click();
  window.__HQ0_TEST__.settle();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.map, "milerea");
  for (let i = 0; i < 5; i += 1) pressDirection(document, "up");
  pressA(document);
  assert.equal(
    document.querySelector("#speaker").textContent,
    "パン職人の少女",
  );
  for (let i = 0; i < 6; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.metMirei, true);
  assert.equal(state.quests.sunwheat, "active");

  document.querySelector("#touch-menu").onpointerdown({ preventDefault() {} });
  document.querySelector('[data-tab="quests"]').click();
  assert.match(
    document.querySelector("#menu-body").textContent,
    /三つの陽だまり麦/,
  );
  document.querySelector("#menu-close").click();

  window.__HQ0_TEST__.step("bake");
  pressDirection(document, "up");
  pressA(document);
  for (let i = 0; i < 6; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.mireiGuest, true);
  assert.equal(state.flags.ovenOpen, true);
  assert.equal(state.quests.sunwheat, "complete");

  document.querySelector("#touch-menu").onpointerdown({ preventDefault() {} });
  document.querySelector('[data-tab="party"]').click();
  assert.match(
    document.querySelector("#menu-body").textContent,
    /パン職人の少女/,
  );
  const mireiToggle = document.querySelector('[data-party="mirei"]');
  assert.ok(mireiToggle);
  mireiToggle.click();
  assert.equal(window.__HQ0_TEST__.state().active.mirei, false);
  mireiToggle.click();
  assert.equal(window.__HQ0_TEST__.state().active.mirei, true);
  document.querySelector("#menu-close").click();

  window.__HQ0_TEST__.step("ovenBoss");
  pressDirection(document, "up");
  pressA(document);
  for (let i = 0; i < 4; i += 1) document.querySelector("#dialogue").click();
  assert.equal(visible(document.querySelector("#battle")), true);

  let chapter2Captain = false;
  let mireiSkillUsed = false;
  for (
    let i = 0;
    i < 180 && visible(document.querySelector("#battle"));
    i += 1
  ) {
    const log = document.querySelector("#battle-log").textContent;
    if (log.includes("テストの行動")) {
      command(document, "スキル");
      const aura = [...document.querySelectorAll("#commands button")].find(
        (button) =>
          button.textContent === "オーラブレード MP4" && !button.disabled,
      );
      if (aura) aura.click();
      else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else if (log.includes("久美の行動") && !chapter2Captain) {
      command(document, "スキル");
      command(document, "キャプテンコール MP4");
      chapter2Captain = true;
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
    } else if (log.includes("美玲の行動") && !mireiSkillUsed) {
      command(document, "スキル");
      assert.ok(
        [...document.querySelectorAll("#commands button")].some(
          (button) => button.textContent === "焼きたてヒール MP4",
        ),
      );
      command(document, "ハッピーブレッド MP7");
      mireiSkillUsed = true;
    } else if (log.includes("美玲の行動")) {
      command(document, "スキル");
      const heal = [...document.querySelectorAll("#commands button")].find(
        (button) =>
          button.textContent === "焼きたてヒール MP4" && !button.disabled,
      );
      if (heal) heal.click();
      else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else {
      command(document, "たたかう");
    }
  }
  assert.equal(mireiSkillUsed, true);
  for (let i = 0; i < 6; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.chapter2Boss, true);
  assert.equal(state.flags.chapter2Clear, true);
  assert.equal(state.flags.mireiJoined, true);
  assert.equal(state.flags.fragment, 2);
  assert.equal(visible(document.querySelector("#clear")), true);
  assert.equal(visible(document.querySelector("#clear-next")), true);
  assert.equal(
    document.querySelector("#clear-next").textContent,
    "第三章へ進む",
  );

  document.querySelector("#clear-save").click();
  document.querySelector("#clear-title").click();
  document.querySelector('[data-title="load"]').click();
  document.querySelector('[data-load="1"]').click();
  assert.equal(visible(document.querySelector("#clear")), true);
  assert.equal(window.__HQ0_TEST__.state().flags.chapter2Clear, true);

  document.querySelector("#clear-next").click();
  assert.equal(visible(document.querySelector("#dialogue")), true);
  for (let i = 0; i < 4; i += 1) document.querySelector("#dialogue").click();
  window.__HQ0_TEST__.settle();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.chapter3, true);
  assert.equal(state.map, "world");

  for (let i = 0; i < 5; i += 1) pressDirection(document, "left");
  for (let i = 0; i < 3; i += 1) pressDirection(document, "down");
  pressA(document);
  assert.equal(document.querySelector("#speaker").textContent, "SYSTEM");
  document.querySelector("#dialogue").click();
  window.__HQ0_TEST__.settle();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.map, "sarinalia");

  for (let i = 0; i < 6; i += 1) pressDirection(document, "up");
  pressA(document);
  assert.equal(document.querySelector("#speaker").textContent, "鈴を持つ巫女");
  for (let i = 0; i < 6; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.metSarina, true);
  assert.equal(state.quests.spiritTones, "active");

  window.__HQ0_TEST__.step("altarGold");
  pressA(document);
  for (let i = 0; i < 2; i += 1) document.querySelector("#dialogue").click();
  assert.deepEqual(window.__HQ0_TEST__.state().spiritOrder, []);

  for (const [altar, expected] of [
    ["altarBlue", ["blue"]],
    ["altarGold", ["blue", "gold"]],
  ]) {
    window.__HQ0_TEST__.step(altar);
    pressA(document);
    document.querySelector("#dialogue").click();
    assert.deepEqual(window.__HQ0_TEST__.state().spiritOrder, expected);
  }
  window.__HQ0_TEST__.step("altarPink");
  pressA(document);
  for (let i = 0; i < 5; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.groveSolved, true);
  assert.equal(state.flags.rootOpen, true);
  assert.equal(state.flags.sarinaGuest, true);
  assert.equal(state.quests.spiritTones, "complete");

  document.querySelector("#touch-menu").onpointerdown({ preventDefault() {} });
  document.querySelector('[data-tab="party"]').click();
  assert.match(
    document.querySelector("#menu-body").textContent,
    /鈴を持つ巫女/,
  );
  const sarinaToggle = document.querySelector('[data-party="sarina"]');
  assert.ok(sarinaToggle);
  sarinaToggle.click();
  assert.equal(window.__HQ0_TEST__.state().active.sarina, false);
  sarinaToggle.click();
  assert.equal(window.__HQ0_TEST__.state().active.sarina, true);
  document.querySelector("#menu-close").click();

  window.__HQ0_TEST__.step("rootBoss");
  pressA(document);
  for (let i = 0; i < 4; i += 1) document.querySelector("#dialogue").click();
  assert.equal(visible(document.querySelector("#battle")), true);
  assert.match(document.querySelector("#party").textContent, /HAPPY100\/100/);
  command(document, "必殺技");
  assert.equal(window.__HQ0_TEST__.state().happy, 0);

  let sarinaSkillUsed = false;
  let rootCaptainUsed = false;
  const finishers = new Set(["hero"]);
  for (
    let i = 0;
    i < 320 && visible(document.querySelector("#battle"));
    i += 1
  ) {
    const log = document.querySelector("#battle-log").textContent;
    const available = [...document.querySelectorAll("#commands button")];
    if (log.includes("久美の行動") && !finishers.has("kumi")) {
      window.__HQ0_TEST__.happy(100);
      command(document, "必殺技");
      finishers.add("kumi");
    } else if (log.includes("美玲の行動") && !finishers.has("mirei")) {
      window.__HQ0_TEST__.happy(100);
      command(document, "必殺技");
      finishers.add("mirei");
    } else if (log.includes("紗理菜の行動") && !finishers.has("sarina")) {
      window.__HQ0_TEST__.happy(100);
      command(document, "必殺技");
      finishers.add("sarina");
    } else if (
      available.some(
        (button) => button.textContent === "必殺技" && !button.disabled,
      )
    ) {
      command(document, "必殺技");
    } else if (log.includes("久美の行動") && !rootCaptainUsed) {
      command(document, "スキル");
      command(document, "キャプテンコール MP4");
      rootCaptainUsed = true;
    } else if (log.includes("久美の行動")) {
      command(document, "スキル");
      const skill = [...document.querySelectorAll("#commands button")].find(
        (button) => button.textContent === "蒼天突き MP5" && !button.disabled,
      );
      if (skill) skill.click();
      else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else if (log.includes("美玲の行動")) {
      command(document, "スキル");
      const heal = [...document.querySelectorAll("#commands button")].find(
        (button) =>
          button.textContent === "ハッピーブレッド MP7" && !button.disabled,
      );
      if (heal) heal.click();
      else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else if (log.includes("紗理菜の行動")) {
      command(document, "スキル");
      const bell = [...document.querySelectorAll("#commands button")].find(
        (button) => button.textContent === "聖なる鈴 MP4" && !button.disabled,
      );
      if (bell) {
        bell.click();
        sarinaSkillUsed = true;
      } else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else if (log.includes("テストの行動")) {
      command(document, "スキル");
      const aura = [...document.querySelectorAll("#commands button")].find(
        (button) =>
          button.textContent === "オーラブレード MP4" && !button.disabled,
      );
      if (aura) aura.click();
      else {
        command(document, "もどる");
        command(document, "たたかう");
      }
    } else {
      command(document, "たたかう");
    }
  }
  assert.equal(sarinaSkillUsed, true);
  assert.deepEqual([...finishers].sort(), ["hero", "kumi", "mirei", "sarina"]);
  for (let i = 0; i < 7; i += 1) document.querySelector("#dialogue").click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.flags.chapter3Boss, true);
  assert.equal(state.flags.chapter3Clear, true);
  assert.equal(state.flags.sarinaJoined, true);
  assert.equal(state.flags.fragment, 3);
  assert.equal(visible(document.querySelector("#clear")), true);
  assert.equal(visible(document.querySelector("#clear-next")), false);

  document.querySelector("#clear-save").click();
  document.querySelector("#clear-title").click();
  document.querySelector('[data-title="load"]').click();
  document.querySelector('[data-load="1"]').click();
  assert.equal(visible(document.querySelector("#clear")), true);
  assert.equal(window.__HQ0_TEST__.state().flags.chapter3Clear, true);

  window.localStorage.setItem(
    "hq0-save-2",
    JSON.stringify({
      version: 1,
      name: "旧記録",
      map: "cave",
      x: 10,
      y: 2,
      dir: "up",
      lv: 4,
      exp: 0,
      hp: 90,
      mp: 20,
      maxHp: 93,
      maxMp: 27,
      atk: 22,
      def: 13,
      gold: 120,
      items: { herb: 1 },
      equip: { weapon: null, charm: null },
      opened: {},
      defeated: { boss: true },
      visited: {},
      flags: {
        tutorial: true,
        metKumi: true,
        raidWon: true,
        cave: true,
        boss: true,
        joined: true,
        clear: true,
        fragment: 1,
      },
      kumi: { hp: 92, mp: 24, maxHp: 92, maxMp: 24, atk: 19, def: 13 },
      battles: 4,
      steps: 80,
      playTime: 900,
      started: Date.now(),
    }),
  );
  document.querySelector("#clear-title").click();
  document.querySelector('[data-title="load"]').click();
  document.querySelector('[data-load="2"]').click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.version, 3);
  assert.equal(state.name, "旧記録");
  assert.equal(state.flags.chapter1Clear, true);
  assert.equal(state.flags.fragment, 1);
  assert.deepEqual(state.active, { kumi: true, mirei: true, sarina: true });

  window.localStorage.setItem(
    "hq0-save-3",
    JSON.stringify({
      version: 2,
      name: "第二章記録",
      chapter: 2,
      map: "oven",
      x: 10,
      y: 2,
      lv: 7,
      flags: {
        boss: true,
        joined: true,
        chapter1Clear: true,
        chapter2: true,
        chapter2Boss: true,
        mireiJoined: true,
        clear: true,
        fragment: 2,
      },
      items: {},
      equip: {},
      active: { kumi: true, mirei: true },
      quests: {},
      kills: {},
      playTime: 1800,
      started: Date.now(),
    }),
  );
  document.querySelector("#clear-title").click();
  document.querySelector('[data-title="load"]').click();
  document.querySelector('[data-load="3"]').click();
  state = window.__HQ0_TEST__.state();
  assert.equal(state.version, 3);
  assert.equal(state.flags.chapter2Clear, true);
  assert.equal(state.flags.fragment, 2);
  assert.equal(state.flags.chapter3, false);
  assert.equal(state.sarina.maxMp, 48);
  assert.equal(state.active.sarina, true);
});

test("全マップの必須地点に進行可能な経路がある", async () => {
  const window = globalThis.window;
  const { maps, TILE } = window.HQ0;
  const blocked = new Set([
    TILE.TREE,
    TILE.WATER,
    TILE.WALL,
    TILE.ROOF,
    TILE.LAVA,
    TILE.ROOT,
  ]);

  function reachable(map, start, goal) {
    const queue = [start];
    const seen = new Set([start.join(",")]);
    while (queue.length) {
      const [x, y] = queue.shift();
      if (Math.abs(x - goal[0]) + Math.abs(y - goal[1]) <= 1) return true;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
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
  assert.equal(reachable(maps.world, maps.world.start, [3, 4]), true);
  assert.equal(reachable(maps.world, maps.world.start, [16, 4]), true);
  assert.equal(reachable(maps.world, maps.world.start, [10, 8]), true);
  assert.equal(reachable(maps.milerea, maps.milerea.start, [10, 3]), true);
  assert.equal(reachable(maps.milerea, maps.milerea.start, [4, 7]), true);
  assert.equal(reachable(maps.milerea, maps.milerea.start, [19, 5]), true);
  assert.equal(reachable(maps.wheatfield, maps.wheatfield.start, [6, 2]), true);
  assert.equal(
    reachable(maps.wheatfield, maps.wheatfield.start, [12, 7]),
    true,
  );
  assert.equal(
    reachable(maps.wheatfield, maps.wheatfield.start, [17, 3]),
    true,
  );
  assert.equal(reachable(maps.oven, maps.oven.start, [3, 5]), true);
  assert.equal(reachable(maps.oven, maps.oven.start, [16, 5]), true);
  assert.equal(reachable(maps.oven, maps.oven.start, [10, 1]), true);
  assert.equal(reachable(maps.sarinalia, maps.sarinalia.start, [10, 3]), true);
  assert.equal(reachable(maps.sarinalia, maps.sarinalia.start, [19, 5]), true);
  assert.equal(reachable(maps.sarinalia, maps.sarinalia.start, [10, 0]), true);
  assert.equal(
    reachable(maps.spiritgrove, maps.spiritgrove.start, [6, 2]),
    true,
  );
  assert.equal(
    reachable(maps.spiritgrove, maps.spiritgrove.start, [12, 7]),
    true,
  );
  assert.equal(
    reachable(maps.spiritgrove, maps.spiritgrove.start, [17, 3]),
    true,
  );
  assert.equal(reachable(maps.rootshrine, maps.rootshrine.start, [3, 5]), true);
  assert.equal(
    reachable(maps.rootshrine, maps.rootshrine.start, [16, 5]),
    true,
  );
  assert.equal(
    reachable(maps.rootshrine, maps.rootshrine.start, [10, 1]),
    true,
  );
});
