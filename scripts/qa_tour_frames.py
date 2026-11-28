"""QA Tur Masjid Virtual — verifikasi numerik screenshot (tanpa membaca gambar)."""
from PIL import Image
import os, sys

SH = "scripts/qa-shots/tour"

def band(im, y0f, y1f, x0f=0.0, x1f=1.0):
    w, h = im.size
    box = (int(x0f * w), int(y0f * h), int(x1f * w), int(y1f * h))
    px = list(im.crop(box).getdata())
    n = len(px)
    return tuple(round(sum(p[i] for p in px) / n) for i in range(3))

def report(name, im):
    sky = band(im, 0.05, 0.22)      # langit luar / plafon
    mid = band(im, 0.40, 0.60)      # dinding tengah / fasad
    low = band(im, 0.72, 0.94)      # karpet / plaza
    print(f"{name:14s} atas={sky} tengah={mid} bawah={low}")
    return sky, mid, low

print("== Alur cinematic ==")
ims = {}
for f in ["exterior", "f1-approach", "f2-threshold", "f3-reveal", "f4-explore"]:
    im = Image.open(f"{SH}/{f}.png").convert("RGB")
    ims[f] = im
    report(f, im)

def dist(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))

f4mid, f4low = band(ims["f4-explore"], 0.40, 0.60), band(ims["f4-explore"], 0.72, 0.94)
extmid = band(ims["exterior"], 0.40, 0.60)
print("\n-- pemeriksaan --")
print(f"karpet ungu di explore? (bawah f4 ≈ 122,116,184±40): {f4low}, delta={max(abs(f4low[0]-122), abs(f4low[1]-116), abs(f4low[2]-184))}")
print(f"interior beda dari eksterior? delta-tengah={dist(extmid, f4mid)}")
d1 = dist(band(ims['exterior'], 0.45, 0.55), band(ims['f1-approach'], 0.45, 0.55))
d2 = dist(band(ims['f1-approach'], 0.45, 0.55), band(ims['f2-threshold'], 0.45, 0.55))
d3 = dist(band(ims['f2-threshold'], 0.45, 0.55), band(ims['f3-reveal'], 0.45, 0.55))
print(f"frame berubah tiap tahap? d1={d1} d2={d2} d3={d3} (semua >0 = kamera bergerak)")

# mihrab biru tua (#2e3a72 ≈ 46,58,114) di tengah-atas explore
mihrab = band(ims["f4-explore"], 0.36, 0.44, 0.44, 0.56)
print(f"mihrab region (harus kebiruan): {mihrab}, b>r? {mihrab[2] > mihrab[0] + 20}")
