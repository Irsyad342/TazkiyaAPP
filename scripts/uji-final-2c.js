// Uji finalisasi — bagian 2c: lanjutan qada (buka kembali + hapus dengan konfirmasi)
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;

  out.prasyarat = store().qadaRecords.length === 1 && !!store().qadaRecords[0].completedAt;

  // Buka kembali (tombol di riwayat — satu-satunya catatan adalah milik uji)
  const btnReopen = $$('button[aria-label="Buka kembali catatan qada ini"]')[0];
  btnReopen?.click();
  await sleep(450);
  out.t7_dibukaLagi = !store().qadaRecords.find((q) => q.note === "uji qada finalisasi")?.completedAt;

  // Hapus dengan konfirmasi: Batal → tetap ada
  const btnHapus = () => $$('button[aria-label="Hapus catatan qada"]').find((b) => b.closest("div")?.textContent.includes("uji qada finalisasi"));
  btnHapus()?.click();
  await sleep(350);
  out.t7_dialogKonfirmasi = !!document.querySelector('[role="alertdialog"]');
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Batal")?.click();
  await sleep(300);
  out.t7_batalMasihAda = !!store().qadaRecords.find((q) => q.note === "uji qada finalisasi");

  // Hapus: Ya, hapus → bersih
  btnHapus()?.click();
  await sleep(300);
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
  await sleep(400);
  out.t7_terhapus = !store().qadaRecords.find((q) => q.note === "uji qada finalisasi");

  // Bersihkan juga jurnal uji hari ini (biar profil kembali netral)
  const jKey = Object.keys(store().journal).find((k) => store().journal[k]?.items?.[0] === "syukur satu");
  out.jurnalUjiAda = !!jKey;
  if (jKey) {
    const btn = $$('button[aria-label^="Hapus jurnal"]').find((b) => b.closest("li")?.textContent.includes("syukur satu"));
    btn?.click();
    await sleep(350);
    $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
    await sleep(400);
  }
  out.jurnalUjiTerhapus = !Object.keys(store().journal).find((k) => store().journal[k]?.items?.[0] === "syukur satu");

  return "HASIL2C:" + JSON.stringify(out);
})();
