import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SIGN = process.env.CRON_SECRET; // reused as the HMAC key for the OAuth state

// Kicks off Instagram Business Login for the *currently signed-in* user.
// The browser calls this with the Supabase access token; we verify it, then
// hand back an authorize URL whose `state` is an HMAC-signed {owner_id, iat}.
// The callback verifies that signature so the new channel can only be attached
// to the user who actually started the flow.
export async function POST(request) {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return NextResponse.json({ ok: false, error: "Server OAuth belum dikonfigurasi (META_APP_ID / META_REDIRECT_URI)." }, { status: 500 });
  }
  if (!SIGN) return NextResponse.json({ ok: false, error: "Server signing secret tidak ada." }, { status: 500 });

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
  const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
  const user = ures?.user;
  if (!user) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });

  const payload = Buffer.from(JSON.stringify({ oid: user.id, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SIGN).update(payload).digest("base64url");
  const state = `${payload}.${sig}`;

  // instagram_business_manage_insights = read post/account insights (the metrics
  // auto-pull). In Dev Mode it's granted to the app's own tester accounts without
  // App Review (same as content_publish today); for Live/other users it needs review.
  const scope = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights";
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return NextResponse.json({ ok: true, url: url.toString() });
}
