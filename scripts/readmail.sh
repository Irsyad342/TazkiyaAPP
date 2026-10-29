#!/usr/bin/env bash
# Baca inbox tempmail.lol: bash scripts/readmail.sh [jumlah_email]
set -euo pipefail
TOKEN=$(python3 -c "import json;print(json.load(open('/home/z/my-project/scripts/.tempmail.json'))['token'])")
curl -s --max-time 20 "https://api.tempmail.lol/v2/inbox?token=$TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ems = d.get('emails') or []
print('expired:', d.get('expired'), '| jumlah:', len(ems))
for e in ems[:int(sys.argv[1]) if len(sys.argv)>1 else 5]:
    print('='*60)
    print('dari  :', e.get('from'))
    print('subjek:', e.get('subject'))
    body = e.get('body') or e.get('html') or ''
    print(body[:3000])
" "${1:-5}"
