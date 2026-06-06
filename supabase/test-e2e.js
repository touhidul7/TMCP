/**
 * End-to-end test: Creates a workspace, agent, API key,
 * then calls the MCP gateway to list available tools.
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://fuhuaanavqlgplraruon.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg';
const GATEWAY_URL = 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey() {
  const raw = 'tmcp_' + crypto.randomBytes(32).toString('hex');
  return raw;
}

async function run() {
  console.log('=== TMCP End-to-End Test ===\n');

  // 1. Create a test workspace
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: 'Test Workspace', owner_user_id: '00000000-0000-0000-0000-000000000001' })
    .select('id, name')
    .single();

  if (wsErr) { console.error('✗ Workspace:', wsErr.message); process.exit(1); }
  console.log('✓ Workspace created:', ws.name, '|', ws.id);

  // 2. Create a test agent
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .insert({
      workspace_id: ws.id,
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Agent',
      description: 'Automated test agent'
    })
    .select('id, name')
    .single();

  if (agentErr) { console.error('✗ Agent:', agentErr.message); process.exit(1); }
  console.log('✓ Agent created:', agent.name, '|', agent.id);

  // 3. Create an API key
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);

  const { data: apiKey, error: keyErr } = await supabase
    .from('api_keys')
    .insert({
      workspace_id: ws.id,
      user_id: '00000000-0000-0000-0000-000000000001',
      agent_id: agent.id,
      name: 'Test Key',
      key_hash: keyHash,
      key_prefix: keyPrefix,
      status: 'active'
    })
    .select('id')
    .single();

  if (keyErr) { console.error('✗ API Key:', keyErr.message); process.exit(1); }
  console.log('✓ API Key created:', keyPrefix + '...');
  console.log('\n  Full key (save this!):', rawKey);

  // 4. Test the MCP gateway — list_tools
  console.log('\n--- Testing MCP Gateway ---');
  try {
    const res = await fetch(`${GATEWAY_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawKey}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    const data = await res.json();
    if (data.result) {
      console.log('✓ Gateway responded! Tools available:', data.result.tools?.length ?? 0);
      if (data.result.tools?.length) {
        data.result.tools.slice(0, 3).forEach(t => console.log('  -', t.name));
        if (data.result.tools.length > 3) console.log(`  ... and ${data.result.tools.length - 3} more`);
      }
    } else if (data.error) {
      console.log('⚠ Gateway error:', data.error.message);
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('✗ Could not reach gateway:', err.message);
    console.log('  Make sure the dev server is running on port 3000');
  }

  // 5. Cleanup
  console.log('\n--- Cleaning up test data ---');
  await supabase.from('api_keys').delete().eq('id', apiKey.id);
  await supabase.from('agents').delete().eq('id', agent.id);
  await supabase.from('workspaces').delete().eq('id', ws.id);
  console.log('✓ Cleaned up');
}

run().catch(console.error);
