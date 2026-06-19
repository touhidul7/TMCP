const { decryptText } = require("../crypto/decrypt");

const GRAPH = "https://graph.facebook.com/v21.0";

function getToken(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || fallbackMessage);
  }
  return json;
}

async function runFacebookTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const token = getToken(credentialRecord);
  const hasRealKey = Boolean(token);
  const pageId = input.page_id || connectionMetadata.page_id;
  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  if (featureKey === "facebook.publish_post") {
    const message = input.message || input.text;
    if (!message && !input.link) throw new Error("Missing 'message' or 'link' for facebook.publish_post");
    if (hasRealKey && !pageId) throw new Error("Missing page_id (set on the connected account or in input)");

    if (!hasRealKey) {
      return { success: true, post_id: `${pageId || "sandbox"}_post`, mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(pageId)}/feed`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...(message ? { message } : {}), ...(input.link ? { link: input.link } : {}) })
    }), "Facebook publish post failed");
    return { success: true, post_id: json.id, mode: "authenticated" };
  }

  if (featureKey === "facebook.list_posts") {
    if (hasRealKey && !pageId) throw new Error("Missing page_id (set on the connected account or in input)");
    if (!hasRealKey) {
      return { success: true, posts: [{ id: "sandbox_post", message: "Sandbox post", created_time: new Date().toISOString() }], mode: "sandbox-simulation" };
    }
    const limit = Math.min(Number(input.limit || 10), 100);
    const fields = input.fields || "id,message,created_time,permalink_url";
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(pageId)}/posts?limit=${limit}&fields=${encodeURIComponent(fields)}`, { headers }), "Facebook list posts failed");
    return { success: true, posts: json.data || [], paging: json.paging || null, mode: "authenticated" };
  }

  if (featureKey === "facebook.page_insights") {
    if (hasRealKey && !pageId) throw new Error("Missing page_id (set on the connected account or in input)");
    if (!hasRealKey) {
      return { success: true, insights: [{ name: "page_impressions", values: [{ value: 0 }] }], mode: "sandbox-simulation" };
    }
    const metric = input.metric || "page_impressions,page_post_engagements";
    const period = input.period || "day";
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(pageId)}/insights?metric=${encodeURIComponent(metric)}&period=${encodeURIComponent(period)}`, { headers }), "Facebook page insights failed");
    return { success: true, insights: json.data || [], mode: "authenticated" };
  }

  throw new Error(`Unsupported Facebook feature key: ${featureKey}`);
}

module.exports = { runFacebookTool };
