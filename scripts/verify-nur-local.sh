#!/bin/bash
# Verifikasi visual + fungsional lokal — Islamic Daily Companion (Task 34).
# Server + semua langkah browser dijalankan DALAM SATU proses (proses latar
# mati antar-panggilan Bash). Screenshot ke /tmp/render/nur-*.
set -e
cd /home/z/my-project
mkdir -p /tmp/render

# 0) Bersihkan screenshot lama
rm -f /tmp/render/nur-*.png

# 1) Server produksi lokal — pastikan port 3000 bersih dari server liar
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 1
nohup bun run start > /tmp/next-start.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
code=000
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "server: $code"
[ "$code" = "200" ] || { echo "SERVER GAGAL"; tail -20 /tmp/next-start.log; exit 1; }

SEEDW="$(sed -n '2,$p' scripts/seed-prod-week.js)"
SEEDT="$(sed -n '2,$p' scripts/seed-today-focus.js)"
SEEDN="$(sed -n '2,$p' scripts/seed-nur-companion.js)"

agent-browser set viewport 420 860
agent-browser open http://localhost:3000 --wait networkidle
agent-browser eval "$SEEDW"
agent-browser eval "$SEEDT"
agent-browser eval "$SEEDN"
agent-browser open http://localhost:3000 --wait networkidle
sleep 1

echo "=== NAV: jumlah tombol bottom nav ==="
agent-browser eval "document.querySelectorAll('nav[aria-label=\"Navigasi utama\"] button').length"

echo "=== BERANDA (dark) ==="
agent-browser screenshot /tmp/render/nur-beranda-dark.png
agent-browser eval "document.querySelector('h1')?.textContent"

echo "=== SHOLAT ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Sholat')); b.click(); return 'ok'; })()"
sleep 1.2
agent-browser screenshot /tmp/render/nur-sholat-dark.png
agent-browser eval "document.querySelector('h1')?.textContent + ' | baris salat: ' + document.querySelectorAll('[aria-label^=\"Catat\"]').length"

# Pencatatan: buka dialog, tandai Subuh berjamaah, simpan
echo "=== CATAT SUBUH (dialog) ==="
agent-browser eval "(() => { const r=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')?.startsWith('Catat Subuh')); r.click(); return 'ok'; })()"
sleep 0.8
agent-browser screenshot /tmp/render/nur-dialog-catat.png
agent-browser eval "(() => { const all=[...document.querySelectorAll('button')]; const b=all.find(x=>x.textContent.includes('Sudah dilaksanakan')); b?.click(); return b?'status-ok':'gagal'; })()"
sleep 0.4
agent-browser eval "(() => { const all=[...document.querySelectorAll('[role=\"dialog\"] button')]; const b=all.find(x=>x.textContent.includes('Berjamaah')&&x.textContent.includes('masjid')); b?.click(); return b?'jamaah-ok':'pilih-lain'; })()"
sleep 0.4
agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=\"dialog\"] button')].find(x=>x.textContent.trim()==='Simpan'); b?.click(); return b?'simpan-ok':'gagal'; })()"
sleep 1
agent-browser eval "(() => { const p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); const k=Object.keys(p.state.prayerDetails||{}); return 'prayerDetails dates: '+k.join(','); })()"
agent-browser eval "(() => { const d=document.querySelector('[role=\"dialog\"]'); return d?'dialog-masih-terbuka':'dialog-tertutup'; })()"
agent-browser screenshot /tmp/render/nur-sholat-setelah-catat.png

# Tutup popup motivasi bila terbuka
agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=\"dialog\"] button')].find(x=>['Alhamdulillah','Lanjutkan','MasyaAllah'].includes(x.textContent.trim())); if(b){b.click(); return 'popup-ditutup';} return 'tidak-ada-popup'; })()"
sleep 0.5

echo "=== TAB QADA ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=\"tab\"]')].find(x=>x.textContent.trim()==='Qada'); b.click(); return 'ok'; })()"
sleep 0.8
agent-browser screenshot /tmp/render/nur-qada-dark.png
agent-browser eval "(() => { const p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); return 'qada pending: '+(p.state.qadaRecords||[]).filter(q=>!q.completedAt).length; })()"

# Tambah qada manual
agent-browser eval "(() => { const s=document.querySelector('#qada-prayer'); if(!s) return 'form-tidak-ada'; s.value='magrib'; s.dispatchEvent(new Event('change',{bubbles:true})); const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Tambah ke Daftar Qada')); b.click(); return 'tambah-ok'; })()"
sleep 0.6
agent-browser eval "(() => { const p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); return 'qada total: '+(p.state.qadaRecords||[]).length; })()"

echo "=== PROGRESS ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Progress')); b.click(); return 'ok'; })()"
sleep 1.2
agent-browser screenshot /tmp/render/nur-progress-dark.png
agent-browser eval "document.querySelector('h1')?.textContent"

echo "=== LAINNYA ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Lainnya')); b.click(); return 'ok'; })()"
sleep 1
agent-browser screenshot /tmp/render/nur-lainnya-dark.png

echo "=== JURNAL SYUKUR ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Jurnal Syukur')); if(!b) return 'tombol-tidak-ada'; b.click(); return 'ok'; })()"
sleep 1
agent-browser screenshot /tmp/render/nur-jurnal-dark.png
agent-browser eval "document.querySelector('h1')?.textContent"
# isi 3 kolom + simpan
agent-browser eval "(() => { const inp=[...document.querySelectorAll('input[aria-label^=\"Hal \"]')]; inp[0].value='Kesehatan keluarga'; inp[0].dispatchEvent(new Event('input',{bubbles:true})); inp[1].value='Rezeki yang cukup hari ini'; inp[1].dispatchEvent(new Event('input',{bubbles:true})); inp[2].value='Bisa salat dengan tenang'; inp[2].dispatchEvent(new Event('input',{bubbles:true})); return 'isi-3-ok'; })()"
sleep 0.4
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Simpan Jurnal')); b.click(); return 'simpan-diklik'; })()"
sleep 0.8
agent-browser eval "(() => { const p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); const j=p.state.journal||{}; const today=Object.keys(j).sort().pop(); return 'journal terakhir: '+today+' mood='+(j[today]?.mood||'-')+' items='+(j[today]?.items?.filter(Boolean).length||0); })()"
# mood check-in: klik mood Tenang
agent-browser eval "(() => { const b=[...document.querySelectorAll('button[aria-label=\"Mood Tenang\"]')][0]; b.click(); return 'mood-diklik'; })()"
sleep 0.6
agent-browser eval "(() => { const p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); const n=Object.keys(p.state.moods||{}).length; return 'moods tersimpan: '+n; })()"

echo "=== ZIKIR & DOA ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Kembali'); b.click(); return 'kembali'; })()"
sleep 0.8
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Zikir & Doa')); b.click(); return 'ok'; })()"
sleep 1
agent-browser screenshot /tmp/render/nur-zikir-dark.png
# tab Doa
agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=\"tab\"]')].find(x=>x.textContent.trim()==='Doa'); b.click(); return 'ok'; })()"
sleep 0.8
agent-browser screenshot /tmp/render/nur-doa-dark.png

echo "=== RIZQ & AMAL ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Kembali'); b.click(); return 'kembali'; })()"
sleep 0.8
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Rizq & Amal')); b.click(); return 'ok'; })()"
sleep 1
agent-browser screenshot /tmp/render/nur-rizq-dark.png
# catat amal
agent-browser eval "(() => { const inp=document.querySelector('input[aria-label=\"Keterangan amal\"]'); inp.value='Sedekah subuh 10rb'; inp.dispatchEvent(new Event('input',{bubbles:true})); const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Simpan Catatan')); b.click(); return 'ok'; })()"
sleep 0.8
agent-browser eval "(() => { const p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); return 'amalEntries: '+(p.state.amalEntries||[]).length; })()"

echo "=== BERANDA LIGHT + ujian 360px ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Kembali'); b.click(); return 'kembali'; })()"
sleep 0.6
agent-browser eval "var p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); p.state.settings.theme='light'; localStorage.setItem('tazkiya-store-v1', JSON.stringify(p)); 'light-set'"
agent-browser open http://localhost:3000 --wait networkidle
sleep 1
agent-browser screenshot /tmp/render/nur-beranda-light.png

agent-browser set viewport 360 740
agent-browser open http://localhost:3000 --wait networkidle
sleep 1
agent-browser eval "'scrollX='+window.scrollX+' docW='+document.documentElement.scrollWidth+' winW='+window.innerWidth"
agent-browser screenshot /tmp/render/nur-beranda-light-360.png

echo "=== SELESAI ==="
ls -la /tmp/render/nur-*.png
