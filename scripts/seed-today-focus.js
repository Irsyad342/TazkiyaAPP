// Seed data uji HARI INI untuk verifikasi kartu Fokus Ibadah + statistik baru.
// Jalankan via agent-browser eval.
(() => {
  const KEY = "tazkiya-store-v1";
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  const st = parsed.state ?? (parsed.state = {});
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const done = (kind) => ({ status: "done", kind, savedAt: key + "T08:00:00+07:00" });
  const miss = (reason) => ({ status: "missed", reason, savedAt: key + "T08:00:00+07:00" });
  st.logs = {
    ...(st.logs ?? {}),
    [key]: {
      date: key,
      prayers: { subuh: true, zuhur: true, asar: false, magrib: false, isya: false },
      extras: { duha: true, tahajud: false, puasa: false, sedekah: false },
      quranPages: 2,
      quranVerses: 5,
      zikirCount: 20,
    },
  };
  st.prayerDetails = {
    ...(st.prayerDetails ?? {}),
    [key]: { subuh: done("berjamaah"), zuhur: done("mandiri"), asar: miss("terlewat") },
  };
  st.settings = { ...(st.settings ?? {}), theme: "dark" };
  localStorage.setItem(KEY, JSON.stringify(parsed));
  return "seeded " + key + ": 2 done + 1 missed, quran 2hlm, zikir 20";
})()
