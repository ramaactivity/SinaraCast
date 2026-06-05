// Expand the pool-images bucket to also accept Reels video (mp4/mov) + larger
// files, so one-off Reels can be uploaded alongside Story/Feed images.
// Run: node --env-file=.env.local supabase/setup-media-bucket.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_SECRET;
if (!url || !key) { console.error("Missing SUPABASE url/service key in env"); process.exit(1); }

const svc = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await svc.storage.updateBucket("pool-images", {
  public: true,
  fileSizeLimit: 52428800, // 50 MB (Supabase free-tier global cap)
  allowedMimeTypes: ["image/jpeg", "image/png", "video/mp4", "video/quicktime"],
});
console.log("updateBucket pool-images:", error ? `ERROR ${error.message}` : "ok", data || "");
process.exit(error ? 1 : 0);
