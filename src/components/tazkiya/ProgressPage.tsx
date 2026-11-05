"use client";

/**
 * Tazkiya v4 — Progress sebagai dashboard analitik ibadah.
 * Komposisi baru: panel skor dengan cincin besar + tiga statistik angka-besar
 * bersekat hairline; rincian kategori dalam SATU kartu berupa baris bar
 * (bukan tumpukan kartu identik); mingguan berupa grafik batang bertumpuk
 * dua-warna lavender/lime + daftar kategori; bulanan berupa heatmap pil
 * lavender dengan cincin hari ini. Prinsip tetap: bahasa positif, hari tanpa
 * catatan BUKAN hari gagal, semua angka dari catatan nyata.
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
  lastNDays,
  mondayOf,
  relativeDayLabel,
  todayKey,
  weekdayShort,
} from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { goalStatuses } from "@/lib/tazkiya/goals";
import { Chip, GlassCard, ProgressBar, ProgressRing, SectionHeader, SegmentedTabs } from "./ui-bits";
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

/** Baris statistik editorial: angka besar Outfit + label kecil, sekat hairline. */
function StatRow({ items }: { items: { value: number | string; label: string }[] }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-tk-line">
      {items.map(({ value, label }, i) => (
        <div key={label} className={cn("px-3 text-center sm:px-5", i === 0 && "pl-0 text-left")}>
          <p className="tnum font-display text-[24px] font-bold leading-none tracking-tight text-tk-ink sm:text-[28px]">{value}</p>
          <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-tk-muted">{label}</p>
        </div>
      ))}
    </div>
  );
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

  /* Kategori hari ini untuk panel analitik */
  const salatDone = ["subuh", "zuhur", "asar", "magrib", "isya"].filter(
    (p) => todayLog?.prayers?.[p as keyof typeof todayLog.prayers]
  ).length;
  const quranPct = Math.min(100, ((todayLog?.quranPages ?? 0) / Math.max(1, settings.quranDailyTarget)) * 100);
  const zikirPct = Math.min(100, ((todayLog?.zikirCount ?? 0) / Math.max(1, settings.zikirTarget)) * 100);

  return (
    <div className="space-y-6">
      {/* ---------- Judul ---------- */}
      <header className="animate-tk-fade-up pt-1">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-tk-ink">Progress</h1>
          <p className="mt-1 text-[12.5px] text-tk-muted">Perjalanan ibadahmu — satu langkah kecil setiap hari</p>
        </div>
      </header>

      {/* Tab garis periode */}
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
        <div key="harian" className="tk-fade-in lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          <div className="space-y-5 lg:col-span-7">
            {/* Panel analitik utama: cincin + baris statistik */}
            <GlassCard className="animate-tk-fade-up p-5">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-7">
                <ProgressRing value={barsIn ? todayPct : 0} size={128} stroke={11} className="shrink-0">
                  <span className="tnum font-display text-[30px] font-bold leading-none text-tk-ink">{todayPct}%</span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-tk-muted">terlaksana</span>
                </ProgressRing>
                <div className="w-full min-w-0 flex-1">
                  <p className="font-display text-[15px] font-bold text-tk-ink">Progres Ibadah Hari Ini</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-tk-muted">
                    {todayScore.done} dari {todayScore.total} ibadah terlaksana
                  </p>
                  <div className="mt-4 border-t border-tk-line pt-3.5">
                    <StatRow
                      items={[
                        { value: streak, label: "hari beruntun" },
                        { value: weekStreak, label: "hari lengkap" },
                        { value: goalsDone, label: "target tercapai" },
                      ]}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[10.5px] leading-tight text-tk-muted">
                Terus bertumbuh dalam istiqamah — setiap catatan hari ini berarti.
              </p>
            </GlassCard>

            {/* Rincian kategori: satu kartu, baris bar */}
            <section aria-label="Progress per kategori hari ini">
              <SectionHeader title="Kategori Hari Ini" caption="Setiap kategori dihitung terpisah, tidak saling tercampur" />
              <GlassCard className="p-5">
                <ul className="space-y-5">
                  {/* Salat */}
                  <li>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[12.5px] font-bold text-tk-ink">
                        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                          <Activity size={13} />
                        </span>
                        Salat
                      </p>
                      <p className="tnum text-[12px] font-bold text-tk-ink">{salatDone}/5</p>
                    </div>
                    <ProgressBar value={(salatDone / 5) * 100} className="mt-2 h-1.5" />
                  </li>
                  {/* Al-Qur'an */}
                  <li>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[12.5px] font-bold text-tk-ink">
                        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-tk-blue-soft text-tk-blue dark:bg-tk-blue/20 dark:text-[#aebcff]">
                          <BookOpen size={13} />
                        </span>
                        Bacaan Al-Qur&apos;an
                      </p>
                      <p className="tnum text-[12px] font-bold text-tk-ink">
                        {(todayLog?.quranPages ?? 0).toLocaleString("id-ID")} hlm · {(todayLog?.quranVerses ?? 0).toLocaleString("id-ID")} ayat
                      </p>
                    </div>
                    <ProgressBar value={quranPct} className="mt-2 h-1.5" />
                  </li>
                  {/* Zikir */}
                  <li>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[12.5px] font-bold text-tk-ink">
                        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-tk-lime/40 text-tk-lime-ink dark:bg-tk-lime/15 dark:text-tk-lime">
                          <CircleDot size={13} />
                        </span>
                        Zikir
                      </p>
                      <p className="tnum text-[12px] font-bold text-tk-ink">
                        {(todayLog?.zikirCount ?? 0).toLocaleString("id-ID")} / {settings.zikirTarget.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <ProgressBar value={zikirPct} className="mt-2 h-1.5" fillClass="bg-tk-lime" />
                  </li>
                  {/* Target harian */}
                  <li>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[12.5px] font-bold text-tk-ink">
                        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                          <Target size={13} />
                        </span>
                        Target Harian
                      </p>
                      <p className="tnum text-[12px] font-bold text-tk-ink">
                        {goalsDone}/{goalStats.length}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {goalStats.map((g) => (
                        <Chip key={g.goal.id} className={cn(g.done ? "border-tk-violet/35 bg-tk-lavender/60 text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent" : "border-tk-line")}>
                          {g.done ? "✓" : "○"} {g.goal.label.length > 18 ? `${g.goal.label.slice(0, 18)}…` : g.goal.label}
                        </Chip>
                      ))}
                    </div>
                  </li>
                </ul>

                {/* Amal & Jurnal: dua statistik inline */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-tk-line pt-4">
                  <div>
                    <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-tk-green-soft text-tk-green">
                      <HandCoins size={15} />
                    </span>
                    <p className="tnum mt-2 font-display text-[26px] font-bold leading-none text-tk-ink">{todayAmal}</p>
                    <p className="mt-1 text-[10.5px] leading-tight text-tk-muted">kebaikan dicatat hari ini</p>
                  </div>
                  <div>
                    <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-tk-blue-soft text-tk-blue dark:bg-tk-blue/20 dark:text-[#aebcff]">
                      <BookHeart size={15} />
                    </span>
                    <p className="mt-2 font-display text-[26px] font-bold leading-none text-tk-ink">{journal[today] ? "✓" : "–"}</p>
                    <p className="mt-1 text-[10.5px] leading-tight text-tk-muted">
                      {journal[today] ? `Jurnal syukur tersimpan${todayMood ? ` · mood ${moodLabel(todayMood)}` : ""}` : "Jurnal syukur belum diisi"}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </section>
          </div>

          {/* Panel kanan desktop: dua statistik — blok editorial, bukan kartu kembar */}
          <div className="mt-5 space-y-5 lg:col-span-5 lg:mt-0">
            <div className="rounded-[1.75rem] bg-tk-lavender p-5">
              <p className="gs-overline">Streak</p>
              <p className="gs-display mt-3 text-[44px] font-extrabold leading-none text-tk-ink">{streak}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-tk-ink/80">Hari beruntun 5 salat</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-tk-muted">Salah satu ukuran — bukan satu-satunya.</p>
            </div>
            <div className="glass rounded-[1.75rem] p-5">
              <p className="gs-overline">Minggu ini</p>
              <p className="gs-display mt-3 text-[44px] font-extrabold leading-none text-tk-ink">{weekStreak}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-tk-ink/80">Hari lengkap minggu ini</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-tk-muted">Hari dengan seluruh salat wajib tercatat.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ================= MINGGUAN ================= */}
      {period === "mingguan" ? (
        <div key="mingguan" className="tk-fade-in lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          <div className="space-y-5 lg:col-span-7">
            {/* Pola salat 7 hari */}
            <section aria-label="Pola salat minggu ini">
              <SectionHeader title="Perjalanan Salat Minggu Ini" caption="Senin sampai Minggu — kronologis kiri ke kanan" />
              <GlassCard className="p-4 sm:p-5">
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
                        <span className={cn("tnum text-[9.5px] font-bold", isToday ? "text-tk-ink" : "text-tk-muted/80")}>
                          {d.done > 0 ? d.done : ""}
                        </span>
                        <div className="flex min-h-0 w-full flex-1 items-end">
                          <div className="mx-auto flex h-full w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-full bg-tk-panel-soft">
                            {totalH > 0 ? (
                              <div
                                className="tk-bar-grow flex w-full flex-col justify-end"
                                style={{ height: barsIn ? `${Math.max(6, totalH)}%` : "0%", transitionDelay: `${idx * 55}ms` }}
                              >
                                {jamaahH > 0.5 ? <span className="w-full shrink-0 bg-tk-violet" style={{ height: `${(jamaahH / totalH) * 100}%` }} /> : null}
                                {mandiriH > 0.5 ? <span className="w-full shrink-0 bg-tk-violet/45" style={{ height: `${(mandiriH / totalH) * 100}%` }} /> : null}
                                {missedH > 0.5 ? <span className="w-full shrink-0 bg-tk-amber/60" style={{ height: `${(missedH / totalH) * 100}%` }} /> : null}
                                {unrecH > 0.5 ? <span className="w-full shrink-0 border-t border-dashed border-tk-line-strong bg-tk-track" style={{ height: `${(unrecH / totalH) * 100}%` }} /> : null}
                              </div>
                            ) : (
                              <span className="w-full border-t border-dashed border-tk-line-strong" />
                            )}
                          </div>
                        </div>
                        <span className={cn("text-[10px] leading-tight", isToday ? "font-bold text-tk-ink" : "text-tk-muted")}>
                          {weekdayShort(d.date)}
                          <span className={cn("tnum block text-[8.5px]", isToday ? "font-semibold text-tk-ink/80" : "text-tk-muted/70")}>{d.date.slice(-2)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-tk-line pt-3 text-[9.5px] text-tk-muted">
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-tk-violet" /> Berjamaah
                  </span>
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-tk-violet/45" /> Mandiri
                  </span>
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-tk-amber/60" /> Tidak dilaksanakan
                  </span>
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="h-2 w-2 rounded-full border border-dashed border-tk-line-strong" /> Belum dicatat
                  </span>
                </div>
              </GlassCard>
            </section>

            {/* Ringkasan kategori mingguan — baris daftar */}
            <section aria-label="Ringkasan kategori mingguan">
              <SectionHeader title="Aktivitas Minggu Ini" caption="Setiap kategori punya jalannya sendiri" />
              <GlassCard className="divide-y divide-tk-line-soft">
                {[
                  { icon: BookOpen, label: "Al-Qur'an", value: `${weekQuran.pages.toLocaleString("id-ID")} halaman · ${weekQuran.verses.toLocaleString("id-ID")} ayat` },
                  { icon: CircleDot, label: "Zikir", value: `${weekQuran.zikir.toLocaleString("id-ID")} hitungan` },
                  { icon: BookHeart, label: "Jurnal Syukur", value: `${weekJurnal} hari terisi` },
                  { icon: HandCoins, label: "Amal & Sedekah", value: `${weekAmal} kebaikan` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                      <Icon size={15} />
                    </span>
                    <p className="min-w-0 flex-1 text-[12.5px] font-semibold text-tk-ink">{label}</p>
                    <p className="shrink-0 text-[12px] font-bold text-tk-ink/85">{value}</p>
                  </div>
                ))}
              </GlassCard>
              <p className="mt-2 px-1 text-[10px] leading-relaxed text-tk-muted/80">
                Hari tanpa catatan tidak dihitung sebagai hari gagal — ia hanya hari yang belum mempunyai catatan.
              </p>
            </section>
          </div>

          {/* Strip minggu yang bisa digeser */}
          <section aria-label="Strip mingguan" className="mt-5 lg:col-span-5 lg:mt-0">
            <SectionHeader
              title="Kalender Mingguan"
              caption="Ketuk tanggal untuk melihat rincian hari itu"
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Minggu sebelumnya"
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel-soft text-tk-muted"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Minggu berikutnya"
                    disabled={!canGoNextWeek}
                    onClick={() => canGoNextWeek && setWeekOffset((w) => w + 1)}
                    className={cn("tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel-soft text-tk-muted", !canGoNextWeek && "opacity-30")}
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
                    ? "border border-dashed border-tk-line-strong"
                    : d.jamaah > 0
                      ? "bg-tk-violet"
                      : d.mandiri > 0
                        ? "bg-tk-violet/45"
                        : "bg-tk-amber";
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => !d.isFuture && setSelectedDate(d.key)}
                      aria-label={`Pilih ${formatDayFull(d.key)}`}
                      className={cn("tap flex flex-col items-center gap-1.5 rounded-2xl px-0.5 py-2 transition-colors hover:bg-tk-panel-soft", d.isFuture && "opacity-40")}
                    >
                      <span className={cn("text-[9.5px] font-semibold uppercase", d.isToday ? "text-tk-violet" : "text-tk-muted")}>
                        {weekdayShort(d.key)}
                      </span>
                      <span
                        className={cn(
                          "tnum flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                          d.isToday ? "gs-ink-btn" : "bg-tk-panel-soft text-tk-ink/85"
                        )}
                      >
                        {Number(d.key.slice(-2))}
                      </span>
                      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotCls)} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 border-t border-tk-line pt-2.5 text-[10px] leading-relaxed text-tk-muted">
                Titik menunjukkan cara salat terbanyak hari itu: orange penuh = berjamaah, orange redup = mandiri,
                amber = ada yang tidak dilaksanakan.
              </p>
            </GlassCard>
          </section>
        </div>
      ) : null}

      {/* ================= BULANAN ================= */}
      {period === "bulanan" ? (
        <div key="bulanan" className="tk-fade-in lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          <div className="space-y-5 lg:col-span-7">
            <section aria-label="Ringkasan bulanan">
              <GlassCard className="p-5">
                <StatRow
                  items={[
                    { value: summary.activeDays, label: "hari aktif" },
                    { value: perfectN, label: "hari lengkap" },
                    { value: summary.quranPages.toLocaleString("id-ID"), label: "hlm Qur'an" },
                  ]}
                />
              </GlassCard>
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
                      className="tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel-soft text-tk-muted"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Bulan berikutnya"
                      disabled={!canGoNextMonth}
                      onClick={() => canGoNextMonth && setMonthOffset((m) => m + 1)}
                      className={cn("tap flex h-8 w-8 items-center justify-center rounded-full border border-tk-line bg-tk-panel-soft text-tk-muted", !canGoNextMonth && "opacity-30")}
                    >
                      ›
                    </button>
                  </div>
                }
              />
              <GlassCard className="p-4 sm:p-5">
                {/* Heatmap pil: skala lavender + cincin hari ini */}
                <div className="grid grid-cols-7 gap-x-1 gap-y-2 text-center">
                  {DAY_LABELS.map((d) => (
                    <span key={d} className="pb-1 text-[10px] font-bold uppercase tracking-wide text-tk-muted/80">
                      {d}
                    </span>
                  ))}
                  {calendarWithStatus.map((cell, i) => {
                    if (!cell.key) return <span key={`blank-${i}`} aria-hidden className="aspect-[3/4]" />;
                    const intensity = cell.done / 5;
                    let tint: string | undefined;
                    if (!cell.isFuture && cell.hasData) {
                      if (cell.jamaah > 0) tint = `color-mix(in srgb, var(--color-tk-violet) ${Math.round(16 + intensity * 66)}%, transparent)`;
                      else if (cell.mandiri > 0) tint = `color-mix(in srgb, var(--color-tk-violet) ${Math.round(10 + intensity * 40)}%, transparent)`;
                      else tint = `color-mix(in srgb, var(--color-tk-amber) ${Math.round(12 + (cell.missed / 5) * 30)}%, transparent)`;
                    } else if (!cell.isFuture) {
                      tint = "var(--tk-empty-cell)";
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
                          "tap relative flex aspect-[3/4] flex-col items-center justify-center rounded-[0.9rem] text-[11px] font-semibold transition-colors",
                          cell.isFuture ? "opacity-35" : "text-tk-ink/90",
                          cell.isToday && "ring-2 ring-tk-violet"
                        )}
                        style={{ background: tint }}
                      >
                        <span className="tnum leading-none">{cell.day}</span>
                        {cell.hasData && !cell.isFuture ? (
                          <span aria-hidden className={cn("mt-1 h-[4px] w-[4px] rounded-full", cell.jamaah > 0 ? "bg-white" : "bg-tk-violet")} />
                        ) : (
                          <span aria-hidden className="mt-1 h-[4px] w-[4px] rounded-full bg-transparent" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Ringkasan tanggal terpilih */}
                <div key={selectedDate} className="tk-fade-in mt-4 rounded-2xl bg-tk-panel-soft p-3.5">
                  {selFuture ? (
                    <p className="text-center text-[11.5px] leading-relaxed text-tk-muted">
                      Tanggal ini belum berjalan — belum ada catatan, bukan hari gagal.
                    </p>
                  ) : selStatus.hasData || (selLog && ((selLog.quranPages ?? 0) > 0 || (selLog.quranVerses ?? 0) > 0 || (selLog.zikirCount ?? 0) > 0)) ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-bold text-tk-ink">{relativeDayLabel(selectedDate, today)}</p>
                        <p className="text-[10px] text-tk-muted">{formatDayFull(selectedDate)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Chip className="border-tk-violet/30 bg-tk-lavender/60 text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">Berjamaah {selStatus.jamaah}</Chip>
                        <Chip className="border-tk-line">Mandiri {selStatus.mandiri}</Chip>
                        {selStatus.missed > 0 ? (
                          <Chip className="border-tk-amber/40 bg-tk-amber-soft text-tk-amber">Tidak dilaksanakan {selStatus.missed}</Chip>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[10.5px] leading-relaxed text-tk-muted">
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
                    <p className="text-center text-[11.5px] leading-relaxed text-tk-muted">
                      {relativeDayLabel(selectedDate, today)} — belum ada catatan ibadah (bukan hari gagal).
                    </p>
                  )}
                </div>
              </GlassCard>
            </section>
          </div>

          <section aria-label="Kebiasaan bulan ini" className="mt-5 lg:col-span-5 lg:mt-0">
            <SectionHeader title="Kebiasaan Bulan Ini" caption="Aktivitas yang paling sering kamu jaga" />
            <GlassCard className="space-y-3.5 p-5">
              {topActivities.slice(0, 5).map((a, idx) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold",
                      idx === 0 ? "gs-ink-btn" : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-tk-ink/90">{a.label}</p>
                      <p className="tnum text-[11px] font-bold text-tk-muted">{a.count}x</p>
                    </div>
                    <ProgressBar value={(a.count / maxActivity) * 100} className="h-1.5" />
                  </div>
                </div>
              ))}
            </GlassCard>
          </section>
        </div>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[10px] text-tk-muted/60">
        <CalendarDays size={11} />
        Progress dihitung langsung dari catatan ibadah Anda — bukan perkiraan.
      </p>

      {patternDay ? <DayDetailSheet date={patternDay} onClose={() => setPatternDay(null)} /> : null}
      {selectedDate && period !== "harian" ? <DayDetailSheet date={selectedDate} onClose={() => setSelectedDate(today)} /> : null}
    </div>
  );
}
