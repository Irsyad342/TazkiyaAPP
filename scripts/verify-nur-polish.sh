#!/bin/bash
# Uji lokal Task penyempurnaan navigasi/beranda (12 poin verifikasi).
set -e
cd /home/z/my-project
PORT=3000
B="agent-browser"
mkdir -p /tmp/render

# ---- server ----
if ! curl -s -o /dev/null "http://localhost:$PORT"; then
  nohup bun run start -- -p $PORT > /tmp/taz-server.log 2>&1 &
  for i in $(seq 1 30); do sleep 1; curl -s -o /dev/null "http://localhost:$PORT" && break; done
fi
echo "server: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT)"

$B set viewport 420 860
$B open "http://localhost:$PORT" --wait networkidle >/dev/null 2>&1

# ---- seed data uji (bukan produksi) + profil minimal ----
$B eval "
(() => {
  const KEY = 'tazkiya-store-v1';
  const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
  const st = parsed.state ?? (parsed.state = {});
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const today = new Date(); const T = keyOf(today);
  const dMinus = (n) => keyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate()-n));
  const iso = (k, h) => k+'T'+pad(h)+':00:00+07:00';
  st.settings = Object.assign({}, st.settings, { name: 'Ahmad', theme: 'dark' });
  st.logs = Object.assign({}, st.logs, { [T]: { prayers: { subuh: true }, quranPages: 1, zikirCount: 33 } });
  st.qadaRecords = [
    { id: 'qd-seed-1', prayer: 'isya', missedDate: dMinus(2), createdAt: iso(dMinus(2), 9), note: 'tertidur' },
    { id: 'qd-seed-2', prayer: 'subuh', missedDate: dMinus(3), createdAt: iso(dMinus(3), 9) },
    { id: 'qd-seed-3', prayer: 'isya', missedDate: dMinus(6), createdAt: iso(dMinus(6), 9), completedAt: iso(dMinus(4), 20) },
  ];
  st.journal = { [dMinus(1)]: { date: dMinus(1), items: ['Sehat','Keluarga','Pekerjaan'], mood: 'bersyukur', savedAt: iso(dMinus(1), 21) } };
  st.moods = { [dMinus(1)]: { mood: 'tenang', savedAt: iso(dMinus(1), 21) } };
  st.amalEntries = [ { id: 'am-1', date: dMinus(1), kind: 'sedekah', title: 'Sedekah masjid', savedAt: iso(dMinus(1), 10) } ];
  st.zikirSessions = [ { id: 'zk-1', date: dMinus(1), count: 100, dhikr: 'Subhanallah', slot: 'pagi', savedAt: iso(dMinus(1), 6) } ];
  localStorage.setItem(KEY, JSON.stringify(parsed));
  return 'seeded ' + T;
})()"

$B reload --wait networkidle >/dev/null 2>&1
sleep 1.2

echo "== [1-3] Navigasi =="
$B eval "
(() => {
  const labels = [...document.querySelectorAll('nav[aria-label=\"Navigasi utama\"] button')].map(b => b.textContent.trim());
  return JSON.stringify({ labels, adaLainnya: labels.some(l => l === 'Lainnya'), jml: labels.length });
})()"

echo "== [6] Mood section hadir & besar =="
$B eval "
(() => {
  const sec = document.querySelector('section[aria-label=\"Mood check-in\"]');
  if (!sec) return 'TIDAK ADA';
  const r = sec.getBoundingClientRect();
  const radios = sec.querySelectorAll('[role=\"radio\"]').length;
  return JSON.stringify({ tinggi: Math.round(r.height), radio: radios, judul: sec.querySelector('h2')?.textContent });
})()"

echo "== [9] Data lama tampil (progres, highlight jurnal) =="
$B eval "
(() => {
  const prog = [...document.querySelectorAll('section')].find(s => s.ariaLabel === 'Progres ibadah hari ini')?.textContent ?? '';
  const jel = [...document.querySelectorAll('section')].find(s => s.ariaLabel === 'Jelajahi aktivitas')?.textContent ?? '';
  return JSON.stringify({
    salat: prog.includes('1/5'), quran: prog.includes('1 hlm'), zikir: prog.includes('33'),
    jurnalTertulis: jel.includes('Ditulis hari ini'), headerNama: document.body.textContent.includes('Ahmad'),
  });
})()"
$B screenshot /tmp/render/polish-dark-beranda.png

echo "== [7] Pilih mood → tersimpan =="
$B eval "
(() => {
  const r = [...document.querySelectorAll('[role=\"radio\"]')].find(x => x.getAttribute('aria-label') === 'Mood Bersyukur');
  r.click(); return 'klik bersyukur';
})()"
sleep 0.8
$B eval "
(() => {
  const st = JSON.parse(localStorage.getItem('tazkiya-store-v1')).state;
  const pad = (n) => String(n).padStart(2,'0');
  const T = new Date(); const key = T.getFullYear()+'-'+pad(T.getMonth()+1)+'-'+pad(T.getDate());
  const todayKeys = Object.keys(st.moods).filter(k => k === key);
  return JSON.stringify({ moodHariIni: st.moods[key]?.mood, entriHariIni: todayKeys.length });
})()"

echo "== [8] Ganti mood → menimpa, tidak ganda =="
$B eval "
(() => { const r = [...document.querySelectorAll('[role=\"radio\"]')].find(x => x.getAttribute('aria-label') === 'Mood Tenang'); r.click(); return 'klik tenang'; })()"
sleep 0.8
$B eval "
(() => {
  const st = JSON.parse(localStorage.getItem('tazkiya-store-v1')).state;
  const pad = (n) => String(n).padStart(2,'0');
  const T = new Date(); const key = T.getFullYear()+'-'+pad(T.getMonth()+1)+'-'+pad(T.getDate());
  const checked = [...document.querySelectorAll('[role=\"radio\"]')].filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.getAttribute('aria-label'));
  return JSON.stringify({ moodHariIni: st.moods[key]?.mood, totalMoodToday: Object.keys(st.moods).filter(k => k === key).length, terpilihDiUI: checked });
})()"

echo "== [8b] Reload → mood tampil kembali terpilih =="
$B reload --wait networkidle >/dev/null 2>&1
sleep 1.2
$B eval "
(() => {
  const checked = [...document.querySelectorAll('[role=\"radio\"]')].filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.getAttribute('aria-label'));
  const cta = [...document.querySelectorAll('button')].some(b => b.textContent.includes('Lanjut ke Jurnal Syukur'));
  return JSON.stringify({ terpilihSetelahReload: checked, ctaJurnal: cta });
})()"

echo "== [5] Highlight membuka halaman yang benar =="
for pasangan in "Jurnal Syukur:Jurnal Syukur" "Zikir & Doa:Zikir & Doa" "Rizq & Amal:Rizq & Amal"; do
  tujuan="${pasangan%%:*}"; judul="${pasangan##*:}"
  $B eval "
    (() => { const b = [...document.querySelectorAll('section[aria-label=\"Jelajahi aktivitas\"] button')].find(x => x.textContent.includes('$tujuan')); b.click(); return 'ok'; })()"
  sleep 1.2
  echo "  $tujuan → h1: $($B eval "document.querySelector('h1')?.textContent ?? 'TIDAK ADA'")"
  $B eval "(() => { const b=[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label')?.includes('Kembali')); b?.click(); return 'back'; })()" >/dev/null
  sleep 1
done

echo "== [2] Tab Profil membuka halaman Profil =="
$B eval "
  (() => { const b=[...document.querySelectorAll('nav button')].find(x => x.textContent.includes('Profil')); b.click(); return 'ok'; })()"
sleep 1.5
$B eval "
  (() => JSON.stringify({ h1: document.querySelector('h1')?.textContent, adaTargetIbadah: document.body.textContent.includes('Target Ibadah') }))()"
$B screenshot /tmp/render/polish-dark-profil.png

echo "== [10] Tema terang =="
$B eval "
  (() => { const st = JSON.parse(localStorage.getItem('tazkiya-store-v1')); st.state.settings.theme = 'light'; localStorage.setItem('tazkiya-store-v1', JSON.stringify(st)); return 'ok'; })()"
$B reload --wait networkidle >/dev/null 2>&1
sleep 1.5
$B screenshot /tmp/render/polish-light-beranda.png
$B eval "document.documentElement.dataset.theme"

echo "== [11] Layar 360px tanpa overflow =="
$B set viewport 360 740
sleep 0.8
$B eval "
  (() => JSON.stringify({ docW: document.documentElement.scrollWidth, winW: window.innerWidth }))()"
$B screenshot /tmp/render/polish-360.png
echo SELESAI
