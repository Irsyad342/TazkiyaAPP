"use client";

/**
 * Tazkiya v4 — Tasbih Digital (overlay layar penuh).
 * Piringan penghitung baru: lingkaran putih bersih dengan cincin progres
 * lavender dan titik lime di ujung busur — tanpa conic glow. Preset zikir
 * berupa chip; target preset 33/100/500/1000 + angka khusus; simpan harian
 * tetap menulis ke catatan hari ini & riwayat (logika tidak berubah).
 */

import { useState } from "react";
import { Minus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
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
import { ZIKIR_PRESETS, type ZikirSlot } from "@/lib/tazkiya/types";
import { todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

export function TasbihSheet({
  open,
  onClose,
  slot = "harian",
}: {
  open: boolean;
  onClose: () => void;
  /** Slot zikir untuk sesi yang disimpan (pagi / petang / setelah-sholat / harian). */
  slot?: ZikirSlot;
}) {
  const tasbih = useWorshipStore((s) => s.tasbih);
  const tasbihAdd = useWorshipStore((s) => s.tasbihAdd);
  const tasbihMinus = useWorshipStore((s) => s.tasbihMinus);
  const tasbihReset = useWorshipStore((s) => s.tasbihReset);
  const tasbihSetTarget = useWorshipStore((s) => s.tasbihSetTarget);
  const tasbihSetDhikr = useWorshipStore((s) => s.tasbihSetDhikr);
  const commitZikirToDay = useWorshipStore((s) => s.commitZikirToDay);
  const vibration = useWorshipStore((s) => s.settings.vibration);
  const [targetDraft, setTargetDraft] = useState(String(tasbih.target));

  if (!open) return null;

  const pct = Math.min(100, Math.round((tasbih.count / Math.max(1, tasbih.target)) * 100));
  const reached = tasbih.count >= tasbih.target;

  /** Busur SVG cincin penghitung (r=118 pada viewBox 260). */
  const R = 118;
  const CIRC = 2 * Math.PI * R;
  const dash = (pct / 100) * CIRC;
  const angle = (-90 + (pct / 100) * 360) * (Math.PI / 180);
  const tipX = 130 + R * Math.cos(angle);
  const tipY = 130 + R * Math.sin(angle);

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-tz-stage"
      role="dialog"
      aria-modal="true"
      aria-label="Tasbih digital"
    >
      {/* ---------- Kepala ---------- */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-tz-ink">
            Tasbih Digital<span className="text-tz-violet">.</span>
          </h2>
          <p className="text-xs text-tz-muted">Ketuk lingkaran besar untuk berzikir</p>
        </div>
        <button
          type="button"
          aria-label="Tutup tasbih"
          onClick={onClose}
          className="tap glass flex h-10 w-10 items-center justify-center rounded-full text-tz-ink"
        >
          <X size={18} />
        </button>
      </div>

      {/* ---------- Preset zikir ---------- */}
      <div className="no-scrollbar relative z-10 mt-3 flex gap-2 overflow-x-auto px-5">
        {ZIKIR_PRESETS.map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => tasbihSetDhikr(z)}
            className={cn(
              "tap shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
              tasbih.dhikr === z
                ? "v5-ink-btn"
                : "border-tz-line bg-tz-panel text-tz-muted"
            )}
          >
            {z}
          </button>
        ))}
      </div>

      {/* ---------- Piringan hitung ---------- */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <p className="max-w-full truncate text-center font-display text-[17px] font-bold text-tz-violet dark:text-tz-accent">{tasbih.dhikr}</p>
        <button
          type="button"
          onClick={() => {
            tasbihAdd(1);
            if (vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate(12);
              } catch {
                /* perangkat tidak mendukung */
              }
            }
            if (tasbih.count + 1 === tasbih.target) toast.success("Target tasbih tercapai! Barakallah");
          }}
          aria-label={`Tambah hitungan, saat ini ${tasbih.count}`}
          className={cn("tap relative flex h-[248px] w-[248px] items-center justify-center rounded-full sm:h-[260px] sm:w-[260px]", reached && "animate-tz-pulse")}
        >
          {/* cincin progres lavender + titik lime */}
          <svg aria-hidden viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="130" cy="130" r={R} fill="none" strokeWidth="7" className="stroke-tz-track" />
            <circle
              cx="130"
              cy="130"
              r={R}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-tz-violet"
              strokeDasharray={`${dash} ${CIRC}`}
              style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          {/* titik lime di ujung busur */}
          {pct > 2 && pct < 100 ? (
            <span
              aria-hidden
              className="absolute h-3 w-3 rounded-full bg-tz-lime ring-4 ring-tz-lime/25"
              style={{
                left: `calc(${(tipX / 260) * 100}% - 6px)`,
                top: `calc(${(tipY / 260) * 100}% - 6px)`,
              }}
            />
          ) : null}
          {/* piringan putih */}
          <span aria-hidden className="tz-tasbih-disc absolute inset-[26px] rounded-full border border-tz-line" />
          <span className="relative flex flex-col items-center">
            <span className="v5-display text-[64px] font-extrabold leading-none text-tz-ink">
              {tasbih.count.toLocaleString("id-ID")}
            </span>
            <span className="mt-1.5 text-xs font-medium text-tz-muted">
              dari {tasbih.target.toLocaleString("id-ID")} target
            </span>
            <span
              className={cn(
                "mt-3 rounded-full px-3 py-1 text-[10px] font-bold",
                reached ? "bg-tz-lime text-tz-lime-ink" : "bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent"
              )}
            >
              {reached ? "Target tercapai" : `${pct}%`}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={tasbihMinus}
            aria-label="Kurangi satu hitungan"
            className="tap glass flex h-12 w-12 items-center justify-center rounded-full text-tz-ink"
          >
            <Minus size={18} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="tap glass flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-tz-muted"
              >
                <RotateCcw size={16} /> Reset
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong fixed! border-tz-line">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-tz-ink">Reset hitungan tasbih?</AlertDialogTitle>
                <AlertDialogDescription className="text-tz-muted">
                  Hitungan {tasbih.count.toLocaleString("id-ID")} akan dikembalikan ke 0. Zikir yang sudah ditambahkan ke
                  catatan harian tidak terpengaruh.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-tz-line bg-tz-panel text-tz-ink">Batal</AlertDialogCancel>
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
              if (n === 0) toast.error("Hitungan masih 0 — berzikir dulu ya");
              else toast.success(`${n.toLocaleString("id-ID")} zikir ditambahkan ke catatan harian`);
            }}
            className="tap flex h-12 items-center justify-center gap-2 rounded-full v5-ink-btn px-5 font-display text-sm font-bold"
          >
            <Save size={16} /> Simpan Harian
          </button>
        </div>
      </div>

      {/* ---------- Target ---------- */}
      <div className="glass-strong relative z-10 mx-4 mb-[max(1.5rem,env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2.5 rounded-[1.3rem] p-3.5">
        <label htmlFor="tasbih-target" className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-tz-muted">
          Target hitungan
        </label>
        <div className="flex items-center gap-1.5">
          {[33, 100, 500, 1000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                tasbihSetTarget(n);
                setTargetDraft(String(n));
              }}
              className={cn(
                "tap min-w-[38px] flex-1 rounded-full px-2 py-1.5 text-[11px] font-bold transition-all",
                tasbih.target === n
                  ? "v5-ink-btn"
                  : "bg-tz-panel-soft text-tz-muted"
              )}
            >
              {n}
            </button>
          ))}
          <input
            id="tasbih-target"
            type="number"
            min={1}
            inputMode="numeric"
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.target.value)}
            aria-label="Target hitungan khusus"
            className="w-[52px] shrink-0 rounded-full border border-tz-line bg-tz-panel-strong px-2 py-1.5 text-center text-xs text-tz-ink outline-none transition-colors focus:border-tz-violet/60"
          />
          <button
            type="button"
            onClick={() => {
              const n = parseInt(targetDraft, 10);
              if (Number.isNaN(n) || n < 1) {
                toast.error("Target harus angka lebih dari 0");
                return;
              }
              tasbihSetTarget(n);
              toast.success(`Target diatur ke ${n.toLocaleString("id-ID")}`);
            }}
            className="tap shrink-0 rounded-full bg-tz-lime px-3.5 py-1.5 text-[11px] font-bold text-tz-lime-ink"
          >
            Atur
          </button>
        </div>
      </div>
    </m.div>
  );
}
