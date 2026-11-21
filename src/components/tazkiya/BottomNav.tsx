"use client";

/**
 * Tazkiya v8 — navigasi TUNGGAL: bar hitam pekat kapsul mengambang yang
 * selalu selebar kolom aplikasi (maks 430px, di tengah semua viewport).
 * Item AKTIF: pil ORANGE ikon + label dengan pop spring halus setiap kali
 * berpindah tab; item lain lingkaran gelap ikon saja — persis referensi.
 */

import { BookOpen, ChartColumn, CircleUserRound, House, MoonStar } from "lucide-react";
import { m } from "framer-motion";
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
      data-tk-nav=""
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] px-5 pb-[max(1.1rem,env(safe-area-inset-bottom))]"
    >
      {/* Bar hitam-arang hangat kapsul, seperti bottom bar referensi */}
      <div className="flex items-center justify-between gap-1 rounded-full border su-dock p-2">
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
                "tap relative flex h-[46px] shrink-0 items-center justify-center rounded-full transition-colors duration-200 active:scale-95",
                /* Ikon tidak aktif: Lavender Gray di atas dock navy (electric) */
                isActive ? "gap-2 px-5" : "w-[46px] text-[var(--tk-dock-idle)] hover:text-tk-ink"
              )}
            >
              {isActive ? (
                /* Pil aktif MELUNCUR antar slot: satu elemen layar penuh
                   dipindahkan via layout animation (hanya transform+width,
                   dijalankan rAF — hemat CPU), persis bahasa motion
                   referensi. Electric: gradasi Turquoise → Electric Blue;
                   klasik: pil brand asli. */
                <m.span
                  layoutId="tk-nav-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="tk-nav-pill-active absolute inset-0 rounded-full shadow-[0_8px_20px_-6px_rgba(var(--tk-brand-rgb),0.6)]"
                />
              ) : null}
              <Icon
                size={isActive ? 19 : 20}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={cn("relative z-10 shrink-0", isActive && "animate-tk-nav-pop", !isActive && "transition-colors")}
              />
              {isActive ? (
                <span className="animate-tk-nav-pop relative z-10 whitespace-nowrap text-[13px] font-bold leading-none text-white">{label}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
