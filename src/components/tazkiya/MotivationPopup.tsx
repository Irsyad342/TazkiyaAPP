"use client";

/**
 * Tazkiya v4 — Pop-up apresiasi setelah pencatatan salat berhasil disimpan.
 * Sheet putih bersih dengan medali ikon dalam lingkaran tint (tanpa glow),
 * judul Outfit besar, dan tombol tinta beraksen lime. Tiga varian sesuai
 * status yang benar-benar dipilih pengguna:
 *  - "jamaah"  → MasyaAllah! (masjid, aksen lavender)
 *  - "mandiri" → Alhamdulillah! (bulan bintang, aksen biru)
 *  - "missed"  → Tetap Semangat (hati lembut, aksen amber — menenangkan,
 *                bukan menghakimi)
 * Pesan memiliki beberapa variasi (dipilih acak sekali saat mount). Pop-up
 * murni tampilan: tidak mengubah status, tidak menyimpan data.
 * Komponen Ephemeral: dirender kondisional oleh parent setelah simpan.
 */

import { useState } from "react";
import { Heart, MoonStar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MotivationVariant = "jamaah" | "mandiri" | "missed";

const MESSAGES: Record<MotivationVariant, { title: string; body: string[]; button: string }> = {
  jamaah: {
    title: "MasyaAllah!",
    body: [
      "Alhamdulillah, satu langkah baik untuk menjaga istiqamah. Semoga Allah memudahkanmu untuk terus konsisten.",
      "Barakallah! Salat berjamaah memiliki keutamaan yang besar. Terus jaga semangat dan kerinduanmu pada masjid.",
      "Alhamdulillah! Ibadah bersama kaum muslimin membawa keberkahan. Semoga menjadi kebiasaan yang terjaga.",
    ],
    button: "Alhamdulillah",
  },
  mandiri: {
    title: "Alhamdulillah!",
    body: [
      "Satu kewajiban sudah kamu jaga. Yuk, lanjutkan ikhtiar menjaga sholat berikutnya.",
      "Alhamdulillah, salat mandiri ini tetap bernilai di sisi Allah. Semoga hatimu semakin dekat dengan masjid.",
      "Syukur, satu salat tercatat hari ini. Pelan-pelan asal konsisten, itulah inti istiqamah.",
    ],
    button: "Alhamdulillah",
  },
  missed: {
    title: "Tetap Semangat",
    body: [
      "Hari ini mungkin belum berjalan sesuai harapan. Jangan menyerah, evaluasi penyebabnya, dan lanjutkan ikhtiar menjaga sholat berikutnya.",
      "Tidak apa-apa, setiap hamba pernah berkelalaian. Ambil pelajaran dari hari ini, lalu mulai lagi dengan hati yang tenang.",
      "Semoga Allah memaafkan dan memudahkan langkahmu. Tetap jaga hati untuk kembali melakukan yang terbaik.",
    ],
    button: "Lanjutkan",
  },
};

/** Ilustrasi masjid mini (SVG inline) — identitas Islami untuk varian berjamaah. */
function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      {/* bulan sabit */}
      <path
        d="M31.6 7.9a5.4 5.4 0 1 0 4.5 6.4 4.4 4.4 0 1 1-4.5-6.4Z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* kubah */}
      <path d="M24 13.5c4.6 3.3 7.3 6.3 7.3 10.1H16.7c0-3.8 2.7-6.8 7.3-10.1Z" fill="currentColor" />
      {/* bangunan utama */}
      <rect x="15" y="24.4" width="18" height="12.6" rx="1.6" fill="currentColor" />
      {/* pintu lengkung */}
      <path d="M21.4 37v-5.2a2.6 2.6 0 0 1 5.2 0V37Z" fill="currentColor" opacity="0.35" />
      {/* menara kiri & kanan */}
      <rect x="9.6" y="17.5" width="3" height="19.5" rx="1.5" fill="currentColor" />
      <circle cx="11.1" cy="16" r="1.7" fill="currentColor" />
      <rect x="35.4" y="17.5" width="3" height="19.5" rx="1.5" fill="currentColor" />
      <circle cx="36.9" cy="16" r="1.7" fill="currentColor" />
      {/* garis dasar */}
      <rect x="7.5" y="37.6" width="33" height="2.4" rx="1.2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

/** Konfigurasi aksen per varian — tint lembut tanpa glow. */
const VARIANT_ACCENT: Record<MotivationVariant, { badge: string; button: string }> = {
  jamaah: {
    badge: "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent",
    button: "gs-ink-btn",
  },
  mandiri: {
    badge: "bg-tk-blue-soft text-tk-blue dark:bg-tk-blue/20 dark:text-[#aebcff]",
    button: "gs-ink-btn",
  },
  missed: {
    badge: "bg-tk-amber-soft text-tk-amber",
    button: "gs-ink-btn",
  },
};

/** Titik kilau dekoratif: posisi & arah pecaran tetap (deterministik, lembut). */
const SPARKS: { x: string; y: string; sx: string; sy: string; delay: string; size: string }[] = [
  { x: "8%", y: "6%", sx: "-14px", sy: "-16px", delay: "0.05s", size: "5px" },
  { x: "92%", y: "10%", sx: "14px", sy: "-12px", delay: "0.14s", size: "4px" },
  { x: "2%", y: "58%", sx: "-16px", sy: "8px", delay: "0.22s", size: "4px" },
  { x: "96%", y: "60%", sx: "16px", sy: "10px", delay: "0.1s", size: "5px" },
  { x: "24%", y: "-4%", sx: "-8px", sy: "-14px", delay: "0.3s", size: "3.5px" },
  { x: "76%", y: "-2%", sx: "8px", sy: "-14px", delay: "0.18s", size: "3.5px" },
];

export function MotivationPopup({
  variant,
  prayerLabel,
  dateLabel,
  onClose,
}: {
  variant: MotivationVariant;
  prayerLabel: string;
  dateLabel: string;
  onClose: () => void;
}) {
  // Pilih variasi pesan sekali saat mount (komponen ephemeral) — stabil
  // selama pop-up terbuka, berganti tiap pencatatan agar tidak monoton.
  const [msg] = useState(() => {
    const pool = MESSAGES[variant].body;
    return pool[Math.floor(Math.random() * pool.length)];
  });
  const accent = VARIANT_ACCENT[variant];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="glass-strong fixed! top-auto bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 translate-y-0 gap-3 overflow-y-auto rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_-12px_rgba(25,25,35,0.5)] duration-250 thin-scrollbar data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8"
      >
        {/* Pegangan sheet */}
        <span aria-hidden className="mx-auto mb-0.5 block h-1 w-10 shrink-0 rounded-full bg-tk-line-strong/70" />

        {/* ---------- Medali ikon + kilau ---------- */}
        <div className="relative mx-auto mt-1 flex h-24 w-24 items-center justify-center">
          <span
            aria-hidden
            className={cn(
              "relative flex h-[76px] w-[76px] items-center justify-center rounded-full",
              accent.badge
            )}
          >
            {variant === "jamaah" ? (
              <MosqueIcon className="h-11 w-11" />
            ) : variant === "mandiri" ? (
              <MoonStar size={34} strokeWidth={1.6} />
            ) : (
              <Heart size={32} strokeWidth={1.7} className="fill-current opacity-90" />
            )}
          </span>
          {/* cincin garis dekoratif */}
          <span aria-hidden className="absolute inset-1 rounded-full border border-dashed border-tk-line-strong" />
          {/* Partikel kilau (sekali-jalan, hormati reduced motion) */}
          {SPARKS.map((s, i) => (
            <span
              key={i}
              aria-hidden
              className="tk-sparkle absolute left-0 top-0 rounded-full bg-tk-lime"
              style={
                {
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                  animationDelay: s.delay,
                  "--sx": s.sx,
                  "--sy": s.sy,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-[24px] font-bold tracking-[-0.02em] text-tk-ink">
            {MESSAGES[variant].title}
          </DialogTitle>
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-tk-muted">
            {prayerLabel} · {dateLabel}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-tk-ink/90">{msg}</p>
        </DialogHeader>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "tap min-h-[46px] w-full rounded-full font-display text-sm font-bold transition-all",
            accent.button
          )}
        >
          <span>{MESSAGES[variant].button}</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
