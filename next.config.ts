import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Lokasi artefak build dapat dialihkan (mis. TZ_DIST_DIR=.next-prod) agar
     verifikasi produksi tidak menimpa artefak dev server yang sedang berjalan. */
  distDir: process.env.TZ_DIST_DIR || ".next",
  /* Validasi TypeScript aktif — jangan dibuat true lagi (menyembunyikan bug). */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  /* Izinkan domain preview sandbox memuat aset dev (hilangkan warning cross-origin). */
  allowedDevOrigins: ["preview-chat-ad782f6f-0393-4cdb-b46d-fa60af6aeb2b.space-z.ai"],
};

export default nextConfig;
