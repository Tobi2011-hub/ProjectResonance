import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Gem, Lock, Play, ShieldAlert } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import PixelFontText from "@/components/game/PixelFontText";
import { LEVELS } from "@/game/world";
import {
  CHARACTERS,
  isStageUnlocked,
  loadSave,
  sfx,
  stageStars,
} from "@/game/core";

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

const RANKS = [
  { grade: "S", minScore: 5000, color: "#ff3d8b" },
  { grade: "A", minScore: 4000, color: "#4be3ff" },
  { grade: "B", minScore: 3000, color: "#7af6c8" },
  { grade: "C", minScore: 2000, color: "#ffd166" },
  { grade: "D", minScore: 0, color: "#c6d2f2" },
];

function rankForScore(score) {
  for (const rank of RANKS) {
    if (score >= rank.minScore) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export default function LevelSelectMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [save, setSave] = useState(() => loadSave());
  const [selected, setSelected] = useState(() => (save ? Math.min(save.highestStage, 10) : 1));
  const [charIndex, setCharIndex] = useState(() => {
    const savedChar = save?.character ?? 0;
    return Number.isInteger(savedChar) && savedChar >= 0 && savedChar < CHARACTERS.length ? savedChar : 0;
  });
  const [notice, setNotice] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [runTimer, setRunTimer] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (!save) navigate("/customize?new=1");
  }, [save, navigate]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!timerActive) return undefined;
    const id = setInterval(() => setRunTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [timerActive]);

  const level = LEVELS[selected - 1];
  const unlocked = isStageUnlocked(save, selected);
  const cleared = Boolean(save?.cleared?.includes(selected));
  const selectedShards = save?.stars?.[selected] || [];
  const grandGemCollected = Boolean(selectedShards[0]);
  const accent = level?.accent || "#4be3ff";
  const frame = CHARACTERS[charIndex];
  const currentRank = rankForScore(runScore);

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
    setTimerActive(true);
    navigate(`/stage/${stage}?levelSelect=1&char=${charIndex}`);
  };

  const pickChar = (dir) => {
    sfx("move");
    setCharIndex((i) => (i + dir + CHARACTERS.length) % CHARACTERS.length);
  };

  const addScore = (amount) => {
    setRunScore((s) => s + amount);
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

  const timerMinutes = Math.floor(runTimer / 60);
  const timerSeconds = runTimer % 60;
  const timerText = `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`;

  return (
    <div className="pa-root relative min-h-screen bg-[#05060d]">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <PixelBackdrop variant="purple" />
      </div>

      <header className="z-10 flex flex-col items-center justify-start gap-2 px-4 pt-4 sm:flex-row sm:justify-between sm:pt-6">
        <div className="flex items-center gap-3 border border-[#2a2f52] bg-[#070a18]/80 px-3 py-2 rounded">
          <button
            type="button"
            onClick={() => pickChar(-1)}
            className="pa-pixel border border-[#2a2f52] px-2 py-1 text-[7px] text-[#c6d2f2]/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <PixelFontText text="SELECTED FRAME" className="text-[7px] text-[#4be3ff]/70" spacing={0.04} />
            <div className="flex items-center gap-1">
              <div className={`h-8 w-8 rounded bg-[#0c0e1c] border border-[#4be3ff]/40 overflow-hidden`}>
                <div className="pa-pixel text-[6px] text-[#4be3ff]">{frame.prefix.toUpperCase()}</div>
              </div>
              <span className={`pa-pixel text-[8px] ${frame.prefix === "vg" ? "text-[#4be3ff]" : "text-[#c6d2f2]"}`}>
                {frame.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => pickChar(1)}
            className="pa-pixel border border-[#2a2f52] px-2 py-1 text-[7px] text-[#c6d2f2]/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" style={{ transform: "rotate(180deg)" }} />
          </button>
        </div>

        <div className="flex items-center gap-6 border border-[#2a2f52] bg-[#070a18]/80 px-4 py-2 rounded">
          <div className="flex flex-col items-center gap-0.5">
            <PixelFontText text="RUN TIME" className="text-[7px] text-[#ffd166]/70" spacing={0.04} />
            <span className={`pa-pixel text-[12px] font-mono text-[#4be3ff] ${timerActive ? "pa-blink" : ""}`}>
              {timerText}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <PixelFontText text="SCORE" className="text-[7px] text-[#ffd166]/70" spacing={0.04} />
            <span className={`pa-pixel text-[12px] font-mono text-[#ffd166]`}>{runScore}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <PixelFontText text="RANK" className="text-[7px] text-[#ffd166]/70" spacing={0.04} />
            <span className={`pa-pixel text-[12px] font-bold text-[#ffffff] border border-current px-2 py-0.5`} style={{ color: currentRank.color }}>
              {currentRank.grade}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-4">
        <div className="relative w-full max-w-4xl aspect-[16/9]">
          <svg
            className="absolute inset-0 w-full h-full stroke-[#4be3ff]/10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline points={pathPoints} fill="none" strokeWidth="2" />
          </svg>

          {LEVELS.slice(0, 10).map((level, index) => {
            const stage = index + 1;
            const pos = POSITIONS[index];
            const isSelected = selected === stage;
            return (
              <StageNode
                key={stage}
                stage={stage}
                name={level.name}
                x={pos.x}
                y={pos.y}
                accent={level.accent}
                unlocked={unlocked}
                cleared={cleared}
                shards={stageStars(save, stage)}
                selected={isSelected}
                onSelect={() => setSelected(stage)}
                onOpen={() => deploy(stage)}
              />
            );
          })}
        </div>

        {detailsOpen && (
          <div className="mt-8 flex flex-col items-center gap-4 max-w-xl">
            <div className="border border-[#2a2f52] bg-[#070a18]/90 p-6 rounded shadow-[0_0_40px_rgba(75,227,255,0.15)]">
              <div className="flex items-center justify-between mb-4">
                <PixelFontText text={level.name} className="text-[12px] text-white" spacing={0.04} />
                <div className="flex items-center gap-2">
                  <PixelFontText text={`STAGE ${String(selected).padStart(2, "0")}`} className="text-[8px] text-[#4be3ff]" spacing={0.04} />
                  {grandGemCollected ? <Gem className="h-4 w-4 fill-[#ffd166]" /> : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-[#2a2f52] bg-[#070a18]/60 p-3">
                  <p className="pa-pixel text-[8px] text-[#c6d2f2]/55">RESONANCE SHARDS</p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Gem
                        key={i}
                        className={`h-4 w-4 ${selectedShards[i] ? "fill-current" : "text-[#2a2f52]"}`}
                        style={selectedShards[i] ? { color: accent } : undefined}
                      />
                    ))}
                    {level.secretOf ? (
                      <Gem className={`h-4 w-4 ${grandGemCollected ? "fill-current" : "text-[#2a2f52]"}`} style={grandGemCollected ? { color: accent } : undefined} />
                    ) : null}
                  </div>
                </div>
                <div className="border border-[#2a2f52] bg-[#070a18]/60 p-3">
                  <p className="pa-pixel text-[8px] text-[#c6d2f2]/55">DEATHLESS CLEAR</p>
                  <p className={`pa-pixel mt-2 flex items-center gap-2 text-[8px] ${selectedShards[5] ? "text-[#7af6c8]" : "text-[#c6d2f2]/45"}`}>
                    {selectedShards[5] ? <Check className="h-3 w-3" /> : <Gem className="h-3 w-3" />}
                    {selectedShards[5] ? "FLAWLESS BONUS SECURED" : "CLEAR WITHOUT LOSING A LIFE"}
                  </p>
                </div>
              </div>

              {level.challenge ? (
                <p className="pa-pixel mt-2 border border-[#ffd166]/25 bg-[#ffd166]/[0.04] p-2 text-[7px] leading-relaxed text-[#ffd166]">
                  COIN CHALLENGE · COLLECT EVERY COIN IN ONE RUN FOR EXTRA ORBS
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

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
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
          </div>
        )}
      </main>

      <footer className="z-10 border-t border-white/[0.06] pt-3 px-4 text-center">
        <p className="pa-pixel text-[7px] text-[#c6d2f2]/25">
          ↑↓ ROW · ←→ CYCLE STAGE · ENTER DETAILS · Z/X CYCLE FRAME · DEPLOY TO START LEVEL-SELECT RUN
        </p>
      </footer>

      {notice ? (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
          <p className="pa-pixel px-4 py-2 border border-[#ff3d8b]/40 bg-[#ff3d8b]/10 text-[8px] text-[#ff3d8b]">
            {notice}
          </p>
        </div>
      ) : null}
    </div>
  );
}
