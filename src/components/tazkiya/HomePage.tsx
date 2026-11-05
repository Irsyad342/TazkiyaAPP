"use client";

/**
 * Tazkiya v5 — Beranda "Minimalist Premium" — DIBANGUN DARI NOL.
 * Komposisi editorial daily-companion (bukan tumpukan kartu):
 * A. Header personal sederhana: sapaan, nama besar, tanggal, avatar kecil.
 * B. Featured Sholat Berikutnya: blok lavender lembut — countdown Manrope
 *    raksasa + timeline lima waktu minimalis di dalamnya.
 * C. Ibadah Hari Ini: TANPA kartu — cincin persentase + baris aktivitas
 *    ber-hairline tipis.
 * D. Mood Check-in ilustratif (MoodSection).
 * E. Aktivitas Pekan Ini: TANPA kartu — tujuh batang tipis bersih.
 * F. Jelajahi Aktivitas: tiga komposisi berbeda (JelajahiAktivitas).
 * G. Target Harian: daftar baris ber-hairline + editor (logika utuh).
 * H. Doa Hari Ini: blok editorial tanpa kartu — Arab Amiri besar.
 * I. Daily Barakah: daftar bernomor editorial.
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

/* ---------------- B. Featured Sholat Berikutnya (blok lavender lembut) ---------------- */

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
      <div className="rounded-[2rem] bg-tz-lavender p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="v5-overline">Sholat Berikutnya</p>
          <span
            className={cn(
              "rounded-full bg-tz-lime px-3 py-1.5 text-[11.5px] font-bold text-tz-lime-ink",
              animations && "animate-tz-pulse"
            )}
          >
            {formatCountdown(state.secondsLeft)} lagi
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
          <p className="v5-display text-[56px] font-extrabold leading-[0.9] text-tz-ink sm:text-[64px]">
            {state.nextTime}
          </p>
          <div className="pb-1.5">
            <p className="text-[18px] font-bold leading-tight tracking-[-0.01em] text-tz-ink">
              {nextLabel}
              {state.tomorrow ? <span className="text-[12.5px] font-semibold text-tz-muted"> · besok</span> : null}
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium text-tz-muted">
              {state.tomorrow
                ? "Menunggu Subuh esok hari"
                : `${PRAYER_ORDER.find((p) => p.id === state.current)?.label ?? "-"} sedang berlangsung`}
            </p>
          </div>
        </div>

        {/* Timeline lima waktu — garis tipis + titik status */}
        <div className="relative mt-7" role="group" aria-label="Lima waktu salat hari ini">
          <span aria-hidden className="absolute inset-x-3 top-[5px] h-px bg-tz-lav-deco" />
          <div className="relative grid grid-cols-5 gap-1">
            {PRAYER_ORDER.map(({ id, label }) => {
              const st = slotState(id);
              const done = prayerDetails[today]?.[id]?.status === "done" || logs[today]?.prayers?.[id];
              return (
                <div key={id} className="flex flex-col items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "h-[11px] w-[11px] rounded-full transition-all",
                      st === "next"
                        ? cn("bg-tz-ink ring-4 ring-tz-lav-deco", animations && "animate-tz-pulse")
                        : st === "past" || st === "current"
                          ? "bg-tz-violet"
                          : "border-[1.5px] border-tz-lav-deco bg-transparent"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold leading-none",
                      st === "next" ? "font-bold text-tz-ink" : "text-tz-muted"
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
        <p className="mt-5 flex items-center gap-1.5 text-[10.5px] font-medium text-tz-muted">
          <Sparkles size={11} className="shrink-0 text-tz-violet" />
          {scheduleSource}
        </p>
      </div>
    </section>
  );
}

/* ---------------- C. Ibadah Hari Ini — editorial tanpa kartu ---------------- */

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
            className="tap flex items-center gap-0.5 text-[12px] font-bold text-tz-violet"
          >
            Analitik <ChevronRight size={14} />
          </button>
        }
      />

      <div className="flex items-center gap-6 sm:gap-8">
        {/* Cincin persentase — flat lavender */}
        <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: 104, height: 104 }}>
          <svg width={104} height={104} className="-rotate-90">
            <circle cx={52} cy={52} r={46} fill="none" strokeWidth={9} className="stroke-tz-track" />
            <circle
              cx={52}
              cy={52}
              r={46}
              fill="none"
              strokeWidth={9}
              strokeLinecap="round"
              className="stroke-tz-violet"
              strokeDasharray={`${(Math.max(0, Math.min(100, overall)) / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="v5-display text-[26px] font-extrabold leading-none text-tz-ink">{overall}%</span>
            <span className="v5-overline mt-1">Hari ini</span>
          </div>
        </div>

        {/* Baris aktivitas — hairline tipis, tanpa kotak */}
        <div className="w-full min-w-0 flex-1">
          {rows.map(({ label, value, pct, onClick }, i) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              aria-label={`${label}: ${value} — buka detail`}
              className={cn("tap block w-full py-2.5 text-left", i > 0 && "border-t border-tz-line")}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium text-tz-ink/90">{label}</span>
                <span className="tnum text-[13px] font-bold text-tz-ink">{value}</span>
              </div>
              <ProgressBar value={pct} className="mt-1.5 h-1" />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-tz-muted">
        <span className="tnum font-bold text-tz-ink">{recorded}</span> jenis aktivitas tercatat · target harian{" "}
        <span className="tnum font-bold text-tz-ink">
          {goalsDone}/{goalStatusesToday.length}
        </span>
      </p>
    </section>
  );
}

/* ---------------- E. Aktivitas Pekan Ini — batang tipis tanpa kartu ---------------- */

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
      <div className="grid grid-cols-7 gap-2 sm:gap-3" role="group" aria-label="Salat tercatat per hari pekan ini">
        {week.map(({ label, count, isToday, isFuture }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <span
              className={cn(
                "tnum text-[10.5px] font-bold leading-none",
                isFuture ? "text-transparent" : count > 0 ? "text-tz-ink" : "text-tz-muted/40"
              )}
            >
              {count === 0 ? "–" : count}
            </span>
            <div aria-hidden className="flex h-[68px] w-full items-end justify-center">
              <span
                className={cn(
                  "tz-bar-grow w-full max-w-[26px] rounded-full",
                  count === 0 ? "h-[3px] bg-tz-track" : isToday ? "bg-tz-violet" : "bg-tz-lav-deco"
                )}
                style={{ height: count === 0 ? 3 : `${Math.max(8, (count / best) * 100)}%` }}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold leading-none",
                isToday ? "font-bold text-tz-ink" : isFuture ? "text-tz-muted/40" : "text-tz-muted"
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- G. Target Harian — daftar baris ber-hairline ---------------- */

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
          <span className="tnum text-[12px] font-bold text-tz-ink">
            {doneCount}/{statuses.length}
          </span>
        }
      />
      <ProgressBar value={pct} className="mb-1 h-1" />

      <ul role="group" aria-label="Daftar target harian">
        {statuses.map(({ goal, done, auto }, i) => (
          <li key={goal.id} className={cn(i > 0 && "border-t border-tz-line")}>
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
              className="tap flex w-full items-center gap-3.5 py-3.5 text-left"
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
                  <span className="mt-0.5 block text-[10px] font-medium text-tz-muted/85">
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
        <div className="tz-fade-in mt-3 space-y-2.5 rounded-[1.25rem] bg-tz-panel-soft p-3.5">
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
              className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full v5-ink-btn text-tz-lime"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[10.5px] leading-relaxed text-tz-muted/80">
          {doneCount === statuses.length && statuses.length > 0
            ? "MasyaAllah, semua target hari ini tercapai — syukur itu dari Allah."
            : "Satu langkah kecil setiap hari sudah berarti."}
        </p>
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
          className="tap flex shrink-0 items-center gap-1 rounded-full bg-tz-panel-soft px-3 py-1.5 text-[11px] font-bold text-tz-ink"
        >
          <Settings2 size={12} /> Atur
        </button>
      </div>
    </section>
  );
}

/* ---------------- H. Doa Hari Ini — editorial tanpa kartu ---------------- */

function DoaEditorial() {
  const dua = duaOfTheDay(todayKey());
  return (
    <section aria-label="Doa hari ini" className="animate-tz-fade-up">
      <p className="v5-overline">Doa Hari Ini</p>
      {dua.title ? <p className="mt-2.5 text-[15px] font-bold tracking-[-0.01em] text-tz-ink">{dua.title}</p> : null}
      {dua.arabic ? <p className="quran-arabic mt-4 text-right text-[24px] leading-[2.05] text-tz-ink">{dua.arabic}</p> : null}
      {dua.transliteration ? (
        <p className="mt-3 text-[12.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p>
      ) : null}
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-tz-ink/95">{dua.meaning}</p>
      {dua.source ? <p className="mt-3.5 text-[11px] font-semibold text-tz-violet">{dua.source}</p> : null}
    </section>
  );
}

/* ---------------- I. Daily Barakah — daftar bernomor editorial ---------------- */

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
          <li key={label} className={cn("flex items-start gap-4 py-3.5", i > 0 && "border-t border-tz-line")}>
            <span aria-hidden className="v5-display shrink-0 pt-0.5 text-[13px] font-bold text-tz-muted/60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="v5-overline block" style={{ color: "var(--color-tz-violet)" }}>
                {label}
              </span>
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
      {/* ---------- A. Header personal sederhana ---------- */}
      <header className="animate-tz-fade-up pt-1 lg:col-span-12">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-tz-muted">Assalamu&apos;alaikum, {greeting.toLowerCase()}</p>
            <h1 className="mt-1 truncate text-[27px] font-extrabold leading-tight tracking-[-0.03em] text-tz-ink sm:text-[30px]">
              {settings.name || "Sahabat Tazkiya"}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] font-medium text-tz-muted">
              <span>{formatGregorian(new Date())}</span>
              {hijri ? (
                <>
                  <span aria-hidden className="text-tz-line-strong">
                    ·
                  </span>
                  <span className="text-tz-violet">{hijri}</span>
                </>
              ) : null}
            </p>
          </div>
          <button type="button" aria-label="Buka profil" onClick={() => onNavigate("profil")} className="tap relative shrink-0">
            {settings.avatarDataUrl ? (
              <img
                src={settings.avatarDataUrl}
                alt={`Foto profil ${settings.name}`}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-tz-lav-deco"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tz-lav-deco text-[17px] font-bold text-tz-violet ring-2 ring-tz-lav-deco">
                {settings.name.trim().charAt(0).toUpperCase() || "T"}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ---------- B. Featured sholat berikutnya ---------- */}
      <div className="mt-7 lg:col-span-12">
        <NextPrayerHero today={today} />
      </div>

      {/* ---------- C. Ibadah hari ini (editorial) ---------- */}
      <div className="mt-9 lg:col-span-7">
        <DailyOverview today={today} onNavigate={onNavigate} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- D. Mood check-in ---------- */}
      <div className="mt-9 lg:col-span-5">
        <MoodSection today={today} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- E. Pekan ini ---------- */}
      <div className="mt-9 lg:col-span-7">
        <WeeklyBars today={today} />
      </div>

      {/* ---------- F. Jelajahi aktivitas ---------- */}
      <div className="mt-9 lg:col-span-5">
        <JelajahiAktivitas today={today} onOpen={onOpenSubpage} />
      </div>

      {/* ---------- G. Target harian ---------- */}
      <div className="mt-9 lg:col-span-12">
        <DailyJourney today={today} />
      </div>

      {/* ---------- H. Doa hari ini (editorial) ---------- */}
      <div className="mt-9 border-t border-tz-line pt-7 lg:col-span-7 lg:border-t-0 lg:pt-0">
        <DoaEditorial />
      </div>

      {/* ---------- I. Daily Barakah ---------- */}
      <div className="mt-9 lg:col-span-5">
        <DailyBarakah />
      </div>
    </div>
  );
}
