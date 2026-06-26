import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
const { chatCompletionsUrl, resolveModel } = require("@/lib/assistant/config");

export async function POST(request) {
  try {
    await requireUser(request);
  } catch (authErr) {
    return NextResponse.json(
      { success: false, error: authErr.message || "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { openrouterKey, baseUrl, model } = await request.json();

    if (!openrouterKey || !openrouterKey.trim()) {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    const response = await fetch(chatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey.trim()}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "TMCP Tassistant Gateway Verification"
      },
      body: JSON.stringify({
        model: resolveModel(model),
        messages: [
          { role: "user", content: "Ping" }
        ],
        max_tokens: 5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || `HTTP error ${response.status}`;
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: "Connection verified successfully!" });

  } catch (err) {
    console.error("Tassistant verification error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify connection to the assistant endpoint" },
      { status: 500 }
    );
  }
}
