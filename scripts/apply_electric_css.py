#!/usr/bin/env python3
"""SUIO — tahap 2 Theme Gallery: injeksi token Electric Dream ke globals.css.

Prinsip:
- Klasik = nilai yang SUDAH ada (tidak disentuh kecuali var-isasi shell/dock/
  hero/selection agar bisa berubah per tema warna).
- Var bantu baru didefinisikan di :root (nilai klasik), lalu dioverride oleh
  blok html[data-color="electric"] (light) dan
  html[data-theme="dark"][data-color="electric"] (dark).
- Blok elektrik di-APPEND di akhir file agar menang atas preset glass
  (spesifisitas sama → urutan menentukan).
"""
import re, sys

P = "src/app/globals.css"
s = open(P).read()
orig = s

def must(old, new, count=1):
    global s
    n = s.count(old)
    if n < count:
        print(f"MISS ({n}/{count}): {old[:90]!r}")
        sys.exit(1)
    s = s.replace(old, new, count)

# ---------- 1) Var bantu klasik di :root (sebelum penutup blok token terang) ----------
must(
"""  --color-tk-green-soft: #eaf6ef;
  --color-tk-sky-soft: #ecf2fd;
}""",
"""  --color-tk-green-soft: #eaf6ef;
  --color-tk-sky-soft: #ecf2fd;
  /* ===== Var bantu lintas-tema-warna (Theme Gallery) — nilai klasik =====
     Dioverride oleh blok html[data-color="electric"]. Dipakai komponen via
     nilai arbitrary var() sehingga seluruh aksen mengikuti tema aktif. */
  --tk-brand: #ff650a;            /* fill identitas (tombol, hero, pill aktif) */
  --tk-brand-rgb: 255, 101, 10;   /* versi rgb untuk rgba(glow, ring, shadow) */
  --tk-brand-soft: #ff9b63;       /* aksen lembut */
  --tk-brand-deep: #d94b0a;       /* stop gradasi gelap */
  --tk-neon: #ffb35c;             /* highlight kontras (electric: Neon Lime) */
  --tk-neon-ink: #3d2a00;         /* teks di atas neon */
  --tk-shell-bg: #292522;         /* kanvas <main> */
  --tk-shell-outer: #292522;      /* html di luar shell (letterbox desktop) */
  --tk-hint: #f5e8dc;             /* ring/hairline hangat tipis */
  --tk-tint-a: #ffe0cc;           /* tint kartu terang A (peach) */
  --tk-tint-b: #fff6ec;           /* tint kartu terang B */
  --tk-tint-c: #ffefdf;           /* tint kartu terang C */
  --tk-dock-a: 58, 47, 39;        /* gradasi dock (rgb triplet) */
  --tk-dock-b: 30, 24, 20;
  --tk-dock-solid: #241e19;       /* dock saat glass off */
  --tk-dock-shadow: 0 18px 44px -14px rgba(20, 10, 4, 0.85);
  --tk-hero-a: #ff650a; --tk-hero-b: #f25f06; --tk-hero-c: #e55704;
  --tk-hero-shadow: 0 20px 48px -22px rgba(217, 75, 10, 0.55);
}""")

# ---------- 2) Var teks-netral dark-only: blok dark klasik ----------
must(
"""  --color-tk-green-soft: #26382c;
  --color-tk-sky-soft: #2a3748;
}""",
"""  --color-tk-green-soft: #26382c;
  --color-tk-sky-soft: #2a3748;
  /* Teks-netral khusus dark (dipakai kelas dark: pada komponen) */
  --tk-d-ink-hi: #f6eee3;
  --tk-d-ink-mid: #b8a795;
  --tk-d-ink-soft: #e8d8c4;
}""")

# ---------- 3) var-isasi shell & html & selection ----------
must(
"""  html {
    background-color: #f2f2f4;
  }
  html[data-theme="dark"] {
    background-color: #292522;
  }""",
"""  html {
    background-color: #f2f2f4;
  }
  html[data-theme="dark"] {
    background-color: var(--tk-shell-outer);
  }""")

must(
"""  ::selection {
    color: #ffffff;
    background: rgba(255, 90, 0, 0.85);
  }
  html[data-theme="dark"] ::selection {
    color: #ffffff;
    background: rgba(255, 90, 0, 0.55);
  }""",
"""  ::selection {
    color: #ffffff;
    background: rgba(var(--tk-brand-rgb), 0.85);
  }
  html[data-theme="dark"] ::selection {
    color: #ffffff;
    background: rgba(var(--tk-brand-rgb), 0.55);
  }""")

# ---------- 4) var-isasi dock (kelas .su-dock — light klasik tetap identik
#                karena nilai var default = nilai lama) ----------
must(
""".su-dock {
  position: relative;
  background: linear-gradient(165deg, rgba(58, 47, 39, var(--su-float-ad)) 0%, rgba(30, 24, 20, calc(var(--su-float-ad) - 0.06)) 100%);
  -webkit-backdrop-filter: blur(var(--su-float-blur)) saturate(var(--su-sat));
  backdrop-filter: blur(var(--su-float-blur)) saturate(var(--su-sat));
  border: 1px solid var(--su-border-d);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.03),
    0 18px 44px -14px rgba(20, 10, 4, 0.85);
}""",
""".su-dock {
  position: relative;
  background: linear-gradient(165deg, rgba(var(--tk-dock-a), var(--su-float-ad)) 0%, rgba(var(--tk-dock-b), calc(var(--su-float-ad) - 0.06)) 100%);
  -webkit-backdrop-filter: blur(var(--su-float-blur)) saturate(var(--su-sat));
  backdrop-filter: blur(var(--su-float-blur)) saturate(var(--su-sat));
  border: 1px solid var(--su-border-d);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.03),
    var(--tk-dock-shadow);
}""")

must(
"""html[data-glass="off"] .su-dock { background: #241e19; border-color: rgba(255, 255, 255, 0.06); }
html[data-theme="dark"][data-glass="off"] .su-dock { background: #4a3e33; border-color: rgba(255, 255, 255, 0.14); }""",
"""html[data-glass="off"] .su-dock { background: var(--tk-dock-solid); border-color: rgba(255, 255, 255, 0.06); }
html[data-theme="dark"][data-glass="off"] .su-dock { background: #4a3e33; border-color: rgba(255, 255, 255, 0.14); }""")

# Dock dark klasik override (dari 3.12) → pakai var juga (nilai sama)
must(
"""html[data-theme="dark"] .su-dock {
  background: linear-gradient(165deg, rgba(82, 68, 57, var(--su-float-ad)) 0%, rgba(50, 42, 35, calc(var(--su-float-ad) - 0.06)) 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(255, 140, 60, 0.1),
    0 18px 44px -14px rgba(12, 6, 2, 0.7);
}""",
"""html[data-theme="dark"] .su-dock {
  background: linear-gradient(165deg, rgba(var(--tk-dock-a), var(--su-float-ad)) 0%, rgba(var(--tk-dock-b), calc(var(--su-float-ad) - 0.06)) 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(255, 140, 60, 0.1),
    0 18px 44px -14px rgba(12, 6, 2, 0.7);
}
html[data-color="electric"] .su-dock {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1px 0 rgba(51, 164, 250, 0.14),
    var(--tk-dock-shadow);
}""")

# ---------- 5) var-isasi glass-hero (fill identitas) ----------
must(
"""  /* Featured ORANGE pekat — kartu oranye referensi. Konten putih. */
  .glass-hero {
    background: var(--color-tk-violet);
    border: none;
    box-shadow: 0 20px 48px -22px rgba(250, 82, 0, 0.55);
    position: relative;
    overflow: hidden;
  }""",
"""  /* Featured BRAND pekat — kartu identitas (klasik: oranye, electric: biru). */
  .glass-hero {
    background: linear-gradient(168deg, var(--tk-hero-a) 0%, var(--tk-hero-b) 55%, var(--tk-hero-c) 100%);
    border: none;
    box-shadow: var(--tk-hero-shadow);
    position: relative;
    overflow: hidden;
  }""")

# glass-hero dark klasik & electric — hapus rule dark lama (fill via var)
must(
"""  html[data-theme="dark"] .glass-hero {
    background: linear-gradient(168deg, #ff650a 0%, #f25f06 55%, #e55704 100%);
    box-shadow: 0 20px 48px -22px rgba(224, 88, 10, 0.55);
  }""",
"""  html[data-theme="dark"] .glass-hero {
    background: linear-gradient(168deg, var(--tk-hero-a) 0%, var(--tk-hero-b) 55%, var(--tk-hero-c) 100%);
    box-shadow: var(--tk-hero-shadow);
  }""")

open(P, "w").write(s)
print(" fase A ok — var bantu + var-isasi; delta:", len(s) - len(orig))
