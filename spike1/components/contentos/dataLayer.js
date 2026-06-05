"use client";
// Loads real data from Supabase and maps it to the shapes the Content OS
// components expect (the mockdata.js contract). access_token is NEVER selected
// here — it stays server/worker-only (schema §7).
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
    status: STATUS[c.token_status] || "Needs reconnect",
    tokenExpires: c.token_status === "needs_reconnect" ? "Kedaluwarsa" : fmtDate(c.token_expires_at),
    lastRefresh: c.last_refresh_at ? fmtDate(c.last_refresh_at) : "—",
    paused: c.paused, resumeDate: c.resume_date ? fmtDate(c.resume_date) : "",
    followers: fmtFollowers(c.followers),
    avatarUrl: c.avatar_url || null,
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
    cycle: { used: 0, total: 0 }, nextRun: r.active ? "Belum dijadwalkan" : "Nonaktif",
    todayStatus: r.active ? "Scheduled" : "Inactive", lastImg: 0, runs7: [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function loadAll() {
  const { data: channelsRaw = [] } = await supabase
    .from("channel")
    .select("id, slug, name, handle, token_status, token_expires_at, last_refresh_at, paused, resume_date, followers, color_token, avatar_url")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const slugById = Object.fromEntries((channelsRaw || []).map((c) => [c.id, c.slug]));
  const channels = (channelsRaw || []).map(mapChannel);

  const { data: rulesRaw = [] } = await supabase
    .from("recurring_rule")
    .select("*")
    .is("archived_at", null);

  // pools + image counts per rule (for "X gambar" + cycle) + first thumbnail
  const { data: pools = [] } = await supabase.from("pool").select("id, rule_id, role");
  const { data: imgs = [] } = await supabase.from("pool_image").select("id, pool_id, used_in_cycle, storage_path, position, bytes").order("position");
  const imgByPool = {};
  const firstPathByPool = {};
  const pathsByPool = {};
  const bytesByPool = {};
  const pathById = {}; // pool_image.id → storage_path (for run thumbnails)
  for (const im of imgs || []) {
    const p = (imgByPool[im.pool_id] ||= { total: 0, used: 0 });
    p.total++; if (im.used_in_cycle) p.used++;
    if (!(im.pool_id in firstPathByPool)) firstPathByPool[im.pool_id] = im.storage_path;
    (pathsByPool[im.pool_id] ||= []).push(im.storage_path);
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
    base.poolImages = rp.flatMap((p) => (pathsByPool[p.id] || []).map((sp) => ({ role: p.role, url: pubUrl(sp) })));
    return base;
  });

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

  // ---- activity: real post_run rows (reverse chronological) + their attempts ----
  const ruleNameById = Object.fromEntries((rulesRaw || []).map((r) => [r.id, r.name]));
  const POOL_LABEL = { weekday: "Weekday", weekend: "Weekend", single: "Pool" };
  const RUN_STATUS = { published: "Published", failed: "Failed", publishing: "Publishing", pending: "Publishing", skipped: "Skipped" };
  const { data: runsRaw = [] } = await supabase
    .from("post_run")
    .select("id, channel_id, rule_id, pool_role, image_id, status, trigger, scheduled_at, published_at, permalink, fail_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(150);
  const runIds = (runsRaw || []).map((r) => r.id);
  let attemptsRaw = [];
  if (runIds.length) {
    const res = await supabase.from("post_attempt").select("run_id, at, outcome, is_fail").in("run_id", runIds).order("at", { ascending: true });
    attemptsRaw = res.data || [];
  }
  const attemptsByRun = {};
  for (const a of attemptsRaw) (attemptsByRun[a.run_id] ||= []).push({ t: fmtTimeWib(a.at), o: a.outcome, ...(a.is_fail ? { fail: true } : {}) });
  const runs = (runsRaw || []).map((r) => ({
    id: r.id,
    ch: slugById[r.channel_id] || "",
    ruleId: r.rule_id,
    rule: ruleNameById[r.rule_id] || "(rule dihapus)",
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
  const { data: schedRaw = [] } = await supabase
    .from("scheduled_post")
    .select("id, channel_id, post_type, caption, scheduled_at, status")
    .not("scheduled_at", "is", null);
  const oneoffs = (schedRaw || []).map((s) => {
    const d = toWib(s.scheduled_at);
    return {
      id: s.id, ch: slugById[s.channel_id] || "", day: d.getUTCDate(),
      ym: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`,
      type: s.post_type === "feed" ? "Feed" : "Story",
      title: s.caption ? s.caption.slice(0, 40) : (s.post_type === "feed" ? "Feed post" : "Story"),
      time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
      status: SCHED_STATUS[s.status] || "Scheduled",
    };
  });

  // ---- in-app notifications (alerts mirror) ----
  const { data: notifsRaw = [] } = await supabase
    .from("notification")
    .select("id, channel_id, type, title, body, run_id, read, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const notifs = (notifsRaw || []).map((n) => ({
    id: n.id, type: n.type, ch: n.channel_id ? slugById[n.channel_id] || null : null,
    title: n.title, body: n.body, runId: n.run_id, read: n.read, time: fmtNotifTime(n.created_at),
  }));

  const { data: settingsRaw } = await supabase.from("app_settings").select("*").maybeSingle();
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

  const { data: profileRaw } = await supabase.from("app_user").select("*").maybeSingle();
  const profile = {
    name: profileRaw?.name || "Rama",
    email: profileRaw?.email || "",
    method: "Magic link",
    joined: profileRaw?.joined_at ? fmtDate(profileRaw.joined_at) : "—",
  };

  return { channels, rules, runs, oneoffs, notifs, settings, profile };
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
    const res = await supabase.from("pool_image").select("id, pool_id, storage_path, position").in("pool_id", ids).order("position");
    imgs = res.data || [];
  }
  const roleByPool = Object.fromEntries((pools || []).map((p) => [p.id, p.role]));
  const poolIdByRole = Object.fromEntries((pools || []).map((p) => [p.role, p.id]));
  const images = { weekday: [], weekend: [], single: [] };
  for (const im of imgs) {
    const role = roleByPool[im.pool_id];
    const url = supabase.storage.from(BUCKET).getPublicUrl(im.storage_path).data.publicUrl;
    images[role]?.push({ id: im.id, poolId: im.pool_id, storage_path: im.storage_path, url });
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
