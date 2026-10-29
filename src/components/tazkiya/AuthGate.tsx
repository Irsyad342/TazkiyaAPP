"use client";

/**
 * Tazkiya — Gerbang akun: inisialisasi sesi + dialog keputusan data.
 *
 * Dialog muncul HANYA saat pengguna perlu memutuskan nasib data
 * (pindah/gabung/pakai data akun). Tidak ada keputusan yang diambil diam-diam:
 * data lokal tidak pernah otomatis menimpa data akun, dan sebaliknya.
 */

import { useEffect } from "react";
import { CloudUpload, GitMerge, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cancelMigrationBySignOut, initSyncBridge, resolveMigration } from "@/lib/sync/cloud-sync";

export function AuthGate() {
  useEffect(() => {
    initSyncBridge();
    void useAuthStore.getState().initAuth();
  }, []);

  const prompt = useAuthStore((s) => s.migrationPrompt);
  const phase = useAuthStore((s) => s.syncPhase);
  const busy = phase === "resolving";

  if (!prompt) return null;

  const statsLine = (days: number, done: number) =>
    `${days} hari aktif · ${done.toLocaleString("id-ID")} ibadah tercatat`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keputusan data akun"
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm"
    >
      <div className="animate-tz-fade-up w-full max-w-[360px] rounded-[1.5rem] border border-tz-line-strong bg-tz-frame p-5 shadow-[0_30px_80px_-20px_rgba(10,6,20,0.85)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-tz-violet/40 bg-gradient-to-br from-tz-violet/30 to-tz-purple/16 text-tz-violet">
            {prompt.kind === "migrate" ? <CloudUpload size={20} /> : <GitMerge size={20} />}
          </span>
          <div>
            <h2 className="font-display text-[15.5px] font-bold text-tz-ink">
              {prompt.kind === "migrate" ? "Data lokal ditemukan" : "Data akun & perangkat berbeda"}
            </h2>
            <p className="text-[11px] text-tz-muted">
              {prompt.kind === "migrate" ? "Amankan catatan ibadahmu ke akun" : "Pilih cara menyatukan keduanya"}
            </p>
          </div>
        </div>

        {prompt.kind === "migrate" ? (
          <>
            <p className="mt-3.5 text-[12.5px] leading-relaxed text-tz-muted">
              Kami menemukan <span className="font-semibold text-tz-ink">{statsLine(prompt.localDays, prompt.localDone)}</span> di
              perangkat ini. Pindahkan ke akunmu agar tersimpan aman dan bisa dibuka dari perangkat lain?
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveMigration("migrate")}
                className="tap flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-tz-violet to-tz-purple text-sm font-bold text-white shadow-[0_10px_26px_-10px_rgba(117,70,200,0.9)] transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                Pindahkan ke akun
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveMigration("fresh")}
                className="tap flex min-h-[44px] w-full items-center justify-center rounded-xl border border-tz-line bg-tz-panel-soft text-[13px] font-semibold text-tz-ink transition-colors hover:border-tz-violet/40 disabled:opacity-60"
              >
                Mulai dari kosong
              </button>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-tz-muted/80">
              Memilih mulai kosong tidak menghapus apa pun — salinan data lama tetap tersimpan aman di perangkat ini.
            </p>
          </>
        ) : (
          <>
            <div className="mt-3.5 space-y-2 rounded-xl border border-tz-line bg-tz-panel-soft p-3 text-[12.5px]">
              <p className="flex items-center justify-between gap-2">
                <span className="text-tz-muted">Data di akun</span>
                <span className="font-semibold text-tz-ink">{statsLine(prompt.cloudDays, prompt.cloudDone)}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-tz-muted">Data di perangkat ini</span>
                <span className="font-semibold text-tz-ink">{statsLine(prompt.localDays, prompt.localDone)}</span>
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveMigration("merge")}
                className="tap flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-tz-violet to-tz-purple text-sm font-bold text-white shadow-[0_10px_26px_-10px_rgba(117,70,200,0.9)] transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <GitMerge size={16} />}
                Gabungkan keduanya
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveMigration("cloud")}
                className="tap flex min-h-[44px] w-full items-center justify-center rounded-xl border border-tz-line bg-tz-panel-soft text-[13px] font-semibold text-tz-ink transition-colors hover:border-tz-violet/40 disabled:opacity-60"
              >
                Gunakan data akun
              </button>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-tz-muted/80">
              <ShieldCheck size={12} className="mt-0.5 shrink-0" />
              Penggabungan anti-duplikat: catatan yang sama tidak akan terhitung dua kali.
            </p>
          </>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => void cancelMigrationBySignOut()}
          className="tap mt-4 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-tz-muted transition-colors hover:text-tz-accent disabled:opacity-60"
        >
          <LogOut size={12} />
          Keluar tanpa memindahkan apa pun
        </button>
      </div>
    </div>
  );
}
