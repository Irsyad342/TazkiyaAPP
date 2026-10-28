"use client";

/**
 * Tazkiya — Halaman Statistik.
 * Semua angka dihitung dari catatan pengguna (store), bukan data acak.
 */

import { useEffect, useState } from "react";
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
  SALAT_JUMAT,
  ZUHUR_ALTERNATIF,
  missReasonLabel,
  selectPrayerDetail,
  type PrayerId,
} from "@/lib/tazkiya/types";
import { formatDayFull, isFriday, formatDayMonth, lastNDays, relativeDayLabel, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { Chip, GlassCard, GlowOrb, IconBox, ProgressBar, SectionHeader } from "./ui-bits";
import { AreaChartLite } from "./AreaChartLite";
import { cn } from "@/lib/utils";

type Period = "mingguan" | "bulanan";

const DAY_LABELS = weekdayLabels();

/** Tema efektif (mengikuti setelan "Sistem") untuk gaya grafik & tooltip. */
function useResolvedTheme(): "dark" | "light" {
  const theme = useWorshipStore((s) => s.settings.theme);
  const [resolved, setResolved] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => setResolved(theme === "system" ? (mq.matches ? "light" : "dark") : theme);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return resolved;
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
  const reminderTimes = useWorshipStore((s) => s.settings.reminderTimes);
  const tracked = useWorshipStore((s) => s.settings.trackedExtras);
  const resolved = useResolvedTheme();
  const isLight = resolved === "light";

  const today = todayKey();
  const [period, setPeriod] = useState<Period>("mingguan");
  const [monthOffset, setMonthOffset] = useState(0);
  const [patternDay, setPatternDay] = useState<string | null>(null);

  const todayScore = dayScore(logs[today], today, tracked);
  const streak = computeStreak(logs, today);

  const series = seriesLastDays(logs, period === "mingguan" ? 7 : 30, today, tracked);
  const chartData = series.map((d) => ({
    label: period === "mingguan" ? weekdayShort(d.date) : String(d.date.slice(-2)),
    pct: d.pct,
    date: d.date,
  }));

  const keys = period === "mingguan" ? series.map((d) => d.date) : monthRange(today);
  const summary = summarizeRange(logs, keys, tracked);

  /** Pola 7 hari terakhir (data asli; Jumat = 1 slot Zuhur). */
  const pattern = prayerConsistency({
    prayerDetails,
    logs,
    dates: lastNDays(7, today),
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

  // Kalender heatmap: nilai pct per tanggal untuk bulan terpilih
  const calendar = monthCalendar(today, monthOffset);
  const calendarWithPct = calendar.map((cell) =>
    cell.key && !cell.isFuture ? { ...cell, pct: dayScore(logs[cell.key], cell.key, tracked).pct } : cell
  );
  const canGoNext = monthOffset < 0;

  return (
    <div className="space-y-6">
      {/* ---------- Judul ---------- */}
      <header className="animate-tz-fade-up flex items-end justify-between pt-1">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-gradient-violet">Statistik</h1>
          <p className="mt-1 text-sm text-tz-muted">Pantau konsistensi ibadahmu</p>
        </div>
      </header>

      {/* ---------- Ringkasan atas ---------- */}
      <section aria-label="Ringkasan utama" className="grid grid-cols-3 gap-3">
        <GlassCard className="p-3.5">
          <IconBox tone="violet" size="sm">
            <Activity />
          </IconBox>
          <p className="mt-3 font-display text-[21px] font-bold leading-none text-tz-ink">{todayScore.pct}%</p>
          <p className="mt-1 text-[10px] leading-tight text-tz-muted">Hari ini</p>
        </GlassCard>
        <GlassCard className="p-3.5">
          <IconBox tone="lavender" size="sm" className="border-amber-300/25 bg-amber-400/12 text-amber-300">
            <Flame />
          </IconBox>
          <p className="mt-3 font-display text-[21px] font-bold leading-none text-tz-ink">{streak}</p>
          <p className="mt-1 text-[10px] leading-tight text-tz-muted">Hari streak 5 salat</p>
        </GlassCard>
        <GlassCard className="p-3.5">
          <IconBox tone="lavender" size="sm" className="border-emerald-300/25 bg-emerald-400/12 text-emerald-300">
            <Trophy />
          </IconBox>
          <p className="mt-3 font-display text-[21px] font-bold leading-none text-tz-ink">{summary.perfectDays}</p>
          <p className="mt-1 text-[10px] leading-tight text-tz-muted">Hari sempurna</p>
        </GlassCard>
      </section>

      {/* ---------- Toggle periode ---------- */}
      <div className="glass flex rounded-2xl p-1.5" role="tablist" aria-label="Pilih periode">
        {(["mingguan", "bulanan"] as Period[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "tap flex-1 rounded-[0.7rem] py-2 text-sm font-semibold capitalize transition-all",
              period === p
                ? "border border-tz-violet/45 bg-gradient-to-r from-tz-purple to-tz-violet text-white shadow-[0_6px_20px_-6px_rgba(85,51,154,0.9),inset_0_1px_0_rgba(255,255,255,0.22)]"
                : "text-tz-muted hover:text-tz-accent"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ---------- Grafik ---------- */}
      <section aria-label="Grafik aktivitas">
        <SectionHeader
          title={period === "mingguan" ? "Aktivitas 7 Hari Terakhir" : "Aktivitas 30 Hari Terakhir"}
          caption="Persentase ibadah yang diselesaikan per hari"
        />
        <GlassCard className="p-4 pb-2">
          <GlowOrb className="-right-10 -top-12 h-32 w-32 bg-tz-violet/15" />
          <div className="relative h-56 w-full">
            <AreaChartLite
              data={chartData}
              isLight={isLight}
              step={period === "bulanan" ? 5 : 1}
              ariaLabel={period === "mingguan" ? "Grafik aktivitas 7 hari terakhir" : "Grafik aktivitas 30 hari terakhir"}
            />
          </div>
          <div className="glass-violet relative mb-2 mt-3 flex items-center justify-between rounded-[1.15rem] px-4 py-2.5">
            <p className="text-[11px] text-tz-accent/90">Rata-rata penyelesaian</p>
            <p className="font-display text-base font-bold text-tz-ink">{summary.avgPct}%</p>
          </div>
        </GlassCard>
      </section>

      {/* ---------- Kalender riwayat ---------- */}
      <section aria-label="Kalender riwayat ibadah">
        <SectionHeader title="Kalender Riwayat" caption="Semakin gelap, semakin lengkap ibadahmu" />
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => setMonthOffset((m) => m - 1)}
              className="tap flex h-9 w-9 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-accent transition-all hover:bg-tz-track"
            >
              <ChevronLeft size={17} />
            </button>
            <p className="font-display text-sm font-semibold text-tz-ink">{monthLabel(today, monthOffset)}</p>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={!canGoNext}
              onClick={() => setMonthOffset((m) => (canGoNext ? m + 1 : m))}
              className={cn(
                "tap flex h-9 w-9 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-accent transition-all hover:bg-tz-track",
                !canGoNext && "opacity-30"
              )}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DAY_LABELS.map((d) => (
              <span key={d} className="pb-1 text-[10px] font-medium text-tz-muted">
                {d}
              </span>
            ))}
            {calendarWithPct.map((cell, i) => {
              if (!cell.key) return <span key={`blank-${i}`} aria-hidden className="aspect-square" />;
              const pct = cell.pct ?? 0;
              const intensity = pct / 100;
              return (
                <span
                  key={cell.key}
                  title={`${formatDayMonth(cell.key)} — ${pct}% ibadah tercatat`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg text-[10px] font-semibold transition-colors",
                    cell.isFuture ? "bg-tz-panel-soft text-tz-ink/20" : "text-tz-ink/90",
                    cell.isToday && "ring-2 ring-tz-violet ring-offset-2 ring-offset-tz-frame"
                  )}
                  style={{
                    background:
                      !cell.isFuture && pct > 0
                        ? `rgba(156,114,239,${0.12 + intensity * 0.75})`
                        : cell.isFuture
                          ? undefined
                          : "var(--tz-empty-cell)",
                    boxShadow: !cell.isFuture && pct >= 100 ? "0 0 12px -2px rgba(156,114,239,0.8)" : undefined,
                  }}
                >
                  {cell.day}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-tz-muted">
            <span>Kosong</span>
            <span className="h-2.5 w-6 rounded-full bg-tz-track" />
            <span className="h-2.5 w-6 rounded-full" style={{ background: "rgba(156,114,239,0.3)" }} />
            <span className="h-2.5 w-6 rounded-full" style={{ background: "rgba(156,114,239,0.6)" }} />
            <span className="h-2.5 w-6 rounded-full bg-tz-violet" />
            <span>Sempurna</span>
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
                    ? "bg-gradient-to-br from-tz-violet to-tz-purple text-white shadow-[0_0_12px_-2px_rgba(156,114,239,0.8)]"
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

      {/* ---------- Pola Ibadah 7 Hari ---------- */}
      <section aria-label="Pola ibadah 7 hari">
        <SectionHeader title="Pola Ibadah 7 Hari" caption="Salat terlaksana per hari — ketuk hari untuk rincian" />
        <GlassCard className="p-4">
          <GlowOrb className="-left-10 -bottom-12 h-32 w-32 bg-tz-violet/15" />
          <div className="relative flex h-36 items-end justify-between gap-1.5">
            {pattern.days.map((d) => {
              const isToday = d.date === today;
              // Skala tetap 0–5 agar antarhari adil; kolom = slot yang sudah berlalu.
              const doneH = (d.done / 5) * 100;
              const missedH = (d.missed / 5) * 100;
              const unrecH = (d.unrecorded / 5) * 100;
              const totalH = doneH + missedH + unrecH;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setPatternDay(d.date)}
                  aria-label={`Rincian ${relativeDayLabel(d.date, today)} — ${d.done} salat terlaksana, ${d.missed} tidak dilaksanakan, ${d.unrecorded} belum dicatat`}
                  className="flex h-full flex-1 cursor-pointer flex-col items-center gap-1.5"
                >
                  <span className={cn("text-[9.5px] font-semibold tabular-nums", isToday ? "text-tz-accent" : "text-tz-muted/80")}>
                    {d.done > 0 ? d.done : ""}
                  </span>
                  <div className="flex min-h-0 w-full flex-1 items-end">
                    <div className="mx-auto flex h-full w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-full bg-tz-panel-strong">
                      {totalH > 0 ? (
                        <div className="flex w-full flex-col justify-end" style={{ height: `${Math.max(6, totalH)}%` }}>
                          {unrecH > 0.5 ? (
                            <span className="w-full shrink-0 border-t border-dashed border-tz-line-strong bg-tz-track" style={{ height: `${(unrecH / totalH) * 100}%` }} />
                          ) : null}
                          {missedH > 0.5 ? (
                            <span className="w-full shrink-0 bg-rose-400/45 light:bg-rose-300" style={{ height: `${(missedH / totalH) * 100}%` }} />
                          ) : null}
                          {doneH > 0.5 ? (
                            <span
                              className="w-full shrink-0 bg-gradient-to-t from-tz-purple via-tz-violet to-tz-lavender shadow-[0_0_12px_-2px_rgba(156,114,239,0.8)]"
                              style={{ height: `${(doneH / totalH) * 100}%` }}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <span className="w-full border-t border-dashed border-tz-line-strong" />
                      )}
                    </div>
                  </div>
                  <span className={cn("text-[10px] leading-tight", isToday ? "font-bold text-tz-accent" : "text-tz-muted")}>
                    {weekdayShort(d.date)}
                    <span className="block text-[8.5px] text-tz-muted/70">{d.date.slice(-2)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legenda + ringkasan berjamaah/mandiri/tidak dilaksanakan */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-tz-muted">
            <span className="flex items-center gap-1">
              <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-t from-tz-purple to-tz-violet" /> Terlaksana
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
