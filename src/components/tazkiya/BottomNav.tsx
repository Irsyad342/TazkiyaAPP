"use client";

/**
 * Tazkiya — Navigasi bawah mengambang (floating pill) dengan 5 menu utama:
 * Beranda · Al-Qur'an · Sholat · Progress · Profil.
 * Item aktif = lingkaran tinta penuh dengan ikon terang (mengikuti bahasa
 * visual referensi), label kecil di bawahnya; transisi halus, dua tema.
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
      className="pointer-events-auto absolute inset-x-3 bottom-0 z-30 pb-[max(0.85rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative flex items-center justify-around gap-0.5 rounded-full border border-tz-line bg-tz-panel px-2 py-2 shadow-[0_18px_44px_-16px_rgba(20,16,40,0.35)] light:shadow-[0_18px_44px_-18px_rgba(84,70,160,0.35)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={`Buka menu ${label}`}
              onClick={() => onChange(id)}
              className="tap relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1"
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                  isActive
                    ? "scale-105 bg-tz-ink text-tz-frame shadow-[0_8px_18px_-8px_rgba(29,28,39,0.65)] light:bg-tz-ink light:text-white"
                    : "bg-transparent text-tz-muted"
                )}
              >
                <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />
              </span>
              <span
                className={cn(
                  "text-[9.5px] font-semibold leading-none transition-colors duration-200",
                  isActive ? "text-tz-ink" : "text-tz-muted"
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
