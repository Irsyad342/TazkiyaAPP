"use client";

/**
 * Tazkiya v5 — Halaman Profil & Pengaturan "lifestyle premium".
 * Struktur baru: kepala profil personal (avatar besar + nama + info akun +
 * "aktif sejak" dari data nyata), baris statistik TANPA kartu, ringkasan
 * pencapaian, lalu SELURUH pengaturan sebagai grouped list minimalis —
 * pemisah hairline tipis, ikon garis sederhana tanpa kotak berwarna,
 * panel luas (Riwayat, Pengingat, Lokasi) membuka inline di dalam grup.
 * Semua logika (nama, foto, GPS otomatis, pengingat, tema/Liquid Glass,
 * akun Supabase, riwayat expand/edit, Target Ibadah) dipertahankan apa adanya.
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
  Clock,
  CloudOff,
  CloudUpload,
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
  Sparkles,
  Target,
  Vibrate,
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
import { Chip, GroupList, GroupRow, SectionHeader } from "./ui-bits";
import { PrayerRecordDialog } from "./PrayerRecordDialog";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string; bg: string; dot: string }[] = [
  { id: "light", label: "Terang", hint: "Kanvas putih", bg: "linear-gradient(140deg,#ffffff,#f4f5f9)", dot: "#8D7BE8" },
  { id: "dark", label: "Gelap", hint: "Arang lembut", bg: "linear-gradient(140deg,#1C1C24,#101014)", dot: "#A99CF2" },
  { id: "system", label: "Sistem", hint: "Ikuti perangkat", bg: "linear-gradient(115deg,#101014 50%,#f8f9fc 50%)", dot: "#D9F477" },
];

/** Jam perangkat HH:mm — aksen kanan-atas kepala profil. */
const hhmmNow = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Label tanggal singkat dari kunci YYYY-MM-DD. */
function shortDate(date: string): string {
  const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Lencana "Otomatis" — menandai fitur lokasi yang selalu aktif tanpa saklar. */
function AutoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tz-lavender px-2.5 py-1 text-[10px] font-bold text-tz-violet">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tz-violet" />
      Otomatis
    </span>
  );
}

type Panel = "riwayat" | "pengingat" | "lokasi" | null;

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
  const [openPanel, setOpenPanel] = useState<Panel>(null);

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
  /** Jam berjalan di kepala profil — perbarui tiap 15 detik selama halaman terlihat. */
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
  /** "Aktif sejak" — tanggal aktivitas terawal yang benar-benar ada di data. */
  const memberSince = recorded.length > 0 ? recorded[recorded.length - 1] : null;

  /** Gulir halus ke seksi Pengaturan pada halaman ini. */
  const goSettings = () => {
    setOpenPanel((p) => p ?? "riwayat");
    setTimeout(() => {
      document.getElementById("tazkiya-preferensi")?.scrollIntoView({
        behavior: settings.animations === false ? "auto" : "smooth",
        block: "start",
      });
    }, 60);
  };

  /** Label status sinkronisasi akun. */
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

  const togglePanel = (p: Exclude<Panel, null>) => setOpenPanel((cur) => (cur === p ? null : p));

  return (
    <div className="space-y-9">
      {/* ---------- Kepala profil personal (lifestyle premium) ---------- */}
      <section aria-label="Profil" className="animate-tz-fade-up">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onAvatarChange(e.target.files?.[0])}
          aria-hidden
        />
        <div className="flex items-center justify-between gap-2">
          <span className="v5-overline">Profil</span>
          <span className="tnum flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-tz-muted">
            <Clock size={13} aria-hidden />
            {clock}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-5">
          {/* Avatar besar + badge kamera */}
          <div className="relative shrink-0">
            {settings.avatarDataUrl ? (
              <img
                src={settings.avatarDataUrl}
                alt={`Foto profil ${settings.name}`}
                className="h-[84px] w-[84px] rounded-full object-cover ring-4 ring-tz-lavender"
              />
            ) : (
              <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-tz-lavender text-[30px] font-bold text-tz-violet ring-4 ring-tz-lavender">
                {settings.name.trim().charAt(0).toUpperCase() || "T"}
              </div>
            )}
            <button
              type="button"
              aria-label="Ubah foto profil"
              onClick={() => fileRef.current?.click()}
              className="tap absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-tz-stage bg-tz-ink text-tz-lime"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Nama + info akun */}
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={40}
                  aria-label="Nama pengguna"
                  placeholder="Nama pengguna"
                  className="tz-field min-h-[44px] w-full text-[14px] font-semibold"
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
                  className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tz-ink text-tz-lime"
                >
                  <Check size={17} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[24px] font-extrabold tracking-[-0.025em] text-tz-ink">{settings.name}</p>
                <BadgeCheck size={17} className="shrink-0 text-tz-violet" aria-label="Anggota Tazkiya" />
                <button
                  type="button"
                  aria-label="Ubah nama"
                  onClick={() => {
                    setNameDraft(settings.name);
                    setEditingName(true);
                  }}
                  className="tap flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-tz-muted hover:bg-tz-panel-soft"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <p className="mt-0.5 truncate text-[12.5px] text-tz-muted">
              {authStatus === "signedIn" && authUser ? authUser.email : "Belum masuk akun · data di perangkat"}
            </p>
            <p className="mt-1 text-[11.5px] font-medium text-tz-violet">
              {memberSince ? `Aktif sejak ${shortDate(memberSince)}` : "Mulai perjalananmu hari ini"}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Statistik personal — TANPA kartu ---------- */}
      <section aria-label="Statistik personal" className="animate-tz-fade-up">
        <div className="grid grid-cols-3">
          {[
            { value: recorded.length, label: "Hari aktif" },
            { value: `${focusDone}/5`, label: "Salat hari ini" },
            { value: todayZikir.toLocaleString("id-ID"), label: "Zikir hari ini" },
          ].map(({ value, label }, i) => (
            <div key={label} className={cn("min-w-0 px-4", i === 0 && "pl-0", i > 0 && "border-l border-tz-line")}>
              <p className="v5-display truncate text-[27px] font-extrabold leading-none text-tz-ink">{value}</p>
              <p className="v5-overline mt-2">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Ringkasan pencapaian ---------- */}
      <section aria-label="Ringkasan pencapaian" className="animate-tz-fade-up">
        <SectionHeader title="Ringkasan Pencapaian" caption="Langkah kecil untuk menjaga istiqamah setiap hari." />
        <div className="glass rounded-[1.5rem] p-5">
          <p className="text-[13.5px] font-bold text-tz-ink">Progres Sholat Hari Ini</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-tz-muted">
            {focusRecorded === 0
              ? "Belum ada aktivitas tercatat. Mulai perjalanan ibadahmu hari ini."
              : focusRecorded === 5
                ? "Alhamdulillah, seluruh catatan sholat hari ini sudah lengkap."
                : `${focusRecorded} dari 5 sholat tercatat.`}
          </p>

          {/* Lima indikator pil */}
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {focusDetails.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5",
                  d.status === "done"
                    ? "bg-tz-lavender"
                    : d.status === "missed"
                      ? "bg-tz-amber-soft"
                      : "bg-tz-panel-soft"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    d.status === "done"
                      ? "bg-tz-violet text-white"
                      : d.status === "missed"
                        ? "bg-tz-amber/25 text-tz-amber"
                        : "text-tz-muted/45"
                  )}
                >
                  {d.status === "done" ? <Check size={12} /> : d.status === "missed" ? <Minus size={12} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                </span>
                <span
                  className={cn(
                    "text-center text-[9.5px] font-semibold leading-tight",
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
            className="tz-beam mt-4 h-1.5"
            role="img"
            aria-label={`Salat terlaksana hari ini ${focusDone} dari 5`}
          >
            <div className="tz-beam-fill" style={{ width: `${barsIn ? (focusDone / 5) * 100 : 0}%` }} />
          </div>

          {focusMissed > 0 ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-tz-muted">
              <Minus size={12} className="shrink-0 text-tz-amber" aria-hidden />
              {focusMissed} salat terlewat hari ini — tidak apa-apa, besok kesempatan baru.
            </p>
          ) : null}

          {todayQuran > 0 || todayZikir > 0 ? (
            <p className="mt-2.5 text-[11.5px] font-medium text-tz-muted">
              {todayQuran > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <BookOpen size={11} aria-hidden className="text-tz-violet" /> {todayQuran} hlm
                </span>
              ) : null}
              {todayQuran > 0 && todayZikir > 0 ? <span className="mx-1.5 text-tz-line-strong">·</span> : null}
              {todayZikir > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={11} aria-hidden className="text-tz-violet" /> {todayZikir} zikir
                </span>
              ) : null}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onGoTracker}
            className="tap mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-tz-ink text-[13.5px] font-bold text-white"
          >
            <ListChecks size={15} className="text-tz-lime" aria-hidden />
            Lanjutkan Tracker
            <ChevronRight size={15} aria-hidden />
          </button>
        </div>
      </section>

      {/* ---------- Grouped list: Akun ---------- */}
      <section aria-label="Akun" className="animate-tz-fade-up">
        <SectionHeader title="Akun" caption="Sinkronkan data ibadah di semua perangkat" />
        <GroupList ariaLabel="Pengaturan akun">
          {authStatus === "loading" ? (
            <div className="flex items-center gap-3 px-4 py-4" aria-busy="true">
              <LoaderCircle size={18} className="animate-spin text-tz-muted" />
              <p className="text-[13px] text-tz-muted">Memeriksa sesi akun…</p>
            </div>
          ) : authStatus === "unconfigured" ? (
            <div className="px-4 py-4">
              <div className="flex items-start gap-3.5">
                <CloudOff size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-tz-muted" />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-tz-ink">Fitur akun belum diaktifkan</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-tz-muted">
                    Deployment ini belum mengatur konfigurasi Supabase. Data tetap tersimpan aman di perangkat ini.
                  </p>
                </div>
              </div>
            </div>
          ) : authStatus === "signedIn" && authUser ? (
            <>
              <div className="px-4 py-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tz-lavender text-[15px] font-bold text-tz-violet">
                    {authUser.name.trim().charAt(0).toUpperCase() || "T"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-tz-ink">{authUser.name}</p>
                    <p className="truncate text-[11.5px] text-tz-muted">{authUser.email}</p>
                  </div>
                  <Chip className="shrink-0 bg-tz-lavender text-tz-violet">{syncStatusLabel}</Chip>
                </div>
                {syncPhase === "error" ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-tz-amber-soft px-3 py-2 text-[11px] leading-relaxed text-tz-amber">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    {syncError ?? "Gangguan sinkronisasi — data tetap tersimpan di perangkat dan akan dicoba ulang."}
                  </p>
                ) : null}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="tap flex w-full items-center gap-3.5 px-4 py-4 text-left"
                  >
                    <LogOut size={18} strokeWidth={1.8} className="shrink-0 text-[#E5484D]" />
                    <span className="flex-1 text-[14px] font-medium text-[#E5484D]">Keluar dari akun</span>
                    <ChevronRight size={16} className="shrink-0 text-tz-muted/60" />
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
              <div className="px-4 py-4">
                <div className="flex items-start gap-3.5">
                  <CloudUpload size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-tz-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-tz-ink">Simpan data ibadahmu ke akun</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-tz-muted">
                      Masuk atau buat akun agar catatan tersimpan aman di cloud milikmu sendiri dan bisa dibuka dari
                      perangkat lain.
                    </p>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-tz-muted/80">
                      Punya catatan lama di perangkat ini? Setelah masuk, kamu akan ditawari memindahkannya ke akun —
                      tidak ada data yang hilang.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 px-4 py-4">
                <Link
                  href="/auth"
                  className="tap flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-tz-ink text-[13px] font-bold text-white"
                >
                  <LogIn size={15} className="text-tz-lime" />
                  Masuk
                </Link>
                <Link
                  href="/auth?mode=register"
                  className="tap flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-tz-line-strong bg-tz-panel text-[13px] font-semibold text-tz-ink"
                >
                  <CloudUpload size={15} />
                  Buat akun
                </Link>
              </div>
            </>
          )}
        </GroupList>
      </section>

      {/* ---------- Grouped list: Ibadah & Target ---------- */}
      <section aria-label="Ibadah dan target" className="animate-tz-fade-up">
        <SectionHeader title="Ibadah & Target" />
        <GroupList ariaLabel="Pengaturan ibadah">
          <GroupRow
            icon={Target}
            title="Target Ibadah"
            caption={
              settings.quranTargetType === "surah"
                ? `1 surah pilihan · ${settings.zikirTarget.toLocaleString("id-ID")} zikir`
                : `${settings.quranDailyTarget} ${settings.quranTargetType} · ${settings.zikirTarget.toLocaleString("id-ID")} zikir`
            }
            onClick={onOpenTargets}
          />
          <GroupRow
            icon={CalendarDays}
            title="Riwayat Aktivitas"
            caption={recorded.length > 0 ? `${recorded.length} hari aktif tercatat` : "Berkembang dari catatan ibadahmu"}
            onClick={() => togglePanel("riwayat")}
            control
          >
            <ChevronDown
              size={16}
              className={cn("shrink-0 text-tz-muted/70 transition-transform", openPanel === "riwayat" && "rotate-180")}
            />
          </GroupRow>
          <GroupRow
            icon={Bell}
            title="Pengingat Salat"
            caption={settings.remindersEnabled ? "Aktif — preferensi waktu tersimpan" : "Nonaktif"}
            onClick={() => togglePanel("pengingat")}
            control
          >
            <ChevronDown
              size={16}
              className={cn("shrink-0 text-tz-muted/70 transition-transform", openPanel === "pengingat" && "rotate-180")}
            />
          </GroupRow>
          <GroupRow
            icon={LocateFixed}
            title="Lokasi & Jadwal"
            caption={settings.geo ? (settings.geo.label ?? "Koordinat perangkat") : "Otomatis dari GPS — belum aktif"}
            onClick={() => togglePanel("lokasi")}
            control
          >
            <ChevronDown
              size={16}
              className={cn("shrink-0 text-tz-muted/70 transition-transform", openPanel === "lokasi" && "rotate-180")}
            />
          </GroupRow>

          {/* ---- Panel: Riwayat aktivitas ---- */}
          {openPanel === "riwayat" ? (
            <div className="bg-tz-panel-soft/60 px-4 py-4">
              <div className="space-y-1">
                {historyDays.length === 0 ? (
                  <p className="py-2 text-[12px] leading-relaxed text-tz-muted">
                    Riwayat akan terisi setelah kamu mencatat salat, Al-Qur&apos;an, atau zikir pertamamu. Tanggal sebelum
                    catatan pertama tidak dihitung sebagai hari gagal.
                  </p>
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
                          className="tap flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-tz-panel-soft"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-tz-ink">{relativeDayLabel(day, today)}</p>
                            <p className={cn("truncate text-[10.5px]", hasAnyRecord ? "text-tz-muted" : "text-tz-muted/60")}>{summaryText}</p>
                            {hasAnyRecord && unrecordedN > 0 ? (
                              <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-medium text-tz-amber">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tz-amber" />
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
                                      ? "border-transparent bg-tz-violet"
                                      : d.status === "missed"
                                        ? "border-transparent bg-tz-amber"
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
                                  className="flex items-center justify-between gap-2 rounded-xl bg-tz-panel px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-tz-ink">{meta.label}</p>
                                    <p className={cn("text-[10.5px]", d.status === "none" ? "text-tz-muted/70" : "text-tz-muted")}>{statusText}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPrayer({ date: day, meta })}
                                    className="tap shrink-0 rounded-full border border-tz-line-strong bg-tz-panel px-3 py-1.5 text-[11px] font-semibold text-tz-ink"
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
              </div>
            </div>
          ) : null}

          {/* ---- Panel: Pengingat ---- */}
          {openPanel === "pengingat" ? (
            <div className="bg-tz-panel-soft/60 px-4 py-4">
              <div className="flex items-center justify-between rounded-xl bg-tz-panel px-3.5 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-tz-ink">Aktifkan pengingat</p>
                  <p className="text-[11px] text-tz-muted">Atur preferensi waktu pengingat</p>
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
              <div className={cn("mt-2.5 space-y-2 transition-opacity", !settings.remindersEnabled && "pointer-events-none opacity-40")}>
                {autoTimes ? (
                  <p className="flex items-start gap-1.5 rounded-xl bg-tz-lavender px-3 py-2 text-[11px] leading-relaxed text-tz-violet">
                    <CalendarClock size={13} className="mt-0.5 shrink-0" />
                    Waktu di bawah otomatis dari GPS ({autoMethod?.label}) — pengingat mengikuti jadwal daerahmu.
                  </p>
                ) : null}
                {PRAYERS.map((p) => {
                  const rt = settings.reminderTimes[p.id];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-tz-panel px-3.5 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-tz-ring-soft"
                    >
                      <label htmlFor={`waktu-${p.id}`} className="text-[13.5px] text-tz-ink/90">
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
              <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-tz-muted/85">
                <Info size={12} className="mt-0.5 shrink-0" />
                Pengingat baru tersimpan sebagai preferensi di perangkat ini. Notifikasi sistem (alarm/berbunyi) belum
                aktif pada versi prototipe.
              </p>
            </div>
          ) : null}

          {/* ---- Panel: Lokasi & jadwal ---- */}
          {openPanel === "lokasi" ? (
            <div className="bg-tz-panel-soft/60 px-4 py-4">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <MapPin size={18} strokeWidth={1.8} className="shrink-0 text-tz-muted" />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-tz-ink">Lokasi otomatis (GPS)</p>
                    <p className="truncate text-[11px] leading-snug text-tz-muted">
                      {settings.geo ? (settings.geo.label ?? "Koordinat perangkat") : "Belum aktif — butuh izin lokasi"}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    settings.geo ? "bg-tz-lavender text-tz-violet" : "bg-tz-panel-soft text-tz-muted"
                  )}
                >
                  {settings.geo ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoBusy}
                className="tap mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-tz-ink text-[13px] font-bold text-white disabled:opacity-50"
              >
                {geoBusy ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} className="text-tz-lime" />}
                {geoBusy ? "Mencari lokasi…" : settings.geo ? "Perbarui Lokasi Saat Ini" : "Aktifkan Lokasi Otomatis"}
              </button>

              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-tz-ink">Pembaruan saat berpindah</p>
                    <p className="text-[10.5px] leading-snug text-tz-muted">
                      Posisi mengikuti kamu otomatis — hanya saat aplikasi terlihat, hemat baterai
                    </p>
                  </div>
                  <AutoBadge />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-tz-panel px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-tz-ink">Jadwal salat otomatis</p>
                    <p className="text-[10.5px] leading-snug text-tz-muted">
                      Waktu dihitung dari koordinat GPS dan ikut berubah saat berpindah daerah
                    </p>
                  </div>
                  <AutoBadge />
                </div>
              </div>

              {autoTimes ? (
                <div className="mt-2.5 rounded-xl bg-tz-panel p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="v5-overline" style={{ color: "var(--color-tz-violet)" }}>
                      Jadwal hari ini
                    </p>
                    <p className="truncate text-[10.5px] text-tz-muted">{settings.geo?.label ?? "Koordinat perangkat"}</p>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {PRAYERS.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="text-tz-muted">Salat {p.label}</span>
                        <span className="tnum font-semibold text-tz-ink">{autoTimes[p.id]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <p className="text-[10.5px] font-semibold text-tz-muted">Metode perhitungan</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {PRAYER_METHOD_OPTIONS.map((mo) => (
                        <button
                          key={mo.id}
                          type="button"
                          title={mo.note}
                          onClick={() => updateSettings({ prayerMethod: mo.id as PrayerCalcMethod })}
                          className={cn(
                            "tap rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
                            (settings.prayerMethod ?? "kemenag") === mo.id
                              ? "bg-tz-ink text-white"
                              : "bg-tz-panel-soft text-tz-muted hover:text-tz-ink"
                          )}
                        >
                          {mo.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-tz-muted/80">
                      {autoMethod?.note} · zona waktu mengikuti perangkat · dihitung langsung di perangkat tanpa dikirim ke server.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2.5 rounded-xl bg-tz-lavender px-3 py-2 text-[11px] leading-relaxed text-tz-violet">
                  Aktifkan lokasi dengan tombol di atas — jadwal salat, pengingat, dan Beranda langsung menyesuaikan daerahmu.
                </p>
              )}

              <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-tz-muted/85">
                <Info size={12} className="mt-0.5 shrink-0" />
                Izin lokasi hanya diminta saat tombol lokasi pertama kali dipakai. Koordinat disimpan di perangkat dan
                hanya dipakai untuk nama kota serta perhitungan jadwal salat — tidak dikirim ke server Tazkiya.
              </p>
            </div>
          ) : null}
        </GroupList>
      </section>

      {/* ---------- Grouped list: Preferensi ---------- */}
      <section id="tazkiya-preferensi" aria-label="Preferensi aplikasi" className="animate-tz-fade-up">
        <SectionHeader title="Preferensi" caption="Sesuaikan tampilan dan interaksi" />
        <GroupList ariaLabel="Preferensi tampilan">
          {/* Tema — pilihan inline dalam satu baris */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3.5">
              <Droplets size={18} strokeWidth={1.8} className="shrink-0 text-tz-muted" />
              <span className="flex-1 text-[14px] font-medium text-tz-ink">Tema tampilan</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pilih tema">
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
                    "tap rounded-2xl p-2 text-left transition-all",
                    settings.theme === t.id ? "bg-tz-lavender ring-2 ring-tz-violet" : "bg-tz-panel-soft hover:ring-1 hover:ring-tz-line-strong"
                  )}
                >
                  <span aria-hidden className="mb-1.5 block h-11 w-full rounded-lg" style={{ background: t.bg }}>
                    <span className="block h-full w-full rounded-lg p-1.5">
                      <span className="block h-3 w-7 rounded-md bg-white/25" />
                      <span className="mt-1 block h-1.5 w-10 rounded-full" style={{ background: t.dot, opacity: 0.9 }} />
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-tz-ink">
                    {settings.theme === t.id ? <Check size={12} className="text-tz-violet" /> : null}
                    {t.label}
                  </span>
                  <span className="block text-[9.5px] text-tz-muted">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </GroupList>

        <GroupList className="mt-3" ariaLabel="Saklar preferensi">
          {[
            {
              icon: Sparkles,
              title: "Animasi transisi",
              caption: "Efek gerak halus antarhalaman",
              key: "animations" as const,
            },
            {
              icon: Droplets,
              title: "Mode Liquid Glass",
              caption: "Permukaan transparan tipis dengan blur ringan",
              key: "liquidGlass" as const,
            },
            {
              icon: Vibrate,
              title: "Getaran tasbih",
              caption: "Bergetar singkat setiap hitungan (jika didukung)",
              key: "vibration" as const,
            },
            {
              icon: Check,
              title: "Nama Arab surah",
              caption: "Tampilkan tulisan Arab pada daftar surah",
              key: "showArabic" as const,
            },
          ].map(({ icon: Icon, title, caption, key }) => (
            <div key={key} className="flex items-center gap-3.5 px-4 py-3.5">
              <Icon size={18} strokeWidth={1.8} className="shrink-0 text-tz-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-tz-ink">{title}</p>
                <p className="text-[11px] text-tz-muted">{caption}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => updateSettings({ [key]: v })}
                aria-label={title}
              />
            </div>
          ))}
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <span aria-hidden className="flex h-[18px] w-[18px] items-center justify-center text-[9px] font-bold text-tz-muted">
              ID
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-tz-ink">Bahasa</p>
              <p className="text-[11px] text-tz-muted">Bahasa Indonesia (tetap)</p>
            </div>
            <Chip>Bahasa Indonesia</Chip>
          </div>
        </GroupList>
      </section>

      {/* ---------- Tentang ---------- */}
      <section aria-label="Tentang aplikasi" className="animate-tz-fade-up pb-2">
        <SectionHeader title="Tentang" />
        <GroupList ariaLabel="Tentang aplikasi">
          <div className="flex items-center gap-3.5 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-tz-violet text-base font-bold text-white">ت</span>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-tz-ink">Tazkiya — Pelacak Ibadah Harian</p>
              <p className="text-[11px] text-tz-muted">Versi 5.0.0 (prototipe web) · Data lokal</p>
            </div>
            <Chip className="bg-tz-lavender text-tz-violet">v5.0.0</Chip>
          </div>
        </GroupList>
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] leading-relaxed text-tz-muted">
          <Check size={13} className="shrink-0 text-tz-violet" aria-hidden />
          Terus bertumbuh dalam istiqamah — satu langkah kecil setiap hari.
        </p>
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
