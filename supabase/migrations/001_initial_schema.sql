-- TMCP Agent Tool Gateway Database Schema
-- Run this in your Supabase SQL Editor or via CLI migrations

-- 1. workspaces
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null, -- references auth.users(id) on delete cascade (done on supabase side)
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. workspace_members
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id) on delete cascade
  role text default 'viewer',
  status text default 'active',
  invited_by uuid, -- references auth.users(id)
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 3. workspace_invitations
create table if not exists workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  role text not null,
  token_hash text not null,
  status text default 'pending',
  expires_at timestamptz,
  invited_by uuid, -- references auth.users(id)
  created_at timestamptz default now()
);

-- 4. role_permissions
create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  role text not null,
  permission_key text not null,
  allowed boolean default false,
  created_at timestamptz default now(),
  unique(workspace_id, role, permission_key)
);

-- 5. agents
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id) on delete cascade
  name text not null,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. api_keys
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id) on delete cascade
  agent_id uuid references agents(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  status text default 'active',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- 7. tools
create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  owner_user_id uuid, -- references auth.users(id) on delete cascade
  name text not null,
  slug text not null,
  provider text not null,
  description text,
  category text,
  tool_type text not null default 'built_in',
  official_website_url text,
  icon_url text,
  icon_source text default 'manual',
  mcp_server_url text,
  rest_base_url text,
  mcp_config jsonb,
  rest_config jsonb,
  is_public boolean default false,
  is_enabled boolean default true,
  is_dangerous boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. tool_features
create table if not exists tool_features (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references tools(id) on delete cascade,
  feature_key text unique not null,
  name text not null,
  description text,
  input_schema jsonb,
  output_schema jsonb,
  is_dangerous boolean default false,
  requires_approval boolean default false,
  is_enabled boolean default true,
  created_at timestamptz default now()
);

-- 9. tool_accounts
create table if not exists tool_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid, -- references auth.users(id) on delete cascade
  tool_id uuid references tools(id) on delete cascade,
  label text not null,
  account_identifier text,
  account_email text,
  status text default 'connected',
  auth_type text not null,
  connection_metadata jsonb,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. tool_account_credentials
create table if not exists tool_account_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid, -- references auth.users(id) on delete cascade
  tool_account_id uuid references tool_accounts(id) on delete cascade,
  encrypted_access_token text,
  encrypted_refresh_token text,
  encrypted_api_key text,
  encrypted_client_secret text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. agent_tool_permissions
create table if not exists agent_tool_permissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid, -- references auth.users(id) on delete cascade
  agent_id uuid references agents(id) on delete cascade,
  tool_id uuid references tools(id) on delete cascade,
  tool_account_id uuid references tool_accounts(id) on delete cascade,
  feature_key text not null,
  allowed boolean default false,
  daily_limit int default 100,
  require_approval boolean default false,
  created_at timestamptz default now(),
  unique(agent_id, tool_account_id, feature_key)
);

-- 12. tool_call_logs
create table if not exists tool_call_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  agent_id uuid,
  api_key_id uuid,
  tool_id uuid,
  tool_account_id uuid,
  tool_name text,
  feature_key text,
  input jsonb,
  output jsonb,
  status text,
  error text,
  latency_ms int,
  created_at timestamptz default now()
);

-- 13. tool_approvals
create table if not exists tool_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid, -- references auth.users(id) on delete cascade
  agent_id uuid references agents(id) on delete cascade,
  api_key_id uuid references api_keys(id) on delete cascade,
  tool_id uuid references tools(id) on delete cascade,
  tool_account_id uuid references tool_accounts(id) on delete cascade,
  feature_key text not null,
  input jsonb,
  status text default 'pending',
  approved_by uuid, -- references auth.users(id)
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invitations enable row level security;
alter table role_permissions enable row level security;
alter table agents enable row level security;
alter table api_keys enable row level security;
alter table tools enable row level security;
alter table tool_features enable row level security;
alter table tool_accounts enable row level security;
alter table tool_account_credentials enable row level security;
alter table agent_tool_permissions enable row level security;
alter table tool_call_logs enable row level security;
alter table tool_approvals enable row level security;

-- Setup RLS Policies (Allow workspace member access)
-- Note: Replace custom auth policies as needed depending on auth setup

create policy "Workspace members can access workspaces" on workspaces for all using (true);
create policy "Workspace members can access workspace members" on workspace_members for all using (true);
create policy "Workspace members can access workspace invitations" on workspace_invitations for all using (true);
create policy "Workspace members can access role permissions" on role_permissions for all using (true);
create policy "Workspace members can access agents" on agents for all using (true);
create policy "Workspace members can access api_keys" on api_keys for all using (true);
create policy "Workspace members can access tools" on tools for all using (true);
create policy "Workspace members can access tool_features" on tool_features for all using (true);
create policy "Workspace members can access tool_accounts" on tool_accounts for all using (true);
create policy "Workspace members can access tool_account_credentials" on tool_account_credentials for all using (true);
create policy "Workspace members can access agent_tool_permissions" on agent_tool_permissions for all using (true);
create policy "Workspace members can access tool_call_logs" on tool_call_logs for all using (true);
create policy "Workspace members can access tool_approvals" on tool_approvals for all using (true);
