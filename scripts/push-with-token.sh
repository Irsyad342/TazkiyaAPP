#!/bin/bash
# SUIO — push main ke GitHub + pantau deploy otomatis Vercel.
#
# Token TIDAK disimpan ke disk: kirim lewat env var saat menjalankan.
#   GIT_TOKEN=<token> bash scripts/push-with-token.sh
#
# Vercel men-deploy otomatis dari GitHub (alur yang sama dengan
# scripts/deploy-nur.sh); skrip ini menunggu chunk baru muncul di
# https://tazkiyaapp.vercel.app lalu melaporkan status produksi.
set -euo pipefail
cd /home/z/my-project

: "${GIT_TOKEN:?Gunakan: GIT_TOKEN=<token> bash scripts/push-with-token.sh}"
REMOTE="https://irsyadrpasha:${GIT_TOKEN}@github.com/Irsyad342/TazkiyaAPP.git"

echo "=== PUSH main -> origin (2 commit: 3.12 + 3.13) ==="
git push "$REMOTE" main:main 2>&1 | sed -E 's/irsyadrpasha:[^@[:space:]]*@/***@/g'
NEW=$(git ls-remote "$REMOTE" refs/heads/main 2>/dev/null | cut -c1-8)
echo "PUSH OK — origin/main sekarang: $NEW"

echo "=== Polling deploy https://tazkiyaapp.vercel.app ==="
old=$(curl -s https://tazkiyaapp.vercel.app/ | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u | head -1 || true)
echo "chunk produksi lama: ${old:-?}"
for i in $(seq 1 30); do
  sleep 10
  code=$(curl -s -o /dev/null -w '%{http_code}' https://tazkiyaapp.vercel.app/)
  now=$(curl -s https://tazkiyaapp.vercel.app/ | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u | head -1)
  if [ -n "$now" ] && [ "$now" != "$old" ] && [ "$code" = "200" ]; then
    echo "DEPLOY BARU TERDETEKSI: chunk $now (HTTP $code) setelah ±${i}0 dtk — produksi SUIO 3.13 hidup."
    exit 0
  fi
  echo "poll $i: HTTP $code (chunk belum berubah)"
done
echo "Belum ada chunk baru dalam 5 menit — cek dashboard Vercel (build mungkin lebih lama)."
exit 1
