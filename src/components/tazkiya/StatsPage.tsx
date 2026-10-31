"use client";

/**
 * Tazkiya — Halaman Statistik.
 * Semua angka dihitung dari catatan pengguna (store), bukan data acak.
 */

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Flame,
  Trophy,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  activityCounts,
  computeStreak,
  dayScore,
  elapsedPrayerSlots,
  monthCalendar,
  monthLabel,
  monthRange,
  prayerConsistency,
  summarizeRange,
  weekdayLabels,
  seriesLastDays,
} from "@/lib/tazkiya/stats";
import {
  PRAYERS,
  PRAYER_IDS,
  SALAT_JUMAT,
  ZUHUR_ALTERNATIF,
  missReasonLabel,
  selectPrayerDetail,
  type PrayerId,
} from "@/lib/tazkiya/types";
import { addDays, formatDayFull, isFriday, formatDayMonth, keyToDate, lastNDays, mondayOf, relativeDayLabel, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { Chip, GlassCard, IconBox, ProgressBar, SectionHeader } from "./ui-bits";
import { cn } from "@/lib/utils";

type Period = "mingguan" | "bulanan";

const DAY_LABELS = weekdayLabels();

/** Angka beranimasi halus (naik/turun singkat) — hormati setelan gerak pengguna. */
function useCountUp(target: number, duration = 550): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target) return;
    const reduce =
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset.anim === "off");
    // Mode kurangi-gerak: tetap lewat rAF (tanpa setState langsung), durasi nyaris nol.
    const dur = reduce ? 1 : duration;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Label rentang minggu: "26–31 Okt 2026" atau "26 Okt – 1 Nov 2026". */
function weekRangeLabel(mondayKey: string): string {
  const a = keyToDate(mondayKey);
  const b = keyToDate(addDays(mondayKey, 6));
  if (a.getMonth() === b.getMonth())
    return `${a.getDate()}–${b.getDate()} ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
}

/** Meta salat sesuai slot pada tanggal tertentu (Jumat → Salat Jumat). */
function prayerMetaFor(date: string, id: PrayerId, fridayAlt: boolean) {
  if (id === "zuhur" && isFriday(date)) return fridayAlt ? ZUHUR_ALTERNATIF : SALAT_JUMAT;
  return PRAYERS.find((p) => p.id === id) ?? PRAYERS[0];
}

/** Sheet rincian satu tanggal: salat, bacaan, dan zikir dari data asli. */
function DayDetailSheet({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt);
  const log = logs[date];
  const hasLog = !!log;
  const hasDetails = !!prayerDetails[date];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="glass-strong fixed! top-auto bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 translate-y-0 gap-3 overflow-y-auto rounded-t-[1.65rem] rounded-b-none border-x-0 border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_-12px_rgba(8,5,15,0.8)] duration-250 thin-scrollbar data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8"
      >
        <span aria-hidden className="mx-auto mb-0.5 block h-1 w-10 shrink-0 rounded-full bg-tz-line-strong/70" />
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-tz-ink">Rincian {relativeDayLabel(date)}</DialogTitle>
          <p className="flex items-center gap-1.5 text-[11.5px] text-tz-muted">
            <CalendarDays size={12} className="text-tz-violet" />
            {formatDayFull(date)}
          </p>
        </DialogHeader>

        {!hasLog && !hasDetails ? (
          <p className="rounded-2xl border border-tz-line bg-tz-panel-soft p-4 text-center text-[12px] leading-relaxed text-tz-muted">
            Belum ada catatan aktivitas pada tanggal ini.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Salat wajib</p>
              {PRAYERS.map((p) => {
                const meta = prayerMetaFor(date, p.id, !!fridayZuhurAlt?.[date]);
                const d = selectPrayerDetail(prayerDetails, logs, date, p.id);
                const statusText =
                  d.status === "done"
                    ? d.kind === "berjamaah"
                      ? "Dilaksanakan — berjamaah"
                      : d.kind === "mandiri"
                        ? "Dilaksanakan — mandiri"
                        : "Dilaksanakan"
                    : d.status === "missed"
                      ? `Tidak dilaksanakan${d.reason ? ` — ${missReasonLabel(d.reason)}` : ""}${
                          d.reason === "lainnya" && d.reasonText ? `: ${d.reasonText}` : ""
                        }`
                      : "Belum dicatat";
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-tz-line bg-tz-panel-soft px-3 py-2"
                  >
                    <p className="min-w-0 truncate text-[12px] font-semibold text-tz-ink">{meta.label}</p>
                    <p
                      className={cn(
                        "shrink-0 text-right text-[10.5px]",
                        d.status === "done"
                          ? "text-tz-accent"
                          : d.status === "missed"
                            ? "text-rose-500 light:text-rose-600"
                            : "text-tz-muted/70"
                      )}
                    >
                      {statusText}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-tz-line bg-tz-panel-soft p-2.5">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">
                  <BookOpen size={12} className="text-tz-violet" /> Bacaan Al-Qur&apos;an
                </p>
                <p className="mt-1 text-[12px] font-semibold text-tz-ink">
                  {log && (log.quranPages > 0 || log.quranVerses > 0)
                    ? `${log.quranPages.toLocaleString("id-ID")} halaman · ${log.quranVerses.toLocaleString("id-ID")} ayat`
                    : "Belum ada catatan"}
                </p>
              </div>
              <div className="rounded-xl border border-tz-line bg-tz-panel-soft p-2.5">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">
                  <CircleDot size={12} className="text-tz-violet" /> Zikir
                </p>
                <p className="mt-1 text-[12px] font-semibold text-tz-ink">
                  {log && log.zikirCount > 0 ? `${log.zikirCount.toLocaleString("id-ID")} hitungan` : "Belum ada catatan"}
                </p>
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="tap mt-1 min-h-[42px] w-full rounded-xl border border-tz-line bg-tz-panel-soft px-4 text-sm font-semibold text-tz-muted"
        >
          Tutup
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function StatsPage() {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const settings = useWorshipStore((s) => s.settings);
  const tracked = useWorshipStore((s) => s.settings.trackedExtras);

  const today = todayKey();
  // Jadwal efektif untuk logika slot yang sudah berlalu: GPS bila otomatis, selain itu manual.
  const reminderTimes = resolvePrayerSchedule(settings, today);
  const [period, setPeriod] = useState<Period>("mingguan");
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [patternDay, setPatternDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [barsIn, setBarsIn] = useState(false);

  // Batang grafik tumbuh halus KIRI→KANAN sesudah mount (delay per kolom tanggal).
  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const todayScore = dayScore(logs[today], today, tracked);
  const streak = computeStreak(logs, today);

  const series = seriesLastDays(logs, period === "mingguan" ? 7 : 30, today, tracked);

  const keys = period === "mingguan" ? series.map((d) => d.date) : monthRange(today);
  const summary = summarizeRange(logs, keys, tracked);

  // Angka ringkasan beranimasi halus — nilai & rumus tetap dari data asli.
  const todayPct = useCountUp(todayScore.pct);
  const streakN = useCountUp(streak);
  const perfectN = useCountUp(summary.perfectDays);

  /** Pola minggu berjalan: Senin s.d. Minggu — terisi kiri→kanan mengikuti hari.
   *  Hari yang belum datang tampil kosong (dim), bukan menggeser riwayat ke kiri. */
  const monday = mondayOf(today);
  const pattern = prayerConsistency({
    prayerDetails,
    logs,
    dates: [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i)),
    today,
    reminderTimes,
  });
  const weekQuran = lastNDays(7, today).reduce(
    (acc, k) => ({ pages: acc.pages + (logs[k]?.quranPages ?? 0), verses: acc.verses + (logs[k]?.quranVerses ?? 0), zikir: acc.zikir + (logs[k]?.zikirCount ?? 0) }),
    { pages: 0, verses: 0, zikir: 0 }
  );

  const topActivities = (() => {
    const keysForRank = period === "mingguan" ? lastNDays(7, today) : monthRange(today);
    const result = activityCounts(logs, keysForRank, tracked);
    // Pada rentang yang memuat hari Jumat, Zuhur dapat digantikan Salat Jumat.
    if (keysForRank.some(isFriday)) {
      return result.map((a) => (a.id === "zuhur" ? { ...a, label: "Salat Zuhur / Jumat" } : a));
    }
    return result;
  })();
  const maxActivity = Math.max(1, ...topActivities.map((a) => a.count));

  // Kalender riwayat: status ibadah per tanggal dari data asli.
  // Warna = jenis pencatatan terbanyak/terbaik hari itu:
  //   teal (berjamaah) > biru (mandiri) > amber (ada yang terlewat);
  // tanpa data = abu netral (BUKAN hari gagal). Hari tanpa data sama
  // sekali tidak dihukum — tetap abu redup.
  const calendar = monthCalendar(today, monthOffset);

  /** Indikator satu tanggal dari catatan asli — dipakai kalender & strip mingguan. */
  const statusFor = (key: string) => {
    let jamaah = 0;
    let mandiri = 0;
    let missed = 0;
    for (const id of PRAYER_IDS) {
      const d = selectPrayerDetail(prayerDetails, logs, key, id);
      if (d.status === "done") {
        // Data lama (boolean) tanpa jenis pelaksanaan dihitung mandiri.
        if (d.kind === "berjamaah") jamaah++;
        else mandiri++;
      } else if (d.status === "missed") {
        missed++;
      }
    }
    return { jamaah, mandiri, missed, done: jamaah + mandiri, hasData: jamaah + mandiri > 0 || missed > 0 };
  };

  const calendarWithStatus = calendar.map((cell) => {
    if (!cell.key || cell.isFuture)
      return { ...cell, jamaah: 0, mandiri: 0, missed: 0, done: 0, hasData: false };
    return { ...cell, ...statusFor(cell.key) };
  });

  // Navigasi: mingguan menggeser minggu, bulanan menggeser bulan (maks = sekarang).
  const canGoNextMonth = monthOffset < 0;
  const canGoNextWeek = weekOffset < 0;
  const canGoNext = period === "mingguan" ? canGoNextWeek : canGoNextMonth;
  const calLabel = period === "mingguan" ? monthLabel(mondayOf(addDays(today, weekOffset * 7)), 0) : monthLabel(today, monthOffset);

  // Tampilan Mingguan: strip 7 hari (Senin–Minggu) — kronologis kiri→kanan.
  const weekStart = addDays(mondayOf(today), weekOffset * 7);
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const key = addDays(weekStart, i);
    return { key, isToday: key === today, isFuture: key > today, ...statusFor(key) };
  });

  // Ringkasan tanggal yang dipilih di kalender — dari catatan asli.
  const selFuture = selectedDate > today;
  const selStatus = statusFor(selectedDate);
  const selLog = logs[selectedDate];
  // "Belum dicatat" hanya dihitung dari slot yang SUDAH berlalu (hari ini: setelah waktu salat).
  const selSlots = selFuture ? 0 : selectedDate < today ? PRAYER_IDS.length : elapsedPrayerSlots(selectedDate, today, reminderTimes).length;
  const selUnrecorded = Math.max(0, selSlots - selStatus.done - selStatus.missed);

  return (
    <div className="space-y-6">
      {/* ---------- Judul ---------- */}
      <header className="animate-tz-fade-up flex items-end justify-between pt-1">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-gradient-violet">Statistik</h1>
          <p className="mt-1 text-sm text-tz-muted">Pantau konsistensi ibadahmu</p>
        </div>
      </header>

      {/* ---------- Ringkasan utama — kartu bersih ala dashboard modern (referensi Iconiy) ----------
        Permukaan solid + bayangan lembut, chip ikon tanpa border, angka besar tegas,
        hierarki label kecil → angka dominan → keterangan. Sematan warna: ungu = progres
        hari ini · amber = streak 5 salat · teal = hari sempurna.
        Angka besar dengan animasi hitung halus; rumus perhitungan TIDAK diubah. */}
      <section aria-label="Ringkasan utama" className="space-y-3">
        {/* Kartu utama — Progres Ibadah Hari Ini (aksen ungu Tazkiya) */}
        <GlassCard variant="clean" className="animate-tz-fade-up p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox className="shrink-0 border-transparent shadow-none">
                <Activity />
              </IconBox>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-tz-ink">Progres Ibadah Hari Ini</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-tz-muted">
                  {todayScore.done} dari {todayScore.total} ibadah terlaksana
                </p>
              </div>
            </div>
            <p className="shrink-0 font-display text-[40px] font-extrabold leading-none tabular-nums text-gradient-violet">
              {todayPct}
              <span className="ml-0.5 text-[15px] font-bold text-tz-muted">%</span>
            </p>
          </div>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-tz-track"
            role="img"
            aria-label={`Ibadah hari ini ${todayScore.pct}% dari target`}
          >
            <div
              className="tz-bar-grow-x h-full rounded-full bg-gradient-to-r from-tz-purple to-tz-violet"
              style={{ width: `${barsIn ? todayScore.pct : 0}%` }}
            />
          </div>
          <p className="mt-2.5 text-[10.5px] leading-tight text-tz-muted">
            Persentase seluruh ibadah terlacak yang sudah terlaksana hari ini.
          </p>
        </GlassCard>

        {/* Dua kartu pendukung — ukuran seimbang di bawah kartu utama */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard variant="clean" className="animate-tz-fade-up p-4">
            <IconBox size="sm" className="border-transparent bg-amber-400/15 text-amber-300 shadow-none light:bg-amber-400/20 light:text-amber-600">
              <Flame />
            </IconBox>
            <p className="mt-3 font-display text-[30px] font-extrabold leading-none tabular-nums text-tz-ink">{streakN}</p>
            <p className="mt-1.5 text-[11px] leading-tight text-tz-muted">Hari Streak 5 Salat</p>
            <div className="mt-2.5 flex items-center gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    i < Math.min(streak, 3)
                      ? "bg-gradient-to-r from-amber-400 to-orange-400 light:from-amber-500 light:to-orange-500"
                      : "bg-tz-track"
                  )}
                />
              ))}
            </div>
          </GlassCard>
          <GlassCard variant="clean" className="animate-tz-fade-up p-4">
            <IconBox size="sm" className="border-transparent bg-teal-400/15 text-teal-300 shadow-none light:bg-teal-400/20 light:text-teal-600">
              <Trophy />
            </IconBox>
            <p className="mt-3 font-display text-[30px] font-extrabold leading-none tabular-nums text-tz-ink">{perfectN}</p>
            <p className="mt-1.5 text-[11px] leading-tight text-tz-muted">Hari Sempurna</p>
            <div className="mt-2.5 flex items-center gap-1.5" aria-hidden>
              <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 light:from-teal-500 light:to-emerald-500" />
              <span className="text-[9px] font-semibold uppercase tracking-wide text-tz-muted/80">
                {period === "mingguan" ? "minggu ini" : "bulan ini"}
              </span>
            </div>
          </GlassCard>
        </div>
      </section>


      {/* ---------- Kalender riwayat — glassmorphism slate/cyan ---------- */}
      <section aria-label="Kalender riwayat ibadah">
        <SectionHeader title="Kalender Riwayat" caption="Ketuk tanggal untuk ringkasan — warna menunjukkan status tercatat" />
        <GlassCard className="border-sky-400/15 p-4 light:border-slate-300/80">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-400/[0.08] via-transparent to-sky-400/[0.09]" />
          <div className="relative">
            {/* Kepala: navigasi + label bulan (atau rentang minggu) */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label={period === "mingguan" ? "Minggu sebelumnya" : "Bulan sebelumnya"}
                onClick={() => (period === "mingguan" ? setWeekOffset((w) => w - 1) : setMonthOffset((m) => m - 1))}
                className="tap flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/25 bg-slate-500/10 text-slate-300 transition-all hover:bg-slate-500/20 light:border-slate-300 light:bg-slate-100 light:text-slate-500"
              >
                <ChevronLeft size={17} />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate font-display text-[15px] font-semibold text-tz-ink">{calLabel}</p>
                {period === "mingguan" ? (
                  <p className="text-[10px] font-semibold text-sky-300/95 light:text-sky-600">{weekRangeLabel(weekStart)}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={period === "mingguan" ? "Minggu berikutnya" : "Bulan berikutnya"}
                disabled={!canGoNext}
                onClick={() => {
                  if (period === "mingguan") setWeekOffset((w) => (canGoNextWeek ? w + 1 : w));
                  else setMonthOffset((m) => (canGoNextMonth ? m + 1 : m));
                }}
                className={cn(
                  "tap flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/25 bg-slate-500/10 text-slate-300 transition-all hover:bg-slate-500/20 light:border-slate-300 light:bg-slate-100 light:text-slate-500",
                  !canGoNext && "opacity-30"
                )}
              >
                <ChevronRight size={17} />
              </button>
            </div>

            {/* Sakelar tampilan Mingguan / Bulanan */}
            <div className="mt-3 flex rounded-xl border border-slate-300/20 bg-slate-500/10 p-1 light:border-slate-200 light:bg-slate-100" role="tablist" aria-label="Tampilan kalender">
              {(["mingguan", "bulanan"] as Period[]).map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={period === p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "tap flex-1 rounded-lg py-1.5 text-[12px] font-semibold capitalize transition-all",
                    period === p
                      ? "bg-sky-500 text-white shadow-[0_6px_16px_-8px_rgba(14,165,233,0.9)]"
                      : "text-tz-muted hover:text-tz-ink"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {period === "mingguan" ? (
              /* ----- Tampilan Mingguan: strip 7 hari kronologis (kiri→kanan) ----- */
              <div key={weekStart} className="tz-fade-in mt-4 grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => {
                  const isSelected = d.key === selectedDate;
                  const dotCls = !d.hasData
                    ? "border border-dashed border-tz-line-strong"
                    : d.jamaah > 0
                      ? "bg-teal-400 light:bg-teal-500"
                      : d.mandiri > 0
                        ? "bg-sky-400 light:bg-sky-500"
                        : "bg-amber-400 light:bg-amber-500";
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setSelectedDate(d.key)}
                      aria-pressed={isSelected}
                      aria-label={`Pilih ${formatDayFull(d.key)}${d.isToday ? " (hari ini)" : ""}`}
                      className={cn(
                        "tap flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 transition-colors",
                        isSelected ? "bg-sky-500/[0.12]" : "hover:bg-slate-500/10",
                        d.isFuture && "opacity-40"
                      )}
                    >
                      <span className={cn("text-[9.5px] font-semibold uppercase", d.isToday ? "text-sky-300 light:text-sky-600" : "text-tz-muted")}>
                        {weekdayShort(d.key)}
                      </span>
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                          isSelected
                            ? "bg-sky-500 text-white shadow-[0_8px_18px_-8px_rgba(14,165,233,0.95)]"
                            : d.isToday
                              ? "bg-sky-400/15 text-sky-200 ring-1 ring-sky-400/50 light:text-sky-700"
                              : "bg-tz-panel-strong text-tz-ink/85"
                        )}
                      >
                        {Number(d.key.slice(-2))}
                      </span>
                      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotCls)} />
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ----- Tampilan Bulanan: grid fungsi utuh, seleksi tetap bekerja ----- */
              <div key={monthOffset} className="tz-fade-in mt-4 grid grid-cols-7 gap-1.5 text-center">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="pb-1 text-[10px] font-medium text-tz-muted">
                    {d}
                  </span>
                ))}
                {calendarWithStatus.map((cell, i) => {
                  if (!cell.key) return <span key={`blank-${i}`} aria-hidden className="aspect-square" />;
                  const dateKey = cell.key;
                  const intensity = cell.done / 5;
                  // Sel kalender berbentuk LINGKARAN. Warna dasar hari: teal
                  // (ada berjamaah) > biru (mandiri) > amber (hanya terlewat);
                  // tanpa data = abu netral (BUKAN hari gagal). Hari INI warna
                  // PENUH + teks putih; tanggal DIPILIH diberi cincin cyan.
                  let bg: string | undefined;
                  if (!cell.isFuture && cell.isToday) {
                    bg =
                      cell.jamaah > 0
                        ? "#14b8a6"
                        : cell.mandiri > 0
                          ? "#0ea5e9"
                          : cell.missed > 0
                            ? "#f59e0b"
                            : "#0ea5e9";
                  } else if (cell.hasData) {
                    if (cell.jamaah > 0) {
                      bg = `rgba(45,212,191,${(0.17 + intensity * 0.58).toFixed(3)})`;
                    } else if (cell.mandiri > 0) {
                      bg = `rgba(56,189,248,${(0.15 + intensity * 0.52).toFixed(3)})`;
                    } else {
                      bg = `rgba(251,191,36,${(0.15 + (cell.missed / 5) * 0.35).toFixed(3)})`;
                    }
                  } else if (!cell.isFuture) {
                    bg = "var(--tz-empty-cell)";
                  }
                  // Titik kombinasi: hanya status yang BUKAN warna dasar hari.
                  const mixDots = [
                    cell.jamaah > 0 && cell.mandiri > 0 ? "sky" : null,
                    (cell.jamaah > 0 || cell.mandiri > 0) && cell.missed > 0 ? "amber" : null,
                  ].filter(Boolean) as string[];
                  const isSelected = cell.key === selectedDate;
                  const detailText = cell.hasData
                    ? [
                        cell.jamaah > 0 ? `${cell.jamaah} berjamaah` : null,
                        cell.mandiri > 0 ? `${cell.mandiri} mandiri` : null,
                        cell.missed > 0 ? `${cell.missed} tidak dilaksanakan` : null,
                      ]
                      .filter(Boolean)
                      .join(", ")
                    : "belum ada catatan salat";
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      title={`${formatDayMonth(cell.key)} — ${detailText}${cell.done === 5 ? " · lengkap" : ""}${cell.isToday ? " · hari ini" : ""}`}
                      aria-pressed={isSelected}
                      aria-label={`Pilih ${formatDayFull(cell.key)}${cell.isToday ? " (hari ini)" : ""}`}
                      onClick={() => setSelectedDate(dateKey)}
                      className={cn(
                        "tap relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                        isSelected && "shadow-[0_0_0_2px_rgba(14,165,233,0.95),0_0_14px_-2px_rgba(14,165,233,0.6)]",
                        cell.isFuture
                          ? "bg-tz-panel-soft text-tz-ink/20"
                          : cell.isToday
                            ? "text-white"
                            : "text-tz-ink/90"
                      )}
                      style={{ background: bg }}
                    >
                      <span className="leading-none">{cell.day}</span>
                      {!cell.isFuture && mixDots.length > 0 ? (
                        <span aria-hidden className="mt-[2px] flex items-center gap-[2px]">
                          {mixDots.map((dot) => (
                            <span
                              key={dot}
                              className={cn(
                                "h-[3px] w-[3px] rounded-full",
                                cell.isToday
                                  ? "bg-white/90"
                                  : dot === "sky"
                                    ? "bg-sky-100 light:bg-sky-700"
                                    : "bg-amber-100 light:bg-amber-700"
                              )}
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legenda warna status (konsisten dengan Pola Ibadah Minggu Ini) */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-tz-muted">
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 rounded-full bg-teal-400/90 light:bg-teal-500" /> Berjamaah
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 rounded-full bg-sky-400/90 light:bg-sky-500" /> Mandiri
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400/80 light:bg-amber-500" /> Tidak dilaksanakan
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 rounded-full border border-dashed border-tz-line-strong" /> Belum dicatat
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 rounded-full bg-sky-500" /> Hari ini
              </span>
            </div>

            {/* Ringkasan tanggal yang dipilih — dari catatan asli */}
            <div key={selectedDate} className="tz-fade-in mt-4 rounded-2xl border border-slate-300/20 bg-slate-500/[0.09] p-3 light:border-slate-200 light:bg-slate-100">
              {selFuture ? (
                <p className="text-center text-[11.5px] leading-relaxed text-tz-muted">
                  Tanggal ini belum berjalan — belum ada catatan, bukan hari gagal.
                </p>
              ) : selStatus.hasData || (selLog && ((selLog.quranPages ?? 0) > 0 || (selLog.quranVerses ?? 0) > 0 || (selLog.zikirCount ?? 0) > 0)) ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-tz-ink">{relativeDayLabel(selectedDate, today)}</p>
                    {relativeDayLabel(selectedDate, today) !== formatDayFull(selectedDate) ? (
                      <p className="text-[10px] text-tz-muted">{formatDayFull(selectedDate)}</p>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip className="border-teal-400/30 bg-teal-400/10 text-teal-300 light:text-teal-700">Berjamaah {selStatus.jamaah}</Chip>
                    <Chip className="border-sky-400/30 bg-sky-400/10 text-sky-300 light:text-sky-700">Mandiri {selStatus.mandiri}</Chip>
                    {selStatus.missed > 0 ? (
                      <Chip className="border-amber-400/30 bg-amber-400/10 text-amber-300 light:text-amber-700">Tidak dilaksanakan {selStatus.missed}</Chip>
                    ) : null}
                    <Chip className="border-tz-line bg-tz-panel-strong text-tz-ink/75">Belum dicatat {selUnrecorded}</Chip>
                  </div>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-tz-muted">
                    Al-Qur&apos;an:{" "}
                    {selLog && ((selLog.quranPages ?? 0) > 0 || (selLog.quranVerses ?? 0) > 0)
                      ? `${selLog.quranPages.toLocaleString("id-ID")} hlm · ${selLog.quranVerses.toLocaleString("id-ID")} ayat`
                      : "belum ada"}{" "}
                    · Zikir: {selLog && selLog.zikirCount > 0 ? `${selLog.zikirCount.toLocaleString("id-ID")} hitungan` : "belum ada"}
                  </p>
                </>
              ) : (
                <p className="text-center text-[11.5px] leading-relaxed text-tz-muted">
                  {relativeDayLabel(selectedDate, today)} — belum ada catatan ibadah (bukan hari gagal).
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ---------- Aktivitas paling sering ---------- */}
      <section aria-label="Aktivitas paling sering">
        <SectionHeader
          title="Paling Sering Dilakukan"
          caption={period === "mingguan" ? "Minggu ini (sejak Senin)" : "Bulan ini"}
        />
        <GlassCard className="space-y-3 p-4">
          {topActivities.slice(0, 5).map((a, idx) => (
            <div key={a.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.5rem] text-[10px] font-bold",
                  idx === 0
                    ? "bg-tz-violet text-white"
                    : "border border-white/8 bg-tz-panel text-tz-muted light:border-tz-line light:bg-tz-panel-soft"
                )}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-tz-ink/90">{a.label}</p>
                  <p className="text-[11px] text-tz-muted">{a.count}x</p>
                </div>
                <ProgressBar value={(a.count / maxActivity) * 100} className="h-1.5" />
              </div>
            </div>
          ))}
        </GlassCard>
      </section>

      {/* ---------- Pola Ibadah Minggu Ini ---------- */}
      <section aria-label="Pola ibadah minggu ini">
        <SectionHeader title="Pola Ibadah Minggu Ini" caption="Senin sampai Minggu — perjalanan ibadahmu dalam satu pekan." />
        <GlassCard className="p-4">
          <div className="relative flex h-36 items-end justify-between gap-1.5">
            {pattern.days.map((d, idx) => {
              const isToday = d.date === today;
              const isFuture = d.date > today;
              // Skala tetap 0–5 agar antarhari adil; segmen tumbuh DARI BAWAH
              // ke ATAS dengan urutan animasi KIRI→KANAN mengikuti tanggal
              // (delay per kolom). Hari sebelum catatan pertama tetap kosong —
              // tanpa data palsu.
              const totalH = ((d.done + d.missed + d.unrecorded) / 5) * 100;
              const jamaahH = (d.jamaah / 5) * 100;
              const mandiriH = (d.mandiri / 5) * 100;
              const missedH = (d.missed / 5) * 100;
              const unrecH = (d.unrecorded / 5) * 100;
              const dayLabel = isToday ? "Hari Ini" : isFuture ? formatDayFull(d.date) : relativeDayLabel(d.date, today);
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setPatternDay(d.date)}
                  aria-label={
                    isFuture
                      ? `Rincian ${dayLabel} — hari belum berjalan`
                      : `Rincian ${dayLabel} — ${d.done} salat terlaksana, ${d.missed} tidak dilaksanakan, ${d.unrecorded} belum dicatat`
                  }
                  className={cn("flex h-full flex-1 cursor-pointer flex-col items-center gap-1.5", isFuture && "opacity-45")}
                >
                  <span className={cn("text-[9.5px] font-semibold tabular-nums", isToday ? "text-sky-300 light:text-sky-600" : "text-tz-muted/80")}>
                    {d.done > 0 ? d.done : ""}
                  </span>
                  <div className="flex min-h-0 w-full flex-1 items-end">
                    <div className="mx-auto flex h-full w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-full border border-tz-line/70 bg-tz-track/40">
                      {totalH > 0 ? (
                        <div
                          className="tz-bar-grow flex w-full flex-col justify-end"
                          style={{
                            height: barsIn ? `${Math.max(6, totalH)}%` : "0%",
                            transitionDelay: `${idx * 55}ms`,
                          }}
                        >
                          {/* Urutan segmen dari bawah: berjamaah → mandiri → tidak dilaksanakan → belum dicatat */}
                          {jamaahH > 0.5 ? (
                            <span className="w-full shrink-0 bg-gradient-to-t from-tz-purple to-tz-violet" style={{ height: `${(jamaahH / totalH) * 100}%` }} />
                          ) : null}
                          {mandiriH > 0.5 ? (
                            <span className="w-full shrink-0 bg-tz-lavender/75" style={{ height: `${(mandiriH / totalH) * 100}%` }} />
                          ) : null}
                          {missedH > 0.5 ? (
                            <span className="w-full shrink-0 bg-rose-400/45 light:bg-rose-300" style={{ height: `${(missedH / totalH) * 100}%` }} />
                          ) : null}
                          {unrecH > 0.5 ? (
                            <span className="w-full shrink-0 border-t border-dashed border-tz-line-strong bg-tz-track" style={{ height: `${(unrecH / totalH) * 100}%` }} />
                          ) : null}
                        </div>
                      ) : (
                        <span className="w-full border-t border-dashed border-tz-line-strong" />
                      )}
                    </div>
                  </div>
                  <span className={cn("text-[10px] leading-tight", isToday ? "font-bold text-sky-300 light:text-sky-600" : "text-tz-muted")}>
                    {weekdayShort(d.date)}
                    <span className={cn("block text-[8.5px]", isToday ? "font-semibold text-sky-300/80 light:text-sky-600/80" : "text-tz-muted/70")}>{d.date.slice(-2)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legenda — berjamaah & mandiri dibedakan jelas */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-tz-muted">
            <span className="flex items-center gap-1">
              <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-t from-tz-purple to-tz-violet" /> Berjamaah
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="h-2 w-2 rounded-full bg-tz-lavender/80" /> Mandiri
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="h-2 w-2 rounded-full bg-rose-400/60 light:bg-rose-300" /> Tidak dilaksanakan
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="h-2 w-2 rounded-full border border-dashed border-tz-line-strong" /> Belum dicatat
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Chip className="border-tz-violet/30 bg-tz-violet/10 text-tz-accent">Berjamaah {pattern.jamaah}</Chip>
            <Chip className="border-tz-violet/20 bg-tz-violet/[0.06] text-tz-accent/90">Mandiri {pattern.mandiri}</Chip>
            <Chip className="border-rose-300/35 bg-rose-400/10 text-rose-600 light:text-rose-700">Tidak dilaksanakan {pattern.missed}</Chip>
            <Chip className="border-tz-line bg-tz-panel-strong text-tz-ink/80">Belum dicatat {pattern.unrecorded}</Chip>
          </div>

          {/* Indikator terpisah: Al-Qur'an & zikir (tidak dicampur perhitungan salat) */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-tz-line bg-tz-panel-soft p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">
                <BookOpen size={12} className="text-tz-violet" /> Al-Qur&apos;an · 7 hari
              </p>
              <p className="mt-1 text-[12px] font-semibold text-tz-ink">
                {weekQuran.pages > 0 || weekQuran.verses > 0
                  ? `${weekQuran.pages.toLocaleString("id-ID")} halaman · ${weekQuran.verses.toLocaleString("id-ID")} ayat`
                  : "Belum ada catatan"}
              </p>
            </div>
            <div className="rounded-xl border border-tz-line bg-tz-panel-soft p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">
                <CircleDot size={12} className="text-tz-violet" /> Zikir · 7 hari
              </p>
              <p className="mt-1 text-[12px] font-semibold text-tz-ink">
                {weekQuran.zikir > 0 ? `${weekQuran.zikir.toLocaleString("id-ID")} hitungan` : "Belum ada catatan"}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[10px] text-tz-muted/60">
        <CalendarDays size={11} />
        Statistik dihitung langsung dari catatan ibadah Anda di perangkat ini
      </p>

      {/* ---------- Sheet rincian satu hari (di-mount saat dipakai) ---------- */}
      {patternDay ? <DayDetailSheet date={patternDay} onClose={() => setPatternDay(null)} /> : null}
    </div>
  );
}
