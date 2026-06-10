const test = require('node:test');
const assert = require('node:assert/strict');

process.env.APP_ENCRYPTION_KEY = '0'.repeat(64);

const { encryptText } = require('../lib/crypto/encrypt');
const { runTool } = require('../lib/tools/router');

function credential(apiKey = 'test-api-key') {
  return { encrypted_api_key: encryptText(apiKey) };
}

test('router executes serper.search with encrypted API key', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        organic: [{ title: 'TMCP', link: 'https://tmcp.vercel.app' }],
        searchParameters: { q: 'tmcp gateway' }
      })
    };
  };

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'serper.search',
    input: { query: 'tmcp gateway', num: 3 },
    credentialRecord: credential('serper-secret')
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://google.serper.dev/search');
  assert.equal(calls[0].options.headers['X-API-KEY'], 'serper-secret');
  assert.deepEqual(JSON.parse(calls[0].options.body), { q: 'tmcp gateway', num: 3 });
  assert.equal(result.organic[0].title, 'TMCP');
});

test('router executes scrapedo.scrape with encrypted API token', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null },
      text: async () => '<html><title>Example</title><body>Hello</body></html>'
    };
  };

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'scrapedo.scrape',
    input: { url: 'https://example.com', render: true },
    credentialRecord: credential('scrapedo-token')
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'GET');
  const calledUrl = new URL(calls[0].url);
  assert.equal(calledUrl.origin + calledUrl.pathname, 'https://api.scrape.do/');
  assert.equal(calledUrl.searchParams.get('token'), 'scrapedo-token');
  assert.equal(calledUrl.searchParams.get('url'), 'https://example.com');
  assert.equal(calledUrl.searchParams.get('render'), 'true');
  assert.equal(result.status, 200);
  assert.match(result.content, /Hello/);
});

test('router executes github.list_issues against GitHub API', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ([{ number: 7, title: 'Fix gateway', state: 'open' }])
    };
  };

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'github.list_issues',
    input: { owner: 'touhidul7', repo: 'TMCP', state: 'open' },
    credentialRecord: credential('gh-secret')
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/touhidul7/TMCP/issues?state=open&per_page=30');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer gh-secret');
  assert.equal(result.repository, 'touhidul7/TMCP');
  assert.equal(result.issues[0].number, 7);
});

test('router executes github.create_issue against GitHub API', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 201,
      json: async () => ({ number: 8, title: 'New issue', state: 'open', html_url: 'https://github.com/touhidul7/TMCP/issues/8' })
    };
  };

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'github.create_issue',
    input: { owner: 'touhidul7', repo: 'TMCP', title: 'New issue', body: 'Details' },
    credentialRecord: credential('gh-secret')
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/touhidul7/TMCP/issues');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { title: 'New issue', body: 'Details' });
  assert.equal(result.issue.number, 8);
});

test('router executes github.create_repository against GitHub API', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 201,
      json: async () => ({ full_name: 'tomaiassistant/new-repo', html_url: 'https://github.com/tomaiassistant/new-repo' })
    };
  };

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'github.create_repository',
    input: { name: 'new-repo', description: 'A new repo', private: true, auto_init: true },
    credentialRecord: credential('gh-secret')
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/user/repos');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: 'new-repo', description: 'A new repo', private: true, auto_init: true });
  assert.equal(result.repository, 'tomaiassistant/new-repo');
});