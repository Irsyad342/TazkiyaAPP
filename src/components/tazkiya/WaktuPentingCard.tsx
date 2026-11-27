"use client";

/**
 * Tazkiya — "Waktu-Waktu Penting" (pelengkap jadwal salat utama, bukan pengganti):
 * Imsak · Terbit · Duha · Tahajud sebagai KARTU PEMANDANGAN full-bleed.
 * - Mobile: carousel horizontal scroll-snap (kartu ±88vw, kartu berikutnya mengintip,
 *   dots + hitungan 1/4 + petunjuk geser). lg (desktop/tablet): grid 2 kolom besar.
 * - Seluruh angka dari sumber hitung yang SAMA dengan jadwal utama
 *   (lib/tazkiya/sunnahTimes → computeSunnahTimes) — logika waktu TIDAK diubah.
 * - Terbit & Duha butuh koordinat GPS: bila tidak ada, tampil "butuh lokasi"
 *   (jujur, bukan angka karangan) dan kartu bisa diketuk untuk mengaktifkan lokasi.
 * - Identitas visual TETAP per suasana waktu: ilustrasi SVG inline (WaktuScenes.tsx)
 *   + kelas .wp-* di globals.css, sengaja di luar token tema agar identik di semua tema.
 */

import { useMemo, useRef, useState } from "react";
import { MoonStar, Moon, Sun, Sunrise, MoveHorizontal } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { computeSunnahTimes } from "@/lib/tazkiya/sunnahTimes";
import { ensureAutoGeo } from "@/lib/tazkiya/autoGeo";
import { cn } from "@/lib/utils";
import { SceneImsak, SceneTerbit, SceneDuha, SceneTahajud } from "./WaktuScenes";

/** Jarak antarkartu carousel (harus = gap-3 pada rail). */
const GAP = 12;

type Row = {
  id: string;
  label: string;
  arab: string;
  caption: string;
  desc: string;
  Scene: () => React.ReactElement;
  Icon: typeof Sun;
  time: string | null;
  range: [string | null, string | null];
  /** Kartu butuh koordinat GPS — tak tersedia bila lokasi belum aktif. */
  needsGeo: boolean;
};

export function WaktuPentingCard({ today }: { today: string }) {
  const settings = useWorshipStore((s) => s.settings);
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const [nudged, setNudged] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => computeSunnahTimes(settings, today), [settings, today]);

  const rows: Row[] = [
    {
      id: "imsak", label: "Imsak", arab: "الإمساك", caption: "Dini hari",
      desc: "Batas mulai puasa · 10 menit sebelum Subuh",
      Scene: SceneImsak, Icon: MoonStar, time: t.imsak, range: [null, null], needsGeo: false,
    },
    {
      id: "terbit", label: "Terbit", arab: "الشروق", caption: "Matahari terbit",
      desc: "Piringan matahari muncul di horizon",
      Scene: SceneTerbit, Icon: Sunrise, time: t.terbit, range: [null, null], needsGeo: true,
    },
    {
      id: "duha", label: "Duha", arab: "الضحى", caption: "Pagi cerah",
      desc: "±20 menit setelah Terbit hingga Zuhur",
      Scene: SceneDuha, Icon: Sun, time: null, range: [t.duhaStart, t.duhaEnd], needsGeo: true,
    },
    {
      id: "tahajud", label: "Tahajud", arab: "التهجد", caption: "Sepertiga malam",
      desc: "Sepertiga malam terakhir hingga Subuh",
      Scene: SceneTahajud, Icon: Moon, time: null, range: [t.tahajudStart, t.tahajudEnd], needsGeo: false,
    },
  ];

  const activateGeo = async () => {
    if (busy) return;
    setBusy(true);
    await ensureAutoGeo("retry");
    setBusy(false);
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const next = Math.max(0, Math.min(rows.length - 1, Math.round(el.scrollLeft / (first.offsetWidth + GAP))));
    setIdx(next);
    if (el.scrollLeft > 8) setNudged(true);
  };

  const goTo = (i: number) => {
    const rail = railRef.current;
    const first = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !first) return;
    rail.scrollTo({ left: i * (first.offsetWidth + GAP), behavior: "smooth" });
  };

  return (
    <section aria-label="Waktu-waktu penting hari ini" className="wp-section">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Waktu-Waktu Penting</h2>
        <span className="shrink-0 text-[10.5px] font-medium text-tk-muted">Pelengkap jadwal salat</span>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        className="wp-rail no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [scroll-padding-left:1rem]"
      >
        {rows.map(({ id, label, arab, caption, desc, Scene, Icon, time, range }) => {
          const missing = time == null && range[0] == null;
          const inner = (
            <>
              <Scene />
              <div className="wp-topbar">
                <span className="wp-chip">{caption}</span>
                <span aria-hidden className="wp-ico">
                  <Icon size={13} strokeWidth={2.1} />
                </span>
              </div>
              <div className="wp-body">
                <div className="flex items-baseline gap-2">
                  <span className="wp-name">{label}</span>
                  <span aria-hidden className="wp-arab quran-arabic">{arab}</span>
                </div>
                {missing ? (
                  <span className="wp-time wp-time-missing">butuh lokasi</span>
                ) : range[0] != null && range[1] != null ? (
                  <span className="wp-time">{range[0]} – {range[1]}</span>
                ) : (
                  <span className="wp-time">{time}</span>
                )}
                <p className="wp-desc">{missing ? "Ketuk untuk mengaktifkan lokasi otomatis" : desc}</p>
              </div>
            </>
          );
          const cls = cn("wp-card wp-" + id + " w-[88vw] max-w-[430px] shrink-0 snap-start", missing && "wp-tap tap");
          const aria = missing
            ? `${label}: membutuhkan lokasi. Ketuk untuk mengaktifkan lokasi otomatis.`
            : `${label}: ${time ?? `${range[0]} hingga ${range[1]}`}`;
          return missing ? (
            <button key={id} type="button" onClick={activateGeo} aria-label={aria} className={cls}>
              {inner}
            </button>
          ) : (
            <article key={id} aria-label={aria} className={cls}>
              {inner}
            </article>
          );
        })}
      </div>

      {/* indikator carousel (mobile saja — desktop memakai grid 2 kolom) */}
      <div className="wp-dotbar mt-2 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-1.5">
          {rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              aria-label={`Ke kartu ${i + 1}: ${r.label}`}
              aria-current={i === idx}
              onClick={() => goTo(i)}
              className={cn("wp-dot", i === idx && "wp-dot-on")}
            />
          ))}
        </div>
        {nudged ? (
          <span className="wp-count" aria-label={`Kartu ${idx + 1} dari ${rows.length}`}>
            {idx + 1}/{rows.length}
          </span>
        ) : (
          <span className="wp-hint" aria-hidden>
            <MoveHorizontal size={12} /> Geser
          </span>
        )}
      </div>

      <p className="mt-2 px-1 text-[9.5px] leading-relaxed text-tk-deep">
        Imsak 10 menit sebelum Subuh · Duha ±20 menit setelah Terbit hingga Zuhur · Tahajud sepertiga malam terakhir hingga Subuh
      </p>
    </section>
  );
}
