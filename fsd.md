# Functional Specification Document (FSD): SinaraCast

> **Version:** 1.0
> **Pairs with:** `prd.md` v2 (FRs) · `design.md` v6 · `schema.md` v1 (data) · `tsd.md` v1 (engine). Describes the **behavior of each view as built in the Claude Design frontend** (`app/views/*`, `app/shell.jsx`), tied to its FR(s) and backend operation. Visuals are owned by the design system; this doc is behavior only.
> **How to read:** each view lists *Purpose · Entry/Exit · Reads · Actions (→ effect [FR] / backend op) · States · Edge cases.* "Backend op" refers to a TSD §10 action or engine path.

---

## 0. Global model

**Views (from `shell.jsx` NAV + routes):** Rules [P1], Calendar [P2], Activity [P1], Connections [P1] in the main menu; Settings + Profile at the sidebar bottom; plus Sign-in, Magic-link landing, Onboarding, Rule editor, Composer [P2], Library [P2], Notifications — reached contextually. Navigation is via `app.go(view, params)`; the active view + active channel live in the global store (`store.jsx`).

**Channel context:** a single **active channel** scopes most views (Rules, Activity, Composer, Library). The sidebar **channel switcher** lists all channels with a status dot (Connected/Expiring/Needs-reconnect) and a "dijeda" marker; selecting one sets `app.channel`. Brand data never mixes (FR brand-isolation).

**Conventions (every data view):**
- **States:** `loading` (skeleton) → `ready` | `empty` (prompt + primary action) | `error` (message + "Muat ulang"). Driven by `useFetchState`; real impl swaps to query status.
- **Toasts:** transient confirmations (`app.toast(msg, type)`); important events also persist to the notification center (TSD §9).
- **Confirm dialog:** all destructive actions (delete rule, remove brand, disconnect Telegram, delete data, sign out) route through a `Confirm` naming the consequence.
- **Pause banner:** when `pause_all` is on, a "Semua posting dijeda" banner shows in the sidebar and the engine produces no runs (FR-19).
- **Times:** displayed in WIB everywhere.

---

## 1. Sign-in [P1] (FR-1)
- **Purpose:** request a magic link.
- **Reads:** none.
- **Actions:** enter email → "Kirim magic link" → `signInWithOtp` → switch to "Cek email kamu" confirmation (with the address + change-email). 
- **States:** default form; invalid email → inline, button disabled; sent → confirmation.
- **Exit:** following the emailed link → Magic-link landing.

## 2. Magic-link landing [P1] (FR-1)
- **Purpose:** complete sign-in from the email link.
- **Actions:** auto-verify → on success route into the app (Rules); on expired/invalid → "Link kedaluwarsa" + "Kirim link baru" (resend). No dead end.
- **States:** "Lagi masuk…" (verifying) → success-redirect | expired-error.

## 3. Onboarding / Setup [P1] (FR-31)
- **Purpose:** guide one-time Meta setup.
- **Reads:** onboarding steps + their done-state (derive from real state: channels connected, `telegram_connected`).
- **Actions:** mark a step done → toast "Langkah selesai"; "Sambungkan channel" → `app.go("connections")`; link to the full Meta Setup Runbook.
- **States:** stepper with done / current / upcoming; resumable.
- **Edge:** shown until ≥1 channel connected; re-accessible from Connections.

## 4. Rules (home) [P1] (FR-6, 9, 16, 17, 20)
- **Purpose:** manage the active channel's recurring rules; see at-a-glance health.
- **Entry:** default landing after sign-in; channel-scoped.
- **Reads:** `recurring_rule` for `app.channel` (+ derived `cycle`, `nextRun`, `todayStatus`, `runs7` via `v_rule_summary`); a small activity summary; a "what's next" inspector.
- **Actions:**
  - **New rule** → `app.go("editor", {mode:'schedule', isNew:true})` (then mode chosen in editor) [FR-6].
  - **Toggle active** per rule → optimistic; toast "diaktifkan/dinonaktifkan"; writes `recurring_rule.active` [FR-6]. Engine skips inactive rules.
  - **Open rule** (click card) → `app.go("editor", {id})`.
  - **Skip today** → toast "dilewati hari ini"; writes a `day_override(type='skip', on_date=today)` [FR-16].
  - **Swap today** → opens a **swap modal** (pick an image from the pool) → toast "Gambar untuk hari ini diganti"; writes `day_override(type='swap', swap_image_id)` [FR-17].
  - **Post now** → triggers the rule's pipeline immediately (server route, needs token); logged as a `manual` run; result toast + appears in Activity [FR-15].
  - **Delete rule** → Confirm → toast "dihapus" [FR-6].
- **States:** loading skeletons; **empty** = "Belum ada aturan" + "Bikin aturan pertama"; error + reload.
- **Edge:** if the active channel is **Needs-reconnect**, show a danger banner ("sambungkan ulang") linking to Connections, and indicate rules are held; the engine won't publish for it [FR-4].

## 5. Rule editor [P1] (FR-6, 7, 8, 13, 14, 15)
- **Purpose:** configure a rule (create or edit).
- **Entry:** from Rules (New / open). Params: `{id}` or `{isNew, mode}`.
- **Reads (edit):** the rule + its pool(s) + `pool_image`s + overrides/holidays.
- **Actions:**
  - **Mode:** Schedule (weekday + weekend pools) or Pool (single pool) [FR-6].
  - **Upload image** → client+server validation (9:16/format/size); valid → toast "diunggah & divalidasi (9:16)" and added to the pool; invalid → rejected with reason [FR-8]. Add/remove images; shuffle-cycle state shown (`used/total`).
  - **Cadence + time** (Schedule: weekday/weekend times; Pool: single time) + **grace** [FR-14]; clash warning if the time collides with another rule on the channel [FR-15 / collision].
  - **Holidays/skip dates** management [FR-18].
  - **Save** → validates required fields (else toast "Lengkapi data yang wajib"); on success toast "disimpan" → `app.go("rules")` [FR-6].
  - **Delete** → Confirm → toast → Rules [FR-6].
  - **Post now / test** available [FR-15].
- **States:** **empty pool** state ("Kolam masih kosong" + upload) blocks save; validation inline.
- **Edge:** Schedule-mode pools clearly labeled weekday vs weekend to prevent wrong-pool mistakes (FR-8 edge).

## 6. Connections [P1] (FR-2, 3, 4, 5, 30-Telegram, 31)
- **Purpose:** connect/manage channels + Telegram + Meta setup.
- **Reads:** all `channel`s (status, token info, paused), `app_settings.telegram*`, onboarding state.
- **Actions:**
  - **Connect channel** → if at 4: toast "Maksimal 4 channel…"; else toast "Membuka otorisasi Meta…" → OAuth flow (TSD §4.2): connecting → success | permission-denied [FR-2].
  - **Reconnect** (Needs-reconnect/Expiring) → toast "Menyambungkan ulang…" → "tersambung kembali"; refreshes token/status [FR-4].
  - **Pause/resume channel** → toast "dijeda/dilanjutkan"; writes `channel.paused` (+ `resume_date`) [FR-19].
  - **Edit brand identity** (modal) → rename/avatar/color → toast "Identitas brand diperbarui" [FR-5].
  - **Remove brand** → Confirm → toast "dihapus — rule-nya dinonaktifkan" (soft-archive channel + disable its rules per schema decision) [FR-5].
  - **Telegram:** connect (modal → toast "terhubung") / disconnect (Confirm → "diputus") [FR-24 setup].
  - **Meta setup checklist** → link to Onboarding.
- **States:** loading skeletons → ready; a channel row reflects its live status + paused marker.

## 7. Activity [P1] (FR-12, 27, 28, 29)
- **Purpose:** see run history; debug failures.
- **Reads:** `post_run` (+ channel/rule names + `post_attempt`) via `v_activity`, filterable; `v_storage`.
- **Actions:**
  - **Filter** by channel (All / per brand) [FR-27].
  - **Open run** → **run detail** (modal): media, channel, rule, pool/image, scheduled vs actual, trigger (scheduled/manual/retry/swap), status, post link, and the **attempt log** [FR-28].
  - **Retry** on a failed run → re-enqueues the run (server) [FR-27].
- **States:** loading; **empty** = "Belum ada aktivitas"; error + reload. Storage indicator with near-limit warning [FR-29].
- **Edge:** statuses shown: Published / Scheduled / Publishing / Failed / Skipped; failure rows carry a reason.

## 8. Notification center [P1] (FR-26)
- **Purpose:** in-app mirror of alerts.
- **Entry:** topbar bell (unread count).
- **Reads:** `notification` rows (type error/warn/success, title, body, time, read, run link).
- **Actions:** open an item → mark read + `app.go("activity")` (or the related source); **mark all read** → toast.
- **States:** loading; empty = "Belum ada notifikasi".

## 9. Settings [P1] (FR-19, 22, 24, 25, 29, 30)
- **Purpose:** app behavior + account.
- **Reads:** `app_settings`, storage.
- **Actions:**
  - **Pause-all** toggle → toast "Semua posting dijeda/dilanjutkan"; writes `app_settings.pause_all` (+ optional resume date) [FR-19].
  - **Telegram** connect [FR-24]; **failure alert** locked-on; **daily ping** toggle [FR-25].
  - **Timezone** (WIB) + **default grace** [FR-14 default].
  - **Storage** overview [FR-29]; **Export data** → toast "Menyiapkan ekspor…"; **Delete all data** → Confirm (danger) → toast.
  - **Sign out** → Confirm → `app.go("signin")`.
- **States:** standard; save-fail → toast.

## 10. Profile [P1] (FR-1, 30)
- **Purpose:** identity + sign out.
- **Reads:** `app_user`.
- **Actions:** edit name → Save → toast "Profil disimpan"; shows email + login method ("Magic link") + joined; **Keluar** → Confirm → signin.

---

## P2 views

## 11. Calendar / Planner [P2] (FR-32)
- **Purpose:** see scheduled + published content across days.
- **Reads:** computed **recurring runs** (from active rules' cadence) ∪ **one-off** `scheduled_post`s; filterable by channel.
- **Actions:** switch **Month/Week**; navigate months; legend (Terjadwal/Terbit/Gagal/One-off); **New one-off** → `app.go("composer", {ch})`; open an item → its detail (one-off → Composer/editor; recurring run → its rule, with skip/swap for that day).
- **States:** loading; **empty** = "Belum ada konten terjadwal" + "Buat one-off post".
- **Edge:** one-off items are visually distinct from recurring runs; status colors per run state.

## 12. Composer (one-off post) [P2] (FR-33, 34, 35, 36, 37)
- **Purpose:** create/schedule a one-off Story or Feed post.
- **Entry:** from Calendar ("New one-off") or Library. Params: `{ch}`.
- **Reads:** channel context; (optional) library media.
- **Actions:**
  - **Type:** Story (9:16, 1 image) or Feed (caption + carousel up to 10) [FR-33, 34]. Switching enforces media rules (Story = 1 image → toast if more).
  - **Media:** upload (validated → toast "divalidasi ✓") or **pick from library** → `app.go("library")` [FR-38].
  - **Caption** (Feed) with char counter + over-limit invalid state [FR-34].
  - **Caption refiner** → "Bikin natural" → loading → replaces caption (toast "disempurnakan ke brand voice"); **↩ Kembalikan asli** reverts [FR-35]. Absent for Story.
  - **First comment** (Feed) for hashtags, auto-posted after publish [FR-34].
  - **Save draft** → toast "Disimpan sebagai draft" (`scheduled_post.status='draft'`) [FR-36].
  - **Schedule** → toast "Post dijadwalkan {date} {time} WIB" → `app.go("calendar")` [FR-33]; editable/reschedulable before publish [FR-37].
- **States:** valid = media present (+ Feed: non-empty caption within limit); invalid blocks schedule.

## 13. Media library [P2] (FR-38)
- **Purpose:** browse/reuse media per brand.
- **Reads:** `media_asset` for the channel; tags; derived usage.
- **Actions:** filter by tag (Semua/Menu/Promo/Event/…); see usage indicator (which rule/post uses it); (upload). Picking flows back to Composer.
- **States:** loading; **empty** = "Tidak ada media" (per filter) + upload/clear-filter.

---

## 14. Cross-cutting behaviors

- **Active-channel reconnect:** any channel in Needs-reconnect surfaces prominently (switcher dot + Rules banner) and is excluded from publishing until reconnected (FR-4).
- **Pause precedence:** global pause-all > per-channel pause > per-rule active > per-day skip. The engine checks them in that order (TSD §5.3).
- **Optimistic updates:** toggles/quick edits apply immediately, revert + toast on failure.
- **Manual vs auto runs:** manual (post-now) and swap runs are labeled distinctly in Activity/run-detail (trigger type).
- **Validation gate:** invalid media never enters a pool/post; rules/posts can't be saved/scheduled while invalid.

---

## 15. Traceability (FR → views)

| FR | Primary view(s) |
|---|---|
| FR-1 sign-in | Sign-in, Magic-link landing, Profile |
| FR-2/3/4/5 channels & brand mgmt | Connections (+ switcher) |
| FR-6 rules CRUD | Rules, Rule editor |
| FR-7/8 pools+validation | Rule editor |
| FR-9..13 selection/publish | engine (visible in Activity/run detail) |
| FR-14/15 schedule/collision | Rule editor |
| FR-16/17/18 overrides | Rules (skip/swap), Rule editor (holidays) |
| FR-19 pause-all | Settings, sidebar banner, Connections (per-channel) |
| FR-20 post-now | Rules, Rule editor |
| FR-21/22/23 reliability | engine → Activity, Notifications |
| FR-24/25/26 alerts | Settings (config), Notifications (mirror) |
| FR-27/28 activity | Activity, run detail |
| FR-29 storage | Activity, Settings |
| FR-30 settings | Settings, Profile |
| FR-31 onboarding | Onboarding, Connections |
| FR-32 calendar | Calendar |
| FR-33..37 one-off/feed/refiner/drafts | Composer, Calendar |
| FR-38 media library | Library, Composer |

---

*Next doc: **Meta Setup Runbook** — the one-time, click-by-click onboarding (developer account → app + Development Mode → tester → Business + Page → tokens → connect channels → Telegram), which the in-app Onboarding view mirrors.*
