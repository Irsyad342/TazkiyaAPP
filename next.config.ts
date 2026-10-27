import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Validasi TypeScript aktif — jangan dibuat true lagi (menyembunyikan bug). */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
