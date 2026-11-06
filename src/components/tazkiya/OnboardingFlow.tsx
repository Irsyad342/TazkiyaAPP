"use client";

/**
 * SUIO v15 — Onboarding premium "editorial" (redesign penuh, 7 layar).
 *
 * Alur: 5 slide fitur → pemilihan tema → layar selamat datang final.
 * Gaya: mockup smartphone besar berisi pratinjau antarmuka asli, kartu
 * antarmuka melayang berlapis, tipografi editorial besar dengan kata
 * beraksen oranye, whitespace terukur, pola geometri Islami samar.
 * Palet resmi v15 — light #F7F5F2/#FFFFFF/#FF5A00/peach #FFE0CC,
 * dark #171717/#24211F/#302925/#FF5A00/peach #EFC4A8 (bukan inversi;
 * permukaan hangat charcoal-brown dengan sorotan oranye terkendali).
 *
 * Animasi (framer-motion LazyMotion domAnimation, hanya transform+opacity):
 * - Ponsel: fade + scale + rotasi menetap dengan spring natural.
 * - Kartu melayang: masuk berurutan dengan jeda berbeda + float CSS
 *   compositor (tk-ob-card-float) yang berhenti di slide nonaktif
 *   (section[data-live="false"]) dan saat prefers-reduced-motion /
 *   pengaturan animasi dimatikan (lihat globals.css).
 * - Parallax ringan antara latar, ponsel, dan kartu saat pindah slide.
 * - Transisi slide: geser horizontal (spring) + fade + stagger teks per
 *   kata (masked rise) + indikator pil beranimasi.
 * - Hitungan statistik count-up hanya di slide aktif; abaikan gerak bila
 *   prefers-reduced-motion atau data-anim="off".
 * - Layar final: entrance logo (scale+rotate menetap, halo cincin) →
 *   lockup → tagline → CTA tampil setelah visual selesai masuk.
 *
 * Navigasi: swipe/pointer, panah keyboard, tombol Lanjut/Kembali,
 * Lewati (→ /auth), indikator dapat diklik. Desktop ≥900px: komposisi
 * dua kolom (teks kiri, visual kanan), bukan tata letak ponsel yang
 * diperlebar.
 *
 * Tema: Light/Terang, Dark/Gelap, Sistem (mengikuti prefers-color-scheme
 * secara langsung) — dipersist lewat mekanisme pengaturan existing
 * (useWorshipStore.updateSettings) sehingga TIDAK ikut terreset saat
 * logout (logout hanya menghapus flag onboarding).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { SuioMark } from "@/components/tazkiya/brand";
import { Star8 } from "@/components/tazkiya/ornaments";
import {
  FinalArt,
  GoodnessArt,
  JourneyArt,
  PrayerArt,
  QuranArt,
  ThemePreviewArt,
  WelcomeArt,
  type ThemeModeOpt,
} from "@/components/tazkiya/onboarding-art";
import { useWorshipStore } from "@/lib/tazkiya/store";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Warna kanvas per tema — sinkron dengan CANVAS di app/onboarding/page.tsx. */
const CANVAS = { dark: "#171717", light: "#F7F5F2" } as const;

/** Segmen judul editorial: a = kata beraksen oranye. */
type Seg = { t: string; a?: boolean };

type Slide = {
  segs: Seg[];
  description: string;
  Art?: (p: { live: boolean; index: number }) => React.ReactNode;
  /** Susunan mobile: "art-top" (visual dulu) atau "text-top". */
  layout?: "art-top" | "text-top";
  /** Tanpa blok teks standar (slide tema memakai deskripsi ringkas di atas opsi). */
  kind?: "feature" | "theme" | "final";
};

const SLIDES: Slide[] = [
  {
    segs: [
      { t: "Ibadah Lebih " },
      { t: "Teratur,", a: true },
      { t: " Hidup Lebih " },
      { t: "Bermakna.", a: true },
    ],
    description:
      "Mulai perjalanan ibadah yang lebih terarah bersama SUIO. Bangun kebiasaan baik melalui langkah kecil setiap hari.",
    Art: WelcomeArt,
    layout: "art-top",
    kind: "feature",
  },
  {
    segs: [{ t: "Jaga " }, { t: "Waktu,", a: true }, { t: " Jaga " }, { t: "Istiqamah.", a: true }],
    description: "Pantau jadwal salat lima waktu dan catat perkembangan ibadahmu dengan lebih teratur.",
    Art: PrayerArt,
    layout: "text-top",
    kind: "feature",
  },
  {
    segs: [{ t: "Dekat dengan " }, { t: "Al Qur'an,", a: true }, { t: " Setiap Hari." }],
    description:
      "Temani perjalananmu dengan membaca Al Qur'an, mengingat Allah, dan membangun rutinitas zikir.",
    Art: QuranArt,
    layout: "text-top",
    kind: "feature",
  },
  {
    segs: [{ t: "Setiap " }, { t: "Kebaikan", a: true }, { t: " Punya Arti." }],
    description:
      "Catat amal, kebaikan, rizki, dan rasa syukur untuk menjaga setiap langkah positif dalam hidupmu.",
    Art: GoodnessArt,
    layout: "text-top",
    kind: "feature",
  },
  {
    segs: [{ t: "Lihat Perjalanan Baikmu " }, { t: "Bertumbuh.", a: true }],
    description:
      "Pantau perkembangan ibadah dan rayakan setiap kemajuan kecil yang membawamu menuju istiqamah.",
    Art: JourneyArt,
    layout: "text-top",
    kind: "feature",
  },
  {
    segs: [{ t: "Sesuaikan " }, { t: "Tampilanmu", a: true }],
    description: "Pilih tema yang paling nyaman di mata — bisa diubah kapan saja dari halaman Profil.",
    kind: "theme",
  },
  {
    segs: [{ t: "Mulai " }, { t: "Perjalananmu", a: true }, { t: " Bersama SUIO." }],
    description: "Jadikan setiap waktu lebih bermakna dengan kebiasaan ibadah yang teratur.",
    layout: "art-top",
    kind: "final",
  },
];

/* Varian animasi teks: stagger per elemen, judul naik dari balik topeng. */
const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
};
const wordRise = {
  hidden: { y: "118%" },
  show: { y: "0%", transition: { duration: 0.6, ease: EASE } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export function OnboardingFlow({
  initialThemeMode,
  onDone,
}: {
  /** Mode tema awal mentah ("light" | "dark" | "system") dari pengaturan tersimpan. */
  initialThemeMode: ThemeModeOpt;
  onDone: (target: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<ThemeModeOpt>(initialThemeMode);

  /* Resolusi tema: "system" mengikuti preferensi perangkat secara langsung. */
  const resolve = useCallback((mv: ThemeModeOpt) => {
    if (mv === "system") {
      try {
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      } catch {
        return "dark";
      }
    }
    return mv;
  }, []);
  const [resolved, setResolved] = useState<"dark" | "light">(() => resolve(initialThemeMode));

  /* Entrance sekali di awal. */
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  /* Pilih tema: flip data-theme seluruh halaman (kanvas bertransisi lewat
     CSS), simpan ke mekanisme pengaturan yang sudah ada ("system" dipersist
     apa adanya), dan sinkronkan warna bilah status. Preferensi bertahan
     meski pengguna logout. */
  const pickTheme = useCallback(
    (mv: ThemeModeOpt) => {
      setMode(mv);
      const r = resolve(mv);
      setResolved(r);
      document.documentElement.dataset.theme = r;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", CANVAS[r]);
      useWorshipStore.getState().updateSettings({ theme: mv });
    },
    [resolve]
  );

  /* Mode "system": ikuti perubahan preferensi perangkat selama di sini. */
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => pickTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, pickTheme]);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= SLIDES.length) return;
      setIndex(next);
    },
    [index]
  );

  /* Panah keyboard (desktop). */
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

  /* Blok teks editorial satu slide (judul per kata + deskripsi). */
  const slideText = (s: Slide, active: boolean) => (
    <m.div
      variants={textContainer}
      initial="hidden"
      animate={active ? "show" : "hidden"}
      className="flex w-full flex-col items-center text-center min-[900px]:items-start min-[900px]:text-left"
    >
      <h1
        className={`font-display font-extrabold tracking-[-0.03em] light:text-[#202020] dark:text-[#F7F3EF] transition-colors duration-500 ${
          s.kind === "final"
            ? "text-[27px] leading-[1.14] min-[900px]:text-[40px]"
            : "text-[26px] leading-[1.16] min-[900px]:text-[38px] min-[900px]:leading-[1.08]"
        }`}
      >
        {s.segs.map((seg, si) => (
          <span key={si} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <m.span variants={wordRise} className={`inline-block ${seg.a ? "text-[#FF5A00]" : ""}`}>
              {seg.t}
              {si < s.segs.length - 1 ? "\u00A0" : ""}
            </m.span>
          </span>
        ))}
      </h1>
      <m.p
        variants={fadeUp}
        className="mt-3.5 max-w-[310px] text-[13px] leading-[1.75] light:text-[#77716D] dark:text-[#B5AAA3] transition-colors duration-500 min-[900px]:max-w-[400px] min-[900px]:text-[14.5px]"
      >
        {s.description}
      </m.p>
    </m.div>
  );

  /* Panggung visual satu slide. */
  const slideArt = (s: Slide, active: boolean) => {
    if (s.kind === "theme") {
      return (
        <div className="flex w-full max-w-[360px] flex-col min-[900px]:max-w-[420px]">
          <ThemePreviewArt selected={mode} onSelect={pickTheme} live={active} />
        </div>
      );
    }
    if (s.kind === "final") return <FinalArt live={active} />;
    const Art = s.Art!;
    return <Art live={active} index={index} />;
  };

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <main
          className="relative h-dvh w-full overflow-hidden bg-[#F7F5F2] transition-colors duration-500 dark:bg-[#171717]"
          aria-label="Perkenalan SUIO"
        >
          <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden transition-colors duration-500 min-[900px]:h-full min-[900px]:max-w-[1180px]">
            {/* ---------- Latar: blob hangat + pola khatam, parallax antar slide ----------
                Div biasa + transition CSS (compositor) — tanpa node framer-motion. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div
                className="absolute -right-[90px] -top-[90px] h-[300px] w-[300px] rounded-full will-change-transform"
                style={{
                  background: "radial-gradient(circle, rgba(255,154,82,0.30), transparent 66%)",
                  transform: `translate(${-index * 26}px, ${index * 12}px)`,
                  transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div
                className="absolute -bottom-[86px] -left-[94px] h-[270px] w-[270px] rounded-full will-change-transform"
                style={{
                  background: "radial-gradient(circle, rgba(255,90,0,0.13), transparent 66%)",
                  transform: `translateX(${index * 22}px)`,
                  transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div
                className="absolute left-[18%] top-[32%] h-[180px] w-[180px] rounded-full will-change-transform"
                style={{
                  background: "radial-gradient(circle, rgba(255,224,204,0.55), transparent 64%)",
                  transform: `translateY(${-index * 18}px)`,
                  transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div
                className="absolute bottom-[26%] right-[8%] hidden h-[150px] w-[150px] rounded-full will-change-transform min-[900px]:block"
                style={{
                  background: "radial-gradient(circle, rgba(239,196,168,0.30), transparent 64%)",
                  transform: `translate(${-index * 14}px, ${index * 8}px)`,
                  transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <div className="tk-ob-pattern absolute inset-x-0 top-0 h-[240px] opacity-[0.045] dark:opacity-[0.06]" />
              <Star8
                size={19}
                className="tk-ob-float absolute left-[8%] top-[13%] text-[#FF5A00]/30 dark:text-[#FF9A52]/40"
              />
              <Star8
                size={12}
                className="tk-ob-float tk-ob-float-delay absolute right-[10%] top-[36%] text-[#FF5A00]/25 dark:text-[#FF9A52]/30"
              />
              <span className="tk-ob-float tk-ob-float-delay absolute bottom-[20%] right-[19%] h-2.5 w-2.5 rounded-full border-[1.5px] border-[#FF5A00]/30 dark:border-[#FF9A52]/35" />
              <span className="tk-ob-float absolute bottom-[30%] left-[12%] h-2 w-2 rounded-full bg-[#FF5A00]/25 dark:bg-[#FF9A52]/30" />
            </div>

            {/* ---------- Kepala: branding + Lewati ---------- */}
            <m.header
              initial={{ opacity: 0, y: -10 }}
              animate={entered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: EASE }}
              className="relative z-10 flex items-center justify-between px-5 pt-[max(0.9rem,env(safe-area-inset-top))] min-[900px]:px-14 min-[900px]:pt-6"
            >
              <div className="flex items-center gap-2.5">
                <m.span
                  initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                  animate={entered ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                  transition={{ type: "spring", stiffness: 260, damping: 19, delay: 0.08 }}
                  className="inline-flex will-change-transform"
                >
                  {/* Logo resmi: varian terang/gelap otomatis via SuioMark */}
                  <SuioMark size={36} />
                </m.span>
                <div>
                  <p className="font-display text-[15px] font-extrabold leading-none tracking-[0.06em] light:text-[#202020] dark:text-[#F7F3EF] transition-colors duration-500">
                    SUIO
                  </p>
                  <p className="mt-[5px] text-[8px] font-semibold uppercase leading-none tracking-[0.2em] light:text-[#77716D] dark:text-[#B5AAA3]">
                    Sujud in Order
                  </p>
                </div>
              </div>
              {!last && (
                <button
                  type="button"
                  onClick={() => onDone("/auth")}
                  className="tap rounded-full border px-3.5 py-2 text-[11.5px] font-bold transition-colors light:border-[#202020]/10 light:bg-white/70 light:text-[#77716D] dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-[#B5AAA3] light:hover:text-[#202020] dark:hover:text-[#F7F3EF]"
                >
                  Lewati
                </button>
              )}
            </m.header>

            {/* ---------- Panggung slide ---------- */}
            <div
              className="no-scrollbar relative z-10 min-h-0 flex-1 overflow-hidden"
              style={{ touchAction: "pan-y" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <m.div
                className="flex h-full w-[700%]"
                animate={{ x: `${(-index * 100) / 7}%` }}
                transition={{ type: "spring", stiffness: 280, damping: 32, mass: 0.9 }}
              >
                {SLIDES.map((s, i) => {
                  const active = i === index;
                  const isThemeSlide = s.kind === "theme";
                  const isFinal = s.kind === "final";
                  const artTop = s.layout === "art-top";
                  return (
                    <section
                      key={i}
                      aria-hidden={!active}
                      inert={!active}
                      data-live={active}
                      aria-roledescription="slide"
                      aria-label={`Layar ${i + 1} dari ${SLIDES.length}`}
                      className="flex h-full w-[calc(100%/7)] flex-col justify-center px-6 min-[900px]:grid min-[900px]:grid-cols-[1.02fr_1fr] min-[900px]:items-center min-[900px]:gap-10 min-[900px]:px-14"
                    >
                      {/* Mobile: kolom visual + teks (urutan per slide); Desktop ≥900px:
                          wrapper "contents" → teks kiri (order-1), visual kanan (order-2). */}
                      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 min-[900px]:contents">
                        <m.div
                          initial={{ opacity: 0 }}
                          animate={active ? { opacity: 1 } : { opacity: 0.35 }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className={`w-full ${
                            isThemeSlide || isFinal
                              ? "flex min-h-0 flex-1 items-center justify-center"
                              : `flex h-[clamp(288px,52dvh,500px)] shrink-0 items-center justify-center min-[900px]:h-[560px]`
                          } ${artTop ? "order-1 min-[900px]:order-2" : "order-2 min-[900px]:order-2"}`}
                        >
                          {slideArt(s, active)}
                        </m.div>
                        <div
                          className={`w-full max-w-[360px] shrink-0 min-[900px]:mt-0 min-[900px]:max-w-none ${
                            artTop ? "order-2 mt-1 min-[900px]:order-1" : "order-1 min-[900px]:order-1"
                          }`}
                        >
                          {slideText(s, active)}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </m.div>
            </div>

            {/* ---------- Kaki: indikator + navigasi ---------- */}
            <m.footer
              initial={{ opacity: 0, y: 16 }}
              animate={entered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
              className="relative z-10 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] min-[900px]:px-14 min-[900px]:pb-7"
            >
              <div className="min-[900px]:mx-auto min-[900px]:flex min-[900px]:w-full min-[900px]:max-w-[1080px] min-[900px]:items-center min-[900px]:justify-between min-[900px]:gap-8">
                {/* Indikator halaman: pil beranimasi */}
                <div className="mb-4 flex items-center justify-center gap-2 min-[900px]:mb-0" role="tablist" aria-label="Progres onboarding">
                  {SLIDES.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Layar ${i + 1} dari ${SLIDES.length}`}
                      onClick={() => go(i)}
                      className="py-2"
                    >
                      <span
                        className={`block h-[6px] rounded-full transition-all duration-300 ease-out ${
                          i === index ? "w-[26px] bg-[#FF5A00]" : "w-[6px] light:bg-[#202020]/15 dark:bg-white/[0.14]"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Navigasi mobile: Kembali + Lanjut */}
                <div className="flex items-center gap-2.5 min-[900px]:hidden">
                  {index > 0 && (
                    <m.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      onClick={() => go(index - 1)}
                      aria-label="Kembali"
                      className="tap flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border light:border-[#202020]/12 light:bg-white/80 light:text-[#202020] dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-[#F7F3EF]"
                    >
                      <ChevronLeft size={19} />
                    </m.button>
                  )}
                  {last ? (
                    <m.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onDone("/auth?mode=register")}
                      className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5A00] font-display text-[14.5px] font-bold text-white"
                      style={{ boxShadow: "0 18px 40px -16px rgba(255,90,0,0.55)" }}
                    >
                      Mulai Sekarang
                      <ArrowRight size={17} />
                    </m.button>
                  ) : (
                    <m.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => go(index + 1)}
                      className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5A00] font-display text-[14.5px] font-bold text-white"
                      style={{ boxShadow: "0 18px 40px -16px rgba(255,90,0,0.55)" }}
                    >
                      Lanjut
                      <ArrowRight size={17} />
                    </m.button>
                  )}
                </div>

                {/* Navigasi desktop: Kembali + CTA + Masuk di kanan */}
                <div className="hidden items-center gap-3 min-[900px]:flex">
                  {!last && (
                    <p className="mr-2 text-[12.5px] light:text-[#77716D] dark:text-[#B5AAA3]">
                      Sudah punya akun?{" "}
                      <button type="button" onClick={() => onDone("/auth")} className="tap font-bold text-[#FF5A00]">
                        Masuk
                      </button>
                    </p>
                  )}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => go(index - 1)}
                      aria-label="Kembali"
                      className="tap flex h-[48px] w-[48px] items-center justify-center rounded-full border light:border-[#202020]/12 light:bg-white/80 light:text-[#202020] dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-[#F7F3EF]"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <m.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => (last ? onDone("/auth?mode=register") : go(index + 1))}
                    className="flex h-[48px] w-[230px] items-center justify-center gap-2 rounded-full bg-[#FF5A00] font-display text-[14px] font-bold text-white"
                    style={{ boxShadow: "0 18px 40px -16px rgba(255,90,0,0.55)" }}
                  >
                    {last ? "Mulai Sekarang" : "Lanjut"}
                    <ArrowRight size={16} />
                  </m.button>
                </div>
              </div>

              {/* Baris masuk (mobile, hanya layar final; tinggi dicadangkan agar tidak lompat) */}
              <div className="mt-3 flex h-5 items-center justify-center min-[900px]:hidden">
                {last && (
                  <m.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="text-[12px] light:text-[#77716D] dark:text-[#B5AAA3]"
                  >
                    Sudah punya akun?{" "}
                    <button type="button" onClick={() => onDone("/auth")} className="tap font-bold text-[#FF5A00]">
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
