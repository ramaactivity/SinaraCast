import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { svcClient } from "../../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGN = process.env.CRON_SECRET; // same HMAC key used by /connect/tiktok/start

// Verify the signed state from /connect/tiktok/start and return its owner_id, or null.
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
  <div style="font-size:15px;font-weight:600">${ok ? "TikTok tersambung ✓" : "Gagal menyambungkan"}</div>
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

// OAuth redirect target. Exchanges code -> token, resolves the TikTok profile,
// and PERSISTS the channel to Supabase (platform='tiktok') for the user who
// started the flow (upsert by tiktok_open_id = reconnect). Then hands the
// result back to the opener tab and closes the popup.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthErr = searchParams.get("error");

  const home = (payload) => closePage(origin, payload);
  const fail = (msg) => home({ status: "error", error: msg });

  if (oauthErr) return fail(searchParams.get("error_description") || oauthErr);
  if (!code) return fail("Tidak ada code dari TikTok");

  const ownerId = ownerFromState(state);
  if (!ownerId) return fail("State tidak valid atau kedaluwarsa — coba sambungkan lagi");

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  try {
    // 1) code -> access token (~24h) + refresh token (~365d) + open_id
    const form = new URLSearchParams();
    form.set("client_key", clientKey);
    form.set("client_secret", clientSecret);
    form.set("code", code);
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", redirectUri);
    const tokRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const tok = await tokRes.json().catch(() => ({}));
    if (!tokRes.ok || !tok.access_token) throw new Error(tok?.error_description || tok?.error || "Tukar token TikTok gagal");
    const accessToken = tok.access_token;
    const refreshToken = tok.refresh_token || null;
    const expiresIn = Number(tok.expires_in) || 0; // seconds
    const openId = String(tok.open_id || "");
    if (!openId) throw new Error("Tidak bisa membaca open_id dari TikTok");

    // 2) resolve TikTok profile (best-effort — don't fail the connect on this)
    let username = "", displayName = "", avatarUrl = "";
    try {
      const meUrl = new URL("https://open.tiktokapis.com/v2/user/info/");
      meUrl.searchParams.set("fields", "open_id,union_id,display_name,avatar_url,username");
      const meJson = await (await fetch(meUrl, { headers: { Authorization: `Bearer ${accessToken}` } })).json().catch(() => ({}));
      const u = meJson?.data?.user || {};
      username = u.username || "";
      displayName = u.display_name || "";
      avatarUrl = u.avatar_url || "";
    } catch { /* profile is optional */ }
    username = username || `tiktok-${openId.slice(-6)}`;
    displayName = displayName || username;

    const svc = svcClient();
    const nowIso = new Date().toISOString();
    const fields = {
      platform: "tiktok",
      handle: `@${username}`, name: displayName,
      tiktok_open_id: openId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_status: "connected",
      token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      last_refresh_at: nowIso,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    };

    // Already connected this TikTok account? -> update tokens in place (reconnect).
    const { data: existing } = await svc.from("channel")
      .select("id").eq("owner_id", ownerId).eq("tiktok_open_id", openId).is("archived_at", null).maybeSingle();
    if (existing) {
      const { error } = await svc.from("channel").update(fields).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return home({ status: "reconnected", name: username });
    }

    // New channel: pick a slug unique within this owner.
    const base = (username || "tiktok").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "tiktok";
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
