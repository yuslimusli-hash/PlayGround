import { ARENA, TAU, mulberry32 } from "./constants.js";

export function createWorldArt() {
  const canvas = document.createElement("canvas");
  canvas.width = ARENA.w;
  canvas.height = ARENA.h;
  const ctx = canvas.getContext("2d");
  const random = mulberry32(19731);
  const cx = ARENA.w / 2;
  const cy = ARENA.h / 2;

  ctx.fillStyle = "#151c16";
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);

  for (let i = 0; i < 240; i += 1) {
    const x = random() * ARENA.w;
    const y = random() * ARENA.h;
    const r = 30 + random() * 180;
    const green = 34 + Math.floor(random() * 24);
    ctx.fillStyle = `rgba(${28 + Math.floor(random() * 22)}, ${green}, ${24 + Math.floor(random() * 15)}, ${0.05 + random() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.45 + random() * 0.6), random() * TAU, 0, TAU);
    ctx.fill();
  }

  const roadGradient = ctx.createLinearGradient(0, cy - 190, 0, cy + 190);
  roadGradient.addColorStop(0, "#20241f");
  roadGradient.addColorStop(0.5, "#252a23");
  roadGradient.addColorStop(1, "#1a1f1a");
  ctx.fillStyle = roadGradient;
  ctx.fillRect(0, cy - 185, ARENA.w, 370);
  ctx.fillStyle = "#22261f";
  ctx.fillRect(cx - 185, 0, 370, ARENA.h);

  ctx.strokeStyle = "rgba(205, 197, 155, 0.13)";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, cy - 185, ARENA.w, 370);
  ctx.strokeRect(cx - 185, 0, 370, ARENA.h);

  ctx.save();
  ctx.strokeStyle = "rgba(207, 191, 112, 0.17)";
  ctx.lineWidth = 5;
  ctx.setLineDash([44, 46]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(ARENA.w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, ARENA.h);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(223, 220, 205, 0.14)";
  ctx.lineWidth = 8;
  const crosswalks = [
    [cx - 258, cy - 168],
    [cx + 258, cy - 168],
    [cx - 258, cy + 168],
    [cx + 258, cy + 168],
  ];
  crosswalks.forEach(([x, y]) => {
    for (let i = -5; i <= 5; i += 1) {
      if (random() > 0.82) continue;
      ctx.beginPath();
      ctx.moveTo(x - 62, y + i * 23);
      ctx.lineTo(x + 62, y + i * 23);
      ctx.stroke();
    }
  });
  ctx.restore();

  for (let i = 0; i < 130; i += 1) {
    const onRoad = random() > 0.42;
    const x = onRoad
      ? random() * ARENA.w
      : random() < 0.5
        ? random() * (cx - 220)
        : cx + 220 + random() * (ARENA.w - cx - 220);
    const y = onRoad ? cy - 175 + random() * 350 : random() * ARENA.h;
    ctx.strokeStyle = `rgba(6, 9, 7, ${0.18 + random() * 0.22})`;
    ctx.lineWidth = 1 + random() * 2.4;
    ctx.beginPath();
    let px = x;
    let py = y;
    ctx.moveTo(px, py);
    const segments = 2 + Math.floor(random() * 4);
    for (let s = 0; s < segments; s += 1) {
      px += (random() - 0.5) * 34;
      py += (random() - 0.5) * 34;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 26; i += 1) {
    const x = random() * ARENA.w;
    const y = random() * ARENA.h;
    const r = 15 + random() * 46;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, "rgba(57, 26, 23, 0.22)");
    stain.addColorStop(0.65, "rgba(43, 20, 18, 0.13)");
    stain.addColorStop(1, "rgba(32, 17, 15, 0)");
    ctx.fillStyle = stain;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  for (let i = 0; i < 18; i += 1) {
    const x = random() * ARENA.w;
    const y = cy - 130 + random() * 260;
    const r = 12 + random() * 34;
    const puddle = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    puddle.addColorStop(0, "rgba(74, 103, 86, 0.24)");
    puddle.addColorStop(0.55, "rgba(43, 67, 57, 0.18)");
    puddle.addColorStop(1, "rgba(24, 38, 32, 0)");
    ctx.fillStyle = puddle;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, random() * TAU, 0, TAU);
    ctx.fill();
  }

  for (let i = 0; i < 9; i += 1) {
    const x = cx - 900 + random() * 1800;
    const y = cy - 520 + random() * 1040;
    ctx.fillStyle = "rgba(13, 16, 14, 0.72)";
    ctx.beginPath();
    ctx.arc(x, y, 14 + random() * 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(139, 126, 88, 0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (let i = 0; i < 320; i += 1) {
    const x = random() * ARENA.w;
    const y = random() * ARENA.h;
    const size = 0.8 + random() * 3.2;
    const isBone = random() > 0.78;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random() * TAU);
    if (isBone) {
      ctx.fillStyle = "rgba(189, 184, 157, 0.19)";
      ctx.fillRect(-size * 2.2, -size * 0.45, size * 4.4, size * 0.9);
      ctx.beginPath();
      ctx.arc(-size * 2.2, 0, size * 0.7, 0, TAU);
      ctx.arc(size * 2.2, 0, size * 0.7, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = random() > 0.5 ? "rgba(87, 91, 71, 0.24)" : "rgba(23, 27, 22, 0.5)";
      ctx.fillRect(-size, -size * 0.5, size * 2, size);
    }
    ctx.restore();
  }

  for (let i = 0; i < 150; i += 1) {
    const nearRoad = random() > 0.48;
    const edge = random() < 0.5 ? cx - 190 - random() * 450 : cx + 190 + random() * 450;
    const x = nearRoad ? edge : random() * ARENA.w;
    const y = random() * ARENA.h;
    ctx.strokeStyle = `rgba(${80 + Math.floor(random() * 35)}, ${100 + Math.floor(random() * 45)}, ${48 + Math.floor(random() * 20)}, ${0.2 + random() * 0.26})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 12, y - 4 - random() * 13);
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x - 4 + random() * 8, y - 3 - random() * 9);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 20;
  ctx.strokeRect(32, 32, ARENA.w - 64, ARENA.h - 64);

  return canvas;
}
