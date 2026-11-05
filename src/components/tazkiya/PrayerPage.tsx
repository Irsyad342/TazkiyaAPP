"use client";

/**
 * Tazkiya v7 — Halaman Sholat. Tab "Hari Ini" DIBANGUN ULANG mengikuti
 * layar kiri referensi ("Manage Task"): judul tanggal besar, lalu TIMELINE
 * SUMBU WAKTU HORIZONTAL — sumbu jam dengan garis putus-putus, penanda
 * waktu berjalan, dan blok acara per salat (bar kiri ORANGE bila
 * dilaksanakan, amber bila terlewat) yang bisa diketuk untuk mencatat.
 * Tab Bulanan (kalender lima titik) dan Qada (formulir gaya referensi
 * kanan: input gelap + CTA orange) dipertahankan dengan logika utuh.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  HandCoins,
  Moon,
  MoonStar,
  Plus,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  EXTRAS,
  PRAYERS,
  PRAYER_IDS,
  SALAT_JUMAT,
  ZUHUR_ALTERNATIF,
  selectPrayerDetail,
  type ExtraId,
  type PrayerDetail,
  type PrayerId,
  type PrayerMeta,
} from "@/lib/tazkiya/types";
import { formatHijri, isFriday, monthCalendarDayKeys, todayKey } from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { nextPrayerState, prayerTiming } from "@/lib/tazkiya/goals";
import { HADITH_QADA } from "@/lib/tazkiya/hadith";
import { ConfirmButton, GlassCard, SectionHeader, SegmentedTabs } from "./ui-bits";
import { PrayerRecordDialog } from "./PrayerRecordDialog";
import { DayDetailSheet, prayerMetaFor } from "./DayDetailSheet";
import { MotivationPopup, type MotivationVariant } from "./MotivationPopup";
import { cn } from "@/lib/utils";

type Tab = "hari-ini" | "bulanan" | "qada";

const PRAYER_ICONS: Record<PrayerId, typeof Sun> = {
  subuh: Sunrise,
  zuhur: Sun,
  asar: CloudSun,
  magrib: Sunset,
  isya: Moon,
};

const EXTRA_ICONS: Record<ExtraId, typeof Sun> = {
  duha: Sun,
  tahajud: MoonStar,
  doa: MoonStar,
  puasa: UtensilsCrossed,
  sedekah: HandCoins,
};

function formatDayFullOf(date: string): string {
  const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

/* ================= Timeline sumbu waktu horizontal (gaya referensi) ================= */

const PX_PER_HOUR = 76;
const AXIS_WIDTH = 24 * PX_PER_HOUR; // 00.00 – 24.00

/** "HH:MM" → posisi px pada sumbu. */
function timeToX(time: string): number {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  return ((h * 60 + m) / 60) * PX_PER_HOUR;
}

function PrayerHAxis({
  today,
  prayers,
  schedule,
  detailOf,
  nextState,
  onRecord,
}: {
  today: string;
  prayers: PrayerMeta[];
  schedule: Record<PrayerId, { time: string; enabled: boolean }>;
  detailOf: (id: PrayerId) => PrayerDetail;
  nextState: { next: PrayerId | null; current: PrayerId | null };
  onRecord: (meta: PrayerMeta) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = today === todayKey();

  /** Gulir otomatis agar jam berjalan (atau salat pertama) terlihat saat dibuka. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const x = isToday ? timeToX(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`) : timeToX(schedule[prayers[0]?.id ?? "subuh"]?.time ?? "04:00");
    el.scrollLeft = Math.max(0, x - 140);
  }, [isToday, prayers, schedule]);

  const nowX = (() => {
    if (!isToday) return null;
    const now = new Date();
    return timeToX(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  })();

  return (
    <div
      ref={scrollRef}
      className="thin-scrollbar relative overflow-x-auto rounded-[1.4rem] border border-tk-line-soft bg-tk-panel-soft"
    >
      <div className="relative" style={{ width: AXIS_WIDTH, height: 5 * 62 + 40 }}>
        {/* Sumbu jam + garis putus-putus vertikal — gaya referensi */}
        {Array.from({ length: 12 }, (_, i) => i * 2).map((h) => (
          <div key={h} className="absolute top-0 bottom-0" style={{ left: h * PX_PER_HOUR }}>
            <span className="tnum absolute -translate-x-1/2 whitespace-nowrap pt-2 text-[9px] font-semibold text-tk-deep">
              {String(h).padStart(2, "0")}.00
            </span>
            <span aria-hidden className="absolute top-7 bottom-3 border-l border-dashed border-tk-line" />
          </div>
        ))}

        {/* Penanda waktu berjalan */}
        {nowX !== null ? (
          <div className="absolute top-7 bottom-3 z-10" style={{ left: nowX }}>
            <span aria-hidden className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-tk-violet shadow-[0_0_0_3px_rgba(250,82,0,0.25)]" />
            <span aria-hidden className="absolute top-2.5 bottom-0 border-l-2 border-tk-violet/80" />
          </div>
        ) : null}

        {/* Blok acara per salat — diposisikan pada waktunya */}
        {prayers.map((p, i) => {
          const time = schedule[p.id]?.time ?? "00:00";
          const x = timeToX(time);
          const detail = detailOf(p.id);
          const isDone = detail.status === "done";
          const isMissed = detail.status === "missed";
          const isNext = nextState.next === p.id;
          const timing = prayerTiming(detail, time, today);
          const Icon = PRAYER_ICONS[p.id] ?? Sun;

          const statusText = isDone
            ? timing === "late"
              ? "Dilaksanakan · terlambat"
              : timing === "ontime"
                ? "Dilaksanakan · tepat waktu"
                : "Dilaksanakan"
            : isMissed
              ? "Tidak dilaksanakan"
              : "Belum dicatat";

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onRecord(p)}
              aria-label={`Catat ${p.label} pukul ${time} — ${statusText}`}
              className={cn(
                "tap absolute flex w-[172px] items-stretch gap-0 overflow-hidden rounded-xl text-left transition-colors",
                isDone
                  ? "bg-tk-panel-strong"
                  : isMissed
                    ? "bg-tk-panel-strong/80"
                    : "border border-tk-line bg-tk-panel/70",
                isNext && !isDone && "border-tk-violet/70"
              )}
              style={{ left: Math.min(x, AXIS_WIDTH - 180), top: 40 + i * 58 }}
            >
              {/* Bar status kiri — ORANGE bila dilaksanakan */}
              <span aria-hidden className={cn("w-[3px] shrink-0", isDone ? "bg-tk-violet" : isMissed ? "bg-tk-amber" : "bg-tk-line-strong")} />
              <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isDone ? "bg-tk-violet text-white" : isMissed ? "bg-tk-amber/25 text-tk-amber" : "bg-tk-panel-strong text-tk-muted"
                  )}
                >
                  <Icon size={12} strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("block truncate text-[11.5px] font-bold", isNext && !isDone ? "text-tk-accent" : "text-tk-ink")}>
                      {p.label}
                    </span>
                    {isNext && !isDone ? (
                      <span className="rounded-full bg-tk-violet px-1.5 py-px text-[7.5px] font-bold uppercase tracking-wide text-white">
                        Berikutnya
                      </span>
                    ) : null}
                  </span>
                  <span className="tnum mt-0.5 block truncate text-[9.5px] font-medium text-tk-muted">
                    {time} · {statusText}
                    {isDone && detail.kind === "berjamaah" ? " · Berjamaah" : isDone && detail.kind === "mandiri" ? " · Mandiri" : ""}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= Tab Hari Ini ================= */

function TodayTab({
  today,
  onRecord,
}: {
  today: string;
  onRecord: (meta: PrayerMeta) => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt?.[today] ?? false);
  const tracked = settings.trackedExtras;

  const friday = isFriday(today);
  const schedule = useMemo(() => resolvePrayerSchedule(settings, today), [settings, today]);
  const prayersToday: PrayerMeta[] = friday
    ? PRAYERS.map((p) => (p.id === "zuhur" ? (fridayZuhurAlt ? ZUHUR_ALTERNATIF : SALAT_JUMAT) : p))
    : PRAYERS;

  const detailOf = (id: PrayerId): PrayerDetail => selectPrayerDetail(prayerDetails, logs, today, id);
  const doneCount = prayersToday.filter((p) => detailOf(p.id).status === "done").length;
  const jamaah = prayersToday.filter((p) => detailOf(p.id).status === "done" && detailOf(p.id).kind === "berjamaah").length;

  /** Salat berikutnya — untuk subjudul & penanda timeline. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(iv);
  }, []);
  const state = nextPrayerState(schedule, now);
  const nextMeta = prayersToday.find((p) => p.id === state.next) ?? prayersToday[0];

  const extrasList = EXTRAS.filter((e) => tracked.includes(e.id));

  const [y, m, d] = today.split("-").map((v) => parseInt(v, 10));
  const dateLabel = new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      <div className="space-y-7 lg:col-span-7">
        {/* Judul tanggal besar — gaya "Manage Task" */}
        <header className="animate-tk-fade-up">
          <p className="flex items-center gap-1.5 text-[24px] font-bold tracking-[-0.02em] text-tk-ink">
            {dateLabel}
          </p>
          <p className="mt-1 text-[12px] text-tk-muted">
            Kamu sudah mencatat{" "}
            <span className="tnum font-bold text-tk-ink">
              {doneCount}
              /5
            </span>{" "}
            salat hari ini
            {jamaah > 0 ? (
              <>
                {" "}
                · <span className="font-semibold text-tk-accent">{jamaah} berjamaah</span>
              </>
            ) : null}
            {formatHijri(new Date()) ? <span className="text-tk-deep"> · {formatHijri(new Date())}</span> : null}
          </p>
        </header>

        {/* Timeline sumbu waktu horizontal */}
        <section aria-label="Timeline salat hari ini" className="animate-tk-fade-up">
          <div className="mb-2.5 flex items-end justify-between gap-3 px-0.5">
            <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Timeline</h2>
            <p className="text-[11px] text-tk-muted">
              Berikutnya · <span className="font-bold text-tk-accent">{nextMeta.label} {state.nextTime}</span>
            </p>
          </div>
          <PrayerHAxis
            today={today}
            prayers={prayersToday}
            schedule={schedule}
            detailOf={detailOf}
            nextState={{ next: state.next, current: state.current }}
            onRecord={onRecord}
          />
          <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-tk-muted">
            Ketuk blok salat untuk mencatat status, cara (berjamaah/mandiri), dan waktunya. Gulir untuk melihat sumbu
            penuh — garis orange menandai waktu berjalan.
          </p>
          {friday ? (
            <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-tk-muted">
              {fridayZuhurAlt
                ? "Hari ini dicatat sebagai Salat Zuhur (alternatif Salat Jumat)."
                : "Hari Jumat: slot Zuhur digantikan Salat Jumat (berjamaah di masjid)."}
            </p>
          ) : null}
        </section>
      </div>

      {/* Ibadah sunah yang dilacak — daftar baris minimal */}
      {extrasList.length > 0 ? (
        <section aria-label="Ibadah sunah" className="mt-8 lg:col-span-5 lg:mt-0">
          <SectionHeader title="Ibadah Sunah" caption="Pelengkap hari ini — sedekah juga tersedia di Rizq & Amal" />
          <div className="glass overflow-hidden rounded-[1.5rem]">
            {extrasList.map(({ id, label, caption }, i) => {
              const Icon = EXTRA_ICONS[id];
              const done = !!logs[today]?.extras?.[id];
              return (
                <div key={id} className={cn(i > 0 && "border-t border-tk-line-soft")}>
                  <SunnahToggle id={id} label={label} caption={caption} icon={Icon} done={done} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Toggle ibadah sunah — baris hairline, perilaku sama dengan kartu extras lama. */
function SunnahToggle({
  id,
  label,
  caption,
  icon: Icon,
  done,
}: {
  id: ExtraId;
  label: string;
  caption: string;
  icon: typeof Sun;
  done: boolean;
}) {
  const toggleExtra = useWorshipStore((s) => s.toggleExtra);
  const today = todayKey();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={done}
      aria-label={`Tandai ${label} sebagai ${done ? "belum selesai" : "selesai"}`}
      onClick={() => {
        toggleExtra(today, id);
        toast[done ? "info" : "success"](done ? `${label} ditandai belum selesai` : `${label} tercatat selesai`);
      }}
      className="tap flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
    >
      <span
        aria-hidden
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          done ? "bg-tk-violet text-white" : "border-[1.5px] border-tk-line-strong text-tk-muted"
        )}
      >
        {done ? <Check size={14} strokeWidth={2.8} /> : <Icon size={15} strokeWidth={1.8} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[13.5px]", done ? "font-semibold text-tk-ink" : "font-medium text-tk-ink/90")}>{label}</span>
        <span className="block truncate text-[10.5px] text-tk-muted">{caption}</span>
      </span>
      {done ? <Check size={15} className="shrink-0 text-tk-violet" strokeWidth={2.4} /> : null}
    </button>
  );
}

const PRAYER_ORDER: { id: PrayerId; label: string }[] = PRAYERS.map((p) => ({ id: p.id, label: p.label }));

/* ================= Tab Bulanan ================= */

function MonthTab({ today }: { today: string }) {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const cells = monthCalendarDayKeys(today, offset);
  const monthLabel = new Date(
    parseInt(today.slice(0, 4), 10),
    parseInt(today.slice(5, 7), 10) - 1 + offset,
    1
  ).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  /** Ringkasan status salat satu tanggal dari catatan asli. */
  const statusFor = (key: string) => {
    let jamaah = 0;
    let mandiri = 0;
    let missed = 0;
    for (const id of PRAYER_IDS) {
      const d = selectPrayerDetail(prayerDetails, logs, key, id);
      if (d.status === "done") {
        if (d.kind === "berjamaah") jamaah++;
        else mandiri++;
      } else if (d.status === "missed") missed++;
    }
    return { jamaah, mandiri, missed, done: jamaah + mandiri, hasData: jamaah + mandiri > 0 || missed > 0 };
  };

  const monthKeys = cells.filter((k): k is string => !!k && k <= today);
  const daysWithAny = monthKeys.filter((k) => statusFor(k).done > 0).length;
  const canGoNext = offset < 0;

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() => setOffset((o) => o - 1)}
            className="tap flex h-9 w-9 items-center justify-center rounded-full bg-tk-panel-strong text-tk-muted transition-colors hover:text-tk-ink"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[15px] font-bold text-tk-ink">{monthLabel}</p>
            <p className="text-[10.5px] text-tk-muted">{daysWithAny} hari dengan salat tercatat</p>
          </div>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            disabled={!canGoNext}
            onClick={() => canGoNext && setOffset((o) => o + 1)}
            className={cn(
              "tap flex h-9 w-9 items-center justify-center rounded-full bg-tk-panel-strong text-tk-muted transition-colors hover:text-tk-ink",
              !canGoNext && "opacity-30"
            )}
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {/* Kalender minimalis: angka + lima titik mungil */}
        <div className="mt-4 grid grid-cols-7 gap-x-1 gap-y-2 text-center" key={offset}>
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <span key={d} className="gs-overline pb-1">
              {d}
            </span>
          ))}
          {cells.map((key, i) => {
            if (!key) return <span key={`blank-${i}`} aria-hidden className="aspect-[3/4]" />;
            const isFuture = key > today;
            const st = isFuture ? { jamaah: 0, mandiri: 0, missed: 0, done: 0, hasData: false } : statusFor(key);
            return (
              <button
                key={key}
                type="button"
                aria-label={`Rincian tanggal ${key}`}
                onClick={() => setSelected(key)}
                className={cn(
                  "tap relative flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl text-[11.5px] transition-colors",
                  key === today ? "bg-tk-violet font-bold text-white" : "text-tk-ink/85 hover:bg-tk-panel-strong",
                  isFuture && "opacity-35"
                )}
              >
                <span className="tnum leading-none">{parseInt(key.slice(-2), 10)}</span>
                <span aria-hidden className="flex h-[5px] items-center gap-[3px]">
                  {Array.from({ length: 5 }, (_, n) => (
                    <span
                      key={n}
                      className={cn(
                        "h-[4px] w-[4px] rounded-full",
                        n < st.jamaah
                          ? "bg-tk-violet"
                          : n < st.jamaah + st.mandiri
                            ? "bg-tk-violet/45"
                            : n >= 5 - st.missed
                              ? "bg-tk-amber/70"
                              : "bg-tk-track"
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-tk-line pt-3 text-[10.5px] text-tk-muted">
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tk-violet" /> Berjamaah
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tk-violet/45" /> Mandiri
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tk-amber/70" /> Tidak dilaksanakan
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tk-track" /> Tanpa catatan (bukan gagal)
          </span>
        </div>
      </GlassCard>

      <p className="px-1 text-[10.5px] leading-relaxed text-tk-muted">
        Tanggal tanpa catatan tidak dihitung sebagai salat yang terlewat — ia hanya belum mempunyai catatan. Ketuk tanggal
        untuk melihat detailnya.
      </p>

      {selected ? <DayDetailSheet date={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* ================= Tab Qada ================= */

function QadaTab({ today }: { today: string }) {
  const qadaRecords = useWorshipStore((s) => s.qadaRecords);
  const addQada = useWorshipStore((s) => s.addQada);
  const completeQada = useWorshipStore((s) => s.completeQada);
  const reopenQada = useWorshipStore((s) => s.reopenQada);
  const deleteQada = useWorshipStore((s) => s.deleteQada);

  const [formPrayer, setFormPrayer] = useState<PrayerId>("subuh");
  const [formDate, setFormDate] = useState(today);
  const [formNote, setFormNote] = useState("");

  const pending = qadaRecords.filter((q) => !q.completedAt);
  const completed = qadaRecords
    .filter((q) => q.completedAt)
    .sort((a, b) => Date.parse(b.completedAt ?? "0") - Date.parse(a.completedAt ?? "0"));
  const completedThisMonth = completed.filter((q) => (q.completedAt ?? "").slice(0, 7) === today.slice(0, 7)).length;

  const submit = () => {
    if (formDate > today) {
      toast.error("Tanggal qada tidak boleh di masa depan");
      return;
    }
    const rec = addQada(formPrayer, formDate, formNote);
    if (!rec) {
      toast.info("Catatan ini sudah ada di daftar qada");
      return;
    }
    setFormNote("");
    toast.success("Ditambahkan ke daftar qada — pelan-pelan, satu per satu");
  };

  const grouped = PRAYER_IDS.map((id) => ({ id, items: pending.filter((q) => q.prayer === id) })).filter((g) => g.items.length > 0);

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      <div className="space-y-8 lg:col-span-7">
        {/* Ringkasan — kartu ORANGE (gaya kartu oranye referensi) */}
        <section aria-label="Ringkasan qada" className="animate-tk-fade-up glass-hero rounded-[1.4rem] p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Qada — salat yang ingin dimakbulkan</p>
          <p className="gs-display mt-3.5 text-[44px] font-bold leading-none text-white">
            {pending.length} <span className="text-[14px] font-bold text-white/80">belum selesai</span>
          </p>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/90">
            {completedThisMonth > 0
              ? `Bulan ini kamu sudah menyelesaikan ${completedThisMonth} qada. Terus bertumbuh.`
              : "Pelan-pelan, satu per satu — tanpa menghakimi diri."}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, completedThisMonth * 12)}%` }} />
          </div>
        </section>

        {/* Daftar qada berjalan, dikelompokkan per waktu salat */}
        {grouped.length > 0 ? (
          <section aria-label="Daftar qada berjalan" className="space-y-5">
            {grouped.map(({ id, items }) => (
              <div key={id}>
                <p className="mb-1.5 flex items-center gap-2 px-0.5 text-[13px] font-bold text-tk-ink">
                  {prayerMetaFor(today, id, true).label}
                  <span className="tnum text-[11.5px] font-semibold text-tk-muted">{items.length}</span>
                </p>
                <div className="glass overflow-hidden rounded-[1.5rem]">
                  {items.map((q, i) => (
                    <div key={q.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-tk-line-soft")}>
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tk-amber-soft text-tk-amber">
                        <BookMarked size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-tk-ink">{formatDayFullOf(q.missedDate)}</span>
                        {q.note ? <span className="block truncate text-[10.5px] text-tk-muted">{q.note}</span> : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          completeQada(q.id);
                          toast.success("Alhamdulillah, qada tercatat selesai");
                        }}
                        className="tap flex shrink-0 items-center gap-1 rounded-full bg-tk-lime px-3 py-1.5 text-[10.5px] font-bold text-tk-lime-ink"
                      >
                        <Check size={12} strokeWidth={3} /> Sudah diqada
                      </button>
                      <ConfirmButton
                        label="Hapus catatan qada"
                        title="Hapus catatan qada ini?"
                        description="Catatan akan dikeluarkan dari daftar qada. Bila kelak perlu, kamu bisa menambahkannya lagi lewat formulir di samping."
                        onConfirm={() => {
                          deleteQada(q.id);
                          toast.info("Catatan qada dihapus");
                        }}
                        className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tk-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                      >
                        <Trash2 size={14} />
                      </ConfirmButton>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <p className="rounded-[1.5rem] bg-tk-panel-soft px-4 py-7 text-center text-[12.5px] leading-relaxed text-tk-muted">
            Daftar qada masih kosong. Bila ada salat yang terlewat, kamu bisa menandainya dari tab Hari Ini atau menambahkan
            manual di samping.
          </p>
        )}
      </div>

      <div className="mt-8 space-y-8 lg:col-span-5 lg:mt-0">
        {/* Pengingat hadis — blok editorial tanpa kartu */}
        <section aria-label="Hadis tentang qada">
          <p className="gs-overline">{HADITH_QADA.tag}</p>
          <p className="quran-arabic mt-3.5 text-right text-[20px] leading-[1.95] text-tk-ink">{HADITH_QADA.arabic}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-tk-ink/90">&ldquo;{HADITH_QADA.text}&rdquo;</p>
          <p className="mt-2.5 text-[11px] font-semibold text-tk-accent">{HADITH_QADA.source}</p>
        </section>

        {/* Tambah manual — formulir gaya referensi kanan: label tegas + input gelap */}
        <section aria-label="Tambah qada manual">
          <SectionHeader title="Tambah Catatan Qada" caption="Isi manual salat yang ingin kamu qada" />
          <GlassCard className="space-y-3.5 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="qada-prayer" className="tk-label text-[13px]">
                  Waktu salat
                </label>
                <select
                  id="qada-prayer"
                  value={formPrayer}
                  onChange={(e) => setFormPrayer(e.target.value as PrayerId)}
                  className="tk-field"
                >
                  {PRAYERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="qada-date" className="tk-label text-[13px]">
                  Tanggal salat
                </label>
                <input
                  id="qada-date"
                  type="date"
                  value={formDate}
                  max={today}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="tk-field"
                />
              </div>
            </div>
            <div>
              <label htmlFor="qada-note" className="tk-label text-[13px]">
                Catatan
              </label>
              <input
                id="qada-note"
                type="text"
                value={formNote}
                maxLength={120}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Catatan singkat (opsional)"
                aria-label="Catatan singkat (opsional)"
                className="tk-field"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              className="tap gs-ink-btn flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold shadow-[0_10px_24px_-10px_rgba(250,82,0,0.55)]"
            >
              <Plus size={16} /> Tambah ke Daftar Qada
            </button>
          </GlassCard>
        </section>

        {/* Riwayat penyelesaian */}
        {completed.length > 0 ? (
          <section aria-label="Riwayat qada selesai">
            <SectionHeader title="Riwayat Qada Selesai" caption={`${completed.length} qada tercatat selesai`} />
            <GlassCard className="thin-scrollbar max-h-80 overflow-y-auto">
              <ul className="divide-y divide-tk-line-soft">
                {completed.slice(0, 40).map((q) => (
                  <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tk-lime text-tk-lime-ink">
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-tk-ink">
                        {PRAYERS.find((p) => p.id === q.prayer)?.label ?? q.prayer} · {formatDayFullOf(q.missedDate)}
                      </span>
                      <span className="block text-[10.5px] text-tk-muted">
                        Diselesaikan {formatDayFullOf((q.completedAt ?? "").slice(0, 10))}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Buka kembali catatan qada ini"
                      onClick={() => {
                        reopenQada(q.id);
                        toast.info("Catatan dikembalikan ke daftar qada");
                      }}
                      className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tk-muted/70 hover:bg-tk-violet/10 hover:text-tk-violet"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/* ================= Halaman Sholat ================= */

export function PrayerPage() {
  const today = todayKey();
  const [tab, setTab] = useState<Tab>("hari-ini");
  const [recording, setRecording] = useState<PrayerMeta | null>(null);
  const [motivation, setMotivation] = useState<{ variant: MotivationVariant; prayer: string } | null>(null);

  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt?.[today] ?? false);
  const setPrayerRecord = useWorshipStore((s) => s.setPrayerRecord);
  const addQada = useWorshipStore((s) => s.addQada);

  const savePrayer = (meta: PrayerMeta, detail: PrayerDetail | null, opts?: { addToQada?: boolean }) => {
    const isJumat = isFriday(today) && !fridayZuhurAlt && meta.id === "zuhur";
    setPrayerRecord(today, meta.id, detail);
    const fullName = meta.fullName ?? `Salat ${meta.label}`;
    if (detail?.status === "done") {
      setMotivation({
        variant: isJumat || detail.kind === "berjamaah" ? "jamaah" : "mandiri",
        prayer: fullName,
      });
    } else if (detail?.status === "missed") {
      if (opts?.addToQada) {
        const rec = addQada(meta.id, today);
        setMotivation({ variant: "missed", prayer: fullName });
        if (!rec) toast.info("Catatan qada untuk salat ini sudah ada — tidak diduplikasi");
      } else {
        setMotivation({ variant: "missed", prayer: fullName });
      }
    } else {
      toast.info(`Catatan ${fullName} dihapus`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="animate-tk-fade-up pt-1">
        <h1 className="text-[28px] font-bold tracking-[-0.03em] text-tk-ink">Sholat</h1>
        <p className="mt-1 text-[12.5px] text-tk-muted">Catat lima waktu salat dan kelola qada dengan tenang</p>
      </header>

      <SegmentedTabs
        ariaLabel="Bagian halaman sholat"
        items={[
          { id: "hari-ini" as const, label: "Hari Ini" },
          { id: "bulanan" as const, label: "Bulanan" },
          { id: "qada" as const, label: "Qada" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div key={tab} className="tk-fade-in">
        {tab === "hari-ini" ? <TodayTab today={today} onRecord={setRecording} /> : null}
        {tab === "bulanan" ? <MonthTab today={today} /> : null}
        {tab === "qada" ? <QadaTab today={today} /> : null}
      </div>

      {recording ? (
        <PrayerRecordDialog
          meta={recording}
          date={today}
          isJumat={isFriday(today) && !fridayZuhurAlt && recording.id === "zuhur"}
          detail={selectPrayerDetail(prayerDetails, logs, today, recording.id)}
          onClose={() => setRecording(null)}
          onSave={(detail, opts) => {
            if (recording) savePrayer(recording, detail, opts);
          }}
        />
      ) : null}

      {motivation ? (
        <MotivationPopup
          variant={motivation.variant}
          prayerLabel={motivation.prayer}
          dateLabel={formatDayFullOf(today)}
          onClose={() => setMotivation(null)}
        />
      ) : null}
    </div>
  );
}
