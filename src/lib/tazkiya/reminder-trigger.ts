/**
 * Tazkiya — Mesin pemicu Pengingat Layar Penuh waktu salat.
 *
 * Aturan perilaku (sesuai spesifikasi fitur):
 * - Pemicu HANYA setelah waktu salat MASUK — memakai jadwal efektif existing
 *   (resolvePrayerSchedule: GPS otomatis / manual) dan zona waktu perangkat.
 * - Satu salat ditampilkan MAKSIMAL SEKALI per waktunya: setiap penyampaian
 *   (overlay ATAU notifikasi) langsung dicatat ke store `reminderShown`
 *   (salat → tanggal) sebelum apa pun dirender — tahan terhadap crash/reload.
 * - Ketika aplikasi terlihat & pengguna di Beranda → overlay layar penuh.
 *   Di tab lain, penyampaian DITAHAN hingga pengguna kembali ke Beranda
 *   (selama waktunya masih berjalan).
 * - Ketika halaman tersembunyi (latar) → notifikasi sistem HANYA bila platform
 *   mendukung Notification API dan izin sudah diberikan. Tanpa service worker,
 *   notifikasi hanya berlaku saat halaman masih hidup — TIDAK diklaim bisa
 *   membangunkan browser yang tertutup.
 * - Salat yang sudah dicatat "done" untuk hari itu tidak diingatkan lagi.
 * - Salat yang jendelanya sudah lewat (digantikan salat berikutnya) tidak
 *   disampaikan terlambat — pengingat waktunya sudah hilang.
 * - Prioritas: jika refleksi mingguan terbuka, overlay reminder selalu DI ATAS;
 *   refleksi menunggu (lihat wiring page.tsx).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorshipStore } from "./store";
import { resolvePrayerSchedule } from "./prayerTimes";
import { nextPrayerState } from "./goals";
import { PRAYERS, type PrayerId } from "./types";
import { todayKey } from "./dates";

/** Durasi kilat pemeriksaan waktu (detik) — cukup rapat, hemat baterai. */
const TICK_SEC = 20;

export interface ActivePrayerReminder {
  prayer: PrayerId;
  /** Waktu masuk "HH:MM" sesuai jadwal efektif. */
  time: string;
  /** Pesan pengingat sesuai salat. */
  message: string;
}

/** Pesan pengingat per salat (satu sumber untuk overlay & notifikasi). */
export function reminderMessage(prayer: PrayerId): string {
  switch (prayer) {
    case "subuh":
      return "Waktu Subuh telah tiba. Awali harimu dengan mengingat Allah.";
    case "zuhur":
      return "Waktu Zuhur telah tiba. Luangkan waktu untuk berhenti sejenak dan menunaikan salat.";
    case "asar":
      return "Waktu Asar telah tiba. Jaga konsistensi ibadahmu.";
    case "magrib":
      return "Waktu Magrib telah tiba. Sambut senja dengan menunaikan salat.";
    case "isya":
      return "Waktu Isya telah tiba. Tutup harimu dengan ibadah.";
  }
}

/** Dukungan & izin notifikasi sistem (aman untuk semua browser). */
export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

/** Minta izin notifikasi (dipanggil hanya dari gestur pengguna). */
export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notifySupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Kirim notifikasi sistem satu kali — false bila tidak mungkin/tidak diizinkan. */
function deliverSystemNotification(reminder: ActivePrayerReminder): boolean {
  if (!notifySupported() || Notification.permission !== "granted") return false;
  try {
    const label = PRAYERS.find((p) => p.id === reminder.prayer)?.label ?? reminder.prayer;
    const n = new Notification(`Waktu ${label} telah masuk`, {
      body: reminder.message,
      tag: `suio-prayer-${reminder.prayer}`, // anti notifikasi ganda dari OS
    });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* abaikan */
      }
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook mesin pemicu. `homeVisible` = pengguna sedang di tab Beranda.
 * Mengembalikan reminder aktif yang harus dirender sebagai overlay
 * (selalu null saat halaman tersembunyi — penyampaian latar via notifikasi)
 * beserta `dismiss` untuk menutupnya dari luar (tombol X / navigasi).
 */
export function usePrayerReminder(homeVisible: boolean): {
  reminder: ActivePrayerReminder | null;
  dismiss: () => void;
} {
  const [reminder, setReminder] = useState<ActivePrayerReminder | null>(null);
  /** Tutup overlay; pengingat tidak tampil lagi untuk waktunya (sudah ditandai). */
  const dismiss = useCallback(() => setReminder(null), []);
  const homeRef = useRef(homeVisible);
  useEffect(() => {
    homeRef.current = homeVisible;
  }, [homeVisible]);

  /**
   * Satu langkah pemeriksaan. Selalu membaca state TERKINI lewat
   * useWorshipStore.getState() dan menunggu hidrasi persist selesai —
   * tanpa ini, tick pertama membaca nilai bawaan (reminderShown kosong,
   * jadwal default) sehingga pengingat bisa tampil ulang setelah reload.
   */
  const tick = useCallback(() => {
    setReminder((active) => {
      if (active) return active;
      if (!useWorshipStore.persist.hasHydrated()) return null;
      const cur = useWorshipStore.getState();
      const now = new Date();
      const today = todayKey();
      // Jadwal efektif hari ini (GPS otomatis atau manual) — bukan waktu statis.
      const times = resolvePrayerSchedule(cur.settings, today);
      const state = nextPrayerState(times, now);
      const current = state.current;
      if (!current) return null; // belum masuk waktu salat mana pun hari ini
      // Preferensi pengguna (default aktif).
      if (cur.settings.fullscreenReminder === false) return null;
      // Sudah pernah disampaikan pada waktunya ini?
      if (cur.reminderShown[current] === today) return null;
      // Sudah dicatat selesai oleh pengguna → tidak perlu diingatkan.
      const detail = cur.prayerDetails[today]?.[current];
      if (detail?.status === "done" || cur.logs[today]?.prayers?.[current]) return null;

      const reminderNow: ActivePrayerReminder = {
        prayer: current,
        time: times[current].time,
        message: reminderMessage(current),
      };

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        // Latar: notifikasi sistem bila didukung & diizinkan; overlay menunggu.
        deliverSystemNotification(reminderNow);
        cur.markReminderShown(current, today);
        return null;
      }
      // Terlihat: overlay hanya saat pengguna di Beranda; selama belum,
      // penyampaian ditahan (belum dicatat) agar tidak pernah terlewat.
      if (!homeRef.current) return null;
      cur.markReminderShown(current, today); // catat SEBELUM render — anti duplikat
      return reminderNow;
    });
  }, []);

  useEffect(() => {
    tick();
    const iv = window.setInterval(tick, TICK_SEC * 1000);
    // Tick segera setelah hidrasi persist selesai (data pengguna siap).
    const off = useWorshipStore.persist.onFinishHydration(() => tick());
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(iv);
      off();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tick]);

  return { reminder, dismiss };
}
