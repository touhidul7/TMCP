const test = require('node:test');
const assert = require('node:assert/strict');

const { scopeAllows, scopesWithinParent } = require('../lib/auth/key-scopes');

test('null scopes mean unscoped full access', () => {
  assert.equal(scopeAllows(null, 'gmail.send'), true);
  assert.equal(scopeAllows(undefined, 'anything.at_all'), true);
});

test('exact scopes only match their feature key', () => {
  assert.equal(scopeAllows(['gmail.send'], 'gmail.send'), true);
  assert.equal(scopeAllows(['gmail.send'], 'gmail.search'), false);
  assert.equal(scopeAllows(['gmail.send'], 'gmail.send_all'), false);
});

test('prefix scopes match the whole tool namespace', () => {
  assert.equal(scopeAllows(['gmail.*'], 'gmail.send'), true);
  assert.equal(scopeAllows(['gmail.*'], 'gmail.create_draft'), true);
  assert.equal(scopeAllows(['gmail.*'], 'drive.upload'), false);
  assert.equal(scopeAllows(['*'], 'drive.upload'), true);
});

test('malformed scopes deny rather than crash', () => {
  assert.equal(scopeAllows('gmail.send', 'gmail.send'), false); // not an array
  assert.equal(scopeAllows([42, null], 'gmail.send'), false);
  assert.equal(scopeAllows([], 'gmail.send'), false);
});

test('unscoped parent can mint anything; scoped parent only narrower', () => {
  assert.equal(scopesWithinParent(['gmail.send'], null), true);
  assert.equal(scopesWithinParent(['gmail.send'], ['gmail.*']), true);
  assert.equal(scopesWithinParent(['gmail.*'], ['gmail.*']), true);
  assert.equal(scopesWithinParent(['gmail.*'], ['gmail.send']), false); // widening via wildcard
  assert.equal(scopesWithinParent(['drive.upload'], ['gmail.*']), false);
  assert.equal(scopesWithinParent(['*'], ['gmail.*']), false);
  assert.equal(scopesWithinParent([], ['gmail.*']), false);
});
