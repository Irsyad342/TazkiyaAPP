/**
 * Tazkiya — Cadangan lokal pra-login & penanda migrasi per perangkat.
 *
 * Aturan keamanan data yang dijunjung:
 * - localStorage lama TIDAK PERNAH dihapus. `tazkiya-store-v1` tetap milik
 *   aplikasi seperti sebelumnya.
 * - Saat pengguna MASUK untuk pertama kali di sebuah perangkat, snapshot
 *   data ibadah lokal disalin ke `tazkiya-preauth-backup-v1` — salinan
 *   darurat yang tidak pernah ditimpa otomatis dan tidak pernah dihapus.
 * - Flag `tazkiya-migrated-<uid>` menandai bahwa keputusan data untuk akun
 *   tsb SUDAH diambil di perangkat ini (agar login berikutnya tidak menawari
 *   ulang dan tidak mencampur data antar-akun).
 */
import type { CloudDoc } from "./doc";

const BACKUP_KEY = "tazkiya-preauth-backup-v1";

export function migrationFlagKey(uid: string): string {
  return `tazkiya-migrated-${uid}`;
}

export function hasMigratedFlag(uid: string): boolean {
  try {
    return localStorage.getItem(migrationFlagKey(uid)) === "1";
  } catch {
    return false;
  }
}

export function setMigratedFlag(uid: string): void {
  try {
    localStorage.setItem(migrationFlagKey(uid), "1");
  } catch {
    /* penyimpanan penuh/blokir — sinkronisasi tetap jalan, hanya tawaran yang muncul lagi */
  }
}

/**
 * Simpan snapshot PRA-LOGIN hanya bila belum ada cadangan (tidak pernah
 * menimpa cadangan lama). `doc` tanpa pengaturan — data ibadah saja.
 */
export function writePreauthBackupIfAbsent(doc: CloudDoc): void {
  try {
    if (localStorage.getItem(BACKUP_KEY)) return;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(doc));
  } catch {
    /* abaikan — cadangan bersifat darurat */
  }
}

export function readPreauthBackup(): CloudDoc | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as CloudDoc) : null;
  } catch {
    return null;
  }
}
