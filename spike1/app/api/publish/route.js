import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { svcClient, publishForRule, roleForNow } from "../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Manual "Post now" — verifies the caller owns the channel, then publishes once.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { ruleId } = await request.json().catch(() => ({}));
    if (!ruleId) return NextResponse.json({ ok: false, error: "ruleId required" }, { status: 400 });

    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    const user = ures?.user;
    if (!user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const svc = svcClient();
    const { data: rule } = await svc.from("recurring_rule").select("id, channel_id, mode, name, special_behavior").eq("id", ruleId).single();
    if (!rule) return NextResponse.json({ ok: false, error: "Rule not found" }, { status: 404 });
    const { data: channel } = await svc.from("channel")
      .select("id, owner_id, ig_user_id, access_token, token_status, handle").eq("id", rule.channel_id).single();
    if (!channel || channel.owner_id !== user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    if (!channel.ig_user_id || !channel.access_token) return NextResponse.json({ ok: false, error: "Channel belum tersambung" }, { status: 400 });

    const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
    const dow = nowWib.getUTCDay();
    let role = roleForNow(rule.mode, dow);
    // Hari Spesial: manual post-now matches the cron's pool choice — on a special
    // day a 'special_pool' rule posts from its special pool (if it has images).
    // 'skip' never blocks an explicit button press.
    if (rule.special_behavior === "special_pool") {
      const today = nowWib.toISOString().slice(0, 10);
      const { data: sd } = await svc.from("special_day").select("id")
        .eq("owner_id", channel.owner_id).eq("on_date", today).eq("is_active", true).limit(1);
      if (sd?.length) {
        const { data: sp } = await svc.from("pool").select("id").eq("rule_id", rule.id).eq("role", "special").maybeSingle();
        if (sp) {
          const { count } = await svc.from("pool_image").select("id", { count: "exact", head: true }).eq("pool_id", sp.id);
          if (count > 0) role = "special";
        }
      }
    }
    const result = await publishForRule(svc, {
      channel, rule, role, trigger: "manual", claimKey: `manual:${ruleId}:${Date.now()}`,
    });
    if (result.skipped) return NextResponse.json({ ok: true, skipped: true });
    if (!result.ok) return NextResponse.json(result, { status: 502 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
