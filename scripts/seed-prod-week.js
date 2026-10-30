// Seed data uji minggu ini (Sen 26 Okt – Jum 30 Okt 2026) ke localStorage produksi
// untuk verifikasi visual pengisian batang kiri→kanan. Jalankan via agent-browser eval.
(() => {
  const KEY = "tazkiya-store-v1";
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  const st = parsed.state ?? (parsed.state = {});

  const done = (kind) => ({ status: "done", kind, savedAt: "2026-10-30T08:00:00+07:00" });
  const miss = (reason) => ({ status: "missed", reason, savedAt: "2026-10-30T08:00:00+07:00" });

  const prayerDetails = {
    "2026-10-26": { subuh: done("berjamaah"), zuhur: done("berjamaah"), asar: done("berjamaah"), magrib: done("mandiri"), isya: done("berjamaah") },
    "2026-10-27": { subuh: done("berjamaah"), zuhur: done("mandiri"), asar: done("mandiri"), magrib: miss("terlewat"), isya: done("berjamaah") },
    "2026-10-28": { subuh: done("mandiri"), asar: done("mandiri") },
    "2026-10-29": { subuh: done("berjamaah"), zuhur: done("berjamaah"), magrib: miss("lupa"), isya: done("mandiri") },
    "2026-10-30": { subuh: done("berjamaah"), zuhur: done("berjamaah") },
  };

  const logFor = (date, prayers, extras, qp, qv, zk) => ({
    date,
    prayers: Object.fromEntries(["subuh", "zuhur", "asar", "magrib", "isya"].map((p) => [p, !!prayers[p]])),
    extras: Object.fromEntries(["duha", "tahajud", "puasa", "sedekah"].map((e) => [e, !!extras[e]])),
    quranPages: qp,
    quranVerses: qv,
    zikirCount: zk,
  });

  const logs = {
    "2026-10-26": logFor("2026-10-26", { subuh: 1, zuhur: 1, asar: 1, magrib: 1, isya: 1 }, { duha: 1 }, 5, 12, 33),
    "2026-10-27": logFor("2026-10-27", { subuh: 1, zuhur: 1, asar: 1, isya: 1 }, { sedekah: 1 }, 3, 7, 0),
    "2026-10-28": logFor("2026-10-28", { subuh: 1, asar: 1 }, {}, 0, 0, 12),
    "2026-10-29": logFor("2026-10-29", { subuh: 1, zuhur: 1, isya: 1 }, { duha: 1, tahajud: 1 }, 4, 9, 50),
    "2026-10-30": logFor("2026-10-30", { subuh: 1, zuhur: 1 }, {}, 2, 4, 20),
  };

  st.logs = { ...(st.logs ?? {}), ...logs };
  st.prayerDetails = { ...(st.prayerDetails ?? {}), ...prayerDetails };
  st.settings = { ...(st.settings ?? {}), theme: "dark" };
  localStorage.setItem(KEY, JSON.stringify(parsed));
  return "seeded: logs=" + Object.keys(st.logs).length + " details=" + Object.keys(st.prayerDetails).length;
})()
