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