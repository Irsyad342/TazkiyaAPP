#!/usr/bin/env python3
"""Pergeseran palet Electric Dream: navy → charcoal/black (dark), off-white
(light), neon lime #E3FF3B → #B7FF36, indikator aktif → lime, biru tetap
sekunder. Replacement ter-scope per blok agar blok Classic tak tersentuh."""

PATH = "/home/z/my-project/src/app/globals.css"

MARK_A = 'html[data-color="electric"] {'
MARK_B = '/* ---------- ELECTRIC DREAM — DARK (Deep Navy bervariasi) ---------- */'
MARK_C = '/* ---------- Liquid Glass ELECTRIC DARK — navy luminous ---------- */'
MARK_D = 'html[data-theme="dark"][data-color="electric"] .fr-check-on'

LIGHT = {
    # kanvas & netral → off-white (referensi #F5F6F0)
    "#f3f4fb": "#f5f6f0",
    "#f0f2fc": "#f5f6f0",
    "#e7e9f3": "#eceee6",
    "#dee1ed": "#e1e3dc",
    "#e1e4f2": "#e6e8e0",
    "#eff2ff": "#f2f4ea",
    "#ddf1ff": "#e0f0ec",
    "#eef1fa": "#f0f1ea",
    "#e9eaf4": "#eceee6",
    "#e7e9f4": "#e9ebe4",
    "#eef0f8": "#eff1e9",
    "#e3e6f0": "#e6e8e2",
    "#e4e6f0": "#e6e8e2",
    "#e6e8f2": "#e8eae4",
    # tinta → charcoal (#17191C)
    "#252943": "#17191c",
    "#2a2e14": "#17191c",
    "#111318": "#111318",
    # garis/track/abu netral
    "#d9dcea": "#dcdee1",
    "#e0e3ef": "#e2e4e0",
    "#c8cde0": "#c9ccd2",
    "#dfe2ee": "#e0e2dd",
    "#ccd3e8": "#ced1d4",
    "#c9d1e8": "#ccd0d2",
    "#ccd3e6": "#d0d3cb",
    "#5d6485": "#5d6472",
    "#8a90ac": "#8a90a0",
    "#7a80a0": "#7a8088",
    "#ecedf6": "#edeee7",
    "rgba(37, 41, 67": "rgba(23, 25, 28",
    # neon lime → #B7FF36 + tinta charcoal
    "#e3ff3b": "#b7ff36",
    "#c4dc1f": "#93e00e",
    "#eef9a6": "#f1ffce",
    "#55600e": "#3d4a0a",
    "#f2facb": "#f4ffdb",
    "#dce94e": "#cbf22e",
    # dock → charcoal (elemen navigasi hitam)
    "rgba(42, 48, 79": "rgba(23, 25, 28",
    "rgba(23, 26, 45": "rgba(9, 10, 12",
    "#2a3050": "#17191c",
}

LIGHT_LINE = {
    "  --tk-tab-indicator: #20c7b7;": "  --tk-tab-indicator: var(--tk-neon);",
    "  --tk-dock-active: linear-gradient(135deg, #20c7b7 0%, #3a4efb 100%);":
        "  --tk-dock-active: linear-gradient(135deg, #b7ff36 0%, #8fe212 100%);",
    "  --tk-dua-label: var(--color-tk-lime);": "  --tk-dua-label: var(--tk-neon);",
    "  --tk-zikir-num: var(--color-tk-lime);": "  --tk-zikir-num: var(--tk-neon);",
}

DARK = {
    # kanvas → charcoal/black (#090A0C–#17191C bervariasi)
    "#1d2136": "#0c0d10",
    "#171a2c": "#090a0c",
    # kartu → tingkatan charcoal
    "#2a2f4d": "#17191c",
    "#303656": "#17191c",
    "#2b3050": "#1a1d22",
    "#232742": "#14161a",
    "#333a5e": "#1f2228",
    "#3a4064": "#26292f",
    "#9ba2c4": "#9ba2ab",
    "#262b47": "#181a1f",
    "#2a3054": "#202329",
    "#3a4270": "#33373f",
    # tinta → off-white (#F5F6F0)
    "#eef0fc": "#f5f6f0",
    "#b9bfdb": "#bcc1c9",
    "#8c93b4": "#8c93a0",
    # neon lime → #B7FF36
    "#d9f24d": "#b7ff36",
    "#e3ff3b": "#b7ff36",
    "#c4dc1f": "#93e00e",
    "#353d0a": "#1c2405",
    "#2f3a10": "#232b08",
    "#252943": "#17191c",
    "rgba(217, 242, 77, 0.16)": "rgba(183, 255, 54, 0.16)",
    # surface biru-lembut tetap kebiruan tipis (variasi biru)
    "#2a3160": "#1a1e33",
    "#3a3d63": "#26281e",
    # dock → charcoal
    "rgba(46, 52, 86": "rgba(26, 28, 33",
    "rgba(26, 30, 52": "rgba(12, 13, 16",
    "#2a3050": "#191c21",
    "rgba(42, 47, 78": "rgba(23, 25, 28",
}

DARK_LINE = {
    "  --tk-tab-indicator: #2bd9c7;": "  --tk-tab-indicator: var(--tk-neon);",
    "  --tk-dock-active: linear-gradient(135deg, #20c7b7 0%, #3a4efb 100%);":
        "  --tk-dock-active: linear-gradient(135deg, #b7ff36 0%, #8fe212 100%);",
}

DARKGLASS = {
    # permukaan glass navy → charcoal bertingkat (glow biru dipertahankan)
    "rgba(54, 60, 98": "rgba(30, 33, 39",
    "rgba(40, 45, 76": "rgba(23, 25, 29",
    "rgba(50, 56, 90": "rgba(27, 30, 35",
    "rgba(60, 67, 108": "rgba(34, 37, 43",
    "rgba(44, 50, 84": "rgba(25, 27, 32",
    "rgba(56, 62, 102": "rgba(31, 34, 40",
    "rgba(42, 47, 78": "rgba(24, 26, 31",
    "rgba(52, 58, 94": "rgba(28, 31, 37",
    "rgba(56, 62, 100": "rgba(31, 34, 40",
    "#2a3054 0%, #232845 100%": "#1e2128 0%, #181a20 100%",
}

with open(PATH) as f:
    lines = f.read().split("\n")

idx_a = next(i for i, l in enumerate(lines) if l == MARK_A)
idx_b = next(i for i, l in enumerate(lines) if l == MARK_B)
idx_c = next(i for i, l in enumerate(lines) if l == MARK_C)
idx_d = next(i for i, l in enumerate(lines) if l.startswith(MARK_D))

def apply(lo, hi, subs, line_subs=None):
    n = 0
    for i in range(lo, hi + 1):
        if line_subs and lines[i] in line_subs:
            lines[i] = line_subs[lines[i]]
            n += 1
            continue
        for old, new in subs.items():
            if old in lines[i]:
                lines[i] = lines[i].replace(old, new)
                n += 1
    return n

print("LIGHT :", apply(idx_a, idx_b, LIGHT, LIGHT_LINE), "substitusi")
print("DARK  :", apply(idx_b, idx_c, DARK, DARK_LINE), "substitusi")
print("GLASS :", apply(idx_c, idx_d, DARKGLASS), "substitusi")

with open(PATH, "w") as f:
    f.write("\n".join(lines))
print("OK — tersimpan")
