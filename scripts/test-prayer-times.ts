/**
 * Uji cepat perhitungan waktu salat — jalur per kota dengan TZ disimulasikan:
 *   TZ=Asia/Jakarta  bun scripts/test-prayer-times.ts jakarta
 *   TZ=Asia/Makassar bun scripts/test-prayer-times.ts makassar
 *   TZ=Asia/Jakarta  bun scripts/test-prayer-times.ts aceh
 *   TZ=Europe/London bun scripts/test-prayer-times.ts london
 *   TZ=Asia/Riyadh   bun scripts/test-prayer-times.ts makkah
 *
 * Referensi (jadwal publik, akhir Okt 2026):
 *  Jakarta Kemenag : Subuh ~04:16 · Zuhur ~11:58 · Asar ~15:17 · Magrib ~17:50 · Isya ~19:01
 *  Makassar Kemenag: Subuh ~04:21 · Zuhur ~11:56 · Asar ~15:14 · Magrib ~18:02 · Isya ~19:11
 *  Aceh Kemenag    : Subuh ~04:47 · Zuhur ~12:03 · Asar ~15:22 · Magrib ~17:59 · Isya ~19:09
 *  London MWL      : Fajr ~05:14 · Dhuhr ~11:53 · Maghrib ~16:32 · Isha ~18:14
 *  Makkah UmmulQura: Fajr ~05:14 · Maghrib ~17:46 · Isya = Magrib + 90 mnt (~19:16)
 */
import { computePrayerTimes, type PrayerCalcMethod } from "../src/lib/tazkiya/prayerTimes";

const CASES: Record<string, { lat: number; lng: number; method: PrayerCalcMethod; date: string }> = {
  jakarta: { lat: -6.2, lng: 106.816, method: "kemenag", date: "2026-10-29" },
  makassar: { lat: -5.147, lng: 119.43, method: "kemenag", date: "2026-10-29" },
  aceh: { lat: 5.548, lng: 95.32, method: "kemenag", date: "2026-10-29" },
  london: { lat: 51.507, lng: -0.127, method: "mwl", date: "2026-10-29" },
  makkah: { lat: 21.42, lng: 39.83, method: "makkah", date: "2026-10-29" },
};

const key = process.argv[2] ?? "jakarta";
const c = CASES[key];
if (!c) {
  console.error("Kota tidak dikenal:", key);
  process.exit(1);
}
const d = new Date(`${c.date}T12:00:00`);
const t = computePrayerTimes(c.lat, c.lng, d, c.method);
console.log(
  `${key} (${c.method}, TZ=${Intl.DateTimeFormat().resolvedOptions().timeZone}) →`,
  `Subuh ${t.subuh} · Zuhur ${t.zuhur} · Asar ${t.asar} · Magrib ${t.magrib} · Isya ${t.isya}`
);
