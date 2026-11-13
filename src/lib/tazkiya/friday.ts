/**
 * Tazkiya — Logika pengalaman khusus Salat Jumat.
 *
 * Murni data/waktu (tanpa UI):
 * - `fridayTimeOf`: waktu pelaksanaan efektif — pengaturan pengguna bila ada,
 *   bila tidak waktu masuk Zuhur jadwal efektif hari itu (dengan keterangan
 *   bahwa waktu pelaksanaan di masjid dapat berbeda).
 * - `useFridayCountdown`: hitung mundur menuju waktu pelaksanaan (tick 1 dtk
 *   hanya di komponen kecil yang memakainya, tidak me-render halaman).
 * - Notifikasi sistem sekali per jenis per tanggal (anti berulang).
 */

import { useEffect, useState } from "react";

/* ---------- Waktu pelaksanaan efektif ---------- */

export interface FridayTimeInfo {
  /** "HH:MM" waktu pelaksanaan efektif. */
  time: string;
  /** true bila memakai waktu masuk Zuhur (pengguna belum mengatur). */
  fallback: boolean;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + (m ?? 0);
}

/** Waktu pelaksanaan efektif Jumat + penanda fallback. */
export function fridayTimeOf(friday: { time: string | null } | undefined, zuhurStart: string | undefined): FridayTimeInfo {
  if (friday?.time) return { time: friday.time, fallback: false };
  return { time: zuhurStart ?? "12:00", fallback: true };
}

/* ---------- Countdown ---------- */

export interface CountdownParts {
  h: string;
  m: string;
  s: string;
  /** true setelah waktu pelaksanaan terlewati. */
  arrived: boolean;
}

/** Selisih menit-hari dari `now` ke target "HH:MM" pada hari yang sama. */
function secondsUntil(time: string, now: Date): number {
  const target = new Date(now);
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  target.setHours(h, m ?? 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 1000);
}

function partsFrom(sec: number): CountdownParts {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
    arrived: sec <= 0,
  };
}

/**
 * Hitung mundur menuju `time` hari ini. Tick 1 detik HANYA selama komponen
 * pemakai terpasang (kartu/layar penuh Jumat) — tidak pernah me-render
 * halaman lain. `active=false` menghentikan interval (hemat baterai).
 */
export function useFridayCountdown(time: string, active: boolean, now0: Date): CountdownParts {
  const compute = (): CountdownParts => partsFrom(secondsUntil(time, new Date()));
  const [parts, setParts] = useState<CountdownParts>(() => compute());
  useEffect(() => {
    if (!active) {
      setParts(compute());
      return;
    }
    setParts(compute());
    const iv = window.setInterval(() => setParts(compute()), 1000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, active]);
  // now0 hanya untuk sinkron awal saat tanggal berubah (lintas tengah malam).
  void now0;
  return parts;
}

/* ---------- Notifikasi sistem (sekali per jenis per tanggal) ---------- */

/** Kirim notifikasi sistem bila didukung & diizinkan. false bila tidak mungkin. */
export function notifyFriday(title: string, body: string, tag: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, { body, tag });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* abaikan */
      }
    };
    return true;
  } catch {
    return false;
  }
}
