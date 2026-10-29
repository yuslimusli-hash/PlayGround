const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class InputController {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.keys = new Set();
    this.joy = {
      active: false,
      pointerId: null,
      originX: 0,
      originY: 0,
      x: 0,
      y: 0,
      radius: 54,
      visible: false,
    };
    this.tiltEnabled = false;
    this.tiltCalibrated = false;
    this.tiltDataSeen = false;
    this.tiltRaw = { beta: 0, gamma: 0 };
    this.tiltNeutral = { beta: 0, gamma: 0 };
    this.tiltVector = { x: 0, y: 0 };
    this.lastInputWasTilt = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onOrientation = this.onOrientation.bind(this);
    this.clear = this.clear.bind(this);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    this.keys.add(key);
    if (key === " " || key === "shift") this.handlers.onDash?.();
    if (key === "escape" || key === "p") this.handlers.onPause?.();
    if (key === "m") this.handlers.onMute?.();
  }

  onKeyUp(event) {
    this.keys.delete(event.key.toLowerCase());
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (this.joy.active) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    this.joy.active = true;
    this.joy.visible = true;
    this.joy.pointerId = event.pointerId;
    this.joy.originX = event.clientX;
    this.joy.originY = event.clientY;
    this.joy.x = event.clientX;
    this.joy.y = event.clientY;
    this.handlers.onMoveStart?.();
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      void 0;
    }
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.joy.active || event.pointerId !== this.joy.pointerId) return;
    const dx = event.clientX - this.joy.originX;
    const dy = event.clientY - this.joy.originY;
    const distance = Math.hypot(dx, dy);
    if (distance > this.joy.radius) {
      this.joy.x = this.joy.originX + (dx / distance) * this.joy.radius;
      this.joy.y = this.joy.originY + (dy / distance) * this.joy.radius;
    } else {
      this.joy.x = event.clientX;
      this.joy.y = event.clientY;
    }
    event.preventDefault();
  }

  onPointerUp(event) {
    if (!this.joy.active || event.pointerId !== this.joy.pointerId) return;
    this.joy.active = false;
    this.joy.visible = false;
    this.joy.pointerId = null;
    this.joy.x = this.joy.originX;
    this.joy.y = this.joy.originY;
    event.preventDefault();
  }

  clear() {
    this.keys.clear();
    this.joy.active = false;
    this.joy.visible = false;
    this.joy.pointerId = null;
  }

  getJoystickVector() {
    if (!this.joy.active) return { x: 0, y: 0, active: false };
    const dx = this.joy.x - this.joy.originX;
    const dy = this.joy.y - this.joy.originY;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) return { x: 0, y: 0, active: true };
    const strength = clamp(distance / this.joy.radius, 0, 1);
    return { x: (dx / distance) * strength, y: (dy / distance) * strength, active: true };
  }

  getKeyboardVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y, active: x !== 0 || y !== 0 };
  }

  getMoveVector() {
    const joystick = this.getJoystickVector();
    if (joystick.active) {
      this.lastInputWasTilt = false;
      return joystick;
    }
    const tilt = this.getTiltVector();
    if (tilt.active) {
      this.lastInputWasTilt = true;
      return tilt;
    }
    const keyboard = this.getKeyboardVector();
    if (keyboard.active) {
      this.lastInputWasTilt = false;
      return keyboard;
    }
    return { x: 0, y: 0, active: false };
  }

  getOrientationAngle() {
    if (window.screen?.orientation?.angle !== undefined) {
      return window.screen.orientation.angle;
    }
    if (typeof window.orientation === "number") return window.orientation;
    return 0;
  }

  onOrientation(event) {
    if (event.beta === null && event.gamma === null) return;
    this.tiltRaw.beta = event.beta ?? 0;
    this.tiltRaw.gamma = event.gamma ?? 0;
    if (!this.tiltDataSeen) {
      this.tiltDataSeen = true;
      if (!this.tiltCalibrated) this.calibrateTilt();
      this.handlers.onTiltReady?.();
    }
    if (!this.tiltCalibrated) return;

    const angle = this.getOrientationAngle();
    const beta = this.tiltRaw.beta - this.tiltNeutral.beta;
    const gamma = this.tiltRaw.gamma - this.tiltNeutral.gamma;
    let x = gamma;
    let y = beta;
    if (angle === 90) {
      x = beta;
      y = -gamma;
    } else if (angle === -90 || angle === 270) {
      x = -beta;
      y = gamma;
    } else if (angle === 180) {
      x = -gamma;
      y = -beta;
    }

    const magnitude = Math.hypot(x, y);
    const deadzone = 4;
    const maxTilt = 24;
    if (magnitude <= deadzone) {
      this.tiltVector.x = 0;
      this.tiltVector.y = 0;
      return;
    }
    const strength = clamp((magnitude - deadzone) / (maxTilt - deadzone), 0, 1);
    this.tiltVector.x = (x / magnitude) * strength;
    this.tiltVector.y = (y / magnitude) * strength;
  }

  getTiltVector() {
    if (!this.tiltEnabled || !this.tiltCalibrated) return { x: 0, y: 0, active: false };
    const x = this.tiltVector.x;
    const y = this.tiltVector.y;
    const magnitude = Math.hypot(x, y);
    if (magnitude < 0.06) return { x: 0, y: 0, active: false };
    return { x, y, active: true };
  }

  calibrateTilt() {
    if (!this.tiltDataSeen) return false;
    this.tiltNeutral.beta = this.tiltRaw.beta;
    this.tiltNeutral.gamma = this.tiltRaw.gamma;
    this.tiltCalibrated = true;
    this.tiltVector.x = 0;
    this.tiltVector.y = 0;
    return true;
  }

  async enableTilt() {
    if (this.tiltEnabled) return true;
    if (!("DeviceOrientationEvent" in window)) {
      throw new Error("Tilt is not supported on this device.");
    }
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        throw new Error("Motion access was denied. Allow motion in browser settings.");
      }
    }
    this.tiltEnabled = true;
    this.tiltDataSeen = false;
    this.tiltCalibrated = false;
    this.tiltVector.x = 0;
    this.tiltVector.y = 0;
    window.addEventListener("deviceorientation", this.onOrientation, true);
    this.handlers.onTiltChange?.(true);
    return true;
  }

  disableTilt() {
    if (!this.tiltEnabled) return;
    this.tiltEnabled = false;
    window.removeEventListener("deviceorientation", this.onOrientation, true);
    this.tiltCalibrated = false;
    this.tiltVector.x = 0;
    this.tiltVector.y = 0;
    this.handlers.onTiltChange?.(false);
  }

  async toggleTilt() {
    if (this.tiltEnabled) {
      this.disableTilt();
      return false;
    }
    await this.enableTilt();
    return true;
  }

  needsMotionPermission() {
    return typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function";
  }
}
