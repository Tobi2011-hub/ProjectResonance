import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Award, CircleDot, Keyboard } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import {
  ConfirmPanel,
  ExitOverlay,
  MenuList,
  SaveSlotsPanel,
  SettingsPanel,
  TitleLogo,
} from "@/components/title/TitlePanels";
import {
  CHARACTERS,
  DEFAULT_CONTROLS,
  MAX_STARS,
  SAVE_SLOT_COUNT,
  clearSave,
  getActiveSaveSlot,
  listSaveSlots,
  isLevelSelectUnlocked,
  keyLabel,
  loadSave,
  setActiveSaveSlot as activateSaveSlot,
  setSfxVolume,
  sfx,
  totalStars,
  writeSave,
} from "@/game/core";

const buildKeyHints = (controls) => {
  const keys = { ...DEFAULT_CONTROLS, ...(controls || {}) };
  return [
    ["MOVE", `${keyLabel(keys.left)} ${keyLabel(keys.right)}`],
    ["JUMP", keyLabel(keys.jump)],
    ["FIRE", keyLabel(keys.fire)],
    ["DASH", keyLabel(keys.dash)],
  ];
};

export default function Title() {
  const navigate = useNavigate();
  const [save, setSave] = useState(() => loadSave());
  const [activeSlot, setActiveSlot] = useState(() => getActiveSaveSlot());
  const [slots, setSlots] = useState(() => listSaveSlots());
  const [index, setIndex] = useState(0);
  const [panel, setPanel] = useState(null);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [notice, setNotice] = useState("");
  const [exited, setExited] = useState(false);
  const keyHints = buildKeyHints(save?.settings?.controls);
  const levelSelectUnlocked = isLevelSelectUnlocked(save);

  useEffect(() => {
    setSfxVolume((save?.settings?.sfx ?? 0.7) * (save?.settings?.master ?? 1));
    document.documentElement.classList.toggle("pa-high-contrast", Boolean(save?.settings?.highContrast));
  }, [save]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const items = useMemo(
    () => [
      { id: "new", label: "New Game" },
      { id: "continue", label: "Continue", meta: save ? `STAGE ${save.highestStage}` : "" },
      { id: "customize", label: "Customization", meta: save ? "" : "NO SAVE", disabled: !save },
      {
        id: "level-select",
        label: "Challenge Mode",
        meta: levelSelectUnlocked ? "6 TRIALS" : "LOCKED",
      },
      { id: "load", label: "Load Game", meta: `${slots.filter((slot) => slot.save).length}/${SAVE_SLOT_COUNT} SLOTS` },
      { id: "arcade", label: "Arcade Mode", meta: save?.arcadeEmblem ? "ARCADE EMBLEM" : "ONE LIFE" },
      { id: "settings", label: "Settings" },
      { id: "exit", label: "Exit" },
    ],
    [save, slots, levelSelectUnlocked]
  );

  const openSlots = (mode) => {
    setSlots(listSaveSlots());
    setPanel(mode);
  };

  const select = (id) => {
    sfx("select");
    if (id === "new") {
      openSlots("new");
      return;
    }
    if (id === "continue") {
      if (save) navigate("/world");
      else setNotice("NO SAVE DATA — START A NEW GAME");
      return;
    }
    if (id === "customize") {
      if (save) navigate("/customize");
      else setNotice("START A SAVE BEFORE CUSTOMIZING");
      return;
    }
    if (id === "level-select") {
      if (!levelSelectUnlocked) {
        setNotice("LOCKED — BEAT ALL 10 MAIN STAGES");
        return;
      }
      navigate("/level-select-map");
      return;
    }
    if (id === "arcade") {
      if (!save) setNotice("START A SAVE BEFORE ENTERING ARCADE MODE");
      else navigate("/arcade");
      return;
    }
    if (id === "load") {
      openSlots("load");
      return;
    }
    if (id === "settings") {
      setPanel("settings");
      return;
    }
    if (id === "exit") {
      setExited(true);
      try {
        window.close();
      } catch {
        /* browsers block closing a tab that was not opened by script */
      }
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if (panel) {
        if (event.key === "Escape") {
          sfx("back");
          setPanel(null);
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "w", "W", "s", "S", "Enter", " "].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        sfx("move");
        setIndex((i) => (i - 1 + items.length) % items.length);
      } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        sfx("move");
        setIndex((i) => (i + 1) % items.length);
      } else if (event.key === "Enter" || event.key === " ") {
        const item = items[index];
        if (item) select(item.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const updateSettings = (patch) => {
    const next = writeSave({ settings: { ...(save?.settings || {}), ...patch } });
    setSave(next);
    document.documentElement.classList.toggle("pa-high-contrast", Boolean(next.settings?.highContrast));
    setSlots(listSaveSlots());
  };

  const chooseSlot = (slot, slotSave) => {
    if (panel === "new" && slotSave) {
      setPendingSlot(slot);
      setPanel("confirm");
      return;
    }
    activateSaveSlot(slot);
    setActiveSlot(slot);
    setSave(slotSave);
    navigate(slotSave ? "/world" : "/customize?new=1");
  };

  const startFreshInPendingSlot = () => {
    if (pendingSlot == null) return;
    activateSaveSlot(pendingSlot);
    setActiveSlot(pendingSlot);
    setPendingSlot(null);
    navigate("/customize?new=1");
  };

  const eraseSave = (slot) => {
    clearSave(slot);
    setSlots(listSaveSlots());
    if (slot === activeSlot) setSave(null);
  };

  if (exited) return <ExitOverlay onReturn={() => setExited(false)} />;

  return (
    <div className="pa-root relative min-h-screen overflow-hidden">
      <PixelBackdrop theme={save?.settings?.backgrounds?.menu} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center border border-[#4be3ff]/50 bg-[#4be3ff]/10">
              <span className="pa-pixel text-[10px] text-[#4be3ff]">PX</span>
            </span>
            <span className="pa-pixel text-[8px] text-[#c6d2f2]/50">RESONANCE SHELL v1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <CircleDot className={`h-3 w-3 ${save ? "text-[#4be3ff]" : "text-[#c6d2f2]/25"}`} />
            <span className="pa-pixel text-[8px] text-[#c6d2f2]/50">{save ? "SAVE ONLINE" : "NO SAVE"}</span>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section>
            <TitleLogo />
            {save?.arcadeEmblem ? <div className="pa-fade-up mt-5 inline-flex items-center gap-2 border border-[#ffd166]/40 bg-[#ffd166]/10 px-3 py-2"><Award className="h-4 w-4 text-[#ffd166]"/><span className="pa-pixel text-[7px] tracking-widest text-[#ffd166]">ARCADE GAUNTLET EMBLEM</span></div> : null}
            <MenuList items={items} index={index} onFocus={(i) => { setIndex(i); sfx("move"); }} onSelect={select} />
            <div className="mt-4 h-4">
              {notice ? <p className="pa-pixel text-[8px] text-[#ffd166]">{notice}</p> : null}
            </div>
            <p className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#c6d2f2]/35">
              <ArrowUpDown className="h-3 w-3" /> Arrows to move · Enter or Space to select
            </p>
          </section>

          <section className="hidden justify-center lg:flex">
            <div className="pa-panel w-full max-w-[360px] p-6">
              <div className="flex items-center justify-between">
                <span className="pa-pixel text-[8px] text-[#4be3ff]/70">LAST SAVE</span>
                <span className="pa-pixel text-[8px] text-[#c6d2f2]/40">SLOT {String(activeSlot).padStart(2, "0")}</span>
              </div>
              <div className="relative mt-5 flex flex-col items-center border border-[#2a2f52] bg-[#070a18] py-6">
                <div className="absolute inset-0 opacity-30 pa-bg-tile" />
                <div
                  className={`pa-cameo relative ${
                    save?.character === 1
                      ? "pa-cameo--nf"
                      : save?.character === 2
                      ? "pa-cameo--pm"
                      : save?.character === 3
                      ? "pa-cameo--en"
                      : save?.character === 4
                      ? "pa-cameo--vx"
                      : ""
                  }`}
                />
                <div className="relative mt-2 h-2 w-24 bg-[#1b2140] shadow-[0_0_18px_rgba(75,227,255,0.35)]" />
              </div>
              <dl className="mt-5 space-y-2 text-[11px] uppercase tracking-[0.16em]">
                <div className="flex justify-between">
                  <dt className="text-[#c6d2f2]/40">Pilot</dt>
                  <dd className="text-white">{save ? CHARACTERS[save.character]?.name : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#c6d2f2]/40">Stage reached</dt>
                  <dd className="text-white">{save ? `${save.highestStage} / 10` : "—"}</dd>

                </div>
                <div className="flex justify-between">
                  <dt className="text-[#c6d2f2]/40">Resonance shards</dt>
                  <dd className="text-[#4be3ff]">{save ? `${totalStars(save)} / ${MAX_STARS}` : "—"}</dd>
                </div>
              </dl>
              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#2a2f52] pt-4">
                {keyHints.map(([label, key]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="pa-pixel border border-[#2a2f52] px-1.5 py-1 text-[7px] text-[#4be3ff]">{key}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#c6d2f2]/45">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#c6d2f2]/30">
            <Keyboard className="h-3 w-3" /> Keyboard navigation enabled
          </p>
          <p className="pa-pixel text-[7px] text-[#c6d2f2]/25">© PROJECT: RESONANCE</p>
        </footer>
      </div>

      {panel ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#04050b]/80 px-5 backdrop-blur-sm">
          {(panel === "load" || panel === "new") && (
            <SaveSlotsPanel
              slots={slots}
              activeSlot={activeSlot}
              mode={panel}
              onSelect={chooseSlot}
              onErase={eraseSave}
              onBack={() => setPanel(null)}
            />
          )}
          {panel === "settings" && (
            <SettingsPanel
              settings={save?.settings || {
                master: 1,
                music: 0.45,
                sfx: 0.7,
                shake: true,
                touchControls: true,
                touchControlMode: "joystick",
                mobileOrientation: "landscape",
                highContrast: false,
              }}
              onChange={updateSettings}
              onBack={() => setPanel(null)}
            />
          )}
          {panel === "confirm" && (
            <ConfirmPanel
              title={`Overwrite Slot ${String(pendingSlot || 1).padStart(2, "0")}?`}
              message="This replaces all progress in the selected slot. Other save slots will remain unchanged."
              confirmLabel="OVERWRITE SLOT"
              onConfirm={startFreshInPendingSlot}
              onBack={() => {
                setPendingSlot(null);
                openSlots("new");
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
