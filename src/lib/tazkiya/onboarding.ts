/**
 * Tazkiya — Status penyelesaian onboarding (per perangkat, bukan per akun).
 *
 * Flag sengaja disimpan terpisah dari store ibadah (tazkiya-store-v1):
 * pembersihan data lokal saat logout tidak boleh membuat pengguna melihat
 * onboarding ulang. Mekanisme sama dengan tema: localStorage langsung.
 */
export const ONBOARDING_KEY = "tazkiya-onboarding-v1";

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "done";
  } catch {
    return false;
  }
}

/* Store mini untuk useSyncExternalStore di gerbang src/app/page.tsx —
   menghindari setState di dalam efek (aturan React Compiler). */
type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: boolean | null = null;

export function subscribeOnboarding(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getOnboardedSnapshot(): boolean {
  if (snapshot === null) snapshot = isOnboarded();
  return snapshot;
}

/** Snapshot sisi server: belum pernah onboarding (SSR/hidrasi). */
export function getOnboardedServerSnapshot(): boolean {
  return false;
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "done");
  } catch {
    /* penyimpanan diblokir/penuh — onboarding boleh tampil lagi */
  }
  snapshot = true;
  listeners.forEach((l) => l());
}
