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
