#!/usr/bin/env python3
"""
SUIO v14 — recolor aset mood emoji ke keluarga warna SUIO.

Prinsip: geometri TIDAK disentuh. Setiap warna sumber (14 klaster per
gambar) dipetakan eksplisit ke target "light" dan "dark". Piksel di
antara dua klaster (anti-alias, gradasi tile) dihitung sebagai rata-rata
tertimbul tetangga terdekat sehingga gradasi tetap halus.

Aturan tangga warna (mencegah tepi berbintik):
- Klaster anti-alias antara tile dan fitur dipetakan ke anak tangga yang
  KONSISTEN di jalur tile -> fitur, bukan ke ekstrem mana pun.
- Set dark: tile charcoal #272220, fitur warm ivory #FFE4D0, glint putih
  membalik jadi charcoal gelap; rim terang tile dijadikan LEBIH GELAP
  dari tile agar tidak ada outline menyilaukan.

Output:
  public/mood/{id}.png        — set light (tile warm/orange, fitur charcoal)
  public/mood/dark/{id}.png   — set dark  (tile charcoal, fitur ivory/orange)
"""
import os
import numpy as np
from PIL import Image

SRC = "scripts/mood_originals"
OUT_LIGHT = "public/mood"
OUT_DARK = "public/mood/dark"

# sumber -> (target_light, target_dark)
MAPS = {
    "bahagia": {
        "F3D76F": ("FF9A52", "272220"),  # tile
        "FEFDF0": ("FFF1E6", "2A2521"),  # glint mata
        "32302D": ("202020", "FFE4D0"),  # fitur
        "EDDD95": ("FFAE74", "2E2A26"),  # tile terang
        "A49860": ("D6782E", "4A3B2E"),  # blend
        "5D5228": ("8A5220", "6E563E"),  # blend dalam
        "433923": ("5C3E22", "8A6C50"),  # blend terdalam
        "373542": ("33302C", "A8896A"),  # blend terdalam
        "C6B775": ("FFA763", "302B26"),  # tile bayang terang
        "887A47": ("C06218", "3A322C"),  # tile bayang
        "CBB983": ("FFB98A", "322D28"),  # tile terang 2
        "423B43": ("3A342C", "9A7C5E"),  # blend
        "544E45": ("443C34", "7A6248"),  # blend
        "86763B": ("AC5A14", "342E28"),  # tile bayang dalam
    },
    "bersyukur": {
        "EED5CD": ("FFE0CC", "272220"),  # tile peach
        "D93732": ("D94B0A", "E8815A"),  # mata hati
        "323131": ("202020", "FFE4D0"),  # senyum
        "E49BAE": ("FF9A52", "F0A47E"),  # blush
        "CD5E58": ("C24407", "D97040"),  # hati dalam
        "F2C9BB": ("FFD8C0", "2E2A26"),  # tile terang
        "D14239": ("D64708", "E0763C"),  # hati mid
        "B83A34": ("BE3F06", "CE6A36"),  # hati dalam 2
        "B3544E": ("AC3F06", "C25E2E"),  # hati terdalam
        "ECB8C3": ("FFC4A2", "FFC9A4"),  # blush terang
        "685D58": ("443C34", "7A6248"),  # blend
        "A89A94": ("E3C0A8", "3A322C"),  # tile bayang blend
        "B5423B": ("C84307", "D26838"),  # hati mid 2
        "423A37": ("38332C", "8A6C50"),  # blend
    },
    "campur-aduk": {
        "A5D3DD": ("FFD9B8", "272220"),  # tile
        "A8D3DD": ("FFD5B0", "282321"),  # tile
        "F1F8FA": ("FFF1E6", "2A2521"),  # glint
        "2A3133": ("202020", "FFE4D0"),  # fitur
        "52656A": ("7A5434", "6E563E"),  # blend dalam
        "8FA9AF": ("F5C296", "2E2A26"),  # tile terang
        "34484C": ("4A3420", "9A7C5E"),  # blend terdalam
        "718C91": ("D8985C", "3A322C"),  # tile bayang
        "2F3C42": ("3C2E1E", "B8946C"),  # blend terdalam
        "A0BBC3": ("FACDA4", "302B26"),  # tile terang 2
        "637C82": ("CC8A4C", "342E28"),  # tile bayang 2
        "433739": ("352A20", "D2B08C"),  # blend terdalam
        "324137": ("443020", "A8896A"),  # blend dalam
        "42413F": ("38342E", "C0A07E"),  # blend
    },
    "cemas": {
        "959699": ("BE8A62", "272220"),  # tile clay muted
        "FDFEFE": ("FFF1E6", "2A2521"),  # glint tetes
        "9E9FA1": ("C79670", "2E2A26"),  # tile terang
        "333436": ("202020", "FFE4D0"),  # fitur
        "68696C": ("96683E", "3A322C"),  # tile bayang
        "292A2C": ("1B1B1D", "FFDDBF"),  # fitur dalam (tetes)
        "E8E8EA": ("EED4BE", "322D28"),  # tile terang 2
        "D5D6D8": ("DFB896", "302B26"),  # tile terang 3
        "7C7D80": ("85603A", "342E28"),  # tile bayang 2
        "BDBEC0": ("CFA47E", "2E2A26"),  # tile terang 4
        "3F4042": ("3A342C", "9A7C5E"),  # blend
        "7F8082": ("86613B", "302B26"),  # tile bayang 3
        "3D3E41": ("36322C", "A8896A"),  # blend
        "BFC0C1": ("D0A680", "2E2A26"),  # tile terang 5
    },
    "lelah": {
        "E7843B": ("DC5A10", "272220"),  # tile -> burnt orange
        "DD8A4B": ("E8691F", "2E2A26"),  # tile terang
        "FDFAF1": ("FFF1E6", "2A2521"),  # glint
        "33312F": ("202020", "FFE4D0"),  # fitur
        "502F15": ("6A3E10", "8A6C50"),  # blend dalam
        "E17C33": ("D25409", "2B2722"),  # tile mid
        "F8D3B1": ("FFC9A0", "322D28"),  # blend terang
        "985F31": ("94440A", "4A3B2E"),  # tile bayang
        "A7724A": ("B25412", "6E563E"),  # blend
        "704929": ("7E3C08", "5A4636"),  # tile bayang 2
        "E5B68D": ("F2A876", "302B26"),  # blend terang 2
        "CD7D45": ("C6500C", "342E28"),  # tile mid 2
        "B6855B": ("A44C10", "7A6248"),  # blend 2
        "2C3841": ("3A342C", "9A7C5E"),  # blend
    },
    "sedih": {
        "95969A": ("8F8781", "272220"),  # tile warm gray
        "FBFBFB": ("FFF1E6", "FFE9D8"),  # air mata -> warm ivory
        "313233": ("202020", "F7D0B0"),  # fitur -> ivory lembut
        "5C5D60": ("6E6761", "4A3B2E"),  # tile bayang
        "3C3D41": ("35322C", "E8C2A0"),  # blend fitur
        "BDBEC1": ("A39A93", "232020"),  # rim tile -> LEBIH GELAP
        "7D7E81": ("7A736C", "342E28"),  # tile bayang 2
        "BFC1C1": ("A49B94", "232020"),  # rim tile
        "3F4042": ("3A342C", "E0B896"),  # blend fitur
        "BEC0BF": ("A39A93", "232020"),  # rim tile
        "7F8084": ("7B746D", "302B26"),  # tile bayang 3
        "C0BFC4": ("A59C95", "232020"),  # rim tile
        "40403E": ("38362E", "D8B28E"),  # blend fitur
        "3E403F": ("39372E", "DCB692"),  # blend fitur
    },
    "tenang": {
        "F4C247": ("FFB27A", "272220"),  # tile soft orange
        "FEFDF3": ("FFF1E6", "2A2521"),  # glint
        "333028": ("202020", "FFE4D0"),  # fitur
        "EEBB4D": ("FCA468", "2B2722"),  # tile mid
        "F3C43B": ("FDA45E", "2E2A26"),  # tile mid 2
        "FAE9AC": ("FFCF9E", "322D28"),  # tile terang
        "46351A": ("5C3E1C", "8A6C50"),  # blend dalam
        "64511D": ("7A4A16", "6E563E"),  # tile bayang
        "EFBC3B": ("F89D5A", "282420"),  # tile mid 3
        "AF964D": ("D0782A", "5A4636"),  # blend
        "8B7233": ("A8601E", "4A3B2E"),  # tile bayang 2
        "363543": ("34302C", "A8896A"),  # blend
        "A28738": ("C46C22", "7A6248"),  # blend 2
        "443844": ("383230", "9A7C5E"),  # blend
    },
}


def hx(h: str) -> np.ndarray:
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def to_hex(c: np.ndarray) -> str:
    return "%02X%02X%02X" % tuple(int(round(v)) for v in c)


# Sampel permukaan tile di tepi gambar (hindari fitur) — diperlakukan
# sebagai klaster sumber tambahan agar gradasi tile dipetakan bersih
# ke tangga charcoal (dark) / tangga keluarga oranye (light), tanpa
# tercemar target aksen yang kebetulan berdekatan di ruang RGB.
TILE_SAMPLES = {
    "bahagia": [(14, 14), (88, 10), (160, 14), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
    "bersyukur": [(14, 14), (88, 10), (160, 14), (14, 160), (88, 164), (160, 160)],
    "campur-aduk": [(14, 14), (88, 10), (160, 14), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
    "cemas": [(14, 14), (88, 10), (14, 88), (14, 160), (88, 164), (160, 160)],
    "lelah": [(14, 14), (88, 10), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
    "sedih": [(14, 14), (160, 14), (88, 10), (88, 164)],
    "tenang": [(14, 14), (88, 10), (160, 14), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
}

# Ujung tangga tile per emoji: (warna_bawah_light, warna_atas_light);
# dark selalu lembut dari 221F1C (bayang) ke 38322C (tile terang).
TILE_LADDER = {
    "bahagia": ("E87934", "FFCFA6"),
    "bersyukur": ("F5CBB2", "FFE9DA"),
    "campur-aduk": ("F2B888", "FFE3C6"),
    "cemas": ("A97A50", "D8AC84"),
    "lelah": ("C24E08", "F08A44"),
    "sedih": ("7E766F", "A9A099"),
    "tenang": ("F79A5C", "FFD3A8"),
}


def extend_with_tile_anchors(img: Image.Image, emoji: str, mapping: dict) -> dict:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float64)
    h, w = rgb.shape[:2]
    pts = [(x, y) for (x, y) in TILE_SAMPLES[emoji] if x < w and y < h]
    cols = np.array([rgb[y, x] for (x, y) in pts])
    # jaga jauh dari fitur: buang sampel yang menyimpang dari median tile
    med = np.median(cols, axis=0)
    keep = np.linalg.norm(cols - med, axis=1) < 60
    cols = cols[keep]
    lum = cols @ np.array([0.299, 0.587, 0.114]) / 255.0
    lo, hi = lum.min(), max(lum.max(), lum.min() + 1e-6)
    base_lo, base_hi = (hx(TILE_LADDER[emoji][0]), hx(TILE_LADDER[emoji][1]))
    d_lo, d_hi = hx("221F1C"), hx("38322C")
    extra = {}
    for c, l in zip(cols, lum):
        t = (l - lo) / (hi - lo)
        lt = base_lo * (1 - t) + base_hi * t
        dt = d_lo * (1 - t) + d_hi * t
        extra[to_hex(c)] = (to_hex(lt), to_hex(dt))
    for k, v in extra.items():
        mapping.setdefault(k, v)
    print(f"  anchors[{emoji}]:", {k: v[1] for k, v in extra.items()})
    return mapping


def remap(img: Image.Image, mapping: dict, name: str) -> None:
    rgba = np.asarray(img.convert("RGBA"), dtype=np.float64)
    rgb, alpha = rgba[..., :3], rgba[..., 3:]

    srcs = np.stack([hx(k) for k in mapping])            # (K,3)
    tgt_light = np.stack([hx(v[0]) for v in mapping.values()])
    tgt_dark = np.stack([hx(v[1]) for v in mapping.values()])

    flat = rgb.reshape(-1, 3)                             # (N,3)
    d = np.sqrt(((flat[:, None, :] - srcs[None, :, :]) ** 2).sum(-1))  # (N,K)
    order = np.argsort(d, axis=1)[:, :3]
    rows = np.arange(len(flat))[:, None]
    w = 1.0 / (d[rows, order] + 2.5)                      # exact match mendominasi
    w = w / w.sum(axis=1, keepdims=True)

    a_flat = alpha.reshape(-1)
    try:
        from scipy.ndimage import binary_erosion, distance_transform_edt
        have_scipy = True
    except Exception:
        have_scipy = False

    sil = alpha[..., 0] > 10
    if have_scipy and sil.any() and not sil.all():
        # Cincin tepi siluet diwarnai ulang dari interior terdekat: matte /
        # "sticker stroke" putih kolase asli tidak boleh meninggalkan
        # outline di latar gelap. Alpha cincin tetap agar tepi tetap halus.
        # Light: cincin 2px (rapikan matte). Dark: 4px (stroke putih ikut
        # tertimpa warna tile).
        for iters, tgt, folder in ((2, tgt_light, OUT_LIGHT), (6, tgt_dark, OUT_DARK)):
            mapped = (tgt[order] * w[..., None]).sum(axis=1).reshape(rgb.shape)
            band = sil & ~binary_erosion(sil, iterations=iters)
            interior = sil & ~band
            _, idx = distance_transform_edt(~interior, return_indices=True)
            interior_colors = mapped[idx[0], idx[1]]
            mapped = mapped.copy()
            mapped[band] = interior_colors[band]
            merged = np.concatenate([mapped, alpha], axis=-1).clip(0, 255).astype(np.uint8)
            os.makedirs(folder, exist_ok=True)
            Image.fromarray(merged).save(os.path.join(folder, name))
            print("  ->", os.path.join(folder, name), f"(band {iters}px)")
        return

    for tgt, folder in ((tgt_light, OUT_LIGHT), (tgt_dark, OUT_DARK)):
        out = (tgt[order] * w[..., None]).sum(axis=1).reshape(rgb.shape)
        merged = np.concatenate([out, alpha], axis=-1).clip(0, 255).astype(np.uint8)
        os.makedirs(folder, exist_ok=True)
        Image.fromarray(merged).save(os.path.join(folder, name))
        print("  ->", os.path.join(folder, name))


for fname in sorted(os.listdir(SRC)):
    img = Image.open(os.path.join(SRC, fname))
    emoji = fname.replace(".png", "")
    maps = extend_with_tile_anchors(img, emoji, dict(MAPS[emoji]))
    print(fname)
    remap(img, maps, fname)

# Contact sheet verifikasi: light di latar terang, dark di latar charcoal.
files = sorted(os.listdir(SRC))


def sheet(folder, bg, path):
    cell, pad, cols, rows = 200, 14, 4, 2
    W, H = cols * (cell + pad) + pad, rows * (cell + pad) + pad
    s = Image.new("RGB", (W, H), bg)
    for i, f in enumerate(files):
        im = Image.open(os.path.join(folder, f)).convert("RGBA")
        im.thumbnail((cell - 24, cell - 24), Image.LANCZOS)
        x = pad + (i % cols) * (cell + pad)
        y = pad + (i // cols) * (cell + pad)
        s.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
    s.save(path)
    print("sheet:", path)


sheet(OUT_LIGHT, (242, 242, 244), "/tmp/mood_light.png")
sheet(OUT_DARK, (19, 18, 23), "/tmp/mood_dark.png")
