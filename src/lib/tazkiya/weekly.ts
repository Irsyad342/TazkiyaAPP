/**
 * Tazkiya — Weekly Reflection (Refleksi Ibadah Mingguan).
 * Periode Senin s.d. Minggu zona waktu LOKAL perangkat. Semua angka
 * DITURUNKAN dari catatan ibadah nyata pada rentang minggu tersebut —
 * aktivitas minggu lain tidak pernah tercampur (kunci tanggal ISO lokal).
 *
 * Laporan minggu yang SUDAH BERAKHIR disimpan sebagai SNAPSHOT (WeeklyReflectionReport)
 * pada saat pengarsipan, sehingga laporan lama tetap konsisten dengan
 * aktivitas historis dan tidak berubah oleh catatan baru. Minggu berjalan
 * selalu dihitung langsung (live) dari data terkini.
 *
 * Aturan kejujuran:
 * - "Belum dicatat" TIDAK dianggap "terlewat" — dua hal dibedakan tegas.
 * - Hari tanpa catatan bukan hari gagal.
 * - Tidak ada angka yang dikarang; metrik tanpa data tidak diklaim.
 */

import type {
  AmalEntry,
  JournalEntry,
  PrayerDetail,
  PrayerId,
  Settings,
  DailyLog,
  ZikirSession,
  WeeklyReflectionReport,
  WeeklyDayStats,
} from "./types";
import { PRAYER_IDS, PRAYERS } from "./types";
import { addDays, keyToDate, mondayOf, todayKey } from "./dates";
import { hasAnyDayRecord, prayerConsistency, elapsedPrayerSlots } from "./stats";
import { resolvePrayerSchedule } from "./prayerTimes";

const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const MAX_WEEKLY_REFLECTIONS = 52;

/** Tujuh kunci tanggal Senin→Minggu untuk satu minggu. */
export function weekDayKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Label rentang minggu, mis. "16–22 November 2026" (aman lintas bulan/tahun). */
export function weekRangeLabel(weekStart: string): string {
  const start = keyToDate(weekStart);
  const end = keyToDate(addDays(weekStart, 6));
  const y = end.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${y}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${y}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

/** Senin minggu yang baru saja berakhir (bila minggu berjalan sudah berganti). */
export function lastCompletedWeekStart(today: string = todayKey()): string {
  return addDays(mondayOf(today), -7);
}

/** Hash string stabil (untuk memilih variasi teks per minggu — tidak acak saat render). */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ---------------- Motivasi (variatif, tanpa mengarang capaian) ---------------- */

const MOTIVATIONS = [
  "Tidak semua hari berjalan sempurna, tetapi setiap usaha untuk kembali memperbaiki diri adalah bagian dari istiqamah. Teruskan langkah kecilmu.",
  "Perjalanan ibadah bukan tentang sempurna, melainkan tentang terus berjalan. Apa yang sudah kamu catat minggu ini adalah modal baik untuk pekan berikutnya.",
  "Setiap catatan kecil adalah bukti niat yang hidup. Semoga Allah memudahkan langkahmu di pekan-pekan selanjutnya.",
  "Pekan ini mungkin ada bagian yang kosong, dan itu wajar. Yang penting hatimu tetap pulang kepada-Nya, lagi dan lagi.",
  "Ibadah tumbuh seperti tanaman: butuh waktu, kesabaran, dan perawatan sederhana setiap hari. Kamu sudah di jalurnya.",
  "Amal yang paling dicintai adalah yang kontinu meski sedikit. Jadikan pekan ini awal yang tenang untuk kebiasaan yang bertahan lama.",
  "Setiap kali kamu kembali mencatat ibadah, kamu sedang memelihara hubungan yang paling berharga. Lanjutkan dengan hati yang lapang.",
  "Evaluasi bukan untuk menyesali, melainkan untuk memperbaiki arah. Ambil satu perbaikan kecil, mulai dari salat berikutnya.",
];

/* ---------------- Builder laporan (murni, dipakai live & arsip) ---------------- */

export interface WeeklyReportContext {
  logs: Record<string, DailyLog>;
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>;
  settings: Settings;
  journal: Record<string, JournalEntry>;
  amalEntries: AmalEntry[];
  zikirSessions: ZikirSession[];
  /** Kunci tanggal "sekarang" — membatasi slot salat yang dianggap sudah berlalu. */
  today: string;
}

/** Statistik salat per jenis salat dalam satu minggu. */
function perPrayerStats(
  ctx: WeeklyReportContext,
  days: string[]
): Record<PrayerId, { done: number; jamaah: number; mandiri: number; missed: number; unrecorded: number; opportunities: number }> {
  const out = {} as Record<PrayerId, { done: number; jamaah: number; mandiri: number; missed: number; unrecorded: number; opportunities: number }>;
  for (const id of PRAYER_IDS) {
    out[id] = { done: 0, jamaah: 0, mandiri: 0, missed: 0, unrecorded: 0, opportunities: 0 };
  }
  for (const date of days) {
    const slots = elapsedPrayerSlots(date, ctx.today, resolvePrayerSchedule(ctx.settings, ctx.today));
    for (const id of slots) {
      const d = ctx.prayerDetails[date]?.[id];
      const legacyDone = !d && ctx.logs[date]?.prayers?.[id];
      const stat = out[id];
      stat.opportunities++;
      if (d?.status === "done" || legacyDone) {
        stat.done++;
        if (d?.kind === "berjamaah") stat.jamaah++;
        else stat.mandiri++;
      } else if (d?.status === "missed") {
        stat.missed++;
      } else {
        stat.unrecorded++;
      }
    }
  }
  return out;
}

/**
 * Susun laporan refleksi untuk satu minggu (Senin `weekStart`).
 * Bila `today` masih di dalam minggu → laporan berjalan (sebagian slot
 * belum berlalu). Bila minggu sudah berakhir → laporan penuh.
 */
export function buildWeeklyReport(ctx: WeeklyReportContext, weekStart: string): WeeklyReflectionReport {
  const days = weekDayKeys(weekStart);
  const weekEnd = days[6];

  const consistency = prayerConsistency({
    prayerDetails: ctx.prayerDetails,
    logs: ctx.logs,
    dates: days,
    today: ctx.today,
    reminderTimes: resolvePrayerSchedule(ctx.settings, ctx.today),
  });

  const dayStats: WeeklyDayStats[] = consistency.days.map((d) => ({
    date: d.date,
    slots: d.slots,
    done: d.done,
    jamaah: d.jamaah,
    mandiri: d.mandiri,
    missed: d.missed,
    unrecorded: d.unrecorded,
  }));

  const perPrayer = perPrayerStats(ctx, days);

  let zikirTotal = 0;
  let quranPages = 0;
  let quranVerses = 0;
  let activeDays = 0;
  let zikirDays = 0;
  let quranDays = 0;
  for (const key of days) {
    const l = ctx.logs[key];
    zikirTotal += l?.zikirCount ?? 0;
    quranPages += l?.quranPages ?? 0;
    quranVerses += l?.quranVerses ?? 0;
    if ((l?.zikirCount ?? 0) > 0) zikirDays++;
    if ((l?.quranPages ?? 0) > 0 || (l?.quranVerses ?? 0) > 0) quranDays++;
    if (hasAnyDayRecord(ctx.logs, ctx.prayerDetails, key)) activeDays++;
  }
  const amalCount = ctx.amalEntries.filter((a) => days.includes(a.date)).length;
  const amalDays = new Set(ctx.amalEntries.filter((a) => days.includes(a.date)).map((a) => a.date)).size;
  const journalCount = days.filter((k) => !!ctx.journal[k]).length;

  /* ---------- Best habit: kebiasaan paling konsisten (berbasis data) ---------- */
  interface Candidate {
    id: string;
    label: string;
    daysCount: number;
    total: number;
    reason: string;
    priority: number;
  }
  const candidates: Candidate[] = [];
  const prayerLabels: Record<string, string> = {
    subuh: "Salat Subuh", zuhur: "Salat Zuhur", asar: "Salat Asar",
    magrib: "Salat Magrib", isya: "Salat Isya",
  };
  for (const id of PRAYER_IDS) {
    const p = perPrayer[id];
    if (p.done > 0) {
      const jam = p.jamaah > 0 ? ` · ${p.jamaah} berjamaah` : "";
      candidates.push({
        id,
        label: prayerLabels[id],
        daysCount: p.done,
        total: p.done,
        reason: `terlaksana ${p.done} dari ${p.opportunities} waktu yang sudah berlalu${jam}`,
        priority: 2,
      });
    }
  }
  if (zikirTotal > 0) {
    candidates.push({
      id: "zikir",
      label: "Zikir",
      daysCount: zikirDays,
      total: zikirTotal,
      reason: `tercatat pada ${zikirDays} hari dengan total ${zikirTotal.toLocaleString("id-ID")} hitungan`,
      priority: 1,
    });
  }
  if (quranPages > 0 || quranVerses > 0) {
    candidates.push({
      id: "quran",
      label: "Bacaan Al-Qur'an",
      daysCount: quranDays,
      total: quranPages * 1000 + quranVerses,
      reason: `dibaca pada ${quranDays} hari, total ${quranPages.toLocaleString("id-ID")} halaman dan ${quranVerses.toLocaleString("id-ID")} ayat`,
      priority: 1,
    });
  }
  if (amalCount > 0) {
    candidates.push({
      id: "amal",
      label: "Amal Kebaikan",
      daysCount: amalDays,
      total: amalCount,
      reason: `${amalCount} kebaikan tercatat pada ${amalDays} hari`,
      priority: 1,
    });
  }
  if (journalCount > 0) {
    candidates.push({
      id: "jurnal",
      label: "Jurnal Syukur",
      daysCount: journalCount,
      total: journalCount,
      reason: `terisi pada ${journalCount} hari`,
      priority: 1,
    });
  }
  candidates.sort((a, b) => b.daysCount - a.daysCount || b.total - a.total || b.priority - a.priority);
  const best = candidates[0];

  /* ---------- Area perbaikan: paling lembut & berbasis slot berlalu ---------- */
  let improve: WeeklyReflectionReport["improveArea"] = null;
  let weakest: { id: PrayerId; ratio: number; missed: number; unrecorded: number; done: number; opportunities: number } | null = null;
  for (const id of PRAYER_IDS) {
    const p = perPrayer[id];
    if (p.opportunities <= 0) continue;
    if (p.missed + p.unrecorded <= 0) continue;
    const ratio = p.done / p.opportunities;
    if (!weakest || ratio < weakest.ratio) {
      weakest = { id, ratio, missed: p.missed, unrecorded: p.unrecorded, done: p.done, opportunities: p.opportunities };
    }
  }
  if (weakest) {
    const label = PRAYERS.find((p) => p.id === weakest!.id)?.label ?? weakest.id;
    const gap = weakest.opportunities - weakest.done;
    const missedDominant = weakest.missed >= weakest.unrecorded && weakest.missed > 0;
    const text = missedDominant
      ? `Beberapa waktu salat ${label} tercatat tidak dilaksanakan minggu ini (${gap} dari ${weakest.opportunities}). Tidak apa-apa — cobalah menyiapkan waktu sedikit lebih awal, dan ambil jeda tenang sebelum waktunya masuk.`
      : `Catatan salat ${label} masih belum konsisten (${gap} dari ${weakest.opportunities} waktu belum tercatat). Cobalah menyiapkan waktu lebih awal, atau catat salatmu segera setelah melaksanakannya.`;
    improve = { id: weakest.id, label, text };
  }

  const motivation = MOTIVATIONS[stableHash(weekStart) % MOTIVATIONS.length];

  return {
    weekStart,
    weekEnd,
    savedAt: new Date().toISOString(),
    days: dayStats,
    prayers: {
      done: consistency.done,
      jamaah: consistency.jamaah,
      mandiri: consistency.mandiri,
      missed: consistency.missed,
      unrecorded: consistency.unrecorded,
      opportunities: consistency.opportunities,
      pct: consistency.pct,
    },
    perPrayer,
    zikirTotal,
    zikirDays,
    quranPages,
    quranVerses,
    quranDays,
    amalCount,
    amalDays,
    journalCount,
    activeDays,
    bestHabit: best ? { id: best.id, label: best.label, reason: best.reason } : null,
    improveArea: improve,
    motivation,
  };
}

/** Apakah satu minggu (snapshot) layak diarsipkan — minimal ada satu catatan nyata. */
export function weekHasAnyRecord(
  ctx: Pick<WeeklyReportContext, "logs" | "prayerDetails">,
  weekStart: string
): boolean {
  return weekDayKeys(weekStart).some((k) => hasAnyDayRecord(ctx.logs, ctx.prayerDetails, k));
}

/** Batas maksimum riwayat refleksi (terlama dibuang). */
export function capWeeklyReflections(
  map: Record<string, WeeklyReflectionReport>
): Record<string, WeeklyReflectionReport> {
  const entries = Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // minggu terbaru dulu
    .slice(0, MAX_WEEKLY_REFLECTIONS);
  return Object.fromEntries(entries);
}
