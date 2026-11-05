"use client";

/**
 * Tazkiya v4 — "A Better Daily Journey" — Kerangka aplikasi.
 * Rekonstruksi tata letak: kanvas penuh tanpa bingkai ponsel.
 * Mobile: viewport penuh + navigasi kapsul mengambang + safe area.
 * Desktop (lg+): sidebar navigasi proporsional + dashboard lebar
 * multi-kolom. Gerbang hidrasi, tema (gelap/terang/sistem), mode
 * Liquid Glass, transisi antartab, lima menu utama + sub-halaman,
 * pembaca Al-Qur'an, dan Tasbih Digital tetap di satu kerangka ini.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { Toaster } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { BottomNav, SidebarNav, type SubPageId, type TabId } from "@/components/tazkiya/BottomNav";
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
        ?.setAttribute("content", resolved === "light" ? "#F6F6F7" : "#161616");
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

  // Liquid Glass: data-glass pada <html>.
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
      <main className="flex min-h-dvh items-center justify-center bg-tz-stage" aria-label="Memuat Tazkiya">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-tz-pulse flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-tz-violet text-2xl font-bold text-white">
            ت
          </span>
          <div className="text-center">
            <p className="text-[15px] font-bold tracking-[-0.01em] text-tz-ink">Tazkiya</p>
            <p className="v5-overline mt-1.5">A Better Daily Journey</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <main className="relative min-h-dvh w-full bg-tz-stage" aria-label="Aplikasi Tazkiya">
        <div className="flex w-full">
          {/* Sidebar desktop — navigasi vertikal proporsional (lg+) */}
          <SidebarNav active={tab} onChange={(t) => { setSubpage(null); setTab(t); }} subpage={subpage} onOpenSubpage={setSubpage} />

          {/* Kanvas konten: mobile penuh, desktop dashboard lebar.
              min-w-0: hentikan penyebaran min-content dari scroller horizontal
              (baris mood) agar tidak memaksa lebar dokumen melebihi viewport. */}
          <div className="relative min-h-dvh min-w-0 flex-1">
            <div
              id="konten-tazkiya"
              className="no-scrollbar relative z-10 mx-auto w-full max-w-[1120px] px-4 pb-40 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-14 lg:pt-10"
            >
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
          </div>
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

        {/* Navigasi kapsul mengambang (mobile & tablet) */}
        <BottomNav
          active={tab}
          onChange={(t) => {
            setSubpage(null);
            setTab(t);
          }}
        />

        <Toaster
          position="top-center"
          gap={8}
          toastOptions={
            resolvedTheme === "light"
              ? {
                  duration: 2600,
                  style: {
                    background: "#ffffff",
                    border: "1px solid #E9E9EC",
                    color: "#1A1A1E",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    boxShadow: "0 18px 48px -18px rgba(23,23,26,0.25)",
                  },
                }
              : {
                  duration: 2600,
                  style: {
                    background: "#252525",
                    border: "1px solid #383838",
                    color: "#FFFFFF",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    boxShadow: "0 18px 48px -18px rgba(0,0,0,0.7)",
                  },
                }
          }
        />
      </main>
    </LazyMotion>
  );
}
