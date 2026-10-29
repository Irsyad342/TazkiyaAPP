"use client";

/**
 * Tazkiya — Halaman Profil & Pengaturan.
 * Nama, foto, Target Ibadah (halaman khusus), pengingat, lokasi otomatis (GPS),
 * tema & Liquid Glass, preferensi, dan riwayat salat 7 hari.
 *
 * CATATAN KETERBATASAN (jujur kepada pengguna):
 * - Pengingat & jadwal salat: waktu hanya TERSIMPAN sebagai preferensi lokal;
 *   notifikasi sistem belum aktif pada versi prototipe ini.
 * - Semua data disimpan di localStorage perangkat (tanpa backend/akun).
 */

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Droplets,
  Flame,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Pencil,
  Sparkles,
  Target,
  Vibrate,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  PRAYERS,
  SALAT_JUMAT,
  ZUHUR_ALTERNATIF,
  missReasonLabel,
  selectPrayerDetail,
  type PrayerCalcMethod,
  type PrayerMeta,
  type ThemeMode,
} from "@/lib/tazkiya/types";
import { buildGeo, getPosition, reverseGeocode, watchDevicePosition } from "@/lib/tazkiya/geo";
import { computePrayerTimes, PRAYER_METHOD_OPTIONS } from "@/lib/tazkiya/prayerTimes";
import { convertImageToWebp, formatBytes } from "@/lib/tazkiya/image";
import { computeStreak, summarizeRange } from "@/lib/tazkiya/stats";
import { formatGregorian, isFriday, lastNDays, relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { Chip, GlassCard, GlowOrb, IconBox, SectionHeader } from "./ui-bits";
import { PrayerRecordDialog } from "./PrayerRecordDialog";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string; bg: string; dot: string }[] = [
  { id: "dark", label: "Gelap", hint: "Ungu malam", bg: "linear-gradient(140deg,#211735,#171321)", dot: "#9C72EF" },
  { id: "light", label: "Terang", hint: "Lavender bersih", bg: "linear-gradient(140deg,#ffffff,#f5f1f5)", dot: "#7546C8" },
  { id: "system", label: "Sistem", hint: "Ikuti perangkat", bg: "linear-gradient(115deg,#211735 50%,#f5f1f5 50%)", dot: "#B693FF" },
];

/** Lencana "Otomatis" — menandai fitur lokasi yang selalu aktif tanpa saklar. */
function AutoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tz-violet/35 bg-tz-violet/12 px-2.5 py-1 text-[10px] font-bold text-tz-accent">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tz-violet" />
      Otomatis
    </span>
  );
}

export function ProfilePage({ onOpenTargets }: { onOpenTargets: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt);
  const setPrayerRecord = useWorshipStore((s) => s.setPrayerRecord);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const tasbihSetTarget = useWorshipStore((s) => s.tasbihSetTarget);
  const tasbih = useWorshipStore((s) => s.tasbih);

  const fileRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.name);
  const [geoBusy, setGeoBusy] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [editingPrayer, setEditingPrayer] = useState<{ date: string; meta: PrayerMeta } | null>(null);

  const today = todayKey();
  const streak = computeStreak(logs, today);
  /** Lokasi aktif = izin pernah diberikan & koordinat tersimpan. */
  const geoActive = !!settings.geo;

  /** Waktu salat otomatis hari ini — murni dihitung dari koordinat GPS perangkat. */
  const autoTimes = settings.geo
    ? computePrayerTimes(
        settings.geo.lat,
        settings.geo.lng,
        new Date(`${today}T12:00:00`),
        settings.prayerMethod ?? "kemenag"
      )
    : null;
  const autoMethod = PRAYER_METHOD_OPTIONS.find((m) => m.id === (settings.prayerMethod ?? "kemenag"));
  const allTime = summarizeRange(logs, Object.keys(logs), settings.trackedExtras);
  const historyDays = lastNDays(7, today).slice().reverse(); // terbaru dulu

  /** Konversi otomatis ke WebP kecil sebelum disimpan (hemat penyimpanan & egress bila kelak diunggah). */
  const onAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 5 MB");
        return;
      }
      const result = await convertImageToWebp(file, { size: 256, maxBytes: 20 * 1024 });
      updateSettings({ avatarDataUrl: result.dataUrl });
      const saved = result.sourceBytes > result.bytes ? ` · hemat ${formatBytes(result.sourceBytes - result.bytes)}` : "";
      toast.success(`Foto profil diperbarui (${result.ext.toUpperCase()} · ${formatBytes(result.bytes)}${saved})`);
    } catch {
      toast.error("Gagal memproses foto. Coba berkas lain.");
    }
  };

  /** Meta salat sesuai slot pada tanggal tertentu (Jumat → Salat Jumat). */
  const prayerMetaFor = (date: string, id: (typeof PRAYERS)[number]["id"]): PrayerMeta => {
    if (id === "zuhur" && isFriday(date) && !fridayZuhurAlt?.[date]) return SALAT_JUMAT;
    if (id === "zuhur" && isFriday(date) && fridayZuhurAlt?.[date]) return ZUHUR_ALTERNATIF;
    return PRAYERS.find((p) => p.id === id) ?? PRAYERS[0];
  };

  /* ---------- Lokasi perangkat (GPS — otomatis penuh, tanpa mode manual) ---------- */

  /** Simpan posisi valid (pembaruan otomatis selalu aktif); nama kota via reverse geocoding bila perlu. */
  const saveGeoPosition = async (pos: GeolocationPosition) => {
    const prev = useWorshipStore.getState().settings.geo;
    const next = buildGeo(prev ? { ...prev, auto: true } : { auto: true, lat: 0, lng: 0, updatedAt: "" }, pos);
    if (!next.label) {
      const label = await reverseGeocode(next.lat, next.lng);
      next.label = label ?? prev?.label;
    }
    updateSettings({ geo: next });
    return next;
  };

  /** Satu tombol untuk semuanya: minta izin (bila pertama kali) & simpan posisi terkini. */
  const useCurrentLocation = async () => {
    if (geoBusy) return;
    setGeoBusy(true);
    const res = await getPosition();
    if (res.failure) {
      toast.error(res.failure.message);
      setGeoBusy(false);
      return;
    }
    const firstTime = !useWorshipStore.getState().settings.geo;
    const next = await saveGeoPosition(res.pos);
    toast.success(
      next.label
        ? firstTime
          ? `Lokasi otomatis aktif — ${next.label}`
          : `Lokasi diperbarui: ${next.label}`
        : firstTime
          ? "Lokasi otomatis aktif"
          : "Lokasi perangkat diperbarui"
    );
    setGeoBusy(false);
  };

  /** Pembaruan posisi otomatis saat berpindah: berjalan selama halaman ini terlihat (hemat baterai). */
  useEffect(() => {
    if (!geoActive) return; // belum ada izin/posisi — tunggu tombol lokasi ditekan
    let stopWatch: (() => void) | null = null;
    const start = () => {
      if (stopWatch) return;
      stopWatch = watchDevicePosition(
        (pos) => {
          void saveGeoPosition(pos);
        },
        () => {
          /* kegagalan berulang tidak di-spam sebagai toast; status terakhir tetap ditampilkan */
        }
      );
    };
    const stop = () => {
      stopWatch?.();
      stopWatch = null;
    };
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [geoActive]);

  return (
    <div className="space-y-6">
      {/* ---------- Kartu profil: glassmorphism di atas foto (ala referensi 2025) ---------- */}
      <section
        aria-label="Kartu profil"
        className="animate-tz-fade-up relative overflow-hidden rounded-[1.75rem] border border-tz-line-strong shadow-[0_26px_54px_-26px_rgba(10,6,20,0.55)]"
      >
        {/* Latar: foto pengguna diperbesar & diburamkan — dasar efek kaca */}
        {settings.avatarDataUrl ? (
          <img
            src={settings.avatarDataUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-[1.18] object-cover blur-[14px]"
          />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_110%_at_18%_0%,#55339a_0%,#33205f_46%,#171321_100%)]" />
        )}
        {/* Selimut ungu agar teks putih selalu terbaca di atas foto apa pun */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#171321]/50 via-[#33205f]/40 to-[#171321]/90" />

        <div className="relative flex min-h-[282px] flex-col p-4">
          {/* Baris atas: avatar + tombol ganti foto bergaya kaca */}
          <div className="flex items-start justify-between">
            <div className="relative">
              <div aria-hidden className="absolute -inset-1 rounded-full bg-gradient-to-br from-tz-lavender/70 to-tz-purple/70 blur-[6px]" />
              {settings.avatarDataUrl ? (
                <img
                  src={settings.avatarDataUrl}
                  alt={`Foto profil ${settings.name}`}
                  className="relative h-[72px] w-[72px] rounded-full border-2 border-white/60 object-cover shadow-lg"
                />
              ) : (
                <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-white/60 bg-gradient-to-br from-tz-violet to-tz-purple font-display text-2xl font-bold text-white">
                  {settings.name.trim().charAt(0).toUpperCase() || "T"}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Ubah foto profil"
              onClick={() => fileRef.current?.click()}
              className="tap flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAvatarChange(e.target.files?.[0])}
              aria-hidden
            />
          </div>

          <div aria-hidden className="flex-1" />

          {/* Panel kaca melayang: identitas + statistik (ala kartu referensi) */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={40}
                  aria-label="Nama pengguna"
                  placeholder="Nama pengguna"
                  className="min-h-0 w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-[15px] font-semibold text-white outline-none backdrop-blur-md placeholder:font-normal placeholder:text-white/45 focus:border-white/55"
                  autoFocus
                />
                <button
                  type="button"
                  aria-label="Simpan nama"
                  onClick={() => {
                    const n = nameDraft.trim();
                    if (!n) {
                      toast.error("Nama tidak boleh kosong");
                      return;
                    }
                    updateSettings({ name: n });
                    setEditingName(false);
                    toast.success("Nama diperbarui");
                  }}
                  className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tz-violet to-tz-purple text-white shadow-[0_0_16px_-3px_rgba(156,114,239,0.8)]"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="truncate font-display text-[19px] font-bold text-white drop-shadow-sm">{settings.name}</p>
                <BadgeCheck size={16} className="shrink-0 text-[#D8C5FF]" aria-label="Anggota Tazkiya" />
                <button
                  type="button"
                  aria-label="Edit nama"
                  onClick={() => {
                    setNameDraft(settings.name);
                    setEditingName(true);
                  }}
                  className="tap ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
            <p className="mt-0.5 text-[11.5px] text-white/80">Anggota sejak {formatGregorian(new Date(settings.createdAt))}</p>

            {/* Dua angka besar berdampingan — mengikuti kartu referensi */}
            <div className="mt-3.5 grid grid-cols-2 divide-x divide-white/15">
              <div className="pr-3">
                <p className="font-display text-[22px] font-extrabold leading-none text-white">{streak}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium text-white/75">
                  <Flame size={11} className="text-amber-300" aria-hidden />
                  hari streak
                </p>
              </div>
              <div className="pl-3.5">
                <p className="font-display text-[22px] font-extrabold leading-none text-white">
                  {allTime.totalDone.toLocaleString("id-ID")}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium text-white/75">
                  <Sparkles size={11} className="text-[#D8C5FF]" aria-hidden />
                  ibadah tercatat
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Target Ibadah (halaman khusus) ---------- */}
      <section aria-label="Target ibadah">
        <SectionHeader title="Target Ibadah" caption="Salat, bacaan Al-Qur'an, zikir, dan ibadah tambahan" />
        <button
          type="button"
          onClick={onOpenTargets}
          className="tap glass-violet relative block w-full overflow-hidden rounded-[1.35rem] p-4 text-left transition-all"
          aria-label="Buka halaman Target Ibadah"
        >
          <GlowOrb className="-right-6 -top-8 h-24 w-24 bg-tz-violet/25" />
          <div className="relative flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-tz-violet/40 bg-gradient-to-br from-tz-violet/30 to-tz-purple/16 text-tz-violet">
              <Target size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-tz-ink">Atur Target Ibadah</p>
              <p className="mt-0.5 text-[11px] leading-snug text-tz-muted">
                {settings.quranTargetType === "surah"
                  ? "1 surah pilihan"
                  : `${settings.quranDailyTarget} ${settings.quranTargetType}`}
                {" · "}
                {settings.zikirTarget.toLocaleString("id-ID")} zikir
                {" · "}
                {(settings.trackedExtras ?? []).length} ibadah tambahan dilacak
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-tz-muted" />
          </div>
        </button>
      </section>

      {/* ---------- Riwayat aktivitas 7 hari terakhir ---------- */}
      <section aria-label="Riwayat aktivitas 7 hari terakhir">
        <SectionHeader title="Riwayat Aktivitas 7 Hari Terakhir" caption="Ringkasan per hari — ketuk untuk detail dan ubah" />
        <GlassCard className="space-y-1 p-3">
          {historyDays.map((day) => {
            const expanded = expandedDay === day;
            const dayLog = logs[day];
            const doneN = PRAYERS.filter((p) => selectPrayerDetail(prayerDetails, logs, day, p.id).status === "done").length;
            const unrecordedN = PRAYERS.filter((p) => selectPrayerDetail(prayerDetails, logs, day, p.id).status === "none").length;
            const hasAnyRecord = !!dayLog || !!prayerDetails[day];
            const quranTxt =
              dayLog && (dayLog.quranPages > 0 || dayLog.quranVerses > 0)
                ? `${dayLog.quranPages.toLocaleString("id-ID")} hlgr · ${dayLog.quranVerses.toLocaleString("id-ID")} ayat`
                : null;
            const zikirTxt = dayLog && dayLog.zikirCount > 0 ? `${dayLog.zikirCount.toLocaleString("id-ID")} zikir` : null;
            const summaryParts = [`${doneN}/5 salat terlaksana`, quranTxt, zikirTxt].filter(Boolean) as string[];
            const summaryText = hasAnyRecord ? summaryParts.join(" · ") : "Belum ada catatan aktivitas";
            return (
              <div key={day} className="rounded-2xl">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedDay(expanded ? null : day)}
                  className="tap flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-tz-panel-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-tz-ink">{relativeDayLabel(day, today)}</p>
                    <p className={cn("truncate text-[10.5px]", hasAnyRecord ? "text-tz-muted" : "text-tz-muted/60")}>{summaryText}</p>
                    {hasAnyRecord && unrecordedN > 0 ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-medium text-amber-600 light:text-amber-700">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {unrecordedN} salat belum dicatat
                      </p>
                    ) : null}
                  </div>
                  {/* Titik status 5 salat */}
                  <div className="flex shrink-0 items-center gap-1" aria-hidden>
                    {PRAYERS.map((p) => {
                      const d = selectPrayerDetail(prayerDetails, logs, day, p.id);
                      return (
                        <span
                          key={p.id}
                          className={cn(
                            "h-[9px] w-[9px] rounded-full border",
                            d.status === "done"
                              ? "border-transparent bg-tz-violet shadow-[0_0_6px_1px_rgba(156,114,239,0.6)]"
                              : d.status === "missed"
                                ? "border-transparent bg-rose-400 light:bg-rose-500"
                                : "border-dashed border-tz-line-strong bg-transparent"
                          )}
                        />
                      );
                    })}
                  </div>
                  <ChevronDown size={15} className={cn("shrink-0 text-tz-muted transition-transform", expanded && "rotate-180")} />
                </button>
                {expanded ? (
                  <div className="mb-2 space-y-1 px-2">
                    {PRAYERS.map((p) => {
                      const meta = prayerMetaFor(day, p.id);
                      const d = selectPrayerDetail(prayerDetails, logs, day, p.id);
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
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-tz-ink">{meta.label}</p>
                            <p className={cn("text-[10.5px]", d.status === "none" ? "text-tz-muted/70" : "text-tz-muted")}>{statusText}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingPrayer({ date: day, meta })}
                            className="tap shrink-0 rounded-full border border-tz-violet/35 bg-tz-violet/10 px-3 py-1.5 text-[11px] font-semibold text-tz-accent"
                            aria-label={`Ubah catatan ${meta.label} ${relativeDayLabel(day, today)}`}
                          >
                            Ubah
                          </button>
                        </div>
                      );
                    })}
                    <p className="flex items-center gap-1.5 px-1 pt-1 text-[10px] text-tz-muted/70">
                      <CalendarDays size={11} />
                      {relativeDayLabel(day, today)} · {formatGregorian(new Date(day + "T00:00:00"))}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </GlassCard>
      </section>

      {/* ---------- Pengingat ---------- */}
      <section aria-label="Pengaturan pengingat">
        <SectionHeader title="Pengaturan Pengingat" caption="Pengingat waktu salat" />
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBox tone="violet" size="sm">
                <Bell />
              </IconBox>
              <div>
                <p className="text-sm font-semibold text-tz-ink">Aktifkan pengingat</p>
                <p className="text-[11px] text-tz-muted">Atur preferensi waktu pengingat</p>
              </div>
            </div>
            <Switch
              checked={settings.remindersEnabled}
              onCheckedChange={(v) => {
                updateSettings({ remindersEnabled: v });
                toast.info(v ? "Preferensi pengingat disimpan" : "Pengingat dimatikan");
              }}
              aria-label="Aktifkan pengingat"
            />
          </div>
          <div className={cn("mt-4 space-y-2 transition-opacity", !settings.remindersEnabled && "pointer-events-none opacity-40")}>
            {autoTimes ? (
              <p className="flex items-start gap-1.5 rounded-xl border border-tz-violet/25 bg-tz-violet/[0.07] px-3 py-2 text-[11px] leading-relaxed text-tz-accent">
                <CalendarClock size={13} className="mt-0.5 shrink-0" />
                Waktu di bawah otomatis dari GPS ({autoMethod?.label}) — pengingat mengikuti jadwal daerahmu.
              </p>
            ) : null}
            {PRAYERS.map((p) => {
              const rt = settings.reminderTimes[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-2.5 transition-colors focus-within:border-tz-violet/40"
                >
                  <label htmlFor={`waktu-${p.id}`} className="text-sm text-tz-ink/90">
                    Salat {p.label}
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      id={`waktu-${p.id}`}
                      type="time"
                      value={autoTimes ? autoTimes[p.id] : rt.time}
                      disabled={!!autoTimes}
                      onChange={(e) =>
                        updateSettings({
                          reminderTimes: { ...settings.reminderTimes, [p.id]: { ...rt, time: e.target.value } },
                        })
                      }
                      className="rounded-lg border border-tz-line bg-tz-panel-strong px-2.5 py-1.5 text-xs text-tz-ink outline-none transition-colors focus:border-tz-violet/60 disabled:opacity-80"
                    />
                    <Switch
                      checked={rt.enabled}
                      onCheckedChange={(v) =>
                        updateSettings({
                          reminderTimes: { ...settings.reminderTimes, [p.id]: { ...rt, enabled: v } },
                        })
                      }
                      aria-label={`Pengingat salat ${p.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 light:border-amber-300/60 light:bg-amber-50 light:text-amber-800">
            <Info size={13} className="mt-0.5 shrink-0" />
            Catatan: pengingat baru tersimpan sebagai preferensi di perangkat ini. Notifikasi sistem (alarm/berbunyi) belum
            aktif pada versi prototipe dan memerlukan izin notifikasi yang belum terpasang.
          </p>
        </GlassCard>
      </section>

      {/* ---------- Lokasi (otomatis penuh — tanpa input kota manual) ---------- */}
      <section aria-label="Pengaturan lokasi">
        <SectionHeader title="Pengaturan Lokasi" caption="Otomatis dari GPS — jadwal salat ikut menyesuaikan saat berpindah" />
        <GlassCard className="space-y-3 p-4">
          {/* Status lokasi otomatis */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="violet" size="sm">
                <LocateFixed />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-medium text-tz-ink">Lokasi otomatis (GPS)</p>
                <p className="truncate text-[11px] leading-snug text-tz-muted">
                  {settings.geo ? (settings.geo.label ?? "Koordinat perangkat") : "Belum aktif — butuh izin lokasi"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                settings.geo
                  ? "border-tz-violet/35 bg-tz-violet/12 text-tz-accent"
                  : "border-tz-line bg-tz-panel-strong text-tz-muted"
              )}
            >
              {settings.geo ? "Aktif" : "Nonaktif"}
            </span>
          </div>

          {/* Satu tombol: minta izin (pertama kali) / perbarui posisi sekarang */}
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geoBusy}
            className="tap flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-tz-violet/40 bg-tz-violet/10 text-sm font-semibold text-tz-accent transition-all hover:bg-tz-violet/18 disabled:opacity-50"
          >
            {geoBusy ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {geoBusy ? "Mencari lokasi…" : settings.geo ? "Perbarui Lokasi Saat Ini" : "Aktifkan Lokasi Otomatis"}
          </button>

          {/* Pembaruan saat berpindah — selalu otomatis, tanpa saklar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="violet" size="sm">
                <MapPin />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-medium text-tz-ink">Pembaruan saat berpindah</p>
                <p className="text-[11px] leading-snug text-tz-muted">
                  Posisi mengikuti kamu otomatis — hanya saat aplikasi terlihat, hemat baterai
                </p>
              </div>
            </div>
            <AutoBadge />
          </div>

          {/* Jadwal salat otomatis — selalu otomatis, tanpa saklar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="violet" size="sm">
                <CalendarClock />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-medium text-tz-ink">Jadwal salat otomatis</p>
                <p className="text-[11px] leading-snug text-tz-muted">
                  Waktu dihitung dari koordinat GPS dan ikut berubah saat berpindah daerah
                </p>
              </div>
            </div>
            <AutoBadge />
          </div>

          {autoTimes ? (
            <div className="rounded-xl border border-tz-violet/25 bg-tz-violet/[0.06] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-tz-accent">Jadwal hari ini</p>
                <p className="truncate text-[10.5px] text-tz-muted">{settings.geo?.label ?? "Koordinat perangkat"}</p>
              </div>
              <div className="mt-2 space-y-1.5">
                {PRAYERS.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-tz-muted">Salat {p.label}</span>
                    <span className="font-semibold tabular-nums text-tz-ink">{autoTimes[p.id]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5">
                <p className="text-[10.5px] font-semibold text-tz-muted">Metode perhitungan</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRAYER_METHOD_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.note}
                      onClick={() => updateSettings({ prayerMethod: m.id as PrayerCalcMethod })}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
                        (settings.prayerMethod ?? "kemenag") === m.id
                          ? "border-tz-violet bg-tz-violet text-white"
                          : "border-tz-line bg-tz-panel-strong text-tz-muted hover:text-tz-accent"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-tz-muted/80">
                  {autoMethod?.note} · zona waktu mengikuti perangkat · dihitung langsung di perangkat tanpa dikirim ke server.
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-tz-violet/25 bg-tz-violet/[0.07] px-3 py-2 text-[11px] leading-relaxed text-tz-accent">
              Aktifkan lokasi dengan tombol di atas — jadwal salat, pengingat, dan Beranda langsung menyesuaikan daerahmu.
            </p>
          )}

          <p className="flex items-start gap-1.5 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 light:border-amber-300/60 light:bg-amber-50 light:text-amber-800">
            <Info size={13} className="mt-0.5 shrink-0" />
            Izin lokasi hanya diminta saat tombol lokasi pertama kali dipakai. Posisi diperbarui otomatis selama aplikasi
            terlihat; koordinat disimpan di perangkat dan hanya dipakai untuk nama kota (reverse geocoding) serta
            perhitungan jadwal salat — tidak dikirim ke server Tazkiya.
          </p>
        </GlassCard>
      </section>

      {/* ---------- Preferensi ---------- */}
      <section aria-label="Preferensi aplikasi">
        <SectionHeader title="Preferensi Aplikasi" caption="Sesuaikan tampilan dan interaksi" />
        <GlassCard className="mb-3 space-y-4 p-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Tema tampilan</p>
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Pilih tema">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.theme === t.id}
                  onClick={() => {
                    updateSettings({ theme: t.id });
                    toast.success(t.id === "dark" ? "Tema gelap aktif" : t.id === "light" ? "Tema terang aktif" : "Mengikuti setelan sistem");
                  }}
                  className={cn(
                    "tap rounded-2xl border p-2 text-left transition-all",
                    settings.theme === t.id ? "border-tz-violet/70 shadow-[0_0_0_3px_rgba(117,70,200,0.18)]" : "border-tz-line hover:border-tz-violet/40"
                  )}
                >
                  <span aria-hidden className="mb-1.5 block h-12 w-full rounded-xl border border-tz-line" style={{ background: t.bg }}>
                    <span className="mt-1.5 ml-1.5 block h-4 w-8 rounded-md bg-white/15" />
                    <span className="mt-1 ml-1.5 block h-2 w-12 rounded-full" style={{ background: t.dot, opacity: 0.85 }} />
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-tz-ink">
                    {settings.theme === t.id ? <Check size={12} className="text-tz-accent" /> : null}
                    {t.label}
                  </span>
                  <span className="block text-[10px] text-tz-muted">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="lavender" size="sm">
                <Droplets />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-medium text-tz-ink">Mode Liquid Glass</p>
                <p className="text-[11px] leading-snug text-tz-muted">
                  Permukaan kaca cair dengan pantulan cahaya lembut — dapat dipadukan tema mana pun
                </p>
              </div>
            </div>
            <Switch
              checked={settings.liquidGlass}
              onCheckedChange={(v) => {
                updateSettings({ liquidGlass: v });
                toast.success(v ? "Gaya Liquid Glass aktif" : "Kembali ke glassmorphism standar");
              }}
              aria-label="Mode Liquid Glass"
            />
          </div>
        </GlassCard>
        <GlassCard className="divide-y divide-tz-line-soft">
          {[
            {
              icon: Sparkles,
              title: "Animasi transisi",
              caption: "Efek gerak halus antarhalaman",
              value: settings.animations,
              onChange: (v: boolean) => updateSettings({ animations: v }),
            },
            {
              icon: Vibrate,
              title: "Getaran tasbih",
              caption: "Bergetar singkat setiap hitungan (jika didukung)",
              value: settings.vibration,
              onChange: (v: boolean) => updateSettings({ vibration: v }),
            },
            {
              icon: Check,
              title: "Nama Arab surah",
              caption: "Tampilkan tulisan Arab pada daftar surah",
              value: settings.showArabic,
              onChange: (v: boolean) => updateSettings({ showArabic: v }),
            },
          ].map(({ icon: Icon, title, caption, value, onChange }) => (
            <div key={title} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <IconBox tone="violet" size="sm">
                  <Icon />
                </IconBox>
                <div>
                  <p className="text-sm font-medium text-tz-ink">{title}</p>
                  <p className="text-[11px] text-tz-muted">{caption}</p>
                </div>
              </div>
              <Switch checked={value} onCheckedChange={onChange} aria-label={title} />
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <IconBox tone="violet" size="sm">
                <span className="text-[11px] font-bold">ID</span>
              </IconBox>
              <div>
                <p className="text-sm font-medium text-tz-ink">Bahasa</p>
                <p className="text-[11px] text-tz-muted">Bahasa Indonesia (tetap)</p>
              </div>
            </div>
            <Chip>Bahasa Indonesia</Chip>
          </div>
        </GlassCard>
      </section>

      {/* ---------- Tentang ---------- */}
      <section aria-label="Tentang aplikasi" className="pb-2">
        <GlassCard className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tz-purple to-tz-violet font-display text-lg font-bold text-white glow-violet-sm">
            ت
          </span>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-tz-ink">Tazkiya — Pelacak Ibadah Harian</p>
            <p className="text-[11px] text-tz-muted">Versi 1.1.0 (prototipe web) · Data lokal</p>
          </div>
          <Chip className="border-tz-violet/30 bg-tz-violet/10 text-tz-accent">v1.1.0</Chip>
        </GlassCard>
      </section>

      {/* ---------- Dialog ubah catatan riwayat (di-mount saat dipakai) ---------- */}
      {editingPrayer ? (
        <PrayerRecordDialog
          meta={editingPrayer.meta}
          date={editingPrayer.date}
          isJumat={
            editingPrayer.meta.id === "zuhur" &&
            isFriday(editingPrayer.date) &&
            !fridayZuhurAlt?.[editingPrayer.date]
          }
          detail={selectPrayerDetail(prayerDetails, logs, editingPrayer.date, editingPrayer.meta.id)}
          onClose={() => setEditingPrayer(null)}
          onSave={(detail) => {
            if (!editingPrayer) return;
            setPrayerRecord(editingPrayer.date, editingPrayer.meta.id, detail);
            const label = editingPrayer.meta.fullName ?? `Salat ${editingPrayer.meta.label}`;
            if (detail?.status === "done") toast.success(`${label} diperbarui — tercatat dilaksanakan`);
            else if (detail?.status === "missed") toast.info(`${label} diperbarui — dicatat tidak dilaksanakan`);
            else toast.info(`Catatan ${label} dihapus`);
          }}
        />
      ) : null}
    </div>
  );
}
