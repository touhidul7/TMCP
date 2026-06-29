import { handleApifyRotate } from "@/lib/rotate/apify-proxy";

// Transparent, path-agnostic drop-in for https://api.apify.com/v2 — swap the base URL and use a
// TMCP agent key in place of the Apify token. TMCP rotates across the connected Apify token pool
// with automatic failover. Every Apify endpoint/method is forwarded unchanged.
export async function GET(request) {
  return handleApifyRotate(request, { method: "GET" });
}

export async function POST(request) {
  return handleApifyRotate(request, { method: "POST" });
}

export async function PUT(request) {
  return handleApifyRotate(request, { method: "PUT" });
}

export async function PATCH(request) {
  return handleApifyRotate(request, { method: "PATCH" });
}

export async function DELETE(request) {
  return handleApifyRotate(request, { method: "DELETE" });
}

export async function HEAD(request) {
  return handleApifyRotate(request, { method: "HEAD" });
}
