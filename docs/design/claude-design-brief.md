# Claude Design Brief — Build SinaraCast (PRD × your design system)

A ready-to-paste instruction set so Claude Design studies the **PRD** (functional contract) and **the design system you're building in this project** (visual contract), then builds the frontend by fusing them.

> Note: this brief deliberately does **not** name or describe any specific design system. The visual source of truth is whatever design system currently lives in your Claude Design project. The PRD stays design-agnostic on purpose.

## How to use
1. In your Claude Design project (where your **design system** already lives), attach **`prd.md`**.
2. Paste the **Master Brief** below.
3. Drive it through the **Build Sequence** one step at a time (review between steps).
4. Keep the two roles separate: **PRD = what to build & how it behaves. Your design system = how it looks.** Claude Design's job is to fuse them.

---

## MASTER BRIEF (paste first)

> You are building the frontend for **SinaraCast**, a personal multi-brand Instagram automation tool (four independent brands: Mahakan Coffee, Tiska Catering, Tetra Photobooth, Outentika). You have two source contracts — study BOTH before designing:
>
> 1. **The PRD (`prd.md`)** — the *functional* contract. It defines every view, behavior, flow, state, and acceptance criterion. It is intentionally **design-agnostic** (no visual instructions). It is the source of truth for *what to build and how it behaves*. Do NOT add features or change scope; build only what it specifies, **P1 first**.
> 2. **The design system in this project** — the *visual* contract. It is the source of truth for *how everything looks and feels* — its tokens (color, type, spacing, radii, elevation), its components, and its rules. Apply it **strictly and consistently** to every view. Do not invent a different visual language, and do not drift from it screen to screen.
>
> **Your goal:** realize the PRD's views (PRD §6) as a coherent, production-grade desktop web app, fully built from this project's design system, on realistic mock data.
>
> **Method:**
> - Build the design system's **reusable components first**, then compose every view from them — never one-off styling. If the PRD needs a component the design system doesn't have yet, create it *in the design system's language* and reuse it.
> - Keep presentational components free of data logic; drive everything from **realistic mock data** for the four brands (plausible rule names like "Jam buka", "Konten harian", "Catalog"; WIB times; a few published/scheduled/failed runs).
> - Keep it visually **consistent** across all views — same components, spacing rhythm, and patterns everywhere.
> - Quality bar: production-grade and intentional. Resist drifting into a generic, boxed admin-template look; honor the character of the design system.
>
> **Behavioral rules from the PRD to honor in every view** (these are functional, not visual):
> - All times are in **WIB (UTC+7)**.
> - Every data view has clear **loading / empty / error / populated** states — no silent blanks or dead ends.
> - **Destructive actions are confirmed** (naming the consequence).
> - One channel's data **never mixes** with another's.
>
> Confirm you've read both contracts, then proceed through the build sequence.

---

## BUILD SEQUENCE (drive step by step; views come from PRD §6)

**Step 1 — Foundations.** Make sure the design system's tokens are applied, and build/confirm the core reusable components the PRD needs: buttons (primary/secondary), status badge, toggle, nav item, card, input/select/time field, avatar, channel switcher, a small analytics/sparkline widget, calendar cell, empty-state, confirm dialog.

**Step 2 — App Shell.** The overall navigation frame (sidebar with brand mark, channel switcher, nav: Rules / Connections / Activity / Calendar, plus Settings; account area) — laid out per the design system.

**Step 3 — P1 views** (in this order, all on mock data):
1. Sign-in + magic-link landing (signing-in / expired-resend).
2. Onboarding / Setup (stepped Meta setup, resumable).
3. Rules home (per channel): rule list + a small activity summary + post-now per rule; a "what's next" inspector area.
4. Rule editor — Schedule mode (weekday/weekend pools) AND Pool mode (single pool): media pool with validation + shuffle state, cadence, time, grace, holidays.
5. Connections: channel list + status/reconnect + brand management (rename/identity/add/remove/disconnect) + Telegram alert setup + Meta checklist.
6. Activity + Run detail (attempt log, retry, post link) + storage indicator.
7. Notification center (mirrored alerts, read/unread).
8. Settings + Profile.

**Step 4 — P2 views** (after P1 is solid):
9. Calendar / Planner (month + week; recurring runs + one-off posts; filter by channel; open item → detail/editor; create one-off from a date).
10. Composer (one-off post): channel + type (Story/Feed), media (or from library), caption + first-comment (Feed), caption refiner (accept/revert/regenerate), schedule, save draft / schedule.
11. Media library (browse/search/tag, usage).
12. Campaigns / tags.

**Step 5 — States pass.** For every view, add its loading / empty / error states (PRD §4).

---

## Guardrails & tips
- Apply the project's design system as the single visual source of truth — if a screen starts looking generic or inconsistent with it, re-anchor to the design system's tokens/components.
- **Don't make this a calendar-first product:** in P1 the home is **Rules**; the Calendar is a P2 view, not the center of gravity.
- Don't add features or change scope beyond the PRD; build P1 fully before P2.
- Mock data should feel real (the four brands, WIB times, a believable mix of run statuses).
- Review each view against its PRD acceptance criteria before moving on.
