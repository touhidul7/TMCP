import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/docs/openapi";

// Public machine-readable API description (no auth — it contains no secrets, only shapes).
export async function GET(request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(buildOpenApiSpec(origin), {
    headers: { "Cache-Control": "public, max-age=3600" }
  });
}
