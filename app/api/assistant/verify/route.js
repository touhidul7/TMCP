import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { openrouterKey } = await request.json();

    if (!openrouterKey || !openrouterKey.trim()) {
      return NextResponse.json(
        { success: false, error: "OpenRouter API key is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey.trim()}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "TMCP Tassistant Gateway Verification"
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
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
    console.error("OpenRouter verification error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify connection to OpenRouter" },
      { status: 500 }
    );
  }
}
