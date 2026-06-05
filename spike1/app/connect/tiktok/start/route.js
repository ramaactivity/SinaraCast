import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SIGN = process.env.CRON_SECRET; // reused as the HMAC key for the OAuth state

// Kicks off TikTok Login for the *currently signed-in* user. Mirrors the
// Instagram /connect/start: the browser calls this with the Supabase access
// token; we verify it, then hand back an authorize URL whose `state` is an
// HMAC-signed {owner_id, iat}. The callback verifies that signature so the new
// channel can only be attached to the user who actually started the flow.
export async function POST(request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey || !redirectUri) {
    return NextResponse.json({ ok: false, error: "Server OAuth TikTok belum dikonfigurasi (TIKTOK_CLIENT_KEY / TIKTOK_REDIRECT_URI)." }, { status: 500 });
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

  // user.info.basic -> profile (display name / avatar); video.publish -> direct
  // post of video + photo (SELF_ONLY until the app is audited by TikTok).
  const scope = "user.info.basic,video.publish";
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return NextResponse.json({ ok: true, url: url.toString() });
}
