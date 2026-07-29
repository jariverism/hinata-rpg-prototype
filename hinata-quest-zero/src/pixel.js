import { TILE } from "./data.js";
import {
  ENEMY_SPRITE_IDS,
  NPC_SPRITE_IDS,
  PARTY_SPRITE_IDS,
  rowMap,
} from "./art-manifest.js";

const TWO_PI = Math.PI * 2;
const FIELD_SPRITE_SOURCE = 64;
const PARTY_ROWS = rowMap(PARTY_SPRITE_IDS);
const NPC_ROWS = rowMap(NPC_SPRITE_IDS);
const ENEMY_CELLS = rowMap(ENEMY_SPRITE_IDS);
const DIRECTION_COLUMNS = Object.freeze({
  down: 0,
  left: 1,
  right: 2,
  up: 3,
});
const ART_URLS = Object.freeze({
  title: new URL("../assets/art/title-hinatia.png", import.meta.url).href,
  party: `${new URL("../assets/art/party-sprites.png", import.meta.url).href}?v=12`,
  npc: `${new URL("../assets/art/npc-sprites.png", import.meta.url).href}?v=12`,
  enemies: new URL("../assets/art/enemy-atlas.png", import.meta.url).href,
  "portrait-hero": new URL("../assets/art/portraits/hero.png", import.meta.url).href,
  "portrait-kumi": new URL("../assets/art/portraits/kumi.png", import.meta.url).href,
  "portrait-mirei": new URL("../assets/art/portraits/mirei.png", import.meta.url).href,
  "portrait-sarina": new URL("../assets/art/portraits/sarina.png", import.meta.url).href,
  "portrait-katoshi": new URL("../assets/art/portraits/katoshi.png", import.meta.url).href,
  "portrait-manaka": new URL("../assets/art/portraits/manaka.png", import.meta.url).href,
  "cutin-hero": new URL("../assets/art/cutins/hero.png", import.meta.url).href,
  "cutin-kumi": new URL("../assets/art/cutins/kumi.png", import.meta.url).href,
  "cutin-mirei": new URL("../assets/art/cutins/mirei.png", import.meta.url).href,
  "cutin-sarina": new URL("../assets/art/cutins/sarina.png", import.meta.url).href,
  "cutin-katoshi": new URL("../assets/art/cutins/katoshi.png", import.meta.url).href,
  "cutin-manaka": new URL("../assets/art/cutins/manaka.png", import.meta.url).href,
});

export class PixelRenderer {
  constructor(
    canvas,
    {
      alpha = false,
      logicalWidth = canvas.width,
      logicalHeight = canvas.height,
    } = {},
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha });
    this.width = logicalWidth;
    this.height = logicalHeight;
    this.pixelDensity = Math.max(
      1,
      Math.min(canvas.width / logicalWidth, canvas.height / logicalHeight),
    );
    this.ctx.setTransform?.(this.pixelDensity, 0, 0, this.pixelDensity, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.assets = {};
    const ImageClass = globalThis.Image;
    if (ImageClass) {
      for (const [id, url] of Object.entries(ART_URLS)) {
        const image = new ImageClass();
        image.decoding = "async";
        image.src = url;
        this.assets[id] = image;
      }
    }
  }

  assetReady(id) {
    const image = this.assets[id];
    return Boolean(image && image.complete && (image.naturalWidth || image.width));
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  microRect(x, y, w, h, color) {
    const unit = 1 / this.pixelDensity;
    const snap = (value) => Math.round(value / unit) * unit;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      snap(x),
      snap(y),
      Math.max(unit, snap(w)),
      Math.max(unit, snap(h)),
    );
  }

  outline(x, y, w, h, fill, stroke = "#071426", size = 2) {
    this.rect(x - size, y - size, w + size * 2, h + size * 2, stroke);
    this.rect(x, y, w, h, fill);
  }

  text(text, x, y, color = "#fff", size = 12, align = "left") {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `700 ${size}px "DotGothic16", "Noto Sans JP", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#06101f";
    ctx.fillText(text, Math.round(x + 1), Math.round(y + 2));
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }

  clear(color = "#071426") {
    this.rect(0, 0, this.width, this.height, color);
  }

  drawTitle(now = 0) {
    const ctx = this.ctx;
    if (this.assetReady("title")) {
      ctx.drawImage(this.assets.title, 0, 0, this.width, this.height);
      const shade = ctx.createLinearGradient(0, 0, 0, this.height);
      shade.addColorStop(0, "rgba(2,10,24,.48)");
      shade.addColorStop(0.34, "rgba(4,18,38,.08)");
      shade.addColorStop(0.72, "rgba(3,13,27,.04)");
      shade.addColorStop(1, "rgba(2,9,20,.56)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, this.width, this.height);
      for (let i = 0; i < 18; i += 1) {
        const x = (i * 89 + Math.floor(now / 55)) % 700 - 30;
        const y = 72 + ((i * 47) % 185);
        const size = i % 4 === 0 ? 2 : 1;
        this.rect(x, y, size, size, i % 3 ? "rgba(216,247,255,.8)" : "rgba(255,224,133,.8)");
      }
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, "#06152d");
    g.addColorStop(0.45, "#164875");
    g.addColorStop(0.72, "#62b9d9");
    g.addColorStop(1, "#f4d187");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 58; i += 1) {
      const x = (i * 97 + 31) % this.width;
      const y = (i * 43 + 17) % 185;
      const pulse = (Math.floor(now / 400) + i) % 4 === 0 ? 2 : 1;
      this.rect(x, y, pulse, pulse, i % 5 ? "#bcecff" : "#ffe9a8");
    }

    this.mountain(0, 175, 180, "#245a72", "#173e59");
    this.mountain(112, 146, 260, "#326d83", "#1d5069");
    this.mountain(344, 170, 220, "#23586f", "#173e59");
    this.mountain(500, 150, 170, "#316b82", "#1a4a64");
    this.rect(0, 252, 640, 108, "#153f47");
    this.rect(0, 266, 640, 94, "#1d584f");
    for (let x = 0; x < 640; x += 18) {
      this.rect(x, 264 + ((x / 18) % 3) * 3, 12, 2, "#72b97a");
      this.rect(x + 6, 278 + ((x / 18) % 5) * 4, 2, 5, "#498e63");
    }
    this.castle(292, 174, 2);

    const glow = 0.55 + Math.sin(now / 700) * 0.18;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = "#dffbff";
    ctx.beginPath();
    ctx.arc(320, 106, 48, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(320, 106, 72, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  mountain(x, y, w, color, shadow) {
    const ctx = this.ctx;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.moveTo(x, 260);
    ctx.lineTo(x + w * 0.55, y);
    ctx.lineTo(x + w, 260);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, 260);
    ctx.lineTo(x + w * 0.55, y + 12);
    ctx.lineTo(x + w * 0.66, 260);
    ctx.fill();
    this.rect(x + w * 0.52, y + 18, 9, 5, "#b7e0df");
    this.rect(x + w * 0.55, y + 23, 10, 4, "#dcecd9");
  }

  castle(x, y, scale = 1) {
    const s = scale;
    this.rect(x - 20 * s, y + 28 * s, 40 * s, 33 * s, "#132b46");
    this.rect(x - 30 * s, y + 38 * s, 14 * s, 23 * s, "#10253f");
    this.rect(x + 16 * s, y + 38 * s, 14 * s, 23 * s, "#10253f");
    this.rect(x - 16 * s, y + 13 * s, 32 * s, 17 * s, "#d4d5ce");
    this.rect(x - 23 * s, y + 25 * s, 9 * s, 18 * s, "#a9b5b6");
    this.rect(x + 14 * s, y + 25 * s, 9 * s, 18 * s, "#a9b5b6");
    this.rect(x - 12 * s, y + 5 * s, 24 * s, 9 * s, "#4aa9d2");
    this.rect(x - 8 * s, y, 16 * s, 6 * s, "#7bd5ec");
    this.rect(x - 2 * s, y + 35 * s, 5 * s, 8 * s, "#f8d36a");
  }

  drawTile(type, sx, sy, wx, wy, now = 0, tone = "field", neighbors = null) {
    const x = Math.floor(sx);
    const y = Math.floor(sy);
    const phase = Math.floor(now / 450 + wx + wy) % 4;
    const family =
      tone.includes("harvest") || tone.includes("granary")
        ? "harvest"
        : tone.includes("spirit")
          ? "spirit"
          : tone.includes("mana")
            ? "arcane"
          : tone.includes("wind") || tone === "arena"
            ? "wind"
            : tone.toLowerCase().includes("cave") || tone === "dungeon"
              ? "cave"
              : "sky";
    const palettes = {
      sky: {
        grass: "#459f6c", grassAlt: "#3f9665", grassDark: "#247451", grassLight: "#73c786",
        path: "#c6a36d", pathDark: "#927049", pathLight: "#e1c58f",
        tree: "#2c7f53", treeDark: "#1d5f43", treeLight: "#5cad70",
        water: "#287ca6", waterDark: "#195b84", waterLight: "#62bed3",
        stone: "#69727c", stoneDark: "#414b57", stoneLight: "#929ba0",
        roof: "#346f99", roofDark: "#1c4b74", roofLight: "#5fa0c1",
      },
      harvest: {
        grass: "#83974d", grassAlt: "#788c47", grassDark: "#536b37", grassLight: "#b4b960",
        path: "#cfaf6e", pathDark: "#9d7747", pathLight: "#eed292",
        tree: "#638447", treeDark: "#3f6338", treeLight: "#91aa5d",
        water: "#4e8f9b", waterDark: "#316d7b", waterLight: "#88c6c4",
        stone: "#817665", stoneDark: "#5c5145", stoneLight: "#aa9c7e",
        roof: "#9b6b43", roofDark: "#6c442f", roofLight: "#d09a5b",
      },
      spirit: {
        grass: "#2f8268", grassAlt: "#28775f", grassDark: "#185b50", grassLight: "#63b994",
        path: "#77947f", pathDark: "#526e65", pathLight: "#acc1a1",
        tree: "#206d5b", treeDark: "#174d48", treeLight: "#51aa83",
        water: "#2c8296", waterDark: "#1b5f77", waterLight: "#65cfcc",
        stone: "#5b7475", stoneDark: "#364f57", stoneLight: "#8aa29a",
        roof: "#477d73", roofDark: "#2c5b5b", roofLight: "#77b29b",
      },
      wind: {
        grass: "#4c9381", grassAlt: "#428777", grassDark: "#2a6570", grassLight: "#82c5a8",
        path: "#a8a68c", pathDark: "#74776f", pathLight: "#d8d3b5",
        tree: "#367765", treeDark: "#28576a", treeLight: "#6ba994",
        water: "#3d87ad", waterDark: "#285f8b", waterLight: "#83c9dc",
        stone: "#687987", stoneDark: "#3d5265", stoneLight: "#9bb0b5",
        roof: "#4b82a1", roofDark: "#2f5d82", roofLight: "#83b9ca",
      },
      arcane: {
        grass: "#3d837b", grassAlt: "#35756f", grassDark: "#21585e", grassLight: "#73b9a5",
        path: "#9389a8", pathDark: "#625a78", pathLight: "#cfc4df",
        tree: "#315f62", treeDark: "#233e4f", treeLight: "#648f85",
        water: "#315f98", waterDark: "#283f75", waterLight: "#71b8cc",
        stone: "#62647b", stoneDark: "#3d4058", stoneLight: "#9a97b1",
        roof: "#5c5590", roofDark: "#393860", roofLight: "#9288bd",
      },
      cave: {
        grass: "#4b7258", grassAlt: "#42664f", grassDark: "#294a3d", grassLight: "#729078",
        path: "#776d61", pathDark: "#4d4845", pathLight: "#9b9080",
        tree: "#385b4a", treeDark: "#293f3d", treeLight: "#5f8069",
        water: "#315f7c", waterDark: "#213e62", waterLight: "#568ca1",
        stone: "#4e5c69", stoneDark: "#293744", stoneLight: "#78838b",
        roof: "#41576a", roofDark: "#283b50", roofLight: "#688096",
      },
    };
    const palette = palettes[family];
    const variant = Math.abs((wx * 17 + wy * 31) % 5);
    switch (type) {
      case TILE.GRASS:
        this.rect(x, y, 32, 32, (wx + wy) % 2 ? palette.grassAlt : palette.grass);
        this.rect(x + 5 + ((wx * 7) % 16), y + 7 + ((wy * 5) % 13), 2, 5, palette.grassDark);
        this.rect(x + 20, y + 22, 5, 2, palette.grassLight);
        this.rect(x + 21, y + 19, 1, 4, palette.grassDark);
        if (variant === 0) {
          const accent = family === "harvest" ? "#f0cd65" : family === "spirit" ? "#9ee7cc" : family === "wind" ? "#d9eff0" : "#a5db86";
          this.rect(x + 9, y + 24, 2, 2, accent);
          this.rect(x + 11, y + 22, 2, 2, accent);
        }
        break;
      case TILE.PATH:
        this.rect(x, y, 32, 32, palette.path);
        this.rect(x + ((wx * 11) % 24), y + ((wy * 7) % 24), 5, 2, palette.pathDark);
        this.rect(x + 17, y + 24, 3, 2, palette.pathLight);
        if (variant === 1) this.rect(x + 6, y + 15, 8, 1, palette.pathLight);
        break;
      case TILE.TREE:
      case TILE.ROOT:
        this.rect(x, y, 32, 32, type === TILE.ROOT ? palette.treeDark : palette.tree);
        this.rect(x + 13, y + 20, 7, 12, "#69492f");
        this.rect(x + 3, y + 6, 26, 19, palette.treeDark);
        this.rect(x + 7, y + 2, 18, 22, palette.tree);
        this.rect(x + 12, y + 5, 8, 6, palette.treeLight);
        this.rect(x + 2, y + 18, 5, 6, palette.grassDark);
        this.rect(x + 22, y + 10, 4, 4, palette.treeLight);
        break;
      case TILE.WATER:
      case TILE.REEDS:
        this.rect(x, y, 32, 32, palette.water);
        this.rect(x, y + 7 + phase, 15, 2, palette.waterLight);
        this.rect(x + 17, y + 21 - phase, 11, 2, palette.waterDark);
        this.rect(x + 5, y + 27 - phase, 8, 1, palette.waterLight);
        if (type === TILE.REEDS) {
          this.rect(x + 4, y + 11, 2, 17, "#477a48");
          this.rect(x + 8, y + 15, 2, 15, "#6e9b57");
          this.rect(x + 24, y + 9, 2, 18, "#477a48");
        }
        break;
      case TILE.BRIDGE:
        this.rect(x, y, 32, 32, "#704a34");
        for (let yy = 1; yy < 32; yy += 7) {
          this.rect(x + 2, y + yy, 28, 5, "#b2774b");
          this.rect(x + 4, y + yy, 2, 5, "#d19861");
        }
        this.rect(x, y, 3, 32, "#382b2c");
        this.rect(x + 29, y, 3, 32, "#382b2c");
        break;
      case TILE.STONE:
        this.rect(x, y, 32, 32, variant === 4 ? palette.stoneDark : palette.stone);
        this.rect(x, y + 15, 32, 2, palette.stoneDark);
        this.rect(x + ((wy % 2) ? 7 : 17), y, 2, 15, palette.stoneDark);
        this.rect(x + ((wy % 2) ? 23 : 9), y + 17, 2, 15, palette.stoneDark);
        this.rect(x + 2, y + 2, 12, 2, palette.stoneLight);
        this.rect(x + 18, y + 19, 9, 1, palette.stoneLight);
        if (family === "wind") {
          this.rect(x + 3, y + 5, 2, 6, "#b7c8c6");
          this.rect(x + 27, y + 21, 2, 6, "#4c6877");
        } else if (variant === 2) {
          this.rect(x + 18, y + 9, 5, 1, palette.stoneLight);
        }
        break;
      case TILE.FLOOR:
        this.rect(x, y, 32, 32, family === "spirit" ? "#839c8c" : family === "wind" ? "#92a3a6" : "#b7b1a2");
        this.rect(x, y + 30, 32, 2, palette.stoneDark);
        this.rect(x + 30, y, 2, 32, palette.stoneDark);
        this.rect(x + 4, y + 4, 3, 2, palette.stoneLight);
        break;
      case TILE.WALL:
        this.rect(
          x,
          y,
          32,
          32,
          family === "spirit"
            ? "#304e50"
            : family === "wind"
              ? "#465e70"
              : family === "harvest"
                ? "#574a3d"
                : "#303946",
        );
        this.rect(x, y + 15, 32, 3, palette.stoneDark);
        this.rect(x + ((wy % 2) ? 7 : 21), y, 3, 15, "#1e2936");
        this.rect(x + ((wy % 2) ? 21 : 7), y + 18, 3, 14, "#1e2936");
        this.rect(x + 3, y + 3, 10, 3, palette.stoneLight);
        if (family === "harvest") {
          this.rect(x + 2, y + 13, 28, 3, "#6c4a31");
          this.rect(x + 14, y, 3, 32, "#755034");
        } else if (family === "spirit") {
          this.rect(x + 25, y + 4, 2, 13, "#4b8b70");
          this.rect(x + 22, y + 9, 6, 2, "#71b78b");
        } else if (family === "wind") {
          this.rect(x + 3, y + 3, 26, 2, "#7f9ba5");
          this.rect(x + 4, y + 20, 2, 8, "#85a4ac");
        }
        break;
      case TILE.CAVE:
        this.rect(x, y, 32, 32, "#42515d");
        this.rect(x + 2, y + 5, 28, 27, "#141b27");
        this.rect(x + 7, y + 9, 18, 23, "#050b14");
        this.rect(x + 2, y + 4, 5, 6, "#75808a");
        this.rect(x + 25, y + 8, 5, 9, "#303d49");
        break;
      case TILE.CRYSTAL:
        this.rect(x, y, 32, 32, "#374957");
        this.rect(x + 12, y + 6, 8, 22, "#55bfe1");
        this.rect(x + 15, y + 3, 4, 22, "#a4f2ff");
        this.rect(x + 9, y + 15, 4, 13, "#3189b0");
        this.rect(x + 20, y + 12, 4, 16, "#28779f");
        break;
      case TILE.FLOWER:
        this.rect(
          x,
          y,
          32,
          32,
          family === "harvest" ? "#786d40" : palette.grass,
        );
        if (family === "harvest") {
          this.rect(x + 2, y + 2, 28, 28, "#78894a");
          for (const xx of [7, 16, 25]) {
            this.rect(x + xx, y + 13, 2, 13, palette.grassDark);
            this.rect(x + xx - 3, y + 10, 5, 5, "#f3c766");
            this.rect(x + xx + 1, y + 8, 4, 6, "#f6dea0");
          }
        } else {
          this.rect(x + 15, y + 14, 2, 13, palette.grassDark);
          this.rect(x + 11, y + 11, 6, 5, family === "spirit" ? "#bcffe5" : "#f6d9ec");
          this.rect(x + 16, y + 9, 6, 6, family === "spirit" ? "#77e1ca" : "#f4a9cf");
          this.rect(x + 15, y + 12, 4, 4, "#ffe078");
          if (family === "spirit") {
            this.rect(x + 6, y + 21, 3, 3, "#8ff2d5");
            this.rect(x + 24, y + 6, 2, 2, "#d9fff0");
          }
        }
        break;
      case TILE.ROOF:
        this.rect(x, y, 32, 32, palette.roof);
        for (let yy = 3; yy < 32; yy += 8) {
          this.rect(x, y + yy, 32, 3, palette.roofDark);
          const shingleOffset = ((wy * 4 + Math.floor(yy / 8)) % 2) * 8;
          this.rect(x + shingleOffset, y + yy - 3, 13, 3, palette.roofLight);
          this.rect(x + shingleOffset + 16, y + yy - 3, 13, 3, palette.roofLight);
        }
        if (family === "wind" && variant === 1)
          this.rect(x + 13, y + 8, 6, 11, "#9dd8dd");
        if (family === "harvest" && variant === 3)
          this.rect(x + 5, y + 20, 7, 2, "#efbd66");
        break;
      case TILE.MUD:
        this.rect(x, y, 32, 32, "#705e46");
        this.rect(x + 5, y + 8, 8, 3, "#574a3a");
        this.rect(x + 19, y + 21, 7, 2, "#8e7653");
        break;
      case TILE.DOOR:
        this.rect(x, y, 32, 32, "#5b3f35");
        this.rect(x + 5, y + 2, 22, 30, "#8b5a3c");
        this.rect(x + 8, y + 5, 16, 25, "#6e4738");
        this.rect(x + 20, y + 18, 3, 3, "#f3c75f");
        break;
      case TILE.ROCK:
        this.rect(x, y, 32, 32, palette.grassAlt);
        this.rect(x + 4, y + 10, 24, 19, palette.stone);
        this.rect(x + 8, y + 6, 15, 8, palette.stoneLight);
        this.rect(x + 5, y + 24, 22, 5, palette.stoneDark);
        break;
      case TILE.MOSS:
        this.rect(x, y, 32, 32, palette.treeDark);
        this.rect(x + 4, y + 6, 5, 3, palette.treeLight);
        this.rect(x + 17, y + 18, 10, 3, palette.grassDark);
        this.rect(x + 22, y + 5, 3, 6, palette.grassLight);
        break;
      case TILE.STAIRS:
        this.rect(x, y, 32, 32, "#4b5662");
        for (let i = 0; i < 5; i += 1) {
          this.rect(x + 4 + i * 2, y + 5 + i * 5, 24 - i * 4, 3, "#9a9c98");
          this.rect(x + 4 + i * 2, y + 8 + i * 5, 24 - i * 4, 2, "#303a45");
        }
        break;
      case TILE.SAND:
        this.rect(x, y, 32, 32, family === "wind" ? "#c8bd8c" : "#d3bb77");
        this.rect(x + 5, y + 8, 2, 2, palette.pathDark);
        this.rect(x + 21, y + 22, 5, 2, palette.pathLight);
        break;
      case TILE.WOOD:
        this.rect(x, y, 32, 32, "#8a633e");
        for (let xx = 0; xx < 32; xx += 8) this.rect(x + xx, y, 2, 32, "#59452f");
        this.rect(x, y + 15, 32, 2, "#bb8550");
        break;
      case TILE.RUIN:
        this.rect(x, y, 32, 32, "#497c5e");
        this.rect(x + 4, y + 9, 24, 19, "#797b72");
        this.rect(x + 8, y + 5, 14, 6, "#9b9d8d");
        this.rect(x + 13, y + 14, 7, 14, "#242f37");
        this.rect(x + 2, y + 25, 28, 3, "#315b4a");
        break;
      case TILE.LANTERN:
        this.rect(x, y, 32, 32, "#5c6267");
        this.rect(x + 14, y + 8, 4, 24, "#312e32");
        this.rect(x + 9, y + 5, 14, 12, "#f1a844");
        this.rect(x + 12, y + 8, 8, 7, "#ffeaa0");
        break;
      case TILE.PILLAR:
        this.rect(x, y, 32, 32, palette.stone);
        this.rect(x + 5, y + 2, 22, 5, palette.stoneLight);
        this.rect(x + 9, y + 7, 14, 21, family === "wind" ? "#879da6" : "#8e9ca1");
        this.rect(x + 5, y + 27, 22, 5, palette.stoneDark);
        break;
      case TILE.CLIFF:
        this.rect(x, y, 32, 32, family === "arcane" ? "#34465d" : palette.stoneDark);
        this.rect(x, y, 32, 6, palette.stoneLight);
        this.rect(x, y + 6, 32, 4, palette.stone);
        this.rect(x + 3, y + 11, 11, 21, "#29384b");
        this.rect(x + 17, y + 10, 12, 22, "#202f43");
        this.rect(x + 6, y + 14, 3, 14, palette.stone);
        this.rect(x + 21, y + 12, 2, 17, palette.stoneLight);
        break;
      case TILE.RUNE: {
        const pulse = Math.floor(now / 220 + wx + wy) % 3;
        this.rect(x, y, 32, 32, family === "arcane" ? "#555773" : palette.stone);
        this.rect(x + 2, y + 2, 28, 28, palette.stoneDark);
        this.rect(x + 5, y + 5, 22, 22, family === "arcane" ? "#4f5071" : palette.stone);
        const glow = pulse === 0 ? "#f6d977" : pulse === 1 ? "#8ae1df" : "#b6a7ee";
        this.rect(x + 14, y + 7, 4, 18, glow);
        this.rect(x + 8, y + 14, 16, 4, glow);
        this.rect(x + 10, y + 10, 4, 4, "#eefcff");
        this.rect(x + 19, y + 19, 4, 4, "#eefcff");
        break;
      }
      case TILE.BOOKSHELF:
        this.rect(x, y, 32, 32, "#332d46");
        this.rect(x + 2, y + 2, 28, 29, "#6b4e55");
        for (let shelf = 0; shelf < 2; shelf += 1) {
          const yy = y + 5 + shelf * 13;
          this.rect(x + 4, yy, 24, 10, "#281f31");
          for (let book = 0; book < 5; book += 1) {
            const colors = ["#6e87ac", "#a05f76", "#c49d57", "#5e9a8c", "#8268a4"];
            const height = 6 + ((wx + wy + book + shelf) % 4);
            this.rect(x + 5 + book * 5, yy + 9 - height, 4, height, colors[(book + shelf) % colors.length]);
            this.rect(x + 6 + book * 5, yy + 10 - height, 1, height - 2, "#d7c985");
          }
        }
        this.rect(x, y + 29, 32, 3, "#211c2c");
        break;
      case TILE.GLASS:
        this.rect(x, y, 32, 32, "#2b344c");
        this.rect(x + 3, y + 3, 26, 26, "#477e9a");
        this.rect(x + 6, y + 6, 20, 20, "#75b8c6");
        this.rect(x + 8, y + 7, 5, 15, "#d9f7ef");
        this.rect(x + 15, y + 6, 2, 20, "#394c73");
        this.rect(x + 6, y + 15, 20, 2, "#394c73");
        this.rect(x + 21, y + 20, 4, 4, "#c4adf0");
        break;
      case TILE.VOID:
      default:
        this.rect(x, y, 32, 32, "#080c14");
        break;
    }
    this.drawTileHighDensity(type, x, y, wx, wy, now, palette, family);
    if (neighbors)
      this.drawTileEdges(type, x, y, wx, wy, neighbors, palette, family);
  }

  drawTileHighDensity(type, x, y, wx, wy, now, palette, family) {
    if (this.pixelDensity < 2) return;
    const dot = (xx, yy, width, height, color) =>
      this.microRect(x + xx, y + yy, width, height, color);
    const seed = Math.abs(wx * 41 + wy * 67);
    const sx = (seed % 23) + 3.5;
    const sy = ((seed * 7) % 21) + 4.5;

    if ([TILE.GRASS, TILE.MOSS, TILE.FLOWER].includes(type)) {
      dot(sx, sy, 0.5, 2.5, palette.grassDark);
      dot(sx + 0.5, sy - 1, 0.5, 1.5, palette.grassLight);
      dot((sx + 11) % 27 + 2, (sy + 13) % 25 + 3, 2.5, 0.5, palette.grassLight);
      dot((sx + 17) % 28 + 1, (sy + 6) % 25 + 3, 0.5, 0.5, family === "arcane" ? "#c9b9f2" : "#d7f3bd");
    } else if ([TILE.PATH, TILE.SAND, TILE.MUD].includes(type)) {
      dot(sx, sy, 2, 0.5, palette.pathLight);
      dot((sx + 12) % 26 + 2, (sy + 9) % 25 + 3, 0.5, 1.5, palette.pathDark);
      dot((sx + 19) % 27 + 2, (sy + 16) % 26 + 2, 1, 0.5, palette.pathDark);
      if (seed % 3 === 0) dot(13.5, 8.5, 4, 0.5, "rgba(237,230,211,.28)");
    } else if ([TILE.STONE, TILE.FLOOR, TILE.WALL, TILE.CLIFF, TILE.PILLAR].includes(type)) {
      dot(sx, sy, 3.5, 0.5, palette.stoneLight);
      dot(sx + 3, sy + 0.5, 0.5, 2, palette.stoneDark);
      dot((sx + 14) % 26 + 2, (sy + 12) % 25 + 3, 1.5, 0.5, palette.stoneDark);
      dot((sx + 4) % 27 + 2, (sy + 19) % 26 + 2, 0.5, 0.5, family === "arcane" ? "#aaa6cc" : palette.stoneLight);
    } else if ([TILE.WATER, TILE.REEDS].includes(type)) {
      const drift = Math.floor(now / 180 + wx + wy) % 4;
      dot(3.5 + drift, 5.5 + (seed % 7), 7.5, 0.5, palette.waterLight);
      dot(18.5 - drift, 16.5 + (seed % 5), 5, 0.5, "rgba(215,250,255,.65)");
      dot(10.5 + drift, 28.5, 3.5, 0.5, palette.waterDark);
    } else if ([TILE.TREE, TILE.ROOT].includes(type)) {
      dot(sx, sy, 1.5, 0.5, palette.treeLight);
      dot((sx + 9) % 24 + 4, (sy + 8) % 18 + 3, 0.5, 2, palette.treeDark);
      dot(14.5, 23.5, 0.5, 6, "#9a6b42");
      dot(18.5, 25.5, 0.5, 3, "#4d3729");
    } else if ([TILE.ROOF, TILE.WOOD, TILE.BRIDGE, TILE.DOOR].includes(type)) {
      dot(sx, sy, 5, 0.5, family === "arcane" ? "#aaa0cd" : "#d39b63");
      dot(sx + 5, sy, 0.5, 1, "#49362e");
      dot((sx + 15) % 26 + 2, (sy + 14) % 25 + 3, 0.5, 0.5, "#f0c77d");
    } else if (type === TILE.BOOKSHELF) {
      for (let shelf = 0; shelf < 2; shelf += 1) {
        const yy = 7.5 + shelf * 13;
        dot(6.5 + (seed % 4) * 5, yy, 0.5, 5.5, "#f2dd93");
        dot(8, yy + 1, 0.5, 0.5, "#fff4c4");
        dot(21.5, yy + 5, 4, 0.5, "#b58ec2");
      }
    } else if ([TILE.GLASS, TILE.CRYSTAL, TILE.RUNE, TILE.LANTERN].includes(type)) {
      const pulse = 0.55 + Math.sin(now / 260 + seed) * 0.25;
      this.ctx.save();
      this.ctx.globalAlpha = pulse;
      dot(9.5, 7.5, 0.5, 9, "#f4ffff");
      dot(10, 7.5, 3.5, 0.5, "#f4ffff");
      dot(22.5, 20.5, 1, 0.5, family === "arcane" ? "#d6c4ff" : "#a9efff");
      this.ctx.restore();
    } else if ([TILE.CAVE, TILE.ROCK, TILE.RUIN, TILE.STAIRS].includes(type)) {
      dot(sx, sy, 3, 0.5, palette.stoneLight);
      dot(sx + 2.5, sy + 0.5, 0.5, 2.5, palette.stoneDark);
      dot((sx + 13) % 26 + 2, (sy + 17) % 25 + 3, 0.5, 0.5, "#c1c5bb");
    }
  }

  drawTileEdges(type, x, y, wx, wy, neighbors, palette, family) {
    const same = (direction, accepted) => accepted.includes(neighbors[direction]);
    const directions = [
      ["up", 0, 0, 32, 2],
      ["down", 0, 30, 32, 2],
      ["left", 0, 0, 2, 32],
      ["right", 30, 0, 2, 32],
    ];
    if (type === TILE.PATH || type === TILE.SAND) {
      const joined = [TILE.PATH, TILE.SAND, TILE.BRIDGE, TILE.DOOR, TILE.STAIRS, TILE.RUNE];
      for (const [direction, xx, yy, width, height] of directions) {
        if (same(direction, joined)) continue;
        this.rect(x + xx, y + yy, width, height, palette.pathDark);
        const insetX = direction === "left" ? 2 : direction === "right" ? 29 : 0;
        const insetY = direction === "up" ? 2 : direction === "down" ? 29 : 0;
        const insetWidth = direction === "left" || direction === "right" ? 1 : 32;
        const insetHeight = direction === "up" || direction === "down" ? 1 : 32;
        this.rect(
          x + insetX,
          y + insetY,
          insetWidth,
          insetHeight,
          palette.pathLight,
        );
      }
    }
    if (type === TILE.WATER || type === TILE.REEDS) {
      const joined = [TILE.WATER, TILE.REEDS, TILE.BRIDGE];
      for (const [direction, xx, yy, width, height] of directions) {
        if (same(direction, joined)) continue;
        this.rect(x + xx, y + yy, width, height, palette.waterLight);
        if (direction === "down")
          this.rect(x + 3, y + 28, 26, 1, "rgba(229,250,237,.7)");
      }
    }
    if (type === TILE.ROOF) {
      if (!same("up", [TILE.ROOF])) {
        this.rect(x, y, 32, 3, palette.roofLight);
        this.rect(x, y + 3, 32, 2, palette.roofDark);
      }
      if (!same("down", [TILE.ROOF])) {
        this.rect(x, y + 26, 32, 6, palette.roofDark);
        this.rect(x, y + 26, 32, 2, palette.roofLight);
        this.rect(x + 5, y + 29, 4, 3, family === "harvest" ? "#f0c36b" : "#152e4b");
        this.rect(x + 23, y + 29, 4, 3, family === "harvest" ? "#f0c36b" : "#152e4b");
      }
      if (!same("left", [TILE.ROOF])) this.rect(x, y + 2, 3, 28, palette.roofDark);
      if (!same("right", [TILE.ROOF])) this.rect(x + 29, y + 2, 3, 28, palette.roofDark);
      if (
        neighbors.down === TILE.WALL &&
        Math.abs((wx * 7 + wy * 3) % 5) === 1
      ) {
        const dormerDark =
          family === "harvest" ? "#5e3b2d" : family === "spirit" ? "#183e46" : "#19364e";
        const dormerGlass =
          family === "harvest" ? "#ffd477" : family === "spirit" ? "#a4f7d8" : "#aee8ed";
        this.rect(x + 8, y + 10, 16, 15, dormerDark);
        this.rect(x + 11, y + 13, 10, 9, dormerGlass);
        this.rect(x + 15, y + 13, 2, 9, "#f7efd2");
        this.rect(x + 6, y + 9, 20, 3, palette.roofLight);
      }
    }
    if (type === TILE.WALL) {
      if (!same("up", [TILE.WALL, TILE.ROOF]))
        this.rect(x, y, 32, 3, palette.stoneLight);
      if (!same("down", [TILE.WALL, TILE.DOOR])) {
        this.rect(x, y + 27, 32, 5, palette.stoneDark);
        this.rect(x, y + 27, 32, 1, palette.stoneLight);
      }
      if (!same("left", [TILE.WALL, TILE.DOOR]))
        this.rect(x, y + 2, 2, 28, palette.stoneLight);
      if (!same("right", [TILE.WALL, TILE.DOOR]))
        this.rect(x + 30, y + 2, 2, 28, "#182735");
      if (
        family !== "cave" &&
        neighbors.up === TILE.ROOF &&
        Math.abs((wx * 3 + wy * 5) % 4) === 0
      ) {
        const glass =
          family === "harvest"
            ? "#f2bf62"
            : family === "spirit"
              ? "#69d6bb"
              : "#72c6dc";
        const glow =
          family === "harvest"
            ? "#ffe8a8"
            : family === "spirit"
              ? "#c3ffe7"
              : "#d7f8f7";
        this.rect(x + 8, y + 7, 16, 15, "#172432");
        this.rect(x + 10, y + 9, 12, 11, glass);
        this.rect(x + 11, y + 10, 4, 4, glow);
        this.rect(x + 15, y + 9, 2, 11, "#32495a");
        this.rect(x + 10, y + 14, 12, 2, "#32495a");
        this.rect(x + 6, y + 22, 20, 3, palette.stoneLight);
      } else if (
        family !== "cave" &&
        neighbors.up === TILE.ROOF &&
        Math.abs((wx * 11 + wy) % 7) === 2
      ) {
        const banner =
          family === "harvest" ? "#d59b48" : family === "spirit" ? "#4fae8e" : "#6ac1d2";
        this.rect(x + 13, y + 5, 7, 19, "#162b40");
        this.rect(x + 14, y + 6, 5, 16, banner);
        this.rect(x + 15, y + 8, 3, 3, "#f2d069");
      }
    }
    if (type === TILE.STONE) {
      if (neighbors.down === TILE.WATER)
        this.rect(x, y + 27, 32, 5, palette.stoneDark);
      if (neighbors.up === TILE.WATER)
        this.rect(x, y, 32, 3, palette.stoneLight);
    }
    if (type === TILE.FLOOR) {
      if (neighbors.up === TILE.WALL) this.rect(x, y, 32, 4, "rgba(6,15,25,.28)");
      if (neighbors.left === TILE.WALL) this.rect(x, y, 4, 32, "rgba(6,15,25,.18)");
    }
    if (type === TILE.FLOWER && family === "harvest") {
      const crops = [TILE.FLOWER];
      if (!same("up", crops)) this.rect(x + 2, y + 2, 28, 2, "#b09a58");
      if (!same("down", crops)) this.rect(x + 2, y + 28, 28, 2, "#4f5c36");
      if (!same("left", crops)) this.rect(x + 2, y + 2, 2, 28, "#a18448");
      if (!same("right", crops)) this.rect(x + 28, y + 2, 2, 28, "#4f5c36");
    }
  }

  drawTileForeground(type, sx, sy, wx, wy, now = 0, tone = "field", neighbors = null) {
    const x = Math.floor(sx);
    const y = Math.floor(sy);
    const arcane = tone.includes("mana");
    if (type === TILE.TREE) {
      const dark = arcane ? "#233e4f" : tone.includes("spirit") ? "#174d48" : "#1d5f43";
      const light = arcane ? "#648f85" : tone.includes("spirit") ? "#51aa83" : "#5cad70";
      this.rect(x + 1, y + 24, 30, 7, dark);
      this.rect(x + 5, y + 22, 21, 8, dark);
      this.rect(x + 9, y + 22, 9, 3, light);
      if (neighbors?.down !== TILE.TREE) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.22;
        this.rect(x + 4, y + 31, 28, 5, "#071522");
        this.ctx.restore();
      }
    } else if (type === TILE.ROOF && neighbors?.down !== TILE.ROOF) {
      const edge = arcane ? "#312f59" : tone.includes("harvest") ? "#6c442f" : "#1c4b74";
      this.rect(x - 1, y + 27, 34, 5, edge);
      this.ctx.save();
      this.ctx.globalAlpha = 0.2;
      this.rect(x + 2, y + 32, 32, 6, "#071522");
      this.ctx.restore();
    } else if (type === TILE.BOOKSHELF) {
      const shimmer = Math.floor(now / 350 + wx * 2 + wy) % 5 === 0;
      if (shimmer) this.rect(x + 6, y + 4, 2, 2, "#f5dc78");
      this.ctx.save();
      this.ctx.globalAlpha = 0.23;
      this.rect(x + 2, y + 31, 30, 5, "#050a16");
      this.ctx.restore();
    } else if (type === TILE.CLIFF && neighbors?.down !== TILE.CLIFF) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.34;
      this.rect(x, y + 29, 32, 7, "#060e1d");
      this.ctx.restore();
    }
  }

  drawCharacter(type, x, y, dir = "down", frame = 0, scale = 1, ghost = false) {
    const ctx = this.ctx;
    const s = scale;
    const atlasId = PARTY_ROWS[type] !== undefined ? "party" : NPC_ROWS[type] !== undefined ? "npc" : null;
    const atlasRow = atlasId === "party" ? PARTY_ROWS[type] : NPC_ROWS[type];
    if (atlasId && this.assetReady(atlasId)) {
      const direction = DIRECTION_COLUMNS[dir] ?? 0;
      const animationFrame = ((Math.floor(frame) % 4) + 4) % 4;
      ctx.save();
      ctx.globalAlpha = ghost ? 0.58 : 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.assets[atlasId],
        (direction * 4 + animationFrame) * FIELD_SPRITE_SOURCE,
        atlasRow * FIELD_SPRITE_SOURCE,
        FIELD_SPRITE_SOURCE,
        FIELD_SPRITE_SOURCE,
        Math.round(x - 4),
        Math.round(y),
        Math.round(32 * s),
        Math.round(32 * s),
      );
      ctx.restore();
      return;
    }
    const bob = frame % 2 ? 1 * s : 0;
    const flip = dir === "left";
    ctx.save();
    ctx.globalAlpha = ghost ? 0.58 : 1;
    ctx.translate(Math.round(x), Math.round(y + bob));
    if (flip) {
      ctx.translate(24 * s, 0);
      ctx.scale(-1, 1);
    }
    const p = (xx, yy, w, h, color) => this.rect(xx * s, yy * s, w * s, h * s, color);
    p(5, 27, 15, 3, "rgba(3,12,21,.35)");
    const palettes = {
      hero: { hair: "#293243", skin: "#f0bf99", main: "#68c3df", dark: "#18385a", trim: "#f4cf61" },
      kumi: { hair: "#3d2a30", skin: "#efbd98", main: "#4f9fce", dark: "#182f58", trim: "#f2d27c" },
      mirei: { hair: "#49342c", skin: "#f0bd98", main: "#f2c95f", dark: "#7a4b3d", trim: "#fff1b0" },
      sarina: { hair: "#3f3036", skin: "#efbd99", main: "#72c8aa", dark: "#354d68", trim: "#f4d778" },
      katoshi: { hair: "#4a3038", skin: "#efbc98", main: "#9ac9e5", dark: "#35416a", trim: "#f3d26e" },
      manaka: { hair: "#2b2636", skin: "#efbd99", main: "#7769b8", dark: "#303657", trim: "#efd36d" },
      guard: { hair: "#5a4534", skin: "#dca77f", main: "#6c88a4", dark: "#303e55", trim: "#d3bd78" },
      merchant: { hair: "#80613e", skin: "#ecc29b", main: "#b66f55", dark: "#5a3440", trim: "#f0cc78" },
      pilgrim: { hair: "#c6c2ad", skin: "#dcb18c", main: "#73658f", dark: "#3a3658", trim: "#c6b9e8" },
      scout: { hair: "#6f523b", skin: "#dfae87", main: "#477c69", dark: "#29433e", trim: "#a9cf8d" },
      bard: { hair: "#2b2739", skin: "#f0c09c", main: "#a25a8b", dark: "#493358", trim: "#f0b5d8" },
      smith: { hair: "#5b392e", skin: "#d99a70", main: "#925647", dark: "#3d3941", trim: "#dca567" },
      inn: { hair: "#9a6d47", skin: "#ecc09b", main: "#c27d70", dark: "#6d4556", trim: "#f1d2a1" },
      priest: { hair: "#d9d4c5", skin: "#edc3a2", main: "#dce1e8", dark: "#50658a", trim: "#e5c35c" },
      elder: { hair: "#d9d4c5", skin: "#ddb18f", main: "#69876d", dark: "#394d4e", trim: "#becb83" },
      child: { hair: "#8f613f", skin: "#efc49c", main: "#f2a55e", dark: "#6c4961", trim: "#ffe09b" },
      soldier: { hair: "#8d8a78", skin: "#d8a47e", main: "#71828a", dark: "#3b434f", trim: "#bb9e62" },
      fisher: { hair: "#34485d", skin: "#dca983", main: "#4d8a91", dark: "#32505a", trim: "#a4d1c7" },
      scholar: { hair: "#59406a", skin: "#efc2a0", main: "#6672a1", dark: "#39375d", trim: "#d8c3e7" },
      town: { hair: "#77523a", skin: "#e3b48f", main: "#7e9d65", dark: "#41593e", trim: "#d6c578" },
      town2: { hair: "#3e3448", skin: "#e8b894", main: "#a47879", dark: "#553f51", trim: "#d7baa0" },
      hermit: { hair: "#c6bfa8", skin: "#d9a986", main: "#496e5d", dark: "#2f4544", trim: "#a5b47e" },
      spirit: { hair: "#9ce5d8", skin: "#b9f0df", main: "#6ab8a4", dark: "#386b6c", trim: "#e5ffe0" },
      miner: { hair: "#4a372f", skin: "#d99d72", main: "#8b735a", dark: "#4b413c", trim: "#d9a84f" },
      baker: { hair: "#7b5138", skin: "#edbb94", main: "#e3bb63", dark: "#704855", trim: "#fff0bd" },
      farmer: { hair: "#6f4d32", skin: "#dfa77d", main: "#9b8b4f", dark: "#4d5338", trim: "#e0c66b" },
      miller: { hair: "#c9bda4", skin: "#e0ad84", main: "#8fa4a0", dark: "#475b5d", trim: "#e8d69b" },
      shrine: { hair: "#dad2c1", skin: "#e4b690", main: "#7fb8a0", dark: "#40566b", trim: "#ecd276" },
      ranger: { hair: "#564331", skin: "#dfab84", main: "#4f846c", dark: "#304c48", trim: "#b9d77e" },
      courier: { hair: "#4e3e38", skin: "#dfa982", main: "#628ca6", dark: "#334d61", trim: "#d9c66e" },
      fan: { hair: "#71513f", skin: "#e9b58f", main: "#7ca7ca", dark: "#4a4566", trim: "#f0ce70" },
      arenaMaster: { hair: "#d1c6b0", skin: "#d9a77e", main: "#7d7187", dark: "#3e4057", trim: "#e1bb5e" },
    };
    const q = palettes[type] || palettes.town;
    if (dir === "up") {
      p(7, 3, 11, 10, q.hair);
      p(6, 8, 13, 7, q.hair);
      p(7, 14, 11, 10, q.main);
    } else {
      p(7, 3, 11, 5, q.hair);
      p(6, 7, 13, 9, q.skin);
      p(6, 6, 4, 7, q.hair);
      p(15, 5, 4, 8, q.hair);
      if (dir === "down") {
        p(9, 10, 2, 2, "#273042");
        p(15, 10, 2, 2, "#273042");
      } else {
        p(15, 10, 2, 2, "#273042");
      }
      p(8, 14, 9, 3, q.skin);
      p(6, 15, 13, 10, q.main);
      p(5, 18, 3, 7, q.dark);
      p(18, 18, 3, 7, q.dark);
      p(10, 16, 5, 3, q.trim);
    }
    p(8, 24, 4, 5, q.dark);
    p(15, 24, 4, 5, q.dark);
    if (frame % 2) {
      p(7, 27, 5, 3, "#242a38");
      p(16, 26, 4, 3, "#242a38");
    } else {
      p(8, 26, 4, 3, "#242a38");
      p(15, 27, 5, 3, "#242a38");
    }
    if (type === "kumi") {
      p(20, 11, 2, 16, "#d6b568");
      p(19, 9, 4, 4, "#eef5ef");
      p(20, 7, 2, 4, "#76cae0");
    }
    if (type === "mirei") {
      p(20, 18, 5, 8, "#4d4040");
      p(21, 15, 3, 4, "#d9dde1");
      p(19, 24, 7, 3, "#bd704f");
    }
    if (type === "sarina") {
      p(20, 14, 3, 13, "#d7b64f");
      p(18, 12, 7, 6, "#f2d968");
      p(20, 13, 3, 3, "#f8f1b0");
      p(3, 17, 4, 8, "#73bfa9");
    }
    if (type === "katoshi") {
      p(20, 9, 2, 18, "#d8dfe1");
      p(18, 7, 7, 4, "#f1f5ef");
      p(21, 6, 2, 3, "#81c9df");
      p(3, 17, 4, 8, "#8ebed9");
    }
    if (type === "manaka") {
      p(20, 17, 10, 9, "#4a3568");
      p(21, 18, 4, 7, "#f1e5c7");
      p(25, 18, 4, 7, "#d9cba9");
      p(24, 19, 2, 5, "#efd36d");
      p(7, 15, 18, 2, "#efd36d");
    }
    if (type === "guard") {
      p(5, 3, 15, 4, "#8598aa");
      p(8, 1, 9, 3, "#b6c5ca");
    }
    if (type === "child") {
      ctx.scale(0.86, 0.86);
    }
    ctx.restore();
  }

  drawRegionalLandmark(mapId, cameraX = 0, cameraY = 0, now = 0) {
    const ctx = this.ctx;
    const locations = {
      solaido: { x: 20, y: 9, kind: "castle" },
      mileria: { x: 21.5, y: 9, kind: "bakery" },
      sarinaria: { x: 21.5, y: 9, kind: "worldTree" },
      katoshia: { x: 22.5, y: 9, kind: "windHall" },
      sunmill: { x: 30, y: 12, kind: "windmill" },
      skyArena: { x: 21, y: 11, kind: "arena" },
      manafia: { x: 23, y: 9, kind: "grandLibrary" },
    };
    const landmark = locations[mapId];
    if (!landmark) return;
    const x = landmark.x * 32 - cameraX;
    const y = landmark.y * 32 - cameraY;
    if (x < -150 || x > this.width + 150 || y < -170 || y > this.height + 80) return;
    const shadow = (width, height = 8) => {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = "#06111d";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y - 3), width, height, 0, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    };
    const flag = (fx, fy, color) => {
      const wave = Math.round(Math.sin(now / 180 + fx) * 2);
      this.rect(fx, fy, 2, 31, "#efd58a");
      this.rect(fx + 2, fy + 2, 17 + wave, 4, color);
      this.rect(fx + 2, fy + 6, 13 - wave, 4, color);
      this.rect(fx + 2, fy + 10, 8, 3, "#f5d36f");
    };
    const drawRotor = (cx, cy, radius, color, hub = "#f0d16d") => {
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(now / 1900);
      for (let blade = 0; blade < 4; blade += 1) {
        ctx.rotate(Math.PI / 2);
        this.rect(3, -3, radius - 4, 6, "#213b52");
        this.rect(10, -7, radius - 13, 12, color);
        this.rect(radius - 8, -5, 6, 8, "#e9f3e8");
      }
      this.outline(-6, -6, 12, 12, hub, "#15283b", 2);
      this.rect(-2, -2, 4, 4, "#fff1a4");
      ctx.restore();
    };

    if (landmark.kind === "castle") {
      shadow(82, 10);
      this.rect(x - 71, y - 81, 142, 77, "#1c3d60");
      this.rect(x - 66, y - 76, 132, 70, "#d8e3df");
      this.rect(x - 60, y - 69, 120, 63, "#9ab6bf");
      for (const offset of [-58, 58]) {
        this.rect(x + offset - 18, y - 112, 36, 106, "#496f8f");
        this.rect(x + offset - 14, y - 105, 28, 96, "#b9ced0");
        this.rect(x + offset - 22, y - 119, 44, 12, "#193654");
        this.rect(x + offset - 18, y - 116, 36, 7, "#67c3d9");
        this.rect(x + offset - 8, y - 91, 16, 22, "#203e5c");
        this.rect(x + offset - 5, y - 87, 10, 15, "#78d0df");
      }
      this.rect(x - 42, y - 103, 84, 18, "#23496b");
      this.rect(x - 36, y - 112, 72, 10, "#69c8df");
      this.rect(x - 28, y - 124, 56, 12, "#dceae5");
      this.rect(x - 21, y - 132, 42, 9, "#6bc5dc");
      this.rect(x - 18, y - 80, 36, 74, "#385b77");
      this.rect(x - 12, y - 67, 24, 61, "#0c2036");
      this.rect(x - 8, y - 57, 16, 51, "#203c53");
      this.rect(x - 4, y - 38, 8, 32, "#071624");
      this.rect(x - 31, y - 72, 13, 18, "#1d405d");
      this.rect(x + 18, y - 72, 13, 18, "#1d405d");
      this.rect(x - 27, y - 69, 5, 11, "#ffe49a");
      this.rect(x + 22, y - 69, 5, 11, "#ffe49a");
      flag(x - 60, y - 151, "#69c9e0");
      flag(x + 56, y - 151, "#6a9cce");
      this.rect(x - 9, y - 106, 18, 18, "#1b3855");
      this.rect(x - 5, y - 102, 10, 10, "#f2d26e");
    } else if (landmark.kind === "bakery") {
      shadow(88, 10);
      this.rect(x - 82, y - 75, 164, 69, "#694139");
      this.rect(x - 76, y - 68, 152, 62, "#e1c997");
      this.rect(x - 87, y - 85, 174, 19, "#70423b");
      this.rect(x - 78, y - 94, 156, 15, "#c17b54");
      this.rect(x - 66, y - 101, 132, 10, "#e2ab63");
      this.rect(x - 54, y - 61, 32, 31, "#6e493a");
      this.rect(x - 49, y - 56, 22, 20, "#f6d37b");
      this.rect(x + 22, y - 61, 32, 31, "#6e493a");
      this.rect(x + 27, y - 56, 22, 20, "#f6d37b");
      this.rect(x - 18, y - 51, 36, 45, "#4d3332");
      this.rect(x - 11, y - 42, 22, 36, "#281f25");
      this.rect(x - 41, y - 83, 82, 20, "#72403b");
      this.rect(x - 35, y - 79, 70, 12, "#fff0b5");
      this.rect(x - 21, y - 76, 42, 7, "#db9e4d");
      this.rect(x - 7, y - 89, 14, 14, "#e5ae58");
      this.rect(x - 4, y - 86, 8, 7, "#fff0a8");
      this.rect(x + 55, y - 121, 19, 45, "#67413b");
      this.rect(x + 51, y - 125, 27, 8, "#b87850");
      for (let puff = 0; puff < 4; puff += 1) {
        const drift = Math.sin(now / 700 + puff) * 7;
        ctx.save();
        ctx.globalAlpha = 0.2 - puff * 0.03;
        ctx.fillStyle = "#fff1d1";
        ctx.beginPath();
        ctx.arc(x + 64 + drift, y - 136 - puff * 13, 8 + puff * 2, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
      }
    } else if (landmark.kind === "worldTree") {
      shadow(88, 11);
      this.rect(x - 25, y - 92, 50, 87, "#403d34");
      this.rect(x - 18, y - 104, 36, 100, "#775f42");
      this.rect(x - 11, y - 98, 13, 89, "#a18252");
      this.rect(x - 75, y - 69, 59, 15, "#5b5137");
      this.rect(x + 17, y - 72, 61, 15, "#5b5137");
      for (let leaf = 0; leaf < 18; leaf += 1) {
        const angle = (leaf / 18) * TWO_PI;
        const radius = 36 + (leaf % 4) * 11;
        const lx = x + Math.cos(angle) * radius;
        const ly = y - 113 + Math.sin(angle) * radius * 0.58;
        this.rect(lx - 19, ly - 15, 38, 30, leaf % 3 === 0 ? "#4d9b72" : leaf % 3 === 1 ? "#347b62" : "#6db789");
        this.rect(lx - 12, ly - 20, 24, 30, leaf % 2 ? "#72c79a" : "#56ad80");
      }
      this.rect(x - 38, y - 16, 76, 10, "#426b61");
      this.rect(x - 29, y - 23, 58, 9, "#8bc8a7");
      this.rect(x - 17, y - 31, 34, 9, "#d6d270");
      for (let mote = 0; mote < 12; mote += 1) {
        const mx = x + Math.sin(now / 530 + mote * 1.7) * (35 + (mote % 4) * 11);
        const my = y - 65 - ((now / 28 + mote * 19) % 100);
        this.rect(mx, my, mote % 4 === 0 ? 3 : 2, mote % 4 === 0 ? 3 : 2, mote % 2 ? "#b8ffe0" : "#f5eb8a");
      }
    } else if (landmark.kind === "windHall") {
      shadow(81, 10);
      this.rect(x - 75, y - 67, 150, 61, "#304e6b");
      this.rect(x - 69, y - 61, 138, 55, "#b9d3d5");
      this.rect(x - 82, y - 77, 164, 17, "#365a78");
      this.rect(x - 74, y - 86, 148, 13, "#dce9e4");
      this.rect(x - 59, y - 92, 118, 10, "#77c7da");
      for (const offset of [-46, -16, 16, 46]) {
        this.rect(x + offset - 4, y - 59, 8, 53, "#6c8996");
        this.rect(x + offset - 2, y - 55, 4, 45, "#e1ece6");
      }
      this.rect(x - 13, y - 44, 26, 38, "#152a42");
      this.rect(x - 7, y - 36, 14, 30, "#31536b");
      this.rect(x - 9, y - 129, 18, 43, "#395d79");
      this.rect(x - 5, y - 141, 10, 56, "#d3e4df");
      drawRotor(x, y - 120, 46, "#9fced5");
      flag(x - 69, y - 119, "#69bdd2");
      flag(x + 65, y - 119, "#537fa7");
    } else if (landmark.kind === "windmill") {
      shadow(54, 9);
      this.rect(x - 38, y - 78, 76, 73, "#6e503e");
      this.rect(x - 31, y - 72, 62, 66, "#d8c8a1");
      this.rect(x - 43, y - 88, 86, 19, "#714744");
      this.rect(x - 34, y - 98, 68, 15, "#c18159");
      this.rect(x - 10, y - 49, 20, 43, "#3a2d2d");
      this.rect(x - 24, y - 59, 13, 17, "#496d75");
      this.rect(x + 12, y - 59, 13, 17, "#496d75");
      drawRotor(x, y - 76, 58, "#e9dfc1", "#e1b95c");
    } else if (landmark.kind === "arena") {
      shadow(91, 11);
      this.rect(x - 88, y - 58, 176, 52, "#574850");
      this.rect(x - 82, y - 53, 164, 47, "#b9a780");
      this.rect(x - 94, y - 70, 188, 15, "#55435a");
      this.rect(x - 86, y - 81, 172, 13, "#d0b66e");
      this.rect(x - 73, y - 91, 146, 12, "#6b7e8f");
      this.rect(x - 26, y - 47, 52, 41, "#312c3c");
      this.rect(x - 19, y - 39, 38, 33, "#101827");
      for (const offset of [-68, -43, 43, 68]) {
        this.rect(x + offset - 5, y - 53, 10, 47, "#756b61");
        this.rect(x + offset - 3, y - 50, 6, 42, "#d6c69f");
      }
      flag(x - 83, y - 119, "#72c4d8");
      flag(x + 79, y - 119, "#c38b58");
      this.rect(x - 12, y - 78, 24, 19, "#475d72");
      this.rect(x - 7, y - 74, 14, 10, "#f0d269");
    } else if (landmark.kind === "grandLibrary") {
      shadow(94, 11);
      this.rect(x - 89, y - 65, 178, 59, "#302d4e");
      this.rect(x - 82, y - 59, 164, 53, "#9a97b3");
      this.rect(x - 96, y - 77, 192, 16, "#3d3a62");
      this.rect(x - 87, y - 88, 174, 13, "#887eb4");
      this.rect(x - 72, y - 97, 144, 11, "#c3b8db");
      for (const offset of [-62, -31, 31, 62]) {
        this.rect(x + offset - 5, y - 58, 10, 52, "#585876");
        this.rect(x + offset - 2, y - 54, 4, 44, "#d5cde4");
      }
      this.rect(x - 16, y - 49, 32, 43, "#17182e");
      this.rect(x - 10, y - 41, 20, 35, "#394465");
      this.rect(x - 6, y - 111, 12, 25, "#403b68");
      this.rect(x - 3, y - 126, 6, 35, "#d9c96f");
      this.rect(x - 10, y - 130, 20, 4, "#f4dd7a");
      this.rect(x - 2, y - 138, 4, 20, "#f4dd7a");
      this.rect(x - 3, y - 131, 6, 6, "#fff6c2");
      for (let mote = 0; mote < 10; mote += 1) {
        const mx = x + Math.sin(now / 510 + mote * 1.8) * (28 + (mote % 4) * 15);
        const my = y - 73 - ((now / 31 + mote * 17) % 62);
        this.rect(mx, my, mote % 3 === 0 ? 3 : 2, mote % 3 === 0 ? 3 : 2, mote % 2 ? "#a9edf0" : "#efd87a");
      }
    }
  }

  drawWeather(mapId, tone, now = 0) {
    const ctx = this.ctx;
    const harvest = tone.includes("harvest");
    const spirit = tone.includes("spirit");
    const wind = tone.includes("wind") || tone === "arena";
    const arcane = tone.includes("mana");
    const cave =
      tone.toLowerCase().includes("cave") ||
      ["dungeon", "granary", "granaryBoss", "manaArchive", "manaBoss"].includes(tone);
    const outdoor = !cave && !["house", "castle"].some((word) => tone.includes(word));
    const phase = Math.floor(now / 12000) % 4;
    ctx.save();

    if (outdoor && !spirit && !arcane) {
      const drift = (now * (wind ? 0.02 : 0.009)) % (this.width + 240);
      ctx.globalAlpha = wind ? 0.11 : 0.07;
      for (let band = 0; band < 3; band += 1) {
        ctx.fillStyle = "#082238";
        ctx.beginPath();
        const bx = drift - 220 + band * 280;
        ctx.ellipse(bx, 62 + band * 97, 118, 24, -0.18, 0, TWO_PI);
        ctx.fill();
      }
    }

    if ((mapId === "highroad" || mapId === "solaido") && phase === 2) {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "#b8e6ed";
      ctx.lineWidth = 1;
      for (let drop = 0; drop < 46; drop += 1) {
        const rx = (drop * 83 + now * 0.19) % (this.width + 50) - 25;
        const ry = (drop * 47 + now * 0.42) % (this.height + 38) - 19;
        ctx.beginPath();
        ctx.moveTo(Math.round(rx), Math.round(ry));
        ctx.lineTo(Math.round(rx - 5), Math.round(ry + 12));
        ctx.stroke();
      }
    } else if (harvest) {
      const ray = ctx.createLinearGradient(0, 0, this.width, this.height);
      ray.addColorStop(0, "rgba(255,238,157,.14)");
      ray.addColorStop(0.34, "rgba(255,222,112,.03)");
      ray.addColorStop(0.62, "rgba(255,216,96,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(210, 0);
      ctx.lineTo(390, this.height);
      ctx.lineTo(225, this.height);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      for (let wave = 0; wave < 5; wave += 1) {
        const wy = 70 + wave * 54 + Math.sin(now / 500 + wave) * 5;
        ctx.strokeStyle = "#fff0ad";
        ctx.beginPath();
        ctx.moveTo(0, wy);
        for (let wx = 0; wx <= this.width; wx += 32)
          ctx.lineTo(wx, wy + Math.sin(wx / 45 + now / 800 + wave) * 3);
        ctx.stroke();
      }
    } else if (spirit) {
      ctx.globalAlpha = 0.12;
      for (let mist = 0; mist < 4; mist += 1) {
        const my = 92 + mist * 64 + Math.sin(now / 900 + mist) * 10;
        const gradient = ctx.createLinearGradient(0, my, this.width, my + 22);
        gradient.addColorStop(0, "rgba(190,255,229,0)");
        gradient.addColorStop(0.5, "rgba(190,255,229,.8)");
        gradient.addColorStop(1, "rgba(190,255,229,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(-30, my, this.width + 60, 18);
      }
      ctx.globalAlpha = 0.75;
      for (let light = 0; light < 9; light += 1) {
        const lx = (light * 89 + Math.sin(now / 530 + light) * 32 + 640) % 640;
        const ly = 48 + ((light * 53 + now * 0.018) % 250);
        const pulse = 1 + (Math.sin(now / 170 + light) + 1);
        this.rect(lx, ly, pulse, pulse, light % 2 ? "#c9ffe3" : "#f4e985");
      }
    } else if (arcane) {
      ctx.globalAlpha = 0.62;
      for (let glyph = 0; glyph < 13; glyph += 1) {
        const gx = (glyph * 97 + Math.sin(now / 620 + glyph) * 34 + 680) % 680 - 20;
        const gy = 34 + ((glyph * 53 + now * 0.012) % 285);
        const color = glyph % 3 === 0 ? "#f1d978" : glyph % 2 ? "#9e91df" : "#92e4df";
        this.rect(gx + 2, gy, 2, 8, color);
        this.rect(gx - 1, gy + 3, 8, 2, color);
        if (glyph % 4 === 0) this.rect(gx + 1, gy + 2, 4, 4, "#f4ffff");
      }
      ctx.globalAlpha = 0.1;
      for (let ring = 0; ring < 4; ring += 1) {
        ctx.strokeStyle = ring % 2 ? "#8f82ce" : "#74cfce";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          80 + ring * 170,
          85 + (ring % 2) * 128,
          48 + Math.sin(now / 700 + ring) * 5,
          18,
          now / 5000 + ring,
          0,
          TWO_PI,
        );
        ctx.stroke();
      }
    } else if (wind) {
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = "#e4f9f5";
      ctx.lineWidth = 2;
      for (let gust = 0; gust < 8; gust += 1) {
        const gx = ((gust * 123 + now * 0.18) % 820) - 150;
        const gy = 42 + ((gust * 57) % 275);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.bezierCurveTo(gx + 34, gy - 9, gx + 75, gy + 9, gx + 116, gy - 2);
        ctx.stroke();
      }
      for (let leaf = 0; leaf < 11; leaf += 1) {
        const lx = ((leaf * 91 + now * 0.13) % 710) - 35;
        const ly = (leaf * 49 + now * 0.035) % 350;
        this.rect(lx, ly, 4, 2, leaf % 2 ? "#78ad8a" : "#d2c86d");
      }
    } else if (cave) {
      ctx.globalAlpha = 0.18;
      for (let dust = 0; dust < 20; dust += 1) {
        const dx = (dust * 73 + Math.sin(now / 700 + dust) * 17 + 640) % 640;
        const dy = (dust * 41 + now * 0.009) % 340;
        this.rect(dx, dy, dust % 5 === 0 ? 2 : 1, dust % 5 === 0 ? 2 : 1, dust % 2 ? "#aeb8aa" : "#d2bb83");
      }
      const shaft = ctx.createLinearGradient(0, 0, 0, this.height);
      shaft.addColorStop(0, "rgba(137,186,192,.09)");
      shaft.addColorStop(1, "rgba(137,186,192,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(160, 0);
      ctx.lineTo(238, 0);
      ctx.lineTo(320, this.height);
      ctx.lineTo(214, this.height);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMapAtmosphere(tone, now = 0) {
    const ctx = this.ctx;
    const harvest = tone.includes("harvest");
    const spirit = tone.includes("spirit");
    const wind = tone.includes("wind") || tone === "arena";
    const arcane = tone.includes("mana");
    const cave =
      tone.toLowerCase().includes("cave") ||
      ["dungeon", "granary", "granaryBoss", "manaArchive", "manaBoss"].includes(tone);
    if (!harvest && !spirit && !wind && !arcane && !cave) return;
    ctx.save();
    ctx.globalAlpha = cave ? 0.28 : 0.48;
    for (let i = 0; i < 18; i += 1) {
      const speed = wind ? 0.12 : harvest ? 0.055 : arcane ? 0.04 : 0.025;
      const px = (i * 83 + Math.floor(now * speed)) % 700 - 30;
      const py =
        (i * 47 +
          (spirit ? Math.sin(now / 430 + i) * 15 : Math.floor(now * 0.012))) %
        330;
      if (arcane) {
        const color = i % 3 === 0 ? "#f2dc79" : i % 2 ? "#a79be1" : "#8ce2dc";
        this.rect(px, py, i % 5 === 0 ? 4 : 2, i % 5 === 0 ? 4 : 2, color);
        if (i % 4 === 0) this.rect(px - 2, py + 1, 7, 1, "#efffff");
      } else if (wind) {
        this.rect(
          px,
          py,
          13 + (i % 3) * 5,
          i % 4 === 0 ? 2 : 1,
          i % 2 ? "#d8f2f1" : "#93d3df",
        );
      } else if (harvest) {
        this.rect(px, py, 3, 2, i % 2 ? "#f0d271" : "#fff0b1");
        this.rect(px + 2, py + 2, 1, 3, "#c39746");
      } else if (spirit) {
        this.rect(
          px,
          py,
          i % 5 === 0 ? 3 : 2,
          i % 5 === 0 ? 3 : 2,
          i % 2 ? "#b9ffe0" : "#76d9c0",
        );
      } else {
        this.rect(px, py, 2, 2, i % 2 ? "#8795a0" : "#baa883");
      }
    }
    ctx.restore();
  }

  drawMapLighting(tone, now = 0) {
    const ctx = this.ctx;
    const harvest = tone.includes("harvest");
    const spirit = tone.includes("spirit");
    const wind = tone.includes("wind") || tone === "arena";
    const arcane = tone.includes("mana");
    const cave =
      tone.toLowerCase().includes("cave") ||
      ["dungeon", "granary", "granaryBoss"].includes(tone);
    ctx.save();
    const daylight = ctx.createLinearGradient(0, 0, this.width, this.height);
    if (harvest) {
      daylight.addColorStop(0, "rgba(255,228,143,.11)");
      daylight.addColorStop(0.56, "rgba(247,192,87,.025)");
      daylight.addColorStop(1, "rgba(67,38,21,.08)");
    } else if (spirit) {
      daylight.addColorStop(0, "rgba(139,255,221,.08)");
      daylight.addColorStop(0.54, "rgba(34,151,137,.025)");
      daylight.addColorStop(1, "rgba(7,32,49,.1)");
    } else if (arcane) {
      daylight.addColorStop(0, "rgba(188,178,255,.11)");
      daylight.addColorStop(0.5, "rgba(82,198,202,.035)");
      daylight.addColorStop(1, "rgba(20,20,62,.14)");
    } else if (wind) {
      daylight.addColorStop(0, "rgba(224,251,255,.12)");
      daylight.addColorStop(0.5, "rgba(102,196,216,.025)");
      daylight.addColorStop(1, "rgba(24,48,78,.08)");
    } else if (cave) {
      daylight.addColorStop(0, "rgba(59,87,106,.03)");
      daylight.addColorStop(0.55, "rgba(6,14,28,.07)");
      daylight.addColorStop(1, "rgba(0,4,12,.2)");
    } else {
      daylight.addColorStop(0, "rgba(214,249,255,.08)");
      daylight.addColorStop(0.6, "rgba(87,172,201,.015)");
      daylight.addColorStop(1, "rgba(8,37,47,.07)");
    }
    ctx.fillStyle = daylight;
    ctx.fillRect(0, 0, this.width, this.height);

    const pulse = 0.01 + (Math.sin(now / 1200) + 1) * 0.006;
    const vignette = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.46,
      this.height * 0.18,
      this.width * 0.5,
      this.height * 0.46,
      this.width * 0.68,
    );
    vignette.addColorStop(0, "rgba(3,10,19,0)");
    vignette.addColorStop(0.72, "rgba(3,10,19,0)");
    vignette.addColorStop(1, `rgba(3,10,19,${cave ? 0.34 : 0.13 + pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawChest(x, y, opened = false) {
    this.rect(x + 4, y + 13, 24, 15, "#321f2a");
    this.rect(x + 6, y + 15, 20, 11, opened ? "#5c493c" : "#a5663e");
    this.rect(x + 4, y + (opened ? 5 : 8), 24, 8, "#422b2d");
    this.rect(x + 7, y + (opened ? 3 : 10), 18, 5, opened ? "#7c674e" : "#ca8150");
    this.rect(x + 14, y + 14, 5, 8, "#f0c75d");
    this.rect(x + 15, y + 15, 3, 3, "#fff0a0");
  }

  drawSpecial(type, x, y, active = false, now = 0) {
    const pulse = Math.sin(now / 350) * 2;
    if (type === "campfire") {
      this.rect(x + 5, y + 22, 23, 4, "#4b322a");
      this.rect(x + 8, y + 19, 18, 3, "#7b4d32");
      this.rect(x + 11, y + 10 - pulse, 10, 12 + pulse, "#e95c3f");
      this.rect(x + 14, y + 13 - pulse, 6, 8 + pulse, "#ffd45f");
    } else if (type === "sign" || type === "board" || type === "mireBoard" || type === "windBoard" || type === "manaBoard") {
      this.rect(x + 5, y + 6, 22, 14, "#65422f");
      this.rect(x + 7, y + 8, 18, 10, "#b27b4c");
      this.rect(x + 14, y + 20, 5, 11, "#4a372d");
      this.rect(x + 10, y + 11, 11, 2, "#e2b873");
    } else if (type === "save") {
      this.rect(x + 10, y + 20, 12, 10, "#6d717a");
      this.rect(x + 7, y + 22, 18, 7, "#494f5b");
      this.rect(x + 11, y + 5 + pulse, 10, 17, "#57cfe7");
      this.rect(x + 14, y + 3 + pulse, 5, 15, "#d1fbff");
    } else if (type === "fountain") {
      this.rect(x + 2, y + 22, 28, 8, "#6d8591");
      this.rect(x + 6, y + 18, 20, 7, "#93b4bd");
      this.rect(x + 14, y + 7, 4, 14, "#507987");
      this.rect(x + 10, y + 9 + pulse, 3, 10, "#77d0df");
      this.rect(x + 20, y + 10 - pulse, 3, 9, "#77d0df");
    } else if (type === "boss" || type === "boss2" || type === "boss3" || type === "boss4" || type === "boss5") {
      this.rect(x + 2, y + 24, 28, 5, "#15101d");
      const body = type === "boss2" ? "#4b3a1d" : type === "boss3" ? "#23485a" : type === "boss4" ? "#456278" : type === "boss5" ? "#453861" : "#291836";
      const crown = type === "boss2" ? "#7c6427" : type === "boss3" ? "#3c7c79" : type === "boss4" ? "#86b9c8" : type === "boss5" ? "#8977b5" : "#4c245e";
      const eye = type === "boss2" ? "#f0d34f" : type === "boss3" ? "#a7f3d0" : type === "boss4" ? "#eefcce" : type === "boss5" ? "#f4db73" : "#ed5a88";
      this.rect(x + 6, y + 13, 20, 13, body);
      this.rect(x + 9, y + 7 + pulse, 14, 13, crown);
      this.rect(x + 11, y + 9 + pulse, 3, 3, eye);
      this.rect(x + 19, y + 9 + pulse, 3, 3, eye);
    } else if (type === "gather") {
      this.rect(x + 14, y + 15, 3, 14, "#2b694d");
      this.rect(x + 8, y + 14, 8, 5, "#75bb83");
      this.rect(x + 17, y + 10, 8, 6, "#99d49b");
      if (active) this.rect(x + 22, y + 5 + pulse, 3, 3, "#e5ffe5");
    } else if (["lever", "rope", "seal", "groveShrine", "granaryLever", "archiveLever"].includes(type)) {
      this.rect(x + 7, y + 21, 18, 8, "#444b55");
      this.rect(x + 10, y + 18, 12, 5, "#78828a");
      if (type === "lever" || type === "granaryLever" || type === "archiveLever") {
        this.rect(x + 15, y + 7, 3, 13, "#b88b50");
        this.rect(x + 13, y + 5, 7, 5, active ? "#6cd399" : "#d85c5c");
      } else if (type === "rope") {
        this.rect(x + 14, y + 4, 4, 20, "#b3945a");
        this.rect(x + 10, y + 7, 12, 3, "#d4b974");
      } else {
        this.rect(x + 12, y + 5 + pulse, 8, 17, active ? "#f2d871" : "#62c9e3");
        this.rect(x + 15, y + 3 + pulse, 3, 16, "#e4fbff");
      }
    } else if (type === "goldenWheat") {
      for (let i = 0; i < 5; i += 1) {
        this.rect(x + 6 + i * 5, y + 10 + (i % 2) * 2, 2, 19, "#b78635");
        this.rect(x + 3 + i * 5, y + 7 + (i % 2) * 2, 7, 6, "#f0cb58");
      }
    } else if (type === "springWater") {
      this.rect(x + 3, y + 18, 26, 11, "#397f9c");
      this.rect(x + 7, y + 15, 18, 8, "#68c8d5");
      this.rect(x + 12, y + 7 + pulse, 8, 13, "#b9f5ed");
    } else if (type === "sunYeast") {
      this.rect(x + 7, y + 20, 18, 8, "#74523a");
      this.rect(x + 11, y + 7 + pulse, 10, 16, "#f2ce58");
      this.rect(x + 14, y + 4 + pulse, 4, 15, "#fff3a4");
    } else if (type === "oven") {
      this.rect(x + 3, y + 10, 26, 20, "#7e5a45");
      this.rect(x + 7, y + 14, 18, 16, "#3d2a29");
      this.rect(x + 10, y + 19, 12, 8, "#e66b3e");
      this.rect(x + 13, y + 17 + pulse, 6, 8, "#ffd15c");
    } else if (["waterChime", "windChime", "lightChime"].includes(type)) {
      const color =
        type === "waterChime" ? "#7dd8e4" : type === "windChime" ? "#8ee0aa" : "#f4df72";
      this.rect(x + 9, y + 23, 14, 5, "#3b5360");
      this.rect(x + 14, y + 8 + pulse, 4, 16, "#d6b95b");
      this.rect(x + 9, y + 6 + pulse, 14, 9, color);
      this.rect(x + 12, y + 8 + pulse, 8, 4, "#efffe6");
    } else if (type === "spiritAltar" || type === "spiritGate") {
      this.rect(x + 4, y + 22, 24, 7, "#52636a");
      this.rect(x + 8, y + 7, 5, 17, "#6ca79a");
      this.rect(x + 19, y + 7, 5, 17, "#6ca79a");
      this.rect(x + 11, y + 5 + pulse, 10, 12, active ? "#f4df72" : "#7dd8d8");
      this.rect(x + 14, y + 3 + pulse, 4, 14, "#e8fff1");
    } else if (type === "spiritCamp") {
      this.rect(x + 4, y + 22, 24, 5, "#35514b");
      this.rect(x + 10, y + 12 + pulse, 12, 12, "#62c6ad");
      this.rect(x + 14, y + 8 + pulse, 5, 13, "#d9ffe9");
    } else if (type === "sanctumLever") {
      this.rect(x + 7, y + 21, 18, 8, "#44565d");
      this.rect(x + 15, y + 7, 3, 14, "#c0a45a");
      this.rect(x + 12, y + 5, 9, 5, active ? "#71d5ad" : "#d96778");
    } else if (type === "windCamp") {
      this.rect(x + 4, y + 22, 24, 5, "#47535d");
      this.rect(x + 7, y + 10, 18, 13, "#6c91a8");
      this.rect(x + 10, y + 7, 13, 5, "#d9e7df");
      this.rect(x + 14, y + 14 + pulse, 5, 8, "#f2cf62");
    } else if (type === "arenaFinal") {
      this.rect(x + 3, y + 23, 26, 6, "#715a47");
      this.rect(x + 7, y + 9, 18, 15, "#b39460");
      this.rect(x + 11, y + 5 + pulse, 10, 9, "#8fd1e2");
      this.rect(x + 14, y + 7 + pulse, 4, 7, "#f2e38a");
    } else if (type === "windVaneNorth" || type === "windVaneSouth") {
      this.rect(x + 14, y + 8, 4, 21, "#687982");
      this.rect(x + 7, y + 6 + pulse, 18, 5, active ? "#e4d269" : "#83c6d7");
      this.rect(x + (type === "windVaneNorth" ? 5 : 21), y + 4 + pulse, 6, 9, "#edf5e8");
      this.rect(x + 10, y + 27, 12, 3, "#48555e");
    } else if (type === "towerLever") {
      this.rect(x + 6, y + 22, 20, 7, "#4d606b");
      this.rect(x + 14, y + 7, 4, 16, "#b6a05f");
      this.rect(x + 9, y + 5, 14, 6, active ? "#86d3c2" : "#7faac1");
    } else if (["originIndex", "questionIndex", "futureIndex"].includes(type)) {
      const color =
        type === "originIndex" ? "#72cfe3" : type === "questionIndex" ? "#aa8be0" : "#f2d36d";
      this.rect(x + 5, y + 23, 22, 6, "#34364f");
      this.rect(x + 9, y + 20, 14, 5, "#676784");
      this.rect(x + 12, y + 7 + pulse, 8, 15, color);
      this.rect(x + 15, y + 4 + pulse, 3, 15, "#f3ffff");
      this.rect(x + 7, y + 11 + pulse, 18, 3, color);
    } else if (type === "manaCamp") {
      this.rect(x + 4, y + 22, 24, 5, "#3e415d");
      this.rect(x + 7, y + 11, 18, 12, "#665e94");
      this.rect(x + 11, y + 8, 11, 5, "#b7a8dd");
      this.rect(x + 14, y + 13 + pulse, 5, 9, "#f0d46c");
    } else if (type === "archiveGate") {
      this.rect(x + 3, y + 23, 26, 6, "#36384f");
      this.rect(x + 6, y + 7, 5, 18, "#6e6892");
      this.rect(x + 21, y + 7, 5, 18, "#6e6892");
      this.rect(x + 9, y + 5 + pulse, 14, 13, active ? "#f0d66f" : "#9986d3");
      this.rect(x + 14, y + 3 + pulse, 4, 16, "#edffff");
    } else if (type === "runawayTome") {
      this.rect(x + 7, y + 12 + pulse, 18, 14, "#4c356b");
      this.rect(x + 9, y + 14 + pulse, 7, 10, "#eee0bd");
      this.rect(x + 17, y + 14 + pulse, 6, 10, "#d7c7a6");
      this.rect(x + 15, y + 15 + pulse, 3, 9, "#f0d36b");
      this.rect(x + 4, y + 8 + pulse, 5, 4, "#9be2df");
      this.rect(x + 24, y + 7 - pulse, 5, 4, "#a99ae0");
    }
  }

  drawEnemySymbol(kind, x, y, dir = "down", now = 0, alert = false) {
    const sprite = {
      softSlime: "slime",
      thornMouse: "mouse",
      gloomBat: "bat",
      mistWisp: "wisp",
      armorShell: "crab",
      anxietyShade: "shade",
      raidBrute: "orc",
      gloomMoth: "moth",
      cropSprout: "sprout",
      hungryCrow: "crow",
      mudGolem: "mud",
      flourGhost: "flour",
      blightScarecrow: "scarecrow",
      dryRoot: "root",
      blightHeart: "blightHeart",
      whisperMushroom: "mushroom",
      streamSprite: "stream",
      galeWolf: "galeWolf",
      prismBeetle: "prismBeetle",
      hollowMask: "hollowMask",
      echoArmor: "echoArmor",
      rippleGuardian: "rippleGuardian",
      gustGuardian: "gustGuardian",
      prismGuardian: "prismGuardian",
      muteTotem: "muteTotem",
      hushAvatar: "hushAvatar",
      cloudHare: "cloudHare",
      bladeHawk: "bladeHawk",
      windArmor: "windArmor",
      stormDjinn: "stormDjinn",
      arenaBulwark: "windArmor",
      arenaRaptor: "bladeHawk",
      arenaMage: "stormDjinn",
      katoshiDuel: "katoshiDuel",
      stormEye: "stormEye",
      tempestMirror: "tempestMirror",
      inkSlime: "inkSlime",
      runeOwl: "runeOwl",
      bookMimic: "bookMimic",
      logicGolem: "logicGolem",
      falseIndex: "falseIndex",
      amnesiaLibrarian: "amnesiaLibrarian",
    }[kind] || "shade";
    const bob = Math.sin(now / 230 + x) * 2;
    this.ctx.save();
    this.ctx.translate(x + 16, y + 16 + bob);
    if (sprite === "slime") {
      this.rect(-9, 1, 18, 10, "#3da8c2");
      this.rect(-6, -5, 12, 9, "#64d6df");
      this.rect(-3, -8, 6, 5, "#a2f1ec");
      this.rect(-5, 0, 3, 3, "#173249");
      this.rect(3, 0, 3, 3, "#173249");
      this.rect(-11, 9, 22, 4, "#1d5e78");
    } else if (sprite === "mouse") {
      this.rect(-10, -5, 20, 15, "#9c6553");
      this.rect(-11, -11, 7, 8, "#74424b");
      this.rect(4, -11, 7, 8, "#74424b");
      this.rect(-5, -2, 3, 3, "#fff0a7");
      this.rect(3, -2, 3, 3, "#fff0a7");
      this.rect(-2, 4, 4, 3, "#392a31");
      this.rect(-14, 8, 7, 3, "#d1aa93");
      this.rect(7, 8, 7, 3, "#d1aa93");
    } else if (sprite === "bat") {
      this.rect(-15, -7, 11, 7, "#765889");
      this.rect(-13, -12, 8, 7, "#9b76aa");
      this.rect(4, -7, 11, 7, "#765889");
      this.rect(5, -12, 8, 7, "#9b76aa");
      this.rect(-6, -9, 12, 18, "#343249");
      this.rect(-4, -5, 3, 3, "#f0cf5e");
      this.rect(2, -5, 3, 3, "#f0cf5e");
    } else if (sprite === "wisp") {
      this.rect(-8, -9, 16, 18, "#5696a7");
      this.rect(-5, -14, 10, 9, "#86d5da");
      this.rect(-3, -17, 6, 6, "#c4f5ef");
      this.rect(-5, -5, 3, 3, "#1c3044");
      this.rect(3, -5, 3, 3, "#1c3044");
      this.rect(-10, 8, 5, 5, "#376b80");
      this.rect(5, 8, 5, 5, "#376b80");
    } else if (sprite === "crab") {
      this.rect(-11, -5, 22, 15, "#8a6954");
      this.rect(-8, -10, 16, 8, "#b49068");
      this.rect(-15, -4, 6, 7, "#b0795c");
      this.rect(9, -4, 6, 7, "#b0795c");
      this.rect(-6, -4, 3, 3, "#182b36");
      this.rect(3, -4, 3, 3, "#182b36");
      this.rect(-10, 10, 5, 4, "#483d3a");
      this.rect(5, 10, 5, 4, "#483d3a");
    } else if (sprite === "sprout") {
      this.rect(-9, -2, 18, 13, "#7f733e");
      this.rect(-5, -8, 10, 9, "#a69a4f");
      this.rect(-11, -13, 10, 7, "#78934a");
      this.rect(1, -15, 11, 8, "#5e823e");
      this.rect(-5, 1, 3, 3, "#342d2c");
      this.rect(3, 1, 3, 3, "#342d2c");
    } else if (sprite === "crow") {
      this.rect(-11, -8, 22, 16, "#263143");
      this.rect(-16, -5, 8, 11, "#394b5c");
      this.rect(8, -5, 8, 11, "#394b5c");
      this.rect(-7, -13, 14, 8, "#1d2736");
      this.rect(-4, -9, 3, 3, "#f1cf55");
      this.rect(2, -9, 3, 3, "#f1cf55");
      this.rect(7, -4, 8, 3, "#c68b38");
    } else if (sprite === "mud") {
      this.rect(-11, -10, 22, 22, "#715b43");
      this.rect(-14, -3, 6, 15, "#594b3b");
      this.rect(8, -3, 6, 15, "#594b3b");
      this.rect(-6, -5, 4, 3, "#f0cb5a");
      this.rect(2, -5, 4, 3, "#f0cb5a");
      this.rect(-8, 5, 16, 3, "#3d342e");
    } else if (sprite === "flour") {
      this.rect(-9, -11, 18, 20, "#d9d3bd");
      this.rect(-13, 4, 26, 8, "#aba891");
      this.rect(-5, -6, 3, 3, "#5c5363");
      this.rect(3, -6, 3, 3, "#5c5363");
    } else if (sprite === "scarecrow") {
      this.rect(-3, -13, 6, 27, "#705035");
      this.rect(-14, -8, 28, 5, "#8d6b42");
      this.rect(-9, -16, 18, 12, "#9b814b");
      this.rect(-5, -12, 3, 3, "#ecbf4d");
      this.rect(3, -12, 3, 3, "#ecbf4d");
      this.rect(-12, 4, 24, 9, "#59623a");
    } else if (sprite === "root" || sprite === "blightHeart") {
      this.rect(-10, -11, 20, 22, sprite === "blightHeart" ? "#7d5d28" : "#5d4a2e");
      this.rect(-15, 6, 30, 6, "#403622");
      this.rect(-5, -6, 3, 3, "#f0cf4d");
      this.rect(3, -6, 3, 3, "#f0cf4d");
      this.rect(-14, -15, 5, 22, "#4c4228");
      this.rect(9, -15, 5, 22, "#4c4228");
    } else if (sprite === "mushroom") {
      this.rect(-10, -1, 20, 13, "#6f5b75");
      this.rect(-14, -12, 28, 13, "#b17b96");
      this.rect(-8, -9, 5, 4, "#efc7b8");
      this.rect(4, -7, 4, 3, "#efc7b8");
      this.rect(-5, 2, 3, 3, "#f5df72");
      this.rect(3, 2, 3, 3, "#f5df72");
    } else if (sprite === "stream" || sprite === "rippleGuardian") {
      this.rect(-11, -7, 22, 18, sprite === "rippleGuardian" ? "#3d8793" : "#57b6c4");
      this.rect(-7, -14, 14, 11, "#9aede5");
      this.rect(-5, -4, 3, 3, "#25455d");
      this.rect(3, -4, 3, 3, "#25455d");
      this.rect(-14, 8, 28, 5, "#367187");
    } else if (sprite === "galeWolf" || sprite === "gustGuardian") {
      this.rect(-12, -7, 24, 17, sprite === "gustGuardian" ? "#5c8b6d" : "#607b72");
      this.rect(-10, -14, 8, 9, "#8fc79b");
      this.rect(2, -14, 8, 9, "#8fc79b");
      this.rect(-6, -5, 3, 3, "#f4dc68");
      this.rect(3, -5, 3, 3, "#f4dc68");
      this.rect(8, 6, 12, 4, "#bce4a5");
    } else if (sprite === "prismBeetle" || sprite === "prismGuardian") {
      this.rect(-12, -8, 24, 19, sprite === "prismGuardian" ? "#5e5190" : "#426b76");
      this.rect(-7, -13, 14, 9, "#8ac8b7");
      this.rect(-10, -5, 20, 3, "#efd66c");
      this.rect(-15, 7, 8, 4, "#82588a");
      this.rect(7, 7, 8, 4, "#4f91a3");
    } else if (sprite === "hollowMask" || sprite === "muteTotem") {
      this.rect(-10, -13, 20, 25, sprite === "muteTotem" ? "#3f5960" : "#d5d0bc");
      this.rect(-6, -7, 4, 5, "#172839");
      this.rect(3, -7, 4, 5, "#172839");
      this.rect(-5, 4, 10, 3, "#6a5366");
      this.rect(-14, 9, 28, 5, "#30464c");
    } else if (sprite === "echoArmor") {
      this.rect(-11, -10, 22, 22, "#5f7480");
      this.rect(-8, -15, 16, 8, "#8fa5a8");
      this.rect(-5, -7, 10, 4, "#182b38");
      this.rect(-14, 0, 7, 14, "#40545e");
      this.rect(7, 0, 7, 14, "#40545e");
    } else if (sprite === "hushAvatar") {
      this.rect(-15, -13, 30, 25, "#244b59");
      this.rect(-11, -18, 22, 10, "#397873");
      this.rect(-7, -8, 5, 4, "#a7f2d1");
      this.rect(3, -8, 5, 4, "#a7f2d1");
      this.rect(-18, 8, 36, 6, "#162e38");
    } else if (sprite === "cloudHare") {
      this.rect(-10, -6, 20, 16, "#d7e4de");
      this.rect(-9, -16, 6, 12, "#a7c8ce");
      this.rect(3, -17, 6, 13, "#a7c8ce");
      this.rect(-5, -3, 3, 3, "#33506b");
      this.rect(3, -3, 3, 3, "#33506b");
      this.rect(-14, 8, 28, 5, "#81b7c6");
    } else if (sprite === "bladeHawk") {
      this.rect(-10, -10, 20, 19, "#527b8e");
      this.rect(-17, -6, 10, 15, "#83b7c1");
      this.rect(7, -6, 10, 15, "#83b7c1");
      this.rect(-6, -14, 12, 7, "#d8e9dc");
      this.rect(-3, -9, 3, 3, "#f1d564");
      this.rect(4, -5, 11, 3, "#b9d6d7");
    } else if (sprite === "windArmor") {
      this.rect(-11, -11, 22, 23, "#5b7481");
      this.rect(-8, -15, 16, 8, "#9cb4ba");
      this.rect(-5, -8, 10, 4, "#1b3443");
      this.rect(-14, 0, 7, 14, "#3d5968");
      this.rect(7, 0, 7, 14, "#3d5968");
      this.rect(-8, 6, 16, 4, "#e3c45f");
    } else if (sprite === "stormDjinn") {
      this.rect(-10, -12, 20, 22, "#58758f");
      this.rect(-14, 6, 28, 7, "#304e67");
      this.rect(-6, -7, 4, 4, "#e9dc70");
      this.rect(3, -7, 4, 4, "#e9dc70");
      this.rect(-15, -16, 9, 8, "#91c7cd");
      this.rect(6, -18, 9, 9, "#91c7cd");
    } else if (sprite === "katoshiDuel") {
      this.rect(-8, -13, 16, 22, "#9ac9e5");
      this.rect(-7, -17, 14, 8, "#4a3038");
      this.rect(-11, 8, 22, 5, "#35416a");
      this.rect(9, -15, 3, 26, "#edf2e9");
      this.rect(7, -17, 8, 4, "#81c9df");
    } else if (sprite === "stormEye") {
      this.rect(-10, -12, 20, 3, "#83b9c8");
      this.rect(-14, -9, 28, 17, "#557d96");
      this.rect(-10, -6, 20, 11, "#b6d9dc");
      this.rect(-3, -5, 7, 10, "#f3d666");
      this.rect(-1, -3, 3, 6, "#314b61");
      this.rect(-17, -3, 5, 3, "#8ed5da");
      this.rect(12, 2, 5, 3, "#8ed5da");
      this.rect(-11, 8, 22, 4, "#29485c");
    } else if (sprite === "tempestMirror") {
      this.rect(-10, -18, 20, 3, "#a9dbe0");
      this.rect(-14, -15, 28, 4, "#658da0");
      this.rect(-17, -11, 5, 20, "#36596e");
      this.rect(12, -11, 5, 20, "#36596e");
      this.rect(-13, 9, 26, 4, "#2b4b61");
      this.rect(-10, -10, 20, 18, "#bfe4df");
      this.rect(-6, -7, 12, 12, "#82c6d2");
      this.rect(-2, -5, 6, 5, "#f3da70");
      this.rect(-5, 1, 6, 3, "#e8f2dd");
      this.rect(-22, -8, 7, 3, "#8ed5da");
      this.rect(15, 4, 7, 3, "#8ed5da");
    } else if (sprite === "inkSlime") {
      this.rect(-10, 2, 20, 10, "#332c58");
      this.rect(-8, -7, 16, 13, "#665a9c");
      this.rect(-4, -12, 8, 7, "#9d8cd1");
      this.rect(-5, -3, 3, 3, "#eefbff");
      this.rect(3, -3, 3, 3, "#eefbff");
      this.rect(-12, 10, 24, 4, "#1b2440");
    } else if (sprite === "runeOwl") {
      this.rect(-11, -9, 22, 20, "#59668f");
      this.rect(-15, -6, 8, 15, "#7f79ae");
      this.rect(7, -6, 8, 15, "#7f79ae");
      this.rect(-8, -14, 16, 8, "#c4badb");
      this.rect(-6, -7, 5, 5, "#f1d66e");
      this.rect(2, -7, 5, 5, "#f1d66e");
      this.rect(-2, 0, 4, 4, "#273650");
    } else if (sprite === "bookMimic" || sprite === "falseIndex") {
      const cover = sprite === "falseIndex" ? "#8b4f71" : "#4e376b";
      this.rect(-13, -11, 26, 22, cover);
      this.rect(-10, -8, 20, 16, "#e1d3ae");
      this.rect(-3, -9, 6, 19, "#c39e54");
      this.rect(-8, -4, 4, 4, "#342e4c");
      this.rect(4, -4, 4, 4, "#342e4c");
      this.rect(-12, 10, 7, 5, "#7b619d");
      this.rect(5, 10, 7, 5, "#7b619d");
    } else if (sprite === "logicGolem") {
      this.rect(-11, -12, 22, 24, "#62677d");
      this.rect(-15, -3, 7, 16, "#454b61");
      this.rect(8, -3, 7, 16, "#454b61");
      this.rect(-7, -8, 5, 4, "#8de0dc");
      this.rect(3, -8, 5, 4, "#8de0dc");
      this.rect(-6, 2, 12, 4, "#d8c66d");
      this.rect(-10, 11, 20, 4, "#34394d");
    } else if (sprite === "amnesiaLibrarian") {
      this.rect(-16, -15, 32, 28, "#493a68");
      this.rect(-12, -20, 24, 10, "#8a77ae");
      this.rect(-9, -10, 6, 5, "#f1d66c");
      this.rect(4, -10, 6, 5, "#f1d66c");
      this.rect(-11, 0, 22, 5, "#1d2138");
      this.rect(-18, 8, 36, 6, "#2a2c48");
      this.rect(-19, -17, 5, 28, "#d6c99f");
      this.rect(14, -17, 5, 28, "#d6c99f");
    } else if (sprite === "orc") {
      this.rect(-10, -10, 20, 20, "#613653");
      this.rect(-7, -13, 14, 7, "#8d536e");
      this.rect(-6, -5, 4, 3, "#ffd15d");
      this.rect(2, -5, 4, 3, "#ffd15d");
      this.rect(-12, 6, 24, 6, "#34243b");
    } else if (sprite === "moth") {
      this.rect(-13, -7, 10, 17, "#76578c");
      this.rect(3, -7, 10, 17, "#76578c");
      this.rect(-5, -10, 10, 20, "#34304a");
      this.rect(-3, -6, 2, 2, "#ffd464");
      this.rect(1, -6, 2, 2, "#ffd464");
    } else {
      this.rect(-8, -11, 16, 18, "#333148");
      this.rect(-11, 2, 22, 9, "#24253a");
      this.rect(-5, -6, 3, 3, "#e85682");
      this.rect(2, -6, 3, 3, "#e85682");
      this.rect(-9, 10, 5, 5, "#222335");
      this.rect(4, 10, 5, 5, "#222335");
    }
    if (alert) {
      this.text("!", 0, -28, "#ffe276", 15, "center");
    }
    this.ctx.restore();
  }

  drawBattleBackground(tone, now = 0) {
    const ctx = this.ctx;
    const palettes = {
      field: ["#173c57", "#478b77", "#315e54", "#163a3b"],
      town: ["#254766", "#7c8791", "#555e6b", "#233749"],
      forest: ["#102d35", "#2e6e5a", "#214b43", "#102c31"],
      dungeon: ["#121923", "#4a5059", "#292f38", "#0c1119"],
      cave: ["#0b1724", "#334b5d", "#1d2b3a", "#08111d"],
      deepCave: ["#101226", "#3a3b5c", "#20213d", "#090b17"],
      bossCave: ["#160e23", "#4a2c58", "#291a39", "#0d0916"],
      harvest: ["#244d66", "#c9aa55", "#796b38", "#33472d"],
      harvestTown: ["#315873", "#c59c63", "#74654d", "#3e4438"],
      granary: ["#201d19", "#685a43", "#3f3529", "#171512"],
      granaryBoss: ["#21170f", "#76582b", "#46331d", "#140e0a"],
      spiritPass: ["#244f68", "#659b79", "#416a5b", "#203f3a"],
      spiritTown: ["#315d72", "#79a78e", "#527463", "#294c47"],
      spiritForest: ["#102f38", "#367963", "#275346", "#102e32"],
      spiritSanctum: ["#111d27", "#426a6c", "#28464d", "#09161d"],
      spiritBoss: ["#10222c", "#3b7873", "#24545a", "#08171d"],
      windRoad: ["#315a79", "#89b7a8", "#5f8179", "#324c50"],
      windTown: ["#416a86", "#9eb8b9", "#6b7d85", "#344957"],
      arena: ["#355a75", "#b69a6f", "#73604f", "#3d3840"],
      windTower: ["#172632", "#647d89", "#394f5b", "#0e1b24"],
      windBoss: ["#142a3a", "#628fa1", "#355e70", "#0b1b28"],
      manaRoad: ["#242850", "#699b99", "#4e6e76", "#282c4b"],
      manaTown: ["#35345c", "#9792af", "#66657f", "#303047"],
      manaArchive: ["#17162d", "#625a83", "#393855", "#0f1021"],
      manaBoss: ["#1c132d", "#70598a", "#42345d", "#100a1c"],
    };
    const p = palettes[tone] || palettes.field;
    const g = ctx.createLinearGradient(0, 0, 0, 250);
    g.addColorStop(0, p[0]);
    g.addColorStop(0.65, p[1]);
    g.addColorStop(1, p[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 255);
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 47 + Math.floor(now / 90)) % 680 - 20;
      const y = 22 + ((i * 37) % 170);
      this.rect(x, y, 2, 2, i % 3 ? "#86c4c5" : "#d8dd9e");
    }
    this.rect(0, 224, 640, 136, p[3]);
    for (let y = 228; y < 360; y += 18)
      for (let x = (y % 36) - 18; x < 640; x += 36) {
        this.rect(x, y, 24, 3, p[2]);
        this.rect(x + 4, y + 4, 18, 2, "#142230");
      }
    const cave = tone.toLowerCase().includes("cave") || ["dungeon", "windTower", "windBoss", "spiritSanctum", "spiritBoss", "manaArchive", "manaBoss"].includes(tone);
    const harvest = tone.includes("harvest") || tone.includes("granary");
    const spirit = tone.includes("spirit");
    const wind = tone.includes("wind") || tone === "arena";
    const arcane = tone.includes("mana");
    if (arcane) {
      for (let shelf = 0; shelf < 640; shelf += 94) {
        this.rect(shelf, 88 + (shelf % 23), 74, 136, "#2c2942");
        this.rect(shelf + 5, 94 + (shelf % 23), 64, 126, "#51465f");
        for (let row = 0; row < 4; row += 1) {
          this.rect(shelf + 8, 102 + row * 28 + (shelf % 23), 58, 4, "#241d31");
          for (let book = 0; book < 7; book += 1) {
            const colors = ["#6a77a0", "#9b5c75", "#bd995b", "#559183", "#8064a1"];
            this.rect(shelf + 10 + book * 8, 83 + row * 28 + (shelf % 23), 6, 18, colors[(book + row) % colors.length]);
          }
        }
      }
      for (let glyph = 0; glyph < 15; glyph += 1) {
        const gx = (glyph * 89 + now * 0.025) % 680 - 20;
        const gy = 32 + ((glyph * 47) % 165);
        this.rect(gx + 2, gy, 2, 9, glyph % 2 ? "#8de1dc" : "#f1d574");
        this.rect(gx - 1, gy + 3, 8, 2, glyph % 2 ? "#8de1dc" : "#f1d574");
      }
      if (tone === "manaBoss") {
        this.rect(270, 40, 140, 12, "#8671ac");
        this.rect(286, 52, 108, 94, "#2a203d");
        this.rect(302, 64, 76, 70, "#665681");
        this.rect(315, 77, 50, 45, "#d7c86f");
      }
    } else if (cave) {
      for (let x = 20; x < 640; x += 74) {
        const h = 24 + ((x * 7) % 45);
        this.rect(x, 0, 15, h, "#0a101a");
        this.rect(x + 3, h - 8, 9, 12, "#283747");
      }
      for (let x = 18; x < 640; x += 58) {
        const height = 24 + ((x * 11) % 38);
        this.rect(x, 190 - height, 9, height, p[2]);
        this.rect(x + 2, 190 - height - 9, 5, 12, p[1]);
        if ((x / 58) % 2 < 1) {
          const crystal = spirit ? "#75e2c3" : wind ? "#9edfec" : "#728fc0";
          this.rect(x + 13, 185 - (x % 17), 5, 25, crystal);
          this.rect(x + 15, 180 - (x % 17), 2, 22, "#d5f7ef");
        }
      }
    } else if (harvest) {
      for (let x = 0; x < 640; x += 13) {
        const sway = Math.round(Math.sin(now / 310 + x) * 2);
        this.rect(x + 5 + sway, 176, 2, 48, "#75612f");
        this.rect(x + 1 + sway, 168 + (x % 9), 7, 11, "#d5b451");
        this.rect(x + 7 + sway, 172 + (x % 7), 5, 9, "#f0cf69");
      }
      if (tone.includes("granary")) {
        for (let x = 0; x < 640; x += 96) {
          this.rect(x, 105, 13, 119, "#38291f");
          this.rect(x + 4, 105, 5, 119, "#705238");
          this.rect(x, 121, 96, 8, "#4b3526");
        }
      } else {
        this.rect(0, 151, 640, 4, "#e9cb75");
        for (let x = 20; x < 640; x += 86) {
          this.rect(x, 137, 54, 5, "#7f6842");
          this.rect(x + 4, 142, 4, 27, "#5a4932");
          this.rect(x + 47, 142, 4, 27, "#5a4932");
        }
      }
    } else if (spirit) {
      for (let x = -15; x < 640; x += 92) {
        const trunk = 17 + (x % 3) * 4;
        this.rect(x + 28, 113, trunk, 111, "#183f3d");
        this.rect(x + 33, 123, 5, 101, "#2d6658");
        this.rect(x, 106 + (x % 19), 78, 46, "#1b5447");
        this.rect(x + 12, 94 + (x % 17), 51, 45, "#33795e");
        this.rect(x + 28, 91 + (x % 11), 24, 17, "#69b18a");
      }
      for (let x = 32; x < 640; x += 73) {
        const glow = 0.45 + Math.sin(now / 280 + x) * 0.18;
        ctx.save();
        ctx.globalAlpha = glow;
        this.rect(x, 196, 8, 22, "#b3f5d4");
        this.rect(x - 4, 191, 16, 7, "#75d7b4");
        ctx.restore();
      }
    } else if (wind) {
      for (let x = -40; x < 680; x += 116) {
        const drift = (Math.floor(now / 75) + x) % 32;
        this.rect(x + drift, 116 + (x % 31), 74, 12, "#c6e0e2");
        this.rect(x + 14 + drift, 108 + (x % 31), 42, 12, "#e5f1e9");
        this.rect(x + 8 + drift, 128 + (x % 31), 58, 5, "#789daa");
      }
      for (let x = 24; x < 640; x += 102) {
        this.rect(x, 151, 16, 73, "#455e6d");
        this.rect(x - 8, 145, 32, 8, "#9eb3b5");
        this.rect(x - 4, 153, 24, 5, "#6f8790");
        this.rect(x + 6, 164, 4, 38, "#b9c7c1");
      }
      if (tone === "windBoss") {
        this.rect(258, 45, 124, 9, "#769dac");
        this.rect(276, 54, 88, 92, "#29485b");
        this.rect(288, 67, 64, 70, "#79a9b5");
        this.rect(298, 78, 44, 50, "#d2ece7");
      }
    } else {
      this.rect(0, 178, 640, 46, "#285a57");
      for (let x = -60; x < 700; x += 140) {
        ctx.fillStyle = "#285b68";
        ctx.beginPath();
        ctx.moveTo(x, 180);
        ctx.lineTo(x + 70, 92 + (x % 37));
        ctx.lineTo(x + 140, 180);
        ctx.fill();
      }
      for (let x = 0; x < 640; x += 80) {
        this.rect(x + 9, 183, 11, 43, "#1a433d");
        this.rect(x, 161 + (x % 21), 32, 37, "#276650");
        this.rect(x + 7, 153 + (x % 21), 22, 34, "#39805f");
      }
    }
  }

  drawBattleEnemy(sprite, x, y, scale = 1, now = 0, hurt = false) {
    const ctx = this.ctx;
    const bob = Math.sin(now / 280 + x) * 2;
    if (ENEMY_CELLS[sprite] !== undefined && this.assetReady("enemies")) {
      const index = ENEMY_CELLS[sprite];
      const sourceX = (index % 8) * 192;
      const sourceY = Math.floor(index / 8) * 160;
      ctx.save();
      ctx.globalAlpha = hurt && Math.floor(now / 45) % 2 ? 0.35 : 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.assets.enemies,
        sourceX,
        sourceY,
        192,
        160,
        Math.round(x - 96 * scale),
        Math.round(y + bob - 86 * scale),
        Math.round(192 * scale),
        Math.round(160 * scale),
      );
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    if (hurt && Math.floor(now / 45) % 2) ctx.globalAlpha = 0.35;
    const p = (xx, yy, w, h, color) =>
      this.rect(xx * scale, yy * scale, w * scale, h * scale, color);
    if (sprite === "slime") {
      p(-18, 13, 36, 5, "#172637");
      p(-17, 3, 34, 14, "#4ebbd2");
      p(-13, -6, 26, 17, "#62d2df");
      p(-6, -12, 12, 9, "#86eaf0");
      p(-8, 1, 4, 5, "#163247");
      p(5, 1, 4, 5, "#163247");
      p(-2, 8, 6, 2, "#24718c");
      p(-9, -6, 7, 3, "#b4f6f0");
    } else if (sprite === "mouse") {
      p(-20, 12, 38, 5, "#1a2834");
      p(-13, -7, 27, 22, "#9b6254");
      p(-18, -15, 11, 12, "#733f49");
      p(7, -15, 11, 12, "#733f49");
      p(-15, -12, 5, 5, "#d89c89");
      p(10, -12, 5, 5, "#d89c89");
      p(-7, -2, 4, 4, "#fff2b0");
      p(4, -2, 4, 4, "#fff2b0");
      p(-2, 5, 5, 4, "#3d2731");
      p(-23, -1, 8, 3, "#d4b29b");
      p(15, -1, 8, 3, "#d4b29b");
    } else if (sprite === "bat") {
      p(-28, -7, 20, 7, "#684f82");
      p(-32, -15, 18, 9, "#8a6ba0");
      p(8, -7, 20, 7, "#684f82");
      p(14, -15, 18, 9, "#8a6ba0");
      p(-11, -12, 22, 27, "#38334f");
      p(-7, -17, 5, 7, "#27263d");
      p(2, -17, 5, 7, "#27263d");
      p(-6, -6, 4, 4, "#f1d35f");
      p(3, -6, 4, 4, "#f1d35f");
      p(-3, 2, 7, 4, "#aa5479");
    } else if (sprite === "wisp") {
      p(-15, -16, 30, 31, "#5790a5");
      p(-11, -22, 22, 19, "#79c6d0");
      p(-6, -27, 12, 11, "#b0edf0");
      p(-8, -9, 5, 4, "#192b43");
      p(3, -9, 5, 4, "#192b43");
      p(-4, 1, 9, 3, "#31596c");
      p(-16, 15, 7, 7, "#3b6f86");
      p(9, 15, 7, 7, "#3b6f86");
    } else if (sprite === "crab") {
      p(-24, 12, 48, 7, "#1b2834");
      p(-17, -8, 34, 24, "#8b6a55");
      p(-12, -14, 24, 11, "#b29068");
      p(-29, -5, 13, 10, "#aa765c");
      p(16, -5, 13, 10, "#aa765c");
      p(-30, -12, 9, 9, "#c29168");
      p(21, -12, 9, 9, "#c29168");
      p(-8, -6, 4, 4, "#182a35");
      p(4, -6, 4, 4, "#182a35");
      p(-15, 17, 5, 7, "#4b3d3a");
      p(10, 17, 5, 7, "#4b3d3a");
    } else if (sprite === "sprout") {
      p(-19, 10, 38, 8, "#233028");
      p(-16, -9, 32, 25, "#837640");
      p(-11, -19, 22, 15, "#aa9d50");
      p(-28, -27, 25, 14, "#78964d");
      p(3, -31, 27, 16, "#5f8741");
      p(-8, -5, 5, 5, "#342d2d");
      p(4, -5, 5, 5, "#342d2d");
      p(-4, 5, 9, 3, "#4d402f");
    } else if (sprite === "crow") {
      p(-25, 15, 50, 7, "#192331");
      p(-18, -15, 36, 33, "#273244");
      p(-37, -9, 22, 22, "#3b4d5e");
      p(15, -9, 22, 22, "#3b4d5e");
      p(-12, -27, 24, 17, "#1d2736");
      p(-7, -18, 5, 5, "#f2d15a");
      p(3, -18, 5, 5, "#f2d15a");
      p(15, -11, 18, 6, "#c68a38");
    } else if (sprite === "mud") {
      p(-28, 21, 56, 8, "#1d2929");
      p(-22, -23, 44, 48, "#715b43");
      p(-35, -9, 16, 34, "#594a3a");
      p(19, -9, 16, 34, "#594a3a");
      p(-12, -12, 8, 6, "#f0cb5a");
      p(4, -12, 8, 6, "#f0cb5a");
      p(-13, 5, 26, 5, "#3d342e");
      p(-5, -21, 4, 18, "#9a7b52");
    } else if (sprite === "flour") {
      p(-25, 20, 50, 6, "#18242d");
      p(-20, -27, 40, 48, "#d9d4c0");
      p(-31, 6, 62, 17, "#aaa892");
      p(-11, -15, 7, 6, "#5c5363");
      p(4, -15, 7, 6, "#5c5363");
      p(-7, 0, 14, 4, "#827986");
      p(-28, -17, 10, 8, "#ede9d7");
      p(18, -10, 12, 9, "#ede9d7");
    } else if (sprite === "scarecrow") {
      p(-29, 27, 58, 7, "#17231f");
      p(-5, -37, 10, 68, "#6f5036");
      p(-38, -20, 76, 10, "#8c6b43");
      p(-22, -42, 44, 29, "#9c814a");
      p(-11, -32, 7, 7, "#f0c84f");
      p(5, -32, 7, 7, "#f0c84f");
      p(-10, -18, 20, 5, "#483928");
      p(-30, -7, 60, 30, "#59643a");
      p(-39, 15, 20, 9, "#8c793e");
      p(19, 15, 20, 9, "#8c793e");
    } else if (sprite === "root") {
      p(-27, 23, 54, 8, "#161d1a");
      p(-20, -30, 40, 56, "#5e4b2e");
      p(-34, -25, 15, 50, "#493d28");
      p(19, -25, 15, 50, "#493d28");
      p(-11, -17, 7, 6, "#efce4d");
      p(4, -17, 7, 6, "#efce4d");
      p(-7, -3, 14, 4, "#2c281f");
      p(-27, 8, 54, 10, "#76613a");
    } else if (sprite === "blightHeart") {
      p(-58, 38, 116, 10, "#100f0b");
      p(-45, -42, 90, 82, "#654b23");
      p(-32, -56, 64, 34, "#84632b");
      p(-58, -20, 24, 58, "#4b3d21");
      p(34, -20, 24, 58, "#4b3d21");
      p(-22, -37, 14, 12, "#f0d14d");
      p(8, -37, 14, 12, "#f0d14d");
      p(-29, -10, 58, 9, "#2b2418");
      p(-23, -4, 46, 22, "#b69747");
      for (let i = 0; i < 6; i += 1) p(-18 + i * 7, -2, 3, 16, "#5e4827");
      p(-8, 20, 16, 18, "#2f261a");
    } else if (sprite === "mushroom") {
      p(-28, 22, 56, 7, "#152329");
      p(-18, -2, 36, 27, "#705c76");
      p(-34, -31, 68, 34, "#ad7895");
      p(-23, -24, 11, 8, "#efc7b8");
      p(9, -20, 10, 7, "#efc7b8");
      p(-10, 4, 7, 6, "#f2dd72");
      p(4, 4, 7, 6, "#f2dd72");
      p(-5, 15, 11, 4, "#493f51");
    } else if (sprite === "stream" || sprite === "rippleGuardian") {
      const body = sprite === "rippleGuardian" ? "#3d8994" : "#55b4c3";
      p(-32, 27, 64, 7, "#10242d");
      p(-27, -16, 54, 46, body);
      p(-18, -35, 36, 25, "#99ece4");
      p(-12, -12, 8, 7, "#23465b");
      p(5, -12, 8, 7, "#23465b");
      p(-8, 4, 16, 5, "#306675");
      p(-38, 13, 24, 9, "#438ba0");
      p(14, 13, 24, 9, "#438ba0");
    } else if (sprite === "galeWolf" || sprite === "gustGuardian") {
      const body = sprite === "gustGuardian" ? "#568d69" : "#617d73";
      p(-38, 25, 76, 8, "#13242a");
      p(-29, -12, 58, 40, body);
      p(-25, -32, 18, 25, "#8fc79b");
      p(7, -32, 18, 25, "#8fc79b");
      p(-13, -9, 8, 7, "#f3dc69");
      p(6, -9, 8, 7, "#f3dc69");
      p(-8, 6, 16, 6, "#243c40");
      p(25, 7, 30, 10, "#b9e3a2");
      p(-40, 14, 17, 15, "#45665f");
    } else if (sprite === "prismBeetle" || sprite === "prismGuardian") {
      const shell = sprite === "prismGuardian" ? "#62518f" : "#426c77";
      p(-38, 25, 76, 8, "#132128");
      p(-29, -19, 58, 46, shell);
      p(-18, -36, 36, 22, "#8bc8b7");
      p(-25, -8, 50, 7, "#efd66b");
      p(-43, 10, 24, 10, "#835989");
      p(19, 10, 24, 10, "#4e91a3");
      p(-12, -26, 7, 6, "#172d3a");
      p(5, -26, 7, 6, "#172d3a");
    } else if (sprite === "hollowMask" || sprite === "muteTotem") {
      const body = sprite === "muteTotem" ? "#405a61" : "#d4cfba";
      p(-30, 29, 60, 8, "#111f28");
      p(-25, -38, 50, 69, body);
      p(-15, -20, 11, 14, "#172839");
      p(5, -20, 11, 14, "#172839");
      p(-13, 7, 26, 7, "#6a5266");
      p(-37, 18, 74, 12, "#30464c");
      if (sprite === "muteTotem") {
        p(-5, -52, 10, 18, "#d2b95a");
        p(-13, -49, 26, 8, "#78c7ad");
      }
    } else if (sprite === "echoArmor") {
      p(-35, 31, 70, 8, "#101d24");
      p(-27, -26, 54, 60, "#5f7580");
      p(-20, -43, 40, 23, "#91a6a9");
      p(-12, -23, 24, 8, "#182c39");
      p(-43, -5, 18, 39, "#40555f");
      p(25, -5, 18, 39, "#40555f");
      p(-17, 9, 34, 7, "#d0b65c");
    } else if (sprite === "hushAvatar") {
      p(-64, 42, 128, 11, "#071117");
      p(-51, -39, 102, 83, "#244b59");
      p(-38, -58, 76, 28, "#397873");
      p(-62, -18, 25, 59, "#183944");
      p(37, -18, 25, 59, "#183944");
      p(-25, -33, 16, 13, "#a8f2d2");
      p(9, -33, 16, 13, "#a8f2d2");
      p(-30, -6, 60, 9, "#102730");
      p(-21, 1, 42, 19, "#7cc7aa");
      p(-8, 23, 16, 19, "#0e2730");
    } else if (sprite === "cloudHare") {
      p(-30, 25, 60, 8, "#132430");
      p(-23, -15, 46, 43, "#d8e6e0");
      p(-20, -43, 14, 32, "#a8cbd0");
      p(6, -45, 14, 34, "#a8cbd0");
      p(-12, -10, 7, 6, "#34536c");
      p(6, -10, 7, 6, "#34536c");
      p(-36, 13, 72, 13, "#82b7c5");
    } else if (sprite === "bladeHawk" || sprite === "arenaRaptor") {
      const body = sprite === "arenaRaptor" ? "#6c6994" : "#527b8e";
      p(-35, 25, 70, 8, "#13232d");
      p(-24, -24, 48, 52, body);
      p(-48, -13, 27, 42, "#84b8c1");
      p(21, -13, 27, 42, "#84b8c1");
      p(-15, -43, 30, 24, "#dce9dc");
      p(-8, -28, 7, 6, "#f2d566");
      p(16, -17, 34, 7, "#bad8d8");
    } else if (sprite === "windArmor" || sprite === "arenaBulwark") {
      const body = sprite === "arenaBulwark" ? "#777184" : "#5a7481";
      p(-37, 33, 74, 8, "#111f29");
      p(-28, -32, 56, 68, body);
      p(-21, -48, 42, 23, "#9db4ba");
      p(-13, -28, 26, 9, "#183443");
      p(-47, -9, 20, 44, "#3c5867");
      p(27, -9, 20, 44, "#3c5867");
      p(-17, 13, 34, 8, "#e2c45f");
    } else if (sprite === "stormDjinn" || sprite === "arenaMage") {
      const body = sprite === "arenaMage" ? "#77638e" : "#58758f";
      p(-34, 31, 68, 8, "#112330");
      p(-26, -36, 52, 69, body);
      p(-40, -45, 25, 25, "#92c9cf");
      p(15, -49, 25, 27, "#92c9cf");
      p(-14, -25, 9, 8, "#eadc70");
      p(5, -25, 9, 8, "#eadc70");
      p(-18, -5, 36, 8, "#263f58");
      p(-43, 14, 86, 16, "#304f68");
    } else if (sprite === "katoshiDuel") {
      p(-28, 31, 56, 8, "#12202e");
      p(-19, -38, 38, 71, "#9ac9e5");
      p(-18, -52, 36, 22, "#4a3038");
      p(-12, -34, 24, 16, "#efbd98");
      p(-9, -29, 6, 5, "#25364b");
      p(4, -29, 6, 5, "#25364b");
      p(-22, 10, 44, 20, "#35416a");
      p(25, -43, 5, 70, "#edf3ea");
      p(20, -48, 15, 10, "#82cadf");
    } else if (sprite === "stormEye") {
      p(-31, -36, 62, 8, "#8fc3ce");
      p(-40, -28, 80, 46, "#557d96");
      p(-32, -21, 64, 32, "#b7dadc");
      p(-13, -15, 26, 24, "#f2d568");
      p(-5, -11, 11, 17, "#29495d");
      p(-51, -11, 15, 7, "#8ed5da");
      p(-59, -3, 13, 7, "#5d96aa");
      p(36, 7, 15, 7, "#8ed5da");
      p(46, -1, 13, 7, "#5d96aa");
      p(-34, 18, 68, 8, "#29495d");
    } else if (sprite === "tempestMirror") {
      p(-69, 47, 138, 9, "#08141f");
      // Four stepped arcs keep the silhouette circular while retaining hard pixel edges.
      p(-34, -67, 68, 8, "#b0d9dd");
      p(-49, -59, 98, 8, "#6d9aaa");
      p(-59, -48, 12, 71, "#36586d");
      p(47, -48, 12, 71, "#36586d");
      p(-48, 23, 96, 11, "#294b61");
      p(-39, 34, 78, 7, "#173245");
      // Uneven glass facets and a coiling light form the heart of the wind mirror.
      p(-44, -45, 88, 64, "#a8d7d8");
      p(-34, -37, 34, 29, "#cbe9e2");
      p(0, -37, 34, 29, "#8ec7d1");
      p(-34, -8, 26, 20, "#83bbc8");
      p(-8, -8, 42, 20, "#bfe5df");
      p(-8, -29, 24, 9, "#f2d66b");
      p(7, -20, 17, 9, "#f7e79b");
      p(-2, -12, 17, 9, "#e8f3dc");
      p(-12, -4, 17, 8, "#7cb7c8");
      // Detached vanes make the body feel suspended inside a moving storm.
      p(-83, -36, 25, 7, "#8ed5da");
      p(-91, -26, 31, 7, "#4f8399");
      p(-79, 23, 24, 7, "#8ed5da");
      p(58, -20, 31, 7, "#4f8399");
      p(57, -30, 24, 7, "#8ed5da");
      p(56, 28, 27, 7, "#6aa4b5");
    } else if (sprite === "inkSlime") {
      p(-28, 25, 56, 8, "#111628");
      p(-25, 5, 50, 24, "#332b57");
      p(-20, -18, 40, 31, "#625597");
      p(-12, -32, 24, 19, "#9a88cf");
      p(-10, -10, 7, 7, "#eefaff");
      p(4, -10, 7, 7, "#eefaff");
      p(-4, 4, 9, 4, "#241f3d");
      p(-32, 18, 10, 8, "#4f427a");
      p(22, 18, 10, 8, "#4f427a");
    } else if (sprite === "runeOwl") {
      p(-36, 28, 72, 8, "#111827");
      p(-29, -23, 58, 53, "#56628b");
      p(-48, -15, 23, 44, "#7c75aa");
      p(25, -15, 23, 44, "#7c75aa");
      p(-20, -43, 40, 26, "#c4badc");
      p(-15, -31, 12, 12, "#f0d56d");
      p(3, -31, 12, 12, "#f0d56d");
      p(-10, -28, 6, 6, "#293650");
      p(5, -28, 6, 6, "#293650");
      p(-5, -14, 10, 8, "#d8b75a");
      p(-3, -11, 6, 5, "#392f4a");
    } else if (sprite === "bookMimic" || sprite === "falseIndex") {
      const cover = sprite === "falseIndex" ? "#8d4e70" : "#4d356a";
      p(-42, 31, 84, 8, "#111524");
      p(-36, -38, 72, 70, cover);
      p(-29, -31, 58, 56, "#e1d2ad");
      p(-5, -36, 10, 64, "#bc9650");
      p(-22, -15, 12, 12, "#312c49");
      p(10, -15, 12, 12, "#312c49");
      p(-13, 7, 26, 7, "#7d4f68");
      p(-52, 7, 17, 27, "#79609b");
      p(35, 7, 17, 27, "#79609b");
      if (sprite === "falseIndex") {
        p(-26, -52, 52, 10, "#a18ed1");
        p(-6, -59, 12, 21, "#f1d66e");
      }
    } else if (sprite === "logicGolem") {
      p(-43, 37, 86, 8, "#101521");
      p(-34, -40, 68, 80, "#606579");
      p(-50, -13, 20, 51, "#444a60");
      p(30, -13, 20, 51, "#444a60");
      p(-25, -54, 50, 23, "#8f91a5");
      p(-16, -36, 13, 10, "#8de0dc");
      p(4, -36, 13, 10, "#8de0dc");
      p(-15, -4, 30, 9, "#252a3f");
      p(-11, 9, 22, 9, "#d7c36b");
      p(-4, 11, 8, 5, "#f7edb0");
    } else if (sprite === "amnesiaLibrarian") {
      p(-70, 48, 140, 10, "#090a16");
      p(-55, -44, 110, 94, "#44365f");
      p(-43, -66, 86, 31, "#806da4");
      p(-65, -18, 28, 64, "#2d2745");
      p(37, -18, 28, 64, "#2d2745");
      p(-28, -38, 18, 14, "#f1d46d");
      p(10, -38, 18, 14, "#f1d46d");
      p(-32, -10, 64, 10, "#17182a");
      p(-25, 3, 50, 20, "#a796c7");
      p(-8, 25, 16, 23, "#1a1a30");
      p(-78, -51, 20, 89, "#d5c89e");
      p(-73, -46, 10, 76, "#6f5c8e");
      p(58, -51, 20, 89, "#d5c89e");
      p(63, -46, 10, 76, "#6f5c8e");
      p(-9, -78, 18, 20, "#f0d56c");
      p(-20, -72, 40, 8, "#9d8ac5");
    } else if (sprite === "shade") {
      p(-20, 15, 40, 7, "#100e1c");
      p(-16, -18, 32, 36, "#302a48");
      p(-22, 5, 44, 16, "#211d36");
      p(-10, -13, 7, 6, "#e55784");
      p(3, -13, 7, 6, "#e55784");
      p(-5, -2, 10, 3, "#705071");
      p(-22, 17, 7, 7, "#171527");
      p(15, 17, 7, 7, "#171527");
    } else if (sprite === "moth") {
      p(-36, -18, 28, 40, "#705385");
      p(8, -18, 28, 40, "#705385");
      p(-31, -11, 19, 27, "#a4779b");
      p(12, -11, 19, 27, "#a4779b");
      p(-9, -24, 18, 48, "#34314d");
      p(-6, -28, 4, 8, "#d4b2d4");
      p(2, -28, 4, 8, "#d4b2d4");
      p(-6, -14, 4, 5, "#ffe269");
      p(2, -14, 4, 5, "#ffe269");
    } else if (sprite === "orc") {
      p(-27, 20, 54, 8, "#141525");
      p(-22, -12, 44, 37, "#663b57");
      p(-16, -27, 32, 22, "#87516d");
      p(-20, -25, 8, 11, "#d7c4a3");
      p(12, -25, 8, 11, "#d7c4a3");
      p(-10, -18, 6, 6, "#ffd45c");
      p(4, -18, 6, 6, "#ffd45c");
      p(-5, -6, 10, 5, "#362538");
      p(-34, -4, 14, 10, "#4c3048");
      p(20, -4, 14, 10, "#4c3048");
      p(24, -24, 7, 39, "#8c6947");
      p(20, -29, 15, 8, "#c0a46a");
    } else if (sprite === "smileEater") {
      p(-58, 31, 116, 11, "#090710");
      p(-47, -26, 94, 64, "#2b1838");
      p(-36, -50, 72, 40, "#4a2453");
      p(-52, -11, 22, 40, "#3b2047");
      p(30, -11, 22, 40, "#3b2047");
      p(-25, -40, 15, 11, "#ef5f8e");
      p(10, -40, 15, 11, "#ef5f8e");
      p(-29, -21, 58, 10, "#170d23");
      p(-23, -17, 46, 18, "#efe4c4");
      for (let i = 0; i < 7; i += 1) p(-20 + i * 7, -16, 3, 13, "#382037");
      p(-8, 5, 16, 23, "#12101d");
      p(-4, 10, 8, 13, "#d94c80");
      p(-55, 6, 12, 35, "#1c1528");
      p(43, 6, 12, 35, "#1c1528");
    }
    ctx.restore();
  }

  drawPartyBack(type, x, y, frame = 0, hurt = false) {
    const ctx = this.ctx;
    if (PARTY_ROWS[type] !== undefined && this.assetReady("party")) {
      const animationFrame = Math.floor(frame / 320) % 4;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = hurt && Math.floor(frame / 45) % 2 ? 0.35 : 1;
      ctx.translate(0, Math.sin(frame / 350 + x) * 1.5);
      ctx.drawImage(
        this.assets.party,
        (DIRECTION_COLUMNS.up * 4 + animationFrame) * FIELD_SPRITE_SOURCE,
        PARTY_ROWS[type] * FIELD_SPRITE_SOURCE,
        FIELD_SPRITE_SOURCE,
        FIELD_SPRITE_SOURCE,
        Math.round(x - 20),
        Math.round(y - 28),
        40,
        40,
      );
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y + Math.sin(frame / 350 + x) * 1.5);
    if (hurt && Math.floor(frame / 45) % 2) ctx.globalAlpha = 0.35;
    const main =
      type === "kumi" ? "#4f9fce" : type === "mirei" ? "#f0c85c" : type === "sarina" ? "#71c7a8" : type === "katoshi" ? "#9ac9e5" : type === "manaka" ? "#7769b8" : "#65c3dd";
    const dark =
      type === "kumi" ? "#172d53" : type === "mirei" ? "#78483b" : type === "sarina" ? "#354d68" : type === "katoshi" ? "#35416a" : type === "manaka" ? "#303657" : "#193c5c";
    const hair =
      type === "kumi" ? "#3d2931" : type === "mirei" ? "#49342c" : type === "sarina" ? "#3f3036" : type === "katoshi" ? "#4a3038" : type === "manaka" ? "#2b2636" : "#293243";
    this.rect(-8, -27, 16, 12, hair);
    this.rect(-10, -19, 20, 9, main);
    this.rect(-9, -10, 18, 19, dark);
    this.rect(-6, 7, 5, 10, "#1b2332");
    this.rect(2, 7, 5, 10, "#1b2332");
    this.rect(-8, -7, 16, 4, "#e9c664");
    if (type === "kumi") {
      this.rect(11, -25, 3, 39, "#c7a55c");
      this.rect(8, -29, 9, 7, "#dce7e3");
    } else if (type === "mirei") {
      this.rect(10, -11, 10, 5, "#64666b");
      this.rect(13, -16, 4, 11, "#d7d9dc");
      this.rect(9, -6, 12, 4, "#b96d4b");
    } else if (type === "sarina") {
      this.rect(11, -19, 4, 30, "#d7b650");
      this.rect(7, -23, 12, 9, "#73c6ac");
      this.rect(11, -21, 4, 5, "#eff7a4");
    } else if (type === "katoshi") {
      this.rect(11, -25, 3, 39, "#e4ece8");
      this.rect(8, -29, 9, 7, "#81c9df");
      this.rect(-14, -9, 6, 17, "#8bbdd8");
    } else if (type === "manaka") {
      this.rect(8, -11, 13, 10, "#4a3568");
      this.rect(10, -10, 5, 8, "#f1e5c7");
      this.rect(15, -10, 5, 8, "#d9cba9");
      this.rect(14, -9, 2, 6, "#efd36d");
    } else {
      this.rect(9, -14, 7, 20, "#a6b7c1");
      this.rect(10, -17, 5, 5, "#e9d070");
    }
    ctx.restore();
  }

  drawHitEffect(x, y, age, element = "physical") {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, age / 260));
    const colors = {
      physical: ["#fff7d0", "#f1c85e"],
      light: ["#ffffff", "#ffe778"],
      fire: ["#fff1a1", "#ff744f"],
      wind: ["#e5ffff", "#69d7df"],
      water: ["#dff8ff", "#4ca6db"],
      earth: ["#f5d29a", "#9d7748"],
      dark: ["#f0c9ff", "#9b5fc4"],
    };
    const [bright, color] = colors[element] || colors.physical;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    const spread = Math.round(progress * 24);
    for (let i = 0; i < 7; i += 1) {
      this.rect(x - 29 + i * 8 + spread / 3, y + 25 - i * 8, 10, 3, i % 2 ? bright : color);
      if (i < 5) this.rect(x - 22 + i * 8, y + 29 - i * 8, 5, 2, "#ffffff");
    }
    for (let i = 0; i < 8; i += 1) {
      const direction = i % 2 ? -1 : 1;
      const px = x + direction * (10 + spread + (i * 7) % 18);
      const py = y - 22 + ((i * 13) % 43) - Math.round(progress * 12);
      this.rect(px, py, i % 3 === 0 ? 4 : 2, i % 3 === 0 ? 4 : 2, i % 2 ? bright : color);
    }
    ctx.restore();
  }

  drawSkillCutIn(actorId, actorName, skillName, progress = 0) {
    const ctx = this.ctx;
    const t = Math.max(0, Math.min(1, progress));
    const enter = Math.min(1, t / 0.18);
    const exit = Math.max(0, (t - 0.78) / 0.22);
    const easeIn = 1 - (1 - enter) ** 3;
    const offset = Math.round((1 - easeIn) * 700 - exit * 760);
    const accent = {
      hero: "#75d8ee",
      kumi: "#70bee7",
      mirei: "#f4c95f",
      sarina: "#7fe0bc",
      katoshi: "#9be6ef",
      manaka: "#b5a5ef",
    }[actorId] || "#78d5eb";
    ctx.save();
    ctx.globalAlpha = Math.min(1, enter * 1.8, (1 - t) * 5);
    ctx.fillStyle = "rgba(2,8,20,.74)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.translate(offset, 0);
    ctx.fillStyle = "#061226";
    ctx.beginPath();
    ctx.moveTo(-40, 79);
    ctx.lineTo(this.width + 40, 64);
    ctx.lineTo(this.width + 40, 212);
    ctx.lineTo(-40, 227);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-30, 91);
    ctx.lineTo(this.width + 30, 77);
    ctx.lineTo(this.width + 30, 190);
    ctx.lineTo(-30, 205);
    ctx.closePath();
    ctx.clip();
    if (this.assetReady(`cutin-${actorId}`)) {
      ctx.drawImage(this.assets[`cutin-${actorId}`], 0, 91, this.width, 72);
      const shade = ctx.createLinearGradient(0, 0, this.width, 0);
      shade.addColorStop(0, "rgba(2,8,20,.82)");
      shade.addColorStop(0.26, "rgba(2,8,20,.12)");
      shade.addColorStop(0.72, "rgba(2,8,20,.05)");
      shade.addColorStop(1, "rgba(2,8,20,.72)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 91, this.width, 72);
    } else {
      const fallback = ctx.createLinearGradient(0, 91, this.width, 163);
      fallback.addColorStop(0, "#102b4d");
      fallback.addColorStop(0.52, accent);
      fallback.addColorStop(1, "#18213e");
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 91, this.width, 72);
    }
    ctx.restore();
    this.rect(0, 77, this.width, 4, "#10233d");
    this.rect(0, 81, this.width, 3, accent);
    this.rect(0, 190, this.width, 3, "#f1d271");
    this.rect(0, 193, this.width, 4, "#10233d");
    this.rect(22, 163, 207, 27, "rgba(3,12,27,.86)");
    this.rect(26, 167, 6, 18, accent);
    this.text(actorName, 40, 165, "#e8faff", 13);
    this.text(skillName, this.width - 22, 164, "#fff0a3", 19, "right");
    for (let spark = 0; spark < 18; spark += 1) {
      const sx = (spark * 73 + Math.round(t * 820)) % 680 - 20;
      const sy = 71 + ((spark * 31) % 135);
      this.rect(sx, sy, spark % 5 === 0 ? 5 : 2, spark % 5 === 0 ? 2 : 1, spark % 2 ? accent : "#fff2a5");
    }
    ctx.restore();
  }

  drawPortrait(canvas, type) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const old = this.ctx;
    this.ctx = ctx;
    const portraitId = `portrait-${type}`;
    if (this.assetReady(portraitId)) {
      ctx.drawImage(this.assets[portraitId], 0, 0, canvas.width, canvas.height);
      const vignette = ctx.createLinearGradient(0, 0, 0, canvas.height);
      vignette.addColorStop(0, "rgba(5,18,36,0)");
      vignette.addColorStop(0.72, "rgba(5,18,36,.04)");
      vignette.addColorStop(1, "rgba(4,14,29,.42)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.rect(0, 0, canvas.width, 2, "#d7bd68");
      this.rect(0, canvas.height - 2, canvas.width, 2, "#2b6e91");
      this.ctx = old;
      return;
    }
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#74cbe2");
    bg.addColorStop(1, "#19375b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 10; i += 1)
      this.rect((i * 19) % 84, (i * 31) % 84, 2, 2, "#e7faff");

    if (["system", "light"].includes(type)) {
      this.rect(15, 15, 54, 54, type === "light" ? "#eafcff" : "#172c49");
      this.rect(21, 21, 42, 42, type === "light" ? "#8fdcf0" : "#274d71");
      this.rect(30, 30, 24, 24, "#f7d96f");
      this.rect(38, 20, 8, 44, "#fff5ad");
      this.rect(20, 38, 44, 8, "#fff5ad");
      this.ctx = old;
      return;
    }
    const kumi = type === "kumi";
    const mirei = type === "mirei";
    const sarina = type === "sarina";
    const katoshi = type === "katoshi";
    const manaka = type === "manaka";
    const hair = kumi ? "#3e2831" : mirei ? "#49342c" : sarina ? "#3f3036" : katoshi ? "#4a3038" : manaka ? "#2b2636" : "#293243";
    const skin = "#efbd99";
    const main = kumi ? "#4f9fce" : mirei ? "#f0c75a" : sarina ? "#71c7a8" : katoshi ? "#9ac9e5" : manaka ? "#7769b8" : "#64c2dc";
    this.rect(12, 67, 60, 17, "#10213a");
    this.rect(19, 54, 46, 30, main);
    this.rect(22, 18, 42, 44, hair);
    this.rect(26, 23, 34, 37, skin);
    this.rect(21, 23, 10, 29, hair);
    this.rect(55, 18, 10, 33, hair);
    this.rect(31, 37, 5, 5, "#253043");
    this.rect(49, 37, 5, 5, "#253043");
    this.rect(38, 51, 10, 3, kumi ? "#b85f72" : mirei ? "#c5656f" : sarina ? "#bd6575" : katoshi ? "#b55f70" : "#a95869");
    this.rect(28, 31, 10, 3, hair);
    this.rect(47, 31, 10, 3, hair);
    this.rect(35, 58, 15, 8, skin);
    this.rect(34, 65, 18, 5, "#f0cf6d");
    if (kumi) {
      this.rect(54, 13, 7, 8, "#61c4df");
      this.rect(58, 16, 7, 4, "#f1d36c");
    } else if (mirei) {
      this.rect(18, 62, 48, 7, "#fff0b5");
      this.rect(57, 54, 10, 8, "#b96c4b");
    } else if (sarina) {
      this.rect(17, 64, 50, 6, "#39566b");
      this.rect(57, 51, 8, 15, "#d8b750");
      this.rect(54, 48, 14, 7, "#77c9ad");
    } else if (katoshi) {
      this.rect(17, 64, 50, 6, "#35416a");
      this.rect(57, 49, 5, 20, "#edf3e8");
      this.rect(54, 46, 12, 7, "#82cadf");
    } else if (manaka) {
      this.rect(17, 64, 50, 6, "#303657");
      this.rect(56, 50, 12, 14, "#4a3568");
      this.rect(58, 52, 4, 10, "#f1e5c7");
      this.rect(62, 52, 4, 10, "#d9cba9");
      this.rect(61, 53, 2, 8, "#efd36d");
    }
    this.ctx = old;
  }
}
