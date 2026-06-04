import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const V = process.env.META_GRAPH_VERSION || "v25.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function igCall(method, path, params) {
  const url = new URL(`https://graph.instagram.com/${V}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// Publish one Story from a rule's pool (no-repeat pick). Manual trigger ("Post now").
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { ruleId } = await request.json().catch(() => ({}));
    if (!ruleId) return NextResponse.json({ ok: false, error: "ruleId required" }, { status: 400 });

    // identify caller
    const anon = createClient(URL_, ANON);
    const { data: ures } = await anon.auth.getUser(token);
    const user = ures?.user;
    if (!user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

    // rule + channel (+ ownership check)
    const { data: rule } = await svc.from("recurring_rule").select("id, channel_id, mode, name").eq("id", ruleId).single();
    if (!rule) return NextResponse.json({ ok: false, error: "Rule not found" }, { status: 404 });
    const { data: ch } = await svc.from("channel")
      .select("id, owner_id, ig_user_id, access_token, token_status, handle").eq("id", rule.channel_id).single();
    if (!ch || ch.owner_id !== user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    if (!ch.ig_user_id || !ch.access_token) return NextResponse.json({ ok: false, error: "Channel belum tersambung (token kosong)" }, { status: 400 });

    // choose pool role by WIB day (schedule) or single (pool)
    const wib = new Date(Date.now() + 7 * 3600 * 1000);
    const dow = wib.getUTCDay(); // 0=Sun..6=Sat
    const role = rule.mode === "schedule" ? (dow === 0 || dow === 6 ? "weekend" : "weekday") : "single";
    const { data: pool } = await svc.from("pool").select("id").eq("rule_id", ruleId).eq("role", role).single();
    if (!pool) return NextResponse.json({ ok: false, error: `Pool ${role} belum ada` }, { status: 400 });

    // no-repeat shuffle pick
    let { data: imgs = [] } = await svc.from("pool_image").select("id, storage_path, used_in_cycle").eq("pool_id", pool.id);
    if (!imgs.length) return NextResponse.json({ ok: false, error: `Pool ${role} kosong` }, { status: 400 });
    let unused = imgs.filter((i) => !i.used_in_cycle);
    if (!unused.length) { await svc.from("pool_image").update({ used_in_cycle: false }).eq("pool_id", pool.id); unused = imgs; }
    const pick = unused[Math.floor(Math.random() * unused.length)];
    const imageUrl = `${URL_}/storage/v1/object/public/pool-images/${pick.storage_path}`;

    // create post_run (publishing)
    const claimKey = `manual:${ruleId}:${Date.now()}`;
    const { data: run } = await svc.from("post_run").insert({
      channel_id: ch.id, rule_id: ruleId, pool_role: role, image_id: pick.id,
      status: "publishing", trigger: "manual", scheduled_at: new Date().toISOString(), claim_key: claimKey, attempt_count: 1,
    }).select("id").single();
    const logAttempt = (outcome, is_fail = false) => svc.from("post_attempt").insert({ run_id: run.id, outcome, is_fail });

    // 1) create STORIES container
    let r = await igCall("POST", `/${ch.ig_user_id}/media`, { media_type: "STORIES", image_url: imageUrl, access_token: ch.access_token });
    if (!r.json.id) {
      const reason = r.json.error?.message || "Gagal membuat kontainer media";
      await logAttempt(reason, true);
      await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
      return NextResponse.json({ ok: false, error: reason }, { status: 502 });
    }
    const creationId = r.json.id;
    await logAttempt("Kontainer media dibuat");

    // 2) poll FINISHED
    let statusCode = "";
    for (let i = 0; i < 20; i++) {
      r = await igCall("GET", `/${creationId}`, { fields: "status_code", access_token: ch.access_token });
      statusCode = r.json.status_code;
      if (statusCode === "FINISHED") break;
      if (statusCode === "ERROR") {
        await logAttempt("Kontainer ERROR", true);
        await svc.from("post_run").update({ status: "failed", fail_reason: "Media diproses ERROR" }).eq("id", run.id);
        return NextResponse.json({ ok: false, error: "Media ERROR" }, { status: 502 });
      }
      await sleep(2500);
    }
    if (statusCode !== "FINISHED") {
      await logAttempt("Timeout menunggu FINISHED", true);
      await svc.from("post_run").update({ status: "failed", fail_reason: "Timeout proses media" }).eq("id", run.id);
      return NextResponse.json({ ok: false, error: "Timeout" }, { status: 504 });
    }
    await logAttempt("Media divalidasi (9:16)");

    // 3) publish
    r = await igCall("POST", `/${ch.ig_user_id}/media_publish`, { creation_id: creationId, access_token: ch.access_token });
    if (!r.json.id) {
      const reason = r.json.error?.message || "Publish gagal";
      await logAttempt(reason, true);
      await svc.from("post_run").update({ status: "failed", fail_reason: reason }).eq("id", run.id);
      return NextResponse.json({ ok: false, error: reason }, { status: 502 });
    }
    const mediaId = r.json.id;

    // 4) permalink
    r = await igCall("GET", `/${mediaId}`, { fields: "permalink", access_token: ch.access_token });
    const permalink = r.json.permalink || null;

    await logAttempt("Dipublikasikan ✓");
    await svc.from("post_run").update({ status: "published", published_at: new Date().toISOString(), ig_media_id: mediaId, permalink }).eq("id", run.id);
    await svc.from("pool_image").update({ used_in_cycle: true }).eq("id", pick.id);

    return NextResponse.json({ ok: true, mediaId, permalink });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
