import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tazkiya",
    short_name: "Tazkiya",
    description: "Pelacak Ibadah Harian",
    start_url: "/",
    display: "standalone",
    /* Identitas v7 (kanvas #1B1B1E) — bukan hijau lama. Chrome/Android
       mencat area navigasi sistem bawah PWA dari theme_color manifest ini,
       sehingga #16A34A lama tampil sebagai garis hijau di bawah Beranda. */
    background_color: "#1B1B1E",
    theme_color: "#1B1B1E",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
