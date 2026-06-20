// Pure, side-effect-free rotation logic so it can be unit tested without a DB.

// Heuristic for "this key is rate limited / out of quota — try the next one".
function isRateLimited(status, body) {
  if (status === 429) return true;
  // Some providers signal quota exhaustion with 403/400 + a descriptive message.
  if (status === 403 || status === 400) {
    const blob = JSON.stringify(body || "").toLowerCase();
    return /quota|rate.?limit|resource_exhausted|exceeded|too many requests/.test(blob);
  }
  return false;
}

// Parse a Retry-After header (seconds or HTTP date) into a cooldown in seconds.
function parseRetryAfter(headerValue, fallbackSeconds = 60) {
  if (!headerValue) return fallbackSeconds;
  const asNumber = Number(headerValue);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.min(asNumber, 3600);
  const asDate = Date.parse(headerValue);
  if (!Number.isNaN(asDate)) {
    return Math.max(1, Math.min(Math.round((asDate - Date.now()) / 1000), 3600));
  }
  return fallbackSeconds;
}

/**
 * Try each key in order until one returns a non-rate-limited response.
 *
 * @param {Array} keys - ordered candidate keys (already round-robin sorted), each at least { id }
 * @param {(key) => Promise<{status, body, headers?}>} send - performs the provider request for a key
 * @returns {{ status, body, headers?, keyId, cooled: Array<{keyId, cooldownSeconds}>, exhausted: boolean, attempts: number }}
 */
async function runRotation({ keys, send, defaultCooldownSeconds = 60 }) {
  const cooled = [];
  let last = null;
  let attempts = 0;

  for (const key of keys) {
    attempts += 1;
    const res = await send(key);
    last = { ...res, keyId: key.id };

    if (isRateLimited(res.status, res.body)) {
      const retryAfter = res.headers && typeof res.headers.get === "function"
        ? res.headers.get("retry-after")
        : (res.headers && (res.headers["retry-after"] || res.headers["Retry-After"]));
      cooled.push({ keyId: key.id, cooldownSeconds: parseRetryAfter(retryAfter, defaultCooldownSeconds) });
      continue;
    }

    // Success or a non-rate-limit error: return immediately (do not keep rotating).
    return { ...res, keyId: key.id, cooled, exhausted: false, attempts };
  }

  // Every key was rate limited (or there were none): surface the last provider error.
  if (last) {
    return { ...last, cooled, exhausted: true, attempts };
  }
  return {
    status: 503,
    body: { error: { message: "No API keys are available in the rotation pool.", type: "no_keys_available" } },
    keyId: null,
    cooled,
    exhausted: true,
    attempts
  };
}

module.exports = { isRateLimited, parseRetryAfter, runRotation };
