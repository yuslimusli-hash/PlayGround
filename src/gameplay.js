import {
  ARENA,
  MAX_PARTICLES,
  TAU,
  clamp,
  distance,
  lerp,
  lerpAngle,
  rand,
} from "./constants.js";

export const combatMethods = {
  updateGame(dt) {
    this.runTime += dt;
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.hitSoundTimer = Math.max(0, this.hitSoundTimer - dt);
    this.coinSoundTimer = Math.max(0, this.coinSoundTimer - dt);
    this.moveHintTimer = Math.max(0, this.moveHintTimer - dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateEnemyShots(dt);
    this.updateCoins(dt);
    this.updateParticles(dt);
    this.updateDamageTexts(dt);
    this.updateEffects(dt);
    this.updateWave(dt);
    this.updateCamera(dt);
    this.updateHud();
    this.updateAnnounce(dt);
  },

  updateDying(dt) {
    this.deathTimer -= dt;
    this.updateCamera(dt, 0.38);
    this.updateParticles(dt * 0.55);
    this.updateEffects(dt);
    this.updateDust(dt * 0.3);
    if (this.deathTimer <= 0) this.showEnd(false);
  },

  updateVictory(dt) {
    this.victoryTimer -= dt;
    this.updateCamera(dt, 0.7);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updateDust(dt * 0.4);
    if (Math.random() < dt * 16) {
      const angle = rand(0, TAU);
      const radius = rand(30, Math.max(this.w, this.h) * 0.4);
      this.spawnBurst(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius, 2, {
        colors: ["#ffce5c", "#ffe9a6", "#ffb12f"],
        speed: 42,
        size: 3,
        life: 1.6,
        drag: 1,
        glow: true,
      });
    }
    if (this.victoryTimer <= 0) this.showEnd(true);
  },

  updateMenu(dt) {
    this.player.walkPhase += dt * 1.2;
    const target = this.enemies.reduce((best, enemy) => {
      const d = distance(this.player.x, this.player.y, enemy.x, enemy.y);
      if (!best || d < best.d) return { enemy, d };
      return best;
    }, null);
    if (target) {
      const desired = Math.atan2(target.enemy.y - this.player.y, target.enemy.x - this.player.x);
      this.player.aimAngle = lerpAngle(this.player.aimAngle, desired, 1 - Math.exp(-dt * 0.7));
    }
    this.enemies.forEach((enemy, index) => {
      enemy.demoAngle += dt * (0.02 + index * 0.0015);
      const wobble = Math.sin(this.clock * 0.5 + enemy.wobble) * 13;
      enemy.x = this.player.x + Math.cos(enemy.demoAngle) * (enemy.demoRadius + wobble);
      enemy.y = this.player.y + Math.sin(enemy.demoAngle) * (enemy.demoRadius + wobble);
      enemy.aimAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      enemy.walkPhase += dt * (enemy.kind === "runner" ? 3.8 : 2.2);
    });
    this.camera.x = this.player.x + Math.sin(this.clock * 0.11) * 38 + 24;
    this.camera.y = this.player.y + Math.cos(this.clock * 0.09) * 26;
    this.clampCamera();
    this.menuMotes.forEach((mote) => {
      mote.y -= mote.speed * dt;
      mote.x += Math.sin(this.clock + mote.phase) * 4 * dt;
      if (mote.y < this.player.y - 300) mote.y = this.player.y + 280;
    });
    this.updateParticles(dt * 0.5);
    this.updateEffects(dt);
    this.updateDust(dt);
  },

  updatePlayer(dt) {
    const player = this.player;
    if (player.dead) return;
    player.invuln = Math.max(0, player.invuln - dt);
    player.muzzle = Math.max(0, player.muzzle - dt);
    player.recoil = Math.max(0, player.recoil - dt * 8);
    player.dashTime = Math.max(0, player.dashTime - dt);

    const move = this.input.getMoveVector();
    player.moveX = move.x;
    player.moveY = move.y;
    player.moving = move.active || player.dashTime > 0;

    if (player.dashTime > 0) {
      player.x += player.dashDirX * 720 * dt;
      player.y += player.dashDirY * 720 * dt;
      player.aimAngle = Math.atan2(player.dashDirY, player.dashDirX);
      if (Math.random() < dt * 45) {
        this.ghosts.push({
          x: player.x,
          y: player.y,
          aimAngle: player.aimAngle,
          life: 0.24,
          maxLife: 0.24,
        });
      }
      this.spawnBurst(player.x, player.y, 1, {
        colors: ["#ffce5c", "#d8cda8"],
        speed: 32,
        size: 2,
        life: 0.24,
        drag: 3,
        glow: true,
      });
    } else if (move.active) {
      const speed = player.speed * clamp(Math.hypot(move.x, move.y), 0, 1);
      player.x += move.x * speed * dt;
      player.y += move.y * speed * dt;
      player.walkPhase += dt * (8 + speed * 0.02);
      if (Math.random() < dt * 8) {
        this.spawnBurst(player.x, player.y + 8, 1, {
          colors: ["rgba(116, 113, 88, 0.4)"],
          speed: 14,
          size: 2.6,
          life: 0.45,
          drag: 3,
        });
      }
    } else {
      player.walkPhase += dt * 1.4;
    }

    player.x = clamp(player.x, 82, ARENA.w - 82);
    player.y = clamp(player.y, 82, ARENA.h - 82);

    const target = this.findTarget(620);
    if (target) {
      const desired = Math.atan2(target.y - player.y, target.x - player.x);
      player.aimAngle = lerpAngle(player.aimAngle, desired, 1 - Math.exp(-dt * 16));
    } else if (move.active) {
      const desired = Math.atan2(move.y, move.x);
      player.aimAngle = lerpAngle(player.aimAngle, desired, 1 - Math.exp(-dt * 8));
    }

    const stats = this.getWeaponStats();
    player.fireTimer -= dt;
    if (target && player.fireTimer <= 0 && this.wavePhase !== "intro") {
      const targetDistance = distance(player.x, player.y, target.x, target.y);
      if (targetDistance < 545) {
        this.fireWeapon(stats, target);
        player.fireTimer = stats.fireDelay;
      }
    }
  },

  findTarget(range) {
    let best = null;
    let bestScore = Infinity;
    const margin = 70;
    const halfW = this.viewWidth / 2 + margin;
    const halfH = this.viewHeight / 2 + margin;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnT > 0) continue;
      if (Math.abs(enemy.x - this.camera.x) > halfW) continue;
      if (Math.abs(enemy.y - this.camera.y) > halfH) continue;
      const d = distance(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d > range) continue;
      const score = d - (enemy.boss ? 36 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    return best;
  },

  fireWeapon(stats, target) {
    const player = this.player;
    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    player.aimAngle = angle;
    const muzzleDistance = 23 + stats.barrel * 0.45;
    const baseX = player.x + Math.cos(angle) * muzzleDistance;
    const baseY = player.y + Math.sin(angle) * muzzleDistance;
    const pellets = stats.pellets;
    for (let i = 0; i < pellets; i += 1) {
      let offset = 0;
      if (pellets > 1) {
        offset = ((i / (pellets - 1)) * 2 - 1) * stats.spread;
        offset += rand(-0.014, 0.014);
      } else {
        offset = rand(-stats.spread, stats.spread);
      }
      const bulletAngle = angle + offset;
      const speed = stats.speed * rand(0.96, 1.04);
      const critical = Math.random() < 0.09;
      this.bullets.push({
        x: baseX,
        y: baseY,
        prevX: baseX,
        prevY: baseY,
        vx: Math.cos(bulletAngle) * speed,
        vy: Math.sin(bulletAngle) * speed,
        radius: stats.bulletRadius,
        damage: stats.damage * (critical ? 1.85 : 1),
        pierce: stats.pierce,
        life: 0.82,
        color: stats.color,
        hitIds: [],
        tier: this.weaponTier,
        critical,
      });
    }
    player.muzzle = 0.07;
    player.recoil = 1;
    this.shake(this.weaponTier >= 2 ? 1.9 : 1.1, 0.055);
    this.audio.shot(this.weaponTier);
    this.spawnBurst(baseX, baseY, this.weaponTier === 2 ? 7 : 3, {
      colors: ["#fff3be", stats.color, "#ffe39a"],
      speed: 120,
      size: 2.4,
      life: 0.16,
      drag: 8,
      glow: true,
    });
    if (Math.random() < 0.55) {
      this.spawnBurst(player.x + Math.cos(angle) * 12, player.y + Math.sin(angle) * 12, 1, {
        colors: ["#c6982d"],
        speed: 70,
        size: 1.8,
        life: 0.5,
        drag: 3,
      });
    }
  },

  updateBullets(dt) {
    const survivors = [];
    for (const bullet of this.bullets) {
      bullet.prevX = bullet.x;
      bullet.prevY = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      let alive = bullet.life > 0 && bullet.x > 40 && bullet.x < ARENA.w - 40 && bullet.y > 40 && bullet.y < ARENA.h - 40;
      if (alive) {
        for (const enemy of this.enemies) {
          if (enemy.dead || enemy.spawnT > 0) continue;
          if (bullet.hitIds.includes(enemy.id)) continue;
          if (distance(bullet.x, bullet.y, enemy.x, enemy.y) > bullet.radius + enemy.r) continue;
          bullet.hitIds.push(enemy.id);
          const hitAngle = Math.atan2(bullet.vy, bullet.vx);
          this.damageEnemy(enemy, bullet.damage, hitAngle, bullet.critical);
          bullet.pierce -= 1;
          if (bullet.pierce < 0) {
            alive = false;
            break;
          }
        }
      }
      if (alive) survivors.push(bullet);
    }
    this.bullets = survivors;
  },

  damageEnemy(enemy, amount, angle, critical = false) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.hitFlash = 0.1;
    const knock = enemy.boss ? 0 : enemy.kind === "brute" ? 1.8 : 5;
    if (knock) {
      enemy.x += Math.cos(angle) * knock;
      enemy.y += Math.sin(angle) * knock;
    }
    this.damageTexts.push({
      x: enemy.x + rand(-5, 5),
      y: enemy.y - enemy.r - 4,
      text: critical ? `${Math.round(amount)}!` : String(Math.round(amount)),
      color: critical ? "#ffe28b" : "#f4f1df",
      size: critical ? 17 : 11 + Math.min(5, enemy.r / 7),
      crit: critical,
      life: critical ? 0.75 : 0.55,
      maxLife: critical ? 0.75 : 0.55,
    });
    const goo = enemy.kind === "walker" || enemy.kind === "runner" || enemy.kind === "spitter"
      ? ["#8fb750", "#5b7830", "#c4d58a"]
      : ["#7f9b51", "#3d5127", "#b2c37e"];
    this.spawnBurst(enemy.x + Math.cos(angle) * enemy.r * 0.4, enemy.y + Math.sin(angle) * enemy.r * 0.4, enemy.boss ? 8 : 4, {
      colors: goo,
      speed: critical ? 160 : 110,
      size: 2.4,
      life: 0.32,
      drag: 5,
    });
    if (this.hitSoundTimer <= 0) {
      this.audio.hit(enemy.boss);
      this.hitSoundTimer = 0.045;
    }
    if (enemy.hp <= 0) this.killEnemy(enemy);
  },

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    if (this.wavePhase === "fight") this.waveKills += 1;
    const colors = enemy.boss ? ["#ffce5c", "#ff8a52", "#b7f26d"] : ["#6f8e49", "#3f552d", "#b3cd74"];
    this.spawnBurst(enemy.x, enemy.y, enemy.boss ? 55 : enemy.kind === "brute" ? 22 : 12, {
      colors,
      speed: enemy.boss ? 260 : 150,
      size: enemy.boss ? 4.5 : 3,
      life: enemy.boss ? 1 : 0.55,
      drag: 2.4,
      glow: enemy.boss,
    });
    if (enemy.kind === "brute" || enemy.boss) {
      this.audio.explode(Boolean(enemy.boss));
      this.shake(enemy.boss ? 18 : 5, enemy.boss ? 0.6 : 0.25);
    }
    if (enemy.boss) {
      this.bossId = null;
      this.dom.bossWrap.hidden = true;
      this.spawnRing(enemy.x, enemy.y, "rgba(255, 124, 74, 0.8)", 300, 1.1, 9);
      this.spawnRing(enemy.x, enemy.y, "rgba(255, 206, 92, 0.5)", 180, 0.8, 5);
      if (enemy.kind === "king") {
        for (const other of this.enemies) {
          if (other === enemy || other.dead) continue;
          other.dead = true;
          this.kills += 1;
          this.spawnBurst(other.x, other.y, 10, {
            colors: ["#7d994e", "#c9db8c", "#ffce5c"],
            speed: 140,
            size: 2.6,
            life: 0.6,
            drag: 3,
            glow: true,
          });
        }
      }
    }
    this.dropLoot(enemy);
  },

  dropLoot(enemy) {
    const amount = Math.max(1, Math.round(enemy.coins * (enemy.elite ? 3 : 1) * rand(0.85, 1.15)));
    const pieces = clamp(Math.ceil(amount / 2), 1, 14);
    let remaining = amount;
    for (let i = 0; i < pieces; i += 1) {
      const value = i === pieces - 1 ? remaining : Math.max(1, Math.floor(amount / pieces) + (Math.random() < 0.3 ? 1 : 0));
      remaining -= value;
      const angle = rand(0, TAU);
      const force = rand(40, enemy.boss ? 260 : 160);
      this.coinDrops.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        value: Math.max(1, value),
        phase: rand(0, TAU),
        vacuum: Boolean(enemy.boss),
        age: 0,
      });
    }
    const healthChance = enemy.boss ? 1 : enemy.kind === "brute" ? 0.22 : 0.035;
    if (this.player.hp < this.player.maxHp && Math.random() < healthChance) {
      this.pickups.push({
        x: enemy.x + rand(-12, 12),
        y: enemy.y + rand(-12, 12),
        phase: rand(0, TAU),
        vacuum: Boolean(enemy.boss),
        age: 0,
      });
    }
  },

  updateCoins(dt) {
    const player = this.player;
    if (!player || player.dead) return;
    const stats = this.getWeaponStats();
    const survivors = [];
    for (const coin of this.coinDrops) {
      coin.age += dt;
      const dist = distance(coin.x, coin.y, player.x, player.y);
      const magnetized = coin.vacuum || dist < stats.magnet;
      if (magnetized) {
        const pull = coin.vacuum ? 10 : 5;
        coin.vx += ((player.x - coin.x) / Math.max(1, dist)) * 900 * pull * dt;
        coin.vy += ((player.y - coin.y) / Math.max(1, dist)) * 900 * pull * dt;
      }
      const drag = Math.exp(-dt * (magnetized ? 1.1 : 4.5));
      coin.vx *= drag;
      coin.vy *= drag;
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.x = clamp(coin.x, 64, ARENA.w - 64);
      coin.y = clamp(coin.y, 64, ARENA.h - 64);
      if (dist < player.r + 18) {
        this.coins += coin.value;
        this.coinsCollected += coin.value;
        this.spawnBurst(coin.x, coin.y, 4, {
          colors: ["#ffce5c", "#fff2bd"],
          speed: 55,
          size: 2,
          life: 0.32,
          drag: 4,
          glow: true,
        });
        if (this.coinSoundTimer <= 0) {
          this.audio.coin();
          this.coinSoundTimer = 0.045;
        }
        this.dom.coinLine.classList.remove("bump");
        void this.dom.coinLine.offsetWidth;
        this.dom.coinLine.classList.add("bump");
        continue;
      }
      survivors.push(coin);
    }
    this.coinDrops = survivors;

    const remainingPickups = [];
    for (const pickup of this.pickups) {
      pickup.age += dt;
      const dist = distance(pickup.x, pickup.y, player.x, player.y);
      const magnetized = pickup.vacuum || dist < stats.magnet;
      if (magnetized) {
        pickup.x += ((player.x - pickup.x) / Math.max(1, dist)) * 320 * dt;
        pickup.y += ((player.y - pickup.y) / Math.max(1, dist)) * 320 * dt;
      }
      if (dist < player.r + 18) {
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 28);
          this.spawnBurst(pickup.x, pickup.y, 12, {
            colors: ["#ff5d61", "#ffe8d7", "#ffffff"],
            speed: 90,
            size: 2.5,
            life: 0.55,
            drag: 4,
            glow: true,
          });
          this.audio.health();
          continue;
        }
      }
      remainingPickups.push(pickup);
    }
    this.pickups = remainingPickups;
  },

  updateEnemyShots(dt) {
    const survivors = [];
    for (const shot of this.enemyShots) {
      shot.life -= dt;
      shot.prevX = shot.x;
      shot.prevY = shot.y;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      let alive = shot.life > 0 && shot.x > 50 && shot.x < ARENA.w - 50 && shot.y > 50 && shot.y < ARENA.h - 50;
      if (alive && distance(shot.x, shot.y, this.player.x, this.player.y) < shot.radius + this.player.r) {
        this.damagePlayer(shot.damage);
        this.spawnBurst(shot.x, shot.y, 12, {
          colors: ["#a9f25d", "#5c8d2e", "#e6ffc4"],
          speed: 110,
          size: 2.6,
          life: 0.4,
          drag: 4,
          glow: true,
        });
        alive = false;
      }
      if (alive) survivors.push(shot);
    }
    this.enemyShots = survivors;
  },

  damagePlayer(amount) {
    const player = this.player;
    if (this.state !== "playing" || player.dead || player.invuln > 0) return;
    player.hp -= amount;
    player.invuln = 0.62;
    this.shake(8, 0.3);
    this.audio.hurt();
    if (navigator.vibrate) navigator.vibrate(35);
    this.dom.hurtFlash.classList.remove("hit");
    void this.dom.hurtFlash.offsetWidth;
    this.dom.hurtFlash.classList.add("hit");
    this.spawnBurst(player.x, player.y, 9, {
      colors: ["#ff5d61", "#8f1f26", "#ffb0a8"],
      speed: 100,
      size: 2.6,
      life: 0.42,
      drag: 4,
    });
    if (player.hp <= 0) this.die();
  },

  die() {
    if (this.player.dead) return;
    this.player.dead = true;
    this.player.hp = 0;
    this.state = "dying";
    this.deathTimer = 1.75;
    this.input.clear();
    this.dom.touchHint.classList.add("hide");
    this.audio.explode(true);
    this.audio.gameOver();
    this.canvas.style.filter = "saturate(.55) brightness(.72)";
    this.shake(22, 0.7);
    this.spawnBurst(this.player.x, this.player.y, 34, {
      colors: ["#ff5d61", "#ffce5c", "#d8d2b8"],
      speed: 210,
      size: 3.4,
      life: 0.9,
      drag: 2.5,
      glow: true,
    });
    this.spawnRing(this.player.x, this.player.y, "rgba(255, 93, 97, 0.65)", 220, 1, 6);
    if (navigator.vibrate) navigator.vibrate([50, 40, 80]);
  },

  updateParticles(dt) {
    const survivors = [];
    for (const particle of this.particles) {
      particle.life -= dt;
      if (particle.life <= 0) continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const drag = Math.exp(-dt * particle.drag);
      particle.vx *= drag;
      particle.vy *= drag;
      survivors.push(particle);
    }
    this.particles = survivors;
    const rings = [];
    for (const ring of this.rings) {
      ring.life -= dt;
      if (ring.life > 0) rings.push(ring);
    }
    this.rings = rings;
    const ghosts = [];
    for (const ghost of this.ghosts) {
      ghost.life -= dt;
      if (ghost.life > 0) ghosts.push(ghost);
    }
    this.ghosts = ghosts;
  },

  updateDamageTexts(dt) {
    const survivors = [];
    for (const text of this.damageTexts) {
      text.life -= dt;
      if (text.life > 0) survivors.push(text);
    }
    this.damageTexts = survivors;
  },

  updateEffects(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.dom.toast.classList.remove("show");
    }
  },

  spawnBurst(x, y, count, options = {}) {
    const colors = options.colors || ["#ffffff"];
    const speed = options.speed ?? 100;
    const size = options.size ?? 2;
    const life = options.life ?? 0.4;
    const drag = options.drag ?? 3;
    const glow = options.glow ?? false;
    const streak = options.streak ?? false;
    const alpha = options.alpha ?? 1;
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, TAU);
      const force = speed * rand(0.3, 1.15);
      this.particles.push({
        x: x + rand(-3, 3),
        y: y + rand(-3, 3),
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        size: size * rand(0.55, 1.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: life * rand(0.65, 1.2),
        maxLife: life,
        drag,
        glow,
        streak,
        alpha,
      });
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  },

  spawnRing(x, y, color, radius, life, width) {
    this.rings.push({ x, y, color, radius, life, maxLife: life, width });
  },

  shake(amount, duration) {
    if (this.reducedMotion) return;
    if (amount >= this.shakeAmount || this.shakeTime <= 0) {
      this.shakeAmount = amount;
      this.shakeDuration = duration;
      this.shakeTime = duration;
    }
  },

  updateCamera(dt, strength = 1) {
    const player = this.player;
    if (!player) return;
    const lookX = player.moveX * 26 + Math.cos(player.aimAngle) * 14;
    const lookY = player.moveY * 26 + Math.sin(player.aimAngle) * 14;
    const targetX = player.x + lookX * strength;
    const targetY = player.y + lookY * strength;
    const amount = 1 - Math.exp(-dt * 5.5);
    this.camera.x = lerp(this.camera.x, targetX, amount);
    this.camera.y = lerp(this.camera.y, targetY, amount);
    this.clampCamera();
  },

  updateDust(dt) {
    for (const mote of this.dust) {
      mote.y -= mote.speed * dt * 0.3;
      mote.x += Math.sin(this.clock * 0.5 + mote.phase) * mote.drift * dt * 12;
      if (mote.y < 30) {
        mote.y = ARENA.h - 30;
        mote.x = rand(30, ARENA.w - 30);
      }
    }
  },

  updateAnnounce(dt) {
    if (this.announceTimer <= 0) return;
    this.announceTimer -= dt;
    if (this.announceTimer <= 0) this.hideAnnounce();
  },
};
