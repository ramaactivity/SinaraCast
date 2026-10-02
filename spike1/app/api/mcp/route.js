import { NextResponse } from "next/server";
import { svcClient, notify } from "../../../lib/publishCore";
import { handleMcp } from "../../../lib/hermesMcp";
import { safeEqual } from "../../../lib/secure";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const V = process.env.META_GRAPH_VERSION || "v25.0";
// Terkunci ke akun Tetra: Instagram (by id) dan Threads (by handle).
const TETRA_IG_USER_ID = "17841465090291702";
const TETRA_THREADS_HANDLE = "@tetraphotobooth";

// Bearer HERMES_MCP_TOKEN, dibandingkan timing-safe lewat hash (panjang selalu sama).
// Env kosong = semua ditolak.
function authorized(request) {
  return safeEqual((request.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), process.env.HERMES_MCP_TOKEN);
}

// Tetra bisa tersambung di lebih dari satu akun SinaraCast; pakai baris yang
// punya izin komentar, lalu yang tokennya paling baru.
async function tetraChannel(svc) {
  const { data } = await svc.from("channel")
    .select("id, owner_id, ig_user_id, handle, access_token, ig_scopes, last_refresh_at")
    .eq("ig_user_id", TETRA_IG_USER_ID).eq("platform", "instagram").eq("token_status", "connected").is("archived_at", null);
  const score = (c) => (c.ig_scopes?.includes("instagram_business_manage_comments") ? 1 : 0);
  return (data || []).sort((a, b) => score(b) - score(a) || String(b.last_refresh_at).localeCompare(String(a.last_refresh_at)))[0] || null;
}

async function threadsChannel(svc) {
  const { data } = await svc.from("channel")
    .select("id, owner_id, platform, threads_user_id, handle, access_token, last_refresh_at")
    .eq("platform", "threads").eq("handle", TETRA_THREADS_HANDLE).eq("token_status", "connected").is("archived_at", null)
    .order("last_refresh_at", { ascending: false }).limit(1);
  return data?.[0] || null;
}

export async function POST(request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const svc = svcClient();
  const tool = raw?.method === "tools/call" ? String(raw.params?.name || "") : "";
  const channel = !tool ? null : tool.startsWith("threads_") ? await threadsChannel(svc) : await tetraChannel(svc);

  const T = "ig_comment_action";
  const deps = {
    channel,
    now: () => new Date(),
    ig: async (method, path, { query = {}, body } = {}) => {
      const url = new URL(`https://graph.instagram.com/${V}${path}`);
      for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      url.searchParams.set("access_token", channel.access_token);
      const res = await fetch(url, {
        method,
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    },
    th: async (method, path, { query = {} } = {}) => {
      const url = new URL(`https://graph.threads.net/v1.0${path}`);
      for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      url.searchParams.set("access_token", channel.access_token);
      const res = await fetch(url, { method });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    },
    // Balasan ke orang asing → kabari Rama (lonceng + Telegram) supaya bisa dicek cepat.
    after: async (a) => {
      if (a.kind !== "threads_reply_luar") return;
      await notify(svc, { ownerId: channel.owner_id, channelId: channel.id, type: "info",
        title: `Bruno membalas @${a.target_username || "?"} di Threads`,
        body: `${a.teks}${a.target_url ? `\n${a.target_url}` : ""}`, runId: null }).catch(() => {});
    },
    kompetitor: async () => {
      const { data } = await svc.from("threads_kompetitor").select("username").eq("owner_id", channel.owner_id);
      return new Set((data || []).map((r) => r.username.replace(/^@/, "").toLowerCase()));
    },
    log: {
      done: async (channelId, kind) => {
        const { data } = await svc.from(T).select("comment_id").eq("channel_id", channelId).eq("kind", kind).not("result_id", "is", null);
        return new Set((data || []).map((r) => r.comment_id));
      },
      // Klaim yang belum selesai ikut dihitung: lebih aman menolak daripada dobel.
      countSince: async (channelId, kind, iso) => {
        const { count } = await svc.from(T).select("id", { count: "exact", head: true }).eq("channel_id", channelId).eq("kind", kind).gte("at", iso);
        return count || 0;
      },
      claim: async (row) => {
        const { error } = await svc.from(T).insert(row);
        if (!error) return true;
        if (error.code === "23505") return false;
        throw new Error(error.message);
      },
      release: (channelId, commentId, kind) => svc.from(T).delete().eq("channel_id", channelId).eq("comment_id", commentId).eq("kind", kind).is("result_id", null),
      finish: (channelId, commentId, kind, resultId) => svc.from(T).update({ result_id: resultId }).eq("channel_id", channelId).eq("comment_id", commentId).eq("kind", kind),
    },
  };

  const reply = await handleMcp(raw, deps);
  return reply.body === undefined ? new NextResponse(null, { status: reply.status }) : NextResponse.json(reply.body, { status: reply.status });
}
