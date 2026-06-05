import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { svcClient, publishTikTokVideoOneoff, publishTikTokPhotoOneoff } from "../../../lib/tiktokCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isVideo = (a) => a.format === "mp4" || a.format === "mov" || /\.(mp4|mov)$/i.test(a.storage_path || "");

// Spike-only endpoint. Posts a test video (FILE_UPLOAD) or test photo carousel
// (PULL_FROM_URL) to the caller's connected TikTok account, private (SELF_ONLY).
// Test media is auto-picked from that channel's uploaded media_asset rows.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { kind } = await request.json().catch(() => ({}));
    if (kind !== "video" && kind !== "photo") return NextResponse.json({ ok: false, error: "kind harus 'video' atau 'photo'" }, { status: 400 });

    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    const user = ures?.user;
    if (!user) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });

    const svc = svcClient();
    const { data: channel } = await svc.from("channel")
      .select("id, owner_id, slug, handle, platform, access_token, refresh_token, token_status, token_expires_at, tiktok_open_id")
      .eq("owner_id", user.id).eq("platform", "tiktok").is("archived_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!channel) return NextResponse.json({ ok: false, error: "Belum ada akun TikTok tersambung. Sambungkan dulu." }, { status: 400 });
    if (!channel.access_token) return NextResponse.json({ ok: false, error: "Akun TikTok belum punya token — sambungkan ulang." }, { status: 400 });

    // Auto-pick test media uploaded to this channel.
    const { data: assets = [] } = await svc.from("media_asset")
      .select("id, storage_path, format, created_at").eq("channel_id", channel.id)
      .order("created_at", { ascending: false }).limit(20);

    if (kind === "video") {
      const vid = (assets || []).find(isVideo);
      if (!vid) return NextResponse.json({ ok: false, error: "Belum ada video di akun ini. Upload satu video (9:16) ke akun TikTok lewat app dulu." }, { status: 400 });
      const result = await publishTikTokVideoOneoff(svc, { channel, storagePath: vid.storage_path, caption: "Tes SinaraCast — video (privat)" });
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

    // photo
    const pics = (assets || []).filter((a) => !isVideo(a)).slice(0, 10).map((a) => a.storage_path);
    if (!pics.length) return NextResponse.json({ ok: false, error: "Belum ada foto di akun ini. Upload 1–10 gambar ke akun TikTok lewat app dulu." }, { status: 400 });
    const result = await publishTikTokPhotoOneoff(svc, { channel, storagePaths: pics, caption: "Tes SinaraCast — foto (privat)" });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
