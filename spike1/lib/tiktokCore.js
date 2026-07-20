// TikTok publish core — kept SEPARATE from publishCore.js so the live Instagram
// path is never touched. Handles one-off TikTok VIDEO publishing (FILE_UPLOAD),
// token refresh, and creator-info queries.
//
// Until the app passes TikTok audit (TIKTOK_AUDITED!=="true"), every post is
// forced privacy_level="SELF_ONLY" (private) and the account must itself be
// private. After audit, the composer can offer public/friends via creator_info.

import { publicImageUrl, svcClient, notify } from "./publishCore";

export { svcClient };

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
// Flip to "true" only after the TikTok app is audited (see docs/GO-PUBLIC-TIKTOK.md).
export const TIKTOK_AUDITED = process.env.TIKTOK_AUDITED === "true";
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

// Query what the connected creator's account allows: which privacy levels are
// available + whether comment/duet/stitch are disabled at the account level +
// max video duration. The composer uses this to build a TikTok-compliant form,
// and we guard against posting options the account doesn't allow.
export async function tiktokCreatorInfo(svc, channel) {
  channel = await tiktokRefreshIfDue(svc, channel);
  const r = await ttCall("/v2/post/publish/creator_info/query/", channel.access_token, {});
  const d = r.json?.data;
  const errCode = r.json?.error?.code;
  if (!d || (errCode && errCode !== "ok")) {
    return { ok: false, error: r.json?.error?.message || "Gagal membaca info kreator TikTok", code: errCode };
  }
  return {
    ok: true,
    privacyOptions: d.privacy_level_options || [],
    commentDisabled: !!d.comment_disabled,
    duetDisabled: !!d.duet_disabled,
    stitchDisabled: !!d.stitch_disabled,
    maxVideoSec: d.max_video_post_duration_sec || null,
    nickname: d.creator_nickname || null,
    username: d.creator_username || null,
  };
}

// Map a scheduled_post's tiktok_options into a TikTok post_info payload. Forces
// SELF_ONLY (and disables branded-content, which can't be private) until audited.
function buildVideoPostInfo(post) {
  const o = post.tiktok_options || {};
  const privacy = TIKTOK_AUDITED ? (o.privacy_level || "SELF_ONLY") : "SELF_ONLY";
  return {
    title: post.caption || "",
    privacy_level: privacy,
    disable_comment: o.allow_comment === false,
    disable_duet: o.allow_duet === false,
    disable_stitch: o.allow_stitch === false,
    brand_organic_toggle: !!o.your_brand,                       // "your brand" (organic) — ok when private
    brand_content_toggle: TIKTOK_AUDITED && !!o.branded_content, // paid partnership — needs public, so audited-only
    // Sampul: TikTok hanya menerima frame dari videonya (dalam milidetik). Tidak ada
    // cara mengunggah gambar sampul sendiri lewat API, jadi tanpa ini TikTok memilih sendiri.
    ...(post.cover_offset_ms != null ? { video_cover_timestamp_ms: post.cover_offset_ms } : {}),
  };
}

// Init a single-chunk FILE_UPLOAD + PUT the bytes. Returns { ok, publishId }.
async function ttVideoStart(token, bytes, postInfo) {
  const videoSize = bytes.byteLength;
  if (!videoSize) return { ok: false, error: "File video kosong." };
  const init = await ttCall("/v2/post/publish/video/init/", token, {
    post_info: postInfo,
    source_info: { source: "FILE_UPLOAD", video_size: videoSize, chunk_size: videoSize, total_chunk_count: 1 },
  });
  const publishId = init.json?.data?.publish_id;
  const uploadUrl = init.json?.data?.upload_url;
  if (!publishId || !uploadUrl) return { ok: false, error: init.json?.error?.message || "Gagal init video TikTok", code: init.json?.error?.code };
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(videoSize), "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}` },
    body: bytes,
  });
  if (!putRes.ok && putRes.status !== 201) return { ok: false, error: `Upload byte video ke TikTok gagal (${putRes.status})`, publishId };
  return { ok: true, publishId };
}

// Spike helper (still used by /api/tiktok-test): publish a video privately with
// no DB bookkeeping. The real engine path is publishTikTokVideoScheduled below.
export async function publishTikTokVideoOneoff(svc, { channel, storagePath, caption = "" }) {
  channel = await tiktokRefreshIfDue(svc, channel);
  const token = channel.access_token;
  const mediaRes = await fetch(publicImageUrl(storagePath));
  if (!mediaRes.ok) return { ok: false, error: `Gagal membaca video dari storage (${mediaRes.status})` };
  const bytes = new Uint8Array(await mediaRes.arrayBuffer());
  const started = await ttVideoStart(token, bytes, { title: caption, privacy_level: "SELF_ONLY", disable_comment: false, disable_duet: false, disable_stitch: false });
  if (!started.ok) return { ok: false, error: started.error, code: started.code };
  const done = await pollPublishStatus(token, started.publishId);
  return done.ok
    ? { ok: true, publishId: started.publishId, status: done.status }
    : { ok: false, error: done.error, status: done.status, publishId: started.publishId };
}

// Mark a run + its scheduled_post as published, notify, and free the video file.
async function finishTikTokPublished(svc, { channel, post, run, storagePath, chLabel }) {
  await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString() }).eq("id", run.id);
  await svc.from("scheduled_post").update({ status: "published" }).eq("id", post.id);
  await svc.from("post_attempt").insert({ run_id: run.id, outcome: "Dipublikasikan ke TikTok ✓", is_fail: false });
  await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "success", title: `Video TikTok terbit — ${chLabel}`, body: TIKTOK_AUDITED ? "Video berhasil terbit ke TikTok." : "Video terbit ke TikTok (privat — akun belum lolos audit).", runId: run.id });
  if (storagePath) await svc.storage.from("pool-images").remove([storagePath]).catch(() => {});
}

const firstStoragePath = async (svc, postId) => {
  const { data: links = [] } = await svc.from("scheduled_post_media").select("asset_id").eq("post_id", postId).order("position").limit(1);
  if (!links[0]?.asset_id) return null;
  const { data: a } = await svc.from("media_asset").select("storage_path").eq("id", links[0].asset_id).single();
  return a?.storage_path || null;
};

// Engine path: claim a due scheduled TikTok video, upload it, and poll a bounded
// window. If TikTok is still transcoding when the tick's budget runs out, the
// publish_id is stashed in post_run.ig_media_id and resumeTikTokVideo finishes it
// next tick. Mirrors publishReelsOneoff's claim/run/notify pattern.
export async function publishTikTokVideoScheduled(svc, { channel, post }) {
  const { data: claimed } = await svc.from("scheduled_post")
    .update({ status: "publishing" }).eq("id", post.id).eq("status", "scheduled").select("id").maybeSingle();
  if (!claimed) return { skipped: true };

  const storagePath = await firstStoragePath(svc, post.id);

  const { data: run } = await svc.from("post_run").insert({
    channel_id: channel.id, rule_id: null, scheduled_post_id: post.id, status: "publishing",
    trigger: "scheduled", scheduled_at: post.scheduled_at || new Date().toISOString(),
    claim_key: `oneoff:${post.id}`, attempt_count: 1,
  }).select("id").single();
  if (!run) { await svc.from("scheduled_post").update({ status: "scheduled" }).eq("id", post.id); return { ok: false, error: "Gagal menyiapkan catatan publikasi" }; }
  const log = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });
  const chLabel = channel.handle || channel.slug || "channel";
  const fail = async (reason) => {
    await log(reason, true);
    await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
    await svc.from("scheduled_post").update({ status: "failed" }).eq("id", post.id);
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "error", title: `Video TikTok gagal — ${chLabel}`, body: reason, runId: run.id });
    return { ok: false, error: reason, runId: run.id };
  };
  if (!storagePath) return fail("Video TikTok tidak ditemukan");

  channel = await tiktokRefreshIfDue(svc, channel);
  const token = channel.access_token;
  const mediaRes = await fetch(publicImageUrl(storagePath));
  if (!mediaRes.ok) return fail(`Gagal membaca video dari storage (${mediaRes.status})`);
  const bytes = new Uint8Array(await mediaRes.arrayBuffer());

  await log("Mengunggah video ke TikTok…");
  const started = await ttVideoStart(token, bytes, buildVideoPostInfo(post));
  if (!started.ok) return fail(started.code ? `${started.error} [${started.code}]` : started.error);
  // Persist publish_id so a later tick can resume polling past the 60s budget.
  await svc.from("post_run").update({ ig_media_id: started.publishId }).eq("id", run.id);

  const done = await pollPublishStatus(token, started.publishId, { tries: 8, gapMs: 2500 }); // ~20s this tick
  if (!done.ok && done.status === "TIMEOUT") { await log("Video masih diproses TikTok — dilanjutkan otomatis menit berikutnya."); return { processing: true, runId: run.id }; }
  if (!done.ok) return fail(done.error);

  await finishTikTokPublished(svc, { channel, post, run, storagePath, chLabel });
  return { ok: true, runId: run.id };
}

// Resume a TikTok video whose transcode wasn't done when its creating tick ran
// out of budget. publish_id was stashed in post_run.ig_media_id.
export async function resumeTikTokVideo(svc, { channel, post, run }) {
  const publishId = run.ig_media_id;
  if (!publishId) return { ok: false, error: "publish_id tidak ada" };
  channel = await tiktokRefreshIfDue(svc, channel);
  const chLabel = channel.handle || channel.slug || "channel";
  const done = await pollPublishStatus(channel.access_token, publishId, { tries: 8, gapMs: 2500 });
  if (!done.ok && done.status === "TIMEOUT") return { processing: true };
  if (!done.ok) {
    await svc.from("post_run").update({ status: "failed", fail_reason: done.error }).eq("id", run.id);
    await svc.from("scheduled_post").update({ status: "failed" }).eq("id", post.id);
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "error", title: `Video TikTok gagal — ${chLabel}`, body: done.error, runId: run.id });
    return { ok: false, error: done.error };
  }
  const storagePath = await firstStoragePath(svc, post.id);
  await finishTikTokPublished(svc, { channel, post, run, storagePath, chLabel });
  return { ok: true };
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
