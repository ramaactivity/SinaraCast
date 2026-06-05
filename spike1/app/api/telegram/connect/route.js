import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { svcClient } from "../../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BOT = process.env.TELEGRAM_BOT_USERNAME || "SinaraCast_bot";

// Start linking the signed-in user's Telegram. We stash a one-time code in
// app_settings.telegram_handle as `link:<code>` (no schema change needed); the
// webhook resolves `/start <code>` back to this owner and stores the chat id.
export async function POST(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
  const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
  const user = ures?.user;
  if (!user) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });

  const code = crypto.randomBytes(6).toString("hex"); // 12 hex chars, URL/Telegram-safe
  const svc = svcClient();
  const { error } = await svc.from("app_settings")
    .upsert({ owner_id: user.id, telegram_handle: `link:${code}`, telegram_connected: false }, { onConflict: "owner_id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, url: `https://t.me/${BOT}?start=${code}` });
}
