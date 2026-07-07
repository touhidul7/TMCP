import { NextResponse } from "next/server";
import { runDueJobs } from "@/lib/jobs/run-due-jobs";

// Scheduler tick. Vercel Cron calls this (vercel.json) with `Authorization: Bearer ${CRON_SECRET}`;
// any external scheduler can do the same. Without CRON_SECRET set, the endpoint refuses to run.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runDueJobs({ limit: 20 });
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("Cron run-jobs failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to run scheduled jobs" },
      { status: 500 }
    );
  }
}
