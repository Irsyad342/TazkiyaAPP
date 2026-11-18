#!/usr/bin/env python3
"""SUIO 3.9 v2 — HD mood emoji dengan pipeline yang menjaga karya asli.

Rantai proses per aset (mulai dari backup orisinal 176px):
1. Denoise ringan (median 3px pada kanal warna) — mematikan bintik noise
   kompresi tanpa mengubah bentuk mata/mulut.
2. Upscale 3× dengan LANCZOS4 (176 → 528) — menutup layar 3× DPR.
3. Defringe: piksel tepi semi-transparan yang bercampur putih (fringe) di-
   inpaint dengan warna tile di sekitarnya → tepi bersih tanpa halo putih.
4. Unsharp mask HALUS (35% overdrive, radius 1.6) — tepi kembali tegas tanpa
   mengamplifikasi noise.
5. Alpha tetap dari hasil resample (antialias mulus, tidak di-sharpen).
"""

from pathlib import Path
import shutil

import cv2
import numpy as np
from PIL import Image, ImageStat

ROOT = Path("/home/z/my-project/public/mood")
BACKUP = Path("/tmp/mood_backup")
TARGET = 528


def enhance(src: Path) -> dict:
    im = Image.open(BACKUP / src.relative_to(ROOT)).convert("RGBA")
    arr = np.array(im)  # RGBA uint8
    rgb, alpha = arr[..., :3], arr[..., 3]

    # 1. Denoise Non-Local Means (kanal warna) — membersihkan bintik noise
    #    kompresi secara menyeluruh sambil menjaga tepi bentuk
    rgb = cv2.fastNlMeansDenoisingColored(rgb, None, 6, 8, 7, 21)

    # 2. Upscale LANCZOS4 3×
    up_rgb = cv2.resize(rgb, (TARGET, TARGET), interpolation=cv2.INTER_LANCZOS4)
    up_a = cv2.resize(alpha, (TARGET, TARGET), interpolation=cv2.INTER_LANCZOS4)

    # 3. Defringe: pita tepi semi-transparan di-inpaint dengan warna sekitar
    band = ((up_a > 2) & (up_a < 250)).astype(np.uint8) * 255
    if band.any():
        bgr = cv2.cvtColor(up_rgb, cv2.COLOR_RGB2BGR)
        inpainted = cv2.inpaint(bgr, band, 3, cv2.INPAINT_TELEA)
        up_rgb = cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB)
        # Haluskan hanya pita yang di-inpaint agar menyatu
        soft = cv2.GaussianBlur(up_rgb, (5, 5), 1.2)
        m3 = (cv2.GaussianBlur(band, (5, 5), 1.0).astype(np.float32) / 255.0)[..., None]
        up_rgb = (up_rgb.astype(np.float32) * (1 - m3) + soft.astype(np.float32) * m3).astype(np.uint8)

    # 4. Unsharp mask sangat halus (kanal warna saja)
    blur = cv2.GaussianBlur(up_rgb, (0, 0), 1.6)
    up_rgb = cv2.addWeighted(up_rgb, 1.25, blur, -0.25, 0)

    out = np.dstack([up_rgb, up_a])
    Image.fromarray(out, "RGBA").save(src, "PNG", optimize=True)

    # Verifikasi: energi tepi (FIND_EDGES mean) & alpha utuh
    before = Image.fromarray(cv2.resize(rgb, (TARGET, TARGET), interpolation=cv2.INTER_LANCZOS4))
    e_before = ImageStat.Stat(before.convert("L").filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).FIND_EDGES)).mean[0]
    e_after = ImageStat.Stat(Image.fromarray(up_rgb).convert("L").filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).FIND_EDGES)).mean[0]
    return {
        "file": str(src.relative_to(ROOT)),
        "edge": f"{e_before:.2f}→{e_after:.2f}",
        "alpha_min": int(up_a.min()),
        "kb": round(src.stat().st_size / 1024, 1),
    }


def main() -> None:
    files = sorted(ROOT.glob("*.png")) + sorted((ROOT / "dark").glob("*.png"))
    assert len(files) == 14, f"harus 14 aset, dapat {len(files)}"
    for f in files:
        r = enhance(f)
        print(f"{r['file']}: edge {r['edge']} alpha_min={r['alpha_min']} {r['kb']}KB")
    total = sum(f.stat().st_size for f in files) / 1024
    print(f"total: {round(total)} KB")


if __name__ == "__main__":
    main()
