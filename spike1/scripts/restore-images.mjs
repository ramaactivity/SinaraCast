// Restore locked pool images from the user's local content stash → R2, then
// re-link each pool's dead (bare-path) pool_image rows to the new R2 URLs.
//
// Each MAP entry points a local folder at one pool, identified by channel slug +
// recurring_rule name + pool role (so we hit the exact pool). Files are sorted by
// name and assigned to that pool's bare rows in `position` order, in place (ids and
// positions preserved). Count mismatch is reported, never guessed: extra files are
// skipped, extra dead rows are left untouched for a follow-up decision.
//
//   ONE=1 node --env-file=.env.local scripts/restore-images.mjs   # upload+verify a single file, no DB writes
//   DRY=1 node --env-file=.env.local scripts/restore-images.mjs   # plan only
//   FILTER=tiska node --env-file=.env.local scripts/restore-images.mjs   # only entries whose slug matches
//         node --env-file=.env.local scripts/restore-images.mjs   # full run
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const H = homedir();
// folder → pool (channel slug + rule name + role). Content-verified mappings only.
const MAP = [
  { folder: `${H}/Documents/SINARA CAST/STORY TISKA`, slug: "tiska-catering", rule: "DAILY STORY", role: "single" },
  { folder: `${H}/Documents/SINARA CAST/OUTENTIKA/OUTENTIKA BACKUP/QUOTES`, slug: "outentika", rule: "Quotes", role: "single" },
  { folder: `${H}/Documents/SINARA CAST/OUTENTIKA/OUTENTIKA BACKUP/LOCATION`, slug: "outentika", rule: "Location", role: "single" },
  { folder: `${H}/Documents/SINARA CAST/OUTENTIKA/OUTENTIKA BACKUP/OPERATIONAL HOURS`, slug: "outentika", rule: "Jam Buka Outentika", role: "weekday" },
  { folder: `${H}/Documents/SINARA CAST/OUTENTIKA/OUTENTIKA BACKUP/ALT`, slug: "outentika", rule: "Alt Parfum", role: "single" },
  { folder: `${H}/Documents/SINARA CAST/OUTENTIKA/DO - Alt Perfumery & Space Design`, slug: "outentika", rule: "Alt Parfum", role: "single" },
  { folder: `${H}/Documents/OUTENTIKA NEW JULY/BATCH 1`, slug: "outentika", rule: "NEW SERIES JULY", role: "single" },
];

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(raw.split("\n").map((l) => l.replace(/^#\s*/, "")).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).replace(/^["']|["']$/g, "").trim()]; }));
const pick = (...ks) => ks.map((k) => process.env[k] || env[k]).find(Boolean);
const NEW_URL = pick("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const SVC = pick("SERVICE_ROLE_SECRET", "SUPABASE_SERVICE_ROLE_KEY");
const R2 = { account: pick("R2_ACCOUNT_ID"), key: pick("R2_ACCESS_KEY_ID"), secret: pick("R2_SECRET_ACCESS_KEY"), bucket: pick("R2_BUCKET"), base: (pick("R2_PUBLIC_BASE") || "").replace(/\/+$/, "") };
const ONE = process.env.ONE === "1", DRY = process.env.DRY === "1", FILTER = process.env.FILTER || "";
for (const [k, v] of Object.entries({ NEW_URL, SVC, ...R2 })) if (!v) { console.error(`Missing config: ${k}`); process.exit(1); }

const s3 = new S3Client({ region: "auto", endpoint: `https://${R2.account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2.key, secretAccessKey: R2.secret } });
const CT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };
const isBare = (s) => s && !/^https?:\/\//i.test(s);
const imgs = (dir) => { try { return readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort(); } catch { return []; } };

async function rest(path, init = {}) {
  const res = await fetch(`${NEW_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`REST ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// resolve each MAP entry → pool_id + its bare rows
const channels = await rest(`channel?select=id,slug`);
const rules = await rest(`recurring_rule?select=id,name,channel_id`);
const pools = await rest(`pool?select=id,rule_id,role`);
const idBySlug = Object.fromEntries(channels.map((c) => [c.slug, c.id]));
function resolvePool(m) {
  const chId = idBySlug[m.slug];
  const rule = rules.find((r) => r.channel_id === chId && r.name === m.rule);
  if (!rule) return null;
  return pools.find((p) => p.rule_id === rule.id && String(p.role) === m.role) || null;
}

const backupDir = `${tmpdir()}/sinaracast-restore`;
mkdirSync(backupDir, { recursive: true });
const uploadOne = async (file, slug) => {
  const ext = extname(file).slice(1).toLowerCase();
  const key = `${slug}/restore/${basename(file, extname(file))}.${ext === "jpeg" ? "jpg" : ext}`;
  const Body = readFileSync(file);
  await s3.send(new PutObjectCommand({ Bucket: R2.bucket, Key: key, Body, ContentType: CT[ext] || "application/octet-stream" }));
  return `${R2.base}/${key}`;
};

// ONE-file smoke test: upload the first Tiska image and verify it serves over https.
if (ONE) {
  const m = MAP[0]; const files = imgs(m.folder);
  if (!files.length) { console.error("No files in", m.folder); process.exit(1); }
  const url = await uploadOne(join(m.folder, files[0]), m.slug);
  const head = await fetch(url, { method: "HEAD" });
  console.log(`Uploaded 1 test file → ${url}\n  HEAD ${head.status} (${head.headers.get("content-type")})`);
  process.exit(head.ok ? 0 : 1);
}

const backup = [];
for (const m of MAP) {
  if (FILTER && !`${m.slug} ${m.rule} ${m.folder}`.toLowerCase().includes(FILTER.toLowerCase())) continue;
  const pool = resolvePool(m);
  const files = imgs(m.folder);
  if (!pool) { console.log(`✗ ${m.slug}/${m.rule}/${m.role}: pool not found — SKIP`); continue; }
  const rows = (await rest(`pool_image?select=id,storage_path,position&pool_id=eq.${pool.id}&order=position`)).filter((r) => isBare(r.storage_path));
  console.log(`\n▶ ${m.slug} · ${m.rule} · ${m.role}: ${files.length} files → ${rows.length} dead rows`);
  const n = Math.min(files.length, rows.length);
  if (files.length !== rows.length) console.log(`  ⚠ count mismatch — will fill ${n}; leftover files ${Math.max(0, files.length - n)}, leftover dead rows ${Math.max(0, rows.length - n)}`);
  if (DRY) continue;
  for (let i = 0; i < n; i++) {
    const url = await uploadOne(join(m.folder, files[i]), m.slug);
    backup.push({ id: rows[i].id, before: rows[i].storage_path, after: url });
    await rest(`pool_image?id=eq.${rows[i].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ storage_path: url }) });
    if ((i + 1) % 25 === 0 || i + 1 === n) console.log(`  linked ${i + 1}/${n}`);
  }
}
if (!DRY && backup.length) {
  writeFileSync(`${backupDir}/relinked.json`, JSON.stringify(backup, null, 2));
  console.log(`\n✅ Re-linked ${backup.length} rows. Reversible backup: ${backupDir}/relinked.json`);
}
