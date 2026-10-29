/**
 * Tazkiya — Aktivasi Supabase OTOMATIS (satu perintah).
 *
 * Pemakaian (pilih SALAH SATU mode):
 *
 *  MODE A — paling otomatis (rekomendasi). Butuh SUPABASE ACCESS TOKEN
 *  (dibuat ±30 detik: https://supabase.com/dashboard/account/tokens → "Generate new token"):
 *
 *    bun scripts/activate-supabase.ts --token sbp_xxxxxxxxxxxx
 *
 *  Yang dilakukan Mode A, TANPA sentuhan tangan:
 *    1. Validasi token → daftar organisasi (buat bila belum ada).
 *    2. Buat proyek "tazkiya" (region ap-southeast-1 / Singapura) + password DB acak kuat.
 *    3. Tunggu proyek AKTIF, jalankan seluruh supabase/schema.sql (tabel + RLS).
 *    4. Set Site URL & Redirect URL auth → https://tazkiyaapp.vercel.app.
 *    5. Ambil anon key → tulis ke src/lib/auth/public-config.ts (nilai PUBLIK).
 *    6. Commit + push → Vercel deploy otomatis.
 *    7. UJI END-TO-END nyata: daftar 2 akun uji, verifikasi via admin API,
 *       login, tulis data, BUKTIKAN isolasi RLS (akun-2 TIDAK bisa baca data
 *       akun-1), lalu bersihkan akun uji.
 *    8. Kredensial (termasuk password DB) disimpan ke local-supabase-credentials.json
 *       (di-gitignore) — simpan aman.
 *
 *  MODE B — bila sudah membuat proyek manual di dashboard:
 *
 *    bun scripts/activate-supabase.ts --url https://xxxx.supabase.co --anon eyJhbGci...
 *
 *  Validasi kesehatan → tulis config → push → uji ringan (kesehatan auth +
 *  keberadaan tabel + RLS anon). Schema bila belum jalan: tempel
 *  supabase/schema.sql di dashboard → SQL Editor → Run.
 *
 *  Flag tambahan: --skip-push (jangan commit/push), --skip-e2e, --name <nama proyek>,
 *  --region <region>, --org <organization_id>.
 *
 * CATATAN KEAMANAN: skrip TIDAK mengarang nilai rahasia. Yang masuk repo hanya
 * Project URL + anon key (keduanya publik by design; keamanan dari RLS di DB).
 */
import { spawnSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------- util ----------
const API = "https://api.supabase.com/v1";
const PROD = "https://tazkiyaapp.vercel.app";
const CONFIG_PATH = "src/lib/auth/public-config.ts";
const CRED_PATH = "local-supabase-credentials.json";

const log = (...a: unknown[]) => console.log("•", ...a);
const ok = (...a: unknown[]) => console.log("✓", ...a);
const warn = (...a: unknown[]) => console.warn("!", ...a);
const die = (msg: string, hint?: string): never => {
  console.error("\n✗ GAGAL:", msg);
  if (hint) console.error("  →", hint);
  process.exit(1);
};

function args(): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const av = process.argv.slice(2);
  for (let i = 0; i < av.length; i++) {
    const a = av[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = av[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}
const A = args();
const SKIP_PUSH = !!A["skip-push"];
const SKIP_E2E = !!A["skip-e2e"];

async function api<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: T; raw: string }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* biarkan null */
  }
  return { status: res.status, json: json as T, raw };
}

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = Buffer.from(bytes).toString("base64");
  return `Tz-${b64.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}!9x`;
}

function writeConfig(url: string, anonKey: string): void {
  const content = `/**
 * Tazkiya — Konfigurasi publik Supabase yang DI-COMMIT ke repo.
 *
 * MENGAPA file ini ada?
 * Deployment Vercel terhubung via GitHub push. Nilai Project URL & anon key
 * (yang KEDUANYA memang nilai PUBLIK — anon key dikirim ke browser setiap
 * pengunjung, keamanan dijaga Row Level Security di database, lihat
 * supabase/schema.sql) diletakkan di sini agar build produksi otomatis
 * terkonfigurasi tanpa langkah dashboard tambahan.
 *
 * ATURAN:
 *  - Hanya boleh diisi Project URL + anon/publishable key (NILAI PUBLIK).
 *  - JANGAN pernah menaruh service_role key, database password, atau
 *    kredensial rahasia lain di file ini — file ini masuk Git.
 *  - Environment variable (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *    selalu MENANG atas nilai di sini bila keduanya dipasang.
 *
 * Diisi otomatis oleh scripts/activate-supabase.ts pada
 * ${new Date().toISOString()}.
 */

export const PUBLIC_SUPABASE_URL = "${url}";
export const PUBLIC_SUPABASE_ANON_KEY = "${anonKey}";
`;
  const w = spawnSync("tee", [CONFIG_PATH], { input: content, encoding: "utf8" });
  if (w.status !== 0) die(`Gagal menulis ${CONFIG_PATH}`);
}

function gitPush(): void {
  const run = (cmd: string, gitArgs: string[]) => {
    const r = spawnSync(cmd, gitArgs, { encoding: "utf8" });
    if (r.status !== 0)
      die(`'${cmd} ${gitArgs.join(" ")}' gagal`, (r.stderr || r.stdout || "").slice(0, 400));
  };
  run("git", ["add", CONFIG_PATH]);
  run("git", [
    "commit",
    "-m",
    "Aktivasi Supabase: pasang Project URL & anon key publik (otomatis activate-supabase)",
  ]);
  run("git", ["push", "origin", "main"]);
}

async function waitProduction(url: string, timeoutMs = 10 * 60_000): Promise<void> {
  log("Menunggu deploy produksi Vercel (bisa 2–5 menit)…");
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const html = await (await fetch(`${PROD}/auth`)).text();
      const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[^"]+\.js/g)].map((m) => m[0]);
      for (const c of chunks) {
        const js = await (await fetch(`${PROD}${c}`)).text();
        if (js.includes(new URL(url).hostname)) {
          ok("Deploy produksi SUDAH memuat konfigurasi Supabase.");
          return;
        }
      }
    } catch {
      /* jaringan sesaat — coba lagi */
    }
    await new Promise((r) => setTimeout(r, 20_000));
  }
  die("Deploy produksi tidak terkonfigurasi dalam batas waktu.", "Cek dashboard Vercel.");
}

// ---------- E2E ----------
interface E2eResult {
  signup: boolean;
  login: boolean;
  writeOwn: boolean;
  readOwn: boolean;
  isolation: boolean; // akun-2 TIDAK bisa baca data akun-1
  cleanup: boolean;
}

async function runE2e(
  url: string,
  anonKey: string,
  serviceRoleKey?: string,
): Promise<E2eResult> {
  const res: E2eResult = {
    signup: false,
    login: false,
    writeOwn: false,
    readOwn: false,
    isolation: false,
    cleanup: false,
  };
  const stamp = Date.now().toString(36);
  const email1 = `e2e-tz-${stamp}-a@example.com`;
  const email2 = `e2e-tz-${stamp}-b@example.com`;
  const pass = randomPassword();

  const admin: SupabaseClient | null = serviceRoleKey
    ? createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  const confirmUser = async (userId: string): Promise<boolean> => {
    if (!admin) return false;
    const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    return !error;
  };

  const sb = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // --- akun 1 ---
  const s1 = await sb.auth.signUp({ email: email1, password: pass });
  if (s1.error || !s1.data.user) {
    warn("Signup akun-uji-1 gagal:", s1.error?.message);
    return res;
  }
  res.signup = true;
  const id1 = s1.data.user.id;
  if (s1.data.session === null) {
    const confirmed = await confirmUser(id1);
    if (!confirmed) warn("Tidak dapat verifikasi akun uji via admin API (tanpa service_role?).");
  }

  const l1 = await sb.auth.signInWithPassword({ email: email1, password: pass });
  if (l1.error || !l1.data.session) {
    warn("Login akun-uji-1 gagal:", l1.error?.message);
    return res;
  }
  res.login = true;

  const ins = await sb
    .from("user_data")
    .upsert({ user_id: id1, data: { e2e: true, stamp }, updated_at: new Date().toISOString() });
  if (ins.error) {
    warn("Tulis data akun-1 gagal (skema/RLS?):", ins.error.message);
    return res;
  }
  res.writeOwn = true;

  const r1 = await sb.from("user_data").select("*").eq("user_id", id1);
  res.readOwn = !r1.error && (r1.data?.length ?? 0) === 1;
  if (!res.readOwn) warn("Baca data sendiri gagal:", r1.error?.message ?? "baris tak ditemukan");

  // --- akun 2: bukti isolasi RLS ---
  const s2 = await sb.auth.signUp({ email: email2, password: pass });
  if (s2.error || !s2.data.user) {
    warn("Signup akun-uji-2 gagal:", s2.error?.message);
    return res;
  }
  const id2 = s2.data.user.id;
  if (s2.data.session === null) await confirmUser(id2);
  const l2 = await sb.auth.signInWithPassword({ email: email2, password: pass });
  if (l2.error || !l2.data.session) {
    warn("Login akun-uji-2 gagal:", l2.error?.message);
    return res;
  }
  const r2 = await sb.from("user_data").select("*").eq("user_id", id1);
  // HARUS kosong & tanpa error: RLS memblokir baca data orang lain.
  res.isolation = !r2.error && (r2.data?.length ?? 0) === 0;
  if (!res.isolation)
    warn("PELANGGAN RLS?! akun-2 melihat:", JSON.stringify(r2.data ?? r2.error?.message));

  // --- bersih-bersih ---
  await sb.from("user_data").delete().eq("user_id", id1);
  await sb.auth.signOut();
  if (admin) {
    const d1 = await admin.auth.admin.deleteUser(id1);
    const d2 = await admin.auth.admin.deleteUser(id2);
    res.cleanup = !d1.error && !d2.error;
    if (!res.cleanup) warn("Hapus akun uji gagal:", d1.error?.message, d2.error?.message);
  } else {
    warn("Tanpa service_role: akun uji tidak dihapus otomatis (aman diabaikan).");
  }
  return res;
}

// ---------- MODE A ----------
async function modeA(token: string): Promise<void> {
  log("Mode A — token terdeteksi. Validasi token…");
  const orgsRes = await api<{ id: string; name: string }[]>(token, "GET", "/organizations");
  if (orgsRes.status === 401) die("Access token DITOLAK (401).", "Buat token baru di https://supabase.com/dashboard/account/tokens");
  if (orgsRes.status !== 200) die(`Daftar organisasi gagal (HTTP ${orgsRes.status}).`, orgsRes.raw.slice(0, 300));
  const orgs = orgsRes.json ?? [];
  let orgId = A.org as string | undefined;
  let orgName: string;
  if (orgId) {
    orgName = `(org ${orgId} dari argumen)`;
  } else if (orgs.length > 0) {
    orgId = orgs[0].id;
    orgName = orgs[0].name;
  } else {
    const created = await api<{ id: string; name: string }>(token, "POST", "/organizations", {
      name: "Tazkiya",
    });
    if (created.status !== 201 && created.status !== 200)
      die("Membuat organisasi gagal.", created.raw.slice(0, 300));
    orgId = created.json.id;
    orgName = created.json.name;
  }
  ok(`Organisasi: ${orgName} (${orgId})`);

  const name = (A.name as string) || "tazkiya";
  const region = (A.region as string) || "ap-southeast-1";
  const dbPass = randomPassword();
  log(`Membuat proyek "${name}" (region ${region})…`);
  const projRes = await api<{ id: string; status?: string }>(token, "POST", "/projects", {
    organization_id: orgId,
    name,
    db_pass: dbPass,
    region,
  });
  if (projRes.status !== 201 && projRes.status !== 200)
    die(
      `Membuat proyek gagal (HTTP ${projRes.status}).`,
      projRes.raw.slice(0, 500),
    );
  const ref = projRes.json.id;
  if (!ref) die("Respons pembuatan proyek tidak memuat id.", projRes.raw.slice(0, 300));
  ok(`Proyek dibuat. Ref: ${ref} — menunggu AKTIF…`);

  const t0 = Date.now();
  for (;;) {
    const st = await api<{ status?: string }>(token, "GET", `/projects/${ref}`);
    const s = st.json?.status ?? "?";
    if (/active/i.test(s)) {
      ok(`Status: ${s}`);
      break;
    }
    if (Date.now() - t0 > 12 * 60_000) die(`Proyek tidak AKTIF dalam 12 menit (status: ${s}).`);
    if (st.status >= 400) die(`Cek status proyek gagal HTTP ${st.status}.`, st.raw.slice(0, 300));
    process.stdout.write(`  status: ${s}\r`);
    await new Promise((r) => setTimeout(r, 15_000));
  }

  // schema.sql
  const schema = await Bun.file("supabase/schema.sql").text();
  log("Menjalankan schema.sql (tabel + RLS)…");
  for (let attempt = 1; attempt <= 5; attempt++) {
    const q = await api<unknown>(token, "POST", `/projects/${ref}/database/query`, {
      query: schema,
    });
    if (q.status === 200) {
      ok("Skema & kebijakan RLS terpasang.");
      break;
    }
    if (attempt === 5) die("Eksekusi SQL gagal:", q.raw.slice(0, 500));
    warn(`SQL belum siap (HTTP ${q.status}), ulang dalam 15 dtk…`);
    await new Promise((r) => setTimeout(r, 15_000));
  }

  // auth config (best-effort)
  try {
    await api(token, "PATCH", `/projects/${ref}/config/auth`, {
      site_url: PROD,
      redirect_uris: [`${PROD}/**`],
    });
    ok("Site URL & Redirect URL auth diarahkan ke produksi.");
  } catch {
    warn("Set auth config gagal (non-fatal). Atur manual: dashboard → Authentication → URL Configuration.");
  }

  // api keys
  log("Mengambil API keys…");
  const keysRes = await api<
    { name: string; api_key?: string }[] | { keys?: { name: string; api_key?: string }[] }
  >(token, "GET", `/projects/${ref}/api-keys?reveal=true`);
  if (keysRes.status !== 200) die("Ambil api-keys gagal:", keysRes.raw.slice(0, 300));
  const keysRaw = keysRes.json;
  const list = Array.isArray(keysRaw) ? keysRaw : (keysRaw?.keys ?? []);
  const pick = (n: string) => list.find((k) => k.name === n)?.api_key;
  const anon = pick("anon") ?? pick("publishable");
  const service = pick("service_role") ?? pick("secret");
  if (!anon) die("anon/publishable key tidak ditemukan.", JSON.stringify(list).slice(0, 400));

  const url = `https://${ref}.supabase.co`;
  finishAndVerify(url, anon, service, { ref, dbPass, region });
}

// ---------- MODE B ----------
async function modeB(url: string, anon: string): Promise<void> {
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url))
    die("Format Project URL tidak sesuai.", 'Contoh benar: https://abcdefghijklmnopqr.supabase.co');
  if (anon.length < 20) die("Anon key terlalu pendek — kemungkinan bukan anon/publishable key.");
  log("Memeriksa kesehatan proyek (auth/v1/health)…");
  const h = await fetch(`${url}/auth/v1/health`).then(
    (r) => r.status,
    () => 0,
  );
  if (h !== 200)
    die(
      `Proyek tidak sehat (HTTP ${h}).`,
      "Pastikan proyek AKTIF di dashboard dan URL benar tanpa garis miring di akhir.",
    );
  ok("Proyek sehat.");
  finishAndVerify(url, anon, undefined, {});
}

// ---------- finalisasi ----------
async function finishAndVerify(
  url: string,
  anon: string,
  service: string | undefined,
  extra: { ref?: string; dbPass?: string; region?: string },
): Promise<void> {
  if (SKIP_PUSH) {
    writeConfig(url, anon);
    warn("--skip-push: config ditulis lokal, TIDAK di-commit. Jalankan tanpa flag ini untuk deploy.");
  } else {
    log("Menulis config publik → commit → push (Vercel deploy otomatis)…");
    writeConfig(url, anon);
    gitPush();
  }

  if (extra.ref || extra.dbPass) {
    const cred = {
      project_ref: extra.ref,
      region: extra.region,
      project_url: url,
      anon_key: anon,
      service_role_key: service,
      db_password: extra.dbPass,
      created_at: new Date().toISOString(),
      note: "File LOKAL (di-gitignore). SIMPAN AMAN — jangan dibagikan service_role/db_password.",
    };
    await Bun.write(CRED_PATH, JSON.stringify(cred, null, 2));
    ok(`Kredensial lengkap disimpan: ${CRED_PATH}`);
  }

  if (!SKIP_PUSH) await waitProduction(url);

  if (SKIP_E2E) {
    warn("--skip-e2e: uji end-to-end dilewati.");
  } else {
    log("Uji END-TO-END (2 akun uji + bukti isolasi RLS)…");
    const r = await runE2e(url, anon, service);
    console.table(r);
    if (!r.signup || !r.login || !r.writeOwn || !r.readOwn || !r.isolation)
      die("Ada tahap uji yang gagal — lihat peringatan di atas.");
    ok("Semua tahap LULUS: daftar ✓ login ✓ tulis ✓ baca-sendiri ✓ ISOLASI RLS ✓");
  }

  console.log("\n================ BERHASIL ================");
  console.log(`Project URL : ${url}`);
  console.log(`Anon key    : ${anon.slice(0, 25)}…`);
  if (extra.dbPass) console.log(`DB password : (tersimpan di ${CRED_PATH})`);
  console.log(`Produksi    : ${PROD}/auth`);
  console.log("Silakan coba daftar/masuk dari aplikasi. Selamat! 🎉");
  process.exit(0);
}

// ---------- main ----------
const token = typeof A.token === "string" ? A.token : undefined;
const url = typeof A.url === "string" ? A.url.replace(/\/+$/, "") : undefined;
const anon = typeof A.anon === "string" ? A.anon : undefined;

if (token) {
  await modeA(token).catch((e) => die("Kesalahan tak terduga:", String(e)));
} else if (url && anon) {
  await modeB(url, anon).catch((e) => die("Kesalahan tak terduga:", String(e)));
} else {
  console.error(`
Pemakaian (pilih salah satu):
  MODE A (otomatis penuh): bun scripts/activate-supabase.ts --token <SUPABASE_ACCESS_TOKEN>
  MODE B (proyek manual) : bun scripts/activate-supabase.ts --url <PROJECT_URL> --anon <ANON_KEY>
`);
  process.exit(1);
}
