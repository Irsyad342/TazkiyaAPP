/**
 * Tazkiya — Store autentikasi (zustand).
 *
 * Mengelola sesi Supabase (login/daftar/logout/reset) dan fase sinkronisasi
 * data. Prinsip jujur: bila deployment belum dikonfigurasi, status tetap
 * "unconfigured" — tidak ada login palsu.
 */
"use client";

import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { authErrorMessage, getSupabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AuthStatus = "loading" | "unconfigured" | "signedOut" | "signedIn";

/** Fase sinkronisasi data akun (dikendalikan modul cloud-sync). */
export type SyncPhase = "idle" | "resolving" | "awaiting-decision" | "active" | "error";

/** Tawaran keputusan data saat masuk (data lokal vs data akun). */
export type MigrationPrompt =
  | { kind: "migrate"; localDays: number; localDone: number }
  | {
      kind: "conflict";
      localDays: number;
      localDone: number;
      cloudDays: number;
      cloudDone: number;
    };

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** Untuk pendaftaran: true bila pengguna harus memverifikasi email dulu. */
  needsConfirmation?: boolean;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** true saat pengguna membuka tautan "atur ulang kata sandi" dari email. */
  recoveryMode: boolean;
  syncPhase: SyncPhase;
  migrationPrompt: MigrationPrompt | null;
  /** Pesan gangguan sinkronisasi non-fatal (data lokal tetap aman). */
  syncError: string | null;

  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  completePasswordReset: (newPassword: string) => Promise<AuthResult>;

  setSyncPhase: (p: SyncPhase) => void;
  setMigrationPrompt: (p: MigrationPrompt | null) => void;
  setSyncError: (msg: string | null) => void;
  clearRecovery: () => void;
}

function userFromSession(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as { display_name?: string; full_name?: string; name?: string };
  const email = u.email ?? "";
  const name = meta.display_name ?? meta.full_name ?? meta.name ?? (email ? email.split("@")[0] : "Sahabat Tazkiya");
  return { id: u.id, email, name };
}

let initStarted = false;

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "loading",
  user: null,
  recoveryMode: false,
  syncPhase: "idle",
  migrationPrompt: null,
  syncError: null,

  initAuth: async () => {
    const sb = getSupabase();
    if (!sb) {
      set({ status: "unconfigured", user: null });
      return;
    }
    if (initStarted) return; // idempoten (React strict mode memasang efek 2x)
    initStarted = true;
    try {
      const { data } = await sb.auth.getSession();
      set({
        status: data.session ? "signedIn" : "signedOut",
        user: userFromSession(data.session),
      });
      sb.auth.onAuthStateChange((_event, session) => {
        const user = userFromSession(session);
        set({ status: user ? "signedIn" : "signedOut", user });
      });
    } catch {
      set({ status: "signedOut", user: null });
    }
  },

  signIn: async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Autentikasi belum dikonfigurasi pada deployment ini." };
    try {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: authErrorMessage(error) };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  },

  signUp: async (name, email, password) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Autentikasi belum dikonfigurasi pada deployment ini." };
    try {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (error) return { ok: false, error: authErrorMessage(error) };
      if (data.session) return { ok: true };
      return { ok: true, needsConfirmation: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  },

  signOut: async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      await sb.auth.signOut();
      // Pembersihan data lokal & penghentian sinkron ditangani cloud-sync
      // lewat perubahan status sesi (lihat initSyncBridge).
    } catch {
      /* keluar tetap dianggap berhasil dari sisi UI */
      set({ status: "signedOut", user: null });
    }
  },

  sendPasswordReset: async (email) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Autentikasi belum dikonfigurasi pada deployment ini." };
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) return { ok: false, error: authErrorMessage(error) };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  },

  completePasswordReset: async (newPassword) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Autentikasi belum dikonfigurasi pada deployment ini." };
    try {
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: authErrorMessage(error) };
      set({ recoveryMode: false });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  },

  setSyncPhase: (p) => set({ syncPhase: p }),
  setMigrationPrompt: (p) => set({ migrationPrompt: p }),
  setSyncError: (msg) =>
    set((s) => ({
      syncError: msg,
      // Dorongan ulang yang berhasil mengembalikan fase ke aktif.
      syncPhase: msg === null && s.syncPhase === "error" ? "active" : s.syncPhase,
    })),
  clearRecovery: () => set({ recoveryMode: false }),
}));
