/**
 * CUSTOMIZE PIECES — loadout screen controls: animated preview, frame picker,
 * armour swatches and weapon picker. Locked items (shop) show a padlock.
 */
import { useEffect, useRef, useState } from "react";
import { Crosshair, Lock, Sword, Zap } from "lucide-react";
import { drawChar, loadAssets } from "@/game/world";
import { ARMOR_PALETTES, LOCKED_PALETTES } from "@/game/palettes";

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

export function ArmorSwatches({ palettes, index, onSelect, active }) {
  return (
    <div className={`border p-3 transition-colors ${active ? "border-[#4be3ff]/70 bg-[#4be3ff]/[0.06]" : "border-[#2a2f52]"}`}>
      <div className="flex items-center justify-between">
        <p className="pa-pixel text-[8px] text-[#c6d2f2]/50">ARMOR PALETTE</p>
        <p className="pa-pixel text-[8px] text-white">{palettes[index]?.name}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {palettes.map((palette, i) => (
          <button
            key={palette.name}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${palette.name} armor${palette.locked ? " (locked)" : ""}`}
            className={`relative h-9 w-9 border-2 transition-transform ${
              i === index ? "scale-105 border-white" : "border-transparent hover:scale-105"
            }`}
            style={{ background: `linear-gradient(135deg, ${palette.body}, ${palette.accent})` }}
          >
            {i === index ? <span className="absolute inset-0 border border-[#05060d]" /> : null}
            {palette.locked ? (
              <span className="absolute inset-0 grid place-items-center bg-[#04050b]/65">
                <Lock className="h-3 w-3 text-[#ffd166]" />
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="pa-pixel mt-2 text-[6px] text-[#c6d2f2]/30">
        {Object.keys(LOCKED_PALETTES).length} PALETTES SOLD IN THE ORB EXCHANGE
      </p>
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
                  <Lock className="h-2.5 w-2.5" /> STAGE {type.unlock}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}