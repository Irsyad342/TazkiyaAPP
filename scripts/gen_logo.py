#!/usr/bin/env python3
"""Logo Tazkiya v9 — identitas oranye #FA5200 (menggantikan logo ungu lama).
Konsep tetap: bulan sabit + bintang + buku terbuka (spiritual + ilmu),
kini dengan warna merek hangat. Menghitung path bulan sabit dari dua lingkaran,
menulis public/logo.svg + src/app/icon.svg (favicon)."""
import math

# ---------- geometri bulan sabit ----------
C1 = (234.0, 212.0)   # lingkaran luar
R1 = 118.0
C2 = (306.0, 178.0)   # lingkaran potong
R2 = 100.0

def intersect(c1, r1, c2, r2):
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    a = (r1**2 - r2**2 + d**2) / (2 * d)
    h = math.sqrt(max(r1**2 - a**2, 0.0))
    xm, ym = c1[0] + a * dx / d, c1[1] + a * dy / d
    return ((xm + h * dy / d, ym - h * dx / d), (xm - h * dy / d, ym + h * dx / d))

(pA, pB) = intersect(C1, R1, C2, R2)
# ujung sabit: titik potong atas & bawah (urutkan berdasar y)
tip_top, tip_bot = sorted((pA, pB), key=lambda p: p[1])

def f(v):  # format angka
    return f"{v:.1f}".rstrip("0").rstrip(".")

# path sabit: busur LUAR dari ujung atas ke ujung bawah (sisi kiri), lalu busur
# DALAM kembali ke ujung atas (sisi kanan lingkaran potong)
d_crescent = (
    f"M{f(tip_top[0])} {f(tip_top[1])} "
    f"A{f(R1)} {f(R1)} 0 1 0 {f(tip_bot[0])} {f(tip_bot[1])} "   # large-arc, sweep 0 → lewat kiri
    f"A{f(R2)} {f(R2)} 0 0 1 {f(tip_top[0])} {f(tip_top[1])} Z"  # kembali lewat dalam
)

BOOK = """
<g transform="translate(0 6)">
  <path d="M256 350 C224 330 176 326 148 336 L148 412 C176 402 224 406 256 426 Z" fill="#C94100"/>
  <path d="M256 350 C288 330 336 326 364 336 L364 412 C336 402 288 406 256 426 Z" fill="#C94100"/>
  <path d="M256 356 C226 338 182 334 156 342 L156 406 C182 398 226 402 256 420 Z" fill="#F7F1EA"/>
  <path d="M256 356 C286 338 330 334 356 342 L356 406 C330 398 286 402 256 420 Z" fill="#FFFDF9"/>
  <path d="M226 360 C210 358 194 358 180 361 L180 370 C194 367 210 367 226 369 Z" fill="#E5D5C4"/>
  <path d="M226 380 C210 378 194 378 180 381 L180 390 C194 387 210 387 226 389 Z" fill="#E5D5C4"/>
  <path d="M286 360 C302 358 318 358 332 361 L332 370 C318 367 302 367 286 369 Z" fill="#EAD9C8"/>
  <path d="M286 380 C302 378 318 378 332 381 L332 390 C318 387 302 387 286 389 Z" fill="#EAD9C8"/>
  <path d="M256 352 L256 424" stroke="#C94100" stroke-width="5" stroke-linecap="round"/>
</g>
"""

STAR = ('<path d="M368 118 C372 136 380 144 398 148 C380 152 372 160 368 178 '
        'C364 160 356 152 338 148 C356 144 364 136 368 118 Z" fill="#FFD9BF"/>')

def svg_art(pad_scale=None, full_bleed=False):
    """pad_scale: skala konten utk ikon maskable (safe zone)."""
    t = ""
    if pad_scale:
        t = f'<g transform="translate(256 256) scale({pad_scale}) translate(-256 -256)">'
    return t

def build(size_attr, maskable=False):
    art_open = svg_art(pad_scale=0.70) if maskable else "<g>"
    art_close = "</g>"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {size_attr}>
<defs>
  <linearGradient id="cres" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FF9A62"/><stop offset="1" stop-color="#FA5200"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.38" cy="0.34" r="0.62">
    <stop offset="0" stop-color="#FA5200" stop-opacity="0.34"/>
    <stop offset="1" stop-color="#FA5200" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="512" height="512" rx="{0 if maskable else 116}" fill="#17171A"/>
<rect width="512" height="512" rx="{0 if maskable else 116}" fill="url(#glow)"/>
{art_open}
<path d="{d_crescent}" fill="url(#cres)"/>
{STAR}
{BOOK}
{art_close}
</svg>
"""

with open("/home/z/my-project/public/logo.svg", "w") as fh:
    fh.write(build('width="512" height="512"'))
with open("/home/z/my-project/src/app/icon.svg", "w") as fh:
    fh.write(build('width="512" height="512"'))
with open("/tmp/logo-maskable.svg", "w") as fh:
    fh.write(build('width="512" height="512"', maskable=True))
print("SVG tertulis; ujung sabit:", [tuple(round(x) for x in p) for p in (tip_top, tip_bot)])
