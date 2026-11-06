"""Crop 7 mood emoji dari kolase referensi menjadi aset individual.

Sumber: upload/pasted_image_1793941528439.png (kolase 6x6, kotak rounded
berwarna di atas latar putih). Setiap emoji dipotong dari kotak aslinya,
radius sudut diukur dari piksel, sudut di luar kotak dibuat transparan —
bentuk kotak rounded + warna latar asli dipertahankan.
"""
from PIL import Image, ImageDraw
import numpy as np
import os

SRC = "/home/z/my-project/upload/pasted_image_1793941528439.png"
OUT = "/home/z/my-project/public/mood"
SHEET = "/tmp/mood-sheet.png"

# (id, baris, kolom) 0-indeks dari kolase 6x6
PICKS = [
    ("bahagia", 0, 0),      # kuning, senyum lebar
    ("tenang", 0, 2),       # kuning, senyum mata tertutup
    ("bersyukur", 2, 3),    # krem-merah muda, mata hati
    ("lelah", 0, 1),        # oranye, mengantuk + Zzz
    ("sedih", 5, 0),        # abu-abu, menangis dua aliran air mata
    ("cemas", 4, 2),        # abu-abu, berkeringat gugup
    ("campur-aduk", 5, 3),  # biru muda, mulut bergelombang (bingung)
]

im = Image.open(SRC).convert("RGBA")
a = np.array(im)
rgb = a[..., :3].astype(int)
nonwhite = rgb.sum(axis=2) < 720  # piksel bukan latar putih

def ranges(profile, thresh, minw=40):
    runs, start = [], None
    for i, v in enumerate(profile):
        if v > thresh and start is None:
            start = i
        elif v <= thresh and start is not None:
            if i - start >= minw:
                runs.append((start, i))
            start = None
    if start is not None and len(profile) - start >= minw:
        runs.append((start, len(profile)))
    return runs

cols = ranges(nonwhite.sum(axis=0), 5)
rows = ranges(nonwhite.sum(axis=1), 5)
print(f"grid: {len(rows)} baris x {len(cols)} kolom")
assert len(rows) == 6 and len(cols) == 6, "grid 6x6 tidak terdeteksi"

os.makedirs(OUT, exist_ok=True)
tiles = []

def colored_bbox(cell):
    x0, y0, x1, y1 = cell
    sub = nonwhite[y0:y1, x0:x1]
    ys, xs = np.where(sub)
    return x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1

def corner_radius(bbox):
    """Radius = jarak dari tepi atas kotak ke piksel berwarna pertama pada
    kolom tepi kiri (titik terkiri lengkaran sudut berada di y0+r)."""
    x0, y0, x1, y1 = bbox
    col = nonwhite[y0:y1, x0]
    first = np.argmax(col)
    return int(first)

for mid, r, c in PICKS:
    cell = (cols[c][0], rows[r][0], cols[c][1], rows[r][1])
    bx0, by0, bx1, by1 = colored_bbox(cell)
    w, h = bx1 - bx0, by1 - by0
    side = max(w, h)
    rad = corner_radius((bx0, by0, bx1, by1))
    # jaga kotak persegi: pad ke sisi terpendek dari bbox berwarna
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    half = side / 2
    sq = (round(cx - half), round(cy - half), round(cx + half), round(cy + half))
    tile = im.crop(sq)
    tw, th = tile.size
    # mask rounded-corner: supersample 4x agar tepi halus
    ss = 4
    mask = Image.new("L", (tw * ss, th * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, tw * ss - 1, th * ss - 1], radius=rad * ss, fill=255
    )
    mask = mask.resize((tw, th), Image.LANCZOS)
    tile.putalpha(mask)
    path = f"{OUT}/{mid}.png"
    tile.save(path, optimize=True)
    tiles.append((mid, tile, rad))
    print(f"{mid}: box={side}px radius={rad}px -> {path} ({os.path.getsize(path)} B)")

# lembar kontak untuk verifikasi visual sekali baca
S = 140
sheet = Image.new("RGBA", (S * 7 + 80, S + 40), (242, 242, 244, 255))
for i, (mid, tile, _) in enumerate(tiles):
    t = tile.resize((S, S), Image.LANCZOS)
    sheet.alpha_composite(t, (10 + i * (S + 10), 20))
sheet.convert("RGB").save(SHEET)
print(f"contact sheet: {SHEET}")
