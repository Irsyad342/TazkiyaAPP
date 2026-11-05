"use client";

/**
 * Ornamen Islami geometris v11 — identitas visual Tazkiya.
 * Khatam (bintang segi delapan, silang dua persegi) dan pembatas editorial
 * garis–bintang–garis. Murni dekoratif (aria-hidden), tanpa logika data.
 */

import { cn } from "@/lib/utils";

/**
 * Khatam: poligon 16 titik — radius luar 10, radius dalam 4,6 pada
 * langkah 22,5°. Dipakai sebagai aksen kecil di samping judul/angka.
 */
const STAR8_PATH =
  "M20,10 L14.25,11.76 L17.07,17.07 L11.76,14.25 L10,20 L8.24,14.25 L2.93,17.07 " +
  "L5.75,11.76 L0,10 L5.75,8.24 L2.93,2.93 L8.24,5.75 L10,0 L11.76,5.75 " +
  "L17.07,2.93 L14.25,8.24 Z";

export function Star8({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path d={STAR8_PATH} fill="currentColor" />
    </svg>
  );
}

/** Pembatas editorial: garis rambut — khatam — garis rambut. */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3", className)}>
      <span className="gs-rule flex-1" />
      <Star8 size={11} className="text-tk-accent/75" />
      <span className="gs-rule flex-1" />
    </div>
  );
}
