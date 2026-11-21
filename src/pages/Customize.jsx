import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Gem, Play, ShoppingBag, Zap } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import {
  AbilitySelect,
  ARMOR_PALETTES,
  ArmorSwatches,
  CharacterSelect,
  SpritePreview,
  WeaponSelect,
} from "@/components/customize/CustomizePieces";
import {
  ABILITIES,
  CHARACTERS,
  DUAL,
  MAX_HEALTH,
  WEAPON_ORDER,
  SECRET_WEAPONS,
  WEAPON_TYPES,
  clearSave,
  createDefaultSave,
  loadSave,
  normalizeAbilityLoadout,
  isWeaponOwned,
  sfx,
  writeSave,
} from "@/game/core";

const ROWS = ["character", "armor", "primary", "secondary", "abilities", "start"];

export default function Customize() {
  const navigate = useNavigate();
  const isNew = new URLSearchParams(window.location.search).get("new") === "1";
  const [initial] = useState(() => {
    const existing = isNew ? null : loadSave();
    return { save: existing || createDefaultSave(), existingSave: Boolean(existing) };
  });
  const save = initial.save;
  const isExistingSave = initial.existingSave;
  const initialCharacter = CHARACTERS[save.character] ? save.character : 0;

  const [character, setCharacter] = useState(initialCharacter);
  const [armor, setArmor] = useState(() => ({
    body: CHARACTERS[initialCharacter].body,
    accent: CHARACTERS[initialCharacter].accent,
    glow: CHARACTERS[initialCharacter].glow,
    ...(isNew ? {} : save.armor),
  }));
  const [palettePick, setPalettePick] = useState(0);
  const [primary, setPrimary] = useState(WEAPON_TYPES[save.primary] ? save.primary : "buster");
  const [secondary, setSecondary] = useState(WEAPON_TYPES[save.secondary] ? save.secondary : "blade");
  const [abilityLoadout, setAbilityLoadout] = useState(() =>
    isNew
      ? [{ id: CHARACTERS[save.character || 0].startingAbility, rank: 1 }]
      : normalizeAbilityLoadout(save.abilityLoadout, save.abilities)
  );
  const [abilityCursor, setAbilityCursor] = useState(0);
  const [focus, setFocus] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [notice, setNotice] = useState("");

  const frame = CHARACTERS[character];
  const palettes = [
    { name: `${frame.name} Default`, body: frame.body, accent: frame.accent, glow: frame.glow },
    ...ARMOR_PALETTES.map((palette) => ({ ...palette, glow: palette.glow || "#fff6c9", locked: false })),
  ];
  const unlockedAbilities = { ...(save.abilities || {}) };
  if (!Number(unlockedAbilities[frame.startingAbility])) unlockedAbilities[frame.startingAbility] = 1;
  const abilityIds = Object.keys(ABILITIES).filter((id) => Number(unlockedAbilities[id]) > 0);
  const dual = primary === secondary;
  const maxHealth = dual ? DUAL.health : MAX_HEALTH;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  const chooseCharacter = (index) => {
    if (isExistingSave) {
      setNotice("CHARACTER LOCKED ON THIS SAVE — START A NEW SAVE TO CHANGE FRAME");
      return;
    }
    setCharacter(index);
    setPalettePick(0);
    setAbilityCursor(0);
    setArmor({ body: CHARACTERS[index].body, accent: CHARACTERS[index].accent, glow: CHARACTERS[index].glow });
    if (isNew) {
      setAbilityLoadout((current) => {
        const alreadyUnlocked = current.filter((entry) => Number(save.abilities?.[entry.id]) > 0);
        return alreadyUnlocked.length
          ? alreadyUnlocked
          : [{ id: CHARACTERS[index].startingAbility, rank: 1 }];
      });
    }
  };

  const start = () => {
    if (leaving) return;
    sfx("select");
    setLeaving(true);
    const loadout = normalizeAbilityLoadout(abilityLoadout, unlockedAbilities);
    if (isExistingSave) {
      writeSave({ character, armor, primary, secondary, abilityLoadout: loadout });
      setTimeout(() => navigate("/world"), 1600);
      return;
    }
    clearSave();
    writeSave({ character, armor, primary, secondary, abilityLoadout: loadout });
    setTimeout(() => navigate("/stage/1"), 1000);
  };

  useEffect(() => {
    const pickPalette = (dir) => {
      const next = (palettePick + dir + palettes.length) % palettes.length;
      setPalettePick(next);
      setArmor({ body: palettes[next].body, accent: palettes[next].accent, glow: palettes[next].glow });
    };
    const pickWeapon = (current, setter, dir) => {
      const available = WEAPON_ORDER.filter((id) => isWeaponOwned(save, id));
      const idx = available.indexOf(current);
      setter(available[(idx + dir + available.length) % available.length]);
    };
    const toggleAbility = (id) => {
      setAbilityLoadout((current) =>
        current.some((entry) => entry.id === id)
          ? current.filter((entry) => entry.id !== id)
          : [...current, { id, rank: 1 }]
      );
    };

    const cycle = (dir) => {
      const row = ROWS[focus];
      if (row === "character") {
        if (isExistingSave) {
          setNotice("CHARACTER LOCKED ON THIS SAVE — START A NEW SAVE TO CHANGE FRAME");
          return;
        }
        chooseCharacter((character + dir + CHARACTERS.length) % CHARACTERS.length);
      } else if (row === "armor") pickPalette(dir);
      else if (row === "primary") pickWeapon(primary, setPrimary, dir);
      else if (row === "secondary") pickWeapon(secondary, setSecondary, dir);
      else if (row === "abilities" && abilityIds.length) {
        setAbilityCursor((abilityCursor + dir + abilityIds.length) % abilityIds.length);
      } else start();
    };

    const onKey = (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) return;
      if (
        (event.key === "Enter" || event.key === " ") &&
        event.target instanceof HTMLElement &&
        event.target.closest("button, input")
      ) return;
      event.preventDefault();
      if (event.key === "ArrowUp") {
        sfx("move");
        setFocus((f) => (f - 1 + ROWS.length) % ROWS.length);
      } else if (event.key === "ArrowDown") {
        sfx("move");
        setFocus((f) => (f + 1) % ROWS.length);
      } else if (event.key === "ArrowLeft") {
        sfx("move");
        cycle(-1);
      } else if (event.key === "ArrowRight") {
        sfx("move");
        cycle(1);
      } else if (event.key === "Enter" || event.key === " ") {
        if (ROWS[focus] === "start") start();
        else if (ROWS[focus] === "abilities" && abilityIds.length) {
          toggleAbility(abilityIds[abilityCursor % abilityIds.length]);
        }
        else cycle(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleCharacter = (index) => {
    sfx("move");
    chooseCharacter(index);
  };

  const handlePalette = (index, palette) => {
    sfx("move");
    setPalettePick(index);
    setArmor({ body: palette.body, accent: palette.accent, glow: palette.glow });
  };

  const handleWeapon = (id, setter) => {
    sfx("move");
    if (!isWeaponOwned(save, id)) {
      setNotice("LOCKED WEAPON · BUY IT IN THE SHOP");
      return;
    }
    setter(id);
  };

  const handleAbilityRank = (id, rank) => {
    setAbilityLoadout((current) => [
      ...current.filter((entry) => entry.id !== id),
      { id, rank },
    ]);
  };

  return (
    <div className="pa-root relative min-h-screen overflow-x-hidden">
      <PixelBackdrop variant="purple" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="pa-pixel flex items-center gap-2 text-[8px] text-[#c6d2f2]/50 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" /> TITLE
            </button>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="pa-pixel flex items-center gap-1.5 border border-[#ffd166]/40 px-2 py-1 text-[7px] text-[#ffd166] hover:border-[#ffd166]"
            >
              <ShoppingBag className="h-3 w-3" /> SHOP
            </button>
            <span className="pa-pixel flex items-center gap-1 text-[7px] text-[#ffd166]/60">
              <Gem className="h-3 w-3" /> {save.orbs || 0}
            </span>
          </div>
          <div className="text-right">
            <p className="pa-pixel text-[8px] text-[#4be3ff]/70">LOADOUT HUB</p>
            <h1 className="pa-pixel mt-1 text-[10px] text-white sm:text-[13px]">CHARACTER CUSTOMIZATION</h1>
          </div>
        </header>

        <main className="grid flex-1 gap-4 py-5 lg:grid-cols-[360px_1fr]">
          <section className="pa-panel p-4">
            <div className="relative flex flex-col items-center border border-[#2a2f52] bg-[#070a18] py-4">
              <div className="absolute inset-0 opacity-25 pa-bg-tile pa-bg-tile--purple" />
              <SpritePreview character={frame.prefix} armor={armor} size={150} />
              <div className="relative mt-2 h-2 w-24 bg-[#1b2140] shadow-[0_0_20px_rgba(75,227,255,0.4)]" />
            </div>
            <div className="mt-3">
              <p className="pa-pixel text-[12px] text-white">{frame.name}</p>
              <p className="mt-2 text-sm leading-snug tracking-wide text-[#c6d2f2]/55">{frame.blurb}</p>
            </div>
            <div className="mt-3 space-y-2">
              <CharacterSelect
                characters={CHARACTERS}
                index={character}
                onSelect={handleCharacter}
                active={ROWS[focus] === "character"}
              />
              <ArmorSwatches
                palettes={palettes}
                index={palettePick}
                onSelect={handlePalette}
                active={ROWS[focus] === "armor"}
                armor={armor}
                onColorChange={(key, value) => setArmor((current) => ({ ...current, [key]: value }))}
              />
            </div>
          </section>

          <section className="grid content-start gap-3 sm:grid-cols-2">
            <WeaponSelect
              title="PRIMARY WEAPON"
              value={primary}
              onChange={(id) => handleWeapon(id, setPrimary)}
              active={ROWS[focus] === "primary"}
              types={WEAPON_TYPES}
              order={WEAPON_ORDER.filter((id) => !SECRET_WEAPONS.includes(id) || isWeaponOwned(save, id))}
              lockedIds={WEAPON_ORDER.filter((id) => (!SECRET_WEAPONS.includes(id) || isWeaponOwned(save, id)) && !isWeaponOwned(save, id))}
            />
            <WeaponSelect
              title="SECONDARY WEAPON"
              value={secondary}
              onChange={(id) => handleWeapon(id, setSecondary)}
              active={ROWS[focus] === "secondary"}
              types={WEAPON_TYPES}
              order={WEAPON_ORDER.filter((id) => !SECRET_WEAPONS.includes(id) || isWeaponOwned(save, id))}
              lockedIds={WEAPON_ORDER.filter((id) => (!SECRET_WEAPONS.includes(id) || isWeaponOwned(save, id)) && !isWeaponOwned(save, id))}
            />

            <div className="sm:col-span-2">
              <AbilitySelect
                unlocked={unlockedAbilities}
                loadout={abilityLoadout}
                onToggle={(id) =>
                  setAbilityLoadout((current) =>
                    current.some((entry) => entry.id === id)
                      ? current.filter((entry) => entry.id !== id)
                      : [...current, { id, rank: 1 }]
                  )
                }
                onRankChange={handleAbilityRank}
                active={ROWS[focus] === "abilities"}
                focusedId={abilityIds[abilityCursor % (abilityIds.length || 1)]}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="pa-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="pa-pixel text-[8px] text-[#c6d2f2]/40">DEPLOYMENT</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] tracking-wide text-[#c6d2f2]/65">
                    <span className="border border-[#4be3ff]/40 px-2 py-1 text-[#4be3ff]">
                      PRIMARY · {WEAPON_TYPES[primary]?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sfx("move");
                        setPrimary(secondary);
                        setSecondary(primary);
                      }}
                      title="Swap weapon slots"
                      className="pa-pixel flex items-center gap-1 border border-[#2a2f52] px-2 py-1 text-[6px] text-[#c6d2f2]/60 hover:border-[#4be3ff] hover:text-white"
                    >
                      <ArrowLeftRight className="h-3 w-3" /> SWAP
                    </button>
                    <span className="border border-[#ff3d8b]/40 px-2 py-1 text-[#ff3d8b]">
                      SECONDARY · {WEAPON_TYPES[secondary]?.name}
                    </span>
                    <span className="pa-pixel text-[7px] text-[#7af6c8]">{maxHealth} HP</span>
                  </div>
                  {dual ? (
                    <p className="pa-pixel mt-2 flex items-center gap-1.5 text-[7px] text-[#ffd166]">
                      <Zap className="h-3 w-3" /> DUAL WIELD: 1.5× FIRE RATE · +20% DAMAGE · 65% AMMO · 900 HP
                    </p>
                  ) : (
                    <p className="mt-2 text-[12px] tracking-wide text-[#c6d2f2]/50">
                      Pick the same weapon in both slots for a dual-wield build, or mix ranges for flexibility.
                    </p>
                  )}
                  {notice ? <p className="pa-pixel mt-2 text-[7px] text-[#ff3d8b]">{notice}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={start}
                  className={`pa-pixel flex shrink-0 items-center gap-2 px-5 py-3 text-[10px] transition-transform hover:scale-[1.02] ${
                    ROWS[focus] === "start" ? "bg-[#ff3d8b] text-[#05060d]" : "bg-[#4be3ff] text-[#05060d]"
                  }`}
                >
                  <Play className="h-3 w-3" /> {isExistingSave ? "SAVE LOADOUT" : "START MISSION"}
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.06] pt-3">
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/25">
            ↑↓ ROW · ←→ CYCLE · ENTER SELECT · CUSTOMIZE YOUR FRAME, COLORS, WEAPONS & ABILITIES
          </p>
        </footer>
      </div>

      {leaving ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04050b] px-5 py-8">
          <div className="pa-panel pa-fade-up w-full max-w-xl p-7 text-center sm:p-10">
            <p className="pa-pixel text-[8px] tracking-[0.25em] text-[#7af6c8]">
              {isExistingSave ? "LOADOUT UPDATED" : "MISSION INITIALIZED"}
            </p>
            <h2 className="pa-pixel mt-5 text-lg leading-relaxed text-white">
              {isExistingSave ? "CONFIGURATION SAVED" : "STAGE 01 — RUSTLINE RIDGE"}
            </h2>
            {isExistingSave ? (
              <>
                <p className="mt-4 text-sm tracking-wide text-[#c6d2f2]/55">Your custom frame, palette, weapons, and abilities are ready.</p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <p className="pa-pixel border border-[#4be3ff]/35 bg-[#4be3ff]/[0.05] px-3 py-3 text-[7px] text-[#4be3ff]">
                    PRIMARY · {WEAPON_TYPES[primary]?.name}
                  </p>
                  <p className="pa-pixel border border-[#ff3d8b]/35 bg-[#ff3d8b]/[0.05] px-3 py-3 text-[7px] text-[#ff3d8b]">
                    SECONDARY · {WEAPON_TYPES[secondary]?.name}
                  </p>
                </div>
                <p className="pa-pixel pa-blink mt-6 text-[7px] text-[#c6d2f2]/40">RETURNING TO WORLD MAP</p>
              </>
            ) : (
              <p className="pa-pixel pa-blink mt-6 text-[7px] text-[#c6d2f2]/40">PREPARING STAGE</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
