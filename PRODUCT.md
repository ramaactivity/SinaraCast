# PRODUCT.md — SinaraCast

> Root context for the coding agent. **Read this first, then the linked docs.** Keep this file short; it orients — the detailed docs are the source of truth. If something here conflicts with a linked doc, the linked doc wins (and flag it).

## What this is
**SinaraCast** — a personal tool that auto-publishes **recurring Instagram Stories** across **4 independent brands** (Mahakan Coffee, Tiska Catering, Tetra Photobooth, Outentika) for a single operator (Rama). Image-first. Runs on a 100% free-tier stack.

## Core model (don't drift from this)
- A **Rule** = pool(s) of images + cadence + posting time (WIB). Two modes: **Schedule** (weekday/weekend pools) and **Pool** (one shuffled pool). Shuffle is **no-repeat** (mark image used only on successful publish; reset when the pool is exhausted).
- **Brands are independent** — no cross-brand broadcasting. Same content on 2 brands = 2 rules.
- Engine must be **reliable**: never double-post; alert on every failure; auto-retry + grace; proactive token refresh; missed-run heartbeat.

## Stack (locked)
- **Next.js** (App Router) on **Vercel Hobby** — UI + thin server routes.
- **Supabase free** — Postgres + Auth (magic link) + Storage.
- **Engine = Supabase `pg_cron` + Edge Functions** (NOT Vercel Cron / Trigger.dev).
- **Instagram API with Instagram Login** (`graph.instagram.com`) — Professional (Business/Creator) accounts, **no Facebook Page**. Scopes: `instagram_business_basic`, `instagram_business_content_publish`.
- **Telegram bot** — failure alerts.

## Working rules for the agent
1. **Start with Spike 1, not the UI.** Prove a Story auto-publishes to one account via Instagram Login in Dev Mode AND is sustainable for daily posting. Then Spike 2 (pg_cron→Edge worker loop + retry/grace + heartbeat), Spike 3 (alerts). Only then build broadly.
2. **Don't restyle the Claude Design frontend.** Note: `frontend/` is a **no-build browser-React prototype** (a single `index.html` loading React + Babel from a CDN, components hung off `window.*`, all data from a global `window.MOCK`) — **not** a Next.js app. So wiring is a **port, not a one-file swap**: lift the presentational components into the Next.js (App Router) app **with the same markup, CSS tokens, and look — no restyle, no rewrite** — and have them consume Supabase queries instead of `window.MOCK`. Keep presentational components untouched in substance; only the data source changes. Mapping: `schema.md §9`, port plan: `tsd.md §10`.
3. **Docs are design-agnostic; visuals are owned by the Claude Design system.** Don't invent UI/visual language in product/backend code or docs.
4. **Tokens + service-role key are server-only.** Browser uses the Supabase anon key under RLS and never sees tokens. Service role only in Edge Functions / server routes.
5. **No double-post.** Use the atomic claim (`pending→publishing`) + unique `claim_key` (see `tsd.md §5.3`).
6. **Times are WIB (UTC+7)**; store UTC, display/author WIB. WIB has no DST but convert explicitly.
7. **Build P1 fully before P2.** P2 = calendar, one-off posts, Feed/carousel/first-comment, caption refiner, library, campaigns. P3 = video/Reels.
8. Mark anything depending on Meta's live API as **[verify in Spike 1]**; pin a Graph version.

## Doc map (source of truth)
- `design.md` — architecture, decisions, roadmap (the "why/what").
- `prd.md` — functional requirements + views + acceptance criteria (design-agnostic).
- `schema.md` — Supabase DDL; **maps 1:1 to `mockdata.jsx` (§9)**.
- `tsd.md` — engine: Meta OAuth + token refresh, 3-step publish + idempotency, pg_cron + Edge worker, shuffle, retry/grace, heartbeat, alerts, data-layer swap (§10).
- `fsd.md` — per-view behavior mapped to the Claude Design screens + FR→view matrix.
- `meta-setup-runbook.md` — one-time Meta + Telegram setup (the first real blocker).
- `claude-design-brief.md` — how the Claude Design system implements the PRD views.

## Open items
- **[VERIFY]** Meta Dev-Mode daily sustainability (Spike 1; App Review fallback for `instagram_business_content_publish`).
- **[DECISION, defaulted]** Brand remove → soft-archive channel + disable its rules. Daily "posted ✓" ping → on.

## How the operator works (Rama)
Casual, decisive, hates double-work. Wants frank pushback over agreeable yes-manning. Prefers incremental confirmation on big moves. Docs in English; chat in Indonesian.
