// Seed: jurnal kemarin + kembali ke Beranda, untuk uji konfirmasi hapus riwayat
(() => {
  const key = "tazkiya-store-v1";
  const s = JSON.parse(localStorage.getItem(key));
  const y = new Date(Date.now() - 86400000);
  const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  s.state.journal[yk] = { items: ["uji syukur a", "uji syukur b", ""], mood: "tenang", savedAt: `${yk}T10:00:00.000Z` };
  localStorage.setItem(key, JSON.stringify(s));
  return "SEEDED:" + yk;
})();
