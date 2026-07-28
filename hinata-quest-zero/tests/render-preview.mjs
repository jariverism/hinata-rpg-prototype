import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { MAPS } from "../src/data.js";
import { PixelRenderer } from "../src/pixel.js";

const output = process.argv[2] || "/tmp/hq0-render-preview";
fs.mkdirSync(output, { recursive: true });

function save(name, draw) {
  const canvas = createCanvas(640, 360);
  const renderer = new PixelRenderer(canvas);
  draw(renderer);
  fs.writeFileSync(path.join(output, `${name}.png`), canvas.toBuffer("image/png"));
}

save("title", (renderer) => {
  renderer.drawTitle(1250);
});

save("field", (renderer) => {
  const map = MAPS.highroad;
  const camera = { x: 17 * 32, y: 18 * 32 };
  for (let y = 17; y < 31; y += 1)
    for (let x = 16; x < 38; x += 1)
      renderer.drawTile(
        map.tiles[y][x],
        x * 32 - camera.x,
        y * 32 - camera.y,
        x,
        y,
        1250,
      );
  renderer.drawSpecial("campfire", 26 * 32 - camera.x, 30 * 32 - camera.y, false, 1250);
  renderer.drawChest(23 * 32 - camera.x, 32 * 32 - camera.y, false);
  renderer.drawEnemySymbol("softSlime", 28 * 32 - camera.x, 27 * 32 - camera.y, "left", 1250, true);
  renderer.drawCharacter("merchant", 28 * 32 + 4 - camera.x, 31 * 32 + 1 - camera.y, "left", 1);
  renderer.drawCharacter("kumi", 25 * 32 + 4 - camera.x, 25 * 32 + 1 - camera.y, "up", 0, 1, true);
  renderer.drawCharacter("hero", 26 * 32 + 4 - camera.x, 24 * 32 + 1 - camera.y, "up", 1);
});

save("battle", (renderer) => {
  renderer.drawBattleBackground("bossCave", 1250);
  const ctx = renderer.ctx;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#b68fd2";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(410, 130, 78, 80, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  renderer.drawBattleEnemy("shade", 278, 151, 0.82, 1250);
  renderer.drawBattleEnemy("smileEater", 410, 132, 1.08, 1250);
  renderer.drawBattleEnemy("shade", 535, 151, 0.82, 1250);
  renderer.drawPartyBack("hero", 93, 214, 1250);
  renderer.drawPartyBack("kumi", 171, 214, 1250);
});

save("mirelia-field", (renderer) => {
  const map = MAPS.mireRoad;
  const camera = { x: 2 * 32, y: 4 * 32 };
  for (let y = 3; y < 17; y += 1)
    for (let x = 1; x < 23; x += 1)
      renderer.drawTile(
        map.tiles[y][x],
        x * 32 - camera.x,
        y * 32 - camera.y,
        x,
        y,
        1250,
      );
  renderer.drawSpecial("goldenWheat", 12 * 32 - camera.x, 8 * 32 - camera.y, false, 1250);
  renderer.drawEnemySymbol("blightScarecrow", 14 * 32 - camera.x, 10 * 32 - camera.y, "left", 1250, true);
  renderer.drawCharacter("mirei", 10 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 1);
  renderer.drawCharacter("kumi", 11 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 0);
  renderer.drawCharacter("hero", 12 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 1);
});

save("mirelia-boss", (renderer) => {
  renderer.drawBattleBackground("granaryBoss", 1250);
  const ctx = renderer.ctx;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#e0b84f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(410, 130, 78, 80, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  renderer.drawBattleEnemy("root", 278, 151, 0.82, 1250);
  renderer.drawBattleEnemy("blightHeart", 410, 132, 1.08, 1250);
  renderer.drawBattleEnemy("root", 535, 151, 0.82, 1250);
  renderer.drawPartyBack("hero", 93, 214, 1250);
  renderer.drawPartyBack("kumi", 171, 214, 1250);
  renderer.drawPartyBack("mirei", 249, 214, 1250);
});

console.log(output);
