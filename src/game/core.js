/**
 * ============================================================================
 *  CORE — tuning, physics, input, sound, effects and the save file.
 *  (These were six separate files; they are kept in one place because they are
 *  all "support" code — nothing here draws a frame.)
 * ============================================================================
 *  SECTIONS, in order:
 *    1. TUNING        every gameplay number (start here to change the feel)
 *    2. PHYSICS       tile + moving-platform collision
 *    3. INPUT         keyboard bindings
 *    4. AUDIO         synthesised sound effects
 *    5. EFFECTS       particles, sparks, screen shake
 *    6. SAVE          progress stored in localStorage
 *
 *  Positions/speeds are PIXELS (one stage tile = 16px), times are SECONDS.
 *  SAFE TO CHANGE: every number in section 1.
 *  NOT SAFE: the export names — other files import them by name.
 * ============================================================================
 */
import { CHALLENGE_WEAPONS, WEAPONS } from "./weapons";
import { LOCKED_CHARACTERS, LOCKED_PALETTES } from "./palettes";

// ---------------------------------------------------------------------------
//  1. TUNING
// ---------------------------------------------------------------------------

/** Width of the game image in pixels (canvas resolution, not the window).
 *  Keep it a multiple of TILE (16) or the stage grid will not line up. */
export const VIEW_W = 480;

/** Height of the game image in pixels. 272 = 17 rows of 16px tiles. */
export const VIEW_H = 272;

/** Size of one stage tile in pixels. The level maps are written in tiles. */
export const TILE = 16;

/** How many tile rows tall the level grid is. Must match VIEW_H / TILE. */
export const ROWS = 17;

/** Physics tick length. 1/120 = simulate 120 times per second. Keep it fixed. */
export const STEP = 1 / 120;

/** Gravity while RISING: the jump arc stays readable and controllable. */
export const GRAVITY_RISE = 2300;

/** Gravity while FALLING: heavier, so landings feel weighty instead of floaty. */
export const GRAVITY_FALL = 2900;

/** Base gravity, used by enemies, the boss and loose objects. */
export const GRAVITY = GRAVITY_RISE;

/** Maximum falling speed (caps how fast you can drop). */
export const MAX_FALL = 740;

/** Top running speed. 200 ≈ 4.1 tiles per second. */
export const RUN_SPEED = 200;

/** How quickly you reach top speed on the ground. Higher = less slippery. */
export const ACCEL = 3600;

/** Same as ACCEL but while airborne. */
export const AIR_ACCEL = 2300;

/** Used when you press the opposite direction (turning around). */
export const TURN_ACCEL = 4600;

/** How fast you slow to a stop with no input on the ground. */
export const FRICTION = 3800;

/** Speeds below this snap to zero, so the character does not creep. */
export const STOP_SPEED = 6;

/** Upward launch speed of a jump (negative = up). Climbs ~4 tiles. */
export const JUMP_V = -575;

/** Releasing the jump button early multiplies upward speed by 1/this. */
export const JUMP_CUT = 1.9;

/** "Coyote time": how long after walking off a ledge you can still jump. */
export const COYOTE = 0.1;

/** "Jump buffer": pressing jump slightly BEFORE landing still jumps. */
export const JUMP_BUFFER = 0.16;

/** Burst speed during a dash. Higher = longer dash distance. */
export const DASH_SPEED = 430;

/** How long the dash lasts in seconds. */
export const DASH_TIME = 0.16;

/** Wait time after a dash on the ground before you can dash again. */
export const DASH_COOLDOWN = 0.34;

/** Wait time after an air dash. */
export const AIR_DASH_COOLDOWN = 0.5;

/** Downward speed while sliding on a wall. */
export const WALL_SLIDE_SPEED = 62;

/** Horizontal push away from the wall when you wall-jump. */
export const WALL_JUMP_VX = 300;

/** Vertical launch of a wall-jump (negative = up). */
export const WALL_JUMP_VY = -510;

/** Fall speed while gliding (unlocked as a secret-stage ability). */
export const GLIDE_SPEED = 54;

/** Collision box width. Keep it a little under TILE (16). */
export const PLAYER_W = 14;

/** Collision box height. 26 fits through 2-tile-high (32px) gaps. */
export const PLAYER_H = 26;

/** Total HP. 1000 gives long, readable fights against big enemy health. */
export const MAX_HEALTH = 1000;

/** Lives per stage — RESETS every time a stage starts. */
export const START_LIVES = 3;

/** How many stars are physically placed in each stage (1..5). */
export const STARS_COLLECTIBLE = 5;

/** 5 placed stars + 1 hidden "no-death" star = 6 per stage. */
export const STARS_TOTAL = 6;

/** Damage a normal enemy contact deals. */
export const ENEMY_DAMAGE = 120;

/** Damage the boss body deals. */
export const BOSS_DAMAGE = 160;

/** Damage from spikes, saws, traps, lava and pits. */
export const SPIKE_DAMAGE = 110;

// ---------------------------------------------------------------------------
//  2. PHYSICS — tile collision + platform (mover) collision.
//  createWorld() turns a level into a fast lookup grid; moveActorX/Y sweep the
//  actor in small steps so it can never tunnel through a wall at high speed.
// ---------------------------------------------------------------------------

export function createWorld(level) {
  const solids = new Set();
  const addRect = (x, y, w, h) => {
    for (let ty = y; ty < y + h; ty += 1) {
      for (let tx = x; tx < x + w; tx += 1) solids.add(`${tx},${ty}`);
    }
  };
  (level.platforms || []).forEach(([x, y, w, h = 1]) => addRect(x, y, w, h));

  const door = level.door ? { x: level.door.x, y: level.door.y, h: level.door.h, closed: false } : null;
  const dynamics = [];

  const world = {
    width: level.width,
    rows: ROWS,
    solids,
    door,
    dynamics,
    clearDynamics() {
      dynamics.length = 0;
    },
    addDynamic(rect) {
      dynamics.push(rect);
      return rect;
    },
    dynamicAt(px, py) {
      for (let i = 0; i < dynamics.length; i += 1) {
        const d = dynamics[i];
        if (px >= d.x && px < d.x + d.w && py >= d.y && py < d.y + d.h) return d;
      }
      return null;
    },
    solid(tx, ty) {
      if (ty < 0 || ty >= ROWS || tx < 0 || tx >= level.width) return false;
      if (solids.has(`${tx},${ty}`)) return true;
      if (door && door.closed && tx === door.x && ty >= door.y && ty < door.y + door.h) return true;
      return false;
    },
    solidPx(px, py) {
      if (this.dynamicAt(px, py)) return true;
      return this.solid(Math.floor(px / TILE), Math.floor(py / TILE));
    },
    closeDoor() {
      if (door) door.closed = true;
    },
    openDoor() {
      if (door) door.closed = false;
    },
  };
  return world;
}

function resolveDynamicsX(actor, world, dir) {
  for (let i = 0; i < world.dynamics.length; i += 1) {
    const d = world.dynamics[i];
    if (actor.x < d.x + d.w && actor.x + actor.w > d.x && actor.y < d.y + d.h && actor.y + actor.h > d.y) {
      if (dir > 0) actor.x = d.x - actor.w;
      else actor.x = d.x + d.w;
      return true;
    }
  }
  return false;
}

function resolveDynamicsY(actor, world, dir) {
  for (let i = 0; i < world.dynamics.length; i += 1) {
    const d = world.dynamics[i];
    if (actor.x < d.x + d.w && actor.x + actor.w > d.x && actor.y < d.y + d.h && actor.y + actor.h > d.y) {
      if (dir > 0) {
        actor.y = d.y - actor.h;
        return "ground";
      }
      actor.y = d.y + d.h;
      return "ceiling";
    }
  }
  return null;
}

export function moveActorX(actor, dx, world) {
  if (!dx) return false;
  let remaining = dx;
  const dir = Math.sign(dx);
  const stepSize = 7;
  let hit = false;
  while (Math.abs(remaining) > 0.0001 && !hit) {
    const amount = Math.abs(remaining) > stepSize ? stepSize * dir : remaining;
    actor.x += amount;
    remaining -= amount;
    if (amount > 0) {
      const tx = Math.floor((actor.x + actor.w - 1) / TILE);
      const y0 = Math.floor(actor.y / TILE);
      const y1 = Math.floor((actor.y + actor.h - 1) / TILE);
      for (let ty = y0; ty <= y1; ty += 1) {
        if (world.solid(tx, ty)) {
          actor.x = tx * TILE - actor.w;
          hit = true;
          break;
        }
      }
    } else if (amount < 0) {
      const tx = Math.floor(actor.x / TILE);
      const y0 = Math.floor(actor.y / TILE);
      const y1 = Math.floor((actor.y + actor.h - 1) / TILE);
      for (let ty = y0; ty <= y1; ty += 1) {
        if (world.solid(tx, ty)) {
          actor.x = (tx + 1) * TILE;
          hit = true;
          break;
        }
      }
    }
  }
  if (resolveDynamicsX(actor, world, dir)) hit = true;
  return hit;
}

export function moveActorY(actor, dy, world) {
  if (!dy) return null;
  let remaining = dy;
  const dir = Math.sign(dy);
  const stepSize = 7;
  let hit = null;
  while (Math.abs(remaining) > 0.0001 && !hit) {
    const amount = Math.abs(remaining) > stepSize ? stepSize * dir : remaining;
    actor.y += amount;
    remaining -= amount;
    if (amount > 0) {
      const ty = Math.floor((actor.y + actor.h - 1) / TILE);
      const x0 = Math.floor(actor.x / TILE);
      const x1 = Math.floor((actor.x + actor.w - 1) / TILE);
      for (let tx = x0; tx <= x1; tx += 1) {
        if (world.solid(tx, ty)) {
          actor.y = ty * TILE - actor.h;
          hit = "ground";
          break;
        }
      }
    } else if (amount < 0) {
      const ty = Math.floor(actor.y / TILE);
      const x0 = Math.floor(actor.x / TILE);
      const x1 = Math.floor((actor.x + actor.w - 1) / TILE);
      for (let tx = x0; tx <= x1; tx += 1) {
        if (world.solid(tx, ty)) {
          actor.y = (ty + 1) * TILE;
          hit = "ceiling";
          break;
        }
      }
    }
  }
  if (!hit) hit = resolveDynamicsY(actor, world, dir);
  return hit;
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function approach(value, target, delta) {
  if (value < target) return Math.min(value + delta, target);
  return Math.max(value - delta, target);
}

// ---------------------------------------------------------------------------
//  3. INPUT — physical key codes (works on any keyboard layout).
//  DEFAULT_CONTROLS is only the STARTING layout: every action can be rebound
//  in Settings, and the player's choices are saved.
// ---------------------------------------------------------------------------

export const DEFAULT_CONTROLS = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  jump: "Space",
  fire: "KeyZ",
  dash: "KeyX",
  swap: "KeyC",
  reload: "KeyR",
};

export const CONTROL_ROWS = [
  { key: "left", label: "MOVE LEFT" },
  { key: "right", label: "MOVE RIGHT" },
  { key: "up", label: "MOVE UP" },
  { key: "down", label: "MOVE DOWN" },
  { key: "jump", label: "JUMP" },
  { key: "fire", label: "FIRE" },
  { key: "dash", label: "DASH" },
  { key: "swap", label: "SWAP WEAPON" },
  { key: "reload", label: "RELOAD / HEAL" },
];

const FIXED = {
  Escape: "pause",
  KeyP: "pause",
  Enter: "enter",
};

const LABELS = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "SPACE",
  ShiftLeft: "L-SHIFT",
  ShiftRight: "R-SHIFT",
  ControlLeft: "L-CTRL",
  ControlRight: "R-CTRL",
  AltLeft: "L-ALT",
  AltRight: "R-ALT",
  Tab: "TAB",
  Backspace: "BKSP",
  CapsLock: "CAPS",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
};

export function keyLabel(code) {
  if (!code) return "—";
  if (LABELS[code]) return LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `NUM${code.slice(6)}`;
  if (code.startsWith("Arrow")) return code.slice(5).toUpperCase();
  return code.toUpperCase();
}

function buildMap(controls) {
  const map = { ...FIXED };
  const source = { ...DEFAULT_CONTROLS, ...(controls || {}) };
  Object.entries(source).forEach(([action, code]) => {
    if (code) map[code] = action;
  });
  return map;
}

export class Input {
  constructor(controls) {
    this.map = buildMap(controls);
    this.down = new Set();
    this.just = new Set();
    this.onKeyDown = (event) => {
      const action = this.map[event.code];
      if (!action || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      event.preventDefault();
      if (!this.down.has(action)) this.just.add(action);
      this.down.add(action);
    };
    this.onKeyUp = (event) => {
      const action = this.map[event.code];
      if (!action) return;
      this.down.delete(action);
    };
    this.onBlur = () => this.down.clear();
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  /** Touch controls use this instead of real key events. */
  setVirtual(action, down) {
    if (down) {
      if (!this.down.has(action)) this.just.add(action);
      this.down.add(action);
    } else {
      this.down.delete(action);
    }
  }

  isDown(action) {
    return this.down.has(action);
  }

  wasPressed(action) {
    return this.just.has(action);
  }

  endFrame() {
    this.just.clear();
  }
}

// ---------------------------------------------------------------------------
//  4. AUDIO — synthesised in the browser, so there are no audio files to ship.
//  TUNE: each sound is a tone/noise in sfx(); change frequency and duration.
// ---------------------------------------------------------------------------

let ctx = null;
let volume = 0.7;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSfxVolume(value) {
  volume = Math.max(0, Math.min(1, value));
}

export function sfx(name) {
  const audio = context();
  if (!audio || volume <= 0) return;
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = volume * 0.35;
  master.connect(audio.destination);

  const tone = (freq, start, duration, type = "square", gain = 0.5, slideTo = null) => {
    const osc = audio.createOscillator();
    const env = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + start + duration);
    env.gain.setValueAtTime(0.0001, now + start);
    env.gain.exponentialRampToValueAtTime(gain, now + start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.02);
  };

  switch (name) {
    case "move":
      tone(520, 0, 0.05, "square", 0.18);
      break;
    case "select":
      tone(660, 0, 0.07, "square", 0.28, 990);
      tone(1320, 0.05, 0.09, "triangle", 0.16);
      break;
    case "back":
      tone(440, 0, 0.08, "square", 0.22, 220);
      break;
    case "jump":
      tone(330, 0, 0.1, "square", 0.22, 660);
      break;
    case "dash":
      tone(880, 0, 0.12, "sawtooth", 0.18, 180);
      break;
    case "walljump":
      tone(520, 0, 0.09, "square", 0.2, 900);
      break;
    case "blade":
      tone(1200, 0, 0.08, "sawtooth", 0.22, 300);
      break;
    case "plasma":
      tone(280, 0, 0.16, "triangle", 0.26, 760);
      break;
    case "buster":
      tone(1500, 0, 0.06, "square", 0.2, 700);
      break;
    case "explode":
      tone(140, 0, 0.24, "sawtooth", 0.3, 40);
      break;
    case "hit":
      tone(180, 0, 0.12, "square", 0.3, 90);
      break;
    case "hurt":
      tone(320, 0, 0.2, "square", 0.28, 80);
      break;
    case "star":
      tone(880, 0, 0.09, "triangle", 0.3);
      tone(1320, 0.07, 0.1, "triangle", 0.26);
      tone(1760, 0.14, 0.16, "triangle", 0.22);
      break;
    case "checkpoint":
      tone(523, 0, 0.12, "square", 0.26);
      tone(784, 0.1, 0.18, "square", 0.22);
      break;
    case "door":
      tone(90, 0, 0.5, "sawtooth", 0.22, 40);
      break;
    case "clear":
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, i * 0.12, 0.2, "square", 0.24));
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
//  5. EFFECTS — particles, sparks, rings and screen shake. Cosmetic only.
//  TUNE: particle counts/lifetimes below; shake strength is the amount passed
//  to shake() (smaller is gentler). Players can turn shake off in Settings.
// ---------------------------------------------------------------------------

export function createEffects() {
  return {
    particles: [],
    sparks: [],
    rings: [],
    shake: 0,
    flashes: [],
  };
}

export function burst(effects, x, y, options = {}) {
  const {
    count = 8,
    color = "#ffd166",
    speed = 90,
    gravity = 260,
    life = 0.5,
    size = 2,
    spread = Math.PI * 2,
    angle = 0,
  } = options;
  for (let i = 0; i < count; i += 1) {
    const a = angle + (Math.random() - 0.5) * spread;
    const mag = speed * (0.35 + Math.random() * 0.85);
    effects.particles.push({
      x,
      y,
      vx: Math.cos(a) * mag,
      vy: Math.sin(a) * mag - speed * 0.2,
      gravity,
      life: life * (0.6 + Math.random() * 0.7),
      max: life,
      color,
      size: size + Math.random() * size,
    });
  }
}

export function spark(effects, x, y, dir, options = {}) {
  const { color = "#ffffff", count = 7, speed = 240, life = 0.28 } = options;
  for (let i = 0; i < count; i += 1) {
    const a = (dir >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.5;
    const mag = speed * (0.4 + Math.random() * 0.9);
    effects.sparks.push({
      x,
      y,
      vx: Math.cos(a) * mag,
      vy: Math.sin(a) * mag,
      life: life * (0.5 + Math.random() * 0.8),
      max: life,
      color,
      len: 2 + Math.random() * 5,
    });
  }
}

export function ring(effects, x, y, radius, color = "#ffffff", life = 0.3) {
  effects.rings.push({ x, y, radius, color, life, max: life });
}

export function dust(effects, x, y, dir = 0) {
  for (let i = 0; i < 3; i += 1) {
    effects.particles.push({
      x: x - dir * 4,
      y: y - Math.random() * 6,
      vx: -dir * (30 + Math.random() * 50),
      vy: -Math.random() * 40,
      gravity: 120,
      life: 0.3 + Math.random() * 0.2,
      max: 0.45,
      color: "#c9d4f5",
      size: 1.5 + Math.random(),
    });
  }
}

export function shake(effects, amount) {
  effects.shake = Math.min(14, effects.shake + amount);
}

export function addFlash(effects, x, y, radius, color = "#ffe066") {
  effects.flashes.push({ x, y, radius, color, life: 0.28, max: 0.28 });
}

export function updateEffects(effects, dt) {
  effects.shake = Math.max(0, effects.shake - dt * 30);
  effects.particles = effects.particles.filter((p) => {
    p.life -= dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    return p.life > 0;
  });
  effects.sparks = effects.sparks.filter((s) => {
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.9;
    s.vy *= 0.9;
    return s.life > 0;
  });
  effects.rings = effects.rings.filter((r) => {
    r.life -= dt;
    return r.life > 0;
  });
  effects.flashes = effects.flashes.filter((f) => {
    f.life -= dt;
    return f.life > 0;
  });
}

export function drawEffects(ctx, effects, camX, camY = 0) {
  effects.flashes.forEach((flash) => {
    const t = flash.life / flash.max;
    ctx.save();
    ctx.globalAlpha = t * 0.75;
    const gradient = ctx.createRadialGradient(flash.x - camX, flash.y - camY, 0, flash.x - camX, flash.y - camY, flash.radius * (1.6 - t * 0.6));
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.4, flash.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flash.x - camX, flash.y - camY, flash.radius * (1.6 - t * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  effects.rings.forEach((r) => {
    const t = r.life / r.max;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x - camX, r.y - camY, r.radius * (1.25 - t * 0.7), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  effects.sparks.forEach((s) => {
    const alpha = Math.max(0, Math.min(1, s.life / s.max));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(s.x - camX), Math.round(s.y - camY));
    ctx.lineTo(Math.round(s.x - s.vx * 0.03 - camX), Math.round(s.y - s.vy * 0.03 - camY));
    ctx.stroke();
  });

  effects.particles.forEach((p) => {
    const alpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

export function shakeOffset(effects) {
  if (effects.shake <= 0) return { x: 0, y: 0 };
  const amount = effects.shake;
  return {
    x: (Math.random() - 0.5) * amount,
    y: (Math.random() - 0.5) * amount,
  };
}

// ---------------------------------------------------------------------------
//  6. SAVE — progress in localStorage: character, armour, weapons, stars,
//  unlocked rifts, abilities, checkpoint and settings (volumes, keys).
//  CAREFUL: SAVE_KEY is the storage name. Renaming it orphans every existing
//  save (players would appear to lose progress).
// ---------------------------------------------------------------------------

export const SAVE_KEY = "pixel-adventure-save-v2";
export const SAVE_SLOT_COUNT = 5;
export const ACTIVE_SAVE_SLOT_KEY = "pixel-adventure-active-save-slot-v1";
export const MAIN_STAGES = 10;
export const SECRET_STAGES = [11, 12, 13, 14, 15, 16, 17, 18];
/** These rifts only open once the parent stage holds all six stars. */
export const STAR_SECRETS = { 16: 2, 17: 4, 18: 6 };
export const TOTAL_STAGES = MAIN_STAGES + SECRET_STAGES.length;
export const STARS_PER_STAGE = 6;
export const MAX_STARS = TOTAL_STAGES * STARS_PER_STAGE;

export const CHARACTERS = [
  { id: "vg", name: "Vanguard", prefix: "vg", body: "#4be3ff", accent: "#ff3d8b", blurb: "Balanced frame. Standard dash tuning." },
  { id: "nf", name: "Wraith", prefix: "nf", body: "#a78bfa", accent: "#4be3ff", blurb: "Light chassis. Sharper wall-kick arc." },
  { id: "pm", name: "Ember", prefix: "pm", body: "#ff8a3d", accent: "#ffd166", blurb: "Heavy plating. Wider melee reach." },
  { id: "sx", name: "Sentinel", prefix: "en", body: "#7af6c8", accent: "#ff3d8b", blurb: "Salvaged enemy chassis. Wide, low, relentless." },
  { id: "vx", name: "Valkyrie", prefix: "vx", body: "#ffd166", accent: "#7af6c8", blurb: "High-altitude frame. Fast recovery and long aerial drift." },
];

// The armoury lives in weapons.js: one table shared by the engine, HUD and menus.
export {
  WEAPONS,
  WEAPON_TYPES,
  WEAPON_ORDER,
  BASE_WEAPONS,
  CHALLENGE_WEAPONS,
  DUAL,
  isAmmoWeapon,
} from "./weapons";

export const ABILITIES = {
  leap: { id: "leap", name: "Aerial Leap", blurb: "Gain a mid-air jump; rank 2 grants a triple jump.", glyph: "II" },
  phase: { id: "phase", name: "Phase Dash", blurb: "Dash through danger; rank 2 adds vertical dashes.", glyph: "><" },
  glide: { id: "glide", name: "Featherfall", blurb: "Glide while falling; rank 2 adds a horizontal float.", glyph: "~~" },
  magnet: { id: "magnet", name: "Star Chaser", blurb: "Attract nearby pickups; rank 2 greatly extends its reach.", glyph: "**" },
  overdrive: { id: "overdrive", name: "Overdrive", blurb: "Increase weapon damage by 10%; rank 2 increases it by 20%.", glyph: "!!" },
};

export const SECRET_ABILITIES = { 11: "leap", 12: "phase", 13: "glide", 14: "magnet", 15: "overdrive" };
export const CHARACTER_SKILLS = { 0: "magnet", 1: "leap", 2: "phase", 3: "overdrive", 4: "glide" };
export const MAX_ABILITY_RANK = 2;

const emptyStars = () => {
  const stars = {};
  for (let stage = 1; stage <= TOTAL_STAGES; stage += 1) {
    stars[stage] = Array(STARS_PER_STAGE).fill(false);
  }
  return stars;
};

export const createDefaultSave = () => ({
  version: 2,
  character: 0,
  armor: {
    body: "#4be3ff",
    accent: "#ff3d8b",
  },
  primary: "buster",
  secondary: "blade",
  highestStage: 1,
  cleared: [],
  secrets: [],
  stars: emptyStars(),
  abilities: {},
  orbs: 0,
  unlockedCharacters: [],
  unlockedPalettes: [],
  unlockedWeapons: [],
  checkpoint: null,
  settings: {
    master: 1,
    music: 0.45,
    sfx: 0.7,
    shake: true,
    touchControls: true,
    highContrast: false,
    controls: { ...DEFAULT_CONTROLS },
  },
  savedAt: null,
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const LEGACY_KEYS = ["pixel-adventure-save-v1"];

const saveSlotKey = (slot) => `${SAVE_KEY}-slot-${slot}`;

function isValidSaveSlot(slot) {
  return Number.isInteger(slot) && slot >= 1 && slot <= SAVE_SLOT_COUNT;
}

export function getActiveSaveSlot() {
  const slot = Number(localStorage.getItem(ACTIVE_SAVE_SLOT_KEY));
  return isValidSaveSlot(slot) ? slot : 1;
}

export function setActiveSaveSlot(slot) {
  if (!isValidSaveSlot(slot)) throw new RangeError(`Save slot must be between 1 and ${SAVE_SLOT_COUNT}.`);
  localStorage.setItem(ACTIVE_SAVE_SLOT_KEY, String(slot));
  return loadSave(slot);
}

export function listSaveSlots() {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => {
    const id = index + 1;
    return { id, save: loadSave(id) };
  });
}

export function loadSave(slot = getActiveSaveSlot()) {
  if (!isValidSaveSlot(slot)) throw new RangeError(`Save slot must be between 1 and ${SAVE_SLOT_COUNT}.`);
  try {
    let raw = localStorage.getItem(saveSlotKey(slot));
    if (!raw && slot === 1) {
      raw = localStorage.getItem(SAVE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
      if (raw) localStorage.setItem(saveSlotKey(slot), raw);
    }
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function normalize(parsed) {
  const base = createDefaultSave();
  const save = { ...base, ...parsed };
  save.armor = { ...base.armor, ...(parsed.armor || {}) };
  save.settings = { ...base.settings, ...(parsed.settings || {}) };
  save.settings.controls = { ...DEFAULT_CONTROLS, ...((parsed.settings || {}).controls || {}) };
  save.abilities = Object.fromEntries(
    Object.entries(parsed.abilities || {}).map(([id, rank]) => [id, Math.max(0, Math.min(MAX_ABILITY_RANK, rank === true ? 1 : Number(rank) || 0))])
  );
  save.stars = { ...emptyStars(), ...(parsed.stars || {}) };
  Object.keys(save.stars).forEach((key) => {
    const list = [...save.stars[key]];
    while (list.length < STARS_PER_STAGE) list.push(false);
    save.stars[key] = list.slice(0, STARS_PER_STAGE);
  });
  save.cleared = Array.isArray(parsed.cleared) ? parsed.cleared : [];
  save.secrets = Array.isArray(parsed.secrets) ? parsed.secrets : [];
  save.orbs = Math.max(0, Number(parsed.orbs) || 0);
  save.unlockedCharacters = Array.isArray(parsed.unlockedCharacters) ? parsed.unlockedCharacters : [];
  save.unlockedPalettes = Array.isArray(parsed.unlockedPalettes) ? parsed.unlockedPalettes : [];
  save.unlockedWeapons = Array.isArray(parsed.unlockedWeapons) ? parsed.unlockedWeapons : [];
  return save;
}

export function writeSave(patch) {
  const current = loadSave() || createDefaultSave();
  const next = { ...current, ...patch, savedAt: new Date().toISOString() };
  if (patch?.stars) next.stars = { ...current.stars, ...patch.stars };
  if (patch?.armor) next.armor = { ...current.armor, ...patch.armor };
  if (patch?.settings) {
    next.settings = { ...current.settings, ...patch.settings };
    next.settings.controls = { ...current.settings.controls, ...(patch.settings.controls || {}) };
  }
  if (patch?.abilities) next.abilities = { ...current.abilities, ...patch.abilities };
  localStorage.setItem(saveSlotKey(getActiveSaveSlot()), JSON.stringify(next));
  return next;
}

export function hasSave() {
  const save = loadSave();
  return Boolean(save);
}

export function clearSave(slot = getActiveSaveSlot()) {
  if (!isValidSaveSlot(slot)) throw new RangeError(`Save slot must be between 1 and ${SAVE_SLOT_COUNT}.`);
  localStorage.removeItem(saveSlotKey(slot));
  if (slot === 1) {
    localStorage.removeItem(SAVE_KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }
}

export function stageStars(save, stage) {
  const list = save?.stars?.[stage] || [];
  return list.filter(Boolean).length;
}

export function totalStars(save) {
  return Object.values(save?.stars || {}).reduce((sum, list) => sum + list.filter(Boolean).length, 0);
}

export function isStageUnlocked(save, stage) {
  if (stage <= 1) return true;
  if (!save) return false;
  if (STAR_SECRETS[stage]) return stageStars(save, STAR_SECRETS[stage]) >= STARS_PER_STAGE;
  if (SECRET_STAGES.includes(stage)) return (save.secrets || []).includes(stage);
  if ((save.highestStage || 1) >= stage) return true;
  return (save.cleared || []).includes(stage - 1);
}

export function completeStage(stage, { collected = 0, noDeath = false, coins = 0, coinsTotal = 0 } = {}) {
  const save = loadSave() || createDefaultSave();
  const cleared = new Set([...(save.cleared || []), stage]);
  const secrets = new Set(save.secrets || []);
  const abilities = { ...save.abilities };
  const stars = { ...save.stars };
  const unlockedWeapons = new Set(save.unlockedWeapons || []);
  let unlockedSecret = null;
  let unlockedAbility = null;
  let abilityRank = 0;
  let abilityUpgraded = false;
  let unlockedWeapon = null;

  if (stage <= 5 && collected >= STARS_COLLECTIBLE) {
    const secret = stage + 10;
    if (!secrets.has(secret)) {
      secrets.add(secret);
      unlockedSecret = secret;
    }
  }

  if (SECRET_STAGES.includes(stage)) {
    const ability = SECRET_ABILITIES[stage];
    if (ability) {
      const currentRank = Number(abilities[ability]) || 0;
      abilityRank = Math.min(MAX_ABILITY_RANK, currentRank + 1);
      abilityUpgraded = currentRank > 0 && abilityRank > currentRank;
      unlockedAbility = ability;
      abilities[ability] = abilityRank;
    }
  }

  // Coin challenge: every coin in one run hands over that stage's weapon.
  if (coinsTotal > 0 && coins >= coinsTotal) {
    const reward = CHALLENGE_WEAPONS[stage];
    if (reward && !unlockedWeapons.has(reward)) {
      unlockedWeapons.add(reward);
      unlockedWeapon = reward;
    }
  }

  if (noDeath) {
    const list = [...(stars[stage] || Array(STARS_PER_STAGE).fill(false))];
    list[5] = true;
    stars[stage] = list;
  }

  const orbGain =
    (SECRET_STAGES.includes(stage) ? 80 : 40) +
    collected * 5 +
    (unlockedWeapon ? 60 : 0) +
    (unlockedSecret ? 40 : 0);

  const next = writeSave({
    cleared: Array.from(cleared),
    secrets: Array.from(secrets),
    abilities,
    stars,
    unlockedWeapons: Array.from(unlockedWeapons),
    orbs: (save.orbs || 0) + orbGain,
    highestStage: MAIN_STAGES >= stage ? Math.min(MAIN_STAGES, Math.max(save.highestStage || 1, stage + 1)) : save.highestStage,
  });
  return { save: next, unlockedSecret, unlockedAbility, abilityRank, abilityUpgraded, unlockedWeapon, orbGain };
}

export function recordStar(stage, index) {
  const save = loadSave() || createDefaultSave();
  const list = [...(save.stars[stage] || Array(STARS_PER_STAGE).fill(false))];
  list[index] = true;
  return writeSave({ stars: { [stage]: list } });
}

export function saveCheckpoint(stage, checkpointIndex) {
  return writeSave({ checkpoint: { stage, index: checkpointIndex } });
}

// --- ownership helpers -------------------------------------------------------
// Weapons, the fourth frame and the shop palettes are gated here so every
// screen (loadout, shop, HUD) agrees on what the player actually owns.

export function isWeaponOwned(save, id) {
  const weapon = WEAPONS[id];
  if (!weapon) return false;
  if (!weapon.unlock) return true;
  return (save?.unlockedWeapons || []).includes(id);
}

export function isCharacterOwned(save, index) {
  if (!(index in LOCKED_CHARACTERS)) return true;
  return (save?.unlockedCharacters || []).includes(index);
}

export function isPaletteOwned(save, name) {
  if (!(name in LOCKED_PALETTES)) return true;
  return (save?.unlockedPalettes || []).includes(name);
}

export function saveSummary(save) {
  if (!save) return null;
  return clone({
    stage: save.highestStage,
    stars: totalStars(save),
    character: CHARACTERS[save.character]?.name || CHARACTERS[0].name,
    savedAt: save.savedAt,
  });
}