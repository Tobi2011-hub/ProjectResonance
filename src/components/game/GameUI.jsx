/**
 * GAME UI — everything around the canvas: the decorative backdrop, the stage
 * host (GameCanvas), the tutorial box, the pause menu with in-stage settings,
 * and the stage-clear card.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Gem, Heart, Maximize, Minimize, Pause, Play, RotateCcw, Settings, Sparkles, Trophy } from "lucide-react";
import { loadAssets } from "@/game/world";
import {
  ABILITIES,
  DEFAULT_CONTROLS,
  WEAPONS,
  VIEW_H,
  VIEW_W,
  keyLabel,
  recordCoin,
  recordStar,
  saveCheckpoint,
  setSfxVolume,
  sfx,
  writeSave,
} from "@/game/core";
import GameEngine from "@/game/engine";
import GameHud from "@/components/game/GameHud";
import TouchControls from "@/components/game/TouchControls";
import ShardReveal from "@/components/game/ShardReveal";
import { SettingsPanel } from "@/components/title/TitlePanels";

export function PixelBackdrop({ variant = "blue", theme = "" }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 pa-bg-tile ${variant === "purple" ? "pa-bg-tile--purple" : ""} ${theme ? `pa-bg-choice-${theme}` : ""} opacity-70`} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070810]/85 via-[#0a0c1c]/80 to-[#070810]" />
      <div className="pa-backdrop-horizon absolute inset-x-0 bottom-0 h-[48%] opacity-50" />
      <div className="pa-backdrop-orbit absolute -right-24 top-[12%] h-64 w-64 rounded-full border border-[#4be3ff]/10 sm:h-96 sm:w-96" />
      <div className="absolute right-[12%] top-[21%] h-20 w-20 rounded-full bg-[#4be3ff]/10 blur-3xl sm:h-36 sm:w-36" />
      <div className="absolute inset-0 pa-vignette" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05060d] to-transparent" />
      <div className="absolute inset-0 pa-scanlines" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4be3ff]/50 to-transparent" />
    </div>
  );
}

export function NarrativeBox({ narrative, onClose }) {
  if (!narrative) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#05060d]/45 px-3 pb-6 sm:px-6 sm:pb-10">
      <button
        type="button"
        onClick={onClose}
        className="pa-panel pa-fade-up w-full max-w-[560px] cursor-pointer p-5 text-left"
      >
        <div className="flex items-center justify-between">
          <p className="pa-pixel text-[8px] text-[#ffd166]">{narrative.title}</p>
          <span className="pa-pixel text-[7px] text-[#4be3ff]/50">TRAINING</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed tracking-wide text-[#e8eefc]/85 sm:text-base">{narrative.text}</p>
        <div className="mt-4 flex items-center justify-between border-t border-[#2a2f52] pt-3">
          <span className="pa-pixel text-[7px] text-[#c6d2f2]/40">GAMEPLAY PAUSED</span>
          <span className="pa-pixel pa-blink text-[7px] text-[#4be3ff]">TAP / ENTER</span>
        </div>
      </button>
    </div>
  );
}

function rankForScore(score) {
  if (score >= 5000) return { grade: "S", color: "#ff3d8b" };
  if (score >= 4000) return { grade: "A", color: "#4be3ff" };
  if (score >= 3000) return { grade: "B", color: "#7af6c8" };
  if (score >= 2000) return { grade: "C", color: "#ffd166" };
  return { grade: "D", color: "#c6d2f2" };
}

export function ClearOverlay({
  level,
  shards,
  collected = 0,
  lives = 0,
  noDeath,
  unlockedSecret,
  unlockedAbility,
  replacementAbility,
  abilityRank = 0,
  abilityUpgraded = false,
  unlockedWeapon,
  orbGain = 0,
  coins = 0,
  coinsTotal = 0,
  nextStage = null,
  autoReturn = false,
  runTimer = 0,
  runScore = 0,
  isLevelSelect = false,
  challengeReward = null,
  onContinue,
  onNextStage,
}) {
  const accent = level.accent || "#4be3ff";
  const isChallenge = Boolean(challengeReward);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04050b]/95 px-3 py-4 sm:px-5 sm:py-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Victory: ${level.name}`}
        className="pa-panel pa-fade-up relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto p-5 text-center sm:p-9"
        style={{ borderColor: `${accent}88`, boxShadow: `0 0 70px ${accent}22, 0 18px 50px rgba(0,0,0,.65)` }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}2b, transparent 62%)` }} />
        {isChallenge ? <div className="pointer-events-none absolute inset-x-0 top-0 h-1 pa-challenge-result-bar" style={{ background: `linear-gradient(90deg, transparent, ${accent}, #fff, ${accent}, transparent)` }} /> : null}
        <div className="relative">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-full border sm:h-20 sm:w-20"
            style={{ borderColor: `${accent}88`, background: `${accent}18`, boxShadow: `0 0 35px ${accent}40` }}
          >
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: accent }} />
          </div>
          <p className="pa-pixel mt-4 text-[8px] tracking-[0.3em]" style={{ color: accent }}>
            {isChallenge ? "TRIAL COMPLETE · EMBLEM SECURED" : level.id === 10 ? "VOID CORE DESTROYED" : level.secretOf ? "RIFT CLEARED" : "MISSION COMPLETE"}
          </p>
          <h2 className="pa-pixel pa-title mt-3 text-2xl leading-tight text-white sm:text-4xl">
            {isChallenge ? "CHALLENGE CLEARED" : level.id === 10 ? "RESONANCE SECURED" : "VICTORY"}
          </h2>
          <p className="mt-3 text-sm tracking-[0.16em] text-[#c6d2f2]/65 sm:text-base">
            STAGE {String(level.id).padStart(2, "0")} <span className="text-white/25">/</span> {level.name}
          </p>

          {!isChallenge ? <ShardReveal
            shards={shards}
            noDeath={noDeath}
            accent={accent}
            totalShards={level.id === 10 ? 1 : 5}
            shardLabel={level.id === 10 ? "GRAND GEM" : "SHARDS"}
          /> : null}

          {challengeReward ? (
            <div className="pa-challenge-result mx-auto mt-5 max-w-xl border px-5 py-5 pa-fade-up" style={{ "--trial-accent": accent }}>
              <p className="pa-pixel text-[8px] tracking-[0.24em] text-[#ffd166]">EMBLEM {String(challengeReward.id).padStart(2, "0")} UNLOCKED</p>
              <p className="pa-pixel mt-3 text-[11px] text-white">CHEAT CODE · {challengeReward.code}</p>
              <p className="pa-pixel mt-2 text-[6px] tracking-[0.2em] text-[#c6d2f2]/45">NEW TRIAL ACCESS GRANTED</p>
            </div>
          ) : null}

          <div className={`mx-auto mt-6 grid max-w-xl gap-2 sm:gap-3 ${isChallenge ? "grid-cols-2" : "grid-cols-3"}`}>
            {[
              ...(!isChallenge ? [{ label: level.id === 10 ? "GRAND GEM" : "SHARDS", value: `${collected} / ${level.id === 10 ? 1 : 5}`, icon: Gem }] : []),
              { label: "LIVES LEFT", value: String(lives), icon: Heart },
              { label: "ORB REWARD", value: `+${orbGain}`, icon: Sparkles },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="border border-white/10 bg-[#080b18]/75 px-2 py-3 sm:px-4 sm:py-4">
                <Icon className="mx-auto h-4 w-4 sm:h-5 sm:w-5" style={{ color: accent }} />
                <p className="pa-pixel mt-2 text-[6px] text-[#c6d2f2]/50 sm:text-[7px]">{label}</p>
                <p className="pa-pixel mt-2 text-[9px] text-white sm:text-[11px]">{value}</p>
              </div>
            ))}
          </div>

          {unlockedAbility ? (
            <div className="mt-7 border border-[#7af6c8]/40 bg-[#7af6c8]/10 px-4 py-4 text-left sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="pa-pixel flex items-center gap-2 text-[8px] text-[#7af6c8]">
                  <Sparkles className="h-3 w-3" />{" "}
                  {abilityUpgraded ? "ABILITY BUFFED" : abilityRank >= 2 ? "ABILITY MAXED" : "ABILITY UNLOCKED"}
                </p>
                <p className="pa-pixel mt-2 text-[11px] text-white">{ABILITIES[unlockedAbility]?.name}</p>
                {abilityRank > 0 ? (
                  <p className="pa-pixel mt-1 text-[7px] text-[#7af6c8]/70">RANK {abilityRank}</p>
                ) : null}
                <p className="mt-1 text-[12px] tracking-wide text-[#c6d2f2]/60">{ABILITIES[unlockedAbility]?.blurb}</p>
              </div>
              <span className="pa-pixel mt-3 block text-2xl text-[#7af6c8] sm:mt-0">
                {ABILITIES[unlockedAbility]?.glyph}
              </span>
            </div>
          ) : null}

          {replacementAbility ? (
            <div className="mt-3 border border-[#4be3ff]/40 bg-[#4be3ff]/10 px-4 py-4 text-left sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="pa-pixel flex items-center gap-2 text-[8px] text-[#4be3ff]">
                  <Sparkles className="h-3 w-3" /> NEW ABILITY
                </p>
                <p className="pa-pixel mt-2 text-[11px] text-white">{ABILITIES[replacementAbility]?.name}</p>
                <p className="pa-pixel mt-1 text-[7px] text-[#4be3ff]/70">RANK 1</p>
                <p className="mt-1 text-[12px] tracking-wide text-[#c6d2f2]/60">{ABILITIES[replacementAbility]?.blurb}</p>
              </div>
              <span className="pa-pixel mt-3 block text-2xl text-[#4be3ff] sm:mt-0">
                {ABILITIES[replacementAbility]?.glyph}
              </span>
            </div>
          ) : null}

          {coinsTotal > 0 ? (
            <div
              className={`mt-4 border px-4 py-3 text-left ${
                coins >= coinsTotal ? "border-[#ffd166]/50 bg-[#ffd166]/10" : "border-[#ffd166]/25 bg-[#ffd166]/[0.04]"
              }`}
            >
              <p className="pa-pixel flex items-center gap-2 text-[8px] text-[#ffd166]">
                <Gem className="h-3 w-3" /> COIN CHALLENGE
              </p>
              <p className="mt-1 text-[12px] tracking-wide text-[#c6d2f2]/60">
                {coins} / {coinsTotal} coins recovered
                {coins >= coinsTotal ? " — bonus orbs secured." : " — gather all coins in one run for the full orb bonus."}
              </p>
            </div>
          ) : null}

          {unlockedWeapon ? (
            <div className="mt-4 border border-[#ffd166]/50 bg-[#ffd166]/10 px-4 py-4 text-left sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="pa-pixel flex items-center gap-2 text-[8px] text-[#ffd166]">
                  <Sparkles className="h-3 w-3" /> WEAPON UNLOCKED
                </p>
                <p className="pa-pixel mt-2 text-[11px] text-white">{WEAPONS[unlockedWeapon]?.name}</p>
                <p className="mt-1 text-[12px] tracking-wide text-[#c6d2f2]/60">{WEAPONS[unlockedWeapon]?.description}</p>
              </div>
              <span className="pa-pixel mt-3 block text-[8px] text-[#ffd166] sm:mt-0">EQUIP IN LOADOUT</span>
            </div>
          ) : null}

          {unlockedSecret ? (
            <div className="mt-4 border border-[#4be3ff]/40 bg-[#4be3ff]/10 px-4 py-3">
              <p className="pa-pixel text-[8px] text-[#4be3ff]">RIFT STAGE {unlockedSecret} UNLOCKED</p>
            </div>
          ) : null}

          {isLevelSelect ? (
            <div className="mt-6 border border-[#ffd166]/30 bg-[#ffd166]/[0.05] px-5 py-4">
              <div className="flex flex-col gap-2">
                <p className="pa-pixel flex items-center justify-between gap-4 text-[8px] text-[#c6d2f2]/60">
                  <span>RUN TIME</span>
                  <span className="font-mono text-[#4be3ff]">
                    {Math.floor(runTimer / 60)}:{String(runTimer % 60).padStart(2, "0")}
                  </span>
                </p>
                <p className="pa-pixel flex items-center justify-between gap-4 text-[8px] text-[#c6d2f2]/60">
                  <span>SCORE</span>
                  <span className="font-mono text-[#ffd166]">{runScore}</span>
                </p>
                <p className="pa-pixel flex items-center justify-center gap-4 text-[8px]">
                  <span>RANK</span>
                  <span className={`font-bold text-[14px] px-3 py-1 border border-current rounded`} style={{ color: rankForScore(runScore).color }}>
                    {rankForScore(runScore).grade}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="pa-pixel flex items-center justify-center gap-2 text-[7px] text-[#c6d2f2]/55 sm:justify-start">
              <Trophy className="h-3.5 w-3.5" style={{ color: accent }} />
              {isChallenge ? "EMBLEM AND CODE ADDED TO YOUR SAVE" : level.id === 10 ? "FINAL RECORD SAVED" : `+${orbGain} ORBS ADDED TO YOUR SAVE`}
            </p>
            {autoReturn ? (
              <p className="pa-pixel text-[7px] text-[#c6d2f2]/30">RETURNING TO WORLD MAP…</p>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onContinue}
                  className="pa-pixel flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 py-2 text-[8px] text-[#c6d2f2]/70 hover:border-white/40 hover:text-white"
                >
                  <ArrowLeft className="h-3 w-3" /> {isChallenge ? "TRIAL SELECT" : "WORLD MAP"}
                </button>
                {nextStage ? (
                  <button
                    type="button"
                    onClick={onNextStage}
                    className="pa-pixel flex min-h-11 items-center justify-center gap-2 px-5 py-2 text-[8px] text-[#05060d] transition-transform hover:scale-[1.02]"
                    style={{ background: accent }}
                  >
                    NEXT STAGE <ArrowRight className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function GameCanvas({ level, save, onComplete, onOutOfLives, onRestart, onQuit, onScore, timer, score, retryGems = 0, isLevelSelect, challenge, arcade = false, arcadeState = null }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const propsRef = useRef({ save, onComplete, onOutOfLives, onScore });
  const controls = { ...DEFAULT_CONTROLS, ...(save?.settings?.controls || {}) };
  const [hud, setHud] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [displayNotice, setDisplayNotice] = useState("");
  const [settings, setSettings] = useState(() => ({
    master: 1,
    music: 0.45,
    sfx: 0.7,
    shake: true,
    touchControls: true,
    touchControlMode: "joystick",
    mobileOrientation: "landscape",
    ...(save?.settings || {}),
  }));

  propsRef.current = { save, onComplete, onOutOfLives, onScore };

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    const currentSave = propsRef.current.save;
    setSfxVolume((currentSave?.settings?.sfx ?? 0.7) * (currentSave?.settings?.master ?? 1));
    document.documentElement.classList.toggle("pa-high-contrast", Boolean(currentSave?.settings?.highContrast));

    loadAssets().then((assets) => {
      if (disposed) return;
      const engine = new GameEngine({
        canvas,
        level,
        assets,
        save: currentSave,
        challenge,
        arcade,
        arcadeState,
        hooks: {
          onHud: setHud,
          onNarrative: setNarrative,
          onStar: (index) => { if (!challenge && !arcade) recordStar(level.id, index); },
          onCoin: (index) => { if (!challenge && !arcade) recordCoin(level.id, index); },
          onCheckpoint: (index) => { if (!challenge && !arcade) saveCheckpoint(level.id, index); },
          onComplete: (payload) => propsRef.current.onComplete?.(payload),
          onOutOfLives: () => propsRef.current.onOutOfLives?.(),
          onScore: (amount) => propsRef.current.onScore?.(amount),
        },
      });
      engineRef.current = engine;
      window.__PA__ = engine;
      engine.start();
    });

    return () => {
      disposed = true;
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, [level]);

  const togglePause = useCallback(
    (value) => {
      const engine = engineRef.current;
      if (!engine) return;
      const next = value ?? !paused;
      setPaused(next);
      if (!next) setShowSettings(false);
      engine.pause(next);
      sfx(next ? "back" : "select");
    },
    [paused]
  );

  const enterFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return;
    const target = document.documentElement;
    if (!target?.requestFullscreen) {
      setDisplayNotice("Fullscreen is unavailable in this browser.");
      return false;
    }

    try {
      await target.requestFullscreen();
      const orientation = window.screen?.orientation;
      if (orientation?.lock) {
        try {
          await orientation.lock(settings.mobileOrientation || "landscape");
          setDisplayNotice("");
        } catch {
          setDisplayNotice("Fullscreen is active, but this browser cannot lock orientation.");
        }
      } else {
        setDisplayNotice("Fullscreen is active; use your device settings to change orientation.");
      }
      return true;
    } catch {
      setDisplayNotice("Tap the fullscreen button again or use a browser that supports fullscreen.");
      return false;
    }
  }, [settings.mobileOrientation]);

  const toggleGameFullscreen = useCallback(async () => {
    if (document.fullscreenElement === document.documentElement) {
      try {
        await document.exitFullscreen();
        window.screen?.orientation?.unlock?.();
        setDisplayNotice("");
        return true;
      } catch {
        setDisplayNotice("Fullscreen could not be exited.");
        return false;
      }
    }
    return enterFullscreen();
  }, [enterFullscreen]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === document.documentElement);
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const applySettings = useCallback(
    (patch) => {
      const merged = {
        ...settings,
        ...patch,
        controls: { ...(settings.controls || {}), ...(patch.controls || {}) },
      };
      setSettings(merged);
      setSfxVolume((merged.sfx ?? 0.7) * (merged.master ?? 1));
      document.documentElement.classList.toggle("pa-high-contrast", Boolean(merged.highContrast));
      if (engineRef.current) engineRef.current.settings = merged;
      writeSave({ settings: merged });
      if (patch.mobileOrientation && document.fullscreenElement === document.documentElement) {
        try {
          window.screen?.orientation?.lock?.(patch.mobileOrientation).catch(() => {
            setDisplayNotice("Saved orientation preference; this browser could not apply it.");
          });
        } catch {
          setDisplayNotice("Saved orientation preference; this browser could not apply it.");
        }
      }
    },
    [settings]
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.code === "Escape" || event.code === "KeyP") {
        if (narrative) return;
        event.preventDefault();
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        togglePause(!paused);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [narrative, paused, showSettings, togglePause]);

  const closeNarrative = () => {
    engineRef.current?.closeNarrative();
    setNarrative(null);
  };

  return (
    <div
      className={`pa-root pa-game-root flex min-h-[100dvh] touch-none flex-col items-center justify-center overflow-hidden px-0 py-0 sm:px-4 sm:py-3 ${settings.highContrast ? "pa-high-contrast" : ""}`}
    >
      <div className="pa-game-shell relative w-full max-w-[1180px]">
        <div
          className="pa-game-stage pa-panel relative mx-auto overflow-hidden bg-[#05060d]"
          style={{
            aspectRatio: `${VIEW_W} / ${VIEW_H}`,
            // let the stage itself take more of the screen while keeping the HUD compact
            width: fullscreen ? "min(100vw, calc(100dvh * 1.7647))" : "min(100%, calc((100dvh - 1.5rem) * 1.7647))",
          }}
        >
          <canvas
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
            className="pa-canvas absolute inset-0 h-full w-full"
            style={{ touchAction: "none" }}
          />
          <GameHud hud={hud} onReload={() => engineRef.current?.useReload()} timer={timer} score={score} retryGems={retryGems} isLevelSelect={isLevelSelect} arcade={arcade} />

          <button
            type="button"
            onClick={toggleGameFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="pa-touch-only pa-touch-fullscreen absolute left-2 top-16 z-30 grid h-11 w-11 place-items-center border border-white/25 bg-[#0a0d1c]/80 text-white/85 backdrop-blur-sm"
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => togglePause()}
            aria-label="Pause"
            className="pa-touch-only absolute right-2 top-28 z-30 grid h-11 w-11 place-items-center border border-white/25 bg-[#0a0d1c]/80 text-white/85 backdrop-blur-sm"
          >
            <Pause className="h-4 w-4" />
          </button>

          <TouchControls
            engine={engineRef}
            enabled={settings.touchControls !== false}
            controlMode={settings.touchControlMode}
            onControlModeChange={(touchControlMode) => applySettings({ touchControlMode })}
            onFirstInput={enterFullscreen}
          />
          {displayNotice ? (
            <p role="status" className="pointer-events-none absolute inset-x-14 top-16 z-30 text-center text-[10px] text-[#ffd166]">
              {displayNotice}
            </p>
          ) : null}
          <NarrativeBox narrative={narrative} onClose={closeNarrative} />

          <div className="pa-desktop-only pointer-events-none absolute bottom-3 right-3 hidden text-right md:block">
            <p className="pa-pixel text-[6px] leading-4 text-white/30">
              {keyLabel(controls.jump)} JUMP · {keyLabel(controls.fire)} FIRE · {keyLabel(controls.dash)} DASH
            </p>
            <p className="pa-pixel text-[6px] leading-4 text-white/30">            {keyLabel(controls.swap)} SWAP · {keyLabel(controls.reload)} RELOAD · ESC PAUSE</p>
          </div>

          {paused ? (
            <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#05060d]/88 px-4 py-6 backdrop-blur-sm">
              {showSettings ? (
                <SettingsPanel
                  settings={settings}
                  onChange={applySettings}
                  onBack={() => setShowSettings(false)}
                  onFullscreenToggle={toggleGameFullscreen}
                />
              ) : (
                <div className="pa-fade-up w-[300px] max-w-full">
                  <p className="pa-pixel text-center text-[8px] text-[#4be3ff]/70">SYSTEM PAUSED</p>
                  <h2 className="pa-pixel mt-3 text-center text-sm text-white">{level.name}</h2>
                  <div className="mt-5 space-y-2">
                    <button
                      type="button"
                      onClick={() => togglePause(false)}
                      className="pa-pixel flex w-full items-center justify-center gap-2 bg-[#4be3ff] px-4 py-3 text-[9px] text-[#05060d]"
                    >
                      <Play className="h-3 w-3" /> RESUME
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="pa-pixel flex w-full items-center justify-center gap-2 border border-[#2a2f52] px-4 py-3 text-[9px] text-[#c6d2f2]/70 hover:border-[#4be3ff] hover:text-white"
                    >
                      <Settings className="h-3 w-3" /> SETTINGS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        togglePause(false);
                        onRestart?.();
                      }}
                      className="pa-pixel flex w-full items-center justify-center gap-2 border border-[#2a2f52] px-4 py-3 text-[9px] text-[#c6d2f2]/70 hover:border-[#ff3d8b] hover:text-white"
                    >
                      <RotateCcw className="h-3 w-3" /> RESTART STAGE
                    </button>
                    <button
                      type="button"
                      onClick={onQuit}
                      className="pa-pixel flex w-full items-center justify-center gap-2 border border-[#2a2f52] px-4 py-3 text-[9px] text-[#c6d2f2]/50 hover:border-[#4be3ff] hover:text-white"
                    >
                      <ArrowLeft className="h-3 w-3" /> WORLD MAP
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <p className="pa-desktop-only pa-pixel mt-2 hidden text-center text-[6px] text-[#c6d2f2]/25 sm:block">
          PROJECT: RESONANCE · STAGE {String(level.id).padStart(2, "0")} · {level.name}
        </p>
      </div>
    </div>
  );
}
