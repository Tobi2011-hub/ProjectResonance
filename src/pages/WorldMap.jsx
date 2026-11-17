import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Gem, Info, Lock, Play, ShieldAlert, ShoppingBag, Sparkles, X } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import PixelFontText from "@/components/game/PixelFontText";
import { LEVELS } from "@/game/world";
import {
  ABILITIES,
  CHALLENGE_WEAPONS,
  CHARACTERS,
  MAX_STARS,
  SECRET_ABILITIES,
  SECRET_STAGES,
  WEAPON_TYPES,
  isStageUnlocked,
  loadSave,
  sfx,
  stageStars,
  totalStars,
} from "@/game/core";

// One map node: icon (or padlock), shard badge and the selected tooltip.
function StageNode({ stage, name, x, y, accent, unlocked, cleared, shards, selected, onSelect, onOpen }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      {selected ? (
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 hidden w-max -translate-x-1/2 border border-[#4be3ff]/60 bg-[#070a18]/95 px-2.5 py-1.5 sm:block">
          <p className="pa-pixel text-[7px] text-white">{name}</p>
          <p className="pa-pixel mt-1 flex items-center gap-1 text-[7px]" style={{ color: accent }}>
            <Gem className="h-2.5 w-2.5 fill-current" /> Shards Found: {shards}/6
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onMouseEnter={onSelect}
        onFocus={onSelect}
        onClick={onOpen}
        aria-label={`Stage ${stage} ${unlocked ? "" : "(locked)"}`}
        style={selected ? { borderColor: accent, backgroundColor: `${accent}15`, boxShadow: `0 0 26px ${accent}55` } : undefined}
        className={`world-map__stage-node group relative grid h-11 w-11 touch-manipulation place-items-center border-2 transition-all duration-200 focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd166] sm:h-16 sm:w-16 ${
          selected
            ? "scale-110 border-[#4be3ff] bg-[#4be3ff]/15 shadow-[0_0_26px_rgba(75,227,255,0.5)]"
            : unlocked
            ? "border-[#2a2f52] bg-[#0c0e1c] hover:border-[#4be3ff]/60"
            : "border-[#1b2038] bg-[#080a14]"
        }`}
      >
        {unlocked ? (
          <PixelFontText
            text={String(stage).padStart(2, "0")}
            className={`flex-nowrap text-[14px] sm:text-[20px] ${cleared ? "opacity-100" : "opacity-80"}`}
            style={{ color: unlocked ? accent : undefined }}
            spacing={0.04}
          />
        ) : (
          <Lock className="h-4 w-4 text-[#c6d2f2]/25 sm:h-6 sm:w-6" />
        )}
        {unlocked && shards > 0 ? (
          <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 border border-[#2a2f52] bg-[#070a18] px-1 py-0.5">
            <Gem className="h-2 w-2 fill-current" style={{ color: accent }} />
            <span className="pa-pixel text-[6px]" style={{ color: accent }}>{shards}</span>
          </span>
        ) : null}
        {cleared ? <span className="absolute -right-1 -top-1 h-2 w-2 bg-[#7af6c8]" /> : null}
      </button>
    </div>
  );
}

const POSITIONS = [
  { x: 10, y: 84 },
  { x: 22, y: 68 },
  { x: 34, y: 80 },
  { x: 47, y: 60 },
  { x: 60, y: 74 },
  { x: 73, y: 52 },
  { x: 87, y: 64 },
  { x: 90, y: 38 },
  { x: 72, y: 21 },
  { x: 50, y: 12 },
];

export default function WorldMap() {
  const navigate = useNavigate();
  const [save, setSave] = useState(() => loadSave());
  const [selected, setSelected] = useState(() => (save ? Math.min(save.highestStage, 10) : 1));
  const [notice, setNotice] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!save) navigate("/customize?new=1");
  }, [save, navigate]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const level = LEVELS[selected - 1];
  const unlocked = isStageUnlocked(save, selected);
  const cleared = Boolean(save?.cleared?.includes(selected));
  const selectedShards = save?.stars?.[selected] || [];
  const grandGemCollected = Boolean(selectedShards[0]);
  const accent = level?.accent || "#4be3ff";

  const deploy = (stage = selected) => {
    if (!isStageUnlocked(save, stage)) {
      sfx("hurt");
      const target = LEVELS[stage - 1];
      if (target?.starOf) {
        setNotice(`VAULT LOCKED — COLLECT ALL SIX SHARDS ON STAGE ${String(target.starOf).padStart(2, "0")}`);
      } else if (target?.secretOf) {
        setNotice(`RIFT LOCKED — COLLECT FIVE SHARDS ON STAGE ${String(target.secretOf).padStart(2, "0")} IN ONE RUN`);
      } else {
        setNotice(`STAGE ${String(stage).padStart(2, "0")} LOCKED — CLEAR STAGE ${String(stage - 1).padStart(2, "0")} FIRST`);
      }
      return;
    }
    sfx("select");
    navigate(`/stage/${stage}`);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (detailsOpen && event.key === "Escape") {
        event.preventDefault();
        setDetailsOpen(false);
        return;
      }
      if (detailsOpen) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        sfx("move");
        setSelected((s) => Math.min(10, s + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        sfx("move");
        setSelected((s) => Math.max(1, s - 1));
      } else {
        setDetailsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsOpen, selected, save]);

  const pathPoints = useMemo(() => POSITIONS.map((p) => `${p.x},${p.y}`).join(" "), []);
  const secrets = SECRET_STAGES.map((id) => LEVELS[id - 1]);
  const abilities = Object.keys(save?.abilities || {}).filter((key) => save.abilities[key]);

  if (!save) return null;

  return (
    <div className="pa-root pa-world-map relative h-screen h-dvh overflow-hidden">
      <PixelBackdrop />
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-2 py-1.5 sm:px-8 sm:py-3">
        <header className="flex shrink-0 flex-col items-stretch gap-1.5 border-b border-white/[0.06] pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="pa-pixel flex min-h-[44px] min-w-[72px] touch-manipulation items-center gap-2 px-2 text-[8px] text-[#c6d2f2]/50 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
          >
            <ArrowLeft className="h-3 w-3" />
            <PixelFontText text="TITLE" className="text-[8px] text-[#c6d2f2]/50" spacing={0.04} />
          </button>
          <div className="grid grid-cols-3 items-center gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:gap-3">
            <PixelFontText text={CHARACTERS[save.character]?.name || ""} className="text-[10px] text-[#c6d2f2]/40" spacing={0.04} />
            <span className="pa-pixel flex items-center gap-1 text-[10px] text-[#4be3ff]">
              <Gem className="h-3.5 w-3.5" />
              <PixelFontText text={`${totalStars(save)}/${MAX_STARS}`} className="text-[10px] text-[#4be3ff]" spacing={0.04} />
            </span>
            <span className="pa-pixel flex items-center gap-1 text-[10px] text-[#ffd166]">
              <Gem className="h-3.5 w-3.5" />
              <PixelFontText text={String(save.orbs || 0)} className="text-[10px] text-[#ffd166]" spacing={0.04} />
            </span>
            <PixelFontText text={`STAGE ${save.highestStage}/10`} className="text-[10px] text-[#4be3ff]" spacing={0.04} />
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="pa-pixel flex min-h-[44px] touch-manipulation items-center justify-center gap-1 border border-[#ffd166]/50 px-2 py-1 text-[8px] text-[#ffd166] transition-colors hover:border-[#ffd166] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <PixelFontText text="SHOP" className="text-[10px] text-[#ffd166]" spacing={0.04} />
            </button>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-rows-[auto_minmax(130px,1fr)_auto_auto] gap-1.5 py-1.5 sm:grid-rows-[auto_minmax(150px,1fr)_auto_auto] sm:gap-2 sm:py-2">
          <div className="flex min-w-0 items-end justify-between">
            <div>
              <PixelFontText text="PROJECT: RESONANCE" className="text-[9px] tracking-[0.3em] text-[#4be3ff]/60" spacing={0.04} />
              <PixelFontText text="WORLD MAP" className="mt-2 text-[18px] text-white sm:text-[22px]" spacing={0.04} />
            </div>
            <p className="pa-pixel hidden shrink-0 whitespace-nowrap text-[7px] text-[#c6d2f2]/40 sm:block">
              ← → SELECT NODE · ENTER FOR DETAILS
            </p>
          </div>
          <div className="relative min-h-0 w-full">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={pathPoints} fill="none" stroke="#161b31" strokeWidth="10" vectorEffect="non-scaling-stroke" />
              <polyline
                points={pathPoints}
                fill="none"
                stroke="#2a3157"
                strokeWidth="2"
                strokeDasharray="6 8"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {LEVELS.slice(0, 10).map((stageLevel, i) => (
              <StageNode
                key={stageLevel.id}
                stage={stageLevel.id}
                name={stageLevel.name}
                accent={stageLevel.accent}
                x={POSITIONS[i].x}
                y={POSITIONS[i].y}
                unlocked={isStageUnlocked(save, stageLevel.id)}
                cleared={Boolean(save.cleared?.includes(stageLevel.id))}
                shards={stageStars(save, stageLevel.id)}
                selected={selected === stageLevel.id}
                onSelect={() => {
                  setSelected(stageLevel.id);
                  sfx("move");
                }}
                onOpen={() => {
                  setSelected(stageLevel.id);
                  setDetailsOpen(true);
                  sfx("select");
                }}
              />
            ))}
          </div>

          <div className="pa-panel flex shrink-0 flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div>
              <PixelFontText text={`STAGE ${String(selected).padStart(2, "0")}`} className="text-[10px] text-[#4be3ff]/60" spacing={0.04} />
              <p className="pa-pixel mt-2 text-[14px] text-white">{level.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[#c6d2f2]/45">
                <span className="flex items-center gap-1" style={{ color: accent }}>
                  <Gem className="h-3.5 w-3.5 fill-current" />
                  <PixelFontText text={`SHARDS FOUND: ${stageStars(save, selected)}/6`} className="text-[10px]" style={{ color: accent }} spacing={0.04} />
                </span>
                <span className="world-map__stage-meta">{cleared ? "Cleared" : unlocked ? "Ready" : "Locked"}</span>
                <span className="world-map__stage-meta">Primary {WEAPON_TYPES[save.primary]?.name}</span>
                <span className="world-map__stage-meta">Secondary {WEAPON_TYPES[save.secondary]?.name}</span>
                {level.challenge ? (
                  <span className="world-map__stage-meta text-[#ffd166]">
                    COIN CHALLENGE — 10/10 UNLOCKS {WEAPON_TYPES[CHALLENGE_WEAPONS[level.id]]?.name?.toUpperCase()}
                  </span>
                ) : null}
              </div>
              {notice ? <p className="pa-pixel mt-2 text-[7px] text-[#ff3d8b]">{notice}</p> : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/customize")}
                className="pa-pixel min-h-[44px] touch-manipulation border border-[#2a2f52] px-3 py-2 text-[9px] text-[#c6d2f2]/60 transition-colors hover:border-[#4be3ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] sm:px-4 sm:py-3"
              >
                LOADOUT
              </button>
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="pa-pixel flex min-h-[44px] touch-manipulation items-center justify-center gap-2 bg-[#4be3ff] px-4 py-2 text-[10px] text-[#05060d] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] sm:px-5 sm:py-3"
              >
                <Info className="h-3 w-3" />
                DETAILS
              </button>
            </div>
          </div>

          <div className="pa-panel min-w-0 shrink-0 p-2 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="pa-pixel flex items-center gap-2 text-[8px] text-[#7af6c8]">
                <Sparkles className="h-3 w-3" /> RIFT STAGES
              </p>
              <p className="pa-pixel hidden text-[7px] text-[#c6d2f2]/35 sm:block">FIVE SHARDS IN ONE RUN OPENS THE RIFT</p>
              <p className="pa-pixel text-[6px] text-[#c6d2f2]/35 sm:hidden">SWIPE FOR MORE</p>
            </div>
            <div className="world-map__secret-grid mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:pb-0">
              {secrets.map((secret, i) => {
                const open = isStageUnlocked(save, secret.id);
                const ability = ABILITIES[SECRET_ABILITIES[secret.id]];
                const owned = Boolean(save.abilities?.[SECRET_ABILITIES[secret.id]]);
                return (
                  <button
                    key={secret.id}
                    type="button"
                    onClick={() => {
                      setSelected(secret.id);
                      setDetailsOpen(true);
                      sfx("select");
                    }}
                    className={`group min-h-[48px] min-w-[132px] shrink-0 snap-start touch-manipulation border p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] sm:min-w-0 sm:shrink sm:p-3 ${
                      open
                        ? "border-[#7af6c8]/50 bg-[#7af6c8]/8 hover:border-[#7af6c8]"
                        : "border-[#1b2038] bg-[#080a14] hover:border-[#ff3d8b]/40"
                    }`}
                  >
                        <p className={`pa-pixel text-[7px] ${open ? "text-[#7af6c8]" : "text-[#c6d2f2]/25"}`}>
                      {secret.starOf ? `VAULT ${i - 4} · STAGE ${secret.id}` : `RIFT ${i + 1} · STAGE ${secret.id}`}
                    </p>
                        <p className={`pa-pixel mt-1.5 text-[8px] ${open ? "text-white" : "text-[#c6d2f2]/40"}`}>
                      {open ? secret.name.replace(/^(Rift|Vault): /, "") : "LOCKED"}
                    </p>
                    <p className={`mt-1.5 text-[11px] uppercase tracking-[0.14em] ${owned ? "text-[#ffd166]" : "text-[#c6d2f2]/35"}`}>
                      {ability?.name || "ORB CACHE"}
                    </p>
                    <p className="pa-pixel mt-1 text-[7px] text-[#c6d2f2]/25">
                      {secret.starOf
                        ? `SIX SHARDS ON STAGE ${secret.starOf}`
                        : owned
                        ? "ACQUIRED"
                        : `CLEAR STAGE ${secret.secretOf}`}
                    </p>
                  </button>
                );
              })}
            </div>
            {abilities.length ? (
              <p className="world-map__abilities pa-pixel mt-3 text-[7px] text-[#7af6c8]/70">
                ACTIVE ABILITIES: {abilities.map((key) => ABILITIES[key]?.name.toUpperCase()).join(" · ")}
              </p>
            ) : null}
          </div>
        </main>

        <footer className="hidden shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 sm:flex">
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/25">← → SELECT NODE · ENTER DETAILS</p>
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/20">3 LIVES PER STAGE · FLAWLESS CLEAR EARNS THE BONUS SHARD</p>
        </footer>
      </div>
      {detailsOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#03040a]/90 px-4 py-8">
          <section
            aria-label={`Stage ${selected} details`}
            aria-modal="true"
            className="pa-panel pa-fade-up relative w-full max-w-xl overflow-hidden p-5 sm:p-8"
            role="dialog"
          >
            <div className="pointer-events-none absolute inset-0 pa-scanlines opacity-40" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="pa-pixel text-[8px] tracking-[0.2em] text-[#4be3ff]">STAGE {String(selected).padStart(2, "0")}</p>
                  <h2 className="pa-pixel mt-3 text-[15px] leading-relaxed text-white sm:text-lg">{level.name}</h2>
                </div>
                <button
                  type="button"
                  aria-label="Close stage details"
                  onClick={() => setDetailsOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center border border-[#2a2f52] text-[#c6d2f2]/60 hover:border-[#4be3ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="border border-[#2a2f52] bg-[#070a18]/80 p-4">
                  <p className="pa-pixel text-[8px] text-[#c6d2f2]/55">
                    {selected === 10 ? "GRAND GEM" : "RESONANCE SHARDS"}
                  </p>
                  <p className="pa-pixel mt-3 flex items-center gap-2 text-[10px]" style={{ color: accent }}>
                    <Gem className="h-4 w-4 fill-current" />
                    {selected === 10
                      ? grandGemCollected ? "CLAIMED" : "NOT CLAIMED"
                      : `${selectedShards.slice(0, 5).filter(Boolean).length} / 5 FOUND`}
                  </p>
                  <div
                    className="mt-3 flex gap-2"
                    aria-label={selected === 10
                      ? `Grand gem ${grandGemCollected ? "claimed" : "not claimed"}`
                      : `${selectedShards.slice(0, 5).filter(Boolean).length} of 5 resonance shards found`}
                  >
                    {selected === 10 ? (
                      <Gem
                        className={`h-7 w-7 ${grandGemCollected ? "fill-current" : "text-[#2a2f52]"}`}
                        style={grandGemCollected ? { color: accent } : undefined}
                      />
                    ) : Array.from({ length: 5 }, (_, index) => (
                      <Gem
                        key={index}
                        className={`h-5 w-5 ${selectedShards[index] ? "fill-current" : "text-[#2a2f52]"}`}
                        style={selectedShards[index] ? { color: accent } : undefined}
                      />
                    ))}
                  </div>
                </div>
                <div className="border border-[#2a2f52] bg-[#070a18]/80 p-4">
                  <p className="pa-pixel text-[8px] text-[#c6d2f2]/55">DEATHLESS CLEAR</p>
                  <p className={`pa-pixel mt-3 flex items-center gap-2 text-[9px] ${selectedShards[5] ? "text-[#7af6c8]" : "text-[#c6d2f2]/45"}`}>
                    {selectedShards[5] ? <Check className="h-4 w-4" /> : <Gem className="h-4 w-4" />}
                    {selectedShards[5] ? "FLAWLESS BONUS SECURED" : "CLEAR WITHOUT LOSING A LIFE"}
                  </p>
                  <p className="mt-3 text-xs tracking-wide text-[#c6d2f2]/45">
                    {cleared ? "Stage cleared" : "Not cleared yet"}
                  </p>
                </div>
              </div>

              {level.challenge ? (
                <p className="pa-pixel mt-4 border border-[#ffd166]/25 bg-[#ffd166]/[0.04] p-3 text-[7px] leading-relaxed text-[#ffd166]">
                  COIN CHALLENGE · COLLECT EVERY COIN IN ONE RUN TO UNLOCK {WEAPON_TYPES[CHALLENGE_WEAPONS[selected]]?.name?.toUpperCase()}
                </p>
              ) : null}
              {!unlocked ? (
                <p className="pa-pixel mt-4 text-[7px] leading-relaxed text-[#ff3d8b]">
                  {level.starOf
                    ? `LOCKED · FIND ALL SIX SHARDS ON STAGE ${level.starOf}`
                    : level.secretOf
                    ? `LOCKED · GET FIVE SHARDS ON STAGE ${level.secretOf} IN ONE RUN`
                    : `LOCKED · CLEAR STAGE ${String(selected - 1).padStart(2, "0")} FIRST`}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="pa-pixel min-h-11 border border-[#2a2f52] px-5 py-3 text-[8px] text-[#c6d2f2]/60 hover:text-white"
                >
                  BACK TO MAP
                </button>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    setDetailsOpen(false);
                    deploy(selected);
                  }}
                  className={`pa-pixel flex min-h-11 items-center justify-center gap-2 px-5 py-3 text-[8px] ${
                    unlocked ? "bg-[#4be3ff] text-[#05060d]" : "cursor-not-allowed bg-[#1b2140] text-[#c6d2f2]/30"
                  }`}
                >
                  {unlocked ? <Play className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                  {unlocked ? "DEPLOY" : "LOCKED"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}