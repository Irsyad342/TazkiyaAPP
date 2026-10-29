/**
 * Tazkiya — Klien Supabase (Auth + Database) yang sadar-konfigurasi.
 *
 * Aplikasi berjalan penuh secara lokal (localStorage) TANPA autentikasi.
 * Fitur akun & sinkronisasi cloud hanya AKTIF bila dua environment variable
 * publik tersedia saat build:
 *   - NEXT_PUBLIC_SUPABASE_URL      (Project URL dari dashboard Supabase)
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY (anon public key — bukan service role!)
 *
 * Tidak ada nilai rahasia yang dikarang di sini: bila variabel tidak ada,
 * `isAuthConfigured` = false dan seluruh UI akun menampilkan kondisi
 * "belum dikonfigurasi" secara jujur.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** URL valid https (atau localhost untuk pengembangan lokal/self-host). */
function urlLooksValid(raw?: string): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" ||
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/** true bila deployment ini memiliki konfigurasi Supabase yang layak pakai. */
export const isAuthConfigured: boolean =
  urlLooksValid(SUPABASE_URL) && !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length >= 20;

let client: SupabaseClient | null = null;

/**
 * Ambil klien Supabase bersama (lazy singleton).
 * Mengembalikan `null` bila belum dikonfigurasi — PEMANGGIL WAJIB menangani null.
 * Sesi disimpan oleh supabase-js di localStorage (refresh token berotasi otomatis),
 * sehingga pengguna tidak perlu login ulang setiap kali membuka aplikasi.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isAuthConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return client;
}

/**
 * Terjemahkan error Supabase/jaringan menjadi pesan Indonesia yang mudah
 * dipahami — tidak ada kode teknis yang dibuang mentah ke pengguna.
 */
export function authErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string; name?: string } | null;
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "Email atau kata sandi salah. Periksa kembali lalu coba lagi.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Email belum diverifikasi. Buka tautan verifikasi yang dikirim ke kotak masukmu.";
  if (code === "user_not_found" || msg.includes("user not found"))
    return "Akun dengan email ini tidak ditemukan. Periksa ejaan email atau daftar akun baru.";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered"))
    return "Email ini sudah terdaftar. Silakan masuk, atau gunakan email lain untuk mendaftar.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || msg.includes("rate limit"))
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (code === "user_banned" || msg.includes("banned"))
    return "Akun ini dinonaktifkan. Hubungi dukungan Tazkiya.";
  if (code === "weak_password" || msg.includes("password"))
    return "Kata sandi terlalu lemah. Gunakan minimal 8 karakter.";
  if (code === "signup_disabled" || msg.includes("signups not allowed"))
    return "Pendaftaran akun baru sedang dinonaktifkan pada deployment ini.";
  if (code === "same_password")
    return "Kata sandi baru harus berbeda dari yang lama.";
  if (e?.name === "TypeError" || msg.includes("fetch") || msg.includes("network"))
    return "Tidak dapat terhubung ke server. Periksa koneksi internetmu lalu coba lagi.";
  if (msg.includes("valid email") || msg.includes("email address"))
    return "Format email tidak valid. Contoh: nama@email.com";

  return "Terjadi kesalahan tak terduga. Coba lagi beberapa saat.";
}
