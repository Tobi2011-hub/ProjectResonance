/**
 * GAME UI — everything around the canvas: the decorative backdrop, the stage
 * host (GameCanvas), the tutorial box, the pause menu with in-stage settings,
 * and the stage-clear card.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Gem, Maximize, Minimize, Pause, Play, RotateCcw, Settings, Sparkles, Trophy } from "lucide-react";
import { loadAssets } from "@/game/world";
import {
  ABILITIES,
  DEFAULT_CONTROLS,
  WEAPONS,
  VIEW_H,
  VIEW_W,
  keyLabel,
  recordStar,
  saveCheckpoint,
  setSfxVolume,
  sfx,
  writeSave,
} from "@/game/core";
import GameEngine from "@/game/engine";
import GameHud from "@/components/game/GameHud";
import TouchControls from "@/components/game/TouchControls";
import StarReveal from "@/components/game/StarReveal";
import { SettingsPanel } from "@/components/title/TitlePanels";

export function PixelBackdrop({ variant = "blue" }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 pa-bg-tile ${variant === "purple" ? "pa-bg-tile--purple" : ""} opacity-70`} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070810]/85 via-[#0a0c1c]/80 to-[#070810]" />
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

export function ClearOverlay({
  level,
  stars,
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
  autoReturn = false,
  onContinue,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04050b]/94 px-4 py-8">
      <div className="pa-panel pa-fade-up relative w-full max-w-2xl overflow-hidden p-6 text-center sm:p-10">
        <div className="absolute inset-0 opacity-25 pa-bg-tile" />
        <div className="relative">
          <p className="pa-pixel text-[8px] tracking-[0.2em] text-[#4be3ff]">
            {level.id === 10 ? "VOID CORE DESTROYED" : level.secretOf ? "RIFT STAGE CLEARED" : "STAGE COMPLETE"}
          </p>
          <h2 className="pa-pixel pa-title mt-5 text-2xl leading-tight text-white sm:text-4xl">
            {level.id === 10 ? "RESONANCE SECURED" : "STAGE CLEARED"}
          </h2>
          <p className="mt-3 text-sm tracking-[0.18em] text-[#c6d2f2]/55 sm:text-base">
            STAGE {String(level.id).padStart(2, "0")} — {level.name}
          </p>

          <StarReveal stars={stars} noDeath={noDeath} />

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
                {coins >= coinsTotal ? " — perfect run." : " — every coin is needed for the weapon."}
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

          <div className="mt-7 flex items-center justify-between border-t border-[#2a2f52] pt-4">
            <p className="pa-pixel flex items-center gap-2 text-[8px] text-[#c6d2f2]/50">
              <Trophy className="h-3 w-3 text-[#4be3ff]" />
              {level.id === 10 ? "RECORD SAVED" : orbGain ? `+${orbGain} ORBS` : `STAGE ${level.id + 1} READY`}
            </p>
            {autoReturn ? (
              <p className="pa-pixel text-[7px] text-[#c6d2f2]/30">RETURNING TO WORLD MAP…</p>
            ) : (
              <button
                type="button"
                onClick={onContinue}
                className="pa-pixel flex min-h-10 items-center gap-2 bg-[#4be3ff] px-4 py-2 text-[8px] text-[#05060d] hover:bg-[#7af6c8]"
              >
                <ArrowLeft className="h-3 w-3" /> WORLD MAP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameCanvas({ level, save, onComplete, onOutOfLives, onRestart, onQuit }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const propsRef = useRef({ save, onComplete, onOutOfLives });
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

  propsRef.current = { save, onComplete, onOutOfLives };

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
        hooks: {
          onHud: setHud,
          onNarrative: setNarrative,
          onStar: (index) => recordStar(level.id, index),
          onCheckpoint: (index) => saveCheckpoint(level.id, index),
          onComplete: (payload) => propsRef.current.onComplete?.(payload),
          onOutOfLives: () => propsRef.current.onOutOfLives?.(),
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
          <GameHud hud={hud} onReload={() => engineRef.current?.useReload()} />

          <button
            type="button"
            onClick={toggleGameFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="pa-touch-only pa-touch-fullscreen absolute left-2 top-16 z-30 grid h-10 w-10 place-items-center border border-white/20 bg-[#0a0d1c]/70 text-white/70 backdrop-blur-sm"
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => togglePause()}
            aria-label="Pause"
            className="pa-touch-only absolute right-2 top-28 z-30 grid h-10 w-10 place-items-center border border-white/20 bg-[#0a0d1c]/70 text-white/70 backdrop-blur-sm"
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