/**
 * SHARD REVEAL — collected resonance shards pop in one at a time, followed by
 * the flawless-clear bonus.
 */
import { useEffect, useState } from "react";
import { Gem } from "lucide-react";
import { sfx } from "@/game/core";

export default function ShardReveal({ shards, noDeath, accent, totalShards = 5, shardLabel = "SHARDS" }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= totalShards + 1) return undefined;
    const timer = setTimeout(() => {
      const taken = shown < totalShards ? Boolean(shards[shown]) : Boolean(noDeath);
      if (taken) sfx("star");
      setShown((value) => value + 1);
    }, shown === 0 ? 420 : 330);
    return () => clearTimeout(timer);
  }, [shown, shards, noDeath, totalShards]);

  return (
    <div className="mt-7">
      <div className="flex items-end justify-center gap-3">
        {Array.from({ length: totalShards }, (_, i) => {
          const visible = shown > i;
          const taken = Boolean(shards[i]);
          return (
            <div
              key={i}
              className={`relative grid h-11 w-11 place-items-center border-2 transition-all duration-300 sm:h-12 sm:w-12 ${
                visible && taken
                  ? "pa-shard-pop"
                  : visible
                  ? "border-white/10 bg-black/40"
                  : "border-white/5 bg-black/20 opacity-30"
              }`}
              style={visible && taken ? { borderColor: accent, backgroundColor: `${accent}24`, boxShadow: `0 0 22px ${accent}55` } : undefined}
            >
              <Gem
                className={`h-6 w-6 transition-colors ${visible && taken ? "fill-current" : "text-white/20"}`}
                style={visible && taken ? { color: accent } : undefined}
              />
            </div>
          );
        })}

        <span className="mx-1 h-10 w-px bg-white/15" />

        <div
          className={`relative grid h-14 w-14 place-items-center border-2 transition-all duration-500 sm:h-16 sm:w-16 ${
            shown >= totalShards + 1 && noDeath
              ? "pa-flawless-shard"
              : shown >= totalShards + 1
              ? "border-white/10 bg-black/40"
              : "border-white/5 bg-black/20 opacity-30"
          }`}
          style={
            shown >= totalShards + 1 && noDeath
              ? { borderColor: accent, backgroundColor: `${accent}24`, boxShadow: `0 0 30px ${accent}88` }
              : undefined
          }
        >
          <Gem
            className={`h-8 w-8 sm:h-9 sm:w-9 ${shown >= totalShards + 1 && noDeath ? "fill-current" : "text-white/20"}`}
            style={shown >= totalShards + 1 && noDeath ? { color: accent } : undefined}
          />
          {shown >= totalShards + 1 && noDeath ? (
            <span
              className="pa-flawless-rays"
              style={{ background: `conic-gradient(from 0deg, ${accent}88 0 6deg, transparent 6deg 45deg)` }}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>

      <p className="pa-pixel mt-4 text-[9px]" style={{ color: accent }}>
        {shown >= totalShards + 1
          ? noDeath
            ? "PERFECT RUN — FLAWLESS"
            : `${shards.filter(Boolean).length} / ${totalShards} ${shardLabel} THIS RUN`
          : "RECORDING RUN..."}
      </p>
      {shown >= totalShards + 1 && !noDeath ? (
        <p className="pa-pixel mt-2 text-[7px] text-[#c6d2f2]/40">FLAWLESS BONUS REQUIRES ZERO DEATHS</p>
      ) : null}
    </div>
  );
}