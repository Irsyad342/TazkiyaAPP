/**
 * Tazkiya — Uji unit logika sinkronisasi & riwayat (dijalankan: bun scripts/test-sync-merge.ts).
 * Murni fungsi — tanpa jaringan/tanpa Supabase.
 */
import { mergeDocs, planStartup } from "@/lib/sync/merge";
import { recordedDateList, reviewActivityDays, hasAnyDayRecord } from "@/lib/tazkiya/stats";
import type { CloudDoc } from "@/lib/sync/doc";
import { createEmptyLog, type PrayerDetail } from "@/lib/tazkiya/types";

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra, null, 2) : "");
  }
}
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  ok(name, a === b, { actual, expected });
}

const det = (status: "done" | "missed", savedAt: string, kind?: "berjamaah" | "mandiri"): PrayerDetail =>
  ({ status, savedAt, kind } as PrayerDetail);

/* ---------------- planStartup ---------------- */
console.log("\n[planStartup]");
eq("akun & perangkat kosong → fresh", planStartup({ first: true, localEmpty: true, cloudEmpty: true }), { action: "fresh" });
eq("akun kosong, perangkat ada data → prompt-migrate", planStartup({ first: true, localEmpty: false, cloudEmpty: true }), { action: "prompt-migrate" });
eq("akun ada data, perangkat kosong → hydrate", planStartup({ first: true, localEmpty: true, cloudEmpty: false }), { action: "hydrate" });
eq("keduanya ada data → prompt-conflict", planStartup({ first: true, localEmpty: false, cloudEmpty: false }), { action: "prompt-conflict" });
eq("pengguna lama selalu hydrate", planStartup({ first: false, localEmpty: false, cloudEmpty: true }), { action: "hydrate" });

/* ---------------- mergeDocs ---------------- */
console.log("\n[mergeDocs] dasar");
{
  const out = mergeDocs({ v: 1 }, { v: 1 }, { settingsFrom: "cloud" });
  eq("dua dokumen kosong → kosong", Object.keys(out.logs ?? {}).length, 0);
}
{
  // savedAt terbaru menang untuk detail salat; log boolean ikut diturunkan.
  const local: CloudDoc = {
    v: 1,
    prayerDetails: { "2026-10-28": { subuh: det("done", "2026-10-28T01:00:00Z", "berjamaah") } },
  };
  const cloud: CloudDoc = {
    v: 1,
    prayerDetails: { "2026-10-28": { subuh: det("missed", "2026-10-28T02:00:00Z", undefined) } },
  };
  const out = mergeDocs(local, cloud, { settingsFrom: "cloud" });
  eq("detail terbaru (missed) menang", out.prayerDetails?.["2026-10-28"]?.subuh?.status, "missed");
  eq("log boolean turunan = false", out.logs?.["2026-10-28"]?.prayers?.subuh, false);
}
{
  // Warisan data lama: boolean true tanpa detail → done implisit, ATAU aditif.
  const local: CloudDoc = {
    v: 1,
    logs: (() => {
      const l = createEmptyLog("2026-10-27");
      l.prayers.isya = true;
      return { "2026-10-27": l };
    })(),
  };
  const cloud: CloudDoc = {
    v: 1,
    logs: (() => {
      const l = createEmptyLog("2026-10-27");
      l.extras.sedekah = true;
      return { "2026-10-27": l };
    })(),
  };
  const out = mergeDocs(local, cloud, { settingsFrom: "local" });
  eq("boolean implisit ATAU (isya)", out.logs?.["2026-10-27"]?.prayers?.isya, true);
  eq("extras ATAU (sedekah)", out.logs?.["2026-10-27"]?.extras?.sedekah, true);
  eq("extras lain tetap false", out.logs?.["2026-10-27"]?.extras?.duha, false);
}
{
  // Riwayat bacaan digabung unik per id — tidak dobel; total halaman tidak menggandakan.
  const entry = { id: "rd-1", date: "2026-10-28", pages: 5, verses: 40, savedAt: "2026-10-28T10:00:00Z" };
  const local: CloudDoc = { v: 1, readingHistory: [entry], logs: (() => { const l = createEmptyLog("2026-10-28"); l.quranPages = 5; l.quranVerses = 40; return { "2026-10-28": l }; })() };
  const cloud: CloudDoc = { v: 1, readingHistory: [{ ...entry }], logs: (() => { const l = createEmptyLog("2026-10-28"); l.quranPages = 5; l.quranVerses = 40; return { "2026-10-28": l }; })() };
  const out = mergeDocs(local, cloud, { settingsFrom: "cloud" });
  eq("riwayat tidak duplikat", out.readingHistory?.length, 1);
  eq("halaman tidak menggandakan (5, bukan 10)", out.logs?.["2026-10-28"]?.quranPages, 5);
}
{
  // Sesi bacaan BEDA di dua sisi untuk tanggal sama → dihitung gabungan riwayat.
  const e1 = { id: "rd-a", date: "2026-10-28", pages: 3, verses: 20, savedAt: "2026-10-28T08:00:00Z" };
  const e2 = { id: "rd-b", date: "2026-10-28", pages: 4, verses: 25, savedAt: "2026-10-28T19:00:00Z" };
  const local: CloudDoc = { v: 1, readingHistory: [e1], logs: (() => { const l = createEmptyLog("2026-10-28"); l.quranPages = 3; l.quranVerses = 20; return { "2026-10-28": l }; })() };
  const cloud: CloudDoc = { v: 1, readingHistory: [e2], logs: (() => { const l = createEmptyLog("2026-10-28"); l.quranPages = 4; l.quranVerses = 25; return { "2026-10-28": l }; })() };
  const out = mergeDocs(local, cloud, { settingsFrom: "cloud" });
  eq("dua sesi berbeda → 2 entri", out.readingHistory?.length, 2);
  eq("halaman gabungan riwayat = 7", out.logs?.["2026-10-28"]?.quranPages, 7);
}
{
  // Zikir: maksimum (anti duplikasi data identik).
  const local: CloudDoc = { v: 1, tasbih: { count: 0, target: 100, dhikr: "Subhanallah" }, logs: (() => { const l = createEmptyLog("2026-10-28"); l.zikirCount = 33; return { "2026-10-28": l }; })() };
  const cloud: CloudDoc = { v: 1, logs: (() => { const l = createEmptyLog("2026-10-28"); l.zikirCount = 50; return { "2026-10-28": l }; })() };
  const out = mergeDocs(local, cloud, { settingsFrom: "cloud" });
  eq("zikir = maks(33, 50)", out.logs?.["2026-10-28"]?.zikirCount, 50);
}
{
  // lastRead & penanda: savedAt terbaru; ayahBookmarks unik per (surah, ayat).
  const local: CloudDoc = {
    v: 1,
    lastRead: { surah: 18, ayah: 10, savedAt: "2026-10-27T00:00:00Z" },
    ayahBookmarks: [{ surah: 18, ayah: 10, savedAt: "2026-10-27T00:00:00Z" }],
  };
  const cloud: CloudDoc = {
    v: 1,
    lastRead: { surah: 18, ayah: 25, savedAt: "2026-10-28T00:00:00Z" },
    ayahBookmarks: [
      { surah: 18, ayah: 25, savedAt: "2026-10-28T00:00:00Z" },
      { surah: 18, ayah: 10, savedAt: "2026-10-26T00:00:00Z" },
    ],
  };
  const out = mergeDocs(local, cloud, { settingsFrom: "cloud" });
  eq("lastRead terbaru", out.lastRead?.ayah, 25);
  eq("ayahBookmarks unik (2)", out.ayahBookmarks?.length, 2);
  eq("penanda terurut terbaru dulu", out.ayahBookmarks?.[0]?.ayah, 25);
}
{
  // Idempotensi: merge(A, merge(A,B)) === merge(A,B).
  const A: CloudDoc = {
    v: 1,
    logs: (() => { const l = createEmptyLog("2026-10-28"); l.prayers.subuh = true; l.zikirCount = 12; return { "2026-10-28": l }; })(),
    readingHistory: [{ id: "rd-x", date: "2026-10-28", pages: 2, verses: 9, savedAt: "2026-10-28T06:00:00Z" }],
    lastRead: { surah: 2, ayah: 5, savedAt: "2026-10-28T06:00:00Z" },
  };
  const B: CloudDoc = {
    v: 1,
    logs: (() => { const l = createEmptyLog("2026-10-29"); l.prayers.magrib = true; return { "2026-10-29": l }; })(),
    lastRead: { surah: 3, ayah: 9, savedAt: "2026-10-29T20:00:00Z" },
  };
  const once = mergeDocs(A, B, { settingsFrom: "cloud" });
  const twice = mergeDocs(A, once, { settingsFrom: "cloud" });
  eq("idempoten (gabung dua kali = sekali)", twice, once);
}
{
  // Pengaturan: pemenang sesuai opsi.
  const A: CloudDoc = { v: 1, settings: { name: "Perangkat", city: "Jakarta", quranTargetType: "halaman", quranDailyTarget: 5, quranTargetSurah: 1, zikirTarget: 100, trackedExtras: [], city2: undefined } as never };
  const B: CloudDoc = { v: 1, settings: { name: "Akun", city: "Jakarta", quranTargetType: "halaman", quranDailyTarget: 5, quranTargetSurah: 1, zikirTarget: 100, trackedExtras: [] } as never };
  eq("settingsFrom=local → perangkat menang", mergeDocs(A, B, { settingsFrom: "local" }).settings?.name, "Perangkat");
  eq("settingsFrom=cloud → akun menang", mergeDocs(A, B, { settingsFrom: "cloud" }).settings?.name, "Akun");
}

/* ---------------- Riwayat dinamis ---------------- */
console.log("\n[recordedDateList + reviewActivityDays]");
{
  eq("tanpa log → kosong", recordedDateList({}, {}), []);
  // Entri log "kosong" (semua false, tanpa detail) BUKAN catatan valid.
  const emptyLog = { "2026-10-28": createEmptyLog("2026-10-28") };
  eq("entri kosong tidak dihitung", recordedDateList(emptyLog, {}), []);
  ok("hasAnyDayRecord entri kosong = false", hasAnyDayRecord(emptyLog, {}, "2026-10-28") === false);
  // Hari dengan detail (missed) TETAP hari aktif (ada catatan).
  eq("hari dengan catatan missed tetap aktif", recordedDateList({}, { "2026-10-28": { subuh: det("missed", "2026-10-28T02:00:00Z") } }), ["2026-10-28"]);
  // Hari dengan zikir > 0 aktif.
  const zikirOnly = (() => { const l = createEmptyLog("2026-10-27"); l.zikirCount = 33; return { "2026-10-27": l }; })();
  eq("hari zikir-only aktif", recordedDateList(zikirOnly, {}), ["2026-10-27"]);
}
{
  // Fase tumbuh: 1..7 tanggal → tanggal nyata, terbaru dulu (hari pendaftaran TIDAK dihitung).
  const today = "2026-11-03";
  eq("0 catatan → []", reviewActivityDays([], today), []);
  eq("1 catatan → 1 tanggal", reviewActivityDays(["2026-10-28"], today), ["2026-10-28"]);
  eq("3 catatan → urut terbaru dulu", reviewActivityDays(["2026-10-28", "2026-10-30", "2026-11-01"], today), ["2026-11-01", "2026-10-30", "2026-10-28"]);
  // Hari antar-catatan yang kosong TIDAK muncul pada fase tumbuh.
  ok("gap 29 Okt tidak muncul", !reviewActivityDays(["2026-10-28", "2026-10-30"], today).includes("2026-10-29"));
}
{
  // Fase berjalan: >7 catatan → jendela 7 hari berakhir hari ini (Senin-mingguan bebas).
  const today = "2026-11-03";
  const recorded = ["2026-10-01", "2026-10-15", "2026-10-20", "2026-10-25", "2026-10-28", "2026-10-29", "2026-10-30", "2026-11-01"];
  const days = reviewActivityDays(recorded, today);
  eq("jendela berjalan = 7 hari", days.length, 7);
  eq("berakhir hari ini", days[0], "2026-11-03");
  eq("hari tertua jendela = H-6", days[6], "2026-10-28");
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
