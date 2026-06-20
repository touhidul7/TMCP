-- Per-user settings for the Tassistant AI assistant.
-- Stores the user's OpenRouter API key encrypted (AES-256-GCM) instead of in the browser.
create table if not exists user_assistant_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- references auth.users(id) on delete cascade (done on supabase side)
  encrypted_openrouter_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- All access goes through the service role (supabaseAdmin); enable RLS with no policies
-- so the table is never readable/writable via the anon/public client.
alter table user_assistant_settings enable row level security;
