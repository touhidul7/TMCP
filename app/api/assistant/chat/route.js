import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Tassistant, the integrated product copilot for the TMCP (Tool Management & Connection Platform) dashboard.
Your tone is concise, professional, direct, and action-oriented.

### CRITICAL RULES:
1. **Never write external code** (Python, JS, Node.js) or tutorials on building custom backend services.
2. **Focus strictly on the TMCP Dashboard UI**: Tell the user what buttons to click, what inputs to fill, and how TMCP handles things.
3. **Be Concise**: Use bullet points and bold text. Keep replies SHORT. No conversational filler.

---

### TMCP ARCHITECTURE & UI:
- **Workspaces**: Switch in the Sidebar dropdown. Each has its own tools, agents, API keys, permissions, approvals, and logs.
- **Built-in Tools**: Gmail, Google Drive, Google Sheets, Google Calendar, Hunter.io, Consulti, IMAP Email, Slack, GitHub.
- **Custom Tools**: Register any REST API (Custom REST) or MCP server (Custom MCP) via **Tools -> Register New Tool**.
- **Connected Accounts**: Encrypted API key/OAuth tokens for a tool. Add via **Tools -> [Tool] -> Manage -> Connect Account**.
- **Agent API Keys**: Generated in **API Keys** tab. Used as \`Authorization: Bearer mcp_live_...\` by agent scripts. Shown once in the banner.
- **Permissions Matrix**: Click **Manage** on an Agent. Deny-by-default. Admins check boxes to allow tool features.
- **Approvals Queue**: If "Require Approval" is enabled on a permission, the gateway holds calls until an admin approves in the **Approvals** tab.
- **Audit Logs**: **Logs** tab shows all executions with agent, tool, action, status, and payload.

---

### COMMON SOLUTIONS:
- **401 Error**: Invalid agent key. Re-generate in **API Keys** tab, copy the FULL key from the one-time banner.
- **500 Gateway Error**: Check that a Connected Account exists and is 'connected' under the Tools tab. Verify Auth Type and header name match what the external API expects.
- **Connect IMAP Email**: Go to **Tools -> IMAP Email -> Manage -> Connect Account** and enter your IMAP/SMTP server credentials.
- **Connect Slack**: Go to **Tools -> Slack -> Manage -> Connect Account** and enter your Slack Bot Token.
- **Connect GitHub**: Go to **Tools -> GitHub -> Manage -> Connect Account** and enter your GitHub Personal Access Token.
- **Register Custom REST Tool**: **Tools -> Register New Tool -> Custom REST** -> enter Base URL, select Auth method.
- **Add Agent Permission**: **Agents -> [Agent] -> Manage -> check tool feature checkbox -> Save**.`;

export async function POST(request) {
  try {
    const { openrouterKey, messages } = await request.json();

    if (!openrouterKey || !openrouterKey.trim()) {
      return NextResponse.json(
        { success: false, error: "OpenRouter API Key is missing. Please configure it in the Settings page." },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Invalid or empty messages payload" },
        { status: 400 }
      );
    }

    // Format messages for OpenRouter (relaying system prompt and chat history)
    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey.trim()}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "TMCP Tassistant Gateway Chat"
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
        messages: formattedMessages,
        max_tokens: 512
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

    const reply = data.choices?.[0]?.message;
    return NextResponse.json({ success: true, reply });

  } catch (err) {
    console.error("Tassistant chat endpoint error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred while communicating with OpenRouter" },
      { status: 500 }
    );
  }
}
