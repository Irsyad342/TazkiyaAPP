"use client";

/**
 * Tazkiya v7 — kosakata visual dasar, dibangun ulang terhadap referensi
 * task-planner premium: kartu #242429 + hairline, trio kartu putih/abu
 * terang/orange, ORANGE #FA5200 untuk aksi utama & progres penting,
 * angka besar General Sans tabular (.gs-display), label uppercase
 * (.gs-overline). API komponen dipertahankan agar seluruh halaman tetap
 * terhubung; struktur visualnya baru.
 */

import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/* ---------------- GlassCard ---------------- */

type GlassVariant = "plain" | "violet" | "strong" | "hero" | "clean" | "white" | "light";

export function GlassCard({
  children,
  className,
  variant = "plain",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: GlassVariant;
  onClick?: () => void;
}) {
  const variantClass =
    variant === "hero"
      ? "glass-hero"
      : variant === "clean"
        ? "tk-card-clean"
        : variant === "white"
          ? "tk-card-white"
          : variant === "light"
            ? "tk-card-light"
            : variant === "violet"
              ? "glass-violet"
              : variant === "strong"
                ? "glass-strong"
                : "glass";
  const cls = cn(
    "relative overflow-hidden rounded-[1.4rem]",
    variantClass,
    onClick && "cursor-pointer tap active:scale-[0.985]",
    className
  );
  // Kartu yang bisa ditekan dirender sebagai <button> sungguhan agar bisa
  // diakses keyboard, punya semantik tombol, dan area sentuh yang jelas.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "block w-full text-left")}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}

/* ---------------- ConfirmButton ---------------- */

/**
 * Tombol aksi yang menghapus data — selalu meminta konfirmasi lebih dulu
 * (Radix AlertDialog). Trigger dirender apa adanya sehingga tampilan daftar
 * tidak berubah; aksi hanya jalan setelah pengguna menekan "Ya, hapus".
 */
export function ConfirmButton({
  children,
  className,
  label,
  title = "Hapus catatan ini?",
  description = "Catatan yang dihapus tidak dapat dikembalikan.",
  confirmLabel = "Ya, hapus",
  onConfirm,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name tombol pemicu (mis. "Hapus catatan amal"). */
  label: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" aria-label={label} className={className}>
          {children}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-strong max-w-[320px]! rounded-[1.4rem]! border-tk-line p-5!">
        <AlertDialogHeader className="gap-1.5!">
          <AlertDialogTitle className="text-[16px]! font-bold! text-tk-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px]! leading-relaxed! text-tk-muted">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row! gap-2!">
          <AlertDialogCancel className="mt-0! min-h-[42px] flex-1 rounded-full border-tk-line-strong bg-tk-panel-soft text-[13px] font-semibold text-tk-muted">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="mt-0! min-h-[42px] flex-1 rounded-full bg-[#E5484D] text-[13px] font-semibold text-white hover:bg-[#E5484D]/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------------- SectionHeader ---------------- */

/**
 * Kepala section editorial v5: judul tegas 16-17px + keterangan abu —
 * tanpa titik dekoratif; pemisah antar section memakai white space,
 * bukan kartu.
 */
export function SectionHeader({
  title,
  caption,
  action,
  className,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3.5 flex items-end justify-between gap-3 px-0.5", className)}>
      <div className="min-w-0">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">{title}</h2>
        {caption ? <p className="mt-1 text-[12px] leading-snug text-tk-muted">{caption}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center whitespace-nowrap">{action}</div> : null}
    </div>
  );
}

/* ---------------- SegmentedTabs ---------------- */

/**
 * Tab garis-bawah minimalis (Hari Ini / Bulanan / Qada, Zikir / Doa, dst.) —
 * label tegas; garis aktif ORANGE 2px yang MENGGESER mulus ke tab tujuan
 * (satu elemen indikator + transform, kurva out-quint 320ms) alih-alih
 * muncul-hilang per tombol.
 */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: { id: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const activeIdx = Math.max(
    0,
    items.findIndex((it) => it.id === value)
  );
  const gap = 4; // gap-1
  return (
    <div
      className={cn("relative flex items-stretch gap-1 border-b border-tk-line", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {/* Indikator geser: lebar = satu slot, translasi = indeks × (slot + gap) */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-tk-violet transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={{
          width: `calc((100% - ${(items.length - 1) * gap}px) / ${items.length})`,
          transform: `translateX(calc(${activeIdx} * (100% + ${gap}px)))`,
        }}
      />
      {items.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "tap relative flex min-h-[46px] flex-1 items-center justify-center gap-1.5 px-3 text-[13.5px] transition-colors duration-200",
              active ? "font-bold text-tk-ink" : "font-medium text-tk-muted hover:text-tk-ink/80"
            )}
          >
            {Icon ? <Icon size={15} className={active ? "text-tk-violet" : ""} /> : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- IconBox ---------------- */

export function IconBox({
  children,
  tone = "violet",
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: "violet" | "solid" | "ghost" | "lavender";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "xs"
          ? "h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5"
          : size === "sm"
            ? "h-9 w-9 rounded-xl [&>svg]:h-4 [&>svg]:w-4"
            : size === "lg"
              ? "h-12 w-12 rounded-2xl [&>svg]:h-[22px] [&>svg]:w-[22px]"
              : "h-10 w-10 rounded-[0.95rem] [&>svg]:h-[18px] [&>svg]:w-[18px]",
        tone === "solid"
          ? "bg-tk-violet text-white"
          : tone === "ghost"
            ? "bg-tk-panel-soft text-tk-muted"
            : tone === "lavender"
              ? "bg-tk-lav-deco text-tk-violet"
              : "bg-tk-lavender text-tk-violet",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- ProgressRing ---------------- */

/** Cincin progres flat: trek tipis, busur ORANGE — tanpa titik dekoratif. */
export function ProgressRing({
  value,
  size = 104,
  stroke = 8,
  children,
  className,
  trackClass = "stroke-tk-track",
  from = "#FA5200",
  to = "#FF6B26",
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
  trackClass?: string;
  from?: string;
  to?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={from}
          strokeDasharray={`${dash} ${c}`}
          style={{
            transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------------- ProgressBar ---------------- */

export function ProgressBar({ value, className, fillClass }: { value: number; className?: string; fillClass?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-tk-track", className)}>
      <div
        className={cn("h-full rounded-full bg-tk-violet", fillClass)}
        style={{
          width: `${clamped}%`,
          transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

/* ---------------- StatBlock — statistik TANPA kartu ---------------- */

/** Angka besar Manrope + label kecil; pemisah antar statistik: divider tipis. */
export function StatBlock({
  value,
  label,
  className,
  align = "left",
}: {
  value: ReactNode;
  label: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("min-w-0", align === "center" ? "text-center" : "text-left", className)}>
      <p className="gs-display truncate text-[26px] font-extrabold leading-none text-tk-ink sm:text-[30px]">{value}</p>
      <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-tk-muted">{label}</p>
    </div>
  );
}

/* ---------------- GroupList / GroupRow — daftar pengaturan minimalis ---------------- */

/** Kelompok baris pengaturan: satu permukaan putih, pemisah hairline tipis. */
export function GroupList({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("glass divide-y divide-tk-line-soft overflow-hidden rounded-[1.5rem]", className)}
    >
      {children}
    </div>
  );
}

/**
 * Satu baris pengaturan: ikon sederhana 18px + judul + keterangan abu +
 * nilai/aksi di kanan. Ikon sengaja TANPA kotak berwarna — minimalis.
 */
export function GroupRow({
  icon: Icon,
  title,
  caption,
  value,
  onClick,
  children,
  className,
  control,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  caption?: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  /** Kontrol langsung di kanan (Switch, segmen) — mematikan chevron. */
  control?: boolean;
}) {
  const inner = (
    <>
      {Icon ? <Icon size={18} strokeWidth={1.8} className="shrink-0 text-tk-muted" /> : null}
      <span className="min-w-0 flex-1 py-3.5">
        <span className="block truncate text-[14px] font-medium text-tk-ink">{title}</span>
        {caption ? <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-tk-muted">{caption}</span> : null}
        {children}
      </span>
      {value !== undefined ? (
        <span className="shrink-0 text-[12.5px] font-medium text-tk-muted">{value}</span>
      ) : null}
      {onClick && !control ? <ChevronRight size={16} className="shrink-0 text-tk-muted/60" /> : null}
    </>
  );
  const base = cn("flex w-full items-center gap-3.5 px-4 text-left", className);
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={typeof title === "string" ? title : undefined} className={cn(base, "tap")}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

/* ---------------- Pill / Chip ---------------- */

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-tk-panel-soft px-2.5 py-1 text-[11px] font-semibold text-tk-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({ icon, title, caption }: { icon: ReactNode; title: string; caption?: string }) {
  return (
    <div className="relative flex flex-col items-center gap-2.5 rounded-[1.5rem] bg-tk-panel-soft px-4 py-9 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-tk-lavender text-tk-violet">
        {icon}
      </div>
      <p className="text-sm font-bold text-tk-ink/90">{title}</p>
      {caption ? <p className="max-w-[270px] text-xs leading-relaxed text-tk-muted">{caption}</p> : null}
    </div>
  );
}

/* ---------------- Orb dekoratif ---------------- */

export function GlowOrb({ className }: { className?: string }) {
  // v5: ornamen blur/glow dihapus dari bahasa desain. API dipertahankan
  // agar pemanggil lama tidak perlu diubah.
  void className;
  return null;
}
