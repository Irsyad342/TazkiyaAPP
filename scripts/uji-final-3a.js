// Uji finalisasi — bagian 3a: pencatatan salat, ubah status, batal, terlewat→qada
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;
  const d = new Date();
  const tk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const tabs = $$('nav[aria-label="Navigasi utama"] button');

  tabs[2].click();
  await sleep(450);

  const bukaDialog = async (nama) => {
    $$("button").find((b) => (b.getAttribute("aria-label") || "").startsWith("Catat " + nama))?.click();
    await sleep(450);
    return document.querySelector('[role="dialog"]');
  };
  const pilihStatus = async (label) => {
    $$('[role="dialog"] [role="radio"]').find((b) => b.textContent.includes(label))?.click();
    await sleep(250);
  };
  const tutupPopup = async () => {
    await sleep(400);
    const dlg = document.querySelector('[role="dialog"]');
    if (dlg && dlg.textContent.includes("MasyaAllah")) out["popupJamaah"] = true;
    if (dlg && dlg.textContent.includes("Alhamdulillah") && !dlg.textContent.includes("MasyaAllah")) out["popupMandiri"] = true;
    if (dlg && dlg.textContent.includes("Tetap Semangat")) out["popupSemangat"] = true;
    $$('[role="dialog"] button').find((b) => ["Alhamdulillah", "Lanjutkan"].includes(b.textContent.trim()))?.click();
    await sleep(350);
  };

  // ---- 5. Catat Subuh: done + berjamaah ----
  await bukaDialog("Subuh");
  await pilihStatus("Sudah dilaksanakan");
  await pilihStatus("Berjamaah");
  $$('[role="dialog"] button').find((b) => b.textContent.trim() === "Simpan")?.click();
  await tutupPopup();
  out.t5_subuh = store().prayerDetails[tk]?.subuh?.status === "done" && store().prayerDetails[tk]?.subuh?.kind === "berjamaah";

  // ---- 6. Ubah status Subuh → mandiri ----
  await bukaDialog("Subuh");
  await pilihStatus("Salat sendiri");
  $$('[role="dialog"] button').find((b) => b.textContent.trim() === "Simpan")?.click();
  await tutupPopup();
  out.t6_subuhMandiri = store().prayerDetails[tk]?.subuh?.kind === "mandiri";

  // ---- 13a. Batal tidak mengubah ----
  await bukaDialog("Subuh");
  await pilihStatus("Tidak dilaksanakan");
  $$('[role="dialog"] button').find((b) => b.textContent.trim() === "Batal")?.click();
  await sleep(350);
  out.t13_batal = store().prayerDetails[tk]?.subuh?.status === "done";

  // ---- Tandai Asar terlewat + masukkan qada ----
  await bukaDialog("Asar");
  await pilihStatus("Tidak dilaksanakan");
  $$('[role="dialog"] [role="radio"]').find((b) => b.closest("div")?.parentElement?.querySelector("p")?.textContent.includes("Alasan"))?.click()
    || $$('[role="dialog"] [role="radio"]')[3]?.click();
  await sleep(250);
  const qadaAwal = store().qadaRecords.length;
  $$('[role="dialog"] button').find((b) => b.textContent.includes("Masukkan ke daftar Qada"))?.click();
  await sleep(200);
  $$('[role="dialog"] button').find((b) => b.textContent.trim() === "Simpan")?.click();
  await tutupPopup();
  out.t5_asarMissed = store().prayerDetails[tk]?.asar?.status === "missed";
  out.t5_qadaNambah = store().qadaRecords.length === qadaAwal + 1;

  // Bersihkan: hapus qada uji (konfirmasi) + reset Asar ke belum dicatat
  $$('[role="tab"]').find((b) => b.textContent.trim() === "Qada").click();
  await sleep(400);
  $$('button[aria-label="Hapus catatan qada"]')[0]?.click();
  await sleep(300);
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
  await sleep(350);
  out.bersihQada = store().qadaRecords.length === qadaAwal;
  $$('[role="tab"]').find((b) => b.textContent.trim() === "Hari Ini").click();
  await sleep(400);
  await bukaDialog("Asar");
  await pilihStatus("Belum dicatat");
  $$('[role="dialog"] button').find((b) => b.textContent.trim() === "Simpan")?.click();
  await sleep(400);
  const dlgSisa = document.querySelector('[role="dialog"]');
  if (dlgSisa) $$('[role="dialog"] button').find((b) => ["Alhamdulillah", "Lanjutkan"].includes(b.textContent.trim()))?.click();
  await sleep(300);
  out.bersihAsar = store().prayerDetails[tk]?.asar?.status === "none" || !store().prayerDetails[tk]?.asar;

  return "HASIL3A:" + JSON.stringify(out);
})();
