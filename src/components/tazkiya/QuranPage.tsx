"use client";

/**
 * Tazkiya v4 — Al-Qur'an sebagai aplikasi membaca digital.
 * Struktur baru: hero lanjutkan bacaan (surah + ayat + ring progres harian),
 * strip target angka-besar, statistik editorial (angka + hairline, tanpa
 * kotak), surah favorit, pencarian modern + filter Makkiyah/Madaniyah +
 * tab garis Surah/Juz, daftar surah berbentuk baris indeks (bukan grid
 * kartu), penanda ayat, catat bacaan ringkas, dan riwayat.
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
import { relativeDayLabel, lastNDays, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { Chip, ConfirmButton, EmptyState, GlassCard, SectionHeader, SegmentedTabs } from "./ui-bits";
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

/** Baris surah — komposisi baru: indeks soft-purple, nama tegas, Arab di kanan. */
function SurahRow({
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
        className="tap group flex w-full items-center gap-3.5 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-tz-panel-soft"
        aria-label={`Buka ${surah.latin}`}
      >
        <span
          className={cn(
            "tnum relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] font-display text-[13px] font-bold",
            isLastRead ? "bg-tz-violet text-white" : "bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent"
          )}
        >
          {surah.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-display text-[14.5px] font-bold tracking-[-0.01em] text-tz-ink">{surah.latin}</span>
            {isBookmarked ? <BookmarkIcon size={12} className="shrink-0 text-tz-violet" aria-label="Ada penanda" /> : null}
            {isLastRead ? (
              <span className="shrink-0 rounded-full bg-tz-lime px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-tz-lime-ink">
                Terakhir
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-tz-muted">
            {surah.meaning} · {surah.verses} ayat · {surah.place}
          </span>
        </span>
        {showArabic ? (
          <span className="quran-arabic shrink-0 text-[19px] leading-snug text-tz-violet dark:text-tz-accent">{surah.arabic}</span>
        ) : (
          <ChevronRight size={16} className="shrink-0 text-tz-muted/60" />
        )}
      </button>
    </li>
  );
}

/** Baris juz ringkas. */
function JuzRow({ juz, onOpen }: { juz: (typeof JUZ_RANGES)[number]; onOpen: () => void }) {
  const start = getSurah(juz.startSurah);
  const end = getSurah(juz.endSurah);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="tap flex w-full items-center gap-3.5 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-tz-panel-soft"
        aria-label={`Buka Juz ${juz.juz} dari ${start?.latin}`}
      >
        <span className="tnum flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-tz-lavender font-display text-[13px] font-bold text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">
          {juz.juz}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14.5px] font-bold text-tz-ink">Juz {juz.juz}</span>
          <span className="block truncate text-[10.5px] text-tz-muted">
            {start?.latin} {juz.startAyah} — {end?.latin} {juz.endAyah} · {juz.surahs.length} surah
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-tz-muted/60" />
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

  /* ---------- Progres kumulatif & mingguan (dari catatan nyata) ---------- */
  const totalPages = useMemo(() => readingHistory.reduce((acc, e) => acc + (e.pages ?? 0), 0), [readingHistory]);
  const totalVerses = useMemo(() => readingHistory.reduce((acc, e) => acc + (e.verses ?? 0), 0), [readingHistory]);
  const daysRead = useMemo(
    () => new Set(readingHistory.filter((e) => e.pages > 0 || e.verses > 0).map((e) => e.date)).size,
    [readingHistory]
  );
  const weekPages = lastNDays(7, today).reduce((acc, k) => acc + (logs[k]?.quranPages ?? 0), 0);
  const weekVerses = lastNDays(7, today).reduce((acc, k) => acc + (logs[k]?.quranVerses ?? 0), 0);

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
      {/* ---------- Judul halaman ---------- */}
      <header className="animate-tz-fade-up pt-1">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-tz-ink">Al-Qur&apos;an</h1>
          <p className="mt-1 text-[12.5px] text-tz-muted">Temukan ketenangan dalam setiap ayat</p>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
        {/* ---------- Hero lanjutkan bacaan (featured blok lavender lembut) ---------- */}
        <section aria-label="Lanjutkan bacaan" className="animate-tz-fade-up lg:col-span-7">
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.6rem] bg-tz-lavender p-5 sm:p-6">
            <div className="relative">
              <p className="v5-overline">{lastPos ? "Lanjutkan Bacaan" : "Mulai Membaca"}</p>
              <div className="mt-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[25px] font-extrabold tracking-[-0.025em] text-tz-ink">
                    {lastSurahMeta?.latin ?? "Al-Fatihah"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-tz-muted">
                    Ayat {lastPos?.ayah ?? 1} · {lastSurahMeta?.meaning ?? "Pembukaan"}
                  </p>
                </div>
                {settings.showArabic && lastSurahMeta ? (
                  <span className="quran-arabic shrink-0 text-[26px] leading-snug text-tz-violet">
                    {lastSurahMeta.arabic}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenReader(lastPos?.surah ?? 1, lastPos?.ayah ?? 1)}
                className="tap flex min-h-[46px] items-center gap-2 rounded-full v5-ink-btn px-5 text-[13px] font-bold transition-all hover:opacity-90"
              >
                <Play size={15} />
                {lastPos ? "Lanjutkan" : "Buka Qur'an"}
              </button>
              {manualBookmark ? (
                <button
                  type="button"
                  onClick={() => onOpenReader(manualBookmark.surah, manualBookmark.ayah)}
                  className="tap flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold text-tz-ink dark:bg-white/10"
                >
                  <BookmarkIcon size={13} className="text-tz-violet" />
                  Penanda: {getSurah(manualBookmark.surah)?.latin} · {manualBookmark.ayah}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* ---------- Target bacaan hari ini (kartu putih ringkas + ring) ---------- */}
        <section aria-label="Target bacaan harian" className="animate-tz-fade-up mt-6 lg:col-span-5 lg:mt-0">
          <div className="glass flex h-full items-center gap-5 rounded-[1.5rem] p-5">
            <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: 92, height: 92 }}>
              <svg width={92} height={92} className="-rotate-90">
                <circle cx={46} cy={46} r={40} fill="none" strokeWidth={8} className="stroke-tz-track" />
                <circle
                  cx={46}
                  cy={46}
                  r={40}
                  fill="none"
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="stroke-tz-violet"
                  strokeDasharray={`${(pct / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`}
                  style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
              </svg>
              <span className="v5-display absolute text-[20px] font-extrabold text-tz-ink">{pct}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="v5-overline">Target Bacaan</p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="v5-display text-[30px] font-extrabold leading-none text-tz-ink">
                  {value.toLocaleString("id-ID")}
                </span>
                <span className="text-[11.5px] font-semibold text-tz-muted">/ {targetValue.toLocaleString("id-ID")} {targetType === "surah" ? "ayat" : unit}</span>
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-tz-muted">
                {pct >= 100 ? "Target hari ini tercapai. Barakallah!" : `${Math.max(0, targetValue - value).toLocaleString("id-ID")} ${targetType === "surah" ? "ayat" : unit} lagi · ${targetSubtitle}`}
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Statistik editorial TANPA kartu: angka besar + hairline ---------- */}
        <section aria-label="Progres bacaan" className="animate-tz-fade-up mt-9 lg:col-span-12">
          <div className="grid grid-cols-3">
            {[
              { value: totalPages.toLocaleString("id-ID"), label: "Halaman dibaca" },
              { value: totalVerses.toLocaleString("id-ID"), label: "Ayat dibaca" },
              { value: daysRead.toLocaleString("id-ID"), label: "Hari membaca" },
            ].map(({ value, label }, i) => (
              <div key={label} className={cn("min-w-0 px-4", i === 0 && "pl-0", i > 0 && "border-l border-tz-line")}>
                <p className="v5-display truncate text-[26px] font-extrabold leading-none text-tz-ink sm:text-[30px]">{value}</p>
                <p className="v5-overline mt-2">{label}</p>
              </div>
            ))}
          </div>

          {/* Batang 7 hari — kronologis kiri ke kanan, tanpa kartu */}
          <div className="mt-6 flex items-end justify-between gap-1.5 border-t border-tz-line pt-5" aria-hidden>
            {lastNDays(7, today).map((k) => {
              const pages = logs[k]?.quranPages ?? 0;
              const verses = logs[k]?.quranVerses ?? 0;
              const h = Math.max(pages > 0 || verses > 0 ? 10 : 2, Math.min(100, (pages / Math.max(1, settings.quranDailyTarget)) * 100));
              return (
                <div key={k} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="tnum text-[9.5px] font-semibold text-tz-muted/80">{pages > 0 ? pages : ""}</span>
                  <div className="flex h-16 w-full items-end">
                    <div
                      className={cn("tz-bar-grow-x mx-auto w-full max-w-[24px] rounded-full", k === today ? "bg-tz-violet" : "bg-tz-lav-deco")}
                      style={{ height: `${h}%`, opacity: pages > 0 || verses > 0 ? 1 : 1 }}
                    />
                  </div>
                  <span className={cn("text-[9.5px]", k === today ? "font-bold text-tz-ink" : "text-tz-muted")}>{weekdayShort(k)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-tz-muted">
            Minggu ini: {weekPages.toLocaleString("id-ID")} halaman · {weekVerses.toLocaleString("id-ID")} ayat. Hari tanpa
            catatan bukan hari gagal — tinggal lanjutkan besok.
          </p>
        </section>

        {/* ---------- Surah favorit ---------- */}
        {topEntry && topMeta ? (
          <section aria-label="Surah paling sering dibaca" className="animate-tz-fade-up mt-6 lg:col-span-5">
            <SectionHeader title="Surah Favorit" caption="Paling sering kamu baca" />
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
              <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-tz-lavender p-5">
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-baseline gap-2">
                      <span className="text-[21px] font-extrabold tracking-[-0.02em] text-tz-ink">{topMeta.latin}</span>
                      {settings.showArabic ? (
                        <span className="quran-arabic text-[16px] text-tz-violet">{topMeta.arabic}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-tz-muted">
                      Terakhir dibaca {relativeDayLabel(topEntry[1].lastDate, today)}
                    </p>
                  </div>
                </div>
                <p className="relative mt-4 flex items-baseline gap-2">
                  <span className="v5-display text-[38px] font-extrabold leading-none text-tz-ink">{topEntry[1].count}</span>
                  <span className="text-[11.5px] font-semibold text-tz-muted">kali dibaca</span>
                  <span className="ml-auto text-[12px] font-bold text-tz-violet">
                    {topEntry[1].verses.toLocaleString("id-ID")} ayat
                  </span>
                </p>
                {runnerUps.length > 0 ? (
                  <p className="relative mt-3 flex flex-wrap items-center gap-1.5 border-t border-tz-lav-deco pt-3">
                    <span className="v5-overline">Juga sering</span>
                    {runnerUps.map(([n, st], i) => (
                      <span
                        key={n}
                        className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-tz-ink/85 dark:bg-white/10"
                      >
                        {i + 2}. {getSurah(n)?.latin} · {st.count}×
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            </button>
          </section>
        ) : null}

        {/* ---------- Penanda ayat ---------- */}
        {ayahBookmarks.length > 0 ? (
          <section aria-label="Ayat yang ditandai" className="animate-tz-fade-up mt-6 lg:col-span-7">
            <SectionHeader title="Ayat Ditandai" caption={`${ayahBookmarks.length} ayat — ketuk untuk membuka`} />
            <GlassCard className="thin-scrollbar max-h-64 overflow-y-auto">
              <ul className="divide-y divide-tz-line-soft">
                {ayahBookmarks.slice(0, 20).map((b) => {
                  const meta = getSurah(b.surah);
                  return (
                    <li key={`${b.surah}:${b.ayah}`}>
                      <button
                        type="button"
                        onClick={() => onOpenReader(b.surah, b.ayah)}
                        className="tap flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-tz-panel-soft"
                        aria-label={`Buka ${meta?.latin ?? "surah"} ayat ${b.ayah}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">
                          <BookmarkIcon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-tz-ink">
                            {meta?.latin ?? `Surah ${b.surah}`} · ayat {b.ayah}
                          </span>
                          <span className="block text-[10px] text-tz-muted">{relativeDayLabel(b.savedAt.slice(0, 10), today)}</span>
                        </span>
                        <ChevronRight size={15} className="shrink-0 text-tz-muted/70" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </section>
        ) : null}

        {/* ---------- Jelajah: pencarian + filter + tab + daftar baris ---------- */}
        <section aria-label="Daftar surah dan juz" className="animate-tz-fade-up mt-6 lg:col-span-12">
          <SectionHeader title="Jelajah" caption="Cari surah atau juz, filter tempat turunnya" />
          <GlassCard className="p-4 sm:p-5">
            {/* Pencarian pil modern */}
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-tz-lavender text-tz-violet dark:bg-tz-accent/20 dark:text-tz-accent"
              >
                <Search size={13} />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari surah, arti, atau nomor…"
                aria-label="Cari surah"
                className={cn(inputCls, "rounded-full! py-2.5! pl-11!", query && "pr-11!")}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Bersihkan pencarian"
                  className="tap absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-tz-panel-soft text-tz-muted transition-colors hover:text-tz-ink"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="mt-4" role="tablist" aria-label="Pilih daftar">
              <SegmentedTabs
                ariaLabel="Pilih daftar surah atau juz"
                items={[
                  { id: "surah" as const, label: `Surah (${SURAH_LIST.length})` },
                  { id: "juz" as const, label: `Juz (${JUZ_RANGES.length})` },
                ]}
                value={listMode}
                onChange={setListMode}
              />
            </div>

            {listMode === "surah" ? (
              <>
                {/* Filter tempat turun */}
                <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="group" aria-label="Filter surah">
                  {PLACE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={placeFilter === f.id}
                      onClick={() => setPlaceFilter(f.id)}
                      className={cn(
                        "tap shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition-all",
                        placeFilter === f.id
                          ? "v5-ink-btn"
                          : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-ink"
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
                          "tap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                          sortMode === s.id ? "bg-tz-lavender text-tz-violet dark:bg-tz-accent/20 dark:text-tz-accent" : "text-tz-muted hover:text-tz-ink"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <span className="shrink-0 text-[10.5px] text-tz-muted">{filtered.length} surah</span>
                </div>

                <ul className="tz-list-cv mt-2 divide-y divide-tz-line-soft sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0 lg:grid-cols-3">
                  {filtered.map((s) => (
                    <SurahRow
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
                  <p className="mt-3 rounded-2xl border border-tz-line bg-tz-panel-soft px-3 py-4 text-center text-sm text-tz-muted">
                    Tidak ada surah yang cocok — coba kata kunci atau filter lain.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-4 text-[10.5px] text-tz-muted">
                  {juzFiltered.length} dari {JUZ_RANGES.length} juz — sentuh untuk membuka dari awal juz.
                </p>
                <ul className="tz-list-cv mt-2 divide-y divide-tz-line-soft sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0 lg:grid-cols-3">
                  {juzFiltered.map((j) => (
                    <JuzRow key={j.juz} juz={j} onOpen={() => onOpenReader(j.startSurah, j.startAyah)} />
                  ))}
                </ul>
                {juzFiltered.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-tz-line bg-tz-panel-soft px-3 py-4 text-center text-sm text-tz-muted">
                    Juz tidak ditemukan — coba nomor juz atau nama surah di dalamnya.
                  </p>
                ) : null}
              </>
            )}
          </GlassCard>
        </section>

        {/* ---------- Catat bacaan & penanda (ringkas) ---------- */}
        <section aria-label="Catat bacaan dan penanda" className="animate-tz-fade-up mt-6 lg:col-span-12">
          <GlassCard className="overflow-hidden">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
              aria-expanded={formOpen}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full v5-ink-btn">
                <Plus size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[14.5px] font-bold text-tz-ink">Catat Bacaan</span>
                <span className="block text-[11px] text-tz-muted">Cukup surah &amp; ayat — rentang dan penanda diisi otomatis</span>
              </span>
              <ChevronRight size={16} className={cn("shrink-0 text-tz-muted/70 transition-transform", formOpen && "rotate-90")} />
            </button>
            {formOpen ? (
              <div className="space-y-4 border-t border-tz-line p-4 sm:p-5">
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
                    <p className="mt-2 flex items-start gap-1.5 rounded-2xl border border-tz-violet/25 bg-tz-lavender/50 px-3 py-2 text-[11px] leading-relaxed text-tz-ink/90 dark:bg-tz-accent/10">
                      <Sparkles size={12} className="mt-0.5 shrink-0 text-tz-violet dark:text-tz-accent" />
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
                    className="tap mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full v5-ink-btn font-display text-[14px] font-bold transition-all hover:opacity-90"
                  >
                    <Check size={17} /> Simpan Bacaan
                  </button>
                </div>
              </div>
            ) : null}
          </GlassCard>
        </section>

        {/* ---------- Riwayat bacaan ---------- */}
        <section aria-label="Riwayat bacaan" className="animate-tz-fade-up mt-6 lg:col-span-12">
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
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          e.auto ? "bg-tz-lime/60 text-tz-lime-ink dark:bg-tz-lime/20 dark:text-tz-lime" : "bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent"
                        )}
                      >
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
                            <span className="inline-flex items-center rounded-full bg-tz-lime/50 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-tz-lime-ink dark:bg-tz-lime/15 dark:text-tz-lime">
                              Otomatis
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <ConfirmButton
                        label="Hapus catatan bacaan"
                        title="Hapus catatan bacaan ini?"
                        description="Catatan ini akan dikeluarkan dari riwayat bacaan. Penanda ayat dan posisi terakhir tidak terpengaruh."
                        onConfirm={() => {
                          deleteReadingEntry(e.id);
                          toast.info("Catatan bacaan dihapus");
                        }}
                        className="tap flex h-9 w-9 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                      >
                        <Trash2 size={15} />
                      </ConfirmButton>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          )}
        </section>
      </div>

      {/* ---------- Catatan sumber ---------- */}
      <div className="mt-6 pb-1">
        <p className="flex items-start gap-1.5 rounded-2xl border border-tz-line bg-tz-panel-soft px-3.5 py-2.5 text-[11px] leading-relaxed text-tz-muted">
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
