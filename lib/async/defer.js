import { after } from "next/server";

// Run side-effect work (logging, bookkeeping, counters) after the response has been sent, using
// Next.js `after` so the platform keeps the invocation alive until the work settles. Outside a
// request scope (unit tests, scripts) `after` throws — fall back to a plain fire-and-forget task.
export function deferAfterResponse(task) {
  try {
    after(task);
  } catch {
    Promise.resolve()
      .then(task)
      .catch((err) => console.error("Deferred task error:", err));
  }
}
