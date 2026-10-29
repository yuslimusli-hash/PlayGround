import { TAU, WEAPONS, roundRectPath, clamp } from "./constants.js";

export function drawPlayerSprite(ctx, player, clock, weaponTier = 0, alpha = 1, ghost = false) {
  const flicker = player.invuln > 0 && !ghost ? 0.55 + Math.sin(clock * 55) * 0.25 : 1;
  const opacity = alpha * flicker;

  ctx.save();
  ctx.globalAlpha = opacity * 0.32;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(player.x + 3, player.y + 12, 17, 8.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.aimAngle);
  ctx.globalAlpha = opacity;
  if (ghost) ctx.globalCompositeOperation = "lighter";
  const stride = player.moving ? Math.sin(player.walkPhase) * 3.2 : Math.sin(player.walkPhase) * 0.5;
  const bodyColor = ghost ? "#d8b44e" : "#263d35";
  const bodyLight = ghost ? "#ffdc7a" : "#416050";
  const weapon = WEAPONS[weaponTier];
  const barrel = weapon ? weapon.barrel : 22;
  const recoil = player.recoil * 1.8;

  ctx.fillStyle = ghost ? "#8b7130" : "#171b18";
  ctx.beginPath();
  ctx.ellipse(-5 + stride, -7, 6, 4.2, -0.15, 0, TAU);
  ctx.ellipse(-5 - stride, 7, 6, 4.2, 0.15, 0, TAU);
  ctx.fill();

  ctx.fillStyle = ghost ? "#a58635" : "#322e23";
  roundRectPath(ctx, -14, -8, 10, 16, 3);
  ctx.fill();
  ctx.strokeStyle = ghost ? "rgba(255,225,140,.6)" : "#171b16";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = ghost ? "#ffdd77" : "#ff6f4c";
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-22, -1, -16, 7);
  ctx.quadraticCurveTo(-11, 2, -5, 5);
  ctx.closePath();
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-8, -12, 9, 11);
  bodyGradient.addColorStop(0, bodyLight);
  bodyGradient.addColorStop(1, bodyColor);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 12.5, 10.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ghost ? "rgba(255,234,170,.55)" : "rgba(8, 14, 11, 0.9)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.strokeStyle = ghost ? "rgba(255,234,170,.45)" : "rgba(12, 24, 19, 0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(5, -4);
  ctx.stroke();

  ctx.fillStyle = ghost ? "#ffdd77" : "#c99362";
  ctx.beginPath();
  ctx.arc(6, -8, 3.3, 0, TAU);
  ctx.arc(7, 8, 3.3, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(-recoil, 0);
  ctx.fillStyle = ghost ? "#a58a42" : "#171c1b";
  roundRectPath(ctx, 8, 3.1, 8 + barrel, 5.4, 1.6);
  ctx.fill();
  ctx.fillStyle = ghost ? "#ffe08a" : "#444c45";
  roundRectPath(ctx, 9, 4.1, 5 + barrel, 1.5, 0.8);
  ctx.fill();
  ctx.fillStyle = ghost ? "#ffdc7a" : "#c99c3d";
  ctx.fillRect(12, 3.5, 12, 1.3);
  ctx.fillStyle = ghost ? "#ffefbe" : "#0d1110";
  rectBarrelTip(ctx, 8 + barrel, 3.1, 5.4);
  ctx.restore();

  ctx.fillStyle = ghost ? "#b18e3c" : "#19211d";
  ctx.beginPath();
  ctx.arc(0, 0, 7.8, 0, TAU);
  ctx.fill();

  ctx.fillStyle = ghost ? "#ffdc7a" : "#d6a779";
  ctx.beginPath();
  ctx.arc(2.5, -0.5, 6.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = ghost ? "#b08b36" : "#202c27";
  ctx.beginPath();
  ctx.arc(0.4, -1.5, 6.5, 0.35, Math.PI * 1.28);
  ctx.lineTo(2.5, -6.8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ghost ? "#ffdc7a" : "#e0b684";
  ctx.beginPath();
  ctx.ellipse(8.3, -0.4, 2.5, 3.2, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = ghost ? "#ffefbe" : "#1a1a16";
  ctx.beginPath();
  ctx.arc(8.2, -2.2, 0.75, 0, TAU);
  ctx.arc(8.2, 1.3, 0.75, 0, TAU);
  ctx.fill();

  if (player.muzzle > 0 && !ghost) {
    const flash = player.muzzle / 0.07;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(8 + barrel + 8, 5.8);
    ctx.globalAlpha = 0.8 * flash;
    ctx.fillStyle = "#fff1ac";
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(3, -8);
    ctx.lineTo(5, -2);
    ctx.lineTo(13 + Math.random() * 8, 0);
    ctx.lineTo(5, 2);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffbf3b";
    ctx.beginPath();
    ctx.arc(0, 0, 5 + flash * 3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if (ghost) ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function rectBarrelTip(ctx, x, y, height) {
  ctx.fillRect(x - 1, y, 2.2, height);
}

export function drawZombieSprite(ctx, enemy, clock) {
  const spawnProgress = enemy.spawnT > 0 ? clamp(1 - enemy.spawnT / 0.65, 0.1, 1) : 1;
  const alpha = enemy.spawnT > 0 ? 0.35 + spawnProgress * 0.65 : 1;
  const scale = enemy.r / 16;
  const hit = enemy.hitFlash > 0;
  const color = hit ? "#f2f6df" : enemy.color;
  const dark = hit ? "#f2f6df" : enemy.dark;

  ctx.save();
  ctx.globalAlpha = alpha * 0.34;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(enemy.x + 3, enemy.y + 11 * scale * 0.7, 15 * scale, 7 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (enemy.spawnT > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - spawnProgress);
    ctx.strokeStyle = enemy.eye;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 20 + spawnProgress * 30, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  if (enemy.elite) {
    ctx.save();
    ctx.globalAlpha = 0.34 + Math.sin(clock * 4 + enemy.walkPhase) * 0.1;
    ctx.strokeStyle = "#ffd15b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 7, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  if (enemy.boss) drawBossAura(ctx, enemy, clock);

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.aimAngle + Math.sin(enemy.walkPhase * 0.7) * 0.07);
  ctx.scale(spawnProgress, spawnProgress);
  ctx.globalAlpha = alpha;

  const stride = Math.sin(enemy.walkPhase) * 2.8 * scale;
  const reach = enemy.kind === "runner" ? 1.16 : 1;
  const lean = enemy.kind === "brute" ? 0.55 : 0.18;
  const armSwing = Math.sin(enemy.walkPhase * 1.2) * 2.4 * scale;

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(-6 * scale + stride, -7 * scale, 5.5 * scale, 4 * scale, -0.2, 0, TAU);
  ctx.ellipse(-6 * scale - stride, 7 * scale, 5.5 * scale, 4 * scale, 0.2, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.8 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(3 * scale, -6 * scale);
  ctx.lineTo((10 + 8 * reach) * scale, (-11 - armSwing) * scale);
  ctx.moveTo(3 * scale, 6 * scale);
  ctx.lineTo((10 + 8 * reach) * scale, (11 + armSwing) * scale);
  ctx.stroke();

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc((10 + 8 * reach) * scale, (-11 - armSwing) * scale, 2.6 * scale, 0, TAU);
  ctx.arc((10 + 8 * reach) * scale, (11 + armSwing) * scale, 2.6 * scale, 0, TAU);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-8 * scale, -9 * scale, 8 * scale, 9 * scale);
  bodyGradient.addColorStop(0, color);
  bodyGradient.addColorStop(1, dark);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(-1 * scale, 0, (11 + lean) * scale, 9.5 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(9, 14, 9, 0.75)";
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  if (enemy.kind === "brute") {
    ctx.fillStyle = hit ? "#f2f6df" : "#4b5a39";
    roundRectPath(ctx, -7 * scale, -11 * scale, 9 * scale, 22 * scale, 3 * scale);
    ctx.fill();
    ctx.strokeStyle = "rgba(170, 139, 72, 0.42)";
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();
    ctx.fillStyle = "#8b7a4a";
    ctx.fillRect(-3 * scale, -8 * scale, 1.8 * scale, 16 * scale);
  }

  if (enemy.kind === "spitter") {
    ctx.fillStyle = hit ? "#f2f6df" : "rgba(148, 205, 79, 0.55)";
    ctx.beginPath();
    ctx.arc(-4 * scale, -5 * scale, 4 * scale, 0, TAU);
    ctx.arc(-2 * scale, 5 * scale, 3 * scale, 0, TAU);
    ctx.arc(-9 * scale, 0, 2.2 * scale, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(7 * scale, 0, 7.4 * scale, 0, TAU);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(8.2 * scale, 0, 5.9 * scale, 0, TAU);
  ctx.fill();

  ctx.fillStyle = enemy.eye;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = enemy.eye;
  ctx.shadowBlur = 6 * scale;
  ctx.beginPath();
  ctx.arc(11 * scale, -2.5 * scale, 1.15 * scale, 0, TAU);
  ctx.arc(11 * scale, 2.5 * scale, 1.15 * scale, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(14, 19, 11, 0.8)";
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath();
  ctx.moveTo(10.5 * scale, 4.5 * scale);
  ctx.lineTo(13.4 * scale, 5.4 * scale);
  ctx.stroke();

  if (enemy.boss) {
    if (enemy.kind === "king") {
      ctx.fillStyle = "#ffd05a";
      ctx.beginPath();
      const crownX = 7 * scale;
      ctx.moveTo(crownX - 7 * scale, -6 * scale);
      ctx.lineTo(crownX - 5 * scale, -13 * scale);
      ctx.lineTo(crownX - 1 * scale, -7 * scale);
      ctx.lineTo(crownX + 3 * scale, -14 * scale);
      ctx.lineTo(crownX + 6 * scale, -6 * scale);
      ctx.lineTo(crownX + 10 * scale, -11 * scale);
      ctx.lineTo(crownX + 10 * scale, -3 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff6951";
      ctx.beginPath();
      ctx.arc(crownX + 2 * scale, -6.5 * scale, 1.3 * scale, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = "#6b7059";
      roundRectPath(ctx, -4 * scale, -15 * scale, 16 * scale, 6 * scale, 2 * scale);
      ctx.fill();
      ctx.fillStyle = "#c5b064";
      ctx.fillRect(2 * scale, -14 * scale, 3 * scale, 4 * scale);
    }
  }

  ctx.restore();
}

function drawBossAura(ctx, enemy, clock) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const pulse = 0.16 + Math.sin(clock * 2.4) * 0.05;
  ctx.fillStyle = enemy.kind === "king" ? `rgba(255, 83, 54, ${pulse})` : `rgba(175, 255, 94, ${pulse * 0.8})`;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.r + 22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawCoinSprite(ctx, coin, clock) {
  const bob = Math.sin(clock * 4.2 + coin.phase) * 2.8;
  const spin = 0.35 + Math.abs(Math.sin(clock * 3.1 + coin.phase)) * 0.65;
  const x = coin.x;
  const y = coin.y - bob;
  const valueScale = coin.value > 1 ? 1.13 : 1;
  const radius = 7.5 * valueScale;

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 9, radius, 3.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255, 193, 54, 0.16)";
  ctx.beginPath();
  ctx.arc(x, y, radius + 6 + Math.sin(clock * 5 + coin.phase) * 2, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(spin, 1);
  ctx.fillStyle = "#ffce5c";
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8e5f17";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(70, 42, 8, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.55, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 247, 197, 0.8)";
  ctx.beginPath();
  ctx.ellipse(-radius * 0.3, -radius * 0.35, radius * 0.24, radius * 0.15, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawPickupSprite(ctx, pickup, clock) {
  const bob = Math.sin(clock * 3.6 + pickup.phase) * 3;
  const x = pickup.x;
  const y = pickup.y - bob;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 10, 10, 4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255, 94, 93, 0.16)";
  ctx.beginPath();
  ctx.arc(x, y, 15 + Math.sin(clock * 4 + pickup.phase) * 2, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(clock * 1.4 + pickup.phase) * 0.1);
  ctx.fillStyle = "#e9e3d2";
  roundRectPath(ctx, -8, -8, 16, 16, 3);
  ctx.fill();
  ctx.fillStyle = "#ff5d61";
  roundRectPath(ctx, -1.8, -6, 3.6, 12, 1);
  ctx.fill();
  roundRectPath(ctx, -6, -1.8, 12, 3.6, 1);
  ctx.fill();
  ctx.strokeStyle = "#682426";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawBulletSprite(ctx, bullet) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const alpha = clamp(bullet.life / 0.82, 0, 1);
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = bullet.color;
  ctx.lineWidth = bullet.radius * 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bullet.prevX, bullet.prevY);
  ctx.lineTo(bullet.x, bullet.y);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.88;
  ctx.strokeStyle = bullet.color;
  ctx.lineWidth = bullet.radius * 1.4;
  ctx.beginPath();
  ctx.moveTo(bullet.prevX, bullet.prevY);
  ctx.lineTo(bullet.x, bullet.y);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fffbe4";
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius * 0.62, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawEnemyShotSprite(ctx, shot, clock) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(156, 255, 76, 0.15)";
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.radius * 2.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#a9f25d";
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.radius, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f0ffd2";
  ctx.beginPath();
  ctx.arc(shot.x - 1, shot.y - 1, shot.radius * 0.42, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i += 1) {
    const angle = clock * 3 + i * 2.1 + shot.seed;
    ctx.fillStyle = "rgba(163, 255, 82, 0.5)";
    ctx.beginPath();
    ctx.arc(shot.x + Math.cos(angle) * shot.radius * 1.5, shot.y + Math.sin(angle) * shot.radius * 1.5, 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawParticleSprite(ctx, particle) {
  const lifeRatio = particle.life / particle.maxLife;
  ctx.save();
  ctx.globalAlpha = clamp(lifeRatio, 0, 1) * particle.alpha;
  if (particle.glow) ctx.globalCompositeOperation = "lighter";
  if (particle.streak) {
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = Math.max(0.6, particle.size * lifeRatio);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x - particle.vx * 0.025, particle.y - particle.vy * 0.025);
    ctx.stroke();
  } else {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(0.2, particle.size * (0.35 + lifeRatio * 0.65)), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawRingSprite(ctx, ring) {
  const progress = 1 - ring.life / ring.maxLife;
  const radius = ring.radius * (0.25 + progress * 0.75);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (1 - progress) * 0.8;
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = Math.max(0.7, ring.width * (1 - progress));
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawDamageTextSprite(ctx, text) {
  const progress = 1 - text.life / text.maxLife;
  const alpha = clamp(text.life / text.maxLife, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${text.crit ? 900 : 800} ${text.size}px "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(2, text.size * 0.18);
  ctx.strokeStyle = "rgba(5, 8, 6, 0.82)";
  ctx.strokeText(text.text, text.x, text.y - progress * 26);
  ctx.fillStyle = text.color;
  ctx.fillText(text.text, text.x, text.y - progress * 26);
  ctx.restore();
}

export function drawGhostSprite(ctx, ghost, clock) {
  const alpha = ghost.life / ghost.maxLife;
  const player = {
    ...ghost,
    moving: true,
    walkPhase: clock * 12,
    invuln: 0,
    muzzle: 0,
    recoil: 0,
  };
  drawPlayerSprite(ctx, player, clock, 0, alpha * 0.3, true);
}

export function drawCrosshair(ctx, x, y, clock, color = "#ffce5c") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(clock * 0.8);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.moveTo(-12, 0);
  ctx.lineTo(-5, 0);
  ctx.moveTo(12, 0);
  ctx.lineTo(5, 0);
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -5);
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 5);
  ctx.stroke();
  ctx.restore();
}
