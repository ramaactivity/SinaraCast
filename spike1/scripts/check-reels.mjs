// One-off status check for Rama's 19:00 WIB Reels test on TISKA Catering.
// Reads .env.local for the service-role Supabase creds and prints the latest
// scheduled_post + post_run state for today's reels post on the tiska channel.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SERVICE_ROLE_SECRET || env.SUPABASE_API_KEY;
const svc = createClient(url, key, { auth: { persistSession: false } });

const wib = (iso) => iso ? new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().replace("T", " ").slice(0, 19) + " WIB" : "—";

// Find the tiska channel (handle/slug contains "tiska")
const { data: chans } = await svc.from("channel").select("id, slug, handle, platform").ilike("handle", "%tiska%");
const ch = (chans || [])[0];
if (!ch) { console.log("Channel tiska tidak ditemukan."); process.exit(0); }

const { data: posts } = await svc.from("scheduled_post")
  .select("id, post_type, caption, status, scheduled_at, created_at")
  .eq("channel_id", ch.id).eq("post_type", "reels")
  .order("scheduled_at", { ascending: false }).limit(3);

console.log(`Channel: ${ch.handle || ch.slug} (${ch.platform})  now=${wib(new Date().toISOString())}`);
for (const p of posts || []) {
  const { data: runs } = await svc.from("post_run")
    .select("status, fail_reason, permalink, published_at, created_at")
    .eq("scheduled_post_id", p.id).order("created_at", { ascending: false }).limit(1);
  const r = (runs || [])[0];
  console.log("─".repeat(60));
  console.log(`Reels  scheduled_at=${wib(p.scheduled_at)}`);
  console.log(`  caption : ${(p.caption || "").slice(0, 50)}`);
  console.log(`  POST    : status=${p.status}`);
  console.log(`  RUN     : status=${r?.status || "—"}  published_at=${wib(r?.published_at)}`);
  if (r?.permalink) console.log(`  LINK    : ${r.permalink}`);
  if (r?.fail_reason) console.log(`  FAIL    : ${r.fail_reason}`);
}
