create table if not exists public.carijo_administrators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.carijo_model_rates (
 model text not null, valid_from timestamptz not null,
 input_usd numeric not null check(input_usd>=0), cached_input_usd numeric not null check(cached_input_usd>=0), output_usd numeric not null check(output_usd>=0),
 source_url text not null, updated_by uuid references auth.users(id) on delete set null,
 primary key(model,valid_from)
);
create table if not exists public.carijo_admin_audit (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 action text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.carijo_administrators enable row level security;
alter table public.carijo_model_rates enable row level security;
alter table public.carijo_admin_audit enable row level security;
revoke all on public.carijo_administrators,public.carijo_model_rates,public.carijo_admin_audit from public,anon,authenticated;
grant all on public.carijo_administrators,public.carijo_model_rates,public.carijo_admin_audit to service_role;
alter table public.carijo_generation_runs add column if not exists cached_input_tokens integer;
alter table public.carijo_generation_runs add column if not exists usage_complete boolean not null default false;
alter table public.carijo_generation_runs add column if not exists pricing_meta jsonb;
alter table public.carijo_generation_runs add column if not exists output_format text;
create index if not exists carijo_generation_user_created on public.carijo_generation_runs(user_id,created_at desc);
create index if not exists carijo_rates_editor on public.carijo_model_rates(updated_by);
create index if not exists carijo_admin_audit_user on public.carijo_admin_audit(user_id);
