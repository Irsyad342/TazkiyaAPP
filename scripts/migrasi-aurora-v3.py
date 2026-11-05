#!/usr/bin/env python3
"""Migrasi warna Fresh Green (Task 37) → Aurora Pastel (v3).
Mengganti gradien/aksen hijau hardcode menjadi gradien aurora ungu→biru
di seluruh src/ — hanya kelas Tailwind & warna literaldy, tanpa menyentuh
logika. Shadow rgba(22,163,74,*) (hijau) → rgba(108,92,231,*) (ungu)."""
import re
from pathlib import Path

SRC = Path("/home/z/my-project/src")

# (pola_lama, pengganti) — urutan penting (spesifik dulu)
RULES = [
    ("from-[#4ade80] to-[#16a34a]", "from-[#8b7cf8] to-[#5b8def]"),
    ("from-[#4ade80] via-[#22c55e] to-[#16a34a]", "from-[#8b7cf8] via-[#6c5ce7] to-[#5b8def]"),
    ("via-[#22c55e]", "via-[#6c5ce7]"),
    ("from-[#16a34a] to-[#4ade80]", "from-[#6c5ce7] to-[#9b8cfa]"),
    ("to-[#4ade80]", "to-[#9b8cfa]"),
    ("from-[#16a34a]", "from-[#6c5ce7]"),
    ("bg-[#16a34a]", "bg-[#6c5ce7]"),
    ("hover:bg-[#15803d]", "hover:bg-[#5b4ad6]"),
    ("rgba(22,163,74,", "rgba(108,92,231,"),
    ("#C7F464", "#CFF05C"),
    ("#c7f464", "#cff05c"),
    ("#a3d94a", "#b9e04a"),
    ("#b7e55c", "#cff05c"),
    ("rgba(163,217,74,", "rgba(184,224,74,"),
    ("#4263eb", "#5b8def"),
    ("#7c86ff", "#8fa7ff"),
    ("#aeb6ff", "#aebcff"),
    ("#3b55d6", "#3d63c2"),
    # swatch tema gelap Profil → navy v3
    ('linear-gradient(140deg,#12211b,#0b1512)', 'linear-gradient(140deg,#1c1e3a,#13142b)'),
    ('linear-gradient(115deg,#12211b 50%,#f8fafc 50%)', 'linear-gradient(115deg,#1c1e3a 50%,#f4f2fb 50%)'),
    ('dot: "#4ADE80"', 'dot: "#9B8CFA"'),
    ('dot: "#7CD992"', 'dot: "#A79BF5"'),
    ("#f8fafc", "#f4f2fb"),
    ("#F8FAFC", "#F4F2FB"),
    ("light:text-[#16a34a]", "light:text-[#6c5ce7]"),
    # teks hijau tua di atas chip lime → navy v3
    ("#1d3a10", "#23244d"),
    ("#e9ffd4", "#eef7c8"),
]

changed = 0
for path in SRC.rglob("*.tsx"):
    text = path.read_text()
    original = text
    for old, new in RULES:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed += 1
        print(f"✓ {path.relative_to(SRC.parent)}")
print(f"\n{changed} file diubah")
