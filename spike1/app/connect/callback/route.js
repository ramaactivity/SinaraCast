import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const V = process.env.META_GRAPH_VERSION || "v25.0";

// OAuth redirect target. Exchanges code -> short-lived -> long-lived token,
// resolves the IG user id, and renders everything so we can copy it for the
// local publish test. SPIKE ONLY: a real build never renders a token.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthErr = searchParams.get("error");

  if (oauthErr) {
    return html(
      `<h2>OAuth error</h2><pre>${esc(
        JSON.stringify(Object.fromEntries(searchParams), null, 2)
      )}</pre>`
    );
  }
  if (!code) return html("<h2>No <code>code</code> in callback URL.</h2>");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  // 1) code -> short-lived token (host: api.instagram.com) [verify in Spike 1]
  const form = new URLSearchParams();
  form.set("client_id", appId);
  form.set("client_secret", appSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);
  form.set("code", code);

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: form,
  });
  const shortJson = await shortRes.json().catch(() => ({}));
  if (!shortRes.ok || !shortJson.access_token) {
    return html(
      `<h2>Step 1 failed — short-lived token exchange</h2><pre>${esc(
        JSON.stringify(shortJson, null, 2)
      )}</pre>`
    );
  }
  const shortToken = shortJson.access_token;
  const userIdFromShort = shortJson.user_id;

  // 2) short-lived -> long-lived (~60d) token (host: graph.instagram.com)
  const llUrl = new URL("https://graph.instagram.com/access_token");
  llUrl.searchParams.set("grant_type", "ig_exchange_token");
  llUrl.searchParams.set("client_secret", appSecret);
  llUrl.searchParams.set("access_token", shortToken);

  const llRes = await fetch(llUrl);
  const llJson = await llRes.json().catch(() => ({}));
  if (!llRes.ok || !llJson.access_token) {
    return html(
      `<h2>Step 2 failed — long-lived exchange</h2><pre>${esc(
        JSON.stringify(llJson, null, 2)
      )}</pre>`
    );
  }
  const longToken = llJson.access_token;
  const expiresIn = llJson.expires_in;

  // 3) resolve ig user id + username
  const meUrl = new URL(`https://graph.instagram.com/${V}/me`);
  meUrl.searchParams.set("fields", "user_id,username");
  meUrl.searchParams.set("access_token", longToken);
  const meRes = await fetch(meUrl);
  const meJson = await meRes.json().catch(() => ({}));

  const igUserId = meJson.user_id || userIdFromShort || "";

  return html(`
    <h2>✅ Connected via Instagram Login</h2>
    <p><b>username:</b> ${esc(meJson.username || "(see raw below)")}</p>
    <p><b>ig_user_id:</b> <code>${esc(String(igUserId))}</code></p>
    <p><b>expires_in:</b> ${esc(String(expiresIn))}s (~${Math.round(
    (Number(expiresIn) || 0) / 86400
  )} days)</p>
    <h3>Long-lived access token — copy this (spike only):</h3>
    <textarea style="width:100%;height:140px" onclick="this.select()">${esc(
      longToken
    )}</textarea>
    <h3>raw /me</h3><pre>${esc(JSON.stringify(meJson, null, 2))}</pre>
    <hr/>
    <p>Next: put <code>IG_USER_ID</code> + <code>IG_ACCESS_TOKEN</code> in
    <code>spike1/.env.local</code> and run <code>npm run publish-test</code>.</p>
  `);
}

function esc(s) {
  return String(s).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
  );
}
function html(body) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:0 16px">${body}</body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
