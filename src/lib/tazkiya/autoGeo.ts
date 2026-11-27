/**
 * Tazkiya — Lokasi OTOMATIS untuk jadwal salat (tanpa tombol, tanpa watch).
 * Prinsip (hemat baterai, tidak pernah mengarang koordinat):
 * - Dipanggil saat Beranda (fitur jadwal salat) pertama kali terlihat.
 * - Izin belum pernah diminta → minta sekali. Jawaban pengguna yang menutup
 *   prompt tanpa izin dicatat (cooldown 24 jam) agar tidak muncul berulang.
 * - Izin ditolak → jadwal tetap jalan memakai lokasi terakhir yang tersimpan;
 *   tanpa lokasi tersimpan pun Beranda TIDAK diblokir (jadwal manual lama).
 * - Izin diberikan → posisi hanya disegarkan bila cache >10 menit, dan hanya
 *   disimpan bila bergeser >±150 m (toleransi anti-churn GPS kecil).
 * - Nama kota (reverse geocoding publik) hanya diambil saat benar-benar
 *   berpindah jauh (>±550 m — aturan bawaan buildGeo) → hemat jaringan.
 * - Pembaruan berjalan sekali per kunjungan halaman — TANPA watchPosition
 *   berkelanjutan di Beranda (watch hemat-baterai milik halaman Profil tetap).
 */
"use client";

import { buildGeo, geoSupported, getPosition, reverseGeocode } from "./geo";
import type { GeoFailure } from "./geo";
import type { DeviceGeo } from "./types";
import { useWorshipStore } from "./store";

const REFRESH_MIN_AGE_MS = 10 * 60_000; // cache dianggap segar selama 10 menit
const MOVE_TOLERANCE_DEG = 0.0015; // ±±150 m — di bawah ini tidak disimpan ulang
const ASK_COOLDOWN_MS = 24 * 60 * 60_000; // jeda minimum antar usulan izin
const ASK_FLAG = "tk-geo-auto-asked-at";

export type AutoGeoState =
  | { kind: "ok"; geo: DeviceGeo } // lokasi aktif (segar atau masih dalam toleransi)
  | { kind: "cached"; geo: DeviceGeo } // izin ditolak → pakai lokasi terakhir
  | { kind: "denied" } // izin ditolak & belum ada lokasi tersimpan
  | { kind: "none" } // belum ada izin/posisi — jadwal manual tetap berlaku
  | { kind: "unsupported" }; // perangkat/konteks tidak mendukung GPS

/** Status izin; null bila API Permissions tidak tersedia (mis. Safari lama). */
async function permissionState(): Promise<PermissionState | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) return null;
    return (await navigator.permissions.query({ name: "geolocation" as PermissionName })).state;
  } catch {
    return null;
  }
}

function shouldAskNow(): boolean {
  try {
    const last = Number(localStorage.getItem(ASK_FLAG) ?? 0);
    return !last || Date.now() - last > ASK_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markAsked(): void {
  try {
    localStorage.setItem(ASK_FLAG, String(Date.now()));
  } catch {
    /* localStorage non-tersedia — abaikan */
  }
}

/** Simpan posisi valid: buildGeo + nama kota bila perlu + flag otomatis. */
async function savePosition(pos: GeolocationPosition): Promise<DeviceGeo> {
  const prev = useWorshipStore.getState().settings.geo;
  let next = buildGeo(prev, pos);
  next = { ...next, auto: true };
  if (!next.label) {
    const label = await reverseGeocode(next.lat, next.lng);
    if (label) next = { ...next, label };
  }
  useWorshipStore.getState().updateSettings({ geo: next });
  return next;
}

/** Posisi masih dalam toleransi jarak → tidak perlu menyimpan ulang. */
function withinTolerance(prev: DeviceGeo, pos: GeolocationPosition): boolean {
  return (
    Math.abs(prev.lat - pos.coords.latitude) <= MOVE_TOLERANCE_DEG &&
    Math.abs(prev.lng - pos.coords.longitude) <= MOVE_TOLERANCE_DEG
  );
}

/**
 * Alur lokasi otomatis. `mode`:
 * - "mount": dipanggil saat Beranda muncul — hanya bertanya bila diizinkan
 *   cooldown (tidak pernah popup berulang-ulang).
 * - "retry": dipanggil dari ketukan pengguna (indikator lokasi) — selalu boleh
 *   meminta izin/pembaruan karena ada niat pengguna.
 */
export async function ensureAutoGeo(mode: "mount" | "retry"): Promise<AutoGeoState> {
  if (!geoSupported()) return { kind: "unsupported" };
  const geo = useWorshipStore.getState().settings.geo;

  // 1) Sudah ada lokasi tersimpan → pakai cache; segarkan bila tua.
  if (geo) {
    const age = Date.now() - new Date(geo.updatedAt).getTime();
    if (mode === "mount" && age < REFRESH_MIN_AGE_MS) return { kind: "ok", geo };

    const res = await getPosition(mode === "retry" ? 15000 : 8000);
    if (res.pos) {
      if (mode === "retry" || !withinTolerance(geo, res.pos)) {
        const next = await savePosition(res.pos);
        return { kind: "ok", geo: next };
      }
      return { kind: "ok", geo };
    }
    // Gagal menyegarkan → cache lama tetap dipakai (tidak pernah dihapus).
    if (res.failure?.code === "denied") return { kind: "cached", geo };
    return { kind: "ok", geo };
  }

  // 2) Belum ada lokasi tersimpan.
  const perm = await permissionState();
  if (perm === "denied") return { kind: "denied" };
  if (perm === "prompt" && mode === "mount" && !shouldAskNow()) return { kind: "none" };

  markAsked();
  const res = await getPosition(mode === "retry" ? 15000 : 12000);
  if (res.pos) return { kind: "ok", geo: await savePosition(res.pos) };

  const code: GeoFailure["code"] | undefined = res.failure?.code;
  if (code === "denied") return { kind: "denied" };
  return { kind: "none" };
}

/** Teks singkat indikator lokasi di dekat jadwal (minimalis, satu baris). */
export function autoGeoStatusText(state: AutoGeoState): string {
  switch (state.kind) {
    case "ok": {
      const label = state.geo.label ?? "Koordinat GPS";
      return `Lokasi otomatis · ${label}`;
    }
    case "cached":
      return `Lokasi terakhir · ${state.geo.label ?? "Koordinat GPS"} (izin GPS mati)`;
    case "denied":
      return "Izin lokasi ditolak · jadwal memakai jadwal bawaan";
    case "none":
      return "Lokasi belum aktif · ketuk untuk mengaktifkan";
    case "unsupported":
      return "Perangkat tidak mendukung GPS · jadwal bawaan aktif";
  }
}
