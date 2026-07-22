// Provision a FRESH Supabase project's schema: run schema.sql, then every
// migration in supabase/migrations in chronological (filename) order. Each file
// runs as its own statement batch so `alter type ... add value` in one migration
// is committed before a later migration uses it. Everything is idempotent
// (guarded enums, `add column if not exists`), so this is safe to re-run.
//
// Storage bucket/policies are intentionally SKIPPED — all media now lives on R2.
//
//   node --env-file=.env.local scripts/provision-new.mjs
//
// Needs PGREF, PGHOST (new project), SUPABASE_DATABASE_PASSWORD in the env.
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

const REF = process.env.PGREF, HOST = process.env.PGHOST;
const PASSWORD = process.env.SUPABASE_DATABASE_PASSWORD;
const PORT = process.env.PGPORT || "5432";
if (!REF || !HOST || !PASSWORD) { console.error("Need PGREF, PGHOST, SUPABASE_DATABASE_PASSWORD"); process.exit(1); }

const client = new pg.Client({
  host: HOST, port: Number(PORT), user: `postgres.${REF}`, password: PASSWORD,
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
});
await client.connect();
console.log(`Connected to ${HOST} as postgres.${REF}`);

const run = async (label, sql) => {
  try { await client.query(sql); console.log("  ✓", label); }
  catch (e) { console.error("  ✗", label, "→", e.message); throw e; }
};

const base = new URL("../supabase/", import.meta.url);
await run("schema.sql", await readFile(new URL("schema.sql", base), "utf8"));

const migDir = new URL("migrations/", base);
const files = (await readdir(migDir)).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) await run(`migrations/${f}`, await readFile(new URL(f, migDir), "utf8"));

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by 1;"
);
console.log(`\n✅ Schema provisioned. ${rows.length} public tables:`, rows.map((r) => r.table_name).join(", "));
await client.end();
