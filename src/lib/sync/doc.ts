/**
 * Tazkiya — Bentuk dokumen data per-akun (cloud) + util statistik dokumen.
 *
 * Satu baris di tabel `user_data` (Supabase) menyimpan SATU dokumen JSON
 * milik SATU pengguna (`user_id`). Kepemilikan dijaga Row Level Security
 * (lihat supabase/schema.sql): pengguna hanya bisa membaca/menulis baris
 * dengan `auth.uid() = user_id`.
 *
 * Dokumen menyalin bentuk persist localStorage Tazkiya apa adanya sehingga
 * migrasi data lama tidak memerlukan konversi apa pun — tidak ada catatan
 * yang diubah bentuknya.
 */
import {
  EXTRA_IDS,
  PRAYER_IDS,
  type AmalEntry,
  type AmalGoal,
  type AyahBookmark,
  type DailyGoal,
  type DailyLog,
  type DeletedReading,
  type JournalEntry,
  type JournalCat,
  type JournalXEntry,
  type FridayPrepData,
  type LastRead,
  type PrayerDetail,
  type PrayerId,
  type QadaRecord,
  type QuranBookmark,
  type ReadingEntry,
  type Settings,
  type TasbihState,
  type WeeklyReflectionReport,
  type ZikirSession,
} from "@/lib/tazkiya/types";
import { hasAnyDayRecord } from "@/lib/tazkiya/stats";

export interface CloudDoc {
  v: 1;
  settings?: Settings;
  logs?: Record<string, DailyLog>;
  prayerDetails?: Record<string, Partial<Record<PrayerId, PrayerDetail>>>;
  fridayZuhurAlt?: Record<string, boolean>;
  bookmarks?: QuranBookmark[];
  ayahBookmarks?: AyahBookmark[];
  lastRead?: LastRead | null;
  readingHistory?: ReadingEntry[];
  /** Batu nisan penghapusan riwayat — penghapusan permanen lintas perangkat. */
  deletedReadings?: DeletedReading[];
  tasbih?: TasbihState;
  /* ---- Perluasan Nūr Companion (opsional — dokumen lama tetap terbaca) ---- */
  qadaRecords?: QadaRecord[];
  journal?: Record<string, JournalEntry>;
  /** Jurnal kategori baru (refleksi/emosi/harapan) — dokumen lama tetap terbaca. */
  journalX?: Record<JournalCat, Record<string, JournalXEntry>>;
  /** Checklist persiapan Jumat per tanggal — dokumen lama tetap terbaca. */
  fridayPrep?: Record<string, FridayPrepData>;
  moods?: Record<string, { mood: string; savedAt: string }>;
  amalEntries?: AmalEntry[];
  amalGoals?: AmalGoal[];
  zikirSessions?: ZikirSession[];
  dailyGoals?: DailyGoal[];
  goalDone?: Record<string, string[]>;
  /** Snapshot refleksi mingguan — kunci = Senin minggu tersebut. */
  weeklyReflections?: Record<string, WeeklyReflectionReport>;
  /** Status laporan mingguan sudah dilihat — kunci minggu → ISO. */
  reflectionViewed?: Record<string, string>;
  /** Pengingat layar penuh sudah disampaikan — salat → tanggal. */
  reminderShown?: Record<string, string>;
}

/** Ambil dokumen lengkap (termasuk pengaturan) dari state store saat ini. */
export function extractFullDoc(state: {
  settings: Settings;
  logs: Record<string, DailyLog>;
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>;
  fridayZuhurAlt: Record<string, boolean>;
  bookmarks: QuranBookmark[];
  ayahBookmarks: AyahBookmark[];
  lastRead: LastRead | null;
  readingHistory: ReadingEntry[];
  deletedReadings: DeletedReading[];
  tasbih: TasbihState;
  qadaRecords: QadaRecord[];
  journal: Record<string, JournalEntry>;
  journalX: Record<JournalCat, Record<string, JournalXEntry>>;
  fridayPrep: Record<string, FridayPrepData>;
  moods: Record<string, { mood: string; savedAt: string }>;
  amalEntries: AmalEntry[];
  amalGoals: AmalGoal[];
  zikirSessions: ZikirSession[];
  dailyGoals: DailyGoal[];
  goalDone: Record<string, string[]>;
  weeklyReflections: Record<string, WeeklyReflectionReport>;
  reflectionViewed: Record<string, string>;
  reminderShown: Record<string, string>;
}): CloudDoc {
  return {
    v: 1,
    settings: state.settings,
    logs: state.logs,
    prayerDetails: state.prayerDetails,
    fridayZuhurAlt: state.fridayZuhurAlt,
    bookmarks: state.bookmarks,
    ayahBookmarks: state.ayahBookmarks,
    lastRead: state.lastRead,
    readingHistory: state.readingHistory,
    deletedReadings: state.deletedReadings,
    tasbih: state.tasbih,
    qadaRecords: state.qadaRecords,
    journal: state.journal,
    journalX: state.journalX,
    fridayPrep: state.fridayPrep,
    moods: state.moods,
    amalEntries: state.amalEntries,
    amalGoals: state.amalGoals,
    zikirSessions: state.zikirSessions,
    dailyGoals: state.dailyGoals,
    goalDone: state.goalDone,
    weeklyReflections: state.weeklyReflections,
    reflectionViewed: state.reflectionViewed,
    reminderShown: state.reminderShown,
  };
}

/**
 * Apakah dokumen kosong (tidak punya catatan ibadah apa pun)?
 * Pengaturan TIDAK dianggap — akun baru dengan preferensi default tetap
 * dianggap kosong sehingga alur pengguna baru (mulai dari 0) berjalan.
 */
export function isEmptyDoc(doc: CloudDoc | null | undefined): boolean {
  if (!doc) return true;
  if (doc.logs && Object.keys(doc.logs).length > 0) return false;
  if (doc.prayerDetails && Object.keys(doc.prayerDetails).length > 0) return false;
  if (doc.fridayZuhurAlt && Object.keys(doc.fridayZuhurAlt).length > 0) return false;
  if (doc.bookmarks && doc.bookmarks.length > 0) return false;
  if (doc.ayahBookmarks && doc.ayahBookmarks.length > 0) return false;
  if (doc.lastRead) return false;
  if (doc.readingHistory && doc.readingHistory.length > 0) return false;
  if (doc.tasbih && doc.tasbih.count > 0) return false;
  /* Data perluasan juga dihitung — tidak boleh dianggap kosong lalu ditimpa. */
  if (doc.qadaRecords && doc.qadaRecords.length > 0) return false;
  if (doc.journal && Object.keys(doc.journal).length > 0) return false;
  if (doc.journalX && Object.values(doc.journalX).some((b) => Object.keys(b ?? {}).length > 0)) return false;
  if (doc.fridayPrep && Object.keys(doc.fridayPrep).length > 0) return false;
  if (doc.moods && Object.keys(doc.moods).length > 0) return false;
  if (doc.amalEntries && doc.amalEntries.length > 0) return false;
  if (doc.zikirSessions && doc.zikirSessions.length > 0) return false;
  if (doc.goalDone && Object.keys(doc.goalDone).length > 0) return false;
  return true;
}

/** Apakah satu tanggal memiliki CATATAN VALID (bukan sekadar entri kosong)? */
export const dateHasRecord = hasAnyDayRecord;

export interface DocStats {
  /** Jumlah tanggal unik yang memiliki catatan valid (hari aktif). */
  activeDays: number;
  /** Total aktivitas selesai: salat dilaksanakan + ibadah tambahan. */
  totalDone: number;
  quranPages: number;
}

/** Ringkasan dokumen untuk dialog migrasi/konflik (angka jujur dari data). */
export function docStats(doc: CloudDoc): DocStats {
  const dates = new Set<string>([
    ...Object.keys(doc.logs ?? {}),
    ...Object.keys(doc.prayerDetails ?? {}),
  ]);
  let activeDays = 0;
  let totalDone = 0;
  let quranPages = 0;
  for (const date of dates) {
    if (dateHasRecord(doc.logs, doc.prayerDetails, date)) activeDays++;
    const l = doc.logs?.[date];
    if (!l) continue;
    for (const p of PRAYER_IDS) if (l.prayers?.[p]) totalDone++;
    for (const e of EXTRA_IDS) if (l.extras?.[e]) totalDone++;
    quranPages += l.quranPages ?? 0;
  }
  return { activeDays, totalDone, quranPages };
}
