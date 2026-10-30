/** Probe 2: SET ROLE attempts + sisa kemungkinan lokasi JWT secret. */
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
    console.log(`--${label}--`, JSON.stringify(r.rows).slice(0, 800));
  } catch (e) {
    console.log(`--${label}-- ERR:`, (e as Error).message.split("\n")[0]);
  }
};
await q("setrole-authenticator", "set role authenticator; select current_setting('app.settings.jwt_secret', true) as v");
await q("setrole-supabase_admin", "reset role; set role supabase_admin; select current_setting('app.settings.jwt_secret', true) as v");
await q("reset", "reset role; select 1 as alive");
await q("pg_available_extensions", "select name from pg_available_extensions where name ilike '%supa%' or name ilike '%vault%' or name ilike '%sodium%' limit 8");
await q("extensions_schema_tables", "select table_schema, count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema') group by 1 order by 1");
await pool.end();
