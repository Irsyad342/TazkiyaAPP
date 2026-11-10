/**
 * Tazkiya — Sumber teks MUSHAF STANDAR INDONESIA (MSI).
 * Teks Arab + terjemahan resmi dari Kementerian Agama RI (LPMQ /
 * qurankemenag.net), dipaginasi mengikuti nomor halaman mushaf resmi
 * (1–604, terverifikasi identik dengan penomoran Tanzil/Madinah).
 * Dicetak statis per surah di /mushaf-msi/{n}.json (total ±2,6 MB) lalu
 * di-cache LRU ke localStorage agar tetap bisa dibaca offline.
 *
 * Tipografi: font "LPMQ Isep Misbah" — font resmi LPMQ Kemenag RI untuk
 * Mushaf Standar Indonesia (dirilis gratis oleh Kemenag). Teks MSI memakai
 * alef biasa (U+0627) + harakat lengkap khas MSI sehingga cocok 100% dengan
 * cakupan glyph font ini (diuji HarfBuzz: 0 tofu, seluruh 73 karakter unik
 * tercakup — termasuk tanda waqaf, angka Arab, dan ornamen ayat).
 * TIDAK ADA perubahan manual pada teks Al Qur'an.
 */

import { SURAHS as SURAH_LIST, getSurah } from "./surahs";

export { SURAH_LIST, getSurah };
import type { SurahMeta } from "./surahs";

/** Basmalah dalam ejaan MSI — teks resmi Al-Fatihah ayat 1 (dipakai sebagai
 * baris basmalah terpisah di halaman pertama surah, kecuali At-Taubah). */
export const MSI_BISMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ";

export interface MsiAyah {
  numberInSurah: number;
  /** Teks MSI apa adanya (tanpa bismillah prefiks — data Kemenag sudah bersih). */
  text: string;
  /** Terjemahan resmi Kemenag RI. */
  translation: string;
  /** Nomor halaman mushaf resmi (1..604). */
  page: number;
  juz: number;
}

export interface MsiSurahData {
  surah: SurahMeta;
  /** Basmalah baris terpisah; null untuk Al-Fatihah (jadi ayat 1) & At-Taubah. */
  bismillah: string | null;
  ayahs: MsiAyah[];
  fetchedAt: number;
  fromCache?: boolean;
}

export type MsiFetchResult =
  | { ok: true; data: MsiSurahData }
  | { ok: false; offline: boolean; message: string };

/** Satu halaman mushaf milik satu surah (versi MSI: menyertakan terjemahan). */
export interface MsiMushafPage {
  page: number;
  juz: number;
  ayahs: { numberInSurah: number; text: string; translation: string }[];
}

/* ---------------- Cache LRU (mirip lapisan quran.ts) ---------------- */

const MSI_INDEX_KEY = "tazkiya-quran-msi-index";
const MAX_CACHED_MSIS = 15;
const MAX_AGE_MS = 2_592_000_000; // 30 hari

function msiIndexList(): string[] {
  try {
    const raw = localStorage.getItem(MSI_INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function touchMsiIndex(key: string) {
  try {
    const list = msiIndexList().filter((k) => k !== key);
    list.push(key);
    localStorage.setItem(MSI_INDEX_KEY, JSON.stringify(list));
  } catch {
    /* abaikan */
  }
}

function readMsiCache(key: string): MsiSurahData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    touchMsiIndex(key);
    return JSON.parse(raw) as MsiSurahData;
  } catch {
    return null;
  }
}

function writeMsiCache(key: string, data: MsiSurahData) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    touchMsiIndex(key);
    const list = msiIndexList();
    while (list.length > MAX_CACHED_MSIS) {
      const oldest = list.shift();
      if (oldest && oldest !== key) localStorage.removeItem(oldest);
    }
    localStorage.setItem(MSI_INDEX_KEY, JSON.stringify(list));
  } catch {
    // Penyimpanan penuh: buang separuh cache lama lalu coba sekali lagi.
    try {
      const list = msiIndexList();
      list.slice(0, Math.ceil(list.length / 2)).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(MSI_INDEX_KEY, JSON.stringify(list.slice(Math.ceil(list.length / 2))));
    } catch {
      /* biarkan tanpa cache */
    }
  }
}

function isMsiCacheValid(c: MsiSurahData | null, meta: SurahMeta): boolean {
  try {
    if (!c || c.surah?.number !== meta.number || !Array.isArray(c.ayahs) || c.ayahs.length !== meta.verses) return false;
    if (Date.now() - (c.fetchedAt ?? 0) > MAX_AGE_MS) return false;
    return typeof c.ayahs[0]?.text === "string" && c.ayahs[0].text.length > 0;
  } catch {
    return false;
  }
}

/** Ambil satu surah MSI: utamakan cache, lalu berkas statis (CDN). */
export async function fetchMsiSurah(n: number, force = false): Promise<MsiFetchResult> {
  const meta = getSurah(n);
  if (!meta) return { ok: false, offline: false, message: "Nomor surah tidak valid" };

  const key = `tazkiya-quran-msi-s${n}`;
  if (!force) {
    const cached = readMsiCache(key);
    if (cached && isMsiCacheValid(cached, meta)) {
      return { ok: true, data: { ...cached, fromCache: true } };
    }
  }

  try {
    const res = await fetch(`/mushaf-msi/${n}.json`);
    if (!res.ok) return { ok: false, offline: false, message: `Berkas mushaf menjawab ${res.status}` };
    const json = (await res.json()) as {
      surah?: { verses?: number };
      ayahs?: { n?: number; t?: string; p?: number; j?: number; tr?: string }[];
    };
    const list = json.ayahs;
    if (!Array.isArray(list) || list.length !== meta.verses) {
      return { ok: false, offline: false, message: "Data MSI surah ini tidak lengkap" };
    }
    const ayahs: MsiAyah[] = list.map((a, i) => ({
      numberInSurah: a.n ?? i + 1,
      text: (a.t ?? "").trim(),
      translation: (a.tr ?? "").trim(),
      page: a.p ?? 0,
      juz: a.j ?? 0,
    }));
    const data: MsiSurahData = {
      surah: meta,
      bismillah: n !== 1 && n !== 9 ? MSI_BISMILLAH : null,
      ayahs,
      fetchedAt: Date.now(),
    };
    writeMsiCache(key, data);
    return { ok: true, data };
  } catch {
    const cached = readMsiCache(key);
    if (cached && isMsiCacheValid(cached, meta)) {
      return { ok: true, data: { ...cached, fromCache: true } };
    }
    return {
      ok: false,
      offline: true,
      message: "Tidak dapat terhubung ke internet. Mushaf ini belum tersimpan di perangkat.",
    };
  }
}

/**
 * Pecah ayat-ayat MSI menjadi halaman-halaman mushaf mengikuti nomor halaman
 * resmi per ayat (1..604). Hanya ayat surah tersebut, urutan asli, tanpa
 * duplikasi; nomor halaman monoton dijaga (guard ayat 0/mundur).
 */
export function paginateMsiForMushaf(data: MsiSurahData): MsiMushafPage[] {
  const pages: MsiMushafPage[] = [];
  let lastPage = 0;
  for (const a of data.ayahs) {
    const page = a.page > lastPage ? a.page : lastPage || 1;
    lastPage = page;
    const last = pages[pages.length - 1];
    if (last && last.page === page) {
      last.ayahs.push({ numberInSurah: a.numberInSurah, text: a.text, translation: a.translation });
    } else {
      pages.push({
        page,
        juz: a.juz || last?.juz || 1,
        ayahs: [{ numberInSurah: a.numberInSurah, text: a.text, translation: a.translation }],
      });
    }
  }
  return pages;
}

/** Angka Arab-Indic (٠١٢٣٤٥٦٧٨٩) untuk penanda mushaf. */
export function toArabicDigitsMsi(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
