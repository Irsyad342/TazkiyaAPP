"use client";

/**
 * Tazkiya — Mood Check-in: salah satu bagian utama Beranda.
 * Pilihan mood berilustrasi (wajah SVG satu gaya garis, warna aksen per mood),
 * disimpan SATU catatan per tanggal — menekan berkali-kali hanya memperbarui
 * pilihan hari itu, tidak membuat entri ganda. Pilihan lama hari ini otomatis
 * tampil terpilih dan bisa diganti. Bukan alat diagnosis psikologis.
 */

import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, type MoodId } from "@/lib/tazkiya/types";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

/** Aksen warna per karakter mood — ungu Tazkiya tetap warna utama. */
const TONE: Record<MoodId, { text: string; selBg: string; selBorder: string }> = {
  bahagia: {
    text: "text-amber-300 light:text-amber-600",
    selBg: "bg-amber-400/[0.13] light:bg-amber-400/20",
    selBorder: "border-amber-300/60 light:border-amber-500/50",
  },
  tenang: {
    text: "text-[#8fa7ff] light:text-[#5b8def]",
    selBg: "bg-[#5b8def]/[0.13] light:bg-[#5b8def]/15",
    selBorder: "border-[#8fa7ff]/60 light:border-[#5b8def]/50",
  },
  bersyukur: {
    text: "text-pink-300 light:text-pink-600",
    selBg: "bg-pink-400/[0.13] light:bg-pink-400/20",
    selBorder: "border-pink-300/60 light:border-pink-500/50",
  },
  lelah: {
    text: "text-slate-300 light:text-slate-500",
    selBg: "bg-slate-400/[0.14] light:bg-slate-400/20",
    selBorder: "border-slate-300/60 light:border-slate-500/50",
  },
  sedih: {
    text: "text-sky-300 light:text-sky-600",
    selBg: "bg-sky-400/[0.13] light:bg-sky-400/20",
    selBorder: "border-sky-300/60 light:border-sky-500/50",
  },
  cemas: {
    text: "text-indigo-300 light:text-indigo-500",
    selBg: "bg-indigo-400/[0.14] light:bg-indigo-400/20",
    selBorder: "border-indigo-300/60 light:border-indigo-500/50",
  },
  "campur-aduk": {
    text: "text-tz-violet light:text-[#6c5ce7]",
    selBg: "bg-tz-violet/[0.13] light:bg-tz-violet/15",
    selBorder: "border-tz-violet/55",
  },
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

/** Wajah ilustratif per mood — satu gaya (garis membulat), warna dari currentColor. */
function MoodFace({ id, className }: { id: MoodId; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <circle cx="32" cy="34" r="21.5" fill="currentColor" opacity="0.12" />
      <circle cx="32" cy="34" r="21.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {id === "bahagia" && (
        <g>
          <circle cx="26" cy="29.5" r="2.1" fill="currentColor" />
          <circle cx="38" cy="29.5" r="2.1" fill="currentColor" />
          <path d="M23 38q9 8 18 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <circle cx="20.5" cy="36.5" r="2.5" fill="currentColor" opacity="0.35" />
          <circle cx="43.5" cy="36.5" r="2.5" fill="currentColor" opacity="0.35" />
          <path d="M49.5 9.5v6M46.5 12.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
        </g>
      )}
      {id === "tenang" && (
        <g>
          <path d="M23 29q3.5 3.2 7 0M34 29q3.5 3.2 7 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M27.5 40q4.5 4 9 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M19 20.5q2.2-2.4 4.4 0M40.6 18.5q2.2-2.4 4.4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
      {id === "bersyukur" && (
        <g>
          <path d="M23 29.5q3.5-3.4 7 0M34 29.5q3.5-3.4 7 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M26.5 39q5.5 4.6 11 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M46.5 11.7c1.5-2.7 5.4-1.2 4.4 1.7-.5 1.6-4.4 3.7-4.4 3.7s-3.9-2.1-4.4-3.7c-1-2.9 2.9-4.4 4.4-1.7Z"
            fill="currentColor"
            opacity="0.85"
          />
        </g>
      )}
      {id === "lelah" && (
        <g>
          <path d="M23.5 29q3.5 1.9 7 .2M33.5 29.2q3.5 1.9 7 .2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M26.5 40.5q1.8-1.8 3.6 0t3.6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M46 16.5h4.5L46 21h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <path d="M51.5 9.5h3l-3 3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </g>
      )}
      {id === "sedih" && (
        <g>
          <circle cx="26" cy="28.5" r="2" fill="currentColor" />
          <circle cx="38" cy="28.5" r="2" fill="currentColor" />
          <path d="M22.5 23.5l5.5 1.9M41.5 23.5L36 25.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M26.5 43q5.5-4.6 11 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
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
          <circle cx="26" cy="28.5" r="2" fill="currentColor" />
          <path d="M34.5 28.5q3.5 3 7 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
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
      className="animate-tz-fade-up rounded-[1.5rem] border border-tz-line-soft bg-tz-panel-soft/70 p-4"
    >
      <div className="mb-3.5 px-0.5">
        <h2 className="font-display text-[17px] font-bold tracking-tight text-tz-ink">
          Bagaimana perasaanmu hari ini?
        </h2>
        <p className="mt-0.5 text-[11.5px] text-tz-muted">Luangkan waktu sejenak untuk memahami dirimu.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Pilih mood hari ini"
        className="no-scrollbar -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1.5"
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
                "tap flex w-[86px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all duration-200 active:scale-95",
                active
                  ? cn("shadow-[0_10px_22px_-14px_rgba(108,92,231,0.6)]", tone.selBg, tone.selBorder)
                  : "border-tz-line bg-tz-panel hover:border-tz-line-strong"
              )}
            >
              <MoodFace
                id={m.id}
                className={cn("h-[52px] w-[52px] transition-transform duration-200", tone.text, active && "scale-105")}
              />
              <span className={cn("text-[11px] font-semibold leading-none", active ? tone.text : "text-tz-muted")}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 min-h-[76px] px-0.5">
        {moodToday ? (
          <div className="tz-fade-in">
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
              className="tap mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-tz-violet/30 bg-tz-violet/12 text-[12px] font-semibold text-tz-accent transition-all hover:bg-tz-violet/20"
            >
              <BookHeart size={15} />
              Lanjut ke Jurnal Syukur
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <p className="pt-1 text-[11px] leading-relaxed text-tz-muted/80">
            Pilih yang paling mendekati — boleh diganti kapan saja.
          </p>
        )}
      </div>

      <p className="mt-1 px-0.5 text-[9.5px] leading-relaxed text-tz-muted/60">
        Mood membantu refleksi diri — bukan alat diagnosis psikologis.
      </p>
    </section>
  );
}
