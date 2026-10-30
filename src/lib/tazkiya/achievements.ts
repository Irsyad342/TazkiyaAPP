/**
 * Tazkiya — Pencapaian (achievements) berbasis data nyata.
 *
 * ATURAN PENTING:
 * - Pencapaian HANYA diberikan bila aktivitas benar-benar tersimpan di store.
 * - Tidak ada penilaian kualitas agama/keimanan — murni rekam jejak catatan.
 * - Tanggal pencapaian = tanggal nyata kejadian (bukan perkiraan).
 * - Pengguna baru melihat kondisi kosong (semua earnedAt = null).
 */
"use client";

import { PRAYER_IDS, type DailyLog, type PrayerDetail, type PrayerId } from "./types";
import { recordedDateList } from "./stats";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export interface Achievement extends AchievementDef {
  /** Tanggal (key YYYY-MM-DD) pencapaian diperoleh — null bila belum diperoleh. */
  earnedAt: string | null;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "langkah-pertama",
    title: "Langkah Pertama",
    description: "Berhasil mencatat ibadah pertamamu",
  },
  {
    id: "hari-sempurna",
    title: "Hari Sempurna",
    description: "Satu hari penuh dengan lima salat wajib tercatat",
  },
  {
    id: "tiga-hari-aktif",
    title: "Tiga Hari Aktif",
    description: "Memiliki catatan ibadah pada tiga hari berbeda",
  },
  {
    id: "pekan-pertama",
    title: "Pekan Pertama",
    description: "Tujuh hari beruntun dengan seluruh salat wajib tercatat",
  },
];

/** Tanggal pertama (terlama) yang seluruh 5 salatnya ditandai selesai. */
function firstPerfectDay(logs: Record<string, DailyLog>): string | null {
  let best: string | null = null;
  for (const key of Object.keys(logs)) {
    const l = logs[key];
    if (!l) continue;
    if (PRAYER_IDS.every((p) => l.prayers?.[p])) {
      if (!best || key < best) best = key;
    }
  }
  return best;
}

/**
 * Tanggal saat run 7 hari beruntun "seluruh salat wajib selesai" PERTAMA kali
 * tercapai. Dihitung dari daftar hari lengkap yang diurutkan kronologis —
 * hanya hari yang benar-benar tercatat lengkap yang ikut run.
 */
function firstSevenStreakDate(logs: Record<string, DailyLog>): string | null {
  const completeDays = Object.keys(logs)
    .filter((k) => {
      const l = logs[k];
      return !!l && PRAYER_IDS.every((p) => l.prayers?.[p]);
    })
    .sort();
  let run = 0;
  let prev: string | null = null;
  for (const k of completeDays) {
    const consecutive = prev !== null && Math.round((new Date(k + "T00:00:00").getTime() - new Date(prev + "T00:00:00").getTime()) / 86400000) === 1;
    run = consecutive ? run + 1 : 1;
    if (run >= 7) return k;
    prev = k;
  }
  return null;
}

/**
 * Hitung seluruh pencapaian dari data store yang ada.
 * Selalu mengembalikan 4 definisi; earnedAt = null bila belum diperoleh.
 */
export function computeAchievements(
  logs: Record<string, DailyLog>,
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>
): Achievement[] {
  // Hari aktif = tanggal dengan catatan valid (aturan sama dengan Riwayat Profil).
  const recorded = recordedDateList(logs, prayerDetails);

  const earned: Record<string, string | null> = {
    "langkah-pertama": recorded.length > 0 ? recorded[0] : null,
    "hari-sempurna": firstPerfectDay(logs),
    "tiga-hari-aktif": recorded.length >= 3 ? recorded[2] : null,
    "pekan-pertama": firstSevenStreakDate(logs),
  };

  return ACHIEVEMENT_DEFS.map((def) => ({ ...def, earnedAt: earned[def.id] ?? null }));
}

/** Pencapaian terbaru yang sudah diperoleh (untuk emblem utama kartu). */
export function latestEarned(achievements: Achievement[]): Achievement | null {
  const earned = achievements.filter((a) => !!a.earnedAt);
  if (earned.length === 0) return null;
  return earned.reduce((latest, a) => (!latest.earnedAt || a.earnedAt! > latest.earnedAt ? a : latest));
}
