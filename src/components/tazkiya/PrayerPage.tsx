"use client";

/**
 * Tazkiya v4 — Halaman Sholat sebagai habit tracker.
 * Komposisi baru: ringkasan angka-besar + deretan lima titik status, kartu
 * salat yang WAJAHNYA BERBEDA per status (selesai = aksen lavender + cek lime,
 * belum = garis putus, terlewat = tint amber), kalender pil ber-titik (bukan
 * sel bulat penuh), dan Qada pada kartu tinta premium. Semua logika catat,
 * Jumat/Zuhur alternatif, qada, dan dialog tidak berubah.
 */

import { useMemo, useState } from "react";
import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  User,
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
import { prayerTiming } from "@/lib/tazkiya/goals";
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

/* ================= Kartu satu salat — wajah berbeda per status ================= */

function PrayerRow({
  meta,
  detail,
  time,
  onPress,
}: {
  meta: PrayerMeta;
  detail: PrayerDetail;
  time?: string;
  onPress: () => void;
}) {
  const Icon = PRAYER_ICONS[meta.id];
  const isDone = detail.status === "done";
  const isMissed = detail.status === "missed";
  const timing = prayerTiming(detail, time, todayKey());
  const KindIcon = detail.kind === "berjamaah" ? Users : User;

  const statusChips: { text: string; cls: string }[] = [];
  if (isDone) {
    statusChips.push(
      timing === "ontime"
        ? { text: "Tepat waktu", cls: "bg-tz-lime text-tz-lime-ink" }
        : timing === "late"
          ? { text: "Terlambat · dilaksanakan", cls: "bg-tz-amber-soft text-tz-amber" }
          : { text: "Dilaksanakan", cls: "bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent" }
    );
    if (detail.kind === "berjamaah") {
      statusChips.push({ text: "Berjamaah", cls: "bg-tz-blue-soft text-[#3d63c2] dark:text-[#aebcff]" });
    } else if (detail.kind === "mandiri") {
      statusChips.push({ text: "Mandiri", cls: "bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent" });
    }
  } else if (isMissed) {
    statusChips.push({ text: "Tidak dilaksanakan", cls: "bg-[#FBE4E6] text-[#B3424C] dark:bg-[#3A2226] dark:text-[#F09AA0]" });
  } else {
    statusChips.push({ text: "Belum dicatat", cls: "bg-tz-panel-soft text-tz-muted" });
  }

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={`Catat ${meta.label} — ${isDone ? "dilaksanakan" : isMissed ? "tidak dilaksanakan" : "belum dicatat"}`}
      className={cn(
        "tap relative flex w-full items-center gap-3.5 overflow-hidden rounded-[1.3rem] border p-3.5 text-left transition-all",
        isDone
          ? "border-tz-violet/35 bg-tz-panel shadow-[0_1px_2px_rgba(25,25,35,0.03),0_14px_34px_-26px_rgba(46,38,104,0.3)]"
          : isMissed
            ? "border-tz-amber/30 bg-tz-amber-soft/60"
            : "border-tz-line bg-tz-panel hover:border-tz-violet/40"
      )}
    >
      {/* aksen kiri: strip status */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3.5px]",
          isDone ? "bg-tz-violet" : isMissed ? "bg-tz-amber" : "bg-tz-line-strong"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
          isDone
            ? "bg-tz-violet text-white"
            : isMissed
              ? "bg-tz-amber/15 text-tz-amber"
              : "border border-dashed border-tz-line-strong text-tz-muted"
        )}
      >
        {isDone ? <Check size={19} strokeWidth={2.6} /> : <Icon size={18} strokeWidth={1.9} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14.5px] font-bold tracking-[-0.01em] text-tz-ink">{meta.label}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {time ? (
            <span className="tnum inline-flex items-center gap-1 text-[10.5px] font-medium text-tz-muted">
              <Clock size={10} /> {time}
            </span>
          ) : null}
          {isDone && detail.kind ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-tz-violet dark:text-tz-accent">
              <KindIcon size={10} /> {detail.kind === "berjamaah" ? "Berjamaah" : "Mandiri"}
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1">
        {statusChips.map((c) => (
          <span key={c.text} className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold leading-tight", c.cls)}>
            {c.text}
          </span>
        ))}
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
  const pct = Math.round((doneCount / 5) * 100);
  const jamaah = prayersToday.filter((p) => detailOf(p.id).status === "done" && detailOf(p.id).kind === "berjamaah").length;
  const ontime = prayersToday.filter((p) => prayerTiming(detailOf(p.id), schedule[p.id]?.time, today) === "ontime").length;

  const nextEntry = (() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const p of PRAYER_ORDER) {
      const [h, m] = (schedule[p.id]?.time ?? "00:00").split(":").map((v) => parseInt(v, 10) || 0);
      if (nowMin < h * 60 + m) return p;
    }
    return null;
  })();

  const extrasList = EXTRAS.filter((e) => tracked.includes(e.id));

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      <div className="space-y-5 lg:col-span-7">
        {/* Ringkasan hari ini: angka besar + deretan titik status (flat) */}
        <div className="rounded-[1.6rem] border border-tz-line bg-tz-panel p-5 shadow-[0_1px_2px_rgba(25,25,35,0.03),0_18px_44px_-30px_rgba(46,38,104,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tz-muted">Salat hari ini</p>
              <p className="tnum mt-1 font-display text-[46px] font-bold leading-none tracking-[-0.03em] text-tz-ink">
                {doneCount}
                <span className="text-[22px] font-bold text-tz-muted"> / 5</span>
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-tz-muted">
                {nextEntry
                  ? `Berikutnya: ${nextEntry.label} pukul ${schedule[nextEntry.id]?.time}`
                  : "Kelima waktu telah berlalu — terima kasih telah menjaga hari ini"}
              </p>
            </div>
            <span className="rounded-full bg-tz-lime px-3 py-1.5 text-[12px] font-bold text-tz-lime-ink">{pct}%</span>
          </div>

          {/* Deretan lima titik status */}
          <div className="mt-4 flex items-center gap-2" role="img" aria-label={`${doneCount} dari 5 salat tercatat`}>
            {prayersToday.map((p) => {
              const st = detailOf(p.id).status;
              return (
                <span
                  key={p.id}
                  aria-hidden
                  className={cn(
                    "h-2.5 flex-1 rounded-full transition-colors",
                    st === "done" ? "bg-tz-lime" : st === "missed" ? "bg-tz-amber/60" : "bg-tz-track"
                  )}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip className="border-tz-violet/25 bg-tz-lavender/60 text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">Berjamaah {jamaah}</Chip>
            {ontime > 0 ? <Chip className="border-tz-line">Tepat waktu {ontime}</Chip> : null}
            <Chip className="border-tz-line">{formatHijri(new Date()) || formatDayFullOf(today)}</Chip>
          </div>
        </div>

        {/* Lima waktu */}
        <section aria-label="Daftar salat wajib hari ini">
          <SectionHeader title="Lima Waktu Salat" caption="Ketuk kartu untuk mencatat status, cara, dan waktunya" />
          <div className="space-y-2">
            {prayersToday.map((p) => (
              <PrayerRow key={p.id} meta={p} detail={detailOf(p.id)} time={schedule[p.id]?.time} onPress={() => onRecord(p)} />
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

      {/* Ibadah sunah yang dilacak */}
      {extrasList.length > 0 ? (
        <section aria-label="Ibadah sunah" className="mt-5 lg:col-span-5 lg:mt-0">
          <SectionHeader title="Ibadah Sunah" caption="Pelengkap hari ini — sedekah juga tersedia di Rizq & Amal" />
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
            {extrasList.map(({ id, label, caption }) => {
              const Icon = EXTRA_ICONS[id];
              const done = !!logs[today]?.extras?.[id];
              return <SunnahChip key={id} id={id} label={label} caption={caption} icon={Icon} done={done} />;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Toggle ibadah sunah — perilaku sama dengan kartu extras lama. */
function SunnahChip({
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
      className={cn(
        "tap flex items-center gap-3 rounded-[1.3rem] border p-3.5 text-left transition-all",
        done ? "border-tz-violet/40 bg-tz-lavender/50 dark:border-tz-violet/30 dark:bg-tz-accent/10" : "border-tz-line bg-tz-panel"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          done ? "bg-tz-violet text-white" : "border border-dashed border-tz-line-strong text-tz-muted"
        )}
      >
        {done ? <Check size={16} strokeWidth={2.6} /> : <Icon size={16} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-tz-ink">{label}</span>
        <span className="block truncate text-[10px] text-tz-muted">{caption}</span>
      </span>
    </button>
  );
}

const PRAYER_ORDER: { id: PrayerId; label: string }[] = PRAYERS.map((p) => ({ id: p.id, label: p.label }));

/* ================= Tab Bulanan ================= */

function MonthTab({ today }: { today: string }) {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt);
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
            className="tap flex h-9 w-9 items-center justify-center rounded-full border border-tz-line bg-tz-panel-soft text-tz-muted transition-colors hover:text-tz-ink"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate font-display text-[15px] font-bold text-tz-ink">{monthLabel}</p>
            <p className="text-[10px] text-tz-muted">{daysWithAny} hari dengan salat tercatat</p>
          </div>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            disabled={!canGoNext}
            onClick={() => canGoNext && setOffset((o) => o + 1)}
            className={cn(
              "tap flex h-9 w-9 items-center justify-center rounded-full border border-tz-line bg-tz-panel-soft text-tz-muted transition-colors hover:text-tz-ink",
              !canGoNext && "opacity-30"
            )}
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {/* Kalender pil ber-titik */}
        <div className="mt-4 grid grid-cols-7 gap-x-1 gap-y-2 text-center" key={offset}>
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <span key={d} className="pb-1 text-[10px] font-bold uppercase tracking-wide text-tz-muted/80">
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
                  "tap relative flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[0.9rem] border text-[11px] font-semibold transition-colors",
                  key === today
                    ? "border-tz-violet bg-tz-lavender/50 text-tz-ink dark:bg-tz-accent/10"
                    : "border-transparent bg-tz-panel-soft hover:border-tz-line-strong",
                  isFuture && "opacity-35"
                )}
              >
                <span className="tnum leading-none text-tz-ink/90">{parseInt(key.slice(-2), 10)}</span>
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-tz-line pt-3 text-[10px] text-tz-muted">
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
    <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      <div className="space-y-5 lg:col-span-7">
        {/* Ringkasan lembut — kartu tinta premium (pengganti midnight lama) */}
        <div className="tz-task-card" aria-label="Ringkasan qada">
          <div className="tz-task-inner">
            <div className="tz-task-panel">
              <div className="tz-task-tab">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--task-deco)]">
                  Qada — salat yang ingin dimakbulkan
                </span>
                <span className="mt-0.5 truncate text-[11.5px] font-medium text-[color:var(--task-ink-55)]">
                  Pelan-pelan, satu per satu — tanpa menghakimi diri
                </span>
              </div>
              <p className="tnum font-display text-[44px] font-bold leading-none tracking-[-0.03em] text-white">
                {pending.length} <span className="text-[16px] font-bold text-white/60">belum selesai</span>
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-[color:var(--task-ink-70)]">
                {completedThisMonth > 0
                  ? `Bulan ini kamu sudah mencatat ${completedThisMonth} qada selesai. Terus bertumbuh.`
                  : "Tidak apa-apa, selalu ada kesempatan untuk memperbaiki diri."}
              </p>
              <div className="tz-beam mt-3.5 h-[6px]">
                <div
                  className="tz-beam-fill"
                  style={{ width: `${Math.min(100, completedThisMonth * 12)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daftar qada berjalan, dikelompokkan per waktu salat */}
        {grouped.length > 0 ? (
          <section aria-label="Daftar qada berjalan" className="space-y-3">
            {grouped.map(({ id, items }) => (
              <div key={id}>
                <p className="mb-1.5 flex items-center gap-2 px-1 font-display text-[13px] font-bold text-tz-ink">
                  {prayerMetaFor(today, id, true).label}
                  <Chip className="border-tz-line">{items.length}</Chip>
                </p>
                <div className="space-y-1.5">
                  {items.map((q) => (
                    <div key={q.id} className="flex items-center gap-2.5 rounded-[1.1rem] border border-tz-line bg-tz-panel px-3 py-2.5">
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-amber-soft text-tz-amber">
                        <BookMarked size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-tz-ink">{formatDayFullOf(q.missedDate)}</span>
                        {q.note ? <span className="block truncate text-[10px] text-tz-muted">{q.note}</span> : null}
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
                        description="Catatan akan dikeluarkan dari daftar qada. Bila kelak perlu, kamu bisa menambahkannya lagi lewat formulir di bawah."
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
          <p className="rounded-[1.4rem] border border-dashed border-tz-line-strong bg-tz-panel-soft px-4 py-6 text-center text-[12px] leading-relaxed text-tz-muted">
            Daftar qada masih kosong. Bila ada salat yang terlewat, kamu bisa menandainya dari tab Hari Ini atau menambahkan
            manual di samping.
          </p>
        )}
      </div>

      <div className="mt-5 space-y-5 lg:col-span-5 lg:mt-0">
        {/* Pengingat hadis — sumber eksplisit */}
        <GlassCard variant="violet" className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tz-violet dark:text-tz-accent">{HADITH_QADA.tag}</p>
          <p className="quran-arabic mt-2.5 text-right text-[19px] leading-[1.9] text-tz-ink">{HADITH_QADA.arabic}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-tz-ink/90">&ldquo;{HADITH_QADA.text}&rdquo;</p>
          <div className="mt-2.5">
            <Chip className="border-tz-violet/25 bg-white/60 text-tz-violet dark:bg-white/10 dark:text-tz-accent">{HADITH_QADA.source}</Chip>
          </div>
        </GlassCard>

        {/* Tambah manual */}
        <section aria-label="Tambah qada manual">
          <SectionHeader title="Tambah Catatan Qada" caption="Isi manual salat yang ingin kamu qada" />
          <GlassCard className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="qada-prayer" className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">
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
                <label htmlFor="qada-date" className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">
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
              className="tap flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-tz-ink font-display text-[14px] font-bold text-white"
            >
              <Plus size={16} className="text-tz-lime" /> Tambah ke Daftar Qada
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
                  <li key={q.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-lime/50 text-tz-lime-ink dark:bg-tz-lime/15 dark:text-tz-lime">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-tz-ink">
                        {PRAYERS.find((p) => p.id === q.prayer)?.label ?? q.prayer} · {formatDayFullOf(q.missedDate)}
                      </span>
                      <span className="block text-[10px] text-tz-muted">
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
    <div className="space-y-5">
      <header className="animate-tz-fade-up pt-1">
        <h1 className="font-display text-[30px] font-bold tracking-[-0.025em] text-tz-ink">
          Sholat<span className="text-tz-violet">.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-tz-muted">Catat lima waktu salat dan kelola qada dengan tenang</p>
      </header>

      {/* Tab garis editorial */}
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
