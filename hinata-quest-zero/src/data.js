export const TILE = Object.freeze({
  GRASS: 0,
  PATH: 1,
  TREE: 2,
  WATER: 3,
  BRIDGE: 4,
  STONE: 5,
  FLOOR: 6,
  WALL: 7,
  CAVE: 8,
  CRYSTAL: 9,
  FLOWER: 10,
  ROOF: 11,
  MUD: 12,
  DOOR: 13,
  ROCK: 14,
  MOSS: 15,
  STAIRS: 16,
  SAND: 17,
  WOOD: 18,
  VOID: 19,
  RUIN: 20,
  LANTERN: 21,
  PILLAR: 22,
  REEDS: 23,
});

export const PASSABLE = new Set([
  TILE.GRASS,
  TILE.PATH,
  TILE.BRIDGE,
  TILE.STONE,
  TILE.FLOOR,
  TILE.CAVE,
  TILE.CRYSTAL,
  TILE.FLOWER,
  TILE.MUD,
  TILE.DOOR,
  TILE.MOSS,
  TILE.STAIRS,
  TILE.SAND,
  TILE.WOOD,
  TILE.RUIN,
  TILE.LANTERN,
]);

const map = (id, name, width, height, base, tone = "field") => ({
  id,
  name,
  width,
  height,
  tone,
  tiles: Array.from({ length: height }, () => Array(width).fill(base)),
  warps: [],
  npcs: [],
  chests: [],
  enemies: [],
  specials: [],
});

const put = (m, x, y, tile) => {
  if (x >= 0 && y >= 0 && x < m.width && y < m.height) m.tiles[y][x] = tile;
};
const fill = (m, x, y, w, h, tile) => {
  for (let yy = y; yy < y + h; yy += 1)
    for (let xx = x; xx < x + w; xx += 1) put(m, xx, yy, tile);
};
const hline = (m, x1, x2, y, tile, width = 1) => {
  for (let yy = y; yy < y + width; yy += 1)
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1)
      put(m, x, yy, tile);
};
const vline = (m, x, y1, y2, tile, width = 1) => {
  for (let xx = x; xx < x + width; xx += 1)
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1)
      put(m, xx, y, tile);
};
const border = (m, tile) => {
  hline(m, 0, m.width - 1, 0, tile);
  hline(m, 0, m.width - 1, m.height - 1, tile);
  vline(m, 0, 0, m.height - 1, tile);
  vline(m, m.width - 1, 0, m.height - 1, tile);
};
const box = (m, x, y, w, h, tile) => {
  hline(m, x, x + w - 1, y, tile);
  hline(m, x, x + w - 1, y + h - 1, tile);
  vline(m, x, y, y + h - 1, tile);
  vline(m, x + w - 1, y, y + h - 1, tile);
};
const pathPoints = (m, points, tile = TILE.PATH, width = 2) => {
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    if (ax === bx) vline(m, ax, ay, by, tile, width);
    else if (ay === by) hline(m, ax, bx, ay, tile, width);
  }
};
const building = (m, x, y, w, h, doorX, roof = TILE.ROOF) => {
  fill(m, x, y, w, Math.max(2, Math.floor(h / 2)), roof);
  fill(m, x, y + Math.max(2, Math.floor(h / 2)), w, h - Math.max(2, Math.floor(h / 2)), TILE.WALL);
  put(m, doorX, y + h - 1, TILE.DOOR);
};
const rng = (seed) => {
  let n = seed >>> 0;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
};
const scatter = (m, seed, tile, count, predicate = () => true) => {
  const random = rng(seed);
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 40) {
    guard += 1;
    const x = 1 + Math.floor(random() * (m.width - 2));
    const y = 1 + Math.floor(random() * (m.height - 2));
    if (predicate(x, y, m.tiles[y][x])) {
      put(m, x, y, tile);
      placed += 1;
    }
  }
};

function highroad() {
  const m = map("highroad", "ソラシド近郊", 54, 36, TILE.GRASS, "field");
  border(m, TILE.TREE);

  fill(m, 31, 1, 4, 34, TILE.WATER);
  for (let y = 2; y < 35; y += 3) {
    put(m, 31, y, TILE.REEDS);
    put(m, 34, y + 1, TILE.REEDS);
  }

  pathPoints(m, [
    [26, 33],
    [26, 20],
    [25, 20],
    [25, 3],
  ]);
  pathPoints(m, [
    [8, 9],
    [8, 19],
    [33, 19],
    [33, 18],
    [47, 18],
    [47, 7],
  ]);
  pathPoints(m, [
    [14, 28],
    [14, 24],
    [26, 24],
  ]);
  fill(m, 31, 18, 4, 3, TILE.BRIDGE);
  hline(m, 23, 28, 3, TILE.STONE, 2);
  hline(m, 44, 50, 6, TILE.ROCK);
  put(m, 47, 7, TILE.CAVE);
  put(m, 8, 9, TILE.MOSS);
  put(m, 14, 28, TILE.RUIN);
  fill(m, 23, 29, 7, 5, TILE.MUD);
  hline(m, 24, 28, 30, TILE.WOOD);
  put(m, 26, 29, TILE.LANTERN);

  scatter(
    m,
    1402,
    TILE.TREE,
    142,
    (x, y, t) =>
      t === TILE.GRASS &&
      Math.abs(x - 26) > 3 &&
      !(x > 42 && y < 20) &&
      !(x < 12 && y > 6 && y < 22),
  );
  scatter(
    m,
    912,
    TILE.FLOWER,
    52,
    (_x, _y, t) => t === TILE.GRASS,
  );
  scatter(
    m,
    227,
    TILE.ROCK,
    32,
    (_x, _y, t) => t === TILE.GRASS,
  );

  m.warps.push(
    { x: 25, y: 2, to: "solaido", tx: 19, ty: 27, dir: "up", label: "王都ソラシド" },
    { x: 8, y: 9, to: "echoGrove", tx: 29, ty: 13, dir: "left", label: "こだまの森" },
    { x: 47, y: 7, to: "cave1", tx: 3, ty: 22, dir: "right", label: "空泣き洞 B1" },
    { x: 14, y: 28, to: "oldWell", tx: 10, ty: 15, dir: "up", label: "忘れ井戸" },
  );
  m.npcs.push(
    { id: "campMerchant", type: "merchant", x: 28, y: 31, dir: "left" },
    { id: "roadPilgrim", type: "pilgrim", x: 20, y: 19, dir: "right" },
    { id: "bridgeGuard", type: "guard", x: 36, y: 18, dir: "right" },
    { id: "caveScout", type: "scout", x: 44, y: 10, dir: "up" },
  );
  m.chests.push(
    { id: "camp-cache", x: 23, y: 32, loot: { item: "herb", qty: 2 }, label: "薬草を2個" },
    { id: "river-cache", x: 39, y: 24, loot: { gold: 48 }, label: "48ゴールド" },
    { id: "north-cache", x: 19, y: 7, loot: { item: "moonwort", qty: 1 }, label: "月しずく草" },
  );
  m.specials.push(
    { id: "campfire", type: "campfire", x: 26, y: 30 },
    { id: "sign-city", type: "sign", x: 23, y: 15, text: "北：王都ソラシド　西：こだまの森　東：青岩の高地" },
    { id: "sign-cave", type: "sign", x: 45, y: 16, text: "この先、空泣き洞。旅人は灯りと帰還手段を備えよ。" },
    { id: "wild-herb-a", type: "gather", x: 11, y: 15, item: "dewleaf", qty: 1 },
    { id: "wild-herb-b", type: "gather", x: 5, y: 22, item: "dewleaf", qty: 1 },
  );
  m.enemies.push(
    { id: "plain-01", x: 28, y: 27, kind: "softSlime", awareness: 3 },
    { id: "plain-02", x: 18, y: 24, group: ["softSlime", "softSlime"], awareness: 3 },
    { id: "plain-03", x: 17, y: 16, group: ["thornMouse", "softSlime"], awareness: 4 },
    { id: "plain-04", x: 11, y: 20, group: ["thornMouse", "thornMouse"], awareness: 4 },
    { id: "plain-05", x: 38, y: 17, group: ["gloomBat", "softSlime"], awareness: 4 },
    { id: "plain-06", x: 42, y: 13, group: ["gloomBat", "gloomBat"], awareness: 5 },
    { id: "plain-07", x: 46, y: 22, group: ["armorShell", "softSlime"], awareness: 3 },
    { id: "plain-08", x: 18, y: 9, group: ["thornMouse", "gloomBat"], awareness: 4 },
    { id: "plain-09", x: 9, y: 25, kind: "softSlime", awareness: 2 },
    { id: "plain-10", x: 40, y: 29, group: ["armorShell", "thornMouse"], awareness: 3 },
  );
  m.start = [26, 31];
  return m;
}

function solaido() {
  const m = map("solaido", "王都ソラシド", 40, 30, TILE.STONE, "town");
  border(m, TILE.WALL);
  hline(m, 17, 22, 28, TILE.PATH);
  vline(m, 18, 5, 28, TILE.PATH, 4);
  hline(m, 2, 37, 20, TILE.PATH, 3);
  hline(m, 7, 32, 11, TILE.PATH, 2);
  fill(m, 15, 3, 10, 5, TILE.FLOOR);
  box(m, 14, 2, 12, 7, TILE.PILLAR);
  put(m, 19, 8, TILE.DOOR);
  put(m, 20, 8, TILE.DOOR);

  building(m, 3, 4, 9, 6, 7);
  building(m, 28, 4, 9, 6, 32);
  building(m, 3, 14, 8, 6, 7);
  building(m, 29, 14, 8, 6, 33);
  building(m, 4, 23, 9, 5, 8);
  building(m, 27, 23, 9, 5, 31);
  fill(m, 13, 14, 4, 4, TILE.WATER);
  fill(m, 23, 14, 4, 4, TILE.WATER);
  put(m, 14, 15, TILE.BRIDGE);
  put(m, 25, 15, TILE.BRIDGE);
  put(m, 16, 11, TILE.LANTERN);
  put(m, 23, 11, TILE.LANTERN);
  put(m, 16, 21, TILE.LANTERN);
  put(m, 23, 21, TILE.LANTERN);

  m.warps.push({ x: 19, y: 28, to: "highroad", tx: 25, ty: 4, dir: "down", label: "ソラシド近郊" });
  m.warps.push({ x: 20, y: 28, to: "highroad", tx: 26, ty: 4, dir: "down", label: "ソラシド近郊" });
  m.npcs.push(
    { id: "kumi", type: "kumi", x: 20, y: 6, dir: "down" },
    { id: "gateCaptain", type: "guard", x: 16, y: 25, dir: "right" },
    { id: "townBard", type: "bard", x: 24, y: 20, dir: "left" },
    { id: "blacksmith", type: "smith", x: 7, y: 10, dir: "down" },
    { id: "itemKeeper", type: "merchant", x: 32, y: 10, dir: "down" },
    { id: "innkeeper", type: "inn", x: 7, y: 20, dir: "down" },
    { id: "priest", type: "priest", x: 33, y: 20, dir: "down" },
    { id: "apothecary", type: "elder", x: 11, y: 21, dir: "right" },
    { id: "lostChild", type: "child", x: 27, y: 12, dir: "left" },
    { id: "oldSoldier", type: "soldier", x: 12, y: 12, dir: "right" },
    { id: "fisher", type: "fisher", x: 14, y: 18, dir: "down" },
    { id: "scholar", type: "scholar", x: 26, y: 7, dir: "left" },
    { id: "townspersonA", type: "town", x: 22, y: 24, dir: "left" },
    { id: "townspersonB", type: "town2", x: 17, y: 15, dir: "right" },
  );
  m.chests.push(
    { id: "castle-chest", x: 16, y: 5, loot: { item: "wing", qty: 1 }, label: "風渡りの羽" },
    { id: "alley-chest", x: 38, y: 25, loot: { gold: 35 }, label: "35ゴールド" },
  );
  m.specials.push(
    { id: "armory-door", type: "shop", shop: "armory", x: 7, y: 9 },
    { id: "item-door", type: "shop", shop: "item", x: 32, y: 9 },
    { id: "inn-door", type: "inn", x: 7, y: 19 },
    { id: "church-door", type: "church", x: 33, y: 19 },
    { id: "record-crystal", type: "save", x: 24, y: 7 },
    { id: "notice-board", type: "board", x: 16, y: 23 },
    { id: "fountain", type: "fountain", x: 20, y: 16 },
  );
  m.start = [19, 27];
  return m;
}

function echoGrove() {
  const m = map("echoGrove", "こだまの森", 34, 28, TILE.MOSS, "forest");
  border(m, TILE.ROOT);
  fill(m, 3, 3, 28, 22, TILE.ROOT);
  const corridors = [
    [27, 12, 31, 15],
    [23, 11, 29, 16],
    [19, 5, 25, 18],
    [14, 4, 21, 9],
    [12, 8, 20, 14],
    [8, 12, 16, 19],
    [4, 17, 11, 23],
    [14, 17, 23, 23],
    [21, 19, 29, 24],
  ];
  for (const [x1, y1, x2, y2] of corridors) fill(m, x1, y1, x2 - x1 + 1, y2 - y1 + 1, TILE.MOSS);
  fill(m, 5, 5, 7, 5, TILE.WATER);
  hline(m, 8, 17, 8, TILE.MOSS);
  put(m, 8, 8, TILE.BRIDGE);
  put(m, 7, 8, TILE.MOSS);
  put(m, 7, 7, TILE.MOSS);
  put(m, 6, 7, TILE.MOSS);
  scatter(m, 45, TILE.FLOWER, 34, (_x, _y, t) => t === TILE.MOSS);
  scatter(m, 89, TILE.CRYSTAL, 14, (_x, _y, t) => t === TILE.ROOT);

  m.warps.push({ x: 30, y: 13, to: "highroad", tx: 9, ty: 9, dir: "right", label: "ソラシド近郊" });
  m.npcs.push(
    { id: "groveHermit", type: "hermit", x: 9, y: 21, dir: "right" },
    { id: "groveSpirit", type: "spirit", x: 17, y: 6, dir: "down" },
  );
  m.chests.push(
    { id: "grove-herb", x: 6, y: 7, loot: { item: "dewleaf", qty: 2 }, label: "朝露草を2個" },
    { id: "grove-ring", x: 16, y: 21, loot: { item: "windRing", qty: 1 }, label: "そよ風の指輪" },
    { id: "grove-gold", x: 28, y: 22, loot: { gold: 72 }, label: "72ゴールド" },
  );
  m.specials.push(
    { id: "grove-shrine", type: "groveShrine", x: 8, y: 20 },
    { id: "grove-dew-a", type: "gather", x: 21, y: 7, item: "dewleaf", qty: 1 },
    { id: "grove-dew-b", type: "gather", x: 12, y: 14, item: "dewleaf", qty: 1 },
  );
  m.enemies.push(
    { id: "grove-01", x: 25, y: 14, group: ["gloomBat", "gloomBat"], awareness: 5 },
    { id: "grove-02", x: 17, y: 12, group: ["mistWisp", "thornMouse"], awareness: 4 },
    { id: "grove-03", x: 10, y: 18, group: ["mistWisp", "mistWisp"], awareness: 4 },
    { id: "grove-04", x: 22, y: 21, group: ["thornMouse", "gloomBat", "thornMouse"], awareness: 5 },
    { id: "grove-elite", x: 8, y: 19, kind: "gloomMoth", unique: true, awareness: 2 },
  );
  m.start = [29, 13];
  return m;
}

function oldWell() {
  const m = map("oldWell", "忘れ井戸", 22, 18, TILE.STONE, "dungeon");
  border(m, TILE.WALL);
  fill(m, 2, 2, 18, 14, TILE.WALL);
  fill(m, 8, 12, 6, 5, TILE.FLOOR);
  fill(m, 5, 8, 12, 5, TILE.FLOOR);
  fill(m, 3, 3, 6, 7, TILE.FLOOR);
  fill(m, 13, 3, 6, 7, TILE.FLOOR);
  fill(m, 9, 5, 4, 3, TILE.WOOD);
  fill(m, 9, 8, 4, 3, TILE.WATER);
  put(m, 10, 15, TILE.STAIRS);
  put(m, 6, 4, TILE.LANTERN);
  put(m, 15, 4, TILE.LANTERN);
  m.warps.push({ x: 10, y: 16, to: "highroad", tx: 14, ty: 27, dir: "down", label: "ソラシド近郊" });
  m.chests.push(
    { id: "well-ribbon", x: 4, y: 4, loot: { item: "skyRibbon", qty: 1 }, label: "空色のリボン" },
    { id: "well-armor", x: 17, y: 4, loot: { item: "paddedVest", qty: 1 }, label: "綿入りの服" },
    { id: "well-seed", x: 15, y: 9, loot: { item: "lifeSeed", qty: 1 }, label: "命の木の実" },
  );
  m.enemies.push(
    { id: "well-01", x: 7, y: 9, group: ["mistWisp", "softSlime"], awareness: 3 },
    { id: "well-02", x: 15, y: 7, group: ["armorShell", "mistWisp"], awareness: 3 },
  );
  m.start = [10, 15];
  return m;
}

function cave1() {
  const m = map("cave1", "空泣き洞 B1", 38, 28, TILE.WALL, "cave");
  border(m, TILE.WALL);
  fill(m, 2, 20, 10, 6, TILE.STONE);
  fill(m, 8, 14, 8, 9, TILE.STONE);
  fill(m, 13, 10, 9, 8, TILE.STONE);
  fill(m, 19, 5, 8, 10, TILE.STONE);
  fill(m, 25, 3, 10, 8, TILE.STONE);
  fill(m, 24, 12, 11, 6, TILE.STONE);
  fill(m, 29, 16, 6, 9, TILE.STONE);
  fill(m, 18, 18, 13, 7, TILE.STONE);
  fill(m, 11, 21, 10, 4, TILE.STONE);
  fill(m, 16, 8, 4, 4, TILE.STONE);
  put(m, 3, 23, TILE.CAVE);
  put(m, 32, 5, TILE.STAIRS);
  for (const [x, y] of [[7,22],[12,16],[17,12],[22,8],[27,15],[31,20]]) put(m, x, y, TILE.LANTERN);
  scatter(m, 300, TILE.CRYSTAL, 26, (_x, _y, t) => t === TILE.WALL);

  m.warps.push(
    { x: 2, y: 23, to: "highroad", tx: 46, ty: 7, dir: "left", label: "ソラシド近郊" },
    { x: 32, y: 5, to: "cave2", tx: 4, ty: 23, dir: "right", label: "空泣き洞 B2", requires: "skySigil", denied: "蒼い紋章の扉は、冷たい光を返すだけだ。" },
  );
  m.npcs.push({ id: "lostMiner", type: "miner", x: 11, y: 16, dir: "down" });
  m.chests.push(
    { id: "cave1-torch", x: 10, y: 21, loot: { item: "torch", qty: 2 }, label: "たいまつを2本" },
    { id: "cave1-shield", x: 33, y: 23, loot: { item: "leatherShield", qty: 1 }, label: "皮の盾" },
    { id: "cave1-gold", x: 34, y: 4, loot: { gold: 96 }, label: "96ゴールド" },
  );
  m.specials.push(
    { id: "blue-seal", type: "seal", x: 31, y: 5 },
    { id: "cave-shortcut-a", type: "shortcut", x: 20, y: 22, to: "cave2", target: [18, 20], requires: "caveRope" },
  );
  m.enemies.push(
    { id: "cave1-01", x: 10, y: 19, group: ["gloomBat", "gloomBat"], awareness: 5 },
    { id: "cave1-02", x: 17, y: 14, group: ["armorShell", "softSlime"], awareness: 3 },
    { id: "cave1-03", x: 24, y: 8, group: ["mistWisp", "gloomBat"], awareness: 4 },
    { id: "cave1-04", x: 30, y: 15, group: ["armorShell", "armorShell"], awareness: 3 },
    { id: "cave1-05", x: 25, y: 22, group: ["mistWisp", "thornMouse", "gloomBat"], awareness: 4 },
  );
  m.start = [3, 22];
  return m;
}

function cave2() {
  const m = map("cave2", "空泣き洞 B2・水脈", 40, 30, TILE.WALL, "deepCave");
  border(m, TILE.WALL);
  fill(m, 2, 20, 11, 8, TILE.STONE);
  fill(m, 9, 14, 8, 12, TILE.STONE);
  fill(m, 14, 7, 9, 11, TILE.STONE);
  fill(m, 20, 3, 17, 8, TILE.STONE);
  fill(m, 26, 9, 11, 7, TILE.STONE);
  fill(m, 30, 14, 7, 13, TILE.STONE);
  fill(m, 16, 19, 17, 8, TILE.STONE);
  fill(m, 4, 4, 9, 9, TILE.STONE);
  fill(m, 10, 10, 7, 5, TILE.STONE);
  fill(m, 23, 11, 5, 13, TILE.WATER);
  put(m, 4, 23, TILE.STAIRS);
  put(m, 34, 5, TILE.STAIRS);
  for (let y = 13; y <= 19; y += 1) put(m, 25, y, TILE.BRIDGE);
  for (const [x, y] of [[7,22],[12,16],[18,10],[22,6],[32,12],[34,22]]) put(m, x, y, TILE.LANTERN);
  scatter(m, 401, TILE.CRYSTAL, 34, (_x, _y, t) => t === TILE.WALL);

  m.warps.push(
    { x: 3, y: 23, to: "cave1", tx: 31, ty: 5, dir: "left", label: "空泣き洞 B1" },
    { x: 34, y: 5, to: "cave3", tx: 4, ty: 23, dir: "right", label: "空泣き洞 最深部" },
  );
  m.chests.push(
    { id: "cave2-blade", x: 6, y: 5, loot: { item: "skyBlade", qty: 1 }, label: "空鋼の剣" },
    { id: "cave2-bell", x: 35, y: 25, loot: { item: "brightBell", qty: 1 }, label: "光鳴りの鈴" },
    { id: "cave2-elixir", x: 21, y: 25, loot: { item: "auraDrop", qty: 1 }, label: "オーラの雫" },
    { id: "cave2-gold", x: 11, y: 11, loot: { gold: 138 }, label: "138ゴールド" },
  );
  m.specials.push(
    { id: "water-lever", type: "lever", x: 32, y: 22 },
    { id: "water-bridge", type: "bridgeGate", x: 25, y: 16, requires: "waterLever" },
    { id: "hidden-wall", type: "hiddenWall", x: 13, y: 9, target: [12, 9] },
    { id: "rope-anchor", type: "rope", x: 18, y: 20 },
  );
  m.enemies.push(
    { id: "cave2-01", x: 11, y: 20, group: ["armorShell", "gloomBat"], awareness: 4 },
    { id: "cave2-02", x: 17, y: 13, group: ["mistWisp", "mistWisp", "gloomBat"], awareness: 5 },
    { id: "cave2-03", x: 22, y: 7, group: ["armorShell", "armorShell", "softSlime"], awareness: 4 },
    { id: "cave2-04", x: 31, y: 11, group: ["anxietyShade", "gloomBat"], awareness: 5 },
    { id: "cave2-05", x: 32, y: 21, group: ["anxietyShade", "mistWisp"], awareness: 5 },
    { id: "cave2-06", x: 20, y: 23, group: ["armorShell", "anxietyShade"], awareness: 4 },
  );
  m.start = [4, 23];
  return m;
}

function cave3() {
  const m = map("cave3", "空泣き洞・哀哭の間", 34, 28, TILE.WALL, "bossCave");
  border(m, TILE.WALL);
  fill(m, 2, 19, 10, 7, TILE.STONE);
  fill(m, 9, 13, 8, 10, TILE.STONE);
  fill(m, 14, 7, 7, 10, TILE.STONE);
  fill(m, 18, 3, 13, 9, TILE.STONE);
  fill(m, 21, 10, 10, 12, TILE.STONE);
  fill(m, 16, 20, 12, 6, TILE.STONE);
  put(m, 4, 23, TILE.STAIRS);
  fill(m, 22, 5, 6, 5, TILE.FLOOR);
  put(m, 24, 6, TILE.CRYSTAL);
  put(m, 25, 6, TILE.CRYSTAL);
  put(m, 25, 8, TILE.LANTERN);
  for (const [x, y] of [[7,22],[12,17],[18,11],[23,17]]) put(m, x, y, TILE.LANTERN);
  scatter(m, 511, TILE.CRYSTAL, 22, (_x, _y, t) => t === TILE.WALL);

  m.warps.push({ x: 3, y: 23, to: "cave2", tx: 33, ty: 5, dir: "left", label: "空泣き洞 B2" });
  m.chests.push(
    { id: "cave3-helm", x: 25, y: 20, loot: { item: "oathBadge", qty: 1 }, label: "騎士の誓章" },
    { id: "cave3-wing", x: 19, y: 4, loot: { item: "wing", qty: 1 }, label: "風渡りの羽" },
  );
  m.specials.push({ id: "chapter-boss", type: "boss", x: 25, y: 7 });
  m.enemies.push(
    { id: "cave3-01", x: 11, y: 19, group: ["anxietyShade", "gloomBat", "gloomBat"], awareness: 5 },
    { id: "cave3-02", x: 18, y: 13, group: ["armorShell", "anxietyShade"], awareness: 4 },
    { id: "cave3-03", x: 24, y: 16, group: ["mistWisp", "anxietyShade", "mistWisp"], awareness: 5 },
  );
  m.start = [4, 23];
  return m;
}

export const MAPS = Object.freeze({
  highroad: highroad(),
  solaido: solaido(),
  echoGrove: echoGrove(),
  oldWell: oldWell(),
  cave1: cave1(),
  cave2: cave2(),
  cave3: cave3(),
});

export const ITEMS = Object.freeze({
  herb: { name: "薬草", type: "usable", price: 18, sell: 8, description: "味方ひとりのHPを35回復する。" },
  moonwort: { name: "月しずく草", type: "usable", price: 26, sell: 12, description: "毒・恐怖・オーラ低下を治す。" },
  auraDrop: { name: "オーラの雫", type: "usable", price: 78, sell: 36, description: "味方ひとりのMPを18回復する。" },
  brightBell: { name: "光鳴りの鈴", type: "usable", price: 90, sell: 45, description: "味方全体を恐怖から守り、暗い障壁を揺らす。" },
  smokeBomb: { name: "けむり玉", type: "usable", price: 28, sell: 14, description: "通常戦闘から確実に離脱する。" },
  torch: { name: "たいまつ", type: "field", price: 16, sell: 8, description: "深い洞窟を120歩のあいだ明るく照らす。" },
  wing: { name: "風渡りの羽", type: "field", price: 35, sell: 17, description: "屋外か洞窟から王都へ帰還する。" },
  dewleaf: { name: "朝露草", type: "key", sell: 3, description: "こだまの森に生える薬草。" },
  skyRibbon: { name: "空色のリボン", type: "key", description: "幼い旅人が落とした大切なリボン。" },
  lifeSeed: { name: "命の木の実", type: "field", sell: 50, description: "最大HPを5上げる貴重な実。" },
  copperSword: { name: "銅の剣", type: "weapon", price: 95, sell: 47, atk: 6, description: "扱いやすい旅人用の片手剣。" },
  skyBlade: { name: "空鋼の剣", type: "weapon", sell: 120, atk: 12, element: "wind", description: "洞窟の青鉱から打たれた剣。" },
  oakStaff: { name: "樫の杖", type: "weapon", price: 78, sell: 39, atk: 3, mag: 5, description: "祈りの力を通しやすい杖。" },
  ironSpear: { name: "鉄の槍", type: "weapon", price: 155, sell: 77, atk: 9, description: "騎士団で使われる長槍。" },
  leatherShield: { name: "皮の盾", type: "shield", price: 68, sell: 34, def: 4, description: "軽く、旅歩きの邪魔にならない盾。" },
  blueBuckler: { name: "蒼紋の小盾", type: "shield", price: 128, sell: 64, def: 7, resist: "fear", description: "恐怖への耐性を宿す騎士の小盾。" },
  travelCoat: { name: "旅人のコート", type: "body", price: 84, sell: 42, def: 5, description: "雨風を防ぐ丈夫な上着。" },
  paddedVest: { name: "綿入りの服", type: "body", sell: 58, def: 8, spd: -1, description: "古いが防寒性と守りに優れる。" },
  windRing: { name: "そよ風の指輪", type: "accessory", sell: 70, spd: 4, description: "身のこなしを軽くする指輪。" },
  captainCharm: { name: "団結のお守り", type: "accessory", sell: 90, maxHp: 10, description: "隣に仲間がいると温かくなる。" },
  oathBadge: { name: "騎士の誓章", type: "accessory", sell: 120, atk: 3, def: 3, description: "洞窟の最深部に残された、攻守を高める騎士の証。" },
  legacyEmblem: { name: "旅人のしるし", type: "accessory", sell: 0, def: 2, maxHp: 5, description: "旧ヒナティアを歩いた冒険者の証。" },
});

export const SHOPS = Object.freeze({
  item: {
    name: "旅支度の店",
    goods: ["herb", "moonwort", "auraDrop", "smokeBomb", "torch", "wing"],
  },
  armory: {
    name: "青空武具店",
    goods: ["copperSword", "oakStaff", "leatherShield", "travelCoat", "blueBuckler", "ironSpear"],
  },
  camp: {
    name: "街道の行商",
    goods: ["herb", "moonwort", "torch", "wing"],
  },
});

export const SKILLS = Object.freeze({
  auraBlade: {
    name: "オーラブレード",
    owner: "hero",
    level: 1,
    mp: 3,
    target: "enemy",
    power: 1.7,
    element: "light",
    description: "光をまとった一撃。闇の敵に強い。",
  },
  cheer: {
    name: "推しの声援",
    owner: "hero",
    level: 1,
    mp: 3,
    target: "ally",
    effect: "cheer",
    description: "味方ひとりの攻撃と魔力を3ターン上げる。",
  },
  healingCall: {
    name: "ヒールコール",
    owner: "hero",
    level: 2,
    mp: 4,
    target: "ally",
    effect: "heal",
    power: 38,
    description: "味方ひとりのHPを回復する。",
  },
  callResponse: {
    name: "コール＆レスポンス",
    owner: "hero",
    level: 4,
    mp: 8,
    target: "allAllies",
    effect: "haste",
    description: "味方全体の素早さと士気を上げる。",
  },
  promiseAura: {
    name: "約束のハッピーオーラ",
    owner: "hero",
    level: 1,
    happy: 100,
    target: "allEnemies",
    effect: "finisher",
    description: "ゲージを全て使い、全員を癒して闇を照らす。",
  },
  skyThrust: {
    name: "蒼天突き",
    owner: "kumi",
    level: 1,
    mp: 4,
    target: "enemy",
    power: 1.78,
    element: "wind",
    description: "風を裂く槍の一撃。",
  },
  captainCall: {
    name: "キャプテンコール",
    owner: "kumi",
    level: 1,
    mp: 5,
    target: "allAllies",
    effect: "captain",
    description: "味方全体の攻撃と守備を2ターン上げる。恐怖は治さない。",
  },
  formation: {
    name: "鉄壁のフォーメーション",
    owner: "kumi",
    level: 3,
    mp: 7,
    target: "allAllies",
    effect: "formation",
    description: "このターン、味方全体が受ける傷を半減する。",
  },
});

export const ENEMIES = Object.freeze({
  softSlime: {
    name: "そらしずく",
    sprite: "slime",
    hp: 28,
    mp: 0,
    atk: 9,
    def: 4,
    spd: 7,
    exp: 5,
    gold: 5,
    weakness: "wind",
    pattern: ["attack", "attack"],
  },
  thornMouse: {
    name: "トゲネズミ",
    sprite: "mouse",
    hp: 37,
    mp: 0,
    atk: 12,
    def: 5,
    spd: 12,
    exp: 7,
    gold: 6,
    weakness: "fire",
    pattern: ["attack", "double", "attack"],
  },
  gloomBat: {
    name: "うつろコウモリ",
    sprite: "bat",
    hp: 32,
    mp: 0,
    atk: 11,
    def: 4,
    spd: 16,
    exp: 7,
    gold: 7,
    weakness: "light",
    pattern: ["auraDown", "attack", "attack"],
  },
  mistWisp: {
    name: "ためいき火",
    sprite: "wisp",
    hp: 43,
    mp: 8,
    atk: 13,
    mag: 15,
    def: 7,
    spd: 11,
    exp: 10,
    gold: 9,
    weakness: "light",
    pattern: ["attack", "mist", "attack"],
  },
  armorShell: {
    name: "ヨロイガニ",
    sprite: "crab",
    hp: 58,
    mp: 0,
    atk: 16,
    def: 15,
    spd: 5,
    exp: 12,
    gold: 12,
    weakness: "wind",
    pattern: ["guard", "attack", "attack"],
  },
  anxietyShade: {
    name: "不安の影",
    sprite: "shade",
    hp: 51,
    mp: 12,
    atk: 15,
    mag: 18,
    def: 8,
    spd: 13,
    exp: 14,
    gold: 11,
    weakness: "light",
    pattern: ["fear", "attack", "drain"],
  },
  gloomMoth: {
    name: "夜帳のモス",
    sprite: "moth",
    boss: true,
    hp: 128,
    mp: 30,
    atk: 18,
    mag: 19,
    def: 9,
    spd: 17,
    exp: 54,
    gold: 72,
    weakness: "light",
    actions: ["attack", "dust", "wind"],
  },
  raidBrute: {
    name: "ふさぎオーク",
    sprite: "orc",
    elite: true,
    hp: 92,
    mp: 10,
    atk: 19,
    def: 10,
    spd: 8,
    exp: 38,
    gold: 38,
    weakness: "wind",
    actions: ["attack", "heavy", "fear"],
  },
  smileEater: {
    name: "笑顔喰らい",
    sprite: "smileEater",
    boss: true,
    hp: 330,
    mp: 80,
    atk: 22,
    mag: 23,
    def: 13,
    spd: 10,
    exp: 110,
    gold: 140,
    weakness: "light",
    actions: ["attack", "sigh", "darkWhisper", "smileDrain"],
  },
});

export const EQUIP_SLOTS = Object.freeze(["weapon", "shield", "body", "accessory"]);
export const SLOT_NAMES = Object.freeze({
  weapon: "武器",
  shield: "盾",
  body: "からだ",
  accessory: "装飾",
});

export const RUMORS = Object.freeze({
  city: {
    title: "石壁の向こうの大きな町",
    text: "街道を北へ行けば王都ソラシド。まず旅支度が整うはずだ。",
    region: "ソラシド近郊・北",
  },
  grove: {
    title: "歌を返す森",
    text: "街道の西には、声を返す『こだまの森』がある。朝露草と古い祠があるらしい。",
    region: "ソラシド近郊・西",
  },
  well: {
    title: "忘れられた井戸",
    text: "野営地の西、崩れた石組みの下に古井戸が残る。子どもの落とし物もそこへ流れた。",
    region: "ソラシド近郊・南西",
  },
  cave: {
    title: "青く泣く洞窟",
    text: "町を襲う魔物は、川の東にある空泣き洞へ退いた。青い岩壁が目印。",
    region: "ソラシド近郊・北東",
  },
  barrier: {
    title: "笑顔を拒む暗い膜",
    text: "強い闇は、仲間を励ます号令や光鳴りの鈴で揺らぐ。影を先に倒す手もある。",
    region: "空泣き洞",
  },
  hiddenWall: {
    title: "風が抜ける石壁",
    text: "空泣き洞の水脈では、灯りの消える壁を押せ。隠れた旧坑道へ通じる。",
    region: "空泣き洞 B2",
  },
  retreat: {
    title: "帰る勇気",
    text: "深い洞窟ではMPが尽きる前に戻るのも立派な判断。風渡りの羽なら王都へ帰れる。",
    region: "旅の心得",
  },
});

export const QUESTS = Object.freeze({
  chapter1: {
    name: "空色の騎士団長",
    description: "ソラシドを覆う暗い気配の正体を探る。",
    main: true,
  },
  dewMedicine: {
    name: "笑顔を戻す薬",
    description: "薬師に朝露草を3枚届ける。",
    reward: "光鳴りの鈴",
  },
  lostRibbon: {
    name: "空色の落とし物",
    description: "忘れ井戸へ流れたリボンを探す。",
    reward: "120ゴールドと団結のお守り",
  },
  lostMiner: {
    name: "帰らない坑夫",
    description: "空泣き洞B1で迷った坑夫を見つける。",
    reward: "鉄の槍を割引",
  },
});

export const INITIAL_DIALOGUE = [
  { speaker: "SYSTEM", portrait: "system", text: "イヤホンの向こうで、誰かの笑い声がした。" },
  { speaker: "SYSTEM", portrait: "system", text: "見慣れた部屋も、空色の画面も、まぶしい光にほどけていく。" },
  { speaker: "？？？", portrait: "light", text: "——ハッピーオーラを、見つけて。" },
  { speaker: "SYSTEM", portrait: "system", text: "草の匂い。遠い鐘。手元には剣と、名前の消えた応援旗だけが残っていた。" },
  { speaker: "SYSTEM", portrait: "system", text: "ここは異世界ヒナティア。どこへ行くかは、あなたが決める。" },
];
