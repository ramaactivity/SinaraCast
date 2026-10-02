// MCP server minimal untuk agent Hermes (Bruno): komentar Instagram Tetra.
// JSON-RPC polos, stateless, satu POST = satu jawaban (pola Tetra Ops
// src/lib/ai/mcp.ts). Modul ini tanpa import Next/Supabase supaya bisa diuji
// dengan `node --test`; route /api/mcp menyuntikkan `deps`:
//   deps.channel                 baris channel Tetra (id, owner_id, ig_user_id, handle, access_token, ig_scopes) atau null
//   deps.ig(method, path, {query, body})  -> { status, json }   (graph.instagram.com, token sudah terpasang)
//   deps.log.done(channelId, kind)        -> Set comment_id yang sudah pernah ditindak
//   deps.log.countSince(channelId, kind, iso) -> jumlah aksi sejak iso
//   deps.log.claim(row)          -> true kalau berhasil klaim, false kalau sudah ada (unik per komentar+jenis)
//   deps.log.release(channelId, commentId, kind)   batalkan klaim kalau Instagram menolak
//   deps.log.finish(channelId, commentId, kind, resultId)
//   deps.now()                   -> Date
//
// ponytail: polling saat ig_komentar dipanggil (25 postingan terbaru), tanpa
// webhook. Tambah webhook comments kalau Bruno butuh lebih cepat dari polling.

const PROTOCOL_VERSION = "2025-06-18";
const DAY = 86400 * 1000;
export const LIMITS = { reply: 60, private_reply: 30 };
const SCOPE_COMMENTS = "instagram_business_manage_comments";
const SCOPE_MESSAGES = "instagram_business_manage_messages";
const IZIN = "Izin komentar belum diberikan — sambung ulang channel Tetra di SinaraCast (Manajemen Akun → Sambungkan ulang).";
const SHORTLINK = /\b(bit\.ly|tinyurl\.com|s\.id|t\.co|goo\.gl|cutt\.ly|rb\.gy|shorturl\.at|ow\.ly|is\.gd|lnk\.bio|linktr\.ee)\b/i;

export const TOOLS = [
  {
    name: "ig_komentar",
    description: "Daftar komentar orang lain di postingan/reels Instagram Tetra Photobooth dalam N hari terakhir (komentar milik akun Tetra sendiri dibuang). Pakai bisa_private_reply untuk tahu apakah DM resmi masih boleh dikirim.",
    inputSchema: { type: "object", properties: { hari: { type: "integer", minimum: 1, maximum: 7, description: "Rentang hari ke belakang, 1-7. Default 3." } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ig_balas_komentar",
    description: "Balas komentar secara PUBLIK (muncul di bawah komentar). Satu balasan per komentar. Maks 300 karakter.",
    inputSchema: { type: "object", properties: { comment_id: { type: "string" }, teks: { type: "string", maxLength: 300 } }, required: ["comment_id", "teks"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "ig_private_reply",
    description: "Kirim SATU DM resmi (Private Reply) ke orang yang berkomentar. Hanya untuk komentar ≤7 hari dan belum pernah dikirimi. Maks 500 karakter, tanpa link pendek.",
    inputSchema: { type: "object", properties: { comment_id: { type: "string" }, teks: { type: "string", maxLength: 500 } }, required: ["comment_id", "teks"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
];

const ok = (id, result) => ({ status: 200, body: { jsonrpc: "2.0", id, result } });
const fail = (id, code, message) => ({ status: 200, body: { jsonrpc: "2.0", id, error: { code, message } } });
const toolResult = (id, r) => ok(id, { content: [{ type: "text", text: JSON.stringify(r) }], isError: !!r?.error });
const err = (error) => ({ error });

// Awal hari ini dalam WIB (UTC+7, tanpa DST), sebagai ISO UTC.
export function startOfDayWib(now) {
  const off = 7 * 3600 * 1000;
  return new Date(Math.floor((now.getTime() + off) / DAY) * DAY - off).toISOString();
}

const ownName = (ch) => String(ch.handle || "").replace(/^@/, "").toLowerCase();
const isOwn = (ch, c) => (c.from?.id && String(c.from.id) === String(ch.ig_user_id)) || String(c.username || c.from?.username || "").toLowerCase() === ownName(ch);
const hasScope = (ch, s) => Array.isArray(ch.ig_scopes) && ch.ig_scopes.includes(s);

// Error Graph API → pesan Indonesia. Error izin dipetakan ke instruksi sambung ulang.
function igError(json, fallback) {
  const e = json?.error || {};
  if ([10, 200, 190].includes(e.code) || /permission/i.test(e.message || "")) return IZIN;
  return `${fallback}: ${e.message || "Instagram tidak menjawab"}`;
}

function cekTeks(teks, max) {
  const s = typeof teks === "string" ? teks.trim() : "";
  if (!s) return "teks wajib diisi.";
  if (s.length > max) return `teks maksimal ${max} karakter (sekarang ${s.length}).`;
  return null;
}

async function igKomentar(args, deps) {
  const ch = deps.channel;
  if (!hasScope(ch, SCOPE_COMMENTS)) return err(IZIN);
  const hari = Math.min(7, Math.max(1, Number.isFinite(+args.hari) && +args.hari ? Math.floor(+args.hari) : 3));
  const now = deps.now();
  const cutoff = now.getTime() - hari * DAY;

  const media = await deps.ig("GET", `/${ch.ig_user_id}/media`, { query: { fields: "id,caption,timestamp,comments_count", limit: "25" } });
  if (media.status !== 200) return err(igError(media.json, "Gagal membaca postingan"));

  const [replied, dmed] = await Promise.all([deps.log.done(ch.id, "reply"), deps.log.done(ch.id, "private_reply")]);
  const out = [];
  for (const m of media.json.data || []) {
    if (!m.comments_count) continue;
    const r = await deps.ig("GET", `/${m.id}/comments`, { query: { fields: "id,text,timestamp,username,from,replies{id,username,from}", limit: "50" } });
    if (r.status !== 200) return err(igError(r.json, "Gagal membaca komentar"));
    for (const c of r.json.data || []) {
      const t = Date.parse(c.timestamp);
      if (!(t >= cutoff) || isOwn(ch, c)) continue;
      const terkirim = dmed.has(c.id);
      out.push({
        comment_id: c.id,
        username: c.username || c.from?.username || null,
        teks: c.text || "",
        waktu: c.timestamp,
        media_id: m.id,
        cuplikan_postingan: (m.caption || "").slice(0, 80),
        sudah_dibalas: replied.has(c.id) || (c.replies?.data || []).some((x) => isOwn(ch, x)),
        private_reply_terkirim: terkirim,
        bisa_private_reply: !terkirim && now.getTime() - t <= 7 * DAY,
      });
    }
  }
  out.sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu));
  return { akun: ch.handle, hari, jumlah: out.length, komentar: out };
}

// Klaim → panggil Instagram → selesai/batal. Klaim unik = idempoten per komentar.
async function aksiTulis(kind, args, deps, kirim) {
  const ch = deps.channel;
  const commentId = String(args.comment_id || "");
  if (!/^\d+$/.test(commentId)) return err("comment_id tidak valid.");
  const teks = String(args.teks).trim();
  const since = startOfDayWib(deps.now());
  if ((await deps.log.countSince(ch.id, kind, since)) >= LIMITS[kind]) {
    return err(`Batas harian tercapai (${LIMITS[kind]} ${kind === "reply" ? "balasan publik" : "private reply"}/hari). Coba lagi besok.`);
  }
  const claimed = await deps.log.claim({ owner_id: ch.owner_id, channel_id: ch.id, comment_id: commentId, kind, text: teks, actor: "hermes" });
  if (!claimed) return err(kind === "reply" ? "Komentar ini sudah pernah dibalas lewat Hermes." : "Private reply untuk komentar ini sudah pernah dikirim (Instagram hanya mengizinkan satu).");
  const r = await kirim(commentId, teks);
  const resultId = r.json?.id || r.json?.message_id || null;
  if (r.status !== 200 || !resultId) {
    await deps.log.release(ch.id, commentId, kind);
    return err(igError(r.json, kind === "reply" ? "Gagal membalas komentar" : "Gagal mengirim private reply"));
  }
  await deps.log.finish(ch.id, commentId, kind, String(resultId));
  return { ok: true, comment_id: commentId, id: String(resultId) };
}

async function igBalas(args, deps) {
  if (!hasScope(deps.channel, SCOPE_COMMENTS)) return err(IZIN);
  const bad = cekTeks(args.teks, 300);
  if (bad) return err(bad);
  return aksiTulis("reply", args, deps, (cid, teks) => deps.ig("POST", `/${cid}/replies`, { query: { message: teks } }));
}

async function igPrivateReply(args, deps) {
  const ch = deps.channel;
  if (!hasScope(ch, SCOPE_COMMENTS) || !hasScope(ch, SCOPE_MESSAGES)) return err(IZIN);
  const bad = cekTeks(args.teks, 500) || (SHORTLINK.test(args.teks) ? "Jangan pakai link pendek (bit.ly, s.id, dll) di private reply." : null);
  if (bad) return err(bad);
  const cid = String(args.comment_id || "");
  if (!/^\d+$/.test(cid)) return err("comment_id tidak valid.");
  const c = await deps.ig("GET", `/${cid}`, { query: { fields: "id,timestamp,username,from" } });
  if (c.status !== 200) return err(igError(c.json, "Komentar tidak ditemukan"));
  if (isOwn(ch, c.json)) return err("Itu komentar akun Tetra sendiri.");
  if (!(deps.now().getTime() - Date.parse(c.json.timestamp) <= 7 * DAY)) {
    return err("Komentar sudah lebih dari 7 hari; Instagram tidak mengizinkan private reply lagi. Balas publik saja.");
  }
  return aksiTulis("private_reply", args, deps, (id, teks) =>
    deps.ig("POST", `/${ch.ig_user_id}/messages`, { body: { recipient: { comment_id: id }, message: { text: teks } } }));
}

const RUN = { ig_komentar: igKomentar, ig_balas_komentar: igBalas, ig_private_reply: igPrivateReply };

export async function handleMcp(raw, deps) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(null, -32600, "Invalid Request");
  const id = raw.id ?? null;
  const method = raw.method || "";
  const params = raw.params || {};
  if (method.startsWith("notifications/")) return { status: 202 };

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "sinaracast-ig-tetra", version: "1.0.0" },
        instructions: "Komentar Instagram @tetraphotobooth. Waktu dalam ISO UTC. Private reply hanya sekali per komentar dan ≤7 hari.",
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const name = String(params.name || "");
      const run = RUN[name];
      if (!run) return fail(id, -32602, `Unknown tool: ${name}`);
      if (!deps.channel) return toolResult(id, err("Channel Instagram Tetra belum tersambung di SinaraCast."));
      const args = params.arguments && typeof params.arguments === "object" ? params.arguments : {};
      try {
        return toolResult(id, await run(args, deps));
      } catch (e) {
        return toolResult(id, err(`Tool gagal: ${e?.message || e}`));
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}
