import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { svcClient } from "../../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TG = process.env.TELEGRAM_BOT_TOKEN;

// Send a test message to the signed-in user's linked Telegram chat, so they can
// confirm alerts arrive without waiting for a real publish failure.
export async function POST(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
  const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
  const user = ures?.user;
  if (!user) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  if (!TG) return NextResponse.json({ ok: false, error: "Telegram bot belum dikonfigurasi" }, { status: 500 });

  const svc = svcClient();
  const { data: s } = await svc.from("app_settings").select("telegram_chat_id, telegram_connected").eq("owner_id", user.id).maybeSingle();
  if (!s?.telegram_connected || !s?.telegram_chat_id) return NextResponse.json({ ok: false, error: "Telegram belum tersambung" }, { status: 400 });

  const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: s.telegram_chat_id, text: "🔔 Tes dari SinaraCast — pemberitahuan kamu aktif. Kalau ada postingan gagal atau jadwal terlewat, kabarnya akan masuk ke sini." }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) return NextResponse.json({ ok: false, error: j.description || "Gagal mengirim" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
