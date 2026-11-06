"use client";

/**
 * SUIO v14 — aset mood emoji: tujuh ekspresi dengan dua varian warna.
 *
 * - Set light (public/mood/*.png): tile warm ivory/orange, fitur
 *   charcoal, glint hangat — palet keluarga SUIO.
 * - Set dark (public/mood/dark/*.png): tile charcoal yang menyatu
 *   dengan latar gelap, fitur warm ivory / soft orange, tanpa outline
 *   putih maupun bagian menyilaukan.
 *
 * Varian dipilih murni lewat atribut data-theme (custom variant
 * light:/dark:), sehingga selalu sinkron dengan tema aktif tanpa state
 * tambahan. Bentuk, ukuran, ekspresi, dan susunan asli dipertahankan —
 * hanya warna yang di-remap (scripts/recolor_mood.py). Ukuran
 * dikendalikan lewat className dari pemanggil. Dipakai di Beranda
 * (MoodSection), Jurnal, dan chip onboarding.
 */

import { cn } from "@/lib/utils";
import type { MoodId } from "@/lib/tazkiya/types";

export function MoodFace({ id, className }: { id: MoodId; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-block select-none", className)}>
      <img
        src={`/mood/${id}.png`}
        alt=""
        draggable={false}
        className="h-full w-full object-contain light:block dark:hidden"
      />
      <img
        src={`/mood/dark/${id}.png`}
        alt=""
        draggable={false}
        className="hidden h-full w-full object-contain dark:block light:hidden"
      />
    </span>
  );
}
