const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

const LINEAR_GRAPHQL = "https://api.linear.app/graphql";

async function linearRequest(apiKey, query, variables) {
  const res = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: {
      // Linear personal API keys are sent in the Authorization header without a "Bearer" prefix.
      "Authorization": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const message = json.errors?.[0]?.message || json.message || `Linear request failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  return json.data;
}

async function runLinearTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);

  if (featureKey === "linear.list_issues") {
    if (!hasRealKey) {
      return { success: true, issues: [{ id: "sandbox", identifier: "TMC-1", title: "Sandbox issue", state: "Todo" }], mode: "sandbox-simulation" };
    }
    const first = Math.min(Number(input.limit || input.first || 25), 100);
    const query = `query Issues($first: Int!, $filter: IssueFilter) {
      issues(first: $first, filter: $filter) {
        nodes { id identifier title state { name } assignee { name } priority url createdAt }
      }
    }`;
    const filter = {};
    if (input.team_id) filter.team = { id: { eq: input.team_id } };
    if (input.state) filter.state = { name: { eq: input.state } };
    const data = await linearRequest(apiKey, query, { first, filter: Object.keys(filter).length ? filter : undefined });
    return { success: true, issues: data.issues?.nodes || [], mode: "authenticated" };
  }

  if (featureKey === "linear.create_issue") {
    const title = input.title;
    const teamId = input.team_id || input.teamId;
    if (!title) throw new Error("Missing title for linear.create_issue");
    if (!teamId) throw new Error("Missing team_id for linear.create_issue");
    if (!hasRealKey) {
      return { success: true, issue: { id: "sandbox-new", identifier: "TMC-2", title }, mode: "sandbox-simulation" };
    }
    const mutation = `mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url state { name } }
      }
    }`;
    const issueInput = {
      title,
      teamId,
      ...(input.description ? { description: input.description } : {}),
      ...(input.priority != null ? { priority: Number(input.priority) } : {}),
      ...(input.assignee_id ? { assigneeId: input.assignee_id } : {})
    };
    const data = await linearRequest(apiKey, mutation, { input: issueInput });
    return { success: true, issue: data.issueCreate?.issue || null, mode: "authenticated" };
  }

  if (featureKey === "linear.update_issue") {
    const issueId = input.issue_id || input.id;
    if (!issueId) throw new Error("Missing issue_id for linear.update_issue");
    if (!hasRealKey) {
      return { success: true, issue: { id: issueId }, mode: "sandbox-simulation" };
    }
    const mutation = `mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier title url state { name } }
      }
    }`;
    const updateInput = {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.state_id ? { stateId: input.state_id } : {}),
      ...(input.priority != null ? { priority: Number(input.priority) } : {}),
      ...(input.assignee_id ? { assigneeId: input.assignee_id } : {})
    };
    if (Object.keys(updateInput).length === 0) throw new Error("No updatable fields provided for linear.update_issue");
    const data = await linearRequest(apiKey, mutation, { id: issueId, input: updateInput });
    return { success: true, issue: data.issueUpdate?.issue || null, mode: "authenticated" };
  }

  throw new Error(`Unsupported Linear feature key: ${featureKey}`);
}

module.exports = { runLinearTool };
