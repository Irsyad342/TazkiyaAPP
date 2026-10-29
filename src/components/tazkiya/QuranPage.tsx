"use client";

/**
 * Tazkiya — Halaman Al-Qur'an.
 * Kartu target bacaan, sorotan surah paling sering dibaca, jelajah surah
 * (pencarian + filter + sortir dalam grid 2 kolom), juz 1–30, pencatatan
 * ringkas (cukup surah & ayat — rentang dan penanda diisi otomatis), dan
 * riwayat bacaan.
 */

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark as BookmarkIcon,
  Check,
  ChevronRight,
  Flame,
  History,
  Info,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { JUZ_RANGES, SURAH_LIST, getSurah, normalizeArabic } from "@/lib/tazkiya/quran";
import { surahProgressOnDate } from "@/lib/tazkiya/stats";
import { relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { Chip, EmptyState, GlassCard, SectionHeader } from "./ui-bits";
import { cn } from "@/lib/utils";

const inputCls = "tz-field";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tz-muted/90";

type PlaceFilter = "semua" | "Makkiyah" | "Madaniyah" | "ditandai";
type SortMode = "nomor" | "nama" | "ayat";
type ListMode = "surah" | "juz";

const PLACE_FILTERS: { id: PlaceFilter; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "Makkiyah", label: "Makkiyah" },
  { id: "Madaniyah", label: "Madaniyah" },
  { id: "ditandai", label: "Ditandai" },
];

const SORT_MODES: { id: SortMode; label: string }[] = [
  { id: "nomor", label: "Nomor" },
  { id: "nama", label: "A–Z" },
  { id: "ayat", label: "Ayat" },
];

/** Kartu surah ringkas untuk grid jelajah. */
function SurahCard({
  surah,
  showArabic,
  isLastRead,
  isBookmarked,
  onOpen,
}: {
  surah: (typeof SURAH_LIST)[number];
  showArabic: boolean;
  isLastRead: boolean;
  isBookmarked: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="tap relative flex h-full w-full flex-col rounded-2xl border border-tz-line bg-tz-panel-soft p-3 text-left transition-all hover:border-tz-violet/45"
        aria-label={`Buka ${surah.latin}`}
      >
        <div className="flex items-start justify-between gap-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-tz-violet/30 bg-tz-violet/15 text-[10.5px] font-bold text-tz-accent">
            {surah.number}
          </span>
          {showArabic ? (
            <span className="quran-arabic truncate text-[15px] leading-snug text-tz-accent/90">{surah.arabic}</span>
          ) : null}
        </div>
        <span className="mt-1.5 flex items-center gap-1 truncate text-[12.5px] font-bold text-tz-ink">
          {surah.latin}
          {isBookmarked ? <BookmarkIcon size={11} className="shrink-0 text-tz-accent" aria-label="Ada penanda" /> : null}
        </span>
        <span className="truncate text-[10.5px] text-tz-muted">{surah.meaning}</span>
        <span className="text-[10px] font-medium text-tz-muted/80">
          {surah.verses} ayat · {surah.place}
        </span>
        {isLastRead ? (
          <span className="absolute -top-1.5 right-2 rounded-full bg-tz-violet px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-white">
            Terakhir
          </span>
        ) : null}
      </button>
    </li>
  );
}

/** Kartu juz ringkas (juz 1–30 tetap dipertahankan, tampil lebih ringkas). */
function JuzCard({ juz, onOpen }: { juz: (typeof JUZ_RANGES)[number]; onOpen: () => void }) {
  const start = getSurah(juz.startSurah);
  const end = getSurah(juz.endSurah);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="tap flex h-full w-full flex-col rounded-2xl border border-tz-line bg-tz-panel-soft p-3 text-left transition-all hover:border-tz-violet/45"
        aria-label={`Buka Juz ${juz.juz} dari ${start?.latin}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-tz-violet/30 bg-tz-violet/15 text-[10.5px] font-bold text-tz-accent">
            {juz.juz}
          </span>
          <span className="text-[9.5px] font-semibold uppercase tracking-wide text-tz-muted/80">
            {juz.surahs.length} surah
          </span>
        </div>
        <span className="mt-1.5 truncate text-[12.5px] font-bold text-tz-ink">Juz {juz.juz}</span>
        <span className="truncate text-[10.5px] text-tz-accent/90">
          {start?.latin} {juz.startAyah} — {end?.latin} {juz.endAyah}
        </span>
      </button>
    </li>
  );
}

export function QuranPage({ onOpenReader }: { onOpenReader: (surah: number, ayah?: number) => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const bookmarks = useWorshipStore((s) => s.bookmarks);
  const ayahBookmarks = useWorshipStore((s) => s.ayahBookmarks);
  const lastRead = useWorshipStore((s) => s.lastRead);
  const readingHistory = useWorshipStore((s) => s.readingHistory);
  const addQuranProgress = useWorshipStore((s) => s.addQuranProgress);
  const deleteReadingEntry = useWorshipStore((s) => s.deleteReadingEntry);

  const today = todayKey();
  const log = logs[today] ?? {
    date: today,
    prayers: { subuh: false, zuhur: false, asar: false, magrib: false, isya: false },
    extras: { duha: false, tahajud: false, doa: false, puasa: false, sedekah: false },
    quranPages: 0,
    quranVerses: 0,
    zikirCount: 0,
  };

  // Form catat ringkas: cukup surah + ayat.
  const [catSurah, setCatSurah] = useState("");
  const [catAyat, setCatAyat] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  // Jelajah: pencarian, filter, sortir.
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<ListMode>("surah");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("semua");
  const [sortMode, setSortMode] = useState<SortMode>("nomor");

  const targetType = settings.quranTargetType;
  const target = settings.quranDailyTarget;
  // Mode target "surah": progres = jumlah ayat surah pilihan yang benar-benar tercatat dibaca hari ini.
  const targetSurahMeta = getSurah(settings.quranTargetSurah);
  const surahProg =
    targetType === "surah"
      ? surahProgressOnDate(readingHistory, today, settings.quranTargetSurah, targetSurahMeta?.verses ?? 1)
      : null;
  const value = targetType === "halaman" ? log.quranPages : targetType === "ayat" ? log.quranVerses : (surahProg?.read ?? 0);
  const targetValue = targetType === "surah" ? (targetSurahMeta?.verses ?? 1) : target;
  const pct = Math.min(100, Math.round((value / Math.max(1, targetValue)) * 100));
  const unit = targetType === "halaman" ? "halaman" : "ayat";
  const targetSubtitle =
    targetType === "surah"
      ? `Surah ${targetSurahMeta?.latin ?? "?"} · ${targetValue.toLocaleString("id-ID")} ayat`
      : `${target.toLocaleString("id-ID")} ${unit} per hari`;

  const manualBookmark = bookmarks[0];
  const lastPos = lastRead ?? (manualBookmark ? { surah: manualBookmark.surah, ayah: manualBookmark.ayah } : null);
  const lastSurahMeta = lastPos ? getSurah(lastPos.surah) : undefined;
  const bookmarkedSurahs = useMemo(() => new Set(ayahBookmarks.map((b) => b.surah)), [ayahBookmarks]);

  /* ---------- Sorotan: surah yang paling sering dibaca/dibuka ---------- */
  const spotlight = useMemo(() => {
    const map = new Map<number, { count: number; lastDate: string; verses: number }>();
    for (const e of readingHistory) {
      if (!e.surah) continue;
      const cur = map.get(e.surah) ?? { count: 0, lastDate: e.date, verses: 0 };
      cur.count += 1;
      cur.verses += e.verses;
      if (e.date > cur.lastDate) cur.lastDate = e.date;
      map.set(e.surah, cur);
    }
    return [...map.entries()].sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      if (lastRead?.surah === a[0]) return -1;
      if (lastRead?.surah === b[0]) return 1;
      return b[1].lastDate.localeCompare(a[1].lastDate);
    });
  }, [readingHistory, lastRead]);
  const topEntry = spotlight[0];
  const topMeta = topEntry ? getSurah(topEntry[0]) : undefined;
  const runnerUps = spotlight.slice(1, 3);

  /* ---------- Filter & sortir daftar surah ---------- */
  const filterCounts = useMemo(
    () => ({
      makkiyah: SURAH_LIST.filter((s) => s.place === "Makkiyah").length,
      madaniyah: SURAH_LIST.filter((s) => s.place === "Madaniyah").length,
      ditandai: bookmarkedSurahs.size,
    }),
    [bookmarkedSurahs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const norm = normalizeArabic(query.trim());
    let list = SURAH_LIST;
    if (q) {
      list = list.filter(
        (s) =>
          s.latin.toLowerCase().includes(q) ||
          s.meaning.toLowerCase().includes(q) ||
          String(s.number) === q ||
          s.arabic.includes(query.trim()) ||
          (norm.length > 0 && normalizeArabic(s.arabic).includes(norm))
      );
    }
    if (placeFilter === "Makkiyah" || placeFilter === "Madaniyah") list = list.filter((s) => s.place === placeFilter);
    else if (placeFilter === "ditandai") list = list.filter((s) => bookmarkedSurahs.has(s.number));
    if (sortMode === "nama") return [...list].sort((a, b) => a.latin.localeCompare(b.latin));
    if (sortMode === "ayat") return [...list].sort((a, b) => b.verses - a.verses);
    return list;
  }, [query, placeFilter, sortMode, bookmarkedSurahs]);

  const juzFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JUZ_RANGES;
    return JUZ_RANGES.filter((j) => String(j.juz) === q || j.surahs.some((n) => getSurah(n)?.latin.toLowerCase().includes(q)));
  }, [query]);

  /* ---------- Pratinjau catat ringkas: surah + ayat → rentang otomatis ---------- */
  const catPreview = useMemo(() => {
    const s = parseInt(catSurah, 10);
    const y = parseInt(catAyat, 10);
    if (!catSurah || Number.isNaN(s) || !catAyat || Number.isNaN(y) || y < 1) return null;
    const meta = getSurah(s);
    if (!meta) return null;
    const refAyah = manualBookmark?.surah === s ? manualBookmark.ayah : lastRead?.surah === s ? lastRead.ayah : 0;
    const from = refAyah > 0 && refAyah < y ? refAyah + 1 : 1;
    const to = Math.min(y, meta.verses);
    return { meta, from, to, continuing: from > 1, exceeds: y > meta.verses };
  }, [catSurah, catAyat, manualBookmark, lastRead]);

  const saveCatatan = () => {
    const s = parseInt(catSurah, 10);
    const y = parseInt(catAyat, 10);
    if (!catSurah || Number.isNaN(s)) {
      toast.error("Pilih surah terlebih dahulu");
      return;
    }
    if (!catAyat || Number.isNaN(y) || y < 1) {
      toast.error("Masukkan nomor ayat yang valid");
      return;
    }
    const meta = getSurah(s);
    if (meta && y > meta.verses) {
      toast.error(`${meta.latin} hanya memiliki ${meta.verses} ayat`);
      return;
    }
    const p = catPreview;
    if (!p) return;
    addQuranProgress(today, {
      pages: 0,
      verses: p.to - p.from + 1,
      surah: s,
      ayahFrom: p.from,
      ayahTo: p.to,
      markBookmark: true,
    });
    toast.success(
      `Bacaan disimpan: ${p.meta.latin} ${p.from}${p.to > p.from ? `–${p.to}` : ""} · ${p.to - p.from + 1} ayat · penanda di ayat ${p.to}`
    );
    setCatSurah("");
    setCatAyat("");
  };

  return (
    <div className="space-y-6">
      {/* ---------- Judul ---------- */}
      <header className="animate-tz-fade-up flex items-end justify-between pt-1">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-gradient-violet">Al-Qur&apos;an</h1>
          <p className="mt-1 text-sm text-tz-muted">Temukan ketenangan dalam setiap ayat</p>
        </div>
        <span aria-hidden className="pb-1 font-display text-2xl text-tz-accent/40">
          ﴾﴿
        </span>
      </header>

      {/* ---------- Kartu target gaya "Taskello": bingkai + artwork cahaya + tab (ikon tema) ---------- */}
      <article className="tz-task-card animate-tz-fade-up" aria-label="Target bacaan harian">
        <div className="tz-task-inner">
          <div className="tz-task-art" aria-hidden>
            <span className="tz-task-blob tz-task-blob-violet" />
            <span className="tz-task-blob tz-task-blob-gold" />
            <span className="tz-task-blob tz-task-blob-hot" />
            <p className="absolute right-4 top-3.5 text-right leading-tight text-[color:var(--task-ink)]">
              <span className="block text-[11px] font-bold tracking-tight">Tazkiya</span>
              <span className="block text-[9.5px] font-medium text-[color:var(--task-ink-55)]">Al-Qur&apos;an</span>
            </p>
          </div>
          <div className="tz-task-panel">
            <div className="tz-task-tab">
              <span className="flex items-center gap-2">
                <span className="font-display text-[16px] font-bold tracking-tight text-[color:var(--task-ink)]">Target Bacaan Harian</span>
                <span className="shrink-0 rounded-full bg-[color:var(--task-pill-bg)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--task-ink)]">{pct}%</span>
              </span>
              <span className="mt-px truncate text-[11.5px] font-medium text-[color:var(--task-ink-55)]">{targetSubtitle}</span>
            </div>
            <div
              className="tz-beam h-[6px]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progres bacaan hari ini ${pct}%`}
            >
              <div className="tz-beam-fill" style={{ width: `${pct}%` }}>
                <span className="tz-beam-runner" />
              </div>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[color:var(--task-ink-70)]">
              {pct >= 100 ? "Target hari ini tercapai. Barakallah!" : `${Math.max(0, targetValue - value).toLocaleString("id-ID")} ${targetType === "surah" ? "ayat" : unit} lagi menuju target`}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-[color:var(--task-ink-55)]">
              <BookmarkIcon size={12} className="shrink-0 text-[color:var(--task-deco)]" />
              {lastPos
                ? `Terakhir: ${getSurah(lastPos.surah)?.latin ?? `Surah ${lastPos.surah}`} · ayat ${lastPos.ayah}`
                : "Belum ada bacaan — buka surah pertamamu"}
            </p>
            {/* Baris statistik angka-besar khas kartu referensi */}
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-[36px] font-extrabold leading-none tracking-tight text-[color:var(--task-ink)]">
                  {value.toLocaleString("id-ID")}
                </span>
                <span className="text-[12px] font-semibold text-[color:var(--task-ink-45)]">{unit}</span>
              </p>
              <p className="text-[14px] font-bold text-[color:var(--task-ink)]">
                dari {targetValue.toLocaleString("id-ID")} <span className="font-semibold text-[color:var(--task-ink-55)]">{unit}</span>
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* ---------- Lanjutkan bacaan ---------- */}
      <button
        type="button"
        onClick={() => onOpenReader(lastPos?.surah ?? 1, lastPos?.ayah ?? 1)}
        className="tap glass flex w-full items-center gap-3.5 rounded-[1.3rem] p-4 text-left transition-all hover:border-tz-violet/40"
        aria-label="Lanjutkan bacaan Al-Qur'an"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tz-violet to-tz-purple text-white glow-violet-sm">
          <Play size={18} className="ml-0.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-tz-muted">
            {lastPos ? "Lanjutkan Bacaan" : "Mulai Membaca"}
          </span>
          <span className="block truncate text-[14.5px] font-semibold text-tz-ink">
            {lastSurahMeta && lastPos ? `${lastSurahMeta.latin} · ayat ${lastPos.ayah}` : "Al-Fatihah · ayat 1"}
          </span>
        </span>
        <ChevronRight size={17} className="shrink-0 text-tz-muted/70" />
      </button>

      {/* ---------- Sorotan: paling sering dibaca (gaya kartu Taskello) ---------- */}
      {topEntry && topMeta ? (
        <section aria-label="Surah paling sering dibaca" className="animate-tz-fade-up">
          <button
            type="button"
            onClick={() =>
              onOpenReader(
                topEntry[0],
                lastRead?.surah === topEntry[0] ? lastRead.ayah : manualBookmark?.surah === topEntry[0] ? manualBookmark.ayah : 1
              )
            }
            className="tap block w-full text-left"
            aria-label={`Buka ${topMeta.latin} — dibaca ${topEntry[1].count} kali`}
          >
            <div className="tz-task-card">
              <div className="tz-task-inner">
                <div className="tz-task-art tz-task-art--spot" aria-hidden>
                  <span className="tz-task-blob tz-task-blob-violet" />
                  <span className="tz-task-blob tz-task-blob-gold" />
                  <span className="tz-task-blob tz-task-blob-hot" />
                  <p className="absolute right-4 top-3.5 text-right leading-tight text-[color:var(--task-ink)]">
                    <span className="block text-[11px] font-bold tracking-tight">Sorotan</span>
                    <span className="block text-[9.5px] font-medium text-[color:var(--task-ink-55)]">Bacaanmu</span>
                  </p>
                </div>
                <div className="tz-task-panel">
                  <div className="tz-task-tab">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-[16px] font-bold tracking-tight text-[color:var(--task-ink)]">{topMeta.latin}</span>
                      {settings.showArabic ? (
                        <span className="quran-arabic text-[13px] text-[color:var(--task-deco)]">{topMeta.arabic}</span>
                      ) : null}
                    </span>
                    <span className="mt-px truncate text-[11.5px] font-medium text-[color:var(--task-ink-55)]">
                      Paling sering dibaca · terakhir {relativeDayLabel(topEntry[1].lastDate, today)}
                    </span>
                  </div>
                  {runnerUps.length > 0 ? (
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[color:var(--task-ink-55)]">Juga sering</span>
                      {runnerUps.map(([n, st], i) => (
                        <span
                          key={n}
                          className="rounded-full border border-[color:var(--task-chip-border)] bg-[color:var(--task-chip-bg)] px-2 py-0.5 text-[10.5px] text-[color:var(--task-ink-70)]"
                        >
                          <span className="font-bold text-[color:var(--task-deco)]">{i + 2}.</span> {getSurah(n)?.latin} · {st.count}×
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {/* Baris statistik angka-besar khas kartu referensi */}
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-[36px] font-extrabold leading-none tracking-tight text-[color:var(--task-ink)]">
                        {topEntry[1].count}
                      </span>
                      <span className="text-[12px] font-semibold text-[color:var(--task-ink-45)]">kali dibaca</span>
                    </p>
                    <p className="text-[14px] font-bold text-[color:var(--task-ink)]">
                      {topEntry[1].verses.toLocaleString("id-ID")} <span className="font-semibold text-[color:var(--task-ink-55)]">ayat</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </section>
      ) : null}

      {/* ---------- Jelajah: pencarian + filter + sortir ---------- */}
      <section aria-label="Daftar surah dan juz">
        <GlassCard className="p-4">
          {/* Pencarian — desain baru: pil lembut, ikon dalam lingkaran, tombol bersihkan */}
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-tz-violet/25 bg-tz-violet/15 text-tz-accent"
            >
              <Search size={13} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari surah…"
              aria-label="Cari surah"
              className={cn(inputCls, "rounded-full! py-2.5! pl-11!", query && "pr-11!")}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Bersihkan pencarian"
                className="tap absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-tz-violet/15 text-tz-muted transition-colors hover:text-tz-accent"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-tz-line bg-tz-panel-soft p-1.5"
            role="tablist"
            aria-label="Pilih daftar"
          >
            {(["surah", "juz"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={listMode === m}
                onClick={() => setListMode(m)}
                className={cn(
                  "tap min-h-[36px] rounded-lg text-[12.5px] font-semibold transition-all",
                  listMode === m
                    ? "bg-gradient-to-r from-tz-purple to-tz-violet text-white shadow-[0_4px_14px_-4px_rgba(85,51,154,0.8)]"
                    : "text-tz-muted hover:text-tz-accent"
                )}
              >
                {m === "surah" ? `Surah (${SURAH_LIST.length})` : `Juz (${JUZ_RANGES.length})`}
              </button>
            ))}
          </div>

          {listMode === "surah" ? (
            <>
              {/* Filter cepat */}
              <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="group" aria-label="Filter surah">
                {PLACE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={placeFilter === f.id}
                    onClick={() => setPlaceFilter(f.id)}
                    className={cn(
                      "tap shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all",
                      placeFilter === f.id
                        ? "border-tz-violet/60 bg-tz-violet text-white shadow-[0_4px_14px_-6px_rgba(85,51,154,0.9)]"
                        : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-accent"
                    )}
                  >
                    {f.label}
                    {f.id === "Makkiyah" ? ` · ${filterCounts.makkiyah}` : ""}
                    {f.id === "Madaniyah" ? ` · ${filterCounts.madaniyah}` : ""}
                    {f.id === "ditandai" ? ` · ${filterCounts.ditandai}` : ""}
                  </button>
                ))}
              </div>
              {/* Sortir + jumlah hasil */}
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" role="group" aria-label="Urutkan surah">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-tz-muted/80">Urut</span>
                  {SORT_MODES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={sortMode === s.id}
                      onClick={() => setSortMode(s.id)}
                      className={cn(
                        "tap rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all",
                        sortMode === s.id
                          ? "border-tz-violet/55 bg-tz-violet/15 text-tz-accent"
                          : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-accent"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <span className="shrink-0 text-[10.5px] text-tz-muted">{filtered.length} surah</span>
              </div>

              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filtered.map((s) => (
                  <SurahCard
                    key={s.number}
                    surah={s}
                    showArabic={settings.showArabic}
                    isLastRead={lastRead?.surah === s.number}
                    isBookmarked={bookmarkedSurahs.has(s.number)}
                    onOpen={() => onOpenReader(s.number, lastRead?.surah === s.number ? lastRead.ayah : 1)}
                  />
                ))}
              </ul>
              {filtered.length === 0 ? (
                <p className="mt-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3 py-4 text-center text-sm text-tz-muted">
                  Tidak ada surah yang cocok — coba kata kunci atau filter lain.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-3 text-[10.5px] text-tz-muted">
                {juzFiltered.length} dari {JUZ_RANGES.length} juz — sentuh untuk membuka dari awal juz.
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {juzFiltered.map((j) => (
                  <JuzCard key={j.juz} juz={j} onOpen={() => onOpenReader(j.startSurah, j.startAyah)} />
                ))}
              </ul>
              {juzFiltered.length === 0 ? (
                <p className="mt-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3 py-4 text-center text-sm text-tz-muted">
                  Juz tidak ditemukan — coba nomor juz atau nama surah di dalamnya.
                </p>
              ) : null}
            </>
          )}
        </GlassCard>
      </section>

      {/* ---------- Catat bacaan & penanda (ringkas) ---------- */}
      <section aria-label="Catat bacaan dan penanda">
        <GlassCard className="overflow-hidden">
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
            aria-expanded={formOpen}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-tz-violet/25 bg-tz-violet/15 text-tz-violet">
              <Plus size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-tz-ink">Catat Bacaan</span>
              <span className="block text-[11px] text-tz-muted">Cukup surah &amp; ayat — rentang dan penanda diisi otomatis</span>
            </span>
            <ChevronRight size={16} className={cn("shrink-0 text-tz-muted/70 transition-transform", formOpen && "rotate-90")} />
          </button>
          {formOpen ? (
            <div className="space-y-4 border-t border-tz-line-soft p-4">
              {/* Catat bacaan: hanya surah + ayat */}
              <div>
                <p className={labelCls}>Catat bacaan</p>
                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                  <div>
                    <label className={labelCls} htmlFor="cat-surah">
                      Surah
                    </label>
                    <select id="cat-surah" value={catSurah} onChange={(e) => setCatSurah(e.target.value)} className={inputCls}>
                      <option value="">— Pilih —</option>
                      {SURAH_LIST.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.latin}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cat-ayat">
                      Ayat terakhir
                    </label>
                    <input
                      id="cat-ayat"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="mis. 10"
                      value={catAyat}
                      onChange={(e) => setCatAyat(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                {catPreview ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-tz-violet/25 bg-tz-violet/10 px-3 py-2 text-[11px] leading-relaxed text-tz-ink/90">
                    <Sparkles size={12} className="mt-0.5 shrink-0 text-tz-accent" />
                    <span>
                      {catPreview.exceeds ? (
                        <>
                          {catPreview.meta.latin} hanya {catPreview.meta.verses} ayat —{" "}
                        </>
                      ) : null}
                      Tercatat: {catPreview.meta.latin} {catPreview.from}
                      {catPreview.to > catPreview.from ? `–${catPreview.to}` : ""} · {catPreview.to - catPreview.from + 1} ayat ·
                      penanda pindah ke ayat {catPreview.to}
                      {catPreview.continuing ? " (lanjutan dari posisi terakhir)" : ""}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] leading-relaxed text-tz-muted">
                    Pilih surah &amp; ayat terakhir — rentang bacaan dihitung otomatis dari posisi terakhirmu.
                  </p>
                )}
                <button
                  type="button"
                  onClick={saveCatatan}
                  className="tap mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[0.9rem] border border-tz-violet/50 bg-gradient-to-r from-tz-purple via-tz-violet to-tz-purple font-semibold text-white shadow-[0_10px_30px_-8px_rgba(85,51,154,0.8),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:brightness-110"
                >
                  <Check size={17} /> Simpan Bacaan
                </button>
              </div>
            </div>
          ) : null}
        </GlassCard>
      </section>

      {/* ---------- Riwayat bacaan ---------- */}
      <section aria-label="Riwayat bacaan">
        <SectionHeader title="Riwayat Bacaan" caption={`${readingHistory.length} catatan tersimpan`} />
        {readingHistory.length === 0 ? (
          <EmptyState
            icon={<History size={18} />}
            title="Riwayat masih kosong"
            caption="Bacaan tercatat otomatis dari pembaca, atau catat manual lewat form di atas."
          />
        ) : (
          <GlassCard className="thin-scrollbar max-h-96 overflow-y-auto">
            <ul className="divide-y divide-tz-line-soft">
              {readingHistory.slice(0, 30).map((e) => {
                const s = e.surah ? getSurah(e.surah) : undefined;
                return (
                  <li key={e.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tz-panel-soft">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-tz-violet/25 bg-tz-violet/12 text-tz-violet">
                      {e.auto ? <Flame size={15} /> : <BookOpen size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-tz-ink/90">
                        {e.pages > 0 ? `${e.pages.toLocaleString("id-ID")} halaman` : ""}
                        {e.pages > 0 && e.verses > 0 ? " · " : ""}
                        {e.verses > 0 ? `${e.verses.toLocaleString("id-ID")} ayat` : ""}
                        {s ? ` — ${s.latin}${e.ayahFrom ? ` : ${e.ayahFrom}-${e.ayahTo ?? e.ayahFrom}` : ""}` : ""}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-tz-muted">
                        {relativeDayLabel(e.date, today)}
                        {e.auto ? (
                          <span className="inline-flex items-center rounded-full border border-tz-violet/30 bg-tz-violet/10 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-tz-accent">
                            Otomatis
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteReadingEntry(e.id);
                        toast.info("Catatan bacaan dihapus");
                      }}
                      aria-label="Hapus catatan bacaan"
                      className="tap flex h-8 w-8 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        )}
      </section>

      {/* ---------- Catatan sumber ---------- */}
      <div className="pb-1">
        <p className="flex items-start gap-1.5 rounded-xl border border-tz-line bg-tz-panel-soft px-3 py-2 text-[11px] leading-relaxed text-tz-muted">
          <Info size={13} className="mt-0.5 shrink-0" />
          Teks ayat &amp; terjemahan diambil dari AlQuran Cloud API (edisi Uthmani &amp; Kemenag). Bacaan di pembaca tercatat
          otomatis dari ayat awal sampai ayat akhir, dan surah yang pernah dibuka tersimpan di perangkat agar tetap bisa
          dibaca saat offline.
        </p>
        <div className="mt-3 text-center">
          <Chip>{readingHistory.length.toLocaleString("id-ID")} total catatan bacaan</Chip>
        </div>
      </div>
    </div>
  );
}
