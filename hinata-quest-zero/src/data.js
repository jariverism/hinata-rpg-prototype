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
  hline(m, 1, 8, 18, TILE.PATH, 2);
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
    {
      x: 1,
      y: 18,
      to: "mireRoad",
      tx: 47,
      ty: 16,
      dir: "left",
      label: "陽だまり街道",
      requires: "chapter1Clear",
      denied: "西へ続く関所は閉じている。王都を覆う闇を退けなければ通れそうにない。",
    },
    {
      x: 1,
      y: 19,
      to: "mireRoad",
      tx: 47,
      ty: 17,
      dir: "left",
      label: "陽だまり街道",
      requires: "chapter1Clear",
      denied: "西へ続く関所は閉じている。王都を覆う闇を退けなければ通れそうにない。",
    },
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

function mireRoad() {
  const m = map("mireRoad", "陽だまり街道", 50, 34, TILE.GRASS, "harvest");
  border(m, TILE.TREE);
  hline(m, 1, 48, 16, TILE.PATH, 2);
  pathPoints(m, [[24, 17], [24, 4]], TILE.PATH, 2);
  vline(m, 24, 17, 32, TILE.PATH, 2);
  pathPoints(m, [[36, 16], [36, 8], [42, 8], [42, 5]], TILE.PATH, 2);
  pathPoints(m, [[8, 16], [8, 9], [14, 9]], TILE.PATH, 2);
  fill(m, 4, 4, 15, 8, TILE.SAND);
  for (let y = 5; y < 11; y += 2)
    for (let x = 5; x < 18; x += 3) put(m, x, y, TILE.FLOWER);
  fill(m, 29, 22, 13, 7, TILE.MUD);
  hline(m, 29, 41, 24, TILE.WOOD);
  fill(m, 20, 26, 6, 5, TILE.WATER);
  put(m, 22, 26, TILE.REEDS);
  put(m, 25, 29, TILE.REEDS);
  scatter(m, 812, TILE.TREE, 105, (x, y, t) =>
    t === TILE.GRASS && Math.abs(y - 16) > 3 && !(x > 20 && x < 28 && y < 20),
  );
  scatter(m, 413, TILE.FLOWER, 54, (_x, _y, t) => t === TILE.GRASS);
  scatter(m, 219, TILE.ROCK, 28, (_x, _y, t) => t === TILE.GRASS);

  m.warps.push(
    { x: 48, y: 16, to: "highroad", tx: 2, ty: 18, dir: "right", label: "ソラシド近郊" },
    { x: 48, y: 17, to: "highroad", tx: 2, ty: 19, dir: "right", label: "ソラシド近郊" },
    { x: 2, y: 16, to: "mileria", tx: 20, ty: 27, dir: "up", label: "パンの国ミレリア" },
    { x: 2, y: 17, to: "mileria", tx: 21, ty: 27, dir: "up", label: "パンの国ミレリア" },
    { x: 24, y: 3, to: "sunmill", tx: 18, ty: 24, dir: "up", label: "風車の丘" },
    {
      x: 42,
      y: 5,
      to: "granary1",
      tx: 3,
      ty: 21,
      dir: "right",
      label: "封じられた地下穀倉",
      requires: "granaryOpen",
      denied: "黒い蔓が入口を塞いでいる。人の心を温める香りがあれば退けられそうだ。",
    },
    {
      x: 24,
      y: 32,
      to: "spiritPass",
      tx: 24,
      ty: 2,
      dir: "down",
      label: "虹風の峠",
      requires: "chapter2Clear",
      denied: "南の吊り橋は瘴気に沈んでいる。地下穀倉の黒い根を断たなければ渡れない。",
    },
    {
      x: 25,
      y: 32,
      to: "spiritPass",
      tx: 25,
      ty: 2,
      dir: "down",
      label: "虹風の峠",
      requires: "chapter2Clear",
      denied: "南の吊り橋は瘴気に沈んでいる。地下穀倉の黒い根を断たなければ渡れない。",
    },
  );
  m.npcs.push(
    { id: "westFarmer", type: "farmer", x: 30, y: 17, dir: "left" },
    { id: "hungryTraveler", type: "pilgrim", x: 17, y: 17, dir: "right" },
    { id: "fieldWatcher", type: "farmer", x: 11, y: 12, dir: "up" },
  );
  m.chests.push(
    { id: "mire-road-herb", x: 31, y: 27, loot: { item: "herb", qty: 3 }, label: "薬草を3個" },
    { id: "mire-road-gold", x: 45, y: 25, loot: { gold: 82 }, label: "82ゴールド" },
    { id: "mire-road-bread", x: 7, y: 6, loot: { item: "happyBread", qty: 1 }, label: "ハッピーブレッド" },
  );
  m.specials.push(
    { id: "west-sign", type: "sign", x: 39, y: 17, text: "東：ソラシド　西：ミレリア　北：風車の丘" },
    { id: "golden-wheat", type: "goldenWheat", x: 12, y: 8 },
    { id: "dry-field", type: "sign", x: 33, y: 23, text: "土は乾き、種は眠ったままだ。地下から冷たい気配がする。" },
  );
  m.enemies.push(
    { id: "mire-01", x: 43, y: 18, group: ["hungryCrow", "cropSprout"], awareness: 5 },
    { id: "mire-02", x: 34, y: 13, group: ["cropSprout", "cropSprout"], awareness: 3 },
    { id: "mire-03", x: 28, y: 20, group: ["mudGolem", "hungryCrow"], awareness: 4 },
    { id: "mire-04", x: 20, y: 13, group: ["hungryCrow", "hungryCrow"], awareness: 5 },
    { id: "mire-05", x: 10, y: 19, group: ["cropSprout", "mudGolem"], awareness: 4 },
    {
      id: "wheat-scarecrow",
      x: 14,
      y: 10,
      kind: "blightScarecrow",
      unique: true,
      story: "scarecrow",
      awareness: 2,
    },
  );
  m.start = [47, 16];
  return m;
}

function mileria() {
  const m = map("mileria", "パンの国ミレリア", 42, 30, TILE.STONE, "harvestTown");
  border(m, TILE.WALL);
  hline(m, 18, 23, 28, TILE.PATH);
  vline(m, 19, 8, 28, TILE.PATH, 4);
  hline(m, 3, 38, 19, TILE.PATH, 3);
  hline(m, 7, 35, 10, TILE.PATH, 2);
  building(m, 4, 4, 10, 6, 9, TILE.ROOF);
  building(m, 16, 3, 10, 6, 21, TILE.ROOF);
  building(m, 29, 4, 9, 6, 33, TILE.ROOF);
  building(m, 4, 13, 9, 6, 8, TILE.ROOF);
  building(m, 29, 13, 9, 6, 33, TILE.ROOF);
  building(m, 5, 23, 10, 5, 10, TILE.ROOF);
  building(m, 28, 23, 9, 5, 32, TILE.ROOF);
  fill(m, 15, 14, 4, 4, TILE.FLOWER);
  fill(m, 24, 14, 4, 4, TILE.FLOWER);
  put(m, 18, 15, TILE.LANTERN);
  put(m, 24, 15, TILE.LANTERN);
  put(m, 17, 21, TILE.LANTERN);
  put(m, 25, 21, TILE.LANTERN);

  m.warps.push(
    { x: 20, y: 28, to: "mireRoad", tx: 3, ty: 16, dir: "right", label: "陽だまり街道" },
    { x: 21, y: 28, to: "mireRoad", tx: 3, ty: 17, dir: "right", label: "陽だまり街道" },
  );
  m.npcs.push(
    { id: "mirei", type: "mirei", x: 23, y: 10, dir: "left" },
    { id: "mireBaker", type: "baker", x: 9, y: 10, dir: "down" },
    { id: "mireShop", type: "merchant", x: 33, y: 10, dir: "down" },
    { id: "mireInn", type: "inn", x: 8, y: 19, dir: "down" },
    { id: "mirePriest", type: "priest", x: 33, y: 19, dir: "down" },
    { id: "mireChild", type: "child", x: 26, y: 12, dir: "left" },
    { id: "mireFarmerA", type: "farmer", x: 15, y: 12, dir: "right" },
    { id: "mireFarmerB", type: "farmer", x: 27, y: 24, dir: "left" },
    { id: "windScholar", type: "scholar", x: 14, y: 20, dir: "right" },
  );
  m.chests.push(
    { id: "mirelia-bread", x: 3, y: 25, loot: { item: "happyBread", qty: 2 }, label: "ハッピーブレッドを2個" },
    { id: "mirelia-gold", x: 39, y: 24, loot: { gold: 64 }, label: "64ゴールド" },
  );
  m.specials.push(
    { id: "mire-armory", type: "shop", shop: "mireArmory", x: 9, y: 9 },
    { id: "mire-item", type: "shop", shop: "mireItem", x: 33, y: 9 },
    { id: "mire-inn", type: "inn", x: 8, y: 18 },
    { id: "mire-church", type: "church", x: 33, y: 18 },
    { id: "mire-save", type: "save", x: 14, y: 9 },
    { id: "bakery-oven", type: "oven", x: 21, y: 8 },
    { id: "mire-board", type: "mireBoard", x: 17, y: 23 },
  );
  m.start = [20, 27];
  return m;
}

function sunmill() {
  const m = map("sunmill", "風車の丘", 38, 28, TILE.GRASS, "harvest");
  border(m, TILE.TREE);
  pathPoints(m, [[18, 25], [18, 12], [30, 12]], TILE.PATH, 2);
  pathPoints(m, [[18, 18], [6, 18]], TILE.PATH, 2);
  fill(m, 25, 5, 9, 7, TILE.STONE);
  building(m, 27, 5, 6, 6, 30, TILE.ROOF);
  fill(m, 3, 15, 7, 7, TILE.WATER);
  hline(m, 6, 10, 18, TILE.BRIDGE);
  scatter(m, 777, TILE.TREE, 85, (x, y, t) =>
    t === TILE.GRASS && !(x > 14 && x < 34 && y > 7 && y < 22),
  );
  scatter(m, 278, TILE.FLOWER, 48, (_x, _y, t) => t === TILE.GRASS);
  scatter(m, 479, TILE.ROCK, 22, (_x, _y, t) => t === TILE.GRASS);

  m.warps.push({ x: 18, y: 25, to: "mireRoad", tx: 24, ty: 4, dir: "down", label: "陽だまり街道" });
  m.npcs.push(
    { id: "millKeeper", type: "miller", x: 24, y: 13, dir: "right" },
    { id: "springSpirit", type: "spirit", x: 10, y: 20, dir: "up" },
  );
  m.chests.push(
    { id: "mill-aura", x: 34, y: 7, loot: { item: "auraDrop", qty: 1 }, label: "オーラの雫" },
    { id: "mill-coins", x: 12, y: 23, loot: { gold: 96 }, label: "96ゴールド" },
  );
  m.specials.push(
    { id: "spring-water", type: "springWater", x: 6, y: 18 },
    { id: "sun-yeast", type: "sunYeast", x: 30, y: 10 },
    { id: "mill-sign", type: "sign", x: 20, y: 16, text: "清水は低きへ、酵母は陽の当たる高きへ宿る。" },
  );
  m.enemies.push(
    { id: "mill-01", x: 15, y: 20, group: ["hungryCrow", "hungryCrow"], awareness: 5 },
    { id: "mill-02", x: 21, y: 15, group: ["cropSprout", "hungryCrow"], awareness: 4 },
    { id: "mill-03", x: 28, y: 14, group: ["mudGolem", "cropSprout"], awareness: 3 },
  );
  m.start = [18, 24];
  return m;
}

function granary1() {
  const m = map("granary1", "封じられた地下穀倉 B1", 40, 26, TILE.WALL, "granary");
  border(m, TILE.WALL);
  fill(m, 2, 18, 10, 6, TILE.FLOOR);
  fill(m, 9, 14, 10, 8, TILE.FLOOR);
  fill(m, 16, 6, 8, 13, TILE.FLOOR);
  fill(m, 21, 4, 14, 8, TILE.FLOOR);
  fill(m, 29, 10, 8, 12, TILE.FLOOR);
  fill(m, 19, 19, 14, 5, TILE.FLOOR);
  for (const [x, y] of [[6,20],[13,17],[19,10],[28,7],[33,16],[24,21]])
    put(m, x, y, TILE.WOOD);
  put(m, 3, 21, TILE.STAIRS);
  put(m, 33, 6, TILE.STAIRS);
  scatter(m, 911, TILE.MOSS, 24, (_x, _y, t) => t === TILE.WALL);

  m.warps.push(
    { x: 2, y: 21, to: "mireRoad", tx: 41, ty: 6, dir: "left", label: "陽だまり街道" },
    { x: 33, y: 6, to: "granary2", tx: 4, ty: 22, dir: "right", label: "地下穀倉 B2" },
  );
  m.npcs.push({ id: "granaryKeeper", type: "farmer", x: 11, y: 18, dir: "right" });
  m.chests.push(
    { id: "granary1-vest", x: 21, y: 7, loot: { item: "bakerApron", qty: 1 }, label: "祝福のエプロン" },
    { id: "granary1-bread", x: 31, y: 20, loot: { item: "happyBread", qty: 2 }, label: "ハッピーブレッドを2個" },
  );
  m.specials.push(
    { id: "granary-shortcut", type: "granaryLever", x: 23, y: 20 },
    { id: "granary-lift", type: "shortcut", x: 24, y: 20, requires: "granaryShortcut", target: [4, 21] },
    { id: "granary-note", type: "sign", x: 18, y: 8, text: "『根を焼かず、まず土へ光を。芯は二本の根に守られる』" },
  );
  m.enemies.push(
    { id: "granary1-01", x: 10, y: 20, group: ["flourGhost", "cropSprout"], awareness: 4 },
    { id: "granary1-02", x: 17, y: 16, group: ["mudGolem", "flourGhost"], awareness: 4 },
    { id: "granary1-03", x: 22, y: 9, group: ["hungryCrow", "flourGhost", "hungryCrow"], awareness: 5 },
    { id: "granary1-04", x: 32, y: 14, group: ["mudGolem", "cropSprout"], awareness: 3 },
  );
  m.start = [3, 21];
  return m;
}

function granary2() {
  const m = map("granary2", "封じられた地下穀倉・根の間", 38, 26, TILE.WALL, "granaryBoss");
  border(m, TILE.WALL);
  fill(m, 2, 18, 10, 6, TILE.FLOOR);
  fill(m, 9, 12, 9, 11, TILE.FLOOR);
  fill(m, 16, 7, 8, 10, TILE.FLOOR);
  fill(m, 21, 4, 14, 10, TILE.FLOOR);
  fill(m, 24, 12, 10, 11, TILE.FLOOR);
  hline(m, 12, 29, 20, TILE.FLOOR, 3);
  put(m, 4, 22, TILE.STAIRS);
  fill(m, 27, 6, 5, 5, TILE.MUD);
  put(m, 29, 8, TILE.CRYSTAL);
  for (const [x, y] of [[8,20],[14,15],[20,10],[27,18],[32,14]]) put(m, x, y, TILE.LANTERN);
  scatter(m, 612, TILE.MOSS, 28, (_x, _y, t) => t === TILE.WALL);

  m.warps.push({ x: 3, y: 22, to: "granary1", tx: 32, ty: 6, dir: "left", label: "地下穀倉 B1" });
  m.chests.push(
    { id: "granary2-pan", x: 14, y: 14, loot: { item: "sunPan", qty: 1 }, label: "陽光のフライパン" },
    { id: "granary2-wing", x: 26, y: 20, loot: { item: "wing", qty: 1 }, label: "風渡りの羽" },
  );
  m.specials.push({ id: "chapter2-boss", type: "boss2", x: 29, y: 8 });
  m.enemies.push(
    { id: "granary2-01", x: 10, y: 20, group: ["dryRoot", "flourGhost"], awareness: 4 },
    { id: "granary2-02", x: 17, y: 13, group: ["mudGolem", "dryRoot"], awareness: 4 },
    { id: "granary2-03", x: 25, y: 17, group: ["flourGhost", "flourGhost", "cropSprout"], awareness: 5 },
  );
  m.start = [4, 22];
  return m;
}

function spiritPass() {
  const m = map("spiritPass", "虹風の峠", 50, 34, TILE.GRASS, "spiritPass");
  border(m, TILE.TREE);
  pathPoints(m, [[24, 1], [24, 17], [4, 17]], TILE.PATH, 2);
  pathPoints(m, [[24, 17], [47, 17]], TILE.PATH, 2);
  pathPoints(m, [[36, 17], [36, 31]], TILE.PATH, 2);
  fill(m, 6, 5, 10, 7, TILE.WATER);
  hline(m, 13, 20, 9, TILE.BRIDGE, 2);
  fill(m, 31, 23, 12, 6, TILE.MOSS);
  for (const [x, y] of [[18,9],[24,12],[30,17],[37,25]]) put(m, x, y, TILE.LANTERN);
  scatter(m, 1351, TILE.TREE, 126, (x, y, t) =>
    t === TILE.GRASS &&
    !(x > 20 && x < 29) &&
    !(y > 13 && y < 21) &&
    !(x > 29 && y > 21),
  );
  scatter(m, 743, TILE.FLOWER, 64, (_x, _y, t) => t === TILE.GRASS);
  scatter(m, 377, TILE.ROCK, 30, (_x, _y, t) => t === TILE.GRASS);
  m.warps.push(
    { x: 24, y: 1, to: "mireRoad", tx: 24, ty: 31, dir: "up", label: "陽だまり街道" },
    { x: 25, y: 1, to: "mireRoad", tx: 25, ty: 31, dir: "up", label: "陽だまり街道" },
    { x: 3, y: 17, to: "sarinaria", tx: 20, ty: 27, dir: "left", label: "精霊樹の里サリナリア" },
    { x: 3, y: 18, to: "sarinaria", tx: 21, ty: 27, dir: "left", label: "精霊樹の里サリナリア" },
    { x: 47, y: 17, to: "whisperWood", tx: 2, ty: 17, dir: "right", label: "三響の森" },
    { x: 47, y: 18, to: "whisperWood", tx: 2, ty: 18, dir: "right", label: "三響の森" },
    {
      x: 36,
      y: 31,
      to: "windRoad",
      tx: 2,
      ty: 18,
      dir: "down",
      label: "天翔け街道",
      requires: "chapter3Clear",
      denied: "南東の谷は無音の嵐に閉ざされている。虹泉の声を取り戻せば風向きが変わりそうだ。",
    },
    {
      x: 37,
      y: 31,
      to: "windRoad",
      tx: 2,
      ty: 19,
      dir: "down",
      label: "天翔け街道",
      requires: "chapter3Clear",
      denied: "南東の谷は無音の嵐に閉ざされている。虹泉の声を取り戻せば風向きが変わりそうだ。",
    },
  );
  m.npcs.push(
    { id: "ridgeRanger", type: "ranger", x: 18, y: 18, dir: "right" },
    { id: "bellPilgrim", type: "pilgrim", x: 34, y: 18, dir: "left" },
    { id: "lostWisp", type: "spirit", x: 38, y: 26, dir: "up" },
  );
  m.chests.push(
    { id: "pass-nectar", x: 18, y: 8, loot: { item: "spiritNectar", qty: 2 }, label: "精霊蜜を2個" },
    { id: "pass-gold", x: 40, y: 27, loot: { gold: 118 }, label: "118ゴールド" },
    { id: "pass-ring", x: 23, y: 25, loot: { item: "rainbowCharm", qty: 1 }, label: "虹結びのお守り" },
  );
  m.specials.push(
    { id: "pass-sign", type: "sign", x: 27, y: 17, text: "西：精霊樹の里　東：三響の森　北：ミレリア" },
    { id: "pass-camp", type: "spiritCamp", x: 34, y: 25 },
  );
  m.enemies.push(
    { id: "pass-01", x: 29, y: 13, group: ["galeWolf", "whisperMushroom"], awareness: 5 },
    { id: "pass-02", x: 39, y: 16, group: ["streamSprite", "galeWolf"], awareness: 5 },
    { id: "pass-03", x: 20, y: 23, group: ["prismBeetle", "whisperMushroom"], awareness: 4 },
    { id: "pass-04", x: 10, y: 18, group: ["streamSprite", "streamSprite"], awareness: 4 },
  );
  m.start = [24, 2];
  return m;
}

function sarinaria() {
  const m = map("sarinaria", "精霊樹の里サリナリア", 42, 30, TILE.MOSS, "spiritTown");
  border(m, TILE.TREE);
  hline(m, 18, 23, 28, TILE.PATH);
  vline(m, 19, 7, 28, TILE.PATH, 4);
  hline(m, 3, 38, 19, TILE.PATH, 3);
  hline(m, 7, 35, 10, TILE.PATH, 2);
  building(m, 4, 4, 9, 6, 8, TILE.ROOF);
  building(m, 16, 2, 11, 7, 21, TILE.ROOF);
  building(m, 30, 4, 8, 6, 34, TILE.ROOF);
  building(m, 4, 13, 9, 6, 8, TILE.ROOF);
  building(m, 29, 13, 9, 6, 33, TILE.ROOF);
  building(m, 5, 23, 9, 5, 9, TILE.ROOF);
  building(m, 29, 23, 8, 5, 33, TILE.ROOF);
  fill(m, 14, 13, 5, 5, TILE.WATER);
  fill(m, 24, 13, 4, 5, TILE.FLOWER);
  put(m, 16, 15, TILE.BRIDGE);
  for (const [x, y] of [[16,10],[25,10],[17,21],[25,21]]) put(m, x, y, TILE.LANTERN);
  m.warps.push(
    { x: 20, y: 28, to: "spiritPass", tx: 4, ty: 17, dir: "right", label: "虹風の峠" },
    { x: 21, y: 28, to: "spiritPass", tx: 4, ty: 18, dir: "right", label: "虹風の峠" },
  );
  m.npcs.push(
    { id: "sarina", type: "sarina", x: 23, y: 10, dir: "left" },
    { id: "shrineElder", type: "shrine", x: 21, y: 8, dir: "down" },
    { id: "sarinaMerchant", type: "merchant", x: 34, y: 10, dir: "down" },
    { id: "sarinaSmith", type: "smith", x: 8, y: 10, dir: "down" },
    { id: "sarinaInn", type: "inn", x: 8, y: 19, dir: "down" },
    { id: "sarinaPriest", type: "priest", x: 33, y: 19, dir: "down" },
    { id: "sarinaChild", type: "child", x: 27, y: 12, dir: "left" },
    { id: "spiritKeeper", type: "spirit", x: 15, y: 20, dir: "right" },
  );
  m.chests.push(
    { id: "sarina-nectar", x: 3, y: 25, loot: { item: "spiritNectar", qty: 2 }, label: "精霊蜜を2個" },
    { id: "sarina-gold", x: 39, y: 24, loot: { gold: 86 }, label: "86ゴールド" },
  );
  m.specials.push(
    { id: "sarina-armory", type: "shop", shop: "sarinaArmory", x: 8, y: 9 },
    { id: "sarina-item", type: "shop", shop: "sarinaItem", x: 34, y: 9 },
    { id: "sarina-inn", type: "inn", x: 8, y: 18 },
    { id: "sarina-church", type: "church", x: 33, y: 18 },
    { id: "sarina-save", type: "save", x: 16, y: 9 },
    { id: "spirit-altar", type: "spiritAltar", x: 21, y: 7 },
    { id: "sarina-board", type: "spiritBoard", x: 17, y: 23 },
  );
  m.start = [20, 27];
  return m;
}

function whisperWood() {
  const m = map("whisperWood", "三響の森", 46, 36, TILE.MOSS, "spiritForest");
  border(m, TILE.TREE);
  scatter(m, 2217, TILE.TREE, 245, (x, y, t) =>
    t === TILE.MOSS && x > 2 && x < 43 && y > 2 && y < 33,
  );
  pathPoints(m, [[1,17],[12,17],[12,8]], TILE.MOSS, 3);
  pathPoints(m, [[12,17],[24,17],[24,8],[35,8]], TILE.MOSS, 3);
  pathPoints(m, [[24,17],[35,17],[35,28]], TILE.MOSS, 3);
  pathPoints(m, [[24,17],[24,34]], TILE.MOSS, 3);
  fill(m, 8, 5, 10, 7, TILE.WATER);
  hline(m, 12, 18, 9, TILE.BRIDGE, 2);
  fill(m, 31, 4, 9, 8, TILE.FLOWER);
  fill(m, 31, 25, 9, 7, TILE.CRYSTAL);
  scatter(m, 918, TILE.FLOWER, 36, (_x, _y, t) => t === TILE.MOSS);
  m.warps.push(
    { x: 1, y: 17, to: "spiritPass", tx: 46, ty: 17, dir: "left", label: "虹風の峠" },
    { x: 1, y: 18, to: "spiritPass", tx: 46, ty: 18, dir: "left", label: "虹風の峠" },
    {
      x: 24,
      y: 34,
      to: "spiritSanctum",
      tx: 3,
      ty: 25,
      dir: "down",
      label: "無音の神域",
      requires: "sarinaJoined",
      denied: "古い精霊文字が道を閉ざしている。三つの音と、その言葉を結ぶ巫女が必要だ。",
    },
    {
      x: 25,
      y: 34,
      to: "spiritSanctum",
      tx: 4,
      ty: 25,
      dir: "down",
      label: "無音の神域",
      requires: "sarinaJoined",
      denied: "古い精霊文字が道を閉ざしている。三つの音と、その言葉を結ぶ巫女が必要だ。",
    },
  );
  m.npcs.push(
    { id: "waterSpirit", type: "spirit", x: 7, y: 14, dir: "right" },
    { id: "windSpirit", type: "spirit", x: 29, y: 13, dir: "left" },
    { id: "lightSpirit", type: "spirit", x: 29, y: 29, dir: "right" },
  );
  m.chests.push(
    { id: "wood-robe", x: 18, y: 8, loot: { item: "shrineRobe", qty: 1 }, label: "精霊織りの装束" },
    { id: "wood-nectar", x: 40, y: 17, loot: { item: "spiritNectar", qty: 2 }, label: "精霊蜜を2個" },
    { id: "wood-gold", x: 8, y: 29, loot: { gold: 146 }, label: "146ゴールド" },
  );
  m.specials.push(
    { id: "water-chime", type: "waterChime", x: 13, y: 8 },
    { id: "wind-chime", type: "windChime", x: 35, y: 7 },
    { id: "light-chime", type: "lightChime", x: 35, y: 28 },
    { id: "wood-inscription", type: "sign", x: 23, y: 21, text: "『水は風を呼び、風は雲を払い、光は最後に虹を結ぶ』" },
  );
  m.enemies.push(
    { id: "wood-01", x: 8, y: 18, group: ["whisperMushroom", "streamSprite"], awareness: 4 },
    { id: "wood-02", x: 20, y: 16, group: ["galeWolf", "prismBeetle"], awareness: 5 },
    { id: "wood-03", x: 29, y: 18, group: ["hollowMask", "whisperMushroom"], awareness: 5 },
    { id: "wood-04", x: 24, y: 28, group: ["prismBeetle", "streamSprite", "whisperMushroom"], awareness: 4 },
    { id: "water-trial", x: 13, y: 11, kind: "rippleGuardian", unique: true, story: "waterTrial", awareness: 2 },
    { id: "wind-trial", x: 32, y: 10, kind: "gustGuardian", unique: true, story: "windTrial", awareness: 2 },
    { id: "light-trial", x: 35, y: 24, kind: "prismGuardian", unique: true, story: "lightTrial", awareness: 2 },
  );
  m.start = [2, 17];
  return m;
}

function spiritSanctum() {
  const m = map("spiritSanctum", "無音の神域", 42, 30, TILE.WALL, "spiritSanctum");
  border(m, TILE.WALL);
  fill(m, 2, 21, 10, 7, TILE.FLOOR);
  fill(m, 9, 15, 10, 10, TILE.FLOOR);
  fill(m, 16, 9, 9, 11, TILE.FLOOR);
  fill(m, 22, 4, 15, 10, TILE.FLOOR);
  fill(m, 27, 12, 10, 12, TILE.FLOOR);
  fill(m, 18, 21, 13, 7, TILE.FLOOR);
  fill(m, 5, 5, 8, 8, TILE.FLOOR);
  fill(m, 10, 11, 8, 6, TILE.FLOOR);
  put(m, 3, 25, TILE.STAIRS);
  put(m, 34, 6, TILE.STAIRS);
  for (const [x, y] of [[7,23],[13,18],[20,13],[29,8],[33,18],[24,24]])
    put(m, x, y, TILE.CRYSTAL);
  scatter(m, 553, TILE.MOSS, 30, (_x, _y, t) => t === TILE.WALL);
  m.warps.push(
    { x: 2, y: 25, to: "whisperWood", tx: 24, ty: 33, dir: "up", label: "三響の森" },
    {
      x: 34,
      y: 6,
      to: "spiritHeart",
      tx: 4,
      ty: 23,
      dir: "right",
      label: "虹泉の心室",
      requires: "spiritGateOpen",
      denied: "三つの響石は沈黙したままだ。精霊たちが語った順で共鳴させる必要がある。",
    },
  );
  m.npcs.push({ id: "sanctumEcho", type: "spirit", x: 12, y: 17, dir: "right" });
  m.chests.push(
    { id: "sanctum-bell", x: 7, y: 7, loot: { item: "rainbowBell", qty: 1 }, label: "七色の精霊鈴" },
    { id: "sanctum-nectar", x: 30, y: 22, loot: { item: "spiritNectar", qty: 2 }, label: "精霊蜜を2個" },
    { id: "sanctum-wing", x: 23, y: 26, loot: { item: "wing", qty: 1 }, label: "風渡りの羽" },
  );
  m.specials.push(
    { id: "resonance-gate", type: "spiritGate", x: 30, y: 8 },
    { id: "sanctum-shortcut", type: "sanctumLever", x: 24, y: 23 },
    { id: "sanctum-lift", type: "shortcut", x: 25, y: 23, requires: "sanctumShortcut", target: [4, 25] },
    { id: "sanctum-tablet", type: "sign", x: 19, y: 11, text: "最初の音は渇きを癒やす。次の音は空を渡る。最後の音は二つを虹にする。" },
  );
  m.enemies.push(
    { id: "sanctum-01", x: 10, y: 23, group: ["hollowMask", "streamSprite"], awareness: 4 },
    { id: "sanctum-02", x: 17, y: 17, group: ["echoArmor", "whisperMushroom"], awareness: 4 },
    { id: "sanctum-03", x: 23, y: 11, group: ["hollowMask", "hollowMask"], awareness: 5 },
    { id: "sanctum-04", x: 31, y: 18, group: ["echoArmor", "prismBeetle"], awareness: 4 },
  );
  m.start = [3, 25];
  return m;
}

function spiritHeart() {
  const m = map("spiritHeart", "虹泉の心室", 36, 28, TILE.WALL, "spiritBoss");
  border(m, TILE.WALL);
  fill(m, 2, 19, 10, 7, TILE.FLOOR);
  fill(m, 9, 13, 9, 10, TILE.FLOOR);
  fill(m, 16, 7, 8, 11, TILE.FLOOR);
  fill(m, 21, 3, 12, 10, TILE.FLOOR);
  fill(m, 23, 11, 10, 12, TILE.FLOOR);
  fill(m, 16, 20, 11, 6, TILE.FLOOR);
  fill(m, 26, 5, 5, 6, TILE.WATER);
  hline(m, 24, 28, 7, TILE.BRIDGE);
  put(m, 4, 23, TILE.STAIRS);
  put(m, 28, 7, TILE.CRYSTAL);
  for (const [x, y] of [[8,22],[13,17],[20,11],[25,18]]) put(m, x, y, TILE.LANTERN);
  scatter(m, 730, TILE.CRYSTAL, 26, (_x, _y, t) => t === TILE.WALL);
  m.warps.push({ x: 3, y: 23, to: "spiritSanctum", tx: 33, ty: 6, dir: "left", label: "無音の神域" });
  m.chests.push(
    { id: "heart-charm", x: 24, y: 20, loot: { item: "rainbowCharm", qty: 1 }, label: "虹結びのお守り" },
    { id: "heart-nectar", x: 21, y: 4, loot: { item: "spiritNectar", qty: 2 }, label: "精霊蜜を2個" },
  );
  m.specials.push({ id: "chapter3-boss", type: "boss3", x: 28, y: 7 });
  m.enemies.push(
    { id: "heart-01", x: 11, y: 19, group: ["echoArmor", "hollowMask"], awareness: 4 },
    { id: "heart-02", x: 19, y: 13, group: ["galeWolf", "prismBeetle", "galeWolf"], awareness: 5 },
  );
  m.start = [4, 23];
  return m;
}

function windRoad() {
  const m = map("windRoad", "天翔け街道", 52, 36, TILE.GRASS, "windRoad");
  border(m, TILE.ROCK);
  hline(m, 1, 50, 18, TILE.PATH, 2);
  pathPoints(m, [[25, 18], [25, 2]], TILE.PATH, 2);
  pathPoints(m, [[36, 18], [36, 34]], TILE.PATH, 2);
  fill(m, 5, 5, 12, 8, TILE.WATER);
  hline(m, 14, 21, 10, TILE.BRIDGE, 2);
  fill(m, 31, 4, 14, 7, TILE.STONE);
  fill(m, 32, 25, 10, 7, TILE.MOSS);
  for (const [x, y] of [[18,18],[25,12],[34,18],[42,18],[36,28]])
    put(m, x, y, TILE.LANTERN);
  scatter(m, 4107, TILE.TREE, 132, (x, y, t) =>
    t === TILE.GRASS &&
    Math.abs(y - 18) > 3 &&
    !(x > 21 && x < 29) &&
    !(x > 31 && x < 42 && y > 22),
  );
  scatter(m, 771, TILE.FLOWER, 54, (_x, _y, t) => t === TILE.GRASS);
  scatter(m, 117, TILE.ROCK, 38, (_x, _y, t) => t === TILE.GRASS);
  m.warps.push(
    { x: 1, y: 18, to: "spiritPass", tx: 36, ty: 30, dir: "up", label: "虹風の峠" },
    { x: 1, y: 19, to: "spiritPass", tx: 37, ty: 30, dir: "up", label: "虹風の峠" },
    { x: 25, y: 2, to: "katoshia", tx: 21, ty: 27, dir: "up", label: "風の街カトシア" },
    { x: 26, y: 2, to: "katoshia", tx: 22, ty: 27, dir: "up", label: "風の街カトシア" },
    { x: 50, y: 18, to: "skyArena", tx: 2, ty: 15, dir: "right", label: "蒼天闘技場" },
    { x: 50, y: 19, to: "skyArena", tx: 2, ty: 16, dir: "right", label: "蒼天闘技場" },
    {
      x: 36,
      y: 34,
      to: "windTower1",
      tx: 3,
      ty: 28,
      dir: "down",
      label: "風哭きの塔",
      requires: "towerOpen",
      denied: "塔門は暴風に閉ざされている。街の風剣士なら風の切れ目を読めるかもしれない。",
    },
    {
      x: 37,
      y: 34,
      to: "windTower1",
      tx: 4,
      ty: 28,
      dir: "down",
      label: "風哭きの塔",
      requires: "towerOpen",
      denied: "塔門は暴風に閉ざされている。街の風剣士なら風の切れ目を読めるかもしれない。",
    },
  );
  m.npcs.push(
    { id: "windCourier", type: "courier", x: 19, y: 19, dir: "right" },
    { id: "arenaFan", type: "fan", x: 43, y: 19, dir: "left" },
    { id: "lostFan", type: "fan", x: 39, y: 28, dir: "up" },
  );
  m.chests.push(
    { id: "wind-road-tonic", x: 17, y: 9, loot: { item: "galeTonic", qty: 2 }, label: "風読みの薬を2個" },
    { id: "wind-road-gold", x: 45, y: 9, loot: { gold: 172 }, label: "172ゴールド" },
    { id: "wind-road-cape", x: 43, y: 29, loot: { item: "featherCape", qty: 1 }, label: "羽織りの外套" },
  );
  m.specials.push(
    { id: "wind-sign", type: "sign", x: 29, y: 18, text: "北：風の街カトシア　東：蒼天闘技場　南：風哭きの塔" },
    { id: "wind-camp", type: "windCamp", x: 32, y: 8 },
  );
  m.enemies.push(
    { id: "wind-road-01", x: 11, y: 19, group: ["cloudHare", "cloudHare"], awareness: 5 },
    { id: "wind-road-02", x: 22, y: 13, group: ["bladeHawk", "cloudHare"], awareness: 6 },
    { id: "wind-road-03", x: 33, y: 16, group: ["windArmor", "bladeHawk"], awareness: 4 },
    { id: "wind-road-04", x: 44, y: 17, group: ["stormDjinn", "cloudHare"], awareness: 5 },
    { id: "wind-road-05", x: 36, y: 26, group: ["windArmor", "stormDjinn"], awareness: 4 },
  );
  m.start = [2, 18];
  return m;
}

function katoshia() {
  const m = map("katoshia", "風の街カトシア", 44, 30, TILE.STONE, "windTown");
  border(m, TILE.WALL);
  hline(m, 19, 24, 28, TILE.PATH);
  vline(m, 20, 7, 28, TILE.PATH, 4);
  hline(m, 3, 40, 19, TILE.PATH, 3);
  hline(m, 7, 37, 10, TILE.PATH, 2);
  building(m, 4, 4, 10, 6, 9, TILE.ROOF);
  building(m, 17, 2, 11, 7, 22, TILE.ROOF);
  building(m, 31, 4, 9, 6, 35, TILE.ROOF);
  building(m, 4, 13, 9, 6, 8, TILE.ROOF);
  building(m, 31, 13, 9, 6, 35, TILE.ROOF);
  building(m, 5, 23, 10, 5, 10, TILE.ROOF);
  building(m, 30, 23, 9, 5, 34, TILE.ROOF);
  fill(m, 14, 13, 5, 5, TILE.FLOWER);
  fill(m, 25, 13, 5, 5, TILE.WATER);
  put(m, 27, 15, TILE.BRIDGE);
  for (const [x, y] of [[17,10],[26,10],[18,21],[26,21]]) put(m, x, y, TILE.LANTERN);
  m.warps.push(
    { x: 21, y: 28, to: "windRoad", tx: 25, ty: 3, dir: "down", label: "天翔け街道" },
    { x: 22, y: 28, to: "windRoad", tx: 26, ty: 3, dir: "down", label: "天翔け街道" },
  );
  m.npcs.push(
    { id: "katoshi", type: "katoshi", x: 24, y: 10, dir: "left" },
    { id: "arenaMaster", type: "arenaMaster", x: 22, y: 8, dir: "down" },
    { id: "windSmith", type: "smith", x: 9, y: 10, dir: "down" },
    { id: "windMerchant", type: "merchant", x: 35, y: 10, dir: "down" },
    { id: "windInn", type: "inn", x: 8, y: 19, dir: "down" },
    { id: "windPriest", type: "priest", x: 35, y: 19, dir: "down" },
    { id: "windChild", type: "child", x: 28, y: 12, dir: "left" },
    { id: "fanSister", type: "fan", x: 15, y: 20, dir: "right" },
  );
  m.chests.push(
    { id: "katoshia-tonic", x: 3, y: 25, loot: { item: "galeTonic", qty: 2 }, label: "風読みの薬を2個" },
    { id: "katoshia-gold", x: 41, y: 24, loot: { gold: 114 }, label: "114ゴールド" },
  );
  m.specials.push(
    { id: "wind-armory", type: "shop", shop: "windArmory", x: 9, y: 9 },
    { id: "wind-item", type: "shop", shop: "windItem", x: 35, y: 9 },
    { id: "wind-inn", type: "inn", x: 8, y: 18 },
    { id: "wind-church", type: "church", x: 35, y: 18 },
    { id: "wind-save", type: "save", x: 17, y: 9 },
    { id: "wind-board", type: "windBoard", x: 18, y: 23 },
  );
  m.start = [21, 27];
  return m;
}

function skyArena() {
  const m = map("skyArena", "蒼天闘技場", 42, 30, TILE.STONE, "arena");
  border(m, TILE.WALL);
  hline(m, 1, 40, 15, TILE.PATH, 2);
  fill(m, 11, 4, 24, 22, TILE.SAND);
  box(m, 10, 3, 26, 24, TILE.PILLAR);
  hline(m, 1, 40, 14, TILE.STONE, 4);
  put(m, 2, 15, TILE.DOOR);
  m.warps.push(
    { x: 1, y: 15, to: "windRoad", tx: 49, ty: 18, dir: "left", label: "天翔け街道" },
    { x: 1, y: 16, to: "windRoad", tx: 49, ty: 19, dir: "left", label: "天翔け街道" },
  );
  m.npcs.push(
    { id: "arenaRegistrar", type: "arenaMaster", x: 7, y: 15, dir: "right" },
    { id: "arenaHealer", type: "priest", x: 7, y: 19, dir: "up" },
  );
  m.specials.push(
    { id: "arena-final", type: "arenaFinal", x: 23, y: 15 },
    { id: "arena-rule", type: "sign", x: 7, y: 12, text: "予選の三人は順不同。守り・速さ・魔法、それぞれの型を見抜け。" },
  );
  m.enemies.push(
    { id: "arena-stone", x: 18, y: 8, kind: "arenaBulwark", unique: true, story: "arenaStone", awareness: 1 },
    { id: "arena-swift", x: 30, y: 15, kind: "arenaRaptor", unique: true, story: "arenaSwift", awareness: 1 },
    { id: "arena-echo", x: 18, y: 23, kind: "arenaMage", unique: true, story: "arenaEcho", awareness: 1 },
  );
  m.chests.push(
    { id: "arena-medal", x: 33, y: 24, loot: { item: "arenaMedal", qty: 1 }, label: "蒼天の記念章" },
  );
  m.start = [2, 15];
  return m;
}

function windTower1() {
  const m = map("windTower1", "風哭きの塔・下層", 44, 32, TILE.WALL, "windTower");
  border(m, TILE.WALL);
  fill(m, 2, 24, 12, 6, TILE.FLOOR);
  fill(m, 10, 17, 10, 10, TILE.FLOOR);
  fill(m, 17, 10, 10, 11, TILE.FLOOR);
  fill(m, 24, 4, 15, 10, TILE.FLOOR);
  fill(m, 25, 17, 14, 10, TILE.FLOOR);
  fill(m, 6, 4, 10, 10, TILE.FLOOR);
  fill(m, 12, 11, 9, 7, TILE.FLOOR);
  put(m, 3, 28, TILE.STAIRS);
  put(m, 35, 6, TILE.STAIRS);
  for (const [x, y] of [[8,8],[15,14],[21,16],[29,9],[31,21]]) put(m, x, y, TILE.LANTERN);
  m.warps.push(
    { x: 2, y: 28, to: "windRoad", tx: 36, ty: 33, dir: "up", label: "天翔け街道" },
    {
      x: 35,
      y: 6,
      to: "windTower2",
      tx: 4,
      ty: 25,
      dir: "right",
      label: "風哭きの塔・上層",
      requires: "windSealNorth",
      requiresAll: ["windSealNorth", "windSealSouth"],
      denied: "中央の昇降翼は止まっている。北と南、二つの風向計を内側へ向ける必要がある。",
    },
  );
  m.chests.push(
    { id: "tower1-rapier", x: 8, y: 7, loot: { item: "skyRapier", qty: 1 }, label: "蒼羽の細剣" },
    { id: "tower1-tonic", x: 34, y: 23, loot: { item: "galeTonic", qty: 3 }, label: "風読みの薬を3個" },
    { id: "tower1-gold", x: 29, y: 5, loot: { gold: 208 }, label: "208ゴールド" },
  );
  m.specials.push(
    { id: "north-vane", type: "windVaneNorth", x: 11, y: 8 },
    { id: "south-vane", type: "windVaneSouth", x: 33, y: 22 },
    { id: "tower-inscription", type: "sign", x: 20, y: 13, text: "『向かい合う二つの風は、争わず上昇気流となる』" },
  );
  m.enemies.push(
    { id: "tower1-01", x: 10, y: 26, group: ["windArmor", "cloudHare"], awareness: 4 },
    { id: "tower1-02", x: 17, y: 19, group: ["bladeHawk", "bladeHawk"], awareness: 6 },
    { id: "tower1-03", x: 22, y: 13, group: ["stormDjinn", "windArmor"], awareness: 5 },
    { id: "tower1-04", x: 30, y: 10, group: ["stormDjinn", "cloudHare", "cloudHare"], awareness: 4 },
  );
  m.start = [3, 28];
  return m;
}

function windTower2() {
  const m = map("windTower2", "風哭きの塔・天輪", 40, 30, TILE.WALL, "windBoss");
  border(m, TILE.WALL);
  fill(m, 2, 20, 10, 8, TILE.FLOOR);
  fill(m, 9, 14, 10, 10, TILE.FLOOR);
  fill(m, 16, 8, 9, 11, TILE.FLOOR);
  fill(m, 22, 3, 14, 11, TILE.FLOOR);
  fill(m, 27, 12, 10, 13, TILE.FLOOR);
  fill(m, 16, 22, 13, 6, TILE.FLOOR);
  fill(m, 27, 4, 7, 7, TILE.CRYSTAL);
  put(m, 4, 25, TILE.STAIRS);
  put(m, 30, 7, TILE.CRYSTAL);
  for (const [x, y] of [[8,23],[14,17],[21,12],[31,17],[22,24]]) put(m, x, y, TILE.LANTERN);
  m.warps.push({ x: 3, y: 25, to: "windTower1", tx: 34, ty: 6, dir: "left", label: "風哭きの塔・下層" });
  m.chests.push(
    { id: "tower2-cape", x: 31, y: 21, loot: { item: "featherCape", qty: 1 }, label: "羽織りの外套" },
    { id: "tower2-tonic", x: 19, y: 25, loot: { item: "galeTonic", qty: 2 }, label: "風読みの薬を2個" },
  );
  m.specials.push(
    { id: "tower-shortcut", type: "towerLever", x: 20, y: 24 },
    { id: "tower-return", type: "shortcut", x: 21, y: 24, requires: "towerShortcut", target: [4, 25] },
    { id: "chapter4-boss", type: "boss4", x: 30, y: 7 },
  );
  m.enemies.push(
    { id: "tower2-01", x: 11, y: 21, group: ["windArmor", "stormDjinn"], awareness: 4 },
    { id: "tower2-02", x: 18, y: 15, group: ["bladeHawk", "stormDjinn", "bladeHawk"], awareness: 6 },
    { id: "tower2-03", x: 27, y: 15, group: ["windArmor", "windArmor"], awareness: 4 },
  );
  m.start = [4, 25];
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
  mireRoad: mireRoad(),
  mileria: mileria(),
  sunmill: sunmill(),
  granary1: granary1(),
  granary2: granary2(),
  spiritPass: spiritPass(),
  sarinaria: sarinaria(),
  whisperWood: whisperWood(),
  spiritSanctum: spiritSanctum(),
  spiritHeart: spiritHeart(),
  windRoad: windRoad(),
  katoshia: katoshia(),
  skyArena: skyArena(),
  windTower1: windTower1(),
  windTower2: windTower2(),
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
  happyBread: { name: "ハッピーブレッド", type: "usable", price: 48, sell: 22, description: "味方全体のHPを25回復する焼きたてパン。" },
  goldenWheat: { name: "黄金麦", type: "key", description: "陽を蓄えたミレリア特産の麦。" },
  springWater: { name: "風車丘の清水", type: "key", description: "冷たく澄んだ、パン作りに適した水。" },
  sunYeast: { name: "陽だまり酵母", type: "key", description: "風車の羽根に宿る、ほのかに光る酵母。" },
  holyPan: { name: "聖火のフライパン", type: "weapon", sell: 145, atk: 7, mag: 8, element: "fire", description: "食卓を守ってきた、炎と癒やしを導く調理具。" },
  sunPan: { name: "陽光のフライパン", type: "weapon", sell: 210, atk: 10, mag: 11, element: "fire", description: "地下穀倉に眠っていた、陽の力を蓄える調理具。" },
  bakerApron: { name: "祝福のエプロン", type: "body", sell: 105, def: 7, mag: 4, description: "温かな祈りが縫い込まれた丈夫な衣。" },
  wheatCharm: { name: "麦穂のお守り", type: "accessory", sell: 95, mag: 3, maxHp: 8, description: "実りを願う人々の祈りを束ねたお守り。" },
  waterChime: { name: "水鏡の音", type: "key", description: "清水の精霊が託した、最初の響き。" },
  windChime: { name: "追風の音", type: "key", description: "空を渡る精霊が託した、二番目の響き。" },
  lightChime: { name: "陽虹の音", type: "key", description: "水と風を虹に結ぶ、最後の響き。" },
  spiritNectar: { name: "精霊蜜", type: "usable", price: 72, sell: 34, description: "味方ひとりのHPを55、MPを8回復する。" },
  spiritBell: { name: "木霊の鈴", type: "weapon", sell: 170, atk: 4, mag: 12, element: "light", description: "小さな精霊の声を戦う力へ変える鈴。" },
  rainbowBell: { name: "七色の精霊鈴", type: "weapon", sell: 255, atk: 6, mag: 16, spd: 2, element: "light", description: "三つの響きを束ね、弱点の音色を奏でる鈴。" },
  shrineRobe: { name: "精霊織りの装束", type: "body", sell: 138, def: 9, mag: 5, description: "森の光を編み込んだ巫女の装束。" },
  rainbowCharm: { name: "虹結びのお守り", type: "accessory", sell: 125, def: 2, mag: 3, maxHp: 6, resist: "silence", description: "沈黙に抗い、精霊との縁を守るお守り。" },
  galeTonic: { name: "風読みの薬", type: "usable", price: 84, sell: 40, description: "味方ひとりのHPを45回復し、鈍足を治して素早さを上げる。" },
  stoneCrest: { name: "堅陣の勝印", type: "key", description: "守りの型を破った証。蒼天闘技場の決勝資格の一つ。" },
  swiftCrest: { name: "瞬脚の勝印", type: "key", description: "速さの型を捉えた証。蒼天闘技場の決勝資格の一つ。" },
  echoCrest: { name: "魔響の勝印", type: "key", description: "魔法の型を越えた証。蒼天闘技場の決勝資格の一つ。" },
  stormSigil: { name: "風塔の通行章", type: "key", description: "史帆が闘技場で勝者へ託した、暴風を裂く通行章。" },
  galeRapier: { name: "追風の細剣", type: "weapon", sell: 230, atk: 14, spd: 4, element: "wind", description: "軽やかな連撃を導く、風の剣士の愛剣。" },
  skyRapier: { name: "蒼羽の細剣", type: "weapon", sell: 310, atk: 17, spd: 6, element: "wind", description: "風哭きの塔に眠る、空気すら切り分ける細剣。" },
  windCoat: { name: "疾風の戦衣", type: "body", sell: 165, def: 10, spd: 4, description: "風圧を逃がし、身のこなしを妨げない戦衣。" },
  featherCape: { name: "羽織りの外套", type: "body", sell: 195, def: 12, spd: 3, resist: "wind", description: "強風を受け流す羽根織りの外套。" },
  arenaMedal: { name: "蒼天の記念章", type: "accessory", sell: 155, atk: 3, spd: 4, description: "挑戦する勇気を讃える闘技場の記念章。" },
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
  mireItem: {
    name: "小麦通りの道具屋",
    goods: ["herb", "moonwort", "auraDrop", "happyBread", "smokeBomb", "wing"],
  },
  mireArmory: {
    name: "実りの鍛冶店",
    goods: ["ironSpear", "oakStaff", "blueBuckler", "travelCoat"],
  },
  sarinaItem: {
    name: "木漏れ日の道具屋",
    goods: ["herb", "moonwort", "auraDrop", "spiritNectar", "smokeBomb", "wing"],
  },
  sarinaArmory: {
    name: "虹枝の武具店",
    goods: ["skyBlade", "ironSpear", "holyPan", "spiritBell", "shrineRobe", "blueBuckler"],
  },
  windItem: {
    name: "追風通りの道具屋",
    goods: ["herb", "moonwort", "auraDrop", "spiritNectar", "galeTonic", "smokeBomb", "wing"],
  },
  windArmory: {
    name: "天輪の武具店",
    goods: ["galeRapier", "ironSpear", "rainbowBell", "windCoat", "featherCape", "blueBuckler"],
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
  bakedHeal: {
    name: "焼きたてヒール",
    owner: "mirei",
    level: 1,
    mp: 4,
    target: "ally",
    effect: "mireiHeal",
    power: 48,
    description: "味方ひとりを大きく回復し、毒も治す。",
  },
  happyBreadSkill: {
    name: "ハッピーブレッド",
    owner: "mirei",
    level: 3,
    mp: 7,
    target: "allAllies",
    effect: "breadWard",
    description: "味方全体を少し回復し、毒・恐怖を治して再生を与える。",
  },
  panSmash: {
    name: "聖火のひと振り",
    owner: "mirei",
    level: 3,
    mp: 4,
    target: "enemy",
    effect: "panBreak",
    power: 1.55,
    element: "fire",
    description: "炎の一撃。敵の攻撃力を下げ、植物の守りを崩す。",
  },
  sacredBell: {
    name: "聖なる鈴",
    owner: "sarina",
    level: 1,
    mp: 5,
    target: "allAllies",
    effect: "sacredBell",
    description: "味方全体を回復し、沈黙・恐怖・鈍足を治す。",
  },
  spiritWard: {
    name: "精霊の守り",
    owner: "sarina",
    level: 4,
    mp: 6,
    target: "allAllies",
    effect: "spiritWard",
    description: "味方全体が3ターン、属性攻撃から受ける傷を減らす。",
  },
  rainbowPrayer: {
    name: "虹色の祈り",
    owner: "sarina",
    level: 4,
    mp: 7,
    target: "enemy",
    effect: "rainbowPrayer",
    power: 1.62,
    description: "精霊が敵の現在の弱点を選び、障壁へ響く魔法を放つ。",
  },
  sarimakashi: {
    name: "サリマカシー",
    owner: "sarina",
    level: 5,
    mp: 10,
    target: "allAllies",
    effect: "sarimakashi",
    description: "全員を大きく癒やし、再生と属性の守りを与える。",
  },
  henyoSlash: {
    name: "へにょへにょ斬り",
    owner: "katoshi",
    level: 1,
    mp: 4,
    target: "enemy",
    effect: "henyoSlash",
    power: 0.82,
    element: "wind",
    description: "力の抜けた二連撃。構えと風の障壁を崩しやすい。",
  },
  galeStep: {
    name: "疾風のステップ",
    owner: "katoshi",
    level: 5,
    mp: 5,
    target: "ally",
    effect: "galeStep",
    description: "味方ひとりの素早さと回避を3ターン上げ、鈍足を治す。",
  },
  katoshiCombo: {
    name: "かとしコンビネーション",
    owner: "katoshi",
    level: 5,
    mp: 7,
    target: "enemy",
    effect: "katoshiCombo",
    power: 2.05,
    element: "wind",
    description: "敵の予告行動へ割り込み、溜めた風を散らす連携剣。",
  },
  skyDance: {
    name: "天空の剣舞",
    owner: "katoshi",
    level: 6,
    mp: 11,
    target: "allEnemies",
    effect: "skyDance",
    power: 1.18,
    element: "wind",
    description: "敵全体を三度切り抜ける風の奥義。",
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
  cropSprout: {
    name: "カレハミノ",
    sprite: "sprout",
    hp: 58,
    mp: 8,
    atk: 18,
    mag: 17,
    def: 9,
    spd: 10,
    exp: 15,
    gold: 12,
    weakness: "fire",
    pattern: ["seedShot", "attack", "rootBind"],
  },
  hungryCrow: {
    name: "ハラペコガラス",
    sprite: "crow",
    hp: 51,
    mp: 0,
    atk: 20,
    def: 8,
    spd: 19,
    exp: 14,
    gold: 13,
    weakness: "wind",
    pattern: ["stealBread", "attack", "double"],
  },
  mudGolem: {
    name: "ヒビワレゴーレム",
    sprite: "mud",
    hp: 86,
    mp: 0,
    atk: 23,
    def: 18,
    spd: 5,
    exp: 21,
    gold: 18,
    weakness: "wind",
    pattern: ["guard", "heavy", "attack"],
  },
  flourGhost: {
    name: "コナユキゴースト",
    sprite: "flour",
    hp: 63,
    mp: 14,
    atk: 17,
    mag: 23,
    def: 10,
    spd: 14,
    exp: 19,
    gold: 16,
    weakness: "fire",
    pattern: ["flourCloud", "attack", "auraDown"],
  },
  blightScarecrow: {
    name: "枯れ穂の番人",
    sprite: "scarecrow",
    elite: true,
    hp: 190,
    mp: 24,
    atk: 25,
    mag: 21,
    def: 13,
    spd: 11,
    exp: 58,
    gold: 54,
    weakness: "fire",
    pattern: ["rootBind", "heavy", "seedStorm"],
  },
  dryRoot: {
    name: "渇きの根",
    sprite: "root",
    hp: 112,
    mp: 18,
    atk: 22,
    mag: 22,
    def: 14,
    spd: 9,
    exp: 28,
    gold: 21,
    weakness: "fire",
    pattern: ["rootBind", "drain", "attack"],
  },
  blightHeart: {
    name: "飢渇核グラノア",
    sprite: "blightHeart",
    boss: true,
    hp: 470,
    mp: 100,
    atk: 27,
    mag: 29,
    def: 16,
    spd: 10,
    exp: 175,
    gold: 220,
    weakness: "fire",
    actions: ["attack", "rotBurst", "seedStorm", "devour"],
  },
  whisperMushroom: {
    name: "ヒソヒソタケ",
    sprite: "mushroom",
    hp: 72,
    mp: 18,
    atk: 20,
    mag: 25,
    def: 11,
    spd: 10,
    exp: 22,
    gold: 18,
    weakness: "fire",
    pattern: ["sporeSilence", "attack", "mist"],
  },
  streamSprite: {
    name: "ナミダマ",
    sprite: "stream",
    hp: 68,
    mp: 20,
    atk: 19,
    mag: 27,
    def: 10,
    spd: 14,
    exp: 23,
    gold: 19,
    weakness: "light",
    pattern: ["spiritSplash", "attack", "drain"],
  },
  galeWolf: {
    name: "カゼカミ",
    sprite: "galeWolf",
    hp: 82,
    mp: 10,
    atk: 28,
    mag: 20,
    def: 12,
    spd: 23,
    exp: 25,
    gold: 21,
    weakness: "fire",
    pattern: ["galeFang", "double", "attack"],
  },
  prismBeetle: {
    name: "ニジカブト",
    sprite: "prismBeetle",
    hp: 105,
    mp: 12,
    atk: 25,
    mag: 23,
    def: 21,
    spd: 8,
    exp: 29,
    gold: 24,
    weakness: "wind",
    pattern: ["prismGuard", "spiritBolt", "attack"],
  },
  hollowMask: {
    name: "シジマ面",
    sprite: "hollowMask",
    hp: 78,
    mp: 24,
    atk: 22,
    mag: 30,
    def: 13,
    spd: 16,
    exp: 28,
    gold: 22,
    weakness: "light",
    pattern: ["muteSong", "auraDown", "spiritBolt"],
  },
  echoArmor: {
    name: "木霊ヨロイ",
    sprite: "echoArmor",
    hp: 122,
    mp: 18,
    atk: 30,
    mag: 24,
    def: 23,
    spd: 7,
    exp: 34,
    gold: 29,
    weakness: "wind",
    pattern: ["guard", "heavy", "spiritBolt"],
  },
  rippleGuardian: {
    name: "水鏡の守り手",
    sprite: "rippleGuardian",
    elite: true,
    hp: 220,
    mp: 32,
    atk: 28,
    mag: 31,
    def: 15,
    spd: 14,
    exp: 64,
    gold: 58,
    weakness: "wind",
    pattern: ["spiritSplash", "mist", "heavy"],
  },
  gustGuardian: {
    name: "追風の守り手",
    sprite: "gustGuardian",
    elite: true,
    hp: 212,
    mp: 28,
    atk: 31,
    mag: 28,
    def: 14,
    spd: 24,
    exp: 64,
    gold: 58,
    weakness: "fire",
    pattern: ["galeFang", "double", "wind"],
  },
  prismGuardian: {
    name: "陽虹の守り手",
    sprite: "prismGuardian",
    elite: true,
    hp: 235,
    mp: 36,
    atk: 27,
    mag: 33,
    def: 18,
    spd: 15,
    exp: 68,
    gold: 62,
    weakness: "light",
    pattern: ["prismGuard", "spiritBolt", "muteSong"],
  },
  muteTotem: {
    name: "沈黙の依代",
    sprite: "muteTotem",
    hp: 138,
    mp: 28,
    atk: 24,
    mag: 31,
    def: 16,
    spd: 12,
    exp: 38,
    gold: 28,
    weakness: "fire",
    pattern: ["muteSong", "spiritBolt", "auraDown"],
  },
  hushAvatar: {
    name: "無響獣サイレント",
    sprite: "hushAvatar",
    boss: true,
    hp: 650,
    mp: 140,
    atk: 32,
    mag: 38,
    def: 20,
    spd: 14,
    exp: 245,
    gold: 310,
    weakness: "fire",
    actions: ["attack", "muteSong", "silenceNova", "spiritDevour"],
  },
  cloudHare: {
    name: "クモノウサギ",
    sprite: "cloudHare",
    hp: 88,
    mp: 10,
    atk: 30,
    mag: 22,
    def: 13,
    spd: 30,
    exp: 29,
    gold: 24,
    weakness: "light",
    pattern: ["feint", "double", "attack"],
  },
  bladeHawk: {
    name: "カマイタチドリ",
    sprite: "bladeHawk",
    hp: 94,
    mp: 16,
    atk: 34,
    mag: 25,
    def: 14,
    spd: 34,
    exp: 32,
    gold: 27,
    weakness: "fire",
    pattern: ["windCut", "double", "feint"],
  },
  windArmor: {
    name: "フウジンヨロイ",
    sprite: "windArmor",
    hp: 148,
    mp: 12,
    atk: 35,
    mag: 23,
    def: 28,
    spd: 10,
    exp: 39,
    gold: 33,
    weakness: "light",
    pattern: ["mirrorGuard", "heavy", "attack"],
  },
  stormDjinn: {
    name: "アラシノジン",
    sprite: "stormDjinn",
    hp: 112,
    mp: 34,
    atk: 28,
    mag: 38,
    def: 16,
    spd: 22,
    exp: 38,
    gold: 31,
    weakness: "fire",
    pattern: ["windBurst", "rootBind", "spiritDevour"],
  },
  arenaBulwark: {
    name: "不動のバルガ",
    sprite: "arenaBulwark",
    elite: true,
    hp: 285,
    mp: 18,
    atk: 36,
    mag: 20,
    def: 30,
    spd: 8,
    exp: 76,
    gold: 68,
    weakness: "light",
    pattern: ["mirrorGuard", "heavy", "guard"],
  },
  arenaRaptor: {
    name: "瞬脚のリュネ",
    sprite: "arenaRaptor",
    elite: true,
    hp: 248,
    mp: 24,
    atk: 37,
    mag: 24,
    def: 16,
    spd: 39,
    exp: 76,
    gold: 68,
    weakness: "earth",
    pattern: ["feint", "double", "windCut"],
  },
  arenaMage: {
    name: "魔響のセレナ",
    sprite: "arenaMage",
    elite: true,
    hp: 232,
    mp: 58,
    atk: 22,
    mag: 43,
    def: 15,
    spd: 20,
    exp: 80,
    gold: 72,
    weakness: "wind",
    pattern: ["windBurst", "muteSong", "mirrorGuard"],
  },
  katoshiDuel: {
    name: "風の剣士シホ",
    sprite: "katoshiDuel",
    boss: true,
    hp: 390,
    mp: 70,
    atk: 40,
    mag: 28,
    def: 20,
    spd: 38,
    exp: 120,
    gold: 100,
    weakness: "light",
    actions: ["feint", "windCut", "mirrorGuard", "duelRush"],
  },
  stormEye: {
    name: "暴風の眼",
    sprite: "stormEye",
    hp: 172,
    mp: 34,
    atk: 27,
    mag: 39,
    def: 18,
    spd: 20,
    exp: 45,
    gold: 34,
    weakness: "light",
    pattern: ["windBurst", "muteSong", "spiritDevour"],
  },
  tempestMirror: {
    name: "颶風鏡ヴェントラ",
    sprite: "tempestMirror",
    boss: true,
    hp: 820,
    mp: 180,
    atk: 40,
    mag: 46,
    def: 23,
    spd: 26,
    exp: 330,
    gold: 390,
    weakness: "light",
    actions: ["attack", "mirrorGuard", "windBurst", "stormDive"],
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
  westRoad: {
    title: "麦の香りが消えた西街道",
    text: "ソラシド近郊の西関所から、パンの国ミレリアへ続く街道へ出られる。",
    region: "ソラシド近郊・西端",
  },
  mirelia: {
    title: "笑わないパンの国",
    text: "ミレリアでは麦が枯れ、人々を笑顔にしていたパン職人も材料を失っている。",
    region: "パンの国ミレリア",
  },
  windmill: {
    title: "風車丘の二つの恵み",
    text: "低地の泉には清水、高台の風車には陽だまり酵母が残る。どちらからでも探せる。",
    region: "風車の丘",
  },
  granary: {
    title: "黒い蔓の地下穀倉",
    text: "枯れた畑の地下に古い穀倉がある。焼きたてパンの香りなら蔓を退けられる。",
    region: "陽だまり街道・北東",
  },
  blightCore: {
    title: "二本の根に守られた核",
    text: "地下の飢渇核は二本の根に守られる。炎で根を崩し、全体攻撃には防御と回復を合わせる。",
    region: "地下穀倉・根の間",
  },
  southTrail: {
    title: "鈴の音が流れる南の峠",
    text: "陽だまり街道の南端から虹風の峠へ渡れる。精霊樹の里は峠の西にある。",
    region: "陽だまり街道・南",
  },
  sarinaria: {
    title: "言葉を失った精霊の里",
    text: "サリナリアでは精霊の声が途切れ、鈴を持つ巫女が三響の森を見つめている。",
    region: "精霊樹の里サリナリア",
  },
  threeChimes: {
    title: "森に散った三つの音",
    text: "水鏡・追風・陽虹の音は三響の森の別々の場所にある。どの守り手から挑んでもよい。",
    region: "三響の森",
  },
  spiritLanguage: {
    title: "虹を結ぶ響きの順",
    text: "水は風を呼び、風は雲を払い、光が最後に虹を結ぶ。精霊の言葉は順序を示す。",
    region: "三響の森",
  },
  silentSanctum: {
    title: "森の底の無音神域",
    text: "三つの音と巫女が揃えば、三響の森の南から古い神域へ入れる。",
    region: "三響の森・南",
  },
  resonanceCore: {
    title: "属性を巡らせる無響獣",
    text: "無響獣は炎・風・光の順に共鳴を変える。依代を崩すか、現在の響きへ弱点属性を合わせる。",
    region: "虹泉の心室",
  },
  eastWindRoad: {
    title: "雲より高い天翔け街道",
    text: "虹風の峠の南東から、風の街カトシアと蒼天闘技場へ続く高原街道へ出られる。",
    region: "虹風の峠・南東",
  },
  katoshia: {
    title: "風を競う街カトシア",
    text: "街では三つの予選を好きな順に突破した者だけが、風の剣士シホへ挑める。",
    region: "風の街カトシア",
  },
  skyTournament: {
    title: "三つの型を越える予選",
    text: "不動は光、瞬脚は鈍足、魔響は風に弱い。順番ではなく、装備と役割の選択が勝敗を分ける。",
    region: "蒼天闘技場",
  },
  towerSeal: {
    title: "向かい合う二つの風向計",
    text: "風哭きの塔では北と南の風向計を内側へ向けると、中央の昇降翼が動く。",
    region: "風哭きの塔・下層",
  },
  stormCore: {
    title: "鏡と二つの暴風眼",
    text: "颶風鏡は暴風眼がある間、風圧障壁と反撃の構えを使う。二連撃で構えを崩し、大技の溜めは連携剣で散らせる。",
    region: "風哭きの塔・天輪",
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
  chapter2: {
    name: "枯れた麦畑と奇跡のパン",
    description: "ミレリアの実りを奪う黒い蔓の根源を探る。",
    main: true,
  },
  miracleBread: {
    name: "三つの恵み",
    description: "黄金麦・風車丘の清水・陽だまり酵母を好きな順で集め、美玲へ届ける。",
    reward: "美玲の加入と地下穀倉への道",
  },
  hungryChildren: {
    name: "おなかの鳴る帰り道",
    description: "街道で空腹の旅人へハッピーブレッドを届ける。",
    reward: "麦穂のお守り",
  },
  chapter3: {
    name: "虹鈴の精霊巫女",
    description: "声を失った精霊の森で、三つの響きと巫女の記憶を取り戻す。",
    main: true,
  },
  threeChimes: {
    name: "水・風・光の三響",
    description: "三響の森で三人の精霊と話し、守り手を越えて三つの音を好きな順で集める。",
    reward: "紗理菜の加入と無音神域への道",
  },
  lostSpirit: {
    name: "帰れない小さな灯",
    description: "虹風の峠で迷った精霊を見つけ、里の精霊守へ知らせる。",
    reward: "虹結びのお守り",
  },
  chapter4: {
    name: "疾風の剣士と蒼天の塔",
    description: "風を競う街で三つの型を越え、空の笑顔を奪う暴風を止める。",
    main: true,
  },
  skyTournament: {
    name: "蒼天三型試合",
    description: "守り・速さ・魔法の予選を好きな順で突破し、風の剣士シホとの決勝へ進む。",
    reward: "加藤史帆の加入と風哭きの塔への道",
  },
  lostFan: {
    name: "向かい風の応援旗",
    description: "天翔け街道で取り残された観客を見つけ、街で待つ姉へ知らせる。",
    reward: "蒼天の記念章",
  },
});

export const INITIAL_DIALOGUE = [
  { speaker: "SYSTEM", portrait: "system", text: "イヤホンの向こうで、誰かの笑い声がした。" },
  { speaker: "SYSTEM", portrait: "system", text: "見慣れた部屋も、空色の画面も、まぶしい光にほどけていく。" },
  { speaker: "？？？", portrait: "light", text: "——ハッピーオーラを、見つけて。" },
  { speaker: "SYSTEM", portrait: "system", text: "草の匂い。遠い鐘。手元には剣と、名前の消えた応援旗だけが残っていた。" },
  { speaker: "SYSTEM", portrait: "system", text: "ここは異世界ヒナティア。どこへ行くかは、あなたが決める。" },
];
