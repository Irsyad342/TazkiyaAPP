"use client";

/**
 * Tazkiya — Kepala halaman sub-menu (Jurnal Syukur, Zikir & Doa, Rizq & Amal):
 * tombol kembali + judul editorial, dipakai seragam di seluruh sub-halaman.
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
        className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-ink"
      >
        <ChevronLeft size={19} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="tz-stat truncate text-[22px] font-extrabold leading-tight text-tz-ink">{title}</h1>
        {caption ? <p className="mt-0.5 truncate text-[11.5px] font-medium text-tz-muted">{caption}</p> : null}
      </div>
      {action}
    </header>
  );
}
