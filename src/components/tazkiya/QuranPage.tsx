"use client";

/**
 * Tazkiya v4 — Al-Qur'an sebagai aplikasi membaca digital.
 * Struktur baru: hero lanjutkan bacaan (surah + ayat + ring progres harian),
 * strip target angka-besar, statistik editorial (angka + hairline, tanpa
 * kotak), surah favorit, pencarian modern + filter Makkiyah/Madaniyah +
 * tab garis Surah/Juz, daftar surah berbentuk baris indeks (bukan grid
 * kartu), penanda ayat, catat bacaan ringkas, dan riwayat.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark as BookmarkIcon,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  History,
  Info,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { ReadingEntry } from "@/lib/tazkiya/types";
import { JUZ_RANGES, SURAH_LIST, getSurah, normalizeArabic } from "@/lib/tazkiya/quran";
import { surahProgressOnDate } from "@/lib/tazkiya/stats";
import { formatDayFullWithYear, relativeDayLabel, lastNDays, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { Chip, ConfirmButton, EmptyState, GlassCard, SectionHeader, SegmentedTabs } from "./ui-bits";
import { Star8, OrnamentDivider } from "./ornaments";
import { RiseIn, useAnim } from "./motion-bits";
import { DUR, EASE, SPRING } from "@/lib/motion/system";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";

const inputCls = "tk-field";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tk-muted/90";

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
  { id: "nama", label: "A-Z" },
  { id: "ayat", label: "Ayat" },
];

/** Baris surah — komposisi baru: indeks soft-purple, nama tegas, Arab di kanan. */
function SurahRow({
  surah,
  showArabic,
  isLastRead,
  isBookmarked,
  index = 0,
  onOpen,
}: {
  surah: (typeof SURAH_LIST)[number];
  showArabic: boolean;
  isLastRead: boolean;
  isBookmarked: boolean;
  index?: number;
  onOpen: () => void;
}) {
  const anim = useAnim();
  return (
    <m.li
      initial={anim ? { opacity: 0, y: 14 } : false}
      animate={anim ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DUR.item, ease: EASE.out, delay: Math.min(index, 11) * 0.064 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="tap group flex w-full items-center gap-3.5 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-tk-panel-soft"
        aria-label={`Buka ${surah.latin}, surah ke-${surah.number}`}
      >
        {/* Chip nomor khatam: bintang segi delapan berlapis, tepi rambut hangat */}
        <span aria-hidden className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <span
            className={cn(
              "tk-octagram absolute inset-0",
              isLastRead ? "bg-tk-violet" : "bg-tk-lav-deco"
            )}
          />
          <span
            className={cn(
              "tk-octagram absolute inset-[1.5px]",
              isLastRead ? "bg-tk-violet" : "bg-tk-lavender"
            )}
          />
          <span
            className={cn(
              "gs-display tnum relative text-[12.5px] font-bold",
              isLastRead ? "text-white" : "text-tk-accent"
            )}
          >
            {surah.number}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-display text-[14.5px] font-bold tracking-[-0.01em] text-tk-ink">{surah.latin}</span>
            {isBookmarked ? <BookmarkIcon size={12} className="shrink-0 text-tk-violet" aria-label="Ada penanda" /> : null}
            {isLastRead ? (
              <span className="shrink-0 rounded-full bg-tk-lime px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-tk-lime-ink">
                Terakhir
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-tk-muted">
            {surah.meaning} · {surah.verses} ayat · {surah.place}
          </span>
        </span>
        {showArabic ? (
          <span className="quran-arabic shrink-0 text-[20px] leading-snug text-tk-violet dark:text-tk-accent">{surah.arabic}</span>
        ) : (
          <ChevronRight size={16} className="shrink-0 text-tk-muted/60" />
        )}
      </button>
    </m.li>
  );
}

/** Baris juz ringkas. */
function JuzRow({ juz, index = 0, onOpen }: { juz: (typeof JUZ_RANGES)[number]; index?: number; onOpen: () => void }) {
  const anim = useAnim();
  const start = getSurah(juz.startSurah);
  const end = getSurah(juz.endSurah);
  return (
    <m.li
      initial={anim ? { opacity: 0, y: 14 } : false}
      animate={anim ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DUR.item, ease: EASE.out, delay: Math.min(index, 11) * 0.064 }}
    >
      {/* Kelas baris identik dengan SurahRow (radius, padding, gap) */}
      <button
        type="button"
        onClick={onOpen}
        className="tap group flex w-full items-center gap-3.5 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-tk-panel-soft"
        aria-label={`Buka Juz ${juz.juz} dari ${start?.latin}`}
      >
        <span aria-hidden className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <span className="tk-octagram absolute inset-0 bg-tk-lav-deco" />
          <span className="tk-octagram absolute inset-[1.5px] bg-tk-lavender" />
          <span className="gs-display tnum relative text-[12.5px] font-bold text-tk-accent">{juz.juz}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14.5px] font-bold text-tk-ink">Juz {juz.juz}</span>
          <span className="block truncate text-[10.5px] text-tk-muted">
            {start?.latin} {juz.startAyah}, {end?.latin} {juz.endAyah} · {juz.surahs.length} surah
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-tk-muted/60" />
      </button>
    </m.li>
  );
}

/** Jam lokal "14.05" dari ISO — zona waktu perangkat, tanpa konversi UTC. */
function timeLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Kartu surah untuk tampilan GRID — ringkas & simetris, bahasa oktagram list view. */
function SurahCard({
  surah,
  isLastRead,
  isBookmarked,
  index = 0,
  onOpen,
}: {
  surah: (typeof SURAH_LIST)[number];
  isLastRead: boolean;
  isBookmarked: boolean;
  index?: number;
  onOpen: () => void;
}) {
  const anim = useAnim();
  return (
    <m.button
      type="button"
      onClick={onOpen}
      aria-label={`Buka ${surah.latin}, surah ke-${surah.number}, ${surah.verses} ayat`}
      initial={anim ? { opacity: 0, y: 12 } : false}
      animate={anim ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DUR.item, ease: EASE.out, delay: Math.min(index, 11) * 0.04 }}
      className={cn(
        "tap relative flex flex-col gap-2 rounded-2xl border bg-tk-panel-soft p-3 text-left transition-colors",
        isLastRead ? "border-tk-violet/50" : "border-tk-line hover:border-tk-violet/40"
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span aria-hidden className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span className={cn("tk-octagram absolute inset-0", isLastRead ? "bg-tk-violet" : "bg-tk-lav-deco")} />
          <span className={cn("tk-octagram absolute inset-[1.5px]", isLastRead ? "bg-tk-violet" : "bg-tk-lavender")} />
          <span className={cn("gs-display tnum relative text-[11.5px] font-bold", isLastRead ? "text-white" : "text-tk-accent")}>
            {surah.number}
          </span>
        </span>
        {surah.arabic ? (
          <span className="quran-arabic shrink-0 text-[15px] leading-snug text-tk-violet dark:text-tk-accent">{surah.arabic}</span>
        ) : null}
      </span>
      <span className="flex items-center gap-1">
        <span className="truncate font-display text-[13.5px] font-bold tracking-[-0.01em] text-tk-ink">{surah.latin}</span>
        {isBookmarked ? <BookmarkIcon size={11} className="shrink-0 text-tk-violet" aria-label="Ada penanda" /> : null}
      </span>
      <span className="flex items-center gap-1.5 text-[10px] text-tk-muted">
        <span className="tnum shrink-0 font-semibold">{surah.verses} ayat</span>
        <span aria-hidden className="h-0.5 w-0.5 rounded-full bg-tk-muted/60" />
        <span className="truncate">{surah.place}</span>
        {isLastRead ? (
          <span className="ml-auto shrink-0 rounded-full bg-tk-lime px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-tk-lime-ink">
            Terakhir
          </span>
        ) : null}
      </span>
    </m.button>
  );
}

/** Kartu Catatan Bacaan — hierarki jelas: surah & rentang, hari/tanggal/waktu
 *  lokal, progres surah, catatan pribadi, aksi lanjutkan/edit/hapus. */
function ReadingNoteCard({
  entry,
  index = 0,
  today,
  editing,
  onEditToggle,
  onSaveEdit,
  onDelete,
  onContinue,
}: {
  entry: ReadingEntry;
  index?: number;
  today: string;
  editing: boolean;
  onEditToggle: () => void;
  onSaveEdit: (patch: { ayahFrom: number; ayahTo: number; note: string }) => void;
  onDelete: () => void;
  onContinue: () => void;
}) {
  const anim = useAnim();
  const meta = entry.surah ? getSurah(entry.surah) : undefined;
  const total = meta?.verses ?? 0;
  const to = entry.ayahTo ?? entry.ayahFrom ?? 0;
  const from = entry.ayahFrom ?? to;
  const pct = total > 0 ? Math.min(100, Math.round((to / total) * 100)) : 0;
  const done = total > 0 && to >= total;
  // Form edit inline (state lokal; disimpan lewat onSaveEdit, di-reset setiap
  // kali mode edit dibuka agar selalu memuat nilai entri terbaru).
  const [ef, setEf] = useState(from);
  const [et, setEt] = useState(to);
  const [en, setEn] = useState(entry.note ?? "");
  useEffect(() => {
    if (editing) {
      setEf(entry.ayahFrom ?? 1);
      setEt(entry.ayahTo ?? entry.ayahFrom ?? 1);
      setEn(entry.note ?? "");
    }
  }, [editing, entry.ayahFrom, entry.ayahTo, entry.note]);
  const submitEdit = () => {
    const metaL = entry.surah ? getSurah(entry.surah) : undefined;
    const max = metaL?.verses ?? 0;
    if (!Number.isFinite(ef) || !Number.isFinite(et) || ef < 1 || et < ef || et > max) {
      toast.error(max > 0 ? `Ayat harus 1–${max}, awal ≤ akhir` : "Rentang ayat tidak valid");
      return;
    }
    onSaveEdit({ ayahFrom: ef, ayahTo: et, note: en });
  };
  return (
    <m.div
      initial={anim ? { opacity: 0, y: 14 } : false}
      animate={anim ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DUR.item, ease: EASE.out, delay: Math.min(index, 7) * 0.05 }}
      className={cn(
        "relative rounded-[1.2rem] border p-4 transition-colors",
        editing ? "border-tk-violet/60 bg-tk-panel" : "border-tk-line bg-tk-panel-soft hover:border-tk-violet/35"
      )}
    >
      {/* Baris kepala: ikon + surah + rentang */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            entry.auto
              ? "bg-tk-lime/60 text-tk-lime-ink dark:bg-tk-lime/20 dark:text-tk-lime"
              : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent"
          )}
        >
          {entry.auto ? <Flame size={16} /> : <BookOpen size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate font-display text-[15px] font-bold tracking-[-0.01em] text-tk-ink">
              {meta?.latin ?? "Bacaan Al-Qur'an"}
            </span>
            {meta ? <span className="quran-arabic shrink-0 text-[14px] leading-snug text-tk-violet dark:text-tk-accent">{meta.arabic}</span> : null}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-tk-muted">
            <span className="tnum font-semibold text-tk-ink/80">
              Ayat {from}
              {to > from ? `–${to}` : ""}
            </span>
            <span aria-hidden className="h-0.5 w-0.5 rounded-full bg-tk-muted/60" />
            <span>{entry.verses.toLocaleString("id-ID")} ayat</span>
            {entry.auto ? (
              <span className="rounded-full bg-tk-lime/50 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-tk-lime-ink dark:bg-tk-lime/15 dark:text-tk-lime">
                Otomatis
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Tanggal, hari, waktu — lokal perangkat */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-tk-line-soft pt-2.5 text-[11px] text-tk-muted">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={12} className="shrink-0 text-tk-violet dark:text-tk-accent" />
          <span className="font-semibold text-tk-ink/85">{formatDayFullWithYear(entry.date)}</span>
          {relativeDayLabel(entry.date, today) !== formatDayFullWithYear(entry.date) ? (
            <span className="rounded-full bg-tk-lavender px-1.5 py-px text-[9px] font-bold text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
              {relativeDayLabel(entry.date, today)}
            </span>
          ) : null}
        </span>
        {timeLabel(entry.savedAt) ? (
          <span className="flex items-center gap-1.5">
            <Clock3 size={12} className="shrink-0 text-tk-muted/80" />
            Terakhir diperbarui pukul <span className="tnum font-semibold text-tk-ink/85">{timeLabel(entry.savedAt)}</span>
          </span>
        ) : null}
      </div>

      {/* Progres menyelesaikan surah */}
      {total > 0 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-[10.5px]">
            <span className="font-semibold text-tk-muted">
              {done ? "Surah selesai dibaca" : `Progres ${meta?.latin}: ayat ${to} dari ${total}`}
            </span>
            <span className="tnum font-bold text-tk-violet dark:text-tk-accent">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-tk-track">
            <div
              className={cn("tk-bar-grow-x h-full rounded-full", done ? "bg-tk-lime" : "bg-gradient-to-r from-tk-violet to-tk-amber")}
              style={{ width: `${Math.max(3, pct)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Catatan pribadi */}
      {entry.note ? (
        <p className="mt-3 rounded-xl border border-tk-line bg-tk-panel px-3 py-2 text-[11.5px] italic leading-relaxed text-tk-ink/85">
          &ldquo;{entry.note}&rdquo;
        </p>
      ) : null}

      {/* Aksi */}
      {editing ? (
        <div className="mt-3 space-y-2.5 rounded-xl border border-tk-violet/40 bg-tk-panel p-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-tk-muted" htmlFor={`ed-from-${entry.id}`}>
                Ayat awal
              </label>
              <input
                id={`ed-from-${entry.id}`}
                type="number"
                min={1}
                inputMode="numeric"
                value={Number.isFinite(ef) ? ef : ""}
                onChange={(e) => setEf(parseInt(e.target.value, 10))}
                className="tk-field py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-tk-muted" htmlFor={`ed-to-${entry.id}`}>
                Ayat akhir
              </label>
              <input
                id={`ed-to-${entry.id}`}
                type="number"
                min={1}
                inputMode="numeric"
                value={Number.isFinite(et) ? et : ""}
                onChange={(e) => setEt(parseInt(e.target.value, 10))}
                className="tk-field py-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-tk-muted" htmlFor={`ed-note-${entry.id}`}>
              Catatan pribadi
            </label>
            <textarea
              id={`ed-note-${entry.id}`}
              value={en}
              maxLength={200}
              rows={2}
              onChange={(e) => setEn(e.target.value)}
              placeholder="mis. lanjut besok, ayat favorit, doa setelah membaca…"
              className="tk-field resize-none py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitEdit}
              className="tap flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full gs-ink-btn text-[12.5px] font-bold"
            >
              <Check size={15} /> Simpan Perubahan
            </button>
            <button
              type="button"
              onClick={onEditToggle}
              className="tap flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-tk-line bg-tk-panel-soft px-4 text-[12.5px] font-semibold text-tk-muted"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="tap flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full bg-tk-lavender px-3 text-[12px] font-bold text-tk-violet transition-colors hover:opacity-90 dark:bg-tk-accent/15 dark:text-tk-accent"
          >
            <Play size={13} />
            {done
              ? `Baca ulang ${meta?.latin ?? ""}`
              : `Lanjutkan ayat ${Math.min(total, to + 1) || to + 1}`}
          </button>
          <button
            type="button"
            onClick={onEditToggle}
            aria-label={`Edit catatan bacaan ${meta?.latin ?? ""}`}
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-tk-line bg-tk-panel text-tk-muted transition-colors hover:border-tk-violet/40 hover:text-tk-violet dark:hover:text-tk-accent"
          >
            <Pencil size={14} />
          </button>
          <ConfirmButton
            label="Hapus catatan bacaan"
            title="Hapus catatan bacaan ini?"
            description="Catatan ini akan dikeluarkan dari riwayat bacaan. Penanda ayat dan posisi terakhir tidak terpengaruh."
            onConfirm={onDelete}
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tk-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
          >
            <Trash2 size={14} />
          </ConfirmButton>
        </div>
      )}
    </m.div>
  );
}

/** Baris timeline riwayat — dot + garis vertikal, expand untuk detail & aksi. */
function HistoryEntryRow({
  entry,
  today,
  expanded,
  onToggle,
  onContinue,
  onDelete,
}: {
  entry: ReadingEntry;
  today: string;
  expanded: boolean;
  onToggle: () => void;
  onContinue: () => void;
  onDelete: () => void;
}) {
  const meta = entry.surah ? getSurah(entry.surah) : undefined;
  const to = entry.ayahTo ?? entry.ayahFrom ?? 0;
  const from = entry.ayahFrom ?? to;
  return (
    <li className="relative pl-6">
      {/* Dot + garis timeline */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-4 h-2.5 w-2.5 rounded-full border-2",
          entry.auto ? "border-tk-lime bg-transparent" : "border-tk-violet bg-tk-lavender dark:border-tk-accent dark:bg-tk-cream"
        )}
      />
      <span aria-hidden className="absolute left-[4.5px] top-7 h-[calc(100%-1.4rem)] w-px bg-tk-line-soft" />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="tap w-full rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-tk-panel-soft"
      >
        <span className="flex items-center gap-2">
          <span className="tnum w-11 shrink-0 pt-[3px] text-[11.5px] font-semibold text-tk-muted">{timeLabel(entry.savedAt) || "—"}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold tracking-[-0.01em] text-tk-ink">
              {meta?.latin ?? "Bacaan umum"}
              {from > 0 ? <span className="tnum text-[12px] font-medium text-tk-muted/90"> · ayat {from}{to > from ? `–${to}` : ""}</span> : null}
              {entry.pages > 0 && !entry.surah ? <span className="text-[12px] font-medium text-tk-muted/90"> · {entry.pages} halaman</span> : null}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-tk-muted">
              <span>{relativeDayLabel(entry.date, today)}</span>
              {entry.verses > 0 ? <span className="tnum">{entry.verses.toLocaleString("id-ID")} ayat</span> : null}
              {entry.pages > 0 && entry.surah ? <span className="tnum">{entry.pages} hal.</span> : null}
              {entry.auto ? (
                <span className="rounded-full bg-tk-lime/50 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-tk-lime-ink dark:bg-tk-lime/15 dark:text-tk-lime">
                  Otomatis
                </span>
              ) : (
                <span className="rounded-full bg-tk-lavender px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                  Manual
                </span>
              )}
              {entry.note ? <span className="italic">&ldquo;{entry.note}&rdquo;</span> : null}
            </span>
          </span>
          <ChevronRight size={15} className={cn("shrink-0 text-tk-muted/60 transition-transform", expanded && "rotate-90")} />
        </span>
      </button>
      {expanded ? (
        <div className="tk-fade-in mb-2 ml-12 rounded-xl border border-tk-line bg-tk-panel p-3.5">
          <p className="text-[12px] leading-[1.55] text-tk-muted">
            {meta ? `${meta.latin} (${meta.meaning}) · ${meta.place}` : "Catatan halaman tanpa surah"}
            {meta ? ` · ${meta.verses} ayat` : ""}
          </p>
          <div className="tnum mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] leading-snug text-tk-muted">
            <span className="font-medium text-tk-ink/85">
              {formatDayFullWithYear(entry.date)}{timeLabel(entry.savedAt) ? ` · pukul ${timeLabel(entry.savedAt)}` : ""}
            </span>
            {entry.pages > 0 ? <span>{entry.pages.toLocaleString("id-ID")} halaman</span> : null}
            {entry.verses > 0 ? <span>{entry.verses.toLocaleString("id-ID")} ayat</span> : null}
          </div>
          {entry.note ? (
            <p className="mt-2 rounded-lg bg-tk-panel-soft px-2.5 py-1.5 text-[12px] italic leading-relaxed text-tk-ink/85">
              &ldquo;{entry.note}&rdquo;
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            {entry.surah ? (
              (() => {
                const nextA = meta && to >= meta.verses ? 1 : to + 1;
                return (
                  <button
                    type="button"
                    onClick={onContinue}
                    className="tap flex min-h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-tk-lavender px-4 text-[12px] font-bold text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent"
                  >
                    <Play size={13} className="shrink-0" /> {nextA === 1 ? "Baca ulang ayat 1" : `Lanjutkan ayat ${nextA}`}
                  </button>
                );
              })()
            ) : null}
            <ConfirmButton
              label="Hapus riwayat bacaan"
              title="Hapus catatan bacaan ini?"
              description="Catatan ini akan dikeluarkan dari riwayat bacaan. Penanda ayat dan posisi terakhir tidak terpengaruh."
              onConfirm={onDelete}
              className="tap flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-tk-line px-4 text-[12px] font-semibold text-tk-muted transition-colors hover:border-[#E5484D]/40 hover:text-[#E5484D]"
            >
              <Trash2 size={13} /> Hapus
            </ConfirmButton>
          </div>
        </div>
      ) : null}
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
  const updateReadingEntry = useWorshipStore((s) => s.updateReadingEntry);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  // Gerbang motion global: setelan animasi aplikasi + prefers-reduced-motion.
  const anim = useAnim();

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
  // Tampilan daftar surah: list (baris) / grid (kartu) — preferensi tersimpan.
  const viewMode = settings.quranListView ?? "list";
  // Catatan pribadi pada form catat ringkas.
  const [catNote, setCatNote] = useState("");
  // Edit catatan bacaan (id entri yang sedang diedit) & detail riwayat terbuka.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedHistId, setExpandedHistId] = useState<string | null>(null);
  // Filter riwayat: pencarian, rentang tanggal, surah tertentu.
  const [histQuery, setHistQuery] = useState("");
  const [histRange, setHistRange] = useState<"semua" | "hari-ini" | "7" | "30">("semua");
  const [histSurah, setHistSurah] = useState<number | "semua">("semua");

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

  /* ---------- Catatan Bacaan: kartu terstruktur dari catatan terbaru ---------- */
  const recentNotes = useMemo(() => readingHistory.slice(0, 6), [readingHistory]);

  /* ---------- Riwayat: ringkasan + filter + pengelompokan per tanggal ---------- */
  const histSurahOptions = useMemo(() => {
    const nums = new Set<number>();
    for (const e of readingHistory) if (e.surah) nums.add(e.surah);
    return [...nums].sort((a, b) => a - b);
  }, [readingHistory]);

  const histSummary = useMemo(() => {
    const unique = new Set<number>();
    let verses = 0;
    for (const e of readingHistory) {
      if (e.surah) unique.add(e.surah);
      verses += e.verses ?? 0;
    }
    return { total: readingHistory.length, surahs: unique.size, verses };
  }, [readingHistory]);

  const histGroups = useMemo(() => {
    const q = histQuery.trim().toLowerCase();
    const rangeDays = histRange === "7" ? 7 : histRange === "30" ? 30 : 0;
    const minDate = rangeDays ? lastNDays(rangeDays, today)[0] : "";
    let list = readingHistory;
    if (histRange === "hari-ini") list = list.filter((e) => e.date === today);
    else if (minDate) list = list.filter((e) => e.date >= minDate);
    if (histSurah !== "semua") list = list.filter((e) => e.surah === histSurah);
    if (q) {
      list = list.filter((e) => {
        const meta = e.surah ? getSurah(e.surah) : undefined;
        return (
          (meta !== undefined && (meta.latin.toLowerCase().includes(q) || meta.meaning.toLowerCase().includes(q))) ||
          String(e.surah ?? "") === q ||
          (e.note ?? "").toLowerCase().includes(q)
        );
      });
    }
    const map = new Map<string, ReadingEntry[]>();
    for (const e of list) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [readingHistory, histQuery, histRange, histSurah, today]);

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
      note: catNote.trim() || undefined,
    });
    toast.success(
      `Bacaan disimpan: ${p.meta.latin} ${p.from}${p.to > p.from ? `-${p.to}` : ""} · ${p.to - p.from + 1} ayat · penanda di ayat ${p.to}`
    );
    setCatSurah("");
    setCatAyat("");
    setCatNote("");
  };

  return (
    <div className="space-y-6">
      {/* ---------- Judul halaman ---------- */}
      <RiseIn i={0} className="pt-1">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-tk-ink">Al-Qur&apos;an</h1>
              <p className="mt-1 text-[12.5px] text-tk-muted">Temukan ketenangan dalam setiap ayat</p>
            </div>
            {/* Aksen kaligrafi: nama kitab dalam naskh Amiri */}
            <span aria-hidden className="quran-arabic shrink-0 pt-1 text-[21px] leading-none text-tk-accent/80">
              القرآن الكريم
            </span>
          </div>
          <OrnamentDivider className="mt-4" />
        </header>
      </RiseIn>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
        {/* ---------- Hero lanjutkan bacaan (featured blok lavender lembut) ---------- */}
        <section aria-label="Lanjutkan bacaan" className="animate-tk-fade-up lg:col-span-7">
          <div className="glass-violet relative flex h-full flex-col justify-between overflow-hidden rounded-[1.4rem] p-5 su-card-shadow sm:p-6">
            {/* Ornamen latar: kisi khatam samar di sudut kanan atas */}
            <div
              aria-hidden
              className="tk-geo-pattern absolute -right-7 -top-7 h-40 w-40"
              style={{ maskSize: "52px 52px", WebkitMaskSize: "52px 52px" }}
            />
            <div className="relative">
              <p className="gs-overline flex items-center gap-1.5">
                <Star8 size={10} className="text-tk-accent/75" />
                {lastPos ? "Lanjutkan Bacaan" : "Mulai Membaca"}
              </p>
              <div className="mt-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[25px] font-extrabold tracking-[-0.025em] text-tk-ink">
                    {lastSurahMeta?.latin ?? "Al-Fatihah"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-tk-muted">
                    Ayat {lastPos?.ayah ?? 1} · {lastSurahMeta?.meaning ?? "Pembukaan"}
                  </p>
                </div>
                {settings.showArabic && lastSurahMeta ? (
                  <span className="quran-arabic shrink-0 text-[26px] leading-snug text-tk-violet">
                    {lastSurahMeta.arabic}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenReader(lastPos?.surah ?? 1, lastPos?.ayah ?? 1)}
                className="tap flex min-h-[46px] items-center gap-2 rounded-full gs-ink-btn px-5 text-[13px] font-bold transition-all hover:opacity-90"
              >
                <Play size={15} />
                {lastPos ? "Lanjutkan" : "Buka Qur'an"}
              </button>
              {manualBookmark ? (
                <button
                  type="button"
                  onClick={() => onOpenReader(manualBookmark.surah, manualBookmark.ayah)}
                  className="tap flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold text-tk-ink dark:bg-white/10"
                >
                  <BookmarkIcon size={13} className="text-tk-violet" />
                  Penanda: {getSurah(manualBookmark.surah)?.latin} · {manualBookmark.ayah}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* ---------- Target bacaan hari ini (kartu putih ringkas + ring) ---------- */}
        <section aria-label="Target bacaan harian" className="animate-tk-fade-up mt-6 lg:col-span-5 lg:mt-0">
          {/* Radius kartu 1.4rem — sejajar dengan kartu hero di sebelahnya */}
          <div className="glass flex h-full items-center gap-5 rounded-[1.4rem] p-5">
            <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: 92, height: 92 }}>
              <svg width={92} height={92} className="-rotate-90">
                <circle cx={46} cy={46} r={40} fill="none" strokeWidth={8} className="stroke-tk-track" />
                <circle
                  cx={46}
                  cy={46}
                  r={40}
                  fill="none"
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="stroke-tk-violet"
                  strokeDasharray={`${(pct / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`}
                  style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
              </svg>
              <span className="gs-display absolute text-[20px] font-extrabold text-tk-ink">{pct}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="gs-overline">Target Bacaan</p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="gs-display text-[30px] font-extrabold leading-none text-tk-ink">
                  {value.toLocaleString("id-ID")}
                </span>
                <span className="text-[11.5px] font-semibold text-tk-muted">/ {targetValue.toLocaleString("id-ID")} {targetType === "surah" ? "ayat" : unit}</span>
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-tk-muted">
                {pct >= 100 ? "Target hari ini tercapai. Barakallah!" : `${Math.max(0, targetValue - value).toLocaleString("id-ID")} ${targetType === "surah" ? "ayat" : unit} lagi · ${targetSubtitle}`}
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Statistik editorial TANPA kartu: angka besar + hairline ---------- */}
        <section aria-label="Progres bacaan" className="animate-tk-fade-up mt-9 lg:col-span-12">
          <div className="grid grid-cols-3">
            {[
              { value: totalPages.toLocaleString("id-ID"), label: "Halaman dibaca" },
              { value: totalVerses.toLocaleString("id-ID"), label: "Ayat dibaca" },
              { value: daysRead.toLocaleString("id-ID"), label: "Hari membaca" },
            ].map(({ value, label }, i) => (
              <div key={label} className={cn("min-w-0 px-4", i === 0 && "pl-0", i > 0 && "border-l border-tk-line")}>
                <p className="flex items-start gap-1.5">
                  <span className="gs-display truncate text-[26px] font-extrabold leading-none text-tk-ink sm:text-[30px]">
                    {value}
                  </span>
                  <Star8 size={9} className="mt-1 shrink-0 text-tk-accent/65" />
                </p>
                <p className="gs-overline mt-2">{label}</p>
              </div>
            ))}
          </div>

          {/* Batang 7 hari, kronologis kiri ke kanan, tanpa kartu */}
          <OrnamentDivider className="mt-7" />
          <div className="mt-5 flex items-end justify-between gap-1.5" aria-hidden>
            {lastNDays(7, today).map((k) => {
              const pages = logs[k]?.quranPages ?? 0;
              const verses = logs[k]?.quranVerses ?? 0;
              const h = Math.max(pages > 0 || verses > 0 ? 10 : 2, Math.min(100, (pages / Math.max(1, settings.quranDailyTarget)) * 100));
              return (
                <div key={k} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="tnum text-[9.5px] font-semibold text-tk-muted/80">{pages > 0 ? pages : ""}</span>
                  <div className="flex h-16 w-full items-end">
                    <div
                      className={cn("tk-bar-grow-x mx-auto w-full max-w-[24px] rounded-full", k === today ? "bg-tk-violet" : "bg-tk-lav-deco")}
                      style={{ height: `${h}%`, opacity: pages > 0 || verses > 0 ? 1 : 1 }}
                    />
                  </div>
                  <span className={cn("text-[9.5px]", k === today ? "font-bold text-tk-ink" : "text-tk-muted")}>{weekdayShort(k)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-tk-muted">
            Minggu ini: {weekPages.toLocaleString("id-ID")} halaman · {weekVerses.toLocaleString("id-ID")} ayat. Hari tanpa
            catatan bukan hari gagal, tinggal lanjutkan besok.
          </p>
        </section>

        {/* ---------- Surah favorit ---------- */}
        {topEntry && topMeta ? (
          <section aria-label="Surah paling sering dibaca" className="animate-tk-fade-up mt-6 lg:col-span-5">
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
              aria-label={`Buka ${topMeta.latin}, dibaca ${topEntry[1].count} kali`}
            >
              <div className="glass-violet relative h-full overflow-hidden rounded-[1.4rem] p-5">
                {/* Ornamen latar: kisi khatam samar di sudut kanan atas */}
                <div
                  aria-hidden
                  className="tk-geo-pattern absolute -right-6 -top-6 h-32 w-32"
                  style={{ maskSize: "48px 48px", WebkitMaskSize: "48px 48px" }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-baseline gap-2">
                      <span className="text-[21px] font-extrabold tracking-[-0.02em] text-tk-ink">{topMeta.latin}</span>
                      {settings.showArabic ? (
                        <span className="quran-arabic text-[16px] text-tk-violet">{topMeta.arabic}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-tk-muted">
                      Terakhir dibaca {relativeDayLabel(topEntry[1].lastDate, today)}
                    </p>
                  </div>
                </div>
                <p className="relative mt-4 flex items-baseline gap-2">
                  <span className="gs-display text-[38px] font-extrabold leading-none text-tk-ink">{topEntry[1].count}</span>
                  <span className="text-[11.5px] font-semibold text-tk-muted">kali dibaca</span>
                  <span className="ml-auto text-[12px] font-bold text-tk-violet">
                    {topEntry[1].verses.toLocaleString("id-ID")} ayat
                  </span>
                </p>
                {runnerUps.length > 0 ? (
                  <p className="relative mt-3 flex flex-wrap items-center gap-1.5 border-t border-tk-lav-deco pt-3">
                    <span className="gs-overline">Juga sering</span>
                    {runnerUps.map(([n, st], i) => (
                      <span
                        key={n}
                        className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-tk-ink/85 dark:bg-white/10"
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
          <section aria-label="Ayat yang ditandai" className="animate-tk-fade-up mt-6 lg:col-span-7">
            <SectionHeader title="Ayat Ditandai" caption={`${ayahBookmarks.length} ayat, ketuk untuk membuka`} />
            <GlassCard className="thin-scrollbar max-h-64 overflow-y-auto">
              <ul className="divide-y divide-tk-line-soft">
                {ayahBookmarks.slice(0, 20).map((b) => {
                  const meta = getSurah(b.surah);
                  return (
                    <li key={`${b.surah}:${b.ayah}`}>
                      <button
                        type="button"
                        onClick={() => onOpenReader(b.surah, b.ayah)}
                        className="tap flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-tk-panel-soft"
                        aria-label={`Buka ${meta?.latin ?? "surah"} ayat ${b.ayah}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                          <BookmarkIcon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-tk-ink">
                            {meta?.latin ?? `Surah ${b.surah}`} · ayat {b.ayah}
                          </span>
                          <span className="block text-[10px] text-tk-muted">{relativeDayLabel(b.savedAt.slice(0, 10), today)}</span>
                        </span>
                        <ChevronRight size={15} className="shrink-0 text-tk-muted/70" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </section>
        ) : null}

        {/* ---------- Jelajah: pencarian + filter + tab + daftar baris ---------- */}
        <section aria-label="Daftar surah dan juz" className="animate-tk-fade-up mt-6 lg:col-span-12">
          <SectionHeader title="Jelajah" caption="Cari surah atau juz, filter tempat turunnya" />
          <GlassCard className="p-4 sm:p-5">
            {/* Pencarian pil modern */}
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-tk-lavender text-tk-violet dark:bg-tk-accent/20 dark:text-tk-accent"
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
                  className="tap absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-tk-panel-soft text-tk-muted transition-colors hover:text-tk-ink"
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
                        "tap relative shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition-all",
                        placeFilter === f.id
                          ? anim
                            ? "text-white"
                            : "gs-ink-btn"
                          : "border-tk-line bg-tk-panel-soft text-tk-muted hover:text-tk-ink"
                      )}
                    >
                      {/* Pil aktif MELUNCUR antar filter via layout animation
                          (hanya transform, bahasa pil BottomNav). */}
                      {placeFilter === f.id && anim ? (
                        <m.span
                          layoutId="quran-place-pill"
                          transition={SPRING.glide}
                          className="gs-ink-btn absolute inset-0 rounded-full"
                        />
                      ) : null}
                      <span className="relative z-10">
                        {f.label}
                        {f.id === "Makkiyah" ? ` · ${filterCounts.makkiyah}` : ""}
                        {f.id === "Madaniyah" ? ` · ${filterCounts.madaniyah}` : ""}
                        {f.id === "ditandai" ? ` · ${filterCounts.ditandai}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Sortir + jumlah hasil */}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5" role="group" aria-label="Urutkan surah">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-tk-muted/80">Urut</span>
                    {SORT_MODES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={sortMode === s.id}
                        onClick={() => setSortMode(s.id)}
                        className={cn(
                          "tap relative rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                          sortMode === s.id
                            ? anim
                              ? "text-tk-violet dark:text-tk-accent"
                              : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/20 dark:text-tk-accent"
                            : "text-tk-muted hover:text-tk-ink"
                        )}
                      >
                        {sortMode === s.id && anim ? (
                          <m.span
                            layoutId="quran-sort-pill"
                            transition={SPRING.glide}
                            className="absolute inset-0 rounded-full bg-tk-lavender dark:bg-tk-accent/20"
                          />
                        ) : null}
                        <span className="relative z-10">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="shrink-0 text-[10.5px] text-tk-muted">{filtered.length} surah</span>
                    {/* Saklar tampilan List ⇄ Grid — preferensi tersimpan di pengaturan. */}
                    <div className="flex items-center gap-0.5 rounded-full border border-tk-line bg-tk-panel-soft p-0.5" role="group" aria-label="Tampilan daftar surah">
                      {(
                        [
                          { id: "list" as const, icon: ListIcon, label: "Tampilan daftar" },
                          { id: "grid" as const, icon: LayoutGrid, label: "Tampilan kisi" },
                        ]
                      ).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          aria-pressed={viewMode === v.id}
                          aria-label={v.label}
                          onClick={() => updateSettings({ quranListView: v.id })}
                          className={cn(
                            "tap relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                            viewMode === v.id
                              ? anim
                                ? "text-tk-violet dark:text-tk-accent"
                                : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/20 dark:text-tk-accent"
                              : "text-tk-muted hover:text-tk-ink"
                          )}
                        >
                          {viewMode === v.id && anim ? (
                            <m.span
                              layoutId="quran-view-pill"
                              transition={SPRING.glide}
                              className="absolute inset-0 rounded-full bg-tk-lavender dark:bg-tk-accent/20"
                            />
                          ) : null}
                          <v.icon size={13} className="relative z-10" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {viewMode === "grid" ? (
                  /* GRID VIEW: kartu ringkas 2 kolom (ponsel), 3–4 di layar besar. */
                  <div key="grid-view" className="tk-fade-in mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4" role="list">
                    {filtered.map((s, idx) => (
                      <SurahCard
                        key={s.number}
                        index={idx}
                        surah={s}
                        isLastRead={lastRead?.surah === s.number}
                        isBookmarked={bookmarkedSurahs.has(s.number)}
                        onOpen={() => onOpenReader(s.number, lastRead?.surah === s.number ? lastRead.ayah : 1)}
                      />
                    ))}
                  </div>
                ) : (
                  /* LIST VIEW: baris indeks seperti sebelumnya. */
                  <ul key="list-view" className="tk-list-cv tk-fade-in mt-2 divide-y divide-tk-line-soft sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0 lg:grid-cols-3">
                    {filtered.map((s, idx) => (
                      <SurahRow
                        key={s.number}
                        index={idx}
                        surah={s}
                        showArabic={settings.showArabic}
                        isLastRead={lastRead?.surah === s.number}
                        isBookmarked={bookmarkedSurahs.has(s.number)}
                        onOpen={() => onOpenReader(s.number, lastRead?.surah === s.number ? lastRead.ayah : 1)}
                      />
                    ))}
                  </ul>
                )}
                {filtered.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-tk-line bg-tk-panel-soft px-3 py-4 text-center text-sm text-tk-muted">
                    Tidak ada surah yang cocok, coba kata kunci atau filter lain.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-4 text-[10.5px] text-tk-muted">
                  {juzFiltered.length} dari {JUZ_RANGES.length} juz, sentuh untuk membuka dari awal juz.
                </p>
                <ul className="tk-list-cv mt-2 divide-y divide-tk-line-soft sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0 lg:grid-cols-3">
                  {juzFiltered.map((j, idx) => (
                    <JuzRow key={j.juz} index={idx} juz={j} onOpen={() => onOpenReader(j.startSurah, j.startAyah)} />
                  ))}
                </ul>
                {juzFiltered.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-tk-line bg-tk-panel-soft px-3 py-4 text-center text-sm text-tk-muted">
                    Juz tidak ditemukan, coba nomor juz atau nama surah di dalamnya.
                  </p>
                ) : null}
              </>
            )}
          </GlassCard>
        </section>

        {/* ---------- Catat bacaan & penanda (ringkas) ---------- */}
        <section aria-label="Catat bacaan dan penanda" className="animate-tk-fade-up mt-6 lg:col-span-12">
          <GlassCard className="overflow-hidden">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
              aria-expanded={formOpen}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gs-ink-btn">
                <Plus size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[14.5px] font-bold text-tk-ink">Catat Bacaan</span>
                <span className="block text-[11px] text-tk-muted">Cukup surah &amp; ayat, rentang dan penanda diisi otomatis</span>
              </span>
              <ChevronRight size={16} className={cn("shrink-0 text-tk-muted/70 transition-transform", formOpen && "rotate-90")} />
            </button>
            {formOpen ? (
              <div className="space-y-4 border-t border-tk-line p-4 sm:p-5">
                {/* Catat bacaan: hanya surah + ayat */}
                <div>
                  <p className={labelCls}>Catat bacaan</p>
                  <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                    <div>
                      <label className={labelCls} htmlFor="cat-surah">
                        Surah
                      </label>
                      <select id="cat-surah" value={catSurah} onChange={(e) => setCatSurah(e.target.value)} className={inputCls}>
                        <option value="">Pilih</option>
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
                  <div className="mt-3">
                    <label className={labelCls} htmlFor="cat-note">
                      Catatan pribadi (opsional)
                    </label>
                    <input
                      id="cat-note"
                      type="text"
                      value={catNote}
                      maxLength={200}
                      onChange={(e) => setCatNote(e.target.value)}
                      placeholder="mis. malam ini lancar sekali, lanjut besok"
                      className={inputCls}
                    />
                  </div>
                  {catPreview ? (
                    <p className="mt-2 flex items-start gap-1.5 rounded-2xl border border-tk-violet/25 bg-tk-lavender/50 px-3 py-2 text-[11px] leading-relaxed text-tk-ink/90 dark:bg-tk-accent/10">
                      <Sparkles size={12} className="mt-0.5 shrink-0 text-tk-violet dark:text-tk-accent" />
                      <span>
                        {catPreview.exceeds ? (
                          <>
                            {catPreview.meta.latin} hanya {catPreview.meta.verses} ayat,{" "}
                          </>
                        ) : null}
                        Tercatat: {catPreview.meta.latin} {catPreview.from}
                        {catPreview.to > catPreview.from ? ` sampai ${catPreview.to}` : ""} · {catPreview.to - catPreview.from + 1} ayat ·
                        penanda pindah ke ayat {catPreview.to}
                        {catPreview.continuing ? " (lanjutan dari posisi terakhir)" : ""}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] leading-relaxed text-tk-muted">
                      Pilih surah &amp; ayat terakhir, rentang bacaan dihitung otomatis dari posisi terakhirmu.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={saveCatatan}
                    className="tap mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full gs-ink-btn font-display text-[14px] font-bold transition-all hover:opacity-90"
                  >
                    <Check size={17} /> Simpan Bacaan
                  </button>
                </div>
              </div>
            ) : null}
          </GlassCard>
        </section>

        {/* ---------- Catatan Bacaan: kartu terstruktur + aksi ---------- */}
        <section aria-label="Catatan bacaan" className="animate-tk-fade-up mt-6 lg:col-span-12">
          <SectionHeader title="Catatan Bacaan" caption="Terbaru dulu · hari, tanggal, dan waktu memakai jam perangkatmu" />
          {recentNotes.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={18} />}
              title="Catatan bacaan masih kosong"
              caption="Bacaan tercatat otomatis dari pembaca, atau catat manual lewat form di atas."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentNotes.map((e, idx) => (
                <ReadingNoteCard
                  key={e.id}
                  entry={e}
                  index={idx}
                  today={today}
                  editing={editingNoteId === e.id}
                  onEditToggle={() => setEditingNoteId(editingNoteId === e.id ? null : e.id)}
                  onSaveEdit={(patch) => {
                    updateReadingEntry(e.id, patch);
                    setEditingNoteId(null);
                    toast.success("Catatan bacaan diperbarui");
                  }}
                  onDelete={() => {
                    deleteReadingEntry(e.id);
                    setEditingNoteId(null);
                    toast.info("Catatan bacaan dihapus");
                  }}
                  onContinue={() => {
                    const meta = e.surah ? getSurah(e.surah) : undefined;
                    const to = e.ayahTo ?? e.ayahFrom ?? 1;
                    const next = meta && to >= meta.verses ? 1 : to + 1;
                    onOpenReader(e.surah ?? 1, next);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------- Riwayat Bacaan: ringkasan + filter + timeline per tanggal ---------- */}
        <section aria-label="Riwayat bacaan" className="animate-tk-fade-up mt-6 lg:col-span-12">
          <SectionHeader title="Riwayat Bacaan" caption="Kelompok aktivitas per tanggal, semua angka dari data nyata" />

          {/* Ringkasan editorial: angka besar + hairline (tanpa kartu) */}
          <div className="grid grid-cols-3">
            {[
              { value: histSummary.total.toLocaleString("id-ID"), label: "Total aktivitas" },
              { value: histSummary.surahs.toLocaleString("id-ID"), label: "Surah dibaca" },
              { value: histSummary.verses.toLocaleString("id-ID"), label: "Ayat tercatat" },
            ].map(({ value, label }, i) => (
              <div key={label} className={cn("min-w-0 px-3.5", i === 0 && "pl-0", i > 0 && "border-l border-tk-line")}>
                <p className="flex items-start gap-1.5">
                  <span className="gs-display truncate text-[21px] font-extrabold leading-none text-tk-ink sm:text-[24px]">
                    {value}
                  </span>
                  <Star8 size={8} className="mt-1 shrink-0 text-tk-accent/65" />
                </p>
                <p className="mt-1.5 text-[9px] font-semibold uppercase leading-[1.5] tracking-[0.16em] text-tk-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {readingHistory.length === 0 ? (
            <EmptyState
              icon={<History size={18} />}
              title="Riwayat masih kosong"
              caption="Bacaan tercatat otomatis dari pembaca, atau catat manual lewat form di atas."
            />
          ) : (
            <>
              <p className="mt-2.5 truncate text-[11px] text-tk-muted">
                {(() => {
                  const e0 = readingHistory[0];
                  const m0 = e0.surah ? getSurah(e0.surah) : undefined;
                  const to0 = e0.ayahTo ?? e0.ayahFrom ?? 0;
                  return `Aktivitas terbaru: ${m0?.latin ?? "Bacaan umum"}${e0.ayahFrom ? ` · ayat ${e0.ayahFrom}${to0 > e0.ayahFrom ? `–${to0}` : ""}` : ""} · ${relativeDayLabel(e0.date, today)}`;
                })()}
              </p>

              {/* Kontrol: pencarian + filter tanggal + filter surah */}
              <div className="mt-3 space-y-2.5">
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-tk-lavender text-tk-violet dark:bg-tk-accent/20 dark:text-tk-accent"
                  >
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    value={histQuery}
                    onChange={(e) => setHistQuery(e.target.value)}
                    placeholder="Cari surah, arti, atau catatan pribadi…"
                    aria-label="Cari riwayat bacaan"
                    className={cn(inputCls, "rounded-full! py-2! pl-10!", histQuery && "pr-10!")}
                  />
                  {histQuery ? (
                    <button
                      type="button"
                      onClick={() => setHistQuery("")}
                      aria-label="Bersihkan pencarian riwayat"
                      className="tap absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-tk-panel-soft text-tk-muted transition-colors hover:text-tk-ink"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="group" aria-label="Filter tanggal riwayat">
                    {(
                      [
                        { id: "semua" as const, label: "Semua" },
                        { id: "hari-ini" as const, label: "Hari Ini" },
                        { id: "7" as const, label: "7 Hari" },
                        { id: "30" as const, label: "30 Hari" },
                      ]
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={histRange === f.id}
                        onClick={() => setHistRange(f.id)}
                        className={cn(
                          "tap relative shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                          histRange === f.id
                            ? anim
                              ? "text-white"
                              : "gs-ink-btn"
                            : "border-tk-line bg-tk-panel-soft text-tk-muted hover:text-tk-ink"
                        )}
                      >
                        {histRange === f.id && anim ? (
                          <m.span layoutId="hist-date-pill" transition={SPRING.glide} className="gs-ink-btn absolute inset-0 rounded-full" />
                        ) : null}
                        <span className="relative z-10">{f.label}</span>
                      </button>
                    ))}
                  </div>
                  {histSurahOptions.length > 0 ? (
                    <select
                      value={histSurah === "semua" ? "" : String(histSurah)}
                      onChange={(e) => setHistSurah(e.target.value ? Number(e.target.value) : "semua")}
                      aria-label="Filter surah pada riwayat"
                      className={cn(inputCls, "max-w-[190px] rounded-full! py-1.5! text-[11.5px]!")}
                    >
                      <option value="">Semua surah</option>
                      {histSurahOptions.map((n) => (
                        <option key={n} value={n}>
                          {getSurah(n)?.latin ?? `Surah ${n}`}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>

              {/* Timeline aktivitas, dikelompokkan per tanggal */}
              <GlassCard className="mt-3 p-4 sm:p-5">
                {histGroups.length === 0 ? (
                  <p className="rounded-2xl border border-tk-line bg-tk-panel-soft px-3 py-5 text-center text-[12.5px] leading-relaxed text-tk-muted">
                    Tidak ada aktivitas yang cocok dengan pencarian atau filter ini.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {histGroups.map(([date, entries]) => (
                      <div key={date}>
                        <p className="flex flex-wrap items-center gap-2 px-0.5">
                          <CalendarDays size={13} className="shrink-0 text-tk-violet dark:text-tk-accent" />
                          <span className="text-[12.5px] font-bold text-tk-ink">{formatDayFullWithYear(date)}</span>
                          <span className="rounded-full bg-tk-lavender px-2 py-px text-[9.5px] font-bold text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                            {relativeDayLabel(date, today)}
                          </span>
                          <span className="tnum ml-auto text-[10.5px] font-semibold text-tk-muted">{entries.length} aktivitas</span>
                        </p>
                        <ul className="mt-1.5">
                          {entries.map((e) => (
                            <HistoryEntryRow
                              key={e.id}
                              entry={e}
                              today={today}
                              expanded={expandedHistId === e.id}
                              onToggle={() => setExpandedHistId(expandedHistId === e.id ? null : e.id)}
                              onContinue={() => {
                                const meta = e.surah ? getSurah(e.surah) : undefined;
                                const to = e.ayahTo ?? e.ayahFrom ?? 1;
                                const next = meta && to >= meta.verses ? 1 : to + 1;
                                onOpenReader(e.surah ?? 1, next);
                              }}
                              onDelete={() => {
                                deleteReadingEntry(e.id);
                                setExpandedHistId(null);
                                toast.info("Catatan bacaan dihapus");
                              }}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </>
          )}
        </section>
      </div>

      {/* ---------- Catatan sumber ---------- */}
      <div className="mt-6 pb-1">
        <p className="flex items-start gap-1.5 rounded-2xl border border-tk-line bg-tk-panel-soft px-3.5 py-2.5 text-[11px] leading-relaxed text-tk-muted">
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
