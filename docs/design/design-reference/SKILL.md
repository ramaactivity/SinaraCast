---
name: ca-schedule-design
description: Use this skill to generate well-branded interfaces and assets for Ca Schedule, a soft glassmorphic scheduling dashboard, either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Import `colors_and_type.css` for all tokens, and lift components from `ui_kits/dashboard/`. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

Key reminders for this system:
- Frosted glass on a pale multi-hue gradient is the signature. Use `--glass*` surfaces with `backdrop-filter: blur(28px)` and the `--app-bg` background.
- Warm yellow→orange (`--primary-grad`) for brand/active/selection; mint `--green-grad` for the primary CTA only.
- Poppins throughout. Heavily rounded corners. Soft, cool-tinted, low-opacity shadows.
- Line icons (~1.7px stroke, Lucide style). No emoji.

If the user invokes this skill without other guidance, ask them what they want to build, ask some questions, and act as an expert designer who outputs HTML artifacts or production code, depending on the need.
