"use client";

/**
 * Tazkiya — Sheet rincian satu tanggal (dipakai bersama halaman Sholat &
 * Progress): salat wajib per slot, bacaan, dan zikir dari data asli.
 */

import { BookOpen, CalendarDays, CircleDot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorshipStore } from "@/lib/tazkiya/store";
import {
  PRAYERS,
  SALAT_JUMAT,
  ZUHUR_ALTERNATIF,
  missReasonLabel,
  selectPrayerDetail,
  type PrayerId,
} from "@/lib/tazkiya/types";
import { formatDayFull, relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { cn } from "@/lib/utils";

/** Meta salat sesuai slot pada tanggal tertentu (Jumat → Salat Jumat). */
export function prayerMetaFor(date: string, id: PrayerId, fridayAlt: boolean) {
  if (id === "zuhur" && !fridayAlt) return SALAT_JUMAT;
  if (id === "zuhur" && fridayAlt) return ZUHUR_ALTERNATIF;
  return PRAYERS.find((p) => p.id === id) ?? PRAYERS[0];
}

export function DayDetailSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const fridayZuhurAlt = useWorshipStore((s) => s.fridayZuhurAlt);
  const journal = useWorshipStore((s) => s.journal);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const today = todayKey();
  const log = logs[date];
  const hasLog = !!log;
  const hasDetails = !!prayerDetails[date];
  const entry = journal[date];
  const amalToday = amalEntries.filter((a) => a.date === date).length;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="glass-strong fixed! top-auto bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 translate-y-0 gap-3 overflow-y-auto rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_-12px_rgba(25,25,35,0.5)] duration-250 thin-scrollbar data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8"
      >
        <span aria-hidden className="mx-auto mb-0.5 block h-1 w-10 shrink-0 rounded-full bg-tk-line-strong/70" />
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-tk-ink">Rincian {relativeDayLabel(date, today)}</DialogTitle>
          <p className="flex items-center gap-1.5 text-[11.5px] text-tk-muted">
            <CalendarDays size={12} className="text-tk-violet dark:text-tk-accent" />
            {formatDayFull(date)}
          </p>
        </DialogHeader>

        {!hasLog && !hasDetails ? (
          <p className="rounded-2xl border border-tk-line bg-tk-panel-soft p-4 text-center text-[12px] leading-relaxed text-tk-muted">
            Belum ada catatan aktivitas pada tanggal ini.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-tk-muted">Salat wajib</p>
              {PRAYERS.map((p) => {
                const meta = prayerMetaFor(date, p.id, !!fridayZuhurAlt?.[date]);
                const d = selectPrayerDetail(prayerDetails, logs, date, p.id);
                const statusText =
                  d.status === "done"
                    ? d.kind === "berjamaah"
                      ? "Dilaksanakan, berjamaah"
                      : d.kind === "mandiri"
                        ? "Dilaksanakan, mandiri"
                        : "Dilaksanakan"
                    : d.status === "missed"
                      ? `Tidak dilaksanakan${d.reason ? `, ${missReasonLabel(d.reason)}` : ""}${
                          d.reason === "lainnya" && d.reasonText ? `: ${d.reasonText}` : ""
                        }`
                      : "Belum dicatat";
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-tk-line bg-tk-panel-soft px-3 py-2"
                  >
                    <p className="min-w-0 truncate text-[12px] font-semibold text-tk-ink">{meta.label}</p>
                    <p
                      className={cn(
                        "shrink-0 text-right text-[10.5px]",
                        d.status === "done"
                          ? "text-tk-violet dark:text-tk-accent"
                          : d.status === "missed"
                            ? "text-[#B3424C] dark:text-[#F09AA0]"
                            : "text-tk-muted/70"
                      )}
                    >
                      {statusText}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-tk-line bg-tk-panel-soft p-2.5">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tk-muted">
                  <BookOpen size={12} className="text-tk-violet" /> Bacaan Al-Qur&apos;an
                </p>
                <p className="mt-1 text-[12px] font-semibold text-tk-ink">
                  {log && (log.quranPages > 0 || log.quranVerses > 0)
                    ? `${log.quranPages.toLocaleString("id-ID")} halaman · ${log.quranVerses.toLocaleString("id-ID")} ayat`
                    : "Belum ada catatan"}
                </p>
              </div>
              <div className="rounded-xl border border-tk-line bg-tk-panel-soft p-2.5">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tk-muted">
                  <CircleDot size={12} className="text-tk-violet" /> Zikir
                </p>
                <p className="mt-1 text-[12px] font-semibold text-tk-ink">
                  {log && log.zikirCount > 0 ? `${log.zikirCount.toLocaleString("id-ID")} hitungan` : "Belum ada catatan"}
                </p>
              </div>
            </div>
            {entry ? (
              <div className="rounded-xl border border-tk-line bg-tk-panel-soft p-2.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-tk-muted">Jurnal Syukur</p>
                <ul className="mt-1 space-y-0.5">
                  {entry.items.filter(Boolean).map((it, i) => (
                    <li key={i} className="text-[11.5px] leading-relaxed text-tk-ink/90">
                      • {it}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {amalToday > 0 ? (
              <div className="rounded-xl border border-tk-line bg-tk-panel-soft p-2.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-tk-muted">Rizq &amp; Amal</p>
                <p className="mt-1 text-[12px] font-semibold text-tk-ink">{amalToday} kebaikan tercatat</p>
              </div>
            ) : null}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="tap mt-1 min-h-[42px] w-full rounded-xl border border-tk-line bg-tk-panel-soft px-4 text-sm font-semibold text-tk-muted"
        >
          Tutup
        </button>
      </DialogContent>
    </Dialog>
  );
}
