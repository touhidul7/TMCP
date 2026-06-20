import { handleOpenAICompatible } from "@/lib/rotate/openai-proxy";

export async function POST(request) {
  return handleOpenAICompatible(request, { endpointPath: "/embeddings" });
}
