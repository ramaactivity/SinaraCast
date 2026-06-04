import { NextResponse } from "next/server";
import { svcClient, publishForRule, roleForNow } from "../../../lib/publishCore";

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
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const dow = nowWib.getUTCDay();
  const today = wibDateStr(nowWib);
  const nowMin = nowWib.getUTCHours() * 60 + nowWib.getUTCMinutes();

  // eligible channels (connected, not paused, not archived) + owners not globally paused
  const { data: channels = [] } = await svc.from("channel")
    .select("id, owner_id, slug, ig_user_id, access_token, token_status, paused, archived_at")
    .eq("token_status", "connected").eq("paused", false).is("archived_at", null);
  if (!channels.length) return NextResponse.json({ ok: true, fired: [], note: "no eligible channels" });

  const owners = [...new Set(channels.map((c) => c.owner_id))];
  const { data: settings = [] } = await svc.from("app_settings").select("owner_id, pause_all").in("owner_id", owners);
  const pausedOwners = new Set((settings || []).filter((s) => s.pause_all).map((s) => s.owner_id));
  const chById = Object.fromEntries(channels.filter((c) => !pausedOwners.has(c.owner_id)).map((c) => [c.id, c]));

  const { data: rules = [] } = await svc.from("recurring_rule")
    .select("id, channel_id, name, mode, active, cadence_type, interval_days, weekdays, post_time, weekday_time, weekend_time, grace_minutes, created_at")
    .eq("active", true).is("archived_at", null).in("channel_id", Object.keys(chById).length ? Object.keys(chById) : ["00000000-0000-0000-0000-000000000000"]);

  const fired = [];
  for (const rule of rules) {
    const channel = chById[rule.channel_id];
    if (!channel) continue;
    if (!isFireDay(rule, dow, today, nowWib)) continue;
    const isWeekend = dow === 0 || dow === 6;
    const schedMin = hhmmToMin(rule.mode === "schedule" ? (isWeekend ? rule.weekend_time : rule.weekday_time) : rule.post_time);
    if (schedMin == null) continue;
    const grace = rule.grace_minutes ?? 30;
    if (!(nowMin >= schedMin && nowMin <= schedMin + grace)) continue;

    const role = roleForNow(rule.mode, dow);
    const claimKey = `auto:${rule.id}:${today}`;
    try {
      const res = await publishForRule(svc, { channel, rule, role, trigger: "scheduled", claimKey, scheduledAtISO: new Date().toISOString() });
      if (res.skipped) continue;
      fired.push({ rule: rule.name, channel: channel.slug, ok: res.ok, error: res.error, permalink: res.permalink });
    } catch (e) {
      fired.push({ rule: rule.name, channel: channel.slug, ok: false, error: String(e?.message || e) });
    }
  }
  return NextResponse.json({ ok: true, at: nowWib.toISOString(), fired });
}

// allow GET for a quick manual ping/health (still secret-gated)
export const GET = POST;
