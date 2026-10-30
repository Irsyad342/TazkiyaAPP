import pg from "pg";
const pool = new pg.Pool({
  connectionString: `postgresql://postgres.ujapagwhhvpskvyitxbn:${encodeURIComponent(process.env.SUPA_DB_PASSWORD!)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }, max: 1,
});
const found = await pool.query("select email, email_confirmed_at is not null as confirmed, created_at from auth.users order by created_at");
console.log("Akun di auth.users:", JSON.stringify(found.rows));
const ud = await pool.query("select count(*)::int as n from public.user_data");
console.log("Baris user_data:", ud.rows[0].n);
const del = await pool.query("delete from auth.users where email like 'uji-ui-tazkiya-%' or email like 'e2e-tz-%' returning email");
console.log("Akun uji dihapus:", del.rowCount);
await pool.end();
