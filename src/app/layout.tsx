import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans, Amiri_Quran } from "next/font/google";
import "./globals.css";

/*
 * Tazkiya v6 "Ember" — dua keluarga font latin:
 * Plus Jakarta Sans sebagai font utama (body & antarmuka), Manrope
 * untuk angka besar / judul display (countdown, statistik). Amiri Quran
 * khusus teks Arab. Dark adalah pengalaman utama aplikasi.
 */
const manrope = Manrope({
  variable: "--font-manrope",
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
  themeColor: "#161616",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Terapkan tema & Liquid Glass lebih awal (sebelum hidrasi React) agar tidak
 * ada kilatan tema yang salah. Membaca langsung dari localStorage yang sama
 * dengan store Tazkiya; tanpa preferensi tersimpan → DARK (identitas v6).
 */
const themeInitScript = `(function(){try{var r=localStorage.getItem("tazkiya-store-v1");if(!r)return;var s=JSON.parse(r).state&&JSON.parse(r).state.settings;if(!s)return;var t=s.theme||"dark";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;document.documentElement.dataset.glass=s.liquidGlass?"liquid":"classic";document.documentElement.dataset.anim=s.animations===false?"off":"on";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#F6F6F7":"#161616");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* data-v="6": penanda generasi desain untuk verifikasi deployment. */
    <html lang="id" data-theme="dark" data-v="6" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${manrope.variable} ${jakarta.variable} ${amiriQuran.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
