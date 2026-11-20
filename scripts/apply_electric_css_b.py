#!/usr/bin/env python3
"""SUIO — tahap 2b: blok token ELECTRIC DREAM (append di akhir globals.css).

Hierarki spesifisitas (semua blok di akhir file):
- html[data-color="electric"]                               → light elektrik
- html[data-theme="dark"][data-color="electric"]            → dark elektrik (navy)
- html[data-theme="dark"][data-color="electric"][data-glass-level=…] → preset glass
"""
P = "src/app/globals.css"
s = open(P).read()

BLOCK = r'''
/* ============================================================
   THEME GALLERY — TEMA 1: ELECTRIC DREAM (SUIO)
   Palet referensi: Electric Blue #3A4EFB · Sky Cyan #33A4FA ·
   Neon Lime #E3FF3B · Deep Navy #252943 · Lavender Gray #DEE0ED.
   Light = putih bersih + tint lavender, aksen biru, lime selektif.
   Dark = Deep Navy BERVARIASI (bukan hitam): kanvas #1D2136,
   kartu #2A2F4D, elevated #333A5E — biru tetap hidup di semua lapis.
   Blok di-append di akhir agar menang atas preset glass klasik.
   ============================================================ */

/* ---------- ELECTRIC DREAM — LIGHT ---------- */
html[data-color="electric"] {
  --background: #f3f4fb;
  --foreground: #23273d;
  --card: #ffffff;
  --card-foreground: #23273d;
  --popover: #ffffff;
  --popover-foreground: #23273d;
  --primary: #3a4efb;
  --primary-foreground: #ffffff;
  --secondary: #e7ebfb;
  --secondary-foreground: #2f3fd6;
  --muted: #e9ecf7;
  --muted-foreground: #5d6485;
  --accent: #e7ebfb;
  --accent-foreground: #2f3fd6;
  --destructive: #d33b40;
  --border: #dbdfee;
  --input: #e2e6f4;
  --ring: #3a4efb;
  --chart-1: #3a4efb;
  --chart-2: #2e8b57;
  --chart-3: #33a4fa;
  --chart-4: #8a7a14;
  --chart-5: #5b78ff;
  --sidebar: #ffffff;
  --sidebar-foreground: #23273d;
  --sidebar-primary: #3a4efb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e7ebfb;
  --sidebar-accent-foreground: #2f3fd6;
  --sidebar-border: #dbdfee;
  --sidebar-ring: #3a4efb;
  --tk-inset: rgba(37, 41, 67, 0.06);
  --tk-ring-soft: rgba(58, 78, 251, 0.16);
  --tk-chart-grid: #e4e7f2;
  --tk-chart-axis: #7a80a0;
  --tk-empty-cell: #edeff8;
  --tk-float-shadow: 0 24px 64px -24px rgba(37, 41, 67, 0.22);
  --color-tk-ink: #23273d;
  --color-tk-muted: #5d6485;
  --color-tk-deep: #8a90ac;
  --color-tk-violet: #3a4efb;
  --color-tk-lavender: #dfe5ff;
  --color-tk-lav-deco: #c7d2ff;
  --color-tk-line: #dbdfee;
  --color-tk-accent: #2f3fd6;
  --color-tk-copper: #4f7cff;
  --color-tk-cream: #eff2ff;
  --color-tk-peach: #dce6ff;
  --color-tk-frame: #f3f4fb;
  --color-tk-stage: #f3f4fb;
  --color-tk-panel: #ffffff;
  --color-tk-panel-soft: #e9ecf7;
  --color-tk-panel-strong: #e2e6f4;
  --color-tk-line-soft: #e7eaf5;
  --color-tk-line-strong: #c9cfe4;
  --color-tk-track: #e2e6f4;
  --color-tk-white-card: #ffffff;
  --color-tk-light-card: #eef0f9;
  --color-tk-lime: #e1f4e9;
  --color-tk-lime-ink: #1e6b40;
  --color-tk-lime-soft: #eaf7ef;
  --color-tk-blue: #3a4efb;
  --color-tk-blue-soft: #dce6ff;
  --color-tk-mint: #dfe5ff;
  --color-tk-forest: #2f3fd6;
  --color-tk-amber: #8a7a14;
  --color-tk-amber-soft: #f4f1d9;
  --color-tk-teal: #0e8a7b;
  --color-tk-green: #2e8b57;
  --color-tk-green-soft: #eaf6ef;
  --color-tk-rose: #e5484d;
  --color-tk-sky-soft: #dce6ff;
  /* Var bantu — elektrik light */
  --tk-brand: #3a4efb;
  --tk-brand-rgb: 58, 78, 251;
  --tk-brand-soft: #33a4fa;
  --tk-brand-deep: #2f3fd6;
  --tk-neon: #e3ff3b;
  --tk-neon-ink: #2a2e14;
  --tk-shell-bg: #e9ebf6;
  --tk-shell-outer: #dfe3f2;
  --tk-hint: #c9d4ff;
  --tk-tint-a: #dce6ff;
  --tk-tint-b: #eff2ff;
  --tk-tint-c: #e4ebff;
  --tk-dock-a: 42, 48, 79;
  --tk-dock-b: 23, 26, 45;
  --tk-dock-solid: #2a3050;
  --tk-dock-shadow: 0 18px 44px -14px rgba(10, 14, 34, 0.6);
  --tk-hero-a: #3a4efb; --tk-hero-b: #3a4efb; --tk-hero-c: #2f3fd6;
  --tk-hero-shadow: 0 20px 48px -22px rgba(58, 78, 251, 0.5);
  /* Glass light elektrik: bayangan dingin, border biru lembut */
  --su-border-d: rgba(158, 175, 255, 0.22);
  --su-shadow: 0 10px 30px -14px rgba(37, 41, 67, 0.25);
}

/* ---------- ELECTRIC DREAM — DARK (Deep Navy bervariasi) ---------- */
html[data-theme="dark"][data-color="electric"] {
  --background: #1d2136;
  --foreground: #eef0fc;
  --card: #2a2f4d;
  --card-foreground: #eef0fc;
  --popover: #333a5e;
  --popover-foreground: #eef0fc;
  --primary: #5b78ff;
  --primary-foreground: #ffffff;
  --secondary: #333a5e;
  --secondary-foreground: #82aeff;
  --muted: #232742;
  --muted-foreground: #b9bfdb;
  --accent: #333a5e;
  --accent-foreground: #82aeff;
  --destructive: #ff6369;
  --border: rgba(222, 224, 237, 0.14);
  --input: #333a5e;
  --ring: #5b78ff;
  --chart-1: #5b78ff;
  --chart-2: #58b877;
  --chart-3: #33a4fa;
  --chart-4: #ffd34d;
  --chart-5: #8f9fff;
  --sidebar: #232742;
  --sidebar-foreground: #eef0fc;
  --sidebar-primary: #5b78ff;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #333a5e;
  --sidebar-accent-foreground: #82aeff;
  --sidebar-border: #333a5e;
  --sidebar-ring: #5b78ff;
  --tk-inset: rgba(0, 0, 0, 0.22);
  --tk-ring-soft: rgba(91, 120, 255, 0.26);
  --tk-chart-grid: #3a4064;
  --tk-chart-axis: #9ba2c4;
  --tk-empty-cell: #262b47;
  --tk-float-shadow: 0 24px 64px -24px rgba(5, 8, 20, 0.6);
  --color-tk-ink: #eef0fc;
  --color-tk-muted: #b9bfdb;
  --color-tk-deep: #8c93b4;
  --color-tk-violet: #3a4efb;
  --color-tk-lavender: #2a3054;
  --color-tk-lav-deco: #3a4270;
  --color-tk-line: rgba(222, 224, 237, 0.14);
  --color-tk-accent: #82aeff;
  --color-tk-copper: #7fa8ff;
  --color-tk-cream: #333a5e;
  --color-tk-peach: #a9d4ff;
  --color-tk-frame: #1d2136;
  --color-tk-stage: #1d2136;
  --color-tk-panel: #2a2f4d;
  --color-tk-panel-soft: #232742;
  --color-tk-panel-strong: #333a5e;
  --color-tk-line-soft: rgba(222, 224, 237, 0.09);
  --color-tk-line-strong: rgba(222, 224, 237, 0.24);
  --color-tk-track: #333a5e;
  --color-tk-white-card: #303656;
  --color-tk-light-card: #2b3050;
  --color-tk-lime: #27563b;
  --color-tk-lime-ink: #a0e8c0;
  --color-tk-lime-soft: #233b2e;
  --color-tk-blue-soft: #2a3160;
  --color-tk-amber-soft: #3a3d63;
  --color-tk-green-soft: #233b2e;
  --color-tk-sky-soft: #2a3160;
  /* Var bantu — elektrik dark (navy) */
  --tk-brand: #3a4efb;
  --tk-brand-rgb: 58, 78, 251;
  --tk-brand-soft: #33a4fa;
  --tk-brand-deep: #2f3fd6;
  --tk-neon: #e3ff3b;
  --tk-neon-ink: #252943;
  --tk-shell-bg: #1d2136;
  --tk-shell-outer: #171a2c;
  --tk-hint: #9fb0ff;
  --tk-tint-a: #2a3054;
  --tk-tint-b: #333a5e;
  --tk-tint-c: #2e3456;
  --tk-dock-a: 46, 52, 86;
  --tk-dock-b: 26, 30, 52;
  --tk-dock-solid: #2a3050;
  --tk-dock-shadow: 0 18px 44px -14px rgba(5, 8, 20, 0.65);
  --tk-hero-a: #3a4efb; --tk-hero-b: #3a4efb; --tk-hero-c: #2f3fd6;
  --tk-hero-shadow: 0 20px 48px -22px rgba(58, 78, 251, 0.5);
  --tk-d-ink-hi: #eaedff;
  --tk-d-ink-mid: #9fa8d8;
  --tk-d-ink-soft: #c6cdf0;
  /* Glass dark elektrik: navy luminous, glow biru-cyan (bukan abu kusam) */
  --su-border-d: rgba(150, 175, 255, 0.22);
  --su-shadow-d: 0 14px 34px -18px rgba(5, 8, 20, 0.55);
}

/* ---------- Liquid Glass ELECTRIC DARK — navy luminous ---------- */
html[data-theme="dark"][data-color="electric"] .glass {
  background: linear-gradient(160deg, rgba(54, 60, 98, var(--su-ad)) 0%, rgba(40, 45, 76, calc(var(--su-ad) - 0.1)) 52%, rgba(50, 56, 90, var(--su-ad)) 100%);
  border: 1px solid var(--su-border-d);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, var(--su-inner-d)),
    inset 0 -1px 0 rgba(51, 164, 250, calc(var(--su-glow) * 0.8)),
    inset 0 18px 28px -22px rgba(91, 120, 255, calc(var(--su-glow) * 0.6)),
    0 0 28px -12px rgba(58, 78, 251, var(--su-glow)),
    var(--su-shadow-d);
}
html[data-theme="dark"][data-color="electric"] .glass-strong {
  background: linear-gradient(160deg, rgba(60, 67, 108, var(--su-float-ad)) 0%, rgba(44, 50, 84, calc(var(--su-float-ad) - 0.06)) 100%);
  border: 1px solid var(--su-border-d);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, calc(var(--su-inner-d) + 0.06)),
    inset 0 -1px 0 rgba(51, 164, 250, calc(var(--su-glow) * 0.9)),
    0 0 32px -12px rgba(58, 78, 251, var(--su-glow)),
    0 28px 64px -26px rgba(5, 8, 20, 0.55);
}
html[data-theme="dark"][data-color="electric"] .su-glass {
  background: linear-gradient(155deg, rgba(56, 62, 102, var(--su-ad)) 0%, rgba(42, 47, 78, calc(var(--su-ad) - 0.08)) 52%, rgba(52, 58, 94, var(--su-ad)) 100%);
  border: 1px solid var(--su-border-d);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, var(--su-inner-d)),
    inset 0 -1px 0 rgba(51, 164, 250, calc(var(--su-glow) * 0.8)),
    0 0 26px -12px rgba(58, 78, 251, calc(var(--su-glow) * 0.9)),
    0 18px 44px -22px rgba(5, 8, 20, 0.5);
}
html[data-theme="dark"][data-color="electric"] .tk-card-white {
  background: linear-gradient(155deg, rgba(56, 62, 100, var(--su-ad)) 0%, rgba(42, 47, 78, calc(var(--su-ad) - 0.08)) 100%);
  color: #eef0fc;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, var(--su-inner-d)),
    inset 0 -1px 0 rgba(51, 164, 250, calc(var(--su-glow) * 0.8)),
    0 0 24px -12px rgba(58, 78, 251, calc(var(--su-glow) * 0.8)),
    var(--su-shadow-d);
}
html[data-theme="dark"][data-color="electric"] .glass-violet {
  background: linear-gradient(180deg, #2a3054 0%, #232845 100%);
}
html[data-theme="dark"][data-color="electric"] .fr-badge {
  background: rgba(127, 168, 255, 0.16);
  color: #82aeff;
}
html[data-theme="dark"][data-color="electric"] .fr-check-on { border-color: rgba(58, 78, 251, 0.4); background: rgba(58, 78, 251, 0.16); }

/* Preset glass elektrik dark — tiga tingkat tetap jelas berbeda */
html[data-theme="dark"][data-color="electric"][data-glass-level="subtle"] {
  --su-ad: 0.97;
  --su-border-d: rgba(150, 175, 255, 0.12);
  --su-inner-d: 0.12;
  --su-glow: 0.03;
  --su-spec-d: 0.04;
  --su-float-ad: 0.98;
}
html[data-theme="dark"][data-color="electric"][data-glass-level="strong"] {
  --su-ad: 0.54;
  --su-border-d: rgba(150, 175, 255, 0.38);
  --su-inner-d: 0.26;
  --su-glow: 0.3;
  --su-spec-d: 0.2;
  --su-float-ad: 0.7;
}
/* Preset glass elektrik LIGHT — border/glow mengikuti identitas biru */
html[data-color="electric"][data-glass-level="subtle"] { --su-border-d: rgba(158, 175, 255, 0.12); }
html[data-color="electric"][data-glass-level="strong"] { --su-border-d: rgba(158, 175, 255, 0.4); }
'''

s = s.rstrip() + "\n" + BLOCK
open(P, "w").write(s)
print(" fase B ok — blok elektrik di-append")
