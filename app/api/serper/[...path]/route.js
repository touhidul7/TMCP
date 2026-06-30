import { handleSerperRotate } from "@/lib/rotate/serper-proxy";

// Transparent, path-agnostic drop-in for https://google.serper.dev — swap the base URL and put a
// TMCP agent key in the X-API-KEY header in place of the Serper key. TMCP rotates across the
// connected Serper key pool with automatic failover. Every Serper endpoint/method is forwarded.
export async function GET(request) {
  return handleSerperRotate(request, { method: "GET" });
}

export async function POST(request) {
  return handleSerperRotate(request, { method: "POST" });
}

export async function PUT(request) {
  return handleSerperRotate(request, { method: "PUT" });
}

export async function PATCH(request) {
  return handleSerperRotate(request, { method: "PATCH" });
}

export async function DELETE(request) {
  return handleSerperRotate(request, { method: "DELETE" });
}

export async function HEAD(request) {
  return handleSerperRotate(request, { method: "HEAD" });
}
