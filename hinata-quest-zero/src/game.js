import {
  ENEMIES,
  EQUIP_SLOTS,
  INITIAL_DIALOGUE,
  ITEMS,
  MAPS,
  PASSABLE,
  QUESTS,
  RUMORS,
  SHOPS,
  SKILLS,
  SLOT_NAMES,
  TILE,
} from "./data.js";
import {
  AUTO_KEY,
  LEGACY_AUTO,
  LEGACY_PREFIX,
  SAVE_PREFIX,
  activeParty,
  addItem,
  clampVitals,
  createState,
  discoverRumor,
  equipItem,
  expNext,
  fullHeal,
  grantExperience,
  maxHp,
  migrateLegacy,
  normalizeState,
  ownsItem,
  removeItem,
  serialize,
  stat,
  unequipItem,
} from "./state.js";
import { AudioEngine } from "./audio.js";
import { PixelRenderer } from "./pixel.js";

const W = 640;
const H = 360;
const T = 32;
const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const STATUS_NAMES = {
  poison: "毒",
  fear: "恐怖",
  auraDown: "オーラ低下",
  atkUp: "攻↑",
  defUp: "守↑",
  haste: "速↑",
  guard: "防御",
  formation: "陣形",
  bright: "光護",
};

const $ = (id) => document.getElementById(id);
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const shuffle = (array) =>
  array
    .map((value) => ({ value, rank: Math.random() }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ value }) => value);

export class HinatiaGame {
  constructor() {
    this.ui = {
      stage: $("stage"),
      canvas: $("game"),
      title: $("title-screen"),
      setup: $("setup-screen"),
      nameInput: $("name-input"),
      fieldHud: $("field-hud"),
      location: $("location"),
      hudParty: $("hud-party"),
      hudGold: $("hud-gold"),
      areaCard: $("area-card"),
      areaName: $("area-name"),
      interactPrompt: $("interact-prompt"),
      interactLabel: $("interact-label"),
      dialogue: $("dialogue"),
      portrait: $("portrait"),
      speaker: $("speaker"),
      dialogueText: $("dialogue-text"),
      dialogueChoices: $("dialogue-choices"),
      dialogueNext: $("dialogue-next"),
      battle: $("battle-ui"),
      battleState: $("battle-state"),
      battleMessage: $("battle-message"),
      battleParty: $("battle-party"),
      battleCommands: $("battle-commands"),
      battleLog: $("battle-log"),
      enemyLabels: $("enemy-labels"),
      happyFill: $("happy-fill"),
      happyValue: $("happy-value"),
      menu: $("menu-screen"),
      menuTabs: $("menu-tabs"),
      menuBody: $("menu-body"),
      menuPlaytime: $("menu-playtime"),
      menuGold: $("menu-gold"),
      panel: $("panel-screen"),
      panelEyebrow: $("panel-eyebrow"),
      panelTitle: $("panel-title"),
      panelGold: $("panel-gold"),
      panelBody: $("panel-body"),
      load: $("load-screen"),
      loadSlots: $("load-slots"),
      clear: $("chapter-clear"),
      clearSummary: $("clear-summary"),
      gameOver: $("game-over"),
      toast: $("toast"),
      touch: $("touch-controls"),
    };
    this.renderer = new PixelRenderer(this.ui.canvas);
    this.state = createState();
    this.mode = "title";
    this.previousMode = "map";
    this.dialogueQueue = [];
    this.dialogueIndex = 0;
    this.dialogueDone = null;
    this.typing = false;
    this.typeTimer = null;
    this.visibleText = "";
    this.mapEnemies = [];
    this.battle = null;
    this.tab = "party";
    this.panelContext = null;
    this.titleChoice = 0;
    this.menuChoice = 0;
    this.keys = new Set();
    this.lastMoveAt = 0;
    this.lastFrame = performance.now();
    this.walkFrame = 0;
    this.transition = 0;
    this.transitionDirection = 0;
    this.transitionCallback = null;
    this.toastTimer = null;
    this.areaTimer = null;
    this.damageNumbers = [];
    this.camera = { x: 0, y: 0 };
    this.alerted = new Map();
    this.gamepadButtons = [];
    this.lastPadMove = 0;
    this.testFast = false;
    this.audio = new AudioEngine(() => this.state.settings);
    this.bind();
    this.setMode("title");
    this.audio.play("title");
    requestAnimationFrame((now) => this.frame(now));
    this.exposeTestApi();
  }

  setMode(mode) {
    this.previousMode = this.mode;
    this.mode = mode;
    const visible = (element, on) => element.classList.toggle("hidden", !on);
    visible(this.ui.title, mode === "title");
    visible(this.ui.setup, mode === "setup");
    visible(this.ui.fieldHud, mode === "map");
    visible(this.ui.dialogue, mode === "dialogue");
    visible(this.ui.battle, mode === "battle");
    visible(this.ui.menu, mode === "menu");
    visible(this.ui.panel, mode === "panel");
    visible(this.ui.load, mode === "load");
    visible(this.ui.clear, mode === "clear");
    visible(this.ui.gameOver, mode === "gameover");
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    visible(this.ui.touch, mode === "map" && coarse);
    if (mode !== "map") visible(this.ui.interactPrompt, false);
  }

  bind() {
    document.querySelectorAll("[data-title]").forEach((button, index) => {
      button.addEventListener("click", () => {
        this.titleChoice = index;
        this.titleAction(button.dataset.title);
      });
    });
    $("setup-back").addEventListener("click", () => this.setMode("title"));
    $("setup-start").addEventListener("click", () => this.newGame());
    $("menu-close").addEventListener("click", () => this.closeMenu());
    $("panel-close").addEventListener("click", () => this.closePanel());
    $("load-close").addEventListener("click", () => {
      const origin = this.loadContext?.origin;
      if (origin === "menu") {
        this.setMode("menu");
        this.renderMenu(this.tab);
      } else if (origin === "panel") {
        this.setMode("panel");
      } else if (origin === "clear") {
        this.setMode("clear");
      } else if (origin === "map") {
        this.setMode("map");
        this.refreshHud();
      } else {
        this.setMode("title");
      }
    });
    $("clear-save").addEventListener("click", () => this.showSavePicker("clear"));
    $("clear-explore").addEventListener("click", () => this.continueAfterClear());
    $("clear-title").addEventListener("click", () => this.goTitle());
    $("retry").addEventListener("click", () => this.retryFromDefeat());
    $("gameover-title").addEventListener("click", () => this.goTitle());
    this.ui.dialogue.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      this.advanceDialogue();
    });
    this.ui.menuTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (button) this.renderMenu(button.dataset.tab);
    });
    this.ui.menuBody.addEventListener("click", (event) => this.handleMenuClick(event));
    this.ui.menuBody.addEventListener("input", (event) => this.handleSettingInput(event));
    this.ui.panelBody.addEventListener("click", (event) => this.handlePanelClick(event));
    this.ui.battleCommands.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button && !button.disabled) this.handleBattleButton(button);
    });

    document.querySelectorAll("[data-dir]").forEach((button) => {
      const start = (event) => {
        event.preventDefault();
        this.audio.unlock();
        this.tryMove(button.dataset.dir, true);
      };
      button.addEventListener("pointerdown", start);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
    $("touch-a").addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.confirm();
    });
    $("touch-b").addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.cancel();
    });
    $("touch-menu").addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (this.mode === "map") this.openMenu();
    });

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter"].includes(
          key,
        )
      )
        event.preventDefault();
      this.audio.unlock();
      this.keys.add(key);
      const direction = this.keyDirection(key);
      if (direction) {
        if (this.mode === "map") this.tryMove(direction, true);
        else if (this.mode === "title") this.moveTitle(direction);
        else if (this.mode === "battle") this.focusBattle(direction);
        return;
      }
      if (["enter", "z", " "].includes(key)) this.confirm();
      else if (["escape", "x"].includes(key)) this.cancel();
      else if (key === "m" && this.mode === "map") this.openMenu();
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
  }

  titleAction(action) {
    this.audio.unlock();
    this.audio.sfx("ok");
    if (action === "new") {
      this.ui.nameInput.value = "トシ";
      this.setMode("setup");
    } else {
      this.openLoadScreen("title");
    }
  }

  moveTitle(direction) {
    if (!["up", "down"].includes(direction)) return;
    this.titleChoice = this.titleChoice ? 0 : 1;
    document.querySelectorAll("[data-title]").forEach((button, index) => {
      button.classList.toggle("selected", index === this.titleChoice);
    });
    this.audio.sfx("ok");
  }

  confirm() {
    this.audio.unlock();
    if (this.mode === "title") {
      const button = document.querySelectorAll("[data-title]")[this.titleChoice];
      button?.click();
    } else if (this.mode === "dialogue") {
      this.advanceDialogue();
    } else if (this.mode === "map") {
      this.interact();
    } else if (this.mode === "battle") {
      const selected = this.ui.battleCommands.querySelector("button.selected");
      (selected || this.ui.battleCommands.querySelector("button:not(:disabled)"))?.click();
    }
  }

  cancel() {
    if (this.mode === "setup") this.setMode("title");
    else if (this.mode === "menu") this.closeMenu();
    else if (this.mode === "panel") this.closePanel();
    else if (this.mode === "load") this.setMode(this.panelContext === "menu" ? "menu" : "title");
    else if (this.mode === "battle" && this.battle?.submenu) this.renderBattleCommands();
  }

  keyDirection(key) {
    if (["arrowup", "w"].includes(key)) return "up";
    if (["arrowdown", "s"].includes(key)) return "down";
    if (["arrowleft", "a"].includes(key)) return "left";
    if (["arrowright", "d"].includes(key)) return "right";
    return null;
  }

  newGame() {
    const name = this.ui.nameInput.value.trim().slice(0, 8) || "トシ";
    const hint = document.querySelector('input[name="hint"]:checked')?.value || "standard";
    this.state = createState(name);
    this.state.settings.hint = hint;
    this.state.flags.prologueSeen = true;
    this.buildMapEnemies();
    this.audio.play("field");
    this.dialogue(INITIAL_DIALOGUE, () => {
      this.setMode("map");
      this.showArea();
      this.refreshHud();
      this.autosave();
    });
  }

  goTitle() {
    this.battle = null;
    this.setMode("title");
    this.audio.play("title");
  }

  dialogue(lines, done = null) {
    this.dialogueQueue = Array.isArray(lines) ? lines : [lines];
    this.dialogueIndex = 0;
    this.dialogueDone = done;
    this.setMode("dialogue");
    this.showDialogueLine();
  }

  showDialogueLine() {
    const line = this.dialogueQueue[this.dialogueIndex];
    if (!line) return this.endDialogue();
    this.ui.speaker.textContent = line.speaker || "SYSTEM";
    this.renderer.drawPortrait(this.ui.portrait, line.portrait || "system");
    this.ui.dialogueChoices.replaceChildren();
    this.ui.dialogueChoices.classList.add("hidden");
    this.ui.dialogueNext.classList.toggle("hidden", Boolean(line.choices));
    this.setDialogueText(line.text || "");
    if (line.choices) {
      window.clearInterval(this.typeTimer);
      this.typing = false;
      this.ui.dialogueText.textContent = line.text || "";
      this.ui.dialogueChoices.classList.remove("hidden");
      for (const choice of line.choices) {
        const button = document.createElement("button");
        button.textContent = choice.label;
        button.addEventListener("click", () => {
          this.audio.sfx("ok");
          choice.action?.();
          this.dialogueIndex += 1;
          this.showDialogueLine();
        });
        this.ui.dialogueChoices.append(button);
      }
    }
  }

  setDialogueText(text) {
    window.clearInterval(this.typeTimer);
    const speed = { fast: 8, normal: 18, slow: 34 }[this.state.settings.textSpeed] || 18;
    if (this.testFast || speed <= 1) {
      this.ui.dialogueText.textContent = text;
      this.visibleText = text;
      this.typing = false;
      return;
    }
    this.visibleText = "";
    this.typing = true;
    this.ui.dialogueText.textContent = "";
    let index = 0;
    this.typeTimer = window.setInterval(() => {
      index += 1;
      this.visibleText = text.slice(0, index);
      this.ui.dialogueText.textContent = this.visibleText;
      if (index >= text.length) {
        window.clearInterval(this.typeTimer);
        this.typing = false;
      }
    }, speed);
  }

  advanceDialogue() {
    const line = this.dialogueQueue[this.dialogueIndex];
    if (!line) return this.endDialogue();
    if (line.choices) return;
    if (this.typing) {
      window.clearInterval(this.typeTimer);
      this.typing = false;
      this.ui.dialogueText.textContent = line.text || "";
      return;
    }
    this.audio.sfx("ok");
    this.dialogueIndex += 1;
    this.showDialogueLine();
  }

  endDialogue() {
    window.clearInterval(this.typeTimer);
    const done = this.dialogueDone;
    this.dialogueQueue = [];
    this.dialogueDone = null;
    if (done) done();
    else {
      this.setMode("map");
      this.refreshHud();
    }
  }

  toast(text, duration = 1800) {
    this.ui.toast.textContent = text;
    this.ui.toast.classList.remove("hidden");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => this.ui.toast.classList.add("hidden"),
      duration,
    );
  }

  showArea() {
    this.ui.areaName.textContent = MAPS[this.state.map].name;
    this.ui.areaCard.classList.remove("hidden");
    window.clearTimeout(this.areaTimer);
    this.areaTimer = window.setTimeout(
      () => this.ui.areaCard.classList.add("hidden"),
      2300,
    );
  }

  refreshHud() {
    const state = this.state;
    this.ui.location.textContent = MAPS[state.map].name;
    this.ui.hudGold.textContent = state.gold;
    this.ui.hudParty.innerHTML = activeParty(state)
      .map((member) => {
        const maximum = maxHp(member);
        const percent = clamp((member.hp / maximum) * 100, 0, 100);
        return `<div class="hud-member"><span>${member.name} Lv${member.level}</span><div class="mini-bar"><i style="width:${percent}%"></i></div></div>`;
      })
      .join("");
  }

  currentMap() {
    return MAPS[this.state.map];
  }

  buildMapEnemies() {
    const m = this.currentMap();
    this.mapEnemies = m.enemies
      .filter((enemy) => {
        if (enemy.unique && this.state.defeatedUnique[`${m.id}:${enemy.id}`]) return false;
        return (this.state.symbolCooldowns[`${m.id}:${enemy.id}`] || 0) <= this.state.steps;
      })
      .map((enemy) => ({
        ...deepClone(enemy),
        dir: "down",
        alert: 0,
      }));
    if (m.id === "highroad" && this.state.flags.raidReady && !this.state.flags.raidWon) {
      this.mapEnemies.push({
        id: "story-raid",
        x: 25,
        y: 9,
        kind: "raidBrute",
        group: ["raidBrute", "gloomBat"],
        awareness: 7,
        unique: true,
        story: "raid",
        dir: "down",
        alert: 0,
      });
    }
  }

  canWalk(x, y, ignoreEnemy = false) {
    const m = this.currentMap();
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return false;
    if (!PASSABLE.has(m.tiles[y][x])) return false;
    if (
      m.id === "cave2" &&
      x === 25 &&
      y >= 13 &&
      y <= 19 &&
      !this.state.flags.waterLever
    )
      return false;
    if (m.npcs.some((npc) => npc.x === x && npc.y === y)) return false;
    if (m.chests.some((chest) => chest.x === x && chest.y === y)) return false;
    const blockingSpecial = m.specials.find(
      (special) =>
        special.x === x &&
        special.y === y &&
        [
          "campfire",
          "sign",
          "board",
          "save",
          "fountain",
          "groveShrine",
          "seal",
          "lever",
          "rope",
          "boss",
        ].includes(special.type),
    );
    if (blockingSpecial) return false;
    if (
      !ignoreEnemy &&
      this.mapEnemies.some((enemy) => enemy.x === x && enemy.y === y)
    )
      return false;
    return true;
  }

  tryMove(direction, immediate = false) {
    if (this.mode !== "map" || this.transitionDirection) return false;
    const now = performance.now();
    if (!immediate && now - this.lastMoveAt < 135) return false;
    if (immediate && now - this.lastMoveAt < 72) return false;
    this.lastMoveAt = now;
    this.state.dir = direction;
    const [dx, dy] = DIRS[direction];
    const nx = this.state.x + dx;
    const ny = this.state.y + dy;
    const enemy = this.mapEnemies.find((entry) => entry.x === nx && entry.y === ny);
    if (enemy) {
      const preemptive = enemy.dir === direction;
      this.startSymbolBattle(enemy, { preemptive });
      return true;
    }
    const warp = this.currentMap().warps.find((entry) => entry.x === nx && entry.y === ny);
    if (warp?.requires && !this.state.flags[warp.requires]) {
      this.audio.sfx("no");
      this.dialogue({
        speaker: "SYSTEM",
        portrait: "system",
        text: warp.denied || "今は先へ進めない。",
      });
      return false;
    }
    if (!this.canWalk(nx, ny)) {
      this.audio.sfx("no");
      this.refreshInteractPrompt();
      return false;
    }
    this.state.x = nx;
    this.state.y = ny;
    this.state.steps += 1;
    this.walkFrame += 1;
    if (this.state.lightSteps > 0) this.state.lightSteps -= 1;
    this.audio.sfx("step");
    this.checkDiscovery();
    if (warp) {
      this.useWarp(warp);
      return true;
    }
    this.chaseEnemies();
    this.refreshHud();
    this.refreshInteractPrompt();
    return true;
  }

  useWarp(warp) {
    const from = this.state.map;
    if (from === "solaido" && warp.to === "highroad" && this.state.flags.metKumi && !this.state.flags.raidWon && !this.state.flags.raidReady) {
      this.state.flags.raidReady = true;
      this.state.party.order = ["hero", "kumi"];
      this.dialogue(
        [
          { speaker: "門衛", portrait: "guard", text: "団長！　北門の外で魔物の群れが旅人を襲っています！" },
          { speaker: "空色の騎士団長", portrait: "kumi", text: "……あなたが敵の手先かどうか、戦場で見極める。ついてきて。" },
          { speaker: "SYSTEM", portrait: "system", text: "騎士団長が一時的に同行した。街道北側に強い魔物の気配がある。" },
        ],
        () => this.changeMap(warp.to, warp.tx, warp.ty, warp.dir),
      );
      return;
    }
    this.changeMap(warp.to, warp.tx, warp.ty, warp.dir);
  }

  changeMap(id, x, y, dir = "down") {
    this.transitionTo(() => {
      this.state.map = id;
      this.state.x = x;
      this.state.y = y;
      this.state.dir = dir;
      this.state.visited[id] = (this.state.visited[id] || 0) + 1;
      this.state.discoveries[id] = true;
      if (id === "solaido") {
        this.state.lastSafe = { map: id, x, y, dir };
        this.audio.play("town");
      } else if (["cave1", "cave2", "cave3", "oldWell"].includes(id)) {
        this.audio.play("cave");
        const floor = { oldWell: 1, cave1: 1, cave2: 2, cave3: 3 }[id] || 0;
        this.state.stats.deepestFloor = Math.max(this.state.stats.deepestFloor, floor);
      } else {
        this.audio.play(id === "echoGrove" ? "cave" : "field");
      }
      this.buildMapEnemies();
      this.setMode("map");
      this.refreshHud();
      this.refreshInteractPrompt();
      this.showArea();
      this.autosave();
    });
  }

  transitionTo(callback) {
    if (this.testFast) {
      callback();
      return;
    }
    this.transition = 0;
    this.transitionDirection = 1;
    this.transitionCallback = callback;
  }

  checkDiscovery() {
    const { map: id, x, y } = this.state;
    const reveal = (key, radius, px, py) => {
      if (Math.abs(x - px) + Math.abs(y - py) <= radius)
        this.state.discoveries[key] = true;
    };
    if (id === "highroad") {
      reveal("solaido", 8, 25, 2);
      reveal("echoGrove", 6, 8, 9);
      reveal("oldWell", 5, 14, 28);
      reveal("cave1", 8, 47, 7);
      if (x > 34) discoverRumor(this.state, "cave");
    }
  }

  chaseEnemies() {
    const candidates = shuffle([...this.mapEnemies]);
    for (const enemy of candidates) {
      const distance = Math.abs(enemy.x - this.state.x) + Math.abs(enemy.y - this.state.y);
      if (distance > (enemy.awareness || 3)) {
        enemy.alert = 0;
        continue;
      }
      if (!enemy.alert) {
        enemy.alert = 2;
        continue;
      }
      const dx = Math.sign(this.state.x - enemy.x);
      const dy = Math.sign(this.state.y - enemy.y);
      const axes =
        Math.abs(this.state.x - enemy.x) > Math.abs(this.state.y - enemy.y)
          ? [[dx, 0], [0, dy]]
          : [[0, dy], [dx, 0]];
      for (const [mx, my] of axes) {
        if (!mx && !my) continue;
        const nx = enemy.x + mx;
        const ny = enemy.y + my;
        enemy.dir = mx < 0 ? "left" : mx > 0 ? "right" : my < 0 ? "up" : "down";
        if (nx === this.state.x && ny === this.state.y) {
          this.startSymbolBattle(enemy, { ambush: enemy.dir === this.state.dir });
          return;
        }
        const occupied = this.mapEnemies.some(
          (other) => other !== enemy && other.x === nx && other.y === ny,
        );
        if (!occupied && this.canWalk(nx, ny, true)) {
          enemy.x = nx;
          enemy.y = ny;
          break;
        }
      }
    }
  }

  frontPosition() {
    const [dx, dy] = DIRS[this.state.dir];
    return [this.state.x + dx, this.state.y + dy];
  }

  findInteraction() {
    const [x, y] = this.frontPosition();
    const m = this.currentMap();
    const npc = m.npcs.find((entry) => entry.x === x && entry.y === y);
    if (npc) return { kind: "npc", value: npc, label: "話す" };
    const chest = m.chests.find((entry) => entry.x === x && entry.y === y);
    if (chest) return { kind: "chest", value: chest, label: "開ける" };
    const special = m.specials.find((entry) => entry.x === x && entry.y === y);
    if (special)
      return {
        kind: "special",
        value: special,
        label: ["shop", "inn", "church"].includes(special.type) ? "入る" : "調べる",
      };
    const currentSpecial = m.specials.find(
      (entry) => entry.x === this.state.x && entry.y === this.state.y,
    );
    if (currentSpecial)
      return { kind: "special", value: currentSpecial, label: "調べる" };
    return null;
  }

  refreshInteractPrompt() {
    if (this.mode !== "map") return;
    const interaction = this.findInteraction();
    this.ui.interactPrompt.classList.remove("hidden");
    this.ui.interactLabel.textContent = interaction?.label || "足踏み";
  }

  interact() {
    const interaction = this.findInteraction();
    if (!interaction) {
      this.waitTurn();
      return;
    }
    this.audio.sfx("ok");
    if (interaction.kind === "npc") this.talk(interaction.value);
    else if (interaction.kind === "chest") this.openChest(interaction.value);
    else this.useSpecial(interaction.value);
  }

  waitTurn() {
    if (this.mode !== "map" || this.transitionDirection) return false;
    this.state.steps += 1;
    if (this.state.lightSteps > 0) this.state.lightSteps -= 1;
    this.walkFrame += 1;
    this.audio.sfx("step");
    this.chaseEnemies();
    if (this.mode === "map") {
      this.refreshHud();
      this.refreshInteractPrompt();
      if (this.state.settings.hint !== "classic") this.toast("その場で様子を見た", 700);
    }
    return true;
  }

  openChest(chest) {
    const key = `${this.state.map}:${chest.id}`;
    if (this.state.opened[key]) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "宝箱は空だった。" });
      return;
    }
    this.state.opened[key] = true;
    this.state.stats.chests += 1;
    if (chest.loot.gold) this.state.gold += chest.loot.gold;
    if (chest.loot.item) addItem(this.state, chest.loot.item, chest.loot.qty || 1);
    this.audio.sfx("chest");
    this.dialogue(
      {
        speaker: "SYSTEM",
        portrait: "system",
        text: `${this.state.name}は宝箱を開けた。${chest.label}手に入れた！`,
      },
      () => {
        this.setMode("map");
        this.refreshHud();
        this.autosave();
      },
    );
  }

  talk(npc) {
    const id = npc.id;
    const simple = (speaker, portrait, text, after = null) =>
      this.dialogue({ speaker, portrait, text }, after);
    if (id === "kumi") {
      if (!this.state.flags.metKumi) {
        this.dialogue(
          [
            {
              speaker: "空色の騎士団長",
              portrait: "kumi",
              text: "見ない顔ね。城壁の外から来たそうだけど、所属と目的は？",
              choices: [
                {
                  label: "知っている人に似ている",
                  action: () => {
                    this.state.flags.metKumi = true;
                    this.state.rumors.cave = true;
                    this.state.rumors.grove = true;
                  },
                },
                {
                  label: "道に迷ってここへ来た",
                  action: () => {
                    this.state.flags.metKumi = true;
                    this.state.rumors.cave = true;
                  },
                },
              ],
            },
            {
              speaker: "空色の騎士団長",
              portrait: "kumi",
              text: "『佐々木久美』？　知らない名前。でも……胸の奥で何かが引っかかる。",
            },
            {
              speaker: "空色の騎士団長",
              portrait: "kumi",
              text: "今は魔物の出所を追っている。町で話を聞くなら止めない。ただし、怪しい動きはしないで。",
            },
            {
              speaker: "SYSTEM",
              portrait: "system",
              text: "騎士団長はまだ信用していないようだ。町の人々は、西の森と東の洞窟について話している。",
            },
          ],
          () => {
            this.state.stats.rumors = Object.values(this.state.rumors).filter(Boolean).length;
            this.setMode("map");
            this.refreshHud();
            this.autosave();
          },
        );
      } else if (!this.state.flags.raidWon) {
        simple(
          "空色の騎士団長",
          "kumi",
          "情報を集めたら、自分で確かめて。私は『誰かに言われたから』だけで動く人を信用しない。",
        );
      } else if (!this.state.flags.bossWon) {
        simple(
          "久美",
          "kumi",
          "空泣き洞は北東。けれど準備が足りないなら戻ろう。みんなを無事に連れて帰るのも、指揮のうちだから。",
        );
      } else {
        simple(
          "久美",
          "kumi",
          "あの号令を知っていた理由、まだ全部は思い出せない。でも今は、あなたと一緒に次の空を見たい。",
        );
      }
      return;
    }

    if (id === "gateCaptain") {
      const fresh = discoverRumor(this.state, "cave");
      simple(
        "門衛",
        "guard",
        "襲撃のたび、黒い影は川の東へ逃げる。青い岩肌の洞窟だ。橋を渡った先を探せ。" +
          (fresh ? "——『青く泣く洞窟』の噂を記録した。" : ""),
      );
    } else if (id === "townBard") {
      const fresh = discoverRumor(this.state, "grove");
      simple(
        "旅の楽師",
        "bard",
        "西の森は歌を返す。朝露草を踏まぬよう歩けば、森の奥の祠まで声が届くそうだ。" +
          (fresh ? "——『歌を返す森』の噂を記録した。" : ""),
      );
    } else if (id === "blacksmith") {
      this.openShop("armory");
    } else if (id === "itemKeeper") {
      this.openShop("item");
    } else if (id === "innkeeper") {
      this.openInn();
    } else if (id === "priest") {
      this.openChurch();
    } else if (id === "apothecary") {
      if (this.state.quests.dewMedicine === "locked") {
        this.state.quests.dewMedicine = "active";
        discoverRumor(this.state, "grove");
        this.dialogue([
          {
            speaker: "薬師セナ",
            portrait: "elder",
            text: "ため息をつく人が増えてね。こだまの森の朝露草が3枚あれば、心を守る薬が作れるんだが。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "サブクエスト『笑顔を戻す薬』を引き受けた。",
          },
        ]);
      } else if (
        this.state.quests.dewMedicine === "active" &&
        (this.state.inventory.dewleaf || 0) >= 3
      ) {
        removeItem(this.state, "dewleaf", 3);
        addItem(this.state, "brightBell", 1);
        this.state.quests.dewMedicine = "complete";
        this.state.stats.sidequests += 1;
        discoverRumor(this.state, "barrier");
        this.dialogue([
          {
            speaker: "薬師セナ",
            portrait: "elder",
            text: "十分だよ。これは『光鳴りの鈴』。恐怖を払い、暗い力の膜さえ揺らす。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "光鳴りの鈴を手に入れた！",
          },
        ]);
      } else if (this.state.quests.dewMedicine === "active") {
        simple(
          "薬師セナ",
          "elder",
          `朝露草は西のこだまの森にある。あと${Math.max(0, 3 - (this.state.inventory.dewleaf || 0))}枚だね。`,
        );
      } else {
        simple("薬師セナ", "elder", "鈴の光は一度きりだ。恐怖や大技に飲まれそうな時を選んで鳴らすといい。");
      }
    } else if (id === "lostChild") {
      if (this.state.quests.lostRibbon === "locked") {
        this.state.quests.lostRibbon = "active";
        discoverRumor(this.state, "well");
        this.dialogue([
          {
            speaker: "ミナ",
            portrait: "child",
            text: "空色のリボンを落としちゃった。水路に流れて、南の古い井戸へ行ったって……。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "サブクエスト『空色の落とし物』を引き受けた。",
          },
        ]);
      } else if (
        this.state.quests.lostRibbon === "active" &&
        (this.state.inventory.skyRibbon || 0) > 0
      ) {
        removeItem(this.state, "skyRibbon", 1);
        this.state.gold += 120;
        addItem(this.state, "captainCharm", 1);
        this.state.quests.lostRibbon = "complete";
        this.state.stats.sidequests += 1;
        this.dialogue([
          {
            speaker: "ミナ",
            portrait: "child",
            text: "これ！　お姉ちゃんがくれた大切なリボン！　ありがとう！",
          },
          {
            speaker: "ミナの母",
            portrait: "town2",
            text: "危ない場所まで……。お礼に120ゴールドと、このお守りを受け取ってください。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "120ゴールドと団結のお守りを手に入れた！",
          },
        ]);
      } else if (this.state.quests.lostRibbon === "active") {
        simple("ミナ", "child", "野営地の西に、崩れた石の井戸があるって聞いたよ。");
      } else {
        simple("ミナ", "child", "リボンを見ると元気が出るの。冒険者さんにも、元気を分けるね！");
      }
    } else if (id === "oldSoldier") {
      const fresh = discoverRumor(this.state, "hiddenWall");
      simple(
        "古参兵",
        "soldier",
        "昔、空泣き洞で警備をした。水脈の階では、灯りが急に消える石壁を押してみろ。風が抜けている。" +
          (fresh ? "——『風が抜ける石壁』の噂を記録した。" : ""),
      );
    } else if (id === "fisher") {
      simple(
        "水路の漁師",
        "fisher",
        "川向こうは魔物が強い。だがヨロイガニの殻は風に弱い。硬い相手ほど、弱点を探すんだ。",
      );
    } else if (id === "scholar") {
      const fresh = discoverRumor(this.state, "barrier");
      simple(
        "王国史家",
        "古文書には『笑顔を喰らうものは、孤立を鎧とする』とある。影を離すか、皆の声を合わせればよい。" +
          (fresh ? "——『笑顔を拒む暗い膜』の噂を記録した。" : ""),
      );
    } else if (id === "townspersonA") {
      simple(
        "町のパン職人",
        "town",
        "西の国ミレリアから麦が届かなくなってね。騒ぎが収まったら、あの国の様子も気になるな。",
      );
    } else if (id === "townspersonB") {
      simple(
        "散歩中の女性",
        "town2",
        "装備は攻撃力だけじゃないわ。盾で恐怖を防ぐか、指輪で先に動くか。選び方で戦いは変わるの。",
      );
    } else if (id === "campMerchant") {
      this.openShop("camp");
    } else if (id === "roadPilgrim") {
      simple(
        "巡礼の旅人",
        "pilgrim",
        "危険を感じたら帰るんだ。洞窟で得た宝は、戻って初めて旅の力になる。逃げるのは敗北じゃない。",
      );
    } else if (id === "bridgeGuard") {
      if (!this.state.flags.raidWon)
        simple("巡回兵", "guard", "橋の東は危険だ。行くなら薬草と風渡りの羽を持て。止めはしない。");
      else simple("巡回兵", "guard", "団長と共闘した旅人だな。空泣き洞は北東、青岩の奥だ。");
    } else if (id === "caveScout") {
      simple(
        "斥候",
        "scout",
        "B1までは入れる。だが奥は蒼い封印だ。騎士団の紋章がなければ開かない。",
      );
    } else if (id === "groveHermit") {
      simple(
        "森の隠者",
        "hermit",
        this.state.flags.groveEliteWon
          ? "夜帳の羽音が消え、森がまた声を返している。祠を調べてみるといい。"
          : "祠を夜帳のモスが塞いだ。光の技があれば有利だが、装備と薬草で耐える道もある。",
      );
    } else if (id === "groveSpirit") {
      simple(
        "小さな精霊",
        "spirit",
        "きらきらの草、三つ集める？　町のおばあちゃん、笑う。森も、うれしい。",
      );
    } else if (id === "lostMiner") {
      if (!this.state.flags.minerFound) {
        this.state.flags.minerFound = true;
        this.state.flags.ironDiscount = true;
        this.state.quests.lostMiner = "complete";
        this.state.stats.sidequests += 1;
        this.dialogue([
          {
            speaker: "迷った坑夫",
            portrait: "miner",
            text: "助かった！　出口を見失って三日だ。青空武具店に、君へ槍を安く売るよう伝えておく。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "サブクエスト『帰らない坑夫』を達成した。鉄の槍が値下げされた。",
          },
        ]);
      } else {
        simple("坑夫", "miner", "私はもう戻る。君も灯りと体力を忘れるなよ。");
      }
    }
  }

  useSpecial(special) {
    if (special.type === "shop") {
      this.openShop(special.shop);
    } else if (special.type === "inn") {
      this.openInn();
    } else if (special.type === "church") {
      this.openChurch();
    } else if (special.type === "save") {
      this.showSavePicker("map");
    } else if (special.type === "board") {
      this.dialogue([
        {
          speaker: "掲示板",
          portrait: "system",
          text: "『坑夫レム、三日前より行方不明。空泣き洞B1の調査中。発見者は武具店へ知らせられたし』",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "サブクエスト『帰らない坑夫』を記録した。",
        },
      ]);
      if (this.state.quests.lostMiner === "locked") this.state.quests.lostMiner = "active";
    } else if (special.type === "campfire") {
      if (this.state.flags.campRested) {
        this.dialogue({
          speaker: "SYSTEM",
          portrait: "system",
          text: "薪は燃え尽きている。ここではもう休めない。",
        });
        return;
      }
      this.state.flags.campRested = true;
      const party = activeParty(this.state);
      for (const member of party) {
        member.hp = Math.min(maxHp(member), member.hp + Math.ceil(maxHp(member) * 0.35));
      }
      this.state.lastSafe = {
        map: this.state.map,
        x: this.state.x,
        y: this.state.y,
        dir: this.state.dir,
      };
      this.audio.sfx("heal");
      this.dialogue(
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "残っていた薪で一度だけ休んだ。HPが少し回復したが、MPは戻らなかった。",
        },
        () => {
          this.setMode("map");
          this.refreshHud();
          this.autosave();
        },
      );
    } else if (special.type === "fountain") {
      const hero = this.state.party.hero;
      hero.hp = Math.min(maxHp(hero), hero.hp + 12);
      this.audio.sfx("heal");
      this.toast("澄んだ水でHPが12回復した");
    } else if (special.type === "sign") {
      this.dialogue({ speaker: "道しるべ", portrait: "system", text: special.text });
    } else if (special.type === "gather") {
      const key = `${this.state.map}:${special.id}`;
      if (this.state.gathered[key]) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "採取できそうな草はもうない。" });
      } else {
        this.state.gathered[key] = true;
        addItem(this.state, special.item, special.qty || 1);
        this.audio.sfx("ok");
        this.dialogue({
          speaker: "SYSTEM",
          portrait: "system",
          text: `${ITEMS[special.item].name}を${special.qty || 1}個採取した。`,
        });
      }
    } else if (special.type === "groveShrine") {
      if (!this.state.flags.groveEliteWon) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "巨大な羽音が祠への道を塞いでいる。" });
      } else if (!this.state.gathered["echoGrove:shrine"]) {
        this.state.gathered["echoGrove:shrine"] = true;
        addItem(this.state, "brightBell", 1);
        discoverRumor(this.state, "barrier");
        this.dialogue([
          { speaker: "森のこだま", portrait: "spirit", text: "ひとりの声が、ふたりの声になった。暗い膜を揺らす音、持っていって。" },
          { speaker: "SYSTEM", portrait: "system", text: "光鳴りの鈴を手に入れた！" },
        ]);
      } else {
        this.dialogue({ speaker: "森のこだま", portrait: "spirit", text: "森はあなたの声を覚えている。" });
      }
    } else if (special.type === "seal") {
      this.dialogue({
        speaker: "SYSTEM",
        portrait: "system",
        text: this.state.flags.skySigil
          ? "騎士団の蒼い紋章が輝き、封印は開いている。"
          : "冷たい蒼光が道を閉ざしている。騎士団と同じ紋章が刻まれている。",
      });
    } else if (special.type === "lever") {
      if (this.state.flags.waterLever) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "水門のレバーはすでに下りている。" });
      } else {
        this.state.flags.waterLever = true;
        this.audio.sfx("save");
        this.dialogue({
          speaker: "SYSTEM",
          portrait: "system",
          text: "レバーを下げた。轟音とともに水位が下がり、石橋が渡れるようになった！",
        });
      }
    } else if (special.type === "rope") {
      if (this.state.flags.caveRope) {
        this.dialogue(
          { speaker: "SYSTEM", portrait: "system", text: "丈夫なロープを登り、B1の足場へ戻った。" },
          () => this.changeMap("cave1", 20, 13, "down"),
        );
      } else {
        this.state.flags.caveRope = true;
        this.audio.sfx("save");
        this.dialogue({
          speaker: "SYSTEM",
          portrait: "system",
          text: "古い巻き上げ機にロープを結んだ。B1との近道が使えるようになった。",
        });
      }
    } else if (special.type === "shortcut") {
      if (!this.state.flags[special.requires]) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "上から風が来る。ロープを下ろせれば近道になりそうだ。" });
      } else {
        if (special.to)
          this.changeMap(special.to, special.target[0], special.target[1], "down");
        else [this.state.x, this.state.y] = special.target;
        this.toast("ロープの近道を使った");
      }
    } else if (special.type === "hiddenWall") {
      this.state.x = special.target[0];
      this.state.y = special.target[1];
      this.audio.sfx("save");
      this.toast("石壁の向こうに旧坑道を見つけた！");
    } else if (special.type === "bridgeGate") {
      this.dialogue({
        speaker: "SYSTEM",
        portrait: "system",
        text: this.state.flags.waterLever
          ? "水位が下がり、橋を渡れる。"
          : "激しい水流で橋に近づけない。どこかに水門があるはずだ。",
      });
    } else if (special.type === "boss") {
      this.startChapterBoss();
    }
  }

  openInn() {
    const cost = 24;
    this.panelContext = { type: "inn", returnMode: "map" };
    this.ui.panelEyebrow.textContent = "INN";
    this.ui.panelTitle.textContent = "青鳥亭";
    this.ui.panelGold.textContent = `${this.state.gold} G`;
    this.ui.panelBody.innerHTML = `
      <div class="info-card">
        <h3>ひと晩 ${cost}ゴールド</h3>
        <p>仲間全員のHPとMP、状態異常を完全に回復します。休むと街道や洞窟の魔物も戻ります。</p>
        <div class="inline-actions">
          <button data-panel="inn-stay" ${this.state.gold < cost ? "disabled" : ""}>泊まる</button>
          <button data-panel="close">やめる</button>
        </div>
      </div>`;
    this.setMode("panel");
  }

  openChurch() {
    const fallen = activeParty(this.state).filter((member) => member.hp <= 0);
    const cost = fallen.length * 20;
    this.panelContext = { type: "church", returnMode: "map" };
    this.ui.panelEyebrow.textContent = "SANCTUARY";
    this.ui.panelTitle.textContent = "風鐘の礼拝堂";
    this.ui.panelGold.textContent = `${this.state.gold} G`;
    this.ui.panelBody.innerHTML = `
      <div class="info-card">
        <h3>${fallen.length ? `倒れた仲間を祈りで戻す：${cost} G` : "風鐘は静かに鳴っている"}</h3>
        <p>${fallen.length ? "倒れた仲間をHP半分で復帰させます。" : "今は倒れている仲間はいません。冒険の書への記録もできます。"}</p>
        <div class="inline-actions">
          <button data-panel="church-heal" ${!fallen.length || this.state.gold < cost ? "disabled" : ""}>祈る</button>
          <button data-panel="church-save">冒険の書</button>
          <button data-panel="close">やめる</button>
        </div>
      </div>`;
    this.setMode("panel");
  }

  openShop(shopId) {
    this.panelContext = { type: "shop", shopId, tab: "buy", returnMode: "map" };
    this.setMode("panel");
    this.renderShop();
  }

  renderShop() {
    const { shopId, tab } = this.panelContext;
    const shop = SHOPS[shopId];
    this.ui.panelEyebrow.textContent = "SHOP";
    this.ui.panelTitle.textContent = shop.name;
    this.ui.panelGold.textContent = `${this.state.gold} G`;
    const rows =
      tab === "buy"
        ? shop.goods
            .map((id) => {
              const item = ITEMS[id];
              const price =
                id === "ironSpear" && this.state.flags.ironDiscount
                  ? 108
                  : item.price;
              return `<div class="list-row">
                <div><h3>${item.name} <span class="tag gold">${price} G</span></h3><p>${item.description}</p></div>
                <button data-buy="${id}" data-price="${price}" ${this.state.gold < price ? "disabled" : ""}>買う</button>
              </div>`;
            })
            .join("")
        : Object.entries(this.state.inventory)
            .filter(([id, qty]) => qty > 0 && ITEMS[id]?.sell > 0)
            .map(([id, qty]) => {
              const item = ITEMS[id];
              return `<div class="list-row">
                <div><h3>${item.name} ×${qty} <span class="tag gold">${item.sell} G</span></h3><p>${item.description}</p></div>
                <button data-sell="${id}">売る</button>
              </div>`;
            })
            .join("") || `<div class="info-card"><p>売れる品を持っていない。</p></div>`;
    this.ui.panelBody.innerHTML = `
      <nav class="panel-tabs">
        <button data-shop-tab="buy" class="${tab === "buy" ? "selected" : ""}">買う</button>
        <button data-shop-tab="sell" class="${tab === "sell" ? "selected" : ""}">売る</button>
      </nav>
      <div class="list">${rows}</div>`;
  }

  handlePanelClick(event) {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.panel === "close") return this.closePanel();
    if (target.dataset.shopTab) {
      this.panelContext.tab = target.dataset.shopTab;
      this.renderShop();
    } else if (target.dataset.buy) {
      const id = target.dataset.buy;
      const price = Number(target.dataset.price);
      if (this.state.gold < price) return this.audio.sfx("no");
      this.state.gold -= price;
      addItem(this.state, id, 1);
      this.audio.sfx("ok");
      this.toast(`${ITEMS[id].name}を買った`);
      this.renderShop();
      this.refreshHud();
    } else if (target.dataset.sell) {
      const id = target.dataset.sell;
      if (!removeItem(this.state, id, 1)) return;
      this.state.gold += ITEMS[id].sell;
      this.audio.sfx("ok");
      this.toast(`${ITEMS[id].name}を売った`);
      this.renderShop();
      this.refreshHud();
    } else if (target.dataset.panel === "inn-stay") {
      if (this.state.gold < 12) return;
      this.state.gold -= 12;
      fullHeal(this.state);
      this.state.lastSafe = { map: "solaido", x: 19, y: 27, dir: "up" };
      this.buildMapEnemies();
      this.audio.sfx("heal");
      this.closePanel();
      this.dialogue(
        { speaker: "宿屋の主人", portrait: "inn", text: "よく休めましたか？　空が明るいうちにお気をつけて。" },
        () => {
          this.setMode("map");
          this.autosave();
          this.refreshHud();
        },
      );
    } else if (target.dataset.panel === "church-heal") {
      const fallen = activeParty(this.state).filter((member) => member.hp <= 0);
      const cost = fallen.length * 20;
      if (!fallen.length || this.state.gold < cost) return;
      this.state.gold -= cost;
      for (const member of fallen) member.hp = Math.ceil(maxHp(member) / 2);
      this.audio.sfx("heal");
      this.openChurch();
    } else if (target.dataset.panel === "church-save") {
      this.showSavePicker("panel");
    }
  }

  closePanel() {
    const returnMode = this.panelContext?.returnMode || "map";
    this.panelContext = null;
    this.setMode(returnMode);
    if (returnMode === "map") {
      this.refreshHud();
      this.refreshInteractPrompt();
    }
  }

  startSymbolBattle(symbol, opening = {}) {
    const group = symbol.group || [symbol.kind];
    this.startBattle(group, {
      ...opening,
      symbol,
      story: symbol.story,
      canEscape: !symbol.story && !ENEMIES[symbol.kind]?.boss,
    });
  }

  startBattle(group, options = {}) {
    if (this.mode === "battle") return;
    const counts = {};
    for (const id of group) counts[id] = (counts[id] || 0) + 1;
    const seen = {};
    const enemies = group.map((id, index) => {
      const base = ENEMIES[id];
      seen[id] = (seen[id] || 0) + 1;
      const suffix =
        counts[id] > 1
          ? ` ${String.fromCharCode(64 + seen[id])}`
          : "";
      return {
        ...deepClone(base),
        id: `enemy-${index}`,
        kind: id,
        name: `${base.name}${suffix}`,
        maxHp: base.hp,
        status: {},
        guarding: false,
        hurtAt: 0,
        battleIndex: index,
      };
    });
    for (const member of activeParty(this.state)) member.status = {};
    this.battle = {
      enemies,
      options,
      plans: [],
      actorIndex: 0,
      round: 1,
      phase: "opening",
      submenu: null,
      pending: null,
      selectedButton: 0,
      barrier: group.includes("smileEater"),
      barrierBrokenRounds: 0,
      telegraph: null,
      enemyIntents: [],
      formation: false,
      log: options.preemptive
        ? "背後を取った！　こちらが先に動ける。"
        : options.ambush
          ? "魔物に不意を突かれた！"
          : `${enemies.map((enemy) => enemy.name).join("、")}が現れた！`,
    };
    this.state.battles += 1;
    this.setMode("battle");
    this.audio.play(group.includes("smileEater") || group.includes("gloomMoth") ? "boss" : "battle");
    this.renderBattleUi();
    if (options.ambush) {
      this.battle.phase = "resolve";
      this.delay(420, () => this.resolveEnemyOpening());
    } else {
      this.delay(260, () => this.beginPlanning());
    }
  }

  resolveEnemyOpening() {
    if (!this.battle) return;
    const queue = this.battle.enemies
      .filter((enemy) => enemy.hp > 0)
      .map((enemy) => ({
        side: "enemy",
        actor: enemy,
        action: this.chooseEnemyAction(enemy, true),
        speed: enemy.spd + Math.random() * 4,
      }))
      .sort((a, b) => b.speed - a.speed);
    this.executeQueue(queue, 0, () => {
      if (this.partyDefeated()) this.finishDefeat();
      else this.beginPlanning();
    });
  }

  beginPlanning() {
    if (!this.battle) return;
    this.battle.phase = "plan";
    this.battle.plans = [];
    this.battle.actorIndex = 0;
    this.battle.submenu = null;
    this.battle.pending = null;
    const alive = activeParty(this.state).filter((member) => member.hp > 0);
    if (!alive.length) return this.finishDefeat();
    this.battle.planningActors = alive.map((member) => member.id);
    this.battle.enemyIntents = this.battle.enemies
      .filter((enemy) => enemy.hp > 0)
      .map((enemy) => ({ enemy, action: this.chooseEnemyAction(enemy) }));
    const danger = this.battle.enemyIntents
      .filter(({ action }) => !["attack", "guard"].includes(action))
      .map(({ enemy, action }) => `${enemy.name}：${this.enemyIntentLabel(action)}`)
      .join("／");
    this.battle.log =
      this.battle.telegraph === "sigh"
        ? "笑顔喰らいは大きく息を吸い込んでいる……！"
        : danger
          ? `${danger}　— ${alive[0].name}の行動を選んでください。`
          : `${alive[0].name}の行動を選んでください。`;
    this.renderBattleUi();
    this.renderBattleCommands();
  }

  currentBattleActor() {
    if (!this.battle) return null;
    const id = this.battle.planningActors?.[this.battle.actorIndex];
    return id ? this.state.party[id] : null;
  }

  renderBattleCommands(view = "root") {
    if (!this.battle || this.battle.phase !== "plan") return;
    const actor = this.currentBattleActor();
    if (!actor) return this.resolveRound();
    this.battle.submenu = view === "root" ? null : view;
    this.ui.battleCommands.replaceChildren();
    const add = (label, data, disabled = false, description = "") => {
      const button = document.createElement("button");
      button.innerHTML = description
        ? `${label}<small>${description}</small>`
        : label;
      for (const [key, value] of Object.entries(data)) button.dataset[key] = value;
      button.disabled = disabled;
      this.ui.battleCommands.append(button);
    };
    if (view === "root") {
      add("たたかう", { battle: "attack" });
      add("スキル", { battle: "skills" });
      add("どうぐ", { battle: "items" });
      add("ぼうぎょ", { battle: "guard" });
      add(
        "にげる",
        { battle: "escape" },
        !this.battle.options.canEscape || this.battle.actorIndex > 0,
      );
      add(
        "必殺技",
        { battle: "finisher" },
        this.state.happy < 100,
        `${this.state.happy}/100`,
      );
    } else if (view === "skills") {
      Object.entries(SKILLS)
        .filter(
          ([, skill]) =>
            skill.owner === actor.id &&
            actor.level >= skill.level &&
            !skill.happy,
        )
        .forEach(([id, skill]) =>
          add(
            skill.name,
            { skill: id },
            actor.mp < skill.mp,
            `MP ${skill.mp}｜${skill.description}`,
          ),
        );
      add("もどる", { battle: "back" });
    } else if (view === "items") {
      const usable = ["herb", "moonwort", "auraDrop", "brightBell", "smokeBomb"];
      for (const id of usable) {
        const count = this.state.inventory[id] || 0;
        add(
          ITEMS[id].name,
          { item: id },
          count <= 0 || (id === "smokeBomb" && !this.battle.options.canEscape),
          `×${count}｜${ITEMS[id].description}`,
        );
      }
      add("もどる", { battle: "back" });
    } else if (view === "targets") {
      const pending = this.battle.pending;
      if (pending.targetType === "enemy") {
        this.battle.enemies
          .filter((enemy) => enemy.hp > 0)
          .forEach((enemy) =>
            add(enemy.name, { targetEnemy: enemy.id }, false, this.enemyCondition(enemy)),
          );
      } else {
        activeParty(this.state).forEach((member) =>
          add(
            member.name,
            { targetAlly: member.id },
            pending.id === "herb" && member.hp <= 0,
            `HP ${member.hp}/${maxHp(member)}　MP ${member.mp}/${member.maxMp}`,
          ),
        );
      }
      add("もどる", { battle: "back" });
    }
    const first = this.ui.battleCommands.querySelector("button:not(:disabled)");
    first?.classList.add("selected");
    this.renderBattleUi();
  }

  handleBattleButton(button) {
    if (!this.battle || this.battle.phase !== "plan") return;
    this.audio.sfx("ok");
    const action = button.dataset.battle;
    if (action === "back") return this.renderBattleCommands();
    if (action === "skills") return this.renderBattleCommands("skills");
    if (action === "items") return this.renderBattleCommands("items");
    if (action === "attack") {
      this.battle.pending = { type: "attack", targetType: "enemy" };
      return this.chooseOrCommitTarget();
    }
    if (action === "guard") return this.commitPlan({ type: "guard" });
    if (action === "escape") return this.commitPlan({ type: "escape" });
    if (action === "finisher") {
      this.battle.pending = {
        type: "skill",
        id: "promiseAura",
        targetType: "allEnemies",
      };
      return this.commitPlan(this.battle.pending);
    }
    if (button.dataset.skill) {
      const id = button.dataset.skill;
      const skill = SKILLS[id];
      this.battle.pending = { type: "skill", id, targetType: skill.target };
      return this.chooseOrCommitTarget();
    }
    if (button.dataset.item) {
      const id = button.dataset.item;
      const targetType = ["herb", "moonwort", "auraDrop"].includes(id)
        ? "ally"
        : id === "smokeBomb"
          ? "none"
          : "allAllies";
      this.battle.pending = { type: "item", id, targetType };
      return this.chooseOrCommitTarget();
    }
    if (button.dataset.targetEnemy) {
      return this.commitPlan({
        ...this.battle.pending,
        target: button.dataset.targetEnemy,
      });
    }
    if (button.dataset.targetAlly) {
      return this.commitPlan({
        ...this.battle.pending,
        target: button.dataset.targetAlly,
      });
    }
  }

  chooseOrCommitTarget() {
    const pending = this.battle.pending;
    if (["allAllies", "allEnemies", "none"].includes(pending.targetType))
      return this.commitPlan(pending);
    const choices =
      pending.targetType === "enemy"
        ? this.battle.enemies.filter((enemy) => enemy.hp > 0)
        : activeParty(this.state);
    if (choices.length === 1)
      return this.commitPlan({
        ...pending,
        target: pending.targetType === "enemy" ? choices[0].id : choices[0].id,
      });
    this.renderBattleCommands("targets");
  }

  commitPlan(plan) {
    const actor = this.currentBattleActor();
    if (!actor) return;
    this.battle.plans.push({ ...plan, actorId: actor.id });
    this.battle.actorIndex += 1;
    this.battle.pending = null;
    this.battle.submenu = null;
    const next = this.currentBattleActor();
    if (next) {
      this.battle.log = `${next.name}の行動を選んでください。`;
      this.renderBattleCommands();
    } else {
      this.resolveRound();
    }
  }

  resolveRound() {
    if (!this.battle) return;
    this.battle.phase = "resolve";
    this.ui.battleCommands.innerHTML = "";
    const partyActions = this.battle.plans
      .map((plan) => {
        const actor = this.state.party[plan.actorId];
        return {
          side: "party",
          actor,
          action: plan,
          speed: this.effectiveStat(actor, "spd") + Math.random() * 7,
        };
      })
      .filter((entry) => entry.actor?.hp > 0);
    const enemyActions =
      this.battle.options.preemptive && this.battle.round === 1
        ? []
        : this.battle.enemyIntents
            .filter(({ enemy }) => enemy.hp > 0)
            .map(({ enemy, action }) => ({
              side: "enemy",
              actor: enemy,
              action,
              speed: this.enemyStat(enemy, "spd") + Math.random() * 6,
            }));
    const queue = [...partyActions, ...enemyActions].sort((a, b) => b.speed - a.speed);
    this.executeQueue(queue, 0, () => this.finishRound());
  }

  executeQueue(queue, index, done) {
    if (!this.battle) return;
    if (index >= queue.length) {
      done();
      return;
    }
    const entry = queue[index];
    if (entry.actor.hp <= 0) return this.executeQueue(queue, index + 1, done);
    if (entry.side === "party" && this.enemiesDefeated())
      return this.executeQueue(queue, queue.length, done);
    if (entry.side === "enemy" && this.partyDefeated())
      return this.executeQueue(queue, queue.length, done);
    if (entry.side === "party") this.executePartyAction(entry.actor, entry.action);
    else this.executeEnemyAction(entry.actor, entry.action);
    this.renderBattleUi();
    this.delay(430, () => this.executeQueue(queue, index + 1, done));
  }

  executePartyAction(actor, action) {
    if (actor.status.fear && Math.random() < 0.2) {
      this.battle.log = `${actor.name}は恐怖で足がすくんだ！`;
      this.audio.sfx("no");
      return;
    }
    if (action.type === "attack") {
      const target = this.findEnemyTarget(action.target);
      if (!target) return;
      const damage = this.calculateDamage(
        this.effectiveStat(actor, "atk"),
        this.enemyStat(target, "def"),
        1,
      );
      this.hitEnemy(target, damage, "physical");
      this.state.happy = clamp(this.state.happy + 2, 0, 100);
      this.battle.log = `${actor.name}の攻撃！　${target.name}に${damage}のダメージ。`;
    } else if (action.type === "guard") {
      actor.status.guard = 1;
      this.state.happy = clamp(this.state.happy + 6, 0, 100);
      this.battle.log = `${actor.name}は身を固め、仲間の声に耳を澄ませた。`;
    } else if (action.type === "escape") {
      const chance = 0.62 + (this.effectiveStat(actor, "spd") / 100);
      if (Math.random() < chance) {
        this.battle.log = "魔物との間合いを切り、戦いから離れた！";
        this.delay(260, () => this.exitBattle(true));
      } else {
        this.battle.log = "逃げ道を塞がれた！";
        this.audio.sfx("no");
      }
    } else if (action.type === "skill") {
      this.executeSkill(actor, action);
    } else if (action.type === "item") {
      this.executeBattleItem(actor, action);
    }
  }

  executeSkill(actor, action) {
    const skill = SKILLS[action.id];
    if (!skill) return;
    if (skill.happy) {
      if (this.state.happy < skill.happy) {
        this.battle.log = "ハッピーゲージが足りない！";
        return;
      }
      this.state.happy = 0;
      let total = 0;
      for (const enemy of this.battle.enemies.filter((entry) => entry.hp > 0)) {
        const damage = this.calculateDamage(
          this.effectiveStat(actor, "atk") + this.effectiveStat(actor, "mag"),
          this.enemyStat(enemy, "def"),
          1.55,
        );
        total += damage;
        this.hitEnemy(enemy, damage, "light");
      }
      for (const member of activeParty(this.state)) {
        const heal = Math.ceil(maxHp(member) * 0.38);
        member.hp = Math.min(maxHp(member), member.hp + heal);
        member.status.fear = 0;
        member.status.auraDown = 0;
        this.state.stats.healingDone += heal;
      }
      this.battle.barrierBrokenRounds = Math.max(3, this.battle.barrierBrokenRounds);
      this.battle.log = `約束のハッピーオーラ！　光が闇を包み、合計${total}のダメージ！`;
      this.audio.sfx("win");
      this.flash();
      return;
    }
    if (actor.mp < skill.mp) {
      this.battle.log = `${actor.name}のMPが足りない！`;
      return;
    }
    actor.mp -= skill.mp;
    if (skill.effect === "cheer") {
      const target = this.state.party[action.target];
      if (!target) return;
      target.status.atkUp = 3;
      target.status.magUp = 3;
      this.state.happy = clamp(this.state.happy + 12, 0, 100);
      this.battle.log = `${actor.name}の推しの声援！　${target.name}の力が湧き上がる。`;
      this.audio.sfx("magic");
    } else if (skill.effect === "heal") {
      const target = this.state.party[action.target];
      if (!target || target.hp <= 0) return;
      const amount = Math.ceil(skill.power + this.effectiveStat(actor, "mag") * 0.8);
      const healed = Math.min(amount, maxHp(target) - target.hp);
      target.hp += healed;
      this.state.happy = clamp(this.state.happy + 11, 0, 100);
      this.state.stats.healingDone += healed;
      this.battle.log = `${actor.name}のヒールコール！　${target.name}のHPが${healed}回復。`;
      this.audio.sfx("heal");
    } else if (skill.effect === "haste") {
      for (const member of activeParty(this.state)) {
        member.status.haste = 3;
        member.status.defUp = Math.max(member.status.defUp || 0, 2);
      }
      this.state.happy = clamp(this.state.happy + 15, 0, 100);
      this.battle.log = "コール＆レスポンス！　味方全体の動きと士気が上がった。";
      this.audio.sfx("magic");
    } else if (skill.effect === "captain") {
      for (const member of activeParty(this.state)) {
        member.status.atkUp = 2;
        member.status.defUp = 2;
      }
      this.battle.barrierBrokenRounds = Math.max(1, this.battle.barrierBrokenRounds);
      this.state.happy = clamp(this.state.happy + 10, 0, 100);
      this.battle.log = "キャプテンコール！　全員の攻撃と守備が上がり、暗い障壁が一瞬揺らぐ！";
      this.audio.sfx("magic");
      this.flash();
    } else if (skill.effect === "formation") {
      for (const member of activeParty(this.state)) member.status.formation = 1;
      this.state.happy = clamp(this.state.happy + 14, 0, 100);
      this.battle.log = "鉄壁のフォーメーション！　味方全体が攻撃に備えた。";
      this.audio.sfx("magic");
    } else {
      const target = this.findEnemyTarget(action.target);
      if (!target) return;
      const attack =
        this.effectiveStat(actor, "atk") +
        Math.floor(this.effectiveStat(actor, "mag") * 0.25);
      let multiplier = skill.power || 1.4;
      if (target.weakness === skill.element) multiplier *= 1.38;
      const damage = this.calculateDamage(attack, this.enemyStat(target, "def"), multiplier);
      this.hitEnemy(target, damage, skill.element);
      this.state.happy = clamp(this.state.happy + 8, 0, 100);
      this.battle.log = `${actor.name}の${skill.name}！　${target.name}に${damage}のダメージ。`;
      this.audio.sfx("hit");
    }
  }

  executeBattleItem(_actor, action) {
    if (!removeItem(this.state, action.id, 1)) {
      this.battle.log = "その道具はもう持っていない！";
      return;
    }
    const item = ITEMS[action.id];
    if (action.id === "herb") {
      const target = this.state.party[action.target];
      const healed = Math.min(35, maxHp(target) - target.hp);
      target.hp += healed;
      this.state.stats.healingDone += healed;
      this.state.happy = clamp(this.state.happy + 7, 0, 100);
      this.battle.log = `${target.name}のHPが${healed}回復した。`;
      this.audio.sfx("heal");
    } else if (action.id === "moonwort") {
      const target = this.state.party[action.target];
      target.status.poison = 0;
      target.status.fear = 0;
      target.status.auraDown = 0;
      this.battle.log = `${target.name}を包む不調が消えた。`;
      this.audio.sfx("heal");
    } else if (action.id === "auraDrop") {
      const target = this.state.party[action.target];
      const restored = Math.min(18, target.maxMp - target.mp);
      target.mp += restored;
      this.battle.log = `${target.name}のMPが${restored}回復した。`;
      this.audio.sfx("magic");
    } else if (action.id === "brightBell") {
      for (const member of activeParty(this.state)) {
        member.status.fear = 0;
        member.status.auraDown = 0;
        member.status.bright = 3;
      }
      this.battle.barrierBrokenRounds = Math.max(3, this.battle.barrierBrokenRounds);
      this.state.happy = clamp(this.state.happy + 20, 0, 100);
      this.battle.log = "光鳴りの鈴が響いた！　恐怖が消え、暗い障壁が裂ける！";
      this.audio.sfx("magic");
      this.flash();
    } else if (action.id === "smokeBomb") {
      this.battle.log = `${item.name}が白い煙を広げた。戦いから離脱した！`;
      this.delay(220, () => this.exitBattle(true));
    }
  }

  chooseEnemyAction(enemy, opening = false) {
    if (enemy.kind === "smileEater") {
      if (this.battle.telegraph === "sigh") return "sigh";
      if (this.battle.round % 3 === 2) return "telegraph";
      if (this.state.happy >= 35 && this.battle.round % 3 === 1) return "smileDrain";
      return this.battle.round % 2 ? "darkWhisper" : "attack";
    }
    if (opening) return "attack";
    if (enemy.pattern?.length)
      return enemy.pattern[
        (this.battle.round - 1 + (enemy.battleIndex || 0)) % enemy.pattern.length
      ];
    const actions = enemy.actions || ["attack"];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  enemyIntentLabel(action) {
    return {
      double: "連続攻撃の構え",
      auraDown: "オーラを狙う",
      mist: "全体攻撃の気配",
      fear: "恐怖のつぶやき",
      drain: "ゲージ吸収の気配",
      dust: "鱗粉をまく構え",
      wind: "強い風の気配",
      heavy: "大振りの構え",
      darkWhisper: "暗黒のつぶやき",
      smileDrain: "ゲージを狙う",
      telegraph: "大技の準備",
      sigh: "ため息を放つ",
    }[action] || "こちらを狙う";
  }

  executeEnemyAction(enemy, action) {
    if (!this.battle || enemy.hp <= 0) return;
    enemy.guarding = false;
    const living = activeParty(this.state).filter((member) => member.hp > 0);
    if (!living.length) return;
    const target = living[Math.floor(Math.random() * living.length)];
    if (action === "telegraph") {
      this.battle.telegraph = "sigh";
      this.battle.log = "笑顔喰らいは辺りの明るさを吸い込み、大きく息を吸った……！";
      this.audio.sfx("no");
      return;
    }
    if (action === "sigh") {
      this.battle.telegraph = null;
      let total = 0;
      for (const member of living) {
        const damage = this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 1.05),
          "dark",
        );
        total += damage;
        if (!member.status.bright && !member.status.guard && Math.random() < 0.55)
          member.status.fear = 2;
      }
      this.state.happy = Math.max(0, this.state.happy - 18);
      this.battle.log = `ため息！　味方全体に合計${total}のダメージ。恐怖が広がる！`;
      this.shake();
      return;
    }
    if (action === "attack") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 1),
      );
      this.battle.log = `${enemy.name}の攻撃！　${target.name}に${damage}のダメージ。`;
    } else if (action === "double") {
      const first = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 0.68),
      );
      const secondTarget = activeParty(this.state).filter((member) => member.hp > 0)[0] || target;
      const second = this.hurtParty(
        secondTarget,
        this.calculateDamage(enemy.atk, this.effectiveStat(secondTarget, "def"), 0.62),
      );
      this.battle.log = `${enemy.name}の連続かじり！　${first + second}のダメージ。`;
    } else if (action === "auraDown") {
      target.status.auraDown = 3;
      this.state.happy = Math.max(0, this.state.happy - 9);
      this.battle.log = `${enemy.name}のさびしい羽音。${target.name}のオーラが沈んだ。`;
      this.audio.sfx("no");
    } else if (action === "mist") {
      let total = 0;
      for (const member of living)
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 0.55),
          "dark",
        );
      this.battle.log = `${enemy.name}は不安の霧を吐いた！　味方全体に${total}のダメージ。`;
      this.shake();
    } else if (action === "guard") {
      enemy.guarding = true;
      this.battle.log = `${enemy.name}は硬い殻に身を隠した。`;
    } else if (action === "fear") {
      target.status.fear = 2;
      this.battle.log = `${enemy.name}の暗黒のつぶやき。${target.name}は恐怖に包まれた。`;
      this.audio.sfx("no");
    } else if (action === "drain" || action === "smileDrain") {
      const amount = action === "smileDrain" ? 24 : 12;
      this.state.happy = Math.max(0, this.state.happy - amount);
      const heal = Math.min(enemy.maxHp - enemy.hp, amount);
      enemy.hp += heal;
      this.battle.log = `${enemy.name}は笑顔を吸収した。ハッピーゲージが${amount}減った！`;
      this.audio.sfx("no");
    } else if (action === "dust") {
      for (const member of living)
        if (Math.random() < 0.5) member.status.auraDown = 2;
      this.battle.log = `${enemy.name}の薄暮の鱗粉。味方のオーラが曇る。`;
    } else if (action === "wind") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.mag, this.effectiveStat(target, "def"), 1.25),
        "wind",
      );
      this.battle.log = `${enemy.name}の夜風！　${target.name}に${damage}のダメージ。`;
      this.shake();
    } else if (action === "heavy") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 1.45),
      );
      this.battle.log = `${enemy.name}の重い一撃！　${target.name}に${damage}のダメージ。`;
      this.shake();
    } else if (action === "darkWhisper") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.mag, this.effectiveStat(target, "def"), 1.18),
        "dark",
      );
      target.status.auraDown = 2;
      this.battle.log = `暗黒のつぶやき！　${target.name}に${damage}のダメージ、オーラが低下。`;
      this.shake();
    }
  }

  finishRound() {
    if (!this.battle) return;
    if (this.enemiesDefeated()) return this.finishVictory();
    if (this.partyDefeated()) return this.finishDefeat();
    for (const member of activeParty(this.state)) {
      if (member.hp <= 0) continue;
      if (member.status.poison) {
        const damage = Math.max(2, Math.ceil(maxHp(member) * 0.06));
        member.hp = Math.max(0, member.hp - damage);
        this.battle.log = `${member.name}は毒で${damage}のダメージ。`;
      }
      for (const key of Object.keys(member.status)) {
        if (typeof member.status[key] === "number" && member.status[key] > 0)
          member.status[key] -= 1;
        if (member.status[key] <= 0) delete member.status[key];
      }
    }
    for (const enemy of this.battle.enemies) {
      for (const key of Object.keys(enemy.status || {})) {
        if (typeof enemy.status[key] === "number" && enemy.status[key] > 0)
          enemy.status[key] -= 1;
      }
    }
    if (this.battle.barrierBrokenRounds > 0) this.battle.barrierBrokenRounds -= 1;
    this.battle.round += 1;
    this.beginPlanning();
  }

  calculateDamage(attack, defense, power = 1) {
    const base = Math.max(2, attack * 1.75 - defense * 0.72);
    return Math.max(1, Math.round(base * power * (0.9 + Math.random() * 0.2)));
  }

  effectiveStat(character, key) {
    let value = stat(character, key);
    if (key === "atk" && character.status.atkUp) value *= 1.32;
    if (key === "mag" && character.status.magUp) value *= 1.3;
    if (key === "def" && character.status.defUp) value *= 1.32;
    if (key === "spd" && character.status.haste) value *= 1.45;
    if (["atk", "mag"].includes(key) && character.status.auraDown) value *= 0.76;
    return Math.round(value);
  }

  enemyStat(enemy, key) {
    let value = enemy[key] || 0;
    if (key === "def" && enemy.guarding) value *= 1.8;
    return Math.round(value);
  }

  hitEnemy(enemy, amount, element = "physical") {
    let damage = amount;
    if (enemy.kind === "smileEater" && this.battle.barrier) {
      const adds = this.battle.enemies.some(
        (entry) => entry.kind === "anxietyShade" && entry.hp > 0,
      );
      if (this.battle.barrierBrokenRounds <= 0) damage = Math.max(1, Math.round(damage * (adds ? 0.42 : 0.68)));
    }
    if (enemy.guarding && enemy.weakness !== element)
      damage = Math.max(1, Math.round(damage * 0.58));
    if (enemy.weakness === element) {
      enemy.guarding = false;
      damage = Math.round(damage * 1.12);
      this.flash();
    }
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hurtAt = performance.now();
    this.state.stats.damageDealt += damage;
    this.damageNumbers.push({ side: "enemy", id: enemy.id, amount: damage, born: performance.now() });
    this.audio.sfx("hit");
    this.shake();
    if (
      enemy.kind === "anxietyShade" &&
      enemy.hp <= 0 &&
      !this.battle.enemies.some(
        (entry) => entry !== enemy && entry.kind === "anxietyShade" && entry.hp > 0,
      )
    ) {
      this.battle.barrier = false;
      this.battle.log += "　孤立を守る影が消え、障壁が砕けた！";
    }
  }

  hurtParty(member, amount, _element = "physical") {
    let damage = amount;
    if (member.status.guard) damage *= 0.48;
    if (member.status.formation) damage *= 0.5;
    if (member.status.bright && _element === "dark") damage *= 0.58;
    const shield = ITEMS[member.equipment.shield];
    if (shield?.resist === "fear" && _element === "dark") damage *= 0.82;
    damage = Math.max(1, Math.round(damage));
    member.hp = Math.max(0, member.hp - damage);
    this.damageNumbers.push({ side: "party", id: member.id, amount: damage, born: performance.now() });
    this.audio.sfx("hit");
    return damage;
  }

  findEnemyTarget(id) {
    const selected = this.battle.enemies.find((enemy) => enemy.id === id && enemy.hp > 0);
    return selected || this.battle.enemies.find((enemy) => enemy.hp > 0);
  }

  enemiesDefeated() {
    return this.battle?.enemies.every((enemy) => enemy.hp <= 0);
  }

  partyDefeated() {
    return activeParty(this.state).every((member) => member.hp <= 0);
  }

  enemyCondition(enemy) {
    const ratio = enemy.hp / enemy.maxHp;
    if (ratio <= 0) return "倒した";
    if (ratio <= 0.2) return "瀕死";
    if (ratio <= 0.5) return "傷ついている";
    if (ratio <= 0.8) return "少し傷ついた";
    return "元気";
  }

  finishVictory() {
    if (!this.battle || this.battle.phase === "victory") return;
    this.battle.phase = "victory";
    const exp = this.battle.enemies.reduce((sum, enemy) => sum + enemy.exp, 0);
    const gold = this.battle.enemies.reduce((sum, enemy) => sum + enemy.gold, 0);
    this.state.gold += gold;
    this.state.victories += 1;
    const levels = grantExperience(this.state, exp);
    if (!this.battle.options.story) this.state.happy = Math.min(50, this.state.happy);
    this.battle.log = `勝利！　${exp} EXPと${gold}ゴールドを得た。`;
    if (levels.length)
      this.battle.log += ` ${levels.map((entry) => `${entry.name}はLv${entry.level}`).join("、")}になった！`;
    this.audio.sfx("win");
    this.renderBattleUi();
    this.delay(760, () => this.afterVictory(levels));
  }

  afterVictory(levels) {
    if (!this.battle) return;
    const options = this.battle.options;
    const symbol = options.symbol;
    if (symbol) {
      const key = `${this.state.map}:${symbol.id}`;
      if (symbol.unique) this.state.defeatedUnique[key] = true;
      else this.state.symbolCooldowns[key] = this.state.steps + 52;
      this.mapEnemies = this.mapEnemies.filter((enemy) => enemy.id !== symbol.id);
    }
    if (symbol?.kind === "gloomMoth" || symbol?.id === "grove-elite")
      this.state.flags.groveEliteWon = true;
    const levelLines = levels.map((entry) => ({
      speaker: "SYSTEM",
      portrait: entry.id,
      text: `${entry.name}はレベル${entry.level}になった！　力と体力が上がり、HPとMPが回復した。`,
    }));
    const story = options.story;
    this.battle = null;
    if (story === "raid") {
      this.finishRaid(levelLines);
    } else if (story === "chapterBoss") {
      this.finishChapterBoss(levelLines);
    } else {
      this.setMode("map");
      this.audio.play(
        this.state.map === "solaido"
          ? "town"
          : ["cave1", "cave2", "cave3", "oldWell", "echoGrove"].includes(this.state.map)
            ? "cave"
            : "field",
      );
      this.refreshHud();
      this.refreshInteractPrompt();
      if (levelLines.length) this.dialogue(levelLines);
      this.autosave();
    }
  }

  finishRaid(levelLines = []) {
    this.state.flags.raidWon = true;
    this.state.flags.kumiJoined = true;
    this.state.flags.skySigil = true;
    this.state.flags.raidReady = false;
    this.state.party.order = ["hero", "kumi"];
    this.state.party.kumi.hp = maxHp(this.state.party.kumi);
    this.state.party.kumi.mp = this.state.party.kumi.maxMp;
    discoverRumor(this.state, "cave");
    discoverRumor(this.state, "barrier");
    this.audio.play("field");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "空色の騎士団長",
          portrait: "kumi",
          text: "さっきの声援……なぜか、ずっと前にも聞いた気がした。あなたは敵じゃない。",
        },
        {
          speaker: "空色の騎士団長",
          portrait: "kumi",
          text: "私は久美。まだその名前に実感はないけど、隊をまとめる役目だけは忘れていない。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "魔物は空泣き洞へ逃げた。これが奥の封印を開く蒼天章。行く時は一緒に戦う。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "佐々木久美が正式に仲間になった！　『キャプテンコール』で全員を強化できる。",
        },
      ],
      () => {
        this.setMode("map");
        this.refreshHud();
        this.refreshInteractPrompt();
        this.autosave();
      },
    );
  }

  startChapterBoss() {
    if (this.state.flags.bossWon) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "砕けた黒い殻の奥で、空色の欠片が静かに輝いている。" });
      return;
    }
    if (!this.state.flags.kumiJoined) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "闇が深すぎる。今は誰かと力を合わせなければ近づけない。" });
      return;
    }
    this.state.flags.bossSeen = true;
    this.dialogue(
      [
        {
          speaker: "笑顔喰らい",
          portrait: "system",
          text: "期待スルカラ、失望スル。笑ウカラ、孤独ニナル。ナラバ最初カラ、何モ感ジナケレバイイ。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "不安が消えなくても、隣にいる人の声は消させない。……全員、私の声を聞いて！",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "笑顔喰らいは二つの『不安の影』に守られている。影を倒す、号令で障壁を崩す、光鳴りの鈴を使う——攻略法は一つではない。",
        },
      ],
      () =>
        this.startBattle(["smileEater", "anxietyShade", "anxietyShade"], {
          story: "chapterBoss",
          canEscape: false,
        }),
    );
  }

  finishChapterBoss(levelLines = []) {
    this.state.flags.bossWon = true;
    this.state.flags.chapter1Clear = true;
    this.state.happy = 100;
    fullHeal(this.state);
    this.audio.play("clear");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "久美",
          portrait: "kumi",
          text: "思い出した。大勢の前で、名前を呼び合って……私はいつも、みんなをまとめようとしてた。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "完璧だから先頭にいたんじゃない。迷っても、みんなと同じ方向を向きたかったから。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "空色の光が二人の間を巡り、失われたハッピーオーラの欠片へ結晶した。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "次はパンの香りがする西の国へ。でも急がなくていい。この世界を歩いて、あなたが見つけたものを教えて。",
        },
      ],
      () => this.showChapterClear(),
    );
  }

  finishDefeat() {
    if (!this.battle) return;
    this.battle.phase = "defeat";
    this.battle.log = "仲間たちは力尽きた……。";
    this.renderBattleUi();
    this.delay(700, () => {
      this.battle = null;
      this.state.gameOvers += 1;
      this.setMode("gameover");
      this.audio.stop();
    });
  }

  retryFromDefeat() {
    const safe = this.state.lastSafe;
    this.state.gold = Math.max(0, this.state.gold - Math.ceil(this.state.gold * 0.1));
    this.state.map = safe.map;
    this.state.x = safe.x;
    this.state.y = safe.y;
    this.state.dir = safe.dir;
    fullHeal(this.state);
    this.state.happy = Math.min(35, this.state.happy);
    this.buildMapEnemies();
    this.setMode("map");
    this.audio.play(safe.map === "solaido" ? "town" : "field");
    this.refreshHud();
    this.showArea();
    this.dialogue({
      speaker: "SYSTEM",
      portrait: "system",
      text: "最後に休んだ場所で目を覚ました。所持金の1割を失ったが、旅の経験は残っている。",
    });
  }

  exitBattle(escaped = false) {
    if (!this.battle) return;
    const symbol = this.battle.options.symbol;
    if (escaped && symbol) {
      this.state.escapes += 1;
      this.state.symbolCooldowns[`${this.state.map}:${symbol.id}`] = this.state.steps + 8;
      this.mapEnemies = this.mapEnemies.filter((enemy) => enemy.id !== symbol.id);
    }
    this.battle = null;
    this.setMode("map");
    this.audio.play(
      ["cave1", "cave2", "cave3", "oldWell", "echoGrove"].includes(this.state.map)
        ? "cave"
        : "field",
    );
    this.refreshHud();
    this.refreshInteractPrompt();
  }

  renderBattleUi() {
    if (!this.battle) return;
    const actor = this.currentBattleActor();
    this.ui.battleState.textContent =
      this.battle.phase === "plan"
        ? `ROUND ${this.battle.round} / COMMAND`
        : this.battle.phase === "victory"
          ? "VICTORY"
          : `ROUND ${this.battle.round} / ACTION`;
    this.ui.battleMessage.textContent = this.battle.log;
    this.ui.battleLog.textContent = this.battle.log;
    this.ui.happyFill.style.width = `${this.state.happy}%`;
    this.ui.happyValue.textContent = this.state.happy;
    this.ui.enemyLabels.innerHTML = this.battle.enemies
      .map(
        (enemy) =>
          `<div class="enemy-tag ${enemy.hp <= 0 ? "dead" : ""} ${
            this.battle.pending?.target === enemy.id ? "target" : ""
          }"><strong>${enemy.name}</strong><br>${this.enemyCondition(enemy)}</div>`,
      )
      .join("");
    this.ui.battleParty.innerHTML = activeParty(this.state)
      .map((member) => {
        const statuses = Object.keys(member.status)
          .filter((key) => member.status[key])
          .map((key) => STATUS_NAMES[key] || key)
          .join(" ");
        return `<div class="party-card ${actor?.id === member.id ? "active" : ""}">
          <strong>${member.name} Lv${member.level}</strong>
          <span class="vitals">HP ${member.hp}/${maxHp(member)}　MP ${member.mp}/${member.maxMp}</span>
          <span class="status">${member.hp <= 0 ? "戦闘不能" : statuses}</span>
        </div>`;
      })
      .join("");
  }

  focusBattle(direction) {
    const buttons = [...this.ui.battleCommands.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) return;
    let index = buttons.findIndex((button) => button.classList.contains("selected"));
    if (index < 0) index = 0;
    const columns = 3;
    if (direction === "left") index = (index - 1 + buttons.length) % buttons.length;
    else if (direction === "right") index = (index + 1) % buttons.length;
    else if (direction === "up") index = (index - columns + buttons.length) % buttons.length;
    else if (direction === "down") index = (index + columns) % buttons.length;
    buttons.forEach((button) => button.classList.remove("selected"));
    buttons[index].classList.add("selected");
    this.audio.sfx("ok");
  }

  delay(milliseconds, callback) {
    if (this.testFast) callback();
    else window.setTimeout(callback, milliseconds);
  }

  shake() {
    if (!this.state.settings.screenShake) return;
    this.ui.stage.classList.remove("shake");
    void this.ui.stage.offsetWidth;
    this.ui.stage.classList.add("shake");
    window.setTimeout(() => this.ui.stage.classList.remove("shake"), 210);
  }

  flash() {
    this.ui.stage.classList.remove("flash");
    void this.ui.stage.offsetWidth;
    this.ui.stage.classList.add("flash");
    window.setTimeout(() => this.ui.stage.classList.remove("flash"), 230);
  }

  openMenu(tab = this.tab) {
    if (this.mode !== "map") return;
    this.audio.sfx("ok");
    this.setMode("menu");
    this.renderMenu(tab);
  }

  closeMenu() {
    this.setMode("map");
    this.refreshHud();
    this.refreshInteractPrompt();
    this.autosave();
  }

  renderMenu(tab = "party") {
    this.tab = tab;
    this.ui.menuTabs.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.tab === tab);
    });
    this.ui.menuPlaytime.textContent = this.formatTime(this.currentPlayTime());
    this.ui.menuGold.textContent = `${this.state.gold} G`;
    if (tab === "party") this.renderPartyMenu();
    else if (tab === "rumors") this.renderRumorsMenu();
    else if (tab === "items") this.renderItemsMenu();
    else if (tab === "equip") this.renderEquipmentMenu();
    else if (tab === "map") this.renderMapMenu();
    else if (tab === "save") this.renderSaveMenu();
    else if (tab === "settings") this.renderSettingsMenu();
  }

  renderPartyMenu() {
    this.ui.menuBody.innerHTML = `<div class="card-grid">${activeParty(this.state)
      .map((member) => {
        const eq = EQUIP_SLOTS.map(
          (slot) => `${SLOT_NAMES[slot]}：${ITEMS[member.equipment[slot]]?.name || "なし"}`,
        ).join(" / ");
        const skills = Object.values(SKILLS)
          .filter((skill) => skill.owner === member.id && member.level >= skill.level)
          .map((skill) => skill.name)
          .join("・");
        return `<article class="info-card">
          <h3>${member.name} <span class="tag">${member.role}</span> Lv${member.level}</h3>
          <p>HP ${member.hp}/${maxHp(member)}　MP ${member.mp}/${member.maxMp}　次のLvまで ${Math.max(0, expNext(member.level) - member.exp)} EXP</p>
          <div class="stat-grid">
            <span>こうげき<b>${stat(member, "atk")}</b></span>
            <span>しゅび<b>${stat(member, "def")}</b></span>
            <span>まりょく<b>${stat(member, "mag")}</b></span>
            <span>すばやさ<b>${stat(member, "spd")}</b></span>
          </div>
          <p>${eq}</p>
          <p>特技：${skills || "なし"}</p>
        </article>`;
      })
      .join("")}</div>
      <div class="info-card" style="margin-top:7px">
        <h3>冒険の歩み</h3>
        <p>${this.state.steps}歩 / ${this.state.battles}戦 / 勝利${this.state.victories} / 退却${this.state.escapes} / 宝箱${this.state.stats.chests}</p>
      </div>`;
  }

  recommendedHint() {
    if (!this.state.flags.metKumi)
      return "王都は街道を北へ。町の人々から複数の噂を聞いてみよう。";
    if (!this.state.flags.raidWon)
      return "王都を出る前に装備を整えるか、西の森・南西の井戸を探索できる。";
    if (!this.state.flags.bossSeen)
      return "騎士団の蒼天章で空泣き洞の封印を開ける。B2では水門と近道を探そう。";
    if (!this.state.flags.bossWon)
      return "不安の影、キャプテンコール、光鳴りの鈴。障壁への対処を選ぼう。";
    return "第一章の地域に残る宝や依頼を探すか、西の国へ向かう準備をしよう。";
  }

  renderRumorsMenu() {
    const questOrder = ["chapter1", "dewMedicine", "lostRibbon", "lostMiner"];
    const questRows = questOrder
      .filter((id) => this.state.quests[id] !== "locked")
      .map((id) => {
        const quest = QUESTS[id];
        const status = this.state.quests[id];
        return `<div class="list-row">
          <div><h3><span class="tag ${quest.main ? "gold" : ""}">${quest.main ? "MAIN" : "SIDE"}</span>${quest.name}</h3>
          <p>${quest.description}${quest.reward ? `　報酬：${quest.reward}` : ""}</p></div>
          <span class="tag">${status === "complete" ? "達成" : "進行中"}</span>
        </div>`;
      })
      .join("");
    const rumorRows = Object.keys(RUMORS)
      .filter((id) => this.state.rumors[id])
      .map((id) => {
        const rumor = RUMORS[id];
        return `<div class="list-row">
          <div><h3>${rumor.title} <span class="tag">${rumor.region}</span></h3><p>${rumor.text}</p></div>
        </div>`;
      })
      .join("");
    const guide =
      this.state.settings.hint === "guided"
        ? `<div class="info-card" style="margin-bottom:7px;border-color:rgba(240,207,103,.55)">
          <h3>旅の星読み</h3><p>${this.recommendedHint()}</p>
        </div>`
        : "";
    this.ui.menuBody.innerHTML = `${guide}
      <p class="eyebrow">QUESTS</p><div class="list">${questRows}</div>
      <p class="eyebrow" style="margin-top:10px">RUMORS — 会話から得た手掛かり</p>
      <div class="list">${rumorRows}</div>`;
  }

  renderItemsMenu() {
    const rows =
      Object.entries(this.state.inventory)
        .filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => {
          const item = ITEMS[id];
          const fieldUsable = ["herb", "moonwort", "auraDrop", "torch", "wing", "lifeSeed"].includes(id);
          return `<div class="list-row">
            <div><h3>${item.name} ×${quantity} <span class="tag">${this.itemTypeName(item.type)}</span></h3><p>${item.description}</p></div>
            ${fieldUsable ? `<button data-use-item="${id}">使う</button>` : ""}
          </div>`;
        })
        .join("") || `<div class="info-card"><p>道具を持っていない。</p></div>`;
    this.ui.menuBody.innerHTML = `<div class="list">${rows}</div>`;
  }

  itemTypeName(type) {
    return {
      usable: "消耗品",
      field: "旅道具",
      key: "大切な物",
      weapon: "武器",
      shield: "盾",
      body: "防具",
      accessory: "装飾",
    }[type] || type;
  }

  useFieldItem(id) {
    const hero = this.state.party.hero;
    if ((this.state.inventory[id] || 0) <= 0) return;
    if (id === "herb") {
      const candidates = activeParty(this.state)
        .filter((member) => member.hp > 0 && member.hp < maxHp(member))
        .sort((a, b) => a.hp / maxHp(a) - b.hp / maxHp(b));
      const target = candidates[0];
      if (!target) return this.toast("HPは満タンだ");
      removeItem(this.state, id, 1);
      const healed = Math.min(35, maxHp(target) - target.hp);
      target.hp += healed;
      this.toast(`${target.name}のHPが${healed}回復`);
      this.audio.sfx("heal");
    } else if (id === "moonwort") {
      const target = activeParty(this.state).find((member) =>
        ["poison", "fear", "auraDown"].some((key) => member.status[key]),
      );
      if (!target) return this.toast("治す不調はない");
      removeItem(this.state, id, 1);
      target.status = {};
      this.toast(`${target.name}の不調が治った`);
      this.audio.sfx("heal");
    } else if (id === "auraDrop") {
      const target = activeParty(this.state)
        .filter((member) => member.mp < member.maxMp)
        .sort((a, b) => a.mp / a.maxMp - b.mp / b.maxMp)[0];
      if (!target) return this.toast("MPは満タンだ");
      removeItem(this.state, id, 1);
      const amount = Math.min(18, target.maxMp - target.mp);
      target.mp += amount;
      this.toast(`${target.name}のMPが${amount}回復`);
      this.audio.sfx("magic");
    } else if (id === "torch") {
      removeItem(this.state, id, 1);
      this.state.lightSteps = Math.max(this.state.lightSteps, 120);
      this.toast("たいまつを灯した。120歩のあいだ周囲を照らす");
      this.audio.sfx("magic");
    } else if (id === "wing") {
      removeItem(this.state, id, 1);
      this.closeMenu();
      this.changeMap("solaido", 19, 27, "up");
    } else if (id === "lifeSeed") {
      removeItem(this.state, id, 1);
      hero.maxHp += 5;
      hero.hp += 5;
      this.toast(`${hero.name}の最大HPが5上がった`);
      this.audio.sfx("win");
    }
    clampVitals(this.state);
    this.refreshHud();
    if (this.mode === "menu") this.renderItemsMenu();
  }

  renderEquipmentMenu() {
    this.equipCharacter ||= "hero";
    if (!this.state.party[this.equipCharacter] || !this.state.party.order.includes(this.equipCharacter))
      this.equipCharacter = "hero";
    const member = this.state.party[this.equipCharacter];
    const characterButtons = activeParty(this.state)
      .map(
        (entry) =>
          `<button data-equip-character="${entry.id}" class="${entry.id === this.equipCharacter ? "selected" : ""}">${entry.name}</button>`,
      )
      .join("");
    const slots = EQUIP_SLOTS.map((slot) => {
      const equipped = member.equipment[slot];
      const options = Object.entries(this.state.inventory)
        .filter(([id, quantity]) => quantity > 0 && ITEMS[id]?.type === slot)
        .map(([id]) => {
          const item = ITEMS[id];
          const bonus = [
            item.atk ? `攻+${item.atk}` : "",
            item.def ? `守+${item.def}` : "",
            item.mag ? `魔+${item.mag}` : "",
            item.spd ? `速${item.spd > 0 ? "+" : ""}${item.spd}` : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<button data-equip-item="${id}" data-character="${member.id}">${item.name}<small>${bonus}</small></button>`;
        })
        .join("");
      return `<div class="list-row">
        <div><h3>${SLOT_NAMES[slot]}：${ITEMS[equipped]?.name || "なし"}</h3>
        <p>${ITEMS[equipped]?.description || "装備していない"}</p></div>
        <div class="inline-actions">${equipped ? `<button data-unequip="${slot}" data-character="${member.id}">外す</button>` : ""}${options}</div>
      </div>`;
    }).join("");
    this.ui.menuBody.innerHTML = `
      <nav class="panel-tabs">${characterButtons}</nav>
      <div class="info-card" style="margin-bottom:7px">
        <h3>${member.name}の能力</h3>
        <p>攻撃 ${stat(member, "atk")} / 守備 ${stat(member, "def")} / 魔力 ${stat(member, "mag")} / 素早さ ${stat(member, "spd")} / 最大HP ${maxHp(member)}</p>
      </div>
      <div class="list">${slots}</div>`;
  }

  renderMapMenu() {
    const markers = [
      ["camp", "野営地", 49, 79],
      ["solaido", "王都", 47, 14],
      ["echoGrove", "こだまの森", 16, 31],
      ["oldWell", "忘れ井戸", 27, 75],
      ["cave1", "空泣き洞", 86, 26],
    ];
    const currentKey =
      this.state.map === "highroad"
        ? "camp"
        : this.state.map === "solaido"
          ? "solaido"
          : this.state.map === "echoGrove"
            ? "echoGrove"
            : this.state.map === "oldWell"
              ? "oldWell"
              : "cave1";
    const markerHtml = markers
      .filter(([id]) => this.state.discoveries[id])
      .map(
        ([id, name, left, top]) =>
          `<div class="map-marker ${id === currentKey ? "current" : ""}" style="left:${left}%;top:${top}%"><i></i><span>${name}</span></div>`,
      )
      .join("");
    const discoveries = markers.filter(([id]) => this.state.discoveries[id]);
    this.ui.menuBody.innerHTML = `
      <div class="map-layout">
        <div class="map-visual">${markerHtml}</div>
        <div class="list">
          ${discoveries
            .map(
              ([id, name]) =>
                `<div class="map-card"><h3>${name}</h3><p>${this.mapDescription(id)}</p></div>`,
            )
            .join("")}
        </div>
      </div>`;
  }

  mapDescription(id) {
    return {
      camp: "転生後に目覚めた街道の野営地。",
      solaido: "城と店、宿、礼拝堂が集まる始まりの王都。",
      echoGrove: "朝露草が育ち、古い祠が眠る西の森。",
      oldWell: "水路の流れ着く古井戸。小さな宝が眠る。",
      cave1: "魔物の気配が集まる青岩の洞窟。奥は三層に続く。",
    }[id];
  }

  renderSaveMenu() {
    this.ui.menuBody.innerHTML = `
      <div class="info-card">
        <h3>冒険の書</h3>
        <p>3つの冒険の書へ手動で記録できます。マップ移動や大きな出来事では自動記録も行われます。</p>
        <div class="inline-actions">
          <button data-menu="save-picker">記録する</button>
          <button data-menu="load-picker">読み込む</button>
        </div>
      </div>
      <div class="info-card" style="margin-top:7px">
        <h3>現在の記録</h3>
        <p>${MAPS[this.state.map].name} / ${this.formatTime(this.currentPlayTime())} / ${this.state.gold} G / ${this.state.flags.chapter1Clear ? "第一章クリア" : "第一章冒険中"}</p>
      </div>`;
  }

  renderSettingsMenu() {
    const settings = this.state.settings;
    this.ui.menuBody.innerHTML = `
      <div class="settings-grid">
        <div class="setting-row"><label>旅の手引き</label><div class="inline-actions">
          ${["classic", "standard", "guided"]
            .map(
              (value) =>
                `<button data-setting="hint" data-value="${value}" class="${settings.hint === value ? "selected" : ""}">${{ classic: "クラシック", standard: "標準", guided: "ガイド" }[value]}</button>`,
            )
            .join("")}
        </div></div>
        <div class="setting-row"><label>文字送り</label><div class="inline-actions">
          ${["fast", "normal", "slow"]
            .map(
              (value) =>
                `<button data-setting="textSpeed" data-value="${value}" class="${settings.textSpeed === value ? "selected" : ""}">${{ fast: "速い", normal: "標準", slow: "ゆっくり" }[value]}</button>`,
            )
            .join("")}
        </div></div>
        <div class="setting-row"><label>マスター音量</label><input data-volume="master" type="range" min="0" max="1" step=".05" value="${settings.master}"></div>
        <div class="setting-row"><label>BGM音量</label><input data-volume="bgm" type="range" min="0" max="1" step=".05" value="${settings.bgm}"></div>
        <div class="setting-row"><label>効果音量</label><input data-volume="sfx" type="range" min="0" max="1" step=".05" value="${settings.sfx}"></div>
        <div class="setting-row"><label>画面揺れ</label><div class="inline-actions">
          <button data-setting="screenShake" data-value="true" class="${settings.screenShake ? "selected" : ""}">あり</button>
          <button data-setting="screenShake" data-value="false" class="${!settings.screenShake ? "selected" : ""}">なし</button>
        </div></div>
      </div>`;
  }

  handleMenuClick(event) {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.useItem) this.useFieldItem(target.dataset.useItem);
    else if (target.dataset.equipCharacter) {
      this.equipCharacter = target.dataset.equipCharacter;
      this.renderEquipmentMenu();
    } else if (target.dataset.equipItem) {
      if (equipItem(this.state, target.dataset.character, target.dataset.equipItem)) {
        this.audio.sfx("ok");
        this.renderEquipmentMenu();
      }
    } else if (target.dataset.unequip) {
      if (unequipItem(this.state, target.dataset.character, target.dataset.unequip)) {
        this.audio.sfx("ok");
        this.renderEquipmentMenu();
      }
    } else if (target.dataset.menu === "save-picker") {
      this.showSavePicker("menu");
    } else if (target.dataset.menu === "load-picker") {
      this.openLoadScreen("menu");
    } else if (target.dataset.setting) {
      const key = target.dataset.setting;
      const value =
        target.dataset.value === "true"
          ? true
          : target.dataset.value === "false"
            ? false
            : target.dataset.value;
      this.state.settings[key] = value;
      this.audio.sfx("ok");
      this.renderSettingsMenu();
    }
  }

  handleSettingInput(event) {
    const input = event.target.closest("[data-volume]");
    if (!input) return;
    this.state.settings[input.dataset.volume] = Number(input.value);
    this.audio.updateVolume();
  }

  showSavePicker(origin = "menu") {
    this.loadContext = { mode: "save", origin };
    this.renderSaveSlots();
    this.setMode("load");
  }

  openLoadScreen(origin = "title") {
    this.loadContext = { mode: "load", origin };
    this.renderSaveSlots();
    this.setMode("load");
  }

  renderSaveSlots() {
    const mode = this.loadContext?.mode || "load";
    const slots = [
      { id: "auto", label: "自動記録", value: this.readSave("auto") },
      ...[1, 2, 3].map((id) => ({ id, label: `冒険の書 ${id}`, value: this.readSave(id) })),
    ];
    const cards = slots
      .map(({ id, label, value }) => {
        const details = value
          ? `${value.name} Lv${value.party?.hero?.level || value.lv || 1}　${MAPS[value.map]?.name || "旧ヒナティア"}<br>${this.formatTime(value.playTime || 0)}　${value.gold || 0} G`
          : "記録なし";
        const action =
          mode === "save"
            ? id === "auto"
              ? ""
              : `<button data-save-slot="${id}">記録</button>`
            : `<button data-load-slot="${id}" ${!value ? "disabled" : ""}>再開</button>`;
        return `<article class="save-card"><b>${label}</b><div><strong>${value?.flags?.chapter1Clear ? "第一章クリア" : value ? "冒険中" : "—"}</strong><small>${details}</small></div>${action}</article>`;
      })
      .join("");
    const legacy = this.findLegacySave();
    const legacyCard =
      mode === "load" && legacy
        ? `<article class="save-card"><b>旧版記録</b><div><strong>${legacy.value.name || "旅人"}の旧ヒナティア記録</strong><small>名前・到達実績・記念装備を新世界へ引き継ぎます</small></div><button data-import-legacy="${legacy.id}">引継ぐ</button></article>`
        : "";
    this.ui.loadSlots.innerHTML = cards + legacyCard;
    this.ui.loadSlots.querySelectorAll("[data-save-slot]").forEach((button) =>
      button.addEventListener("click", () => this.saveToSlot(Number(button.dataset.saveSlot))),
    );
    this.ui.loadSlots.querySelectorAll("[data-load-slot]").forEach((button) =>
      button.addEventListener("click", () => this.loadFromSlot(button.dataset.loadSlot)),
    );
    this.ui.loadSlots.querySelectorAll("[data-import-legacy]").forEach((button) =>
      button.addEventListener("click", () => this.importLegacy(button.dataset.importLegacy)),
    );
  }

  currentPlayTime() {
    return this.state.playTime + Math.max(0, (Date.now() - this.state.startedAt) / 1000);
  }

  formatTime(seconds = 0) {
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  readSave(slot) {
    const key = slot === "auto" ? AUTO_KEY : SAVE_PREFIX + slot;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value?.version === 5 ? value : null;
    } catch {
      return null;
    }
  }

  saveToSlot(slot, silent = false) {
    const data = serialize(this.state);
    this.state.playTime = data.playTime;
    this.state.startedAt = Date.now();
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
    if (!silent) {
      this.audio.sfx("save");
      this.toast(`冒険の書 ${slot} に記録した`);
    }
    const origin = this.loadContext?.origin;
    if (origin === "clear") this.setMode("clear");
    else if (origin === "menu") {
      this.setMode("menu");
      this.renderMenu("save");
    } else if (origin === "panel") {
      this.setMode("panel");
    } else {
      this.setMode("map");
      this.refreshHud();
    }
  }

  autosave() {
    if (!this.state?.flags?.prologueSeen) return;
    const data = serialize(this.state);
    this.state.playTime = data.playTime;
    this.state.startedAt = Date.now();
    localStorage.setItem(AUTO_KEY, JSON.stringify(data));
  }

  loadFromSlot(slot) {
    const value = this.readSave(slot === "auto" ? "auto" : Number(slot));
    if (!value) return;
    this.state = normalizeState(value);
    this.buildMapEnemies();
    this.audio.sfx("save");
    if (this.state.flags.chapter1Clear && !this.state.flags.postClear) {
      this.showChapterClear();
    } else {
      this.setMode("map");
      this.audio.play(
        this.state.map === "solaido"
          ? "town"
          : ["cave1", "cave2", "cave3", "oldWell", "echoGrove"].includes(this.state.map)
            ? "cave"
            : "field",
      );
      this.refreshHud();
      this.refreshInteractPrompt();
      this.showArea();
    }
  }

  findLegacySave() {
    const ids = ["auto", 1, 2, 3];
    for (const id of ids) {
      const key = id === "auto" ? LEGACY_AUTO : LEGACY_PREFIX + id;
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (value?.version >= 1 && value.version <= 4) return { id, value };
      } catch {}
    }
    return null;
  }

  importLegacy(id) {
    const key = id === "auto" ? LEGACY_AUTO : LEGACY_PREFIX + id;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      this.state = migrateLegacy(value);
      this.state.flags.prologueSeen = true;
      this.buildMapEnemies();
      this.setMode("map");
      this.audio.play("field");
      this.refreshHud();
      this.showArea();
      this.dialogue(
        [
          { speaker: "SYSTEM", portrait: "system", text: "旧ヒナティアの冒険の記憶が、淡い光となって新しい世界へ届いた。" },
          { speaker: "SYSTEM", portrait: "system", text: "旅人のしるしと引継ぎゴールドを手に入れた。物語は再構築された第一章から始まる。" },
        ],
        () => {
          this.setMode("map");
          this.autosave();
        },
      );
    } catch {
      this.toast("旧版の記録を読み込めなかった");
    }
  }

  showChapterClear() {
    this.state.flags.chapter1Clear = true;
    this.ui.clearSummary.textContent = `${this.state.steps}歩・${this.state.victories}勝・宝箱${this.state.stats.chests}個・噂${this.state.stats.rumors}件・寄り道${this.state.stats.sidequests}件`;
    this.setMode("clear");
    this.audio.play("clear");
    this.autosave();
  }

  continueAfterClear() {
    this.state.flags.postClear = true;
    this.state.map = "solaido";
    this.state.x = 19;
    this.state.y = 27;
    this.state.dir = "up";
    this.state.lastSafe = { map: "solaido", x: 19, y: 27, dir: "up" };
    this.buildMapEnemies();
    this.setMode("map");
    this.audio.play("town");
    this.refreshHud();
    this.showArea();
    this.autosave();
  }

  frame(now) {
    const delta = Math.min(50, now - this.lastFrame);
    this.lastFrame = now;
    if (this.mode === "map") {
      const held = ["arrowup", "w", "arrowdown", "s", "arrowleft", "a", "arrowright", "d"].find(
        (key) => this.keys.has(key),
      );
      if (held) this.tryMove(this.keyDirection(held), false);
      this.pollGamepad(now);
    } else if (this.mode === "title") {
      this.pollGamepad(now);
    }
    if (this.transitionDirection) {
      this.transition += (delta / 190) * this.transitionDirection;
      if (this.transitionDirection > 0 && this.transition >= 1) {
        this.transition = 1;
        this.transitionDirection = -1;
        const callback = this.transitionCallback;
        this.transitionCallback = null;
        callback?.();
      } else if (this.transitionDirection < 0 && this.transition <= 0) {
        this.transition = 0;
        this.transitionDirection = 0;
      }
    }
    this.render(now);
    requestAnimationFrame((next) => this.frame(next));
  }

  render(now) {
    if (this.mode === "title" || this.mode === "setup" || this.mode === "load")
      this.renderer.drawTitle(now);
    else if (this.mode === "battle") this.renderBattleCanvas(now);
    else this.renderMapCanvas(now);
    if (this.transition > 0) {
      this.renderer.ctx.save();
      this.renderer.ctx.globalAlpha = clamp(this.transition, 0, 1);
      this.renderer.rect(0, 0, W, H, "#020813");
      this.renderer.ctx.restore();
    }
  }

  renderMapCanvas(now) {
    const m = this.currentMap();
    const targetX = this.state.x * T + T / 2 - W / 2;
    const targetY = this.state.y * T + T / 2 - H / 2;
    const maxX = Math.max(0, m.width * T - W);
    const maxY = Math.max(0, m.height * T - H);
    this.camera.x += (clamp(targetX, 0, maxX) - this.camera.x) * 0.24;
    this.camera.y += (clamp(targetY, 0, maxY) - this.camera.y) * 0.24;
    if (this.testFast) {
      this.camera.x = clamp(targetX, 0, maxX);
      this.camera.y = clamp(targetY, 0, maxY);
    }
    this.renderer.clear("#071421");
    const startX = Math.max(0, Math.floor(this.camera.x / T) - 1);
    const startY = Math.max(0, Math.floor(this.camera.y / T) - 1);
    const endX = Math.min(m.width - 1, startX + 22);
    const endY = Math.min(m.height - 1, startY + 14);
    for (let y = startY; y <= endY; y += 1)
      for (let x = startX; x <= endX; x += 1)
        this.renderer.drawTile(
          m.tiles[y][x],
          x * T - this.camera.x,
          y * T - this.camera.y,
          x,
          y,
          now,
        );

    this.drawLandmarks(now);
    for (const special of m.specials) {
      if (special.type === "boss" && this.state.flags.bossWon) continue;
      if (["shop", "inn", "church", "hiddenWall", "bridgeGate", "shortcut"].includes(special.type))
        continue;
      const key = `${m.id}:${special.id}`;
      if (special.type === "gather" && this.state.gathered[key]) continue;
      this.renderer.drawSpecial(
        special.type,
        special.x * T - this.camera.x,
        special.y * T - this.camera.y,
        Boolean(
          this.state.flags[special.requires] ||
            (special.type === "lever" && this.state.flags.waterLever) ||
            (special.type === "groveShrine" && this.state.flags.groveEliteWon),
        ),
        now,
      );
    }
    for (const chest of m.chests)
      this.renderer.drawChest(
        chest.x * T - this.camera.x,
        chest.y * T - this.camera.y,
        Boolean(this.state.opened[`${m.id}:${chest.id}`]),
      );

    for (const npc of m.npcs) {
      if (npc.id === "lostMiner" && this.state.flags.minerFound) continue;
      this.renderer.drawCharacter(
        npc.type,
        npc.x * T + 4 - this.camera.x,
        npc.y * T + 1 - this.camera.y,
        npc.dir,
        Math.floor(now / 600),
        1,
      );
    }
    for (const enemy of this.mapEnemies)
      this.renderer.drawEnemySymbol(
        enemy.kind || enemy.group?.[0],
        enemy.x * T - this.camera.x,
        enemy.y * T - this.camera.y,
        enemy.dir,
        now,
        enemy.alert > 0,
      );

    if (this.state.party.order.includes("kumi")) {
      const [dx, dy] = DIRS[this.state.dir];
      const fx = this.state.x - dx;
      const fy = this.state.y - dy;
      this.renderer.drawCharacter(
        "kumi",
        fx * T + 4 - this.camera.x,
        fy * T + 1 - this.camera.y,
        this.state.dir,
        this.walkFrame,
        1,
        !this.state.flags.kumiJoined,
      );
    }
    this.renderer.drawCharacter(
      "hero",
      this.state.x * T + 4 - this.camera.x,
      this.state.y * T + 1 - this.camera.y,
      this.state.dir,
      this.walkFrame,
    );

    if (m.tone === "deepCave" && this.state.lightSteps <= 0) this.drawDarkness();
    if (this.state.settings.hint === "guided") this.drawCompassHint();
  }

  drawLandmarks(now) {
    if (this.state.map !== "highroad") return;
    const points = [
      { x: 25, y: 2, type: "castle" },
      { x: 47, y: 7, type: "cave" },
      { x: 8, y: 9, type: "grove" },
    ];
    for (const point of points) {
      const x = point.x * T + 16 - this.camera.x;
      const y = point.y * T + 16 - this.camera.y;
      if (x < -80 || x > 720 || y < -80 || y > 440) continue;
      if (point.type === "castle") this.renderer.castle(x, y - 50, 0.75);
      else if (point.type === "cave") {
        this.renderer.rect(x - 20, y - 24, 40, 28, "#566675");
        this.renderer.rect(x - 13, y - 16, 26, 21, "#0a1220");
        this.renderer.rect(x - 5, y - 28 + Math.sin(now / 300) * 2, 10, 20, "#67d5e9");
      } else {
        this.renderer.rect(x - 18, y - 28, 36, 30, "#1d573f");
        this.renderer.rect(x - 12, y - 38, 24, 33, "#438668");
        this.renderer.rect(x - 5, y - 44, 10, 18, "#8bd2a1");
      }
    }
  }

  drawDarkness() {
    const ctx = this.renderer.ctx;
    const heroX = this.state.x * T + 16 - this.camera.x;
    const heroY = this.state.y * T + 16 - this.camera.y;
    ctx.save();
    ctx.fillStyle = "rgba(1,4,12,.88)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "destination-out";
    const glow = ctx.createRadialGradient(heroX, heroY, 22, heroX, heroY, 105);
    glow.addColorStop(0, "rgba(0,0,0,1)");
    glow.addColorStop(0.62, "rgba(0,0,0,.78)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(heroX - 110, heroY - 110, 220, 220);
    ctx.restore();
    this.renderer.text("暗い……たいまつがあれば遠くまで見える", 320, 318, "#a5b9c8", 9, "center");
  }

  drawCompassHint() {
    const target = !this.state.flags.metKumi
      ? { map: "highroad", x: 25, y: 2, label: "王都" }
      : !this.state.flags.raidWon
        ? { map: "solaido", x: 20, y: 6, label: "聞き込み" }
        : !this.state.flags.bossWon
          ? { map: "highroad", x: 47, y: 7, label: "空泣き洞" }
          : null;
    if (!target || target.map !== this.state.map) return;
    const dx = target.x - this.state.x;
    const dy = target.y - this.state.y;
    const arrow =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "▶" : "◀") : dy > 0 ? "▼" : "▲";
    this.renderer.text(`${arrow} ${target.label}`, 625, 55, "#ffe38c", 10, "right");
  }

  renderBattleCanvas(now) {
    const tone = this.currentMap().tone;
    this.renderer.drawBattleBackground(tone, now);
    if (!this.battle) return;
    const livingEnemies = this.battle.enemies;
    const count = livingEnemies.length;
    const positions =
      count === 1
        ? [[405, 142]]
        : count === 2
          ? [[335, 146], [485, 146]]
          : [[278, 151], [410, 132], [535, 151]];
    livingEnemies.forEach((enemy, index) => {
      if (enemy.hp <= 0) return;
      const [x, y] = positions[index] || [400 + index * 70, 145];
      if (
        enemy.kind === "smileEater" &&
        this.battle.barrier &&
        this.battle.barrierBrokenRounds <= 0
      ) {
        const ctx = this.renderer.ctx;
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(now / 180) * 0.08;
        ctx.strokeStyle = "#b68fd2";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 78, 80, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const scale = enemy.kind === "smileEater" ? 1.08 : enemy.boss ? 1 : 0.82;
      this.renderer.drawBattleEnemy(
        enemy.sprite,
        x,
        y,
        scale,
        now,
        now - enemy.hurtAt < 220,
      );
    });
    activeParty(this.state).forEach((member, index) => {
      if (member.hp <= 0) return;
      this.renderer.drawPartyBack(member.id, 93 + index * 78, 214, now, false);
    });

    const current = performance.now();
    this.damageNumbers = this.damageNumbers.filter((number) => current - number.born < 900);
    for (const number of this.damageNumbers) {
      const age = (current - number.born) / 900;
      if (number.side === "enemy") {
        const index = this.battle.enemies.findIndex((enemy) => enemy.id === number.id);
        const [x, y] = positions[index] || [400, 140];
        this.renderer.text(String(number.amount), x, y - 60 - age * 25, "#ffe37c", 16, "center");
      } else {
        const index = activeParty(this.state).findIndex((member) => member.id === number.id);
        this.renderer.text(String(number.amount), 93 + index * 78, 170 - age * 24, "#ff8d9f", 14, "center");
      }
    }
  }

  pollGamepad(now) {
    const pads = navigator.getGamepads?.();
    const pad = pads?.[0];
    if (!pad) return;
    const pressed = pad.buttons.map((button) => button.pressed);
    const once = (index, callback) => {
      if (pressed[index] && !this.gamepadButtons[index]) callback();
    };
    once(0, () => this.confirm());
    once(1, () => this.cancel());
    once(9, () => {
      if (this.mode === "map") this.openMenu();
    });
    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;
    if (now - this.lastPadMove > 170) {
      let direction = null;
      if (Math.abs(x) > Math.abs(y) && Math.abs(x) > 0.55)
        direction = x > 0 ? "right" : "left";
      else if (Math.abs(y) > 0.55) direction = y > 0 ? "down" : "up";
      if (direction) {
        this.lastPadMove = now;
        if (this.mode === "map") this.tryMove(direction, true);
        else if (this.mode === "title") this.moveTitle(direction);
        else if (this.mode === "battle") this.focusBattle(direction);
      }
    }
    this.gamepadButtons = pressed;
  }

  exposeTestApi() {
    window.__HQ0_TEST__ = {
      game: this,
      fast: (value = true) => {
        this.testFast = value;
      },
      state: () => deepClone(this.state),
      mode: () => this.mode,
      advance: () => this.advanceDialogue(),
      teleport: (mapId, x = MAPS[mapId].start[0], y = MAPS[mapId].start[1]) => {
        this.state.map = mapId;
        this.state.x = x;
        this.state.y = y;
        this.camera.x = 0;
        this.camera.y = 0;
        this.buildMapEnemies();
        this.setMode("map");
        this.refreshHud();
      },
      setFlag: (id, value = true) => {
        this.state.flags[id] = value;
      },
      give: (id, quantity = 1) => addItem(this.state, id, quantity),
      talk: (id) => {
        const npc = Object.values(MAPS)
          .flatMap((entry) => entry.npcs)
          .find((entry) => entry.id === id);
        if (npc) this.talk(npc);
      },
      special: (id) => {
        const special = Object.values(MAPS)
          .flatMap((entry) => entry.specials)
          .find((entry) => entry.id === id);
        if (special) this.useSpecial(special);
      },
      battle: (group, options = {}) => this.startBattle(group, options),
      command: (action, id = null, target = null) => {
        if (!this.battle) return;
        this.commitPlan({ type: action, id, target, targetType: target ? "enemy" : "none" });
      },
      winBattle: () => {
        if (!this.battle) return;
        this.battle.enemies.forEach((enemy) => {
          enemy.hp = 0;
        });
        this.finishVictory();
      },
      loseBattle: () => {
        activeParty(this.state).forEach((member) => {
          member.hp = 0;
        });
        this.finishDefeat();
      },
      save: (slot = 1) => this.saveToSlot(slot, true),
      load: (slot = 1) => this.loadFromSlot(slot),
      render: (now = performance.now()) => this.render(now),
    };
  }
}
