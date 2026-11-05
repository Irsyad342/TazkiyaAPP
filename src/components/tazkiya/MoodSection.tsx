"use client";

/**
 * Tazkiya v5 — Mood Check-in (Beranda) — tanpa kartu, komposisi editorial.
 * Tujuh ekspresi dari komponen bersama MoodFace (gaya garis konsisten)
 * dalam lingkaran lembut; pilihan aktif: lingkaran berwarna pastel + ring
 * lavender + pop animasi spring. Disimpan SATU catatan per tanggal —
 * menekan berkali-kali hanya memperbarui pilihan hari itu. Pilihan lama
 * hari ini otomatis tampil terpilih. Bukan alat diagnosis.
 */

import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, type MoodId } from "@/lib/tazkiya/types";
import { MoodFace, MOOD_TONE } from "./MoodFace";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

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
    <section aria-label="Mood check-in" className="animate-tk-fade-up flex h-full flex-col">
      <div className="mb-4">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Bagaimana perasaanmu hari ini?</h2>
        <p className="mt-1 text-[12px] text-tk-muted">Luangkan waktu sejenak untuk memahami dirimu.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Pilih mood hari ini"
        className="no-scrollbar -mx-1.5 flex w-full min-w-0 snap-x gap-1.5 overflow-x-auto px-1.5 pb-1 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible"
      >
        {MOODS.map((mo) => {
          const tone = MOOD_TONE[mo.id];
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
                  active ? cn(tone.activeBg, "ring-2 ring-tk-violet") : "bg-tk-panel-soft"
                )}
              >
                <MoodFace id={mo.id} className={cn("h-[44px] w-[44px]", tone.face)} />
              </m.span>
              <span className={cn("text-[10.5px] leading-none", active ? "font-bold text-tk-ink" : "font-medium text-tk-muted")}>
                {mo.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto min-h-[74px] pt-4">
        {moodToday ? (
          <div className="tk-fade-in rounded-[1.25rem] bg-tk-panel-soft p-4">
            <p className="text-[13px] leading-relaxed text-tk-ink/95">
              <span className="font-bold">{moodLabel(moodToday)}</span>
              <span className="text-tk-muted"> — {REFLEKSI[moodToday]}</span>
            </p>
            <button
              type="button"
              onClick={() => onOpenSubpage("jurnal")}
              className="tap mt-2 flex items-center gap-1 text-[12px] font-bold text-tk-violet"
            >
              <BookHeart size={14} />
              Lanjut ke Jurnal Syukur
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-tk-muted/80">
            Pilih yang paling mendekati — boleh diganti kapan saja. Satu catatan per hari.
          </p>
        )}
      </div>

      <p className="mt-2.5 text-[9.5px] leading-relaxed text-tk-muted/60">
        Mood membantu refleksi diri — bukan alat diagnosis psikologis.
      </p>
    </section>
  );
}
