#!/usr/bin/env python3
"""Validasi kontras WCAG pasangan warna baru Electric Dream."""
def lum(hexc):
    hexc = hexc.lstrip('#')
    r, g, b = (int(hexc[i:i+2], 16)/255 for i in (0, 2, 4))
    f = lambda c: c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

pairs = [
    # --- LIGHT ---
    ("ink #252943", "#252943", "bg shell #f3f4fb", "#f3f4fb", 4.5),
    ("ink #252943", "#252943", "card putih", "#ffffff", 4.5),
    ("accent cyan-ink #0876b8", "#0876b8", "card putih", "#ffffff", 4.5),
    ("accent cyan-ink #0876b8", "#0876b8", "bg shell", "#f3f4fb", 4.5),
    ("violet #3a4efb", "#3a4efb", "card putih", "#ffffff", 4.5),
    ("violet #3a4efb", "#3a4efb", "lavender #e3e6f0", "#e3e6f0", 3.0),
    ("lime-ink #55600e", "#55600e", "lime tint #eef9a6", "#eef9a6", 4.5),
    ("lime-ink #55600e", "#55600e", "lime/50 di putih (~#f8fce0)", "#f8fce0", 4.5),
    ("putih di hero #3a4efb", "#ffffff", "hero-a #3a4efb", "#3a4efb", 3.0),
    ("amber #8a7a14", "#8a7a14", "card putih", "#ffffff", 4.5),
    # --- DARK ---
    ("ink #eef0fc", "#eef0fc", "navy canvas #1d2136", "#1d2136", 4.5),
    ("accent cyan #4cc4ff", "#4cc4ff", "navy canvas", "#1d2136", 4.5),
    ("accent cyan #4cc4ff", "#4cc4ff", "panel #2a2f4d", "#2a2f4d", 4.5),
    ("accent cyan #4cc4ff", "#4cc4ff", "popover #333a5e", "#333a5e", 4.5),
    ("violet #667dff", "#667dff", "navy canvas", "#1d2136", 4.5),
    ("violet #667dff", "#667dff", "panel #2a2f4d", "#2a2f4d", 3.0),
    ("lime neon #d9f24d", "#d9f24d", "navy canvas", "#1d2136", 4.5),
    ("lime-ink olive #353d0a", "#353d0a", "lime neon #d9f24d", "#d9f24d", 4.5),
    ("lime-ink olive #353d0a", "#353d0a", "lime/40 di navy (~#4a5230)", "#4a5230", 4.5),
    ("putih di primary #5b78ff", "#ffffff", "primary #5b78ff", "#5b78ff", 3.0),
    ("muted #b9bfdb", "#b9bfdb", "panel #2a2f4d", "#2a2f4d", 4.5),
    # --- identitas palet (acuan) ---
    ("cyan #33a4fa (dekoratif)", "#33a4fa", "card putih", "#ffffff", 0),
    ("cyan #33a4fa (dekoratif)", "#33a4fa", "navy canvas", "#1d2136", 0),
]
print(f"{'pasangan':44s} {'kontras':>8s}  {'target':>6s}  status")
for name, a, nb, b, t in pairs:
    r = cr(a, b)
    ok = "PASS" if (t == 0 or r >= t) else "GAGAL"
    print(f"{name:44s} {r:7.2f}:1  {t or '-':>6}  {ok}")
