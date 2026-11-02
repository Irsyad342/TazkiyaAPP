// Uji finalisasi — bagian 3b: tasbih digital (hitung, simpan, reset) + Al-Qur'an (buka, bookmark ayat)
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;
  const d = new Date();
  const tk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const tabs = $$('nav[aria-label="Navigasi utama"] button');

  // ---- 9. Tasbih ----
  tabs[0].click();
  await sleep(450);
  const kartuTasbih = $$('section[aria-label="Jelajahi aktivitas"] button').find((x) => (x.getAttribute("aria-label") || "").includes("Zikir"));
  out.t9_kartuTombol = kartuTasbih?.tagName === "BUTTON";
  kartuTasbih.click();
  await sleep(550);
  $$("button").find((b) => b.textContent.includes("Buka tasbih"))?.click();
  await sleep(550);
  const piringan = document.querySelector('button[aria-label^="Tambah hitungan"]');
  out.t9_sheetTerbuka = !!piringan;
  for (let i = 0; i < 3; i++) {
    piringan.click();
    await sleep(120);
  }
  out.t9_hitung3 = store().tasbih.count === 3;
  $$("button").find((b) => b.textContent.includes("Simpan Harian"))?.click();
  await sleep(450);
  out.t9_tersimpan = (store().logs[tk]?.zikirCount ?? 0) === 3;

  // Tambah 2 lalu uji Reset: Batal = tetap, Ya = nol
  piringan.click();
  await sleep(100);
  piringan.click();
  await sleep(150);
  $$("button").find((b) => b.textContent.trim() === "Reset")?.click();
  await sleep(350);
  const dlgReset = document.querySelector('[role="alertdialog"]');
  out.t9_dialogReset = !!dlgReset && dlgReset.textContent.includes("Reset hitungan tasbih");
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Batal")?.click();
  await sleep(250);
  out.t9_batalTetap5 = store().tasbih.count === 5;
  $$("button").find((b) => b.textContent.trim() === "Reset")?.click();
  await sleep(300);
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Reset")?.click();
  await sleep(300);
  out.t9_resetNol = store().tasbih.count === 0;
  document.querySelector('button[aria-label="Tutup tasbih"]')?.click();
  await sleep(400);

  // ---- 8. Al-Qur'an: buka surah, bookmark ayat, tutup → tercatat otomatis ----
  tabs[1].click();
  await sleep(500);
  const riwayatAwal = store().readingHistory.length;
  const ayatAwal = store().ayahBookmarks.length;
  $$("button").find((b) => (b.getAttribute("aria-label") || "") === "Buka Al-Fatihah")?.click();
  await sleep(2500);
  const reader = document.querySelector('[role="dialog"][aria-label^="Pembaca surah"], [role="dialog"]');
  out.t8_readerTerbuka = !!document.querySelector('button[aria-label="Kembali ke daftar surah"]');
  const teksMuat = document.body.textContent.includes("Mengambil");
  const gagal = document.body.textContent.includes("Gagal memuat surah");
  if (gagal) {
    out.t8_fetchGagal = true;
    document.querySelector('button[aria-label="Kembali ke daftar surah"]')?.click();
  } else {
    await sleep(1500);
    const bookmarkAyat = $$('button[aria-label^="Tandai ayat"]')[0];
    if (bookmarkAyat) {
      bookmarkAyat.click();
      await sleep(350);
      out.t8_ayatDitandai = store().ayahBookmarks.length === ayatAwal + 1;
      out.t8_ikonAktif = bookmarkAyat.getAttribute("aria-label").startsWith("Hapus penanda");
      // Hapus lagi (toggle) biar bersih, lalu tandai sekali lagi untuk uji daftar? — cukup toggle balik
      bookmarkAyat.click();
      await sleep(300);
      out.t8_toggleBalik = store().ayahBookmarks.length === ayatAwal;
    } else out.t8_ayatDitandai = "AYAT-TIDAK-ADA";
    // Gulir sedikit lalu tutup → sesi tercatat otomatis
    document.querySelector('button[aria-label="Kembali ke daftar surah"]')?.click();
    await sleep(700);
    out.t8_readerTertutup = !document.querySelector('button[aria-label="Kembali ke daftar surah"]');
    out.t8_riwayatNambah = store().readingHistory.length > riwayatAwal;
    out.t8_posisiTerakhir = (store().lastRead?.surah ?? 0) === 1;
  }

  return "HASIL3B:" + JSON.stringify(out);
})();
