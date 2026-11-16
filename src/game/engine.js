/**
 * ENGINE — the "director" of a stage.
 * Owns the frame loop (requestAnimationFrame), runs the fixed 120Hz physics
 * ticks, the camera, enemies, projectiles, checkpoints, resonance shards, lives, the
 * boss and the level-complete/fail flow.
 *
 * TUNE: gravity/speeds in constants.js. Camera smoothly follows the player —
 * see updateCamera() (CAM_LERP / dead-zone numbers) if the camera feels too
 * lazy or too twitchy. Lives / shard rules: killPlayer() and finishStage().
 * Do not rename this class: pages/Stage.jsx imports it.
 */
import {
  CHARACTERS,
  Input,
  MAX_HEALTH,
  SPIKE_DAMAGE,
  START_LIVES,
  STEP,
  TILE,
  VIEW_H,
  VIEW_W,
  addFlash,
  burst,
  clamp,
  createEffects,
  createWorld,
  drawEffects,
  dust as dustFx,
  isCharacterOwned,
  isWeaponOwned,
  overlaps,
  ring,
  sfx,
  shake,
  shakeOffset,
  spark,
  updateEffects,
} from "./core";
import { Boss, COOLDOWN, Enemy, Player, fireWeapon } from "./entities";
import { DUAL, WEAPONS } from "./weapons";
import { drawAmmo, drawCoins, drawFruit, randomFruitPowerup } from "./collectibles";
import {
  drawBackground,
  drawBoss,
  drawDoor,
  drawEnemies,
  drawHazards,
  drawItems,
  drawPlayer,
  drawProjectiles,
  drawShards,
  drawTerrain,
} from "./world";

const NO_HOOKS = {
  onHud: () => {},
  onNarrative: () => {},
  onComplete: () => {},
  onStar: () => {},
  onCheckpoint: () => {},
  onOutOfLives: () => {},
};

export default class GameEngine {
  constructor({ canvas, level, assets, save, hooks }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.level = level;
    this.assets = assets;
    this.save = save;
    this.settings = save.settings || {};
    this.hooks = { ...NO_HOOKS, ...hooks };

    this.world = createWorld(level);
    this.character = CHARACTERS[save.character] && isCharacterOwned(save, save.character) ? CHARACTERS[save.character] : CHARACTERS[0];
    this.abilities = { ...(save.abilities || {}) };
    if (this.character.startingAbility && !Number(this.abilities[this.character.startingAbility])) {
      this.abilities[this.character.startingAbility] = 1;
    }

    // ---- loadout --------------------------------------------------------
    // Same weapon in both slots = dual wield: double fire rate, +30% damage,
    // half the ammo, and the pilot runs on 600 HP instead of 1000.
    const primary = WEAPONS[save.primary] && isWeaponOwned(save, save.primary) ? save.primary : "buster";
    const secondary = WEAPONS[save.secondary] && isWeaponOwned(save, save.secondary) ? save.secondary : "blade";
    this.weapons = [primary, secondary];
    this.dual = primary === secondary;
    this.damageMult = this.dual ? DUAL.damage : 1;
    this.cooldownMult = this.dual ? 1 / DUAL.fireRate : 1;
    this.maxHealth = this.dual ? DUAL.health : MAX_HEALTH;

    this.player = new Player(level.spawn[0], level.spawn[1], {
      character: this.character.prefix,
      armor: save.armor,
      abilities: this.abilities,
      maxHealth: this.maxHealth,
    });

    this.slot = 0;
    this.ammo = {};
    this.ammoFlash = 0;
    this.reloadUsed = false;
    [...new Set(this.weapons)].forEach((id) => {
      if (WEAPONS[id]?.maxAmmo) {
        this.ammo[id] = Math.max(1, Math.round(WEAPONS[id].maxAmmo * (this.dual ? DUAL.ammo : 1)));
      }
    });

    const starState = save.stars?.[level.id] || [];
    this.stars = Array.from({ length: 6 }, (_, i) => Boolean(starState[i]) && (level.id !== 10 || i === 0));
    this.runShards = [false, false, false, false, false];
    this.shardEntities = level.stars.map(([x, y], i) => ({
      x: x * TILE + 8,
      y: y * TILE + 8,
      i,
      taken: false,
      bob: i * 1.7,
    }));
    const grandGemPosition = level.boss?.grandGem;
    this.grandGem = grandGemPosition
      ? { x: grandGemPosition[0] * TILE + 8, y: grandGemPosition[1] * TILE + 8, visible: false, taken: false }
      : null;

    this.coinEntities = (level.coins || []).map(([x, y], i) => ({
      x: x * TILE + 8,
      y: y * TILE + 8,
      i,
      taken: false,
    }));
    this.coinsTotal = this.coinEntities.length;
    this.coinsTaken = 0;
    this.ammoEntities = (level.ammo || []).map(([x, y], i) => ({
      x: x * TILE + 8,
      y: y * TILE + 8,
      i,
      taken: false,
    }));
    this.fruitEntities = (level.fruits || []).map(([x, y], i) => ({
      x: x * TILE + 8,
      y: y * TILE + 8,
      i,
      taken: false,
      powerup: randomFruitPowerup(),
    }));

    this.lives = START_LIVES;
    this.deaths = 0;
    this.hitstop = 0;

    this.checkpointIndex = save.checkpoint?.stage === level.id ? save.checkpoint.index || 0 : 0;
    this.checkpoints = level.checkpoints.map(([x, y], i) => ({
      x: x * TILE,
      y: y * TILE,
      index: i + 1,
      active: this.checkpointIndex === i + 1,
      anim: 0,
    }));

    this.spikes = (level.spikes || []).map(([sx, sy, sw]) => {
      const baseY = (sy + 1) * TILE;
      return { x: sx * TILE, baseY, y: baseY - 10, w: sw * TILE, h: 10, tiles: sw };
    });
    this.saws = (level.saws || []).map((saw) => ({ cx: saw.x * TILE, cy: saw.y * TILE, r: saw.r }));
    this.traps = (level.trapSpikes || []).map((trap) => ({
      x: trap.x * TILE,
      baseY: (trap.y + 1) * TILE,
      y: (trap.y + 1) * TILE - 10,
      w: trap.w * TILE,
      h: 10,
      tiles: trap.w,
      period: trap.period,
      onFrac: trap.onFrac,
      phase: trap.phase,
      active: true,
      anim: 1,
    }));

    this.movers = (level.movers || []).map((mover) => ({
      baseX: mover.x * TILE,
      baseY: mover.y * TILE,
      x: mover.x * TILE,
      y: mover.y * TILE,
      w: (mover.w || 3) * TILE,
      h: 8,
      axis: mover.axis,
      range: mover.range * TILE,
      speed: mover.speed,
      phase: mover.phase || 0,
      dx: 0,
      dy: 0,
    }));
    this.rideIndex = null;

    this.enemies = (level.enemies || []).map(
      (enemy) => new Enemy(enemy.x, enemy.y, enemy.minX, enemy.maxX, enemy.variant)
    );
    this.boss = level.boss ? this.createBoss() : null;
    this.bossWorld = level.boss?.collisionPlatforms
      ? createWorld({ ...level, platforms: level.boss.collisionPlatforms })
      : this.world;
    this.bossTriggered = false;
    this.bossDefeated = false;
    this.bossShieldAdds = [];
    this.phaseAlertTimer = 0;
    this.bossPlatforms = [];
    this.doorProgress = 0;
    this.cutsceneTimer = 0;
    this.controlLocked = false;

    this.exitActive = !level.boss;
    this.finished = false;
    this.tutorials = (level.tutorials || []).map((t) => ({ ...t, done: false }));

    this.bullets = [];
    this.blades = [];
    this.explosions = [];
    this.enemyBullets = [];
    this.shockwaves = [];
    this.afterimages = [];

    this.effects = createEffects();
    this.camera = { x: 0, y: 0, locked: false, target: 0 };
    this.camera.x = clamp(this.player.centerX - VIEW_W / 2, 0, level.width * TILE - VIEW_W);

    this.input = new Input(this.settings.controls);
    this.time = 0;
    this.hudTimer = 0;
    this.narrativeOpen = false;
    this.userPaused = false;
    this.respawning = false;
    this.respawnTimer = 0;
    this.last = 0;
    this.acc = 0;
    this.raf = 0;
    this.running = false;

    this.tick = this.tick.bind(this);
  }

  getSpawnPoint() {
    if (this.checkpointIndex > 0) {
      const cp = this.checkpoints[this.checkpointIndex - 1];
      if (cp) return [cp.x / TILE, cp.y / TILE];
    }
    if (this.level.boss && this.bossTriggered && !this.bossDefeated) {
      return [this.level.boss.arenaMinX + 1, this.level.boss.y];
    }
    return this.level.spawn;
  }

  createBoss() {
    return new Boss(this.level.boss.x, this.level.boss.y, {
      minX: this.level.boss.minX ?? this.level.door?.x ?? 0,
      maxX: this.level.boss.maxX ?? this.level.width,
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.input.attach();
    this.last = performance.now();
    this.acc = 0;
    this.pushHud(true);
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
  }

  pause(value) {
    this.userPaused = value;
  }

  closeNarrative() {
    this.narrativeOpen = false;
    this.hooks.onNarrative(null);
  }

  tick(ts) {
    if (!this.running) return;
    const frame = Math.min(0.1, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    this.acc += frame;
    let steps = 0;
    while (this.acc >= STEP && steps < 16) {
      this.update(STEP);
      this.acc -= STEP;
      steps += 1;
    }
    if (steps >= 16) this.acc = 0;
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  }

  update(dt) {
    this.time += dt;
    if (this.hudTimer > 0) this.hudTimer -= dt;
    if (this.ammoFlash > 0) this.ammoFlash -= dt;
    if (this.phaseAlertTimer > 0) this.phaseAlertTimer = Math.max(0, this.phaseAlertTimer - dt);

    if (this.narrativeOpen) {
      if (this.input.wasPressed("enter") || this.input.wasPressed("jump")) {
        sfx("select");
        this.closeNarrative();
      }
      updateEffects(this.effects, 0);
      this.input.endFrame();
      return;
    }
    if (this.userPaused || this.finished) {
      this.input.endFrame();
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.input.endFrame();
      return;
    }

    updateEffects(this.effects, dt);
    this.afterimages = this.afterimages.filter((ghost) => {
      ghost.life -= dt;
      ghost.age += dt;
      return ghost.life > 0;
    });
    if (this.effects.afterimage) {
      const ghost = this.effects.afterimage;
      this.effects.afterimage = null;
      this.afterimages.push({ ...ghost, age: 0 });
    }

    if (this.respawning) {
      this.respawnTimer -= dt;
      this.updateProjectiles(dt);
      if (this.respawnTimer <= 0) {
        this.respawning = false;
        const [tx, ty] = this.getSpawnPoint();
        this.player.respawn(tx, ty, true);
        this.enemyBullets = [];
        this.shockwaves = [];
        this.rideIndex = null;
        this.camera.locked = this.level.boss ? this.bossTriggered && !this.bossDefeated : false;
        this.snapCamera();
        this.pushHud(true);
      }
      this.input.endFrame();
      return;
    }

    this.updateMovers(dt);
    this.updateTraps(dt);

    if (this.cutsceneTimer > 0) {
      this.cutsceneTimer -= dt;
      this.player.vx = 0;
      if (this.cutsceneTimer <= 0) {
        this.controlLocked = false;
        if (this.boss) this.boss.activate();
      }
    } else if (!this.controlLocked) {
      this.player.update(dt, this.input, this.world, this);
      this.applyBounds();
    }

    if (this.player.dead) this.killPlayer();
    if (this.respawning || this.finished) {
      this.input.endFrame();
      return;
    }

    this.updateCombat(dt);
    this.updateEnemies(dt);
    this.updateTriggers(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateCamera(dt);
    this.rideIndex = this.findRide();
    this.pushHud();
    this.input.endFrame();
  }

  updateMovers(dt) {
    this.world.clearDynamics();
    this.movers.forEach((mover) => {
      const prevX = mover.x;
      const prevY = mover.y;
      if (mover.bossHazard) {
        const offset = Math.sin(this.time * mover.speed + mover.phase) * mover.range;
        if (mover.axis === "x") mover.x = mover.baseX + offset;
        else mover.y = mover.baseY + offset;
        mover.spikeTimer -= dt;
        if (mover.spikeTimer <= 0) {
          mover.spikeActive = !mover.spikeActive;
          mover.spikeTimer = mover.spikeActive ? 1.1 : 1.8;
        }
      } else {
        const cycle = Math.max(1, mover.range * 2);
        const travel = (this.time * mover.speed + mover.phase * mover.range) % cycle;
        const forward = travel <= mover.range ? travel : cycle - travel;
        if (mover.axis === "x") mover.x = mover.baseX + forward;
        else mover.y = mover.baseY + forward;
      }
      mover.dx = mover.x - prevX;
      mover.dy = mover.y - prevY;
      this.world.addDynamic({ x: mover.x, y: mover.y, w: mover.w, h: mover.h });
    });

    if (this.bossTriggered && !this.bossDefeated) {
      const { dropMinX, dropMaxX, dropCeilingY } = this.level.boss;
      this.world.addDynamic({
        x: dropMinX * TILE,
        y: dropCeilingY * TILE,
        w: (dropMaxX - dropMinX + 1) * TILE,
        h: 8,
      });
    }

    if (this.rideIndex !== null && this.movers[this.rideIndex]) {
      const mover = this.movers[this.rideIndex];
      this.player.x += mover.dx;
      this.player.y += mover.dy;
    }
  }

  findRide() {
    const player = this.player;
    for (let i = 0; i < this.movers.length; i += 1) {
      const mover = this.movers[i];
      if (player.x + player.w > mover.x + 2 && player.x < mover.x + mover.w - 2) {
        const feet = player.y + player.h;
        if (feet >= mover.y - 3 && feet <= mover.y + 6 && player.vy >= 0) return i;
      }
    }
    return null;
  }

  updateTraps(dt) {
    this.traps.forEach((trap) => {
      const phase = (this.time + trap.phase) % trap.period;
      trap.active = phase < trap.period * trap.onFrac;
      trap.anim = clamp(trap.anim + (trap.active ? dt * 6 : -dt * 6), 0, 1);
    });
  }

  updateCombat(dt) {
    if (this.player.fireCd > 0) this.player.fireCd -= dt;
    if (this.input.wasPressed("reload") && !this.controlLocked) this.useReload();
    if (this.input.wasPressed("swap")) {
      this.slot = this.slot === 0 ? 1 : 0;
      sfx("move");
      this.pushHud(true);
    }
    const wantsFire = this.input.isDown("fire") || this.input.wasPressed("fire");
    if (wantsFire && this.player.fireCd <= 0 && !this.controlLocked) {
      const type = this.weapons[this.slot];
      const def = WEAPONS[type] || WEAPONS.buster;
      const belt = def.maxAmmo ? this.ammo[type] || 0 : Infinity;

      if (belt <= 0) {
        // dry click: no shot, no cooldown lock, just a quiet warning
        if (this.ammoFlash <= 0) {
          sfx("back");
          this.ammoFlash = 0.4;
          this.pushHud(true);
        }
      } else {
        const shot = fireWeapon(type, this.player, {
          overdrive: Number(this.abilities.overdrive) || 0,
          mult: this.damageMult * (this.player.damageBoost || 1),
        });
        if (shot.kind === "blade") this.blades.push(shot);
        else this.bullets.push(shot);
        if (def.maxAmmo) this.ammo[type] = Math.max(0, belt - 1);

        this.player.fireCd = COOLDOWN[type] * this.cooldownMult * (this.player.fireBoost || 1);
        this.player.fireAnim = 0.16;
        sfx(type);
        spark(this.effects, shot.originX || shot.x, (shot.originY || shot.y) + 3, this.player.facing, {
          color: def.category === "melee" ? "#fff6c9" : shot.color,
          count: def.category === "melee" ? 10 : 5,
          speed: def.category === "melee" ? 220 : 160,
        });
        if (def.category === "melee") {
          ring(this.effects, this.player.centerX + this.player.facing * 16, this.player.centerY, 22, "#fff6c9", 0.18);
          shake(this.effects, 2);
          this.hitstop = Math.max(this.hitstop, 0.035);
        }
        this.pushHud(true);
      }
    }
  }

  reloadAmmoType() {
    const active = this.weapons[this.slot];
    if (WEAPONS[active]?.maxAmmo && (this.ammo[active] || 0) > 0) return active;
    return [...new Set(this.weapons)].find((id) => WEAPONS[id]?.maxAmmo && (this.ammo[id] || 0) > 0) || null;
  }

  reloadReady() {
    if (this.reloadUsed) return false;
    if (this.abilities.magnet) {
      return this.player.health < this.maxHealth && Boolean(this.reloadAmmoType());
    }
    return (
      this.player.health < this.maxHealth ||
      Object.keys(this.ammo).some((id) => this.ammo[id] < Math.round(WEAPONS[id].maxAmmo * (this.dual ? DUAL.ammo : 1)))
    );
  }

  useReload() {
    if (!this.reloadReady()) return false;
    if (this.abilities.magnet) {
      const ammoType = this.reloadAmmoType();
      const currentAmmo = this.ammo[ammoType];
      const cost = Math.max(1, Math.ceil(currentAmmo * 0.25));
      this.ammo[ammoType] = Math.max(0, currentAmmo - cost);
      this.player.heal(this.maxHealth * 0.25);
    } else {
      Object.keys(this.ammo).forEach((id) => {
        this.ammo[id] = Math.round(WEAPONS[id].maxAmmo * (this.dual ? DUAL.ammo : 1));
      });
      this.player.heal(this.maxHealth);
    }
    this.reloadUsed = true;
    sfx("checkpoint");
    burst(this.effects, this.player.centerX, this.player.centerY, { count: 16, color: "#7af6c8", speed: 130, life: 0.45 });
    ring(this.effects, this.player.centerX, this.player.centerY, 26, "#7af6c8", 0.35);
    this.pushHud(true);
    return true;
  }

  /** Enemy kills top the current belt back up so long stages stay playable. */
  refundAmmo(amount, type = this.weapons[this.slot]) {
    const def = WEAPONS[type];
    if (!def?.maxAmmo) return;
    const max = Math.round(def.maxAmmo * (this.dual ? DUAL.ammo : 1));
    this.ammo[type] = Math.min(max, (this.ammo[type] || 0) + amount);
    this.pushHud(true);
  }

  updateEnemies(dt) {
    // Long stages hold well over a hundred bots: only the ones near the player
    // (and anything mid-death) need physics, which keeps phones at full speed.
    const reach = VIEW_W * 1.2;
    this.enemies.forEach((enemy) => {
      if (!enemy.dying && Math.abs(enemy.x - this.player.centerX) > reach) return;
      const shot = enemy.update(dt, this.world, this.player);
      if (shot) this.enemyBullets.push(shot);
    });
    this.enemies = this.enemies.filter((enemy) => !enemy.remove);
  }

  updateBoss(dt) {
    if (!this.boss) return;
    if (this.bossTriggered && !this.bossDefeated) {
      this.doorProgress = Math.min(1, this.doorProgress + dt * 1.8);
    } else if (this.bossDefeated) {
      this.doorProgress = Math.max(0, this.doorProgress - dt * 1.6);
    }
    this.boss.update(dt, this.player, this);
    if (this.boss.exoshield && this.bossShieldAdds.every((enemy) => !enemy.alive)) {
      this.boss.breakExoshield();
      this.bossShieldAdds = [];
      ring(this.effects, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 58, "#4be3ff", 0.45);
      addFlash(this.effects, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 46, "#4be3ff");
      this.pushHud(true);
    }
    if (this.boss.state === "dead" && !this.bossDefeated) this.onBossDefeated();
  }

  updateProjectiles(dt) {
    this.blades = this.blades.filter((blade) => {
      blade.life -= dt;
      if (!blade.hit) {
        this.damageArea(blade.hitbox, blade.damage, blade.originX, blade.originY);
        blade.hit = true;
      }
      return blade.life > 0;
    });

    this.bullets = this.bullets.filter((bullet) => {
      bullet.life -= dt;
      let alive = bullet.life > 0;

      if (bullet.kind === "seeker") {
        let target = null;
        let nearest = bullet.homingRange;
        const considerTarget = (candidate) => {
          const dx = candidate.x + candidate.w / 2 - (bullet.x + bullet.w / 2);
          const dy = candidate.y + candidate.h / 2 - (bullet.y + bullet.h / 2);
          const distance = Math.hypot(dx, dy);
          if (distance < nearest) {
            nearest = distance;
            target = candidate;
          }
        };
        this.enemies.forEach((enemy) => {
          if (enemy.alive) considerTarget(enemy);
        });
        if (this.boss?.active) considerTarget(this.boss);

        if (target) {
          const dx = target.x + target.w / 2 - (bullet.x + bullet.w / 2);
          const dy = target.y + target.h / 2 - (bullet.y + bullet.h / 2);
          const currentAngle = Math.atan2(bullet.vy, bullet.vx);
          const targetAngle = Math.atan2(dy, dx);
          const angleDelta = Math.atan2(
            Math.sin(targetAngle - currentAngle),
            Math.cos(targetAngle - currentAngle)
          );
          const angle = currentAngle + clamp(angleDelta, -bullet.turnRate * dt, bullet.turnRate * dt);
          bullet.vx = Math.cos(angle) * bullet.speed;
          bullet.vy = Math.sin(angle) * bullet.speed;
          bullet.facing = bullet.vx < 0 ? -1 : 1;
        }
      }

      if (bullet.kind === "boomerang" && bullet.returning) {
        const dx = this.player.centerX - (bullet.x + bullet.w / 2);
        const dy = this.player.centerY - (bullet.y + bullet.h / 2);
        const distance = Math.hypot(dx, dy);
        if (alive && distance < 18) {
          this.refundAmmo(1, bullet.weapon);
          alive = false;
        } else {
          bullet.vx = (dx / distance) * bullet.returnSpeed;
          bullet.vy = (dy / distance) * bullet.returnSpeed;
          bullet.x += bullet.vx * dt;
          bullet.y += bullet.vy * dt;
        }
      } else {
        bullet.x += bullet.vx * dt;
        bullet.y += (bullet.vy || 0) * dt;
        if (bullet.kind === "boomerang") {
          bullet.travelled += bullet.speed * dt;
          if (bullet.travelled >= bullet.maxDistance) {
            bullet.returning = true;
            bullet.hits.clear();
            bullet.bossHit = false;
          }
        }
      }

      const rect = { x: bullet.x, y: bullet.y, w: bullet.w, h: bullet.h };
      for (const enemy of this.enemies) {
        if (!alive) break;
        if (!enemy.alive || enemy.remove) continue;
        if (bullet.hits && bullet.hits.has(enemy)) continue;
        if (overlaps(rect, enemy)) {
          if (bullet.hits) bullet.hits.add(enemy);
          this.hitEnemy(enemy, bullet.damage, bullet.x, bullet.y);
          if (!bullet.pierce) {
            alive = false;
            break;
          }
        }
      }
      if (alive && this.boss && this.boss.active && !(bullet.kind === "boomerang" && bullet.bossHit) && overlaps(rect, this.boss)) {
        const wasVulnerable = this.boss.vulnerable;
        const killed = this.boss.damage(bullet.damage, this);
        if (wasVulnerable) this.hitBoss(bullet.x, bullet.y);
        if (bullet.kind === "boomerang") bullet.bossHit = true;
        if (killed) this.onBossDefeated();
        if (!bullet.pierce) alive = false;
      }
      if (alive) {
        const probeX = bullet.vx > 0 ? bullet.x + bullet.w : bullet.x;
        if (this.world.solidPx(probeX, bullet.y + bullet.h / 2)) {
          if (bullet.kind === "boomerang" && !bullet.returning) {
            bullet.x -= bullet.vx * dt;
            bullet.y -= bullet.vy * dt;
            bullet.travelled = Math.max(0, bullet.travelled - bullet.speed * dt);
            bullet.vx = 0;
            bullet.vy = 0;
            bullet.returning = true;
            bullet.hits.clear();
            bullet.bossHit = false;
          } else {
            alive = false;
          }
        }
        if (bullet.x < this.camera.x - 60 || bullet.x > this.camera.x + VIEW_W + 60) alive = false;
      }
      if (!alive && (bullet.detonate || bullet.kind === "plasma")) {
        this.detonate(bullet);
      }
      return alive;
    });

    this.explosions = this.explosions.filter((explosion) => {
      explosion.life -= dt;
      return explosion.life > 0;
    });

    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.vy += 90 * dt;
      const rect = { x: bullet.x - 5, y: bullet.y - 5, w: 10, h: 10 };
      if (overlaps(rect, this.player) && this.player.invuln <= 0) {
        this.player.hurt(bullet.damage ?? 2, bullet.x);
        sfx("hit");
        return false;
      }
      if (this.world.solidPx(bullet.x, bullet.y)) return false;
      return bullet.life > 0 && bullet.x > this.camera.x - 80 && bullet.x < this.camera.x + VIEW_W + 80;
    });

    this.shockwaves = this.shockwaves.filter((wave) => {
      wave.life -= dt;
      wave.x += wave.dir * 215 * dt;
      const rect = { x: wave.x - 8, y: wave.y - wave.r, w: 16, h: wave.r };
      if (overlaps(rect, this.player) && this.player.invuln <= 0) {
        this.player.hurt(Math.round(4 * 0.6), wave.x);
      }
      if (this.world.solidPx(wave.x, wave.y + 3)) return false;
      return wave.life > 0;
    });
  }

  damageArea(rect, amount, fromX, fromY) {
    let hitAny = false;
    this.enemies.forEach((enemy) => {
      if (enemy.alive && overlaps(rect, enemy)) {
        this.hitEnemy(enemy, amount, fromX, fromY);
        hitAny = true;
      }
    });
    if (this.boss && this.boss.active && overlaps(rect, this.boss)) {
      const wasVulnerable = this.boss.vulnerable;
      this.boss.damage(amount, this);
      if (wasVulnerable) {
        this.hitBoss(fromX, fromY);
        hitAny = true;
      }
    }
    return hitAny;
  }

  hitEnemy(enemy, amount, x, y) {
    const impactX = enemy.x + enemy.w / 2;
    const impactY = enemy.y + enemy.h / 2;
    const killed = enemy.damage(amount, x ?? this.player.centerX);
    burst(this.effects, impactX, impactY, { count: killed ? 18 : 10, color: killed ? "#7af6c8" : "#ffffff", speed: killed ? 170 : 120, life: 0.4 });
    spark(this.effects, impactX, impactY, this.player.facing, { color: killed ? "#9bf7d3" : "#ffffff", count: killed ? 12 : 8 });
    addFlash(this.effects, impactX, impactY, killed ? 30 : 22, killed ? "#7af6c8" : "#ffffff");
    this.hitstop = Math.max(this.hitstop, killed ? 0.07 : 0.045);
    if (killed) {
      sfx("explode");
      shake(this.effects, 4);
      ring(this.effects, impactX, impactY, 18, "#7af6c8", 0.28);
      this.refundAmmo(2);
    } else {
      sfx("hit");
      shake(this.effects, 2.5);
    }
  }

  hitBoss(x, y) {
    burst(this.effects, x, y, { count: 8, color: "#fff6c9", speed: 130, life: 0.3 });
    spark(this.effects, x, y, this.player.facing, { color: "#ffffff", count: 8 });
    addFlash(this.effects, x, y, 34, "#ffffff");
    shake(this.effects, 7);
    this.hitstop = Math.max(this.hitstop, 0.075);
  }

  attractPickup(item, dt) {
    const rank = Number(this.abilities.magnet) || 0;
    if (!rank) return;
    const dx = this.player.centerX - item.x;
    const dy = this.player.centerY - item.y;
    const distance = Math.hypot(dx, dy);
    const radius = rank >= 2 ? 220 : 128;
    const speed = rank >= 2 ? 280 : 190;
    if (distance < radius && distance > 4) {
      item.x += (dx / distance) * speed * dt;
      item.y += (dy / distance) * speed * dt;
    }
  }

  detonate(bullet) {
    const radius = 36;
    this.explosions.push({ x: bullet.x, y: bullet.y, radius, life: 0.36, max: 0.36 });
    this.damageArea({ x: bullet.x - radius, y: bullet.y - radius, w: radius * 2, h: radius * 2 }, 6, bullet.x, bullet.y);
    burst(this.effects, bullet.x, bullet.y, { count: 20, color: "#7af6c8", speed: 200, life: 0.5 });
    ring(this.effects, bullet.x, bullet.y, radius, "#9bf7d3", 0.3);
    shake(this.effects, 5);
    this.hitstop = Math.max(this.hitstop, 0.05);
    sfx("explode");
  }

  updateTriggers(dt) {
    this.checkpoints.forEach((cp) => {
      if (cp.active) cp.anim = Math.min(1, cp.anim + dt * 3);
      const rect = { x: cp.x - 22, y: cp.y - 150, w: 44, h: 150 };
      if (!cp.active && overlaps(rect, this.player)) {
        this.checkpoints.forEach((other) => {
          other.active = other.index === cp.index;
          other.anim = other.index === cp.index ? 0 : other.anim;
        });
        this.checkpointIndex = cp.index;
        sfx("checkpoint");
        burst(this.effects, cp.x, cp.y - 30, { count: 10, color: "#4be3ff", speed: 100, life: 0.5 });
        this.hooks.onCheckpoint(cp.index);
        this.pushHud(true);
      }
    });

    this.shardEntities.forEach((shard) => {
      if (shard.taken) return;
      this.attractPickup(shard, dt);
      const rect = { x: shard.x - 11, y: shard.y - 11, w: 22, h: 22 };
      if (overlaps(rect, this.player)) {
        shard.taken = true;
        this.runShards[shard.i] = true;
        this.stars[shard.i] = true;
        sfx("star");
        burst(this.effects, shard.x, shard.y, { count: 18, color: this.level.accent, speed: 130, life: 0.6 });
        ring(this.effects, shard.x, shard.y, 26, this.level.accent, 0.34);
        addFlash(this.effects, shard.x, shard.y, 22, this.level.accent);
        this.hitstop = Math.max(this.hitstop, 0.04);
        this.hooks.onStar(shard.i, [...this.stars]);
        this.pushHud(true);
      }
    });

    this.coinEntities.forEach((coin) => {
      if (coin.taken) return;
      this.attractPickup(coin, dt);
      if (overlaps({ x: coin.x - 11, y: coin.y - 11, w: 22, h: 22 }, this.player)) {
        coin.taken = true;
        this.coinsTaken += 1;
        sfx("star");
        burst(this.effects, coin.x, coin.y, { count: 12, color: "#ffd166", speed: 130, life: 0.45 });
        ring(this.effects, coin.x, coin.y, 18, "#ffd166", 0.26);
        this.pushHud(true);
      }
    });

    this.ammoEntities.forEach((crate) => {
      if (crate.taken) return;
      this.attractPickup(crate, dt);
      if (overlaps({ x: crate.x - 11, y: crate.y - 17, w: 22, h: 20 }, this.player)) {
        crate.taken = true;
        Object.keys(this.ammo).forEach((id) => {
          const max = Math.round(WEAPONS[id].maxAmmo * (this.dual ? DUAL.ammo : 1));
          this.ammo[id] = Math.min(max, this.ammo[id] + Math.round(max * 0.5));
        });
        sfx("checkpoint");
        burst(this.effects, crate.x, crate.y, { count: 10, color: "#4be3ff", speed: 120, life: 0.4 });
        this.pushHud(true);
      }
    });

    this.fruitEntities.forEach((fruit) => {
      if (fruit.taken) return;
      this.attractPickup(fruit, dt);
      if (overlaps({ x: fruit.x - 12, y: fruit.y - 12, w: 24, h: 24 }, this.player)) {
        fruit.taken = true;
        this.player.applyFruitPowerup(fruit.powerup);
        sfx("star");
        burst(this.effects, fruit.x, fruit.y, { count: 12, color: fruit.powerup.color, speed: 150, life: 0.5 });
        ring(this.effects, fruit.x, fruit.y, 20, fruit.powerup.color, 0.3);
        this.pushHud(true);
      }
    });

    this.tutorials.forEach((tutorial) => {
      if (tutorial.done) return;
      const rect = { x: tutorial.x * TILE, y: tutorial.y * TILE, w: tutorial.w * TILE, h: tutorial.h * TILE };
      if (overlaps(rect, this.player) && !this.narrativeOpen) {
        tutorial.done = true;
        this.narrativeOpen = true;
        this.hooks.onNarrative({ title: tutorial.title, text: tutorial.text });
      }
    });

    if (this.player.invuln <= 0) {
      const hitBySpike = this.spikes.some((spike) => overlaps(spike, this.player));
      const hitByBossSpike = this.bossPlatforms.some(
        (mover) => mover.spikeActive && overlaps({ x: mover.x, y: mover.y - 12, w: mover.w, h: 12 }, this.player)
      );
      const hitByTrap = this.traps.some((trap) => trap.active && overlaps(trap, this.player));
      if (hitBySpike || hitByBossSpike || hitByTrap) this.hurtBySpike();
    }

    this.saws.forEach((saw) => {
      if (this.player.invuln > 0) return;
      const rect = { x: saw.cx - saw.r * 0.6, y: saw.cy - saw.r * 0.6, w: saw.r * 1.2, h: saw.r * 1.2 };
      if (overlaps(rect, this.player)) {
        this.player.hurt(SPIKE_DAMAGE, saw.cx);
        shake(this.effects, 5);
        spark(this.effects, this.player.centerX, this.player.centerY, -this.player.facing, { color: "#ff6b6b", count: 10 });
      }
    });

    if (this.player.y > VIEW_H + 90) this.killPlayer();

    if (this.exitActive && !this.finished) {
      const exitRect = { x: this.level.exit[0] * TILE - 18, y: this.level.exit[1] * TILE - 46, w: 36, h: 46 };
      if (overlaps(exitRect, this.player)) this.finishStage();
    }

    if (
      this.level.boss &&
      !this.bossTriggered &&
      this.player.vy > 0 &&
      this.player.centerY >= this.level.boss.triggerY * TILE &&
      this.player.centerX >= this.level.boss.dropMinX * TILE &&
      this.player.centerX <= this.level.boss.dropMaxX * TILE
    ) {
      this.triggerBoss();
    }

    if (this.grandGem?.visible && !this.grandGem.taken) {
      this.attractPickup(this.grandGem, dt);
      if (overlaps({ x: this.grandGem.x - 13, y: this.grandGem.y - 13, w: 26, h: 26 }, this.player)) {
        this.grandGem.taken = true;
        this.runShards[0] = true;
        this.stars[0] = true;
        sfx("star");
        burst(this.effects, this.grandGem.x, this.grandGem.y, { count: 28, color: "#ffd166", speed: 170, life: 0.7 });
        ring(this.effects, this.grandGem.x, this.grandGem.y, 36, "#ffd166", 0.45);
        addFlash(this.effects, this.grandGem.x, this.grandGem.y, 30, "#ffd166");
        this.hooks.onStar(0, [...this.stars]);
        this.pushHud(true);
      }
    }
  }

  hurtBySpike() {
    const dealt = this.player.hurt(SPIKE_DAMAGE, this.player.centerX - 1);
    if (!dealt) return;
    shake(this.effects, 5);
    spark(this.effects, this.player.centerX, this.player.y + this.player.h, -this.player.facing, { color: "#ff6b6b", count: 12 });
    burst(this.effects, this.player.centerX, this.player.y + this.player.h, {
      count: 8,
      color: "#ff6b6b",
      speed: 120,
      life: 0.35,
    });
  }

  sparkAt(x, y, dir, color) {
    spark(this.effects, x, y, dir, { color, count: 8 });
  }

  killPlayer() {
    if (this.respawning || this.finished) return;
    this.player.dead = false;
    this.deaths += 1;
    this.lives -= 1;
    this.player.health = 0;
    sfx("hurt");
    shake(this.effects, 7);
    burst(this.effects, this.player.centerX, this.player.centerY, {
      count: 20,
      color: "#ff6b6b",
      speed: 170,
      life: 0.6,
    });
    if (this.lives <= 0) {
      this.lives = 0;
      this.pushHud(true);
      this.finished = true;
      this.hooks.onOutOfLives({ stage: this.level.id });
      return;
    }
    if (this.bossTriggered && !this.bossDefeated) this.resetBossEncounter();
    this.respawning = true;
    this.respawnTimer = 0.6;
    this.player.vx = 0;
    this.player.vy = 0;
    this.pushHud(true);
  }

  triggerBoss() {
    this.bossTriggered = true;
    this.controlLocked = false;
    this.cutsceneTimer = 0;
    this.world.closeDoor();
    this.doorProgress = 0.02;
    this.camera.locked = true;
    this.camera.target = clamp(this.level.boss.cameraX, 0, this.level.width * TILE - VIEW_W);
    this.player.vx = 0;
    this.boss.activate(true);
    sfx("door");
    shake(this.effects, 7);
    this.pushHud(true);
  }

  resetBossEncounter() {
    this.boss = this.createBoss();
    this.bossTriggered = false;
    this.bossDefeated = false;
    this.phaseAlertTimer = 0;
    this.bossPlatforms = [];
    this.movers = this.movers.filter((mover) => !mover.bossHazard);
    this.enemies = this.enemies.filter((enemy) => !this.bossShieldAdds.includes(enemy));
    this.bossShieldAdds = [];
    this.world.openDoor();
    this.doorProgress = 0;
    this.camera.locked = false;
    this.bullets = [];
    this.blades = [];
    this.explosions = [];
    this.enemyBullets = [];
    this.shockwaves = [];
  }

  onBossDefeated() {
    if (this.bossDefeated) return;
    this.bossDefeated = true;
    if (this.grandGem) this.grandGem.visible = true;
    this.exitActive = true;
    this.world.openDoor();
    this.camera.locked = false;
    sfx("clear");
    shake(this.effects, 9);
    this.hitstop = Math.max(this.hitstop, 0.12);
    burst(this.effects, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, {
      count: 40,
      color: "#ff3d8b",
      speed: 220,
      life: 0.9,
    });
    addFlash(this.effects, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 70, "#ffffff");
  }

  // --- phase two helpers ---------------------------------------------------
  bossPhaseTwo(boss) {
    this.phaseAlertTimer = 2.4;
    this.spawnBossPlatforms();
    sfx("clear");
    shake(this.effects, 14);
    this.hitstop = Math.max(this.hitstop, 0.18);
    addFlash(this.effects, boss.x + boss.w / 2, boss.y + boss.h / 2, 92, "#ff9f45");
    burst(this.effects, boss.x + boss.w / 2, boss.y + boss.h / 2, {
      count: 34,
      color: "#ff9f45",
      speed: 240,
      life: 0.9,
    });
    this.pushHud(true);
  }

  spawnBossPlatforms() {
    if (this.bossPlatforms.length) return;
    this.bossPlatforms = [
      { x: 20, y: 12, axis: "x", range: 2, speed: 0.8, phase: 0, spikeTimer: 1.2 },
      { x: 31, y: 8, axis: "y", range: 1, speed: 1, phase: Math.PI / 2, spikeTimer: 2.4 },
    ].map((config) => ({
      baseX: config.x * TILE,
      baseY: config.y * TILE,
      x: config.x * TILE,
      y: config.y * TILE,
      w: TILE * 3,
      h: 10,
      axis: config.axis,
      range: config.range * TILE,
      speed: config.speed,
      phase: config.phase,
      bossHazard: true,
      spikeTimer: config.spikeTimer,
      spikeActive: false,
      dx: 0,
      dy: 0,
    }));
    this.movers.push(...this.bossPlatforms);
  }

  activateBossShield() {
    if (!this.boss) return;
    const minX = this.level.boss.arenaMinX + 1;
    const maxX = this.level.boss.arenaMaxX;
    const left = clamp(Math.floor(this.boss.x / TILE) - 3, minX, maxX - 2);
    const right = clamp(Math.floor((this.boss.x + this.boss.w) / TILE) + 2, minX, maxX - 2);
    this.bossShieldAdds = [left, right].map((tx) =>
      new Enemy(tx, 15, minX, maxX, "standard")
    );
    this.enemies.push(...this.bossShieldAdds);
    this.pushHud(true);
  }

  teleportFlash(boss) {
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h / 2;
    burst(this.effects, cx, cy, { count: 20, color: "#ff3d8b", speed: 190, life: 0.5 });
    ring(this.effects, cx, cy, 42, "#ff3d8b", 0.3);
    shake(this.effects, 6);
  }

  // orbital rain: bolts fall from the ceiling around the player
  fireRain(boss, player) {
    const x = clamp(player.centerX + (Math.random() - 0.5) * 240, 8, this.level.width * TILE - 8);
    this.enemyBullets.push({ kind: "enemy", x, y: 6, vx: 0, vy: 240, r: 5, life: 5, damage: Math.round(4 * 0.6) });
    addFlash(this.effects, x, 10, 18, "#ff9f45");
  }

  // aimed fan: a single bolt straight at the player, three times per attack
  fireAimed(boss, player) {
    const originX = boss.x + boss.w / 2;
    const originY = boss.y + boss.h * 0.45;
    const angle = Math.atan2(player.centerY - originY, player.centerX - originX);
    this.enemyBullets.push({
      kind: "enemy",
      x: originX,
      y: originY,
      vx: Math.cos(angle) * 265,
      vy: Math.sin(angle) * 265,
      r: 5,
      life: 4,
      damage: Math.round(4 * 0.6),
    });
    addFlash(this.effects, originX, originY, 22, "#ff9f45");
    shake(this.effects, 2);
  }

  fireSpread(boss, player) {
    const originX = boss.x + boss.w / 2;
    const originY = boss.y + boss.h * 0.45;
    const angle = Math.atan2(player.centerY - originY, player.centerX - originX);
    [-0.52, -0.26, 0, 0.26, 0.52].forEach((offset) => {
      const a = angle + offset;
      this.enemyBullets.push({
        kind: "enemy",
        x: originX,
        y: originY,
        vx: Math.cos(a) * 165,
        vy: Math.sin(a) * 165,
        r: 6,
        life: 4,
        damage: Math.round(4 * 0.6),
      });
    });
    addFlash(this.effects, originX, originY, 26, "#ff3d8b");
    shake(this.effects, 3);
  }

  groundPound(boss) {
    const groundY = boss.y + boss.h;
    this.shockwaves.push({ x: boss.x + boss.w / 2, y: groundY, dir: -1, r: 26, life: 2 });
    this.shockwaves.push({ x: boss.x + boss.w / 2, y: groundY, dir: 1, r: 26, life: 2 });
    burst(this.effects, boss.x + boss.w / 2, groundY, { count: 18, color: "#ff3d8b", speed: 180, life: 0.5 });
    addFlash(this.effects, boss.x + boss.w / 2, groundY, 44, "#ff3d8b");
    shake(this.effects, 10);
    sfx("explode");
  }

  dust(x, y, dir) {
    dustFx(this.effects, x, y, dir);
  }

  finishStage() {
    if (this.finished) return;
    this.finished = true;
    const noDeath = this.deaths === 0;
    if (noDeath && this.level.id !== 10) this.stars[5] = true;
    sfx("clear");
    burst(this.effects, this.player.centerX, this.player.centerY, { count: 30, color: "#ffd166", speed: 180, life: 0.8 });
    this.hooks.onComplete({
      stage: this.level.id,
      stars: [...this.stars],
      shards: [...this.runShards],
      collected: this.runShards.filter(Boolean).length,
      noDeath,
      lives: this.lives,
      coins: this.coinsTaken,
      coinsTotal: this.coinsTotal,
    });
  }

  snapCamera() {
    if (this.camera.locked) {
      this.camera.x = this.camera.target;
      return;
    }
    this.camera.x = clamp(this.player.centerX - VIEW_W / 2, 0, Math.max(0, this.level.width * TILE - VIEW_W));
  }

  updateCamera(dt) {
    if (this.camera.locked) {
      this.camera.x += (this.camera.target - this.camera.x) * Math.min(1, dt * 6);
      return;
    }
    const lookahead = this.player.facing * 26;
    const target = clamp(
      this.player.centerX - VIEW_W / 2 + lookahead,
      0,
      Math.max(0, this.level.width * TILE - VIEW_W)
    );
    const diff = target - this.camera.x;
    if (Math.abs(diff) < 0.6) {
      this.camera.x = target;
      return;
    }
    const speed = Math.abs(diff) > 90 ? 16 : 9;
    this.camera.x += diff * Math.min(1, dt * speed);
  }

  buildHud() {
    const weaponType = this.weapons[this.slot];
    const def = WEAPONS[weaponType] || WEAPONS.buster;
    return {
      stage: this.level.id,
      stageName: this.level.name,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      shards: this.stars.filter(Boolean).length,
      collected: this.runShards.filter(Boolean).length,
      totalShards: this.level.id === 10 ? 1 : 5,
      accent: this.level.accent,
      lives: this.lives,
      deaths: this.deaths,
      weapon: weaponType,
      slot: this.slot,
      weapons: [...this.weapons],
      dual: this.dual,
      ammo: def.maxAmmo ? this.ammo[weaponType] : null,
      maxAmmo: def.maxAmmo ? Math.round(def.maxAmmo * (this.dual ? DUAL.ammo : 1)) : null,
      ammoEmpty: Boolean(def.maxAmmo) && (this.ammo[weaponType] || 0) <= 0,
      reloadReady: this.reloadReady(),
      reloadUsed: this.reloadUsed,
      reloadSkill: Boolean(this.abilities.magnet),
      reloadLabel: this.abilities.magnet ? "HEAL" : "RELOAD",
      coins: this.coinsTaken,
      coinsTotal: this.coinsTotal,
      challenge: Boolean(this.level.challenge),
      dashReady: this.player.dashCd <= 0,
      respawning: this.respawning,
      bossVisible: Boolean(this.boss && this.bossTriggered && !this.bossDefeated),
      bossHp: this.boss ? this.boss.hp : 0,
      bossMax: this.boss ? this.boss.maxHp : 1,
      bossPhase: this.boss?.phaseTwo ? 2 : 1,
      bossShielded: Boolean(this.boss?.exoshield),
      bossTransitioning: Boolean(this.boss?.state === "phase-transition"),
      phaseAlert: this.phaseAlertTimer > 0,
      abilities: Object.keys(this.abilities).filter((key) => this.abilities[key]),
    };
  }

  pushHud(force = false) {
    if (!force && this.hudTimer > 0) return;
    this.hudTimer = 0.1;
    const hud = this.buildHud();
    const key = [
      hud.health,
      hud.lives,
      hud.shards,
      hud.collected,
      hud.weapon,
      hud.slot,
      hud.ammo,
      hud.reloadReady,
      hud.reloadUsed,
      hud.coins,
      hud.dashReady,
      Math.round(hud.bossHp),
      hud.respawning,
      hud.bossVisible,
      hud.bossPhase,
      hud.bossShielded,
      hud.bossTransitioning,
      hud.phaseAlert,
      Math.ceil(this.phaseAlertTimer * 10),
    ].join("|");
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    this.hooks.onHud(hud);
  }

  /** Invisible walls: stage edges plus a sealed arena once the boss wakes up. */
  applyBounds() {
    const player = this.player;
    const sealed = this.level.boss && this.bossTriggered && !this.bossDefeated;
    const left = sealed ? (this.level.boss.arenaMinX + 1) * TILE : TILE;
    const right = sealed
      ? this.level.boss.arenaMaxX * TILE - player.w
      : this.level.width * TILE - player.w - TILE;
    if (player.x < left) {
      player.x = left;
      if (player.vx < 0) player.vx = 0;
    }
    if (player.x > right) {
      player.x = right;
      if (player.vx > 0) player.vx = 0;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const offset = this.settings.shake === false ? { x: 0, y: 0 } : shakeOffset(this.effects);
    const smoothX = this.camera.x;
    this.camera.x = Math.round(this.camera.x + offset.x);
    this.camera.y = Math.round(offset.y);

    drawBackground(ctx, this);
    drawTerrain(ctx, this);
    drawDoor(ctx, this);
    drawHazards(ctx, this);
    drawItems(ctx, this);
    drawShards(ctx, this);
    drawCoins(ctx, this);
    drawAmmo(ctx, this);
    drawFruit(ctx, this);
    drawEnemies(ctx, this);
    drawBoss(ctx, this);
    drawPlayer(ctx, this);
    drawProjectiles(ctx, this);
    drawEffects(ctx, this.effects, this.camera.x, this.camera.y);

    this.camera.x = smoothX;
    this.camera.y = 0;
  }
}