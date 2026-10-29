-- ============================================================
-- Tazkiya — Skema database Supabase (Auth + penyimpanan per-akun)
-- ============================================================
-- Cara pakai:
--   1. Buat proyek di https://supabase.com (gratis).
--   2. Buka SQL Editor di dashboard → tempel seluruh file ini → Run.
--   3. (Disarankan) Authentication → Providers → Email:
--      - aktifkan "Confirm email" agar pendaftaran wajib verifikasi email;
--      - URL Configuration → Site URL = https://tazkiyaapp.vercel.app
--        dan tambahkan Redirect URL: https://tazkiyaapp.vercel.app/**
--      (diperlukan untuk tautan verifikasi & atur-ulang kata sandi).
--   4. Ambil Project URL & anon public key → pasang sebagai env var di Vercel:
--        NEXT_PUBLIC_SUPABASE_URL
--        NEXT_PUBLIC_SUPABASE_ANON_KEY
--      lalu redeploy.
--
-- KEAMANAN: Row Level Security dipaksa aktif. Tidak ada policy untuk peran
-- `anon`, sehingga pengguna yang belum login TIDAK bisa membaca/menulis
-- data siapa pun. Setiap pengguna hanya bisa mengakses baris miliknya
-- sendiri (auth.uid() = user_id) — otorisasi di sisi database, bukan UI.
-- ============================================================

create table if not exists public.user_data (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_data is
  'Dokumen data ibadah per pengguna (Tazkiya). Satu baris = satu akun.';

alter table public.user_data enable row level security;

-- Hapus policy lama bila skrip dijalankan ulang (idempoten).
drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;

-- Pengguna ter-autentikasi hanya boleh membaca barisnya sendiri.
create policy "user_data_select_own" on public.user_data
  for select
  using (auth.uid() = user_id);

-- Hanya boleh membuat baris miliknya sendiri.
create policy "user_data_insert_own" on public.user_data
  for insert
  with check (auth.uid() = user_id);

-- Hanya boleh memperbarui barisnya sendiri (dan tidak bisa memindahkan kepemilikan).
create policy "user_data_update_own" on public.user_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Hanya boleh menghapus barisnya sendiri.
create policy "user_data_delete_own" on public.user_data
  for delete
  using (auth.uid() = user_id);

-- updated_at diperbarui otomatis pada setiap penulisan.
create or replace function public.tz_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before update on public.user_data
  for each row
  execute function public.tz_touch_updated_at();
