/**
 * Tazkiya — Derivasi untuk pengalaman "Islamic Daily Companion":
 * status target harian (Daily Journey), status waktu salat
 * (tepat waktu / terlambat), dan perhitungan salat berikutnya.
 * Semua fungsi murni — angka selalu diturunkan dari data pengguna nyata.
 */

import type { AmalEntry, DailyGoal, DailyLog, PrayerDetail, PrayerId, ZikirSession } from "./types";
import { PRAYER_IDS } from "./types";

/* ---------------- Target Harian (Daily Journey) ---------------- */

export interface GoalStatus {
  goal: DailyGoal;
  done: boolean;
  /** true = keberselesaian diturunkan otomatis dari catatan ibadah. */
  auto: boolean;
}

export interface GoalContext {
  logs: Record<string, DailyLog>;
  prayerDetails: Record<string, Partial<Record<PrayerId, PrayerDetail>>>;
  zikirSessions: ZikirSession[];
  amalEntries: AmalEntry[];
  goalDone: Record<string, string[]>;
  /** Subuh tercatat tepat waktu: true/false, atau null bila tidak dapat dipastikan. */
  subuhOntime: boolean | null;
}

export function goalStatuses(goals: DailyGoal[], date: string, ctx: GoalContext): GoalStatus[] {
  const doneManual = new Set(ctx.goalDone[date] ?? []);
  const log = ctx.logs[date];
  const subuhDetail = ctx.prayerDetails[date]?.subuh;
  const subuhDone = subuhDetail?.status === "done" || !!log?.prayers?.subuh;
  const sessionsToday = ctx.zikirSessions.filter((s) => s.date === date);
  const amalToday = ctx.amalEntries.some((a) => a.date === date) || !!log?.extras?.sedekah;

  return goals
    .filter((g) => g.enabled)
    .map((goal) => {
      let done = false;
      const auto = !!goal.auto;
      switch (goal.auto) {
        case "subuh-ontime":
          // Tepat waktu bila dapat dipastikan; bila tidak (data lama), cukup tercatat.
          done = subuhDone && (ctx.subuhOntime !== false);
          break;
        case "quran-lembar":
          done = (log?.quranPages ?? 0) >= 1;
          break;
        case "zikir-pagi":
          done = sessionsToday.some((s) => s.slot === "pagi");
          break;
        case "zikir-petang":
          done = sessionsToday.some((s) => s.slot === "petang");
          break;
        case "amal-hari-ini":
          done = amalToday;
          break;
        default:
          done = doneManual.has(goal.id);
      }
      // Target manual ditandai lewat ketukan pengguna; target auto mengikuti
      // data nyata, dan penandaan manual tetap dihormati sebagai pelengkap.
      done = auto ? done || doneManual.has(goal.id) : doneManual.has(goal.id);
      return { goal, done, auto };
    });
}

/* ---------------- Status waktu salat ---------------- */

export type PrayerTiming = "ontime" | "late" | null;

/** Jeda tenggang setelah waktu salat untuk dianggap "tepat waktu". */
const GRACE_MIN = 30;

/**
 * Tentukan status waktu pelaksanaan dari `savedAt` catatan vs jadwal salat.
 * Mengembalikan null bila tidak dapat ditentukan (tanpa savedAt / jadwal) —
 * tidak pernah menebak. Status ini TERPISAH dari status penyelesaian
 * (done/missed) dan cara pelaksanaan (mandiri/berjamaah).
 */
export function prayerTiming(
  detail: PrayerDetail,
  scheduleTime: string | undefined,
  date: string
): PrayerTiming {
  if (detail.status !== "done" || !detail.savedAt || !scheduleTime) return null;
  const parsed = Date.parse(detail.savedAt);
  if (Number.isNaN(parsed)) return null;
  const [h, m] = scheduleTime.split(":").map((v) => parseInt(v, 10) || 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  const saved = new Date(parsed);
  const diffMin = (saved.getTime() - d.getTime()) / 60000;
  // Dicatat sebelum/tepat waktu hingga 30 menit setelah masuk waktu = tepat waktu.
  if (diffMin <= GRACE_MIN) return "ontime";
  // Dicatat jauh setelah waktunya (mis. menyusul di hari yang sama / lain hari) = terlambat.
  return "late";
}

/* ---------------- Salat berikutnya ---------------- */

export interface NextPrayerState {
  /** Salat yang waktunya SEDANG berjalan (sudah masuk, belum digantikan). */
  current: PrayerId | null;
  /** Salat berikutnya. */
  next: PrayerId;
  /** Waktu salat berikutnya "HH:MM". */
  nextTime: string;
  /** Sisa waktu hingga salat berikutnya (detik). */
  secondsLeft: number;
  /** Waktu salat berikutnya jatuh pada besok? */
  tomorrow: boolean;
}

const MIN = 60;

/** Urutan salat harian + sisa waktu menuju salat berikutnya (akurat per detik). */
export function nextPrayerState(
  times: Record<PrayerId, { time: string }>,
  now: Date = new Date()
): NextPrayerState {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = nowMin * 60 + now.getSeconds();

  for (let i = 0; i < PRAYER_IDS.length; i++) {
    const id = PRAYER_IDS[i];
    const start = toMin(times[id].time) * MIN;
    if (nowSec < start) {
      const prev = i > 0 ? PRAYER_IDS[i - 1] : null;
      return {
        current: prev,
        next: id,
        nextTime: times[id].time,
        secondsLeft: start - nowSec,
        tomorrow: false,
      };
    }
  }
  // Semua waktu hari ini sudah lewat → berikutnya Subuh besok.
  const endOfDay = 24 * 60 * MIN;
  return {
    current: "isya",
    next: "subuh",
    nextTime: times.subuh.time,
    secondsLeft: endOfDay - nowSec + toMin(times.subuh.time) * MIN,
    tomorrow: true,
  };
}

/** Format sisa detik → "2 j 14 mnt" / "42 mnt" / "59 dtk". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} j ${m} mnt`;
  if (m > 0) return `${m} mnt`;
  return `${s} dtk`;
}
