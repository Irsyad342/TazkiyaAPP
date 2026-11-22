"use client";

/**
 * SUIO v14 — Rute onboarding.
 *
 * Alur: onboarding → pemilihan tema → login/registrasi → Beranda.
 * Halaman ini pembungkus tipis: memantul ke Beranda bila pengguna sudah
 * login, atau ke /auth bila onboarding pernah diselesaikan tanpa sesi
 * (Beranda tidak boleh diakses tanpa autentikasi). Setelah logout flag
 * onboarding dihapus, sehingga halaman ini tampil lagi dari awal.
 * Judul dokumen + warna bilah status mengikuti TEMA aktif (pengaturan
 * tersimpan, atau preferensi sistem untuk pengunjung baru).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/tazkiya/OnboardingFlow";
import { useAuthStore } from "@/lib/auth/auth-store";
import { initSyncBridge } from "@/lib/sync/cloud-sync";
import { isOnboarded, markOnboarded } from "@/lib/tazkiya/onboarding";

/** Kanvas onboarding — SELALU kanvas oranye original (classic): Welcome
    Screen memakai identitas oranye asli SUIO apa pun preferensi paket
    warna pengguna (spesifikasi restore Welcome Screen). */
const CANVAS = { dark: "#292522", light: "#F6F2EB" } as const;

function resolveStoredTheme(): "dark" | "light" {
  try {
    const raw = localStorage.getItem("tazkiya-store-v1");
    const settings = raw ? (JSON.parse(raw)?.state?.settings ?? null) : null;
    const theme = settings?.theme ?? "system";
    if (theme === "dark" || theme === "light") return theme;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Mode tema mentah pengaturan ("system" tidak dipecah) untuk opsi pemilih tema. */
function resolveStoredThemeMode(): "dark" | "light" | "system" {
  try {
    const raw = localStorage.getItem("tazkiya-store-v1");
    const theme = raw ? (JSON.parse(raw)?.state?.settings?.theme ?? "system") : "system";
    return theme === "dark" || theme === "light" ? theme : "system";
  } catch {
    return "system";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    initSyncBridge();
    void useAuthStore.getState().initAuth();
  }, []);

  // Sudah login → langsung Beranda; sudah onboarding tanpa sesi → login.
  useEffect(() => {
    if (status === "signedIn") {
      markOnboarded();
      router.replace("/");
    } else if (isOnboarded()) {
      router.replace("/auth");
    }
  }, [status, router]);

  // Judul + tema onboarding: mode terang/gelap mengikuti pengaturan/sistem,
  // tetapi paket warna SELALU classic (oranye original) di halaman ini —
  // preferensi Elemental Dream pengguna tidak mengubah Welcome Screen.
  useEffect(() => {
    document.title = "SUIO: Selamat Datang";
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? null;
    const theme = resolveStoredTheme();
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.color = "classic";
    meta?.setAttribute("content", CANVAS[theme]);
    return () => {
      if (prev) meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <OnboardingFlow
      initialThemeMode={resolveStoredThemeMode()}
      onDone={(target) => {
        markOnboarded();
        router.replace(target);
      }}
    />
  );
}
