// Verifikasi koneksi langsung ke Supabase Postgres (DIRECT_URL) — baca-only.
import pg from "pg";
import dns from "node:dns";

// Sandbox tanpa rute IPv6 → paksa resolusi IPv4 untuk semua koneksi.
dns.setDefaultResultOrder("ipv4first");

const TARGETS = [
  ["pooler (IPv4, port 6543)", process.env.DATABASE_URL],
  ["direct (IPv4 dipaksa, port 5432)", process.env.DIRECT_URL],
];

for (const [label, url] of TARGETS) {
  if (!url) continue;
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const ver = await client.query("select version() as v");
    const tbl = await client.query(
      `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`
    );
    const pol = await client.query(`select count(*)::int as n from pg_policies where schemaname = 'public'`);
    const cnt = await client.query(`select count(*)::int as n from public.user_data`);
    console.log(`✓ [${label}] terhubung — ${ver.rows[0].v.split(",")[0]}`);
    for (const r of tbl.rows) console.log(`    - ${r.tablename} (RLS: ${r.rowsecurity ? "aktif" : "MATI"})`);
    console.log(`    policy RLS: ${pol.rows[0].n} · baris user_data: ${cnt.rows[0].n}`);
    console.log("SEMUA CEK DB LULUS");
    process.exitCode = 0;
    break;
  } catch (e) {
    console.error(`✗ [${label}] gagal:`, e.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}
