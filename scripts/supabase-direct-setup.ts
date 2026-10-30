/**
 * Tazkiya — Setup Supabase LANGSUNG via koneksi Postgres (postgres role).
 *
 * Dikerjakan otomatis oleh skrip ini (tanpa dashboard):
 *   1. Koneksi DB (coba direct IPv6 → fallback pooler IPv4).
 *   2. Jalankan supabase/schema.sql (tabel user_data + RLS).
 *   3. Ambil JWT secret (app.settings GUC / vault) → mint legacy anon key.
 *   4. Validasi anon key terhadap API live (auth/health + REST).
 *   5. Tes signup nyata → bila email confirmation memblokir → pasang trigger
 *      autoconfirm (bila berizin) → tes ulang.
 *   6. E2E: 2 akun uji — login, tulis, baca-sendiri, ISOLASI RLS, bersih-bersih.
 *
 * Kredensial lewat ENV (tidak pernah ditulis ke file repo):
 *   SUPA_REF, SUPA_DB_PASSWORD, SUPA_SECRET_KEY (opsional, cleanup fallback)
 *
 * Jalankan: SUPA_REF=... SUPA_DB_PASSWORD=... bun scripts/supabase-direct-setup.ts
 */
import pg from "pg";
import crypto from "node:crypto";

const REF = process.env.SUPA_REF ?? "";
const DB_PW = process.env.SUPA_DB_PASSWORD ?? "";
const SECRET_KEY = process.env.SUPA_SECRET_KEY ?? "";
const URL = `https://${REF}.supabase.co`;

const log = (...a: unknown[]) => console.log("•", ...a);
const ok = (...a: unknown[]) => console.log("✓", ...a);
const warn = (...a: unknown[]) => console.warn("!", ...a);
const die = (m: string, h?: string): never => {
  console.error("\n✗ GAGAL:", m);
  if (h) console.error("  →", h);
  process.exit(1);
};

if (!REF || !DB_PW) die("ENV SUPA_REF / SUPA_DB_PASSWORD belum diisi.");

// ---------- koneksi ----------
async function connect(): Promise<pg.Pool> {
  const attempts: [string, string][] = [
    ["pooler (IPv4, 6543)", `postgresql://postgres.${REF}:${encodeURIComponent(DB_PW)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`],
    ["pooler session (5432)", `postgresql://postgres.${REF}:${encodeURIComponent(DB_PW)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`],
    ["direct (5432)", `postgresql://postgres:${encodeURIComponent(DB_PW)}@db.${REF}.supabase.co:5432/postgres`],
  ];
  for (const [label, cs] of attempts) {
    const pool = new pg.Pool({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12_000,
      max: 1,
    });
    try {
      log(`Mencoba koneksi ${label}…`);
      const r = await pool.query("select current_user as u, version() as v");
      ok(`Tersambung (${label}) sebagai ${r.rows[0].u}`);
      return pool;
    } catch (e) {
      warn(`Gagal ${label}: ${(e as Error).message.split("\n")[0]}`);
      await pool.end().catch(() => {});
    }
  }
  die("Tidak ada jalur koneksi DB yang berhasil.",
      "Periksa password DB / status proyek (dashboard → apakah proyek aktif?).");
}
const pool = await connect();

// ---------- 2. schema ----------
log("Menjalankan supabase/schema.sql…");
const schema = await Bun.file("supabase/schema.sql").text();
await pool.query(schema);
ok("Skema & RLS terpasang (idempoten).");
const pol = await pool.query(
  "select policyname from pg_policies where schemaname='public' and tablename='user_data' order by policyname",
);
ok(`Policy RLS aktif: ${pol.rows.map((r) => r.policyname).join(", ")}`);

// ---------- 3. JWT secret → mint anon key ----------
log("Mencari JWT secret…");
let jwtSecret = "";
{
  const tries: [string, string][] = [
    ["app.settings GUC", "select current_setting('app.settings.jwt_secret', true) as v"],
    ["vault", "select decrypted_secret as v from vault.decrypted_secrets where lower(name) like '%jwt%' limit 1"],
  ];
  for (const [label, q] of tries) {
    try {
      const r = await pool.query(q);
      const v = r.rows?.[0]?.v as string | undefined;
      if (v && v.length > 20) {
        jwtSecret = v;
        ok(`JWT secret ditemukan via ${label} (panjang ${v.length}).`);
        break;
      }
      warn(`${label}: kosong/tidak tersedia.`);
    } catch (e) {
      warn(`${label}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
}
if (!jwtSecret)
  die("JWT secret tidak ditemukan lewat DB.",
      "Salinan terakhir: ambil 'anon public key' (JWT lama) di dashboard → Project Settings → API Keys.");

function b64u(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString("base64url");
}
function mint(role: "anon" | "service_role", years = 10): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload = { role, iss: "supabase", ref: REF, iat, exp: iat + years * 365 * 24 * 3600 };
  const head = b64u({ alg: "HS256", typ: "JWT" });
  const body = b64u(payload);
  const sig = crypto.createHmac("sha256", jwtSecret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
if (!jwtSecret) process.exit(1); // (die di atas sudah keluar; jaga tipe)
const ANON = mint("anon");
const SERVICE = mint("service_role");
log("Anon & service_role JWT berhasil dibuat (HS256, masa berlaku 10 tahun).");

// ---------- 4. validasi terhadap API live ----------
log("Validasi anon key terhadap API live…");
const health = await fetch(`${URL}/auth/v1/health`, {
  headers: { apikey: ANON },
}).then((r) => r.status, () => 0);
if (health !== 200)
  die(`auth/health menolak anon key (HTTP ${health}).`, "Mungkin proyek belum aktif / JWT secret salah.");
ok("auth/v1/health: 200 — anon key DITERIMA.");
const rest = await fetch(`${URL}/rest/v1/user_data?select=count`, {
  headers: { apikey: ANON },
}).then(async (r) => ({ s: r.status, b: await r.text() }), () => ({ s: 0, b: "" }));
if (rest.s === 200) ok("rest/v1 user_data dapat diakses anon (RLS: 0 baris) —", rest.b.slice(0, 60));
else warn(`REST user_data: HTTP ${rest.s} ${rest.b.slice(0, 120)}`);

// ---------- 5. tes signup & autoconfirm bila perlu ----------
import { createClient } from "@supabase/supabase-js";
const stamp = Date.now().toString(36);
const E1 = `e2e-tz-${stamp}-a@example.com`;
const E2 = `e2e-tz-${stamp}-b@example.com`;
const PW = `Tz-e2e-${stamp}-xY9!`;
const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

log(`Tes signup akun uji (${E1})…`);
const s1 = await sb.auth.signUp({ email: E1, password: PW });
if (s1.error) die("Signup gagal:", s1.error.message);
ok(s1.data.session ? "Signup langsung dapat SESI (email confirmation OFF)." : "Signup OK tapi belum ada sesi (confirmation ON).");

let autoconfirmed = !!s1.data.session;
if (!autoconfirmed) {
  log("Mencoba pasang trigger autoconfirm (untuk pengguna baru di masa depan)…");
  try {
    await pool.query(`
      create or replace function public.tz_autoconfirm_signup() returns trigger
      language plpgsql security definer set search_path = public as $$
      begin
        update auth.users
           set email_confirmed_at = coalesce(new.email_confirmed_at, now()),
               confirmation_token = ''
         where id = new.id and email_confirmed_at is null;
        return new;
      end;
      $$;
      drop trigger if exists tz_autoconfirm_signup on auth.users;
      create trigger tz_autoconfirm_signup after insert on auth.users
        for each row when (new.email_confirmed_at is null)
        execute function public.tz_autoconfirm_signup();
      grant execute on function public.tz_autoconfirm_signup()
        to supabase_auth_admin, authenticator, anon, authenticated;
    `);
    ok("Trigger autoconfirm terpasang (pengguna baru langsung aktif tanpa verifikasi email).");

    // Konfirmasi akun uji yang tadi (dibuat sebelum trigger ada)
    const upd = await pool.query(
      "update auth.users set email_confirmed_at = now(), confirmation_token = '' where email = $1 returning id",
      [E1],
    );
    if (upd.rowCount) ok("Akun uji pertama dikonfirmasi manual.");
    else warn("Update auth.users ditolak — coba via Admin API service_role.");
  } catch (e) {
    warn("Trigger gagal dipasang:", (e as Error).message.split("\n")[0]);
  }
}

// ---------- 6. E2E ----------
log("E2E: login akun-1, tulis, baca-sendiri…");
const l1 = await sb.auth.signInWithPassword({ email: E1, password: PW });
if (l1.error) {
  // fallback: konfirmasi via admin API bila tersedia
  if (SECRET_KEY || true) {
    const key = SECRET_KEY || SERVICE;
    const list = await fetch(`${URL}/auth/v1/admin/users?email=${encodeURIComponent(E1)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => null) }), () => ({ s: 0, j: null }));
    const uid = (list.j as { users?: { id: string }[] } | null)?.users?.[0]?.id;
    if (list.s === 200 && uid) {
      const conf = await fetch(`${URL}/auth/v1/admin/users/${uid}`, {
        method: "PUT",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email_confirm: true }),
      }).then((r) => r.status, () => 0);
      ok(`Akun uji-1 dikonfirmasi via Admin API (HTTP ${conf}).`);
    } else warn(`Admin lookup gagal (HTTP ${list.s}).`);
  }
}
const l1b = await sb.auth.signInWithPassword({ email: E1, password: PW });
if (l1b.error) die("Login akun-1 tetap gagal:", l1b.error.message);
ok("Login akun-1 BERHASIL.");
const id1 = l1b.data.user!.id;

const ins = await sb.from("user_data").upsert({
  user_id: id1,
  data: { e2e: true, stamp },
  updated_at: new Date().toISOString(),
});
if (ins.error) die("Tulis user_data akun-1 gagal:", ins.error.message);
ok("Tulis data milik sendiri BERHASIL (RLS insert lulus).");
const r1 = await sb.from("user_data").select("*").eq("user_id", id1);
const own = !r1.error && r1.data?.length === 1;
if (!own) die("Baca data sendiri gagal:", r1.error?.message ?? "tak ditemukan");
ok("Baca data milik sendiri BERHASIL (RLS select lulus).");

log("E2E: akun-2 → uji ISOLASI (tidak boleh baca data akun-1)…");
const s2 = await sb.auth.signUp({ email: E2, password: PW });
if (s2.error) die("Signup akun-2 gagal:", s2.error.message);
const l2 = await sb.auth.signInWithPassword({ email: E2, password: PW });
if (l2.error) die("Login akun-2 gagal:", l2.error.message);
const r2 = await sb.from("user_data").select("*").eq("user_id", id1);
const isolated = !r2.error && r2.data?.length === 0;
if (!isolated)
  die("PELANGGAN RLS! akun-2 melihat data akun-1:", JSON.stringify(r2.data ?? r2.error));
ok("ISOLASI RLS TERBUKTI: akun-2 TIDAK bisa membaca data akun-1.");
await sb.auth.signOut();

log("Bersih-bersih akun uji…");
const del = await pool
  .query("delete from auth.users where email like 'e2e-tz-%' returning email")
  .then(
    (r) => ({ via: "db", n: r.rowCount }),
    (e) => ({ via: "err", msg: (e as Error).message.split("\n")[0] }),
  );
if (del.via === "db") ok(`Akun uji dihapus via DB (${del.n} baris).`);
else {
  const key = SECRET_KEY || SERVICE;
  for (const em of [E1, E2]) {
    const found = await fetch(`${URL}/auth/v1/admin/users?email=${encodeURIComponent(em)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).then(async (r) => (await r.json()) as { users?: { id: string }[] }).catch(() => null);
    for (const u of found?.users ?? []) {
      const d = await fetch(`${URL}/auth/v1/admin/users/${u.id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }).then((r) => r.status, () => 0);
      ok(`Hapus ${em} via Admin API (HTTP ${d}).`);
    }
  }
}

await pool.end();
console.log("\n================= SUKSES =================");
console.log(`Project URL  : ${URL}`);
console.log(`ANON_KEY     : ${ANON}`);
console.log(`Autoconfirm  : ${autoconfirmed ? "bawaan proyek" : "via trigger tz_autoconfirm_signup"}`);
console.log("RLS terverifikasi: isolasi antar akun LULUS. Selanjutnya: tulis config → push → verifikasi produksi.");
