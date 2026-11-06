"use client";

/**
 * Tazkiya — Ilustrasi onboarding v12 (murni SVG/CSS, tanpa aset eksternal).
 *
 * Tiga komposisi yang meniru komponen asli aplikasi: kartu jadwal salat,
 * cincin progres, chip Daily Barakah, dan mushaf — memakai palet identitas
 * terang Tazkiya (off-white #F2F2F4, kartu putih, oranye #FA5200) serta
 * khatam dari ornaments.tsx. Semua elemen dekoratif (aria-hidden).
 */

import { BookOpen, Heart, MoonStar } from "lucide-react";
import { Star8 } from "@/components/tazkiya/ornaments";

/* Palet tetap identitas terang — onboarding tidak mengikuti data-theme. */
const INK = "#17171B";
const MUTED = "#9A9AA2";
const ORANGE = "#FA5200";
const ORANGE_INK = "#E04A00";
const WARM = "#FFEDE3";

/** Latar dekoratif layar penuh: blob hangat, kisi khatam, ornamen mengambang. */
export function OnboardingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute -right-[72px] -top-[72px] h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(250,82,0,0.11),transparent_66%)]" />
      <div className="absolute -bottom-[70px] -left-[84px] h-[230px] w-[230px] rounded-full bg-[radial-gradient(circle,rgba(250,82,0,0.08),transparent_66%)]" />
      <div className="tk-ob-pattern absolute inset-x-0 top-0 h-[220px]" />
      <Star8 size={20} className="tk-ob-float absolute left-[7%] top-[15%] text-[#FA5200]/20" />
      <Star8 size={13} className="tk-ob-float tk-ob-float-delay absolute right-[9%] top-[32%] text-[#FA5200]/25" />
      <span className="tk-ob-float tk-ob-float-delay absolute bottom-[19%] right-[21%] h-2.5 w-2.5 rounded-full border-[1.5px] border-[#FA5200]/30" />
      <span className="tk-ob-float absolute bottom-[27%] left-[13%] h-2 w-2 rounded-full bg-[#FA5200]/20" />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Slide 1 — Perjalanan ibadah: lintasan titik-oranye menuju logo    */
/* ---------------------------------------------------------------- */
export function JourneyArt() {
  return (
    <div aria-hidden className="relative inline-block">
      <svg width="272" height="238" viewBox="0 0 272 238" fill="none" className="block h-auto w-full max-w-[272px]">
        <circle cx="136" cy="116" r="98" fill={WARM} opacity="0.8" />
        <g className="tk-ob-spin" style={{ transformOrigin: "136px 116px" }}>
          <circle cx="136" cy="116" r="111" stroke={ORANGE} strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="2.5 9.5" strokeLinecap="round" />
        </g>
        {/* Lintasan perjalanan: garis titik dari titik awal ke logo */}
        <path
          d="M36 192 C 80 176, 64 118, 112 102 S 190 118, 222 66"
          stroke={ORANGE}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="0.5 9"
        />
        <circle cx="36" cy="192" r="6.5" fill="#FFFFFF" stroke={ORANGE} strokeWidth="2.5" />
        <circle cx="112" cy="102" r="4" fill={ORANGE} opacity="0.45" />
        <circle cx="176" cy="104" r="3" fill={ORANGE} opacity="0.3" />
      </svg>
      {/* Ujung perjalanan: kartu logo Tazkiya dengan halo */}
      <div className="absolute right-[14px] top-[26px]">
        <span className="absolute inset-0 -m-2 rounded-[1.2rem] bg-[#FA5200]/15" />
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-[1rem] text-xl font-bold text-white"
          style={{ background: ORANGE, boxShadow: "0 14px 30px -12px rgba(250,82,0,0.6)" }}
        >
          ت
        </div>
      </div>
      {/* Khatam di tengah lintasan + ornamen mengambang */}
      <Star8 size={21} className="absolute left-[34%] top-[33.5%] text-[#FA5200]" />
      <Star8 size={15} className="tk-ob-float absolute left-[6%] top-[22%] text-[#FA5200]/30" />
      <Star8 size={11} className="tk-ob-float tk-ob-float-delay absolute bottom-[16%] right-[24%] text-[#FA5200]/40" />
      <span className="tk-ob-float tk-ob-float-delay absolute bottom-[24%] left-[18%] h-2 w-2 rounded-full bg-[#FA5200]/25" />
      <span className="tk-ob-float absolute right-[8%] bottom-[34%] h-1.5 w-1.5 rounded-full bg-[#FA5200]/30" />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Slide 2 — Ibadah harian: kartu jadwal salat mini ala aplikasi     */
/* ---------------------------------------------------------------- */
const PRAYER_ROWS = [
  { name: "Subuh", time: "04:32", state: "done" as const },
  { name: "Zuhur", time: "11:58", state: "next" as const },
  { name: "Asar", time: "15:14", state: "idle" as const },
];

export function IbadahArt() {
  return (
    <div aria-hidden className="relative h-[238px] w-[272px]">
      {/* Kartu jadwal — miniatur komponen salat aplikasi */}
      <div
        className="absolute left-1/2 top-[10px] w-[210px] -translate-x-1/2 rounded-[1.3rem] bg-white p-4"
        style={{ boxShadow: "0 22px 44px -24px rgba(23,23,27,0.22)" }}
      >
        <p className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>
          Jadwal Salat
        </p>
        <div className="mt-2 space-y-2">
          {PRAYER_ROWS.map((r) => (
            <div key={r.name} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={
                  r.state === "done"
                    ? { background: ORANGE }
                    : r.state === "next"
                      ? { border: `2px solid ${ORANGE}` }
                      : { background: "#ECECEF" }
                }
              />
              <span className="flex-1 text-[11.5px] font-bold" style={{ color: INK, opacity: r.state === "idle" ? 0.45 : 1 }}>
                {r.name}
              </span>
              <span className="tnum text-[10px] font-semibold" style={{ color: r.state === "idle" ? "#C9C9CF" : MUTED }}>
                {r.time}
              </span>
              {r.state === "done" && (
                <span className="flex items-center gap-0.5 rounded-full px-1.5 py-[3px] text-[7.5px] font-bold text-white" style={{ background: ORANGE }}>
                  Selesai
                </span>
              )}
              {r.state === "next" && (
                <span className="rounded-full border px-1.5 py-[2px] text-[7.5px] font-bold" style={{ borderColor: "rgba(250,82,0,0.45)", color: ORANGE_INK }}>
                  Berikutnya
                </span>
              )}
            </div>
          ))}
        </div>
        {/* Strip kalender 7 hari — 5 terisi */}
        <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "#F0F0F3" }}>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <span key={d} className="h-[9px] w-[15px] rounded-[3.5px]" style={{ background: d < 5 ? "rgba(250,82,0,0.85)" : "#F0F0F3" }} />
          ))}
        </div>
      </div>
      {/* Chip rentetan hangat */}
      <div
        className="absolute left-0 top-0 flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
        style={{ background: WARM, boxShadow: "0 10px 22px -14px rgba(224,74,0,0.5)" }}
      >
        <Star8 size={10} className="text-[#E04A00]" />
        <span className="text-[9.5px] font-bold" style={{ color: "#C24A00" }}>
          7 hari beruntun
        </span>
      </div>
      {/* Kartu cincin progres */}
      <div
        className="absolute bottom-0 right-0 flex items-center gap-2 rounded-[1.1rem] bg-white p-3"
        style={{ boxShadow: "0 22px 44px -22px rgba(23,23,27,0.26)" }}
      >
        <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="18" stroke="#F0F0F3" strokeWidth="5" />
          <circle
            cx="22"
            cy="22"
            r="18"
            stroke={ORANGE}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="90.5 113.1"
            transform="rotate(-90 22 22)"
          />
        </svg>
        <div>
          <p className="tnum text-[12.5px] font-extrabold leading-none" style={{ color: INK }}>
            4/5
          </p>
          <p className="mt-1 text-[8px] font-semibold leading-none" style={{ color: MUTED }}>
            Ibadah hari ini
          </p>
        </div>
      </div>
      <Star8 size={14} className="tk-ob-float absolute right-[18px] top-[36px] text-[#FA5200]/35" />
      <span className="tk-ob-float tk-ob-float-delay absolute bottom-[64px] left-[10px] h-2 w-2 rounded-full bg-[#FA5200]/25" />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Slide 3 — Perjalanan barakah: mushaf + chip Daily Barakah          */
/* ---------------------------------------------------------------- */
const BARAKAH_CHIPS = [
  { icon: BookOpen, title: "Al-Qur'an", sub: "3 halaman hari ini" },
  { icon: MoonStar, title: "Zikir 33×", sub: "Tasbih digital" },
  { icon: Heart, title: "Jurnal Syukur", sub: "2 catatan baru" },
];

export function BarakahArt() {
  return (
    <div aria-hidden className="relative h-[238px] w-[272px]">
      {/* Mushaf tertutup dengan punggung oranye + khatam */}
      <div
        className="absolute left-[4px] top-[12px] h-[158px] w-[122px] -rotate-6 rounded-[0.7rem] bg-white"
        style={{ boxShadow: "0 26px 50px -26px rgba(23,23,27,0.3)" }}
      >
        <span className="absolute inset-y-[7px] left-[7px] right-[7px] rounded-[0.45rem] border-[1.5px] border-[#FA5200]/25" />
        <span className="absolute bottom-0 left-0 top-0 w-[9px] rounded-bl-[0.7rem] rounded-tl-[0.7rem]" style={{ background: ORANGE }} />
        <Star8 size={30} className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-[#FA5200]" />
        <span className="absolute bottom-[22%] left-1/2 h-[1.5px] w-10 -translate-x-1/2 rounded-full bg-[#FA5200]/35" />
        <span className="absolute bottom-[17%] left-1/2 h-[1.5px] w-6 -translate-x-1/2 rounded-full bg-[#FA5200]/25" />
      </div>
      {/* Chip barakah — miniatur Daily Barakah */}
      <div className="absolute right-0 top-[6px] flex w-[132px] flex-col gap-2">
        {BARAKAH_CHIPS.map((c) => (
          <div
            key={c.title}
            className="flex items-center gap-2 rounded-xl bg-white p-2"
            style={{ boxShadow: "0 16px 34px -22px rgba(23,23,27,0.24)" }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: WARM, color: ORANGE_INK }}>
              <c.icon size={13} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[9.5px] font-bold leading-none" style={{ color: INK }}>
                {c.title}
              </p>
              <p className="mt-[3px] truncate text-[8px] font-medium leading-none" style={{ color: MUTED }}>
                {c.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Bilah target harian */}
      <div
        className="absolute bottom-[6px] left-1/2 flex w-[212px] -translate-x-1/2 items-center gap-2.5 rounded-full bg-white px-3.5 py-2.5"
        style={{ boxShadow: "0 18px 40px -22px rgba(23,23,27,0.28)" }}
      >
        <span className="whitespace-nowrap text-[9px] font-bold" style={{ color: INK }}>
          Target harian
        </span>
        <span className="h-1.5 flex-1 rounded-full bg-[#F0F0F3]">
          <span className="block h-full w-[60%] rounded-full" style={{ background: ORANGE }} />
        </span>
        <span className="tnum text-[9px] font-extrabold" style={{ color: ORANGE_INK }}>
          60%
        </span>
      </div>
      <Star8 size={13} className="tk-ob-float absolute left-[10px] top-0 text-[#FA5200]/35" />
      <Star8 size={10} className="tk-ob-float tk-ob-float-delay absolute bottom-[46px] right-[6px] text-[#FA5200]/40" />
    </div>
  );
}
