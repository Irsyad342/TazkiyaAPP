"use client";

import { useEffect } from "react";

/**
 * SUIO — GlobalMotionGuard: penjaga beban animasi global.
 *
 * Saat tab/ aplikasi tersembunyi (pindah aplikasi, layar mati, tab lain),
 * SEMUA animasi CSS di-pause lewat class `html.tk-tab-hidden` (lihat
 * globals.css). Animasi dilanjutkan PERSIS dari posisi terakhir saat
 * kembali terlihat — bukan diulang dari awal — sehingga karakter animasi
 * SUIO tidak berubah sama sekali; yang dihemat adalah CPU/GPU/baterai
 * di perangkat mobile saat aplikasi tidak dilihat pengguna.
 *
 * Catatan: rAF JavaScript memang otomatis berhenti saat tab hidden,
 * tetapi animasi CSS compositor tetap berjalan — di sinilah guard ini
 * bekerja. Satu listener, dibersihkan saat unmount.
 */
export function GlobalMotionGuard() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => root.classList.toggle("tk-tab-hidden", document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      root.classList.remove("tk-tab-hidden");
    };
  }, []);
  return null;
}
