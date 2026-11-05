"use client";

/**
 * Tazkiya v5 — Mood Check-in (Beranda) — tanpa kartu, komposisi editorial.
 * Tujuh ekspresi SVG bergaya garis konsisten (stroke membulat sama, satu
 * keluarga wajah) dalam lingkaran lembut; pilihan aktif: lingkaran lavender
 * muda + ring lavender + pop animasi spring. Disimpan SATU catatan per
 * tanggal — menekan berkali-kali hanya memperbarui pilihan hari itu.
 * Pilihan lama hari ini otomatis tampil terpilih. Bukan alat diagnosis.
 */

import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, type MoodId } from "@/lib/tazkiya/types";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

/** Aksen warna per karakter mood — lembut, satu keluarga pastel. */
const TONE: Record<MoodId, { face: string; activeBg: string }> = {
  bahagia: { face: "text-[#e8a23d]", activeBg: "bg-[#fbf3e4]" },
  tenang: { face: "text-[#5b8def]", activeBg: "bg-[#edf3fe]" },
  bersyukur: { face: "text-[#e8698d]", activeBg: "bg-[#fdeef2]" },
  lelah: { face: "text-[#888795]", activeBg: "bg-[#f4f5f9]" },
  sedih: { face: "text-[#6a89c9]", activeBg: "bg-[#eef2fa]" },
  cemas: { face: "text-[#8a79d9]", activeBg: "bg-[#f0edff]" },
  "campur-aduk": { face: "text-[#8d7be8]", activeBg: "bg-[#e6e0ff]" },
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
    <section aria-label="Mood check-in" className="animate-tz-fade-up flex h-full flex-col">
      <div className="mb-4">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tz-ink">Bagaimana perasaanmu hari ini?</h2>
        <p className="mt-1 text-[12px] text-tz-muted">Luangkan waktu sejenak untuk memahami dirimu.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Pilih mood hari ini"
        className="no-scrollbar -mx-1.5 flex w-full min-w-0 snap-x gap-1.5 overflow-x-auto px-1.5 pb-1 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible"
      >
        {MOODS.map((mo) => {
          const tone = TONE[mo.id];
          const active = moodToday === mo.id;
          return (
            <button
              key={mo.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Mood ${mo.label}`}
              onClick={() => select(mo.id, mo.label)}
              className="tap flex w-[76px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl px-1.5 py-2.5 sm:w-auto"
            >
              <m.span
                aria-hidden
                animate={{ scale: active ? 1.07 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                className={cn(
                  "flex h-[58px] w-[58px] items-center justify-center rounded-full transition-colors duration-200",
                  active ? cn(tone.activeBg, "ring-2 ring-tz-violet") : "bg-tz-panel-soft"
                )}
              >
                <MoodFace id={mo.id} className={cn("h-[44px] w-[44px]", tone.face)} />
              </m.span>
              <span className={cn("text-[10.5px] leading-none", active ? "font-bold text-tz-ink" : "font-medium text-tz-muted")}>
                {mo.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto min-h-[74px] pt-4">
        {moodToday ? (
          <div className="tz-fade-in rounded-[1.25rem] bg-tz-panel-soft p-4">
            <p className="text-[13px] leading-relaxed text-tz-ink/95">
              <span className="font-bold">{moodLabel(moodToday)}</span>
              <span className="text-tz-muted"> — {REFLEKSI[moodToday]}</span>
            </p>
            <button
              type="button"
              onClick={() => onOpenSubpage("jurnal")}
              className="tap mt-2 flex items-center gap-1 text-[12px] font-bold text-tz-violet"
            >
              <BookHeart size={14} />
              Lanjut ke Jurnal Syukur
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-tz-muted/80">
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
