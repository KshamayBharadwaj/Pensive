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
