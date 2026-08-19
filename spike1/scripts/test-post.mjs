// Fire ONE real post through the exact engine path the cron uses (publishForRule),
// to verify auto-publish works end-to-end after the migration/restore. Defaults to
// the Tiska "DAILY STORY" rule — an Instagram Story, which self-expires in 24h.
//
//   RULE="DAILY STORY" SLUG=tiska-catering node --env-file=.env.local scripts/test-post.mjs
import { svcClient, publishForRule, roleForNow } from "../lib/publishCore.js";

const RULE = process.env.RULE || "DAILY STORY";
const SLUG = process.env.SLUG || "tiska-catering";

const svc = svcClient();
const { data: chans } = await svc.from("channel").select("*").eq("slug", SLUG);
const channel = chans?.[0];
if (!channel) { console.error(`Channel ${SLUG} not found`); process.exit(1); }
const { data: rules } = await svc.from("recurring_rule").select("*").eq("channel_id", channel.id).eq("name", RULE);
const rule = rules?.[0];
if (!rule) { console.error(`Rule "${RULE}" not found on ${SLUG}`); process.exit(1); }

console.log(`Channel: ${channel.handle} (${channel.token_status}) | Rule: ${rule.name} | mode: ${rule.mode}`);
if (!channel.ig_user_id || !channel.access_token) { console.error("Channel not connected (missing ig_user_id/access_token)"); process.exit(1); }

const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
const role = roleForNow(rule.mode, nowWib.getUTCDay());
console.log(`Publishing role="${role}" now…\n`);

const result = await publishForRule(svc, {
  channel, rule, role, trigger: "manual", claimKey: `test:${rule.id}:${Date.now()}`,
});
console.log("RESULT:", JSON.stringify(result, null, 2));
process.exit(result?.ok ? 0 : 1);
