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
  { id: "subuh", label: "Subuh", caption: "2 rakaat, awal pagi" },
  { id: "zuhur", label: "Zuhur", caption: "4 rakaat, tengah hari" },
  { id: "asar", label: "Asar", caption: "4 rakaat, sore hari" },
  { id: "magrib", label: "Magrib", caption: "3 rakaat, matahari terbenam" },
  { id: "isya", label: "Isya", caption: "4 rakaat, malam hari" },
];

/** Pengganti slot Zuhur pada hari Jumat — wajib berjamaah di masjid. */
export const SALAT_JUMAT: PrayerMeta = {
  id: "zuhur",
  label: "Salat Jumat",
  caption: "Wajib, berjamaah di masjid",
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

/** Mode membaca Al-Qur'an: kartu ayat + terjemahan, atau halaman mushaf. */
export type QuranReadMode = "terjemahan" | "mushaf";

/**
 * Batu nisan penghapusan catatan riwayat bacaan. Disimpan terpisah agar
 * penghapusan BERSIFAT PERMANEN: penggabungan perangkat ↔ akun selalu
 * membuang entri ber-id ini, sehingga data yang dihapus tidak bangkit
 * kembali dari cloud maupun localStorage (maks. 1000 terbaru).
 */
export interface DeletedReading {
  id: string;
  deletedAt: string; // ISO
}

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
  updatedAt: string; // ISO, terakhir kali posisi valid diterima
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
  /** true = direkam otomatis oleh pembaca (dari ayat awal sampai ayat akhir yang terbaca). */
  auto?: boolean;
}

/* ---------- Weekly Reflection (Refleksi Ibadah Mingguan) ---------- */

/** Statistik salat satu hari dalam minggu (slot yang sudah berlalu saja). */
export interface WeeklyDayStats {
  date: string; // YYYY-MM-DD
  slots: number; // kesempatan yang sudah berlalu
  done: number;
  jamaah: number;
  mandiri: number;
  missed: number; // tercatat TIDAK dilaksanakan
  unrecorded: number; // belum dicatat — BUKAN terlewat
}

/**
 * Snapshot laporan refleksi satu minggu (Senin–Minggu). Disimpan saat
 * minggu berakhir sehingga laporan lama tidak berubah oleh catatan baru.
 */
export interface WeeklyReflectionReport {
  weekStart: string; // YYYY-MM-DD Senin (id minggu)
  weekEnd: string; // YYYY-MM-DD Minggu
  savedAt: string; // ISO saat laporan diarsipkan
  days: WeeklyDayStats[]; // 7 hari Senin→Minggu
  prayers: {
    done: number;
    jamaah: number;
    mandiri: number;
    missed: number;
    unrecorded: number;
    opportunities: number;
    pct: number; // 0..100 dari slot yang sudah berlalu
  };
  perPrayer: Record<PrayerId, { done: number; jamaah: number; mandiri: number; missed: number; unrecorded: number; opportunities: number }>;
  zikirTotal: number;
  zikirDays: number;
  quranPages: number;
  quranVerses: number;
  quranDays: number;
  amalCount: number;
  amalDays: number;
  journalCount: number;
  activeDays: number;
  /** Kebiasaan terbaik minggu itu + alasan berbasis data (null bila belum ada). */
  bestHabit: { id: string; label: string; reason: string } | null;
  /** Area perbaikan dengan redaksi lembut (null bila tidak ada yang perlu disorot). */
  improveArea: { id: string; label: string; text: string } | null;
  motivation: string;
}

export interface ReminderTime {
  enabled: boolean;
  time: string; // HH:mm
}

/** Metode sudut perhitungan jadwal salat otomatis (didefinisikan di prayerTimes.ts). */
export type PrayerCalcMethod = "kemenag" | "mwl" | "egypt" | "isna" | "makkah";

/* ---------- Pengalaman khusus Salat Jumat ---------- */

/** Pengaturan pengalaman Salat Jumat (tersinkron lewat settings). */
export interface FridaySettings {
  /** Pengalaman khusus Jumat aktif (kartu spesial, layar penuh, pengingat). */
  enabled: boolean;
  /**
   * Waktu pelaksanaan Salat Jumat di masjid ("HH:MM"). Null = belum diatur —
   * aplikasi memakai waktu masuk Zuhur sebagai referensi sementara dengan
   * keterangan bahwa waktu pelaksanaan di masjid dapat berbeda.
   */
  time: string | null;
  /** Layar penuh "Jumat Telah Menyapa" muncul N menit sebelum waktu pelaksanaan (0 = mati). */
  fullscreenMinutes: number;
  notif: {
    /** Pengingat 15 menit sebelum waktu pelaksanaan. */
    before: boolean;
    /** Pengingat ketika waktu pelaksanaan tiba. */
    atTime: boolean;
    /** Pengingat persiapan Jumat. */
    prep: boolean;
    /** Pengingat membaca Al-Kahfi. */
    kahfi: boolean;
  };
  /** Waktu pengingat persiapan (default 08:00). */
  prepTime: string;
  /** Waktu pengingat Al-Kahfi (default 08:30). */
  kahfiTime: string;
}

export const DEFAULT_FRIDAY_SETTINGS: FridaySettings = {
  enabled: true,
  time: null,
  fullscreenMinutes: 30,
  notif: { before: true, atTime: true, prep: true, kahfi: true },
  prepTime: "08:00",
  kahfiTime: "08:30",
};

/** Checklist persiapan Jumat — pengingat sunnah, bukan syarat sah. */
export const FRIDAY_PREP_ITEMS: string[] = [
  "Mandi Jumat",
  "Membersihkan diri",
  "Memakai pakaian bersih dan terbaik",
  "Menggunakan wewangian bagi yang dianjurkan",
  "Memotong kuku dan merapikan diri",
  "Membaca Surah Al-Kahfi",
  "Memperbanyak selawat",
  "Berangkat lebih awal ke masjid",
];

/** Checklist persiapan per tanggal Jumat — tidak tercampur antarpekan. */
export interface FridayPrepData {
  checks: Record<number, boolean>;
  note?: string;
  savedAt: string; // ISO
  updatedAt?: string; // ISO, terisi setelah perubahan berikutnya
}

export interface Settings {
  name: string;
  /** Foto profil — data URL WebP kecil (±256px, hasil konversi otomatis; JPEG bila browser tak mendukung enkode WebP). */
  avatarDataUrl?: string;
  /** Metode sudut perhitungan jadwal salat otomatis (GPS) — bawaan Kemenag RI. */
  prayerMethod?: PrayerCalcMethod;
  /** Jadwal salat otomatis dari koordinat GPS (butuh settings.geo).
   * Lokasi kini otomatis penuh — flag dipaksa aktif saat hidrasi untuk data lama. */
  prayerTimesAuto?: boolean;
  quranTargetType: QuranTargetType;
  quranDailyTarget: number;
  quranTargetSurah: number; // 1..114, dipakai bila quranTargetType = "surah"
  zikirTarget: number;
  /** Aktivitas tambahan yang dilacak (memengaruhi tampilan Beranda & skor). */
  trackedExtras: ExtraId[];
  /** Warisan mode lokasi manual (input kota sudah dihapus dari UI).
   *  Kolom dipertahankan agar data lama tetap terbaca; tidak dipakai lagi. */
  city: string;
  /** Lokasi perangkat (GPS) — terisi setelah izin lokasi diberikan; pembaruan
   *  otomatis selalu aktif (lokasi otomatis penuh). */
  geo?: DeviceGeo;
  remindersEnabled: boolean;
  reminderTimes: Record<PrayerId, ReminderTime>;
  animations: boolean;
  vibration: boolean;
  showArabic: boolean;
  theme: ThemeMode;
  readerArabicSize: number; // px 20..46
  readerTransSize: number; // px 11..20
  readerLineHeight: number; // 1.7 | 1.9 | 2.2
  readerShowTranslation: boolean;
  /** Mode pembaca Al-Qur'an: "terjemahan" (kartu ayat) atau "mushaf" (halaman). */
  quranReadMode?: QuranReadMode;
  /** Efek suara kertas saat halaman mushaf berhasil dibalik (default aktif). */
  quranPageSound?: boolean;
  /** Tampilkan terjemahan di bawah ayat pada Mode Mushaf (default nonaktif). */
  quranMushafTranslation?: boolean;
  /** Pengingat layar penuh saat masuk waktu salat (default aktif). */
  fullscreenReminder?: boolean;
  /** Pengalaman khusus Salat Jumat (kartu, countdown, checklist, layar penuh). */
  friday?: FridaySettings;
  /** Notifikasi sistem saat aplikasi di latar/tersembunyi (default nonaktif; butuh izin). */
  reminderNotify?: boolean;
  createdAt: string; // ISO, pertama kali memakai aplikasi
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

/* ---------- Qada Tracker ---------- */

/** Satu catatan qada: salat yang terlewat dan ingin dimakbulkan. */
export interface QadaRecord {
  id: string;
  prayer: PrayerId;
  /** Tanggal salat yang ingin diqada (YYYY-MM-DD) — diisi manual oleh pengguna. */
  missedDate: string;
  createdAt: string; // ISO
  /** Terisi ketika pengguna MENCATAT sendiri penyelesaian qada. */
  completedAt?: string; // ISO
  note?: string;
}

/* ---------- Jurnal Syukur & Mood ---------- */

export type MoodId =
  | "bahagia"
  | "tenang"
  | "bersyukur"
  | "lelah"
  | "sedih"
  | "cemas"
  | "campur-aduk";

export const MOODS: { id: MoodId; label: string; emoji: string }[] = [
  { id: "bahagia", label: "Bahagia", emoji: "😊" },
  { id: "tenang", label: "Tenang", emoji: "😌" },
  { id: "bersyukur", label: "Bersyukur", emoji: "🤲" },
  { id: "lelah", label: "Lelah", emoji: "😪" },
  { id: "sedih", label: "Sedih", emoji: "😔" },
  { id: "cemas", label: "Cemas", emoji: "😟" },
  { id: "campur-aduk", label: "Campur aduk", emoji: "🫂" },
];

export function moodLabel(id?: MoodId): string | undefined {
  return MOODS.find((m) => m.id === id)?.label;
}

/** Satu entri jurnal syukur harian — tiga hal yang disyukuri + mood pilihan. */
export interface JournalEntry {
  date: string; // YYYY-MM-DD
  items: [string, string, string];
  mood?: MoodId;
  savedAt: string; // ISO
  updatedAt?: string; // ISO, terisi setelah edit
}

/* ---------- Jurnal: empat kategori (pengalaman jurnal personal) ---------- */

/**
 * Kategori jurnal non-syukur. Jurnal Syukur TETAP memakai struktur
 * `journal` yang ada (data lama tidak disentuh); tiga kategori baru ini
 * punya penyimpanan sendiri dengan bentuk serupa (satu catatan per tanggal
 * per kategori, LWW saat sinkronisasi).
 */
export type JournalCat = "refleksi" | "emosi" | "harapan";

/** Satu catatan jurnal kategori — satu per kategori per tanggal. */
export interface JournalXEntry {
  date: string; // YYYY-MM-DD (tanggal jurnal, bisa dipilih lewat kalender)
  title: string; // judul jurnal
  text: string; // isi tulisan bebas
  /** Jawaban pertanyaan panduan (opsional, urut sesuai pertanyaan kategori). */
  answers?: (string | undefined)[];
  /** Mood emoji (khusus Jurnal Emosi & Penerimaan Diri). */
  mood?: MoodId;
  savedAt: string; // ISO
  updatedAt?: string; // ISO, terisi setelah edit
}

export const JOURNAL_CATS: {
  id: JournalCat;
  label: string;
  short: string;
  desc: string;
  questions: string[];
}[] = [
  {
    id: "refleksi",
    label: "Jurnal Refleksi Diri",
    short: "Refleksi Diri",
    desc: "Luangkan waktu untuk melihat kembali perjalananmu, memahami kesalahan, dan menemukan pelajaran dari setiap pengalaman.",
    questions: [
      "Apa yang terjadi hari ini?",
      "Apa hal yang sudah saya lakukan dengan baik?",
      "Apa yang perlu saya perbaiki?",
      "Apa pelajaran yang saya dapatkan hari ini?",
      "Apa yang akan saya lakukan dengan lebih baik besok?",
    ],
  },
  {
    id: "emosi",
    label: "Jurnal Emosi & Penerimaan Diri",
    short: "Emosi & Penerimaan",
    desc: "Kenali perasaanmu, pahami apa yang kamu alami, dan berikan ruang bagi dirimu untuk bertumbuh.",
    questions: [
      "Bagaimana perasaan saya hari ini?",
      "Apa yang membuat saya merasakan hal tersebut?",
      "Apa yang sebenarnya saya butuhkan?",
      "Apa yang ingin saya lepaskan atau maafkan?",
      "Bagaimana saya bisa memperlakukan diri sendiri dengan lebih baik?",
    ],
  },
  {
    id: "harapan",
    label: "Jurnal Harapan & Ikhtiar",
    short: "Harapan & Ikhtiar",
    desc: "Tuliskan harapanmu, sertakan doa, dan mulai wujudkan dengan ikhtiar terbaik.",
    questions: [
      "Apa yang ingin saya capai?",
      "Mengapa tujuan tersebut penting bagi saya?",
      "Apa doa dan harapan saya?",
      "Langkah kecil apa yang bisa saya mulai hari ini?",
      "Apa bentuk ikhtiar yang akan saya lakukan?",
    ],
  },
];

export function journalCatMeta(cat: JournalCat) {
  return JOURNAL_CATS.find((c) => c.id === cat) ?? JOURNAL_CATS[0];
}

/* ---------- Rizq & Amal ---------- */

export type AmalKind = "sedekah" | "membantu" | "silaturahmi" | "niat-baik" | "berbagi-ilmu" | "lainnya";

export const AMAL_KINDS: { id: AmalKind; label: string; emoji: string }[] = [
  { id: "sedekah", label: "Bersedekah", emoji: "🎁" },
  { id: "membantu", label: "Membantu orang lain", emoji: "🤝" },
  { id: "silaturahmi", label: "Menjaga silaturahmi", emoji: "💬" },
  { id: "niat-baik", label: "Bekerja dengan niat baik", emoji: "🌱" },
  { id: "berbagi-ilmu", label: "Berbagi ilmu atau manfaat", emoji: "📖" },
  { id: "lainnya", label: "Kebaikan lainnya", emoji: "✨" },
];

export function amalKindLabel(id?: AmalKind): string | undefined {
  return AMAL_KINDS.find((k) => k.id === id)?.label;
}

/** Satu catatan amal kebaikan (termasuk sedekah). Tanpa penilaian apa pun. */
export interface AmalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: AmalKind;
  title: string;
  note?: string;
  savedAt: string; // ISO
}

/* ---------- Sesi Zikir ---------- */

export type ZikirSlot = "pagi" | "petang" | "setelah-sholat" | "harian";

/** Riwayat satu sesi zikir (tasbih yang disimpan ke catatan hari). */
export interface ZikirSession {
  id: string;
  date: string; // YYYY-MM-DD
  count: number;
  dhikr: string;
  slot: ZikirSlot;
  savedAt: string; // ISO
}

/* ---------- Target Harian (Daily Journey) ---------- */

/** Target default yang selesai-nya OTOMATIS dihitung dari catatan ibadah. */
export type DailyGoalAuto = "subuh-ontime" | "quran-lembar" | "zikir-pagi" | "zikir-petang" | "amal-hari-ini";

export interface DailyGoal {
  id: string;
  label: string;
  /** Bila terisi, keberselesaian diturunkan dari data nyata; selain itu manual. */
  auto?: DailyGoalAuto;
  enabled: boolean;
  custom?: boolean; // target buatan pengguna, boleh dihapus
}

export const DEFAULT_DAILY_GOALS: DailyGoal[] = [
  { id: "g-subuh", label: "Salat Subuh tepat waktu", auto: "subuh-ontime", enabled: true },
  { id: "g-quran", label: "Baca Al-Qur'an, 1 lembar", auto: "quran-lembar", enabled: true },
  { id: "g-zikir-pagi", label: "Zikir pagi", auto: "zikir-pagi", enabled: true },
  { id: "g-zikir-petang", label: "Zikir petang", auto: "zikir-petang", enabled: true },
  { id: "g-amal", label: "Satu aktivitas kebaikan", auto: "amal-hari-ini", enabled: true },
];

export const DEFAULT_AMAL_GOALS: AmalGoal[] = [
  { id: "a-sedekah", label: "Bersedekah" },
  { id: "a-membantu", label: "Membantu orang lain" },
  { id: "a-silaturahmi", label: "Menjaga silaturahmi" },
  { id: "a-niat", label: "Bekerja dengan niat baik" },
  { id: "a-ilmu", label: "Berbagi ilmu atau manfaat" },
];

/** Target kebaikan pribadi yang dapat dibuat pengguna. */
export interface AmalGoal {
  id: string;
  label: string;
}

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
    name: "Sahabat SUIO",
    quranTargetType: "halaman",
    quranDailyTarget: 5,
    quranTargetSurah: 1,
    zikirTarget: 100,
    trackedExtras: ["duha", "tahajud", "puasa", "sedekah"],
    city: "Jakarta",
    prayerMethod: "kemenag",
    // Lokasi otomatis penuh: jadwal GPS selalu aktif (aktif nyata saat koordinat tersedia).
    prayerTimesAuto: true,
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
    readerArabicSize: 28,
    readerTransSize: 13,
    readerLineHeight: 1.9,
    readerShowTranslation: true,
    quranReadMode: "terjemahan",
    quranPageSound: true,
    quranMushafTranslation: false,
    fullscreenReminder: true,
    reminderNotify: false,
    friday: DEFAULT_FRIDAY_SETTINGS,
    createdAt: new Date().toISOString(),
  };
}
