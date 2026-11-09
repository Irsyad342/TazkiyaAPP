/**
 * Uji logika permanensi penghapusan riwayat (tombstone) — fungsi murni merge.
 * Jalankan: npx tsx scripts/test-tombstone.ts
 */
import { mergeDocs, type CloudDoc } from "../src/lib/sync/merge";

const entry = (id: string, date: string, pages: number, verses: number, savedAt: string): CloudDoc["readingHistory"][number] => ({
  id, date, pages, verses, surah: 2, ayahFrom: 1, ayahTo: verses, savedAt, auto: true,
});

let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    fail++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// 1. Entri dihapus di lokal (tombstone) → merge dengan cloud yang masih memuatnya TIDAK menghidupkan kembali.
{
  const tomb = { id: "rd-1", deletedAt: "2026-11-06T10:00:00Z" };
  const local: CloudDoc = { v: 1, readingHistory: [], deletedReadings: [tomb], logs: { "2026-11-05": { date: "2026-11-05", prayers: { subuh: true, zuhur: false, asar: false, magrib: false, isya: false }, extras: { duha: false, tahajud: false, doa: false, puasa: false, sedekah: false }, quranPages: 0, quranVerses: 0, zikirCount: 0 } } };
  const cloud: CloudDoc = {
    v: 1,
    readingHistory: [entry("rd-1", "2026-11-05", 5, 10, "2026-11-05T08:00:00Z")],
    logs: { "2026-11-05": { date: "2026-11-05", prayers: { subuh: true, zuhur: false, asar: false, magrib: false, isya: false }, extras: { duha: false, tahajud: false, doa: false, puasa: false, sedekah: false }, quranPages: 5, quranVerses: 10, zikirCount: 0 } },
  };
  const m = mergeDocs(local, cloud, { settingsFrom: "cloud" });
  check("hapus → merge tidak menghidupkan entri", m.readingHistory?.length === 0, JSON.stringify(m.readingHistory));
  check("counter log tanggal terdampak = hasil riwayat (0)", m.logs?.["2026-11-05"]?.quranPages === 0, String(m.logs?.["2026-11-05"]?.quranPages));
  check("tombstone ikut dalam hasil", m.deletedReadings?.some((d) => d.id === "rd-1") === true);
}

// 2. Tanpa tombstone → perilaku aditif lama tetap (dua perangkat, entri berbeda).
{
  const local: CloudDoc = { v: 1, readingHistory: [entry("a", "2026-11-01", 2, 4, "2026-11-01T08:00:00Z")], logs: {} };
  const cloud: CloudDoc = { v: 1, readingHistory: [entry("b", "2026-11-02", 3, 6, "2026-11-02T08:00:00Z")], logs: {} };
  const m = mergeDocs(local, cloud, { settingsFrom: "local" });
  check("gabungan aditif dua entri valid", m.readingHistory?.length === 2);
}

// 3. Hapus di perangkat A, sinkron ke B: tombstone menyebar, entri tidak kembali.
{
  const tomb = { id: "rd-9", deletedAt: "2026-11-06T09:00:00Z" };
  const docA: CloudDoc = { v: 1, readingHistory: [], deletedReadings: [tomb] };
  const docB: CloudDoc = { v: 1, readingHistory: [entry("rd-9", "2026-11-04", 1, 3, "2026-11-04T08:00:00Z")], deletedReadings: [] };
  const m = mergeDocs(docA, docB, { settingsFrom: "local" });
  check("tombstone menang lintas perangkat", m.readingHistory?.length === 0);
  check("tombstone tetap tersimpan", m.deletedReadings?.length === 1);
}

// 4. Bacaan baru SETELAH penghapusan tetap tercatat (id berbeda).
{
  const tomb = { id: "rd-1", deletedAt: "2026-11-06T10:00:00Z" };
  const local: CloudDoc = {
    v: 1,
    readingHistory: [entry("rd-2", "2026-11-06", 1, 2, "2026-11-06T11:00:00Z")],
    deletedReadings: [tomb],
  };
  const cloud: CloudDoc = { v: 1, readingHistory: [entry("rd-1", "2026-11-05", 5, 10, "2026-11-05T08:00:00Z")] };
  const m = mergeDocs(local, cloud, { settingsFrom: "local" });
  check("bacaan baru tetap ada", m.readingHistory?.length === 1 && m.readingHistory[0].id === "rd-2", JSON.stringify(m.readingHistory));
  check("yang lama tetap terhapus", !m.readingHistory?.some((e) => e.id === "rd-1"));
}

// 5. Bookmark/penanda ayat TIDAK terpengaruh penghapusan riwayat.
{
  const tomb = { id: "rd-1", deletedAt: "2026-11-06T10:00:00Z" };
  const local: CloudDoc = {
    v: 1,
    readingHistory: [],
    deletedReadings: [tomb],
    ayahBookmarks: [{ surah: 18, ayah: 10, savedAt: "2026-11-01T00:00:00Z" }],
    bookmarks: [{ surah: 18, ayah: 10, savedAt: "2026-11-01T00:00:00Z" }],
  };
  const cloud: CloudDoc = {
    v: 1,
    readingHistory: [entry("rd-1", "2026-11-05", 5, 10, "2026-11-05T08:00:00Z")],
    ayahBookmarks: [{ surah: 36, ayah: 1, savedAt: "2026-11-02T00:00:00Z" }],
  };
  const m = mergeDocs(local, cloud, { settingsFrom: "local" });
  check("penanda ayat utuh setelah hapus riwayat", m.ayahBookmarks?.length === 2, JSON.stringify(m.ayahBookmarks));
  check("penanda utama utuh", m.bookmarks?.length === 1);
}

console.log(fail === 0 ? "\nSEMUA UJI LOLOS" : `\n${fail} UJI GAGAL`);
process.exit(fail === 0 ? 0 : 1);
