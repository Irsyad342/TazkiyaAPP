"use client";

/**
 * Tazkiya — Kerangka aplikasi (Islamic Daily Companion).
 * Gerbang hidrasi, bingkai ponsel mobile-first, tema (gelap/terang/sistem),
 * transisi antartab, lima menu utama (Beranda, Al-Qur'an, Sholat, Progress,
 * Profil) + sub-halaman refleksi dari Beranda (Jurnal Syukur, Zikir & Doa,
 * Rizq & Amal), pembaca Al-Qur'an, dan Tasbih Digital.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { Toaster } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { BottomNav, type SubPageId, type TabId } from "@/components/tazkiya/BottomNav";
import { AuthGate } from "@/components/tazkiya/AuthGate";
import { HomePage } from "@/components/tazkiya/HomePage";
import { QuranPage } from "@/components/tazkiya/QuranPage";
import { PrayerPage } from "@/components/tazkiya/PrayerPage";
import { JurnalPage } from "@/components/tazkiya/JurnalPage";
import { ZikirDoaPage } from "@/components/tazkiya/ZikirDoaPage";
import { RizqAmalPage } from "@/components/tazkiya/RizqAmalPage";
import { ProfilePage } from "@/components/tazkiya/ProfilePage";
import { TasbihSheet } from "@/components/tazkiya/TasbihSheet";
import { TargetSheet } from "@/components/tazkiya/TargetSheet";
import type { ZikirSlot } from "@/lib/tazkiya/types";

/*
 * Pembaca Al-Qur'an dimuat terpisah (lazy) — hanya diunduh saat pengguna
 * membuka surah, sehingga bundle awal tetap kecil di jaringan HP.
 */
const QuranReader = dynamic(() => import("@/components/tazkiya/QuranReader").then((mod) => ({ default: mod.QuranReader })), {
  ssr: false,
  loading: () => null,
});

/*
 * Progress dimuat terpisah (lazy) — pustaka grafik tidak membebani
 * bundle awal sehingga aplikasi terasa ringan saat dibuka pertama kali.
 */
const ProgressPage = dynamic(() => import("@/components/tazkiya/ProgressPage").then((m) => ({ default: m.ProgressPage })), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Memuat progress" className="flex h-72 items-center justify-center">
      <LoaderCircle size={26} className="animate-spin text-tz-violet" />
    </div>
  ),
});

const TAB_TITLES: Record<TabId, string> = {
  beranda: "Tazkiya — Beranda",
  quran: "Tazkiya — Al-Qur'an",
  sholat: "Tazkiya — Sholat",
  progress: "Tazkiya — Progress",
  profil: "Tazkiya — Profil",
};

const SUBPAGE_TITLES: Record<SubPageId, string> = {
  jurnal: "Tazkiya — Jurnal Syukur",
  "zikir-doa": "Tazkiya — Zikir & Doa",
  "rizq-amal": "Tazkiya — Rizq & Amal",
};

/* Deteksi runtime Capacitor (APK) tanpa dependensi langsung. */
function capacitorNative(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
  } catch {
    return false;
  }
}

export default function Page() {
  const hydrated = useSyncExternalStore(
    (cb) => useWorshipStore.persist.onFinishHydration(cb),
    () => useWorshipStore.persist.hasHydrated(),
    () => false
  );

  const [tab, setTab] = useState<TabId>("beranda");
  const [subpage, setSubpage] = useState<SubPageId | null>(null);
  const [tasbihOpen, setTasbihOpen] = useState(false);
  const [tasbihSlot, setTasbihSlot] = useState<ZikirSlot>("harian");
  const [targetOpen, setTargetOpen] = useState(false);
  const [reader, setReader] = useState<{ surah: number; ayah?: number } | null>(null);

  const animations = useWorshipStore((s) => s.settings.animations);
  const theme = useWorshipStore((s) => s.settings.theme);
  const liquidGlass = useWorshipStore((s) => s.settings.liquidGlass);
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const readerRef = useRef<{ surah: number; ayah?: number } | null>(null);
  const tasbihRef = useRef(false);
  useEffect(() => {
    readerRef.current = reader;
    tasbihRef.current = tasbihOpen;
  }, [reader, tasbihOpen]);

  // Hidrasi manual setelah mount (localStorage).
  useEffect(() => {
    useWorshipStore.persist.rehydrate();
  }, []);

  // Tema: data-theme pada <html>; "system" mengikuti preferensi perangkat.
  useEffect(() => {
    const html = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "light" : "dark") : theme;
      html.dataset.theme = resolved;
      setResolvedTheme(resolved);
      // Warna bilah status/URL browser mengikuti tema aktif.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "light" ? "#F7F7FC" : "#15121D");
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // Saklar "Animasi transisi" juga menghentikan animasi CSS dekoratif
  // agar perangkat lambat tetap ringan bila pengguna mematikan animasi.
  useEffect(() => {
    document.documentElement.dataset.anim = animations ? "on" : "off";
  }, [animations]);

  // Liquid Glass: data-glass pada <html> (mengubah permukaan kartu).
  useEffect(() => {
    document.documentElement.dataset.glass = liquidGlass ? "liquid" : "classic";
  }, [liquidGlass]);

  // Judul dokumen per tab / sub-halaman.
  useEffect(() => {
    document.title = subpage ? SUBPAGE_TITLES[subpage] : TAB_TITLES[tab];
  }, [tab, subpage]);

  // Tombol kembali perangkat (khusus APK/Capacitor).
  useEffect(() => {
    if (!capacitorNative()) return;
    let cleanup = () => {};
    (async () => {
      try {
        const plugins = (
          window as unknown as { Capacitor?: { Plugins?: Record<string, { addListener?: (ev: string, cb: () => void) => unknown }> } }
        ).Capacitor?.Plugins;
        const App = plugins?.App;
        if (App?.addListener) {
          const handle = App.addListener("backButton", () => {
            if (readerRef.current) setReader(null);
            else if (tasbihRef.current) setTasbihOpen(false);
            else (App as unknown as { exitApp?: () => void }).exitApp?.();
          });
          cleanup = () => {
            try {
              (handle as unknown as { remove?: () => void })?.remove?.();
            } catch {
              /* abaikan */
            }
          };
        }
      } catch {
        /* bukan lingkungan native */
      }
    })();
    return () => cleanup();
  }, []);

  // Status bar mengikuti tema (khusus APK/Capacitor).
  useEffect(() => {
    if (!capacitorNative()) return;
    (async () => {
      try {
        const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, { setStyle?: (o: { style: string }) => Promise<void> }> } }).Capacitor?.Plugins;
        await plugins?.StatusBar?.setStyle?.({ style: resolvedTheme === "light" ? "Dark" : "Light" });
      } catch {
        /* abaikan */
      }
    })();
  }, [resolvedTheme]);

  const openReader = useCallback((surah: number, ayah?: number) => setReader({ surah, ayah }), []);
  const closeReader = useCallback(() => setReader(null), []);
  const openTasbih = useCallback((slot?: ZikirSlot) => {
    setTasbihSlot(slot ?? "harian");
    setTasbihOpen(true);
  }, []);
  const openTargets = useCallback(() => setTargetOpen(true), []);
  /** "Lanjutkan Tracker" (Fokus Ibadah, halaman Profil) → halaman Sholat. */
  const goTracker = useCallback(() => {
    setSubpage(null);
    setTab("sholat");
  }, []);

  if (!hydrated) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-tz-stage">
        <div aria-hidden className="tz-blob left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 bg-tz-violet/25 md:h-[420px] md:w-[420px]" />
        <div aria-hidden className="tz-blob bottom-10 right-1/4 h-44 w-44 bg-tz-lime/25" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="animate-tz-pulse relative flex h-[76px] w-[76px] items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-tz-violet to-tz-lavender font-display text-3xl font-extrabold text-white shadow-[0_24px_50px_-20px_rgba(122,104,224,0.65)]">
            ت
            <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-tz-lime text-[9px] font-black text-tz-lime-ink">
              ✓
            </span>
          </div>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.24em] text-tz-muted">Tazkiya</p>
        </div>
      </main>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
    <main className="relative flex min-h-dvh w-full items-center justify-center bg-tz-stage" aria-label="Aplikasi Tazkiya">
      {/* Blob pastel di luar bingkai (desktop) — statis & murah */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden md:block">
        <div className="tz-blob left-[10%] top-[12%] h-72 w-72 bg-tz-violet/20" />
        <div className="tz-blob bottom-[8%] right-[12%] h-64 w-64 bg-tz-lime/25" />
        <div className="tz-blob bottom-[30%] left-[24%] h-44 w-44 bg-tz-lavender/25" />
      </div>

      {/* Bingkai ponsel */}
      <div
        role="application"
        className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-tz-frame md:h-[min(880px,94dvh)] md:rounded-[2.6rem] md:border md:border-tz-line md:shadow-[0_60px_140px_-40px_rgba(84,70,160,0.45)]"
      >
        {/* Sorot lavender lembut di tepi atas — statis, memberi kedalaman tipis */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="tz-blob -right-16 -top-16 h-56 w-56 bg-tz-violet/10 light:bg-tz-violet/15" />
          <div className="tz-blob -left-20 bottom-24 h-48 w-48 bg-tz-lime/10 light:bg-tz-lime/15" />
        </div>

        <div id="konten-tazkiya" className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={subpage ?? tab}
              initial={{ opacity: 0, y: 10 * (animations ? 1 : 0) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: animations ? -8 : 0 }}
              transition={{ duration: 0.16 * (animations ? 1 : 0), ease: "easeOut" }}
            >
              {subpage === null && tab === "beranda" && (
                <HomePage
                  onNavigate={(t) => {
                    setSubpage(null);
                    setTab(t);
                  }}
                  onOpenSubpage={setSubpage}
                />
              )}
              {subpage === null && tab === "quran" && <QuranPage onOpenReader={openReader} />}
              {subpage === null && tab === "sholat" && <PrayerPage />}
              {subpage === null && tab === "progress" && <ProgressPage />}
              {subpage === null && tab === "profil" && <ProfilePage onOpenTargets={openTargets} onGoTracker={goTracker} />}

              {subpage === "jurnal" && <JurnalPage onBack={() => setSubpage(null)} />}
              {subpage === "zikir-doa" && <ZikirDoaPage onBack={() => setSubpage(null)} onOpenTasbih={openTasbih} />}
              {subpage === "rizq-amal" && <RizqAmalPage onBack={() => setSubpage(null)} />}
            </m.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {reader && (
            <QuranReader key={`${reader.surah}-${reader.ayah ?? 0}`} surah={reader.surah} startAyah={reader.ayah} onClose={closeReader} />
          )}
        </AnimatePresence>

        <AnimatePresence>{tasbihOpen && <TasbihSheet open={tasbihOpen} onClose={() => setTasbihOpen(false)} slot={tasbihSlot} />}</AnimatePresence>

        <AnimatePresence>{targetOpen && <TargetSheet onClose={() => setTargetOpen(false)} />}</AnimatePresence>

        {/* Gerbang akun: inisialisasi sesi + dialog keputusan data (migrasi/gabung). */}
        <AuthGate />

        {/* Ganti tab menutup sub-halaman yang terbuka agar navigasi tidak "nyangkut". */}
        <BottomNav
          active={tab}
          onChange={(t) => {
            setSubpage(null);
            setTab(t);
          }}
        />
      </div>

      <Toaster
        position="top-center"
        gap={8}
        toastOptions={
          resolvedTheme === "light"
            ? {
                duration: 2600,
                style: {
                  background: "#ffffff",
                  border: "1px solid #EEEAF5",
                  color: "#1D1C27",
                  borderRadius: "18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  boxShadow: "0 18px 44px -18px rgba(84,70,160,0.35)",
                },
              }
            : {
                duration: 2600,
                style: {
                  background: "#2B2338",
                  border: "1px solid #3A3152",
                  color: "#F7F4FF",
                  borderRadius: "18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  boxShadow: "0 18px 44px -18px rgba(0,0,0,0.65)",
                },
              }
        }
      />
    </main>
    </LazyMotion>
  );
}
