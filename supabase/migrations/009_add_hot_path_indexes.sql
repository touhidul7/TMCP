-- Hot-path indexes for the gateway. Every authenticated request looks up api_keys by key_hash,
-- counts recent tool_call_logs for the daily rate limit, and resolves connected tool_accounts —
-- none of which had an index before this migration.

-- API key authentication: exact lookup by hash on every gateway/rotate/MCP request.
-- Unique also guarantees one key record per hash, which .single() already assumes.
create unique index if not exists idx_api_keys_key_hash
  on api_keys (key_hash);

-- Daily rate limit: count of SUCCESS rows per agent/key/feature in the last 24 hours.
create index if not exists idx_tool_call_logs_rate_limit
  on tool_call_logs (agent_id, api_key_id, feature_key, status, created_at desc);

-- Connected-account resolution: filtered by workspace + status on every gateway request.
create index if not exists idx_tool_accounts_workspace_status
  on tool_accounts (workspace_id, status);

-- Rotation candidates: filtered by account and ordered by last_used_at (LRU round-robin).
create index if not exists idx_provider_key_pool_rotation
  on provider_key_pool (tool_account_id, last_used_at asc nulls first);
