"use client";

/**
 * Tazkiya — Tasbih Digital (overlay layar penuh).
 * Piringan hitung dengan cincin progres, cahaya conic berputar,
 * preset zikir, preset target (33/100/500/1000), dan simpan harian.
 */

import { useState } from "react";
import { Minus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
import { ZIKIR_PRESETS } from "@/lib/tazkiya/types";
import { todayKey } from "@/lib/tazkiya/dates";
import { ProgressRing } from "./ui-bits";
import { cn } from "@/lib/utils";

export function TasbihSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-tz-frame"
      role="dialog"
      aria-modal="true"
      aria-label="Tasbih digital"
    >
      <div aria-hidden className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-tz-purple/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-24 h-64 w-64 rounded-full bg-tz-violet/25 blur-3xl" />

      {/* ---------- Kepala ---------- */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <h2 className="font-display text-lg font-bold text-gradient-violet">Tasbih Digital</h2>
          <p className="text-xs text-tz-muted">Ketuk lingkaran besar untuk berzikir</p>
        </div>
        <button
          type="button"
          aria-label="Tutup tasbih"
          onClick={onClose}
          className="tap glass flex h-10 w-10 items-center justify-center rounded-full text-tz-lavender"
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
              "tap shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium",
              tasbih.dhikr === z
                ? "border-tz-violet/60 bg-gradient-to-r from-tz-purple to-tz-violet text-white glow-violet-sm"
                : "border-tz-line bg-tz-panel text-tz-muted"
            )}
          >
            {z}
          </button>
        ))}
      </div>

      {/* ---------- Piringan hitung ---------- */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <p className="max-w-full truncate text-center font-display text-lg font-semibold text-tz-accent">{tasbih.dhikr}</p>
        <motion.button
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
          <span
            aria-hidden
            className="animate-tz-spin-slow absolute -inset-3 rounded-full opacity-60"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(156,114,239,0) 0deg, rgba(156,114,239,0.35) 80deg, rgba(216,197,255,0.5) 140deg, rgba(156,114,239,0) 220deg)",
              filter: "blur(14px)",
            }}
          />
          <ProgressRing value={pct} size={248} stroke={8} trackClass="stroke-tz-track" className="absolute inset-0" />
          <span
            aria-hidden
            className="tz-tasbih-disc absolute inset-[22px] rounded-full border border-tz-violet/40 bg-gradient-to-br from-tz-violet/40 via-tz-purple/28 to-tz-deep/92"
            style={{
              boxShadow:
                "inset 0 2px 28px rgba(156,114,239,0.4), inset 0 -8px 30px rgba(13,10,20,0.5), 0 24px 60px -12px rgba(13,10,20,0.7), 0 0 44px -10px rgba(156,114,239,0.5)",
            }}
          />
          <span
            aria-hidden
            className="absolute inset-[22px] rounded-full bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.14),rgba(255,255,255,0)_60%)]"
          />
          <span className="relative flex flex-col items-center">
            <span className="text-glow font-display text-[64px] font-extrabold leading-none tabular-nums text-tz-ink">
              {tasbih.count.toLocaleString("id-ID")}
            </span>
            <span className="mt-1.5 text-xs text-tz-accent/95">
              dari {tasbih.target.toLocaleString("id-ID")} target
            </span>
            <span
              className={cn(
                "mt-2.5 rounded-full border px-3 py-1 text-[10px] font-semibold",
                reached
                  ? "border-white/40 bg-white text-tz-purple shadow-[0_0_16px_-2px_rgba(255,255,255,0.7)]"
                  : "border-tz-line bg-tz-track text-tz-accent"
              )}
            >
              {reached ? "Target tercapai" : `${pct}%`}
            </span>
          </span>
        </motion.button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={tasbihMinus}
            aria-label="Kurangi satu hitungan"
            className="tap glass flex h-12 w-12 items-center justify-center rounded-2xl text-tz-accent"
          >
            <Minus size={18} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="tap glass flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-rose-500 light:text-rose-600"
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
              const n = commitZikirToDay(todayKey());
              if (n === 0) toast.error("Hitungan masih 0 — berzikir dulu ya");
              else toast.success(`${n.toLocaleString("id-ID")} zikir ditambahkan ke catatan harian`);
            }}
            className="tap flex h-12 items-center justify-center gap-2 rounded-2xl border border-tz-violet/50 bg-gradient-to-r from-tz-purple via-tz-violet to-tz-purple px-4 text-sm font-semibold text-white shadow-[0_10px_28px_-8px_rgba(85,51,154,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:brightness-110"
          >
            <Save size={16} /> Simpan Harian
          </button>
        </div>
      </div>

      {/* ---------- Target ---------- */}
      <div className="glass-strong relative z-10 mx-4 mb-[max(1.5rem,env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2.5 rounded-[1.15rem] p-3.5">
        <label htmlFor="tasbih-target" className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tz-muted">
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
                "tap min-w-[38px] flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all",
                tasbih.target === n
                  ? "border-tz-violet/60 bg-tz-violet text-white shadow-[0_0_12px_-3px_rgba(156,114,239,0.8)]"
                  : "border-tz-line bg-tz-panel text-tz-muted"
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
            className="w-[52px] shrink-0 rounded-lg border border-tz-line bg-tz-panel-strong px-2 py-1.5 text-center text-xs text-tz-ink outline-none transition-colors focus:border-tz-violet/60"
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
            className="tap shrink-0 rounded-lg bg-gradient-to-r from-tz-purple to-tz-violet px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_-4px_rgba(156,114,239,0.8)]"
          >
            Atur
          </button>
        </div>
      </div>
    </motion.div>
  );
}
