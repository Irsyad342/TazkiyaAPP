"use client";

/**
 * Tazkiya — Tasbih Digital (overlay layar penuh).
 * Piringan hitung dengan cincin progres lavender→lime, preset zikir,
 * preset target (33/100/500/1000), dan simpan harian.
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
import { ProgressRing } from "./ui-bits";
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

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-tz-frame"
      role="dialog"
      aria-modal="true"
      aria-label="Tasbih digital"
    >
      {/* Blob pastel lembut di latar */}
      <div aria-hidden className="tz-blob -left-16 top-10 h-56 w-56 bg-tz-violet/15" />
      <div aria-hidden className="tz-blob -right-16 bottom-24 h-56 w-56 bg-tz-lime/15" />

      {/* ---------- Kepala ---------- */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <h2 className="tz-stat text-lg font-extrabold text-tz-ink">Tasbih Digital</h2>
          <p className="text-xs font-medium text-tz-muted">Ketuk lingkaran besar untuk berzikir</p>
        </div>
        <button
          type="button"
          aria-label="Tutup tasbih"
          onClick={onClose}
          className="tap flex h-10 w-10 items-center justify-center rounded-full border border-tz-line bg-tz-panel text-tz-ink"
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
              "tap shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold",
              tasbih.dhikr === z
                ? "border-transparent bg-tz-violet text-white light:text-white"
                : "border-tz-line bg-tz-panel-soft text-tz-muted"
            )}
          >
            {z}
          </button>
        ))}
      </div>

      {/* ---------- Piringan hitung ---------- */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <p className="max-w-full truncate text-center font-display text-lg font-extrabold text-tz-violet">{tasbih.dhikr}</p>
        <m.button
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
          whileTap={{ scale: 0.94 }}
          aria-label={`Tambah hitungan, saat ini ${tasbih.count}`}
          className={cn("relative flex h-[248px] w-[248px] items-center justify-center rounded-full", reached && "animate-tz-pulse")}
        >
          <ProgressRing value={pct} size={248} stroke={10} trackClass="stroke-tz-track" className="absolute inset-0" />
          <span
            aria-hidden
            className="absolute inset-[22px] rounded-full border border-tz-line bg-tz-panel shadow-[0_28px_60px_-24px_rgba(84,70,160,0.45)]"
          />
          <span
            aria-hidden
            className="absolute inset-[22px] rounded-full bg-[radial-gradient(80%_60%_at_50%_0%,rgba(136,121,232,0.12),rgba(255,255,255,0)_60%)]"
          />
          <span className="relative flex flex-col items-center">
            <span className="tz-stat text-[64px] font-extrabold leading-none text-tz-ink">
              {tasbih.count.toLocaleString("id-ID")}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-tz-muted">
              dari {tasbih.target.toLocaleString("id-ID")} target
            </span>
            <span
              className={cn(
                "mt-2.5 rounded-full px-3 py-1 text-[10px] font-extrabold",
                reached ? "tz-btn-lime" : "bg-tz-panel-soft text-tz-accent"
              )}
            >
              {reached ? "Target tercapai" : `${pct}%`}
            </span>
          </span>
        </m.button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={tasbihMinus}
            aria-label="Kurangi satu hitungan"
            className="tap flex h-12 w-12 items-center justify-center rounded-2xl border border-tz-line bg-tz-panel text-tz-ink"
          >
            <Minus size={18} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="tap flex h-12 items-center justify-center gap-2 rounded-2xl border border-tz-line bg-tz-panel px-4 text-sm font-bold text-rose-500 light:text-rose-600"
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
                <AlertDialogCancel className="border-tz-line bg-tz-panel-soft text-tz-ink">Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-rose-500 text-white"
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
            className="tap tz-btn-lime flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold"
          >
            <Save size={16} /> Simpan Harian
          </button>
        </div>
      </div>

      {/* ---------- Target ---------- */}
      <div className="glass-strong relative z-10 mx-4 mb-[max(1.5rem,env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2.5 rounded-[1.35rem] p-3.5">
        <label htmlFor="tasbih-target" className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tz-muted">
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
                "tap min-w-[38px] flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold transition-all",
                tasbih.target === n
                  ? "border-transparent bg-tz-violet text-white"
                  : "border-tz-line bg-tz-panel-soft text-tz-muted"
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
            className="w-[52px] shrink-0 rounded-xl border border-tz-line bg-tz-panel px-2 py-1.5 text-center text-xs font-bold text-tz-ink outline-none transition-colors focus:border-tz-violet/60"
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
            className="tap shrink-0 rounded-xl bg-tz-ink px-3 py-1.5 text-[11px] font-extrabold text-white light:text-white"
          >
            Atur
          </button>
        </div>
      </div>
    </m.div>
  );
}
