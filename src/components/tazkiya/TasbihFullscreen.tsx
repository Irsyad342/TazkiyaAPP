"use client";

/**
 * SUIO — Tasbih Digital LAYAR PENUH (mode imersif).
 * Dipanggil dari tombol Fullscreen di halaman Zikir & Doa. Bukan dialog
 * pemilihan zikir: satu layar bersih berisi nama zikir, Arab besar,
 * transliterasi + arti, angka hitungan sebagai elemen utama dalam cincin
 * progres, "12 / 33", tombol hitung, minus, reset (konfirmasi), simpan
 * harian, dan kontrol getaran bila perangkat mendukung.
 *
 * State COUNTER TUNGGAL: membaca & menulis langsung ke useWorshipStore
 * (tasbih/tasbihAdd/tasbihReset/…) — persis komponen halaman utama, sehingga
 * hitungan, target, dan jenis zikir selalu sinkron dan tidak hilang saat
 * keluar fullscreen. Fullscreen API dipakai bila tersedia; bila tidak,
 * overlay fixed inset-0 tetap menutup seluruh elemen halaman (fallback).
 */

import { useCallback, useEffect, useRef } from "react";
import { Minus, RotateCcw, Save, Vibrate, X } from "lucide-react";
import { toast } from "sonner";
import { m, useReducedMotion } from "framer-motion";
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
import { PRESET_ARABIC } from "./ZikirDoaPage";
import { todayKey } from "@/lib/tazkiya/dates";
import type { ZikirSlot } from "@/lib/tazkiya/types";
import { cn } from "@/lib/utils";

export function TasbihFullscreen({
  open,
  onClose,
  slot = "harian",
}: {
  open: boolean;
  onClose: () => void;
  /** Slot zikir untuk sesi yang disimpan (mengikuti konteks pembuka). */
  slot?: ZikirSlot;
}) {
  const tasbih = useWorshipStore((s) => s.tasbih);
  const tasbihAdd = useWorshipStore((s) => s.tasbihAdd);
  const tasbihMinus = useWorshipStore((s) => s.tasbihMinus);
  const tasbihReset = useWorshipStore((s) => s.tasbihReset);
  const commitZikirToDay = useWorshipStore((s) => s.commitZikirToDay);
  const vibration = useWorshipStore((s) => s.settings.vibration);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const reduceMotion = useReducedMotion();
  const motionOK = animationsOn && !reduceMotion;

  const stageRef = useRef<HTMLDivElement>(null);
  /* Overlay hanya dirender setelah interaksi pengguna (client), jadi deteksi
     langsung aman tanpa effect dan tanpa risiko hydration mismatch. */
  const vibrateSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  /* Fullscreen API: minta layar penuh sistem saat overlay dibuka (dipanggil
     dalam jendela aktivitas pengguna dari ketukan tombol). Gagal → fallback
     overlay tetap imersif. Keluar → tutup fullscreen sistem juga. */
  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [open, onClose]);

  const buzz = useCallback(
    (pattern: number | number[]) => {
      if (vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch {
          /* perangkat tidak mendukung */
        }
      }
    },
    [vibration]
  );

  if (!open) return null;

  const meta = PRESET_ARABIC[tasbih.dhikr];
  const pct = Math.min(100, Math.round((tasbih.count / Math.max(1, tasbih.target)) * 100));
  const reached = tasbih.count >= tasbih.target;

  /** Busur SVG cincin (r=150 pada viewBox 340) — mengelilingi angka. */
  const R = 150;
  const CIRC = 2 * Math.PI * R;
  const dash = (pct / 100) * CIRC;
  const angle = (-90 + (pct / 100) * 360) * (Math.PI / 180);
  const tipX = 170 + R * Math.cos(angle);
  const tipY = 170 + R * Math.sin(angle);

  const hitung = () => {
    tasbihAdd(1);
    buzz(12);
    if (tasbih.count + 1 === tasbih.target) {
      buzz([40, 60, 40]);
      toast.success("Target tasbih tercapai! Barakallah");
    }
  };

  return (
    <m.div
      ref={stageRef}
      initial={motionOK ? { opacity: 0, scale: 0.94, y: 24 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={motionOK ? { opacity: 0, scale: 0.96, y: 24 } : { opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-tk-stage"
      role="dialog"
      aria-modal="true"
      aria-label="Tasbih digital layar penuh"
    >
      {/* Panggung tetap dalam kolom aplikasi di layar lebar */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-1 flex-col">
        {/* ---------- Kepala: judul + getar + keluar (selalu mudah ditemukan) ---------- */}
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="gs-overline">Tasbih Digital · Layar Penuh</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {vibrateSupported ? (
              <button
                type="button"
                onClick={() => {
                  updateSettings({ vibration: !vibration });
                  if (!vibration) buzz(30);
                }}
                aria-pressed={vibration}
                aria-label={vibration ? "Matikan getaran" : "Nyalakan getaran"}
                className={cn(
                  "tap glass flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  vibration ? "text-tk-violet dark:text-tk-accent" : "text-tk-muted"
                )}
              >
                <Vibrate size={17} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Keluar layar penuh"
              className="tap glass flex h-10 w-10 items-center justify-center rounded-full text-tk-ink"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* ---------- Zikir aktif: nama, Arab besar, transliterasi, arti ---------- */}
        <div className="relative z-10 px-6 pt-3 text-center">
          <p className="font-display text-[16px] font-bold tracking-[-0.01em] text-tk-ink">{tasbih.dhikr}</p>
          {meta ? (
            <>
              <p className="quran-arabic mt-3 text-[38px] leading-[1.6] text-tk-ink">{meta.arabic}</p>
              <p className="mt-1.5 text-[12.5px] font-semibold italic text-tk-muted">{tasbih.dhikr}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-tk-muted">{meta.meaning}</p>
            </>
          ) : null}
        </div>

        {/* ---------- Cincin hitung: ketuk untuk menambah ---------- */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6">
          <m.button
            type="button"
            onClick={hitung}
            whileTap={motionOK ? { scale: 0.96 } : undefined}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            aria-label={`Tambah hitungan, saat ini ${tasbih.count}`}
            className={cn(
              "relative flex h-[min(72vw,300px)] w-[min(72vw,300px)] items-center justify-center rounded-full",
              reached && animationsOn && "animate-tk-pulse"
            )}
          >
            <svg aria-hidden viewBox="0 0 340 340" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="170" cy="170" r={R} fill="none" strokeWidth="8" className="stroke-tk-track" />
              <circle
                cx="170"
                cy="170"
                r={R}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-tk-violet dark:stroke-tk-accent"
                strokeDasharray={`${dash} ${CIRC}`}
                /* linecap round pada busur nol persen merender titik — sembunyikan */
                style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.22, 1, 0.36, 1)", opacity: pct > 0 ? 1 : 0 }}
              />
            </svg>
            {pct > 2 && pct < 100 ? (
              <span
                aria-hidden
                className="absolute h-3.5 w-3.5 rounded-full bg-tk-lime ring-4 ring-tk-lime/25"
                style={{
                  left: `calc(${(tipX / 340) * 100}% - 7px)`,
                  top: `calc(${(tipY / 340) * 100}% - 7px)`,
                }}
              />
            ) : null}
            <span aria-hidden className="tk-tasbih-disc absolute inset-[22px] rounded-full border border-tk-line" />
            <m.span
              key={tasbih.count}
              initial={motionOK ? { scale: 0.9 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 550, damping: 22 }}
              className="relative flex flex-col items-center"
            >
              <span className="gs-display text-[76px] font-extrabold leading-none text-tk-ink">
                {tasbih.count.toLocaleString("id-ID")}
              </span>
              <span className="tnum mt-2 text-[13px] font-semibold text-tk-muted">
                {Math.min(tasbih.count, tasbih.target).toLocaleString("id-ID")} / {tasbih.target.toLocaleString("id-ID")}
              </span>
              <span
                className={cn(
                  "mt-2.5 rounded-full px-3 py-1 text-[10px] font-bold",
                  reached ? "bg-tk-lime text-tk-lime-ink" : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent"
                )}
              >
                {reached ? "Target tercapai" : `${pct}%`}
              </span>
            </m.span>
          </m.button>
        </div>

        {/* ---------- Kontrol bawah: minus · reset · simpan ---------- */}
        <div className="relative z-10 flex items-center justify-center gap-2.5 px-6 pb-2">
          <button
            type="button"
            onClick={() => {
              tasbihMinus();
              buzz(8);
            }}
            aria-label="Kurangi satu hitungan"
            className="tap glass flex h-12 w-12 items-center justify-center rounded-full text-tk-ink"
          >
            <Minus size={18} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="tap glass flex h-12 items-center justify-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-tk-muted"
              >
                <RotateCcw size={15} /> Reset
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong fixed! z-[60] border-tk-line">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-tk-ink">Reset hitungan tasbih?</AlertDialogTitle>
                <AlertDialogDescription className="text-tk-muted">
                  Hitungan {tasbih.count.toLocaleString("id-ID")} akan dikembalikan ke 0. Zikir yang sudah ditambahkan ke
                  catatan harian tidak terpengaruh.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-tk-line bg-tk-panel text-tk-ink">Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-[#E5484D] text-white"
                  onClick={() => {
                    tasbihReset();
                    toast.info("Hitungan tasbih direset");
                  }}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            type="button"
            onClick={() => {
              const n = commitZikirToDay(todayKey(), slot);
              if (n === 0) toast.error("Hitungan masih 0, berzikir dulu ya");
              else toast.success(`${n.toLocaleString("id-ID")} zikir ditambahkan ke catatan harian`);
            }}
            className="tap flex h-12 items-center justify-center gap-2 rounded-full gs-ink-btn px-4 text-[12.5px] font-bold"
          >
            <Save size={15} /> Simpan
          </button>
        </div>
        <p className="relative z-10 pb-[max(1.1rem,env(safe-area-inset-bottom))] text-center text-[10px] text-tk-muted/70">
          Ketuk lingkaran untuk berzikir · Esc atau tombol × untuk keluar
        </p>
      </div>
    </m.div>
  );
}
