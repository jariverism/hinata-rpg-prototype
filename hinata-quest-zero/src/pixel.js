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
      mirei: { hair: "#49342c", skin: "#f0bd98", main: "#f2c95f", dark: "#7a4b3d", trim: "#fff1b0" },
      sarina: { hair: "#3f3036", skin: "#efbd99", main: "#72c8aa", dark: "#354d68", trim: "#f4d778" },
      katoshi: { hair: "#4a3038", skin: "#efbc98", main: "#9ac9e5", dark: "#35416a", trim: "#f3d26e" },
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
    } else if (type === "sign" || type === "board" || type === "mireBoard" || type === "windBoard") {
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
    } else if (type === "boss" || type === "boss2" || type === "boss3" || type === "boss4") {
      this.rect(x + 2, y + 24, 28, 5, "#15101d");
      const body = type === "boss2" ? "#4b3a1d" : type === "boss3" ? "#23485a" : type === "boss4" ? "#456278" : "#291836";
      const crown = type === "boss2" ? "#7c6427" : type === "boss3" ? "#3c7c79" : type === "boss4" ? "#86b9c8" : "#4c245e";
      const eye = type === "boss2" ? "#f0d34f" : type === "boss3" ? "#a7f3d0" : type === "boss4" ? "#eefcce" : "#ed5a88";
      this.rect(x + 6, y + 13, 20, 13, body);
      this.rect(x + 9, y + 7 + pulse, 14, 13, crown);
      this.rect(x + 11, y + 9 + pulse, 3, 3, eye);
      this.rect(x + 19, y + 9 + pulse, 3, 3, eye);
    } else if (type === "gather") {
      this.rect(x + 14, y + 15, 3, 14, "#2b694d");
      this.rect(x + 8, y + 14, 8, 5, "#75bb83");
      this.rect(x + 17, y + 10, 8, 6, "#99d49b");
      if (active) this.rect(x + 22, y + 5 + pulse, 3, 3, "#e5ffe5");
    } else if (["lever", "rope", "seal", "groveShrine", "granaryLever"].includes(type)) {
      this.rect(x + 7, y + 21, 18, 8, "#444b55");
      this.rect(x + 10, y + 18, 12, 5, "#78828a");
      if (type === "lever" || type === "granaryLever") {
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
    const main =
      type === "kumi" ? "#4f9fce" : type === "mirei" ? "#f0c85c" : type === "sarina" ? "#71c7a8" : type === "katoshi" ? "#9ac9e5" : "#65c3dd";
    const dark =
      type === "kumi" ? "#172d53" : type === "mirei" ? "#78483b" : type === "sarina" ? "#354d68" : type === "katoshi" ? "#35416a" : "#193c5c";
    const hair =
      type === "kumi" ? "#3d2931" : type === "mirei" ? "#49342c" : type === "sarina" ? "#3f3036" : type === "katoshi" ? "#4a3038" : "#293243";
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
    const mirei = type === "mirei";
    const sarina = type === "sarina";
    const katoshi = type === "katoshi";
    const hair = kumi ? "#3e2831" : mirei ? "#49342c" : sarina ? "#3f3036" : katoshi ? "#4a3038" : "#293243";
    const skin = "#efbd99";
    const main = kumi ? "#4f9fce" : mirei ? "#f0c75a" : sarina ? "#71c7a8" : katoshi ? "#9ac9e5" : "#64c2dc";
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
    }
    this.ctx = old;
  }
}
