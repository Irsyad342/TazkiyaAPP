#!/bin/bash
# GitHub OAuth Device Flow memakai client_id resmi GitHub CLI (publik).
# Mode:
#   request  — minta device+user code, simpan device_code ke /tmp (tidak dicetak),
#              cetak user_code + verification_uri untuk ditampilkan ke user.
#   poll     — polling sampai user menyetujui; token disimpan /tmp/gh_valid_token
#              (chmod 600, tidak pernah dicetak). Verifikasi login harus irsyadrpasha.
set -u
CID="178c6fc778ccc68e1d6a"
TOK=/tmp/gh_valid_token
DEV=/tmp/gh_device_code

mode="${1:-request}"

if [ "$mode" = "request" ]; then
  rm -f "$TOK" "$DEV" /tmp/gh_dev.json
  curl -s -X POST -H "Accept: application/json" \
    -d "client_id=$CID&scope=repo" \
    https://github.com/login/device/code > /tmp/gh_dev.json
  python3 - <<'PY'
import json
d = json.load(open("/tmp/gh_dev.json"))
if "device_code" not in d:
    print("ERROR:", d); raise SystemExit(1)
open("/tmp/gh_device_code", "w").write(d["device_code"])
print("USER_CODE:", d["user_code"])
print("URI:", d["verification_uri"])
print("expires_in:", d.get("expires_in"), "s | interval:", d.get("interval"), "s")
PY
  chmod 600 "$DEV" 2>/dev/null
fi

if [ "$mode" = "poll" ]; then
  [ -f "$DEV" ] || { echo "tidak ada device_code — jalankan mode request dulu"; exit 3; }
  dc=$(cat "$DEV")
  for i in $(seq 1 52); do
    sleep 10
    res=$(curl -s -X POST -H "Accept: application/json" \
      -d "client_id=$CID&device_code=$dc&grant_type=urn:ietf:params:oauth:grant-type:device_code" \
      https://github.com/login/oauth/access_token)
    err=$(echo "$res" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("error",""))' 2>/dev/null || echo parse)
    if [ "$err" = "authorization_pending" ]; then
      [ $((i % 3)) -eq 0 ] && echo "poll $i: menunggu persetujuan user..."
      continue
    fi
    if [ "$err" = "slow_down" ]; then sleep 5; continue; fi
    if [ "$err" = "expired_token" ]; then echo "GAGAL: kode kedaluwarsa — jalankan ulang mode request"; exit 4; fi
    if [ "$err" = "access_denied" ]; then echo "GAGAL: persetujuan ditolak"; exit 5; fi
    tok=$(echo "$res" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null)
    if [ -n "$tok" ]; then
      login=$(curl -s -H "Authorization: Bearer $tok" https://api.github.com/user | python3 -c 'import json,sys; print(json.load(sys.stdin).get("login",""))')
      if [ "$login" = "irsyadrpasha" ]; then
        printf '%s' "$tok" > "$TOK"; chmod 600 "$TOK"
        echo "TOKEN OK — login=$login (disimpan /tmp/gh_valid_token, tidak dicetak)"
        exit 0
      else
        echo "GAGAL: yang menyetujui bukan irsyadrpasha (login=$login) — token dibuang"
        exit 6
      fi
    fi
    echo "poll $i: respons tak terduga (err=$err)"
  done
  echo "TIMEOUT: user belum menyetujui dalam 9 menit"
  exit 7
fi
