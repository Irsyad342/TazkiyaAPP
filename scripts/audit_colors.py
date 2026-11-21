#!/usr/bin/env python3
"""SUIO — audit distribusi warna Electric Dream.
Hitung pemakaian tiap token --tk-* / kelas tk-* di TSX, temukan hardcode
biru/lime/cyan di TSX, dan petakan konsumsi token di globals.css."""
import re, os, collections, json

SRC = "/home/z/my-project/src"
HEX_BLUE = re.compile(r"#(?:3a4efb|2f3fd6|5b78ff|82aeff|7fa8ff|4f7cff|33a4fa|4cc?4ff|2563eb|1d4ed8)", re.I)
HEX_CYAN = re.compile(r"#(?:33a4fa|7fd8ff|4cc4ff|a9d4ff|d6f0ff|dcefff)", re.I)
HEX_LIME = re.compile(r"#(?:e3ff3b|d7e34a|c8d429|a8c300|8a7a14)", re.I)
RGB_BLUE = re.compile(r"rgba?\(\s*(?:58|91|47|79|130|127)\s*,")
TOKEN = re.compile(r"(?:var\(--|\b)(tk-[a-z0-9-]+)")

token_files = collections.defaultdict(set)
token_count = collections.Counter()
hex_blue = collections.defaultdict(list)   # file -> [(line, snippet)]
hex_cyan = collections.defaultdict(list)
hex_lime = collections.defaultdict(list)

for root, dirs, files in os.walk(SRC):
    for f in files:
        if not f.endswith((".tsx", ".ts")):
            continue
        p = os.path.join(root, f)
        rel = os.path.relpath(p, SRC)
        text = open(p, encoding="utf-8").read()
        for m in TOKEN.finditer(text):
            token_count[m.group(1)] += 1
            token_files[m.group(1)].add(rel)
        for i, line in enumerate(text.splitlines(), 1):
            if HEX_BLUE.search(line):
                hex_blue[rel].append((i, line.strip()[:150]))
            if HEX_CYAN.search(line):
                hex_cyan[rel].append((i, line.strip()[:150]))
            if HEX_LIME.search(line):
                hex_lime[rel].append((i, line.strip()[:150]))

print("=== PEMAKAIAN TOKEN tk-* DI TSX/TS (top) ===")
for t, c in token_count.most_common(40):
    fl = token_files[t]
    print(f"{t:24s} {c:4d}x  {len(fl):2d} file  -> {', '.join(sorted(list(fl))[:6])}{' …' if len(fl)>6 else ''}")

print("\n=== HARDCODE HEX BIRU di TSX/TS ===")
for rel, lines in sorted(hex_blue.items(), key=lambda kv: -len(kv[1])):
    print(f"{rel}: {len(lines)}x  contoh: {lines[0][1][:120]}")

print("\n=== HARDCODE HEX CYAN di TSX/TS ===")
for rel, lines in sorted(hex_cyan.items(), key=lambda kv: -len(kv[1])):
    print(f"{rel}: {len(lines)}x  contoh: {lines[0][1][:120]}")

print("\n=== HARDCODE HEX LIME di TSX/TS ===")
for rel, lines in sorted(hex_lime.items(), key=lambda kv: -len(kv[1])):
    print(f"{rel}: {len(lines)}x  contoh: {lines[0][1][:120]}")

print("\n=== PETA RGB-BIRU (58,91,47,79,130,127,...) di TSX/TS ===")
for root, dirs, files in os.walk(SRC):
    for f in files:
        if not f.endswith((".tsx", ".ts")):
            continue
        p = os.path.join(root, f)
        rel = os.path.relpath(p, SRC)
        n = 0
        for i, line in enumerate(open(p, encoding="utf-8"), 1):
            if RGB_BLUE.search(line):
                n += 1
                if n == 1:
                    print(f"{rel}: {i}: {line.strip()[:130]}")
        if n > 1:
            print(f"   … total {n}x di {rel}")
