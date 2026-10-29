/**
 * Tazkiya — Konfigurasi publik Supabase yang DI-COMMIT ke repo.
 *
 * MENGAPA file ini ada?
 * Deployment Vercel terhubung via GitHub push. Bila pemilik belum memasang
 * environment variable di dashboard Vercel, nilai Project URL & anon key
 * (yang KEDUANYA memang nilai PUBLIK — anon key dikirim ke browser setiap
 * pengunjung, keamanan dijaga Row Level Security di database, lihat
 * supabase/schema.sql) dapat diletakkan di sini agar build produksi
 * otomatis terkonfigurasi tanpa langkah dashboard tambahan.
 *
 * ATURAN:
 *  - Hanya boleh diisi Project URL + anon/publishable key (NILAI PUBLIK).
 *  - JANGAN pernah menaruh service_role key, database password, atau
 *    kredensial rahasia lain di file ini — file ini masuk Git.
 *  - Environment variable (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *    selalu MENANG atas nilai di sini bila keduanya dipasang.
 *
 * Diisi otomatis oleh scripts/activate-supabase.ts. Kosong = mode lokal jujur
 * (fitur akun menampilkan status "belum dikonfigurasi", tanpa login palsu).
 */

export const PUBLIC_SUPABASE_URL = "";
export const PUBLIC_SUPABASE_ANON_KEY = "";
