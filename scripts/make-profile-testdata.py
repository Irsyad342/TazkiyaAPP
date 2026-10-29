#!/usr/bin/env python3
"""Buat data uji localStorage Tazkiya: avatar WebP kecil (foto tiruan) + geo GPS Bandung.
Output: /home/z/my-project/scripts/test-store.json (format zustand persist)."""
import base64
import io
import json
from datetime import datetime, timezone, timedelta

from PIL import Image, ImageDraw

W = H = 256
img = Image.new("RGB", (W, H), (214, 205, 235))
d = ImageDraw.Draw(img)
# Latar gradasi langit-lavender
for y in range(H):
    t = y / H
    r = int(200 + 30 * t)
    g = int(196 + 20 * t)
    b = int(232 - 10 * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))
# Siluet orang berjas (menyerupai foto referensi pengguna)
d.ellipse([78, 34, 178, 150], fill=(226, 183, 156))          # wajah
d.polygon([(128, 52), (108, 60), (128, 92), (148, 60)], fill=(60, 44, 38))  # rambut
d.rectangle([118, 140, 138, 168], fill=(219, 176, 150))      # leher
d.polygon([(38, 256), (90, 168), (166, 168), (218, 256)], fill=(38, 34, 52))  # jas
d.polygon([(112, 168), (128, 196), (144, 168), (136, 214), (120, 214)], fill=(250, 250, 252))  # kemeja
d.polygon([(124, 178), (132, 178), (130, 205)], fill=(120, 60, 140))  # dasi
d.ellipse([96, 70, 104, 78], fill=(50, 40, 36))              # mata
d.ellipse([152, 70, 160, 78], fill=(50, 40, 36))

buf = io.BytesIO()
img.save(buf, "WEBP", quality=72)
data_url = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

wib = timezone(timedelta(hours=7))
store = {
    "state": {
        "settings": {
            "name": "Sahabat Tazkiya",
            "avatarDataUrl": data_url,
            "theme": "dark",
            "createdAt": "2026-10-28T10:00:00+07:00",
            "geo": {
                "auto": True,
                "lat": -6.914444,
                "lng": 107.609811,
                "accuracy": 19,
                "label": "Bandung, Jawa Barat",
                "updatedAt": datetime.now(wib).isoformat(),
            },
        }
    },
    "version": 0,
}
out = "/home/z/my-project/scripts/test-store.json"
with open(out, "w") as f:
    json.dump(store, f)
print(f"OK → {out} (webp {len(buf.getvalue())} B, json {len(json.dumps(store))} B)")
