import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { r2Configured, isR2Url, r2Delete } from "../../../../lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");

// Delete an R2 media object the caller owns. Objects are keyed `${userId}/...`,
// so we only allow deleting under the signed-in user's own prefix. A no-op (ok)
// for non-R2 paths keeps the client's deleteStoredImage flow simple.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const { url } = await request.json().catch(() => ({}));
    if (!r2Configured() || !isR2Url(url)) return NextResponse.json({ ok: true, skipped: true });

    const key = url.slice(PUBLIC_BASE.length + 1);
    if (!key.startsWith(`${ures.user.id}/`)) {
      return NextResponse.json({ ok: false, error: "Bukan milik Anda" }, { status: 403 });
    }
    await r2Delete(url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
