"use client";
// Loads real data from Supabase and maps it to the shapes the Content OS
// components expect (the mockdata.js contract). access_token is NEVER selected
// here — it stays server/worker-only (schema §7).
import { supabase } from "./supabaseClient";

const STATUS = { connected: "Connected", expiring: "Expiring", needs_reconnect: "Needs reconnect" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtDate = (iso) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtFollowers = (n) => { if (n == null) return "—"; return n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "rb" : String(n); };
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
    _id: c.id,
  };
}

function mapRule(r, slugById) {
  const isSched = r.mode === "schedule";
  return {
    id: r.id, ch: slugById[r.channel_id] || "", name: r.name, mode: r.mode, active: r.active,
    cadence: cadenceLabel(r), time: (isSched ? r.weekday_time : r.post_time)?.slice(0, 5) || "—",
    grace: r.grace_minutes,
    pools: isSched ? { weekday: 0, weekend: 0 } : { pool: 0 }, // counts filled below if pools loaded
    cycle: { used: 0, total: 0 }, nextRun: r.active ? "Belum dijadwalkan" : "Nonaktif",
    todayStatus: r.active ? "Scheduled" : "Inactive", lastImg: 0, runs7: [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function loadAll() {
  const { data: channelsRaw = [] } = await supabase
    .from("channel")
    .select("id, slug, name, handle, token_status, token_expires_at, last_refresh_at, paused, resume_date, followers, color_token")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const slugById = Object.fromEntries((channelsRaw || []).map((c) => [c.id, c.slug]));
  const channels = (channelsRaw || []).map(mapChannel);

  const { data: rulesRaw = [] } = await supabase
    .from("recurring_rule")
    .select("*")
    .is("archived_at", null);

  // pools + image counts per rule (for "X gambar" + cycle)
  const { data: pools = [] } = await supabase.from("pool").select("id, rule_id, role");
  const { data: imgs = [] } = await supabase.from("pool_image").select("pool_id, used_in_cycle");
  const imgByPool = {};
  for (const im of imgs || []) {
    const p = (imgByPool[im.pool_id] ||= { total: 0, used: 0 });
    p.total++; if (im.used_in_cycle) p.used++;
  }
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
    return base;
  });

  const { data: settingsRaw } = await supabase.from("app_settings").select("*").maybeSingle();
  const settings = {
    pauseAll: settingsRaw?.pause_all ?? false,
    resumeDate: settingsRaw?.resume_date ? fmtDate(settingsRaw.resume_date) : "",
    timezone: "Asia/Jakarta (WIB, UTC+7)",
    defaultGrace: settingsRaw?.default_grace ?? 30,
    telegram: { connected: settingsRaw?.telegram_connected ?? false, handle: settingsRaw?.telegram_handle || "" },
    failAlerts: settingsRaw?.fail_alerts ?? true,
    dailyPing: settingsRaw?.daily_ping ?? true,
    storage: { used: 0, total: 1024 },
  };

  const { data: profileRaw } = await supabase.from("app_user").select("*").maybeSingle();
  const profile = {
    name: profileRaw?.name || "Rama",
    email: profileRaw?.email || "",
    method: "Magic link",
    joined: profileRaw?.joined_at ? fmtDate(profileRaw.joined_at) : "—",
  };

  return { channels, rules, runs: [], notifs: [], settings, profile };
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
