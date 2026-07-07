// Pure scope logic for scoped API keys (CJS so tests can require it directly).
//
// A key's `scopes` is null (unscoped — full agent access) or a jsonb array whose entries are
// exact feature keys ("gmail.send"), prefix patterns ("gmail.*"), or "*" (everything the agent
// may do). Scopes only ever narrow: the permission matrix is still checked afterwards.

function scopeAllows(scopes, featureKey) {
  if (scopes == null) return true; // unscoped key
  if (!Array.isArray(scopes) || !featureKey) return false;
  return scopes.some((s) => {
    if (typeof s !== "string") return false;
    if (s === "*") return true;
    if (s.endsWith(".*")) return featureKey.startsWith(s.slice(0, -1));
    return s === featureKey;
  });
}

// Every requested child scope must already be reachable through the parent's scopes, so a
// scoped key can only mint keys narrower than itself.
function scopesWithinParent(childScopes, parentScopes) {
  if (parentScopes == null) return true; // unscoped parent can mint anything
  if (!Array.isArray(childScopes) || childScopes.length === 0) return false;
  return childScopes.every((c) => {
    if (typeof c !== "string" || !c) return false;
    if (c === "*") return parentScopes.includes("*");
    if (c.endsWith(".*")) {
      return parentScopes.some((p) => p === "*" || p === c);
    }
    return scopeAllows(parentScopes, c);
  });
}

module.exports = { scopeAllows, scopesWithinParent };
