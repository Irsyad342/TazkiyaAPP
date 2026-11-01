// Seed data uji untuk fitur Islamic Daily Companion (VERIFIKASI LOKAL SAJA —
// bukan data produksi). Mengisi slice baru: qada, jurnal, mood, amal,
// sesi zikir, penanda target manual. Jalankan via agent-browser eval.
(() => {
  const KEY = "tazkiya-store-v1";
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  const st = parsed.state ?? (parsed.state = {});
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  const T = keyOf(today);
  const dMinus = (n) => keyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const iso = (dateKeyStr, h) => `${dateKeyStr}T${pad(h)}:00:00+07:00`;

  st.qadaRecords = [
    { id: "qd-seed-1", prayer: "isya", missedDate: dMinus(2), createdAt: iso(dMinus(2), 9), note: "tertidur" },
    { id: "qd-seed-2", prayer: "subuh", missedDate: dMinus(3), createdAt: iso(dMinus(3), 9) },
    {
      id: "qd-seed-3",
      prayer: "isya",
      missedDate: dMinus(6),
      createdAt: iso(dMinus(6), 9),
      completedAt: iso(dMinus(4), 20),
    },
  ];

  st.journal = {
    [dMinus(1)]: {
      date: dMinus(1),
      items: ["Sehat untuk beraktivitas", "Keluarga yang mendukung", "Pekerjaan selesai tepat waktu"],
      mood: "bersyukur",
      savedAt: iso(dMinus(1), 21),
    },
    [dMinus(3)]: {
      date: dMinus(3),
      items: ["Hujan yang menyejukkan", "Makan hangat bersama", "Doa subuh yang tenang"],
      mood: "tenang",
      savedAt: iso(dMinus(3), 21),
    },
  };

  st.moods = { [dMinus(1)]: { mood: "tenang", savedAt: iso(dMinus(1), 21) } };

  st.amalEntries = [
    { id: "am-seed-1", date: dMinus(1), kind: "sedekah", title: "Sedekah kotak amal masjid", savedAt: iso(dMinus(1), 10) },
    { id: "am-seed-2", date: dMinus(2), kind: "membantu", title: "Membantu tetangga mengangkat barang", savedAt: iso(dMinus(2), 16) },
    { id: "am-seed-3", date: dMinus(4), kind: "berbagi-ilmu", title: "Berbagi materi belajar ke grup", savedAt: iso(dMinus(4), 19) },
  ];

  st.zikirSessions = [
    { id: "zk-seed-1", date: dMinus(1), count: 100, dhikr: "Subhanallah", slot: "pagi", savedAt: iso(dMinus(1), 6) },
    { id: "zk-seed-2", date: dMinus(2), count: 33, dhikr: "Astaghfirullah", slot: "petang", savedAt: iso(dMinus(2), 18) },
  ];

  st.goalDone = { [dMinus(1)]: ["g-amal"] };

  localStorage.setItem(KEY, JSON.stringify(parsed));
  return `seeded companion: qada=${st.qadaRecords.length}, jurnal=${Object.keys(st.journal).length}, amal=${st.amalEntries.length}, zikirSesi=${st.zikirSessions.length}, today=${T}`;
})()
