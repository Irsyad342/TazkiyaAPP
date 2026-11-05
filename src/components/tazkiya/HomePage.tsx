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

/* ---------------- B. Kartu Salat Berikutnya (hero aurora v3) ---------------- */

/** Ornamen bulan sabit + bintang untuk kartu aurora — identitas v3. */
function AuroraMoonsky() {
  return (
    <svg viewBox="0 0 200 120" fill="none" aria-hidden className="pointer-events-none absolute -right-3 -top-1 h-28 w-44 text-white">
      {/* bulan sabit */}
      <path
        d="M158 14a26 26 0 1 0 26 26 20 20 0 1 1-26-26Z"
        fill="currentColor"
        opacity="0.28"
      />
      {/* bintang */}
      <g fill="currentColor">
        <path d="M120 26l2.2 5.2 5.2 2.2-5.2 2.2-2.2 5.2-2.2-5.2-5.2-2.2 5.2-2.2 2.2-5.2Z" opacity="0.5" />
        <path d="M143 58l1.5 3.4 3.4 1.5-3.4 1.5-1.5 3.4-1.5-3.4-3.4-1.5 3.4-1.5 1.5-3.4Z" opacity="0.35" />
        <circle cx="112" cy="62" r="2" opacity="0.3" />
        <circle cx="178" cy="70" r="1.6" opacity="0.28" />
        <circle cx="96" cy="20" r="1.4" opacity="0.25" />
      </g>
      {/* lengkung horizon bawah */}
      <path d="M0 116c40-14 90-18 200-10v14H0v-4Z" fill="currentColor" opacity="0.12" />
    </svg>
  );
}

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
      {/* Kartu hero aurora — gradien ungu→biru + bulan & bintang, teks putih di kedua tema */}
      <div className="glass-hero relative overflow-hidden rounded-[1.75rem] p-5">
        <AuroraMoonsky />

        <div className="relative">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
            Salat berikutnya · {nextLabel}
            {state.tomorrow ? " (besok)" : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
            <p className="font-display text-[46px] font-extrabold leading-none tracking-tight text-white">
              {state.nextTime}
            </p>
            <span
              className={cn(
                "mb-1 rounded-full px-3 py-1 text-[11px] font-bold",
                animations
                  ? "bg-tz-lime text-[#23244d] shadow-[0_6px_16px_-6px_rgba(207,240,92,0.85)]"
                  : "border border-white/25 bg-white/15 text-white"
              )}
            >
              {formatCountdown(state.secondsLeft)} lagi
            </span>
          </div>

          {/* Timeline 5 waktu */}
          <div className="relative mt-4">
            <span aria-hidden className="absolute inset-x-2 top-[5px] h-px bg-white/30" />
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
                          ? "border-white bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.6)]"
                          : st === "past" || st === "current"
                            ? "border-transparent bg-white/75"
                            : "border-white/45 bg-transparent"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[9.5px] font-semibold leading-none",
                        st === "next" ? "text-white" : st === "past" || st === "current" ? "text-white/85" : "text-white/60"
                      )}
                    >
                      {label}
                    </span>
                    <span className={cn("text-[8.5px] leading-none", done ? "font-bold text-tz-lime" : "text-white/70")}>
                      {done ? "✓" : times[id]?.time ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[9.5px] text-white/65">
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

/* ---------------- B2. Strip Pekan Ini (weekly progress nyata) ---------------- */

function WeeklyStrip({ today }: { today: string }) {
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

  return (
    <section aria-label="Pekan ini" className="animate-tz-fade-up">
      <GlassCard variant="clean" className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays size={14} className="shrink-0 text-tz-violet" />
            <p className="font-display text-[13.5px] font-bold text-tz-ink">Pekan Ini</p>
          </div>
          <Chip className="border-tz-violet/25 bg-tz-violet/10 text-tz-accent">{total} salat tercatat</Chip>
        </div>
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Salat tercatat per hari pekan ini">
          {week.map(({ label, count, isToday, isFuture }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div aria-hidden className="flex h-14 w-full items-end justify-center rounded-lg bg-tz-panel-soft px-0.5 pt-0.5">
                <span
                  className={cn(
                    "tz-bar-grow-x w-full rounded-md",
                    count === 0 ? "h-[3px] bg-tz-track" : "bg-gradient-to-t from-[#6c5ce7] to-[#9b8cfa]",
                    isToday && count > 0 && "from-[#5b8def] to-[#8b7cf8]"
                  )}
                  style={{ height: count === 0 ? 3 : `${Math.max(10, (count / 5) * 100)}%` }}
                />
              </div>
              <span className={cn("text-[9px] font-semibold leading-none", isToday ? "text-tz-accent" : isFuture ? "text-tz-muted/50" : "text-tz-muted")}>
                {label}
              </span>
              <span className={cn("text-[8.5px] leading-none tabular-nums", isFuture ? "text-transparent" : count > 0 ? "font-bold text-tz-ink/80" : "text-tz-muted/60")}>
                {count === 0 ? "–" : count}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
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
                      ? "border-transparent bg-gradient-to-br from-[#8b7cf8] to-[#5b8def] text-white shadow-[0_4px_12px_-4px_rgba(108,92,231,0.7)]"
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
                className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b7cf8] to-[#5b8def] text-white shadow-[0_6px_16px_-8px_rgba(108,92,231,0.7)]"
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
              <span aria-hidden className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tz-lime shadow-[0_0_6px_2px_rgba(207,240,92,0.55)]" />
            </button>
            <button type="button" aria-label="Buka profil" onClick={() => onNavigate("profil")} className="tap relative">
              {settings.avatarDataUrl ? (
                <img
                  src={settings.avatarDataUrl}
                  alt={`Foto profil ${settings.name}`}
                  className="h-12 w-12 rounded-full border-2 border-tz-lavender/50 object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#8b7cf8] via-[#6c5ce7] to-[#5b8def] font-display text-lg font-bold text-white shadow-[0_8px_20px_-8px_rgba(108,92,231,0.7)] dark:border-white/15">
                  {settings.name.trim().charAt(0).toUpperCase() || "T"}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- B. Salat berikutnya ---------- */}
      <NextPrayerCard today={today} />

      {/* ---------- B2. Pekan Ini (progres mingguan) ---------- */}
      <WeeklyStrip today={today} />

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
