// Seed the real Mahakan channel for the signed-in owner, using the Spike-1 OAuth
// token + ig_user_id already in .env.local. Idempotent (upsert on owner_id+slug).
import pg from "pg";

const REF = process.env.PGREF;
const HOST = process.env.PGHOST;
const PASSWORD = process.env.SUPABASE_DATABASE_PASSWORD;
const EMAIL = process.env.SEED_EMAIL;
const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
if (!REF || !HOST || !PASSWORD || !EMAIL) { console.error("Need PGREF, PGHOST, SUPABASE_DATABASE_PASSWORD, SEED_EMAIL"); process.exit(1); }

const client = new pg.Client({ host: HOST, port: 5432, user: `postgres.${REF}`, password: PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows: users } = await client.query(`select id from auth.users where email = $1`, [EMAIL]);
if (!users.length) { console.error(`No auth user for ${EMAIL} — sign in once first.`); process.exit(2); }
const owner = users[0].id;
console.log("owner:", owner);

// make sure profile rows exist (trigger should have created them)
await client.query(`insert into app_user (id, email) values ($1,$2) on conflict (id) do nothing`, [owner, EMAIL]);
await client.query(`insert into app_settings (owner_id) values ($1) on conflict (owner_id) do nothing`, [owner]);

const { rows } = await client.query(
  `insert into channel (owner_id, slug, name, handle, ig_user_id, access_token, token_status, token_expires_at, last_refresh_at, followers, color_token)
   values ($1,'mahakan','Mahakan Coffee','@mahakan.coffee',$2,$3,'connected', now() + interval '60 days', now(), 8200, 'mahakan')
   on conflict (owner_id, slug) do update set
     ig_user_id=excluded.ig_user_id, access_token=excluded.access_token,
     token_status='connected', token_expires_at=excluded.token_expires_at, last_refresh_at=now()
   returning id, slug, name, token_status`,
  [owner, IG_USER_ID, IG_ACCESS_TOKEN]
);
console.log("✅ channel:", rows[0]);
await client.end();
