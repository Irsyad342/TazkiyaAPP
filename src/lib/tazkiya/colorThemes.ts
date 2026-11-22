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
    name: "Original Orange",
    tagline: "Identitas oranye asli SUIO",
    description:
      "Palet oranye hangat khas SUIO: kanvas arang hangat, kartu brown yang selalu lebih terang dari latar, dan aksen Primary Orange dengan sorot Soft Orange. Tema default — dipakai otomatis oleh pengguna baru dan Welcome Screen.",
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
      neon: "#FFB35C",
      neonInk: "#3D2A00",
      navy: "#3B342F",
      line: "#E7E2DD",
    },
  },
  {
    id: "electric",
    name: "Elemental Dream",
    tagline: "Biru elektrik · cyan · lime lembut",
    description:
      "Electric Blue memimpin identitas, Sky Cyan memberi napas, dan lime lembut — soft, muted, tidak menyilaukan — jadi ciri khas aksen. Dark Mode dibangun di atas charcoal bervariasi; modern, elegan, dan nyaman di mata. Hanya aktif bila dipilih secara eksplisit.",
    swatches: ["#3A4EFB", "#33A4FA", "#B5CE8B", "#252943", "#DEE0ED"],
    mock: {
      shell: "#E9EBF6",
      heroA: "#3A4EFB",
      heroB: "#33A4FA",
      heroInk: "#FFFFFF",
      card: "#FFFFFF",
      cardInk: "#252943",
      cardSub: "#7A80A0",
      accent: "#3A4EFB",
      neon: "#B5CE8B",
      neonInk: "#26300F",
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
