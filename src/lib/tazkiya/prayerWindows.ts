/**
 * Tazkiya — Jendela waktu setiap slot salat untuk kartu jadwal (tiket):
 * waktu mulai, batas akhir, durasi, dan keterangan batas akhirnya.
 * Sumber angka (tanpa jam statis):
 * - Batas antar slot = waktu masuk salat berikutnya pada JADWAL EFEKTIF hari itu
 *   (GPS/otomatis atau manual — mengikuti resolvePrayerSchedule).
 * - Batas akhir Subuh = terbit matahari, dihitung dari koordinat perangkat bila
 *   tersedia; jadwal manual tanpa koordinat tidak memuat terbit → null (bukan karangan).
 * - Batas akhir Isya mengikuti metode perhitungan yang dipilih pengguna:
 *   • Kemenag RI / MWL / Mesir / ISNA → hingga masuk waktu Subuh esok hari
 *     (fajar shadiq) — standar SIHAT Kemenag RI.
 *   • Ummul Qura (Makkah) → tengah malam: titik tengah antara Magrib dan
 *     Subuh esok hari (konvensi Umm al-Qura).
 * - Slot Isya melintasi pukul 00:00 → durasi dan progress memperhitungkan
 *   pergantian hari (offset +24 jam), termasuk saat halaman terbuka melewati tengah malam.
 */

import type { PrayerCalcMethod, PrayerId, PrayerMeta, Settings } from "./types";
import { computePrayerTimes, PRAYER_METHOD_OPTIONS, resolvePrayerSchedule } from "./prayerTimes";

export interface PrayerWindow {
  /** Waktu mulai slot ("HH:MM") — dari jadwal efektif. */
  start: string;
  /** Waktu batas akhir ("HH:MM") atau null bila data tidak tersedia. */
  end: string | null;
  /** Label batas akhir, mis. "Terbit", "Asar", "Subuh esok", "Tengah malam". */
  endLabel: string;
  /** Keterangan batas akhir (mis. metode Isya) atau alasan data tak tersedia. */
  endNote: string | null;
  /** Jendela melintasi pukul 00:00 (Isya metode sudut). */
  crossesMidnight: boolean;
  /** Durasi jendela dalam menit; null bila batas akhir tidak tersedia. */
  durationMin: number | null;
}

export type PrayerWindows = Partial<Record<PrayerId, PrayerWindow>>;

const MIN_PER_DAY = 24 * 60;

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const next = new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 12, 0, 0, 0);
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${mm}-${dd}`;
}

/** Titik tengah antara Magrib hari ini dan Subuh esok (konvensi Umm al-Qura). */
function midMoment(maghribMin: number, nextSubuhMin: number): number {
  return Math.round(maghribMin + (nextSubuhMin + MIN_PER_DAY - maghribMin) / 2) % MIN_PER_DAY;
}

function toHHMM(totalMin: number): string {
  const h = Math.floor((totalMin % MIN_PER_DAY) / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Jendela waktu untuk daftar slot hari `dateKey` (urutan sama dengan `prayers`,
 * termasuk penggantian Zuhur → Salat Jumat pada hari Jumat).
 */
export function resolvePrayerWindows(
  settings: Settings,
  dateKey: string,
  prayers: PrayerMeta[]
): PrayerWindows {
  const schedule = resolvePrayerSchedule(settings, dateKey);
  const method: PrayerCalcMethod = settings.prayerMethod ?? "kemenag";
  const methodLabel = PRAYER_METHOD_OPTIONS.find((o) => o.id === method)?.label ?? method;
  const geo = settings.geo;

  // Waktu astronomis pendukung batas akhir (hanya bila koordinat tersedia):
  // terbit hari ini + Subuh esok, dihitung dari koordinat perangkat.
  let terbitMin: number | null = null;
  let nextSubuhMin: number | null = null;
  if (geo) {
    const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
    const today = computePrayerTimes(geo.lat, geo.lng, date, method);
    const tomorrow = computePrayerTimes(geo.lat, geo.lng, new Date(date.getTime() + 86_400_000), method);
    terbitMin = minutesOf(today.terbit);
    nextSubuhMin = minutesOf(tomorrow.subuh);
  }

  const windows: PrayerWindows = {};
  for (let i = 0; i < prayers.length; i++) {
    const p = prayers[i];
    const start = schedule[p.id]?.time;
    if (!start) continue;
    const startMin = minutesOf(start);

    let end: string | null = null;
    let endLabel = "";
    let endNote: string | null = null;
    let crossesMidnight = false;

    if (p.id === "subuh") {
      // Batas akhir Subuh: terbit matahari — fenomena nyata di lokasi pengguna.
      if (terbitMin !== null) {
        end = toHHMM(terbitMin);
        endLabel = "Terbit";
        endNote = "Waktu Subuh berakhir saat matahari terbit.";
      } else {
        endLabel = "Terbit";
        endNote = "Terbit matahari tidak tersedia — aktifkan lokasi atau jadwal otomatis.";
      }
    } else if (p.id === "isya") {
      // Batas akhir Isya mengikuti metode perhitungan yang dipilih.
      if (method === "makkah") {
        if (nextSubuhMin !== null && schedule.magrib?.time) {
          const mid = midMoment(minutesOf(schedule.magrib.time), nextSubuhMin);
          end = toHHMM(mid);
          endLabel = "Tengah malam";
          endNote = `Batas akhir Isya (Ummul Qura): tengah malam — titik tengah Magrib dan Subuh esok.`;
        } else {
          endLabel = "Tengah malam";
          endNote = "Tengah malam tidak dapat dihitung tanpa koordinat lokasi.";
        }
      } else if (nextSubuhMin !== null) {
        end = toHHMM(nextSubuhMin);
        endLabel = "Subuh esok";
        crossesMidnight = true;
        endNote = `Batas akhir Isya (${methodLabel}): hingga masuk waktu Subuh esok hari (fajar shadiq).`;
      } else {
        endLabel = "Subuh esok";
        endNote = `Batas akhir Isya (${methodLabel}) memerlukan koordinat lokasi untuk dihitung.`;
      }
    } else {
      // Slot tengah hari: batas akhir = masuknya salat berikutnya pada jadwal efektif.
      const nextSlot = prayers[i + 1];
      const nextStart = nextSlot ? schedule[nextSlot.id]?.time : undefined;
      if (nextStart) {
        end = nextStart;
        endLabel = nextSlot.label;
        endNote = `Waktu ${p.label} berakhir saat masuk waktu ${nextSlot.label}.`;
      } else {
        endLabel = nextSlot?.label ?? "Salat berikutnya";
        endNote = "Batas akhir tidak tersedia pada jadwal ini.";
      }
    }

    const endMin = end !== null ? minutesOf(end) + (crossesMidnight ? MIN_PER_DAY : 0) : null;
    windows[p.id] = {
      start,
      end,
      endLabel,
      endNote,
      crossesMidnight,
      durationMin: endMin !== null ? Math.max(1, endMin - startMin) : null,
    };
  }
  return windows;
}

/** Menit sejak 00:00 dari objek Date (menit + detik). */
export function nowTotalMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

/**
 * Posisi waktu `now` terhadap satu jendela: aktif / telah lewat / akan datang,
 * ditambah progress (0–1) dan sisa detik bila aktif. Aman melewati tengah malam:
 * geseran +24 jam HANYA untuk jendela yang memang lintas tengah malam (Isya),
 * sehingga slot masa depan tidak keliru terbaca "lewat".
 * Untuk jendela tanpa batas akhir (jadwal manual tanpa koordinat), fase awal
 * "aktif/future" disempurnakan pemanggilnya berdasar urutan slot hari itu.
 */
export function windowClock(
  w: PrayerWindow,
  now: Date
): { phase: "active" | "past" | "future"; progress: number; secondsLeft: number } {
  const startMin = minutesOf(w.start);
  const endMin = w.end !== null ? minutesOf(w.end) + (w.crossesMidnight ? MIN_PER_DAY : 0) : null;
  const nowMin = nowTotalMinutes(now);

  if (endMin === null) {
    return { phase: nowMin >= startMin ? "active" : "future", progress: 0, secondsLeft: 0 };
  }
  const effNow = w.crossesMidnight && nowMin < startMin ? nowMin + MIN_PER_DAY : nowMin;
  if (effNow >= startMin && effNow < endMin) {
    const progress = Math.min(1, Math.max(0, (effNow - startMin) / (endMin - startMin)));
    return { phase: "active", progress, secondsLeft: Math.max(0, Math.round((endMin - effNow) * 60)) };
  }
  return { phase: effNow >= endMin ? "past" : "future", progress: 0, secondsLeft: 0 };
}
