"use client";

/**
 * Tazkiya v8 — kerangka aplikasi MOBILE-ONLY.
 * Seluruh aplikasi selalu tampil sebagai kolom HP (maks 430px) di tengah
 * layar — di perangkat mobile penuh, di desktop terbingkai rapi di atas
 * panggung yang lebih gelap/terang. Navigasi selalu BottomNav kapsul;
 * tata letak desktop/sidebar dihapus total (v7 ke bawah).
 * Gerbang hidrasi, tema (gelap/terang/sistem), transisi
 * antartab, lima menu utama + sub-halaman, pembaca Al-Qur'an, dan Tasbih
 * Digital tetap di satu kerangka ini. Gerbang onboarding v12 menambahkan
 * satu keputusan sebelum kerangka dirender: kunjungan pertama per perangkat
 * diarahkan ke /onboarding (lihat efek "Gerbang onboarding" di bawah).
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { Toaster } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { isOnboarded, markOnboarded, clearOnboarded, subscribeOnboarding, getOnboardedSnapshot, getOnboardedServerSnapshot } from "@/lib/tazkiya/onboarding";
import { useAuthStore } from "@/lib/auth/auth-store";
import { initSyncBridge } from "@/lib/sync/cloud-sync";
import { BottomNav, type SubPageId, type TabId } from "@/components/tazkiya/BottomNav";
import { SuioMark } from "@/components/tazkiya/brand";
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
      <LoaderCircle size={26} className="animate-spin text-tk-violet" />
    </div>
  ),
});

const TAB_TITLES: Record<TabId, string> = {
  beranda: "SUIO: Beranda",
  quran: "SUIO: Al-Qur'an",
  sholat: "SUIO: Sholat",
  progress: "SUIO: Progress",
  profil: "SUIO: Profil",
};

const SUBPAGE_TITLES: Record<SubPageId, string> = {
  jurnal: "SUIO: Jurnal Syukur",
  "zikir-doa": "SUIO: Zikir & Doa",
  "rizq-amal": "SUIO: Rizq & Amal",
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

  // Gerbang alur (v14): status onboarding dan autentikasi dikelola
  // TERPISAH. Sesi valid → langsung Beranda; kunjungan pertama tanpa
  // sesi → /onboarding; logout/sesi berakhir → flag onboarding dihapus
  // dan pengguna kembali ke /onboarding (bukan /auth). Mode
  // unconfigured (deployment tanpa Supabase) tetap boleh memakai
  // aplikasi secara lokal seperti sebelumnya. Sesi yang tak kunjung
  // pasti (jaringan lambat) diperlakukan seperti pengguna baru setelah
  // batas 3 detik.
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const onboarded = useSyncExternalStore(subscribeOnboarding, getOnboardedSnapshot, getOnboardedServerSnapshot);

  useEffect(() => {
    if (onboarded) return;
    initSyncBridge();
    void useAuthStore.getState().initAuth();
    const t = window.setTimeout(() => {
      if (!isOnboarded() && useAuthStore.getState().status === "loading") router.replace("/onboarding");
    }, 3000);
    return () => window.clearTimeout(t);
  }, [onboarded, router]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "signedIn") {
      // Pengguna berseksi valid selalu masuk Beranda, apa pun flag-nya.
      if (!onboarded) markOnboarded(); // memberi tahu pelanggan → snapshot berubah
      return;
    }
    if (!onboarded || authStatus === "signedOut") {
      // Logout: hapus flag onboarding agar alur berikutnya adalah
      // onboarding → pilih tema → login, bukan langsung /auth.
      if (authStatus === "signedOut" && onboarded) clearOnboarded();
      router.replace("/onboarding");
    }
    // unconfigured + sudah onboarding → mode lokal, tetap di aplikasi.
  }, [authStatus, onboarded, router]);

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
        ?.setAttribute("content", resolved === "light" ? "#F2F2F4" : "#1B1B1E");
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

  // Judul dokumen per tab / sub-halaman.
  useEffect(() => {
    document.title = subpage ? SUBPAGE_TITLES[subpage] : TAB_TITLES[tab];
  }, [tab, subpage]);

  /*
   * Perbaikan v13: posisi gulir SELALU kembali ke atas saat berpindah tab
   * atau membuka/menutup sub-halaman fitur (Rizq & Amal, Zikir & Doa,
   * Jurnal Syukur). Tanpa ini, konten baru tampil pada posisi gulir lama
   * sehingga halaman terasa "muncul dari bawah". Efek ini sengaja HANYA
   * bergantung pada [tab, subpage] agar membuka sheet/dialog kecil
   * (tasbih, target, pembaca) tidak mengganggu posisi gulir.
   */
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.getElementById("konten-tazkiya")?.scrollTo({ top: 0, behavior: "instant" });
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

  if (!hydrated || !onboarded) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#101013] light:bg-[#e8e8ec]" aria-label="Memuat SUIO">
        <div className="flex flex-col items-center gap-4">
          <SuioMark size={56} glow className="animate-tk-pulse" />
          <div className="text-center">
            <p className="text-[15px] font-bold tracking-[0.06em] text-white light:text-[#17171b]">SUIO</p>
            <p className="gs-overline mt-1.5">Sujud in Order</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Panggung luar (terlihat hanya di layar lebar): rona lebih pekat dari
          kanvas aplikasi agar kolom HP terbingkai jelas, bukan tampak salah. */}
      <main className="relative min-h-dvh w-full bg-[#101013] light:bg-[#e8e8ec]" aria-label="Aplikasi SUIO">
        {/* Kolom aplikasi, selalu selebar HP, di tengah, semua viewport. */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-tk-stage desktop:shadow-[0_0_0_1px_var(--color-tk-line),0_40px_90px_-40px_rgba(0,0,0,0.6)]">
          <div
            id="konten-tazkiya"
            className="no-scrollbar relative z-10 mx-auto w-full px-4 pb-44 pt-[max(1.25rem,env(safe-area-inset-top))]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {/*
                Transisi masuk halaman v13 (Bottom to Top Page Entrance):
                konten halaman/tab baru dimulai SEDIKIT DI BAWAH posisi
                akhirnya lalu naik halus ke posisi normal, dikombinasikan
                dengan opacity. Ini transisi TAMPILAN HALAMAN (translateY
                pada pembungkus), bukan memaksa konten menggulir dari bawah.
                Saklar "Animasi transisi" nonaktif → tanpa gerakan (y: 0).
              */}
              <m.div
                key={subpage ?? tab}
                initial={{ opacity: 0, y: 56 * (animations ? 1 : 0) }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: animations ? -14 : 0 }}
                transition={
                  animations
                    ? { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                    : { duration: 0 }
                }
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

        <AnimatePresence>
          {reader && (
            <QuranReader key={`${reader.surah}-${reader.ayah ?? 0}`} surah={reader.surah} startAyah={reader.ayah} onClose={closeReader} />
          )}
        </AnimatePresence>

        <AnimatePresence>{tasbihOpen && <TasbihSheet open={tasbihOpen} onClose={() => setTasbihOpen(false)} slot={tasbihSlot} />}</AnimatePresence>

        <AnimatePresence>{targetOpen && <TargetSheet onClose={() => setTargetOpen(false)} />}</AnimatePresence>

        {/* Gerbang akun: inisialisasi sesi + dialog keputusan data (migrasi/gabung). */}
        <AuthGate />

        {/* Navigasi kapsul mengambang, satu-satunya navigasi, semua perangkat. */}
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
                    background: "#242429",
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
