import { handleCustomRotate } from "@/lib/rotate/custom-proxy";

// Universal rotating proxy for user-defined `custom_rotate` tools. /api/rotate/{slug}/{any/path}
// forwards transparently to the tool's configured upstream base URL with a real key injected from
// the rotation pool (bearer / custom header / query param, per tool config), failing over to the
// next key on the tool's configured statuses. Authenticate with a TMCP agent key (Bearer,
// X-API-KEY, or ?token=). The optional catch-all also serves the bare /api/rotate/{slug} root.

async function proxy(request, ctx, method) {
  const { slug } = await ctx.params;
  return handleCustomRotate(request, { slug, method });
}

export async function GET(request, ctx) {
  return proxy(request, ctx, "GET");
}

export async function POST(request, ctx) {
  return proxy(request, ctx, "POST");
}

export async function PUT(request, ctx) {
  return proxy(request, ctx, "PUT");
}

export async function PATCH(request, ctx) {
  return proxy(request, ctx, "PATCH");
}

export async function DELETE(request, ctx) {
  return proxy(request, ctx, "DELETE");
}

export async function HEAD(request, ctx) {
  return proxy(request, ctx, "HEAD");
}
