"use client";

/**
 * Tazkiya v5 — Pembaca Al-Qur'an (overlay layar penuh, reading-focused).
 * Shell: kepala putih bersih, saklar mode Terjemahan ⇄ Mushaf, penanda,
 * pengaturan tampilan, bilah status posisi. Isi:
 * - Mode Terjemahan: kolom baca terpusat, kartu ayat di KERTAS PUTIH
 *   permanen (Arab hitam, terjemahan abu gelap) di tema terang maupun
 *   gelap. TANPA highlight otomatis mengikuti scroll — sorotan hanya
 *   muncul saat pengguna mengetuk (memilih) ayat.
 * - Mode Mushaf: halaman mushaf fisik (QuranMushaf).
 * Pencatatan progres tetap OTOMATIS saat sesi berakhir, tetapi hanya bila
 * ada aktivitas membaca nyata (pengguna pernah menggulir/membalik).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BookText,
  Bookmark as BookmarkIcon,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  TriangleAlert,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { fetchSurah, getSurah, type SurahData } from "@/lib/tazkiya/quran";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";
import { MushafView, type MushafPosition } from "./QuranMushaf";

const LINE_HEIGHTS = [1.7, 1.9, 2.2];

interface ReaderPosition {
  surah: number;
  ayah: number;
}

/* ================= Mode Terjemahan ================= */

function TranslationView({
  surah,
  startAyah,
  animated,
  onStatus,
  onPosition,
}: {
  surah: number;
  startAyah: number;
  animated: boolean;
  onStatus: (ayah: number | null) => void;
  onPosition: (pos: ReaderPosition) => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const setLastRead = useWorshipStore((s) => s.setLastRead);
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);
  const toggleAyahBookmark = useWorshipStore((s) => s.toggleAyahBookmark);
  const ayahBookmarks = useWorshipStore((s) => s.ayahBookmarks);
  const addQuranProgress = useWorshipStore((s) => s.addQuranProgress);

  const meta = getSurah(surah);

  const [data, setData] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const ayahRefs = useRef(new Map<number, HTMLDivElement>());
  const lastReadRef = useRef(startAyah);
  const lastSavedRef = useRef<{ surah: number; ayah: number } | null>(null);
  /** Pelacak ayat baru aktif SETELAH guliran pertama: saat dibuka di posisi
   *  lompat (startAyah > 1), ayat yang terlihat sekilas di puncak halaman
   *  sebelum lompatan tidak dihitung sebagai "terbaca". Deterministik —
   *  digerakkan event scroll, bukan timing. */
  const scrolledOnceRef = useRef(startAyah <= 1);

  // ---- Sesi bacaan otomatis: ayat awal → akhir yang benar-benar terbaca ----
  const sessionStart = Math.max(1, startAyah);
  const sessionStartAt = useRef(Date.now());
  const minSeenRef = useRef(sessionStart);
  const maxSeenRef = useRef(sessionStart);
  const recordedRef = useRef(false);
  const interactedRef = useRef(false); // ada aktivitas membaca nyata (gulir)?
  const dataRef = useRef<SurahData | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Sesi baru setiap kali surah/ayat awal berubah — ref pelacak di-reset agar
  // rentang yang dicatat selalu dimulai dari posisi pembukaan sesi ini.
  useEffect(() => {
    const s = Math.max(1, startAyah);
    scrolledOnceRef.current = startAyah <= 1;
    minSeenRef.current = s;
    maxSeenRef.current = s;
    lastReadRef.current = s;
    recordedRef.current = false;
    sessionStartAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, startAyah]);

  const bookmarkSet = useMemo(() => {
    const s = new Set<number>();
    ayahBookmarks.filter((b) => b.surah === surah).forEach((b) => s.add(b.ayah));
    return s;
  }, [ayahBookmarks, surah]);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const result = await fetchSurah(surah, force);
    if (result.ok) setData(result.data);
    else setError(result.message);
    setLoading(false);
  }, [surah]);

  useEffect(() => {
    let alive = true;
    fetchSurah(surah).then((result) => {
      if (!alive) return;
      if (result.ok) setData(result.data);
      else setError(result.message);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [surah]);

  // Gulir ke ayat awal bila dibuka dari posisi tertentu.
  useEffect(() => {
    if (data && startAyah > 1) {
      const t = setTimeout(() => {
        ayahRefs.current.get(startAyah)?.scrollIntoView({ block: "start" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [data, startAyah]);

  // Guliran pertama (dari lompatan maupun pengguna) membuka pelacak ayat.
  useEffect(() => {
    if (!data) return;
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      scrolledOnceRef.current = true;
    };
    root.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [data]);

  const commitLastRead = useCallback(() => {
    const ayah = lastReadRef.current;
    const saved = lastSavedRef.current;
    if (saved && saved.surah === surah && saved.ayah === ayah) return;
    lastSavedRef.current = { surah, ayah };
    setLastRead(surah, ayah);
  }, [surah, setLastRead]);

  /**
   * Tutup sesi: simpan posisi terakhir, pindahkan penanda otomatis, dan
   * catat rentang bacaan HANYA bila ada aktivitas membaca nyata (pengguna
   * pernah menggulir/menyentuh isi bacaan) — membuka lalu membiarkan tanpa
   * interaksi TIDAK mencatat riwayat.
   */
  const finishSession = useCallback(() => {
    if (recordedRef.current) return;
    if (Date.now() - sessionStartAt.current < 1200) return; // buka-tutup kilat
    if (!interactedRef.current) return; // tidak ada aktivitas membaca
    const d = dataRef.current;
    if (!d) return; // teks tak termuat (error/offline), jangan mengarang progres
    recordedRef.current = true;
    commitLastRead();
    const from = Math.max(1, Math.min(sessionStart, minSeenRef.current));
    const to = Math.max(maxSeenRef.current, lastReadRef.current);
    const meaningful = to > from || minSeenRef.current < sessionStart || Date.now() - sessionStartAt.current >= 15000;
    if (!meaningful) return;
    const verses = Math.max(1, to - from + 1);
    const pageFrom = d.ayahs[from - 1]?.page ?? 0;
    const pageTo = d.ayahs[to - 1]?.page ?? pageFrom;
    const pages = Math.max(0, pageTo - pageFrom + 1);
    // Penanda otomatis mengikuti posisi terakhir yang terbaca.
    saveBookmark({ surah, ayah: to, savedAt: new Date().toISOString() });
    addQuranProgress(todayKey(), {
      pages,
      verses,
      surah,
      ayahFrom: from,
      ayahTo: to,
      markBookmark: false, // penanda sudah diatur di atas
      auto: true,
    });
    toast.success(
      `Tercatat otomatis: ${meta?.latin ?? "Surah"} ${from}${to > from ? `-${to}` : ""} · ${verses} ayat${pages > 1 ? ` · ${pages} halaman` : ""}`
    );
  }, [surah, sessionStart, commitLastRead, saveBookmark, addQuranProgress, meta?.latin]);

  const finishSessionRef = useRef(finishSession);
  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  // Rekam posisi terakhir berkala; saat view ditutup, sesi ditutup otomatis.
  useEffect(() => {
    const interval = setInterval(commitLastRead, 2500);
    return () => {
      clearInterval(interval);
      finishSessionRef.current();
    };
  }, [commitLastRead]);

  /**
   * Lacak ayat terlihat untuk PROGRES saja (min/max/posisi terakhir) —
   * TIDAK mengubah tampilan: tidak ada highlight yang berpindah sendiri
   * mengikuti scroll. Aktivitas membaca (gulir) dicatat di sini juga.
   */
  useEffect(() => {
    if (!data) return;
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!scrolledOnceRef.current) return; // belum ada guliran sama sekali
        let top: number | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const n = Number((entry.target as HTMLElement).dataset.ayah);
          if (!Number.isNaN(n) && (top === null || n < top)) top = n;
        }
        if (top === null) return;
        interactedRef.current = true;
        lastReadRef.current = top;
        minSeenRef.current = Math.min(minSeenRef.current, top);
        maxSeenRef.current = Math.max(maxSeenRef.current, top);
      },
      { root, rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    ayahRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  const onSelectAyah = (n: number) => {
    const next = selectedAyah === n ? null : n;
    setSelectedAyah(next);
    onStatus(next);
    if (next !== null) onPosition({ surah, ayah: next });
  };

  return (
    <div ref={scrollRef} className="thin-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-8 pt-4 sm:px-6">
      {/* Kertas bacaan: PUTIH permanen di kedua tema */}
      <div className="quran-paper mx-auto max-w-[720px] rounded-[1.5rem] border border-[#e8e2da] px-4 py-5 shadow-[0_10px_36px_-18px_rgba(60,40,10,0.3)] sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <LoaderCircle size={30} className="animate-spin text-[#b45309]" />
            <p className="text-sm text-[#8a8a8a]">Mengambil {meta?.latin}…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf1e3] text-[#b45309]">
              <TriangleAlert size={22} />
            </span>
            <p className="max-w-[280px] font-display text-sm font-bold text-[#111111]">Gagal memuat surah</p>
            <p className="max-w-[280px] text-xs leading-relaxed text-[#8a8a8a]">{error}</p>
            <button
              type="button"
              onClick={() => void reload(true)}
              className="tap mt-1 flex min-h-[42px] items-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-bold text-white"
            >
              <RotateCcw size={15} /> Coba lagi
            </button>
          </div>
        ) : data ? (
          <>
            {/* Panel pembuka surah */}
            <div className="quran-hairline mb-6 rounded-[1.1rem] border border-[#e8e2da] bg-[#faf6f0] px-5 py-6 text-center">
              <p className="quran-arabic text-[26px] leading-[1.7] text-[#111111]">{data.surah.arabic}</p>
              {data.bismillah ? (
                <p className="quran-bismillah mt-2 text-[22px] leading-[1.9] text-[#111111]">{data.bismillah}</p>
              ) : null}
              {data.fromCache ? (
                <p className="quran-hint mt-2 text-[10px]">Dibaca dari simpanan perangkat (offline)</p>
              ) : null}
            </div>

            {data.ayahs.map((ayah) => {
              const selected = selectedAyah === ayah.number;
              return (
                <div
                  key={ayah.number}
                  data-ayah={ayah.number}
                  ref={(el) => {
                    if (el) ayahRefs.current.set(ayah.number, el);
                    else ayahRefs.current.delete(ayah.number);
                  }}
                  onClick={() => onSelectAyah(ayah.number)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectAyah(ayah.number);
                    }
                  }}
                  aria-pressed={selected}
                  aria-label={`Ayat ${ayah.number}${selected ? " (dipilih)" : ""} — ketuk untuk memilih`}
                  className={cn(
                    "mb-3 cursor-pointer rounded-[1.4rem] border px-4 py-4 outline-none transition-colors sm:px-5",
                    selected
                      ? "border-[#f0b27a] bg-[#fff7ef] shadow-[inset_0_0_0_1px_#f0b27a]"
                      : "border-transparent hover:border-[#eee3d4]"
                  )}
                >
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "tnum flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-bold",
                        selected ? "bg-[#e04a00] text-white" : "bg-[#f8ede1] text-[#c2410c]"
                      )}
                    >
                      {ayah.number}
                    </span>
                    {selected ? (
                      <span className="rounded-full bg-[#f8ede1] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#c2410c]">
                        Dipilih
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAyahBookmark(surah, ayah.number);
                      }}
                      aria-label={bookmarkSet.has(ayah.number) ? `Hapus penanda ayat ${ayah.number}` : `Tandai ayat ${ayah.number}`}
                      className={cn(
                        "tap flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                        bookmarkSet.has(ayah.number)
                          ? "border-[#e5b380] bg-[#fdf3e7] text-[#c2410c]"
                          : "border-[#e8e2da] bg-white text-[#8a8a8a] hover:text-[#c2410c]"
                      )}
                    >
                      <BookmarkIcon size={13} />
                    </button>
                  </div>
                  <p
                    className="quran-arabic text-right text-[#111111]"
                    style={{ fontSize: settings.readerArabicSize, lineHeight: settings.readerLineHeight }}
                  >
                    {ayah.text}
                  </p>
                  {settings.readerShowTranslation && ayah.translation ? (
                    <p
                      className="quran-translation mt-3 rounded-xl bg-[#f7f4ef] px-3 py-2.5 leading-relaxed"
                      style={{ fontSize: settings.readerTransSize }}
                    >
                      {ayah.translation}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <p className="quran-hint pb-1 pt-2 text-center text-[10.5px]">
              Sumber: AlQuran Cloud, teks Uthmani (Tanzil) &amp; terjemahan Kemenag RI · ketuk ayat untuk memilih
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ================= Shell pembaca ================= */

export function QuranReader({
  surah,
  startAyah,
  onClose,
}: {
  surah: number;
  startAyah?: number;
  onClose: () => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);

  const animated = settings.animations;
  const mode = settings.quranReadMode ?? "terjemahan";
  const pageSound = settings.quranPageSound ?? true;

  const [activeSurah, setActiveSurah] = useState(surah);
  const [activeStartAyah, setActiveStartAyah] = useState(Math.max(1, startAyah ?? 1));
  const [statusAyah, setStatusAyah] = useState<number | null>(null);
  const [mushafPos, setMushafPos] = useState<MushafPosition | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Posisi terakhir per mode — dipakai tombol penanda.
  const posRef = useRef<ReaderPosition>({ surah, ayah: Math.max(1, startAyah ?? 1) });

  const meta = getSurah(activeSurah);

  const handleTransPosition = useCallback((pos: ReaderPosition) => {
    posRef.current = pos;
  }, []);
  const handleMushafPosition = useCallback((pos: MushafPosition) => {
    posRef.current = { surah: pos.surah, ayah: pos.ayah };
    setMushafPos(pos);
  }, []);

  /** Dari mushaf: pindah membaca surah lain (mushaf tetap mode surah). */
  const jumpSurahFromMushaf = useCallback((target: number) => {
    setActiveSurah(target);
    setActiveStartAyah(1);
    setStatusAyah(null);
  }, []);

  const switchMode = (next: "terjemahan" | "mushaf") => {
    if (next === mode) return;
    updateSettings({ quranReadMode: next });
    if (next === "terjemahan" && mushafPos) {
      // Lanjutkan dari posisi halaman mushaf yang sedang dibaca.
      setActiveSurah(mushafPos.surah);
      setActiveStartAyah(Math.max(1, mushafPos.ayah));
      setStatusAyah(null);
    }
    if (next === "mushaf") setStatusAyah(null);
  };

  const lhIdx = Math.max(0, LINE_HEIGHTS.indexOf(settings.readerLineHeight));

  return (
    <m.div
      initial={{ opacity: 0, x: 60 * (animated ? 1 : 0) }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 * (animated ? 1 : 0) }}
      transition={{ duration: 0.24 * (animated ? 1 : 0), ease: "easeOut" }}
      className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-tk-stage"
      role="dialog"
      aria-label={`Pembaca ${mode === "mushaf" ? "mushaf" : `surah ${meta?.latin ?? ""}`}`}
    >
      {/* ---------- Kepala pembaca + saklar mode ---------- */}
      <header className="glass-strong relative z-20 rounded-none border-0 border-b border-tk-line px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-[760px] items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Kembali ke daftar surah"
            className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink transition-colors hover:border-tk-violet/40"
          >
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            {mode === "mushaf" ? (
              <>
                <p className="truncate font-display text-[15px] font-bold leading-tight tracking-[-0.01em] text-tk-ink">
                  Mode Mushaf
                  {mushafPos ? <span className="quran-arabic ml-2 text-[14px] font-normal text-tk-violet dark:text-tk-accent">{getSurah(mushafPos.surah)?.arabic}</span> : null}
                </p>
                <p className="truncate text-[10.5px] text-tk-muted">
                  {mushafPos
                    ? `Surah ${getSurah(mushafPos.surah)?.latin ?? ""} · Halaman ${mushafPos.index + 1} dari ${mushafPos.total} · Juz ${mushafPos.juz}`
                    : "Menyiapkan mushaf…"}
                </p>
              </>
            ) : (
              <>
                <p className="truncate font-display text-[15px] font-bold leading-tight tracking-[-0.01em] text-tk-ink">
                  {meta?.latin}
                  {settings.showArabic ? <span className="quran-arabic ml-2 text-[15px] font-normal text-tk-violet dark:text-tk-accent">{meta?.arabic}</span> : null}
                </p>
                <p className="text-[10.5px] text-tk-muted">
                  Surah {activeSurah} · {meta?.verses} ayat · {meta?.place}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const pos = posRef.current;
              saveBookmark({ surah: pos.surah, ayah: pos.ayah, savedAt: new Date().toISOString() });
              toast.success(`Penanda disimpan: ${getSurah(pos.surah)?.latin ?? "Surah"} ayat ${pos.ayah}`);
            }}
            aria-label="Simpan penanda posisi ini"
            className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-violet transition-colors hover:border-tk-violet/50 dark:text-tk-accent"
          >
            <BookmarkIcon size={17} />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="Pengaturan tampilan bacaan"
            aria-expanded={settingsOpen}
            className={cn(
              "tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
              settingsOpen ? "border-tk-violet/60 bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent" : "border-tk-line bg-tk-panel text-tk-ink"
            )}
          >
            <Settings2 size={17} />
          </button>
        </div>

        {/* Saklar mode Terjemahan / Mushaf */}
        <div className="mx-auto mt-2.5 flex max-w-[760px] items-center gap-1 rounded-full border border-tk-line bg-tk-panel p-1" role="tablist" aria-label="Mode membaca">
          {(
            [
              { id: "terjemahan" as const, label: "Terjemahan", icon: BookOpen },
              { id: "mushaf" as const, label: "Mushaf", icon: BookText },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => switchMode(t.id)}
              className={cn(
                "tap flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-bold transition-all",
                mode === t.id ? "gs-ink-btn" : "text-tk-muted hover:text-tk-ink"
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {settingsOpen ? (
          <div className="tk-fade-in mx-auto mt-2.5 max-w-[760px] space-y-2.5 rounded-2xl border border-tk-line bg-tk-panel p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-tk-muted">
                <Type size={12} /> Ukuran teks Arab
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Perkecil teks Arab"
                  onClick={() => updateSettings({ readerArabicSize: Math.max(20, settings.readerArabicSize - 2) })}
                  className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
                >
                  <Minus size={13} />
                </button>
                <span className="w-10 text-center text-xs font-semibold text-tk-ink">{settings.readerArabicSize}px</span>
                <button
                  type="button"
                  aria-label="Perbesar teks Arab"
                  onClick={() => updateSettings({ readerArabicSize: Math.min(46, settings.readerArabicSize + 2) })}
                  className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            {mode === "terjemahan" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-tk-muted">
                    <Type size={12} /> Ukuran terjemahan
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Perkecil terjemahan"
                      onClick={() => updateSettings({ readerTransSize: Math.max(11, settings.readerTransSize - 1) })}
                      className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-10 text-center text-xs font-semibold text-tk-ink">{settings.readerTransSize}px</span>
                    <button
                      type="button"
                      aria-label="Perbesar terjemahan"
                      onClick={() => updateSettings({ readerTransSize: Math.min(20, settings.readerTransSize + 1) })}
                      className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-tk-muted">Jarak antarbaris</p>
                  <button
                    type="button"
                    onClick={() => updateSettings({ readerLineHeight: LINE_HEIGHTS[(lhIdx + 1) % LINE_HEIGHTS.length] })}
                    className="tap rounded-full border border-tk-line bg-tk-panel px-3 py-1.5 text-xs font-semibold text-tk-ink"
                  >
                    {settings.readerLineHeight === 1.7 ? "Rapat" : settings.readerLineHeight === 1.9 ? "Sedang" : "Lega"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-tk-muted">Tampilkan terjemahan</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.readerShowTranslation}
                    onClick={() => updateSettings({ readerShowTranslation: !settings.readerShowTranslation })}
                    className={cn(
                      "tap relative h-6 w-11 rounded-full border transition-colors",
                      settings.readerShowTranslation ? "border-tk-violet/60 bg-tk-violet" : "border-tk-line bg-tk-panel-soft"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 rounded-full bg-white shadow transition-all",
                        settings.readerShowTranslation ? "left-[22px]" : "left-0.5"
                      )}
                      style={{ height: 18, width: 18 }}
                    />
                  </button>
                </div>
                <p className="text-[10.5px] leading-relaxed text-tk-muted">
                  Bacaan dicatat otomatis saat pembaca ditutup, hanya bila ada aktivitas membaca. Sorotan ayat muncul
                  saat kamu mengetuk ayatnya, bukan mengikuti gulir.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-tk-muted">
                    <Type size={12} /> Suara halaman
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pageSound}
                    onClick={() => updateSettings({ quranPageSound: !pageSound })}
                    className={cn(
                      "tap relative h-6 w-11 rounded-full border transition-colors",
                      pageSound ? "border-tk-violet/60 bg-tk-violet" : "border-tk-line bg-tk-panel-soft"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 rounded-full bg-white shadow transition-all",
                        pageSound ? "left-[22px]" : "left-0.5"
                      )}
                      style={{ height: 18, width: 18 }}
                    />
                  </button>
                </div>
                <p className="text-[10.5px] leading-relaxed text-tk-muted">
                  Mushaf berbasis surah: hanya surah yang sedang dibuka, dipaginasi mengikuti halaman mushaf Madinah
                  (Utsmani, Tanzil) tanpa ayat surah lain. Geser kanan/kiri untuk membalik halaman dengan animasi
                  kertas 3D; suara lembut berbunyi saat halaman berhasil dibalik dan bisa dimatikan di atas. Progres
                  dan penanda tercatat dari halaman yang benar-benar kamu buka saat sesi berakhir.
                </p>
              </>
            )}
          </div>
        ) : null}
      </header>

      {/* ---------- Isi sesuai mode ---------- */}
      {mode === "mushaf" ? (
        <MushafView
          key={`mushaf-${activeSurah}-${activeStartAyah}`}
          surah={activeSurah}
          startAyah={activeStartAyah}
          animated={animated}
          arabicSize={settings.readerArabicSize}
          pageSound={pageSound}
          onPosition={handleMushafPosition}
          onJumpSurah={jumpSurahFromMushaf}
        />
      ) : (
        <TranslationView
          key={`trans-${activeSurah}-${activeStartAyah}`}
          surah={activeSurah}
          startAyah={activeStartAyah}
          animated={animated}
          onStatus={setStatusAyah}
          onPosition={handleTransPosition}
        />
      )}

      {/* ---------- Bilah status posisi baca ---------- */}
      <div className="glass-strong relative z-20 rounded-none border-0 border-t border-tk-line px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3">
          {mode === "mushaf" ? (
            <>
              <p className="tnum text-[11px] font-semibold text-tk-muted">
                {mushafPos ? (
                  <>
                    Halaman <span className="font-bold text-tk-ink">{mushafPos.index + 1}</span> dari {mushafPos.total} · hlm mushaf{" "}
                    <span className="font-bold text-tk-ink">{mushafPos.page}</span>
                  </>
                ) : (
                  "Menyiapkan mushaf…"
                )}
              </p>
              <p className="truncate text-[10px] text-tk-muted/80">Progres halaman tercatat otomatis saat ditutup</p>
            </>
          ) : (
            <>
              <p className="tnum text-[11px] font-semibold text-tk-muted">
                {statusAyah ? (
                  <>
                    Ayat <span className="font-bold text-tk-ink">{statusAyah}</span> dipilih · dari {meta?.verses ?? "0"}
                  </>
                ) : (
                  <>Ketuk ayat untuk memilih · {meta?.verses ?? "0"} ayat</>
                )}
              </p>
              <p className="truncate text-[10px] text-tk-muted/80">Progres bacaan tercatat otomatis saat ditutup</p>
            </>
          )}
        </div>
      </div>
    </m.div>
  );
}
