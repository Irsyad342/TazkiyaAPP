"use client";

/**
 * Tazkiya — Pembaca Al-Qur'an (overlay layar penuh).
 * Teks Uthmani + terjemahan Kemenag, penanda per-ayat, pengaturan tampilan,
 * dan pencatatan progres manual. Ringan: tanpa audio/murottal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark as BookmarkIcon,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  TriangleAlert,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { fetchSurah, getSurah, type SurahData } from "@/lib/tazkiya/quran";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

const LINE_HEIGHTS = [1.7, 1.9, 2.2];

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
  const setLastRead = useWorshipStore((s) => s.setLastRead);
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);
  const toggleAyahBookmark = useWorshipStore((s) => s.toggleAyahBookmark);
  const ayahBookmarks = useWorshipStore((s) => s.ayahBookmarks);
  const addQuranProgress = useWorshipStore((s) => s.addQuranProgress);

  const meta = getSurah(surah);
  const animated = settings.animations;

  const [data, setData] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(startAyah ?? 1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [catatOpen, setCatatOpen] = useState(false);
  const [catatPages, setCatatPages] = useState(1);
  const [catatAyat, setCatatAyat] = useState(1);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const ayahRefs = useRef(new Map<number, HTMLDivElement>());
  const lastReadRef = useRef(1);
  const lastSavedRef = useRef<{ surah: number; ayah: number } | null>(null);

  useEffect(() => {
    lastReadRef.current = currentAyah;
  }, [currentAyah]);

  const bookmarkSet = useMemo(() => {
    const s = new Set<number>();
    ayahBookmarks.filter((b) => b.surah === surah).forEach((b) => s.add(b.ayah));
    return s;
  }, [ayahBookmarks, surah]);

  const reload = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      const result = await fetchSurah(surah, force);
      if (result.ok) setData(result.data);
      else {
        setError(result.message);
        setOffline(result.offline);
      }
      setLoading(false);
    },
    [surah]
  );

  useEffect(() => {
    let alive = true;
    fetchSurah(surah).then((result) => {
      if (!alive) return;
      if (result.ok) setData(result.data);
      else {
        setError(result.message);
        setOffline(result.offline);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [surah]);

  // Gulir ke ayat awal bila dibuka dari posisi tertentu.
  useEffect(() => {
    if (data && startAyah && startAyah > 1) {
      const t = setTimeout(() => {
        ayahRefs.current.get(startAyah)?.scrollIntoView({ block: "start" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [data, startAyah]);

  const commitLastRead = useCallback(() => {
    const ayah = lastReadRef.current;
    const saved = lastSavedRef.current;
    if (saved && saved.surah === surah && saved.ayah === ayah) return;
    lastSavedRef.current = { surah, ayah };
    setLastRead(surah, ayah);
  }, [surah, setLastRead]);

  // Rekam posisi terakhir berkala + saat komponen ditutup.
  useEffect(() => {
    const interval = setInterval(commitLastRead, 2500);
    return () => {
      clearInterval(interval);
      commitLastRead();
    };
  }, [commitLastRead]);

  // Deteksi ayat yang sedang terlihat saat menggulir.
  useEffect(() => {
    if (!data) return;
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let top: number | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const n = Number((entry.target as HTMLElement).dataset.ayah);
          if (!Number.isNaN(n) && (top === null || n < top)) top = n;
        }
        if (top !== null) setCurrentAyah(top);
      },
      { root, rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    ayahRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  const relativePage = data ? Math.max(1, (data.ayahs[currentAyah - 1]?.page ?? 1) - (data.ayahs[0]?.page ?? 1) + 1) : 1;
  const lhIdx = Math.max(0, LINE_HEIGHTS.indexOf(settings.readerLineHeight));

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 * (animated ? 1 : 0) }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 * (animated ? 1 : 0) }}
      transition={{ duration: 0.24 * (animated ? 1 : 0), ease: "easeOut" }}
      className="absolute inset-0 z-40 flex flex-col bg-tz-frame"
      role="dialog"
      aria-label={`Pembaca surah ${meta?.latin ?? ""}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tz-aurora animate-tz-aurora absolute inset-0 opacity-70" />
      </div>

      {/* ---------- Kepala pembaca ---------- */}
      <header className="glass-strong relative z-20 rounded-none border-0 border-b border-tz-line px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              commitLastRead();
              onClose();
            }}
            aria-label="Kembali ke daftar surah"
            className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-ink transition-colors hover:text-tz-accent"
          >
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[14.5px] font-bold leading-tight text-tz-ink">
              {meta?.latin}{" "}
              <span className="quran-arabic text-[15px] font-normal text-tz-accent">{meta?.arabic}</span>
            </p>
            <p className="text-[10.5px] text-tz-muted">
              Surah {surah} · {meta?.verses} ayat · {meta?.place}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              saveBookmark({ surah, ayah: currentAyah, savedAt: new Date().toISOString() });
              toast.success(`Penanda disimpan: ${meta?.latin} ayat ${currentAyah}`);
            }}
            aria-label="Simpan penanda posisi ini"
            className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-accent transition-colors hover:border-tz-violet/50"
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
              settingsOpen ? "border-tz-violet/60 bg-tz-violet/20 text-tz-accent" : "border-tz-line bg-tz-panel text-tz-ink hover:text-tz-accent"
            )}
          >
            <Settings2 size={17} />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!catatOpen) {
                setCatatPages(relativePage);
                setCatatAyat(currentAyah);
              }
              setCatatOpen((v) => !v);
            }}
            aria-expanded={catatOpen}
            className={cn(
              "tap flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold transition-colors",
              catatOpen
                ? "border-tz-violet/60 bg-tz-violet/20 text-tz-accent"
                : "border-tz-violet/45 bg-gradient-to-r from-tz-purple/30 to-tz-violet/25 text-tz-accent"
            )}
          >
            <Save size={14} /> {catatOpen ? "Tutup pencatatan" : "Catat bacaan"}
          </button>
        </div>

        {settingsOpen ? (
          <div className="mt-2.5 space-y-2.5 rounded-2xl border border-tz-line bg-tz-panel-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-tz-muted">
                <Type size={12} /> Ukuran teks Arab
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Perkecil teks Arab"
                  onClick={() => updateSettings({ readerArabicSize: Math.max(20, settings.readerArabicSize - 2) })}
                  className="tap flex h-8 w-8 items-center justify-center rounded-lg border border-tz-line bg-tz-panel text-tz-ink"
                >
                  <Minus size={13} />
                </button>
                <span className="w-10 text-center text-xs font-semibold text-tz-ink">{settings.readerArabicSize}px</span>
                <button
                  type="button"
                  aria-label="Perbesar teks Arab"
                  onClick={() => updateSettings({ readerArabicSize: Math.min(46, settings.readerArabicSize + 2) })}
                  className="tap flex h-8 w-8 items-center justify-center rounded-lg border border-tz-line bg-tz-panel text-tz-ink"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-tz-muted">
                <Type size={12} /> Ukuran terjemahan
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Perkecil terjemahan"
                  onClick={() => updateSettings({ readerTransSize: Math.max(11, settings.readerTransSize - 1) })}
                  className="tap flex h-8 w-8 items-center justify-center rounded-lg border border-tz-line bg-tz-panel text-tz-ink"
                >
                  <Minus size={13} />
                </button>
                <span className="w-10 text-center text-xs font-semibold text-tz-ink">{settings.readerTransSize}px</span>
                <button
                  type="button"
                  aria-label="Perbesar terjemahan"
                  onClick={() => updateSettings({ readerTransSize: Math.min(20, settings.readerTransSize + 1) })}
                  className="tap flex h-8 w-8 items-center justify-center rounded-lg border border-tz-line bg-tz-panel text-tz-ink"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Jarak antarbaris</p>
              <button
                type="button"
                onClick={() => updateSettings({ readerLineHeight: LINE_HEIGHTS[(lhIdx + 1) % LINE_HEIGHTS.length] })}
                className="tap rounded-lg border border-tz-line bg-tz-panel px-3 py-1.5 text-xs font-semibold text-tz-ink"
              >
                {settings.readerLineHeight === 1.7 ? "Rapat" : settings.readerLineHeight === 1.9 ? "Sedang" : "Lega"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Tampilkan terjemahan</p>
              <button
                type="button"
                role="switch"
                aria-checked={settings.readerShowTranslation}
                onClick={() => updateSettings({ readerShowTranslation: !settings.readerShowTranslation })}
                className={cn(
                  "tap relative h-6 w-11 rounded-full border transition-colors",
                  settings.readerShowTranslation ? "border-tz-violet/60 bg-tz-violet" : "border-tz-line bg-tz-panel"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all",
                    settings.readerShowTranslation ? "left-[22px]" : "left-0.5"
                  )}
                  style={{ height: 18, width: 18 }}
                />
              </button>
            </div>
            <p className="text-[10.5px] leading-relaxed text-tz-muted">
              Semua pengaturan tersimpan otomatis di perangkat Anda.
            </p>
          </div>
        ) : null}

        {catatOpen ? (
          <div className="mt-2.5 space-y-2.5 rounded-2xl border border-tz-line bg-tz-panel-soft p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Catat progres bacaan hari ini</p>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[10.5px] text-tz-muted">Halaman mushaf</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={catatPages}
                  onChange={(e) => setCatatPages(Number(e.target.value))}
                  className="w-full rounded-lg border border-tz-line bg-tz-panel px-2.5 py-2 text-sm text-tz-ink outline-none focus:border-tz-violet/60"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10.5px] text-tz-muted">Ayat (sampai ayat {currentAyah})</span>
                <input
                  type="number"
                  min={1}
                  max={meta?.verses ?? undefined}
                  inputMode="numeric"
                  value={catatAyat}
                  onChange={(e) => setCatatAyat(Number(e.target.value))}
                  className="w-full rounded-lg border border-tz-line bg-tz-panel px-2.5 py-2 text-sm text-tz-ink outline-none focus:border-tz-violet/60"
                />
              </label>
            </div>
            <p className="text-[10.5px] leading-relaxed text-tz-muted">
              Membuka surah tidak otomatis dihitung sebagai bacaan — tekan tombol di bawah untuk mencatatnya ke tracker &amp; statistik.
            </p>
            <button
              type="button"
              onClick={() => {
                const pages = Math.max(0, Math.floor(catatPages) || 0);
                const ayat = Math.max(1, Math.floor(catatAyat) || 1);
                addQuranProgress(todayKey(), {
                  pages,
                  verses: ayat,
                  surah,
                  ayahFrom: 1,
                  ayahTo: Math.min(ayat, meta?.verses ?? ayat),
                  markBookmark: true,
                });
                toast.success(`Progres disimpan: ${pages} halaman · ${ayat} ayat`);
                setCatatOpen(false);
              }}
              className="tap flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-tz-violet/50 bg-gradient-to-r from-tz-purple to-tz-violet text-sm font-semibold text-white"
            >
              <Save size={15} /> Simpan ke tracker ibadah
            </button>
          </div>
        ) : null}
      </header>

      {/* ---------- Isi ayat ---------- */}
      <div ref={scrollRef} className="thin-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-40 pt-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 pt-24 text-center">
            <LoaderCircle size={30} className="animate-spin text-tz-violet" />
            <p className="text-sm text-tz-muted">Mengambil {meta?.latin}…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 pt-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <TriangleAlert size={22} />
            </span>
            <p className="max-w-[280px] text-sm font-medium text-tz-ink">Gagal memuat surah</p>
            <p className="max-w-[280px] text-xs leading-relaxed text-tz-muted">{error}</p>
            <button
              type="button"
              onClick={() => void reload(true)}
              className="tap mt-1 flex min-h-[42px] items-center gap-2 rounded-xl border border-tz-violet/50 bg-gradient-to-r from-tz-purple to-tz-violet px-4 text-sm font-semibold text-white"
            >
              <RotateCcw size={15} /> Coba lagi
            </button>
          </div>
        ) : data ? (
          <>
            <div className="mb-4 text-center">
              <p className="quran-arabic text-[26px] leading-[1.7] text-tz-ink">{data.surah.arabic}</p>
              {data.bismillah ? (
                <p className="quran-bismillah mt-1 text-[22px] leading-[1.9] text-tz-accent">{data.bismillah}</p>
              ) : null}
              {data.fromCache ? (
                <p className="mt-1 text-[10px] text-tz-muted">Dibaca dari simpanan perangkat (offline)</p>
              ) : null}
            </div>
            {data.ayahs.map((ayah) => (
              <div
                key={ayah.number}
                data-ayah={ayah.number}
                ref={(el) => {
                  if (el) ayahRefs.current.set(ayah.number, el);
                  else ayahRefs.current.delete(ayah.number);
                }}
                className="border-b border-tz-line-soft py-4 transition-colors last:border-b-0"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAyahBookmark(surah, ayah.number)}
                    aria-label={bookmarkSet.has(ayah.number) ? `Hapus penanda ayat ${ayah.number}` : `Tandai ayat ${ayah.number}`}
                    className={cn(
                      "tap flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                      bookmarkSet.has(ayah.number)
                        ? "border-tz-violet/60 bg-tz-violet/25 text-tz-accent"
                        : "border-tz-line bg-tz-panel text-tz-muted hover:text-tz-accent"
                    )}
                  >
                    <BookmarkIcon size={12} />
                  </button>
                  <span className="flex min-h-[22px] items-center rounded-full border border-tz-violet/25 bg-tz-violet/10 px-2.5 text-[11px] font-semibold text-tz-accent">
                    {String(ayah.number).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])} · {ayah.number}
                  </span>
                </div>
                <p
                  className="quran-arabic text-right text-tz-ink"
                  style={{ fontSize: settings.readerArabicSize, lineHeight: settings.readerLineHeight }}
                >
                  {ayah.text}
                </p>
                {settings.readerShowTranslation && ayah.translation ? (
                  <p className="mt-2.5 text-left leading-relaxed text-tz-muted" style={{ fontSize: settings.readerTransSize }}>
                    <span className="mr-1.5 font-semibold text-tz-accent/80">{ayah.number}.</span>
                    {ayah.translation}
                  </p>
                ) : null}
              </div>
            ))}
            <p className="pb-2 pt-3 text-center text-[10.5px] text-tz-muted">
              Sumber: AlQuran Cloud — teks Uthmani (Tanzil) &amp; terjemahan Kemenag RI
            </p>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
