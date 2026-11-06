"use client";

/**
 * SUIO v13 — Rute onboarding.
 *
 * Kunjungan pertama per perangkat diarahkan ke sini oleh gerbang di
 * src/app/page.tsx. Halaman ini pembungkus tipis: memantul ke Beranda
 * bila onboarding pernah diselesaikan ATAU pengguna sudah login,
 * mengatur judul dokumen + warna bilah status sesuai TEMA aktif
 * (pengaturan tersimpan, atau preferensi sistem untuk pengunjung baru),
 * lalu menyerahkan semuanya ke OnboardingFlow.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/tazkiya/OnboardingFlow";
import { useAuthStore } from "@/lib/auth/auth-store";
import { initSyncBridge } from "@/lib/sync/cloud-sync";
import { isOnboarded, markOnboarded } from "@/lib/tazkiya/onboarding";

/** Kanvas onboarding per tema — harus sinkron dengan bg OnboardingFlow. */
const CANVAS = { dark: "#131217", light: "#f4f2f7" } as const;

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

export default function OnboardingPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    initSyncBridge();
    void useAuthStore.getState().initAuth();
  }, []);

  // Sudah pernah onboarding / sudah login → tidak perlu sambutan lagi.
  useEffect(() => {
    if (isOnboarded() || status === "signedIn") {
      markOnboarded();
      router.replace("/");
    }
  }, [status, router]);

  // Judul + tema onboarding: ikuti pengaturan pengguna atau sistem,
  // lalu sinkronkan meta theme-color selama berada di halaman ini.
  useEffect(() => {
    document.title = "SUIO: Selamat Datang";
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? null;
    const theme = resolveStoredTheme();
    document.documentElement.dataset.theme = theme;
    meta?.setAttribute("content", CANVAS[theme]);
    return () => {
      if (prev) meta?.setAttribute("content", prev);
    };
  }, []);

  return <OnboardingFlow onDone={(target) => { markOnboarded(); router.replace(target); }} />;
}
