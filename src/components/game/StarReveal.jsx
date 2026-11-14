/**
 * STAR REVEAL — the stage-clear star sequence: the five run stars pop in one at
 * a time, then the sixth (deathless) star lands with its own burst.
 */
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { sfx } from "@/game/core";

export default function StarReveal({ stars, noDeath }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= 6) return undefined;
    const timer = setTimeout(() => {
      const taken = shown < 5 ? Boolean(stars[shown]) : Boolean(noDeath);
      if (taken) sfx("star");
      setShown((value) => value + 1);
    }, shown === 0 ? 420 : 330);
    return () => clearTimeout(timer);
  }, [shown, stars, noDeath]);

  return (
    <div className="mt-7">
      <div className="flex items-end justify-center gap-3">
        {[0, 1, 2, 3, 4].map((i) => {
          const visible = shown > i;
          const taken = Boolean(stars[i]);
          return (
            <div
              key={i}
              className={`relative grid h-11 w-11 place-items-center border-2 transition-all duration-300 sm:h-12 sm:w-12 ${
                visible && taken
                  ? "pa-star-pop border-[#ffd166] bg-[#ffd166]/15 shadow-[0_0_22px_rgba(255,209,102,0.55)]"
                  : visible
                  ? "border-white/10 bg-black/40"
                  : "border-white/5 bg-black/20 opacity-30"
              }`}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  visible && taken ? "fill-[#ffd166] text-[#ffd166]" : "text-white/20"
                }`}
              />
            </div>
          );
        })}

        <span className="mx-1 h-10 w-px bg-white/15" />

        <div
          className={`relative grid h-14 w-14 place-items-center border-2 transition-all duration-500 sm:h-16 sm:w-16 ${
            shown >= 6 && noDeath
              ? "pa-sixth-star border-[#ff3d8b] bg-[#ff3d8b]/20"
              : shown >= 6
              ? "border-white/10 bg-black/40"
              : "border-white/5 bg-black/20 opacity-30"
          }`}
        >
          <Star
            className={`h-8 w-8 sm:h-9 sm:w-9 ${
              shown >= 6 && noDeath ? "fill-[#ff3d8b] text-[#ff3d8b]" : "text-white/20"
            }`}
          />
          {shown >= 6 && noDeath ? <span className="pa-sixth-rays" aria-hidden="true" /> : null}
        </div>
      </div>

      <p className={`pa-pixel mt-4 text-[9px] ${noDeath && shown >= 6 ? "text-[#ff3d8b]" : "text-[#ffd166]/80"}`}>
        {shown >= 6
          ? noDeath
            ? "SIX STARS — FLAWLESS CLEAR"
            : `${stars.slice(0, 5).filter(Boolean).length} / 5 STARS THIS RUN`
          : "RECORDING RUN…"}
      </p>
      {shown >= 6 && !noDeath ? (
        <p className="pa-pixel mt-2 text-[7px] text-[#c6d2f2]/40">SIXTH STAR NEEDS A DEATHLESS RUN</p>
      ) : null}
    </div>
  );
}