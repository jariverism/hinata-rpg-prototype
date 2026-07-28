import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { NPC_SPRITE_IDS } from "../src/art-manifest.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "assets", "art", "npc-sprites.png");
const frameSize = 32;
const directions = ["down", "left", "right", "up"];
const frames = 4;

const designs = {
  guard: ["#523b32", "#e2ae85", "#6685a3", "#283c57", "#d8c176", "helmet"],
  merchant: ["#76523a", "#efbf98", "#b96f50", "#593447", "#f1ca72", "pack"],
  pilgrim: ["#c8c0aa", "#ddb08c", "#74638e", "#393553", "#c9bae8", "staff"],
  scout: ["#604a36", "#dfae86", "#477b68", "#29443d", "#a8d08d", "bow"],
  bard: ["#29243a", "#efbf9b", "#a25488", "#493258", "#efb6da", "lute"],
  smith: ["#55352b", "#dc9f73", "#945545", "#373941", "#e0a669", "hammer"],
  inn: ["#916546", "#ecc09a", "#c77f70", "#6b4254", "#f3d3a2", "tray"],
  priest: ["#d7d2c5", "#edc2a1", "#dce3eb", "#50648a", "#e6c45a", "crozier"],
  elder: ["#d3cdbf", "#ddb08d", "#6b876d", "#394b4d", "#c2cb84", "cane"],
  child: ["#875b3d", "#efc49c", "#ef9e58", "#67465e", "#ffe19c", "ball"],
  soldier: ["#777a73", "#d9a47d", "#72828b", "#39434f", "#bda064", "shield"],
  fisher: ["#31465b", "#dda982", "#4e8990", "#304f59", "#a5d2c7", "rod"],
  scholar: ["#543d68", "#eec19f", "#6873a3", "#39375d", "#d9c4e8", "book"],
  town: ["#715039", "#e4b48e", "#7f9d63", "#3e573d", "#d9c678", "basket"],
  town2: ["#3d3348", "#e8b793", "#a57979", "#543e51", "#d8baa0", "flowers"],
  hermit: ["#c5bda8", "#d9a986", "#486e5b", "#2e4543", "#a7b67e", "hood"],
  spirit: ["#9ce6d8", "#bdf2e1", "#69b9a4", "#376b6b", "#e6ffe2", "aura"],
  miner: ["#46342e", "#da9e72", "#897057", "#493f3b", "#dfa94d", "lamp"],
  baker: ["#764d36", "#edbb94", "#e1b85e", "#704653", "#fff0bd", "bread"],
  farmer: ["#6b4931", "#e0a77c", "#9b8b4d", "#4b5236", "#e1c66a", "fork"],
  miller: ["#c6baa3", "#e0ad83", "#8fa39f", "#465a5c", "#ead79b", "sack"],
  shrine: ["#d8d0bf", "#e5b690", "#7db89f", "#3f566b", "#edd276", "bell"],
  ranger: ["#51402f", "#e0ab83", "#4d846b", "#2e4b47", "#b8d77c", "bow"],
  courier: ["#4b3b36", "#e0a981", "#618ba6", "#324c60", "#dbc66d", "satchel"],
  fan: ["#6c4d3c", "#e9b58f", "#7ba6ca", "#494466", "#f2cf70", "pennant"],
  arenaMaster: ["#cec3ae", "#daa77e", "#7c7087", "#3d4056", "#e2bb5d", "horn"],
};

if (Object.keys(designs).length !== NPC_SPRITE_IDS.length)
  throw new Error("NPC design manifest is out of sync.");

const canvas = createCanvas(frameSize * directions.length * frames, frameSize * NPC_SPRITE_IDS.length);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

function rect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawSprite(id, originX, originY, direction, frame) {
  const [hair, skin, main, dark, trim, feature] = designs[id];
  const leftFacing = direction === "left";
  const side = direction === "left" || direction === "right";
  const walk = [0, 1, 0, -1][frame];
  const arm = [0, -1, 0, 1][frame];
  const childScale = id === "child" ? 0.88 : 1;
  const yOffset = id === "child" ? 3 : 0;
  const p = (xx, yy, width, height, color) => {
    const px = leftFacing ? frameSize - xx - width : xx;
    rect(originX + px * childScale + (1 - childScale) * 16, originY + yOffset + yy * childScale, width * childScale, height * childScale, color);
  };

  p(7, 28, 18, 3, "rgba(2,10,19,.34)");
  p(frame % 2 ? 8 : 9, 23 + Math.max(0, walk), 5, 6, dark);
  p(frame % 2 ? 19 : 18, 23 + Math.max(0, -walk), 5, 6, dark);
  p(frame % 2 ? 7 : 8, 28, 7, 2, "#111a28");
  p(frame % 2 ? 19 : 17, 28, 7, 2, "#111a28");

  if (direction === "up") {
    p(8, 4, 16, 13, hair);
    p(6, 9, 20, 9, hair);
    p(9, 15, 14, 10, main);
    p(11, 16, 10, 3, trim);
  } else if (side) {
    p(9, 5, 14, 12, hair);
    p(10, 8, 12, 10, skin);
    p(17, 10, 2, 2, "#1b2940");
    p(8, 6, 7, 9, hair);
    p(9, 16, 14, 9, main);
    p(11, 17, 10, 3, trim);
  } else {
    p(8, 4, 16, 9, hair);
    p(9, 8, 14, 10, skin);
    p(7, 7, 5, 9, hair);
    p(21, 6, 5, 10, hair);
    p(12, 11, 2, 2, "#1a2940");
    p(19, 11, 2, 2, "#1a2940");
    p(15, 15, 4, 1, "#a85362");
    p(9, 16, 14, 9, main);
    p(11, 17, 10, 3, trim);
  }
  p(7, 19 + arm, 4, 6, dark);
  p(22, 19 - arm, 4, 6, dark);

  if (feature === "helmet" || feature === "shield") {
    p(6, 3, 20, 4, "#94a8b5");
    p(9, 1, 14, 3, "#c1d0d3");
    p(4, 17 + arm, 7, 9, "#385674");
    p(5, 18 + arm, 5, 6, trim);
  } else if (feature === "pack" || feature === "satchel") {
    p(23, 14, 7, 12, "#6a4232");
    p(24, 16, 5, 3, trim);
    p(6, 15, 2, 12, "#d5a85f");
  } else if (feature === "staff" || feature === "cane" || feature === "crozier") {
    p(26, feature === "cane" ? 12 : 3, 2, feature === "cane" ? 25 : 27, "#a37b45");
    if (feature === "crozier") {
      p(23, 2, 6, 2, trim);
      p(27, 3, 3, 5, trim);
    } else p(24, feature === "cane" ? 10 : 1, 5, 4, trim);
  } else if (feature === "bow" || feature === "rod" || feature === "fork") {
    p(26, 4, 2, 25, feature === "rod" ? "#a8c8c8" : "#9c7547");
    p(23, 7, 2, 20, feature === "bow" ? trim : dark);
    if (feature === "fork") {
      p(23, 3, 2, 7, "#b7b8aa");
      p(26, 2, 2, 8, "#b7b8aa");
      p(29, 3, 2, 7, "#b7b8aa");
    }
  } else if (feature === "lute") {
    p(22, 16 + arm, 8, 10, "#a86c43");
    p(24, 18 + arm, 4, 5, "#e1ad61");
    p(19, 8, 2, 13, "#c79559");
  } else if (feature === "hammer") {
    p(24, 7, 3, 20, "#8d633f");
    p(20, 5, 11, 7, "#75828a");
    p(21, 6, 9, 2, "#bdc2bd");
  } else if (feature === "tray" || feature === "bread") {
    p(20, 20 + arm, 11, 3, "#9f6c45");
    p(22, 16 + arm, 7, 5, feature === "bread" ? "#efc56b" : "#dbe1dc");
    p(24, 15 + arm, 3, 2, "#fff1b0");
    if (feature === "bread") {
      p(9, 2, 15, 3, "#fff0c7");
      p(12, 0, 9, 3, "#f5e2b4");
    }
  } else if (feature === "ball") {
    p(23, 20 + arm, 7, 7, "#e27761");
    p(25, 21 + arm, 2, 5, trim);
  } else if (feature === "book") {
    p(20, 18 + arm, 11, 8, "#442f57");
    p(22, 19 + arm, 4, 6, "#eee2bd");
    p(26, 19 + arm, 4, 6, "#ddd0a7");
  } else if (feature === "basket" || feature === "flowers") {
    p(21, 19 + arm, 10, 8, "#9d6b42");
    p(23, 17 + arm, 6, 3, trim);
    if (feature === "flowers") {
      p(22, 14 + arm, 3, 3, "#ef8799");
      p(26, 13 + arm, 3, 3, "#8cd1c0");
      p(28, 16 + arm, 2, 2, "#f1d06a");
    }
  } else if (feature === "hood") {
    p(6, 3, 20, 13, dark);
    p(9, 6, 14, 10, hair);
    p(11, 9, 10, 8, skin);
  } else if (feature === "aura") {
    p(5, 4, 3, 3, "rgba(188,255,232,.8)");
    p(25, 9, 2, 2, "rgba(244,255,187,.85)");
    p(4, 21, 2, 4, "rgba(119,226,202,.8)");
  } else if (feature === "lamp") {
    p(10, 1, 13, 4, "#a4864f");
    p(14, 0, 5, 4, "#ffe277");
    p(15, 1, 3, 2, "#fff6c1");
    p(24, 18 + arm, 5, 7, "#daaa4a");
  } else if (feature === "sack") {
    p(21, 17 + arm, 10, 11, "#c7b68e");
    p(23, 15 + arm, 6, 3, "#8a724d");
    p(24, 20 + arm, 4, 2, "#eee0b3");
  } else if (feature === "bell") {
    p(23, 16 + arm, 7, 7, "#d7b650");
    p(25, 14 + arm, 3, 4, "#f2eea4");
    p(25, 23 + arm, 3, 3, "#f2d36b");
  } else if (feature === "pennant") {
    p(26, 3, 2, 26, "#bd9754");
    p(17, 3, 10, 7, "#66bad5");
    p(19, 5, 6, 2, "#f5d36c");
  } else if (feature === "horn") {
    p(21, 17 + arm, 10, 7, "#c99d4e");
    p(20, 15 + arm, 4, 5, "#f1d17a");
    p(28, 18 + arm, 3, 3, "#704738");
  }
}

NPC_SPRITE_IDS.forEach((id, row) => {
  directions.forEach((direction, directionIndex) => {
    for (let frame = 0; frame < frames; frame += 1)
      drawSprite(id, (directionIndex * frames + frame) * frameSize, row * frameSize, direction, frame);
  });
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer("image/png"));
console.log(output);
