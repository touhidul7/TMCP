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

async function runInstagramTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const token = getToken(credentialRecord);
  const hasRealKey = Boolean(token);
  const igUserId = input.ig_user_id || connectionMetadata.ig_user_id;
  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  if (featureKey === "instagram.publish_media") {
    const imageUrl = input.image_url || input.media_url;
    const videoUrl = input.video_url;
    if (!imageUrl && !videoUrl) throw new Error("Missing image_url or video_url for instagram.publish_media");
    if (hasRealKey && !igUserId) throw new Error("Missing ig_user_id (set on the connected account or in input)");

    if (!hasRealKey) {
      return { success: true, media_id: "ig-sandbox-media", mode: "sandbox-simulation" };
    }

    // Step 1: create a media container.
    const containerBody = videoUrl
      ? { media_type: input.media_type || "REELS", video_url: videoUrl, ...(input.caption ? { caption: input.caption } : {}) }
      : { image_url: imageUrl, ...(input.caption ? { caption: input.caption } : {}) };
    const container = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(igUserId)}/media`, {
      method: "POST",
      headers,
      body: JSON.stringify(containerBody)
    }), "Instagram media container creation failed");

    // Step 2: publish the container.
    const published = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(igUserId)}/media_publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({ creation_id: container.id })
    }), "Instagram media publish failed");

    return { success: true, media_id: published.id, container_id: container.id, mode: "authenticated" };
  }

  if (featureKey === "instagram.list_media") {
    if (hasRealKey && !igUserId) throw new Error("Missing ig_user_id (set on the connected account or in input)");
    if (!hasRealKey) {
      return { success: true, media: [{ id: "ig-sandbox", caption: "Sandbox media", media_type: "IMAGE" }], mode: "sandbox-simulation" };
    }
    const limit = Math.min(Number(input.limit || 12), 100);
    const fields = input.fields || "id,caption,media_type,media_url,permalink,timestamp";
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(igUserId)}/media?limit=${limit}&fields=${encodeURIComponent(fields)}`, { headers }), "Instagram list media failed");
    return { success: true, media: json.data || [], paging: json.paging || null, mode: "authenticated" };
  }

  throw new Error(`Unsupported Instagram feature key: ${featureKey}`);
}

module.exports = { runInstagramTool };
