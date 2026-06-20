import { handleOpenAICompatible } from "@/lib/rotate/openai-proxy";

export async function GET(request) {
  return handleOpenAICompatible(request, { endpointPath: "/models", method: "GET", provider: "openrouter" });
}
