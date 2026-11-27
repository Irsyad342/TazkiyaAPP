"use client";

/**
 * Tazkiya — "Waktu-Waktu Penting" (pelengkap jadwal salat utama, bukan pengganti):
 * Imsak · Terbit · Duha · Tahajud dalam SATU card ringkas 2×2 (lg: 4 kolom).
 * - Seluruh angka dari sumber hitung yang SAMA dengan jadwal utama
 *   (lib/tazkiya/sunnahTimes → resolvePrayerSchedule + computePrayerTimes).
 * - Terbit & Duha butuh koordinat GPS: bila tidak ada, tampil "—· butuh lokasi"
 *   (jujur, bukan angka karangan) dan item bisa diketuk untuk mengaktifkan lokasi.
 * - Gaya SUIO: wadah & judul memakai token tema, tetapi KEEMPAT tile warnanya
 *   TETAP (kelas .wp-* di globals.css — palet dedicated di luar token tema):
 *   identik pada semua tema sesuai suasana waktunya (malam/terbit/siang/malam dalam).
 */

import { useMemo, useState } from "react";
import { MoonStar, Moon, Sun, Sunrise } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { computeSunnahTimes } from "@/lib/tazkiya/sunnahTimes";
import { ensureAutoGeo } from "@/lib/tazkiya/autoGeo";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  label: string;
  arab: string;
  Icon: typeof Sun;
  time: string | null;
  range: [string | null, string | null];
  /** Item butuh koordinat GPS — tak tersedia bila lokasi belum aktif. */
  needsGeo: boolean;
};

export function WaktuPentingCard({ today }: { today: string }) {
  const settings = useWorshipStore((s) => s.settings);
  const [busy, setBusy] = useState(false);

  const t = useMemo(() => computeSunnahTimes(settings, today), [settings, today]);

  const rows: Row[] = [
    { id: "imsak", label: "Imsak", arab: "الإمساك", Icon: MoonStar, time: t.imsak, range: [null, null], needsGeo: false },
    { id: "terbit", label: "Terbit", arab: "الشروق", Icon: Sunrise, time: t.terbit, range: [null, null], needsGeo: true },
    { id: "duha", label: "Duha", arab: "الضحى", Icon: Sun, time: null, range: [t.duhaStart, t.duhaEnd], needsGeo: true },
    { id: "tahajud", label: "Tahajud", arab: "التهجد", Icon: Moon, time: null, range: [t.tahajudStart, t.tahajudEnd], needsGeo: false },
  ];

  const activateGeo = async () => {
    if (busy) return;
    setBusy(true);
    await ensureAutoGeo("retry");
    setBusy(false);
  };

  return (
    <section aria-label="Waktu-waktu penting hari ini">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Waktu-Waktu Penting</h2>
        <span className="shrink-0 text-[10.5px] font-medium text-tk-muted">Pelengkap jadwal salat</span>
      </div>

      <div className="rounded-[1.4rem] border border-tk-line-soft bg-tk-panel su-card-shadow p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="group" aria-label="Imsak, Terbit, Duha, Tahajud">
          {rows.map(({ id, label, arab, Icon, time, range, needsGeo }) => {
            const missing = time == null && range[0] == null;
            return (
              <button
                key={id}
                type="button"
                onClick={missing ? activateGeo : undefined}
                aria-label={
                  missing
                    ? `${label}: membutuhkan lokasi. Ketuk untuk mengaktifkan lokasi otomatis.`
                    : `${label}: ${time ?? `${range[0]} hingga ${range[1]}`}`
                }
                className={cn(
                  // Palet tetap per suasana waktu (wp-imsak/terbit/duha/tahajud)
                  // — sengaja TIDAK memakai token tema agar identik di semua tema.
                  "wp-tile tap wp-" + id + " flex items-center gap-2.5 rounded-[1.05rem] px-3 py-2.5 text-left",
                  missing ? "cursor-pointer" : "cursor-default"
                )}
              >
                <span aria-hidden className="wp-ico flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Icon size={15} strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="wp-name truncate text-[12px] font-bold">{label}</span>
                    <span aria-hidden className="wp-arab quran-arabic shrink-0 text-[10px] leading-none">{arab}</span>
                  </span>
                  {missing ? (
                    <span className="wp-note mt-0.5 block text-[10px] font-semibold">butuh lokasi</span>
                  ) : range[0] != null && range[1] != null ? (
                    <span className="wp-time tnum mt-0.5 block text-[11.5px] font-semibold">
                      {range[0]} – {range[1]}
                    </span>
                  ) : (
                    <span className="wp-time tnum mt-0.5 block text-[11.5px] font-semibold">{time}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[9.5px] leading-relaxed text-tk-deep">
          Imsak 10 menit sebelum Subuh · Duha ±20 menit setelah Terbit hingga Zuhur · Tahajud sepertiga malam terakhir hingga Subuh
        </p>
      </div>
    </section>
  );
}
