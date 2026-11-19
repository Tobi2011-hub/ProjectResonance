import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Play, RotateCcw, Skull } from "lucide-react";
import { GameCanvas, PixelBackdrop } from "@/components/game/GameUI";
import { CHARACTERS, WEAPON_ORDER, WEAPONS, isCharacterOwned, isWeaponOwned, loadSave, writeSave } from "@/game/core";
import { getLevel } from "@/game/world";

const ARCADE_LEVELS = Array.from({ length: 10 }, (_, i) => getLevel(i + 1));

export default function ArcadeMode() {
  const navigate = useNavigate();
  const [save, setSave] = useState(() => loadSave());
  const [character, setCharacter] = useState(() => {
    const current = loadSave();
    return isCharacterOwned(current, current?.character ?? 0) ? current?.character ?? 0 : 0;
  });
  const [primary, setPrimary] = useState(() => {
    const current = loadSave();
    return isWeaponOwned(current, current?.primary) ? current.primary : "buster";
  });
  const [secondary, setSecondary] = useState(() => {
    const current = loadSave();
    return isWeaponOwned(current, current?.secondary) ? current.secondary : "blade";
  });
  const [stageIndex, setStageIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState("setup");
  const [arcadeState, setArcadeState] = useState(null);
  const [score, setScore] = useState(0);
  const [gemsSpent, setGemsSpent] = useState(0);
  const ownedWeapons = useMemo(() => WEAPON_ORDER.filter((id) => isWeaponOwned(save, id)), [save]);
  const level = ARCADE_LEVELS[stageIndex];
  const cleanLevel = useMemo(() => ({ ...level, stars: [], coins: [], ammo: [], fruits: [], checkpoints: [], tutorials: [] }), [level]);
  if (!save) return null;

  const arcadeSave = {
    ...save,
    character,
    primary,
    secondary,
    abilities: stageIndex >= 4 ? { leap: 1 } : {},
    abilityLoadout: stageIndex >= 4 ? [{ id: "leap", rank: 1 }] : [],
    checkpoint: null,
  };
  const retryGems = Math.max(0, Math.floor(score / 3000) - gemsSpent);
  const begin = () => {
    if (primary === secondary) return;
    setStageIndex(0);
    setArcadeState(null);
    setScore(0);
    setGemsSpent(0);
    setAttempt((value) => value + 1);
    setPhase("run");
  };
  const finishStage = (payload) => {
    setArcadeState({ health: payload.health, ammo: payload.ammo, lives: payload.lives });
    if (stageIndex === ARCADE_LEVELS.length - 1) {
      setSave(writeSave({ arcadeEmblem: true }));
      setPhase("victory");
      return;
    }
    setStageIndex((value) => value + 1);
  };
  const restart = () => {
    setStageIndex(0);
    setArcadeState(null);
    setScore(0);
    setGemsSpent(0);
    setAttempt((value) => value + 1);
    setPhase("run");
  };

  const continueWithGem = () => {
    if (retryGems < 1) return;
    setGemsSpent((value) => value + 1);
    setAttempt((value) => value + 1);
    setPhase("run");
  };

  if (phase === "run") return <div className="pa-root min-h-screen bg-[#05060d]"><GameCanvas key={`${attempt}-${stageIndex}`} level={cleanLevel} save={arcadeSave} arcade arcadeState={arcadeState} score={score} retryGems={retryGems} onScore={(amount) => setScore((value) => value + amount)} onComplete={finishStage} onOutOfLives={() => setPhase("gameover")} onQuit={() => navigate("/")} /></div>;

  return <div className="pa-root relative min-h-screen overflow-hidden bg-[#05060d] text-white">
    <PixelBackdrop theme={save.settings?.backgrounds?.menu} />
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <button onClick={() => navigate("/")} className="pa-pixel flex items-center gap-2 text-[8px] text-[#c6d2f2]/60"><ArrowLeft size={14}/> MAIN MENU</button>
        <p className="pa-pixel text-[12px] tracking-widest text-[#ff3d8b]">ARCADE MODE</p>
      </header>
      {phase === "setup" ? <section className="pa-panel pa-fade-up mx-auto mt-8 w-full max-w-3xl p-5 sm:p-8">
        <p className="pa-pixel text-[8px] text-[#ffd166]">ONE RUN · TEN LEVELS · THREE LIVES</p>
        <h1 className="pa-pixel mt-3 text-xl sm:text-2xl">THE ARCADE GAUNTLET</h1>
        <p className="mt-3 text-sm text-[#c6d2f2]/60">Choose one frame and two different weapons. The stages chain automatically. No collectibles, checkpoints, or breaks. Double jump unlocks after level 4.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <label className="pa-pixel flex flex-col gap-2 text-[7px] text-[#4be3ff]">CHARACTER / FRAME<select value={character} onChange={(event) => setCharacter(Number(event.target.value))} className="bg-[#0c1024] border border-[#4be3ff]/30 px-3 py-3 text-[9px] text-white">{CHARACTERS.map((frame, index) => isCharacterOwned(save, index) ? <option key={frame.id} value={index}>{frame.name}</option> : null)}</select></label>
          {[primary, secondary].map((weapon, slot) => <label key={slot} className="pa-pixel flex flex-col gap-2 text-[7px] text-[#4be3ff]">{slot ? "SECONDARY" : "PRIMARY"} WEAPON<select value={weapon} onChange={(event) => (slot ? setSecondary(event.target.value) : setPrimary(event.target.value))} className="bg-[#0c1024] border border-[#4be3ff]/30 px-3 py-3 text-[9px] text-white">{ownedWeapons.map((id) => <option key={id} value={id} disabled={id === (slot ? primary : secondary)}>{WEAPONS[id].name}{id === (slot ? primary : secondary) ? " · ALREADY PICKED" : ""}</option>)}</select></label>)}
        </div>
        <div className="mt-6 grid grid-cols-5 gap-1 sm:grid-cols-10">{ARCADE_LEVELS.map((item, index) => <span key={item.id} className="pa-pixel border border-[#2a2f52] bg-black/25 px-1 py-2 text-center text-[6px] text-[#c6d2f2]/50">{String(index + 1).padStart(2, "0")}</span>)}</div>
        <button onClick={begin} disabled={!ownedWeapons.length || primary === secondary} className="pa-pixel mt-7 flex min-h-12 w-full items-center justify-center gap-2 bg-[#ff3d8b] px-5 py-3 text-[9px] text-[#05060d] disabled:opacity-40"><Play size={15}/> START ARCADE RUN</button>
        {save.arcadeEmblem && <p className="pa-pixel mt-4 flex items-center justify-center gap-2 text-[8px] text-[#ffd166]"><Award size={16}/> ARCADE EMBLEM EARNED</p>}
      </section> : null}
      {phase === "gameover" ? <section className="pa-panel pa-fade-up mx-auto mt-12 w-full max-w-xl p-8 text-center"><Skull className="mx-auto h-9 w-9 text-[#ff3d8b]"/><p className="pa-pixel pa-gameover-glitch mt-5 text-3xl" data-text="GAME OVER">GAME OVER</p><p className="pa-pixel mt-3 text-[8px] text-[#ffd166]">SCORE {score} · RETRY GEMS {retryGems}</p><p className="mt-3 text-sm text-[#c6d2f2]/60">Run ended on level {stageIndex + 1}. A retry gem continues from this level.</p>{retryGems > 0 ? <button onClick={continueWithGem} className="pa-pixel mt-6 inline-flex min-h-11 items-center gap-2 border border-[#ffd166]/60 bg-[#ffd166]/10 px-5 py-3 text-[8px] text-[#ffd166]"><Award size={14}/> SPEND GEM · CONTINUE LEVEL {stageIndex + 1}</button> : <p className="pa-pixel mt-6 text-[7px] text-white/35">EARN 3000 POINTS PER RETRY GEM</p>}<button onClick={restart} className="pa-pixel mt-4 inline-flex min-h-11 items-center gap-2 bg-[#ff3d8b] px-5 py-3 text-[8px] text-[#05060d]"><RotateCcw size={14}/> RESTART FROM LEVEL 1</button><button onClick={() => setPhase("setup")} className="pa-pixel mt-3 block w-full px-5 py-3 text-[8px] text-[#c6d2f2]/60">CHANGE LOADOUT</button></section> : null}
      {phase === "victory" ? <section className="pa-panel pa-fade-up mx-auto mt-12 w-full max-w-xl p-8 text-center"><Award className="mx-auto h-12 w-12 text-[#ffd166]"/><p className="pa-pixel mt-5 text-[9px] text-[#ffd166]">ARCADE GAUNTLET COMPLETE</p><h1 className="pa-pixel mt-3 text-2xl">EMBLEM AWARDED</h1><p className="pa-pixel mt-3 text-[8px] text-[#ffd166]">FINAL SCORE {score} · RETRY GEMS {retryGems}</p><p className="mt-3 text-sm text-[#c6d2f2]/60">Your arcade emblem is now displayed on the main menu.</p><button onClick={() => navigate("/")} className="pa-pixel mt-7 bg-[#ffd166] px-5 py-3 text-[8px] text-[#05060d]">RETURN TO MAIN MENU</button></section> : null}
    </main>
  </div>;
}
