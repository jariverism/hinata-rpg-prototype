import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portraitOutput = path.join(root, "assets", "art", "portraits", "manaka.png");
const cutinOutput = path.join(root, "assets", "art", "cutins", "manaka.png");
const force = process.argv.includes("--force-procedural");

if (fs.existsSync(portraitOutput) && fs.existsSync(cutinOutput) && !force) {
  console.log(`${portraitOutput} (既存の高品質アートを保持)`);
  console.log(`${cutinOutput} (既存の高品質アートを保持)`);
  process.exit(0);
}

function rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function pixelStar(ctx, x, y, color = "#f8df79", scale = 1) {
  rect(ctx, x + 2 * scale, y, 2 * scale, 6 * scale, color);
  rect(ctx, x, y + 2 * scale, 6 * scale, 2 * scale, color);
  rect(ctx, x + 2 * scale, y + 2 * scale, 2 * scale, 2 * scale, "#fff7c8");
}

function drawManaka(ctx, x, y, scale = 1) {
  const p = (xx, yy, width, height, color) =>
    rect(ctx, x + xx * scale, y + yy * scale, width * scale, height * scale, color);
  const hair = "#2b2636";
  const hairLight = "#675275";
  const skin = "#efbd99";
  const shade = "#d7977f";
  const violet = "#7769b8";
  const violetLight = "#d8cdf5";
  const navy = "#303657";
  const gold = "#efd36d";

  p(15, 58, 66, 27, "rgba(8,13,31,.45)");
  p(22, 48, 52, 34, navy);
  p(27, 44, 42, 30, violet);
  p(31, 47, 34, 8, violetLight);
  p(45, 49, 5, 23, gold);
  p(33, 50, 4, 19, "#a99cda");
  p(59, 50, 4, 19, "#a99cda");
  p(39, 38, 20, 13, skin);
  p(42, 42, 14, 9, shade);

  p(23, 6, 51, 40, hair);
  p(27, 3, 38, 11, hairLight);
  p(31, 11, 35, 34, skin);
  p(24, 13, 12, 31, hair);
  p(61, 9, 13, 37, hair);
  p(21, 18, 8, 28, hairLight);
  p(66, 18, 10, 31, hairLight);
  p(35, 24, 6, 5, "#20293e");
  p(55, 24, 6, 5, "#20293e");
  p(36, 23, 3, 2, "#dff8ff");
  p(56, 23, 3, 2, "#dff8ff");
  p(43, 37, 12, 3, "#aa556d");
  p(32, 18, 11, 3, hair);
  p(53, 18, 11, 3, hair);
  p(30, 10, 10, 7, hairLight);
  p(58, 7, 9, 10, hair);

  // Open codex and a small crystal monocle make the fantasy role readable at a glance.
  p(65, 48, 25, 19, "#4b356d");
  p(67, 50, 10, 15, "#f2e5c4");
  p(78, 50, 10, 15, "#d7c7a5");
  p(76, 51, 3, 13, gold);
  p(69, 53, 6, 2, "#8f79ab");
  p(80, 55, 6, 2, "#8f79ab");
  p(64, 20, 4, 14, gold);
  p(66, 19, 8, 5, "#8ce7e5");
  p(68, 20, 4, 3, "#ecffff");
}

{
  const canvas = createCanvas(192, 192);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const gradient = ctx.createLinearGradient(0, 0, 0, 192);
  gradient.addColorStop(0, "#181732");
  gradient.addColorStop(0.58, "#514a82");
  gradient.addColorStop(1, "#192846");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 192, 192);
  for (let i = 0; i < 16; i += 1)
    pixelStar(ctx, 8 + ((i * 41) % 174), 8 + ((i * 29) % 108), i % 3 ? "#b9ecf0" : "#f7d975", i % 5 === 0 ? 2 : 1);
  rect(ctx, 0, 139, 192, 53, "#11182e");
  rect(ctx, 0, 139, 192, 5, "#887cc0");
  for (let x = 4; x < 192; x += 23) {
    rect(ctx, x, 151, 15, 31, "#392c50");
    rect(ctx, x + 3, 154, 9, 25, "#d8c89f");
    rect(ctx, x + 5, 156, 2, 20, x % 2 ? "#69cfd0" : "#d3a95a");
  }
  ctx.save();
  ctx.translate(8, 22);
  ctx.scale(1.75, 1.75);
  drawManaka(ctx, 0, 0, 1);
  ctx.restore();
  rect(ctx, 0, 0, 192, 4, "#d8c46c");
  rect(ctx, 0, 188, 192, 4, "#5e79b7");
  fs.mkdirSync(path.dirname(portraitOutput), { recursive: true });
  fs.writeFileSync(portraitOutput, canvas.toBuffer("image/png"));
}

{
  const canvas = createCanvas(1280, 144);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const gradient = ctx.createLinearGradient(0, 0, 1280, 144);
  gradient.addColorStop(0, "#111329");
  gradient.addColorStop(0.42, "#594c8d");
  gradient.addColorStop(0.72, "#267f95");
  gradient.addColorStop(1, "#101a32");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1280, 144);
  for (let i = 0; i < 54; i += 1) {
    const x = (i * 137 + 23) % 1280;
    const y = 9 + ((i * 43) % 124);
    pixelStar(ctx, x, y, i % 3 ? "#b8f1ed" : "#f8dd74", i % 11 === 0 ? 2 : 1);
  }
  for (let i = 0; i < 18; i += 1) {
    const x = 500 + ((i * 83) % 720);
    const y = 14 + ((i * 37) % 96);
    rect(ctx, x, y, 44, 29, i % 2 ? "#e8dbb9" : "#d4c69f");
    rect(ctx, x + 21, y + 2, 3, 25, "#7a6597");
    rect(ctx, x + 5, y + 7, 12, 2, "#8879a4");
    rect(ctx, x + 28, y + 13, 11, 2, "#5299a4");
  }
  ctx.save();
  ctx.translate(138, -4);
  ctx.scale(1.65, 1.65);
  drawManaka(ctx, 0, 0, 1);
  ctx.restore();
  rect(ctx, 0, 0, 1280, 5, "#dac86c");
  rect(ctx, 0, 139, 1280, 5, "#61c8d3");
  fs.mkdirSync(path.dirname(cutinOutput), { recursive: true });
  fs.writeFileSync(cutinOutput, canvas.toBuffer("image/png"));
}

console.log(portraitOutput);
console.log(cutinOutput);
