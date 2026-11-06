#!/usr/bin/env python3
"""Generate seluruh aset ikon aplikasi SUIO dari logo versi LIGHT (permanen).

Output:
  public/icons/icon-192.png / icon-512.png          — tile membulat, sudut transparan (purpose: any)
  public/icons/icon-maskable-192.png / -512.png     — putih full-bleed, figur 78% (purpose: maskable)
  public/icons/apple-touch-icon.png (180)           — putih full-bleed kotak penuh (iOS membulatkan sendiri)
  src/app/icon.svg                                  — favicon (tile terang + hairline)
  public/logo.svg                                   — logo terang statis
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from suio_logo import suio_svg, render, cairosvg

ROOT = "/home/z/my-project"

# --- PNG "any": tile membulat dengan sudut transparan ---
for s in (192, 512):
    render(suio_svg("light", edge=False), f"{ROOT}/public/icons/icon-{s}.png", s)

# --- Maskable: kotak putih penuh, konten dalam safe-zone lingkaran 80% ---
for s in (192, 512):
    render(suio_svg("light", tile_full=True, scale_group=0.78), f"{ROOT}/public/icons/icon-maskable-{s}.png", s)

# --- Apple touch icon: kotak penuh (tanpa rx, tanpa transparansi) ---
render(suio_svg("light", tile_full=True), f"{ROOT}/public/icons/apple-touch-icon.png", 180)

# --- SVG favicon + logo statis ---
light_edge = suio_svg("light", edge=True)
with open(f"{ROOT}/src/app/icon.svg", "w") as f:
    f.write(light_edge)
with open(f"{ROOT}/public/logo.svg", "w") as f:
    f.write(light_edge)

# --- Verifikasi ---
from PIL import Image
ok = True
for p, exp, corner in [
    ("public/icons/icon-192.png", 192, "transparent"),
    ("public/icons/icon-512.png", 512, "transparent"),
    ("public/icons/icon-maskable-192.png", 192, "white"),
    ("public/icons/icon-maskable-512.png", 512, "white"),
    ("public/icons/apple-touch-icon.png", 180, "white"),
]:
    im = Image.open(f"{ROOT}/{p}")
    px = im.convert("RGBA").load()
    c = px[1, 1]
    mode = "transparent" if c[3] == 0 else ("white" if min(c[:3]) > 240 else f"other {c}")
    stat = "OK" if (im.size[0] == exp and mode == corner) else "FAIL"
    if stat == "FAIL":
        ok = False
    print(f"{stat} {p} size={im.size} corner={mode}")
print("ASSETS", "OK" if ok else "FAIL")
