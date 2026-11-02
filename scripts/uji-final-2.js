// Uji finalisasi — bagian 2: jurnal simpan, konfirmasi hapus (batal/ya), qada penuh
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;
  const tabs = $$('nav[aria-label="Navigasi utama"] button');

  // ---- 4. Jurnal Syukur: simpan ----
  tabs[0].click();
  await sleep(450);
  $$('section[aria-label="Jelajahi aktivitas"] button').find((x) => (x.getAttribute("aria-label") || "").includes("Jurnal")).click();
  await sleep(500);
  const inputs = $$('input[aria-label^="Hal "]');
  inputs[0].value = "uji tulisan satu";
  inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
  inputs[1].value = "uji tulisan dua";
  inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(150);
  $$("button").find((b) => b.textContent.includes("Simpan Jurnal")).click();
  await sleep(400);
  const d = new Date();
  const tk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  out.t4_tersimpan = (store().journal[tk]?.items ?? []).filter(Boolean).length === 2;
  out.t4_riwayatKemarin = document.body.textContent.includes("uji syukur a");

  // ---- 4b. Konfirmasi hapus jurnal riwayat: Batal = tetap ada ----
  const tombolHapusJurnal = $$('button[aria-label^="Hapus jurnal"]')[0];
  out.t4b_dialogMuncul = false;
  tombolHapusJurnal.click();
  await sleep(400);
  const dlg1 = document.querySelector('[role="alertdialog"]');
  out.t4b_dialogMuncul = !!dlg1 && dlg1.textContent.includes("Hapus jurnal");
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Batal")?.click();
  await sleep(350);
  const yk = tk && Object.keys(store().journal).find((k) => k !== tk);
  out.t4b_batalMasihAda = !!yk && !!store().journal[yk];

  // ---- 4c. Konfirmasi hapus: Ya = terhapus ----
  $$('button[aria-label^="Hapus jurnal"]')[0].click();
  await sleep(350);
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
  await sleep(400);
  out.t4c_terhapus = !store().journal[yk];

  // Kembali ke Beranda
  $$('button[aria-label="Kembali"]')[0].click();
  await sleep(400);

  // ---- 7. Qada: tambah manual → selesai → buka lagi → hapus dengan konfirmasi ----
  tabs[2].click();
  await sleep(450);
  $$('[role="tab"]').find((b) => b.textContent.trim() === "Qada").click();
  await sleep(450);
  const qadaAwal = store().qadaRecords.length;
  const sel = document.querySelector("#qada-prayer");
  sel.value = "magrib";
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  const tgl = document.querySelector("#qada-date");
  tgl.value = yk;
  tgl.dispatchEvent(new Event("change", { bubbles: true }));
  const cat = document.querySelector('input[aria-label="Catatan singkat (opsional)"]');
  cat.value = "uji qada finalisasi";
  cat.dispatchEvent(new Event("input", { bubbles: true }));
  $$("button").find((b) => b.textContent.includes("Tambah ke Daftar Qada")).click();
  await sleep(400);
  out.t7_ditambah = store().qadaRecords.length === qadaAwal + 1;

  // Sudah diqada → pindah ke riwayat
  $$("button").find((b) => b.textContent.includes("Sudah diqada")).click();
  await sleep(400);
  out.t7_selesai = store().qadaRecords.find((q) => q.note === "uji qada finalisasi")?.completedAt ? true : false;

  // Buka kembali (RotateCcw) → kembali ke daftar
  $$('button[aria-label="Buka kembali catatan qada ini"]')[0].click();
  await sleep(400);
  out.t7_dibukaLagi = !store().qadaRecords.find((q) => q.note === "uji qada finalisasi")?.completedAt;

  // Hapus dengan konfirmasi: Batal dulu lalu Ya
  const hapusQada = $$('button[aria-label="Hapus catatan qada"]')[0];
  hapusQada.click();
  await sleep(350);
  const dlg2 = document.querySelector('[role="alertdialog"]');
  out.t7_dialogKonfirmasi = !!dlg2 && dlg2.textContent.includes("Hapus catatan qada");
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Batal")?.click();
  await sleep(300);
  out.t7_batalMasihAda = store().qadaRecords.length === qadaAwal + 1;
  $$('button[aria-label="Hapus catatan qada"]')[0].click();
  await sleep(300);
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
  await sleep(400);
  out.t7_terhapus = store().qadaRecords.length === qadaAwal;

  return "HASIL2:" + JSON.stringify(out);
})();
