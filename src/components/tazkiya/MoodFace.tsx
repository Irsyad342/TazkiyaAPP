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
 *
 * Prop opsional `fx` menambah animasi ambient dari utilitas su-*:
 * "breathe" = puls skala halus (su-breathe), "float" = mengapung
 * (su-float); default "none" — gambar/logika img tidak berubah.
 */

import { cn } from "@/lib/utils";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { MoodId } from "@/lib/tazkiya/types";

export function MoodFace({
  id,
  className,
  fx = "none",
  idle = false,
}: {
  id: MoodId;
  className?: string;
  /** Animasi ambient opsional: "breathe" | "float" | "none" (default). */
  fx?: "breathe" | "float" | "none";
  /** Karakter idle khas per mood (jump/float/sway/droop/shiver/wobble) —
      hanya saat fx "none"; gerakan transform kecil yang tetap di dalam tile. */
  idle?: boolean;
}) {
  const colorTheme = useWorshipStore((st) => st.settings.colorTheme);
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block select-none",
        fx === "breathe" && "su-breathe",
        fx === "float" && "su-float",
        fx === "none" && idle && `su-mood-idle-${id}`,
        className
      )}
    >
      <img
        src={colorTheme === "electric" ? `/mood/electric/${id}.png` : `/mood/${id}.png`}
        alt=""
        draggable={false}
        className="h-full w-full object-contain light:block dark:hidden"
      />
      <img
        src={colorTheme === "electric" ? `/mood/electric-dark/${id}.png` : `/mood/dark/${id}.png`}
        alt=""
        draggable={false}
        className="hidden h-full w-full object-contain dark:block light:hidden"
      />
    </span>
  );
}
