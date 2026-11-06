#!/usr/bin/env python3
"""
SUIO v18 — recolor DARK set mood emoji: tile hangat bervariasi per emosi.

Permintaan pengguna: dark mode sebelumnya semua tile charcoal (dominan
hitam/abu). Set baru memberi setiap emoji tile warna hangat khasnya —
Bahagia soft orange+peach, Tenang amber muted+ivory, Bersyukur burnt
orange+peach, Lelah orange hangat+cokelat tua, Sedih brown muted+ivory,
Cemas warm gray+soft orange, Campur aduk peach+muted orange — tanpa
mengubah geometri, bentuk wajah, ekspresi, maupun ukuran (geometri TIDAK
disentuh; hanya warna piksel yang dipetakan ulang).

Prinsip sama dengan recolor_mood.py: setiap warna sumber (klaster) dipetakan
eksplisit; piksel anti-alias dihitung rata-rata tertimbang tetangga terdekat;
cincin tepi siluet diwarnai dari interior (tanpa outline putih). Set LIGHT
tidak disentuh sama sekali — script ini hanya menulis public/mood/dark/.
"""
import os
import numpy as np
from PIL import Image

SRC = "scripts/mood_originals"
OUT_DARK = "public/mood/dark"

# sumber -> target dark (tile hangat, fitur kontras)
MAPS = {
    "bahagia": {  # soft orange + peach, fitur cokelat tua
        "F3D76F": "C05920",  # tile
        "FEFDF0": "FFE3C8",  # glint mata peach
        "32302D": "2E1F14",  # fitur
        "EDDD95": "E28248",  # tile terang
        "A49860": "964E1C",  # blend
        "5D5228": "6E3A18",  # blend dalam
        "433923": "55301A",  # blend terdalam
        "373542": "5C3A26",  # blend terdalam 2
        "C6B775": "D2682C",  # tile bayang terang
        "887A47": "A8521E",  # tile bayang
        "CBB983": "EC904E",  # tile terang 2
        "423B43": "6E4630",  # blend
        "544E45": "7E5232",  # blend
        "86763B": "984C18",  # tile bayang dalam
    },
    "tenang": {  # amber muted + warm ivory, fitur cokelat tua
        "F4C247": "C08A44",  # tile amber
        "FEFDF3": "FFEFD8",  # glint ivory
        "333028": "3A2818",  # fitur
        "EEBB4D": "CA9048",  # tile mid
        "F3C43B": "C2873E",  # tile mid 2
        "FAE9AC": "EBCB9E",  # tile terang
        "46351A": "6E5228",  # blend dalam
        "64511D": "8A6A34",  # tile bayang
        "EFBC3B": "C68C42",  # tile mid 3
        "AF964D": "9E7230",  # blend
        "8B7233": "7A5826",  # tile bayang 2
        "363543": "5C4630",  # blend
        "A28738": "8E6A2E",  # blend 2
        "443844": "58452E",  # blend
    },
    "bersyukur": {  # tile burnt orange, hati peach
        "EED5CD": "C26028",  # tile
        "D93732": "FFC9A4",  # mata hati peach
        "323131": "2E1F14",  # senyum
        "E49BAE": "E8A87C",  # blush
        "CD5E58": "F0B488",  # hati dalam
        "F2C9BB": "D87838",  # tile terang
        "D14239": "F5AE84",  # hati mid
        "B83A34": "E89E6E",  # hati dalam 2
        "B3544E": "D88C58",  # hati terdalam
        "ECB8C3": "FFD8BC",  # blush terang
        "685D58": "6E4630",  # blend
        "A89A94": "B4652E",  # tile bayang blend
        "B5423B": "EEA678",  # hati mid 2
        "423A37": "7E5232",  # blend
    },
    "lelah": {  # orange hangat + cokelat tua
        "E7843B": "C25A18",  # tile
        "DD8A4B": "D87838",  # tile terang
        "FDFAF1": "FFE3C4",  # glint
        "33312F": "3A2116",  # fitur (mulut terbuka cokelat tua)
        "502F15": "6E3E1C",  # blend dalam
        "E17C33": "C86024",  # tile mid
        "F8D3B1": "F0B080",  # blend terang
        "985F31": "8E4416",  # tile bayang
        "A7724A": "A0501E",  # blend
        "704929": "70381A",  # tile bayang 2
        "E5B68D": "E89E6C",  # blend terang 2
        "CD7D45": "B85820",  # tile mid 2
        "B6855B": "8E4E20",  # blend 2
        "2C3841": "5C3A26",  # blend
    },
    "sedih": {  # tile brown muted, air mata & fitur warm ivory
        "95969A": "4E3B31",  # tile
        "FBFBFB": "FFE9D8",  # air mata ivory
        "313233": "F7D4B2",  # fitur ivory
        "5C5D60": "3A2C24",  # tile bayang
        "3C3D41": "E0B492",  # blend fitur
        "BDBEC1": "2E241E",  # rim tile -> LEBIH GELAP dari tile
        "7D7E81": "46362C",  # tile bayang 2
        "BFC1C1": "2E241E",  # rim tile
        "3F4042": "D8AC8C",  # blend fitur
        "BEC0BF": "2E241E",  # rim tile
        "7F8084": "4A3A30",  # tile bayang 3
        "C0BFC4": "2E241E",  # rim tile
        "40403E": "D4A888",  # blend fitur
        "3E403F": "D8B08E",  # blend fitur
    },
    "cemas": {  # tile warm gray + tetes soft orange
        "959699": "5E5148",  # tile
        "FDFEFE": "FFE9D8",  # glint
        "9E9FA1": "6E5F54",  # tile terang
        "333436": "F5D9BC",  # fitur ivory
        "68696C": "463A32",  # tile bayang
        "292A2C": "FF9A52",  # fitur dalam (tetes) SOFT ORANGE
        "E8E8EA": "7A6A5E",  # tile terang 2
        "D5D6D8": "75665A",  # tile terang 3
        "7C7D80": "3E332C",  # tile bayang 2
        "BDBEC0": "847468",  # tile terang 4
        "3F4042": "9A8270",  # blend
        "7F8082": "443830",  # tile bayang 3
        "3D3E41": "9A8270",  # blend
        "BFC0C1": "807062",  # tile terang 5
    },
    "campur-aduk": {  # peach + muted orange, fitur cokelat tua
        "A5D3DD": "D98A52",  # tile
        "A8D3DD": "D5864E",  # tile
        "F1F8FA": "FFE9D8",  # glint
        "2A3133": "3A2416",  # fitur
        "52656A": "6E421E",  # blend dalam
        "8FA9AF": "E8A876",  # tile terang
        "34484C": "55331A",  # blend terdalam
        "718C91": "B4703C",  # tile bayang
        "2F3C42": "4A2E1C",  # blend terdalam 2
        "A0BBC3": "EEB283",  # tile terang 2
        "637C82": "A86838",  # tile bayang 2
        "433739": "8E5C34",  # blend terdalam 3
        "324137": "603E24",  # blend dalam
        "42413F": "9A6A3E",  # blend
    },
}


def hx(h: str) -> np.ndarray:
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def to_hex(c: np.ndarray) -> str:
    return "%02X%02X%02X" % tuple(int(round(v)) for v in c)


# Sampel permukaan tile di tepi gambar (hindari fitur) — diperlakukan
# sebagai klaster sumber tambahan agar gradasi tile dipetakan bersih ke
# tangga warna hangat dark per emosi.
TILE_SAMPLES = {
    "bahagia": [(14, 14), (88, 10), (160, 14), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
    "bersyukur": [(14, 14), (88, 10), (160, 14), (14, 160), (88, 164), (160, 160)],
    "campur-aduk": [(14, 14), (88, 10), (160, 14), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
    "cemas": [(14, 14), (88, 10), (14, 88), (14, 160), (88, 164), (160, 160)],
    "lelah": [(14, 14), (88, 10), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
    "sedih": [(14, 14), (160, 14), (88, 10), (88, 164)],
    "tenang": [(14, 14), (88, 10), (160, 14), (14, 88), (160, 88), (14, 160), (88, 164), (160, 160)],
}

# Ujung tangga tile dark per emoji: (warna_bawah, warna_atas) — hangat,
# bervariasi per emosi, cukup terang agar wajah terbaca di atas kanvas #1C1A1A.
DARK_TILE_LADDER = {
    "bahagia": ("B04E1C", "F2A267"),      # soft orange -> peach
    "tenang": ("9E6C30", "DFB183"),       # amber muted -> ivory-amber
    "bersyukur": ("A8481A", "E8905C"),    # burnt orange -> peach
    "lelah": ("9E420E", "E88048"),        # deep warm orange
    "sedih": ("453428", "7A5F4C"),        # muted brown
    "cemas": ("4E423A", "8A786A"),        # warm gray
    "campur-aduk": ("BC763E", "F2C09A"),  # muted orange -> peach
}


def extend_with_tile_anchors(img: Image.Image, emoji: str, mapping: dict) -> dict:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float64)
    h, w = rgb.shape[:2]
    pts = [(x, y) for (x, y) in TILE_SAMPLES[emoji] if x < w and y < h]
    cols = np.array([rgb[y, x] for (x, y) in pts])
    med = np.median(cols, axis=0)
    keep = np.linalg.norm(cols - med, axis=1) < 60
    cols = cols[keep]
    lum = cols @ np.array([0.299, 0.587, 0.114]) / 255.0
    lo, hi = lum.min(), max(lum.max(), lum.min() + 1e-6)
    d_lo, d_hi = hx(DARK_TILE_LADDER[emoji][0]), hx(DARK_TILE_LADDER[emoji][1])
    extra = {}
    for c, l in zip(cols, lum):
        t = (l - lo) / (hi - lo)
        dt = d_lo * (1 - t) + d_hi * t
        extra[to_hex(c)] = to_hex(dt)
    for k, v in extra.items():
        mapping.setdefault(k, v)
    print(f"  anchors[{emoji}]:", extra)
    return mapping


def remap_dark(img: Image.Image, mapping: dict, name: str) -> None:
    rgba = np.asarray(img.convert("RGBA"), dtype=np.float64)
    rgb, alpha = rgba[..., :3], rgba[..., 3:]

    srcs = np.stack([hx(k) for k in mapping])          # (K,3)
    tgt_dark = np.stack([hx(v) for v in mapping.values()])

    flat = rgb.reshape(-1, 3)
    d = np.sqrt(((flat[:, None, :] - srcs[None, :, :]) ** 2).sum(-1))
    order = np.argsort(d, axis=1)[:, :3]
    rows = np.arange(len(flat))[:, None]
    w = 1.0 / (d[rows, order] + 2.5)
    w = w / w.sum(axis=1, keepdims=True)

    try:
        from scipy.ndimage import binary_erosion, distance_transform_edt
        have_scipy = True
    except Exception:
        have_scipy = False

    sil = alpha[..., 0] > 10
    if have_scipy and sil.any() and not sil.all():
        # Cincin tepi (6px) diwarnai dari interior terdekat — matte/sticker
        # stroke asli tidak meninggalkan outline di latar gelap.
        mapped = (tgt_dark[order] * w[..., None]).sum(axis=1).reshape(rgb.shape)
        band = sil & ~binary_erosion(sil, iterations=6)
        interior = sil & ~band
        _, idx = distance_transform_edt(~interior, return_indices=True)
        interior_colors = mapped[idx[0], idx[1]]
        mapped = mapped.copy()
        mapped[band] = interior_colors[band]
        merged = np.concatenate([mapped, alpha], axis=-1).clip(0, 255).astype(np.uint8)
        os.makedirs(OUT_DARK, exist_ok=True)
        Image.fromarray(merged).save(os.path.join(OUT_DARK, name))
        print("  ->", os.path.join(OUT_DARK, name), "(band 6px)")
        return

    out = (tgt_dark[order] * w[..., None]).sum(axis=1).reshape(rgb.shape)
    merged = np.concatenate([out, alpha], axis=-1).clip(0, 255).astype(np.uint8)
    os.makedirs(OUT_DARK, exist_ok=True)
    Image.fromarray(merged).save(os.path.join(OUT_DARK, name))
    print("  ->", os.path.join(OUT_DARK, name))


for fname in sorted(os.listdir(SRC)):
    img = Image.open(os.path.join(SRC, fname))
    emoji = fname.replace(".png", "")
    maps = extend_with_tile_anchors(img, emoji, dict(MAPS[emoji]))
    remap_dark(img, maps, fname)
