#!/usr/bin/env python3
"""SUIO — varian Electric Dream untuk 14 aset mood (7 mood × light/dark).

Prinsip (sesuai permintaan pengguna):
- Geometri, ekspresi, dan karakter TIDAK disentuh — hanya warna.
- Hue-remap terarah per piksel (bukan filter CSS): keluarga hangat/oranye
  → Electric Blue #3A4EFB / Sky Cyan #33A4FA; putih hangat → Lavender
  #DEE0ED; netral gelap tetap netral. Luminance (shading) dipertahankan.
- Resolusi & alpha asli dipertahankan (aset sudah HD 528px — tanpa upscale).

Output: public/mood/electric/{id}.png + public/mood/electric-dark/{id}.png
"""
import os
import numpy as np
from PIL import Image

SETS = [
    ("public/mood", "public/mood/electric"),
    ("public/mood/dark", "public/mood/electric-dark"),
]
IDS = ["bahagia", "tenang", "bersyukur", "lelah", "sedih", "cemas", "campur-aduk"]

D2R = np.pi / 180.0

def remap(rgb):
    """rgb float array (...,3) 0..1 → electric remap."""
    import matplotlib.colors as mc
    hsv = mc.rgb_to_hsv(np.clip(rgb, 0, 1))
    H = hsv[..., 0] * 360.0
    S = hsv[..., 1]
    V = hsv[..., 2]
    warm = (H >= 5) & (H <= 75) & (S >= 0.10)
    lav = warm & (V >= 0.86) & (S <= 0.32)          # putih hangat → lavender
    cyan = warm & (V > 0.80) & ~lav                  # terang → Sky Cyan
    deep = warm & (V <= 0.30)                        # gelap → indigo pekat
    blue = warm & ~lav & ~cyan & ~deep               # sisanya → Electric Blue

    out = hsv.copy()
    out[..., 0][lav] = 230 / 360.0; out[..., 1][lav] = np.clip(S[lav] * 0.55, 0.10, 0.16); out[..., 2][lav] = np.clip(V[lav] * 0.97, 0, 1)
    out[..., 0][cyan] = 199 / 360.0; out[..., 1][cyan] = np.clip(S[cyan] * 1.02, 0, 0.85)
    out[..., 0][deep] = 232 / 360.0; out[..., 1][deep] = np.clip(S[deep] * 1.12, 0, 0.72); out[..., 2][deep] = np.clip(V[deep] * 1.12, 0, 0.40)
    out[..., 0][blue] = 226 / 360.0; out[..., 1][blue] = np.clip(S[blue] * 0.95, 0, 0.85)
    return mc.hsv_to_rgb(out)

total = 0
for src_dir, out_dir in SETS:
    os.makedirs(out_dir, exist_ok=True)
    for mid in IDS:
        p = os.path.join(src_dir, f"{mid}.png")
        im = Image.open(p).convert("RGBA")
        a = np.asarray(im).astype(np.float32) / 255.0
        rgb, alpha = a[..., :3], a[..., 3:]
        rgb2 = remap(rgb)
        res = np.concatenate([rgb2, alpha], axis=-1)
        out = Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8), "RGBA")
        out.save(os.path.join(out_dir, f"{mid}.png"))
        total += 1
        # sanity: ukuran sama, alpha utuh
        assert out.size == im.size
print("ok —", total, "file ditulis")
