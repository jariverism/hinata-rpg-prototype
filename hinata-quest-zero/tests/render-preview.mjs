import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { MAPS } from "../src/data.js";
import { PixelRenderer } from "../src/pixel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = process.argv[2] || "/tmp/hq0-render-preview";
fs.mkdirSync(output, { recursive: true });
const art = path.join(root, "assets", "art");
const loadedAssets = {
  title: await loadImage(path.join(art, "title-hinatia.png")),
  party: await loadImage(path.join(art, "party-sprites.png")),
  npc: await loadImage(path.join(art, "npc-sprites.png")),
  enemies: await loadImage(path.join(art, "enemy-atlas.png")),
  "portrait-hero": await loadImage(path.join(art, "portraits", "hero.png")),
  "portrait-kumi": await loadImage(path.join(art, "portraits", "kumi.png")),
  "portrait-mirei": await loadImage(path.join(art, "portraits", "mirei.png")),
  "portrait-sarina": await loadImage(path.join(art, "portraits", "sarina.png")),
  "portrait-katoshi": await loadImage(path.join(art, "portraits", "katoshi.png")),
  "portrait-manaka": await loadImage(path.join(art, "portraits", "manaka.png")),
  "cutin-hero": await loadImage(path.join(art, "cutins", "hero.png")),
  "cutin-kumi": await loadImage(path.join(art, "cutins", "kumi.png")),
  "cutin-mirei": await loadImage(path.join(art, "cutins", "mirei.png")),
  "cutin-sarina": await loadImage(path.join(art, "cutins", "sarina.png")),
  "cutin-katoshi": await loadImage(path.join(art, "cutins", "katoshi.png")),
  "cutin-manaka": await loadImage(path.join(art, "cutins", "manaka.png")),
};

function tileNeighbors(map, x, y) {
  return {
    up: map.tiles[y - 1]?.[x],
    down: map.tiles[y + 1]?.[x],
    left: map.tiles[y]?.[x - 1],
    right: map.tiles[y]?.[x + 1],
  };
}

function save(name, draw) {
  const canvas = createCanvas(1280, 720);
  const renderer = new PixelRenderer(canvas, {
    logicalWidth: 640,
    logicalHeight: 360,
  });
  Object.assign(renderer.assets, loadedAssets);
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
        map.tone,
        tileNeighbors(map, x, y),
      );
  renderer.drawSpecial("campfire", 26 * 32 - camera.x, 30 * 32 - camera.y, false, 1250);
  renderer.drawChest(23 * 32 - camera.x, 32 * 32 - camera.y, false);
  renderer.drawEnemySymbol("softSlime", 28 * 32 - camera.x, 27 * 32 - camera.y, "left", 1250, true);
  renderer.drawCharacter("merchant", 28 * 32 + 4 - camera.x, 31 * 32 + 1 - camera.y, "left", 1);
  renderer.drawCharacter("kumi", 25 * 32 + 4 - camera.x, 25 * 32 + 1 - camera.y, "up", 0, 1, true);
  renderer.drawCharacter("hero", 26 * 32 + 4 - camera.x, 24 * 32 + 1 - camera.y, "up", 1);
  renderer.drawMapLighting(map.tone, 1250);
  renderer.drawWeather(map.id, map.tone, 25000);
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
  renderer.drawHitEffect(410, 124, 85, "light");
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
        map.tone,
        tileNeighbors(map, x, y),
      );
  renderer.drawSpecial("goldenWheat", 12 * 32 - camera.x, 8 * 32 - camera.y, false, 1250);
  renderer.drawEnemySymbol("blightScarecrow", 14 * 32 - camera.x, 10 * 32 - camera.y, "left", 1250, true);
  renderer.drawCharacter("mirei", 10 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 1);
  renderer.drawCharacter("kumi", 11 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 0);
  renderer.drawCharacter("hero", 12 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 1);
  renderer.drawMapLighting(map.tone, 1250);
  renderer.drawWeather(map.id, map.tone, 1250);
  renderer.drawMapAtmosphere(map.tone, 1250);
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

save("sarinaria-field", (renderer) => {
  const map = MAPS.sarinaria;
  const camera = { x: 4 * 32, y: 3 * 32 };
  for (let y = 2; y < 16; y += 1)
    for (let x = 3; x < 25; x += 1)
      renderer.drawTile(
        map.tiles[y][x],
        x * 32 - camera.x,
        y * 32 - camera.y,
        x,
        y,
        1250,
        map.tone,
        tileNeighbors(map, x, y),
      );
  renderer.drawSpecial("spiritAltar", 14 * 32 - camera.x, 6 * 32 - camera.y, false, 1250);
  renderer.drawCharacter("spirit", 10 * 32 + 4 - camera.x, 10 * 32 + 1 - camera.y, "right", 1);
  renderer.drawCharacter("sarina", 14 * 32 + 4 - camera.x, 9 * 32 + 1 - camera.y, "down", 0);
  renderer.drawCharacter("mirei", 12 * 32 + 4 - camera.x, 12 * 32 + 1 - camera.y, "up", 1);
  renderer.drawCharacter("kumi", 13 * 32 + 4 - camera.x, 12 * 32 + 1 - camera.y, "up", 0);
  renderer.drawCharacter("hero", 14 * 32 + 4 - camera.x, 12 * 32 + 1 - camera.y, "up", 1);
  renderer.drawMapLighting(map.tone, 1250);
  renderer.drawWeather(map.id, map.tone, 1250);
  renderer.drawMapAtmosphere(map.tone, 1250);
});

save("sarinaria-boss", (renderer) => {
  renderer.drawBattleBackground("spiritBoss", 1250);
  const ctx = renderer.ctx;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "#75f1d0";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(410, 130, 78, 80, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  renderer.drawBattleEnemy("muteTotem", 278, 151, 0.82, 1250);
  renderer.drawBattleEnemy("hushAvatar", 410, 132, 1.08, 1250);
  renderer.drawBattleEnemy("muteTotem", 535, 151, 0.82, 1250);
  renderer.drawPartyBack("hero", 65, 214, 1250);
  renderer.drawPartyBack("kumi", 137, 214, 1250);
  renderer.drawPartyBack("mirei", 209, 214, 1250);
  renderer.drawPartyBack("sarina", 281, 214, 1250);
});

save("katoshia-field", (renderer) => {
  const map = MAPS.katoshia;
  const camera = { x: 12 * 32, y: 3 * 32 };
  for (let y = 2; y < 16; y += 1)
    for (let x = 11; x < 33; x += 1)
      renderer.drawTile(
        map.tiles[y][x],
        x * 32 - camera.x,
        y * 32 - camera.y,
        x,
        y,
        1250,
        map.tone,
        tileNeighbors(map, x, y),
      );
  renderer.drawSpecial("windBoard", 18 * 32 - camera.x, 23 * 32 - camera.y, false, 1250);
  renderer.drawCharacter("arenaMaster", 22 * 32 + 4 - camera.x, 8 * 32 + 1 - camera.y, "down", 1);
  renderer.drawCharacter("katoshi", 24 * 32 + 4 - camera.x, 10 * 32 + 1 - camera.y, "left", 0);
  renderer.drawCharacter("sarina", 21 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 1);
  renderer.drawCharacter("mirei", 22 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 0);
  renderer.drawCharacter("kumi", 23 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 1);
  renderer.drawCharacter("hero", 24 * 32 + 4 - camera.x, 13 * 32 + 1 - camera.y, "up", 0);
  renderer.drawMapLighting(map.tone, 1250);
  renderer.drawWeather(map.id, map.tone, 1250);
  renderer.drawMapAtmosphere(map.tone, 1250);
});

save("katoshia-boss", (renderer) => {
  renderer.drawBattleBackground("windBoss", 1250);
  const ctx = renderer.ctx;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = "#9de9ff";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(410, 130, 86, 86, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  renderer.drawBattleEnemy("stormEye", 278, 151, 0.82, 1250);
  renderer.drawBattleEnemy("tempestMirror", 410, 132, 1.08, 1250);
  renderer.drawBattleEnemy("stormEye", 535, 151, 0.82, 1250);
  renderer.drawPartyBack("hero", 65, 214, 1250);
  renderer.drawPartyBack("kumi", 137, 214, 1250);
  renderer.drawPartyBack("sarina", 209, 214, 1250);
  renderer.drawPartyBack("katoshi", 281, 214, 1250);
  renderer.drawHitEffect(410, 124, 70, "wind");
});

save("portraits", (renderer) => {
  renderer.clear("#08182b");
  ["hero", "kumi", "mirei", "sarina", "katoshi", "manaka"].forEach((type, index) => {
    const portrait = createCanvas(168, 168);
    renderer.drawPortrait(portrait, type);
    renderer.ctx.drawImage(portrait, 14 + index * 104, 116, 84, 84);
    renderer.text(type.toUpperCase(), 56 + index * 104, 208, "#e7f8ff", 8, "center");
  });
});

function drawTownPreview(renderer, mapId, camera, now) {
  const map = MAPS[mapId];
  const startX = Math.max(0, Math.floor(camera.x / 32) - 1);
  const startY = Math.max(0, Math.floor(camera.y / 32) - 1);
  for (let y = startY; y <= Math.min(map.height - 1, startY + 13); y += 1)
    for (let x = startX; x <= Math.min(map.width - 1, startX + 21); x += 1)
      renderer.drawTile(
        map.tiles[y][x],
        x * 32 - camera.x,
        y * 32 - camera.y,
        x,
        y,
        now,
        map.tone,
        tileNeighbors(map, x, y),
      );
  renderer.drawRegionalLandmark(map.id, camera.x, camera.y, now);
  for (const npc of map.npcs)
    renderer.drawCharacter(
      npc.type,
      npc.x * 32 + 4 - camera.x,
      npc.y * 32 + 1 - camera.y,
      npc.dir,
      1,
    );
  for (let y = startY; y <= Math.min(map.height - 1, startY + 13); y += 1)
    for (let x = startX; x <= Math.min(map.width - 1, startX + 21); x += 1)
      renderer.drawTileForeground(
        map.tiles[y][x],
        x * 32 - camera.x,
        y * 32 - camera.y,
        x,
        y,
        now,
        map.tone,
        tileNeighbors(map, x, y),
      );
  renderer.drawMapLighting(map.tone, now);
  renderer.drawWeather(map.id, map.tone, now);
  renderer.drawMapAtmosphere(map.tone, now);
}

save("solaido-landmark", (renderer) =>
  drawTownPreview(renderer, "solaido", { x: 10 * 32, y: 0 }, 25250),
);
save("mileria-landmark", (renderer) =>
  drawTownPreview(renderer, "mileria", { x: 11 * 32, y: 0 }, 5250),
);
save("sarinaria-landmark", (renderer) =>
  drawTownPreview(renderer, "sarinaria", { x: 11 * 32, y: 0 }, 5250),
);
save("katoshia-landmark", (renderer) =>
  drawTownPreview(renderer, "katoshia", { x: 12 * 32, y: 0 }, 5250),
);
save("manafia-landmark", (renderer) =>
  drawTownPreview(renderer, "manafia", { x: 12 * 32, y: 0 }, 5250),
);

save("manafia-boss", (renderer) => {
  renderer.drawBattleBackground("manaBoss", 1250);
  const ctx = renderer.ctx;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = "#a99be8";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(410, 130, 86, 86, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  renderer.drawBattleEnemy("falseIndex", 278, 151, 0.82, 1250);
  renderer.drawBattleEnemy("amnesiaLibrarian", 410, 132, 1.08, 1250);
  renderer.drawBattleEnemy("falseIndex", 535, 151, 0.82, 1250);
  renderer.drawPartyBack("hero", 65, 214, 1250);
  renderer.drawPartyBack("kumi", 137, 214, 1250);
  renderer.drawPartyBack("katoshi", 209, 214, 1250);
  renderer.drawPartyBack("manaka", 281, 214, 1250);
  renderer.drawHitEffect(410, 124, 70, "light");
});

[
  ["hero", "トシ", "約束のハッピーオーラ"],
  ["kumi", "久美", "鉄壁のフォーメーション"],
  ["mirei", "美玲", "ハッピーブレッド"],
  ["sarina", "紗理菜", "サリマカシー"],
  ["katoshi", "史帆", "天空の剣舞"],
  ["manaka", "愛奈", "禁書解放"],
].forEach(([id, name, skill]) => {
  save(`cutin-${id}`, (renderer) => {
    renderer.drawBattleBackground(id === "mirei" ? "granaryBoss" : id === "sarina" ? "spiritBoss" : id === "katoshi" ? "windBoss" : id === "manaka" ? "manaBoss" : "bossCave", 1250);
    renderer.drawSkillCutIn(id, name, skill, 0.48);
  });
});

console.log(output);
