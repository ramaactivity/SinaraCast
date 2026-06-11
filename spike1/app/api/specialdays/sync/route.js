import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { svcClient } from "../../../../lib/publishCore";
import { syncSpecialDaysDue } from "../../../../lib/specialDays";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Manual "Refresh sekarang" on the Hari Spesial page: verifies the signed-in
// user, then forces a calendar sync (bypassing the once-a-day guard). Sync is
// insert-only, so rows the user edited or deactivated are never overwritten.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const result = await syncSpecialDaysDue(svcClient(), { force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
