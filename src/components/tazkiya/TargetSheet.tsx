"use client";

/**
 * SUIO — Halaman Target Ibadah (overlay layar penuh, v16).
 * Struktur per halaman: HEADER → RINGKASAN PROGRES (cincin + statistik) →
 * DAFTAR TARGET (kartu per ibadah: nama, deskripsi, target, progres,
 * status, tombol detail) → DETAIL TARGET (panel ekspand inline berisi
 * rincian + kontrol pengaturan yang sudah ada). Semua angka progres
 * diturunkan dari catatan pengguna hari ini (logs, prayerDetails,
 * zikirSessions, tasbih) — tanpa angka statis. Identitas visual SUIO
 * dan seluruh fungsi pengaturan target dipertahankan.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronLeft, Check, CircleDot, MoonStar, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { EXTRAS, PRAYER_IDS, PRAYERS, selectPrayerDetail, type ExtraId, type QuranTargetType } from "@/lib/tazkiya/types";
import { SURAHS } from "@/lib/tazkiya/surahs";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS: { id: QuranTargetType; label: string }[] = [
  { id: "halaman", label: "Halaman" },
  { id: "ayat", label: "Ayat" },
  { id: "surah", label: "Surah" },
];

const saveBtn =
  "tap flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-full gs-ink-btn px-4 text-[12.5px] font-bold";

/** Statistik kecil pada blok ringkasan. */
function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "sisa" }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-[1.1rem] border border-tk-line bg-tk-panel-soft px-2 py-2.5">
      <span
        className={cn(
          "tnum font-display text-[17px] font-extrabold leading-none",
          tone === "ok" ? "text-tk-lime-ink dark:text-tk-lime" : tone === "sisa" ? "text-tk-muted" : "text-tk-ink"
        )}
      >
        {value}
      </span>
      <span className="mt-1.5 text-center text-[9.5px] font-semibold uppercase tracking-[0.08em] text-tk-muted">{label}</span>
    </div>
  );
}

/** Bar progres horizontal gaya SUIO (track tipis, fill lavender/oranye). */
function ProgressBar({ pct, done }: { pct: number; done?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-tk-track">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", done ? "bg-tk-lime" : "bg-tk-violet dark:bg-tk-accent")}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/** Satu kartu target: kepala (ikon, nama, deskripsi, status) + bar progres + tombol detail. */
function TargetCard({
  icon,
  name,
  desc,
  targetText,
  progressText,
  pct,
  achieved,
  detailOpen,
  onToggleDetail,
  detail,
  detailContent,
}: {
  icon: ReactNode;
  name: string;
  desc: string;
  targetText: string;
  progressText: string;
  pct: number;
  achieved: boolean;
  detailOpen: boolean;
  onToggleDetail: () => void;
  detail?: boolean;
  detailContent?: ReactNode;
}) {
  return (
    <div className="glass rounded-[1.5rem] p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            achieved ? "bg-tk-lime text-tk-lime-ink" : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent"
          )}
        >
          {achieved ? <Check size={16} strokeWidth={3} /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-[14.5px] font-bold text-tk-ink">{name}</h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold",
                achieved ? "bg-tk-lime text-tk-lime-ink" : pct > 0 ? "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent" : "bg-tk-panel-soft text-tk-muted"
              )}
            >
              {achieved ? "Tercapai" : pct > 0 ? `Berjalan · ${pct}%` : "Belum dikerjakan"}
            </span>
          </div>
          <p className="mt-0.5 text-[10.5px] leading-snug text-tk-muted">{desc}</p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar pct={pct} done={achieved} />
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <p className="tnum text-[11px] font-semibold text-tk-ink">{progressText}</p>
          <p className="tnum text-[10px] text-tk-muted">Target {targetText}</p>
        </div>
      </div>

      {detail ? (
        <>
          <button
            type="button"
            onClick={onToggleDetail}
            aria-expanded={detailOpen}
            className={cn(
              "tap mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-full border px-4 text-[11.5px] font-bold transition-colors",
              detailOpen
                ? "border-tk-violet bg-tk-lavender text-tk-violet dark:border-tk-accent dark:bg-tk-accent/15 dark:text-tk-accent"
                : "border-tk-line-strong bg-tk-panel text-tk-ink"
            )}
          >
            {detailOpen ? "Tutup Detail" : "Lihat Detail"} <ChevronDown size={14} className={cn("transition-transform", detailOpen && "rotate-180")} />
          </button>
          {detailOpen ? <div className="mt-3 rounded-[1.1rem] border border-tk-line bg-tk-panel-soft p-3">{detailContent}</div> : null}
        </>
      ) : null}
    </div>
  );
}

/** Baris rincian di dalam panel detail (nama + nilai). */
function DetailRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 truncate text-[11.5px] text-tk-ink/90">{label}</span>
      <span className={cn("tnum shrink-0 text-[11px] font-semibold", ok ? "text-tk-lime-ink dark:text-tk-lime" : "text-tk-muted")}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-tk-muted">{children}</p>;
}

/**
 * Komponen Ephemeral: parent me-mount hanya saat halaman dibuka, sehingga
 * draf terinisialisasi sekali dari store terkini — tanpa efek samping.
 */
export function TargetSheet({ onClose }: { onClose: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const setQuranTarget = useWorshipStore((s) => s.setQuranTarget);
  const setQuranTargetSurah = useWorshipStore((s) => s.setQuranTargetSurah);
  const tasbihSetTarget = useWorshipStore((s) => s.tasbihSetTarget);

  const today = todayKey();
  const log = logs[today];

  const initial = useWorshipStore.getState();
  const [unit, setUnit] = useState<QuranTargetType>(initial.settings.quranTargetType);
  const [quranDraft, setQuranDraft] = useState(String(initial.settings.quranDailyTarget));
  const [surahDraft, setSurahDraft] = useState(initial.settings.quranTargetSurah);
  const [zikirDraft, setZikirDraft] = useState(String(initial.settings.zikirTarget));
  const [tasbihDraft, setTasbihDraft] = useState(String(initial.tasbih.target));
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  /** Halaman SELALU terbuka dari bagian paling atas — gulir internal di-reset
      sekali saat mount, tanpa menyentuh posisi gulir saat pengguna berinteraksi. */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  /* ---------- Progres nyata hari ini ---------- */
  const prayerDone = PRAYER_IDS.filter((id) => selectPrayerDetail(prayerDetails, logs, today, id).status === "done").length;
  const isSurah = settings.quranTargetType === "surah";
  const quranTarget = isSurah ? SURAHS.find((s) => s.number === settings.quranTargetSurah)?.verses ?? 1 : settings.quranDailyTarget;
  const quranProgress = isSurah || settings.quranTargetType === "ayat" ? log?.quranVerses ?? 0 : log?.quranPages ?? 0;
  const quranUnitLabel = isSurah ? `ayat ${SURAHS.find((s) => s.number === settings.quranTargetSurah)?.latin ?? ""}` : settings.quranTargetType;
  const zikirProgress = log?.zikirCount ?? 0;
  const tracked = settings.trackedExtras ?? [];
  const extrasDone = tracked.filter((id) => log?.extras?.[id]).length;

  const pctOf = (p: number, t: number) => (t > 0 ? Math.min(100, Math.round((p / t) * 100)) : 0);

  const targets = [
    {
      id: "salat",
      icon: <MoonStar size={16} />,
      name: "Salat Wajib",
      desc: "Lima waktu salat wajib per hari, dipantau tracker salat",
      targetText: "5 waktu",
      progressText: `${prayerDone}/5 salat tercatat`,
      pct: pctOf(prayerDone, 5),
      achieved: prayerDone >= 5,
      detail: true,
    },
    {
      id: "quran",
      icon: <BookOpen size={16} />,
      name: "Bacaan Al-Qur'an",
      desc: `Target harian bacaan dalam satuan ${quranUnitLabel}`,
      targetText: isSurah ? `1 surah (${quranTarget} ayat)` : `${quranTarget} ${settings.quranTargetType}`,
      progressText: `${quranProgress.toLocaleString("id-ID")} dari ${quranTarget.toLocaleString("id-ID")} ${isSurah ? "ayat" : settings.quranTargetType}`,
      pct: pctOf(quranProgress, quranTarget),
      achieved: quranProgress >= quranTarget && quranTarget > 0,
      detail: true,
    },
    {
      id: "zikir",
      icon: <CircleDot size={16} />,
      name: "Zikir & Tasbih",
      desc: "Zikir yang tersimpan ke catatan harian, termasuk Tasbih Digital",
      targetText: `${settings.zikirTarget.toLocaleString("id-ID")}× zikir`,
      progressText: `${zikirProgress.toLocaleString("id-ID")} dari ${settings.zikirTarget.toLocaleString("id-ID")} zikir`,
      pct: pctOf(zikirProgress, settings.zikirTarget),
      achieved: zikirProgress >= settings.zikirTarget,
      detail: true,
    },
    {
      id: "extras",
      icon: <Target size={16} />,
      name: "Ibadah Tambahan",
      desc: tracked.length === 0 ? "Belum ada ibadah tambahan yang dilacak" : "Ibadah tambahan yang kamu pilih untuk dilacak",
      targetText: tracked.length === 0 ? "—" : `${tracked.length} ibadah`,
      progressText: tracked.length === 0 ? "Belum ada yang dilacak" : `${extrasDone} dari ${tracked.length} tercatat hari ini`,
      pct: pctOf(extrasDone, tracked.length),
      achieved: tracked.length > 0 && extrasDone >= tracked.length,
      detail: true,
    },
  ];

  const counted = targets.filter((t) => t.id !== "extras" || tracked.length > 0);
  const achievedCount = counted.filter((t) => t.achieved).length;
  const summaryPct = counted.length > 0 ? Math.round((achievedCount / counted.length) * 100) : 0;

  /* ---------- Geometri cincin ringkasan (viewBox 120) ---------- */
  const RR = 50;
  const CIRC = 2 * Math.PI * RR;
  const dash = (summaryPct / 100) * CIRC;

  /* ---------- Simpan target (logika existing) ---------- */
  const saveQuran = () => {
    if (unit === "surah") {
      setQuranTargetSurah(surahDraft);
      updateSettings({ quranTargetType: "surah" });
      const meta = SURAHS.find((s) => s.number === surahDraft);
      toast.success(`Target bacaan: 1 surah per hari, ${meta?.latin ?? ""}`);
      return;
    }
    const n = parseInt(quranDraft, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Target harus berupa angka lebih dari 0");
      return;
    }
    setQuranTarget(unit, n);
    toast.success(`Target bacaan disimpan: ${n} ${unit === "halaman" ? "halaman" : "ayat"} per hari`);
  };

  const saveZikir = () => {
    const n = parseInt(zikirDraft, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Target zikir harus angka lebih dari 0");
      return;
    }
    updateSettings({ zikirTarget: n });
    toast.success(`Target zikir harian disimpan: ${n.toLocaleString("id-ID")}`);
  };

  const saveTasbih = () => {
    const n = parseInt(tasbihDraft, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Target tasbih harus angka lebih dari 0");
      return;
    }
    tasbihSetTarget(n);
    toast.success(`Target Tasbih Digital disimpan: ${n.toLocaleString("id-ID")} hitungan`);
  };

  const toggleTracked = (id: ExtraId, v: boolean) => {
    const cur = settings.trackedExtras ?? [];
    const next = v ? Array.from(new Set([...cur, id])) : cur.filter((e) => e !== id);
    updateSettings({ trackedExtras: next });
  };

  /* ---------- Konten detail per target (rincian + pengaturan existing) ---------- */
  const detailContent: Record<string, ReactNode> = {
    salat: (
      <div>
        <div className="divide-y divide-tk-line-soft">
          {PRAYERS.map((p) => {
            const done = selectPrayerDetail(prayerDetails, logs, today, p.id).status === "done";
            return <DetailRow key={p.id} label={p.label} value={done ? "Tercatat hari ini" : "Belum tercatat"} ok={done} />;
          })}
        </div>
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-tk-muted">
          Target tetap 5 waktu salat per hari. Pada hari Jumat, slot Zuhur digantikan Salat Jumat. Progres dicatat lewat halaman
          Sholat, bukan di sini.
        </p>
      </div>
    ),
    quran: (
      <div>
        <SectionLabel>Satuan target</SectionLabel>
        <div className="rounded-full border border-tk-line bg-tk-panel p-1" role="radiogroup" aria-label="Satuan target bacaan">
          <div className="flex">
            {UNIT_OPTIONS.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={unit === u.id}
                onClick={() => setUnit(u.id)}
                className={cn(
                  "tap flex-1 rounded-full py-1.5 text-[12px] font-bold transition-all",
                  unit === u.id ? "gs-ink-btn" : "text-tk-muted"
                )}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
        {unit === "surah" ? (
          <div className="mt-3">
            <label htmlFor="target-surah" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tk-muted">
              Surah pilihan
            </label>
            <select id="target-surah" value={surahDraft} onChange={(e) => setSurahDraft(parseInt(e.target.value, 10))} className="tk-field">
              {SURAHS.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.latin}, {s.verses} ayat
                </option>
              ))}
            </select>
            <button type="button" onClick={saveQuran} className={cn(saveBtn, "mt-3 w-full")}>
              <Save size={14} /> Simpan Target Surah
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor="target-quran" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tk-muted">
              Jumlah per hari
            </label>
            <div className="flex gap-2">
              <input
                id="target-quran"
                type="number"
                min={1}
                inputMode="numeric"
                value={quranDraft}
                onChange={(e) => setQuranDraft(e.target.value)}
                className="tk-field"
                aria-label={`Target bacaan per hari dalam ${unit}`}
              />
              <button type="button" onClick={saveQuran} className={saveBtn}>
                <Save size={14} /> Simpan
              </button>
            </div>
          </div>
        )}
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-tk-muted">
          Progres dihitung dari bacaan yang benar-benar tercatat hari ini. Membuka surah saja belum dihitung selesai.
        </p>
      </div>
    ),
    zikir: (
      <div>
        <SectionLabel>Target zikir harian</SectionLabel>
        <div className="flex gap-2">
          <input
            id="target-zikir"
            type="number"
            min={1}
            inputMode="numeric"
            value={zikirDraft}
            onChange={(e) => setZikirDraft(e.target.value)}
            className="tk-field"
          />
          <button type="button" onClick={saveZikir} className={saveBtn}>
            <Save size={14} /> Simpan
          </button>
        </div>
        <SectionLabel>
          <>Target Tasbih Digital</>
        </SectionLabel>
        <div className="flex gap-2">
          <input
            id="target-tasbih"
            type="number"
            min={1}
            inputMode="numeric"
            value={tasbihDraft}
            onChange={(e) => setTasbihDraft(e.target.value)}
            className="tk-field"
          />
          <button type="button" onClick={saveTasbih} className={saveBtn}>
            <Save size={14} /> Simpan
          </button>
        </div>
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-tk-muted">
          Zikir dihitung dari sesi yang disimpan ke catatan harian lewat Tasbih Digital; hitungan yang sudah disimpan otomatis
          direset agar tidak dihitung dua kali.
        </p>
      </div>
    ),
    extras: (
      <div>
        <div className="space-y-1">
          {EXTRAS.map((e) => {
            const active = tracked.includes(e.id);
            const recorded = !!log?.extras?.[e.id];
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-tk-line bg-tk-panel px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-tk-ink">{e.label}</p>
                  <p className={cn("text-[10.5px]", recorded ? "text-tk-lime-ink dark:text-tk-lime" : "text-tk-muted")}>
                    {recorded ? "Tercatat hari ini" : e.caption}
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={(v) => toggleTracked(e.id, v)} aria-label={`Lacak ${e.label}`} />
              </div>
            );
          })}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-tk-muted">
          Aktivitas yang tidak dilacak tidak muncul di Beranda dan tidak dihitung dalam progres harian. Semua perubahan
          tersimpan otomatis.
        </p>
      </div>
    ),
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-40 mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-tk-stage"
      role="dialog"
      aria-modal="true"
      aria-label="Target Ibadah"
    >
      {/* ---------- HEADER ---------- */}
      <div className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Kembali ke Profil"
          onClick={onClose}
          className="tap glass flex h-10 w-10 items-center justify-center rounded-full text-tk-ink"
        >
          <ChevronLeft size={19} />
        </button>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-tk-ink">
            Target Ibadah<span className="text-tk-violet">.</span>
          </h2>
          <p className="text-[11px] text-tk-muted">Pantau perkembangan kebiasaan ibadahmu setiap hari</p>
        </div>
      </div>

      {/* ---------- Konten ---------- */}
      <div
        ref={scrollRef}
        className="thin-scrollbar relative z-10 flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))] pt-2"
      >
        {/* ---------- RINGKASAN PROGRES ---------- */}
        <section aria-label="Ringkasan progres target" className="glass rounded-[1.5rem] p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-[96px] w-[96px] shrink-0">
              <svg aria-hidden viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={RR} fill="none" strokeWidth="8" className="stroke-tk-track" />
                <circle
                  cx="60"
                  cy="60"
                  r={RR}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={cn(summaryPct >= 100 ? "stroke-tk-lime" : "stroke-tk-violet dark:stroke-tk-accent")}
                  strokeDasharray={`${dash} ${CIRC}`}
                  /* linecap round pada busur nol persen merender titik — sembunyikan */
                  style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)", opacity: summaryPct > 0 ? 1 : 0 }}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="tnum font-display text-[20px] font-extrabold leading-none text-tk-ink">{summaryPct}%</span>
                <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-tk-muted">Tercapai</span>
              </span>
            </div>
            <div className="flex min-w-0 flex-1 gap-2">
              <MiniStat label="Total target" value={String(counted.length)} />
              <MiniStat label="Tercapai" value={String(achievedCount)} tone="ok" />
              <MiniStat label="Berjalan" value={String(counted.length - achievedCount)} tone="sisa" />
            </div>
          </div>
          <p className="mt-2.5 border-t border-tk-line-soft pt-2 text-[10.5px] leading-relaxed text-tk-muted">
            Dihitung dari catatan ibadah hari ini ({new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}). Sebuah target
            dianggap tercapai saat nilai hariannya terpenuhi.
          </p>
        </section>

        {/* ---------- DAFTAR TARGET ---------- */}
        <section aria-label="Daftar target ibadah" className="space-y-3">
          {targets.map((t) => (
            <TargetCard
              key={t.id}
              icon={t.icon}
              name={t.name}
              desc={t.desc}
              targetText={t.targetText}
              progressText={t.progressText}
              pct={t.pct}
              achieved={t.achieved}
              detail={t.detail}
              detailOpen={openDetail === t.id}
              onToggleDetail={() => setOpenDetail((v) => (v === t.id ? null : t.id))}
              detailContent={detailContent[t.id]}
            />
          ))}
        </section>
      </div>
    </m.div>
  );
}
