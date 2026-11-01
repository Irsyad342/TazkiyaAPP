/**
 * Tazkiya — Store utama (Zustand + persist ke localStorage).
 * Semua data ibadah, pengaturan, tasbih, dan riwayat disimpan lokal di perangkat.
 */
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  createDefaultSettings,
  createEmptyLog,
  DEFAULT_AMAL_GOALS,
  DEFAULT_DAILY_GOALS,
  DEFAULT_ZIKIR_DHIKR,
  sanitizeTrackedExtras,
  type AmalEntry,
  type AmalGoal,
  type AmalKind,
  type AyahBookmark,
  type DailyGoal,
  type DailyLog,
  type ExtraId,
  type JournalEntry,
  type LastRead,
  type MoodId,
  type PrayerDetail,
  type PrayerId,
  type QadaRecord,
  type QuranBookmark,
  type QuranTargetType,
  type ReadingEntry,
  type Settings,
  type TasbihState,
  type ZikirSession,
  type ZikirSlot,
} from "./types";
import type { CloudDoc } from "@/lib/sync/doc";

/** ID unik sederhana untuk catatan baru. */
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

interface WorshipActions {
  /** Pencatatan salat lengkap: status + jenis pelaksanaan / alasan. */
  setPrayerRecord: (date: string, id: PrayerId, detail: PrayerDetail | null) => void;
  togglePrayer: (date: string, id: PrayerId) => void;
  setFridayZuhurAlt: (date: string, alt: boolean) => void;
  toggleExtra: (date: string, id: ExtraId) => void;
  addQuranProgress: (
    date: string,
    data: { pages: number; verses: number; surah?: number; ayahFrom?: number; ayahTo?: number; markBookmark?: boolean; auto?: boolean }
  ) => void;
  deleteReadingEntry: (id: string) => void;
  saveBookmark: (b: QuranBookmark) => void;
  deleteBookmark: () => void;
  setLastRead: (surah: number, ayah: number) => void;
  toggleAyahBookmark: (surah: number, ayah: number) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  setQuranTarget: (type: QuranTargetType, value: number) => void;
  setQuranTargetSurah: (surah: number) => void;
  tasbihAdd: (n?: number) => void;
  tasbihMinus: () => void;
  tasbihReset: () => void;
  tasbihSetTarget: (n: number) => void;
  tasbihSetDhikr: (s: string) => void;
  /** Simpan hitungan tasbih ke catatan harian + riwayat sesi (slot opsional). */
  commitZikirToDay: (date: string, slot?: ZikirSlot) => number;
  /* ---- Qada ---- */
  /** Tambah catatan qada; mengembalikan null bila duplikat (salat+tanggal sama, belum selesai). */
  addQada: (prayer: PrayerId, missedDate: string, note?: string) => QadaRecord | null;
  completeQada: (id: string) => void;
  reopenQada: (id: string) => void;
  deleteQada: (id: string) => void;
  /* ---- Jurnal Syukur & Mood ---- */
  saveJournal: (date: string, items: [string, string, string], mood?: MoodId) => void;
  deleteJournal: (date: string) => void;
  setMood: (date: string, mood: MoodId) => void;
  /* ---- Rizq & Amal ---- */
  addAmalEntry: (date: string, kind: AmalKind, title: string, note?: string) => void;
  deleteAmalEntry: (id: string) => void;
  addAmalGoal: (label: string) => void;
  deleteAmalGoal: (id: string) => void;
  /* ---- Target Harian ---- */
  toggleDailyGoalEnabled: (id: string) => void;
  addDailyGoal: (label: string) => void;
  deleteDailyGoal: (id: string) => void;
  /** Tandai/selesai target manual pada satu tanggal (target auto diturunkan dari data). */
  toggleGoalDone: (date: string, goalId: string) => void;
  clearReadingHistory: () => void;
  resetAll: () => void;
  /** Ganti seluruh data dengan dokumen akun (dipakai sinkronisasi cloud). */
  importCloudData: (doc: CloudDoc) => void;
  /** Kosongkan data ibadah (logout) — pengaturan perangkat tetap dipertahankan. */
  clearWorshipData: () => void;
}

export type WorshipStore = {
  settings: Settings;
  logs: Record<string, DailyLog>;
  /** Detail pencatatan salat per tanggal (status, jenis pelaksanaan, alasan). */
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>;
  bookmarks: QuranBookmark[];
  ayahBookmarks: AyahBookmark[];
  lastRead: LastRead | null;
  readingHistory: ReadingEntry[];
  tasbih: TasbihState;
  fridayZuhurAlt: Record<string, boolean>;
  /** Daftar qada — paling baru dibuat di depan. */
  qadaRecords: QadaRecord[];
  /** Jurnal syukur per tanggal. */
  journal: Record<string, JournalEntry>;
  /** Mood check-in per tanggal (yang terbaru menang). */
  moods: Record<string, { mood: MoodId; savedAt: string }>;
  /** Catatan amal kebaikan & sedekah — paling baru di depan. */
  amalEntries: AmalEntry[];
  /** Target kebaikan pribadi (default + buatan pengguna). */
  amalGoals: AmalGoal[];
  /** Riwayat sesi zikir — paling baru di depan (maks. 500). */
  zikirSessions: ZikirSession[];
  /** Target harian (Daily Journey) — default + buatan pengguna. */
  dailyGoals: DailyGoal[];
  /** Target manual yang ditandai selesai per tanggal (id target). */
  goalDone: Record<string, string[]>;
} & WorshipActions;

function upsertLog(
  logs: Record<string, DailyLog>,
  date: string,
  mutate: (log: DailyLog) => DailyLog
): Record<string, DailyLog> {
  const current = logs[date] ?? createEmptyLog(date);
  return { ...logs, [date]: mutate({ ...current, prayers: { ...current.prayers }, extras: { ...current.extras } }) };
}

export const useWorshipStore = create<WorshipStore>()(
  persist(
    (set, get) => ({
      settings: createDefaultSettings(),
      logs: {},
      prayerDetails: {},
      bookmarks: [],
      ayahBookmarks: [],
      lastRead: null,
      readingHistory: [],
      tasbih: { count: 0, target: 100, dhikr: DEFAULT_ZIKIR_DHIKR },
      fridayZuhurAlt: {},
      qadaRecords: [],
      journal: {},
      moods: {},
      amalEntries: [],
      amalGoals: DEFAULT_AMAL_GOALS,
      zikirSessions: [],
      dailyGoals: DEFAULT_DAILY_GOALS,
      goalDone: {},

      /**
       * Simpan catatan lengkap satu salat. `null` atau status "none"
       * mengembalikan salat ke keadaan belum dicatat. Log boolean tetap
       * disinkronkan agar statistik lama tetap berfungsi.
       */
      setPrayerRecord: (date, id, detail) =>
        set((s) => {
          const dayDetails = { ...(s.prayerDetails[date] ?? {}) };
          if (!detail || detail.status === "none") delete dayDetails[id];
          else
            dayDetails[id] = {
              ...detail,
              savedAt: detail.savedAt ?? new Date().toISOString(),
            };
          const nextDetails = { ...s.prayerDetails };
          if (Object.keys(dayDetails).length > 0) nextDetails[date] = dayDetails;
          else delete nextDetails[date];
          return {
            prayerDetails: nextDetails,
            logs: upsertLog(s.logs, date, (log) => ({
              ...log,
              prayers: { ...log.prayers, [id]: detail?.status === "done" },
            })),
          };
        }),

      togglePrayer: (date, id) =>
        set((s) => ({
          logs: upsertLog(s.logs, date, (log) => ({
            ...log,
            prayers: { ...log.prayers, [id]: !log.prayers[id] },
          })),
        })),

      setFridayZuhurAlt: (date, alt) =>
        set((s) => {
          const next = { ...s.fridayZuhurAlt };
          if (alt) next[date] = true;
          else delete next[date];
          return { fridayZuhurAlt: next };
        }),

      toggleExtra: (date, id) =>
        set((s) => ({
          logs: upsertLog(s.logs, date, (log) => ({
            ...log,
            extras: { ...log.extras, [id]: !log.extras[id] },
          })),
        })),

      addQuranProgress: (date, data) =>
        set((s) => {
          const entry: ReadingEntry = {
            id: `rd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            date,
            pages: data.pages,
            verses: data.verses,
            surah: data.surah,
            ayahFrom: data.ayahFrom,
            ayahTo: data.ayahTo,
            savedAt: new Date().toISOString(),
            auto: data.auto,
          };
          const bookmarks = data.markBookmark && data.surah
            ? [
                {
                  surah: data.surah,
                  ayah: Math.max(1, data.ayahTo ?? data.ayahFrom ?? 1),
                  savedAt: new Date().toISOString(),
                },
              ]
            : s.bookmarks;
          return {
            logs: upsertLog(s.logs, date, (log) => ({
              ...log,
              quranPages: log.quranPages + data.pages,
              quranVerses: log.quranVerses + data.verses,
            })),
            readingHistory: [entry, ...s.readingHistory],
            bookmarks,
          };
        }),

      deleteReadingEntry: (id) =>
        set((s) => ({ readingHistory: s.readingHistory.filter((e) => e.id !== id) })),

      saveBookmark: (b) => set(() => ({ bookmarks: [b] })),

      deleteBookmark: () => set(() => ({ bookmarks: [] })),

      setLastRead: (surah, ayah) =>
        set((s) => {
          const cur = s.lastRead;
          if (cur && cur.surah === surah && cur.ayah === ayah) return s;
          return { lastRead: { surah, ayah, savedAt: new Date().toISOString() } };
        }),

      toggleAyahBookmark: (surah, ayah) =>
        set((s) =>
          s.ayahBookmarks.some((b) => b.surah === surah && b.ayah === ayah)
            ? {
                ayahBookmarks: s.ayahBookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah)),
              }
            : {
                ayahBookmarks: [
                  { surah, ayah, savedAt: new Date().toISOString() },
                  ...s.ayahBookmarks,
                ].slice(0, 100),
              }
        ),

      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      setQuranTarget: (type, value) =>
        set((s) => ({
          settings: {
            ...s.settings,
            quranTargetType: type,
            quranDailyTarget: Math.max(1, Math.min(type === "halaman" ? 200 : 1000, value || 1)),
          },
        })),

      /** Ganti surah target bacaan (unit "surah"), selalu divalidasi 1..114. */
      setQuranTargetSurah: (surah) =>
        set((s) => ({
          settings: {
            ...s.settings,
            quranTargetSurah: Math.max(1, Math.min(114, Math.round(surah) || 1)),
          },
        })),

      tasbihAdd: (n = 1) =>
        set((s) => ({ tasbih: { ...s.tasbih, count: s.tasbih.count + n } })),

      tasbihMinus: () =>
        set((s) => ({ tasbih: { ...s.tasbih, count: Math.max(0, s.tasbih.count - 1) } })),

      tasbihReset: () => set((s) => ({ tasbih: { ...s.tasbih, count: 0 } })),

      tasbihSetTarget: (n) =>
        set((s) => ({ tasbih: { ...s.tasbih, target: Math.max(1, Math.min(100000, n || 1)) } })),

      tasbihSetDhikr: (dhikr) => set((s) => ({ tasbih: { ...s.tasbih, dhikr } })),

      commitZikirToDay: (date, slot = "harian") => {
        const amount = get().tasbih.count;
        if (amount <= 0) return 0;
        const session: ZikirSession = {
          id: newId("zk"),
          date,
          count: amount,
          dhikr: get().tasbih.dhikr,
          slot,
          savedAt: new Date().toISOString(),
        };
        set((s) => ({
          logs: upsertLog(s.logs, date, (log) => ({ ...log, zikirCount: log.zikirCount + amount })),
          tasbih: { ...s.tasbih, count: 0 },
          zikirSessions: [session, ...s.zikirSessions].slice(0, 500),
        }));
        return amount;
      },

      /* ---------- Qada ---------- */
      addQada: (prayer, missedDate, note) => {
        const dup = get().qadaRecords.find(
          (q) => q.prayer === prayer && q.missedDate === missedDate && !q.completedAt
        );
        if (dup) return null;
        const rec: QadaRecord = {
          id: newId("qd"),
          prayer,
          missedDate,
          createdAt: new Date().toISOString(),
          note: note?.trim() || undefined,
        };
        set((s) => ({ qadaRecords: [rec, ...s.qadaRecords] }));
        return rec;
      },

      completeQada: (id) =>
        set((s) => ({
          qadaRecords: s.qadaRecords.map((q) =>
            q.id === id && !q.completedAt ? { ...q, completedAt: new Date().toISOString() } : q
          ),
        })),

      reopenQada: (id) =>
        set((s) => ({
          qadaRecords: s.qadaRecords.map((q) =>
            q.id === id ? { ...q, completedAt: undefined } : q
          ),
        })),

      deleteQada: (id) =>
        set((s) => ({ qadaRecords: s.qadaRecords.filter((q) => q.id !== id) })),

      /* ---------- Jurnal Syukur & Mood ---------- */
      saveJournal: (date, items, mood) =>
        set((s) => {
          const prev = s.journal[date];
          const entry: JournalEntry = {
            date,
            items: [items[0].trim(), items[1].trim(), items[2].trim()],
            mood: mood ?? prev?.mood,
            savedAt: prev?.savedAt ?? new Date().toISOString(),
            updatedAt: prev ? new Date().toISOString() : undefined,
          };
          return { journal: { ...s.journal, [date]: entry } };
        }),

      deleteJournal: (date) =>
        set((s) => {
          const journal = { ...s.journal };
          delete journal[date];
          return { journal };
        }),

      setMood: (date, mood) =>
        set((s) => ({
          moods: { ...s.moods, [date]: { mood, savedAt: new Date().toISOString() } },
        })),

      /* ---------- Rizq & Amal ---------- */
      addAmalEntry: (date, kind, title, note) =>
        set((s) => {
          const entry: AmalEntry = {
            id: newId("am"),
            date,
            kind,
            title: title.trim(),
            note: note?.trim() || undefined,
            savedAt: new Date().toISOString(),
          };
          return { amalEntries: [entry, ...s.amalEntries].slice(0, 1000) };
        }),

      deleteAmalEntry: (id) =>
        set((s) => ({ amalEntries: s.amalEntries.filter((e) => e.id !== id) })),

      addAmalGoal: (label) =>
        set((s) => {
          const clean = label.trim();
          if (!clean) return s;
          if (s.amalGoals.some((g) => g.label.toLowerCase() === clean.toLowerCase())) return s;
          return { amalGoals: [...s.amalGoals, { id: newId("ag"), label: clean }] };
        }),

      deleteAmalGoal: (id) =>
        set((s) => ({ amalGoals: s.amalGoals.filter((g) => g.id !== id) })),

      /* ---------- Target Harian ---------- */
      toggleDailyGoalEnabled: (id) =>
        set((s) => ({
          dailyGoals: s.dailyGoals.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)),
        })),

      addDailyGoal: (label) =>
        set((s) => {
          const clean = label.trim();
          if (!clean) return s;
          if (s.dailyGoals.some((g) => g.label.toLowerCase() === clean.toLowerCase())) return s;
          return {
            dailyGoals: [...s.dailyGoals, { id: newId("dg"), label: clean, enabled: true, custom: true }],
          };
        }),

      deleteDailyGoal: (id) =>
        set((s) => ({ dailyGoals: s.dailyGoals.filter((g) => g.id !== id) })),

      toggleGoalDone: (date, goalId) =>
        set((s) => {
          const cur = s.goalDone[date] ?? [];
          const next = cur.includes(goalId) ? cur.filter((g) => g !== goalId) : [...cur, goalId];
          const goalDone = { ...s.goalDone, [date]: next };
          if (next.length === 0) delete goalDone[date];
          return { goalDone };
        }),

      clearReadingHistory: () => set(() => ({ readingHistory: [] })),

      resetAll: () =>
        set(() => ({
          settings: createDefaultSettings(),
          logs: {},
          prayerDetails: {},
          bookmarks: [],
          ayahBookmarks: [],
          lastRead: null,
          readingHistory: [],
          tasbih: { count: 0, target: 100, dhikr: DEFAULT_ZIKIR_DHIKR },
          fridayZuhurAlt: {},
          qadaRecords: [],
          journal: {},
          moods: {},
          amalEntries: [],
          amalGoals: DEFAULT_AMAL_GOALS,
          zikirSessions: [],
          dailyGoals: DEFAULT_DAILY_GOALS,
          goalDone: {},
        })),

      /**
       * Terapkan dokumen akun (hasil hidrasi/penggabungan) ke store.
       * Pengaturan disaring dengan aturan yang sama seperti hidrasi persist
       * agar data lama dari cloud tetap aman.
       */
      importCloudData: (doc) =>
        set(() => {
          const base = createDefaultSettings();
          const settings = { ...base, ...(doc.settings ?? {}) };
          settings.trackedExtras = sanitizeTrackedExtras(settings.trackedExtras);
          settings.prayerTimesAuto = true;
          if (settings.geo) settings.geo = { ...settings.geo, auto: true };
          return {
            settings,
            logs: doc.logs ?? {},
            prayerDetails: doc.prayerDetails ?? {},
            fridayZuhurAlt: doc.fridayZuhurAlt ?? {},
            bookmarks: doc.bookmarks ?? [],
            ayahBookmarks: doc.ayahBookmarks ?? [],
            lastRead: doc.lastRead ?? null,
            readingHistory: doc.readingHistory ?? [],
            tasbih: doc.tasbih ?? { count: 0, target: 100, dhikr: DEFAULT_ZIKIR_DHIKR },
            qadaRecords: doc.qadaRecords ?? [],
            journal: doc.journal ?? {},
            moods: (doc.moods ?? {}) as Record<string, { mood: MoodId; savedAt: string }>,
            amalEntries: doc.amalEntries ?? [],
            amalGoals: (doc.amalGoals ?? DEFAULT_AMAL_GOALS) as AmalGoal[],
            zikirSessions: doc.zikirSessions ?? [],
            dailyGoals: (doc.dailyGoals ?? DEFAULT_DAILY_GOALS) as DailyGoal[],
            goalDone: doc.goalDone ?? {},
          };
        }),

      /**
       * Logout: data ibadah dikosongkan di perangkat (salinannya aman di akun
       * dan di cadangan pra-login) — pengaturan (tema, nama, foto, GPS, target)
       * TETAP dipertahankan agar pengalaman perangkat tidak berubah.
       */
      clearWorshipData: () =>
        set((s) => ({
          logs: {},
          prayerDetails: {},
          fridayZuhurAlt: {},
          bookmarks: [],
          ayahBookmarks: [],
          lastRead: null,
          readingHistory: [],
          tasbih: { ...s.tasbih, count: 0 },
          qadaRecords: [],
          journal: {},
          moods: {},
          amalEntries: [],
          amalGoals: DEFAULT_AMAL_GOALS,
          zikirSessions: [],
          dailyGoals: DEFAULT_DAILY_GOALS,
          goalDone: {},
        })),
    }),
    {
      name: "tazkiya-store-v1",
      storage: createJSONStorage(() => localStorage),
      // Hidrasi dilakukan manual setelah mount untuk menghindari ketidakcocokan SSR.
      skipHydration: true,
      /**
       * Gabungkan data tersimpan dengan nilai bawaan agar kolom baru
       * (mis. trackedExtras, quranTargetSurah, prayerDetails) tetap terisi
       * untuk data lama — tidak ada data pengguna yang dibuang.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WorshipStore>;
        const settings = { ...current.settings, ...(p.settings ?? {}) };
        // "Doa Harian" tidak lagi dilacak — bersihkan dari data lama tanpa
        // menghapus catatan aktivitas lainnya.
        settings.trackedExtras = sanitizeTrackedExtras(settings.trackedExtras);
        // Lokasi kini otomatis penuh: input kota manual & kedua saklar sudah
        // dihapus dari UI. Paksa flag otomatis aktif untuk data lama agar
        // jadwal salat selalu menyesuaikan koordinat GPS.
        settings.prayerTimesAuto = true;
        if (settings.geo) settings.geo = { ...settings.geo, auto: true };
        const merged = { ...current, ...p, settings } as WorshipStore;
        // Migrasi sekali-jalan: browser yang pernah mengisi "data contoh"
        // dibersihkan dari seluruh data demo (fitur data demo sudah dihapus
        // dari aplikasi). Pengguna kembali seperti kondisi awal — riwayat
        // kosong. Pengaturan (nama, tema, target, lokasi), penanda bacaan
        // Al-Qur'an, terakhir dibaca, dan tasbih tetap dipertahankan.
        const legacyDemoSeeded = (p as { demoSeeded?: boolean }).demoSeeded;
        if (legacyDemoSeeded) {
          return {
            ...merged,
            logs: {},
            prayerDetails: {},
            readingHistory: [],
            fridayZuhurAlt: {},
          };
        }
        return merged;
      },
      partialize: (s) => ({
        settings: s.settings,
        logs: s.logs,
        prayerDetails: s.prayerDetails,
        bookmarks: s.bookmarks,
        ayahBookmarks: s.ayahBookmarks,
        lastRead: s.lastRead,
        readingHistory: s.readingHistory,
        tasbih: s.tasbih,
        fridayZuhurAlt: s.fridayZuhurAlt,
        qadaRecords: s.qadaRecords,
        journal: s.journal,
        moods: s.moods,
        amalEntries: s.amalEntries,
        amalGoals: s.amalGoals,
        zikirSessions: s.zikirSessions,
        dailyGoals: s.dailyGoals,
        goalDone: s.goalDone,
      }),
    }
  )
);

/** Ambil log harian (buat kosong bila belum ada) tanpa memutasi store. */
export function selectLog(logs: Record<string, DailyLog>, date: string): DailyLog {
  return logs[date] ?? createEmptyLog(date);
}
