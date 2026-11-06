"use client";

/**
 * SUIO v13 — Ilustrasi onboarding "premium floating interface".
 *
 * Komposisi murni DOM/SVG yang meniru KOMPONEN ASLI aplikasi (jadwal salat,
 * cincin progres, kalender aktivitas, mushaf Al-Qur'an, tasbih, Daily
 * Barakah, Rizq & Amal, Jurnal Syukur, mood) sebagai kartu mengambang:
 * rotasi kecil, bayangan lembut, float dengan kecepatan berbeda antar kartu
 * agar terasa punya kedalaman. Semua warna memakai varian light:/dark:
 * sehingga mengikuti data-theme yang sama dengan aplikasi.
 *
 * Preferensi gerak: float via framer-motion di bawah MotionConfig
 * reducedMotion="user"; dekorasi CSS memakai kelas tk-ob-* yang sudah
 * dinonaktifkan untuk prefers-reduced-motion dan data-anim="off".
 */

import { m } from "framer-motion";
import { BookOpen, Heart, MoonStar, Sparkles } from "lucide-react";
import { Star8 } from "@/components/tazkiya/ornaments";
import { SuioMark } from "@/components/tazkiya/brand";

/* ---------- Kelas permukaan kartu (tema-aware) ---------- */
const CARD =
  "light:bg-white dark:bg-[#26242e] light:text-[#17171b] dark:text-white light:border dark:border-white/[0.07] light:border-black/[0.04] light:shadow-[0_30px_60px_-30px_rgba(60,45,110,0.28)] dark:shadow-[0_30px_64px_-28px_rgba(0,0,0,0.8)]";
const SUB = "light:text-[#6f6b7a] dark:text-[#a5a1b3]";
const FAINT = "light:text-[#9a96a5] dark:text-[#77737f]";
const HAIR = "light:border-[#eceaf2] dark:border-white/[0.08]";
const ORANGE = "#FA5200";
const LAV = "light:bg-[#f3f0fa] dark:bg-[#2e2a3a]";
const CAL_FILLED = new Set([0, 1, 2, 4, 5, 8, 9, 12, 15, 16, 17, 19, 22, 23]);

/* ---------- Pembungkus float: naik-turun kecil, tiap kartu beda tempo ---------- */
function Float({
  y = 7,
  dur = 6,
  delay = 0,
  className,
  children,
}: {
  y?: number;
  dur?: number;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <m.div
      className={className}
      animate={{ y: [0, -y, 0] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </m.div>
  );
}

/* Kartu berotasi + float: rotasi statik di pembungkus, float di dalam. */
function TiltCard({
  rot = 0,
  className = "",
  children,
}: {
  rot?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-hidden style={{ transform: `rotate(${rot}deg)` }} className={className}>
      <Float>{children}</Float>
    </div>
  );
}

/* Baris jadwal salat mini — meniru halaman Sholat. */
function PrayerRow({ name, time, state }: { name: string; time: string; state: "done" | "next" | "idle" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-[7px] w-[7px] shrink-0 rounded-full ${state === "idle" ? "light:bg-[#e6e3ee] dark:bg-[#3a3745]" : ""}`}
        style={
          state === "done"
            ? { background: ORANGE }
            : state === "next"
              ? { border: `2px solid ${ORANGE}` }
              : undefined
        }
      />
      <span className={`flex-1 text-[10.5px] font-bold ${state === "idle" ? "opacity-45" : ""}`}>{name}</span>
      <span className={`tnum text-[9px] font-semibold ${state === "idle" ? FAINT : SUB}`}>{time}</span>
      {state === "done" && (
        <span className="rounded-full px-1.5 py-[2.5px] text-[6.5px] font-bold text-white" style={{ background: ORANGE }}>
          Selesai
        </span>
      )}
      {state === "next" && (
        <span
          className="rounded-full border px-1.5 py-[2px] text-[6.5px] font-bold"
          style={{ borderColor: "rgba(250,82,0,0.45)", color: ORANGE }}
        >
          Berikutnya
        </span>
      )}
    </div>
  );
}

/* Cincin progres persentase — meniru widget tracker. */
function Ring({ pct, label, value }: { pct: number; label: string; value: string }) {
  const C = 2 * Math.PI * 17;
  return (
    <div className={`flex items-center gap-2 rounded-2xl p-2.5 pr-3.5 ${CARD}`}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="17" strokeWidth="4.5" className="light:stroke-[#eceaf2] dark:stroke-[#3a3745]" />
        <circle
          cx="20"
          cy="20"
          r="17"
          stroke={ORANGE}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <div>
        <p className="tnum text-[11px] font-extrabold leading-none">{value}</p>
        <p className={`mt-1 text-[7.5px] font-semibold leading-none ${SUB}`}>{label}</p>
      </div>
    </div>
  );
}

/* ================================================================
   SLIDE 1, Welcome to SUIO: logo elegan + kartu identitas melayang
   ================================================================ */
export function WelcomeArt() {
  return (
    <div aria-hidden className="relative h-[236px] w-[286px]">
      {/* Kartu logo pusat */}
      <TiltCard rot={-2.5} className="absolute left-1/2 top-[26px] -translate-x-1/2">
        <div className={`flex items-center gap-3 rounded-[1.4rem] px-5 py-4 ${CARD}`}>
          <SuioMark size={46} glow />
          <div>
            <p className="font-display text-[16px] font-extrabold leading-none tracking-[0.08em]">SUIO</p>
            <p className={`mt-[5px] text-[7px] font-semibold uppercase leading-none tracking-[0.22em] ${SUB}`}>
              Sujud in Order
            </p>
          </div>
        </div>
      </TiltCard>

      {/* Kartu jadwal salat kiri-bawah */}
      <TiltCard rot={4} className="absolute bottom-[6px] left-0">
        <div className={`w-[150px] rounded-[1.2rem] p-3.5 ${CARD}`}>
          <p className={`gs-overline text-[7px]`}>Jadwal Salat</p>
          <div className="mt-2 space-y-[7px]">
            <PrayerRow name="Subuh" time="04:32" state="done" />
            <PrayerRow name="Zuhur" time="11:58" state="next" />
          </div>
        </div>
      </TiltCard>

      {/* Kartu progres ibadah kanan-bawah */}
      <TiltCard rot={-5} className="absolute bottom-[16px] right-0">
        <Ring pct={80} value="4/5" label="Ibadah hari ini" />
      </TiltCard>

      {/* Chip aktivitas harian (mood) kanan-atas */}
      <TiltCard rot={3} className="absolute right-[6px] top-0">
        <div className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 ${CARD}`}>
          <img src="/mood/tenang.png" alt="" className="h-6 w-6 rounded-lg" />
          <span className="text-[8.5px] font-bold leading-none">Aktivitas harian</span>
        </div>
      </TiltCard>

      <Star8 size={15} className="tk-ob-float absolute left-[16px] top-[10px] text-[#FA5200]/40" />
      <span className="tk-ob-float tk-ob-float-delay absolute bottom-[44px] right-[150px] h-2 w-2 rounded-full bg-[#FA5200]/35" />
      <span className="tk-ob-float absolute right-[10px] top-[74px] h-1.5 w-1.5 rounded-full light:bg-[#8b7cf8]/50 dark:bg-[#a99cf5]/45" />
    </div>
  );
}

/* ================================================================
   SLIDE 2, Worship journey: jadwal 5 waktu + kalender + tracker
   ================================================================ */
export function IbadahArt() {
  return (
    <div aria-hidden className="relative h-[236px] w-[286px]">
      {/* Kartu utama: jadwal lima waktu */}
      <TiltCard rot={-1.5} className="absolute left-[10px] top-[4px]">
        <div className={`w-[186px] rounded-[1.3rem] p-4 ${CARD}`}>
          <p className="gs-overline text-[7px]">Jadwal Salat</p>
          <div className="mt-2 space-y-[7px]">
            <PrayerRow name="Subuh" time="04:32" state="done" />
            <PrayerRow name="Zuhur" time="11:58" state="done" />
            <PrayerRow name="Asar" time="15:14" state="next" />
            <PrayerRow name="Magrib" time="17:58" state="idle" />
            <PrayerRow name="Isya" time="19:12" state="idle" />
          </div>
        </div>
      </TiltCard>

      {/* Kalender aktivitas kanan-atas (bertumpuk di atas kartu utama) */}
      <TiltCard rot={4} className="absolute right-0 top-[14px]">
        <div className={`w-[112px] rounded-[1.1rem] p-3 ${CARD}`}>
          <p className="text-[7.5px] font-bold leading-none">Kalender</p>
          <p className={`mt-[3px] text-[6.5px] font-semibold leading-none ${SUB}`}>aktivitas</p>
          <div className="mt-2 grid grid-cols-7 gap-[3.5px]">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className={`h-[6.5px] w-[6.5px] rounded-[2px] ${CAL_FILLED.has(i) ? "" : "light:bg-[#eceaf2] dark:bg-[#3a3745]"}`}
                style={CAL_FILLED.has(i) ? { background: "rgba(250,82,0,0.85)" } : undefined}
              />
            ))}
          </div>
        </div>
      </TiltCard>

      {/* Cincin progres tengah */}
      <TiltCard rot={5} className="absolute left-0 top-[120px]">
        <Ring pct={80} value="4/5" label="Ibadah hari ini" />
      </TiltCard>

      {/* Progress tracker kanan-bawah */}
      <TiltCard rot={-3} className="absolute bottom-[8px] right-[2px]">
        <div className={`w-[132px] rounded-[1.1rem] p-3 ${CARD}`}>
          <div className="flex items-center justify-between">
            <p className="text-[7.5px] font-bold leading-none">Target harian</p>
            <p className="tnum text-[7.5px] font-extrabold leading-none" style={{ color: ORANGE }}>
              60%
            </p>
          </div>
          <span className="mt-2 block h-[6px] rounded-full light:bg-[#eceaf2] dark:bg-[#3a3745]">
            <span className="block h-full w-[60%] rounded-full" style={{ background: ORANGE }} />
          </span>
        </div>
      </TiltCard>

      <span className="tk-ob-float absolute left-[2px] top-[6px] h-2 w-2 rounded-full bg-[#FA5200]/35" />
      <Star8 size={12} className="tk-ob-float tk-ob-float-delay absolute bottom-[6px] left-[128px] text-[#FA5200]/45" />
    </div>
  );
}

/* ================================================================
   SLIDE 3, Quran & dhikr: mushaf, progres baca, kartu zikir
   ================================================================ */
export function QuranArt() {
  return (
    <div aria-hidden className="relative h-[236px] w-[286px]">
      {/* Kartu mushaf utama dengan ayat Arab asli */}
      <TiltCard rot={1.5} className="absolute left-[26px] top-[6px]">
        <div className={`w-[208px] rounded-[1.3rem] p-4 ${CARD}`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${LAV}`} style={{ color: ORANGE }}>
              <BookOpen size={12} />
            </span>
            <p className="text-[9.5px] font-bold leading-none">QS Al-Insyirah</p>
            <span className={`ml-auto tnum text-[7.5px] font-semibold ${FAINT}`}>ayat 6</span>
          </div>
          <p className="quran-arabic mt-3 text-right text-[14.5px] leading-[1.9]">فَإِنَّ مَعَ الْعُسْرِ يُسْرًا</p>
          <p className={`mt-1 text-[8px] leading-relaxed ${SUB}`}>Maka sesungguhnya bersama kesulitan ada kemudahan.</p>
          <div className={`mt-3 flex items-center gap-2 border-t pt-2.5 ${HAIR}`}>
            <span className="h-[5px] flex-1 rounded-full light:bg-[#eceaf2] dark:bg-[#3a3745]">
              <span className="block h-full w-[60%] rounded-full" style={{ background: ORANGE }} />
            </span>
            <span className="tnum text-[7.5px] font-extrabold" style={{ color: ORANGE }}>
              3/5 halaman
            </span>
          </div>
        </div>
      </TiltCard>

      {/* Kartu zikir kanan-bawah */}
      <TiltCard rot={-4} className="absolute bottom-[10px] right-0">
        <div className={`flex items-center gap-2.5 rounded-[1.1rem] p-3 pr-4 ${CARD}`}>
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${LAV}`} style={{ color: ORANGE }}>
            <MoonStar size={14} />
          </span>
          <div>
            <p className="text-[9px] font-bold leading-none">Zikir &amp; Doa</p>
            <p className={`mt-[3px] text-[7.5px] font-semibold leading-none ${SUB}`}>Tasbih digital 33×</p>
          </div>
        </div>
      </TiltCard>

      {/* Chip progres membaca kiri-atas */}
      <TiltCard rot={-3} className="absolute left-0 top-[2px]">
        <div className={`flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3 ${CARD}`}>
          <Sparkles size={10} style={{ color: ORANGE }} />
          <span className="text-[8px] font-bold leading-none">Al-Kahf, 2 halaman</span>
        </div>
      </TiltCard>

      <Star8 size={16} className="tk-ob-float absolute right-[18px] top-[36px] text-[#FA5200]/40" />
      <span className="tk-ob-float tk-ob-float-delay absolute bottom-[52px] left-[12px] h-2 w-2 rounded-full light:bg-[#8b7cf8]/45 dark:bg-[#a99cf5]/40" />
      <span className="tk-ob-float absolute left-[38px] bottom-[6px] h-1.5 w-1.5 rounded-full bg-[#FA5200]/40" />
    </div>
  );
}

/* ================================================================
   SLIDE 4, Daily Barakah: amal, rizki, jurnal syukur, barakah
   ================================================================ */
export function BarakahArt() {
  return (
    <div aria-hidden className="relative h-[236px] w-[286px]">
      {/* Kartu utama: Daily Barakah */}
      <TiltCard rot={-1.5} className="absolute right-[8px] top-[10px]">
        <div className={`w-[196px] rounded-[1.3rem] p-4 ${CARD}`}>
          <div className="flex items-center gap-2.5">
            <span
              className="tk-octagram flex h-7 w-7 shrink-0 items-center justify-center text-[9px] font-extrabold text-white"
              style={{ background: ORANGE }}
            >
              01
            </span>
            <p className="text-[8.5px] font-extrabold uppercase leading-none tracking-[0.1em]" style={{ color: ORANGE }}>
              Niat Hari Ini
            </p>
          </div>
          <p className="mt-2.5 text-[10px] font-semibold leading-relaxed">
            Aku berniat menghilangkan satu kesulitan dari orang lain ini.
          </p>
        </div>
      </TiltCard>

      {/* Kartu Rizq & Amal kiri-bawah */}
      <TiltCard rot={4} className="absolute bottom-[14px] left-0">
        <div className={`w-[150px] rounded-[1.2rem] p-3.5 ${CARD}`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${LAV}`} style={{ color: ORANGE }}>
              <Heart size={11} />
            </span>
            <p className="text-[9px] font-bold leading-none">Rizq &amp; Amal</p>
          </div>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="gs-display text-[22px] font-extrabold leading-none">3</span>
            <span className={`text-[7.5px] font-semibold leading-tight ${SUB}`}>kebaikan tercatat hari ini</span>
          </div>
        </div>
      </TiltCard>

      {/* Kartu Jurnal Syukur kanan-bawah */}
      <TiltCard rot={-5} className="absolute bottom-[2px] right-[4px]">
        <div className={`w-[124px] rounded-[1.1rem] p-3 ${CARD}`}>
          <span className="gs-display block text-[20px] font-extrabold leading-[0.6]" style={{ color: ORANGE }}>
            &ldquo;
          </span>
          <p className="mt-1.5 text-[8.5px] font-bold leading-none">Jurnal Syukur</p>
          <p className={`mt-1 text-[7px] font-semibold leading-relaxed ${SUB}`}>Tiga hal kecil yang layak disyukuri.</p>
        </div>
      </TiltCard>

      <Star8 size={14} className="tk-ob-float absolute left-[10px] top-[16px] text-[#FA5200]/40" />
      <span className="tk-ob-float tk-ob-float-delay absolute right-[26px] top-[2px] h-2 w-2 rounded-full bg-[#FA5200]/35" />
    </div>
  );
}

/* ================================================================
   FINAL, Mulai perjalananmu: logo besar dengan glow lembut
   ================================================================ */
export function FinalArt() {
  return (
    <div aria-hidden className="relative flex h-[236px] w-[286px] items-center justify-center">
      <span
        className="absolute h-[150px] w-[150px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(250,82,0,0.18), transparent 68%)" }}
      />
      <m.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Float y={8} dur={5.5}>
          <SuioMark size={88} radius={24} glow />
        </Float>
      </m.div>
      <TiltCard rot={4} className="absolute left-[6px] top-[26px]">
        <div className={`flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3 ${CARD}`}>
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: ORANGE }} />
          <span className="text-[8px] font-bold leading-none">Subuh, 04:32</span>
        </div>
      </TiltCard>
      <TiltCard rot={-4} className="absolute bottom-[30px] right-[2px]">
        <div className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 ${CARD}`}>
          <img src="/mood/bersyukur.png" alt="" className="h-6 w-6 rounded-lg" />
          <span className="text-[8px] font-bold leading-none">Bersyukur</span>
        </div>
      </TiltCard>
      <Star8 size={13} className="tk-ob-float tk-ob-float-delay absolute right-[44px] top-[8px] text-[#FA5200]/40" />
    </div>
  );
}
