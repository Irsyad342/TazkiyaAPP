"use client";

/**
 * Tazkiya v5 — Mood Check-in (Beranda) — tanpa kartu, komposisi editorial.
 * Tujuh ekspresi dari aset emoji MoodFace (kotak rounded dari kolase
 * referensi); pilihan aktif: ring oranye Tazkiya + bayangan lembut + pop
 * animasi spring. Disimpan SATU catatan per tanggal —
 * menekan berkali-kali hanya memperbarui pilihan hari itu. Pilihan lama
 * hari ini otomatis tampil terpilih. Bukan alat diagnosis.
 *
 * Interaksi premium (v6, selaras motion system): tekan → ikon menyusut
 * sesaat (PressScale press 0.92) lalu tile pop spring scale 0.8→1.08
 * (SPRING.pop) dengan ayunan emot tipis ±4° (satu segmen spring); glow aktif
 * terdiri dari ring offset statis (transisi box-shadow 300ms), glow dalam
 * peach/orange di atas permukaan tile, ambient glow oranye di sekitar,
 * dan ripple halo sekali-jalan yang mengembang lalu memudar saat dipilih.
 * Label mendapat emphasis spring. Entrance staggered dengan settle rotasi.
 * Semua animasi transform/opacity (GPU-friendly), box-shadow hanya
 * transisi kelas; me-respect settings.animations + prefers-reduced-motion
 * (indikator pilihan tetap tampil tanpa animasi). Bentuk, ukuran, ekspresi,
 * susunan 4+3, warna dasar, dan mekanisme simpan mood tidak berubah.
 */

import { useRef, useState } from "react";
import { BookHeart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { m, useInView, type Transition } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { SPRING } from "@/lib/motion/system";
import { PressScale, useAnim } from "./motion-bits";
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

/** Pop pilihan — preset system.ts: dip scale 0.8 → spring SPRING.pop ke
 *  skala aktif 1.08 (dua nilai, satu segmen spring, overshoot alami). */
const POP_SCALE = [0.8, 1.08];
/** Ayunan tipis ±4° emot saat terpilih — satu segmen spring sehingga
 *  berayun overshoot lalu menetap (bukan loop). */
const SWAY_SPRING: Transition = { type: "spring", stiffness: 240, damping: 9 };
const SWAY_LEFT = [-4, 0];
const SWAY_RIGHT = [4, 0];

/** Glow dalam di atas permukaan tile — menyatu dengan ilustrasi emoji. */
function InnerGlow({ motionOK }: { motionOK: boolean }) {
  const cls =
    "pointer-events-none absolute inset-0 rounded-[25%] light:shadow-[inset_0_0_13px_rgba(var(--tk-brand-rgb),0.26),inset_0_1.5px_3px_rgba(255,224,204,0.6),inset_0_-5px_10px_-6px_rgba(var(--tk-brand-rgb),0.18)] dark:shadow-[inset_0_0_16px_rgba(var(--tk-emoji-glow-rgb),0.5),inset_0_1.5px_3px_rgba(255,255,255,0.28),inset_0_-6px_12px_-6px_rgba(var(--tk-emoji-glow-rgb),0.4)]";
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
  /** Gerbang animasi global: setelan "Animasi" aplikasi + prefers-reduced-motion. */
  const motionOK = useAnim();

  /** Emoji terakhir yang ditekan + penghitung, agar pop & ripple diputar ulang pada setiap tekan. */
  const [pulse, setPulse] = useState<{ id: MoodId; n: number } | null>(null);

  /* Smart pause: idle-bounce + glow emot adalah animasi composited
     (will-change) — saat strip mood tergulir keluar viewport, animasinya
     di-pause via .tk-anim-paused dan lanjut persis saat terlihat kembali.
     Karakter animasi tidak berubah; hanya tidak menghabiskan GPU
     di luar pandangan. */
  const stripRef = useRef<HTMLDivElement>(null);
  const stripInView = useInView(stripRef, { amount: 0.2 });

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

      <div
        ref={stripRef}
        role="radiogroup"
        aria-label="Pilih mood hari ini"
        className={cn("flex flex-col gap-2.5", !stripInView && "tk-anim-paused")}
      >
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
                        ? { scale: POP_SCALE }
                        : { scale: motionOK && active ? 1.08 : 1 }
                    }
                    transition={
                      popping && motionOK
                        ? { scale: SPRING.pop }
                        : { type: "spring", stiffness: 420, damping: 20 }
                    }
                    className={cn(
                      "relative flex rounded-[25%] transition-[box-shadow] duration-300",
                      active && "tk-mood-glow",
                      active
                        ? "ring-2 ring-tk-accent ring-offset-2 ring-offset-tk-stage light:shadow-[0_10px_22px_-8px_rgba(var(--tk-brand-rgb),0.45),0_3px_14px_-4px_rgba(var(--tk-brand-rgb),0.22)] dark:shadow-[0_10px_24px_-10px_rgba(var(--tk-brand-rgb),0.55),0_0_28px_-6px_rgba(var(--tk-emoji-glow-rgb),0.55)]"
                        : "light:shadow-[0_6px_14px_-6px_rgba(119,113,109,0.42)] light:ring-1 light:ring-[var(--tk-ring-ink)]/[0.06] dark:shadow-[0_10px_22px_-12px_rgba(12,6,2,0.6)] dark:ring-1 dark:ring-[var(--tk-hint)]/[0.07]"
                    )}
                  >
                    {/* Ikon merespon tekan: menyusut 0.92 sesaat lalu spring
                        kembali (PressScale, press 0.92). */}
                    <PressScale press={0.92} className="flex">
                      {/* Emot berayun tipis ±4° (satu segmen spring) saat
                          terpilih; arah bergantian tiap tekan agar terasa baru. */}
                      <m.span
                        aria-hidden
                        className="relative flex"
                        initial={false}
                        animate={{
                          rotate:
                            popping && motionOK
                              ? (pulse?.n ?? 0) % 2 === 0
                                ? SWAY_LEFT
                                : SWAY_RIGHT
                              : 0,
                        }}
                        transition={popping && motionOK ? SWAY_SPRING : { type: "spring", stiffness: 420, damping: 20 }}
                      >
                        <MoodFace id={mo.id} fx={active ? "float" : "none"} idle={!active} className="h-16 w-16" />
                      </m.span>
                    </PressScale>
                    {active ? <InnerGlow motionOK={motionOK} /> : null}
                    {/* Ripple halo sekali-jalan: outline oranye mengembang lalu memudar saat dipilih */}
                    {motionOK && active ? (
                      <m.span
                        key={`halo-${pulse?.n ?? 0}`}
                        aria-hidden
                        initial={{ opacity: 0.7, scale: 0.92 }}
                        animate={{ opacity: 0, scale: 1.38 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className="pointer-events-none absolute -inset-[6px] rounded-[27%] shadow-[0_0_0_1.5px_rgba(var(--tk-brand-rgb),0.5),0_0_22px_4px_rgba(var(--tk-brand-rgb),0.35)]"
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
