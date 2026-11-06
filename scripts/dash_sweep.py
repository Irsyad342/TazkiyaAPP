#!/usr/bin/env python3
"""
SUIO v13 — Sapuan tipografi: hapus em dash (—) sebagai pemisah kalimat
pada SELURUH teks antarmuka. Aturan user: tidak ada strip/em dash/en dash
sebagai pemisah; pengganti koma/titik/titik dua. Identifier teknis, kode,
URL, dan komentar kode TIDAK disentuh.

Aturan penggantian per baris:
- Baris komentar (//, *, /*) dilewati.
- " — " di dalam string/template literal -> ", " (pemisah kalimat).
- "— Pilih —" -> "Pilih" (placeholder select).
- Tanpa spasi di sekelilingnya: dilaporkan untuk kurasi manual.
"""
import pathlib, re, sys

ROOT = pathlib.Path("/home/z/my-project/src")
SKIP_COMMENT = re.compile(r"^\s*(//|\*|/\*)")
MANUAL = {
    " — Pilih — ": " Pilih ",
    "— Pilih —": "Pilih",
}

changed = []
for path in sorted(ROOT.rglob("*")):
    if path.suffix not in {".ts", ".tsx"}:
        continue
    text = path.read_text()
    out_lines = []
    file_touched = False
    for ln, line in enumerate(text.splitlines(), 1):
        if SKIP_COMMENT.match(line) or "—" not in line:
            out_lines.append(line)
            continue
        new = line
        for k, v in MANUAL.items():
            new = new.replace(k, v)
        # pemisah kalimat berspasi (juga menangani prefix template ` — ${...}`)
        new = new.replace(" — ", ", ")
        if "—" in new:
            print(f"MANUAL[{path}:{ln}]: {new.strip()[:160]}")
        if new != line:
            changed.append((path, ln, line.strip()[:90]))
            file_touched = True
        out_lines.append(new)
    if file_touched:
        path.write_text("\n".join(out_lines) + ("\n" if text.endswith("\n") else ""))

print(f"\n{len(changed)} baris diubah")
