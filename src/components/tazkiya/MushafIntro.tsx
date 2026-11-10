"use client";

/**
 * SUIO MUSHAF OPENING EXPERIENCE — intro membuka mushaf sebelum Masuk Mode.
 * Urutan (±1.05 s): latar pudar → sampul mushaf minimalis (logo SUIO halus)
 * → sampul membuka 3D (rotateY, origin jilid kanan, khas buku Arab) → dua
 * halaman ivory mulai terlihat → bayangan kertas → crossfade ke mushaf.
 * Murni transform + opacity (ringan). Reduced motion / animasi mati →
 * fade sederhana tanpa animasi 3D. Suara kertas sangat lembut bila
 * pengaturan suara halaman aktif. Dapat dilewati dengan sekali ketuk.
 */

import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { playPageFlip } from "@/lib/tazkiya/page-sound";

const DUR_COVER = 0.78; // sampul membuka
const DUR_FADE = 0.3; // crossfade ke mushaf

export function MushafIntro({
  surahName,
  animated,
  pageSound,
  onDone,
}: {
  surahName: string;
  animated: boolean;
  pageSound: boolean;
  onDone: () => void;
}) {
  const controls = useAnimationControls();
  const wrapControls = useAnimationControls();
  const doneRef = useRef(false);
  const finished = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!animated) {
        // Reduced motion: fade singkat tanpa animasi pembukaan.
        await wrapControls.start({ opacity: [1, 0], transition: { duration: 0.24, ease: "easeOut" } });
        if (alive) finished();
        return;
      }
      // Sampul muncul halus, lalu membuka seperti buku fisik.
      await controls.start({
        opacity: 1,
        scale: [0.965, 1],
        transition: { duration: 0.26, ease: "easeOut" },
      });
      if (pageSound) playPageFlip(0.16);
      await controls.start({
        rotateY: -172,
        transition: { duration: DUR_COVER, ease: [0.34, 0.68, 0.28, 1] },
      });
      await wrapControls.start({ opacity: 0, transition: { duration: DUR_FADE, ease: "easeOut" } });
      if (alive) finished();
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <motion.div
      className="mushaf-intro"
      animate={wrapControls}
      onClick={finished}
      role="presentation"
      style={{ cursor: "pointer" }}
      aria-label="Membuka mushaf"
    >
      {/* Panggung buku: dua halaman ivory (tampak saat sampul terbuka) */}
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: animated ? 0.4 : 0 }} className="relative w-[min(88vw,560px)]">
        <div className="relative mx-auto aspect-[1.42/1] w-full">
          <div className="absolute inset-y-2 left-[2px] right-1/2 rounded-l-xl border border-[#e2d7c3] bg-[#fbf8f0] shadow-[0_18px_44px_-20px_rgba(60,40,10,0.5)]" />
          <div className="absolute inset-y-2 left-1/2 right-[2px] rounded-r-xl border border-[#e2d7c3] bg-[#f7f3e9] shadow-[0_18px_44px_-20px_rgba(60,40,10,0.5)]" />
          <div aria-hidden className="absolute inset-y-2 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-[rgba(70,52,20,0.16)] to-transparent" />
          {/* Sampul: membuka rotateY pada jilid kanan (buku Arab) */}
          <motion.div
            className="mushaf-intro-cover absolute inset-0"
            style={{ transformOrigin: "right center" }}
            initial={{ rotateY: 0, opacity: 0 }}
            animate={controls}
          >
            <div className="mushaf-intro-face absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-[#3d2f1c] bg-gradient-to-br from-[#2a2118] via-[#221a12] to-[#191309] shadow-[0_18px_44px_-18px_rgba(20,14,4,0.7)]">
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#c9a25e]/50 bg-[#c9a25e]/12 text-[#e6c684]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H11v16H6.5A2.5 2.5 0 0 0 4 17.5v-11Z" />
                  <path d="M20 6.5A2.5 2.5 0 0 0 17.5 4H13v16h4.5A2.5 2.5 0 0 1 20 17.5v-11Z" />
                </svg>
              </span>
              <span className="gs-display text-[20px] font-extrabold tracking-[0.32em] text-[#e9d3a4]">SUIO</span>
              <span className="h-px w-14 bg-[#c9a25e]/45" aria-hidden />
              <span className="quran-arabic text-[15px] leading-none text-[#d9bd8b]">ٱلْقُرْآنُ ٱلْكَرِيمُ</span>
              {surahName ? (
                <span className="absolute bottom-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b39d72]">{surahName}</span>
              ) : null}
            </div>
          </motion.div>
        </div>
        <p className="mt-6 text-center text-[10.5px] font-medium text-tk-muted">Ketuk untuk melanjutkan…</p>
      </motion.div>
    </motion.div>
  );
}
