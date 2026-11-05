"use client";

/**
 * Tazkiya v5 — Halaman Sholat "minimal prayer tracker".
 * Komposisi baru: featured sholat berikutnya (blok lavender lembut dengan
 * countdown besar), TIMELINE VERTIKAL lima waktu (garis + titik status,
 * bukan kartu seragam) dengan status mudah dibaca (dilaksanakan / belum /
 * terlewat + indikator berjamaah/mandiri), kalender bulanan minimalis,
 * dan Qada pada blok lavender dengan daftar baris ringkas. Logika catat,
 * Jumat/Zuhur alternatif, qada, dan dialog tidak berubah sama sekali.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudSun,
  HandCoins,
  Minus,
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
import { formatCountdown, nextPrayerState, prayerTiming } from "@/lib/tazkiya/goals";
import { HADITH_QADA } from "@/lib/tazkiya/hadith";
import { Chip, ConfirmButton, GlassCard, SectionHeader, SegmentedTabs } from "./ui-bits";
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

/* ================= Timeline vertikal lima waktu ================= */

function PrayerTimelineRow({
  meta,
  detail,
  time,
  isLast,
  isNext,
  onPress,
}: {
  meta: PrayerMeta;
  detail: PrayerDetail;
  time?: string;
  isLast: boolean;
  isNext?: boolean;
  onPress: () => void;
}) {
  const isDone = detail.status === "done";
  const isMissed = detail.status === "missed";
  const timing = prayerTiming(detail, time, todayKey());
  const JamaahIcon = Users;

  /** Satu kalimat status yang mudah dibaca + warna titiknya. */
  const status = (() => {
    if (isDone) {
      if (timing === "late") return { text: "Dilaksanakan · terlambat", dot: "bg-tz-amber" };
      if (timing === "ontime") return { text: "Dilaksanakan · tepat waktu", dot: "bg-tz-violet" };
      return { text: "Dilaksanakan", dot: "bg-tz-violet" };
    }
    if (isMissed) return { text: "Tidak dilaksanakan", dot: "bg-tz-amber" };
    return { text: "Belum dicatat", dot: "bg-tz-line-strong" };
  })();

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={`Catat ${meta.label} — ${status.text}`}
      className="tap flex w-full items-stretch gap-0 text-left"
    >
      {/* Kolom jam */}
      <span className="w-[52px] shrink-0 pb-6 pt-[13px] sm:w-[60px]">
        <span className={cn("tnum block text-[13.5px] font-bold leading-none", isDone || isMissed ? "text-tz-muted" : "text-tz-ink")}>
          {time ?? "—"}
        </span>
      </span>

      {/* Garis + titik + konten */}
      <span className={cn("relative flex-1 border-l border-tz-line pb-6 pl-5 pt-[9px]", isLast && "border-l-transparent pb-1")}>
        <span
          aria-hidden
          className={cn(
            "absolute -left-[7px] top-[10px] flex h-[14px] w-[14px] items-center justify-center rounded-full",
            isDone
              ? "bg-tz-violet text-white"
              : isMissed
                ? "bg-tz-amber text-white"
                : "border-[1.5px] border-tz-line-strong bg-tz-panel"
          )}
        >
          {isDone ? <Check size={9} strokeWidth={3.5} /> : isMissed ? <Minus size={9} strokeWidth={3.5} /> : null}
        </span>

        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className={cn("block text-[15px] font-bold tracking-[-0.01em]", isNext && !isDone ? "text-tz-accent" : "text-tz-ink")}>
                {meta.label}
              </span>
              {isNext && !isDone ? (
                <span className="rounded-full bg-tz-violet px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                  Berikutnya
                </span>
              ) : null}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-tz-muted">
                <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                {status.text}
              </span>
              {isDone && detail.kind === "berjamaah" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-tz-teal">
                  <JamaahIcon size={11} /> Berjamaah
                </span>
              ) : null}
              {isDone && detail.kind === "mandiri" ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-tz-violet">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tz-violet/50" /> Mandiri
                </span>
              ) : null}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[10.5px] font-bold",
              isDone ? "bg-tz-panel-strong text-tz-muted" : isNext ? "bg-tz-violet text-white" : "bg-tz-lavender text-tz-accent"
            )}
          >
            {isDone ? "Ubah" : "Catat"}
          </span>
        </span>
      </span>
    </button>
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

  /** Featured: salat berikutnya + countdown (sumber yang sama dengan Beranda). */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(iv);
  }, []);
  const state = nextPrayerState(schedule, now);
  const nextMeta = prayersToday.find((p) => p.id === state.next) ?? prayersToday[0];

  const extrasList = EXTRAS.filter((e) => tracked.includes(e.id));

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      <div className="space-y-8 lg:col-span-7">
        {/* Featured: blok ORANGE dengan countdown besar */}
        <section aria-label="Ringkasan hari ini" className="animate-tz-fade-up glass-hero rounded-[1.6rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/75">Sholat Berikutnya</p>
            <span className="rounded-full bg-white/18 px-3 py-1.5 text-[11.5px] font-bold text-white backdrop-blur-sm">
              {formatCountdown(state.secondsLeft)} lagi
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="v5-display text-[46px] font-extrabold leading-[0.9] text-white sm:text-[54px]">{state.nextTime}</p>
            <div className="pb-1">
              <p className="text-[17px] font-bold tracking-[-0.01em] text-white">{nextMeta.label}</p>
              <p className="mt-0.5 text-[11.5px] font-medium text-white/75">
                {formatHijri(new Date()) || formatDayFullOf(today)}
              </p>
            </div>
          </div>

          {/* Status hari ini: angka + strip lima slot */}
          <div className="mt-6 border-t border-white/20 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12.5px] font-medium text-white/90">
                Sudah dilaksanakan{" "}
                <span className="tnum font-bold">
                  {doneCount}
                  <span className="text-white/60">/5</span>
                </span>
                {jamaah > 0 ? <span className="ml-2 text-[11.5px] font-semibold text-white">{jamaah} berjamaah</span> : null}
              </p>
              <span className="tnum text-[12.5px] font-bold text-white">{Math.round((doneCount / 5) * 100)}%</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5" role="img" aria-label={`${doneCount} dari 5 salat tercatat`}>
              {prayersToday.map((p) => {
                const st = detailOf(p.id).status;
                return (
                  <span
                    key={p.id}
                    aria-hidden
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      st === "done" ? "bg-white" : st === "missed" ? "bg-[#FFD8A8]" : "bg-white/25"
                    )}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Timeline lima waktu — garis vertikal, bukan kartu */}
        <section aria-label="Daftar salat wajib hari ini">
          <SectionHeader title="Lima Waktu" caption="Ketuk untuk mencatat status, cara, dan waktunya" />
          <div className="tz-fade-in">
            {prayersToday.map((p, i) => (
              <PrayerTimelineRow
                key={p.id}
                meta={p}
                detail={detailOf(p.id)}
                time={schedule[p.id]?.time}
                isLast={i === prayersToday.length - 1}
                isNext={p.id === state.next}
                onPress={() => onRecord(p)}
              />
            ))}
          </div>
          {friday ? (
            <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-tz-muted">
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
                <div key={id} className={cn(i > 0 && "border-t border-tz-line-soft")}>
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
          done ? "bg-tz-violet text-white" : "border-[1.5px] border-tz-line-strong text-tz-muted"
        )}
      >
        {done ? <Check size={14} strokeWidth={2.8} /> : <Icon size={15} strokeWidth={1.8} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[13.5px]", done ? "font-semibold text-tz-ink" : "font-medium text-tz-ink/90")}>{label}</span>
        <span className="block truncate text-[10.5px] text-tz-muted">{caption}</span>
      </span>
      {done ? <Check size={15} className="shrink-0 text-tz-violet" strokeWidth={2.4} /> : null}
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
            className="tap flex h-9 w-9 items-center justify-center rounded-full bg-tz-panel-soft text-tz-muted transition-colors hover:text-tz-ink"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[15px] font-bold text-tz-ink">{monthLabel}</p>
            <p className="text-[10.5px] text-tz-muted">{daysWithAny} hari dengan salat tercatat</p>
          </div>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            disabled={!canGoNext}
            onClick={() => canGoNext && setOffset((o) => o + 1)}
            className={cn(
              "tap flex h-9 w-9 items-center justify-center rounded-full bg-tz-panel-soft text-tz-muted transition-colors hover:text-tz-ink",
              !canGoNext && "opacity-30"
            )}
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {/* Kalender minimalis: angka + lima titik mungil */}
        <div className="mt-4 grid grid-cols-7 gap-x-1 gap-y-2 text-center" key={offset}>
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <span key={d} className="v5-overline pb-1">
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
                  key === today ? "bg-tz-lavender font-bold text-tz-ink" : "text-tz-ink/85 hover:bg-tz-panel-soft",
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
                          ? "bg-tz-violet"
                          : n < st.jamaah + st.mandiri
                            ? "bg-tz-violet/45"
                            : n >= 5 - st.missed
                              ? "bg-tz-amber/70"
                              : "bg-tz-track"
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-tz-line pt-3 text-[10.5px] text-tz-muted">
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tz-violet" /> Berjamaah
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tz-violet/45" /> Mandiri
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tz-amber/70" /> Tidak dilaksanakan
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-full bg-tz-track" /> Tanpa catatan (bukan gagal)
          </span>
        </div>
      </GlassCard>

      <p className="px-1 text-[10.5px] leading-relaxed text-tz-muted">
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
        {/* Ringkasan — blok lavender lembut (pengganti kartu tinta gelap lama) */}
        <section aria-label="Ringkasan qada" className="animate-tz-fade-up rounded-[2rem] bg-tz-lavender p-5 sm:p-6">
          <p className="v5-overline">Qada — salat yang ingin dimakbulkan</p>
          <p className="v5-display mt-4 text-[46px] font-extrabold leading-none text-tz-ink">
            {pending.length} <span className="text-[15px] font-bold text-tz-muted">belum selesai</span>
          </p>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-tz-ink/85">
            {completedThisMonth > 0
              ? `Bulan ini kamu sudah menyelesaikan ${completedThisMonth} qada. Terus bertumbuh.`
              : "Pelan-pelan, satu per satu — tanpa menghakimi diri."}
          </p>
          <div className="tz-beam mt-4 h-1.5">
            <div className="tz-beam-fill" style={{ width: `${Math.min(100, completedThisMonth * 12)}%` }} />
          </div>
        </section>

        {/* Daftar qada berjalan, dikelompokkan per waktu salat */}
        {grouped.length > 0 ? (
          <section aria-label="Daftar qada berjalan" className="space-y-5">
            {grouped.map(({ id, items }) => (
              <div key={id}>
                <p className="mb-1.5 flex items-center gap-2 px-0.5 text-[13px] font-bold text-tz-ink">
                  {prayerMetaFor(today, id, true).label}
                  <span className="tnum text-[11.5px] font-semibold text-tz-muted">{items.length}</span>
                </p>
                <div className="glass overflow-hidden rounded-[1.5rem]">
                  {items.map((q, i) => (
                    <div key={q.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-tz-line-soft")}>
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-amber-soft text-tz-amber">
                        <BookMarked size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-tz-ink">{formatDayFullOf(q.missedDate)}</span>
                        {q.note ? <span className="block truncate text-[10.5px] text-tz-muted">{q.note}</span> : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          completeQada(q.id);
                          toast.success("Alhamdulillah, qada tercatat selesai");
                        }}
                        className="tap flex shrink-0 items-center gap-1 rounded-full bg-tz-lime px-3 py-1.5 text-[10.5px] font-bold text-tz-lime-ink"
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
                        className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
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
          <p className="rounded-[1.5rem] bg-tz-panel-soft px-4 py-7 text-center text-[12.5px] leading-relaxed text-tz-muted">
            Daftar qada masih kosong. Bila ada salat yang terlewat, kamu bisa menandainya dari tab Hari Ini atau menambahkan
            manual di samping.
          </p>
        )}
      </div>

      <div className="mt-8 space-y-8 lg:col-span-5 lg:mt-0">
        {/* Pengingat hadis — blok editorial tanpa kartu */}
        <section aria-label="Hadis tentang qada">
          <p className="v5-overline">{HADITH_QADA.tag}</p>
          <p className="quran-arabic mt-3.5 text-right text-[20px] leading-[1.95] text-tz-ink">{HADITH_QADA.arabic}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-tz-ink/90">&ldquo;{HADITH_QADA.text}&rdquo;</p>
          <p className="mt-2.5 text-[11px] font-semibold text-tz-violet">{HADITH_QADA.source}</p>
        </section>

        {/* Tambah manual */}
        <section aria-label="Tambah qada manual">
          <SectionHeader title="Tambah Catatan Qada" caption="Isi manual salat yang ingin kamu qada" />
          <GlassCard className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="qada-prayer" className="v5-overline mb-1.5 block">
                  Waktu salat
                </label>
                <select
                  id="qada-prayer"
                  value={formPrayer}
                  onChange={(e) => setFormPrayer(e.target.value as PrayerId)}
                  className="tz-field"
                >
                  {PRAYERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="qada-date" className="v5-overline mb-1.5 block">
                  Tanggal salat
                </label>
                <input
                  id="qada-date"
                  type="date"
                  value={formDate}
                  max={today}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="tz-field"
                />
              </div>
            </div>
            <input
              type="text"
              value={formNote}
              maxLength={120}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Catatan singkat (opsional)"
              aria-label="Catatan singkat (opsional)"
              className="tz-field"
            />
            <button
              type="button"
              onClick={submit}
              className="tap v5-ink-btn flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold"
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
              <ul className="divide-y divide-tz-line-soft">
                {completed.slice(0, 40).map((q) => (
                  <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-lavender text-tz-violet">
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-tz-ink">
                        {PRAYERS.find((p) => p.id === q.prayer)?.label ?? q.prayer} · {formatDayFullOf(q.missedDate)}
                      </span>
                      <span className="block text-[10.5px] text-tz-muted">
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
                      className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tz-muted/70 hover:bg-tz-violet/10 hover:text-tz-violet"
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
      <header className="animate-tz-fade-up pt-1">
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-tz-ink">Sholat</h1>
        <p className="mt-1 text-[12.5px] text-tz-muted">Catat lima waktu salat dan kelola qada dengan tenang</p>
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

      <div key={tab} className="tz-fade-in">
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
