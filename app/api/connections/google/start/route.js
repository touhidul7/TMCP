import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";

// Map of tool slug -> required OAuth scopes
const TOOL_SCOPES = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  drive: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  sheets: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  calendar: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
};

// Fallback: all scopes combined (legacy behaviour)
const ALL_GOOGLE_SCOPES = [
  ...new Set(Object.values(TOOL_SCOPES).flat())
];

export async function GET(request) {
  try {
    const userContext = await requireUser(request);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    // Which tool is the user connecting? e.g. /api/connections/google/start?tool=gmail
    const { searchParams } = new URL(request.url);
    const toolSlug = searchParams.get("tool")?.toLowerCase();

    if (!clientId || clientId === "your-google-client-id") {
      const mockCallbackUrl = `${redirectUri}?code=mock_google_code_12345&tool=${toolSlug || ""}`;
      return NextResponse.json({ url: mockCallbackUrl });
    }

    // Use tool-specific scopes, or fall back to all scopes if unknown tool
    const scopes = TOOL_SCOPES[toolSlug] || ALL_GOOGLE_SCOPES;

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    // Encode both workspace ID and tool slug in state
    authUrl.searchParams.set("state", JSON.stringify({ workspace_id: userContext.workspace_id, tool: toolSlug }));

    return NextResponse.json({ url: authUrl.toString() });

  } catch (err) {
    console.error("Error starting Google OAuth:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}
