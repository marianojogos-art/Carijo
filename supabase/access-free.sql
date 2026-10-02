create table if not exists public.carijo_generation_runs (
id uuid primary key default gen_random_uuid(),
session_key text not null,
user_id uuid references auth.users(id) on delete set null,
request_type text not null check (request_type in ('plan','activity')),
model text not null,
status text not null check (status in ('pending','succeeded','failed')),
input_tokens integer,
output_tokens integer,
total_tokens integer,
estimated_cost_usd numeric,
error_code text,
created_at timestamptz not null default now(),
completed_at timestamptz
);
alter table public.carijo_generation_runs enable row level security;
revoke all on public.carijo_generation_runs from public, anon, authenticated;
grant all on public.carijo_generation_runs to service_role;
create unique index if not exists carijo_generation_one_pending_session on public.carijo_generation_runs(session_key) where status='pending';
create index if not exists carijo_generation_runs_created on public.carijo_generation_runs(created_at desc);
