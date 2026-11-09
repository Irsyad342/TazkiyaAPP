"use client";

/**
 * Tazkiya — Mode Mushaf: halaman mushaf fisik (teks Utsmani Tanzil per
 * halaman 1..604, sumber AlQuran Cloud API).
 * - Kertas putih permanen di kedua tema, teks Arab hitam (Amiri Quran).
 * - Nomor halaman (medalion) + juz, band nama surah, bismillah terpisah,
 *   penanda akhir ayat berornamen — meniru mushaf cetak standar.
 * - Navigasi: swipe (page flip ala mushaf), tombol prev/next, lompat
 *   halaman, dan pilihan surah.
 * - Progres: halaman yang benar-benar dikunjungi dicatat saat sesi berakhir
 *   (min. 5 dtk atau ≥2 halaman) — tanpa aktivitas membaca, tanpa catatan.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, ListFilter, RotateCcw, TriangleAlert, X, Search } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { fetchAyahPage, fetchMushafPage, getSurah, stripBismillah, toArabicDigits, type MushafPage, SURAH_LIST } from "@/lib/tazkiya/quran";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

export interface MushafPosition {
  page: number;
  juz: number;
  /** Surah & ayat pertama pada halaman — posisi penanda/berpindah mode. */
  surah: number;
  ayah: number;
  surahsOnPage: number[];
}

const TOTAL_PAGES = 604;

/** Posisi sesi: halaman → jumlah ayat halaman itu (untuk pencatatan jujur). */
type VisitedMap = Map<number, { ayahs: number; first: { surah: number; ayah: number } | null; last: { surah: number; ayah: number } | null }>;

export function MushafView({
  targetSurah,
  targetAyah,
  animated,
  arabicSize,
  onPosition,
}: {
  targetSurah: number;
  targetAyah: number;
  animated: boolean;
  arabicSize: number;
  onPosition: (pos: MushafPosition) => void;
}) {
  const setLastRead = useWorshipStore((s) => s.setLastRead);
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);
  const addQuranProgress = useWorshipStore((s) => s.addQuranProgress);

  const [page, setPage] = useState<number | null>(null);
  const [data, setData] = useState<MushafPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [jumpValue, setJumpValue] = useState("");
  const [resolving, setResolving] = useState(false);

  const pageRef = useRef<number>(1);
  const visitedRef = useRef<VisitedMap>(new Map());
  const recordedRef = useRef(false);
  const sessionStartAt = useRef(Date.now());
  const aliveRef = useRef(true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const stageW = useRef(360);
  const requestSeq = useRef(0);
  const loadingRef = useRef(true);

  // ---- Gesture page-flip (motion values; hanya transform/opacity) ----
  const mvX = useMotionValue(0);
  const rotateY = useTransform(mvX, (v) => (stageW.current > 0 ? (v / stageW.current) * 58 : 0));
  const flipOpacity = useTransform(mvX, (v) => 1 - Math.min(0.45, (Math.abs(v) / Math.max(1, stageW.current)) * 0.55));
  const dragState = useRef<{ id: number | null; startX: number; startY: number; axis: "h" | "v" | null }>({ id: null, startX: 0, startY: 0, axis: null });

  const setFlipOrigin = (dir: 1 | -1) => {
    if (sheetRef.current) sheetRef.current.style.transformOrigin = dir === 1 ? "right center" : "left center";
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Ukur lebar panggung agar flip proporsional.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      stageW.current = Math.max(240, el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Catat sesi mushaf saat berakhir: halaman dikunjungi + penanda berpindah. */
  const finishSession = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const visited = visitedRef.current;
    if (visited.size === 0) return; // tak ada halaman termuat — jangan mengarang progres
    const elapsed = Date.now() - sessionStartAt.current;
    if (elapsed < 5000 && visited.size < 2) return; // buka-tutup kilat, tanpa aktivitas baca
    const pagesSorted = [...visited.keys()].sort((a, b) => a - b);
    const firstPage = visited.get(pagesSorted[0]);
    const lastPage = visited.get(pagesSorted[pagesSorted.length - 1]);
    const verses = pagesSorted.reduce((acc, p) => acc + (visited.get(p)?.ayahs ?? 0), 0);
    const from = firstPage?.first;
    const to = lastPage?.last;
    if (!from || !to) return;
    addQuranProgress(todayKey(), {
      pages: visited.size,
      verses,
      surah: from.surah,
      ayahFrom: from.ayah,
      ayahTo: to.surah === from.surah ? to.ayah : undefined,
      markBookmark: false,
      auto: true,
    });
    saveBookmark({ surah: to.surah, ayah: to.ayah, savedAt: new Date().toISOString() });
  }, [addQuranProgress, saveBookmark]);

  useEffect(() => {
    return () => finishSession();
  }, [finishSession]);

  /** Muat halaman; setelah sukses catat kunjungan + posisi + prefetch tetangga. */
  const loadPage = useCallback(
    async (p: number) => {
      const seq = ++requestSeq.current;
      const target = Math.max(1, Math.min(TOTAL_PAGES, Math.round(p)));
      setLoading(true);
      loadingRef.current = true;
      setError(null);
      pageRef.current = target;
      setPage(target);
      const result = await fetchMushafPage(target);
      if (!aliveRef.current || seq !== requestSeq.current) return;
      if (result.ok) {
        setData(result.data);
        setLoading(false);
        loadingRef.current = false;
        setError(null);
        const ayahs = result.data.ayahs;
        const firstA = ayahs[0];
        const lastA = ayahs[ayahs.length - 1];
        visitedRef.current.set(target, {
          ayahs: ayahs.length,
          first: firstA ? { surah: firstA.surah, ayah: firstA.numberInSurah } : null,
          last: lastA ? { surah: lastA.surah, ayah: lastA.numberInSurah } : null,
        });
        if (lastA) setLastRead(lastA.surah, lastA.numberInSurah);
        onPosition({
          page: target,
          juz: result.data.juz,
          surah: firstA?.surah ?? targetSurah,
          ayah: firstA?.numberInSurah ?? targetAyah,
          surahsOnPage: [...new Set(ayahs.map((a) => a.surah))].filter((n) => n > 0),
        });
        // Prefetch halaman tetangga agar flip berikutnya instan (di luar jalur UI).
        setTimeout(() => {
          void fetchMushafPage(target + 1).catch(() => {});
          void fetchMushafPage(target - 1).catch(() => {});
        }, 900);
      } else {
        setError(result.message);
        setLoading(false);
        loadingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setLastRead, onPosition]
  );

  // Posisi awal: terjemahkan target surah:ayat → halaman mushaf.
  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await fetchAyahPage(targetSurah, Math.max(1, targetAyah));
      if (!alive) return;
      void loadPage(p ?? 1);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Selesaikan flip: keluar → muat halaman baru → masuk dari sisi berlawanan. */
  const flipTo = useCallback(
    async (dir: 1 | -1) => {
      const next = pageRef.current + dir;
      if (next < 1 || next > TOTAL_PAGES) {
        // pantulan kecil di tepi
        if (animated) await animate(mvX, 0, { duration: 0.2, ease: "easeOut" });
        else mvX.set(0);
        return;
      }
      setFlipOrigin(dir);
      if (animated) {
        await animate(mvX, dir * stageW.current * 0.92, { duration: 0.17, ease: "easeIn" });
        if (!aliveRef.current) return;
      }
      mvX.set(dir * stageW.current * 0.92);
      await loadPage(next);
      if (!aliveRef.current) return;
      if (animated) {
        mvX.set(-dir * stageW.current * 0.92);
        await animate(mvX, 0, { duration: 0.24, ease: [0.22, 1, 0.36, 1] });
      } else {
        mvX.set(0);
      }
    },
    [animated, loadPage, mvX]
  );

  // ---- Gesture pointer: axis-lock, ikuti jari, lepas → flip atau kembali ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (pickerOpen || loadingRef.current) return;
    dragState.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, axis: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (st.id === null || e.pointerId !== st.id) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      st.axis = Math.abs(dx) > Math.abs(dy) + 4 ? "h" : "v";
      if (st.axis === "h") {
        const atStartEdge = (pageRef.current <= 1 && dx < 0) || (pageRef.current >= TOTAL_PAGES && dx > 0);
        if (atStartEdge) {
          st.axis = "v"; // di tepi — biarkan gestur normal
        } else {
          setFlipOrigin(dx > 0 ? 1 : -1);
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* abaikan */
          }
        }
      }
    }
    if (st.axis === "h") mvX.set(Math.max(-stageW.current, Math.min(stageW.current, dx)));
  };
  const endDrag = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (st.id === null || e.pointerId !== st.id) return;
    st.id = null;
    if (st.axis !== "h") return;
    const dx = mvX.get();
    const dir: 1 | -1 = dx > 0 ? 1 : -1;
    const far = Math.abs(dx) > stageW.current * 0.22;
    if (far) {
      void flipTo(dir);
    } else if (animated) {
      void animate(mvX, 0, { duration: 0.2, ease: "easeOut" }); // pantulan ke posisi awal
    } else {
      mvX.set(0);
    }
  };

  const filteredSurahs = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return SURAH_LIST;
    return SURAH_LIST.filter(
      (s) => s.latin.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q) || String(s.number) === q
    );
  }, [pickerQuery]);

  const jumpToSurah = async (surah: number) => {
    setPickerOpen(false);
    setResolving(true);
    const p = await fetchAyahPage(surah, 1);
    setResolving(false);
    mvX.set(0);
    void loadPage(p ?? 1);
  };

  // Kelompokkan ayat per surah untuk band nama surah + bismillah terpisah.
  const groups = useMemo(() => {
    if (!data) return [];
    const out: { surah: number; ayahs: { numberInSurah: number; text: string; bismillah: string | null }[] }[] = [];
    for (const a of data.ayahs) {
      const g = out[out.length - 1];
      if (g && g.surah === a.surah) {
        g.ayahs.push({ numberInSurah: a.numberInSurah, text: a.text, bismillah: null });
      } else {
        const st = stripBismillah(a.text, a.surah, a.numberInSurah);
        out.push({ surah: a.surah, ayahs: [{ numberInSurah: a.numberInSurah, text: st.text, bismillah: st.bismillah }] });
      }
    }
    return out;
  }, [data]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={stageRef} className="relative min-h-0 flex-1">
        {/* Kertas di balik lembar — terlihat saat lembar depan dibalik */}
        <div aria-hidden className="quran-paper absolute inset-0 rounded-[1.25rem] border border-[#e8e2da] shadow-[0_10px_36px_-18px_rgba(60,40,10,0.35)]" />

        {/* Lembar halaman aktif (bisa discroll vertikal di dalam kertas) */}
        <div
          className="thin-scrollbar mushaf-flip-stage absolute inset-0 overflow-y-auto"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "pan-y" }}
        >
          <motion.div
            ref={sheetRef}
            className={cn("mushaf-flip-sheet mx-auto flex min-h-full w-full max-w-[640px] flex-col px-3 py-3 sm:px-4")}
            style={{ x: mvX, rotateY, opacity: flipOpacity, transformOrigin: "right center" }}
          >
            {loading && !data ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
                <LoaderCircle size={28} className="animate-spin text-[#b45309]" />
                <p className="text-xs text-[#8a8a8a]">Memuat halaman mushaf…</p>
              </div>
            ) : error && !data ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf1e3] text-[#b45309]">
                  <TriangleAlert size={22} />
                </span>
                <p className="max-w-[280px] font-display text-sm font-bold text-[#111111]">Gagal memuat halaman</p>
                <p className="max-w-[280px] text-xs leading-relaxed text-[#8a8a8a]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadPage(pageRef.current)}
                  className="mt-1 flex min-h-[42px] items-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-bold text-white"
                >
                  <RotateCcw size={15} /> Coba lagi
                </button>
              </div>
            ) : data ? (
              <div className="quran-paper flex min-h-full flex-1 flex-col rounded-[1.25rem] border border-[#e8e2da] shadow-[0_10px_36px_-18px_rgba(60,40,10,0.35)]">
                {/* Kepala halaman: juz + nomor halaman kecil */}
                <div className="flex items-center justify-between gap-2 border-b border-[#e8e2da] px-3 pb-2 pt-3">
                  <span className="quran-juz-chip rounded-full px-2.5 py-1 text-[10.5px] font-bold">
                    Juz {data.juz} · الجزء {toArabicDigits(data.juz)}
                  </span>
                  <span className="tnum text-[10px] font-semibold text-[#8a8a8a]">
                    Halaman {data.page} / {TOTAL_PAGES}
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-1 items-center justify-center gap-2 py-16 text-[#8a8a8a]">
                    <LoaderCircle size={20} className="animate-spin text-[#b45309]" />
                    <span className="text-xs">Memuat halaman {page}…</span>
                  </div>
                ) : (
                  <div className="quran-mushaf flex-1 px-1.5 pb-2 pt-4" style={{ fontSize: arabicSize, lineHeight: 2.05 }}>
                    {groups.map((g, gi) => {
                      const meta = getSurah(g.surah);
                      return (
                        <section key={`${g.surah}-${gi}`}>
                          <div className="quran-surah-band mx-auto mb-4 mt-4 flex items-center justify-center gap-3 rounded-[0.6rem] px-4 py-2">
                            <span className="h-px w-8 bg-[#d9c9b2]" aria-hidden />
                            <span className="text-[1.28em] leading-snug">سُورَةُ {meta?.arabic ?? ""}</span>
                            <span className="h-px w-8 bg-[#d9c9b2]" aria-hidden />
                          </div>
                          {g.ayahs.map((a) => (
                            <span key={a.numberInSurah} className="inline">
                              {a.bismillah ? (
                                <span className="quran-bismillah block text-center text-[1.24em] leading-[2.1] text-[#111111]">
                                  {a.bismillah}
                                </span>
                              ) : null}
                              <span>
                                {a.text}
                                <span className="quran-ayah-end"> ﴿{toArabicDigits(a.numberInSurah)}﴾</span>
                              </span>
                            </span>
                          ))}
                        </section>
                      );
                    })}
                  </div>
                )}

                {/* Kaki halaman: medalion nomor halaman */}
                <div className="mt-auto flex items-center justify-center border-t border-[#e8e2da] px-3 pb-3 pt-2">
                  <span className="quran-page-medal flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold">
                    {toArabicDigits(data.page)}
                  </span>
                </div>
                {data.fromCache ? (
                  <p className="pb-2 text-center text-[9.5px] text-[#8a8a8a]">Dari simpanan perangkat (offline)</p>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* Pilihan surah — sheet daftar di atas kertas */}
        {pickerOpen ? (
          <div className="absolute inset-0 z-30 flex flex-col rounded-[1.25rem] bg-tk-stage/95 backdrop-blur" role="dialog" aria-label="Pilih surah">
            <div className="flex items-center gap-2 border-b border-tk-line px-3 py-2.5">
              <span className="relative flex-1">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tk-muted" />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Cari surah…"
                  aria-label="Cari surah untuk lompat"
                  className="tk-field rounded-full py-2 pl-9"
                  autoFocus
                />
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Tutup pilihan surah"
                className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="thin-scrollbar flex-1 overflow-y-auto p-2">
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {filteredSurahs.map((s) => (
                  <li key={s.number}>
                    <button
                      type="button"
                      onClick={() => void jumpToSurah(s.number)}
                      className="tap flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-tk-panel-soft"
                    >
                      <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tk-panel-soft text-[10.5px] font-bold text-tk-accent">
                        {s.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-tk-ink">{s.latin}</span>
                        <span className="block text-[9.5px] text-tk-muted">
                          {s.meaning} · {s.verses} ayat
                        </span>
                      </span>
                      <span className="quran-arabic shrink-0 text-[15px] text-tk-accent">{s.arabic}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigasi bawah: mundur / lompat halaman / pilih surah / lanjut */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void flipTo(-1)}
          disabled={(page !== null && page <= 1) || loading}
          aria-label="Halaman sebelumnya"
          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink transition-opacity disabled:opacity-35"
        >
          <ChevronRight size={18} />
        </button>
        <form
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-tk-line bg-tk-panel px-3.5 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(jumpValue, 10);
            if (!Number.isNaN(n) && n >= 1 && n <= TOTAL_PAGES) {
              mvX.set(0);
              void loadPage(n);
              setJumpValue("");
            }
          }}
        >
          <input
            type="number"
            min={1}
            max={TOTAL_PAGES}
            inputMode="numeric"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            placeholder={`Lompat halaman 1–${TOTAL_PAGES}`}
            aria-label="Lompat ke halaman"
            className="tnum min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-tk-ink outline-none placeholder:text-tk-muted/70"
          />
          <span className="tnum shrink-0 text-[11px] font-bold text-tk-muted">
            {page ?? "–"} / {TOTAL_PAGES}
          </span>
        </form>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Pilih surah"
          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
        >
          <ListFilter size={17} />
        </button>
        <button
          type="button"
          onClick={() => void flipTo(1)}
          disabled={(page !== null && page >= TOTAL_PAGES) || loading}
          aria-label="Halaman berikutnya"
          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink transition-opacity disabled:opacity-35"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      {resolving ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-tk-muted">
          <LoaderCircle size={11} className="animate-spin" /> Mencari halaman awal surah…
        </p>
      ) : null}
    </div>
  );
}
