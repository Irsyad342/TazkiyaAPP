"use client";

/**
 * Tazkiya — Halaman Al-Qur'an.
 * Kartu target bacaan dengan glow bergerak, tombol lanjutkan bacaan,
 * daftar surah & juz dengan pencarian, pencatatan progres manual,
 * penanda bacaan, dan riwayat bacaan.
 */

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark as BookmarkIcon,
  Check,
  ChevronRight,
  History,
  Info,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { JUZ_RANGES, SURAH_LIST, getSurah, normalizeArabic } from "@/lib/tazkiya/quran";
import { surahProgressOnDate } from "@/lib/tazkiya/stats";
import { relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { Chip, EmptyState, GlassCard, GlowOrb, SectionHeader } from "./ui-bits";
import { cn } from "@/lib/utils";

const inputCls = "tz-field";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tz-muted/90";

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
        className="tap flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-tz-panel-soft"
        aria-label={`Buka ${surah.latin}`}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem] border border-tz-violet/30 bg-gradient-to-br from-tz-violet/20 to-tz-purple/10 text-[11px] font-bold text-tz-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          {surah.number}
          {isLastRead ? (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-tz-violet shadow-[0_0_6px_1px_rgba(156,114,239,0.8)]" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate text-[13px] font-semibold text-tz-ink">{surah.latin}</span>
            {isBookmarked ? <BookmarkIcon size={11} className="shrink-0 text-tz-accent" aria-label="Ada penanda" /> : null}
            {showArabic ? <span className="quran-arabic ml-auto shrink-0 text-[15px] text-tz-accent">{surah.arabic}</span> : null}
          </span>
          <span className="block truncate text-[11px] text-tz-muted">
            {surah.meaning} · {surah.verses} ayat · {surah.place}
          </span>
        </span>
        <ChevronRight size={15} className="shrink-0 text-tz-muted/60" />
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
  const saveBookmark = useWorshipStore((s) => s.saveBookmark);
  const deleteBookmark = useWorshipStore((s) => s.deleteBookmark);

  const today = todayKey();
  const log = logs[today] ?? {
    date: today,
    prayers: { subuh: false, zuhur: false, asar: false, magrib: false, isya: false },
    extras: { duha: false, tahajud: false, doa: false, puasa: false, sedekah: false },
    quranPages: 0,
    quranVerses: 0,
    zikirCount: 0,
  };

  const [amount, setAmount] = useState("");
  const [surahSel, setSurahSel] = useState("");
  const [ayahFrom, setAyahFrom] = useState("");
  const [ayahTo, setAyahTo] = useState("");
  const [markLast, setMarkLast] = useState(true);
  const [bmSurah, setBmSurah] = useState("");
  const [bmAyah, setBmAyah] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<"surah" | "juz">("surah");

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
  // Satuan form pencatatan manual: pada mode "surah" yang dicatat tetap jumlah ayat.
  const formUnit = targetType === "halaman" ? "halaman" : "ayat";

  const manualBookmark = bookmarks[0];
  const lastPos = lastRead ?? (manualBookmark ? { surah: manualBookmark.surah, ayah: manualBookmark.ayah } : null);
  const lastSurahMeta = lastPos ? getSurah(lastPos.surah) : undefined;
  const bookmarkedSurahs = useMemo(() => new Set(ayahBookmarks.map((b) => b.surah)), [ayahBookmarks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAH_LIST;
    const norm = normalizeArabic(query.trim());
    return SURAH_LIST.filter(
      (s) =>
        s.latin.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        String(s.number) === q ||
        s.arabic.includes(query.trim()) ||
        (norm.length > 0 && normalizeArabic(s.arabic).includes(norm))
    );
  }, [query]);

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

      {/* ---------- Kartu target dengan glow bergerak ---------- */}
      <GlassCard variant="hero" className="tz-quran-breathe tz-quran-glow p-5">
        <span className="tz-quran-veil" aria-hidden />
        <span className="tz-quran-shimmer" aria-hidden />
        <GlowOrb className="tz-quran-orb -right-8 -top-10 h-36 w-36 bg-tz-lavender/20" />
        <GlowOrb className="tz-quran-orb -bottom-14 left-6 h-32 w-32 bg-tz-orb-deep/70" />
        <span className="tz-quran-seam" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="tz-quran-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] border border-tz-violet/40 bg-gradient-to-br from-tz-violet/35 to-tz-purple/15 text-tz-lavender light:text-violet-100">
            <BookOpen size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-tz-lavender/90 light:text-violet-100">
                <BookOpen size={12} className="shrink-0" />
                Target Bacaan Harian
              </p>
              <span className="shrink-0 rounded-full border border-tz-lavender/30 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-tz-lavender text-glow light:text-white">
                {pct}%
              </span>
            </div>
            <p className="mt-1.5 font-display text-[30px] font-extrabold leading-none tracking-tight text-gradient-hero">
              {value.toLocaleString("id-ID")}
              <span className="ml-1.5 text-xs font-semibold text-tz-lavender/85 light:text-violet-200">
                {targetType === "surah" ? (
                  <>/ Surah {targetSurahMeta?.latin ?? "?"} · {targetValue} ayat</>
                ) : (
                  <>/ {target.toLocaleString("id-ID")} {unit}</>
                )}
              </span>
            </p>
            <div
              className="tz-beam mt-3 h-[6px]"
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
            <p className="mt-2 text-[11px] leading-relaxed text-white/75">
              {pct >= 100 ? "Target hari ini tercapai. Barakallah!" : `${Math.max(0, targetValue - value).toLocaleString("id-ID")} ${targetType === "surah" ? "ayat" : unit} lagi menuju target`}
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-tz-lavender/85 light:text-violet-200">
              <BookmarkIcon size={12} className="shrink-0" />
              {lastPos
                ? `Terakhir: ${getSurah(lastPos.surah)?.latin ?? `Surah ${lastPos.surah}`} · ayat ${lastPos.ayah}`
                : "Belum ada bacaan — buka surah pertamamu"}
            </p>
          </div>
        </div>
      </GlassCard>

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

      {/* ---------- Daftar surah & juz ---------- */}
      <section aria-label="Daftar surah dan juz">
        <GlassCard className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari surah — nama Arab, Latin, atau nomor…"
              aria-label="Cari surah"
              className={cn(inputCls, "pl-10")}
            />
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
            <ul className="tz-list-cv mt-1 divide-y divide-tz-line-soft">
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
              {filtered.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-tz-muted">Surah tidak ditemukan</li>
              ) : null}
            </ul>
          ) : (
            <ul className="tz-list-cv mt-1 divide-y divide-tz-line-soft">
              {JUZ_RANGES.map((j) => {
                const start = getSurah(j.startSurah);
                const end = getSurah(j.endSurah);
                return (
                  <li key={j.juz}>
                    <button
                      type="button"
                      onClick={() => onOpenReader(j.startSurah, j.startAyah)}
                      className="tap flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-tz-panel-soft"
                      aria-label={`Buka Juz ${j.juz} dari ${start?.latin}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem] border border-tz-violet/30 bg-gradient-to-br from-tz-violet/20 to-tz-purple/10 text-[11px] font-bold text-tz-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                        {j.juz}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-tz-ink">Juz {j.juz}</span>
                          <span className="text-[11px] text-tz-muted">
                            {start?.latin} {j.startAyah} — {end?.latin} {j.endAyah}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-tz-muted">
                          {j.surahs.map((n) => getSurah(n)?.latin).join(" · ")}
                        </span>
                      </span>
                      <ChevronRight size={15} className="shrink-0 text-tz-muted/60" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </section>

      {/* ---------- Catat bacaan & penanda ---------- */}
      <section aria-label="Catat bacaan dan penanda">
        <GlassCard className="overflow-hidden">
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
            aria-expanded={formOpen}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-tz-violet/25 bg-gradient-to-br from-tz-violet/22 to-tz-purple/12 text-tz-violet">
              <Plus size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-tz-ink">Catat Bacaan &amp; Penanda</span>
              <span className="block text-[11px] text-tz-muted">Tambahkan progres manual atau pindahkan penanda</span>
            </span>
            <ChevronRight size={16} className={cn("shrink-0 text-tz-muted/70 transition-transform", formOpen && "rotate-90")} />
          </button>
          {formOpen ? (
            <div className="space-y-5 border-t border-tz-line-soft p-4">
              <div className="space-y-4">
                <p className={labelCls}>Tambah progres bacaan</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="jenis-bacaan">
                      Satuan bacaan
                    </label>
                    <select
                      id="jenis-bacaan"
                      value={targetType}
                      onChange={(e) => {
                        const v = e.target.value as "halaman" | "ayat" | "surah";
                        if (v === "surah") {
                          useWorshipStore.getState().updateSettings({ quranTargetType: "surah" });
                          toast.success(`Target: surah ${getSurah(settings.quranTargetSurah)?.latin ?? ""} — atur di Target Ibadah bila perlu`);
                        } else {
                          useWorshipStore.getState().setQuranTarget(v, settings.quranDailyTarget);
                          toast.success(`Satuan diubah ke ${v === "halaman" ? "halaman" : "ayat"}`);
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="halaman">Halaman</option>
                      <option value="ayat">Ayat</option>
                      <option value="surah">Surah</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="jumlah-bacaan">
                      Jumlah dibaca
                    </label>
                    <input
                      id="jumlah-bacaan"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder={`mis. ${formUnit === "halaman" ? "3" : "50"}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-1">
                    <label className={labelCls} htmlFor="surah-bacaan">
                      Surah (opsional)
                    </label>
                    <select id="surah-bacaan" value={surahSel} onChange={(e) => setSurahSel(e.target.value)} className={inputCls}>
                      <option value="">— Pilih —</option>
                      {SURAH_LIST.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.latin}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ayat-awal">
                      Ayat awal
                    </label>
                    <input
                      id="ayat-awal"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="mis. 1"
                      value={ayahFrom}
                      onChange={(e) => setAyahFrom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ayat-akhir">
                      Ayat akhir
                    </label>
                    <input
                      id="ayat-akhir"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="mis. 10"
                      value={ayahTo}
                      onChange={(e) => setAyahTo(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-2.5">
                  <input type="checkbox" checked={markLast} onChange={(e) => setMarkLast(e.target.checked)} className="h-4 w-4 accent-tz-violet" />
                  <span className="text-xs text-tz-ink/85">Perbarui penanda bacaan ke posisi terakhir</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const n = parseInt(amount, 10);
                    if (!amount || Number.isNaN(n) || n <= 0) {
                      toast.error(`Masukkan jumlah ${formUnit} yang valid (lebih dari 0)`);
                      return;
                    }
                    const surahNum = surahSel ? parseInt(surahSel, 10) : undefined;
                    const from = ayahFrom ? parseInt(ayahFrom, 10) : undefined;
                    const to = ayahTo ? parseInt(ayahTo, 10) : undefined;
                    if (surahNum !== undefined && from !== undefined && to !== undefined && to < from) {
                      toast.error("Ayat akhir tidak boleh lebih kecil dari ayat awal");
                      return;
                    }
                    if (surahNum !== undefined && from !== undefined) {
                      const m = getSurah(surahNum);
                      if (m && from > m.verses) {
                        toast.error(`${m.latin} hanya memiliki ${m.verses} ayat`);
                        return;
                      }
                    }
                    if (surahNum !== undefined && to !== undefined) {
                      const m = getSurah(surahNum);
                      if (m && to > m.verses) {
                        toast.error(`${m.latin} hanya memiliki ${m.verses} ayat`);
                        return;
                      }
                    }
                    addQuranProgress(today, {
                      // Mode "surah" tetap mencatat ayat — bacaan surah dihitung per ayat.
                      pages: formUnit === "halaman" ? n : 0,
                      verses: formUnit === "ayat" ? n : 0,
                      surah: surahNum,
                      ayahFrom: from,
                      ayahTo: to,
                      markBookmark: markLast,
                    });
                    toast.success(`Bacaan disimpan: ${n.toLocaleString("id-ID")} ${formUnit}`);
                    setAmount("");
                    setAyahFrom("");
                    setAyahTo("");
                  }}
                  className="tap flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[0.9rem] border border-tz-violet/50 bg-gradient-to-r from-tz-purple via-tz-violet to-tz-purple font-semibold text-white shadow-[0_10px_30px_-8px_rgba(85,51,154,0.8),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:brightness-110"
                >
                  <Plus size={18} /> Tambah Progres &amp; Simpan
                </button>
              </div>

              <div className="space-y-3 border-t border-tz-line-soft pt-4">
                <p className={labelCls}>Penanda bacaan manual</p>
                {manualBookmark ? (
                  <div className="glass-violet flex items-center gap-3 rounded-2xl p-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tz-violet to-tz-purple text-white glow-violet-sm">
                      <BookmarkIcon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-tz-ink">
                        {getSurah(manualBookmark.surah)?.latin ?? `Surah ${manualBookmark.surah}`}
                        {settings.showArabic ? (
                          <span className="quran-arabic ml-1.5 font-normal text-tz-accent">{getSurah(manualBookmark.surah)?.arabic}</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-tz-accent/85">
                        Ayat {manualBookmark.ayah} · {getSurah(manualBookmark.surah)?.verses} ayat total
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteBookmark();
                        toast.info("Penanda bacaan dihapus");
                      }}
                      aria-label="Hapus penanda bacaan"
                      className="tap flex h-9 w-9 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-muted transition-colors hover:text-rose-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <EmptyState
                    icon={<BookmarkIcon size={18} />}
                    title="Belum ada penanda bacaan"
                    caption="Simpan posisi terakhirmu agar mudah melanjutkan bacaan nanti."
                  />
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-1">
                    <label className={labelCls} htmlFor="bm-surah">
                      Surah
                    </label>
                    <select id="bm-surah" value={bmSurah} onChange={(e) => setBmSurah(e.target.value)} className={inputCls}>
                      <option value="">— Pilih —</option>
                      {SURAH_LIST.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.latin}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="bm-ayah">
                      Ayat
                    </label>
                    <input
                      id="bm-ayah"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="mis. 1"
                      value={bmAyah}
                      onChange={(e) => setBmAyah(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        const s = bmSurah ? parseInt(bmSurah, 10) : NaN;
                        const a = bmAyah ? parseInt(bmAyah, 10) : NaN;
                        if (Number.isNaN(s)) {
                          toast.error("Pilih surah terlebih dahulu");
                          return;
                        }
                        const meta = getSurah(s);
                        if (Number.isNaN(a) || a < 1) {
                          toast.error("Masukkan nomor ayat yang valid");
                          return;
                        }
                        if (meta && a > meta.verses) {
                          toast.error(`${meta.latin} hanya memiliki ${meta.verses} ayat`);
                          return;
                        }
                        saveBookmark({ surah: s, ayah: a, savedAt: new Date().toISOString() });
                        toast.success(`Penanda disimpan: ${meta?.latin} ayat ${a}`);
                        setBmSurah("");
                        setBmAyah("");
                      }}
                      className="tap flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-tz-violet/45 bg-gradient-to-br from-tz-violet/22 to-tz-purple/12 text-sm font-semibold text-tz-accent transition-all hover:from-tz-violet/32"
                    >
                      <Check size={16} /> Simpan
                    </button>
                  </div>
                </div>
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
            caption="Setiap bacaan yang kamu catat akan muncul di sini."
          />
        ) : (
          <GlassCard className="thin-scrollbar max-h-96 overflow-y-auto">
            <ul className="divide-y divide-tz-line-soft">
              {readingHistory.slice(0, 30).map((e) => {
                const s = e.surah ? getSurah(e.surah) : undefined;
                return (
                  <li key={e.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tz-panel-soft">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-tz-violet/22 bg-gradient-to-br from-tz-violet/18 to-tz-purple/10 text-tz-violet">
                      <BookOpen size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-tz-ink/90">
                        {e.pages > 0 ? `${e.pages.toLocaleString("id-ID")} halaman` : ""}
                        {e.pages > 0 && e.verses > 0 ? " · " : ""}
                        {e.verses > 0 ? `${e.verses.toLocaleString("id-ID")} ayat` : ""}
                        {s ? ` — ${s.latin}${e.ayahFrom ? ` : ${e.ayahFrom}-${e.ayahTo ?? e.ayahFrom}` : ""}` : ""}
                      </p>
                      <p className="text-[11px] text-tz-muted">{relativeDayLabel(e.date, today)}</p>
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
          Teks ayat &amp; terjemahan diambil dari AlQuran Cloud API (edisi Uthmani &amp; Kemenag). Surah yang pernah dibuka
          tersimpan di perangkat agar tetap bisa dibaca saat offline.
        </p>
        <div className="mt-3 text-center">
          <Chip>{readingHistory.length.toLocaleString("id-ID")} total catatan bacaan</Chip>
        </div>
      </div>
    </div>
  );
}
