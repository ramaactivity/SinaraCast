import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { svcClient, tiktokCreatorInfo, TIKTOK_AUDITED } from "../../../lib/tiktokCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Used by the composer to build a TikTok-compliant posting form: which privacy
// levels the account allows + which interactions are disabled at account level.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { channelDbId } = await request.json().catch(() => ({}));
    if (!channelDbId) return NextResponse.json({ ok: false, error: "channelDbId required" }, { status: 400 });

    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    const user = ures?.user;
    if (!user) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });

    const svc = svcClient();
    const { data: channel } = await svc.from("channel")
      .select("id, owner_id, platform, access_token, refresh_token, token_status, token_expires_at")
      .eq("id", channelDbId).maybeSingle();
    if (!channel || channel.owner_id !== user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    if (channel.platform !== "tiktok") return NextResponse.json({ ok: false, error: "Bukan akun TikTok" }, { status: 400 });

    const info = await tiktokCreatorInfo(svc, channel);
    return NextResponse.json({ ...info, audited: TIKTOK_AUDITED }, { status: info.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
