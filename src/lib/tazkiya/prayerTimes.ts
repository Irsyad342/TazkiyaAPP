/**
 * Tazkiya — Perhitungan jadwal salat astronomis dari koordinat GPS.
 * Melengkapi janji pada kartu "Pengaturan Lokasi": "Perhitungan jadwal salat
 * otomatis berdasarkan koordinat".
 *
 * Prinsip:
 * - 100% perhitungan lokal (algoritma posisi matahari standar — presisi ±1–2
 *   menit, setara aplikasi jadwal salat pada umumnya). TANPA jaringan, TANPA
 *   dependensi baru, koordinat tidak pernah dikirim ke server.
 * - Zona waktu mengikuti perangkat pada tanggal tersebut (`getTimezoneOffset`)
 *   sehingga jadwal otomatis cocok dengan daerah pengguna saat berpindah.
 * - Metode sudut: Kemenag RI (Subuh 20°, Isya 18°) sebagai bawaan — standar
 *   Indonesia; opsi MWL, Mesir, ISNA, dan Ummul Qura (Makkah) tersedia.
 * - Ihtiyat +2 menit ditambahkan ke setiap waktu (kebiasaan publikasi jadwal
 *   di Indonesia) agar pengguna tidak menyalip waktu yang belum masuk.
 * - Asar memakai mazhab Syafi'i (faktor bayangan 1) — sesuai mayoritas Indonesia.
 * - Fungsi murni: tidak menyimpan state, aman dipanggil saat render.
 */

import type { PrayerCalcMethod, PrayerId, Settings } from "./types";

export const PRAYER_METHOD_OPTIONS: { id: PrayerCalcMethod; label: string; note: string }[] = [
  { id: "kemenag", label: "Kemenag RI", note: "20°/18° — standar Indonesia" },
  { id: "mwl", label: "Liga Muslim Dunia", note: "18°/17°" },
  { id: "egypt", label: "Otoritas Mesir", note: "19,5°/17,5°" },
  { id: "isna", label: "ISNA (Amerika Utara)", note: "15°/15°" },
  { id: "makkah", label: "Ummul Qura (Makkah)", note: "18,5° · Isya = Magrib +90 mnt" },
];

const METHOD_ANGLES: Record<PrayerCalcMethod, { fajr: number; isha: number; ishaIntervalMin?: number }> = {
  kemenag: { fajr: 20, isha: 18 },
  mwl: { fajr: 18, isha: 17 },
  egypt: { fajr: 19.5, isha: 17.5 },
  isna: { fajr: 15, isha: 15 },
  makkah: { fajr: 18.5, isha: 0, ishaIntervalMin: 90 },
};

const IHTIYAT_MIN = 2; // batal: ditambahkan ke setiap waktu (menit pembulatan aman)
const SUNRISE_ALT = -0.833; // refraksi atmosfer + diameter matahari

const sin = (d: number) => Math.sin((d * Math.PI) / 180);
const cos = (d: number) => Math.cos((d * Math.PI) / 180);
const tan = (d: number) => Math.tan((d * Math.PI) / 180);
const asin = (x: number) => (Math.asin(x) * 180) / Math.PI;
const acos = (x: number) => (Math.acos(x) * 180) / Math.PI;
const atan = (x: number) => (Math.atan(x) * 180) / Math.PI;
const atan2 = (y: number, x: number) => (Math.atan2(y, x) * 180) / Math.PI;
const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (h: number) => ((h % 24) + 24) % 24;

/** Hari Julian pada pukul 0 UT untuk tanggal kalender (y, m, d). */
function julianDay(y0: number, m0: number, d0: number): number {
  let y = y0;
  let m = m0;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d0 + b - 1524.5
  );
}

/** Deklinasi matahari (derajat) & persamaan waktu (jam) — formula presisi rendah NOAA. */
function sunPosition(jd: number): { declination: number; equation: number } {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d); // anomali rata-rata
  const q = fixAngle(280.459 + 0.98564736 * d); // bujur rata-rata
  const l = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g)); // bujur ekliptika
  const e = 23.439 - 0.00000036 * d; // kemiringan sumbu
  const declination = asin(sin(e) * sin(l));
  const ra = fixAngle(atan2(cos(e) * sin(l), cos(l))) / 15; // asensio rekta (jam)
  const equation = q / 15 - fixHour(ra); // persamaan waktu (jam, bisa negatif)
  return { declination, equation };
}

/** Sudut jam matahari (derajat) saat matahari berada pada ketinggian `altDeg`. */
function hourAngleFor(lat: number, declination: number, altDeg: number): number {
  const cosH = (sin(altDeg) - sin(lat) * sin(declination)) / (cos(lat) * cos(declination));
  // Klem untuk kasus kutub/tahun kabisat ekstrem — jadwal tetap menghasilkan angka.
  return acos(Math.max(-1, Math.min(1, cosH)));
}

/** Format jam desimal → "HH:MM" (dibulatkan ke menit terdekat). */
function toHHMM(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface ComputedPrayerTimes {
  subuh: string;
  zuhur: string;
  asar: string;
  magrib: string;
  isya: string;
}

/**
 * Hitung waktu salat "HH:MM" untuk koordinat & tanggal (zona waktu perangkat).
 * @param lat  lintang derajat (utara positif)
 * @param lng  bujur derajat (timur positif)
 * @param date tanggal referensi (dipakai y/m/d + zona waktunya)
 */
export function computePrayerTimes(lat: number, lng: number, date: Date, method: PrayerCalcMethod = "kemenag"): ComputedPrayerTimes {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const tz = -date.getTimezoneOffset() / 60; // zona waktu perangkat pada tanggal itu

  // Konvensi PrayTimes: bujur dipadatkan ke hari Julian agar semua waktu
  // dihitung dalam kerangka matahari, lalu digeser ke waktu lokal sekali di akhir.
  const jDate = julianDay(y, m, d) - lng / (15 * 24);
  const { declination, equation } = sunPosition(jDate);
  const angles = METHOD_ANGLES[method];

  const noon = fixHour(12 - equation); // tengah hari matahari (jam solar)
  const base = noon + tz - lng / 15; // konversi ke waktu lokal

  const at = (altDeg: number, after: boolean): number => {
    const h = hourAngleFor(lat, declination, altDeg) / 15; // jam
    return base + (after ? h : -h);
  };

  const subuh = at(-angles.fajr, false);
  const maghrib = at(SUNRISE_ALT, true);
  const isyaInterval = angles.ishaIntervalMin != null;
  const isya =
    angles.ishaIntervalMin != null ? maghrib + angles.ishaIntervalMin / 60 : at(-angles.isha, true);

  // Asar Syafi'i: ketinggian matahari (di atas horizon) saat bayangan benda
  // = panjang benda + bayangan saat tengah hari → sudut jam dari ketinggian itu.
  const asrAltAbove = atan(1 / (1 + tan(Math.abs(lat - declination))));
  const asar = base + hourAngleFor(lat, declination, asrAltAbove) / 15;

  const plusIhtiyat = (h: number) => h + IHTIYAT_MIN / 60;
  // Pengaman urutan untuk lintasan ekstrem: Subuh ≤ Zuhur ≤ Asar ≤ Magrib ≤ Isya.
  const zuhur = Math.max(subuh, base);
  const asarSafe = Math.max(zuhur, asar);
  const magribSafe = Math.max(asarSafe, maghrib);
  const isyaFinal = isyaInterval
    ? plusIhtiyat(magribSafe) + angles.ishaIntervalMin! / 60 // Ummul Qura: Magrib + 90 mnt
    : plusIhtiyat(Math.max(magribSafe, isya));

  return {
    subuh: toHHMM(fixHour(plusIhtiyat(subuh))),
    zuhur: toHHMM(fixHour(plusIhtiyat(zuhur))),
    asar: toHHMM(fixHour(plusIhtiyat(asarSafe))),
    magrib: toHHMM(fixHour(plusIhtiyat(magribSafe))),
    isya: toHHMM(fixHour(isyaFinal)),
  };
}

/**
 * Jadwal efektif yang dipakai aplikasi pada `dateKey` ("YYYY-MM-DD"):
 * - Bila "jadwal otomatis (GPS)" aktif dan koordinat tersedia → waktu hasil
 *   perhitungan astronomis, dengan flag pengingat dari preferensi manual.
 * - Selain itu → jadwal manual yang sudah ada (perilaku lama, tak berubah).
 * Bentuk hasil sama dengan `settings.reminderTimes` sehingga drop-in untuk
 * seluruh pemakai lama (stats, pola slot, dsb.).
 */
export function resolvePrayerSchedule(settings: Settings, dateKey: string): Record<PrayerId, { time: string; enabled: boolean }> {
  const manual = settings.reminderTimes;
  const geo = settings.geo;
  if (!settings.prayerTimesAuto || !geo) {
    return manual;
  }
  const date = new Date(`${dateKey}T12:00:00`);
  const computed = computePrayerTimes(geo.lat, geo.lng, date, settings.prayerMethod ?? "kemenag");
  return {
    subuh: { enabled: manual?.subuh?.enabled ?? true, time: computed.subuh },
    zuhur: { enabled: manual?.zuhur?.enabled ?? true, time: computed.zuhur },
    asar: { enabled: manual?.asar?.enabled ?? true, time: computed.asar },
    magrib: { enabled: manual?.magrib?.enabled ?? true, time: computed.magrib },
    isya: { enabled: manual?.isya?.enabled ?? true, time: computed.isya },
  };
}
