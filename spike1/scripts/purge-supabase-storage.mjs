// One-shot cleanup: delete EVERY object in the Supabase `pool-images` bucket.
//
// WHY: all media has moved to Cloudflare R2 (egress-free). The old Supabase files
// (~1.8 GB) are what keep the free-tier `exceed_storage_size_quota` violation
// active. They can only be deleted through the Storage API, which returns HTTP 402
// while the project is restricted — so RUN THIS ONLY AFTER the billing period
// resets (04 Aug 2026) and Supabase lifts the restriction. Originals are kept
// locally, so these files are disposable.
//
//   node scripts/purge-supabase-storage.mjs            # dry run (lists, deletes nothing)
//   node scripts/purge-supabase-storage.mjs --commit   # actually delete
//
// Reads SUPABASE_URL + SUPABASE_API_KEY (service role) from spike1/.env.local.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "pool-images";
const COMMIT = process.argv.includes("--commit");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; })
);
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_API_KEY; // service role
if (!url || !key) { console.error("Missing SUPABASE_URL / SUPABASE_API_KEY in .env.local"); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });

// Recursively list every object path under a prefix (Storage lists one level at a
// time; folders have no size/id metadata).
async function listAll(prefix = "") {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data.length) break;
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null && e.metadata === null) out.push(...await listAll(path)); // folder
      else out.push(path);
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

const paths = await listAll();
const totalBytes = 0; // sizes need per-object HEAD; count is enough to confirm scope
console.log(`Found ${paths.length} objects in ${BUCKET}.`);
if (!COMMIT) {
  console.log("DRY RUN — nothing deleted. Re-run with --commit to delete.");
  console.log(paths.slice(0, 10).map((p) => "  " + p).join("\n") + (paths.length > 10 ? `\n  … +${paths.length - 10} more` : ""));
  process.exit(0);
}

let done = 0;
for (let i = 0; i < paths.length; i += 100) {
  const batch = paths.slice(i, i + 100);
  const { error } = await sb.storage.from(BUCKET).remove(batch);
  if (error) { console.error("remove error:", error.message); process.exit(1); }
  done += batch.length;
  console.log(`deleted ${done}/${paths.length}`);
}
console.log(`✔ Deleted ${done} objects. Supabase storage should now drop below 1 GB.`);
