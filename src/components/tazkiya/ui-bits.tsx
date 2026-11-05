"use client";

/**
 * Tazkiya — Komponen visual dasar (design system "Lavender & Lime").
 * Kartu permukaan bersih dengan sudut besar, aksen lime untuk progres &
 * keberhasilan, ikon dalam wadah pastel. API komponen dipertahankan dari
 * versi sebelumnya agar seluruh halaman tetap kompatibel.
 */

import { useId, type ReactNode } from "react";
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

type GlassVariant = "plain" | "violet" | "strong" | "hero" | "clean";

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
        ? "tz-card-clean"
        : variant === "violet"
          ? "glass-violet"
          : variant === "strong"
            ? "glass-strong"
            : "glass";
  const cls = cn(
    "relative overflow-hidden rounded-[1.65rem]",
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
      <AlertDialogContent className="glass-strong max-w-[320px]! rounded-[1.5rem]! border-tz-line p-5!">
        <AlertDialogHeader className="gap-1.5!">
          <AlertDialogTitle className="font-display! text-[16px]! text-tz-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px]! leading-relaxed! text-tz-muted">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row! gap-2!">
          <AlertDialogCancel className="mt-0! min-h-[42px] flex-1 rounded-2xl border-tz-line bg-tz-panel-soft text-[13px] font-semibold text-tz-muted">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="mt-0! min-h-[42px] flex-1 rounded-2xl bg-rose-500 text-[13px] font-semibold text-white hover:bg-rose-500/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------------- SectionHeader ---------------- */

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
    <div className={cn("mb-3 flex items-end justify-between gap-3 px-0.5", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[17px] font-extrabold tracking-tight text-tz-ink">{title}</h2>
        {caption ? <p className="mt-0.5 text-[11px] leading-snug text-tz-muted">{caption}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center whitespace-nowrap">{action}</div> : null}
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
  tone?: "violet" | "solid" | "ghost" | "lavender" | "lime";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "xs"
          ? "h-7 w-7 rounded-[0.55rem] [&>svg]:h-3.5 [&>svg]:w-3.5"
          : size === "sm"
            ? "h-9 w-9 rounded-xl [&>svg]:h-4 [&>svg]:w-4"
            : size === "lg"
              ? "h-12 w-12 rounded-2xl [&>svg]:h-[22px] [&>svg]:w-[22px]"
              : "h-10 w-10 rounded-[0.85rem] [&>svg]:h-[18px] [&>svg]:w-[18px]",
        tone === "solid"
          ? "bg-tz-violet text-white light:text-white"
          : tone === "ghost"
            ? "bg-tz-panel-soft text-tz-muted"
            : tone === "lavender"
              ? "bg-tz-lavender/25 text-tz-violet light:bg-tz-lavender/30 light:text-[#6c5bd4]"
              : tone === "lime"
                ? "bg-tz-lime text-tz-lime-ink"
                : "bg-tz-violet/12 text-tz-violet",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- ProgressRing ---------------- */

export function ProgressRing({
  value,
  size = 104,
  stroke = 9,
  children,
  className,
  trackClass = "stroke-tz-track",
  from = "#8879E8",
  to = "#D5F76A",
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
  const gid = useId().replace(/:/g, "");
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#ring-${gid})`}
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
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-tz-track", className)}>
      <div
        className={cn("h-full rounded-full bg-tz-lime", fillClass)}
        style={{
          width: `${clamped}%`,
          transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

/* ---------------- Pill / Chip ---------------- */

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-tz-panel-soft px-2.5 py-1 text-[11px] font-semibold text-tz-muted",
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
    <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[1.4rem] border border-dashed border-tz-line-strong bg-tz-panel-soft/60 px-4 py-7 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-tz-violet/12 text-tz-violet">
        {icon}
      </div>
      <p className="text-sm font-bold text-tz-ink/90">{title}</p>
      {caption ? <p className="max-w-[270px] text-xs leading-relaxed text-tz-muted">{caption}</p> : null}
    </div>
  );
}

/* ---------------- Blob dekoratif ---------------- */

export function GlowOrb({ className }: { className?: string }) {
  // Design system v3: ornamen blur kini blob pastel lembut (statis, satu
  // lapisan radial) — API dipertahankan agar pemakaian lama tetap bekerja.
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-2xl",
        "bg-tz-violet/15 light:bg-tz-violet/12",
        className
      )}
    />
  );
}
