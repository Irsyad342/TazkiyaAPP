#!/usr/bin/env bash
# Test logika slot Jumat: bundle TS kecil dengan esbuild lalu jalankan node.
set -e
cd "$(dirname "$0")/.."
npx esbuild scripts/test-friday-slots.mjs --bundle --platform=node --format=esm --outfile=/tmp/friday-test.mjs --log-level=error
node /tmp/friday-test.mjs
