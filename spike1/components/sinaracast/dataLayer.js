"use client";
// Loads real data from Supabase and maps it to the shapes the SinaraCast
// components expect. access_token is NEVER selected here — it stays
// server/worker-only (schema §7).
import { supabase } from "./supabaseClient";

const STATUS = { connected: "Connected", expiring: "Expiring", needs_reconnect: "Needs reconnect" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtDate = (iso) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtFollowers = (n) => { if (n == null) return "—"; return n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "rb" : String(n); };
const pad2 = (n) => String(n).padStart(2, "0");
const toWib = (iso) => new Date(new Date(iso).getTime() + 7 * 3600 * 1000); // shift so getUTC* reads WIB
const fmtDateTimeWib = (iso) => { if (!iso) return "—"; const d = toWib(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`; };
const fmtTimeWib = (iso) => { if (!iso) return ""; const d = toWib(iso); return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`; };
const dateKeyWib = (iso) => { if (!iso) return ""; const d = toWib(iso); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
const fmtNotifTime = (iso) => {
  if (!iso) return "";
  const d = toWib(iso), now = toWib(new Date().toISOString());
  const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  const dayDiff = Math.round((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / 86400000);
  if (dayDiff === 0) return `Hari ini, ${hm}`;
  if (dayDiff === 1) return `Kemarin, ${hm}`;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hm}`;
};
// Next scheduled run for an active rule, as a friendly WIB label. Mirrors the
// engine's fire logic (JS day-of-week 0=Sun; every_n_days anchored on created_at).
const WD_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const ruleFiresOn = (rule, Y, M, day) => {
  const jsDow = new Date(Date.UTC(Y, M, day)).getUTCDay();
  if (rule.cadence_type === "daily") return true;
  if (rule.cadence_type === "weekdays") return Array.isArray(rule.weekdays) && rule.weekdays.includes(jsDow);
  if (rule.cadence_type === "every_n_days") {
    const n = rule.interval_days || 2;
    if (!rule.created_at) return false;
    const anchor = toWib(rule.created_at);
    const a = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const diff = Math.round((Date.UTC(Y, M, day) - a) / 86400000);
    return diff >= 0 && diff % n === 0;
  }
  return false;
};
// All posting times ("HH:MM", deduped, sorted) for a rule on a given weekday. Reads
// the *_times arrays, falling back to the legacy single time column when empty.
const ruleTimesFor = (rule, jsDow) => {
  const weekend = jsDow === 0 || jsDow === 6;
  const arr = rule.mode !== "schedule" ? rule.post_times : (weekend ? rule.weekend_times : rule.weekday_times);
  const single = rule.mode !== "schedule" ? rule.post_time : (weekend ? rule.weekend_time : rule.weekday_time);
  const raw = (Array.isArray(arr) && arr.length) ? arr : (single ? [single] : []);
  const norm = raw.map((t) => (t || "").slice(0, 5)).filter((t) => /^\d{2}:\d{2}$/.test(t));
  return [...new Set(norm)].sort();
};
const nextRunLabel = (rule) => {
  const now = toWib(new Date().toISOString());
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (let i = 0; i < 366; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const Y = d.getUTCFullYear(), M = d.getUTCMonth(), day = d.getUTCDate(), jsDow = d.getUTCDay();
    if (!ruleFiresOn(rule, Y, M, day)) continue;
    // Soonest upcoming slot: today skips times already passed; later days take the first.
    const hhmm = ruleTimesFor(rule, jsDow).find((t) => {
      if (i > 0) return true;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m > nowMin;
    });
    if (!hhmm) continue;
    if (i === 0) return `Hari ini, ${hhmm} WIB`;
    if (i === 1) return `Besok, ${hhmm} WIB`;
    return `${WD_SHORT[jsDow]}, ${day} ${MONTHS[M]} · ${hhmm} WIB`;
  }
  return "Belum dijadwalkan";
};
const cadenceLabel = (r) => {
  if (r.cadence_type === "daily") return "Setiap hari";
  if (r.cadence_type === "every_n_days") return `Setiap ${r.interval_days || 2} hari`;
  if (r.cadence_type === "weekdays") {
    const names = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    return (r.weekdays || []).map((d) => names[d]).join(", ") || "Hari tertentu";
  }
  return "—";
};

function mapChannel(c) {
  return {
    id: c.slug, brand: c.slug, name: c.name, handle: c.handle,
    platform: c.platform || "instagram",
    status: STATUS[c.token_status] || "Needs reconnect",
    tokenExpires: c.token_status === "needs_reconnect" ? "Kedaluwarsa" : fmtDate(c.token_expires_at),
    lastRefresh: c.last_refresh_at ? fmtDate(c.last_refresh_at) : "—",
    paused: c.paused, resumeDate: c.resume_date ? fmtDate(c.resume_date) : "",
    followers: fmtFollowers(c.followers),
    avatarUrl: c.avatar_url || null,
    brandId: c.brand_id || null,
    aiPersona: c.ai_persona || null, // karakter AI caption per akun
    _id: c.id,
  };
}

function mapRule(r, slugById) {
  const isSched = r.mode === "schedule";
  // Posting times per daypart ("HH:MM"), array-first with legacy single-time fallback.
  const weekdayTimes = ruleTimesFor(r, 1); // any weekday
  const weekendTimes = ruleTimesFor(r, 0); // any weekend day
  const postTimes = ruleTimesFor(r, 1);    // pool mode: same list every fire day
  const repTimes = isSched ? weekdayTimes : postTimes;
  return {
    id: r.id, ch: slugById[r.channel_id] || "", name: r.name, mode: r.mode, active: r.active,
    cadence: cadenceLabel(r), time: repTimes[0] || "—", timesCount: repTimes.length,
    grace: r.grace_minutes,
    // raw scheduling fields for the calendar projection
    cadenceType: r.cadence_type, intervalDays: r.interval_days, weekdaysDb: r.weekdays || [], createdAt: r.created_at,
    weekdayTimes, weekendTimes, postTimes,
    weekdayTime: weekdayTimes[0] || "", weekendTime: weekendTimes[0] || "", postTime: postTimes[0] || "",
    pools: isSched ? { weekday: 0, weekend: 0 } : { pool: 0 }, // counts filled below if pools loaded
    cycle: { used: 0, total: 0 }, nextRun: r.active ? nextRunLabel(r) : "Nonaktif",
    todayStatus: r.active ? "Scheduled" : "Inactive", lastImg: 0, runs7: [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function loadAll() {
  // Fire every independent read in parallel. allSettled (not all) so a single
  // failed query can NEVER blank the whole app — each just falls back to empty.
  const results = await Promise.allSettled([
    supabase.from("channel").select("id, slug, name, handle, platform, brand_id, token_status, token_expires_at, last_refresh_at, paused, resume_date, followers, color_token, avatar_url, ai_persona").is("archived_at", null).order("created_at", { ascending: true }),
    supabase.from("recurring_rule").select("*").is("archived_at", null),
    supabase.from("pool").select("id, rule_id, role"),
    supabase.from("pool_image").select("id, pool_id, used_in_cycle, storage_path, position, bytes").order("position"),
    supabase.from("media_asset").select("id, channel_id, storage_path, tag, created_at").order("created_at", { ascending: false }),
    supabase.from("post_run").select("id, channel_id, rule_id, scheduled_post_id, pool_role, image_id, status, trigger, scheduled_at, published_at, permalink, fail_reason, created_at, m_views, m_reach, m_likes, m_comments, m_shares, m_saves, m_replies, metrics_pulled_at").order("created_at", { ascending: false }).limit(150),
    supabase.from("scheduled_post").select("id, channel_id, post_type, caption, scheduled_at, status").not("scheduled_at", "is", null),
    supabase.from("notification").select("id, channel_id, type, title, body, run_id, read, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("app_settings").select("*").maybeSingle(),
    supabase.from("app_user").select("*").maybeSingle(),
    supabase.from("content_plan").select("id, brand_id, channel_id, platform, planned_date, planned_time, title, content_type, pillar, format, goal, status, source, scheduled_post_id, recurring_rule_id, auto_managed, post_link, posted_at, m_views, m_likes, m_comments, m_shares, m_saves, m_reach, metrics_source, metrics_updated_at").order("planned_date", { ascending: true }),
    supabase.from("brand").select("id, name, avatar_emoji, color_token, created_at").order("created_at", { ascending: true }),
    supabase.from("follower_snapshot").select("channel_id, snap_date, followers").order("snap_date", { ascending: true }).limit(2000),
    supabase.from("special_day").select("id, on_date, name, category, is_active, source, user_touched").order("on_date", { ascending: true }),
    supabase.from("idea_bank").select("id, brand_id, channel_id, kind, title, note, url, image_url, tags, source, created_at").is("archived_at", null).order("created_at", { ascending: false }),
  ]);
  const at = (i) => (results[i].status === "fulfilled" ? results[i].value?.data : null);
  const channelsRaw = at(0) || [];
  const rulesRaw = at(1) || [];
  const pools = at(2) || [];
  const imgs = at(3) || [];
  const assetsRaw = at(4) || [];
  const runsRaw = at(5) || [];
  const schedRaw = at(6) || [];
  const notifsRaw = at(7) || [];
  const settingsRaw = at(8);
  const profileRaw = at(9);
  const plansRaw = at(10) || [];
  const brandsRaw = at(11) || [];
  const snapsRaw = at(12) || [];
  const specialRaw = at(13) || [];
  const ideasRaw = at(14) || [];

  const slugById = Object.fromEntries((channelsRaw || []).map((c) => [c.id, c.slug]));
  const channels = (channelsRaw || []).map(mapChannel);
  const brandIdByChannelDb = Object.fromEntries((channelsRaw || []).map((c) => [c.id, c.brand_id || null]));

  // Brands (workspaces) each own ≥0 accounts. Accounts carry their mapped channel shape.
  const brands = (brandsRaw || []).map((br) => ({
    id: br.id, name: br.name, avatarEmoji: br.avatar_emoji || null, colorToken: br.color_token || null,
    accounts: channels.filter((c) => c.brandId === br.id),
  }));

  // pools + image counts per rule (for "X gambar" + cycle) + first thumbnail
  const imgByPool = {};
  const firstPathByPool = {};
  const pathsByPool = {};
  const bytesByPool = {};
  const pathById = {}; // pool_image.id → storage_path (for run thumbnails)
  for (const im of imgs || []) {
    const p = (imgByPool[im.pool_id] ||= { total: 0, used: 0 });
    p.total++; if (im.used_in_cycle) p.used++;
    if (!(im.pool_id in firstPathByPool)) firstPathByPool[im.pool_id] = im.storage_path;
    (pathsByPool[im.pool_id] ||= []).push({ id: im.id, storage_path: im.storage_path });
    bytesByPool[im.pool_id] = (bytesByPool[im.pool_id] || 0) + (im.bytes || 0);
    pathById[im.id] = im.storage_path;
  }
  const pubUrl = (sp) => /^https?:\/\//i.test(sp || "") ? sp : supabase.storage.from(BUCKET).getPublicUrl(sp).data.publicUrl;
  const poolsByRule = {};
  for (const p of pools || []) (poolsByRule[p.rule_id] ||= []).push({ ...p, ...(imgByPool[p.id] || { total: 0, used: 0 }) });

  const rules = (rulesRaw || []).map((r) => {
    const base = mapRule(r, slugById);
    base.specialBehavior = r.special_behavior || "normal";
    const rp = poolsByRule[r.id] || [];
    const byRole = Object.fromEntries(rp.map((p) => [p.role, p]));
    if (r.mode === "schedule") base.pools = { weekday: byRole.weekday?.total || 0, weekend: byRole.weekend?.total || 0 };
    else base.pools = { pool: byRole.single?.total || 0 };
    const used = rp.reduce((a, p) => a + p.used, 0);
    const total = rp.reduce((a, p) => a + p.total, 0);
    base.cycle = { used, total };
    // first available image (prefer weekday/single, then any pool) → public thumbnail URL
    const firstPath = rp.map((p) => firstPathByPool[p.id]).find(Boolean);
    base.thumbUrl = firstPath ? pubUrl(firstPath) : null;
    // all pool images tagged by role — used by the swap-image picker
    base.poolImages = rp.flatMap((p) => (pathsByPool[p.id] || []).map((im) => ({ role: p.role, id: im.id, url: pubUrl(im.storage_path) })));
    return base;
  });

  // ---- today's per-rule overrides (skip / swap) ----
  const todayKey = dateKeyWib(new Date().toISOString());
  const ruleIds = (rulesRaw || []).map((r) => r.id);
  if (ruleIds.length) {
    let ovs = [];
    try { ovs = (await supabase.from("day_override").select("rule_id, type, swap_image_id").eq("on_date", todayKey).in("rule_id", ruleIds)).data || []; } catch (_) { /* non-fatal */ }
    const ovByRule = Object.fromEntries((ovs || []).map((o) => [o.rule_id, o]));
    for (const r of rules) {
      const ov = ovByRule[r.id];
      if (!ov) continue;
      r.todayOverride = ov.type; // "skip" | "swap"
      if (ov.type === "skip") { r.todayStatus = "Skipped"; r.nextRun = "Dilewati hari ini"; }
      if (ov.type === "swap" && ov.swap_image_id) {
        const sp = pathById[ov.swap_image_id];
        if (sp) r.thumbUrl = pubUrl(sp);
      }
    }
  }

  // ---- real storage usage (sum of pool_image bytes), per channel + total ----
  const ruleChannelId = Object.fromEntries((rulesRaw || []).map((r) => [r.id, r.channel_id]));
  const bytesByChannel = {}; // slug → bytes
  for (const p of pools || []) {
    const slug = slugById[ruleChannelId[p.rule_id]];
    if (!slug) continue;
    bytesByChannel[slug] = (bytesByChannel[slug] || 0) + (bytesByPool[p.id] || 0);
  }
  const toMB = (b) => Math.round((b / (1024 * 1024)) * 10) / 10;
  const totalBytes = Object.values(bytesByPool).reduce((a, b) => a + b, 0);
  const storage = {
    used: toMB(totalBytes), total: 1024,
    perChannel: Object.fromEntries((channelsRaw || []).map((c) => [c.slug, toMB(bytesByChannel[c.slug] || 0)])),
  };

  // ---- media library per channel (pool images + one-off media_assets) ----
  const mediaByChannel = {}; // slug → [{ id, url, tag, usage }]
  const pushMedia = (slug, item) => { if (!slug) return; (mediaByChannel[slug] ||= []).push(item); };
  for (const r of rulesRaw || []) {
    const slug = slugById[r.channel_id];
    for (const p of (poolsByRule[r.id] || [])) {
      for (const im of (pathsByPool[p.id] || [])) pushMedia(slug, { id: `pool:${im.id}`, url: pubUrl(im.storage_path), tag: r.name, usage: r.name });
    }
  }
  for (const a of assetsRaw || []) {
    const tag = a.tag === "feed" ? "Feed" : a.tag === "story" ? "Story" : a.tag === "reels" ? "Reels" : (a.tag || "Library");
    pushMedia(slugById[a.channel_id], { id: a.id, url: pubUrl(a.storage_path), tag, usage: null });
  }

  // ---- activity: real post_run rows (reverse chronological) + their attempts ----
  const ruleNameById = Object.fromEntries((rulesRaw || []).map((r) => [r.id, r.name]));
  // One-off posts have no rule — label a run by its caption (or type) instead of "(jadwal dihapus)".
  const schedById = Object.fromEntries((schedRaw || []).map((s) => [s.id, s]));
  const oneoffTypeLabel = (s) => s.post_type === "feed" ? "Feed (sekali)" : s.post_type === "reels" ? "Reels (sekali)" : s.post_type === "tiktok_video" ? "Video TikTok (sekali)" : "Story (sekali)";
  const oneoffLabel = (s) => (s.caption && s.caption.trim()) ? s.caption.trim().slice(0, 40) : oneoffTypeLabel(s);
  const POOL_LABEL = { weekday: "Weekday", weekend: "Weekend", single: "Pool" };
  const RUN_STATUS = { published: "Published", failed: "Failed", publishing: "Publishing", pending: "Publishing", skipped: "Skipped" };
  const runIds = (runsRaw || []).map((r) => r.id);
  let attemptsRaw = [];
  if (runIds.length) {
    let res = { data: [] };
    try { res = await supabase.from("post_attempt").select("run_id, at, outcome, is_fail").in("run_id", runIds).order("at", { ascending: true }); } catch (_) { /* non-fatal */ }
    attemptsRaw = res.data || [];
  }
  const attemptsByRun = {};
  for (const a of attemptsRaw) (attemptsByRun[a.run_id] ||= []).push({ t: fmtTimeWib(a.at), o: a.outcome, ...(a.is_fail ? { fail: true } : {}) });
  const runs = (runsRaw || []).map((r) => ({
    id: r.id,
    ch: slugById[r.channel_id] || "",
    ruleId: r.rule_id,
    rule: r.rule_id
      ? (ruleNameById[r.rule_id] || "(jadwal dihapus)")
      : (schedById[r.scheduled_post_id] ? oneoffLabel(schedById[r.scheduled_post_id]) : "Postingan sekali"),
    status: RUN_STATUS[r.status] || r.status,
    trigger: r.trigger,
    sched: fmtDateTimeWib(r.scheduled_at),
    actual: r.published_at ? fmtDateTimeWib(r.published_at) : "—",
    dateWib: dateKeyWib(r.published_at || r.scheduled_at || r.created_at),
    img: 0,
    thumbUrl: r.image_id && pathById[r.image_id] ? pubUrl(pathById[r.image_id]) : null,
    pool: POOL_LABEL[r.pool_role] || "Pool",
    fail: r.fail_reason || (r.status === "failed" ? "Gagal menerbitkan" : null),
    link: r.permalink ? r.permalink.replace(/^https?:\/\//, "") : null,
    attempts: attemptsByRun[r.id] || [{ t: fmtTimeWib(r.created_at), o: "Menunggu…" }],
    // content kind + auto-pulled IG metrics (Ringkasan "Performa per konten")
    kind: r.rule_id ? "story" : (schedById[r.scheduled_post_id]?.post_type || "story"),
    m: { views: r.m_views, reach: r.m_reach, likes: r.m_likes, comments: r.m_comments, shares: r.m_shares, saves: r.m_saves, replies: r.m_replies },
    hasMetrics: [r.m_views, r.m_reach, r.m_likes, r.m_comments, r.m_shares, r.m_saves, r.m_replies].some((v) => v != null),
    metricsPulledAt: r.metrics_pulled_at || null,
  }));

  // ---- calendar: real one-off scheduled posts ----
  const SCHED_STATUS = { draft: "Draft", scheduled: "Scheduled", publishing: "Publishing", published: "Published", failed: "Failed", canceled: "Skipped" };
  const oneoffs = (schedRaw || []).map((s) => {
    const d = toWib(s.scheduled_at);
    return {
      id: s.id, ch: slugById[s.channel_id] || "", day: d.getUTCDate(),
      ym: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`,
      type: s.post_type === "feed" ? "Feed" : s.post_type === "reels" ? "Reels" : s.post_type === "tiktok_video" ? "TikTok" : "Story",
      title: s.caption ? s.caption.slice(0, 40) : (s.post_type === "feed" ? "Feed post" : s.post_type === "tiktok_video" ? "Video TikTok" : "Story"),
      time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
      status: SCHED_STATUS[s.status] || "Scheduled",
    };
  });

  // ---- content planner entries (content_plan) ----
  // planned_date is a pure WIB calendar date ('YYYY-MM-DD'); no tz shift needed.
  const PLAN_ST_UI = { idea: "Ide", draft: "Draf", review: "Review", approved: "Disetujui", revision: "Revisi", ready: "Siap", posted: "Posted" };
  const plans = (plansRaw || []).map((p) => {
    const D = p.planned_date ? parseInt(p.planned_date.slice(8, 10), 10) : null;
    return {
      id: p.id, ch: p.channel_id ? (slugById[p.channel_id] || "") : "", _channelId: p.channel_id || null,
      brandId: p.brand_id || null,
      platform: p.platform, plannedDate: p.planned_date || "",
      plannedTime: (p.planned_time || "").slice(0, 5),
      ym: p.planned_date ? p.planned_date.slice(0, 7) : "", day: D,
      title: p.title || "", contentType: p.content_type || "", pillar: p.pillar || "",
      format: p.format || "", goal: p.goal || "",
      status: p.status, statusUi: PLAN_ST_UI[p.status] || p.status,
      source: p.source, scheduledPostId: p.scheduled_post_id || null, recurringRuleId: p.recurring_rule_id || null,
      linked: p.source !== "manual", autoManaged: !!p.auto_managed, postLink: p.post_link || "", postedAt: p.posted_at,
      metricsSource: p.metrics_source, metricsUpdatedAt: p.metrics_updated_at,
      m: { views: p.m_views, likes: p.m_likes, comments: p.m_comments, shares: p.m_shares, saves: p.m_saves, reach: p.m_reach },
    };
  });

  // ---- in-app notifications (alerts mirror) ----
  const notifs = (notifsRaw || []).map((n) => ({
    id: n.id, type: n.type, ch: n.channel_id ? slugById[n.channel_id] || null : null,
    title: n.title, body: n.body, runId: n.run_id, read: n.read, time: fmtNotifTime(n.created_at),
  }));

  const settings = {
    pauseAll: settingsRaw?.pause_all ?? false,
    resumeDate: settingsRaw?.resume_date ? fmtDate(settingsRaw.resume_date) : "",
    timezone: "Asia/Jakarta (WIB, UTC+7)",
    defaultGrace: settingsRaw?.default_grace ?? 30,
    telegram: { connected: settingsRaw?.telegram_connected ?? false, handle: settingsRaw?.telegram_handle || "" },
    failAlerts: settingsRaw?.fail_alerts ?? true,
    dailyPing: settingsRaw?.daily_ping ?? true,
    specialReminders: settingsRaw?.special_reminders ?? true,
    storage,
  };

  // The email you're actually signed in with (source of truth = the auth session),
  // so a wrong-account login is obvious instead of showing empty data silently.
  let authEmail = "";
  try { const { data: sess } = await supabase.auth.getSession(); authEmail = sess?.session?.user?.email || ""; } catch (_) { /* non-fatal */ }
  const profile = {
    name: profileRaw?.name || (authEmail ? authEmail.split("@")[0] : "Kamu"),
    email: profileRaw?.email || authEmail,
    method: "Kode lewat email",
    joined: profileRaw?.joined_at ? fmtDate(profileRaw.joined_at) : "—",
  };

  // ---- follower trend per account (slug → [{date, followers}]) ----
  const followerSeries = {};
  for (const s of snapsRaw || []) {
    const slug = slugById[s.channel_id];
    if (!slug) continue;
    (followerSeries[slug] ||= []).push({ date: s.snap_date, followers: s.followers });
  }

  // ---- Hari Spesial calendar (special_day) ----
  const specialDays = (specialRaw || []).map((s) => ({
    id: s.id, date: s.on_date, name: s.name, category: s.category,
    active: s.is_active, source: s.source, touched: s.user_touched,
  }));

  // ---- Bank Ide & Referensi (idea_bank) ----
  const ideas = (ideasRaw || []).map((i) => ({
    id: i.id, brandId: i.brand_id || null, channelId: i.channel_id || null,
    kind: i.kind || "idea", title: i.title || "", note: i.note || "",
    url: i.url || "", imageUrl: i.image_url || "", tags: i.tags || [], source: i.source || "",
    createdAt: i.created_at,
  }));

  return { channels, brands, rules, runs, oneoffs, plans, notifs, settings, profile, library: mediaByChannel, followerSeries, specialDays, ideas };
}

// ============================================================
// Content Planner (content_plan) — CRUD. v1: planning layer only;
// the hybrid auto-publish link (scheduled_post/rule) is wired in a later step.
// ============================================================
const planNum = (v) => { if (v === "" || v == null) return null; const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

// Map the editor's field state → a content_plan row (insert/update share this).
function planRow(p, ownerId) {
  const row = {
    platform: p.platform, planned_date: p.plannedDate, planned_time: p.plannedTime || null,
    title: p.title?.trim() || null, content_type: p.contentType?.trim() || null, pillar: p.pillar?.trim() || null,
    format: p.format || null, goal: p.goal || null,
    hook: p.hook?.trim() || null, caption: p.caption?.trim() || null, notes: p.notes?.trim() || null, script: p.script?.trim() || null,
    reference_url: p.referenceUrl?.trim() || null, brief_url: p.briefUrl?.trim() || null, design_url: p.designUrl?.trim() || null,
    status: p.status, post_link: p.postLink?.trim() || null,
    posted_at: p.status === "posted" ? (p.postedAt || new Date().toISOString()) : null,
  };
  // Only touch metric columns when the editor supplied manual values. When metrics
  // are engine-owned (auto_ig), the editor passes m=null → leave them untouched.
  if (p.m) {
    const metrics = { m_views: planNum(p.m.views), m_likes: planNum(p.m.likes), m_comments: planNum(p.m.comments), m_shares: planNum(p.m.shares), m_saves: planNum(p.m.saves), m_reach: planNum(p.m.reach) };
    const hasMetric = Object.values(metrics).some((v) => v != null);
    Object.assign(row, metrics);
    row.metrics_source = p.status === "posted" && hasMetric ? "manual" : "none";
    row.metrics_updated_at = p.status === "posted" && hasMetric ? new Date().toISOString() : null;
  }
  row.brand_id = p.brandDbId || null;
  row.channel_id = p.channelDbId || null; // specific account (IG auto-publish target); null for plan-only
  if (ownerId) row.owner_id = ownerId;
  return row;
}

export async function loadContentPlan(id) {
  const { data, error } = await supabase.from("content_plan").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createContentPlan(p) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await supabase.from("content_plan").insert(planRow(p, uid)).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateContentPlan(id, p) {
  // planRow already carries brand_id + channel_id; owner_id stays immutable.
  const { error } = await supabase.from("content_plan").update(planRow(p, null)).eq("id", id);
  if (error) throw error;
  return id;
}

export async function deleteContentPlan(id) {
  const { error } = await supabase.from("content_plan").delete().eq("id", id);
  if (error) throw error;
}

// Simpan banyak entri rencana sekaligus (hasil "Buatkan ide dengan AI"). Tiap item
// minimal punya platform + plannedDate; sisanya opsional (title/pillar/format/goal/…).
export async function createContentPlansBatch(items) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const rows = items.map((p) => planRow(p, uid));
  const { data, error } = await supabase.from("content_plan").insert(rows).select("id");
  if (error) throw error;
  return (data || []).map((r) => r.id);
}

// ============================================================
// Bank Ide & Referensi (idea_bank) — CRUD.
// ============================================================
function ideaRow(i, ownerId) {
  const row = {
    brand_id: i.brandId || null, channel_id: i.channelId || null,
    kind: i.kind || "idea",
    title: i.title?.trim() || null, note: i.note?.trim() || null,
    url: i.url?.trim() || null, image_url: i.imageUrl?.trim() || null,
    tags: Array.isArray(i.tags) ? i.tags.map((t) => t.trim()).filter(Boolean) : null,
    source: i.source?.trim() || null,
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}

export async function createIdea(i) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await supabase.from("idea_bank").insert(ideaRow(i, uid)).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateIdea(id, i) {
  const { error } = await supabase.from("idea_bank").update(ideaRow(i, null)).eq("id", id);
  if (error) throw error;
  return id;
}

// Soft-delete (arsipkan) supaya bisa dipulihkan bila perlu; hilang dari daftar.
export async function deleteIdea(id) {
  const { error } = await supabase.from("idea_bank").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// Adapt-to-platform (clone a plan as a sibling for another platform/account of the
// same brand). Copies the creative fields; resets automation + status to a fresh idea.
export async function adaptContentPlan(sourceId, { platform, channelDbId = null }) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data: src, error: e1 } = await supabase.from("content_plan").select("*").eq("id", sourceId).single();
  if (e1) throw e1;
  const { data, error } = await supabase.from("content_plan").insert({
    owner_id: uid, brand_id: src.brand_id, channel_id: channelDbId, platform,
    planned_date: src.planned_date, planned_time: src.planned_time,
    title: src.title, content_type: src.content_type, pillar: src.pillar, format: src.format, goal: src.goal,
    hook: src.hook, caption: src.caption, notes: src.notes,
    reference_url: src.reference_url, brief_url: src.brief_url, design_url: src.design_url,
    status: "idea", source: "manual", auto_managed: false, metrics_source: "none",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

// ---- Brand (workspace) CRUD ----
export async function createBrand(name) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await supabase.from("brand").insert({ owner_id: uid, name: (name || "Brand baru").trim() }).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function renameBrand(id, name) {
  const { error } = await supabase.from("brand").update({ name: (name || "").trim() }).eq("id", id);
  if (error) throw error;
}
// Move an account (channel) into a brand (or detach with brandId=null).
export async function setChannelBrand(channelDbId, brandId) {
  const { error } = await supabase.from("channel").update({ brand_id: brandId }).eq("id", channelDbId);
  if (error) throw error;
}
// Simpan karakter (persona) AI caption untuk satu akun. persona = objek jsonb
// (lihat migrasi 2026-07-14-channel-ai-persona). null menghapus persona.
export async function updateChannelPersona(channelDbId, persona) {
  const { error } = await supabase.from("channel").update({ ai_persona: persona }).eq("id", channelDbId);
  if (error) throw error;
}
// Delete a brand. Accounts detach (channel.brand_id → null via FK); plans cascade.
export async function deleteBrand(id) {
  const { error } = await supabase.from("brand").delete().eq("id", id);
  if (error) throw error;
}

// ---- hybrid auto-publish link (FR-46, Instagram only) ----
// Linking marks the plan auto-managed + moves it to 'ready' (queued). The engine
// flips it to 'posted' + fills the link on publish success (wired in a later step).
export async function linkPlanToOneoff(planId, scheduledPostId) {
  const { error } = await supabase.from("content_plan").update({
    scheduled_post_id: scheduledPostId, recurring_rule_id: null, source: "linked_oneoff", auto_managed: true, status: "ready",
  }).eq("id", planId).neq("status", "posted");
  if (error) throw error;
}
export async function linkPlanToRule(planId, ruleId) {
  const { error } = await supabase.from("content_plan").update({
    recurring_rule_id: ruleId, scheduled_post_id: null, source: "linked_rule", auto_managed: true, status: "ready",
  }).eq("id", planId).neq("status", "posted");
  if (error) throw error;
}
// Reversible before publish: revert to manual tracking, keep all other fields.
export async function unlinkPlan(planId) {
  const { error } = await supabase.from("content_plan").update({
    scheduled_post_id: null, recurring_rule_id: null, source: "manual", auto_managed: false,
  }).eq("id", planId);
  if (error) throw error;
}

// Upload an image to a channel's media library (media_asset, tag 'library').
export async function uploadLibraryMedia(file, channelSlug, channelDbId, meta) {
  const row = await uploadPoolImage(file, channelSlug, meta); // → storage
  const { data: a, error } = await supabase.from("media_asset").insert({
    channel_id: channelDbId, storage_path: row.storage_path, tag: "library",
    width: row.width, height: row.height, aspect_ok: row.aspect_ok ?? true, format: row.format, bytes: row.bytes,
  }).select("id").single();
  if (error) throw error;
  return a.id;
}

// Per-day rule override (skip today / swap today's image). Upsert by (rule_id, on_date).
// dateWib is "YYYY-MM-DD" (WIB). type = "skip" | "swap"; swapImageId for swap.
export async function setDayOverride(ruleId, dateWib, type, swapImageId = null) {
  const { error } = await supabase.from("day_override")
    .upsert({ rule_id: ruleId, on_date: dateWib, type, swap_image_id: type === "swap" ? swapImageId : null }, { onConflict: "rule_id,on_date" });
  if (error) throw error;
}
export async function clearDayOverride(ruleId, dateWib) {
  const { error } = await supabase.from("day_override").delete().eq("rule_id", ruleId).eq("on_date", dateWib);
  if (error) throw error;
}
export const todayWibKey = () => dateKeyWib(new Date().toISOString());

// Rename a channel's display name.
export async function renameChannel(id, name) {
  const { error } = await supabase.from("channel").update({ name }).eq("id", id);
  if (error) throw error;
}

// Archive a channel: hides it from the app and stops the cron firing its rules
// (loadAll + the engine both filter archived_at IS NULL). Non-destructive.
export async function archiveChannel(id) {
  const { error } = await supabase.from("channel").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// Delete ALL of the user's content — every channel (cascades rules, pools,
// images, runs, media_assets, scheduled_posts) + notifications. RLS scopes the
// deletes to the signed-in owner. Account + app_settings preferences are kept.
export async function deleteAllData() {
  let { error } = await supabase.from("content_plan").delete().not("id", "is", null);
  if (error) throw error;
  ({ error } = await supabase.from("channel").delete().not("id", "is", null));
  if (error) throw error;
  ({ error } = await supabase.from("brand").delete().not("id", "is", null));
  if (error) throw error;
  ({ error } = await supabase.from("notification").delete().not("id", "is", null));
  if (error) throw error;
}

// Mark one / all notifications read (RLS scopes these to the signed-in owner).
export async function markNotifRead(id) {
  const { error } = await supabase.from("notification").update({ read: true }).eq("id", id);
  if (error) throw error;
}
export async function markAllNotifsRead() {
  const { error } = await supabase.from("notification").update({ read: true }).eq("read", false);
  if (error) throw error;
}

// ---- writes ----

const BUCKET = "pool-images";

// Upload one validated image file to Storage; returns row data for pool_image.
export async function uploadPoolImage(file, channelSlug, meta) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${uid}/${channelSlug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { storage_path: path, url, bytes: file.size, format: ext, width: meta?.width, height: meta?.height, aspect_ok: true };
}

// Upload a Reels video (mp4/mov) to the same public bucket; returns row data
// shaped like uploadPoolImage so createScheduledPost can make the media_asset.
// Supabase free tier caps a file at 50 MB. Bigger videos detour to Cloudflare R2
// via a presigned direct upload; their storage_path is then the absolute R2 URL
// (every consumer passes absolute URLs through untouched).
const SUPA_MAX_BYTES = 48 * 1024 * 1024;

export async function uploadReelVideo(file, channelSlug, meta) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  // file.type can be blank for a .MOV picked from iOS Files — fall back to the
  // filename so the bucket's allowed-mime check and the stored extension stay right.
  const isMov = file.type === "video/quicktime" || /\.mov$/i.test(file.name || "");
  const ext = isMov ? "mov" : "mp4";
  const contentType = file.type || (isMov ? "video/quicktime" : "video/mp4");
  const base = { bytes: file.size, format: ext, width: meta?.width, height: meta?.height, aspect_ok: true, isVideo: true };

  if (file.size > SUPA_MAX_BYTES) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    const res = await fetch("/api/r2/presign", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ext }),
    });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.error || "Penyimpanan video besar belum siap");
    const up = await fetch(j.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
    if (!up.ok) throw new Error("Gagal mengunggah video besar (cek konfigurasi CORS bucket R2)");
    return { ...base, storage_path: j.publicUrl, url: j.publicUrl };
  }

  const path = `${uid}/${channelSlug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { ...base, storage_path: path, url };
}

export async function deleteStoredImage(storage_path) {
  if (!storage_path) return;
  // R2-hosted media (absolute URL) is cleaned up server-side after publish.
  if (/^https?:\/\//i.test(storage_path)) return;
  await supabase.storage.from(BUCKET).remove([storage_path]);
}

// Create a recurring_rule + its pool(s) + pool_image rows. `images` is
// { weekday:[], weekend:[] } for schedule or { single:[] } for pool.
// Stories posted per run, per pool role. 1..5 (IG Stories have no carousel, so >1
// publishes as separate Story frames back-to-back). Default 1.
const clampCount = (n) => Math.max(1, Math.min(5, Math.round(Number(n) || 1)));
// Normalize a list of "HH:MM" posting times: keep valid ones, dedupe, sort. Falls
// back to a single 08:00 slot so a rule always has at least one time.
const normTimes = (arr) => {
  const norm = (Array.isArray(arr) ? arr : []).map((t) => (t || "").slice(0, 5)).filter((t) => /^\d{2}:\d{2}$/.test(t));
  const uniq = [...new Set(norm)].sort();
  return uniq.length ? uniq : ["08:00"];
};

export async function createRuleWithPools(p) {
  const { data: rule, error: e1 } = await supabase.from("recurring_rule").insert({
    channel_id: p.channelDbId, name: p.name, mode: p.mode, active: true,
    cadence_type: p.cadenceType, interval_days: p.intervalDays ?? null, weekdays: p.weekdaysDb ?? null,
    // Multiple posting times per day. Legacy single-time columns mirror the first slot
    // so older readers still work.
    post_times:    p.mode === "pool" ? normTimes(p.postTimes) : null,
    weekday_times: p.mode === "schedule" ? normTimes(p.weekdayTimes) : null,
    weekend_times: p.mode === "schedule" ? normTimes(p.weekendTimes) : null,
    post_time:    p.mode === "pool" ? (normTimes(p.postTimes)[0] || null) : null,
    weekday_time: p.mode === "schedule" ? (normTimes(p.weekdayTimes)[0] || null) : null,
    weekend_time: p.mode === "schedule" ? (normTimes(p.weekendTimes)[0] || null) : null,
    grace_minutes: p.grace,
    special_behavior: p.specialBehavior || "normal",
  }).select("id").single();
  if (e1) throw e1;

  const roles = p.mode === "schedule" ? ["weekday", "weekend"] : ["single"];
  // 'special' pool exists when the rule posts special content on special days
  // (or when special images were already uploaded before the behavior switch).
  if (p.specialBehavior === "special_pool" || (p.images?.special || []).length) roles.push("special");
  for (const role of roles) {
    const { data: pool, error: e2 } = await supabase.from("pool")
      .insert({ rule_id: rule.id, role, story_count: clampCount(p.counts?.[role]) }).select("id").single();
    if (e2) throw e2;
    const imgs = (p.images?.[role] || []).map((im, i) => ({
      pool_id: pool.id, storage_path: im.storage_path, position: i,
      width: im.width, height: im.height, aspect_ok: im.aspect_ok ?? true,
      format: im.format, bytes: im.bytes,
    }));
    if (imgs.length) {
      const { error: e3 } = await supabase.from("pool_image").insert(imgs);
      if (e3) throw e3;
    }
  }
  return rule.id;
}

// Create a one-off scheduled_post + its media_asset rows + links.
// images: [{ storage_path, width, height, format, bytes, aspect_ok }] (already uploaded).
// status: "scheduled" (cron will publish Story posts when due) or "draft".
export async function createScheduledPost(p) {
  const assetIds = [];
  for (const im of (p.images || [])) {
    const { data: a, error: ea } = await supabase.from("media_asset").insert({
      channel_id: p.channelDbId, storage_path: im.storage_path, tag: p.postType,
      width: im.width, height: im.height, aspect_ok: im.aspect_ok ?? true, format: im.format, bytes: im.bytes,
    }).select("id").single();
    if (ea) throw ea;
    assetIds.push(a.id);
  }
  const { data: post, error: ep } = await supabase.from("scheduled_post").insert({
    channel_id: p.channelDbId, post_type: p.postType, caption: p.caption || null,
    first_comment: p.firstComment || null, scheduled_at: p.scheduledAtISO || null, status: p.status,
    ...(p.tiktokOptions ? { tiktok_options: p.tiktokOptions } : {}),
  }).select("id").single();
  if (ep) throw ep;
  for (let i = 0; i < assetIds.length; i++) {
    const { error: em } = await supabase.from("scheduled_post_media").insert({ post_id: post.id, asset_id: assetIds[i], position: i });
    if (em) throw em;
  }
  return post.id;
}

// Load a one-off scheduled_post + its media (for editing in the composer).
export async function loadScheduledPost(id) {
  const { data: post } = await supabase.from("scheduled_post").select("*").eq("id", id).single();
  const { data: links = [] } = await supabase.from("scheduled_post_media").select("asset_id, position").eq("post_id", id).order("position");
  const assetIds = (links || []).map((l) => l.asset_id);
  let assets = [];
  if (assetIds.length) {
    const res = await supabase.from("media_asset").select("id, storage_path, width, height, format, bytes").in("id", assetIds);
    assets = res.data || [];
  }
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const media = (links || []).map((l) => {
    const a = byId[l.asset_id];
    return a ? { assetId: a.id, storage_path: a.storage_path, url: /^https?:\/\//i.test(a.storage_path || "") ? a.storage_path : supabase.storage.from(BUCKET).getPublicUrl(a.storage_path).data.publicUrl, width: a.width, height: a.height, format: a.format, bytes: a.bytes } : null;
  }).filter(Boolean);
  return { post, media };
}

// Update a one-off scheduled_post incl. media (full replace of media links).
// images entries already in DB carry `assetId`; freshly uploaded ones don't.
export async function updateScheduledPost(id, p) {
  const finalAssetIds = [];
  for (const im of (p.images || [])) {
    if (im.assetId) { finalAssetIds.push(im.assetId); continue; }
    const { data: a, error } = await supabase.from("media_asset").insert({
      channel_id: p.channelDbId, storage_path: im.storage_path, tag: p.postType,
      width: im.width, height: im.height, aspect_ok: im.aspect_ok ?? true, format: im.format, bytes: im.bytes,
    }).select("id").single();
    if (error) throw error;
    finalAssetIds.push(a.id);
  }
  const { error: eu } = await supabase.from("scheduled_post").update({
    post_type: p.postType, caption: p.caption || null, first_comment: p.firstComment || null,
    scheduled_at: p.scheduledAtISO || null, status: p.status,
    ...(p.tiktokOptions ? { tiktok_options: p.tiktokOptions } : {}),
  }).eq("id", id);
  if (eu) throw eu;
  await supabase.from("scheduled_post_media").delete().eq("post_id", id);
  for (let i = 0; i < finalAssetIds.length; i++) {
    const { error } = await supabase.from("scheduled_post_media").insert({ post_id: id, asset_id: finalAssetIds[i], position: i });
    if (error) throw error;
  }
  return id;
}

// Delete (cancel) a one-off scheduled_post. scheduled_post_media cascades.
export async function deleteScheduledPost(id) {
  const { error } = await supabase.from("scheduled_post").delete().eq("id", id);
  if (error) throw error;
}

// Update a rule's scalar fields (no pool/image changes).
export async function updateRuleFields(id, f) {
  const { error } = await supabase.from("recurring_rule").update({
    name: f.name, mode: f.mode, cadence_type: f.cadenceType,
    interval_days: f.intervalDays ?? null, weekdays: f.weekdaysDb ?? null,
    post_times:    f.mode === "pool" ? normTimes(f.postTimes) : null,
    weekday_times: f.mode === "schedule" ? normTimes(f.weekdayTimes) : null,
    weekend_times: f.mode === "schedule" ? normTimes(f.weekendTimes) : null,
    post_time:    f.mode === "pool" ? (normTimes(f.postTimes)[0] || null) : null,
    weekday_time: f.mode === "schedule" ? (normTimes(f.weekdayTimes)[0] || null) : null,
    weekend_time: f.mode === "schedule" ? (normTimes(f.weekendTimes)[0] || null) : null,
    grace_minutes: f.grace,
    special_behavior: f.specialBehavior || "normal",
  }).eq("id", id);
  if (error) throw error;
  // Stories-per-run lives on each pool (role-scoped). Update whatever pools exist.
  for (const [role, n] of Object.entries(f.counts || {})) {
    await supabase.from("pool").update({ story_count: clampCount(n) }).eq("rule_id", id).eq("role", role);
  }
}

// Get-or-create a pool for (rule, role). Older rules have no 'special' pool row;
// the editor calls this before the first image upload into a new role.
export async function ensurePool(ruleId, role) {
  const { data: existing } = await supabase.from("pool").select("id").eq("rule_id", ruleId).eq("role", role).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("pool").insert({ rule_id: ruleId, role }).select("id").single();
  if (error) throw error;
  return data.id;
}

// Load an existing rule's pools + images (for the editor).
export async function loadRuleDetail(ruleId) {
  const { data: rule } = await supabase.from("recurring_rule").select("*").eq("id", ruleId).single();
  const { data: pools = [] } = await supabase.from("pool").select("id, role, story_count").eq("rule_id", ruleId);
  const ids = (pools || []).map((p) => p.id);
  let imgs = [];
  if (ids.length) {
    const res = await supabase.from("pool_image").select("id, pool_id, storage_path, position, format, width, height").in("pool_id", ids).order("position");
    imgs = res.data || [];
  }
  const roleByPool = Object.fromEntries((pools || []).map((p) => [p.id, p.role]));
  const poolIdByRole = Object.fromEntries((pools || []).map((p) => [p.role, p.id]));
  const counts = Object.fromEntries((pools || []).map((p) => [p.role, p.story_count || 1]));
  const images = { weekday: [], weekend: [], single: [], special: [] };
  for (const im of imgs) {
    const role = roleByPool[im.pool_id];
    const url = /^https?:\/\//i.test(im.storage_path || "") ? im.storage_path : supabase.storage.from(BUCKET).getPublicUrl(im.storage_path).data.publicUrl;
    const isVideo = ["mp4", "mov"].includes(im.format) || /\.(mp4|mov)(\?|$)/i.test(im.storage_path || "");
    images[role]?.push({ id: im.id, poolId: im.pool_id, storage_path: im.storage_path, url, format: im.format, width: im.width, height: im.height, isVideo });
  }
  return { rule, images, poolIdByRole, counts };
}

export async function addPoolImageRow(poolId, row, position) {
  const { data, error } = await supabase.from("pool_image").insert({
    pool_id: poolId, storage_path: row.storage_path, position,
    width: row.width, height: row.height, aspect_ok: true, format: row.format, bytes: row.bytes,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function removePoolImageRow(id, storage_path) {
  if (id) await supabase.from("pool_image").delete().eq("id", id);
  await deleteStoredImage(storage_path);
}

// ---- kill-switch toggles (persist to DB so the cron actually stops) ----
// The auto-publish cron (/api/cron) reads recurring_rule.active, channel.paused,
// and app_settings.pause_all. These writes are what make pause/disable real.

// Activate / deactivate a single rule. ruleId is the real recurring_rule.id (uuid).
export async function setRuleActive(ruleId, active) {
  const { error } = await supabase.from("recurring_rule").update({ active }).eq("id", ruleId);
  if (error) throw error;
}

// Pause / resume a whole channel. channelDbId is the real channel.id (uuid, the `_id`
// field in the mapped UI channel). Resuming clears any scheduled resume date.
export async function setChannelPaused(channelDbId, paused) {
  const patch = { paused };
  if (!paused) patch.resume_date = null;
  const { error } = await supabase.from("channel").update(patch).eq("id", channelDbId);
  if (error) throw error;
}

// Persist app-level preference fields (Settings view). Accepts a partial of
// UI fields and maps them to app_settings columns. Upsert keyed by owner_id.
export async function saveSettingsFields(patch) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const row = { owner_id: uid };
  if (patch.defaultGrace != null) row.default_grace = patch.defaultGrace;
  if (patch.dailyPing != null) row.daily_ping = patch.dailyPing;
  if (patch.failAlerts != null) row.fail_alerts = patch.failAlerts;
  if (patch.specialReminders != null) row.special_reminders = patch.specialReminders;
  if (patch.telegram) {
    row.telegram_connected = !!patch.telegram.connected;
    row.telegram_handle = patch.telegram.handle || null;
  }
  const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "owner_id" });
  if (error) throw error;
}

// ============================================================
// Hari Spesial (special_day) — CRUD + manual sync.
// API/seed rows are deactivated rather than deleted so a later sync can't
// resurrect them; any manual change marks the row user_touched (permanent
// protection against the daily refresh).
// ============================================================
export async function addSpecialDay({ date, name, category }) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await supabase.from("special_day").insert({
    owner_id: uid, on_date: date, name: name.trim(), category: category || "custom",
    source: "manual", user_touched: true,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateSpecialDay(id, { date, name, category }) {
  const patch = { user_touched: true };
  if (date) patch.on_date = date;
  if (name != null) patch.name = name.trim();
  if (category) patch.category = category;
  const { error } = await supabase.from("special_day").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setSpecialDayActive(id, active) {
  const { error } = await supabase.from("special_day").update({ is_active: active, user_touched: true }).eq("id", id);
  if (error) throw error;
}

// Hard delete is for manual rows only; the UI deactivates api/seed rows instead.
export async function deleteSpecialDay(id) {
  const { error } = await supabase.from("special_day").delete().eq("id", id);
  if (error) throw error;
}

// "Refresh sekarang": server route forces an API sync (insert-only).
export async function syncSpecialDaysNow() {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/specialdays/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.error || "Gagal menyegarkan");
  return j;
}

// Global "vacation" switch — stops posting on every channel at once.
// app_settings is keyed by owner_id (one row per user, auto-created on signup);
// upsert keeps this safe even if that row is somehow missing.
export async function setPauseAll(pauseAll) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const patch = { owner_id: uid, pause_all: pauseAll };
  if (!pauseAll) patch.resume_date = null;
  const { error } = await supabase.from("app_settings").upsert(patch, { onConflict: "owner_id" });
  if (error) throw error;
}
