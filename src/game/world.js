/**
 * ============================================================================
 *  WORLD — art and stages: where sprites live, how they are drawn, how a stage
 *  is generated, and everything painted on the canvas each frame.
 *  (Four former files: assets, sprites, levels, render.)
 * ============================================================================
 *  SECTIONS:
 *    1. ASSETS   image paths + animation frame layouts
 *    2. SPRITES  sheet frames, recolouring, character/enemy animation
 *    3. LEVELS   the stage generator and tutorial dialogue
 *    4. RENDER   backgrounds, terrain, hazards, items, characters, shots
 *
 *  TUNE: stage length/theme in LEVELS (the MAIN/SECRETS tables at the bottom);
 *  colours in RENDER's PALETTES; animation speeds in ASSETS' CHAR_ANIMS.
 *  Positions are deliberately rounded to whole pixels — removing those
 *  Math.round calls is what makes sprites shimmer.
 * ============================================================================
 */
import { COINS_PER_CHALLENGE_STAGE, ROWS, RUN_SPEED, TILE, VIEW_H, VIEW_W, clamp } from "./core";
import { CLOUD_URLS, THEME_CLOUDS } from "./clouds";
import { TUTORIALS } from "./dialogue";
import { WEAPONS } from "./weapons";
import { drawBlade, drawBullet, drawExplosion } from "./entities";

// ---------------------------------------------------------------------------
//  1. ASSETS — files are served from /public/game/... (so "/game/chars/x.png"
//  is public/game/chars/x.png). In each animation entry: fw/fh = size of one
//  frame, frames = frames in the row, fps = animation speed.
// ---------------------------------------------------------------------------

const BASE = "/game";

export const CHAR_ANIMS = {
  idle: { frames: 11, fw: 32, fh: 32, fps: 10 },
  run: { frames: 12, fw: 32, fh: 32, fps: 16 },
  jump: { frames: 1, fw: 32, fh: 32, fps: 1 },
  fall: { frames: 1, fw: 32, fh: 32, fps: 1 },
  hit: { frames: 7, fw: 32, fh: 32, fps: 16 },
  wall: { frames: 5, fw: 32, fh: 32, fps: 12 },
  djump: { frames: 6, fw: 32, fh: 32, fps: 14 },
};

const ANIMATION_RATE = 1.2;

export const ENEMY_ANIMS = {
  idle: { frames: 24, fw: 30, fh: 30, fps: 12 },
  run: { frames: 10, fw: 30, fh: 30, fps: 14 },
  jump: { frames: 28, fw: 30, fh: 30, fps: 16 },
  hurt: { frames: 9, fw: 55, fh: 80, fps: 14 },
  death: { frames: 20, fw: 40, fh: 50, fps: 16 },
};

export const THEMES = ["blue", "purple", "green", "brown", "gray", "pink", "yellow"];

const CHAR_KEYS = ["idle", "run", "jump", "fall", "hit", "wall", "djump"];
const ENEMY_KEYS = ["idle", "run", "jump", "hurt", "death"];

/** The fourth character is built from the enemy sheets, so map its poses. */
const ENEMY_CHAR_ANIM = { idle: "idle", run: "run", jump: "jump", fall: "jump", wall: "idle", hit: "hurt", djump: "jump" };

export function sheetFor(prefix, animKey) {
  if (prefix === "en") {
    const key = ENEMY_CHAR_ANIM[animKey] || "idle";
    return { imgKey: `enemy_${key}`, anim: ENEMY_ANIMS[key] };
  }
  return { imgKey: `${prefix}_${animKey}`, anim: CHAR_ANIMS[animKey] || CHAR_ANIMS.idle };
}

const MANIFEST = {};
Object.entries(CLOUD_URLS).forEach(([set, urls]) => {
  urls.forEach((url, i) => {
    MANIFEST[`cloud_${set}_${i}`] = url;
  });
});
["vg", "nf", "pm", "vx"].forEach((prefix) => {
  CHAR_KEYS.forEach((key) => {
    MANIFEST[`${prefix}_${key}`] = `${BASE}/chars/${prefix}_${key}.png`;
  });
});
ENEMY_KEYS.forEach((key) => {
  MANIFEST[`enemy_${key}`] = `${BASE}/enemy/${key}.png`;
});
THEMES.forEach((theme) => {
  MANIFEST[`bg_${theme}`] = `${BASE}/bg/${theme}.png`;
});
Object.assign(MANIFEST, {
  weapon_sheet: `${BASE}/weapons-fantasy.png`,
  terrain: `${BASE}/terrain.png`,
  checkpoint_off: `${BASE}/items/checkpoint_off.png`,
  checkpoint_on: `${BASE}/items/checkpoint_on.png`,
  exit: `${BASE}/items/exit.png`,
  exit_on: `${BASE}/items/exit_on.png`,
  spikes: `${BASE}/traps/spikes.png`,
  saw: `${BASE}/traps/saw.png`,
  fire: `${BASE}/traps/fire.png`,
  confetti: `${BASE}/fx/confetti.png`,
  dust: `${BASE}/fx/dust.png`,
  shadow: `${BASE}/fx/shadow.png`,
});

let assetCache = null;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function loadAssets() {
  if (assetCache) return Promise.resolve(assetCache);
  const keys = Object.keys(MANIFEST);
  return Promise.all(keys.map((key) => loadImage(MANIFEST[key]))).then((images) => {
    const assets = {};
    keys.forEach((key, i) => {
      assets[key] = images[i];
    });
    assetCache = assets;
    return assets;
  });
}

// ---------------------------------------------------------------------------
//  2. SPRITES — draws one animation frame from a sheet and recolours it for
//  character customisation (body/accent colours are swapped per pixel).
// ---------------------------------------------------------------------------

const tintCache = new Map();

function parseHex(hex) {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

export function tintSprite(img, body, accent, cacheKey, glow = accent) {
  if (!img) return null;
  const key = `${cacheKey}|${body}|${accent}|${glow}`;
  if (tintCache.has(key)) return tintCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const bodyRgb = parseHex(body);
  const accentRgb = parseHex(accent);
  const glowRgb = parseHex(glow);
  for (let i = 0; i < px.length; i += 4) {
    const alpha = px[i + 3];
    if (alpha < 10) continue;
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    let outR;
    let outG;
    let outB;
    if (lum < 0.14) {
      // outlines stay dark so the silhouette reads on every background
      outR = r * 0.28;
      outG = g * 0.28;
      outB = b * 0.34;
    } else {
      const shade = 0.5 + lum * 0.85;
      const plateMix = Math.min(1, Math.max(0, (lum - 0.38) / 0.44));
      const glowMix = Math.min(1, Math.max(0, (lum - 0.82) / 0.18));
      const baseR = bodyRgb[0] * (1 - plateMix) + accentRgb[0] * plateMix;
      const baseG = bodyRgb[1] * (1 - plateMix) + accentRgb[1] * plateMix;
      const baseB = bodyRgb[2] * (1 - plateMix) + accentRgb[2] * plateMix;
      outR = baseR * shade * (1 - glowMix) + glowRgb[0] * glowMix;
      outG = baseG * shade * (1 - glowMix) + glowRgb[1] * glowMix;
      outB = baseB * shade * (1 - glowMix) + glowRgb[2] * glowMix;
    }
    px[i] = Math.min(255, outR);
    px[i + 1] = Math.min(255, outG);
    px[i + 2] = Math.min(255, outB);
  }
  ctx.putImageData(data, 0, 0);
  tintCache.set(key, canvas);
  return canvas;
}

export function drawFrame(ctx, img, fw, fh, frame, dx, dy, dw, dh, flip = false) {
  if (!img) return;
  const drawX = Math.round(dx);
  const drawY = Math.round(dy);
  const columns = Math.max(1, Math.floor(img.width / fw));
  const rows = Math.max(1, Math.floor(img.height / fh));
  const frameCount = columns * rows;
  const safeFrame = Math.max(0, Math.min(Math.floor(frame), frameCount - 1));
  const sx = (safeFrame % columns) * fw;
  const sy = Math.floor(safeFrame / columns) * fh;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(drawX + dw / 2, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, fw, fh, -dw / 2, 0, dw, dh);
  } else {
    ctx.drawImage(img, sx, sy, fw, fh, drawX, drawY, dw, dh);
  }
  ctx.restore();
}

export function drawChar(ctx, assets, prefix, animKey, time, dx, dy, dw, dh, flip, tint) {
  const sheet = sheetFor(prefix, animKey);
  const anim = sheet.anim;
  const img = assets[sheet.imgKey];
  if (!img) return;
  const source = tint ? tintSprite(img, tint.body, tint.accent, sheet.imgKey, tint.glow) : img;
  const availableFrames = Math.max(1, Math.floor(img.width / anim.fw) * Math.floor(img.height / anim.fh));
  const frameTotal = Math.min(anim.frames, availableFrames);
  const cycleRate = (anim.fps * ANIMATION_RATE) / frameTotal;
  const phase = time * Math.PI * 2 * cycleRate;
  const frame = Math.floor(time * anim.fps * ANIMATION_RATE) % frameTotal;
  // Add pixel-aligned secondary motion to playable idle/run poses. The sheets
  // supply the main action; this keeps the stance alive at every display size.
  const scale = Math.max(1, Math.min(dw, dh) / 32);
  const idleBreath = prefix !== "en" && animKey === "idle" ? Math.round((Math.sin(phase) + 1) * 0.5 * scale) : 0;
  const runBounce = prefix !== "en" && animKey === "run" ? Math.round(Math.max(0, Math.sin(phase)) * scale) : 0;
  drawFrame(ctx, source, anim.fw, anim.fh, frame, dx, dy - idleBreath - runBounce, dw, dh, flip);
}

export function drawEnemyAnim(ctx, assets, animKey, time, dx, dy, dw, dh, flip = false, tint = null) {
  const anim = ENEMY_ANIMS[animKey] || ENEMY_ANIMS.idle;
  const img = assets[`enemy_${animKey}`];
  if (!img) return;
  const availableFrames = Math.max(1, Math.floor(img.width / anim.fw) * Math.floor(img.height / anim.fh));
  const frame = Math.floor(time * anim.fps * ANIMATION_RATE) % Math.min(anim.frames, availableFrames);
  const source = tint ? tintSprite(img, tint.body, tint.accent, `enemy_${animKey}`) : img;
  drawFrame(ctx, source, anim.fw, anim.fh, frame, dx, dy, dw, dh, flip);
}

// ---------------------------------------------------------------------------
//  3. LEVELS — the stage generator and the tutorial lines.
//  TUTORIALS: the banter boxes at the start of each stage; {JUMP}/{FIRE}/
//  {DASH}/{SWAP} print the player's current keys, so keep the braces.
//  LEVELS: each stage is a small config (MAIN/SECRETS tables below) that the
//  generator turns into tiles. Longer stage = raise `width`.
//  Grid: x is tiles from the left, y is tiles from the top (row 15 = ground).
// ---------------------------------------------------------------------------

// Stage banter lives in dialogue.js (TUTORIALS).

const mulberry = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clampInt = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

function buildStage(cfg) {
  const rand = mulberry(cfg.seed);
  const R = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const W = cfg.width;

  const platforms = [];
  const movers = [];
  const trapSpikes = [];
  const spikes = [];
  const saws = [];
  const enemies = [];
  const stars = [];
  const coins = [];
  const ammo = [];
  const fruits = [];
  const checkpoints = [];
  const spans = [];
  const gaps = [];

  const ground = (x, len, top) => {
    if (len <= 0) return;
    platforms.push([x, top, len, ROWS - top]);
    spans.push({ x, len, top, end: x + len - 1 });
  };

  let x = 8;
  let top = 15;
  const limit = W - 12;

  ground(0, 8, 15); // safe starting plateau
  let lastWasGap = false;
  while (x < limit) {
    const roll = rand();

    // Gaps are capped at four tiles and NEVER chained back to back: a bridge
    // (mover or stepping stone) plus solid ground after it, always.
    if (roll >= 0.8 && !lastWasGap) {
      const gap = R(3, 4);
      gaps.push({ start: x, len: gap });
      if (rand() < 0.5) {
        movers.push({ x, y: top, w: 3, axis: "x", range: Math.max(1, gap - 1), speed: R(36, 52), phase: rand() * 3 });
      } else {
        platforms.push([x + Math.floor(gap / 2), top - 2, 2, 1]);
      }
      x += gap;
      lastWasGap = true;
      continue;
    }

    lastWasGap = false;
    if (roll < 0.4) {
      const len = R(6, 11);
      ground(x, len, top);
      x += len;
    } else if (roll < 0.62) {
      // stepped hill: two or three ledges climbing or dropping
      const dir = top >= 15 ? -1 : top <= 11 ? 1 : rand() < 0.55 ? -1 : 1;
      const steps = R(2, 3);
      for (let s = 0; s < steps; s += 1) {
        top = clampInt(top + dir, 11, 15);
        const len = R(3, 5);
        ground(x, len, top);
        x += len;
      }
    } else {
      // plateau: a tall cliff with a shelf floating above it
      const len = R(9, 14);
      top = clampInt(top - R(1, 2), 11, 15);
      ground(x, len, top);
      if (rand() < 0.85) platforms.push([x + 2, top - 4, R(3, 4), 1]);
      x += len;
      top = clampInt(top + R(1, 2), 12, 15);
    }
  }
  ground(x, W - x, top);

  // hanging shelves and high chains: the vertical routes between tiers.
  // IMPORTANT: every shelf keeps at least 4 tiles of headroom above the
  // nearest ground, otherwise the player gets pinched under it and cannot jump
  // onto the next ledge.
  for (let cx = 10; cx < W - 14; cx += R(7, 11)) {
    const w = R(3, 5);
    const nearby = spans.filter((s) => s.x < cx + w + 6 && s.x + s.len > cx - 6);
    const highestGround = nearby.length ? Math.min(...nearby.map((s) => s.top)) : 15;
    const row = Math.min(clampInt(R(8, 12), 6, 12), highestGround - 5);
    if (row < 4) continue;
    platforms.push([cx, row, w, 1]);
    if (rand() < 0.6) platforms.push([cx + w + 1, Math.max(3, row - 3), R(2, 3), 1]);
    if (rand() < 0.25) {
      movers.push({ x: cx + 1, y: Math.max(4, row - 4), w: 2, axis: "y", range: 3, speed: R(20, 32), phase: rand() * 4 });
    }
  }

  // enemies patrol the walkable shelves (sparser now that stages are long)
  spans.forEach((span, i) => {
    if (i === 0 || span.len < 6) return;
    const count = Math.max(1, Math.floor(span.len / 18));
    for (let k = 0; k < count; k += 1) {
      const ex = span.x + 2 + Math.floor(((span.len - 3) * (k + 0.5)) / count);
      const variants = ["standard", "shielded", "flyer", "armored", "gunner", "exo"];
      const variant = variants[(enemies.length + cfg.id) % variants.length];
      enemies.push({ x: ex, y: span.top, minX: span.x + 1, maxX: span.end - 1, variant });
    }
  });

  // spikes live in the row directly above the floor they belong to
  for (let k = 0; k < 4 + Math.round(cfg.hard * 6) + Math.round(W / 260); k += 1) {
    const span = spans[1 + Math.floor(rand() * Math.max(1, spans.length - 2))];
    if (!span || span.len < 7) continue;
    const w = R(2, 4);
    const sx = span.x + 2 + Math.floor(rand() * Math.max(1, span.len - w - 3));
    if (rand() < 0.55) {
      spikes.push([sx, span.top - 1, w]);
    } else {
      trapSpikes.push({ x: sx, y: span.top - 1, w, period: 1.6 + rand() * 1.3, onFrac: 0.42 + rand() * 0.16, phase: rand() * 2.4 });
      if (rand() < 0.6) platforms.push([sx + 1, span.top - 4, Math.max(2, w), 1]);
    }
  }

  for (let k = 0; k < 3 + Math.round(cfg.hard * 3) + Math.round(W / 400); k += 1) {
    saws.push({ x: 12 + Math.floor(rand() * Math.max(1, W - 24)), y: R(8, 11), r: 15 });
  }

  // ammo crates: roughly one every 70 tiles so long stages stay sustainable
  const spanAt = (tx) => spans.find((s) => tx >= s.x && tx <= s.end && s.len > 3);
  for (let tx = 24; tx < W - 16; tx += 70) {
    const span = spanAt(tx);
    if (span) ammo.push([tx, span.top - 1]);
  }

  // coin challenge: every coin must be grabbed in one run
  if (cfg.challenge) {
    const count = COINS_PER_CHALLENGE_STAGE;
    for (let i = 0; i < count; i += 1) {
      const tx = Math.floor((W - 30) * (0.06 + (0.88 * i) / (count - 1)));
      const span = spanAt(tx) || spans[1] || spans[0];
      if (span) coins.push([clampInt(tx, span.x + 1, span.end - 1), span.top - 1]);
    }
  }

  // fruit pickups are scattered through the route and refresh every run
  const spawnFruitCount = Math.max(4, Math.min(8, Math.floor(W / 210)));
  for (let i = 0; i < spawnFruitCount; i += 1) {
    const tx = 18 + Math.floor(((W - 36) * (i + 1)) / (spawnFruitCount + 1));
    const span = spanAt(tx) || spans[1] || spans[0];
    if (span) fruits.push([clampInt(tx, span.x + 2, span.end - 2), span.top - 1]);
  }

  // Clearance pass: no floating shelf may sit within four tiles above a
  // walkable ground segment. Without this a shelf can box the player in at the
  // foot of the next step and make the stage impossible to finish.
  for (let i = platforms.length - 1; i >= 0; i -= 1) {
    const [px, py, pw, ph = 1] = platforms[i];
    if (ph >= 2) continue;
    const pinches = spans.some(
      (span) => px < span.x + span.len && px + pw > span.x && py > span.top - 5 && py < span.top
    );
    if (pinches) platforms.splice(i, 1);
  }

  // Five resonance shards sit on the highest reachable shelves.
  const candidates = platforms.filter((p) => p[2] >= 2);
  const spotFor = (tx) => {
    let best = null;
    candidates.forEach(([px, py, pw]) => {
      if (px <= tx && px + pw > tx && (!best || py < best[1])) best = [px, py, pw];
    });
    return best ? [best[0] + Math.floor(best[2] / 2), best[1] - 1] : [tx, 10];
  };
  [0.16, 0.34, 0.52, 0.72].forEach((f) => stars.push(spotFor(Math.floor(W * f))));
  const highest = platforms.reduce((acc, p) => (p[1] < acc[1] ? p : acc), [0, 15, 1]);
  stars.push([highest[0] + Math.floor(highest[2] / 2), highest[1] - 1]);

  [0.2, 0.4, 0.6, 0.8, 0.94].forEach((f) => {
    const tx = Math.floor(W * f);
    const span = spans.find((s) => tx >= s.x && tx <= s.end && s.len > 4);
    if (span) checkpoints.push([clampInt(tx, span.x + 1, span.end - 1), span.top]);
  });

  // Never leave a shard buried in rock.
  const solidSet = new Set();
  platforms.forEach(([px, py, pw, ph = 1]) => {
    for (let ty = py; ty < py + ph; ty += 1) {
      for (let tx = px; tx < px + pw; tx += 1) solidSet.add(`${tx},${ty}`);
    }
  });
  stars.forEach(([sx, sy], index) => {
    if (!solidSet.has(`${sx},${sy}`)) return;
    for (let radius = 1; radius <= 5; radius += 1) {
      const found = [
        [sx + radius, sy],
        [sx - radius, sy],
        [sx, sy - radius],
      ].find(([x2, y2]) => y2 > 1 && !solidSet.has(`${x2},${y2}`));
      if (found) {
        stars[index] = found;
        break;
      }
    }
  });

  // coins and ammo crates must never spawn inside terrain either — float them
  // up to four tiles (one jump) until they sit in open air.
  const unbury = ([px, py]) => {
    for (let lift = 0; lift <= 4; lift += 1) {
      const ty = py - lift;
      if (ty > 1 && !solidSet.has(`${px},${ty}`)) return [px, ty];
    }
    return [px, py];
  };
  coins.forEach((coin, index) => {
    coins[index] = unbury(coin);
  });
  ammo.forEach((crate, index) => {
    ammo[index] = unbury(crate);
  });
  fruits.forEach((fruit, index) => {
    fruits[index] = unbury(fruit);
  });

  const texts = TUTORIALS[cfg.id] || TUTORIALS[1];
  const tutorials = [
    { x: 3, y: 11, w: 3, h: 4, ...texts[0] },
    { x: Math.floor(W * 0.32), y: 8, w: 3, h: 7, ...(texts[1] || texts[0]) },
    { x: Math.floor(W * 0.63), y: 8, w: 3, h: 7, ...(texts[2] || texts[0]) },
  ];

  const exitSpan = spans[spans.length - 1];

  return {
    id: cfg.id,
    name: cfg.name,
    theme: cfg.theme,
    backdrop: cfg.backdrop || cfg.theme,
    width: W,
    spawn: [2, 15],
    platforms,
    movers,
    trapSpikes,
    spikes,
    saws,
    enemies,
    stars,
    accent: STAGE_ACCENTS[cfg.id] || "#4be3ff",
    coins,
    ammo,
    fruits,
    challenge: Boolean(cfg.challenge),
    checkpoints,
    exit: [W - 4, exitSpan ? exitSpan.top : 15],
    tutorials,
    secretOf: cfg.secretOf || null,
    starOf: cfg.starOf || null,
    ability: cfg.ability || null,
    reward: cfg.reward || null,
    starCurrency: Boolean(cfg.starCurrency),
  };
}

// Long-form stages: roughly 1500–2100 tiles ≈ 5–7 minutes with combat,
// climbing and the coin hunt. Width is the single most important number here.
const MAIN = [
  { id: 1, name: "Rustline Ridge", theme: "green", width: 1500, seed: 1101, hard: 0.15, challenge: true },
  { id: 2, name: "Hollow Gallery", theme: "blue", width: 1580, seed: 2202, hard: 0.24 },
  { id: 3, name: "Rustline Foundry", theme: "brown", width: 1660, seed: 3303, hard: 0.33, challenge: true },
  { id: 4, name: "Neon Garden", theme: "purple", width: 1740, seed: 4404, hard: 0.4 },
  { id: 5, name: "Greywater Docks", theme: "gray", width: 1820, seed: 5505, hard: 0.48, challenge: true },
  { id: 6, name: "Rose Circuit", theme: "pink", width: 1900, seed: 6606, hard: 0.55 },
  { id: 7, name: "Sunspire Run", theme: "yellow", width: 1980, seed: 7707, hard: 0.62 },
  { id: 8, name: "Violet Rift", theme: "violet", width: 2050, seed: 8808, hard: 0.7 },
  { id: 9, name: "Skyline Zero", theme: "cyan", width: 2120, seed: 9909, hard: 0.78 },
];

const STAGE_ACCENTS = {
  1: "#75f0b5",
  2: "#74baff",
  3: "#ff896e",
  4: "#c18aff",
  5: "#5edcc8",
  6: "#ff72b6",
  7: "#c7eb70",
  8: "#9b8cff",
  9: "#57d9ef",
  10: "#ff668f",
  11: "#70d5ff",
  12: "#d18cff",
  13: "#78f0df",
  14: "#b8dc70",
  15: "#ff9d67",
  16: "#e18bff",
  17: "#6ce9a8",
  18: "#7b9dff",
  19: "#70d5ff",
  20: "#d18cff",
  21: "#78f0df",
  22: "#b8dc70",
  23: "#ff9d67",
  24: "#e18bff",
  25: "#6ce9a8",
  26: "#b28cff",
};

const RIFTS = [
  { id: 11, name: "Rift: Aerial Ascent", theme: "cyan", width: 300, seed: 1111, hard: 0.5, secretOf: 1, ability: "leap", reward: "AERIAL LEAP" },
  { id: 12, name: "Rift: Glass Gauntlet", theme: "violet", width: 330, seed: 1212, hard: 0.62, secretOf: 2, ability: "phase", reward: "PHASE DASH" },
  { id: 13, name: "Rift: Windward Spires", theme: "blue", width: 360, seed: 1313, hard: 0.7, secretOf: 3, ability: "glide", reward: "FEATHERFALL" },
  { id: 14, name: "Rift: Deep Vault", theme: "brown", width: 390, seed: 1414, hard: 0.78, secretOf: 4, ability: "magnet", reward: "SHARD MAGNET" },
  { id: 15, name: "Rift: Overdrive Foundry", theme: "yellow", width: 420, seed: 1515, hard: 0.86, secretOf: 5, ability: "overdrive", reward: "OVERDRIVE" },
  { id: 16, name: "Vault: Shard Shrine", theme: "purple", width: 400, seed: 1616, hard: 0.66, starOf: 2, reward: "ORBS" },
  { id: 17, name: "Vault: Echo Hollow", theme: "violet", width: 440, seed: 1717, hard: 0.74, starOf: 4, reward: "ORBS" },
  { id: 18, name: "Vault: Resonance Deep", theme: "cyan", width: 480, seed: 1818, hard: 0.84, starOf: 6, reward: "ORBS" },
];

const POSTGAME = [
  { id: 19, name: "Ashen Causeway", theme: "brown", backdrop: "ash", width: 2450, seed: 1911, hard: 0.86 },
  { id: 20, name: "Prism Break", theme: "purple", backdrop: "prism", width: 2560, seed: 2012, hard: 0.92 },
  { id: 21, name: "Tempest Crown", theme: "cyan", backdrop: "tempest", width: 2670, seed: 2113, hard: 0.98 },
  { id: 22, name: "Gilded Undertow", theme: "yellow", backdrop: "undertow", width: 2780, seed: 2214, hard: 1.04 },
  { id: 23, name: "Frostline Collapse", theme: "blue", backdrop: "frost", width: 2890, seed: 2315, hard: 1.1 },
  { id: 24, name: "The Dusk Engine", theme: "violet", backdrop: "dusk", width: 3000, seed: 2416, hard: 1.16 },
  { id: 25, name: "Solar Rupture", theme: "pink", backdrop: "solar", width: 3110, seed: 2517, hard: 1.22 },
].map((stage) => ({ ...stage, starCurrency: true, postgame: true }));

const BOSS_ARENA_OFFSET = 260;
const BOSS_ARENA_FLOOR = [14, 15, 29, 2];
const BOSS_ARENA = {
  width: 45,
  platforms: [BOSS_ARENA_FLOOR],
  checkpoints: [[21, 7]],
  exit: [41, 15],
  boss: {
    x: 29,
    y: 15,
    minX: 15,
    maxX: 43,
    arenaMinX: 14,
    arenaMaxX: 43,
    triggerY: 11,
    dropMinX: 24,
    dropMaxX: 28,
    cameraX: 224,
    collisionPlatforms: [BOSS_ARENA_FLOOR],
    grandGem: [29, 14],
    ultimate: false,
  },
};

const BOSS_STAGE = (() => {
  const approach = buildStage({
    id: 10,
    name: "Void Core",
    theme: "gray",
    width: BOSS_ARENA_OFFSET,
    seed: 1010,
    hard: 0.72,
  });
  const midpointGround = approach.platforms
    .filter(([x, , width, height = 1]) => height > 1 && width >= 4 && x < BOSS_ARENA_OFFSET - 8)
    .sort(
      (a, b) =>
        Math.abs(a[0] + a[2] / 2 - BOSS_ARENA_OFFSET / 2) -
        Math.abs(b[0] + b[2] / 2 - BOSS_ARENA_OFFSET / 2)
    )[0];
  const midpointCheckpoint = midpointGround
    ? [
        clampInt(Math.floor(BOSS_ARENA_OFFSET / 2), midpointGround[0] + 1, midpointGround[0] + midpointGround[2] - 2),
        midpointGround[1],
      ]
    : null;
  const routeCheckpoints = approach.checkpoints.filter(([x]) => x < BOSS_ARENA_OFFSET - 12);
  if (
    midpointCheckpoint &&
    !routeCheckpoints.some(([x]) => Math.abs(x - midpointCheckpoint[0]) < 8)
  ) {
    routeCheckpoints.push(midpointCheckpoint);
  }
  routeCheckpoints.sort((a, b) => a[0] - b[0]);

  const arenaX = (x) => x + BOSS_ARENA_OFFSET;
  const arenaPoint = ([x, y]) => [arenaX(x), y];
  const arenaBoss = {
    ...BOSS_ARENA.boss,
    x: arenaX(BOSS_ARENA.boss.x),
    minX: arenaX(BOSS_ARENA.boss.minX),
    maxX: arenaX(BOSS_ARENA.boss.maxX),
    arenaMinX: arenaX(BOSS_ARENA.boss.arenaMinX),
    arenaMaxX: arenaX(BOSS_ARENA.boss.arenaMaxX),
    dropMinX: arenaX(BOSS_ARENA.boss.dropMinX),
    dropMaxX: arenaX(BOSS_ARENA.boss.dropMaxX),
    cameraX: BOSS_ARENA.boss.cameraX + BOSS_ARENA_OFFSET * TILE,
    collisionPlatforms: BOSS_ARENA.boss.collisionPlatforms.map(([x, y, width, height]) => [
      arenaX(x),
      y,
      width,
      height,
    ]),
    grandGem: arenaPoint(BOSS_ARENA.boss.grandGem),
  };

  return {
    ...approach,
    width: BOSS_ARENA_OFFSET + BOSS_ARENA.width,
    accent: STAGE_ACCENTS[10],
    platforms: [
      ...approach.platforms,
      ...BOSS_ARENA.platforms.map(([x, y, width, height]) => [arenaX(x), y, width, height]),
    ],
    enemies: approach.enemies.slice(0, 5).map((enemy) => ({ ...enemy, variant: "standard" })),
    stars: [],
    coins: [],
    challenge: false,
    checkpoints: [...routeCheckpoints, ...BOSS_ARENA.checkpoints.map(arenaPoint)],
    exit: arenaPoint(BOSS_ARENA.exit),
    tutorials: [],
    boss: arenaBoss,
    secretOf: null,
    starOf: null,
    starCurrency: false,
    ability: null,
    reward: null,
  };
})();

function fiveStars(level) {
  const platforms = level.platforms.filter(([, , width]) => width >= 2);
  return [0.12, 0.3, 0.5, 0.7, 0.88].map((fraction) => {
    const target = Math.floor(level.width * fraction);
    const surface = platforms
      .filter(([x]) => x < target + 12)
      .sort((a, b) => Math.abs(a[0] + a[2] / 2 - target) - Math.abs(b[0] + b[2] / 2 - target))[0];
    return surface ? [surface[0] + Math.floor(surface[2] / 2), Math.max(2, surface[1] - 1)] : [target, 10];
  });
}

const ULTIMATE_STAGE = {
  ...BOSS_STAGE,
  id: 26,
  name: "Eclipse Heart",
  backdrop: "eclipse",
  accent: "#b28cff",
  stars: [],
  starCurrency: true,
  postgame: true,
  grandGem: null,
  boss: { ...BOSS_STAGE.boss, ultimate: true, grandGem: null },
};
ULTIMATE_STAGE.stars = fiveStars(ULTIMATE_STAGE);

export const LEVELS = [...MAIN.map(buildStage), BOSS_STAGE, ...RIFTS.map(buildStage), ...POSTGAME.map(buildStage), ULTIMATE_STAGE];

export function getLevel(id) {
  return LEVELS.find((level) => level.id === Number(id)) || LEVELS[0];
}

// ---------------------------------------------------------------------------
//  4. RENDER — everything you SEE on the canvas, drawn every frame.
//  Backgrounds are generated per theme (no image files) and each stage's floor,
//  platforms and sky use its own palette from PALETTES below.
//  TUNE: PALETTES colours (edit hex freely), parallax factors in
//  drawBackground(), shard size/glow in drawShards().
// ---------------------------------------------------------------------------

const PALETTES = {
  green: {
    sky: ["#04100c", "#0a231b", "#123a2b", "#08170f"],
    far: "#0d3327",
    mid: "#0a2620",
    near: "#061a14",
    tileTop: "#74f0a5",
    tileMid: "#2f7d58",
    tileDeep: "#123b2b",
    line: "#9dffc9",
    accent: "#ffd166",
    mote: "#9df5c7",
    silhouette: "hills",
  },
  blue: {
    sky: ["#04091a", "#0a1836", "#123059", "#060f22"],
    far: "#112b4f",
    mid: "#0b1e3a",
    near: "#061224",
    tileTop: "#8ccbff",
    tileMid: "#2d6296",
    tileDeep: "#14314f",
    line: "#c3e8ff",
    accent: "#4be3ff",
    mote: "#aad8ff",
    silhouette: "towers",
  },
  brown: {
    sky: ["#130b06", "#2a160c", "#40200f", "#1a0d07"],
    far: "#3a2314",
    mid: "#291808",
    near: "#1a0f06",
    tileTop: "#f0a45c",
    tileMid: "#8a5326",
    tileDeep: "#4a2a12",
    line: "#ffc98a",
    accent: "#ffb347",
    mote: "#ffb26b",
    silhouette: "pipes",
  },
  purple: {
    sky: ["#0b0518", "#1b0c33", "#2c1450", "#120726"],
    far: "#2a1450",
    mid: "#1b0d38",
    near: "#100722",
    tileTop: "#d38bff",
    tileMid: "#6b3aa0",
    tileDeep: "#341a52",
    line: "#e9c2ff",
    accent: "#ff6bd6",
    mote: "#e0a8ff",
    silhouette: "crystals",
  },
  violet: {
    sky: ["#0a0616", "#1a0f33", "#2a1a55", "#0f0822"],
    far: "#241452",
    mid: "#170d3a",
    near: "#0c0722",
    tileTop: "#a8a4ff",
    tileMid: "#4f4a96",
    tileDeep: "#251f4f",
    line: "#d3d0ff",
    accent: "#7af6c8",
    mote: "#c0b8ff",
    silhouette: "spires",
  },
  gray: {
    sky: ["#08090c", "#141820", "#20262f", "#0a0c12"],
    far: "#1d232d",
    mid: "#141a23",
    near: "#0b0f16",
    tileTop: "#b9c6d8",
    tileMid: "#5c6a7d",
    tileDeep: "#2e3743",
    line: "#dfe8f5",
    accent: "#4be3ff",
    mote: "#c2cfe0",
    silhouette: "ruins",
  },
  pink: {
    sky: ["#16060f", "#2c0d24", "#48163a", "#1d0719"],
    far: "#48183c",
    mid: "#320f2a",
    near: "#1e0819",
    tileTop: "#ffa8d4",
    tileMid: "#a04a7c",
    tileDeep: "#521f3c",
    line: "#ffd0e6",
    accent: "#ffd166",
    mote: "#ffb6da",
    silhouette: "petals",
  },
  yellow: {
    sky: ["#150f03", "#2d2108", "#4a360d", "#1c1404"],
    far: "#4a3610",
    mid: "#33240a",
    near: "#201606",
    tileTop: "#ffdd7a",
    tileMid: "#a37a26",
    tileDeep: "#533c12",
    line: "#fff0b8",
    accent: "#ff9f45",
    mote: "#ffe08a",
    silhouette: "dunes",
  },
  cyan: {
    sky: ["#031015", "#062530", "#0a3a4a", "#04161d"],
    far: "#0a3b4c",
    mid: "#062834",
    near: "#03161d",
    tileTop: "#8ef6ff",
    tileMid: "#28909f",
    tileDeep: "#0f3f49",
    line: "#c8fbff",
    accent: "#4be3ff",
    mote: "#a5f0ff",
    silhouette: "spires",
  },
};

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function palette(theme) {
  return PALETTES[theme] || PALETTES.green;
}

function drawSilhouetteLayer(ctx, style, color, camX, factor, baseY, unit, height) {
  const offset = camX * factor;
  const startIndex = Math.floor(offset / unit) - 1;
  const count = Math.ceil(VIEW_W / unit) + 4;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const idx = startIndex + i;
    const x = Math.round(idx * unit - offset);
    const r = hash(idx * 2.31 + factor * 19.7);
    const r2 = hash(idx * 5.13 + 7.7);

    if (style === "towers") {
      const w = Math.round(unit * (0.34 + r * 0.3));
      const h = Math.round(height * (0.45 + r2 * 0.75));
      ctx.fillRect(x, baseY - h, w, h);
      ctx.fillRect(x + Math.floor(w * 0.42), baseY - h - 6, 2, 6);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ffffff";
      for (let k = 1; k < 4; k += 1) {
        if (h > k * 18) ctx.fillRect(x + 4, baseY - h + k * 16, 2, 3);
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
    } else if (style === "crystals" || style === "spires") {
      const w = unit * (0.3 + r * 0.28);
      const h = height * (0.5 + r2 * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w / 2, baseY - h);
      ctx.lineTo(x + w, baseY);
      ctx.closePath();
      ctx.fill();
      if (style === "spires") {
        ctx.fillRect(x + w / 2 - 1, baseY - h - 8, 2, 8);
      }
    } else if (style === "pipes") {
      const w = Math.round(unit * (0.28 + r * 0.22));
      const h = Math.round(height * (0.4 + r2 * 0.6));
      ctx.fillRect(x, baseY - h, w, h);
      ctx.fillRect(x - 2, baseY - h - 5, w + 4, 5);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + w - 4, baseY - h, 2, h);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
    } else if (style === "ruins") {
      const w = unit * (0.36 + r * 0.3);
      const h = height * (0.35 + r2 * 0.7);
      ctx.fillRect(x, baseY - h, w, h);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + w * 0.3, baseY - h + 6, w * 0.36, 8);
      ctx.fillRect(x + w * 0.3, baseY - h + 22, w * 0.36, 8);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
    } else if (style === "dunes") {
      ctx.beginPath();
      ctx.moveTo(x - unit * 0.2, baseY);
      ctx.quadraticCurveTo(x + unit * 0.5, baseY - height * (0.35 + r2 * 0.5), x + unit * 1.2, baseY);
      ctx.lineTo(x + unit * 1.2, baseY + 40);
      ctx.lineTo(x - unit * 0.2, baseY + 40);
      ctx.closePath();
      ctx.fill();
    } else if (style === "petals") {
      const w = unit * (0.3 + r * 0.2);
      const h = height * (0.35 + r2 * 0.5);
      ctx.beginPath();
      ctx.ellipse(x + w / 2, baseY - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const h = height * (0.4 + r2 * 0.7);
      ctx.beginPath();
      ctx.moveTo(x - unit * 0.2, baseY);
      ctx.quadraticCurveTo(x + unit * 0.45, baseY - h, x + unit * 1.1, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawBackdropMotif(ctx, engine, pal) {
  const { camera, time, level } = engine;
  const style = level.backdrop || level.theme;
  ctx.save();

  if (style === "ash" || style === "brown") {
    for (let i = 0; i < 20; i += 1) {
      const x = ((i * 83 + time * (8 + i % 4 * 3)) % (VIEW_W + 20)) - 10;
      const y = VIEW_H - (((i * 39 + time * (12 + i % 3 * 5)) % (VIEW_H + 35)));
      const pulse = 0.35 + (Math.sin(time * 3 + i) + 1) * 0.22;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = i % 4 === 0 ? "#ffe08a" : "#ff7043";
      ctx.fillRect(Math.round(x), Math.round(y), i % 3 === 0 ? 2 : 1, 2);
    }
  } else if (style === "prism" || style === "purple" || style === "violet") {
    for (let i = 0; i < 8; i += 1) {
      const x = ((i * 113 - camera.x * 0.09 + VIEW_W) % (VIEW_W + 110)) - 55;
      const height = 45 + hash(i * 3.1) * 70;
      const drift = Math.sin(time * 0.7 + i) * 5;
      ctx.globalAlpha = style === "prism" ? 0.055 : 0.035;
      ctx.fillStyle = ["#ff6bd6", "#4be3ff", "#c084fc", "#7af6c8"][i % 4];
      ctx.beginPath();
      ctx.moveTo(x, 180);
      ctx.lineTo(x + 20 + drift, 180 - height);
      ctx.lineTo(x + 65, 180);
      ctx.closePath();
      ctx.fill();
    }
  } else if (style === "tempest" || style === "cyan" || style === "blue") {
    ctx.globalAlpha = style === "tempest" ? 0.17 : 0.07;
    ctx.strokeStyle = style === "tempest" ? "#c8fbff" : pal.accent;
    ctx.lineWidth = 1;
    for (let i = 0; i < (style === "tempest" ? 12 : 6); i += 1) {
      const x = ((i * 97 + time * (25 + (i % 3) * 10)) % (VIEW_W + 100)) - 50;
      const y = 28 + ((i * 37) % 135);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 28, y + 4);
      ctx.lineTo(x - 57, y + 1);
      ctx.stroke();
    }
    if (style === "tempest" && Math.sin(time * 0.55) > 0.94) {
      const boltX = 70 + hash(Math.floor(time * 2)) * (VIEW_W - 140);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#e8fdff";
      ctx.beginPath();
      ctx.moveTo(boltX, 20);
      ctx.lineTo(boltX - 10, 45);
      ctx.lineTo(boltX + 4, 58);
      ctx.lineTo(boltX - 14, 84);
      ctx.stroke();
    }
  } else if (style === "undertow" || style === "yellow") {
    if (style === "undertow") {
      for (let i = 0; i < 15; i += 1) {
        const x = ((i * 71 + Math.sin(time * 0.8 + i) * 10) % VIEW_W);
        const y = 42 + ((i * 47 - time * (5 + i % 3 * 3) + 300) % 145);
        ctx.globalAlpha = 0.1 + (i % 3) * 0.035;
        ctx.strokeStyle = "#d7fbff";
        ctx.beginPath();
        ctx.arc(x, y, 2 + i % 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = pal.accent;
      for (let row = 0; row < 4; row += 1) {
        ctx.beginPath();
        for (let x = 0; x <= VIEW_W; x += 16) {
          const y = 150 + row * 22 + Math.sin(x * 0.018 + time * 0.6 + row) * 5;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  } else if (style === "frost") {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#b7fbff";
    ctx.lineWidth = 5;
    for (let band = 0; band < 3; band += 1) {
      ctx.beginPath();
      for (let x = -20; x <= VIEW_W + 20; x += 24) {
        const y = 62 + band * 19 + Math.sin(x * 0.009 + time * 0.45 + band * 2) * 12;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#e3fbff";
    for (let i = 0; i < 26; i += 1) {
      const x = (i * 59 + Math.sin(time + i) * 8) % VIEW_W;
      const y = (i * 43 + time * (12 + i % 5 * 4)) % 190;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 2);
    }
  } else if (style === "dusk" || style === "gray" || style === "eclipse") {
    const cx = VIEW_W * 0.72 - camera.x * 0.025;
    const cy = 76;
    ctx.globalAlpha = style === "dusk" ? 0.2 : 0.12;
    ctx.strokeStyle = style === "eclipse" ? "#ffe08a" : style === "dusk" ? "#b8a8ff" : "#dfe8f5";
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34 + ring * 12, 11 + ring * 5, time * 0.08 * (ring % 2 ? -1 : 1), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (style === "dusk" || style === "eclipse") {
      const pulse = 1 + Math.sin(time * 0.8) * 0.04;
      const halo = ctx.createRadialGradient(cx, cy, 12, cx, cy, 58 * pulse);
      halo.addColorStop(0, style === "eclipse" ? "rgba(255,224,138,0.2)" : "rgba(173,125,255,0.12)");
      halo.addColorStop(1, style === "eclipse" ? "rgba(255,90,120,0)" : "rgba(173,125,255,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.fillRect(cx - 65, cy - 65, 130, 130);
      if (style === "eclipse") {
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = "#080713";
        ctx.beginPath();
        ctx.arc(cx, cy, 18 + Math.sin(time * 1.1) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === "solar" || style === "pink") {
    const cx = VIEW_W * 0.76 - camera.x * 0.035;
    const cy = 68 + Math.sin(time * 0.35) * 4;
    const radius = style === "solar" ? 26 : 17;
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 3.5);
    glow.addColorStop(0, style === "solar" ? "rgba(255,224,138,0.35)" : "rgba(255,116,198,0.18)");
    glow.addColorStop(1, "rgba(255,80,140,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(cx - radius * 4, cy - radius * 4, radius * 8, radius * 8);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = style === "solar" ? "#ffe08a" : "#ffb6da";
    for (let ring = 1; ring <= 3; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * (1.5 + ring * 0.45), radius * (0.42 + ring * 0.12), -0.25, time * 0.05, time * 0.05 + Math.PI * 1.55);
      ctx.stroke();
    }
  } else if (style === "green") {
    for (let i = 0; i < 9; i += 1) {
      const x = (i * 101 - camera.x * 0.06 + VIEW_W) % (VIEW_W + 40) - 20;
      ctx.globalAlpha = 0.035 + (Math.sin(time + i) + 1) * 0.018;
      ctx.fillStyle = i % 2 ? "#b7ffd5" : "#fff0a6";
      ctx.beginPath();
      ctx.moveTo(x, 190);
      ctx.lineTo(x - 11, 18);
      ctx.lineTo(x + 11, 18);
      ctx.lineTo(x + 24, 190);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawBackground(ctx, engine) {
  const { camera, time, level } = engine;
  const pal = palette(level.theme);

  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, pal.sky[0]);
  sky.addColorStop(0.45, pal.sky[1]);
  sky.addColorStop(0.78, pal.sky[2]);
  sky.addColorStop(1, pal.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const glowX = VIEW_W * 0.72 - ((camera.x * 0.04) % VIEW_W);
  const glow = ctx.createRadialGradient(glowX, 54, 4, glowX, 54, 140);
  glow.addColorStop(0, "rgba(255,255,255,0.22)");
  glow.addColorStop(0.45, pal.accent);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = glow;
  ctx.fillRect(glowX - 150, -80, 300, 260);
  ctx.globalAlpha = 1;

  for (let i = 0; i < 26; i += 1) {
    const sx = ((i * 137 + 41) % VIEW_W) - camera.x * 0.03;
    const wrapped = ((sx % VIEW_W) + VIEW_W) % VIEW_W;
    const sy = 12 + ((i * 53) % 120);
    ctx.globalAlpha = 0.5 + Math.sin(time * 2 + i) * 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(wrapped), sy, 1, 1);
  }
  ctx.globalAlpha = 1;

  // distant mountain range
  const rangeY = 172;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pal.far;
  ctx.beginPath();
  ctx.moveTo(0, rangeY);
  for (let i = 0; i <= 26; i += 1) {
    const px = (i / 26) * VIEW_W;
    const peak = rangeY - 24 - hash(i * 3.7) * 46;
    ctx.lineTo(px, peak);
    ctx.lineTo(px + VIEW_W / 52, rangeY);
  }
  ctx.lineTo(VIEW_W, rangeY + 80);
  ctx.lineTo(0, rangeY + 80);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // drifting cloud sprites (Cloudy Pack art, three parallax depths)
  const cloudSet = THEME_CLOUDS[level.theme] || "pale";
  for (let i = 0; i < 7; i += 1) {
    const img = engine.assets?.[`cloud_${cloudSet}_${i % 2}`];
    if (!img || !img.width) continue;
    const depth = 0.04 + (i % 3) * 0.035;
    const scale = 1.4 + (i % 3) * 0.6;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const span = VIEW_W + w;
    const drift = (((i * 197 - camera.x * depth + time * (6 + (i % 3) * 4)) % span) + span) % span;
    const cx = Math.round(drift - w);
    const cy = Math.round(8 + ((i * 37) % 118) - camera.y * depth);
    ctx.globalAlpha = 0.34 + (i % 3) * 0.12;
    ctx.drawImage(img, cx, cy, w, h);
  }
  ctx.globalAlpha = 1;

  drawBackdropMotif(ctx, engine, pal);

  drawSilhouetteLayer(ctx, pal.silhouette, pal.far, camera.x, 0.12, 196, 96, 82);
  ctx.globalAlpha = 0.9;
  drawSilhouetteLayer(ctx, pal.silhouette, pal.mid, camera.x, 0.26, 222, 66, 62);
  ctx.globalAlpha = 1;
  drawSilhouetteLayer(ctx, pal.silhouette, pal.near, camera.x, 0.44, 250, 46, 44);

  const haze = ctx.createLinearGradient(0, 150, 0, VIEW_H);
  haze.addColorStop(0, "rgba(0,0,0,0)");
  haze.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 150, VIEW_W, VIEW_H - 150);

  for (let i = 0; i < 22; i += 1) {
    const speed = 8 + (i % 5) * 4;
    const px = ((i * 91 + time * speed) % (VIEW_W + 30)) - 15;
    const py = ((i * 47 + Math.sin(time * 0.8 + i) * 14 + time * speed * 0.4) % (VIEW_H + 20)) - 10;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = pal.mote;
    ctx.fillRect(Math.round(px), Math.round(py), 1, 2);
  }
  ctx.globalAlpha = 1;
}

export function drawTerrain(ctx, engine) {
  const { world, camera, level } = engine;
  const pal = palette(level.theme);
  const startX = Math.max(0, Math.floor(camera.x / TILE) - 1);
  const endX = Math.min(level.width, startX + Math.ceil(VIEW_W / TILE) + 3);

  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = startX; tx < endX; tx += 1) {
      if (!world.solid(tx, ty)) continue;
      if (world.door && world.door.closed && tx === world.door.x) continue;
      const px = tx * TILE - camera.x;
      const py = ty * TILE;
      const up = world.solid(tx, ty - 1);
      const down = world.solid(tx, ty + 1);
      const left = world.solid(tx - 1, ty);
      const right = world.solid(tx + 1, ty);

      ctx.fillStyle = down ? pal.tileDeep : pal.tileMid;
      ctx.fillRect(px, py, TILE, TILE);

      if (!down) {
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(px, py + TILE - 3, TILE, 3);
      }
      if (!up) {
        ctx.fillStyle = pal.tileTop;
        ctx.fillRect(px, py, TILE, 4);
        ctx.fillStyle = pal.line;
        ctx.fillRect(px, py, TILE, 1);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = pal.line;
        ctx.fillRect(px, py + 4, TILE, 1);
        ctx.globalAlpha = 1;

        // surface dressing: grass blades, glowing crystals, tiny flowers
        const flora = hash(tx * 3.7 + ty * 9.1);
        if (flora > 0.52) {
          const h = 3 + Math.floor(flora * 5);
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = pal.line;
          ctx.fillRect(px + 4, py - h, 1, h);
          ctx.fillRect(px + 7, py - h + 1, 1, h - 1);
          ctx.fillRect(px + 10, py - h + 2, 1, h - 2);
          ctx.globalAlpha = 1;
        } else if (flora > 0.4) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = pal.accent;
          ctx.fillRect(px + 6, py - 5, 3, 2);
          ctx.fillRect(px + 11, py - 4, 2, 2);
          ctx.globalAlpha = 1;
        }
      }
      if (!left) {
        ctx.fillStyle = pal.tileMid;
        ctx.fillRect(px, py, 2, TILE);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(px, py, 1, TILE);
      }
      if (!right) {
        ctx.fillStyle = pal.tileMid;
        ctx.fillRect(px + TILE - 2, py, 2, TILE);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(px + TILE - 1, py, 1, TILE);
      }

      const n = hash(tx * 7.3 + ty * 13.1);
      if (n > 0.68) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 3 + Math.floor(n * 8), py + 6 + Math.floor(n * 6), 2, 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  engine.movers.forEach((mover) => {
    const px = Math.round(mover.x - camera.x);
    const py = Math.round(mover.y);
    if (mover.bossHazard) {
      ctx.save();
      ctx.shadowColor = mover.spikeActive ? "#ff9f45" : "#4be3ff";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#07101d";
      ctx.fillRect(px - 3, py - 4, mover.w + 6, mover.h + 8);
      ctx.shadowBlur = 0;
      const core = ctx.createLinearGradient(0, py, 0, py + mover.h);
      core.addColorStop(0, "#d8fbff");
      core.addColorStop(0.25, mover.spikeActive ? "#ff9f45" : "#4be3ff");
      core.addColorStop(1, "#17385a");
      ctx.fillStyle = core;
      ctx.fillRect(px, py, mover.w, mover.h);
      ctx.fillStyle = "#f4feff";
      ctx.fillRect(px + 3, py + 1, mover.w - 6, 1);
      ctx.fillStyle = mover.spikeActive ? "#fff0ce" : "#a8f4ff";
      const pulse = 0.65 + Math.sin(engine.time * 8 + mover.phase) * 0.25;
      ctx.globalAlpha = pulse;
      for (let i = 5; i < mover.w - 4; i += 12) {
        ctx.fillRect(px + i, py + 4, 5, 2);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = mover.spikeActive ? "#ffd166" : "#b9f8ff";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, mover.w - 1, mover.h - 1);
      ctx.restore();
      return;
    }
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(px - 2, py - 2, mover.w + 4, mover.h + 4);
    const grad = ctx.createLinearGradient(0, py, 0, py + mover.h);
    grad.addColorStop(0, pal.tileTop);
    grad.addColorStop(0.45, pal.tileMid);
    grad.addColorStop(1, pal.tileDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, mover.w, mover.h);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(px, py, mover.w, 1);
    ctx.fillStyle = pal.accent;
    const dir = mover.axis === "x" ? 1 : 0;
    for (let i = 6; i < mover.w - 6; i += 10) {
      if (dir) ctx.fillRect(px + i, py + 3, 4, 1);
      else ctx.fillRect(px + i, py + 3, 1, 3);
    }
  });
}

export function drawDoor(ctx, engine) {
  const { world, camera, doorProgress } = engine;
  if (!world.door) return;
  const { x, y, h } = world.door;
  const px = x * TILE - camera.x;
  const top = y * TILE;
  const height = h * TILE;
  const closed = doorProgress;
  ctx.save();
  ctx.fillStyle = "rgba(75,227,255,0.12)";
  ctx.fillRect(px - 1, top, TILE + 2, height);
  if (closed > 0.01) {
    const panelH = height * closed;
    const width = TILE + 4;
    const x0 = px - 2;
    const gradient = ctx.createLinearGradient(x0, 0, x0 + width, 0);
    gradient.addColorStop(0, "#151a30");
    gradient.addColorStop(0.35, "#3d4870");
    gradient.addColorStop(0.7, "#242b4a");
    gradient.addColorStop(1, "#0d1224");
    ctx.fillStyle = gradient;
    ctx.fillRect(x0, top, width, panelH);
    ctx.fillStyle = "rgba(75,227,255,0.5)";
    for (let sy = top + 5; sy < top + panelH - 4; sy += 12) {
      ctx.fillRect(x0 + 2, sy, width - 4, 1);
    }
    ctx.fillStyle = "#0a0e1c";
    ctx.fillRect(x0, top, width, 3);
    if (closed > 0.9) {
      ctx.fillStyle = "#ff3d8b";
      ctx.fillRect(x0 - 1, top + panelH - 3, width + 2, 3);
      ctx.globalAlpha = 0.35 + Math.sin(engine.time * 8) * 0.3;
      ctx.fillStyle = "#ff3d8b";
      ctx.fillRect(x0 - 3, top + 4, 2, panelH - 8);
      ctx.fillRect(x0 + width + 1, top + 4, 2, panelH - 8);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function drawSpikeStrip(ctx, x, baseY, w, alpha, color) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#05060d";
  ctx.fillRect(x, baseY - 2, w, 3);
  ctx.fillStyle = color;
  for (let i = 0; i < w - 1; i += 9) {
    ctx.beginPath();
    ctx.moveTo(x + i, baseY + 1);
    ctx.lineTo(x + i + 4.5, baseY - 12);
    ctx.lineTo(x + i + 9, baseY + 1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < w - 1; i += 9) ctx.fillRect(x + i + 4, baseY - 10, 1, 4);
  ctx.globalAlpha = 1;
}

export function drawHazards(ctx, engine) {
  const { camera, spikes, saws, time, traps, movers } = engine;
  const pal = palette(engine.level.theme);

  spikes.forEach((spike) => {
    drawSpikeStrip(ctx, spike.x - camera.x, spike.baseY, spike.w, 1, "#ff6b6b");
  });

  traps.forEach((trap) => {
    const x = trap.x - camera.x;
    const rising = Math.max(0, trap.anim);
    // base stays welded to the floor; only the blades travel
    const baseY = trap.baseY + (1 - rising) * 11;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#05060d";
    ctx.fillRect(x, trap.baseY - 2, trap.w, 3);
    ctx.globalAlpha = 1;
    if (rising > 0.05) {
      const warn = trap.active && trap.anim < 0.55;
      const blink = warn && Math.floor(time * 12) % 2 === 0;
      drawSpikeStrip(ctx, x, baseY, trap.w, rising * (blink ? 0.55 : 1), blink ? "#ffd166" : pal.accent === "#ffd166" ? "#ff9f45" : "#ff6b6b");
    }
  });

  movers.filter((mover) => mover.bossHazard && mover.spikeActive).forEach((mover) => {
    drawSpikeStrip(ctx, mover.x - camera.x, mover.y, mover.w, 1, "#ff9f45");
  });

  saws.forEach((saw) => {
    const cx = Math.round(saw.cx - camera.x);
    const cy = Math.round(saw.cy);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 9);
    ctx.fillStyle = "#b9c3d8";
    for (let i = 0; i < 10; i += 1) {
      ctx.rotate((Math.PI * 2) / 10);
      ctx.beginPath();
      ctx.moveTo(-4, -saw.r - 3);
      ctx.lineTo(4, -saw.r - 3);
      ctx.lineTo(0, -saw.r + 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, saw.r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = "#6b7893";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, saw.r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#2a3048";
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

function drawShardShape(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.72, cy - size * 0.32);
  ctx.lineTo(cx + size * 0.58, cy + size * 0.62);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.58, cy + size * 0.62);
  ctx.lineTo(cx - size * 0.72, cy - size * 0.32);
  ctx.closePath();
}

function drawStarShape(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? size : size * 0.46;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawShards(ctx, engine) {
  const { camera, time, shardEntities, level, grandGem } = engine;
  const accent = level.accent || "#4be3ff";
  shardEntities.forEach((shard) => {
    if (shard.taken) return;
    const bob = Math.sin(time * 3 + shard.bob) * 3;
    const cx = Math.round(shard.x - camera.x);
    const cy = Math.round(shard.y + bob);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(time * 1.4 + shard.bob) * 0.12);
    ctx.translate(-cx, -cy);
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    (level.starCurrency ? drawStarShape : drawShardShape)(ctx, cx, cy, 10);
    ctx.fillStyle = "#f4fbff";
    ctx.fill();
    ctx.shadowBlur = 0;
    (level.starCurrency ? drawStarShape : drawShardShape)(ctx, cx, cy, 7);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 2, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 2, cy);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.72;
    ctx.fill();
    ctx.restore();
  });

  if (grandGem?.visible && !grandGem.taken) {
    const cx = Math.round(grandGem.x - camera.x);
    const cy = Math.round(grandGem.y + Math.sin(time * 3) * 3);
    ctx.save();
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 24;
    drawShardShape(ctx, cx, cy, 15);
    ctx.fillStyle = "#fff6c9";
    ctx.fill();
    ctx.shadowBlur = 0;
    drawShardShape(ctx, cx, cy, 10);
    ctx.fillStyle = "#ffd166";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }
}

export function drawItems(ctx, engine) {
  const { assets, camera, checkpoints, level, exitActive, time } = engine;

  checkpoints.forEach((cp) => {
    const size = 44;
    const x = Math.round(cp.x - camera.x - size / 2);
    const y = Math.round(cp.y - size);
    const img = cp.active ? assets.checkpoint_on : assets.checkpoint_off;
    if (img && cp.active) {
      const frame = Math.min(25, Math.floor(cp.anim * 26));
      ctx.drawImage(img, frame * 64, 0, 64, 64, x, y, size, size);
    } else if (img) {
      ctx.drawImage(img, x, y, size, size);
    }
    if (cp.active) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(time * 3) * 0.08;
      const glow = ctx.createRadialGradient(cp.x - camera.x, cp.y - size / 2, 2, cp.x - camera.x, cp.y - size / 2, 40);
      glow.addColorStop(0, "#4be3ff");
      glow.addColorStop(1, "rgba(75,227,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cp.x - camera.x - 40, cp.y - size / 2 - 40, 80, 80);
      ctx.restore();
    }
  });

  const centerX = Math.round(level.exit[0] * TILE - camera.x);
  const baseY = Math.round(level.exit[1] * TILE);
  const topY = baseY - 64;
  const accent = level.accent || "#4be3ff";
  ctx.save();
  const pulse = 0.72 + Math.sin(time * 3.4) * 0.2;
  ctx.globalAlpha = exitActive ? 0.34 + pulse * 0.3 : 0.1;
  const glow = ctx.createRadialGradient(centerX, baseY - 31, 2, centerX, baseY - 31, 76);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(centerX - 76, topY - 22, 152, 100);

  ctx.globalAlpha = exitActive ? 1 : 0.46;
  ctx.shadowColor = accent;
  ctx.shadowBlur = exitActive ? 18 + pulse * 12 : 0;
  ctx.beginPath();
  ctx.moveTo(centerX - 29, baseY);
  ctx.lineTo(centerX - 29, baseY - 38);
  ctx.quadraticCurveTo(centerX - 29, topY, centerX, topY);
  ctx.quadraticCurveTo(centerX + 29, topY, centerX + 29, baseY - 38);
  ctx.lineTo(centerX + 29, baseY);
  ctx.closePath();
  ctx.fillStyle = "#080d1a";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.ellipse(centerX, baseY - 34, 17 + pulse * 2, 26 + pulse * 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = exitActive ? `${accent}55` : "#111629";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = exitActive ? "#f4fbff" : "#596078";
  ctx.globalAlpha = exitActive ? 0.6 + pulse * 0.3 : 0.3;
  ctx.stroke();

  ctx.globalAlpha = exitActive ? 0.9 : 0.55;
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - 36, baseY - 8, 7, 8);
  ctx.fillRect(centerX + 29, baseY - 8, 7, 8);
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(exitActive ? "GOAL" : "SEALED", centerX, topY - 9);
  ctx.restore();
}

export function drawEnemies(ctx, engine) {
  const { assets, camera, enemies } = engine;
  // only paint what the camera can actually see — long stages hold a lot of bots
  const cullLeft = camera.x - 64;
  const cullRight = camera.x + VIEW_W + 64;
  enemies.forEach((enemy) => {
    if (enemy.remove) return;
    if (enemy.x + enemy.w < cullLeft || enemy.x > cullRight) return;
    const size = 34;
    const dx = Math.round(enemy.x + enemy.w / 2 - size / 2 - camera.x);
    const dy = Math.round(enemy.y + enemy.h - size);
    ctx.save();
    if (enemy.flash > 0) ctx.globalAlpha = 0.75;
    if (enemy.dying) {
      ctx.globalAlpha = Math.max(0, 1 - enemy.deathTimer / 0.7);
      drawEnemyAnim(ctx, assets, "death", enemy.deathTimer, dx - 5, dy - 12, size + 10, size + 14, enemy.dir < 0, enemy.variantStyle);
    } else {
      const enemyAnim = enemy.flash > 0 || enemy.hitStun > 0
        ? "hurt"
        : enemy.onGround ? "run" : "jump";
      drawEnemyAnim(ctx, assets, enemyAnim, enemy.animTime, dx, dy, size, size, enemy.dir < 0, enemy.variantStyle);
    }
    if (enemy.invulnerable) {
      ctx.globalAlpha = 0.78 + Math.sin(enemy.animTime * 12) * 0.18;
      ctx.strokeStyle = enemy.variantStyle.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dx + size / 2, dy + size / 2, size * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.shieldHp > 0) {
      ctx.globalAlpha = 0.7 + Math.sin(enemy.animTime * 8) * 0.2;
      ctx.strokeStyle = enemy.variantStyle.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = (Math.PI / 3) * point - Math.PI / 6;
        const px = dx + size / 2 + Math.cos(angle) * size * 0.58;
        const py = dy + size / 2 + Math.sin(angle) * size * 0.58;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    if (enemy.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(dx + 4, dy + 4, size - 8, size - 8);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();

    if (!enemy.dying) {
      const pct = Math.max(0, enemy.hp / enemy.maxHp);
      const bw = 30;
      const bx = Math.round(enemy.x + enemy.w / 2 - bw / 2 - camera.x);
      const by = Math.round(enemy.y - 10 - (enemy.shieldHp > 0 ? 5 : 0));
      ctx.fillStyle = "#05060d";
      ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
      ctx.fillStyle = "#242a48";
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = enemy.variant === "standard"
        ? pct > 0.5 ? "#7af6c8" : pct > 0.25 ? "#ffd166" : "#ff3d8b"
        : enemy.variantStyle.accent;
      ctx.fillRect(bx, by, Math.max(1, Math.round(bw * pct)), 3);
      if (enemy.maxShieldHp > 0 && enemy.shieldHp > 0) {
        const shieldY = by - 5;
        ctx.fillStyle = "#05060d";
        ctx.fillRect(bx - 1, shieldY - 1, bw + 2, 5);
        ctx.fillStyle = "#173b50";
        ctx.fillRect(bx, shieldY, bw, 3);
        ctx.fillStyle = enemy.variantStyle.accent;
        ctx.fillRect(bx, shieldY, Math.max(1, Math.round(bw * enemy.shieldHp / enemy.maxShieldHp)), 3);
      }
    }
  });
}

export function drawBoss(ctx, engine) {
  const { boss, assets, camera, time } = engine;
  if (!boss || boss.state === "dead") return;
  const size = boss.h;
  const dx = Math.round(boss.x + boss.w / 2 - size / 2 - camera.x);
  const dy = Math.round(boss.y + boss.h - size + 6);

  const p2 = boss.phaseTwo || boss.phase === 2;
  const p3 = boss.phaseThree || boss.phase === 3;
  const auraColor = p3 ? "rgba(126,72,255,0.92)" : p2 ? "rgba(255,122,61,0.9)" : "rgba(255,61,139,0.8)";
  const edgeColor = p3 ? "#7af6c8" : p2 ? "#ff9f45" : "#ff3d8b";
  const charge = boss.state === "telegraph";
  ctx.save();
  ctx.globalAlpha = charge ? 0.8 : p3 ? 0.7 : p2 ? 0.55 : 0.35;
  const aura = ctx.createRadialGradient(dx + size / 2, dy + size / 2, 4, dx + size / 2, dy + size / 2, size * (p3 ? 1.1 : p2 ? 0.85 : 0.7));
  aura.addColorStop(0, auraColor);
  aura.addColorStop(1, p3 ? "rgba(122,246,200,0)" : "rgba(255,61,139,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(dx - 24, dy - 24, size + 48, size + 48);
  if (charge) {
    ctx.globalAlpha = 0.45 + Math.sin(time * 32) * 0.25;
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dx + size / 2, dy + size / 2, size * (0.55 + Math.sin(time * 24) * 0.035), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (charge && boss.next === "dash") {
    const facing = boss.facing || 1;
    const startX = dx + size / 2 + facing * size * 0.42;
    const endX = startX + facing * 104;
    const groundY = dy + size - 5;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 32) * 0.3;
    ctx.strokeStyle = edgeColor;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, groundY);
    ctx.lineTo(endX, groundY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, groundY);
    ctx.lineTo(endX - facing * 11, groundY - 7);
    ctx.lineTo(endX - facing * 11, groundY + 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // phase-two halo: a second, rotating ring of shards
  if (p2) {
    ctx.save();
    ctx.translate(dx + size / 2, dy + size / 2);
    ctx.rotate(time * 1.4);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = p3 ? "#7af6c8" : "#ff9f45";
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate((Math.PI * 2) / 8);
      ctx.fillRect(size * 0.52, -2, 7, 4);
    }
    ctx.restore();
  }
  if (p3) {
    ctx.save();
    ctx.translate(dx + size / 2, dy + size / 2);
    ctx.rotate(-time * 2.1);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "#b28cff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.82, size * 0.42, Math.sin(time * 2) * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  let anim = "idle";
  if (boss.hitReact > 0) anim = "hurt";
  if (boss.state === "dash" || boss.state === "spread") anim = "run";
  if (boss.state === "leap" || !boss.onGround) anim = "jump";

  ctx.save();
  if (boss.ultimate) ctx.filter = p3 ? "hue-rotate(105deg) saturate(1.8)" : "hue-rotate(72deg) saturate(1.55)";
  if (boss.state === "telegraph") ctx.globalAlpha = 0.65 + Math.sin(time * 40) * 0.35;
  if (boss.state === "dash") {
    ctx.globalAlpha *= 0.18;
    drawEnemyAnim(ctx, assets, anim, boss.animTime, dx - boss.facing * 20, dy, size, size, boss.facing > 0);
    ctx.globalAlpha *= 0.45;
    drawEnemyAnim(ctx, assets, anim, boss.animTime, dx - boss.facing * 10, dy, size, size, boss.facing > 0);
    ctx.globalAlpha = 1;
  }
  const recoil = boss.hitReact > 0 ? boss.hitReact / 0.16 : 0;
  ctx.translate(dx + size / 2 + boss.hitDirection * recoil * 5, dy + size / 2);
  ctx.scale(1 + recoil * 0.06, 1 - recoil * 0.1);
  drawEnemyAnim(ctx, assets, anim, boss.animTime, -size / 2, -size / 2, size, size, boss.facing > 0);
  if (boss.flash > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-size / 2 + 10, -size / 2 + 10, size - 20, size - 20);
  }
  ctx.restore();

  if (boss.exoshield) {
    ctx.save();
    ctx.globalAlpha = 0.65 + Math.sin(time * 9) * 0.2;
    ctx.strokeStyle = "#4be3ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(dx + size / 2, dy + size / 2, size * 0.6, size * 0.67, time * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (boss.active) {
    const barWidth = 76;
    const barX = Math.round(boss.x + boss.w / 2 - barWidth / 2 - camera.x);
    const barY = dy - 9;
    const health = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    ctx.save();
    ctx.fillStyle = "#05060d";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, 8);
    ctx.fillStyle = "#242a48";
    ctx.fillRect(barX, barY, barWidth, 4);
    ctx.fillStyle = p3 ? "#7af6c8" : boss.phaseTwo ? "#ff9f45" : "#ff3d8b";
    ctx.fillRect(barX, barY, Math.round(barWidth * health), 4);
    if (boss.exoshield) {
      ctx.strokeStyle = "#4be3ff";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, 6);
    }
    ctx.restore();
  }
}

export function drawPlayer(ctx, engine) {
  const { player, assets, camera, time, afterimages } = engine;
  if (player.dead) return;
  // Character sheets are authored on a 32px grid; drawing at native size
  // avoids resampling shimmer as the player moves across the pixel grid.
  const size = 32;
  const dx = Math.round(player.centerX - size / 2 - camera.x);
  const dy = Math.round(player.y + player.h - size);

  afterimages.forEach((ghost) => {
    ctx.globalAlpha = Math.max(0, ghost.life / 0.22) * 0.35;
    drawChar(
      ctx,
      assets,
      player.character,
      "run",
      ghost.age,
      Math.round(ghost.x + player.w / 2 - size / 2 - camera.x),
      Math.round(ghost.y + player.h - size),
      size,
      size,
      ghost.facing < 0,
      player.tint
    );
    ctx.globalAlpha = 1;
  });

  // Keep the character fully visible while invulnerable. The old pulsing
  // alpha made the sprite itself appear to flicker during every damage window.
  ctx.save();
  if (player.invuln > 0) {
    ctx.shadowColor = "#4be3ff";
    ctx.shadowBlur = 5;
  }
  const runRate = player.anim === "run" && player.onGround
    ? clamp(Math.abs(player.vx) / RUN_SPEED, 0.55, 1.25)
    : 1;
  drawChar(ctx, assets, player.character, player.anim, player.animTime * runRate, dx, dy, size, size, player.facing < 0, player.tint);
  ctx.restore();

  // The equipped pixel weapon is visible in hand and flashes when it fires.
  const weaponType = engine.weapons?.[engine.slot] || "buster";
  const info = WEAPONS[weaponType] || WEAPONS.buster;
  const dir = player.facing;
  const firing = player.fireAnim > 0;
  const weaponSheet = assets.weapon_sheet;
  ctx.save();
  ctx.translate(Math.round(player.centerX + dir * 6 - camera.x), Math.round(player.y + player.h * 0.46));
  ctx.scale(dir, 1);
  if (weaponSheet && info.sprite) {
    const [spriteCol, spriteRow] = info.sprite;
    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = info.color;
    ctx.shadowBlur = firing ? 12 : 3;
    ctx.drawImage(weaponSheet, spriteCol * 32, spriteRow * 32, 32, 32, -8, -15, firing ? 28 : 24, 24);
    ctx.shadowBlur = 0;
  } else {
    // Keep a readable fallback if the optional art sheet fails to load.
    ctx.fillStyle = info.color;
    ctx.fillRect(3, -2, firing ? 18 : 12, 4);
  }
  if (firing) {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#fff6c9";
    ctx.beginPath();
    ctx.arc(22, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawProjectiles(ctx, engine) {
  const { camera } = engine;
  engine.bullets.forEach((bullet) => drawBullet(ctx, bullet, camera.x, 0));
  engine.blades.forEach((blade) => drawBlade(ctx, blade, camera.x, 0));
  engine.explosions.forEach((explosion) => drawExplosion(ctx, explosion, camera.x, 0));
  engine.enemyBullets.forEach((bullet) => drawBullet(ctx, bullet, camera.x, 0));
  engine.shockwaves.forEach((wave) => {
    const x = Math.round(wave.x - camera.x);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, wave.life / 0.6));
    ctx.fillStyle = "#ff3d8b";
    ctx.beginPath();
    ctx.moveTo(x - wave.dir * wave.r, wave.y);
    ctx.lineTo(x, wave.y - wave.r);
    ctx.lineTo(x + wave.dir * wave.r, wave.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}
