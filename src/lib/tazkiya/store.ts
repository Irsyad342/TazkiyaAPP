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
  DEFAULT_ZIKIR_DHIKR,
  sanitizeTrackedExtras,
  type AyahBookmark,
  type DailyLog,
  type ExtraId,
  type LastRead,
  type PrayerDetail,
  type PrayerId,
  type QuranBookmark,
  type QuranTargetType,
  type ReadingEntry,
  type Settings,
  type TasbihState,
} from "./types";

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
  commitZikirToDay: (date: string) => number;
  clearReadingHistory: () => void;
  resetAll: () => void;
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

      commitZikirToDay: (date) => {
        const amount = get().tasbih.count;
        if (amount <= 0) return 0;
        set((s) => ({
          logs: upsertLog(s.logs, date, (log) => ({ ...log, zikirCount: log.zikirCount + amount })),
          tasbih: { ...s.tasbih, count: 0 },
        }));
        return amount;
      },

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
      }),
    }
  )
);

/** Ambil log harian (buat kosong bila belum ada) tanpa memutasi store. */
export function selectLog(logs: Record<string, DailyLog>, date: string): DailyLog {
  return logs[date] ?? createEmptyLog(date);
}
