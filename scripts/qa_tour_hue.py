"""QA atmosfer waktu: klasifikasi hue per band + verifikasi objek interior."""
from PIL import Image
import colorsys

SH = "scripts/qa-shots/tour"

def hue_stats(im, y0f, y1f, x0f=0.0, x1f=1.0):
    """Persen piksel per kelas warna di band."""
    w, h = im.size
    px = list(im.crop((int(x0f*w), int(y0f*h), int(x1f*w), int(y1f*h))).getdata())
    n = len(px)
    kelas = {"biru": 0, "ungu": 0, "emas": 0, "krem": 0, "gelap": 0, "terang": 0}
    for r, g, b in px[::7]:
        hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        hue = hh * 360
        if vv < 0.12: kelas["gelap"] += 1
        elif ss < 0.14 and vv > 0.75: kelas["terang"] += 1
        elif ss < 0.3 and vv > 0.6: kelas["krem"] += 1
        elif 32 <= hue <= 55 and ss > 0.35: kelas["emas"] += 1
        elif 200 <= hue <= 250 and ss > 0.2: kelas["biru"] += 1
        elif 250 < hue <= 290 and ss > 0.15: kelas["ungu"] += 1
    tot = sum(kelas.values()) or 1
    return {k: round(v / (tot/1000) / 10, 1) for k, v in kelas.items()}

print("== KLASIFIKASI WARNA (persen) ==")
for f, label in [("exterior", "eksterior malam"), ("f4-explore", "interior explore")]:
    im = Image.open(f"{SH}/{f}.png").convert("RGB")
    print(f"\n{label}:")
    print("  atas 0-30% :", hue_stats(im, 0, 0.30))
    print("  tengah 30-62%:", hue_stats(im, 0.30, 0.62))
    print("  bawah 62-100%:", hue_stats(im, 0.62, 1.0))

# standar deviasi — scene ter-render punya variasi
import statistics
def std_lum(im):
    g = list(im.convert("L").getdata())[::17]
    return round(statistics.pstdev(g), 1)
for f in ["exterior", "f4-explore"]:
    im = Image.open(f"{SH}/{f}.png")
    print(f"\n{f}: std luminansi={std_lum(im)} (>12 = scene kaya detail, bukan kosong)")
