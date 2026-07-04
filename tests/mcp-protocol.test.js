const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LATEST_PROTOCOL_VERSION,
  mcpToolName,
  rpcResult,
  rpcError,
  RPC_ERRORS,
  handleInitialize,
  toolCallResultFromOutcome
} = require('../lib/mcp/protocol-core');

test('mcpToolName maps feature keys to MCP-safe names reversibly', () => {
  assert.equal(mcpToolName('gmail.send', 'aaaabbbb-0000', false), 'gmail__send');
  assert.equal(mcpToolName('custom_rest.write', 'aaaabbbb-0000', false), 'custom_rest__write');
  assert.equal(mcpToolName('gmail.send', 'aaaabbbb-0000', true), 'gmail__send--aaaabbbb');
});

test('initialize echoes a supported protocol version', () => {
  const res = handleInitialize(1, { protocolVersion: '2025-03-26' });
  assert.equal(res.jsonrpc, '2.0');
  assert.equal(res.id, 1);
  assert.equal(res.result.protocolVersion, '2025-03-26');
  assert.equal(typeof res.result.serverInfo.name, 'string');
  assert.ok(res.result.capabilities.tools);
});

test('initialize falls back to the latest version for unknown requests', () => {
  const res = handleInitialize(2, { protocolVersion: '1999-01-01' });
  assert.equal(res.result.protocolVersion, LATEST_PROTOCOL_VERSION);
  const noParams = handleInitialize(3, undefined);
  assert.equal(noParams.result.protocolVersion, LATEST_PROTOCOL_VERSION);
});

test('rpc helpers build spec-shaped envelopes', () => {
  assert.deepEqual(rpcResult(7, { ok: true }), { jsonrpc: '2.0', id: 7, result: { ok: true } });
  const err = rpcError(8, RPC_ERRORS.METHOD_NOT_FOUND, 'Method not found: nope');
  assert.equal(err.error.code, -32601);
  assert.equal(err.id, 8);
});

test('successful outcomes become content blocks with structuredContent', () => {
  const res = toolCallResultFromOutcome({ kind: 'success', data: { emails: [1, 2] } });
  assert.equal(res.isError, false);
  assert.equal(res.content[0].type, 'text');
  assert.deepEqual(JSON.parse(res.content[0].text), { emails: [1, 2] });
  assert.deepEqual(res.structuredContent, { emails: [1, 2] });
});

test('array and scalar results omit structuredContent', () => {
  const arr = toolCallResultFromOutcome({ kind: 'success', data: [1, 2] });
  assert.equal(arr.structuredContent, undefined);
  const scalar = toolCallResultFromOutcome({ kind: 'success', data: 'done' });
  assert.equal(scalar.structuredContent, undefined);
  assert.equal(scalar.isError, false);
});

test('pending approvals return a non-error result carrying the approval id', () => {
  const res = toolCallResultFromOutcome({ kind: 'pending', approvalId: 'appr-1' });
  assert.equal(res.isError, false);
  assert.equal(res.structuredContent.status, 'pending_approval');
  assert.equal(res.structuredContent.approval_id, 'appr-1');
});

test('denied, rate-limited, and failed outcomes are isError tool results', () => {
  for (const kind of ['denied', 'rate_limited', 'error', 'not_found']) {
    const res = toolCallResultFromOutcome({ kind, error: `${kind} happened` });
    assert.equal(res.isError, true, kind);
    assert.match(res.content[0].text, new RegExp(`${kind} happened`));
  }
});
