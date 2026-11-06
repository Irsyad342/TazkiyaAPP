"use client";

/**
 * SUIO v13 — Onboarding premium "floating interface" (5 layar).
 *
 * Konsep: kartu antarmuka asli aplikasi yang melayang (rotasi kecil,
 * bayangan lembut, kecepatan float berbeda), latar lavender/oranye yang
 * bergeser parallax antar slide, tipografi besar bertahap, whitespace
 * terukur. Dua tema penuh (charbone gelap, warm-white terang) mengikuti
 * data-theme mekanisme aplikasi.
 *
 * Animasi (framer-motion, LazyMotion domAnimation):
 * - Entrance: branding → ilustrasi → judul per kata (masked rise) →
 *   deskripsi → indikator & tombol, berurutan sekali di awal.
 * - Slide: trek geser horizontal (spring) + parallax latar berlapis +
 *   ilustrasi nonaktif bergeser melawan arah (kedalaman).
 * - Float: kartu ilustrasi naik-turun dan berotasi ringan, tempo antar
 *   kartu berbeda — via animasi CSS compositor (hemat main-thread di
 *   ponsel) dan hanya berjalan pada slide aktif (lihat Float di
 *   onboarding-art).
 * - Interaksi: whileTap CTA, indikator pil beranimasi, swipe/pointer,
 *   panah keyboard, tombol Lewati.
 * - prefers-reduced-motion dihormati via MotionConfig reducedMotion="user";
 *   dekorasi CSS (tk-ob-*) dimatikan oleh globals.css.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SuioMark } from "@/components/tazkiya/brand";
import { Star8 } from "@/components/tazkiya/ornaments";
import { WelcomeArt, IbadahArt, QuranArt, BarakahArt, FinalArt, ThemePreviewArt } from "@/components/tazkiya/onboarding-art";
import { useWorshipStore } from "@/lib/tazkiya/store";

const EASE = [0.22, 1, 0.36, 1] as const;

const SLIDES = [
  {
    headline: "Lebih Teratur, Lebih Bermakna",
    description:
      "Mulai bangun kebiasaan ibadah yang lebih konsisten. Temani setiap langkah kebaikanmu bersama SUIO.",
    Art: WelcomeArt,
  },
  {
    headline: "Jaga Ibadah Setiap Hari",
    description:
      "Kelola jadwal salat dan pantau kebiasaan ibadah harian agar setiap aktivitas lebih terarah.",
    Art: IbadahArt,
  },
  {
    headline: "Dekatkan Diri dengan Kebaikan",
    description:
      "Temukan pengalaman membaca Al-Qur'an, mencatat zikir, dan menjaga rutinitas ibadah dengan lebih mudah.",
    Art: QuranArt,
  },
  {
    headline: "Setiap Kebaikan Berarti",
    description: "Catat amal, kebaikan, rasa syukur, dan perjalanan ibadahmu dalam satu tempat.",
    Art: BarakahArt,
  },
  {
    headline: "Mulai Perjalananmu Bersama SUIO",
    description: "Langkah kecil yang dilakukan dengan konsisten dapat menjadi perjalanan yang berarti.",
    Art: FinalArt,
  },
  {
    headline: "Choose Your Experience",
    description: "Sesuaikan tampilan SUIO dengan kenyamananmu. Pilih tampilan terang atau gelap sesuai preferensimu.",
    Art: null, // slide pemilihan tema — digambar ThemePreviewArt
  },
] as const;

/** Warna kanvas per tema (sinkron dengan CANVAS di app/onboarding/page.tsx). */
const CANVAS = { dark: "#131217", light: "#f4f2f7" } as const;

/* Varian animasi teks: stagger per elemen, judul naik dari balik topeng. */
const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const wordRise = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.55, ease: EASE } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function OnboardingFlow({
  initialTheme,
  onDone,
}: {
  /** Tema awal (dari pengaturan tersimpan atau preferensi sistem). */
  initialTheme: "dark" | "light";
  onDone: (target: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [entered, setEntered] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

  /* Entrance sekali di awal: header → ilustrasi → teks → footer. */
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  /* Pilih tema: flip data-theme seluruh halaman (kanvas bertransisi
     lewat CSS), simpan ke mekanisme pengaturan yang sudah ada, dan
     sinkronkan warna bilah status. Preferensi ini bertahan meski
     pengguna logout. */
  const pickTheme = useCallback((t: "dark" | "light") => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", CANVAS[t]);
    useWorshipStore.getState().updateSettings({ theme: t });
  }, []);

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

  const last = index === SLIDES.length - 1;

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <main
          className="relative h-dvh w-full overflow-hidden bg-[#131217] transition-colors duration-500 light:bg-[#f4f2f7]"
          aria-label="Perkenalan SUIO"
        >
          <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#131217] transition-colors duration-500 light:bg-[#f4f2f7] desktop:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_40px_90px_-40px_rgba(0,0,0,0.55)] desktop:light:shadow-[0_0_0_1px_rgba(23,20,40,0.06),0_40px_90px_-40px_rgba(40,30,80,0.25)]">

            {/* ---------- Latar: blob lavender + oranye, parallax antar slide ----------
                Div biasa + transition CSS (compositor) — tanpa node framer-motion. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div
                className="absolute -right-[88px] -top-[88px] h-[290px] w-[290px] rounded-full will-change-transform"
                style={{
                  background: "radial-gradient(circle, rgba(139,124,248,0.2), transparent 66%)",
                  transform: `translate(${-index * 26}px, ${index * 12}px)`,
                  transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div
                className="absolute -bottom-[84px] -left-[92px] h-[260px] w-[260px] rounded-full will-change-transform"
                style={{
                  background: "radial-gradient(circle, rgba(250,82,0,0.14), transparent 66%)",
                  transform: `translateX(${index * 22}px)`,
                  transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div
                className="absolute left-[16%] top-[30%] h-[170px] w-[170px] rounded-full will-change-transform"
                style={{
                  background: "radial-gradient(circle, rgba(139,124,248,0.1), transparent 64%)",
                  transform: `translateY(${-index * 18}px)`,
                  transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div className="tk-ob-pattern absolute inset-x-0 top-0 h-[220px] light:opacity-[0.035] dark:opacity-[0.05]" />
              <Star8
                size={19}
                className="tk-ob-float absolute left-[8%] top-[13%] text-[#FA5200]/25 light:text-[#FA5200]/30"
              />
              <Star8 size={12} className="tk-ob-float tk-ob-float-delay absolute right-[10%] top-[36%] text-[#8b7cf8]/35" />
              <span className="tk-ob-float tk-ob-float-delay absolute bottom-[20%] right-[19%] h-2.5 w-2.5 rounded-full border-[1.5px] border-[#8b7cf8]/40" />
              <span className="tk-ob-float absolute bottom-[30%] left-[12%] h-2 w-2 rounded-full bg-[#FA5200]/25" />
            </div>

            {/* ---------- Kepala: branding + Lewati ---------- */}
            <m.header
              initial={{ opacity: 0, y: -10 }}
              animate={entered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: EASE }}
              className="relative z-10 flex items-center justify-between px-5 pt-[max(0.9rem,env(safe-area-inset-top))]"
            >
              <div className="flex items-center gap-2.5">
                <SuioMark size={36} />
                <div>
                  <p className="font-display text-[15px] font-extrabold leading-none tracking-[0.06em] text-white transition-colors duration-500 light:text-[#17171b]">
                    SUIO
                  </p>
                  <p className="mt-[5px] text-[8px] font-semibold uppercase leading-none tracking-[0.2em] text-[#a5a1b3] light:text-[#9a96a5]">
                    Sujud in Order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDone("/auth")}
                className="tap rounded-full border px-3.5 py-2 text-[11.5px] font-bold text-[#a5a1b3] transition-colors light:border-[#e4e0ee] light:bg-white/70 light:text-[#7a7686] dark:border-white/[0.09] dark:bg-white/[0.04] hover:text-white light:hover:text-[#17171b]"
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
                className="flex h-full w-[600%]"
                animate={{ x: `${(-index * 100) / 6}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 33, mass: 0.9 }}
              >
                {SLIDES.map((s, i) => {
                  const active = i === index;
                  return (
                    <section
                      key={s.headline}
                      aria-hidden={!active}
                      data-live={active}
                      className="flex h-full w-1/6 flex-col items-center justify-center px-7"
                    >
                      {/* Ilustrasi: fade + scale + geser melawan arah (parallax) */}
                      <m.div
                        initial={{ opacity: 0, scale: 0.94, x: "0%" }}
                        animate={
                          active
                            ? { opacity: 1, scale: 1, x: "0%" }
                            : { opacity: 0.35, scale: 0.96, x: dir > 0 ? "7%" : "-7%" }
                        }
                        transition={{ duration: 0.6, ease: EASE }}
                        className="flex h-[clamp(200px,32dvh,258px)] w-full items-center justify-center"
                      >
                        {s.Art ? <s.Art live={active} /> : <ThemePreviewArt selected={theme} onSelect={pickTheme} />}
                      </m.div>

                      {/* Teks: stagger per kata saat slide aktif */}
                      <m.div
                        variants={textContainer}
                        initial="hidden"
                        animate={active ? "show" : "hidden"}
                        className="mt-6 flex w-full flex-col items-center text-center"
                      >
                        <h1 className="text-[27px] font-extrabold leading-[1.16] tracking-[-0.025em] text-white transition-colors duration-500 light:text-[#1b1922]">
                          {s.headline.split(" ").map((w, wi) => (
                            <span key={wi} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                              <m.span variants={wordRise} className="inline-block">
                                {w}
                                {wi < s.headline.split(" ").length - 1 ? "\u00A0" : ""}
                              </m.span>
                            </span>
                          ))}
                        </h1>
                        <m.p
                          variants={fadeUp}
                          className="mt-3.5 max-w-[300px] text-[13px] leading-[1.75] text-[#aba7b6] transition-colors duration-500 light:text-[#5f5b6b]"
                        >
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
              initial={{ opacity: 0, y: 16 }}
              animate={entered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
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
                    aria-label={`Layar ${i + 1} dari ${SLIDES.length}`}
                    onClick={() => go(i)}
                    className="py-2"
                  >
                    <span
                      className={`block h-[6px] rounded-full transition-all duration-300 ease-out ${
                        i === index ? "w-[26px] bg-[#FA5200]" : "w-[6px] bg-[#3a3745] light:bg-[#dcd7ea]"
                      }`}
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
                <ArrowRight size={17} />
                {last ? "Continue" : "Lanjut"}
              </m.button>

              {/* Baris masuk, hanya di layar pemilihan tema; tinggi dicadangkan agar tidak lompat */}
              <div className="mt-3 flex h-5 items-center justify-center">
                {last && (
                  <m.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="text-[12px] text-[#a5a1b3] transition-colors duration-500 light:text-[#7a7686]"
                  >
                    Sudah punya akun?{" "}
                    <button type="button" onClick={() => onDone("/auth")} className="tap font-bold text-[#ff6b26] light:text-[#e04a00]">
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
