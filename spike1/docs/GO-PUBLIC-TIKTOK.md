# Go-Public TikTok — Audit Readiness Checklist

SinaraCast can connect TikTok accounts and auto-publish **video** today, but every
post is forced **private (SELF_ONLY)** and the TikTok account must itself be set to
**Private**. To post **publicly** (and to other people's accounts) the TikTok app must
pass **TikTok audit**. This doc is the checklist to get there.

## The flag that gates everything

`TIKTOK_AUDITED` (Vercel env, default `false`).
- While `false`: composer locks privacy to "Hanya saya", branded content is disabled,
  and the engine forces `SELF_ONLY` regardless of UI. Read by `lib/tiktokCore.js`.
- After ACC: set `TIKTOK_AUDITED=true` on Vercel → redeploy. The composer then offers the
  privacy levels TikTok returns from `creator_info`, and public posting works.

## 1. Production app config (developers.tiktok.com → app → Production)
- [ ] App icon 1024×1024, App name "SinaraCast", Category "Productivity", Description.
- [ ] **Terms of Service URL** → `https://sinara-cast.vercel.app/terms`
- [ ] **Privacy Policy URL** → `https://sinara-cast.vercel.app/privacy`
- [ ] Platforms: **Web**. Login Kit Redirect URI → `https://sinara-cast.vercel.app/connect/tiktok/callback`
- [ ] Content Posting API → **Direct Post** ON.
- [ ] Scopes: `user.info.basic`, `video.publish`.
- [ ] Move Vercel env `TIKTOK_CLIENT_KEY/SECRET` from Sandbox creds to **Production** creds.

## 2. UX compliance (already built — verify before recording demo)
TikTok audit checks the posting screen follows their UX guidelines. Our composer
(`views/composer.jsx` → `TikTokOptions`) already provides:
- [ ] "Who can view" privacy selector (driven by `creator_info` privacy options).
- [ ] Allow Comment / Duet / Stitch toggles, **disabled** when the account disables them.
- [ ] Commercial-content disclosure → "Your brand" / "Branded content", with the required
      label text; branded content blocked when private.
- [ ] Music Usage Confirmation consent (required to post).
- [ ] "Posting as @username" from `creator_info`.

## 3. Demo video (required for submission)
Record in **Sandbox**, showing the complete end-to-end flow, screen + interactions:
1. Open SinaraCast → sign in.
2. Connections → **Sambungkan TikTok** → OAuth consent → account connected.
3. Composer → pick TikTok account → upload a 9:16 video → set privacy + interaction
   toggles + (if applicable) commercial disclosure + accept music confirmation.
4. Schedule → show the video auto-publishing to TikTok (the post appears on the account).
- mp4/mov, ≤50 MB each, ≤5 files. Domain shown must match `sinara-cast.vercel.app`.

## 4. Submit for review
- [ ] In Production, "Submit for review" → explain each product/scope + paste the demo video.
- [ ] Expect 1–3 rounds of feedback; respond promptly.

## 5. After ACC
- [ ] Set `TIKTOK_AUDITED=true` on Vercel → redeploy.
- [ ] Verify composer now offers Public/Friends and a public post publishes.
- [ ] (Optional) raise rate limits / request additional scopes if needed.

## Out of scope (later)
- Photo/carousel (needs TikTok **domain verification** for `PULL_FROM_URL` — verify
  `sinara-cast.vercel.app` or a custom domain, then serve images from it).
- TikTok recurring rules.
