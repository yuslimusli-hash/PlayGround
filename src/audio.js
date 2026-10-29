const STORAGE_KEY = "rotgold.muted";

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = localStorage.getItem(STORAGE_KEY) === "1";
    this.startedMusic = false;
    this.lastShot = 0;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.34;
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.musicBus.connect(compressor);
    this.sfxBus.connect(compressor);
    compressor.connect(this.master);
    this.master.connect(this.ctx.destination);
  }

  async unlock() {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state !== "running") {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    this.startAtmosphere();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime + 0.08);
    }
    document.body.classList.toggle("muted", muted);
    return muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running";
  }

  startAtmosphere() {
    if (!this.ready || this.startedMusic) return;
    this.startedMusic = true;

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.018;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 210;
    filter.Q.value = 2.2;
    droneGain.connect(filter);
    filter.connect(this.musicBus);

    [55, 82.5, 110.4].forEach((frequency, index) => {
      const oscillator = this.ctx.createOscillator();
      oscillator.type = index === 0 ? "triangle" : "sawtooth";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 1 ? 7 : index === 2 ? -9 : 0;
      const gain = this.ctx.createGain();
      gain.gain.value = index === 0 ? 1 : 0.24;
      oscillator.connect(gain);
      gain.connect(droneGain);
      oscillator.start();
    });

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.055;
    lfoGain.gain.value = 75;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const pulse = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [110, 130.81, 98, 146.83];
      const note = notes[Math.floor(now / 3.2) % notes.length];
      this.pad(note, now, 3.4, 0.012);
      if (Math.random() > 0.56) this.pad(note * 1.5, now + 1.55, 2.1, 0.007);
    };
    pulse();
    setInterval(pulse, 3200);
  }

  pad(frequency, when, duration, volume) {
    if (!this.ctx) return;
    const oscillator = this.ctx.createOscillator();
    const oscillatorTwo = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    oscillator.type = "triangle";
    oscillatorTwo.type = "sine";
    oscillator.frequency.value = frequency;
    oscillatorTwo.frequency.value = frequency * 2.005;
    filter.type = "lowpass";
    filter.frequency.value = 680;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    oscillatorTwo.connect(gain);
    gain.connect(filter);
    filter.connect(this.musicBus);
    oscillator.start(when);
    oscillatorTwo.start(when);
    oscillator.stop(when + duration + 0.05);
    oscillatorTwo.stop(when + duration + 0.05);
  }

  tone(frequency, duration, options = {}) {
    if (!this.ready) return;
    const {
      type = "sine",
      volume = 0.05,
      slide = 0,
      delay = 0,
      bus = this.sfxBus,
      attack = 0.004,
    } = options;
    const now = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
    if (slide) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  noise(duration, options = {}) {
    if (!this.ready) return;
    const {
      volume = 0.05,
      delay = 0,
      filter = 1200,
      filterEnd = filter,
      type = "lowpass",
      bus = this.sfxBus,
    } = options;
    const now = this.ctx.currentTime + delay;
    const length = Math.max(0.02, duration);
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * length), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const biquad = this.ctx.createBiquadFilter();
    biquad.type = type;
    biquad.frequency.setValueAtTime(filter, now);
    biquad.frequency.exponentialRampToValueAtTime(Math.max(60, filterEnd), now + length);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(bus);
    source.start(now);
  }

  shot(tier = 0) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShot < 0.035) return;
    this.lastShot = now;
    if (tier >= 3) {
      this.tone(740, 0.14, { type: "sawtooth", volume: 0.035, slide: -520 });
      this.noise(0.08, { volume: 0.035, filter: 3200, filterEnd: 500 });
      return;
    }
    if (tier === 2) {
      this.tone(130, 0.11, { type: "square", volume: 0.055, slide: -80 });
      this.noise(0.13, { volume: 0.06, filter: 1900, filterEnd: 260 });
      return;
    }
    this.tone(tier === 1 ? 390 : 310, 0.075, { type: "square", volume: 0.038, slide: -210 });
    this.noise(0.055, { volume: 0.025, filter: 2400, filterEnd: 500 });
  }

  hit(boss = false) {
    this.noise(boss ? 0.13 : 0.055, { volume: boss ? 0.045 : 0.022, filter: boss ? 500 : 900, filterEnd: 120 });
  }

  coin() {
    const base = 820 + Math.random() * 140;
    this.tone(base, 0.055, { type: "triangle", volume: 0.026 });
    this.tone(base * 1.5, 0.09, { type: "sine", volume: 0.022, delay: 0.035 });
  }

  health() {
    this.tone(420, 0.12, { type: "sine", volume: 0.04, slide: 240 });
    this.tone(640, 0.16, { type: "triangle", volume: 0.025, delay: 0.08, slide: 120 });
  }

  hurt() {
    this.tone(120, 0.22, { type: "sawtooth", volume: 0.06, slide: -65 });
    this.noise(0.16, { volume: 0.05, filter: 820, filterEnd: 90 });
  }

  dash() {
    this.noise(0.18, { volume: 0.045, filter: 500, filterEnd: 2800, type: "bandpass" });
    this.tone(190, 0.16, { type: "sine", volume: 0.035, slide: 380 });
  }

  upgrade() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone(frequency, 0.2, { type: "triangle", volume: 0.04, delay: index * 0.065 });
    });
  }

  evolve() {
    [110, 164.81, 220, 329.63, 440].forEach((frequency, index) => {
      this.tone(frequency, 0.32, { type: "sawtooth", volume: 0.028, delay: index * 0.07 });
    });
    this.noise(0.4, { volume: 0.028, filter: 300, filterEnd: 3400, type: "bandpass", delay: 0.12 });
  }

  wave() {
    this.tone(73.42, 0.55, { type: "triangle", volume: 0.07, slide: -18 });
    this.tone(146.83, 0.4, { type: "sine", volume: 0.035, delay: 0.1 });
    this.noise(0.3, { volume: 0.028, filter: 420, filterEnd: 110 });
  }

  boss() {
    this.tone(55, 0.85, { type: "sawtooth", volume: 0.07, slide: -16 });
    this.tone(58.27, 0.95, { type: "square", volume: 0.026, slide: -20 });
    this.noise(0.6, { volume: 0.045, filter: 280, filterEnd: 70 });
  }

  acid() {
    this.noise(0.16, { volume: 0.028, filter: 1200, filterEnd: 300, type: "bandpass" });
  }

  explode(big = false) {
    this.noise(big ? 0.7 : 0.25, { volume: big ? 0.1 : 0.055, filter: big ? 900 : 1400, filterEnd: 60 });
    this.tone(big ? 52 : 90, big ? 0.6 : 0.22, { type: "sine", volume: big ? 0.08 : 0.045, slide: -30 });
  }

  gameOver() {
    [329.63, 261.63, 196, 146.83].forEach((frequency, index) => {
      this.tone(frequency, 0.55, { type: "sawtooth", volume: 0.032, delay: index * 0.3, slide: -12 });
    });
  }

  victory() {
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.tone(frequency, 0.75, { type: "triangle", volume: 0.034, delay: index * 0.14 });
    });
    this.tone(130.81, 2.4, { type: "sine", volume: 0.04, delay: 0.2 });
  }

  click() {
    this.tone(430, 0.04, { type: "square", volume: 0.018 });
  }
}
