"use client";

/**
 * Tazkiya v6 "Ember" — Navigasi ganda sesuai perangkat:
 * - BottomNav  : bar kapsul gelap mengambang (mobile) — item aktif berupa
 *                PIL ORANGE penuh dengan ikon + label putih, item lain
 *                ikon abu tenang; satu-satunya permukaan berbayang.
 * - SidebarNav : sidebar arang gelap (desktop lg+) — brand, menu utama,
 *                refleksi; aktif = pil orange.
 */

import { BookOpen, ChartColumn, CircleUserRound, House, MoonStar, NotebookPen, HandCoins, Sparkles } from "lucide-react";
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

const REFLEKSI: { id: SubPageId; label: string; icon: typeof NotebookPen }[] = [
  { id: "jurnal", label: "Jurnal Syukur", icon: NotebookPen },
  { id: "zikir-doa", label: "Zikir & Doa", icon: Sparkles },
  { id: "rizq-amal", label: "Rizq & Amal", icon: HandCoins },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] bg-tz-violet text-base font-bold text-white">ت</span>
      <span>
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em] text-tz-ink">Tazkiya</span>
        <span className="block text-[8.5px] font-bold uppercase tracking-[0.22em] text-tz-deep">A Better Daily Journey</span>
      </span>
    </div>
  );
}

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
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between gap-0.5 rounded-[1.6rem] border border-tz-line bg-tz-panel-soft/95 p-1.5 shadow-[0_18px_48px_-16px_rgba(0,0,0,0.65)] backdrop-blur-md">
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
                "tap relative flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-[1.25rem] px-1 transition-colors duration-200",
                isActive ? "bg-tz-violet" : "bg-transparent"
              )}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.1 : 1.8}
                className={cn("shrink-0 transition-colors duration-200", isActive ? "text-white" : "text-tz-muted")}
              />
              <span
                className={cn(
                  "text-[10px] leading-none transition-colors duration-200",
                  isActive ? "font-bold text-white" : "hidden font-semibold text-tz-muted sm:inline"
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

export function SidebarNav({
  active,
  onChange,
  subpage,
  onOpenSubpage,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  subpage: SubPageId | null;
  onOpenSubpage: (id: SubPageId) => void;
}) {
  return (
    <aside
      aria-label="Navigasi samping"
      className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-tz-line bg-tz-panel-soft px-5 py-7 lg:flex"
    >
      <Brand />

      <p className="v5-overline mb-2 mt-9 px-2">Menu</p>
      <nav className="flex flex-col gap-0.5" aria-label="Menu utama">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = subpage === null && active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(id)}
              className={cn(
                "tap flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 text-[14px] transition-colors",
                isActive ? "bg-tz-violet font-bold text-white" : "font-medium text-tz-muted hover:bg-tz-panel hover:text-tz-ink"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} />
              {label}
            </button>
          );
        })}
      </nav>

      <p className="v5-overline mb-2 mt-7 px-2">Refleksi</p>
      <nav className="flex flex-col gap-0.5" aria-label="Refleksi">
        {REFLEKSI.map(({ id, label, icon: Icon }) => {
          const isActive = subpage === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onOpenSubpage(id)}
              className={cn(
                "tap flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 text-[14px] transition-colors",
                isActive ? "bg-tz-violet font-bold text-white" : "font-medium text-tz-muted hover:bg-tz-panel hover:text-tz-ink"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} />
              {label}
            </button>
          );
        })}
      </nav>

      <p className="mt-auto px-2 text-[11px] leading-relaxed text-tz-deep">
        Satu langkah kecil setiap hari menjaga istiqamah.
      </p>
    </aside>
  );
}
