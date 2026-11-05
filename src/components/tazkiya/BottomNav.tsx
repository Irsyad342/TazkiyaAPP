"use client";

/**
 * Tazkiya v4 — Navigasi ganda sesuai perangkat:
 * - BottomNav  : kapsul putih mengambang (mobile) — item aktif lingkaran
 *                lavender + titik lime; ikon konsisten, label jelas.
 * - SidebarNav : sidebar proporsional (desktop lg+) — brand, menu utama,
 *                grup refleksi, dashboard lebar di sebelah kanan.
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
    <div className="flex items-center gap-3 px-2">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] bg-tz-violet font-display text-xl font-bold text-white shadow-[0_12px_28px_-12px_rgba(136,121,232,0.7)]">ت</span>
      <span>
        <span className="block font-display text-lg font-bold leading-tight tracking-[-0.01em] text-tz-ink">Tazkiya</span>
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-tz-muted">Better Daily Journey</span>
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
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="glass-strong mx-auto flex max-w-md items-center justify-between gap-1 rounded-full px-2.5 py-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={`Buka menu ${label}`}
              onClick={() => onChange(id)}
              className="tap relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1"
            >
              <span
                aria-hidden
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                  isActive ? "bg-tz-violet text-white shadow-[0_8px_18px_-6px_rgba(136,121,232,0.6)]" : "bg-transparent text-tz-muted"
                )}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} />
                {isActive ? <span aria-hidden className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-tz-lime ring-2 ring-white dark:ring-[#26252F]" /> : null}
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
      className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-tz-line bg-tz-panel px-5 py-7 lg:flex"
    >
      <Brand />

      <p className="mb-2 mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-tz-muted">Menu</p>
      <nav className="flex flex-col gap-1" aria-label="Menu utama">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = subpage === null && active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(id)}
              className={cn(
                "tap flex min-h-[46px] items-center gap-3 rounded-2xl px-3.5 text-[14.5px] font-semibold transition-colors",
                isActive ? "bg-tz-lavender text-tz-violet dark:text-[#c9c2f5]" : "text-tz-muted hover:bg-tz-panel-soft"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} />
              {label}
              {isActive ? <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-tz-lime" /> : null}
            </button>
          );
        })}
      </nav>

      <p className="mb-2 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-tz-muted">Refleksi</p>
      <nav className="flex flex-col gap-1" aria-label="Refleksi">
        {REFLEKSI.map(({ id, label, icon: Icon }) => {
          const isActive = subpage === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onOpenSubpage(id)}
              className={cn(
                "tap flex min-h-[46px] items-center gap-3 rounded-2xl px-3.5 text-[14.5px] font-semibold transition-colors",
                isActive ? "bg-tz-lavender text-tz-violet dark:text-[#c9c2f5]" : "text-tz-muted hover:bg-tz-panel-soft"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-tz-line bg-tz-panel-soft p-4">
        <p className="font-display text-[13px] font-bold text-tz-ink">Tazkiya v4</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-tz-muted">Satu langkah kecil setiap hari menjaga istiqamah.</p>
      </div>
    </aside>
  );
}
