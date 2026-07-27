window.HQ0 = (() => {
  "use strict";
  const TILE = {
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
    WHEAT: 11,
    SAND: 12,
    ROOF: 13,
    LAVA: 14,
    MOSS: 15,
    ROOT: 16,
  };
  const grid = (fill) => Array.from({ length: 11 }, () => Array(20).fill(fill));

  function grass() {
    const g = grid(TILE.GRASS);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.TREE;
      g[10][x] = TILE.TREE;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.TREE;
    }
    for (let x = 1; x < 20; x++) g[5][x] = TILE.PATH;
    for (let y = 0; y < 10; y++) g[y][10] = TILE.PATH;
    g[0][10] = TILE.CAVE;
    for (let x = 3; x < 9; x++) g[8][x] = TILE.WATER;
    g[8][6] = TILE.BRIDGE;
    [
      [3, 2],
      [4, 2],
      [15, 3],
      [16, 3],
      [3, 7],
      [16, 8],
    ].forEach(([x, y]) => (g[y][x] = TILE.FLOWER));
    return g;
  }
  function city() {
    const g = grid(TILE.FLOOR);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.WALL;
      g[10][x] = TILE.WALL;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.WALL;
      g[y][19] = TILE.WALL;
    }
    for (let y = 1; y < 10; y++) g[y][10] = TILE.PATH;
    for (let x = 1; x < 19; x++) g[8][x] = TILE.PATH;
    for (let x = 2; x < 7; x++) {
      g[2][x] = TILE.WALL;
      g[3][x] = TILE.WALL;
    }
    for (let x = 13; x < 18; x++) {
      g[2][x] = TILE.WALL;
      g[3][x] = TILE.WALL;
    }
    g[3][4] = TILE.FLOOR;
    g[3][15] = TILE.FLOOR;
    g[10][10] = TILE.PATH;
    [
      [2, 6],
      [3, 6],
      [16, 6],
      [17, 6],
    ].forEach(([x, y]) => (g[y][x] = TILE.FLOWER));
    return g;
  }
  function cave() {
    const g = grid(TILE.STONE);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.WALL;
      g[10][x] = TILE.WALL;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.WALL;
      g[y][19] = TILE.WALL;
    }
    for (let y = 2; y < 10; y++) g[y][10] = TILE.FLOOR;
    for (let x = 2; x < 18; x++) {
      g[8][x] = TILE.FLOOR;
      g[5][x] = TILE.FLOOR;
    }
    for (let y = 5; y < 9; y++) {
      g[y][3] = TILE.FLOOR;
      g[y][16] = TILE.FLOOR;
    }
    for (let x = 7; x < 14; x++) g[2][x] = TILE.FLOOR;
    for (let y = 2; y < 6; y++) {
      g[y][7] = TILE.FLOOR;
      g[y][13] = TILE.FLOOR;
    }
    g[1][10] = TILE.CRYSTAL;
    g[9][10] = TILE.CAVE;
    return g;
  }

  function worldMap() {
    const g = grid(TILE.GRASS);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.WATER;
      g[10][x] = TILE.WATER;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.WATER;
      g[y][19] = TILE.WATER;
    }
    for (let x = 1; x < 19; x++) g[5][x] = TILE.PATH;
    for (let y = 3; y < 8; y++) {
      g[y][3] = TILE.PATH;
      g[y][16] = TILE.PATH;
    }
    for (let y = 5; y < 10; y++) g[y][10] = TILE.PATH;
    for (let x = 7; x < 13; x++) g[2][x] = TILE.WATER;
    g[2][10] = TILE.BRIDGE;
    [
      [6, 4],
      [8, 7],
      [12, 3],
      [14, 7],
    ].forEach(([x, y]) => (g[y][x] = TILE.FLOWER));
    return g;
  }

  function milerea() {
    const g = grid(TILE.SAND);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.WALL;
      g[10][x] = TILE.WALL;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.WALL;
      g[y][19] = TILE.WALL;
    }
    for (let y = 1; y < 10; y++) g[y][10] = TILE.PATH;
    for (let x = 1; x < 19; x++) g[8][x] = TILE.PATH;
    for (let x = 2; x < 7; x++) {
      g[2][x] = TILE.ROOF;
      g[3][x] = TILE.WALL;
    }
    for (let x = 13; x < 18; x++) {
      g[2][x] = TILE.ROOF;
      g[3][x] = TILE.WALL;
    }
    g[3][4] = TILE.SAND;
    g[3][15] = TILE.SAND;
    g[0][10] = TILE.CAVE;
    g[10][10] = TILE.PATH;
    g[5][19] = TILE.PATH;
    [
      [2, 5],
      [3, 5],
      [16, 5],
      [17, 5],
    ].forEach(([x, y]) => (g[y][x] = TILE.WHEAT));
    return g;
  }

  function wheatfield() {
    const g = grid(TILE.WHEAT);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.TREE;
      g[10][x] = TILE.TREE;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.TREE;
      g[y][19] = TILE.TREE;
    }
    for (let x = 1; x < 19; x++) g[5][x] = TILE.PATH;
    for (let y = 1; y < 10; y++) {
      g[y][6] = TILE.PATH;
      g[y][12] = TILE.PATH;
      g[y][17] = TILE.PATH;
    }
    for (let x = 3; x < 9; x++) g[8][x] = TILE.WATER;
    g[8][6] = TILE.BRIDGE;
    g[5][0] = TILE.PATH;
    return g;
  }

  function oven() {
    const g = grid(TILE.STONE);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.WALL;
      g[10][x] = TILE.WALL;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.WALL;
      g[y][19] = TILE.WALL;
    }
    for (let y = 1; y < 10; y++) g[y][10] = TILE.FLOOR;
    for (let x = 3; x < 17; x++) {
      g[8][x] = TILE.FLOOR;
      g[5][x] = TILE.FLOOR;
      g[2][x] = TILE.FLOOR;
    }
    for (let y = 2; y < 9; y++) {
      g[y][3] = TILE.FLOOR;
      g[y][16] = TILE.FLOOR;
    }
    [
      [6, 3],
      [7, 3],
      [13, 3],
      [14, 3],
      [6, 6],
      [7, 6],
      [13, 6],
      [14, 6],
    ].forEach(([x, y]) => (g[y][x] = TILE.LAVA));
    g[1][10] = TILE.CRYSTAL;
    g[9][10] = TILE.CAVE;
    return g;
  }

  function sarinalia() {
    const g = grid(TILE.GRASS);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.TREE;
      g[10][x] = TILE.TREE;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.TREE;
      g[y][19] = TILE.TREE;
    }
    for (let y = 0; y < 11; y++) g[y][10] = TILE.PATH;
    for (let x = 1; x < 20; x++) g[5][x] = TILE.PATH;
    for (let x = 2; x < 7; x++) {
      g[2][x] = TILE.ROOF;
      g[3][x] = TILE.ROOT;
    }
    for (let x = 13; x < 18; x++) {
      g[2][x] = TILE.ROOF;
      g[3][x] = TILE.ROOT;
    }
    g[3][4] = TILE.MOSS;
    g[3][15] = TILE.MOSS;
    for (let x = 2; x < 8; x++) g[8][x] = TILE.WATER;
    g[8][5] = TILE.BRIDGE;
    g[0][10] = TILE.CAVE;
    g[10][10] = TILE.PATH;
    g[5][19] = TILE.PATH;
    [
      [2, 5],
      [3, 6],
      [16, 5],
      [17, 6],
      [8, 3],
      [12, 7],
    ].forEach(([x, y]) => (g[y][x] = TILE.FLOWER));
    return g;
  }

  function spiritGrove() {
    const g = grid(TILE.MOSS);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.ROOT;
      g[10][x] = TILE.ROOT;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.ROOT;
      g[y][19] = TILE.ROOT;
    }
    g[5][0] = TILE.PATH;
    for (let x = 1; x < 19; x++) g[5][x] = TILE.PATH;
    for (let y = 1; y < 10; y++) {
      g[y][6] = TILE.PATH;
      g[y][12] = TILE.PATH;
      g[y][17] = TILE.PATH;
    }
    for (let x = 2; x < 6; x++) g[2][x] = TILE.WATER;
    g[2][4] = TILE.BRIDGE;
    [
      [8, 1],
      [9, 1],
      [14, 2],
      [15, 2],
      [2, 8],
      [3, 8],
      [9, 8],
      [14, 8],
      [15, 8],
    ].forEach(([x, y]) => (g[y][x] = TILE.ROOT));
    return g;
  }

  function rootShrine() {
    const g = grid(TILE.STONE);
    for (let x = 0; x < 20; x++) {
      g[0][x] = TILE.ROOT;
      g[10][x] = TILE.ROOT;
    }
    for (let y = 0; y < 11; y++) {
      g[y][0] = TILE.ROOT;
      g[y][19] = TILE.ROOT;
    }
    for (let y = 1; y < 10; y++) g[y][10] = TILE.MOSS;
    for (let x = 2; x < 18; x++) {
      g[8][x] = TILE.MOSS;
      g[5][x] = TILE.MOSS;
      g[2][x] = TILE.MOSS;
    }
    for (let y = 2; y < 9; y++) {
      g[y][3] = TILE.MOSS;
      g[y][16] = TILE.MOSS;
    }
    [
      [6, 3],
      [7, 3],
      [13, 3],
      [14, 3],
      [6, 6],
      [7, 6],
      [13, 6],
      [14, 6],
    ].forEach(([x, y]) => (g[y][x] = TILE.CRYSTAL));
    g[1][10] = TILE.CRYSTAL;
    g[9][10] = TILE.CAVE;
    return g;
  }

  const maps = {
    grass: {
      name: "はじまりの草原",
      tiles: grass(),
      start: [2, 5],
      npcs: [
        {
          id: "traveler",
          x: 4,
          y: 4,
          type: "elder",
          name: "旅の行商人",
          lines: [
            "東の門を抜ければ王都ソラシドだ。",
            "目が赤く光った魔物は追ってくる。背後には気をつけな。",
          ],
        },
        {
          id: "guard",
          x: 17,
          y: 4,
          type: "guard",
          name: "門番の騎士",
          lines: ["王都はすぐ東です。草原の魔物を倒してからお進みください！"],
        },
      ],
      chests: [],
      enemies: [
        { id: "tutorial", x: 7, y: 5, kind: "slime", story: true },
        { id: "slime2", x: 14, y: 3, kind: "slime" },
        { id: "bat1", x: 15, y: 8, kind: "bat" },
        { id: "raid", x: 16, y: 5, kind: "hound", hidden: true, story: true },
      ],
    },
    city: {
      name: "王都ソラシド",
      tiles: city(),
      start: [10, 9],
      npcs: [
        {
          id: "child",
          x: 3,
          y: 7,
          type: "child",
          name: "空色の帽子の子",
          lines: [
            "最近みんな笑わなくなったけど、騎士団長さんは毎朝ちゃんと声をかけてくれるよ。",
          ],
        },
        {
          id: "baker",
          x: 16,
          y: 7,
          type: "merchant",
          name: "パン屋の主人",
          lines: [
            "西の国ミレリアから小麦が届かないんだ。畑まで元気をなくしたらしい。",
          ],
        },
        {
          id: "shop",
          x: 6,
          y: 8,
          type: "merchant",
          name: "道具屋",
          lines: ["薬草は15G、青銅の剣は45Gだよ。"],
          shop: true,
        },
        {
          id: "kumi",
          x: 10,
          y: 2,
          type: "kumi",
          name: "空色の騎士団長",
          special: "kumi",
        },
      ],
      chests: [
        {
          id: "cityChest",
          x: 17,
          y: 5,
          item: "herb",
          amount: 1,
          text: "薬草を見つけた！",
        },
      ],
      enemies: [],
    },
    cave: {
      name: "うつろいの洞窟",
      tiles: cave(),
      start: [10, 9],
      npcs: [
        {
          id: "wisp",
          x: 9,
          y: 8,
          type: "wisp",
          name: "小さな光",
          lines: ["奥から誰かのため息が聞こえる……。虹色の光は北を指している。"],
        },
      ],
      chests: [
        {
          id: "herbChest",
          x: 3,
          y: 5,
          item: "herb",
          amount: 2,
          text: "薬草を2個手に入れた！",
        },
        {
          id: "charmChest",
          x: 16,
          y: 5,
          item: "charm",
          amount: 1,
          text: "装備品「空色のお守り」を手に入れた！",
        },
      ],
      enemies: [
        { id: "caveBat", x: 7, y: 5, kind: "bat" },
        { id: "armor", x: 13, y: 5, kind: "armor" },
        { id: "boss", x: 10, y: 1, kind: "boss", boss: true, story: true },
      ],
    },
    world: {
      name: "ヒナティア街道",
      tiles: worldMap(),
      start: [4, 5],
      npcs: [
        {
          id: "worldSora",
          x: 3,
          y: 4,
          type: "world_sora",
          name: "王国ソラシド",
          special: "travelSora",
        },
        {
          id: "worldMile",
          x: 16,
          y: 4,
          type: "world_mile",
          name: "パンの国ミレリア",
          special: "travelMilerea",
        },
        {
          id: "worldSarina",
          x: 10,
          y: 8,
          type: "world_sarina",
          name: "精霊の森サリナリア",
          special: "travelSarinalia",
        },
      ],
      chests: [],
      enemies: [],
    },
    milerea: {
      name: "パンの国ミレリア",
      tiles: milerea(),
      start: [10, 9],
      npcs: [
        {
          id: "mirei",
          x: 10,
          y: 3,
          type: "mirei",
          name: "パン職人の少女",
          special: "mirei",
        },
        {
          id: "mileShop",
          x: 15,
          y: 7,
          type: "merchant",
          name: "ミレリア道具店",
          lines: ["畑に行くなら、毒消し草とハッピーブレッドを持っておいき。"],
          shop: "milerea",
        },
        {
          id: "questBoard",
          x: 4,
          y: 7,
          type: "farmer",
          name: "お願い掲示板",
          special: "questBoard",
        },
        {
          id: "farmer",
          x: 4,
          y: 4,
          type: "farmer",
          name: "麦農家",
          lines: ["東の畑で、麦わらの魔物が作物を踏み荒らしているんだ。"],
        },
        {
          id: "mileChild",
          x: 16,
          y: 6,
          type: "child",
          name: "おなかを空かせた子",
          lines: ["みーぱんのパンを食べるとね、心までふわっとするんだよ。"],
        },
      ],
      chests: [
        {
          id: "mileChest",
          x: 2,
          y: 7,
          item: "antidote",
          amount: 2,
          text: "毒消し草を2個見つけた！",
        },
      ],
      enemies: [],
    },
    wheatfield: {
      name: "陽だまり麦畑",
      tiles: wheatfield(),
      start: [1, 5],
      npcs: [
        {
          id: "fieldSpirit",
          x: 11,
          y: 9,
          type: "wisp",
          name: "麦の精",
          lines: ["三つの陽だまり麦がそろえば、眠っている大窯にも火が戻るよ。"],
        },
      ],
      chests: [
        {
          id: "sunWheat1",
          x: 6,
          y: 2,
          item: "sunwheat",
          amount: 1,
          text: "陽だまり麦を手に入れた！",
        },
        {
          id: "sunWheat2",
          x: 12,
          y: 7,
          item: "sunwheat",
          amount: 1,
          text: "陽だまり麦を手に入れた！",
        },
        {
          id: "sunWheat3",
          x: 17,
          y: 3,
          item: "sunwheat",
          amount: 1,
          text: "陽だまり麦を手に入れた！",
        },
      ],
      enemies: [
        { id: "straw1", x: 5, y: 5, kind: "strawling" },
        { id: "ember1", x: 11, y: 4, kind: "ember" },
        { id: "straw2", x: 15, y: 8, kind: "strawling" },
        { id: "scare1", x: 17, y: 6, kind: "scarecrow" },
      ],
    },
    oven: {
      name: "忘れられた大窯",
      tiles: oven(),
      start: [10, 9],
      npcs: [
        {
          id: "ovenHint",
          x: 9,
          y: 8,
          type: "wisp",
          name: "火種の精",
          lines: [
            "魔窯が赤くふくらんだ次のターンは危険！　防御と回復で備えて。",
            "炎には強いけど、風と光には弱いみたい。",
          ],
        },
      ],
      chests: [
        {
          id: "breadChest",
          x: 3,
          y: 5,
          item: "happyBread",
          amount: 2,
          text: "ハッピーブレッドを2個手に入れた！",
        },
        {
          id: "apronChest",
          x: 16,
          y: 5,
          item: "apron",
          amount: 1,
          text: "装備品「聖火のエプロン」を手に入れた！",
        },
      ],
      enemies: [
        { id: "ovenEmber", x: 7, y: 5, kind: "ember" },
        { id: "ovenScare", x: 13, y: 5, kind: "scarecrow" },
        {
          id: "ovenBoss",
          x: 10,
          y: 1,
          kind: "ovenBoss",
          boss: true,
          story: true,
        },
      ],
    },
    sarinalia: {
      name: "精霊の森サリナリア",
      tiles: sarinalia(),
      start: [10, 9],
      npcs: [
        {
          id: "sarina",
          x: 10,
          y: 3,
          type: "sarina",
          name: "鈴を持つ巫女",
          special: "sarina",
        },
        {
          id: "forestElder",
          x: 4,
          y: 4,
          type: "elder",
          name: "森守の長老",
          lines: [
            "精霊の音は、空色、金色、桃色の順に重なると虹になる。",
            "東の静謐の森で、三つの祭壇に耳を澄ませておくれ。",
          ],
        },
        {
          id: "spiritShop",
          x: 15,
          y: 7,
          type: "merchant",
          name: "木漏れ日の道具屋",
          lines: ["虹雫は、仲間みんなの心を潤す森の薬だよ。"],
          shop: "sarinalia",
        },
        {
          id: "spiritBoard",
          x: 4,
          y: 7,
          type: "wisp",
          name: "迷子精霊の立札",
          special: "spiritBoard",
        },
        {
          id: "forestChild",
          x: 16,
          y: 6,
          type: "child",
          name: "精霊と遊ぶ子",
          lines: [
            "鈴のお姉ちゃんは、声が小さくても精霊の気持ちをちゃんと見つけるんだ。",
          ],
        },
      ],
      chests: [
        {
          id: "sarinaDewChest",
          x: 2,
          y: 7,
          item: "rainbowDew",
          amount: 1,
          text: "虹雫を手に入れた！",
        },
      ],
      enemies: [],
    },
    spiritgrove: {
      name: "静謐の精霊森",
      tiles: spiritGrove(),
      start: [1, 5],
      npcs: [
        {
          id: "altarBlue",
          x: 6,
          y: 2,
          type: "altar_blue",
          name: "空色の祭壇",
          special: "altarBlue",
        },
        {
          id: "altarGold",
          x: 12,
          y: 7,
          type: "altar_gold",
          name: "金色の祭壇",
          special: "altarGold",
        },
        {
          id: "altarPink",
          x: 17,
          y: 3,
          type: "altar_pink",
          name: "桃色の祭壇",
          special: "altarPink",
        },
      ],
      chests: [
        {
          id: "groveDewChest",
          x: 4,
          y: 2,
          item: "rainbowDew",
          amount: 2,
          text: "虹雫を2個見つけた！",
        },
        {
          id: "groveHerbChest",
          x: 15,
          y: 8,
          item: "herb",
          amount: 3,
          text: "薬草を3個見つけた！",
        },
      ],
      enemies: [
        { id: "gloomcap1", x: 5, y: 5, kind: "gloomcap" },
        { id: "hushWisp1", x: 10, y: 4, kind: "hushWisp" },
        { id: "gloomcap2", x: 14, y: 5, kind: "gloomcap" },
        { id: "rootling1", x: 17, y: 7, kind: "rootling" },
      ],
    },
    rootshrine: {
      name: "虹根の古祠",
      tiles: rootShrine(),
      start: [10, 9],
      npcs: [
        {
          id: "rootHint",
          x: 9,
          y: 8,
          type: "wisp",
          name: "虹根の精",
          lines: [
            "虚根の膜は、光の技か必殺技で打ち破れるよ。",
            "静寂にハッピーゲージを奪われる前に、助け合って満たして。",
          ],
        },
      ],
      chests: [
        {
          id: "ribbonChest",
          x: 3,
          y: 5,
          item: "spiritRibbon",
          amount: 1,
          text: "装備品「精霊のリボン」を手に入れた！",
        },
        {
          id: "rootDewChest",
          x: 16,
          y: 5,
          item: "rainbowDew",
          amount: 2,
          text: "虹雫を2個手に入れた！",
        },
      ],
      enemies: [
        { id: "rootWisp", x: 7, y: 5, kind: "hushWisp" },
        { id: "rootGuard", x: 13, y: 5, kind: "rootling" },
        {
          id: "rootBoss",
          x: 10,
          y: 1,
          kind: "rootBoss",
          boss: true,
          story: true,
        },
      ],
    },
  };
  const enemies = {
    slime: {
      name: "しょんぼりスライム",
      hp: 28,
      atk: 7,
      def: 2,
      exp: 16,
      gold: 12,
    },
    bat: { name: "ためいきバット", hp: 38, atk: 10, def: 3, exp: 24, gold: 16 },
    hound: { name: "不安の魔犬", hp: 70, atk: 13, def: 5, exp: 45, gold: 30 },
    armor: { name: "うつろの鎧", hp: 82, atk: 15, def: 8, exp: 55, gold: 35 },
    boss: {
      name: "笑顔喰らい",
      hp: 230,
      atk: 18,
      def: 7,
      exp: 180,
      gold: 100,
      boss: true,
      weak: ["light"],
      resist: ["dark"],
    },
    strawling: {
      name: "くよくよ麦わら",
      hp: 62,
      atk: 15,
      def: 5,
      exp: 42,
      gold: 28,
      weak: ["fire"],
      resist: ["wind"],
    },
    ember: {
      name: "焦げつき火の粉",
      hp: 70,
      atk: 17,
      def: 5,
      exp: 48,
      gold: 32,
      weak: ["wind"],
      resist: ["fire"],
    },
    scarecrow: {
      name: "うつむき案山子",
      hp: 105,
      atk: 19,
      def: 9,
      exp: 70,
      gold: 44,
      weak: ["fire", "light"],
      resist: ["dark"],
    },
    ovenBoss: {
      name: "枯穂の魔窯グルーム",
      hp: 420,
      atk: 24,
      def: 11,
      exp: 330,
      gold: 220,
      boss: true,
      weak: ["wind", "light"],
      resist: ["fire"],
    },
    gloomcap: {
      name: "うつむきキノコ",
      hp: 118,
      atk: 21,
      def: 8,
      exp: 82,
      gold: 52,
      weak: ["fire"],
      resist: ["dark"],
    },
    hushWisp: {
      name: "しじまの鬼火",
      hp: 104,
      atk: 23,
      def: 7,
      exp: 88,
      gold: 56,
      weak: ["light"],
      resist: ["wind"],
    },
    rootling: {
      name: "からまり根っこ",
      hp: 148,
      atk: 25,
      def: 12,
      exp: 105,
      gold: 68,
      weak: ["fire", "wind"],
      resist: ["dark"],
    },
    rootBoss: {
      name: "無響の古根サイレンス",
      hp: 760,
      atk: 30,
      def: 15,
      exp: 560,
      gold: 360,
      boss: true,
      weak: ["light", "fire"],
      resist: ["dark"],
    },
  };
  const intro = [
    [
      "モノローグ",
      "hero",
      "その夜も、あなたは部屋で日向坂46の映像を見ていた。",
      "room",
    ],
    ["画面の向こうの声", "light", "――ハッピーオーラを、もう一度。", "glow"],
    ["主人公", "hero", "え……？　画面が、光って――！", "warp"],
    [
      "？？？",
      "light",
      "欠片を集めて。七つの心が再び出会うとき、道は開かれる……。",
      "warp",
    ],
    [
      "主人公",
      "hero",
      "ここは……どこだ？　スマホもグッズもない。でも「ハッピーオーラ」だけは覚えてる。",
      "meadow",
    ],
  ];
  const meet = [
    [
      "空色の騎士団長",
      "kumi",
      "止まれ。見慣れない服装だな。魔王軍の間者ではないだろうな？",
    ],
    ["主人公", "hero", "あなた……佐々木久美さん、ですよね？　日向坂46の――"],
    [
      "空色の騎士団長",
      "kumi",
      "ササキ・クミ？　知らない名だ。私はこの国の騎士団長だ。",
    ],
    [
      "主人公",
      "hero",
      "その声も、みんなを気にかけるところも……絶対に間違えない。",
    ],
    [
      "騎士団員",
      "guard",
      "団長！　東門の外に魔物が！　住民が取り残されています！",
    ],
    [
      "空色の騎士団長",
      "kumi",
      "全員集合！　あなたも戦えるなら来い。疑いは、その剣で晴らしてもらう！",
    ],
  ];
  const afterRaid = [
    [
      "空色の騎士団長",
      "kumi",
      "助かった。戦いながら周りを励ますなんて、変わった剣士だな。",
    ],
    [
      "主人公",
      "hero",
      "応援するのは得意なんです。ずっと、あなたたちに教えてもらったから。",
    ],
    [
      "空色の騎士団長",
      "kumi",
      "不思議と懐かしい……。北の洞窟から嫌な気配がする。私も同行しよう。",
    ],
    [
      "SYSTEM",
      "light",
      "空色の騎士団長がゲスト加入！　「キャプテンコール」が使えるようになった。",
    ],
  ];
  const bossIntro = [
    [
      "笑顔喰らい",
      "boss",
      "笑顔など、失うから苦しい。期待など、裏切られるだけだ。",
    ],
    [
      "空色の騎士団長",
      "kumi",
      "違う。うまくいかない時こそ、隣にいる仲間の声が聞こえる。",
    ],
    ["主人公", "hero", "久美さん、みんなをまとめるあの言葉を！"],
    ["空色の騎士団長", "kumi", "……全員集合！　ここからが、私たちの本番だ！"],
  ];
  const ending = [
    [
      "空色の騎士団長",
      "kumi",
      "光の中で見えた。空色の衣装、眩しい舞台、隣で笑う仲間たち……。",
    ],
    [
      "佐々木久美",
      "kumi",
      "私は佐々木久美。日向坂46の一期生で、キャプテンだった。",
    ],
    ["主人公", "hero", "おかえりなさい、久美さん。"],
    [
      "佐々木久美",
      "kumi",
      "ただいま。次の欠片は西、パンの国ミレリアにある気がする。",
    ],
    [
      "佐々木久美",
      "kumi",
      "行こう。散り散りになったみんなを、今度は私たちが迎えに行く番だよ！",
    ],
  ];
  const chapter2Intro = [
    [
      "モノローグ",
      "light",
      "一つ目の欠片が示した先は、西の穀倉地帯――パンの国ミレリア。",
      "meadow",
    ],
    [
      "佐々木久美",
      "kumi",
      "この街、パンの香りがしない。人の声も、畑の色も元気がないね。",
    ],
    [
      "主人公",
      "hero",
      "でも、あの工房から少しだけ温かい匂いがします。行ってみましょう。",
    ],
  ];
  const mireiMeet = [
    [
      "パン職人の少女",
      "mirei",
      "ごめんね。今はパンを焼けないの。大窯の火も、小麦の笑顔も消えちゃって……。",
    ],
    ["主人公", "hero", "あなたは……佐々木美玲さん。みーぱん、ですよね？"],
    [
      "パン職人の少女",
      "mirei",
      "みーぱん？　なんだかおいしそうな名前！　でも、私のことなの？",
    ],
    [
      "佐々木久美",
      "kumi",
      "うん。忘れていても分かるよ。その笑顔で、何度もみんなを元気にした。",
    ],
    [
      "パン職人の少女",
      "mirei",
      "……信じたい。東の畑に残った三つの「陽だまり麦」を集めてくれる？",
    ],
    [
      "SYSTEM",
      "light",
      "メインクエスト「三つの陽だまり麦」が始まった！　メニューの「クエスト」で確認できます。",
    ],
  ];
  const mireiBake = [
    [
      "パン職人の少女",
      "mirei",
      "三つとも、まだ温かい……！　これなら、私たちのパンを焼けるよ。",
    ],
    [
      "モノローグ",
      "light",
      "こねる手、仲間へ差し出す笑顔。工房に、焼きたての香りが戻っていく。",
    ],
    [
      "パン職人の少女",
      "mirei",
      "できた！　食べてみて。おなかだけじゃなく、心も元気になるパン！",
    ],
    [
      "佐々木久美",
      "kumi",
      "この味……懐かしい。美玲、やっぱりあなたは私たちの仲間だよ。",
    ],
    [
      "パン職人の少女",
      "mirei",
      "まだ全部は思い出せない。でも、大窯の奥で泣いている声を放っておけない。一緒に行く！",
    ],
    [
      "SYSTEM",
      "light",
      "美玲がゲスト加入！　回復技「焼きたてヒール」と「ハッピーブレッド」が使えます。",
    ],
  ];
  const ovenBossIntro = [
    [
      "枯穂の魔窯グルーム",
      "ovenBoss",
      "期待をふくらませるから、失敗は苦い。すべて焦がせば、落胆することもない。",
    ],
    [
      "パン職人の少女",
      "mirei",
      "失敗したパンだって、次をおいしくする大事な一歩だよ。",
    ],
    [
      "佐々木久美",
      "kumi",
      "赤くふくらんだら大技が来る。声を掛け合って守り抜こう！",
    ],
    ["主人公", "hero", "焼きたての笑顔を、ここで消させない！"],
  ];
  const chapter2Ending = [
    [
      "パン職人の少女",
      "mirei",
      "光の中に……ステージが見える。みんながいて、私、パンの話をして笑ってる。",
    ],
    [
      "佐々木美玲",
      "mirei",
      "思い出した。私は佐々木美玲。日向坂46の一期生――みーぱん！",
    ],
    [
      "主人公",
      "hero",
      "おかえりなさい、美玲さん。焼きたてのハッピーオーラ、届きました。",
    ],
    [
      "佐々木美玲",
      "mirei",
      "ただいま！　今度は私が、みんなのおなかと心を元気にするね。",
    ],
    [
      "佐々木久美",
      "kumi",
      "二つ目の欠片だ。次の光は、精霊の森サリナリアを指している。",
    ],
    [
      "SYSTEM",
      "light",
      "佐々木美玲が正式加入！　ハッピーオーラの欠片は2つになった。",
    ],
  ];
  const chapter3Intro = [
    [
      "モノローグ",
      "light",
      "二つ目の欠片は、南の深緑に虹色の道を描いた――精霊の森サリナリア。",
      "meadow",
    ],
    [
      "佐々木美玲",
      "mirei",
      "パンの香りに、小さな鈴の音が混ざってる。懐かしくて優しい音……。",
    ],
    [
      "佐々木久美",
      "kumi",
      "次の仲間が待ってる。声にならない気持ちも、今度こそ見落とさないよ。",
    ],
    [
      "主人公",
      "hero",
      "精霊の森へ行きましょう。三つ目のハッピーオーラを迎えに。",
    ],
  ];
  const sarinaMeet = [
    [
      "鈴を持つ巫女",
      "sarina",
      "森の精霊たちが、急に言葉を閉ざしたの。聞こえるのは、寂しい胸の音だけ……。",
    ],
    [
      "主人公",
      "hero",
      "あなたは潮紗理菜さん。優しい鈴の音も、きっと忘れていません。",
    ],
    [
      "鈴を持つ巫女",
      "sarina",
      "ウシオ・サリナ……胸の奥で、誰かが『なっちょ』って呼んだ気がする。",
    ],
    [
      "佐々木久美",
      "kumi",
      "紗理菜。全部思い出せなくても大丈夫。私たちが一緒に見つけるから。",
    ],
    [
      "鈴を持つ巫女",
      "sarina",
      "東の静謐の森に三つの祭壇があるの。空色、金色、桃色の順に音を重ねて。",
    ],
    [
      "SYSTEM",
      "light",
      "メインクエスト「三つの精霊音」が始まった！　祭壇を正しい順番で調べよう。",
    ],
  ];
  const sarinaAwaken = [
    [
      "モノローグ",
      "light",
      "三つの音が重なり、森を包む沈黙が虹色の旋律へ変わっていく。",
    ],
    [
      "鈴を持つ巫女",
      "sarina",
      "聞こえる……精霊たちは怖くて黙っていただけ。消えてなんかいなかった。",
    ],
    ["佐々木美玲", "mirei", "小さな声を見つけられるの、やっぱり紗理菜だね。"],
    [
      "鈴を持つ巫女",
      "sarina",
      "北の古祠に、精霊の声を奪った古根がいる。私の鈴も一緒に連れていって。",
    ],
    [
      "SYSTEM",
      "light",
      "紗理菜がゲスト加入！　光の精霊術と「虹色の祈り」が使えるようになった。",
    ],
  ];
  const rootBossIntro = [
    [
      "無響の古根サイレンス",
      "rootBoss",
      "声ハ届カヌ。願イハ誤解ヲ生ム。黙スレバ、傷ツクコトモナイ。",
    ],
    [
      "鈴を持つ巫女",
      "sarina",
      "言葉が足りなくても、そばにいて分かる気持ちはあるよ。",
    ],
    [
      "佐々木久美",
      "kumi",
      "虚根の膜は光で破れる。紗理菜の鈴を守りながら一気に行こう！",
    ],
    [
      "主人公",
      "hero",
      "助け合ってハッピーゲージを満たすんだ。みんなの声を、森へ返す！",
    ],
  ];
  const chapter3Ending = [
    [
      "鈴を持つ巫女",
      "sarina",
      "虹の向こうに、みんなの笑顔が見える。たくさん話して、泣いて、また笑った日々……。",
    ],
    [
      "潮紗理菜",
      "sarina",
      "思い出したよ。私は潮紗理菜。日向坂46の一期生――みんなと歩いてきた仲間。",
    ],
    ["主人公", "hero", "おかえりなさい、紗理菜さん。精霊にも届きました。"],
    [
      "潮紗理菜",
      "sarina",
      "ただいま。言葉にならない気持ちまで、これからも一緒に抱えていこうね。",
    ],
    [
      "佐々木美玲",
      "mirei",
      "三人そろった！　次はみんなで食べられるパン、もっと焼かなくちゃ。",
    ],
    [
      "佐々木久美",
      "kumi",
      "三つ目の欠片だ。次の光は、風車が並ぶ高い街を指してる。",
    ],
    [
      "SYSTEM",
      "light",
      "潮紗理菜が正式加入！　ハッピーオーラの欠片は3つになった。",
    ],
  ];
  const quests = {
    sunwheat: {
      title: "三つの陽だまり麦",
      detail: "陽だまり麦を3つ集めて、美玲の工房へ届ける。",
      reward: "美玲の加入 / ハッピーブレッド",
    },
    straw: {
      title: "麦畑の困りもの",
      detail: "陽だまり麦畑の「くよくよ麦わら」を2体倒す。",
      reward: "80G / 毒消し草×2",
    },
    oven: {
      title: "忘れられた大窯",
      detail: "大窯の最深部で、笑顔を焦がす魔物を倒す。",
      reward: "ハッピーオーラの欠片",
    },
    spiritTones: {
      title: "三つの精霊音",
      detail: "静謐の精霊森で、空色・金色・桃色の祭壇を順に鳴らす。",
      reward: "紗理菜の加入 / 虹根の古祠の開放",
    },
    forestShadows: {
      title: "迷子精霊の帰り道",
      detail: "森を塞ぐ「うつむきキノコ」を2体倒す。",
      reward: "120G / 虹雫×2",
    },
    silentRoot: {
      title: "虹根の古祠",
      detail: "古祠の最深部で、精霊の声を奪う古根を倒す。",
      reward: "ハッピーオーラの欠片",
    },
  };
  return {
    TILE,
    maps,
    enemies,
    quests,
    intro,
    meet,
    afterRaid,
    bossIntro,
    ending,
    chapter2Intro,
    mireiMeet,
    mireiBake,
    ovenBossIntro,
    chapter2Ending,
    chapter3Intro,
    sarinaMeet,
    sarinaAwaken,
    rootBossIntro,
    chapter3Ending,
  };
})();
