"use client";

/**
 * SUIO GLOBAL MOTION SYSTEM — sumber tunggal preset gerakan.
 *
 * Filosofi: PREMIUM • FLUID • INTERACTIVE • ELEGANT • LIGHTWEIGHT.
 * Semua animasi di aplikasi wajib memakai preset di sini agar ritme
 * konsisten: entrance bertahap ~60–90 ms antar item (referensi video),
 * transisi halaman kinetik, respons tekan spring, dan ambient yang
 * sangat ringan. Hanya transform & opacity yang dianimasikan — layout
 * tidak pernah ikut bergerak — sehingga tetap 60 FPS di Android.
 *
 * Aturan performa yang menyertai (dipatuhi semua pemakaian):
 * - Elemen di luar viewport tidak beranimasi (framer-motion whileInView
 *   memakai IntersectionObserver; entrance `once` agar tidak diulang).
 * - Tidak ada loop infinite pada komponen data; ambient hanya pada
 *   1–2 elemen dekoratif per halaman via CSS (GPU-composited).
 * - `prefers-reduced-motion` + setelan "Animasi: mati" aplikasi
 *   mematikan semuanya (lihat useAnim() di motion-bits).
 */

import type { Transition, Variants } from "framer-motion";

/* ---------- Easing presets (cubic-bezier) ---------- */
export const EASE = {
  /** Meluncur lalu berhenti halus — easing utama SUIO. */
  out: [0.22, 1, 0.36, 1] as const,
  /** Lebih lembut untuk teks & konten. */
  soft: [0.33, 1, 0.68, 1] as const,
  /** Masuk-keluar simetris untuk gerakan berkelanjutan. */
  inOut: [0.65, 0, 0.35, 1] as const,
};

/* ---------- Duration presets (detik) ---------- */
export const DUR = {
  /** Feedback mikro: tekan, ikon. */
  micro: 0.16,
  /** Item kecil, checklist, chip. */
  item: 0.28,
  /** Kartu & panel. */
  card: 0.4,
  /** Transisi halaman & lembar penuh. */
  page: 0.46,
  /** Hero: layar penuh, mushaf, onboarding. */
  hero: 0.6,
} as const;

/* ---------- Spring presets ---------- */
export const SPRING = {
  /** Respons tekan kartu/tombol — cepat, sedikit overshoot. */
  snappy: { type: "spring", stiffness: 420, damping: 30, mass: 0.9 },
  /** Kartu kembali ke posisi setelah tilt/tekan. */
  settle: { type: "spring", stiffness: 300, damping: 24 },
  /** Pill & indikator yang meluncur antar posisi. */
  glide: { type: "spring", stiffness: 320, damping: 30, mass: 0.8 },
  /** Pop kecil: badge, checklist, achievement. */
  pop: { type: "spring", stiffness: 380, damping: 20 },
  /** Sheet & modal masuk — sedikit bouncy tapi terkendali. */
  sheet: { type: "spring", stiffness: 340, damping: 32 },
} as const satisfies Record<string, Transition>;

/* ---------- Variant presets ---------- */

/** Item naik + fade. `i` = indeks untuk stagger ~64 ms/item. */
export function fadeRise(i = 0, distance = 18): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: DUR.card, ease: EASE.out, delay: i * 0.064 },
    },
  };
}

/** Kartu masuk dengan scale tipis (0.985 → 1) — terasa "diletakkan". */
export function cardRise(i = 0): Variants {
  return {
    hidden: { opacity: 0, y: 22, scale: 0.985 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: DUR.card, ease: EASE.out, delay: i * 0.064 },
    },
  };
}

/** Parent stagger: anak memakai `staggerChild`. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.064, delayChildren: 0.04 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.card, ease: EASE.out } },
};

/** Konten halaman: slide dari kanan-bawah tipis + fade (masuk). */
export const pageIn: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.995 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DUR.page, ease: EASE.out },
  },
};

export const pageOut: Variants = {
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.995,
    transition: { duration: 0.24, ease: EASE.soft },
  },
};

/** Bottom sheet / modal: naik dari bawah dengan spring. */
export const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: SPRING.sheet },
  exit: { y: "100%", transition: { duration: 0.28, ease: EASE.out } },
};

export const sheetBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24 } },
  exit: { opacity: 0, transition: { duration: 0.24 } },
};

/** Pop kecil untuk badge/checklist/achievement. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.82 },
  show: { opacity: 1, scale: 1, transition: SPRING.pop },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.18 } },
};

/* ---------- Daftar tunggu transisi antartab (kerangka) ---------- */
/** Masuk tab: fade + slide peluncuran halus ala referensi. */
export const TAB_ENTER: Transition = { duration: DUR.page, ease: EASE.out };
export const TAB_EXIT: Transition = { duration: 0.22, ease: EASE.soft };
