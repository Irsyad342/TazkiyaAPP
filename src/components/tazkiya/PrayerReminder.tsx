"use client";

/**
 * SUIO — Pengingat Salat Layar Penuh (fullscreen immersive).
 * Muncul dari mesin pemicu (reminder-trigger.ts) ketika waktu salat masuk.
 *
 * Atmosfer per salat (5 tema): Subuh = fajar biru-lavender, Zuhur = siang
 * gading-biru langit, Asar = emas senja, Magrib = sunset jingga-ungu,
 * Isya = malam indigo dengan bulan sabit & bintang. Semua tema memakai
 * siluet masjid + aksen orange SUIO.
 *
 * Kinerja (sengaja dijaga):
 * - Animasi HANYA transform & opacity (framer-motion m. + LazyMotion shell).
 * - Blur latar: SATU lapisan backdrop-filter yang di-fade sekali — tanpa
 *   animasi blur berkelanjutan.
 * - Elemen dekoratif berulang (bintang, awan) = CSS animation ringan, hanya
 *   berjalan saat [data-anim="on"] & prefers-reduced-motion mengizinkan,
 *   dan berhenti total saat overlay ditutup (unmount).
 * - Semua ilustrasi SVG/CSS inline — tanpa aset eksternal, tanpa canvas.
 *
 * Komponen murni tampilan: TIDAK mengubah status salat — pencatatan tetap
 * dilakukan pengguna lewat mekanisme existing (halaman Sholat).
 */

import { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";
import { CalendarDays, MoonStar, X } from "lucide-react";
import type { PrayerId } from "@/lib/tazkiya/types";
import { PRAYERS } from "@/lib/tazkiya/types";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { formatGregorian, formatHijri } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

/* ---------------- Konfigurasi atmosfer per salat ---------------- */

interface SceneTheme {
  /** Gradasi langit (atas → bawah). */
  sky: string;
  /** Teks konten: gelap (langit terang) atau terang (langit gelap). */
  tone: "dark" | "light";
  ink: string;
  sub: string;
  /** Matahari: posisi & warna; half = separuh di bawah horizon. */
  sun?: { top: string; left: string; size: number; core: string; glow: string; half?: boolean };
  /** Bulan sabit (isya jelas, subuh samar). */
  moon?: { opacity: number };
  /** Jumlah bintang (isya paling ramai). */
  stars?: number;
  /** Awan lembut. */
  clouds?: boolean;
  /** Cahaya horizon (fajar/senja). */
  horizonGlow?: string;
  /** Warna siluet masjid. */
  mosque: string;
  /** Strip tanah di bawah masjid. */
  ground: string;
}

const THEMES: Record<PrayerId, SceneTheme> = {
  subuh: {
    sky: "linear-gradient(180deg,#6E8FCB 0%,#9BA6DA 30%,#CBBBD3 55%,#EFC9A6 80%,#F7E6CE 100%)",
    tone: "dark",
    ink: "#2C2A3A",
    sub: "rgba(44,42,58,0.72)",
    sun: { top: "58%", left: "22%", size: 120, core: "rgba(255,236,200,0.9)", glow: "rgba(255,214,150,0.55)" },
    moon: { opacity: 0.25 },
    stars: 6,
    horizonGlow: "radial-gradient(60% 34% at 28% 66%, rgba(255,205,140,0.5), transparent 70%)",
    mosque: "#4E4668",
    ground: "#3E3854",
  },
  zuhur: {
    sky: "linear-gradient(180deg,#AECFE8 0%,#CFE2EE 38%,#EFE7D2 76%,#F6EFDE 100%)",
    tone: "dark",
    ink: "#33302B",
    sub: "rgba(51,48,43,0.7)",
    sun: { top: "14%", left: "64%", size: 132, core: "#FFE9AE", glow: "rgba(255,205,120,0.5)" },
    clouds: true,
    mosque: "#7E6C52",
    ground: "#6B5B44",
  },
  asar: {
    sky: "linear-gradient(180deg,#E19A45 0%,#EBAC5D 38%,#EBB37F 66%,#C98C55 100%)",
    tone: "dark",
    ink: "#3D2A14",
    sub: "rgba(61,42,20,0.72)",
    sun: { top: "34%", left: "70%", size: 150, core: "#FFE2A0", glow: "rgba(255,180,90,0.6)" },
    mosque: "#59371D",
    ground: "#472B16",
  },
  magrib: {
    sky: "linear-gradient(180deg,#4E3763 0%,#7C4868 32%,#B25540 62%,#E3864B 84%,#F2A961 100%)",
    tone: "light",
    ink: "#FFF3E4",
    sub: "rgba(255,243,228,0.78)",
    sun: { top: "52%", left: "56%", size: 160, core: "#FFC98F", glow: "rgba(255,150,80,0.55)", half: true },
    horizonGlow: "radial-gradient(64% 30% at 58% 62%, rgba(255,160,90,0.45), transparent 70%)",
    mosque: "#2E1B30",
    ground: "#241526",
  },
  isya: {
    sky: "linear-gradient(180deg,#131A38 0%,#1B2345 42%,#2A2549 68%,#46283C 90%,#5A3535 100%)",
    tone: "light",
    ink: "#F2E9DC",
    sub: "rgba(242,233,220,0.75)",
    moon: { opacity: 1 },
    stars: 16,
    horizonGlow: "radial-gradient(56% 26% at 50% 78%, rgba(255,138,74,0.22), transparent 72%)",
    mosque: "#0D1128",
    ground: "#0A0E20",
  },
};

/** Posisi bintang deterministik (tidak acak saat render → stabil & tanpa hydration issue). */
const STAR_POS = [
  { x: 12, y: 14 }, { x: 22, y: 30 }, { x: 31, y: 8 }, { x: 43, y: 22 }, { x: 52, y: 10 },
  { x: 61, y: 27 }, { x: 70, y: 12 }, { x: 78, y: 31 }, { x: 86, y: 17 }, { x: 92, y: 36 },
  { x: 8, y: 42 }, { x: 37, y: 40 }, { x: 57, y: 44 }, { x: 74, y: 47 }, { x: 89, y: 52 },
  { x: 27, y: 52 },
];

/** Siluet masjid lebar (garis horizon) — satu fill via currentColor. */
function MosqueSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden className={className}>
      {/* menara kiri & kanan */}
      <rect x="52" y="34" width="9" height="116" rx="3" fill="currentColor" />
      <path d="M56.5 18c6 7 7 12 0 18-7-6-6-11 0-18Z" fill="currentColor" />
      <circle cx="56.5" cy="15" r="1.8" fill="currentColor" />
      <rect x="339" y="34" width="9" height="116" rx="3" fill="currentColor" />
      <path d="M343.5 18c6 7 7 12 0 18-7-6-6-11 0-18Z" fill="currentColor" />
      <circle cx="343.5" cy="15" r="1.8" fill="currentColor" />
      {/* dinding samping */}
      <rect x="16" y="96" width="90" height="54" rx="2" fill="currentColor" />
      <path d="M25 96c0-12 9-19 14-19s14 7 14 19H25Z" fill="currentColor" opacity="0.85" />
      <path d="M69 96c0-12 9-19 14-19s14 7 14 19H69Z" fill="currentColor" opacity="0.85" />
      <rect x="294" y="96" width="90" height="54" rx="2" fill="currentColor" />
      <path d="M303 96c0-12 9-19 14-19s14 7 14 19h-28Z" fill="currentColor" opacity="0.85" />
      <path d="M347 96c0-12 9-19 14-19s14 7 14 19h-28Z" fill="currentColor" opacity="0.85" />
      {/* bangunan utama + pintu lengkung */}
      <rect x="106" y="76" width="188" height="74" rx="2" fill="currentColor" />
      <path d="M172 150v-30a28 28 0 0 1 56 0v30h-56Z" fill="#000" opacity="0.28" />
      {/* kubah utama (onion) + kemuncak */}
      <path d="M200 18c26 22 38 40 38 58h-76c0-18 12-36 38-58Z" fill="currentColor" />
      <path d="M200 18c-4-6-4-12 0-18 4 6 4 12 0 18Z" fill="currentColor" />
      <circle cx="200" cy="10" r="2.6" fill="currentColor" />
      {/* dua kubah kecil */}
      <path d="M136 52c13 11 19 20 19 29h-38c0-9 6-18 19-29Z" fill="currentColor" opacity="0.92" />
      <path d="M264 52c13 11 19 20 19 29h-38c0-9 6-18 19-29Z" fill="currentColor" opacity="0.92" />
      {/* jendela lengkung berbaris */}
      <g fill="#000" opacity="0.22">
        <path d="M122 112v-12a6 6 0 0 1 12 0v12h-12Z" />
        <path d="M144 112v-12a6 6 0 0 1 12 0v12h-12Z" />
        <path d="M244 112v-12a6 6 0 0 1 12 0v12h-12Z" />
        <path d="M266 112v-12a6 6 0 0 1 12 0v12h-12Z" />
      </g>
      {/* garis tanah */}
      <rect x="0" y="146" width="400" height="4" fill="currentColor" />
    </svg>
  );
}

/** Bulan sabit (SVG dua lingkaran). */
function CrescentMoon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className} style={style}>
      <path
        d="M44.8 6.4A26 26 0 1 0 57.6 38 20.4 20.4 0 0 1 44.8 6.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------------- Komponen ---------------- */

export function PrayerReminder({
  prayer,
  time,
  message,
  onClose,
  onGoSchedule,
  onGoRecord,
}: {
  prayer: PrayerId;
  time: string;
  message: string;
  onClose: () => void;
  onGoSchedule: () => void;
  onGoRecord: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const animationsOn = useWorshipAnimations();
  const motionOK = animationsOn && !reduceMotion;
  const t = THEMES[prayer];
  const label = PRAYERS.find((p) => p.id === prayer)?.label ?? prayer;

  const now = useMemo(() => new Date(), []);
  const hijri = useMemo(() => formatHijri(now), [now]);
  const stars = useMemo(() => STAR_POS.slice(0, t.stars ?? 0), [t.stars]);

  const base = motionOK
    ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }
    : { duration: 0 };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Pengingat waktu salat ${label}`}>
      {/* Lapisan blur aplikasi di belakang — satu lapisan, di-fade sekali */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: motionOK ? 0.4 : 0 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-xl"
        aria-hidden
      />

      {/* Panggung kolom aplikasi */}
      <div className="absolute inset-0 mx-auto w-full max-w-[430px] overflow-hidden">
        {/* Langit: muncul dari bawah dengan scale + fade */}
        <m.div
          initial={{ opacity: 0, y: 44, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={base}
          className="absolute inset-0"
          style={{ background: t.sky }}
        >
          {/* Cahaya horizon (fajar/senja) */}
          {t.horizonGlow ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...base, delay: motionOK ? 0.25 : 0 }}
              className="absolute inset-0"
              style={{ background: t.horizonGlow }}
              aria-hidden
            />
          ) : null}

          {/* Bintang — kelap-kelip CSS halus (hanya saat animasi diizinkan) */}
          {stars.map((s, i) => (
            <span
              key={i}
              aria-hidden
              className="tk-star absolute rounded-full"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
                background: t.tone === "light" ? "rgba(255,240,220,0.95)" : "rgba(255,255,255,0.8)",
                animationDelay: `${(i % 7) * 0.7}s`,
              }}
            />
          ))}

          {/* Bulan sabit */}
          {t.moon ? (
            <m.span
              aria-hidden
              initial={{ opacity: 0, y: -14, scale: 0.9 }}
              animate={{ opacity: t.moon.opacity, y: 0, scale: 1 }}
              transition={{ ...base, delay: motionOK ? 0.3 : 0 }}
              className={cn("absolute left-[10%] top-[7%]", animationsOn && "tk-float-slow")}
              style={{ color: t.tone === "light" ? "#F5E9C8" : "#FFF6DF" }}
            >
              <CrescentMoon className="h-14 w-14 drop-shadow-[0_0_18px_rgba(255,240,200,0.35)]" />
            </m.span>
          ) : null}

          {/* Matahari */}
          {t.sun ? (
            <m.span
              aria-hidden
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...base, delay: motionOK ? 0.2 : 0 }}
              className="absolute rounded-full"
              style={{
                top: t.sun.top,
                left: t.sun.left,
                width: t.sun.size,
                height: t.sun.size,
                transform: t.sun.half ? "translateY(50%)" : undefined,
                background: `radial-gradient(circle at 50% 50%, ${t.sun.core} 0%, ${t.sun.core} 42%, ${t.sun.glow} 62%, transparent 74%)`,
                boxShadow: `0 0 80px 24px ${t.sun.glow}`,
              }}
            />
          ) : null}

          {/* Awan lembut (zuhur) — dua pita blur yang mengapung sangat lambat */}
          {t.clouds ? (
            <>
              <span aria-hidden className="tk-cloud absolute left-[6%] top-[20%] h-10 w-40 rounded-full bg-white/35 blur-xl" />
              <span aria-hidden className="tk-cloud absolute right-[10%] top-[34%] h-8 w-28 rounded-full bg-white/28 blur-lg" style={{ animationDelay: "3s" }} />
            </>
          ) : null}

          {/* Siluet masjid + tanah — parallax ringan saat masuk */}
          <m.div
            aria-hidden
            initial={{ y: 34, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...base, delay: motionOK ? 0.32 : 0 }}
            className="absolute inset-x-0 bottom-0"
          >
            <div style={{ color: t.mosque }}>
              <MosqueSilhouette className="h-auto w-full" />
            </div>
            <div className="h-[max(18px,env(safe-area-inset-bottom))] w-full" style={{ background: t.ground }} />
          </m.div>
        </m.div>

        {/* Konten */}
        <div className="relative flex h-full flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.6rem,env(safe-area-inset-top))]">
          {/* Tombol tutup */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: motionOK ? 0.15 : 0, duration: 0.3 }}
            className="flex justify-end"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pengingat salat"
              className="tap flex h-11 w-11 items-center justify-center rounded-full transition-colors"
              style={{ background: t.tone === "light" ? "rgba(255,255,255,0.16)" : "rgba(30,25,20,0.14)", color: t.ink }}
            >
              <X size={20} />
            </button>
          </m.div>

          {/* Judul + nama salat — staggered fade */}
          <div className="mt-auto mb-auto flex flex-col items-center text-center">
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.35 : 0, duration: 0.5 }}
            >
              <span
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: t.tone === "light" ? "rgba(255,255,255,0.18)" : "rgba(255,90,0,0.14)", color: t.tone === "light" ? "#FFD9BC" : "#E04E00" }}
              >
                <MoonStar size={22} strokeWidth={1.7} />
              </span>
            </m.div>
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.45 : 0, duration: 0.5 }}
              className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.22em]"
              style={{ color: t.sub }}
            >
              Telah Masuk Waktu Salat
            </m.p>
            <m.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.55 : 0, duration: 0.55 }}
              className="gs-display mt-1.5 text-[46px] font-bold leading-none tracking-[-0.02em]"
              style={{ color: t.ink }}
            >
              {label}
            </m.h1>
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.68 : 0, duration: 0.5 }}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
              style={{ background: "rgba(255,90,0,0.16)", color: t.tone === "light" ? "#FFC59B" : "#C63F00" }}
            >
              <span className="tnum text-[13px] font-bold">Masuk pukul {time}</span>
            </m.div>
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.78 : 0, duration: 0.5 }}
              className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11.5px] font-medium"
              style={{ color: t.sub }}
            >
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {formatGregorian(now)}
              </span>
              {hijri ? <span className="font-semibold">{hijri}</span> : null}
            </m.div>
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.88 : 0, duration: 0.5 }}
              className="mt-5 max-w-[300px] text-[13.5px] font-medium leading-relaxed"
              style={{ color: t.ink }}
            >
              {message}
            </m.p>
          </div>

          {/* Tombol aksi — muncul setelah konten utama */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: motionOK ? 1.02 : 0, duration: 0.5 }}
            className="flex flex-col gap-2.5"
          >
            <button
              type="button"
              onClick={onGoRecord}
              className="tap min-h-[50px] w-full rounded-full bg-[#FF5A00] font-display text-[14.5px] font-bold text-white shadow-[0_14px_34px_-12px_rgba(255,90,0,0.55)] transition-transform active:scale-[0.985]"
            >
              Catat Salat {label}
            </button>
            <button
              type="button"
              onClick={onGoSchedule}
              className="tap min-h-[46px] w-full rounded-full font-display text-[13.5px] font-bold transition-colors"
              style={{
                background: t.tone === "light" ? "rgba(255,255,255,0.16)" : "rgba(30,25,20,0.12)",
                color: t.ink,
              }}
            >
              Lihat Jadwal Salat
            </button>
          </m.div>
        </div>
      </div>
    </div>
  );
}

function useWorshipAnimations(): boolean {
  return useWorshipStore((s) => s.settings.animations);
}
