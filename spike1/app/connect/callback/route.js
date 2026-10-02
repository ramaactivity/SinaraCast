import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { svcClient } from "../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const V = process.env.META_GRAPH_VERSION || "v25.0";
const SIGN = process.env.CRON_SECRET; // same HMAC key used by /connect/start

// Verify the signed state from /connect/start and return its owner_id, or null.
function ownerFromState(state) {
  if (!state || !SIGN) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expect = crypto.createHmac("sha256", SIGN).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let obj;
  try { obj = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
  if (!obj?.oid || !obj?.iat) return null;
  if (Date.now() - obj.iat > 15 * 60 * 1000) return null; // state valid 15 min
  return obj.oid;
}

// Renders a tiny page that hands the result back to the SinaraCast tab that
// opened this popup (postMessage) and closes itself. If there is no opener
// (e.g. the flow ran in the same tab), it falls back to redirecting to "/".
function closePage(origin, payload) {
  const qs = payload.status === "error"
    ? `connect_error=${encodeURIComponent(payload.error || "")}`
    : `${payload.status}=${encodeURIComponent(payload.name || "")}`;
  const ok = payload.status !== "error";
  // Escape "<" so a value can never break out of the <script> block (XSS-safe).
  const safe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const body = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f6f5fb;color:#3e4351">
<div style="text-align:center">
  <div style="font-size:15px;font-weight:600">${ok ? "Berhasil tersambung ✓" : "Gagal menyambungkan"}</div>
  <div style="font-size:13px;color:#8c909e;margin-top:6px">Menutup jendela…</div>
</div>
<script>
(function(){
  var data = Object.assign({ type: "sinara-oauth" }, ${safe(payload)});
  var hadOpener = false;
  try {
    if (window.opener && !window.opener.closed) {
      hadOpener = true;
      window.opener.postMessage(data, ${JSON.stringify(origin)});
    }
  } catch (e) {}
  try { window.close(); } catch (e) {}
  // Some browsers refuse window.close() for tabs they didn't script-open. If this
  // window is still here a moment later, send it to the app instead of a dead page.
  setTimeout(function(){ location.replace(hadOpener ? "/" : ("/?" + ${JSON.stringify(qs)})); }, 700);
})();
</script>
</body>`;
  return new NextResponse(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// OAuth redirect target. Exchanges code -> short-lived -> long-lived token,
// resolves the IG profile, and PERSISTS the channel to Supabase for the user
// who started the flow (upsert by ig_user_id = reconnect). Then hands the
// result back to the opener tab and closes the popup.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthErr = searchParams.get("error");

  const home = (payload) => closePage(origin, payload);
  const fail = (msg) => home({ status: "error", error: msg });

  if (oauthErr) return fail(searchParams.get("error_description") || oauthErr);
  if (!code) return fail("Tidak ada code dari Instagram");

  const ownerId = ownerFromState(state);
  if (!ownerId) return fail("State tidak valid atau kedaluwarsa — coba sambungkan lagi");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  try {
    // 1) code -> short-lived token (host: api.instagram.com)
    const form = new URLSearchParams();
    form.set("client_id", appId);
    form.set("client_secret", appSecret);
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", redirectUri);
    form.set("code", code);
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
    const shortJson = await shortRes.json().catch(() => ({}));
    if (!shortRes.ok || !shortJson.access_token) throw new Error(shortJson?.error_message || "Tukar token gagal (langkah 1)");

    // 2) short-lived -> long-lived (~60d) token (host: graph.instagram.com)
    const llUrl = new URL("https://graph.instagram.com/access_token");
    llUrl.searchParams.set("grant_type", "ig_exchange_token");
    llUrl.searchParams.set("client_secret", appSecret);
    llUrl.searchParams.set("access_token", shortJson.access_token);
    const llRes = await fetch(llUrl);
    const llJson = await llRes.json().catch(() => ({}));
    if (!llRes.ok || !llJson.access_token) throw new Error(llJson?.error?.message || "Tukar token panjang gagal (langkah 2)");
    const longToken = llJson.access_token;
    const expiresIn = Number(llJson.expires_in) || 0;

    // 3) resolve IG profile
    const meUrl = new URL(`https://graph.instagram.com/${V}/me`);
    meUrl.searchParams.set("fields", "user_id,username,name,followers_count,account_type,profile_picture_url");
    meUrl.searchParams.set("access_token", longToken);
    const meJson = await (await fetch(meUrl)).json().catch(() => ({}));
    const igUserId = String(meJson.user_id || shortJson.user_id || "");
    if (!igUserId) throw new Error("Tidak bisa membaca ig_user_id dari Instagram");
    const username = meJson.username || `ig-${igUserId.slice(-6)}`;
    const displayName = meJson.name || username;
    const followers = Number.isFinite(meJson.followers_count) ? meJson.followers_count : null;

    const svc = svcClient();
    const nowIso = new Date().toISOString();
    // Scopes the user actually granted (array or comma string, depending on API version).
    const perms = shortJson.permissions;
    const igScopes = Array.isArray(perms) ? perms : typeof perms === "string" ? perms.split(",").map((x) => x.trim()).filter(Boolean) : null;
    const fields = {
      handle: `@${username}`, name: displayName, ig_user_id: igUserId, access_token: longToken,
      token_status: "connected",
      token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      last_refresh_at: nowIso,
      ...(followers != null ? { followers } : {}),
      ...(meJson.profile_picture_url ? { avatar_url: meJson.profile_picture_url } : {}),
      ...(igScopes ? { ig_scopes: igScopes } : {}),
    };

    // Already connected this IG account? -> update token in place (reconnect).
    const { data: existing } = await svc.from("channel")
      .select("id").eq("owner_id", ownerId).eq("ig_user_id", igUserId).is("archived_at", null).maybeSingle();
    if (existing) {
      const { error } = await svc.from("channel").update(fields).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return home({ status: "reconnected", name: username });
    }

    // New channel: pick a slug unique within this owner.
    const base = (username || "channel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "channel";
    const { data: owned = [] } = await svc.from("channel").select("slug").eq("owner_id", ownerId);
    const taken = new Set((owned || []).map((c) => c.slug));
    let slug = base, n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    const palette = ["violet", "green", "amber", "blue", "rose", "cyan"];
    const color_token = palette[taken.size % palette.length];

    const { error: insErr } = await svc.from("channel").insert({
      owner_id: ownerId, slug, color_token, paused: false, ...fields,
    });
    if (insErr) throw new Error(insErr.message);
    return home({ status: "connected", name: username });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}
