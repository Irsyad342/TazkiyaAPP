"use client";

/**
 * Tazkiya v5 — Ilustrasi mood bersama: TUJUH ekspresi dengan gaya garis
 * yang konsisten (stroke 2.2 membulat, satu keluarga wajah) dan aksen
 * warna pastel per karakter. Dipakai di Beranda (MoodSection) dan Jurnal
 * agar mood selalu terlihat seragam — emoji mentah tidak lagi dipakai
 * sebagai ilustrasi.
 */

import type { MoodId } from "@/lib/tazkiya/types";

/** Aksen warna per karakter mood — pastel di tema terang, muatan gelap di tema gelap. */
export const MOOD_TONE: Record<MoodId, { face: string; activeBg: string }> = {
  bahagia: { face: "text-tk-amber", activeBg: "bg-tk-amber-soft" },
  tenang: { face: "text-tk-blue", activeBg: "bg-tk-blue-soft" },
  bersyukur: { face: "text-[#d95f80] dark:text-[#ef8aa4]", activeBg: "bg-[#fdeef2] dark:bg-[#2f1d22]" },
  lelah: { face: "text-tk-muted", activeBg: "bg-tk-panel-soft" },
  sedih: { face: "text-[#6a89c9] dark:text-[#89a8e0]", activeBg: "bg-[#eef2fa] dark:bg-[#1e2634]" },
  cemas: { face: "text-[#8a79d9] dark:text-[#a99cf2]", activeBg: "bg-[#f0edff] dark:bg-[#26223a]" },
  "campur-aduk": { face: "text-[#e8722e] dark:text-[#ff8a50]", activeBg: "bg-tk-lavender" },
};

export function MoodFace({ id, className }: { id: MoodId; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <circle cx="32" cy="34" r="21.5" stroke="currentColor" strokeWidth="2.2" opacity="0.9" />
      {id === "bahagia" && (
        <g>
          <circle cx="26" cy="29.5" r="2.2" fill="currentColor" />
          <circle cx="38" cy="29.5" r="2.2" fill="currentColor" />
          <path d="M23 38q9 8 18 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="20.5" cy="36.5" r="2.6" fill="currentColor" opacity="0.35" />
          <circle cx="43.5" cy="36.5" r="2.6" fill="currentColor" opacity="0.35" />
          <path d="M49.5 9.5v6M46.5 12.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
        </g>
      )}
      {id === "tenang" && (
        <g>
          <path d="M23 29q3.5 3.2 7 0M34 29q3.5 3.2 7 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M27.5 40q4.5 4 9 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M19 20.5q2.2-2.4 4.4 0M40.6 18.5q2.2-2.4 4.4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
      {id === "bersyukur" && (
        <g>
          <path d="M23 29.5q3.5-3.4 7 0M34 29.5q3.5-3.4 7 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M26.5 39q5.5 4.6 11 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M46.5 11.7c1.5-2.7 5.4-1.2 4.4 1.7-.5 1.6-4.4 3.7-4.4 3.7s-3.9-2.1-4.4-3.7c-1-2.9 2.9-4.4 4.4-1.7Z"
            fill="currentColor"
            opacity="0.85"
          />
        </g>
      )}
      {id === "lelah" && (
        <g>
          <path d="M23.5 29q3.5 1.9 7 .2M33.5 29.2q3.5 1.9 7 .2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M26.5 40.5q1.8-1.8 3.6 0t3.6 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M46 16.5h4.5L46 21h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <path d="M51.5 9.5h3l-3 3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </g>
      )}
      {id === "sedih" && (
        <g>
          <circle cx="26" cy="28.5" r="2.1" fill="currentColor" />
          <circle cx="38" cy="28.5" r="2.1" fill="currentColor" />
          <path d="M22.5 23.5l5.5 1.9M41.5 23.5L36 25.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M26.5 43q5.5-4.6 11 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M21.5 33.5c-1.7 2.9-1.7 4.8 0 4.8s1.7-1.9 0-4.8Z" fill="currentColor" opacity="0.8" />
        </g>
      )}
      {id === "cemas" && (
        <g>
          <circle cx="26" cy="28" r="3.3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity="0.15" />
          <circle cx="38" cy="28" r="3.3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity="0.15" />
          <circle cx="26" cy="28" r="1.1" fill="currentColor" />
          <circle cx="38" cy="28" r="1.1" fill="currentColor" />
          <path d="M27.5 40.5q2.2-2.2 4.4 0t4.4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M47.5 16.5c-1.5 2.6-1.5 4.3 0 4.3s1.5-1.7 0-4.3Z" fill="currentColor" opacity="0.8" />
        </g>
      )}
      {id === "campur-aduk" && (
        <g>
          <circle cx="26" cy="28.5" r="2.1" fill="currentColor" />
          <path d="M34.5 28.5q3.5 3 7 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M25.5 40q3.5 3.1 6.5 1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M32.5 41.4q3.5-.9 6.5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M44.5 23.5q2-2.2 4 0t4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}
