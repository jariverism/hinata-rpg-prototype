import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { LANDMARK_MAP_IDS } from "../src/art-manifest.js";
import { PixelRenderer } from "../src/pixel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "assets", "art", "landmark-atlas.png");
const logicalCellWidth = 224;
const logicalCellHeight = 192;
const pixelDensity = 2;
const cellWidth = logicalCellWidth * pixelDensity;
const cellHeight = logicalCellHeight * pixelDensity;
const columns = 4;
const rows = Math.ceil(LANDMARK_MAP_IDS.length / columns);
const atlas = createCanvas(cellWidth * columns, cellHeight * rows);
const atlasContext = atlas.getContext("2d");
atlasContext.imageSmoothingEnabled = false;

const locations = {
  solaido: { x: 20, y: 9 },
  mileria: { x: 21.5, y: 9 },
  sarinaria: { x: 21.5, y: 9 },
  katoshia: { x: 22.5, y: 9 },
  sunmill: { x: 30, y: 12 },
  skyArena: { x: 21, y: 11 },
  manafia: { x: 23, y: 9 },
};

LANDMARK_MAP_IDS.forEach((id, index) => {
  const cell = createCanvas(cellWidth, cellHeight);
  const renderer = new PixelRenderer(cell, {
    alpha: true,
    logicalWidth: logicalCellWidth,
    logicalHeight: logicalCellHeight,
  });
  renderer.ctx.clearRect(0, 0, logicalCellWidth, logicalCellHeight);
  const location = locations[id];
  const cameraX = location.x * 32 - logicalCellWidth / 2;
  const cameraY = location.y * 32 - (logicalCellHeight - 5);
  renderer.drawRegionalLandmark(id, cameraX, cameraY, 0);
  atlasContext.drawImage(
    cell,
    (index % columns) * cellWidth,
    Math.floor(index / columns) * cellHeight,
  );
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, atlas.toBuffer("image/png"));
console.log(output);
