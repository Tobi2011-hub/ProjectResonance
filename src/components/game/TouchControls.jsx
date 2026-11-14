/**
 * TOUCH CONTROLS — phone/tablet pad. Feeds the same virtual actions as the
 * keyboard, so the game plays identically on a touch screen.
 */
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Crosshair, RefreshCw, Swords, X } from "lucide-react";

function PadButton({ engine, action, label, icon: Icon, className = "", labelClass = "" }) {
  const press = (down) => engine?.current?.input?.setVirtual(action, down);

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        press(true);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        press(false);
      }}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
      onContextMenu={(event) => event.preventDefault()}
      className={`pointer-events-auto relative flex touch-none select-none flex-col items-center justify-center gap-0.5 border border-white/25 bg-[#0a0d1c]/65 text-white backdrop-blur-sm active:border-[#4be3ff] active:bg-[#4be3ff]/25 ${className}`}
    >
      <span className="pointer-events-none absolute left-0 top-0 h-1 w-1 border-l border-t border-white/40" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-1 w-1 border-b border-r border-white/40" />
      <Icon className="h-5 w-5" />
      <span className={`pa-pixel text-[5px] text-white/50 ${labelClass}`}>{label}</span>
    </button>
  );
}

export default function TouchControls({ engine, enabled = true }) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
      <div className="absolute bottom-2 left-2 flex gap-1.5">
        <PadButton engine={engine} action="left" label="LEFT" icon={ChevronLeft} className="h-14 w-12" />
        <div className="flex flex-col gap-1">
          <PadButton engine={engine} action="up" label="UP" icon={ChevronUp} className="h-[26px] w-10" />
          <PadButton engine={engine} action="down" label="DOWN" icon={ChevronDown} className="h-[26px] w-10" />
        </div>
        <PadButton engine={engine} action="right" label="RIGHT" icon={ChevronRight} className="h-14 w-12" />
      </div>

      <div className="absolute bottom-2 right-2 flex items-end gap-1.5">
        <div className="flex flex-col gap-1.5">
          <PadButton engine={engine} action="swap" label="SWAP" icon={RefreshCw} className="h-10 w-10" />
          <PadButton engine={engine} action="dash" label="DASH" icon={X} className="h-11 w-11" />
        </div>
        <PadButton engine={engine} action="fire" label="FIRE" icon={Crosshair} className="h-12 w-12" />
        <PadButton engine={engine} action="jump" label="JUMP" icon={Swords} className="h-16 w-16" />
      </div>
    </div>
  );
}