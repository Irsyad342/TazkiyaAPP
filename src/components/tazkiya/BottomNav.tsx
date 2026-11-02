"use client";

/**
 * Tazkiya — Navigasi bawah dengan 5 menu utama:
 * Beranda · Al-Qur'an · Sholat · Progress · Profil.
 * Ikon konsisten (Lucide, satu gaya), menu aktif berupa pil ungu solid,
 * indikator jelas, transisi halus, dua tema.
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
      className="pointer-events-auto absolute inset-x-3 bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass-strong relative flex items-center justify-around gap-0.5 rounded-[1.6rem] px-2 py-2">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-tz-violet/60 to-transparent"
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
              className={cn(
                "tap relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-all duration-200 active:scale-95",
                isActive
                  ? "bg-tz-violet shadow-[0_10px_24px_-12px_rgba(85,51,154,0.85)]"
                  : "border border-transparent"
              )}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={cn("transition-colors duration-200", isActive ? "text-white" : "text-tz-muted")}
              />
              <span
                className={cn(
                  "text-[9.5px] font-medium leading-none transition-colors duration-200",
                  isActive ? "text-white" : "text-tz-muted"
                )}
              >
                {label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-[3px] h-1 w-1 rounded-full transition-all duration-200",
                  isActive ? "bg-white/85" : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
