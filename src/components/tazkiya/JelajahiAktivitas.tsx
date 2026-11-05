"use client";

/**
 * Tazkiya — "Jelajahi Aktivitas" di Beranda: pintasan refleksi & kebaikan.
 * Komposisi editorial — blok utama lime (Jurnal Syukur), kartu lavender
 * (Zikir & Doa), dan baris kartu putih (Rizq & Amal) — bukan grid kartu
 * seragam. Semua tombol membuka halaman penuh yang sudah ada.
 */

import { ArrowUpRight, BookHeart, HandCoins, HandHeart } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

export function JelajahiAktivitas({
  today,
  onOpen,
}: {
  today: string;
  onOpen: (sub: SubPageId) => void;
}) {
  const sudahMenulis = useWorshipStore((s) => Boolean(s.journal[today]));

  return (
    <section aria-label="Jelajahi aktivitas" className="animate-tz-fade-up">
      <div className="mb-3 px-0.5">
        <h2 className="font-display text-[17px] font-extrabold tracking-tight text-tz-ink">Jelajahi Aktivitas</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-tz-muted">
          Ruang untuk terus bertumbuh dalam ibadah dan kebaikan.
        </p>
      </div>

      <div className="space-y-2.5">
        {/* A. Jurnal Syukur — blok utama lime (satu-satunya aksen lime besar) */}
        <button
          type="button"
          onClick={() => onOpen("jurnal")}
          aria-label="Buka halaman Jurnal Syukur"
          className="tap block w-full rounded-[1.65rem] bg-tz-lime p-4 text-left shadow-[0_20px_44px_-20px_rgba(163,199,60,0.65)] transition-all active:scale-[0.985]"
        >
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tz-lime-ink/90 text-tz-lime"
            >
              <BookHeart size={21} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-extrabold text-tz-lime-ink">Jurnal Syukur</span>
              <span className="mt-0.5 block text-[11.5px] font-medium leading-relaxed text-tz-lime-ink/75">
                {sudahMenulis ? "Ditulis hari ini ✓ — terima kasih sudah merenung" : "Tiga hal kecil yang layak disyukuri"}
              </span>
            </span>
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tz-lime-ink text-tz-lime"
            >
              <ArrowUpRight size={16} strokeWidth={2.4} />
            </span>
          </div>
        </button>

        {/* B. Zikir & Doa — kartu lavender lembut, ikon di kanan */}
        <button
          type="button"
          onClick={() => onOpen("zikir-doa")}
          aria-label="Buka halaman Zikir & Doa"
          className="tap block w-full rounded-[1.5rem] border border-tz-violet/20 bg-tz-violet/[0.08] p-4 text-left transition-all hover:border-tz-violet/40 light:bg-tz-violet/[0.1] active:scale-[0.985]"
        >
          <div className="flex items-center gap-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-extrabold text-tz-ink">Zikir &amp; Doa</span>
              <span className="mt-0.5 block text-[11.5px] font-medium leading-relaxed text-tz-muted">
                Temani harimu dengan zikir dan doa.
              </span>
            </span>
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tz-violet text-white"
            >
              <HandHeart size={20} strokeWidth={1.9} />
            </span>
          </div>
        </button>

        {/* C. Rizq & Amal — kartu putih datar */}
        <button
          type="button"
          onClick={() => onOpen("rizq-amal")}
          aria-label="Buka halaman Rizq & Amal"
          className={cn(
            "tap flex w-full items-center gap-3.5 rounded-[1.5rem] border border-tz-line bg-tz-panel p-4 text-left transition-all hover:border-tz-line-strong active:scale-[0.985]"
          )}
        >
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:bg-amber-400/12 dark:text-amber-300"
          >
            <HandCoins size={19} strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold text-tz-ink">Rizq &amp; Amal</span>
            <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-tz-muted">
              Catat langkah kecil dalam berbagi kebaikan.
            </span>
          </span>
          <ArrowUpRight size={16} className="shrink-0 text-tz-muted/70" />
        </button>
      </div>
    </section>
  );
}
