#!/bin/bash
# Verifikasi visual Task 33 — kartu ringkasan Statistik gaya Iconiy (dark + light).
set -e
cd /home/z/my-project
mkdir -p /tmp/render

# 1) Server produksi
nohup bun run start > /tmp/next-start.log 2>&1 &
SRV=$!
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "server: $code"

SEED="$(sed -n '2,$p' scripts/seed-today-focus.js)"

# 2) Dark 420px
agent-browser set viewport 420 860
agent-browser open http://localhost:3000 --wait networkidle
agent-browser eval "$SEED"
agent-browser open http://localhost:3000 --wait networkidle
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('Statistik')); if(b){b.click(); return 'klik-ok';} return 'tombol-tidak-ada'; })()"
sleep 1.2
agent-browser eval "document.querySelector('h1')?.textContent"
agent-browser screenshot /tmp/render/stats-dark-420.png

# 3) Light 420px (ganti tema tanpa ganti data)
agent-browser eval "var p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); p.state.settings.theme='light'; localStorage.setItem('tazkiya-store-v1', JSON.stringify(p)); 'light-set'"
agent-browser open http://localhost:3000 --wait networkidle
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('Statistik')); if(b){b.click(); return 'klik-ok';} return 'tombol-tidak-ada'; })()"
sleep 1.2
agent-browser screenshot /tmp/render/stats-light-420.png

# 4) Ujian sempit 360px kedua tema
agent-browser set viewport 360 740
agent-browser eval "var p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); p.state.settings.theme='dark'; localStorage.setItem('tazkiya-store-v1', JSON.stringify(p)); 'dark-set'"
agent-browser open http://localhost:3000 --wait networkidle
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('Statistik')); if(b){b.click(); return 'klik-ok';} return 'tombol-tidak-ada'; })()"
sleep 1.2
agent-browser eval "'scrollX='+window.scrollX"
agent-browser screenshot /tmp/render/stats-dark-360.png
agent-browser eval "var p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); p.state.settings.theme='light'; localStorage.setItem('tazkiya-store-v1', JSON.stringify(p)); 'light-set'"
agent-browser open http://localhost:3000 --wait networkidle
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('Statistik')); if(b){b.click(); return 'klik-ok';} return 'tombol-tidak-ada'; })()"
sleep 1.2
agent-browser screenshot /tmp/render/stats-light-360.png

# 5) Beres-beres
agent-browser storage local clear >/dev/null 2>&1 || true
agent-browser close >/dev/null 2>&1 || true
kill $SRV 2>/dev/null || true
echo "selesai"; ls -la /tmp/render/
