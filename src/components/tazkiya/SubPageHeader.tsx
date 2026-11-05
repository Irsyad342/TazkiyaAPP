"use client";

/**
 * Tazkiya v4 — Kepala halaman sub-menu (Jurnal Syukur, Zikir & Doa,
 * Rizq & Amal): tombol kembali kapsul + judul editorial Outfit dengan
 * garis bawah aksen; dipakai seragam di seluruh sub-halaman.
 */

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubPageHeader({
  title,
  caption,
  onBack,
  action,
  className,
}: {
  title: string;
  caption?: string;
  onBack: () => void;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("animate-tz-fade-up flex items-center gap-3 pt-1", className)}>
      <button
        type="button"
        aria-label="Kembali"
        onClick={onBack}
        className="tap glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tz-ink/80"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative inline-block">
          <h1 className="truncate font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-tz-ink">{title}</h1>
          <span aria-hidden className="absolute -bottom-1 left-0 h-[3px] w-8 rounded-full bg-tz-lime" />
        </div>
        {caption ? <p className="mt-1.5 truncate text-[11.5px] text-tz-muted">{caption}</p> : null}
      </div>
      {action}
    </header>
  );
}
