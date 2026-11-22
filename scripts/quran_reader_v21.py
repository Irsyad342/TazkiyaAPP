#!/usr/bin/env python3
"""QuranReader v2.1 (revisi urutan): string spesifik dulu, blanket terakhir."""

P = "/home/z/my-project/src/components/tazkiya/QuranReader.tsx"
s = open(P).read()

REPL = [
    ("border border-[#e8e2da] px-4 py-5 shadow-[0_10px_36px_-18px_rgba(60,40,10,0.3)]",
     "border border-[var(--tk-read-line)] px-4 py-5 shadow-[0_10px_36px_-18px_var(--tk-read-shadow)]", 1),
    ("bg-[#fdf1e3] text-[#b45309]", "bg-[var(--tk-read-num-bg)] text-[var(--tk-read-num-ink)]", 1),
    ("quran-arabic ml-2 text-[15px] font-normal text-tk-violet dark:text-tk-accent",
     "quran-arabic ml-2 text-[15px] font-normal text-tk-ink", 1),
    ("border-[#f0b27a] bg-[#fff7ef] shadow-[inset_0_0_0_1px_#f0b27a]",
     "border-[var(--tk-read-sel-border)] bg-[var(--tk-read-sel-bg)] shadow-[inset_0_0_0_1px_var(--tk-read-sel-border)]", 1),
    ("border-transparent hover:border-[#eee3d4]", "border-transparent hover:border-[var(--tk-read-line)]", 1),
    ('selected ? "bg-[#e04a00] text-white" : "bg-[#f8ede1] text-[#c2410c]"',
     'selected ? "bg-[var(--tk-read-sel-num-bg)] text-white" : "bg-[var(--tk-read-num-bg)] text-[var(--tk-read-num-ink)]"', 1),
    ("bg-[#f8ede1] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#c2410c]",
     "bg-[var(--tk-read-num-bg)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--tk-read-num-ink)]", 1),
    ("border-[#e5b380] bg-[#fdf3e7] text-[#c2410c]",
     "border-[var(--tk-read-bm-border)] bg-[var(--tk-read-bm-bg)] text-[var(--tk-read-num-ink)]", 1),
    ("border-[#e8e2da] bg-white text-[#8a8a8a] hover:text-[#c2410c]",
     "border-[var(--tk-read-line)] bg-white text-[var(--tk-read-hint)] hover:text-[var(--tk-read-num-ink)]", 1),
    ("border border-[#e8e2da] bg-[#faf6f0]", "border border-[var(--tk-read-line)] bg-[var(--tk-read-paper)]", 1),
    # blanket terakhir
    ("text-[#8a8a8a]", "text-[var(--tk-read-hint)]", 0),
    ("text-[#111111]", "text-[var(--tk-read-ink)]", 0),
]

for old, new, want in REPL:
    c = s.count(old)
    if want:
        assert c == want, f"{old[:52]}...: {c} != {want}"
    s = s.replace(old, new)
    print(f"{c}x {old[:58]}")

open(P, "w").write(s)
print("OK")
