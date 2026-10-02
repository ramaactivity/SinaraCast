import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { svcClient } from "../../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGN = process.env.CRON_SECRET; // same HMAC key used by /connect/threads/start

// Verify the signed state from /connect/threads/start and return its owner_id, or null.
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

// Hands the result back to the SinaraCast tab that opened this popup
// (postMessage) and closes itself; falls back to redirecting "/" in the same tab.
function closePage(origin, payload) {
  const qs = payload.status === "error"
    ? `connect_error=${encodeURIComponent(payload.error || "")}`
    : `${payload.status}=${encodeURIComponent(payload.name || "")}`;
  const ok = payload.status !== "error";
  const safe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const body = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f6f5fb;color:#3e4351">
<div style="text-align:center">
  <div style="font-size:15px;font-weight:600">${ok ? "Threads tersambung ✓" : "Gagal menyambungkan"}</div>
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
  setTimeout(function(){ location.replace(hadOpener ? "/" : ("/?" + ${JSON.stringify(qs)})); }, 700);
})();
</script>
</body>`;
  return new NextResponse(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// OAuth redirect target. Exchanges code -> token, resolves the Threads profile,
// and PERSISTS the channel to Supabase (platform='threads') for the user who
// started the flow (upsert by threads_user_id = reconnect). Then hands the
// result back to the opener tab and closes the popup.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthErr = searchParams.get("error");

  const home = (payload) => closePage(origin, payload);
  const fail = (msg) => home({ status: "error", error: msg });

  if (oauthErr) return fail(searchParams.get("error_description") || oauthErr);
  if (!code) return fail("Tidak ada code dari Threads");

  const ownerId = ownerFromState(state);
  if (!ownerId) return fail("State tidak valid atau kedaluwarsa — coba sambungkan lagi");

  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  try {
    // 1) code -> short-lived token
    const form = new URLSearchParams();
    form.set("client_id", appId);
    form.set("client_secret", appSecret);
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", redirectUri);
    form.set("code", code);
    const shortRes = await fetch("https://graph.threads.net/oauth/access_token", { method: "POST", body: form });
    const shortJson = await shortRes.json().catch(() => ({}));
    if (!shortRes.ok || !shortJson.access_token) throw new Error(shortJson?.error?.message || shortJson?.error_message || "Tukar token Threads gagal (langkah 1)");

    // 2) short-lived -> long-lived (~60d); refreshed later by refreshTokensDue
    const llUrl = new URL("https://graph.threads.net/access_token");
    llUrl.searchParams.set("grant_type", "th_exchange_token");
    llUrl.searchParams.set("client_secret", appSecret);
    llUrl.searchParams.set("access_token", shortJson.access_token);
    const llRes = await fetch(llUrl);
    const llJson = await llRes.json().catch(() => ({}));
    if (!llRes.ok || !llJson.access_token) throw new Error(llJson?.error?.message || "Tukar token panjang Threads gagal (langkah 2)");
    const accessToken = llJson.access_token;
    const expiresIn = Number(llJson.expires_in) || 0;

    // 3) profile
    const meUrl = new URL("https://graph.threads.net/v1.0/me");
    meUrl.searchParams.set("fields", "id,username,name,threads_profile_picture_url");
    meUrl.searchParams.set("access_token", accessToken);
    const me = await (await fetch(meUrl)).json().catch(() => ({}));
    const threadsUserId = String(me.id || shortJson.user_id || "");
    if (!threadsUserId) throw new Error("Tidak bisa membaca user id dari Threads");
    const username = me.username || `threads-${threadsUserId.slice(-6)}`;

    const svc = svcClient();
    const fields = {
      platform: "threads",
      handle: `@${username}`, name: me.name || username,
      threads_user_id: threadsUserId,
      access_token: accessToken,
      token_status: "connected",
      token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      last_refresh_at: new Date().toISOString(),
      ...(me.threads_profile_picture_url ? { avatar_url: me.threads_profile_picture_url } : {}),
    };

    // Already connected this Threads account? -> update token in place (reconnect).
    const { data: existing } = await svc.from("channel")
      .select("id").eq("owner_id", ownerId).eq("threads_user_id", threadsUserId).is("archived_at", null).maybeSingle();
    if (existing) {
      const { error } = await svc.from("channel").update(fields).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return home({ status: "reconnected", name: username });
    }

    // New channel: pick a slug unique within this owner.
    const base = `threads-${username}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
    const { data: owned = [] } = await svc.from("channel").select("slug").eq("owner_id", ownerId);
    const taken = new Set((owned || []).map((c) => c.slug));
    let slug = base, n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;

    const { error: insErr } = await svc.from("channel").insert({
      owner_id: ownerId, slug, color_token: "violet", paused: false, ...fields,
    });
    if (insErr) throw new Error(insErr.message);
    return home({ status: "connected", name: username });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}
