import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Gem, Play, ShoppingBag, Zap } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import {
  ARMOR_PALETTES,
  ArmorSwatches,
  CharacterSelect,
  SpritePreview,
  WeaponSelect,
  armorIndex,
} from "@/components/customize/CustomizePieces";
import {
  CHARACTERS,
  DUAL,
  WEAPON_ORDER,
  WEAPON_TYPES,
  clearSave,
  createDefaultSave,
  isCharacterOwned,
  isPaletteOwned,
  isWeaponOwned,
  loadSave,
  sfx,
  writeSave,
} from "@/game/core";

const ROWS = ["character", "armor", "primary", "secondary", "start"];

export default function Customize() {
  const navigate = useNavigate();
  const isNew = new URLSearchParams(window.location.search).get("new") === "1";
  const [initial] = useState(() => {
    const existing = isNew ? null : loadSave();
    return { save: existing || createDefaultSave(), existingSave: Boolean(existing) };
  });
  const save = initial.save;
  const isExistingSave = initial.existingSave;
  const rows = isExistingSave ? ["primary", "secondary", "start"] : ROWS;

  const [character, setCharacter] = useState(!isNew && isCharacterOwned(save, save.character) ? save.character || 0 : 0);
  const [armorPick, setArmorPick] = useState(() => (!isNew && !isExistingSave ? armorIndex(save.armor, CHARACTERS[save.character || 0]) : 0));
  const [primary, setPrimary] = useState(isWeaponOwned(save, save.primary) ? save.primary || "buster" : "buster");
  const [secondary, setSecondary] = useState(isWeaponOwned(save, save.secondary) ? save.secondary || "blade" : "blade");
  const [focus, setFocus] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [notice, setNotice] = useState("");

  const frame = CHARACTERS[character];
  // index 0 always follows the chosen frame's own default colours
  const palettes = [
    { name: "Default", body: frame.body, accent: frame.accent, locked: false },
    ...ARMOR_PALETTES.map((palette) => ({ ...palette, locked: !isPaletteOwned(save, palette.name) })),
  ];
  const armor = palettes[Math.min(armorPick, palettes.length - 1)] || palettes[0];
  const lockedChars = CHARACTERS.map((_, i) => !isCharacterOwned(save, i)).reduce((acc, locked, i) => (locked ? [...acc, i] : acc), []);
  const lockedWeapons = WEAPON_ORDER.filter((id) => !isWeaponOwned(save, id));
  const dual = primary === secondary;
  const maxHealth = dual ? DUAL.health : 1000;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  // keep the swatch index inside the palette list when the frame changes
  useEffect(() => {
    setArmorPick((i) => Math.min(i, palettes.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const cycleList = (length, current, dir, isLocked) => {
    for (let step = 1; step <= length; step += 1) {
      const next = (current + dir * step + length * 2) % length;
      if (!isLocked(next)) return next;
    }
    return current;
  };

  const start = () => {
    if (leaving) return;
    sfx("select");
    setLeaving(true);
    if (isExistingSave) {
      writeSave({ primary, secondary });
      setTimeout(() => navigate("/world"), 620);
      return;
    }
    clearSave();
    const chosen = palettes[armorPick]?.locked ? palettes[0] : armor;
    writeSave({ character, armor: { body: chosen.body, accent: chosen.accent }, primary, secondary });
    setTimeout(() => navigate("/stage/1"), 620);
  };

  useEffect(() => {
    const pickPalette = (dir) => {
      setArmorPick((i) => {
        const next = cycleList(palettes.length, i, dir, (n) => palettes[n].locked);
        if (next === i && palettes[(i + dir + palettes.length) % palettes.length]?.locked) {
          setNotice("PALETTE LOCKED — BUY IT IN THE SHOP");
          sfx("hurt");
        }
        return next;
      });
    };
    const pickWeapon = (current, setter, dir) => {
      const idx = WEAPON_ORDER.indexOf(current);
      const next = cycleList(WEAPON_ORDER.length, idx, dir, (n) => !isWeaponOwned(save, WEAPON_ORDER[n]));
      if (next === idx) setNotice("WEAPON LOCKED — COLLECT EVERY COIN IN STAGE 1, 3 OR 5");
      setter(WEAPON_ORDER[next]);
    };

    const cycle = (dir) => {
      const row = rows[focus];
      if (row === "character") {
        const next = cycleList(CHARACTERS.length, character, dir, (n) => !isCharacterOwned(save, n));
        if (next === character) {
          setNotice("FRAME LOCKED — BUY IT IN THE SHOP");
          sfx("hurt");
        }
        setCharacter(next);
      } else if (row === "armor") pickPalette(dir);
      else if (row === "primary") pickWeapon(primary, setPrimary, dir);
      else if (row === "secondary") pickWeapon(secondary, setSecondary, dir);
      else start();
    };

    const onKey = (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowUp") {
        sfx("move");
        setFocus((f) => (f - 1 + rows.length) % rows.length);
      } else if (event.key === "ArrowDown") {
        sfx("move");
        setFocus((f) => (f + 1) % rows.length);
      } else if (event.key === "ArrowLeft") {
        sfx("move");
        cycle(-1);
      } else if (event.key === "ArrowRight") {
        sfx("move");
        cycle(1);
      } else if (event.key === "Enter" || event.key === " ") {
        if (rows[focus] === "start") start();
        else cycle(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleCharacter = (index) => {
    if (isExistingSave) {
      setNotice("FRAME LOCKED — START A NEW GAME TO CHANGE IT");
      return;
    }
    if (!isCharacterOwned(save, index)) {
      sfx("hurt");
      setNotice("FRAME LOCKED — BUY IT IN THE SHOP");
      return;
    }
    sfx("move");
    setCharacter(index);
    setArmorPick(0);
  };

  const handlePalette = (index) => {
    if (isExistingSave) {
      setNotice("ARMOR LOCKED — START A NEW GAME TO CHANGE IT");
      return;
    }
    if (palettes[index]?.locked) {
      sfx("hurt");
      setNotice("PALETTE LOCKED — BUY IT IN THE SHOP");
      return;
    }
    sfx("move");
    setArmorPick(index);
  };

  const handleWeapon = (id, setter) => {
    if (!isWeaponOwned(save, id)) {
      sfx("hurt");
      setNotice("WEAPON LOCKED — COLLECT EVERY COIN IN STAGE 1, 3 OR 5");
      return;
    }
    sfx("move");
    setter(id);
  };

  return (
    <div className="pa-root relative min-h-screen overflow-hidden">
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
            <p className="pa-pixel text-[8px] text-[#4be3ff]/70">LOADOUT</p>
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
              {isExistingSave ? (
                <div className="border border-[#ff3d8b]/35 bg-[#ff3d8b]/[0.06] px-3 py-3">
                  <p className="pa-pixel text-[8px] text-[#ff3d8b]">FRAME & ARMOR LOCKED</p>
                  <p className="mt-2 text-xs leading-relaxed tracking-wide text-[#c6d2f2]/55">
                    Your character is fixed for this save. Start a new game to choose another character or armor.
                  </p>
                </div>
              ) : (
                <>
                  <CharacterSelect
                    characters={CHARACTERS}
                    index={character}
                    onSelect={handleCharacter}
                    active={rows[focus] === "character"}
                    lockedIndexes={lockedChars}
                  />
                  <ArmorSwatches palettes={palettes} index={armorPick} onSelect={handlePalette} active={rows[focus] === "armor"} />
                </>
              )}
            </div>
          </section>

          <section className="grid content-start gap-3 sm:grid-cols-2">
            <WeaponSelect
              title="PRIMARY WEAPON"
              value={primary}
              onChange={(id) => handleWeapon(id, setPrimary)}
              active={rows[focus] === "primary"}
              types={WEAPON_TYPES}
              order={WEAPON_ORDER}
              lockedIds={lockedWeapons}
            />
            <WeaponSelect
              title="SECONDARY WEAPON"
              value={secondary}
              onChange={(id) => handleWeapon(id, setSecondary)}
              active={rows[focus] === "secondary"}
              types={WEAPON_TYPES}
              order={WEAPON_ORDER}
              lockedIds={lockedWeapons}
            />

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
                      <Zap className="h-3 w-3" /> DUAL WIELD: DOUBLE FIRE RATE · +30% DAMAGE · HALF AMMO · 600 HP
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
                    rows[focus] === "start" ? "bg-[#ff3d8b] text-[#05060d]" : "bg-[#4be3ff] text-[#05060d]"
                  }`}
                >
                  <Play className="h-3 w-3" /> START MISSION
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.06] pt-3">
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/25">
            ↑↓ ROW · ←→ CYCLE · ENTER SELECT · {isExistingSave ? "ONLY WEAPONS CAN BE CHANGED" : "LOCKED ITEMS LIVE IN THE SHOP"}
          </p>
        </footer>
      </div>

      {leaving ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050b] transition-opacity duration-500">
          <div className="text-center">
            <p className="pa-pixel text-[8px] text-[#4be3ff]">LOADING</p>
            <p className="pa-pixel mt-4 text-[13px] text-white">STAGE 01 — RUSTLINE RIDGE</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}