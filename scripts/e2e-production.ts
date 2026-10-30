/**
 * E2E produksi Tazkiya × Supabase (publishable key — sama seperti di browser).
 * Daftar → sesi → login ulang → tulis user_data → baca milik sendiri →
 * akun kedua → ISOLASI (tak boleh baca milik akun-1) → bersih-bersih via DB.
 */
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const URL = "https://ujapagwhhvpskvyitxbn.supabase.co";
const KEY = "sb_publishable_tt_lOE_VNGdGny-Yuh7H5w_M3KdUe3z";
const PW = process.env.SUPA_DB_PASSWORD ?? "";

const log = (...a: unknown[]) => console.log("•", ...a);
const ok = (...a: unknown[]) => console.log("✓", ...a);
const die = (m: string, h?: string): never => {
  console.error("\n✗ GAGAL:", m);
  if (h) console.error("  →", h);
  process.exit(1);
};

const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now().toString(36);
const E1 = `e2e-tz-${stamp}-a@example.com`;
const E2 = `e2e-tz-${stamp}-b@example.com`;
const PASS = `Tz-e2e-${stamp}-xY9!`;

log(`1/7 Daftar akun uji-1 (${E1})…`);
const s1 = await sb.auth.signUp({ email: E1, password: PASS });
if (s1.error) die("signup-1:", s1.error.message);
const id1 = s1.data.user?.id;
if (!id1) die("signup-1 tanpa user id");
ok(`Akun-1 dibuat${s1.data.session ? " + sesi langsung" : ""} (id ${id1.slice(0, 8)}…)`);

log("2/7 Login ulang dengan kata sandi…");
const l1 = await sb.auth.signInWithPassword({ email: E1, password: PASS });
if (l1.error) die("login-1:", l1.error.message);
ok("Login akun-1 BERHASIL (sesi aktif).");

log("3/7 Tulis data ibadah milik akun-1…");
const ins = await sb.from("user_data").upsert({
  user_id: id1,
  data: { e2e: true, stamp, logs: { "2026-10-30": { subuh: true } } },
  updated_at: new Date().toISOString(),
});
if (ins.error) die("tulis akun-1:", ins.error.message);
ok("Tulis BERHASIL (policy insert lulus).");

log("4/7 Baca data milik sendiri…");
const r1 = await sb.from("user_data").select("*").eq("user_id", id1);
if (r1.error || r1.data?.length !== 1) die("baca sendiri:", r1.error?.message ?? JSON.stringify(r1.data));
ok("Baca sendiri BERHASIL (policy select lulus).");

log(`5/7 Akun-2 (${E2}) coba BACA data akun-1 — harus KOSONG…`);
const s2 = await sb.auth.signUp({ email: E2, password: PASS });
if (s2.error) die("signup-2:", s2.error.message);
const l2 = await sb.auth.signInWithPassword({ email: E2, password: PASS });
if (l2.error) die("login-2:", l2.error.message);
const r2 = await sb.from("user_data").select("*").eq("user_id", id1);
if (r2.error) die("baca silang error:", r2.error.message);
if ((r2.data?.length ?? 0) !== 0) die("PELANGGAN ISOLASI!", JSON.stringify(r2.data));
ok("ISOLASI LULUS: akun-2 melihat 0 baris milik akun-1.");
log("5b/7 Akun-2 tulis & baca miliknya sendiri…");
const id2 = l2.data.user!.id;
const i2 = await sb.from("user_data").upsert({ user_id: id2, data: { e2e: true, stamp }, updated_at: new Date().toISOString() });
if (i2.error) die("tulis akun-2:", i2.error.message);
const r2b = await sb.from("user_data").select("*").eq("user_id", id2);
if (r2b.error || r2b.data?.length !== 1) die("baca sendiri akun-2:", r2b.error?.message);
ok("Akun-2: tulis & baca sendiri BERHASIL (multi-tenant sehat).");
await sb.auth.signOut();

log("6/7 Bersih-bersih akun uji via DB (cascade)…");
const pool = new pg.Pool({
  connectionString: `postgresql://postgres.ujapagwhhvpskvyitxbn:${encodeURIComponent(PW)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const del = await pool.query("delete from auth.users where email like 'e2e-tz-%' returning email");
const rest = await pool.query("select count(*)::int as n from public.user_data");
await pool.end();
ok(`Dihapus ${del.rowCount} akun uji; sisa baris user_data: ${rest.rows[0].n}`);

console.log("\n================= E2E PRODUKSI LULUS =================");
console.log("Daftar ✓  Login ✓  Tulis ✓  Baca-sendiri ✓  ISOLASI RLS ✓  Cleanup ✓");
console.log(`Proyek: ${URL}`);
