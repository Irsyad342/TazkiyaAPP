// Seed QA Electric Dream color audit (SUIO).
// Eval via agent-browser: window.__QA_PHASE = "light" | "dark" | "classic" | "classic-dark".
// Menanam: onboarding selesai, settings (mode + colorTheme), log ibadah
// minggu 15-21 Nov 2026 (hari ini parsial), jurnal, amal, zikir.
(() => {
  const phase = (window.__QA_PHASE || "light").toString();
  localStorage.setItem("tazkiya-onboarding-v1", "done");
  const KEY = "tazkiya-store-v1";
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  const st = parsed.state ?? (parsed.state = {});

  const done = (kind) => ({ status: "done", kind, savedAt: "2026-11-21T08:00:00+07:00" });
  const miss = (reason) => ({ status: "missed", reason, savedAt: "2026-11-21T08:00:00+07:00" });
  const P = ["subuh", "zuhur", "asar", "magrib", "isya"];
  const logFor = (date, prayers, extras, qp, qv, zk) => ({
    date,
    prayers: Object.fromEntries(P.map((p) => [p, !!prayers[p]])),
    extras: Object.fromEntries(["duha", "tahajud", "puasa", "sedekah"].map((e) => [e, !!extras[e]])),
    quranPages: qp, quranVerses: qv, zikirCount: zk,
  });

  const pd = {
    "2026-11-15": { subuh: done("berjamaah"), zuhur: done("berjamaah"), asar: done("berjamaah"), magrib: done("berjamaah"), isya: done("berjamaah") },
    "2026-11-16": { subuh: done("berjamaah"), zuhur: done("mandiri"), asar: miss("ketiduran"), magrib: done("mandiri"), isya: done("berjamaah") },
    "2026-11-17": { subuh: done("mandiri"), asar: done("mandiri"), isya: done("mandiri") },
    "2026-11-18": { subuh: done("berjamaah"), zuhur: done("berjamaah"), asar: done("berjamaah"), magrib: done("berjamaah"), isya: done("berjamaah") },
    "2026-11-19": { zuhur: done("berjamaah"), magrib: done("mandiri"), isya: done("mandiri") },
    "2026-11-20": { subuh: done("berjamaah"), zuhur: done("mandiri"), asar: done("mandiri"), magrib: done("berjamaah") },
    "2026-11-21": { subuh: done("berjamaah") },
  };
  const logs = {
    "2026-11-15": logFor("2026-11-15", 1, { duha: 1 }, 5, 12, 33),
    "2026-11-16": logFor("2026-11-16", 1, { sedekah: 1 }, 3, 7, 40),
    "2026-11-17": logFor("2026-11-17", 1, {}, 0, 0, 0),
    "2026-11-18": logFor("2026-11-18", 1, { duha: 1, tahajud: 1 }, 4, 9, 60),
    "2026-11-19": logFor("2026-11-19", 1, {}, 2, 5, 25),
    "2026-11-20": logFor("2026-11-20", 1, { puasa: 1 }, 6, 14, 0),
    "2026-11-21": logFor("2026-11-21", { subuh: 1 }, { duha: 1 }, 1, 3, 33),
  };
  st.logs = { ...(st.logs ?? {}), ...logs };
  st.prayerDetails = { ...(st.prayerDetails ?? {}), ...pd };
  st.journal = {
    ...(st.journal ?? {}),
    "2026-11-16": { date: "2026-11-16", items: ["Sehat", "Keluarga", "Rezeki"], savedAt: "2026-11-16T20:00:00+07:00" },
    "2026-11-18": { date: "2026-11-18", items: ["Hujan", "Kopi", "Istirahat"], savedAt: "2026-11-18T20:00:00+07:00" },
    "2026-11-20": { date: "2026-11-20", items: ["Jumat berkah", "Teman", "Waktu"], savedAt: "2026-11-20T20:00:00+07:00" },
  };
  st.amalEntries = [
    { id: "am-el1", date: "2026-11-17", kind: "sedekah", title: "Sedekah subuh", savedAt: "2026-11-17T06:00:00+07:00" },
    { id: "am-el2", date: "2026-11-19", kind: "membantu", title: "Bantu tetangga", savedAt: "2026-11-19T16:00:00+07:00" },
    { id: "am-el3", date: "2026-11-21", kind: "berbagi-ilmu", title: "Bagi materi kajian", savedAt: "2026-11-21T10:00:00+07:00" },
  ];
  st.zikirSessions = [
    { id: "zk-el1", date: "2026-11-17", count: 40, dhikr: "Subhanallah", slot: "harian", savedAt: "2026-11-17T07:00:00+07:00" },
    { id: "zk-el2", date: "2026-11-19", count: 60, dhikr: "Alhamdulillah", slot: "pagi", savedAt: "2026-11-19T07:00:00+07:00" },
    { id: "zk-el3", date: "2026-11-21", count: 33, dhikr: "Astaghfirullah", slot: "petang", savedAt: "2026-11-21T06:30:00+07:00" },
  ];
  st.settings = {
    ...(st.settings ?? {}),
    theme: phase === "light" || phase === "classic" ? "light" : "dark",
    colorTheme: phase === "classic" || phase === "classic-dark" ? "classic" : "electric",
    glassEffects: true,
    glassLevel: "balanced",
    name: "QA Electric",
    reminderNotify: false,
  };
  parsed.state = st;
  localStorage.setItem(KEY, JSON.stringify(parsed));
  return "seeded:" + phase;
})();
