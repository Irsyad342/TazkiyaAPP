"use client";

/**
 * SUIO — Kartu slot Salat Jumat (pengganti Zuhur pada hari Jumat).
 *
 * SATU KELUARGA dengan kartu tiket salat lain: memakai kelas `tk-tkt` yang
 * sama (bentuk, rounded 22px, proporsi, tipografi, spacing, perforasi, foot
 * status) + varian `tk-tkt--jumat` sebagai pembeda khusus: gradasi warm
 * halus, garis aksen soft orange, ornamen geometris octagram yang sangat
 * halus, badge JUMAT, aksen kubah masjid kecil, dan countdown menuju waktu
 * pelaksanaan yang dikonfigurasi pengguna.
 *
 * Interaksi ELEGANT 3D JUMMAH CARD:
 * - Entrance (sekali saat kartu muncul): fade + slide + scale ringan,
 *   ornamen menyusul, cahaya orange perlahan — total ±0,8 dtk.
 * - Sentuhan: terangkat, perspektif kecil mengikuti arah sentuhan, ornamen
 *   ber-parallax, cahaya menguat, lepas = spring kembali.
 * - Ketuk → panel persiapan mengembang (staggered fade): jadwal masjid,
 *   checklist persiapan per tanggal Jumat, catatan pribadi, pencatatan.
 *
 * Kinerja: hanya transform & opacity via motion values (tanpa re-render
 * per frame), keyframes CSS sangat lambat yang berhenti pada reduced-motion
 * / setelan animasi mati, tanpa blur berat, tanpa canvas/video.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Check, ChevronDown, Info, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { FRIDAY_PREP_ITEMS, SALAT_JUMAT, type PrayerDetail, type PrayerMeta } from "@/lib/tazkiya/types";
import { formatDayFull } from "@/lib/tazkiya/dates";
import { fridayTimeOf, useFridayCountdown } from "@/lib/tazkiya/friday";
import { prayerTiming } from "@/lib/tazkiya/goals";
import type { PrayerWindow } from "@/lib/tazkiya/prayerWindows";
import { ConfirmButton } from "./ui-bits";
import { cn } from "@/lib/utils";

/* ===================== Aksen dekoratif (arsitektur masjid) ===================== */

/** Kubah + menara kecil — aksen di samping nama slot. */
function DomeAccent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false" fill="none">
      <path d="M12 4.6c2.6 1.9 4 3.8 4 5.9H8c0-2.1 1.4-4 4-5.9Z" fill="currentColor" opacity="0.9" />
      <path d="M12 3.1c.7.9.7 1.6 0 2.5-.7-.9-.7-1.6 0-2.5Z" fill="currentColor" />
      <path d="M6.4 19.4v-5.6c0-.8.5-1.3 1.2-1.3h8.8c.7 0 1.2.5 1.2 1.3v5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.6 19.4h14.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Bintang segi-delapan — ornamen geometris yang sangat halus. */
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

/* ===================== Util status ===================== */

function statusText(detail: PrayerDetail, w: PrayerWindow, today: string): string {
  if (detail.status === "done") {
    if (detail.kind === "berjamaah") return "Berjamaah";
    const t = prayerTiming(detail, w.start, today);
    return t === "late" ? "Terlambat" : t === "ontime" ? "Tepat waktu" : "Dilaksanakan";
  }
  if (detail.status === "missed") return "Tidak dilaksanakan";
  return "Belum dicatat";
}

/* ===================== Kartu ===================== */

export function FridayCard({
  today,
  w,
  detail,
  now,
  motionOK,
  onRecord,
  openSignal = 0,
}: {
  today: string;
  w: PrayerWindow;
  detail: PrayerDetail;
  now: Date;
  motionOK: boolean;
  /** Buka mekanisme pencatatan existing (dialog Salat Jumat, berjamaah). */
  onRecord: (meta: PrayerMeta) => void;
  /** Sinyal eksternal (layar penuh "Mulai Persiapan") — tiap kenaikan membuka panel. */
  openSignal?: number;
}) {
  const settingsFriday = useWorshipStore((s) => s.settings.friday);
  const fridayPrep = useWorshipStore((s) => s.fridayPrep[today]);
  const setFridaySettings = useWorshipStore((s) => s.setFridaySettings);
  const setFridayPrepCheck = useWorshipStore((s) => s.setFridayPrepCheck);
  const setFridayPrepNote = useWorshipStore((s) => s.setFridayPrepNote);
  const setFridayZuhurAlt = useWorshipStore((s) => s.setFridayZuhurAlt);
  const reduceMotion = useReducedMotion();
  const anim = motionOK && !reduceMotion;

  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (openSignal > 0) setExpanded(true);
  }, [openSignal]);

  const info = useMemo(() => fridayTimeOf(settingsFriday, w.start), [settingsFriday, w.start]);

  /* Countdown — interval 1 dtk hanya hidup saat kartu Jumat tampil. */
  const cd = useFridayCountdown(info.time, true, now);
  const arrived = cd.arrived;

  const doneCount = useMemo(() => FRIDAY_PREP_ITEMS.reduce((n, _it, i) => n + (fridayPrep?.checks?.[i] ? 1 : 0), 0), [fridayPrep]);

  const isDone = detail.status === "done";
  const isMissed = detail.status === "missed";

  /* ---------- Tilt 3D: terangkat + perspektif mengikuti sentuhan ---------- */
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tx = useMotionValue(0);
  const lift = useMotionValue(0);
  const ornX = useMotionValue(0);
  const ornY = useMotionValue(0);
  const lightO = useMotionValue(0.55);
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
    lightO.set(0.55);
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) - 0.5;
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) - 0.5;
    const range = e.pointerType === "mouse" || e.pointerType === "pen" ? 1 : 0.55;
    ry.set(px * 5 * range);
    rx.set(-py * 3.5 * range);
    tx.set(px * 4 * range);
    // Ornamen & cahaya bergerak lebih jauh → kesan kedalaman berlapis.
    ornX.set(px * 12 * range);
    ornY.set(py * 9 * range);
    lightO.set(0.55 + Math.abs(px) * 0.4 * range);
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

  /** Progress countdown: dari masuk Zuhur menuju waktu pelaksanaan. */
  const barPct = (() => {
    const [sh, sm] = w.start.split(":").map((v) => parseInt(v, 10) || 0);
    const startSec = sh * 3600 + sm * 60;
    const [jh, jm] = info.time.split(":").map((v) => parseInt(v, 10) || 0);
    const targetSec = jh * 3600 + jm * 60;
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (targetSec <= startSec) return 0;
    return Math.min(100, Math.max(0, Math.round(((nowSec - startSec) / (targetSec - startSec)) * 100)));
  })();

  return (
    <div className="relative" style={{ zIndex: 30 }}>
      {/* ---------- Entrance: fade + slide + scale, ornamen & cahaya menyusul ---------- */}
      <m.div
        initial={anim ? { opacity: 0, y: 26, scale: 0.965 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <m.div
          className={cn(
            "tk-tkt tk-tkt--jumat tk-tkt--motion tap relative block cursor-pointer text-left",
            isDone && "tk-tkt--done",
            isMissed && "tk-tkt--missed"
          )}
          style={anim ? ({ rotateX: srx, rotateY: sry, x: stx, y: slift, transformPerspective: 900 } as const) : undefined}
          onPointerMove={anim ? onMove : undefined}
          onPointerLeave={anim ? reset : undefined}
          onPointerCancel={anim ? reset : undefined}
          onPointerDown={anim ? () => (lift.set(-3), lightO.set(0.95)) : undefined}
          onPointerUp={anim ? reset : undefined}
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`Salat Jumat, mulai ${w.start.replace(":", ".")}. Ketuk untuk ${expanded ? "menutup" : "membuka"} panel persiapan dan pencatatan`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
        >
          {/* Ornamen octagram + cahaya orange — parallax mengikuti sentuhan */}
          <m.span
            aria-hidden
            className="fr-orn pointer-events-none absolute -right-1 top-1.5"
            style={anim ? ({ x: sornX, y: sornY } as const) : undefined}
            initial={anim ? { opacity: 0, scale: 0.85 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <OctagramOrnament className="h-[74px] w-[74px]" />
          </m.span>
          <m.span
            aria-hidden
            className="fr-light pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full"
            style={anim ? { opacity: slightO } : { opacity: 0.55 }}
            initial={anim ? { opacity: 0 } : false}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />

          {/* Baris utama tiket — struktur sama dengan kartu salat lain */}
          <span className="tk-tkt-row">
            <span className="tk-tkt-side tk-tkt-side--l">
              <span className="tk-tkt-name">
                <span className="tk-tkt-ic" aria-hidden>
                  <DomeAccent className="h-[13px] w-[13px]" />
                </span>
                Salat Jumat
                <span className="fr-badge" aria-hidden>
                  Jumat
                </span>
              </span>
              <span className="tk-tkt-time tnum">{w.start.replace(":", ".")}</span>
            </span>
            <span className="tk-tkt-mid" aria-hidden>
              <span className="tk-tkt-dash" />
            </span>
            <span className="tk-tkt-side tk-tkt-side--r">
              <span className="tk-tkt-name tk-tkt-name--end">{w.endLabel || "Berakhir"}</span>
              <span className="tk-tkt-time tk-tkt-time--end tnum">{w.end ? w.end.replace(":", ".") : "—"}</span>
            </span>
          </span>

          {/* Perforasi + sisi status — keluarga tiket */}
          <span className="tk-tkt-perf" aria-hidden />
          <span className="tk-tkt-foot">
            <span className={cn("tk-tkt-status", isDone && "tk-tkt-status--done", isMissed && "tk-tkt-status--missed")}>
              <span className="tk-tkt-dot" aria-hidden />
              {statusText(detail, w, today)}
              {doneCount > 0 ? <span className="fr-prep tnum">· {doneCount}/{FRIDAY_PREP_ITEMS.length} persiapan</span> : null}
            </span>
            <span className="fr-badge fr-badge--solid">
              {expanded ? "Tutup Panel" : "Persiapan"}
              <ChevronDown size={9} className={cn("transition-transform", expanded && "rotate-180")} />
            </span>
          </span>

          {/* Countdown menuju waktu pelaksanaan — gaya baris live tiket */}
          <span className="fr-live">
            <span className="fr-live-top">
              <span className="fr-live-label">{arrived ? "Salat Jumat Telah Tiba" : "Menuju Salat Jumat"}</span>
              {arrived ? (
                <span className="fr-live-note">waktu masjid dapat berbeda</span>
              ) : info.fallback ? (
                <span className="fr-live-note">
                  <Info size={9} aria-hidden /> mengikuti masuk Zuhur
                </span>
              ) : null}
            </span>
            {arrived ? (
              <span className="fr-live-count fr-live-count--arrived">Saatnya — catat pelaksanaanmu setelah selesai</span>
            ) : (
              <span className="fr-live-count tnum" aria-live="off">
                {cd.h} : {cd.m} : {cd.s}
              </span>
            )}
            <span className="fr-live-bar" aria-hidden>
              <span className="fr-live-bar-fill" style={{ width: `${barPct}%` }} />
            </span>
            <span className="fr-live-foot">
              <MapPin size={9} aria-hidden />
              {info.fallback
                ? "Waktu pelaksanaan di masjid dapat berbeda — atur di panel."
                : "Sesuai waktu pelaksanaan yang kamu atur"}
            </span>
          </span>
        </m.div>
      </m.div>

      {/* ---------- Card reveal: panel persiapan mengembang, staggered fade ---------- */}
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
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="fr-panel mt-2.5 rounded-[1.3rem] p-4"
            >
              {/* Jadwal pelaksanaan yang dapat disesuaikan */}
              <m.div initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
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
                  Sesuaikan dengan jadwal masjid setempat. Tanpa pengaturan, countdown memakai waktu masuk Zuhur.
                </p>
              </m.div>

              {/* Checklist persiapan */}
              <m.div initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }} className="mt-4 flex items-start justify-between gap-3">
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
              </m.div>
              <ul className="mt-2.5 space-y-1.5" aria-label="Checklist persiapan Salat Jumat">
                {FRIDAY_PREP_ITEMS.map((it, i) => {
                  const checked = !!fridayPrep?.checks?.[i];
                  return (
                    <m.li key={i} initial={anim ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 + i * 0.045 }}>
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
                    </m.li>
                  );
                })}
              </ul>

              {/* Status pelaksanaan + pencatatan existing */}
              <m.div initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.62 }} className="mt-4 rounded-[1.1rem] border border-tk-line bg-tk-panel p-3.5">
                <p className="fr-overline">Status Pelaksanaan</p>
                <p className="mt-1 text-[12.5px] font-semibold text-tk-ink">
                  {statusText(detail, w, today)} · {w.start.replace(":", ".")} — {w.end ? w.end.replace(":", ".") : "tanpa batas"} ({w.endLabel || "jendela Zuhur"})
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
              </m.div>

              {/* Catatan pribadi */}
              <m.label initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.7 }} className="mt-4 block">
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
              </m.label>

              <p className="mt-2 flex items-center gap-1.5 text-[9.5px] leading-snug text-tk-muted/80">
                Persiapan & catatan tersimpan untuk Jumat {formatDayFull(today)} dan terpisah dari pekan lain.
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="tap mt-3 flex min-h-[38px] w-full items-center justify-center rounded-full border border-tk-line-strong bg-tk-panel text-[11.5px] font-bold text-tk-ink"
              >
                Tutup Panel
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
