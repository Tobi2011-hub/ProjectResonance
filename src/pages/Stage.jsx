import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gem, HeartCrack, Lock, RotateCcw } from "lucide-react";
import { ClearOverlay, GameCanvas } from "@/components/game/GameUI";
import { getLevel } from "@/game/world";
import { completeChallenge, completeStage, isLevelSelectUnlocked, isStageUnlocked, loadSave } from "@/game/core";
import { CHALLENGES, getChallengeLevel } from "@/game/challenges";

export default function Stage() {
  const { stage } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [save] = useState(() => loadSave());
  const isLevelSelect = searchParams.get("levelSelect") === "1";
  const challengeId = Number(searchParams.get("challenge")) || 0;
  const challenge = CHALLENGES.find((item) => item.id === challengeId) || null;
  const level = useMemo(() => (challenge && getChallengeLevel(challenge.id)) || getLevel(stage), [challenge?.id, stage]);
  const challengeConfig = challenge ? { ...challenge, weapons: [searchParams.get("w1") || "buster", searchParams.get("w2") || "blade"] } : null;
  const levelSelectChar = Number.isInteger(Number(searchParams.get("char")))
    ? Number(searchParams.get("char"))
    : save?.character ?? 0;
  const [runId, setRunId] = useState(0);
  const [clear, setClear] = useState(null);
  const [wiped, setWiped] = useState(false);
  const [briefing, setBriefing] = useState(true);
  const [runTimer, setRunTimer] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (!save || (challenge && (!isLevelSelectUnlocked(save) || (challenge.id > 1 && !(save.challengeEmblems || []).includes(challenge.id - 1)))) || (!isStageUnlocked(save, level.id) && !isLevelSelectUnlocked(save))) return undefined;
    const briefingTimer = setTimeout(() => {
      setBriefing(false);
      if (isLevelSelect || challenge) setTimerActive(true);
    }, 1800);
    return () => clearTimeout(briefingTimer);
  }, [level.id, save, isLevelSelect, challenge]);

  useEffect(() => {
    if (!timerActive) return undefined;
    const id = setInterval(() => setRunTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [timerActive]);

  useEffect(() => {
    if (!save) navigate("/customize?new=1");
  }, [save, navigate]);

  if (!save) return null;

  if (challenge && (!isLevelSelectUnlocked(save) || (challenge.id > 1 && !(save.challengeEmblems || []).includes(challenge.id - 1)))) {
    return <div className="pa-root flex min-h-screen flex-col items-center justify-center px-6 text-center"><Lock className="h-8 w-8 text-[#ffd166]"/><p className="pa-pixel mt-5 text-[10px] text-white">CHALLENGE LOCKED</p><p className="mt-3 text-sm text-[#c6d2f2]/55">Clear the campaign and earn the previous emblem to continue.</p><button onClick={() => navigate("/level-select-map")} className="pa-pixel mt-6 border border-[#4be3ff]/50 px-5 py-3 text-[8px] text-[#4be3ff]">CHALLENGE MODE</button></div>;
  }

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
          onClick={() => navigate(isLevelSelect ? "/level-select-map" : "/world")}
          className="pa-pixel mt-6 border border-[#4be3ff] px-5 py-3 text-[9px] text-[#4be3ff]"
        >
          {isLevelSelect ? "LEVEL SELECT" : "WORLD MAP"}
        </button>
      </div>
    );
  }

  const handleComplete = (payload) => {
    setTimerActive(false);
    // Score: base clear bonus + shards + coins + no-death + time bonus
    const timeBonus = Math.max(0, 300 - runTimer) * 10;
    const score =
      1000 +
      payload.shards * 100 +
      payload.coins * 10 +
      (payload.noDeath ? 500 : 0) +
      timeBonus;
    setRunScore((s) => s + score);
    const result = challenge
      ? { save: completeChallenge(challenge.id), orbGain: 0 }
      : completeStage(level.id, {
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
      nextStage: !challenge && level.id < 10 && isStageUnlocked(result.save, level.id + 1) ? level.id + 1 : null,
      unlockedSecret: result.unlockedSecret,
      unlockedAbility: result.unlockedAbility,
      replacementAbility: result.replacementAbility,
      abilityRank: result.abilityRank,
      abilityUpgraded: result.abilityUpgraded,
      unlockedWeapon: result.unlockedWeapon,
      orbGain: result.orbGain,
      coins: payload.coins,
      coinsTotal: payload.coinsTotal,
      runTimer,
      runScore: runScore + score,
      isLevelSelect: isLevelSelect || Boolean(challenge),
      challenge: challenge?.id,
      emblemCode: challenge?.code,
    });
  };

  return (
    <div className="pa-root relative min-h-screen bg-[#05060d]">
      {!briefing ? (
        <GameCanvas
          key={runId}
          level={level}
          save={{ ...save, character: isLevelSelect || challenge ? levelSelectChar : save.character }}
          onComplete={handleComplete}
          onOutOfLives={() => setWiped(true)}
          onRestart={() => setRunId((value) => value + 1)}
          onQuit={() => navigate(challenge || isLevelSelect ? "/level-select-map" : "/world")}
          onScore={(amount) => setRunScore((s) => s + amount)}
          timer={runTimer}
          score={runScore}
          isLevelSelect={isLevelSelect || Boolean(challenge)}
          challenge={challengeConfig}
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
            <p className="pa-pixel text-[8px] tracking-[0.3em]" style={{ color: level.accent }}>{challenge ? `CHALLENGE ${String(challenge.id).padStart(2, "0")}` : "MISSION BRIEFING"}</p>
            <p className="pa-pixel mt-5 text-[9px] text-[#c6d2f2]/55">{challenge?.subtitle || `ENTERING STAGE ${String(level.id).padStart(2, "0")}`}</p>
            <h1 className="pa-pixel pa-title mt-4 text-xl leading-relaxed text-white sm:text-3xl">{challenge?.title || level.name}</h1>
            <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 border-y border-[#2a2f52] py-4">
              <Gem className="h-4 w-4 shrink-0" style={{ color: level.accent }} />
              <p className="pa-pixel text-[7px] leading-relaxed text-[#c6d2f2]/65">
                {challenge
                  ? "SURVIVE THE FULL GAUNTLET · CLEAR THE TRIAL TO EARN ITS EMBLEM"
                  : level.id === 10
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
              {challenge ? "BEGIN CHALLENGE" : "BEGIN STAGE"}
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
          runTimer={clear.runTimer ?? 0}
          runScore={clear.runScore ?? 0}
          isLevelSelect={clear.isLevelSelect ?? false}
          challengeReward={clear.challenge ? { id: clear.challenge, code: clear.emblemCode } : null}
          onNextStage={() =>
            navigate(
              isLevelSelect
                ? `/stage/${clear.nextStage}?levelSelect=1&char=${levelSelectChar}`
                : `/stage/${clear.nextStage}`
            )
          }
          onContinue={() => navigate(challenge ? "/level-select-map" : isLevelSelect ? "/level-select-map" : "/world")}
        />
      ) : null}
      {wiped ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#03040a] px-5 py-8">
          <div className="pa-fade-up relative w-full max-w-2xl overflow-hidden border border-[#ff3d8b]/40 bg-[#06070d] px-5 py-12 text-center shadow-[0_0_70px_rgba(255,61,139,0.12)] sm:px-12 sm:py-16">
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
                  onClick={() => navigate(challenge || isLevelSelect ? "/level-select-map" : "/world")}
                  className="pa-pixel flex min-h-11 items-center justify-center gap-2 border border-[#4be3ff]/50 px-5 py-3 text-[8px] text-[#4be3ff] hover:bg-[#4be3ff]/10"
                >
                  <ArrowLeft className="h-3 w-3" /> {challenge ? "CHALLENGE MODE" : isLevelSelect ? "CHALLENGE MODE" : "WORLD MAP"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
