/**
 * CUSTOMIZE PIECES — loadout screen controls: animated preview, frame picker,
 * armour swatches and weapon picker. Locked items (shop) show a padlock.
 */
import { useEffect, useRef, useState } from "react";
import { Crosshair, Lock, Sword, Zap } from "lucide-react";
import { drawChar, loadAssets } from "@/game/world";
import { ARMOR_PALETTES, LOCKED_PALETTES } from "@/game/palettes";
import { ABILITIES } from "@/game/core";

export { ARMOR_PALETTES };

/** Index 0 is always the character's own default colours. */
export function armorIndex(armor, frame) {
  if (!armor) return 0;
  if (frame && armor.body === frame.body) return 0;
  const found = ARMOR_PALETTES.findIndex((palette) => palette.body === armor.body);
  return found >= 0 ? found + 1 : 0;
}

export function SpritePreview({ character, armor, size = 132 }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    loadAssets().then((assets) => {
      if (cancelled) return;
      setReady(true);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const start = performance.now();
      const render = (now) => {
        const time = (now - start) / 1000;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(75,227,255,0.08)";
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height - 10, 38, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        drawChar(ctx, assets, character, "idle", time, 6, 8, canvas.width - 12, canvas.height - 22, false, armor);
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [character, armor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pa-canvas transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
      style={{ width: size, height: size }}
    />
  );
}

export function CharacterSelect({ characters, index, onSelect, active, lockedIndexes = [] }) {
  return (
    <div className={`border p-3 transition-colors ${active ? "border-[#4be3ff]/70 bg-[#4be3ff]/[0.06]" : "border-[#2a2f52]"}`}>
      <div className="flex items-center justify-between">
        <p className="pa-pixel text-[8px] text-[#c6d2f2]/50">FRAME</p>
        <p className="pa-pixel text-[8px] text-white">
          {index + 1} / {characters.length}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {characters.map((character, i) => {
          const locked = lockedIndexes.includes(i);
          return (
            <button
              key={character.id}
              type="button"
              onClick={() => onSelect(i)}
              className={`relative border px-2 py-2 text-left transition-colors ${
                i === index ? "border-[#ff3d8b] bg-[#ff3d8b]/10" : "border-[#2a2f52] hover:border-[#4be3ff]/60"
              } ${locked ? "opacity-60" : ""}`}
            >
              {locked ? <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-[#ffd166]" /> : null}
              <p className="pa-pixel text-[7px] text-white">{character.name}</p>
              <p className="mt-1 text-[10px] leading-tight text-[#c6d2f2]/45">
                {locked ? "BUY IN SHOP" : character.blurb.split(".")[0]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ArmorSwatches({ palettes, index, onSelect, active, armor, onColorChange }) {
  return (
    <div className={`border p-3 transition-colors ${active ? "border-[#4be3ff]/70 bg-[#4be3ff]/[0.06]" : "border-[#2a2f52]"}`}>
      <div className="flex items-center justify-between">
        <p className="pa-pixel text-[8px] text-[#c6d2f2]/50">CUSTOM RGB PALETTE</p>
        <p className="pa-pixel text-[8px] text-white">{palettes[index]?.name}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {palettes.map((palette, i) => (
          <button
            key={palette.name}
            type="button"
            onClick={() => onSelect(i, palette)}
            aria-label={`${palette.name} armor${palette.locked ? " (locked)" : ""}`}
            className={`relative h-9 w-9 border-2 transition-transform ${
              i === index ? "scale-105 border-white" : "border-transparent hover:scale-105"
            }`}
            style={{ background: `linear-gradient(135deg, ${palette.body}, ${palette.accent}, ${palette.glow || "#fff6c9"})` }}
          >
            {i === index ? <span className="absolute inset-0 border border-[#05060d]" /> : null}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["body", "ARMOR"],
          ["accent", "PLATE"],
          ["glow", "GLOW"],
        ].map(([key, label]) => (
          <label key={key} className="flex min-w-0 flex-col gap-1">
            <span className="pa-pixel text-[6px] text-[#c6d2f2]/50">{label}</span>
            <input
              type="color"
              value={armor[key] || "#ffffff"}
              onChange={(event) => onColorChange(key, event.target.value)}
              aria-label={`${label} color`}
              className="h-9 w-full cursor-pointer border border-[#2a2f52] bg-transparent p-1"
            />
            <span className="pa-pixel text-[5px] text-[#c6d2f2]/35">{armor[key]?.toUpperCase()}</span>
          </label>
        ))}
      </div>
      <p className="pa-pixel mt-2 text-[6px] text-[#c6d2f2]/30">
        {Object.keys(LOCKED_PALETTES).length} SHOP PRESETS · CUSTOM COLORS ALWAYS AVAILABLE
      </p>
    </div>
  );
}

export function AbilitySelect({ unlocked, loadout, onToggle, onRankChange, active, focusedId }) {
  const abilities = Object.keys(ABILITIES).filter((id) => Number(unlocked[id]) > 0);

  return (
    <div className={`border p-3 transition-colors ${active ? "border-[#4be3ff]/70 bg-[#4be3ff]/[0.06]" : "border-[#2a2f52]"}`}>
      <div className="flex items-center justify-between">
        <p className="pa-pixel text-[8px] text-[#c6d2f2]/50">ABILITY LOADOUT</p>
        <p className="pa-pixel text-[6px] text-[#7af6c8]/70">{loadout.length} EQUIPPED · NO LIMIT</p>
      </div>
      {abilities.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {abilities.map((id) => {
            const ability = ABILITIES[id];
            const unlockedRank = Number(unlocked[id]) || 1;
            const equippedRank = loadout.find((entry) => entry.id === id)?.rank;
            return (
              <div
                key={id}
                className={`border bg-black/20 p-2.5 ${
                  focusedId === id ? "border-[#ffd166]/70" : "border-[#2a2f52]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pa-pixel text-[7px] text-white">{ability.name}</p>
                    <p className="mt-1 text-[10px] leading-snug text-[#c6d2f2]/45">{ability.blurb}</p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={Boolean(equippedRank)}
                    onClick={() => onToggle(id)}
                    className={`pa-pixel shrink-0 border px-2 py-1 text-[6px] ${
                      equippedRank
                        ? "border-[#7af6c8]/70 bg-[#7af6c8]/10 text-[#7af6c8]"
                        : "border-[#2a2f52] text-[#c6d2f2]/45 hover:border-[#7af6c8]/60"
                    }`}
                  >
                    {equippedRank ? "EQUIPPED" : "EQUIP"}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {[1, 2].filter((rank) => rank <= unlockedRank).map((rank) => (
                    <button
                      key={rank}
                      type="button"
                      aria-pressed={equippedRank === rank}
                      onClick={() => onRankChange(id, rank)}
                      className={`pa-pixel border px-2 py-1 text-[6px] ${
                        equippedRank === rank
                          ? "border-[#4be3ff] text-[#4be3ff]"
                          : "border-[#2a2f52] text-[#c6d2f2]/40 hover:text-white"
                      }`}
                    >
                      RANK {rank}
                    </button>
                  ))}
                  {unlockedRank > 1 ? <span className="pa-pixel text-[5px] text-[#ffd166]/60">RANK 2 UNLOCKED</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs tracking-wide text-[#c6d2f2]/40">Select a frame or clear a rift to unlock abilities.</p>
      )}
    </div>
  );
}

function WeaponIcon({ category, color }) {
  const Icon = category === "melee" ? Sword : category === "mid" ? Zap : Crosshair;
  return (
    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center border" style={{ borderColor: color, color }}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export function WeaponSelect({ title, value, onChange, active, types, order, lockedIds = [] }) {
  return (
    <div className={`border p-3 transition-colors ${active ? "border-[#4be3ff]/70 bg-[#4be3ff]/[0.06]" : "border-[#2a2f52]"}`}>
      <p className="pa-pixel text-[8px] text-[#c6d2f2]/50">{title}</p>
      <div className="mt-3 space-y-1.5">
        {order.map((id) => {
          const type = types[id];
          const selected = value === id;
          const locked = lockedIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative flex w-full items-start gap-2.5 border px-2.5 py-2 text-left transition-colors ${
                selected ? "border-[#4be3ff] bg-[#4be3ff]/10" : "border-[#2a2f52] hover:border-[#4be3ff]/50"
              } ${locked ? "opacity-60" : ""}`}
            >
              <WeaponIcon category={type.category} color={type.color} />
              <span className="min-w-0 flex-1">
                <span className="pa-pixel block text-[8px] text-white">
                  {type.name} <span className="text-[#c6d2f2]/35">· {type.range}</span>
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-[#c6d2f2]/50">{type.description}</span>
                <span className="pa-pixel mt-1 block text-[6px] text-[#7af6c8]/70">
                  {type.maxAmmo ? `${type.maxAmmo} SHOTS` : "∞ MELEE"} · {type.damage} DMG
                </span>
              </span>
              {locked ? (
                <span className="pa-pixel flex shrink-0 items-center gap-1 text-[6px] text-[#ffd166]">
                  <Lock className="h-2.5 w-2.5" /> SHOP
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
