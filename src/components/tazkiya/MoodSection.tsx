"use client";

/**
 * Tazkiya v4 — Mood Check-in (Beranda): tujuh mood berilustrasi besar dan
 * interaktif — lingkaran ilustrasi 64px dengan cincin pilihan lavender,
 * latar soft-purple saat aktif, label tegas; BUKAN daftar tombol kecil.
 * Disimpan SATU catatan per tanggal — menekan berkali-kali hanya memperbarui
 * pilihan hari itu. Pilihan lama hari ini otomatis tampil terpilih.
 * Bukan alat diagnosis psikologis.
 */

import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, type MoodId } from "@/lib/tazkiya/types";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

/** Aksen warna per karakter mood — lavender Tazkiya tetap identitas utama. */
const TONE: Record<MoodId, { face: string; activeBg: string }> = {
  bahagia: { face: "text-amber-500 dark:text-amber-300", activeBg: "bg-amber-100 dark:bg-amber-400/15" },
  tenang: { face: "text-[#5b8def]", activeBg: "bg-[#5b8def]/12 dark:bg-[#5b8def]/20" },
  bersyukur: { face: "text-tz-rose dark:text-pink-300", activeBg: "bg-pink-100 dark:bg-pink-400/15" },
  lelah: { face: "text-slate-500 dark:text-slate-300", activeBg: "bg-slate-200/70 dark:bg-slate-400/15" },
  sedih: { face: "text-sky-600 dark:text-sky-300", activeBg: "bg-sky-100 dark:bg-sky-400/15" },
  cemas: { face: "text-indigo-500 dark:text-indigo-300", activeBg: "bg-indigo-100 dark:bg-indigo-400/15" },
  "campur-aduk": { face: "text-tz-violet dark:text-tz-accent", activeBg: "bg-tz-lavender dark:bg-tz-accent/20" },
};

/** Kalimat pendamping singkat — dukungan, bukan kesimpulan kondisi mental. */
const REFLEKSI: Record<MoodId, string> = {
  bahagia: "Nikmati momen baik ini.",
  tenang: "Semoga ketenangan ini bertahan sepanjang hari.",
  bersyukur: "Hatimu sedang penuh syukur.",
  lelah: "Istirahat juga bagian dari ikhtiar.",
  sedih: "Tidak apa-apa — perasaanmu sah.",
  cemas: "Tarik napas, jalani satu demi satu.",
  "campur-aduk": "Bercampur itu wajar, tidak harus memilih satu.",
};

/** Wajah ilustratif per mood — satu gaya garis membulat, warna currentColor. */
function MoodFace({ id, className }: { id: MoodId; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <circle cx="32" cy="34" r="21.5" stroke="currentColor" strokeWidth="2.2" opacity="0.9" />
      {id === "bahagia" && (
        <g>
          <circle cx="26" cy="29.5" r="2.2" fill="currentColor" />
          <circle cx="38" cy="29.5" r="2.2" fill="currentColor" />
          <path d="M23 38q9 8 18 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="20.5" cy="36.5" r="2.6" fill="currentColor" opacity="0.35" />
          <circle cx="43.5" cy="36.5" r="2.6" fill="currentColor" opacity="0.35" />
          <path d="M49.5 9.5v6M46.5 12.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
        </g>
      )}
      {id === "tenang" && (
        <g>
          <path d="M23 29q3.5 3.2 7 0M34 29q3.5 3.2 7 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M27.5 40q4.5 4 9 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M19 20.5q2.2-2.4 4.4 0M40.6 18.5q2.2-2.4 4.4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
      {id === "bersyukur" && (
        <g>
          <path d="M23 29.5q3.5-3.4 7 0M34 29.5q3.5-3.4 7 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M26.5 39q5.5 4.6 11 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M46.5 11.7c1.5-2.7 5.4-1.2 4.4 1.7-.5 1.6-4.4 3.7-4.4 3.7s-3.9-2.1-4.4-3.7c-1-2.9 2.9-4.4 4.4-1.7Z"
            fill="currentColor"
            opacity="0.85"
          />
        </g>
      )}
      {id === "lelah" && (
        <g>
          <path d="M23.5 29q3.5 1.9 7 .2M33.5 29.2q3.5 1.9 7 .2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M26.5 40.5q1.8-1.8 3.6 0t3.6 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M46 16.5h4.5L46 21h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <path d="M51.5 9.5h3l-3 3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </g>
      )}
      {id === "sedih" && (
        <g>
          <circle cx="26" cy="28.5" r="2.1" fill="currentColor" />
          <circle cx="38" cy="28.5" r="2.1" fill="currentColor" />
          <path d="M22.5 23.5l5.5 1.9M41.5 23.5L36 25.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M26.5 43q5.5-4.6 11 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M21.5 33.5c-1.7 2.9-1.7 4.8 0 4.8s1.7-1.9 0-4.8Z" fill="currentColor" opacity="0.8" />
        </g>
      )}
      {id === "cemas" && (
        <g>
          <circle cx="26" cy="28" r="3.3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity="0.15" />
          <circle cx="38" cy="28" r="3.3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity="0.15" />
          <circle cx="26" cy="28" r="1.1" fill="currentColor" />
          <circle cx="38" cy="28" r="1.1" fill="currentColor" />
          <path d="M27.5 40.5q2.2-2.2 4.4 0t4.4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M47.5 16.5c-1.5 2.6-1.5 4.3 0 4.3s1.5-1.7 0-4.3Z" fill="currentColor" opacity="0.8" />
        </g>
      )}
      {id === "campur-aduk" && (
        <g>
          <circle cx="26" cy="28.5" r="2.1" fill="currentColor" />
          <path d="M34.5 28.5q3.5 3 7 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M25.5 40q3.5 3.1 6.5 1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M32.5 41.4q3.5-.9 6.5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M44.5 23.5q2-2.2 4 0t4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}

export function MoodSection({
  today,
  onOpenSubpage,
}: {
  today: string;
  onOpenSubpage: (sub: SubPageId) => void;
}) {
  const moodToday = useWorshipStore((s) => s.moods[today]?.mood);
  const setMood = useWorshipStore((s) => s.setMood);

  const select = (id: MoodId, label: string) => {
    setMood(today, id);
    toast.success(`Tercatat: ${label}`);
  };

  return (
    <section
      aria-label="Mood check-in"
      className="animate-tz-fade-up flex h-full flex-col rounded-[1.6rem] border border-tz-line bg-tz-panel p-5 shadow-[0_1px_2px_rgba(25,25,35,0.03),0_18px_44px_-30px_rgba(46,38,104,0.25)]"
    >
      <div className="mb-4">
        <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-tz-ink">
          Bagaimana perasaanmu hari ini?
        </h2>
        <p className="mt-0.5 text-[11.5px] text-tz-muted">Luangkan waktu sejenak untuk memahami dirimu.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Pilih mood hari ini"
        className="no-scrollbar -mx-1.5 flex snap-x gap-2 overflow-x-auto px-1.5 pb-1 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible"
      >
        {MOODS.map((m) => {
          const tone = TONE[m.id];
          const active = moodToday === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Mood ${m.label}`}
              onClick={() => select(m.id, m.label)}
              className={cn(
                "tap flex w-[84px] shrink-0 snap-start flex-col items-center gap-2 rounded-[1.4rem] px-2 py-3.5 transition-all duration-200 sm:w-auto",
                active ? tone.activeBg : "bg-tz-panel-soft hover:bg-tz-lavender/50 dark:hover:bg-tz-accent/10"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "relative flex h-[68px] w-[68px] items-center justify-center rounded-full transition-all duration-200",
                  active
                    ? "bg-tz-panel ring-[2.5px] ring-tz-violet shadow-[0_10px_24px_-10px_rgba(136,121,232,0.5)]"
                    : "bg-tz-panel/60"
                )}
              >
                <MoodFace
                  id={m.id}
                  className={cn("h-[54px] w-[54px] transition-transform duration-200", tone.face, active && "scale-[1.06]")}
                />
                {active ? (
                  <span aria-hidden className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-tz-lime" />
                ) : null}
              </span>
              <span className={cn("text-[11px] font-bold leading-none", active ? "text-tz-ink" : "text-tz-muted")}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto min-h-[86px] pt-3">
        {moodToday ? (
          <div className="tz-fade-in rounded-2xl bg-tz-panel-soft p-3.5">
            <p className="text-[12.5px] leading-relaxed text-tz-ink/95">
              <span className="font-bold">{moodLabel(moodToday)}</span>
              <span className="text-tz-muted"> — {REFLEKSI[moodToday]}</span>
            </p>
            <p className="mt-0.5 text-[10px] text-tz-muted/85">
              Kamu sudah check-in hari ini. Ketuk mood lain bila perasaanmu berubah.
            </p>
            <button
              type="button"
              onClick={() => onOpenSubpage("jurnal")}
              className="tap mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-tz-ink text-[12px] font-bold text-white transition-all hover:bg-tz-ink/90"
            >
              <BookHeart size={15} className="text-tz-lime" />
              Lanjut ke Jurnal Syukur
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-tz-line-strong px-3.5 py-3 text-[11px] leading-relaxed text-tz-muted/80">
            Pilih yang paling mendekati — boleh diganti kapan saja. Satu catatan per hari.
          </p>
        )}
      </div>

      <p className="mt-2.5 text-[9.5px] leading-relaxed text-tz-muted/60">
        Mood membantu refleksi diri — bukan alat diagnosis psikologis.
      </p>
    </section>
  );
}
