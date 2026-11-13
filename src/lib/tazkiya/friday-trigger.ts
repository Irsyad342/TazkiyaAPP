/**
 * Tazkiya — Mesin pemicu pengalaman khusus Salat Jumat.
 *
 * Meniru pola reminder-trigger.ts (keandalan terbukti):
 * - Tick 20 detik, menunggu hidrasi persist, membaca state terkini lewat
 *   getState() — aman terhadap reload/crash.
 * - Layar penuh "Jumat Telah Menyapa" muncul N menit sebelum waktu
 *   pelaksanaan (pengaturan pengguna, default 30) — SEKALI per Jumat.
 *   Saat halaman tersembunyi → notifikasi sistem (bila didukung & diizinkan),
 *   overlay menunggu hingga pengguna kembali di Beranda.
 * - Empat pengingat notifikasi (sebelum waktu / saat tiba / persiapan /
 *   Al-Kahfi) — masing-masing MAKSIMAL SEKALI per tanggal (penanda lokal di
 *   localStorage, tahan crash), dan tidak pernah berulang.
 * - Bukan penilaian ibadah: pengingat tiba TIDAK menganggap salat sudah
 *   dilaksanakan — pencatatan tetap manual lewat mekanisme existing.
 * - Salat Jumat yang sudah dicatat selesai tidak diingatkan lagi.
 * - Nonaktif ketika: setelan `friday.enabled` mati, bukan hari Jumat, atau
 *   pengguna memilih alternatif Zuhur pada tanggal itu.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorshipStore } from "./store";
import { resolvePrayerSchedule } from "./prayerTimes";
import { isFriday, todayKey } from "./dates";
import { DEFAULT_FRIDAY_SETTINGS } from "./types";
import { fridayTimeOf, minutesOf, notifyFriday } from "./friday";

const TICK_SEC = 20;
const FLAG_KEY = "suio-friday-notified-v1";

export interface ActiveFridayReminder {
  date: string;
  /** Waktu pelaksanaan efektif "HH:MM". */
  jumatTime: string;
  /** true bila memakai waktu masuk Zuhur (belum diatur pengguna). */
  fallback: boolean;
}

/* ---------- Penanda sekali-per-tanggal (perangkat lokal) ---------- */

function loadFlags(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(FLAG_KEY) ?? "{}") as Record<string, string[]>;
  } catch {
    return {};
  }
}

function markFlag(date: string, kind: string): void {
  try {
    const flags = loadFlags();
    const list = new Set(flags[date] ?? []);
    list.add(kind);
    flags[date] = [...list];
    localStorage.setItem(FLAG_KEY, JSON.stringify(flags));
  } catch {
    /* penyimpanan penuh / mode privat — pengingat boleh gagal senyap */
  }
}

function hasFlag(date: string, kind: string): boolean {
  return (loadFlags()[date] ?? []).includes(kind);
}

/* ---------- Pesan pengingat ---------- */

function fridayMessages(jumatTime: string, fallback: boolean) {
  const refer = fallback ? "Waktu pelaksanaan di masjid dapat berbeda." : `Pelaksanaan pukul ${jumatTime.replace(":", ".")}.`;
  return {
    fullscreen: {
      title: "Jumat Telah Menyapa",
      body: `Luangkan waktu sejenak untuk mempersiapkan diri menuju Salat Jumat. ${refer}`,
    },
    before: {
      title: "15 menit menuju Salat Jumat",
      body: `Bersiaplah — ${refer}`,
    },
    atTime: {
      title: "Salat Jumat telah tiba",
      body: `Waktunya Salat Jumat. Catat pelaksanaanmu setelah selesai. ${refer}`,
    },
    prep: {
      title: "Persiapkan Jumatmu",
      body: "Checklist persiapan hari ini menantimu: mandi Jumat, pakaian terbaik, Al-Kahfi, dan selawat.",
    },
    kahfi: {
      title: "Waktu membaca Al-Kahfi",
      body: "Sunnah Jumat: baca Surah Al-Kahfi hari ini. Tandai di checklist persiapanmu.",
    },
  } as const;
}

/**
 * Hook mesin pemicu. `homeVisible` = pengguna sedang di Beranda.
 * Mengembalikan pengalaman layar penuh aktif (atau null) beserta dismiss.
 */
export function useFridayExperience(homeVisible: boolean): {
  friday: ActiveFridayReminder | null;
  dismiss: () => void;
} {
  const [friday, setFriday] = useState<ActiveFridayReminder | null>(null);
  const dismiss = useCallback(() => setFriday(null), []);
  const homeRef = useRef(homeVisible);
  useEffect(() => {
    homeRef.current = homeVisible;
  }, [homeVisible]);

  const tick = useCallback(() => {
    setFriday((active) => {
      if (active) return active;
      if (!useWorshipStore.persist.hasHydrated()) return null;
      const cur = useWorshipStore.getState();
      const now = new Date();
      const today = todayKey();
      if (!isFriday(today)) return null;
      const fs = cur.settings.friday ?? DEFAULT_FRIDAY_SETTINGS;
      if (!fs.enabled) return null;
      // Pengguna memilih alternatif Zuhur → perlakukan seperti hari biasa.
      if (cur.fridayZuhurAlt?.[today]) return null;

      const schedule = resolvePrayerSchedule(cur.settings, today);
      const info = fridayTimeOf(fs, schedule.zuhur?.time);
      const jumatMin = minutesOf(info.time);
      const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      // Sudah jauh lewat (jendela Jumat berlalu > 90 menit) → tidak menampilkan terlambat.
      if (nowMin > jumatMin + 90) return null;

      // Salat Jumat sudah dicatat selesai → tidak perlu layar penuh/pengingat waktu.
      const recorded = cur.prayerDetails[today]?.zuhur?.status === "done" || !!cur.logs[today]?.prayers?.zuhur;

      // --- Pengingat notifikasi (urut waktu hari) ---
      const msg = fridayMessages(info.time, info.fallback);
      if (fs.notif.prep && !hasFlag(today, "prep") && nowMin >= minutesOf(fs.prepTime) && nowMin < jumatMin) {
        markFlag(today, "prep");
        notifyFriday(msg.prep.title, msg.prep.body, `suio-friday-prep-${today}`);
      }
      if (fs.notif.kahfi && !hasFlag(today, "kahfi") && nowMin >= minutesOf(fs.kahfiTime) && nowMin < jumatMin) {
        markFlag(today, "kahfi");
        notifyFriday(msg.kahfi.title, msg.kahfi.body, `suio-friday-kahfi-${today}`);
      }
      if (fs.notif.before && !hasFlag(today, "before") && !recorded && nowMin >= jumatMin - 15 && nowMin < jumatMin) {
        markFlag(today, "before");
        notifyFriday(msg.before.title, msg.before.body, `suio-friday-before-${today}`);
      }
      if (fs.notif.atTime && !hasFlag(today, "atTime") && !recorded && nowMin >= jumatMin && nowMin <= jumatMin + 90) {
        markFlag(today, "atTime");
        notifyFriday(msg.atTime.title, msg.atTime.body, `suio-friday-at-${today}`);
      }

      // --- Layar penuh "Jumat Telah Menyapa" ---
      const fsMin = fs.fullscreenMinutes ?? DEFAULT_FRIDAY_SETTINGS.fullscreenMinutes;
      if (fsMin > 0 && !hasFlag(today, "fullscreen") && !recorded && nowMin >= jumatMin - fsMin && nowMin <= jumatMin + 90) {
        markFlag(today, "fullscreen"); // catat SEBELUM render — anti duplikat
        const remind: ActiveFridayReminder = { date: today, jumatTime: info.time, fallback: info.fallback };
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          notifyFriday(msg.fullscreen.title, msg.fullscreen.body, `suio-friday-full-${today}`);
          return null;
        }
        if (!homeRef.current) {
          // Belum di Beranda → pengalaman ditunggu-tunggu, belum dicatat ulang;
          // penanda sudah terpasang sehingga tidak muncul dua kali.
          return remind;
        }
        return remind;
      }
      return null;
    });
  }, []);

  useEffect(() => {
    tick();
    const iv = window.setInterval(tick, TICK_SEC * 1000);
    const off = useWorshipStore.persist.onFinishHydration(() => tick());
    const t0 = window.setTimeout(tick, 1200);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(t0);
      off();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tick]);

  return { friday, dismiss };
}
