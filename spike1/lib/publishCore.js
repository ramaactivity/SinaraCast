import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const V = process.env.META_GRAPH_VERSION || "v25.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const log = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });
  const fail = async (reason) => { await log(reason, true); await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id); return { ok: false, error: reason, runId: run.id }; };

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
  return { ok: true, mediaId, permalink, runId: run.id };
}

// pool role for "now" given rule mode + WIB day-of-week
export function roleForNow(mode, dowWib) {
  if (mode !== "schedule") return "single";
  return dowWib === 0 || dowWib === 6 ? "weekend" : "weekday";
}
