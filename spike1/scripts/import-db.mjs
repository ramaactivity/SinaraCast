// Import the exported JSON dump into a FRESH, already-provisioned Supabase
// project. Uses jsonb_populate_recordset so Postgres coerces every type (jsonb,
// arrays, timestamps) from the dumped row JSON back into real columns.
//
// auth.users + auth.identities are loaded FIRST and with their original UUIDs, so
// every public.* owner_id keeps pointing at the same account (OTP login matches by
// email and reuses the id). Triggers + FK checks are disabled for the load via
// session_replication_role = replica, so table order and the handle_new_user
// trigger don't get in the way. ON CONFLICT DO NOTHING makes re-runs safe.
//
//   DUMP_DIR=/path/to/dump node --env-file=.env.local scripts/import-db.mjs
//
// Needs PGREF, PGHOST (new project) + SUPABASE_DATABASE_PASSWORD; DUMP_DIR points
// at the folder export-db.mjs wrote (_manifest.json + *.json).
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import pg from "pg";

const REF = process.env.PGREF, HOST = process.env.PGHOST;
const PASSWORD = process.env.SUPABASE_DATABASE_PASSWORD;
const DUMP = process.env.DUMP_DIR || `${tmpdir()}/sinaracast-dbdump`;
if (!REF || !HOST || !PASSWORD) { console.error("Need PGREF, PGHOST, SUPABASE_DATABASE_PASSWORD"); process.exit(1); }

const dir = new URL(`file://${DUMP.replace(/\/*$/, "/")}`);
const manifest = JSON.parse(await readFile(new URL("_manifest.json", dir), "utf8"));

const client = new pg.Client({
  host: HOST, port: 5432, user: `postgres.${REF}`, password: PASSWORD,
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
});
await client.connect();
console.log(`Connected to ${HOST} as postgres.${REF}`);

await client.query("set session_replication_role = replica;"); // disable triggers + FK checks
let ok = 0, fail = 0;
for (const { schema, table, file, rows } of manifest) {
  if (!rows) { console.log(`  – ${schema}.${table}: 0 rows, skip`); continue; }
  const data = await readFile(new URL(file, dir), "utf8");
  try {
    const res = await client.query(
      `insert into ${schema}.${table}
         select * from jsonb_populate_recordset(null::${schema}.${table}, $1::jsonb)
         on conflict do nothing;`,
      [data]
    );
    console.log(`  ✓ ${schema}.${table}: ${res.rowCount}/${rows} inserted`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${schema}.${table}: ${e.message}`);
    fail++;
  }
}
await client.query("set session_replication_role = default;");
console.log(`\n${fail ? "⚠️" : "✅"} Import done — ${ok} tables loaded, ${fail} failed.`);
await client.end();
process.exit(fail ? 2 : 0);
