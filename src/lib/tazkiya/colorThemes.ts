/**
 * SUIO — Theme Gallery: definisi paket tema warna (satu sumber kebenaran).
 *
 * Satu entri = satu paket palet lengkap (bukan pilihan warna per elemen).
 * Token CSS tiap tema hidup di globals.css di bawah
 * html[data-color="<id>"] (+ pasangan html[data-theme="dark"][data-color=…]).
 * Menambah tema baru = tambah blok token di globals.css + entri di sini —
 * tanpa menyentuh halaman/komponen mana pun.
 */

import type { ColorThemeId } from "./types";

export interface ColorThemeDef {
  id: ColorThemeId;
  name: string;
  tagline: string;
  description: string;
  /** Lima warna identitas — urutan: primer, sekunder, highlight, gelap, netral. */
  swatches: string[];
  /** Palet mini-ilustrasi galeri (statis per tema, independen mode aktif). */
  mock: {
    shell: string;
    heroA: string;
    heroB: string;
    heroInk: string;
    card: string;
    cardInk: string;
    cardSub: string;
    accent: string;
    neon: string;
    neonInk: string;
    navy: string;
    line: string;
  };
}

export const DEFAULT_COLOR_THEME: ColorThemeId = "classic";

export const COLOR_THEMES: ColorThemeDef[] = [
  {
    id: "classic",
    name: "Klasik Hangat",
    tagline: "Identitas bawaan SUIO",
    description:
      "Palet hangat khas SUIO: kanvas arang hangat, kartu brown yang selalu lebih terang dari latar, dan aksen Primary Orange dengan sorot Soft Orange.",
    swatches: ["#FF650A", "#FF9B63", "#3B342F", "#292522", "#FFF8F1"],
    mock: {
      shell: "#EDEBE7",
      heroA: "#FF650A",
      heroB: "#FF9B63",
      heroInk: "#FFFFFF",
      card: "#FFFFFF",
      cardInk: "#202020",
      cardSub: "#8A8A8A",
      accent: "#FF650A",
      neon: "#FFE0CC",
      neonInk: "#C94300",
      navy: "#3B342F",
      line: "#E7E2DD",
    },
  },
  {
    id: "electric",
    name: "Electric Dream",
    tagline: "Biru elektrik · cyan · lime neon",
    description:
      "Electric Blue memimpin identitas, Sky Cyan memberi napas, dan Neon Lime jadi highlight yang mengelektrisasi. Dark Mode dibangun di atas Deep Navy yang bervariasi — biru tetap hidup, bukan hitam.",
    swatches: ["#3A4EFB", "#33A4FA", "#E3FF3B", "#252943", "#DEE0ED"],
    mock: {
      shell: "#E9EBF6",
      heroA: "#3A4EFB",
      heroB: "#33A4FA",
      heroInk: "#FFFFFF",
      card: "#FFFFFF",
      cardInk: "#252943",
      cardSub: "#7A80A0",
      accent: "#3A4EFB",
      neon: "#E3FF3B",
      neonInk: "#252943",
      navy: "#252943",
      line: "#DBDFEE",
    },
  },
];

export const findColorTheme = (id: ColorThemeId | undefined): ColorThemeDef =>
  COLOR_THEMES.find((t) => t.id === (id ?? DEFAULT_COLOR_THEME)) ?? COLOR_THEMES[0];

/** Warna meta theme-color per (mode terpecah × paket tema). */
export function metaColorFor(resolved: "dark" | "light", ct: ColorThemeId | undefined): string {
  const electric = (ct ?? DEFAULT_COLOR_THEME) === "electric";
  if (electric) return resolved === "light" ? "#DFE3F2" : "#171A2C";
  return resolved === "light" ? "#F2F2F4" : "#292522";
}

/** Warna kanvas onboarding per (mode × paket) — sinkron --tk-canvas-bg globals.css. */
export function canvasColorFor(resolved: "dark" | "light", ct: ColorThemeId | undefined): string {
  const electric = (ct ?? DEFAULT_COLOR_THEME) === "electric";
  if (electric) return resolved === "light" ? "#F0F2FC" : "#1D2136";
  return resolved === "light" ? "#F6F2EB" : "#292522";
}
