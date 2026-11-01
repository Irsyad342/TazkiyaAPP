#!/bin/bash
# Cek cepat kartu Next Prayer di kedua tema setelah perbaikan kontras.
set -e
cd /home/z/my-project

# Pola berkarakter-kelas agar tidak mengenai cmdline shell sendiri.
pkill -f "standalone/server[.]js" 2>/dev/null || true
sleep 1

nohup bun run start > /tmp/next-start.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
code=000
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "server:$code"
[ "$code" = "200" ] || { tail -20 /tmp/next-start.log; exit 1; }

agent-browser set viewport 420 860
agent-browser open http://localhost:3000 --wait networkidle >/dev/null 2>&1
agent-browser eval "(() => { const raw=localStorage.getItem('tazkiya-store-v1'); const p=raw?JSON.parse(raw):{state:{}}; p.state=p.state||{}; p.state.logs=p.state.logs||{}; p.state.settings=Object.assign({name:'Irsyad',zikirTarget:100,quranDailyTarget:5},p.state.settings,{theme:'light'}); localStorage.setItem('tazkiya-store-v1',JSON.stringify(p)); return 'light-set'; })()"
agent-browser open http://localhost:3000 --wait networkidle >/dev/null 2>&1
sleep 1
agent-browser screenshot /tmp/render/nur-beranda-light-v2.png
agent-browser eval "var p=JSON.parse(localStorage.getItem('tazkiya-store-v1')); p.state.settings.theme='dark'; localStorage.setItem('tazkiya-store-v1', JSON.stringify(p)); 'dark-set'"
agent-browser open http://localhost:3000 --wait networkidle >/dev/null 2>&1
sleep 1
agent-browser screenshot /tmp/render/nur-beranda-dark-v2.png
echo selesai
ls -la /tmp/render/ | grep v2 || true
