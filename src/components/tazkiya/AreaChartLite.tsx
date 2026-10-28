"use client";

/**
 * Tazkiya — Grafik area SVG ringan (pengganti recharts).
 * Ukuran ±3 KB vs ±150 KB (recharts + lodash + d3): tanpa dependensi tambahan,
 * dirender dengan SVG bawaan browser sehingga tab Statistik terbuka hampir
 * seketika dan animasi gulir HP tetap mulus.
 *
 * Fitur yang dipertahankan dari versi recharts:
 * kurva monoton halus, isian gradien, grid horizontal, label sumbu X/Y,
 * titik data mingguan, dan tooltip sentuh/kursor dengan garis penunjuk.
 */

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type AreaPoint = { label: string; pct: number; date: string };

/* Titik tunggal pada koordinat layar SVG. */
type XY = { x: number; y: number };

/*
 * Kurva monoton X (algoritma d3 curveMonotoneX — Fritsch–Carlson).
 * Tidak pernah "overshoot" melewati titik data, persis seperti `type="monotone"`.
 */
function monotonePath(pts: XY[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const d = pts[i + 1].x - pts[i].x;
    dx.push(d);
    slope.push(d === 0 ? 0 : (pts[i + 1].y - pts[i].y) / d);
  }
  const tan: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      tan.push(0);
    } else {
      const h0 = dx[i - 1];
      const h1 = dx[i];
      tan.push((3 * (h0 + h1)) / ((2 * h1 + h0) / slope[i - 1] + (h1 + 2 * h0) / slope[i]));
    }
  }
  tan.push(slope[n - 2]);
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3;
    d +=
      ` C ${pts[i].x + third} ${pts[i].y + tan[i] * third}` +
      ` ${pts[i + 1].x - third} ${pts[i + 1].y - tan[i + 1] * third}` +
      ` ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

export function AreaChartLite({
  data,
  isLight,
  step = 1,
  ariaLabel,
}: {
  data: AreaPoint[];
  isLight: boolean;
  /** Tampilkan label X setiap `step` titik (bulanan = 5, mingguan = 1). */
  step?: number;
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  /* Ukur lebar kontainer — SVG digambar pada ukuran piksel asli agar
     garis & teks tidak pecah (tanpa distorsi preserveAspectRatio). */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 210;
  const PAD = { top: 12, right: 10, bottom: 24, left: 34 };
  const pw = Math.max(0, width - PAD.left - PAD.right);
  const ph = H - PAD.top - PAD.bottom;
  const n = data.length;
  const lineColor = isLight ? "#7546C8" : "#9C72EF";
  const dotFill = isLight ? "#A98AE8" : "#D8C5FF";
  const gridColor = isLight ? "rgba(41,35,49,0.08)" : "rgba(255,255,255,0.06)";
  const axisColor = isLight ? "#706778" : "#A79BC6";

  const xy: XY[] =
    n === 0 || pw === 0
      ? []
      : data.map((d, i) => ({
          x: PAD.left + (n === 1 ? pw / 2 : (i / (n - 1)) * pw),
          y: PAD.top + (1 - Math.max(0, Math.min(100, d.pct)) / 100) * ph,
        }));

  const lineD = monotonePath(xy);
  /* Guard berdasarkan xy (bukan n): pada render pertama width masih 0,
     sehingga xy kosong walau n >= 2. */
  const areaD =
    xy.length >= 2
      ? `${lineD} L ${xy[xy.length - 1].x} ${PAD.top + ph} L ${xy[0].x} ${PAD.top + ph} Z`
      : "";

  const xFromEvent = (clientX: number): number | null => {
    if (n === 0) return null;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left - PAD.left;
    const ratio = Math.max(0, Math.min(1, px / (pw || 1)));
    return Math.round(ratio * (n - 1));
  };

  const tip = hover != null ? data[hover] : null;
  const tipX = hover != null ? xy[hover]?.x ?? 0 : 0;
  const tipY = hover != null ? xy[hover]?.y ?? 0 : 0;
  const tipLeft = Math.max(2, Math.min(tipX - 44, width - 96));

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={ariaLabel}
      className="relative h-full w-full select-none"
      style={{ touchAction: "pan-y" }}
      onPointerMove={(e) => setHover(xFromEvent(e.clientX))}
      onPointerDown={(e) => setHover(xFromEvent(e.clientX))}
      onPointerLeave={() => setHover(null)}
      onPointerCancel={() => setHover(null)}
    >
      {width > 0 && n >= 2 ? (
        <svg width={width} height={H} className="block">
          <defs>
            <linearGradient id={`tzArea-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.55} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Grid horizontal + label sumbu Y (0–100%) */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = PAD.top + (1 - v / 100) * ph;
            return (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + pw} y1={y} y2={y} stroke={gridColor} strokeWidth={1} />
                <text x={PAD.left - 7} y={y + 3} textAnchor="end" fontSize={9.5} fill={axisColor}>
                  {v}%
                </text>
              </g>
            );
          })}

          {/* Label sumbu X */}
          {data.map((d, i) => {
            const show = i % step === 0 || i === n - 1;
            if (!show) return null;
            return (
              <text key={`x-${i}`} x={xy[i].x} y={H - 6} textAnchor="middle" fontSize={9.5} fill={axisColor}>
                {d.label}
              </text>
            );
          })}

          {/* Area + garis */}
          <path d={areaD} fill={`url(#tzArea-${uid})`} />
          <path
            d={lineD}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 4px 10px rgba(156,114,239,0.45))" }}
          />

          {/* Titik data (mingguan) */}
          {n <= 10
            ? xy.map((p, i) => (
                <circle key={`d-${i}`} cx={p.x} cy={p.y} r={3} fill={dotFill} strokeWidth={0} />
              ))
            : null}

          {/* Penunjuk hover/sentuh */}
          {tip ? (
            <g>
              <line x1={tipX} x2={tipX} y1={PAD.top} y2={PAD.top + ph} stroke={lineColor} strokeOpacity={0.45} strokeDasharray="3 3" />
              <circle cx={tipX} cy={tipY} r={5} fill={dotFill} stroke={lineColor} strokeWidth={2} />
            </g>
          ) : null}
        </svg>
      ) : null}

      {/* Kartu tooltip */}
      {tip ? (
        <div
          className={cn(
            "pointer-events-none absolute z-10 rounded-xl border px-2.5 py-1.5 text-[11px] leading-snug shadow-lg",
            isLight ? "border-[rgba(117,70,200,0.3)] bg-white/95 text-[#292331]" : "border-[rgba(156,114,239,0.35)] bg-[rgba(36,27,58,0.95)] text-white"
          )}
          style={{ left: tipLeft, top: Math.max(-6, tipY - 58) }}
        >
          <p className="font-semibold" style={{ color: isLight ? "#5C3AA4" : "#D8C5FF" }}>
            {tip.label} · {tip.date.slice(-2)}/{tip.date.slice(5, 7)}
          </p>
          <p>{tip.pct}% Penyelesaian</p>
        </div>
      ) : null}
    </div>
  );
}
