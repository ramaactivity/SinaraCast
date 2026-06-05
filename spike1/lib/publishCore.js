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
export async function publishForRule(svc, { channel, rule, role, trigger, claimKey, scheduledAtISO }) {
  // pick pool + no-repeat image
  const { data: pool } = await svc.from("pool").select("id").eq("rule_id", rule.id).eq("role", role).single();
  if (!pool) return { ok: false, error: `Pool ${role} belum ada` };
  let { data: imgs = [] } = await svc.from("pool_image").select("id, storage_path, used_in_cycle").eq("pool_id", pool.id);
  if (!imgs.length) return { ok: false, error: `Pool ${role} kosong` };
  let unused = imgs.filter((i) => !i.used_in_cycle);
  if (!unused.length) { await svc.from("pool_image").update({ used_in_cycle: false }).eq("pool_id", pool.id); unused = imgs; }
  const pick = unused[Math.floor(Math.random() * unused.length)];

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

  const imageUrl = publicImageUrl(pick.storage_path);

  // 1) container
  let r = await igCall("POST", `/${channel.ig_user_id}/media`, { media_type: "STORIES", image_url: imageUrl, access_token: channel.access_token });
  if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer media");
  const creationId = r.json.id;
  await log("Kontainer media dibuat");

  // 2) poll FINISHED
  let statusCode = "";
  for (let i = 0; i < 18; i++) {
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

  // first media asset → public URL
  const { data: media = [] } = await svc.from("scheduled_post_media").select("asset_id, position").eq("post_id", post.id).order("position").limit(1);
  let storagePath = null;
  if (media[0]?.asset_id) {
    const { data: a } = await svc.from("media_asset").select("storage_path").eq("id", media[0].asset_id).single();
    storagePath = a?.storage_path;
  }

  const { data: run } = await svc.from("post_run").insert({
    channel_id: channel.id, rule_id: null, scheduled_post_id: post.id, status: "publishing",
    trigger: "scheduled", scheduled_at: post.scheduled_at || new Date().toISOString(),
    claim_key: `oneoff:${post.id}`, attempt_count: 1,
  }).select("id").single();
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
  const imageUrl = publicImageUrl(storagePath);

  let r = await igCall("POST", `/${channel.ig_user_id}/media`, { media_type: "STORIES", image_url: imageUrl, access_token: channel.access_token });
  if (!r.json.id) return fail(r.json.error?.message || "Gagal membuat kontainer media");
  const creationId = r.json.id; await log("Kontainer media dibuat");
  let statusCode = "";
  for (let i = 0; i < 18; i++) {
    r = await igCall("GET", `/${creationId}`, { fields: "status_code", access_token: channel.access_token });
    statusCode = r.json.status_code;
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR") return fail("Media diproses ERROR");
    await sleep(2500);
  }
  if (statusCode !== "FINISHED") return fail("Timeout proses media");
  await log("Media divalidasi (9:16)");
  r = await igCall("POST", `/${channel.ig_user_id}/media_publish`, { creation_id: creationId, access_token: channel.access_token });
  if (!r.json.id) return fail(r.json.error?.message || "Publish gagal");
  const mediaId = r.json.id;
  r = await igCall("GET", `/${mediaId}`, { fields: "permalink", access_token: channel.access_token });
  const permalink = r.json.permalink || null;
  await log("Dipublikasikan ✓");
  await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString(), ig_media_id: mediaId, permalink }).eq("id", run.id);
  await svc.from("scheduled_post").update({ status: "published" }).eq("id", post.id);
  await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "success", title: `One-off terbit — ${chLabel}`, body: "Story one-off terbit ke Instagram.", runId: run.id });
  return { ok: true, permalink, runId: run.id };
}

// pool role for "now" given rule mode + WIB day-of-week
export function roleForNow(mode, dowWib) {
  if (mode !== "schedule") return "single";
  return dowWib === 0 || dowWib === 6 ? "weekend" : "weekday";
}
