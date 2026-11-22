#!/usr/bin/env python3
"""QuranPage v2.1: Jelajah lime→glass ivory, nama Arab surah → teks utama,
octagram lebih halus. Hanya menyentuh pola yang ditarget."""

P = "/home/z/my-project/src/components/tazkiya/QuranPage.tsx"
s = open(P).read()
n0 = len(s)

# 1) Container Jelajah: soft-lime → glass polos (putih/ivory lembut per tema)
old = '<GlassCard className="tk-surf-soft-lime p-4 sm:p-5">'
new = '<GlassCard className="p-4 sm:p-5">'
assert s.count(old) == 1, f"jelajah: {s.count(old)}"
s = s.replace(old, new)

# 2) Nama Arab surah → warna teks utama (spec: Deep Navy / ink)
import re
pat = re.compile(r'(quran-arabic[^"]*?)text-tk-violet( dark:text-tk-accent)?')
s, n_ar = pat.subn(lambda m: m.group(1) + "text-tk-ink", s)

# 3) Octagram ornamen lebih halus (nomor tetap accent turquoise/cyan)
pairs = [
    ('isLastRead ? "bg-tk-violet" : "bg-tk-lav-deco"', 'isLastRead ? "bg-tk-violet" : "bg-tk-lav-deco/70"', 2),
    ('isLastRead ? "bg-tk-violet" : "bg-tk-lavender"', 'isLastRead ? "bg-tk-violet" : "bg-tk-lavender/85"', 2),
    ('tk-octagram absolute inset-0 bg-tk-lav-deco', 'tk-octagram absolute inset-0 bg-tk-lav-deco/70', 1),
    ('tk-octagram absolute inset-[1.5px] bg-tk-lavender', 'tk-octagram absolute inset-[1.5px] bg-tk-lavender/85', 1),
]
for old, new, want in pairs:
    c = s.count(old)
    assert c == want, f"{old[:44]}...: {c} != {want}"
    s = s.replace(old, new)

open(P, "w").write(s)
print(f"OK — jelajah 1, nama Arab {n_ar}, octagram 5")
