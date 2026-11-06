"use client";

/**
 * Tazkiya v5 — Mood Check-in (Beranda) — tanpa kartu, komposisi editorial.
 * Tujuh ekspresi dari aset emoji MoodFace (kotak rounded dari kolase
 * referensi); pilihan aktif: ring oranye Tazkiya + bayangan lembut + pop
 * animasi spring. Disimpan SATU catatan per tanggal —
 * menekan berkali-kali hanya memperbarui pilihan hari itu. Pilihan lama
 * hari ini otomatis tampil terpilih. Bukan alat diagnosis.
 */

import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { m, useReducedMotion } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, type MoodId } from "@/lib/tazkiya/types";
import { MoodFace } from "./MoodFace";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

/** Kalimat pendamping singkat — dukungan, bukan kesimpulan kondisi mental. */
const REFLEKSI: Record<MoodId, string> = {
  bahagia: "Nikmati momen baik ini.",
  tenang: "Semoga ketenangan ini bertahan sepanjang hari.",
  bersyukur: "Hatimu sedang penuh syukur.",
  lelah: "Istirahat juga bagian dari ikhtiar.",
  sedih: "Tidak apa-apa, perasaanmu sah.",
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
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const reduceMotion = useReducedMotion();
  const motionOK = animationsOn && !reduceMotion;

  const select = (id: MoodId, label: string) => {
    setMood(today, id);
    toast.success(`Tercatat: ${label}`);
  };

  return (
    <section aria-label="Mood check-in" className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Bagaimana perasaanmu hari ini?</h2>
        <p className="mt-1 text-[12px] text-tk-muted">Luangkan waktu sejenak untuk memahami dirimu.</p>
      </div>

      <div role="radiogroup" aria-label="Pilih mood hari ini" className="flex flex-col gap-2.5">
        {/* Baris 4 + 3 simetris, semua ekspresi terlihat tanpa menggulir */}
        {[MOODS.slice(0, 4), MOODS.slice(4)].map((row, r) => (
          <div key={r} className="flex items-start justify-center gap-1">
            {row.map((mo, i) => {
              const active = moodToday === mo.id;
              const order = r * 4 + i;
              return (
                <m.button
                  key={mo.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Mood ${mo.label}`}
                  onClick={() => select(mo.id, mo.label)}
                  initial={motionOK ? { opacity: 0, scale: 0.55, y: 8 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24, delay: motionOK ? 0.05 + order * 0.05 : 0 }}
                  whileTap={motionOK ? { scale: 0.88 } : undefined}
                  className="tap flex w-[80px] shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-2"
                >
                  <m.span
                    aria-hidden
                    animate={{ scale: motionOK && active ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                    className={cn(
                      "flex rounded-[25%] transition-[box-shadow] duration-300",
                      active
                        ? "ring-2 ring-tk-accent ring-offset-2 ring-offset-tk-stage light:shadow-[0_10px_22px_-8px_rgba(255,90,0,0.45)] dark:shadow-[0_10px_24px_-10px_rgba(217,75,10,0.45)]"
                        : "light:shadow-[0_6px_14px_-6px_rgba(119,113,109,0.42)] light:ring-1 light:ring-[#2a2320]/[0.06] dark:shadow-[0_10px_22px_-12px_rgba(12,6,2,0.6)] dark:ring-1 dark:ring-[#F5E8DC]/[0.07]"
                    )}
                  >
                    <MoodFace id={mo.id} className="h-16 w-16" />
                  </m.span>
                  <span className={cn("text-[10.5px] leading-none", active ? "font-bold text-tk-ink" : "font-medium text-tk-muted")}>
                    {mo.label}
                  </span>
                </m.button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-auto min-h-[74px] pt-4">
        {moodToday ? (
          <div className="tk-fade-in rounded-[1.25rem] bg-tk-panel-soft p-4">
            <p className="text-[13px] leading-relaxed text-tk-ink/95">
              <span className="font-bold">{moodLabel(moodToday)}</span>
              <span className="text-tk-muted">, {REFLEKSI[moodToday]}</span>
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
            Pilih yang paling mendekati, boleh diganti kapan saja. Satu catatan per hari.
          </p>
        )}
      </div>

      <p className="mt-2.5 text-[9.5px] leading-relaxed text-tk-muted/60">
        Mood membantu refleksi diri, bukan alat diagnosis psikologis.
      </p>
    </section>
  );
}
