"use client";

/**
 * Tazkiya — Kerangka aplikasi (Islamic Daily Companion).
 * Gerbang hidrasi, bingkai ponsel mobile-first, tema (gelap/terang/sistem),
 * mode Liquid Glass, transisi antartab, lima menu utama (Beranda, Al-Qur'an,
 * Sholat, Progress, Profil) + sub-halaman refleksi dari Beranda (Jurnal
 * Syukur, Zikir & Doa, Rizq & Amal), pembaca Al-Qur'an, dan Tasbih Digital.
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

/* Orb dekoratif untuk latar luar bingkai (desktop).
   Radius blur diatur lewat className agar bisa berbeda antara HP (blur-2xl,
   lebih murah) dan desktop (blur-3xl) tanpa konflik kelas Tailwind. */
function OuterOrb({ className }: { className?: string }) {
  return <div aria-hidden className={`pointer-events-none absolute rounded-full ${className ?? ""}`} />;
}

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
        ?.setAttribute("content", resolved === "light" ? "#F4F2FB" : "#13142B");
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // Saklar "Animasi transisi" juga menghentikan animasi CSS dekoratif (glow bergerak)
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
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-tz-stage">
        <div
          aria-hidden
          className="animate-tz-aurora absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tz-violet/25 blur-[90px] md:h-[420px] md:w-[420px] md:blur-[130px]"
        />
        <div aria-hidden className="absolute bottom-10 right-1/4 h-44 w-44 rounded-full bg-tz-blue/20 blur-[70px] md:h-64 md:w-64 md:blur-[110px]" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="animate-tz-pulse relative flex h-[72px] w-[72px] items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-[#8b7cf8] via-[#6c5ce7] to-[#5b8def] font-display text-3xl font-bold text-white shadow-[0_18px_40px_-16px_rgba(108,92,231,0.75)]">
            ت
          </div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-tz-accent">Tazkiya</p>
        </div>
      </main>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
    <main className="relative flex min-h-dvh w-full items-center justify-center bg-tz-stage" aria-label="Aplikasi Tazkiya">
      {/* Aura latar (desktop / area di luar bingkai) — disembunyikan di HP:
          di layar ≤430px bingkai menutupi seluruh layar sehingga aura ini tak
          terlihat, tetapi 3 lapisan blur besar tetap memakan memori & GPU. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden md:block">
        <div className="animate-tz-aurora absolute left-1/2 top-[28%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tz-purple/30 blur-[90px] md:h-[560px] md:w-[560px] md:blur-[150px]" />
        <div className="absolute bottom-0 right-[16%] h-52 w-52 rounded-full bg-tz-violet/16 blur-[80px] md:h-80 md:w-80 md:blur-[130px]" />
        <div className="absolute left-[8%] top-[12%] h-44 w-44 rounded-full bg-tz-orb-deep/30 blur-[70px] md:h-64 md:w-64 md:blur-[120px]" />
      </div>

      {/* Bingkai ponsel */}
      <div
        role="application"
        className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-tz-frame md:h-[min(880px,94dvh)] md:rounded-[2.4rem] md:border md:border-tz-line md:shadow-[0_50px_140px_-30px_rgba(103,86,232,0.5)]"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="tz-aurora animate-tz-aurora absolute inset-0" />
          {/* Orb dekoratif: versi HP lebih kecil & blur lebih tipis — area filter
              blur tumbuh kuadratik, 4 lapisan besar berarti biaya komposit tinggi. */}
          <OuterOrb className="-right-20 -top-20 h-52 w-52 bg-tz-violet/16 blur-2xl md:-right-28 md:-top-28 md:h-80 md:w-80 md:blur-3xl" />
          <OuterOrb className="-left-24 top-1/3 h-48 w-48 bg-tz-blue/14 blur-2xl md:-left-32 md:h-72 md:w-72 md:blur-3xl" />
          <OuterOrb className="bottom-16 right-0 h-40 w-40 bg-tz-lime/12 blur-2xl md:h-60 md:w-60 md:blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-tz-aurora-a via-transparent to-tz-aurora-b" />
        </div>

        <div id="konten-tazkiya" className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-36 pt-[max(1rem,env(safe-area-inset-top))]">
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
                    background: "rgba(255,255,255,0.97)",
                    border: "1px solid rgba(123,108,246,0.24)",
                    color: "#26243E",
                    borderRadius: "16px",
                    fontSize: "13px",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 12px 40px rgba(103,86,232,0.2)",
                  },
                }
              : {
                  duration: 2600,
                  style: {
                    background: "rgba(28,30,58,0.96)",
                    border: "1px solid rgba(155,140,250,0.32)",
                    color: "#E9E8F8",
                    borderRadius: "16px",
                    fontSize: "13px",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 12px 40px rgba(12,13,31,0.6)",
                  },
                }
        }
      />
    </main>
    </LazyMotion>
  );
}
