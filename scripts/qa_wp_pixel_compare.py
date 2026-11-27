"""Bukti piksel: keempat tile Waktu-Waktu Penting harus IDENTIK di 4 tema."""
from PIL import Image
import json

TILES = {"imsak": (29, 344), "terbit": (192, 344), "duha": (29, 410), "tahajud": (192, 410)}
W, H = 155, 57
SHOTS = {
    "Original Orange (light/classic)": "scripts/qa-shots/wp/wp-A-light-classic.png",
    "Soft Warm Dark (dark/classic)": "scripts/qa-shots/wp/wp-B-dark-classic.png",
    "Electric light": "scripts/qa-shots/wp/wp-C-light-electric.png",
    "Electric Dream dark": "scripts/qa-shots/wp/wp-D-dark-electric.png",
}

means = {}
for name, path in SHOTS.items():
    im = Image.open(path).convert("RGB")
    for tile, (x, y) in TILES.items():
        # sampel area dalam tile (hindari tepi antialias): +10 inset
        crop = im.crop((x + 10, y + 10, x + W - 10, y + H - 10))
        px = list(crop.getdata())
        n = len(px)
        means[(name, tile)] = tuple(round(sum(p[i] for p in px) / n, 1) for i in range(3))

print("== Warna rata-rata tiap tile per tema (R,G,B) ==")
tiles = list(TILES)
print(f"{'Tema':34s} " + " ".join(f"{t:>16s}" for t in tiles))
for name in SHOTS:
    print(f"{name:34s} " + " ".join(f"{means[(name, t)][0]:3.0f},{means[(name, t)][1]:3.0f},{means[(name, t)][2]:3.0f}" for t in tiles))

base = "Original Orange (light/classic)"
print("\n== Selisih max per channel vs Original Orange ==")
ok = True
for name in SHOTS:
    if name == base:
        continue
    diffs = {t: max(abs(means[(name, t)][i] - means[(base, t)][i]) for i in range(3)) for t in tiles}
    worst = max(diffs.values())
    ok = ok and worst <= 3.0  # toleransi antialiasing
    print(f"{name:34s} " + " ".join(f"{t.split()[0]}:{diffs[t]:.1f}" for t in tiles) + ("  ✓" if worst <= 3.0 else "  ✗ BEDA"))

print("\nHASIL:", "IDENTIK di semua tema ✓" if ok else "ADA PERBEDAAN ✗")
