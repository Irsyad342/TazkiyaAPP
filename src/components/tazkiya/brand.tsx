"use client";

/**
 * SUIO — identitas visual brand (v14 logo baru "Sujud di Bawah Cahaya").
 *
 * SuioMark: tile membulat + figur sujud (kubah punggung dengan lengkung
 * kaki, kepala bulat) mengapung di atas garis sajadah oranye, ditopang
 * kilau empat titik di kanan atas. Geometri direplikasi 1:1 dari aset
 * referensi resmi (tile 512: dome apex 230,233 · arch 194–294 apex 240,323 ·
 * kepala 397,338 r39 · bar y398 x63–448 · bintang 357,170 R58) — jangan
 * diubah manual; pakai scripts/suio_logo.py bila perlu regenerasi.
 *
 * Tema: light = tile putih + figur #1C1B1B, dark = tile #0D0D0D + figur
 * putih; aksen oranye #FF7B01 sama di kedua tema. Murni SVG tanpa defs
 * sehingga tajam di semua ukuran dan aman dipakai bertumpuk.
 * SuioLockup: mark + wordmark SUIO + tagline "Sujud in Order".
 */

const FIG = "light:fill-[#1c1b1b] dark:fill-white";

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
  const r = radius ?? Math.round(size * 0.27);
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden
      className={className}
      style={glow ? { filter: "drop-shadow(0 10px 24px rgba(255,123,1,0.45))" } : undefined}
    >
      <rect
        width="512"
        height="512"
        rx={r * (512 / size)}
        strokeWidth={512 / size * 1.25}
        className="light:fill-white dark:fill-[#0d0d0d] light:stroke-black/10 dark:stroke-white/[0.08]"
      />
      <path
        d="M 230 233 C 186 241 138 262 112 296 C 96 318 84 344 81 373 L 194 373 C 196 352 206 330 240 323 C 268 325 283 344 294 373 L 353 373 C 344 362 335 346 332 334 C 334 324 342 316 348 306 C 342 284 302 244 230 233 Z"
        className={FIG}
      />
      <circle cx="397" cy="338" r="39" className={FIG} />
      <path
        d="M 357 112 Q 371.5 155.5 415 170 Q 371.5 184.5 357 228 Q 342.5 184.5 299 170 Q 342.5 155.5 357 112 Z"
        fill="#FF7B01"
      />
      <path
        d="M 63 398 L 448 398"
        stroke="#FF7B01"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
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
