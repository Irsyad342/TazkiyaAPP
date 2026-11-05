"use client";

/**
 * Tazkiya v4 — "Jelajahi Aktivitas": tiga komposisi visual yang BENAR-BENAR
 * BERBEDA (bukan tiga kartu identik):
 * 1. Jurnal Syukur — kartu featured lavender flat dengan lingkaran tonal
 *    besar (artwork geometris) + tombol tinta.
 * 2. Zikir & Doa — kartu putih dengan visual tasbih (cincin konsentris)
 *    dan hitungan zikir hari ini yang nyata.
 * 3. Rizq & Amal — blok hijau lembut dengan motif tunas geometris dan
 *    hitungan amal hari ini.
 * Semua tombol membuka halaman penuh yang sudah ada.
 */

import { ArrowUpRight, HandCoins, NotebookPen, Sparkles } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { SubPageId } from "./BottomNav";

export function JelajahiAktivitas({
  today,
  onOpen,
}: {
  today: string;
  onOpen: (sub: SubPageId) => void;
}) {
  const sudahMenulis = useWorshipStore((s) => Boolean(s.journal[today]));
  const zikirCount = useWorshipStore((s) => s.logs[today]?.zikirCount ?? 0);
  const amalCount = useWorshipStore((s) => s.amalEntries.filter((a) => a.date === today).length);

  return (
    <section aria-label="Jelajahi aktivitas" className="animate-tz-fade-up flex h-full flex-col">
      <div className="mb-3 px-0.5">
        <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-tz-ink">Jelajahi Aktivitas</h2>
        <p className="mt-0.5 text-[11.5px] leading-snug text-tz-muted">
          Ruang refleksi dan kebaikan di luar tracker utama.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {/* 1. Jurnal Syukur — featured lavender flat + artwork lingkaran */}
        <button
          type="button"
          onClick={() => onOpen("jurnal")}
          aria-label="Buka halaman Jurnal Syukur"
          className="tap relative block w-full overflow-hidden rounded-[1.6rem] bg-tz-violet p-5 text-left shadow-[0_20px_44px_-24px_rgba(136,121,232,0.6)]"
        >
          {/* artwork geometris: lingkaran tonal besar + cincin + titik lime */}
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/12" />
          <span aria-hidden className="pointer-events-none absolute -right-2 top-4 h-20 w-20 rounded-full border-[1.5px] border-white/25" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 right-16 h-2.5 w-2.5 rounded-full bg-tz-lime" />
          <span aria-hidden className="pointer-events-none absolute -left-8 bottom-[-30px] h-24 w-24 rounded-full bg-white/8" />

          <span className="relative block">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
              <NotebookPen size={13} /> Jurnal Syukur
            </span>
            <span className="mt-2 block font-display text-[20px] font-bold leading-snug tracking-[-0.015em] text-white">
              Tiga hal kecil yang kamu syukuri hari ini
            </span>
            <span className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-white/85">
                {sudahMenulis ? "Sudah ditulis hari ini ✓" : "Menantimu — butuh 2 menit saja"}
              </span>
              <span className="tap inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-tz-ink px-3.5 text-[11.5px] font-bold text-white">
                Tulis <ArrowUpRight size={14} className="text-tz-lime" />
              </span>
            </span>
          </span>
        </button>

        {/* 2. Zikir & Doa — kartu putih + visual tasbih cincin konsentris */}
        <button
          type="button"
          onClick={() => onOpen("zikir-doa")}
          aria-label="Buka halaman Zikir & Doa"
          className="tap glass flex items-center gap-4 rounded-[1.6rem] p-4 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[14px] font-bold text-tz-ink">
              <Sparkles size={15} className="text-tz-violet" /> Zikir &amp; Doa
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-tz-muted">
              Hitungan hari ini{" "}
              <span className="tnum font-bold text-tz-ink">{zikirCount.toLocaleString("id-ID")}</span> — lanjutkan
              zikirmu.
            </span>
          </span>
          {/* piringan tasbih mini: cincin konsentris + angka */}
          <span aria-hidden className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-tz-violet/35">
            <span className="absolute inset-[5px] rounded-full border border-dashed border-tz-violet/40" />
            <span className="tnum font-display text-[15px] font-bold text-tz-violet dark:text-tz-accent">
              {zikirCount > 999 ? "999+" : zikirCount}
            </span>
          </span>
        </button>

        {/* 3. Rizq & Amal — blok hijau lembut + motif tunas */}
        <button
          type="button"
          onClick={() => onOpen("rizq-amal")}
          aria-label="Buka halaman Rizq & Amal"
          className="tap relative block w-full overflow-hidden rounded-[1.6rem] border border-tz-green/25 bg-tz-green-soft p-4 text-left"
        >
          <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-tz-green/12" />
          <span className="relative flex items-center gap-4">
            {/* tunas geometris: batang + dua daun lingkaran */}
            <span aria-hidden className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tz-green/15">
              <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
                <path d="M16 27V15" stroke="#5FBF7A" strokeWidth="2" strokeLinecap="round" />
                <circle cx="11" cy="12" r="5" fill="#5FBF7A" opacity="0.85" />
                <circle cx="21.5" cy="9.5" r="3.6" fill="#A8D9B4" />
                <circle cx="16" cy="27" r="2" fill="#5FBF7A" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[14px] font-bold text-tz-ink">
                <HandCoins size={15} className="text-tz-green" /> Rizq &amp; Amal
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-tz-muted">
                <span className="tnum font-bold text-tz-ink">{amalCount}</span> amal tercatat hari ini — sedikit
                tapi rutin.
              </span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 text-tz-green" />
          </span>
        </button>
      </div>
    </section>
  );
}
