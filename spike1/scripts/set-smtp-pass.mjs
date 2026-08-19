// Set the FULL Gmail SMTP block on the active Supabase project's auth config via
// the Management API. Use this whenever the auth OTP email fails to send.
//
// GOTCHAS (learned 2026-07-22 migration):
//  - Management API GET never returns the real smtp_pass — it echoes a 64-char
//    ENCRYPTED blob. You cannot copy SMTP from one project to another; you must
//    set the real 16-char Gmail App Password (from SMTP_GMAIL_APP_PASSWORD).
//  - PATCHing smtp_pass ALONE wipes smtp_host/user/etc. Always send the full block.
//
//   node --env-file=.env.local scripts/set-smtp-pass.mjs
//
// Needs PGREF (active project), SUPABASE_ACCESS_TOKEN, SMTP_GMAIL_APP_PASSWORD.
const REF = process.env.PGREF;
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const PASS = process.env.SMTP_GMAIL_APP_PASSWORD;
const USER = process.env.SMTP_USER || "rama.activity98@gmail.com";
if (!REF || !PAT || !PASS) { console.error("Need PGREF, SUPABASE_ACCESS_TOKEN, SMTP_GMAIL_APP_PASSWORD"); process.exit(1); }

const body = {
  external_email_enabled: true,
  smtp_admin_email: USER,
  smtp_host: "smtp.gmail.com",
  smtp_port: "465",
  smtp_user: USER,
  smtp_pass: PASS,
  smtp_sender_name: "SinaraCast",
  smtp_max_frequency: 5,
  rate_limit_otp: 30,
};
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) { console.error("❌", res.status, await res.text()); process.exit(2); }
const j = await res.json();
console.log("✅ SMTP set:", j.smtp_host, j.smtp_port, j.smtp_user, "| email enabled:", j.external_email_enabled);
