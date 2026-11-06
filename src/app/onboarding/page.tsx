"use client";

/**
 * Tazkiya — Rute onboarding (v12).
 *
 * Kunjungan pertama per perangkat diarahkan ke sini oleh gerbang di
 * src/app/page.tsx. Halaman ini hanya pembungkus tipis: memantul ke
 * Beranda bila onboarding pernah diselesaikan ATAU pengguna ternyata
 * sudah login, mengatur judul dokumen + warna bilah status (selalu
 * terang), lalu menyerahkan semuanya ke OnboardingFlow.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/tazkiya/OnboardingFlow";
import { useAuthStore } from "@/lib/auth/auth-store";
import { initSyncBridge } from "@/lib/sync/cloud-sync";
import { isOnboarded, markOnboarded } from "@/lib/tazkiya/onboarding";

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

  // Identitas terang: judul + meta theme-color menyusul selama di sini.
  useEffect(() => {
    document.title = "Selamat Datang — Tazkiya";
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", "#F2F2F4");
    return () => {
      if (prev) meta?.setAttribute("content", prev);
    };
  }, []);

  return <OnboardingFlow onDone={(target) => { markOnboarded(); router.replace(target); }} />;
}
