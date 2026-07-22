// Apply the captured auth config (site_url + redirect allow-list + Gmail SMTP +
// the branded "Kode masuk SinaraCast" OTP email + 30/hr OTP rate limit) to the
// NEW project via the Management API. Without this, the new project falls back to
// Supabase's built-in mailer, which only delivers to project members — real users
// would never receive their login code.
//
//   AUTH_CONFIG_FILE=/abs/path/auth-config.json \
//     node --env-file=.env.local scripts/apply-auth.mjs
//
// Needs PGREF (new project) + SUPABASE_ACCESS_TOKEN (new PAT). The config file is
// the out-of-repo capture (holds smtp_pass) — never commit it.
import { readFileSync } from "node:fs";

const REF = process.env.PGREF;
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const FILE = process.env.AUTH_CONFIG_FILE;
if (!REF || !PAT || !FILE) { console.error("Need PGREF, SUPABASE_ACCESS_TOKEN, AUTH_CONFIG_FILE"); process.exit(1); }

const body = JSON.parse(readFileSync(FILE, "utf8"));
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) { console.error("❌", res.status, await res.text()); process.exit(2); }
const j = await res.json();
console.log("✅ Auth config applied. site_url =", j.site_url, "| smtp_host =", j.smtp_host, "| otp rate =", j.rate_limit_otp);
