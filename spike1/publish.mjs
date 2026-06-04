// SinaraCast — Spike 1 local publish test (3-step Story publish).
// Run:  node publish.mjs    (reads env from spike1/.env.local via --env-file)
// Needs: IG_USER_ID, IG_ACCESS_TOKEN, IMAGE_URL  (and optional META_GRAPH_VERSION)
//
// All raw responses are printed so we can confirm the live API shape
// against tsd.md §4.4 — this is the [verify in Spike 1] step.

const V = process.env.META_GRAPH_VERSION || "v25.0";
const IG = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const IMAGE_URL = process.env.IMAGE_URL;
const BASE = `https://graph.instagram.com/${V}`;

if (!IG || !TOKEN || !IMAGE_URL) {
  console.error(
    "Missing env. Set IG_USER_ID, IG_ACCESS_TOKEN, IMAGE_URL in spike1/.env.local"
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, params) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log(`Graph version: ${V}\nig_user_id: ${IG}\nimage_url: ${IMAGE_URL}\n`);

  // 1) create STORIES container
  let { status, json } = await call("POST", `/${IG}/media`, {
    media_type: "STORIES",
    image_url: IMAGE_URL,
    access_token: TOKEN,
  });
  console.log("1) CREATE container:", status, json);
  if (!json.id) throw new Error("No creation_id returned");
  const creationId = json.id;

  // 2) poll until FINISHED
  let statusCode = "";
  for (let i = 0; i < 20; i++) {
    ({ status, json } = await call("GET", `/${creationId}`, {
      fields: "status_code,status",
      access_token: TOKEN,
    }));
    statusCode = json.status_code;
    console.log(`2) POLL #${i}:`, status, json);
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR") throw new Error("Container ERROR: " + JSON.stringify(json));
    await sleep(3000);
  }
  if (statusCode !== "FINISHED") throw new Error("Container not FINISHED in time");

  // 3) publish
  ({ status, json } = await call("POST", `/${IG}/media_publish`, {
    creation_id: creationId,
    access_token: TOKEN,
  }));
  console.log("3) PUBLISH:", status, json);
  if (!json.id) throw new Error("Publish failed");
  const mediaId = json.id;

  // 4) permalink (optional)
  ({ status, json } = await call("GET", `/${mediaId}`, {
    fields: "permalink",
    access_token: TOKEN,
  }));
  console.log("4) PERMALINK:", status, json);

  console.log(`\n✅ DONE — media_id=${mediaId} permalink=${json.permalink || "(n/a)"}`);
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e.message);
  process.exit(1);
});
