import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Lock, Play, Shield, Sparkles } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import PixelFontText from "@/components/game/PixelFontText";
import { CHALLENGES } from "@/game/challenges";
import { CHARACTERS, WEAPON_ORDER, WEAPONS, isLevelSelectUnlocked, isWeaponOwned, loadSave, sfx } from "@/game/core";

export default function ChallengeMode() {
  const navigate = useNavigate();
  const save = useMemo(() => loadSave(), []);
  const [character, setCharacter] = useState(0);
  const [weaponA, setWeaponA] = useState("buster");
  const [weaponB, setWeaponB] = useState("blade");
  const [selected, setSelected] = useState(1);
  if (!save) return null;
  const unlocked = isLevelSelectUnlocked(save);
  const emblems = save.challengeEmblems || [];
  const challenge = CHALLENGES[selected - 1];
  const ownedWeapons = WEAPON_ORDER.filter((id) => isWeaponOwned(save, id));
  const launch = (item) => {
    if (!unlocked || (item.id > 1 && !emblems.includes(item.id - 1))) return;
    sfx("select");
    navigate(`/stage/${item.id}?challenge=${item.id}&char=${character}&w1=${weaponA}&w2=${weaponB}`);
  };
  return <div className="pa-root relative min-h-screen overflow-hidden bg-[#05060d] text-white">
    <PixelBackdrop variant="purple" />
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <button onClick={() => navigate("/")} className="pa-pixel flex items-center gap-2 text-[8px] text-[#c6d2f2]/60"><ArrowLeft size={14}/> MAIN MENU</button>
        <div className="text-right"><PixelFontText text="CHALLENGE MODE" className="text-[13px] sm:text-[17px] text-white"/><p className="pa-pixel mt-2 text-[7px] text-[#c6d2f2]/45">CLEAR ALL 10 MAIN STAGES TO UNLOCK · 6 CUSTOM ROUTES</p></div>
      </header>
      {!unlocked ? <div className="pa-panel mt-10 p-8 text-center"><Lock className="mx-auto text-[#ffd166]"/><p className="pa-pixel mt-4 text-[9px]">CHALLENGE MODE LOCKED</p><p className="mt-2 text-sm text-[#c6d2f2]/60">Beat every main stage to open the challenge ladder.</p><button onClick={() => navigate("/world")} className="pa-pixel mt-5 border border-[#4be3ff]/50 px-5 py-3 text-[8px] text-[#4be3ff]">RETURN TO WORLD MAP</button></div> : <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-[#2a2f52] bg-[#070a18]/80 p-4">
        <div className="flex items-center gap-3"><span className="pa-pixel text-[7px] text-[#4be3ff]">FRAME</span><button onClick={() => setCharacter((character + 1) % CHARACTERS.length)} className="pa-pixel border border-[#4be3ff]/40 px-3 py-2 text-[8px]">{CHARACTERS[character].name} ↻</button><span className="pa-pixel text-[7px] text-[#c6d2f2]/45">TRIALS APPLY PLAYER DEBUFFS</span></div>
        <div className="flex flex-wrap items-center gap-2">{[weaponA, weaponB].map((weapon, i) => <select key={i} value={ownedWeapons.includes(weapon) ? weapon : (i ? "blade" : "buster")} onChange={(e) => (i ? setWeaponB(e.target.value) : setWeaponA(e.target.value))} className="pa-pixel bg-[#0c1024] border border-[#4be3ff]/30 px-2 py-2 text-[8px] text-white">{ownedWeapons.map((id) => <option key={id} value={id}>{WEAPONS[id].name}</option>)}</select>)}</div>
      </div>
      <section className="mt-6 grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{CHALLENGES.map((item) => {
        const done = emblems.includes(item.id), available = item.id === 1 || emblems.includes(item.id - 1);
        return <button key={item.id} onClick={() => { setSelected(item.id); launch(item); }} className={`pa-panel group relative min-h-36 p-4 text-left transition duration-200 hover:-translate-y-1 ${selected === item.id ? "ring-1" : ""}`} style={{ borderColor: `${item.accent}66`, boxShadow: selected === item.id ? `0 0 28px ${item.accent}22` : undefined }}>
          <div className="flex items-center justify-between"><span className="pa-pixel text-[7px] tracking-widest" style={{color:item.accent}}>TRIAL {String(item.id).padStart(2,"0")}</span>{done ? <Check size={16} className="text-[#7af6c8]"/> : available ? <Play size={14} style={{color:item.accent}}/> : <Lock size={14} className="text-white/30"/>}</div>
          <p className="pa-pixel mt-4 text-[10px]">{item.title}</p><p className="mt-2 text-xs leading-relaxed text-[#c6d2f2]/55">{item.subtitle}</p>
          <p className="pa-pixel mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[6px] text-[#c6d2f2]/45">
            <span>HP {Math.round(item.health * 100)}%</span><span>DAMAGE {Math.round(item.damage * 100)}%</span><span>MOVE {Math.round(item.speed * 100)}%</span>
            <span>INCOMING ×{item.incoming}</span><span>ENEMIES ×{item.enemy}</span><span>{item.lives} LIVES</span>
            {item.ammo ? <span>AMMO {Math.round(item.ammo * 100)}%</span> : null}
            {item.disableDash ? <span>NO DASH</span> : null}
            {item.disableReload ? <span>NO RELOAD</span> : null}
            {item.disableSwap ? <span>NO SWAP</span> : null}
            {item.noAbilities ? <span>NO ABILITIES</span> : null}
          </p>
          <p className="pa-pixel mt-4 flex items-center gap-2 text-[7px] text-[#ffd166]/75"><Sparkles size={12}/> {done ? `EMBLEM · CODE ${item.code}` : `REWARD · EMBLEM + ${item.code}`}</p>
          {!available && <span className="absolute inset-0 bg-[#05060d]/45"/>}
        </button>;
      })}</section>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="pa-pixel flex items-center gap-2 text-[7px] text-[#c6d2f2]/40"><Shield size={13}/> ALL FRAMES · OWNED WEAPONS · REAL DEBUFFS · CHECKPOINTS · LIMITED LIVES</p><p className="pa-pixel text-[7px] text-[#ffd166]">EMBLEMS {emblems.length} / {CHALLENGES.length}</p></footer>
      </>}
    </main>
  </div>;
}
