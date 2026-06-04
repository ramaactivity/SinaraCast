# SinaraCast — Spike 1

Goal: prove a Story auto-publishes via **Instagram API with Instagram Login**
(`graph.instagram.com`, Professional account, **no Facebook Page**) in Dev Mode,
and that it's sustainable for daily posting.

Minimal by design — this is NOT the real app. Only `/connect/callback` is reused later.

## Pieces
- `app/connect/start` → redirects to the Instagram OAuth dialog.
- `app/connect/callback` → exchanges `code` → long-lived token, shows token + `ig_user_id`.
- `public/test-story.jpg` → 9:16 image Meta fetches (served over HTTPS by Vercel).
- `publish.mjs` → local 3-step publish (create container → poll FINISHED → publish).

## Run
1. `npm install`
2. `npm run gen-image` (creates `public/test-story.jpg`; or drop your own 9:16 jpg there)
3. Deploy to Vercel: `npx vercel` (first run links the project; `npx vercel --prod` for prod URL)
4. Set deployment env on Vercel: `META_APP_ID`, `META_APP_SECRET`,
   `META_REDIRECT_URI=https://<app>.vercel.app/connect/callback`, `META_GRAPH_VERSION=v25.0`
5. Register that same redirect URI in the Meta app (Instagram Business Login → Alihkan URL)
6. Add the test IG account as an Instagram Tester and accept the invite
7. Visit `https://<app>.vercel.app/connect/start` → authorize → copy token + ig_user_id
8. Fill `.env.local` (`IG_USER_ID`, `IG_ACCESS_TOKEN`, `IMAGE_URL`), then `npm run publish-test`

A Story should appear on the test account. Re-run step 8 daily to test sustainability.

> Everything Meta-dependent here is **[verify in Spike 1]**: exact OAuth hosts,
> long-lived exchange, and the `graph.instagram.com` publish shape. The scripts
> print raw responses so we adapt to the live API.
