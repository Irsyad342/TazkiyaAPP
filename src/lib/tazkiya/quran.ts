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

/* ---------------- Mushaf berbasis surah ---------------- */

/** Satu halaman mushaf milik satu surah: ayat-ayat surah itu yang berada
 * pada halaman mushaf Madinah ke-`page` (pengelompokan memakai nomor
 * halaman resmi Tanzil per ayat — tanpa ayat surah lain). */
export interface MushafSurahPage {
  page: number; // nomor halaman mushaf Madinah
  juz: number; // juz ayat pertama pada halaman ini
  ayahs: { numberInSurah: number; text: string }[];
}

/**
 * Pecah ayat-ayat satu surah menjadi halaman-halaman mushaf mengikuti
 * nomor halaman per ayat dari teks Utsmani Tanzil. Hasilnya hanya memuat
 * ayat surah tersebut (halaman bersama surah lain tetap ditampilkan
 * sebagai bagian surah ini saja), urutan ayat asli, tanpa duplikasi.
 */
export function paginateSurahForMushaf(data: SurahData): MushafSurahPage[] {
  const pages: MushafSurahPage[] = [];
  let lastPage = 0;
  for (const a of data.ayahs) {
    // Guard: nomor halaman harus monoton naik; 0/ mundur → ikut halaman sebelumnya.
    const page = a.page > lastPage ? a.page : lastPage || 1;
    lastPage = page;
    const last = pages[pages.length - 1];
    if (last && last.page === page) {
      last.ayahs.push({ numberInSurah: a.number, text: a.text });
    } else {
      pages.push({ page, juz: a.juz || last?.juz || 1, ayahs: [{ numberInSurah: a.number, text: a.text }] });
    }
  }
  return pages;
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

/* ---------------- Mode Mushaf (per halaman 1..604) ---------------- */

const PAGE_INDEX_KEY = "tazkiya-quran-pindex";
const MAX_CACHED_PAGES = 12;

/** Ayat satu halaman mushaf — teks Utsmani murni dari API (Tanzil). */
export interface MushafAyah {
  surah: number;
  numberInSurah: number;
  global: number;
  text: string; // teks Utsmani apa adanya (ayat 1 surah > 1 masih memuat bismillah di awal)
  juz: number;
}

export interface MushafPage {
  page: number;
  juz: number; // juz terbanyak di halaman ini
  ayahs: MushafAyah[];
  fetchedAt: number;
  fromCache?: boolean;
}

export type MushafFetchResult =
  | { ok: true; data: MushafPage }
  | { ok: false; offline: boolean; message: string };

/** Lepas prefiks bismillah dari ayat 1 (kecuali Al-Fatihah & At-Taubah). */
export function stripBismillah(text: string, surah: number, numberInSurah: number): { text: string; bismillah: string | null } {
  if (numberInSurah !== 1 || surah === 1 || surah === 9) return { text, bismillah: null };
  if (text.startsWith("بِسْمِ")) {
    const parts = text.split(" ");
    if (parts.length > 4 && parts[3].includes("حِيم")) {
      return { text: parts.slice(4).join(" "), bismillah: parts.slice(0, 4).join(" ") };
    }
  }
  return { text, bismillah: null };
}

/** Angka Arab-Indic (٠١٢٣٤٥٦٧٨٩) untuk penanda mushaf. */
export function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

function readPageCache(page: number): MushafPage | null {
  try {
    const raw = localStorage.getItem(`tazkiya-quran-p${page}`);
    if (!raw) return null;
    const list = pageList();
    localStorage.setItem(PAGE_INDEX_KEY, JSON.stringify([...list.filter((p) => p !== page), page]));
    return JSON.parse(raw) as MushafPage;
  } catch {
    return null;
  }
}

function pageList(): number[] {
  try {
    const raw = localStorage.getItem(PAGE_INDEX_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writePageCache(data: MushafPage) {
  try {
    localStorage.setItem(`tazkiya-quran-p${data.page}`, JSON.stringify(data));
    let list = [...pageList().filter((p) => p !== data.page), data.page];
    while (list.length > MAX_CACHED_PAGES) {
      const oldest = list.shift();
      if (oldest != null) localStorage.removeItem(`tazkiya-quran-p${oldest}`);
    }
    localStorage.setItem(PAGE_INDEX_KEY, JSON.stringify(list));
  } catch {
    /* simpan penuh — mushaf tetap jalan tanpa cache */
  }
}

function isPageCacheValid(c: MushafPage | null, page: number): boolean {
  try {
    if (!c || c.page !== page || !Array.isArray(c.ayahs) || c.ayahs.length === 0) return false;
    if (Date.now() - (c.fetchedAt ?? 0) > MAX_AGE_MS) return false;
    return typeof c.ayahs[0]?.text === "string" && c.ayahs[0].text.length > 0;
  } catch {
    return false;
  }
}

/** Nomor halaman mushaf untuk satu ayat (1 permintaan ringan, dipakai untuk lompat surah). */
export async function fetchAyahPage(surah: number, ayah: number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`);
    if (!res.ok) return null;
    const json = await res.json();
    const d = Array.isArray(json?.data) ? json.data[0] : json?.data;
    const p = d?.page;
    return typeof p === "number" && p >= 1 && p <= 604 ? p : null;
  } catch {
    return null;
  }
}

/** Ambil satu halaman mushaf: utamakan cache, lalu jaringan; gagal total → offline. */
export async function fetchMushafPage(page: number, force = false): Promise<MushafFetchResult> {
  if (!Number.isInteger(page) || page < 1 || page > 604) {
    return { ok: false, offline: false, message: "Nomor halaman mushaf tidak valid" };
  }
  if (!force) {
    const cached = readPageCache(page);
    if (cached && isPageCacheValid(cached, page)) return { ok: true, data: { ...cached, fromCache: true } };
  }
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
    if (!res.ok) return { ok: false, offline: false, message: `Server menjawab ${res.status}` };
    const json = await res.json();
    const ed = json?.data;
    const list = Array.isArray(ed) ? ed[0]?.ayahs : ed?.ayahs;
    if (json?.code !== 200 || !Array.isArray(list) || list.length === 0) {
      return { ok: false, offline: false, message: "Format data halaman mushaf tidak dikenal" };
    }
    const ayahs: MushafAyah[] = list.map(
      (a: { surah?: { number?: number }; numberInSurah?: number; number?: number; text?: string; juz?: number }) => ({
        surah: a.surah?.number ?? 0,
        numberInSurah: a.numberInSurah ?? 0,
        global: a.number ?? 0,
        text: (a.text ?? "").trim(),
        juz: a.juz ?? 0,
      })
    );
    const juzCounts = new Map<number, number>();
    for (const a of ayahs) juzCounts.set(a.juz, (juzCounts.get(a.juz) ?? 0) + 1);
    const juz = [...juzCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1;
    const data: MushafPage = { page, juz, ayahs, fetchedAt: Date.now() };
    writePageCache(data);
    return { ok: true, data };
  } catch {
    const cached = readPageCache(page);
    if (cached && isPageCacheValid(cached, page)) return { ok: true, data: { ...cached, fromCache: true } };
    return {
      ok: false,
      offline: true,
      message: "Tidak dapat terhubung ke internet. Halaman mushaf ini belum tersimpan di perangkat.",
    };
  }
}
