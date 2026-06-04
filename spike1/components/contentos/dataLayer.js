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
  const rules = (rulesRaw || []).map((r) => mapRule(r, slugById));

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
