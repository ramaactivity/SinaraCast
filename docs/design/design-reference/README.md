# Ca Schedule — Design System

A soft, glassmorphic design system for **Ca Schedule**, a personal scheduling / calendar dashboard. Reconstructed from a single reference screenshot (`uploads/Sultan Adi.jpeg`) — a warm, friendly productivity UI built around frosted-glass panels floating on a pale, multi-hue gradient.

> **Source note:** This system was derived from a *screenshot only* — there was no codebase or Figma file. Tokens, spacing, and component structure are a faithful visual reconstruction, not extracted from production code. Treat measurements as well-calibrated estimates.

---

## The product
Ca Schedule is a desktop scheduling dashboard. Core surfaces seen in the reference:
- **Sidebar** — brand mark, primary nav (Dashboard, Calendar, My Task, Project, Group Chats, Settings), and a "Upgrade to Premium" upsell card.
- **Top bar** — search field, notification bell, user profile.
- **Dashboard** — month calendar, a task checklist ("My Task"), a "Scheduled" detail card, an info bar (location / date / time), a time-slot selector grid, and an "Upcoming Events" list of pastel cards.

---

## Visual foundations

**Mood.** Friendly, calm, airy, premium. Soft pastels, lots of white space, generous rounding. Nothing is hard-edged or high-contrast.

**Color.**
- *Primary* is a warm yellow→orange (`--primary-400 #FCC04C`, `--primary-500 #F9A826`), used for the logo, the active nav item, the selected calendar day, and the bell button — always as a `135deg` gradient (`--primary-grad`).
- *Action accent* is a soft mint green (`--green-grad`, white text), reserved for the main CTA ("Reschedule") and selected time slots.
- *Premium* uses a teal-green gradient (`--teal-grad`).
- *Event cards* cycle three pastel gradients: yellow, mint, lilac (`--card-yellow / --card-mint / --card-lilac`).
- *Ink* is a cool slate ramp (`--ink-900 #3E4351` headings → `--ink-400` muted/inactive).
- The app sits on a pale **multi-radial gradient** (`--app-bg`) blending cream, lavender and mint at the corners.

**Surfaces & glass.** The signature move is frosted glass: `rgba(255,255,255,.55)` + `backdrop-filter: blur(28px)` + a 1px `rgba(255,255,255,.65)` border. Three tiers — `--glass`, `--glass-strong` (.72, for the focused "Scheduled" card), and `--sidebar-glass` (.38, lightest). The outer app shell is glass too (blur 40).

**Type.** Poppins everywhere — geometric, slightly rounded, friendly. Weights 400/500/600/700. Headings 600 with slight negative tracking; labels/meta in 500; muted meta in `--ink-400`. No serifs, no monospace in-product (monospace only appears in this system's spec cards).

**Radii.** Heavily rounded: panels `22px` (`--r-lg`), the app shell & premium card `28px` (`--r-xl`), inner cards/buttons `14–16px`, small chips `9–12px`, search & profile pills fully round (`--r-pill`).

**Shadows.** Always soft, diffuse, low-opacity, cool-tinted (`rgba(90,96,120,...)`). Colored shadows on gradient elements: `--shadow-primary` (amber) under the bell/logo, `--shadow-green` under the CTA. No hard or dark shadows.

**Spacing.** 4px base scale. Panel padding ~22px. Generous gaps (16–18px) between panels.

**Motion (recommended).** Gentle and short — 150ms ease for hover/color, subtle lift on cards. Nothing bouncy or attention-grabbing. (Not present in the static reference; this is a guideline.)

**Hover / press (recommended).** Hover = slight brightening of gradients + a touch more shadow. Press = a subtle scale-down (0.98). Inactive nav brightens toward `--primary-500` on hover.

---

## Content fundamentals

**Voice.** Plain, minimal, label-like. Short noun phrases, not sentences: "My Task", "Time Selector", "Upcoming Events", "Reschedule". No marketing fluff inside the app.

**Casing.** Title Case for headings and nav ("Group Chats", "Upcoming Events"). Sentence fragments for meta.

**Numbers & time.** Times use a lowercase dotted 12-hour format: `8.00pm - 9.15pm`. Dates appear as `08 - 05 - 21` or `Oct, 05 20`. Calendar days are zero-padded (`01`, `05`).

**Tags.** Tiny rounded pills: "Public" (neutral), and by extension "Confirmed" (green), "Pending" (yellow).

**Emoji.** None. The only decorative non-text elements are the 3D mascot illustration on the premium card and small line icons.

---

## Iconography

Thin, single-weight **line icons**, ~1.7px stroke, round caps and joins — the Lucide / Feather style. The reconstruction ships them as inline SVG in `ui_kits/dashboard/icons.jsx` (dashboard grid, calendar, checklist, project nodes, chat, gear, search, bell, pin, clock, user, check, chevron, refresh, close, plus). Icons inherit `currentColor`; in colored meta-rows they're tinted to match the row's accent and sit on a soft tinted rounded square (`MetaIcon`).

> If you need a broader icon set, use **Lucide** (CDN) — it matches the stroke weight and corner style of this system. Flag any substitution.

The 3D mascot on the premium card is rendered as a **labelled placeholder** — drop in the real illustration asset when available.

---

## Index / manifest

| File | What |
|---|---|
| `colors_and_type.css` | All design tokens — colors, gradients, ink ramp, surfaces, radii, shadows, spacing, type classes. Import this everywhere. |
| `preview/` | Design-system spec cards (colors, type, spacing, components, brand) shown in the Design System tab. |
| `ui_kits/dashboard/` | Full interactive recreation of the dashboard. `index.html` + `Sidebar/Topbar/panels1/panels2/widgets/icons` JSX. |
| `SKILL.md` | Agent-skill manifest for using this system in Claude Code. |
| `uploads/Sultan Adi.jpeg` | Original reference screenshot. |

To build with this system: import `colors_and_type.css`, reuse the tokens, and lift components from `ui_kits/dashboard/`.
