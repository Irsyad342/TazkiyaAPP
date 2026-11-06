import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Amiri_Quran } from "next/font/google";
import "./globals.css";

/*
 * SUIO v13 — rebranding dari Tazkiya. Tipografi tidak berubah:
 * General Sans (Fontshare, ITF Free Font License) menjadi SATU-SATUNYA
 * keluarga latin aplikasi — body, judul, dan angka display. Font inilah
 * yang dipakai desain task-planner premium pada referensi: bentuk huruf
 * geometris-humanis, x-height tinggi, digit rapi untuk countdown.
 * Amiri Quran tetap khusus teks Arab (mucakhat naskh).
 */
const generalSans = localFont({
  src: [
    { path: "./fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/GeneralSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-gs",
  display: "swap",
});

/*
 * Amiri Quran hanya diperlukan saat teks Arab tampil (Pembaca Al-Qur'an).
 * preload: false membuat font ±200 KB ini TIDAK diunduh di buka pertama —
 * browser mengunduhnya otomatis begitu teks .quran-arabic dirender.
 */
const amiriQuran = Amiri_Quran({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "SUIO: Sujud in Order, Pelacak Ibadah Harian",
  description:
    "SUIO (Sujud in Order) membantu Anda mencatat, memantau, dan meningkatkan konsistensi ibadah harian: salat wajib, Al-Qur'an, zikir, dan aktivitas lainnya.",
  keywords: ["SUIO", "Sujud in Order", "pelacak ibadah", "salat", "Al-Qur'an", "zikir", "tasbih"],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    /* Apple touch icon: versi LIGHT permanen (kotak penuh — iOS yang membulatkan),
       dipakai juga saat "Add to Home Screen" di Safari/iOS. */
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1B1B1E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Terapkan tema lebih awal (sebelum hidrasi React) agar tidak ada kilatan
 * tema yang salah. Membaca langsung dari localStorage yang sama dengan
 * store Tazkiya; tanpa preferensi tersimpan → DARK (identitas v7).
 */
const themeInitScript = `(function(){try{var r=localStorage.getItem("tazkiya-store-v1");if(!r)return;var s=JSON.parse(r).state&&JSON.parse(r).state.settings;if(!s)return;var t=s.theme||"dark";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;document.documentElement.dataset.anim=s.animations===false?"off":"on";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#F2F2F4":"#1B1B1E");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* data-v="10": penanda generasi desain untuk verifikasi deployment. */
    <html lang="id" data-theme="dark" data-v="10" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${generalSans.variable} ${amiriQuran.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
