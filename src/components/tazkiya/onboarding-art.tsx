"use client";

/**
 * SUIO v15 — Ilustrasi onboarding "editorial premium" (redesign penuh).
 *
 * Konsep: mockup smartphone besar berisi pratinjau antarmuka SUIO yang
 * DIBANGUN dari gaya visual halaman asli (bukan tangkapan layar), lapis
 * kartu antarmuka melayang dengan rotasi kecil, dan komposisi editorial
 * yang berbeda di tiap slide. Semua pratinjau mengikuti tema aktif via
 * varian light:/dark: (palet onboarding v15: #F7F5F2/#171717, aksen
 * #FF5A00, peach #FFE0CC/#EFC4A8).
 *
 * Ketepatan konten:
 * - Nama salat, format jam "04.24", label status, nama tab, dan label
 *   fitur direplikasi dari halaman asli (PrayerPage, HomePage, QuranPage,
 *   ZikirDoaPage, RizqAmalPage, ProfilePage).
 * - Teks Arab hanya memakai string yang SUDAH ADA di data aplikasi
 *   (nama surah dari surahs.ts, kaligrafi header Al-Qur'an, frasa zikir
 *   dari zikir-doa.ts) — aplikasi sengaja tidak menampilkan teks ayat,
 *   jadi pratinjau juga tidak membuat-buat teks ayat.
 * - Jam salat adalah contoh ilustratif khas Jakarta; durasi antar-waktu
 *   konsisten dengan jam yang ditampilkan.
 *
 * Performa: semua animasi hanya transform/opacity. Float kartu memakai
 * animasi CSS compositor (tk-ob-card-float) yang otomatis berhenti pada
 * slide nonaktif (section[data-live="false"]) dan tanpa pergerakan bila
 * prefers-reduced-motion atau pengaturan animasi dimatikan. Hitungan
 * angka (count-up) hanya berjalan saat slide aktif dan melewati
 * prefers-reduced-motion.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { m } from "framer-motion";
import {
  Bell,
  BookOpen,
  Bookmark,
  Check,
  ChartColumn,
  CircleUserRound,
  CloudSun,
  Flame,
  HandCoins,
  HandHeart,
  House,
  MessageCircleHeart,
  Moon,
  MoonStar,
  MousePointerClick,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { SuioMark } from "@/components/tazkiya/brand";
import { Star8 } from "@/components/tazkiya/ornaments";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ============================== Primitif ============================== */

/* Palet onboarding v15 (brief resmi) — via varian tema aplikasi. */
const CARD = "light:bg-white dark:bg-[#24211F]";
const CARD2 = "light:bg-[#F0EEEA] dark:bg-[#302925]";
const INK = "light:text-[#202020] dark:text-[#F7F3EF]";
const INK2 = "light:text-[#77716D] dark:text-[#B5AAA3]";
const BORDER = "light:border-[#202020]/[0.07] dark:border-white/[0.07]";
const SCREEN = "light:bg-[#FBF9F6] dark:bg-[#1B1817]";

const FLOAT_SHADOW =
  "light:shadow-[0_18px_38px_-16px_rgba(50,38,28,0.30),0_2px_10px_-4px_rgba(50,38,28,0.14)] dark:shadow-[0_20px_44px_-18px_rgba(0,0,0,0.7),0_2px_10px_-4px_rgba(0,0,0,0.5)]";

/** Kartu melayang: entrance spring + float CSS compositor (jeda/var via style). */
function FloatCard({
  live,
  delay = 0,
  floatY = 8,
  floatDur = 6.5,
  className = "",
  children,
  style,
}: {
  live: boolean;
  delay?: number;
  floatY?: number;
  floatDur?: number;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.88 }}
      animate={live ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.88 }}
      transition={{ delay: live ? delay : 0, type: "spring", stiffness: 190, damping: 21 }}
      className={`tk-ob-card-float absolute z-20 will-change-transform ${FLOAT_SHADOW} ${className}`}
      style={
        {
          ...style,
          "--ob-float-y": `${floatY}px`,
          "--ob-float-dur": `${floatDur}s`,
          "--ob-float-delay": `${(floatDur / 2.6).toFixed(2)}s`,
        } as CSSProperties
      }
    >
      {children}
    </m.div>
  );
}

/**
 * Panggung komposisi terukur: kotak kanvas 340×500 berisi ponsel + kartu,
 * diskalakan seragam (transform — murah) agar seluruh komposisi muat di
 * panggung yang tersedia tanpa terpotong, di semua tinggi layar.
 */
function FitStage({
  children,
  boxH = 500,
  minScale = 0.66,
  className = "",
}: {
  children: ReactNode;
  boxH?: number;
  minScale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(Math.max(minScale, Math.min(1, el.clientHeight / boxH)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [boxH, minScale]);
  return (
    <div ref={ref} className={`flex h-full w-full items-center justify-center overflow-visible ${className}`}>
      <div
        className="relative flex shrink-0 items-center justify-center will-change-transform"
        style={{ width: 340, height: boxH, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Overline kecil khas SUIO. */
function Overline({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[6.5px] font-bold uppercase leading-none tracking-[0.16em] text-[#FF5A00] ${className}`}>
      {children}
    </p>
  );
}

/** Chip ikon bulat hangat (peach terang / cokelat hangat gelap). */
function WarmChip({ children, size = 16, active = false }: { children: ReactNode; size?: number; active?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${
        active ? "bg-white/20 text-white" : "light:bg-[#FFE0CC] dark:bg-[#3A2C22] text-[#FF5A00]"
      }`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

/** Cincin progres SVG kecil (persen di tengah) — gaya "Target Harian". */
function MiniRing({ pct, size = 46, stroke = 5, label }: { pct: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[#FF5A00]/15 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="#FF5A00"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-center">{label}</span>
    </span>
  );
}

/* ====================== Kerangka smartphone ====================== */

/** Bar status kecil: 9:41 + sinyal/wifi/baterai (SVG mini). */
function StatusBar() {
  return (
    <div className="relative z-20 flex items-center justify-between px-[16px] pt-[9px] light:text-[#202020] dark:text-[#F7F3EF]">
      <span className="text-[8.5px] font-bold tracking-[0.02em]">9:41</span>
      <span className="flex items-center gap-[3px]">
        <svg width="12" height="7" viewBox="0 0 12 7" fill="currentColor">
          <rect x="0" y="4.5" width="2" height="2.5" rx="0.5" />
          <rect x="3" y="3" width="2" height="4" rx="0.5" />
          <rect x="6" y="1.5" width="2" height="5.5" rx="0.5" />
          <rect x="9" y="0" width="2" height="7" rx="0.5" opacity="0.35" />
        </svg>
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <path d="M1 2.6a5.6 5.6 0 0 1 8 0" />
          <path d="M2.6 4.3a3.3 3.3 0 0 1 4.8 0" />
          <circle cx="5" cy="6.1" r="0.8" fill="currentColor" stroke="none" />
        </svg>
        <svg width="15" height="7.5" viewBox="0 0 15 7.5">
          <rect x="0.5" y="0.5" width="11.5" height="6.5" rx="2" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="8.5" height="3.5" rx="1" fill="currentColor" />
          <rect x="13" y="2.4" width="1.4" height="2.7" rx="0.7" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

/** Mockup smartphone premium: bezel gelap, dynamic island, layar tematik. */
function PhoneMockup({
  w = 240,
  tilt = -3.5,
  live,
  children,
  className = "",
}: {
  w?: number;
  tilt?: number;
  live: boolean;
  children: ReactNode;
  className?: string;
}) {
  const h = Math.round(w * 2.06);
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.86, rotate: tilt - 5, y: 34 }}
      animate={live ? { opacity: 1, scale: 1, rotate: tilt, y: 0 } : { opacity: 0, scale: 0.94, rotate: tilt, y: 12 }}
      transition={live ? { type: "spring", stiffness: 130, damping: 17, mass: 0.9 } : { duration: 0.3 }}
      className={`relative will-change-transform ${className}`}
      style={{ width: w, height: h }}
    >
      <div className="absolute inset-0 rounded-[13%_/_6.3%] bg-gradient-to-b from-[#4a4038] via-[#191411] to-[#332a24] p-[6.5px]">
        <div className={`relative h-full w-full overflow-hidden rounded-[11.5%_/_5.6%] ${SCREEN}`}>
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-[6.5px] z-30 h-[13px] w-[58px] -translate-x-1/2 rounded-full bg-[#0b0908]">
            <span className="absolute right-[7px] top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-[#1f2b33]" />
          </div>
          <StatusBar />
          <div className="pointer-events-none select-none">{children}</div>
        </div>
      </div>
      {/* Kilau tepi */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[13%_/_6.3%] ring-1 ring-white/25 dark:ring-white/[0.14]" />
    </m.div>
  );
}

/* ========================= Layar: Beranda ========================= */

/** Pratinjau Beranda: sapaan, strip tanggal, kartu Salat, kartu Kebaikan. */
function HomeScreen() {
  const salat = [
    { n: "Subuh", t: "04.24", done: true },
    { n: "Zuhur", t: "11.58", done: true },
    { n: "Asar", t: "15.14", done: true },
    { n: "Magrib", t: "17.50", done: false },
    { n: "Isya", t: "19.02", done: false },
  ];
  return (
    <div className="flex flex-col gap-[7px] px-[11px] pt-[8px]">
      <div className="flex items-center gap-[7px]">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-[#FF9A52] to-[#FF5A00]">
          <CircleUserRound size={13} className="text-white" />
        </span>
        <span className="flex-1">
          <span className={`block text-[6px] ${INK2}`}>Assalamu'alaikum,</span>
          <span className={`block text-[8.5px] font-bold leading-tight ${INK}`}>Sahabat SUIO</span>
        </span>
        <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${CARD} ${BORDER} border`}>
          <Bell size={8} className={INK2} />
        </span>
      </div>
      <p className={`text-[5.5px] ${INK2}`}>
        Rabu, 6 November 2025 <span className="text-[#FF5A00]">· 15 Jumadil Akhir 1447 H</span>
      </p>
      <div className="flex justify-between">
        {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
          <span
            key={i}
            className={`flex h-[16px] w-[16px] items-center justify-center rounded-full text-[5.5px] font-bold ${
              i === 3 ? "bg-[#FF5A00] text-white" : `${CARD2} ${INK2}`
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      {/* Kartu Salat Lima Waktu (gaya tk-card-white) */}
      <div className={`rounded-[12px] p-[9px] ${CARD} light:shadow-[0_6px_18px_-10px_rgba(50,38,28,0.25)]`}>
        <p className={`text-[7.5px] font-bold ${INK}`}>Salat Lima Waktu</p>
        <div className="mt-[5px] flex flex-col gap-[4.5px]">
          {salat.map((s) => (
            <span key={s.n} className="flex items-center gap-[5px]">
              <span
                className={`flex h-[9px] w-[9px] items-center justify-center rounded-full ${
                  s.done ? "bg-[#17171B] dark:bg-[#FF5A00]" : "border-[1.2px] border-[#c9c2bb] dark:border-[#4a4038]"
                }`}
              >
                {s.done && <Check size={6} strokeWidth={3.5} className="text-white" />}
              </span>
              <span className={`flex-1 text-[7px] font-semibold ${INK}`}>{s.n}</span>
              <span className={`text-[6.5px] ${INK2}`}>{s.t}</span>
            </span>
          ))}
        </div>
        <p className={`mt-[6px] border-t pt-[5px] text-[5.5px] ${BORDER} ${INK2}`}>
          Berikutnya · <span className="font-bold text-[#FF5A00]">Magrib 17.50</span>
        </p>
      </div>
      {/* Kartu Kebaikan Hari Ini (gaya glass-hero oranye) */}
      <div
        className="rounded-[12px] bg-gradient-to-br from-[#FF5A00] to-[#D94B0A] p-[9px] text-white"
        style={{ boxShadow: "0 14px 30px -14px rgba(250,82,0,0.55)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[7.5px] font-bold">Kebaikan Hari Ini</p>
          <span className="rounded-full bg-white/20 px-[5px] py-[1.5px] text-[5.5px] font-bold">3/4</span>
        </div>
        <div className="mt-[5px] flex flex-col gap-[4.5px]">
          {[
            { n: "Al-Qur'an", done: true },
            { n: "Zikir & Doa", done: true },
            { n: "Amal", done: true },
            { n: "Jurnal", done: false },
          ].map((r) => (
            <span key={r.n} className="flex items-center gap-[5px]">
              <span className={`flex h-[9px] w-[9px] items-center justify-center rounded-full ${r.done ? "bg-white" : "border-[1.2px] border-white/50"}`}>
                {r.done && <Check size={6} strokeWidth={3.5} className="text-[#D94B0A]" />}
              </span>
              <span className="flex-1 text-[7px] font-semibold text-white/95">{r.n}</span>
              <Sparkles size={6} className={r.done ? "text-[#FFE0CC]" : "text-white/40"} />
            </span>
          ))}
        </div>
      </div>
      {/* Navigasi bawah mini */}
      <div className="mx-auto flex items-center gap-[8px] rounded-full bg-[#151110] px-[10px] py-[5px]">
        {[House, BookOpen, MoonStar, ChartColumn, CircleUserRound].map((Ic, i) => (
          <span
            key={i}
            className={`flex items-center gap-[2.5px] rounded-full px-[5px] py-[3px] ${
              i === 0 ? "bg-[#FF5A00] text-white" : "text-white/60"
            }`}
          >
            <Ic size={7} />
            {i === 0 && <span className="text-[5px] font-bold">Beranda</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ========================== Layar: Salat ========================== */

/* Jadwal contoh ilustratif (khas Jakarta) — durasi konsisten dengan jam. */
type ObDay = {
  n: string;
  t: string;
  end: string;
  dur: string;
  Ic: typeof Sunrise;
  status: string;
  active?: boolean;
  next?: boolean;
  done?: boolean;
};
const OBDAY: ObDay[] = [
  { n: "Subuh", t: "04.24", end: "05.44", dur: "1 j 20 m", Ic: Sunrise, status: "Tepat waktu", done: true },
  { n: "Zuhur", t: "11.58", end: "15.14", dur: "3 j 16 m", Ic: Sun, status: "Sedang Berlangsung", active: true },
  { n: "Asar", t: "15.14", end: "17.50", dur: "2 j 36 m", Ic: CloudSun, status: "Berikutnya", next: true },
  { n: "Magrib", t: "17.50", end: "19.02", dur: "1 j 12 m", Ic: Sunset, status: "Akan datang" },
  { n: "Isya", t: "19.02", end: "04.24", dur: "9 j 22 m", Ic: Moon, status: "Akan datang" },
];

/** Pratinjau halaman Salat: kartu tiket bertumpuk, kartu aktif oranye. */
function PrayerScreen({ live }: { live: boolean }) {
  return (
    <div className="flex flex-col px-[11px] pt-[6px]">
      <div className="flex items-baseline justify-between">
        <p className={`text-[12px] font-bold tracking-[-0.01em] ${INK}`}>Sholat</p>
        <p className={`text-[5.5px] ${INK2}`}>Hari Ini · Bulanan · Qada</p>
      </div>
      <p className={`mt-[1px] text-[5.5px] ${INK2}`}>Catat lima waktu salat dan kelola qada dengan tenang</p>
      <div className="mt-[6px] flex items-center gap-[4px]">
        <span className="rounded-full bg-[#FF5A00]/12 px-[6px] py-[2px] text-[5.5px] font-bold text-[#FF5A00] dark:bg-[#FF5A00]/20">3/5 Salat</span>
        <span className={`rounded-full px-[6px] py-[2px] text-[5.5px] font-bold ${CARD2} ${INK2}`}>1 Berjamaah</span>
      </div>
      <div className="mt-[5px] h-[3px] overflow-hidden rounded-full bg-[#FF5A00]/15 dark:bg-white/10">
        <m.div
          initial={{ scaleX: 0 }}
          animate={live ? { scaleX: 0.6 } : { scaleX: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.5 }}
          className="h-full w-full origin-left rounded-full bg-[#FF5A00]"
        />
      </div>
      {/* Tumpukan tiket (menelungkup -8px seperti tk-tkt-stack) */}
      <div className="mt-[7px] flex flex-col">
        {OBDAY.map((s, i) => (
          <m.div
            key={s.n}
            initial={{ opacity: 0, y: 14 }}
            animate={live ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.45, ease: EASE, delay: live ? 0.35 + i * 0.11 : 0 }}
            className={`relative rounded-t-[11px] ${i > 0 ? "-mt-[8px]" : ""} ${
              s.active
                ? "z-10 bg-gradient-to-br from-[#FF5A00] to-[#E04E00] text-white"
                : `${CARD} ${BORDER} border light:shadow-[0_4px_14px_-8px_rgba(50,38,28,0.3)]`
            }`}
            style={s.active ? { boxShadow: "0 12px 26px -12px rgba(250,82,0,0.6)" } : undefined}
          >
            <div className="flex items-center gap-[5px] px-[8px] pb-[4px] pt-[6px]">
              <WarmChip size={13} active={s.active}>
                <s.Ic size={8} />
              </WarmChip>
              <span className="flex-1">
                <span className={`block text-[7px] font-bold leading-none ${s.active ? "text-white/90" : INK2}`}>{s.n}</span>
                <span className={`mt-[1.5px] block text-[8px] font-bold leading-none ${s.active ? "text-white" : INK}`}>{s.t}</span>
              </span>
              <span className={`mx-[2px] h-[14px] w-0 border-r border-dashed ${s.active ? "border-white/40" : `${BORDER}`}`} />
              <span className={`rounded-full px-[4px] py-[1.5px] text-[4.8px] font-bold ${s.active ? "bg-white/20 text-white" : "bg-[#FF5A00]/10 text-[#FF5A00] dark:bg-[#FF5A00]/20"}`}>
                {s.dur}
              </span>
              <span className={`text-right ${s.active ? "text-white/85" : INK2}`}>
                <span className="block text-[4.5px] leading-none">berakhir</span>
                <span className="mt-[1px] block text-[6.5px] font-bold leading-none">{s.end}</span>
              </span>
            </div>
            <div className={`flex items-center gap-[3px] border-t border-dashed px-[8px] py-[3.5px] ${s.active ? "border-white/25" : `${BORDER}`}`}>
              <span
                className={`h-[4px] w-[4px] rounded-full ${
                  s.done ? "bg-[#1E6B40]" : s.active ? "bg-white" : s.next ? "bg-[#FF5A00]" : INK2
                }`}
              />
              <span className={`text-[5px] font-semibold ${s.active ? "text-white" : INK2}`}>{s.status}</span>
              {s.active && (
                <span className="ml-auto rounded-full bg-white px-[4.5px] py-[1.5px] text-[4.8px] font-bold text-[#E04E00]">Sedang Berlangsung</span>
              )}
              {s.done && (
                <span className="ml-auto flex h-[8px] w-[8px] items-center justify-center rounded-full bg-[#E1F4E9] dark:bg-[#1F4230]">
                  <Check size={5} strokeWidth={3.5} className="text-[#1E6B40] dark:text-[#93DCB2]" />
                </span>
              )}
            </div>
          </m.div>
        ))}
      </div>
    </div>
  );
}

/* ========================= Layar: Al-Qur'an ========================= */

/** Pratinjau Al-Qur'an: hero lanjut bacaan, target, baris surah. */
function QuranScreen() {
  return (
    <div className="flex flex-col gap-[7px] px-[11px] pt-[8px]">
      <div className="flex items-baseline justify-between">
        <p className={`text-[12px] font-bold tracking-[-0.01em] ${INK}`}>Al-Qur'an</p>
        <p className="quran-arabic text-[11px] leading-none text-[#FF5A00]">القرآن الكريم</p>
      </div>
      {/* Hero Lanjutkan Bacaan (blok peach hangat + pola khatam) */}
      <div className="relative overflow-hidden rounded-[12px] bg-[#FFE0CC] p-[9px] dark:bg-[#3B2B20]">
        <div className="tk-ob-pattern absolute inset-0 opacity-[0.06] dark:opacity-[0.09]" />
        <Overline>Lanjutkan Bacaan</Overline>
        <p className={`mt-[3px] text-[11px] font-bold leading-tight ${INK}`}>Al-Baqarah</p>
        <p className={`mt-[1px] text-[5.5px] ${INK2}`}>Ayat 44 dari 286 · Madaniyah</p>
        <span className="mt-[6px] inline-flex items-center gap-[3px] rounded-full bg-[#FF5A00] px-[8px] py-[3px] text-[6px] font-bold text-white">
          Lanjutkan <BookOpen size={6} />
        </span>
        <Bookmark size={10} className={`absolute right-[9px] top-[9px] ${INK2}`} />
      </div>
      {/* Target Bacaan (cincin) */}
      <div className={`flex items-center gap-[8px] rounded-[12px] p-[9px] ${CARD} ${BORDER} border`}>
        <MiniRing pct={0.64} label={<span className={`text-[7px] font-bold text-[#FF5A00]`}>64%</span>} />
        <span className="flex-1">
          <Overline>Target Bacaan</Overline>
          <p className={`mt-[2px] text-[8.5px] font-bold leading-tight ${INK}`}>
            16 / 25 <span className={`text-[6px] font-semibold ${INK2}`}>halaman</span>
          </p>
          <p className={`mt-[1px] text-[5.5px] ${INK2}`}>4 halaman lagi hari ini</p>
        </span>
      </div>
      {/* Baris surah (chip khatam + nama Arab) */}
      <div className={`flex items-center gap-[7px] rounded-[12px] p-[8px] ${CARD2}`}>
        <span className="tk-octagram flex h-[16px] w-[16px] items-center justify-center bg-[#FF5A00] text-[6.5px] font-bold text-white">2</span>
        <span className="flex-1">
          <span className={`block text-[7.5px] font-bold leading-none ${INK}`}>Al-Baqarah</span>
          <span className={`mt-[1.5px] block text-[5.5px] leading-none ${INK2}`}>Sapi · 286 ayat</span>
        </span>
        <span className="quran-arabic text-[10px] leading-none text-[#FF5A00]">البقرة</span>
      </div>
    </div>
  );
}

/* ========================== Layar: Profil ========================== */

/** Hook count-up: hanya berjalan saat aktif; hormati reduced-motion. */
function useCountUp(target: number, active: boolean, dur = 1300) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active) {
      setV(0);
      return;
    }
    if (reduced || window.document.documentElement.dataset.anim === "off") {
      setV(target);
      return;
    }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, target, dur]);
  return v;
}

/** Grafik area mini (gaya AreaChartLite: garis oranye + gradien). */
function MiniArea({ live, w = 118, h = 34 }: { live: boolean; w?: number; h?: number }) {
  const pts = [30, 42, 36, 55, 50, 68, 78];
  const max = 90;
  const step = w / (pts.length - 1);
  const y = (v: number) => h - (v / max) * h;
  const d = `M0,${y(pts[0])} ${pts.map((p, i) => (i === 0 ? "" : `L${(i * step).toFixed(1)},${y(p)}`)).join(" ")}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="ob-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5A00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF5A00" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#ob-area)" style={{ opacity: live ? 1 : 0, transition: "opacity 700ms ease 400ms" }} />
      <m.path
        d={d}
        fill="none"
        stroke="#FF5A00"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={live ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.45 }}
      />
      <circle cx={w} cy={y(pts[pts.length - 1])} r="2.6" fill="#FF5A00" style={{ opacity: live ? 1 : 0, transition: "opacity 300ms ease 1.2s" }} />
    </svg>
  );
}

/** Pratinjau Profil: statistik count-up, grafik, ringkasan pencapaian. */
function StatsScreen({ live }: { live: boolean }) {
  const hari = useCountUp(24, live);
  const zikir = useCountUp(300, live, 1500);
  const salatPct = useCountUp(100, live, 1100);
  return (
    <div className="flex flex-col gap-[7px] px-[11px] pt-[8px]">
      <div className="flex items-center gap-[7px]">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gradient-to-br from-[#FF9A52] to-[#FF5A00] text-[9px] font-extrabold text-white">S</span>
        <span className="flex-1">
          <span className={`block text-[8.5px] font-bold leading-tight ${INK}`}>Sahabat SUIO</span>
          <span className="mt-[1px] block text-[5.5px] font-semibold text-[#FF5A00]">Aktif sejak 12 Okt 2025</span>
        </span>
        <span className={`rounded-full px-[5px] py-[2px] text-[5px] font-bold ${CARD2} ${INK2}`}>Profil</span>
      </div>
      {/* Statistik 3 kolom (tanpa kartu, angka besar) */}
      <div className={`flex items-center border-y px-[2px] py-[7px] ${BORDER}`}>
        {[
          { v: String(hari), l: "Hari aktif" },
          { v: `${Math.round((5 * salatPct) / 100)}/5`, l: "Salat hari ini" },
          { v: String(zikir), l: "Zikir hari ini" },
        ].map((s, i) => (
          <span key={s.l} className={`flex-1 text-center ${i === 1 ? `border-x ${BORDER}` : ""}`}>
            <span className="block text-[12.5px] font-extrabold leading-none tabular-nums text-[#FF5A00]">{s.v}</span>
            <span className={`mt-[3px] block text-[5px] font-semibold uppercase tracking-[0.1em] ${INK2}`}>{s.l}</span>
          </span>
        ))}
      </div>
      {/* Grafik tren 7 hari */}
      <div className={`rounded-[12px] border p-[9px] ${CARD} ${BORDER}`}>
        <div className="flex items-center justify-between">
          <Overline>Progres 7 Hari</Overline>
          <span className="rounded-full bg-[#E1F4E9] px-[5px] py-[1.5px] text-[5px] font-bold text-[#1E6B40] dark:bg-[#1F4230] dark:text-[#93DCB2]">Meningkat</span>
        </div>
        <div className="mt-[4px]">
          <MiniArea live={live} />
        </div>
      </div>
      {/* Ringkasan Pencapaian (pil indikator + beam) */}
      <div className={`rounded-[12px] border p-[9px] ${CARD} ${BORDER}`}>
        <p className={`text-[7.5px] font-bold ${INK}`}>Progres Sholat Hari Ini</p>
        <div className="mt-[6px] flex gap-[4px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <m.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={live ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ delay: live ? 0.7 + i * 0.09 : 0, type: "spring", stiffness: 260, damping: 18 }}
              className="flex h-[13px] flex-1 items-center justify-center rounded-full bg-[#FFE0CC] dark:bg-[#3A2C22]"
            >
              <span className="flex h-[7px] w-[7px] items-center justify-center rounded-full bg-[#FF5A00]">
                <Check size={4.5} strokeWidth={4} className="text-white" />
              </span>
            </m.span>
          ))}
        </div>
        <div className="mt-[6px] h-[4px] overflow-hidden rounded-full bg-[#FF5A00]/15 dark:bg-white/10">
          <m.div
            initial={{ scaleX: 0 }}
            animate={live ? { scaleX: salatPct / 100 } : { scaleX: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.6 }}
            className="h-full w-full origin-left rounded-full bg-[#FF5A00]"
          />
        </div>
      </div>
    </div>
  );
}

/* ===================== Kartu melayang per slide ===================== */

/** Cincin target harian (kartu Beranda "Target Harian"). */
function CardRingTarget({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={9} floatDur={7} className={`w-[92px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <Overline>Target Harian</Overline>
      <div className="mt-[5px] flex items-center gap-[6px]">
        <MiniRing pct={0.78} size={38} label={<span className="text-[7px] font-bold text-[#FF5A00]">78%</span>} />
        <span>
          <span className={`block text-[8px] font-bold leading-tight ${INK}`}>Bagus!</span>
          <span className={`block text-[5.5px] leading-tight ${INK2}`}>7/9 selesai</span>
        </span>
      </div>
    </FloatCard>
  );
}

/** Kartu "Sholat Berikutnya" (gaya Pengingat Ibadah). */
function CardNextPrayer({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={11} floatDur={8} className="w-[128px] rounded-[15px] bg-gradient-to-br from-[#FF5A00] to-[#D94B0A] p-[10px] text-white">
      <div className="flex items-center gap-[4px]">
        <Bell size={8} />
        <span className="text-[5.5px] font-bold uppercase tracking-[0.14em] text-white/85">Sholat Berikutnya</span>
      </div>
      <p className="mt-[4px] text-[12px] font-extrabold leading-none">Asar · 15.14</p>
      <div className="mt-[5px] h-[3px] overflow-hidden rounded-full bg-white/25">
        <m.div
          initial={{ scaleX: 0 }}
          animate={live ? { scaleX: 0.72 } : { scaleX: 0 }}
          transition={{ duration: 1.2, ease: EASE, delay: delay + 0.6 }}
          className="h-full w-full origin-left rounded-full bg-white"
        />
      </div>
      <p className="mt-[4px] text-[6px] font-semibold text-white/90">Berakhir dalam 1 j 12 m</p>
    </FloatCard>
  );
}

/** Kartu "Kebaikan Hari Ini" ringkas (aktivitas hari ini). */
function CardActivities({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={7} floatDur={6} className={`w-[116px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center justify-between">
        <Overline>Aktivitas Hari Ini</Overline>
        <span className="rounded-full bg-[#FFE0CC] px-[4px] py-[1px] text-[5px] font-bold text-[#E04E00] dark:bg-[#3A2C22] dark:text-[#FF9A52]">3/4</span>
      </div>
      <div className="mt-[5px] flex flex-col gap-[4px]">
        {[
          { n: "Al-Qur'an", done: true },
          { n: "Zikir & Doa", done: true },
          { n: "Amal", done: true },
          { n: "Jurnal", done: false },
        ].map((r) => (
          <span key={r.n} className="flex items-center gap-[4px]">
            <span className={`flex h-[8px] w-[8px] items-center justify-center rounded-full ${r.done ? "bg-[#FF5A00]" : CARD2}`}>
              {r.done && <Check size={5} strokeWidth={3.5} className="text-white" />}
            </span>
            <span className={`text-[6.5px] font-semibold ${INK}`}>{r.n}</span>
          </span>
        ))}
      </div>
    </FloatCard>
  );
}

/** Kartu tiket salat selesai (done). */
function CardPrayerDone({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={8} floatDur={6.5} className={`w-[122px] rounded-[13px] border p-[8px] ${CARD} ${BORDER}`}>
      <div className="flex items-center gap-[5px]">
        <WarmChip size={14}>
          <Sunrise size={8} />
        </WarmChip>
        <span className="flex-1">
          <span className={`block text-[7px] font-bold leading-none ${INK}`}>Subuh</span>
          <span className={`mt-[2px] block text-[6px] leading-none ${INK2}`}>04.24 — berjamaah</span>
        </span>
        <span className="flex h-[10px] w-[10px] items-center justify-center rounded-full bg-[#E1F4E9] dark:bg-[#1F4230]">
          <Check size={6} strokeWidth={3.5} className="text-[#1E6B40] dark:text-[#93DCB2]" />
        </span>
      </div>
    </FloatCard>
  );
}

/** Kartu salat aktif "Sedang Berlangsung". */
function CardPrayerActive({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={10} floatDur={7.5} className="w-[140px] rounded-[14px] bg-gradient-to-br from-[#FF5A00] to-[#E04E00] p-[9px] text-white">
      <div className="flex items-center justify-between">
        <span className="text-[5.5px] font-bold uppercase tracking-[0.14em] text-white/85">Zuhur · 11.58</span>
        <span className="rounded-full bg-white px-[5px] py-[1.5px] text-[5px] font-bold text-[#E04E00]">Sedang Berlangsung</span>
      </div>
      <p className="mt-[4px] text-[6.5px] font-semibold text-white/90">Berakhir dalam 1 j 42 m</p>
      <div className="mt-[4px] h-[4px] overflow-hidden rounded-full bg-white/25">
        <m.div
          initial={{ scaleX: 0 }}
          animate={live ? { scaleX: 0.55 } : { scaleX: 0 }}
          transition={{ duration: 1.3, ease: EASE, delay: delay + 0.5 }}
          className="h-full w-full origin-left rounded-full bg-white"
        />
      </div>
    </FloatCard>
  );
}

/** Kalender bulanan mini (titik status seperti tab Bulanan). */
function CardMonthDots({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  const dots = [1, 1, 1, 0, 1, 2, 1, 1, 1, 0, 1, 1, 2, 1];
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={7} floatDur={6} className={`w-[126px] rounded-[13px] border p-[8px] ${CARD} ${BORDER}`}>
      <div className="flex items-center justify-between">
        <Overline>Bulanan</Overline>
        <span className={`text-[5.5px] font-bold ${INK2}`}>November</span>
      </div>
      <div className="mt-[5px] grid grid-cols-7 gap-[3px]">
        {dots.map((d, i) => (
          <span key={i} className="flex flex-col items-center gap-[1.5px]">
            <span
              className={`h-[4px] w-[4px] rounded-full ${i === 5 ? "ring-1 ring-[#FF5A00] ring-offset-1 ring-offset-white dark:ring-offset-[#24211F]" : ""} ${
                d === 1 ? "bg-[#FF5A00]" : d === 2 ? "bg-[#E0A458]" : INK2
              } ${d === 0 ? "opacity-30" : ""}`}
            />
            <span className={`text-[4px] ${INK2}`}>{i + 1}</span>
          </span>
        ))}
      </div>
    </FloatCard>
  );
}

/** Kartu bacaan berjalan (bookmark surah). */
function CardReading({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={9} floatDur={7} className={`w-[130px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center justify-between">
        <Overline>Lanjutkan Bacaan</Overline>
        <Bookmark size={8} className="text-[#FF5A00]" />
      </div>
      <p className={`mt-[4px] text-[9px] font-bold leading-none ${INK}`}>Ali 'Imran</p>
      <p className={`mt-[2.5px] text-[6px] ${INK2}`}>Ayat 92 dari 200 · Madaniyah</p>
      <div className="mt-[5px] h-[3px] overflow-hidden rounded-full bg-[#FF5A00]/15 dark:bg-white/10">
        <m.div
          initial={{ scaleX: 0 }}
          animate={live ? { scaleX: 0.46 } : { scaleX: 0 }}
          transition={{ duration: 1, ease: EASE, delay: delay + 0.55 }}
          className="h-full w-full origin-left rounded-full bg-[#FF5A00]"
        />
      </div>
    </FloatCard>
  );
}

/** Kartu tasbih digital dengan hitungan demo (angka berputar saat aktif). */
function CardTasbih({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  const n = useCountUp(33, live, 1600);
  const pct = n / 33;
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={10} floatDur={8} className={`w-[138px] rounded-[15px] border p-[10px] ${CARD} ${BORDER}`}>
      <div className="flex items-center justify-between">
        <Overline>Tasbih Digital</Overline>
        <span className="rounded-full bg-[#E1F4E9] px-[4px] py-[1px] text-[4.8px] font-bold text-[#1E6B40] dark:bg-[#1F4230] dark:text-[#93DCB2]">
          {pct >= 1 ? "Target tercapai" : "33×"}
        </span>
      </div>
      <p className="quran-arabic mt-[5px] text-[12px] leading-snug text-[#FF5A00]">سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</p>
      <p className={`mt-[1px] text-[6px] font-semibold ${INK}`}>Subhanallah wa bihamdih</p>
      <div className="mt-[6px] flex items-center gap-[7px]">
        <MiniRing pct={pct} size={40} label={<span className="text-[9px] font-extrabold tabular-nums text-[#FF5A00]">{n}</span>} />
        <span className={`flex-1 text-[5.5px] leading-snug ${INK2}`}>Ketuk lingkaran untuk berdzikir — hitungan tersimpan harian.</span>
      </div>
    </FloatCard>
  );
}

/** Kartu target bacaan harian. */
function CardQuranTarget({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={8} floatDur={6.5} className={`w-[120px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center gap-[7px]">
        <MiniRing pct={0.64} size={36} label={<span className="text-[6.5px] font-bold text-[#FF5A00]">64%</span>} />
        <span>
          <Overline>Target Bacaan</Overline>
          <p className={`mt-[2px] text-[8px] font-bold leading-tight ${INK}`}>
            16 / 25 <span className={`text-[5.5px] ${INK2}`}>hlm</span>
          </p>
        </span>
      </div>
    </FloatCard>
  );
}

/** Kartu Amal (gaya Rizq & Amal: chip ikon + jenis kebaikan). */
function CardAmal({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={9} floatDur={7} className={`w-[128px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center gap-[5px]">
        <WarmChip size={15}>
          <HandCoins size={8.5} />
        </WarmChip>
        <span className="flex-1 text-[8px] font-bold text-[#FF5A00]">Amal</span>
        <span className={`rounded-full px-[4px] py-[1px] text-[5px] font-bold ${CARD2} ${INK2}`}>2 hari ini</span>
      </div>
      <div className="mt-[5px] flex flex-col gap-[4px]">
        {[
          { Ic: HandCoins, n: "Sedekah subuh" },
          { Ic: HandHeart, n: "Membantu tetangga" },
        ].map((r) => (
          <span key={r.n} className={`flex items-center gap-[4px] rounded-[8px] px-[5px] py-[3.5px] ${CARD2}`}>
            <r.Ic size={7} className="text-[#FF5A00]" />
            <span className={`text-[6px] font-semibold ${INK}`}>{r.n}</span>
          </span>
        ))}
      </div>
    </FloatCard>
  );
}

/** Kartu Rizki (keberkahan rezeki: chip + catatan). */
function CardRizki({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={11} floatDur={8} className={`w-[122px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center gap-[5px]">
        <WarmChip size={15}>
          <Sparkles size={8.5} />
        </WarmChip>
        <span className="flex-1 text-[8px] font-bold text-[#FF5A00]">Rizki</span>
      </div>
      <p className={`mt-[4px] text-[6.5px] leading-snug ${INK2}`}>Catat keberkahan rezeki dan pertolongan yang datang hari ini.</p>
      <div className={`mt-[5px] flex items-center gap-[4px] rounded-[8px] px-[5px] py-[3.5px] ${CARD2}`}>
        <Sprout size={7} className="text-[#FF5A00]" />
        <span className={`text-[6px] font-semibold ${INK}`}>Niat baik · petani</span>
      </div>
    </FloatCard>
  );
}

/** Kartu Daily Barakah (daftar chip oktagonal seperti Beranda). */
function CardBarakah({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={8} floatDur={6.5} className={`w-[138px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold text-[#FF5A00]">Daily Barakah</span>
        <Star8 size={9} className="text-[#FF5A00]/70" />
      </div>
      <div className="mt-[5px] flex flex-col gap-[3.5px]">
        {["Niat hari ini", "Setelah Subuh", "Motivasi", "Target kecil"].map((n, i) => (
          <span key={n} className="flex items-center gap-[5px]">
            <span className="tk-octagram flex h-[10px] w-[10px] items-center justify-center bg-[#FFE0CC] text-[5px] font-bold text-[#E04E00] dark:bg-[#3A2C22] dark:text-[#FF9A52]">
              {i + 1}
            </span>
            <span className={`text-[6.5px] font-semibold ${INK}`}>{n}</span>
          </span>
        ))}
      </div>
    </FloatCard>
  );
}

/** Kartu Jurnal Syukur (refleksi tiga hal kecil). */
function CardJurnal({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={10} floatDur={7.5} className={`w-[130px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center gap-[5px]">
        <WarmChip size={15}>
          <MessageCircleHeart size={8.5} />
        </WarmChip>
        <span className="flex-1">
          <span className="block text-[8px] font-bold leading-none text-[#FF5A00]">Jurnal Syukur</span>
          <span className={`mt-[2px] block text-[5.5px] leading-none ${INK2}`}>3 hal kecil yang layak disyukuri</span>
        </span>
      </div>
      <div className="mt-[5px] flex flex-col gap-[3.5px]">
        {["Keluarga yang tenang", "Kesehatan hari ini", "Rezeki tak terduga"].map((n) => (
          <span key={n} className="flex items-center gap-[4px]">
            <span className="flex h-[7px] w-[7px] items-center justify-center rounded-full bg-[#FF5A00]">
              <Check size={4.5} strokeWidth={4} className="text-white" />
            </span>
            <span className={`text-[6px] font-semibold ${INK}`}>{n}</span>
          </span>
        ))}
      </div>
    </FloatCard>
  );
}

/** Kartu statistik dengan count-up (untuk slide perjalanan). */
function CardStat({
  live,
  delay,
  overline,
  target,
  suffix,
  label,
  w = 96,
  pos,
}: {
  live: boolean;
  delay: number;
  overline: string;
  target: number;
  suffix?: string;
  label: string;
  w?: number;
  pos?: CSSProperties;
}) {
  const n = useCountUp(target, live, 1400);
  return (
    <FloatCard live={live} delay={delay} floatY={9} floatDur={7 + (delay % 3)} className={`rounded-[14px] border p-[9px] ${CARD} ${BORDER}`} style={{ width: w, ...pos }}>
      <Overline>{overline}</Overline>
      <p className="mt-[3px] text-[14px] font-extrabold leading-none tabular-nums text-[#FF5A00]">
        {n.toLocaleString("id-ID")}
        {suffix ? <span className={`text-[8px] font-bold ${INK2}`}>{suffix}</span> : null}
      </p>
      <p className={`mt-[3px] text-[5.5px] font-semibold uppercase tracking-[0.1em] ${INK2}`}>{label}</p>
    </FloatCard>
  );
}

/** Kartu hari beruntun (streak). */
function CardStreak({ live, delay, pos }: { live: boolean; delay: number; pos?: CSSProperties }) {
  const n = useCountUp(12, live, 1500);
  return (
    <FloatCard live={live} delay={delay} style={pos} floatY={10} floatDur={8} className={`w-[102px] rounded-[14px] border p-[9px] ${CARD} ${BORDER}`}>
      <div className="flex items-center gap-[4px]">
        <Flame size={10} className="text-[#FF5A00]" />
        <Overline>Beruntun</Overline>
      </div>
      <p className="mt-[3px] text-[14px] font-extrabold leading-none tabular-nums text-[#FF5A00]">
        {n} <span className={`text-[7px] font-bold ${INK2}`}>hari</span>
      </p>
      <div className="mt-[5px] flex gap-[2.5px]">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="h-[6px] flex-1 rounded-full bg-[#FF5A00]"
            style={{ opacity: live ? 1 : 0.25, transition: `opacity 300ms ease ${0.8 + i * 0.07}s` }}
          />
        ))}
      </div>
    </FloatCard>
  );
}

/** Ornamen bintang segi delapan melayang kecil. */
function DecoStar({ live, delay, className }: { live: boolean; delay: number; className: string }) {
  return (
    <m.span
      initial={{ opacity: 0, scale: 0, rotate: -30 }}
      animate={live ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0 }}
      transition={{ delay: live ? delay : 0, type: "spring", stiffness: 220, damping: 16 }}
      className={`tk-ob-float absolute z-10 ${className}`}
    >
      <Star8 size={13} className="text-[#FF5A00]/50 dark:text-[#FF9A52]/60" />
    </m.span>
  );
}

/* ======================= Komposisi per slide ======================= */

/** Panggung dengan parallax ringan: latar lambat, kartu lebih cepat. */
function Stage({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        className="absolute inset-0 flex items-center justify-center will-change-transform"
        style={{ transform: `translate(${-index * 7}px, ${index * 4}px)`, transition: "transform 0.75s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* SLIDE 1 — Selamat datang: ponsel besar Beranda + kartu melayang + logo. */
export function WelcomeArt({ live, index }: { live: boolean; index: number }) {
  return (
    <Stage index={index}>
      <FitStage>
        <PhoneMockup w={238} tilt={-3.5} live={live}>
          <HomeScreen />
        </PhoneMockup>
        <CardRingTarget live={live} delay={0.55} pos={{ left: -10, top: 26 }} />
        <CardNextPrayer live={live} delay={0.7} pos={{ right: -10, top: 64 }} />
        <CardActivities live={live} delay={0.85} pos={{ left: -10, bottom: 96 }} />
        {/* Logo resmi mengambang — bagian komposisi */}
        <m.div
          initial={{ opacity: 0, scale: 0.5, rotate: -16 }}
          animate={live ? { opacity: 1, scale: 1, rotate: 8 } : { opacity: 0, scale: 0.5 }}
          transition={{ delay: live ? 1 : 0, type: "spring", stiffness: 200, damping: 15 }}
          className="tk-ob-card-float absolute right-[-4px] bottom-[38px] z-20 will-change-transform"
          style={{ "--ob-float-y": "8px", "--ob-float-dur": "7.5s" } as CSSProperties}
        >
          <span className={`block rounded-[26%] p-[7px] ${CARD} ${FLOAT_SHADOW} ring-1 light:ring-black/[0.06] dark:ring-white/[0.09]`}>
            <SuioMark size={34} />
          </span>
        </m.div>
        <DecoStar live={live} delay={1.15} className="left-[30px] top-[6px]" />
        <DecoStar live={live} delay={1.3} className="bottom-[10px] left-[64px]" />
      </FitStage>
    </Stage>
  );
}

/* SLIDE 2 — Salat: ponsel halaman Sholat + tiket melayang berurutan. */
export function PrayerArt({ live, index }: { live: boolean; index: number }) {
  return (
    <Stage index={index}>
      <FitStage>
        <PhoneMockup w={228} tilt={2.8} live={live}>
          <PrayerScreen live={live} />
        </PhoneMockup>
        <CardPrayerDone live={live} delay={0.6} pos={{ left: -10, top: 78 }} />
        <CardPrayerActive live={live} delay={0.78} pos={{ right: -10, top: 190 }} />
        <CardMonthDots live={live} delay={0.95} pos={{ left: -10, bottom: 56 }} />
        <DecoStar live={live} delay={1.1} className="right-[36px] top-[28px]" />
      </FitStage>
    </Stage>
  );
}

/* SLIDE 3 — Al-Qur'an & zikir: ponsel naik dari bawah + kartu bacaan/tasbih. */
export function QuranArt({ live, index }: { live: boolean; index: number }) {
  return (
    <Stage index={index}>
      <FitStage>
        <PhoneMockup w={228} tilt={-2.6} live={live}>
          <QuranScreen />
        </PhoneMockup>
        <CardReading live={live} delay={0.62} pos={{ right: -10, top: 52 }} />
        <CardTasbih live={live} delay={0.8} pos={{ left: -10, top: 186 }} />
        <CardQuranTarget live={live} delay={0.98} pos={{ right: -10, bottom: 66 }} />
        <DecoStar live={live} delay={1.15} className="left-[28px] top-[10px]" />
        <DecoStar live={live} delay={1.3} className="bottom-[12px] right-[64px]" />
      </FitStage>
    </Stage>
  );
}

/* SLIDE 4 — Kebaikan harian: konstelasi kartu fitur (tanpa ponsel). */
export function GoodnessArt({ live, index }: { live: boolean; index: number }) {
  return (
    <Stage index={index}>
      <FitStage boxH={430} minScale={0.78}>
        {/* Tile logo besar sebagai jangkar komposisi */}
        <m.div
          initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
          animate={live ? { opacity: 1, scale: 1, rotate: -4 } : { opacity: 0, scale: 0.7 }}
          transition={{ delay: live ? 0.15 : 0, type: "spring", stiffness: 150, damping: 16 }}
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 will-change-transform"
        >
          <span
            className={`tk-ob-card-float block rounded-[30%] p-[16px] ${CARD} ${FLOAT_SHADOW}`}
            style={{ "--ob-float-y": "9px", "--ob-float-dur": "8s" } as CSSProperties}
          >
            <SuioMark size={86} />
          </span>
        </m.div>
        <CardAmal live={live} delay={0.4} pos={{ left: 4, top: 4 }} />
        <CardRizki live={live} delay={0.56} pos={{ right: 2, top: 96 }} />
        <CardBarakah live={live} delay={0.72} pos={{ left: 8, bottom: 84 }} />
        <CardJurnal live={live} delay={0.88} pos={{ right: 8, bottom: 10 }} />
        <DecoStar live={live} delay={1.05} className="left-[24px] top-[92px]" />
        <DecoStar live={live} delay={1.2} className="right-[54px] top-[30px]" />
      </FitStage>
    </Stage>
  );
}

/* SLIDE 5 — Perjalanan: ponsel statistik + kartu count-up melenting. */
export function JourneyArt({ live, index }: { live: boolean; index: number }) {
  return (
    <Stage index={index}>
      <FitStage>
        <PhoneMockup w={230} tilt={3} live={live}>
          <StatsScreen live={live} />
        </PhoneMockup>
        <CardStat live={live} delay={0.6} overline="Salat Minggu Ini" target={92} suffix="%" label="Penyelesaian" w={100} pos={{ left: -10, top: 70 }} />
        <CardStat live={live} delay={0.76} overline="Zikir Bulan Ini" target={1250} suffix="×" label="Total hitungan" w={106} pos={{ right: -10, top: 150 }} />
        <CardStreak live={live} delay={0.92} pos={{ left: -8, bottom: 60 }} />
        <DecoStar live={live} delay={1.1} className="right-[40px] bottom-[16px]" />
      </FitStage>
    </Stage>
  );
}

/* SLIDE 6 — Pemilihan tema: tiga pratinjau interaktif. */
export type ThemeModeOpt = "light" | "dark" | "system";

function ThemeMiniPreview({ mode }: { mode: ThemeModeOpt }) {
  return (
    <div className="relative h-[74px] w-full overflow-hidden rounded-[10px]">
      {mode === "light" && (
        <div className="absolute inset-0 bg-[#F7F5F2] p-[7px]">
          <div className="flex gap-[4px]">
            <span className="h-[10px] w-[10px] rounded-full bg-gradient-to-br from-[#FF9A52] to-[#FF5A00]" />
            <span className="h-[4px] flex-1 self-center rounded-full bg-[#202020]/15" />
          </div>
          <div className="mt-[5px] rounded-[7px] bg-white p-[5px] shadow-[0_2px_8px_-3px_rgba(50,38,28,0.25)]">
            <div className="h-[3px] w-1/2 rounded-full bg-[#202020]/25" />
            <div className="mt-[3px] h-[3px] w-3/4 rounded-full bg-[#202020]/10" />
            <div className="mt-[4px] h-[9px] w-[26px] rounded-full bg-[#FF5A00]" />
          </div>
          <div className="mt-[4px] rounded-[7px] bg-gradient-to-br from-[#FF5A00] to-[#D94B0A] p-[5px]">
            <div className="h-[3px] w-2/3 rounded-full bg-white/70" />
            <div className="mt-[2.5px] h-[3px] w-1/3 rounded-full bg-white/40" />
          </div>
        </div>
      )}
      {mode === "dark" && (
        <div className="absolute inset-0 bg-[#171717] p-[7px]">
          <div className="flex gap-[4px]">
            <span className="h-[10px] w-[10px] rounded-full bg-gradient-to-br from-[#FF9A52] to-[#FF5A00]" />
            <span className="h-[4px] flex-1 self-center rounded-full bg-white/20" />
          </div>
          <div className="mt-[5px] rounded-[7px] bg-[#24211F] p-[5px] ring-1 ring-white/[0.06]">
            <div className="h-[3px] w-1/2 rounded-full bg-[#F7F3EF]/40" />
            <div className="mt-[3px] h-[3px] w-3/4 rounded-full bg-[#F7F3EF]/15" />
            <div className="mt-[4px] h-[9px] w-[26px] rounded-full bg-[#FF5A00]" />
          </div>
          <div className="mt-[4px] rounded-[7px] bg-gradient-to-br from-[#FF5A00] to-[#D94B0A] p-[5px]">
            <div className="h-[3px] w-2/3 rounded-full bg-white/70" />
            <div className="mt-[2.5px] h-[3px] w-1/3 rounded-full bg-white/40" />
          </div>
        </div>
      )}
      {mode === "system" && (
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[#F7F5F2] p-[6px]">
            <div className="h-[8px] w-[8px] rounded-full bg-gradient-to-br from-[#FF9A52] to-[#FF5A00]" />
            <div className="mt-[4px] rounded-[6px] bg-white p-[4px] shadow-[0_2px_8px_-3px_rgba(50,38,28,0.25)]">
              <div className="h-[3px] w-2/3 rounded-full bg-[#202020]/25" />
              <div className="mt-[3px] h-[8px] w-[20px] rounded-full bg-[#FF5A00]" />
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[#171717] p-[6px]">
            <div className="ml-auto h-[8px] w-[8px] rounded-full bg-gradient-to-br from-[#FF9A52] to-[#FF5A00]" />
            <div className="mt-[4px] rounded-[6px] bg-[#24211F] p-[4px] ring-1 ring-white/[0.06]">
              <div className="h-[3px] w-2/3 rounded-full bg-[#F7F3EF]/40" />
              <div className="mt-[3px] h-[8px] w-[20px] rounded-full bg-[#FF5A00]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ThemePreviewArt({
  selected,
  onSelect,
  live,
}: {
  selected: ThemeModeOpt;
  onSelect: (mode: ThemeModeOpt) => void;
  live: boolean;
}) {
  const opts: { id: ThemeModeOpt; label: string; desc: string }[] = [
    { id: "light", label: "Terang", desc: "Hangat & bersih" },
    { id: "dark", label: "Gelap", desc: "Kalem & nyaman" },
    { id: "system", label: "Sistem", desc: "Ikuti perangkat" },
  ];
  return (
    <div role="radiogroup" aria-label="Pilih tema tampilan" className="flex w-full flex-col gap-[9px]">
      {opts.map((o, i) => {
        const on = selected === o.id;
        return (
          <m.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Tema ${o.label} — ${o.desc}`}
            onClick={() => onSelect(o.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={live ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ delay: live ? 0.15 + i * 0.09 : 0, duration: 0.45, ease: EASE }}
            whileTap={{ scale: 0.98 }}
            className={`flex w-full items-center gap-[10px] rounded-[16px] border p-[9px] text-left transition-shadow duration-300 ${CARD} ${BORDER} ${FLOAT_SHADOW} ${
              on ? "ring-2 ring-[#FF5A00]" : ""
            }`}
            style={on ? { boxShadow: "0 14px 34px -14px rgba(250,82,0,0.5)" } : undefined}
          >
            <span className={`w-[96px] shrink-0 ${on ? "" : "opacity-90"}`}>
              <ThemeMiniPreview mode={o.id} />
            </span>
            <span className="flex-1">
              <span className={`block text-[12.5px] font-bold ${INK}`}>{o.label}</span>
              <span className={`mt-[2px] block text-[9px] ${INK2}`}>{o.desc}</span>
            </span>
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                on ? "bg-[#FF5A00]" : "border-[1.6px] border-current opacity-30 light:text-[#202020] dark:text-[#F7F3EF]"
              }`}
            >
              {on && <Check size={11} strokeWidth={3.2} className="text-white" />}
            </span>
          </m.button>
        );
      })}
    </div>
  );
}

/* SLIDE 7 — Final: entrance logo + lockup + tagline. */
export function FinalArt({ live }: { live: boolean }) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Cincin halo di belakang logo */}
      {[112, 152].map((s, i) => (
        <m.span
          key={s}
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={live ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
          transition={{ delay: live ? 0.35 + i * 0.14 : 0, duration: 0.7, ease: EASE }}
          className="absolute rounded-full border border-[#FF5A00]/20 dark:border-[#FF9A52]/25"
          style={{ width: s, height: s }}
        />
      ))}
      <m.span
        initial={{ opacity: 0, scale: 0.35, rotate: -14 }}
        animate={live ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.35 }}
        transition={live ? { type: "spring", stiffness: 160, damping: 14, delay: 0.1 } : { duration: 0.2 }}
        className="relative will-change-transform"
        style={{ filter: "drop-shadow(0 18px 34px rgba(255,90,0,0.35))" }}
      >
        <SuioMark size={92} />
      </m.span>
      <m.span
        initial={{ opacity: 0, y: 12 }}
        animate={live ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: live ? 0.55 : 0, duration: 0.5, ease: EASE }}
        className="mt-[14px] text-center"
      >
        <span className={`block font-display text-[24px] font-extrabold leading-none tracking-[0.08em] ${INK}`}>SUIO</span>
        <span className={`mt-[6px] block text-[8.5px] font-semibold uppercase tracking-[0.26em] ${INK2}`}>Sujud in Order</span>
      </m.span>
      <m.span
        initial={{ opacity: 0, y: 10 }}
        animate={live ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: live ? 0.75 : 0, duration: 0.5, ease: EASE }}
        className={`tk-ob-card-float mt-[16px] inline-flex max-w-[250px] items-center gap-[6px] rounded-full px-[13px] py-[8px] text-center ${CARD2}`}
        style={{ "--ob-float-y": "5px", "--ob-float-dur": "7s" } as CSSProperties}
      >
        <MousePointerClick size={11} className="shrink-0 text-[#FF5A00]" />
        <span className={`text-[9.5px] font-semibold italic leading-snug ${INK}`}>Setiap Langkah Kecil, Menuju Istiqamah.</span>
      </m.span>
    </div>
  );
}
