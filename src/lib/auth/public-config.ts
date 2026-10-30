/**
 * Tazkiya — Konfigurasi publik Supabase yang DI-COMMIT ke repo.
 *
 * MENGAPA file ini ada?
 * Deployment Vercel terhubung via GitHub push. Nilai Project URL & publishable
 * key (yang KEDUANYA memang nilai PUBLIK — publishable key dikirim ke browser
 * setiap pengunjung, keamanan dijaga Row Level Security di database, lihat
 * supabase/schema.sql — TERBUKTI dalam uji isolasi) diletakkan di sini agar
 * build produksi otomatis terkonfigurasi tanpa langkah dashboard tambahan.
 *
 * ATURAN:
 *  - Hanya boleh diisi Project URL + anon/publishable key (NILAI PUBLIK).
 *  - JANGAN pernah menaruh secret key (sb_secret_...), database password, atau
 *    kredensial rahasia lain di file ini — file ini masuk Git.
 *  - Environment variable (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *    selalu MENANG atas nilai di sini bila keduanya dipasang.
 *
 * Diisi otomatis oleh scripts/activate-supabase.ts pada
 * 2026-10-30 (proyek Supabase milik pemilik, region ap-southeast-1).
 */

export const PUBLIC_SUPABASE_URL = "https://ujapagwhhvpskvyitxbn.supabase.co";
export const PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_tt_lOE_VNGdGny-Yuh7H5w_M3KdUe3z";
