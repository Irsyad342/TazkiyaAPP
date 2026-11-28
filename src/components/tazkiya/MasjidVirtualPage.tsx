"use client";

/**
 * Tazkiya — Halaman "Masjid Virtual" (subpage layar penuh) v2 sinematik.
 * Alur: EKSTERIOR (tombol "Masuk Masjid") → animasi dolly masuk (dapat
 * dilewati via "Lewati") → INTERIOR eksplorasi (geser/zoom/ketuk 2× kibla).
 * Chrome: Keluar, pill salat berikutnya, petunjuk per tahap, kontrol bawah
 * Reset + Hadap Kibla + Zikir (membuka halaman Zikir & Doa aplikasi).
 * Scene three.js di-dynamic-import (ssr:false) — TIDAK pernah dimuat dari
 * Beranda; WebGL gagal → panel fallback jujur. Query ?qa-time=HH hanya untuk
 * uji atmosfer (produksi memakai jam lokal sungguhan).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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

export function MasjidVirtualPage({ onBack, onOpenZikir }: { onBack: () => void; onOpenZikir?: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const sceneRef = useRef<SceneHandle>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [stage, setStage] = useState<TourStage>("exterior");
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

  const hint =
    stage === "exterior"
      ? "Masjid terlihat dari luar — tekan Masuk Masjid untuk memasuki tur"
      : stage === "intro"
        ? "Memasuki masjid…"
        : "Geser untuk melihat sekeliling · cubit untuk zoom · ketuk dua kali menghadap kibla";

  return (
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

      {/* Petunjuk per tahap */}
      <p className="pointer-events-none absolute inset-x-0 top-[68px] mx-auto w-fit max-w-[86%] rounded-full bg-black/45 px-3.5 py-1.5 text-center text-[10px] font-semibold text-white/90 backdrop-blur-sm">
        {hint}
      </p>

      {/* Tombol Lewati saat animasi masuk */}
      {stage === "intro" ? (
        <button
          type="button"
          onClick={() => sceneRef.current?.skipIntro()}
          className="tap absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 translate-y-[86px] items-center gap-1.5 rounded-full bg-black/60 px-4 py-2 text-[11.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/75"
        >
          <FastForward size={13} /> Lewati
        </button>
      ) : null}

      {/* Tombol Masuk Masjid (eksterior) / Kontrol bawah (eksplorasi) */}
      {stage === "exterior" ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => sceneRef.current?.playIntro()}
            className="tap flex items-center gap-2 rounded-full bg-[var(--tk-brand)] px-6 py-3 text-[13.5px] font-bold text-white shadow-lg transition-transform hover:brightness-105 active:scale-97"
          >
            <DoorOpen size={16} /> Masuk Masjid
          </button>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => sceneRef.current?.reset()}
            aria-label="Kembalikan sudut pandang ke arah mihrab"
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
          <button
            type="button"
            onClick={onOpenZikir}
            aria-label="Buka Zikir dan Doa"
            className="tap flex items-center gap-1.5 rounded-full bg-black/55 px-4 py-2.5 text-[12.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <BookOpen size={15} /> Zikir
          </button>
        </div>
      )}
    </div>
  );
}
