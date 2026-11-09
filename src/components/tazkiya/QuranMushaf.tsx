"use client";

/**
 * Tazkiya — Mode Mushaf berbasis SURAH (Surah Based Digital Mushaf).
 * Menampilkan HANYA surah yang sedang dibuka: ayat-ayatnya dipaginasi
 * mengikuti nomor halaman mushaf Madinah resmi (Tanzil per ayat) — ayat
 * surah lain tidak pernah ikut tampil, urutan ayat asli, tanpa duplikasi.
 * Halaman terakhir surah = akhir bacaan (tidak melanjutkan surah berikut).
 *
 * Tampilan: kertas ivory permanen di kedua tema, bingkai halus ganda,
 * band nama surah + basmalah terpisah di halaman pertama, penanda akhir
 * ayat berornamen, medalion nomor halaman mushaf + penghitung halaman
 * internal ("Halaman 2 dari 4").
 *
 * Animasi: Realistic 3D paper page turn — lembar dua muka (depan = halaman
 * kini, belakang = perkamen ivory), rotateY mengikuti gestur, memudar
 * bayangan di sekitar jilid, bayangan jatuh pada halaman di bawahnya,
 * easing natural. Mode hemat animasi = pergantian instan.
 *
 * Suara: gesekan kertas lembut (disintesis Web Audio, lihat page-sound.ts)
 * HANYA saat halaman berhasil dibalik; swipe batal & gulir vertikal tanpa
 * suara; dapat dimatikan dari pengaturan (tersimpan di profil).
 *
 * Progres & penanda tetap satu sistem dengan mode Terjemahan: halaman dan
 * rentang ayat yang benar-benar dibuka dicatat saat sesi berakhir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, ListFilter, RotateCcw, TriangleAlert, X, Search } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { fetchSurah, getSurah, paginateSurahForMushaf, toArabicDigits, type MushafSurahPage, SURAH_LIST } from "@/lib/tazkiya/quran";
import { playPageFlip } from "@/lib/tazkiya/page-sound";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

export interface MushafPosition {
  /** Surah yang sedang dibaca (tetap satu surah selama sesi mushaf). */
  surah: number;
  /** Ayat pertama yang tampak pada halaman kini — posisi penanda/pindah mode. */
  ayah: number;
  /** Nomor halaman mushaf Madinah tempat ayat-ayat ini berada. */
  page: number;
  juz: number;
  /** Halaman internal ke- (0-based) dan jumlah halaman surah ini. */
  index: number;
  total: number;
}

/** Posisi sesi: halaman mushaf → rentang ayat yang benar-benar terbuka. */
type VisitedMap = Map<number, { ayahs: number; first: { surah: number; ayah: number } | null; last: { surah: number; ayah: number } | null }>;

/** Sudut maksimum saat mengikuti jari (derajat) — sisanya untuk animasi lepas. */
const DRAG_MAX_DEG = 170;
const COMMIT_RATIO = 0.24;

export function MushafView({
  surah,
  startAyah,
  animated,
  arabicSize,
  pageSound,
  onPosition,
  onJumpSurah,
}: {
  surah: number;
  startAyah: number;
  animated: boolean;
  arabicSize: number;
  pageSound: boolean;
  onPosition: (pos: MushafPosition) => void;
  onJumpSurah: (surah: number) => void;
}) {
  const setLastRead = useWorshipStore((s) => s.setLastRead);
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);
  const addQuranProgress = useWorshipStore((s) => s.addQuranProgress);

  const meta = getSurah(surah);

  const [pages, setPages] = useState<MushafSurahPage[] | null>(null);
  const [bismillah, setBismillah] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  /** Lembar yang sedang terangkat: from = halaman kini, to = halaman tujuan. */
  const [flip, setFlip] = useState<{ dir: 1 | -1; from: number; to: number } | null>(null);

  const idxRef = useRef(0);
  const pagesRef = useRef<MushafSurahPage[] | null>(null);
  const flipRef = useRef<{ dir: 1 | -1; from: number; to: number; mode: "drag" | "anim" } | null>(null);
  const scrollTopRef = useRef(0);
  const visitedRef = useRef<VisitedMap>(new Map());
  const recordedRef = useRef(false);
  const sessionStartAt = useRef(Date.now());
  const aliveRef = useRef(true);
  const requestSeq = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageW = useRef(360);

  // ---- Sudut lembar (motion value; hanya transform) ----
  const angle = useMotionValue(0);
  /** Faktor lengkung 0..1 (sin sudut) untuk bayangan jilid & jatuh. */
  const curl = useTransform(angle, (deg) => Math.sin((Math.min(180, Math.abs(deg)) * Math.PI) / 180));
  const leafShadeOpacity = useTransform(curl, (c) => c * 0.2);
  const castShadowOpacity = useTransform(curl, (c) => c * 0.24);

  const dragState = useRef<{ id: number | null; startX: number; startY: number; axis: "h" | "v" | null }>({ id: null, startX: 0, startY: 0, axis: null });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Lebar panggung agar peta gestur → sudut proporsional.
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

  /** Catat sesi mushaf saat berakhir: halaman + rentang ayat nyata. */
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

  /** Muat surah (cache → jaringan), paginasi menjadi halaman mushaf surah. */
  const loadSurah = useCallback(
    async (force = false) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      const result = await fetchSurah(surah, force);
      if (!aliveRef.current || seq !== requestSeq.current) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      const paginated = paginateSurahForMushaf(result.data);
      if (paginated.length === 0) {
        setError("Data ayat surah ini tidak dapat dibaca.");
        setLoading(false);
        return;
      }
      pagesRef.current = paginated;
      setPages(paginated);
      setBismillah(result.data.bismillah);
      setFromCache(!!result.data.fromCache);
      setLoading(false);
      // Posisi awal: halaman yang memuat ayat target (atau halaman terakhir).
      let start = 0;
      if (startAyah > 1) {
        const found = paginated.findIndex((p) => p.ayahs.some((a) => a.numberInSurah === startAyah));
        if (found >= 0) start = found;
        else if (startAyah > (paginated[paginated.length - 1].ayahs[paginated[paginated.length - 1].ayahs.length - 1]?.numberInSurah ?? 1)) {
          start = paginated.length - 1;
        }
      }
      idxRef.current = start;
      setIdx(start);
    },
    [surah, startAyah]
  );

  useEffect(() => {
    void loadSurah();
  }, [loadSurah]);

  /** Laporkan kunjungan halaman (progres, penanda, posisi ke shell). */
  const currentPage = pages ? pages[idx] : null;
  useEffect(() => {
    if (!pages || !currentPage) return;
    const firstA = currentPage.ayahs[0];
    const lastA = currentPage.ayahs[currentPage.ayahs.length - 1];
    visitedRef.current.set(currentPage.page, {
      ayahs: currentPage.ayahs.length,
      first: firstA ? { surah, ayah: firstA.numberInSurah } : null,
      last: lastA ? { surah, ayah: lastA.numberInSurah } : null,
    });
    if (lastA) setLastRead(surah, lastA.numberInSurah);
    onPosition({
      surah,
      ayah: firstA?.numberInSurah ?? 1,
      page: currentPage.page,
      juz: currentPage.juz,
      index: idx,
      total: pages.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, idx, surah]);

  /** Ganti halaman internal tanpa animasi (lompat/jump picker). */
  const goToIndex = useCallback((i: number) => {
    const ps = pagesRef.current;
    if (!ps || flipRef.current) return;
    const target = Math.max(0, Math.min(ps.length - 1, Math.round(i)));
    angle.set(0);
    idxRef.current = target;
    setIdx(target);
  }, [angle]);

  /** Mulai flip: kertas dasar berganti ke halaman tujuan di balik lembar. */
  const beginFlip = useCallback(
    (dir: 1 | -1): boolean => {
      const ps = pagesRef.current;
      if (!ps || flipRef.current) return false;
      const from = idxRef.current;
      const to = from + dir;
      if (to < 0 || to >= ps.length) return false;
      scrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
      flipRef.current = { dir, from, to, mode: "drag" };
      angle.set(dir === 1 ? 0 : 180);
      setFlip({ dir, from, to });
      return true;
    },
    [angle]
  );

  /** Selesaikan flip: commit → halaman tujuan menjadi kini; batal → kembali. */
  const settleFlip = useCallback(
    async (commit: boolean) => {
      const st = flipRef.current;
      if (!st) return;
      flipRef.current = { ...st, mode: "anim" };
      const endDeg = commit ? (st.dir === 1 ? 180 : 0) : st.dir === 1 ? 0 : 180;
      if (animated) {
        await animate(angle, endDeg, {
          duration: commit ? 0.6 : 0.42,
          ease: commit ? [0.3, 0.72, 0.22, 1] : [0.24, 0.8, 0.32, 1],
        });
        if (!aliveRef.current) return;
      }
      const restoreScroll = commit ? 0 : scrollTopRef.current;
      flipRef.current = null;
      angle.set(0);
      setFlip(null);
      if (commit) {
        idxRef.current = st.to;
        setIdx(st.to);
      } else if (restoreScroll > 0) {
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = restoreScroll;
        });
      }
    },
    [angle, animated]
  );

  /** Balik satu halaman via tombol (atau programatis). */
  const flipStep = useCallback(
    (dir: 1 | -1) => {
      const ps = pagesRef.current;
      if (!ps || flipRef.current || loading) return;
      const from = idxRef.current;
      if (from + dir < 0 || from + dir >= ps.length) return;
      if (!animated) {
        playPageFlipIfOn(pageSound);
        idxRef.current = from + dir;
        setIdx(from + dir);
        return;
      }
      if (!beginFlip(dir)) return;
      playPageFlipIfOn(pageSound);
      void settleFlip(true);
    },
    [animated, beginFlip, loading, pageSound, settleFlip]
  );

  // ---- Gestur pointer: kunci sumbu, ikuti jari, lepas → balik atau kembali ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (flipRef.current || loading || !pagesRef.current) return;
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
        const ps = pagesRef.current;
        const from = idxRef.current;
        const dir: 1 | -1 = dx > 0 ? 1 : -1;
        const atEdge = !ps || from + dir < 0 || from + dir >= ps.length;
        if (atEdge) {
          st.axis = "v"; // di tepi surah — biarkan gestur vertikal normal
        } else {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* abaikan */
          }
          if (animated) beginFlip(dir);
        }
      }
    }
    if (st.axis === "h" && flipRef.current?.mode === "drag") {
      const dir = flipRef.current.dir;
      const p = Math.max(0, Math.min(1, Math.abs(dx) / stageW.current));
      const deg = dir === 1 ? p * DRAG_MAX_DEG : 180 - p * DRAG_MAX_DEG;
      angle.set(deg);
    }
  };
  const endDrag = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (st.id === null || e.pointerId !== st.id) return;
    st.id = null;
    if (st.axis !== "h") return;
    const st2 = flipRef.current;
    if (st2 && st2.mode === "drag") {
      const p = Math.max(0, Math.min(1, Math.abs(mvDx(e)) / stageW.current));
      if (p > COMMIT_RATIO) {
        playPageFlipIfOn(pageSound);
        void settleFlip(true);
      } else {
        void settleFlip(false);
      }
      return;
    }
    if (!animated && st.axis === "h") {
      // Mode hemat animasi: swap instan bila gestur cukup jauh.
      const dx = e.clientX - st.startX;
      const dir: 1 | -1 = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > stageW.current * COMMIT_RATIO) flipStep(dir);
    }
  };
  const mvDx = (e: React.PointerEvent) => e.clientX - dragState.current.startX;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [jumpValue, setJumpValue] = useState("");

  const filteredSurahs = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return SURAH_LIST;
    return SURAH_LIST.filter(
      (s) => s.latin.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q) || String(s.number) === q
    );
  }, [pickerQuery]);

  const jumpToSurah = (target: number) => {
    setPickerOpen(false);
    if (target === surah) {
      goToIndex(0);
      return;
    }
    onJumpSurah(target);
  };

  /** Render isi kertas satu halaman surah (dipakai dasar & lembar depan). */
  const renderPagePaper = (pi: number, opts?: { ariaHidden?: boolean }) => {
    const p = pages?.[pi];
    if (!p) return null;
    const first = pi === 0;
    return (
      <div
        aria-hidden={opts?.ariaHidden}
        className="quran-paper relative flex min-h-full flex-col rounded-[1.25rem] border border-[#e9e1d2] shadow-[0_10px_36px_-18px_rgba(60,40,10,0.35)]"
      >
        {/* Bingkai halus ganda khas mushaf cetak */}
        <div aria-hidden className="mushaf-frame" />
        {/* Kepala halaman: juz + penghitung halaman internal */}
        <div className="flex items-center justify-between gap-2 border-b border-[#eee7da] px-4 pb-2 pt-3">
          <span className="quran-juz-chip rounded-full px-2.5 py-1 text-[10.5px] font-bold">
            Juz {p.juz} · الجزء {toArabicDigits(p.juz)}
          </span>
          <span className="tnum text-[10px] font-semibold text-[#8a8378]">
            Halaman {pi + 1} dari {pages!.length}
          </span>
        </div>

        <div className="quran-mushaf flex-1 px-2 pb-2 pt-3" style={{ fontSize: arabicSize, lineHeight: 2.15 }}>
          {first ? (
            <>
              <div className="quran-surah-band mx-auto mb-1 mt-3 flex items-center justify-center gap-3 rounded-[0.6rem] px-4 py-2">
                <span className="h-px w-8 bg-[#ddd0ba]" aria-hidden />
                <span className="text-[1.28em] leading-snug">سُورَةُ {meta?.arabic ?? ""}</span>
                <span className="h-px w-8 bg-[#ddd0ba]" aria-hidden />
              </div>
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a09484]">
                Surah ke-{surah} · {meta?.place} · {meta?.verses} ayat
              </p>
            </>
          ) : (
            <p className="quran-arabic mb-2 mt-1 text-center text-[0.82em] text-[#b3a68f]" aria-hidden>
              ﴾ سُورَةُ {meta?.arabic ?? ""} ﴿
            </p>
          )}
          {first && bismillah ? (
            <p className="quran-bismillah block pb-1 pt-1 text-center text-[1.24em] leading-[2.1] text-[#111111]">{bismillah}</p>
          ) : null}
          {p.ayahs.map((a) => (
            <span key={a.numberInSurah} className="inline">
              <span>
                {a.text}
                <span className="quran-ayah-end"> ﴿{toArabicDigits(a.numberInSurah)}﴾</span>
              </span>{" "}
            </span>
          ))}
        </div>

        {/* Kaki halaman: medalion nomor halaman mushaf Madinah */}
        <div className="mt-auto flex flex-col items-center gap-1 border-t border-[#eee7da] px-3 pb-3 pt-2">
          <span className="quran-page-medal flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold">
            {toArabicDigits(p.page)}
          </span>
          <span className="tnum text-[9px] font-semibold uppercase tracking-wide text-[#a09484]">hlm mushaf {p.page}</span>
        </div>
      </div>
    );
  };

  const totalPages = pages?.length ?? 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={stageRef} className="mushaf-stage relative min-h-0 flex-1">
        {/* Kertas dasar: halaman tujuan saat flip (tersembunyi di balik lembar),
            halaman kini saat tidak membalik. Bisa discroll vertikal. */}
        <div
          ref={scrollRef}
          className={cn(
            "thin-scrollbar absolute inset-0 overflow-y-auto",
            flip ? "select-none" : "mushaf-grab"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "pan-y" }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col px-3 py-3 sm:px-4">
            {loading && !pages ? (
              <div className="quran-paper relative flex flex-1 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-[#e9e1d2] py-24 text-center">
                <LoaderCircle size={28} className="animate-spin text-[#b45309]" />
                <p className="text-xs text-[#8a8378]">Menyiapkan mushaf {meta?.latin ?? ""}…</p>
              </div>
            ) : error && !pages ? (
              <div className="quran-paper relative flex flex-1 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-[#e9e1d2] py-20 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf1e3] text-[#b45309]">
                  <TriangleAlert size={22} />
                </span>
                <p className="max-w-[280px] font-display text-sm font-bold text-[#111111]">Gagal memuat surah</p>
                <p className="max-w-[280px] text-xs leading-relaxed text-[#8a8378]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadSurah(true)}
                  className="mt-1 flex min-h-[42px] items-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-bold text-white"
                >
                  <RotateCcw size={15} /> Coba lagi
                </button>
              </div>
            ) : pages && currentPage ? (
              <>
                {renderPagePaper(flip ? flip.to : idx)}
                {/* Bayangan lembar yang terangkat jatuh ke halaman di bawah */}
                {flip ? (
                  <motion.div
                    aria-hidden
                    className="mushaf-cast-shadow pointer-events-none absolute inset-y-3 right-3 w-[120px]"
                    style={{ opacity: castShadowOpacity }}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* Lembar terangkat: depan = halaman asal, belakang = perkamen ivory */}
        {flip ? (
          <motion.div
            aria-hidden
            className="mushaf-leaf pointer-events-none absolute inset-0"
            style={{ rotateY: angle, transformOrigin: "right center" }}
          >
            <div className="mushaf-face mushaf-face-front absolute inset-0">
              <div className="mx-auto h-full w-full max-w-[640px] px-3 py-3 sm:px-4">
                <div className="h-full" style={{ transform: `translateY(-${scrollTopRef.current}px)` }}>
                  {renderPagePaper(flip.from, { ariaHidden: true })}
                </div>
              </div>
              {/* Bayangan permukaan depan di sisi jilid */}
              <motion.div aria-hidden className="mushaf-leaf-shade absolute inset-0" style={{ opacity: leafShadeOpacity }} />
            </div>
            <div className="mushaf-face mushaf-face-back absolute inset-0">
              <div className="mushaf-verso relative mx-auto h-full w-full max-w-[640px] px-3 py-3 sm:px-4">
                <div className="mushaf-verso-orn relative flex h-full min-h-[320px] flex-col rounded-[1.25rem] border border-[#e9e1d2]" />
              </div>
              <motion.div aria-hidden className="mushaf-leaf-shade absolute inset-0" style={{ opacity: leafShadeOpacity }} />
            </div>
          </motion.div>
        ) : null}

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
                  aria-label="Cari surah untuk dibuka di mushaf"
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
                      onClick={() => jumpToSurah(s.number)}
                      className={cn(
                        "tap flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-tk-panel-soft",
                        s.number === surah && "bg-tk-panel-soft"
                      )}
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

      {/* Navigasi bawah: mundur / lompat halaman internal / pilih surah / lanjut */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => flipStep(-1)}
          disabled={(pages !== null && idx <= 0) || loading}
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
            if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
              goToIndex(n - 1);
              setJumpValue("");
            }
          }}
        >
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            inputMode="numeric"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            placeholder={totalPages ? `Lompat halaman 1–${totalPages}` : "Halaman…"}
            aria-label="Lompat ke halaman surah"
            className="tnum min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-tk-ink outline-none placeholder:text-tk-muted/70"
          />
          <span className="tnum shrink-0 text-[11px] font-bold text-tk-muted">
            {totalPages ? `${idx + 1} / ${totalPages}` : "–"}
          </span>
        </form>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Pilih surah lain"
          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink"
        >
          <ListFilter size={17} />
        </button>
        <button
          type="button"
          onClick={() => flipStep(1)}
          disabled={(pages !== null && idx >= totalPages - 1) || loading}
          aria-label="Halaman berikutnya"
          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-ink transition-opacity disabled:opacity-35"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      {pages && totalPages > 1 ? (
        <p className="tnum mt-1.5 text-center text-[10px] text-tk-muted">
          Ayat {currentPage?.ayahs[0]?.numberInSurah}–{currentPage?.ayahs[currentPage.ayahs.length - 1]?.numberInSurah} pada halaman ini · hlm mushaf{" "}
          {currentPage?.page}
        </p>
      ) : fromCache ? (
        <p className="mt-1.5 text-center text-[9.5px] text-tk-muted">Dari simpanan perangkat (offline)</p>
      ) : null}
    </div>
  );
}

/** Mainkan suara hanya bila pengaturan aktif (dipanggil setelah gestur). */
function playPageFlipIfOn(enabled: boolean) {
  if (enabled) playPageFlip(0.22);
}
