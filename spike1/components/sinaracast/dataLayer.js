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
const ruleHHMM = (rule, jsDow) => {
  if (rule.mode !== "schedule") return (rule.post_time || "").slice(0, 5);
  const weekend = jsDow === 0 || jsDow === 6;
  return ((weekend ? rule.weekend_time : rule.weekday_time) || "").slice(0, 5);
};
const nextRunLabel = (rule) => {
  const now = toWib(new Date().toISOString());
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (let i = 0; i < 366; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const Y = d.getUTCFullYear(), M = d.getUTCMonth(), day = d.getUTCDate(), jsDow = d.getUTCDay();
    if (!ruleFiresOn(rule, Y, M, day)) continue;
    const hhmm = ruleHHMM(rule, jsDow);
    if (!hhmm) continue;
    const [h, m] = hhmm.split(":").map(Number);
    if (i === 0 && h * 60 + m <= nowMin) continue; // today, but the time already passed
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
    _id: c.id,
  };
}

function mapRule(r, slugById) {
  const isSched = r.mode === "schedule";
  return {
    id: r.id, ch: slugById[r.channel_id] || "", name: r.name, mode: r.mode, active: r.active,
    cadence: cadenceLabel(r), time: (isSched ? r.weekday_time : r.post_time)?.slice(0, 5) || "—",
    grace: r.grace_minutes,
    // raw scheduling fields for the calendar projection
    cadenceType: r.cadence_type, intervalDays: r.interval_days, weekdaysDb: r.weekdays || [], createdAt: r.created_at,
    weekdayTime: r.weekday_time?.slice(0, 5) || "", weekendTime: r.weekend_time?.slice(0, 5) || "", postTime: r.post_time?.slice(0, 5) || "",
    pools: isSched ? { weekday: 0, weekend: 0 } : { pool: 0 }, // counts filled below if pools loaded
    cycle: { used: 0, total: 0 }, nextRun: r.active ? nextRunLabel(r) : "Nonaktif",
    todayStatus: r.active ? "Scheduled" : "Inactive", lastImg: 0, runs7: [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function loadAll() {
  // Fire every independent read in parallel. allSettled (not all) so a single
  // failed query can NEVER blank the whole app — each just falls back to empty.
  const results = await Promise.allSettled([
    supabase.from("channel").select("id, slug, name, handle, platform, brand_id, token_status, token_expires_at, last_refresh_at, paused, resume_date, followers, color_token, avatar_url").is("archived_at", null).order("created_at", { ascending: true }),
    supabase.from("recurring_rule").select("*").is("archived_at", null),
    supabase.from("pool").select("id, rule_id, role"),
    supabase.from("pool_image").select("id, pool_id, used_in_cycle, storage_path, position, bytes").order("position"),
    supabase.from("media_asset").select("id, channel_id, storage_path, tag, created_at").order("created_at", { ascending: false }),
    supabase.from("post_run").select("id, channel_id, rule_id, scheduled_post_id, pool_role, image_id, status, trigger, scheduled_at, published_at, permalink, fail_reason, created_at").order("created_at", { ascending: false }).limit(150),
    supabase.from("scheduled_post").select("id, channel_id, post_type, caption, scheduled_at, status").not("scheduled_at", "is", null),
    supabase.from("notification").select("id, channel_id, type, title, body, run_id, read, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("app_settings").select("*").maybeSingle(),
    supabase.from("app_user").select("*").maybeSingle(),
    supabase.from("content_plan").select("id, brand_id, channel_id, platform, planned_date, planned_time, title, content_type, pillar, format, goal, status, source, scheduled_post_id, recurring_rule_id, auto_managed, post_link, posted_at, m_views, m_likes, m_comments, m_shares, m_saves, m_reach, metrics_source, metrics_updated_at").order("planned_date", { ascending: true }),
    supabase.from("brand").select("id, name, avatar_emoji, color_token, created_at").order("created_at", { ascending: true }),
    supabase.from("follower_snapshot").select("channel_id, snap_date, followers").order("snap_date", { ascending: true }).limit(2000),
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
  const pubUrl = (sp) => supabase.storage.from(BUCKET).getPublicUrl(sp).data.publicUrl;
  const poolsByRule = {};
  for (const p of pools || []) (poolsByRule[p.rule_id] ||= []).push({ ...p, ...(imgByPool[p.id] || { total: 0, used: 0 }) });

  const rules = (rulesRaw || []).map((r) => {
    const base = mapRule(r, slugById);
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

  return { channels, brands, rules, runs, oneoffs, plans, notifs, settings, profile, library: mediaByChannel, followerSeries };
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
    hook: p.hook?.trim() || null, caption: p.caption?.trim() || null, notes: p.notes?.trim() || null,
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
export async function uploadReelVideo(file, channelSlug, meta) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not signed in");
  const ext = file.type === "video/quicktime" ? "mov" : "mp4";
  const path = `${uid}/${channelSlug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { storage_path: path, url, bytes: file.size, format: ext, width: meta?.width, height: meta?.height, aspect_ok: true, isVideo: true };
}

export async function deleteStoredImage(storage_path) {
  if (storage_path) await supabase.storage.from(BUCKET).remove([storage_path]);
}

// Create a recurring_rule + its pool(s) + pool_image rows. `images` is
// { weekday:[], weekend:[] } for schedule or { single:[] } for pool.
export async function createRuleWithPools(p) {
  const { data: rule, error: e1 } = await supabase.from("recurring_rule").insert({
    channel_id: p.channelDbId, name: p.name, mode: p.mode, active: true,
    cadence_type: p.cadenceType, interval_days: p.intervalDays ?? null, weekdays: p.weekdaysDb ?? null,
    post_time: p.mode === "pool" ? p.postTime : null,
    weekday_time: p.mode === "schedule" ? p.weekdayTime : null,
    weekend_time: p.mode === "schedule" ? p.weekendTime : null,
    grace_minutes: p.grace,
  }).select("id").single();
  if (e1) throw e1;

  const roles = p.mode === "schedule" ? ["weekday", "weekend"] : ["single"];
  for (const role of roles) {
    const { data: pool, error: e2 } = await supabase.from("pool")
      .insert({ rule_id: rule.id, role }).select("id").single();
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
    return a ? { assetId: a.id, storage_path: a.storage_path, url: supabase.storage.from(BUCKET).getPublicUrl(a.storage_path).data.publicUrl, width: a.width, height: a.height, format: a.format, bytes: a.bytes } : null;
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
    post_time: f.mode === "pool" ? f.postTime : null,
    weekday_time: f.mode === "schedule" ? f.weekdayTime : null,
    weekend_time: f.mode === "schedule" ? f.weekendTime : null,
    grace_minutes: f.grace,
  }).eq("id", id);
  if (error) throw error;
}

// Load an existing rule's pools + images (for the editor).
export async function loadRuleDetail(ruleId) {
  const { data: rule } = await supabase.from("recurring_rule").select("*").eq("id", ruleId).single();
  const { data: pools = [] } = await supabase.from("pool").select("id, role").eq("rule_id", ruleId);
  const ids = (pools || []).map((p) => p.id);
  let imgs = [];
  if (ids.length) {
    const res = await supabase.from("pool_image").select("id, pool_id, storage_path, position, format, width, height").in("pool_id", ids).order("position");
    imgs = res.data || [];
  }
  const roleByPool = Object.fromEntries((pools || []).map((p) => [p.id, p.role]));
  const poolIdByRole = Object.fromEntries((pools || []).map((p) => [p.role, p.id]));
  const images = { weekday: [], weekend: [], single: [] };
  for (const im of imgs) {
    const role = roleByPool[im.pool_id];
    const url = supabase.storage.from(BUCKET).getPublicUrl(im.storage_path).data.publicUrl;
    const isVideo = ["mp4", "mov"].includes(im.format) || /\.(mp4|mov)(\?|$)/i.test(im.storage_path || "");
    images[role]?.push({ id: im.id, poolId: im.pool_id, storage_path: im.storage_path, url, format: im.format, width: im.width, height: im.height, isVideo });
  }
  return { rule, images, poolIdByRole };
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
  if (patch.telegram) {
    row.telegram_connected = !!patch.telegram.connected;
    row.telegram_handle = patch.telegram.handle || null;
  }
  const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "owner_id" });
  if (error) throw error;
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
