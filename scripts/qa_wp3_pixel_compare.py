"""Bukti piksel v3: kartu AKTIF carousel 3D identik di 4 tema + kontras teks."""
from PIL import Image

# kartu aktif (imsak, penuh tajam): x=23..353, y=111..383
CARD = (23, 111, 353, 383)
JAM = (30, 300, 130, 326)  # area angka jam besar di scrim
SHOTS = {
    "Original Orange (light/classic)": "scripts/qa-shots/wp3/th-A-light-classic.png",
    "Soft Warm Dark (dark/classic)": "scripts/qa-shots/wp3/th-B-dark-classic.png",
    "Electric light": "scripts/qa-shots/wp3/th-C-light-electric.png",
    "Electric Dream dark": "scripts/qa-shots/wp3/th-D-dark-electric.png",
}

def lum(px):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(px[0]) + 0.7152 * ch(px[1]) + 0.0722 * ch(px[2])

def region_mean(im, box):
    px = list(im.crop(box).getdata())
    n = len(px)
    return tuple(round(sum(p[i] for p in px) / n, 1) for i in range(3))

means = {}
print("== Kartu aktif Imsak (area penuh) per tema ==")
for name, path in SHOTS.items():
    im = Image.open(path).convert("RGB")
    means[name] = region_mean(im, CARD)
    print(f"{name:34s} RGB={means[name]}")

base = "Original Orange (light/classic)"
ok = True
print("\n== Selisih vs Original Orange ==")
for name in SHOTS:
    if name == base:
        continue
    d = max(abs(means[name][i] - means[base][i]) for i in range(3))
    ok = ok and d <= 3.0
    print(f"{name:34s} max-delta={d:.1f} {'✓' if d <= 3.0 else '✗ BEDA'}")

im = Image.open(SHOTS[base]).convert("RGB")
bg = region_mean(im, JAM)
ratio = (lum((255, 255, 255)) + 0.05) / (lum(bg) + 0.05)
print(f"\n== Kontras teks putih vs scrim area jam: {ratio:.1f}:1 {'✓ ≥4.5' if ratio >= 4.5 else '✗ <4.5'}")
print("\nHASIL:", "IDENTIK di semua tema ✓" if ok else "ADA PERBEDAAN ✗")
