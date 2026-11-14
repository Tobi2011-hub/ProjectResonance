import { Check, Gem } from "lucide-react";

/** One shop listing: art swatch, name, price and the buy button. */
export default function ShopCard({ item, orbs, onBuy }) {
  const affordable = orbs >= item.price;
  return (
    <div
      className={`relative border p-4 transition-colors ${
        item.owned ? "border-[#7af6c8]/40 bg-[#7af6c8]/[0.06]" : "border-[#2a2f52] bg-[#0a0c1c]/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-12 w-12 shrink-0 border-2 border-[#05060d]"
          style={{ background: `linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})` }}
        />
        <div className="min-w-0 flex-1">
          <p className="pa-pixel text-[8px] text-white">{item.name.toUpperCase()}</p>
          <p className="pa-pixel mt-1 text-[6px] text-[#4be3ff]/70">
            {item.kind === "character" ? "PLAYABLE FRAME" : "ARMOR PALETTE"}
          </p>
          <p className="mt-2 text-[11px] leading-snug tracking-wide text-[#c6d2f2]/50">{item.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#2a2f52] pt-3">
        {item.owned ? (
          <span className="pa-pixel flex items-center gap-1 text-[7px] text-[#7af6c8]">
            <Check className="h-3 w-3" /> OWNED
          </span>
        ) : (
          <span className="pa-pixel flex items-center gap-1 text-[7px] text-[#ffd166]">
            <Gem className="h-3 w-3" /> {item.price}
          </span>
        )}
        <button
          type="button"
          disabled={item.owned || !affordable}
          onClick={() => onBuy(item)}
          className={`pa-pixel px-3 py-2 text-[7px] transition-colors ${
            item.owned
              ? "cursor-default border border-[#7af6c8]/30 text-[#7af6c8]/60"
              : affordable
              ? "bg-[#ffd166] text-[#05060d] hover:bg-[#ffe08a]"
              : "cursor-not-allowed border border-[#2a2f52] text-[#c6d2f2]/25"
          }`}
        >
          {item.owned ? "OWNED" : affordable ? "BUY" : "NEED ORBS"}
        </button>
      </div>
    </div>
  );
}