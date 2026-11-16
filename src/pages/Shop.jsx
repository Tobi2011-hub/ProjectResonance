/**
 * SHOP — reachable from the world map. Spends orbs on the fourth frame and the
 * five armour palettes. Everything bought here is usable on the Loadout screen.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gem, ShoppingBag } from "lucide-react";
import { PixelBackdrop } from "@/components/game/GameUI";
import PixelFontText from "@/components/game/PixelFontText";
import ShopCard from "@/components/shop/ShopCard";
import { loadSave, sfx } from "@/game/core";
import { buildShop, buyItem } from "@/game/shop";

export default function Shop() {
  const navigate = useNavigate();
  const [save, setSave] = useState(() => loadSave());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!save) navigate("/customize?new=1");
  }, [save, navigate]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2400);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!save) return null;
  const items = buildShop(save);
  const orbs = save.orbs || 0;

  const handleBuy = (item) => {
    const result = buyItem(item);
    if (result.ok) {
      sfx("select");
      setSave(result.save);
    } else {
      sfx("hurt");
    }
    setNotice(result.message);
  };

  return (
    <div className="pa-root relative min-h-screen overflow-hidden">
      <PixelBackdrop variant="purple" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <button
            type="button"
            onClick={() => navigate("/world")}
            className="pa-pixel flex items-center gap-2 text-[8px] text-[#c6d2f2]/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            <PixelFontText text="WORLD MAP" className="text-[8px] text-[#c6d2f2]/50" spacing={0.04} />
          </button>
          <div className="flex items-center gap-2 border border-[#ffd166]/40 bg-[#ffd166]/10 px-3 py-1.5">
            <Gem className="h-3.5 w-3.5 text-[#ffd166]" />
            <PixelFontText text={String(orbs)} className="text-[10px] text-[#ffd166]" spacing={0.04} />
            <PixelFontText text="ORBS" className="text-[6px] text-[#ffd166]/60" spacing={0.04} />
          </div>
        </header>

        <main className="flex-1 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-[#4be3ff]" />
            <PixelFontText text="ORB EXCHANGE" className="text-[14px] text-white sm:text-[16px]" spacing={0.04} />
          </div>
          <p className="mt-2 text-sm tracking-wide text-[#c6d2f2]/55">
            Orbs drop from every stage you clear. Character unlocks are shared across save slots and last until you
            delete the save that bought them. Armour palettes remain tied to each save.
          </p>
          {notice ? <PixelFontText text={notice} className="mt-3 text-[8px] text-[#ffd166]" spacing={0.04} /> : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ShopCard key={item.id} item={item} orbs={orbs} onBuy={handleBuy} />
            ))}
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <PixelFontText text="40 ORBS PER STAGE · 80 PER RIFT · 5 PER STAR" className="text-[7px] text-[#c6d2f2]/25" spacing={0.04} />
          <button
            type="button"
            onClick={() => navigate("/customize")}
            className="pa-pixel border border-[#4be3ff]/50 px-4 py-2 text-[7px] text-[#4be3ff] hover:border-[#4be3ff]"
          >
            <PixelFontText text="LOADOUT" className="text-[7px] text-[#4be3ff]" spacing={0.04} />
          </button>
        </footer>
      </div>
    </div>
  );
}