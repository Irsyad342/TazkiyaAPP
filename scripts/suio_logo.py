#!/usr/bin/env python3
"""SUIO logo baru — generator SVG (light & dark) dari geometri referensi.

Geometri diukur dari upload/file_000000004d3482118c3788a813bebc8a.png
(dark ref) dinormalisasi ke tile 512x512:
  - star  : center (357,170) R 58, 4-point concave (Q control di pusat)
  - dome  : apex (230,233), bottom 373, arch base 194-294 apex (240,323),
            notch kanan (332,334), bulge (348,306)
  - head  : circle (397,338) r 39
  - bar   : y 398, x 63-448 endpoints, stroke 21, round caps
  - tile  : rx 138 (ukur ~0.27 tile)
Warna terukur: orange #FF7B01, dark tile #0D0D0D, light figure #1C1B1B.
"""
import cairosvg
from PIL import Image

ORANGE = "#FF7B01"
TILE_DARK = "#0D0D0D"
TILE_LIGHT = "#FFFFFF"
FIG_DARK = "#FFFFFF"
FIG_LIGHT = "#1C1B1B"

DOME = (
    "M 230 233 "
    "C 186 241 138 262 112 296 "
    "C 96 318 84 344 81 373 "
    "L 194 373 "
    "C 196 352 206 330 240 323 "
    "C 268 325 283 344 294 373 "
    "L 353 373 "
    "C 344 362 335 346 332 334 "
    "C 334 324 342 316 348 306 "
    "C 342 284 302 244 230 233 "
    "Z"
)
STAR = "M 357 112 Q 371.5 155.5 415 170 Q 371.5 184.5 357 228 Q 342.5 184.5 299 170 Q 342.5 155.5 357 112 Z"


def suio_svg(theme="light", radius=138, tile_full=False, scale_group=1.0, edge=False):
    """tile_full=True → rect penuh tanpa sudut membulat (apple/maskable bg)."""
    tile_fill = TILE_LIGHT if theme == "light" else TILE_DARK
    fig = FIG_LIGHT if theme == "light" else FIG_DARK
    rx = 0 if tile_full else radius
    stroke = 'stroke="rgba(0,0,0,0.10)" stroke-width="2"' if (edge and theme == "light") else \
             ('stroke="rgba(255,255,255,0.06)" stroke-width="2"' if (edge and theme == "dark") else "")
    g = ""
    if scale_group != 1.0:
        t = 512 * (1 - scale_group) / 2
        g = f'transform="translate({t} {t}) scale({scale_group})"'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect x="0" y="0" width="512" height="512" rx="{rx}" fill="{tile_fill}" {stroke}/>
<g {g}>
<path d="{DOME}" fill="{fig}"/>
<circle cx="397" cy="338" r="39" fill="{fig}"/>
<path d="{STAR}" fill="{ORANGE}"/>
<path d="M 63 398 L 448 398" stroke="{ORANGE}" stroke-width="22" stroke-linecap="round" fill="none"/>
</g>
</svg>'''


def render(svg, out, size):
    cairosvg.svg2png(bytestring=svg.encode(), write_to=out, output_width=size, output_height=size)


if __name__ == "__main__":
    import sys
    out = "/home/z/my-project/scripts/logo_preview"
    import os
    os.makedirs(out, exist_ok=True)
    light = suio_svg("light", edge=True)
    dark = suio_svg("dark")
    render(light, f"{out}/light.svg.png", 512)
    render(dark, f"{out}/dark.svg.png", 512)

    # perbandingan berdampingan dengan referensi
    ref_l = Image.open("/home/z/my-project/upload/file_0000000092b88211a74e4b71bcccb254.png").convert("RGB")
    ref_d = Image.open("/home/z/my-project/upload/file_000000004d3482118c3788a813bebc8a.png").convert("RGB")
    S = 300
    def sq(im):
        return im.resize((S, S), Image.LANCZOS)
    mine_l = Image.open(f"{out}/light.svg.png").convert("RGBA")
    mine_d = Image.open(f"{out}/dark.svg.png").convert("RGBA")
    # komposit tile transparan di atas latar abu lembut seperti referensi
    def on_bg(im, bg):
        c = Image.new("RGB", im.size, bg)
        c.paste(im, mask=im.split()[3])
        return c
    comp = Image.new("RGB", (S * 4 + 30, S + 20), (238, 238, 240))
    comp.paste(sq(on_bg(mine_l, (250, 250, 251))), (10, 10))
    comp.paste(sq(ref_l), (S + 10, 10))
    comp.paste(sq(on_bg(mine_d, (245, 245, 246))), (S * 2 + 20, 10))
    comp.paste(sq(ref_d), (S * 3 + 20, 10))
    comp.save(f"{out}/compare.png")
    print("saved", f"{out}/compare.png")
