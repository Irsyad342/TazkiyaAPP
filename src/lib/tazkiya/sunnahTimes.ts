/**
 * Tazkiya — Waktu-Waktu Penting (pelengkap jadwal salat utama):
 * Imsak, Terbit, Duha, dan Tahajud.
 *
 * Sumber angka — konsisten dengan jadwal salat utama, TANPA jam statis:
 * - Imsak      : Subuh − 10 menit (konvensi publikasi jadwal Indonesia).
 *                Selalu tersedia karena jadwal utama (manual/otomatis) memuat Subuh.
 * - Terbit     : waktu terbit astronomis dari computePrayerTimes — hanya bila
 *                koordinat tersedia (jadwal manual tanpa GPS tidak memuat terbit;
 *                ditampilkan jujur sebagai "butuh lokasi", bukan angka karangan).
 * - Duha       : Terbit + ±20 menit (matahari sudah jelas naik, konvensi umum
 *                jadwal Indonesia) hingga masuk Zuhur — rentang tampil.
 * - Tahajud    : sepertiga malam terakhir hingga Subuh; malam = Magrib → Subuh.
 *                Tersedia dari jadwal utama walau tanpa koordinat.
 * Perpindahan hari/tengah malam ditangani lewat offset menit +1440 (subuh
 * selalu dianggap setelah magrib pada malam yang sama).
 */

import type { Settings } from "./types";
import { computePrayerTimes, resolvePrayerSchedule } from "./prayerTimes";

export interface SunnahTimes {
  /** Imsak ("HH:MM") — Subuh − 10 menit. */
  imsak: string | null;
  /** Terbit matahari — null bila koordinat tidak tersedia. */
  terbit: string | null;
  /** Awal Duha (Terbit + ±20 menit) — null bila koordinat tidak tersedia. */
  duhaStart: string | null;
  /** Akhir Duha = masuk Zuhur. */
  duhaEnd: string | null;
  /** Awal sepertiga malam terakhir. */
  tahajudStart: string | null;
  /** Akhir Tahajud = masuk Subuh. */
  tahajudEnd: string | null;
}

const MIN_PER_DAY = 1440;
const IMSAK_GAP_MIN = 10; // konvensi Kemenag: imsak 10 menit sebelum subuh
const DUHA_GAP_MIN = 20; // ±20 menit setelah terbit (estimasi terdokumentasi)

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

function toHHMM(totalMin: number): string {
  const h = Math.floor((totalMin % MIN_PER_DAY) / 60);
  const m = totalMin % MIN_PER_DAY % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Hitung Waktu-Waktu Penting untuk `dateKey` ("YYYY-MM-DD" lokal).
 * Jam diambil dari sumber yang SAMA dengan jadwal salat utama
 * (resolvePrayerSchedule + computePrayerTimes) — metode & ihtiyat tidak diubah.
 */
export function computeSunnahTimes(settings: Settings, dateKey: string): SunnahTimes {
  const schedule = resolvePrayerSchedule(settings, dateKey);
  const subuhMin = minutesOf(schedule.subuh.time);
  const magribMin = minutesOf(schedule.magrib.time);
  const zuhurMin = minutesOf(schedule.zuhur.time);

  // Terbit & awal Duha hanya dari koordinat (sumber astronomis yang sama).
  let terbit: string | null = null;
  if (settings.geo) {
    const date = new Date(`${dateKey}T12:00:00`);
    terbit = computePrayerTimes(settings.geo.lat, settings.geo.lng, date, settings.prayerMethod ?? "kemenag").terbit;
  }

  // Malam Magrib → Subuh (subuh selalu "esoknya" relatif magrib bila lebih kecil).
  const nightMin = ((subuhMin - magribMin) % MIN_PER_DAY + MIN_PER_DAY) % MIN_PER_DAY || MIN_PER_DAY;
  const tahajudStartMin = Math.round(subuhMin - nightMin / 3); // sepertiga malam terakhir, bulatkan ke menit

  return {
    imsak: subuhMin != null ? toHHMM(subuhMin - IMSAK_GAP_MIN) : null,
    terbit,
    duhaStart: terbit != null ? toHHMM(minutesOf(terbit) + DUHA_GAP_MIN) : null,
    duhaEnd: toHHMM(zuhurMin),
    tahajudStart: toHHMM(tahajudStartMin),
    tahajudEnd: toHHMM(subuhMin),
  };
}
