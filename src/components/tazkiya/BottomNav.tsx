"use client";

/**
 * Tazkiya v7 — Navigasi ganda sesuai perangkat:
 * - BottomNav  : bar hitam pekat kapsul mengambang (mobile), persis
 *                referensi — item AKTIF berupa pil ORANGE penuh dengan
 *                ikon + label, item lain lingkaran gelap ikon saja.
 * - SidebarNav : sidebar gelap (desktop lg+) — brand, menu utama,
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] bg-tk-violet text-base font-bold text-white">ت</span>
      <span>
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em] text-tk-ink">Tazkiya</span>
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.22em] text-tk-deep">A Better Daily Journey</span>
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
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {/* Bar hitam pekat kapsul — seperti bottom bar referensi */}
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-white/5 bg-[#0A0A0B] p-2 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.8)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          if (isActive) {
            /* Item aktif: pil ORANGE ikon + label — persis referensi */
            return (
              <button
                key={id}
                type="button"
                aria-current="page"
                aria-label={`Buka menu ${label}`}
                onClick={() => onChange(id)}
                className="tap flex h-[46px] shrink-0 items-center gap-2 rounded-full bg-tk-violet px-5 text-white shadow-[0_8px_20px_-6px_rgba(250,82,0,0.6)]"
              >
                <Icon size={19} strokeWidth={2.2} className="shrink-0" />
                <span className="whitespace-nowrap text-[13px] font-bold leading-none">{label}</span>
              </button>
            );
          }
          /* Item lain: lingkaran gelap ikon saja */
          return (
            <button
              key={id}
              type="button"
              aria-label={`Buka menu ${label}`}
              onClick={() => onChange(id)}
              className="tap flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-tk-muted transition-colors duration-200 hover:text-tk-ink"
            >
              <Icon size={20} strokeWidth={1.8} />
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
      className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-tk-line bg-tk-panel-soft px-5 py-7 lg:flex"
    >
      <Brand />

      <p className="gs-overline mb-2 mt-9 px-2">Menu</p>
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
                isActive ? "bg-tk-violet font-bold text-white" : "font-medium text-tk-muted hover:bg-tk-panel hover:text-tk-ink"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} />
              {label}
            </button>
          );
        })}
      </nav>

      <p className="gs-overline mb-2 mt-7 px-2">Refleksi</p>
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
                isActive ? "bg-tk-violet font-bold text-white" : "font-medium text-tk-muted hover:bg-tk-panel hover:text-tk-ink"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} />
              {label}
            </button>
          );
        })}
      </nav>

      <p className="mt-auto px-2 text-[11px] leading-relaxed text-tk-deep">
        Satu langkah kecil setiap hari menjaga istiqamah.
      </p>
    </aside>
  );
}
