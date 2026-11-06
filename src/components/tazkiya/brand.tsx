"use client";

/**
 * SUIO — identitas visual brand (v13 rebranding dari Tazkiya).
 *
 * SuioMark: monogram sujud — lengkungan punggung + kepala pada garis tanah
 * + kilau segi empat. Murni SVG sehingga tajam di semua ukuran (20-64px).
 * SuioLockup: mark + wordmark SUIO + tagline "Sujud in Order" untuk
 * splash, auth, onboarding, dan halaman Profil.
 */

export function SuioMark({
  size = 40,
  radius,
  className,
  glow = false,
}: {
  size?: number;
  radius?: number;
  className?: string;
  glow?: boolean;
}) {
  const r = radius ?? Math.round(size * 0.29);
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden
      className={className}
      style={glow ? { filter: "drop-shadow(0 10px 24px rgba(250,82,0,0.45))" } : undefined}
    >
      <defs>
        <linearGradient id="suio-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7A38" />
          <stop offset="1" stopColor="#FA5200" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx={r * (512 / size)} fill="url(#suio-tile)" />
      <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
        <path d="M150 360 L 396 360" strokeWidth="26" />
        <path d="M168 360 A 74 74 0 0 1 316 360" strokeWidth="30" />
      </g>
      <circle cx="368" cy="338" r="27" fill="#FFFFFF" />
      <path
        d="M256 200 l14 26 26 14 -26 14 -14 26 -14 -26 -26 -14 26 -14 Z"
        fill="#FFD9BF"
        opacity="0.95"
      />
    </svg>
  );
}

export const SUIO_TAGLINE = "Sujud in Order";

export function SuioLockup({
  markSize = 44,
  tone = "dark-text",
  className = "",
}: {
  markSize?: number;
  /** warna teks wordmark: "dark-text" (di latar terang) | "light-text" (di latar gelap) */
  tone?: "dark-text" | "light-text";
  className?: string;
}) {
  const word = tone === "light-text" ? "#FFFFFF" : "#17171B";
  const tag = tone === "light-text" ? "rgba(255,255,255,0.66)" : "#9A9AA2";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SuioMark size={markSize} glow />
      <div className="text-left">
        <p
          className="font-display text-[19px] font-extrabold leading-none tracking-[0.06em]"
          style={{ color: word }}
        >
          SUIO
        </p>
        <p
          className="mt-[5px] text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em]"
          style={{ color: tag }}
        >
          {SUIO_TAGLINE}
        </p>
      </div>
    </div>
  );
}
