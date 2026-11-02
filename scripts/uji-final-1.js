// Uji finalisasi — bagian 1: nav 5 menu, highlight Jelajahi, mood check-in
(async () => {
  const $$ = (s) => [...document.querySelectorAll(s)];
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = () => JSON.parse(localStorage.getItem("tazkiya-store-v1")).state;
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ---- 1. Lima menu utama ----
  const tabs = $$('nav[aria-label="Navigasi utama"] button');
  out.t1_labels = tabs.map((b) => b.textContent.trim());
  out.t1_lainnyaHilang = !out.t1_labels.includes("Lainnya");
  const cekTab = async (i, penanda) => {
    tabs[i].click();
    await sleep(450);
    return document.body.textContent.includes(penanda);
  };
  out.t1_beranda = await cekTab(0, "Salat berikutnya");
  out.t1_quran = await cekTab(1, "Target Bacaan Harian");
  out.t1_sholat = await cekTab(2, "Lima Waktu Salat");
  out.t1_progress = await cekTab(3, "Progres Ibadah Hari Ini");
  out.t1_profil = await cekTab(4, "Fokus Ibadah Hari Ini");

  // ---- 2. Highlight Jelajahi Aktivitas ----
  tabs[0].click();
  await sleep(450);
  const bukaSub = async (label, penanda) => {
    const b = $$('section[aria-label="Jelajahi aktivitas"] button').find((x) =>
      (x.getAttribute("aria-label") || "").includes(label)
    );
    if (!b) return "TOMBOL-TIDAK-ADA";
    b.click();
    await sleep(500);
    const ok = document.body.textContent.includes(penanda);
    const back = document.querySelector('button[aria-label="Kembali"]');
    if (back) back.click();
    await sleep(400);
    return ok;
  };
  out.t2_jurnal = await bukaSub("Jurnal Syukur", "Hal apa yang kamu syukuri");
  out.t2_zikir = await bukaSub("Zikir", "Set Zikir");
  out.t2_rizq = await bukaSub("Rizq", "Target Kebaikan");

  // ---- 3. Mood check-in: pilih → timpa → satu entri ----
  const moodBtn = (label) =>
    $$('section[aria-label="Mood check-in"] [role="radio"]').find((x) => x.getAttribute("aria-label") === "Mood " + label);
  moodBtn("Tenang").click();
  await sleep(250);
  moodBtn("Bahagia").click();
  await sleep(350);
  const moods = store().moods || {};
  const entriHariIni = Object.entries(moods).filter(([, v]) => v.date === todayKey());
  out.t3_entriSatu = entriHariIni.length === 1;
  out.t3_nilaiTerakhir = entriHariIni[0] ? entriHariIni[0][1].mood : "kosong";
  out.t3_terpilih = moodBtn("Bahagia").getAttribute("aria-checked") === "true";
  out.t3_ctaJurnal = document.body.textContent.includes("Lanjut ke Jurnal Syukur");

  return "HASIL1:" + JSON.stringify(out);
})();
