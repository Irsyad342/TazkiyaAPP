/**
 * Tazkiya — Lapisan data Al-Qur'an.
 * Teks Uthmani & terjemahan Kemenag RI dari AlQuran Cloud API.
 * Surah yang pernah dibuka di-cache ke localStorage (LRU, maks. 15 surah)
 * agar tetap bisa dibaca saat offline. Ringan: tanpa audio/murottal.
 */

import { SURAHS as SURAH_LIST, getSurah } from "./surahs";

export { SURAH_LIST, getSurah };

export type { SurahMeta } from "./surahs";
import type { SurahMeta } from "./surahs";

export interface JuzBoundary {
  juz: number;
  surah: number;
  ayah: number;
}

/** Awal setiap juz (batas baku mushaf). */
export const JUZ_STARTS: JuzBoundary[] = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];

export interface JuzRange {
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  surahs: number[];
}

export const JUZ_RANGES: JuzRange[] = JUZ_STARTS.map((start, i) => {
  let endSurah: number;
  let endAyah: number;
  const next = JUZ_STARTS[i + 1];
  if (next) {
    if (next.ayah > 1) {
      endSurah = next.surah;
      endAyah = next.ayah - 1;
    } else {
      endSurah = next.surah - 1;
      endAyah = getSurah(endSurah)?.verses ?? 1;
    }
  } else {
    endSurah = 114;
    endAyah = getSurah(114)?.verses ?? 6;
  }
  const surahs = SURAH_LIST.filter((s) => s.number >= start.surah && s.number <= endSurah).map((s) => s.number);
  return {
    juz: start.juz,
    startSurah: start.surah,
    startAyah: start.ayah,
    endSurah,
    endAyah,
    surahs,
  };
});

/* ---------------- Cache LRU di localStorage ---------------- */

const QURAN_INDEX_KEY = "tazkiya-quran-index";
const MAX_CACHED_SURAHS = 15;
const MAX_AGE_MS = 2_592_000_000; // 30 hari

export interface AyahData {
  global: number; // nomor ayat global 1..6236
  number: number; // nomor ayat dalam surah
  text: string; // teks Arab (bismillah sudah dilepas dari ayat 1)
  translation: string; // terjemahan Kemenag RI
  page: number;
  juz: number;
}

export interface SurahData {
  surah: SurahMeta;
  bismillah: string | null;
  ayahs: AyahData[];
  fetchedAt: number;
  fromCache?: boolean;
}

export type SurahFetchResult =
  | { ok: true; data: SurahData }
  | { ok: false; offline: boolean; message: string };

function readCache(key: string): SurahData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    touchIndex(key);
    return JSON.parse(raw) as SurahData;
  } catch {
    return null;
  }
}

function indexList(): string[] {
  try {
    const raw = localStorage.getItem(QURAN_INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function touchIndex(key: string) {
  try {
    const list = indexList().filter((k) => k !== key);
    list.push(key);
    localStorage.setItem(QURAN_INDEX_KEY, JSON.stringify(list));
  } catch {
    /* abaikan — cache sekunder */
  }
}

function writeCache(key: string, data: SurahData) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    touchIndex(key);
    let list = indexList();
    while (list.length > MAX_CACHED_SURAHS) {
      const oldest = list.shift();
      if (oldest && oldest !== key) localStorage.removeItem(oldest);
    }
    localStorage.setItem(QURAN_INDEX_KEY, JSON.stringify(list));
  } catch {
    // Penyimpanan penuh: buang separuh cache lama lalu coba sekali lagi.
    try {
      const list = indexList();
      list.slice(0, Math.ceil(list.length / 2)).forEach((k) => localStorage.removeItem(k));
      const kept = list.slice(Math.ceil(list.length / 2));
      localStorage.setItem(QURAN_INDEX_KEY, JSON.stringify(kept));
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* biarkan tanpa cache */
    }
  }
}

/** Validasi cache: surah cocok, jumlah ayat cocok, umur < 30 hari. */
function isCacheValid(c: SurahData | null, meta: SurahMeta): boolean {
  try {
    if (!c || c.surah?.number !== meta.number || !Array.isArray(c.ayahs) || c.ayahs.length !== meta.verses) return false;
    if (Date.now() - (c.fetchedAt ?? 0) > MAX_AGE_MS) return false;
    return typeof c.ayahs[0]?.text === "string" && c.ayahs[0].text.length > 0;
  } catch {
    return false;
  }
}

/** Ambil satu surah: utamakan cache, lalu jaringan; gagal total → offline. */
export async function fetchSurah(n: number, force = false): Promise<SurahFetchResult> {
  const meta = getSurah(n);
  if (!meta) return { ok: false, offline: false, message: "Nomor surah tidak valid" };

  const key = `tazkiya-quran-s${n}`;
  if (!force) {
    const cached = readCache(key);
    if (cached && isCacheValid(cached, meta)) {
      return { ok: true, data: { ...cached, fromCache: true } };
    }
  }

  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,id.indonesian`);
    if (!res.ok) return { ok: false, offline: false, message: `Server menjawab ${res.status}` };
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data) || json.data.length < 2) {
      return { ok: false, offline: false, message: "Format data dari server tidak dikenal" };
    }
    const arabic = json.data.find((d: { edition?: { identifier?: string } }) => d.edition?.identifier === "quran-uthmani") ?? json.data[0];
    const indo = json.data.find((d: { edition?: { identifier?: string } }) => d.edition?.identifier === "id.indonesian") ?? json.data[1];
    const aAyahs = arabic?.ayahs;
    const iAyahs = indo?.ayahs;
    if (!aAyahs?.length || !iAyahs?.length) {
      return { ok: false, offline: false, message: "Data ayat tidak lengkap dari server" };
    }
    if (aAyahs.length !== iAyahs.length) {
      return { ok: false, offline: false, message: "Jumlah ayat Arab & terjemahan tidak cocok" };
    }

    let bismillah: string | null = null;
    const ayahs: AyahData[] = aAyahs.map((a: { text?: string; number: number; numberInSurah: number; page?: number; juz?: number }, i: number) => {
      let text = a.text ?? "";
      // Lepas bismillah dari awal ayat 1 (kecuali Al-Fatihah & At-Taubah).
      if (i === 0 && n !== 1 && n !== 9 && text.startsWith("بِسْمِ")) {
        const parts = text.split(" ");
        if (parts.length > 4 && parts[3].includes("حِيم")) {
          bismillah = parts.slice(0, 4).join(" ");
          text = parts.slice(4).join(" ");
        }
      }
      const t = iAyahs[i];
      return {
        global: a.number,
        number: a.numberInSurah,
        text,
        translation: (t?.text ?? "").trim(),
        page: a.page ?? 0,
        juz: a.juz ?? 0,
      };
    });

    const data: SurahData = { surah: meta, bismillah, ayahs, fetchedAt: Date.now() };
    writeCache(key, data);
    return { ok: true, data };
  } catch {
    const cached = readCache(key);
    if (cached && isCacheValid(cached, meta)) {
      return { ok: true, data: { ...cached, fromCache: true } };
    }
    return {
      ok: false,
      offline: true,
      message: "Tidak dapat terhubung ke internet. Surah ini belum tersimpan di perangkat.",
    };
  }
}

/* ---------------- Util pencarian ---------------- */

/** Normalisasi teks Arab untuk pencarian (lepas harakat, samakan alef/yaa/taa). */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0627]/g, "ا")
    .replace(/\u0649/g, "ي")
    .replace(/\u0629/g, "ه")
    .trim();
}
