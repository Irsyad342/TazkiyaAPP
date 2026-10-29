/**
 * Tazkiya — Sinkronisasi data ibadah per-akun (Supabase).
 *
 * Alur keputusan data (semua pilihan MELEWATI konfirmasi pengguna):
 * 1. Login PERTAMA di perangkat + akun kosong + perangkat ada data
 *    → tawarkan PINDAH data lokal ke akun (salinan pra-login tetap ada).
 * 2. Login pertama + keduanya ada data
 *    → tawarkan GABUNGKAN (anti-duplikat) atau PAKAI DATA AKUN.
 * 3. Akun ada data, perangkat kosong → hidrasi otomatis dari akun.
 * 4. Pengguna baru (keduanya kosong) → mulai dari 0, TANPA data fiktif.
 * 5. Login berikutnya di perangkat yang sama → hidrasi akun + gabungkan
 *    catatan baru yang dibuat saat logout (milik pengguna ini sendiri).
 *
 * Selama masuk, setiap perubahan data lokal didorong ke akun (debounce),
 * dengan gabungan aditif dari isi akun terbaru agar pengubahan dari
 * perangkat lain tidak hilang. Otorisasi dijaga RLS di sisi database.
 */
"use client";

import { toast } from "sonner";
import { getSupabase } from "@/lib/auth/supabase";
import { useAuthStore, type SyncPhase } from "@/lib/auth/auth-store";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { docStats, extractFullDoc, isEmptyDoc, type CloudDoc } from "./doc";
import { mergeDocs } from "./merge";
import { hasMigratedFlag, setMigratedFlag, writePreauthBackupIfAbsent } from "./backup";

const PUSH_DEBOUNCE_MS = 1800;
const USER_DATA_TABLE = "user_data";

let activeUid: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubStore: (() => void) | null = null;
let bridgeStarted = false;

function setPhase(p: SyncPhase) {
  useAuthStore.getState().setSyncPhase(p);
}

function localDoc(): CloudDoc {
  return extractFullDoc(useWorshipStore.getState());
}

function schedulePush() {
  if (!activeUid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

/** Dorong data perangkat ke akun: tarik dokumen akun terbaru → gabung → tulis. */
export async function pushNow(): Promise<void> {
  const sb = getSupabase();
  const uid = activeUid;
  if (!sb || !uid) return;
  try {
    const { data, error } = await sb.from(USER_DATA_TABLE).select("data").eq("user_id", uid).maybeSingle();
    if (error) throw error;
    const cloud = (data?.data ?? null) as CloudDoc | null;
    const merged = mergeDocs(localDoc(), cloud ?? { v: 1 }, { settingsFrom: "local" });
    const { error: upErr } = await sb
      .from(USER_DATA_TABLE)
      .upsert({ user_id: uid, data: merged, updated_at: new Date().toISOString() });
    if (upErr) throw upErr;
    useAuthStore.getState().setSyncError(null);
  } catch (err) {
    console.warn("[tazkiya-sync] dorongan tertunda:", err);
    useAuthStore.getState().setSyncError("Sinkronisasi tertunda — akan dicoba ulang otomatis saat online.");
  }
}

async function fetchCloudDoc(uid: string): Promise<CloudDoc | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(USER_DATA_TABLE).select("data").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return (data?.data ?? null) as CloudDoc | null;
}

function applyCloud(doc: CloudDoc) {
  useWorshipStore.getState().importCloudData(doc);
}

/** Berlangganan perubahan store: dorong ke akun saat fase "active". */
function subscribeStore() {
  if (unsubStore) return;
  const DATA_KEYS = [
    "settings",
    "logs",
    "prayerDetails",
    "fridayZuhurAlt",
    "bookmarks",
    "ayahBookmarks",
    "lastRead",
    "readingHistory",
    "tasbih",
  ] as const;
  let prevJson = snapshot();
  function snapshot(): string {
    const s = useWorshipStore.getState();
    const part: Record<string, unknown> = {};
    for (const k of DATA_KEYS) part[k] = s[k];
    return JSON.stringify(part);
  }
  unsubStore = useWorshipStore.subscribe(() => {
    const next = snapshot();
    if (next === prevJson) return;
    prevJson = next;
    if (useAuthStore.getState().syncPhase !== "active") return; // jangan dorong sebelum keputusan data
    schedulePush();
  });
  // Coba ulang dorongan saat koneksi kembali.
  window.addEventListener("online", () => {
    if (useAuthStore.getState().syncPhase === "active") schedulePush();
  });
}

function unsubscribeStore() {
  unsubStore?.();
  unsubStore = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export function stopSync(): void {
  unsubscribeStore();
  activeUid = null;
  setPhase("idle");
}

/** Mulai sinkronisasi untuk pengguna tertentu (idempoten per uid). */
export async function startSync(uid: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (activeUid === uid && unsubStore) return;
  stopSync();
  activeUid = uid;
  setPhase("resolving");
  const auth = useAuthStore.getState();

  try {
    const first = !hasMigratedFlag(uid);
    const local = localDoc();
    const localEmpty = isEmptyDoc(local);

    if (first) {
      // Snapshot pra-login sekali saja — tidak pernah menimpa cadangan lama.
      writePreauthBackupIfAbsent(extractFullDoc(useWorshipStore.getState()));
      const cloud = await fetchCloudDoc(uid);
      const cloudEmpty = isEmptyDoc(cloud);

      if (cloudEmpty && localEmpty) {
        // Pengguna baru sungguhan: mulai dari 0, tanpa data fiktif apa pun.
        setMigratedFlag(uid);
        setPhase("active");
      } else if (cloudEmpty && !localEmpty) {
        const st = docStats(local);
        auth.setMigrationPrompt({ kind: "migrate", localDays: st.activeDays, localDone: st.totalDone });
        setPhase("awaiting-decision");
      } else if (!cloudEmpty && localEmpty) {
        applyCloud(cloud!);
        setMigratedFlag(uid);
        setPhase("active");
      } else {
        const ls = docStats(local);
        const cs = docStats(cloud!);
        auth.setMigrationPrompt({
          kind: "conflict",
          localDays: ls.activeDays,
          localDone: ls.totalDone,
          cloudDays: cs.activeDays,
          cloudDone: cs.totalDone,
        });
        setPhase("awaiting-decision");
      }
    } else {
      // Pengguna lama di perangkat ini: akun sumber kebenaran + gabungkan
      // catatan baru yang dibuat saat logout (milik akun ini juga).
      const cloud = await fetchCloudDoc(uid);
      if (cloud && !isEmptyDoc(cloud)) {
        const merged = mergeDocs(localDoc(), cloud, { settingsFrom: "cloud" });
        applyCloud(merged);
        await pushNow(); // unggah gabungan (termasuk catatan baru saat logout)
      } else {
        // Akun kosong (mis. baru dibuat ulang): pertahankan data perangkat, unggah.
        await pushNow();
      }
      setMigratedFlag(uid);
      setPhase("active");
    }
  } catch (err) {
    console.warn("[tazkiya-sync] inisialisasi gagal:", err);
    useAuthStore.getState().setSyncError("Tidak dapat menghubungi server — data tetap tersimpan di perangkat.");
    setPhase("error");
  }

  subscribeStore();
}

/** Keputusan pengguna atas dialog migrasi/konflik. */
export async function resolveMigration(choice: "migrate" | "fresh" | "merge" | "cloud"): Promise<void> {
  const sb = getSupabase();
  const uid = activeUid;
  const auth = useAuthStore.getState();
  const prompt = auth.migrationPrompt;
  if (!sb || !uid || !prompt) return;
  setPhase("resolving");
  try {
    if (prompt.kind === "migrate") {
      if (choice === "migrate") {
        // Pindahkan seluruh data perangkat ke akun (akun kosong — tidak menimpa apa pun).
        const doc = localDoc();
        const { error } = await sb
          .from(USER_DATA_TABLE)
          .upsert({ user_id: uid, data: doc, updated_at: new Date().toISOString() });
        if (error) throw error;
        toast.success("Data lokal berhasil dipindahkan ke akunmu");
      } else {
        // "Mulai kosong": data lokal tidak dihapus — tersimpan di cadangan pra-login.
        useWorshipStore.getState().clearWorshipData();
        toast.info("Akun dimulai dari kosong — salinan data lama tetap tersimpan di perangkat");
      }
    } else {
      const cloud = await fetchCloudDoc(uid);
      if (choice === "merge" && cloud) {
        const merged = mergeDocs(localDoc(), cloud, { settingsFrom: "local" });
        applyCloud(merged);
        const { error } = await sb
          .from(USER_DATA_TABLE)
          .upsert({ user_id: uid, data: merged, updated_at: new Date().toISOString() });
        if (error) throw error;
        toast.success("Data perangkat & akun digabungkan tanpa duplikat");
      } else if (choice === "cloud" && cloud) {
        applyCloud(cloud);
        toast.info("Data akun dimuat — data perangkat tetap tersimpan sebagai cadangan");
      }
    }
    setMigratedFlag(uid);
    auth.setMigrationPrompt(null);
    setPhase("active");
  } catch (err) {
    console.warn("[tazkiya-sync] resolusi migrasi gagal:", err);
    useAuthStore.getState().setSyncError("Gagal menyimpan ke akun — coba lagi.");
    setPhase("error");
  }
}

/** Batalkan keputusan dengan keluar dari akun (tidak ada data yang berpindah). */
export async function cancelMigrationBySignOut(): Promise<void> {
  const auth = useAuthStore.getState();
  auth.setMigrationPrompt(null);
  await auth.signOut();
}

/**
 * Jembatan status sesi → sinkronisasi. Dipasang SEKALI dari komponen klien.
 * Saat keluar: hentikan sinkron DULU, baru kosongkan data ibadah lokal
 * (data akun tetap aman di cloud; tidak ada kebocoran antar-akun).
 */
export function initSyncBridge(): void {
  if (bridgeStarted) return;
  bridgeStarted = true;
  let prevStatus: string | null = null;
  let prevUid: string | null = null;
  useAuthStore.subscribe((s) => {
    const uid = s.user?.id ?? null;
    if (s.status === prevStatus && uid === prevUid) return;
    const wasSignedIn = prevStatus === "signedIn";
    prevStatus = s.status;
    prevUid = uid;
    if (s.status === "signedIn" && uid) {
      void startSync(uid);
    } else if (wasSignedIn) {
      stopSync();
      useWorshipStore.getState().clearWorshipData();
    } else if (s.status === "signedOut") {
      setPhase("idle");
    }
  });
}
