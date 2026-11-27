/**
 * Tazkiya — Arah kibla dari koordinat (bearing awal lingkaran besar menuju
 * Ka'bah). Lib terpisah agar halaman tur bisa memakainya TANPA memuat three.js.
 */

const KAABA = { lat: 21.4225, lng: 39.8262 };

/** Bearing ke Ka'bah dalam radian (0 = utara, searah jarum jam positif). */
export function qiblaBearingRad(lat: number, lng: number): number {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA.lat * Math.PI) / 180;
  const Δλ = ((KAABA.lng - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.atan2(y, x);
}
