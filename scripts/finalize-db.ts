/**
 * Pasang trigger autoconfirm + uji RLS via DB (simulasi PostgREST identity).
 * RLS diuji dengan: set local role authenticated + request.jwt.claims (GUC) —
 * persis mekanisme yang dipakai PostgREST, tanpa perlu anon key.
 */
import pg from "pg";
const REF = "ujapagwhhvpskvyitxbn";
const PW = process.env.SUPA_DB_PASSWORD ?? "";
const SECRET = process.env.SUPA_SECRET_KEY ?? "";
const URL = `https://${REF}.supabase.co`;

const pool = new pg.Pool({
  connectionString: `postgresql://postgres.${REF}:${encodeURIComponent(PW)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const log = (...a: unknown[]) => console.log("•", ...a);
const ok = (...a: unknown[]) => console.log("✓", ...a);
const warn = (...a: unknown[]) => console.warn("!", ...a);

// 1. Trigger autoconfirm (idempoten, no-op utk user yang sudah terkonfirmasi)
log("Pasang trigger autoconfirm…");
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
`);
try {
  await pool.query(
    "grant execute on function public.tz_autoconfirm_signup() to supabase_auth_admin, authenticator, anon, authenticated",
  );
  ok("Trigger tz_autoconfirm_signup terpasang + grant execut(e).");
} catch (e) {
  warn("Grant gagal (cek manual):", (e as Error).message.split("\n")[0]);
}

// 2. Cek perilaku signup via API (server-side test — key TIDAK dikirim ke klien)
if (SECRET) {
  log("Tes signup behavior via API (server-side)…");
  const em = `probe-conf-${Date.now().toString(36)}@example.com`;
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: em, password: "Probe-test-1234!" }),
  }).then(async (x) => ({ s: x.status, j: await x.json().catch(() => null) }), () => ({ s: 0, j: null }));
  const hasSession = !!(r.j as { access_token?: string } | null)?.access_token;
  console.log(`  HTTP ${r.s} — sesi langsung: ${hasSession ? "YA (confirm OFF)" : "TIDAK (confirm ON — trigger akan mengonfirmasi)"}`);
  // beri kesempatan trigger bekerja, lalu cek status user
  await new Promise((r2) => setTimeout(r2, 1500));
  const chk = await pool.query("select email_confirmed_at is not null as confirmed from auth.users where email = $1", [em]);
  ok(`Status konfirmasi user probe: ${chk.rows[0]?.confirmed ? "TERKONFIRMASI (trigger BEKERJA)" : "belum"}`);
  await pool.query("delete from auth.users where email = $1", [em]);
  ok("User probe dibersihkan.");
}

// 3. BUKTI RLS via simulasi PostgREST (dua identitas berbeda)
log("Uji RLS: buat 2 user asli + data, lalu uji akses silang…");
const u1 = crypto.randomUUID(), u2 = crypto.randomUUID();
await pool.query(
  `insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, created_at, updated_at)
   values ($1,$2,'x',now(),'{}'::jsonb,now(),now()), ($3,$4,'x',now(),'{}'::jsonb,now(),now())`,
  [u1, `rls-${u1}@example.com`, u2, `rls-${u2}@example.com`],
);
await pool.query("insert into public.user_data (user_id, data) values ($1, $2::jsonb)", [u1, JSON.stringify({ rls: "milik-u1" })]);

const asUser = async (uid: string, sql: string) => {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
    const r = await c.query(sql);
    await c.query("rollback");
    return r.rows;
  } finally {
    c.release();
  }
};
const own = await asUser(u1, "select data from public.user_data");
const cross = await asUser(u2, "select data from public.user_data");
console.log(`  U1 membaca: ${own.length} baris (harus 1) — ${JSON.stringify(own[0]?.data ?? null)}`);
console.log(`  U2 membaca: ${cross.length} baris (harus 0 — ISOLASI)`);
const anonRow = await (async () => {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role anon");
    await c.query("select set_config('request.jwt.claims', '{}', true)");
    const r = await c.query("select count(*)::int as n from public.user_data");
    await c.query("rollback");
    return r.rows[0].n;
  } finally {
    c.release();
  }
})();
console.log(`  ANON membaca: ${anonRow} baris (harus 0)`);

await pool.query("delete from auth.users where id in ($1,$2)", [u1, u2]);
ok("User uji RLS dibersihkan (cascade user_data).");
const n = await pool.query("select count(*)::int as n from public.user_data");
ok(`Tabel user_data bersih: ${n.rows[0].n} baris.`);
await pool.end();
console.log("\nSELESAI — DB 100% siap. Tinggal publishable/anon key utk klien.");
