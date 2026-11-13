"use client";

/**
 * SUIO — Kartu spesial Salat Jumat & panel detailnya.
 *
 * Menggantikan TAMPILAN slot Zuhur pada hari Jumat (slot pengganti, bukan
 * salat tambahan — id tetap "zuhur" sehingga statistik tetap 5 waktu).
 *
 * Desain: premium Islamic aesthetic — permukaan berlapis warm ivory → cream
 * → peach (light) / deep charcoal → warm brown (dark), ornamen geometris
 * bintang segi-delapan yang sangat halus, siluet kubah masjid, pendar cahaya
 * lembut, garis aksen bronze-gold, tipografi serif display (Fraunces).
 *
 * Interaksi 3D: tilt perspektif kecil (maks ±6°), ornamen ber-parallax,
 * opacity cahaya latar ikut bergeser, tekan = terangkat, lepas = spring
 * kembali. Ketuk → card reveal: panel detail mengembang di slot yang sama
 * (jadwal, checklist persiapan, status, catatan pribadi).
 *
 * Kinerja: hanya transform & opacity via motion values (tanpa re-render
 * React per frame), SVG ornamen statis, keyframes CSS sangat lambat yang
 * berhenti pada reduced-motion / setelan animasi mati.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { CalendarClock, Check, ChevronDown, Clock3, Info, MapPin, MoonStar, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { FRIDAY_PREP_ITEMS, SALAT_JUMAT, type PrayerDetail, type PrayerMeta } from "@/lib/tazkiya/types";
import { formatDayFull } from "@/lib/tazkiya/dates";
import { fridayTimeOf, useFridayCountdown } from "@/lib/tazkiya/friday";
import type { PrayerWindow } from "@/lib/tazkiya/prayerWindows";
import { prayerTiming } from "@/lib/tazkiya/goals";
import { ConfirmButton } from "./ui-bits";
import { cn } from "@/lib/utils";

/* ===================== Ornamen SVG ===================== */

/** Bintang segi-delapan (ornamen geometris Islami) — sangat halus. */
function OctagramOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.1">
        <rect x="21" y="21" width="58" height="58" />
        <rect x="21" y="21" width="58" height="58" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="17" />
        <circle cx="50" cy="50" r="3.2" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/** Siluet kubah masjid + dua menara (baris bawah kartu). */
function MosqueSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 84" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMax slice">
      <g fill="currentColor">
        {/* menara kiri */}
        <path d="M38 84 V34 q0 -10 6 -16 q6 6 6 16 V84 Z" />
        <circle cx="44" cy="14" r="3.4" />
        <path d="M44 8 q1.6 2.4 0 4.6 q-1.6 -2.2 0 -4.6 Z" />
        {/* menara kanan */}
        <path d="M282 84 V34 q0 -10 6 -16 q6 6 6 16 V84 Z" />
        <circle cx="288" cy="14" r="3.4" />
        <path d="M288 8 q1.6 2.4 0 4.6 q-1.6 -2.2 0 -4.6 Z" />
        {/* bangunan + kubah utama */}
        <path d="M92 84 V56 q0 -6 5 -6 H223 q5 0 5 6 V84 Z" />
        <path d="M160 16 q26 18 26 38 H134 q0 -20 26 -38 Z" />
        <path d="M160 8 q1.8 2.6 0 5 q-1.8 -2.4 0 -5 Z" />
        {/* kubah kecil sisi */}
        <path d="M116 84 V62 q0 -10 9 -12 q9 2 9 12 V84 Z" />
        <path d="M186 84 V62 q0 -10 9 -12 q9 2 9 12 V84 Z" />
      </g>
    </svg>
  );
}

/* ===================== Kartu ===================== */

function statusLabel(detail: PrayerDetail, w: PrayerWindow, today: string): string {
  if (detail.status === "done") {
    if (detail.kind === "berjamaah") return "Berjamaah — selesai";
    const t = prayerTiming(detail, w.start, today);
    return t === "late" ? "Terlambat" : t === "ontime" ? "Tepat waktu" : "Dilaksanakan";
  }
  if (detail.status === "missed") return "Tidak dilaksanakan";
  return "Belum dicatat";
}

export function FridayCard({
  today,
  w,
  detail,
  now,
  motionOK,
  onRecord,
  /** Sinyal eksternal (layar penuh "Mulai Persiapan") — tiap kenaikan membuka panel. */
  openSignal = 0,
}: {
  today: string;
  w: PrayerWindow;
  detail: PrayerDetail;
  now: Date;
  motionOK: boolean;
  /** Buka mekanisme pencatatan existing (dialog Salat Jumat, berjamaah). */
  onRecord: (meta: PrayerMeta) => void;
  openSignal?: number;
}) {
  const settingsFriday = useWorshipStore((s) => s.settings.friday);
  const fridayPrep = useWorshipStore((s) => s.fridayPrep[today]);
  const setFridaySettings = useWorshipStore((s) => s.setFridaySettings);
  const setFridayPrepCheck = useWorshipStore((s) => s.setFridayPrepCheck);
  const setFridayPrepNote = useWorshipStore((s) => s.setFridayPrepNote);
  const setFridayZuhurAlt = useWorshipStore((s) => s.setFridayZuhurAlt);

  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (openSignal > 0) setExpanded(true);
  }, [openSignal]);

  const info = useMemo(() => fridayTimeOf(settingsFriday, w.start), [settingsFriday, w.start]);
  const active = info.fallback ? "belum diatur" : info.time;

  /* Countdown — interval 1 dtk hanya hidup saat kartu Jumat tampil. */
  const cd = useFridayCountdown(info.time, true, now);
  const arrived = cd.arrived;

  const doneCount = useMemo(() => FRIDAY_PREP_ITEMS.reduce((n, _it, i) => n + (fridayPrep?.checks?.[i] ? 1 : 0), 0), [fridayPrep]);

  /* ---------- Tilt 3D + parallax ornamen + cahaya ---------- */
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tx = useMotionValue(0);
  const lift = useMotionValue(0);
  const ornX = useMotionValue(0);
  const ornY = useMotionValue(0);
  const lightO = useMotionValue(0.75);
  const spring = { stiffness: 280, damping: 22 };
  const srx = useSpring(rx, spring);
  const sry = useSpring(ry, spring);
  const stx = useSpring(tx, spring);
  const slift = useSpring(lift, { stiffness: 380, damping: 26 });
  const sornX = useSpring(ornX, spring);
  const sornY = useSpring(ornY, spring);
  const slightO = useSpring(lightO, { stiffness: 120, damping: 30 });

  const reset = () => {
    rx.set(0);
    ry.set(0);
    tx.set(0);
    lift.set(0);
    ornX.set(0);
    ornY.set(0);
    lightO.set(0.75);
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) - 0.5;
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) - 0.5;
    const range = e.pointerType === "mouse" || e.pointerType === "pen" ? 1 : 0.55;
    ry.set(px * 6 * range);
    rx.set(-py * 4.5 * range);
    tx.set(px * 5 * range);
    // Ornamen bergerak lebih jauh → kesan kedalaman berlapis.
    ornX.set(px * 14 * range);
    ornY.set(py * 10 * range);
    lightO.set(0.75 + Math.abs(px) * 0.5 * range);
  };

  /* Catatan pribadi — draf lokal + simpan debounce. */
  const [note, setNote] = useState(fridayPrep?.note ?? "");
  const noteRef = useRef(fridayPrep?.note ?? "");
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (note.trim() !== noteRef.current.trim()) {
        noteRef.current = note;
        setFridayPrepNote(today, note);
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [note, today, setFridayPrepNote]);

  /* Editor waktu pelaksanaan (panel) */
  const [timeDraft, setTimeDraft] = useState(settingsFriday?.time ?? "");
  useEffect(() => setTimeDraft(settingsFriday?.time ?? ""), [settingsFriday?.time]);

  const isDone = detail.status === "done";
  const isMissed = detail.status === "missed";

  const surface = (
    <m.div
      className="fr-card tap relative block cursor-pointer overflow-hidden rounded-[1.55rem] text-left light:shadow-[0_22px_44px_-22px_rgba(120,72,20,0.35)] dark:shadow-[0_22px_44px_-22px_rgba(0,0,0,0.75)]"
      style={
        motionOK
          ? ({ rotateX: srx, rotateY: sry, x: stx, y: slift, transformPerspective: 1000 } as const)
          : undefined
      }
      onPointerMove={motionOK ? onMove : undefined}
      onPointerLeave={motionOK ? reset : undefined}
      onPointerCancel={motionOK ? reset : undefined}
      onPointerDown={motionOK ? () => (lift.set(-3), lightO.set(0.95)) : undefined}
      onPointerUp={motionOK ? reset : undefined}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`Salat Jumat, kartu persiapan dan pencatatan. Ketuk untuk ${expanded ? "menutup" : "membuka"} panel detail`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      {/* Permukaan berlapis + cahaya + ornamen + siluet */}
      <span aria-hidden className="fr-card-surface absolute inset-0 rounded-[1.55rem]" />
      <m.span
        aria-hidden
        className="fr-card-light absolute -right-10 -top-16 h-48 w-48 rounded-full"
        style={motionOK ? { opacity: slightO } : { opacity: 0.75 }}
      />
      <m.span
        aria-hidden
        className="absolute right-4 top-3 text-[#B7791F]/45 dark:text-[#D9A441]/30"
        style={motionOK ? ({ x: sornX, y: sornY } as const) : undefined}
      >
        <OctagramOrnament className="h-20 w-20" />
      </m.span>
      <MosqueSilhouette className="pointer-events-none absolute bottom-0 left-0 h-[62px] w-[78%] text-[#B7791F]/14 dark:text-[#D9A441]/12" />

      {/* Konten */}
      <div className="relative px-5 pb-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="fr-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em]">
            <Star size={10} aria-hidden /> Jumat yang penuh berkah
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[9.5px] font-bold",
              isDone
                ? "fr-chip-ok"
                : isMissed
                  ? "fr-chip-miss"
                  : "fr-chip"
            )}
          >
            {statusLabel(detail, w, today)}
          </span>
        </div>

        <h3 className="pr-serif mt-2 text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-tk-ink">
          Salat Jumat
        </h3>

        {/* Informasi inti: waktu masuk Zuhur, jadwal pelaksanaan, persiapan */}
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div>
            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-tk-muted">
              <Clock3 size={10} aria-hidden /> Masuk Zuhur
            </p>
            <p className="tnum text-[14.5px] font-bold leading-tight text-tk-ink">{w.start.replace(":", ".")}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-tk-muted">
              <MapPin size={10} aria-hidden /> Jadwal Jumat
            </p>
            <p className="tnum text-[14.5px] font-bold leading-tight text-tk-ink">{arrived ? "Telah tiba" : active.replace(":", ".")}</p>
          </div>
          <div className="col-span-2">
            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-tk-muted">
              <Sparkles size={10} aria-hidden /> Persiapan
            </p>
            <p className="text-[12px] font-semibold leading-tight text-tk-ink">
              {doneCount > 0 ? `${doneCount} dari ${FRIDAY_PREP_ITEMS.length} persiapan selesai` : "Belum disiapkan — buka kartu untuk mulai"}
            </p>
          </div>
        </div>

        {/* Countdown / status tiba */}
        <div className="fr-count mt-3 rounded-[1.1rem] px-4 py-2.5">
          {arrived ? (
            <>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                <CalendarClock size={11} aria-hidden /> Salat Jumat Telah Tiba
              </p>
              <p className="mt-0.5 text-[11px] text-tk-muted">
                Waktunya telah masuk — catat pelaksanaanmu setelah selesai, ya.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                <CalendarClock size={11} aria-hidden /> Menuju Salat Jumat
              </p>
              <p className="tnum mt-0.5 text-[24px] font-bold leading-none tracking-[0.06em] text-tk-ink" aria-live="off">
                {cd.h} <span className="fr-sep">:</span> {cd.m} <span className="fr-sep">:</span> {cd.s}
              </p>
            </>
          )}
          {info.fallback ? (
            <p className="mt-1 flex items-center gap-1 text-[9.5px] leading-snug text-tk-muted/85">
              <Info size={9.5} aria-hidden /> Mengikuti waktu masuk Zuhur — waktu pelaksanaan di masjid dapat berbeda.
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-[9.5px] leading-snug text-tk-muted/85">
              <MapPin size={9.5} aria-hidden /> Sesuai waktu pelaksanaan yang kamu atur.
            </p>
          )}
        </div>

        <p className="mt-2 flex items-center justify-between text-[9.5px] font-semibold text-tk-muted">
          <span>{expanded ? "Ketuk untuk menutup panel" : "Ketuk kartu untuk persiapan & pencatatan"}</span>
          <m.span animate={{ rotate: motionOK ? (expanded ? 180 : 0) : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={13} />
          </m.span>
        </p>
      </div>
    </m.div>
  );

  return (
    <div className="relative" style={{ zIndex: 30 }}>
      {surface}

      {/* ---------- Card reveal: panel detail mengembang ---------- */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <m.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <m.div
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="fr-panel mt-2.5 rounded-[1.3rem] p-4"
            >
              {/* Jadwal pelaksanaan yang dapat disesuaikan */}
              <p className="fr-overline">Jadwal Pelaksanaan</p>
              <div className="mt-1.5 flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Waktu pelaksanaan Salat Jumat di masjid</span>
                  <input
                    type="time"
                    value={timeDraft}
                    onChange={(e) => setTimeDraft(e.target.value || "")}
                    className="tk-field w-full py-2 text-[13px] tnum"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFridaySettings({ time: timeDraft || null });
                    toast.success(timeDraft ? `Jadwal Jumat disimpan: ${timeDraft.replace(":", ".")}` : "Jadwal dihapus — mengikuti waktu masuk Zuhur");
                  }}
                  className="tap gs-ink-btn flex h-[38px] shrink-0 items-center rounded-full px-4 text-[11.5px] font-bold"
                >
                  Simpan
                </button>
              </div>
              <p className="mt-1 text-[9.5px] leading-snug text-tk-muted/85">
                Sesuaikan dengan jadwal masjid setempat. Tanpa pengaturan, aplikasi memakai waktu masuk Zuhur.
              </p>

              {/* Checklist persiapan */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="fr-overline">Persiapkan Jumatmu</p>
                  <p className="mt-1 tnum text-[12px] font-bold text-tk-ink">
                    {doneCount} dari {FRIDAY_PREP_ITEMS.length} persiapan selesai
                  </p>
                  <p className="mt-1 text-[9.5px] leading-snug text-tk-muted/85">
                    Pengingat sunnah dan persiapan — bukan syarat sah Salat Jumat. Tersimpan per tanggal Jumat.
                  </p>
                </div>
                <PrepRing done={doneCount} total={FRIDAY_PREP_ITEMS.length} />
              </div>
              <ul className="mt-2.5 space-y-1.5" aria-label="Checklist persiapan Salat Jumat">
                {FRIDAY_PREP_ITEMS.map((it, i) => {
                  const checked = !!fridayPrep?.checks?.[i];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        aria-pressed={checked}
                        onClick={() => setFridayPrepCheck(today, i, !checked)}
                        className={cn(
                          "tap flex min-h-[42px] w-full items-center gap-2.5 rounded-[0.95rem] border px-3 py-2 text-left transition-colors",
                          checked ? "fr-check-on" : "fr-check border-tk-line bg-tk-panel"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                            checked ? "gs-ink-btn border-transparent" : "border-tk-line-strong bg-transparent"
                          )}
                        >
                          {checked ? <Check size={12} strokeWidth={3.2} /> : null}
                        </span>
                        <span className={cn("text-[12px] leading-snug", checked ? "font-semibold text-tk-ink" : "text-tk-ink/85")}>{it}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Status pelaksanaan + pencatatan existing */}
              <div className="mt-4 rounded-[1.1rem] border border-tk-line bg-tk-panel p-3.5">
                <p className="fr-overline">Status Pelaksanaan</p>
                <p className="mt-1 text-[12.5px] font-semibold text-tk-ink">
                  {statusLabel(detail, w, today)} · {w.start.replace(":", ".")} — {w.end ? w.end.replace(":", ".") : "tanpa batas"} ({w.endLabel || "jendela Zuhur"})
                </p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-tk-muted/85">
                  Tidak otomatis dianggap selesai — status dicatat manual lewat mekanisme pencatatan yang sudah ada.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onRecord(SALAT_JUMAT)}
                    className="tap gs-ink-btn flex min-h-[42px] items-center gap-1.5 rounded-full px-4 text-[12px] font-bold"
                  >
                    <Check size={14} /> Catat Salat Jumat
                  </button>
                  {!isDone ? (
                    <ConfirmButton
                      label="Catat sebagai Salat Zuhur alternatif pada tanggal ini"
                      title="Catat sebagai Zuhur saja?"
                      description="Slot ini akan kembali menjadi Salat Zuhur biasa pada tanggal ini (mis. perempuan yang salat zuhur, musafir, atau uzur syar'i)."
                      onConfirm={() => {
                        setFridayZuhurAlt(today, true);
                        toast.info("Dicatat sebagai slot Zuhur untuk Jumat ini");
                      }}
                      className="tap flex min-h-[42px] items-center rounded-full border border-tk-line-strong bg-tk-panel px-4 text-[12px] font-semibold text-tk-ink"
                    >
                      Pakai Zuhur Alternatif
                    </ConfirmButton>
                  ) : null}
                </div>
              </div>

              {/* Catatan pribadi */}
              <label className="mt-4 block">
                <span className="fr-overline">Catatan Pribadi</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Catatan untuk dirimu — mis. imam siapa, khatib siapa, atau refleksi khutbah…"
                  aria-label="Catatan pribadi Salat Jumat"
                  className="tk-field mt-1.5 w-full resize-none py-2.5 text-[12px] leading-relaxed"
                />
              </label>

              <p className="mt-2 flex items-center gap-1.5 text-[9.5px] leading-snug text-tk-muted/80">
                <MoonStar size={10} aria-hidden /> Persiapan & catatan tersimpan untuk Jumat {formatDayFull(today)} dan terpisah dari pekan lain.
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="tap mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-full border border-tk-line-strong bg-tk-panel text-[11.5px] font-bold text-tk-ink"
              >
                <Trash2 size={0} aria-hidden className="hidden" /> Tutup Panel
              </button>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ===================== Progress ring persiapan ===================== */

function PrepRing({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100);
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${done} dari ${total} persiapan selesai`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="fr-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="var(--fr-accent, #FA5200)"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <span className="tnum absolute text-[13px] font-extrabold text-tk-ink">{pct}%</span>
    </div>
  );
}
