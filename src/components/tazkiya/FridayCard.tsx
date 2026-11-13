"use client";

/**
 * SUIO — Kartu slot Salat Jumat (pengganti Zuhur pada hari Jumat).
 *
 * PREMIUM MINIMALIST ISLAMIC UI — v3.
 *
 * Prinsip: kartu ini ANGGOTA keluarga tiket salat, bukan karya terpisah.
 * Permukaan, radius, tipografi, spacing, dan status memakai kelas `tk-tkt`
 * yang sama persis dengan empat kartu lain — TANPA override visual (tanpa
 * garis aksen kiri khusus, tanpa gradasi, tanpa ornamen, tanpa glow).
 * Karakter Jumat datang dari tiga hal kecil yang tenang: ikon kubah,
 * badge "Jumat" tunggal, dan baris persiapan yang ringkas.
 *
 * Struktur informasi (atas → bawah):
 *  1. Baris utama: Salat Jumat + waktu masuk (kiri) · waktu pelaksanaan
 *     di masjid (kanan) — struktur identik dengan sisi kanan tiket lain.
 *  2. Perforasi keluarga tiket.
 *  3. Status: satu baris ringkas dengan empat keadaan —
 *     "Belum masuk waktu" (+ countdown kecil), "Waktu Salat Jumat tiba",
 *     "Sudah dicatat" (+ keterangan berjamaah/tepat waktu/terlambat),
 *     "Terlewat". Tidak pernah tampil dua status yang bertentangan.
 *  4. Catatan kecil "Berikutnya · Asar …" — memakai gaya catatan tiket,
 *     terpisah dan tidak menumpuk info mana pun.
 *  5. Baris persiapan ringkas: label + progress bar tipis + "3/8" +
 *     tombol kecil "Lihat persiapan" → section expandable (bukan panel
 *     besar): checklist 8 sunnah, catatan pribadi, jadwal pelaksanaan,
 *     dan pencatatan existing.
 *
 * Interaksi: entrance fade+slide+scale sekali, tilt 3D lembut mengikuti
 * sentuhan, terangkat saat ditekan, spring saat dilepas, expand/collapse
 * halus. Ketuk kartu = buka mekanisme pencatatan existing (perilaku sama
 * dengan tiket lain). Tidak ada animasi dekoratif yang berputar terus.
 * Kinerja: hanya transform & opacity via motion values.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { FRIDAY_PREP_ITEMS, SALAT_JUMAT, type PrayerDetail, type PrayerMeta } from "@/lib/tazkiya/types";
import { formatDayFull } from "@/lib/tazkiya/dates";
import { fridayTimeOf, useFridayCountdown } from "@/lib/tazkiya/friday";
import { prayerTiming } from "@/lib/tazkiya/goals";
import type { PrayerWindow } from "@/lib/tazkiya/prayerWindows";
import { ConfirmButton } from "./ui-bits";
import { cn } from "@/lib/utils";

/** Kubah masjid kecil — satu-satunya aksen ikon, setara ikon tiket lain. */
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

/** Status ringkas — satu sumber, empat keadaan, tanpa kontradiksi. */
function statusOf(
  detail: PrayerDetail,
  phase: "active" | "past" | "future",
  w: PrayerWindow,
  today: string
): { text: string; cls?: "done" | "missed" } {
  if (detail.status === "done") {
    const t = prayerTiming(detail, w.start, today);
    const kind =
      detail.kind === "berjamaah"
        ? " · Berjamaah"
        : t === "late"
          ? " · Terlambat"
          : t === "ontime"
            ? " · Tepat waktu"
            : "";
    return { text: `Sudah dicatat${kind}`, cls: "done" };
  }
  if (detail.status === "missed") return { text: "Terlewat", cls: "missed" };
  if (phase === "active") return { text: "Waktu Salat Jumat tiba" };
  if (phase === "future") return { text: "Belum masuk waktu" };
  return { text: "Belum dicatat" };
}

export function FridayCard({
  today,
  w,
  detail,
  now,
  motionOK,
  phase,
  isNext = false,
  nextLabel,
  nextTime,
  onRecord,
  openSignal = 0,
}: {
  today: string;
  w: PrayerWindow;
  detail: PrayerDetail;
  now: Date;
  motionOK: boolean;
  /** Fase jendela slot — dihitung PrayerTickets dengan logika tiket lain. */
  phase: "active" | "past" | "future";
  /** Slot ini penanda "Berikutnya" keluarga tiket. */
  isNext?: boolean;
  /** Salat setelah Jumat (Asar) — ditampilkan terpisah, tenang. */
  nextLabel?: string;
  nextTime?: string;
  /** Buka mekanisme pencatatan existing (dialog Salat Jumat, berjamaah). */
  onRecord: (meta: PrayerMeta) => void;
  /** Sinyal eksternal (layar penuh "Mulai Persiapan") — membuka persiapan. */
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
  const cd = useFridayCountdown(info.time, true, now);

  const doneCount = useMemo(
    () => FRIDAY_PREP_ITEMS.reduce((n, _it, i) => n + (fridayPrep?.checks?.[i] ? 1 : 0), 0),
    [fridayPrep]
  );
  const prepPct = Math.round((doneCount / FRIDAY_PREP_ITEMS.length) * 100);

  const isDone = detail.status === "done";
  const isMissed = detail.status === "missed";
  const st = statusOf(detail, phase, w, today);

  /* ---------- Tilt 3D lembut (rentang lebih kecil dari versi lama) ---------- */
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tx = useMotionValue(0);
  const lift = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 300, damping: 24 });
  const sry = useSpring(ry, { stiffness: 300, damping: 24 });
  const stx = useSpring(tx, { stiffness: 300, damping: 24 });
  const slift = useSpring(lift, { stiffness: 380, damping: 26 });

  const reset = () => {
    rx.set(0);
    ry.set(0);
    tx.set(0);
    lift.set(0);
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) - 0.5;
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) - 0.5;
    const range = e.pointerType === "mouse" || e.pointerType === "pen" ? 1 : 0.5;
    ry.set(px * 4 * range);
    rx.set(-py * 2.5 * range);
    tx.set(px * 3 * range);
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

  /* Editor waktu pelaksanaan di masjid */
  const [timeDraft, setTimeDraft] = useState(settingsFriday?.time ?? "");
  useEffect(() => setTimeDraft(settingsFriday?.time ?? ""), [settingsFriday?.time]);

  return (
    <div>
      {/* ---------- Entrance: fade + slide + scale, sekali, tenang ---------- */}
      <m.div
        initial={anim ? { opacity: 0, y: 22, scale: 0.97 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <m.div
          className={cn(
            "tk-tkt tk-tkt--jumat tk-tkt--motion tap relative block cursor-pointer text-left",
            phase === "active" && "tk-tkt--active",
            isDone && "tk-tkt--done",
            isMissed && "tk-tkt--missed",
            isNext && phase === "future" && "tk-tkt--next"
          )}
          style={anim ? ({ rotateX: srx, rotateY: sry, x: stx, y: slift, transformPerspective: 900 } as const) : undefined}
          onPointerMove={anim ? onMove : undefined}
          onPointerLeave={anim ? reset : undefined}
          onPointerCancel={anim ? reset : undefined}
          onPointerDown={anim ? () => lift.set(-2) : undefined}
          onPointerUp={anim ? reset : undefined}
          onClick={() => onRecord(SALAT_JUMAT)}
          role="button"
          tabIndex={0}
          aria-label={`Catat Salat Jumat, mulai ${w.start.replace(":", ".")}, pelaksanaan ${info.time.replace(":", ".")}. Ketuk untuk membuka pencatatan`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRecord(SALAT_JUMAT);
            }
          }}
        >
          {/* 1. Baris utama — struktur identik tiket lain, tanpa garis dekoratif */}
          <span className="tk-tkt-row">
            <span className="tk-tkt-side tk-tkt-side--l">
              <span className="tk-tkt-name">
                <span className="tk-tkt-ic" aria-hidden>
                  <DomeAccent className="h-[13px] w-[13px]" />
                </span>
                Salat Jumat
                <span className="fr-badge">Jumat</span>
              </span>
              <span className="tk-tkt-time tnum">{w.start.replace(":", ".")}</span>
            </span>
            <span className="tk-tkt-side tk-tkt-side--r">
              <span className="tk-tkt-name tk-tkt-name--end">Pelaksanaan</span>
              <span className="tk-tkt-time tk-tkt-time--end tnum">{info.time.replace(":", ".")}</span>
            </span>
          </span>

          {/* 2. Perforasi keluarga tiket */}
          <span className="tk-tkt-perf" aria-hidden />

          {/* 3. Status ringkas — satu baris, empat keadaan */}
          <span className="tk-tkt-foot">
            <span className={cn("tk-tkt-status", st.cls === "done" && "tk-tkt-status--done", st.cls === "missed" && "tk-tkt-status--missed")}>
              <span className="tk-tkt-dot" aria-hidden />
              {st.text}
              {phase === "future" && !isDone && !isMissed ? (
                <span className="fr-cd tnum" aria-live="off">
                  · {cd.h}:{cd.m}:{cd.s}
                </span>
              ) : null}
            </span>
          </span>

          {/* Status kecil yang menyatu: pengingat saat waktu telah tiba */}
          {phase === "active" && !isDone && !isMissed ? (
            <span className="fr-hint">Catat pelaksanaanmu setelah selesai.</span>
          ) : null}

          {/* 4. Berikutnya · Asar — baris catatan keluarga tiket, terpisah */}
          {nextLabel ? (
            <span className="tk-tkt-note">Berikutnya · {nextLabel} {nextTime?.replace(":", ".")}</span>
          ) : null}

          {/* 5. Persiapan Jumat — ringkas, satu baris, tombol kecil */}
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`Persiapan Jumat ${doneCount} dari ${FRIDAY_PREP_ITEMS.length} selesai. ${expanded ? "Tutup" : "Buka"} daftar persiapan`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="fr-prep-row tap"
          >
            <span className="fr-prep-label">Persiapan Jumat</span>
            <span className="fr-prep-bar" aria-hidden>
              <span className="fr-prep-bar-fill" style={{ width: `${prepPct}%` }} />
            </span>
            <span className="fr-prep-count tnum">{doneCount}/{FRIDAY_PREP_ITEMS.length}</span>
            <span className="fr-prep-more">
              {expanded ? "Tutup" : "Lihat persiapan"}
              <ChevronDown size={11} className={cn("transition-transform duration-300", expanded && "rotate-180")} />
            </span>
          </button>
        </m.div>
      </m.div>

      {/* ---------- Expandable persiapan: halus, ringkas, tanpa mendominasi ---------- */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <m.div
            key="prep"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <m.div
              initial={{ y: 8 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="fr-panel mt-2.5 rounded-[1.3rem] p-4"
            >
              {/* Checklist 8 sunnah — baris kecil, tanpa ring dekoratif */}
              <div className="flex items-baseline justify-between gap-3">
                <p className="fr-overline">Persiapan Jumat</p>
                <p className="tnum text-[11px] font-bold text-tk-ink">
                  {doneCount}/{FRIDAY_PREP_ITEMS.length} selesai
                </p>
              </div>
              <ul className="mt-2 space-y-1" aria-label="Checklist persiapan Salat Jumat">
                {FRIDAY_PREP_ITEMS.map((it, i) => {
                  const checked = !!fridayPrep?.checks?.[i];
                  return (
                    <m.li key={i} initial={anim ? { opacity: 0, y: 5 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.05 + i * 0.035 }}>
                      <button
                        type="button"
                        aria-pressed={checked}
                        onClick={() => setFridayPrepCheck(today, i, !checked)}
                        className={cn(
                          "tap flex min-h-[40px] w-full items-center gap-2.5 rounded-[0.9rem] border px-3 py-1.5 text-left transition-colors",
                          checked ? "fr-check-on" : "fr-check border-tk-line bg-tk-panel"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                            checked ? "gs-ink-btn border-transparent" : "border-tk-line-strong bg-transparent"
                          )}
                        >
                          {checked ? <Check size={11} strokeWidth={3.2} /> : null}
                        </span>
                        <span className={cn("text-[12px] leading-snug", checked ? "font-semibold text-tk-ink" : "text-tk-ink/85")}>{it}</span>
                      </button>
                    </m.li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[9.5px] leading-snug text-tk-muted/85">
                Pengingat sunnah — bukan syarat sah. Tersimpan per tanggal Jumat.
              </p>

              {/* Catatan pribadi */}
              <label className="mt-3.5 block">
                <span className="fr-overline">Catatan Pribadi</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Mis. khatib siapa, refleksi khutbah…"
                  aria-label="Catatan pribadi Salat Jumat"
                  className="tk-field mt-1.5 w-full resize-none py-2.5 text-[12px] leading-relaxed"
                />
              </label>

              {/* Jadwal pelaksanaan di masjid */}
              <div className="mt-3.5">
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
                  Tanpa pengaturan, waktu pelaksanaan mengikuti masuk Zuhur ({w.start.replace(":", ".")}).
                </p>
              </div>

              {/* Pencatatan existing — tidak otomatis */}
              <div className="mt-4 flex flex-wrap gap-2">
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

              <p className="mt-2.5 text-[9.5px] leading-snug text-tk-muted/80">
                Persiapan &amp; catatan tersimpan untuk Jumat {formatDayFull(today)}.
              </p>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
