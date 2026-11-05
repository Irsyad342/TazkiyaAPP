"use client";

/**
 * Tazkiya — Halaman Progress (pengganti "Statistik").
 * Pusat ringkasan seluruh perkembangan aktivitas ibadah:
 * - Hari Ini: progres tiap kategori (salat, Al-Qur'an, zikir, target harian,
 *   amal, jurnal) dengan visual berbeda per jenis.
 * - Mingguan: pola 7 hari kronologis + ringkasan per kategori.
 * - Bulanan: kalender aktivitas + hari aktif + aktivitas paling sering.
 * Prinsip: bahasa positif & suportif, hari tanpa catatan BUKAN hari gagal,
 * kategori tidak saling tercampur, semua angka dari catatan nyata.
 */

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Check,
  CircleDot,
  Flame,
  HandCoins,
  BookHeart,
  Target,
  Trophy,
} from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  activityCounts,
  computeStreak,
  dayScore,
  monthCalendar,
  monthLabel,
  monthRange,
  prayerConsistency,
  summarizeRange,
  weekdayLabels,
  seriesLastDays,
} from "@/lib/tazkiya/stats";
import {
  PRAYER_IDS,
  moodLabel,
  selectPrayerDetail,
  type DailyLog,
} from "@/lib/tazkiya/types";
import {
  addDays,
  formatDayFull,
  formatDayMonth,
  isFriday,
  keyToDate,
  lastNDays,
  mondayOf,
  relativeDayLabel,
  todayKey,
  weekdayShort,
} from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { goalStatuses } from "@/lib/tazkiya/goals";
import { Chip, GlassCard, IconBox, ProgressBar, ProgressRing, SectionHeader, SegmentedTabs } from "./ui-bits";
import { DayDetailSheet } from "./DayDetailSheet";
import { cn } from "@/lib/utils";

type Period = "harian" | "mingguan" | "bulanan";

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

/** Ringkasan satu tanggal dari catatan asli (tanpa menghukum hari kosong). */
function statusForOf(
  logs: Record<string, DailyLog>,
  prayerDetails: ReturnType<typeof useWorshipStore.getState>["prayerDetails"],
  key: string
) {
  let jamaah = 0;
  let mandiri = 0;
  let missed = 0;
  for (const id of PRAYER_IDS) {
    const d = selectPrayerDetail(prayerDetails, logs, key, id);
    if (d.status === "done") {
      if (d.kind === "berjamaah") jamaah++;
      else mandiri++;
    } else if (d.status === "missed") {
      missed++;
    }
  }
  return { jamaah, mandiri, missed, done: jamaah + mandiri, hasData: jamaah + mandiri > 0 || missed > 0 };
}

export function ProgressPage() {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const settings = useWorshipStore((s) => s.settings);
  const tracked = useWorshipStore((s) => s.settings.trackedExtras);
  const journal = useWorshipStore((s) => s.journal);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const moods = useWorshipStore((s) => s.moods);
  const dailyGoals = useWorshipStore((s) => s.dailyGoals);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);
  const goalDone = useWorshipStore((s) => s.goalDone);

  const today = todayKey();
  const reminderTimes = resolvePrayerSchedule(settings, today);
  const [period, setPeriod] = useState<Period>("harian");
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [patternDay, setPatternDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [barsIn, setBarsIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const todayScore = dayScore(logs[today], today, tracked);
  const streak = computeStreak(logs, today);
  const todayPct = useCountUp(todayScore.pct);

  const goalStats = goalStatuses(dailyGoals, today, {
    logs,
    prayerDetails,
    zikirSessions,
    amalEntries,
    goalDone,
    subuhOntime: null,
  });
  const goalsDone = goalStats.filter((g) => g.done).length;

  const todayLog = logs[today];
  const todayAmal = amalEntries.filter((a) => a.date === today).length;
  const todayMood = moods[today]?.mood;

  /* ---------- Mingguan ---------- */
  const monday = mondayOf(today);
  const pattern = prayerConsistency({
    prayerDetails,
    logs,
    dates: [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i)),
    today,
    reminderTimes,
  });
  const weekKeys = lastNDays(7, today);
  const weekQuran = weekKeys.reduce(
    (acc, k) => ({
      pages: acc.pages + (logs[k]?.quranPages ?? 0),
      verses: acc.verses + (logs[k]?.quranVerses ?? 0),
      zikir: acc.zikir + (logs[k]?.zikirCount ?? 0),
    }),
    { pages: 0, verses: 0, zikir: 0 }
  );
  const weekJurnal = weekKeys.filter((k) => journal[k]).length;
  const weekAmal = amalEntries.filter((a) => weekKeys.includes(a.date)).length;
  const weekSummary = summarizeRange(logs, weekKeys, tracked);
  const weekStreak = useCountUp(weekSummary.perfectDays);

  /* ---------- Bulanan ---------- */
  const keys = monthRange(today);
  const summary = summarizeRange(logs, keys, tracked);
  const perfectN = useCountUp(summary.perfectDays);

  const topActivities = (() => {
    const result = activityCounts(logs, keys, tracked);
    if (keys.some(isFriday)) {
      return result.map((a) => (a.id === "zuhur" ? { ...a, label: "Salat Zuhur / Jumat" } : a));
    }
    return result;
  })();
  const maxActivity = Math.max(1, ...topActivities.map((a) => a.count));

  /* ---------- Kalender ---------- */
  const calendar = monthCalendar(today, monthOffset);
  const calendarWithStatus = calendar.map((cell) => {
    if (!cell.key || cell.isFuture) return { ...cell, jamaah: 0, mandiri: 0, missed: 0, done: 0, hasData: false };
    return { ...cell, ...statusForOf(logs, prayerDetails, cell.key) };
  });
  const canGoNextMonth = monthOffset < 0;
  const selFuture = selectedDate > today;
  const selStatus = statusForOf(logs, prayerDetails, selectedDate);
  const selLog = logs[selectedDate];

  /* ---------- Minggu strip ---------- */
  const weekStart = addDays(mondayOf(today), weekOffset * 7);
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const key = addDays(weekStart, i);
    return { key, isToday: key === today, isFuture: key > today, ...statusForOf(logs, prayerDetails, key) };
  });
  const canGoNextWeek = weekOffset < 0;

  return (
    <div className="space-y-6">
      {/* ---------- Judul ---------- */}
      <header className="animate-tz-fade-up flex items-end justify-between pt-1">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-gradient-violet">Progress</h1>
          <p className="mt-1 text-sm text-tz-muted">Perjalanan ibadahmu — satu langkah kecil setiap hari</p>
        </div>
      </header>

      {/* Tab segmen periode */}
      <SegmentedTabs
        ariaLabel="Periode progress"
        items={[
          { id: "harian" as const, label: "Hari Ini" },
          { id: "mingguan" as const, label: "Mingguan" },
          { id: "bulanan" as const, label: "Bulanan" },
        ]}
        value={period}
        onChange={setPeriod}
      />

      {/* ================= HARI INI ================= */}
      {period === "harian" ? (
        <div key="harian" className="tz-fade-in space-y-5">
          {/* Kartu utama ala Task 33 */}
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
                  className="tz-bar-grow-x h-full rounded-full bg-gradient-to-r from-[#8b7cf8] to-[#5b8def]"
                  style={{ width: `${barsIn ? todayScore.pct : 0}%` }}
                />
              </div>
            <p className="mt-2.5 text-[10.5px] leading-tight text-tz-muted">
              Terus bertumbuh dalam istiqamah — setiap catatan hari ini berarti.
            </p>
          </GlassCard>

          {/* Progres per kategori — visual berbeda per jenis */}
          <section aria-label="Progress per kategori hari ini">
            <SectionHeader title="Perjalanan Kategori Hari Ini" caption="Setiap kategori dihitung terpisah, tidak saling tercampur" />
            <div className="space-y-2.5">
              {/* Salat */}
              <GlassCard className="flex items-center gap-3 p-4">
                <IconBox size="sm" className="border-transparent bg-tz-violet/12 text-tz-violet shadow-none">
                  <Activity />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-tz-ink">Salat</p>
                    <p className="text-[11px] font-semibold text-tz-muted">{["subuh", "zuhur", "asar", "magrib", "isya"].filter((p) => todayLog?.prayers?.[p as keyof typeof todayLog.prayers]).length}/5</p>
                  </div>
                  <ProgressBar value={(["subuh", "zuhur", "asar", "magrib", "isya"].filter((p) => todayLog?.prayers?.[p as keyof typeof todayLog.prayers]).length / 5) * 100} className="mt-2 h-1.5" />
                </div>
              </GlassCard>

              {/* Al-Qur'an */}
              <GlassCard className="flex items-center gap-3 p-4">
                <IconBox size="sm" className="border-transparent bg-tz-blue-soft text-tz-blue shadow-none dark:bg-[#8fa7ff]/15 dark:text-[#aebcff]">
                  <BookOpen />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-tz-ink">Bacaan Al-Qur&apos;an</p>
                    <p className="text-[11px] font-semibold text-tz-muted">
                      {(todayLog?.quranPages ?? 0).toLocaleString("id-ID")} hlm · {(todayLog?.quranVerses ?? 0).toLocaleString("id-ID")} ayat
                    </p>
                  </div>
                  <ProgressBar value={Math.min(100, ((todayLog?.quranPages ?? 0) / Math.max(1, settings.quranDailyTarget)) * 100)} className="mt-2 h-1.5" />
                </div>
              </GlassCard>

              {/* Zikir */}
              <GlassCard className="flex items-center gap-3 p-4">
                <IconBox size="sm" className="border-transparent bg-amber-400/15 text-amber-300 shadow-none light:bg-amber-400/20 light:text-amber-600">
                  <CircleDot />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-tz-ink">Zikir</p>
                    <p className="text-[11px] font-semibold text-tz-muted">
                      {(todayLog?.zikirCount ?? 0).toLocaleString("id-ID")} / {settings.zikirTarget.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <ProgressBar value={Math.min(100, ((todayLog?.zikirCount ?? 0) / Math.max(1, settings.zikirTarget)) * 100)} className="mt-2 h-1.5" />
                </div>
              </GlassCard>

              {/* Target harian */}
              <GlassCard className="flex items-center gap-3 p-4">
                <IconBox size="sm" className="border-transparent bg-tz-lavender/15 text-tz-lavender shadow-none">
                  <Target />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-tz-ink">Target Harian</p>
                    <p className="text-[11px] font-semibold text-tz-muted">{goalsDone}/{goalStats.length}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {goalStats.map((g) => (
                      <Chip key={g.goal.id} className={cn(g.done ? "border-tz-violet/40 bg-tz-violet/12 text-tz-accent" : "border-tz-line")}>
                        {g.done ? "✓" : "○"} {g.goal.label.length > 18 ? `${g.goal.label.slice(0, 18)}…` : g.goal.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Amal & Jurnal */}
              <div className="grid grid-cols-2 gap-2.5">
                <GlassCard className="p-4">
                  <IconBox size="sm" className="border-transparent bg-tz-lime/18 text-[#7a9414] shadow-none light:bg-[#eef7c0] light:text-[#5f7410] dark:bg-tz-lime/15 dark:text-tz-lime">
                    <HandCoins />
                  </IconBox>
                  <p className="mt-2.5 font-display text-[24px] font-extrabold leading-none tabular-nums text-tz-ink">{todayAmal}</p>
                  <p className="mt-1 text-[10.5px] leading-tight text-tz-muted">kebaikan dicatat hari ini</p>
                </GlassCard>
                <GlassCard className="p-4">
                  <IconBox size="sm" className="border-transparent bg-tz-blue-soft text-tz-blue shadow-none dark:bg-[#8fa7ff]/15 dark:text-[#aebcff]">
                    <BookHeart />
                  </IconBox>
                  <p className="mt-2.5 font-display text-[24px] font-extrabold leading-none tabular-nums text-tz-ink">
                    {journal[today] ? "✓" : "–"}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-tight text-tz-muted">
                    {journal[today] ? `Jurnal syukur tersimpan${todayMood ? ` · mood ${moodLabel(todayMood)}` : ""}` : "Jurnal syukur belum diisi"}
                  </p>
                </GlassCard>
              </div>
            </div>
          </section>

          {/* Dua kartu pendukung (dipertahankan dari Statistik) */}
          <div className="grid grid-cols-2 gap-3">
            <GlassCard variant="clean" className="animate-tz-fade-up p-4">
              <IconBox size="sm" className="border-transparent bg-amber-400/15 text-amber-300 shadow-none light:bg-amber-400/20 light:text-amber-600">
                <Flame />
              </IconBox>
              <p className="mt-3 font-display text-[30px] font-extrabold leading-none tabular-nums text-tz-ink">{streak}</p>
              <p className="mt-1.5 text-[11px] leading-tight text-tz-muted">Hari beruntun 5 salat</p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-tz-muted/80">Salah satu ukuran — bukan satu-satunya.</p>
            </GlassCard>
            <GlassCard variant="clean" className="animate-tz-fade-up p-4">
              <IconBox size="sm" className="border-transparent bg-tz-blue-soft text-tz-blue shadow-none dark:bg-[#8fa7ff]/15 dark:text-[#aebcff]">
                <Trophy />
              </IconBox>
              <p className="mt-3 font-display text-[30px] font-extrabold leading-none tabular-nums text-tz-ink">{weekStreak}</p>
              <p className="mt-1.5 text-[11px] leading-tight text-tz-muted">Hari lengkap minggu ini</p>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {/* ================= MINGGUAN ================= */}
      {period === "mingguan" ? (
        <div key="mingguan" className="tz-fade-in space-y-5">
          {/* Pola salat 7 hari — dipertahankan dari Statistik */}
          <section aria-label="Pola salat minggu ini">
            <SectionHeader title="Perjalanan Salat Minggu Ini" caption="Senin sampai Minggu — kronologis kiri ke kanan" />
            <GlassCard className="p-4">
              <div className="relative flex h-36 items-end justify-between gap-1.5">
                {pattern.days.map((d, idx) => {
                  const isToday = d.date === today;
                  const isFuture = d.date > today;
                  const totalH = ((d.done + d.missed + d.unrecorded) / 5) * 100;
                  const jamaahH = (d.jamaah / 5) * 100;
                  const mandiriH = (d.mandiri / 5) * 100;
                  const missedH = (d.missed / 5) * 100;
                  const unrecH = (d.unrecorded / 5) * 100;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => !isFuture && setPatternDay(d.date)}
                      aria-label={`Rincian ${isToday ? "hari ini" : relativeDayLabel(d.date, today)} — ${d.done} salat terlaksana`}
                      className={cn("flex h-full flex-1 cursor-pointer flex-col items-center gap-1.5", isFuture && "opacity-45")}
                    >
                      <span className={cn("text-[9.5px] font-semibold tabular-nums", isToday ? "text-tz-accent" : "text-tz-muted/80")}>
                        {d.done > 0 ? d.done : ""}
                      </span>
                      <div className="flex min-h-0 w-full flex-1 items-end">
                        <div className="mx-auto flex h-full w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-full border border-tz-line/70 bg-tz-track/40">
                          {totalH > 0 ? (
                            <div
                              className="tz-bar-grow flex w-full flex-col justify-end"
                              style={{ height: barsIn ? `${Math.max(6, totalH)}%` : "0%", transitionDelay: `${idx * 55}ms` }}
                            >
                              {jamaahH > 0.5 ? <span className="w-full shrink-0 bg-gradient-to-t from-[#6c5ce7] to-[#9b8cfa]" style={{ height: `${(jamaahH / totalH) * 100}%` }} /> : null}
                              {mandiriH > 0.5 ? <span className="w-full shrink-0 bg-tz-lavender/75" style={{ height: `${(mandiriH / totalH) * 100}%` }} /> : null}
                              {missedH > 0.5 ? <span className="w-full shrink-0 bg-amber-400/55 light:bg-amber-300" style={{ height: `${(missedH / totalH) * 100}%` }} /> : null}
                              {unrecH > 0.5 ? <span className="w-full shrink-0 border-t border-dashed border-tz-line-strong bg-tz-track" style={{ height: `${(unrecH / totalH) * 100}%` }} /> : null}
                            </div>
                          ) : (
                            <span className="w-full border-t border-dashed border-tz-line-strong" />
                          )}
                        </div>
                      </div>
                      <span className={cn("text-[10px] leading-tight", isToday ? "font-bold text-tz-accent" : "text-tz-muted")}>
                        {weekdayShort(d.date)}
                        <span className={cn("block text-[8.5px]", isToday ? "font-semibold text-tz-accent/80" : "text-tz-muted/70")}>{d.date.slice(-2)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-tz-muted">
                <span className="flex items-center gap-1">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-t from-[#6c5ce7] to-[#9b8cfa]" /> Berjamaah
                </span>
                <span className="flex items-center gap-1">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-tz-lavender/80" /> Mandiri
                </span>
                <span className="flex items-center gap-1">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400/70 light:bg-amber-300" /> Tidak dilaksanakan
                </span>
                <span className="flex items-center gap-1">
                  <span aria-hidden className="h-2 w-2 rounded-full border border-dashed border-tz-line-strong" /> Belum dicatat
                </span>
              </div>
            </GlassCard>
          </section>

          {/* Ringkasan kategori mingguan */}
          <section aria-label="Ringkasan kategori mingguan">
            <SectionHeader title="Aktivitas Minggu Ini" caption="Setiap kategori punya jalannya sendiri" />
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: BookOpen, label: "Al-Qur'an", value: `${weekQuran.pages.toLocaleString("id-ID")} hlm · ${weekQuran.verses.toLocaleString("id-ID")} ayat` },
                { icon: CircleDot, label: "Zikir", value: `${weekQuran.zikir.toLocaleString("id-ID")} hitungan` },
                { icon: BookHeart, label: "Jurnal Syukur", value: `${weekJurnal} hari terisi` },
                { icon: HandCoins, label: "Amal & Sedekah", value: `${weekAmal} kebaikan` },
              ].map(({ icon: Icon, label, value }) => (
                <GlassCard key={label} className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-tz-violet/25 bg-tz-violet/12 text-tz-violet">
                      <Icon size={13} />
                    </span>
                    <p className="text-[10.5px] font-semibold text-tz-muted">{label}</p>
                  </div>
                  <p className="mt-2 text-[12.5px] font-bold leading-snug text-tz-ink">{value}</p>
                </GlassCard>
              ))}
            </div>
            <p className="mt-2 px-1 text-[10px] leading-relaxed text-tz-muted/80">
              Hari tanpa catatan tidak dihitung sebagai hari gagal — ia hanya hari yang belum mempunyai catatan.
            </p>
          </section>

          {/* Strip minggu yang bisa digeser */}
          <section aria-label="Strip mingguan">
            <SectionHeader
              title="Kalender Mingguan"
              caption="Ketuk tanggal untuk melihat rincian hari itu"
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Minggu sebelumnya"
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tz-line bg-tz-panel-soft text-tz-muted"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Minggu berikutnya"
                    disabled={!canGoNextWeek}
                    onClick={() => canGoNextWeek && setWeekOffset((w) => w + 1)}
                    className={cn("tap flex h-8 w-8 items-center justify-center rounded-full border border-tz-line bg-tz-panel-soft text-tz-muted", !canGoNextWeek && "opacity-30")}
                  >
                    ›
                  </button>
                </div>
              }
            />
            <GlassCard className="p-4">
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => {
                  const dotCls = !d.hasData
                    ? "border border-dashed border-tz-line-strong"
                    : d.jamaah > 0
                      ? "bg-[#6c5ce7] dark:bg-[#9b8cfa]"
                      : d.mandiri > 0
                        ? "bg-[#5b8def] dark:bg-[#8fa7ff]"
                        : "bg-amber-400 dark:bg-amber-500";
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => !d.isFuture && setSelectedDate(d.key)}
                      aria-label={`Pilih ${formatDayFull(d.key)}`}
                      className={cn("tap flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 transition-colors hover:bg-tz-panel-soft", d.isFuture && "opacity-40")}
                    >
                      <span className={cn("text-[9.5px] font-semibold uppercase", d.isToday ? "text-tz-accent" : "text-tz-muted")}>
                        {weekdayShort(d.key)}
                      </span>
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                          d.isToday ? "bg-tz-violet text-white" : "bg-tz-panel-strong text-tz-ink/85"
                        )}
                      >
                        {Number(d.key.slice(-2))}
                      </span>
                      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotCls)} />
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </section>
        </div>
      ) : null}

      {/* ================= BULANAN ================= */}
      {period === "bulanan" ? (
        <div key="bulanan" className="tz-fade-in space-y-5">
          <section aria-label="Ringkasan bulanan" className="grid grid-cols-3 gap-2.5">
            {[
              { value: summary.activeDays, label: "hari aktif" },
              { value: perfectN, label: "hari lengkap" },
              { value: summary.quranPages.toLocaleString("id-ID"), label: "halaman Qur'an" },
            ].map(({ value, label }) => (
              <GlassCard key={label} variant="clean" className="p-4">
                <p className="font-display text-[26px] font-extrabold leading-none tabular-nums text-tz-ink">{value}</p>
                <p className="mt-1 text-[10.5px] leading-tight text-tz-muted">{label}</p>
              </GlassCard>
            ))}
          </section>

          <section aria-label="Kalender aktivitas bulanan">
            <SectionHeader
              title="Kalender Aktivitas"
              caption={`${monthLabel(today, monthOffset)} — ketuk tanggal untuk membuka rinciannya`}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Bulan sebelumnya"
                    onClick={() => setMonthOffset((m) => m - 1)}
                    className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tz-line bg-tz-panel-soft text-tz-muted"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Bulan berikutnya"
                    disabled={!canGoNextMonth}
                    onClick={() => canGoNextMonth && setMonthOffset((m) => m + 1)}
                    className={cn("tap flex h-8 w-8 items-center justify-center rounded-full border border-tz-line bg-tz-panel-soft text-tz-muted", !canGoNextMonth && "opacity-30")}
                  >
                    ›
                  </button>
                </div>
              }
            />
            <GlassCard className="p-4">
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="pb-1 text-[10px] font-medium text-tz-muted">
                    {d}
                  </span>
                ))}
                {calendarWithStatus.map((cell, i) => {
                  if (!cell.key) return <span key={`blank-${i}`} aria-hidden className="aspect-square" />;
                  const intensity = cell.done / 5;
                  let bg: string | undefined;
                  if (!cell.isFuture && cell.isToday) {
                    bg = cell.jamaah > 0 ? "#6c5ce7" : cell.mandiri > 0 ? "#5b8def" : cell.missed > 0 ? "#f59e0b" : "#5b8def";
                  } else if (cell.hasData) {
                    if (cell.jamaah > 0) bg = `rgba(34,197,94,${(0.18 + intensity * 0.6).toFixed(3)})`;
                    else if (cell.mandiri > 0) bg = `rgba(66,99,235,${(0.14 + intensity * 0.5).toFixed(3)})`;
                    else bg = `rgba(245,158,11,${(0.15 + (cell.missed / 5) * 0.35).toFixed(3)})`;
                  } else if (!cell.isFuture) {
                    bg = "var(--tz-empty-cell)";
                  }
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      aria-label={`Rincian ${formatDayMonth(cell.key)}`}
                      onClick={() => {
                        if (cell.key && !cell.isFuture) setSelectedDate(cell.key);
                      }}
                      className={cn(
                        "tap flex aspect-square items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                        cell.isFuture ? "bg-tz-panel-soft text-tz-ink/20" : cell.isToday ? "text-white" : "text-tz-ink/90"
                      )}
                      style={{ background: bg }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Ringkasan tanggal terpilih */}
              <div key={selectedDate} className="tz-fade-in mt-4 rounded-2xl border border-tz-line bg-tz-panel-soft p-3">
                {selFuture ? (
                  <p className="text-center text-[11.5px] leading-relaxed text-tz-muted">
                    Tanggal ini belum berjalan — belum ada catatan, bukan hari gagal.
                  </p>
                ) : selStatus.hasData || (selLog && ((selLog.quranPages ?? 0) > 0 || (selLog.quranVerses ?? 0) > 0 || (selLog.zikirCount ?? 0) > 0)) ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-tz-ink">{relativeDayLabel(selectedDate, today)}</p>
                      <p className="text-[10px] text-tz-muted">{formatDayFull(selectedDate)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip className="border-tz-violet/35 bg-tz-violet/12 text-tz-accent">Berjamaah {selStatus.jamaah}</Chip>
                      <Chip className="border-[#5b8def]/30 bg-[#eef2ff] text-[#3d63c2] dark:border-[#8fa7ff]/35 dark:bg-[#8fa7ff]/15 dark:text-[#aebcff]">Mandiri {selStatus.mandiri}</Chip>
                      {selStatus.missed > 0 ? (
                        <Chip className="border-amber-300/45 bg-amber-400/12 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300">Tidak dilaksanakan {selStatus.missed}</Chip>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-tz-muted">
                      Al-Qur&apos;an:{" "}
                      {selLog && ((selLog.quranPages ?? 0) > 0 || (selLog.quranVerses ?? 0) > 0)
                        ? `${selLog.quranPages.toLocaleString("id-ID")} hlm · ${selLog.quranVerses.toLocaleString("id-ID")} ayat`
                        : "belum ada"}{" "}
                      · Zikir: {selLog && selLog.zikirCount > 0 ? `${selLog.zikirCount.toLocaleString("id-ID")} hitungan` : "belum ada"} · Jurnal:{" "}
                      {journal[selectedDate] ? "terisi" : "belum ada"} · Amal:{" "}
                      {amalEntries.filter((a) => a.date === selectedDate).length}
                    </p>
                  </>
                ) : (
                  <p className="text-center text-[11.5px] leading-relaxed text-tz-muted">
                    {relativeDayLabel(selectedDate, today)} — belum ada catatan ibadah (bukan hari gagal).
                  </p>
                )}
              </div>
            </GlassCard>
          </section>

          <section aria-label="Kebiasaan bulan ini">
            <SectionHeader title="Kebiasaan Bulan Ini" caption="Aktivitas yang paling sering kamu jaga" />
            <GlassCard className="space-y-3 p-4">
              {topActivities.slice(0, 5).map((a, idx) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.5rem] text-[10px] font-bold",
                      idx === 0 ? "bg-tz-violet text-white" : "border border-white/8 bg-tz-panel text-tz-muted light:border-tz-line light:bg-tz-panel-soft"
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
        </div>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[10px] text-tz-muted/60">
        <CalendarDays size={11} />
        Progress dihitung langsung dari catatan ibadah Anda — bukan perkiraan.
      </p>

      {patternDay ? <DayDetailSheet date={patternDay} onClose={() => setPatternDay(null)} /> : null}
      {selectedDate && period !== "harian" ? <DayDetailSheet date={selectedDate} onClose={() => setSelectedDate(today)} /> : null}
    </div>
  );
}
