// Configure Supabase Auth site_url + redirect allow-list via Management API.
// So magic-link emails redirect back to the deployed app (and localhost for dev).
const REF = process.env.PGREF || "mhnpdkzslgpfujbwyzmh";
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) { console.error("Missing SUPABASE_ACCESS_TOKEN"); process.exit(1); }

const body = {
  site_url: "https://sinara-cast.vercel.app",
  uri_allow_list: [
    "https://sinara-cast.vercel.app",
    "https://sinara-cast.vercel.app/**",
    "http://localhost:3000",
    "http://localhost:3000/**",
  ].join(","),
  mailer_otp_exp: 900,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) { console.error("❌", res.status, await res.text()); process.exit(2); }
const j = await res.json();
console.log("✅ Auth config updated. site_url =", j.site_url);
console.log("   redirect allow list:", j.uri_allow_list);
