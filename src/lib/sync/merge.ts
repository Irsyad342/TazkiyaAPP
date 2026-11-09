/**
 * Tazkiya — Penggabungan dokumen data (perangkat ↔ akun) tanpa duplikat.
 *
 * Prinsip (murni fungsi — mudah diuji):
 * - Salat: detail dengan `savedAt` TERBARU menang (status/jenis/alasan ikut).
 *   Warisan data lama tanpa detail (boolean di `logs`) diperlakukan sebagai
 *   "done" implisit — penggabungan boolean memakai ATAU (aditif, tidak dobel).
 * - Ibadah tambahan (extras): ATAU — selesai tetap selesai, tidak dijumlah.
 * - Riwayat bacaan: gabungan berdasarkan `id` unik — catatan yang sama tidak
 *   pernah tercipta dua kali.
 * - Halaman/ayat Al-Qur'an per hari: dihitung ulang dari riwayat gabungan
 *   bila tersedia, dan TIDAK PERNAH melebihi maks(total sisi) — mencegah
 *   catatan ganda saat data sama digabung dua kali.
 * - Zikir: maksimum kedua sisi (anti-duplikasi; jumlah bisa menggandakan
 *   bila data identik disatukan dua kali).
 * - lastRead / penanda bacaan: `savedAt` terbaru menang; penanda per-ayat
 *   digabung unik per (surah, ayat), maksimal 100 terbaru.
 * - Pengaturan: pemenang ditentukan pemanggil (`settingsFrom`) — saat
 *   hidrasi dari akun, akun yang menang; saat dorongan berkala, perangkat
 *   aktif yang menang (perangkat sedang dipakai pengguna).
 */
import type {
  AyahBookmark,
  DailyLog,
  DeletedReading,
  LastRead,
  PrayerDetail,
  PrayerId,
  QuranBookmark,
  ReadingEntry,
  Settings,
  TasbihState,
} from "@/lib/tazkiya/types";
import { PRAYER_IDS } from "@/lib/tazkiya/types";
import { createEmptyLog } from "@/lib/tazkiya/types";
import type { CloudDoc } from "./doc";

export interface MergeOptions {
  /** Sisi mana yang menang untuk `settings`. */
  settingsFrom: "local" | "cloud";
}

type DayDetails = Partial<Record<PrayerId, PrayerDetail>>;

function savedAtOf(d?: PrayerDetail | null): number {
  if (!d?.savedAt) return 0;
  const t = Date.parse(d.savedAt);
  return Number.isNaN(t) ? 0 : t;
}

function mergeDetails(
  local?: DayDetails,
  cloud?: DayDetails
): { details: DayDetails; impliedDone: Partial<Record<PrayerId, boolean>> } {
  const details: DayDetails = {};
  const impliedDone: Partial<Record<PrayerId, boolean>> = {};
  for (const pid of PRAYER_IDS) {
    const l = local?.[pid];
    const c = cloud?.[pid];
    let chosen: PrayerDetail | undefined;
    if (l && c) chosen = savedAtOf(l) >= savedAtOf(c) ? l : c;
    else chosen = l ?? c;
    if (chosen) {
      // Normalisasi: status "none" tidak pernah disimpan (selalu dihapus store).
      if (chosen.status !== "none") details[pid] = chosen;
      impliedDone[pid] = chosen.status === "done";
    }
  }
  return { details, impliedDone };
}

function mergeLogs(
  localLogs: Record<string, DailyLog>,
  cloudLogs: Record<string, DailyLog>,
  mergedHistory: ReadingEntry[],
  localDetails: Record<string, DayDetails>,
  cloudDetails: Record<string, DayDetails>,
  /** Tanggal yang memiliki catatan dihapus — counter dihitung ulang dari riwayat. */
  tombstonedDates: Set<string>
): Record<string, DailyLog> {
  const dates = new Set<string>([
    ...Object.keys(localLogs),
    ...Object.keys(cloudLogs),
    ...Object.keys(localDetails),
    ...Object.keys(cloudDetails),
  ]);
  const out: Record<string, DailyLog> = {};

  // Total bacaan per tanggal dari riwayat gabungan (anti duplikat via id unik).
  const historyTotals = new Map<string, { pages: number; verses: number }>();
  for (const e of mergedHistory) {
    const t = historyTotals.get(e.date) ?? { pages: 0, verses: 0 };
    t.pages += e.pages ?? 0;
    t.verses += e.verses ?? 0;
    historyTotals.set(e.date, t);
  }

  for (const date of dates) {
    const l = localLogs[date];
    const c = cloudLogs[date];
    const base = createEmptyLog(date);
    const { details, impliedDone } = mergeDetails(localDetails[date], cloudDetails[date]);

    const prayers = { ...base.prayers };
    for (const pid of PRAYER_IDS) {
      if (pid in impliedDone) prayers[pid] = !!impliedDone[pid];
      else prayers[pid] = !!(l?.prayers?.[pid] || c?.prayers?.[pid]);
    }

    const extras = { ...base.extras };
    for (const key of Object.keys(base.extras) as (keyof typeof base.extras)[]) {
      extras[key] = !!(l?.extras?.[key] || c?.extras?.[key]);
    }

    // Zikir: maksimum (anti catatan ganda bila data identik digabung ulang).
    const zikirCount = Math.max(l?.zikirCount ?? 0, c?.zikirCount ?? 0);

    // Halaman/ayat: maks(total sisi, total dari riwayat gabungan) — tidak pernah menggandakan.
    // Tanggal yang terdampak penghapusan dihitung ulang PENUH dari riwayat
    // gabungan: counter lama yang masih memuat entri terhapus tidak boleh
    // dipertahankan (justru sumber kebangkitan data yang sudah dihapus).
    const lPages = l?.quranPages ?? 0;
    const cPages = c?.quranPages ?? 0;
    const lVerses = l?.quranVerses ?? 0;
    const cVerses = c?.quranVerses ?? 0;
    const hTot = historyTotals.get(date);
    if (tombstonedDates.has(date)) {
      out[date] = { ...base, date, prayers, extras, quranPages: hTot?.pages ?? 0, quranVerses: hTot?.verses ?? 0, zikirCount };
      continue;
    }
    const quranPages = Math.max(lPages, cPages, hTot?.pages ?? 0);
    const quranVerses = Math.max(lVerses, cVerses, hTot?.verses ?? 0);

    out[date] = { ...base, date, prayers, extras, quranPages, quranVerses, zikirCount };
  }
  return out;
}

function mergeDetailsMaps(
  local: Record<string, DayDetails>,
  cloud: Record<string, DayDetails>
): Record<string, DayDetails> {
  const dates = new Set<string>([...Object.keys(local), ...Object.keys(cloud)]);
  const out: Record<string, DayDetails> = {};
  for (const date of dates) {
    const { details } = mergeDetails(local[date], cloud[date]);
    if (Object.keys(details).length > 0) out[date] = details;
  }
  return out;
}

/**
 * Gabungkan riwayat bacaan dengan penghormatan penuh pada batu nisan
 * penghapusan: entri yang pernah dihapus (di perangkat mana pun) TIDAK
 * PERNAH masuk kembali ke hasil gabungan — inilah kunci permanensi
 * penghapusan riwayat lintas perangkat & sesi login.
 */
function mergeReadingHistory(local: ReadingEntry[], cloud: ReadingEntry[], tombstones: DeletedReading[]): ReadingEntry[] {
  const dead = new Set(tombstones.map((d) => d.id));
  const byId = new Map<string, ReadingEntry>();
  for (const e of local) if (!dead.has(e.id)) byId.set(e.id, e);
  for (const e of cloud) if (!byId.has(e.id) && !dead.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => Date.parse(b.savedAt || "0") - Date.parse(a.savedAt || "0"));
}

/** Gabungkan batu nisan: unik per id, versi terbaru menang, maks 1000. */
function mergeDeletedReadings(local: DeletedReading[], cloud: DeletedReading[]): DeletedReading[] {
  const byId = new Map<string, DeletedReading>();
  for (const d of cloud) byId.set(d.id, d);
  for (const d of local) {
    const cur = byId.get(d.id);
    if (!cur || Date.parse(d.deletedAt || "0") > Date.parse(cur.deletedAt || "0")) byId.set(d.id, d);
  }
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.deletedAt || "0") - Date.parse(a.deletedAt || "0"))
    .slice(0, 1000);
}

function mergeAyahBookmarks(local: AyahBookmark[], cloud: AyahBookmark[]): AyahBookmark[] {
  const byKey = new Map<string, AyahBookmark>();
  const key = (b: AyahBookmark) => `${b.surah}:${b.ayah}`;
  for (const b of local) byKey.set(key(b), b);
  for (const b of cloud) {
    const cur = byKey.get(key(b));
    if (!cur || Date.parse(b.savedAt || "0") > Date.parse(cur.savedAt || "0")) byKey.set(key(b), b);
  }
  return [...byKey.values()]
    .sort((a, b) => Date.parse(b.savedAt || "0") - Date.parse(a.savedAt || "0"))
    .slice(0, 100);
}

function newestOf<T extends { savedAt: string }>(a: T | null | undefined, b: T | null | undefined): T | null {
  if (a && b) return Date.parse(a.savedAt || "0") >= Date.parse(b.savedAt || "0") ? a : b;
  return a ?? b ?? null;
}

/**
 * Gabungkan dua dokumen menjadi satu — TIDAK MUTASI input, hasil deterministik
 * & idempoten (merge(A, merge(A,B)) === merge(A,B)).
 */
export function mergeDocs(local: CloudDoc, cloud: CloudDoc, opts: MergeOptions): CloudDoc {
  const deletedReadings = mergeDeletedReadings(local.deletedReadings ?? [], cloud.deletedReadings ?? []);
  const readingHistory = mergeReadingHistory(local.readingHistory ?? [], cloud.readingHistory ?? [], deletedReadings);
  const localDetails = local.prayerDetails ?? {};
  const cloudDetails = cloud.prayerDetails ?? {};

  const prayerDetails = mergeDetailsMaps(localDetails, cloudDetails);
  const tombstonedDates = new Set<string>();
  for (const e of (local.readingHistory ?? []).concat(cloud.readingHistory ?? [])) {
    if (deletedReadings.some((d) => d.id === e.id)) tombstonedDates.add(e.date);
  }
  const logs = mergeLogs(local.logs ?? {}, cloud.logs ?? {}, readingHistory, localDetails, cloudDetails, tombstonedDates);

  const fridayZuhurAlt: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(local.fridayZuhurAlt ?? {})) if (v) fridayZuhurAlt[k] = true;
  for (const [k, v] of Object.entries(cloud.fridayZuhurAlt ?? {})) if (v) fridayZuhurAlt[k] = true;

  const bookmarks: QuranBookmark[] = (() => {
    const w = newestOf(local.bookmarks?.[0], cloud.bookmarks?.[0]);
    return w ? [w] : [];
  })();

  const lastRead: LastRead | null = newestOf(local.lastRead, cloud.lastRead);

  const lt = local.tasbih;
  const ct = cloud.tasbih;
  const tasbih: TasbihState = {
    count: Math.max(lt?.count ?? 0, ct?.count ?? 0),
    target: lt?.target ?? ct?.target ?? 100,
    dhikr: lt?.dhikr ?? ct?.dhikr ?? "Subhanallah",
  };

  const settings: Settings | undefined =
    opts.settingsFrom === "cloud" ? cloud.settings ?? local.settings : local.settings ?? cloud.settings;

  /* ---------- Perluasan Nūr Companion ---------- */
  const qadaRecords = mergeById(local.qadaRecords ?? [], cloud.qadaRecords ?? [], (q) => q.createdAt ?? "");
  const amalEntries = mergeById(local.amalEntries ?? [], cloud.amalEntries ?? [], (e) => e.savedAt ?? "");
  const zikirSessions = mergeById(local.zikirSessions ?? [], cloud.zikirSessions ?? [], (z) => z.savedAt ?? "").slice(0, 500);
  const journal = mergeJournal(local.journal ?? {}, cloud.journal ?? {});
  const moods = mergeMoods(local.moods ?? {}, cloud.moods ?? {});
  const amalGoals = mergeGoals(local.amalGoals ?? [], cloud.amalGoals ?? []);
  const dailyGoals = mergeDailyGoals(local.dailyGoals ?? [], cloud.dailyGoals ?? []);
  const goalDone = mergeGoalDone(local.goalDone ?? {}, cloud.goalDone ?? {});
  // Refleksi mingguan: gabung per minggu; snapshot dengan savedAt terbaru menang.
  const weeklyReflections = mergeWeeklyReflections(local.weeklyReflections ?? {}, cloud.weeklyReflections ?? {});
  // Status dilihat: waktu terbaru menang (anti popup berulang lintas perangkat).
  const reflectionViewed = mergeViewed(local.reflectionViewed ?? {}, cloud.reflectionViewed ?? {});
  // Pengingat yang sudah disampaikan: tanggal terbaru menang per salat.
  const reminderShown = mergeReminderShown(local.reminderShown ?? {}, cloud.reminderShown ?? {});

  return {
    v: 1,
    settings,
    logs,
    prayerDetails,
    fridayZuhurAlt,
    bookmarks,
    ayahBookmarks: mergeAyahBookmarks(local.ayahBookmarks ?? [], cloud.ayahBookmarks ?? []),
    lastRead,
    readingHistory,
    deletedReadings,
    tasbih,
    qadaRecords,
    journal,
    moods,
    amalEntries,
    amalGoals,
    zikirSessions,
    dailyGoals,
    goalDone,
    weeklyReflections,
    reflectionViewed,
    reminderShown,
  };
}

/* ---------- Penggabungan perluasan (semua idempoten & anti-duplikat) ---------- */

/** Refleksi mingguan: unik per minggu; snapshot `savedAt` terbaru menang. */
function mergeWeeklyReflections(
  local: NonNullable<CloudDoc["weeklyReflections"]>,
  cloud: NonNullable<CloudDoc["weeklyReflections"]>
): NonNullable<CloudDoc["weeklyReflections"]> {
  const out: NonNullable<CloudDoc["weeklyReflections"]> = {};
  const weeks = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const week of weeks) {
    const l = local[week];
    const c = cloud[week];
    if (l && c) out[week] = Date.parse(l.savedAt || "0") >= Date.parse(c.savedAt || "0") ? l : c;
    else out[week] = l ?? c;
  }
  return out;
}

/** Status dilihat refleksi: entri dengan ISO terbaru menang per minggu. */
function mergeViewed(
  local: NonNullable<CloudDoc["reflectionViewed"]>,
  cloud: NonNullable<CloudDoc["reflectionViewed"]>
): NonNullable<CloudDoc["reflectionViewed"]> {
  const out: NonNullable<CloudDoc["reflectionViewed"]> = {};
  const weeks = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const week of weeks) {
    const l = local[week];
    const c = cloud[week];
    if (l && c) out[week] = Date.parse(l) >= Date.parse(c) ? l : c;
    else out[week] = l ?? c;
  }
  return out;
}

/** Pengingat tersampaikan: tanggal (YYYY-MM-DD) terbesar menang per salat. */
function mergeReminderShown(
  local: NonNullable<CloudDoc["reminderShown"]>,
  cloud: NonNullable<CloudDoc["reminderShown"]>
): NonNullable<CloudDoc["reminderShown"]> {
  const out: NonNullable<CloudDoc["reminderShown"]> = {};
  const prayers = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const p of prayers) {
    const l = local[p];
    const c = cloud[p];
    if (l && c) out[p] = l >= c ? l : c;
    else out[p] = l ?? c;
  }
  return out;
}


function mergeById<T extends { id: string }>(local: T[], cloud: T[], savedAtOf: (t: T) => string): T[] {
  const byId = new Map<string, T>();
  for (const item of local) byId.set(item.id, item);
  for (const item of cloud) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => Date.parse(savedAtOf(b) || "0") - Date.parse(savedAtOf(a) || "0"));
}

/** Jurnal per tanggal: entri dengan `updatedAt`/`savedAt` terbaru menang. */
function mergeJournal(
  local: NonNullable<CloudDoc["journal"]>,
  cloud: NonNullable<CloudDoc["journal"]>
): NonNullable<CloudDoc["journal"]> {
  const out: NonNullable<CloudDoc["journal"]> = {};
  const dates = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const date of dates) {
    const l = local[date];
    const c = cloud[date];
    if (l && c) {
      const lt = Date.parse(l.updatedAt ?? l.savedAt ?? "0");
      const ct = Date.parse(c.updatedAt ?? c.savedAt ?? "0");
      out[date] = lt >= ct ? l : c;
    } else out[date] = l ?? c;
  }
  return out;
}

function mergeMoods(
  local: NonNullable<CloudDoc["moods"]>,
  cloud: NonNullable<CloudDoc["moods"]>
): NonNullable<CloudDoc["moods"]> {
  const out: NonNullable<CloudDoc["moods"]> = {};
  const dates = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const date of dates) {
    const l = local[date];
    const c = cloud[date];
    if (l && c) out[date] = Date.parse(l.savedAt ?? "0") >= Date.parse(c.savedAt ?? "0") ? l : c;
    else out[date] = l ?? c;
  }
  return out;
}

function mergeGoals<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const byId = new Map<string, T>();
  for (const g of local) byId.set(g.id, g);
  for (const g of cloud) if (!byId.has(g.id)) byId.set(g.id, g);
  return [...byId.values()];
}

/** Target harian: gabung berdasarkan id; target default yang dimatikan tetap dimatikan (OR enabled). */
function mergeDailyGoals(local: NonNullable<CloudDoc["dailyGoals"]>, cloud: NonNullable<CloudDoc["dailyGoals"]>): NonNullable<CloudDoc["dailyGoals"]> {
  const byId = new Map<string, NonNullable<CloudDoc["dailyGoals"]>[number]>();
  for (const g of local) byId.set(g.id, { ...g });
  for (const g of cloud) {
    const cur = byId.get(g.id);
    if (!cur) byId.set(g.id, { ...g });
    else cur.enabled = cur.enabled || g.enabled;
  }
  return [...byId.values()];
}

function mergeGoalDone(
  local: NonNullable<CloudDoc["goalDone"]>,
  cloud: NonNullable<CloudDoc["goalDone"]>
): NonNullable<CloudDoc["goalDone"]> {
  const out: NonNullable<CloudDoc["goalDone"]> = {};
  const dates = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const date of dates) {
    const set = new Set([...(local[date] ?? []), ...(cloud[date] ?? [])]);
    if (set.size > 0) out[date] = [...set];
  }
  return out;
}

/**
 * Rencana langkah saat pengguna masuk (fungsi murni agar mudah diuji).
 * - first     : belum pernah menyelesaikan keputusan data untuk akun ini di perangkat.
 * - localEmpty: perangkat tidak punya catatan ibadah.
 * - cloudEmpty: akun tidak punya catatan ibadah.
 */
export type StartupPlan =
  | { action: "fresh" } // akun & perangkat sama-sama kosong → langsung aktif
  | { action: "prompt-migrate" } // akun kosong, perangkat ada data → tawarkan pindah
  | { action: "hydrate" } // akun ada data, perangkat kosong → ambil data akun
  | { action: "prompt-conflict" }; // keduanya ada data → minta keputusan pengguna

export function planStartup(args: { first: boolean; localEmpty: boolean; cloudEmpty: boolean }): StartupPlan {
  const { first, localEmpty, cloudEmpty } = args;
  if (!first) return { action: "hydrate" }; // pengguna lama: akun selalu sumber kebenaran
  if (cloudEmpty && localEmpty) return { action: "fresh" };
  if (cloudEmpty && !localEmpty) return { action: "prompt-migrate" };
  if (!cloudEmpty && localEmpty) return { action: "hydrate" };
  return { action: "prompt-conflict" };
}
