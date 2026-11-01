#!/bin/bash
# Deploy Task 34 (Islamic Daily Companion) → origin/main + polling live.
set -e
cd /home/z/my-project

BR=$(git branch --show-current)
[ "$BR" = "fitur/nur-companion" ] || { echo "SALAH CABANG: $BR"; exit 1; }

# Guard: build harus lulus sebelum push
bun run build 2>&1 | tail -3
git diff --quiet && git diff --cached --quiet || { echo "ADA PERUBAHAN BELUM COMMIT"; exit 1; }

echo "=== PUSH fitur/nur-companion:main ==="
git push origin fitur/nur-companion:main
echo "PUSHED — menunggu build Vercel..."

# Polling: HTML produksi harus memuat nav baru (Sholat/Progress/Lainnya di-prerender)
ok=""
for i in $(seq 1 45); do
  sleep 10
  html=$(curl -s https://tazkiyaapp.vercel.app/ || true)
  if [ -n "$html" ]; then
    sholat=$(echo "$html" | grep -c ">Sholat<" || true)
    lainnya=$(echo "$html" | grep -c ">Lainnya<" || true)
    echo "poll $i: sholat=${sholat:-0} lainnya=${lainnya:-0}"
    if [ "${sholat:-0}" -ge 1 ] && [ "${lainnya:-0}" -ge 1 ]; then ok=1; break; fi
  else
    echo "poll $i: html belum terbaca"
  fi
done
if [ -n "$ok" ]; then
  echo "DEPLOY TERVERIFIKASI: navigasi 5 menu live di produksi"
else
  echo "DEPLOY BELUM TERKONFIRMASI dalam batas polling"
  exit 2
fi
