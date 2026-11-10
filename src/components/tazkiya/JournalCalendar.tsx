"use client";

/**
 * Tazkiya — Kalender interaktif riwayat jurnal ("Jurnal Saya").
 *
 * Kalender bulanan Senin-awal dengan:
 * - Navigasi bulan sebelumnya/berikutnya + kembali ke hari ini.
 * - Indikator titik per kategori (maks. 4 — satu per kategori, alami terbatas).
 * - Ringkasan bulan berjalan di pojok kartu (mengikuti bulan tampil, bukan statis).
 * - Sheet detail tanggal (daftar catatan + Baca/Edit/Hapus) & empty state
 *   dengan tombol "Mulai Menulis" → pemilih kategori dengan tanggal terpilih.
 *
 * Kinerja: animasi hanya transform/opacity (m. + LazyMotion), transisi bulan
 * horizontal dengan stagger tipis, tanpa layout thrash.
 */

import { useMemo } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, PenLine, X } from "lucide-react";
import { calendarDayKeys, formatDayFull, todayKey } from "@/lib/tazkiya/dates";
import { journalCatMeta, type JournalCat } from "@/lib/tazkiya/types";
import { cn } from "@/lib/utils";

/* ---------- Identitas warna kategori (selaras aksen SUIO) ---------- */

export const CAT_DOT: Record<JournalCat | "syukur", string> = {
  refleksi: "#FF5A00", // orange — Refleksi Diri
  emosi: "#FFB38A", // peach — Emosi & Penerimaan
  syukur: "#E19A3C", // warm amber — Syukur
  harapan: "#C2410C", // burnt orange — Harapan & Ikhtiar
};

export type NoteCat = JournalCat | "syukur";

export interface DayNotes {
  cats: NoteCat[]; // kategori yang punya catatan pada tanggal itu
}

/* ===================== Ringkasan bulan ===================== */

export function monthSummary(
  year: number,
  month: number,
  notes: Record<string, DayNotes>
): { total: number; days: number; top?: NoteCat } {
  const keys = calendarDayKeys(year, month).filter(Boolean) as string[];
  let total = 0;
  let days = 0;
  const perCat = new Map<NoteCat, number>();
  for (const k of keys) {
    const n = notes[k];
    if (!n?.cats.length) continue;
    days += 1;
    total += n.cats.length;
    for (const c of n.cats) perCat.set(c, (perCat.get(c) ?? 0) + 1);
  }
  let top: NoteCat | undefined;
  let best = 0;
  for (const [c, v] of perCat) if (v > best) ((best = v), (top = c));
  return { total, days, top };
}

function catShort(c: NoteCat): string {
  return c === "syukur" ? "Syukur" : journalCatMeta(c).short;
}

/* ===================== Kalender ===================== */

const WD = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mn"];

export function JournalCalendar({
  year,
  month,
  notes,
  selected,
  onSelect,
  onShift,
  onToday,
  motionOK,
}: {
  year: number;
  month: number;
  notes: Record<string, DayNotes>;
  selected: string | null;
  onSelect: (d: string) => void;
  onShift: (dir: -1 | 1) => void;
  onToday: () => void;
  motionOK: boolean;
}) {
  const today = todayKey();
  const cells = useMemo(() => calendarDayKeys(year, month), [year, month]);
  const sum = useMemo(() => monthSummary(year, month, notes), [year, month, notes]);
  const isThisMonth = year === parseInt(today.slice(0, 4), 10) && month === parseInt(today.slice(5, 7), 10) - 1;
  const dir = (year * 12 + month) % 2 === 0 ? 1 : -1; // arah slide stabil per bulan

  const monthLabel = new Date(year, month, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-[1.4rem] border border-tk-line bg-tk-panel p-4 light:shadow-[0_14px_34px_-24px_rgba(23,23,26,0.25)] dark:shadow-[0_14px_34px_-24px_rgba(12,6,2,0.7)]">
      {/* Kepala: bulan + navigasi + ringkasan pojok */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[15.5px] font-bold tracking-[-0.01em] text-tk-ink">{monthLabel}</p>
          <p className="tnum mt-0.5 text-[10.5px] font-medium leading-snug text-tk-muted">
            {sum.total > 0
              ? `${sum.total} catatan · ${sum.days} hari · terbanyak: ${sum.top ? catShort(sum.top) : "-"}`
              : "Belum ada catatan bulan ini"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isThisMonth ? (
            <button
              type="button"
              onClick={onToday}
              className="tap mr-1 rounded-full border border-tk-line-strong bg-tk-panel-soft px-2.5 py-1 text-[10.5px] font-bold text-tk-ink transition-colors"
            >
              Hari Ini
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onShift(-1)}
            aria-label="Bulan sebelumnya"
            className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line-strong text-tk-ink transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => onShift(1)}
            aria-label="Bulan berikutnya"
            className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line-strong text-tk-ink transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Baris nama hari */}
      <div className="mt-3.5 grid grid-cols-7 gap-1" aria-hidden>
        {WD.map((w) => (
          <span key={w} className="text-center text-[9.5px] font-bold uppercase tracking-[0.08em] text-tk-muted/80">
            {w}
          </span>
        ))}
      </div>

      {/* Grid tanggal — transisi horizontal antar bulan + stagger tipis */}
      <div className="relative mt-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={`${year}-${month}`}
            initial={motionOK ? { opacity: 0, x: 26 * dir } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={motionOK ? { opacity: 0, x: -26 * dir } : { opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label={`Kalender ${monthLabel}`}
          >
            {cells.map((k, i) => {
              if (!k) return <span key={`e${i}`} aria-hidden />;
              const n = notes[k];
              const has = !!n?.cats.length;
              const isSel = selected === k;
              const isToday = k === today;
              const day = parseInt(k.slice(8), 10);
              return (
                <m.button
                  key={k}
                  type="button"
                  role="gridcell"
                  aria-selected={isSel}
                  aria-label={`${formatDayFull(k)}${has ? `, ${n.cats.length} catatan jurnal` : ""}`}
                  onClick={() => onSelect(k)}
                  initial={motionOK ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: motionOK ? Math.min(i * 0.012, 0.3) : 0 }}
                  className={cn(
                    "tap relative flex h-[44px] flex-col items-center justify-center rounded-[0.85rem] text-[12.5px] font-semibold transition-colors",
                    isSel
                      ? "gs-ink-btn shadow-[0_8px_18px_-8px_rgba(255,90,0,0.6)]"
                      : has
                        ? "text-tk-ink hover:bg-tk-panel-soft"
                        : "text-tk-muted hover:bg-tk-panel-soft"
                  )}
                >
                  <span className={cn("tnum leading-none", isToday && !isSel && "font-bold text-tk-accent")}>{day}</span>
                  {/* Indikator kategori: maksimal 4 titik (satu per kategori) */}
                  {has ? (
                    <span className="mt-1 flex items-center gap-[3px]" aria-hidden>
                      {n.cats.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="block h-[4px] w-[4px] rounded-full"
                          style={{ background: isSel ? "rgba(255,255,255,0.9)" : CAT_DOT[c] }}
                        />
                      ))}
                    </span>
                  ) : null}
                  {isToday && !isSel ? <span aria-hidden className="absolute inset-0 rounded-[0.85rem] ring-1 ring-tk-accent/50" /> : null}
                </m.button>
              );
            })}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Legenda kecil */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-tk-line-soft pt-2.5">
        {(["refleksi", "emosi", "syukur", "harapan"] as NoteCat[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-[9.5px] font-semibold text-tk-muted">
            <span className="block h-[5px] w-[5px] rounded-full" style={{ background: CAT_DOT[c] }} aria-hidden />
            {catShort(c)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===================== Sheet detail tanggal ===================== */

export interface SheetEntry {
  cat: NoteCat;
  date: string;
  title: string;
  snippet: string;
  timeLabel: string;
  mood?: string;
}

export function DateDetailSheet({
  date,
  entries,
  motionOK,
  onClose,
  onRead,
  onEdit,
  onDelete,
  onStartWriting,
}: {
  date: string;
  entries: SheetEntry[];
  motionOK: boolean;
  onClose: () => void;
  onRead: (e: SheetEntry) => void;
  onEdit: (e: SheetEntry) => void;
  onDelete: (e: SheetEntry) => void;
  onStartWriting: () => void;
}) {
  const title = `Catatan ${new Date(date + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}`;
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[72] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" />
      <m.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="relative z-10 max-h-[82dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[1.6rem] border border-tk-line bg-tk-stage px-5 pb-[max(1.4rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-tk-line-strong" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[17px] font-bold tracking-[-0.015em] text-tk-ink">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel catatan"
            className="tap flex h-9 w-9 items-center justify-center rounded-full border border-tk-line-strong text-tk-ink"
          >
            <X size={16} />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-9 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tk-lavender text-tk-violet dark:bg-tk-accent/12 dark:text-tk-accent">
              <CalendarDays size={20} />
            </span>
            <p className="mt-2 font-display text-[15px] font-bold text-tk-ink">Belum ada cerita hari ini.</p>
            <p className="max-w-[260px] text-[12px] leading-relaxed text-tk-muted">
              Luangkan waktu sebentar untuk menuliskan apa yang kamu rasakan.
            </p>
            <button
              type="button"
              onClick={onStartWriting}
              className="tap gs-ink-btn mt-3 flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[13px] font-bold"
            >
              <PenLine size={15} /> Mulai Menulis
            </button>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5 pb-2">
            {entries.map((e, i) => (
              <m.li
                key={`${e.cat}-${e.date}`}
                initial={motionOK ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: motionOK ? i * 0.05 : 0 }}
                className="rounded-[1.1rem] border border-tk-line bg-tk-panel p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.06em]"
                    style={{ background: `${CAT_DOT[e.cat]}1A`, color: CAT_DOT[e.cat] }}
                  >
                    <span className="block h-[6px] w-[6px] rounded-full" style={{ background: CAT_DOT[e.cat] }} aria-hidden />
                    {catShort(e.cat)}
                  </span>
                  <span className="tnum shrink-0 text-[10px] font-medium text-tk-muted">{e.timeLabel}</span>
                </div>
                <p className="mt-2 truncate font-display text-[13.5px] font-bold text-tk-ink">{e.title}</p>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-tk-muted">{e.snippet}</p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRead(e)}
                    className="tap flex h-8 items-center rounded-full gs-ink-btn px-3 text-[10.5px] font-bold"
                  >
                    Baca
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    className="tap flex h-8 items-center rounded-full border border-tk-line-strong bg-tk-panel-soft px-3 text-[10.5px] font-bold text-tk-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(e)}
                    className="tap ml-auto flex h-8 items-center rounded-full px-3 text-[10.5px] font-bold text-[#E5484D] transition-colors hover:bg-[#E5484D]/10"
                  >
                    Hapus
                  </button>
                </div>
              </m.li>
            ))}
          </ul>
        )}
      </m.div>
    </m.div>
  );
}

/* ===================== Sheet pemilih kategori ===================== */

export function CategoryPickSheet({
  date,
  motionOK,
  onPick,
  onClose,
}: {
  date: string;
  motionOK: boolean;
  onPick: (cat: NoteCat) => void;
  onClose: () => void;
}) {
  const items: { cat: NoteCat; label: string; desc: string }[] = [
    { cat: "refleksi", label: journalCatMeta("refleksi").label, desc: "Evaluasi hari, temukan pelajarannya" },
    { cat: "emosi", label: journalCatMeta("emosi").label, desc: "Kenali perasaan, terima diri" },
    { cat: "syukur", label: "Jurnal Syukur", desc: "Tiga hal kecil yang layak disyukuri" },
    { cat: "harapan", label: journalCatMeta("harapan").label, desc: "Harapan, doa, dan ikhtiar nyata" },
  ];
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[73] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih kategori jurnal"
    >
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" />
      <m.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="relative z-10 w-full max-w-[430px] rounded-t-[1.6rem] border border-tk-line bg-tk-stage px-5 pb-[max(1.4rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-tk-line-strong" aria-hidden />
        <p className="font-display text-[16px] font-bold text-tk-ink">Tulis jurnal</p>
        <p className="mt-0.5 text-[11.5px] text-tk-muted">
          {new Date(date + "T12:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} — pilih kategori
        </p>
        <div className="mt-3.5 grid grid-cols-2 gap-2 pb-2">
          {items.map((it, i) => (
            <m.button
              key={it.cat}
              type="button"
              onClick={() => onPick(it.cat)}
              initial={motionOK ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: motionOK ? i * 0.045 : 0 }}
              className="tap flex flex-col items-start gap-1 rounded-[1.1rem] border border-tk-line bg-tk-panel p-3 text-left transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${CAT_DOT[it.cat]}1A` }}>
                <span className="block h-2.5 w-2.5 rounded-full" style={{ background: CAT_DOT[it.cat] }} aria-hidden />
              </span>
              <span className="font-display text-[12px] font-bold leading-tight text-tk-ink">{it.label}</span>
              <span className="text-[10px] leading-snug text-tk-muted">{it.desc}</span>
            </m.button>
          ))}
        </div>
      </m.div>
    </m.div>
  );
}
