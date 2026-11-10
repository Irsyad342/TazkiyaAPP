"use client";

/**
 * SUIO — Pengingat Salat Layar Penuh V2 (atmosferik, terinspirasi komposisi
 * Goals Journal: lanskap berlapis, siluet, cahaya sinematik — diadaptasi ke
 * identitas SUIO, bukan salinan).
 *
 * Komposisi berlapis per waktu salat (bukan gradient polos):
 *   langit → pendar horizon → bintang → bulan/matahari + sinar → awan →
 *   burung → bukit jauh → bukit tengah (+pohon Asar) → air + kilau →
 *   siluet masjid (+jendela menyala) → tanah → partikel cahaya.
 * Setiap layer punya warna & kehadiran berbeda per salat sehingga kelima
 * waktu terasa sebagai dunia yang berbeda, bukan ganti warna.
 *
 * Tipografi: kicker kecil ber-tracking lebar, headline serif display
 * (Fraunces, var --font-pr) dengan swash elegan, chip waktu, deskripsi.
 *
 * Kinerja (dijaga ketat):
 * - Animasi masuk HANYA transform & opacity (framer-motion `m.` + LazyMotion).
 * - Animasi berulang (bintang, awan, napas cahaya, kilau, partikel, burung)
 *   = CSS keyframes sangat lambat, hanya berjalan saat setelan animasi aktif
 *   & reduced-motion tidak diminta, dan berhenti total saat overlay unmount.
 * - Blur latar: SATU lapisan backdrop-filter di-fade sekali (tanpa animasi
 *   blur berkelanjutan). Tanpa canvas, tanpa video, tanpa aset gambar.
 * - Semua posisi dekoratif deterministik (tanpa Math.random saat render).
 *
 * Komponen murni tampilan: TIDAK mengubah status salat — "Catat Salat"
 * membuka mekanisme pencatatan existing (dialog di halaman Sholat), status
 * tetap dipilih pengguna.
 */

import { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";
import type { PrayerId } from "@/lib/tazkiya/types";
import { PRAYERS } from "@/lib/tazkiya/types";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { formatGregorian, formatHijri } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

/* ===================== Konfigurasi atmosfer ===================== */

interface SceneTheme {
  /** Gradasi langit (atas → bawah). */
  sky: string;
  /** Teks di atas langit: gelap (langit terang) atau terang (langit gelap). */
  tone: "dark" | "light";
  ink: string;
  sub: string;
  /** Pendar lembut di sekitar sumber cahaya / horizon. */
  glow?: { at: string; bg: string };
  sun?: { top: string; left: string; size: number; core: string; glow: string; rays?: string };
  moon?: { top: string; left: string; size: number; opacity: number; glow?: string };
  stars?: number;
  clouds?: { count: number; color: string };
  birds?: number;
  motes?: { count: number; color: string; opacity: number };
  farHill: string;
  midHill: string;
  trees?: boolean;
  water?: { color: string; glint: string; at: string };
  mosque: string;
  ground: string;
  /** Warna jendela masjid menyala (Magrib & Isya). */
  windows?: string;
}

const THEMES: Record<PrayerId, SceneTheme> = {
  /* SUBUH — The First Light: fajar lavender-biru, matahari peach merambat
     naik dari horizon, sisa bintang memudar, kabut tipis di bukit jauh. */
  subuh: {
    sky: "linear-gradient(180deg,#5F7FBE 0%,#93A0D8 26%,#C7B4D9 48%,#EFC9A4 74%,#FBEAD1 100%)",
    tone: "dark",
    ink: "#2E2B44",
    sub: "rgba(46,43,68,0.74)",
    glow: { at: "26% 64%", bg: "radial-gradient(62% 34% at 26% 64%, rgba(255,205,140,0.5), transparent 70%)" },
    sun: { top: "54%", left: "18%", size: 112, core: "rgba(255,238,205,0.95)", glow: "rgba(255,196,130,0.5)", rays: "#FFE3BD" },
    moon: { top: "9%", left: "76%", size: 40, opacity: 0.3 },
    stars: 7,
    clouds: { count: 2, color: "rgba(255,235,225,0.4)" },
    birds: 3,
    farHill: "#7B74A8",
    midHill: "#5F5890",
    mosque: "#453E66",
    ground: "#37314F",
  },
  /* ZUHUR — The Bright Moment: siang cerah gading-biru langit, matahari
     putih-emas tinggi, awan putih mengapung, siluet hangat. */
  zuhur: {
    sky: "linear-gradient(180deg,#A6CBE6 0%,#CDE2EF 34%,#F0E8D2 72%,#F7F0DF 100%)",
    tone: "dark",
    ink: "#343028",
    sub: "rgba(52,48,40,0.72)",
    glow: { at: "70% 26%", bg: "radial-gradient(46% 30% at 70% 26%, rgba(255,242,200,0.55), transparent 72%)" },
    sun: { top: "18%", left: "64%", size: 118, core: "#FFF3CF", glow: "rgba(255,214,130,0.55)", rays: "#FFF6DE" },
    clouds: { count: 3, color: "rgba(255,255,255,0.55)" },
    farHill: "#C9BE9C",
    midHill: "#A99A78",
    mosque: "#7E6A4D",
    ground: "#6E5C42",
  },
  /* ASAR — The Golden Hour: emas sore yang jatuh ke bumi, matahari besar
     rendah, pepohonan berbayangan panjang, debu cahaya mengambang. */
  asar: {
    sky: "linear-gradient(180deg,#DE9440 0%,#EBA95A 36%,#EDB87E 64%,#D19255 100%)",
    tone: "dark",
    ink: "#3D2812",
    sub: "rgba(61,40,18,0.74)",
    glow: { at: "68% 52%", bg: "radial-gradient(58% 34% at 68% 52%, rgba(255,190,110,0.55), transparent 70%)" },
    sun: { top: "32%", left: "62%", size: 148, core: "#FFE7A3", glow: "rgba(255,166,74,0.6)", rays: "#FFD79A" },
    clouds: { count: 2, color: "rgba(255,224,180,0.42)" },
    motes: { count: 7, color: "#FFE2AE", opacity: 0.65 },
    farHill: "#B5793B",
    midHill: "#8A5526",
    trees: true,
    mosque: "#4A2C13",
    ground: "#3B230F",
  },
  /* MAGRIB — The Last Light: matahari tenggelam ke laut, horizon coral,
     awan peach-ungu, jendela masjid mulai menyala, pantulan berkilau. */
  magrib: {
    sky: "linear-gradient(180deg,#3F2A57 0%,#6C3F63 30%,#A34A4E 56%,#DE7A46 80%,#F4A45E 100%)",
    tone: "light",
    ink: "#FFF1E0",
    sub: "rgba(255,241,224,0.78)",
    glow: { at: "55% 56%", bg: "radial-gradient(64% 32% at 55% 56%, rgba(255,150,86,0.5), transparent 70%)" },
    sun: { top: "40%", left: "49%", size: 150, core: "#FFC98F", glow: "rgba(255,138,74,0.55)", rays: "#FFB583" },
    stars: 4,
    clouds: { count: 3, color: "rgba(255,190,160,0.4)" },
    birds: 2,
    motes: { count: 6, color: "#FFC9A0", opacity: 0.55 },
    farHill: "#6E3A55",
    midHill: "#472343",
    water: { color: "linear-gradient(180deg, rgba(244,164,94,0.34) 0%, rgba(110,58,85,0.42) 100%)", glint: "#FFC48F", at: "53%" },
    mosque: "#241226",
    ground: "#1B0E1E",
    windows: "#FFB36B",
  },
  /* ISYA — The Quiet Night: malam indigo dalam, bulan sabit berpendar,
     bintang berkelap-kelip, jendela masjid hangat, air tenang. */
  isya: {
    sky: "linear-gradient(180deg,#0E1430 0%,#172041 38%,#262951 66%,#3A2C4E 86%,#4E3140 100%)",
    tone: "light",
    ink: "#EFE7DA",
    sub: "rgba(239,231,218,0.76)",
    moon: { top: "7%", left: "18%", size: 52, opacity: 1, glow: "rgba(255,240,200,0.4)" },
    stars: 18,
    clouds: { count: 1, color: "rgba(120,130,190,0.16)" },
    motes: { count: 4, color: "#FFD9A8", opacity: 0.45 },
    farHill: "#1D2447",
    midHill: "#141A35",
    water: { color: "linear-gradient(180deg, rgba(90,110,180,0.22) 0%, rgba(20,26,53,0.5) 100%)", glint: "#C9D4F2", at: "22%" },
    mosque: "#0B1028",
    ground: "#080D1F",
    windows: "#FFB36B",
  },
};

/** Teks pengingat per salat (headline & deskripsi sesuai arahan desain). */
const COPY: Record<PrayerId, { headline: string; desc: string }> = {
  subuh: {
    headline: "Fajar Telah Menyapa",
    desc: "Waktu Subuh telah tiba. Awali hari dengan mengingat Allah dan menunaikan salat.",
  },
  zuhur: {
    headline: "Sejenak Berhenti, Kembali Mengingat-Nya",
    desc: "Waktu Zuhur telah tiba. Luangkan waktu di tengah aktivitas untuk menunaikan salat.",
  },
  asar: {
    headline: "Jaga Langkah Baikmu",
    desc: "Waktu Asar telah tiba. Tetap jaga konsistensi ibadah di tengah kesibukan.",
  },
  magrib: {
    headline: "Sambut Senja dengan Ibadah",
    desc: "Waktu Magrib telah tiba. Luangkan waktu untuk menunaikan salat dan mensyukuri hari ini.",
  },
  isya: {
    headline: "Tutup Hari dengan Ketenangan",
    desc: "Waktu Isya telah tiba. Akhiri hari dengan mengingat Allah dan menunaikan salat.",
  },
};

/* ---------- Posisi dekoratif deterministik ---------- */

const STAR_POS = [
  { x: 12, y: 14 }, { x: 22, y: 30 }, { x: 31, y: 8 }, { x: 43, y: 22 }, { x: 52, y: 10 },
  { x: 61, y: 27 }, { x: 70, y: 12 }, { x: 78, y: 31 }, { x: 86, y: 17 }, { x: 92, y: 36 },
  { x: 8, y: 42 }, { x: 37, y: 40 }, { x: 57, y: 44 }, { x: 74, y: 47 }, { x: 89, y: 52 },
  { x: 27, y: 52 }, { x: 47, y: 6 }, { x: 66, y: 38 },
];

const MOTE_POS = [
  { x: 18, y: 58 }, { x: 30, y: 66 }, { x: 44, y: 60 }, { x: 58, y: 70 },
  { x: 68, y: 56 }, { x: 78, y: 66 }, { x: 88, y: 60 },
];

const BIRD_POS = [
  { x: 14, y: 20, s: 13 },
  { x: 24, y: 27, s: 10 },
  { x: 33, y: 16, s: 8 },
];

const CLOUD_POS = [
  { x: 8, y: 18, w: 150, h: 38 },
  { x: 58, y: 30, w: 110, h: 30 },
  { x: 30, y: 44, w: 90, h: 26 },
];

/* ===================== Ilustrasi SVG ===================== */

/** Siluet masjid lebar yang rapi: kubah bawahan besar, dua kubah kecil,
    dua menara berunjungan, sayap berarka, pintu lengkung — satu fill. */
function MosqueSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" fill="none" aria-hidden className={className}>
      {/* Menara kiri */}
      <rect x="56" y="34" width="9" height="116" rx="3" fill="currentColor" />
      <rect x="52" y="56" width="17" height="4" rx="2" fill="currentColor" />
      <rect x="52" y="63" width="17" height="3" rx="1.5" fill="currentColor" opacity="0.9" />
      <path d="M60.5 20c7 8 8 13 0 20-8-7-7-12 0-20Z" fill="currentColor" />
      <circle cx="60.5" cy="16" r="2" fill="currentColor" />
      {/* Menara kanan */}
      <rect x="335" y="34" width="9" height="116" rx="3" fill="currentColor" />
      <rect x="331" y="56" width="17" height="4" rx="2" fill="currentColor" />
      <rect x="331" y="63" width="17" height="3" rx="1.5" fill="currentColor" opacity="0.9" />
      <path d="M339.5 20c7 8 8 13 0 20-8-7-7-12 0-20Z" fill="currentColor" />
      <circle cx="339.5" cy="16" r="2" fill="currentColor" />
      {/* Sayap kiri berarka */}
      <rect x="18" y="100" width="86" height="50" rx="2" fill="currentColor" />
      <path d="M26 100v-8c0-8 6-13 12-13s12 5 12 13v8H26Z" fill="currentColor" opacity="0.88" />
      <path d="M56 100v-8c0-8 6-13 12-13s12 5 12 13v8H56Z" fill="currentColor" opacity="0.88" />
      {/* Sayap kanan berarka */}
      <rect x="296" y="100" width="86" height="50" rx="2" fill="currentColor" />
      <path d="M304 100v-8c0-8 6-13 12-13s12 5 12 13v8h-24Z" fill="currentColor" opacity="0.88" />
      <path d="M334 100v-8c0-8 6-13 12-13s12 5 12 13v8h-24Z" fill="currentColor" opacity="0.88" />
      {/* Bangunan utama */}
      <rect x="106" y="84" width="188" height="66" rx="2" fill="currentColor" />
      {/* Pintu lengkung (dipakai juga sebagai titik pendar jendela) */}
      <path d="M176 150v-26a24 24 0 0 1 48 0v26h-48Z" fill="#000" opacity="0.3" />
      {/* Dua kubah kecil */}
      <path d="M138 56c12 10 18 19 18 28h-36c0-9 6-18 18-28Z" fill="currentColor" opacity="0.94" />
      <path d="M262 56c12 10 18 19 18 28h-36c0-9 6-18 18-28Z" fill="currentColor" opacity="0.94" />
      {/* Kubah utama bawahan + kemuncak bulan sabit */}
      <path d="M200 16c24 20 36 38 36 56h-72c0-18 12-36 36-56Z" fill="currentColor" />
      <path d="M200 16c-3-6-3-11 0-16 3 5 3 10 0 16Z" fill="currentColor" />
      <circle cx="200" cy="9" r="2.4" fill="currentColor" />
      {/* Garis tanah */}
      <rect x="0" y="147" width="400" height="3" fill="currentColor" />
    </svg>
  );
}

/** Jendela masjid menyala — dirender terpisah agar hanya muncul di tema
    yang memilikinya (Magrib & Isya). */
function MosqueWindows({ color }: { color: string }) {
  const arch = "M0 0v-10a5 5 0 0 1 10 0v10H0Z";
  const xs = [128, 146, 244, 262];
  return (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" fill="none" aria-hidden className="absolute inset-0 h-full w-full">
      {xs.map((x) => (
        <path key={x} d={arch} transform={`translate(${x} 132)`} fill={color} opacity="0.85" />
      ))}
      {/* Pendar hangat dari pintu */}
      <ellipse cx="200" cy="146" rx="26" ry="7" fill={color} opacity="0.4" />
    </svg>
  );
}

/** Bulan sabit. */
function CrescentMoon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className} style={style}>
      <path d="M44.8 6.4A26 26 0 1 0 57.6 38 20.4 20.4 0 0 1 44.8 6.4Z" fill="currentColor" />
    </svg>
  );
}

/** Bukit berlapis (far/mid) — wave lembut selebar layar. */
function HillLayer({ color, far, className }: { color: string; far?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden className={className}>
      {far ? (
        <path d="M0 34 C 50 20 110 24 160 32 C 220 42 280 20 340 28 C 370 32 390 30 400 26 V70 H0 Z" fill={color} />
      ) : (
        <path d="M0 40 C 60 24 130 30 200 38 C 270 46 330 30 400 38 V70 H0 Z" fill={color} />
      )}
    </svg>
  );
}

/** Pepohonan untuk Asar — palem + pohon bulat, siluet di bukit tengah. */
function TreeStrip({ color, className }: { color: string; className?: string }) {
  const palm = (x: number, s: number) => (
    <g key={`p${x}`} transform={`translate(${x} 44) scale(${s})`} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      <path d="M0 26 C 1 16 1 8 0 0" />
      <path d="M0 0 C -6 -4 -11 -4 -15 -1" />
      <path d="M0 0 C -4 -6 -8 -8 -13 -8" />
      <path d="M0 0 C 1 -7 4 -10 8 -12" />
      <path d="M0 0 C 6 -4 11 -3 14 1" />
      <path d="M0 0 C 5 -1 9 1 12 5" />
    </g>
  );
  const round = (x: number, s: number) => (
    <g key={`r${x}`} transform={`translate(${x} 46) scale(${s})`} fill={color}>
      <rect x="-1.6" y="6" width="3.2" height="18" rx="1.4" />
      <circle cx="0" cy="2" r="9" />
      <circle cx="-6" cy="7" r="6" />
      <circle cx="6" cy="7" r="6" />
    </g>
  );
  return (
    <svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden className={className}>
      {palm(48, 0.9)}
      {round(110, 0.85)}
      {palm(300, 1.05)}
      {round(352, 0.8)}
    </svg>
  );
}

/** Burung kecil (dua goresan sayap). */
function Bird({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 20 8" fill="none" aria-hidden className={className} style={style}>
      <path d="M1 6 C 4 1.5 7 1.5 10 5 C 13 1.5 16 1.5 19 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Sinar matahari: 12 bilah tipis memancar — dirotasi sangat lambat via CSS. */
function SunRays({ color, className }: { color: string; className?: string }) {
  const blades = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="-100 -100 200 200" fill="none" aria-hidden className={className}>
      {blades.map((deg) => (
        <path
          key={deg}
          d="M -3 -34 L 0 -92 L 3 -34 Z"
          fill={color}
          opacity="0.16"
          transform={`rotate(${deg})`}
        />
      ))}
    </svg>
  );
}

/** Swash dekoratif di bawah headline — goresan elegan khas referensi. */
function Flourish({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 14" fill="none" aria-hidden className={className} style={style}>
      <path
        d="M5 9 C 30 2.5, 56 2.5, 80 7 C 93 9.5, 105 8.5, 112 4.5 C 114 3.2, 114.5 2, 113.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/* ===================== Komponen utama ===================== */

export function PrayerReminder({
  prayer,
  time,
  next,
  onClose,
  onGoSchedule,
  onGoRecord,
}: {
  prayer: PrayerId;
  time: string;
  /** Salat berikutnya (dari mesin pemicu) untuk chip informasi. */
  next?: { id: PrayerId; time: string; tomorrow?: boolean };
  onClose: () => void;
  onGoSchedule: () => void;
  onGoRecord: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const motionOK = animationsOn && !reduceMotion;
  const t = THEMES[prayer];
  const copy = COPY[prayer];
  const label = PRAYERS.find((p) => p.id === prayer)?.label ?? prayer;
  const nextLabel = next ? PRAYERS.find((p) => p.id === next.id)?.label : undefined;

  const now = useMemo(() => new Date(), []);
  const hijri = useMemo(() => formatHijri(now), [now]);
  const stars = useMemo(() => STAR_POS.slice(0, t.stars ?? 0), [t.stars]);
  const clouds = useMemo(() => CLOUD_POS.slice(0, t.clouds?.count ?? 0), [t.clouds]);
  const birds = useMemo(() => BIRD_POS.slice(0, t.birds ?? 0), [t.birds]);
  const motes = useMemo(() => (t.motes ? MOTE_POS.slice(0, t.motes.count) : []), [t.motes]);

  const base = motionOK ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } : { duration: 0 };
  const chipBg = t.tone === "light" ? "rgba(255,255,255,0.16)" : "rgba(46,38,28,0.14)";
  const chipColor = t.tone === "light" ? "#FFE4C4" : t.ink;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Pengingat waktu salat ${label}`}>
      {/* Lapisan blur aplikasi di belakang — satu lapisan, di-fade sekali */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: motionOK ? 0.4 : 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-xl"
        aria-hidden
      />

      {/* Panggung kolom aplikasi */}
      <div className="absolute inset-0 mx-auto w-full max-w-[430px] overflow-hidden">
        {/* ============ LANSKAP (semua layer, murni dekoratif) ============ */}
        <m.div
          initial={{ opacity: 0, y: 44, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={base}
          className="absolute inset-0"
          style={{ background: t.sky }}
        >
          {/* Pendar horizon / sekitar sumber cahaya */}
          {t.glow ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...base, delay: motionOK ? 0.25 : 0 }}
              className="absolute inset-0"
              style={{ background: t.glow.bg }}
              aria-hidden
            />
          ) : null}

          {/* Bintang — kelap-kelip CSS halus */}
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
                background: t.tone === "light" ? "rgba(255,240,220,0.95)" : "rgba(255,255,255,0.85)",
                opacity: t.tone === "dark" ? 0.5 : undefined,
                animationDelay: `${(i % 7) * 0.7}s`,
              }}
            />
          ))}

          {/* Bulan sabit */}
          {t.moon ? (
            <m.span
              aria-hidden
              initial={{ opacity: 0, y: -14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...base, delay: motionOK ? 0.3 : 0 }}
              className={cn("absolute", animationsOn && "tk-float-slow")}
              style={{
                left: t.moon.left,
                top: t.moon.top,
                opacity: t.moon.opacity,
                color: "#F5E9C8",
                filter: t.moon.glow ? `drop-shadow(0 0 ${t.moon.size * 0.5}px ${t.moon.glow})` : undefined,
              }}
            >
              <CrescentMoon style={{ width: t.moon.size, height: t.moon.size }} />
            </m.span>
          ) : null}

          {/* Sinar matahari (rotasi sangat lambat) + Matahari (napas cahaya) */}
          {t.sun ? (
            <>
              {t.sun.rays ? (
                <m.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ ...base, delay: motionOK ? 0.35 : 0 }}
                  className={cn("absolute", animationsOn && "pr-rays")}
                  style={{ left: t.sun.left, top: t.sun.top, width: t.sun.size * 2.6, height: t.sun.size * 2.6, marginLeft: -t.sun.size * 1.3, marginTop: -t.sun.size * 1.3 }}
                >
                  <SunRays color={t.sun.rays} className="h-full w-full" />
                </m.div>
              ) : null}
              <m.span
                aria-hidden
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...base, delay: motionOK ? 0.2 : 0 }}
                className={cn("absolute rounded-full", animationsOn && "pr-breathe")}
                style={{
                  top: t.sun.top,
                  left: t.sun.left,
                  width: t.sun.size,
                  height: t.sun.size,
                  marginLeft: -t.sun.size / 2,
                  marginTop: -t.sun.size / 2,
                  background: `radial-gradient(circle at 50% 50%, ${t.sun.core} 0%, ${t.sun.core} 42%, ${t.sun.glow} 62%, transparent 74%)`,
                  boxShadow: `0 0 90px 26px ${t.sun.glow}`,
                }}
              />
            </>
          ) : null}

          {/* Awan lembut mengapung sangat lambat */}
          {clouds.map((c, i) => (
            <span
              key={i}
              aria-hidden
              className={cn("absolute rounded-full blur-xl", animationsOn && "pr-cloud")}
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                width: c.w,
                height: c.h,
                background: t.clouds?.color,
                // @ts-expect-error custom property untuk durasi per elemen
                "--pr-dur": `${50 + i * 14}s`,
                animationDelay: `${i * -12}s`,
              }}
            />
          ))}

          {/* Burung melintas perlahan */}
          {birds.map((b, i) => (
            <span
              key={i}
              aria-hidden
              className={cn("absolute", animationsOn && "pr-bird")}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                color: t.tone === "light" ? "rgba(255,241,224,0.66)" : "rgba(46,43,68,0.5)",
                // @ts-expect-error custom property untuk durasi per elemen
                "--pr-dur": `${34 + i * 9}s`,
                animationDelay: `${i * -8}s`,
              }}
            >
              <Bird style={{ width: b.s * 1.6, height: b.s * 0.64 }} />
            </span>
          ))}

          {/* Bukit jauh — parallax paling halus (tinggi masjid = lebar kolom × 0.375) */}
          <m.div
            aria-hidden
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...base, delay: motionOK ? 0.3 : 0 }}
            className="absolute inset-x-0"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + max(96px, min(150px, 20vh)) + min(100vw, 430px) * 0.27)" }}
          >
            <HillLayer color={t.farHill} far className="h-[13vh] w-full" />
          </m.div>

          {/* Bukit tengah (+ pepohonan saat Asar) */}
          <m.div
            aria-hidden
            initial={{ y: 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...base, delay: motionOK ? 0.38 : 0 }}
            className="absolute inset-x-0"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + max(96px, min(150px, 20vh)) + min(100vw, 430px) * 0.16)" }}
          >
            <HillLayer color={t.midHill} className="h-[9vh] w-full" />
            {t.trees ? <TreeStrip color={t.midHill} className="absolute inset-x-0 top-[-26px] h-[52px] w-full" /> : null}
          </m.div>

          {/* Air + kilau pantulan (Magrib & Isya) — tepat di atas garis tanah */}
          {t.water ? (
            <m.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...base, delay: motionOK ? 0.5 : 0 }}
              className="absolute inset-x-0"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + max(96px, min(150px, 20vh)))", height: 44, background: t.water.color }}
            >
              <span
                className={cn("absolute bottom-0 top-0 blur-md", animationsOn && "pr-glint")}
                style={{ left: t.water.at, width: "12%", background: `linear-gradient(180deg, ${t.water.glint}, transparent)`, opacity: 0.5 }}
              />
            </m.div>
          ) : null}

          {/* Siluet masjid + jendela menyala + tanah — pemeran utama */}
          <m.div
            aria-hidden
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...base, delay: motionOK ? 0.46 : 0 }}
            className="absolute inset-x-0 bottom-0"
          >
            <div className="relative" style={{ color: t.mosque }}>
              <MosqueSilhouette className="h-auto max-h-[26vh] w-full" />
              {t.windows ? <MosqueWindows color={t.windows} /> : null}
            </div>
            <div
              className="w-full"
              style={{ height: "calc(env(safe-area-inset-bottom, 0px) + max(96px, min(150px, 20vh)))", background: t.ground }}
            />
          </m.div>

          {/* Partikel cahaya mengambang (debu emas / kunang) */}
          {motes.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className={cn("absolute rounded-full", animationsOn && "pr-mote")}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: i % 2 === 0 ? 3 : 2,
                height: i % 2 === 0 ? 3 : 2,
                background: t.motes?.color,
                // @ts-expect-error custom property untuk durasi & opasitas
                "--pr-dur": `${12 + (i % 4) * 3.5}s`,
                "--pr-op": t.motes?.opacity,
                animationDelay: `${i * 1.6}s`,
              }}
            />
          ))}
        </m.div>

        {/* ============ KONTEN ============ */}
        <div className="relative flex h-full flex-col px-6 pb-[max(1.4rem,env(safe-area-inset-bottom))] pt-[max(1.4rem,env(safe-area-inset-top))]">
          {/* Area atas: branding kecil + tombol tutup + tanggal */}
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: motionOK ? 0.12 : 0, duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="font-display text-[11px] font-extrabold tracking-[0.3em]"
                style={{ color: t.ink, opacity: 0.85 }}
              >
                SUIO
              </span>
              <span className="h-2.5 w-px" style={{ background: t.sub, opacity: 0.6 }} aria-hidden />
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: t.sub }}>
                Sujud in Order
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pengingat salat"
              className="tap flex h-10 w-10 items-center justify-center rounded-full transition-colors"
              style={{ background: t.tone === "light" ? "rgba(255,255,255,0.16)" : "rgba(30,25,20,0.14)", color: t.ink }}
            >
              <X size={19} />
            </button>
          </m.div>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: motionOK ? 0.2 : 0, duration: 0.4 }}
            className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium"
            style={{ color: t.sub }}
          >
            <CalendarDays size={11.5} />
            {formatGregorian(now)}
            {hijri ? <span className="font-semibold">· {hijri}</span> : null}
          </m.p>

          {/* Blok judul — berakhir tepat di atas atap masjid (tanah 150px +
              tinggi masjid = lebar kolom × 0.375), tidak menutupi lanskap */}
          <div className="mt-auto mb-auto flex flex-col items-center pb-[5vh] text-center">
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.42 : 0, duration: 0.45 }}
              className="text-[10px] font-bold uppercase tracking-[0.26em]"
              style={{ color: t.sub }}
            >
              Telah Masuk Waktu Salat
            </m.p>
            <m.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.5 : 0, duration: 0.55 }}
              className="pr-serif mt-2 max-w-[320px] text-[length:clamp(27px,4.8vh,34px)] font-semibold leading-[1.08] tracking-[-0.01em]"
              style={{ color: t.ink, textShadow: t.tone === "light" ? "0 2px 24px rgba(0,0,0,0.35)" : "0 1px 18px rgba(255,255,255,0.25)" }}
            >
              {copy.headline}
            </m.h1>
            <m.div
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: motionOK ? 0.62 : 0, duration: 0.5 }}
              aria-hidden
              style={{ color: t.tone === "light" ? "#FFD9AE" : t.ink }}
            >
              <Flourish className="mt-[1.2vh] h-3.5 w-28" />
            </m.div>
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.68 : 0, duration: 0.5 }}
              className="mt-[1.8vh] inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: chipBg, color: chipColor }}
            >
              <span className="tnum text-[13px] font-bold">Masuk pukul {time}</span>
              {next && nextLabel ? (
                <>
                  <span className="h-3 w-px" style={{ background: chipColor, opacity: 0.35 }} aria-hidden />
                  <span className="tnum text-[11.5px] font-semibold" style={{ opacity: 0.85 }}>
                    Menuju {nextLabel} {next.time}
                    {next.tomorrow ? " besok" : ""}
                  </span>
                </>
              ) : null}
            </m.div>
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: motionOK ? 0.76 : 0, duration: 0.5 }}
              className="mt-[2vh] max-w-[300px] text-[13px] font-medium leading-relaxed"
              style={{ color: t.ink, opacity: 0.92, textShadow: t.tone === "light" ? "0 1px 14px rgba(0,0,0,0.4)" : undefined }}
            >
              {copy.desc}
            </m.p>
          </div>

          {/* Tombol aksi — muncul terakhir, berdiri di atas zona tanah */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: motionOK ? 0.88 : 0, duration: 0.5 }}
            className="flex flex-col gap-2.5"
          >
            <button
              type="button"
              onClick={onGoRecord}
              className="tap min-h-[50px] w-full rounded-full bg-[#FF5A00] font-display text-[14.5px] font-bold text-white shadow-[0_14px_34px_-12px_rgba(255,90,0,0.6)] transition-transform active:scale-[0.985]"
            >
              Catat Salat
            </button>
            <button
              type="button"
              onClick={onGoSchedule}
              className="tap min-h-[46px] w-full rounded-full font-display text-[13.5px] font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.15)", color: "#FFF7EE", backdropFilter: "blur(6px)" }}
            >
              Lihat Jadwal Salat
            </button>
          </m.div>
        </div>
      </div>
    </div>
  );
}
