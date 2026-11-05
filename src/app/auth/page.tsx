"use client";

/**
 * Tazkiya — Halaman autentikasi (Masuk / Daftar / Lupa sandi / Atur sandi baru).
 *
 * Desain selaras aplikasi: kanvas lavender bersih, kartu putih rounded besar,
 * tombol pill tinta; dukungan tema gelap–terang (mengikuti data-theme dari
 * localStorage Tazkiya), mobile-first.
 * Bila deployment belum memiliki konfigurasi Supabase, halaman ini jujur
 * menampilkan keterangan "belum dikonfigurasi" — tanpa login palsu.
 */

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  LogIn,
  Mail,
  MailCheck,
  User,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { initSyncBridge } from "@/lib/sync/cloud-sync";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = useAuthStore((s) => s.status);
  const recoveryMode = useAuthStore((s) => s.recoveryMode);

  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login"
  );
  const [forgotOpen, setForgotOpen] = useState(false);
  const resetMode = searchParams.get("mode") === "reset" || recoveryMode;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    initSyncBridge();
    void useAuthStore.getState().initAuth();
  }, []);

  // Sudah masuk (dan bukan alur atur-ulang sandi) → langsung ke halaman utama.
  useEffect(() => {
    if (status === "signedIn" && !resetMode) router.replace("/");
  }, [status, resetMode, router]);

  const unconfigured = status === "unconfigured";
  const loading = status === "loading";

  const validate = (): boolean => {
    const fe: Record<string, string> = {};
    if (mode === "register" && name.trim().length < 2) fe.name = "Nama minimal 2 huruf.";
    if (!email.trim()) fe.email = "Email wajib diisi.";
    else if (!EMAIL_RE.test(email.trim())) fe.email = "Format email tidak valid — contoh: nama@email.com";
    if (!resetMode || mode === "register") {
      if (!password) fe.password = "Kata sandi wajib diisi.";
      else if (password.length < 8) fe.password = "Kata sandi minimal 8 karakter.";
    }
    if (mode === "register" && confirm !== password) fe.confirm = "Konfirmasi kata sandi tidak sama.";
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!validate()) return;
    const auth = useAuthStore.getState();
    setBusy(true);
    try {
      if (resetMode) {
        const res = await auth.completePasswordReset(password);
        if (!res.ok) {
          setError(res.error ?? "Gagal mengatur kata sandi.");
          return;
        }
        router.replace("/");
        return;
      }
      if (mode === "login") {
        const res = await auth.signIn(email, password);
        if (!res.ok) {
          setError(res.error ?? "Gagal masuk.");
          return;
        }
        router.replace("/");
      } else {
        const res = await auth.signUp(name, email, password);
        if (!res.ok) {
          setError(res.error ?? "Gagal mendaftar.");
          return;
        }
        if (res.needsConfirmation) {
          setInfo("Pendaftaran berhasil! Buka email kamu dan ketuk tautan verifikasi untuk mengaktifkan akun.");
          setMode("login");
          setPassword("");
          setConfirm("");
        } else {
          router.replace("/");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const onSendReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email.trim())) {
      setFieldErrors({ email: "Format email tidak valid — contoh: nama@email.com" });
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await useAuthStore.getState().sendPasswordReset(email);
      if (!res.ok) {
        setError(res.error ?? "Gagal mengirim email atur ulang.");
        return;
      }
      setInfo("Tautan atur ulang kata sandi telah dikirim. Periksa kotak masuk (dan folder spam) emailmu.");
      setForgotOpen(false);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (k: string) =>
    fieldErrors[k] ? <p className="mt-1 text-[10.5px] font-bold text-rose-500 light:text-rose-600">{fieldErrors[k]}</p> : null;

  // Kelas input seragam: tinggi nyaman disentuh + border merah saat validasi gagal.
  // (utility menang atas .tz-field karena tz-field kini di @layer components)
  const fieldCls = (k: string, extra?: string) =>
    cn("tz-field min-h-[46px] rounded-2xl", extra, fieldErrors[k] && "border-rose-400/70 focus:border-rose-400/80");

  const title = resetMode ? "Atur Kata Sandi Baru" : forgotOpen ? "Atur Ulang Kata Sandi" : mode === "login" ? "Selamat Datang Kembali" : "Buat Akun Baru";
  const subtitle = resetMode
    ? "Buat kata sandi baru untuk akunmu"
    : forgotOpen
      ? "Masukkan email akunmu — tautan atur ulang akan dikirim"
      : mode === "login"
        ? "Masuk untuk melanjutkan perjalanan ibadahmu"
        : "Catat ibadah dengan akun yang aman milikmu sendiri";

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-tz-stage px-4 py-8">
      {/* Blob pastel latar — statis agar halaman masuk tetap ringan */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="tz-blob left-[14%] top-[18%] h-72 w-72 bg-tz-violet/20" />
        <div className="tz-blob bottom-[10%] right-[16%] h-64 w-64 bg-tz-lime/25" />
      </div>
      <div aria-hidden className="tz-blob -left-10 top-0 h-56 w-56 bg-tz-violet/15 md:hidden" />

      <div className="relative w-full max-w-[400px]">
        <Link
          href="/"
          className="tap mb-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-tz-muted transition-colors hover:text-tz-accent"
        >
          <ArrowLeft size={14} />
          Kembali ke aplikasi
        </Link>

        {/* Kartu utama */}
        <div className="glass rounded-[1.85rem] p-6 shadow-[0_40px_90px_-36px_rgba(84,70,160,0.45)]">
          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-tz-violet to-tz-lavender font-display text-2xl font-extrabold text-white shadow-[0_16px_36px_-14px_rgba(122,104,224,0.7)]">
              ت
              <span aria-hidden className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-tz-lime text-[8px] font-black text-tz-lime-ink" style={{ height: 18, width: 18 }}>
                ✓
              </span>
            </div>
            <h1 className="tz-stat mt-3 text-[22px] font-extrabold tracking-tight text-tz-ink">Tazkiya</h1>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-tz-muted">Pelacak Ibadah Harian</p>
          </div>

          <div className="mt-5">
            <h2 className="font-display text-[16px] font-extrabold text-tz-ink">{title}</h2>
            <p className="mt-0.5 text-[12px] font-medium text-tz-muted">{subtitle}</p>
          </div>

          {unconfigured ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-400/12 px-3.5 py-3 text-[11.5px] font-medium leading-relaxed text-amber-700 light:bg-amber-50 light:text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Fitur akun belum diaktifkan pada deployment ini. Admin perlu mengatur environment variable{" "}
                <code className="rounded bg-black/10 px-1 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
                <code className="rounded bg-black/10 px-1 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> lalu
                memuat ulang aplikasi.
              </span>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="mt-4 rounded-2xl bg-rose-400/12 px-3.5 py-2.5 text-[12px] font-bold leading-relaxed text-rose-500 light:bg-rose-50 light:text-rose-600">
              {error}
            </div>
          ) : null}
          {info ? (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-2xl bg-tz-violet/12 px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-tz-accent">
              <MailCheck size={14} className="mt-0.5 shrink-0" />
              <span>{info}</span>
            </div>
          ) : null}

          {resetMode ? (
            /* ---------- Mode: atur kata sandi baru (dari tautan email) ---------- */
            <form onSubmit={onSubmit} className="mt-4 space-y-3.5" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-bold text-tz-ink/90">Kata sandi baru</span>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldCls("password", "pl-10 pr-11")}
                    aria-invalid={!!fieldErrors.password}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    disabled={unconfigured || busy}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="tap absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-tz-muted transition-colors hover:text-tz-accent"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldError("password")}
              </label>
              <button
                type="submit"
                disabled={unconfigured || busy || loading}
                className="tap tz-btn-ink flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={16} />}
                {busy ? "Menyimpan…" : "Simpan kata sandi baru"}
              </button>
            </form>
          ) : forgotOpen ? (
            /* ---------- Mode: lupa kata sandi ---------- */
            <form onSubmit={onSendReset} className="mt-4 space-y-3.5" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-bold text-tz-ink/90">Email akun</span>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldCls("email", "pl-10")}
                    aria-invalid={!!fieldErrors.email}
                    placeholder="nama@email.com"
                    autoComplete="email"
                    inputMode="email"
                    disabled={unconfigured || busy}
                    required
                  />
                </div>
                {fieldError("email")}
              </label>
              <button
                type="submit"
                disabled={unconfigured || busy || loading}
                className="tap tz-btn-ink flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={16} />}
                {busy ? "Mengirim…" : "Kirim tautan atur ulang"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false);
                  setError(null);
                  setFieldErrors({});
                }}
                className="tap w-full text-center text-[11.5px] font-bold text-tz-muted transition-colors hover:text-tz-accent"
              >
                Kembali ke halaman masuk
              </button>
            </form>
          ) : (
            /* ---------- Mode: masuk / daftar ---------- */
            <>
              {/* Sakelar mode */}
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-tz-line bg-tz-panel-soft p-1" role="tablist" aria-label="Pilih mode autentikasi">
                {(
                  [
                    { id: "login", label: "Masuk", icon: LogIn },
                    { id: "register", label: "Daftar", icon: UserPlus },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === t.id}
                    onClick={() => {
                      setMode(t.id);
                      setError(null);
                      setInfo(null);
                      setFieldErrors({});
                    }}
                    className={cn(
                      "tap flex min-h-[38px] items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold transition-all",
                      mode === t.id ? "tz-btn-ink" : "text-tz-muted hover:text-tz-accent"
                    )}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={onSubmit} className="mt-4 space-y-3.5" noValidate>
                {mode === "register" ? (
                  <label className="block">
                    <span className="mb-1.5 block text-[11.5px] font-bold text-tz-ink/90">Nama panggilan</span>
                    <div className="relative">
                      <User size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={fieldCls("name", "pl-10")}
                        aria-invalid={!!fieldErrors.name}
                        placeholder="Nama kamu"
                        autoComplete="name"
                        maxLength={40}
                        disabled={unconfigured || busy}
                        required
                      />
                    </div>
                    {fieldError("name")}
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-bold text-tz-ink/90">Email</span>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldCls("email", "pl-10")}
                      aria-invalid={!!fieldErrors.email}
                      placeholder="nama@email.com"
                      autoComplete="email"
                      inputMode="email"
                      disabled={unconfigured || busy}
                      required
                    />
                  </div>
                  {fieldError("email")}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-bold text-tz-ink/90">Kata sandi</span>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={fieldCls("password", "pl-10 pr-11")}
                      aria-invalid={!!fieldErrors.password}
                      placeholder={mode === "register" ? "Minimal 8 karakter" : "Kata sandi kamu"}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      disabled={unconfigured || busy}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      className="tap absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-tz-muted transition-colors hover:text-tz-accent"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldError("password")}
                </label>

                {mode === "register" ? (
                  <label className="block">
                    <span className="mb-1.5 block text-[11.5px] font-bold text-tz-ink/90">Konfirmasi kata sandi</span>
                    <div className="relative">
                      <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tz-muted" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={fieldCls("confirm", "pl-10")}
                        aria-invalid={!!fieldErrors.confirm}
                        placeholder="Ulangi kata sandi"
                        autoComplete="new-password"
                        disabled={unconfigured || busy}
                        required
                      />
                    </div>
                    {fieldError("confirm")}
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={unconfigured || busy || loading}
                  className="tap tz-btn-ink flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold disabled:opacity-60"
                >
                  {busy ? <LoaderCircle size={17} className="animate-spin" /> : mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {busy ? (mode === "login" ? "Memproses…" : "Mendaftarkan…") : mode === "login" ? "Masuk" : "Buat Akun"}
                </button>

                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotOpen(true);
                      setError(null);
                      setInfo(null);
                      setFieldErrors({});
                    }}
                    className="tap w-full text-center text-[11.5px] font-bold text-tz-muted transition-colors hover:text-tz-accent"
                  >
                    Lupa kata sandi?
                  </button>
                ) : null}
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[10.5px] leading-relaxed text-tz-muted/90">
          Data ibadah tersimpan terpisah untuk setiap akun — hanya kamu yang dapat membacanya. Kata sandi tidak pernah
          disimpan dalam bentuk teks biasa.
        </p>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-tz-stage">
          <LoaderCircle size={26} className="animate-spin text-tz-violet" aria-label="Memuat" />
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
