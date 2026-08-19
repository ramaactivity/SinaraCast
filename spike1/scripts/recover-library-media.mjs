// Fix the broken library thumbnails left by the storage migration: the 20 dead
// media_asset rows (bare old-storage paths) linked to historical one-off posts.
//   - feed/reels: re-fetch the published media from Instagram (Graph API), push to
//     R2, and re-point storage_path. Carousels are mapped child-by-position.
//   - expired stories (media gone upstream): point at a neutral placeholder on R2.
// media_asset rows are NEVER deleted (scheduled_post_media FK is on-delete-restrict,
// and they are post history). Reversible backup written before any DB write.
//
//   node --env-file=.env.local scripts/recover-library-media.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(raw.split("\n").map((l) => l.replace(/^#\s*/, "")).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).replace(/^["']|["']$/g, "").trim()]; }));
const pick = (...ks) => ks.map((k) => process.env[k] || env[k]).find(Boolean);
const URL_ = pick("NEXT_PUBLIC_SUPABASE_URL"), SVC = pick("SERVICE_ROLE_SECRET", "SUPABASE_SERVICE_ROLE_KEY");
const V = pick("META_GRAPH_VERSION") || "v25.0";
const R2 = { account: pick("R2_ACCOUNT_ID"), key: pick("R2_ACCESS_KEY_ID"), secret: pick("R2_SECRET_ACCESS_KEY"), bucket: pick("R2_BUCKET"), base: (pick("R2_PUBLIC_BASE") || "").replace(/\/+$/, "") };
const PLACEHOLDER_FILE = "/private/tmp/claude-501/-Users-masrampc-Desktop-SinaraCast/c09fba0e-3a4f-4737-b491-6d02bed71ac3/scratchpad/placeholder.png";
const s3 = new S3Client({ region: "auto", endpoint: `https://${R2.account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2.key, secretAccessKey: R2.secret } });
const isBare = (s) => s && !/^https?:\/\//i.test(s);
async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await res.text(); if (!res.ok) throw new Error(`${path} -> ${res.status} ${t}`); return t ? JSON.parse(t) : null;
}
const putR2 = async (key, body, ct) => { await s3.send(new PutObjectCommand({ Bucket: R2.bucket, Key: key, Body: body, ContentType: ct })); return `${R2.base}/${key}`; };

// gather
const ma = (await rest(`media_asset?select=id,tag,storage_path,channel_id`)).filter((r) => isBare(r.storage_path));
const links = await rest(`scheduled_post_media?select=asset_id,post_id,position`);
const linkByAsset = Object.fromEntries(links.map((l) => [l.asset_id, l]));
const posts = Object.fromEntries((await rest(`scheduled_post?select=id,post_type`)).map((p) => [p.id, p]));
const runs = {}; for (const r of await rest(`post_run?select=scheduled_post_id,ig_media_id,status`)) if (r.scheduled_post_id && !runs[r.scheduled_post_id]) runs[r.scheduled_post_id] = r;
const chTok = Object.fromEntries((await rest(`channel?select=id,access_token`)).map((c) => [c.id, c.access_token]));

// upload placeholder once
const placeholderUrl = await putR2(`system/media-unavailable.png`, readFileSync(PLACEHOLDER_FILE), "image/png");
console.log("placeholder:", placeholderUrl);

// cache IG media lookups per ig_media_id (with carousel children)
const igCache = new Map();
async function igMedia(id, token) {
  if (igCache.has(id)) return igCache.get(id);
  const u = new URL(`https://graph.instagram.com/${V}/${id}`);
  u.searchParams.set("fields", "media_type,media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}");
  u.searchParams.set("access_token", token);
  const j = await (await fetch(u)).json().catch(() => ({}));
  igCache.set(id, j); return j;
}
const imgUrlOf = (node) => node?.media_type === "VIDEO" ? (node.thumbnail_url || node.media_url) : node?.media_url;

const backup = []; let recovered = 0, placeheld = 0, failed = 0;
for (const a of ma) {
  const link = linkByAsset[a.id]; const post = posts[link?.post_id] || {}; const run = runs[link?.post_id] || {};
  try {
    let newUrl = null;
    if ((post.post_type === "feed" || post.post_type === "reels") && run.ig_media_id && chTok[a.channel_id]) {
      const m = await igMedia(run.ig_media_id, chTok[a.channel_id]);
      const node = m?.children?.data?.length ? m.children.data[link.position ?? 0] || m.children.data[0] : m;
      const src = imgUrlOf(node);
      if (src) {
        const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
        newUrl = await putR2(`recovered/${a.id}.jpg`, buf, "image/jpeg");
        recovered++;
      }
    }
    if (!newUrl) { newUrl = placeholderUrl; placeheld++; }
    backup.push({ id: a.id, tag: a.tag, before: a.storage_path, after: newUrl });
    await rest(`media_asset?id=eq.${a.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ storage_path: newUrl }) });
  } catch (e) { failed++; console.error("  fail", a.id, String(e.message).slice(0, 80)); }
}
const dir = `${tmpdir()}/sinaracast-media-recover`; mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/backup.json`, JSON.stringify(backup, null, 2));
console.log(`\n✅ Done. recovered from IG: ${recovered} | placeholder: ${placeheld} | failed: ${failed}`);
console.log(`Backup: ${dir}/backup.json`);
