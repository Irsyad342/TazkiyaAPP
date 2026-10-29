/**
 * Tazkiya — Lokasi perangkat (Geolocation API).
 * Prinsip privasi & baterai (lokasi otomatis penuh):
 * - Izin diminta saat fitur lokasi pertama kali dipakai (tombol
 *   "Aktifkan Lokasi Otomatis" / "Perbarui Lokasi Saat Ini").
 * - Pembaruan posisi berjalan otomatis selama halaman terkait terlihat;
 *   dihentikan saat halaman ditutup / tab tersembunyi (hemat baterai).
 * - Koordinat disimpan lokal (localStorage), tidak dikirim ke server Tazkiya.
 *   Penamaan kota memakai layanan reverse geocoding publik (tanpa API key).
 * - Tidak pernah membuat koordinat acak: bila GPS gagal, posisi tidak diubah.
 */
"use client";

import type { DeviceGeo } from "./types";

export function geoSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.geolocation && window.isSecureContext;
}

export interface GeoFailure {
  code: "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";
  message: string;
}

function failureOf(err: GeolocationPositionError): GeoFailure {
  if (err.code === err.PERMISSION_DENIED)
    return { code: "denied", message: "Izin lokasi ditolak. Aktifkan izin lokasi untuk aplikasi ini di pengaturan perangkat, lalu coba lagi." };
  if (err.code === err.POSITION_UNAVAILABLE)
    return { code: "unavailable", message: "Posisi tidak tersedia saat ini. Coba lagi beberapa saat." };
  if (err.code === err.TIMEOUT)
    return { code: "timeout", message: "Waktu pencarian lokasi habis. Coba lagi di tempat yang lebih terbuka." };
  return { code: "unavailable", message: "Gagal mendapatkan lokasi." };
}

/** Ambil posisi sekali (promise). Tidak pernah mengarang koordinat. */
export function getPosition(timeoutMs = 15000): Promise<{ pos: GeolocationPosition; failure?: undefined } | { pos?: undefined; failure: GeoFailure }> {
  return new Promise((resolve) => {
    if (!geoSupported()) {
      resolve({
        failure: window.isSecureContext
          ? { code: "unsupported", message: "Perangkat ini tidak mendukung pencarian lokasi." }
          : { code: "insecure", message: "Lokasi butuh koneksi aman (HTTPS)." },
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ pos }),
      (err) => resolve({ failure: failureOf(err) }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
    );
  });
}

/**
 * Mulai pemantauan posisi (watchPosition). Mengembalikan fungsi pembersih.
 * Dipakai untuk pembaruan otomatis saat halaman terlihat.
 */
export function watchDevicePosition(
  onValid: (pos: GeolocationPosition) => void,
  onFailure: (f: GeoFailure) => void
): () => void {
  if (!geoSupported()) {
    onFailure(
      window.isSecureContext
        ? { code: "unsupported", message: "Perangkat ini tidak mendukung pencarian lokasi." }
        : { code: "insecure", message: "Lokasi butuh koneksi aman (HTTPS)." }
    );
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(onValid, (err) => onFailure(failureOf(err)), {
    enableHighAccuracy: true,
    timeout: 20_000,
    maximumAge: 60_000,
  });
  return () => navigator.geolocation.clearWatch(watchId);
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

/**
 * Nama kota/wilayah dari koordinat (reverse geocoding, bahasa Indonesia).
 * Utama: BigDataCloud (endpoint klien, tanpa kunci). Cadangan: OpenStreetMap
 * Nominatim. Mengembalikan null bila keduanya gagal — label lama dipertahankan.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const bdc = await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`
  );
  if (bdc) {
    const city = (bdc.city as string) || (bdc.locality as string) || "";
    const region = (bdc.principalSubdivision as string) || "";
    if (city.trim()) return region && region !== city ? `${city}, ${region}` : city;
    if (String(bdc.countryName ?? "").trim()) return `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}`;
  }
  const osm = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id&zoom=10`
  );
  if (osm) {
    const addr = (osm.address ?? {}) as Record<string, string>;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const region = addr.state || "";
    if (city.trim()) return region && region !== city ? `${city}, ${region}` : city;
  }
  return null;
}

/** Bangun objek DeviceGeo terbaru dari posisi valid (tanpa koordinat palsu). */
export function buildGeo(prev: DeviceGeo | undefined, pos: GeolocationPosition, label?: string): DeviceGeo {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const movedFar =
    !prev || Math.abs(prev.lat - lat) > 0.005 || Math.abs(prev.lng - lng) > 0.005 || !prev.label;
  return {
    auto: prev?.auto ?? false,
    lat,
    lng,
    accuracy: pos.coords.accuracy ?? undefined,
    updatedAt: new Date().toISOString(),
    // Nama tempat hanya diperbarui saat benar-benar berpindah jauh / belum ada,
    // agar hemat permintaan jaringan pada perangkat bergerak.
    label: label ?? (movedFar ? undefined : prev?.label),
  };
}

/** Status singkat untuk ditampilkan ke pengguna. */
export function geoStatusText(geo: DeviceGeo | undefined): string {
  if (!geo) return "Lokasi perangkat belum aktif";
  const t = new Date(geo.updatedAt);
  const jam = `${String(t.getHours()).padStart(2, "0")}.${String(t.getMinutes()).padStart(2, "0")}`;
  const acc = geo.accuracy ? ` · ±${Math.round(geo.accuracy)} m` : "";
  return `Diperbarui pukul ${jam}${acc}`;
}
