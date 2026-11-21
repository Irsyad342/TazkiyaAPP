#!/bin/bash
# Validasi kandidat token GitHub dari log sesi — TANPA mencetak nilai token.
# Output hanya: prefix, HTTP code, login pemilik, izin push repo TazkiyaAPP.
set -u
CAND=/tmp/gh_candidates.txt
VALID=/tmp/gh_valid.txt
: > "$CAND"; : > "$VALID"

for f in /home/z/.zcode/cli/rollout/*.jsonl /home/z/.zcode/cli/db/db.sqlite-wal /home/z/.zcode/cli/db/db.sqlite; do
  [ -f "$f" ] || continue
  grep -aohE 'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}' "$f" 2>/dev/null >> "$CAND"
done
sort -u "$CAND" -o "$CAND"
echo "kandidat unik: $(wc -l < "$CAND")"

while IFS= read -r t; do
  [ -z "$t" ] && continue
  code=$(curl -s -o /tmp/gh_body.json -w '%{http_code}' -H "Authorization: Bearer $t" https://api.github.com/user)
  login=$(grep -o '"login": *"[^"]*"' /tmp/gh_body.json 2>/dev/null | head -1 | cut -d'"' -f4)
  echo "token ${t:0:4}...: HTTP $code login=${login:-?}"
  if [ "$code" = "200" ] && [ "$login" = "irsyadrpasha" ]; then
    curl -s -H "Authorization: Bearer $t" https://api.github.com/repos/Irsyad342/TazkiyaAPP > /tmp/gh_repo.json
    python3 -c '
import json
d = json.load(open("/tmp/gh_repo.json"))
p = d.get("permissions", {})
print("   repo:", d.get("full_name"), "| push:", p.get("push"), "| private:", d.get("private"))
' 
    if grep -q '"push": *true' /tmp/gh_repo.json; then
      echo "$t" >> "$VALID"
      echo "   -> VALID dengan izin PUSH, disimpan ke daftar kandidat push"
    fi
  fi
done < "$CAND"
rm -f /tmp/gh_body.json /tmp/gh_repo.json
echo "token valid utk push: $(wc -l < "$VALID")"
