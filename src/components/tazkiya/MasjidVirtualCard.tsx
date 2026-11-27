"use client";

/**
 * Tazkiya — Card "Jelajahi Masjid Virtual" di Beranda.
 * - Thumbnail ilustrasi SVG INLINE (bukan gambar/texture, ±2 KB): interior
 *   masjid bergaya SUIO memakai token tema sehingga ikut semua tema.
 * - TIDAK memuat engine 3D di Beranda — scene three.js hanya dimuat saat
 *   halaman tur dibuka (dynamic import di page.tsx).
 */
import { Compass } from "lucide-react";
import type { SubPageId } from "./BottomNav";

/** Ilustrasi interior mini: karpet, mihrab lengkung, jendela, lampu gantung. */
function InteriorThumb() {
  return (
    <svg viewBox="0 0 120 90" role="img" aria-label="Ilustrasi interior masjid" className="h-full w-full">
      <rect width="120" height="90" fill="var(--tk-panel-soft)" />
      {/* Dinding samping */}
      <path d="M0 0h120v52L60 42 0 52z" fill="var(--tk-panel)" />
      {/* Langit-langit gelap lembut */}
      <path d="M0 0h120v18L60 12 0 18z" fill="var(--tk-canvas-bg)" opacity="0.55" />
      {/* Karpet */}
      <path d="M0 90V52l120-10v48z" fill="var(--tk-brand-deep)" opacity="0.85" />
      {/* Mihrab */}
      <path d="M48 52c0-12 5-18 12-18s12 6 12 18z" fill="var(--tk-canvas-bg)" />
      <path d="M46 52c0-14 6-21 14-21s14 7 14 21" fill="none" stroke="var(--tk-brand)" strokeWidth="2.5" />
      {/* Jendela lengkung kiri-kanan */}
      <path d="M18 46c0-8 3-12 7-12s7 4 7 12z" fill="var(--tk-brand-soft)" />
      <path d="M88 46c0-8 3-12 7-12s7 4 7 12z" fill="var(--tk-brand-soft)" />
      {/* Sajadah */}
      <g fill="var(--tk-panel-strong)">
        <rect x="30" y="64" width="12" height="8" rx="1.5" transform="skewX(-8)" />
        <rect x="54" y="70" width="12" height="8" rx="1.5" transform="skewX(-8)" />
        <rect x="78" y="64" width="12" height="8" rx="1.5" transform="skewX(-8)" />
        <rect x="42" y="78" width="12" height="8" rx="1.5" transform="skewX(-8)" />
        <rect x="66" y="80" width="12" height="8" rx="1.5" transform="skewX(-8)" />
      </g>
      {/* Lampu gantung */}
      <g stroke="var(--tk-ink)" strokeOpacity="0.5">
        <line x1="60" y1="6" x2="60" y2="22" strokeWidth="1" />
      </g>
      <circle cx="60" cy="26" r="4" fill="var(--tk-brand)" />
      <circle cx="60" cy="26" r="1.6" fill="var(--tk-panel-strong)" />
    </svg>
  );
}

export function MasjidVirtualCard({ onOpen }: { onOpen: (sub: SubPageId) => void }) {
  return (
    <section aria-label="Jelajahi masjid virtual">
      <button
        type="button"
        onClick={() => onOpen("masjid-virtual")}
        aria-label="Jelajahi masjid virtual — mulai tur interaktif interior masjid"
        className="tap tk-card-light su-card-shadow group flex w-full items-center gap-3.5 rounded-[1.4rem] p-3.5 text-left"
      >
        <span className="h-[74px] w-[96px] shrink-0 overflow-hidden rounded-[1rem] border border-tk-line-soft">
          <InteriorThumb />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold tracking-[-0.01em] text-tk-ink">Jelajahi Masjid Virtual</span>
          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-tk-muted">
            Intip suasana interior masjid dalam ilustrasi interaktif — geser untuk melihat sekeliling.
          </span>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-tk-ink px-3 py-1.5 text-[10.5px] font-bold text-tk-panel transition-transform group-active:scale-95">
            <Compass size={11} aria-hidden /> Mulai Tur
          </span>
        </span>
      </button>
    </section>
  );
}
