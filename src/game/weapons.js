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
    description: "Long energy blade. Reaches almost to mid-range. No ammo.",
  },
};

/** Kept for the files that already import WEAPON_TYPES from core. */
export const WEAPON_TYPES = WEAPONS;

/** Display / cycling order in every menu. */
export const WEAPON_ORDER = ["blade", "plasma", "buster", "cyclone", "rail", "seeker", "lance"];

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
