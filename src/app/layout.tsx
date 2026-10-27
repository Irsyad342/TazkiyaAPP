import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora, Amiri_Quran } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Sora dimuat sebagai font variabel (satu berkas untuk semua weight) —
 * lima berkas weight statis memperlambat muat pertama di jaringan HP.
 */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const amiriQuran = Amiri_Quran({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
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
  themeColor: "#171321",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Terapkan tema & Liquid Glass lebih awal (sebelum hidrasi React) agar tidak
 * ada kilatan tema gelap pada pengguna tema terang. Membaca langsung dari
 * localStorage yang sama dengan store Tazkiya; gagal parse → biarkan default.
 */
const themeInitScript = `(function(){try{var r=localStorage.getItem("tazkiya-store-v1");if(!r)return;var s=JSON.parse(r).state&&JSON.parse(r).state.settings;if(!s)return;var t=s.theme||"dark";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;document.documentElement.dataset.glass=s.liquidGlass?"liquid":"classic";document.documentElement.dataset.anim=s.animations===false?"off":"on";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#F5F1F5":"#171321");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${jakarta.variable} ${sora.variable} ${amiriQuran.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
