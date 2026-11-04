import { NextResponse } from "next/server";
import { svcClient } from "../../../lib/publishCore";
import { safeEqual } from "../../../lib/secure";
import { r2Configured, presignR2Put, r2PublicUrl } from "../../../lib/r2";
import { checkStudioPost, STUDIO_EXT } from "../../../lib/studioApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Studio Konten (Rama's content repo) pushes finished designs here: list accounts,
// presign an R2 upload, then create a draft or scheduled post exactly like the
// composer does (media_asset + scheduled_post + scheduled_post_media). The cron
// publishes scheduled posts as usual. Auth: Bearer STUDIO_API_TOKEN (empty = all denied).
const authorized = (request) => safeEqual((request.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), process.env.STUDIO_API_TOKEN);
const bad = (error, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function channelsOf(svc) {
  const { data, error } = await svc.from("channel")
    .select("id, owner_id, platform, slug, handle, name, token_status")
    .in("platform", ["instagram"]).eq("token_status", "connected").is("archived_at", null);
  if (error) throw error;
  return data || [];
}

export async function POST(request) {
  if (!authorized(request)) return bad("unauthorized", 401);
  const body = await request.json().catch(() => null);
  const svc = svcClient();
  try {
    if (body?.action === "akun") {
      const list = await channelsOf(svc);
      return NextResponse.json({ ok: true, akun: list.map(({ id, handle, name }) => ({ id, handle, name })) });
    }

    if (body?.action === "presign") {
      if (!r2Configured()) return bad("Penyimpanan media (R2) belum dikonfigurasi.", 501);
      const contentType = STUDIO_EXT[body.ext];
      if (!contentType) return bad("Format berkas tidak didukung");
      const key = `studio-konten/${crypto.randomUUID()}.${body.ext}`;
      return NextResponse.json({ ok: true, uploadUrl: await presignR2Put(key, contentType), publicUrl: r2PublicUrl(key), contentType });
    }

    if (body?.action === "buat") {
      const p = body.post || {};
      const err = checkStudioPost(p);
      if (err) return bad(err);
      const ch = (await channelsOf(svc)).find((c) => c.id === p.channel_id);
      if (!ch) return bad("Akun tidak ditemukan atau belum tersambung");
      const assetIds = [];
      for (const m of p.media) {
        const { data: a, error } = await svc.from("media_asset").insert({
          channel_id: ch.id, storage_path: m.url, tag: p.post_type,
          width: m.width ?? null, height: m.height ?? null, aspect_ok: true, format: m.format, bytes: m.bytes ?? null,
        }).select("id").single();
        if (error) throw error;
        assetIds.push(a.id);
      }
      const { data: post, error: ep } = await svc.from("scheduled_post").insert({
        channel_id: ch.id, post_type: p.post_type, caption: p.caption || null, first_comment: p.first_comment || null,
        scheduled_at: p.status === "scheduled" ? p.scheduled_at : (p.scheduled_at || null), status: p.status,
      }).select("id, status, scheduled_at").single();
      if (ep) throw ep;
      const { error: em } = await svc.from("scheduled_post_media").insert(assetIds.map((asset_id, position) => ({ post_id: post.id, asset_id, position })));
      if (em) throw em;
      return NextResponse.json({ ok: true, post: { ...post, handle: ch.handle } });
    }

    if (body?.action === "status") {
      const { data, error } = await svc.from("scheduled_post").select("id, status, scheduled_at, post_type").eq("id", body.id).maybeSingle();
      if (error) throw error;
      if (!data) return bad("Postingan tidak ditemukan", 404);
      // Latest publish attempt: the Instagram link, failure reason and the insights the engine pulls.
      const { data: run } = await svc.from("post_run")
        .select("status, published_at, permalink, fail_reason, m_views, m_reach, m_likes, m_comments, m_saves, m_shares")
        .eq("scheduled_post_id", data.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return NextResponse.json({ ok: true, post: data, run: run || null });
    }

    if (body?.action === "batal") {
      // Only posts that have not started publishing can be cancelled.
      const { data, error } = await svc.from("scheduled_post").update({ status: "canceled" })
        .eq("id", body.id).in("status", ["draft", "scheduled"]).select("id, status").maybeSingle();
      if (error) throw error;
      return data ? NextResponse.json({ ok: true, post: data }) : bad("Tidak bisa dibatalkan (sudah diproses atau tidak ada)", 409);
    }

    return bad("action harus akun, presign, buat, status, atau batal");
  } catch (e) {
    return bad(String(e?.message || e), 500);
  }
}
