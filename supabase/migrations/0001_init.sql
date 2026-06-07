-- Pensieve V1 schema (Supabase PostgreSQL)
-- Run with: supabase db push / SQL editor

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Single-row vault configuration (only one active row enforced by app logic)
create table if not exists public.vault_settings (
  id uuid primary key default gen_random_uuid(),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  google_drive_id text unique,
  name text not null,
  parent_folder_id uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_favorite boolean not null default false,
  is_trashed boolean not null default false
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  google_drive_id text unique not null,
  name text not null,
  mime_type text,
  size bigint,
  folder_id uuid references public.folders(id) on delete set null,
  google_created_at timestamptz,
  google_modified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_favorite boolean not null default false,
  is_trashed boolean not null default false
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete set null,
  action text not null check (action in ('UPLOAD','DOWNLOAD','OPEN','RENAME','MOVE','FAVORITE','UNFAVORITE','DELETE')),
  created_at timestamptz not null default now()
);

-- Indexes (PRD §25)
create index if not exists idx_files_drive on public.files (google_drive_id);
create index if not exists idx_files_name_trgm on public.files using gin (name gin_trgm_ops);
create index if not exists idx_files_folder on public.files (folder_id);
create index if not exists idx_files_fav on public.files (is_favorite) where is_trashed = false;
create index if not exists idx_files_trashed on public.files (is_trashed);
create index if not exists idx_files_gmod on public.files (google_modified_at desc);

create index if not exists idx_folders_drive on public.folders (google_drive_id);
create index if not exists idx_folders_parent on public.folders (parent_folder_id);
create index if not exists idx_folders_name_trgm on public.folders using gin (name gin_trgm_ops);

create index if not exists idx_activity_file on public.activity (file_id);
create index if not exists idx_activity_created on public.activity (created_at desc);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_files_touch on public.files;
create trigger trg_files_touch before update on public.files
for each row execute function public.touch_updated_at();

drop trigger if exists trg_folders_touch on public.folders;
create trigger trg_folders_touch before update on public.folders
for each row execute function public.touch_updated_at();

drop trigger if exists trg_vault_touch on public.vault_settings;
create trigger trg_vault_touch before update on public.vault_settings
for each row execute function public.touch_updated_at();
