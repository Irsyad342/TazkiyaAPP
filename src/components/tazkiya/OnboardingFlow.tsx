"use client";

/**
 * Tazkiya — Alur onboarding 3 layar (v12).
 *
 * Identitas visual tetap milik v7: kanvas off-white #F2F2F4, oranye #FA5200,
 * General Sans, pil tombol bulat, kartu membulat, khatam. Onboarding selalu
 * tampil dalam identitas terang — layar sambutan, bukan bagian tema.
 *
 * Animasi (framer-motion, fitur domAnimation yang sudah dipakai aplikasi):
 * - Entrance: logo & kerangka fade-up, judul muncul per kata (masked rise),
 *   deskripsi menyusul, ilustrasi fade + scale.
 * - Slide: trek geser horizontal (spring) + teks per-slide mengulang
 *   stagger, ilustrasi mengejar dengan parallax ringan.
 * - Interaksi: swipe/pointer, tombol panah, whileTap pada CTA, indikator
 *   pil beranimasi, Lewati berfungsi.
 * - prefers-reduced-motion dihormati via MotionConfig reducedMotion="user"
 *   dan keyframes CSS dimatikan di globals.css.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { OnboardingBackdrop, BarakahArt, IbadahArt, JourneyArt } from "@/components/tazkiya/onboarding-art";

const EASE = [0.22, 1, 0.36, 1] as const;

const SLIDES = [
  {
    headline: "Mulai Perjalanan Ibadahmu",
    description:
      "Bangun kebiasaan ibadah yang lebih terarah dan bermakna. Mulai dari langkah kecil, untuk perjalanan yang lebih baik setiap hari.",
    Art: JourneyArt,
  },
  {
    headline: "Jaga Setiap Waktu Ibadah",
    description:
      "Pantau jadwal salat, catat progres ibadah, dan bangun konsistensi dalam menjalankan aktivitas harian.",
    Art: IbadahArt,
  },
  {
    headline: "Setiap Kebaikan Berarti",
    description:
      "Catat perjalanan membaca Al-Qur'an, kebaikan harian, zikir, dan rasa syukur dalam satu perjalanan yang bermakna.",
    Art: BarakahArt,
  },
];

/* Varian animasi teks: stagger per elemen, judul naik dari balik topeng. */
const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.06 } },
};
const wordRise = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.55, ease: EASE } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export function OnboardingFlow({ onDone }: { onDone: (target: string) => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= SLIDES.length) return;
      setDir(next > index ? 1 : -1);
      setIndex(next);
    },
    [index]
  );

  /* Panah keyboard (desktop) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  /* Swipe: maksud horizontal ditentukan dari delta awal, commit di lepas. */
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const horizontal = useRef<boolean | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tracking.current = true;
    horizontal.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture opsional */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!tracking.current || horizontal.current !== null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) horizontal.current = Math.abs(dx) > Math.abs(dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!tracking.current) return;
    tracking.current = false;
    if (horizontal.current) {
      const dx = e.clientX - startX.current;
      if (dx <= -48) go(index + 1);
      else if (dx >= 48) go(index - 1);
    }
    horizontal.current = null;
  };

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <main className="relative h-dvh w-full overflow-hidden bg-[#E8E8EC]" aria-label="Perkenalan Tazkiya">
          <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#F2F2F4] desktop:shadow-[0_0_0_1px_#E0E0E6,0_40px_90px_-40px_rgba(0,0,0,0.35)]">
            <OnboardingBackdrop />

            {/* ---------- Kepala: branding + Lewati ---------- */}
            <m.header
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="relative z-10 flex items-center justify-between px-5 pt-[max(0.9rem,env(safe-area-inset-top))]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[0.95rem] text-lg font-bold text-white"
                  style={{ background: "#FA5200", boxShadow: "0 10px 24px -12px rgba(250,82,0,0.65)" }}
                >
                  ت
                </div>
                <div>
                  <p className="text-[15px] font-extrabold leading-none tracking-[-0.01em] text-[#17171B]">Tazkiya</p>
                  <p className="mt-[5px] text-[8px] font-semibold uppercase leading-none tracking-[0.16em] text-[#9A9AA2]">
                    A Better Daily Journey
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDone("/")}
                className="tap rounded-full border border-[#E7E7EC] bg-white/85 px-3.5 py-2 text-[11.5px] font-bold text-[#7A7A83] transition-colors hover:text-[#17171B]"
              >
                Lewati
              </button>
            </m.header>

            {/* ---------- Panggung slide ---------- */}
            <div
              className="no-scrollbar relative z-10 flex-1 overflow-hidden"
              style={{ touchAction: "pan-y" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <m.div
                className="flex h-full w-[300%]"
                animate={{ x: `${(-index * 100) / 3}%` }}
                transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
              >
                {SLIDES.map((s, i) => {
                  const active = i === index;
                  return (
                    <section
                      key={s.headline}
                      aria-hidden={!active}
                      className="flex h-full w-1/3 flex-col items-center justify-center px-7"
                    >
                      {/* Ilustrasi: fade + scale, mengejar slide (parallax ringan) */}
                      <m.div
                        initial={{ opacity: 0, scale: 0.92, x: "0%" }}
                        animate={
                          active
                            ? { opacity: 1, scale: 1, x: "0%" }
                            : { opacity: 0.4, scale: 0.96, x: dir > 0 ? "6%" : "-6%" }
                        }
                        transition={{ duration: 0.55, ease: EASE }}
                        className="flex h-[clamp(188px,31dvh,248px)] w-full items-center justify-center"
                      >
                        <s.Art />
                      </m.div>

                      {/* Teks: stagger per kata saat slide aktif */}
                      <m.div
                        variants={textContainer}
                        initial="hidden"
                        animate={active ? "show" : "hidden"}
                        className="mt-5 flex w-full flex-col items-center text-center"
                      >
                        <h1 className="text-[26px] font-extrabold leading-[1.16] tracking-[-0.025em] text-[#17171B]">
                          {s.headline.split(" ").map((w, wi) => (
                            <span key={wi} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                              <m.span variants={wordRise} className="inline-block">
                                {w}
                                {wi < s.headline.split(" ").length - 1 ? "\u00A0" : ""}
                              </m.span>
                            </span>
                          ))}
                        </h1>
                        <m.p variants={fadeUp} className="mt-3 max-w-[300px] text-[13px] leading-[1.7] text-[#5F5F68]">
                          {s.description}
                        </m.p>
                      </m.div>
                    </section>
                  );
                })}
              </m.div>
            </div>

            {/* ---------- Kaki: indikator + CTA ---------- */}
            <m.footer
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
              className="relative z-10 px-6 pb-[max(1.1rem,env(safe-area-inset-bottom))]"
            >
              {/* Indikator halaman: pil beranimasi */}
              <div className="mb-5 flex items-center justify-center gap-2" role="tablist" aria-label="Progres onboarding">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.headline}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Layar ${i + 1}`}
                    onClick={() => go(i)}
                    className="py-2"
                  >
                    <span
                      className="block h-[6px] rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: i === index ? 26 : 6,
                        background: i === index ? "#FA5200" : "#DFDFE5",
                      }}
                    />
                  </button>
                ))}
              </div>

              <m.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => (last ? onDone("/auth?mode=register") : go(index + 1))}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FA5200] font-display text-[14.5px] font-bold text-white"
                style={{ boxShadow: "0 18px 40px -16px rgba(250,82,0,0.55)" }}
              >
                {last ? <Sparkles size={17} /> : <ArrowRight size={17} />}
                {last ? "Mulai Sekarang" : "Lanjut"}
              </m.button>

              {/* Baris masuk — hanya di layar akhir; tinggi dicadangkan agar tidak lompat */}
              <div className="mt-3 flex h-5 items-center justify-center">
                {last && (
                  <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-[12px] text-[#7A7A83]">
                    Sudah punya akun?{" "}
                    <button type="button" onClick={() => onDone("/auth")} className="tap font-bold text-[#E04A00]">
                      Masuk
                    </button>
                  </m.p>
                )}
              </div>
            </m.footer>
          </div>
        </main>
      </LazyMotion>
    </MotionConfig>
  );
}
