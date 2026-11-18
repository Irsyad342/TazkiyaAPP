"use client";

/**
 * Tazkiya v6 "Ember" — Kepala halaman sub-menu (Jurnal Syukur, Zikir & Doa,
 * Rizq & Amal): tombol kembali lingkaran arang + judul tegas — dipakai
 * seragam di seluruh sub-halaman.
 */

import { ChevronLeft } from "lucide-react";
import { PressScale, RiseIn } from "./motion-bits";
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
    <header className={cn("pt-1", className)}>
      {/* Entrance halus seluruh baris kepala (RiseIn, gate useAnim). */}
      <RiseIn y={14} className="flex items-center gap-3.5">
        {/* Tombol kembali: feedback tekan spring (PressScale). */}
        <PressScale
          as="button"
          ariaLabel="Kembali"
          onClick={onBack}
          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
        >
          <ChevronLeft size={20} />
        </PressScale>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-tk-ink">{title}</h1>
          {caption ? <p className="mt-1 truncate text-[11.5px] text-tk-muted">{caption}</p> : null}
        </div>
        {action}
      </RiseIn>
    </header>
  );
}
