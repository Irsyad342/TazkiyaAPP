#!/usr/bin/env python3
"""Montage dark mood set di atas kanvas dark baru untuk inspeksi visual."""
from PIL import Image, ImageDraw

ids = ["bahagia", "tenang", "bersyukur", "lelah", "sedih", "cemas", "campur-aduk"]
S = 120
PAD = 24
cols, rows = 4, 2
W = cols * S + (cols + 1) * PAD
H = rows * S + (rows + 1) * PAD + 16

canvas = Image.new("RGB", (W, H), "#1C1A1A")
d = ImageDraw.Draw(canvas)
for i, id_ in enumerate(ids):
    r, c = divmod(i, cols)
    x = PAD + c * (S + PAD)
    y = PAD + r * (S + PAD)
    im = Image.open(f"public/mood/dark/{id_}.png").convert("RGBA").resize((S, S), Image.LANCZOS)
    canvas.paste(im, (x, y), im)
    d.text((x + S // 2 - 20, y + S + 4), id_, fill="#A89E96")
canvas.save("/tmp/render/mood-dark-montage.png")
print("saved /tmp/render/mood-dark-montage.png")
