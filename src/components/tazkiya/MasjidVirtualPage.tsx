"use client";

/**
 * Tazkiya — Halaman "Masjid Virtual" (subpage layar penuh).
 * Chrome: Keluar (kiri-atas), pill salat berikutnya (kanan-atas), petunjuk,
 * dan kontrol bawah: Reset pandang + Hadap Kibla (aktif bila koordinat ada).
 * Scene three.js di-dynamic-import (ssr:false) — TIDAK pernah dimuat dari
 * Beranda; WebGL gagal → panel fallback jujur (bukan pura-pura 3D).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, RotateCcw, Compass, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { formatCountdown, nextPrayerState } from "@/lib/tazkiya/goals";
import { prayerLabelForDate } from "@/lib/tazkiya/friday";
import { qiblaBearingRad } from "@/lib/tazkiya/qibla";
import { cn } from "@/lib/utils";

/** Handle scene — struktur identik dengan MasjidSceneHandle (tanpa memuat three). */
interface SceneHandle {
  reset: () => void;
  faceQibla: () => void;
}

/* Scene three.js hanya diunduh ketika halaman ini benar-benar dibuka. */
const MasjidScene = dynamic(() => import("./MasjidScene").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-2 rounded-full bg-tk-panel px-4 py-2.5 text-[12px] font-semibold text-tk-ink shadow-lg">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--tk-brand)] border-t-transparent" />
        Menyiapkan ruangan…
      </div>
    </div>
  ),
});

export function MasjidVirtualPage({ onBack }: { onBack: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const sceneRef = useRef<SceneHandle>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(iv);
  }, []);

  const today = useMemo(() => {
    const d = now;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [now]);

  const schedule = useMemo(() => resolvePrayerSchedule(settings, today), [settings, today]);
  const state = useMemo(() => nextPrayerState(schedule, now), [schedule, now]);
  const nextLabel = prayerLabelForDate(state.next, today);

  /** Yaw kibla = -bearing (kamera -Z memandang utara saat yaw 0). */
  const qiblaYaw = useMemo(() => {
    if (!settings.geo) return null;
    return -qiblaBearingRad(settings.geo.lat, settings.geo.lng);
  }, [settings.geo]);

  const hasGeo = !!settings.geo;

  const faceQibla = () => {
    if (!hasGeo) {
      toast.info("Aktifkan lokasi otomatis dulu — arah kibla dihitung dari koordinat GPS");
      return;
    }
    sceneRef.current?.faceQibla();
    toast.success("Menghadap kibla");
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--tk-canvas-bg)]" role="dialog" aria-label="Tur masjid virtual">
      {/* Scene — memenuhi layar */}
      <div className="absolute inset-0">
        {webglFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-tk-panel-strong text-tk-muted">
              <ImageOff size={24} />
            </span>
            <p className="text-[15px] font-bold text-tk-ink">Tur 3D tidak tersedia</p>
            <p className="max-w-[300px] text-[12.5px] leading-relaxed text-tk-muted">
              Perangkat atau peramban ini belum mendukung WebGL. Coba dari aplikasi peramban lain atau perangkat yang lebih baru.
            </p>
          </div>
        ) : (
          <MasjidScene ref={sceneRef} onFail={() => setWebglFailed(true)} qiblaYaw={qiblaYaw} />
        )}
      </div>

      {/* Header: Keluar + salat berikutnya */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Keluar dari tur masjid virtual"
          className="tap pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-[12.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <ArrowLeft size={14} /> Keluar
        </button>
        <div className="pointer-events-auto rounded-2xl bg-black/55 px-3.5 py-2 text-right text-white backdrop-blur-sm">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-white/70">Sholat Berikutnya</p>
          <p className="tnum text-[13px] font-bold leading-tight">
            {nextLabel} <span className="text-[var(--tk-brand-soft)]">{state.nextTime}</span>
          </p>
          <p className="tnum text-[9.5px] text-white/70">{formatCountdown(state.secondsLeft)} lagi</p>
        </div>
      </div>

      {/* Petunjuk sederhana */}
      <p className="pointer-events-none absolute inset-x-0 top-[68px] mx-auto w-fit max-w-[86%] rounded-full bg-black/45 px-3.5 py-1.5 text-center text-[10px] font-semibold text-white/90 backdrop-blur-sm">
        Geser untuk melihat sekeliling · ketuk dua kali untuk menghadap kibla
      </p>

      {/* Kontrol bawah: Reset + Hadap Kibla */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => sceneRef.current?.reset()}
          aria-label="Kembalikan sudut pandang ke awal"
          className="tap flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <RotateCcw size={17} />
        </button>
        <button
          type="button"
          onClick={faceQibla}
          aria-label="Menghadap kibla"
          className={cn(
            "tap flex items-center gap-1.5 rounded-full px-4.5 py-2.5 text-[12.5px] font-bold backdrop-blur-sm transition-colors",
            hasGeo ? "bg-[var(--tk-brand)] text-white hover:brightness-105" : "bg-black/55 text-white/85 hover:bg-black/70"
          )}
        >
          <Compass size={15} /> Hadap Kibla
        </button>
      </div>
    </div>
  );
}
