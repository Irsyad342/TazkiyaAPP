/**
 * Tazkiya — Konversi foto otomatis ke WebP (sisi perangkat, tanpa server).
 *
 * Tujuan: setiap foto yang dipilih pengguna (avatar profil) langsung
 * dikonversi menjadi berkas .webp berukuran kecil SEBELUM disimpan —
 * sehingga hemat penyimpanan lokal dan, bila kelak disinkronkan ke
 * Supabase Storage, kuota egress/CDN hampir tidak terpakai (berkas
 * beberapa KB vs foto asli yang bisa 5 MB).
 *
 * Cara kerja:
 * 1. Foto didekode di perangkat (Object URL + <img>, kompatibel semua browser).
 * 2. Dipotong persegi di tengah (cover-crop) — memperbaiki distorsi
 *    foto non-persegi pada versi lama yang menarik gambar (stretch).
 * 3. Diskalakan ke sisi maksimum `size` px (tidak pernah di-upscale).
 * 4. Dienkode WebP dengan kualitas adaptif: diturunkan bertahap sampai
 *    hasil ≤ `maxBytes` atau mencapai kualitas minimum.
 * 5. Browser yang tidak bisa MENGENKODE WebP (Safari < 16.4 menulis PNG
 *    secara diam-diam) otomatis diarahkan ke JPEG — hasilnya tetap kecil.
 */

export interface ImageConvertResult {
  /** Berkas hasil siap unggah (type image/webp atau image/jpeg). */
  blob: Blob;
  /** Data URL hasil (untuk pratinjau/simpan di localStorage). */
  dataUrl: string;
  /** MIME hasil: "image/webp" atau "image/jpeg". */
  mime: string;
  /** Ekstensi tanpa titik: "webp" atau "jpg". */
  ext: string;
  /** Ukuran hasil akhir dalam byte. */
  bytes: number;
  /** Ukuran berkas asli dalam byte. */
  sourceBytes: number;
  /** Sisi hasil (persegi) dalam piksel. */
  width: number;
  height: number;
}

export interface ImageConvertOptions {
  /** Sisi persegi maksimum hasil (default 256 — cukup tajam untuk avatar). */
  size?: number;
  /** Batas lembut ukuran hasil; kualitas diturunkan bertahap (default 20 KB). */
  maxBytes?: number;
  /** Kualitas awal (default 0.85). */
  startQuality?: number;
  /** Kualitas minimum sebelum berhenti (default 0.5). */
  minQuality?: number;
}

/** Muat berkas jadi elemen gambar terdekod. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Berkas gambar tidak valid atau format tidak didukung"));
    };
    img.src = url;
  });
}

/** canvas.toBlob versi Promise. */
function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

/**
 * Konversi berkas gambar apa pun menjadi WebP kecil (fallback JPEG bila
 * browser tidak mendukung enkode WebP). Selalu persegi, potong di tengah.
 */
export async function convertImageToWebp(file: File, opts: ImageConvertOptions = {}): Promise<ImageConvertResult> {
  const size = Math.max(64, Math.min(1024, Math.round(opts.size ?? 256)));
  const maxBytes = opts.maxBytes ?? 20 * 1024;
  const minQuality = opts.minQuality ?? 0.5;

  const img = await loadImage(file);

  // Jangan pernah upscale: pakai sisi terkecil antara target dan asli.
  const side = Math.min(size, Math.max(img.naturalWidth, img.naturalHeight)) || size;

  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas tidak tersedia");

  // Cover-crop persegi di tengah: skala menutupi seluruh kanvas lalu geser.
  const scale = Math.max(side / img.naturalWidth, side / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  ctx.drawImage(img, (side - drawW) / 2, (side - drawH) / 2, drawW, drawH);

  let mime = "image/webp";
  let quality = opts.startQuality ?? 0.85;
  let blob: Blob | null = null;

  for (;;) {
    blob = await toBlob(canvas, mime, quality);
    // Browser tanpa enkode WebP diam-diam menghasilkan PNG — ganti ke JPEG.
    if (mime === "image/webp" && (!blob || blob.type !== "image/webp")) {
      mime = "image/jpeg";
      quality = 0.82;
      continue;
    }
    if (!blob) throw new Error("Gagal mengenkode gambar");
    if (blob.size <= maxBytes || quality <= minQuality || mime !== "image/webp") break;
    quality = Math.max(minQuality, Math.round((quality - 0.1) * 100) / 100);
  }

  if (!blob) throw new Error("Gagal mengenkode gambar");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca hasil konversi"));
    reader.readAsDataURL(blob as Blob);
  });

  return {
    blob,
    dataUrl,
    mime,
    ext: mime === "image/webp" ? "webp" : "jpg",
    bytes: blob.size,
    sourceBytes: file.size,
    width: side,
    height: side,
  };
}

/** Format byte gaya Indonesia: 512 B / 9,3 KB / 1,2 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
