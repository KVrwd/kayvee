-- Run this once in the Supabase SQL editor (or `supabase db push` if you
-- keep it under supabase/migrations). Safe to re-run - everything is
-- guarded with IF NOT EXISTS / ON CONFLICT.

-- =========================================================
-- app_settings: gate codes + rotation epoch
-- Small, publicly-readable key/value table. Never put anything sensitive
-- in here - it is intentionally readable with the anon key, same as it
-- was before this rebuild.
-- =========================================================
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_all" on public.app_settings;
create policy "app_settings_read_all"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy for anon/authenticated: only the
-- admin-actions edge function (service role) rotates these values.

insert into public.app_settings (key, value) values
  ('gate_code', '321456V'),
  ('admin_gate_code', '123654V'),
  ('gate_epoch', '1')
on conflict (key) do nothing;


-- =========================================================
-- app_users: onboarding profile per device (name, email, birth date)
-- There is no Supabase Auth account behind these rows - device_id (a
-- random id generated once on the device) is the only key. Because of
-- that, RLS grants NOTHING to anon/authenticated: every read and write
-- goes through the submit-profile / admin-actions edge functions, which
-- use the service role key. This keeps names/emails/birth dates from
-- being readable by anyone who simply has the app's public anon key.
-- =========================================================
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  email text not null,
  birth_date date not null,
  is_admin boolean not null default false,
  verified_epoch integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
-- Deliberately no policies here for anon/authenticated - see comment above.


-- =========================================================
-- Edge function secrets (set these with the Supabase CLI, never in code):
--
--   supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
--   supabase secrets set TELEGRAM_CHAT_ID=your_private_chat_id
--   supabase secrets set ADMIN_ACCESS_KEY=choose-a-long-random-value
--
-- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
-- to edge functions by Supabase - you don't set those yourself.
-- =========================================================
