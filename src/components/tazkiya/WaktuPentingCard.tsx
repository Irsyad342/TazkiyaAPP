"use client";

/**
 * Tazkiya — "Waktu-Waktu Penting" (pelengkap jadwal salat utama, bukan pengganti):
 * Imsak · Terbit · Duha · Tahajud sebagai CAROUSEL 3D BERLAPIS (layered/coverflow).
 * - Kartu aktif selalu di tengah: paling besar, paling depan, tanpa blur, tanpa terpotong.
 * - Kartu samping: lebih kecil, lebih transparan, blur halus, sedikit turun — preview
 *   sebagian di tepi (efek kedalaman seperti slider premium).
 * - Interaksi: swipe/drag (pointer events, maks 1 kartu per gesture, scroll vertikal
 *   halaman tetap jalan via touch-action: pan-y), dots, tombol ‹ ›, panah keyboard.
 * - Animasi: transform + opacity + filter blur saja, ±560 ms cubic-bezier lembut;
 *   posisi saat drag di-update langsung via DOM (tanpa re-render React per frame).
 * - Data & logika waktu TIDAK berubah: computeSunnahTimes, perilaku "butuh lokasi",
 *   sumber angka sama dengan jadwal salat utama.
 * - Ilustrasi SVG inline (WaktuScenes.tsx) + kelas .wp-* di globals.css: palet TETAP,
 *   identik di semua tema aplikasi.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { MoonStar, Moon, Sun, Sunrise, ChevronLeft, ChevronRight } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { computeSunnahTimes } from "@/lib/tazkiya/sunnahTimes";
import { ensureAutoGeo } from "@/lib/tazkiya/autoGeo";
import { cn } from "@/lib/utils";
import { SceneImsak, SceneTerbit, SceneDuha, SceneTahajud } from "./WaktuScenes";

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

/** Jarak antar pusat kartu (px) per breakpoint — sinkron dengan CSS .wp-item. */
const STEP_MOBILE = 190;
const STEP_DESKTOP = 306;
const DUR_SETTLE_MS = 560;

export function WaktuPentingCard({ today }: { today: string }) {
  const settings = useWorshipStore((s) => s.settings);
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const [nudged, setNudged] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const posRef = useRef(0);
  const idxRef = useRef(0);
  const animRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef({ on: false, startX: 0, startY: 0, axis: "" as "" | "x" | "y", moved: false, lastX: 0, lastT: 0, vx: 0 });

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
    if (busy || dragRef.current.moved) return;
    setBusy(true);
    await ensureAutoGeo("retry");
    setBusy(false);
  };

  const step = () => (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? STEP_DESKTOP : STEP_MOBILE);

  /** Posisikan semua kartu untuk nilai pos (float). animate → transisi CSS aktif. */
  const layout = (pos: number, animate: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.classList.toggle("wp-anim", animate);
    const st = step();
    for (let i = 0; i < rows.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const o = i - pos;
      const ao = Math.min(Math.abs(o), 1.7);
      const scale = 1 - Math.min(ao, 1.45) * 0.115;
      const opacity = ao < 0.03 ? 1 : 1 - Math.min(ao, 1.35) * 0.42;
      const blur = ao < 0.03 ? 0 : Math.min(ao * 2.6, 4.6);
      const y = -6 + Math.min(ao, 1) * 16;
      el.style.transform = `translate3d(${(o * st).toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = blur < 0.2 ? "none" : `blur(${blur.toFixed(1)}px)`;
      el.style.zIndex = String(100 - Math.round(ao * 40));
      el.classList.toggle("wp-front", ao < 0.5);
    }
  };

  const animateTo = (target: number) => {
    const next = Math.max(0, Math.min(rows.length - 1, target));
    animRef.current = true;
    posRef.current = next;
    layout(next, true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      animRef.current = false;
      idxRef.current = next;
      setIdx(next);
    }, DUR_SETTLE_MS);
  };

  const goRel = (dir: 1 | -1) => {
    // tombol/dots: wrap penuh agar "kembali ke kartu pertama" natural
    animateTo((idxRef.current + dir + rows.length) % rows.length);
  };

  // posisi awal + re-layout saat resize (breakpoint mengubah step/ukuran)
  useEffect(() => {
    layout(posRef.current, false);
    const onResize = () => layout(posRef.current, false);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ---- drag / swipe (pointer events; scroll vertikal tidak diblokir) ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animRef.current) return;
    const d = dragRef.current;
    d.on = true; d.moved = false; d.axis = "";
    d.startX = d.lastX = e.clientX; d.startY = e.clientY;
    d.lastT = performance.now(); d.vx = 0;
    try { stageRef.current?.setPointerCapture(e.pointerId); } catch { /* pointer sintetis/UAEA */ }
    stageRef.current?.classList.remove("wp-anim");
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.on) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.axis) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (d.axis !== "x") return;
    d.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vx = (e.clientX - d.lastX) / dt; // px per ms
    d.lastX = e.clientX; d.lastT = now;
    let pos = idxRef.current - dx / step();
    // rubber-band di ujung
    const min = -0.42, max = rows.length - 1 + 0.42;
    if (pos < min) pos = min + (pos - min) / 3;
    if (pos > max) pos = max + (pos - max) / 3;
    posRef.current = pos;
    if (!nudged) setNudged(true);
    layout(pos, false);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.on) return;
    d.on = false;
    try { stageRef.current?.releasePointerCapture?.(e.pointerId); } catch { /* abaikan */ }
    if (!d.moved) return;
    // flick (jari cepat): mempercepat ke kartu terdekat — maks 1 kartu per gesture
    const fl = Math.max(-0.6, Math.min(0.6, (-d.vx * 80) / step()));
    const raw = Math.round(posRef.current + (Math.abs(d.vx) > 0.35 ? fl : 0));
    const target = Math.max(idxRef.current - 1, Math.min(idxRef.current + 1, raw));
    animateTo(target);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goRel(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goRel(-1); }
  };

  return (
    <section aria-label="Waktu-waktu penting hari ini" className="wp-section">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Waktu-Waktu Penting</h2>
        <span className="shrink-0 text-[10.5px] font-medium text-tk-muted">Pelengkap jadwal salat</span>
      </div>

      <div
        ref={stageRef}
        className="wp-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Kartu waktu ibadah — geser, ketuk panah, atau dot untuk berpindah"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {rows.map(({ id, label, arab, caption, desc, Scene, Icon, time, range }, i) => {
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
          const cls = cn("wp-card wp-" + id, missing && "wp-tap tap");
          const aria = missing
            ? `${label}: membutuhkan lokasi. Ketuk untuk mengaktifkan lokasi otomatis.`
            : `${label}: ${time ?? `${range[0]} hingga ${range[1]}`}`;
          return missing ? (
            <button
              key={id}
              ref={(el) => { cardRefs.current[i] = el; }}
              type="button"
              onClick={activateGeo}
              aria-label={aria}
              className={cls}
            >
              {inner}
            </button>
          ) : (
            <article key={id} ref={(el) => { cardRefs.current[i] = el; }} aria-label={aria} className={cls}>
              {inner}
            </article>
          );
        })}
      </div>

      {/* navigasi: ‹ dots 1/4 › */}
      <div className="wp-dotbar mt-2.5 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Kartu sebelumnya" onClick={() => goRel(-1)} className="wp-nav">
            <ChevronLeft size={14} strokeWidth={2.4} />
          </button>
          <button type="button" aria-label="Kartu berikutnya" onClick={() => goRel(1)} className="wp-nav">
            <ChevronRight size={14} strokeWidth={2.4} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              aria-label={`Ke kartu ${i + 1}: ${r.label}`}
              aria-current={i === idx}
              onClick={() => animateTo(i)}
              className={cn("wp-dot", i === idx && "wp-dot-on")}
            />
          ))}
        </div>
        {nudged ? (
          <span className="wp-count" aria-label={`Kartu ${idx + 1} dari ${rows.length}`}>
            {idx + 1}/{rows.length}
          </span>
        ) : (
          <span className="wp-hint" aria-hidden>Geser</span>
        )}
      </div>

      <p className="mt-2 px-1 text-[9.5px] leading-relaxed text-tk-deep">
        Imsak 10 menit sebelum Subuh · Duha ±20 menit setelah Terbit hingga Zuhur · Tahajud sepertiga malam terakhir hingga Subuh
      </p>
    </section>
  );
}
