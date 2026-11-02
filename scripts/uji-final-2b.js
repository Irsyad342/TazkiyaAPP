// Uji finalisasi — bagian 2b: ulang jurnal & qada dengan native value setter React
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;
  const setVal = (el, val) => {
    const proto =
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : el.tagName === "SELECT"
          ? window.HTMLSelectElement.prototype
          : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const tabs = $$('nav[aria-label="Navigasi utama"] button');
  const d = new Date();
  const tk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const y = new Date(Date.now() - 86400000);
  const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

  // ---- 4. Jurnal: isi dengan setter benar → simpan ----
  tabs[0].click();
  await sleep(450);
  $$('section[aria-label="Jelajahi aktivitas"] button').find((x) => (x.getAttribute("aria-label") || "").includes("Jurnal")).click();
  await sleep(500);
  const inputs = $$('input[aria-label^="Hal "]');
  setVal(inputs[0], "syukur satu");
  setVal(inputs[1], "syukur dua");
  await sleep(150);
  $$("button").find((b) => b.textContent.includes("Simpan Jurnal")).click();
  await sleep(450);
  const j = store().journal[tk];
  out.t4_tersimpan = (j?.items ?? []).filter(Boolean).length === 2 && !!j?.savedAt;

  // ---- 4b. Edit tombol memuat jurnal ke atas (scroll kontainer) ----
  $$("button").find((b) => b.textContent.trim() === "Edit")?.click();
  await sleep(600);
  const konten = document.getElementById("konten-tazkiya");
  out.t4d_scrollKeAtas = konten ? konten.scrollTop < 40 : "kontainer-tak-ada";
  $$('button[aria-label="Kembali"]')[0].click();
  await sleep(400);

  // ---- 7. Qada: tambah dengan catatan → selesai → buka lagi → hapus (konfirmasi) ----
  tabs[2].click();
  await sleep(450);
  $$('[role="tab"]').find((b) => b.textContent.trim() === "Qada").click();
  await sleep(450);

  // Bersihkan sisa catatan uji sebelumnya (jika ada) lewat UI + konfirmasi
  let sisa;
  while ((sisa = $$('button[aria-label="Hapus catatan qada"]').find((b) => b.closest("div")?.textContent.includes("uji qada finalisasi")))) {
    sisa.click();
    await sleep(300);
    $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
    await sleep(350);
  }

  const qadaAwal = store().qadaRecords.length;
  setVal(document.querySelector("#qada-prayer"), "magrib");
  setVal(document.querySelector("#qada-date"), yk);
  setVal(document.querySelector('input[aria-label="Catatan singkat (opsional)"]'), "uji qada finalisasi");
  await sleep(150);
  $$("button").find((b) => b.textContent.includes("Tambah ke Daftar Qada")).click();
  await sleep(450);
  const qadaBaru = store().qadaRecords.find((q) => q.note === "uji qada finalisasi");
  out.t7_ditambah = store().qadaRecords.length === qadaAwal + 1 && !!qadaBaru;

  // Selesaikan khusus baris milik uji ini (tombol dalam baris yang memuat catatan)
  const btnSelesai = $$("button").find((b) => b.textContent.includes("Sudah diqada") && b.closest("div")?.textContent.includes("uji qada finalisasi"));
  btnSelesai?.click();
  await sleep(450);
  out.t7_selesai = !!store().qadaRecords.find((q) => q.note === "uji qada finalisasi")?.completedAt;

  // Buka kembali dari riwayat (baris yang sama)
  const barisRiwayat = $$("li").find((el) => el.textContent.includes("uji qada finalisasi"));
  barisRiwayat?.querySelector('button[aria-label="Buka kembali catatan qada ini"]')?.click();
  await sleep(450);
  out.t7_dibukaLagi = !!barisRiwayat && !store().qadaRecords.find((q) => q.note === "uji qada finalisasi")?.completedAt;

  // Hapus baris milik uji ini dengan konfirmasi
  const btnHapus = $$('button[aria-label="Hapus catatan qada"]').find((b) => b.closest("div")?.textContent.includes("uji qada finalisasi"));
  btnHapus?.click();
  await sleep(350);
  out.t7_dialogKonfirmasi = !!document.querySelector('[role="alertdialog"]');
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Batal")?.click();
  await sleep(300);
  out.t7_batalMasihAda = !!store().qadaRecords.find((q) => q.note === "uji qada finalisasi");
  const btnHapus2 = $$('button[aria-label="Hapus catatan qada"]').find((b) => b.closest("div")?.textContent.includes("uji qada finalisasi"));
  btnHapus2?.click();
  await sleep(300);
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
  await sleep(400);
  out.t7_terhapus = !store().qadaRecords.find((q) => q.note === "uji qada finalisasi");

  return "HASIL2B:" + JSON.stringify(out);
})();
