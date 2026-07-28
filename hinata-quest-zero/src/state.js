import { ITEMS, MAPS } from "./data.js";

export const SAVE_VERSION = 5;
export const SAVE_PREFIX = "hq0-v5-save-";
export const AUTO_KEY = "hq0-v5-auto";
export const LEGACY_PREFIX = "hq0-save-";
export const LEGACY_AUTO = "hq0-auto";

const heroBase = (name) => ({
  id: "hero",
  name,
  role: "オーラナイト",
  level: 1,
  exp: 0,
  hp: 58,
  mp: 17,
  maxHp: 58,
  maxMp: 17,
  atk: 12,
  def: 7,
  mag: 10,
  spd: 10,
  equipment: {
    weapon: null,
    shield: null,
    body: null,
    accessory: null,
  },
  status: {},
});

const kumiBase = () => ({
  id: "kumi",
  name: "久美",
  fullName: "佐々木久美",
  role: "コマンダー",
  level: 2,
  exp: 18,
  hp: 82,
  mp: 24,
  maxHp: 82,
  maxMp: 24,
  atk: 18,
  def: 12,
  mag: 8,
  spd: 11,
  equipment: {
    weapon: "ironSpear",
    shield: "leatherShield",
    body: "travelCoat",
    accessory: null,
  },
  status: {},
});

export function createState(name = "トシ") {
  return {
    version: SAVE_VERSION,
    name,
    map: "highroad",
    x: MAPS.highroad.start[0],
    y: MAPS.highroad.start[1],
    dir: "up",
    gold: 42,
    party: {
      hero: heroBase(name),
      kumi: kumiBase(),
      order: ["hero"],
    },
    inventory: {
      herb: 2,
      moonwort: 1,
      auraDrop: 0,
      brightBell: 0,
      smokeBomb: 0,
      torch: 0,
      wing: 0,
      dewleaf: 0,
      skyRibbon: 0,
      lifeSeed: 0,
      copperSword: 0,
      skyBlade: 0,
      oakStaff: 0,
      ironSpear: 0,
      leatherShield: 0,
      blueBuckler: 0,
      travelCoat: 0,
      paddedVest: 0,
      windRing: 0,
      captainCharm: 0,
      legacyEmblem: 0,
    },
    flags: {
      prologueSeen: false,
      metKumi: false,
      raidReady: false,
      raidWon: false,
      kumiJoined: false,
      skySigil: false,
      caveRope: false,
      waterLever: false,
      bossSeen: false,
      bossWon: false,
      chapter1Clear: false,
      postClear: false,
      legacyImported: false,
      groveEliteWon: false,
      minerFound: false,
      ironDiscount: false,
    },
    quests: {
      chapter1: "active",
      dewMedicine: "locked",
      lostRibbon: "locked",
      lostMiner: "locked",
    },
    rumors: {
      city: true,
      retreat: true,
    },
    opened: {},
    gathered: {},
    defeatedUnique: {},
    symbolCooldowns: {},
    discoveries: {
      highroad: true,
      camp: true,
    },
    visited: {},
    steps: 0,
    battles: 0,
    victories: 0,
    escapes: 0,
    gameOvers: 0,
    playTime: 0,
    startedAt: Date.now(),
    happy: 0,
    lightSteps: 0,
    lastSafe: {
      map: "highroad",
      x: MAPS.highroad.start[0],
      y: MAPS.highroad.start[1],
      dir: "up",
    },
    settings: {
      hint: "standard",
      textSpeed: "normal",
      master: 0.7,
      bgm: 0.35,
      sfx: 0.65,
      screenShake: true,
    },
    stats: {
      chests: 0,
      rumors: 2,
      sidequests: 0,
      deepestFloor: 0,
      damageDealt: 0,
      healingDone: 0,
    },
  };
}

const mergeCharacter = (base, value = {}) => ({
  ...base,
  ...value,
  equipment: { ...base.equipment, ...(value.equipment || {}) },
  status: {},
});

export function normalizeState(value) {
  const base = createState(value?.name || "トシ");
  if (!value || value.version !== SAVE_VERSION) return base;
  const result = {
    ...base,
    ...value,
    version: SAVE_VERSION,
    inventory: { ...base.inventory, ...(value.inventory || {}) },
    flags: { ...base.flags, ...(value.flags || {}) },
    quests: { ...base.quests, ...(value.quests || {}) },
    rumors: { ...base.rumors, ...(value.rumors || {}) },
    opened: { ...(value.opened || {}) },
    gathered: { ...(value.gathered || {}) },
    defeatedUnique: { ...(value.defeatedUnique || {}) },
    symbolCooldowns: { ...(value.symbolCooldowns || {}) },
    discoveries: { ...base.discoveries, ...(value.discoveries || {}) },
    visited: { ...(value.visited || {}) },
    settings: { ...base.settings, ...(value.settings || {}) },
    stats: { ...base.stats, ...(value.stats || {}) },
    party: {
      hero: mergeCharacter(base.party.hero, value.party?.hero),
      kumi: mergeCharacter(base.party.kumi, value.party?.kumi),
      order: Array.isArray(value.party?.order) ? [...value.party.order] : ["hero"],
    },
    lastSafe: { ...base.lastSafe, ...(value.lastSafe || {}) },
    startedAt: Date.now(),
  };
  if (!MAPS[result.map]) {
    result.map = "highroad";
    [result.x, result.y] = MAPS.highroad.start;
  }
  result.party.hero.name = result.name;
  if (result.flags.kumiJoined && !result.party.order.includes("kumi"))
    result.party.order.push("kumi");
  result.party.order = result.party.order.filter(
    (id, index, array) =>
      ["hero", "kumi"].includes(id) && array.indexOf(id) === index,
  );
  if (!result.party.order.includes("hero")) result.party.order.unshift("hero");
  clampVitals(result);
  return result;
}

export function migrateLegacy(value) {
  const state = createState(value?.name || "トシ");
  const oldLevel = Number(value?.lv || 1);
  const fragments = Number(value?.flags?.fragment || 0);
  state.flags.legacyImported = true;
  state.inventory.legacyEmblem = 1;
  state.party.hero.equipment.accessory = "legacyEmblem";
  state.gold = Math.max(90, Math.min(260, Number(value?.gold || 0) + fragments * 30));
  state.party.hero.level = Math.max(1, Math.min(3, oldLevel));
  state.party.hero.exp = expFloor(state.party.hero.level);
  for (let level = 2; level <= state.party.hero.level; level += 1)
    applyHeroGrowth(state.party.hero, level, false);
  state.party.hero.hp = state.party.hero.maxHp;
  state.party.hero.mp = state.party.hero.maxMp;
  state.rumors.city = true;
  state.rumors.grove = fragments >= 2;
  state.rumors.cave = fragments >= 1;
  state.stats.rumors = Object.values(state.rumors).filter(Boolean).length;
  return state;
}

export function serialize(state) {
  const elapsed = Math.max(0, (Date.now() - state.startedAt) / 1000);
  return {
    ...state,
    playTime: state.playTime + elapsed,
    startedAt: Date.now(),
    party: {
      ...state.party,
      hero: { ...state.party.hero, status: {} },
      kumi: { ...state.party.kumi, status: {} },
      order: [...state.party.order],
    },
  };
}

export function activeParty(state) {
  return state.party.order.map((id) => state.party[id]).filter(Boolean);
}

export function equipmentStats(character) {
  const result = { atk: 0, def: 0, mag: 0, spd: 0, maxHp: 0 };
  for (const id of Object.values(character.equipment || {})) {
    const item = ITEMS[id];
    if (!item) continue;
    for (const key of Object.keys(result)) result[key] += Number(item[key] || 0);
  }
  return result;
}

export function stat(character, key) {
  const equipment = equipmentStats(character);
  return Number(character[key] || 0) + Number(equipment[key] || 0);
}

export function maxHp(character) {
  return stat(character, "maxHp");
}

export function clampVitals(state) {
  for (const character of Object.values(state.party)) {
    if (!character || typeof character !== "object" || !character.id) continue;
    character.hp = Math.max(0, Math.min(Number(character.hp || 0), maxHp(character)));
    character.mp = Math.max(0, Math.min(Number(character.mp || 0), Number(character.maxMp || 0)));
  }
}

export function expFloor(level) {
  if (level <= 1) return 0;
  return Math.round(18 * (level - 1) ** 2 + 12 * (level - 1));
}

export function expNext(level) {
  return expFloor(level + 1);
}

export function applyHeroGrowth(character, level, heal = true) {
  character.maxHp += 7 + (level % 2);
  character.maxMp += level % 2 ? 3 : 2;
  character.atk += 3;
  character.def += 2;
  character.mag += 2;
  character.spd += level % 2 ? 2 : 1;
  if (heal) {
    character.hp = maxHp(character);
    character.mp = character.maxMp;
  }
}

export function applyKumiGrowth(character, level, heal = true) {
  character.maxHp += 9;
  character.maxMp += level % 2 ? 2 : 3;
  character.atk += 3;
  character.def += 3;
  character.mag += 1;
  character.spd += 1;
  if (heal) {
    character.hp = maxHp(character);
    character.mp = character.maxMp;
  }
}

export function grantExperience(state, amount) {
  const levels = [];
  for (const character of activeParty(state)) {
    character.exp += amount;
    while (character.level < 12 && character.exp >= expNext(character.level)) {
      character.level += 1;
      if (character.id === "hero") applyHeroGrowth(character, character.level);
      else applyKumiGrowth(character, character.level);
      levels.push({
        id: character.id,
        name: character.name,
        level: character.level,
      });
    }
  }
  return levels;
}

export function addItem(state, id, quantity = 1) {
  if (!(id in state.inventory)) state.inventory[id] = 0;
  state.inventory[id] = Math.max(0, state.inventory[id] + quantity);
}

export function removeItem(state, id, quantity = 1) {
  if ((state.inventory[id] || 0) < quantity) return false;
  state.inventory[id] -= quantity;
  return true;
}

export function ownsItem(state, id) {
  if ((state.inventory[id] || 0) > 0) return true;
  return Object.values(state.party)
    .filter((character) => character?.equipment)
    .some((character) => Object.values(character.equipment).includes(id));
}

export function fullHeal(state) {
  for (const character of activeParty(state)) {
    character.hp = maxHp(character);
    character.mp = character.maxMp;
    character.status = {};
  }
}

export function discoverRumor(state, id) {
  if (state.rumors[id]) return false;
  state.rumors[id] = true;
  state.stats.rumors += 1;
  return true;
}

export function equipItem(state, characterId, itemId) {
  const character = state.party[characterId];
  const item = ITEMS[itemId];
  if (!character || !item || !["weapon", "shield", "body", "accessory"].includes(item.type))
    return false;
  if ((state.inventory[itemId] || 0) <= 0) return false;
  const previous = character.equipment[item.type];
  state.inventory[itemId] -= 1;
  if (previous) addItem(state, previous, 1);
  character.equipment[item.type] = itemId;
  character.hp = Math.min(character.hp, maxHp(character));
  return true;
}

export function unequipItem(state, characterId, slot) {
  const character = state.party[characterId];
  if (!character?.equipment?.[slot]) return false;
  addItem(state, character.equipment[slot], 1);
  character.equipment[slot] = null;
  character.hp = Math.min(character.hp, maxHp(character));
  return true;
}
