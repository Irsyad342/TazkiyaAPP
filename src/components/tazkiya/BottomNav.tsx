"use client";

/**
 * Tazkiya v3 — Navigasi bawah dengan 5 menu utama:
 * Beranda · Al-Qur'an · Sholat · Progress · Profil.
 * Gaya "Aurora Pastel": kapsul putih mengambang; item aktif berupa
 * gelembung bulat bergradien aurora (ungu→biru) dengan titik lime,
 * item lain berupa ikon lembut — komposisi berbeda dari pil persegi.
 */

import { BookOpen, ChartColumn, CircleUserRound, House, MoonStar } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "beranda" | "quran" | "sholat" | "progress" | "profil";

/** Sub-halaman penuh yang dibuka dari Beranda (bukan modal). */
export type SubPageId = "jurnal" | "zikir-doa" | "rizq-amal";

const TABS: { id: TabId; label: string; icon: typeof House }[] = [
  { id: "beranda", label: "Beranda", icon: House },
  { id: "quran", label: "Al-Qur'an", icon: BookOpen },
  { id: "sholat", label: "Sholat", icon: MoonStar },
  { id: "progress", label: "Progress", icon: ChartColumn },
  { id: "profil", label: "Profil", icon: CircleUserRound },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="pointer-events-auto absolute inset-x-4 bottom-0 z-30 pb-[max(0.8rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass-strong relative flex items-end justify-around gap-0.5 rounded-[1.9rem] px-3 pt-2.5 pb-2">
        {/* aksen tepi atas: sapuan aurora tipis */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-tz-lavender/60 to-transparent"
        />
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={`Buka menu ${label}`}
              onClick={() => onChange(id)}
              className="tap relative flex min-h-[54px] flex-1 flex-col items-center justify-start gap-1 px-1 py-1"
            >
              <span
                aria-hidden
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-[1.05rem] transition-all duration-200",
                  isActive
                    ? "-translate-y-0.5 bg-gradient-to-br from-[#8b7cf8] via-[#6c5ce7] to-[#5b8def] shadow-[0_10px_20px_-8px_rgba(108,92,231,0.65)]"
                    : "bg-transparent"
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.3 : 1.8}
                  className={cn("transition-colors duration-200", isActive ? "text-white" : "text-tz-muted")}
                />
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-tz-lime shadow-[0_0_8px_2px_rgba(207,240,92,0.55)]"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[9.5px] font-semibold leading-none transition-colors duration-200",
                  isActive ? "font-bold text-tz-ink" : "text-tz-muted"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
