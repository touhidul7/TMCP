-- Power features: scoped child keys, per-minute rate limits, rotate response cache, and
-- scheduled workflows. Each section is independent.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Scoped, expiring child API keys
--    scopes = jsonb array of feature keys ("gmail.send") or prefixes ("gmail.*").
--    null scopes = full agent access (all existing keys keep behaving as before).
-- ────────────────────────────────────────────────────────────────────────────
alter table api_keys add column if not exists scopes jsonb;
alter table api_keys add column if not exists parent_key_id uuid references api_keys(id) on delete cascade;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Per-minute rate limits
--    per_minute_limit on the permission row (null/0 = no per-minute cap), enforced
--    against an atomically incremented minute-bucket counter.
-- ────────────────────────────────────────────────────────────────────────────
alter table agent_tool_permissions add column if not exists per_minute_limit int;

create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null,
  api_key_id uuid not null,
  feature_key text not null,
  bucket_start timestamptz not null,
  count int not null default 0,
  unique(agent_id, api_key_id, feature_key, bucket_start)
);
create index if not exists idx_usage_counters_bucket on usage_counters (bucket_start);
alter table usage_counters enable row level security;
create policy "Workspace members can access usage_counters" on usage_counters for all using (true);

-- Atomic increment-and-read for the current minute bucket. Incrementing before the check means
-- rejected attempts also count toward the cap, which is the desired behavior for rate limiting.
create or replace function bump_minute_usage(p_agent_id uuid, p_api_key_id uuid, p_feature_key text)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  insert into usage_counters (agent_id, api_key_id, feature_key, bucket_start, count)
  values (p_agent_id, p_api_key_id, p_feature_key, date_trunc('minute', now()), 1)
  on conflict (agent_id, api_key_id, feature_key, bucket_start)
  do update set count = usage_counters.count + 1
  returning count into v_count;
  return v_count;
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Rotate response cache
--    Short-TTL cache for identical rotate-proxy requests (search queries, embeddings),
--    so repeated calls stop consuming pool quota. Bodies are size-capped by the app.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists rotate_cache (
  cache_key text primary key,
  workspace_id uuid,
  status int not null,
  content_type text,
  body_base64 text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_rotate_cache_expiry on rotate_cache (expires_at);
alter table rotate_cache enable row level security;
create policy "Workspace members can access rotate_cache" on rotate_cache for all using (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Scheduled workflows
--    A job runs one allowed gateway call on an interval (through the normal permission
--    pipeline, attributed to the selected agent + API key) and delivers the result.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  created_by uuid,
  agent_id uuid references agents(id) on delete cascade,
  api_key_id uuid references api_keys(id) on delete cascade,
  name text not null,
  tool_account_id uuid references tool_accounts(id) on delete cascade,
  feature_key text not null,
  input jsonb default '{}'::jsonb,
  interval_minutes int not null check (interval_minutes >= 5),
  delivery jsonb, -- { "type": "webhook" | "email" | "none", "target": "url-or-address" }
  is_enabled boolean default true,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_status text,
  last_result jsonb,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_scheduled_jobs_due on scheduled_jobs (is_enabled, next_run_at);
alter table scheduled_jobs enable row level security;
create policy "Workspace members can access scheduled_jobs" on scheduled_jobs for all using (true);
