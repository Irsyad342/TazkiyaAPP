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

/** "Kamis, 19 November 2026" — lengkap dengan tahun (Catatan & Riwayat bacaan). */
export function formatDayFullWithYear(key: string): string {
  const d = keyToDate(key);
  return `${DAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
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
    /* Bulan diambil sebagai ANGKA (nu-latn) lalu dipetakan ke nama Indonesia —
     * kebal varian ICU antarperangkat: sebagian Android memberi nama bulan
     * lokal yang tak ada di tabel alias (mis. "juni") sehingga tanggal
     * Hijriah tampil salah. Angka 1..12 selalu konsisten. */
    const numFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = numFmt.formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const monthNum = Number(parts.find((p) => p.type === "month")?.value);
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    if (day && year && Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return `${day} ${HIJRI_MONTHS_ID[monthNum - 1]} ${year} H`;
    }
    /* Fallback lama: nama bulan lokal dicocokkan ke tabel alias. */
    const fmt = new Intl.DateTimeFormat("id-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const p2 = fmt.formatToParts(d);
    const day2 = p2.find((p) => p.type === "day")?.value ?? "";
    const monthRaw = (p2.find((p) => p.type === "month")?.value ?? "").toLowerCase();
    const year2 = p2.find((p) => p.type === "year")?.value ?? "";
    const idx = HIJRI_MONTH_ALIASES[monthRaw.replace(/['’]/g, "'")] ?? -1;
    const month = idx >= 0 ? HIJRI_MONTHS_ID[idx] : monthRaw;
    return `${day2} ${month} ${year2} H`;
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

/** Sel kalender satu bulan (Senin-awal): null = sel kosong, string = YYYY-MM-DD. */
export function monthCalendarDayKeys(todayKeyStr: string, monthOffset = 0): (string | null)[] {
  const base = keyToDate(todayKeyStr);
  const first = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells: (string | null)[] = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(
      `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  return cells;
}

/** Sel kalender untuk bulan arbitrasi (0 = Januari) — dipakai kalender jurnal
    yang bisa menavigasi bulan bebas, tidak terkait "hari ini". */
export function calendarDayKeys(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (string | null)[] = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return cells;
}

export function daysBetween(a: string, b: string): number {
  const da = keyToDate(a).getTime();
  const db = keyToDate(b).getTime();
  return Math.round((db - da) / 86400000);
}
