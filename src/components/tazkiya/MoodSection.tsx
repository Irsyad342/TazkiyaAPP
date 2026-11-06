"use client";

/**
 * Tazkiya v5 — Mood Check-in (Beranda) — tanpa kartu, komposisi editorial.
 * Tujuh ekspresi dari aset emoji MoodFace (kotak rounded dari kolase
 * referensi); pilihan aktif: ring oranye Tazkiya + bayangan lembut + pop
 * animasi spring. Disimpan SATU catatan per tanggal —
 * menekan berkali-kali hanya memperbarui pilihan hari itu. Pilihan lama
 * hari ini otomatis tampil terpilih. Bukan alat diagnosis.
 *
 * Interaksi premium (v6): tekan → tile mengecil sesaat (whileTap) lalu
 * pop spring dengan rotasi halus (scale 0.86→1.15→0.97→1.08); glow aktif
 * terdiri dari ring offset statis (transisi box-shadow 300ms), glow dalam
 * peach/orange di atas permukaan tile, ambient glow oranye di sekitar,
 * dan ripple halo sekali-jalan yang mengembang lalu memudar saat dipilih.
 * Label mendapat emphasis spring. Entrance staggered dengan settle rotasi.
 * Semua animasi transform/opacity (GPU-friendly), box-shadow hanya
 * transisi kelas; me-respect settings.animations + prefers-reduced-motion
 * (indikator pilihan tetap tampil tanpa animasi). Bentuk, ukuran, ekspresi,
 * susunan 4+3, warna dasar, dan mekanisme simpan mood tidak berubah.
 */

import { useState } from "react";
import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { m, useReducedMotion, type Transition } from "framer-motion";
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

/** Keyframes pop tekan: mengecil → membesar → spring ke skala aktif 1.08. */
const POP_SCALE = [0.86, 1.15, 0.97, 1.08];
const POP_ROTATE = [-2.5, 2, -0.8, 0];
const POP_TRANSITION: Transition = {
  duration: 0.55,
  times: [0, 0.38, 0.66, 1],
  ease: ["easeOut", "easeInOut", "easeOut"],
};

/** Glow dalam di atas permukaan tile — menyatu dengan ilustrasi emoji. */
function InnerGlow({ motionOK }: { motionOK: boolean }) {
  const cls =
    "pointer-events-none absolute inset-0 rounded-[25%] light:shadow-[inset_0_0_13px_rgba(255,90,0,0.26),inset_0_1.5px_3px_rgba(255,224,204,0.6),inset_0_-5px_10px_-6px_rgba(255,90,0,0.18)] dark:shadow-[inset_0_0_16px_rgba(255,154,82,0.5),inset_0_1.5px_3px_rgba(255,224,204,0.38),inset_0_-6px_12px_-6px_rgba(224,74,0,0.4)]";
  if (!motionOK) return <span aria-hidden className={cn(cls, "opacity-100")} />;
  return (
    <m.span
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cls}
    />
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
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const reduceMotion = useReducedMotion();
  const motionOK = animationsOn && !reduceMotion;

  /** Emoji terakhir yang ditekan + penghitung, agar pop & ripple diputar ulang pada setiap tekan. */
  const [pulse, setPulse] = useState<{ id: MoodId; n: number } | null>(null);

  const select = (id: MoodId, label: string) => {
    setMood(today, id);
    if (motionOK) setPulse((p) => ({ id, n: p && p.id === id ? p.n + 1 : 1 }));
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
              const popping = pulse?.id === mo.id;
              return (
                <m.button
                  key={mo.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Mood ${mo.label}`}
                  onClick={() => select(mo.id, mo.label)}
                  initial={motionOK ? { opacity: 0, scale: 0.55, y: 10, rotate: -3 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24, delay: motionOK ? 0.05 + order * 0.05 : 0 }}
                  whileTap={motionOK ? { scale: 0.88, y: 1 } : undefined}
                  whileHover={
                    motionOK
                      ? { scale: 1.05, y: -2, transition: { type: "spring", stiffness: 400, damping: 18 } }
                      : undefined
                  }
                  className="tap flex w-[80px] shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-2"
                >
                  <m.span
                    aria-hidden
                    initial={false}
                    animate={
                      popping && motionOK
                        ? { scale: POP_SCALE, rotate: POP_ROTATE }
                        : { scale: motionOK && active ? 1.08 : 1, rotate: 0 }
                    }
                    transition={
                      popping && motionOK
                        ? POP_TRANSITION
                        : { type: "spring", stiffness: 420, damping: 20 }
                    }
                    className={cn(
                      "relative flex rounded-[25%] transition-[box-shadow] duration-300",
                      active
                        ? "ring-2 ring-tk-accent ring-offset-2 ring-offset-tk-stage light:shadow-[0_10px_22px_-8px_rgba(255,90,0,0.45),0_3px_14px_-4px_rgba(255,90,0,0.22)] dark:shadow-[0_10px_24px_-10px_rgba(217,75,10,0.55),0_0_28px_-6px_rgba(255,154,82,0.5)]"
                        : "light:shadow-[0_6px_14px_-6px_rgba(119,113,109,0.42)] light:ring-1 light:ring-[#2a2320]/[0.06] dark:shadow-[0_10px_22px_-12px_rgba(12,6,2,0.6)] dark:ring-1 dark:ring-[#F5E8DC]/[0.07]"
                    )}
                  >
                    <MoodFace id={mo.id} className="h-16 w-16" />
                    {active ? <InnerGlow motionOK={motionOK} /> : null}
                    {/* Ripple halo sekali-jalan: outline oranye mengembang lalu memudar saat dipilih */}
                    {motionOK && active ? (
                      <m.span
                        key={`halo-${pulse?.n ?? 0}`}
                        aria-hidden
                        initial={{ opacity: 0.7, scale: 0.92 }}
                        animate={{ opacity: 0, scale: 1.38 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className="pointer-events-none absolute -inset-[6px] rounded-[27%] shadow-[0_0_0_1.5px_rgba(255,90,0,0.5),0_0_22px_4px_rgba(255,90,0,0.35)]"
                      />
                    ) : null}
                  </m.span>
                  <m.span
                    animate={{ scale: motionOK && active ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 480, damping: 22 }}
                    className={cn(
                      "text-[10.5px] leading-none transition-colors duration-300",
                      active ? "font-bold text-tk-ink" : "font-medium text-tk-muted",
                    )}
                  >
                    {mo.label}
                  </m.span>
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
