"use client";

/**
 * Tazkiya v13 — aset mood emoji: tujuh ekspresi dipotong satu per satu
 * dari kolase referensi (public/mood/*.png). Bentuk kotak rounded dan
 * warna latar asli tiap emoji dipertahankan; sudut di luar kotak
 * transparan, sehingga kotaknya sendiri yang jadi identitas visual.
 * Ukuran dikendalikan lewat className dari pemanggil.
 * Dipakai di Beranda (MoodSection) dan Jurnal.
 */

import type { MoodId } from "@/lib/tazkiya/types";

export function MoodFace({ id, className }: { id: MoodId; className?: string }) {
  return (
    <img
      src={`/mood/${id}.png`}
      alt=""
      aria-hidden
      draggable={false}
      className={`select-none ${className ?? ""}`}
    />
  );
}
