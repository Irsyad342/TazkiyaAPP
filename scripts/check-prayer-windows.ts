/**
 * Sanity check prayerWindows — Jakarta & contoh kasus lintas tengah malam.
 * Menjalankan computePrayerTimes + resolvePrayerWindows tanpa store.
 */
import { computePrayerTimes } from "../src/lib/tazkiya/prayerTimes";
import { resolvePrayerWindows, windowClock, nowTotalMinutes } from "../src/lib/tazkiya/prayerWindows";
import { PRAYERS, SALAT_JUMAT, ZUHUR_ALTERNATIF, type Settings } from "../src/lib/tazkiya/types";

const settings: Settings = {
  prayerTimesAuto: true,
  prayerMethod: "kemenag",
  geo: { lat: -6.2088, lng: 106.8456, label: "Jakarta" },
} as unknown as Settings;

const dateKey = "2026-11-06"; // Jumat
const prayers = [PRAYERS[0], SALAT_JUMAT, PRAYERS[2], PRAYERS[3], PRAYERS[4]];

const t = computePrayerTimes(-6.2088, 106.8456, new Date(`${dateKey}T12:00:00`), "kemenag");
console.log("Jakarta 2026-11-06 (Kemenag):", t);
const tomorrow = computePrayerTimes(-6.2088, 106.8456, new Date("2026-11-07T12:00:00"), "kemenag");
console.log("Subuh esok:", tomorrow.subuh);

const w = resolvePrayerWindows(settings, dateKey, prayers);
for (const p of prayers) {
  const win = w[p.id];
  const h = Math.floor((win?.durationMin ?? 0) / 60);
  const m = (win?.durationMin ?? 0) % 60;
  console.log(
    `${p.label.padEnd(11)} ${win?.start} → ${win?.end ?? "—"} (${win?.endLabel}) durasi ${h}j ${m}m lintasMalam=${win?.crossesMidnight}`
  );
}

// Jam 04:30 pagi → Isya (jendela semalam) masih aktif?
const dawn = new Date("2026-11-06T04:30:00");
console.log("04:30 → isya:", windowClock(w.isya!, dawn));
// Jam 05:30 → subuh aktif sampai terbit?
console.log("05:30 → subuh:", windowClock(w.subuh!, new Date("2026-11-06T05:30:00")));
// Jam 12:30 → jumat/suhur
console.log("12:30 → jumat:", windowClock(w.zuhur!, new Date("2026-11-06T12:30:00")));

// Ummul Qura: tengah malam
const settingsMakkah = { ...settings, prayerMethod: "makkah" } as unknown as Settings;
const wm = resolvePrayerWindows(settingsMakkah, dateKey, prayers);
console.log("Isya (Ummul Qura):", wm.isya?.start, "→", wm.isya?.end, wm.isya?.endLabel, "| note:", wm.isya?.endNote);

// Jadwal manual TANPA koordinat: batas akhir harus null, bukan karangan
const manualSettings = { prayerTimesAuto: false, reminderTimes: { subuh: { time: "04:30", enabled: true }, zuhur: { time: "12:00", enabled: true }, asar: { time: "15:15", enabled: true }, magrib: { time: "17:45", enabled: true }, isya: { time: "18:55", enabled: true } } } as unknown as Settings;
const wManual = resolvePrayerWindows(manualSettings, dateKey, PRAYERS);
console.log("Manual tanpa geo → subuh end:", wManual.subuh?.end, "| isya end:", wManual.isya?.end, "| zuhur end:", wManual.zuhur?.end, "(harus Asar 15:15)");
console.log("nowTotalMinutes(23:45):", nowTotalMinutes(new Date("2026-11-06T23:45:00")));
