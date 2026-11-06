"use client";

/**
 * Tazkiya v4 — Bottom sheet pencatatan salat.
 * Dibuka dengan mengetuk kartu salat (klik/keyboard juga berfungsi). Satu alur lengkap tanpa popup
 * bertingkat: tiga status → jenis pelaksanaan / alasan → simpan.
 * Gaya baru: sheet putih bersih, pilihan status berupa kartu radio dengan
 * titik radio lavender, tombol simpan tinta. Logika status, Jumat wajib
 * berjamaah, alasan introspektif, dan tawaran qada tidak berubah.
 */

import { useState } from "react";
import { CalendarDays, Check, CircleDashed, CircleMinus, CheckCircle2, User, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MISS_REASONS,
  type PrayerDetail,
  type PrayerKind,
  type PrayerMeta,
  type PrayerStatus,
} from "@/lib/tazkiya/types";
import { formatDayFull } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { id: PrayerStatus; label: string; caption: string; icon: typeof CheckCircle2 }[] = [
  { id: "done", label: "Sudah dilaksanakan", caption: "Catat sebagai selesai", icon: CheckCircle2 },
  { id: "missed", label: "Tidak dilaksanakan", caption: "Catat dengan alasan", icon: CircleMinus },
  { id: "none", label: "Belum dicatat", caption: "Hapus catatan salat ini", icon: CircleDashed },
];

/**
 * Komponen ini Ephemeral: dirender hanya saat ingin mencatat (parent me-mount
 * dengan kondisional), sehingga draf selalu terinisialisasi dari catatan
 * terkini tanpa perlu efek samping.
 */
export function PrayerRecordDialog({
  onClose,
  meta,
  date,
  isJumat,
  detail,
  onSave,
}: {
  onClose: () => void;
  meta: PrayerMeta;
  date: string;
  isJumat: boolean;
  detail: PrayerDetail;
  /** `opts.addToQada` = pengguna memilih memasukkan salat ini ke daftar qada. */
  onSave: (detail: PrayerDetail | null, opts?: { addToQada?: boolean }) => void;
}) {
  const fullName = meta.fullName ?? `Salat ${meta.label}`;
  const [status, setStatus] = useState<PrayerStatus>(detail.status);
  const [kind, setKind] = useState<PrayerKind | undefined>(detail.kind);
  const [reason, setReason] = useState(detail.reason);
  const [reasonText, setReasonText] = useState(detail.reasonText ?? "");
  const [addToQada, setAddToQada] = useState(false);

  const save = () => {
    if (status === "done") {
      // Salat Jumat wajib berjamaah — tidak ada pilihan mandiri.
      const finalKind: PrayerKind | undefined = isJumat ? "berjamaah" : kind;
      if (!finalKind) return;
      onSave({ status: "done", kind: finalKind });
    } else if (status === "missed") {
      if (!reason) return;
      onSave(
        {
          status: "missed",
          reason,
          reasonText: reason === "lainnya" ? reasonText.trim() || undefined : undefined,
        },
        { addToQada }
      );
    } else {
      onSave(null); // belum dicatat, hapus detail
    }
    onClose();
  };

  const canSave =
    status === "none" ||
    (status === "done" && (isJumat || kind !== undefined)) ||
    (status === "missed" && reason !== undefined);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="glass-strong fixed! top-auto bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 translate-y-0 gap-3 overflow-y-auto rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_-12px_rgba(25,25,35,0.5)] duration-250 thin-scrollbar data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8"
      >
        {/* Pegangan sheet */}
        <span aria-hidden className="mx-auto mb-0.5 block h-1 w-10 shrink-0 rounded-full bg-tk-line-strong/70" />

        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-[-0.01em] text-tk-ink">Catat {fullName}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-[11.5px] text-tk-muted">
            <CalendarDays size={12} className="text-tk-violet" />
            {formatDayFull(date)}
          </DialogDescription>
        </DialogHeader>

        {/* ---------- Status ---------- */}
        <div className="space-y-2" role="radiogroup" aria-label={`Status ${fullName}`}>
          {STATUS_OPTIONS.map(({ id, label, caption, icon: Icon }) => {
            const active = status === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setStatus(id);
                  if (id === "done" && isJumat) setKind("berjamaah");
                  if (id !== "missed") setReason(undefined);
                }}
                className={cn(
                  "tap flex w-full items-center gap-3 rounded-[1.1rem] border p-3 text-left transition-all",
                  active
                    ? "border-tk-violet/50 bg-tk-lavender/50 dark:bg-tk-accent/10"
                    : "border-tk-line bg-tk-panel-soft hover:border-tk-violet/35"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    active ? "bg-tk-violet text-white" : "border border-tk-line bg-tk-panel text-tk-muted"
                  )}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-tk-ink">{label}</span>
                  <span className="block text-[11px] text-tk-muted">{caption}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-all",
                    active ? "border-tk-violet" : "border-tk-line-strong"
                  )}
                >
                  {active ? <span className="h-2 w-2 rounded-full bg-tk-violet" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- Jenis pelaksanaan (sudah dilaksanakan) ---------- */}
        {status === "done" ? (
          <div className="rounded-[1.1rem] border border-tk-line bg-tk-panel-soft p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-tk-muted">Jenis pelaksanaan</p>
            {isJumat ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-tk-violet/40 bg-tk-lavender/50 px-3 py-2.5 dark:bg-tk-accent/10">
                <Users size={16} className="shrink-0 text-tk-violet dark:text-tk-accent" />
                <div>
                  <p className="text-[12.5px] font-semibold text-tk-ink">Salat berjamaah</p>
                  <p className="text-[10.5px] text-tk-muted">Salat Jumat dilaksanakan berjamaah di masjid</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis pelaksanaan salat">
                {(
                  [
                    { id: "mandiri", label: "Salat sendiri", caption: "Mandiri", icon: User },
                    { id: "berjamaah", label: "Berjamaah", caption: "Di masjid / musala", icon: Users },
                  ] as { id: PrayerKind; label: string; caption: string; icon: typeof User }[]
                ).map(({ id, label, caption, icon: Icon }) => {
                  const active = kind === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setKind(id)}
                      className={cn(
                        "tap flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all",
                        active
                          ? "border-tk-violet/60 bg-tk-lavender/50 text-tk-ink dark:bg-tk-accent/10"
                          : "border-tk-line bg-tk-panel-strong text-tk-muted hover:border-tk-violet/35"
                      )}
                    >
                      <Icon size={17} className={active ? "text-tk-violet dark:text-tk-accent" : "text-tk-muted"} />
                      <span className="text-[12px] font-semibold">{label}</span>
                      <span className="text-[10px] text-tk-muted">{caption}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* ---------- Alasan (tidak dilaksanakan) ---------- */}
        {status === "missed" ? (
          <div className="rounded-[1.1rem] border border-tk-line bg-tk-panel-soft p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-tk-muted">Alasan</p>
            <p className="mb-2.5 text-[10.5px] leading-relaxed text-tk-muted">
              Catatan ini hanya untuk introspeksi dan evaluasi kebiasaan, bukan untuk menyalahkan diri sendiri.
            </p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Alasan tidak melaksanakan salat">
              {MISS_REASONS.map((r) => {
                const active = reason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setReason(active ? undefined : r.id)}
                    className={cn(
                      "tap rounded-xl border px-2.5 py-2 text-left text-[11.5px] font-medium leading-snug transition-all",
                      active
                        ? "border-tk-violet/60 bg-tk-lavender/50 text-tk-ink dark:bg-tk-accent/10"
                        : "border-tk-line bg-tk-panel-strong text-tk-muted hover:border-tk-violet/35"
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {reason === "lainnya" ? (
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                maxLength={140}
                rows={2}
                placeholder="Tuliskan alasan lainnya (opsional)"
                aria-label="Alasan lainnya (opsional)"
                className="tk-field mt-2 resize-none"
              />
            ) : null}

            {/* Tawaran lembut memasukkan salat ini ke daftar qada, murni pilihan pengguna. */}
            <button
              type="button"
              role="checkbox"
              aria-checked={addToQada}
              onClick={() => setAddToQada((v) => !v)}
              className={cn(
                "tap mt-2.5 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                addToQada ? "border-tk-violet/60 bg-tk-lavender/50 dark:bg-tk-accent/10" : "border-tk-line bg-tk-panel-strong"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-all",
                  addToQada ? "border-tk-ink gs-ink-btn" : "border-tk-line-strong text-transparent"
                )}
              >
                <Check size={12} strokeWidth={3.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-tk-ink">Masukkan ke daftar Qada</span>
                <span className="block text-[10.5px] leading-relaxed text-tk-muted">
                  Tidak apa-apa, selalu ada kesempatan untuk memperbaiki diri.
                </span>
              </span>
            </button>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            className="tap min-h-[44px] flex-1 rounded-full border border-tk-line-strong bg-tk-panel-soft px-4 text-sm font-semibold text-tk-muted"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={save}
            className={cn(
              "tap gs-ink-btn min-h-[44px] flex-1 rounded-full px-4 font-display text-sm font-bold transition-all",
              !canSave && "cursor-not-allowed opacity-40"
            )}
          >
            Simpan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
