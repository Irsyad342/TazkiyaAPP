"use client";

/**
 * Tazkiya — Kerangka aplikasi.
 * Gerbang hidrasi, bingkai ponsel mobile-first, tema (gelap/terang/sistem),
 * mode Liquid Glass, transisi antartab, pembaca Al-Qur'an, dan Tasbih Digital.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { Toaster } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { BottomNav, type TabId } from "@/components/tazkiya/BottomNav";
import { HomePage } from "@/components/tazkiya/HomePage";
import { QuranPage } from "@/components/tazkiya/QuranPage";
import { ProfilePage } from "@/components/tazkiya/ProfilePage";
import { TasbihSheet } from "@/components/tazkiya/TasbihSheet";
import { TargetSheet } from "@/components/tazkiya/TargetSheet";

/*
 * Pembaca Al-Qur'an dimuat terpisah (lazy) — hanya diunduh saat pengguna
 * membuka surah, sehingga bundle awal tetap kecil di jaringan HP.
 */
const QuranReader = dynamic(() => import("@/components/tazkiya/QuranReader").then((mod) => ({ default: mod.QuranReader })), {
  ssr: false,
  loading: () => null,
});

/*
 * Statistik dimuat terpisah (lazy) — pustaka grafik tidak membebani
 * bundle awal sehingga aplikasi terasa ringan saat dibuka pertama kali.
 */
const StatsPage = dynamic(() => import("@/components/tazkiya/StatsPage").then((m) => ({ default: m.StatsPage })), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Memuat statistik" className="flex h-72 items-center justify-center">
      <LoaderCircle size={26} className="animate-spin text-tz-violet" />
    </div>
  ),
});

/* Orb dekoratif besar untuk latar luar bingkai (desktop). */
function OuterOrb({ className }: { className?: string }) {
  return <div aria-hidden className={`pointer-events-none absolute rounded-full blur-3xl ${className ?? ""}`} />;
}

const TAB_TITLES: Record<TabId, string> = {
  beranda: "Tazkiya — Beranda",
  quran: "Tazkiya — Al-Qur'an",
  statistik: "Tazkiya — Statistik",
  profil: "Tazkiya — Profil",
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
  const [tasbihOpen, setTasbihOpen] = useState(false);
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
        ?.setAttribute("content", resolved === "light" ? "#F5F1F5" : "#171321");
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

  // Judul dokumen per tab.
  useEffect(() => {
    document.title = TAB_TITLES[tab];
  }, [tab]);

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
  const openTasbih = useCallback(() => setTasbihOpen(true), []);
  const openTargets = useCallback(() => setTargetOpen(true), []);

  if (!hydrated) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-tz-stage">
        <div
          aria-hidden
          className="animate-tz-aurora absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tz-purple/30 blur-[90px] md:h-[420px] md:w-[420px] md:blur-[130px]"
        />
        <div aria-hidden className="absolute bottom-10 right-1/4 h-44 w-44 rounded-full bg-tz-violet/16 blur-[70px] md:h-64 md:w-64 md:blur-[110px]" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="animate-tz-pulse relative flex h-[72px] w-[72px] items-center justify-center rounded-[1.6rem] border border-tz-violet/40 bg-gradient-to-br from-tz-purple to-tz-violet font-display text-3xl font-bold text-white">
            ت
          </div>
          <p className="text-glow font-display text-sm font-semibold uppercase tracking-[0.22em] text-tz-accent">Tazkiya</p>
        </div>
      </main>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
    <main className="relative flex min-h-dvh w-full items-center justify-center bg-tz-stage" aria-label="Aplikasi Tazkiya">
      {/* Aura latar (desktop / area di luar bingkai) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-tz-aurora absolute left-1/2 top-[28%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tz-purple/30 blur-[90px] md:h-[560px] md:w-[560px] md:blur-[150px]" />
        <div className="absolute bottom-0 right-[16%] h-52 w-52 rounded-full bg-tz-violet/16 blur-[80px] md:h-80 md:w-80 md:blur-[130px]" />
        <div className="absolute left-[8%] top-[12%] h-44 w-44 rounded-full bg-tz-orb-deep/30 blur-[70px] md:h-64 md:w-64 md:blur-[120px]" />
      </div>

      {/* Bingkai ponsel */}
      <div
        role="application"
        className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-tz-frame md:h-[min(880px,94dvh)] md:rounded-[2.4rem] md:border md:border-tz-line md:shadow-[0_50px_140px_-30px_rgba(85,51,154,0.55)]"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="tz-aurora animate-tz-aurora absolute inset-0" />
          <OuterOrb className="-right-28 -top-28 h-80 w-80 bg-tz-violet/20" />
          <OuterOrb className="-left-32 top-1/3 h-72 w-72 bg-tz-purple/25" />
          <OuterOrb className="bottom-16 right-0 h-60 w-60 bg-tz-violet/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-tz-aurora-a via-transparent to-tz-aurora-b" />
        </div>

        <div id="konten-tazkiya" className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-36 pt-[max(1rem,env(safe-area-inset-top))]">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={tab}
              initial={{ opacity: 0, y: 14 * (animations ? 1 : 0) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: animations ? -10 : 0 }}
              transition={{ duration: 0.22 * (animations ? 1 : 0), ease: "easeOut" }}
            >
              {tab === "beranda" && <HomePage onNavigate={setTab} onOpenTasbih={openTasbih} />}
              {tab === "quran" && <QuranPage onOpenReader={openReader} />}
              {tab === "statistik" && <StatsPage />}
              {tab === "profil" && <ProfilePage onOpenTargets={openTargets} />}
            </m.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {reader && (
            <QuranReader key={`${reader.surah}-${reader.ayah ?? 0}`} surah={reader.surah} startAyah={reader.ayah} onClose={closeReader} />
          )}
        </AnimatePresence>

        <AnimatePresence>{tasbihOpen && <TasbihSheet open={tasbihOpen} onClose={() => setTasbihOpen(false)} />}</AnimatePresence>

        <AnimatePresence>{targetOpen && <TargetSheet onClose={() => setTargetOpen(false)} />}</AnimatePresence>

        <BottomNav active={tab} onChange={setTab} />
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
                  border: "1px solid rgba(117,70,200,0.28)",
                  color: "#292331",
                  borderRadius: "16px",
                  fontSize: "13px",
                  backdropFilter: "blur(14px)",
                  boxShadow: "0 12px 40px rgba(85,51,154,0.22)",
                },
              }
            : {
                duration: 2600,
                style: {
                  background: "rgba(36,27,58,0.95)",
                  border: "1px solid rgba(156,114,239,0.35)",
                  color: "#F2EEFB",
                  borderRadius: "16px",
                  fontSize: "13px",
                  backdropFilter: "blur(18px)",
                  boxShadow: "0 12px 40px rgba(13,10,20,0.6)",
                },
              }
        }
      />
    </main>
    </LazyMotion>
  );
}
