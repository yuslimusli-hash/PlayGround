import { ARENA, TAU, clamp } from "./constants.js";
import {
  drawPlayerSprite,
  drawZombieSprite,
  drawCoinSprite,
  drawPickupSprite,
  drawBulletSprite,
  drawEnemyShotSprite,
  drawParticleSprite,
  drawRingSprite,
  drawDamageTextSprite,
  drawGhostSprite,
  drawCrosshair,
} from "./sprites.js";

export class Renderer {
  render(game) {
    const ctx = game.ctx;
    const { w, h, dpr, scale } = game;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a100c";
    ctx.fillRect(0, 0, w, h);

    const shakeAmount = game.shakeAmount > 0
      ? game.shakeAmount * (game.shakeTime / Math.max(0.001, game.shakeDuration))
      : 0;
    const shakeX = Math.sin(game.clock * 83) * shakeAmount;
    const shakeY = Math.cos(game.clock * 97) * shakeAmount;

    ctx.save();
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(scale, scale);
    ctx.translate(-game.camera.x, -game.camera.y);

    ctx.drawImage(game.worldArt, 0, 0);
    this.drawArena(ctx, game);
    this.drawDust(ctx, game);
    if (game.state === "menu") this.drawMenuMotes(ctx, game);
    this.drawGround(ctx, game);
    this.drawGhosts(ctx, game);
    this.drawEntities(ctx, game);
    this.drawBullets(ctx, game);
    this.drawShots(ctx, game);
    this.drawParticles(ctx, game);
    this.drawRings(ctx, game);
    this.drawDamage(ctx, game);
    if (game.state === "playing" || game.state === "paused" || game.state === "shop") {
      const target = game.findTarget(545);
      if (target) drawCrosshair(ctx, target.x, target.y, game.clock, "#ffce5c");
    }

    ctx.restore();

    this.drawJoystick(ctx, game);
    this.drawLowHealth(ctx, game);
    this.drawTopFade(ctx, game);
  }

  drawArena(ctx, game) {
    const wall = 58;
    const left = game.camera.x - game.viewWidth / 2 - 60;
    const right = game.camera.x + game.viewWidth / 2 + 60;
    const top = game.camera.y - game.viewHeight / 2 - 60;
    const bottom = game.camera.y + game.viewHeight / 2 + 60;
    ctx.save();
    ctx.fillStyle = "#090d0b";
    if (top < wall) ctx.fillRect(0, 0, ARENA.w, wall);
    if (bottom > ARENA.h - wall) ctx.fillRect(0, ARENA.h - wall, ARENA.w, wall);
    if (left < wall) ctx.fillRect(0, 0, wall, ARENA.h);
    if (right > ARENA.w - wall) ctx.fillRect(ARENA.w - wall, 0, wall, ARENA.h);

    ctx.strokeStyle = "rgba(255, 206, 92, 0.13)";
    ctx.lineWidth = 2;
    ctx.strokeRect(wall, wall, ARENA.w - wall * 2, ARENA.h - wall * 2);

    ctx.strokeStyle = "rgba(255, 206, 92, 0.22)";
    ctx.lineWidth = 8;
    ctx.setLineDash([18, 48]);
    ctx.strokeRect(wall + 11, wall + 11, ARENA.w - wall * 2 - 22, ARENA.h - wall * 2 - 22);
    ctx.setLineDash([]);

    const startX = Math.max(wall + 20, left);
    const endX = Math.min(ARENA.w - wall - 20, right);
    const startY = Math.max(wall + 20, top);
    const endY = Math.min(ARENA.h - wall - 20, bottom);
    ctx.strokeStyle = "rgba(214, 178, 73, 0.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = Math.floor(startX / 54) * 54; x < endX; x += 54) {
      if (top < wall) {
        ctx.moveTo(x, wall - 20);
        ctx.lineTo(x + 16, wall - 2);
      }
      if (bottom > ARENA.h - wall) {
        ctx.moveTo(x, ARENA.h - wall + 20);
        ctx.lineTo(x + 16, ARENA.h - wall + 2);
      }
    }
    for (let y = Math.floor(startY / 54) * 54; y < endY; y += 54) {
      if (left < wall) {
        ctx.moveTo(wall - 20, y);
        ctx.lineTo(wall - 2, y + 16);
      }
      if (right > ARENA.w - wall) {
        ctx.moveTo(ARENA.w - wall + 20, y);
        ctx.lineTo(ARENA.w - wall + 2, y + 16);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  drawDust(ctx, game) {
    ctx.save();
    ctx.fillStyle = "#d8e5b9";
    for (const mote of game.dust) {
      if (mote.x < game.camera.x - game.viewWidth / 2 - 10 || mote.x > game.camera.x + game.viewWidth / 2 + 10) continue;
      if (mote.y < game.camera.y - game.viewHeight / 2 - 10 || mote.y > game.camera.y + game.viewHeight / 2 + 10) continue;
      ctx.globalAlpha = mote.alpha * (0.55 + Math.sin(game.clock * 1.2 + mote.phase) * 0.45);
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMenuMotes(ctx, game) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const mote of game.menuMotes) {
      ctx.globalAlpha = mote.alpha * (0.45 + Math.sin(game.clock * 1.7 + mote.phase) * 0.35);
      ctx.fillStyle = "#ffcf5d";
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, TAU);
      ctx.fill();
      ctx.globalAlpha *= 0.22;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size * 5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawGround(ctx, game) {
    for (const coin of game.coinDrops) drawCoinSprite(ctx, coin, game.clock);
    for (const pickup of game.pickups) drawPickupSprite(ctx, pickup, game.clock);
  }

  drawGhosts(ctx, game) {
    for (const ghost of game.ghosts) drawGhostSprite(ctx, ghost, game.clock);
  }

  drawEntities(ctx, game) {
    const list = [];
    if (game.player && !game.player.dead) list.push({ y: game.player.y, type: "player" });
    for (const enemy of game.enemies) {
      if (!enemy.dead) list.push({ y: enemy.y, type: "enemy", enemy });
    }
    list.sort((a, b) => a.y - b.y);
    for (const item of list) {
      if (item.type === "player") {
        drawPlayerSprite(ctx, game.player, game.clock, game.weaponTier, 1, false);
      } else {
        drawZombieSprite(ctx, item.enemy, game.clock);
        this.drawEnemyHealth(ctx, item.enemy, game);
      }
    }
  }

  drawEnemyHealth(ctx, enemy, game) {
    if (enemy.boss || enemy.spawnT > 0 || enemy.hp >= enemy.maxHp) return;
    const width = enemy.r * 1.8;
    const x = enemy.x - width / 2;
    const y = enemy.y - enemy.r * (enemy.kind === "brute" ? 0.95 : 1.15) - 12;
    const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 6, 0.72)";
    ctx.fillRect(x, y, width, 3.5);
    ctx.fillStyle = enemy.elite ? "#ffd15b" : "#b7f26d";
    ctx.fillRect(x, y, width * ratio, 3.5);
    if (enemy.elite) {
      ctx.strokeStyle = "rgba(255, 209, 91, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 1, y - 1, width + 2, 5.5);
    }
    ctx.restore();
  }

  drawBullets(ctx, game) {
    for (const bullet of game.bullets) drawBulletSprite(ctx, bullet);
  }

  drawShots(ctx, game) {
    for (const shot of game.enemyShots) drawEnemyShotSprite(ctx, shot, game.clock);
  }

  drawParticles(ctx, game) {
    for (const particle of game.particles) drawParticleSprite(ctx, particle);
  }

  drawRings(ctx, game) {
    for (const ring of game.rings) drawRingSprite(ctx, ring);
  }

  drawDamage(ctx, game) {
    for (const text of game.damageTexts) drawDamageTextSprite(ctx, text);
  }

  drawJoystick(ctx, game) {
    if (game.state !== "playing") return;
    const input = game.input;
    let x;
    let y;
    let alpha;
    let radius = 54;
    if (input.joy.visible) {
      x = input.joy.originX;
      y = input.joy.originY;
      alpha = 0.75;
    } else {
      if (!game.isCoarse || game.moveHintTimer <= 0) return;
      x = 88;
      y = game.h - 100;
      alpha = 0.2;
      radius = 48;
    }
    const dx = input.joy.x - input.joy.originX;
    const dy = input.joy.y - input.joy.originY;
    const distance = Math.hypot(dx, dy);
    const max = input.joy.radius;
    const knobX = input.joy.visible ? x + (distance > max ? (dx / distance) * max : dx) : x;
    const knobY = input.joy.visible ? y + (distance > max ? (dy / distance) * max : dy) : y;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(8, 13, 10, 0.38)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 221, 137, 0.38)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 221, 137, 0.12)";
    ctx.setLineDash([3, 8]);
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.61, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 217, 124, 0.24)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, 21, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 231, 167, 0.5)";
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 246, 213, 0.38)";
    ctx.beginPath();
    ctx.arc(knobX - 5, knobY - 6, 6, 0, TAU);
    ctx.fill();
    if (!input.joy.visible) {
      ctx.fillStyle = "rgba(226, 233, 216, 0.5)";
      ctx.font = "800 7px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "2px";
      ctx.fillText("MOVE", x, y + radius + 16);
    }
    ctx.restore();
  }

  drawLowHealth(ctx, game) {
    if (!game.player || game.state !== "playing") return;
    const ratio = game.player.hp / game.player.maxHp;
    if (ratio > 0.32) return;
    const intensity = (0.32 - ratio) / 0.32;
    const pulse = 0.62 + Math.sin(game.clock * 5) * 0.18;
    const gradient = ctx.createRadialGradient(
      game.w / 2,
      game.h / 2,
      Math.min(game.w, game.h) * 0.24,
      game.w / 2,
      game.h / 2,
      Math.max(game.w, game.h) * 0.72,
    );
    gradient.addColorStop(0, "rgba(120, 8, 14, 0)");
    gradient.addColorStop(0.72, `rgba(134, 8, 16, ${0.16 * intensity * pulse})`);
    gradient.addColorStop(1, `rgba(153, 5, 15, ${0.5 * intensity * pulse})`);
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, game.w, game.h);
    ctx.restore();
  }

  drawTopFade(ctx, game) {
    const gradient = ctx.createLinearGradient(0, 0, 0, game.h * 0.2);
    gradient.addColorStop(0, "rgba(2, 5, 4, 0.5)");
    gradient.addColorStop(1, "rgba(2, 5, 4, 0)");
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, game.w, game.h * 0.2);
    ctx.restore();
  }
}
