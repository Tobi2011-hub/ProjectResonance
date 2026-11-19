import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Play } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import PixelFontText from "@/components/game/PixelFontText";
import { getLevel } from "@/game/world";
import { NEW_WORLD_FINAL_STAGE, NEW_WORLD_STAGES, hasFinalSecretUnlock, hasPostgameUnlock, loadSave } from "@/game/core";

export default function NewWorldMap() {
  const navigate = useNavigate();
  const save = loadSave();

  if (!save) return <Navigate to="/customize?new=1" replace />;
  if (!hasPostgameUnlock(save)) return <Navigate to="/world" replace />;

  const stages = hasFinalSecretUnlock(save)
    ? [...NEW_WORLD_STAGES, NEW_WORLD_FINAL_STAGE]
    : NEW_WORLD_STAGES;

  return (
    <div className="pa-root relative min-h-screen overflow-hidden">
      <PixelBackdrop theme={save.settings?.backgrounds?.map} />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <button type="button" onClick={() => navigate("/world")} className="pa-pixel flex min-h-11 items-center gap-2 px-2 text-[8px] text-[#c6d2f2]/55 hover:text-white">
            <ArrowLeft className="h-3 w-3" /> WORLD MAP
          </button>
          <PixelFontText text="WORLD MAP" className="text-[14px] text-white sm:text-[18px]" spacing={0.04} />
          <span className="w-[86px]" aria-hidden="true" />
        </header>

        <section className="mt-8 grid flex-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((id, index) => {
            const level = getLevel(id);
            const cleared = Boolean(save.cleared?.includes(id));
            return <button
              key={id}
              type="button"
              onClick={() => navigate(`/stage/${id}?newWorld=1`)}
              className="pa-panel group relative min-h-40 overflow-hidden p-5 text-left transition duration-200 hover:-translate-y-1"
              style={{ borderColor: `${level.accent}66`, boxShadow: `inset 0 0 38px ${level.accent}0d` }}
            >
              <span className="absolute right-0 top-0 h-14 w-14 border-b border-l opacity-40" style={{ borderColor: level.accent }} />
              <span className="pa-pixel text-[8px] tracking-[0.25em]" style={{ color: level.accent }}>STAGE {String(index + 1).padStart(2, "0")}</span>
              <h2 className="pa-pixel mt-5 text-[12px] leading-relaxed text-white">{level.name}</h2>
              <span className="pa-pixel mt-4 inline-flex items-center gap-2 text-[7px] text-[#c6d2f2]/45">
                {cleared ? <><Check className="h-3 w-3 text-[#7af6c8]" /> RANK {save.storyRanks?.[id] || "—"}</> : <><Play className="h-3 w-3" style={{ color: level.accent }} /> DEPLOY</>}
              </span>
            </button>;
          })}
        </section>
      </main>
    </div>
  );
}
