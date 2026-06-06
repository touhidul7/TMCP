import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";

export async function GET(request) {
  try {
    const agentContext = await validateAgentApiKey(request);
    
    return NextResponse.json({
      success: true,
      status: "healthy",
      gateway_version: "1.2.0",
      agent: {
        id: agentContext.agentId,
        name: agentContext.agentName,
        status: "active"
      },
      authorized_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Gateway status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
