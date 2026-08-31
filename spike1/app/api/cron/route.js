import { NextResponse } from "next/server";
import { svcClient, publishForRule, roleForNow, notify, publishStoryOneoff, publishFeedOneoff, publishReelsOneoff, resumeOneoffContainer, resumeRuleStory, refreshTokensDue, refreshPlanMetricsDue, refreshRunMetricsDue, snapshotFollowersDue } from "../../../lib/publishCore";
import { publishTikTokVideoScheduled, resumeTikTokVideo } from "../../../lib/tiktokCore";
import { syncSpecialDaysDue, specialDayRemindersDue, specialTodayByOwner } from "../../../lib/specialDays";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

const hhmmToMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const wibDateStr = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
// Absolute instant (UTC ms) of a WIB "HH:MM" slot on a WIB date "YYYY-MM-DD".
const slotInstantMs = (wibDate, hhmm) => {
  const [y, mo, d] = wibDate.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - 7 * 3600 * 1000;
};

// The posting times for a rule on the current day. A rule can fire at several times
// per day (mis. pagi/sore/malam). Reads the *_times array, falling back to the legacy
// single time column when the array is empty. Normalizes to "HH:MM", dedupes, sorts.
function slotTimesFor(rule, isWeekend) {
  const arr = rule.mode === "schedule"
    ? (isWeekend ? rule.weekend_times : rule.weekday_times)
    : rule.post_times;
  const single = rule.mode === "schedule" ? (isWeekend ? rule.weekend_time : rule.weekday_time) : rule.post_time;
  const raw = (Array.isArray(arr) && arr.length) ? arr : (single ? [single] : []);
  const norm = raw.map((t) => (t || "").slice(0, 5)).filter((t) => /^\d{2}:\d{2}$/.test(t));
  return [...new Set(norm)].sort();
}

// Masa berlaku: sebuah rule hanya boleh jalan di dalam [start_date, end_date] (WIB).
// Keduanya opsional — NULL berarti tanpa batas di sisi itu. Tanggal disimpan sebagai
// "YYYY-MM-DD" sehingga perbandingan string sudah urut secara kronologis.
const inDateWindow = (rule, today) =>
  (!rule.start_date || today >= String(rule.start_date).slice(0, 10)) &&
  (!rule.end_date || today <= String(rule.end_date).slice(0, 10));

function isFireDay(rule, dow, today, nowWib) {
  if (!inDateWindow(rule, today)) return false;
  if (rule.cadence_type === "daily") return true;
  if (rule.cadence_type === "weekdays") return Array.isArray(rule.weekdays) && rule.weekdays.includes(dow);
  if (rule.cadence_type === "every_n_days") {
    const n = rule.interval_days || 2;
    // Hitung dari tanggal mulai kalau masa berlakunya diatur — kalau tidak, dari
    // tanggal jadwal dibuat (perilaku lama).
    const anchorSrc = rule.start_date ? `${String(rule.start_date).slice(0, 10)}T00:00:00+07:00` : rule.created_at;
    const anchor = new Date(new Date(anchorSrc).getTime() + 7 * 3600 * 1000);
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
  const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // One round trip both claims this minute and reports which subsystems actually
  // have work. pg_net times out after 5s and the request gets replayed, so a slow
  // tick used to run twice; the claim turns the replay into a no-op. The counters
  // stand in for ~16 "is anything due?" queries that previously ran every single
  // minute just to come back empty. If the planner is missing (a deploy that has
  // run ahead of its migration) every gate opens and the tick behaves as before.
  let plan = null;
  try {
    const { data } = await svc.rpc("sinaracast_tick_plan", {
      p_today: today,
      p_stale: staleIso,
      p_minute: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
    });
    plan = data;
  } catch (_) { /* planner unavailable → fall through and run the whole tick */ }
  if (plan?.claimed === false) {
    return NextResponse.json({ ok: true, at: nowWib.toISOString(), skipped: "minute already claimed" });
  }
  const due = (k) => !plan || Number(plan[k]) > 0;

  // Recover anything stuck in "publishing" (e.g. a video transcode that ran past
  // the 60s function budget last tick): mark it failed + alert so it isn't stranded.
  try {
    const { data: stuck = [] } = due("stuck_posts") ? await svc.from("scheduled_post")
      .select("id, channel_id").eq("status", "publishing").lt("scheduled_at", staleIso) : { data: [] };
    for (const sp of stuck || []) {
      await svc.from("scheduled_post").update({ status: "failed" }).eq("id", sp.id);
      await svc.from("post_run").update({ status: "failed", fail_reason: "Instagram tidak selesai memproses video tepat waktu (mungkin video terlalu berat)." }).eq("scheduled_post_id", sp.id).eq("status", "publishing");
      const ch = await svc.from("channel").select("owner_id").eq("id", sp.channel_id).maybeSingle();
      await notify(svc, { ownerId: ch.data?.owner_id, channelId: sp.channel_id, type: "error", title: "Postingan tertahan", body: "Sebuah postingan video gagal selesai diproses tepat waktu. Coba lagi dengan video lebih pendek." });
    }
    // Recurring-rule runs (no scheduled_post row) stuck past the window — since
    // video Stories now legitimately wait across ticks, these must alert too
    // instead of failing silently.
    const { data: stuckRules = [] } = due("stuck_runs") ? await svc.from("post_run")
      .select("id, channel_id, rule_id").eq("status", "publishing")
      .lt("created_at", staleIso).is("scheduled_post_id", null) : { data: [] };
    for (const run of stuckRules || []) {
      await svc.from("post_run").update({ status: "failed", fail_reason: "Tidak selesai diproses tepat waktu." }).eq("id", run.id);
      const { data: ch } = await svc.from("channel").select("owner_id, slug, handle").eq("id", run.channel_id).maybeSingle();
      const { data: rl } = await svc.from("recurring_rule").select("name").eq("id", run.rule_id).maybeSingle();
      await notify(svc, { ownerId: ch?.owner_id, channelId: run.channel_id, type: "error",
        title: `Publikasi gagal — ${ch?.handle || ch?.slug || "channel"}`,
        body: `“${rl?.name || "Jadwal"}”: Instagram tidak selesai memproses video tepat waktu. Coba video yang lebih ringan.`, runId: run.id });
    }
  } catch (_) { /* sweep is best-effort */ }

  // Keep long-lived Instagram tokens fresh (~60d lifetime). Cheap: only touches
  // channels expiring within 10 days, so it's a no-op on almost every tick.
  let refreshed = [];
  if (due("token_due")) {
    try { refreshed = await refreshTokensDue(svc); } catch (_) { /* don't abort the tick on refresh error */ }
  }

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
    .select("id, channel_id, name, mode, active, cadence_type, interval_days, weekdays, post_time, weekday_time, weekend_time, post_times, weekday_times, weekend_times, grace_minutes, special_behavior, start_date, end_date, created_at")
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
  const expired = [];
  for (const rule of rules) {
    const channel = chById[rule.channel_id];
    if (!channel) continue;
    // Masa berlaku sudah lewat → nonaktifkan jadwalnya (sekali saja: tick berikutnya
    // rule ini tidak lagi ikut terambil karena query di atas menyaring active=true),
    // lalu kabari pemiliknya supaya tahu jadwalnya berhenti bukan karena error.
    if (rule.end_date && today > String(rule.end_date).slice(0, 10)) {
      try {
        await svc.from("recurring_rule").update({ active: false }).eq("id", rule.id);
        await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "info",
          title: `Masa berlaku jadwal selesai — ${channel.handle || channel.slug}`,
          body: `Jadwal “${rule.name}” berhenti otomatis karena sudah sampai tanggal terakhirnya. Aktifkan lagi kalau mau dilanjutkan.` });
        expired.push({ rule: rule.name, channel: channel.slug, endDate: String(rule.end_date).slice(0, 10) });
      } catch (_) { /* jangan gagalkan tick karena ini */ }
      continue;
    }
    if (!isFireDay(rule, dow, today, nowWib)) continue;
    const ov = overrides[rule.id];
    const isWeekend = dow === 0 || dow === 6;
    // A rule can fire at several times today (mis. pagi/sore/malam). Each slot is an
    // independent run, idempotent via a per-slot claim_key `auto:{rule}:{today}:{HH:MM}`.
    const times = slotTimesFor(rule, isWeekend);
    if (!times.length) continue;
    const grace = rule.grace_minutes ?? 30;
    const specialName = specialByOwner.get(channel.owner_id);

    // Day-level skip reason, applied to every slot today. A manual swap for today wins
    // over special-day skip (the user explicitly picked an image for the day).
    const skipReason =
      ov?.type === "skip" ? "Dilewati manual hari ini"
      : (specialName && rule.special_behavior === "skip" && ov?.type !== "swap") ? `Hari spesial (${specialName}) — dilewati otomatis`
      : null;

    // Resolve the pool role once for the day (weekday/weekend, or the special pool
    // when 'special_pool' applies and it has images). All of today's slots share it.
    let role = roleForNow(rule.mode, dow);
    if (!skipReason && specialName && rule.special_behavior === "special_pool" && ov?.type !== "swap") {
      const { data: sp } = await svc.from("pool").select("id").eq("rule_id", rule.id).eq("role", "special").maybeSingle();
      if (sp) {
        const { count } = await svc.from("pool_image").select("id", { count: "exact", head: true }).eq("pool_id", sp.id);
        if (count > 0) role = "special";
      }
    }

    for (let si = 0; si < times.length; si++) {
      const t = times[si];
      const schedMin = hhmmToMin(t);
      if (schedMin == null) continue;
      const claimKey = `auto:${rule.id}:${today}:${t}`;

      // Day-level skip: claim this slot as skipped so nothing posts and no missed alert fires.
      if (skipReason) {
        const { data: sk } = await svc.from("post_run").insert({
          channel_id: channel.id, rule_id: rule.id, status: "skipped", trigger: "scheduled",
          scheduled_at: nowWib.toISOString(), claim_key: claimKey, attempt_count: 0, fail_reason: skipReason,
        }).select("id").maybeSingle();
        if (sk) { await svc.from("post_attempt").insert({ run_id: sk.id, outcome: skipReason, is_fail: false }); fired.push({ rule: rule.name, channel: channel.slug, at: t, skipped: ov?.type === "skip" ? "manual" : "special" }); }
        continue;
      }

      if (!(nowMin >= schedMin && nowMin <= schedMin + grace)) {
        // Past this slot's grace window with no run → flag a missed run (once/slot/day).
        // The per-slot claim_key: if a publish already happened the key is taken and
        // this insert conflicts (23505), so no false "missed" alert.
        if (nowMin > schedMin + grace) {
          // A rule created after this slot's grace window had already closed never
          // had any chance to fire it — calling that "missed" is a false alarm on
          // day one (mis. bikin jadwal jam 15:12 yang punya slot 13:30). A rule
          // created *inside* the window did have a chance, so it still alerts.
          if (new Date(rule.created_at).getTime() > slotInstantMs(today, t) + grace * 60000) continue;
          const reason = `Jadwal terlewat (${t}) — sudah lewat dari tenggang waktu`;
          const { data: skip } = await svc.from("post_run").insert({
            channel_id: channel.id, rule_id: rule.id, status: "skipped", trigger: "scheduled",
            scheduled_at: nowWib.toISOString(), claim_key: claimKey, attempt_count: 0, fail_reason: reason,
          }).select("id").maybeSingle();
          if (skip) {
            await svc.from("post_attempt").insert({ run_id: skip.id, outcome: reason, is_fail: true });
            await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "warn",
              title: `Jadwal terlewat — ${channel.handle || channel.slug}`, body: `Jadwal “${rule.name}” jam ${t} tidak sempat terbit dalam tenggang waktu.`, runId: skip.id });
            fired.push({ rule: rule.name, channel: channel.slug, at: t, missed: true });
          }
        }
        continue;
      }

      if (overBudget()) break; // out of budget this tick; still-due slots retry next minute (within grace)
      // A "swap today" override seeds one chosen image; apply it to the earliest slot only.
      const useSwap = ov?.type === "swap" && si === 0;
      try {
        const res = await publishForRule(svc, { channel, rule, role, trigger: useSwap ? "swap" : "scheduled", claimKey, scheduledAtISO: new Date().toISOString(), forceImageId: useSwap ? ov.swap_image_id : undefined });
        if (res.skipped) continue;
        fired.push({ rule: rule.name, channel: channel.slug, at: t, ok: res.ok, error: res.error, permalink: res.permalink });
      } catch (e) {
        fired.push({ rule: rule.name, channel: channel.slug, at: t, ok: false, error: String(e?.message || e) });
      }
    }
  }
  // ---- resume videos whose IG container was still transcoding last tick ----
  // Covers both one-offs (scheduled_post_id set) and recurring-rule Stories
  // (rule_id set). Created within the stale window so the sweep above hasn't
  // failed them yet.
  const resumed = [];
  try {
    const { data: pending = [] } = due("resume_runs") ? await svc.from("post_run")
      .select("id, channel_id, scheduled_post_id, rule_id, image_id, ig_media_id")
      .eq("status", "publishing").not("ig_media_id", "is", null)
      .gte("created_at", staleIso) : { data: [] };
    for (const run of pending || []) {
      if (overBudget()) break;
      const { data: ch } = await svc.from("channel").select("id, owner_id, slug, handle, platform, ig_user_id, access_token, refresh_token, token_expires_at").eq("id", run.channel_id).maybeSingle();
      if (!ch) continue;
      try {
        // Recurring-rule Story: no scheduled_post row, resume from the pool path.
        if (!run.scheduled_post_id) {
          if (!run.rule_id) continue;
          const res = await resumeRuleStory(svc, { channel: ch, run });
          resumed.push({ rule: run.rule_id, type: "story", ok: res.ok, processing: res.processing, error: res.error });
          continue;
        }
        const { data: post } = await svc.from("scheduled_post").select("id, post_type, first_comment, cover_path").eq("id", run.scheduled_post_id).maybeSingle();
        if (!post) continue;
        const res = ch.platform === "tiktok"
          ? await resumeTikTokVideo(svc, { channel: ch, post, run })
          : await resumeOneoffContainer(svc, { channel: ch, post, run });
        resumed.push({ oneoff: post.id, type: post.post_type, ok: res.ok, processing: res.processing, error: res.error });
      } catch (e) { resumed.push({ run: run.id, ok: false, error: String(e?.message || e) }); }
    }
  } catch (_) { /* resume is best-effort; stale-sweep is the backstop */ }

  // ---- one-off posts (Story / Feed / Reels) due now, on eligible channels ----
  const oneoffs = [];
  const chIds = Object.keys(chById);
  if (chIds.length && due("due_posts")) {
    const { data: posts = [] } = await svc.from("scheduled_post")
      .select("id, channel_id, post_type, caption, first_comment, scheduled_at, status, cover_offset_ms, cover_path")
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
  if (ttIds.length && due("due_posts")) {
    const { data: posts = [] } = await svc.from("scheduled_post")
      .select("id, channel_id, post_type, caption, scheduled_at, status, tiktok_options, cover_offset_ms")
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
  if (!overBudget() && due("plan_metrics_due")) {
    try { planMetrics = await refreshPlanMetricsDue(svc); } catch (e) { planMetrics = { enabled: true, error: String(e?.message || e) }; }
  }

  // ---- daily follower snapshot for the Ringkasan trend (self-guarding, cheap) ----
  let followers = { snapped: 0 };
  if (!overBudget() && due("followers_due")) {
    try { followers = await snapshotFollowersDue(svc); } catch (e) { followers = { error: String(e?.message || e) }; }
  }

  // ---- per-post metrics auto-pull (post_run) — small cap per tick; Stories have
  // a 20–26h pull window so this runs every tick, not once a day ----
  let runMetrics = { enabled: false };
  if (!overBudget() && due("run_metrics_due")) {
    try { runMetrics = await refreshRunMetricsDue(svc, { limit: 4 }); } catch (e) { runMetrics = { enabled: true, error: String(e?.message || e) }; }
  }

  // ---- Hari Spesial: daily API sync + H-7/H-1 reminders (self-guarding) ----
  // Reminders wait until 08:00 WIB so the Telegram ping lands at a humane hour.
  let specialDays = {};
  if (!overBudget() && due("special_sync_due")) {
    try { specialDays.sync = await syncSpecialDaysDue(svc); } catch (e) { specialDays.sync = { error: String(e?.message || e) }; }
  }
  if (!overBudget() && nowWib.getUTCHours() >= 8 && due("special_reminder_due")) {
    try { specialDays.reminders = await specialDayRemindersDue(svc); } catch (e) { specialDays.reminders = { error: String(e?.message || e) }; }
  }

  return NextResponse.json({ ok: true, at: nowWib.toISOString(), ms: Date.now() - startMs, plan, refreshed, fired, expired, resumed, oneoffs, tiktoks, planMetrics, runMetrics, followers, specialDays });
}

// allow GET for a quick manual ping/health (still secret-gated)
export const GET = POST;
