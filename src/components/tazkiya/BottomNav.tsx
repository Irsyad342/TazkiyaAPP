"use client";

/**
 * Tazkiya v8 — navigasi TUNGGAL: bar hitam pekat kapsul mengambang yang
 * selalu selebar kolom aplikasi (maks 430px, di tengah semua viewport).
 * Item AKTIF: pil ORANGE ikon + label dengan pop spring halus setiap kali
 * berpindah tab; item lain lingkaran gelap ikon saja — persis referensi.
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
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] px-5 pb-[max(1.1rem,env(safe-area-inset-bottom))]"
    >
      {/* Bar hitam pekat kapsul — seperti bottom bar referensi */}
      <div className="flex items-center justify-between gap-1 rounded-full border border-white/5 bg-[#0A0A0B] p-2 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.8)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          if (isActive) {
            /* Item aktif: pil ORANGE ikon + label — pop spring tiap pindah tab
               (key mengandung `active` agar animasi diputar ulang). */
            return (
              <button
                key={`aktif-${active}`}
                type="button"
                aria-current="page"
                aria-label={`Buka menu ${label}`}
                onClick={() => onChange(id)}
                className="tap animate-tk-nav-pop flex h-[46px] shrink-0 items-center gap-2 rounded-full bg-tk-violet px-5 text-white shadow-[0_8px_20px_-6px_rgba(250,82,0,0.6)]"
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
              className={cn(
                "tap flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-tk-muted transition-colors duration-200 hover:text-tk-ink active:scale-95"
              )}
            >
              <Icon size={20} strokeWidth={1.8} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
