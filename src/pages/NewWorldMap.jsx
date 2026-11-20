import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Gem, Info, Play, ShoppingBag, Star, X } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import PixelFontText from "@/components/game/PixelFontText";
import { getLevel } from "@/game/world";
import {
  CHARACTERS,
  NEW_WORLD_FINAL_STAGE,
  NEW_WORLD_STAGES,
  hasFinalSecretUnlock,
  hasPostgameUnlock,
  loadSave,
  sfx,
} from "@/game/core";

const BASE_POSITIONS = [
  { x: 8, y: 72 }, { x: 21, y: 43 }, { x: 35, y: 62 }, { x: 49, y: 30 },
  { x: 63, y: 55 }, { x: 77, y: 25 }, { x: 91, y: 45 }, { x: 84, y: 76 },
];

function MapNode({ number, level, x, y, selected, cleared, stars, onSelect, onOpen }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      {selected ? (
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 hidden w-max -translate-x-1/2 border px-2.5 py-1.5 sm:block" style={{ borderColor: `${level.accent}99`, background: "rgba(7,10,24,.95)" }}>
          <p className="pa-pixel text-[7px] text-white">{level.name}</p>
          <p className="pa-pixel mt-1 flex items-center gap-1 text-[7px]" style={{ color: level.accent }}><Star className="h-2.5 w-2.5 fill-current" /> STARS {stars}/5</p>
        </div>
      ) : null}
      <button
        type="button"
        onMouseEnter={onSelect}
        onFocus={onSelect}
        onClick={onOpen}
        aria-label={`Stage ${number}: ${level.name}`}
        style={selected ? { borderColor: level.accent, backgroundColor: `${level.accent}22`, boxShadow: `0 0 28px ${level.accent}66` } : { borderColor: `${level.accent}55` }}
        className={`group relative grid h-11 w-11 touch-manipulation place-items-center border-2 transition-all duration-200 focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd166] sm:h-16 sm:w-16 ${selected ? "scale-110" : "bg-[#0c0e1c]/95 hover:scale-105"}`}
      >
        <PixelFontText text={String(number).padStart(2, "0")} className="text-[14px] sm:text-[20px]" style={{ color: level.accent }} spacing={0.04} />
        {cleared ? <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-[#7af6c8] text-[#05060d]"><Check className="h-3 w-3" /></span> : null}
        {stars > 0 ? <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 border border-[#2a2f52] bg-[#070a18] px-1 py-0.5"><Star className="h-2 w-2 fill-current" style={{ color: level.accent }} /><span className="pa-pixel text-[6px]" style={{ color: level.accent }}>{stars}</span></span> : null}
      </button>
    </div>
  );
}

export default function NewWorldMap() {
  const navigate = useNavigate();
  const save = loadSave();
  const visibleFinal = Boolean(save && hasFinalSecretUnlock(save));
  const stages = visibleFinal ? [...NEW_WORLD_STAGES, NEW_WORLD_FINAL_STAGE] : NEW_WORLD_STAGES;
  const [selected, setSelected] = useState(NEW_WORLD_STAGES[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selectedIndex = Math.max(0, stages.indexOf(selected));
  const level = getLevel(selected);
  const cleared = Boolean(save?.cleared?.includes(selected));
  const stageStars = save?.stars?.[selected] || [];
  const foundStars = stageStars.slice(0, 5).filter(Boolean).length;
  const record = save?.stageRecords?.[selected] || {};
  const accent = level?.accent || "#4be3ff";
  const mapStars = stages.reduce((sum, id) => sum + (save?.stars?.[id] || []).slice(0, 5).filter(Boolean).length, 0);
  const points = useMemo(() => BASE_POSITIONS.slice(0, stages.length).map((point) => `${point.x},${point.y}`).join(" "), [stages.length]);

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsOpen]);

  useEffect(() => {
    const onKey = (event) => {
      if (detailsOpen || !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Enter" || event.key === " ") {
        setDetailsOpen(true);
        sfx("select");
      } else {
        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const next = Math.max(0, Math.min(stages.length - 1, selectedIndex + direction));
        setSelected(stages[next]);
        sfx("move");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsOpen, selectedIndex, stages]);

  if (!save) return <Navigate to="/customize?new=1" replace />;
  if (!hasPostgameUnlock(save)) return <Navigate to="/world" replace />;

  const deploy = () => navigate(`/stage/${selected}?newWorld=1`);
  const timeText = record.bestTime
    ? `${String(Math.floor(record.bestTime / 60)).padStart(2, "0")}:${String(record.bestTime % 60).padStart(2, "0")}`
    : "—";

  return (
    <div className="pa-root pa-world-map relative h-screen h-dvh overflow-hidden">
      <PixelBackdrop theme={save.settings?.backgrounds?.map} />
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-2 py-1.5 sm:px-8 sm:py-3">
        <header className="flex shrink-0 flex-col items-stretch gap-1.5 border-b border-white/[0.06] pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <button type="button" onClick={() => navigate("/world")} className="pa-pixel flex min-h-[44px] min-w-[90px] touch-manipulation items-center gap-2 px-2 text-[8px] text-[#c6d2f2]/50 transition-colors hover:text-white">
            <ArrowLeft className="h-3 w-3" /> WORLD MAP
          </button>
          <div className="grid grid-cols-3 items-center gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:gap-3">
            <PixelFontText text={CHARACTERS[save.character]?.name || "EMBER"} className="text-[10px] text-[#c6d2f2]/40" spacing={0.04} />
            <span className="pa-pixel flex items-center gap-1 text-[10px] text-[#4be3ff]"><Star className="h-3.5 w-3.5" /><PixelFontText text={`${mapStars}/${stages.length * 5}`} className="text-[10px] text-[#4be3ff]" spacing={0.04} /></span>
            <span className="pa-pixel flex items-center gap-1 text-[10px] text-[#ffd166]"><Gem className="h-3.5 w-3.5" /><PixelFontText text={String(save.orbs || 0)} className="text-[10px] text-[#ffd166]" spacing={0.04} /></span>
            <PixelFontText text={`STAGE ${String(selectedIndex + 1).padStart(2, "0")}/${String(stages.length).padStart(2, "0")}`} className="text-[10px] text-[#4be3ff]" spacing={0.04} />
            <button type="button" onClick={() => navigate("/shop")} className="pa-pixel flex min-h-[44px] items-center justify-center gap-1 border border-[#ffd166]/50 px-2 py-1 text-[8px] text-[#ffd166] hover:border-[#ffd166]"><ShoppingBag className="h-3.5 w-3.5" /> SHOP</button>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-rows-[auto_minmax(160px,1fr)_auto] gap-2 py-2 sm:grid-rows-[auto_minmax(200px,1fr)_auto]">
          <div className="flex min-w-0 items-end justify-between">
            <div><PixelFontText text="PROJECT: RESONANCE" className="text-[9px] tracking-[0.3em] text-[#4be3ff]/60" spacing={0.04} /><PixelFontText text="WORLD MAP" className="mt-1 text-[18px] text-white sm:text-[22px]" spacing={0.04} /></div>
            <p className="pa-pixel hidden shrink-0 whitespace-nowrap text-[7px] text-[#c6d2f2]/40 sm:block">ARROWS SELECT NODE · ENTER FOR DETAILS</p>
          </div>

          <div className="relative min-h-0 w-full overflow-hidden border border-white/[0.04] bg-[#050711]/25">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={points} fill="none" stroke="#161b31" strokeWidth="10" vectorEffect="non-scaling-stroke" />
              <polyline points={points} fill="none" stroke="#2a3157" strokeWidth="2" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
              <polyline points={points} fill="none" stroke="#7af6c8" strokeWidth="1" strokeDasharray="1 12" vectorEffect="non-scaling-stroke" className="new-world-map__signal-path" />
            </svg>
            {stages.map((id, index) => {
              const nodeLevel = getLevel(id);
              const stars = (save.stars?.[id] || []).slice(0, 5).filter(Boolean).length;
              return <MapNode key={id} number={index + 1} level={nodeLevel} x={BASE_POSITIONS[index].x} y={BASE_POSITIONS[index].y} selected={selected === id} cleared={Boolean(save.cleared?.includes(id))} stars={stars} onSelect={() => setSelected(id)} onOpen={() => { setSelected(id); setDetailsOpen(true); sfx("select"); }} />;
            })}
          </div>

          <div className="pa-panel flex shrink-0 flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="min-w-0">
              <PixelFontText text={`STAGE ${String(selectedIndex + 1).padStart(2, "0")}`} className="text-[10px] text-[#4be3ff]/60" spacing={0.04} />
              <p className="pa-pixel mt-2 text-[14px] text-white">{level.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.14em] text-[#c6d2f2]/45">
                <span className="flex items-center gap-1" style={{ color: accent }}><Star className="h-3.5 w-3.5 fill-current" /> STARS {foundStars}/5</span>
                <span>{cleared ? `CLEARED · RANK ${save.storyRanks?.[selected] || "—"}` : "READY"}</span>
                <span>BEST {timeText}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => navigate("/customize")} className="pa-pixel min-h-[44px] border border-[#2a2f52] px-3 py-2 text-[9px] text-[#c6d2f2]/60 hover:border-[#4be3ff] hover:text-white">LOADOUT</button>
              <button type="button" onClick={() => setDetailsOpen(true)} className="pa-pixel flex min-h-[44px] items-center gap-2 bg-[#4be3ff] px-4 py-2 text-[10px] text-[#05060d] hover:brightness-110"><Info className="h-3 w-3" /> DETAILS</button>
              <button type="button" onClick={deploy} className="pa-pixel flex min-h-[44px] items-center gap-2 border border-[#7af6c8]/60 px-4 py-2 text-[9px] text-[#7af6c8] hover:bg-[#7af6c8]/10"><Play className="h-3 w-3" /> PLAY</button>
            </div>
          </div>
        </main>

        <footer className="hidden shrink-0 items-center justify-between border-t border-white/[0.06] pt-2 sm:flex">
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/25">ARROWS SELECT NODE · ENTER DETAILS</p>
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/20">STAGES CAN BE PLAYED IN ANY ORDER</p>
        </footer>
      </div>

      {detailsOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#03040a]/90 px-4 py-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsOpen(false); }}>
          <section aria-label={`Stage ${selectedIndex + 1} details`} aria-modal="true" className="pa-panel pa-fade-up relative w-full max-w-xl overflow-hidden p-5 sm:p-8" role="dialog">
            <div className="pointer-events-none absolute inset-0 pa-scanlines opacity-40" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div><p className="pa-pixel text-[8px] tracking-[0.2em]" style={{ color: accent }}>STAGE {String(selectedIndex + 1).padStart(2, "0")}</p><h2 className="pa-pixel mt-3 text-[15px] leading-relaxed text-white sm:text-lg">{level.name}</h2></div>
                <button type="button" aria-label="Close stage details" onClick={() => setDetailsOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center border border-[#2a2f52] text-[#c6d2f2]/60 hover:border-[#4be3ff] hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="border border-[#2a2f52] bg-[#070a18]/80 p-4"><p className="pa-pixel text-[8px] text-[#c6d2f2]/55">STARS FOUND</p><p className="pa-pixel mt-3 flex items-center gap-2 text-[10px]" style={{ color: accent }}><Star className="h-4 w-4 fill-current" /> {foundStars} / 5</p><div className="mt-3 flex gap-2">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-5 w-5 ${stageStars[index] ? "fill-current" : "text-[#2a2f52]"}`} style={stageStars[index] ? { color: accent } : undefined} />)}</div></div>
                <div className="border border-[#2a2f52] bg-[#070a18]/80 p-4"><p className="pa-pixel text-[8px] text-[#c6d2f2]/55">BEST RUN</p><div className="mt-3 grid grid-cols-3 gap-2"><div><p className="pa-pixel text-[7px] text-[#c6d2f2]/35">TIME</p><p className="pa-pixel mt-1 text-[10px] text-[#4be3ff]">{timeText}</p></div><div><p className="pa-pixel text-[7px] text-[#c6d2f2]/35">SCORE</p><p className="pa-pixel mt-1 text-[10px] text-[#ffd166]">{record.bestScore?.toLocaleString?.() || "—"}</p></div><div><p className="pa-pixel text-[7px] text-[#c6d2f2]/35">RANK</p><p className="pa-pixel mt-1 text-[10px] text-[#c084fc]">{save.storyRanks?.[selected] || "—"}</p></div></div></div>
              </div>
              <p className="pa-pixel mt-4 text-[8px] text-[#c6d2f2]/45">{cleared ? "STAGE CLEARED" : "READY FOR DEPLOYMENT"}</p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDetailsOpen(false)} className="pa-pixel min-h-11 border border-[#2a2f52] px-5 py-3 text-[8px] text-[#c6d2f2]/60 hover:text-white">BACK TO MAP</button>
                <button type="button" onClick={deploy} className="pa-pixel flex min-h-11 items-center justify-center gap-2 bg-[#4be3ff] px-5 py-3 text-[8px] text-[#05060d]"><Play className="h-3 w-3" /> DEPLOY</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
