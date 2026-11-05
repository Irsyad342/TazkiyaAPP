"use client";

/**
 * Tazkiya v6 — Beranda "Ember" — DIBANGUN DARI NOL mengikuti bahasa visual
 * referensi (task planner premium gelap + aksen orange):
 * A. Header personal: avatar bulat + sapaan, nama tegas, tanggal Masehi &
 *    Hijriah.
 * B. Compact date selector: tujuh pil tanggal pekan ini — hari ini ORANGE;
 *    hari ber-catatan diberi titik hijau; ketuk hari → detail hari itu
 *    (DayDetailSheet, data nyata).
 * C. Featured Sholat Berikutnya: blok ORANGE pekat — countdown Manrope
 *    besar, lima slot status hari ini.
 * D. Ringkasan Ibadah: kartu cincin persentase + tiga baris progres
 *    (Salat, Al-Qur'an, Zikir) menuju halaman masing-masing.
 * E. Target Hari Ini: daftar periksa gaya "Today's Task" (logika utuh).
 * F. Mood Check-in (MoodSection).
 * G. Pekan Ini: batang konsistensi tujuh hari.
 * H. Jelajahi Aktivitas (JelajahiAktivitas).
 * I. Doa Hari Ini + Daily Barakah: blok editorial tenang.
 * Pencatatan salat tetap di halaman Sholat. Semua logika data tidak berubah.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { PrayerId } from "@/lib/tazkiya/types";
import { formatGregorian, formatHijri, todayKey } from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { formatCountdown, goalStatuses, nextPrayerState } from "@/lib/tazkiya/goals";
import { barakahOfTheDay } from "@/lib/tazkiya/barakah";
import { duaOfTheDay } from "@/lib/tazkiya/duas";
import { ConfirmButton, ProgressBar, SectionHeader } from "./ui-bits";
import { MoodSection } from "./MoodSection";
import { JelajahiAktivitas } from "./JelajahiAktivitas";
import { DayDetailSheet } from "./DayDetailSheet";
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

/* ---------------- B. Compact date selector — tujuh pil tanggal ---------------- */

function WeekDateStrip({ today }: { today: string }) {
  const logs = useWorshipStore((s) => s.logs);
  const [selected, setSelected] = useState<string | null>(null);

  /** Senin-minggu pekan ini (kronologis) — tanggal lokal dari lib dates. */
  const week = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // Senin = 0
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = Object.values(logs[key]?.prayers ?? {}).filter(Boolean).length;
      return { key, dayNum: d.getDate(), label: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i], count, isToday: key === today, isFuture: key > today };
    });
  }, [logs, today]);

  return (
    <section aria-label="Pilih tanggal pekan ini" className="animate-tz-fade-up">
      <div className="no-scrollbar flex items-stretch gap-1.5 overflow-x-auto" role="group">
        {week.map(({ key, dayNum, label, count, isToday, isFuture }) => (
          <button
            key={key}
            type="button"
            disabled={isFuture}
            aria-label={`${isToday ? "Hari ini" : "Tanggal"} ${key}${count > 0 ? ` — ${count} salat tercatat` : ""}`}
            aria-pressed={isToday}
            onClick={() => !isFuture && setSelected(key)}
            className={cn(
              "tap flex min-w-[46px] flex-1 flex-col items-center gap-1 rounded-[0.95rem] px-1 py-2.5 transition-colors",
              isToday ? "bg-tz-violet" : "bg-tz-panel",
              isFuture ? "opacity-40" : "cursor-pointer"
            )}
          >
            <span className={cn("v5-display text-[16px] font-extrabold leading-none", isToday ? "text-white" : "text-tz-ink")}>
              {dayNum}
            </span>
            <span className={cn("text-[9.5px] font-semibold leading-none", isToday ? "text-white/85" : "text-tz-muted")}>
              {label}
            </span>
            <span
              aria-hidden
              className={cn(
                "h-[4px] w-[4px] rounded-full",
                isToday ? "bg-white/90" : count > 0 ? "bg-tz-green" : "bg-transparent"
              )}
            />
          </button>
        ))}
      </div>
      {selected ? <DayDetailSheet date={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

/* ---------------- C. Featured Sholat Berikutnya (blok ORANGE) ---------------- */

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
    : "Jadwal manual — atur lokasi di Profil";

  return (
    <section aria-label="Salat berikutnya" className="animate-tz-fade-up">
      <div className="glass-hero rounded-[1.6rem] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/75">Sholat Berikutnya</p>
          <span
            className={cn(
              "rounded-full bg-white/18 px-3 py-1.5 text-[11.5px] font-bold text-white backdrop-blur-sm",
              animations && "animate-tz-pulse"
            )}
          >
            {formatCountdown(state.secondsLeft)} lagi
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <p className="v5-display text-[52px] font-extrabold leading-[0.9] text-white sm:text-[60px]">
            {state.nextTime}
          </p>
          <div className="pb-1.5">
            <p className="text-[17px] font-bold leading-tight tracking-[-0.01em] text-white">
              {nextLabel}
              {state.tomorrow ? <span className="text-[12.5px] font-semibold text-white/75"> · besok</span> : null}
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium text-white/75">
              {state.tomorrow
                ? "Menunggu Subuh esok hari"
                : `${PRAYER_ORDER.find((p) => p.id === state.current)?.label ?? "-"} sedang berlangsung`}
            </p>
          </div>
        </div>

        {/* Lima slot status hari ini */}
        <div className="mt-5 flex items-center gap-1.5" role="img" aria-label="Status lima waktu salat hari ini">
          {PRAYER_ORDER.map(({ id }) => {
            const st = slotState(id);
            const done = prayerDetails[today]?.[id]?.status === "done" || logs[today]?.prayers?.[id];
            const missed = prayerDetails[today]?.[id]?.status === "missed";
            return (
              <span
                key={id}
                aria-hidden
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  done ? "bg-white" : missed ? "bg-[#FFD8A8]" : st === "next" ? "bg-white/85" : "bg-white/25"
                )}
              />
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[10.5px] font-medium text-white/70">
          <Sparkles size={11} className="shrink-0 text-white/80" />
          {scheduleSource}
        </p>
      </div>
    </section>
  );
}

/* ---------------- D. Ringkasan Ibadah — kartu ring + tiga progres ---------------- */

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
        action={
          <button
            type="button"
            onClick={() => onNavigate("progress")}
            className="tap flex items-center gap-0.5 text-[12px] font-bold text-tz-accent"
          >
            Analitik <ChevronRight size={14} />
          </button>
        }
      />

      <div className="glass rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex items-center gap-5 sm:gap-7">
          {/* Cincin persentase — ORANGE */}
          <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: 96, height: 96 }}>
            <svg width={96} height={96} className="-rotate-90">
              <circle cx={48} cy={48} r={42} fill="none" strokeWidth={8} className="stroke-tz-track" />
              <circle
                cx={48}
                cy={48}
                r={42}
                fill="none"
                strokeWidth={8}
                strokeLinecap="round"
                className="stroke-tz-violet"
                strokeDasharray={`${(Math.max(0, Math.min(100, overall)) / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="v5-display text-[24px] font-extrabold leading-none text-tz-ink">{overall}%</span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-tz-muted">Hari ini</span>
            </div>
          </div>

          {/* Baris aktivitas — hairline tipis */}
          <div className="w-full min-w-0 flex-1">
            {rows.map(({ label, value, pct, onClick }, i) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                aria-label={`${label}: ${value} — buka detail`}
                className={cn("tap block w-full py-2.5 text-left", i > 0 && "border-t border-tz-line-soft")}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium text-tz-ink/90">{label}</span>
                  <span className="tnum shrink-0 text-[13px] font-bold text-tz-ink">{value}</span>
                </div>
                <ProgressBar value={pct} className="mt-1.5 h-1" />
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 border-t border-tz-line-soft pt-3 text-[11px] leading-relaxed text-tz-muted">
          <span className="tnum font-bold text-tz-ink">{recorded}</span> jenis aktivitas tercatat · target harian{" "}
          <span className="tnum font-bold text-tz-ink">
            {goalsDone}/{goalStatusesToday.length}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ---------------- G. Pekan Ini — batang tipis ---------------- */

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
        action={<span className="tnum text-[12px] font-bold text-tz-ink">{total} salat</span>}
      />
      <div className="glass rounded-[1.5rem] p-4">
        <div className="grid grid-cols-7 gap-2 sm:gap-3" role="group" aria-label="Salat tercatat per hari pekan ini">
          {week.map(({ label, count, isToday, isFuture }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "tnum text-[10.5px] font-bold leading-none",
                  isFuture ? "text-transparent" : count > 0 ? "text-tz-ink" : "text-tz-deep"
                )}
              >
                {count === 0 ? "–" : count}
              </span>
              <div aria-hidden className="flex h-[62px] w-full items-end justify-center">
                <span
                  className={cn(
                    "tz-bar-grow w-full max-w-[24px] rounded-full",
                    count === 0 ? "h-[3px] bg-tz-track" : isToday ? "bg-tz-violet" : "bg-tz-line-strong"
                  )}
                  style={{ height: count === 0 ? 3 : `${Math.max(8, (count / best) * 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-none",
                  isToday ? "font-bold text-tz-ink" : isFuture ? "text-tz-deep" : "text-tz-muted"
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- E. Target Hari Ini — daftar periksa "Today's Task" ---------------- */

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
        title="Target Hari Ini"
        caption="Perjalanan kecil yang menjaga istiqamah — bukan penilaian diri"
        action={
          <span className="tnum text-[12px] font-bold text-tz-ink">
            {doneCount}/{statuses.length}
          </span>
        }
      />
      <div className="glass overflow-hidden rounded-[1.5rem]">
        <div className="px-4 pt-3.5">
          <ProgressBar value={pct} className="h-1" />
        </div>
        <ul role="group" aria-label="Daftar target harian" className="mt-1 px-1 pb-1">
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
                    toast.success("MasyaAllah, satu kebaikan tercatat hari ini");
                  }
                }}
                className="tap flex w-full items-center gap-3.5 rounded-[1rem] px-3 py-3 text-left"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-all",
                    done ? "bg-tz-violet text-white" : "border-[1.5px] border-dashed border-tz-line-strong text-transparent"
                  )}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13.5px] leading-snug", done ? "font-semibold text-tz-ink" : "font-medium text-tz-ink/85")}>
                    {goal.label}
                  </span>
                  {auto ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-tz-deep">
                      Otomatis dari catatan ibadahmu
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor target */}
      {editing ? (
        <div className="tz-fade-in mt-3 space-y-2.5 rounded-[1.25rem] border border-tz-line bg-tz-panel-soft p-3.5">
          <p className="v5-overline">Atur target harian</p>
          <ul className="space-y-1">
            {dailyGoals.map((g) => (
              <li key={g.id} className="flex items-center gap-2.5 py-1">
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
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                      g.enabled ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
                <span className={cn("min-w-0 flex-1 truncate text-[12.5px]", g.enabled ? "text-tz-ink" : "text-tz-muted line-through")}>
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
              className="tz-field flex-1 py-2 text-[12.5px]"
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
              className="tap v5-ink-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[10.5px] leading-relaxed text-tz-deep">
          {doneCount === statuses.length && statuses.length > 0
            ? "MasyaAllah, semua target hari ini tercapai — syukur itu dari Allah."
            : "Satu langkah kecil setiap hari sudah berarti."}
        </p>
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
          className="tap flex shrink-0 items-center gap-1 rounded-full bg-tz-panel px-3 py-1.5 text-[11px] font-bold text-tz-ink"
        >
          <Settings2 size={12} /> Atur
        </button>
      </div>
    </section>
  );
}

/* ---------------- I. Doa Hari Ini — editorial ---------------- */

function DoaEditorial() {
  const dua = duaOfTheDay(todayKey());
  return (
    <section aria-label="Doa hari ini" className="animate-tz-fade-up glass rounded-[1.5rem] p-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-tz-accent">Doa Hari Ini</p>
      {dua.title ? <p className="mt-2.5 text-[15px] font-bold tracking-[-0.01em] text-tz-ink">{dua.title}</p> : null}
      {dua.arabic ? <p className="quran-arabic mt-4 text-right text-[24px] leading-[2.05] text-tz-ink">{dua.arabic}</p> : null}
      {dua.transliteration ? (
        <p className="mt-3 text-[12.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p>
      ) : null}
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-tz-ink/90">{dua.meaning}</p>
      {dua.source ? <p className="mt-3.5 text-[11px] font-semibold text-tz-accent">{dua.source}</p> : null}
    </section>
  );
}

/* ---------------- J. Daily Barakah — daftar bernomor ---------------- */

function DailyBarakah() {
  const today = todayKey();
  const b = barakahOfTheDay(today);
  const rows = [
    { label: "Niat hari ini", text: b.niat },
    { label: "Setelah Subuh", text: b.subuh },
    { label: "Motivasi", text: b.motivasi },
    { label: "Target kecil", text: b.target },
  ];
  return (
    <section aria-label="Daily Barakah" className="animate-tz-fade-up">
      <SectionHeader title="Daily Barakah" caption="Pengingat & refleksi untuk hari ini" />
      <ol>
        {rows.map(({ label, text }, i) => (
          <li key={label} className={cn("flex items-start gap-4 py-3.5", i > 0 && "border-t border-tz-line-soft")}>
            <span aria-hidden className="v5-display shrink-0 pt-0.5 text-[13px] font-bold text-tz-deep">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block text-[10.5px] font-bold uppercase tracking-[0.16em] text-tz-accent">{label}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-tz-ink/90">{text}</span>
            </span>
          </li>
        ))}
      </ol>
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
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) return "Selamat pagi";
    if (h >= 11 && h < 15) return "Selamat siang";
    if (h >= 15 && h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const today = useToday();
  const hijri = formatHijri(new Date());

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      {/* ---------- A. Header personal ---------- */}
      <header className="animate-tz-fade-up pt-1 lg:col-span-12">
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Buka profil" onClick={() => onNavigate("profil")} className="tap relative shrink-0">
            {settings.avatarDataUrl ? (
              <img
                src={settings.avatarDataUrl}
                alt={`Foto profil ${settings.name}`}
                className="h-[52px] w-[52px] rounded-full object-cover ring-2 ring-tz-line-strong"
              />
            ) : (
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-tz-panel-strong text-[18px] font-bold text-tz-ink ring-2 ring-tz-line-strong">
                {settings.name.trim().charAt(0).toUpperCase() || "T"}
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-tz-muted">Assalamu&apos;alaikum, {greeting.toLowerCase()}</p>
            <h1 className="truncate text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-tz-ink sm:text-[26px]">
              {settings.name || "Sahabat Tazkiya"}
            </h1>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[11.5px] font-semibold text-tz-ink/90">{formatGregorian(new Date())}</p>
            {hijri ? <p className="mt-0.5 text-[10.5px] font-medium text-tz-accent">{hijri}</p> : null}
          </div>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] font-medium text-tz-muted sm:hidden">
          <span>{formatGregorian(new Date())}</span>
          {hijri ? (
            <>
              <span aria-hidden className="text-tz-line-strong">·</span>
              <span className="text-tz-accent">{hijri}</span>
            </>
          ) : null}
        </p>
      </header>

      {/* ---------- B. Compact date selector ---------- */}
      <div className="mt-5 lg:col-span-12">
        <WeekDateStrip today={today} />
      </div>

      {/* ---------- C. Featured sholat berikutnya ---------- */}
      <div className="mt-5 lg:col-span-12">
        <NextPrayerHero today={today} />
      </div>

      {/* ---------- D. Ringkasan ibadah ---------- */}
      <div className="mt-8 lg:col-span-7">
        <DailyOverview today={today} onNavigate={onNavigate} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- F. Mood check-in ---------- */}
      <div className="mt-8 lg:col-span-5">
        <MoodSection today={today} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- E. Target hari ini (Today's Task) ---------- */}
      <div className="mt-8 lg:col-span-7">
        <DailyJourney today={today} />
      </div>

      {/* ---------- H. Jelajahi aktivitas ---------- */}
      <div className="mt-8 lg:col-span-5">
        <JelajahiAktivitas today={today} onOpen={onOpenSubpage} />
      </div>

      {/* ---------- G. Pekan ini ---------- */}
      <div className="mt-8 lg:col-span-7">
        <WeeklyBars today={today} />
      </div>

      {/* ---------- I. Doa hari ini ---------- */}
      <div className="mt-8 lg:col-span-5">
        <DoaEditorial />
      </div>

      {/* ---------- J. Daily Barakah ---------- */}
      <div className="mt-8 lg:col-span-12">
        <DailyBarakah />
      </div>
    </div>
  );
}
