// Export all app data from the OLD (restricted) Supabase project to JSON files,
// using the Management API SQL endpoint (works even while the project is HTTP-402
// restricted, because it runs server-side and barely touches egress).
//
// Dumps every public table + auth.users + auth.identities as a JSON array via
// jsonb_agg(row). The import side (import-db.mjs) reloads these with
// jsonb_populate_recordset so Postgres does all the type coercion (jsonb, arrays,
// timestamps) faithfully. auth.users/identities are included so the two accounts
// keep the SAME UUIDs — otherwise every owner_id row would be orphaned.
//
//   node scripts/export-db.mjs
//
// Reads OLD project ref + SUPABASE_ACCESS_TOKEN from spike1/.env.local.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; })
);
const REF = process.env.OLD_REF || "mhnpdkzslgpfujbwyzmh";
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error("Missing SUPABASE_ACCESS_TOKEN"); process.exit(1); }

// NEVER write the dump inside the repo — it holds auth rows + OAuth tokens.
// Pass an absolute DUMP_DIR (outside the repo); default to the OS temp dir.
import { tmpdir } from "node:os";
const dumpDir = process.env.DUMP_DIR || `${tmpdir()}/sinaracast-dbdump`;
const OUT = new URL(`file://${dumpDir.replace(/\/*$/, "/")}`);
try { mkdirSync(OUT, { recursive: true }); } catch {}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

// Ordered so imports with FKs mostly work even without deferral; the importer also
// disables triggers/constraints, so this is just tidy-not-required.
const publicTables = (await query(
  `select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' order by c.relname;`
)).map((r) => r.relname);

const targets = [
  { schema: "auth", table: "users" },
  { schema: "auth", table: "identities" },
  ...publicTables.map((t) => ({ schema: "public", table: t })),
];

const manifest = [];
for (const { schema, table } of targets) {
  const rows = await query(`select coalesce(jsonb_agg(t), '[]'::jsonb) as data from ${schema}.${table} t;`);
  const data = rows[0]?.data ?? [];
  const name = `${schema}.${table}.json`;
  writeFileSync(new URL(name, OUT), JSON.stringify(data));
  manifest.push({ schema, table, rows: data.length, file: name });
  console.log(`  ${schema}.${table}: ${data.length} rows`);
}
writeFileSync(new URL("_manifest.json", OUT), JSON.stringify(manifest, null, 2));
console.log(`\n✔ Exported ${targets.length} tables to ${OUT.pathname}`);
