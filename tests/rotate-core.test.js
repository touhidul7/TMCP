const test = require('node:test');
const assert = require('node:assert/strict');

const { isRateLimited, parseRetryAfter, runRotation } = require('../lib/rotate/rotate-core');

test('isRateLimited detects 429 and quota-style errors', () => {
  assert.equal(isRateLimited(429, {}), true);
  assert.equal(isRateLimited(403, { error: { message: 'Quota exceeded' } }), true);
  assert.equal(isRateLimited(400, { error: { status: 'RESOURCE_EXHAUSTED' } }), true);
  assert.equal(isRateLimited(200, {}), false);
  assert.equal(isRateLimited(400, { error: { message: 'invalid model' } }), false);
});

test('parseRetryAfter handles seconds and missing header', () => {
  assert.equal(parseRetryAfter('30'), 30);
  assert.equal(parseRetryAfter(null, 45), 45);
  assert.equal(parseRetryAfter('99999'), 3600); // clamped
});

test('runRotation returns the first successful key without cooling others', async () => {
  const seen = [];
  const result = await runRotation({
    keys: [{ id: 'k1' }, { id: 'k2' }],
    send: async (k) => { seen.push(k.id); return { status: 200, body: { ok: true } }; }
  });
  assert.deepEqual(seen, ['k1']);
  assert.equal(result.keyId, 'k1');
  assert.equal(result.exhausted, false);
  assert.equal(result.cooled.length, 0);
  assert.equal(result.status, 200);
});

test('runRotation cools a rate-limited key and retries the next', async () => {
  const seen = [];
  const result = await runRotation({
    keys: [{ id: 'k1' }, { id: 'k2' }],
    send: async (k) => {
      seen.push(k.id);
      if (k.id === 'k1') return { status: 429, body: { error: { message: 'rate' } }, headers: { 'retry-after': '12' } };
      return { status: 200, body: { ok: true } };
    }
  });
  assert.deepEqual(seen, ['k1', 'k2']);
  assert.equal(result.keyId, 'k2');
  assert.equal(result.exhausted, false);
  assert.equal(result.cooled.length, 1);
  assert.equal(result.cooled[0].keyId, 'k1');
  assert.equal(result.cooled[0].cooldownSeconds, 12);
});

test('runRotation returns the original error when all keys are exhausted', async () => {
  const result = await runRotation({
    keys: [{ id: 'k1' }, { id: 'k2' }],
    send: async () => ({ status: 429, body: { error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } } })
  });
  assert.equal(result.exhausted, true);
  assert.equal(result.status, 429);
  assert.equal(result.body.error.type, 'rate_limit_error');
  assert.equal(result.cooled.length, 2);
});

test('runRotation does not rotate on a non-rate-limit error', async () => {
  const seen = [];
  const result = await runRotation({
    keys: [{ id: 'k1' }, { id: 'k2' }],
    send: async (k) => { seen.push(k.id); return { status: 400, body: { error: { message: 'bad model' } } }; }
  });
  assert.deepEqual(seen, ['k1']);
  assert.equal(result.exhausted, false);
  assert.equal(result.status, 400);
  assert.equal(result.cooled.length, 0);
});
