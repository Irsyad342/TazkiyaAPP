/**
 * Tazkiya — Perhitungan statistik.
 * Semua angka DITURUNKAN dari log aktivitas pengguna (bukan angka acak).
 */
"use client";

import {
  EXTRA_IDS,
  PRAYER_IDS,
  createEmptyLog,
  missReasonLabel,
  selectPrayerDetail,
  type DailyLog,
  type ExtraId,
  type MissReasonId,
  type PrayerDetail,
  type PrayerId,
  type ReadingEntry,
  type ReminderTime,
} from "./types";
import { addDays, keyToDate, lastNDays, mondayOf, todayKey, weekdayShort } from "./dates";

/** Total aktivitas untuk daftar extras yang dilacak (5 salat + extras terpilih). */
export function totalActivities(trackedExtras: ExtraId[] = EXTRA_IDS): number {
  return PRAYER_IDS.length + trackedExtras.length;
}

/** Kompatibilitas: total dengan semua extras. */
export const TOTAL_ACTIVITIES = PRAYER_IDS.length + EXTRA_IDS.length; // 10

export interface DayScore {
  date: string;
  done: number;
  total: number;
  pct: number; // 0..100
}

/**
 * Skor harian: 5 salat + extras yang DILACAK saja. Salat yang tidak
 * dilaksanakan (boolean false) tidak ikut dihitung sebagai selesai.
 */
export function dayScore(log: DailyLog | undefined, date: string, trackedExtras: ExtraId[] = EXTRA_IDS): DayScore {
  const l = log ?? createEmptyLog(date);
  const total = PRAYER_IDS.length + trackedExtras.length;
  let done = 0;
  for (const p of PRAYER_IDS) if (l.prayers[p]) done++;
  for (const e of trackedExtras) if (l.extras?.[e]) done++;
  return { date, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/** Deret skor harian untuk n hari terakhir (urut lama → baru). */
export function seriesLastDays(
  logs: Record<string, DailyLog>,
  n: number,
  endKey?: string,
  trackedExtras: ExtraId[] = EXTRA_IDS
): DayScore[] {
  const end = endKey ?? todayKey();
  const out: DayScore[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addDays(end, -i);
    out.push(dayScore(logs[key], key, trackedExtras));
  }
  return out;
}

export interface RangeSummary {
  avgPct: number;
  totalDone: number;
  totalPossible: number;
  activeDays: number; // hari dengan minimal 1 aktivitas tercatat
  perfectDays: number; // hari dengan semua salat wajib selesai
  quranPages: number;
  zikir: number;
}

export function summarizeRange(
  logs: Record<string, DailyLog>,
  keys: string[],
  trackedExtras: ExtraId[] = EXTRA_IDS
): RangeSummary {
  let totalDone = 0;
  let activeDays = 0;
  let perfectDays = 0;
  let quranPages = 0;
  let zikir = 0;
  const total = PRAYER_IDS.length + trackedExtras.length;
  for (const key of keys) {
    const l = logs[key];
    const s = dayScore(l, key, trackedExtras);
    totalDone += s.done;
    if (l) {
      if (s.done > 0) activeDays++;
      if (PRAYER_IDS.every((p) => l.prayers[p])) perfectDays++;
      quranPages += l.quranPages;
      zikir += l.zikirCount;
    }
  }
  return {
    avgPct: keys.length && total > 0 ? Math.round((totalDone / (keys.length * total)) * 100) : 0,
    totalDone,
    totalPossible: keys.length * total,
    activeDays,
    perfectDays,
    quranPages,
    zikir,
  };
}

/** Minggu berjalan (Senin s.d. hari ini) dan minggu lalu (Senin–Minggu penuh). */
export function weekRanges(today: string = todayKey()): { thisWeek: string[]; lastWeek: string[] } {
  const thisMonday = mondayOf(today);
  const thisWeek: string[] = [];
  for (let i = 0; i <= ((keyToDate(today).getDay() + 6) % 7); i++) thisWeek.push(addDays(thisMonday, i));
  const lastMonday = addDays(thisMonday, -7);
  const lastWeek: string[] = [];
  for (let i = 0; i < 7; i++) lastWeek.push(addDays(lastMonday, i));
  return { thisWeek, lastWeek };
}

/** Bulan berjalan: hari ke-1 bulan ini s.d. hari ini. */
export function monthRange(today: string = todayKey()): string[] {
  const d = keyToDate(today);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const keys: string[] = [];
  const cursor = new Date(first);
  while (cursor <= d) {
    keys.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/**
 * Streak hari konsisten: jumlah hari beruntun di mana SELURUH salat wajib
 * ditandai selesai. Hari ini ikut dihitung hanya jika sudah lengkap.
 */
export function computeStreak(logs: Record<string, DailyLog>, today: string = todayKey()): number {
  const isComplete = (key: string) => {
    const l = logs[key];
    if (!l) return false;
    return PRAYER_IDS.every((p) => l.prayers[p]);
  };
  let streak = 0;
  let cursor = isComplete(today) ? today : addDays(today, -1);
  while (isComplete(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Jumlah kumulatif tiap aktivitas dalam rentang — untuk "paling sering dilakukan". */
export function activityCounts(
  logs: Record<string, DailyLog>,
  keys: string[],
  trackedExtras: ExtraId[] = EXTRA_IDS
): { id: string; label: string; count: number }[] {
  const ids = [...PRAYER_IDS, ...trackedExtras];
  const counts = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const key of keys) {
    const l = logs[key];
    if (!l) continue;
    for (const p of PRAYER_IDS) if (l.prayers[p]) counts.set(p, (counts.get(p) ?? 0) + 1);
    for (const e of trackedExtras) if (l.extras?.[e]) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  const labels: Record<string, string> = {
    subuh: "Salat Subuh", zuhur: "Salat Zuhur", asar: "Salat Asar",
    magrib: "Salat Magrib", isya: "Salat Isya", duha: "Salat Duha",
    tahajud: "Tahajud", doa: "Doa Harian", puasa: "Puasa Sunah", sedekah: "Sedekah",
  };
  return ids
    .map((id) => ({ id, label: labels[id], count: counts.get(id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Progres bacaan satu surah pada satu tanggal: jumlah ayat unik yang
 * benar-benar tercatat dibaca (gabungan rentang riwayat), bukan sekadar
 * membuka surah.
 */
export function surahProgressOnDate(
  history: ReadingEntry[],
  date: string,
  surah: number,
  ayatCount: number
): { read: number; pct: number } {
  const ranges: [number, number][] = [];
  for (const e of history) {
    if (e.date !== date || e.surah !== surah) continue;
    const from = Math.max(1, e.ayahFrom ?? 1);
    const to = Math.min(ayatCount, Math.max(from, e.ayahTo ?? from));
    if (to >= from) ranges.push([from, to]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let read = 0;
  let cursor = 0; // ayat terakhir yang sudah tercakup
  for (const [from, to] of ranges) {
    if (to <= cursor) continue;
    read += to - Math.max(cursor, from - 1);
    cursor = to;
  }
  const pct = ayatCount > 0 ? Math.min(100, Math.round((read / ayatCount) * 100)) : 0;
  return { read, pct };
}

/** Data kalender satu bulan (grid Senin-awal) untuk heatmap riwayat. */
export interface CalendarCell {
  key: string | null;
  day: number | null;
  pct: number | null;
  isToday: boolean;
  isFuture: boolean;
}

export function monthCalendar(today: string = todayKey(), monthOffset = 0): CalendarCell[] {
  const base = keyToDate(today);
  const first = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells: CalendarCell[] = [];
  const leading = (first.getDay() + 6) % 7; // Senin = 0
  for (let i = 0; i < leading; i++) cells.push({ key: null, day: null, pct: null, isToday: false, isFuture: false });
  for (let day = 1; day <= last.getDate(); day++) {
    const key = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isFuture = key > today;
    cells.push({ key, day, pct: null, isToday: key === today, isFuture });
  }
  return cells;
}

export function monthLabel(today: string = todayKey(), monthOffset = 0): string {
  const base = keyToDate(today);
  const d = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${names[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekdayLabels(): string[] {
  return ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
}

export function dayShort(key: string): string {
  return weekdayShort(key);
}

/* ---------- Konsistensi salat (7 hari) ----------
 * Persentase = salat terlaksana ÷ kesempatan salat yang SUDAH berlangsung.
 * - Hari lampau: seluruh 5 slot dianggap sudah berlalu.
 * - Hari ini: slot dihitung setelah waktu pengingat salat tsb berlalu
 *   (proksi waktu salat — jadwal otomatis belum tersedia).
 * - Jumat: slot Zuhur digantikan Salat Jumat — tetap SATU slot, tidak dobel.
 * - "Belum dicatat" selalu dibedakan dari "Tidak dilaksanakan".
 */

export interface DayPrayerStats {
  date: string;
  slots: number; // kesempatan yang sudah berlangsung
  done: number;
  jamaah: number;
  mandiri: number;
  missed: number;
  unrecorded: number;
}

export interface ConsistencyStats {
  days: DayPrayerStats[];
  opportunities: number;
  done: number;
  jamaah: number;
  mandiri: number;
  missed: number;
  unrecorded: number;
  pct: number; // 0..100
  reasons: { id: MissReasonId; label: string; count: number }[]; // urut terbanyak
}

/** Slot salat yang sudah berlalu pada `date` (hari ini: berdasar jam pengingat). */
export function elapsedPrayerSlots(
  date: string,
  today: string,
  reminderTimes: Record<PrayerId, ReminderTime>
): PrayerId[] {
  if (date > today) return [];
  if (date < today) return PRAYER_IDS;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return PRAYER_IDS.filter((id) => {
    const t = reminderTimes?.[id]?.time;
    if (!t) return true;
    const [h, m] = t.split(":").map((v) => parseInt(v, 10) || 0);
    return nowMin >= h * 60 + m;
  });
}

export function prayerConsistency(args: {
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>;
  logs: Record<string, DailyLog>;
  dates: string[];
  today: string;
  reminderTimes: Record<PrayerId, ReminderTime>;
}): ConsistencyStats {
  const { prayerDetails, logs, dates, today, reminderTimes } = args;
  const days: DayPrayerStats[] = [];
  const reasonCounts = new Map<MissReasonId, number>();
  const totals = { opportunities: 0, done: 0, jamaah: 0, mandiri: 0, missed: 0, unrecorded: 0 };

  for (const date of dates) {
    const slots = elapsedPrayerSlots(date, today, reminderTimes);
    const day: DayPrayerStats = { date, slots: slots.length, done: 0, jamaah: 0, mandiri: 0, missed: 0, unrecorded: 0 };
    for (const id of slots) {
      const d = selectPrayerDetail(prayerDetails, logs, date, id);
      if (d.status === "done") {
        day.done++;
        if (d.kind === "berjamaah") day.jamaah++;
        else if (d.kind === "mandiri") day.mandiri++;
      } else if (d.status === "missed") {
        day.missed++;
        if (d.reason) reasonCounts.set(d.reason, (reasonCounts.get(d.reason) ?? 0) + 1);
      } else {
        day.unrecorded++;
      }
    }
    days.push(day);
    totals.opportunities += day.slots;
    totals.done += day.done;
    totals.jamaah += day.jamaah;
    totals.mandiri += day.mandiri;
    totals.missed += day.missed;
    totals.unrecorded += day.unrecorded;
  }

  const reasons = [...reasonCounts.entries()]
    .map(([id, count]) => ({ id, label: missReasonLabel(id) ?? String(id), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    days,
    ...totals,
    pct: totals.opportunities > 0 ? Math.round((totals.done / totals.opportunities) * 100) : 0,
    reasons,
  };
}

/* ---------- Riwayat aktivitas Profil (dinamis, berbasis catatan nyata) ----------
 * - Hari aktif = tanggal unik yang benar-benar memiliki catatan valid.
 * - Hari tanpa catatan TIDAK dianggap gagal — hanya "belum ada catatan".
 * - Sebelum catatan pertama: tampilan kosong yang ramah (tanpa data fiktif).
 * - Setelah itu daftar bertumbuh 1..7 tanggal; mencapai 7 → jendela tujuh
 *   hari berjalan yang konsisten (berakhir hari ini).
 */

/** Apakah satu tanggal memiliki catatan valid (bukan entri kosong)? */
export function hasAnyDayRecord(
  logs: Record<string, DailyLog> | undefined,
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>> | undefined,
  date: string
): boolean {
  const d = prayerDetails?.[date];
  if (d && Object.keys(d).length > 0) return true;
  const l = logs?.[date];
  if (!l) return false;
  if (PRAYER_IDS.some((p) => l.prayers?.[p])) return true;
  if (EXTRA_IDS.some((e) => l.extras?.[e])) return true;
  if ((l.quranPages ?? 0) > 0 || (l.quranVerses ?? 0) > 0 || (l.zikirCount ?? 0) > 0) return true;
  return false;
}

/** Semua tanggal dengan catatan valid, urut lama → baru. */
export function recordedDateList(
  logs: Record<string, DailyLog>,
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>
): string[] {
  const dates = new Set<string>([...Object.keys(logs ?? {}), ...Object.keys(prayerDetails ?? {})]);
  return [...dates].filter((d) => hasAnyDayRecord(logs, prayerDetails, d)).sort();
}

/**
 * Hari-hari yang ditampilkan pada Riwayat Aktivitas Profil (urut terbaru dulu):
 * 0 catatan → kosong; 1..7 catatan → tanggal nyata (bertumbuh); >7 → jendela
 * tujuh hari berjalan (hari tanpa catatan tampil netral, bukan gagal).
 */
export function reviewActivityDays(recorded: string[], today: string): string[] {
  if (recorded.length === 0) return [];
  if (recorded.length <= 7) return [...recorded].sort().reverse();
  return lastNDays(7, today).slice().reverse();
}
