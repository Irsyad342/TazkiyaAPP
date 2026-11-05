"use client";

/**
 * Tazkiya — Navigasi bawah dengan 5 menu utama:
 * Beranda · Al-Qur'an · Sholat · Progress · Profil.
 * Gaya redesign: bilah putih mengambang dengan sudut besar, item aktif
 * berupa pil hijau emerald bergradasi dengan titik lime — sesuai referensi.
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
      <div className="glass-strong relative flex items-center justify-around gap-0.5 rounded-[1.7rem] px-2 py-2">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-tz-violet/40 to-transparent"
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
                  ? "bg-gradient-to-br from-[#4ade80] to-[#16a34a] shadow-[0_10px_22px_-10px_rgba(22,163,74,0.75)]"
                  : "border border-transparent"
              )}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={cn("transition-colors duration-200", isActive ? "text-white dark:text-[#06251a]" : "text-tz-muted")}
              />
              <span
                className={cn(
                  "text-[9.5px] font-semibold leading-none transition-colors duration-200",
                  isActive ? "text-white dark:text-[#06251a]" : "text-tz-muted"
                )}
              >
                {label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-[3px] h-1 w-1 rounded-full transition-all duration-200",
                  isActive ? "bg-tz-lime" : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
