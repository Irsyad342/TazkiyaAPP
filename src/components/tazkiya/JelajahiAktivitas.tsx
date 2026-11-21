"use client";

/**
 * Tazkiya v5 — "Jelajahi Aktivitas": tiga komposisi yang BENAR-BENAR BERBEDA
 * (bukan tiga kartu kembar):
 * 1. Jurnal Syukur — baris editorial TANPA kartu: hairline atas, tanda kutip
 *    besar, judul tebal, status; sambungan tipografis.
 * 2. Zikir & Doa — kartu putih ringkas dengan widget sirkular (cincin
 *    progres hitungan zikir hari ini yang nyata).
 * 3. Rizq & Amal — blok statistik: angka besar Manrope + garis vertikal
 *    lime aksen, tanpa kartu penuh.
 * Semua tombol membuka halaman penuh yang sudah ada.
 */

import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { Stagger, StaggerItem, TiltCard } from "./motion-bits";
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
  const zikirTarget = useWorshipStore((s) => s.settings.zikirTarget);
  const zikirCount = useWorshipStore((s) => s.logs[today]?.zikirCount ?? 0);
  const amalCount = useWorshipStore((s) => s.amalEntries.filter((a) => a.date === today).length);
  const zikirPct = Math.min(100, (zikirCount / Math.max(1, zikirTarget)) * 100);

  return (
    <section aria-label="Jelajahi aktivitas" className="animate-tk-fade-up flex h-full flex-col">
      <div className="mb-4 px-0.5">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Jelajahi Aktivitas</h2>
        <p className="mt-1 text-[12px] leading-snug text-tk-muted">Ruang refleksi dan kebaikan di luar tracker utama.</p>
      </div>

      {/* Entrance stagger ~64 ms antar kartu (Stagger/StaggerItem). */}
      <Stagger className="flex flex-1 flex-col gap-5">
        {/* 1. Jurnal Syukur, baris editorial tanpa kartu */}
        <StaggerItem>
          <TiltCard
            as="button"
            maxTilt={3}
            onClick={() => onOpen("jurnal")}
            ariaLabel="Buka halaman Jurnal Syukur"
            className="tap group block w-full border-t border-tk-line pt-4 text-left"
          >
          <span className="flex items-start gap-3.5">
            <span aria-hidden className="gs-display select-none text-[38px] font-extrabold leading-[0.8] text-tk-lav-deco">
              &ldquo;
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-bold tracking-[-0.01em] text-tk-ink">Jurnal Syukur</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-tk-muted">
                {sudahMenulis ? "Sudah kamu tulis hari ini, terima kasih sudah berhenti sejenak." : "Tiga hal kecil yang kamu syukuri hari ini, butuh 2 menit saja."}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-tk-violet">
                {sudahMenulis ? "Buka kembali" : "Mulai menulis"} <ChevronRight size={14} />
              </span>
            </span>
          </span>
          </TiltCard>
        </StaggerItem>

        {/* 2. Zikir & Doa — kartu Deep Navy + sudut lime + cincin turquoise;
               angka hitungan Neon Lime, aksen Cyan pada track ring */}
        <StaggerItem>
          <TiltCard
            as="button"
            maxTilt={3}
            onClick={() => onOpen("zikir-doa")}
            ariaLabel="Buka halaman Zikir & Doa"
            className="tap glass-hero tk-surf-navy-card flex items-center gap-4 rounded-[1.5rem] p-4 text-left"
          >
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-white">Zikir &amp; Doa</span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-white/75">
              Hitungan hari ini{" "}
              <span className="tnum font-bold text-[var(--tk-zikir-num)]">{zikirCount.toLocaleString("id-ID")}</span> dari target{" "}
              {zikirTarget.toLocaleString("id-ID")}
            </span>
          </span>
          {/* cincin progres mini: track cyan tipis, busur turquoise (electric);
              klasik: track & busur putih asli via token */}
          <span aria-hidden className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" className="stroke-[var(--tk-zikir-ring-track)]" />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className="stroke-[var(--tk-zikir-ring-arc)]"
                strokeDasharray={`${(zikirPct / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
              />
            </svg>
            <span className="tnum text-[12px] font-bold text-[var(--tk-zikir-num)]">{zikirCount > 999 ? "999+" : zikirCount}</span>
          </span>
          </TiltCard>
        </StaggerItem>

        {/* 3. Rizq & Amal — kartu Soft Turquoise, indikator turquoise,
               angka Deep Navy, aksen Electric Blue pada panah */}
        <StaggerItem>
          <TiltCard
            as="button"
            maxTilt={3}
            onClick={() => onOpen("rizq-amal")}
            ariaLabel="Buka halaman Rizq & Amal"
            className="tap tk-surf-soft-teal su-card-shadow flex items-center gap-4 rounded-[1.5rem] p-4 text-left"
          >
          <span aria-hidden className="h-12 w-[3px] shrink-0 rounded-full bg-[var(--tk-amal-bar)]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-tk-ink">Rizq &amp; Amal</span>
            <span className="mt-0.5 block text-[11.5px] text-tk-muted">Kebaikan tercatat hari ini</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="gs-display text-[30px] font-extrabold leading-none text-tk-ink">{amalCount}</span>
            <ArrowUpRight size={16} className="text-[var(--tk-amal-arrow)]" />
          </span>
          </TiltCard>
        </StaggerItem>
      </Stagger>
    </section>
  );
}
