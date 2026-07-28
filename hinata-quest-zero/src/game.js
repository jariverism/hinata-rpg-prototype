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
  partyRoster,
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
  regen: "再生",
  rooted: "鈍足",
  silence: "沈黙",
  spiritWard: "精護",
  evade: "回避",
};
const CUTIN_SKILLS = Object.freeze({
  promiseAura: "hero",
  formation: "kumi",
  happyBreadSkill: "mirei",
  sarimakashi: "sarina",
  skyDance: "katoshi",
});

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
      clearKicker: $("clear-kicker"),
      clearHeading: $("clear-heading"),
      clearReward: $("clear-reward"),
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
          "boss2",
          "boss3",
          "boss4",
          "oven",
          "goldenWheat",
          "springWater",
          "sunYeast",
          "mireBoard",
          "granaryLever",
          "arenaFinal",
          "windVaneNorth",
          "windVaneSouth",
          "towerLever",
          "windCamp",
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
    const missingWarpRequirement =
      (warp?.requires && !this.state.flags[warp.requires]) ||
      warp?.requiresAll?.some((flag) => !this.state.flags[flag]);
    if (missingWarpRequirement) {
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
    const missingRequirement =
      (warp?.requires && !this.state.flags[warp.requires]) ||
      warp?.requiresAll?.some((flag) => !this.state.flags[flag]);
    if (missingRequirement) {
      this.audio.sfx("no");
      this.dialogue({
        speaker: "SYSTEM",
        portrait: "system",
        text: warp.denied || "今は先へ進めない。",
      });
      return false;
    }
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
      if (id === "mireRoad" && !this.state.flags.chapter2Started) {
        this.state.flags.chapter2Started = true;
        this.state.quests.chapter1 = "complete";
        this.state.quests.chapter2 = "active";
        discoverRumor(this.state, "westRoad");
      }
      if (id === "spiritPass" && !this.state.flags.chapter3Started) {
        this.state.flags.chapter3Started = true;
        this.state.quests.chapter2 = "complete";
        this.state.quests.chapter3 = "active";
        discoverRumor(this.state, "southTrail");
      }
      if (id === "windRoad" && !this.state.flags.chapter4Started) {
        this.state.flags.chapter4Started = true;
        this.state.quests.chapter3 = "complete";
        this.state.quests.chapter4 = "active";
        discoverRumor(this.state, "eastWindRoad");
      }
      if (["solaido", "mileria", "sarinaria", "katoshia"].includes(id)) {
        this.state.lastSafe = { map: id, x, y, dir };
        this.audio.play("town");
      } else if (["cave1", "cave2", "cave3", "oldWell", "granary1", "granary2", "spiritSanctum", "spiritHeart", "windTower1", "windTower2"].includes(id)) {
        this.audio.play("cave");
        const floor = { oldWell: 1, cave1: 1, cave2: 2, cave3: 3, granary1: 1, granary2: 2, spiritSanctum: 2, spiritHeart: 3, windTower1: 2, windTower2: 3 }[id] || 0;
        this.state.stats.deepestFloor = Math.max(this.state.stats.deepestFloor, floor);
      } else {
        this.audio.play(["echoGrove", "whisperWood", "skyArena"].includes(id) ? "cave" : "field");
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
    } else if (id === "mireRoad" && y > 25) {
      discoverRumor(this.state, "southTrail");
    } else if (id === "spiritPass") {
      reveal("sarinaria", 7, 3, 17);
      reveal("whisperWood", 7, 47, 17);
      reveal("windRoad", 7, 36, 31);
    } else if (id === "windRoad") {
      reveal("katoshia", 7, 25, 2);
      reveal("skyArena", 7, 50, 18);
      reveal("windTower1", 7, 36, 34);
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
    } else if (id === "mirei") {
      if (!this.state.flags.metMirei) {
        this.state.flags.metMirei = true;
        this.state.quests.miracleBread = "active";
        discoverRumor(this.state, "mirelia");
        discoverRumor(this.state, "windmill");
        this.dialogue([
          {
            speaker: "パン職人の少女",
            portrait: "mirei",
            text: "いらっしゃい……と言いたいけど、今日は焼けるパンがないの。畑も酵母も、急に元気をなくしちゃって。",
          },
          {
            speaker: this.state.name,
            portrait: "hero",
            text: "佐々木美玲さん……？　あなたを知っている。人を笑顔にする人だった。",
          },
          {
            speaker: "パン職人の少女",
            portrait: "mirei",
            text: "美玲……その名前、パンがふくらむ時みたいに胸があったかくなる。でも、まだ全部は思い出せない。",
          },
          {
            speaker: "美玲",
            portrait: "mirei",
            text: "黄金麦、風車丘の清水、陽だまり酵母。三つがあれば、みんなが笑えるパンを焼ける。どの順で探しても大丈夫だよ。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "メインクエスト『三つの恵み』が始まった。街道の畑と風車の丘を自由に探索しよう。",
          },
        ]);
      } else if (!this.state.flags.mireiJoined) {
        const ingredients = ["goldenWheat", "springWater", "sunYeast"];
        const found = ingredients.filter((item) => (this.state.inventory[item] || 0) > 0);
        if (found.length < ingredients.length) {
          simple(
            "美玲",
            "mirei",
            `材料は${found.length}/3個。畑の黄金麦、丘の低地の清水、高台の酵母。好きな場所から探してきて。`,
          );
        } else {
          this.dialogue(
            [
              {
                speaker: "美玲",
                portrait: "mirei",
                text: "三つとも揃った！　最後に、どんなパンにする？　焼き方で地下穀倉への備えが変わるよ。",
                choices: [
                  {
                    label: "香ばしく焼く：ボスの守りを崩す",
                    action: () => { this.state.flags.breadChoice = "crisp"; },
                  },
                  {
                    label: "ふんわり焼く：パンを多く作る",
                    action: () => { this.state.flags.breadChoice = "soft"; },
                  },
                  {
                    label: "力強く焼く：全員のHPを強化",
                    action: () => { this.state.flags.breadChoice = "hearty"; },
                  },
                ],
              },
              {
                speaker: "美玲",
                portrait: "mirei",
                text: "焼きたての香り……！　黒い蔓が逃げていく。これなら地下穀倉へ入れるよ。",
              },
              {
                speaker: "久美",
                portrait: "kumi",
                text: "一人で行かせない。美玲、私たちと一緒に、この国の食卓を取り戻そう。",
              },
            ],
            () => this.completeMireiJoin(),
          );
        }
      } else {
        simple(
          "美玲",
          "mirei",
          this.state.flags.chapter2BossWon
            ? "パンの香りで、思い出した笑顔がまた増えたよ。次の旅にも、たくさん持っていこうね。"
            : "地下穀倉の核は根に守られているはず。私の聖火なら、植物の守りを崩せるよ。",
        );
      }
    } else if (id === "mireBaker" || id === "mireShop") {
      this.openShop(id === "mireBaker" ? "mireArmory" : "mireItem");
    } else if (id === "mireInn") {
      this.openInn();
    } else if (id === "mirePriest") {
      this.openChurch();
    } else if (id === "mireChild") {
      simple("ミレリアの子", "child", this.state.flags.chapter2BossWon
        ? "パンが焼けたよ！　半分こすると、もっとおいしいね！"
        : "おなかが鳴ると、みんな少しだけ怒りっぽくなるの。前はパンの匂いで笑えたのに。");
    } else if (id === "mireFarmerA" || id === "fieldWatcher") {
      const fresh = discoverRumor(this.state, "granary");
      simple("麦農家", "farmer", "黄金麦の畑を枯れ穂の番人が占領した。炎に弱いが、倒しても黒い蔓の根は地下穀倉に残る。" +
        (fresh ? "——『黒い蔓の地下穀倉』の噂を記録した。" : ""));
    } else if (id === "mireFarmerB" || id === "westFarmer") {
      simple("麦農家", "farmer", "敵の大技が見えたら防御するんだ。美玲のパンで立て直せば、力押しよりずっと長く戦える。");
    } else if (id === "windScholar" || id === "millKeeper") {
      const fresh = discoverRumor(this.state, "windmill");
      simple("風車守", "miller", "丘の低地には清水、高台には陽だまり酵母。片方を取っても、もう片方は消えない。" +
        (fresh ? "——『風車丘の二つの恵み』を記録した。" : ""));
    } else if (id === "springSpirit") {
      simple("泉の精霊", "spirit", "きれいな水、分けても減らない。笑顔を焼く人へ、持っていって。");
    } else if (id === "hungryTraveler") {
      if (this.state.quests.hungryChildren === "locked") {
        this.state.quests.hungryChildren = "active";
        simple("空腹の旅人", "pilgrim", "町まであと少しなのに、子どもが空腹で歩けない。パンが一つあれば……。");
      } else if (
        this.state.quests.hungryChildren === "active" &&
        (this.state.inventory.happyBread || 0) > 0
      ) {
        removeItem(this.state, "happyBread", 1);
        addItem(this.state, "wheatCharm", 1);
        this.state.quests.hungryChildren = "complete";
        this.state.stats.sidequests += 1;
        this.dialogue([
          { speaker: "空腹の旅人", portrait: "pilgrim", text: "ありがとう。半分に分けたら、不思議と全員のおなかが落ち着いたよ。" },
          { speaker: "SYSTEM", portrait: "system", text: "麦穂のお守りを手に入れた！" },
        ]);
      } else {
        simple("空腹の旅人", "pilgrim", "焼きたてでなくてもいい。分けられるパンが一つあれば助かる。");
      }
    } else if (id === "granaryKeeper") {
      const fresh = discoverRumor(this.state, "blightCore");
      simple("穀倉番", "farmer", "奥の核は二本の根から力を吸う。先に根を焼けば核の殻が薄くなる。" +
        (fresh ? "——『二本の根に守られた核』の噂を記録した。" : ""));
    } else if (id === "sarina") {
      if (!this.state.flags.metSarina) {
        this.state.flags.metSarina = true;
        this.state.quests.threeChimes = "active";
        discoverRumor(this.state, "sarinaria");
        discoverRumor(this.state, "threeChimes");
        this.dialogue([
          {
            speaker: "鈴を持つ巫女",
            portrait: "sarina",
            text: "精霊たちの声が、言葉になる直前で消えてしまうんです。水、風、光……三つの音だけが森から聞こえます。",
          },
          {
            speaker: this.state.name,
            portrait: "hero",
            text: "潮紗理菜さん……？　あなたは、人の言葉を大切に受け取って、優しく返す人だった。",
          },
          {
            speaker: "鈴を持つ巫女",
            portrait: "sarina",
            text: "紗理菜……不思議です。その名前を聞くと、遠い場所の鈴が『おかえり』と言った気がします。",
          },
          {
            speaker: "紗理菜",
            portrait: "sarina",
            text: "三響の森には、水鏡・追風・陽虹の守り手がいます。どこから訪ねても構いません。戦う前に、小さな精霊たちの話も聞いてください。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "メインクエスト『水・風・光の三響』が始まった。三つの音は好きな順で集められる。",
          },
        ]);
      } else if (!this.state.flags.sarinaJoined) {
        const chimes = ["waterChime", "windChime", "lightChime"];
        const found = chimes.filter((item) => (this.state.inventory[item] || 0) > 0);
        if (found.length < chimes.length) {
          simple(
            "紗理菜",
            "sarina",
            `三つの音は${found.length}/3個。森の精霊は、攻略法だけでなく音を結ぶ順番も話してくれるはずです。`,
          );
        } else {
          this.dialogue(
            [
              {
                speaker: "紗理菜",
                portrait: "sarina",
                text: "水、風、光……聞こえます。別々の声なのに、誰も相手を押し消そうとしていない。",
              },
              {
                speaker: "美玲",
                portrait: "mirei",
                text: "一緒に行こう。思い出せないことがあっても、聞こえた気持ちは本物だよ。",
              },
              {
                speaker: "久美",
                portrait: "kumi",
                text: "森の南に無音の神域がある。紗理菜、精霊の言葉を私たちにつないで。",
              },
            ],
            () => this.completeSarinaJoin(),
          );
        }
      } else {
        simple(
          "紗理菜",
          "sarina",
          this.state.flags.chapter3BossWon
            ? "世界中の声を、もう一度聞きに行きましょう。嬉しい声も、迷う声も、全部が大切な響きです。"
            : "無響獣は弱点の響きを変えます。今の色を見て、炎・風・光を合わせてください。大きな波には精霊の守りを。",
        );
      }
    } else if (id === "shrineElder") {
      const fresh = discoverRumor(this.state, "silentSanctum");
      simple("里の長老", "shrine", "三つの音が揃えば、森の南にある無音神域の文字が読める。だが扉は音の順を試す。" +
        (fresh ? "——『森の底の無音神域』の噂を記録した。" : ""));
    } else if (id === "sarinaMerchant") {
      this.openShop("sarinaItem");
    } else if (id === "sarinaSmith") {
      this.openShop("sarinaArmory");
    } else if (id === "sarinaInn") {
      this.openInn();
    } else if (id === "sarinaPriest") {
      this.openChurch();
    } else if (id === "sarinaChild") {
      simple("里の子", "child", this.state.flags.chapter3BossWon
        ? "精霊さんがまた歌ってる！　言葉が違っても、一緒に笑えるんだね。"
        : "精霊さん、口は動いてるのに声がしないの。怒ってるのかな……。");
    } else if (id === "ridgeRanger") {
      const fresh = discoverRumor(this.state, "threeChimes");
      simple("峠のレンジャー", "ranger", "東の森は三つに枝分かれする。どの守り手から挑んでも、残りの道は閉じない。" +
        (fresh ? "——『森に散った三つの音』を記録した。" : ""));
    } else if (id === "bellPilgrim") {
      simple("鈴巡りの旅人", "pilgrim", "ヒソヒソタケは技を封じる胞子をまく。鈴や虹結びのお守りがあれば、沈黙に抗える。");
    } else if (id === "lostWisp") {
      this.state.flags.lostSpiritFound = true;
      if (this.state.quests.lostSpirit === "locked") this.state.quests.lostSpirit = "active";
      simple("迷子の精霊", "spirit", "みち、わからない。西の里の、きらきらの木……帰りたい。");
    } else if (id === "spiritKeeper") {
      if (
        this.state.quests.lostSpirit === "active" &&
        this.state.flags.lostSpiritFound
      ) {
        this.state.quests.lostSpirit = "complete";
        this.state.stats.sidequests += 1;
        addItem(this.state, "rainbowCharm", 1);
        this.dialogue([
          { speaker: "精霊守", portrait: "spirit", text: "峠の子、見つけてくれた。風に道を伝える。もう帰れる。" },
          { speaker: "SYSTEM", portrait: "system", text: "虹結びのお守りを手に入れた！" },
        ]);
      } else {
        simple("精霊守", "spirit", "小さな灯が一つ、峠から戻らない。見つけたら、ここへ風を届けて。");
        if (this.state.quests.lostSpirit === "locked") this.state.quests.lostSpirit = "active";
      }
    } else if (id === "waterSpirit") {
      discoverRumor(this.state, "spiritLanguage");
      simple("水の精霊", "spirit", "水、いちばん。渇いた根を起こす。追風を呼ぶ。守り手は風の音に弱い。");
    } else if (id === "windSpirit") {
      discoverRumor(this.state, "spiritLanguage");
      simple("風の精霊", "spirit", "風、つぎ。雲を運ぶ。火のぬくもりは、追風の守りをほどく。");
    } else if (id === "lightSpirit") {
      discoverRumor(this.state, "spiritLanguage");
      simple("光の精霊", "spirit", "光、さいご。水と風を虹にする。暗い守り手には、同じ光を返して。");
    } else if (id === "sanctumEcho") {
      const fresh = discoverRumor(this.state, "resonanceCore");
      simple("神域の木霊", "spirit", "奥の獣、響きを巡らす。炎、風、光。今の色と同じ音だけ、深く届く。" +
        (fresh ? "——『属性を巡らせる無響獣』の噂を記録した。" : ""));
    } else if (id === "katoshi") {
      if (!this.state.flags.metKatoshi) {
        this.state.flags.metKatoshi = true;
        this.state.quests.skyTournament = "active";
        discoverRumor(this.state, "katoshia");
        discoverRumor(this.state, "skyTournament");
        this.dialogue([
          {
            speaker: "風の剣士",
            portrait: "katoshi",
            text: "風哭きの塔へ行きたい？　今の風は速すぎるよ。追いつけない人を連れてはいけない。",
          },
          {
            speaker: this.state.name,
            portrait: "hero",
            text: "加藤史帆さん……。速くて強いのに、時々ふにゃっと力が抜ける。その剣の動き、覚えている。",
          },
          {
            speaker: "風の剣士",
            portrait: "katoshi",
            text: "加藤……史帆。変な感じ。でも『へにょへにょ』は、もっと変な感じ……。どうして少し懐かしいんだろ。",
          },
          {
            speaker: "史帆",
            portrait: "katoshi",
            text: "東の蒼天闘技場で三つの予選を越えてきて。順番は自由。全部の型を見せてもらったら、私が決勝で確かめる。",
          },
          {
            speaker: "SYSTEM",
            portrait: "system",
            text: "メインクエスト『蒼天三型試合』が始まった。守り・速さ・魔法の予選は好きな順で挑める。",
          },
        ]);
      } else if (!this.state.flags.katoshiJoined) {
        const wins = ["arenaStoneWon", "arenaSwiftWon", "arenaEchoWon"]
          .filter((flag) => this.state.flags[flag]).length;
        simple(
          "史帆",
          "katoshi",
          wins < 3
            ? `予選は${wins}/3勝。得意な相手からでいいよ。苦手な型は装備や仲間を入れ替えて、また来ればいい。`
            : "三つの勝印が揃ったね。闘技場の中央で待ってる。決勝は、速さだけじゃ勝てないよ。",
        );
      } else {
        simple(
          "史帆",
          "katoshi",
          this.state.flags.chapter4BossWon
            ? "思い出した風は、前よりあったかい。次もみんなで、へにょへにょっと行こう。"
            : "颶風鏡が反撃の構えを取ったら、私の二連撃で崩す。大技を溜めたらコンビネーションで風を散らすよ。",
        );
      }
    } else if (id === "arenaMaster" || id === "arenaRegistrar") {
      if (!this.state.flags.metKatoshi) {
        simple("闘技場主", "arenaMaster", "決勝者を指名するのは風の剣士シホだ。まず街で本人と話してきな。");
      } else {
        this.state.flags.arenaEntered = true;
        const wins = ["arenaStoneWon", "arenaSwiftWon", "arenaEchoWon"]
          .filter((flag) => this.state.flags[flag]).length;
        simple("闘技場主", "arenaMaster", `予選は${wins}/3勝。三人は場内の別々の場所にいる。順番も、途中で町へ戻るのも自由だ。`);
      }
    } else if (id === "arenaHealer") {
      fullHeal(this.state);
      simple("闘技場の癒やし手", "priest", "予選の傷は癒やした。相手の予告を見て、同じ手ばかり選ばないことだ。");
    } else if (id === "windSmith") {
      this.openShop("windArmory");
    } else if (id === "windMerchant") {
      this.openShop("windItem");
    } else if (id === "windInn") {
      this.openInn();
    } else if (id === "windPriest") {
      this.openChurch();
    } else if (id === "windChild") {
      simple("カトシアの子", "child", this.state.flags.chapter4BossWon
        ? "風車がゆっくり回るようになった！　速い風も、そよ風も、どっちも楽しいね！"
        : "みんな速い人ばかり応援するけど、転んだ人を待つ史帆お姉ちゃんが一番速いんだよ。");
    } else if (id === "windCourier") {
      const fresh = discoverRumor(this.state, "katoshia");
      simple("風便りの配達人", "courier", "北がカトシア、東が闘技場だ。塔は南だが、暴風の切れ目を読める剣士しか門を抜けられない。" +
        (fresh ? "——『風を競う街カトシア』の噂を記録した。" : ""));
    } else if (id === "arenaFan") {
      const fresh = discoverRumor(this.state, "skyTournament");
      simple("闘技場の観客", "fan", "不動には光、瞬脚には足止め、魔響には風。三人とも弱点を隠しているが、予告は嘘をつかない。" +
        (fresh ? "——『三つの型を越える予選』の噂を記録した。" : ""));
    } else if (id === "lostFan") {
      this.state.flags.lostFanRescued = true;
      if (this.state.quests.lostFan === "locked") this.state.quests.lostFan = "active";
      simple("取り残された観客", "fan", "応援旗を追って谷へ入ったら、風で戻れなくなった。街の姉さんに無事だと伝えて！");
    } else if (id === "fanSister") {
      if (this.state.quests.lostFan === "active" && this.state.flags.lostFanRescued) {
        this.state.quests.lostFan = "complete";
        this.state.stats.sidequests += 1;
        addItem(this.state, "arenaMedal", 1);
        this.dialogue([
          { speaker: "観客の姉", portrait: "fan", text: "無事だったのね！　向かい風の中まで探してくれてありがとう。" },
          { speaker: "SYSTEM", portrait: "system", text: "蒼天の記念章を手に入れた！" },
        ]);
      } else {
        if (this.state.quests.lostFan === "locked") this.state.quests.lostFan = "active";
        simple("観客の姉", "fan", "弟が応援旗を追って街道の南へ行ったきり戻らないの。塔へ続く苔の谷だと思う。");
      }
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

  completeMireiJoin() {
    for (const id of ["goldenWheat", "springWater", "sunYeast"])
      removeItem(this.state, id, 1);
    this.state.flags.breadQuestReady = true;
    this.state.flags.mireiJoined = true;
    this.state.flags.granaryOpen = true;
    this.state.quests.miracleBread = "complete";
    if (!this.state.party.order.includes("mirei")) this.state.party.order.push("mirei");
    if (this.state.flags.breadChoice === "soft") addItem(this.state, "happyBread", 4);
    else addItem(this.state, "happyBread", 2);
    if (this.state.flags.breadChoice === "hearty") {
      for (const member of activeParty(this.state)) member.maxHp += 5;
    }
    fullHeal(this.state);
    discoverRumor(this.state, "granary");
    this.dialogue(
      [
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "佐々木美玲が仲間になった！　回復と状態異常対策、炎による植物の守り崩しを得意とする。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: this.state.flags.breadChoice === "crisp"
            ? "香ばしいパンの煙が核の殻へ染み込んだ。章ボスの障壁が最初から弱まる。"
            : this.state.flags.breadChoice === "hearty"
              ? "力強いパンで仲間全員の最大HPが5上がった。"
              : "ふんわりパンを多く焼き、ハッピーブレッドを4個受け取った。",
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

  completeSarinaJoin() {
    this.state.flags.sarinaJoined = true;
    this.state.flags.spiritTongue = true;
    this.state.quests.threeChimes = "complete";
    if (!this.state.party.order.includes("sarina")) this.state.party.order.push("sarina");
    addItem(this.state, "spiritNectar", 2);
    fullHeal(this.state);
    discoverRumor(this.state, "spiritLanguage");
    discoverRumor(this.state, "silentSanctum");
    this.dialogue(
      [
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "潮紗理菜が仲間になった！　全体回復、状態異常治療、属性防御、弱点を選ぶ精霊魔法を使える。",
        },
        {
          speaker: "紗理菜",
          portrait: "sarina",
          text: "精霊の言葉が聞こえます。水が最初、風が次、光が最後……この順番を忘れないでください。",
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

  completeKatoshiJoin(levelLines = []) {
    this.state.flags.arenaFinalWon = true;
    this.state.flags.katoshiJoined = true;
    this.state.flags.rosterUnlocked = true;
    this.state.flags.towerOpen = true;
    this.state.quests.skyTournament = "complete";
    addItem(this.state, "stormSigil", 1);
    addItem(this.state, "galeTonic", 2);
    if (!this.state.party.order.includes("katoshi")) {
      const reserve = [...this.state.party.order].reverse().find((id) => id !== "hero") || "sarina";
      this.state.party.order = this.state.party.order.filter((id) => id !== reserve);
      this.state.party.order.push("katoshi");
    }
    fullHeal(this.state);
    discoverRumor(this.state, "towerSeal");
    this.audio.play("clear");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "史帆",
          portrait: "katoshi",
          text: "最後の一歩、私より先だった。速さだけじゃなくて、みんなの動きを見てたからだね。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "史帆、やっぱりあなたなんだね。私たちと一緒に、風哭きの塔を止めよう。",
        },
        {
          speaker: "史帆",
          portrait: "katoshi",
          text: "うん。へにょへにょ斬りって呼び方はまだ納得してないけど……みんなで行く。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "加藤史帆が仲間になった！　最大4人で戦うため、紗理菜が待機に回った。メニューの『なかま』から自由に編成できる。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "風塔の通行章を手に入れた。天翔け街道の南から風哭きの塔へ進める。",
        },
      ],
      () => {
        this.setMode("map");
        this.audio.play("cave");
        this.refreshHud();
        this.refreshInteractPrompt();
        this.autosave();
      },
    );
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
    } else if (special.type === "goldenWheat") {
      const key = "mireRoad:golden-wheat";
      if (this.state.gathered[key]) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "残った麦は、畑の人々が育て直している。" });
      } else if (!this.state.flags.scarecrowWon) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "黄金麦へ近づくと、枯れ穂の番人がこちらを見た。先に退けなければ採れない。" });
      } else {
        this.state.gathered[key] = true;
        addItem(this.state, "goldenWheat", 1);
        this.audio.sfx("ok");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "黄金麦を手に入れた！　穂の内側に温かな光が残っている。" });
      }
    } else if (special.type === "springWater" || special.type === "sunYeast") {
      const itemId = special.type;
      const key = `${this.state.map}:${special.id}`;
      if (this.state.gathered[key]) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "必要な分はすでに受け取った。" });
      } else {
        this.state.gathered[key] = true;
        addItem(this.state, itemId, 1);
        this.audio.sfx("ok");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: `${ITEMS[itemId].name}を手に入れた！` });
      }
    } else if (special.type === "oven") {
      this.talk({ id: "mirei" });
    } else if (special.type === "mireBoard") {
      if (this.state.quests.hungryChildren === "locked")
        this.state.quests.hungryChildren = "active";
      this.dialogue([
        { speaker: "掲示板", portrait: "system", text: "『街道で立ち往生する親子あり。食べ物を分けられる旅人を求む』" },
        { speaker: "SYSTEM", portrait: "system", text: "サブクエスト『おなかの鳴る帰り道』を記録した。" },
      ]);
    } else if (special.type === "granaryLever") {
      if (this.state.flags.granaryShortcut) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "昇降機は入口階まで通じている。" });
      } else {
        this.state.flags.granaryShortcut = true;
        this.audio.sfx("save");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "穀物用の昇降機を動かした。地下穀倉入口へ戻る近道が開いた！" });
      }
    } else if (special.type === "spiritCamp") {
      if (this.state.flags.spiritCampRested) {
        this.dialogue({ speaker: "小さな精霊", portrait: "spirit", text: "蜜の火、今日はもう眠った。また里の宿で休んで。" });
      } else {
        this.state.flags.spiritCampRested = true;
        for (const member of activeParty(this.state)) {
          member.hp = Math.min(maxHp(member), member.hp + Math.ceil(maxHp(member) * 0.3));
          member.mp = Math.min(member.maxMp, member.mp + 8);
        }
        this.audio.sfx("heal");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "精霊の焚き火で一度だけ休み、HPとMPが少し回復した。" });
      }
    } else if (["waterChime", "windChime", "lightChime"].includes(special.type)) {
      const config = {
        waterChime: ["waterGuardianWon", "水鏡の音", "水の精霊が、澄んだ音を鈴へ結んだ。"],
        windChime: ["windGuardianWon", "追風の音", "風の精霊が、軽やかな音を鈴へ結んだ。"],
        lightChime: ["lightGuardianWon", "陽虹の音", "光の精霊が、温かな音を鈴へ結んだ。"],
      }[special.type];
      const key = `${this.state.map}:${special.id}`;
      if (this.state.gathered[key]) {
        this.dialogue({ speaker: "小さな精霊", portrait: "spirit", text: "この場所の音は、もうあなたの鈴の中にいる。" });
      } else if (!this.state.flags[config[0]]) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: `${config[1]}を守る強い精霊が、こちらの力を試している。` });
      } else {
        this.state.gathered[key] = true;
        addItem(this.state, special.type, 1);
        this.audio.sfx("save");
        this.dialogue([
          { speaker: "小さな精霊", portrait: "spirit", text: config[2] },
          { speaker: "SYSTEM", portrait: "system", text: `${config[1]}を手に入れた！` },
        ]);
      }
    } else if (special.type === "spiritAltar") {
      this.talk({ id: "sarina" });
    } else if (special.type === "spiritBoard") {
      if (this.state.quests.lostSpirit === "locked") this.state.quests.lostSpirit = "active";
      this.dialogue([
        { speaker: "木札", portrait: "system", text: "『峠へ遊びに出た小さな灯が帰らない。見かけた旅人は精霊守へ風を届けてほしい』" },
        { speaker: "SYSTEM", portrait: "system", text: "サブクエスト『帰れない小さな灯』を記録した。" },
      ]);
    } else if (special.type === "spiritGate") {
      if (this.state.flags.spiritGateOpen) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "水、風、光の響石が虹色に共鳴し、奥への扉を開いている。" });
      } else if (!this.state.flags.sarinaJoined) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "響石には精霊文字が刻まれている。今は音の意味を読み取れない。" });
      } else {
        const answer = (correct) => {
          if (correct) {
            this.state.flags.spiritGateOpen = true;
            this.state.happy = Math.min(100, this.state.happy + 15);
            this.audio.sfx("save");
            this.dialogueQueue[this.dialogueIndex + 1] = {
              speaker: "紗理菜",
              portrait: "sarina",
              text: "水が風を呼び、風が雲を払い、光が虹を結んだ……！　扉が開きます！",
            };
          } else {
            this.state.flags.spiritPuzzleFailed = true;
            this.state.happy = Math.max(0, this.state.happy - 12);
            this.audio.sfx("no");
            this.dialogueQueue[this.dialogueIndex + 1] = {
              speaker: "紗理菜",
              portrait: "sarina",
              text: "音がぶつかって消えてしまいました。森の精霊たちの言葉を、もう一度つないでみましょう。",
            };
          }
        };
        this.dialogue([
          {
            speaker: "三つの響石",
            portrait: "system",
            text: "三つの音を、精霊が語った順に鳴らす。",
            choices: [
              { label: "水 → 風 → 光", action: () => answer(true) },
              { label: "光 → 水 → 風", action: () => answer(false) },
              { label: "風 → 光 → 水", action: () => answer(false) },
            ],
          },
          { speaker: "SYSTEM", portrait: "system", text: "三つの響石は静かに待っている。" },
        ]);
      }
    } else if (special.type === "sanctumLever") {
      if (this.state.flags.sanctumShortcut) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "根の昇降路は入口まで通じている。" });
      } else {
        this.state.flags.sanctumShortcut = true;
        this.audio.sfx("save");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "精霊樹の根を動かし、神域入口への近道を開いた！" });
      }
    } else if (special.type === "windBoard") {
      if (this.state.quests.lostFan === "locked") this.state.quests.lostFan = "active";
      this.dialogue([
        { speaker: "大会掲示板", portrait: "system", text: "『応援旗を追って街道南へ入った少年が未帰還。見つけた者は姉へ知らせてほしい』" },
        { speaker: "SYSTEM", portrait: "system", text: "サブクエスト『向かい風の応援旗』を記録した。" },
      ]);
    } else if (special.type === "windCamp") {
      if (this.state.flags.windCampRested) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "風除けの布は裂れている。ここではもう休めない。" });
      } else {
        this.state.flags.windCampRested = true;
        for (const member of activeParty(this.state)) {
          member.hp = Math.min(maxHp(member), member.hp + Math.ceil(maxHp(member) * 0.32));
          member.mp = Math.min(member.maxMp, member.mp + 10);
        }
        this.audio.sfx("heal");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "風除けの野営地で一度だけ休み、HPとMPが少し回復した。" });
      }
    } else if (special.type === "arenaFinal") {
      const ready = ["arenaStoneWon", "arenaSwiftWon", "arenaEchoWon"]
        .every((flag) => this.state.flags[flag]);
      if (this.state.flags.arenaFinalWon) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "決勝円には、五人の足跡が風車の形に残っている。" });
      } else if (!this.state.flags.metKatoshi) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "決勝円は静かだ。街で対戦相手の指名を受ける必要がある。" });
      } else if (!ready) {
        const wins = ["arenaStoneWon", "arenaSwiftWon", "arenaEchoWon"]
          .filter((flag) => this.state.flags[flag]).length;
        this.dialogue({ speaker: "闘技場主", portrait: "arenaMaster", text: `勝印は${wins}/3個。三つの型を越えた者だけが決勝円へ立てる。` });
      } else {
        this.startArenaFinal();
      }
    } else if (special.type === "windVaneNorth" || special.type === "windVaneSouth") {
      const flag = special.type === "windVaneNorth" ? "windSealNorth" : "windSealSouth";
      const label = special.type === "windVaneNorth" ? "北" : "南";
      if (this.state.flags[flag]) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: `${label}の風向計は塔の中央を向いている。` });
      } else {
        this.state.flags[flag] = true;
        this.audio.sfx("save");
        const both = this.state.flags.windSealNorth && this.state.flags.windSealSouth;
        this.dialogue({
          speaker: "SYSTEM",
          portrait: "system",
          text: both
            ? `${label}の風向計を内側へ向けた。二つの風が重なり、中央の昇降翼が動き出した！`
            : `${label}の風向計を塔の中央へ向けた。遠くでもう一つの風が逆らっている。`,
        });
      }
    } else if (special.type === "towerLever") {
      if (this.state.flags.towerShortcut) {
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "折り畳み翼は下層入口まで通じている。" });
      } else {
        this.state.flags.towerShortcut = true;
        this.audio.sfx("save");
        this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "折り畳み翼を開き、塔の入口へ戻る近道を作った！" });
      }
    } else if (special.type === "boss") {
      this.startChapterBoss();
    } else if (special.type === "boss2") {
      this.startChapter2Boss();
    } else if (special.type === "boss3") {
      this.startChapter3Boss();
    } else if (special.type === "boss4") {
      this.startChapter4Boss();
    }
  }

  openInn() {
    const cost = this.state.map === "katoshia" ? 42 : 24;
    const isMirelia = this.state.map === "mileria";
    const isSarinaria = this.state.map === "sarinaria";
    const isKatoshia = this.state.map === "katoshia";
    this.panelContext = { type: "inn", returnMode: "map" };
    this.ui.panelEyebrow.textContent = "INN";
    this.ui.panelTitle.textContent = isKatoshia ? "風見鶏の宿" : isSarinaria ? "木漏れ日の宿" : isMirelia ? "麦灯り亭" : "青鳥亭";
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
    const isMirelia = this.state.map === "mileria";
    const isSarinaria = this.state.map === "sarinaria";
    const isKatoshia = this.state.map === "katoshia";
    this.panelContext = { type: "church", returnMode: "map" };
    this.ui.panelEyebrow.textContent = "SANCTUARY";
    this.ui.panelTitle.textContent = isKatoshia ? "蒼天の礼拝堂" : isSarinaria ? "精霊樹の祈り場" : isMirelia ? "麦穂の礼拝堂" : "風鐘の礼拝堂";
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
      const cost = this.state.map === "katoshia" ? 42 : 24;
      if (this.state.gold < cost) return;
      this.state.gold -= cost;
      fullHeal(this.state);
      this.state.lastSafe = {
        map: this.state.map,
        x: this.state.x,
        y: this.state.y,
        dir: this.state.dir,
      };
      this.buildMapEnemies();
      this.audio.sfx("heal");
      this.closePanel();
      this.dialogue(
        { speaker: "宿屋の主人", portrait: "inn", text: "よく休めましたか？　旅の続きもお気をつけて。" },
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
    if (group.includes("hushAvatar")) {
      const totems = enemies.filter((enemy) => enemy.kind === "muteTotem");
      if (totems[0]) totems[0].weakness = "wind";
      if (totems[1]) totems[1].weakness = "light";
    }
    if (group.includes("tempestMirror")) {
      const eyes = enemies.filter((enemy) => enemy.kind === "stormEye");
      if (eyes[0]) eyes[0].weakness = "light";
      if (eyes[1]) eyes[1].weakness = "fire";
    }
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
      barrier: group.includes("smileEater") || group.includes("blightHeart") || group.includes("hushAvatar") || group.includes("tempestMirror"),
      barrierBrokenRounds:
        group.includes("blightHeart") && this.state.flags.breadChoice === "crisp" ? 2 : 0,
      telegraph: null,
      resonance: group.includes("hushAvatar") ? "fire" : null,
      windBreakRounds: 0,
      enemyIntents: [],
      formation: false,
      cutIn: null,
      log: options.preemptive
        ? "背後を取った！　こちらが先に動ける。"
        : options.ambush
          ? "魔物に不意を突かれた！"
          : `${enemies.map((enemy) => enemy.name).join("、")}が現れた！`,
    };
    this.state.battles += 1;
    this.setMode("battle");
    this.audio.play(
      group.some((id) => ["smileEater", "gloomMoth", "blightHeart", "blightScarecrow", "hushAvatar", "rippleGuardian", "gustGuardian", "prismGuardian", "arenaBulwark", "arenaRaptor", "arenaMage", "katoshiDuel", "tempestMirror"].includes(id))
        ? "boss"
        : "battle",
    );
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
        : this.battle.telegraph === "rotBurst"
          ? "飢渇核が地中の瘴気を集め、激しく脈打っている……！"
        : this.battle.telegraph === "silenceNova"
          ? "無響獣がすべての音を吸い込み、心室が無音に沈んでいく……！"
        : this.battle.telegraph === "stormDive"
          ? "颶風鏡が塔の風を一点へ集め、天落としの軌道へ入った……！"
        : danger
          ? `${danger}${this.resonanceLabel()}　— ${alive[0].name}の行動を選んでください。`
          : `${alive[0].name}の行動を選んでください。${this.resonanceLabel()}`;
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
      const usable = ["herb", "happyBread", "spiritNectar", "galeTonic", "moonwort", "auraDrop", "brightBell", "smokeBomb"];
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
      const targetType = ["herb", "spiritNectar", "galeTonic", "moonwort", "auraDrop"].includes(id)
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
    const actionDelay =
      this.battle.cutIn && performance.now() - this.battle.cutIn.born < this.battle.cutIn.duration
        ? this.battle.cutIn.duration
        : 430;
    this.delay(actionDelay, () => this.executeQueue(queue, index + 1, done));
  }

  executePartyAction(actor, action) {
    if (actor.status.fear && Math.random() < 0.2) {
      this.battle.log = `${actor.name}は恐怖で足がすくんだ！`;
      this.audio.sfx("no");
      return;
    }
    if (actor.status.silence && action.type === "skill") {
      this.battle.log = `${actor.name}は沈黙していて技の声を出せない！`;
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
      if (target.hp > 0 && target.status?.counter) {
        const returned = this.hurtParty(
          actor,
          this.calculateDamage(target.atk, this.effectiveStat(actor, "def"), 0.82),
          "wind",
        );
        target.status.counter = 0;
        this.battle.log += `　反風の構え！　${actor.name}へ${returned}の反撃。`;
      }
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

  triggerSkillCutIn(actor, skill, skillId) {
    if (!this.battle || CUTIN_SKILLS[skillId] !== actor.id) return;
    this.battle.cutIn = {
      actorId: actor.id,
      actorName: actor.name,
      skillName: skill.name,
      born: performance.now(),
      duration: 920,
    };
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
      this.triggerSkillCutIn(actor, skill, action.id);
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
    this.triggerSkillCutIn(actor, skill, action.id);
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
    } else if (skill.effect === "mireiHeal") {
      const target = this.state.party[action.target];
      if (!target || target.hp <= 0) return;
      const amount = Math.ceil(skill.power + this.effectiveStat(actor, "mag"));
      const healed = Math.min(amount, maxHp(target) - target.hp);
      target.hp += healed;
      target.status.poison = 0;
      this.state.happy = clamp(this.state.happy + 12, 0, 100);
      this.state.stats.healingDone += healed;
      this.battle.log = `${actor.name}の焼きたてヒール！　${target.name}のHPが${healed}回復し、毒が消えた。`;
      this.audio.sfx("heal");
    } else if (skill.effect === "breadWard") {
      let total = 0;
      for (const member of activeParty(this.state).filter((entry) => entry.hp > 0)) {
        const amount = Math.ceil(18 + this.effectiveStat(actor, "mag") * 0.45);
        const healed = Math.min(amount, maxHp(member) - member.hp);
        member.hp += healed;
        member.status.poison = 0;
        member.status.fear = 0;
        member.status.regen = 3;
        total += healed;
      }
      this.state.happy = clamp(this.state.happy + 15, 0, 100);
      this.state.stats.healingDone += total;
      this.battle.log = `ハッピーブレッド！　味方全体が${total}回復し、再生の香りに包まれた。`;
      this.audio.sfx("heal");
    } else if (skill.effect === "panBreak") {
      const target = this.findEnemyTarget(action.target);
      if (!target) return;
      const attack =
        this.effectiveStat(actor, "atk") + Math.floor(this.effectiveStat(actor, "mag") * 0.55);
      let multiplier = skill.power;
      if (target.weakness === skill.element) multiplier *= 1.38;
      const damage = this.calculateDamage(attack, this.enemyStat(target, "def"), multiplier);
      target.status.atkDown = 3;
      target.guarding = false;
      this.hitEnemy(target, damage, skill.element);
      this.state.happy = clamp(this.state.happy + 10, 0, 100);
      this.battle.log = `${actor.name}の聖火のひと振り！　${target.name}に${damage}、攻撃力を下げた。`;
      this.audio.sfx("hit");
    } else if (skill.effect === "sacredBell") {
      let total = 0;
      for (const member of activeParty(this.state).filter((entry) => entry.hp > 0)) {
        const amount = Math.ceil(20 + this.effectiveStat(actor, "mag") * 0.55);
        const healed = Math.min(amount, maxHp(member) - member.hp);
        member.hp += healed;
        member.status.silence = 0;
        member.status.fear = 0;
        member.status.rooted = 0;
        total += healed;
      }
      this.state.happy = clamp(this.state.happy + 14, 0, 100);
      this.state.stats.healingDone += total;
      this.battle.log = `聖なる鈴！　味方全体が合計${total}回復し、沈黙・恐怖・鈍足が消えた。`;
      this.audio.sfx("heal");
    } else if (skill.effect === "spiritWard") {
      for (const member of activeParty(this.state).filter((entry) => entry.hp > 0))
        member.status.spiritWard = 3;
      this.state.happy = clamp(this.state.happy + 12, 0, 100);
      this.battle.log = "精霊の守り！　味方全体を属性の光膜が包んだ。";
      this.audio.sfx("magic");
    } else if (skill.effect === "rainbowPrayer") {
      const target = this.findEnemyTarget(action.target);
      if (!target) return;
      const element = target.weakness || this.battle.resonance || "light";
      const attack = this.effectiveStat(actor, "mag") + Math.floor(this.effectiveStat(actor, "atk") * 0.35);
      const damage = this.calculateDamage(attack, this.enemyStat(target, "def"), skill.power * 1.3);
      this.battle.barrierBrokenRounds = Math.max(1, this.battle.barrierBrokenRounds);
      this.hitEnemy(target, damage, element);
      this.state.happy = clamp(this.state.happy + 12, 0, 100);
      this.battle.log = `虹色の祈り！　${this.elementName(element)}の響きが${target.name}の弱点を突き、${damage}のダメージ。`;
      this.audio.sfx("magic");
      this.flash();
    } else if (skill.effect === "sarimakashi") {
      let total = 0;
      for (const member of activeParty(this.state).filter((entry) => entry.hp > 0)) {
        const amount = Math.ceil(35 + this.effectiveStat(actor, "mag") * 0.8);
        const healed = Math.min(amount, maxHp(member) - member.hp);
        member.hp += healed;
        member.status.silence = 0;
        member.status.fear = 0;
        member.status.auraDown = 0;
        member.status.regen = 3;
        member.status.spiritWard = 3;
        total += healed;
      }
      this.state.happy = clamp(this.state.happy + 18, 0, 100);
      this.state.stats.healingDone += total;
      this.battle.log = `サリマカシー！　味方全体が合計${total}回復し、精霊の加護に包まれた。`;
      this.audio.sfx("win");
    } else if (skill.effect === "henyoSlash") {
      const target = this.findEnemyTarget(action.target);
      if (!target) return;
      const attack = this.effectiveStat(actor, "atk") + Math.floor(this.effectiveStat(actor, "spd") * 0.3);
      let total = 0;
      target.guarding = false;
      target.status.counter = 0;
      this.battle.windBreakRounds = Math.max(2, this.battle.windBreakRounds);
      this.battle.barrierBrokenRounds = Math.max(2, this.battle.barrierBrokenRounds);
      for (let hit = 0; hit < 2; hit += 1) {
        const damage = this.calculateDamage(attack, this.enemyStat(target, "def"), skill.power);
        total += damage;
        this.hitEnemy(target, damage, "wind");
      }
      this.state.happy = clamp(this.state.happy + 12, 0, 100);
      this.battle.log = `へにょへにょ斬り！　力を抜いた二連撃が構えをほどき、${target.name}に合計${total}のダメージ。`;
      this.audio.sfx("hit");
    } else if (skill.effect === "galeStep") {
      const target = this.state.party[action.target];
      if (!target) return;
      target.status.haste = 3;
      target.status.evade = 3;
      target.status.rooted = 0;
      this.state.happy = clamp(this.state.happy + 10, 0, 100);
      this.battle.log = `疾風のステップ！　${target.name}の素早さと回避が上がった。`;
      this.audio.sfx("magic");
    } else if (skill.effect === "katoshiCombo") {
      const target = this.findEnemyTarget(action.target);
      if (!target) return;
      const attack = this.effectiveStat(actor, "atk") + Math.floor(this.effectiveStat(actor, "spd") * 0.45);
      const damage = this.calculateDamage(attack, this.enemyStat(target, "def"), skill.power);
      const interrupted = this.battle.telegraph === "stormDive";
      if (interrupted) this.battle.telegraph = null;
      this.battle.windBreakRounds = Math.max(2, this.battle.windBreakRounds);
      this.battle.barrierBrokenRounds = Math.max(2, this.battle.barrierBrokenRounds);
      target.status.counter = 0;
      this.hitEnemy(target, damage, "wind");
      this.state.happy = clamp(this.state.happy + 14, 0, 100);
      this.battle.log = `かとしコンビネーション！　${target.name}に${damage}のダメージ${interrupted ? "、天落としの風を散らした！" : "。"}`;
      this.audio.sfx("win");
    } else if (skill.effect === "skyDance") {
      let total = 0;
      for (const target of this.battle.enemies.filter((enemy) => enemy.hp > 0)) {
        target.guarding = false;
        target.status.counter = 0;
        for (let hit = 0; hit < 3; hit += 1) {
          const damage = this.calculateDamage(
            this.effectiveStat(actor, "atk") + Math.floor(this.effectiveStat(actor, "spd") * 0.25),
            this.enemyStat(target, "def"),
            skill.power * 0.52,
          );
          total += damage;
          this.hitEnemy(target, damage, "wind");
        }
      }
      this.battle.barrierBrokenRounds = Math.max(2, this.battle.barrierBrokenRounds);
      this.state.happy = clamp(this.state.happy + 18, 0, 100);
      this.battle.log = `天空の剣舞！　三筋の風が敵全体を駆け抜け、合計${total}のダメージ。`;
      this.audio.sfx("win");
      this.flash();
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
    } else if (action.id === "spiritNectar") {
      const target = this.state.party[action.target];
      const healed = Math.min(55, maxHp(target) - target.hp);
      const restored = Math.min(8, target.maxMp - target.mp);
      target.hp += healed;
      target.mp += restored;
      target.status.silence = 0;
      this.state.stats.healingDone += healed;
      this.state.happy = clamp(this.state.happy + 8, 0, 100);
      this.battle.log = `${target.name}のHPが${healed}、MPが${restored}回復し、沈黙が消えた。`;
      this.audio.sfx("heal");
    } else if (action.id === "galeTonic") {
      const target = this.state.party[action.target];
      const healed = Math.min(45, maxHp(target) - target.hp);
      target.hp += healed;
      target.status.rooted = 0;
      target.status.haste = 3;
      this.state.stats.healingDone += healed;
      this.state.happy = clamp(this.state.happy + 8, 0, 100);
      this.battle.log = `${target.name}のHPが${healed}回復し、追風で素早さが上がった。`;
      this.audio.sfx("heal");
    } else if (action.id === "happyBread") {
      let total = 0;
      for (const member of activeParty(this.state).filter((entry) => entry.hp > 0)) {
        const healed = Math.min(25, maxHp(member) - member.hp);
        member.hp += healed;
        total += healed;
      }
      this.state.stats.healingDone += total;
      this.state.happy = clamp(this.state.happy + 10, 0, 100);
      this.battle.log = `ハッピーブレッドを分け合い、味方全体が合計${total}回復した。`;
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
    if (enemy.kind === "blightHeart") {
      if (this.battle.telegraph === "rotBurst") return "rotBurst";
      if (this.battle.round % 3 === 2) return "telegraphRot";
      if (this.state.happy >= 40 && this.battle.round % 3 === 1) return "devour";
      return this.battle.round % 2 ? "seedStorm" : "attack";
    }
    if (enemy.kind === "hushAvatar") {
      if (this.battle.telegraph === "silenceNova") return "silenceNova";
      if (this.battle.round % 4 === 3) return "telegraphSilence";
      if (this.state.happy >= 45 && this.battle.round % 4 === 1) return "spiritDevour";
      return this.battle.round % 2 ? "muteSong" : "elementBurst";
    }
    if (enemy.kind === "tempestMirror") {
      if (this.battle.telegraph === "stormDive") return "stormDive";
      if (this.battle.round % 4 === 2) return "telegraphStorm";
      if (this.battle.round % 3 === 0) return "mirrorGuard";
      return this.battle.round % 2 ? "windBurst" : "attack";
    }
    if (enemy.kind === "katoshiDuel") {
      const cycle = ["feint", "mirrorGuard", "duelRush", "windCut"];
      return cycle[(this.battle.round - 1) % cycle.length];
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
      seedShot: "毒の種を狙う",
      rootBind: "足止めの根を伸ばす",
      stealBread: "オーラをついばむ",
      seedStorm: "全体へ種の嵐",
      flourCloud: "沈黙の粉をまく",
      devour: "力を吸収する",
      telegraphRot: "大技の準備",
      rotBurst: "腐蝕の大波",
      sporeSilence: "沈黙の胞子",
      spiritSplash: "水の全体攻撃",
      galeFang: "素早い風牙",
      prismGuard: "属性反射の構え",
      spiritBolt: "精霊弾",
      muteSong: "技封じの沈黙",
      elementBurst: "共鳴属性の波",
      spiritDevour: "精霊力を吸収する",
      telegraphSilence: "大技の準備",
      silenceNova: "無音の大波",
      feint: "狙いを惑わす",
      windCut: "風の斬撃",
      windBurst: "全体へ暴風",
      mirrorGuard: "反撃の構え",
      duelRush: "高速連撃",
      telegraphStorm: "天落としの準備",
      stormDive: "天落とし",
    }[action] || "こちらを狙う";
  }

  elementName(element) {
    return { fire: "炎", wind: "風", light: "光", dark: "闇", water: "水", earth: "土" }[element] || "無";
  }

  resonanceLabel() {
    if (!this.battle?.resonance) return "";
    return `　【現在の共鳴：${this.elementName(this.battle.resonance)}】`;
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
    if (action === "telegraphRot") {
      this.battle.telegraph = "rotBurst";
      this.battle.log = "飢渇核は根を地中深く伸ばし、腐蝕の力を集め始めた……！";
      this.audio.sfx("no");
      return;
    }
    if (action === "telegraphSilence") {
      this.battle.telegraph = "silenceNova";
      this.battle.log = "無響獣が鈴も声も吸い込み、巨大な無音の波を溜め始めた……！";
      this.audio.sfx("no");
      return;
    }
    if (action === "telegraphStorm") {
      this.battle.telegraph = "stormDive";
      this.battle.log = "颶風鏡が塔の風を一点へ集め、天落としの軌道へ入った……！";
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
    if (action === "rotBurst") {
      this.battle.telegraph = null;
      let total = 0;
      for (const member of living) {
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 1.12),
          "dark",
        );
        if (!member.status.guard && !member.status.formation && Math.random() < 0.65)
          member.status.poison = 3;
      }
      this.state.happy = Math.max(0, this.state.happy - 15);
      this.battle.log = `腐蝕の大波！　味方全体に合計${total}のダメージ。毒の胞子が舞う！`;
      this.shake();
      return;
    }
    if (action === "silenceNova") {
      this.battle.telegraph = null;
      let total = 0;
      for (const member of living) {
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 1.18),
          "dark",
        );
        const silenceResist = ITEMS[member.equipment.accessory]?.resist === "silence";
        if (!silenceResist && !member.status.spiritWard && !member.status.guard && Math.random() < 0.72)
          member.status.silence = 2;
      }
      this.state.happy = Math.max(0, this.state.happy - 18);
      this.battle.log = `無音の大波！　味方全体に合計${total}のダメージ。技の声が奪われる！`;
      this.shake();
      return;
    }
    if (action === "stormDive") {
      if (this.battle.telegraph !== "stormDive") {
        this.battle.log = "史帆の連携剣で風の軌道は散り、天落としは不発に終わった！";
        return;
      }
      this.battle.telegraph = null;
      let total = 0;
      for (const member of living) {
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 1.26),
          "wind",
        );
        if (!member.status.guard && !member.status.formation) member.status.rooted = 2;
      }
      this.state.happy = Math.max(0, this.state.happy - 16);
      this.battle.log = `天落とし！　味方全体に合計${total}のダメージ。暴風で足を取られた！`;
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
    } else if (action === "seedShot") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.mag, this.effectiveStat(target, "def"), 0.82),
        "earth",
      );
      target.status.poison = 3;
      this.battle.log = `${enemy.name}の毒種弾！　${target.name}に${damage}、毒に侵された。`;
    } else if (action === "rootBind") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 0.72),
      );
      target.status.rooted = 3;
      this.battle.log = `${enemy.name}の根縛り！　${target.name}に${damage}、動きが鈍った。`;
    } else if (action === "stealBread") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 0.78),
      );
      this.state.happy = Math.max(0, this.state.happy - 8);
      this.battle.log = `${enemy.name}が明るい気配をついばんだ！　${damage}ダメージ、ゲージが8減った。`;
    } else if (action === "seedStorm") {
      let total = 0;
      for (const member of living)
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag || enemy.atk, this.effectiveStat(member, "def"), 0.66),
          "earth",
        );
      this.battle.log = `${enemy.name}の種の嵐！　味方全体に合計${total}のダメージ。`;
      this.shake();
    } else if (action === "flourCloud") {
      for (const member of living) {
        if (Math.random() < 0.55) member.status.auraDown = 2;
      }
      this.battle.log = `${enemy.name}の小麦粉雲！　味方の魔力と攻撃が曇った。`;
      this.audio.sfx("no");
    } else if (action === "devour") {
      const amount = Math.min(28, this.state.happy);
      this.state.happy -= amount;
      const heal = Math.min(enemy.maxHp - enemy.hp, amount * 2);
      enemy.hp += heal;
      this.battle.log = `${enemy.name}はハッピーオーラを喰らい、${heal}回復した！`;
      this.audio.sfx("no");
    } else if (action === "sporeSilence") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.mag, this.effectiveStat(target, "def"), 0.68),
        "earth",
      );
      const resist = ITEMS[target.equipment.accessory]?.resist === "silence";
      if (!resist) target.status.silence = 2;
      this.battle.log = `${enemy.name}の沈黙胞子！　${target.name}に${damage}、技の声を封じた。`;
    } else if (action === "spiritSplash") {
      let total = 0;
      for (const member of living)
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 0.62),
          "water",
        );
      this.battle.log = `${enemy.name}の精霊水流！　味方全体に合計${total}のダメージ。`;
      this.shake();
    } else if (action === "galeFang") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 1.32),
        "wind",
      );
      target.status.rooted = 2;
      this.battle.log = `${enemy.name}の追風牙！　${target.name}に${damage}、体勢を崩した。`;
    } else if (action === "prismGuard") {
      enemy.guarding = true;
      enemy.status.prism = 2;
      this.battle.log = `${enemy.name}は虹色の甲殻を閉じた。弱点属性なら守りを割れる！`;
    } else if (action === "spiritBolt") {
      const element = this.battle.resonance || "light";
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.mag, this.effectiveStat(target, "def"), 1.02),
        element,
      );
      this.battle.log = `${enemy.name}の${this.elementName(element)}の精霊弾！　${target.name}に${damage}のダメージ。`;
    } else if (action === "muteSong") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.mag, this.effectiveStat(target, "def"), 0.72),
        "dark",
      );
      const resist = ITEMS[target.equipment.accessory]?.resist === "silence";
      if (!resist && !target.status.spiritWard) target.status.silence = 2;
      this.battle.log = `${enemy.name}の無言歌！　${target.name}に${damage}、技の声を奪った。`;
      this.audio.sfx("no");
    } else if (action === "elementBurst") {
      const element = this.battle.resonance || "fire";
      let total = 0;
      for (const member of living)
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 0.78),
          element,
        );
      this.battle.log = `${this.elementName(element)}の共鳴波！　味方全体に合計${total}のダメージ。`;
      this.shake();
    } else if (action === "spiritDevour") {
      const amount = Math.min(26, this.state.happy);
      this.state.happy -= amount;
      const heal = Math.min(enemy.maxHp - enemy.hp, amount * 2);
      enemy.hp += heal;
      for (const member of living)
        if (Math.random() < 0.4) member.status.auraDown = 2;
      this.battle.log = `${enemy.name}が精霊とハッピーオーラを吸収し、${heal}回復した！`;
      this.audio.sfx("no");
    } else if (action === "feint") {
      target.status.rooted = 2;
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 0.7),
        "physical",
      );
      this.battle.log = `${enemy.name}の幻惑歩法！　${target.name}に${damage}、足運びを乱した。`;
    } else if (action === "windCut") {
      const damage = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 1.22),
        "wind",
      );
      this.battle.log = `${enemy.name}の風切り！　${target.name}に${damage}のダメージ。`;
      this.shake();
    } else if (action === "windBurst") {
      let total = 0;
      for (const member of living)
        total += this.hurtParty(
          member,
          this.calculateDamage(enemy.mag, this.effectiveStat(member, "def"), 0.7),
          "wind",
        );
      this.battle.log = `${enemy.name}の暴風波！　味方全体に合計${total}のダメージ。`;
      this.shake();
    } else if (action === "mirrorGuard") {
      enemy.guarding = true;
      enemy.status.counter = 2;
      this.battle.log = `${enemy.name}は風を鏡のように張り、通常攻撃への反撃を構えた。`;
      this.audio.sfx("no");
    } else if (action === "duelRush") {
      const first = this.hurtParty(
        target,
        this.calculateDamage(enemy.atk, this.effectiveStat(target, "def"), 0.82),
        "wind",
      );
      const next = living.find((member) => member.id !== target.id) || target;
      const second = this.hurtParty(
        next,
        this.calculateDamage(enemy.atk, this.effectiveStat(next, "def"), 0.74),
        "wind",
      );
      this.battle.log = `${enemy.name}の疾風連撃！　二人へ合計${first + second}のダメージ。`;
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
      if (member.status.regen) {
        const healed = Math.min(Math.ceil(maxHp(member) * 0.08), maxHp(member) - member.hp);
        member.hp += healed;
        this.state.stats.healingDone += healed;
        if (healed > 0) this.battle.log = `${member.name}はパンの香りで${healed}回復。`;
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
    if (this.battle.windBreakRounds > 0) this.battle.windBreakRounds -= 1;
    if (this.battle.resonance) {
      const cycle = ["fire", "wind", "light"];
      this.battle.resonance = cycle[(cycle.indexOf(this.battle.resonance) + 1) % cycle.length];
      const boss = this.battle.enemies.find((enemy) => enemy.kind === "hushAvatar");
      if (boss?.hp > 0) boss.weakness = this.battle.resonance;
    }
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
    if (key === "spd" && character.status.rooted) value *= 0.58;
    if (["atk", "mag"].includes(key) && character.status.auraDown) value *= 0.76;
    return Math.round(value);
  }

  enemyStat(enemy, key) {
    let value = enemy[key] || 0;
    if (key === "def" && enemy.guarding) value *= 1.8;
    if (["atk", "mag"].includes(key) && enemy.status?.atkDown) value *= 0.72;
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
    if (enemy.kind === "blightHeart" && this.battle.barrier) {
      const roots = this.battle.enemies.some(
        (entry) => entry.kind === "dryRoot" && entry.hp > 0,
      );
      if (this.battle.barrierBrokenRounds <= 0)
        damage = Math.max(1, Math.round(damage * (roots ? 0.38 : 0.72)));
    }
    if (enemy.kind === "hushAvatar" && this.battle.barrier) {
      const totems = this.battle.enemies.some(
        (entry) => entry.kind === "muteTotem" && entry.hp > 0,
      );
      if (this.battle.barrierBrokenRounds <= 0) {
        if (element !== enemy.weakness)
          damage = Math.max(1, Math.round(damage * (totems ? 0.24 : 0.48)));
        else if (totems)
          damage = Math.max(1, Math.round(damage * 0.72));
      }
    }
    if (enemy.kind === "tempestMirror" && this.battle.barrier) {
      const eyes = this.battle.enemies.some(
        (entry) => entry.kind === "stormEye" && entry.hp > 0,
      );
      if (eyes && this.battle.windBreakRounds <= 0)
        damage = Math.max(1, Math.round(damage * 0.34));
      else if (eyes)
        damage = Math.max(1, Math.round(damage * 0.78));
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
    enemy.lastElement = element;
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
    if (
      enemy.kind === "dryRoot" &&
      enemy.hp <= 0 &&
      !this.battle.enemies.some(
        (entry) => entry !== enemy && entry.kind === "dryRoot" && entry.hp > 0,
      )
    ) {
      this.battle.barrier = false;
      this.battle.log += "　二本の根が枯れ、飢渇核の殻が崩れた！";
    }
    if (
      enemy.kind === "muteTotem" &&
      enemy.hp <= 0 &&
      !this.battle.enemies.some(
        (entry) => entry !== enemy && entry.kind === "muteTotem" && entry.hp > 0,
      )
    ) {
      this.battle.barrier = false;
      this.battle.log += "　二つの依代が砕け、無響獣を守る沈黙が消えた！";
    }
    if (
      enemy.kind === "stormEye" &&
      enemy.hp <= 0 &&
      !this.battle.enemies.some(
        (entry) => entry !== enemy && entry.kind === "stormEye" && entry.hp > 0,
      )
    ) {
      this.battle.barrier = false;
      this.battle.log += "　二つの暴風眼が消え、颶風鏡の風圧障壁が砕けた！";
    }
  }

  hurtParty(member, amount, _element = "physical") {
    if (
      member.status.evade &&
      ["physical", "wind"].includes(_element) &&
      Math.random() < 0.48
    ) {
      this.audio.sfx("ok");
      return 0;
    }
    let damage = amount;
    if (member.status.guard) damage *= 0.48;
    if (member.status.formation) damage *= 0.5;
    if (member.status.bright && _element === "dark") damage *= 0.58;
    if (member.status.spiritWard && _element !== "physical") damage *= 0.58;
    const shield = ITEMS[member.equipment.shield];
    if (shield?.resist === "fear" && _element === "dark") damage *= 0.82;
    const body = ITEMS[member.equipment.body];
    if (body?.resist === _element) damage *= 0.72;
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
    } else if (story === "scarecrow") {
      this.finishScarecrow(levelLines);
    } else if (story === "chapter2Boss") {
      this.finishChapter2Boss(levelLines);
    } else if (["waterTrial", "windTrial", "lightTrial"].includes(story)) {
      this.finishSpiritTrial(story, levelLines);
    } else if (story === "chapter3Boss") {
      this.finishChapter3Boss(levelLines);
    } else if (["arenaStone", "arenaSwift", "arenaEcho"].includes(story)) {
      this.finishArenaTrial(story, levelLines);
    } else if (story === "arenaFinal") {
      this.completeKatoshiJoin(levelLines);
    } else if (story === "chapter4Boss") {
      this.finishChapter4Boss(levelLines);
    } else {
      this.setMode("map");
      this.audio.play(
        ["solaido", "mileria", "sarinaria", "katoshia"].includes(this.state.map)
          ? "town"
          : ["cave1", "cave2", "cave3", "oldWell", "echoGrove", "granary1", "granary2", "whisperWood", "spiritSanctum", "spiritHeart", "skyArena", "windTower1", "windTower2"].includes(this.state.map)
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
    this.state.quests.chapter1 = "complete";
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

  finishScarecrow(levelLines = []) {
    this.state.flags.scarecrowWon = true;
    this.audio.play("field");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "枯れ穂の番人が崩れ、黄金麦を覆っていた黒い糸が消えた。畑の奥を調べられる。",
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

  startChapter2Boss() {
    if (this.state.flags.chapter2BossWon) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "枯れた根の間から、新しい麦の芽が顔を出している。" });
      return;
    }
    if (!this.state.flags.mireiJoined) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "腐蝕の瘴気が濃すぎる。パンの香りで守りを得なければ近づけない。" });
      return;
    }
    this.state.flags.chapter2BossSeen = true;
    discoverRumor(this.state, "blightCore");
    this.dialogue(
      [
        {
          speaker: "飢渇核グラノア",
          portrait: "system",
          text: "ワケアエバ、足リナクナル。求メナケレバ、飢エルコトモナイ。",
        },
        {
          speaker: "美玲",
          portrait: "mirei",
          text: "一つのパンでも、分けたら笑顔は増えるよ。足りないなら、また一緒に作ればいい！",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "二本の根が核を守っている。大技の予告を見逃さず、炎と防御を使い分けよう！",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "渇きの根を先に倒すと障壁が消える。美玲の聖火は植物の弱点を突き、攻撃力も下げられる。",
        },
      ],
      () =>
        this.startBattle(["blightHeart", "dryRoot", "dryRoot"], {
          story: "chapter2Boss",
          canEscape: false,
        }),
    );
  }

  finishChapter2Boss(levelLines = []) {
    this.state.flags.chapter2BossWon = true;
    this.state.flags.chapter2Clear = true;
    this.state.flags.postClear = false;
    this.state.quests.chapter2 = "complete";
    this.state.happy = 100;
    fullHeal(this.state);
    this.audio.play("clear");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "美玲",
          portrait: "mirei",
          text: "思い出した。誰かがおいしいって笑ってくれると、私も元気になれた。だから、何度でも作りたかったんだ。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "美玲、その笑顔も、みんなにパンを配って回るところも変わってない。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "金色の光が実った麦畑を走り、二つ目のハッピーオーラの欠片へ結晶した。",
        },
        {
          speaker: "美玲",
          portrait: "mirei",
          text: "風の向こうから、鈴の音がする。次の人も、きっと私たちを待ってるよ。",
        },
      ],
      () => this.showChapterClear(2),
    );
  }

  finishSpiritTrial(story, levelLines = []) {
    const config = {
      waterTrial: ["waterGuardianWon", "水鏡の守り手", "水面が静まり、泉の奥に澄んだ鈴の音が残った。"],
      windTrial: ["windGuardianWon", "追風の守り手", "荒れていた風が道を譲り、高台に軽やかな鈴の音が残った。"],
      lightTrial: ["lightGuardianWon", "陽虹の守り手", "散っていた光が一筋の虹となり、結晶に鈴の音を宿した。"],
    }[story];
    this.state.flags[config[0]] = true;
    this.audio.play("cave");
    this.dialogue(
      [
        ...levelLines,
        { speaker: config[1], portrait: "spirit", text: "チカラダケデナク、声ヲ聞ク者。音ヲ、託ス。" },
        { speaker: "SYSTEM", portrait: "system", text: config[2] },
      ],
      () => {
        this.setMode("map");
        this.refreshHud();
        this.refreshInteractPrompt();
        this.autosave();
      },
    );
  }

  startChapter3Boss() {
    if (this.state.flags.chapter3BossWon) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "虹泉には水音、風音、鈴の音が重なり、精霊たちの会話が戻っている。" });
      return;
    }
    if (!this.state.flags.sarinaJoined || !this.state.flags.spiritGateOpen) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "心室は完全な無音に閉ざされている。巫女と三つの響きを結ばなければ進めない。" });
      return;
    }
    this.state.flags.chapter3BossSeen = true;
    discoverRumor(this.state, "resonanceCore");
    this.dialogue(
      [
        {
          speaker: "無響獣サイレント",
          portrait: "system",
          text: "声ハ誤解ヲ生ム。言葉ハ傷ツケル。ナラバ全テノ音ヲ消セバ、誰モ傷ツカナイ。",
        },
        {
          speaker: "紗理菜",
          portrait: "sarina",
          text: "言葉が届かないことはあります。それでも、聞こうとすることまで諦めたくありません。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "依代は風と光、獣は炎から共鳴を始める。表示された響きに属性を合わせて！",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "無響獣の弱点は炎→風→光と毎ターン変化する。通常攻撃は沈黙障壁に阻まれる。依代、弱点属性、紗理菜の虹色の祈りを使い分けよう。",
        },
      ],
      () =>
        this.startBattle(["hushAvatar", "muteTotem", "muteTotem"], {
          story: "chapter3Boss",
          canEscape: false,
        }),
    );
  }

  finishChapter3Boss(levelLines = []) {
    this.state.flags.chapter3BossWon = true;
    this.state.flags.chapter3Clear = true;
    this.state.flags.postClear = false;
    this.state.quests.chapter3 = "complete";
    this.state.happy = 100;
    fullHeal(this.state);
    this.audio.play("clear");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "紗理菜",
          portrait: "sarina",
          text: "思い出しました。遠い国の言葉も、小さな精霊の声も、分からないからこそ聞いてみたかった。",
        },
        {
          speaker: "美玲",
          portrait: "mirei",
          text: "紗理菜の鈴、みんなの声をちゃんと一つずつ残してくれる音だね。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "四人になった。できることも、守れる場所も増えたね。次の風がどこから来ても大丈夫。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "水、風、光が虹を結び、三つ目のハッピーオーラの欠片へ結晶した。",
        },
      ],
      () => this.showChapterClear(3),
    );
  }

  finishArenaTrial(story, levelLines = []) {
    const config = {
      arenaStone: ["arenaStoneWon", "stoneCrest", "不動のバルガ", "堅陣の勝印"],
      arenaSwift: ["arenaSwiftWon", "swiftCrest", "瞬脚のリュネ", "瞬脚の勝印"],
      arenaEcho: ["arenaEchoWon", "echoCrest", "魔響のセレナ", "魔響の勝印"],
    }[story];
    this.state.flags[config[0]] = true;
    addItem(this.state, config[1], 1);
    const wins = ["arenaStoneWon", "arenaSwiftWon", "arenaEchoWon"]
      .filter((flag) => this.state.flags[flag]).length;
    this.audio.play("cave");
    this.dialogue(
      [
        ...levelLines,
        { speaker: config[2], portrait: "arenaMaster", text: "見事だ。得意な型を押しつけるだけでは、この先の風は読めない。" },
        { speaker: "SYSTEM", portrait: "system", text: `${config[3]}を手に入れた！　予選は${wins}/3勝。` },
        ...(wins === 3
          ? [{ speaker: "闘技場主", portrait: "arenaMaster", text: "三つの勝印が揃った！　中央の決勝円で、風の剣士シホが待っている。" }]
          : []),
      ],
      () => {
        this.setMode("map");
        this.refreshHud();
        this.refreshInteractPrompt();
        this.autosave();
      },
    );
  }

  startArenaFinal() {
    this.dialogue(
      [
        {
          speaker: "史帆",
          portrait: "katoshi",
          text: "守り、速さ、魔法。全部見てきた顔だね。じゃあ最後は、私の風に追いついて。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "史帆は反撃の構えから一気に間合いを詰める。通常攻撃だけで押さず、予告と弱点を見て！",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "決勝は全員で挑める。反撃の構えには属性技、疾風連撃には防御と回復を合わせよう。",
        },
      ],
      () => this.startBattle(["katoshiDuel"], { story: "arenaFinal", canEscape: false }),
    );
  }

  startChapter4Boss() {
    if (this.state.flags.chapter4BossWon) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "天輪には穏やかな風が巡り、空色の羽根がゆっくり舞っている。" });
      return;
    }
    if (!this.state.flags.katoshiJoined) {
      this.dialogue({ speaker: "SYSTEM", portrait: "system", text: "暴風の鏡へ近づけない。風の切れ目を読める剣士が必要だ。" });
      return;
    }
    this.state.flags.chapter4BossSeen = true;
    discoverRumor(this.state, "stormCore");
    this.dialogue(
      [
        {
          speaker: "颶風鏡ヴェントラ",
          portrait: "system",
          text: "遅レル者ハ置イテイケ。立チ止マレバ、価値ハナイ。速サダケガ空ヲ支配スル。",
        },
        {
          speaker: "史帆",
          portrait: "katoshi",
          text: "速くても、一人じゃ遠くまで行けない。待つことも、隣に合わせることも、私の速さだから。",
        },
        {
          speaker: "紗理菜",
          portrait: "sarina",
          text: "二つの暴風眼が鏡を守っています。反撃の構えと大技の予告を、みんなで声に出してつなぎましょう。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "暴風眼がある間、颶風鏡の風圧障壁は強い。史帆の二連撃で構えを崩し、コンビネーションで『天落とし』の溜めを中断できる。",
        },
      ],
      () => this.startBattle(["tempestMirror", "stormEye", "stormEye"], {
        story: "chapter4Boss",
        canEscape: false,
      }),
    );
  }

  finishChapter4Boss(levelLines = []) {
    this.state.flags.chapter4BossWon = true;
    this.state.flags.chapter4Clear = true;
    this.state.flags.postClear = false;
    this.state.quests.chapter4 = "complete";
    this.state.happy = 100;
    fullHeal(this.state);
    this.audio.play("clear");
    this.dialogue(
      [
        ...levelLines,
        {
          speaker: "史帆",
          portrait: "katoshi",
          text: "思い出した。自分だけ先へ行くんじゃなくて、隣の人と笑ってゴールするのが好きだった。",
        },
        {
          speaker: "久美",
          portrait: "kumi",
          text: "速いのにみんなを待てる。それが史帆の強さだよ。ちゃんと戻ってきてくれて嬉しい。",
        },
        {
          speaker: "SYSTEM",
          portrait: "system",
          text: "激しい風が五人の声にほどけ、四つ目のハッピーオーラの欠片へ結晶した。",
        },
        {
          speaker: "史帆",
          portrait: "katoshi",
          text: "次の風が吹くまで、街道も大会も自由に回ろう。編成を変えたら、戦い方も全然変わるよ。",
        },
      ],
      () => this.showChapterClear(4),
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
    this.audio.play(["solaido", "mileria", "sarinaria", "katoshia"].includes(safe.map) ? "town" : "field");
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
      ["cave1", "cave2", "cave3", "oldWell", "echoGrove", "granary1", "granary2", "whisperWood", "spiritSanctum", "spiritHeart", "skyArena", "windTower1", "windTower2"].includes(this.state.map)
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
    const canArrange = this.state.flags.rosterUnlocked;
    this.ui.menuBody.innerHTML = `${canArrange
      ? `<div class="info-card" style="margin-bottom:7px"><h3>隊列編成　${this.state.party.order.length}/4人</h3><p>戦闘に参加する仲間は最大4人。先に編成中の仲間を外すと、待機中の仲間を加えられます。主人公は外せません。</p></div>`
      : ""}<div class="card-grid">${partyRoster(this.state)
      .map((member) => {
        const active = this.state.party.order.includes(member.id);
        const eq = EQUIP_SLOTS.map(
          (slot) => `${SLOT_NAMES[slot]}：${ITEMS[member.equipment[slot]]?.name || "なし"}`,
        ).join(" / ");
        const skills = Object.values(SKILLS)
          .filter((skill) => skill.owner === member.id && member.level >= skill.level)
          .map((skill) => skill.name)
          .join("・");
        return `<article class="info-card">
          <h3>${member.name} <span class="tag">${member.role}</span> <span class="tag ${active ? "gold" : ""}">${active ? "編成中" : "待機"}</span> Lv${member.level}</h3>
          <p>HP ${member.hp}/${maxHp(member)}　MP ${member.mp}/${member.maxMp}　次のLvまで ${Math.max(0, expNext(member.level) - member.exp)} EXP</p>
          <div class="stat-grid">
            <span>こうげき<b>${stat(member, "atk")}</b></span>
            <span>しゅび<b>${stat(member, "def")}</b></span>
            <span>まりょく<b>${stat(member, "mag")}</b></span>
            <span>すばやさ<b>${stat(member, "spd")}</b></span>
          </div>
          <p>${eq}</p>
          <p>特技：${skills || "なし"}</p>
          ${canArrange && member.id !== "hero"
            ? `<button data-party-toggle="${member.id}">${active ? "待機にする" : "隊列に加える"}</button>`
            : ""}
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
    if (!this.state.flags.chapter2Started)
      return "ソラシド近郊の西端から、地続きの陽だまり街道へ進める。";
    if (!this.state.flags.metMirei)
      return "陽だまり街道を西へ進み、パンの国ミレリアで話を聞こう。";
    if (!this.state.flags.mireiJoined) {
      const count = ["goldenWheat", "springWater", "sunYeast"]
        .filter((id) => (this.state.inventory[id] || 0) > 0).length;
      return `パンの材料は${count}/3個。黄金麦は街道の畑、清水と酵母は風車の丘にある。`;
    }
    if (!this.state.flags.chapter2BossSeen)
      return "街道北東の黒い蔓が消えた。美玲と地下穀倉を探索しよう。";
    if (!this.state.flags.chapter2BossWon)
      return "二本の根を炎で崩し、大技予告には防御とハッピーブレッドを合わせよう。";
    if (!this.state.flags.chapter3Started)
      return "陽だまり街道を南へ。瘴気の消えた吊り橋から虹風の峠へ進める。";
    if (!this.state.flags.metSarina)
      return "虹風の峠を西へ進み、精霊樹の里で鈴を持つ巫女を探そう。";
    if (!this.state.flags.sarinaJoined) {
      const count = ["waterChime", "windChime", "lightChime"]
        .filter((id) => (this.state.inventory[id] || 0) > 0).length;
      return `三つの音は${count}/3個。三響の森で精霊の言葉を聞き、好きな守り手から挑もう。`;
    }
    if (!this.state.flags.spiritGateOpen)
      return "森の南から無音神域へ。水→風→光の順に響石を鳴らす。";
    if (!this.state.flags.chapter3BossSeen)
      return "神域の奥、虹泉の心室へ。七色の精霊鈴と回復道具を確認しよう。";
    if (!this.state.flags.chapter3BossWon)
      return "無響獣の共鳴表示へ炎・風・光を合わせ、大技には精霊の守りを使おう。";
    if (!this.state.flags.chapter4Started)
      return "虹風の峠の南東へ。無音の嵐が消え、天翔け街道へ進める。";
    if (!this.state.flags.metKatoshi)
      return "天翔け街道を北へ進み、風の街カトシアで風の剣士を探そう。";
    if (!this.state.flags.katoshiJoined) {
      const count = ["arenaStoneWon", "arenaSwiftWon", "arenaEchoWon"]
        .filter((flag) => this.state.flags[flag]).length;
      return `蒼天闘技場の予選は${count}/3勝。三人へ好きな順で挑み、揃ったら中央の決勝円へ。`;
    }
    if (!this.state.flags.windSealNorth || !this.state.flags.windSealSouth)
      return "街道南の風哭きの塔へ。下層の北と南にある風向計を、両方とも中央へ向ける。";
    if (!this.state.flags.chapter4BossSeen)
      return "二つの風向計で昇降翼が動いた。塔の天輪へ上がり、暴風の鏡を探そう。";
    if (!this.state.flags.chapter4BossWon)
      return "暴風眼を弱点で崩す。反撃にはへにょへにょ斬り、大技の溜めにはコンビネーション。";
    return "第四章を達成した。待機メンバーを編成し直し、残る依頼や宝箱を探そう。";
  }

  renderRumorsMenu() {
    const questOrder = [
      "chapter1",
      "chapter2",
      "chapter3",
      "chapter4",
      "skyTournament",
      "lostFan",
      "threeChimes",
      "lostSpirit",
      "miracleBread",
      "hungryChildren",
      "dewMedicine",
      "lostRibbon",
      "lostMiner",
    ];
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
          const fieldUsable = ["herb", "happyBread", "spiritNectar", "galeTonic", "moonwort", "auraDrop", "torch", "wing", "lifeSeed"].includes(id);
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
    } else if (id === "happyBread") {
      const wounded = activeParty(this.state).filter(
        (member) => member.hp > 0 && member.hp < maxHp(member),
      );
      if (!wounded.length) return this.toast("HPは満タンだ");
      removeItem(this.state, id, 1);
      let total = 0;
      for (const member of wounded) {
        const healed = Math.min(25, maxHp(member) - member.hp);
        member.hp += healed;
        total += healed;
      }
      this.toast(`みんなで分け合い、合計${total}回復`);
      this.audio.sfx("heal");
    } else if (id === "spiritNectar") {
      const target = activeParty(this.state)
        .filter((member) => member.hp > 0 && (member.hp < maxHp(member) || member.mp < member.maxMp))
        .sort((a, b) => (a.hp / maxHp(a) + a.mp / a.maxMp) - (b.hp / maxHp(b) + b.mp / b.maxMp))[0];
      if (!target) return this.toast("HPとMPは満タンだ");
      removeItem(this.state, id, 1);
      const healed = Math.min(55, maxHp(target) - target.hp);
      const restored = Math.min(8, target.maxMp - target.mp);
      target.hp += healed;
      target.mp += restored;
      target.status.silence = 0;
      this.toast(`${target.name}のHPが${healed}、MPが${restored}回復`);
      this.audio.sfx("heal");
    } else if (id === "galeTonic") {
      const target = activeParty(this.state)
        .filter((member) => member.hp > 0 && (member.hp < maxHp(member) || member.status.rooted))
        .sort((a, b) => a.hp / maxHp(a) - b.hp / maxHp(b))[0];
      if (!target) return this.toast("HPは満タンで、鈍足の仲間もいない");
      removeItem(this.state, id, 1);
      const healed = Math.min(45, maxHp(target) - target.hp);
      target.hp += healed;
      target.status.rooted = 0;
      target.status.haste = 3;
      this.toast(`${target.name}のHPが${healed}回復し、追風をまとった`);
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
    const roster = partyRoster(this.state);
    if (!roster.some((member) => member.id === this.equipCharacter))
      this.equipCharacter = "hero";
    const member = this.state.party[this.equipCharacter];
    const characterButtons = roster
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
      ["camp", "野営地", 58, 79],
      ["solaido", "王都", 57, 14],
      ["echoGrove", "こだまの森", 36, 31],
      ["oldWell", "忘れ井戸", 42, 75],
      ["cave1", "空泣き洞", 88, 26],
      ["mireRoad", "陽だまり街道", 24, 54],
      ["mileria", "ミレリア", 7, 46],
      ["sunmill", "風車の丘", 23, 17],
      ["granary1", "地下穀倉", 34, 62],
      ["spiritPass", "虹風の峠", 46, 76],
      ["sarinaria", "サリナリア", 38, 88],
      ["whisperWood", "三響の森", 61, 84],
      ["spiritSanctum", "無音神域", 73, 91],
      ["windRoad", "天翔け街道", 76, 73],
      ["katoshia", "カトシア", 78, 55],
      ["skyArena", "蒼天闘技場", 91, 68],
      ["windTower1", "風哭きの塔", 84, 91],
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
              : ["mireRoad", "mileria", "sunmill"].includes(this.state.map)
                ? this.state.map
                : ["granary1", "granary2"].includes(this.state.map)
                  ? "granary1"
                  : ["spiritPass", "sarinaria", "whisperWood"].includes(this.state.map)
                    ? this.state.map
                    : ["spiritSanctum", "spiritHeart"].includes(this.state.map)
                      ? "spiritSanctum"
                      : ["windRoad", "katoshia", "skyArena"].includes(this.state.map)
                        ? this.state.map
                        : ["windTower1", "windTower2"].includes(this.state.map)
                          ? "windTower1"
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
      mireRoad: "ソラシドとミレリアを地続きで結ぶ、麦畑の街道。",
      mileria: "パン工房と市場が並ぶ実りの国。今は作物が枯れている。",
      sunmill: "清水と陽だまり酵母が残る、風の強い丘。",
      granary1: "黒い蔓の根源が潜む二層の地下穀倉。",
      spiritPass: "ミレリア南から精霊の里へ続く、虹の見える峠。",
      sarinaria: "精霊樹と鈴の祈りに守られた里。今は精霊の声が途切れている。",
      whisperWood: "水・風・光の守り手が別々の道で待つ、自由探索の森。",
      spiritSanctum: "三つの音を正しい順に響かせて進む、古い精霊神域。",
      windRoad: "カトシア、闘技場、風哭きの塔を結ぶ雲上の高原街道。",
      katoshia: "剣士たちが速さと技を競う風の街。最大4人の隊列編成が解禁される。",
      skyArena: "守り・速さ・魔法の三つの型へ、好きな順で挑める闘技場。",
      windTower1: "二つの風向計と、反撃を構える魔物が待つ風の古塔。",
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
        <p>${MAPS[this.state.map].name} / ${this.formatTime(this.currentPlayTime())} / ${this.state.gold} G / ${this.state.flags.chapter4Clear ? "第四章クリア" : this.state.flags.chapter3Clear ? "第四章冒険中" : this.state.flags.chapter2Clear ? "第三章冒険中" : this.state.flags.chapter1Clear ? "第二章冒険中" : "第一章冒険中"}</p>
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
    else if (target.dataset.partyToggle) {
      const id = target.dataset.partyToggle;
      if (this.state.party.order.includes(id)) {
        if (this.state.party.order.length <= 2) return this.toast("主人公のほかに一人は編成しておこう");
        this.state.party.order = this.state.party.order.filter((entry) => entry !== id);
        this.audio.sfx("ok");
      } else if (this.state.party.order.length >= 4) {
        return this.toast("先に編成中の仲間を一人、待機にしてください");
      } else {
        this.state.party.order.push(id);
        this.audio.sfx("ok");
      }
      this.renderPartyMenu();
      this.refreshHud();
      this.autosave();
    }
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
        const progress = value?.flags?.chapter4Clear
          ? "第四章クリア"
          : value?.flags?.chapter3Clear
            ? "第四章進行中"
          : value?.flags?.chapter2Clear
            ? "第三章進行中"
          : value?.flags?.chapter1Clear
            ? "第二章進行中"
            : value
              ? "第一章進行中"
              : "—";
        return `<article class="save-card"><b>${label}</b><div><strong>${progress}</strong><small>${details}</small></div>${action}</article>`;
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
    if (this.state.flags.chapter4Clear && !this.state.flags.postClear) {
      this.showChapterClear(4);
    } else if (this.state.flags.chapter3Clear && !this.state.flags.postClear) {
      this.showChapterClear(3);
    } else if (this.state.flags.chapter2Clear && !this.state.flags.postClear) {
      this.showChapterClear(2);
    } else if (this.state.flags.chapter1Clear && !this.state.flags.postClear) {
      this.showChapterClear(1);
    } else {
      this.setMode("map");
      this.audio.play(
        ["solaido", "mileria", "sarinaria", "katoshia"].includes(this.state.map)
          ? "town"
          : ["cave1", "cave2", "cave3", "oldWell", "echoGrove", "granary1", "granary2", "whisperWood", "spiritSanctum", "spiritHeart", "skyArena", "windTower1", "windTower2"].includes(this.state.map)
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

  showChapterClear(chapter = 1) {
    if (chapter === 1) this.state.flags.chapter1Clear = true;
    const numerals = { 1: "I", 2: "II", 3: "III", 4: "IV" };
    const headings = { 1: "空色の騎士団長", 2: "枯れた麦畑と奇跡のパン", 3: "虹鈴の精霊巫女", 4: "疾風の剣士と蒼天の塔" };
    const rewards = {
      1: "ハッピーオーラの欠片を手に入れた！",
      2: "二つ目のハッピーオーラの欠片を手に入れた！",
      3: "三つ目のハッピーオーラの欠片を手に入れた！",
      4: "四つ目のハッピーオーラの欠片を手に入れた！",
    };
    this.ui.clearKicker.textContent = `CHAPTER ${numerals[chapter]} COMPLETE`;
    this.ui.clearHeading.textContent = headings[chapter];
    this.ui.clearReward.textContent = rewards[chapter];
    this.ui.clearSummary.textContent = `${this.state.steps}歩・${this.state.victories}勝・宝箱${this.state.stats.chests}個・噂${this.state.stats.rumors}件・寄り道${this.state.stats.sidequests}件`;
    this.setMode("clear");
    this.audio.play("clear");
    this.autosave();
  }

  continueAfterClear() {
    const chapter4 = this.state.flags.chapter4Clear;
    const chapter3 = this.state.flags.chapter3Clear;
    const chapter2 = this.state.flags.chapter2Clear;
    this.state.flags.postClear = true;
    this.state.map = chapter4 ? "katoshia" : chapter3 ? "sarinaria" : chapter2 ? "mileria" : "solaido";
    this.state.x = chapter4 ? 21 : chapter3 ? 20 : chapter2 ? 20 : 19;
    this.state.y = 27;
    this.state.dir = "up";
    this.state.lastSafe = {
      map: this.state.map,
      x: this.state.x,
      y: this.state.y,
      dir: "up",
    };
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
          m.tone,
          {
            up: m.tiles[y - 1]?.[x],
            down: m.tiles[y + 1]?.[x],
            left: m.tiles[y]?.[x - 1],
            right: m.tiles[y]?.[x + 1],
          },
        );

    this.renderer.drawRegionalLandmark(m.id, this.camera.x, this.camera.y, now);
    this.drawLandmarks(now);
    for (const special of m.specials) {
      if (special.type === "boss" && this.state.flags.bossWon) continue;
      if (special.type === "boss2" && this.state.flags.chapter2BossWon) continue;
      if (special.type === "boss3" && this.state.flags.chapter3BossWon) continue;
      if (special.type === "boss4" && this.state.flags.chapter4BossWon) continue;
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
            (special.type === "groveShrine" && this.state.flags.groveEliteWon) ||
            (special.type === "windVaneNorth" && this.state.flags.windSealNorth) ||
            (special.type === "windVaneSouth" && this.state.flags.windSealSouth) ||
            (special.type === "towerLever" && this.state.flags.towerShortcut),
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
      if (npc.id === "mirei" && this.state.flags.mireiJoined) continue;
      if (npc.id === "sarina" && this.state.flags.sarinaJoined) continue;
      if (npc.id === "katoshi" && this.state.flags.katoshiJoined) continue;
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

    this.state.party.order.filter((id) => id !== "hero").forEach((id, index) => {
      const [dx, dy] = DIRS[this.state.dir];
      const distance = index + 1;
      const fx = this.state.x - dx * distance;
      const fy = this.state.y - dy * distance;
      this.renderer.drawCharacter(
        id,
        fx * T + 4 - this.camera.x,
        fy * T + 1 - this.camera.y,
        this.state.dir,
        this.walkFrame,
        1,
        id === "kumi" && !this.state.flags.kumiJoined,
      );
    });
    this.renderer.drawCharacter(
      "hero",
      this.state.x * T + 4 - this.camera.x,
      this.state.y * T + 1 - this.camera.y,
      this.state.dir,
      this.walkFrame,
    );

    this.renderer.drawMapLighting(m.tone, now);
    this.renderer.drawWeather(m.id, m.tone, now);
    this.renderer.drawMapAtmosphere(m.tone, now);
    if (m.tone === "deepCave" && this.state.lightSteps <= 0) this.drawDarkness();
    if (this.state.settings.hint === "guided") this.drawCompassHint();
  }

  drawLandmarks(now) {
    if (!["highroad", "mireRoad", "spiritPass", "windRoad"].includes(this.state.map)) return;
    const points = this.state.map === "highroad"
      ? [
          { x: 25, y: 2, type: "castle" },
          { x: 47, y: 7, type: "cave" },
          { x: 8, y: 9, type: "grove" },
        ]
      : this.state.map === "mireRoad" ? [
          { x: 3, y: 16, type: "town" },
          { x: 24, y: 3, type: "mill" },
          { x: 42, y: 5, type: "granary" },
        ] : this.state.map === "spiritPass" ? [
          { x: 3, y: 17, type: "spiritTown" },
          { x: 47, y: 17, type: "spiritGrove" },
        ] : [
          { x: 25, y: 2, type: "windTown" },
          { x: 50, y: 18, type: "arena" },
          { x: 36, y: 34, type: "windTower" },
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
      } else if (point.type === "grove") {
        this.renderer.rect(x - 18, y - 28, 36, 30, "#1d573f");
        this.renderer.rect(x - 12, y - 38, 24, 33, "#438668");
        this.renderer.rect(x - 5, y - 44, 10, 18, "#8bd2a1");
      } else if (point.type === "town") {
        this.renderer.rect(x - 24, y - 24, 48, 27, "#8c6848");
        this.renderer.rect(x - 19, y - 35, 38, 14, "#d7af59");
        this.renderer.rect(x - 6, y - 13, 12, 16, "#352c2c");
      } else if (point.type === "mill") {
        this.renderer.rect(x - 7, y - 35, 14, 39, "#d1c19b");
        this.renderer.rect(x - 30, y - 25, 60, 5, "#795f42");
        this.renderer.rect(x - 3, y - 50, 6, 60, "#9b794e");
      } else if (point.type === "granary") {
        this.renderer.rect(x - 22, y - 20, 44, 24, "#554530");
        this.renderer.rect(x - 15, y - 13, 30, 18, "#171411");
        this.renderer.rect(x - 5, y - 30 + Math.sin(now / 300) * 2, 10, 20, "#c6a33d");
      } else if (point.type === "spiritTown") {
        this.renderer.rect(x - 23, y - 24, 46, 27, "#456e64");
        this.renderer.rect(x - 17, y - 35, 34, 14, "#73b89d");
        this.renderer.rect(x - 4, y - 42 + Math.sin(now / 300), 8, 19, "#e6dd72");
      } else if (point.type === "spiritGrove") {
        this.renderer.rect(x - 22, y - 27, 44, 30, "#1c5948");
        this.renderer.rect(x - 14, y - 39, 28, 34, "#3b8a68");
        this.renderer.rect(x - 4, y - 46 + Math.sin(now / 280), 8, 18, "#9fe8c5");
      } else if (point.type === "windTown") {
        this.renderer.rect(x - 24, y - 24, 48, 28, "#496f8c");
        this.renderer.rect(x - 18, y - 35, 36, 14, "#b8d8df");
        this.renderer.rect(x - 3, y - 48, 6, 30, "#e4c967");
        this.renderer.rect(x - 19, y - 38, 38, 4, "#edf5e9");
      } else if (point.type === "arena") {
        this.renderer.rect(x - 25, y - 18, 50, 22, "#8a735b");
        this.renderer.rect(x - 21, y - 27, 42, 12, "#d5b66c");
        this.renderer.rect(x - 16, y - 12, 32, 16, "#4d3c43");
      } else {
        this.renderer.rect(x - 18, y - 44, 36, 48, "#526875");
        this.renderer.rect(x - 24, y - 31, 48, 8, "#91aeb4");
        this.renderer.rect(x - 4, y - 57 + Math.sin(now / 260), 8, 22, "#dff7ef");
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
    let target = null;
    if (!this.state.flags.metKumi) target = { map: "highroad", x: 25, y: 2, label: "王都" };
    else if (!this.state.flags.raidWon) target = { map: "solaido", x: 20, y: 6, label: "聞き込み" };
    else if (!this.state.flags.bossWon) target = { map: "highroad", x: 47, y: 7, label: "空泣き洞" };
    else if (!this.state.flags.chapter2Started) target = { map: "highroad", x: 1, y: 18, label: "西の国" };
    else if (!this.state.flags.metMirei) target = { map: "mireRoad", x: 2, y: 16, label: "ミレリア" };
    else if (!this.state.flags.mireiJoined) target = { map: "mileria", x: 23, y: 10, label: "美玲" };
    else if (!this.state.flags.chapter2BossWon) target = { map: "mireRoad", x: 42, y: 5, label: "地下穀倉" };
    else if (!this.state.flags.chapter3Started) target = { map: "mireRoad", x: 24, y: 32, label: "南の峠" };
    else if (!this.state.flags.metSarina) target = { map: "spiritPass", x: 3, y: 17, label: "精霊の里" };
    else if (!this.state.flags.sarinaJoined) target = { map: "sarinaria", x: 23, y: 10, label: "紗理菜" };
    else if (!this.state.flags.spiritGateOpen) target = { map: "spiritSanctum", x: 30, y: 8, label: "響石の扉" };
    else if (!this.state.flags.chapter3BossWon) target = { map: "spiritHeart", x: 28, y: 7, label: "無響獣" };
    else if (!this.state.flags.chapter4Started) target = { map: "spiritPass", x: 36, y: 31, label: "南東の風" };
    else if (!this.state.flags.metKatoshi) target = { map: "windRoad", x: 25, y: 2, label: "カトシア" };
    else if (!this.state.flags.katoshiJoined) target = { map: "skyArena", x: 23, y: 15, label: "蒼天闘技場" };
    else if (!this.state.flags.windSealNorth || !this.state.flags.windSealSouth)
      target = { map: "windTower1", x: 22, y: 14, label: "二つの風向計" };
    else if (!this.state.flags.chapter4BossWon)
      target = { map: "windTower2", x: 30, y: 7, label: "颶風鏡" };
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
        ["smileEater", "blightHeart", "hushAvatar", "tempestMirror"].includes(enemy.kind) &&
        this.battle.barrier &&
        this.battle.barrierBrokenRounds <= 0
      ) {
        const ctx = this.renderer.ctx;
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(now / 180) * 0.08;
        ctx.strokeStyle = enemy.kind === "blightHeart" ? "#e0b84f" : enemy.kind === "hushAvatar" ? "#71dfbd" : enemy.kind === "tempestMirror" ? "#a8e6ef" : "#b68fd2";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 78, 80, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const scale = ["smileEater", "blightHeart", "hushAvatar", "tempestMirror"].includes(enemy.kind) ? 1.08 : enemy.boss ? 1 : 0.82;
      this.renderer.drawBattleEnemy(
        enemy.sprite,
        x,
        y,
        scale,
        now,
        now - enemy.hurtAt < 220,
      );
      const hitAge = now - enemy.hurtAt;
      if (hitAge >= 0 && hitAge < 260)
        this.renderer.drawHitEffect(x, y - 8, hitAge, enemy.lastElement || "physical");
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
    if (this.battle.cutIn) {
      const age = now - this.battle.cutIn.born;
      if (age >= this.battle.cutIn.duration) this.battle.cutIn = null;
      else
        this.renderer.drawSkillCutIn(
          this.battle.cutIn.actorId,
          this.battle.cutIn.actorName,
          this.battle.cutIn.skillName,
          age / this.battle.cutIn.duration,
        );
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
