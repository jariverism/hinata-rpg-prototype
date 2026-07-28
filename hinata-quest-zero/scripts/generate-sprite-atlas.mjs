import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "assets", "art", "party-sprites.png");
const frameSize = 32;
const directions = ["down", "left", "right", "up"];
const frames = 4;

const characters = [
  {
    id: "hero",
    hair: "#17243c",
    hairLight: "#31466b",
    skin: "#efbd96",
    main: "#67c7e4",
    light: "#c8f4ff",
    dark: "#173653",
    trim: "#f0ce69",
    feature: "shield",
  },
  {
    id: "kumi",
    hair: "#35242c",
    hairLight: "#68404a",
    skin: "#efbd98",
    main: "#4d9fd0",
    light: "#aee6f4",
    dark: "#172e56",
    trim: "#f2d47e",
    feature: "spear",
  },
  {
    id: "mirei",
    hair: "#493229",
    hairLight: "#805442",
    skin: "#f0bf98",
    main: "#e6bd54",
    light: "#fff0b0",
    dark: "#714638",
    trim: "#fff3c7",
    feature: "pan",
  },
  {
    id: "sarina",
    hair: "#292631",
    hairLight: "#554451",
    skin: "#efbd99",
    main: "#70c8aa",
    light: "#d7f3d8",
    dark: "#304b61",
    trim: "#edcf65",
    feature: "bell",
  },
  {
    id: "katoshi",
    hair: "#3b2931",
    hairLight: "#70424d",
    skin: "#efbc97",
    main: "#9bcfe8",
    light: "#e8f7fb",
    dark: "#343f68",
    trim: "#efd16c",
    feature: "rapier",
  },
];

const canvas = createCanvas(frameSize * directions.length * frames, frameSize * characters.length);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

function rect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawSprite(character, originX, originY, direction, frame) {
  const x = originX;
  const y = originY;
  const step = [0, 1, 0, -1][frame];
  const arm = [0, -1, 0, 1][frame];
  const side = direction === "left" || direction === "right";
  const leftFacing = direction === "left";
  const p = (xx, yy, width, height, color) => {
    if (leftFacing) rect(x + frameSize - xx - width, y + yy, width, height, color);
    else rect(x + xx, y + yy, width, height, color);
  };

  // Soft two-level shadow grounds the sprite without hiding the walking cycle.
  p(7, 28, 18, 3, "rgba(2,10,19,.32)");
  p(10, 29, 12, 2, "rgba(2,10,19,.28)");

  const leftLeg = frame % 2 === 0 ? 9 : 8;
  const rightLeg = frame % 2 === 0 ? 18 : 19;
  p(leftLeg, 23 + Math.max(0, step), 5, 6 - Math.max(0, step), character.dark);
  p(rightLeg, 23 + Math.max(0, -step), 5, 6 - Math.max(0, -step), character.dark);
  p(leftLeg - 1, 28, 6, 2, "#121a29");
  p(rightLeg, 28, 6, 2, "#121a29");

  if (direction === "up") {
    p(8, 4, 16, 13, character.hair);
    p(6, 9, 20, 10, character.hair);
    p(10, 5, 10, 5, character.hairLight);
    p(8, 15, 16, 10, character.main);
    p(10, 16, 12, 3, character.light);
    p(7, 19 + arm, 4, 6, character.dark);
    p(21, 19 - arm, 4, 6, character.dark);
  } else if (side) {
    p(9, 5, 14, 12, character.hair);
    p(10, 8, 12, 10, character.skin);
    p(16, 10, 2, 2, "#1b2940");
    p(8, 6, 7, 9, character.hair);
    p(11, 4, 10, 4, character.hairLight);
    p(9, 16, 14, 9, character.main);
    p(11, 17, 10, 3, character.light);
    p(7, 19 + arm, 4, 6, character.dark);
    p(22, 19 - arm, 4, 6, character.dark);
  } else {
    p(8, 4, 16, 9, character.hair);
    p(9, 8, 14, 10, character.skin);
    p(7, 7, 5, 9, character.hair);
    p(21, 6, 5, 10, character.hair);
    p(11, 5, 11, 4, character.hairLight);
    p(12, 11, 2, 2, "#1b2940");
    p(19, 11, 2, 2, "#1b2940");
    p(15, 15, 4, 1, "#b8606f");
    p(9, 16, 14, 9, character.main);
    p(11, 17, 10, 3, character.light);
    p(7, 19 + arm, 4, 6, character.dark);
    p(22, 19 - arm, 4, 6, character.dark);
    p(14, 20, 5, 2, character.trim);
  }

  if (character.feature === "shield") {
    p(side ? 5 : 4, 17 + arm, 6, 9, "#a7c3cf");
    p(side ? 6 : 5, 18 + arm, 4, 6, "#2d6684");
    p(side ? 7 : 6, 20 + arm, 2, 2, character.trim);
    p(22, 8, 2, 18, "#a9bac4");
    p(21, 7, 4, 4, character.trim);
    p(8, 14, 16, 2, character.light);
  } else if (character.feature === "spear") {
    p(25, 3, 2, 25, "#b99654");
    p(24, 1, 4, 6, "#eaf6f3");
    p(25, 0, 2, 4, "#76d2e8");
    p(8, 14, 16, 2, character.trim);
    p(5, 17, 3, 8, "#3d6f9a");
  } else if (character.feature === "pan") {
    p(23, 17 + arm, 6, 6, "#4f5057");
    p(24, 18 + arm, 4, 4, "#aeb4b7");
    p(25, 22 + arm, 2, 5, "#b66b48");
    p(9, 3, 15, 3, character.light);
    p(12, 1, 9, 3, "#f8e9ba");
    p(7, 15, 18, 2, "#fff3c4");
  } else if (character.feature === "bell") {
    p(24, 16 + arm, 4, 8, "#d7b550");
    p(22, 16 + arm, 8, 4, character.main);
    p(24, 14 + arm, 4, 4, "#f1f2a2");
    p(25, 24 + arm, 2, 3, "#f0d56f");
    p(9, 2, 3, 5, "#e9d274");
    p(21, 3, 4, 5, "#77d2b0");
    p(8, 15, 16, 2, character.trim);
  } else if (character.feature === "rapier") {
    p(25, 5, 1, 23, "#eef6f3");
    p(23, 7, 5, 2, "#79c9df");
    p(22, 25, 7, 2, character.trim);
    p(23, 23, 4, 5, "#26334f");
    p(6, 18 + arm, 4, 8, "#80b7d3");
    p(8, 3, 7, 5, character.hairLight);
    p(5, 5, 6, 9, character.hair);
  }
}

characters.forEach((character, row) => {
  directions.forEach((direction, directionIndex) => {
    for (let frame = 0; frame < frames; frame += 1) {
      drawSprite(
        character,
        (directionIndex * frames + frame) * frameSize,
        row * frameSize,
        direction,
        frame,
      );
    }
  });
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer("image/png"));
console.log(output);
