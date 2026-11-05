"use client";

/**
 * Tazkiya v4 — Beranda "A Better Daily Journey" — komposisi BARU:
 * A. Header personal: logo, sapaan waktu, nama besar, tanggal Masehi &
 *    Hijriah, avatar, notifikasi.
 * B. Hero Sholat Berikutnya: waktu raksasa Outfit, countdown lime,
 *    timeline horizontal lima waktu dengan indikator posisi sekarang.
 * C. Overview Ibadah editorial: cincin persentase besar + baris aktivitas
 *    tercatat + ringkasan target harian (bukan strip kartu seragam).
 * D. Mood Check-in interaktif (MoodSection).
 * E. Jelajahi Aktivitas: tiga komposisi berbeda (JelajahiAktivitas).
 * F. Pekan Ini: bar mingguan dari data nyata.
 * G. Target Harian (atur/toggle/hapus — logika lama utuh).
 * H. Daily Barakah & Doa Hari Ini: blok editorial tenang.
 * Pencatatan salat tetap di halaman Sholat. Desktop: grid 12 kolom.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Check,
  MoonStar,
  Plus,
  Settings2,
  Sparkles,
  Sunrise,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { PrayerId } from "@/lib/tazkiya/types";
import { formatGregorian, formatHijri, todayKey } from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { formatCountdown, goalStatuses, nextPrayerState } from "@/lib/tazkiya/goals";
import { barakahOfTheDay } from "@/lib/tazkiya/barakah";
import { duaOfTheDay } from "@/lib/tazkiya/duas";
import { Chip, ConfirmButton, GlassCard, ProgressBar, SectionHeader } from "./ui-bits";
import { MoodSection } from "./MoodSection";
import { JelajahiAktivitas } from "./JelajahiAktivitas";
import type { SubPageId, TabId } from "./BottomNav";
import { cn } from "@/lib/utils";

const PRAYER_ORDER: { id: PrayerId; label: string }[] = [
  { id: "subuh", label: "Subuh" },
  { id: "zuhur", label: "Zuhur" },
  { id: "asar", label: "Asar" },
  { id: "magrib", label: "Magrib" },
  { id: "isya", label: "Isya" },
];

/** Tanggal & jam hari ini (YYYY-MM-DD lokal); diperbarui tiap 30 detik / saat tab aktif. */
function useToday(): string {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const update = () => {
      const key = todayKey();
      setToday((prev) => (prev === key ? prev : key));
    };
    const interval = window.setInterval(update, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  return today;
}

/* ---------------- B. Hero Sholat Berikutnya (komposisi baru v4) ---------------- */

function NextPrayerHero({ today }: { today: string }) {
  const settings = useWorshipStore((s) => s.settings);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const logs = useWorshipStore((s) => s.logs);
  const animations = useWorshipStore((s) => s.settings.animations);

  const times = useMemo(() => resolvePrayerSchedule(settings, today), [settings, today]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const state = nextPrayerState(times, now);
  const nextLabel = PRAYER_ORDER.find((p) => p.id === state.next)?.label ?? state.next;

  /** Status satu slot waktu: lewat / berjalan / berikutnya / belum. */
  const slotState = (id: PrayerId): "past" | "current" | "next" | "future" => {
    if (id === state.next) return "next";
    if (state.current === id) return "current";
    const idx = PRAYER_ORDER.findIndex((p) => p.id === id);
    const nextIdx = PRAYER_ORDER.findIndex((p) => p.id === state.next);
    if (idx < nextIdx) return "past";
    return "future";
  };

  const scheduleSource = settings.geo
    ? `Jadwal otomatis · ${settings.geo.label ?? "lokasi perangkat"}`
    : "Jadwal manual di Profil";

  return (
    <section aria-label="Salat berikutnya" className="animate-tz-fade-up">
      <GlassCard className="overflow-hidden p-0">
        <div className="relative p-5 pb-4 sm:p-6">
          {/* cincin dekoratif garis — geometris, tanpa gradien */}
          <svg aria-hidden viewBox="0 0 120 120" className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 text-tz-lavender">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
            <circle cx="60" cy="8" r="3.2" fill="#D5F76A" />
          </svg>

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tz-muted">
                Sholat Berikutnya
              </p>
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-bold text-tz-lime-ink",
                  animations && "animate-tz-pulse"
                )}
                style={{ background: "var(--color-tz-lime)" }}
              >
                {formatCountdown(state.secondsLeft)} lagi
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="tnum font-display text-[64px] font-bold leading-[0.95] tracking-[-0.03em] text-tz-ink sm:text-[76px]">
                {state.nextTime}
              </p>
              <div className="pb-2">
                <p className="font-display text-[22px] font-bold leading-none text-tz-violet">
                  {nextLabel}
                  {state.tomorrow ? <span className="text-[13px] font-semibold text-tz-muted"> · besok</span> : null}
                </p>
                <p className="mt-1 text-[11px] font-medium text-tz-muted">
                  {state.tomorrow
                    ? "Menunggu Subuh esok hari"
                    : `${PRAYER_ORDER.find((p) => p.id === state.current)?.label ?? "-"} sedang berlangsung`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline lima waktu — indikator posisi sekarang */}
        <div className="relative border-t border-tz-line px-5 pb-4 pt-4 sm:px-6">
          <div className="relative" role="group" aria-label="Lima waktu salat hari ini">
            <span aria-hidden className="absolute inset-x-4 top-[6px] h-px bg-tz-line-strong" />
            <div className="relative grid grid-cols-5 gap-1">
              {PRAYER_ORDER.map(({ id, label }) => {
                const st = slotState(id);
                const done = prayerDetails[today]?.[id]?.status === "done" || logs[today]?.prayers?.[id];
                return (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "h-3 w-3 rounded-full border-2 transition-all",
                        st === "next"
                          ? "animate-tz-pulse border-tz-violet bg-tz-lime"
                          : st === "past" || st === "current"
                            ? "border-tz-violet bg-tz-violet"
                            : "border-tz-line-strong bg-tz-panel"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-bold leading-none",
                        st === "next" ? "text-tz-ink" : "text-tz-muted"
                      )}
                    >
                      {label}
                    </span>
                    <span
                      className={cn(
                        "tnum text-[9.5px] leading-none",
                        done ? "font-bold text-tz-violet" : st === "next" ? "font-semibold text-tz-ink/80" : "text-tz-muted"
                      )}
                    >
                      {done ? "✓" : times[id]?.time ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-tz-muted">
            <Sparkles size={11} className="shrink-0 text-tz-violet" />
            {scheduleSource}
          </p>
        </div>
      </GlassCard>
    </section>
  );
}

/* ---------------- C. Overview Ibadah Hari Ini (editorial) ---------------- */

function DailyOverview({
  today,
  onNavigate,
  onOpenSubpage,
}: {
  today: string;
  onNavigate: (tab: TabId) => void;
  onOpenSubpage: (sub: SubPageId) => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const log = useWorshipStore((s) => s.logs[today]);
  const dailyGoals = useWorshipStore((s) => s.dailyGoals);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const goalDone = useWorshipStore((s) => s.goalDone);

  const prayersDone = PRAYER_ORDER.filter((p) => log?.prayers?.[p.id]).length;
  const quran = log?.quranPages ?? 0;
  const zikir = log?.zikirCount ?? 0;

  const quranPct = Math.min(100, (quran / Math.max(1, settings.quranDailyTarget)) * 100);
  const zikirPct = Math.min(100, (zikir / Math.max(1, settings.zikirTarget)) * 100);
  const salatPct = (prayersDone / 5) * 100;
  const overall = Math.round((salatPct + quranPct + zikirPct) / 3);
  const recorded = [prayersDone > 0, quran > 0, zikir > 0].filter(Boolean).length;

  const goalStatusesToday = useMemo(
    () =>
      goalStatuses(dailyGoals, today, {
        logs: useWorshipStore.getState().logs,
        prayerDetails,
        zikirSessions,
        amalEntries,
        goalDone,
        subuhOntime: null,
      }),
    [dailyGoals, today, prayerDetails, zikirSessions, amalEntries, goalDone]
  );
  const goalsDone = goalStatusesToday.filter((g) => g.done).length;

  const rows = [
    {
      label: "Salat lima waktu",
      value: `${prayersDone}/5`,
      pct: salatPct,
      onClick: () => onNavigate("sholat"),
    },
    {
      label: "Bacaan Al-Qur'an",
      value: `${quran}/${settings.quranDailyTarget} hlm`,
      pct: quranPct,
      onClick: () => onNavigate("quran"),
    },
    {
      label: "Zikir hari ini",
      value: zikir.toLocaleString("id-ID"),
      pct: zikirPct,
      onClick: () => onOpenSubpage("zikir-doa"),
    },
  ];

  return (
    <section aria-label="Ringkasan ibadah hari ini" className="animate-tz-fade-up">
      <SectionHeader
        title="Ibadah Hari Ini"
        caption="Semua yang kamu catat sejak bangun pagi"
      />
      <GlassCard className="p-5">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-7">
          {/* Cincin persentase besar */}
          <div className="relative shrink-0">
            <Ring percent={overall} />
          </div>

          {/* Baris aktivitas */}
          <div className="w-full min-w-0 flex-1 space-y-4">
            {rows.map(({ label, value, pct, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                aria-label={`${label}: ${value} — buka detail`}
                className="tap block w-full text-left"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-semibold text-tz-ink/90">{label}</span>
                  <span className="tnum text-[13px] font-bold text-tz-ink">{value}</span>
                </div>
                <ProgressBar value={pct} className="mt-1.5 h-1.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-tz-line pt-3.5">
          <p className="text-[11px] font-medium text-tz-muted">
            <span className="tnum font-bold text-tz-ink">{recorded}</span> jenis aktivitas tercatat · target harian{" "}
            <span className="tnum font-bold text-tz-ink">
              {goalsDone}/{goalStatusesToday.length}
            </span>
          </p>
          <button
            type="button"
            onClick={() => onNavigate("progress")}
            className="tap flex items-center gap-0.5 text-[11.5px] font-bold text-tz-violet"
          >
            Lihat analitik <ChevronRight size={14} />
          </button>
        </div>
      </GlassCard>
    </section>
  );
}

/** Cincin besar editorial: busur lavender + titik lime + persentase Outfit. */
function Ring({ percent }: { percent: number }) {
  const size = 132;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-tz-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-tz-violet"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {/* titik aksen lime di ujung busur */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-tz-lime shadow-[0_0_0_3px_rgba(213,247,106,0.35)]"
        style={{
          transform: `translate(-50%, -50%) rotate(${(clamped / 100) * 360}deg) translateY(-${r}px)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum font-display text-[30px] font-bold leading-none text-tz-ink">{clamped}%</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-tz-muted">Hari ini</span>
      </div>
    </div>
  );
}

/* ---------------- F. Pekan Ini (bar mingguan editorial) ---------------- */

function WeeklyBars({ today }: { today: string }) {
  const logs = useWorshipStore((s) => s.logs);
  /** Senin-minggu pekan ini (kronologis) — tanggal lokal dari lib dates. */
  const week = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // Senin = 0
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = Object.values(logs[key]?.prayers ?? {}).filter(Boolean).length;
      return { key, label: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i], count, isToday: key === today, isFuture: key > today };
    });
  }, [logs, today]);

  const total = week.reduce((a, w) => a + w.count, 0);
  const best = Math.max(1, ...week.map((w) => w.count));

  return (
    <section aria-label="Pekan ini" className="animate-tz-fade-up">
      <SectionHeader
        title="Pekan Ini"
        caption="Konsistensi salat tujuh hari terakhir"
        action={<Chip className="border-tz-violet/25 bg-tz-lavender/60 text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">{total} salat</Chip>}
      />
      <GlassCard className="p-5">
        <div className="grid grid-cols-7 gap-2" role="group" aria-label="Salat tercatat per hari pekan ini">
          {week.map(({ label, count, isToday, isFuture }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "tnum text-[10px] font-bold leading-none",
                  isFuture ? "text-transparent" : count > 0 ? "text-tz-ink" : "text-tz-muted/50"
                )}
              >
                {count === 0 ? "–" : count}
              </span>
              <div aria-hidden className="flex h-[76px] w-full items-end justify-center">
                <span
                  className={cn(
                    "tz-bar-grow w-full max-w-[22px] rounded-full",
                    count === 0 ? "h-[4px] bg-tz-track" : isToday ? "bg-tz-lime" : "bg-tz-violet"
                  )}
                  style={{ height: count === 0 ? 4 : `${Math.max(8, (count / best) * 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[9.5px] font-semibold leading-none",
                  isToday ? "font-bold text-tz-ink" : isFuture ? "text-tz-muted/40" : "text-tz-muted"
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

/* ---------------- G. Target Harian ---------------- */

function DailyJourney({ today }: { today: string }) {
  const dailyGoals = useWorshipStore((s) => s.dailyGoals);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const goalDone = useWorshipStore((s) => s.goalDone);
  const toggleGoalDone = useWorshipStore((s) => s.toggleGoalDone);
  const toggleDailyGoalEnabled = useWorshipStore((s) => s.toggleDailyGoalEnabled);
  const addDailyGoal = useWorshipStore((s) => s.addDailyGoal);
  const deleteDailyGoal = useWorshipStore((s) => s.deleteDailyGoal);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const statuses = useMemo(
    () =>
      goalStatuses(dailyGoals, today, {
        logs,
        prayerDetails,
        zikirSessions,
        amalEntries,
        goalDone,
        subuhOntime: null,
      }),
    [dailyGoals, today, logs, prayerDetails, zikirSessions, amalEntries, goalDone]
  );

  const doneCount = statuses.filter((s) => s.done).length;
  const pct = statuses.length > 0 ? Math.round((doneCount / statuses.length) * 100) : 0;

  return (
    <section aria-label="Target harian" className="animate-tz-fade-up">
      <SectionHeader
        title="Target Harian"
        caption="Perjalanan kecil yang menjaga istiqamah — bukan penilaian diri"
        action={
          <Chip
            className={cn(
              doneCount === statuses.length && statuses.length > 0
                ? "border-tz-violet/30 bg-tz-lavender/60 text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent"
                : "border-tz-line"
            )}
          >
            {doneCount}/{statuses.length}
          </Chip>
        }
      />
      <GlassCard className="p-4">
        <ProgressBar value={pct} className="mb-3.5 h-1.5" fillClass="bg-tz-lime" />

        <ul className="space-y-1.5" role="group" aria-label="Daftar target harian">
          {statuses.map(({ goal, done, auto }) => (
            <li key={goal.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={`Target: ${goal.label} — ${done ? "tercapai" : "belum tercapai"}`}
                onClick={() => {
                  // Target otomatis yang sudah tercapai dari catatan nyata tidak
                  // bisa "dibatalkan" lewat ketukan — beri penjelasan, jangan
                  // biarkan tombol terasa mati.
                  if (goal.auto && done) {
                    toast.info("Target ini tercapai otomatis dari catatan ibadahmu hari ini");
                    return;
                  }
                  toggleGoalDone(today, goal.id);
                  if (!done && goal.auto === "amal-hari-ini") {
                    toast.success("MasyaAllah, satu kebaikan hari ini 🌱");
                  }
                }}
                className={cn(
                  "tap flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all",
                  done ? "border-tz-violet/40 bg-tz-lavender/50 dark:bg-tz-accent/10" : "border-tz-line bg-tz-panel hover:border-tz-violet/35"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                    done ? "border-transparent bg-tz-ink text-tz-lime" : "border-dashed border-tz-line-strong text-transparent"
                  )}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[12.5px] font-semibold leading-snug", done ? "text-tz-ink" : "text-tz-ink/85")}>
                    {goal.label}
                  </span>
                  {auto ? (
                    <span className="mt-0.5 block text-[9.5px] font-medium text-tz-muted/85">
                      Otomatis dari catatan ibadahmu
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Editor target */}
        {editing ? (
          <div className="tz-fade-in mt-3 space-y-2.5 rounded-2xl border border-tz-line bg-tz-panel-soft p-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">Atur target harian</p>
            <ul className="space-y-1.5">
              {dailyGoals.map((g) => (
                <li key={g.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={g.enabled}
                    onClick={() => toggleDailyGoalEnabled(g.id)}
                    className={cn("tap relative h-5 w-9 shrink-0 rounded-full transition-colors", g.enabled ? "bg-tz-violet" : "bg-tz-track")}
                    aria-label={`${g.enabled ? "Matikan" : "Aktifkan"} target ${g.label}`}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                        g.enabled ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                  <span className={cn("min-w-0 flex-1 truncate text-[12px]", g.enabled ? "text-tz-ink" : "text-tz-muted line-through")}>
                    {g.label}
                  </span>
                  {g.custom ? (
                    <ConfirmButton
                      label={`Hapus target ${g.label}`}
                      title={`Hapus target "${g.label}"?`}
                      description="Target pribadi ini akan dihapus dari daftar. Catatan ibadah yang sudah ada tidak terpengaruh."
                      onConfirm={() => deleteDailyGoal(g.id)}
                      className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                    >
                      <Trash2 size={13} />
                    </ConfirmButton>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                maxLength={80}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    addDailyGoal(draft);
                    setDraft("");
                  }
                }}
                placeholder="Tambah target pribadi…"
                aria-label="Tambah target pribadi"
                className="tz-field flex-1 py-2 text-[12px]"
              />
              <button
                type="button"
                aria-label="Simpan target baru"
                onClick={() => {
                  if (!draft.trim()) return;
                  addDailyGoal(draft);
                  setDraft("");
                  toast.success("Target pribadi ditambahkan");
                }}
                className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tz-ink text-tz-lime"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[10px] leading-relaxed text-tz-muted/80">
            {doneCount === statuses.length && statuses.length > 0
              ? "MasyaAllah, semua target hari ini tercapai — syukur itu dari Allah."
              : "Satu langkah kecil setiap hari sudah berarti."}
          </p>
          <button
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing((v) => !v)}
            className="tap flex shrink-0 items-center gap-1 rounded-full border border-tz-line-strong bg-tz-panel px-2.5 py-1 text-[10.5px] font-semibold text-tz-ink"
          >
            <Settings2 size={12} /> Atur
          </button>
        </div>
      </GlassCard>
    </section>
  );
}

/* ---------------- H. Daily Barakah (blok editorial tenang) ---------------- */

function DailyBarakah() {
  const today = todayKey();
  const b = barakahOfTheDay(today);
  const rows: { icon: typeof Sunrise; label: string; text: string }[] = [
    { icon: Sunrise, label: "Niat hari ini", text: b.niat },
    { icon: MoonStar, label: "Setelah Subuh", text: b.subuh },
    { icon: Sparkles, label: "Motivasi", text: b.motivasi },
    { icon: Target, label: "Target kecil", text: b.target },
  ];
  return (
    <section aria-label="Daily Barakah" className="animate-tz-fade-up">
      <SectionHeader title="Daily Barakah" caption="Pengingat & refleksi untuk hari ini" />
      <GlassCard variant="violet" className="p-5">
        <ul className="space-y-3.5">
          {rows.map(({ icon: Icon, label, text }, i) => (
            <li key={label} className={cn("flex items-start gap-3", i > 0 && "border-t border-tz-violet/20 pt-3.5")}>
              <span
                aria-hidden
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-tz-violet dark:bg-white/10 dark:text-tz-accent"
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-tz-violet/90 dark:text-tz-accent/90">{label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-tz-ink/90">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}

/* ---------------- Beranda ---------------- */

export function HomePage({
  onNavigate,
  onOpenSubpage,
}: {
  onNavigate: (tab: TabId) => void;
  onOpenSubpage: (sub: SubPageId) => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const dua = duaOfTheDay(todayKey());
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) return "Selamat pagi";
    if (h >= 11 && h < 15) return "Selamat siang";
    if (h >= 15 && h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const today = useToday();

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      {/* ---------- A. Header personal ---------- */}
      <header className="animate-tz-fade-up pt-1 lg:col-span-12">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tz-violet font-display text-base font-bold text-white">ت</span>
            <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-tz-ink">
              Tazkiya<span className="text-tz-violet">.</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notifikasi"
              onClick={() => toast.info("Belum ada notifikasi baru")}
              className="tap glass relative flex h-10 w-10 items-center justify-center rounded-full text-tz-muted"
            >
              <Bell size={16} />
              <span aria-hidden className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tz-lime" />
            </button>
            <button type="button" aria-label="Buka profil" onClick={() => onNavigate("profil")} className="tap relative">
              {settings.avatarDataUrl ? (
                <img
                  src={settings.avatarDataUrl}
                  alt={`Foto profil ${settings.name}`}
                  className="h-11 w-11 rounded-full border-2 border-tz-lavender object-cover dark:border-tz-lav-deco"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-tz-lavender bg-tz-violet font-display text-lg font-bold text-white dark:border-tz-lav-deco">
                  {settings.name.trim().charAt(0).toUpperCase() || "T"}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 px-0.5">
          <p className="text-[11.5px] font-semibold text-tz-muted">
            {greeting} · Assalamu&apos;alaikum
          </p>
          <h1 className="mt-0.5 truncate font-display text-[30px] font-bold leading-tight tracking-[-0.025em] text-tz-ink sm:text-[34px]">
            {settings.name || "Sahabat Tazkiya"}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-tz-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} className="text-tz-violet" />
              {formatGregorian(new Date())}
            </span>
            {formatHijri(new Date()) ? (
              <span className="rounded-full bg-tz-lavender/60 px-2 py-0.5 text-[10px] font-semibold text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">
                {formatHijri(new Date())}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      {/* ---------- B. Hero sholat berikutnya ---------- */}
      <div className="mt-6 lg:col-span-12">
        <NextPrayerHero today={today} />
      </div>

      {/* ---------- C. Overview editorial ---------- */}
      <div className="mt-6 lg:col-span-7">
        <DailyOverview today={today} onNavigate={onNavigate} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- D. Mood check-in ---------- */}
      <div className="mt-6 lg:col-span-5">
        <MoodSection today={today} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- E. Jelajahi aktivitas ---------- */}
      <div className="mt-6 lg:col-span-5">
        <JelajahiAktivitas today={today} onOpen={onOpenSubpage} />
      </div>

      {/* ---------- F. Pekan ini ---------- */}
      <div className="mt-6 lg:col-span-7">
        <WeeklyBars today={today} />
      </div>

      {/* ---------- G. Target harian ---------- */}
      <div className="mt-6 lg:col-span-12">
        <DailyJourney today={today} />
      </div>

      {/* ---------- H. Daily Barakah ---------- */}
      <div className="mt-6 lg:col-span-7">
        <DailyBarakah />
      </div>

      {/* ---------- I. Doa hari ini ---------- */}
      <div className="mt-6 lg:col-span-5">
        <section aria-label="Doa hari ini" className="animate-tz-fade-up">
          <SectionHeader title="Doa Hari Ini" caption={dua.title} />
          <GlassCard className="p-5">
            <span aria-hidden className="pointer-events-none absolute left-4 top-2 font-display text-[44px] leading-none text-tz-lavender select-none">
              &ldquo;
            </span>
            {dua.arabic ? <p className="quran-arabic relative mt-4 text-right text-[22px] leading-[2] text-tz-ink">{dua.arabic}</p> : null}
            {dua.transliteration ? <p className="relative mt-2.5 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p> : null}
            <p className="relative mt-2 text-[12.5px] leading-relaxed text-tz-ink/95">{dua.meaning}</p>
            {dua.source ? (
              <div className="mt-3.5">
                <Chip className="border-tz-violet/25 bg-tz-lavender/60 text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">{dua.source}</Chip>
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between border-t border-tz-line pt-3">
              <p className="text-[10px] font-semibold text-tz-violet/90 dark:text-tz-accent/90">Tazkiya, teman ibadah harianmu</p>
              <p className="text-[10px] text-tz-muted/70">Berganti setiap hari</p>
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
