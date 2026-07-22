// Import auth.users + auth.identities into the NEW project, preserving UUIDs so
// public.* owner_id rows stay valid and OTP login re-binds to the same account by
// email. auth.users/identities have GENERATED columns (confirmed_at, email) that
// reject direct inserts, so we insert only the non-generated columns that are
// actually present in the dump.
//
//   DUMP_DIR=/path node --env-file=.env.local scripts/import-auth.mjs
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import pg from "pg";

const REF = process.env.PGREF, HOST = process.env.PGHOST;
const PASSWORD = process.env.SUPABASE_DATABASE_PASSWORD;
const DUMP = process.env.DUMP_DIR || `${tmpdir()}/sinaracast-dbdump`;
const dir = new URL(`file://${DUMP.replace(/\/*$/, "/")}`);

const c = new pg.Client({
  host: HOST, port: Number(process.env.PGPORT || 5432), user: `postgres.${REF}`,
  password: PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
});
await c.connect();
await c.query("set session_replication_role = replica;");

for (const [schema, table, conflict] of [["auth", "users", "id"], ["auth", "identities", "id"]]) {
  const rows = JSON.parse(await readFile(new URL(`${schema}.${table}.json`, dir), "utf8"));
  if (!rows.length) { console.log(`  – ${schema}.${table}: empty`); continue; }
  const nonGen = (await c.query(
    `select column_name from information_schema.columns
       where table_schema=$1 and table_name=$2 and is_generated='NEVER' order by ordinal_position;`,
    [schema, table]
  )).rows.map((r) => r.column_name);
  const present = new Set(Object.keys(rows[0]));
  const cols = nonGen.filter((cn) => present.has(cn));
  const list = cols.map((cn) => `"${cn}"`).join(", ");
  try {
    const res = await c.query(
      `insert into ${schema}.${table} (${list})
         select ${list} from jsonb_populate_recordset(null::${schema}.${table}, $1::jsonb)
         on conflict (${conflict}) do nothing;`,
      [JSON.stringify(rows)]
    );
    console.log(`  ✓ ${schema}.${table}: ${res.rowCount}/${rows.length} inserted (${cols.length} cols)`);
  } catch (e) {
    console.error(`  ✗ ${schema}.${table}: ${e.message}`);
  }
}
await c.query("set session_replication_role = default;");
await c.end();
