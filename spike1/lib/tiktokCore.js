// TikTok publish core — kept SEPARATE from publishCore.js so the live Instagram
// path is never touched by the spike. Proves the two publish primitives:
//   - video  via FILE_UPLOAD   (no domain verification needed)        [risk R1]
//   - photo  via PULL_FROM_URL (needs a TikTok-verified domain)       [risk R2]
//
// Unaudited apps can only post privacy_level="SELF_ONLY" (private), so every
// post here is forced private. Once the app is audited we can open it to PUBLIC.

import { publicImageUrl, svcClient } from "./publishCore";

export { svcClient };

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// JSON call against the TikTok Open API with a bearer token.
async function ttCall(path, accessToken, body) {
  const res = await fetch(`https://open.tiktokapis.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// TikTok access tokens live ~24h. Refresh in place if we're within 30 min of
// expiry (or expiry is unknown). Returns the channel with a fresh token.
export async function tiktokRefreshIfDue(svc, channel) {
  const exp = channel.token_expires_at ? Date.parse(channel.token_expires_at) : 0;
  if (exp && exp - Date.now() > 30 * 60 * 1000) return channel; // still good
  if (!channel.refresh_token) return channel; // nothing to refresh with

  const form = new URLSearchParams();
  form.set("client_key", CLIENT_KEY);
  form.set("client_secret", CLIENT_SECRET);
  form.set("grant_type", "refresh_token");
  form.set("refresh_token", channel.refresh_token);
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok || !tok.access_token) {
    await svc.from("channel").update({ token_status: "needs_reconnect" }).eq("id", channel.id);
    throw new Error(tok?.error_description || "Refresh token TikTok gagal — sambungkan ulang akun.");
  }
  const patch = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token || channel.refresh_token,
    token_expires_at: tok.expires_in ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString() : null,
    last_refresh_at: new Date().toISOString(),
    token_status: "connected",
  };
  await svc.from("channel").update(patch).eq("id", channel.id);
  return { ...channel, ...patch };
}

// Poll publish status until terminal. Returns { ok, status, error }.
async function pollPublishStatus(accessToken, publishId, { tries = 20, gapMs = 3000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const r = await ttCall("/v2/post/publish/status/fetch/", accessToken, { publish_id: publishId });
    const status = r.json?.data?.status;
    if (status === "PUBLISH_COMPLETE") return { ok: true, status };
    if (status === "FAILED") return { ok: false, status, error: r.json?.data?.fail_reason || r.json?.error?.message || "TikTok memproses FAILED" };
    await sleep(gapMs);
  }
  return { ok: false, status: "TIMEOUT", error: "TikTok belum selesai memproses tepat waktu." };
}

// ---- R1: video via FILE_UPLOAD (no verified domain required) ----------------
// Pulls the video bytes from Supabase storage server-side and uploads them to
// the upload_url TikTok hands back, then polls until the post is complete.
export async function publishTikTokVideoOneoff(svc, { channel, storagePath, caption = "" }) {
  channel = await tiktokRefreshIfDue(svc, channel);
  const token = channel.access_token;

  // 1) fetch the media bytes we'll push to TikTok.
  const mediaRes = await fetch(publicImageUrl(storagePath));
  if (!mediaRes.ok) return { ok: false, error: `Gagal membaca video dari storage (${mediaRes.status})` };
  const bytes = new Uint8Array(await mediaRes.arrayBuffer());
  const videoSize = bytes.byteLength;
  if (!videoSize) return { ok: false, error: "File video kosong." };

  // 2) init: single-chunk upload (test videos are well under TikTok's 64MB cap).
  const init = await ttCall("/v2/post/publish/video/init/", token, {
    post_info: { title: caption, privacy_level: "SELF_ONLY", disable_comment: false, disable_duet: false, disable_stitch: false },
    source_info: { source: "FILE_UPLOAD", video_size: videoSize, chunk_size: videoSize, total_chunk_count: 1 },
  });
  const publishId = init.json?.data?.publish_id;
  const uploadUrl = init.json?.data?.upload_url;
  if (!publishId || !uploadUrl) return { ok: false, error: init.json?.error?.message || "Gagal init video TikTok", raw: init.json };

  // 3) PUT the whole file in one chunk.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoSize),
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: bytes,
  });
  if (!putRes.ok && putRes.status !== 201) {
    return { ok: false, error: `Upload byte video ke TikTok gagal (${putRes.status})`, publishId };
  }

  // 4) wait for TikTok to finish (download + transcode + publish).
  const done = await pollPublishStatus(token, publishId);
  return done.ok
    ? { ok: true, publishId, status: done.status }
    : { ok: false, error: done.error, status: done.status, publishId };
}

// ---- R2: photo/carousel via PULL_FROM_URL (NEEDS verified domain) -----------
// photo_images must live under a TikTok-verified domain/URL-prefix. Our Supabase
// public URLs are on *.supabase.co (not ours), so until a domain is verified
// this is expected to fail with `url_ownership_unverified` — that's the spike's
// key finding.
export async function publishTikTokPhotoOneoff(svc, { channel, storagePaths = [], photoUrls = null, caption = "" }) {
  channel = await tiktokRefreshIfDue(svc, channel);
  const token = channel.access_token;
  // Explicit photoUrls win (e.g. a bundled test image on our own domain, used to
  // probe domain verification); otherwise derive from Supabase storage paths.
  const urls = (photoUrls && photoUrls.length) ? photoUrls : storagePaths.map((p) => publicImageUrl(p)).filter(Boolean);
  if (!urls.length) return { ok: false, error: "Tidak ada foto untuk diposting." };

  const init = await ttCall("/v2/post/publish/content/init/", token, {
    post_info: { title: caption, privacy_level: "SELF_ONLY", disable_comment: false, auto_add_music: true },
    source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: urls },
    post_mode: "DIRECT_POST",
    media_type: "PHOTO",
  });
  const publishId = init.json?.data?.publish_id;
  if (!publishId) {
    return { ok: false, error: init.json?.error?.message || "Gagal init foto TikTok", code: init.json?.error?.code, raw: init.json };
  }

  const done = await pollPublishStatus(token, publishId);
  return done.ok
    ? { ok: true, publishId, status: done.status }
    : { ok: false, error: done.error, status: done.status, publishId };
}
