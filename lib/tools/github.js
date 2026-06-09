const { decryptText } = require("../crypto/decrypt");

function getToken(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) {
    return null;
  }
  return decryptText(credentialRecord.encrypted_api_key);
}

function requireRepoInput(input) {
  const { owner, repo } = input || {};
  if (!owner || !repo) {
    throw new Error("Missing owner or repo in GitHub input parameters");
  }
  return { owner, repo };
}

async function githubJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || fallbackMessage);
  }
  return json;
}

function githubHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

async function runGithubTool({ featureKey, input = {}, credentialRecord }) {
  const token = getToken(credentialRecord);
  const hasRealKey = Boolean(token);

  if (featureKey === "github.list_issues") {
    const { owner, repo } = requireRepoInput(input);

    if (!hasRealKey) {
      return {
        success: true,
        repository: `${owner}/${repo}`,
        issues: [
          { id: 1, number: 101, title: "Auth token validation failing on custom REST tool", state: "open", user: "dev_user" },
          { id: 2, number: 102, title: "Add workspace switcher selector in mobile viewport", state: "closed", user: "designer_user" }
        ],
        mode: "sandbox-simulation"
      };
    }

    const params = new URLSearchParams();
    params.set("state", input.state || "open");
    params.set("per_page", String(Math.min(Number(input.per_page || input.perPage || 30), 100)));
    if (input.labels) params.set("labels", Array.isArray(input.labels) ? input.labels.join(",") : input.labels);
    if (input.assignee) params.set("assignee", input.assignee);
    if (input.since) params.set("since", input.since);

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params.toString()}`;
    const issues = await githubJson(await fetch(url, { headers: githubHeaders(token) }), "GitHub list issues failed");

    return {
      success: true,
      repository: `${owner}/${repo}`,
      issues,
      mode: "authenticated"
    };
  }

  if (featureKey === "github.create_issue") {
    const { owner, repo } = requireRepoInput(input);
    const { title, body } = input;
    if (!title) {
      throw new Error("Missing title in GitHub input parameters");
    }

    if (!hasRealKey) {
      return {
        success: true,
        repository: `${owner}/${repo}`,
        issue: {
          id: Math.floor(Math.random() * 100000),
          number: 103,
          title,
          body: body || "",
          state: "open",
          created_at: new Date().toISOString()
        },
        mode: "sandbox-simulation"
      };
    }

    const payload = {
      title,
      ...(body ? { body } : {}),
      ...(input.labels ? { labels: Array.isArray(input.labels) ? input.labels : [input.labels] } : {}),
      ...(input.assignees ? { assignees: Array.isArray(input.assignees) ? input.assignees : [input.assignees] } : {})
    };

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
    const issue = await githubJson(await fetch(url, {
      method: "POST",
      headers: { ...githubHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }), "GitHub create issue failed");

    return {
      success: true,
      repository: `${owner}/${repo}`,
      issue,
      mode: "authenticated"
    };
  }

  throw new Error(`Unsupported GitHub feature key: ${featureKey}`);
}

module.exports = { runGithubTool };
