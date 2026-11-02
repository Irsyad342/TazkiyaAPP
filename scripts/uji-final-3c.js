// Uji finalisasi — bagian 3c: progress, profil edit, tema, TargetSheet, target harian, semantik kartu, auth
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;
  const setVal = (el, val) => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const tabs = $$('nav[aria-label="Navigasi utama"] button');

  // ---- 10. Progress: tiga periode + DayDetailSheet ----
  tabs[3].click();
  await sleep(500);
  out.t10_harian = document.body.textContent.includes("Perjalanan Kategori Hari Ini");
  $$('[role="tab"]').find((b) => b.textContent.trim() === "Mingguan").click();
  await sleep(450);
  out.t10_mingguan = document.body.textContent.includes("Perjalanan Salat Minggu Ini");
  $$('[aria-label^="Rincian"]').find((b) => !b.disabled)?.click();
  await sleep(450);
  out.t10_sheetHari = !!document.querySelector('[role="dialog"]') && document.body.textContent.includes("Salat wajib");
  $$('[role="dialog"] button').find((b) => b.textContent.trim() === "Tutup")?.click();
  await sleep(350);
  $$('[role="tab"]').find((b) => b.textContent.trim() === "Bulanan").click();
  await sleep(450);
  out.t10_bulanan = document.body.textContent.includes("Kalender Aktivitas");

  // ---- 11. Profil: edit nama ----
  tabs[4].click();
  await sleep(500);
  $$("button").find((b) => b.textContent.trim() === "Edit Profil")?.click();
  await sleep(300);
  const inpNama = document.querySelector('input[aria-label="Nama pengguna"]');
  setVal(inpNama, "Ahmad Finalisasi");
  await sleep(150);
  $$('button[aria-label="Simpan nama"]')?.[0]?.click();
  await sleep(400);
  out.t11_nama = store().settings.name === "Ahmad Finalisasi";

  // ---- 13b. TargetSheet buka-tutup ----
  $$("button").find((b) => (b.getAttribute("aria-label") || "") === "Buka halaman Target Ibadah")?.click();
  await sleep(450);
  out.t13_targetBuka = document.body.textContent.includes("Atur sasaran harian sesuai kemampuanmu");
  $$('button[aria-label="Kembali ke Profil"]')?.[0]?.click();
  await sleep(400);
  out.t13_targetTutup = !document.body.textContent.includes("Atur sasaran harian sesuai kemampuanmu");

  // ---- 12. Tema gelap ↔ terang ----
  $$('[role="radiogroup"][aria-label="Pilih tema"] [role="radio"]').find((b) => b.textContent.includes("Terang"))?.click();
  await sleep(400);
  out.t12_terang = document.documentElement.dataset.theme === "light";
  $$('[role="radiogroup"][aria-label="Pilih tema"] [role="radio"]').find((b) => b.textContent.includes("Gelap"))?.click();
  await sleep(400);
  out.t12_gelap = document.documentElement.dataset.theme === "dark";

  // ---- 14. Status kartu akun + tautan /auth ----
  out.t14_statusAkun = document.body.textContent.includes("Belum masuk akun") ? "tanpa-sesi"
    : document.body.textContent.includes("Fitur akun belum diaktifkan") ? "unconfigured"
    : document.body.textContent.includes("Keluar dari akun") ? "signin" : "tidak-diketahui";
  const linkMasuk = $$("a").find((a) => a.getAttribute("href")?.startsWith("/auth") && a.textContent.includes("Masuk"));
  out.t14_linkAuth = !!linkMasuk;

  // ---- Target harian: toggle, tambah pribadi, hapus dengan konfirmasi ----
  tabs[0].click();
  await sleep(500);
  const goalPertama = $$('section[aria-label="Target harian"] [role="checkbox"]')[0];
  const nilaiAwal = goalPertama.getAttribute("aria-checked");
  goalPertama.click();
  await sleep(350);
  const goalSetelah = $$('section[aria-label="Target harian"] [role="checkbox"]')[0].getAttribute("aria-checked");
  out.t_targetToggle = nilaiAwal !== goalSetelah;
  goalPertama.click();
  await sleep(300);
  $$('section[aria-label="Target harian"] button').find((b) => b.textContent.includes("Atur"))?.click();
  await sleep(350);
  const inpGoal = document.querySelector('input[aria-label="Tambah target pribadi"]');
  setVal(inpGoal, "Uji target pribadi");
  await sleep(120);
  $$('button[aria-label="Simpan target baru"]')?.[0]?.click();
  await sleep(400);
  out.t_goalTambah = store().dailyGoals.some((g) => g.label === "Uji target pribadi" && g.custom);
  const btnHapusGoal = $$('button[aria-label="Hapus target Uji target pribadi"]')[0];
  btnHapusGoal?.click();
  await sleep(350);
  const dlgGoal = document.querySelector('[role="alertdialog"]');
  out.t_goalDialog = !!dlgGoal && dlgGoal.textContent.includes("Uji target pribadi");
  $$('[role="alertdialog"] button').find((b) => b.textContent.trim() === "Ya, hapus")?.click();
  await sleep(400);
  out.t_goalTerhapus = !store().dailyGoals.some((g) => g.label === "Uji target pribadi");

  // ---- Semantik kartu Beranda: 3 kartu progres adalah <button> ----
  const kartuProgres = $$('section[aria-label="Progres ibadah hari ini"] button');
  out.t_kartuButton = kartuProgres.length >= 3 && kartuProgres.slice(0, 3).every((b) => b.tagName === "BUTTON");
  kartuProgres[1]?.click();
  await sleep(450);
  out.t_kartuNavigasi = document.body.textContent.includes("Target Bacaan Harian");
  tabs[0].click();
  await sleep(400);

  return "HASIL3C:" + JSON.stringify(out);
})();
