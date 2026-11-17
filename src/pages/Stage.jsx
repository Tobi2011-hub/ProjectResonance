import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Gem, HeartCrack, Lock, RotateCcw } from "lucide-react";
import { ClearOverlay, GameCanvas } from "@/components/game/GameUI";
import { getLevel } from "@/game/world";
import { completeStage, isLevelSelectUnlocked, isStageUnlocked, loadSave } from "@/game/core";

export default function Stage() {
  const { stage } = useParams();
  const navigate = useNavigate();
  const level = getLevel(stage);
  const [save] = useState(() => loadSave());
  const [runId, setRunId] = useState(0);
  const [clear, setClear] = useState(null);
  const [wiped, setWiped] = useState(false);
  const [briefing, setBriefing] = useState(true);

  useEffect(() => {
    if (!save || (!isStageUnlocked(save, level.id) && !isLevelSelectUnlocked(save))) return undefined;
    const timer = setTimeout(() => setBriefing(false), 1800);
    return () => clearTimeout(timer);
  }, [level.id, save]);

  useEffect(() => {
    if (!save) navigate("/customize?new=1");
  }, [save, navigate]);

  if (!save) return null;

  if (!isStageUnlocked(save, level.id) && !isLevelSelectUnlocked(save)) {
    return (
      <div className="pa-root flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Lock className="h-8 w-8 text-[#c6d2f2]/30" />
        <p className="pa-pixel mt-5 text-[11px] text-white">STAGE {level.id} LOCKED</p>
        <p className="mt-3 max-w-sm text-sm tracking-wide text-[#c6d2f2]/50">
          {level.starOf
            ? `Collect all six resonance shards on Stage ${level.starOf} — five pickups plus a flawless clear — to open this vault.`
            : level.secretOf
            ? `Collect all five resonance shards on Stage ${level.secretOf} in a single run to open this rift.`
            : "Clear the previous stage to open this node."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/world")}
          className="pa-pixel mt-6 border border-[#4be3ff] px-5 py-3 text-[9px] text-[#4be3ff]"
        >
          WORLD MAP
        </button>
      </div>
    );
  }

  const handleComplete = (payload) => {
    const result = completeStage(level.id, {
      collected: payload.collected,
      noDeath: payload.noDeath,
      coins: payload.coins,
      coinsTotal: payload.coinsTotal,
    });
    setClear({
      shards: payload.shards,
      collected: payload.collected,
      lives: payload.lives,
      noDeath: payload.noDeath,
      nextStage: level.id < 10 && isStageUnlocked(result.save, level.id + 1) ? level.id + 1 : null,
      unlockedSecret: result.unlockedSecret,
      unlockedAbility: result.unlockedAbility,
      replacementAbility: result.replacementAbility,
      abilityRank: result.abilityRank,
      abilityUpgraded: result.abilityUpgraded,
      unlockedWeapon: result.unlockedWeapon,
      orbGain: result.orbGain,
      coins: payload.coins,
      coinsTotal: payload.coinsTotal,
    });
  };

  return (
    <div className="pa-root relative min-h-screen bg-[#05060d]">
      {!briefing ? (
        <GameCanvas
          key={runId}
          level={level}
          save={save}
          onComplete={handleComplete}
          onOutOfLives={() => setWiped(true)}
          onRestart={() => setRunId((value) => value + 1)}
          onQuit={() => navigate("/world")}
        />
      ) : (
        <div className="fixed inset-0 z-30 flex items-center justify-center overflow-hidden bg-[#04050b] px-5">
          <div className="pointer-events-none absolute inset-0 pa-scanlines opacity-50" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(75,227,255,0.12),transparent_65%)]" />
          <section
            aria-label={`Entering ${level.name}`}
            className="pa-panel pa-fade-up relative w-full max-w-2xl p-6 text-center sm:p-10"
            style={{ borderColor: `${level.accent}88` }}
          >
            <p className="pa-pixel text-[8px] tracking-[0.3em]" style={{ color: level.accent }}>MISSION BRIEFING</p>
            <p className="pa-pixel mt-5 text-[9px] text-[#c6d2f2]/55">ENTERING STAGE {String(level.id).padStart(2, "0")}</p>
            <h1 className="pa-pixel pa-title mt-4 text-xl leading-relaxed text-white sm:text-3xl">{level.name}</h1>
            <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 border-y border-[#2a2f52] py-4">
              <Gem className="h-4 w-4 shrink-0" style={{ color: level.accent }} />
              <p className="pa-pixel text-[7px] leading-relaxed text-[#c6d2f2]/65">
                {level.id === 10
                  ? "DEFEAT THE VOID CORE · CLAIM THE GRAND GEM"
                  : "FIND FIVE SHARDS · CLEAR FLAWLESSLY FOR THE BONUS"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBriefing(false)}
              className="pa-pixel mt-7 min-h-11 px-6 py-3 text-[8px] text-[#05060d] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              style={{ backgroundColor: level.accent }}
            >
              BEGIN STAGE
            </button>
          </section>
        </div>
      )}
      {clear ? (
        <ClearOverlay
          level={level}
          shards={clear.shards}
          collected={clear.collected}
          lives={clear.lives}
          noDeath={clear.noDeath}
          unlockedSecret={clear.unlockedSecret}
          unlockedAbility={clear.unlockedAbility}
          replacementAbility={clear.replacementAbility}
          abilityRank={clear.abilityRank}
          abilityUpgraded={clear.abilityUpgraded}
          unlockedWeapon={clear.unlockedWeapon}
          orbGain={clear.orbGain}
          coins={clear.coins}
          coinsTotal={clear.coinsTotal}
          nextStage={clear.nextStage}
          onNextStage={() => navigate(`/stage/${clear.nextStage}`)}
          onContinue={() => navigate("/world")}
        />
      ) : null}
      {wiped ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#03040a] px-5 py-8">
          <div className="relative w-full max-w-2xl overflow-hidden border border-[#ff3d8b]/40 bg-[#06070d] px-5 py-12 text-center shadow-[0_0_70px_rgba(255,61,139,0.12)] sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 pa-scanlines opacity-40" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_49.8%,rgba(75,227,255,0.06)_50%,transparent_50.2%)]" />
            <div className="relative">
              <HeartCrack className="mx-auto h-8 w-8 text-[#ff3d8b]" />
              <p className="pa-pixel mt-5 text-[8px] tracking-[0.3em] text-[#ff3d8b]/70">SIGNAL LOST · STAGE {String(level.id).padStart(2, "0")}</p>
              <h2
                className="pa-pixel pa-gameover-glitch mt-6 text-3xl leading-tight sm:text-5xl"
                data-text="GAME OVER"
              >
                GAME OVER
              </h2>
              <p className="mt-4 text-sm tracking-[0.16em] text-[#c6d2f2]/55">Your run has ended. The mission remains available.</p>
              <div className="mx-auto mt-8 flex max-w-sm flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setWiped(false);
                    setRunId((value) => value + 1);
                  }}
                  className="pa-pixel flex min-h-11 items-center justify-center gap-2 bg-[#ff3d8b] px-5 py-3 text-[8px] text-[#05060d] hover:bg-[#ff79ae]"
                >
                  <RotateCcw className="h-3 w-3" /> RETRY STAGE
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/world")}
                  className="pa-pixel flex min-h-11 items-center justify-center gap-2 border border-[#4be3ff]/50 px-5 py-3 text-[8px] text-[#4be3ff] hover:bg-[#4be3ff]/10"
                >
                  <ArrowLeft className="h-3 w-3" /> WORLD MAP
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}