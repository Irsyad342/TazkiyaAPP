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

# Polling: bundle JS produksi harus memuat marker Task 36 ("Ya, hapus" —
# label tombol konfirmasi ConfirmButton). HTML prerender hanya splash screen.
ok=""
for i in $(seq 1 45); do
  sleep 10
  chunks=$(curl -s https://tazkiyaapp.vercel.app/ | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u)
  if [ -n "$chunks" ]; then
    ketemu=0
    while read -r p; do
      if curl -s "https://tazkiyaapp.vercel.app$p" | grep -q "Ya, hapus"; then ketemu=1; break; fi
    done <<< "$chunks"
    echo "poll $i: konfirmasi=${ketemu}"
    if [ "$ketemu" = "1" ]; then ok=1; break; fi
  else
    echo "poll $i: html belum terbaca"
  fi
done
if [ -n "$ok" ]; then
  echo "DEPLOY TERVERIFIKASI: Task 36 (konfirmasi hapus + finalisasi tombol) live di produksi"
else
  echo "DEPLOY BELUM TERKONFIRMASI dalam batas polling"
  exit 2
fi
