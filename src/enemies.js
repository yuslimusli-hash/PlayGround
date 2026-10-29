import {
  ARENA,
  ENEMY_TYPES,
  TAU,
  clamp,
  distance,
  rand,
  randInt,
} from "./constants.js";

export const enemyMethods = {
  spawnEnemy(type, options = {}) {
    const def = ENEMY_TYPES[type];
    if (!def) return null;
    const wave = Math.max(1, this.waveNumber);
    const elite = !def.boss && wave >= 3 && Math.random() < 0.09;
    const position = options.x !== undefined
      ? { x: options.x, y: options.y }
      : this.spawnPosition(Boolean(def.boss));
    const hpScale = def.boss ? 1 : 1 + (wave - 1) * 0.17;
    const speedScale = 1 + Math.min(0.32, (wave - 1) * 0.022);
    const damageScale = 1 + (wave - 1) * 0.055;
    const enemy = {
      id: this.nextEntityId++,
      kind: type,
      name: def.name,
      x: clamp(position.x, 88, ARENA.w - 88),
      y: clamp(position.y, 88, ARENA.h - 88),
      r: def.radius * (elite ? 1.12 : 1),
      hp: def.hp * hpScale * (elite ? 1.9 : 1),
      maxHp: def.hp * hpScale * (elite ? 1.9 : 1),
      speed: def.speed * speedScale * (elite ? 0.93 : 1),
      damage: def.damage * damageScale,
      coins: def.coins * (elite ? 3 : 1),
      color: def.color,
      dark: def.dark,
      eye: def.eye,
      height: def.height,
      aimAngle: rand(0, TAU),
      walkPhase: rand(0, TAU),
      wobble: rand(0, TAU),
      hitFlash: 0,
      spawnT: def.boss ? 1.05 : 0.65,
      spawnMax: def.boss ? 1.05 : 0.65,
      atkCd: rand(0.1, 0.4),
      attackAnim: 0,
      shootCd: rand(1.2, 2.4),
      elite,
      boss: Boolean(def.boss),
      dead: false,
      chargeState: null,
      chargeTimer: 0,
      chargeDir: 0,
      chargeCd: rand(3.2, 4.2),
      summonCd: rand(5.5, 7),
      specialPulse: rand(0, TAU),
    };
    this.enemies.push(enemy);
    this.spawnRing(enemy.x, enemy.y, def.boss ? "rgba(255, 111, 72, 0.7)" : "rgba(137, 181, 84, 0.48)", def.boss ? 120 : 48, def.boss ? 0.9 : 0.55, def.boss ? 6 : 2.5);
    this.spawnBurst(enemy.x, enemy.y, def.boss ? 30 : 7, {
      colors: def.boss ? ["#ff8d5b", "#ffce5c", "#728f48"] : ["#768f4d", "#a6b877", "#3b4e2b"],
      speed: def.boss ? 190 : 65,
      size: def.boss ? 4 : 2.4,
      life: def.boss ? 0.9 : 0.45,
      drag: 3,
      glow: Boolean(def.boss),
    });
    if (def.boss) {
      this.bossId = enemy.id;
      this.dom.bossName.textContent = def.name;
      this.dom.bossWrap.hidden = false;
      this.audio.boss();
      this.shake(12, 0.7);
      this.showAnnounce("BOSS INCOMING", def.name, type === "king" ? "Break the crown. End the civilization." : "Break it before it breaks you.", true, 2.6);
    }
    return enemy;
  },

  spawnPosition(boss = false) {
    const player = this.player;
    const halfW = this.viewWidth / 2;
    const halfH = this.viewHeight / 2;
    if (boss) {
      const dist = clamp(Math.min(halfW, halfH) * 0.7, 210, 380);
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const angle = rand(0, TAU);
        const x = player.x + Math.cos(angle) * dist;
        const y = player.y + Math.sin(angle) * dist;
        if (x > 140 && x < ARENA.w - 140 && y > 140 && y < ARENA.h - 140) {
          return { x, y };
        }
      }
    }
    for (let attempt = 0; attempt < 28; attempt += 1) {
      const edge = Math.floor(rand(0, 4));
      const offset = rand(45, 120);
      let x;
      let y;
      if (edge === 0) {
        x = player.x + rand(-halfW, halfW);
        y = player.y - halfH - offset;
      } else if (edge === 1) {
        x = player.x + rand(-halfW, halfW);
        y = player.y + halfH + offset;
      } else if (edge === 2) {
        x = player.x - halfW - offset;
        y = player.y + rand(-halfH, halfH);
      } else {
        x = player.x + halfW + offset;
        y = player.y + rand(-halfH, halfH);
      }
      if (x > 110 && x < ARENA.w - 110 && y > 110 && y < ARENA.h - 110) {
        if (distance(x, y, player.x, player.y) > 280) return { x, y };
      }
    }
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const angle = rand(0, TAU);
      const dist = clamp(Math.min(halfW, halfH) * 1.25, 320, 560);
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;
      if (x > 120 && x < ARENA.w - 120 && y > 120 && y < ARENA.h - 120) return { x, y };
    }
    return {
      x: clamp(player.x + rand(-400, 400), 110, ARENA.w - 110),
      y: clamp(player.y + rand(-400, 400), 110, ARENA.h - 110),
    };
  },

  updateEnemies(dt) {
    if (!this.player || this.player.dead) return;
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    const player = this.player;

    for (const enemy of this.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackAnim = Math.max(0, enemy.attackAnim - dt);
      enemy.atkCd = Math.max(0, enemy.atkCd - dt);
      enemy.spawnT = Math.max(0, enemy.spawnT - dt);
      if (enemy.spawnT > 0) {
        if (Math.random() < dt * 10) {
          this.spawnBurst(enemy.x + rand(-14, 14), enemy.y + rand(-14, 14), 1, {
            colors: ["#52633d", "#85956a"],
            speed: 25,
            size: 2.4,
            life: 0.45,
            drag: 4,
          });
        }
        continue;
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const unitX = dx / dist;
      const unitY = dy / dist;

      let moved = false;
      if (enemy.boss) {
        moved = this.updateBoss(enemy, dt, dist, unitX, unitY);
      }

      if (!moved) {
        let dirX = unitX;
        let dirY = unitY;
        let speed = enemy.speed;
        if (enemy.kind === "spitter") {
          if (dist < 235) {
            dirX = -unitX;
            dirY = -unitY;
          } else if (dist < 315) {
            const strafe = Math.sin(this.clock * 1.4 + enemy.wobble) > 0 ? 1 : -1;
            dirX = -unitY * strafe;
            dirY = unitX * strafe;
            speed *= 0.42;
          }
        } else {
          const sway = Math.sin(this.clock * 1.7 + enemy.wobble) * 0.16;
          const cos = Math.cos(sway);
          const sin = Math.sin(sway);
          const rotatedX = dirX * cos - dirY * sin;
          const rotatedY = dirX * sin + dirY * cos;
          dirX = rotatedX;
          dirY = rotatedY;
        }
        enemy.x += dirX * speed * dt;
        enemy.y += dirY * speed * dt;
        enemy.aimAngle = Math.atan2(unitY, unitX);
      }

      enemy.walkPhase += dt * (enemy.kind === "runner" ? 8 : enemy.boss ? 2.5 : 4.2);
      enemy.x = clamp(enemy.x, 70, ARENA.w - 70);
      enemy.y = clamp(enemy.y, 70, ARENA.h - 70);

      if (enemy.kind === "spitter") {
        enemy.shootCd -= dt;
        if (dist < 440 && enemy.shootCd <= 0) {
          this.shootAcid(enemy);
          enemy.shootCd = rand(2.15, 3.1);
        }
      }
    }

    this.separateEnemies();
    this.resolvePlayerCollisions();
  },

  updateBoss(enemy, dt, dist, unitX, unitY) {
    enemy.chargeCd -= dt;
    enemy.summonCd -= dt;

    if (enemy.chargeState === "wind") {
      enemy.chargeTimer -= dt;
      enemy.aimAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      if (Math.random() < dt * 16) {
        this.spawnBurst(enemy.x + rand(-enemy.r, enemy.r), enemy.y + rand(-enemy.r, enemy.r), 1, {
          colors: ["#ff7f5a", "#ffce5c"],
          speed: 25,
          size: 2.5,
          life: 0.35,
          drag: 3,
          glow: true,
        });
      }
      if (enemy.chargeTimer <= 0) {
        enemy.chargeState = "dash";
        enemy.chargeTimer = 0.42;
        enemy.chargeDir = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
        this.audio.boss();
      }
      return true;
    }

    if (enemy.chargeState === "dash") {
      const speed = enemy.kind === "king" ? 650 : 560;
      enemy.x += Math.cos(enemy.chargeDir) * speed * dt;
      enemy.y += Math.sin(enemy.chargeDir) * speed * dt;
      enemy.aimAngle = enemy.chargeDir;
      this.spawnBurst(enemy.x, enemy.y, 1, {
        colors: ["#ff9b63", "#ffce5c", "#795736"],
        speed: 70,
        size: 3,
        life: 0.3,
        drag: 4,
        glow: true,
      });
      if (distance(enemy.x, enemy.y, this.player.x, this.player.y) < enemy.r + this.player.r + 8) {
        this.damagePlayer(enemy.damage * 1.35);
      }
      enemy.chargeTimer -= dt;
      if (enemy.chargeTimer <= 0) {
        enemy.chargeState = null;
        enemy.chargeCd = rand(3.8, 5.2);
        this.spawnRing(enemy.x, enemy.y, "rgba(255, 116, 78, 0.55)", 95, 0.5, 4);
      }
      return true;
    }

    if (enemy.chargeCd <= 0 && dist > 130 && dist < 640) {
      enemy.chargeState = "wind";
      enemy.chargeTimer = 0.72;
      enemy.chargeCd = 999;
      this.spawnRing(enemy.x, enemy.y, "rgba(255, 105, 61, 0.4)", 130, 0.72, 3);
      return true;
    }

    if (enemy.summonCd <= 0 && this.enemies.filter((other) => !other.dead).length < 48) {
      const count = enemy.kind === "king" ? 4 : 3;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * TAU + rand(-0.3, 0.3);
        const type = enemy.kind === "king" && i === 0 ? "brute" : "runner";
        this.spawnEnemy(type, {
          x: enemy.x + Math.cos(angle) * (enemy.r + 52),
          y: enemy.y + Math.sin(angle) * (enemy.r + 52),
        });
        this.waveTotal += 1;
      }
      this.spawnRing(enemy.x, enemy.y, "rgba(172, 255, 94, 0.55)", 180, 0.8, 5);
      this.shake(7, 0.35);
      enemy.summonCd = enemy.kind === "king" ? 6.2 : 7.8;
    }

    const sway = Math.sin(this.clock * 1.1 + enemy.specialPulse) * 0.14;
    const cos = Math.cos(sway);
    const sin = Math.sin(sway);
    enemy.x += (unitX * cos - unitY * sin) * enemy.speed * dt;
    enemy.y += (unitX * sin + unitY * cos) * enemy.speed * dt;
    enemy.aimAngle = Math.atan2(unitY, unitX);
    return true;
  },

  separateEnemies() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j += 1) {
        const b = list[j];
        if (b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDistance = (a.r + b.r) * 0.86;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDistance * minDistance || distSq === 0) continue;
        const dist = Math.sqrt(distSq);
        const overlap = minDistance - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const aWeight = a.boss ? 0.08 : b.boss ? 0.92 : 0.5;
        const bWeight = 1 - aWeight;
        a.x -= nx * overlap * aWeight;
        a.y -= ny * overlap * aWeight;
        b.x += nx * overlap * bWeight;
        b.y += ny * overlap * bWeight;
      }
    }
  },

  resolvePlayerCollisions() {
    const player = this.player;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnT > 0) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minimum = player.r + enemy.r - 1;
      if (dist >= minimum) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const push = minimum - dist;
      enemy.x -= nx * push * 0.62;
      enemy.y -= ny * push * 0.62;
      player.x += nx * push * 0.38;
      player.y += ny * push * 0.38;
      if (enemy.atkCd <= 0) {
        this.damagePlayer(enemy.damage);
        enemy.atkCd = enemy.boss ? 0.72 : 0.92;
        enemy.attackAnim = 0.2;
        if (navigator.vibrate) navigator.vibrate(20);
      }
    }
    player.x = clamp(player.x, 82, ARENA.w - 82);
    player.y = clamp(player.y, 82, ARENA.h - 82);
  },

  shootAcid(enemy) {
    const player = this.player;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + rand(-0.1, 0.1);
    const speed = 235;
    const radius = 7.5;
    this.enemyShots.push({
      x: enemy.x + Math.cos(angle) * enemy.r * 0.8,
      y: enemy.y + Math.sin(angle) * enemy.r * 0.8,
      prevX: enemy.x,
      prevY: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 3.2,
      radius,
      damage: enemy.damage + 5,
      seed: rand(0, TAU),
    });
    this.spawnBurst(enemy.x + Math.cos(angle) * enemy.r, enemy.y + Math.sin(angle) * enemy.r, 4, {
      colors: ["#a9f25d", "#5c8d2e"],
      speed: 55,
      size: 2.2,
      life: 0.28,
      drag: 4,
      glow: true,
    });
    this.audio.acid();
  },

  updateWave(dt) {
    if (this.wavePhase === "idle") return;
    if (this.wavePhase === "intro") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wavePhase = "fight";
        this.waveSpawnTimer = 0;
      }
      return;
    }
    if (this.wavePhase === "fight") {
      this.waveSpawnTimer -= dt;
      const alive = this.enemies.filter((enemy) => !enemy.dead).length;
      if (this.spawnQueue.length > 0 && this.waveSpawnTimer <= 0 && alive < 55) {
        const type = this.spawnQueue.shift();
        this.spawnEnemy(type);
        const interval = Math.max(0.26, 0.8 - this.waveNumber * 0.045);
        this.waveSpawnTimer = interval * rand(0.72, 1.12);
        if (this.waveNumber >= 6 && this.spawnQueue.length > 0 && Math.random() < 0.64) {
          this.waveSpawnTimer = Math.max(0.12, this.waveSpawnTimer * 0.4);
        }
      }
      if (this.spawnQueue.length === 0 && this.enemies.every((enemy) => enemy.dead)) {
        this.completeWave();
      }
      return;
    }
    if (this.wavePhase === "clear") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        if (this.waveNumber >= 10) this.startVictorySequence();
        else this.openShop();
      }
    }
  },

  completeWave() {
    if (this.wavePhase === "clear") return;
    this.wavePhase = "clear";
    this.waveTimer = 1.9;
    const bonus = 10 + this.waveNumber * 4;
    this.coins += bonus;
    this.coinsCollected += bonus;
    this.coinDrops.forEach((coin) => {
      coin.vacuum = true;
    });
    this.pickups.forEach((pickup) => {
      pickup.vacuum = true;
    });
    this.spawnBurst(this.player.x, this.player.y, 24, {
      colors: ["#ffce5c", "#ffe9ad", "#ffb128"],
      speed: 190,
      size: 3,
      life: 0.8,
      drag: 3,
      glow: true,
    });
    this.spawnRing(this.player.x, this.player.y, "rgba(255, 206, 92, 0.6)", 140, 0.75, 5);
    this.showAnnounce(`WAVE ${this.waveNumber} CLEARED`, `+${bonus} GOLD`, "The armory is open. Spend it well.", false, 1.85);
    this.audio.upgrade();
    this.updateHud(true);
  },
};
