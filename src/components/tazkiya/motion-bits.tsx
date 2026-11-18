"use client";

/**
 * SUIO GLOBAL MOTION SYSTEM — komponen gerakan reusable.
 *
 * Satu kosakata gerakan untuk seluruh aplikasi:
 * - useAnim()        : gerbang animasi global (setelan aplikasi +
 *                      prefers-reduced-motion). Dipakai semua halaman.
 * - Reveal           : elemen memuncul saat masuk viewport
 *                      (IntersectionObserver internal framer-motion,
 *                      `once` → tidak diulang, hemat CPU saat scroll).
 * - Stagger/StaggerItem : entrance berurutan ~64 ms — ritme referensi.
 * - TiltCard         : kartu interaktif 3D tilt + press lift + spring.
 * - PressScale       : pembungkus feedback tekan untuk elemen klik
 *                      yang bukan kartu penuh.
 * - CountUp          : angka yang mengalir naik (statistik, persen).
 * - TapIcon          : ikon berputar/kencang singkat saat dipilih.
 *
 * Semua komponen hanya menganimasikan transform & opacity.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Layers } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { DUR, EASE, SPRING, staggerChild, staggerParent } from "@/lib/motion/system";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Gerbang animasi global                                              */
/* ------------------------------------------------------------------ */

/** True hanya jika setelan animasi aplikasi ON dan sistem tidak minta
 *  reduced motion. Setiap komponen motion memanggil ini, sehingga
 *  "Animasi: mati" di Profil benar-benar mematikan semuanya. */
export function useAnim(): boolean {
  const enabled = useWorshipStore((s) => s.settings.animations);
  const reduce = useReducedMotion();
  return enabled && !reduce;
}

/* ------------------------------------------------------------------ */
/* Reveal — memunculkan elemen saat masuk viewport                     */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
  amount = 0.25,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** Penundaan detik (untuk urutan manual kecil). */
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
  style?: CSSProperties;
}) {
  const anim = useAnim();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  if (!anim) {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <div ref={ref} className={className} style={style}>
      <m.div
        initial={{ opacity: 0, y }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
        transition={{ duration: DUR.card, ease: EASE.out, delay }}
      >
        {children}
      </m.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stagger — entrance berurutan                                        */
/* ------------------------------------------------------------------ */

export function Stagger({
  children,
  className,
  step = 0.064,
  delay = 0.04,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  delay?: number;
}) {
  const anim = useAnim();
  if (!anim) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      variants={{ ...staggerParent, show: { ...staggerParent.show, transition: { staggerChildren: step, delayChildren: delay } } }}
      initial="hidden"
      animate="show"
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const anim = useAnim();
  if (!anim) return <div className={className} style={style}>{children}</div>;
  return (
    <m.div className={className} style={style} variants={staggerChild}>
      {children}
    </m.div>
  );
}

/** Kartu individual dengan entrance tertunda manual (tanpa parent). */
export function RiseIn({
  children,
  className,
  i = 0,
  y = 22,
  style,
}: {
  children: ReactNode;
  className?: string;
  i?: number;
  y?: number;
  style?: CSSProperties;
}) {
  const anim = useAnim();
  if (!anim) return <div className={className} style={style}>{children}</div>;
  return (
    <m.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.card, ease: EASE.out, delay: i * 0.064 }}
    >
      {children}
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/* TiltCard — kartu interaktif: tilt 3D + press lift + spring          */
/* ------------------------------------------------------------------ */

export function TiltCard({
  children,
  className,
  onClick,
  maxTilt = 4,
  maxLift = 2,
  style,
  ariaLabel,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
  maxLift?: number;
  style?: CSSProperties;
  ariaLabel?: string;
  as?: "div" | "button";
}) {
  const anim = useAnim();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tx = useMotionValue(0);
  const lift = useMotionValue(0);
  const srx = useSpring(rx, SPRING.settle);
  const sry = useSpring(ry, SPRING.settle);
  const stx = useSpring(tx, SPRING.settle);
  const slift = useSpring(lift, { stiffness: 380, damping: 26 });
  /* Shadow merespons kemiringan: makin miring, makin terangkat. */
  const [lifted, setLifted] = useState(false);

  const reset = () => {
    rx.set(0);
    ry.set(0);
    tx.set(0);
    lift.set(0);
    setLifted(false);
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) - 0.5;
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) - 0.5;
    /* Sentuh tetap terlihat jelas (0.8) — bukan sekadar mouse-only. */
    const range = e.pointerType === "mouse" || e.pointerType === "pen" ? 1 : 0.8;
    ry.set(px * maxTilt * range);
    rx.set(-py * (maxTilt * 0.62) * range);
    tx.set(px * 3.2 * range);
  };

  /* Gaya motion diterapkan pada elemen LUAR — permukaan kartu (latar,
     border, shadow) ikut miring sebagai satu bidang. touchAction pan-y
     menjaga scroll vertikal halaman tetap alami di HP. */
  const motionStyle = {
    ...style,
    touchAction: "pan-y",
    ...(anim
      ? ({ rotateX: srx, rotateY: sry, x: stx, y: slift, transformPerspective: 900 } as unknown as CSSProperties)
      : {}),
  };

  const interaction = {
    "data-lifted": lifted ? "true" : "false",
    onPointerMove: anim ? onMove : undefined,
    onPointerEnter: anim ? () => setLifted(true) : undefined,
    onPointerLeave: anim ? reset : undefined,
    onPointerCancel: anim ? reset : undefined,
    onPointerDown: anim
      ? () => {
          lift.set(-maxLift);
          setLifted(true);
        }
      : undefined,
    onPointerUp: anim ? reset : undefined,
  };

  if (as === "button") {
    return (
      <m.button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={cn("su-interactive block w-full cursor-pointer text-left", className)}
        style={motionStyle}
        {...interaction}
      >
        {children}
      </m.button>
    );
  }
  const clickable = !!onClick;
  return (
    <m.div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn("su-interactive", clickable && "cursor-pointer", className)}
      style={motionStyle}
      {...interaction}
    >
      {children}
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/* PressScale — feedback tekan spring untuk elemen klik apa pun        */
/* ------------------------------------------------------------------ */

export function PressScale({
  children,
  className,
  onClick,
  press = 0.96,
  as = "div",
  ariaLabel,
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  press?: number;
  as?: "div" | "button";
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  const anim = useAnim();
  const scale = useMotionValue(1);
  const s = useSpring(scale, SPRING.snappy);
  const down = () => anim && scale.set(press);
  const up = () => anim && scale.set(1);
  if (as === "button") {
    return (
      <m.button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        className={className}
        style={{ scale: s }}
      >
        {children}
      </m.button>
    );
  }
  return (
    <m.div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      className={cn(onClick && "cursor-pointer", className)}
      style={{ scale: s, ...style }}
    >
      {children}
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — angka yang mengalir                                       */
/* ------------------------------------------------------------------ */

export function CountUp({
  to,
  duration = 0.9,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
  triggerOnce = true,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  triggerOnce?: boolean;
}) {
  const anim = useAnim();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: triggerOnce, amount: 0.4 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!anim || !inView) {
      if (!anim) setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE.out as unknown as [number, number, number, number],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [anim, inView, to, duration]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {prefix}
      {val.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* TapIcon — aksen kecil saat ikon dipilih (rotasi/scale singkat)      */
/* ------------------------------------------------------------------ */

export function TapIcon({
  children,
  active,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  const anim = useAnim();
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <m.span
        key={active ? "on" : "off"}
        className={cn("inline-flex", className)}
        initial={anim ? { scale: 0.75, rotate: -8 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING.pop}
      >
        {children}
      </m.span>
    </AnimatePresence>
  );
}


/* ------------------------------------------------------------------ */
/* DragCard — kartu yang bisa DISENTAK: mengikuti jari/pointer, naik,  */
/* miring tipis, bayangan membesar, lalu kembali dengan spring.        */
/* Drag dibatasi sumbu-X (drag="x") + touchAction pan-y sehingga scroll */
/* vertikal halaman TIDAK terganggu — sesuai aturan proteksi gesture.  */
/* ------------------------------------------------------------------ */

export function DragCard({
  children,
  className,
  onClick,
  ariaLabel,
  maxTilt = 4,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  maxTilt?: number;
}) {
  const anim = useAnim();
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-110, 110], [-maxTilt, maxTilt]), {
    stiffness: 260,
    damping: 22,
  });
  const [dragging, setDragging] = useState(false);

  if (!anim) {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn("su-interactive cursor-pointer", onClick && "cursor-pointer", className)}
        data-lifted="false"
      >
        {children}
      </div>
    );
  }
  return (
    <m.div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.22}
      dragTransition={{ bounceStiffness: 320, bounceDamping: 26 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      whileDrag={{ scale: 1.035, y: -7 }}
      style={{ x, rotate, touchAction: "pan-y", transformPerspective: 900 }}
      data-lifted={dragging ? "true" : "false"}
      className={cn("su-interactive cursor-grab active:cursor-grabbing", className)}
    >
      {children}
    </m.div>
  );
}


/* ------------------------------------------------------------------ */
/* AmbientParticles — butiran cahaya mengapung untuk kartu hero.       */
/* Transform+opacity saja, jarak fase lebar agar tidak seragam;        */
/* mati total pada animasi-off & reduced-motion (via useAnim).         */
/* ------------------------------------------------------------------ */

export function AmbientParticles({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const anim = useAnim();
  if (!anim) return null;
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <m.span
          key={i}
          className="absolute block rounded-full bg-white"
          style={{
            left: `${7 + ((i * 37) % 84)}%`,
            top: `${10 + ((i * 53) % 72)}%`,
            width: i % 3 === 0 ? 5 : 3,
            height: i % 3 === 0 ? 5 : 3,
            opacity: 0.22,
          }}
          animate={{ y: [0, -16, 0], opacity: [0.16, 0.55, 0.16], scale: [1, 1.25, 1] }}
          transition={{
            duration: 5.5 + (i % 4) * 1.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.65,
          }}
        />
      ))}
    </span>
  );
}


/* ------------------------------------------------------------------ */
/* PinchStack — bungkus kartu dengan gesture dua jari                  */
/* "pinch-to-stack & spread-to-expand" ala tumpukan kartu remi.        */
/*                                                                     */
/* Mekanisme:                                                          */
/* - Posisi pointer aktif (pointerId → {x,y}) hidup di useRef; semua   */
/*   update gesture menulis ke MotionValue → NOL re-render React per   */
/*   pointermove.                                                      */
/* - Saat 2 jari menempel, jarak awal dicatat (dist0). Jari MENDEKAT   */
/*   (pinch) → progres naik menuju 1 → kartu "terkompresi": dua layer  */
/*   hantu muncul di belakang + kartu asli mengecil/miring (tumpukan). */
/*   Jari MENJAUH (spread) → progres turun → kartu membuka ke normal.  */
/* - rawProgress dihaluskan useSpring(500/38): mengikuti jari nyaris   */
/*   1:1 namun lembut; jari dilepas → spring kembali ke 0 natural.     */
/* - touchAction "pan-y": SATU jari tetap scroll vertikal halaman;     */
/*   pinch-zoom dua jari tidak diizinkan browser, sehingga             */
/*   pointermove kedua pointer tetap sampai ke komponen ini.           */
/* - Ketukan sisa setelah pinch (progres pernah > 0.15) disupresi      */
/*   sekali via onClickCapture agar tidak memicu navigasi kartu.       */
/*                                                                     */
/* Komponen MURNI visual+gesture: tidak menerima/mengetahui data apa   */
/* pun — hanya membungkus children yang sudah ada.                     */
/* ------------------------------------------------------------------ */

export function PinchStack({
  children,
  className,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const anim = useAnim();
  /* Seluruh state gesture di ref — tidak pernah memicu re-render. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dist0 = useRef<number | null>(null);
  const pinched = useRef(false);
  /* Keadaan "menumpuk" yang MENETAP (tombol alternatif). Pinch hanya
     pratinjau sementara: dilepas → kembali ke keadaan tombol. */
  const [stacked, setStacked] = useState(false);
  const stackedRef = useRef(false);

  /* Progres pinch mentah (mengikuti jari) + versi spring untuk display. */
  const rawProgress = useMotionValue(0);
  const displayProgress = useSpring(rawProgress, { stiffness: 500, damping: 38 });

  /* Blokir zoom/scroll browser HANYA saat dua+ jari menyentuh kartu —
     listener non-passive agar preventDefault berlaku (pan-y tetap
     mengizinkan scroll satu jari; zoom halaman kini juga dimatikan
     lewat viewport meta untuk aplikasi ter-install). */
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const hold = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener("touchstart", hold, { passive: false });
    el.addEventListener("touchmove", hold, { passive: false });
    return () => {
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchmove", hold);
    };
  }, []);

  const toggleStack = () => {
    const next = !stackedRef.current;
    stackedRef.current = next;
    setStacked(next);
    rawProgress.set(next ? 1 : 0);
  };

  /* Dua layer hantu "kartu remi" DI BELAKANG konten (render duluan).
     translateZ bertingkat → deck 3D nyata, bukan sekadar pergeseran 2D. */
  const ghostA = {
    x: useTransform(displayProgress, (p) => -p * 14),
    y: useTransform(displayProgress, (p) => -p * 10),
    z: useTransform(displayProgress, (p) => -p * 34),
    rotate: useTransform(displayProgress, (p) => -p * 4),
    scale: useTransform(displayProgress, (p) => 1 - p * 0.03),
    opacity: useTransform(displayProgress, (p) => (p > 0.02 ? Math.min(0.9, p * 1.4) : 0)),
    transformPerspective: 900,
  };
  const ghostB = {
    x: useTransform(displayProgress, (p) => p * 16),
    y: useTransform(displayProgress, (p) => -p * 18),
    z: useTransform(displayProgress, (p) => -p * 62),
    rotate: useTransform(displayProgress, (p) => p * 5),
    scale: useTransform(displayProgress, (p) => 1 - p * 0.05),
    opacity: useTransform(displayProgress, (p) => (p > 0.02 ? Math.min(0.72, p * 1.1) : 0)),
    transformPerspective: 900,
  };

  /* Kartu asli terkompresi + tilt 3D + terangkat ke depan saat menumpuk. */
  const contentStyle = {
    scale: useTransform(displayProgress, (p) => 1 - p * 0.08),
    rotateX: useTransform(displayProgress, (p) => p * 7),
    y: useTransform(displayProgress, (p) => -p * 10),
    z: useTransform(displayProgress, (p) => p * 30),
    rotate: useTransform(displayProgress, (p) => -p * 1.5),
    transformPerspective: 900,
  };

  if (!anim || disabled) {
    return (
      <div className={className} style={{ touchAction: "pan-y" }}>
        {children}
      </div>
    );
  }

  /* Jarak dua pointer teratas (Map mempertahankan urutan turun). */
  const distFirstTwo = (): number | null => {
    let a: { x: number; y: number } | undefined;
    let b: { x: number; y: number } | undefined;
    for (const p of pointers.current.values()) {
      if (!a) a = p;
      else {
        b = p;
        break;
      }
    }
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    /* Jumlah pointer mencapai 2 → rekam jarak awal pinch. */
    if (pointers.current.size === 2) dist0.current = distFirstTwo();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pts = pointers.current;
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size < 2) {
      rawProgress.set(stackedRef.current ? 1 : 0);
      return;
    }
    /* Baseline hilang (mis. salah satu dari tiga jari terangkat) → rekam ulang. */
    if (dist0.current == null) dist0.current = distFirstTwo();
    const base0 = dist0.current;
    if (base0 == null || base0 <= 0) return;
    const dist = distFirstTwo();
    if (dist == null) return;
    /* Jari MENDEKAT → makin menumpuk; MENJAUH → membuka. Berangkat dari
       keadaan tombol (0 terbuka / 1 menumpuk), pratinjau bergerak bolak-balik. */
    const base = stackedRef.current ? 1 : 0;
    const p = Math.min(Math.max(base + (base0 - dist) / (base0 * 0.45), 0), 1);
    rawProgress.set(p);
    if (p > 0.15) pinched.current = true;
  };

  const removePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (rawProgress.get() > 0.15) pinched.current = true;
    /* Jari berkurang → kembali HALUS ke keadaan menetap (spring). */
    dist0.current = null;
    rawProgress.set(stackedRef.current ? 1 : 0);
  };

  /* Ketukan sisa setelah pinch tidak boleh menavigasi kartu:
     blok sekali, lalu flag direset agar tap berikutnya normal. */
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pinched.current) {
      e.preventDefault();
      e.stopPropagation();
      pinched.current = false;
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={removePointer}
      onPointerCancel={removePointer}
      onPointerLeave={removePointer}
      onClickCapture={onClickCapture}
    >
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] tk-card-white su-card-shadow"
        style={ghostA}
      />
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] tk-card-white su-card-shadow"
        style={ghostB}
      />
      <m.div className="relative" style={contentStyle}>
        {children}
      </m.div>
      {/* Kontrol alternatif tumpukan ( gesture multi-touch tetap didukung):
          ikon kecil kartu bertumpuk di sudut kartu. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleStack();
        }}
        aria-pressed={stacked}
        aria-label={stacked ? "Buka kembali tumpukan kartu" : "Tampilkan sebagai tumpukan kartu"}
        className="tap absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-tk-line-soft bg-tk-panel-soft/85 text-tk-muted backdrop-blur transition-colors hover:text-tk-ink"
      >
        <Layers size={13} strokeWidth={2} />
      </button>
    </div>
  );
}