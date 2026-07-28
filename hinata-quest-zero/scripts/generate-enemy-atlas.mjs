import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { ENEMY_SPRITE_IDS } from "../src/art-manifest.js";
import { PixelRenderer } from "../src/pixel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "assets", "art", "enemy-atlas.png");
const cellWidth = 192;
const cellHeight = 160;
const columns = 8;
const rows = Math.ceil(ENEMY_SPRITE_IDS.length / columns);
const atlas = createCanvas(cellWidth * columns, cellHeight * rows);
const atlasContext = atlas.getContext("2d");
atlasContext.imageSmoothingEnabled = false;

ENEMY_SPRITE_IDS.forEach((id, index) => {
  const cell = createCanvas(cellWidth, cellHeight);
  const renderer = new PixelRenderer(cell, { alpha: true });
  renderer.ctx.clearRect(0, 0, cellWidth, cellHeight);
  renderer.drawBattleEnemy(id, cellWidth / 2, 86, 1, -(cellWidth / 2) * 280);
  atlasContext.drawImage(
    cell,
    (index % columns) * cellWidth,
    Math.floor(index / columns) * cellHeight,
  );
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, atlas.toBuffer("image/png"));
console.log(output);
