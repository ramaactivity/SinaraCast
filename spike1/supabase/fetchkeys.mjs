// Fetch project API keys via Supabase Management API using SUPABASE_ACCESS_TOKEN,
// then write anon -> ANON_PUBLIC_KEY and service_role -> SERVICE_ROLE_SECRET into .env.local.
// Prints only masked values.
import { readFile, writeFile } from "node:fs/promises";

const REF = process.env.PGREF || "mhnpdkzslgpfujbwyzmh";
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) { console.error("Missing SUPABASE_ACCESS_TOKEN"); process.exit(1); }

const mask = (s) => (s ? s.slice(0, 8) + "…" + s.slice(-4) + ` (len ${s.length})` : "(none)");

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${PAT}` },
});
if (!res.ok) {
  console.error("❌ Management API error:", res.status, await res.text());
  process.exit(2);
}
const keys = await res.json();
console.log("Keys returned:");
for (const k of keys) console.log(`  - name=${k.name} type=${k.type || "?"} value=${mask(k.api_key)}`);

const find = (n) => keys.find((k) => k.name === n)?.api_key;
const anon = find("anon");
const service = find("service_role");
if (!anon || !service) {
  console.error("\n⚠️ Could not find both 'anon' and 'service_role' by name. See list above.");
  process.exit(3);
}

// update .env.local
const path = new URL("../.env.local", import.meta.url);
let env = await readFile(path, "utf8");
function setVar(name, val) {
  const line = `${name}=${val}`;
  if (new RegExp(`^${name}=.*$`, "m").test(env)) env = env.replace(new RegExp(`^${name}=.*$`, "m"), line);
  else env += (env.endsWith("\n") ? "" : "\n") + line + "\n";
}
setVar("ANON_PUBLIC_KEY", anon);
setVar("SERVICE_ROLE_SECRET", service);
setVar("SUPABASE_URL", `https://${REF}.supabase.co`);
await writeFile(path, env);
console.log("\n✅ Wrote ANON_PUBLIC_KEY, SERVICE_ROLE_SECRET, SUPABASE_URL into .env.local");
console.log("   anon   :", mask(anon));
console.log("   service:", mask(service));
