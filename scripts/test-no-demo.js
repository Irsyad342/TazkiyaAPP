/**
 * Uji penghapusan data demo Tazkiya — 3 skenario:
 *  (a) Pengguna PERTAMA KALI: localStorage kosong → semua halaman kosong, tanpa demo.
 *  (b) Browser lama yang pernah mengisi "data contoh" (demoSeeded=true):
 *      semua data demo dibersihkan otomatis; pengaturan/tasbih/penanda tetap.
 *  (c) Browser dengan data NYATA (tanpa demoSeeded): TIDAK ada yang terhapus.
 */
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const KEY = "tazkiya-store-v1";

const dateKey = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const makeDemoStorage = () => {
  const logs = {};
  for (let i = 1; i <= 30; i++) {
    logs[dateKey(i)] = {
      date: dateKey(i),
      prayers: { subuh: true, zuhur: i % 3 !== 0, asar: true, magrib: i % 4 !== 0, isya: true },
      extras: { duha: i % 2 === 0, tahajud: false, puasa: i % 7 === 0, sedekah: false },
      quranPages: (i % 5) + 1,
      quranVerses: (i % 5) * 20 + 3,
      zikirCount: i % 2 === 0 ? 99 : 33,
    };
  }
  return {
    state: {
      settings: { name: "Sahabat Uji", theme: "dark", glass: true },
      logs,
      prayerDetails: { [dateKey(1)]: { subuh: { status: "done", kind: "jamaah", savedAt: "2026-10-23T04:00:00.000Z" } } },
      bookmarks: [],
      ayahBookmarks: [],
      lastRead: { surah: 2, ayah: 255, savedAt: "2026-10-20T10:00:00.000Z" },
      readingHistory: Array.from({ length: 12 }, (_, k) => ({
        id: `demo-${dateKey(k + 1)}`,
        date: dateKey(k + 1),
        pages: 2, verses: 40, surah: 18, ayahFrom: 1, ayahTo: 10,
        savedAt: new Date().toISOString(),
      })),
      tasbih: { count: 0, target: 100, dhikr: "Subhanallah" },
      demoSeeded: true,
      fridayZuhurAlt: {},
    },
    version: 0,
  };
};

const makeRealStorage = () => ({
  state: {
    settings: { name: "Pengguna Nyata", theme: "dark", glass: true },
    logs: {
      [dateKey(0)]: { date: dateKey(0), prayers: { subuh: true, zuhur: true }, extras: {}, quranPages: 5, quranVerses: 100, zikirCount: 33 },
      [dateKey(2)]: { date: dateKey(2), prayers: { subuh: true }, extras: {}, quranPages: 3, quranVerses: 60, zikirCount: 0 },
    },
    prayerDetails: { [dateKey(0)]: { subuh: { status: "done", kind: "jamaah", savedAt: "2026-10-24T03:00:00.000Z" } } },
    bookmarks: [{ surah: 18, ayah: 10, savedAt: "2026-10-22T10:00:00.000Z" }],
    ayahBookmarks: [{ surah: 2, ayah: 255, savedAt: "2026-10-22T10:00:00.000Z" }],
    lastRead: { surah: 18, ayah: 10, savedAt: "2026-10-22T10:00:00.000Z" },
    readingHistory: [{ id: "rd-123", date: dateKey(0), pages: 5, verses: 100, surah: 18, ayahFrom: 1, ayahTo: 10, savedAt: new Date().toISOString() }],
    tasbih: { count: 45, target: 100, dhikr: "Subhanallah" },
    fridayZuhurAlt: {},
  },
  version: 0,
});

const readStore = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const results = {};
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  /* ---------- (a) Pengguna pertama kali ---------- */
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((k) => localStorage.clear(), KEY);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /profil/i }).first().click();
  await page.waitForTimeout(700);
  const emptyHistory = await page.getByText("Belum ada catatan aktivitas").count();
  const s0 = await readStore(page);
  results.a = {
    localStorageAda: !!s0,
    logsKosong: !s0?.state?.logs || Object.keys(s0.state.logs).length === 0,
    teksRiwayatKosong: emptyHistory >= 7,
    namaDefault: (s0?.state?.settings?.name ?? "") === "",
  };
  console.log("(a) Pengguna baru:", JSON.stringify(results.a));

  /* ---------- (b) Browser ber-data demo ---------- */
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, makeDemoStorage()]);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // Buktikan lewat UI: store hasil hidrasi harus bersih (bukan baca localStorage mentah)
  await page.getByRole("button", { name: /profil/i }).first().click();
  await page.waitForTimeout(700);
  const profilText = await page.locator("main").innerText();
  const riwayatKosongCount = await page.getByText("Belum ada catatan aktivitas").count();
  results.b_pre = {
    streakNol: /0 hari streak/.test(profilText),
    tercatatNol: /0 ibadah tercatat/.test(profilText),
    riwayatKosong7: riwayatKosongCount >= 7,
  };
  console.log("(b) UI menunjukkan demo dibersihkan:", JSON.stringify(results.b_pre));
  // Kembali ke Beranda, lakukan aksi nyata (toggle Duha, role=switch) → set() → persist tulis ulang
  await page.getByRole("button", { name: /beranda/i }).first().click();
  await page.waitForTimeout(700);
  const sw = page.getByRole("switch", { name: /duha/i }).first();
  if (!(await sw.count())) throw new Error("Tombol Duha (switch) tidak ditemukan");
  await sw.click();
  await page.waitForTimeout(900);
  const s2 = await readStore(page);
  results.b_post = {
    flagDemoHilang: !("demoSeeded" in (s2?.state ?? {})),
    catatanBaruHanyaHariIni: Object.keys(s2?.state?.logs ?? {}).every((d) => d === dateKey(0)),
    duhaTercatat: s2?.state?.logs?.[dateKey(0)]?.extras?.duha === true,
    namaMasihAda: s2?.state?.settings?.name === "Sahabat Uji",
  };
  console.log("(b) Setelah interaksi:", JSON.stringify(results.b_post));

  /* ---------- (c) Data nyata tidak disentuh ---------- */
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, makeRealStorage()]);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const s3 = await readStore(page);
  results.c = {
    logHariIniUtuh: s3?.state?.logs?.[dateKey(0)]?.prayers?.subuh === true && s3?.state?.logs?.[dateKey(0)]?.quranPages === 5,
    logLamaUtuh: s3?.state?.logs?.[dateKey(2)]?.prayers?.subuh === true,
    riwayatBacaUtuh: s3?.state?.readingHistory?.[0]?.id === "rd-123",
    penandaUtuh: s3?.state?.bookmarks?.[0]?.surah === 18 && s3?.state?.ayahBookmarks?.[0]?.surah === 2,
    lastReadUtuh: s3?.state?.lastRead?.surah === 18,
    tasbihUtuh: s3?.state?.tasbih?.count === 45,
    namaUtuh: s3?.state?.settings?.name === "Pengguna Nyata",
  };
  console.log("(c) Data nyata:", JSON.stringify(results.c));

  // Statistik tanpa chip "Data contoh aktif"
  await page.getByRole("button", { name: /statistik/i }).first().click();
  await page.waitForTimeout(1200);
  const chipDemo = await page.getByText("Data contoh aktif").count();
  console.log("chip 'Data contoh aktif' muncul:", chipDemo, "(harus 0)");

  const pass =
    results.a.logsKosong && results.a.teksRiwayatKosong && results.a.namaDefault &&
    Object.values(results.b_pre).every(Boolean) && Object.values(results.b_post).every(Boolean) &&
    Object.values(results.c).every(Boolean) && chipDemo === 0 && errors.length === 0;

  console.log(pass ? "\n✔ SEMUA SKENARIO LULUS" : "\n✘ ADA YANG GAGAL");
  console.log("errors:", errors.length ? errors.slice(0, 5) : "0");
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
