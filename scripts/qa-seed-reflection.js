// Seed data uji QA Weekly Reflection + Prayer Reminder (SUIO).
// Dijalankan via agent-browser eval di halaman lokal. Fase "week" = data dua
// minggu (Sen 2 Nov – Min 8 Nov 2026 penuh + hari ini Sen 9 Nov). Fase
// "reminder" = ubah jadwal manual agar waktu salat terpicu kapan pun jam uji.
(() => {
  const KEY = "tazkiya-store-v1";
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  const st = parsed.state ?? (parsed.state = {});
  const phase = (window.__QA_PHASE || "week").toString();

  const done = (kind) => ({ status: "done", kind, savedAt: "2026-11-08T08:00:00+07:00" });
  const miss = (reason) => ({ status: "missed", reason, savedAt: "2026-11-08T08:00:00+07:00" });
  const P = ["subuh", "zuhur", "asar", "magrib", "isya"];
  const logFor = (date, prayers, extras, qp, qv, zk) => ({
    date,
    prayers: Object.fromEntries(P.map((p) => [p, !!prayers[p]])),
    extras: Object.fromEntries(["duha", "tahajud", "puasa", "sedekah"].map((e) => [e, !!extras[e]])),
    quranPages: qp, quranVerses: qv, zikirCount: zk,
  });

  if (phase === "week") {
    // Minggu lalu (2–8 Nov): pola beragam — jamaah, mandiri, missed, kosong.
    const pd = {
      "2026-11-02": { subuh: done("berjamaah"), zuhur: done("berjamaah"), asar: done("mandiri"), magrib: done("berjamaah"), isya: done("berjamaah") },
      "2026-11-03": { subuh: done("berjamaah"), zuhur: done("mandiri"), asar: miss("ketiduran"), magrib: done("mandiri"), isya: done("berjamaah") },
      "2026-11-04": { subuh: done("mandiri"), asar: done("mandiri"), isya: done("mandiri") },
      "2026-11-05": { subuh: done("berjamaah"), zuhur: done("berjamaah"), asar: done("berjamaah"), magrib: done("berjamaah"), isya: done("berjamaah") },
      "2026-11-06": { zuhur: done("berjamaah"), magrib: done("mandiri"), isya: done("mandiri") },
      "2026-11-07": { subuh: done("berjamaah"), zuhur: done("mandiri"), asar: done("mandiri") },
      "2026-11-08": { subuh: done("berjamaah"), magrib: done("berjamaah"), isya: done("berjamaah") },
    };
    const logs = {
      "2026-11-02": logFor("2026-11-02", 1, { duha: 1 }, 5, 12, 33),
      "2026-11-03": logFor("2026-11-03", 1, { sedekah: 1 }, 3, 7, 40),
      "2026-11-04": logFor("2026-11-04", 1, {}, 0, 0, 0),
      "2026-11-05": logFor("2026-11-05", 1, { duha: 1, tahajud: 1 }, 4, 9, 60),
      "2026-11-06": logFor("2026-11-06", 1, {}, 2, 5, 25),
      "2026-11-07": logFor("2026-11-07", 1, { puasa: 1 }, 6, 14, 0),
      "2026-11-08": logFor("2026-11-08", 1, { sedekah: 1, duha: 1 }, 3, 8, 45),
      // Hari ini (Sen 9 Nov): baru sebagian — card minggu berjalan.
      "2026-11-09": logFor("2026-11-09", { subuh: 1 }, { duha: 1 }, 1, 3, 20),
    };
    // Detail untuk hari ini (subuh berjamaah).
    pd["2026-11-09"] = { subuh: { status: "done", kind: "berjamaah", savedAt: "2026-11-09T05:10:00+07:00" } };
    st.logs = { ...(st.logs ?? {}), ...logs };
    st.prayerDetails = { ...(st.prayerDetails ?? {}), ...pd };
    // Jurnal syukur + amal + sesi zikir minggu lalu (untuk metrik laporan).
    st.journal = {
      ...(st.journal ?? {}),
      "2026-11-02": { date: "2026-11-02", items: ["Sehat", "Keluarga", "Rezeki"], savedAt: "2026-11-02T20:00:00+07:00" },
      "2026-11-04": { date: "2026-11-04", items: ["Hujan", "Kopi", "Istirahat"], savedAt: "2026-11-04T20:00:00+07:00" },
      "2026-11-06": { date: "2026-11-06", items: ["Jumat berkah", "Teman", "Waktu"], savedAt: "2026-11-06T20:00:00+07:00" },
      "2026-11-08": { date: "2026-11-08", items: ["Malam tenang", "Bacaan", "Doa"], savedAt: "2026-11-08T20:00:00+07:00" },
    };
    st.amalEntries = [
      { id: "am-qa1", date: "2026-11-03", kind: "sedekah", title: "Sedekah subuh", savedAt: "2026-11-03T06:00:00+07:00" },
      { id: "am-qa2", date: "2026-11-05", kind: "membantu", title: "Bantu tetangga", savedAt: "2026-11-05T16:00:00+07:00" },
      { id: "am-qa3", date: "2026-11-08", kind: "berbagi-ilmu", title: "Bagi materi kajian", savedAt: "2026-11-08T10:00:00+07:00" },
    ];
    st.zikirSessions = [
      { id: "zk-qa1", date: "2026-11-03", count: 40, dhikr: "Subhanallah", slot: "harian", savedAt: "2026-11-03T07:00:00+07:00" },
      { id: "zk-qa2", date: "2026-11-05", count: 60, dhikr: "Alhamdulillah", slot: "pagi", savedAt: "2026-11-05T07:00:00+07:00" },
      { id: "zk-qa3", date: "2026-11-08", count: 45, dhikr: "Astaghfirullah", slot: "petang", savedAt: "2026-11-08T18:00:00+07:00" },
    ];
    st.settings = {
      ...(st.settings ?? {}),
      theme: "dark",
      name: "QA Refleksi",
      fullscreenReminder: true,
      reminderNotify: false,
      // Jadwal manual realistis (tanpa geo → resolvePrayerSchedule memakai manual).
      reminderTimes: {
        subuh: { enabled: true, time: "04:20" },
        zuhur: { enabled: true, time: "11:58" },
        asar: { enabled: true, time: "15:16" },
        magrib: { enabled: true, time: "17:54" },
        isya: { enabled: true, time: "19:06" },
      },
    };
    st.weeklyReflections = {};
    st.reflectionViewed = {};
    st.reminderShown = {};
    localStorage.setItem(KEY, JSON.stringify(parsed));
    return "seeded-week: logs=" + Object.keys(st.logs).length + " pd=" + Object.keys(st.prayerDetails).length;
  }

  if (phase === "reminder") {
    // Jadwal manual: subuh 00:01 → saat uji kapan pun, salat "berjalan" = Subuh.
    st.settings = {
      ...(st.settings ?? {}),
      fullscreenReminder: true,
      reminderShown: {},
      reminderTimes: {
        ...(st.settings?.reminderTimes ?? {}),
        subuh: { enabled: true, time: "00:01" },
        zuhur: { enabled: true, time: "23:58" },
      },
    };
    localStorage.setItem(KEY, JSON.stringify(parsed));
    return "seeded-reminder: subuh=00:01 zuhur=23:58";
  }

  if (phase === "theme") {
    st.settings = { ...(st.settings ?? {}), theme: (st.settings?.theme === "dark" ? "light" : "dark") };
    localStorage.setItem(KEY, JSON.stringify(parsed));
    return "theme=" + st.settings.theme;
  }

  if (phase === "reminderOff") {
    st.settings = { ...(st.settings ?? {}), fullscreenReminder: false, reminderShown: {} };
    localStorage.setItem(KEY, JSON.stringify(parsed));
    return "reminder off";
  }
  return "unknown phase";
})();
