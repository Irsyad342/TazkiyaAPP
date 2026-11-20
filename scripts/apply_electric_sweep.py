#!/usr/bin/env python3
"""SUIO — tahap 2c: koreksi var mode-dependen + sweep TSX oranye → var(--tk-*).

- --tk-shell-bg/-outer dan --tk-dock-* harus BERBEDA antara light & dark klasik:
  :root = nilai light, blok dark klasik = nilai dark.
- Sweep TSX: literal oranye → var tema sehingga Electric Dream otomatis.
"""
import glob, re, sys

# ---------- A) koreksi globals.css ----------
P = "src/app/globals.css"
s = open(P).read()
def must(old, new):
    global s
    if old not in s:
        print("MISS:", old[:90]); sys.exit(1)
    s = s.replace(old, new, 1)

# :root classic — nilai shell LIGHT
must("""  --tk-shell-bg: #292522;         /* kanvas <main> */
  --tk-shell-outer: #292522;      /* html di luar shell (letterbox desktop) */""",
"""  --tk-shell-bg: #edebe7;         /* kanvas <main> — light klasik */
  --tk-shell-outer: #f2f2f4;      /* html di luar shell (letterbox desktop) */
  --tk-ring-ink: #2a2320;         /* ring netral light (rgba via modifier) */
  --tk-tip-bg: rgba(59, 52, 47, 0.95); /* tooltip chart dark */
  --tk-d-ink-hi: #f6eee3;
  --tk-d-ink-mid: #b8a795;
  --tk-d-ink-soft: #e8d8c4;""")
# blok dark klasik — shell & dock dark
must("""  /* Teks-netral khusus dark (dipakai kelas dark: pada komponen) */
  --tk-d-ink-hi: #f6eee3;
  --tk-d-ink-mid: #b8a795;
  --tk-d-ink-soft: #e8d8c4;
}""",
"""  /* Teks-netral khusus dark (dipakai kelas dark: pada komponen) */
  --tk-d-ink-hi: #f6eee3;
  --tk-d-ink-mid: #b8a795;
  --tk-d-ink-soft: #e8d8c4;
  /* Shell & dock dark klasik (var mode-dependen) */
  --tk-shell-bg: #292522;
  --tk-shell-outer: #292522;
  --tk-tip-bg: rgba(59, 52, 47, 0.95);
  --tk-dock-a: 82, 68, 57;
  --tk-dock-b: 50, 42, 35;
  --tk-dock-solid: #4a3e33;
  --tk-dock-shadow: 0 18px 44px -14px rgba(12, 6, 2, 0.7);
}""")
# elektrik dark & light: ring-ink + tip-bg
must("""  --tk-dock-a: 42, 48, 79;
  --tk-dock-b: 23, 26, 45;
  --tk-dock-solid: #2a3050;
  --tk-dock-shadow: 0 18px 44px -14px rgba(10, 14, 34, 0.6);""",
"""  --tk-dock-a: 42, 48, 79;
  --tk-dock-b: 23, 26, 45;
  --tk-dock-solid: #2a3050;
  --tk-dock-shadow: 0 18px 44px -14px rgba(10, 14, 34, 0.6);
  --tk-ring-ink: #23273d;
  --tk-tip-bg: rgba(42, 47, 78, 0.95);""")
must("""  --tk-dock-a: 46, 52, 86;
  --tk-dock-b: 26, 30, 52;
  --tk-dock-solid: #2a3050;
  --tk-dock-shadow: 0 18px 44px -14px rgba(5, 8, 20, 0.65);""",
"""  --tk-dock-a: 46, 52, 86;
  --tk-dock-b: 26, 30, 52;
  --tk-dock-solid: #2a3050;
  --tk-dock-shadow: 0 18px 44px -14px rgba(5, 8, 20, 0.65);
  --tk-ring-ink: #9fa8d8;
  --tk-tip-bg: rgba(42, 47, 78, 0.95);""")
open(P, "w").write(s)
print("A) globals.css koreksi ok")

# ---------- B) sweep TSX ----------
MAP = [
    # rgba oranye → brand-rgb (urutan penting: spasi & tanpa spasi)
    ("rgba(255, 90, 0,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(255,90,0,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(255, 101, 10,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(255,101,10,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(250, 82, 0,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(250,82,0,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(217, 75, 10,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(217,75,10,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(255, 107, 38,", "rgba(var(--tk-brand-rgb),"),
    ("rgba(224, 88, 10,", "rgba(var(--tk-brand-rgb),"),
    # hex brand
    ("#FF650A", "var(--tk-brand)"), ("#ff650a", "var(--tk-brand)"),
    ("#FF9A52", "var(--tk-brand-soft)"), ("#FF9B63", "var(--tk-brand-soft)"),
    ("#D94B0A", "var(--tk-brand-deep)"), ("#E55704", "var(--tk-brand-deep)"),
    ("#ef5203", "var(--tk-brand-deep)"), ("#e14d08", "var(--tk-brand-deep)"),
    # tint kartu terang klasik → tint var
    ("#FFE0CC", "var(--tk-tint-a)"), ("#ffe0cc", "var(--tk-tint-a)"),
    ("#FFF6EC", "var(--tk-tint-b)"), ("#FFF6EA", "var(--tk-tint-b)"),
    ("#fff6ec", "var(--tk-tint-b)"), ("#fff6ea", "var(--tk-tint-b)"),
    ("#FFEFDF", "var(--tk-tint-c)"), ("#ffefdf", "var(--tk-tint-c)"),
    # hint hangat
    ("#F5E8DC", "var(--tk-hint)"), ("#f5e8dc", "var(--tk-hint)"),
    # ring netral light
    ("#2a2320", "var(--tk-ring-ink)"),
]

# Pemetaan permukaan dark (kartu/ilustrasi) → token permukaan
SURF = [
    ("#463D36", "var(--color-tk-white-card)"), ("#463d36", "var(--color-tk-white-card)"),
    ("#3B342F", "var(--color-tk-panel)"), ("#3b342f", "var(--color-tk-panel)"),
    ("#342D28", "var(--color-tk-panel-soft)"), ("#342d28", "var(--color-tk-panel-soft)"),
    ("#302B27", "var(--color-tk-panel-soft)"), ("#302b27", "var(--color-tk-panel-soft)"),
    ("#3F3830", "var(--color-tk-light-card)"),
    ("#4A3E33", "var(--color-tk-panel-strong)"),
    ("#4C3A2A", "var(--color-tk-lavender)"),
    ("#2C5A40", "var(--color-tk-lime)"),
    ("#51463D", "var(--color-tk-panel-strong)"),
    ("#292522", "var(--tk-shell-bg)"),
    # teks-netral dark
    ("#F6EEE3", "var(--tk-d-ink-hi)"),
    ("#B8A795", "var(--tk-d-ink-mid)"),
    ("#E8D8C4", "var(--tk-d-ink-soft)"),
]

FILES = [
    "src/components/tazkiya/onboarding-art.tsx",
    "src/components/tazkiya/WeeklyReflection.tsx",
    "src/components/tazkiya/OnboardingFlow.tsx",
    "src/components/tazkiya/JurnalPage.tsx",
    "src/components/tazkiya/ProfilePage.tsx",
    "src/components/tazkiya/MoodSection.tsx",
    "src/components/tazkiya/AreaChartLite.tsx",
    "src/components/tazkiya/PrayerPage.tsx",
    "src/components/tazkiya/HomePage.tsx",
    "src/components/tazkiya/TasbihFullscreen.tsx",
    "src/components/tazkiya/PrayerReminder.tsx",
    "src/components/tazkiya/JournalCalendar.tsx",
    "src/components/tazkiya/BottomNav.tsx",
    "src/components/tazkiya/MoodFace.tsx",
    "src/components/tazkiya/brand.tsx",
    "src/components/tazkiya/ui-bits.tsx",
    "src/components/tazkiya/ZikirDoaPage.tsx",
    "src/components/tazkiya/RizqAmalPage.tsx",
    "src/components/tazkiya/QuranPage.tsx",
    "src/components/tazkiya/ProgressPage.tsx",
    "src/components/tazkiya/DayDetailSheet.tsx",
    "src/components/tazkiya/TargetSheet.tsx",
    "src/components/tazkiya/MushafIntro.tsx",
    "src/components/tazkiya/FridayCard.tsx",
    "src/components/tazkiya/FridayFullscreen.tsx",
    "src/components/tazkiya/JelajahiAktivitas.tsx",
    "src/components/tazkiya/MotivationPopup.tsx",
    "src/components/tazkiya/SubPageHeader.tsx",
    "src/components/tazkiya/ornaments.tsx",
    "src/components/tazkiya/AuthGate.tsx",
    "src/app/auth/page.tsx",
    "src/app/page.tsx",
]
changed = {}
for f in FILES:
    try:
        t = open(f).read()
    except FileNotFoundError:
        continue
    t0 = t
    for a, b in MAP + SURF:
        t = t.replace(a, b)
    if t != t0:
        open(f, "w").write(t)
        changed[f] = sum(t0.count(a) for a, _ in MAP + SURF)
for f, n in sorted(changed.items(), key=lambda x: -x[1]):
    print(f"  {n:3d}  {f}")
print("B) sweep selesai:", len(changed), "file")
