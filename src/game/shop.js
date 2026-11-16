/**
 * SHOP — the orb economy. Orbs are earned by clearing stages; the shop sells
 * the fourth frame and five armour palettes.
 * All purchases are written straight into the save file.
 */
import { ARMOR_PALETTES, LOCKED_CHARACTERS, LOCKED_PALETTES } from "./palettes";
import { CHARACTERS, isCharacterOwned, loadSave, writeSave } from "./core";

export const ORBS_PER_STAGE = 40;
export const ORBS_PER_SECRET = 80;
export const ORBS_PER_STAR = 5;

/** Everything for sale, with an `owned` flag computed from the save. */
export function buildShop(save) {
  const ownedPalettes = save?.unlockedPalettes || [];

  const characters = Object.entries(LOCKED_CHARACTERS).map(([index, price]) => {
    const i = Number(index);
    return {
      id: `character-${i}`,
      kind: "character",
      value: i,
      name: CHARACTERS[i]?.name || "Unknown",
      description: CHARACTERS[i]?.blurb || "",
      price,
      swatch: [CHARACTERS[i]?.body, CHARACTERS[i]?.accent],
      owned: isCharacterOwned(save, i),
    };
  });

  const palettes = Object.entries(LOCKED_PALETTES).map(([name, price]) => {
    const palette = ARMOR_PALETTES.find((p) => p.name === name);
    return {
      id: `palette-${name}`,
      kind: "palette",
      value: name,
      name,
      description: "Armour colours for every frame.",
      price,
      swatch: [palette?.body, palette?.accent],
      owned: ownedPalettes.includes(name),
    };
  });

  return [...characters, ...palettes];
}

/** Returns { ok, save, message }. Orbs are only spent when the purchase works. */
export function buyItem(item) {
  const save = loadSave();
  if (!save) return { ok: false, message: "NO SAVE DATA" };

  // ownership is re-read from the save, so a stale card can never double-charge
  const owned =
    item.kind === "character"
      ? isCharacterOwned(save, item.value)
      : (save.unlockedPalettes || []).includes(item.value);
  if (item.owned || owned) return { ok: false, message: "ALREADY OWNED" };

  const orbs = save.orbs || 0;
  if (orbs < item.price) return { ok: false, message: "NOT ENOUGH ORBS" };

  const patch = { orbs: orbs - item.price };
  if (item.kind === "character") {
    patch.unlockedCharacters = [...(save.unlockedCharacters || []), item.value];
  } else {
    patch.unlockedPalettes = [...(save.unlockedPalettes || []), item.value];
  }
  return { ok: true, save: writeSave(patch), message: `${item.name.toUpperCase()} UNLOCKED` };
}