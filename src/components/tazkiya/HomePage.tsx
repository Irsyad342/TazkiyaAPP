"use client";

/**
 * Tazkiya — Halaman Beranda (Islamic Daily Companion):
 * A. Header sapaan + nama + tanggal Masehi & Hijriah + avatar + notifikasi.
 * B. Next Prayer: salat berikutnya, jadwal aktual (GPS/manual), countdown,
 *    dan timeline lima waktu dengan penanda lewat / berjalan / berikutnya.
 * C. Daily Journey: target harian (otomatis dari catatan + manual, bisa diatur).
 * D. Mood Check-in: pilihan mood berilustrasi, satu catatan per hari.
 * E. Jelajahi Aktivitas: pintasan editorial ke Jurnal Syukur, Zikir & Doa,
 *    Rizq & Amal.
 * F. Ringkasan yang masih berguna: Progres Hari Ini, Daily Barakah, Doa Hari Ini.
 * Pencatatan salat ada di halaman Sholat — Beranda tidak menduplikasinya.
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
import { Chip, ConfirmButton, GlassCard, IconBox, ProgressBar, SectionHeader } from "./ui-bits";
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

/* ---------------- B. Kartu Salat Berikutnya ---------------- */

function NextPrayerCard({ today }: { today: string }) {
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
      {/* Kartu hero hijau emerald — gradien + siluet masjid, teks putih di kedua tema */}
      <div className="glass-hero relative overflow-hidden rounded-[1.65rem] p-5">
        {/* Siluet masjid dekoratif */}
        <svg viewBox="0 0 200 120" fill="none" aria-hidden className="pointer-events-none absolute -right-4 -top-2 h-28 w-40 text-white/[0.14]">
          <path d="M100 22c8 6 12 12 12 18H88c0-6 4-12 12-18Z" fill="currentColor" />
          <rect x="84" y="44" width="32" height="40" rx="2" fill="currentColor" />
          <path d="M92 84v-9a8 8 0 0 1 16 0v9Z" fill="currentColor" opacity="0.5" />
          <rect x="64" y="34" width="5" height="50" rx="2.5" fill="currentColor" />
          <circle cx="66.5" cy="30" r="3" fill="currentColor" />
          <rect x="131" y="34" width="5" height="50" rx="2.5" fill="currentColor" />
          <circle cx="133.5" cy="30" r="3" fill="currentColor" />
        </svg>

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
            Salat berikutnya · {nextLabel}
            {state.tomorrow ? " (besok)" : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
            <p className="text-[44px] font-extrabold leading-none tracking-tight text-white">
              {state.nextTime}
            </p>
            <span
              className={cn(
                "mb-1 rounded-full px-3 py-1 text-[11px] font-bold",
                animations
                  ? "bg-tz-lime text-[#1d3a10] shadow-[0_6px_16px_-6px_rgba(199,244,100,0.8)]"
                  : "border border-white/25 bg-white/15 text-white"
              )}
            >
              {formatCountdown(state.secondsLeft)} lagi
            </span>
          </div>

          {/* Timeline 5 waktu */}
          <div className="relative mt-4">
            <span aria-hidden className="absolute inset-x-2 top-[5px] h-px bg-white/25" />
            <div className="relative grid grid-cols-5 gap-1">
              {PRAYER_ORDER.map(({ id, label }) => {
                const st = slotState(id);
                const done = prayerDetails[today]?.[id]?.status === "done" || logs[today]?.prayers?.[id];
                return (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "h-2.5 w-2.5 rounded-full border transition-all",
                        st === "next"
                          ? "border-white bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.55)]"
                          : st === "past" || st === "current"
                            ? "border-transparent bg-white/70"
                            : "border-white/40 bg-transparent"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[9.5px] font-semibold leading-none",
                        st === "next" ? "text-white" : st === "past" || st === "current" ? "text-white/85" : "text-white/55"
                      )}
                    >
                      {label}
                    </span>
                    <span className={cn("text-[8.5px] leading-none", done ? "font-bold text-[#e9ffd4]" : "text-white/65")}>
                      {done ? "✓" : times[id]?.time ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[9.5px] text-white/60">
            <Sparkles size={10} className="shrink-0" />
            {scheduleSource} ·{" "}
            {state.tomorrow
              ? "Menunggu Subuh esok"
              : `${PRAYER_ORDER.find((p) => p.id === state.current)?.label ?? "-"} sedang berlangsung`}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- C. Target Harian (Daily Journey) ---------------- */

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
                ? "border-tz-violet/30 bg-tz-violet/12 text-tz-accent"
                : "border-tz-line"
            )}
          >
            {doneCount}/{statuses.length}
          </Chip>
        }
      />
      <GlassCard className="p-4">
        <ProgressBar value={pct} className="mb-3.5 h-1.5" />

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
                  "tap flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                  done ? "border-tz-violet/45 bg-tz-violet/12" : "border-tz-line bg-tz-panel-soft hover:border-tz-violet/35"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                    done
                      ? "border-transparent bg-gradient-to-br from-[#4ade80] to-[#16a34a] text-white shadow-[0_4px_12px_-4px_rgba(22,163,74,0.7)]"
                      : "border-dashed border-tz-line-strong text-transparent"
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
          <div className="tz-fade-in mt-3 space-y-2.5 rounded-xl border border-tz-line bg-tz-panel-soft p-3">
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
                      className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
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
                className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ade80] to-[#16a34a] text-white"
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
            className="tap flex shrink-0 items-center gap-1 rounded-full border border-tz-violet/30 bg-tz-violet/10 px-2.5 py-1 text-[10.5px] font-semibold text-tz-accent"
          >
            <Settings2 size={12} /> Atur
          </button>
        </div>
      </GlassCard>
    </section>
  );
}

/* ---------------- D. Daily Barakah ---------------- */

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
      <GlassCard variant="violet" className="p-4">
        <ul className="space-y-3">
          {rows.map(({ icon: Icon, label, text }, i) => (
            <li key={label} className={cn("flex items-start gap-3", i > 0 && "border-t border-tz-line-soft pt-3")}>
              <span
                aria-hidden
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-tz-violet/30 bg-tz-violet/12 text-tz-accent"
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-tz-accent/90">{label}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-tz-ink/90">{text}</span>
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
  const logs = useWorshipStore((s) => s.logs);
  const today = useToday();

  const log = logs[today];
  const dua = duaOfTheDay(today);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) return "Selamat pagi";
    if (h >= 11 && h < 15) return "Selamat siang";
    if (h >= 15 && h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const prayersDone = PRAYER_ORDER.filter((p) => log?.prayers?.[p.id]).length;
  const zikir = log?.zikirCount ?? 0;
  const quran = log?.quranPages ?? 0;

  return (
    <div className="space-y-6">
      {/* ---------- A. Header: sapaan + tanggal + avatar + notifikasi ---------- */}
      <header className="animate-tz-fade-up pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tz-accent/90">{greeting} · Assalamu&apos;alaikum</p>
            <h1 className="mt-0.5 truncate font-display text-[22px] font-bold leading-tight text-tz-ink">{settings.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-tz-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={11} className="text-tz-violet" />
                {formatGregorian(new Date())}
              </span>
              {formatHijri(new Date()) ? <span className="text-tz-accent/85">· {formatHijri(new Date())}</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notifikasi"
              onClick={() => toast.info("Belum ada notifikasi baru")}
              className="tap glass relative flex h-10 w-10 items-center justify-center rounded-full text-tz-muted"
            >
              <Bell size={17} />
              <span aria-hidden className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tz-violet shadow-[0_0_6px_2px_rgba(22,163,74,0.5)]" />
            </button>
            <button type="button" aria-label="Buka profil" onClick={() => onNavigate("profil")} className="tap relative">
              {settings.avatarDataUrl ? (
                <img
                  src={settings.avatarDataUrl}
                  alt={`Foto profil ${settings.name}`}
                  className="h-12 w-12 rounded-full border-2 border-tz-violet/40 object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#4ade80] to-[#16a34a] text-lg font-bold text-white shadow-[0_8px_20px_-8px_rgba(22,163,74,0.7)] dark:border-white/15">
                  {settings.name.trim().charAt(0).toUpperCase() || "T"}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- B. Salat berikutnya ---------- */}
      <NextPrayerCard today={today} />

      {/* ---------- C. Target Harian ---------- */}
      <DailyJourney today={today} />

      {/* ---------- D. Mood Check-in ---------- */}
      <MoodSection today={today} onOpenSubpage={onOpenSubpage} />

      {/* ---------- E. Jelajahi Aktivitas ---------- */}
      <JelajahiAktivitas today={today} onOpen={onOpenSubpage} />

      {/* ---------- F1. Progres hari ini (ringkas, tanpa pencatatan) ---------- */}
      <section aria-label="Progres ibadah hari ini">
        <SectionHeader
          title="Progres Hari Ini"
          caption="Ringkasan aktivitas yang sudah tercatat"
          action={
            <button
              type="button"
              onClick={() => onNavigate("progress")}
              className="tap flex items-center gap-0.5 rounded-full border border-tz-violet/30 bg-tz-violet/10 py-1 pl-3 pr-2 text-xs font-semibold text-tz-accent transition-all hover:bg-tz-violet/18"
            >
              Detail <ChevronRight size={14} />
            </button>
          }
        />
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              label: "Salat",
              value: `${prayersDone}/5`,
              pct: (prayersDone / 5) * 100,
              onClick: () => onNavigate("sholat"),
              accent: "text-tz-accent",
            },
            {
              label: "Al-Qur'an",
              value: `${quran} hlm`,
              pct: Math.min(100, (quran / Math.max(1, settings.quranDailyTarget)) * 100),
              onClick: () => onNavigate("quran"),
              accent: "text-tz-blue light:text-tz-blue dark:text-[#8b96ff]",
            },
            {
              label: "Zikir",
              value: zikir.toLocaleString("id-ID"),
              pct: Math.min(100, (zikir / Math.max(1, settings.zikirTarget)) * 100),
              onClick: () => onOpenSubpage("zikir-doa"),
              accent: "text-amber-500 light:text-amber-600 dark:text-amber-300",
            },
          ].map(({ label, value, pct, onClick, accent }) => (
            <GlassCard key={label} variant="clean" className="tap cursor-pointer p-3.5" onClick={onClick}>
              <p className="text-[10.5px] font-semibold text-tz-muted">{label}</p>
              <p className={cn("mt-1 text-[22px] font-extrabold leading-none tabular-nums", accent)}>{value}</p>
              <ProgressBar value={pct} className="mt-2.5 h-1" />
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ---------- F2. Daily Barakah ---------- */}
      <DailyBarakah />

      {/* ---------- Doa Hari Ini ---------- */}
      <GlassCard variant="clean" className="p-5">
        <div className="flex items-center gap-2.5">
          <IconBox tone="lavender" size="sm">
            <BookOpen />
          </IconBox>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold text-tz-ink">Doa Hari Ini</p>
            <p className="text-[10.5px] text-tz-muted">{dua.title}</p>
          </div>
        </div>
        {dua.arabic ? <p className="quran-arabic mt-4 text-right text-[22px] leading-[2] text-tz-ink">{dua.arabic}</p> : null}
        {dua.transliteration ? <p className="mt-2.5 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p> : null}
        <p className="mt-2 text-[12.5px] leading-relaxed text-tz-ink/95">{dua.meaning}</p>
        {dua.source ? (
          <div className="mt-3">
            <Chip className="border-tz-violet/30 bg-tz-violet/10 text-tz-accent">{dua.source}</Chip>
          </div>
        ) : null}
        <div className="mt-3.5 flex items-center justify-between border-t border-tz-line-soft pt-3">
          <p className="text-[10px] font-medium text-tz-accent/85">Tazkiya, teman ibadah harianmu</p>
          <p className="text-[10px] text-tz-muted/70">Berganti setiap hari</p>
        </div>
      </GlassCard>
    </div>
  );
}
