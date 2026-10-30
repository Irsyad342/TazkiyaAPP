/** Probe sementara: cari JWT secret di katalog Postgres Supabase. */
import pg from "pg";
const REF = "ujapagwhhvpskvyitxbn";
const PW = process.env.SUPA_DB_PASSWORD ?? "";
const pool = new pg.Pool({
  connectionString: `postgresql://postgres.${REF}:${encodeURIComponent(PW)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const q = async (label: string, sql: string) => {
  try {
    const r = await pool.query(sql);
    console.log(`--${label}--`, JSON.stringify(r.rows).slice(0, 1500));
  } catch (e) {
    console.log(`--${label}-- ERR:`, (e as Error).message.split("\n")[0]);
  }
};
await q("role_settings", "select r.rolname, s.setconfig from pg_db_role_setting s join pg_roles r on r.oid=s.setrole where s.setconfig is not null");
await q("vault_names", "select id, name from vault.secrets limit 10");
await q("auth_config", "select * from auth.config limit 1");
await pool.end();
