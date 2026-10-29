import {
  ARENA,
  ENEMY_TYPES,
  SAVE_KEY,
  TAU,
  UPGRADES,
  WAVES,
  WEAPONS,
  clamp,
  distance,
  formatTime,
  rand,
} from "./constants.js";
import { createWorldArt } from "./worldart.js";
import { Renderer } from "./renderer.js";
import { combatMethods } from "./gameplay.js";
import { enemyMethods } from "./enemies.js";

export class Game {
  constructor(canvas, audio, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.audio = audio;
    this.input = input;
    this.dom = this.collectDom();
    this.renderer = new Renderer();
    this.state = "menu";
    this.clock = 0;
    this.lastFrame = 0;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = 1;
    this.scale = 1;
    this.coins = 0;
    this.coinsCollected = 0;
    this.kills = 0;
    this.runTime = 0;
    this.waveNumber = 0;
    this.wavePhase = "idle";
    this.waveTimer = 0;
    this.waveKills = 0;
    this.waveSpawnTimer = 0;
    this.waveTotal = 0;
    this.spawnQueue = [];
    this.weaponTier = 0;
    this.upgrades = this.createUpgrades();
    this.best = this.loadBest();
    this.enemies = [];
    this.bullets = [];
    this.enemyShots = [];
    this.coinDrops = [];
    this.pickups = [];
    this.particles = [];
    this.rings = [];
    this.damageTexts = [];
    this.ghosts = [];
    this.dust = [];
    this.menuMotes = [];
    this.camera = { x: ARENA.w / 2, y: ARENA.h / 2 };
    this.player = this.createPlayer(ARENA.w / 2, ARENA.h / 2);
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0.1;
    this.announceTimer = 0;
    this.toastTimer = 0;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.bossId = null;
    this.hitSoundTimer = 0;
    this.coinSoundTimer = 0;
    this.nextEntityId = 1;
    this.hudCache = {};
    this.moveHintTimer = 10;
    this.isCoarse = window.matchMedia("(pointer: coarse)").matches;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.worldArt = createWorldArt();
    this.createDust();
    this.setupMenuScene();
    this.bindUi();
    this.resize();
    this.updateBestUi();
    this.updateSoundUi();
    this.updateTiltUi(false);
    this.updateHud(true);

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  collectDom() {
    const byId = (id) => document.getElementById(id);
    return {
      hud: byId("hud"),
      hpFill: byId("hpFill"),
      hpText: byId("hpText"),
      coinText: byId("coinText"),
      coinLine: document.querySelector(".coin-line"),
      waveNo: byId("waveNo"),
      waveName: byId("waveName"),
      waveFill: byId("waveFill"),
      pauseBtn: byId("pauseBtn"),
      bossWrap: byId("bossWrap"),
      bossName: byId("bossName"),
      bossHpText: byId("bossHpText"),
      bossFill: byId("bossFill"),
      announce: byId("announce"),
      announceKicker: byId("announceKicker"),
      announceTitle: byId("announceTitle"),
      announceSub: byId("announceSub"),
      dashBtn: byId("dashBtn"),
      dashRing: byId("dashRing"),
      touchHint: byId("touchHint"),
      startScreen: byId("startScreen"),
      startBtn: byId("startBtn"),
      startTiltBtn: byId("startTiltBtn"),
      startTiltState: byId("startTiltState"),
      menuSoundBtn: byId("menuSoundBtn"),
      bestWave: byId("bestWave"),
      bestKills: byId("bestKills"),
      bestCoins: byId("bestCoins"),
      shopScreen: byId("shopScreen"),
      shopKicker: byId("shopKicker"),
      shopCoins: byId("shopCoins"),
      shopWeapon: byId("shopWeapon"),
      shopWeaponDesc: byId("shopWeaponDesc"),
      shopDps: byId("shopDps"),
      weaponOrb: byId("weaponOrb"),
      upgradeGrid: byId("upgradeGrid"),
      nextWaveBtn: byId("nextWaveBtn"),
      nextWaveNo: byId("nextWaveNo"),
      pauseScreen: byId("pauseScreen"),
      resumeBtn: byId("resumeBtn"),
      soundToggle: byId("soundToggle"),
      tiltToggle: byId("tiltToggle"),
      calibrateBtn: byId("calibrateBtn"),
      quitBtn: byId("quitBtn"),
      endScreen: byId("endScreen"),
      endCard: byId("endCard"),
      endKicker: byId("endKicker"),
      endTitle: byId("endTitle"),
      endSub: byId("endSub"),
      endWave: byId("endWave"),
      endKills: byId("endKills"),
      endCoins: byId("endCoins"),
      endTime: byId("endTime"),
      retryBtn: byId("retryBtn"),
      menuBtn: byId("menuBtn"),
      toast: byId("toast"),
      hurtFlash: byId("hurtFlash"),
    };
  }

  bindUi() {
    this.dom.startBtn.addEventListener("click", () => this.startRun());
    this.dom.menuSoundBtn.addEventListener("click", () => this.toggleSound());
    this.dom.startTiltBtn.addEventListener("click", () => this.handleTiltToggle());
    this.dom.pauseBtn.addEventListener("click", () => this.pause());
    this.dom.dashBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.tryDash();
    });
    this.dom.resumeBtn.addEventListener("click", () => this.resume());
    this.dom.soundToggle.addEventListener("click", () => this.toggleSound());
    this.dom.tiltToggle.addEventListener("click", () => this.handleTiltToggle());
    this.dom.calibrateBtn.addEventListener("click", () => {
      if (!this.input.tiltEnabled) return;
      if (this.input.calibrateTilt()) {
        this.showToast("Tilt neutral recalibrated.");
        this.audio.click();
      } else {
        this.showToast("No motion data yet. Tilt the device and try again.");
      }
    });
    this.dom.quitBtn.addEventListener("click", () => this.abandonRun());
    this.dom.retryBtn.addEventListener("click", () => this.startRun());
    this.dom.menuBtn.addEventListener("click", () => this.goToMenu());
    this.dom.nextWaveBtn.addEventListener("click", () => this.startNextWave());
    this.dom.upgradeGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-upgrade]");
      if (!card || card.disabled) return;
      if (card.dataset.upgrade === "evolve") this.buyEvolution();
      else this.buyUpgrade(card.dataset.upgrade);
    });
    this.input.handlers.onPause = () => {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
    };
    this.input.handlers.onMute = () => this.toggleSound();
    this.input.handlers.onDash = () => this.tryDash();
    this.input.handlers.onMoveStart = () => {
      this.dom.touchHint.classList.add("hide");
      this.moveHintTimer = 0;
    };
    this.input.handlers.onTiltChange = (enabled) => this.updateTiltUi(enabled);
    this.input.handlers.onTiltReady = () => {
      if (this.input.tiltEnabled) this.updateTiltUi(true);
    };
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resize(), 120));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause();
    });
    document.addEventListener("gesturestart", (event) => event.preventDefault());
  }

  loadBest() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return {
        bestWave: Number(parsed.bestWave) || 0,
        bestKills: Number(parsed.bestKills) || 0,
        bestCoins: Number(parsed.bestCoins) || 0,
      };
    } catch {
      return { bestWave: 0, bestKills: 0, bestCoins: 0 };
    }
  }

  saveBest() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.best));
    } catch {
      void 0;
    }
  }

  createUpgrades() {
    return { damage: 0, rate: 0, split: 0, pierce: 0, magnet: 0, vitality: 0 };
  }

  createPlayer(x, y) {
    return {
      x,
      y,
      r: 16,
      hp: 100,
      maxHp: 100,
      speed: 252,
      aimAngle: -Math.PI / 2,
      walkPhase: 0,
      moving: false,
      moveX: 0,
      moveY: 0,
      fireTimer: 0.18,
      muzzle: 0,
      recoil: 0,
      invuln: 0,
      dashCooldown: 0,
      dashMax: 3.1,
      dashTime: 0,
      dashDirX: 0,
      dashDirY: -1,
      dead: false,
    };
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.scale = clamp(Math.min(this.w / 430, this.h / 760) * 1.06, 0.7, 1.65);
    this.clampCamera();
  }

  get viewWidth() {
    return this.w / this.scale;
  }

  get viewHeight() {
    return this.h / this.scale;
  }

  clampCamera() {
    const halfW = this.viewWidth / 2;
    const halfH = this.viewHeight / 2;
    if (this.viewWidth >= ARENA.w) this.camera.x = ARENA.w / 2;
    else this.camera.x = clamp(this.camera.x, halfW, ARENA.w - halfW);
    if (this.viewHeight >= ARENA.h) this.camera.y = ARENA.h / 2;
    else this.camera.y = clamp(this.camera.y, halfH, ARENA.h - halfH);
  }

  createDust() {
    this.dust = [];
    for (let i = 0; i < 80; i += 1) {
      this.dust.push({
        x: rand(80, ARENA.w - 80),
        y: rand(80, ARENA.h - 80),
        size: rand(0.6, 2.2),
        speed: rand(2, 12),
        drift: rand(-0.3, 0.3),
        alpha: rand(0.05, 0.26),
        phase: rand(0, TAU),
      });
    }
  }

  setupMenuScene() {
    this.player = this.createPlayer(ARENA.w / 2 + 24, ARENA.h / 2 + 10);
    this.player.aimAngle = -0.22;
    this.camera.x = ARENA.w / 2 + 36;
    this.camera.y = ARENA.h / 2 - 20;
    this.enemies = [];
    const kinds = ["walker", "walker", "runner", "walker", "brute", "walker", "runner", "walker"];
    kinds.forEach((kind, index) => {
      const def = ENEMY_TYPES[kind];
      const angle = (index / kinds.length) * TAU + 0.34;
      const radius = 150 + rand(20, 105);
      this.enemies.push({
        id: this.nextEntityId++,
        kind,
        x: this.player.x + Math.cos(angle) * radius,
        y: this.player.y + Math.sin(angle) * radius,
        r: def.radius,
        hp: def.hp,
        maxHp: def.hp,
        speed: def.speed,
        damage: def.damage,
        coins: def.coins,
        color: def.color,
        dark: def.dark,
        eye: def.eye,
        height: def.height,
        aimAngle: angle + Math.PI,
        walkPhase: rand(0, TAU),
        hitFlash: 0,
        spawnT: 0,
        spawnMax: 0,
        atkCd: 0,
        attackAnim: 0,
        elite: false,
        boss: false,
        dead: false,
        demoAngle: angle,
        demoRadius: radius,
        wobble: rand(0, TAU),
      });
    });
    this.menuMotes = Array.from({ length: 34 }, () => ({
      x: this.player.x + rand(-330, 330),
      y: this.player.y + rand(-240, 240),
      size: rand(1, 3.2),
      speed: rand(3, 11),
      phase: rand(0, TAU),
      alpha: rand(0.16, 0.64),
    }));
    this.bullets = [];
    this.enemyShots = [];
    this.coinDrops = [];
    this.pickups = [];
    this.particles = [];
    this.rings = [];
    this.damageTexts = [];
    this.ghosts = [];
    this.bossId = null;
    this.clampCamera();
  }

  startRun() {
    this.audio.unlock();
    this.dom.startScreen.hidden = true;
    this.dom.endScreen.hidden = true;
    this.dom.shopScreen.hidden = true;
    this.dom.pauseScreen.hidden = true;
    this.dom.hud.hidden = false;
    this.dom.bossWrap.hidden = true;
    this.canvas.style.filter = "none";
    this.input.clear();
    this.state = "playing";
    this.coins = 0;
    this.coinsCollected = 0;
    this.kills = 0;
    this.runTime = 0;
    this.waveNumber = 0;
    this.waveKills = 0;
    this.waveTotal = 0;
    this.spawnQueue = [];
    this.wavePhase = "idle";
    this.weaponTier = 0;
    this.upgrades = this.createUpgrades();
    this.enemies = [];
    this.bullets = [];
    this.enemyShots = [];
    this.coinDrops = [];
    this.pickups = [];
    this.particles = [];
    this.rings = [];
    this.damageTexts = [];
    this.ghosts = [];
    this.bossId = null;
    this.player = this.createPlayer(ARENA.w / 2, ARENA.h / 2);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.hudCache = {};
    this.dom.touchHint.classList.remove("hide");
    this.moveHintTimer = 10;
    this.updateHud(true);
    this.beginWave(1);
  }

  beginWave(number) {
    this.waveNumber = number;
    const wave = WAVES[number - 1] || WAVES[WAVES.length - 1];
    this.spawnQueue = this.buildWaveQueue(number);
    this.waveTotal = this.spawnQueue.length;
    this.waveKills = 0;
    this.wavePhase = "intro";
    this.waveTimer = 1.85;
    this.waveSpawnTimer = 0.1;
    this.state = "playing";
    this.dom.hud.hidden = false;
    this.dom.bossWrap.hidden = true;
    this.bossId = null;
    this.updateHud(true);
    this.showAnnounce(wave.boss ? `BOSS WAVE // ${number}` : `WAVE ${number}`, wave.name, wave.sub, Boolean(wave.boss), 2.2);
    this.audio.wave();
  }

  buildWaveQueue(number) {
    const queue = [];
    const bossType = number === 5 ? "gatekeeper" : number === 10 ? "king" : null;
    let walkers = Math.max(5, 5 + number * 2 - (bossType ? 4 : 0));
    let runners = number >= 2 ? Math.floor(number * 0.75) + (number >= 7 ? 2 : 0) : 0;
    let brutes = number >= 4 ? Math.floor((number - 2) / 2) : 0;
    let spitters = number >= 6 ? Math.floor((number - 3) / 3) : 0;
    if (number === 10) {
      walkers = 18;
      runners = 8;
      brutes = 2;
      spitters = 2;
    }
    for (let i = 0; i < walkers; i += 1) queue.push("walker");
    for (let i = 0; i < runners; i += 1) queue.push("runner");
    for (let i = 0; i < brutes; i += 1) queue.push("brute");
    for (let i = 0; i < spitters; i += 1) queue.push("spitter");
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (bossType) queue.unshift(bossType);
    return queue;
  }

  startNextWave() {
    if (this.state !== "shop") return;
    this.audio.click();
    this.dom.shopScreen.hidden = true;
    this.dom.hud.hidden = false;
    this.beginWave(this.waveNumber + 1);
  }

  openShop() {
    if (this.state === "ended") return;
    this.state = "shop";
    this.input.clear();
    this.hideAnnounce();
    this.dom.hud.hidden = true;
    this.dom.shopScreen.hidden = false;
    this.renderShop();
    this.audio.click();
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.clear();
    this.dom.pauseScreen.hidden = false;
    this.dom.touchHint.classList.add("hide");
    this.audio.click();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.dom.pauseScreen.hidden = true;
    this.audio.click();
    this.lastFrame = 0;
  }

  abandonRun() {
    this.dom.pauseScreen.hidden = true;
    this.recordRun();
    this.audio.click();
    this.goToMenu();
  }

  goToMenu() {
    this.state = "menu";
    this.dom.hud.hidden = true;
    this.dom.shopScreen.hidden = true;
    this.dom.pauseScreen.hidden = true;
    this.dom.endScreen.hidden = true;
    this.dom.startScreen.hidden = false;
    this.dom.bossWrap.hidden = true;
    this.dom.announce.classList.remove("show", "boss");
    this.canvas.style.filter = "none";
    this.input.clear();
    this.updateBestUi();
    this.setupMenuScene();
    this.lastFrame = 0;
  }

  showAnnounce(kicker, title, sub, boss = false, duration = 2.2) {
    this.dom.announceKicker.textContent = kicker;
    this.dom.announceTitle.textContent = title;
    this.dom.announceSub.textContent = sub;
    this.dom.announce.classList.toggle("boss", boss);
    this.dom.announce.classList.add("show");
    this.announceTimer = duration;
  }

  hideAnnounce() {
    this.dom.announce.classList.remove("show");
    this.announceTimer = 0;
  }

  showToast(message) {
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add("show");
    this.toastTimer = 2.7;
  }

  updateSoundUi() {
    const on = !this.audio.muted;
    document.body.classList.toggle("muted", !on);
    this.dom.soundToggle.setAttribute("aria-checked", String(on));
    this.dom.soundToggle.classList.toggle("on", on);
  }

  toggleSound() {
    if (this.audio.muted) {
      this.audio.unlock();
      this.audio.setMuted(false);
    } else {
      this.audio.setMuted(true);
    }
    this.updateSoundUi();
    this.audio.click();
  }

  updateTiltUi(enabled) {
    const active = Boolean(enabled || this.input.tiltEnabled);
    this.dom.startTiltState.textContent = active ? "ON" : "OFF";
    this.dom.startTiltBtn.classList.toggle("on", active);
    this.dom.tiltToggle.setAttribute("aria-checked", String(active));
    this.dom.calibrateBtn.hidden = !active;
  }

  async handleTiltToggle() {
    try {
      if (this.input.tiltEnabled) {
        this.input.disableTilt();
        this.updateTiltUi(false);
        this.showToast("Tilt steering off. Drag anywhere to move.");
        this.audio.click();
        return;
      }
      this.audio.unlock();
      await this.input.enableTilt();
      this.updateTiltUi(true);
      this.showToast(this.input.needsMotionPermission()
        ? "Motion access granted. Hold the device naturally to calibrate."
        : "Tilt steering on. Hold naturally to calibrate.");
      setTimeout(() => {
        if (this.input.tiltEnabled && !this.input.tiltDataSeen) {
          this.showToast("No motion data yet. Check motion access or recalibrate in pause.");
        }
      }, 2200);
    } catch (error) {
      this.updateTiltUi(false);
      this.showToast(error.message || "Motion access could not be enabled.");
    }
  }

  updateBestUi() {
    this.best.bestKills = Math.max(this.best.bestKills, this.kills);
    this.best.bestCoins = Math.max(this.best.bestCoins, this.coinsCollected);
    this.dom.bestWave.textContent = this.best.bestWave;
    this.dom.bestKills.textContent = this.best.bestKills;
    this.dom.bestCoins.textContent = this.best.bestCoins;
  }

  recordRun() {
    this.best.bestWave = Math.max(this.best.bestWave, this.waveNumber);
    this.best.bestKills = Math.max(this.best.bestKills, this.kills);
    this.best.bestCoins = Math.max(this.best.bestCoins, this.coinsCollected);
    this.saveBest();
    this.updateBestUi();
  }

  getWeaponStats() {
    const tier = WEAPONS[this.weaponTier];
    const damage = tier.damage * (1 + this.upgrades.damage * 0.2);
    const fireDelay = tier.fireDelay / (1 + this.upgrades.rate * 0.12);
    const pellets = tier.pellets + this.upgrades.split;
    const spread = tier.spread + this.upgrades.split * (this.weaponTier === 2 ? 0.016 : 0.035);
    const pierce = tier.pierce + this.upgrades.pierce;
    return {
      ...tier,
      damage,
      fireDelay,
      pellets,
      spread,
      pierce,
      dps: (damage * pellets) / fireDelay,
      magnet: 92 + this.upgrades.magnet * 50,
    };
  }

  tryDash() {
    if (this.state !== "playing" || this.player.dead) return;
    if (this.player.dashCooldown > 0 || this.player.dashTime > 0) return;
    const move = this.input.getMoveVector();
    let dirX = move.active ? move.x : Math.cos(this.player.aimAngle);
    let dirY = move.active ? move.y : Math.sin(this.player.aimAngle);
    const length = Math.hypot(dirX, dirY) || 1;
    dirX /= length;
    dirY /= length;
    this.player.dashDirX = dirX;
    this.player.dashDirY = dirY;
    this.player.dashTime = 0.17;
    this.player.dashCooldown = this.player.dashMax;
    this.player.invuln = Math.max(this.player.invuln, 0.34);
    this.audio.dash();
    this.spawnRing(this.player.x, this.player.y, "rgba(255, 214, 110, 0.55)", 70, 0.38, 4);
    this.spawnBurst(this.player.x, this.player.y, 9, {
      colors: ["#ffce5c", "#f4ecd2", "#9a7c35"],
      speed: 150,
      size: 2.5,
      life: 0.35,
      drag: 5,
      glow: true,
    });
    if (navigator.vibrate) navigator.vibrate(18);
  }

  renderShop() {
    const stats = this.getWeaponStats();
    const tier = WEAPONS[this.weaponTier];
    const next = WEAPONS[this.weaponTier + 1];
    this.dom.shopKicker.textContent = `WAVE ${this.waveNumber} CLEARED`;
    this.dom.shopCoins.textContent = this.coins;
    this.dom.shopWeapon.textContent = tier.name;
    this.dom.shopWeaponDesc.textContent = tier.desc;
    this.dom.shopDps.textContent = Math.round(stats.dps);
    this.dom.weaponOrb.style.setProperty("--weapon", tier.color);
    this.dom.nextWaveNo.textContent = this.waveNumber + 1;

    let evolutionCard;
    if (next) {
      const affordable = this.coins >= next.cost;
      evolutionCard = `
        <button class="upgrade-card evolution ${affordable ? "affordable" : ""}" type="button" data-upgrade="evolve" ${affordable ? "" : "disabled"} aria-label="Evolve weapon to ${next.name} for ${next.cost} gold">
          <span class="u-icon"><svg class="icon"><use href="#ico-evolve"/></svg></span>
          <span class="u-copy"><b>EVOLVE TO ${next.name}</b><small>${next.desc}</small></span>
          <span class="u-cost"><svg class="icon"><use href="#ico-coin"/></svg>${next.cost}</span>
        </button>`;
    } else {
      evolutionCard = `
        <button class="upgrade-card evolution evolved maxed" type="button" disabled aria-label="Weapon fully evolved">
          <span class="u-icon"><svg class="icon"><use href="#ico-skull"/></svg></span>
          <span class="u-copy"><b>SUNBURST RAIL // MAXED</b><small>The horde should be afraid.</small></span>
          <span class="u-cost">MAX</span>
        </button>`;
    }

    const cards = UPGRADES.map((upgrade) => {
      const level = this.upgrades[upgrade.id];
      const maxed = level >= upgrade.max;
      const cost = upgrade.cost(level);
      const affordable = !maxed && this.coins >= cost;
      const label = maxed ? "MAX" : `<svg class="icon"><use href="#ico-coin"/></svg>${cost}`;
      return `
        <button class="upgrade-card ${affordable ? "affordable" : ""} ${maxed ? "maxed" : ""}" type="button" data-upgrade="${upgrade.id}" ${affordable ? "" : "disabled"} aria-label="${upgrade.name}, ${upgrade.describe()}, ${maxed ? "maxed" : `costs ${cost} gold`}">
          <span class="u-icon"><svg class="icon"><use href="#ico-${upgrade.icon}"/></svg></span>
          <span class="u-copy"><b>${upgrade.name}</b><small><em>LV ${level}</em> &middot; ${upgrade.describe()}</small></span>
          <span class="u-cost">${label}</span>
        </button>`;
    }).join("");

    this.dom.upgradeGrid.innerHTML = evolutionCard + cards;
  }

  buyUpgrade(id) {
    const upgrade = UPGRADES.find((item) => item.id === id);
    if (!upgrade) return;
    const level = this.upgrades[id];
    if (level >= upgrade.max) return;
    const cost = upgrade.cost(level);
    if (this.coins < cost) return;
    this.coins -= cost;
    this.upgrades[id] += 1;
    if (id === "vitality") {
      this.player.maxHp += 25;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
    }
    this.audio.upgrade();
    this.showToast(`${upgrade.name} upgraded to level ${level + 1}.`);
    this.renderShop();
    this.updateHud(true);
  }

  buyEvolution() {
    const next = WEAPONS[this.weaponTier + 1];
    if (!next || this.coins < next.cost) return;
    this.coins -= next.cost;
    this.weaponTier += 1;
    this.audio.evolve();
    this.showToast(`Weapon evolved: ${next.name}.`);
    this.renderShop();
    this.updateHud(true);
  }

  startVictorySequence() {
    if (this.state === "ended" || this.state === "victory") return;
    this.state = "victory";
    this.victoryTimer = 2.4;
    this.input.clear();
    this.dom.bossWrap.hidden = true;
    this.dom.touchHint.classList.add("hide");
    this.wavePhase = "complete";
    this.showAnnounce("CIVILIZATION BROKEN", "THE KING IS DEAD", "The crown is yours. The dead are quiet. For now.", false, 2.4);
    this.audio.victory();
    this.spawnRing(this.player.x, this.player.y, "rgba(255, 206, 92, 0.8)", 420, 1.4, 10);
    this.spawnRing(this.player.x, this.player.y, "rgba(255, 242, 186, 0.5)", 260, 1.1, 5);
    for (let i = 0; i < 6; i += 1) {
      this.spawnBurst(this.player.x + rand(-160, 160), this.player.y + rand(-120, 120), 16, {
        colors: ["#ffce5c", "#fff0b8", "#ffae32"],
        speed: 180,
        size: 3.4,
        life: 1.3,
        drag: 2,
        glow: true,
      });
    }
    this.recordRun();
  }

  showEnd(victory) {
    if (this.state === "ended") return;
    this.state = "ended";
    this.input.clear();
    this.hideAnnounce();
    this.dom.toast.classList.remove("show");
    this.toastTimer = 0;
    this.dom.hud.hidden = true;
    this.dom.bossWrap.hidden = true;
    this.dom.endCard.classList.toggle("victory", Boolean(victory));
    if (victory) {
      this.dom.endKicker.textContent = "CIVILIZATION BROKEN";
      this.dom.endTitle.textContent = "THE KING IS DEAD";
      this.dom.endSub.textContent = "The horde has lost its crown. Humanity gets another sunrise.";
    } else {
      this.dom.endKicker.textContent = "RUN OVER";
      this.dom.endTitle.textContent = "THE HORDE WON";
      this.dom.endSub.textContent = "They keep the gold. This time.";
    }
    this.dom.endWave.textContent = victory ? 10 : this.waveNumber;
    this.dom.endKills.textContent = this.kills;
    this.dom.endCoins.textContent = this.coinsCollected;
    this.dom.endTime.textContent = formatTime(this.runTime);
    this.dom.endScreen.hidden = false;
    this.recordRun();
  }

  updateHud(force = false) {
    const player = this.player;
    if (!player) return;
    const hp = Math.max(0, Math.ceil(player.hp));
    if (force || this.hudCache.hp !== hp) {
      this.hudCache.hp = hp;
      this.dom.hpText.textContent = hp;
      this.dom.hpFill.style.width = `${clamp(player.hp / player.maxHp, 0, 1) * 100}%`;
      this.dom.hpFill.classList.toggle("low", player.hp / player.maxHp <= 0.3);
    }
    if (force || this.hudCache.coins !== this.coins) {
      this.hudCache.coins = this.coins;
      this.dom.coinText.textContent = this.coins;
    }
    const wave = WAVES[Math.max(0, this.waveNumber - 1)];
    const waveName = wave ? wave.name : "THE OUTSKIRTS";
    if (force || this.hudCache.waveName !== waveName) {
      this.hudCache.waveName = waveName;
      this.dom.waveName.textContent = waveName;
    }
    if (force || this.hudCache.waveNumber !== this.waveNumber) {
      this.hudCache.waveNumber = this.waveNumber;
      this.dom.waveNo.textContent = this.waveNumber;
    }
    const ratio = this.wavePhase === "clear" || this.wavePhase === "complete" || this.wavePhase === "victory"
      ? 1
      : this.waveTotal > 0 ? clamp(this.waveKills / this.waveTotal, 0, 1) : 0;
    const ratioText = `${Math.round(ratio * 1000)}`;
    if (force || this.hudCache.waveRatio !== ratioText) {
      this.hudCache.waveRatio = ratioText;
      this.dom.waveFill.style.width = `${ratio * 100}%`;
    }

    const boss = this.enemies.find((enemy) => enemy.boss && !enemy.dead);
    if (boss && this.state !== "menu") {
      this.dom.bossWrap.hidden = false;
      this.dom.bossName.textContent = boss.name;
      this.dom.bossHpText.textContent = `${Math.max(0, Math.ceil(boss.hp))} / ${Math.ceil(boss.maxHp)}`;
      this.dom.bossFill.style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
    } else if (this.dom.bossWrap.hidden === false && !boss) {
      this.dom.bossWrap.hidden = true;
    }
  }

  updateDashUi() {
    if (!this.player) return;
    const ratio = 1 - clamp(this.player.dashCooldown / this.player.dashMax, 0, 1);
    this.dom.dashBtn.style.setProperty("--dash", ratio.toFixed(4));
    this.dom.dashBtn.classList.toggle("cooling", ratio < 1);
  }

  loop(timestamp) {
    if (!this.lastFrame) this.lastFrame = timestamp;
    let dt = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;
    dt = clamp(dt, 0, 0.05);
    this.clock += dt;

    if (this.state === "menu") this.updateMenu(dt);
    else if (this.state === "playing") this.updateGame(dt);
    else if (this.state === "dying") this.updateDying(dt);
    else if (this.state === "victory") this.updateVictory(dt);

    this.renderer.render(this);
    this.updateDashUi();
    requestAnimationFrame(this.loop);
  }
}

Object.assign(Game.prototype, combatMethods, enemyMethods);
