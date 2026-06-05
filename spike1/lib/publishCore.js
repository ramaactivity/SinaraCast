import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const V = process.env.META_GRAPH_VERSION || "v25.0";
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Send a Telegram message to the owner's linked chat, if connected + token set.
async function sendTelegram(svc, ownerId, text) {
  if (!TG_TOKEN) return;
  const { data: s } = await svc.from("app_settings").select("telegram_chat_id, telegram_connected").eq("owner_id", ownerId).maybeSingle();
  if (!s?.telegram_connected || !s?.telegram_chat_id) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: s.telegram_chat_id, text, disable_web_page_preview: true }),
  });
}

export function svcClient() {
  return createClient(URL_, SERVICE, { auth: { persistSession: false } });
}

async function igCall(method, path, params) {
  const url = new URL(`https://graph.instagram.com/${V}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

export const publicImageUrl = (storagePath) =>
  `${URL_}/storage/v1/object/public/pool-images/${storagePath}`;

// Write an in-app notification row (best-effort; never throws into the publish path).
// Also fans out to Telegram if the owner has it connected.
export async function notify(svc, { ownerId, channelId, type, title, body, runId }) {
  if (!ownerId) return;
  try {
    await svc.from("notification").insert({
      owner_id: ownerId, channel_id: channelId || null, type, title, body, run_id: runId || null,
    });
    await sendTelegram(svc, ownerId, `${title}\n${body}`).catch(() => {});
  } catch (_) { /* alerts must never break publishing */ }
}

// Publish ONE Story for a rule. Idempotent via claimKey (unique post_run.claim_key):
// if the claim already exists, returns { skipped:true } without posting.
// `role` = 'weekday' | 'weekend' | 'single'.
export async function publishForRule(svc, { channel, rule, role, trigger, claimKey, scheduledAtISO, forceImageId }) {
  // pick pool + no-repeat image
  const { data: pool } = await svc.from("pool").select("id").eq("rule_id", rule.id).eq("role", role).single();
  if (!pool) return { ok: false, error: `Pool ${role} belum ada` };
  let { data: imgs = [] } = await svc.from("pool_image").select("id, storage_path, used_in_cycle, format").eq("pool_id", pool.id);
  if (!imgs.length) return { ok: false, error: `Pool ${role} kosong` };
  let unused = imgs.filter((i) => !i.used_in_cycle);
  if (!unused.length) { await svc.from("pool_image").update({ used_in_cycle: false }).eq("pool_id", pool.id); unused = imgs; }
  // "swap today" forces a specific image; otherwise pick from the unused remainder (no-repeat).
  const forced = forceImageId && imgs.find((i) => i.id === forceImageId);
  const pick = forced || unused[Math.floor(Math.random() * unused.length)];

  // claim (atomic idempotency)
  const { data: run, error: claimErr } = await svc.from("post_run").insert({
    channel_id: channel.id, rule_id: rule.id, pool_role: role, image_id: pick.id,
    status: "publishing", trigger, scheduled_at: scheduledAtISO || new Date().toISOString(),
    claim_key: claimKey, attempt_count: 1,
  }).select("id").single();
  if (claimErr) {
    if (claimErr.code === "23505") return { skipped: true }; // already claimed/posted
    return { ok: false, error: claimErr.message };
  }
  const chLabel = channel.handle || channel.slug || "channel";
  const log = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });
  const fail = async (reason) => {
    await log(reason, true);
    await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "error",
      title: `Publikasi gagal — ${chLabel}`, body: `“${rule.name}”: ${reason}`, runId: run.id });
    return { ok: false, error: reason, runId: run.id };
  };

  const mediaUrl = publicImageUrl(pick.storage_path);
  const pickIsVideo = pick.format === "mp4" || pick.format === "mov" || /\.(mp4|mov)$/i.test(pick.storage_path || "");

  // 1) container — image_url for photos, video_url for video Stories
  const cParams = pickIsVideo
    ? { media_type: "STORIES", video_url: mediaUrl, access_token: channel.access_token }
    : { media_type: "STORIES", image_url: mediaUrl, access_token: channel.access_token };
  let r = await igCall("POST", `/${channel.ig_user_id}/media`, cParams);
  if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer media");
  const creationId = r.json.id;
  await log(pickIsVideo ? "Kontainer Story video dibuat, video diproses…" : "Kontainer media dibuat");

  // 2) poll FINISHED (video transcoding takes longer)
  let statusCode = "";
  for (let i = 0; i < (pickIsVideo ? 16 : 18); i++) {
    r = await igCall("GET", `/${creationId}`, { fields: "status_code", access_token: channel.access_token });
    statusCode = r.json.status_code;
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR") return fail("Media diproses ERROR");
    await sleep(2500);
  }
  if (statusCode !== "FINISHED") return fail("Timeout proses media");
  await log("Media divalidasi (9:16)");

  // 3) publish
  r = await igCall("POST", `/${channel.ig_user_id}/media_publish`, { creation_id: creationId, access_token: channel.access_token });
  if (!r.json.id) return fail(r.json.error?.message || "Publish gagal");
  const mediaId = r.json.id;

  // 4) permalink
  r = await igCall("GET", `/${mediaId}`, { fields: "permalink", access_token: channel.access_token });
  const permalink = r.json.permalink || null;

  await log("Dipublikasikan ✓");
  await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString(), ig_media_id: mediaId, permalink }).eq("id", run.id);
  await svc.from("pool_image").update({ used_in_cycle: true }).eq("id", pick.id);
  // Notify on manual/retry/swap successes (scheduled successes stay silent — no-news-is-good-news).
  if (trigger !== "scheduled") {
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "success",
      title: `Berhasil terbit — ${chLabel}`, body: `“${rule.name}” terbit ke Instagram.`, runId: run.id });
  }
  return { ok: true, mediaId, permalink, runId: run.id };
}

// Publish a one-off Story scheduled_post. Claims it (scheduled → publishing) so
// only one worker posts it, writes a post_run for Activity, and notifies.
// Story-only for now (Feed/carousel publishing is a separate spike).
export async function publishStoryOneoff(svc, { channel, post }) {
  // atomic claim — first writer flips scheduled→publishing
  const { data: claimed } = await svc.from("scheduled_post")
    .update({ status: "publishing" }).eq("id", post.id).eq("status", "scheduled").select("id").maybeSingle();
  if (!claimed) return { skipped: true };

  // first media asset → public URL (image OR video)
  const { data: media = [] } = await svc.from("scheduled_post_media").select("asset_id, position").eq("post_id", post.id).order("position").limit(1);
  let storagePath = null, fmt = null;
  if (media[0]?.asset_id) {
    const { data: a } = await svc.from("media_asset").select("storage_path, format").eq("id", media[0].asset_id).single();
    storagePath = a?.storage_path; fmt = a?.format;
  }
  const isVideo = fmt === "mp4" || fmt === "mov" || /\.(mp4|mov)$/i.test(storagePath || "");

  const { data: run } = await svc.from("post_run").insert({
    channel_id: channel.id, rule_id: null, scheduled_post_id: post.id, status: "publishing",
    trigger: "scheduled", scheduled_at: post.scheduled_at || new Date().toISOString(),
    claim_key: `oneoff:${post.id}`, attempt_count: 1,
  }).select("id").single();
  if (!run) { await svc.from("scheduled_post").update({ status: "scheduled" }).eq("id", post.id); return { ok: false, error: "Gagal membuat catatan publish" }; }
  const log = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });
  const chLabel = channel.handle || channel.slug || "channel";
  const fail = async (reason) => {
    await log(reason, true);
    await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
    await svc.from("scheduled_post").update({ status: "failed" }).eq("id", post.id);
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "error", title: `One-off gagal — ${chLabel}`, body: reason, runId: run.id });
    return { ok: false, error: reason, runId: run.id };
  };
  if (!storagePath) return fail("Media one-off tidak ditemukan");
  const mediaUrl = publicImageUrl(storagePath);

  // STORIES container: image_url for photos, video_url for video Stories.
  const params = isVideo
    ? { media_type: "STORIES", video_url: mediaUrl, access_token: channel.access_token }
    : { media_type: "STORIES", image_url: mediaUrl, access_token: channel.access_token };
  let r = await igCall("POST", `/${channel.ig_user_id}/media`, params);
  if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer media");
  const creationId = r.json.id; await log(isVideo ? "Kontainer Story video dibuat, video diproses…" : "Kontainer media dibuat");
  const maxPolls = isVideo ? 20 : 18; // video transcoding takes longer
  let statusCode = "";
  for (let i = 0; i < maxPolls; i++) {
    r = await igCall("GET", `/${creationId}`, { fields: "status_code", access_token: channel.access_token });
    statusCode = r.json.status_code;
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR") return fail("Media diproses ERROR");
    await sleep(2500);
  }
  if (statusCode !== "FINISHED") return fail(isVideo ? "Video Story masih diproses (timeout). Coba video lebih pendek." : "Timeout proses media");
  await log("Media siap");
  r = await igCall("POST", `/${channel.ig_user_id}/media_publish`, { creation_id: creationId, access_token: channel.access_token });
  if (!r.json.id) return fail(r.json.error?.message || "Publish gagal");
  const mediaId = r.json.id;
  r = await igCall("GET", `/${mediaId}`, { fields: "permalink", access_token: channel.access_token });
  const permalink = r.json.permalink || null;
  await log("Dipublikasikan ✓");
  await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString(), ig_media_id: mediaId, permalink }).eq("id", run.id);
  await svc.from("scheduled_post").update({ status: "published" }).eq("id", post.id);
  await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "success", title: `One-off terbit — ${chLabel}`, body: "Story one-off terbit ke Instagram.", runId: run.id });
  if (isVideo) await svc.storage.from("pool-images").remove([storagePath]).catch(() => {}); // free the video file (free-tier storage)
  return { ok: true, permalink, runId: run.id };
}

// Auto-refresh long-lived Instagram tokens before they lapse (~60d lifetime).
// ig_refresh_token works in Development Mode and needs no App Review; it just
// requires a still-valid token ≥24h old. We refresh any connected channel whose
// token expires within 10 days (or has unknown expiry). On failure the token is
// likely already expired → mark needs_reconnect + alert so the user re-links.
const REFRESH_WINDOW_MS = 10 * 86400 * 1000;
export async function refreshTokensDue(svc) {
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_MS).toISOString();
  const { data: chans = [] } = await svc.from("channel")
    .select("id, owner_id, slug, access_token, token_expires_at")
    .eq("token_status", "connected").is("archived_at", null)
    .or(`token_expires_at.is.null,token_expires_at.lte.${cutoff}`);
  const out = [];
  for (const c of chans || []) {
    if (!c.access_token) continue;
    try {
      const u = new URL("https://graph.instagram.com/refresh_access_token");
      u.searchParams.set("grant_type", "ig_refresh_token");
      u.searchParams.set("access_token", c.access_token);
      const r = await fetch(u);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.access_token) {
        const exp = j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null;
        await svc.from("channel").update({ access_token: j.access_token, token_expires_at: exp, last_refresh_at: new Date().toISOString(), token_status: "connected" }).eq("id", c.id);
        out.push({ channel: c.slug, ok: true, expires: exp });
      } else {
        await svc.from("channel").update({ token_status: "needs_reconnect" }).eq("id", c.id);
        await notify(svc, { ownerId: c.owner_id, channelId: c.id, type: "error",
          title: `Channel perlu disambungkan ulang — ${c.slug}`,
          body: "Token Instagram tidak bisa diperpanjang otomatis. Buka Connections → Sambungkan ulang.", runId: null });
        out.push({ channel: c.slug, ok: false, error: j?.error?.message || "refresh gagal" });
      }
    } catch (e) { out.push({ channel: c.slug, ok: false, error: String(e?.message || e) }); }
  }
  return out;
}

// Publish a one-off Feed post (single image or 2–10 carousel) + optional first
// comment. Same claim/visibility/notify pattern as publishStoryOneoff.
export async function publishFeedOneoff(svc, { channel, post }) {
  const { data: claimed } = await svc.from("scheduled_post")
    .update({ status: "publishing" }).eq("id", post.id).eq("status", "scheduled").select("id").maybeSingle();
  if (!claimed) return { skipped: true };

  const { data: links = [] } = await svc.from("scheduled_post_media").select("asset_id, position").eq("post_id", post.id).order("position");
  const assetIds = (links || []).map((l) => l.asset_id);
  let paths = [], anyVideo = false;
  if (assetIds.length) {
    const { data: assets = [] } = await svc.from("media_asset").select("id, storage_path, format").in("id", assetIds);
    const byId = Object.fromEntries((assets || []).map((a) => [a.id, a]));
    paths = (links || []).map((l) => byId[l.asset_id]?.storage_path).filter(Boolean);
    anyVideo = (assets || []).some((a) => a.format === "mp4" || a.format === "mov" || /\.(mp4|mov)$/i.test(a.storage_path || ""));
  }

  const { data: run } = await svc.from("post_run").insert({
    channel_id: channel.id, rule_id: null, scheduled_post_id: post.id, status: "publishing",
    trigger: "scheduled", scheduled_at: post.scheduled_at || new Date().toISOString(),
    claim_key: `oneoff:${post.id}`, attempt_count: 1,
  }).select("id").single();
  if (!run) { await svc.from("scheduled_post").update({ status: "scheduled" }).eq("id", post.id); return { ok: false, error: "Gagal membuat catatan publish" }; }
  const log = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });
  const chLabel = channel.handle || channel.slug || "channel";
  const fail = async (reason) => {
    await log(reason, true);
    await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
    await svc.from("scheduled_post").update({ status: "failed" }).eq("id", post.id);
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "error", title: `Feed gagal — ${chLabel}`, body: reason, runId: run.id });
    return { ok: false, error: reason, runId: run.id };
  };
  if (!paths.length) return fail("Media feed tidak ditemukan");
  if (anyVideo) return fail("Feed belum mendukung video — pakai gambar, atau jadwalkan sebagai Reels.");
  const token = channel.access_token, igu = channel.ig_user_id;
  const caption = post.caption || "";

  // Build the container: single image, or a CAROUSEL of child items.
  let containerId;
  if (paths.length === 1) {
    const r = await igCall("POST", `/${igu}/media`, { image_url: publicImageUrl(paths[0]), caption, access_token: token });
    if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer feed");
    containerId = r.json.id;
  } else {
    const childIds = [];
    for (const p of paths.slice(0, 10)) {
      const r = await igCall("POST", `/${igu}/media`, { image_url: publicImageUrl(p), is_carousel_item: true, access_token: token });
      if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat item carousel");
      childIds.push(r.json.id);
    }
    await log(`Carousel ${childIds.length} item dibuat`);
    const r = await igCall("POST", `/${igu}/media`, { media_type: "CAROUSEL", children: childIds.join(","), caption, access_token: token });
    if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer carousel");
    containerId = r.json.id;
  }

  // Wait for the (parent) container to finish processing.
  let statusCode = "";
  for (let i = 0; i < 16; i++) {
    const r = await igCall("GET", `/${containerId}`, { fields: "status_code", access_token: token });
    statusCode = r.json.status_code;
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR") return fail("Media feed diproses ERROR");
    await sleep(2500);
  }
  if (statusCode !== "FINISHED") return fail("Timeout proses media feed");
  await log("Media feed divalidasi");

  let r = await igCall("POST", `/${igu}/media_publish`, { creation_id: containerId, access_token: token });
  if (!r.json.id) return fail(r.json.error?.message || "Publish feed gagal");
  const mediaId = r.json.id;
  r = await igCall("GET", `/${mediaId}`, { fields: "permalink", access_token: token });
  const permalink = r.json.permalink || null;
  await log("Dipublikasikan ✓");

  // Optional pinned first comment (best-effort — don't fail the post if it errors).
  if (post.first_comment) {
    const cr = await igCall("POST", `/${mediaId}/comments`, { message: post.first_comment, access_token: token });
    await log(cr.json.id ? "Komentar pertama diposting" : `Komentar pertama gagal: ${cr.json.error?.message || "?"}`, !cr.json.id);
  }

  await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString(), ig_media_id: mediaId, permalink }).eq("id", run.id);
  await svc.from("scheduled_post").update({ status: "published" }).eq("id", post.id);
  await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "success", title: `Feed terbit — ${chLabel}`, body: `Feed one-off (${paths.length} gambar) terbit ke Instagram.`, runId: run.id });
  return { ok: true, permalink, runId: run.id };
}

// Publish a one-off Reels (video) + optional first comment. Same claim/visibility/
// notify pattern. Video transcoding is slower than images, so we poll longer (still
// within the cron's ~60s budget). [verify Reels publish end-to-end in Spike]
export async function publishReelsOneoff(svc, { channel, post }) {
  const { data: claimed } = await svc.from("scheduled_post")
    .update({ status: "publishing" }).eq("id", post.id).eq("status", "scheduled").select("id").maybeSingle();
  if (!claimed) return { skipped: true };

  const { data: links = [] } = await svc.from("scheduled_post_media").select("asset_id, position").eq("post_id", post.id).order("position").limit(1);
  let storagePath = null;
  if (links[0]?.asset_id) {
    const { data: a } = await svc.from("media_asset").select("storage_path").eq("id", links[0].asset_id).single();
    storagePath = a?.storage_path;
  }

  const { data: run } = await svc.from("post_run").insert({
    channel_id: channel.id, rule_id: null, scheduled_post_id: post.id, status: "publishing",
    trigger: "scheduled", scheduled_at: post.scheduled_at || new Date().toISOString(),
    claim_key: `oneoff:${post.id}`, attempt_count: 1,
  }).select("id").single();
  if (!run) { await svc.from("scheduled_post").update({ status: "scheduled" }).eq("id", post.id); return { ok: false, error: "Gagal membuat catatan publish" }; }
  const log = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });
  const chLabel = channel.handle || channel.slug || "channel";
  const fail = async (reason) => {
    await log(reason, true);
    await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
    await svc.from("scheduled_post").update({ status: "failed" }).eq("id", post.id);
    await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "error", title: `Reels gagal — ${chLabel}`, body: reason, runId: run.id });
    return { ok: false, error: reason, runId: run.id };
  };
  if (!storagePath) return fail("Video Reels tidak ditemukan");
  const token = channel.access_token, igu = channel.ig_user_id;

  let r = await igCall("POST", `/${igu}/media`, { media_type: "REELS", video_url: publicImageUrl(storagePath), caption: post.caption || "", share_to_feed: "true", access_token: token });
  if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer Reels");
  const containerId = r.json.id;
  await log("Kontainer Reels dibuat, video diproses…");

  let statusCode = "";
  for (let i = 0; i < 16; i++) {
    r = await igCall("GET", `/${containerId}`, { fields: "status_code", access_token: token });
    statusCode = r.json.status_code;
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR") return fail("Video Reels gagal diproses (ERROR)");
    await sleep(2500);
  }
  if (statusCode !== "FINISHED") return fail("Video Reels masih diproses (timeout). Coba video lebih pendek lalu jadwalkan ulang.");
  await log("Video Reels siap");

  r = await igCall("POST", `/${igu}/media_publish`, { creation_id: containerId, access_token: token });
  if (!r.json.id) return fail(r.json.error?.message || "Publish Reels gagal");
  const mediaId = r.json.id;
  r = await igCall("GET", `/${mediaId}`, { fields: "permalink", access_token: token });
  const permalink = r.json.permalink || null;
  await log("Dipublikasikan ✓");

  if (post.first_comment) {
    const cr = await igCall("POST", `/${mediaId}/comments`, { message: post.first_comment, access_token: token });
    await log(cr.json.id ? "Komentar pertama diposting" : `Komentar pertama gagal: ${cr.json.error?.message || "?"}`, !cr.json.id);
  }

  await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString(), ig_media_id: mediaId, permalink }).eq("id", run.id);
  await svc.from("scheduled_post").update({ status: "published" }).eq("id", post.id);
  await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "success", title: `Reels terbit — ${chLabel}`, body: "Reels one-off terbit ke Instagram.", runId: run.id });
  await svc.storage.from("pool-images").remove([storagePath]).catch(() => {}); // free the video file (free-tier storage)
  return { ok: true, permalink, runId: run.id };
}

// pool role for "now" given rule mode + WIB day-of-week
export function roleForNow(mode, dowWib) {
  if (mode !== "schedule") return "single";
  return dowWib === 0 || dowWib === 6 ? "weekend" : "weekday";
}
