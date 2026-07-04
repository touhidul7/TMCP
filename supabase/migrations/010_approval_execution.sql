-- Close the approval loop: approved calls now execute and store their outcome so the requesting
-- agent can retrieve the result (GET /api/gateway/approvals/{id}) instead of dead-ending at
-- "pending".

alter table tool_approvals add column if not exists result jsonb;
alter table tool_approvals add column if not exists error text;
alter table tool_approvals add column if not exists executed_at timestamptz;

-- Agents poll their own approvals by id; admins list pending ones per workspace.
create index if not exists idx_tool_approvals_workspace_status
  on tool_approvals (workspace_id, status, created_at desc);
