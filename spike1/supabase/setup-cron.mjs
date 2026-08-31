// Schedule a per-minute pg_cron job that pings /api/cron via pg_net.
// The secret is stored in Supabase Vault (encrypted) and referenced by the job,
// so it is NOT written in plaintext into cron.job.command.
import pg from "pg";

const REF = process.env.PGREF, HOST = process.env.PGHOST;
const PASSWORD = process.env.SUPABASE_DATABASE_PASSWORD;
const SECRET = process.env.CRON_SECRET;
const ENDPOINT = process.env.CRON_ENDPOINT || "https://sinara-cast.vercel.app/api/cron";
if (!REF || !HOST || !PASSWORD || !SECRET) { console.error("Need PGREF, PGHOST, SUPABASE_DATABASE_PASSWORD, CRON_SECRET"); process.exit(1); }

const c = new pg.Client({ host: HOST, port: 5432, user: `postgres.${REF}`, password: PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();
const q = (s, p) => c.query(s, p);

await q("create extension if not exists pg_cron;");
await q("create extension if not exists pg_net;");

// store/refresh secret in Vault (encrypted at rest); job references it, never inlines it.
// Use Vault functions + the decrypted_secrets view only (direct vault.secrets is restricted).
const { rows: ex } = await q("select id from vault.decrypted_secrets where name = 'sinaracast_cron_secret';");
if (ex.length) await q("select vault.update_secret($1, $2);", [ex[0].id, SECRET]);
else await q("select vault.create_secret($1, 'sinaracast_cron_secret');", [SECRET]);

try { await q("select cron.unschedule(jobid) from cron.job where jobname = 'sinaracast-tick';"); } catch {}

// pg_net defaults to a 5s timeout, which every tick used to blow past — the response
// was discarded and the request replayed, so each minute ran twice. 50s covers a real
// publish while still finishing inside the one-minute schedule.
const command = `select net.http_post(
  url := '${ENDPOINT}',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sinaracast_cron_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 50000
);`;
await q("select cron.schedule('sinaracast-tick', '* * * * *', $job$" + command + "$job$);");

const { rows } = await q("select jobid, jobname, schedule, active from cron.job where jobname = 'sinaracast-tick';");
console.log("✅ cron job:", rows[0]);
const { rows: chk } = await q("select (position('x-cron-secret' in command) > 0) as refs_header, (position($1 in command) > 0) as leaks_secret from cron.job where jobname='sinaracast-tick';", [SECRET]);
console.log("secret leaked into job command?", chk[0].leaks_secret, "(should be false)");
await c.end();
