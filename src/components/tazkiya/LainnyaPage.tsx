"use client";

/**
 * Tazkiya — Halaman Lainnya: pintasan ke halaman tersendiri
 * (Jurnal Syukur, Zikir & Doa, Rizq & Amal, Profil).
 * Setiap menu adalah <button> sungguhan yang membuka halaman penuh — bukan modal.
 */

import { ChevronRight, HandCoins, HandHeart, CircleUserRound, BookHeart } from "lucide-react";
import type { SubPageId } from "./BottomNav";
import { cn } from "@/lib/utils";

const MENUS: {
  id: SubPageId;
  title: string;
  caption: string;
  icon: typeof HandHeart;
  tone: string;
}[] = [
  {
    id: "jurnal",
    title: "Jurnal Syukur",
    caption: "Tiga hal yang kamu syukuri hari ini, mood check-in, dan pengingat untuk hatimu",
    icon: BookHeart,
    tone: "bg-violet-400/15 text-violet-300 light:bg-violet-400/20 light:text-violet-600",
  },
  {
    id: "zikir-doa",
    title: "Zikir & Doa",
    caption: "Zikir pagi, petang, setelah salat, tasbih digital, dan doa harian",
    icon: HandHeart,
    tone: "bg-teal-400/15 text-teal-300 light:bg-teal-400/20 light:text-teal-600",
  },
  {
    id: "rizq-amal",
    title: "Rizq & Amal",
    caption: "Target kebaikan harian, catatan sedekah, dan riwayat amal",
    icon: HandCoins,
    tone: "bg-amber-400/15 text-amber-300 light:bg-amber-400/20 light:text-amber-600",
  },
  {
    id: "profil",
    title: "Profil",
    caption: "Akun, target ibadah, pengingat, lokasi, dan preferensi aplikasi",
    icon: CircleUserRound,
    tone: "bg-sky-400/15 text-sky-300 light:bg-sky-400/20 light:text-sky-600",
  },
];

export function LainnyaPage({ onOpen }: { onOpen: (sub: SubPageId) => void }) {
  return (
    <div className="space-y-5">
      <header className="animate-tz-fade-up pt-1">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-gradient-violet">Lainnya</h1>
        <p className="mt-1 text-sm text-tz-muted">Ruang refleksi, zikir, kebaikan, dan pengaturan</p>
      </header>

      <section aria-label="Menu lainnya" className="space-y-3">
        {MENUS.map(({ id, title, caption, icon: Icon, tone }, i) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
            aria-label={`Buka halaman ${title}`}
            className={cn(
              "tap block w-full rounded-[1.65rem] border border-tz-line bg-tz-panel-soft p-4 text-left transition-all hover:border-tz-violet/45 active:scale-[0.985] animate-tz-fade-up"
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden
                className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] border border-transparent", tone)}
              >
                <Icon size={20} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-tz-ink">{title}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-tz-muted">{caption}</span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-tz-muted/70" />
            </div>
          </button>
        ))}
      </section>

      <p className="pb-1 text-center text-[10px] leading-relaxed text-tz-muted/60">
        Semua catatan tersimpan di perangkatmu dan tersinkron ke akunmu — hanya kamu yang bisa membacanya.
      </p>
    </div>
  );
}
