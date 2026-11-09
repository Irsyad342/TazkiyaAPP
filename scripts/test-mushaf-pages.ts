/**
 * Uji unit paginateSurahForMushaf (Task 64 — Surah Based Mushaf).
 * Data sintetis: memastikan (1) seluruh ayat 1..N muncul TEPAT SEKALI dan
 * berurutan, (2) halaman monoton naik & kelompok sesuai nomor halaman,
 * (3) guard ayat page=0 / nomor halaman mundur tidak menduplikasi atau
 * menghilangkan ayat, (4) surah satu halaman tetap satu grup.
 * Jalankan: npx tsx scripts/test-mushaf-pages.ts
 */
import { paginateSurahForMushaf, type SurahData } from "../src/lib/tazkiya/quran";
import { getSurah } from "../src/lib/tazkiya/quran";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeData(n: number, pagesPerAyah: number[]): SurahData {
  const meta = getSurah(n)!;
  return {
    surah: meta,
    bismillah: n === 1 || n === 9 ? null : "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    fetchedAt: Date.now(),
    ayahs: pagesPerAyah.map((page, i) => ({
      global: i + 1,
      number: i + 1,
      text: `نَصُّ ٱلْآيَةِ ${i + 1}`,
      translation: `ayat ${i + 1}`,
      page,
      juz: 27,
    })),
  };
}

function flatten(pages: ReturnType<typeof paginateSurahForMushaf>) {
  return pages.flatMap((p) => p.ayahs.map((a) => a.numberInSurah));
}

console.log("1) Surah multi-halaman (Waqiah sintetis: 534,534,535,535,536,537)");
{
  const d = makeData(56, [534, 534, 535, 535, 536, 537]);
  const pages = paginateSurahForMushaf(d);
  check("jumlah halaman = 4", pages.length === 4, String(pages.length));
  check("nomor halaman [534,535,536,537]", pages.map((p) => p.page).join(",") === "534,535,536,537");
  check("semua 6 ayat tepat sekali & berurut", flatten(pages).join(",") === "1,2,3,4,5,6");
  check("halaman 1 memuat 2 ayat", pages[0].ayahs.length === 2);
  check("juz dari ayat pertama", pages.every((p) => p.juz === 27));
}

console.log("2) Surah satu halaman (Kawthar sintetis: 602,602,602)");
{
  const d = makeData(108, [602, 602, 602]);
  const pages = paginateSurahForMushaf(d);
  check("jumlah halaman = 1", pages.length === 1);
  check("3 ayat utuh", flatten(pages).join(",") === "1,2,3");
  check("halaman 602", pages[0].page === 602);
}

console.log("3) Guard: page=0 lalu normal (fallback ikut halaman sebelumnya/1)");
{
  const d = makeData(1, [0, 1, 1]);
  const pages = paginateSurahForMushaf(d);
  check("ayat 1 tetap ada di halaman 1", flatten(pages).join(",") === "1,2,3" && pages[0].page === 1);
}

console.log("4) Guard: nomor halaman mundur (diklem ke halaman sebelumnya)");
{
  const d = makeData(2, [5, 6, 4, 7]);
  const pages = paginateSurahForMushaf(d);
  check("monoton tanpa duplikasi ayat", flatten(pages).join(",") === "1,2,3,4");
  check("halaman [5,6,6,7]", pages.map((p) => p.page).join(",") === "5,6,7");
}

console.log("5) Isolasi surah: kelompok hanya dari ayat surah itu sendiri");
{
  const d = makeData(55, [531, 531, 534]);
  const pages = paginateSurahForMushaf(d);
  const ok = pages.every((p) => p.ayahs.every((a) => a.numberInSurah >= 1 && a.numberInSurah <= 3));
  check("tidak ada ayat dari surah lain", ok);
  check("urutan asli terjaga", flatten(pages).join(",") === "1,2,3");
}

if (failed) {
  console.error(`\nGAGAL: ${failed} pemeriksaan`);
  process.exit(1);
}
console.log("\nSemua uji paginasi lulus.");
