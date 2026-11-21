/**
 * GAME HUD — compact tactical overlay. Everything is drawn from engine.buildHud():
 * HP, lives, resonance shards, ammo, coins, boss health, dash pips and loadout.
 */
import { Coins, Gem, Heart, RotateCcw, Shield, Zap, Clock3, Trophy, Star } from "lucide-react";
import PixelFontText from "@/components/game/PixelFontText";
import WeaponSprite from "@/components/game/WeaponSprite";
import { ABILITIES, WEAPONS } from "@/game/core";

function Pip({ on, className = "" }) {
  return <span className={`h-1.5 w-3 ${on ? "bg-[#4be3ff]" : "bg-white/15"} ${className}`} />;
}

export default function GameHud({ hud, onReload, timer = 0, score = 0, retryGems = 0, arcade = false, challengeMode = false, hudSettings = {} }) {
  if (!hud) return null;
  const healthPct = Math.max(0, Math.min(1, hud.health / hud.maxHealth));
  const bossPct = hud.bossMax ? Math.max(0, Math.min(1, hud.bossHp / hud.bossMax)) : 0;
  const elapsed = Math.max(0, Math.floor(Number(timer) || 0));
  const timerMinutes = Math.floor(elapsed / 60);
  const timerSeconds = elapsed % 60;
  const timerText = `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`;
  const accents = { cyan: "#4be3ff", violet: "#a78bfa", amber: "#ffd166", mint: "#7af6c8" };
  const accent = accents[hudSettings.accent] || accents.cyan;
  const scales = { compact: 0.88, standard: 1, large: 1.12 };
  const scale = scales[hudSettings.scale] || scales.standard;
  const opacity = Math.max(0.55, Math.min(1, Number(hudSettings.opacity) || 0.92));

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" style={{ opacity, transform: `scale(${scale})`, transformOrigin: "top center" }}>
      {/* ---------- TOP BAR ---------- */}
      <div className="pa-hud-top absolute inset-x-0 top-0 bg-gradient-to-b from-[#05060d]/90 via-[#05060d]/45 to-transparent px-[clamp(6px,2vw,16px)] pb-4 pt-[clamp(6px,1.5vh,12px)]">
        <div className="flex items-start gap-[clamp(4px,1.2vw,12px)]">
          {/* HP + lives */}
          <div className="pa-hud-health min-w-0 flex-1 sm:max-w-[290px]">
            <div className="relative border bg-[#060a16]/80 px-2 py-1.5" style={{ borderColor: `${accent}55`, boxShadow: `inset 0 0 16px ${accent}08` }}>
              <span className="absolute -left-px -top-px h-2 w-2 border-l border-t" style={{ borderColor: accent }} />
              <span className="absolute -bottom-px -right-px h-2 w-2 border-b border-r" style={{ borderColor: accent }} />
              <div className="flex items-center justify-between">
                <span className="pa-pixel flex items-center gap-1 text-[9px]" style={{ color: accent }}>
                  <Shield className="h-3.5 w-3.5" />
                  <PixelFontText text="HP" className="text-[9px]" style={{ color: accent }} spacing={0.04} />
                </span>
                <span className="pa-pixel text-[10px] text-white">
                  {Math.ceil(hud.health)}
                  <span className="text-white/30">/{hud.maxHealth}</span>
                </span>
              </div>
              <div className="relative mt-1.5 h-3.5 w-full border border-[#05060d] bg-[#0a0d1c]">
                <div
                  className="h-full transition-[width] duration-150"
                  style={{ width: `${healthPct * 100}%`, background: `linear-gradient(90deg, #1d8fb5, ${accent}, #7af6c8)` }}
                />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_8px,#05060d_8px_10px)] opacity-60" />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.max(0, hud.lives) }).map((_, i) => (
                    <Heart key={i} className="h-3.5 w-3.5 fill-[#ff3d8b] text-[#ff3d8b]" />
                  ))}
                </div>
                {!arcade && !challengeMode ? <div className="flex items-center gap-0.5">
                  {hud.stage === 10 ? (
                    <>
                      <Gem
                        className="h-3.5 w-3.5"
                        style={{
                          color: hud.collected ? "#ffd166" : "rgba(255,255,255,0.2)",
                          fill: hud.collected ? "#ffd166" : "transparent",
                        }}
                      />
                      <span className="pa-pixel ml-1 text-[7px] text-[#ffd166]">
                        {hud.collected}/1 GRAND GEM
                      </span>
                    </>
                  ) : (
                    <>
                      {Array.from({ length: 6 }).map((_, i) => (
                        hud.starCurrency ? <Star
                          key={i}
                          className="h-3.5 w-3.5"
                          style={{
                            color: i < hud.shards ? hud.accent : "rgba(255,255,255,0.2)",
                            fill: i < hud.shards ? hud.accent : "transparent",
                          }}
                        /> : <Gem
                          key={i}
                          className="h-3.5 w-3.5"
                          style={{ color: i < hud.shards ? hud.accent : "rgba(255,255,255,0.2)", fill: i < hud.shards ? hud.accent : "transparent" }}
                        />
                      ))}
                      <span className="pa-pixel ml-1 text-[7px]" style={{ color: hud.accent }}>
                        {hud.collected}/{hud.totalShards} {hud.starCurrency ? "STARS" : "SHARDS"}
                      </span>
                    </>
                  )}
                </div> : <span className="pa-pixel text-[6px] tracking-widest" style={{ color: accent }}>{arcade ? "ARCADE RUN" : "TRIAL RUN"}</span>}
              </div>
            </div>

            {hud.coinsTotal ? (
              <div className="pa-hud-secondary mt-1.5 inline-flex items-center gap-1.5 border border-[#ffd166]/30 bg-[#1a1405]/80 px-2 py-1">
                <Coins className="h-3.5 w-3.5 text-[#ffd166]" />
                <span className="pa-pixel text-[9px] text-[#ffd166]">
                  {hud.coins}/{hud.coinsTotal}
                </span>
                <PixelFontText text="COINS" className="text-[7px] text-[#ffd166]/60" spacing={0.04} />
              </div>
            ) : null}
          </div>

          <div className="pa-hud-center min-w-0 flex-1 text-center">
            <div className="inline-flex items-center gap-2 border border-white/10 bg-[#060a16]/70 px-2.5 py-1">
              <PixelFontText
                text={`S${String(hud.stage).padStart(2, "0")}`}
                className="text-[9px]"
                style={{ color: hud.accent }}
                spacing={0.04}
              />
              <span className="h-2.5 w-px bg-white/15" />
              <span className="pa-pixel max-w-[140px] truncate text-[9px] text-white sm:max-w-none">{hud.stageName}</span>
              {hud.dual ? (
                <PixelFontText text="DUAL" className="border border-[#ff3d8b]/50 px-1 text-[7px] text-[#ff3d8b]" spacing={0.04} />
              ) : null}
            </div>
            <div className="mt-1.5 flex justify-center gap-1.5">
              <div className="pa-hud-metric flex min-w-[64px] items-center gap-1.5 border px-2 py-1" style={{ borderColor: `${accent}66`, backgroundColor: `rgba(6,10,22,${opacity * 0.9})` }}>
                <Clock3 className="h-3 w-3 shrink-0" style={{ color: accent }} />
                <span className="min-w-0"><span className="pa-pixel block text-[5px] tracking-widest text-[#c6d2f2]/45">TIME</span><span className="pa-pixel block font-mono text-[8px] text-white">{timerText}</span></span>
              </div>
              <div className="pa-hud-metric flex min-w-[64px] items-center gap-1.5 border px-2 py-1" style={{ borderColor: `${accent}66`, backgroundColor: `rgba(6,10,22,${opacity * 0.9})` }}>
                <Trophy className="h-3 w-3 shrink-0" style={{ color: accent }} />
                <span className="min-w-0"><span className="pa-pixel block text-[5px] tracking-widest text-[#c6d2f2]/45">SCORE</span><span className="pa-pixel block font-mono text-[8px] text-white">{Math.max(0, Number(score) || 0).toLocaleString()}</span></span>
              </div>
            </div>
            {hud.bossVisible ? (
              <div className="mx-auto mt-1.5 w-[190px] max-w-full sm:w-[300px]">
                <div className="flex items-center justify-between">
                  <span className="pa-pixel flex items-center gap-1 text-[8px] text-[#ff3d8b]">
                    {hud.ultimateBoss ? "ECLIPSE CORE" : "VOID CORE"}
                    {hud.bossPhase === 3 ? <span className="border border-[#7af6c8]/60 bg-[#7af6c8]/15 px-1 text-[7px] text-[#7af6c8]">PHASE 3</span> : null}
                    {hud.bossPhase === 2 ? (
                      <span className="border border-[#ff9f45]/60 bg-[#ff9f45]/15 px-1 text-[7px] text-[#ff9f45]">PHASE 2</span>
                    ) : null}
                    {hud.bossShielded ? (
                      <span className="border border-[#4be3ff]/60 bg-[#4be3ff]/15 px-1 text-[7px] text-[#4be3ff]">
                        SHIELDED
                      </span>
                    ) : null}
                  </span>
                  <span className="pa-pixel text-[8px] text-[#c6d2f2]/50">{Math.ceil(bossPct * 100)}%</span>
                </div>
                <div className="relative mt-1 h-3 border border-[#05060d] bg-[#160a18]">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff3d8b] via-[#ff7ab0] to-[#ffd166] transition-[width] duration-150"
                    style={{ width: `${bossPct * 100}%` }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-black/50" />
                </div>
              </div>
            ) : null}
          </div>
          <div className="pa-hud-extra flex flex-1 flex-col items-end sm:max-w-[120px]">
            <div className="flex items-center gap-1.5">
              <Zap className={`h-3.5 w-3.5 ${hud.dashReady ? "text-[#4be3ff]" : "text-white/20"}`} />
              <span className={`pa-pixel text-[9px] ${hud.dashReady ? "text-[#4be3ff]" : "text-white/25"}`}>
                {hud.dashReady ? "DASH" : "•••"}
              </span>
            </div>
            <div className="mt-1 flex gap-0.5">
              <Pip on={hud.dashReady} className="h-1.5 w-3" />
              <Pip on={hud.dashReady} className="h-1.5 w-3" />
              <Pip on={hud.dashReady} className="h-1.5 w-3" />
            </div>
            {hud.abilities?.length ? (
              <div className="mt-1 hidden flex-wrap justify-end gap-0.5 sm:flex">
                {hud.abilities.map((id) => (
                  <span
                    key={id}
                    title={ABILITIES[id]?.blurb}
                    className="pa-pixel border border-[#7af6c8]/40 bg-[#7af6c8]/10 px-1 py-0.5 text-[5px] text-[#7af6c8]"
                  >
                    {ABILITIES[id]?.glyph}
                  </span>
                ))}
              </div>
            ) : null}
            {arcade ? <div className="pa-hud-metric mt-1.5 flex items-center gap-1 border border-[#ffd166]/45 bg-[#100d08]/85 px-2 py-1"><Gem className="h-3 w-3 text-[#ffd166]"/><span className="pa-pixel text-[6px] text-[#ffd166]">RETRY {retryGems}</span></div> : null}
          </div>
        </div>
      </div>

      {hud.phaseAlert ? (
        <div className="absolute inset-x-0 top-[42%] flex justify-center">
          <div className="pa-pixel border-y-2 border-[#ff9f45] bg-[#090b16]/90 px-8 py-3 text-center text-sm tracking-[0.3em] text-[#ffbf75] shadow-[0_0_40px_#ff9f4555] sm:px-14 sm:py-4 sm:text-xl">
            PHASE {hud.phaseAlertLevel || 2}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onReload}
        disabled={!hud.reloadReady}
        aria-label={`${hud.reloadLabel || "Reload"}: ${hud.reloadsUsed}/${hud.reloadLimit} used`}
        className={`pointer-events-auto absolute right-2 top-[76px] z-30 flex min-h-8 min-w-[72px] items-center justify-center gap-1 border px-1.5 py-1 backdrop-blur-sm transition-colors sm:right-4 sm:top-[84px] ${
          hud.reloadReady
            ? "border-[#7af6c8]/70 bg-[#07140f]/90 text-[#7af6c8] hover:bg-[#7af6c8]/20"
            : "border-white/10 bg-[#060a16]/70 text-white/25"
        }`}
      >
        <RotateCcw className="h-3 w-3" />
        <span className="pa-pixel text-[6px]">{hud.reloadLabel || "RELOAD"}</span>
        <span className="pa-pixel text-[5px]">R{hud.reloadsUsed}/{hud.reloadLimit}</span>
      </button>

      <div className="pa-desktop-only absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-[#05060d]/90 to-transparent px-3 pb-2 pt-5 sm:block">
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-stretch gap-1.5">
            {hud.weapons.map((weapon, i) => {
              const info = WEAPONS[weapon];
              const active = i === hud.slot;
              const belt = active ? hud.ammo : null;
              const pct = active && hud.maxAmmo ? (belt || 0) / hud.maxAmmo : 0;
              return (
                <div
                  key={`${weapon}-${i}`}
                  className={`relative border px-3 py-2 ${
                    active ? "min-w-[240px] sm:min-w-[340px]" : "min-w-[95px]"
                  } ${
                    active ? "border-[#4be3ff] bg-[#4be3ff]/12" : "border-white/10 bg-black/40"
                  }`}
                >
                  <span className={`absolute left-0 top-0 h-full w-0.5 ${active ? "bg-[#4be3ff]" : "bg-white/10"}`} />
                  <div className="flex items-center justify-between gap-2">
                    <span className={`pa-pixel text-[5px] ${active ? "text-[#4be3ff]" : "text-white/30"}`}>
                      {i === 0 ? "PRIMARY" : "SECONDARY"}
                    </span>
                    <WeaponSprite sprite={info?.sprite} size={20} label={`${info?.name || weapon} equipped`} />
                  </div>
                  <p className={`pa-pixel mt-0.5 text-[7px] ${active ? "text-white" : "text-white/45"}`}>
                    {info?.name || weapon}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {active && hud.maxAmmo ? (
                      <>
                        <div className="h-3 flex-1 min-w-[150px] bg-[#0a0d1c]">
                          <div
                            className={`h-full ${hud.ammoEmpty ? "bg-[#ff3d8b]" : "bg-[#ffd166]"}`}
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                        <span className={`pa-pixel min-w-[42px] text-right text-[8px] font-bold ${hud.ammoEmpty ? "text-[#ff3d8b]" : "text-[#ffd166]"}`}>
                          {hud.ammoEmpty ? "EMPTY" : `${belt}`}
                        </span>
                      </>
                    ) : (
                      <span className="pa-pixel text-[5px] font-bold text-[#7af6c8]/70">
                        {info?.maxAmmo ? "AMMO" : "∞ MELEE"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 pb-0.5">
            <Gem className="h-2.5 w-2.5 text-[#ffd166]/60" />
            <span className="pa-pixel text-[5px] text-[#c6d2f2]/25">PROJECT: RESONANCE</span>
          </div>
        </div>
      </div>

      {hud.respawning ? <div className="absolute inset-0 bg-[#05060d]/70" /> : null}
    </div>
  );
}
