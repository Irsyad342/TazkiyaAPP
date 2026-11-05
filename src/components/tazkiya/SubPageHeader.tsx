"use client";

/**
 * Tazkiya v5 — Kepala halaman sub-menu (Jurnal Syukur, Zikir & Doa,
 * Rizq & Amal): tombol kembali lingkaran polos + judul tebal — minimalis,
 * tanpa garis bawah dekoratif; dipakai seragam di seluruh sub-halaman.
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
    <header className={cn("animate-tz-fade-up flex items-center gap-3.5 pt-1", className)}>
      <button
        type="button"
        aria-label="Kembali"
        onClick={onBack}
        className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tz-panel-soft text-tz-ink"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[23px] font-extrabold leading-tight tracking-[-0.025em] text-tz-ink">{title}</h1>
        {caption ? <p className="mt-1 truncate text-[11.5px] text-tz-muted">{caption}</p> : null}
      </div>
      {action}
    </header>
  );
}
