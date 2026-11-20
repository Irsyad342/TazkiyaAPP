#!/usr/bin/env python3
"""SUIO — wiring lintas file: meta theme-color per paket tema, kanvas
onboarding, init script anti-flash, dan pemilihan aset mood per colorTheme."""
import sys

def must(path, old, new):
    s = open(path).read()
    if old not in s:
        print(f"MISS in {path}: {old[:80]!r}"); sys.exit(1)
    open(path, "w").write(s.replace(old, new, 1))

# ---------- page.tsx: selector + runtime meta ----------
must("src/app/page.tsx",
"  const theme = useWorshipStore((s) => s.settings.theme);",
"  const theme = useWorshipStore((s) => s.settings.theme);\n  const colorTheme = useWorshipStore((s) => s.settings.colorTheme);")

must("src/app/page.tsx",
"""      // Warna bilah status/URL browser mengikuti tema aktif.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "light" ? "#F2F2F4" : "#292522");
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);""",
"""      // Warna bilah status/URL browser mengikuti tema + paket warna aktif.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", metaColorFor(resolved, colorTheme));
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, colorTheme]);""")

must("src/app/page.tsx",
'import { useWorshipStore } from "@/lib/tazkiya/store";',
'import { useWorshipStore } from "@/lib/tazkiya/store";\nimport { metaColorFor } from "@/lib/tazkiya/colorThemes";')

# ---------- layout.tsx: init script anti-flash ----------
must("src/app/layout.tsx",
'var m=document.querySelector(\'meta[name="theme-color"]\');if(m)m.setAttribute("content",t==="light"?"#F6F2EB":"#292522");',
'var ct=s.colorTheme||"classic";if(ct!=="classic")document.documentElement.dataset.color=ct;var m=document.querySelector(\'meta[name="theme-color"]\');if(m)m.setAttribute("content",t==="light"?(ct==="electric"?"#DFE3F2":"#F2F2F4"):(ct==="electric"?"#171A2C":"#292522"));')

# ---------- OnboardingFlow: CANVAS → helper per paket ----------
must("src/components/tazkiya/OnboardingFlow.tsx",
'''/** Warna kanvas per tema — sinkron dengan CANVAS di app/onboarding/page.tsx. */
const CANVAS = { dark: "var(--tk-shell-bg)", light: "#F6F2EB" } as const;''',
'''/** Warna kanvas onboarding per (mode × paket tema) — sumber: colorThemes. */
const canvasFor = (r: "dark" | "light") =>
  canvasColorFor(r, useWorshipStore.getState().settings.colorTheme);''')

must("src/components/tazkiya/OnboardingFlow.tsx",
'document.querySelector(\'meta[name="theme-color"]\')?.setAttribute("content", CANVAS[r]);',
'document.querySelector(\'meta[name="theme-color"]\')?.setAttribute("content", canvasFor(r));')

must("src/components/tazkiya/OnboardingFlow.tsx",
'className="relative h-dvh w-full overflow-hidden bg-[#F6F2EB] transition-colors duration-500 dark:bg-[var(--tk-shell-bg)]"',
'className="relative h-dvh w-full overflow-hidden bg-[var(--tk-canvas-bg)] transition-colors duration-500"')

must("src/components/tazkiya/OnboardingFlow.tsx",
'import { useWorshipStore } from "@/lib/tazkiya/store";',
'import { useWorshipStore } from "@/lib/tazkiya/store";\nimport { canvasColorFor } from "@/lib/tazkiya/colorThemes";')

# ---------- app/onboarding/page.tsx: meta per paket ----------
must("src/app/onboarding/page.tsx",
'''/** Kanvas onboarding per tema — harus sinkron dengan bg OnboardingFlow (v15). */
const CANVAS = { dark: "#171717", light: "#F7F5F2" } as const;''',
'''/** Kanvas onboarding per (mode × paket tema) — sinkron bg OnboardingFlow. */
const CANVAS = { dark: "#292522", light: "#F6F2EB" } as const;
const CANVAS_ELECTRIC = { dark: "#1D2136", light: "#F0F2FC" } as const;

function resolveStoredColorTheme(): string {
  try {
    return JSON.parse(localStorage.getItem("tazkiya-store-v1") || "{}")?.state?.settings?.colorTheme || "classic";
  } catch {
    return "classic";
  }
}''')

must("src/app/onboarding/page.tsx",
'    const theme = resolveStoredTheme();\n    document.documentElement.dataset.theme = theme;\n    meta?.setAttribute("content", CANVAS[theme]);',
'    const theme = resolveStoredTheme();\n    document.documentElement.dataset.theme = theme;\n    const canvas = resolveStoredColorTheme() === "electric" ? CANVAS_ELECTRIC : CANVAS;\n    if (resolveStoredColorTheme() === "electric") document.documentElement.dataset.color = "electric";\n    meta?.setAttribute("content", canvas[theme]);')

# ---------- MoodFace: pilih set aset per paket ----------
must("src/components/tazkiya/MoodFace.tsx",
'''import { cn } from "@/lib/utils";
import type { MoodId } from "@/lib/tazkiya/types";''',
'''import { cn } from "@/lib/utils";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { MoodId } from "@/lib/tazkiya/types";''')

must("src/components/tazkiya/MoodFace.tsx",
'''        src={`/mood/${id}.png`}''',
'''        src={colorTheme === "electric" ? `/mood/electric/${id}.png` : `/mood/${id}.png`}''')

must("src/components/tazkiya/MoodFace.tsx",
'''        src={`/mood/dark/${id}.png`}''',
'''        src={colorTheme === "electric" ? `/mood/electric-dark/${id}.png` : `/mood/dark/${id}.png`}''')

# sisipkan hook di awal komponen MoodFace
s = open("src/components/tazkiya/MoodFace.tsx").read()
anchor = "  fx = \"none\","
i = s.find(anchor)
j = s.find("): ", i)
insert = "\n  const colorTheme = useWorshipStore((st) => st.settings.colorTheme);\n"
s = s[:j] + insert + "  " + s[j:].lstrip()
open("src/components/tazkiya/MoodFace.tsx", "w").write(s)

print("wiring ok")
