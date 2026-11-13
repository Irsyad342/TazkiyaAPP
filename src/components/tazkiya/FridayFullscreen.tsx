"use client";

/**
 * SUIO — "Jumat Telah Menyapa": pengalaman layar penuh khusus Salat Jumat.
 *
 * Mengikuti pola PrayerReminder V2 (panggung kolom 430px, lanskap berlapis,
 * hanya transform & opacity), tetapi dengan musim visualnya sendiri:
 * siang hangat Jumat — langit warm ivory → peach, matahari dengan sinar
 * sangat lembut, ornamen geometris, siluet masjid berjendela menyala naik
 * dari bawah, partikel cahaya deterministik.
 *
 * Urutan entrance (total ±1.1 dtk, sesuai spesifikasi 700–1200 ms):
 * latar fade → siluet masjid naik → ornamen muncul perlahan → cahaya
 * menyebar → headline staggered → chip & countdown terakhir.
 *
 * Bukan penilaian ibadah: tampilannya TIDAK menandai salat selesai —
 * "Mulai Persiapan" membuka checklist di kartu Salat Jumat (halaman Sholat),
 * "Lihat Jadwal" menavigasi ke jadwal existing.
 */

import { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Info, MapPin, Sparkles, X } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { FRIDAY_PREP_ITEMS } from "@/lib/tazkiya/types";
import { formatGregorian, formatHijri, keyToDate } from "@/lib/tazkiya/dates";
import { useFridayCountdown } from "@/lib/tazkiya/friday";
import { cn } from "@/lib/utils";

/* ===================== Palet musim Jumat ===================== */

const SCENE = {
  light: {
    sky: "linear-gradient(180deg,#FDF7EC 0%,#FAE8CF 40%,#F7D9B0 68%,#F2C78E 100%)",
    glow: "radial-gradient(ellipse 90% 55% at 50% 38%, rgba(255,197,120,0.5), rgba(255,197,120,0) 70%)",
    ink: "#3A2C1D",
    sub: "rgba(58,44,29,0.72)",
    chipBg: "rgba(255,255,255,0.55)",
    mosque: "#4A3423",
    mosqueSoft: "#5C4430",
    windows: "#FFD98F",
    hillFar: "rgba(214,164,102,0.45)",
    hillMid: "rgba(190,140,80,0.55)",
    ornament: "rgba(183,121,31,0.4)",
    mote: "rgba(255,214,150,0.9)",
    ray: "rgba(255,190,110,0.9)",
    ring: "rgba(183,121,31,0.5)",
  },
  dark: {
    sky: "linear-gradient(180deg,#171310 0%,#1E1812 42%,#241C14 70%,#2A2015 100%)",
    glow: "radial-gradient(ellipse 90% 55% at 50% 40%, rgba(217,164,65,0.16), rgba(217,164,65,0) 72%)",
    ink: "#F3E8DC",
    sub: "rgba(243,232,220,0.66)",
    chipBg: "rgba(58,44,29,0.5)",
    mosque: "#0E0B08",
    mosqueSoft: "#181209",
    windows: "#E8A33D",
    hillFar: "rgba(40,30,20,0.85)",
    hillMid: "rgba(30,23,15,0.95)",
    ornament: "rgba(217,164,65,0.28)",
    mote: "rgba(232,163,61,0.7)",
    ray: "rgba(217,164,65,0.5)",
    ring: "rgba(217,164,65,0.4)",
  },
} as const;

/** Posisi partikel deterministik (tanpa Math.random saat render). */
const MOTES = [
  { x: 12, y: 58, d: 0 },
  { x: 22, y: 42, d: 1.6 },
  { x: 31, y: 66, d: 3.1 },
  { x: 44, y: 50, d: 0.8 },
  { x: 56, y: 38, d: 2.4 },
  { x: 64, y: 62, d: 4.0 },
  { x: 74, y: 46, d: 1.2 },
  { x: 84, y: 58, d: 2.9 },
  { x: 90, y: 40, d: 3.7 },
  { x: 17, y: 72, d: 2.0 },
  { x: 51, y: 70, d: 3.4 },
  { x: 68, y: 74, d: 0.5 },
];

/* ===================== Ilustrasi ===================== */

/** Bintang segi-delapan besar — mengikuti identitas ornamen kartu. */
function BigOrnament({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="21" y="21" width="58" height="58" />
        <rect x="21" y="21" width="58" height="58" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="26" />
        <circle cx="50" cy="50" r="17" />
        <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/** Masjid besar: kubah utama + 2 kubah kecil + 2 menara + jendela menyala. */
function GrandMosque({ body, soft, win }: { body: string; soft: string; win: string }) {
  return (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" fill="none" aria-hidden className="h-full w-full">
      <rect x="56" y="34" width="9" height="116" rx="3" fill={body} />
      <rect x="52" y="56" width="17" height="4" rx="2" fill={body} />
      <path d="M60.5 20c7 8 8 13 0 20-8-7-7-12 0-20Z" fill={body} />
      <circle cx="60.5" cy="16" r="2" fill={body} />
      <rect x="335" y="34" width="9" height="116" rx="3" fill={body} />
      <rect x="331" y="56" width="17" height="4" rx="2" fill={body} />
      <path d="M339.5 20c7 8 8 13 0 20-8-7-7-12 0-20Z" fill={body} />
      <circle cx="339.5" cy="16" r="2" fill={body} />
      <rect x="18" y="100" width="86" height="50" rx="2" fill={soft} />
      <path d="M26 100v-8c0-8 6-13 12-13s12 5 12 13v8H26Z" fill={body} opacity="0.9" />
      <path d="M56 100v-8c0-8 6-13 12-13s12 5 12 13v8H56Z" fill={body} opacity="0.9" />
      <rect x="296" y="100" width="86" height="50" rx="2" fill={soft} />
      <path d="M304 100v-8c0-8 6-13 12-13s12 5 12 13v8h-24Z" fill={body} opacity="0.9" />
      <path d="M334 100v-8c0-8 6-13 12-13s12 5 12 13v8h-24Z" fill={body} opacity="0.9" />
      <rect x="106" y="84" width="188" height="66" rx="2" fill={body} />
      <path d="M176 150v-26a24 24 0 0 1 48 0v26h-48Z" fill={win} opacity="0.55" />
      <path d="M138 56c12 10 18 19 18 28h-36c0-9 6-18 18-28Z" fill={soft} />
      <path d="M262 56c12 10 18 19 18 28h-36c0-9 6-18 18-28Z" fill={soft} />
      <path d="M200 16c24 20 36 38 36 56h-72c0-18 12-36 36-56Z" fill={soft} />
      <path d="M200 16c-3-6-3-11 0-16 3 5 3 10 0 16Z" fill={body} />
      <circle cx="200" cy="9" r="2.4" fill={body} />
      {/* jendela kecil menyala */}
      <rect x="124" y="112" width="8" height="14" rx="4" fill={win} opacity="0.8" />
      <rect x="140" y="112" width="8" height="14" rx="4" fill={win} opacity="0.65" />
      <rect x="252" y="112" width="8" height="14" rx="4" fill={win} opacity="0.8" />
      <rect x="268" y="112" width="8" height="14" rx="4" fill={win} opacity="0.65" />
      <rect x="0" y="147" width="400" height="3" fill={body} />
    </svg>
  );
}

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

/** Sinar matahari siang — sangat lembut, rotasi lambat via CSS. */
function SoftRays({ color, className }: { color: string; className?: string }) {
  const blades = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="-100 -100 200 200" fill="none" aria-hidden className={className}>
      {blades.map((deg) => (
        <path key={deg} d="M -3 -40 L 0 -96 L 3 -40 Z" fill={color} opacity="0.12" transform={`rotate(${deg})`} />
      ))}
    </svg>
  );
}

/* ===================== Komponen utama ===================== */

export function FridayFullscreen({
  date,
  jumatTime,
  fallback,
  onClose,
  onGoSchedule,
  onPrepare,
}: {
  date: string;
  jumatTime: string;
  /** true = memakai waktu masuk Zuhur (belum diatur pengguna). */
  fallback: boolean;
  onClose: () => void;
  onGoSchedule: () => void;
  /** Buka checklist persiapan (halaman Sholat, kartu Jumat). */
  onPrepare: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const motionOK = animationsOn && !reduceMotion;
  const theme = useWorshipStore((s) => s.settings.theme);
  const isLight = theme === "light";
  const t = isLight ? SCENE.light : SCENE.dark;

  const now0 = useMemo(() => new Date(), []);
  const hijri = useMemo(() => formatHijri(keyToDate(date)), [date]);
  const greg = useMemo(() => formatGregorian(keyToDate(date)), [date]);
  const cd = useFridayCountdown(jumatTime, true, now0);

  const fridayPrep = useWorshipStore((s) => s.fridayPrep[date]);
  const doneCount = FRIDAY_PREP_ITEMS.reduce((n, _it, i) => n + (fridayPrep?.checks?.[i] ? 1 : 0), 0);

  const base = motionOK ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } : { duration: 0 };
  const dly = (s: number) => (motionOK ? s : 0);

  return (
    <div className="fixed inset-0 z-[71]" role="dialog" aria-modal="true" aria-label="Pengalaman khusus Salat Jumat">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: motionOK ? 0.4 : 0 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-xl"
        aria-hidden
      />

      <div className="absolute inset-0 mx-auto w-full max-w-[430px] overflow-hidden">
        {/* ============ Latar: fade masuk ============ */}
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={base} className="absolute inset-0" style={{ background: t.sky }}>
          {/* Cahaya menyebar halus */}
          <m.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...base, delay: dly(0.3) }}
            className="absolute inset-0"
            style={{ background: t.glow }}
            aria-hidden
          />
          {/* Matahari + sinar lembut */}
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...base, delay: dly(0.25) }}
            className="absolute left-1/2 top-[16%] -translate-x-1/2"
            aria-hidden
          >
            <div className={cn("relative flex h-40 w-40 items-center justify-center", animationsOn && "fr-rays-slow")}>
              <SoftRays color={t.ray} className="absolute inset-0 h-full w-full" />
              <span className="absolute h-24 w-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,214,150,0.85), rgba(255,214,150,0) 70%)" }} />
              <span className="absolute h-14 w-14 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,236,200,0.95), rgba(255,236,200,0) 72%)" }} />
            </div>
          </m.div>

          {/* Ornamen geometris — muncul perlahan */}
          <m.span
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...base, delay: dly(0.4) }}
            aria-hidden
            className="absolute right-6 top-6 text-[#00000022] dark:text-[#D9A44122]"
          >
            <BigOrnament className="h-24 w-24" style={{ color: t.ornament }} />
          </m.span>
          <m.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...base, delay: dly(0.5) }}
            aria-hidden
            className="absolute -left-8 bottom-[30%]"
          >
            <BigOrnament className="h-32 w-32" style={{ color: t.ornament, opacity: 0.7 }} />
          </m.span>

          {/* Bukit berlapis */}
          <HillLayer color={t.hillFar} far className="absolute bottom-[92px] left-0 h-[70px] w-full" />
          <HillLayer color={t.hillMid} className="absolute bottom-[58px] left-0 h-[64px] w-full" />

          {/* ============ Siluet masjid: naik dari bawah ============ */}
          <m.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...base, delay: dly(0.15) }}
            className="absolute bottom-0 left-0 h-[170px] w-full"
          >
            <GrandMosque body={t.mosque} soft={t.mosqueSoft} win={t.windows} />
          </m.div>

          {/* Partikel cahaya — deterministik, float sangat lambat */}
          {MOTES.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className={cn("absolute h-1 w-1 rounded-full", animationsOn && "fr-mote")}
              style={{ left: `${p.x}%`, top: `${p.y}%`, background: t.mote, animationDelay: `${p.d}s` }}
            />
          ))}
        </m.div>

        {/* ============ Konten ============ */}
        <div className="absolute inset-x-0 top-0 flex max-h-full flex-col overflow-y-auto px-6 pb-6 pt-[max(1.4rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: t.chipBg, color: t.ink }}>
              <Sparkles size={11} aria-hidden /> Hari Jumat
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pengalaman Salat Jumat"
              className="tap flex h-10 w-10 items-center justify-center rounded-full transition-colors"
              style={{ background: t.chipBg, color: t.ink }}
            >
              <X size={17} />
            </button>
          </div>

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...base, delay: dly(0.5) }}
            className="mt-8 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: t.sub }}>
              {greg}
            </p>
            {hijri ? <p className="mt-1 text-[11px]" style={{ color: t.sub }}>{hijri}</p> : null}

            {/* Headline — staggered reveal */}
            <h2 className="pr-serif mt-3 text-[38px] font-semibold leading-[1.06] tracking-[-0.01em]" style={{ color: t.ink }} aria-label="Jumat Telah Menyapa">
              {["Jumat", "Telah", "Menyapa"].map((word, i) => (
                <m.span
                  key={word}
                  initial={motionOK ? { opacity: 0, y: 16, display: "inline-block" } : { display: "inline-block" }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: dly(0.55 + i * 0.12), ease: [0.22, 1, 0.36, 1] }}
                  className="mx-1"
                >
                  {word}
                </m.span>
              ))}
            </h2>
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: dly(0.85) }}
              className="mx-auto mt-3 max-w-[300px] text-[13px] leading-relaxed"
              style={{ color: t.sub }}
            >
              Luangkan waktu sejenak untuk mempersiapkan diri menuju Salat Jumat.
            </m.p>
          </m.div>

          {/* Chip informasi */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: dly(0.95) }}
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tnum" style={{ background: t.chipBg, color: t.ink }}>
              <MapPin size={11} aria-hidden /> Pelaksanaan {jumatTime.replace(":", ".")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: t.chipBg, color: t.ink }}>
              <Sparkles size={11} aria-hidden /> Persiapan {doneCount}/{FRIDAY_PREP_ITEMS.length}
            </span>
          </m.div>
          {fallback ? (
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px]" style={{ color: t.sub }}>
              <Info size={10} aria-hidden /> Mengikuti waktu masuk Zuhur — waktu pelaksanaan di masjid dapat berbeda.
            </p>
          ) : null}

          {/* Countdown — muncul terakhir */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: dly(1.05) }}
            className="mx-auto mt-5 rounded-[1.3rem] px-6 py-3 text-center"
            style={{ background: t.chipBg }}
          >
            {cd.arrived ? (
              <p className="text-[13px] font-bold" style={{ color: t.ink }}>
                Salat Jumat Telah Tiba
              </p>
            ) : (
              <>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: t.sub }}>
                  Menuju Salat Jumat
                </p>
                <p className="tnum mt-1 text-[34px] font-bold leading-none tracking-[0.08em]" style={{ color: t.ink }} aria-live="off">
                  {cd.h} <span style={{ opacity: 0.45 }}>:</span> {cd.m} <span style={{ opacity: 0.45 }}>:</span> {cd.s}
                </p>
              </>
            )}
          </m.div>

          {/* Tombol */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: dly(1.15) }}
            className="mt-6 space-y-2.5 pb-[max(1.2rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={onPrepare}
              className="tap gs-ink-btn flex min-h-[52px] w-full items-center justify-center rounded-full font-display text-[15px] font-bold"
            >
              Mulai Persiapan
            </button>
            <button
              type="button"
              onClick={onGoSchedule}
              className="tap flex min-h-[46px] w-full items-center justify-center rounded-full text-[13px] font-bold"
              style={{ background: t.chipBg, color: t.ink }}
            >
              Lihat Jadwal
            </button>
          </m.div>
        </div>
      </div>
    </div>
  );
}
