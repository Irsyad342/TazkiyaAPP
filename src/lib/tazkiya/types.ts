/**
 * Tazkiya — Tipe data & konstanta domain ibadah.
 * Lapisan ini murni data/logika, terpisah dari komponen UI.
 */

export type PrayerId = "subuh" | "zuhur" | "asar" | "magrib" | "isya";
export type ExtraId = "duha" | "tahajud" | "doa" | "puasa" | "sedekah";

export interface PrayerMeta {
  id: PrayerId;
  label: string;
  caption: string;
  fullName?: string;
}

export interface ExtraMeta {
  id: ExtraId;
  label: string;
  caption: string;
}

export const PRAYERS: PrayerMeta[] = [
  { id: "subuh", label: "Subuh", caption: "2 rakaat — awal pagi" },
  { id: "zuhur", label: "Zuhur", caption: "4 rakaat — tengah hari" },
  { id: "asar", label: "Asar", caption: "4 rakaat — sore hari" },
  { id: "magrib", label: "Magrib", caption: "3 rakaat — matahari terbenam" },
  { id: "isya", label: "Isya", caption: "4 rakaat — malam hari" },
];

/** Pengganti slot Zuhur pada hari Jumat — wajib berjamaah di masjid. */
export const SALAT_JUMAT: PrayerMeta = {
  id: "zuhur",
  label: "Salat Jumat",
  caption: "Wajib — berjamaah di masjid",
  fullName: "Salat Jumat",
};

/** Pilihan alternatif pada hari Jumat bila tidak melaksanakan Salat Jumat. */
export const ZUHUR_ALTERNATIF: PrayerMeta = {
  id: "zuhur",
  label: "Zuhur",
  caption: "Alternatif Salat Jumat",
  fullName: "Salat Zuhur (alternatif)",
};

/**
 * Aktivitas tambahan yang dapat dilacak.
 * Catatan: "Doa Harian" dihapus dari daftar ini — konten doa tetap tampil
 * sebagai kartu "Doa Hari Ini" di Beranda, tetapi tidak lagi dicatat
 * sebagai aktivitas. ExtraId "doa" tetap ada agar data lama terbaca.
 */
export const EXTRAS: ExtraMeta[] = [
  { id: "duha", label: "Salat Duha", caption: "Salat sunah pagi" },
  { id: "tahajud", label: "Tahajud", caption: "Salat malam" },
  { id: "puasa", label: "Puasa Sunah", caption: "Sunnah puasa" },
  { id: "sedekah", label: "Sedekah", caption: "Amal & berbagi" },
];

/**
 * Bersihkan daftar extras terlacak dari data tersimpan: buang "doa"
 * (tidak lagi dilacak), duplikat, dan id tak dikenal.
 */
export function sanitizeTrackedExtras(list: unknown): ExtraId[] {
  const valid = new Set<ExtraId>(EXTRAS.map((e) => e.id));
  const arr = Array.isArray(list) ? (list as unknown[]) : [];
  const out: ExtraId[] = [];
  for (const v of arr) {
    const id = v as ExtraId;
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/* ---------- Pencatatan salat: status, jenis, dan alasan ---------- */

/** Tiga status salat: belum dicatat / sudah dilaksanakan / tidak dilaksanakan. */
export type PrayerStatus = "none" | "done" | "missed";
/** Jenis pelaksanaan ketika salat dilaksanakan. */
export type PrayerKind = "mandiri" | "berjamaah";

export type MissReasonId =
  | "ketiduran"
  | "lupa"
  | "terlewat"
  | "sakit"
  | "berhalangan"
  | "perjalanan"
  | "lalai"
  | "lainnya";

/** Daftar alasan tidak melaksanakan salat — redaksi netral, tanpa menghakimi. */
export const MISS_REASONS: { id: MissReasonId; label: string }[] = [
  { id: "ketiduran", label: "Ketiduran" },
  { id: "lupa", label: "Lupa" },
  { id: "terlewat", label: "Terlewat waktunya" },
  { id: "sakit", label: "Sedang sakit" },
  { id: "berhalangan", label: "Sedang berhalangan" },
  { id: "perjalanan", label: "Dalam perjalanan / kondisi tertentu" },
  { id: "lalai", label: "Lalai atau malas" },
  { id: "lainnya", label: "Alasan lainnya" },
];

export function missReasonLabel(id?: MissReasonId): string | undefined {
  return MISS_REASONS.find((r) => r.id === id)?.label;
}

/** Detail pencatatan satu salat pada satu tanggal. */
export interface PrayerDetail {
  status: PrayerStatus;
  kind?: PrayerKind; // wajib untuk status "done" (kecuali warisan data lama)
  reason?: MissReasonId; // untuk status "missed"
  reasonText?: string; // teks opsional bila reason = "lainnya"
  savedAt?: string; // ISO
}

/**
 * Derivasi detail dari data lama (warisan): boolean true tanpa detail
 * dianggap "done" tanpa jenis pelaksanaan.
 */
export function selectPrayerDetail(
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>> | undefined,
  logs: Record<string, DailyLog> | undefined,
  date: string,
  id: PrayerId
): PrayerDetail {
  const d = prayerDetails?.[date]?.[id];
  if (d) return d;
  if (logs?.[date]?.prayers[id]) return { status: "done" };
  return { status: "none" };
}

export const PRAYER_IDS: PrayerId[] = PRAYERS.map((p) => p.id);
export const EXTRA_IDS: ExtraId[] = EXTRAS.map((e) => e.id);

export interface DailyLog {
  date: string; // YYYY-MM-DD (waktu lokal)
  prayers: Record<PrayerId, boolean>;
  extras: Record<ExtraId, boolean>;
  quranPages: number;
  quranVerses: number;
  zikirCount: number;
}

export type QuranTargetType = "halaman" | "ayat" | "surah";

export interface QuranBookmark {
  surah: number; // 1..114
  ayah: number;
  savedAt: string; // ISO
}

/** Penanda per-ayat dari pembaca Al-Qur'an (maks. 100 terbaru). */
export interface AyahBookmark {
  surah: number;
  ayah: number;
  savedAt: string; // ISO
}

/** Posisi bacaan terakhir yang tercatat otomatis oleh pembaca. */
export interface LastRead {
  surah: number;
  ayah: number;
  savedAt: string; // ISO
}

export type ThemeMode = "dark" | "light" | "system";

/** Lokasi perangkat (GPS) — hanya disimpan lokal, tanpa server. */
export interface DeviceGeo {
  auto: boolean; // perbarui otomatis saat pengguna berpindah
  lat: number;
  lng: number;
  accuracy?: number; // meter
  label?: string; // nama kota/wilayah hasil reverse geocoding
  updatedAt: string; // ISO — terakhir kali posisi valid diterima
}

export interface ReadingEntry {
  id: string;
  date: string; // YYYY-MM-DD
  pages: number;
  verses: number;
  surah?: number;
  ayahFrom?: number;
  ayahTo?: number;
  savedAt: string; // ISO
}

export interface ReminderTime {
  enabled: boolean;
  time: string; // HH:mm
}

export interface Settings {
  name: string;
  /** Foto profil — data URL WebP kecil (±256px, hasil konversi otomatis; JPEG bila browser tak mendukung enkode WebP). */
  avatarDataUrl?: string;
  quranTargetType: QuranTargetType;
  quranDailyTarget: number;
  quranTargetSurah: number; // 1..114 — dipakai bila quranTargetType = "surah"
  zikirTarget: number;
  /** Aktivitas tambahan yang dilacak (memengaruhi tampilan Beranda & skor). */
  trackedExtras: ExtraId[];
  city: string;
  /** Lokasi perangkat (opsional — terisi setelah pengguna mengaktifkannya). */
  geo?: DeviceGeo;
  remindersEnabled: boolean;
  reminderTimes: Record<PrayerId, ReminderTime>;
  animations: boolean;
  vibration: boolean;
  showArabic: boolean;
  theme: ThemeMode;
  liquidGlass: boolean;
  readerArabicSize: number; // px 20..46
  readerTransSize: number; // px 11..20
  readerLineHeight: number; // 1.7 | 1.9 | 2.2
  readerShowTranslation: boolean;
  createdAt: string; // ISO — pertama kali memakai aplikasi
}

export interface TasbihState {
  count: number;
  target: number;
  dhikr: string;
}

export interface TazkiyaData {
  settings: Settings;
  logs: Record<string, DailyLog>;
  bookmarks: QuranBookmark[];
  ayahBookmarks: AyahBookmark[];
  lastRead: LastRead | null;
  readingHistory: ReadingEntry[];
  tasbih: TasbihState;
  fridayZuhurAlt: Record<string, boolean>;
}

export const DEFAULT_ZIKIR_DHIKR = "Subhanallah";

export const ZIKIR_PRESETS = [
  "Subhanallah",
  "Alhamdulillah",
  "Allahu Akbar",
  "Laa ilaaha illallah",
  "Astaghfirullah",
  "Laa haula wa laa quwwata illaa billah",
];

export function createEmptyLog(date: string): DailyLog {
  return {
    date,
    prayers: { subuh: false, zuhur: false, asar: false, magrib: false, isya: false },
    extras: { duha: false, tahajud: false, doa: false, puasa: false, sedekah: false },
    quranPages: 0,
    quranVerses: 0,
    zikirCount: 0,
  };
}

export function createDefaultSettings(): Settings {
  return {
    name: "Sahabat Tazkiya",
    quranTargetType: "halaman",
    quranDailyTarget: 5,
    quranTargetSurah: 1,
    zikirTarget: 100,
    trackedExtras: ["duha", "tahajud", "puasa", "sedekah"],
    city: "Jakarta",
    remindersEnabled: false,
    reminderTimes: {
      subuh: { enabled: true, time: "04:30" },
      zuhur: { enabled: true, time: "12:00" },
      asar: { enabled: true, time: "15:15" },
      magrib: { enabled: true, time: "18:00" },
      isya: { enabled: true, time: "19:15" },
    },
    animations: true,
    vibration: true,
    showArabic: true,
    theme: "dark",
    liquidGlass: false,
    readerArabicSize: 28,
    readerTransSize: 13,
    readerLineHeight: 1.9,
    readerShowTranslation: true,
    createdAt: new Date().toISOString(),
  };
}
