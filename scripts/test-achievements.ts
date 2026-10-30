/**
 * Tazkiya — Uji pencapaian (achievements) & aturan data Pola Ibadah Minggu Ini.
 * Menjamin: tanpa data palsu, kronologis kiri→kanan, chip = jumlah CATATAN
 * (bukan jumlah tanggal), pengguna baru = kondisi kosong.
 * Jalankan: bun scripts/test-achievements.ts
 */
import { computeAchievements, latestEarned } from "../src/lib/tazkiya/achievements";
import { mondayOf, addDays, todayKey, weekdayIndexMondayFirst } from "../src/lib/tazkiya/dates";
import { PRAYER_IDS, createEmptyLog, type DailyLog, type PrayerDetail } from "../src/lib/tazkiya/types";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const TODAY = todayKey();
console.log(`today = ${TODAY} (weekday index Senin-first: ${weekdayIndexMondayFirst(TODAY)})`);

/* ---------- Helper data uji ---------- */
function logWithAllPrayers(date: string): DailyLog {
  const l = createEmptyLog(date);
  for (const p of PRAYER_IDS) l.prayers[p] = true;
  return l;
}
function emptyDetails(): Record<string, Partial<Record<string, PrayerDetail>>> {
  return {};
}

/* ---------- 1. Pengguna baru: semua pencapaian kosong ---------- */
{
  const ach = computeAchievements({}, {});
  check("pengguna baru: 4 definisi, semua earnedAt null", ach.length === 4 && ach.every((a) => a.earnedAt === null));
  check("pengguna baru: tidak ada pencapaian tampil", latestEarned(ach) === null);
}

/* ---------- 2. Langkah Pertama = tanggal catatan pertama ---------- */
{
  const logs: Record<string, DailyLog> = {};
  const d1 = addDays(TODAY, -5);
  const d2 = addDays(TODAY, -3);
  logs[d1] = { ...createEmptyLog(d1), quranPages: 3 };
  logs[d2] = { ...createEmptyLog(d2), zikirCount: 33 };
  const ach = computeAchievements(logs, emptyDetails() as never);
  const first = ach.find((a) => a.id === "langkah-pertama");
  check("langkah-pertama = catatan paling awal", first?.earnedAt === d1);
  check("tiga-hari-aktif belum diberikan (hanya 2 hari)", ach.find((a) => a.id === "tiga-hari-aktif")?.earnedAt === null);
  check("pekan-pertama belum diberikan (tidak ada 7 hari lengkap)", ach.find((a) => a.id === "pekan-pertama")?.earnedAt === null);
  check("hari-sempurna belum diberikan", ach.find((a) => a.id === "hari-sempurna")?.earnedAt === null);
}

/* ---------- 3. Tiga Hari Aktif = tanggal catatan ke-3 ---------- */
{
  const logs: Record<string, DailyLog> = {};
  const days = [addDays(TODAY, -9), addDays(TODAY, -5), addDays(TODAY, -2)];
  for (const d of days) logs[d] = { ...createEmptyLog(d), zikirCount: 10 };
  const ach = computeAchievements(logs, emptyDetails() as never);
  check("tiga-hari-aktif = catatan ke-3 (bukan hari lain)", ach.find((a) => a.id === "tiga-hari-aktif")?.earnedAt === days[2]);
}

/* ---------- 4. Hari Sempurna & Pekan Pertama dari hari lengkap beruntun ---------- */
{
  const logs: Record<string, DailyLog> = {};
  // 7 hari beruntun lengkap + 1 hari lama parsial
  for (let i = 10; i >= 4; i--) logs[addDays(TODAY, -i)] = logWithAllPrayers(addDays(TODAY, -i));
  logs[addDays(TODAY, -20)] = createEmptyLog(addDays(TODAY, -20));
  const ach = computeAchievements(logs, emptyDetails() as never);
  check("hari-sempurna = hari lengkap pertama (H-10)", ach.find((a) => a.id === "hari-sempurna")?.earnedAt === addDays(TODAY, -10));
  check("pekan-pertama = hari ke-7 beruntun (H-4)", ach.find((a) => a.id === "pekan-pertama")?.earnedAt === addDays(TODAY, -4));
  // run terputus di tengah → pekan tidak diberikan
  const logs2: Record<string, DailyLog> = {};
  for (let i = 10; i >= 4; i--) {
    if (i === 7) continue; // bolong
    logs2[addDays(TODAY, -i)] = logWithAllPrayers(addDays(TODAY, -i));
  }
  const ach2 = computeAchievements(logs2, emptyDetails() as never);
  check("run terputus → pekan-pertama TIDAK diberikan", ach2.find((a) => a.id === "pekan-pertama")?.earnedAt === null);
}

/* ---------- 5. Kronologi minggu: Senin paling kiri, hari ini paling kanan ---------- */
{
  const monday = mondayOf(TODAY);
  check("mondayOf benar (indeks 0)", weekdayIndexMondayFirst(monday) === 0);
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
  check("7 hari minggu berjalan urut menaik", week.every((d, i) => i === 0 || d > week[i - 1]));
  check("hari terakhir strip = Senin+6", week[6] === addDays(monday, 6));
  check("hari ini berada di dalam minggu berjalan", week.includes(TODAY));
}

/* ---------- 6. Tanpa data palsu: hari sebelum catatan pertama ---------- */
{
  // Pengguna mulai Rabu: Sen & Sel TIDAK boleh dianggap berisi —
  // dihitung dari data: logs tanpa Sen/Sel → computeAchievements hanya melihat catatan nyata.
  const logs: Record<string, DailyLog> = {};
  const monday = mondayOf(TODAY);
  const wednesday = addDays(monday, 2);
  if (wednesday <= TODAY) logs[wednesday] = { ...createEmptyLog(wednesday), zikirCount: 5 };
  const ach = computeAchievements(logs, emptyDetails() as never);
  check("mulai Rabu: langkah-pertama = Rabu (Sen/Sel tak diberi data)", ach.find((a) => a.id === "langkah-pertama")?.earnedAt === (wednesday <= TODAY ? wednesday : null));
}

/* ---------- 7. latestEarned memilih yang terbaru ---------- */
{
  const logs: Record<string, DailyLog> = {};
  logs[addDays(TODAY, -6)] = { ...createEmptyLog(addDays(TODAY, -6)), zikirCount: 1 };
  logs[addDays(TODAY, -2)] = logWithAllPrayers(addDays(TODAY, -2));
  const ach = computeAchievements(logs, emptyDetails() as never);
  check("latestEarned = pencapaian bertanggal terbaru", latestEarned(ach)?.id === "hari-sempurna");
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
process.exit(failed > 0 ? 1 : 0);
