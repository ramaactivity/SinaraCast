import { NextResponse } from "next/server";
import { svcClient, publishForRule, roleForNow, notify, publishStoryOneoff, publishFeedOneoff, publishReelsOneoff, resumeOneoffContainer, refreshTokensDue, refreshPlanMetricsDue, refreshRunMetricsDue, snapshotFollowersDue } from "../../../lib/publishCore";
import { publishTikTokVideoScheduled, resumeTikTokVideo } from "../../../lib/tiktokCore";
import { syncSpecialDaysDue, specialDayRemindersDue, specialTodayByOwner } from "../../../lib/specialDays";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

const hhmmToMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const wibDateStr = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

function isFireDay(rule, dow, today, nowWib) {
  if (rule.cadence_type === "daily") return true;
  if (rule.cadence_type === "weekdays") return Array.isArray(rule.weekdays) && rule.weekdays.includes(dow);
  if (rule.cadence_type === "every_n_days") {
    const n = rule.interval_days || 2;
    const anchor = new Date(new Date(rule.created_at).getTime() + 7 * 3600 * 1000);
    const a = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const t = Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate());
    const days = Math.round((t - a) / 86400000);
    return days >= 0 && days % n === 0;
  }
  return false;
}

// Called every minute by Supabase pg_cron (pg_net). Publishes rules due now (WIB),
// idempotent per rule/day via claim_key.
export async function POST(request) {
  if (!CRON_SECRET || request.headers.get("x-cron-secret") !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const svc = svcClient();
  const startMs = Date.now();
  const DEADLINE_MS = 45000; // stop starting new publishes ~45s in; leftovers retry next tick
  const overBudget = () => Date.now() - startMs > DEADLINE_MS;
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const dow = nowWib.getUTCDay();
  const today = wibDateStr(nowWib);
  const nowMin = nowWib.getUTCHours() * 60 + nowWib.getUTCMinutes();

  // Recover anything stuck in "publishing" (e.g. a video transcode that ran past
  // the 60s function budget last tick): mark it failed + alert so it isn't stranded.
  const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  try {
    const { data: stuck = [] } = await svc.from("scheduled_post")
      .select("id, channel_id").eq("status", "publishing").lt("scheduled_at", staleIso);
    for (const sp of stuck || []) {
      await svc.from("scheduled_post").update({ status: "failed" }).eq("id", sp.id);
      await svc.from("post_run").update({ status: "failed", fail_reason: "Instagram tidak selesai memproses video tepat waktu (mungkin video terlalu berat)." }).eq("scheduled_post_id", sp.id).eq("status", "publishing");
      const ch = await svc.from("channel").select("owner_id").eq("id", sp.channel_id).maybeSingle();
      await notify(svc, { ownerId: ch.data?.owner_id, channelId: sp.channel_id, type: "error", title: "Postingan tertahan", body: "Sebuah postingan video gagal selesai diproses tepat waktu. Coba lagi dengan video lebih pendek." });
    }
    await svc.from("post_run").update({ status: "failed", fail_reason: "Tidak selesai diproses tepat waktu." }).eq("status", "publishing").lt("created_at", staleIso).is("scheduled_post_id", null);
  } catch (_) { /* sweep is best-effort */ }

  // Keep long-lived Instagram tokens fresh (~60d lifetime). Cheap: only touches
  // channels expiring within 10 days, so it's a no-op on almost every tick.
  let refreshed = [];
  try { refreshed = await refreshTokensDue(svc); } catch (_) { /* don't abort the tick on refresh error */ }

  // eligible channels (connected, not paused, not archived) + owners not globally paused
  const { data: channels = [] } = await svc.from("channel")
    .select("id, owner_id, slug, ig_user_id, access_token, token_status, paused, archived_at")
    .eq("platform", "instagram") // recurring IG engine ignores TikTok channels
    .eq("token_status", "connected").eq("paused", false).is("archived_at", null);

  // TikTok channels are eligible for one-off VIDEO publishing only (no recurring yet).
  const { data: ttChannels = [] } = await svc.from("channel")
    .select("id, owner_id, slug, handle, access_token, refresh_token, token_status, token_expires_at, paused, archived_at")
    .eq("platform", "tiktok").eq("token_status", "connected").eq("paused", false).is("archived_at", null);

  if (!channels.length && !ttChannels.length) return NextResponse.json({ ok: true, refreshed, fired: [], note: "no eligible channels" });

  const owners = [...new Set([...channels, ...ttChannels].map((c) => c.owner_id))];
  const { data: settings = [] } = await svc.from("app_settings").select("owner_id, pause_all").in("owner_id", owners);
  const pausedOwners = new Set((settings || []).filter((s) => s.pause_all).map((s) => s.owner_id));
  const chById = Object.fromEntries(channels.filter((c) => !pausedOwners.has(c.owner_id)).map((c) => [c.id, c]));
  const ttById = Object.fromEntries(ttChannels.filter((c) => !pausedOwners.has(c.owner_id)).map((c) => [c.id, c]));

  const { data: rules = [] } = await svc.from("recurring_rule")
    .select("id, channel_id, name, mode, active, cadence_type, interval_days, weekdays, post_time, weekday_time, weekend_time, grace_minutes, special_behavior, created_at")
    .eq("active", true).is("archived_at", null).in("channel_id", Object.keys(chById).length ? Object.keys(chById) : ["00000000-0000-0000-0000-000000000000"]);

  // Hari Spesial: today's active special day per owner (Map ownerId → name).
  let specialByOwner = new Map();
  try { specialByOwner = await specialTodayByOwner(svc, today); } catch (_) { /* best-effort */ }

  // per-day overrides for today (skip / swap)
  const ruleIds = rules.map((r) => r.id);
  let overrides = {};
  if (ruleIds.length) {
    const { data: ovs = [] } = await svc.from("day_override").select("rule_id, type, swap_image_id").eq("on_date", today).in("rule_id", ruleIds);
    overrides = Object.fromEntries((ovs || []).map((o) => [o.rule_id, o]));
  }

  const fired = [];
  for (const rule of rules) {
    const channel = chById[rule.channel_id];
    if (!channel) continue;
    if (!isFireDay(rule, dow, today, nowWib)) continue;
    const ov = overrides[rule.id];
    if (ov?.type === "skip") {
      // honor "lewati hari ini": claim the daily key as skipped so nothing posts and no missed-run alert fires
      const { data: sk } = await svc.from("post_run").insert({
        channel_id: channel.id, rule_id: rule.id, status: "skipped", trigger: "scheduled",
        scheduled_at: nowWib.toISOString(), claim_key: `auto:${rule.id}:${today}`, attempt_count: 0,
        fail_reason: "Dilewati manual hari ini",
      }).select("id").maybeSingle();
      if (sk) { await svc.from("post_attempt").insert({ run_id: sk.id, outcome: "Dilewati manual (lewati hari ini)", is_fail: false }); fired.push({ rule: rule.name, channel: channel.slug, skipped: "manual" }); }
      continue;
    }
    // Hari Spesial 'skip': rule rests on special days. A manual swap for today wins
    // (the user explicitly picked an image), matching day_override precedence.
    const specialName = specialByOwner.get(channel.owner_id);
    if (specialName && rule.special_behavior === "skip" && ov?.type !== "swap") {
      const { data: sk } = await svc.from("post_run").insert({
        channel_id: channel.id, rule_id: rule.id, status: "skipped", trigger: "scheduled",
        scheduled_at: nowWib.toISOString(), claim_key: `auto:${rule.id}:${today}`, attempt_count: 0,
        fail_reason: `Hari spesial (${specialName}) — dilewati otomatis`,
      }).select("id").maybeSingle();
      if (sk) { await svc.from("post_attempt").insert({ run_id: sk.id, outcome: `Dilewati otomatis — hari spesial: ${specialName}`, is_fail: false }); fired.push({ rule: rule.name, channel: channel.slug, skipped: "special" }); }
      continue;
    }
    const isWeekend = dow === 0 || dow === 6;
    const schedMin = hhmmToMin(rule.mode === "schedule" ? (isWeekend ? rule.weekend_time : rule.weekday_time) : rule.post_time);
    if (schedMin == null) continue;
    const grace = rule.grace_minutes ?? 30;
    if (!(nowMin >= schedMin && nowMin <= schedMin + grace)) {
      // Past the grace window with no run today → flag a missed run (once/day).
      // Reuses the daily claim_key: if a publish already happened the key is
      // taken and this insert conflicts (23505), so no false "missed" alert.
      if (nowMin > schedMin + grace) {
        const { data: skip } = await svc.from("post_run").insert({
          channel_id: channel.id, rule_id: rule.id, status: "skipped", trigger: "scheduled",
          scheduled_at: nowWib.toISOString(), claim_key: `auto:${rule.id}:${today}`, attempt_count: 0,
          fail_reason: "Jadwal terlewat — sudah lewat dari tenggang waktu hari ini",
        }).select("id").maybeSingle();
        if (skip) {
          await svc.from("post_attempt").insert({ run_id: skip.id, outcome: "Jadwal terlewat — sudah lewat dari tenggang waktu hari ini", is_fail: true });
          await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "warn",
            title: `Jadwal terlewat — ${channel.handle || channel.slug}`, body: `Jadwal “${rule.name}” tidak sempat terbit dalam tenggang waktu hari ini.`, runId: skip.id });
          fired.push({ rule: rule.name, channel: channel.slug, missed: true });
        }
      }
      continue;
    }

    if (overBudget()) break; // out of budget this tick; due rules retry next minute (still within grace)
    let role = roleForNow(rule.mode, dow);
    // Hari Spesial 'special_pool': use the rule's special pool when it has images;
    // an empty/missing special pool falls back to the normal pool (never fail the run).
    if (specialName && rule.special_behavior === "special_pool" && ov?.type !== "swap") {
      const { data: sp } = await svc.from("pool").select("id").eq("rule_id", rule.id).eq("role", "special").maybeSingle();
      if (sp) {
        const { count } = await svc.from("pool_image").select("id", { count: "exact", head: true }).eq("pool_id", sp.id);
        if (count > 0) role = "special";
      }
    }
    const claimKey = `auto:${rule.id}:${today}`;
    try {
      const res = await publishForRule(svc, { channel, rule, role, trigger: ov?.type === "swap" ? "swap" : "scheduled", claimKey, scheduledAtISO: new Date().toISOString(), forceImageId: ov?.type === "swap" ? ov.swap_image_id : undefined });
      if (res.skipped) continue;
      fired.push({ rule: rule.name, channel: channel.slug, ok: res.ok, error: res.error, permalink: res.permalink });
    } catch (e) {
      fired.push({ rule: rule.name, channel: channel.slug, ok: false, error: String(e?.message || e) });
    }
  }
  // ---- resume video one-offs whose IG container was still transcoding last tick ----
  // (created within the stale window so the sweep above hasn't failed them yet)
  const resumed = [];
  try {
    const { data: pending = [] } = await svc.from("post_run")
      .select("id, channel_id, scheduled_post_id, ig_media_id")
      .eq("status", "publishing").not("scheduled_post_id", "is", null).not("ig_media_id", "is", null)
      .gte("created_at", staleIso);
    for (const run of pending || []) {
      if (overBudget()) break;
      const { data: ch } = await svc.from("channel").select("id, owner_id, slug, handle, platform, ig_user_id, access_token, refresh_token, token_expires_at").eq("id", run.channel_id).maybeSingle();
      const { data: post } = await svc.from("scheduled_post").select("id, post_type, first_comment").eq("id", run.scheduled_post_id).maybeSingle();
      if (!ch || !post) continue;
      try {
        const res = ch.platform === "tiktok"
          ? await resumeTikTokVideo(svc, { channel: ch, post, run })
          : await resumeOneoffContainer(svc, { channel: ch, post, run });
        resumed.push({ oneoff: post.id, type: post.post_type, ok: res.ok, processing: res.processing, error: res.error });
      } catch (e) { resumed.push({ oneoff: run.scheduled_post_id, ok: false, error: String(e?.message || e) }); }
    }
  } catch (_) { /* resume is best-effort; stale-sweep is the backstop */ }

  // ---- one-off posts (Story / Feed / Reels) due now, on eligible channels ----
  const oneoffs = [];
  const chIds = Object.keys(chById);
  if (chIds.length) {
    const { data: posts = [] } = await svc.from("scheduled_post")
      .select("id, channel_id, post_type, caption, first_comment, scheduled_at, status")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .in("channel_id", chIds);
    for (const post of posts) {
      if (overBudget()) break; // leftover one-offs are still 'scheduled' → next tick picks them up
      const channel = chById[post.channel_id];
      if (!channel) continue;
      try {
        const res = post.post_type === "feed" ? await publishFeedOneoff(svc, { channel, post })
          : post.post_type === "reels" ? await publishReelsOneoff(svc, { channel, post })
          : await publishStoryOneoff(svc, { channel, post });
        if (res.skipped) continue;
        oneoffs.push({ oneoff: post.id, type: post.post_type, channel: channel.slug, ok: res.ok, error: res.error, permalink: res.permalink });
      } catch (e) {
        oneoffs.push({ oneoff: post.id, type: post.post_type, channel: channel.slug, ok: false, error: String(e?.message || e) });
      }
    }
  }

  // ---- TikTok one-off VIDEO posts due now, on eligible TikTok channels ----
  const tiktoks = [];
  const ttIds = Object.keys(ttById);
  if (ttIds.length) {
    const { data: posts = [] } = await svc.from("scheduled_post")
      .select("id, channel_id, post_type, caption, scheduled_at, status, tiktok_options")
      .eq("status", "scheduled").eq("post_type", "tiktok_video")
      .lte("scheduled_at", new Date().toISOString())
      .in("channel_id", ttIds);
    for (const post of posts) {
      if (overBudget()) break; // leftover ones stay 'scheduled' → next tick picks them up
      const channel = ttById[post.channel_id];
      if (!channel) continue;
      try {
        const res = await publishTikTokVideoScheduled(svc, { channel, post });
        if (res.skipped) continue;
        tiktoks.push({ oneoff: post.id, channel: channel.slug, ok: res.ok, processing: res.processing, error: res.error });
      } catch (e) {
        tiktoks.push({ oneoff: post.id, channel: channel.slug, ok: false, error: String(e?.message || e) });
      }
    }
  }

  // ---- Content Planner: refresh auto-managed IG plan metrics (best-effort; gated
  // off by default until the insights permission is granted — see publishCore). ----
  let planMetrics = { enabled: false };
  if (!overBudget()) {
    try { planMetrics = await refreshPlanMetricsDue(svc); } catch (e) { planMetrics = { enabled: true, error: String(e?.message || e) }; }
  }

  // ---- daily follower snapshot for the Ringkasan trend (self-guarding, cheap) ----
  let followers = { snapped: 0 };
  if (!overBudget()) {
    try { followers = await snapshotFollowersDue(svc); } catch (e) { followers = { error: String(e?.message || e) }; }
  }

  // ---- per-post metrics auto-pull (post_run) — small cap per tick; Stories have
  // a 20–26h pull window so this runs every tick, not once a day ----
  let runMetrics = { enabled: false };
  if (!overBudget()) {
    try { runMetrics = await refreshRunMetricsDue(svc, { limit: 4 }); } catch (e) { runMetrics = { enabled: true, error: String(e?.message || e) }; }
  }

  // ---- Hari Spesial: daily API sync + H-7/H-1 reminders (self-guarding) ----
  // Reminders wait until 08:00 WIB so the Telegram ping lands at a humane hour.
  let specialDays = {};
  if (!overBudget()) {
    try { specialDays.sync = await syncSpecialDaysDue(svc); } catch (e) { specialDays.sync = { error: String(e?.message || e) }; }
  }
  if (!overBudget() && nowWib.getUTCHours() >= 8) {
    try { specialDays.reminders = await specialDayRemindersDue(svc); } catch (e) { specialDays.reminders = { error: String(e?.message || e) }; }
  }

  return NextResponse.json({ ok: true, at: nowWib.toISOString(), refreshed, fired, resumed, oneoffs, tiktoks, planMetrics, runMetrics, followers, specialDays });
}

// allow GET for a quick manual ping/health (still secret-gated)
export const GET = POST;
