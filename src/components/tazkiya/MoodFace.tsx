"use client";

/**
 * Tazkiya v8 — ilustrasi mood bersama: TUJUH ekspresi bergaya "sticker"
 * modern — tanpa garis lingkaran luar; wajah berupa bidang warna lembut
 * (currentColor 11%) dengan fitur tegas (stroke 2.6 membulat), pipi blush,
 * dan satu aksen kecil per karakter. Digambar pada grid 64×64 dengan wajah
 * berpusat (32,33) r21 agar ketujuh ekspresi sejajar sempurna.
 * Dipakai di Beranda (MoodSection) dan Jurnal; warna datang dari kelas
 * teks tema (MOOD_TONE) sehingga otomatis cocok di tema gelap/terang.
 */

import type { MoodId } from "@/lib/tazkiya/types";

/** Aksen warna per karakter mood — pastel di tema terang, muatan gelap di tema gelap. */
export const MOOD_TONE: Record<MoodId, { face: string; activeBg: string }> = {
  bahagia: { face: "text-[#e8a33d] dark:text-[#f2b95c]", activeBg: "bg-[#fdeeda] dark:bg-[#2c2416]" },
  tenang: { face: "text-[#5f8fd9] dark:text-[#8fb2e8]", activeBg: "bg-[#ecf2fd] dark:bg-[#1d2838]" },
  bersyukur: { face: "text-[#d95f80] dark:text-[#ef8aa4]", activeBg: "bg-[#fdeef2] dark:bg-[#2f1d22]" },
  lelah: { face: "text-[#8e8e99] dark:text-[#a5a5ad]", activeBg: "bg-[#ececef] dark:bg-[#1f1f23]" },
  sedih: { face: "text-[#6a89c9] dark:text-[#89a8e0]", activeBg: "bg-[#eef2fa] dark:bg-[#1e2634]" },
  cemas: { face: "text-[#8a79d9] dark:text-[#a99cf2]", activeBg: "bg-[#f0edff] dark:bg-[#26223a]" },
  "campur-aduk": { face: "text-[#e8722e] dark:text-[#ff8a50]", activeBg: "bg-[#fdeee4] dark:bg-[#2b1b10]" },
};

/* Pipi blush simetris — dipakai sebagian besar ekspresi. */
function Blush() {
  return (
    <g fill="currentColor" opacity="0.26">
      <ellipse cx="21.5" cy="36.8" rx="2.7" ry="1.6" />
      <ellipse cx="42.5" cy="36.8" rx="2.7" ry="1.6" />
    </g>
  );
}

export function MoodFace({ id, className }: { id: MoodId; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      {/* Bidang wajah lembut — tanpa garis tepi */}
      <circle cx="32" cy="33" r="21" fill="currentColor" opacity="0.11" />

      {id === "bahagia" && (
        <g>
          <path d="M22.5 29.5q3.2-3.4 6.4 0M35.1 29.5q3.2-3.4 6.4 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path
            d="M23.5 36.5c1.6 5.6 4.8 8.4 8.5 8.4s6.9-2.8 8.5-8.4c-5.6 2.3-11.4 2.3-17 0Z"
            fill="currentColor"
          />
          <Blush />
          <path
            d="M50.5 11.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z"
            fill="currentColor"
            opacity="0.8"
          />
        </g>
      )}

      {id === "tenang" && (
        <g>
          <path d="M23 29.5q3 2.7 6 0M35 29.5q3 2.7 6 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M27.5 38.5q4.5 3.7 9 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <Blush />
        </g>
      )}

      {id === "bersyukur" && (
        <g>
          <circle cx="26.5" cy="29.5" r="2.2" fill="currentColor" />
          <circle cx="37.5" cy="29.5" r="2.2" fill="currentColor" />
          <path d="M27 38q5 4.2 10 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <Blush />
          <path
            d="M47.5 12.2c1.4-2.5 5-1.1 4.1 1.6-.5 1.5-4.1 3.4-4.1 3.4s-3.6-1.9-4.1-3.4c-.9-2.7 2.7-4.1 4.1-1.6Z"
            fill="currentColor"
            opacity="0.9"
          />
        </g>
      )}

      {id === "lelah" && (
        <g>
          <path d="M22.5 29.2q3.2 1.7 6.4.2M35.1 29.4q3.2 1.7 6.4.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26.5 40.5q2.1-1.9 4.2 0t4.2 0" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M46.5 16.5h4.4l-4.4 4.4h4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
          <path d="M53.5 9.8h2.6l-2.6 2.6h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </g>
      )}

      {id === "sedih" && (
        <g>
          <path d="M22.8 24.4l5.4 1.8M41.2 24.4l-5.4 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="26.5" cy="30" r="2.1" fill="currentColor" />
          <circle cx="37.5" cy="30" r="2.1" fill="currentColor" />
          <path d="M27 42.5q5-4.4 10 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M20.9 34.2c-1.5 2.6-1.5 4.3 0 4.3s1.5-1.7 0-4.3Z" fill="currentColor" opacity="0.85" />
          <ellipse cx="42.5" cy="37.2" rx="2.4" ry="1.4" fill="currentColor" opacity="0.2" />
        </g>
      )}

      {id === "cemas" && (
        <g>
          <circle cx="26" cy="29.5" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <circle cx="38" cy="29.5" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <circle cx="26" cy="29.5" r="1.2" fill="currentColor" />
          <circle cx="38" cy="29.5" r="1.2" fill="currentColor" />
          <path d="M27 41q2-2.3 4 0t4 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M47.5 15.5c-1.4 2.4-1.4 4 0 4s1.4-1.6 0-4Z" fill="currentColor" opacity="0.85" />
          <path d="M23.5 36.6q2.4 1.6 4.8 0M35.7 36.6q2.4 1.6 4.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
        </g>
      )}

      {id === "campur-aduk" && (
        <g>
          <path d="M23.5 29.5q3.2-3 6.4 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="39" cy="29.5" r="3.2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <circle cx="39" cy="29.5" r="1.1" fill="currentColor" />
          <path d="M26 40.5q3 2.7 6 .6M32.5 41.1q3-1.1 6 .8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path
            d="M46.5 19.5q3-2.6 4.7.3 1.3 2.4-1.3 3.1-2 .5-2.7-1.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <Blush />
        </g>
      )}
    </svg>
  );
}
