-- API key rotation pools for the "Gemini API Rotate" and "OpenRouter API Rotate" tools.
-- Each connected rotate account owns a pool of provider API keys that TMCP rotates
-- through behind a single TMCP API key, with cooldown + usage tracking per key.
create table if not exists provider_key_pool (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  tool_account_id uuid references tool_accounts(id) on delete cascade,
  provider text not null,                 -- 'gemini' | 'openrouter' | 'scrapedo' | 'apify'
  label text,
  encrypted_key text not null,            -- AES-256-GCM sealed provider key
  key_hint text,                          -- last few chars for display, e.g. '…a1b2'
  status text not null default 'active',  -- 'active' | 'cooling' | 'disabled'
  cooldown_until timestamptz,
  last_used_at timestamptz,
  last_success_at timestamptz,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_provider_key_pool_account on provider_key_pool(tool_account_id);

-- All access goes through the service role (supabaseAdmin); enable RLS with no policies
-- so the encrypted keys are never readable via the anon/public client.
alter table provider_key_pool enable row level security;
