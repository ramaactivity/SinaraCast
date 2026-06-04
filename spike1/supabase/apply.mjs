// Apply schema.sql to Supabase Postgres.
// Reads password from SUPABASE_DATABASE_PASSWORD (via --env-file=.env.local),
// host/ref from PGHOST/PGREF env so no secret is ever passed on the command line.
import { readFile } from "node:fs/promises";
import pg from "pg";

const REF = process.env.PGREF;
const HOST = process.env.PGHOST;
const PASSWORD = process.env.SUPABASE_DATABASE_PASSWORD;
const PORT = process.env.PGPORT || "5432";
if (!REF || !HOST || !PASSWORD) {
  console.error("Need PGREF, PGHOST env and SUPABASE_DATABASE_PASSWORD in .env.local");
  process.exit(1);
}

const SQL_FILE = process.env.SQL_FILE || "./schema.sql";
const sql = await readFile(new URL(SQL_FILE, import.meta.url), "utf8");
console.log("Applying:", SQL_FILE);
const client = new pg.Client({
  host: HOST,
  port: Number(PORT),
  user: `postgres.${REF}`,
  password: PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  console.log(`Connected to ${HOST} as postgres.${REF}`);
  await client.query(sql);
  const { rows } = await client.query(
    `select table_name from information_schema.tables
       where table_schema='public' order by table_name`
  );
  console.log("✅ Schema applied. public tables:");
  for (const r of rows) console.log("  -", r.table_name);
} catch (e) {
  console.error("❌ FAILED:", e.message);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
