"use client";

/**
 * Tazkiya — "Asmaul Husna Hari Ini": satu nama Allah sebagai refleksi harian.
 * - Nama berganti berdasarkan tanggal LOKAL (lib/tazkiya/asmaulHusna) — konsisten
 *   sepanjang hari, tahan refresh, sebaran merata 1..99.
 * - Aksi: Salin (clipboard), Hafalan (tandai sudah hafal — tersimpan di
 *   settings.asmaulHafalan), Lihat semua (sheet daftar 99 + progres hafalan).
 * - Gaya SUIO: card netral token tema, tipografi Arab quran-arabic, aksen
 *   ornamen octagram halus — TANPA background lime besar / pattern meniru referensi.
 */

import { useMemo, useState } from "react";
import { BadgeCheck, Copy, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { ASMAUL_HUSNA, asmaulHusnaForDate } from "@/lib/tazkiya/asmaulHusna";
import { cn } from "@/lib/utils";

export function AsmaulHusnaCard({ today }: { today: string }) {
  const settings = useWorshipStore((s) => s.settings);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const [sheetOpen, setSheetOpen] = useState(false);

  const nama = useMemo(() => asmaulHusnaForDate(today), [today]);
  const hafalan = useMemo(() => new Set(settings.asmaulHafalan ?? []), [settings.asmaulHafalan]);
  const hafalCount = hafalan.size;
  const isHafal = hafalan.has(nama.n);

  const toggleHafal = (n: number, label: string) => {
    const next = new Set(settings.asmaulHafalan ?? []);
    if (next.has(n)) {
      next.delete(n);
      toast.info(`"${label}" ditandai belum hafal`);
    } else {
      next.add(n);
      toast.success(`MasyaAllah, "${label}" ditandai hafal`);
    }
    updateSettings({ asmaulHafalan: [...next].sort((a, b) => a - b) });
  };

  const copy = async () => {
    const text = `${nama.arab} — ${nama.latin} (${nama.arti}) · Nama ke-${nama.n} dari 99`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Nama Asmaul Husna disalin");
    } catch {
      toast.info("Peramban tidak mengizinkan akses clipboard");
    }
  };

  return (
    <section aria-label="Asmaul Husna hari ini">
      <div className="tk-card-white su-card-shadow relative overflow-hidden rounded-[1.4rem] border border-tk-line-soft p-4.5">
        {/* Ornamen octagram halus di pojok — satu sumber dengan Daily Barakah */}
        <span aria-hidden className="tk-octagram pointer-events-none absolute -right-7 -top-7 h-24 w-24 bg-[var(--tk-brand-soft)]/12" />

        <div className="relative flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--tk-dua-label)]">Asmaul Husna Hari Ini</p>
          <span className="tnum shrink-0 rounded-full bg-tk-panel px-2 py-0.5 text-[9px] font-bold text-tk-deep">
            ke-{nama.n} dari 99
          </span>
        </div>

        <p className="quran-arabic relative mt-3 text-center text-[34px] leading-[1.7] text-tk-ink">{nama.arab}</p>
        <p className="relative mt-1 text-center text-[15px] font-bold tracking-[-0.01em] text-tk-ink">{nama.latin}</p>
        <p className="relative mt-0.5 text-center text-[12.5px] text-tk-muted">{nama.arti}</p>

        {/* Aksi: tiga tombol ringkas — tidak memenuhi card */}
        <div className="relative mt-3.5 flex items-center gap-2 border-t border-tk-line-soft pt-3">
          <button
            type="button"
            onClick={copy}
            aria-label={`Salin ${nama.latin} beserta artinya`}
            className="tap flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-tk-panel-soft px-2 py-2 text-[11px] font-bold text-tk-ink transition-colors hover:bg-tk-panel-strong"
          >
            <Copy size={12} className="shrink-0" /> Salin
          </button>
          <button
            type="button"
            onClick={() => toggleHafal(nama.n, nama.latin)}
            aria-pressed={isHafal}
            aria-label={`${isHafal ? "Batalkan tanda" : "Tandai"} ${nama.latin} sudah hafal`}
            className={cn(
              "tap flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 py-2 text-[11px] font-bold transition-colors",
              isHafal ? "bg-[var(--tk-brand)] text-white" : "bg-tk-panel-soft text-tk-ink hover:bg-tk-panel-strong"
            )}
          >
            <BadgeCheck size={12} className="shrink-0" /> Hafalan
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Lihat semua 99 nama Asmaul Husna"
            className="tap flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full bg-tk-panel-soft px-2 py-2 text-[11px] font-bold text-tk-ink transition-colors hover:bg-tk-panel-strong"
          >
            Lihat semua <ChevronRight size={12} className="shrink-0" />
          </button>
        </div>
      </div>

      {sheetOpen ? (
        <Dialog open onOpenChange={(v) => !v && setSheetOpen(false)}>
          <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            className="glass-strong fixed! top-auto bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 translate-y-0 gap-3 overflow-hidden rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_-12px_rgba(15,15,20,0.55)] duration-250 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8"
          >
            <span aria-hidden className="mx-auto mb-0.5 block h-1 w-10 shrink-0 rounded-full bg-tk-line-strong/70" />
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-tk-ink">Asmaul Husna</DialogTitle>
            </DialogHeader>
            <p className="-mt-2 text-[11px] font-semibold text-tk-muted">
              <span className="tnum">{hafalCount}</span> dari 99 nama ditandai hafal — ketuk centang untuk menandai
            </p>
            <ul className="thin-scrollbar max-h-[52vh] divide-y divide-tk-line-soft overflow-y-auto" role="list">
              {ASMAUL_HUSNA.map((e) => {
                const hafal = hafalan.has(e.n);
                return (
                  <li key={e.n} className="flex items-center gap-3 py-2">
                    <span
                      aria-hidden
                      className={cn(
                        "gs-display tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold",
                        hafal ? "bg-[var(--tk-brand)] text-white" : "bg-tk-panel-strong text-tk-deep"
                      )}
                    >
                      {e.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold text-tk-ink">{e.latin}</span>
                      <span className="block truncate text-[10.5px] text-tk-muted">{e.arti}</span>
                    </span>
                    <span aria-hidden className="quran-arabic shrink-0 text-[17px] text-tk-ink/85">{e.arab}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hafal}
                      aria-label={`${e.latin} ${hafal ? "sudah hafal" : "belum hafal"}`}
                      onClick={() => toggleHafal(e.n, e.latin)}
                      className={cn(
                        "tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                        hafal ? "bg-[var(--tk-brand)]/15 text-[var(--tk-brand)]" : "bg-tk-ink/8 text-transparent hover:bg-tk-ink/14"
                      )}
                    >
                      <BadgeCheck size={14} strokeWidth={2.6} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="tap min-h-[42px] w-full rounded-full bg-tk-panel-strong px-4 text-sm font-bold text-tk-ink"
            >
              Tutup
            </button>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
