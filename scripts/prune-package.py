#!/usr/bin/env python3
"""Prune unused deps from Tazkiya package.json (build-time optimization).
Keeps everything the app actually imports; removes scaffold leftovers."""
import json

REMOVE = [
    "@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities",
    "@hookform/resolvers", "@mdxeditor/editor", "@prisma/client", "prisma",
    "@radix-ui/react-accordion", "@radix-ui/react-aspect-ratio", "@radix-ui/react-avatar",
    "@radix-ui/react-checkbox", "@radix-ui/react-collapsible", "@radix-ui/react-context-menu",
    "@radix-ui/react-dropdown-menu", "@radix-ui/react-hover-card", "@radix-ui/react-label",
    "@radix-ui/react-menubar", "@radix-ui/react-navigation-menu", "@radix-ui/react-popover",
    "@radix-ui/react-progress", "@radix-ui/react-radio-group", "@radix-ui/react-scroll-area",
    "@radix-ui/react-select", "@radix-ui/react-separator", "@radix-ui/react-slider",
    "@radix-ui/react-tabs", "@radix-ui/react-toast", "@radix-ui/react-toggle",
    "@radix-ui/react-toggle-group", "@radix-ui/react-tooltip",
    "@reactuses/core", "@tanstack/react-query", "@tanstack/react-table",
    "cmdk", "date-fns", "embla-carousel-react", "input-otp",
    "next-auth", "next-intl", "next-themes",
    "react-day-picker", "react-hook-form", "react-markdown",
    "react-resizable-panels", "react-syntax-highlighter",
    "sharp", "uuid", "vaul", "z-ai-web-dev-sdk", "zod",
]
REMOVE_SCRIPTS = ["db:push", "db:generate", "db:migrate", "db:reset"]

path = "/home/z/my-project/package.json"
with open(path) as f:
    pkg = json.load(f)

before = len(pkg["dependencies"])
pkg["dependencies"] = {k: v for k, v in pkg["dependencies"].items() if k not in REMOVE}
for s in REMOVE_SCRIPTS:
    pkg["scripts"].pop(s, None)

with open(path, "w") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")

removed = before - len(pkg["dependencies"])
print(f"Removed {removed} deps. Remaining deps:")
for k in sorted(pkg["dependencies"].keys()):
    print("  ", k)
print(f"Scripts: {sorted(pkg['scripts'].keys())}")
