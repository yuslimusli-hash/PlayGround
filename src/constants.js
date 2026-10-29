export const TAU = Math.PI * 2;
export const ARENA = { w: 2600, h: 2600 };
export const SAVE_KEY = "rotgold.save.v2";
export const MAX_PARTICLES = 650;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (from, to, amount) => from + (to - from) * amount;
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const distance = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
export const lerpAngle = (from, to, amount) => {
  let delta = (to - from + Math.PI) % TAU - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return from + delta * amount;
};

export function mulberry32(seed) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export const WEAPONS = [
  {
    id: "pistol",
    name: "RUST PISTOL",
    desc: "Reliable. Ugly. Yours.",
    cost: 0,
    damage: 14,
    fireDelay: 0.38,
    pellets: 1,
    spread: 0.02,
    speed: 820,
    pierce: 0,
    bulletRadius: 4,
    color: "#ffce5c",
    barrel: 22,
  },
  {
    id: "smg",
    name: "SCRAP SMG",
    desc: "Spray the rot away.",
    cost: 55,
    damage: 9,
    fireDelay: 0.13,
    pellets: 1,
    spread: 0.055,
    speed: 900,
    pierce: 0,
    bulletRadius: 3.2,
    color: "#ffe99b",
    barrel: 20,
  },
  {
    id: "shotgun",
    name: "BONE SHOTGUN",
    desc: "A wall of lead for a wall of dead.",
    cost: 145,
    damage: 10,
    fireDelay: 0.5,
    pellets: 7,
    spread: 0.34,
    speed: 780,
    pierce: 0,
    bulletRadius: 3.6,
    color: "#ffb45e",
    barrel: 25,
  },
  {
    id: "rail",
    name: "SUNBURST RAIL",
    desc: "Daylight, delivered at speed.",
    cost: 340,
    damage: 31,
    fireDelay: 0.19,
    pellets: 2,
    spread: 0.055,
    speed: 1220,
    pierce: 3,
    bulletRadius: 5.2,
    color: "#79f5ff",
    barrel: 29,
  },
];

export const UPGRADES = [
  {
    id: "damage",
    name: "CALIBER",
    icon: "caliber",
    max: 12,
    describe: () => "+20% damage",
    cost: (level) => Math.round(16 * Math.pow(1.55, level)),
  },
  {
    id: "rate",
    name: "TRIGGER",
    icon: "bolt",
    max: 10,
    describe: () => "+12% fire rate",
    cost: (level) => Math.round(17 * Math.pow(1.6, level)),
  },
  {
    id: "split",
    name: "SPLIT",
    icon: "split",
    max: 4,
    describe: () => "+1 projectile",
    cost: (level) => Math.round(46 * Math.pow(1.9, level)),
  },
  {
    id: "pierce",
    name: "PIERCE",
    icon: "pierce",
    max: 3,
    describe: () => "+1 penetration",
    cost: (level) => Math.round(34 * Math.pow(1.7, level)),
  },
  {
    id: "magnet",
    name: "MAGNET",
    icon: "magnet",
    max: 5,
    describe: () => "+50 pickup range",
    cost: (level) => Math.round(12 * Math.pow(1.5, level)),
  },
  {
    id: "vitality",
    name: "VITALITY",
    icon: "vitality",
    max: 6,
    describe: () => "+25 max HP & heal",
    cost: (level) => Math.round(18 * Math.pow(1.55, level)),
  },
];

export const ENEMY_TYPES = {
  walker: {
    name: "WALKER",
    radius: 16,
    hp: 28,
    speed: 47,
    damage: 9,
    coins: 1.6,
    color: "#6f8e49",
    dark: "#344622",
    eye: "#d9ff79",
    height: 1,
  },
  runner: {
    name: "RUNNER",
    radius: 13,
    hp: 20,
    speed: 96,
    damage: 7,
    coins: 1.4,
    color: "#a9bb7d",
    dark: "#4b5e33",
    eye: "#ff7458",
    height: 0.92,
  },
  brute: {
    name: "BRUTE",
    radius: 27,
    hp: 155,
    speed: 38,
    damage: 18,
    coins: 4.5,
    color: "#577443",
    dark: "#28371f",
    eye: "#ffb257",
    height: 1.28,
  },
  spitter: {
    name: "SPITTER",
    radius: 18,
    hp: 62,
    speed: 42,
    damage: 5,
    coins: 2.7,
    color: "#82a94f",
    dark: "#3b5128",
    eye: "#b7ff5b",
    height: 1.06,
  },
  gatekeeper: {
    name: "THE GATEKEEPER",
    radius: 39,
    hp: 1000,
    speed: 48,
    damage: 23,
    coins: 55,
    color: "#78964c",
    dark: "#2e3d22",
    eye: "#ffb23e",
    height: 1.65,
    boss: true,
  },
  king: {
    name: "THE ZOMBIE KING",
    radius: 51,
    hp: 4400,
    speed: 44,
    damage: 30,
    coins: 180,
    color: "#88a14d",
    dark: "#3b3a1e",
    eye: "#ff5c45",
    height: 2.05,
    boss: true,
  },
};

export const WAVES = [
  { name: "THE OUTSKIRTS", sub: "The dead are already awake." },
  { name: "BONEYARD", sub: "Nothing here stays buried." },
  { name: "NEON MALL", sub: "The lights still flicker. So do they." },
  { name: "THE FLOODED MILE", sub: "Keep moving. The water is moving too." },
  { name: "THE GATEKEEPER", sub: "Something enormous guards the road.", boss: true },
  { name: "ROTTING HEIGHTS", sub: "They built a city out of the fallen." },
  { name: "THE PROCESSING PLANT", sub: "The machines are dead. The workers are not." },
  { name: "LAST BROADCAST", sub: "A signal, a sermon, and a swarm." },
  { name: "CROWN DISTRICT", sub: "The throne is close. So is the horde." },
  { name: "THE ZOMBIE KING", sub: "End the civilization. Take its crown.", boss: true, final: true },
];
