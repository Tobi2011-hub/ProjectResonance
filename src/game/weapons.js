/**
 * ============================================================================
 *  WEAPONS — every weapon in the game and the numbers that define it.
 * ============================================================================
 *  category:
 *    "melee" → instant hitbox in front of you, NO ammo (infinite swings)
 *    "mid"   → travelling shot, uses AMMO
 *    "long"  → fast/piercing shot, uses AMMO
 *
 *  maxAmmo is how many shots fit in a full belt at the start of a stage.
 *  Ammo crates in the stage and enemy kills refill it.
 *  Three advanced weapons are shop locked; ownership is stored in the save.
 * ============================================================================
 */

export const WEAPONS = {
  // --- always available -----------------------------------------------------
  blade: {
    id: "blade",
    name: "Blade",
    range: "Short-Range",
    category: "melee",
    cooldown: 0.38,
    damage: 23,
    reach: 68,
    color: "#ffe066",
    sprite: [0, 4],
    description: "Instant wide slash in front of you. No ammo, pure burst.",
  },
  plasma: {
    id: "plasma",
    name: "Plasma",
    range: "Mid-Range",
    category: "mid",
    cooldown: 0.68,
    damage: 24,
    maxAmmo: 36,
    color: "#7af6c8",
    sprite: [2, 0],
    description: "Arcing bolt that detonates into an explosion on impact.",
  },
  buster: {
    id: "buster",
    name: "Buster",
    range: "Long-Range",
    category: "long",
    cooldown: 0.31,
    damage: 14,
    maxAmmo: 60,
    color: "#6ad1ff",
    sprite: [7, 1],
    description: "High-speed laser round that pierces everything it touches.",
  },
  cyclone: {
    id: "cyclone",
    name: "Cyclone",
    range: "Mid-Range",
    category: "mid",
    cooldown: 0.76,
    damage: 27,
    maxAmmo: 30,
    color: "#ffb347",
    sprite: [1, 2],
    description: "Throw a piercing energy disc that sweeps through enemies and returns to you.",
  },

  // --- shop weapons --------------------------------------------------------
  rail: {
    id: "rail",
    name: "Rail",
    range: "Long-Range",
    category: "long",
    cooldown: 1.05,
    damage: 46,
    maxAmmo: 16,
    color: "#ff3d8b",
    sprite: [5, 3],
    description: "Charged lance. One shot punches through a whole line.",
  },
  seeker: {
    id: "seeker",
    name: "Seeker",
    range: "Mid-Range",
    category: "mid",
    cooldown: 0.8,
    damage: 34,
    maxAmmo: 24,
    color: "#a78bfa",
    sprite: [8, 1],
    description: "Launch a guided missile that turns toward the nearest enemy.",
  },
  lance: {
    id: "lance",
    name: "Lance",
    range: "Short-Range",
    category: "melee",
    cooldown: 0.5,
    damage: 34,
    reach: 86,
    color: "#7af6c8",
    sprite: [5, 4],
    description: "Long energy blade. Reaches almost to mid-range. No ammo.",
  },
  // Postgame story rewards. These are hidden from the exchange until earned.
  starfang: { id: "starfang", name: "Starfang", range: "Short-Range", category: "melee", cooldown: 0.46, damage: 38, reach: 78, color: "#78f0df", sprite: [0, 0], description: "A quick crescent cut that rewards close timing." },
  sunhammer: { id: "sunhammer", name: "Sunhammer", range: "Short-Range", category: "melee", cooldown: 0.82, damage: 66, reach: 72, color: "#ffbd55", sprite: [1, 0], description: "A slow, heavy strike with a wide impact." },
  thornbow: { id: "thornbow", name: "Thornbow", range: "Long-Range", category: "long", cooldown: 0.65, damage: 25, maxAmmo: 42, color: "#a8e879", sprite: [2, 1], description: "A rapid thorn bolt that pierces a line of foes." },
  frostbell: { id: "frostbell", name: "Frostbell", range: "Mid-Range", category: "mid", cooldown: 0.92, damage: 48, maxAmmo: 28, color: "#83d9ff", sprite: [3, 1], description: "A heavy frost orb that bursts on impact." },
  stormfork: { id: "stormfork", name: "Stormfork", range: "Long-Range", category: "long", cooldown: 0.48, damage: 20, maxAmmo: 54, color: "#c4a2ff", sprite: [4, 1], description: "A fast forked bolt built for sustained fire." },
  duskblade: { id: "duskblade", name: "Duskblade", range: "Short-Range", category: "melee", cooldown: 0.58, damage: 52, reach: 92, color: "#cb83ff", sprite: [6, 2], description: "A long violet arc with generous reach." },
  sunlance: { id: "sunlance", name: "Sunlance", range: "Long-Range", category: "long", cooldown: 1.15, damage: 72, maxAmmo: 20, color: "#ff7e57", sprite: [7, 3], description: "A charged lance that pierces reinforced targets." },
  astralcore: { id: "astralcore", name: "Astral Core", range: "Mid-Range", category: "mid", cooldown: 0.28, damage: 84, maxAmmo: 80, color: "#fff28a", sprite: [8, 4], passiveDamage: 1.75, description: "An unstable star core. While equipped, it greatly increases your damage." },
};

/** Kept for the files that already import WEAPON_TYPES from core. */
export const WEAPON_TYPES = WEAPONS;

/** Display / cycling order in every menu. */
export const SECRET_WEAPON_REWARDS = { 19: "starfang", 20: "sunhammer", 21: "thornbow", 22: "frostbell", 23: "stormfork", 24: "duskblade", 25: "sunlance", 26: "astralcore" };
export const SECRET_WEAPONS = Object.values(SECRET_WEAPON_REWARDS);
export const WEAPON_ORDER = ["blade", "plasma", "buster", "cyclone", "rail", "seeker", "lance", ...SECRET_WEAPONS];

/** The four you own from the start. */
export const BASE_WEAPONS = ["blade", "plasma", "buster", "cyclone"];

/** Legacy coin reward map, retained only to migrate older save data. */
export const CHALLENGE_WEAPONS = { 1: "rail", 3: "seeker", 5: "lance" };

export const isAmmoWeapon = (id) => Boolean(WEAPONS[id]?.maxAmmo);

/**
 * Same weapon in both slots = DUAL WIELD:
 * double fire rate, +30% damage, half ammo, and the pilot drops to 720 HP.
 */
export const DUAL = { fireRate: 2, damage: 1.3, ammo: 0.5, health: 720 };
