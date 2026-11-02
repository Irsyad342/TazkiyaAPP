"use client";

/**
 * Tazkiya — Komponen visual dasar bergaya Dark Purple Glassmorphism.
 * Variant "clean" (Task 33): kartu solid bersih ala dashboard modern
 * (referensi Iconiy) — permukaan datar + bayangan lembut, dua tema.
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
      <AlertDialogContent className="glass-strong max-w-[320px]! rounded-[1.4rem]! border-tz-line p-5!">
        <AlertDialogHeader className="gap-1.5!">
          <AlertDialogTitle className="font-display! text-[16px]! text-tz-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px]! leading-relaxed! text-tz-muted">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row! gap-2!">
          <AlertDialogCancel className="mt-0! min-h-[42px] flex-1 rounded-xl border-tz-line bg-tz-panel-soft text-[13px] font-semibold text-tz-muted">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="mt-0! min-h-[42px] flex-1 rounded-xl bg-rose-500 text-[13px] font-semibold text-white hover:bg-rose-500/90"
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
    <div className={cn("mb-3 flex items-center justify-between gap-3 px-1", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full bg-tz-violet" />
        <div className="min-w-0">
          <h2 className="font-display text-[16px] font-semibold tracking-tight text-tz-ink">{title}</h2>
          {caption ? <p className="mt-0.5 text-[11px] leading-snug text-tz-muted">{caption}</p> : null}
        </div>
      </div>
      {action ? (
        <div className="flex shrink-0 items-center whitespace-nowrap">{action}</div>
      ) : null}
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
              : "h-10 w-10 rounded-[0.8rem] [&>svg]:h-[18px] [&>svg]:w-[18px]",
        tone === "solid"
          ? "border border-tz-violet bg-tz-violet text-white"
          : tone === "ghost"
            ? "border border-tz-line bg-tz-panel text-tz-muted"
            : tone === "lavender"
              ? "border border-tz-lavender/25 bg-tz-lavender/12 text-tz-lavender"
              : "border border-tz-violet/25 bg-tz-violet/12 text-tz-violet",
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
  from = "#9C72EF",
  to = "#D8C5FF",
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
        className={cn("h-full rounded-full bg-gradient-to-r from-tz-purple via-tz-violet to-tz-lavender", fillClass)}
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
        "inline-flex items-center gap-1 rounded-full border border-tz-line bg-tz-panel-strong px-2.5 py-1 text-[11px] font-medium text-tz-accent",
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
    <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[1.25rem] border border-dashed border-tz-violet/25 bg-tz-violet/[0.05] px-4 py-7 text-center">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-tz-violet/25 bg-tz-violet/12 text-tz-violet">
        {icon}
      </div>
      <p className="text-sm font-medium text-tz-ink/90">{title}</p>
      {caption ? <p className="max-w-[270px] text-xs leading-relaxed text-tz-muted">{caption}</p> : null}
    </div>
  );
}

/* ---------------- Orb dekoratif ---------------- */

export function GlowOrb({ className }: { className?: string }) {
  // Mode 2D datar (Task 16): ornamen blur yang memberi kesan 3D/berat
  // tidak dirender lagi. API komponen dipertahankan agar pemakaian lama
  // di semua halaman tidak perlu diubah.
  void className;
  return null;
}
