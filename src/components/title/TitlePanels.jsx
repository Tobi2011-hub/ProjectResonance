/**
 * TITLE PANELS — the title screen's building blocks: the logo block, the menu,
 * the pop-up frame and the Load / Settings / Confirm / Exit panels.
 * (These were seven separate files; they only appear on the title screen.)
 */
import { useEffect, useState } from "react";
import { ChevronRight, Lock, Maximize, Play, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import {
  CHARACTERS,
  CONTROL_ROWS,
  DEFAULT_CONTROLS,
  MAX_STARS,
  WEAPON_TYPES,
  keyLabel,
  stageStars,
  totalStars,
} from "@/game/core";
import { FRUIT_POWERUPS } from "@/game/collectibles";
import { ENEMY_VARIANTS } from "@/game/entities";

export function PanelFrame({ title, tag, children, onBack }) {
  return (
    <div className="pa-panel pa-fade-up w-full max-w-[520px] p-6">
      <div className="flex items-start justify-between gap-4 border-b border-[#2a2f52] pb-4">
        <div>
          <p className="pa-pixel text-[8px] text-[#4be3ff]/70">{tag}</p>
          <h2 className="pa-pixel mt-2 text-[13px] text-white">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="pa-pixel border border-[#2a2f52] px-3 py-2 text-[8px] text-[#c6d2f2]/70 transition-colors hover:border-[#ff3d8b] hover:text-white"
        >
          ESC
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function TitleLogo() {
  return (
    <div className="pa-fade-up">
      <div className="flex items-center gap-3 text-[9px] pa-pixel text-[#4be3ff]/80">
        <span className="inline-block h-2 w-2 bg-[#ff3d8b]" />
        ACTION PLATFORMER
        <span className="h-px w-10 bg-[#4be3ff]/40" />
        <span className="text-[#c6d2f2]/50">10 STAGES</span>
      </div>
      <h1 className="pa-pixel pa-title mt-5 text-[30px] leading-[1.3] sm:text-[40px] lg:text-[50px]">
        PROJECT:
        <br />
        RESONANCE
      </h1>
      <p className="mt-4 max-w-md text-sm font-medium tracking-wide text-[#c6d2f2]/70 sm:text-base">
        Dash the gaps, kick off the walls, and cut through ten stages to the void core.
      </p>
    </div>
  );
}

export function MenuList({ items, index, onFocus, onSelect }) {
  return (
    <div className="pa-panel mt-8 w-full max-w-[430px] px-3 py-3" role="menu" aria-label="Title screen menu">
      {items.map((item, i) => {
        const active = i === index;
        const disabled = Boolean(item.disabled);
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={disabled}
            aria-current={active ? "true" : undefined}
            aria-disabled={disabled}
            onMouseEnter={() => onFocus(i)}
            onClick={() => onSelect(item.id)}
            className={`group relative flex w-full items-center gap-3 px-3 py-3 text-left transition-all duration-150 ${
              disabled
                ? "cursor-not-allowed opacity-35"
                : active
                ? "pa-focus-row translate-x-1"
                : "hover:bg-white/[0.03]"
            }`}
          >
            <span
              className={`pa-pixel text-[8px] transition-colors ${
                active ? "text-[#ff3d8b]" : "text-[#c6d2f2]/35"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`pa-pixel flex-1 text-[11px] transition-colors sm:text-[12px] ${
                disabled ? "text-[#c6d2f2]/30" : active ? "text-white" : "text-[#c6d2f2]/70"
              }`}
            >
              {item.label}
            </span>
            {item.meta ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c6d2f2]/40">
                {item.meta}
              </span>
            ) : null}
            {disabled ? <Lock className="h-3 w-3 text-[#c6d2f2]/25" /> : <ChevronRight
              className={`h-4 w-4 transition-all ${
                active ? "translate-x-0 text-[#4be3ff] opacity-100" : "-translate-x-1 opacity-0"
              }`}
            />}
          </button>
        );
      })}
    </div>
  );
}

export function LevelSelectPanel({ levels, onSelect, onBack }) {
  return (
    <PanelFrame tag="100% COMPLETE" title="LEVEL SELECT" onBack={onBack}>
      <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {levels.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => onSelect(level.id)}
            className="border border-[#2a2f52] bg-black/30 p-3 text-left transition-colors hover:border-[#4be3ff]/70 hover:bg-[#4be3ff]/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
          >
            <span className="pa-pixel text-[7px] text-[#4be3ff]">
              {level.id <= 10 ? `STAGE ${String(level.id).padStart(2, "0")}` : `SECRET ${String(level.id).padStart(2, "0")}`}
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-white">{level.name}</span>
          </button>
        ))}
      </div>
    </PanelFrame>
  );
}

export function SaveSlotsPanel({ slots, activeSlot, mode, onSelect, onErase, onBack }) {
  const creating = mode === "new";
  return (
    <PanelFrame tag="SAVE ARCHIVE" title={creating ? "New Game" : "Load Game"} onBack={onBack}>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {slots.map(({ id, save }) => (
          <div key={id} className="border border-[#2a2f52] bg-black/30 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              {save ? (
                <div
                  className={`pa-cameo !h-12 !w-12 shrink-0 sm:!h-16 sm:!w-16 ${
                    save.character === 1
                      ? "pa-cameo--nf"
                      : save.character === 2
                      ? "pa-cameo--pm"
                      : save.character === 3
                      ? "pa-cameo--en"
                      : save.character === 4
                      ? "pa-cameo--vx"
                      : ""
                  }`}
                />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center border border-dashed border-[#2a2f52] text-[#c6d2f2]/25 sm:h-16 sm:w-16">
                  <span className="pa-pixel text-[7px]">EMPTY</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="pa-pixel text-[9px] text-white">SLOT {String(id).padStart(2, "0")}</p>
                  {id === activeSlot ? <span className="pa-pixel text-[6px] text-[#4be3ff]">ACTIVE</span> : null}
                </div>
                {save ? (
                  <>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#c6d2f2]/60">
                      {CHARACTERS[save.character]?.name || "Vanguard"} · Stage {save.highestStage}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] tracking-wide text-[#c6d2f2]/60">
                      <span>Stars: {totalStars(save)}/{MAX_STARS}</span>
                      <span>Stage 1: {stageStars(save, 1)}/5</span>
                      <span>Primary: {WEAPON_TYPES[save.primary]?.name}</span>
                      <span>Secondary: {WEAPON_TYPES[save.secondary]?.name}</span>
                    </div>
                    <p className="mt-1 text-[9px] uppercase tracking-wide text-[#c6d2f2]/30">
                      {save.savedAt ? new Date(save.savedAt).toLocaleString() : "Newly created"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[#c6d2f2]/35">No save data</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onSelect(id, save)}
                className={`pa-pixel flex min-h-[44px] flex-1 items-center justify-center gap-2 px-3 py-2 text-[8px] transition-colors ${
                  save && creating
                    ? "border border-[#ff3d8b]/50 text-[#ff3d8b] hover:bg-[#ff3d8b]/10"
                    : "bg-[#4be3ff] text-[#05060d] hover:bg-[#7af6c8]"
                }`}
              >
                {save && !creating ? <Play className="h-3 w-3" /> : null}
                {save ? (creating ? "OVERWRITE" : "LOAD") : "NEW GAME"}
              </button>
              {save && !creating ? (
                <button
                  type="button"
                  onClick={() => onErase(id)}
                  className="pa-pixel flex min-h-[44px] items-center gap-2 border border-[#ff3d8b]/60 px-3 py-2 text-[8px] text-[#ff3d8b] transition-colors hover:bg-[#ff3d8b]/10"
                >
                  <Trash2 className="h-3 w-3" /> ERASE
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}

export function SettingsPanel({ settings, onChange, onBack, onFullscreenToggle }) {
  const [listening, setListening] = useState(null);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [notice, setNotice] = useState("");
  const controls = { ...DEFAULT_CONTROLS, ...(settings.controls || {}) };

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    if (!listening) return undefined;
    const onKey = (event) => {
      event.preventDefault();
      if (event.code === "Escape") {
        setListening(null);
        return;
      }
      onChange({ controls: { ...controls, [listening]: event.code } });
      setListening(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, controls, onChange]);

  const row = (label, value) => (
    <div className="mb-2 flex items-center justify-between">
      <span className="pa-pixel text-[9px] text-[#c6d2f2]/80">{label}</span>
      <span className="pa-pixel text-[9px] text-[#4be3ff]">{Math.round(value * 100)}</span>
    </div>
  );
  const sliderStyle = (value) => {
    const fill = `${Math.round(value * 100)}%`;
    return { background: `linear-gradient(90deg, var(--pa-cyan) 0%, var(--pa-cyan) ${fill}, #1c2140 ${fill})` };
  };

  const toggleFullscreen = async () => {
    try {
      if (onFullscreenToggle) {
        const changed = await onFullscreenToggle();
        if (changed === false) throw new Error("Fullscreen could not be changed.");
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        await window.screen?.orientation?.lock?.(settings.mobileOrientation || "landscape");
      } else {
        throw new Error("Fullscreen is not supported by this browser.");
      }
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Fullscreen could not be changed.");
    }
  };

  const selectSetting = (label, options, selected, onSelect) => (
    <div className="space-y-2">
      <p className="pa-pixel text-[8px] text-[#c6d2f2]/80">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected === option.value}
            onClick={() => onSelect(option.value)}
            className={`pa-pixel min-h-11 border px-3 py-2 text-[7px] transition-colors ${
              selected === option.value
                ? "border-[#4be3ff] bg-[#4be3ff]/10 text-[#4be3ff]"
                : "border-[#2a2f52] text-[#c6d2f2]/50 hover:border-[#4be3ff]/60"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const selectOrientation = async (mobileOrientation) => {
    onChange({ mobileOrientation });
    if (onFullscreenToggle) return;
    if (!document.fullscreenElement || !window.screen?.orientation?.lock) return;
    try {
      await window.screen.orientation.lock(mobileOrientation);
      setNotice("");
    } catch {
      setNotice("Preference saved; this browser cannot lock the screen orientation.");
    }
  };

  const toggle = (label, value, onClick, icon = null) => (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 border border-[#2a2f52] px-4 py-3 text-left transition-colors hover:border-[#4be3ff]/60"
    >
      <span className="pa-pixel flex items-center gap-2 text-[8px] text-[#c6d2f2]/80">
        {icon}
        {label}
      </span>
      <span className={`pa-pixel text-[8px] ${value ? "text-[#4be3ff]" : "text-[#c6d2f2]/30"}`}>
        {value ? "ON" : "OFF"}
      </span>
    </button>
  );

  return (
    <PanelFrame tag="SYSTEM CONFIG" title="Settings" onBack={onBack}>
      <div className="pa-settings-scroll max-h-[65vh] space-y-4 overflow-y-auto pr-1 sm:space-y-6">
        <div>
          {row("MASTER", settings.master ?? 1)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.master ?? 1}
            onChange={(e) => onChange({ master: Number(e.target.value) })}
            style={sliderStyle(settings.master ?? 1)}
            className="pa-range-slider w-full"
            aria-label="Master volume"
          />
        </div>
        <div>
          {row("MUSIC", settings.music)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.music}
            onChange={(e) => onChange({ music: Number(e.target.value) })}
            style={sliderStyle(settings.music)}
            className="pa-range-slider w-full"
            aria-label="Music volume"
          />
        </div>
        <div>
          {row("SFX", settings.sfx)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.sfx}
            onChange={(e) => onChange({ sfx: Number(e.target.value) })}
            style={sliderStyle(settings.sfx)}
            className="pa-range-slider w-full"
            aria-label="Sound effect volume"
          />
        </div>
        {toggle("SCREEN SHAKE", settings.shake, () => onChange({ shake: !settings.shake }))}
        {toggle("TOUCH CONTROLS", settings.touchControls !== false, () => onChange({ touchControls: settings.touchControls === false } ), <Smartphone className="h-3 w-3" />)}
        {selectSetting(
          "TOUCH CONTROL STYLE",
          [
            { value: "joystick", label: "ANALOG STICK" },
            { value: "dpad", label: "D-PAD" },
          ],
          settings.touchControlMode || "joystick",
          (touchControlMode) => onChange({ touchControlMode })
        )}
        {selectSetting(
          "MOBILE ORIENTATION",
          [
            { value: "landscape", label: "LANDSCAPE" },
            { value: "portrait", label: "PORTRAIT" },
          ],
          settings.mobileOrientation || "landscape",
          selectOrientation
        )}
        {[
          ["menu", "MAIN MENU BACKGROUND"],
          ["map", "WORLD MAP BACKGROUND"],
          ["shop", "SHOP BACKGROUND"],
        ].map(([key, label]) => (
          <div key={key}>
            {selectSetting(label, [
              { value: "blue", label: "STARFIELD BLUE" },
              { value: "purple", label: "NEBULA VIOLET" },
              { value: "teal", label: "DEEP TEAL" },
              { value: "ember", label: "EMBER GLOW" },
            ], settings.backgrounds?.[key] || (key === "menu" ? "blue" : "purple"), (value) => onChange({ backgrounds: { ...(settings.backgrounds || {}), [key]: value } }))}
          </div>
        ))}
        <p className="-mt-2 text-xs text-[#c6d2f2]/40">
          Orientation locking is supported only by some mobile browsers and may require fullscreen.
        </p>
        {toggle("HIGH CONTRAST", Boolean(settings.highContrast), () => onChange({ highContrast: !settings.highContrast }))}
        <div>
          {toggle("FULLSCREEN", fullscreen, toggleFullscreen, <Maximize className="h-3 w-3" />)}
          {notice ? <p className="mt-2 text-xs text-[#ff9f45]">{notice}</p> : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="pa-pixel text-[8px] text-[#4be3ff]/70">CONTROL LAYOUT</p>
            <button
              type="button"
              onClick={() => onChange({ controls: { ...DEFAULT_CONTROLS } })}
              className="pa-pixel flex items-center gap-1 text-[7px] text-[#c6d2f2]/40 hover:text-white"
            >
              <RotateCcw className="h-2.5 w-2.5" /> RESET
            </button>
          </div>
          <div className="space-y-1.5">
            {CONTROL_ROWS.map((control) => {
              const active = listening === control.key;
              return (
                <button
                  key={control.key}
                  type="button"
                  onClick={() => setListening(active ? null : control.key)}
                  className={`flex w-full items-center justify-between border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-[#ffd166] bg-[#ffd166]/10"
                      : "border-[#2a2f52] hover:border-[#4be3ff]/60"
                  }`}
                >
                  <span className="pa-pixel text-[8px] text-[#c6d2f2]/70">{control.label}</span>
                  <span className={`pa-pixel text-[8px] ${active ? "text-[#ffd166] pa-blink" : "text-[#4be3ff]"}`}>
                    {active ? "PRESS KEY" : keyLabel(controls[control.key])}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed tracking-wide text-[#c6d2f2]/35">
            Click a row, then press the key you want. Escape cancels. Pause stays on ESC / P and messages on Enter.
          </p>
        </div>

        <details className="border border-[#2a2f52] bg-black/20">
          <summary className="pa-pixel cursor-pointer px-4 py-3 text-[8px] text-[#4be3ff]">
            FIELD MANUAL — CONTROLS, ITEMS & ENEMIES
          </summary>
          <div className="space-y-5 border-t border-[#2a2f52] px-4 py-4">
            <section>
              <h3 className="pa-pixel text-[8px] text-white">CONTROLS</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                {CONTROL_ROWS.map((control) => (
                  <div key={control.key} className="flex items-center justify-between gap-2">
                    <dt className="text-[#c6d2f2]/55">{control.label}</dt>
                    <dd className="pa-pixel text-[7px] text-[#4be3ff]">{keyLabel(controls[control.key])}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#c6d2f2]/55">PAUSE</dt>
                  <dd className="pa-pixel text-[7px] text-[#4be3ff]">ESC / P</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] leading-relaxed text-[#c6d2f2]/45">
                Jump height depends on how long you hold jump. Dash works in the air; wall-jump by pressing jump against a wall.
                Reload normally refills ammo and heals once per stage; Star Magnet changes this to an ammo-for-healing trade.
                On touch devices, use the on-screen controls.
              </p>
            </section>

            <section>
              <h3 className="pa-pixel text-[8px] text-white">COLLECTIBLES & STAGE OBJECTS</h3>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[#c6d2f2]/50">
                <li><span className="text-[#ffd166]">Stars:</span> Find five in a stage; collecting all five in one run unlocks its rift. A no-death clear earns a sixth star.</li>
                <li><span className="text-[#ffd166]">Coins:</span> Take every coin in challenge stages 1, 3, and 5 to earn a weapon.</li>
                <li><span className="text-[#4be3ff]">Ammo crates:</span> Refill your weapon reserves. Defeating enemies also restores a little ammo.</li>
                <li>
                  <span className="text-[#7af6c8]">Fruit power-ups:</span> Each pickup is random. The eight types are:
                  <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
                    {FRUIT_POWERUPS.map((fruit) => (
                      <p key={fruit.id} className="flex items-start gap-1.5">
                        <span className="mt-1 h-2 w-2 shrink-0" style={{ backgroundColor: fruit.color }} aria-hidden="true" />
                        <span><span className="text-[#e8eefc]/80">{fruit.name}:</span> {fruit.description}</span>
                      </p>
                    ))}
                  </div>
                </li>
                <li><span className="text-white">Checkpoints:</span> Save your respawn point. Reach the exit to clear the stage; defeat the boss first when a door is sealed.</li>
              </ul>
            </section>

            <section>
              <h3 className="pa-pixel text-[8px] text-white">ENEMY TYPES</h3>
              <div className="mt-2 space-y-2">
                {Object.entries(ENEMY_VARIANTS).map(([id, enemy]) => (
                  <div key={id} className="flex gap-2 text-[11px] leading-relaxed">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 border border-white/30"
                      style={{ backgroundColor: enemy.accent }}
                      aria-hidden="true"
                    />
                    <p className="text-[#c6d2f2]/50">
                      <span className="text-white">{enemy.name}:</span> {enemy.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="pa-pixel text-[8px] text-white">SURVIVAL</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-[#c6d2f2]/45">
                Watch for spikes and saws, and time your crossing of moving platforms. You have three lives per stage.
                Swap between your two equipped weapons to match the enemy or distance; pause with ESC or P to adjust settings or restart.
              </p>
            </section>
          </div>
        </details>
      </div>
    </PanelFrame>
  );
}

export function ConfirmPanel({ title, message, confirmLabel, onConfirm, onBack }) {
  return (
    <PanelFrame tag="CONFIRM" title={title} onBack={onBack}>
      <p className="text-sm leading-relaxed tracking-wide text-[#c6d2f2]/65">{message}</p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="pa-pixel flex-1 bg-[#ff3d8b] px-4 py-3 text-[9px] text-[#05060d] transition-transform hover:scale-[1.01]"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="pa-pixel border border-[#2a2f52] px-4 py-3 text-[9px] text-[#c6d2f2]/70 transition-colors hover:border-[#4be3ff] hover:text-white"
        >
          CANCEL
        </button>
      </div>
    </PanelFrame>
  );
}

export function ExitOverlay({ onReturn }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050b]/95 px-6">
      <div className="pa-fade-up text-center">
        <p className="pa-pixel text-[8px] text-[#ff3d8b]">APPLICATION HALTED</p>
        <h2 className="pa-pixel pa-title mt-5 text-lg sm:text-2xl">THANKS FOR PLAYING</h2>
        <p className="mt-4 text-sm tracking-wide text-[#c6d2f2]/50">
          The game closed cleanly and your progress is stored on this device.
        </p>
        <button
          type="button"
          onClick={onReturn}
          className="pa-pixel mt-8 border border-[#4be3ff] px-6 py-3 text-[9px] text-[#4be3ff] transition-colors hover:bg-[#4be3ff]/10"
        >
          RESTART SYSTEM
        </button>
      </div>
    </div>
  );
}
