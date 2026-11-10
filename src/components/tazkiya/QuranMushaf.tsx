"use client";

/**
 * Tazkiya — Mode Mushaf IMMERSIVE FULLSCREEN berbasis SURAH (v2).
 *
 * Pengalaman membaca buku: tanpa header aplikasi, tanpa saklar mode permanen,
 * tanpa navigasi bawah, tanpa footer teknis — hanya lembar mushaf yang
 * memenuhi viewport (safe-area diperhitungkan). Seluruh kontrol bersifat
 * MENGAMBANG dan otomatis menyembunyikan diri: ketuk halaman untuk
 * menampilkan/menyembunyikan.
 *
 * Teks: MUSHAF STANDAR INDONESIA (Kemenag RI) — teks resmi MSI + terjemahan
 * resmi Kemenag, dirender dengan font resmi LPMQ Isep Misbah. Nomor halaman
 * resmi mushaf (1–604, terverifikasi identik dengan penomoran Madinah/Tanzil).
 *
 * Halaman: hanya surah yang sedang dibuka (ayat pertama → terakhir, tanpa
 * duplikasi/ayat hilang), dipaginasi otomatis mengikuti nomor halaman resmi.
 * Penghitung halaman internal ("Halaman 2 dari 4") konsisten per surah dan
 * TIDAK diklaim sebagai nomor halaman MSI — hanya "hlm mushaf" yang memakai
 * nomor resmi.
 *
 * Animasi: Realistic 3D paper page turn yang SIMETRIS — lembar dua muka
 * (depan = halaman yang mendarat, belakang = perkamen ivory), rotateY
 * mengikuti gestur, bayangan jilid & bayangan jatuh mengikuti lengkungan,
 * lembar memudar tepat saat terentang keluar buku. Arah:
 *   SWIPE KE KANAN  = HALAMAN SELANJUTNYA   (lembar terangkat, menampakkan
 *                                            halaman berikutnya di bawahnya)
 *   SWIPE KE KIRI   = HALAMAN SEBELUMNYA    (lembar kembali dari jilid,
 *                                            halaman kini tetap di bawahnya)
 * Kedua arah memakai durasi, easing, sudut, kelengkungan, dan snap yang sama.
 *
 * Suara: gesekan kertas lembut (Web Audio) HANYA saat halaman berhasil
 * dibalik; dapat dimatikan dari panel pengaturan mengambang.
 *
 * Progres & penanda tetap satu sistem dengan mode Terjemahan: halaman dan
 * rentang ayat yang benar-benar dibuka dicatat saat sesi berakhir; posisi
 * terakhir & penanda tersimpan, tersinkron cloud.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookText,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ListFilter,
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
  Bookmark as BookmarkIcon,
  TriangleAlert,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  fetchMsiSurah,
  paginateMsiForMushaf,
  toArabicDigitsMsi,
  getSurah,
  SURAH_LIST,
  type MsiMushafPage,
} from "@/lib/tazkiya/quran-msi";
import { playPageFlip } from "@/lib/tazkiya/page-sound";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

export interface MushafPosition {
  /** Surah yang sedang dibaca (tetap satu surah selama sesi mushaf). */
  surah: number;
  /** Ayat pertama yang tampak pada halaman kini — posisi penanda/pindah mode. */
  ayah: number;
  /** Nomor halaman mushaf resmi tempat ayat-ayat ini berada. */
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
/** Interval auto-hide kontrol mengambang (ms). */
const CONTROLS_HIDE_MS = 4500;

export function MushafView({
  surah,
  startAyah,
  animated,
  arabicSize,
  pageSound,
  onPosition,
  onJumpSurah,
  onExit,
  onSwitchToTranslation,
}: {
  surah: number;
  startAyah: number;
  animated: boolean;
  arabicSize: number;
  pageSound: boolean;
  onPosition: (pos: MushafPosition) => void;
  onJumpSurah: (surah: number) => void;
  onExit: () => void;
  onSwitchToTranslation: () => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const setLastRead = useWorshipStore((s) => s.setLastRead);
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);
  const addQuranProgress = useWorshipStore((s) => s.addQuranProgress);
  const ayahBookmarks = useWorshipStore((s) => s.ayahBookmarks);
  const toggleAyahBookmark = useWorshipStore((s) => s.toggleAyahBookmark);

  const meta = getSurah(surah);
  const showTranslation = settings.quranMushafTranslation ?? false;
  const transSize = settings.readerTransSize;

  const [pages, setPages] = useState<MsiMushafPage[] | null>(null);
  const [bismillah, setBismillah] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  /** Lembar yang sedang terangkat: from = halaman kini, to = halaman tujuan. */
  const [flip, setFlip] = useState<{ dir: 1 | -1; from: number; to: number } | null>(null);

  // Kontrol mengambang: tampil → sembunyi sendiri setelah tanpa interaksi.
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fsSupported = useRef(false);
  const hideTimer = useRef<number | null>(null);

  const idxRef = useRef(0);
  const pagesRef = useRef<MsiMushafPage[] | null>(null);
  const flipRef = useRef<{ dir: 1 | -1; from: number; to: number; mode: "drag" | "anim" } | null>(null);
  const scrollTopRef = useRef(0);
  const visitedRef = useRef<VisitedMap>(new Map());
  const recordedRef = useRef(false);
  const sessionStartAt = useRef(Date.now());
  const aliveRef = useRef(true);
  const requestSeq = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageW = useRef(360);

  // ---- Sudut lembar (motion value; hanya transform) ----
  const angle = useMotionValue(0);
  /** Faktor lengkung 0..1 (sin sudut) untuk bayangan jilid & jatuh. */
  const curl = useTransform(angle, (deg) => Math.sin((Math.min(180, Math.abs(deg)) * Math.PI) / 180));
  const leafShadeOpacity = useTransform(curl, (c) => c * 0.2);
  const castShadowOpacity = useTransform(curl, (c) => c * 0.24);
  /** Lembar memudar tepat saat terentang keluar tepi buku (≥160°) —
   * menyamarkan pergantian kertas dasar di kedua arah secara identik. */
  const leafOpacity = useTransform(angle, (deg) => {
    const a = Math.abs(deg);
    if (a >= 172) return 0;
    if (a > 160) return (172 - a) / 12;
    return 1;
  });

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

  /* ---------- Kontrol mengambang: tampil/sembunyi ---------- */
  const armHideTimer = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!sheetOpen) setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  }, [sheetOpen]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    armHideTimer();
  }, [armHideTimer]);

  const toggleControls = useCallback(() => {
    setControlsVisible((v) => {
      if (!v) armHideTimer();
      else if (hideTimer.current) window.clearTimeout(hideTimer.current);
      return !v;
    });
  }, [armHideTimer]);

  useEffect(() => {
    if (sheetOpen || pickerOpen) {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setControlsVisible(true);
    } else if (controlsVisible) {
      armHideTimer();
    }
  }, [sheetOpen, pickerOpen]);

  /* ---------- Fullscreen API (opt-in pengguna; fallback = layout immersive) ---------- */
  useEffect(() => {
    fsSupported.current = typeof document !== "undefined" && !!document.documentElement.requestFullscreen && !!document.fullscreenEnabled;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (rootRef.current) {
        await rootRef.current.requestFullscreen();
      }
    } catch {
      // Dukungan/izin browser terbatas — layout immersive tetap berjalan.
      toast.info("Layar penuh browser tidak tersedia di perangkat ini. Mode imersif tetap aktif.");
    }
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

  /** Muat surah MSI (cache → berkas statis), paginasi menjadi halaman mushaf. */
  const loadSurah = useCallback(
    async (force = false) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      const result = await fetchMsiSurah(surah, force);
      if (!aliveRef.current || seq !== requestSeq.current) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      const paginated = paginateMsiForMushaf(result.data);
      if (paginated.length === 0) {
        setError("Data ayat surah ini tidak dapat dibaca.");
        setLoading(false);
        return;
      }
      pagesRef.current = paginated;
      setPages(paginated);
      setBismillah(result.data.bismillah);
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
  }, [pages, idx, surah]);

  /** Ganti halaman internal tanpa animasi (lompat halaman / pilih surah sama). */
  const goToIndex = useCallback(
    (i: number) => {
      const ps = pagesRef.current;
      if (!ps || flipRef.current) return;
      const target = Math.max(0, Math.min(ps.length - 1, Math.round(i)));
      angle.set(0);
      idxRef.current = target;
      setIdx(target);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    },
    [angle]
  );

  /**
   * Mulai flip. Simetri arah:
   *  dir=1 (selanjutnya): kertas dasar = halaman TUJUAN; lembar depan = halaman
   *    ASAL; sudut 0 → 180 (lembar terangkat, tujuan tampak di bawahnya).
   *  dir=-1 (sebelumnya): kertas dasar = halaman ASAL (layar tak berubah saat
   *    gestur mulai); lembar depan = halaman TUJUAN yang mendarat; sudut
   *    180 → 0 (lembar kembali dari jilid menutupi halaman kini).
   */
  const beginFlip = useCallback(
    (dir: 1 | -1): boolean => {
      const ps = pagesRef.current;
      if (!ps || flipRef.current) return false;
      const from = idxRef.current;
      const to = from + dir;
      if (to < 0 || to >= ps.length) return false;
      scrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
      if (dir === 1 && scrollRef.current) scrollRef.current.scrollTop = 0; // halaman berikutnya mulai dari atas
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
      flipRef.current = null;
      angle.set(0);
      setFlip(null);
      if (commit) {
        idxRef.current = st.to;
        setIdx(st.to);
        // dir=-1: lembar mendarat dari atas → halaman di bawahnya juga dari atas.
        if (st.dir === -1 && scrollRef.current) scrollRef.current.scrollTop = 0;
      } else if (st.dir === 1 && scrollTopRef.current > 0) {
        // Batal maju: pulihkan posisi gulir halaman asal.
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollTopRef.current;
        });
      }
    },
    [angle, animated]
  );

  /** Balik satu halaman via tombol/keyboard (programatis). */
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
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        return;
      }
      if (!beginFlip(dir)) return;
      playPageFlipIfOn(pageSound);
      void settleFlip(true);
    },
    [animated, beginFlip, loading, pageSound, settleFlip]
  );

  /* ---------- Keyboard (desktop): → = berikutnya, ← = sebelumnya ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flipStep(1);
      else if (e.key === "ArrowLeft") flipStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipStep]);

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
        // SWIPE KE KANAN (dx > 0) = HALAMAN SELANJUTNYA (dir 1).
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
      // Kedua arah: rentang sudut identik (170°), hanya titik awal berbeda.
      const deg = dir === 1 ? p * DRAG_MAX_DEG : 180 - p * DRAG_MAX_DEG;
      angle.set(deg);
    }
  };
  const endDrag = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (st.id === null || e.pointerId !== st.id) return;
    st.id = null;
    if (st.axis === null) {
      toggleControls(); // ketukan halaman: tampilkan/sembunyikan kontrol
      return;
    }
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

  /* ---------- Panel pengaturan (sheet mengambang) ---------- */
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

  const totalPages = pages?.length ?? 0;
  const pageFirstAyah = currentPage?.ayahs[0]?.numberInSurah ?? 1;
  const pageLastAyah = currentPage?.ayahs[currentPage.ayahs.length - 1]?.numberInSurah ?? 1;
  const pageBookmarked = ayahBookmarks.some((b) => b.surah === surah && b.ayah === pageFirstAyah);

  const bookmarkPageAyah = () => {
    toggleAyahBookmark(surah, pageFirstAyah);
    if (pageBookmarked) {
      toast.info(`Penanda ayat ${pageFirstAyah} dihapus`);
    } else {
      saveBookmark({ surah, ayah: pageFirstAyah, savedAt: new Date().toISOString() });
      toast.success(`Ayat ${pageFirstAyah} ditandai · ${meta?.latin ?? ""}`);
    }
    armHideTimer();
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
            Juz {p.juz} · الجزء {toArabicDigitsMsi(p.juz)}
          </span>
          <span className="tnum text-[10px] font-semibold text-[#8a8378]">
            Halaman {pi + 1} dari {pages!.length}
          </span>
        </div>

        <div className="quran-mushaf flex-1 px-2 pb-2 pt-3" data-tr={showTranslation ? "1" : "0"} style={{ fontSize: arabicSize, lineHeight: showTranslation ? 1.9 : 2.15 }}>
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
          {p.ayahs.map((a) =>
            showTranslation ? (
              <span key={a.numberInSurah} className="msi-ayah-wrap">
                <span>
                  {a.text}
                  <span className="quran-ayah-end"> ﴿{toArabicDigitsMsi(a.numberInSurah)}﴾</span>
                </span>
                <motion.span
                  className="msi-translation"
                  dir="ltr"
                  style={{ fontSize: transSize }}
                  initial={animated ? { opacity: 0, y: -5 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min((a.numberInSurah % 12) * 0.03, 0.3), ease: "easeOut" }}
                >
                  {a.translation}
                </motion.span>
              </span>
            ) : (
              <span key={a.numberInSurah} className="inline">
                <span>
                  {a.text}
                  <span className="quran-ayah-end"> ﴿{toArabicDigitsMsi(a.numberInSurah)}﴾</span>
                </span>{" "}
              </span>
            )
          )}
        </div>

        {/* Kaki halaman: medalion nomor halaman mushaf resmi */}
        <div className="mt-auto flex flex-col items-center gap-1 border-t border-[#eee7da] px-3 pb-3 pt-2">
          <span className="quran-page-medal flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold">
            {toArabicDigitsMsi(p.page)}
          </span>
          <span className="tnum text-[9px] font-semibold uppercase tracking-wide text-[#a09484]">hlm mushaf {p.page}</span>
        </div>
      </div>
    );
  };

  const btnFloating =
    "tap flex h-10 w-10 items-center justify-center rounded-full border border-tk-line bg-tk-panel/95 text-tk-ink shadow-[0_4px_18px_-8px_rgba(20,12,2,0.45)] backdrop-blur transition-opacity";
  const ctrCls = cn(
    "absolute inset-x-0 z-30 flex items-center gap-2 px-3 transition-all duration-300",
    controlsVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
  );

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-tk-stage">
      {/* Ruang mushaf: memenuhi viewport, safe-area diperhitungkan */}
      <div
        ref={stageRef}
        className="mushaf-stage relative min-h-0 flex-1"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        }}
      >
        {/* Kertas dasar: halaman tujuan saat flip maju / halaman kini saat
            tidak membalik / halaman asal saat flip mundur. Bisa discroll. */}
        <div
          ref={scrollRef}
          className={cn("thin-scrollbar absolute inset-0 overflow-y-auto", flip ? "select-none" : "mushaf-grab")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "pan-y" }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col px-2.5 py-1 sm:px-4">
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
                  className="tap mt-1 flex min-h-[42px] items-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-bold text-white"
                >
                  <RotateCcw size={15} /> Coba lagi
                </button>
              </div>
            ) : pages && currentPage ? (
              <>
                {/* dasar: tujuan saat maju, asal saat mundur, kini saat diam */}
                {renderPagePaper(flip ? (flip.dir === 1 ? flip.to : flip.from) : idx)}
                {/* Bayangan lembar yang terangkat jatuh ke halaman di bawahnya
                    (di sisi jilid kanan kertas) */}
                {flip ? (
                  <div aria-hidden className="mushaf-3d pointer-events-none absolute inset-0">
                    <div className="absolute inset-y-1 left-1/2 w-full max-w-[640px] -translate-x-1/2 pr-2.5 sm:pr-4">
                      <motion.div className="mushaf-cast-shadow absolute inset-y-0 right-0 w-[120px]" style={{ opacity: castShadowOpacity }} />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* Lembar terangkat: belakang = perkamen ivory; depan = halaman yang
            mendarat (tujuan saat mundur, asal saat maju). Lembar dibungkus
            kolom selebar kertas agar engsel jatuh di TEPI KERTAS (jilid buku
            fisik), bukan tepi panggung. Wrapper .mushaf-3d meneruskan
            perspektif panggung (tanpa itu rotasi kehilangan kedalaman 3D). */}
        {flip ? (
          <div aria-hidden className="mushaf-3d pointer-events-none absolute inset-0">
            <div className="mushaf-3d absolute inset-y-0 left-1/2 w-full max-w-[640px] -translate-x-1/2">
              <motion.div
                className="mushaf-leaf absolute inset-0"
                style={{ rotateY: angle, transformOrigin: "right center", opacity: leafOpacity }}
              >
                <div className="mushaf-face mushaf-face-front absolute inset-0">
                  <div className="h-full px-2.5 py-1 sm:px-4">
                    <div className="h-full" style={{ transform: flip.dir === 1 ? `translateY(-${scrollTopRef.current}px)` : undefined }}>
                      {renderPagePaper(flip.dir === 1 ? flip.from : flip.to, { ariaHidden: true })}
                    </div>
                  </div>
                  {/* Bayangan permukaan depan di sisi jilid */}
                  <motion.div aria-hidden className="mushaf-leaf-shade absolute inset-0" style={{ opacity: leafShadeOpacity }} />
                </div>
                <div className="mushaf-face mushaf-face-back absolute inset-0">
                  <div className="mushaf-verso relative h-full px-2.5 py-1 sm:px-4">
                    <div className="mushaf-verso-orn relative flex h-full min-h-[320px] flex-col rounded-[1.25rem] border border-[#e9e1d2]" />
                  </div>
                  <motion.div aria-hidden className="mushaf-leaf-shade absolute inset-0" style={{ opacity: leafShadeOpacity }} />
                </div>
              </motion.div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------- Kontrol mengambang ATAS: keluar · nama surah · aksi ---------- */}
      <div
        className={ctrCls}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
        aria-hidden={!controlsVisible}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label="Kembali ke pemilihan surah"
          className={cn(btnFloating, "shrink-0")}
        >
          <X size={17} />
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={`Surah saat ini: ${meta?.latin ?? ""}. Ketuk untuk memilih surah lain`}
          className="tap flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-tk-line bg-tk-panel/95 px-3 text-[12.5px] font-bold text-tk-ink shadow-[0_4px_18px_-8px_rgba(20,12,2,0.45)] backdrop-blur"
        >
          <ListFilter size={14} className="shrink-0 text-tk-muted" />
          <span className="truncate">{meta?.latin ?? ""}</span>
          <span className="tnum shrink-0 text-[10.5px] font-semibold text-tk-muted">
            {totalPages ? `${idx + 1}/${totalPages}` : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={bookmarkPageAyah}
          aria-label={pageBookmarked ? `Hapus penanda ayat ${pageFirstAyah}` : `Tandai ayat ${pageFirstAyah}`}
          aria-pressed={pageBookmarked}
          className={cn(btnFloating, "shrink-0", pageBookmarked && "border-tk-violet/50 text-tk-violet dark:border-tk-accent/50 dark:text-tk-accent")}
        >
          <BookmarkIcon size={16} fill={pageBookmarked ? "currentColor" : "none"} />
        </button>
        {fsSupported.current ? (
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Keluar dari layar penuh" : "Masuk layar penuh"}
            className={cn(btnFloating, "shrink-0")}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          aria-label="Pengaturan halaman"
          aria-expanded={sheetOpen}
          className={cn(btnFloating, "shrink-0", sheetOpen && "border-tk-violet/50 text-tk-violet dark:border-tk-accent/50 dark:text-tk-accent")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="9" cy="7" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="7" cy="17" r="1.8" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      {/* ---------- Kontrol mengambang BAWAH: navigasi halaman ---------- */}
      <div
        className={ctrCls}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
        aria-hidden={!controlsVisible}
      >
        <button
          type="button"
          onClick={() => flipStep(-1)}
          disabled={(pages !== null && idx <= 0) || loading}
          aria-label="Halaman sebelumnya (geser kiri)"
          className={cn(btnFloating, "shrink-0 disabled:opacity-35")}
        >
          <ChevronRight size={17} />
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`Halaman ${idx + 1} dari ${totalPages || 1}, halaman mushaf ${currentPage?.page ?? "-"}. Ketuk untuk lompat halaman`}
          className="tap flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-tk-line bg-tk-panel/95 px-3 shadow-[0_4px_18px_-8px_rgba(20,12,2,0.45)] backdrop-blur"
        >
          <span className="tnum truncate text-[11px] font-bold text-tk-ink">
            {totalPages ? `Halaman ${idx + 1}/${totalPages}` : "Menyiapkan…"}
          </span>
          <span className="tnum shrink-0 text-[10.5px] font-semibold text-tk-muted">
            hlm mushaf {currentPage?.page ?? "–"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => flipStep(1)}
          disabled={(pages !== null && idx >= totalPages - 1) || loading}
          aria-label="Halaman berikutnya (geser kanan)"
          className={cn(btnFloating, "shrink-0 disabled:opacity-35")}
        >
          <ChevronLeft size={17} />
        </button>
      </div>

      {/* ---------- Sheet pengaturan halaman (mengambang, kontekstual) ---------- */}
      {sheetOpen ? (
        <div
          className="absolute inset-0 z-40 flex flex-col justify-end bg-black/25"
          role="dialog"
          aria-label="Pengaturan halaman mushaf"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="tk-fade-in mx-auto w-full max-w-[640px] space-y-4 rounded-t-[1.5rem] border border-tk-line bg-tk-panel p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-display text-[14px] font-bold text-tk-ink">Pengaturan Mushaf</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Tutup pengaturan"
                className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line text-tk-muted"
              >
                <X size={14} />
              </button>
            </div>

            {/* Ukuran tampilan bacaan */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-tk-ink">Ukuran teks Arab</p>
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

            {/* Mode terjemahan pada mushaf */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-tk-ink">Tampilkan Terjemahan</p>
              <button
                type="button"
                role="switch"
                aria-checked={showTranslation}
                onClick={() => updateSettings({ quranMushafTranslation: !showTranslation })}
                className={cn(
                  "tap relative h-6 w-11 rounded-full border transition-colors",
                  showTranslation ? "border-tk-violet/60 bg-tk-violet" : "border-tk-line bg-tk-panel-soft"
                )}
              >
                <span
                  className={cn("absolute top-0.5 rounded-full bg-white shadow transition-all", showTranslation ? "left-[22px]" : "left-0.5")}
                  style={{ height: 18, width: 18 }}
                />
              </button>
            </div>
            {showTranslation ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-tk-ink">Ukuran terjemahan</p>
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
            ) : null}

            {/* Suara efek kertas */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-tk-ink">Suara halaman</p>
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
                  className={cn("absolute top-0.5 rounded-full bg-white shadow transition-all", pageSound ? "left-[22px]" : "left-0.5")}
                  style={{ height: 18, width: 18 }}
                />
              </button>
            </div>

            {/* Lompat halaman */}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(jumpValue, 10);
                if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
                  goToIndex(n - 1);
                  setJumpValue("");
                  setSheetOpen(false);
                } else {
                  toast.error(`Masukkan halaman 1–${totalPages || 1}`);
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
                className="tk-field tnum min-w-0 flex-1 rounded-full py-2"
              />
              <button type="submit" className="tap flex h-9 shrink-0 items-center rounded-full gs-ink-btn px-4 text-[12px] font-bold">
                Lompat
              </button>
            </form>

            {/* Pindah mode & info sumber */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  onSwitchToTranslation();
                }}
                className="tap flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-tk-line bg-tk-panel-soft px-3 text-[12px] font-bold text-tk-ink"
              >
                <BookText size={14} /> Mode Terjemahan
              </button>
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setPickerOpen(true);
                }}
                className="tap flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-tk-line bg-tk-panel-soft px-3 text-[12px] font-bold text-tk-ink"
              >
                <Search size={14} /> Pilih Surah
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-tk-muted">
              Teks Mushaf Standar Indonesia — Kementerian Agama RI, font LPMQ Isep Misbah. Ayat {pageFirstAyah}–{pageLastAyah} pada
              halaman ini · geser kanan = halaman berikutnya, geser kiri = sebelumnya.
            </p>
          </div>
        </div>
      ) : null}

      {/* Pilihan surah — sheet daftar di atas kertas */}
      {pickerOpen ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-tk-stage/95 backdrop-blur" role="dialog" aria-label="Pilih surah">
          <div className="flex items-center gap-2 border-b border-tk-line px-3 py-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
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
  );
}

/** Mainkan suara hanya bila pengaturan aktif (dipanggil setelah gestur). */
function playPageFlipIfOn(enabled: boolean) {
  if (enabled) playPageFlip(0.22);
}
