import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Amiri_Quran } from "next/font/google";
import "./globals.css";

/*
 * Dua keluarga font (identitas v3 "Aurora Pastel"): Outfit — display geometris
 * modern untuk judul, angka, dan label besar; Plus Jakarta Sans — teks body.
 * Amiri Quran khusus teks Arab.
 */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Amiri Quran hanya diperlukan saat teks Arab tampil (Pembaca Al-Qur'an).
 * preload: false membuat font ±200 KB ini TIDAK diunduh di buka pertama —
 * browser menunduhnya otomatis begitu teks .quran-arabic dirender — sehingga
 * muat awal beranda di jaringan HP jauh lebih ringan.
 */
const amiriQuran = Amiri_Quran({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Tazkiya — Pelacak Ibadah Harian",
  description:
    "Tazkiya membantu Anda mencatat, memantau, dan meningkatkan konsistensi ibadah harian: salat wajib, Al-Qur'an, zikir, dan aktivitas lainnya.",
  keywords: ["Tazkiya", "pelacak ibadah", "salat", "Al-Qur'an", "zikir", "tasbih"],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F9FC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Terapkan tema & Liquid Glass lebih awal (sebelum hidrasi React) agar tidak
 * ada kilatan tema gelap pada pengguna tema terang. Membaca langsung dari
 * localStorage yang sama dengan store Tazkiya; gagal parse → biarkan default.
 */
const themeInitScript = `(function(){try{var r=localStorage.getItem("tazkiya-store-v1");if(!r)return;var s=JSON.parse(r).state&&JSON.parse(r).state.settings;if(!s)return;var t=s.theme||"light";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;document.documentElement.dataset.glass=s.liquidGlass?"liquid":"classic";document.documentElement.dataset.anim=s.animations===false?"off":"on";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#F7F9FC":"#14131A");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${outfit.variable} ${jakarta.variable} ${amiriQuran.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
