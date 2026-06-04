import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kicks off the Instagram Business Login OAuth dialog.
// [verify in Spike 1] authorize host/path + scope formatting on graph.instagram.com path.
export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return new NextResponse(
      "Missing META_APP_ID or META_REDIRECT_URI env on the deployment.",
      { status: 500 }
    );
  }

  const scope = "instagram_business_basic,instagram_business_content_publish";
  // spike-only CSRF token; a real build stores+verifies this in a cookie/session.
  const state = "spike1-" + Math.random().toString(36).slice(2);

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
