"use client";

/**
 * Tazkiya — Halaman Beranda.
 * Sapaan, tanggal, progres harian, salat wajib dengan pencatatan lengkap
 * (mandiri / berjamaah / tidak dilaksanakan + alasan), penggantian Zuhur
 * oleh Salat Jumat pada hari Jumat, kartu Doa Hari Ini, Al-Qur'an, zikir,
 * aktivitas tambahan yang dilacak, dan statistik mingguan.
 */

import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  CircleDot,
  CircleDashed,
  CircleMinus,
  CircleUserRound,
  CloudSun,
  HandCoins,
  HandHeart,
  Moon,
  MoonStar,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  EXTRAS,
  PRAYERS,
  SALAT_JUMAT,
  ZUHUR_ALTERNATIF,
  missReasonLabel,
  selectPrayerDetail,
  type ExtraId,
  type PrayerDetail,
  type PrayerId,
  type PrayerMeta,
} from "@/lib/tazkiya/types";
import { formatGregorian, formatHijri, isFriday, lastNDays, todayKey } from "@/lib/tazkiya/dates";
import { dayScore, prayerConsistency, surahProgressOnDate, totalActivities } from "@/lib/tazkiya/stats";
import { duaOfTheDay } from "@/lib/tazkiya/duas";
import { getSurah } from "@/lib/tazkiya/quran";
import { Chip, GlassCard, GlowOrb, IconBox, ProgressBar, ProgressRing, SectionHeader } from "./ui-bits";
import { PrayerRecordDialog } from "./PrayerRecordDialog";
import type { TabId } from "./BottomNav";
import { cn } from "@/lib/utils";

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
  doa: HandHeart,
  puasa: UtensilsCrossed,
  sedekah: HandCoins,
};

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Tanggal hari ini (YYYY-MM-DD lokal); diperbarui tiap 30 detik / saat tab aktif. */
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

/** Kartu satu slot salat — simetris, tanpa ikon pojok; ketuk langsung membuka opsi pencatatan. */
function PrayerSlotCard({
  meta,
  icon: Icon,
  detail,
  onPress,
}: {
  meta: PrayerMeta;
  icon: typeof Sun;
  detail: PrayerDetail;
  onPress: () => void;
}) {
  const isDone = detail.status === "done";
  const isMissed = detail.status === "missed";
  const fullName = meta.fullName ?? `Salat ${meta.label}`;
  const KindIcon = detail.kind === "berjamaah" ? Users : User;
  const reasonLabel = isMissed ? (missReasonLabel(detail.reason) ?? "Tidak dilaksanakan") : undefined;
  return (
    <button
      type="button"
      aria-label={`Ketuk untuk mencatat ${fullName} — saat ini ${
        isDone ? `dilaksanakan${detail.kind ? ` (${detail.kind})` : ""}` : isMissed ? "tidak dilaksanakan" : "belum dicatat"
      }`}
      title={
        isDone
          ? `${fullName} — dilaksanakan${detail.kind === "berjamaah" ? " berjamaah" : detail.kind === "mandiri" ? " mandiri" : ""}`
          : isMissed
            ? `${fullName} — tidak dilaksanakan (${reasonLabel})`
            : `${fullName} — ketuk untuk mencatat`
      }
      onClick={onPress}
      className={cn(
        "tap relative flex min-h-[86px] select-none flex-col items-center justify-center gap-2 rounded-[1.15rem] border px-1 py-2.5 transition-all",
        isDone
          ? "border-tz-violet/45 bg-gradient-to-b from-tz-violet/32 to-tz-purple/12 shadow-[0_0_22px_-6px_rgba(156,114,239,0.65),inset_0_1px_0_rgba(255,255,255,0.14)]"
          : isMissed
            ? "border-rose-300/35 bg-rose-400/[0.06] light:border-rose-300 light:bg-rose-50"
            : "glass",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
          isDone
            ? "border-white/25 bg-white/16 text-white"
            : isMissed
              ? "border-rose-300/40 bg-rose-400/10 text-rose-500 light:text-rose-600"
              : "border-tz-line bg-tz-panel text-tz-muted"
        )}
      >
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <span className={cn("px-0.5 text-center text-[10.5px] font-semibold leading-tight", isDone ? "text-white" : "text-tz-ink/75")}>
        {meta.label}
      </span>
      {isDone && detail.kind ? (
        <KindIcon size={10} className="absolute bottom-1.5 text-tz-lavender/90" aria-label={`Dilaksanakan ${detail.kind}`} />
      ) : null}
    </button>
  );
}

export function HomePage({
  onNavigate,
  onOpenTasbih,
}: {
  onNavigate: (tab: TabId) => void;
  onOpenTasbih: () => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const tasbih = useWorshipStore((s) => s.tasbih);
  const readingHistory = useWorshipStore((s) => s.readingHistory);
  const setPrayerRecord = useWorshipStore((s) => s.setPrayerRecord);
  const toggleExtra = useWorshipStore((s) => s.toggleExtra);
  const setFridayZuhurAlt = useWorshipStore((s) => s.setFridayZuhurAlt);

  const today = useToday();
  const friday = isFriday(today);
  const fridayAlt = useWorshipStore((s) => s.fridayZuhurAlt?.[today] ?? false);

  const prayersToday: PrayerMeta[] = friday
    ? PRAYERS.map((p) => (p.id === "zuhur" ? (fridayAlt ? ZUHUR_ALTERNATIF : SALAT_JUMAT) : p))
    : PRAYERS;

  const tracked = settings.trackedExtras;
  const total = totalActivities(tracked);

  const log = logs[today] ?? {
    date: today,
    prayers: { subuh: false, zuhur: false, asar: false, magrib: false, isya: false },
    extras: { duha: false, tahajud: false, doa: false, puasa: false, sedekah: false },
    quranPages: 0,
    quranVerses: 0,
    zikirCount: 0,
  };
  const score = dayScore(log, today, tracked);
  const dua = duaOfTheDay(today);
  const hijri = formatHijri(new Date());

  // ---------- Target bacaan Al-Qur'an (halaman / ayat / surah) ----------
  const targetSurahMeta = getSurah(settings.quranTargetSurah);
  const surahProg =
    settings.quranTargetType === "surah"
      ? surahProgressOnDate(readingHistory, today, settings.quranTargetSurah, targetSurahMeta?.verses ?? 1)
      : null;
  const quranTarget =
    settings.quranTargetType === "surah" ? (targetSurahMeta?.verses ?? 1) : settings.quranDailyTarget;
  const quranValue =
    settings.quranTargetType === "surah" ? (surahProg?.read ?? 0) : settings.quranTargetType === "halaman" ? log.quranPages : log.quranVerses;
  const quranPct = Math.min(100, Math.round((quranValue / Math.max(1, quranTarget)) * 100));
  const zikirPct = Math.min(100, Math.round((log.zikirCount / Math.max(1, settings.zikirTarget)) * 100));

  const lastReadBookmark = useWorshipStore((s) => s.bookmarks[0]);

  // ---------- Pencatatan salat ----------
  const [recording, setRecording] = useState<PrayerMeta | null>(null);
  const detailOf = (id: PrayerId): PrayerDetail => selectPrayerDetail(prayerDetails, logs, today, id);
  const doneCount = prayersToday.filter((p) => detailOf(p.id).status === "done").length;

  const savePrayer = (meta: PrayerMeta, detail: PrayerDetail | null) => {
    const isJumat = friday && !fridayAlt && meta.id === "zuhur";
    setPrayerRecord(today, meta.id, detail);
    const fullName = meta.fullName ?? `Salat ${meta.label}`;
    if (detail?.status === "done") {
      toast.success(
        `Masya Allah! ${fullName} tercatat ${isJumat || detail.kind === "berjamaah" ? "berjamaah" : "mandiri"}`
      );
    } else if (detail?.status === "missed") {
      toast.info(`${fullName} dicatat tidak dilaksanakan — semoga besok lebih ringan`);
    } else {
      toast.info(`Catatan ${fullName} dihapus`);
    }
  };

  /** Ringkasan konsistensi salat 7 hari (data nyata, bukan angka contoh). */
  const consistency = prayerConsistency({
    prayerDetails,
    logs,
    dates: lastNDays(7, today),
    today,
    reminderTimes: settings.reminderTimes,
  });

  const extrasList = EXTRAS.filter((e) => tracked.includes(e.id));

  return (
    <div className="space-y-7">
      {/* ---------- Sapaan ---------- */}
      <header className="animate-tz-fade-up flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-tz-violet/55 to-tz-purple/55 blur-[6px]" aria-hidden />
            {settings.avatarDataUrl ? (
              <img
                src={settings.avatarDataUrl}
                alt={`Foto profil ${settings.name}`}
                className="relative h-[52px] w-[52px] rounded-full border border-tz-line-strong object-cover"
              />
            ) : (
              <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-tz-purple to-tz-violet font-display text-xl font-bold text-white">
                {settings.name.trim().charAt(0).toUpperCase() || "T"}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] font-medium text-tz-accent/90">
              {greetingByHour()} · Assalamu&apos;alaikum
            </p>
            <p className="font-display text-[21px] font-bold leading-tight text-tz-ink">{settings.name}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Notifikasi"
          onClick={() => toast.info("Belum ada notifikasi baru")}
          className="tap glass relative flex h-11 w-11 items-center justify-center rounded-full text-tz-accent"
        >
          <Bell size={19} />
          <span
            aria-hidden
            className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tz-violet shadow-[0_0_6px_2px_rgba(156,114,239,0.7)]"
          />
        </button>
      </header>

      {/* ---------- Tanggal ---------- */}
      <div className="-mt-4 flex flex-wrap items-center gap-2">
        <Chip>
          <CalendarDays size={12} className="text-tz-violet" />
          {formatGregorian(new Date())}
        </Chip>
        {hijri ? <Chip className="border-tz-violet/30 bg-tz-violet/10 text-tz-accent">{hijri}</Chip> : null}
      </div>

      {/* ---------- Kartu utama: Progres Ibadah Hari Ini ---------- */}
      <GlassCard variant="hero" className="tz-hero-breathe tz-hero-glow p-6">
        <span className="tz-hero-aura" aria-hidden />
        <span className="tz-hero-flow" aria-hidden />
        <span className="tz-hero-flow-2" aria-hidden />
        <span className="tz-hero-shimmer" aria-hidden />
        <GlowOrb className="tz-hero-orb-a -right-10 -top-14 h-44 w-44 bg-tz-lavender/25" />
        <GlowOrb className="tz-hero-orb-b -bottom-16 -left-8 h-40 w-40 bg-tz-orb-deep/70" />
        <div aria-hidden className="absolute -right-14 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full border border-white/12" />
        <div aria-hidden className="absolute -right-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tz-lavender/90">
              <Sparkles size={12} className="shrink-0" />
              Progres Ibadah Hari Ini
            </p>
            <p className="mt-2 font-display text-[54px] font-extrabold leading-none tracking-tight text-gradient-violet">
              {score.pct}
              <span className="ml-1 text-2xl font-semibold text-tz-lavender/85">%</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/80">
              {score.done} dari {total} ibadah tercatat selesai
            </p>
            <div className="mt-4 max-w-[210px]">
              <ProgressBar value={score.pct} className="h-[7px] bg-white/20" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Chip className="border-white/25 bg-white/12 text-white">
                <Sparkles size={12} className="text-tz-lavender" />
                {detailOf("subuh").status === "done" ? "Subuh selesai" : "Jaga Subuh-mu"}
              </Chip>
              <Chip className="border-white/25 bg-white/12 text-white">
                <CircleDot size={12} className="text-tz-lavender" />
                Zikir {log.zikirCount.toLocaleString("id-ID")}
              </Chip>
            </div>
          </div>
          <ProgressRing value={score.pct} size={116} stroke={10} trackClass="stroke-white/20">
            <span className="font-display text-[22px] font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
              {score.done}/{total}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-tz-lavender/90">aktivitas</span>
          </ProgressRing>
        </div>
      </GlassCard>

      {/* ---------- Aksi cepat ---------- */}
      <section aria-label="Aksi cepat" className="grid grid-cols-4 gap-2.5">
        {[
          { label: "Tasbih", icon: CircleDot, onClick: onOpenTasbih },
          { label: "Baca Qur'an", icon: BookOpen, onClick: () => onNavigate("quran") },
          { label: "Statistik", icon: ChartColumn, onClick: () => onNavigate("statistik") },
          { label: "Profil", icon: CircleUserRound, onClick: () => onNavigate("profil") },
        ].map(({ label, icon: Icon, onClick }) => (
          <button key={label} type="button" onClick={onClick} className="tap group flex flex-col items-center gap-2 rounded-2xl py-1">
            <span className="glass relative flex h-[56px] w-[56px] items-center justify-center rounded-[1.15rem] text-tz-violet transition-all duration-200 group-hover:shadow-[0_0_26px_-4px_rgba(156,114,239,0.7)] group-active:scale-95">
              <span
                aria-hidden
                className="absolute inset-0 rounded-[1.15rem] bg-gradient-to-br from-tz-violet/12 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              />
              <Icon size={22} strokeWidth={1.9} className="relative" />
            </span>
            <span className="text-[11px] font-medium text-tz-muted transition-colors group-hover:text-tz-accent">{label}</span>
          </button>
        ))}
      </section>

      {/* ---------- Salat Wajib ---------- */}
      <section aria-label="Salat wajib">
        <SectionHeader
          title="Salat Wajib"
          caption={
            friday
              ? fridayAlt
                ? "Jumat — dicatat sebagai Salat Zuhur (alternatif)"
                : "Jumat — Salat Zuhur digantikan Salat Jumat"
              : "Ketuk kartu salat untuk mencatat status dan detailnya"
          }
          action={
            <Chip
              className={cn(
                doneCount === 5
                  ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-700 light:border-emerald-500/40 light:bg-emerald-100 light:text-emerald-700"
                  : "border-tz-line"
              )}
            >
              {doneCount}/5 selesai
            </Chip>
          }
        />
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Kartu salat wajib — ketuk untuk mencatat">
          {prayersToday.map((p) => {
            const Icon = p.id === "zuhur" && friday ? (fridayAlt ? Sun : Users) : PRAYER_ICONS[p.id];
            return (
              <PrayerSlotCard
                key={p.id}
                meta={p}
                icon={Icon}
                detail={detailOf(p.id)}
                onPress={() => setRecording(p)}
              />
            );
          })}
        </div>
        {friday ? (
          <div className="glass-violet mt-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-tz-ink/95">
                {fridayAlt ? "Hari ini tercatat sebagai Salat Zuhur" : "Tidak melaksanakan Salat Jumat?"}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-tz-muted">
                {fridayAlt
                  ? "Alternatif Salat Jumat sesuai kondisimu — kembali ke Salat Jumat bila diperlukan."
                  : "Catat Salat Zuhur sebagai alternatif sesuai kondisimu."}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={fridayAlt}
              onClick={() => {
                if (fridayAlt) {
                  // Kembali ke tampilan Salat Jumat: catatan Zuhur alternatif "mandiri"
                  // tidak konsisten dengan aturan Jumat (berjamaah saja) — hapus catatan itu.
                  const d = detailOf("zuhur");
                  if (d.status === "done" && d.kind === "mandiri") {
                    setPrayerRecord(today, "zuhur", null);
                    toast.info("Catatan Zuhur (mandiri) dihapus — kembali ke mode Salat Jumat");
                  }
                }
                setFridayZuhurAlt(today, !fridayAlt);
                toast[fridayAlt ? "info" : "success"](
                  fridayAlt ? "Daftar kembali menampilkan Salat Jumat" : "Hari ini dicatat sebagai Salat Zuhur (alternatif)"
                );
              }}
              className={cn(
                "tap shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold transition-all",
                fridayAlt
                  ? "border border-tz-violet/40 bg-tz-violet/10 text-tz-accent hover:bg-tz-violet/18"
                  : "bg-gradient-to-r from-tz-purple to-tz-violet text-white shadow-[0_4px_14px_-4px_rgba(156,114,239,0.8)]"
              )}
            >
              {fridayAlt ? "Tampilkan Salat Jumat" : "Catat Zuhur"}
            </button>
          </div>
        ) : null}
      </section>

      {/* ---------- Al-Qur'an & Zikir ---------- */}
      <section aria-label="Bacaan dan zikir" className="grid grid-cols-2 gap-3">
        <GlassCard
          variant={quranPct >= 100 ? "violet" : "plain"}
          className="tap cursor-pointer p-4"
          onClick={() => onNavigate("quran")}
        >
          <div className="flex items-start justify-between">
            <IconBox tone="violet">
              <BookOpen />
            </IconBox>
            <ChevronRight size={15} className="mt-1 text-tz-muted/70" />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-tz-ink">Bacaan Al-Qur&apos;an</p>
          <p className="mt-0.5 text-[11px] text-tz-muted">
            {settings.quranTargetType === "surah"
              ? `Surah ${targetSurahMeta?.latin ?? "?"} — ${quranValue}/${quranTarget} ayat`
              : `${quranValue.toLocaleString("id-ID")} / ${quranTarget} ${settings.quranTargetType === "halaman" ? "halaman" : "ayat"}`}
          </p>
          <ProgressBar value={quranPct} className="mt-3 h-1.5" />
          {lastReadBookmark ? (
            <p className="mt-2.5 truncate text-[10px] text-tz-accent/85">
              Terakhir: {getSurah(lastReadBookmark.surah)?.latin ?? "?"} · ayat {lastReadBookmark.ayah}
            </p>
          ) : (
            <p className="mt-2.5 text-[10px] text-tz-muted/80">Belum ada penanda bacaan</p>
          )}
        </GlassCard>

        <GlassCard className="tap cursor-pointer p-4" onClick={onOpenTasbih}>
          <div className="flex items-start justify-between">
            <IconBox tone="violet">
              <CircleDot />
            </IconBox>
            <ChevronRight size={15} className="mt-1 text-tz-muted/70" />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-tz-ink">Zikir Harian</p>
          <p className="mt-0.5 text-[11px] text-tz-muted">
            {log.zikirCount.toLocaleString("id-ID")} / {settings.zikirTarget.toLocaleString("id-ID")} zikir
          </p>
          <ProgressBar value={zikirPct} className="mt-3 h-1.5" />
          <p className="mt-2.5 truncate text-[10px] text-tz-accent/85">Tasbih: {tasbih.count.toLocaleString("id-ID")} hitungan</p>
        </GlassCard>
      </section>

      {/* ---------- Aktivitas Lainnya (hanya yang dilacak) ---------- */}
      {extrasList.length > 0 ? (
        <section aria-label="Aktivitas ibadah lainnya">
          <SectionHeader title="Aktivitas Lainnya" caption="Ibadah sunah dan amal tambahan" />
          <div className="grid grid-cols-2 gap-3">
            {extrasList.map(({ id, label, caption }) => {
              const Icon = EXTRA_ICONS[id];
              const done = log.extras?.[id] ?? false;
              return (
                <button
                  key={id}
                  type="button"
                  role="switch"
                  aria-checked={done}
                  aria-label={`Tandai ${label} sebagai ${done ? "belum selesai" : "selesai"}`}
                  title={caption}
                  onClick={() => {
                    toggleExtra(today, id);
                    toast[done ? "info" : "success"](done ? `${label} ditandai belum selesai` : `${label} tercatat selesai`);
                  }}
                  className={cn(
                    "tap relative overflow-hidden rounded-[1.25rem] border p-3.5 text-left transition-all",
                    done
                      ? "border-tz-violet/45 bg-gradient-to-br from-tz-violet/25 via-tz-purple/12 to-transparent shadow-[0_0_24px_-8px_rgba(156,114,239,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]"
                      : "glass"
                  )}
                >
                  <GlowOrb className={cn("-right-6 -top-8 h-20 w-20 transition-opacity", done ? "bg-tz-violet/25 opacity-100" : "opacity-0")} />
                  <div className="relative flex items-start justify-between">
                    <IconBox tone={done ? "solid" : "ghost"}>
                      <Icon />
                    </IconBox>
                    {done ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tz-violet text-white shadow-[0_0_10px_1px_rgba(156,114,239,0.7)]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-dashed border-tz-line-strong" />
                    )}
                  </div>
                  <p className={cn("relative mt-2.5 text-[13px] font-semibold", done ? "text-white" : "text-tz-ink/85")}>{label}</p>
                  <p className="relative text-[11px] text-tz-muted">{caption}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ---------- Pantau Konsistensi Ibadahmu (7 hari) ---------- */}
      <section aria-label="Pantau konsistensi ibadahmu">
        <SectionHeader
          title="Pantau Konsistensi Ibadahmu"
          caption="Ringkasan aktivitas 7 hari terakhir"
          action={
            <button
              type="button"
              onClick={() => onNavigate("statistik")}
              className="tap flex items-center gap-0.5 rounded-full border border-tz-violet/25 bg-tz-violet/10 py-1 pl-3 pr-2 text-xs font-semibold text-tz-accent transition-all hover:bg-tz-violet/18"
            >
              Detail <ChevronRight size={14} />
            </button>
          }
        />
        <GlassCard className="p-4">
          {/* Indikator utama: salat terlaksana vs kesempatan yang sudah berlangsung */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[34px] font-extrabold leading-none text-gradient-violet">
                {consistency.pct}
                <span className="ml-0.5 text-base font-semibold text-tz-lavender/85">%</span>
              </p>
              <p className="mt-1.5 text-[11.5px] font-semibold text-tz-ink/90">
                {consistency.done} dari {consistency.opportunities} salat terlaksana
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-tz-muted">
                dari kesempatan salat yang sudah berlangsung (7 hari terakhir)
              </p>
            </div>
            <ProgressRing value={consistency.pct} size={64} stroke={7} className="shrink-0">
              <span className="font-display text-[13px] font-bold text-tz-ink">{consistency.done}</span>
              <span className="text-[8.5px] text-tz-muted">/{consistency.opportunities}</span>
            </ProgressRing>
          </div>
          <ProgressBar value={consistency.pct} className="mt-3 h-2" />

          {/* Metrik 2×2: berjamaah / mandiri / tidak dilaksanakan / belum dicatat */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {[
              { icon: Users, label: "Berjamaah", value: consistency.jamaah, cls: "border-tz-violet/35 bg-tz-violet/10 text-tz-violet" },
              { icon: User, label: "Mandiri", value: consistency.mandiri, cls: "border-tz-violet/25 bg-tz-violet/[0.06] text-tz-accent" },
              {
                icon: CircleMinus,
                label: "Tidak dilaksanakan",
                value: consistency.missed,
                cls: "border-rose-300/35 bg-rose-400/[0.08] text-rose-500 light:text-rose-600",
              },
              { icon: CircleDashed, label: "Belum dicatat", value: consistency.unrecorded, cls: "border-tz-line bg-tz-panel-soft text-tz-muted" },
            ].map(({ icon: Icon, label, value, cls }) => (
              <div key={label} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5", cls)}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-tz-panel-strong/60">
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[16px] font-bold leading-none text-tz-ink">{value}</p>
                  <p className="mt-0.5 text-[10.5px] leading-tight text-tz-muted">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Alasan Tidak Dilaksanakan (paling sering) */}
          <div className="mt-3.5 rounded-xl border border-tz-line bg-tz-panel-soft p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Alasan Tidak Dilaksanakan</p>
            {consistency.reasons.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {consistency.reasons.slice(0, 3).map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-tz-ink/90">
                      <span
                        aria-hidden
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          i === 0 ? "bg-tz-violet" : "bg-tz-violet/45"
                        )}
                      />
                      <span className="truncate">{r.label}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-tz-muted">{r.count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-tz-muted">
                Belum ada catatan alasan — Alhamdulillah, semoga istiqamah.
              </p>
            )}
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-tz-muted/80">
            Persentase = salat terlaksana dibagi kesempatan salat yang sudah berlangsung. Salat Jumat menggantikan Zuhur dan
            dihitung sekali. Bacaan Al-Qur&apos;an dan zikir dihitung terpisah pada kartunya masing-masing.
          </p>
        </GlassCard>
      </section>

      {/* ---------- Doa Hari Ini ---------- */}
      <GlassCard variant="violet" className="p-5">
        <GlowOrb className="-right-8 -top-10 h-24 w-24 bg-tz-violet/30" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <IconBox tone="lavender" size="sm">
              <HandHeart />
            </IconBox>
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold text-tz-ink">Doa Hari Ini</p>
              <p className="text-[10.5px] text-tz-muted">{dua.title}</p>
            </div>
          </div>

          {dua.arabic ? (
            <p className="quran-arabic mt-4 text-right text-[23px] leading-[2] text-tz-ink">{dua.arabic}</p>
          ) : null}
          {dua.transliteration ? (
            <p className="mt-2.5 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p>
          ) : null}
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
        </div>
      </GlassCard>

      <p className="pb-1 text-center text-[10px] text-tz-muted/60">Semua data tersimpan lokal di perangkat Anda</p>

      {/* ---------- Dialog pencatatan salat (di-mount saat dipakai) ---------- */}
      {recording ? (
        <PrayerRecordDialog
          meta={recording}
          date={today}
          isJumat={friday && !fridayAlt && recording.id === "zuhur"}
          detail={detailOf(recording.id)}
          onClose={() => setRecording(null)}
          onSave={(detail) => {
            if (recording) savePrayer(recording, detail);
          }}
        />
      ) : null}
    </div>
  );
}
