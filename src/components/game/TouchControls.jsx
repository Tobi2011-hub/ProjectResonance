/**
 * TOUCH CONTROLS — feeds the same virtual actions as the keyboard.
 */
import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  ArrowUp,
  Repeat2,
  X,
} from "lucide-react";

function PadButton({ engine, action, label, icon: Icon, className = "", onFirstInput }) {
  const press = (down) => engine?.current?.input?.setVirtual(action, down);

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onFirstInput?.();
        press(true);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        press(false);
      }}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
      onLostPointerCapture={() => press(false)}
      onContextMenu={(event) => event.preventDefault()}
      className={`pointer-events-auto relative flex touch-none select-none flex-col items-center justify-center gap-1 border border-white/25 bg-[#0a0d1c]/75 text-white backdrop-blur-sm active:border-[#4be3ff] active:bg-[#4be3ff]/25 ${className}`}
    >
      <Icon className="h-5 w-5" />
      <span className="pa-pixel text-[6px] text-white/60">{label}</span>
    </button>
  );
}

function AnalogStick({ engine, onFirstInput }) {
  const stickRef = useRef(null);
  const activePointer = useRef(null);
  const origin = useRef(null);
  const [axis, setAxis] = useState({ x: 0, y: 0 });

  const release = () => {
    const input = engine?.current?.input;
    ["left", "right", "up", "down"].forEach((action) => input?.setVirtual(action, false));
    activePointer.current = null;
    setAxis({ x: 0, y: 0 });
  };

  const update = (event) => {
    const bounds = stickRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const radius = bounds.width * 0.36;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    // Ignore small thumb movement to avoid direction flicker; begin tracking
    // after a 7px drag and keep a 12% analog dead zone around the origin.
    const drag = Math.max(0, length - 7);
    const adjusted = Math.max(0, drag / Math.max(1, radius - 7));
    const x = adjusted < 0.12 ? 0 : (dx * scale / radius);
    const y = adjusted < 0.12 ? 0 : (dy * scale / radius);

    setAxis({ x, y });
    const input = engine?.current?.input;
    input?.setVirtual("left", x < -0.32);
    input?.setVirtual("right", x > 0.32);
    input?.setVirtual("up", y < -0.4);
    input?.setVirtual("down", y > 0.4);
  };

  return (
    <div
      ref={stickRef}
      role="application"
      aria-label="Analog movement stick"
      onPointerDown={(event) => {
        event.preventDefault();
        if (activePointer.current !== null) return;
        activePointer.current = event.pointerId;
        const bounds = event.currentTarget.getBoundingClientRect();
        origin.current = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
        event.currentTarget.setPointerCapture(event.pointerId);
        onFirstInput?.();
        update(event);
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) update(event);
      }}
      onPointerUp={(event) => {
        if (activePointer.current === event.pointerId) release();
      }}
      onPointerCancel={release}
      className="pointer-events-auto relative h-[clamp(84px,22vw,112px)] w-[clamp(84px,22vw,112px)] touch-none rounded-full border border-white/35 bg-[#0a0d1c]/65 shadow-[0_0_24px_rgba(75,227,255,0.16)] backdrop-blur-sm"
    >
      <span className="pointer-events-none absolute inset-[20%] rounded-full border border-white/15" />
      <span
        className="pointer-events-none absolute h-[42%] w-[42%] rounded-full border border-[#4be3ff]/70 bg-[#4be3ff]/30 shadow-[0_0_14px_rgba(75,227,255,0.25)]"
        style={{ left: `${50 + axis.x * 32}%`, top: `${50 + axis.y * 32}%`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}

function Dpad({ engine, onFirstInput }) {
  return (
    <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1">
      <span />
      <PadButton engine={engine} action="up" label="UP" icon={ArrowUp} className="h-14 w-14 rounded-sm" onFirstInput={onFirstInput} />
      <span />
      <PadButton engine={engine} action="left" label="LEFT" icon={ChevronLeft} className="h-14 w-14 rounded-sm" onFirstInput={onFirstInput} />
      <span className="h-14 w-14 rounded-full border border-white/15 bg-[#0a0d1c]/40" />
      <PadButton engine={engine} action="right" label="RIGHT" icon={ChevronRight} className="h-14 w-14 rounded-sm" onFirstInput={onFirstInput} />
      <span />
      <span />
      <span />
    </div>
  );
}

export default function TouchControls({
  engine,
  enabled = true,
  controlMode = "joystick",
  onControlModeChange,
  onFirstInput,
}) {
  if (!enabled) return null;

  return (
    <div className="pa-touch-only pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute bottom-3 left-3 flex flex-col items-start gap-2"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 12px)",
          left: "calc(env(safe-area-inset-left) + 12px)",
        }}
      >
        <button
          type="button"
          onClick={() => onControlModeChange?.(controlMode === "joystick" ? "dpad" : "joystick")}
          className="pointer-events-auto min-h-12 touch-none border border-white/25 bg-[#0a0d1c]/80 px-3 text-left pa-pixel text-[7px] text-white/85"
          aria-label={`Switch to ${controlMode === "joystick" ? "D-pad" : "analog stick"} controls`}
        >
          {controlMode === "joystick" ? "USE D-PAD" : "USE STICK"}
        </button>
        {controlMode === "joystick" ? (
          <AnalogStick engine={engine} onFirstInput={onFirstInput} />
        ) : (
          <Dpad engine={engine} onFirstInput={onFirstInput} />
        )}
      </div>

      <div
        className="absolute bottom-3 right-3 flex items-end gap-2"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 12px)",
          right: "calc(env(safe-area-inset-right) + 12px)",
        }}
      >
        <div className="flex flex-col gap-2">
          <PadButton engine={engine} action="swap" label="SWAP" icon={Repeat2} className="h-14 w-14 rounded-full" onFirstInput={onFirstInput} />
          <PadButton engine={engine} action="dash" label="DASH · X" icon={X} className="h-14 w-14 rounded-full" onFirstInput={onFirstInput} />
        </div>
        <PadButton engine={engine} action="fire" label="FIRE · Z" icon={Crosshair} className="h-[clamp(56px,16vw,72px)] w-[clamp(56px,16vw,72px)] rounded-full" onFirstInput={onFirstInput} />
        <PadButton engine={engine} action="jump" label="JUMP" icon={ArrowUp} className="h-[clamp(64px,18vw,80px)] w-[clamp(64px,18vw,80px)] rounded-full" onFirstInput={onFirstInput} />
      </div>
    </div>
  );
}
