"use client";

/**
 * SUIO — Weekly Reflection (Refleksi Ibadah Mingguan).
 *
 * Dua bagian:
 * 1. WeeklyReflectionCard — kartu apresiasi premium di halaman Progress:
 *    dasar warm ivory (terang) / warm charcoal (gelap), aksen orange SUIO,
 *    ornamen geometris halus, ringkasan metrik minggu berjalan (LIVE dari
 *    catatan), grafik mini Senin–Minggu.
 * 2. WeeklyReflectionSheet — pengalaman "Animated Journal Opening": panel
 *    naik, sampul jurnal membuka (rotateY), konten masuk staggered, grafik
 *    & statistik bertahap, ornamen mengapung halus. Semua animasi hanya
 *    transform & opacity; berhenti total saat ditutup (unmount) dan
 *    dihormati setelan "Animasi transisi" + prefers-reduced-motion.
 *
 * Ketenangan data:
 * - Minggu berjalan = hitungan live (bagian yang belum berlalu belum dinilai).
 * - Minggu berakhir = snapshot tersimpan (weeklyReflections) — membuka
 *   laporan lama TIDAK mengubah isinya.
 * - "Belum dicatat" selalu dibedakan dari "tidak dilaksanakan".
 */

import { useEffect, useMemo, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Award, BookHeart, BookOpen, ChevronLeft, ChevronRight, CircleDot, HandCoins, MoonStar, Sparkles, Target } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { WeeklyReflectionReport } from "@/lib/tazkiya/types";
import { buildWeeklyReport, weekRangeLabel } from "@/lib/tazkiya/weekly";
import { mondayOf, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

/* ---------------- Hook laporan ---------------- */

/** Laporan live untuk satu minggu (dihitung ulang saat data berubah). */
export function useWeeklyLiveReport(weekStart: string, today: string): WeeklyReflectionReport {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const settings = useWorshipStore((s) => s.settings);
  const journal = useWorshipStore((s) => s.journal);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);

  return useMemo(
    () =>
      buildWeeklyReport(
        { logs, prayerDetails, settings, journal, amalEntries, zikirSessions, today },
        weekStart
      ),
    [logs, prayerDetails, settings, journal, amalEntries, zikirSessions, today, weekStart]
  );
}

/* ---------------- Kartu apresiasi (Progress) ---------------- */

/** Chip ringkasan kecil di kartu. */
function MiniStat({ icon: Icon, label, value }: { icon: typeof MoonStar; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/55 px-2.5 py-1.5 dark:bg-white/8">
      <Icon size={12} className="shrink-0 text-tk-accent" aria-hidden />
      <span className="tnum truncate text-[10.5px] font-bold text-[#4A3A28] dark:text-[#E8D8C4]">{value}</span>
      <span className="truncate text-[9.5px] font-medium text-[#4A3A28]/60 dark:text-[#E8D8C4]/55">{label}</span>
    </div>
  );
}

export function WeeklyReflectionCard({ onOpen }: { onOpen: () => void }) {
  const today = todayKey();
  const weekStart = mondayOf(today);
  const report = useWeeklyLiveReport(weekStart, today);
  const viewedAt = useWorshipStore((s) => s.reflectionViewed[weekStart]);
  const archivedCount = useWorshipStore((s) => Object.keys(s.weeklyReflections).length);
  const animationsOn = useWorshipStore((s) => s.settings.animations);

  const isSunday = new Date().getDay() === 0;
  const isNew = !viewedAt && (isSunday || archivedCount > 0);

  const days = report.days;
  const pct = report.prayers.pct;

  return (
    <m.button
      type="button"
      onClick={onOpen}
      aria-label="Buka refleksi ibadah mingguan"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={animationsOn ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      className="tap relative block w-full overflow-hidden rounded-[1.6rem] border text-left shadow-[0_20px_50px_-24px_rgba(120,60,10,0.35)] active:scale-[0.99] dark:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)]"
      style={{ borderColor: "rgba(255,122,40,0.25)" }}
    >
      {/* Dasar warm ivory / warm charcoal */}
      <div className="absolute inset-0 bg-[#FFF8EE] dark:bg-[#2B2521]" aria-hidden />
      {/* Polesan hangat + ornamen geometris minimalis */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,60,0.14), transparent 55%), radial-gradient(90% 70% at 0% 100%, rgba(255,170,90,0.10), transparent 60%)",
        }}
      />
      <div aria-hidden className="tk-geo-pattern absolute -right-10 -top-10 h-44 w-44 opacity-[0.10]" />
      <span aria-hidden className="tk-octagram absolute -bottom-7 -left-7 h-32 w-32 bg-[#FF8A3C]/10 dark:bg-[#FF9A52]/10" />

      <div className="relative p-5">
        {/* Kepala: lencana + status */}
        <div className="flex items-start justify-between gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <span aria-hidden className="tk-octagram absolute inset-0 bg-[#FF8A3C]/25 dark:bg-[#FF9A52]/20" />
            <span aria-hidden className="tk-octagram absolute inset-[2px] bg-gradient-to-br from-[#FF8A3C] to-[#E04E00]" />
            <Award size={20} className="relative text-white" aria-hidden />
          </span>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C65A10] dark:text-[#FF9A52]">
              Weekly Reflection
            </span>
            {isNew ? (
              <span className="rounded-full bg-[#E04E00] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                {isSunday ? "Siap dievaluasi" : "Laporan minggu lalu"}
              </span>
            ) : null}
          </div>
        </div>

        {/* Headline + subheadline */}
        <h2 className="gs-display mt-3.5 text-[21px] font-bold leading-tight tracking-[-0.02em] text-[#33261A] dark:text-[#F6EEE3]">
          Perjalanan Baikmu Minggu Ini
        </h2>
        <p className="mt-1.5 max-w-[300px] text-[11.5px] leading-relaxed text-[#6B5442] dark:text-[#B8A795]">
          Setiap usaha kecil layak dihargai. Mari lihat perjalanan ibadahmu selama tujuh hari terakhir.
        </p>

        {/* Grafik mini 7 hari + persentase */}
        <div className="mt-4 flex items-end gap-2.5">
          <div className="flex h-[52px] min-w-0 flex-1 items-end gap-[5px]" aria-hidden>
            {days.map((d) => {
              const h = Math.round((d.done / 5) * 100);
              const future = d.slots === 0 && d.done === 0;
              return (
                <span
                  key={d.date}
                  className="min-w-0 flex-1 overflow-hidden rounded-full bg-[#EAD9C4]/70 transition-[height] duration-500 dark:bg-white/10"
                  style={{
                    height: future ? "7%" : `${Math.max(8, h)}%`,
                    background: future
                      ? undefined
                      : h >= 100
                        ? "linear-gradient(180deg,#FF8A3C,#E04E00)"
                        : "linear-gradient(180deg,#FFAF6E,#F07020)",
                  }}
                />
              );
            })}
          </div>
          <div className="shrink-0 text-right">
            <p className="tnum gs-display text-[24px] font-bold leading-none text-[#33261A] dark:text-[#F6EEE3]">{pct}%</p>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#6B5442]/70 dark:text-[#B8A795]/70">salat terlaksana</p>
          </div>
        </div>
        <p className="mt-1 text-[9.5px] font-medium text-[#6B5442]/70 dark:text-[#B8A795]/70">
          {weekRangeLabel(weekStart)} · batang = salat terlaksana per hari
        </p>

        {/* Ringkasan metrik (hanya yang tersedia di aplikasi) */}
        <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-[#F0DCC6]/80 pt-3.5 dark:border-white/8">
          <MiniStat icon={MoonStar} label="salat" value={`${report.prayers.done}×`} />
          <MiniStat icon={Target} label="berjamaah" value={`${report.prayers.jamaah}×`} />
          <MiniStat icon={Sparkles} label="hari aktif" value={`${report.activeDays} hari`} />
          <MiniStat icon={CircleDot} label="zikir" value={report.zikirTotal.toLocaleString("id-ID")} />
          <MiniStat icon={BookOpen} label="qur'an" value={`${report.quranPages.toLocaleString("id-ID")} hlm`} />
          <MiniStat icon={HandCoins} label="amal" value={`${report.amalCount}×`} />
          <MiniStat icon={BookHeart} label="jurnal" value={`${report.journalCount} hari`} />
        </div>

        <p className="mt-3.5 flex items-center gap-1 text-[10.5px] font-bold text-[#C65A10] dark:text-[#FF9A52]">
          <ChevronRight size={12} aria-hidden />
          Ketuk untuk membuka refleksi mingguan
        </p>
      </div>
    </m.button>
  );
}

/* ---------------- Bagian konten detail ---------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="gs-overline">{children}</p>;
}

/** Grafik batang Senin–Minggu dengan pembedaan tegas: terlewat vs belum dicatat. */
function WeekPrayerChart({ report, today }: { report: WeeklyReflectionReport; today: string }) {
  return (
    <div>
      <div className="flex h-[92px] items-end justify-between gap-1.5">
        {report.days.map((d, idx) => {
          const total = Math.max(1, d.slots);
          const doneH = (d.done / 5) * 100;
          const missedH = (d.missed / 5) * 100;
          const unrecH = (d.unrecorded / 5) * 100;
          const elapsed = d.slots > 0;
          return (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
              <span className={cn("tnum text-[9px] font-bold", d.date === today ? "text-tk-ink" : "text-tk-muted/70")}>
                {elapsed && d.done > 0 ? d.done : ""}
              </span>
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div
                  className="mx-auto flex h-full w-full max-w-[24px] flex-col justify-end overflow-hidden rounded-full bg-tk-panel-soft"
                  style={{ transitionDelay: `${idx * 40}ms` }}
                >
                  {!elapsed ? (
                    <span className="w-full border-t border-dashed border-tk-line-strong" aria-hidden />
                  ) : (
                    <span className="flex w-full flex-col justify-end" style={{ height: `${Math.max(6, doneH + missedH + unrecH)}%` }}>
                      {doneH > 4 ? <span className="w-full shrink-0 bg-tk-violet" style={{ height: `${(doneH / Math.max(doneH + missedH + unrecH, 0.01)) * 100}%` }} /> : null}
                      {missedH > 4 ? <span className="w-full shrink-0 bg-tk-amber/60" style={{ height: `${(missedH / Math.max(doneH + missedH + unrecH, 0.01)) * 100}%` }} /> : null}
                      {unrecH > 4 ? <span className="w-full shrink-0 border-t border-dashed border-tk-line-strong bg-tk-track" style={{ height: `${(unrecH / Math.max(doneH + missedH + unrecH, 0.01)) * 100}%` }} /> : null}
                    </span>
                  )}
                </div>
              </div>
              <span className={cn("text-[9px] leading-none", d.date === today ? "font-bold text-tk-ink" : "text-tk-muted")}>
                {weekdayShort(d.date)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-tk-muted">
        <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full bg-tk-violet" /> Terlaksana</span>
        <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full bg-tk-amber/60" /> Tercatat tidak dilaksanakan</span>
        <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full border border-dashed border-tk-line-strong" /> Belum dicatat (bukan terlewat)</span>
      </div>
    </div>
  );
}

/** Linimasa aktivitas Senin–Minggu: progress harian + indikator + penanda. */
function WeekTimeline({ report, today }: { report: WeeklyReflectionReport; today: string }) {
  const logs = useWorshipStore((s) => s.logs);
  return (
    <ol className="space-y-1.5">
      {report.days.map((d) => {
        const log = logs[d.date];
        const pctDay = d.slots > 0 ? Math.round((d.done / 5) * 100) : 0;
        const perfect = d.slots === 5 && d.done === 5;
        const zikirOn = (log?.zikirCount ?? 0) > 0;
        const quranOn = (log?.quranPages ?? 0) > 0 || (log?.quranVerses ?? 0) > 0;
        return (
          <li
            key={d.date}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2",
              d.date === today ? "bg-tk-lavender dark:bg-tk-accent/10" : "bg-tk-panel-soft"
            )}
          >
            <span className={cn("w-9 shrink-0 text-[10.5px] font-bold", d.date === today ? "text-tk-accent" : "text-tk-muted")}>
              {weekdayShort(d.date)}
              <span className="tnum block text-[8.5px] font-semibold opacity-75">{d.date.slice(-2)}</span>
            </span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-tk-track">
              <span
                className={cn("block h-full rounded-full transition-[width] duration-500", perfect ? "bg-tk-green" : "bg-tk-violet")}
                style={{ width: `${d.slots > 0 ? Math.max(4, pctDay) : 0}%` }}
              />
            </span>
            <span className="tnum w-10 shrink-0 text-right text-[10px] font-bold text-tk-ink/85">
              {d.slots > 0 ? `${d.done}/${d.slots}` : "—"}
            </span>
            <span className="flex shrink-0 items-center gap-1" aria-hidden>
              <span className={cn("h-1.5 w-1.5 rounded-full", zikirOn ? "bg-tk-lime-ink dark:bg-tk-lime" : "bg-tk-line-strong")} title="Zikir" />
              <span className={cn("h-1.5 w-1.5 rounded-full", quranOn ? "bg-tk-blue" : "bg-tk-line-strong")} title="Al-Qur'an" />
              {perfect ? <span className="text-[10px]" title="Hari lengkap">⭐</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Sheet refleksi (Animated Journal Opening) ---------------- */

const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const itemV = (motionOK: boolean) => ({
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: motionOK ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } : { duration: 0 } },
});

export function WeeklyReflectionSheet({
  weekStart,
  onClose,
}: {
  weekStart: string;
  onClose: () => void;
}) {
  const weeklyReflections = useWorshipStore((s) => s.weeklyReflections);
  const reflectionViewed = useWorshipStore((s) => s.reflectionViewed);
  const markViewed = useWorshipStore((s) => s.markReflectionViewed);
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const reduceMotion = useReducedMotion();
  const motionOK = animationsOn && !reduceMotion;

  const today = todayKey();
  const currentWeek = mondayOf(today);
  const [selected, setSelected] = useState(weekStart);
  const [coverGone, setCoverGone] = useState(!motionOK);

  // Sampul jurnal membuka otomatis setelah panel naik.
  useEffect(() => {
    if (!motionOK) return;
    const t = window.setTimeout(() => setCoverGone(true), 1150);
    return () => window.clearTimeout(t);
  }, [motionOK]);

  // Laporan: snapshot bila tersedia, selain itu hitungan live (minggu berjalan).
  const snapshot = weeklyReflections[selected];
  const live = useWeeklyLiveReport(selected, today);
  const report = snapshot ?? live;
  const isLive = !snapshot;

  // Daftar minggu untuk navigasi riwayat: minggu berjalan + semua arsip, terbaru dulu.
  const weeks = useMemo(() => {
    const set = new Set<string>([currentWeek, ...Object.keys(weeklyReflections), weekStart]);
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [weeklyReflections, currentWeek, weekStart]);
  const idx = Math.max(0, weeks.indexOf(selected));

  const elapsed = report.prayers.opportunities;
  const praise = isLive && report.prayers.done > 0 && elapsed > 0 && report.prayers.done === elapsed;

  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="Refleksi ibadah mingguan">
      {/* Latar gelap + blur ringan */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: motionOK ? 0.3 : 0 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel jurnal */}
      <m.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={motionOK ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        className="absolute inset-x-0 bottom-0 mx-auto flex h-[93dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[1.9rem] bg-tk-stage shadow-[0_-24px_70px_-20px_rgba(0,0,0,0.65)]"
        style={{ perspective: 1200 }}
      >
        {/* Sampul jurnal — membuka (rotateY) lalu hilang */}
        {!coverGone ? (
          <m.div
            initial={{ rotateY: 0, opacity: 1 }}
            animate={{ rotateY: motionOK ? -108 : 0, opacity: motionOK ? [1, 1, 0.9, 0] : 0 }}
            transition={motionOK ? { duration: 1.0, times: [0, 0.55, 0.85, 1], ease: [0.45, 0, 0.2, 1] } : { duration: 0.01 }}
            onAnimationComplete={() => setCoverGone(true)}
            className="absolute inset-0 z-20 origin-left bg-[#FFF8EE] dark:bg-[#2B2521]"
            style={{ backfaceVisibility: "hidden" }}
            aria-hidden
          >
            <div aria-hidden className="tk-geo-pattern absolute inset-0 opacity-[0.08]" />
            <span aria-hidden className="tk-octagram absolute -right-10 top-24 h-44 w-44 bg-[#FF8A3C]/15 dark:bg-[#FF9A52]/10" />
            <span aria-hidden className="tk-octagram absolute -left-8 bottom-24 h-36 w-36 bg-[#FF8A3C]/10 dark:bg-[#FF9A52]/10" />
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="relative flex h-16 w-16 items-center justify-center">
                <span aria-hidden className="tk-octagram absolute inset-0 bg-[#FF8A3C]/25 dark:bg-[#FF9A52]/20" />
                <span aria-hidden className="tk-octagram absolute inset-[2.5px] bg-gradient-to-br from-[#FF8A3C] to-[#E04E00]" />
                <Award size={26} className="relative text-white" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#C65A10] dark:text-[#FF9A52]">Weekly Reflection</p>
                <p className="gs-display mt-2 text-[24px] font-bold tracking-[-0.02em] text-[#33261A] dark:text-[#F6EEE3]">
                  Refleksi Mingguan
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-[#6B5442] dark:text-[#B8A795]">
                  {weekRangeLabel(selected)}
                </p>
              </div>
              <span className="mt-2 flex h-0.5 w-14 rounded-full bg-[#E04E00]/60 dark:bg-[#FF9A52]/50" />
            </div>
          </m.div>
        ) : null}

        {/* Kepala panel: navigasi riwayat minggu */}
        <div className="flex items-center gap-2 px-4 pb-2 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Minggu sebelumnya"
            disabled={idx >= weeks.length - 1}
            onClick={() => idx < weeks.length - 1 && setSelected(weeks[idx + 1])}
            className={cn(
              "tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tk-panel-soft text-tk-muted",
              idx >= weeks.length - 1 && "opacity-30"
            )}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13.5px] font-bold text-tk-ink">{weekRangeLabel(selected)}</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-tk-muted">
              {selected === currentWeek ? "Minggu berjalan" : "Laporan tersimpan"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Minggu berikutnya"
            disabled={idx <= 0}
            onClick={() => idx > 0 && setSelected(weeks[idx - 1])}
            className={cn(
              "tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tk-panel-soft text-tk-muted",
              idx <= 0 && "opacity-30"
            )}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            aria-label="Tutup refleksi mingguan"
            onClick={() => {
              markViewed(selected);
              onClose();
            }}
            className="tap ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tk-panel-soft text-tk-muted"
          >
            <XIcon />
          </button>
        </div>

        {/* Isi */}
        <m.div
          variants={containerV}
          initial="hidden"
          animate="show"
          className="thin-scrollbar flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1.4rem,env(safe-area-inset-bottom))]"
          key={selected}
        >
          {/* 1. YOUR WEEKLY JOURNEY */}
          <m.section variants={itemV(motionOK)} className="glass rounded-[1.4rem] p-4">
            <SectionTitle>Your Weekly Journey</SectionTitle>
            <p className="mt-2 text-[13px] leading-relaxed text-tk-ink/90">
              {elapsed > 0 ? (
                <>
                  Selama minggu ini, kamu berhasil mencatat{" "}
                  <b className="tnum">{report.prayers.done}</b> dari{" "}
                  <b className="tnum">{elapsed}</b> waktu salat yang sudah berlalu
                  {report.prayers.jamaah > 0 ? (
                    <>
                      {" "}— <b className="tnum">{report.prayers.jamaah}</b> di antaranya berjamaah
                    </>
                  ) : null}
                  .
                </>
              ) : (
                <>Periode ini masih di awal — belum ada waktu salat yang sudah berlalu untuk dinilai.</>
              )}{" "}
              {report.activeDays > 0 ? (
                <>
                  Ada <b className="tnum">{report.activeDays}</b> hari dengan catatan ibadah sepanjang{" "}
                  {weekRangeLabel(selected)}.
                </>
              ) : (
                <>Belum ada catatan ibadah pada minggu ini — bukan masalah, setiap hari adalah awal baru.</>
              )}
            </p>
          </m.section>

          {/* 2. PRAYER OVERVIEW */}
          <m.section variants={itemV(motionOK)} className="glass rounded-[1.4rem] p-4">
            <SectionTitle>Prayer Overview</SectionTitle>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { v: report.prayers.done, l: "terlaksana", c: "text-tk-ink" },
                { v: report.prayers.jamaah, l: "berjamaah", c: "text-tk-accent" },
                { v: report.prayers.missed, l: "tidak dilaksanakan", c: "text-tk-amber" },
                { v: report.prayers.unrecorded, l: "belum dicatat", c: "text-tk-muted" },
              ].map(({ v, l, c }) => (
                <div key={l} className="rounded-2xl bg-tk-panel-soft px-1 py-2.5">
                  <p className={cn("tnum gs-display text-[19px] font-bold leading-none", c)}>{v}</p>
                  <p className="mt-1 text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] text-tk-muted">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-tk-panel-soft px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-tk-muted">Progres salat mingguan</p>
              <p className="tnum text-[13px] font-bold text-tk-ink">
                {report.prayers.pct}%
                <span className="ml-1 text-[9.5px] font-medium text-tk-muted">dari slot berlalu</span>
              </p>
            </div>
            <div className="mt-3">
              <WeekPrayerChart report={report} today={today} />
            </div>
          </m.section>

          {/* 3. BEST HABIT */}
          <m.section variants={itemV(motionOK)} className="glass rounded-[1.4rem] p-4">
            <SectionTitle>Best Habit of the Week</SectionTitle>
            {report.bestHabit ? (
              <div className="mt-2.5 flex items-start gap-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                  <span aria-hidden className="tk-octagram absolute inset-0 bg-[#FF8A3C]/20 dark:bg-[#FF9A52]/15" />
                  <span aria-hidden className="tk-octagram absolute inset-[2px] bg-gradient-to-br from-[#FF8A3C] to-[#E04E00]" />
                  <Award size={16} className="relative text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-tk-ink">
                    {report.bestHabit.label} menjadi kebiasaan terbaikmu minggu ini.
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-tk-muted">
                    Berdasarkan catatanmu: {report.bestHabit.reason}.
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12px] leading-relaxed text-tk-muted">
                Belum ada kebiasaan yang bisa disorot minggu ini. Mulai dari satu aktivitas kecil — satu salat yang dicatat pun sudah berarti.
              </p>
            )}
          </m.section>

          {/* 4. AREA TO IMPROVE — lembut, tidak menghakimi */}
          <m.section variants={itemV(motionOK)} className="glass rounded-[1.4rem] p-4">
            <SectionTitle>Area to Improve</SectionTitle>
            {report.improveArea ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-tk-ink/90">
                <span aria-hidden className="mr-1">🌱</span>
                {report.improveArea.text}
              </p>
            ) : praise ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-tk-ink/90">
                <span aria-hidden className="mr-1">🌿</span>
                Semua waktu salat yang sudah berlalu tercatat dilaksanakan — tidak ada area yang perlu disorot minggu ini. Jaga yang sudah baik ini pelan-pelan.
              </p>
            ) : (
              <p className="mt-2 text-[12.5px] leading-relaxed text-tk-muted">
                Belum cukup data untuk menyorot area tertentu — dan itu tidak apa-apa. Catatan salat berikutnya akan membantu evaluasi yang lebih dekat dengan harimu.
              </p>
            )}
          </m.section>

          {/* 5. WORSHIP ACTIVITY TIMELINE */}
          <m.section variants={itemV(motionOK)} className="glass rounded-[1.4rem] p-4">
            <SectionTitle>Worship Activity Timeline</SectionTitle>
            <p className="mb-2.5 mt-1 text-[10.5px] leading-snug text-tk-muted">
              Senin sampai Minggu · bar = salat terlaksana · titik hijau = zikir, biru = Al-Qur&apos;an · ⭐ = hari lengkap
            </p>
            <WeekTimeline report={report} today={today} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { v: report.activeDays, l: "hari aktif" },
                { v: report.zikirTotal.toLocaleString("id-ID"), l: "total zikir" },
                { v: `${report.quranPages.toLocaleString("id-ID")} hlm`, l: `qur'an · ${report.quranDays} hari` },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-2xl bg-tk-panel-soft px-1 py-2.5">
                  <p className="tnum text-[15px] font-bold leading-none text-tk-ink">{v}</p>
                  <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.06em] text-tk-muted">{l}</p>
                </div>
              ))}
            </div>
          </m.section>

          {/* 6. WEEKLY MOTIVATION */}
          <m.section variants={itemV(motionOK)} className="relative overflow-hidden rounded-[1.4rem] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF8A3C]/12 to-transparent dark:from-[#FF9A52]/10" aria-hidden />
            <div className="relative">
              <SectionTitle>Weekly Motivation</SectionTitle>
              <p className="mt-2 text-[13px] leading-relaxed text-tk-ink/90">&ldquo;{report.motivation}&rdquo;</p>
            </div>
          </m.section>

          {/* Keterangan sumber data */}
          <m.p variants={itemV(motionOK)} className="px-2 pb-1 text-center text-[9.5px] leading-relaxed text-tk-muted/70">
            Laporan dihitung langsung dari catatan ibadahmu
            {isLive ? " dan akan disimpan otomatis setelah minggu berakhir." : " pada saat minggu tersebut berakhir — isinya tersimpan dan tidak berubah."}
          </m.p>
        </m.div>
      </m.div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
