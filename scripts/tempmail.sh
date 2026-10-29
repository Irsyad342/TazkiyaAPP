#!/usr/bin/env bash
# Buat inbox sementara via mail.tm dan simpan kredensialnya.
# Pemakaian: bash scripts/tempmail.sh   (idempoten: memakai inbox lama bila ada)
set -euo pipefail
API="https://api.mail.tm"
STATE="/home/z/my-project/scripts/.tempmail.json"

req() { # req METHOD PATH [JSON] -> tulis body ke /tmp/tm_last.json, cetak kode
  local M=$1 P=$2 D=${3:-}
  for i in 1 2 3 4 5 6 7 8; do
    if [ -n "$D" ]; then
      C=$(curl -s -o /tmp/tm_last.json -w "%{http_code}" --max-time 20 -X "$M" "$API$P" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: Bearer $AUTH"} -d "$D")
    else
      C=$(curl -s -o /tmp/tm_last.json -w "%{http_code}" --max-time 20 -X "$M" "$API$P" ${AUTH:+-H "Authorization: Bearer $AUTH"})
    fi
    [ "$C" != "429" ] && { echo "$C"; return 0; }
    echo "  429 pada $M $P — tunggu…"; sleep 8
  done
  echo "$C"
}

if [ -f "$STATE" ]; then
  echo "Inbox sudah ada: $(python3 -c "import json;print(json.load(open('$STATE'))['address'])")"
  exit 0
fi

DOMAIN=$(curl -s --max-time 20 "$API/domains?page=1" | python3 -c "import sys,json; print(json.load(sys.stdin)['hydra:member'][0]['domain'])")
RAND=$(python3 -c "import random,string; print('tazkiya.'+''.join(random.choices(string.ascii_lowercase+string.digits,k=10)))")
ADDR="${RAND}@${DOMAIN}"
PASS=$(python3 -c "import secrets,string; print(secrets.token_urlsafe(16))")

C=$(req POST /accounts "{\"address\":\"$ADDR\",\"password\":\"$PASS\"}")
echo "create account: HTTP $C"
[ "$C" = "201" ] || { cat /tmp/tm_last.json; exit 1; }

# simpan kredensial SEKARANG (token menyusul) agar tidak pernah hilang
python3 - "$ADDR" "$PASS" <<'PY'
import json, sys
json.dump({"address": sys.argv[1], "password": sys.argv[2], "token": ""},
          open("/home/z/my-project/scripts/.tempmail.json","w"))
print("address:", sys.argv[1])
PY

TOKEN=""
for i in 1 2 3 4 5 6; do
  sleep 4
  C=$(req POST /token "{\"address\":\"$ADDR\",\"password\":\"$PASS\"}")
  echo "token coba $i: HTTP $C"
  if [ "$C" = "200" ]; then
    TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tm_last.json'))['token'])" 2>/dev/null || true)
    [ -n "$TOKEN" ] && break
  fi
done
[ -n "$TOKEN" ] || { echo "GAGAL dapat token — kredensial tetap tersimpan, jalankan ulang skrip"; exit 1; }

python3 - "$ADDR" "$PASS" "$TOKEN" <<'PY'
import json, sys
json.dump({"address": sys.argv[1], "password": sys.argv[2], "token": sys.argv[3]},
          open("/home/z/my-project/scripts/.tempmail.json","w"))
print("address:", sys.argv[1])
PY
echo "OK — tersimpan di scripts/.tempmail.json"
