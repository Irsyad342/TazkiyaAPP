"use client";

/**
 * Tazkiya — Halaman Profil & Pengaturan.
 * Nama, foto, Target Ibadah (halaman khusus), pengingat, lokasi otomatis (GPS),
 * tema & Liquid Glass, akun (login/keluar), dan riwayat aktivitas dinamis.
 *
 * CATATAN KETERBATASAN (jujur kepada pengguna):
 * - Pengingat & jadwal salat: waktu hanya TERSIMPAN sebagai preferensi lokal;
 *   notifikasi sistem belum aktif pada versi prototipe ini.
 * - Tanpa login: data tersimpan di localStorage perangkat. Setelah masuk akun,
 *   data tersinkron ke cloud milik akun sendiri (dilindungi RLS Supabase).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CloudOff,
  CloudUpload,
  Clock,
  Droplets,
  Info,
  LoaderCircle,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Minus,
  Pencil,
  ListChecks,
  Settings2,
  Sparkles,
  Target,
  Vibrate,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { useAuthStore } from "@/lib/auth/auth-store";
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
import { recordedDateList, reviewActivityDays } from "@/lib/tazkiya/stats";
import { formatGregorian, isFriday, relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { Chip, EmptyState, GlassCard, IconBox, SectionHeader } from "./ui-bits";
import { PrayerRecordDialog } from "./PrayerRecordDialog";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string; bg: string; dot: string }[] = [
  { id: "dark", label: "Gelap", hint: "Charcoal lavender", bg: "linear-gradient(140deg,#2B2338,#15121D)", dot: "#A99AF5" },
  { id: "light", label: "Terang", hint: "Lavender bersih", bg: "linear-gradient(140deg,#FFFFFF,#F0EDFF)", dot: "#8879E8" },
  { id: "system", label: "Sistem", hint: "Ikuti perangkat", bg: "linear-gradient(115deg,#2B2338 50%,#F0EDFF 50%)", dot: "#D5F76A" },
];

/** Jam perangkat HH:mm — aksen kanan-atas kartu profil. */
const hhmmNow = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Lencana "Otomatis" — menandai fitur lokasi yang selalu aktif tanpa saklar. */
function AutoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tz-violet/12 px-2.5 py-1 text-[10px] font-extrabold text-tz-accent">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tz-violet" />
      Otomatis
    </span>
  );
}

export function ProfilePage({
  onOpenTargets,
  onGoTracker,
}: {
  onOpenTargets: () => void;
  onGoTracker: () => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt);
  const setPrayerRecord = useWorshipStore((s) => s.setPrayerRecord);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const tasbihSetTarget = useWorshipStore((s) => s.tasbihSetTarget);
  const tasbih = useWorshipStore((s) => s.tasbih);
  const authStatus = useAuthStore((s) => s.status);
  const authUser = useAuthStore((s) => s.user);
  const syncPhase = useAuthStore((s) => s.syncPhase);
  const syncError = useAuthStore((s) => s.syncError);
  const signOut = useAuthStore((s) => s.signOut);

  const fileRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.name);
  const [geoBusy, setGeoBusy] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [editingPrayer, setEditingPrayer] = useState<{ date: string; meta: PrayerMeta } | null>(null);

  const today = todayKey();
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
  /** Jam berjalan di kartu profil — perbarui tiap 15 detik selama halaman terlihat. */
  const [clock, setClock] = useState(hhmmNow);
  useEffect(() => {
    const t = setInterval(() => setClock(hhmmNow()), 15000);
    return () => clearInterval(t);
  }, []);
  /** Progress bar Fokus Ibadah tumbuh dari kiri sesudah mount (hormati reduced-motion). */
  const [barsIn, setBarsIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 120);
    return () => clearTimeout(t);
  }, []);
  /** Riwayat dinamis: hanya tanggal ber-catatan (tumbuh 1..7), lalu jendela 7 hari berjalan. */
  const recorded = recordedDateList(logs, prayerDetails);
  const historyDays = reviewActivityDays(recorded, today);

  /** Gulir halus ke seksi Pengaturan (Preferensi) pada halaman ini. */
  const goSettings = () => {
    document.getElementById("tazkiya-preferensi")?.scrollIntoView({
      behavior: settings.animations === false ? "auto" : "smooth",
      block: "start",
    });
  };

  /** Label status sinkronisasi akun untuk kartu Akun. */
  const syncStatusLabel =
    syncPhase === "active"
      ? "Tersinkron otomatis"
      : syncPhase === "resolving"
        ? "Menyiapkan sinkronisasi…"
        : syncPhase === "awaiting-decision"
          ? "Menunggu keputusan data"
          : syncPhase === "error"
            ? (syncError ?? "Gangguan sinkronisasi")
            : "Siap";

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

  /** Fokus Ibadah Hari Ini — status lima salat wajib hari ini dari catatan asli.
   *  Murni pembacaan data tracker yang sudah ada: tanpa pencatatan ganda,
   *  tanpa mengubah status, tanpa menganggap membuka aplikasi sebagai ibadah. */
  const focusDetails = PRAYERS.map((p) => {
    const detail = selectPrayerDetail(prayerDetails, logs, today, p.id);
    return { id: p.id, label: prayerMetaFor(today, p.id).label, status: detail.status, kind: detail.kind };
  });
  const focusDone = focusDetails.filter((d) => d.status === "done").length;
  const focusMissed = focusDetails.filter((d) => d.status === "missed").length;
  const focusRecorded = focusDone + focusMissed;
  const todayLog = logs[today];
  const todayQuran = todayLog?.quranPages ?? 0;
  const todayZikir = todayLog?.zikirCount ?? 0;

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
      {/* ---------- Kartu profil utama — hero lavender dengan teks putih ---------- */}
      <section aria-label="Kartu profil" className="animate-tz-fade-up relative">
        <div className="glass-hero relative overflow-hidden rounded-[1.9rem] p-5">
          {/* lingkaran dekoratif halus */}
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/12" />
          <span aria-hidden className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-white/8" />

          {/* Status (kiri) + jam perangkat (kanan) */}
          <div className="relative flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-white/85">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-tz-lime" />
              Perjalanan Ibadah Aktif
            </span>
            <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-[11px] font-semibold text-white/70">
              <Clock size={13} aria-hidden />
              {clock}
            </span>
          </div>

          {/* Avatar di kiri — nama & email di kanannya */}
          {editingName ? (
            <div className="relative mt-4 flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                aria-label="Nama pengguna"
                placeholder="Nama pengguna"
                className="min-h-[44px] w-full rounded-2xl border border-white/35 bg-white/15 px-3 text-[14px] font-bold text-white outline-none placeholder:font-medium placeholder:text-white/50 focus:border-white/60"
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
                className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tz-lime text-tz-lime-ink"
              >
                <Check size={17} />
              </button>
            </div>
          ) : (
            <div className="relative mt-4 flex items-center gap-3.5">
              <div className="relative shrink-0">
                {settings.avatarDataUrl ? (
                  <img
                    src={settings.avatarDataUrl}
                    alt={`Foto profil ${settings.name}`}
                    className="h-16 w-16 rounded-full border-[3px] border-white/80 object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/70 bg-white/20 font-display text-xl font-extrabold text-white">
                    {settings.name.trim().charAt(0).toUpperCase() || "T"}
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Ubah foto profil"
                  onClick={() => fileRef.current?.click()}
                  className="tap absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-tz-violet bg-tz-lime text-tz-lime-ink"
                >
                  <Camera size={13} />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-display text-[20px] font-extrabold leading-tight text-white">{settings.name}</p>
                  <BadgeCheck size={16} className="shrink-0 text-tz-lime" aria-label="Anggota Tazkiya" />
                </div>
                <p className="mt-0.5 truncate text-[12px] font-medium text-white/70">
                  {authStatus === "signedIn" && authUser ? authUser.email : "Belum masuk akun · data di perangkat"}
                </p>
              </div>
            </div>
          )}

          {/* Dua tombol setara — pill putih transparan di atas lavender */}
          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setNameDraft(settings.name);
                setEditingName(true);
              }}
              className="tap flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/15 text-[13px] font-bold text-white transition-colors hover:bg-white/25"
            >
              <Pencil size={14} aria-hidden />
              Edit Profil
            </button>
            <button
              type="button"
              onClick={goSettings}
              className="tap flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/15 text-[13px] font-bold text-white transition-colors hover:bg-white/25"
            >
              <Settings2 size={14} aria-hidden />
              Pengaturan
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onAvatarChange(e.target.files?.[0])}
          aria-hidden
        />
      </section>

      {/* ---------- Fokus Ibadah Hari Ini — progres salat wajib dari catatan asli ---------- */}
      <section aria-label="Fokus ibadah hari ini" className="animate-tz-fade-up">
        <SectionHeader title="Fokus Ibadah Hari Ini" caption="Langkah kecil untuk menjaga istiqamah setiap hari." />
        <GlassCard className="p-4">
          <div className="relative">
            {/* Kepala kartu: ikon + teks kondisi dinamis */}
            <div className="flex items-center gap-3">
              <IconBox tone="lime" size="sm">
                <Target />
              </IconBox>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-tz-ink">Progres Sholat Hari Ini</p>
                <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-tz-muted">
                  {focusRecorded === 0
                    ? "Belum ada aktivitas tercatat. Mulai perjalanan ibadahmu hari ini."
                    : focusRecorded === 5
                      ? "Alhamdulillah, seluruh catatan sholat hari ini sudah lengkap."
                      : `${focusRecorded} dari 5 sholat tercatat.`}
                </p>
              </div>
            </div>

            {/* Lima indikator salat — Subuh, Zuhur/Jumat, Asar, Magrib, Isya */}
            <div className="mt-3.5 grid grid-cols-5 gap-1.5">
              {focusDetails.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2",
                    d.status === "done"
                      ? "border-tz-violet/30 bg-tz-violet/[0.07]"
                      : d.status === "missed"
                        ? "border-rose-300/40 bg-rose-400/[0.07] light:border-rose-300/60"
                        : "border-dashed border-tz-line-strong bg-transparent"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full",
                      d.status === "done"
                        ? "bg-tz-lime text-tz-lime-ink"
                        : d.status === "missed"
                          ? "bg-rose-400/15 text-rose-500 light:text-rose-600"
                          : "border border-dashed border-tz-line-strong text-tz-muted/50"
                    )}
                  >
                    {d.status === "done" ? <Check size={12} strokeWidth={3.2} /> : d.status === "missed" ? <Minus size={12} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <span
                    className={cn(
                      "text-center text-[9.5px] font-bold leading-tight",
                      d.status === "none" ? "text-tz-muted/70" : "text-tz-muted"
                    )}
                  >
                    {d.label}
                  </span>
                  <span className="sr-only">
                    {d.label} — {d.status === "done" ? "terlaksana" : d.status === "missed" ? "terlewat" : "belum dicatat"}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar — terisi kiri ke kanan sesuai jumlah salat terlaksana */}
            <div
              className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-tz-track"
              role="img"
              aria-label={`Salat terlaksana hari ini ${focusDone} dari 5`}
            >
              <div
                className="tz-bar-grow-x h-full rounded-full bg-tz-lime"
                style={{ width: `${barsIn ? (focusDone / 5) * 100 : 0}%` }}
              />
            </div>

            {/* Catatan netral bila ada salat terlewat — tanpa menghakimi */}
            {focusMissed > 0 ? (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-tz-muted">
                <Minus size={12} className="shrink-0 text-rose-400 light:text-rose-500" aria-hidden />
                {focusMissed} salat terlewat hari ini — tidak apa-apa, besok kesempatan baru.
              </p>
            ) : null}

            {/* Ringkasan pendukung — hanya bila ada catatan Al-Qur'an/Zikir hari ini */}
            {todayQuran > 0 || todayZikir > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {todayQuran > 0 ? (
                  <Chip className="bg-tz-violet/12 font-bold text-tz-accent">
                    <BookOpen size={11} aria-hidden />
                    Al-Qur&apos;an {todayQuran} hlm
                  </Chip>
                ) : null}
                {todayZikir > 0 ? (
                  <Chip className="bg-tz-violet/12 font-bold text-tz-accent">
                    <Sparkles size={11} aria-hidden />
                    Zikir {todayZikir} hitungan
                  </Chip>
                ) : null}
              </div>
            ) : null}

            {/* Aksi — menuju tracker salat di halaman Sholat */}
            <button
              type="button"
              onClick={onGoTracker}
              className="tap tz-btn-ink mt-3.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-bold"
            >
              <ListChecks size={15} aria-hidden />
              Lanjutkan Tracker
              <ChevronRight size={15} aria-hidden />
            </button>
          </div>
        </GlassCard>
      </section>

      {/* ---------- Akun: masuk / keluar / status sinkronisasi ---------- */}
      <section aria-label="Akun">
        <SectionHeader title="Akun" caption="Sinkronkan data ibadah di semua perangkat" />
        <GlassCard className="p-4">
          {authStatus === "loading" ? (
            <div className="flex items-center gap-3" aria-busy="true">
              <IconBox tone="ghost" size="sm">
                <LoaderCircle size={16} className="animate-spin" />
              </IconBox>
              <p className="text-[12.5px] font-semibold text-tz-muted">Memeriksa sesi akun…</p>
            </div>
          ) : authStatus === "unconfigured" ? (
            <div className="flex items-start gap-3">
              <IconBox tone="ghost" size="sm">
                <CloudOff />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-bold text-tz-ink">Fitur akun belum diaktifkan</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-tz-muted">
                  Deployment ini belum mengatur konfigurasi Supabase. Data tetap tersimpan aman di perangkat ini.
                </p>
              </div>
            </div>
          ) : authStatus === "signedIn" && authUser ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-tz-violet/12 font-display text-[15px] font-extrabold text-tz-violet">
                  {authUser.name.trim().charAt(0).toUpperCase() || "T"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-tz-ink">{authUser.name}</p>
                  <p className="truncate text-[11px] text-tz-muted">{authUser.email}</p>
                </div>
                <Chip className="shrink-0 bg-tz-lime/40 font-bold text-tz-lime-ink">{syncStatusLabel}</Chip>
              </div>
              {syncPhase === "error" ? (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-400/12 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700 light:bg-amber-50 light:text-amber-800">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  {syncError ?? "Gangguan sinkronisasi — data tetap tersimpan di perangkat dan akan dicoba ulang."}
                </p>
              ) : null}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="tap mt-3.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-rose-400/35 bg-rose-400/10 text-sm font-bold text-rose-500 transition-colors hover:bg-rose-400/16 light:text-rose-600"
                  >
                    <LogOut size={15} />
                    Keluar dari akun
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Data ibadahmu tetap tersimpan aman di akun dan bisa diakses kembali setelah masuk lagi. Catatan
                      baru yang kamu buat saat keluar nanti akan digabungkan otomatis ke akun.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        void signOut();
                        toast.info("Kamu telah keluar — data akunmu tersimpan aman.");
                      }}
                    >
                      Ya, keluar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <IconBox tone="violet" size="sm">
                  <CloudUpload />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-tz-ink">Simpan data ibadahmu ke akun</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-tz-muted">
                    Masuk atau buat akun agar catatan tersimpan aman di cloud milikmu sendiri dan bisa dibuka dari
                    perangkat lain.
                  </p>
                </div>
              </div>
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <Link
                  href="/auth"
                  className="tap tz-btn-ink flex min-h-[44px] items-center justify-center gap-2 rounded-full text-[13px] font-bold"
                >
                  <LogIn size={15} />
                  Masuk
                </Link>
                <Link
                  href="/auth?mode=register"
                  className="tap flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-tz-violet/35 bg-tz-violet/10 text-[13px] font-bold text-tz-accent transition-colors hover:bg-tz-violet/18"
                >
                  <CloudUpload size={15} />
                  Buat akun
                </Link>
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-tz-muted/90">
                Punya catatan lama di perangkat ini? Setelah masuk, kamu akan ditawari memindahkannya ke akun — tidak ada
                data yang hilang.
              </p>
            </>
          )}
        </GlassCard>
      </section>

      {/* ---------- Target Ibadah (halaman khusus) ---------- */}
      <section aria-label="Target ibadah">
        <SectionHeader title="Target Ibadah" caption="Salat, bacaan Al-Qur'an, zikir, dan ibadah tambahan" />
        <button
          type="button"
          onClick={onOpenTargets}
          className="tap glass-violet relative block w-full overflow-hidden rounded-[1.5rem] p-4 text-left transition-all"
          aria-label="Buka halaman Target Ibadah"
        >
          <div className="relative flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tz-violet text-white">
              <Target size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-tz-ink">Atur Target Ibadah</p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-tz-muted">
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

      {/* ---------- Riwayat aktivitas dinamis (tumbuh 1..7 hari, lalu jendela berjalan) ---------- */}
      <section aria-label="Riwayat aktivitas">
        <SectionHeader
          title="Riwayat Aktivitas"
          caption={
            recorded.length > 0
              ? `${recorded.length} hari aktif tercatat · ketuk untuk detail dan ubah`
              : "Berkembang otomatis dari catatan ibadahmu"
          }
        />
        <GlassCard className="space-y-1 p-3">
          {historyDays.length === 0 ? (
            <div className="p-1.5">
              <EmptyState
                icon={<CalendarDays size={20} />}
                title="Mulai perjalanan ibadahmu hari ini"
                caption="Riwayat akan terisi setelah kamu mencatat salat, Al-Qur'an, atau zikir pertamamu. Tanggal sebelum catatan pertama tidak dihitung sebagai hari gagal."
              />
            </div>
          ) : (
            historyDays.map((day) => {
            const expanded = expandedDay === day;
            const dayLog = logs[day];
            const doneN = PRAYERS.filter((p) => selectPrayerDetail(prayerDetails, logs, day, p.id).status === "done").length;
            const unrecordedN = PRAYERS.filter((p) => selectPrayerDetail(prayerDetails, logs, day, p.id).status === "none").length;
            const hasAnyRecord = !!dayLog || !!prayerDetails[day];
            // Guard data lama/parsial: log bisa hanya punya salah satu dari dua field ini.
            const quranPagesN = dayLog?.quranPages ?? 0;
            const quranVersesN = dayLog?.quranVerses ?? 0;
            const quranTxt =
              dayLog && (quranPagesN > 0 || quranVersesN > 0)
                ? `${quranPagesN.toLocaleString("id-ID")} hlgr · ${quranVersesN.toLocaleString("id-ID")} ayat`
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
                    <p className="text-[12.5px] font-bold text-tz-ink">{relativeDayLabel(day, today)}</p>
                    <p className={cn("truncate text-[10.5px]", hasAnyRecord ? "text-tz-muted" : "text-tz-muted/60")}>{summaryText}</p>
                    {hasAnyRecord && unrecordedN > 0 ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-bold text-amber-600 light:text-amber-700">
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
                            "h-[9px] w-[9px] rounded-full",
                            d.status === "done"
                              ? "bg-tz-violet"
                              : d.status === "missed"
                                ? "bg-rose-400"
                                : "border border-dashed border-tz-line-strong bg-transparent"
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
                          className="flex items-center justify-between gap-2 rounded-xl bg-tz-panel-soft px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-tz-ink">{meta.label}</p>
                            <p className={cn("text-[10.5px]", d.status === "none" ? "text-tz-muted/70" : "text-tz-muted")}>{statusText}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingPrayer({ date: day, meta })}
                            className="tap shrink-0 rounded-full border border-tz-violet/35 bg-tz-violet/10 px-3 py-1.5 text-[11px] font-bold text-tz-accent"
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
            })
          )}
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
                <p className="text-sm font-bold text-tz-ink">Aktifkan pengingat</p>
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
              <p className="flex items-start gap-1.5 rounded-xl bg-tz-violet/[0.08] px-3 py-2 text-[11px] font-medium leading-relaxed text-tz-accent">
                <CalendarClock size={13} className="mt-0.5 shrink-0" />
                Waktu di bawah otomatis dari GPS ({autoMethod?.label}) — pengingat mengikuti jadwal daerahmu.
              </p>
            ) : null}
            {PRAYERS.map((p) => {
              const rt = settings.reminderTimes[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-tz-panel-soft px-3.5 py-2.5 transition-colors"
                >
                  <label htmlFor={`waktu-${p.id}`} className="text-sm font-semibold text-tz-ink/90">
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
                      className="rounded-lg border border-tz-line bg-tz-panel px-2.5 py-1.5 text-xs font-semibold text-tz-ink outline-none transition-colors focus:border-tz-violet/60 disabled:opacity-80"
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
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-400/12 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700 light:bg-amber-50 light:text-amber-800">
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
          <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="violet" size="sm">
                <LocateFixed />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-bold text-tz-ink">Lokasi otomatis (GPS)</p>
                <p className="truncate text-[11px] leading-snug text-tz-muted">
                  {settings.geo ? (settings.geo.label ?? "Koordinat perangkat") : "Belum aktif — butuh izin lokasi"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold",
                settings.geo ? "bg-tz-lime/40 text-tz-lime-ink" : "bg-tz-panel text-tz-muted"
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
            className="tap flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-tz-violet/35 bg-tz-violet/10 text-sm font-bold text-tz-accent transition-all hover:bg-tz-violet/18 disabled:opacity-50"
          >
            {geoBusy ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {geoBusy ? "Mencari lokasi…" : settings.geo ? "Perbarui Lokasi Saat Ini" : "Aktifkan Lokasi Otomatis"}
          </button>

          {/* Pembaruan saat berpindah — selalu otomatis, tanpa saklar */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="violet" size="sm">
                <MapPin />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-bold text-tz-ink">Pembaruan saat berpindah</p>
                <p className="text-[11px] leading-snug text-tz-muted">
                  Posisi mengikuti kamu otomatis — hanya saat aplikasi terlihat, hemat baterai
                </p>
              </div>
            </div>
            <AutoBadge />
          </div>

          {/* Jadwal salat otomatis — selalu otomatis, tanpa saklar */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="violet" size="sm">
                <CalendarClock />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-bold text-tz-ink">Jadwal salat otomatis</p>
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
                <p className="text-[11px] font-bold uppercase tracking-wide text-tz-accent">Jadwal hari ini</p>
                <p className="truncate text-[10.5px] font-medium text-tz-muted">{settings.geo?.label ?? "Koordinat perangkat"}</p>
              </div>
              <div className="mt-2 space-y-1.5">
                {PRAYERS.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-tz-muted">Salat {p.label}</span>
                    <span className="font-extrabold tabular-nums text-tz-ink">{autoTimes[p.id]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5">
                <p className="text-[10.5px] font-bold text-tz-muted">Metode perhitungan</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRAYER_METHOD_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.note}
                      onClick={() => updateSettings({ prayerMethod: m.id as PrayerCalcMethod })}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors",
                        (settings.prayerMethod ?? "kemenag") === m.id
                          ? "border-transparent bg-tz-violet text-white light:text-white"
                          : "border-tz-line bg-tz-panel text-tz-muted hover:text-tz-accent"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-tz-muted/85">
                  {autoMethod?.note} · zona waktu mengikuti perangkat · dihitung langsung di perangkat tanpa dikirim ke server.
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-tz-violet/[0.08] px-3 py-2 text-[11px] font-medium leading-relaxed text-tz-accent">
              Aktifkan lokasi dengan tombol di atas — jadwal salat, pengingat, dan Beranda langsung menyesuaikan daerahmu.
            </p>
          )}

          <p className="flex items-start gap-1.5 rounded-xl bg-amber-400/12 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700 light:bg-amber-50 light:text-amber-800">
            <Info size={13} className="mt-0.5 shrink-0" />
            Izin lokasi hanya diminta saat tombol lokasi pertama kali dipakai. Posisi diperbarui otomatis selama aplikasi
            terlihat; koordinat disimpan di perangkat dan hanya dipakai untuk nama kota (reverse geocoding) serta
            perhitungan jadwal salat — tidak dikirim ke server Tazkiya.
          </p>
        </GlassCard>
      </section>

      {/* ---------- Preferensi ---------- */}
      <section id="tazkiya-preferensi" aria-label="Preferensi aplikasi">
        <SectionHeader title="Preferensi Aplikasi" caption="Sesuaikan tampilan dan interaksi" />
        <GlassCard className="mb-3 space-y-4 p-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-tz-muted">Tema tampilan</p>
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
                    settings.theme === t.id ? "border-tz-violet shadow-[0_0_0_3px_rgba(136,121,232,0.18)]" : "border-tz-line hover:border-tz-violet/40"
                  )}
                >
                  <span aria-hidden className="mb-1.5 block h-12 w-full rounded-xl border border-tz-line" style={{ background: t.bg }}>
                    <span className="mt-1.5 ml-1.5 block h-4 w-8 rounded-md bg-white/20" />
                    <span className="mt-1 ml-1.5 block h-2 w-12 rounded-full" style={{ background: t.dot, opacity: 0.9 }} />
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-bold text-tz-ink">
                    {settings.theme === t.id ? <Check size={12} className="text-tz-violet" /> : null}
                    {t.label}
                  </span>
                  <span className="block text-[10px] text-tz-muted">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel-soft px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox tone="lavender" size="sm">
                <Droplets />
              </IconBox>
              <div className="min-w-0">
                <p className="text-sm font-bold text-tz-ink">Mode Liquid Glass</p>
                <p className="text-[11px] leading-snug text-tz-muted">
                  Kartu setengah transparan dengan blur lembut — dapat dipadukan tema mana pun
                </p>
              </div>
            </div>
            <Switch
              checked={settings.liquidGlass}
              onCheckedChange={(v) => {
                updateSettings({ liquidGlass: v });
                toast.success(v ? "Gaya Liquid Glass aktif" : "Kembali ke kartu solid");
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
                  <p className="text-sm font-bold text-tz-ink">{title}</p>
                  <p className="text-[11px] text-tz-muted">{caption}</p>
                </div>
              </div>
              <Switch checked={value} onCheckedChange={onChange} aria-label={title} />
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <IconBox tone="violet" size="sm">
                <span className="text-[11px] font-extrabold">ID</span>
              </IconBox>
              <div>
                <p className="text-sm font-bold text-tz-ink">Bahasa</p>
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
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tz-violet to-tz-lavender font-display text-lg font-extrabold text-white">
            ت
          </span>
          <div className="flex-1">
            <p className="font-display text-sm font-extrabold text-tz-ink">Tazkiya — Pelacak Ibadah Harian</p>
            <p className="text-[11px] text-tz-muted">Versi 2.0.0 · Data lokal + sinkronisasi akun</p>
          </div>
          <Chip className="bg-tz-lime/40 font-extrabold text-tz-lime-ink">v2.0.0</Chip>
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
