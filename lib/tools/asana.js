const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.errors?.[0]?.message || json?.message || fallbackMessage);
  }
  return json;
}

async function runAsanaTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const base = "https://app.asana.com/api/1.0";
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "asana.list_tasks") {
    const project = input.project || input.project_id;
    const assignee = input.assignee;
    const workspace = input.workspace || input.workspace_id;
    if (!project && !(assignee && workspace)) {
      throw new Error("Provide project (project_id), or both assignee and workspace, for asana.list_tasks");
    }
    if (!hasRealKey) {
      return { success: true, tasks: [{ gid: "sandbox", name: "Sandbox task", completed: false }], mode: "sandbox-simulation" };
    }
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Number(input.limit || 25), 100)));
    params.set("opt_fields", "name,completed,due_on,assignee.name,notes");
    if (project) params.set("project", project);
    if (assignee) params.set("assignee", assignee);
    if (workspace) params.set("workspace", workspace);
    const json = await readJson(await fetch(`${base}/tasks?${params.toString()}`, { headers }), "Asana list tasks failed");
    return { success: true, tasks: json.data || [], mode: "authenticated" };
  }

  if (featureKey === "asana.create_task") {
    const name = input.name || input.title;
    if (!name) throw new Error("Missing name for asana.create_task");
    const projects = input.projects || (input.project || input.project_id ? [input.project || input.project_id] : null);
    const workspace = input.workspace || input.workspace_id;
    if (!projects && !workspace) throw new Error("Provide projects (or project_id) or workspace for asana.create_task");

    if (!hasRealKey) {
      return { success: true, task: { gid: "sandbox-new", name }, mode: "sandbox-simulation" };
    }
    const data = {
      name,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.due_on ? { due_on: input.due_on } : {}),
      ...(input.assignee ? { assignee: input.assignee } : {}),
      ...(projects ? { projects } : {}),
      ...(workspace ? { workspace } : {})
    };
    const json = await readJson(await fetch(`${base}/tasks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data })
    }), "Asana create task failed");
    return { success: true, task: json.data, mode: "authenticated" };
  }

  if (featureKey === "asana.update_task") {
    const taskId = input.task_id || input.task_gid || input.gid || input.id;
    if (!taskId) throw new Error("Missing task_id for asana.update_task");
    if (!hasRealKey) {
      return { success: true, task: { gid: taskId }, mode: "sandbox-simulation" };
    }
    const data = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.due_on ? { due_on: input.due_on } : {}),
      ...(input.assignee ? { assignee: input.assignee } : {}),
      ...(typeof input.completed === "boolean" ? { completed: input.completed } : {})
    };
    if (Object.keys(data).length === 0) throw new Error("No updatable fields provided for asana.update_task");
    const json = await readJson(await fetch(`${base}/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ data })
    }), "Asana update task failed");
    return { success: true, task: json.data, mode: "authenticated" };
  }

  throw new Error(`Unsupported Asana feature key: ${featureKey}`);
}

module.exports = { runAsanaTool };
