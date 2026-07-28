import { TILE } from "./data.js";

const TWO_PI = Math.PI * 2;

export class PixelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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

  drawTile(type, sx, sy, wx, wy, now = 0) {
    const x = Math.floor(sx);
    const y = Math.floor(sy);
    const phase = Math.floor(now / 450 + wx + wy) % 4;
    switch (type) {
      case TILE.GRASS:
        this.rect(x, y, 32, 32, (wx + wy) % 2 ? "#3f9b68" : "#459f6c");
        this.rect(x + 5 + ((wx * 7) % 16), y + 7 + ((wy * 5) % 13), 2, 5, "#277b55");
        this.rect(x + 20, y + 22, 5, 2, "#65bb77");
        break;
      case TILE.PATH:
        this.rect(x, y, 32, 32, "#c5a26b");
        this.rect(x + ((wx * 11) % 24), y + ((wy * 7) % 24), 5, 2, "#9c7b52");
        this.rect(x + 17, y + 24, 3, 2, "#e2c58b");
        break;
      case TILE.TREE:
      case TILE.ROOT:
        this.rect(x, y, 32, 32, type === TILE.ROOT ? "#193f3d" : "#287852");
        this.rect(x + 13, y + 20, 7, 12, "#69492f");
        this.rect(x + 3, y + 6, 26, 19, type === TILE.ROOT ? "#275a4f" : "#236d4c");
        this.rect(x + 7, y + 2, 18, 22, type === TILE.ROOT ? "#347765" : "#348b59");
        this.rect(x + 12, y + 5, 8, 6, type === TILE.ROOT ? "#55a184" : "#60aa69");
        this.rect(x + 2, y + 18, 5, 6, "#163f36");
        break;
      case TILE.WATER:
      case TILE.REEDS:
        this.rect(x, y, 32, 32, "#287aa3");
        this.rect(x, y + 7 + phase, 15, 2, "#55b8cf");
        this.rect(x + 17, y + 21 - phase, 11, 2, "#1c5c86");
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
        this.rect(x, y, 32, 32, "#626a72");
        this.rect(x, y + 15, 32, 2, "#424b55");
        this.rect(x + 14, y, 2, 15, "#414a54");
        this.rect(x + 24, y + 17, 2, 15, "#414a54");
        this.rect(x + 3, y + 3, 7, 2, "#858e92");
        break;
      case TILE.FLOOR:
        this.rect(x, y, 32, 32, "#b7b1a2");
        this.rect(x, y + 30, 32, 2, "#8e897e");
        this.rect(x + 30, y, 2, 32, "#8e897e");
        this.rect(x + 4, y + 4, 3, 2, "#d1cbbb");
        break;
      case TILE.WALL:
        this.rect(x, y, 32, 32, "#303946");
        this.rect(x, y + 15, 32, 3, "#182431");
        this.rect(x + ((wy % 2) ? 7 : 21), y, 3, 15, "#1e2936");
        this.rect(x + ((wy % 2) ? 21 : 7), y + 18, 3, 14, "#1e2936");
        this.rect(x + 3, y + 3, 10, 3, "#46505b");
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
        this.rect(x, y, 32, 32, "#459f6c");
        this.rect(x + 15, y + 14, 2, 13, "#246f4d");
        this.rect(x + 11, y + 11, 6, 5, "#f6d9ec");
        this.rect(x + 16, y + 9, 6, 6, "#f4a9cf");
        this.rect(x + 15, y + 12, 4, 4, "#ffe078");
        break;
      case TILE.ROOF:
        this.rect(x, y, 32, 32, "#356b91");
        for (let yy = 2; yy < 32; yy += 8) {
          this.rect(x, y + yy, 32, 3, "#1f4b70");
          this.rect(x + ((yy / 8) % 2) * 8, y + yy - 3, 14, 3, "#5592b4");
        }
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
        this.rect(x, y, 32, 32, "#3f805f");
        this.rect(x + 4, y + 10, 24, 19, "#65717a");
        this.rect(x + 8, y + 6, 15, 8, "#889399");
        this.rect(x + 5, y + 24, 22, 5, "#414d56");
        break;
      case TILE.MOSS:
        this.rect(x, y, 32, 32, "#356e55");
        this.rect(x + 4, y + 6, 5, 3, "#55a06d");
        this.rect(x + 17, y + 18, 10, 3, "#244f43");
        this.rect(x + 22, y + 5, 3, 6, "#6ab67a");
        break;
      case TILE.STAIRS:
        this.rect(x, y, 32, 32, "#4b5662");
        for (let i = 0; i < 5; i += 1) {
          this.rect(x + 4 + i * 2, y + 5 + i * 5, 24 - i * 4, 3, "#9a9c98");
          this.rect(x + 4 + i * 2, y + 8 + i * 5, 24 - i * 4, 2, "#303a45");
        }
        break;
      case TILE.SAND:
        this.rect(x, y, 32, 32, "#d3bb77");
        this.rect(x + 5, y + 8, 2, 2, "#ae945b");
        this.rect(x + 21, y + 22, 5, 2, "#ead596");
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
        this.rect(x, y, 32, 32, "#70818d");
        this.rect(x + 5, y + 2, 22, 5, "#adb8bb");
        this.rect(x + 9, y + 7, 14, 21, "#8e9ca1");
        this.rect(x + 5, y + 27, 22, 5, "#586873");
        break;
      case TILE.VOID:
      default:
        this.rect(x, y, 32, 32, "#080c14");
        break;
    }
  }

  drawCharacter(type, x, y, dir = "down", frame = 0, scale = 1, ghost = false) {
    const ctx = this.ctx;
    const s = scale;
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
    if (type === "guard") {
      p(5, 3, 15, 4, "#8598aa");
      p(8, 1, 9, 3, "#b6c5ca");
    }
    if (type === "child") {
      ctx.scale(0.86, 0.86);
    }
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
    } else if (type === "sign" || type === "board") {
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
    } else if (type === "boss") {
      this.rect(x + 2, y + 24, 28, 5, "#15101d");
      this.rect(x + 6, y + 13, 20, 13, "#291836");
      this.rect(x + 9, y + 7 + pulse, 14, 13, "#4c245e");
      this.rect(x + 11, y + 9 + pulse, 3, 3, "#ed5a88");
      this.rect(x + 19, y + 9 + pulse, 3, 3, "#ed5a88");
    } else if (type === "gather") {
      this.rect(x + 14, y + 15, 3, 14, "#2b694d");
      this.rect(x + 8, y + 14, 8, 5, "#75bb83");
      this.rect(x + 17, y + 10, 8, 6, "#99d49b");
      if (active) this.rect(x + 22, y + 5 + pulse, 3, 3, "#e5ffe5");
    } else if (["lever", "rope", "seal", "groveShrine"].includes(type)) {
      this.rect(x + 7, y + 21, 18, 8, "#444b55");
      this.rect(x + 10, y + 18, 12, 5, "#78828a");
      if (type === "lever") {
        this.rect(x + 15, y + 7, 3, 13, "#b88b50");
        this.rect(x + 13, y + 5, 7, 5, active ? "#6cd399" : "#d85c5c");
      } else if (type === "rope") {
        this.rect(x + 14, y + 4, 4, 20, "#b3945a");
        this.rect(x + 10, y + 7, 12, 3, "#d4b974");
      } else {
        this.rect(x + 12, y + 5 + pulse, 8, 17, active ? "#f2d871" : "#62c9e3");
        this.rect(x + 15, y + 3 + pulse, 3, 16, "#e4fbff");
      }
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
    if (tone.includes("Cave") || ["cave", "dungeon"].includes(tone)) {
      for (let x = 20; x < 640; x += 74) {
        const h = 24 + ((x * 7) % 45);
        this.rect(x, 0, 15, h, "#0a101a");
        this.rect(x + 3, h - 8, 9, 12, "#283747");
      }
    } else {
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
    ctx.save();
    ctx.translate(x, y + Math.sin(frame / 350 + x) * 1.5);
    if (hurt && Math.floor(frame / 45) % 2) ctx.globalAlpha = 0.35;
    const main = type === "kumi" ? "#4f9fce" : "#65c3dd";
    const dark = type === "kumi" ? "#172d53" : "#193c5c";
    const hair = type === "kumi" ? "#3d2931" : "#293243";
    this.rect(-8, -27, 16, 12, hair);
    this.rect(-10, -19, 20, 9, main);
    this.rect(-9, -10, 18, 19, dark);
    this.rect(-6, 7, 5, 10, "#1b2332");
    this.rect(2, 7, 5, 10, "#1b2332");
    this.rect(-8, -7, 16, 4, "#e9c664");
    if (type === "kumi") {
      this.rect(11, -25, 3, 39, "#c7a55c");
      this.rect(8, -29, 9, 7, "#dce7e3");
    } else {
      this.rect(9, -14, 7, 20, "#a6b7c1");
      this.rect(10, -17, 5, 5, "#e9d070");
    }
    ctx.restore();
  }

  drawPortrait(canvas, type) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const old = this.ctx;
    this.ctx = ctx;
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
    const hair = kumi ? "#3e2831" : "#293243";
    const skin = "#efbd99";
    const main = kumi ? "#4f9fce" : "#64c2dc";
    this.rect(12, 67, 60, 17, "#10213a");
    this.rect(19, 54, 46, 30, main);
    this.rect(22, 18, 42, 44, hair);
    this.rect(26, 23, 34, 37, skin);
    this.rect(21, 23, 10, 29, hair);
    this.rect(55, 18, 10, 33, hair);
    this.rect(31, 37, 5, 5, "#253043");
    this.rect(49, 37, 5, 5, "#253043");
    this.rect(38, 51, 10, 3, kumi ? "#b85f72" : "#a95869");
    this.rect(28, 31, 10, 3, hair);
    this.rect(47, 31, 10, 3, hair);
    this.rect(35, 58, 15, 8, skin);
    this.rect(34, 65, 18, 5, "#f0cf6d");
    if (kumi) {
      this.rect(54, 13, 7, 8, "#61c4df");
      this.rect(58, 16, 7, 4, "#f1d36c");
    }
    this.ctx = old;
  }
}
