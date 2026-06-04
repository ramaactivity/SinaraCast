# SinaraCast — Planning & Build Docs

Personal multi-brand Instagram **Story automation** for four independent brands (Mahakan Coffee, Tiska Catering, Tetra Photobooth, Outentika). Single operator (Rama). Free-tier stack.

## The two contracts
- **Product/behavior** is defined by the docs here (design-agnostic).
- **Visuals** are owned entirely by the **design system built in Claude Design** (the frontend in `Content.zip`). These docs never dictate look.

## Read in this order
1. **design.md** — architecture + product model + decisions (the "why/what" + free-tier engine + Meta reality + roadmap).
2. **prd.md** — functional requirements, all phases (P1 core · P2 calendar/one-off/feed/refiner/library · P3 video). **Design-agnostic.** Defines the views + acceptance criteria.
3. **schema.md** — Supabase Postgres schema (DDL, enums, RLS, indexes). Maps **1:1 to the Claude Design `mockdata.jsx`** (§9) so wiring is mechanical.
4. **tsd.md** — how the engine works: Meta OAuth + token refresh, 3-step publish pipeline + idempotency, pg_cron + Edge worker, shuffle, retry/grace, heartbeat, WIB↔UTC, alerts, and the mockdata→Supabase swap plan (§10).
5. **fsd.md** — per-view behavior mapped to the actual Claude Design screens, each tied to its FR + backend op; FR→view traceability (§15).
6. **meta-setup-runbook.md** — one-time Meta setup (the first real blocker; you have no Meta account yet).
7. **claude-design-brief.md** — paste-ready brief so Claude Design implements these views using your design system.

## Build order (do NOT start with the UI)
1. **Spike 1 — Meta publish + sustainability** (runbook + tsd §12). Prove a Story auto-publishes to one account *and keeps working daily*. Gates everything.
2. **Spike 2 — pg_cron → Edge worker** publish loop + retry/grace + heartbeat.
3. **Spike 3 — alerts** (Telegram + in-app mirror).
4. Wire the Claude Design frontend by swapping `mockdata.jsx`/`store.jsx` → Supabase per tsd §10 + schema §9. Build P1 fully, then P2.

## Key finding (Meta)
Use **"Instagram API with Instagram Login"** (launched Jul 2024): publishes to Professional (Business/Creator) accounts **without a linked Facebook Page**. This likely lets us drop the Facebook-Page step from design.md/tsd.md — confirm in Spike 1. Scopes: `instagram_business_basic`, `instagram_business_content_publish`; host `graph.instagram.com`.

## Open decisions (defaults already applied in schema)
- Brand remove → soft-archive channel + disable its rules (default).
- Daily "posted ✓" ping → on (default).
- [VERIFY] Meta Dev-Mode daily sustainability = Spike 1.

## Not in this bundle (superseded)
`design-system.md` (old "wefha" visual system) and `stitch-brief.md` (Google Stitch) are obsolete — visuals now live in Claude Design. Left in the folder for history only.

## In this bundle
- Root `.md` files — the planning/build docs (start with **PRODUCT.md**).
- `frontend/` — the Claude Design output (the built React UI + design system). Wire it to Supabase via the data layer only (do not restyle): `schema.md §9` + `tsd.md §10`.
