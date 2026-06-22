# SinaraCast — Meta App Review prep

Everything needed to submit Instagram permissions for **Advanced Access**. Fill the
`[...]` placeholders (they live in one place: `spike1/lib/legalInfo.js` for the legal
identity; test-account details below).

App: **Instagram API with Instagram Login** (not Facebook Login).
Permissions requested: `instagram_business_basic`, `instagram_business_content_publish`,
`instagram_business_manage_insights`.

---

## 0. Order of operations
1. **Business Verification first** (see §4). App Review can't pass without it.
2. Complete **App settings** (§5) — privacy URL, data deletion URL, app icon, category.
3. Record the **screencast** (§3) and write the **permission justifications** (§2).
4. Submit each permission for Advanced Access with its justification + screencast.

---

## 1. What the app does (use-case summary — paste into "App details")
SinaraCast is a social media scheduling and auto-publishing tool for small businesses
and creators in Indonesia. A user signs in, connects their own Instagram professional
account via Instagram Login, uploads or schedules content (Stories, Feed, Reels), and
SinaraCast publishes it automatically at the chosen time, then shows performance metrics.
The app is multi-tenant: each user only sees and manages their own connected accounts and
content (enforced by database row-level security).

Website: https://[domain] · Privacy: https://[domain]/privacy ·
Terms: https://[domain]/terms · Data deletion: https://[domain]/data-deletion

---

## 2. Per-permission justifications (paste into each permission's form)

**instagram_business_basic**
> SinaraCast uses instagram_business_basic to identify the Instagram professional account
> the user connects — reading the account ID, username, and profile picture — so the user
> can confirm they linked the correct account and so we can attribute scheduled posts and
> metrics to the right channel in their dashboard. It is requested during the user's own
> Instagram Login authorization and used only to display and manage their own account.

**instagram_business_content_publish**
> This is the core feature: SinaraCast uses instagram_business_content_publish to publish
> content that the user creates and schedules — images, videos, Reels, carousels, and
> Stories — to the user's own Instagram professional account at the time they choose. The
> user uploads media and sets a schedule in the app; at the scheduled time our server
> creates the media container and publishes it via the Content Publishing API. We only
> publish content the user explicitly created and scheduled.

**instagram_business_manage_insights**
> SinaraCast uses instagram_business_manage_insights to retrieve performance metrics
> (such as reach, views, likes, and comments) for posts the user published through the
> app, and account-level insights, so we can show the user how their scheduled content
> performed in a Summary/Calendar view. Metrics are read-only and shown only to the
> account owner.

---

## 3. Screencast script (record one clear, narrated video)
Show the full flow end-to-end, demonstrating each permission. Use a real test
professional account (§6). Keep it under ~3 minutes, screen + optional voiceover.

1. **Sign in** — open https://[domain], sign in with email + 6-digit code. (Shows the app is real and gated.)
2. **Connect Instagram** — click "Tambah channel" → complete Instagram Login → return to the app. Show the connected account's username + photo appear. *(demonstrates instagram_business_basic)*
3. **Create & schedule a post** — go to "Buat Postingan", pick Story/Reels/Feed, upload an image/video, write a caption, pick a time, click "Jadwalkan". Show it on the Calendar as scheduled. *(sets up instagram_business_content_publish)*
4. **Publish** — either wait for the scheduled run or trigger it, then show the post live on the Instagram account. *(demonstrates instagram_business_content_publish)*
5. **View metrics** — open "Ringkasan"/"Riwayat" and show reach/views/likes pulled for the published post. *(demonstrates instagram_business_manage_insights)*
6. **Data deletion** — open Pengaturan → Data → "Hapus semua data" (or just show the page) to demonstrate the deletion control referenced in the privacy policy.

---

## 4. Business Verification checklist (the gating item)
The solo-founder path works (reference: a comparable Indonesian app is verified as a sole
proprietorship). Prepare:
- [ ] **NIB** (Nomor Induk Berusaha) from OSS — register as *Usaha Perorangan*.
- [ ] **NPWP** (tax ID).
- [ ] Legal owner name, business name, and address **matching the documents exactly**
      (even "Ltd" vs "Limited"-level mismatches get rejected — keep everything identical
      to `lib/legalInfo.js`).
- [ ] A **verified domain** + a **domain-based email** (e.g. support@[domain]); free
      Gmail is not accepted for the business email.
- [ ] Upload official documents only (NIB/NPWP) — not invoices, marketing, or screenshots.

---

## 5. App-settings checklist (Meta App Dashboard)
- [ ] App icon (1024×1024), name "SinaraCast", category set.
- [ ] Privacy Policy URL → https://[domain]/privacy
- [ ] Terms of Service URL → https://[domain]/terms
- [ ] **Data Deletion Instructions URL** → https://[domain]/data-deletion
- [ ] Valid OAuth redirect URI(s) configured and matching production.
- [ ] App not in obvious test/placeholder state; business email reachable.

---

## 6. Reviewer access / test account
Provide so a Meta reviewer can reproduce the flow:
- [ ] A SinaraCast login the reviewer can use (test email + how to get the code), **or**
      clear instructions if you grant them a temporary account.
- [ ] A test **Instagram professional account** added as an **Instagram Tester** in the
      app roles (the reviewer may also use Meta's own test account).
- [ ] Step-by-step written instructions identical to §3.

---

## 7. After approval
The connect flow stays identical (the "Tambah channel" OAuth popup); once the app is in
Live Mode, end users no longer need to be pre-registered as testers. Each end user's
Instagram must still be a professional (Business/Creator) account. Instagram content
publishing is limited to ~50 posts per 24h per account.
