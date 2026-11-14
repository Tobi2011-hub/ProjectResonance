/**
 * ARMOR PALETTES — the colour sets the shop sells. Index 0 of the character
 * screen is always the frame's own default colours, so these six are the
 * extras; the five that are not free are bought with orbs.
 */
export const ARMOR_PALETTES = [
  { name: "Azure", body: "#4be3ff", accent: "#ff3d8b" },
  { name: "Ember", body: "#ff8a3d", accent: "#ffd166" },
  { name: "Verdant", body: "#7af6c8", accent: "#4be3ff" },
  { name: "Violet", body: "#a78bfa", accent: "#ff3d8b" },
  { name: "Crimson", body: "#ff5a6e", accent: "#ffe066" },
  { name: "Steel", body: "#9fb4d8", accent: "#ffffff" },
];

/** Locked palettes and their orb price (all five non-default sets). */
export const LOCKED_PALETTES = {
  Ember: 120,
  Verdant: 150,
  Violet: 180,
  Crimson: 210,
  Steel: 260,
};

/** The fourth and fifth frames are shop items. */
export const LOCKED_CHARACTERS = { 3: 450, 4: 650 };