"use client";

/**
 * Tazkiya — Hook tekan-dan-tahan (long press) untuk kartu salat.
 * - Terpicu setelah kartu ditahan ~1 detik (700ms–1200ms dirasa "sekitar 1 detik").
 * - Dibatalkan bila pengguna menggeser jari (scroll) > ambang kecil,
 *   melepas sebelum waktunya, atau gestur dibatalkan sistem (pointercancel).
 * - Setelah terpicu, klik yang mengikuti (phantom click) diabaikan.
 * - Getar halus sebagai umpan balik (menghormati preferensi getar pengguna).
 * - Kartu tetap <button>: klik biasa / Enter / Space tetap berfungsi sebagai
 *   alternatif aksesibilitas (membuka sheet, TIDAK mengubah status langsung).
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useLongPress(onLongPress: () => void, opts?: { ms?: number; vibrate?: boolean }) {
  const ms = opts?.ms ?? 1000;
  const vibrate = opts?.vibrate ?? true;
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPressing(false);
  }, []);

  // Bersihkan timer bila komponen unmount.
  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      setPressing(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fired.current = true;
        setPressing(false);
        timer.current = null;
        if (vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(18);
          } catch {
            /* abaikan — getar opsional */
          }
        }
        onLongPress();
      }, ms);
    },
    [ms, onLongPress, vibrate]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (timer.current === null) return;
      const dx = Math.abs(e.clientX - origin.current.x);
      const dy = Math.abs(e.clientY - origin.current.y);
      // Pengguna menggulir — batalkan deteksi agar tidak mengganggu scroll.
      if (dx > 10 || dy > 10) clear();
    },
    [clear]
  );

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // Klik setelah long-press terpicu = sisa gestur; jangan buka sheet dua kali.
    if (fired.current) {
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    }
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Tekan-lama pada sentuh tidak boleh memunculkan menu konteks bawaan.
    if (timer.current !== null || fired.current) e.preventDefault();
  }, []);

  return {
    pressing,
    longPressProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
      onClickCapture,
      onContextMenu,
    },
  };
}
