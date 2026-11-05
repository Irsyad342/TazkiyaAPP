"use client";

/**
 * Tazkiya v4 — Komponen visual dasar "A Better Daily Journey".
 * Bahasa desain: kartu putih bersih + border hairline + soft shadow,
 * lavender terarah, lime sebagai aksen kecil, tanpa gradien dan tanpa
 * glassmorphism sebagai gaya dasar. API komponen dipertahankan agar
 * seluruh halaman tetap terhubung; struktur visualnya baru.
 */

import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
    "relative overflow-hidden rounded-[1.6rem]",
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
          <AlertDialogTitle className="font-display text-[16px]! font-bold! text-tz-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px]! leading-relaxed! text-tz-muted">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row! gap-2!">
          <AlertDialogCancel className="mt-0! min-h-[42px] flex-1 rounded-full border-tz-line-strong bg-tz-panel-soft text-[13px] font-semibold text-tz-muted">
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

/** Judul section editorial: titik aksen lime + judul tegas + hairline. */
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
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tz-lime" />
          <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-tz-ink">{title}</h2>
        </div>
        {caption ? <p className="mt-0.5 pl-3.5 text-[11.5px] leading-snug text-tz-muted">{caption}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center whitespace-nowrap">{action}</div> : null}
    </div>
  );
}

/* ---------------- SegmentedTabs ---------------- */

/**
 * Tab editorial garis-bawah (Hari Ini / Bulanan / Qada, Zikir / Doa, dst.) —
 * label tegas, garis aktif lavender dengan titik lime; pengganti gaya pil
 * bertumpuk dari versi lama.
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
  return (
    <div
      className={cn("flex items-stretch gap-1 border-b border-tz-line", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
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
              "tap relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3 text-[13px] font-semibold transition-colors sm:flex-none sm:min-w-[120px]",
              active ? "text-tz-ink" : "text-tz-muted hover:text-tz-ink/80"
            )}
          >
            {Icon ? <Icon size={15} className={active ? "text-tz-violet" : ""} /> : null}
            {label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 bottom-0 h-[2.5px] rounded-full transition-all duration-200",
                active ? "bg-tz-violet" : "bg-transparent"
              )}
            >
              {active ? <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-tz-lime" /> : null}
            </span>
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
              : "h-10 w-10 rounded-[0.85rem] [&>svg]:h-[18px] [&>svg]:w-[18px]",
        tone === "solid"
          ? "bg-tz-violet text-white"
          : tone === "ghost"
            ? "border border-tz-line bg-tz-panel-soft text-tz-muted"
            : tone === "lavender"
              ? "bg-tz-lavender text-tz-violet dark:text-[#c9c2f5]"
              : "bg-tz-lavender/60 text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- ProgressRing ---------------- */

/** Cincin progres flat: trek hairline, busur lavender solid, ujung lime. */
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
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  // Ujung kecil lime di perbatasan busur (aksen, bukan dekorasi lebay):
  // sudut busur = -90° + clamped% dari 360°.
  const angle = (-90 + (clamped / 100) * 360) * (Math.PI / 180);
  const tipX = size / 2 + r * Math.cos(angle);
  const tipY = size / 2 + r * Math.sin(angle);
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
        {clamped > 4 && clamped < 100 ? (
          <circle cx={tipX} cy={tipY} r={stroke * 0.72} fill={to} className="rotate-90" style={{ transformOrigin: `${tipX}px ${tipY}px` }} />
        ) : null}
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
        className={cn("h-full rounded-full bg-tz-violet", fillClass)}
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
        "inline-flex items-center gap-1 rounded-full border border-tz-line bg-tz-panel-soft px-2.5 py-1 text-[11px] font-semibold text-tz-muted",
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
    <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[1.5rem] border border-dashed border-tz-line-strong bg-tz-panel-soft px-4 py-8 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-tz-lavender text-tz-violet dark:text-[#c9c2f5]">
        {icon}
      </div>
      <p className="font-display text-sm font-bold text-tz-ink/90">{title}</p>
      {caption ? <p className="max-w-[270px] text-xs leading-relaxed text-tz-muted">{caption}</p> : null}
    </div>
  );
}

/* ---------------- Orb dekoratif ---------------- */

export function GlowOrb({ className }: { className?: string }) {
  // v4: ornamen blur/glow dihapus dari bahasa desain. API dipertahankan
  // agar pemanggil lama tidak perlu diubah.
  void className;
  return null;
}
