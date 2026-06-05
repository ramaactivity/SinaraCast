import { NextResponse } from "next/server";
import { svcClient } from "../../../../lib/publishCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.CRON_SECRET; // reused as the Telegram webhook secret_token

async function tgSend(chatId, text) {
  if (!TG_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

// Telegram calls this on every bot update. We register it with secret_token =
// CRON_SECRET, so we drop anything without the matching header.
export async function POST(request) {
  // Fail closed: if no secret is configured, or the header doesn't match, ignore.
  if (!SECRET || request.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return NextResponse.json({ ok: true }); // silently ignore spoofed/unverified calls
  }
  const update = await request.json().catch(() => ({}));
  const msg = update.message || update.edited_message;
  const text = msg?.text || "";
  const chatId = msg?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });

  // Deep-link `t.me/<bot>?start=<code>` arrives as "/start <code>".
  const m = text.match(/^\/(?:start|link)\s+([A-Za-z0-9_-]+)/);
  if (m) {
    const svc = svcClient();
    const { data: row } = await svc.from("app_settings").select("owner_id").eq("telegram_handle", `link:${m[1]}`).maybeSingle();
    if (!row) {
      await tgSend(chatId, "Kode tidak dikenal atau sudah dipakai. Buka SinaraCast → Settings → ‘Hubungkan Telegram’ untuk dapat kode baru.");
      return NextResponse.json({ ok: true });
    }
    const handle = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || "Telegram");
    await svc.from("app_settings").update({ telegram_chat_id: String(chatId), telegram_connected: true, telegram_handle: handle }).eq("owner_id", row.owner_id);
    await tgSend(chatId, "✅ Telegram tersambung ke SinaraCast. Kamu akan menerima alert publish (gagal/terlewat) di sini.");
    return NextResponse.json({ ok: true });
  }

  if (/^\/start/.test(text)) {
    await tgSend(chatId, "Halo! Untuk menyambungkan akun, buka SinaraCast → Settings → ‘Hubungkan Telegram’.");
  }
  return NextResponse.json({ ok: true });
}
