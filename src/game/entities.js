/**
 * ============================================================================
 *  ENTITIES — everything that moves and fights: the weapon system, the player,
 *  the walking enemy and the Void Core boss. (Four former files, one place.)
 * ============================================================================
 *  SECTIONS:
 *    1. WEAPONS   firing behavior and projectile rendering
 *    2. PLAYER    movement, jumping, wall-slide, dash, glide, shooting, damage
 *    3. ENEMY     the patrolling robot
 *    4. BOSS      the Void Core at the end of Stage 10
 *
 *  TUNE: every number they use lives in core.js (section 1) — start there.
 *  Weapon damage/cooldown is at the top of the WEAPONS section below.
 * ============================================================================
 */
import {
  AIR_ACCEL,
  ACCEL,
  BOSS_DAMAGE,
  COYOTE,
  ENEMY_DAMAGE,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  FRICTION,
  GLIDE_SPEED,
  GRAVITY,
  GRAVITY_FALL,
  GRAVITY_RISE,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_V,
  MAX_FALL,
  MAX_HEALTH,
  PLAYER_H,
  PLAYER_W,
  RUN_SPEED,
  STOP_SPEED,
  TILE,
  TURN_ACCEL,
  WALL_JUMP_VX,
  WALL_JUMP_VY,
  WALL_SLIDE_SPEED,
  clamp,
  moveActorX,
  moveActorY,
  overlaps,
  sfx,
} from "./core";
import { WEAPONS } from "./weapons";

export const ENEMY_VARIANTS = {
  standard: {
    name: "Patroller",
    body: "#59616b",
    accent: "#c5b49b",
    speed: 64,
    maxHp: 110,
    description: "A fast patrol bot with reinforced plating. Defeat it to recover ammo.",
  },
  shielded: {
    name: "Phase Guard",
    body: "#704624",
    accent: "#e9a85d",
    speed: 58,
    maxHp: 150,
    contactMultiplier: 1.25,
    description: "Cycles between vulnerable and invincible phases, and hits harder on contact.",
  },
  flyer: {
    name: "Drifter",
    body: "#465263",
    accent: "#c4b99e",
    speed: 68,
    maxHp: 125,
    description: "A fast, durable flyer that patrols the upper route.",
  },
  armored: {
    name: "Bulwark",
    body: "#713d32",
    accent: "#d99b69",
    speed: 42,
    maxHp: 240,
    contactMultiplier: 2,
    description: "A heavily armored tank with high health and double contact damage.",
  },
  gunner: {
    name: "Marksman",
    body: "#596044",
    accent: "#c2b77b",
    speed: 50,
    maxHp: 150,
    contactMultiplier: 1.25,
    description: "Fires fast, high-damage aimed energy bolts from long range.",
  },
  exo: {
    name: "Exo Guard",
    body: "#244e62",
    accent: "#51e5ff",
    speed: 54,
    maxHp: 200,
    shieldHp: 160,
    contactMultiplier: 1.5,
    description: "An exo shield absorbs every hit until it breaks; only then can its health be damaged.",
  },
};

// ---------------------------------------------------------------------------
//  1. WEAPONS
//  COOLDOWN = seconds between shots (lower = faster).
//  Damage/speed numbers are inside fireWeapon() below.
// ---------------------------------------------------------------------------

export const COOLDOWN = Object.fromEntries(Object.values(WEAPONS).map((w) => [w.id, w.cooldown]));

/**
 * Build one shot for a weapon.
 *  mult      → dual-wield damage bonus (1.3 when both slots match)
 *  overdrive → secret-stage ability, a flat +15%
 */
export function fireWeapon(type, player, { overdrive = false, mult = 1 } = {}) {
  const def = WEAPONS[type] || WEAPONS.buster;
  const facing = player.facing || 1;
  const originX = player.centerX + facing * 10;
  const originY = player.y + player.h * 0.45;
  const overdriveRank = Number(overdrive) || (overdrive ? 1 : 0);
  const boost = overdriveRank >= 2 ? 1.2 : overdriveRank ? 1.1 : 1;
  const damage = Math.round(def.damage * mult * boost);

  if (def.category === "melee") {
    // Melee reach is deliberately LONGER than before: blade/lance swipes clip
    // enemies standing a couple of tiles away, but never as far as a mid-range
    // projectile (plasma flies 200px, the widest blade reaches 92px).
    const reach = (def.reach || 68) + (player.character === "pm" ? 8 : 0);
    const hitbox = {
      x: facing > 0 ? player.x + player.w - 4 : player.x - reach + 4,
      y: player.y - 10,
      w: reach,
      h: player.h + 22,
    };
    return {
      kind: "blade",
      weapon: def.id,
      hitbox,
      life: 0.22,
      max: 0.22,
      facing,
      damage,
      originX,
      originY,
      color: def.color,
    };
  }

  if (def.id === "cyclone") {
    return {
      kind: "boomerang",
      weapon: "cyclone",
      x: player.x + (facing > 0 ? player.w : -12),
      y: player.y + player.h * 0.45 - 8,
      w: 16,
      h: 16,
      vx: facing * 390,
      vy: 0,
      speed: 390,
      returnSpeed: 460,
      maxDistance: 260,
      travelled: 0,
      returning: false,
      life: 2.2,
      facing,
      pierce: true,
      hits: new Set(),
      damage,
      color: def.color,
    };
  }

  if (def.id === "seeker") {
    return {
      kind: "seeker",
      weapon: "seeker",
      x: originX,
      y: originY,
      w: 14,
      h: 8,
      vx: facing * 320,
      vy: 0,
      speed: 320,
      turnRate: 5.2,
      homingRange: 520,
      life: 2.2,
      facing,
      damage,
      color: def.color,
    };
  }

  if (def.category === "mid") {
    return {
      kind: "plasma",
      weapon: def.id,
      x: originX,
      y: originY,
      w: 14,
      h: 14,
      vx: facing * 215,
      vy: 0,
      life: 0.95,
      facing,
      damage,
      color: def.color,
      detonate: true,
    };
  }

  if (def.id === "rail") {
    return {
      kind: "buster",
      weapon: "rail",
      x: player.x + (facing > 0 ? player.w : -32),
      y: player.y + player.h * 0.42,
      w: 34,
      h: 8,
      vx: facing * 820,
      vy: 0,
      life: 1.2,
      facing,
      pierce: true,
      hits: new Set(),
      damage,
      color: def.color,
    };
  }

  return {
    kind: "buster",
    weapon: "buster",
    x: player.x + (facing > 0 ? player.w : -20),
    y: player.y + player.h * 0.42,
    w: 24,
    h: 6,
    vx: facing * 560,
    vy: 0,
    life: 1.6,
    facing,
    pierce: true,
    hits: new Set(),
    damage,
    color: def.color,
  };
}

export function drawBlade(ctx, blade, camX, camY) {
  const t = blade.life / blade.max;
  const cx = (blade.facing > 0 ? blade.hitbox.x + blade.hitbox.w : blade.hitbox.x) - camX;
  const cy = blade.hitbox.y + blade.hitbox.h / 2 - camY;
  const radius = blade.hitbox.w * 0.95;
  const sweep = 1 - t;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(blade.facing, 1);
  ctx.globalAlpha = Math.min(1, t * 2.2);
  ctx.strokeStyle = "#fff6c9";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -1.05 + sweep * 0.55, 1.05 + sweep * 0.55);
  ctx.stroke();
  ctx.globalAlpha = Math.min(1, t * 1.6);
  ctx.strokeStyle = blade.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4, -1.0, 1.0);
  ctx.stroke();
  ctx.globalAlpha = Math.min(1, t * 3);
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, -0.9, 0.9);
  ctx.stroke();
  ctx.restore();
}

export function drawBullet(ctx, bullet, camX, camY) {
  const x = bullet.x - camX;
  const y = bullet.y - camY;
  ctx.save();
  if (bullet.kind === "boomerang") {
    ctx.translate(x + bullet.w / 2, y + bullet.h / 2);
    ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + bullet.life * 11);
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(1, -8);
    ctx.lineTo(10, 0);
    ctx.lineTo(1, 8);
    ctx.lineTo(-10, 5);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-2, -2, 5, 4);
  } else if (bullet.kind === "seeker") {
    ctx.translate(x + bullet.w / 2, y + bullet.h / 2);
    ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bullet.color;
    ctx.fillRect(-6, -4, 12, 8);
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(11, 0);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-2, -2, 7, 4);
    ctx.fillStyle = bullet.color;
    ctx.fillRect(-10, -2, 4, 4);
  } else if (bullet.kind === "plasma") {
    const r = 9 + Math.sin(bullet.life * 46) * 1.4;
    const gradient = ctx.createRadialGradient(x + 6, y + 6, 1, x + 6, y + 6, r * 2.4);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.35, bullet.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(x - bullet.facing * 14, y + 4, 14, 3);
    ctx.fillStyle = "#eafff7";
    ctx.fillRect(x + 3, y + 3, 6, 6);
  } else if (bullet.kind === "enemy") {
    const r = bullet.r || 5;
    const color = bullet.color || "#ff5aa6";
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.fillStyle = color;
    ctx.fillRect(x - r / 2, y - r / 2, r, r);
  } else {
    const w = bullet.w;
    const h = bullet.h;
    const gradient = ctx.createLinearGradient(x - bullet.facing * 26, 0, x + w * bullet.facing, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.45, bullet.color);
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - (bullet.facing > 0 ? 0 : 26), y, w + 26, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bullet.facing > 0 ? x + w - 5 : x, y + 1, 5, h - 2);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.facing > 0 ? x + 2 : x - 6, y + h + 1, w, 1);
  }
  ctx.restore();
}

export function drawExplosion(ctx, explosion, camX, camY) {
  const t = 1 - explosion.life / explosion.max;
  const radius = explosion.radius * (0.45 + t * 0.95);
  const x = explosion.x - camX;
  const y = explosion.y - camY;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, "#9bf7d3");
  gradient.addColorStop(0.75, "#3ddc97");
  gradient.addColorStop(1, "rgba(61,220,151,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
//  2. PLAYER
//  USEFUL SPOTS: update() (input → acceleration → collision → animation),
//  the jump block (coyote time + jump buffer), and hurt() (invulnerability
//  window: 0.9s = forgiving, 0 = brutal).
// ---------------------------------------------------------------------------

const AIR_FRICTION = 900;

export class Player {
  constructor(tx, ty, { character = "vg", armor, abilities = {}, maxHealth = MAX_HEALTH } = {}) {
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.maxHealth = maxHealth;
    this.spawnX = tx * TILE - this.w / 2;
    this.spawnY = ty * TILE - this.h;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.wallDir = 0;
    this.wallSliding = false;
    this.gliding = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.lockTime = 0;
    this.dashTime = 0;
    this.dashCd = 0;
    this.dashDir = 1;
    this.airDashes = 1;
    this.extraJumps = 1;
    this.fireCd = 0;
    this.fireAnim = 0;
    this.health = maxHealth;
    this.invuln = 0;
    this.hitTimer = 0;
    this.dead = false;
    this.anim = "idle";
    this.animTime = 0;
    this.character = character;
    this.armor = armor;
    this.abilities = abilities || {};
    this.maxExtraJumps = Number(this.abilities.leap) >= 2 ? 2 : 1;
    this.extraJumps = this.maxExtraJumps;
    this.dashVertical = 0;
    this.glideTime = 0;
    this.speedBoost = 1;
    this.speedBoostTimer = 0;
    this.damageBoost = 1;
    this.damageBoostTimer = 0;
    this.fireBoost = 1;
    this.fireBoostTimer = 0;
    this.shieldTimer = 0;
    this.regenTimer = 0;
  }

  get tint() {
    return this.armor;
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get centerY() {
    return this.y + this.h / 2;
  }

  probeWalls(world) {
    const leftSolid = world.solidPx(this.x - 2, this.y + 4) || world.solidPx(this.x - 2, this.y + this.h - 6);
    const rightSolid = world.solidPx(this.x + this.w + 2, this.y + 4) || world.solidPx(this.x + this.w + 2, this.y + this.h - 6);
    return { leftSolid, rightSolid };
  }

  update(dt, input, world, engine) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.fireAnim > 0) this.fireAnim -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.lockTime > 0) this.lockTime -= dt;
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt; else this.speedBoost = 1;
    if (this.damageBoostTimer > 0) this.damageBoostTimer -= dt; else this.damageBoost = 1;
    if (this.fireBoostTimer > 0) this.fireBoostTimer -= dt; else this.fireBoost = 1;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.regenTimer > 0) {
      this.regenTimer -= dt;
      this.heal(dt * 9);
    }
    this.animTime += dt;

    const left = input.isDown("left");
    const right = input.isDown("right");
    const moveDir = (right ? 1 : 0) - (left ? 1 : 0);
    const jumpHeld = input.isDown("jump");
    const glideFloat = !this.onGround && this.vy > 0 && jumpHeld && Number(this.abilities.glide) >= 2;
    const runScale = this.speedBoost || 1;

    const walls = this.probeWalls(world);
    this.wallDir = walls.leftSolid ? -1 : walls.rightSolid ? 1 : 0;

    const verticalDash =
      Number(this.abilities.phase) >= 2
        ? input.isDown("up")
          ? -1
          : input.isDown("down")
          ? 1
          : 0
        : 0;
    if (input.wasPressed("dash") && this.dashCd <= 0 && this.dashTime <= 0 && (this.onGround || this.airDashes > 0)) {
      if (!this.onGround) this.airDashes -= 1;
      this.dashTime = DASH_TIME;
      this.dashCd = this.onGround ? DASH_COOLDOWN : DASH_COOLDOWN + 0.16;
      this.dashVertical = verticalDash;
      this.dashDir = moveDir !== 0 ? moveDir : this.facing;
      if (this.dashVertical) {
        this.vx = 0;
        this.vy = this.dashVertical * DASH_SPEED;
      } else {
        this.facing = this.dashDir;
        this.vy = 0;
      }
      sfx("dash");
      if (engine?.effects) engine.effects.trail = 0.25;
    }

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      if (this.dashVertical) {
        this.vx = 0;
        this.vy = this.dashVertical * DASH_SPEED;
      } else {
        this.vx = this.dashDir * DASH_SPEED;
        this.vy = 0;
      }
      if (this.abilities.phase) this.invuln = Math.max(this.invuln, 0.08);
      if (this.dashTime <= 0) this.dashVertical = 0;
    } else {
      if (this.lockTime <= 0) {
        const turning = moveDir !== 0 && Math.sign(this.vx) === -moveDir;
        if (moveDir !== 0) {
          this.facing = moveDir;
          const rate = this.onGround ? (turning ? TURN_ACCEL : ACCEL) : AIR_ACCEL * (turning ? 1.35 : 1);
          this.vx += moveDir * rate * runScale * dt;
        } else if (this.onGround) {
          this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), FRICTION * dt);
        } else if (glideFloat) {
          const target = this.facing * RUN_SPEED * 0.45;
          this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), 160 * dt);
        } else {
          this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), AIR_FRICTION * dt);
        }

        const maxRun = RUN_SPEED * runScale;
        if (Math.abs(this.vx) > maxRun) {
          this.vx = Math.sign(this.vx) * Math.max(maxRun, Math.abs(this.vx) - FRICTION * dt);
        }
        if (moveDir === 0 && Math.abs(this.vx) < STOP_SPEED) this.vx = 0;
      }

      // Asymmetric gravity: rising is lighter than falling, which reads as a
      // real jump arc instead of the old floaty one.
      const gravity = this.vy < 0 ? GRAVITY_RISE : GRAVITY_FALL;
      this.vy = Math.min(MAX_FALL, this.vy + gravity * dt);
      if (!jumpHeld && this.vy < 0) this.vy += GRAVITY_RISE * (JUMP_CUT - 1) * dt;
    }

    if (input.wasPressed("jump")) this.jumpBuffer = JUMP_BUFFER;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);

    if (this.dashTime <= 0 && this.jumpBuffer > 0) {
      if (this.onGround || this.coyote > 0) {
        this.vy = JUMP_V;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.extraJumps = this.maxExtraJumps;
        sfx("jump");
      } else if (this.wallDir !== 0) {
        this.vy = WALL_JUMP_VY;
        this.vx = -this.wallDir * WALL_JUMP_VX;
        this.facing = -this.wallDir;
        this.lockTime = 0.14;
        this.jumpBuffer = 0;
        this.extraJumps = this.maxExtraJumps;
        sfx("walljump");
        if (engine?.effects) engine.effects.wallKick = 0.2;
      } else if (this.abilities.leap && this.extraJumps > 0) {
        this.extraJumps -= 1;
        this.vy = JUMP_V * 0.92;
        this.jumpBuffer = 0;
        sfx("walljump");
        if (engine?.effects) {
          engine.effects.wallKick = 0.16;
          if (engine.sparkAt) engine.sparkAt(this.centerX, this.y + this.h, 0, "#4be3ff");
        }
      }
    }

    this.wallSliding = false;
    this.gliding = false;
    if (!this.onGround && this.dashTime <= 0 && this.vy > 0) {
      if (this.wallDir !== 0 && moveDir === this.wallDir) {
        this.vy = Math.min(this.vy, WALL_SLIDE_SPEED);
        this.wallSliding = true;
      } else if (this.abilities.glide && jumpHeld && this.vy > (Number(this.abilities.glide) >= 2 ? 8 : GLIDE_SPEED)) {
        this.glideTime += dt;
        const glideSpeed = Number(this.abilities.glide) >= 2 ? Math.min(GLIDE_SPEED, 8 + this.glideTime * 24) : GLIDE_SPEED;
        this.vy = Math.min(this.vy, glideSpeed);
        this.gliding = true;
      }
    }
    if (!this.gliding) this.glideTime = 0;

    if (this.dashTime > 0 && engine?.effects && Math.random() < 0.6) {
      engine.effects.afterimage = { x: this.x, y: this.y, facing: this.facing, life: 0.22 };
    }

    const hitX = moveActorX(this, this.vx * dt, world);
    if (hitX) {
      if (this.dashTime > 0) {
        this.dashTime = 0;
        this.dashVertical = 0;
      }
      this.vx = 0;
    }

    const wasGrounded = this.onGround;
    const impact = this.vy;
    this.onGround = false;
    const hitY = moveActorY(this, this.vy * dt, world);
    if (hitY && this.dashVertical) {
      this.dashTime = 0;
      this.dashVertical = 0;
    }
    if (hitY === "ground") {
      this.vy = 0;
      this.onGround = true;
      this.coyote = COYOTE;
      this.airDashes = 1;
      this.extraJumps = this.maxExtraJumps;
      if (!wasGrounded && engine?.effects) engine.effects.landed = Math.min(1, Math.abs(impact) / 420);
    } else if (hitY === "ceiling") {
      this.vy = 40;
    }
    if (this.onGround) {
      this.coyote = COYOTE;
      this.airDashes = 1;
    }

    this.chooseAnim();
  }

  chooseAnim() {
    let next = "idle";
    if (this.hitTimer > 0) next = "hit";
    else if (this.dashTime > 0) next = "run";
    else if (!this.onGround) {
      if (this.wallSliding) next = "wall";
      else if (this.gliding) next = "fall";
      else next = this.vy < 0 ? "jump" : "fall";
    } else if (Math.abs(this.vx) > 12) next = "run";
    if (next !== this.anim) {
      this.anim = next;
      this.animTime = 0;
    }
  }

  hurt(amount, fromX) {
    if (this.invuln > 0 || this.dead) return false;
    let finalAmount = amount;
    if (this.shieldTimer > 0) {
      finalAmount = Math.max(0, amount - 24);
      this.invuln = Math.max(this.invuln, 0.25);
    }
    this.health = Math.max(0, this.health - finalAmount);
    this.invuln = 0.9;
    this.hitTimer = 0.22;
    const dir = fromX === undefined ? -this.facing : Math.sign(this.centerX - fromX) || 1;
    this.vx = dir * 150;
    this.vy = -190;
    this.dashTime = 0;
    sfx("hurt");
    if (this.health <= 0) this.dead = true;
    return true;
  }

  applyFruitPowerup(powerup) {
    if (!powerup) return;
    switch (powerup.id) {
      case "apple":
        this.heal(40);
        break;
      case "banana":
        this.speedBoost = 1.4;
        this.speedBoostTimer = 8;
        break;
      case "cherry":
        this.damageBoost = 1.45;
        this.damageBoostTimer = 10;
        break;
      case "kiwi":
        this.shieldTimer = 10;
        this.invuln = Math.max(this.invuln, 0.4);
        break;
      case "melon":
        this.heal(this.maxHealth);
        break;
      case "orange":
        this.fireBoost = 0.7;
        this.fireBoostTimer = 9;
        break;
      case "pineapple":
        this.heal(20);
        this.invuln = Math.max(this.invuln, 3.5);
        break;
      case "strawberry":
        this.regenTimer = 7;
        break;
      default:
        break;
    }
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, this.maxHealth);
  }

  respawn(tx, ty, fullHealth = true) {
    this.x = tx * TILE - this.w / 2;
    this.y = ty * TILE - this.h;
    this.vx = 0;
    this.vy = 0;
    this.dashTime = 0;
    this.dashCd = 0;
    this.dead = false;
    this.invuln = 1.1;
    this.hitTimer = 0;
    this.onGround = false;
    this.airDashes = 1;
    this.extraJumps = this.maxExtraJumps;
    if (fullHealth) this.health = this.maxHealth;
    this.anim = "idle";
  }
}

// ---------------------------------------------------------------------------
//  3. ENEMY — variant stats and abilities for every stage adversary.
//  TUNE: variant values in ENEMY_VARIANTS and behavior in Enemy.update().
// ---------------------------------------------------------------------------

export class Enemy {
  constructor(tx, groundRow, minX, maxX, variant = "standard") {
    this.variant = ENEMY_VARIANTS[variant] ? variant : "standard";
    this.variantStyle = ENEMY_VARIANTS[this.variant];
    this.w = 22;
    this.h = 24;
    this.x = tx * TILE;
    this.y = groundRow * TILE - this.h;
    this.baseY = this.y;
    this.minX = minX * TILE;
    this.maxX = maxX * TILE;
    this.vx = 0;
    this.vy = 0;
    this.dir = Math.random() > 0.5 ? 1 : -1;
    this.speed = this.variantStyle.speed;
    this.maxHp = this.variantStyle.maxHp;
    this.hp = this.maxHp;
    this.shieldHp = this.variantStyle.shieldHp || 0;
    this.maxShieldHp = this.shieldHp;
    this.flyer = this.variant === "flyer";
    if (this.flyer) this.baseY -= TILE * 4;
    this.flyPhase = Math.random() * Math.PI * 2;
    this.phaseTime = Math.random() * 3.4;
    this.invulnerable = false;
    this.shotCooldown = 0.9 + Math.random() * 0.7;
    this.flash = 0;
    this.hitStun = 0;
    this.hitDir = 0;
    this.dying = false;
    this.deathTimer = 0;
    this.animTime = Math.random() * 4;
    this.remove = false;
    this.onGround = false;
  }

  get alive() {
    return !this.dying && !this.remove;
  }

  update(dt, world, player) {
    this.animTime += dt;
    if (this.flash > 0) this.flash -= dt;

    if (this.dying) {
      this.deathTimer += dt;
      if (this.deathTimer > 0.7) this.remove = true;
      return;
    }

    const aheadX = this.dir > 0 ? this.x + this.w + 3 : this.x - 3;
    const wallAhead = world.solidPx(aheadX, this.y + this.h / 2);
    if (this.flyer) {
      if (wallAhead) this.dir *= -1;
    } else {
      const floorAhead = world.solidPx(aheadX, this.y + this.h + 5);
      if ((!floorAhead && this.onGround) || wallAhead) this.dir *= -1;
    }

    if (this.x < this.minX) this.dir = 1;
    if (this.x + this.w > this.maxX) this.dir = -1;

    if (this.hitStun > 0) this.hitStun = Math.max(0, this.hitStun - dt);
    this.vx = this.hitStun > 0 ? this.hitDir * 190 : this.dir * this.speed;
    if (moveActorX(this, this.vx * dt, world)) this.dir *= -1;
    if (this.flyer) {
      this.y = this.baseY + Math.sin(this.animTime * 2 + this.flyPhase) * 18;
      this.onGround = false;
    } else {
      this.vy = Math.min(500, this.vy + GRAVITY * dt);
      this.onGround = false;
      if (moveActorY(this, this.vy * dt, world) === "ground") {
        this.vy = 0;
        this.onGround = true;
      }
    }

    if (this.variant === "shielded") {
      this.phaseTime = (this.phaseTime + dt) % 3;
      this.invulnerable = this.phaseTime < 1.7;
    }

    let shot = null;
    if (this.variant === "gunner" && player && !player.dead) {
      this.shotCooldown -= dt;
      const dx = player.centerX - (this.x + this.w / 2);
      const dy = player.centerY - (this.y + this.h / 2);
      if (this.shotCooldown <= 0 && Math.hypot(dx, dy) < 460) {
        const angle = Math.atan2(dy, dx);
        shot = {
          kind: "enemy",
          x: this.x + this.w / 2,
          y: this.y + this.h / 2,
          vx: Math.cos(angle) * 300,
          vy: Math.sin(angle) * 300,
          r: 5,
          life: 3,
          damage: 65,
          color: this.variantStyle.accent,
        };
        this.shotCooldown = 1.7;
      }
    }

    if (player && !player.dead && overlaps(this, player) && player.invuln <= 0) {
      const damage = Math.round(ENEMY_DAMAGE * (this.variantStyle.contactMultiplier || 1));
      const dealt = player.hurt(damage, this.x + this.w / 2);
      if (dealt) sfx("hit");
    }
    return shot;
  }

  damage(amount, fromX) {
    if (this.dying) return false;
    if (this.invulnerable) return false;
    if (this.shieldHp > 0) {
      this.shieldHp = Math.max(0, this.shieldHp - amount);
      this.flash = 0.28;
      this.hitStun = 0.12;
      this.hitDir = Math.sign(this.x + this.w / 2 - fromX) || 1;
      return false;
    }
    this.hp -= amount;
    this.flash = 0.28;
    this.hitStun = 0.12;
    this.hitDir = Math.sign(this.x + this.w / 2 - fromX) || 1;
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 0;
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
//  4. BOSS — Void Core. Phases: idle → dash / spread / leap.
//  TUNE: `hp` below and the timings in beginAttack()/toIdle().
// ---------------------------------------------------------------------------

const ATTACKS = ["dash", "spread", "leap"];
/** Second phase adds three attacks and shortens every recovery window. */
const ATTACKS_P2 = ["dash", "spread", "leap", "teleport", "rain", "sweep"];

export class Boss {
  constructor(tx, groundRow, arena) {
    this.w = 96;
    this.h = 104;
    this.x = tx * TILE - this.w / 2;
    this.y = groundRow * TILE - this.h;
    this.spawn = { x: this.x, y: this.y };
    this.minX = (arena?.minX ?? 0) * TILE;
    this.maxX = (arena?.maxX ?? 42) * TILE;
    this.groundY = groundRow * TILE;
    this.hp = 1800;
    this.maxHp = 1800;
    this.defense = 0.28;
    this.state = "dormant";
    this.next = null;
    this.timer = 0;
    this.facing = -1;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.animTime = 0;
    this.flash = 0;
    this.history = [];
    this.spreadStage = 0;
    this.introTimer = 0;
    this.phaseTwo = false;
    this.rainTick = 0;
    this.sweepShots = 0;
    this.tpDone = false;
  }

  /** Phase 2 begins at half health. */
  get phase() {
    return this.hp <= this.maxHp * 0.5 ? 2 : 1;
  }

  get alive() {
    return this.state !== "dead" && this.hp > 0;
  }

  get active() {
    return !["dormant", "intro", "dead"].includes(this.state);
  }

  activate() {
    if (this.state !== "dormant") return;
    this.state = "intro";
    this.introTimer = 0.8;
    sfx("door");
  }

  chooseAttack() {
    const table = this.phase === 2 ? ATTACKS_P2 : ATTACKS;
    const pool = table.filter((a) => this.history.slice(-2).every((h) => h !== a) || this.history.length < 2);
    const options = pool.length ? pool : table;
    const pick = options[Math.floor(Math.random() * options.length)];
    this.history = [...this.history, pick].slice(-3);
    return pick;
  }

  update(dt, player, engine) {
    this.animTime += dt;
    if (this.flash > 0) this.flash -= dt;

    if (this.state === "dormant") return;
    if (this.state === "dead") return;

    if (this.state === "intro") {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.state = "idle";
        this.timer = 0.9;
      }
      return;
    }

    // --- PHASE TWO: half health, new palette of attacks ---------------------
    if (!this.phaseTwo && this.hp <= this.maxHp * 0.5) {
      this.phaseTwo = true;
      this.defense = 0.18;
      this.state = "idle";
      this.timer = 1.1;
      this.vx = 0;
      this.history = [];
      engine?.bossPhaseTwo?.(this);
      return;
    }

    const dirToPlayer = Math.sign(player.centerX - (this.x + this.w / 2)) || 1;
    this.facing = dirToPlayer;

    if (this.state === "idle") {
      this.timer -= dt;
      this.vx = 0;
      this.applyGravity(dt);
      if (this.timer <= 0) {
        this.next = this.chooseAttack();
        this.state = "telegraph";
        this.timer = 0.55;
      }
    } else if (this.state === "telegraph") {
      this.timer -= dt;
      this.vx = 0;
      this.applyGravity(dt);
      if (this.timer <= 0) this.beginAttack(player, engine);
    } else if (this.state === "dash") {
      this.timer -= dt;
      this.vx = this.facing * (this.phase === 2 ? 440 : 360);
      if (moveActorX(this, this.vx * dt, engine.world)) {
        this.vx = 0;
        this.timer = Math.min(this.timer, 0.08);
      }
      this.applyGravity(dt);
      if (Math.random() < 0.4) engine.dust(this.x + this.w / 2, this.y + this.h - 4, -this.facing);
      if (this.timer <= 0) this.toIdle(0.75);
    } else if (this.state === "spread") {
      this.timer -= dt;
      this.vx = 0;
      this.applyGravity(dt);
      if (this.spreadStage === 0 && this.timer < 0.65) {
        this.spreadStage = 1;
        engine.fireSpread(this, player);
        sfx("plasma");
      } else if (this.spreadStage === 1 && this.timer < 0.3) {
        this.spreadStage = 2;
        engine.fireSpread(this, player);
        sfx("plasma");
      }
      if (this.timer <= 0) this.toIdle(0.7);
    } else if (this.state === "leap") {
      this.vx = clamp(this.vx, -150, 150);
      this.vy = Math.min(700, this.vy + GRAVITY * dt);
      moveActorX(this, this.vx * dt, engine.world);
      const hit = moveActorY(this, this.vy * dt, engine.world);
      if (hit === "ground") {
        this.vy = 0;
        this.onGround = true;
        // the shockwave fires ONCE per landing, not once per physics tick
        if (!this.leapPounded) {
          this.leapPounded = true;
          engine.groundPound(this);
          this.timer = 0.55;
        }
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) this.toIdle(0.75);
      } else {
        this.timer -= dt;
        if (this.timer <= 0) this.toIdle(0.75);
      }
    }

    // --- PHASE TWO ATTACKS -------------------------------------------------
    if (this.state === "teleport") {
      this.timer -= dt;
      this.vx = 0;
      this.applyGravity(dt);
      if (!this.tpDone && this.timer <= 0.6) {
        this.tpDone = true;
        const side = player.centerX > this.x + this.w / 2 ? -1 : 1;
        this.x = clamp(player.centerX + side * 150 - this.w / 2, this.minX, this.maxX - this.w);
        this.y = this.groundY - this.h;
        this.vy = 0;
        this.facing = -side;
        engine?.teleportFlash?.(this);
        sfx("dash");
      }
      if (this.timer <= 0) {
        this.state = "dash";
        this.timer = 0.55;
        sfx("dash");
      }
    } else if (this.state === "rain") {
      this.timer -= dt;
      this.vx = 0;
      this.applyGravity(dt);
      this.rainTick -= dt;
      if (this.rainTick <= 0 && this.timer > 0.25) {
        this.rainTick = 0.16;
        engine?.fireRain?.(this, player);
      }
      if (this.timer <= 0) this.toIdle(0.6);
    } else if (this.state === "sweep") {
      this.timer -= dt;
      this.vx = 0;
      this.applyGravity(dt);
      if (this.sweepShots < 3 && this.timer < 1.1 - this.sweepShots * 0.26) {
        this.sweepShots += 1;
        engine?.fireAimed?.(this, player);
        sfx("plasma");
      }
      if (this.timer <= 0) this.toIdle(0.6);
    }

    if (this.state === "dash" && overlaps(this, player) && player.invuln <= 0) {
      player.hurt(BOSS_DAMAGE, this.x + this.w / 2);
      sfx("hit");
    }

    this.x = clamp(this.x, this.minX, this.maxX - this.w);
  }

  applyGravity(dt) {
    this.vy = Math.min(600, this.vy + GRAVITY * dt);
  }

  beginAttack(player, engine) {
    this.state = this.next;
    this.spreadStage = 0;
    const fast = this.phase === 2;
    if (this.next === "dash") {
      this.timer = fast ? 0.75 : 0.9;
      sfx("dash");
    } else if (this.next === "spread") {
      this.timer = fast ? 0.95 : 1.1;
    } else if (this.next === "teleport") {
      this.timer = 1.15;
      this.tpDone = false;
      this.x = clamp(this.x, this.minX, this.maxX - this.w);
    } else if (this.next === "rain") {
      this.timer = 1.7;
      this.rainTick = 0;
    } else if (this.next === "sweep") {
      this.timer = 1.35;
      this.sweepShots = 0;
    } else {
      this.timer = 2.4;
      this.vy = -620;
      this.vx = Math.sign(player.centerX - (this.x + this.w / 2)) * 175;
      this.onGround = false;
      this.leapPounded = false;
      sfx("jump");
    }
  }

  toIdle(delay) {
    this.state = "idle";
    this.timer = this.phase === 2 ? delay * 0.7 : delay;
    this.spreadStage = 0;
    this.vx = 0;
  }

  damage(amount) {
    if (!this.active || this.state === "dead") return false;
    const dealt = Math.max(1, amount * (1 - this.defense));
    this.hp = Math.max(0, this.hp - dealt);
    this.flash = 0.14;
    if (this.hp <= 0) {
      this.state = "dead";
      return true;
    }
    return false;
  }
}