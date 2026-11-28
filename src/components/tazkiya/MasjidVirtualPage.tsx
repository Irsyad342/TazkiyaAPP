"use client";

/**
 * Tazkiya — Halaman "Masjid Virtual" (subpage layar penuh) v2.1.
 * DIRENDER via createPortal(document.body) — di luar motion-div induk yang
 * ber-transform, agar `fixed inset-0 z-50` benar-benar fullscreen dan menutupi
 * BottomNav (z-30) — sebelumnya nav menutupi tombol Masuk Masjid.
 *
 * Tiga tahap: EKSTERIOR (tombol "Masuk Masjid" menempel di area pintu, tanpa
 * teks instruksi; ketuk pintu pun masuk) → INTRO sinematik (indikator
 * "Memasuki masjid…" + Lewati) → EKSPLORASI (kontrol minimalis Reset · Kibla ·
 * Zikir). Panel Sholat Berikutnya compact di kanan-atas, seimbang dgn Keluar.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { ArrowLeft, RotateCcw, Compass, ImageOff, DoorOpen, FastForward, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { formatCountdown, nextPrayerState } from "@/lib/tazkiya/goals";
import { prayerLabelForDate } from "@/lib/tazkiya/friday";
import { qiblaBearingRad } from "@/lib/tazkiya/qibla";
import { cn } from "@/lib/utils";
import type { TourStage } from "./MasjidScene";

/** Handle scene — struktur identik dengan MasjidSceneHandle (tanpa memuat three). */
interface SceneHandle {
  reset: () => void;
  faceQibla: () => void;
  playIntro: () => void;
  skipIntro: () => void;
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

const subscribeNoop = () => () => {};

export function MasjidVirtualPage({ onBack, onOpenZikir }: { onBack: () => void; onOpenZikir?: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const sceneRef = useRef<SceneHandle>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [stage, setStage] = useState<TourStage>("exterior");
  const [now, setNow] = useState(() => new Date());

  /** false saat SSR/hidrasi pertama — portal hanya setelah dokumen siap. */
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

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

  /** QA atmosfer: ?qa-time=14 → jam 14:00 (produksi: selalu jam lokal nyata). */
  const timeOverride = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const raw = new URLSearchParams(window.location.search).get("qa-time");
    if (!raw) return undefined;
    const h = parseFloat(raw);
    return Number.isFinite(h) && h >= 0 && h <= 24 ? h : undefined;
  }, []);

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

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#0e1533]" role="dialog" aria-label="Tur masjid virtual">
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
          <MasjidScene
            ref={sceneRef}
            onFail={() => setWebglFailed(true)}
            qiblaYaw={qiblaYaw}
            timeOverride={timeOverride}
            onStage={setStage}
          />
        )}
      </div>

      {/* vignette sinematik halus */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 62%, rgba(8,10,22,0.42) 100%)" }}
      />

      {/* Header: Keluar (compact) + panel salat berikutnya (compact) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Keluar dari tur masjid virtual"
          className="tap pointer-events-auto flex h-9 items-center gap-1.5 rounded-full bg-black/50 px-3.5 text-[12px] font-bold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/65 active:scale-95"
        >
          <ArrowLeft size={14} /> Keluar
        </button>
        <div className="pointer-events-auto rounded-2xl bg-black/50 px-3 py-1.5 text-right shadow-lg backdrop-blur-md">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/55">Sholat Berikutnya</p>
          <p className="tnum text-[13px] font-bold leading-snug text-white">
            {nextLabel} <span className="text-[var(--tk-brand-soft)]">{state.nextTime}</span>
          </p>
          <p className="tnum text-[9px] leading-tight text-white/55">{formatCountdown(state.secondsLeft)} lagi</p>
        </div>
      </div>

      {/* Indikator intro kecil + Lewati (hanya saat animasi berjalan) */}
      {stage === "intro" ? (
        <>
          <p className="pointer-events-none absolute inset-x-0 top-[64px] mx-auto w-fit rounded-full bg-black/45 px-3 py-1 text-center text-[10px] font-semibold text-white/85 backdrop-blur-sm">
            Memasuki masjid…
          </p>
          <button
            type="button"
            onClick={() => sceneRef.current?.skipIntro()}
            className="tap absolute bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-4 py-2 text-[11.5px] font-bold text-white backdrop-blur-md transition-colors hover:bg-black/70 active:scale-95"
          >
            <FastForward size={13} /> Lewati
          </button>
        </>
      ) : null}

      {/* Hint singkat hanya di eksplorasi */}
      {stage === "explore" ? (
        <p className="pointer-events-none absolute inset-x-0 top-[60px] mx-auto w-fit max-w-[78%] rounded-full bg-black/40 px-3 py-1 text-center text-[9.5px] font-semibold text-white/80 backdrop-blur-sm">
          Geser untuk melihat · cubit untuk zoom · ketuk 2× menghadap kibla
        </p>
      ) : null}

      {/* Tombol Masuk Masjid — menempel di area pintu (bawah tengah komposisi pintu) */}
      {stage === "exterior" ? (
        <div className="absolute inset-x-0 top-[61%] z-10 flex flex-col items-center">
          <button
            type="button"
            onClick={() => sceneRef.current?.playIntro()}
            className="tap group relative flex items-center gap-2 rounded-full bg-[var(--tk-brand)] px-7 py-3.5 text-[14px] font-bold text-white shadow-2xl ring-1 ring-white/25 transition-transform hover:brightness-105 active:scale-95"
          >
            <span aria-hidden className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[var(--tk-brand)] opacity-30 blur-md" />
            <DoorOpen size={17} /> Masuk Masjid
          </button>
          <p className="mt-2 text-[10px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
            atau ketuk pintunya langsung
          </p>
        </div>
      ) : null}

      {/* Kontrol eksplorasi — panel mengambang minimalis (muncul hanya di interior) */}
      {stage === "explore" ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1.1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 p-1.5 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => sceneRef.current?.reset()}
              aria-label="Kembalikan sudut pandang ke arah mihrab"
              className="tap flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 active:scale-90"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={faceQibla}
              aria-label="Menghadap kibla"
              className={cn(
                "tap flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-bold transition-colors active:scale-95",
                hasGeo ? "bg-[var(--tk-brand)] text-white hover:brightness-105" : "bg-white/10 text-white/85 hover:bg-white/20"
              )}
            >
              <Compass size={14} /> Kiblat
            </button>
            <button
              type="button"
              onClick={onOpenZikir}
              aria-label="Buka Zikir dan Doa"
              className="tap flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-white/20 active:scale-95"
            >
              <BookOpen size={14} /> Zikir
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
