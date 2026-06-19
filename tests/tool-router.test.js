const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('router executes configured Slack actions', async () => {
  const postResult = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'slack.post_message',
    input: { channel: '#alerts', message: 'Deploy complete' },
    credentialRecord: credential('slack-secret')
  });

  assert.equal(postResult.success, true);
  assert.equal(postResult.channel, '#alerts');
  assert.equal(postResult.mode, 'authenticated');

  const listResult = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'slack.list_channels',
    input: {},
    credentialRecord: credential('slack-secret')
  });

  assert.equal(listResult.success, true);
  assert.ok(listResult.channels.length > 0);
  assert.equal(listResult.mode, 'authenticated');
});

test('router executes configured IMAP and SMTP actions', async () => {
  const readResult = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'imap.read_emails',
    input: {},
    credentialRecord: credential('app-password')
  });

  assert.equal(readResult.success, true);
  assert.equal(readResult.mode, 'authenticated');
  assert.ok(readResult.emails.length > 0);

  const searchResult = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'imap.search_emails',
    input: { query: 'invoice' },
    credentialRecord: credential('app-password')
  });

  assert.equal(searchResult.success, true);
  assert.equal(searchResult.mode, 'authenticated');
  assert.equal(searchResult.emails[0].id, 'msg-imap-1');

  const sendResult = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'imap.send_email',
    input: { to: 'ops@example.com', subject: 'Status', body: 'All good' },
    credentialRecord: credential('app-password')
  });

  assert.equal(sendResult.success, true);
  assert.equal(sendResult.recipient, 'ops@example.com');
  assert.equal(sendResult.mode, 'authenticated');
});

function jsonFetch(payload, { ok = true, status = 200 } = {}) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
  };
  return calls;
}

test('router executes openai.chat against OpenAI API', async () => {
  const calls = jsonFetch({ model: 'gpt-4o-mini', choices: [{ message: { content: 'Hello there' } }], usage: { total_tokens: 5 } });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'openai.chat',
    input: { prompt: 'Hi', model: 'gpt-4o-mini' },
    credentialRecord: credential('openai-secret')
  });

  assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer openai-secret');
  assert.deepEqual(JSON.parse(calls[0].options.body).messages, [{ role: 'user', content: 'Hi' }]);
  assert.equal(result.reply, 'Hello there');
  assert.equal(result.mode, 'authenticated');
});

test('router executes anthropic.chat with x-api-key header', async () => {
  const calls = jsonFetch({ model: 'claude-3-5-sonnet-20241022', content: [{ type: 'text', text: 'Claude reply' }] });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'anthropic.chat',
    input: { prompt: 'Hi Claude' },
    credentialRecord: credential('anthropic-secret')
  });

  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].options.headers['x-api-key'], 'anthropic-secret');
  assert.equal(calls[0].options.headers['anthropic-version'], '2023-06-01');
  assert.equal(result.reply, 'Claude reply');
});

test('router executes openrouter.chat against OpenRouter API', async () => {
  const calls = jsonFetch({ model: 'openai/gpt-4o-mini', choices: [{ message: { content: 'Routed reply' } }] });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'openrouter.chat',
    input: { messages: [{ role: 'user', content: 'Hi' }] },
    credentialRecord: credential('or-secret')
  });

  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer or-secret');
  assert.equal(result.reply, 'Routed reply');
});

test('router executes notion.search against Notion API', async () => {
  const calls = jsonFetch({ results: [{ id: 'page-1' }], next_cursor: null });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'notion.search',
    input: { query: 'Roadmap' },
    credentialRecord: credential('notion-secret')
  });

  assert.equal(calls[0].url, 'https://api.notion.com/v1/search');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer notion-secret');
  assert.equal(calls[0].options.headers['Notion-Version'], '2022-06-28');
  assert.equal(result.results[0].id, 'page-1');
});

test('router executes airtable.list_records using base_id and table', async () => {
  const calls = jsonFetch({ records: [{ id: 'rec1', fields: { Name: 'Jane' } }] });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'airtable.list_records',
    input: { base_id: 'appABC', table: 'Leads', page_size: 5 },
    credentialRecord: credential('airtable-secret')
  });

  const calledUrl = new URL(calls[0].url);
  assert.equal(calledUrl.origin + calledUrl.pathname, 'https://api.airtable.com/v0/appABC/Leads');
  assert.equal(calledUrl.searchParams.get('pageSize'), '5');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer airtable-secret');
  assert.equal(result.records[0].id, 'rec1');
});

test('router executes hubspot.list_contacts against HubSpot API', async () => {
  const calls = jsonFetch({ results: [{ id: '1', properties: { email: 'a@b.com' } }], paging: null });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'hubspot.list_contacts',
    input: { limit: 10 },
    credentialRecord: credential('hubspot-secret')
  });

  const calledUrl = new URL(calls[0].url);
  assert.equal(calledUrl.origin + calledUrl.pathname, 'https://api.hubapi.com/crm/v3/objects/contacts');
  assert.equal(calledUrl.searchParams.get('limit'), '10');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer hubspot-secret');
  assert.equal(result.contacts[0].id, '1');
});

test('router executes stripe.list_customers with form auth', async () => {
  const calls = jsonFetch({ data: [{ id: 'cus_1', email: 'c@d.com' }], has_more: false });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'stripe.list_customers',
    input: { limit: 3 },
    credentialRecord: credential('stripe-secret')
  });

  const calledUrl = new URL(calls[0].url);
  assert.equal(calledUrl.origin + calledUrl.pathname, 'https://api.stripe.com/v1/customers');
  assert.equal(calledUrl.searchParams.get('limit'), '3');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer stripe-secret');
  assert.equal(result.customers[0].id, 'cus_1');
});

test('router executes linear.list_issues via GraphQL', async () => {
  const calls = jsonFetch({ data: { issues: { nodes: [{ id: 'i1', identifier: 'TMC-1', title: 'Bug' }] } } });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'linear.list_issues',
    input: { limit: 10 },
    credentialRecord: credential('linear-secret')
  });

  assert.equal(calls[0].url, 'https://api.linear.app/graphql');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'linear-secret');
  assert.equal(result.issues[0].identifier, 'TMC-1');
});

function credentialPair(apiKey, accessToken) {
  return { encrypted_api_key: encryptText(apiKey), encrypted_access_token: encryptText(accessToken) };
}

test('router executes twilio.send_sms with Basic auth from SID + auth token', async () => {
  const calls = jsonFetch({ sid: 'SM123', to: '+15555550123', from: '+15555550100', status: 'queued' }, { status: 201 });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'twilio.send_sms',
    input: { to: '+15555550123', from: '+15555550100', body: 'Hello' },
    credentialRecord: credentialPair('ACsid', 'authtok')
  });

  assert.equal(calls[0].url, 'https://api.twilio.com/2010-04-01/Accounts/ACsid/Messages.json');
  assert.equal(calls[0].options.headers.Authorization, 'Basic ' + Buffer.from('ACsid:authtok').toString('base64'));
  assert.equal(new URLSearchParams(calls[0].options.body.toString()).get('Body'), 'Hello');
  assert.equal(result.sid, 'SM123');
});

test('router executes mailchimp.add_subscriber against the data-center host', async () => {
  const calls = jsonFetch({ id: 'abc', email_address: 'sub@example.com', status: 'subscribed' });

  const result = await runTool({
    tool: { tool_type: 'built_in', _connectionMetadata: { data_center: 'us19' } },
    featureKey: 'mailchimp.add_subscriber',
    input: { list_id: 'aud1', email: 'sub@example.com' },
    credentialRecord: credential('mc-key-us19')
  });

  const calledUrl = new URL(calls[0].url);
  assert.equal(calledUrl.host, 'us19.api.mailchimp.com');
  assert.equal(calls[0].options.method, 'PUT');
  assert.equal(result.member.status, 'subscribed');
});

test('router executes asana.list_tasks against Asana API', async () => {
  const calls = jsonFetch({ data: [{ gid: '1', name: 'Task A' }] });

  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'asana.list_tasks',
    input: { project: 'proj1' },
    credentialRecord: credential('asana-secret')
  });

  const calledUrl = new URL(calls[0].url);
  assert.equal(calledUrl.origin + calledUrl.pathname, 'https://app.asana.com/api/1.0/tasks');
  assert.equal(calledUrl.searchParams.get('project'), 'proj1');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer asana-secret');
  assert.equal(result.tasks[0].gid, '1');
});

test('postgresql.query rejects non-read statements before connecting', async () => {
  await assert.rejects(
    runTool({
      tool: { tool_type: 'built_in', _connectionMetadata: { host: 'db', database: 'app', username: 'u' } },
      featureKey: 'postgresql.query',
      input: { sql: 'DELETE FROM users' },
      credentialRecord: { encrypted_password: encryptText('pw') }
    }),
    /only allows read statements/
  );
});

test('postgresql.query returns sandbox data without connection config', async () => {
  const result = await runTool({
    tool: { tool_type: 'built_in', _connectionMetadata: {} },
    featureKey: 'postgresql.query',
    input: { sql: 'SELECT 1' },
    credentialRecord: {}
  });
  assert.equal(result.mode, 'sandbox-simulation');
});

test('router executes whatsapp.send_message via Graph API with phone_number_id', async () => {
  const calls = jsonFetch({ messages: [{ id: 'wamid.X' }] });

  const result = await runTool({
    tool: { tool_type: 'built_in', _connectionMetadata: { phone_number_id: '12345' } },
    featureKey: 'whatsapp.send_message',
    input: { to: '15555550123', body: 'Hi' },
    credentialRecord: credential('meta-token')
  });

  assert.equal(calls[0].url, 'https://graph.facebook.com/v21.0/12345/messages');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer meta-token');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.messaging_product, 'whatsapp');
  assert.equal(body.text.body, 'Hi');
  assert.equal(result.message_id, 'wamid.X');
});

test('router executes facebook.publish_post to the page feed', async () => {
  const calls = jsonFetch({ id: '777_888' }, { status: 200 });

  const result = await runTool({
    tool: { tool_type: 'built_in', _connectionMetadata: { page_id: '777' } },
    featureKey: 'facebook.publish_post',
    input: { message: 'Launch day!' },
    credentialRecord: credential('page-token')
  });

  assert.equal(calls[0].url, 'https://graph.facebook.com/v21.0/777/feed');
  assert.equal(JSON.parse(calls[0].options.body).message, 'Launch day!');
  assert.equal(result.post_id, '777_888');
});

test('router executes instagram.publish_media as a two-step container publish', async () => {
  const responses = [{ id: 'container-1' }, { id: 'media-1' }];
  let i = 0;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const payload = responses[i++];
    return { ok: true, status: 200, json: async () => payload, text: async () => JSON.stringify(payload) };
  };

  const result = await runTool({
    tool: { tool_type: 'built_in', _connectionMetadata: { ig_user_id: 'ig99' } },
    featureKey: 'instagram.publish_media',
    input: { image_url: 'https://example.com/p.jpg', caption: 'Hi' },
    credentialRecord: credential('ig-token')
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v21.0/ig99/media');
  assert.equal(calls[1].url, 'https://graph.facebook.com/v21.0/ig99/media_publish');
  assert.equal(JSON.parse(calls[1].options.body).creation_id, 'container-1');
  assert.equal(result.media_id, 'media-1');
});

test('new API-key tools fall back to sandbox simulation without a key', async () => {
  const result = await runTool({
    tool: { tool_type: 'built_in' },
    featureKey: 'stripe.list_customers',
    input: {},
    credentialRecord: {}
  });
  assert.equal(result.success, true);
  assert.equal(result.mode, 'sandbox-simulation');
});

test('built-in connection config does not seed known unsupported feature keys', () => {
  const routePath = path.join(__dirname, '..', 'app', 'api', 'tool-accounts', 'add', 'route.js');
  const source = fs.readFileSync(routePath, 'utf8');

  assert.doesNotMatch(source, /feature_key:\s*"slack\.send_dm"/);
  assert.doesNotMatch(source, /feature_key:\s*"email\./);
  assert.doesNotMatch(source, /feature_key:\s*"gmail_app\./);
});
