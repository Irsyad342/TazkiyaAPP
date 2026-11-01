#!/bin/bash
# Verifikasi visual PRODUKSI Task 34 — Islamic Daily Companion live.
set -e
cd /home/z/my-project
mkdir -p /tmp/render

agent-browser set viewport 420 860
agent-browser open https://tazkiyaapp.vercel.app/ --wait networkidle >/dev/null 2>&1
sleep 1.5
agent-browser screenshot /tmp/render/prod-nur-beranda.png
agent-browser eval "document.querySelectorAll('nav[aria-label=\"Navigasi utama\"] button').length + ' tombol nav | h1: ' + (document.querySelector('h1')?.textContent||'-')"

agent-browser eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Sholat')); if(!b) return 'nav-sholat-tidak-ada'; b.click(); return 'ok'; })()"
sleep 1.5
agent-browser screenshot /tmp/render/prod-nur-sholat.png
agent-browser eval "document.querySelector('h1')?.textContent + ' | tab: ' + [...document.querySelectorAll('[role=\"tab\"]')].map(t=>t.textContent).join('/')"

agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=\"tab\"]')].find(x=>x.textContent.trim()==='Qada'); b.click(); return 'ok'; })()"
sleep 1
agent-browser screenshot /tmp/render/prod-nur-qada.png

agent-browser eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Lainnya')); b.click(); return 'ok'; })()"
sleep 1.2
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Jurnal Syukur')); b.click(); return 'ok'; })()"
sleep 1.2
agent-browser screenshot /tmp/render/prod-nur-jurnal.png
agent-browser eval "document.querySelector('h1')?.textContent"

echo selesai
ls -la /tmp/render/prod-nur-*.png
