// One-off rescue: copy the OLD project's pool-images files → Cloudflare R2, then
// rewrite the NEW DB's bare Supabase storage paths to absolute R2 URLs.
//
// Why: the 2026-07 migration moved DB rows but NOT the image *files*. New uploads
// go to R2; ~297 pre-migration pool images still live only in the old project's
// `pool-images` bucket, so their thumbnails are broken on the new project. The old
// project must be temporarily UN-restricted (remove spend cap / upgrade) first —
// while restricted, storage returns HTTP 402 and this script's preflight aborts.
//
// Idempotent: rows whose storage_path is already an http(s) URL are skipped, so it
// is safe to re-run (e.g. if it stops partway). A reversible backup of every
// (table,id,old_path) it changes is written OUTSIDE the repo before any DB write.
//
//   node --env-file=.env.local scripts/migrate-images-to-r2.mjs           # real run
//   DRY=1 node --env-file=.env.local scripts/migrate-images-to-r2.mjs     # plan only
//
// Needs (from .env.local): NEW SUPABASE_URL + SERVICE_ROLE key, the five R2_* vars,
// and the OLD project's storage key (OLD_SUPABASE_API_KEY, even if commented out).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ---- env (also read commented `# OLD_...=` lines) --------------------------
const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  raw.split("\n").map((l) => l.replace(/^#\s*/, ""))
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).replace(/^["']|["']$/g, "").trim()]; })
);
const pick = (...ks) => ks.map((k) => process.env[k] || env[k]).find(Boolean);

const NEW_URL = pick("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const NEW_SVC = pick("SERVICE_ROLE_SECRET", "SUPABASE_SERVICE_ROLE_KEY");
const OLD_URL = pick("OLD_SUPABASE_URL") || "https://mhnpdkzslgpfujbwyzmh.supabase.co";
const OLD_KEY = pick("OLD_SUPABASE_API_KEY");
const R2 = {
  account: pick("R2_ACCOUNT_ID"), key: pick("R2_ACCESS_KEY_ID"), secret: pick("R2_SECRET_ACCESS_KEY"),
  bucket: pick("R2_BUCKET"), base: (pick("R2_PUBLIC_BASE") || "").replace(/\/+$/, ""),
};
const DRY = process.env.DRY === "1";
const CONCURRENCY = 6;
const OLD_BUCKET = "pool-images";

for (const [k, v] of Object.entries({ NEW_URL, NEW_SVC, OLD_KEY, ...R2 }))
  if (!v) { console.error(`Missing required config: ${k}`); process.exit(1); }

const s3 = new S3Client({
  region: "auto", endpoint: `https://${R2.account}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2.key, secretAccessKey: R2.secret },
});
const isHttp = (p) => /^https?:\/\//i.test(p || "");
const CT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime" };
const ctFor = (k) => CT[(k.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

async function rest(path, init = {}) {
  const res = await fetch(`${NEW_URL}/rest/v1/${path}`, {
    ...init, headers: { apikey: NEW_SVC, Authorization: `Bearer ${NEW_SVC}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`REST ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// ---- 1) gather the bare (non-http) paths still pointing at old storage -------
const poolRows = await rest(`pool_image?select=id,storage_path`);
const assetRows = await rest(`media_asset?select=id,storage_path`);
const work = []; // {table, id, path}
for (const r of poolRows) if (r.storage_path && !isHttp(r.storage_path)) work.push({ table: "pool_image", id: r.id, path: r.storage_path });
for (const r of assetRows) if (r.storage_path && !isHttp(r.storage_path)) work.push({ table: "media_asset", id: r.id, path: r.storage_path });
const uniquePaths = [...new Set(work.map((w) => w.path))];
console.log(`Rows to rewrite: ${work.length} (pool_image ${poolRows.filter(r=>!isHttp(r.storage_path)).length}, media_asset ${assetRows.filter(r=>!isHttp(r.storage_path)).length})`);
console.log(`Distinct files to copy to R2: ${uniquePaths.length}`);
if (!work.length) { console.log("Nothing to do — all paths already absolute URLs."); process.exit(0); }

// ---- 2) preflight: is old storage actually unlocked? ------------------------
async function fetchOld(key) {
  const res = await fetch(`${OLD_URL}/storage/v1/object/${OLD_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`,
    { headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` } });
  if (res.status === 402) throw new Error("OLD_STILL_LOCKED");
  if (!res.ok) throw new Error(`download ${key} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
try { await fetchOld(uniquePaths[0]); }
catch (e) {
  if (e.message === "OLD_STILL_LOCKED") {
    console.error("\n⛔ Old project storage is STILL restricted (HTTP 402). Remove the spend cap / upgrade the OLD project first, then re-run.");
    process.exit(2);
  }
  throw e;
}
console.log("✓ Old storage reachable — proceeding.\n");
if (DRY) { console.log(`DRY run: would copy ${uniquePaths.length} files and rewrite ${work.length} rows.`); process.exit(0); }

// ---- 3) backup the current mapping (reversible) -----------------------------
const backupDir = `${tmpdir()}/sinaracast-image-migrate`;
mkdirSync(backupDir, { recursive: true });
writeFileSync(`${backupDir}/rows-before.json`, JSON.stringify(work, null, 2));
console.log(`Backup of original paths: ${backupDir}/rows-before.json\n`);

// ---- 4) copy each file old-storage -> R2 (same key) -------------------------
const r2UrlFor = (key) => `${R2.base}/${key}`;
const done = new Map(); // path -> r2 url
const failed = [];
let n = 0;
async function copyOne(key) {
  try {
    const body = await fetchOld(key);
    await s3.send(new PutObjectCommand({ Bucket: R2.bucket, Key: key, Body: body, ContentType: ctFor(key) }));
    done.set(key, r2UrlFor(key));
  } catch (e) { failed.push({ key, error: e.message }); }
  if (++n % 20 === 0 || n === uniquePaths.length) console.log(`  copied ${n}/${uniquePaths.length}`);
}
// simple concurrency pool
const queue = [...uniquePaths];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { let k; while ((k = queue.shift())) await copyOne(k); }));
console.log(`\nCopied ${done.size}/${uniquePaths.length} files to R2. Failed: ${failed.length}`);
if (failed.length) writeFileSync(`${backupDir}/failed.json`, JSON.stringify(failed, null, 2));

// ---- 5) rewrite DB rows whose file copied OK --------------------------------
let updated = 0;
for (const w of work) {
  const url = done.get(w.path);
  if (!url) continue; // file failed to copy — leave row untouched
  await rest(`${w.table}?id=eq.${w.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ storage_path: url }) });
  updated++;
}
console.log(`Rewrote ${updated} DB rows to R2 URLs.`);

// ---- 6) verify a sample loads over https ------------------------------------
const sample = [...done.values()].slice(0, 5);
for (const u of sample) {
  const r = await fetch(u, { method: "HEAD" });
  console.log(`  verify ${r.status}  ${u}`);
}
console.log(`\n✅ Done. ${updated} rows now point at R2.${failed.length ? ` ${failed.length} files failed — see ${backupDir}/failed.json` : ""}`);
