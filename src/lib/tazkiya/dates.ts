/**
 * Tazkiya — Helper tanggal lokal (Masehi & Hijriah).
 * Semua tanggal dihitung berdasarkan waktu lokal perangkat.
 */

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, delta: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

/** Daftar n kunci tanggal yang berakhir pada `endKey` (inklusif, urut lama → baru). */
export function lastNDays(n: number, endKey: string = todayKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i));
  return out;
}

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function weekdayShort(key: string): string {
  return DAY_SHORT[keyToDate(key).getDay()];
}

export function weekdayIndexMondayFirst(key: string): number {
  return (keyToDate(key).getDay() + 6) % 7;
}

/** Apakah tanggal ini hari Jumat? (slot Zuhur digantikan Salat Jumat) */
export function isFriday(key: string): boolean {
  return keyToDate(key).getDay() === 5;
}

export function formatGregorian(d: Date = new Date()): string {
  return `${DAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayMonth(key: string): string {
  const d = keyToDate(key);
  return `${d.getDate()} ${MONTH_FULL[d.getMonth()]}`;
}

export function formatDayFull(key: string): string {
  const d = keyToDate(key);
  return `${DAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_FULL[d.getMonth()]}`;
}

/** Label relatif: Hari Ini / Kemarin / tanggal. */
export function relativeDayLabel(key: string, today: string = todayKey()): string {
  if (key === today) return "Hari Ini";
  if (key === addDays(today, -1)) return "Kemarin";
  return formatDayFull(key);
}

/* ---------- Hijriah ---------- */

const HIJRI_MONTHS_ID = [
  "Muharam", "Safar", "Rabiul Awal", "Rabiul Akhir",
  "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
  "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah",
];

const HIJRI_MONTH_ALIASES: Record<string, number> = {
  muharam: 0, muharram: 0, safar: 1,
  "rabiulawal": 2, "rabiul awal": 2, "rabi' al-awwal": 2,
  "rabiulakhir": 3, "rabiul akhir": 3,
  jumadilawal: 4, "jumadil awal": 4,
  jumadilakhir: 5, "jumadil akhir": 5,
  rejeb: 6, rajab: 6,
  "sya'ban": 7, syaban: 7, syaaban: 7,
  ramadhan: 8, ramadan: 8,
  syawal: 9,
  dzulqaedah: 10, "dzulqa'dah": 10, zulkaedah: 10,
  dzulhijjah: 11, zulhijjah: 11,
};

/**
 * Tanggal Hijriah via kalender islamic-umalqura bawaan platform (Intl).
 * Mengembalikan format: "24 Rabiul Awal 1447 H".
 */
export function formatHijri(d: Date = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat("id-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = fmt.formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const monthRaw = (parts.find((p) => p.type === "month")?.value ?? "").toLowerCase();
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    const idx = HIJRI_MONTH_ALIASES[monthRaw.replace(/['’]/g, "'")] ?? -1;
    const month = idx >= 0 ? HIJRI_MONTHS_ID[idx] : monthRaw;
    return `${day} ${month} ${year} H`;
  } catch {
    return "";
  }
}

/* ---------- Util rentang mingguan (Senin sebagai awal minggu) ---------- */

export function mondayOf(key: string): string {
  const d = keyToDate(key);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return dateKey(d);
}

export function daysBetween(a: string, b: string): number {
  const da = keyToDate(a).getTime();
  const db = keyToDate(b).getTime();
  return Math.round((db - da) / 86400000);
}
