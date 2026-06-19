const { decryptText } = require("../crypto/decrypt");

const NOTION_VERSION = "2022-06-28";

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || fallbackMessage);
  }
  return json;
}

function notionHeaders(apiKey) {
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json"
  };
}

async function runNotionTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseUrl = "https://api.notion.com/v1";
  const headers = notionHeaders(apiKey);

  if (featureKey === "notion.search") {
    if (!hasRealKey) {
      return { success: true, results: [{ id: "sandbox-page", title: "Sandbox Page" }], mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(input.query ? { query: input.query } : {}),
        ...(input.filter ? { filter: input.filter } : {}),
        page_size: Math.min(Number(input.page_size || input.limit || 20), 100)
      })
    }), "Notion search failed");
    return { success: true, results: json.results || [], next_cursor: json.next_cursor || null, mode: "authenticated" };
  }

  if (featureKey === "notion.read_page") {
    const pageId = input.page_id || input.id;
    if (!pageId) throw new Error("Missing page_id for notion.read_page");
    if (!hasRealKey) {
      return { success: true, page: { id: pageId }, blocks: [], mode: "sandbox-simulation" };
    }
    const page = await readJson(await fetch(`${baseUrl}/pages/${encodeURIComponent(pageId)}`, { headers }), "Notion read page failed");
    const blocks = await readJson(await fetch(`${baseUrl}/blocks/${encodeURIComponent(pageId)}/children?page_size=100`, { headers }), "Notion read blocks failed");
    return { success: true, page, blocks: blocks.results || [], mode: "authenticated" };
  }

  if (featureKey === "notion.create_page") {
    const parent = input.parent || (input.database_id ? { database_id: input.database_id } : input.parent_page_id ? { page_id: input.parent_page_id } : null);
    if (!parent) throw new Error("Missing parent/database_id/parent_page_id for notion.create_page");
    if (!input.properties && !input.title) throw new Error("Missing properties or title for notion.create_page");

    const properties = input.properties || {
      title: { title: [{ text: { content: String(input.title) } }] }
    };

    if (!hasRealKey) {
      return { success: true, page: { id: "sandbox-new-page" }, mode: "sandbox-simulation" };
    }

    const json = await readJson(await fetch(`${baseUrl}/pages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ parent, properties, ...(input.children ? { children: input.children } : {}) })
    }), "Notion create page failed");
    return { success: true, page: json, mode: "authenticated" };
  }

  if (featureKey === "notion.query_database") {
    const databaseId = input.database_id || input.id;
    if (!databaseId) throw new Error("Missing database_id for notion.query_database");
    if (!hasRealKey) {
      return { success: true, results: [{ id: "sandbox-row" }], mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${baseUrl}/databases/${encodeURIComponent(databaseId)}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(input.filter ? { filter: input.filter } : {}),
        ...(input.sorts ? { sorts: input.sorts } : {}),
        page_size: Math.min(Number(input.page_size || input.limit || 25), 100)
      })
    }), "Notion query database failed");
    return { success: true, results: json.results || [], next_cursor: json.next_cursor || null, mode: "authenticated" };
  }

  throw new Error(`Unsupported Notion feature key: ${featureKey}`);
}

module.exports = { runNotionTool };
